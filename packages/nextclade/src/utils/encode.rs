use base64::{DecodeError, Engine, engine::general_purpose::STANDARD as Base64Standard};

pub fn base64_encode(input: &[u8]) -> String {
  Base64Standard.encode(input)
}

pub fn base64_decode(input: impl AsRef<[u8]>) -> Result<Vec<u8>, DecodeError> {
  Base64Standard.decode(input)
}
