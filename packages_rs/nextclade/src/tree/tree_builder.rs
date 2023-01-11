use crate::align::insertions_strip::{get_aa_insertions, NucIns};
use crate::align::params::AlignPairwiseParams;
use crate::analyze::aa_changes::{find_aa_changes, FindAaChangesOutput};
use crate::analyze::aa_changes_group::group_adjacent_aa_subs_and_dels;
use crate::analyze::aa_sub_full::{AaDelFull, AaSubFull};
use crate::analyze::divergence::calculate_divergence;
use crate::analyze::find_private_aa_mutations::find_private_aa_mutations;
use crate::analyze::find_private_nuc_mutations::find_private_nuc_mutations;
use crate::analyze::is_sequenced::is_nuc_sequenced;
use crate::analyze::letter_composition::get_letter_composition;
use crate::analyze::letter_ranges::{find_aa_letter_ranges, find_letter_ranges, find_letter_ranges_by, LetterRange};
use crate::analyze::letter_ranges::{AaRange, GeneAaRange, NucRange};
use crate::analyze::link_nuc_and_aa_changes::{link_nuc_and_aa_changes, LinkedNucAndAaChanges};
use crate::analyze::nuc_changes::{find_nuc_changes, FindNucChangesOutput};
use crate::analyze::nuc_del::{NucDel, NucDelMinimal};
use crate::analyze::nuc_sub::NucSub;
use crate::analyze::nuc_sub_full::{NucDelFull, NucSubFull};
use crate::analyze::pcr_primer_changes::get_pcr_primer_changes;
use crate::analyze::pcr_primers::PcrPrimer;
use crate::analyze::phenotype::calculate_phenotype;
use crate::analyze::virus_properties::{PhenotypeData, VirusProperties};
use crate::gene::gene::Gene;
use crate::io::aa::Aa;
use crate::io::fasta::{FastaReader, FastaRecord};
use crate::io::gene_map::GeneMap;
use crate::io::letter::Letter;
use crate::io::nuc::Nuc;
use crate::io::nuc::{from_nuc_seq, to_nuc_seq, to_nuc_seq_replacing};
use crate::qc::qc_config::QcConfig;
use crate::qc::qc_run::qc_run;
use crate::run::nextalign_run_one::nextalign_run_one;
use crate::translate::frame_shifts_flatten::frame_shifts_flatten;
use crate::translate::translate::decode;
use crate::translate::translate_genes::{Translation, TranslationMap};
use crate::tree::tree::{AuspiceTree, AuspiceTreeNode};
use crate::tree::tree_find_nearest_node::{tree_find_nearest_node, TreeFindNearestNodeOutput};
use crate::types::outputs::{NextalignOutputs, NextcladeOutputs, PhenotypeValue};
use crate::utils::range::Range;
use assert2::__assert2_impl::print;
use eyre::Report;
use itertools::Itertools;
use nalgebra::{DMatrix, DVector};
use serde::__private::de;
use std::collections::HashMap;
//use ndarray::prelude::*;
use crate::tree::tree_find_nearest_node::tree_calculate_node_distance;
use core::cmp::{max, min};
use std::cmp;
use std::collections::HashSet;
use std::hash::Hash;
use std::{
  sync::atomic::{AtomicUsize, Ordering},
  thread,
};

static OBJECT_COUNTER: AtomicUsize = AtomicUsize::new(0);

/// Calculates distance metric between two query samples -> should be sorted
pub fn calculate_distance_results(
  subst1: &Vec<NucSub>,
  subst2: &Vec<NucSub>,
  del1: &[NucDelMinimal],
  del2: &[NucDelMinimal],
  missings1: &[LetterRange<Nuc>],
  missings2: &[LetterRange<Nuc>],
  aln_range1: &Range,
  aln_range2: &Range,
) -> f64 {
  let total_mut_1 = subst1.len() as i64;
  let total_mut_2 = subst2.len() as i64;
  let mut shared_differences = 0_i64;
  let mut shared_sites = 0_i64;

  let mut i = 0;
  let mut j = 0;
  while (i < subst1.len()) && (j < subst2.len()) {
    if subst1[i].pos == subst2[j].pos {
      // position is also mutated in node
      if subst1[i].qry == subst2[j].qry {
        shared_differences += 1; // the exact mutation is shared between node and seq
      } else {
        shared_sites += 1; // the same position is mutated, but the states are different
      }
      i += 1;
      j += 1;
    } else if subst1[i].pos < subst2[j].pos {
      i += 1;
    } else if subst1[i].pos > subst2[j].pos {
      j += 1;
    }
  }
  // determine the number of sites that are mutated in the node but missing in seq.
  // for these we can't tell whether the node agrees with seq
  let mut undetermined_sites = 0_i64;
  for sub1 in subst1 {
    if !is_nuc_sequenced(sub1.pos, missings2, aln_range2) {
      undetermined_sites += 1;
    }
  }
  for sub2 in subst2 {
    if !is_nuc_sequenced(sub2.pos, missings1, aln_range1) {
      undetermined_sites += 1;
    }
  }

  (total_mut_1 + total_mut_2 - 2 * shared_differences - shared_sites - undetermined_sites) as f64
}

pub fn calculate_distance_matrix(
  node: &mut AuspiceTreeNode,
  results: &[NextcladeOutputs],
  positions: &Vec<usize>,
) -> (DMatrix<f64>, Vec<NodeType>) {
  // compute element order vector
  let new_internal = TreeNode::new(node.tmp.id);
  let mut element_order = vec![NodeType::TreeNode(new_internal)];
  for v in positions {
    let new_internal = NewSeqNode::new(*v);
    element_order.push(NodeType::NewSeqNode(new_internal));
  }
  let size = positions.len();
  // TODO: add ancestor and children to the distance matrix
  // let mut size = positions.len() + node.children.len() +1;
  // if node.name != parent_node.name{
  //   size += 1;
  // }
  let mut distance_matrix = DMatrix::zeros(size + 1, size + 1);
  for i in 0..size {
    let v1 = positions[i];
    let results1 = &results[v1];
    let arr = results1
      .substitutions
      .iter()
      .map(|x| x.sub.clone())
      .collect::<Vec<NucSub>>();
    let dist_to_node = tree_calculate_node_distance(
      node,
      &arr,
      &results1.missing,
      &Range::new(results1.alignment_start, results1.alignment_end),
    ) as f64;
    distance_matrix[(i + 1, 0)] = dist_to_node;
    distance_matrix[(0, i + 1)] = dist_to_node;
    let subst1 = &results1.private_nuc_mutations.private_substitutions;
    let del1 = &results1.private_nuc_mutations.private_deletions;
    let missings1 = &results1.missing;
    let aln_range1 = &Range {
      begin: results1.alignment_start,
      end: results1.alignment_end,
    };
    for j in 0..size {
      if i >= j {
        continue;
      }
      {
        let v2 = positions[j];
        let results2 = &results[v2];
        let subst2 = &results2.private_nuc_mutations.private_substitutions;
        let del2 = &results2.private_nuc_mutations.private_deletions;
        let missings2 = &results2.missing;
        let aln_range2 = &Range {
          begin: results2.alignment_start,
          end: results2.alignment_end,
        };
        let dist = calculate_distance_results(subst1, subst2, del1, del2, missings1, missings2, aln_range1, aln_range2);
        distance_matrix[(i + 1, j + 1)] = dist;
        distance_matrix[(j + 1, i + 1)] = dist;
      }
    }
  }
  (distance_matrix, element_order)
}

pub fn calculate_q(distance_matrix: &DMatrix<f64>) -> DMatrix<f64> {
  let n = distance_matrix.nrows();
  let scalar = (n - 2) as f64;
  let factor: f64 = 1.0;
  let col_sum_matrix = distance_matrix.row_sum_tr() * DMatrix::from_element(1, n, 1.0);
  let row_sum_matrix = col_sum_matrix.transpose();

  scalar * distance_matrix - factor * row_sum_matrix - factor * col_sum_matrix
}

#[macro_export]
macro_rules! extract_enum_value {
  ($value:expr, $pattern:pat => $extracted_value:expr) => {
    match $value {
      $pattern => $extracted_value,
      _ => panic!("Pattern doesn't match!"),
    }
  };
}

#[derive(Clone, Debug, Hash, Eq, PartialEq, Copy)]
pub struct NewInternalNode(pub usize, pub usize);

impl NewInternalNode {
  pub fn new() -> Self {
    NewInternalNode(OBJECT_COUNTER.fetch_add(1, Ordering::SeqCst), 1)
  }
}

#[derive(Clone, Debug, Hash, Eq, PartialEq, Copy)]
pub struct NewSeqNode(pub usize, pub usize);

impl NewSeqNode {
  pub const fn new(pos: usize) -> Self {
    NewSeqNode(pos, 2)
  }
}

#[derive(Clone, Debug, Hash, Eq, PartialEq, Copy)]
pub struct TreeNode(pub usize, pub usize);

impl TreeNode {
  pub const fn new(pos: usize) -> Self {
    TreeNode(pos, 0)
  }
}

#[derive(Clone, Debug)]
pub struct InternalMutations {
  pub substitutions: Vec<NucSub>,
  pub deletions: Vec<NucDel>,
  pub missing: Vec<NucRange>,
  pub aa_substitutions: Vec<AaSubFull>,
  pub aa_deletions: Vec<AaDelFull>,
  pub unknown_aa_ranges: Vec<GeneAaRange>,
  pub alignment_start: usize,
  pub alignment_end: usize,
}

#[derive(Clone, Eq, Hash, PartialEq, Copy)]
pub enum NodeType {
  TreeNode(TreeNode),
  NewSeqNode(NewSeqNode),
  NewInternalNode(NewInternalNode),
}

pub struct Graph<VId, E = ()> {
  pub adjacency: HashMap<VId, Vec<(VId, E)>>,
}

impl<VId, E> Graph<VId, E>
where
  VId: Eq + Hash,
{
  pub fn new() -> Graph<VId, E> {
    Graph {
      adjacency: HashMap::new(),
    }
  }
  pub fn push_edge(self: &mut Graph<VId, E>, from: VId, to: VId, edge: E) {
    let adjacent_to_from = self.adjacency.entry(from).or_default();
    adjacent_to_from.push((to, edge));
  }
}

pub fn argmin(q: &DMatrix<f64>) -> (usize, usize) {
  let min_val = q.min();
  let mut j: usize = 0;
  let mut i = 0;
  for n in q.column_iter() {
    let min_i = n.argmin();
    if (min_val - min_i.1).abs() < f64::EPSILON {
      i = min_i.0;
      break;
    }
    j += 1;
  }

  (i, j)
}

pub fn build_undirected_subtree(distance_matrix: DMatrix<f64>, element_order: Vec<NodeType>) -> Graph<NodeType, f64> {
  let g = Graph::<NodeType, f64> {
    adjacency: HashMap::new(),
  };

  build_undirected_subtree_recursive(distance_matrix, element_order, g)
}

pub fn build_undirected_subtree_recursive(
  mut distance_matrix: DMatrix<f64>,
  mut element_order: Vec<NodeType>,
  mut g: Graph<NodeType, f64>,
) -> Graph<NodeType, f64> {
  let n = distance_matrix.nrows();
  if n > 2 {
    let mut q = calculate_q(&distance_matrix);
    let big_number = f64::MAX;
    q.fill_diagonal(big_number);
    // get location and value of minimum -> which nodes to be joined
    let pos = argmin(&q);

    // calculate distance of other nodes to new node
    let d1 = distance_matrix.row(cmp::min(pos.0, pos.1));
    let d2 = distance_matrix.row(cmp::max(pos.0, pos.1));
    let min_pos = cmp::min(pos.0, pos.1);
    let min_d_val = distance_matrix[pos];
    let d_new = min_d_val * DMatrix::from_element(1, n, 1.0);
    let scalar = 0.5;
    let dist_new_node = scalar * (d1 + d2 - d_new.clone());
    let dist_new_node_col = scalar * (d1.transpose() + d2.transpose() - d_new.transpose());

    // calculate first node to be replaced with new node
    distance_matrix.set_row(cmp::min(pos.0, pos.1), &dist_new_node);
    distance_matrix.set_column(cmp::min(pos.0, pos.1), &dist_new_node_col);

    // remove second node from distance matrix
    distance_matrix = distance_matrix.remove_row(cmp::max(pos.0, pos.1));
    distance_matrix = distance_matrix.remove_column(cmp::max(pos.0, pos.1));

    //add to undirected tree (graph)
    let o1 = NewInternalNode::new();
    g.push_edge(element_order[pos.0], NodeType::NewInternalNode(o1), 2.0);
    g.push_edge(NodeType::NewInternalNode(o1), element_order[pos.0], 2.0);
    g.push_edge(element_order[pos.1], NodeType::NewInternalNode(o1), 2.0);
    g.push_edge(NodeType::NewInternalNode(o1), element_order[pos.1], 2.0);

    // modify element list
    element_order.insert(cmp::min(pos.0, pos.1), NodeType::NewInternalNode(o1));
    let pos_to_remove = cmp::max(pos.0, pos.1);
    element_order.remove(cmp::min(pos.0, pos.1) + 1);
    element_order.remove(cmp::max(pos.0, pos.1));

    build_undirected_subtree_recursive(distance_matrix, element_order, g)
  } else {
    g.push_edge(element_order[1], element_order[0], 2.0);
    g.push_edge(element_order[0], element_order[1], 2.0);

    g
  }
}

pub fn build_directed_subtree(graph_node: &NodeType, subtree: &Graph<NodeType, f64>) -> Graph<NodeType, f64> {
  let mut undirected_subtree = Graph::<NodeType, f64>::new();
  let mut seen_elements = HashSet::from([*graph_node]);

  build_directed_subtree_recursive(graph_node, &mut undirected_subtree, subtree, &mut seen_elements);

  undirected_subtree
}

fn build_directed_subtree_recursive(
  graph_node: &NodeType,
  undirected_subtree: &mut Graph<NodeType, f64>,
  subtree: &Graph<NodeType, f64>,
  seen_nodes: &mut HashSet<NodeType>,
) {
  let nodes_to_attach = subtree.adjacency.get(graph_node);

  for v in nodes_to_attach.unwrap() {
    let t_n = (*v).0;
    if seen_nodes.contains(&t_n) {
      continue;
    }
    undirected_subtree.push_edge(*graph_node, t_n, 2.0);
    seen_nodes.insert(t_n);
    build_directed_subtree_recursive(&t_n, undirected_subtree, subtree, seen_nodes);
  }
}

pub fn add_mutations_to_vertices(
  graph_node: &NodeType,
  directed_subtree: &Graph<NodeType, f64>,
  results: &[NextcladeOutputs],
  vertices: &mut HashMap<NodeType, InternalMutations>,
) {
  let nodes_to_attach = directed_subtree.adjacency.get(graph_node);

  for v in nodes_to_attach.unwrap() {
    let t_n = (*v).0;
    if let NodeType::NewSeqNode(_) = t_n {
      let index = extract_enum_value!(t_n, NodeType::NewSeqNode(c) => c);
      let result = &results[index.0];
      let NextcladeOutputs {
        substitutions,
        deletions,
        missing,
        aa_substitutions,
        aa_deletions,
        unknown_aa_ranges,
        alignment_start,
        alignment_end,
        ..
      } = result;
      let substitutions_ = result.substitutions.iter().map(|s| s.sub.clone()).collect::<Vec<_>>();
      let deletions_ = result.deletions.iter().map(|s| s.del.clone()).collect::<Vec<_>>();
      let missing_ = missing.clone();
      let aa_substitutions_ = aa_substitutions.clone();
      let aa_deletions_ = aa_deletions.clone();
      let unknown_aa_ranges_ = unknown_aa_ranges.clone();
      let vert = InternalMutations {
        substitutions: substitutions_,
        deletions: deletions_,
        missing: missing_,
        aa_substitutions: aa_substitutions_,
        aa_deletions: aa_deletions_,
        unknown_aa_ranges: unknown_aa_ranges_,
        alignment_start: *alignment_start,
        alignment_end: *alignment_end,
      };
      vertices.insert(t_n, vert);
    } else if let NodeType::NewInternalNode(_) = t_n {
      add_mutations_to_vertices(&t_n, directed_subtree, results, vertices);
      let vert = compute_vertex_mutations(&t_n, directed_subtree, vertices);
      vertices.insert(t_n, vert);
      continue;
    }
  }
}

fn join_nuc_sub(
  subst1: &Vec<NucSub>,
  subst2: &Vec<NucSub>,
  range1: &[NucRange],
  range2: &[NucRange],
  aln_range1: &Range,
  aln_range2: &Range,
) -> Vec<NucSub> {
  let mut shared_substitutions = Vec::<NucSub>::new();
  let mut i = 0;
  let mut j = 0;
  while (i < subst1.len()) && (j < subst2.len()) {
    if subst1[i].pos == subst2[j].pos {
      // position is also mutated in node
      if subst1[i].reff == subst2[j].reff && subst1[i].qry == subst2[j].qry {
        shared_substitutions.push(subst1[i].clone()); // the exact mutation is shared between node and seq
      }
      i += 1;
      j += 1;
    } else if subst1[i].pos < subst2[j].pos {
      if !is_nuc_sequenced(subst1[i].pos, range2, aln_range2) {
        shared_substitutions.push(subst1[i].clone());
      }
      i += 1;
    } else {
      if !is_nuc_sequenced(subst2[j].pos, range1, aln_range1) {
        shared_substitutions.push(subst2[j].clone());
      }
      j += 1;
    }
  }
  shared_substitutions
}

fn join_nuc_sub_small(subst1: &Vec<NucSub>, subst2: &Vec<NucSub>) -> Vec<NucSub> {
  let mut shared_substitutions = Vec::<NucSub>::new();
  let mut i = 0;
  let mut j = 0;
  while (i < subst1.len()) && (j < subst2.len()) {
    if subst1[i].pos == subst2[j].pos {
      // position is also mutated in node
      if subst1[i].reff == subst2[j].reff && subst1[i].qry == subst2[j].qry {
        shared_substitutions.push(subst1[i].clone()); // the exact mutation is shared between node and seq
      }
      i += 1;
      j += 1;
    } else if subst1[i].pos < subst2[j].pos {
      i += 1;
    } else if subst1[i].pos > subst2[j].pos {
      j += 1;
    }
  }
  shared_substitutions
}

fn join_nuc_del(deletions1: &Vec<NucDel>, deletions2: &Vec<NucDel>) -> Vec<NucDel> {
  let mut shared_deletions = Vec::<NucDel>::new();
  for del1 in deletions1 {
    for del2 in deletions2 {
      let potential_start = cmp::max(del1.start, del2.start);
      let potential_end = cmp::min(del1.start + del1.length, del2.start + del2.length);
      if potential_start < potential_end {
        // del1 and del2 overlap
        shared_deletions.push(NucDel {
          start: potential_start,
          length: (potential_end - potential_start),
        });
      }
    }
  }
  shared_deletions
}

pub fn compute_vertex_mutations(
  graph_node: &NodeType,
  directed_subtree: &Graph<NodeType, f64>,
  vertices: &mut HashMap<NodeType, InternalMutations>,
) -> InternalMutations {
  let nodes_to_attach = directed_subtree.adjacency.get(graph_node);
  let mut child_vertices = Vec::<&InternalMutations>::new();
  for v in nodes_to_attach.unwrap() {
    let index = (*v).0;
    let ch = vertices.get(&index).unwrap();
    child_vertices.push(ch);
  }
  if child_vertices.len() == 1 {
    println!("child_vertices.len() == 1");
  }

  let shared_substitutions = join_nuc_sub(
    &child_vertices[0].substitutions,
    &child_vertices[1].substitutions,
    &child_vertices[0].missing,
    &child_vertices[1].missing,
    &Range {
      begin: child_vertices[0].alignment_start,
      end: child_vertices[0].alignment_end,
    },
    &Range {
      begin: child_vertices[1].alignment_start,
      end: child_vertices[1].alignment_end,
    },
  );

  //let shared_substitutions = join_nuc_sub_small(&child_vertices.get(0).unwrap().substitutions, &child_vertices.get(1).unwrap().substitutions);
  let mut shared_aa_substitutions = Vec::<AaSubFull>::new();
  for qmut1 in &child_vertices[1].aa_substitutions {
    for qmut2 in &child_vertices[0].aa_substitutions {
      let join_shared_nuc_subst = join_nuc_sub_small(&qmut1.nuc_substitutions, &qmut2.nuc_substitutions);
      let join_shared_nuc_del = join_nuc_del(&qmut1.nuc_deletions, &qmut2.nuc_deletions);
      if qmut1.sub.gene == qmut2.sub.gene && qmut1.sub.pos == qmut2.sub.pos {
        // position is also mutated in node
        if qmut1.sub.qry == qmut2.sub.qry {
          shared_aa_substitutions.push(qmut1.clone()); // the exact mutation is shared between node and seq
        } else {
          // the aa mutation is not shared -> however if part of the nuc triplet is mutated in both, this is a shared mutation
          if join_shared_nuc_subst == qmut1.nuc_substitutions {
            shared_aa_substitutions.push(qmut1.clone());
          } else if join_shared_nuc_subst == qmut2.nuc_substitutions {
            shared_aa_substitutions.push(qmut2.clone());
          } else {
            println!("entering special case");
            let mut new_aa = AaSubFull {
              sub: qmut1.sub.clone(),
              nuc_substitutions: join_shared_nuc_subst,
              nuc_deletions: join_shared_nuc_del,
            };
            let mut new_qry_seq = to_nuc_seq(&qmut1.sub.ref_context).unwrap();
            for nuc in &new_aa.nuc_substitutions {
              new_qry_seq[nuc.pos - qmut1.sub.codon_nuc_range.begin + 3] = nuc.qry;
            }
            new_aa.sub.query_context = from_nuc_seq(&new_qry_seq);
            new_aa.sub.qry = decode(&new_qry_seq[3..6]);
            shared_aa_substitutions.push(new_aa);
          }
        }
      }
    }
  }

  let shared_deletions = join_nuc_del(&child_vertices[1].deletions, &child_vertices[0].deletions);

  let mut shared_aa_deletions = Vec::<AaDelFull>::new();
  for del1 in &child_vertices[1].aa_deletions {
    for del2 in &child_vertices[0].aa_deletions {
      if del1.del == del2.del {
        // del1 and del2 overlap
        shared_aa_deletions.push(AaDelFull::from_aa_del(&del1.del));
      }
    }
  }

  let mut shared_missings = Vec::<NucRange>::new();
  for mis1 in &child_vertices[1].missing {
    for mis2 in &child_vertices[0].missing {
      let potential_start = cmp::max(mis1.begin, mis2.begin);
      let potential_end = cmp::min(mis1.end, mis2.end);
      if potential_start < potential_end {
        // missings overlap
        shared_missings.push(NucRange {
          begin: potential_start,
          end: potential_end,
          letter: Nuc::N,
        });
      }
    }
  }

  let mut shared_unknown_aa_ranges = Vec::<GeneAaRange>::new();
  for mis1 in &child_vertices[1].unknown_aa_ranges {
    for mis2 in &child_vertices[0].unknown_aa_ranges {
      if mis1.gene_name == mis2.gene_name {
        let mut shared_missings_per_gene = Vec::<AaRange>::new();
        let mut shared_length_per_gene = 0;
        for range1 in &mis1.ranges {
          for range2 in &mis2.ranges {
            let potential_start = cmp::max(range1.begin, range2.begin);
            let potential_end = cmp::min(range1.end, range2.end);
            if potential_start < potential_end {
              // missings overlap
              shared_missings_per_gene.push(AaRange {
                begin: potential_start,
                end: potential_end,
                letter: Aa::X,
              });
              shared_length_per_gene += potential_end - potential_start;
            }
          }
        }
        if !shared_missings_per_gene.is_empty() {
          shared_unknown_aa_ranges.push(GeneAaRange {
            gene_name: mis1.gene_name.clone(),
            letter: Aa::X,
            ranges: shared_missings_per_gene,
            length: shared_length_per_gene,
          });
        }
      }
    }
  }

  InternalMutations {
    substitutions: shared_substitutions,
    deletions: shared_deletions,
    missing: shared_missings,
    aa_substitutions: shared_aa_substitutions,
    aa_deletions: shared_aa_deletions,
    unknown_aa_ranges: shared_unknown_aa_ranges,
    alignment_start: cmp::max(child_vertices[1].alignment_start, child_vertices[0].alignment_start),
    alignment_end: cmp::min(child_vertices[1].alignment_end, child_vertices[0].alignment_end),
  }
}

#[test]
fn test_distance_metric() {
  let seq1 = vec![
    NucSub {
      reff: Nuc::T,
      pos: 13,
      qry: Nuc::A,
    },
    NucSub {
      reff: Nuc::T,
      pos: 14,
      qry: Nuc::A,
    },
  ];
  let seq2 = vec![
    NucSub {
      reff: Nuc::T,
      pos: 13,
      qry: Nuc::T,
    },
    NucSub {
      reff: Nuc::T,
      pos: 14,
      qry: Nuc::A,
    },
    NucSub {
      reff: Nuc::T,
      pos: 18,
      qry: Nuc::A,
    },
  ];
  let del1 = Vec::<NucDelMinimal>::new();
  let del2 = Vec::<NucDelMinimal>::new();
  let missings1 = Vec::<LetterRange<Nuc>>::new();
  let missings2 = Vec::<LetterRange<Nuc>>::new();
  let aln_range1 = Range { begin: 0, end: 100 };
  let aln_range2 = Range { begin: 0, end: 100 };
  let dist = calculate_distance_results(
    &seq1,
    &seq2,
    &del1,
    &del2,
    &missings1,
    &missings2,
    &aln_range1,
    &aln_range2,
  );
  assert_eq!(dist, 2.0);
}
