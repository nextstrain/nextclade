use eyre::{eyre, Report, WrapErr};
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
      .with_extension("")
      .to_str()
      .ok_or_else(|| eyre!("Cannot get base name of path {filepath:#?}"))?
      .to_owned(),
  )
}
