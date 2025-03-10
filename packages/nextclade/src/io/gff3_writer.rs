use crate::coord::position::PositionLike;
use crate::gene::cds_segment::CdsSegment;
use crate::gene::gene::Gene;
use crate::gene::gene_map::GeneMap;
use crate::io::file::create_file_or_stdout;
use crate::o;
use crate::utils::map::map_to_multimap;
use bio::io::gff::{GffType as BioGffType, Record as BioGffRecord, Writer as BioGffWriter};
use eyre::{Report, WrapErr};
use std::io::Write;
use std::path::Path;

pub struct Gff3Writer<W: Write> {
  writer: BioGffWriter<W>,
}

impl<W: Write> Gff3Writer<W> {
  pub fn new(writer: W) -> Result<Self, Report> {
    let writer = BioGffWriter::new(writer, BioGffType::GFF3);
    Ok(Self { writer })
  }

  pub fn write_genemap(&mut self, gene_map: &GeneMap) -> Result<(), Report> {
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
    self.writer.write(record).wrap_err("When writing GFF3 record")
  }
}

fn gene_to_bio_gff_record(gene: &Gene) -> Result<BioGffRecord, Report> {
  let mut record = BioGffRecord::new();
  *record.seqname_mut() = gene.gff_seqid.clone().unwrap_or_else(|| o!("."));
  *record.source_mut() = o!("nextclade");
  *record.feature_type_mut() = o!("gene");
  *record.start_mut() = gene.start().as_usize() as u64;
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
  *record.start_mut() = seg.start().as_usize() as u64;
  *record.end_mut() = seg.end().as_usize() as u64;
  *record.score_mut() = o!(".");
  *record.strand_mut() = o!(".");
  *record.frame_mut() = o!(".");
  *record.attributes_mut() = map_to_multimap(&seg.attributes);
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

  pub fn write_genemap(&mut self, gene_map: &GeneMap) -> Result<(), Report> {
    self.writer.write_genemap(gene_map)
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
