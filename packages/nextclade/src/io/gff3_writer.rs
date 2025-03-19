use crate::coord::position::PositionLike;
use crate::gene::cds_segment::CdsSegment;
use crate::gene::gene::Gene;
use crate::gene::gene_map::GeneMap;
use crate::io::file::create_file_or_stdout;
use crate::o;
use crate::utils::map::map_to_multimap;
use bio::io::gff::{GffType as BioGffType, Record as BioGffRecord, Writer as BioGffWriter};
use eyre::{Report, WrapErr};
use indexmap::indexmap;
use std::io::Write;
use std::path::Path;

pub const GFF_ATTRIBUTES_TO_REMOVE: &[&str] = &["translation", "codon_start"];

pub struct Gff3Writer<W: Write> {
  writer: W,
  has_header_written: bool,
}

impl<W: Write> Gff3Writer<W> {
  pub const fn new(writer: W) -> Result<Self, Report> {
    Ok(Self {
      writer,
      has_header_written: false,
    })
  }

  pub fn write_genemap(
    &mut self,
    gene_map: &GeneMap,
    seq_index: usize,
    seq_id: &str,
    seq_len: usize,
  ) -> Result<(), Report> {
    if gene_map.is_empty() {
      return Ok(());
    }

    if !self.has_header_written {
      writeln!(self.writer, "##gff-version 3")?;
      self.has_header_written = true;
    }

    writeln!(self.writer, "##sequence-region {seq_id} 1 {seq_len}")?;
    self.write_record(&create_bio_gff_region_record(seq_index, seq_id, seq_len)?)?;

    for gene in &gene_map.genes {
      let record = gene_to_bio_gff_record(gene).wrap_err_with(|| format!("When converting gene '{}'", gene.name))?;
      self.write_record(&record)?;

      for cds in &gene.cdses {
        for (i, segment) in cds.segments.iter().enumerate() {
          let record = cds_to_bio_gff_record(segment)
            .wrap_err_with(|| format!("When converting segment {} of CDS {}", i, cds.name))?;
          self.write_record(&record)?;
        }

        // TODO: once we support proteins, output proteins as well
        // for protein in &cds.proteins {}
      }
    }

    Ok(())
  }

  pub fn write_record(&mut self, record: &BioGffRecord) -> Result<(), Report> {
    // HACK: this creates a new writer for each row. This is inefficient, but bio GFF writer consumes original writer
    // and does not provide access to it afterward. So in order to be able to write a GFF where feature rows and
    // pragmas are interleaved, we have to construct a new writer every time.
    // TODO: use CSV writer directly instead: bio GFF writer provides very little value added and has a defective
    // inconvenient interface.
    let mut writer = BioGffWriter::new(&mut self.writer, BioGffType::GFF3);
    writer.write(record).wrap_err("When writing GFF3 record")
  }
}

fn gene_to_bio_gff_record(gene: &Gene) -> Result<BioGffRecord, Report> {
  let mut record = BioGffRecord::new();
  *record.seqname_mut() = gene.gff_seqid.clone().unwrap_or_else(|| o!("."));
  *record.source_mut() = o!("nextclade");
  *record.feature_type_mut() = o!("gene");
  *record.start_mut() = (gene.start().as_usize() + 1) as u64;
  *record.end_mut() = gene.end().as_usize() as u64;
  *record.score_mut() = o!(".");
  *record.strand_mut() = o!(".");
  *record.frame_mut() = o!(".");
  *record.attributes_mut() = map_to_multimap(&gene.attributes);

  Ok(record)
}

fn cds_to_bio_gff_record(seg: &CdsSegment) -> Result<BioGffRecord, Report> {
  let mut record = BioGffRecord::new();
  *record.seqname_mut() = seg.gff_seqid.clone().unwrap_or_else(|| o!("."));
  *record.source_mut() = o!("nextclade");
  *record.feature_type_mut() = o!("CDS");
  *record.start_mut() = (seg.start().as_usize() + 1) as u64;
  *record.end_mut() = seg.end().as_usize() as u64;
  *record.score_mut() = o!(".");
  *record.strand_mut() = seg.strand.to_string();
  *record.frame_mut() = seg.phase.to_usize().to_string();
  *record.attributes_mut() = map_to_multimap(&seg.attributes);
  Ok(record)
}

fn create_bio_gff_region_record(seq_index: usize, seqid: &str, seq_len: usize) -> Result<BioGffRecord, Report> {
  let mut record = BioGffRecord::new();
  *record.seqname_mut() = seqid.to_owned();
  *record.source_mut() = o!("nextclade");
  *record.feature_type_mut() = o!("region");
  *record.start_mut() = 1;
  *record.end_mut() = seq_len as u64;
  *record.score_mut() = o!(".");
  *record.strand_mut() = o!(".");
  *record.frame_mut() = o!(".");
  *record.attributes_mut() = map_to_multimap(&indexmap! {
    o!("seq_index") => vec![seq_index.to_string()],
    o!("ID") => vec![seqid.to_owned()],
    o!("Name") => vec![seqid.to_owned()],
  });
  Ok(record)
}

pub struct Gff3FileWriter {
  writer: Gff3Writer<Box<dyn Write + Send>>,
}

impl Gff3FileWriter {
  pub fn new(filepath: impl AsRef<Path>) -> Result<Self, Report> {
    let file = create_file_or_stdout(filepath)?;
    Ok(Self {
      writer: Gff3Writer::new(file)?,
    })
  }

  pub fn write_genemap(
    &mut self,
    gene_map: &GeneMap,
    seq_index: usize,
    seq_id: &str,
    seq_len: usize,
  ) -> Result<(), Report> {
    self.writer.write_genemap(gene_map, seq_index, seq_id, seq_len)
  }

  pub fn write_record(&mut self, record: &BioGffRecord) -> Result<(), Report> {
    self.writer.write_record(record)
  }
}

pub fn gff_record_to_string(record: &BioGffRecord) -> Result<String, Report> {
  let mut buf = Vec::<u8>::new();
  {
    let mut writer = Gff3Writer::new(&mut buf)?;
    writer.write_record(record)?;
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
      "Length of a CDS is expected to be divisible by 3, but the length of CDS 'SigPep' is 47 (it consists of 1 fragment(s) of length(s) 47). This is likely a mistake in genome annotation."
    );

    Ok(())
  }
}
