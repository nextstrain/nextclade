use crate::coord::range::NucRefGlobalRange;
use crate::gene::gene::GeneStrand;
use crate::utils::collections::get_first_of;
use crate::utils::string::surround_with_quotes;
use bio::io::gff::{GffType, Record as GffRecord, Writer as GffWriter};
use color_eyre::{Section, SectionExt};
use eyre::{eyre, Report, WrapErr};
use itertools::Itertools;
use serde::{Deserialize, Serialize};
use std::borrow::BorrowMut;
use std::collections::HashMap;
use std::fmt::Debug;
use std::hash::Hash;
use std::io::Read;

/// Possible keys for name attribute (in order of preference!)
pub const NAME_ATTRS_GENE: &[&str] = &[
  "Gene",
  "gene",
  "gene_name",
  "locus_tag",
  "Name",
  "name",
  "Alias",
  "alias",
  "standard_name",
  "old-name",
  "product",
  "gene_synonym",
  "gb-synonym",
  "acronym",
  "gb-acronym",
  "protein_id",
  "ID",
];

pub const NAME_ATTRS_CDS: &[&str] = &[
  "Name",
  "name",
  "Alias",
  "alias",
  "standard_name",
  "old-name",
  "Gene",
  "gene",
  "gene_name",
  "locus_tag",
  "product",
  "gene_synonym",
  "gb-synonym",
  "acronym",
  "gb-acronym",
  "protein_id",
  "ID",
];

pub const NAME_ATTRS_PROTEIN: &[&str] = &[
  "product",
  "protein_id",
  "gene_synonym",
  "gb-synonym",
  "acronym",
  "gb-acronym",
  "ID",
  "Gene",
  "gene",
  "gene_name",
  "locus_tag",
  "Name",
  "name",
  "Alias",
  "alias",
  "standard_name",
  "old-name",
];

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GffCommonInfo {
  pub id: Option<String>,
  pub name: Option<String>,
  pub range: NucRefGlobalRange,
  pub strand: GeneStrand,
  pub exceptions: Vec<String>,
  pub notes: Vec<String>,
  pub is_circular: bool,
  pub attributes: HashMap<String, Vec<String>>,
  pub gff_record_str: String,
}

impl GffCommonInfo {
  pub fn from_gff_record(record: &GffRecord) -> Result<GffCommonInfo, Report> {
    let gff_record_str = gff_record_to_string(record).unwrap_or_else(|_| "Unknown".to_owned());
    let name_attrs = match record.feature_type().to_lowercase().as_str() {
      "cds" => NAME_ATTRS_CDS,
      "mature_protein_region_of_cds" => NAME_ATTRS_PROTEIN,
      _ => NAME_ATTRS_GENE,
    };
    let name = get_one_of_attributes_optional(record, name_attrs);
    let id = get_one_of_attributes_optional(record, &["ID"]);
    let start = (*record.start() - 1) as usize; // Convert to 0-based indices
    let end = *record.end() as usize;

    let range = NucRefGlobalRange::new(start.into(), end.into());

    // NOTE: assume 'forward' strand by default because 'unknown' does not make sense in this application
    let strand = record.strand().map_or(GeneStrand::Forward, GeneStrand::from);

    let attr_keys = record.attributes().keys().sorted().unique().collect_vec();

    let exception_attr_keys = {
      let mut exception_attr_keys = attr_keys
        .iter()
        .filter(|key| key.contains("except"))
        .map(|s| s.as_str())
        .collect_vec();
      exception_attr_keys.extend_from_slice(&["exception", "exceptions", "except", "transl_except"]);
      exception_attr_keys
    };

    let exceptions = get_all_attributes(record, &exception_attr_keys)?
      .into_iter()
      .unique()
      .collect();

    let notes_attr_keys = {
      let mut notes_attr_keys = attr_keys
        .iter()
        .filter(|key| key.contains("note"))
        .map(|s| s.as_str())
        .collect_vec();
      notes_attr_keys.extend_from_slice(&["Note", "note", "Notes", "notes"]);
      notes_attr_keys
    };

    let notes = get_all_attributes(record, &notes_attr_keys)?
      .into_iter()
      .unique()
      .collect();

    let is_circular =
      get_attribute_optional(record, "Is_circular").map_or(false, |is_circular| is_circular.to_lowercase() == "true");

    // Convert MultiMap to HashMap of Vec
    let attributes: HashMap<String, Vec<String>> = record
      .attributes()
      .iter_all()
      .map(|(key, values)| (key.clone(), values.clone()))
      .collect();

    Ok(GffCommonInfo {
      id,
      name,
      range,
      strand,
      exceptions,
      notes,
      is_circular,
      attributes,
      gff_record_str,
    })
  }
}

/// Retrieve GFF records of a certain "feature_type"
fn get_records_by_feature_type<'r>(
  records: &'r [(usize, GffRecord)],
  record_type: &str,
) -> Vec<&'r (usize, GffRecord)> {
  records
    .iter()
    .filter(|(i, record)| {
      let searched = record_type.to_lowercase();
      let candidate = record.feature_type().to_lowercase();
      (candidate == searched) || (candidate == get_sequence_onthology_code(&searched).unwrap_or_default())
    })
    .collect_vec()
}

#[inline]
#[must_use]
pub fn get_sequence_onthology_code(feature_name: &str) -> Option<&str> {
  match feature_name {
    "cds" => Some("SO:0000316"),
    "gene" => Some("SO:0000704"),
    "mature_protein_region_of_CDS" => Some("SO:0002249"),
    _ => None,
  }
}

/// Retrieve an attribute from a GFF record given a name. Return None if not found.
pub fn get_attribute_optional(record: &GffRecord, attr_name: &str) -> Option<String> {
  record.attributes().get(attr_name).cloned()
}

/// Retrieve an attribute from a GFF record given a name. Fail if not found.
pub fn get_attribute_required(record: &GffRecord, attr_name: &str) -> Result<String, Report> {
  get_attribute_optional(record, attr_name).ok_or_else(|| {
    eyre!(
      "The \"{}\" entry has no required attribute \"{attr_name}\":\n  {}",
      record.feature_type(),
      gff_record_to_string(record).unwrap()
    )
  })
}

/// Retrieve an attribute from a GFF record, given one of the possible names. Return None if not found.
pub fn get_one_of_attributes_optional(record: &GffRecord, attr_names: &[&str]) -> Option<String> {
  get_first_of(record.attributes(), attr_names)
}

/// Retrieve an attribute from a GFF record, given one of the possible names. Fail if not found.
pub fn get_one_of_attributes_required(record: &GffRecord, attr_names: &[&str]) -> Result<String, Report> {
  get_one_of_attributes_optional(record, attr_names).ok_or_else(|| {
    eyre!(
      "The \"{}\" entry has none of the attributes: {}, but at least one is required",
      record.feature_type(),
      attr_names.iter().map(surround_with_quotes).join(", ")
    )
    .with_section(|| gff_record_to_string(record).unwrap().header("Failed entry:"))
  })
}

/// Retrieve attribute values for all given keys
pub fn get_all_attributes(record: &GffRecord, attr_names: &[&str]) -> Result<Vec<String>, Report> {
  attr_names
    .iter()
    .flat_map(|attr| record.attributes().get_vec(*attr).cloned().unwrap_or_default())
    .sorted()
    .unique()
    .map(|val| Ok(urlencoding::decode(&val)?.to_string()))
    .collect::<Result<Vec<String>, Report>>()
}

/// Prints GFF record as it is in the input file
pub fn gff_record_to_string(record: &GffRecord) -> Result<String, Report> {
  let mut buf = Vec::<u8>::new();
  {
    let mut writer = GffWriter::new(&mut buf, GffType::GFF3);
    writer.write(record)?;
  };
  Ok(String::from_utf8(buf)?)
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::gene::gene_map::GeneMap;
  use crate::utils::error::report_to_string;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  #[rstest]
  fn gff3_checks_feature_length() -> Result<(), Report> {
    let result = GeneMap::from_str(
      r#"##gff-version 3
##sequence-region EPI1857216 1 1718
EPI1857216	feature	gene	1	47	.	+	.	gene_name="SigPep"
EPI1857216	feature	gene	48	1035	.	+	.	gene_name="HA1"
EPI1857216	feature	gene	1036	1698	.	+	.	gene_name="HA2"
"#,
    );

    assert_eq!(
      report_to_string(&result.unwrap_err()),
      "Length of a CDS is expected to be divisible by 3, but the length of CDS 'HA1' is 988 (it consists of 1 fragment(s) of length(s) 988). This is likely a mistake in genome annotation."
    );

    Ok(())
  }
}
