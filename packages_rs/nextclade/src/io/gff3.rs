use crate::gene::cds::{Cds, MatureProteinRegion};
use crate::gene::gene::{Gene, GeneStrand};
use crate::io::container::get_first_of;
use crate::io::gene_map::GeneMap;
use crate::make_error;
use crate::utils::error::to_eyre_error;
use crate::utils::string::surround_with_quotes;
use bio::io::gff::{GffType, Reader as GffReader, Record as GffRecord, Writer as GffWriter};
use bio_types::strand::Strand;
use color_eyre::{Section, SectionExt};
use eyre::{eyre, Report, WrapErr};
use itertools::Itertools;
use log::warn;
use std::fmt::Debug;
use std::hash::Hash;
use std::io::Read;
use std::path::Path;

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
    .collect::<Result<Vec<GffRecord>, Report>>()?;

  if records.is_empty() {
    return make_error!("Gene map is empty. This is not allowed.");
  }

  let gene_records = get_records_by_feature_type(&records, "gene");
  let cds_records = get_records_by_feature_type(&records, "cds");
  let mpr_records = get_records_by_feature_type(&records, "mature_protein_region_of_CDS");

  let genes = extract_hierarchy_of_genes_and_cdses(&gene_records, &cds_records, &mpr_records)?;

  if genes.is_empty() {
    warn!(
      "Gene map: no valid genes or CDSes found among {} records. Without gene information some of the alignment and analysis stages cannot run, which may produce limited and less accurate results. in order to fix that, make sure you provide a valid gene map (genome annotation), containing information about genes and CDSes",
      records.len()
    );
  }

  // Collect array of genes into the map of names to genes
  Ok(genes.into_iter().map(|gene| (gene.gene_name.clone(), gene)).collect())
}

/// Convert gene and CDS GFF3 records into the internal data structure, with CDS nested under genes
fn extract_hierarchy_of_genes_and_cdses(
  gene_records: &[(usize, &GffRecord)],
  cds_records: &[(usize, &GffRecord)],
  mpr_records: &[(usize, &GffRecord)],
) -> Result<Vec<Gene>, Report> {
  // HACK: COMPATIBILITY: If there are no gene records, then pretend that CDS records describe genes
  let gene_records = if gene_records.is_empty() {
    warn!("Gene map: No gene records found. Treating CDS records as genes. This behavior is for backwards compatibility only and will be removed in future versions. Make sure you provide a valid gene map (genome annotation), containing information about genes and CDSes.");
    cds_records
  } else {
    gene_records
  };

  // Convert every gene record
  gene_records
    .iter()
    .map(|(i, gene_record)| {
      convert_gff_record_to_gene(gene_record, cds_records, mpr_records)
        .wrap_err_with(|| format!("When processing GFF row {i}"))
    })
    .collect::<Result<Vec<Gene>, Report>>()
    .wrap_err_with(|| "When reading genes and CDSes of a gene map")
}

/// Retrieve GFF records of a certain "feature_type"
fn get_records_by_feature_type<'r>(records: &'r [GffRecord], record_type: &str) -> Vec<(usize, &'r GffRecord)> {
  records
    .iter()
    .enumerate()
    .filter(|(i, record)| record.feature_type().to_lowercase() == record_type.to_lowercase())
    .collect_vec()
}

/// Converts a GFF3 record to the internal `Gene` representation, with the corresponding CDS entries nested in it
pub fn convert_gff_record_to_gene(
  gene_record: &GffRecord,
  cds_records: &[(usize, &GffRecord)],
  mpr_records: &[(usize, &GffRecord)],
) -> Result<Gene, Report> {
  // If true, this is not a real gene, but rather a CDS, treated as gene as a fallback (because there are no genes)
  let compat_is_cds = gene_record.feature_type().to_lowercase() == "cds";

  // HACK: COMPATIBILITY: The canonical attribute for name is "Name" (case sensitive), however here we also query a
  // few other possible attributes, for backwards compatibility
  let gene_name = get_attribute_optional(gene_record, "Name").or_else(|| {
    const ATTR_NAMES: &[&str] = &["name", "gene_name", "locus_tag", "gene"];
    let attr_names_str = ATTR_NAMES.iter().map(surround_with_quotes).join(", ");
    let record_str = gff_record_to_string(gene_record).unwrap();
    warn!("Gene map: the gene record does not contain 'Name' attribute. Retrying with other possible attribute names: {attr_names_str}. This behavior is for backwards compatibility only and will be removed in future versions. Make sure you provide a valid gene map (genome annotation), containing information about genes and CDSes. Affected record:\n{record_str}");
    get_one_of_attributes_optional(gene_record, ATTR_NAMES)
  });

  if let Some(gene_name) = gene_name {
    // HACK: COMPATIBILITY: If a gene has no 'ID' attribute, then there is no way to link CDSes with it.
    // Therefore we treat the gene itself as CDS.
    let cdses = {
      let cdses = if let Some(gene_id) = get_attribute_optional(gene_record, "ID") {
        convert_gff_records_to_cdses(cds_records, mpr_records, &gene_id)
      } else {
        let record_str = gff_record_to_string(gene_record).unwrap();
        warn!("Gene map: the gene record does not contain 'ID' attribute, so it's impossible to find associated CDSes. Treating the gene itself as a CDS. This behavior is for backwards compatibility only and will be removed in future versions. Make sure you provide a valid gene map (genome annotation), containing information about genes and CDSes. Affected record:\n{record_str}");

        let mut cds = convert_gff_record_to_cds(gene_record, mpr_records)?;
        cds.compat_is_gene = true;
        Ok(vec![cds])
      }?;

      // HACK: COMPATIBILITY: If there are no CDS records associated with this gene, then treat the gene itself as one CDS
      if cdses.is_empty() {
        if !compat_is_cds {
          let record_str = gff_record_to_string(gene_record).unwrap();
          warn!("Gene map: the gene record has no associated CDSes. Treating the gene itself as a CDS. This behavior is for backwards compatibility only and will be removed in future versions. Make sure you provide a valid gene map (genome annotation), containing information about genes and CDSes. Affected record:\n{record_str}");
        }
        vec![convert_gff_record_to_cds(gene_record, mpr_records)?]
      } else {
        cdses
      }
    };

    let start = (*gene_record.start() - 1) as usize; // Convert to 0-based indices

    let exceptions = gene_record
      .attributes()
      .get_vec("exception")
      .cloned()
      .unwrap_or_default()
      .into_iter()
      .sorted()
      .unique()
      .collect_vec();

    Ok(Gene {
      gene_name,
      start,
      end: *gene_record.end() as usize,
      strand: gene_record.strand().map_or(GeneStrand::Unknown, Strand::into),
      frame: parse_gff3_frame(gene_record.frame(), start),
      cdses,
      exceptions,
      attributes: gene_record.attributes().clone(),
      compat_is_cds,
    })
  } else {
    make_error!("Gene map: unable to name of a gene")
      .with_section(|| gff_record_to_string(gene_record).unwrap().header("Failed entry:"))
  }
}

/// Converts GFF3 records to the internal `Cds` representation
fn convert_gff_records_to_cdses(
  cds_records: &[(usize, &GffRecord)],
  mpr_records: &[(usize, &GffRecord)],
  gene_id: &str,
) -> Result<Vec<Cds>, Report> {
  cds_records
    .iter()
    .map(|(i, cds_record)| -> Result<_, Report> {
      let parent_id =
        get_attribute_required(cds_record, "Parent").wrap_err_with(|| format!("When processing GFF row {i}"))?;
      Ok((*i, parent_id, *cds_record))
    })
    .filter_map_ok(|(i, parent_id, cds_record)| {
      (parent_id == gene_id).then_some(
        convert_gff_record_to_cds(cds_record, mpr_records).wrap_err_with(|| format!("When processing GFF row {i}")),
      )
    })
    .flatten()
    .collect()
}

/// Converts one GFF3 record to the internal `Cds` representation
fn convert_gff_record_to_cds(cds_record: &GffRecord, mpr_records: &[(usize, &GffRecord)]) -> Result<Cds, Report> {
  // HACK: COMPATIBILITY: The canonical attribute for name is "Name" (case sensitive), however here we also query a
  // few other possible attributes, for backwards compatibility
  let name = get_one_of_attributes_required(cds_record, &["Name", "name", "gene_name", "locus_tag", "gene"])?;

  dbg!(&cds_record);

  let mprs = get_attribute_optional(cds_record, "ID")
    .map(|id| convert_gff_records_to_mprs(mpr_records, &id).unwrap())
    .unwrap_or_default();

  let start = (*cds_record.start() - 1) as usize; // Convert to 0-based indices

  let exceptions = cds_record
    .attributes()
    .get_vec("exception")
    .cloned()
    .unwrap_or_default()
    .into_iter()
    .sorted()
    .unique()
    .collect_vec();

  Ok(Cds {
    name,
    start,
    end: *cds_record.end() as usize,
    strand: cds_record.strand().map_or(GeneStrand::Unknown, Strand::into),
    frame: parse_gff3_frame(cds_record.frame(), start),
    mprs,
    exceptions,
    attributes: cds_record.attributes().clone(),
    compat_is_gene: false,
  })
}

/// Converts GFF3 records to the internal `MatureProteinRegion` representation
fn convert_gff_records_to_mprs(
  mpr_records: &[(usize, &GffRecord)],
  cds_id: &str,
) -> Result<Vec<MatureProteinRegion>, Report> {
  mpr_records
    .iter()
    .map(|(i, mpr_record)| -> Result<_, Report> {
      let parent_id =
        get_attribute_required(mpr_record, "Parent").wrap_err_with(|| format!("When processing GFF row {i}"))?;
      Ok((*i, parent_id, *mpr_record))
    })
    .filter_map_ok(|(i, parent_id, mpr_record)| {
      (parent_id == cds_id)
        .then_some(convert_gff_record_to_mpr(mpr_record).wrap_err_with(|| format!("When processing GFF row {i}")))
    })
    .flatten()
    .collect()
}

/// Converts one GFF3 record to the internal `MatureProteinRegion` representation
fn convert_gff_record_to_mpr(mpr_record: &GffRecord) -> Result<MatureProteinRegion, Report> {
  // HACK: COMPATIBILITY: The canonical attribute for name is "Name" (case sensitive), however here we also query a
  // few other possible attributes, for backwards compatibility
  let name = get_one_of_attributes_required(
    mpr_record,
    &["Name", "name", "gene_name", "locus_tag", "gene", "product", "ID"],
  )?
  .trim_start_matches("id-")
  .to_owned();

  let start = (*mpr_record.start() - 1) as usize; // Convert to 0-based indices

  let exceptions = mpr_record
    .attributes()
    .get_vec("exception")
    .cloned()
    .unwrap_or_default()
    .into_iter()
    .sorted()
    .unique()
    .collect_vec();

  Ok(MatureProteinRegion {
    name,
    start,
    end: *mpr_record.end() as usize,
    strand: mpr_record.strand().map_or(GeneStrand::Unknown, Strand::into),
    frame: parse_gff3_frame(mpr_record.frame(), start),
    exceptions,
    attributes: mpr_record.attributes().clone(),
  })
}

/// Retrieve an attribute from a GFF record given a name. Return None if not found.
fn get_attribute_optional(record: &GffRecord, attr_name: &str) -> Option<String> {
  record.attributes().get(attr_name).cloned()
}

/// Retrieve an attribute from a GFF record given a name. Fail if not found.
fn get_attribute_required(record: &GffRecord, attr_name: &str) -> Result<String, Report> {
  get_attribute_optional(record, attr_name).ok_or_else(|| {
    eyre!(
      "The \"{}\" entry has no required attribute \"{attr_name}\":\n  {}",
      record.feature_type(),
      gff_record_to_string(record).unwrap()
    )
  })
}

/// Retrieve an attribute from a GFF record, given one of the possible names. Return None if not found.
fn get_one_of_attributes_optional(record: &GffRecord, attr_names: &[&str]) -> Option<String> {
  get_first_of(record.attributes(), attr_names)
}

/// Retrieve an attribute from a GFF record, given one of the possible names. Fail if not found.
fn get_one_of_attributes_required(record: &GffRecord, attr_names: &[&str]) -> Result<String, Report> {
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
fn parse_gff3_frame(frame: &str, start: usize) -> i32 {
  match frame.parse::<i32>() {
    Ok(frame) => frame,
    Err(_) => (start % 3) as i32,
  }
}

/// Prints GFF record as it is in the input file
fn gff_record_to_string(record: &GffRecord) -> Result<String, Report> {
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
