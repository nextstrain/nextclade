use crate::io::fs::extension;
use crate::utils::error::report_to_string;
use color_eyre::{Help, SectionExt};
use eyre::{Report, WrapErr};
use flate2::Compression as GzCompressionLevel;
use flate2::read::MultiGzDecoder;
use flate2::write::GzEncoder;
use log::trace;
use std::env;
use std::io::{Read, Write};
use std::path::Path;
use std::str::FromStr;

// NOTE: crates `bzip2`, `xz2` and `zstd` depend on corresponding C libraries and require libc in order to build.
// libc is not present for `wasm32-unknown-unknown` target, so we disable these crates.
// TODO: keep an eye on alternative crates that don't rely on C, and replace when they are stable enough.
// TODO: keep an eye on efforts of bringing (pieces of) libc to `wasm32-unknown-unknown`, and enable `bzip2`, `xz2`
// and `zstd` crates for wasm builds when it's compatible enough: https://github.com/rustwasm/team/issues/291
#[cfg(not(target_arch = "wasm32"))]
use bzip2::Compression as BzCompressionLevel;
#[cfg(not(target_arch = "wasm32"))]
use bzip2::read::MultiBzDecoder;
#[cfg(not(target_arch = "wasm32"))]
use bzip2::write::BzEncoder;

#[cfg(not(target_arch = "wasm32"))]
use xz2::read::XzDecoder;
#[cfg(not(target_arch = "wasm32"))]
use xz2::write::XzEncoder;
#[cfg(not(target_arch = "wasm32"))]
#[cfg(not(target_arch = "wasm32"))]
use zstd::Decoder as ZstdDecoder;
#[cfg(not(target_arch = "wasm32"))]
use zstd::Encoder as ZstdEncoder;

#[derive(strum_macros::Display, Clone)]
pub enum CompressionType {
  #[cfg(not(target_arch = "wasm32"))]
  Bzip2,
  #[cfg(not(target_arch = "wasm32"))]
  Xz,
  #[cfg(not(target_arch = "wasm32"))]
  Zstd,

  Gzip,
  None,
}

pub fn guess_compression_from_filepath(filepath: impl AsRef<Path>) -> (CompressionType, String) {
  let filepath = filepath.as_ref();

  match extension(filepath).map(|ext| ext.to_lowercase()) {
    None => (CompressionType::None, "".to_owned()),
    Some(ext) => {
      let compression_type: CompressionType = match ext.as_str() {
        #[cfg(not(target_arch = "wasm32"))]
        "bz2" => CompressionType::Bzip2,
        #[cfg(not(target_arch = "wasm32"))]
        "xz" => CompressionType::Xz,
        #[cfg(not(target_arch = "wasm32"))]
        "zst" => CompressionType::Zstd,
        #[cfg(not(target_arch = "wasm32"))]
        "zstd" => CompressionType::Zstd,
        "gz" => CompressionType::Gzip,
        _ => CompressionType::None,
      };

      trace!(
        "When processing '{}': detected file extension '{ext}'. \
        It will be using algorithm: '{compression_type}'",
        filepath.display()
      );

      (compression_type, ext)
    }
  }
}

pub struct Decompressor<'r> {
  decompressor: Box<dyn Read + 'r>,
  compression_type: CompressionType,
  filepath: Option<String>,
}

impl<'r> Decompressor<'r> {
  pub fn new<R: 'r + Read>(reader: R, compression_type: &CompressionType) -> Result<Self, Report> {
    let decompressor: Box<dyn Read> = match compression_type {
      #[cfg(not(target_arch = "wasm32"))]
      CompressionType::Bzip2 => Box::new(MultiBzDecoder::new(reader)),
      #[cfg(not(target_arch = "wasm32"))]
      CompressionType::Xz => Box::new(XzDecoder::new_multi_decoder(reader)),
      #[cfg(not(target_arch = "wasm32"))]
      CompressionType::Zstd => Box::new(ZstdDecoder::new(reader)?),
      CompressionType::Gzip => Box::new(MultiGzDecoder::new(reader)),
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
    let (compression_type, _) = guess_compression_from_filepath(filepath);
    Self::new(reader, &compression_type)
  }

  pub fn from_path<R: 'r + Read>(reader: R, filepath: impl AsRef<Path>) -> Result<Self, Report> {
    let filepath = filepath.as_ref();
    let (compression_type, _) = guess_compression_from_filepath(filepath);
    Self::new(reader, &compression_type)
  }
}

impl Read for Decompressor<'_> {
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
      .map_err(|report| std::io::Error::other(report_to_string(&report)))
  }
}

fn get_comp_level<I: FromStr + From<u8>>(ext: &str) -> I {
  let var_name = format!("{}_COMPRESSION", ext.to_uppercase());
  env::var(var_name)
    .ok()
    .and_then(|val| val.parse::<I>().ok())
    .unwrap_or_else(|| I::from(2))
}

pub struct Compressor<'w> {
  compressor: Box<dyn Write + Send + 'w>,
  compression_type: CompressionType,
  filepath: Option<String>,
}

impl<'w> Compressor<'w> {
  pub fn new<W: 'w + Write + Send>(writer: W, compression_type: &CompressionType) -> Result<Self, Report> {
    let compressor: Box<dyn Write + Send + 'w> = match compression_type {
      #[cfg(not(target_arch = "wasm32"))]
      CompressionType::Bzip2 => Box::new(BzEncoder::new(writer, BzCompressionLevel::new(get_comp_level("BZ2")))),
      #[cfg(not(target_arch = "wasm32"))]
      CompressionType::Xz => Box::new(XzEncoder::new(writer, get_comp_level("XZ"))),
      #[cfg(not(target_arch = "wasm32"))]
      CompressionType::Zstd => Box::new(ZstdEncoder::new(writer, get_comp_level("ZST"))?.auto_finish()),
      CompressionType::Gzip => Box::new(GzEncoder::new(writer, GzCompressionLevel::new(get_comp_level("GZ")))),
      CompressionType::None => Box::new(writer),
    };

    Ok(Self {
      compressor,
      compression_type: compression_type.clone(),
      filepath: None,
    })
  }

  pub fn from_path<W: 'w + Write + Send>(writer: W, filepath: impl AsRef<Path>) -> Result<Self, Report> {
    let filepath = filepath.as_ref();
    let (compression_type, _) = guess_compression_from_filepath(filepath);
    Self::new(writer, &compression_type)
  }
}

impl Write for Compressor<'_> {
  fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
    self
      .compressor
      .write(buf)
      .wrap_err_with(|| "While compressing file")
      .with_section(|| {
        self
          .filepath
          .clone()
          .unwrap_or_else(|| "None".to_owned())
          .header("Filename")
      })
      .with_section(|| self.compression_type.clone().header("Compressor"))
      .map_err(|report| std::io::Error::other(report_to_string(&report)))
  }

  fn flush(&mut self) -> std::io::Result<()> {
    self
      .compressor
      .flush()
      .wrap_err_with(|| "While flushing compressed file")
      .with_section(|| {
        self
          .filepath
          .clone()
          .unwrap_or_else(|| "None".to_owned())
          .header("Filename")
      })
      .with_section(|| self.compression_type.clone().header("Compressor"))
      .map_err(|report| std::io::Error::other(report_to_string(&report)))
  }
}

impl Drop for Compressor<'_> {
  fn drop(&mut self) {
    self.flush().unwrap();
  }
}
