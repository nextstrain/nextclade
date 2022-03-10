use crate::gene::gene::Gene;
use crate::gene::gene_map::GeneMap;
use crate::utils::error::to_eyre_error;
use bio::io::gff::{GffType, Reader as GffReader, Record as GffRecord};
use bio_types::strand::Strand;
use color_eyre::{Section, SectionExt};
use eyre::{eyre, Report, WrapErr};
use itertools::Itertools;
use std::fmt::Debug;
use std::path::Path;

/// Parses `frame` column of the GFF3 record.
/// Note: If `frame` cannot be parsed to an integer, then it is deduced from gene `start`.
pub fn parse_gff3_frame(frame: &str, gene_start: usize) -> i32 {
  match frame.parse::<i32>() {
    Ok(frame) => frame,
    Err(_) => (gene_start % 3) as i32,
  }
}

/// Converts GFF3 record to the internal `Gene` representation
pub fn convert_gff_record_to_gene(gene_name: &str, record: &GffRecord) -> Result<Gene, Report> {
  let start = (*record.start() - 1) as usize; // Convert to 0-based indices
  Ok(Gene {
    gene_name: gene_name.to_owned(),
    start, // Convert to 0-based indices
    end: *record.end() as usize,
    strand: record.strand().unwrap_or(Strand::from_char(&'+')?).to_string(), // '+' strand by default
    frame: parse_gff3_frame(record.frame(), start),
  })
}

#[allow(clippy::needless_pass_by_value)]
pub fn convert_gff_record_to_gene_map_record(record: GffRecord) -> Option<Result<(String, Gene), Report>> {
  if record.feature_type().to_lowercase() == "gene" {
    let gene_name = record.attributes().get("gene_name");
    if let Some(gene_name) = gene_name {
      return Some(match convert_gff_record_to_gene(gene_name, &record) {
        Ok(gene) => Ok((gene_name.clone(), gene)),
        Err(report) => Err(report)
          .wrap_err("When parsing a GFF3 record")
          .with_section(|| format!("{:#?}", record).header("record:")),
      });
    }
  }
  None
}

pub fn read_gff3_file<P: AsRef<Path> + Debug + ToString>(filename: &P) -> Result<GeneMap, Report> {
  {
    GffReader::from_file(&filename, GffType::GFF3)
      .map_err(|report| eyre!(report))?
      .records()
      .map(to_eyre_error)
      .filter_map_ok(convert_gff_record_to_gene_map_record)
      .flatten()
      .collect::<Result<GeneMap, Report>>()
  }
  .wrap_err("When reading GFF3 file")
  .with_section(|| filename.to_string().header("filename:"))
}
