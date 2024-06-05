use crate::alphabet::letter::Letter;
use crate::alphabet::nuc::Nuc;
use crate::analyze::aa_alignment::AaAlignment;
use crate::analyze::aa_change_with_context::AaChangeWithContext;
use crate::analyze::aa_changes_group::AaChangesGroup;
use crate::analyze::aa_del::AaDel;
use crate::analyze::aa_sub::{is_aa_mutated_or_deleted, is_codon_sequenced, AaSub};
use crate::analyze::nuc_del::NucDelRange;
use crate::analyze::nuc_sub::NucSub;
use crate::coord::coord_map_cds_to_global::cds_codon_pos_to_ref_range;
use crate::coord::position::PositionLike;
use crate::coord::range::{have_intersection, AaRefRange};
use crate::gene::cds::Cds;
use crate::translate::translate_genes::CdsTranslation;
use either::Either;
use itertools::Itertools;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct FindAaChangesOutput {
  pub aa_changes_groups: Vec<AaChangesGroup>,
  pub aa_substitutions: Vec<AaSub>,
  pub aa_deletions: Vec<AaDel>,
  pub nuc_to_aa_muts: BTreeMap<String, Vec<AaSub>>,
}

/// Finds aminoacid substitutions and deletions in query peptides relative to reference peptides, in one gene
///
/// ## Precondition
/// Nucleotide sequences and peptides are required to be stripped from insertions
///
///
/// ## Implementation details
/// We compare reference and query peptides (extracted by the preceding call to Nextalign),
/// one aminoacid at a time, and deduce changes. We then report the change and relevant nucleotide context surrounding
/// this change.
/// Previously we reported one-to-one mapping of aminoacid changes to corresponding nucleotide changes. However, it
/// was not always accurate, because if there are multiple nucleotide changes in a codon, the direct correspondence
/// might not always be established without knowing the order in which nucleotide changes have occurred. And in the
/// context of Nextclade we don't have this information.
pub fn aa_changes_find_for_cds(
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

  let tr = AaAlignment::new(cds, ref_tr, qry_tr);

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
            curr_group.push(AaChangeWithContext::new(cds, &tr.mut_at(codon - 1), qry_seq, ref_seq));
          }

          // The current codon itself
          curr_group.push(AaChangeWithContext::new(cds, &tr.mut_at(codon), qry_seq, ref_seq));
        }
        // Current group is not empty
        Some(prev) => {
          // If previous codon in the group is adjacent or almost adjacent (there is 1 item in between),
          // then append to the group.
          if codon <= prev.pos + 2 {
            // If previous codon in the group is not exactly adjacent, there is 1 item in between,
            // then cover the hole by inserting previous codon.
            if codon == prev.pos + 2 && is_codon_sequenced(aa_alignment_ranges, codon - 1) {
              curr_group.push(AaChangeWithContext::new(cds, &tr.mut_at(codon - 1), qry_seq, ref_seq));
            }

            // And insert the current codon
            curr_group.push(AaChangeWithContext::new(cds, &tr.mut_at(codon), qry_seq, ref_seq));
          }
          // If previous codon in the group is not adjacent, then terminate the current group and start a new group.
          else {
            // Add one codon to the right, for additional context, to finalize the current group
            if is_codon_sequenced(aa_alignment_ranges, prev.pos + 1) {
              curr_group.push(AaChangeWithContext::new(
                cds,
                &tr.mut_at(prev.pos + 1),
                qry_seq,
                ref_seq,
              ));
            }

            let mut new_group = AaChangesGroup::new(&cds.name);

            // Start a new group and push the current codon into it.
            if is_codon_sequenced(aa_alignment_ranges, codon - 1) {
              // Also prepend one codon to the left, for additional context, to start the new group.
              new_group.push(AaChangeWithContext::new(cds, &tr.mut_at(codon - 1), qry_seq, ref_seq));
            }

            // Push the current codon to the new group
            new_group.push(AaChangeWithContext::new(cds, &tr.mut_at(codon), qry_seq, ref_seq));

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
        &tr.mut_at(last.pos + 1),
        qry_seq,
        ref_seq,
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
