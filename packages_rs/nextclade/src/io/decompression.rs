use crate::io::fs::extension;
use crate::utils::error::report_to_string;
use bzip2::read::MultiBzDecoder;
use color_eyre::{Help, SectionExt};
use eyre::{eyre, Report, WrapErr};
use flate2::read::GzDecoder;
use log::debug;
use std::io::{ErrorKind, Read};
use std::path::Path;
use xz2::read::XzDecoder;
use zstd::Decoder as ZstdDecoder;

#[derive(strum_macros::Display, Clone)]
pub enum CompressionType {
  Gzip,
  Bzip2,
  Xz,
  Zstandard,
  None,
}

pub struct Decompressor<'r> {
  decompressor: Box<dyn Read + 'r>,
  compression_type: CompressionType,
  filepath: Option<String>,
}

impl<'r> Decompressor<'r> {
  pub fn new<R: 'r + Read>(reader: R, compression_type: &CompressionType) -> Result<Self, Report> {
    let decompressor: Box<dyn Read> = match compression_type {
      CompressionType::Gzip => Box::new(GzDecoder::new(reader)),
      CompressionType::Bzip2 => Box::new(MultiBzDecoder::new(reader)),
      CompressionType::Xz => Box::new(XzDecoder::new(reader)),
      CompressionType::Zstandard => Box::new(ZstdDecoder::new(reader)?),
      CompressionType::None => Box::new(reader),
    };

    Ok(Self {
      decompressor,
      compression_type: compression_type.clone(),
      filepath: None,
    })
  }

  pub fn from_str_and_path(content: &'r str, filepath: impl AsRef<Path>) -> Result<Self, Report> {
    let filepath = filepath.as_ref();
    let reader = content.as_bytes();
    let (compression_type, ext) = guess_compression_from_filepath(filepath)?;
    Self::new(reader, &compression_type)
  }

  pub fn from_path<R: 'static + Read>(reader: R, filepath: impl AsRef<Path>) -> Result<Self, Report> {
    let filepath = filepath.as_ref();
    let (compression_type, ext) = guess_compression_from_filepath(filepath)?;
    Self::new(reader, &compression_type)
  }
}

pub fn guess_compression_from_filepath(filepath: impl AsRef<Path>) -> Result<(CompressionType, String), Report> {
  let filepath = filepath.as_ref();

  let ext = extension(filepath)?;

  let compression_type: CompressionType = match ext.as_str() {
    "gz" => CompressionType::Gzip,
    "bz2" => CompressionType::Bzip2,
    "xz" => CompressionType::Xz,
    "zst" => CompressionType::Zstandard,
    _ => CompressionType::None,
  };

  debug!(
    "When processing '{filepath:#?}': Decompressor detected file extension '{ext}'. \
    It will be using decompression algorithm: '{compression_type}'"
  );

  Ok((compression_type, ext))
}

impl<'r> Read for Decompressor<'r> {
  fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
    self
      .decompressor
      .read(buf)
      .wrap_err_with(|| "While decompressing file")
      .with_section(|| {
        self
          .filepath
          .clone()
          .unwrap_or_else(|| "None".to_owned())
          .header("Filename")
      })
      .with_section(|| self.compression_type.clone().header("Decompressor"))
      .map_err(|report| std::io::Error::new(ErrorKind::Other, report_to_string(&report)))
  }
}
