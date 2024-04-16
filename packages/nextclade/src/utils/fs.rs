use eyre::Report;
use std::fs::read_dir;
use std::path::{Path, PathBuf};

pub fn list_files_recursive(dir: impl AsRef<Path>) -> Result<Vec<PathBuf>, Report> {
  let mut files = Vec::new();
  let mut stack = vec![dir.as_ref().to_path_buf()];
  while let Some(current) = stack.pop() {
    let entries = read_dir(&current)?;
    for entry in entries.flatten() {
      let path = entry.path();
      if path.is_dir() {
        stack.push(path);
      } else {
        files.push(path);
      }
    }
  }
  Ok(files)
}
