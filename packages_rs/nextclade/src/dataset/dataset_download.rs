use crate::dataset::dataset::Dataset;
use crate::io::fs::absolute_path;
use crate::io::http_client::HttpClient;
use eyre::{Report, WrapErr};
use itertools::Itertools;
use rayon::iter::{IntoParallelRefIterator, ParallelIterator};
use std::fs;
use std::path::Path;

pub fn dataset_download(http: &mut HttpClient, dataset: &Dataset, output_dir: &Path) -> Result<(), Report> {
  let output_dir = &absolute_path(output_dir)?;
  fs::create_dir_all(&output_dir).wrap_err_with(|| format!("When creating directory '{output_dir:#?}'"))?;

  dataset
    .files
    .par_iter()
    .map(|(filename, url)| -> Result<(), Report> {
      let output_file_path = output_dir.join(filename);
      let content = http.get(url)?;
      fs::write(output_file_path, content)?;
      Ok(())
    })
    .collect::<Result<(), Report>>()
    .wrap_err_with(|| format!("When downloading dataset: {dataset:#?}"))
}
