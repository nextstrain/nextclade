use crate::io::file::{DEFAULT_FILE_BUF_SIZE, open_file_or_stdin};
use eyre::{Report, WrapErr, eyre};
use std::ffi::{OsStr, OsString};
use std::io::{BufReader, Read};
use std::path::{Path, PathBuf};
use std::{env, fs};

pub fn absolute_path(path: impl AsRef<Path>) -> Result<PathBuf, Report> {
  let path = path.as_ref();

  let absolute_path = if path.is_absolute() {
    path.to_path_buf()
  } else {
    env::current_dir()?.join(path)
  };

  Ok(absolute_path)
}

pub fn ensure_dir(filepath: impl AsRef<Path>) -> Result<(), Report> {
  let filepath = filepath.as_ref();
  {
    let parent_dir = filepath
      .parent()
      .ok_or_else(|| eyre!("Unable to get parent path for {:#?}", filepath))?;

    let parent_path = absolute_path(parent_dir)?;

    fs::create_dir_all(&parent_path).wrap_err_with(|| format!("When creating directory {}", parent_path.display()))
  }
  .wrap_err_with(|| format!("When ensuring parent directory for {}", filepath.display()))
}

pub fn filename_maybe(filepath: impl AsRef<Path>) -> Option<String> {
  filepath.as_ref().file_name()?.to_str()?.to_owned().into()
}

pub fn basename_maybe(filepath: impl AsRef<Path>) -> Option<String> {
  filepath.as_ref().file_stem()?.to_str()?.to_owned().into()
}

pub fn extension(filepath: impl AsRef<Path>) -> Option<String> {
  let filepath = filepath.as_ref();
  filepath.extension().and_then(OsStr::to_str).map(str::to_owned)
}

pub fn has_extension(filepath: impl AsRef<Path>, ext: impl AsRef<str>) -> bool {
  extension(filepath.as_ref()).is_some_and(|fext| fext.eq_ignore_ascii_case(ext.as_ref()))
}

pub fn add_extension(filepath: impl AsRef<Path>, extension: impl AsRef<OsStr>) -> PathBuf {
  let filepath = filepath.as_ref();
  let extension = extension.as_ref();

  if filepath.file_name().is_none() {
    return filepath.to_owned();
  }

  let mut stem = match filepath.file_name() {
    Some(stem) => stem.to_os_string(),
    None => OsString::new(),
  };

  if !extension.is_empty() {
    stem.push(".");
    stem.push(extension);
  }

  filepath.to_owned().with_file_name(&stem)
}

/// Reads entire file into a string.
/// Compared to `std::fs::read_to_string` uses buffered reader
pub fn read_file_to_string(filepath: impl AsRef<Path>) -> Result<String, Report> {
  let filepath = filepath.as_ref();
  let mut file = open_file_or_stdin(Some(&filepath))?;
  let mut data = String::new();
  file
    .read_to_string(&mut data)
    .wrap_err_with(|| format!("When reading file: {}", filepath.display()))?;
  Ok(data)
}

/// Reads entire reader into a string.
/// Compared to `std::fs::read_to_string` uses buffered reader
pub fn read_reader_to_string(reader: impl Read) -> Result<String, Report> {
  let mut reader = BufReader::with_capacity(DEFAULT_FILE_BUF_SIZE, reader);
  let mut data = String::new();
  reader.read_to_string(&mut data)?;
  Ok(data)
}

pub fn path_to_string(p: impl AsRef<Path>) -> Result<String, Report> {
  p.as_ref()
    .as_os_str()
    .to_str()
    .map(ToOwned::to_owned)
    .ok_or_else(|| eyre!("Unable to convert path to string: {:#?}", p.as_ref()))
}
