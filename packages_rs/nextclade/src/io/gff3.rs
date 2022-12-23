use crate::gene::cds::{Cds, CdsSegment, MatureProteinRegion};
use crate::gene::gene::{Gene, GeneStrand};
use crate::io::container::get_first_of;
use crate::io::gene_map::GeneMap;
use crate::make_error;
use crate::utils::error::to_eyre_error;
use crate::utils::string::surround_with_quotes;
use bio::io::gff::{GffType, Reader as GffReader, Record as GffRecord, Writer as GffWriter};
use color_eyre::{Section, SectionExt};
use eyre::{eyre, Report, WrapErr};
use itertools::Itertools;
use lazy_static::lazy_static;
use log::warn;
use multimap::MultiMap;
use serde::{Deserialize, Serialize};
use std::borrow::BorrowMut;
use std::fmt::Debug;
use std::hash::Hash;
use std::io::Read;
use std::path::Path;

pub const NAME_ATTRS: &[&str] = &["Name", "name", "gene_name", "gene", "locus_tag", "product", "ID"];

lazy_static! {
  pub static ref NAME_ATTRS_STR: String = NAME_ATTRS.iter().map(surround_with_quotes).join(", ");
}

/// Read GFF3 records given a file
pub fn read_gff3_file<P: AsRef<Path>>(filename: P) -> Result<GeneMap, Report> {
  let filename = filename.as_ref();
  let mut reader = GffReader::from_file(filename, GffType::GFF3).map_err(|report| eyre!(report))?;
  process_gff_records(&mut reader).wrap_err_with(|| format!("When reading GFF3 file '{filename:?}'"))
}

/// Read GFF3 records given a string
pub fn read_gff3_str(content: &str) -> Result<GeneMap, Report> {
  let mut reader = GffReader::new(content.as_bytes(), GffType::GFF3);
  process_gff_records(&mut reader).wrap_err("When reading GFF3 file")
}

/// Read GFF3 records and convert them into the internal representation
fn process_gff_records<R: Read>(reader: &mut GffReader<R>) -> Result<GeneMap, Report> {
  let records = reader
    .records()
    .map(to_eyre_error)
    .collect::<Result<Vec<GffRecord>, Report>>()?
    .into_iter()
    .enumerate()
    .collect_vec();

  if records.is_empty() {
    return make_error!("Gene map is empty. This is not allowed.");
  }

  // Extract list of genes
  let genes = get_records_by_feature_type(&records, "gene")
    .into_iter()
    .map(Gene::from_gff_record)
    .collect::<Result<Vec<_>, Report>>()?;

  // Extract list of CDSes.
  // Multiple CDS records with the same ID is the same CDS, but consisting of multiple segments. This may
  // express splicing and ribosome slippage. We want to aggregate segments with the same `ID` and treat them together.
  let cdses = get_records_by_feature_type(&records, "cds")
    .into_iter()
    .map(CdsSegment::from_gff_record)
    .collect::<Result<Vec<_>, Report>>()?
    .into_iter()
    .group_by(|cds_segment| cds_segment.id.clone())
    .into_iter()
    .map(|(id, segments)| Cds::from_segments(&id, segments.collect_vec()))
    .collect::<Result<Vec<_>, Report>>()?;

  // Extract list of mature protein regions
  let mprs = get_records_by_feature_type(&records, "mature_protein_region_of_CDS")
    .into_iter()
    .map(MatureProteinRegion::from_gff_record)
    .collect::<Result<Vec<_>, Report>>()?;

  let genes = build_hierarchy_of_features(genes, cdses, mprs)?;

  if genes.is_empty() {
    return make_error!(
      "Gene map: no valid genes or CDSes found among {} records. Without gene information some of the alignment and analysis stages cannot run, which may produce limited and less accurate results. In order to fix that, make sure you provide a valid gene map (genome annotation), containing information about genes and CDSes. If you want to proceed without genome information, omit `--gene-map` option.",
      records.len()
    );
  }

  // Collect array of genes into the map of names to genes
  Ok(genes.into_iter().map(|gene| (gene.gene_name.clone(), gene)).collect())
}

/// Assemble lists features with parent-child relationships into a hierarchy.
/// Usually the features are matched by `ID` attribute in the parent and `Parent` attribute in child.
#[allow(clippy::needless_pass_by_value)]
fn build_hierarchy_of_features(
  genes: Vec<Gene>,
  cdses: Vec<Cds>,
  mprs: Vec<MatureProteinRegion>,
) -> Result<Vec<Gene>, Report> {
  // HACK: COMPATIBILITY: If there are no gene records, then pretend that CDS records describe genes
  let (mut genes, cdses) = if genes.is_empty() {
    warn!("Gene map: No gene records found. Treating CDS records as genes. This behavior is for backwards compatibility only and will be removed in future versions. To remove this warning, make sure you provide a valid gene map (genome annotation), containing information about both the genes and the CDSes.");

    // Create a gene from each CDS
    let genes = cdses
      .iter()
      .map(Gene::from_cds)
      .collect::<Result<Vec<Gene>, Report>>()?;

    // Include gene as parent of a corresponding CDS
    let mut cdses = cdses;
    cdses.iter_mut().for_each(|cds| cds.parent_ids.push(cds.id.clone()));
    (genes, cdses)
  } else {
    (genes, cdses)
  };

  // HACK: COMPATIBILITY: If there are no CDS records, then pretend that every gene record describes a CDS
  let mut cdses = if cdses.is_empty() {
    warn!("Gene map: No CDS records found. Treating gene records as CDS records. This behavior is for backwards compatibility only and will be removed in future versions. To remove this warning, make sure you provide a valid gene map (genome annotation), containing information about both the genes and the CDSes.");
    genes.iter().map(Cds::from_gene).collect_vec()
  } else {
    cdses
  };

  // Associate mature protein regions with their parent CDSses
  cdses.iter_mut().for_each(|cds| {
    cds.mprs = mprs
      .iter()
      .filter(|mpr| mpr.parent_ids.contains(&cds.id))
      .cloned()
      .sorted_by_key(|mpr| (mpr.start, mpr.end, mpr.name.clone()))
      .collect_vec();
  });

  // Associate CDSes with their parent genes
  let genes = genes.into_iter().filter_map(|mut gene| {
    gene.cdses = cdses
      .iter()
      .filter(|cds| cds.parent_ids.contains(&gene.id))
      .cloned()
      .sorted_by_key(|cds| {
        let first_start = cds.mprs.first().map(|mpr| mpr.start).unwrap_or_default();
        let last_end = cds.mprs.last().map(|mpr| mpr.end).unwrap_or_default();
        (first_start, last_end, cds.name.clone())
      })
      .collect_vec();

    if gene.cdses.is_empty() {
      warn!(
        "Gene map: Both gene and CDS record types are present, but gene '{}' have no CDSes associated with it. Ignoring this gene.",
        gene.gene_name
      );
      return None
    }

    Some(gene)
  }).collect_vec();

  Ok(genes)
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GffCommonInfo {
  pub id: Option<String>,
  pub name: Option<String>,
  pub start: usize,
  pub end: usize,
  pub strand: GeneStrand,
  pub frame: i32,
  pub exceptions: Vec<String>,
  pub attributes: MultiMap<String, String>,
  pub gff_record_str: String,
}

impl GffCommonInfo {
  pub fn from_gff_record(gene_record: &GffRecord) -> Result<GffCommonInfo, Report> {
    let gff_record_str = gff_record_to_string(gene_record).unwrap_or_else(|_| "Unknown".to_owned());
    let name = get_one_of_attributes_optional(gene_record, NAME_ATTRS);
    let id = get_one_of_attributes_optional(gene_record, &["ID"]);
    let start = (*gene_record.start() - 1) as usize; // Convert to 0-based indices
    let end = *gene_record.end() as usize;
    let strand = gene_record
      .strand()
      .map_or(GeneStrand::Unknown, bio_types::strand::Strand::into);
    let frame = parse_gff3_frame(gene_record.frame(), start);
    let exceptions = gene_record
      .attributes()
      .get_vec("exception")
      .cloned()
      .unwrap_or_default()
      .into_iter()
      .sorted()
      .unique()
      .collect_vec();
    let attributes = gene_record.attributes().clone();
    Ok(GffCommonInfo {
      id,
      name,
      start,
      end,
      strand,
      frame,
      exceptions,
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
      (candidate == searched) || (candidate == get_sequence_anthology_code(&searched).unwrap_or_default())
    })
    .collect_vec()
}

#[inline]
#[must_use]
pub fn get_sequence_anthology_code(feature_name: &str) -> Option<&str> {
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

/// Parses `frame` column of the GFF3 record.
/// If `frame` cannot be parsed to an integer, then it is deduced from feature `start`.
pub fn parse_gff3_frame(frame: &str, start: usize) -> i32 {
  match frame.parse::<i32>() {
    Ok(frame) => frame,
    Err(_) => (start % 3) as i32,
  }
}

/// Prints GFF record as it is in the input file
pub fn gff_record_to_string(record: &GffRecord) -> Result<String, Report> {
  let mut buf = Vec::<u8>::new();
  {
    let mut writer = GffWriter::new(&mut buf, GffType::GFF3);
    writer.write(record)?;
  }
  Ok(String::from_utf8(buf)?)
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::utils::error::report_to_string;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  #[rstest]
  fn gff3_checks_feature_length() -> Result<(), Report> {
    let result = read_gff3_str(
      r#"##gff-version 3
##sequence-region EPI1857216 1 1718
EPI1857216	feature	gene	1	47	.	+	.	gene_name="SigPep"
EPI1857216	feature	gene	48	1035	.	+	.	gene_name="HA1"
EPI1857216	feature	gene	1036	1698	.	+	.	gene_name="HA2"
"#,
    );

    let report = eyre!("GFF3 record is invalid: feature length must be divisible by 3, but the length is 47")
      .wrap_err(eyre!("When reading GFF3 file"));

    assert_eq!(
      report_to_string(&result.unwrap_err()),
      "When reading GFF3 file: When parsing a GFF3 record: GFF3 record is invalid: feature length must be divisible by 3, but the length is 47"
    );

    Ok(())
  }
}
