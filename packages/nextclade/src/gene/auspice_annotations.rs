use crate::coord::range::{NucRefGlobalRange, NucRefLocalRange};
use crate::gene::cds::Cds;
use crate::gene::cds_segment::{CdsSegment, WrappingPart};
use crate::gene::frame::Frame;
use crate::gene::gene::Gene;
use crate::gene::phase::Phase;
use crate::tree::tree::{AuspiceGenomeAnnotations, Segments, StartEnd};
use eyre::Report;
use std::collections::HashMap;

pub fn convert_auspice_annotations_to_genes(anns: &AuspiceGenomeAnnotations) -> Result<Vec<Gene>, Report> {
  anns
    .cdses
    .iter()
    .enumerate()
    .map(|(index, (cds_name, ann))| {
      let gene_name = ann.gene.as_ref().cloned().unwrap_or_else(|| format!("gene_{index}"));

      let segments = match &ann.segments {
        Segments::OneSegment(StartEnd { start, end }) => vec![CdsSegment {
          index,
          id: cds_name.to_owned(),
          name: cds_name.to_owned(),
          range: NucRefGlobalRange::from_isize(*start, *end),
          range_local: NucRefLocalRange::from_isize(0, *end - *start),
          landmark: None,
          wrapping_part: WrappingPart::NonWrapping,
          strand: ann.strand,
          frame: Frame::_0,
          phase: Phase::_0,
          exceptions: vec![],
          attributes: HashMap::default(),
          source_record: None,
          compat_is_gene: false,
          color: None,
        }],
        Segments::MultipleSegments { segments } => segments
          .iter()
          .map(|StartEnd { start, end }| CdsSegment {
            index,
            id: cds_name.to_owned(),
            name: cds_name.to_owned(),
            range: NucRefGlobalRange::from_isize(*start, *end),
            range_local: NucRefLocalRange::from_isize(0, *end - *start),
            landmark: None,
            wrapping_part: WrappingPart::NonWrapping,
            strand: ann.strand,
            frame: Frame::_0,
            phase: Phase::_0,
            exceptions: vec![],
            attributes: HashMap::default(),
            source_record: None,
            compat_is_gene: false,
            color: None,
          })
          .collect(),
      };

      let cds = Cds {
        id: cds_name.to_owned(),
        name: cds_name.to_owned(),
        product: cds_name.to_owned(),
        segments,
        proteins: vec![],
        exceptions: vec![],
        attributes: HashMap::default(),
        compat_is_gene: true,
        color: ann.color.clone(),
      };

      Ok(Gene {
        index,
        id: gene_name.clone(),
        name: gene_name,
        cdses: vec![cds],
        exceptions: vec![],
        attributes: HashMap::default(),
        source_record: None,
        compat_is_cds: true,
        color: ann.color.clone(),
      })
    })
    .collect()
}
