use crate::alphabet::aa::Aa;
use crate::alphabet::letter::Letter;
use crate::analyze::aa_alignment::{AaAlignment, AaAlignmentAbstract};
use crate::analyze::aa_change_with_context::AaChangeWithContext;
use crate::analyze::aa_changes_group::AaChangesGroup;
use crate::analyze::aa_del::AaDel;
use crate::analyze::aa_sub::AaSub;
use crate::analyze::abstract_mutation::AbstractMutation;
use crate::analyze::group_adjacent_deletions::group_adjacent_nuc_dels;
use crate::analyze::nuc_alignment::{NucAlignment, NucAlignmentAbstract};
use crate::analyze::nuc_del::NucDel;
use crate::analyze::nuc_sub::NucSub;
use crate::coord::coord_map_cds_to_global::cds_codon_pos_to_ref_range;
use crate::coord::position::{AaRefPosition, Position, PositionLike};
use crate::coord::range::AaRefRange;
use clap::Parser;
use either::Either;
use itertools::Itertools;
use optfield::optfield;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::Value;
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
pub fn aa_changes_find_for_cds(aln: &NucAlignment, tr: &AaAlignment, params: &AaChangesParams) -> FindAaChangesOutput {
  let aa_changes = AaRefRange::from_usize(0, tr.len())
    .iter()
    .filter_map(|codon| tr.mut_at(codon))
    .collect_vec();

  aa_changes_group(&aa_changes, aln, tr, params)
}

pub fn aa_changes_group<'a, M: AbstractMutation<AaRefPosition, Aa> + 'a + ?Sized>(
  aa_muts: impl IntoIterator<Item = &'a M>,
  aln: &impl NucAlignmentAbstract,
  node_tr: &impl AaAlignmentAbstract,
  params: &AaChangesParams,
) -> FindAaChangesOutput {
  let cds = node_tr.cds();
  let mut aa_changes_groups = vec![AaChangesGroup::new(&cds.name)];
  let mut curr_group = aa_changes_groups.last_mut().unwrap();

  for aa_mut in aa_muts {
    let codon = aa_mut.pos();

    if aa_mut.is_mutated_and_not_unknown() {
      let prev_pos = curr_group.last().map(|prev| prev.pos);
      match prev_pos {
        // If current group is empty, then we are about to insert the first codon into the first group.
        None => {
          for offset in (1..=params.aa_group_padding).rev() {
            let offset = Position::from(offset);
            if codon >= offset && node_tr.is_sequenced(codon - offset) {
              curr_group.push(AaChangeWithContext::new(cds, &node_tr.pair_at(codon - offset), aln));
            }
          }

          // The current codon itself
          curr_group.push(AaChangeWithContext::new(cds, &node_tr.pair_at(codon), aln));
        }
        // Current group is not empty
        Some(prev_pos) => {
          // If previous codon in the group is adjacent or almost adjacent (there is up to config.spacing-1 items in between),
          // then append to the group.
          if codon <= prev_pos + Position::from(params.aa_group_spacing) {
            for pos in (prev_pos.as_usize() + 1)..codon.as_usize() {
              let pos = pos.into();
              if node_tr.is_sequenced(pos) {
                curr_group.push(AaChangeWithContext::new(cds, &node_tr.pair_at(pos), aln));
              }
            }

            // And insert the current codon
            curr_group.push(AaChangeWithContext::new(cds, &node_tr.pair_at(codon), aln));
          }
          // If previous codon in the group is not adjacent, then terminate the current group and start a new group.
          else {
            // Add config.padding codons to the right, for additional context, to finalize the current group
            for offset in 1..=params.aa_group_padding {
              let offset = Position::from(offset);
              if node_tr.is_sequenced(prev_pos + offset) {
                curr_group.push(AaChangeWithContext::new(cds, &node_tr.pair_at(prev_pos + offset), aln));
              }
            }

            let mut new_group = AaChangesGroup::new(&cds.name);

            // Start a new group and push the current codon into it with left padding.
            for offset in (1..=params.aa_group_padding).rev() {
              let offset = Position::from(offset);
              if codon >= offset && node_tr.is_sequenced(codon - offset) {
                new_group.push(AaChangeWithContext::new(cds, &node_tr.pair_at(codon - offset), aln));
              }
            }

            // Push the current codon to the new group
            new_group.push(AaChangeWithContext::new(cds, &node_tr.pair_at(codon), aln));

            aa_changes_groups.push(new_group);

            curr_group = aa_changes_groups.last_mut().unwrap();
          }
        }
      }
    }
  }

  // Add config.padding codons to the right, for additional context, to finalize the last group
  if let Some(last) = curr_group.last().cloned() {
    for offset in 1..=params.aa_group_padding {
      let offset = Position::from(offset);
      if node_tr.is_sequenced(last.pos + offset) {
        curr_group.push(AaChangeWithContext::new(cds, &node_tr.pair_at(last.pos + offset), aln));
      }
    }
  }

  // Keep only non-empty groups
  aa_changes_groups.retain(|group| !group.range.is_empty() && !group.changes.is_empty());

  aa_changes_groups.iter_mut().for_each(|group| {
    // Find out nuc ranges to which the group's aa range corresponds
    let nuc_ranges = group
      .range
      .iter()
      .flat_map(|codon| {
        cds_codon_pos_to_ref_range(cds, codon)
          .into_iter()
          .map(|(range, _)| range)
      })
      .collect_vec();

    // Find nuc muts in these ranges.
    let nuc_muts = nuc_ranges
      .iter()
      .filter_map(|range| {
        let muts = range.iter().filter_map(|pos| aln.mut_at(pos)).collect_vec();
        (!muts.is_empty()).then_some(muts)
      })
      .flatten()
      .collect_vec();

    // Split substitutions and deletions apart
    let (nuc_subs, nuc_dels): (Vec<NucSub>, Vec<NucDel>) = nuc_muts.into_iter().partition_map(|m| {
      if m.is_del() {
        Either::Right(NucDel::from(&m))
      } else {
        Either::Left(m)
      }
    });

    let nuc_del_ranges = group_adjacent_nuc_dels(&nuc_dels);

    group.nuc_subs = nuc_subs;
    group.nuc_dels = nuc_dels;
    group.nuc_del_ranges = nuc_del_ranges;
  });

  let (aa_substitutions, aa_deletions): (Vec<AaSub>, Vec<AaDel>) = aa_changes_groups
    .iter()
    .flat_map(|aa_changes_group| &aa_changes_group.changes)
    .filter(|change| change.is_mutated_and_not_unknown())
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
        .filter(|change| change.is_mutated_and_not_unknown())
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

#[optfield(pub AaChangesParamsOptional, attrs, doc, field_attrs, field_doc, merge_fn = pub)]
#[derive(Parser, Clone, Debug, Eq, PartialEq, Serialize, Deserialize, JsonSchema)]
pub struct AaChangesParams {
  #[clap(long, hide = true)]
  pub aa_group_spacing: usize,

  #[clap(long, hide = true)]
  pub aa_group_padding: usize,

  #[clap(long, hide = true)]
  #[serde(flatten)]
  pub other: Value,
}

impl Default for AaChangesParams {
  fn default() -> Self {
    Self {
      aa_group_spacing: 3,
      aa_group_padding: 2,
      other: Value::default(),
    }
  }
}
