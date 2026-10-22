use cap_fs_ext::{DirExt, FollowSymlinks, OpenOptionsFollowExt};
use cap_std::ambient_authority;
use cap_std::fs::{Dir, OpenOptions};
use eyre::{Report, WrapErr};
use icu_normalizer::ComposingNormalizerBorrowed;
use itertools::Itertools;
use nextclade::make_error;
use std::collections::BTreeMap;
use std::collections::btree_map::Entry;
use std::fs;
use std::io::{self, Read, Seek, Write};
use std::path::{Path, PathBuf};
use zip::ZipArchive;
use zip::read::ZipFile;

/// Maximum total number of bytes unpacked from a dataset archive
pub const DATASET_ZIP_MAX_UNPACKED_BYTES: u64 = 1024 * 1024 * 1024;

/// Maximum number of entries in a dataset archive
pub const DATASET_ZIP_MAX_ENTRIES: usize = 10_000;

/// File names that Windows maps to devices, also with an extension and in any letter case.
///
/// `CONIN$` and `CONOUT$` open the console input and output in `CreateFile`, see
/// https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilew#consoles
const WINDOWS_DEVICE_NAMES: [&str; 32] = [
  "CON", "PRN", "AUX", "NUL", "COM0", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9", "COM¹",
  "COM²", "COM³", "LPT0", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9", "LPT¹", "LPT²",
  "LPT³", "CONIN$", "CONOUT$",
];

const S_IFMT: u32 = 0o170_000;
const S_IFDIR: u32 = 0o040_000;
const S_IFREG: u32 = 0o100_000;

/// Validated entry of a dataset archive, with its normalized path relative to the output directory
#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) enum ZipEntryKind {
  Dir(PathBuf),
  File(PathBuf),
}

/// Extract a dataset zip archive into `output_dir`, creating the directory if it does not exist.
///
/// Writes only regular files and directories inside `output_dir`. Rejects entries with paths outside of `output_dir`,
/// symbolic links and other special entries, archives with more than `max_entries` entries, and archives that unpack
/// to more than `max_unpacked_bytes`. Also rejects names that Windows does not allow, and entries that would write to
/// the same file or directory on file systems that ignore letter case or Unicode normalization. Checks the names and
/// types of all entries and their number before the first write, so that such an invalid archive leaves nothing
/// behind. The size limit and conflicts with existing files in `output_dir` show only while writing, and can stop the
/// extraction part-way. Ignores permissions and timestamps stored in the archive. Existing symbolic links inside
/// `output_dir` never redirect writes.
///
/// All writes go through handles of directories opened inside `output_dir` without following links, so that another
/// local process cannot redirect a write by replacing a path component between the check and the write. On Windows,
/// cap-std creates directories and removes files through full paths, so there this protection is incomplete.
pub fn zip_extract_safe<R: Read + Seek>(
  zip: &mut ZipArchive<R>,
  output_dir: &Path,
  max_entries: usize,
  max_unpacked_bytes: u64,
) -> Result<(), Report> {
  let entries = zip_entries_validate(zip, max_entries)?;

  fs::create_dir_all(output_dir).wrap_err_with(|| format!("When creating directory '{}'", output_dir.display()))?;
  let root = Dir::open_ambient_dir(output_dir, ambient_authority())
    .wrap_err_with(|| format!("When opening directory '{}'", output_dir.display()))?;

  let mut remaining = max_unpacked_bytes;
  for (index, kind) in entries.into_iter().enumerate() {
    let mut entry = zip
      .by_index(index)
      .wrap_err_with(|| format!("When reading entry #{index} of the dataset archive"))?;
    let name = escape_for_display(entry.name());
    match kind {
      ZipEntryKind::Dir(path) => {
        dir_create_inside(&root, output_dir, &path).wrap_err_with(|| format!("When extracting entry '{name}'"))?;
      }
      ZipEntryKind::File(path) => {
        let written = file_extract_inside(&mut entry, &root, output_dir, &path, remaining)
          .wrap_err_with(|| format!("When extracting entry '{name}'"))?;
        if written > remaining {
          return make_error!(
            "Dataset archive exceeds the limit of {max_unpacked_bytes} bytes when unpacked (at entry '{name}')"
          );
        }
        remaining -= written;
      }
    }
  }
  Ok(())
}

/// Classify an archive entry and validate its path and type
pub(crate) fn zip_entry_kind<R: Read>(entry: &ZipFile<'_, R>) -> Result<ZipEntryKind, Report> {
  let raw_name = entry.name();
  let name = escape_for_display(raw_name);

  if entry.is_symlink() {
    return make_error!(
      "Dataset archive is invalid: entry '{name}' is a symbolic link. Only regular files and directories are allowed"
    );
  }

  let path = zip_entry_path(raw_name)?;

  // Second, independent check of the same name by the zip library
  if entry.enclosed_name().is_none() {
    return make_error!(
      "Dataset archive is invalid: entry '{name}' has an invalid path or a path outside of the output directory"
    );
  }

  // The zip library recognizes a directory by the trailing `/` of its name only
  let file_type = entry.unix_mode().map(|mode| mode & S_IFMT);
  if entry.is_dir() || file_type == Some(S_IFDIR) {
    if entry.size() != 0 {
      return make_error!("Dataset archive is invalid: entry '{name}' is a directory with content");
    }
    return Ok(ZipEntryKind::Dir(path));
  }

  if !matches!(file_type, None | Some(0 | S_IFREG)) {
    return make_error!(
      "Dataset archive is invalid: entry '{name}' is not a regular file. Only regular files and directories are allowed"
    );
  }

  if path.as_os_str().is_empty() {
    return make_error!("Dataset archive is invalid: entry '{name}' is a file with an empty path");
  }

  Ok(ZipEntryKind::File(path))
}

/// Copy at most `limit + 1` bytes from `reader` to `writer` and return the number of bytes copied.
///
/// A result greater than `limit` means that the reader has more data than the limit allows.
pub(crate) fn copy_limited(reader: &mut impl Read, writer: &mut impl Write, limit: u64) -> io::Result<u64> {
  io::copy(&mut reader.take(limit.saturating_add(1)), writer)
}

/// Parse the raw name of an archive entry into its normalized path relative to the output directory.
///
/// Splits the name at `/` only, so that it has the same meaning on all platforms. Dataset paths never contain the
/// characters and names that Windows reserves, so these rules apply on all platforms, and to every component of the
/// name, including components that `..` removes later.
pub(crate) fn zip_entry_path(raw_name: &str) -> Result<PathBuf, Report> {
  let name = escape_for_display(raw_name);
  let components = raw_name.split('/').collect_vec();

  let escapes = components
    .iter()
    .try_fold(0_usize, |depth, component| match *component {
      "" | "." => Some(depth),
      ".." => depth.checked_sub(1),
      _ => Some(depth + 1),
    })
    .is_none();
  if raw_name.starts_with(['/', '\\']) || escapes {
    return make_error!(
      "Dataset archive is invalid: entry '{name}' has an invalid path or a path outside of the output directory"
    );
  }

  let names = components
    .iter()
    .filter(|component| !matches!(**component, "" | "." | ".."))
    .collect_vec();

  if let Some(c) = names
    .iter()
    .flat_map(|component| component.chars())
    .find(|&c| is_reserved_char(c))
  {
    let c = escape_for_display(&c.to_string());
    return make_error!("Dataset archive is invalid: entry '{name}' has a path component with '{c}'");
  }

  if names.iter().any(|component| is_windows_special_name(component)) {
    return make_error!(
      "Dataset archive is invalid: entry '{name}' has a path component with a name that is reserved on Windows or ends with '.' or ' '"
    );
  }

  Ok(path_normalize(raw_name))
}

/// Resolve the `.`, `..` and empty components of an archive entry name with `/` separators
fn path_normalize(raw_name: &str) -> PathBuf {
  raw_name.split('/').fold(PathBuf::new(), |mut result, component| {
    match component {
      "" | "." => {}
      ".." => {
        result.pop();
      }
      _ => result.push(component),
    }
    result
  })
}

/// Classify all entries of an archive, failing on the first invalid entry, on clashing entries, and on too many entries
fn zip_entries_validate<R: Read + Seek>(
  zip: &mut ZipArchive<R>,
  max_entries: usize,
) -> Result<Vec<ZipEntryKind>, Report> {
  let len = zip.len();
  if len > max_entries {
    return make_error!("Dataset archive has {len} entries, which exceeds the limit of {max_entries} entries");
  }
  let entries: Vec<(String, ZipEntryKind)> = (0..len)
    .map(|index| {
      let entry = zip
        .by_index(index)
        .wrap_err_with(|| format!("When reading entry #{index} of the dataset archive"))?;
      Ok::<_, Report>((escape_for_display(entry.name()), zip_entry_kind(&entry)?))
    })
    .try_collect()?;
  zip_entries_check_clashes(&entries)?;
  Ok(entries.into_iter().map(|(_, kind)| kind).collect())
}

/// Reject entries that write to the same path on file systems that ignore letter case or Unicode normalization, unless
/// both are directories, and files that are a parent directory of another entry
fn zip_entries_check_clashes(entries: &[(String, ZipEntryKind)]) -> Result<(), Report> {
  let mut seen = BTreeMap::<String, (&str, bool)>::new();
  for (name, kind) in entries {
    let (path, is_dir) = match kind {
      ZipEntryKind::Dir(path) => (path, true),
      ZipEntryKind::File(path) => (path, false),
    };
    match seen.entry(path_fold(path)) {
      Entry::Vacant(vacant) => {
        vacant.insert((name, is_dir));
      }
      Entry::Occupied(occupied) => {
        let (other, other_is_dir) = *occupied.get();
        if !(is_dir && other_is_dir) {
          return make_error!(
            "Dataset archive is invalid: entries '{other}' and '{name}' have the same path on file systems that ignore letter case or Unicode normalization"
          );
        }
      }
    }
  }

  for (key, (name, _)) in &seen {
    let parents = key.match_indices('/').filter_map(|(end, _)| key.get(..end));
    if let Some((file, _)) = parents
      .filter_map(|parent| seen.get(parent))
      .find(|(_, is_dir)| !is_dir)
    {
      return make_error!("Dataset archive is invalid: entry '{name}' is inside of '{file}', which is a file");
    }
  }

  Ok(())
}

/// Key under which file systems that ignore letter case or Unicode normalization store a path
fn path_fold(path: &Path) -> String {
  let path = path.iter().map(|component| component.to_string_lossy()).join("/");
  ComposingNormalizerBorrowed::new_nfc().normalize(&path).to_lowercase()
}

/// Whether Windows does not allow this character in file names.
///
/// On Windows, `file.txt:name` addresses an NTFS alternate data stream of `file.txt`, which bypasses the checks of the
/// existing file, and `C:` addresses a drive.
fn is_reserved_char(c: char) -> bool {
  matches!(c, '<' | '>' | ':' | '"' | '\\' | '|' | '?' | '*') || ('\0'..='\u{1f}').contains(&c)
}

/// Whether Windows opens a device instead of a file for this name, or removes a trailing `.` or ` ` from it
fn is_windows_special_name(name: &str) -> bool {
  let base = name
    .split_once('.')
    .map_or(name, |(base, _)| base)
    .trim_end_matches(' ');
  name.ends_with(['.', ' '])
    || WINDOWS_DEVICE_NAMES
      .iter()
      .any(|device| base.eq_ignore_ascii_case(device))
}

/// Escape control and other non-printable characters, so that text from an archive cannot control the terminal
fn escape_for_display(text: &str) -> String {
  text
    .chars()
    .map(|c| {
      if matches!(c, '\\' | '\'' | '"') {
        c.to_string()
      } else {
        c.escape_debug().to_string()
      }
    })
    .collect()
}

/// Path with control and other non-printable characters escaped, see `escape_for_display`
fn path_for_display(path: &Path) -> String {
  escape_for_display(&path.to_string_lossy())
}

/// Create directory `relative` inside `root` and its missing parents, and return a handle of it.
///
/// Opens each component relative to its parent without following links, and refuses existing links. `base` is the path
/// of `root`, used only in messages.
fn dir_create_inside(root: &Dir, base: &Path, relative: &Path) -> Result<Dir, Report> {
  let mut dir = root
    .try_clone()
    .wrap_err_with(|| format!("When opening directory '{}'", path_for_display(base)))?;
  let mut path = base.to_owned();
  for component in relative {
    path.push(component);
    let shown = path_for_display(&path);
    match dir.symlink_metadata(component) {
      Ok(meta) if meta.file_type().is_symlink() => {
        return make_error!("Refusing to extract through '{shown}': it is an existing symbolic link");
      }
      Ok(meta) if meta.is_dir() => {}
      Ok(_) => {
        return make_error!("Unable to create directory '{shown}': a file exists at this path");
      }
      Err(err) if err.kind() == io::ErrorKind::NotFound => {
        dir
          .create_dir(component)
          .wrap_err_with(|| format!("When creating directory '{shown}'"))?;
      }
      Err(err) => return Err(err).wrap_err_with(|| format!("When reading metadata of '{shown}'")),
    }
    dir = dir
      .open_dir_nofollow(component)
      .wrap_err_with(|| format!("When opening directory '{shown}'"))?;
  }
  Ok(dir)
}

/// Write the content of `reader` into a new regular file `relative` inside `root`, replacing an existing file or link at
/// this path. `base` is the path of `root`, used only in messages.
///
/// Return the number of bytes written, which is greater than `limit` when the content exceeds the limit.
fn file_extract_inside(
  reader: &mut impl Read,
  root: &Dir,
  base: &Path,
  relative: &Path,
  limit: u64,
) -> Result<u64, Report> {
  let parent = dir_create_inside(root, base, relative.parent().unwrap_or_else(|| Path::new("")))?;
  let shown = path_for_display(&base.join(relative));
  let Some(leaf) = relative.file_name() else {
    return make_error!("Unable to create file '{shown}': the path has no file name");
  };

  match parent.symlink_metadata(leaf) {
    Ok(meta) if meta.is_dir() => {
      return make_error!("Unable to create file '{shown}': a directory exists at this path");
    }
    // Removes the link itself, and a new inode detaches the path from any outside file hardlinked to it
    Ok(_) => parent
      .remove_file_or_symlink(leaf)
      .wrap_err_with(|| format!("When removing existing '{shown}'"))?,
    Err(err) if err.kind() == io::ErrorKind::NotFound => {}
    Err(err) => return Err(err).wrap_err_with(|| format!("When reading metadata of '{shown}'")),
  }

  let mut file = parent
    .open_with(
      leaf,
      OpenOptions::new()
        .write(true)
        .create_new(true)
        .follow(FollowSymlinks::No),
    )
    .wrap_err_with(|| format!("When creating file '{shown}'"))?;

  copy_limited(reader, &mut file, limit).wrap_err_with(|| format!("When writing file '{shown}'"))
}
