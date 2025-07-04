use crate::gene::gene::GeneStrand;
use crate::io::gff3_encoding::gff_decode_non_attribute;
use crate::io::gff3_writer::gff_record_to_string;
use crate::utils::string::surround_with_quotes;
use crate::{coord::range::NucRefGlobalRange, io::gff3_encoding::gff_decode_attribute};
use bio::io::gff::Record as GffRecord;
use color_eyre::{Section, SectionExt};
use eyre::{eyre, Context, Report};
use indexmap::IndexMap;
use itertools::Itertools;
use serde::{Deserialize, Serialize};
use std::fmt::Debug;

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
  pub attributes: IndexMap<String, Vec<String>>,
  pub gff_record_str: String,
  pub gff_seqid: Option<String>,
  pub gff_source: Option<String>,
  pub gff_feature_type: Option<String>,
}

impl GffCommonInfo {
  pub fn from_gff_record(record_raw: &GffRecord) -> Result<GffCommonInfo, Report> {
    let record = &gff_decode_record(record_raw).wrap_err_with(|| {
      format!(
        "Failed to decode GFF record: {}",
        gff_record_to_string(record_raw).unwrap_or_else(|_| "Unknown".to_owned())
      )
    })?;

    let gff_record_str = gff_record_to_string(record_raw).unwrap_or_else(|_| "Unknown".to_owned());

    let attributes: IndexMap<String, Vec<String>> = record
      .attributes()
      .iter_all()
      .map(gff_read_convert_attributes)
      .try_collect()?;

    let name_attrs = match record.feature_type().to_lowercase().as_str() {
      "cds" => NAME_ATTRS_CDS,
      "mature_protein_region_of_cds" => NAME_ATTRS_PROTEIN,
      _ => NAME_ATTRS_GENE,
    };
    let name = get_one_of_attributes_optional(&attributes, name_attrs);
    let id = get_one_of_attributes_optional(&attributes, &["ID"]);
    let start = (*record.start() - 1) as usize; // Convert to 0-based indices
    let end = *record.end() as usize;

    let range = NucRefGlobalRange::new(start.into(), end.into());

    // NOTE: assume 'forward' strand by default because 'unknown' does not make sense in this application
    let strand = record.strand().map_or(GeneStrand::Forward, GeneStrand::from);

    let attr_keys = attributes.keys().collect_vec();

    let exception_attr_keys = {
      let mut exception_attr_keys = attr_keys
        .iter()
        .filter(|key| key.contains("except"))
        .map(|s| s.as_str())
        .collect_vec();
      exception_attr_keys.extend_from_slice(&["exception", "exceptions", "except", "transl_except"]);
      exception_attr_keys
    };

    let exceptions = get_all_attributes(&attributes, &exception_attr_keys);

    let notes_attr_keys = {
      let mut notes_attr_keys = attr_keys
        .iter()
        .filter(|key| key.contains("note"))
        .map(|s| s.as_str())
        .collect_vec();
      notes_attr_keys.extend_from_slice(&["Note", "note", "Notes", "notes"]);
      notes_attr_keys
    };

    let notes = get_all_attributes(&attributes, &notes_attr_keys);

    let is_circular = get_attribute_optional(&attributes, "Is_circular")
      .map_or(false, |is_circular| is_circular.to_lowercase() == "true");

    let gff_seqid = get_gff_value_maybe(record.seqname());
    let gff_source = get_gff_value_maybe(record.source());
    let gff_feature_type = get_gff_value_maybe(record.feature_type());

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
      gff_seqid,
      gff_source,
      gff_feature_type,
    })
  }
}

fn gff_decode_record(record: &GffRecord) -> Result<GffRecord, Report> {
  let mut new_record = record.clone();
  *new_record.seqname_mut() = gff_decode_non_attribute(record.seqname())?;
  *new_record.source_mut() = gff_decode_non_attribute(record.source())?;
  *new_record.feature_type_mut() = gff_decode_non_attribute(record.feature_type())?;
  Ok(new_record)
}

fn gff_read_convert_attributes((key, values): (&String, &Vec<String>)) -> Result<(String, Vec<String>), Report> {
  let key = gff_decode_attribute(key).wrap_err_with(|| format!("Failed to decode GFF attribute key: {key:?}"))?;
  let values: Vec<String> = values
    .iter()
    .map(|v| {
      gff_decode_attribute(v).wrap_err_with(|| format!("Failed to decode GFF attribute value: {v:?} for key: {key:?}"))
    })
    .try_collect()?;
  Ok((key, values))
}

fn get_gff_value_maybe(val: impl AsRef<str>) -> Option<String> {
  let val = val.as_ref().trim();
  (!val.is_empty() && val != ".").then(|| val.to_owned())
}

#[inline]
#[must_use]
pub fn get_sequence_ontology_code(feature_name: &str) -> Option<&str> {
  match feature_name {
    "cds" => Some("SO:0000316"),
    "gene" => Some("SO:0000704"),
    "mature_protein_region_of_CDS" => Some("SO:0002249"),
    _ => None,
  }
}

/// Retrieve an attribute from a GFF record given a name. Return None if not found.
pub fn get_attribute_optional(attributes: &IndexMap<String, Vec<String>>, attr_name: &str) -> Option<String> {
  attributes.get(attr_name).and_then(|attrs| attrs.first()).cloned()
}

/// Retrieve an attribute from a GFF record given a name. Fail if not found.
pub fn get_attribute_required(
  record: &GffRecord,
  attributes: &IndexMap<String, Vec<String>>,
  attr_name: &str,
) -> Result<String, Report> {
  get_attribute_optional(attributes, attr_name).ok_or_else(|| {
    eyre!(
      "The '{}' entry has no required attribute '{}':
  {}",
      record.feature_type(),
      attr_name,
      gff_record_to_string(record).unwrap()
    )
  })
}

/// Retrieve an attribute from a GFF record, given one of the possible names. Return None if not found.
pub fn get_one_of_attributes_optional(
  attributes: &IndexMap<String, Vec<String>>,
  attr_names: &[&str],
) -> Option<String> {
  attr_names
    .iter()
    .find_map(|&name| attributes.get(name).and_then(|val| val.first()))
    .cloned()
}

/// Retrieve an attribute from a GFF record, given one of the possible names. Fail if not found.
pub fn get_one_of_attributes_required(
  record: &GffRecord,
  attributes: &IndexMap<String, Vec<String>>,
  attr_names: &[&str],
) -> Result<String, Report> {
  get_one_of_attributes_optional(attributes, attr_names).ok_or_else(|| {
    eyre!(
      "The '{}' entry has none of the attributes: {}, but at least one is required",
      record.feature_type(),
      attr_names.iter().map(surround_with_quotes).join(", ")
    )
    .with_section(|| gff_record_to_string(record).unwrap().header("Failed entry:"))
  })
}

/// Retrieve attribute values for all given keys
pub fn get_all_attributes(attributes: &IndexMap<String, Vec<String>>, attr_names: &[&str]) -> Vec<String> {
  attr_names
    .iter()
    .filter_map(|attr| attributes.get(*attr))
    .flatten()
    .cloned()
    .sorted()
    .unique()
    .collect_vec()
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
      "Length of a CDS is expected to be divisible by 3, but the length of CDS 'SigPep' is 47 (it consists of 1 fragment(s) of length(s) 47). This is likely a mistake in genome annotation."
    );

    Ok(())
  }
}
