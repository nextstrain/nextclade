use crate::io::file::create_file;
use crate::io::gene_map::GeneMap;
use crate::make_internal_error;
use crate::utils::range::Range;
use csv::{Writer as CsvWriter, WriterBuilder as CsvWriterBuilder};
use eyre::Report;
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::Path;

/// An entry for Genbank Feature Table
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenbankFeatureTableEntry {
  pub seq_name: String,
  pub gene_ranges_qry: IndexMap<String, Range>,
}

/// Writes Genbank Feature Table into a writer (`std::io::Write`)
///
/// See: https://www.ncbi.nlm.nih.gov/genbank/feature_table/
pub struct GenbankFeatureTableWriter<'g, W: Write + Send> {
  writer: CsvWriter<W>,
  gene_map: &'g GeneMap,
}

impl<'g, W: Write + Send> GenbankFeatureTableWriter<'g, W> {
  pub fn new(writer: W, gene_map: &'g GeneMap) -> Result<Self, Report> {
    let writer = CsvWriterBuilder::new()
      .delimiter(b'\t')
      .flexible(true)
      .from_writer(writer);
    Ok(Self { writer, gene_map })
  }

  pub fn write(&mut self, entry: &GenbankFeatureTableEntry) -> Result<(), Report> {
    let GenbankFeatureTableEntry {
      seq_name,
      gene_ranges_qry,
    } = entry;

    // Write a line with sequence name
    // Example:
    // >Feature gb|MN908947.3|
    self.writer.write_record(&[format!(">{seq_name}")])?;

    self
      .gene_map
      .iter()
      .try_for_each(|(gene_name, gene)| -> Result<(), Report> {
        let range = match gene_ranges_qry.get(gene_name) {
          None => make_internal_error!("Gene range not found for gene \"{gene_name}\""),
          Some(range) => Ok(range),
        }?;

        // Write a line with feature's boundaries and feature's kind
        // Example:
        // 21563 <TAB> 25384 <TAB> gene
        self
          .writer
          .write_record(&[&range.begin.to_string(), &range.end.to_string(), &gene.kind.to_string()])?;

        // Write lines with feature's attributes
        // Example:
        // <TAB> <TAB> <TAB> product    <TAB> surface glycoprotein
        // <TAB> <TAB> <TAB> protein_id <TAB> gb|QHD43416.1|
        // <TAB> <TAB> <TAB> note       <TAB> structural protein
        for (key, values) in &gene.attributes {
          for value in values {
            self.writer.write_record(&["", "", "", key, value])?;
          }
        }

        Ok(())
      })
  }
}

/// Writes Genbank Feature Table into a file
///
/// See: https://www.ncbi.nlm.nih.gov/genbank/feature_table/
pub struct GenbankFeatureTableFileWriter<'g> {
  writer: GenbankFeatureTableWriter<'g, Box<dyn Write + Send>>,
}

impl<'g> GenbankFeatureTableFileWriter<'g> {
  pub fn new(filepath: impl AsRef<Path>, gene_map: &'g GeneMap) -> Result<Self, Report> {
    let file = create_file(filepath)?;
    Ok(Self {
      writer: GenbankFeatureTableWriter::new(file, gene_map)?,
    })
  }

  pub fn write(&mut self, entry: &GenbankFeatureTableEntry) -> Result<(), Report> {
    self.writer.write(entry)
  }
}

/// Writes Genbank Feature Table into a string
///
/// See: https://www.ncbi.nlm.nih.gov/genbank/feature_table/
pub fn to_feature_table_string(entries: &[GenbankFeatureTableEntry], genemap: &GeneMap) -> Result<String, Report> {
  let mut buf = Vec::<u8>::new();

  {
    let mut writer = GenbankFeatureTableWriter::new(&mut buf, genemap)?;
    for entry in entries {
      writer.write(entry)?;
    }
  }

  Ok(String::from_utf8(buf)?)
}
