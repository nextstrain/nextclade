use std::collections::HashMap;
use crate::analyze::is_sequenced::is_nuc_sequenced;
use crate::analyze::letter_ranges::NucRange;
use crate::analyze::nuc_sub::NucSub;
use crate::io::fasta::{FastaRecord, FastaReader};
use crate::tree::tree::{AuspiceTree, AuspiceTreeNode};
use crate::utils::range::Range;
use crate::align::insertions_strip::{get_aa_insertions, NucIns};
use crate::align::params::AlignPairwiseParams;
use crate::analyze::aa_changes::{find_aa_changes, FindAaChangesOutput};
use crate::analyze::aa_changes_group::group_adjacent_aa_subs_and_dels;
use crate::analyze::divergence::calculate_divergence;
use crate::analyze::find_private_aa_mutations::find_private_aa_mutations;
use crate::analyze::find_private_nuc_mutations::find_private_nuc_mutations;
use crate::analyze::letter_composition::get_letter_composition;
use crate::analyze::letter_ranges::{find_aa_letter_ranges, find_letter_ranges, find_letter_ranges_by};
use crate::analyze::link_nuc_and_aa_changes::{link_nuc_and_aa_changes, LinkedNucAndAaChanges};
use crate::analyze::nuc_changes::{find_nuc_changes, FindNucChangesOutput};
use crate::analyze::pcr_primer_changes::get_pcr_primer_changes;
use crate::analyze::pcr_primers::PcrPrimer;
use crate::analyze::phenotype::calculate_phenotype;
use crate::analyze::virus_properties::{PhenotypeData, VirusProperties};
use crate::io::aa::Aa;
use crate::io::gene_map::GeneMap;
use crate::io::letter::Letter;
use crate::io::nuc::Nuc;
use crate::io::nuc::{to_nuc_seq, to_nuc_seq_replacing};
use crate::qc::qc_config::QcConfig;
use crate::qc::qc_run::qc_run;
use crate::run::nextalign_run_one::nextalign_run_one;
use crate::translate::frame_shifts_flatten::frame_shifts_flatten;
use crate::translate::translate_genes::{Translation, TranslationMap};
use crate::tree::tree_find_nearest_node::{tree_find_nearest_node, TreeFindNearestNodeOutput};
use crate::types::outputs::{NextalignOutputs, NextcladeOutputs, PhenotypeValue};
use eyre::Report;
use itertools::Itertools;
use nalgebra::DMatrix;

/// Calculates distance metric between two query samples
pub fn calculate_distance(
  qry_nuc_subs_1: &[NucSub],
  qry_missing_1: &[NucRange],
  qry_nuc_subs_2: &[NucSub],
  qry_missing_2: &[NucRange],
  aln_range: &Range,
) -> i64 {
  let mut shared_differences = 0_i64;
  let mut shared_sites = 0_i64;

  let mut i = 0;
  let mut j = 0;
  while (i < qry_nuc_subs_1.len()) && (j < qry_nuc_subs_2.len()) {
    let qmut1 = &qry_nuc_subs_1[i];
    let qmut2 = &qry_nuc_subs_2[j];
    if &qmut1.pos > &qmut2.pos {
      j += 1;
      continue;
    } else if &qmut1.pos < &qmut2.pos {
      i += 1;
      continue;
    }
    // position is also mutated in node
    if qmut1.qry == qmut2.qry {
      shared_differences += 1; // the exact mutation is shared the two sequences
    } else {
      shared_sites += 1; // the same position is mutated, but the states are different
    }
    i += 1;
    j += 1;
  }

  // determine the number of sites that are mutated in one seq but missing in the other.
  // for these we can't tell whether the sequences agree
  let mut undetermined_sites = 0_i64;
  for qmut1 in qry_nuc_subs_1 {
    if !is_nuc_sequenced(qmut1.pos, qry_missing_2, aln_range) {
      undetermined_sites += 1;
    }
  }
  for qmut2 in qry_nuc_subs_2 {
    if !is_nuc_sequenced(qmut2.pos, qry_missing_1, aln_range) {
      undetermined_sites += 1;
    }
  }

  let total_muts_1 = qry_nuc_subs_1.len() as i64;
  let total_muts_2 = qry_nuc_subs_2.len() as i64;

  // calculate distance from set overlaps.
  total_muts_1 + total_muts_2 - 2 * shared_differences - shared_sites - undetermined_sites
}

// pub fn calculate_distance_matrix(
//   fasta : &FastaRecord, 
//   ref_seq: &[Nuc],
//   ref_peptides: &TranslationMap,
//   gene_map: &GeneMap,
//   primers: &[PcrPrimer],
//   tree: &AuspiceTree,
//   qc_config: &QcConfig,
//   virus_properties: &VirusProperties,
//   gap_open_close_nuc: &[i32],
//   gap_open_close_aa: &[i32],
//   params: &AlignPairwiseParams,
// ) -> Result<DMatrix<i64>, Report> {

//   let mut record_values = HashMap::new();
//   let mut reader = FastaReader::from_paths(fasta).unwrap();
//   let mut k = 0;
//   loop {
//     let mut record = FastaRecord::default();
//     reader.read(&mut record).unwrap();
//     if record.is_empty() {
//       break;
//     }
//     let qry_seq = to_nuc_seq(&record.seq).expect("tree builder: failed");
//     let nao = nextalign_run_one(
//       record.index,
//       &record.seq_name,
//       &qry_seq,
//       ref_seq,
//       ref_peptides,
//       gene_map,
//       gap_open_close_nuc,
//       gap_open_close_aa,
//       params,
//     ).expect("tree builder: alignment failed");

//     let nuc_changes = find_nuc_changes(&nao.stripped.qry_seq, &nao.stripped.ref_seq);
    
//     let missing = find_letter_ranges(&nao.stripped.qry_seq, Nuc::N);
//     record_values.insert(k, (nuc_changes.substitutions, missing, nuc_changes.alignment_range));
//     k += 1;
//   }
//   let mut distance_matrix = DMatrix::zeros(record_values.keys().len(), record_values.keys().len());
//   for i in 0..record_values.keys().len() {
//     for j in 0..record_values.keys().len() {
//       if i == j {
//         distance_matrix[(i, j)] = 0;
//         continue;
//       }
//       if i >j{
//         continue;
//       }

//       let dist = calculate_distance(&record_values[i][0], &record_values[i][1],&record_values[j][0],
//         &record_values[j][1], &record_values[j][2]);

//       distance_matrix[(i, j)] = dist;
//       distance_matrix[(j, i)] = dist;
//     }
//   }
//   Ok(distance_matrix)
// }

pub fn tree_builder_run_one(
  index: usize,
  seq_name1: &str,
  seq_name2: &str,
  qry_seq1: &[Nuc],
  qry_seq2: &[Nuc],
  ref_seq: &[Nuc],
  ref_peptides: &TranslationMap,
  gene_map: &GeneMap,
  primers: &[PcrPrimer],
  tree: &AuspiceTree,
  qc_config: &QcConfig,
  virus_properties: &VirusProperties,
  gap_open_close_nuc: &[i32],
  gap_open_close_aa: &[i32],
  params: &AlignPairwiseParams,
) -> i64 {
  let nao1 = nextalign_run_one(
    index,
    seq_name1,
    qry_seq1,
    ref_seq,
    ref_peptides,
    gene_map,
    gap_open_close_nuc,
    gap_open_close_aa,
    params,
  ).expect("tree builder: alignment failed");
  let nao2 = nextalign_run_one(
    index,
    seq_name2,
    qry_seq2,
    ref_seq,
    ref_peptides,
    gene_map,
    gap_open_close_nuc,
    gap_open_close_aa,
    params,
  ).expect("tree builder: alignment failed");

  let nuc_changes1 = find_nuc_changes(&nao1.stripped.qry_seq, &nao1.stripped.ref_seq);
  let nuc_changes2 = find_nuc_changes(&nao2.stripped.qry_seq, &nao2.stripped.ref_seq);

  let missing1 = find_letter_ranges(&nao1.stripped.qry_seq, Nuc::N);
  let missing2 = find_letter_ranges(&nao2.stripped.qry_seq, Nuc::N);

  let dist = calculate_distance(&nuc_changes1.substitutions, &missing1,&nuc_changes2.substitutions,
    &missing2, &nuc_changes1.alignment_range);
  
  dist
}

