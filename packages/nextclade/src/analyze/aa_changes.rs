use crate::alphabet::aa::Aa;
use crate::alphabet::letter::Letter;
use crate::alphabet::letter::{serde_deserialize_seq, serde_serialize_seq};
use crate::alphabet::nuc::Nuc;
use crate::analyze::aa_del::AaDel;
use crate::analyze::aa_sub::AaSub;
use crate::analyze::nuc_del::NucDelRange;
use crate::analyze::nuc_sub::NucSub;
use crate::coord::coord_map_cds_to_global::cds_codon_pos_to_ref_range;
use crate::coord::position::{AaRefPosition, NucRefGlobalPosition, PositionLike};
use crate::coord::range::{have_intersection, AaRefRange, NucRefGlobalRange};
use crate::gene::cds::Cds;
use crate::gene::gene::GeneStrand;
use crate::gene::gene_map::GeneMap;
use crate::translate::complement::reverse_complement_in_place;
use crate::translate::translate_genes::{CdsTranslation, Translation};
use crate::utils::collections::extend_map_of_vecs;
use either::Either;
use eyre::Report;
use itertools::{Itertools, MinMaxResult};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AaChangeWithContext {
  pub cds_name: String,
  pub pos: AaRefPosition,
  pub ref_aa: Aa,
  pub qry_aa: Aa,
  pub nuc_pos: NucRefGlobalPosition,

  #[schemars(with = "String")]
  #[serde(serialize_with = "serde_serialize_seq")]
  #[serde(deserialize_with = "serde_deserialize_seq")]
  pub ref_triplet: Vec<Nuc>,

  #[schemars(with = "String")]
  #[serde(serialize_with = "serde_serialize_seq")]
  #[serde(deserialize_with = "serde_deserialize_seq")]
  pub qry_triplet: Vec<Nuc>,
  pub nuc_ranges: Vec<NucRefGlobalRange>,
}

impl AaChangeWithContext {
  pub fn new(
    cds: &Cds,
    pos: AaRefPosition,
    qry_seq: &[Nuc],
    ref_seq: &[Nuc],
    ref_tr: &CdsTranslation,
    qry_tr: &CdsTranslation,
  ) -> Self {
    let ref_aa = ref_tr.seq[pos.as_usize()];
    let qry_aa = qry_tr.seq[pos.as_usize()];
    let nuc_ranges = cds_codon_pos_to_ref_range(cds, pos);

    let ref_triplet = nuc_ranges
      .iter()
      .flat_map(|(range, strand)| {
        let mut nucs = ref_seq[range.to_std()].to_vec();
        if strand == &GeneStrand::Reverse {
          reverse_complement_in_place(&mut nucs);
        }
        nucs
      })
      .collect_vec();

    let qry_triplet = nuc_ranges
      .iter()
      .flat_map(|(range, strand)| {
        let mut nucs = qry_seq[range.clamp_range(0, qry_seq.len()).to_std()].to_vec();
        if strand == &GeneStrand::Reverse {
          reverse_complement_in_place(&mut nucs);
        }
        nucs
      })
      .collect_vec();

    let nuc_ranges = nuc_ranges.into_iter().map(|(range, _)| range).collect_vec();

    Self {
      cds_name: cds.name.clone(),
      pos,
      ref_aa,
      qry_aa,
      nuc_pos: nuc_ranges[0].begin,
      nuc_ranges,
      ref_triplet,
      qry_triplet,
    }
  }

  #[inline]
  pub fn is_mutated_or_deleted(&self) -> bool {
    is_aa_mutated_or_deleted(self.ref_aa, self.qry_aa)
  }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AaChangesGroup {
  name: String,
  range: AaRefRange,
  changes: Vec<AaChangeWithContext>,
  nuc_subs: Vec<NucSub>,
  nuc_dels: Vec<NucDelRange>,
}

impl AaChangesGroup {
  pub fn new(name: impl AsRef<str>) -> Self {
    Self::with_changes(name, vec![])
  }

  pub fn with_changes(name: impl AsRef<str>, changes: Vec<AaChangeWithContext>) -> Self {
    Self {
      name: name.as_ref().to_owned(),
      range: Self::find_codon_range(&changes),
      changes,
      nuc_subs: vec![],
      nuc_dels: vec![],
    }
  }

  pub fn push(&mut self, change: AaChangeWithContext) {
    self.changes.push(change);
    self.range = Self::find_codon_range(&self.changes);
  }

  pub fn last(&self) -> Option<&AaChangeWithContext> {
    self.changes.last()
  }

  fn find_codon_range(changes: &[AaChangeWithContext]) -> AaRefRange {
    match changes.iter().minmax_by_key(|change| change.pos) {
      MinMaxResult::NoElements => AaRefRange::from_isize(0, 0),
      MinMaxResult::OneElement(one) => AaRefRange::new(one.pos, one.pos + 1),
      MinMaxResult::MinMax(first, last) => AaRefRange::new(first.pos, last.pos + 1),
    }
  }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct FindAaChangesOutput {
  pub aa_changes_groups: Vec<AaChangesGroup>,
  pub aa_substitutions: Vec<AaSub>,
  pub aa_deletions: Vec<AaDel>,
  pub nuc_to_aa_muts: BTreeMap<String, Vec<AaSub>>,
}

/// Finds aminoacid substitutions and deletions in query peptides relative to reference peptides, in all genes
///
/// ## Precondition
/// Nucleotide sequences and peptides are required to be stripped from insertions
pub fn find_aa_changes(
  ref_seq: &[Nuc],
  qry_seq: &[Nuc],
  ref_translation: &Translation,
  qry_translation: &Translation,
  gene_map: &GeneMap,
  nuc_subs: &[NucSub],
  nuc_dels: &[NucDelRange],
) -> Result<FindAaChangesOutput, Report> {
  let mut changes = qry_translation
    .iter_cdses()
    .map(|(qry_name, qry_cds_tr)| {
      let ref_cds_tr = ref_translation.get_cds(qry_name)?;
      let cds = gene_map.get_cds(&qry_cds_tr.name)?;
      Ok(find_aa_changes_for_cds(
        cds, qry_seq, ref_seq, ref_cds_tr, qry_cds_tr, nuc_subs, nuc_dels,
      ))
    })
    .collect::<Result<Vec<FindAaChangesOutput>, Report>>()?
    .into_iter()
      // Merge changes from all CDSes into one struct
    .fold(FindAaChangesOutput::default(), |mut output, changes| {
      output.aa_changes_groups.extend(changes.aa_changes_groups);
      output.aa_substitutions.extend(changes.aa_substitutions);
      output.aa_deletions.extend(changes.aa_deletions);
      extend_map_of_vecs(&mut output.nuc_to_aa_muts, changes.nuc_to_aa_muts);
      output
    });

  changes.aa_substitutions.sort();
  changes.aa_deletions.sort();
  changes.nuc_to_aa_muts.iter_mut().for_each(|(_, vals)| {
    vals.sort();
    vals.dedup();
  });

  Ok(changes)
}

/// Finds aminoacid substitutions and deletions in query peptides relative to reference peptides, in one gene
///
/// ## Precondition
/// Nucleotide sequences and peptides are required to be stripped from insertions
///
///
/// ## Implementation details
/// We compare reference and query peptides (extracted by the preceding call to Nextalign),
/// one aminoacid at at time, and deduce changes. We then report the change and relevant nucleotide context surrounding
/// this change.
/// Previously we reported one-to-one mapping of aminoacid changes to corresponding nucleotide changes. However, it
/// was not always accurate, because if there are multiple nucleotide changes in a codon, the direct correspondence
/// might not always be established without knowing the order in which nucleotide changes have occurred. And in the
/// context of Nextclade we don't have this information.
fn find_aa_changes_for_cds(
  cds: &Cds,
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  ref_tr: &CdsTranslation,
  qry_tr: &CdsTranslation,
  nuc_subs: &[NucSub],
  nuc_dels: &[NucDelRange],
) -> FindAaChangesOutput {
  assert_eq!(ref_tr.seq.len(), qry_tr.seq.len());
  assert_eq!(qry_seq.len(), ref_seq.len());

  let aa_alignment_ranges = &qry_tr.alignment_ranges;
  let mut aa_changes_groups = vec![AaChangesGroup::new(&cds.name)];
  let mut curr_group = aa_changes_groups.last_mut().unwrap();
  for codon in AaRefRange::from_usize(0, qry_tr.seq.len()).iter() {
    if !is_codon_sequenced(aa_alignment_ranges, codon) {
      continue;
    }

    let ref_aa = ref_tr.seq[codon.as_usize()];
    let qry_aa = qry_tr.seq[codon.as_usize()];
    if is_aa_mutated_or_deleted(ref_aa, qry_aa) {
      match curr_group.last() {
        // If current group is empty, then we are about to insert the first codon into the first group.
        None => {
          if codon > 0 && is_codon_sequenced(aa_alignment_ranges, codon - 1) {
            // Also prepend one codon to the left, for additional context, to start the group
            curr_group.push(AaChangeWithContext::new(
              cds,
              codon - 1,
              qry_seq,
              ref_seq,
              ref_tr,
              qry_tr,
            ));
          }

          // The current codon itself
          curr_group.push(AaChangeWithContext::new(cds, codon, qry_seq, ref_seq, ref_tr, qry_tr));
        }
        // Current group is not empty
        Some(prev) => {
          // If previous codon in the group is adjacent or almost adjacent (there is 1 item in between),
          // then append to the group.
          if codon <= prev.pos + 2 {
            // If previous codon in the group is not exactly adjacent, there is 1 item in between,
            // then cover the hole by inserting previous codon.
            if codon == prev.pos + 2 && is_codon_sequenced(aa_alignment_ranges, codon - 1) {
              curr_group.push(AaChangeWithContext::new(
                cds,
                codon - 1,
                qry_seq,
                ref_seq,
                ref_tr,
                qry_tr,
              ));
            }

            // And insert the current codon
            curr_group.push(AaChangeWithContext::new(cds, codon, qry_seq, ref_seq, ref_tr, qry_tr));
          }
          // If previous codon in the group is not adjacent, then terminate the current group and start a new group.
          else {
            // Add one codon to the right, for additional context, to finalize the current group
            if is_codon_sequenced(aa_alignment_ranges, prev.pos + 1) {
              curr_group.push(AaChangeWithContext::new(
                cds,
                prev.pos + 1,
                qry_seq,
                ref_seq,
                ref_tr,
                qry_tr,
              ));
            }

            let mut new_group = AaChangesGroup::new(&cds.name);

            // Start a new group and push the current codon into it.
            if is_codon_sequenced(aa_alignment_ranges, codon - 1) {
              // Also prepend one codon to the left, for additional context, to start the new group.
              new_group.push(AaChangeWithContext::new(
                cds,
                codon - 1,
                qry_seq,
                ref_seq,
                ref_tr,
                qry_tr,
              ));
            }

            // Push the current codon to the new group
            new_group.push(AaChangeWithContext::new(cds, codon, qry_seq, ref_seq, ref_tr, qry_tr));

            aa_changes_groups.push(new_group);

            curr_group = aa_changes_groups.last_mut().unwrap();
          }
        }
      }
    }
  }

  // Add one codon to the right, for additional context, to finalize the last group
  if let Some(last) = curr_group.last() {
    if is_codon_sequenced(aa_alignment_ranges, last.pos + 1) {
      curr_group.push(AaChangeWithContext::new(
        cds,
        last.pos + 1,
        qry_seq,
        ref_seq,
        ref_tr,
        qry_tr,
      ));
    }
  }

  // Keep only non-empty groups
  aa_changes_groups.retain(|group| !group.range.is_empty() && !group.changes.is_empty());

  aa_changes_groups.iter_mut().for_each(|group| {
    let ranges = group
      .range
      .iter()
      .flat_map(|codon| {
        cds_codon_pos_to_ref_range(cds, codon)
          .into_iter()
          .map(|(range, _)| range)
      })
      .collect_vec();

    group.nuc_subs = nuc_subs
      .iter()
      .filter(|nuc_sub| ranges.iter().any(|range| range.contains(nuc_sub.pos)))
      .cloned()
      .collect_vec();

    group.nuc_dels = nuc_dels
      .iter()
      .filter(|nuc_del| ranges.iter().any(|range| have_intersection(range, nuc_del.range())))
      .cloned()
      .collect_vec();
  });

  let (aa_substitutions, aa_deletions): (Vec<AaSub>, Vec<AaDel>) = aa_changes_groups
    .iter()
    .flat_map(|aa_changes_group| &aa_changes_group.changes)
    .filter(|change| is_aa_mutated_or_deleted(change.ref_aa, change.qry_aa))
    .partition_map(|change| {
      if change.qry_aa.is_gap() {
        Either::Right(AaDel {
          cds_name: cds.name.clone(),
          ref_aa: change.ref_aa,
          pos: change.pos,
        })
      } else {
        Either::Left(AaSub {
          cds_name: cds.name.clone(),
          ref_aa: change.ref_aa,
          pos: change.pos,
          qry_aa: change.qry_aa,
        })
      }
    });

  // Associate nuc positions with aa mutations.
  let nuc_to_aa_muts: BTreeMap<String, Vec<AaSub>> = aa_changes_groups
    .iter()
    .flat_map(|group| {
      group
        .changes
        .iter()
        .filter(|change| AaChangeWithContext::is_mutated_or_deleted(change))
        .flat_map(|change| {
          change.nuc_ranges.iter().flat_map(move |range| {
            range.iter()
             // TODO: We convert position to string here, because when communicating with WASM we will pass through
             //   JSON schema, and JSON object keys must be strings. Maybe there is a way to keep the keys as numbers?
            .map(move |pos| (pos.to_string(), AaSub::from(change)))
          })
        })
    })
    .into_group_map()
    .into_iter()
    .map(|(pos, mut aa_muts)| {
      aa_muts.sort();
      aa_muts.dedup();
      (pos, aa_muts)
    })
    .collect();

  FindAaChangesOutput {
    aa_changes_groups,
    aa_substitutions,
    aa_deletions,
    nuc_to_aa_muts,
  }
}

/// Check whether a given pair if reference and query aminoacids constitute a mutation or deletion
#[inline]
fn is_aa_mutated_or_deleted(ref_aa: Aa, qry_aa: Aa) -> bool {
  // NOTE: We chose to ignore mutations to `X`.
  qry_aa != ref_aa && qry_aa != Aa::X
}

/// Check whether a given codon position corresponds to a sequenced aminoacid
fn is_codon_sequenced(aa_alignment_ranges: &[AaRefRange], codon: AaRefPosition) -> bool {
  aa_alignment_ranges
    .iter()
    .any(|aa_alignment_range| aa_alignment_range.contains(codon))
}
