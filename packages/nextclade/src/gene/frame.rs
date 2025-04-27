use crate::coord::position::{NucRefGlobalPosition, PositionLike};
use crate::make_internal_error;
use eyre::Report;
use schemars::r#gen::SchemaGenerator;
use schemars::schema::Schema;
use serde_repr::{Deserialize_repr, Serialize_repr};
use std::fmt::{Display, Formatter};

#[repr(i8)]
#[derive(Clone, Copy, Debug, Serialize_repr, Deserialize_repr)]
pub enum Frame {
  _0 = 0,
  _1 = 1,
  _2 = 2,
}

impl Frame {
  pub fn from_begin(global_begin: NucRefGlobalPosition) -> Result<Self, Report> {
    match (global_begin % 3).as_isize() {
      0 => Ok(Frame::_0),
      1 => Ok(Frame::_1),
      2 => Ok(Frame::_2),
      val => {
        make_internal_error!("Unexpected value for the frame of genetic feature: {val}. Expected values are: 0, 1, 2")
      }
    }
  }

  pub const fn to_usize(self) -> usize {
    match self {
      Frame::_0 => 0,
      Frame::_1 => 1,
      Frame::_2 => 2,
    }
  }
}

impl Display for Frame {
  fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
    write!(f, "{}", *self as i8)
  }
}

impl schemars::JsonSchema for Frame {
  fn schema_name() -> String {
    "Frame".to_owned()
  }

  fn json_schema(generator: &mut SchemaGenerator) -> Schema {
    generator.subschema_for::<i8>()
  }
}
