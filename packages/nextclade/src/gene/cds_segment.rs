use crate::coord::position::NucRefGlobalPosition;
use crate::coord::range::{NucRefGlobalRange, NucRefLocalRange};
use crate::features::feature::Landmark;
use crate::gene::frame::Frame;
use crate::gene::gene::GeneStrand;
use crate::gene::phase::Phase;
use bitflags::bitflags;
use indexmap::IndexMap;
use schemars::gen::SchemaGenerator;
use schemars::schema::{InstanceType, Schema, SchemaObject};
use schemars::JsonSchema;
use serde::{Deserialize, Deserializer, Serialize, Serializer};

/// Marks the parts of circular, wrapping segments
///
/// Example:
///   WrappingStart      : |....<-----|
///   WrappingCentral(1) : |----------|
///   WrappingCentral(2) : |----------|
///   WrappingEnd(3)     : |---->     |
#[derive(Clone, Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "kebab-case")]
pub enum WrappingPart {
  NonWrapping,            // This is not a part of a circular, wrapping feature.
  WrappingStart,          // Wrapping part before the first wrap.
  WrappingCentral(usize), // Wrapping parts after first wrap - contains index of the part in the wrapping feature.
  WrappingEnd(usize),     // Last wrapping part.
}

// Shows whether the CDS is incomplete and by how much
bitflags! {
  #[derive(Clone, Debug, Default)]
  pub struct Truncation : u8 {
    const LEFT = 0b01;
    const RIGHT = 0b10;
  }
}

impl Serialize for Truncation {
  fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
  where
    S: Serializer,
  {
    if self.is_empty() {
      serializer.serialize_none()
    } else {
      let flag_str = if self.contains(Truncation::LEFT | Truncation::RIGHT) {
        "both"
      } else if self.contains(Truncation::LEFT) {
        "left"
      } else if self.contains(Truncation::RIGHT) {
        "right"
      } else {
        return Err(serde::ser::Error::custom("Invalid truncation flags"));
      };
      serializer.serialize_str(flag_str)
    }
  }
}

impl<'de> Deserialize<'de> for Truncation {
  fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
  where
    D: Deserializer<'de>,
  {
    let s = Option::<String>::deserialize(deserializer)?;
    match s.as_deref() {
      Some("both") => Ok(Truncation::LEFT | Truncation::RIGHT),
      Some("left") => Ok(Truncation::LEFT),
      Some("right") => Ok(Truncation::RIGHT),
      None => Ok(Truncation::empty()),
      _ => Err(serde::de::Error::custom("Unexpected value for Truncation")),
    }
  }
}

impl JsonSchema for Truncation {
  fn schema_name() -> String {
    "Truncation".to_owned()
  }

  fn json_schema(_: &mut SchemaGenerator) -> Schema {
    let enum_values = vec![
      serde_json::Value::Null,
      serde_json::Value::String("left".to_owned()),
      serde_json::Value::String("right".to_owned()),
      serde_json::Value::String("both".to_owned()),
    ];

    let schema = SchemaObject {
      instance_type: Some(InstanceType::String.into()),
      enum_values: Some(enum_values),
      ..SchemaObject::default()
    };

    Schema::Object(schema)
  }
}

#[derive(Clone, Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CdsSegment {
  pub index: usize,
  pub id: String,
  pub name: String,
  pub range: NucRefGlobalRange,
  pub range_local: NucRefLocalRange,
  pub landmark: Option<Landmark>,
  pub wrapping_part: WrappingPart,
  pub strand: GeneStrand,
  pub frame: Frame,
  pub phase: Phase,
  pub truncation: Truncation,
  pub exceptions: Vec<String>,
  pub attributes: IndexMap<String, Vec<String>>,
  #[serde(skip)]
  pub source_record: Option<String>,
  pub compat_is_gene: bool,
  pub color: Option<String>,
  pub gff_seqid: Option<String>,
  pub gff_source: Option<String>,
  pub gff_feature_type: Option<String>,
}

impl CdsSegment {
  pub fn name_and_type(&self) -> String {
    format!("CDS segment '{}'", self.name)
  }

  pub const fn start(&self) -> NucRefGlobalPosition {
    self.range.begin
  }

  pub const fn end(&self) -> NucRefGlobalPosition {
    self.range.end
  }

  #[inline]
  pub fn len(&self) -> usize {
    self.range.len()
  }

  #[inline]
  pub fn is_empty(&self) -> bool {
    self.len() == 0
  }
}
