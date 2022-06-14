use eyre::{eyre, Report, WrapErr};
use std::ffi::OsStr;
use std::fs::File;
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

    fs::create_dir_all(&parent_path).wrap_err_with(|| format!("When creating directory '{parent_path:#?}'"))
  }
  .wrap_err_with(|| format!("When ensuring parent directory for '{filepath:#?}'"))
}

pub fn basename(filepath: impl AsRef<Path>) -> Result<String, Report> {
  let filepath = filepath.as_ref();

  Ok(
    filepath
      .file_stem()
      .ok_or_else(|| eyre!("Cannot get filename of path {filepath:#?}"))?
      .to_str()
      .ok_or_else(|| eyre!("Cannot get basename of path {filepath:#?}"))?
      .to_owned(),
  )
}

pub fn extension(filepath: impl AsRef<Path>) -> Option<String> {
  let filepath = filepath.as_ref();
  filepath.extension().map(OsStr::to_str).flatten().map(str::to_owned)
}

/// Reads entire file into a string.
/// Compared to `std::fs::read_to_string` uses buffered reader
pub fn read_file_to_string(filepath: impl AsRef<Path>) -> Result<String, Report> {
  const BUF_SIZE: usize = 2 * 1024 * 1024;

  let filepath = filepath.as_ref();

  let file = File::open(&filepath).wrap_err_with(|| format!("When opening file: {filepath:#?}"))?;
  let mut reader = BufReader::with_capacity(BUF_SIZE, file);

  let mut data = String::new();
  reader
    .read_to_string(&mut data)
    .wrap_err_with(|| format!("When reading file: {filepath:#?}"))?;

  Ok(data)
}
