use eyre::{Report, WrapErr};
use serde::{Deserialize, Serialize};
use std::io::{Read, Write};

/// Read a serde object from MessagePack-encoded reader
pub fn messagepack_deserialize<R, T>(reader: R) -> Result<T, Report>
where
  R: Read,
  T: for<'de> Deserialize<'de>,
{
  T::deserialize(&mut rmp_serde::Deserializer::new(reader)).wrap_err("When serializing to MessagePack")
}

/// Read a serde object from MessagePack-encoded bytes
pub fn messagepack_from_bytes<T>(s: &[u8]) -> Result<T, Report>
where
  T: for<'de> Deserialize<'de>,
{
  messagepack_deserialize(s)
}

/// Write a serde object into MessagePack-encoded writer
pub fn messagepack_serialize<W: Write, T: Serialize>(writer: W, obj: &T) -> Result<(), Report> {
  obj
    .serialize(&mut rmp_serde::Serializer::new(writer).with_struct_map())
    .wrap_err("When serializing from MessagePack")
}

/// Write a serde object into MessagePack-encoded bytes
pub fn messagepack_to_bytes<T: Serialize>(obj: &T) -> Result<Vec<u8>, Report> {
  let mut buf = vec![];
  messagepack_serialize(&mut buf, obj)?;
  Ok(buf)
}
