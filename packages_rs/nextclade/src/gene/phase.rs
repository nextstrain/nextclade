use crate::make_internal_error;
use crate::utils::position::{NucRefLocalPosition, PositionLike};
use eyre::Report;
use schemars::gen::SchemaGenerator;
use schemars::schema::Schema;
use serde_repr::{Deserialize_repr, Serialize_repr};
use std::fmt::{Display, Formatter};

#[repr(i8)]
#[derive(Clone, Copy, Debug, Serialize_repr, Deserialize_repr)]
pub enum Phase {
  _0 = 0,
  _1 = 1,
  _2 = 2,
}

impl Phase {
  pub fn from_begin(local_begin: NucRefLocalPosition) -> Result<Self, Report> {
    match (3 - local_begin.as_isize() % 3) % 3 {
      0 => Ok(Phase::_0),
      1 => Ok(Phase::_1),
      2 => Ok(Phase::_2),
      val => {
        make_internal_error!("Unexpected value for the phase of genetic feature: {val}. Expected values are: 0, 1, 2")
      }
    }
  }
}

impl Display for Phase {
  fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
    write!(f, "{}", *self as i8)
  }
}

impl schemars::JsonSchema for Phase {
  fn schema_name() -> String {
    "Phase".to_owned()
  }

  fn json_schema(gen: &mut SchemaGenerator) -> Schema {
    gen.subschema_for::<i8>()
  }
}
