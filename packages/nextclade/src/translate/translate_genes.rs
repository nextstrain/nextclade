use crate::align::align::align_aa;
use crate::align::insertions_strip::{insertions_strip, Insertion};
use crate::align::params::AlignPairwiseParams;
use crate::align::remove_gaps::remove_gaps_in_place;
use crate::alphabet::aa::Aa;
use crate::alphabet::letter::{serde_deserialize_seq, serde_serialize_seq, Letter};
use crate::alphabet::nuc::Nuc;
use crate::analyze::count_gaps::GapCounts;
use crate::coord::coord_map_global::CoordMapGlobal;
use crate::coord::coord_map_local::CoordMapLocal;
use crate::coord::position::PositionLike;
use crate::coord::range::{AaRefRange, NucRefGlobalRange, Range};
use crate::gene::cds::Cds;
use crate::gene::gene::Gene;
use crate::gene::gene_map::GeneMap;
use crate::translate::aa_alignment_ranges::calculate_aa_alignment_ranges_in_place;
use crate::translate::extract::extract_cds_from_aln;
use crate::translate::frame_shifts_detect::frame_shifts_detect;
use crate::translate::frame_shifts_translate::{frame_shifts_transform_coordinates, FrameShift};
use crate::translate::translate::translate;
use crate::types::outputs::PeptideWarning;
use crate::utils::collections::{first, last};
use crate::utils::error::report_to_string;
use crate::{make_error, make_internal_report};
use eyre::Report;
use indexmap::IndexMap;
use itertools::Itertools;
use num_traits::clamp_max;
use rayon::iter::Either;
use serde::{Deserialize, Serialize};

#[derive(Debug, Default, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct Translation {
  pub genes: IndexMap<String, GeneTranslation>,
}

impl Translation {
  pub fn get_gene<S: AsRef<str>>(&self, gene_name: S) -> Result<&GeneTranslation, Report> {
    let gene_name = gene_name.as_ref();
    self.genes.get(gene_name).ok_or_else(|| {
      make_internal_report!("When looking up a gene translation: gene '{gene_name}' is expected, but not found")
    })
  }

  pub fn get_cds<S: AsRef<str>>(&self, cds_name: S) -> Result<&CdsTranslation, Report> {
    let cds_name = cds_name.as_ref();
    self
      .genes
      .iter()
      .find_map(|(_, gene)| gene.cdses.get(cds_name))
      .ok_or_else(|| {
        make_internal_report!(
          "Translation::get_cds():  When looking up a CDS translation: CDS '{cds_name}' is expected, but not found"
        )
      })
  }

  #[must_use]
  pub fn is_empty(&self) -> bool {
    self.genes.is_empty()
  }

  #[must_use]
  pub fn len(&self) -> usize {
    self.genes.len()
  }

  #[must_use]
  pub fn contains(&self, gene_name: &str) -> bool {
    self.genes.contains_key(gene_name)
  }

  pub fn iter_genes(&self) -> impl Iterator<Item = (&String, &GeneTranslation)> + '_ {
    self.genes.iter()
  }

  pub fn iter_genes_mut(&mut self) -> impl Iterator<Item = (&String, &mut GeneTranslation)> + '_ {
    self.genes.iter_mut()
  }

  pub fn into_iter_genes(self) -> impl Iterator<Item = (String, GeneTranslation)> {
    self.genes.into_iter()
  }

  pub fn genes(&self) -> impl Iterator<Item = &GeneTranslation> + '_ {
    self.genes.values()
  }

  pub fn iter_cdses(&self) -> impl Iterator<Item = (&String, &CdsTranslation)> + '_ {
    self.genes.iter().flat_map(|(_, gene)| gene.cdses.iter())
  }

  pub fn iter_cdses_mut(&mut self) -> impl Iterator<Item = (&String, &mut CdsTranslation)> + '_ {
    self.genes.iter_mut().flat_map(|(_, gene)| gene.cdses.iter_mut())
  }

  pub fn into_iter_cdses(self) -> impl Iterator<Item = (String, CdsTranslation)> {
    self.genes.into_iter().flat_map(|(_, gene)| gene.cdses.into_iter())
  }

  pub fn cdses(&self) -> impl Iterator<Item = &CdsTranslation> + '_ {
    self.genes.iter().flat_map(|(_, gene)| gene.cdses.values())
  }
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct GeneTranslation {
  pub gene: Gene,
  pub cdses: IndexMap<String, CdsTranslation>,
  pub warnings: Vec<PeptideWarning>,
}

impl GeneTranslation {
  pub fn get_cds<S: AsRef<str>>(&self, cds_name: S) -> Result<&CdsTranslation, Report> {
    let cds_name = cds_name.as_ref();
    self.cdses.get(cds_name).ok_or_else(|| {
      make_internal_report!(
        "GeneTranslation::get_cds(): When looking up a CDS translation: CDS '{cds_name}' in gene '{}' is expected, but not found",
        self.gene.name
      )
    })
  }
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CdsTranslation {
  pub name: String,

  #[schemars(with = "String")]
  #[serde(serialize_with = "serde_serialize_seq")]
  #[serde(deserialize_with = "serde_deserialize_seq")]
  pub seq: Vec<Aa>,

  pub insertions: Vec<Insertion<Aa>>,
  pub frame_shifts: Vec<FrameShift>,
  pub alignment_ranges: Vec<AaRefRange>,
  pub unsequenced_ranges: Vec<AaRefRange>,
}

/// Results of the aminoacid alignment parameters estimation
pub struct PeptideAlignmentParams {
  band_width: usize,
  mean_shift: i32,
}

/// Deduces aminoacid alignment params from nucleotide alignment.
/// Gap counts from nucleotide alignment are used to estimate rough parameters. This is by contrast to nucleotide
/// alignment, where these parameters are estimated using seed matching.
pub const fn calculate_aa_alignment_params(qry_gaps: &GapCounts, ref_gaps: &GapCounts) -> PeptideAlignmentParams {
  const BASE_BAND_WIDTH: usize = 5; // An arbitrary magic number to give some additional room for alignment
  let band_width = (qry_gaps.internal + ref_gaps.internal) / 3 + BASE_BAND_WIDTH;
  let mean_shift =
    (qry_gaps.leading as i32 - ref_gaps.leading as i32) / 3 + (qry_gaps.internal as i32 - ref_gaps.internal as i32) / 6;
  PeptideAlignmentParams { band_width, mean_shift }
}

/// Replaces first and second gap in a not-all-gap triplet with `N`
pub fn protect_codon_in_place(triplet: &mut [Nuc]) {
  assert!(triplet.len() > 1);

  if triplet[0].is_gap() {
    triplet[0] = Nuc::N;

    if triplet[1].is_gap() {
      triplet[1] = Nuc::N;
    }
  }
}

/// Finds the first non-GAP nucleotide and replaces GAPs in the corresponding triplet with Ns,
/// so that it's not getting stripped during subsequent gap stripping. This is to ensure the first codon is complete
/// and no shift is introduced during subsequent gap-stripping
pub fn protect_first_codon_in_place(seq: &mut [Nuc]) {
  // TODO: this is a very C-like function. Try to replace the indexed loop with something more idiomatic
  let length = seq.len();
  let end = length - (length % 3);
  for i in 0..end {
    if !seq[i].is_gap() {
      let triplet_begin = i - (i % 3);
      let triplet = &mut seq[triplet_begin..triplet_begin + 3];
      protect_codon_in_place(triplet);
      break;
    }
  }
}

/// Masks frame shifts in the nucleotide sequence with `N`
pub fn mask_nuc_frame_shifts_in_place(seq: &mut [Nuc], frame_shifts: &[FrameShift]) {
  // TODO: this is a very C-like function. Try to replace the indexed loop with something more idiomatic
  for frame_shift in frame_shifts {
    let mut current = frame_shift.nuc_rel.begin;
    let end = frame_shift.nuc_rel.end;
    while current < end {
      if !seq[current.as_usize()].is_gap() {
        seq[current.as_usize()] = Nuc::N;
      }
      current = current + 1;
    }
  }
}

pub fn fill_range_inplace<P: PositionLike>(seq: &mut [Aa], range: &Range<P>, letter: Aa) {
  // TODO: this is a very C-like function. Try to replace the indexed loop with something more idiomatic
  let mut current = range.begin.as_usize();
  let end = clamp_max(range.end.as_usize(), seq.len());
  while current < end {
    seq[current] = letter;
    current += 1;
  }
}

/// Masks gaps in frame-shifted regions of the peptide.
/// The frame-shifted region is likely misaligned, so the gaps added during peptide alignment don't make sense
/// and we cover them with `X`.
pub fn mask_peptide_frame_shifts_in_place(seq: &mut [Aa], frame_shifts: &[FrameShift]) {
  for frame_shift in frame_shifts {
    fill_range_inplace(seq, &frame_shift.gaps_leading, Aa::Gap);
    fill_range_inplace(seq, &frame_shift.codon, Aa::X);
    fill_range_inplace(seq, &frame_shift.gaps_trailing, Aa::Gap);
  }
}

pub fn translate_cds(
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  cds: &Cds,
  ref_cds_translation: &CdsTranslation,
  gap_open_close_aa: &[i32],
  coord_map_global: &CoordMapGlobal,
  params: &AlignPairwiseParams,
) -> Result<CdsTranslation, Report> {
  let mut ref_cds_seq = extract_cds_from_aln(ref_seq, cds, coord_map_global);
  let mut qry_cds_seq = extract_cds_from_aln(qry_seq, cds, coord_map_global);

  // Coordinate map local to this CDS
  let coord_map_local = CoordMapLocal::new(&ref_cds_seq);

  let ref_gaps = GapCounts::new(&ref_cds_seq);
  let qry_gaps = GapCounts::new(&qry_cds_seq);

  if qry_cds_seq.is_empty() || qry_gaps.is_all_gaps() {
    return make_error!(
      "When processing gene \"{}\": The extracted gene sequence is empty or consists entirely from gaps",
      &cds.name
    );
  }

  // If start and end nucs of qry are gaps, don't penalize them in alignment
  // TODO: Think about qry insertions, they will also be free?
  let aa_params = AlignPairwiseParams {
    // Set to false for internal genes
    left_terminal_gaps_free: first(&qry_cds_seq)?.is_gap(),
    right_terminal_gaps_free: last(&qry_cds_seq)?.is_gap(),
    ..params.clone()
  };

  // Make sure subsequent gap stripping does not introduce frame shift
  protect_first_codon_in_place(&mut ref_cds_seq);
  protect_first_codon_in_place(&mut qry_cds_seq);

  // NOTE: frame shift detection should be performed on unstripped genes
  let nuc_rel_frame_shifts = frame_shifts_detect(&qry_cds_seq, &ref_cds_seq);
  let frame_shifts = frame_shifts_transform_coordinates(&nuc_rel_frame_shifts, &qry_cds_seq, &coord_map_local, cds)?;

  mask_nuc_frame_shifts_in_place(&mut qry_cds_seq, &frame_shifts);

  // Strip all GAP characters to "forget" gaps introduced during alignment
  remove_gaps_in_place(&mut qry_cds_seq);

  let query_peptide = translate(&qry_cds_seq, cds, params);

  // Instead of performing seed matching, like we do for nucleotide alignment, here we estimate parameters
  // by counting gaps in the aligned nucleotide sequences;
  let PeptideAlignmentParams { band_width, mean_shift } = calculate_aa_alignment_params(&qry_gaps, &ref_gaps);

  let alignment = align_aa(
    &query_peptide.seq,
    &ref_cds_translation.seq,
    gap_open_close_aa,
    &aa_params,
    band_width,
    mean_shift,
  );

  let mut stripped = insertions_strip(&alignment.qry_seq, &alignment.ref_seq);

  mask_peptide_frame_shifts_in_place(&mut stripped.qry_seq, &frame_shifts);

  Ok(CdsTranslation {
    name: cds.name.clone(),
    seq: stripped.qry_seq,
    insertions: stripped.insertions,
    frame_shifts,
    alignment_ranges: vec![],
    unsequenced_ranges: vec![],
  })
}

/// Translates all requested genes
///
/// NOTE: we handle translation errors as warnings, so we return a collection of `Results` as is, to handle elsewhere
pub fn translate_genes(
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  ref_peptides: &Translation,
  gene_map: &GeneMap,
  coord_map_global: &CoordMapGlobal,
  global_alignment_range: &NucRefGlobalRange,
  gap_open_close_aa: &[i32],
  params: &AlignPairwiseParams,
) -> Result<Translation, Report> {
  let genes: IndexMap<String, GeneTranslation> = gene_map
    .iter_genes()
    .map(|gene| {
      let ref_gene_translation = ref_peptides.get_gene(&gene.name)?;

      let (cdses, warnings): (IndexMap<String, CdsTranslation>, Vec<PeptideWarning>) =
        gene.cdses.iter().partition_map(|cds| {
          let ref_cds_translation = ref_gene_translation.get_cds(&cds.name).unwrap();

          // Treat translation errors as warnings
          match translate_cds(
            qry_seq,
            ref_seq,
            cds,
            ref_cds_translation,
            gap_open_close_aa,
            coord_map_global,
            params,
          ) {
            Ok(translation) => Either::Left((cds.name.clone(), translation)),
            Err(report) => Either::Right(PeptideWarning {
              cds_name: cds.name.clone(),
              warning: report_to_string(&report),
            }),
          }
        });

      Ok((
        gene.name.clone(),
        GeneTranslation {
          gene: gene.clone(),
          cdses,
          warnings,
        },
      ))
    })
    .collect::<Result<IndexMap<String, GeneTranslation>, Report>>()?;

  let mut translation = Translation { genes };

  // FIXME: Avoid another loop
  calculate_aa_alignment_ranges_in_place(global_alignment_range, &mut translation, gene_map)?;

  Ok(translation)
}
