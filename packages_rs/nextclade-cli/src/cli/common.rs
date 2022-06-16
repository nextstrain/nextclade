use nextclade::io::fs::{basename_maybe, extension};
use std::path::PathBuf;

pub fn get_fasta_basename(input_fasta: &[PathBuf]) -> Option<String> {
  match input_fasta {
    [single_fasta] => {
      let base_name = basename_maybe(single_fasta)?;
      if extension(&base_name).map(|ext| ext.to_lowercase()) == Some("fasta".to_owned()) {
        // Additionally handle cases like `.fasta.gz`
        basename_maybe(&base_name)
      } else {
        Some(base_name)
      }
    }
    _ => None,
  }
}
