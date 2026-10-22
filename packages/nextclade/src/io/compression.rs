use crate::io::fs::extension;
use eyre::Report;
use flate2::Compression as GzCompressionLevel;
use flate2::read::MultiGzDecoder;
use flate2::write::GzEncoder;
use log::{debug, trace};
use std::env;
use std::error::Error;
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
use zstd::Decoder as ZstdDecoder;
#[cfg(not(target_arch = "wasm32"))]
use zstd::Encoder as ZstdEncoder;

#[derive(strum_macros::Display, Clone, Debug)]
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

/// Reader that decompresses the data as the file extension asks
pub struct Decompressor<'r> {
  decompressor: Box<dyn Read + 'r>,
  compression_type: CompressionType,
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
    })
  }

  pub fn from_str_and_path(content: &'r str, filepath: impl AsRef<Path>) -> Result<Self, Report> {
    let reader = content.as_bytes();
    let (compression_type, _) = guess_compression_from_filepath(filepath);
    Self::new(reader, &compression_type)
  }

  pub fn from_path<R: 'r + Read>(reader: R, filepath: impl AsRef<Path>) -> Result<Self, Report> {
    let (compression_type, _) = guess_compression_from_filepath(filepath);
    Self::new(reader, &compression_type)
  }
}

impl Read for Decompressor<'_> {
  fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
    let result = self.decompressor.read(buf);
    compression_io_error(&self.compression_type, result, "While decompressing file")
  }
}

fn get_comp_level<I: FromStr + From<u8>>(ext: &str) -> I {
  let var_name = format!("{}_COMPRESSION", ext.to_uppercase());
  env::var(var_name)
    .ok()
    .and_then(|val| val.parse::<I>().ok())
    .unwrap_or_else(|| I::from(2))
}

/// Compressing writer that writes the end of the compressed stream in `finish`
trait Encoder: Write + Send {
  /// Write the end of the compressed stream and flush the underlying writer
  fn finish_stream(&mut self) -> std::io::Result<()>;
}

impl<W: Write + Send> Encoder for GzEncoder<W> {
  fn finish_stream(&mut self) -> std::io::Result<()> {
    self.try_finish()?;
    self.get_mut().flush()
  }
}

#[cfg(not(target_arch = "wasm32"))]
impl<W: Write + Send> Encoder for BzEncoder<W> {
  fn finish_stream(&mut self) -> std::io::Result<()> {
    self.try_finish()?;
    self.get_mut().flush()
  }
}

#[cfg(not(target_arch = "wasm32"))]
impl<W: Write + Send> Encoder for XzEncoder<W> {
  fn finish_stream(&mut self) -> std::io::Result<()> {
    self.try_finish()?;
    self.get_mut().flush()
  }
}

#[cfg(not(target_arch = "wasm32"))]
impl<W: Write + Send> Encoder for ZstdEncoder<'static, W> {
  fn finish_stream(&mut self) -> std::io::Result<()> {
    self.do_finish()?;
    self.get_mut().flush()
  }
}

/// Writer without compression
struct Uncompressed<W: Write + Send>(W);

impl<W: Write + Send> Write for Uncompressed<W> {
  fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
    self.0.write(buf)
  }

  fn flush(&mut self) -> std::io::Result<()> {
    self.0.flush()
  }
}

impl<W: Write + Send> Encoder for Uncompressed<W> {
  fn finish_stream(&mut self) -> std::io::Result<()> {
    self.0.flush()
  }
}

/// Writer that compresses the data as the file extension asks. Call `finish` after the last write: dropping the
/// writer finishes the compressed stream too, but it can only log the errors.
pub struct Compressor<'w> {
  compressor: Box<dyn Encoder + 'w>,
  compression_type: CompressionType,
  is_finished: bool,
}

impl<'w> Compressor<'w> {
  pub fn new<W: 'w + Write + Send>(writer: W, compression_type: &CompressionType) -> Result<Self, Report> {
    let compressor: Box<dyn Encoder + 'w> = match compression_type {
      #[cfg(not(target_arch = "wasm32"))]
      CompressionType::Bzip2 => Box::new(BzEncoder::new(writer, BzCompressionLevel::new(get_comp_level("BZ2")))),
      #[cfg(not(target_arch = "wasm32"))]
      CompressionType::Xz => Box::new(XzEncoder::new(writer, get_comp_level("XZ"))),
      #[cfg(not(target_arch = "wasm32"))]
      CompressionType::Zstd => Box::new(ZstdEncoder::new(writer, get_comp_level("ZST"))?),
      CompressionType::Gzip => Box::new(GzEncoder::new(writer, GzCompressionLevel::new(get_comp_level("GZ")))),
      CompressionType::None => Box::new(Uncompressed(writer)),
    };

    Ok(Self {
      compressor,
      compression_type: compression_type.clone(),
      is_finished: false,
    })
  }

  pub fn from_path<W: 'w + Write + Send>(writer: W, filepath: impl AsRef<Path>) -> Result<Self, Report> {
    let (compression_type, _) = guess_compression_from_filepath(filepath);
    Self::new(writer, &compression_type)
  }

  /// Write the end of the compressed stream and flush the underlying writer
  pub fn finish(&mut self) -> std::io::Result<()> {
    self.is_finished = true;
    let result = self.compressor.finish_stream();
    compression_io_error(&self.compression_type, result, "While finishing compressed file")
  }
}

impl Write for Compressor<'_> {
  fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
    let result = self.compressor.write(buf);
    compression_io_error(&self.compression_type, result, "While compressing file")
  }

  fn flush(&mut self) -> std::io::Result<()> {
    let result = self.compressor.flush();
    compression_io_error(&self.compression_type, result, "While flushing compressed file")
  }
}

impl Drop for Compressor<'_> {
  fn drop(&mut self) {
    if !self.is_finished
      && let Err(error) = self.compressor.finish_stream()
    {
      debug!("When finishing compressed file on drop: {error}");
    }
  }
}

/// Add the compression type to an error of a compressed file, and keep the error kind and the cause
fn compression_io_error<T>(
  compression_type: &CompressionType,
  result: std::io::Result<T>,
  context: &'static str,
) -> std::io::Result<T> {
  if matches!(compression_type, CompressionType::None) {
    return result;
  }
  result.map_err(|error| {
    std::io::Error::new(
      error.kind(),
      CompressionError {
        context,
        compression_type: compression_type.clone(),
        source: error,
      },
    )
  })
}

/// Error of a compressed file, with the compression type
#[derive(Debug, derive_more::Display)]
#[display("{context} ({compression_type})")]
struct CompressionError {
  context: &'static str,
  compression_type: CompressionType,
  source: std::io::Error,
}

impl Error for CompressionError {
  fn source(&self) -> Option<&(dyn Error + 'static)> {
    Some(&self.source)
  }
}
