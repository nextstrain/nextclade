use crate::coord::position::PositionLike;
use crate::gene::cds::Cds;
use crate::gene::gene::Gene;
use crate::gene::gene::GeneStrand::Reverse;
use crate::gene::gene_map::GeneMap;
use crate::io::file::create_file_or_stdout;
use crate::io::gff3_writer::GFF_ATTRIBUTES_TO_REMOVE;
use crate::o;
use csv::{Writer as CsvWriter, WriterBuilder as CsvWriterBuilder};
use eyre::Report;
use std::io::Write;
use std::path::Path;

/// Writes Genbank Feature Table into a writer (`std::io::Write`)
///
/// See: https://www.ncbi.nlm.nih.gov/genbank/feature_table/
pub struct GenbankTblWriter<W: Write + Send> {
  writer: CsvWriter<W>,
}

impl<W: Write + Send> GenbankTblWriter<W> {
  pub fn new(writer: W) -> Result<Self, Report> {
    let writer = CsvWriterBuilder::new()
      .delimiter(b'\t')
      .flexible(true)
      .has_headers(false)
      .from_writer(writer);
    Ok(Self { writer })
  }

  pub fn write_genemap(&mut self, gene_map: &GeneMap) -> Result<(), Report> {
    let seq_id = gene_map
      .genes
      .first()
      .and_then(|gene| gene.gff_seqid.clone())
      .unwrap_or_default();

    // Write a line with sequence name
    // Example:
    // >Feature gb|MN908947.3|
    self.writer.write_record(&[format!(">Feature {seq_id}")])?;

    for gene in &gene_map.genes {
      self.write_gene(gene)?;
      for cds in &gene.cdses {
        self.write_cds(cds)?;
      }
    }

    Ok(())
  }

  fn write_gene(&mut self, gene: &Gene) -> Result<(), Report> {
    let start = (gene.start().as_usize() + 1).to_string(); // Convert to 1-based indexing
    let end = gene.end().as_usize().to_string();

    // Write a line with feature's boundaries and feature's kind
    // Example:
    // 21563 <TAB> 25384 <TAB> gene
    self.writer.write_record([&start, &end, "gene"])?;

    let mut attributes = gene.attributes.clone();
    GFF_ATTRIBUTES_TO_REMOVE.iter().for_each(|attr| {
      attributes.remove(*attr);
    });

    // If there's no "Name" attribute, let's add it
    if !attributes.contains_key("Name") {
      attributes.insert(o!("Name"), vec![gene.name.clone()]);
    }

    // Write lines with feature's qualifiers
    // Example:
    // <TAB> <TAB> <TAB> product    <TAB> surface glycoprotein
    // <TAB> <TAB> <TAB> protein_id <TAB> gb|QHD43416.1|
    // <TAB> <TAB> <TAB> note       <TAB> structural protein
    for (key, values) in &attributes {
      for value in values {
        self.writer.write_record(["", "", "", key, value])?;
      }
    }

    Ok(())
  }

  fn write_cds(&mut self, cds: &Cds) -> Result<(), Report> {
    for (i, segment) in cds.segments.iter().enumerate() {
      let mut start = (segment.start().as_usize() + 1).to_string(); // Convert to 1-based indexing
      let mut end = segment.end().as_usize().to_string();
      if segment.strand == Reverse {
        (start, end) = (end, start);
      }

      // Feature type is written only for the first segment
      let feature_type = if i == 0 { "CDS" } else { "" };

      // Write a line with feature's boundaries and feature's kind
      // Example:
      // 21563 <TAB> 25384 <TAB> CDS
      self.writer.write_record([&start, &end, feature_type])?;

      let mut attributes = segment.attributes.clone();
      GFF_ATTRIBUTES_TO_REMOVE.iter().for_each(|attr| {
        attributes.remove(*attr);
      });

      // If there's no "Name" attribute, let's add it
      if !attributes.contains_key("Name") {
        attributes.insert(o!("Name"), vec![segment.name.clone()]);
      }

      // If there's no "product" attribute, let's add it as CDS name
      if !segment.attributes.contains_key("product") {
        attributes.insert(o!("product"), vec![cds.name.clone()]);
      }

      // Write lines with feature's qualifiers
      // Example:
      // <TAB> <TAB> <TAB> product    <TAB> surface glycoprotein
      // <TAB> <TAB> <TAB> protein_id <TAB> gb|QHD43416.1|
      // <TAB> <TAB> <TAB> note       <TAB> structural protein
      for (key, values) in &segment.attributes {
        for value in values {
          self.writer.write_record(["", "", "", key, value])?;
        }
      }

      // Phase is added as an additional "codon_start" qualifier on the first CDS interval
      // in one-based format. It is only added if it's not "1" (phase 0).
      if i == 0 {
        let codon_start = segment.phase.to_usize() + 1;
        if codon_start != 1 {
          self
            .writer
            .write_record(["", "", "", "codon_start", &codon_start.to_string()])?;
        }
      }
    }

    Ok(())
  }
}

/// Writes Genbank Feature Table into a file
///
/// See: https://www.ncbi.nlm.nih.gov/genbank/feature_table/
pub struct GenbankTblFileWriter {
  writer: GenbankTblWriter<Box<dyn Write + Send>>,
}

impl GenbankTblFileWriter {
  pub fn new(filepath: impl AsRef<Path>) -> Result<Self, Report> {
    let file = create_file_or_stdout(filepath)?;
    Ok(Self {
      writer: GenbankTblWriter::new(file)?,
    })
  }

  pub fn write_genemap(&mut self, gene_map: &GeneMap) -> Result<(), Report> {
    self.writer.write_genemap(gene_map)
  }
}
