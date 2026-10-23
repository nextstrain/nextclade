use eyre::{Report, WrapErr};
use itertools::Itertools;
use nextclade::make_error;
use std::borrow::Cow;
use std::fs::{self, File};
use std::io::{self, Read, Seek, Write};
use std::path::Path;
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

/// Extract the regular files at the root of a dataset zip archive into `output_dir`, creating the directory if it does
/// not exist.
///
/// Datasets are flat: all their files are at the root of the archive. Ignores directory entries and entries in
/// subdirectories, including names that start with `/` or contain `../`, so that no write reaches a path below or
/// outside of `output_dir`. Rejects symbolic links and other special entries at the root, names that Windows does not
/// allow, archives with more than `max_entries` entries, and archives that unpack to more than `max_unpacked_bytes`.
/// Checks the names and types of all entries and their number before the first write, so that such an invalid
/// archive leaves nothing behind. The size limit and conflicts with existing directories show only while writing, and
/// can stop the extraction part-way. Ignores permissions and timestamps stored in the archive.
///
/// Replaces an existing file of the same name: removes it first and creates a new file that must not exist, so that an
/// existing link is never followed and an existing hard link keeps its content. Two entries whose names differ only in
/// letter case therefore fail with an error on file systems that ignore letter case, instead of overwriting each other.
pub fn zip_extract_root_files<R: Read + Seek>(
  zip: &mut ZipArchive<R>,
  output_dir: &Path,
  max_entries: usize,
  max_unpacked_bytes: u64,
) -> Result<(), Report> {
  let files = zip_root_files(zip, max_entries)?;

  fs::create_dir_all(output_dir).wrap_err_with(|| format!("When creating directory '{}'", output_dir.display()))?;

  files.iter().try_for_each(|(_, name)| {
    file_remove_existing(&output_dir.join(name))
      .wrap_err_with(|| format!("When extracting entry '{}'", escape_for_display(name)))
  })?;

  files
    .into_iter()
    .try_fold(max_unpacked_bytes, |remaining, (index, name)| {
      let shown = escape_for_display(&name);
      let mut entry = zip
        .by_index(index)
        .wrap_err_with(|| format!("When reading entry #{index} of the dataset archive"))?;
      let written = file_write_new(&mut entry, &output_dir.join(&name), remaining)
        .wrap_err_with(|| format!("When extracting entry '{shown}'"))?;
      if written > remaining {
        return make_error!(
          "Dataset archive exceeds the limit of {max_unpacked_bytes} bytes when unpacked (at entry '{shown}')"
        );
      }
      Ok(remaining - written)
    })?;

  Ok(())
}

/// Name of an archive entry if it is a regular file at the root of the archive, or `None` for an entry to ignore: a
/// directory, or an entry in a subdirectory
pub(crate) fn zip_entry_root_file<R: Read>(entry: &ZipFile<'_, R>) -> Result<Option<String>, Report> {
  let raw_name = zip_entry_name(entry)?;
  if raw_name.contains('/') {
    return Ok(None);
  }

  let name = escape_for_display(&raw_name);
  let file_type = entry.unix_mode().map(|mode| mode & S_IFMT);
  if file_type == Some(S_IFDIR) {
    return Ok(None);
  }
  if entry.is_symlink() {
    return make_error!(
      "Dataset archive is invalid: entry '{name}' is a symbolic link. Only regular files are allowed"
    );
  }
  if !matches!(file_type, None | Some(0 | S_IFREG)) {
    return make_error!(
      "Dataset archive is invalid: entry '{name}' is not a regular file. Only regular files are allowed"
    );
  }

  zip_entry_name_validate(&raw_name)?;
  Ok(Some(raw_name.into_owned()))
}

/// Check the name of an archive entry at the root of the archive.
///
/// Dataset file names never contain the characters and names that Windows reserves, so these rules apply on all
/// platforms.
pub(crate) fn zip_entry_name_validate(raw_name: &str) -> Result<(), Report> {
  let name = escape_for_display(raw_name);

  if raw_name.is_empty() {
    return make_error!("Dataset archive is invalid: an entry has an empty name");
  }

  if let Some(c) = raw_name.chars().find(|&c| is_reserved_char(c)) {
    let c = escape_for_display(&c.to_string());
    return make_error!("Dataset archive is invalid: entry '{name}' has a name with '{c}'");
  }

  if is_windows_special_name(raw_name) {
    return make_error!(
      "Dataset archive is invalid: entry '{name}' has a name that is reserved on Windows or ends with '.' or ' '"
    );
  }

  Ok(())
}

/// Indices and names of the regular files at the root of an archive, failing on the first invalid entry and on too
/// many entries
fn zip_root_files<R: Read + Seek>(zip: &mut ZipArchive<R>, max_entries: usize) -> Result<Vec<(usize, String)>, Report> {
  let len = zip.len();
  if len > max_entries {
    return make_error!("Dataset archive has {len} entries, which exceeds the limit of {max_entries} entries");
  }
  (0..len)
    .map(|index| {
      let entry = zip
        .by_index(index)
        .wrap_err_with(|| format!("When reading entry #{index} of the dataset archive"))?;
      Ok::<_, Report>(zip_entry_root_file(&entry)?.map(|name| (index, name)))
    })
    .flatten_ok()
    .try_collect()
}

/// Name of an archive entry as stored in the archive
fn zip_entry_name<'a, R: Read>(entry: &'a ZipFile<'_, R>) -> Result<Cow<'a, str>, Report> {
  entry
    .name()
    .wrap_err("When reading the name of an entry of the dataset archive")
}

/// Remove an existing file or link at `path`, so that a new file can be created there. Removes the link itself, and a
/// new file detaches the path from any outside file hard-linked to it.
fn file_remove_existing(path: &Path) -> Result<(), Report> {
  let shown = path_for_display(path);
  match fs::symlink_metadata(path) {
    Ok(meta) if meta.is_dir() => make_error!("Unable to create file '{shown}': a directory exists at this path"),
    Ok(_) => fs::remove_file(path).wrap_err_with(|| format!("When removing existing '{shown}'")),
    Err(err) if err.kind() == io::ErrorKind::NotFound => Ok(()),
    Err(err) => Err(err).wrap_err_with(|| format!("When reading metadata of '{shown}'")),
  }
}

/// Write the content of `reader` into a new file at `path`, which must not exist.
///
/// Return the number of bytes written, which is greater than `limit` when the content exceeds the limit.
fn file_write_new(reader: &mut impl Read, path: &Path, limit: u64) -> Result<u64, Report> {
  let shown = path_for_display(path);
  let mut file = File::create_new(path).wrap_err_with(|| format!("When creating file '{shown}'"))?;
  copy_limited(reader, &mut file, limit).wrap_err_with(|| format!("When writing file '{shown}'"))
}

/// Copy at most `limit + 1` bytes from `reader` to `writer` and return the number of bytes copied.
///
/// A result greater than `limit` means that the reader has more data than the limit allows.
pub(crate) fn copy_limited(reader: &mut impl Read, writer: &mut impl Write, limit: u64) -> io::Result<u64> {
  io::copy(&mut reader.take(limit.saturating_add(1)), writer)
}

/// Whether Windows does not allow this character in file names.
///
/// On Windows, `\` separates path components, `file.txt:name` addresses an NTFS alternate data stream of `file.txt`,
/// which bypasses the checks of the existing file, and `C:` addresses a drive.
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
