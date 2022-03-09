use eyre::{eyre, Report, WrapErr};
use std::path::{Path, PathBuf};
use std::str::FromStr;
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

pub fn ensure_dir(filename: &str) -> Result<(), Report> {
  let filepath = PathBuf::from_str(filename)?;
  let parent_dir = filepath
    .parent()
    .ok_or_else(|| eyre!("Unable to get parent path for {:}", filename))?;

  let parent_path = absolute_path(parent_dir)?;

  fs::create_dir_all(&parent_path).wrap_err_with(|| {
    format!(
      "When creating directory '{:}'",
      String::from(parent_path.to_string_lossy())
    )
  })
}
