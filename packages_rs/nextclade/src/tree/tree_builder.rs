use crate::align::insertions_strip::{get_aa_insertions, NucIns};
use crate::align::params::AlignPairwiseParams;
use crate::analyze::aa_changes::{find_aa_changes, FindAaChangesOutput};
use crate::analyze::aa_changes_group::group_adjacent_aa_subs_and_dels;
use crate::analyze::divergence::calculate_divergence;
use crate::analyze::find_private_aa_mutations::find_private_aa_mutations;
use crate::analyze::find_private_nuc_mutations::find_private_nuc_mutations;
use crate::analyze::is_sequenced::is_nuc_sequenced;
use crate::analyze::letter_composition::get_letter_composition;
use crate::analyze::letter_ranges::NucRange;
use crate::analyze::letter_ranges::{find_aa_letter_ranges, find_letter_ranges, find_letter_ranges_by};
use crate::analyze::link_nuc_and_aa_changes::{link_nuc_and_aa_changes, LinkedNucAndAaChanges};
use crate::analyze::nuc_changes::{find_nuc_changes, FindNucChangesOutput};
use crate::analyze::nuc_sub::NucSub;
use crate::analyze::pcr_primer_changes::get_pcr_primer_changes;
use crate::analyze::pcr_primers::PcrPrimer;
use crate::analyze::phenotype::calculate_phenotype;
use crate::analyze::virus_properties::{PhenotypeData, VirusProperties};
use crate::io::aa::Aa;
use crate::io::fasta::{FastaReader, FastaRecord};
use crate::io::gene_map::GeneMap;
use crate::io::letter::Letter;
use crate::io::nuc::Nuc;
use crate::io::nuc::{to_nuc_seq, to_nuc_seq_replacing};
use crate::qc::qc_config::QcConfig;
use crate::qc::qc_run::qc_run;
use crate::run::nextalign_run_one::nextalign_run_one;
use crate::translate::frame_shifts_flatten::frame_shifts_flatten;
use crate::translate::translate_genes::{Translation, TranslationMap};
use crate::tree::tree::{AuspiceTree, AuspiceTreeNode};
use crate::tree::tree_find_nearest_node::{tree_find_nearest_node, TreeFindNearestNodeOutput};
use crate::analyze::nuc_sub_full::{NucSubFull, NucDelFull};
use crate::analyze::aa_sub_full::{AaSubFull, AaDelFull};
use crate::analyze::letter_ranges::GeneAaRange;
use crate::types::outputs::{NextalignOutputs, NextcladeOutputs, PhenotypeValue};
use crate::utils::range::Range;
use eyre::Report;
use itertools::Itertools;
use nalgebra::{DMatrix, DVector};
use serde::__private::de;
use std::collections::HashMap;
//use ndarray::prelude::*;
use crate::tree::tree_find_nearest_node::tree_calculate_node_distance;
use std::cmp;
use std::hash::Hash;
use std::collections::HashSet;
use std::{
  sync::atomic::{AtomicUsize, Ordering},
  thread,
};

static OBJECT_COUNTER: AtomicUsize = AtomicUsize::new(0);

/// Calculates distance metric between two query samples
pub fn calculate_distance_results(seq1: &NextcladeOutputs, seq2: &NextcladeOutputs) -> f64 {
  let total_mut_1 = (seq1.total_substitutions) as i64;
  let total_mut_2 = (seq2.total_substitutions) as i64;
  let mut shared_differences = 0_i64;
  let mut shared_sites = 0_i64;
  let mut undetermined_sites = 0_i64;
  for qmut1 in &seq1.substitutions {
    if !is_nuc_sequenced(
      qmut1.sub.pos,
      &seq2.missing,
      &Range::new(seq2.alignment_start, seq2.alignment_end),
    ) {
      undetermined_sites += 1;
    }
    // for del2 in &seq2.deletions{
    //   if qmut1.sub.pos >= del2.del.start && qmut1.sub.pos - del2.del.start<= del2.del.length {
    //     shared_sites += 1;
    //   }
    // }
    for qmut2 in &seq2.substitutions {
      if qmut1.sub.pos == qmut2.sub.pos {
        // position is also mutated in node
        if qmut1.sub.qry == qmut2.sub.qry {
          shared_differences += 1; // the exact mutation is shared between node and seq
        } else {
          shared_sites += 1; // the same position is mutated, but the states are different
        }
      }
    }
  }
  for qmut2 in &seq2.substitutions {
    if !is_nuc_sequenced(
      qmut2.sub.pos,
      &seq1.missing,
      &Range::new(seq1.alignment_start, seq1.alignment_end),
    ) {
      undetermined_sites += 1;
    }
    // for del1 in &seq1.deletions{
    //   if qmut2.sub.pos >= del1.del.start && qmut2.sub.pos - del1.del.start<= del1.del.length {
    //     shared_sites += 1;
    //   }
    // }
  }
  let dist = (total_mut_1 + total_mut_2 - 2 * shared_differences - shared_sites - undetermined_sites) as f64;

  dist
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
  //let mut distance_matrix = Array2::<i64>::zeros((size+1,size+1));
  for i in 0..size {
    let v1 = positions[i];
    let results1 = if let Some(pos) = results.get(v1) { pos } else { todo!() };
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
    //distance_matrix[[i+1, 0]] = dist_to_node;
    //distance_matrix[[0, i+1]] = dist_to_node;
    for j in 0..size {
      if i >= j {
        continue;
      } else {
        let v2 = positions[j];
        let results2 = if let Some(pos) = results.get(v2) { pos } else { todo!() };

        let dist = calculate_distance_results(results1, results2);
        distance_matrix[(i + 1, j + 1)] = dist;
        distance_matrix[(j + 1, i + 1)] = dist;
        //distance_matrix[[i+1, j+1]] = dist;
        //distance_matrix[[j+1, i+1]] = dist;
      }
    }
  }
  (distance_matrix, element_order)
}

// pub fn calculate_q(distance_matrix: &Array2<i64>) -> Array2<i64>
// {
//   let n = distance_matrix.shape()[0];
//   let scalar = (n-2) as i64;
//   let row_sum_matrix = distance_matrix.sum_axis(Axis(0))*Array1::<i64>::ones(n);
//   let col_sum_matrix = distance_matrix.sum_axis(Axis(1))*Array1::<i64>::ones(n);
//   let q = scalar*distance_matrix - row_sum_matrix - col_sum_matrix;

//   q
// }

pub fn calculate_q(distance_matrix: &DMatrix<f64>) -> DMatrix<f64> {
  let n = distance_matrix.nrows();
  let scalar = (n - 2) as f64;
  let col_sum_matrix = distance_matrix.row_sum_tr() * DMatrix::from_element(1, n, 1.0);
  let row_sum_matrix = col_sum_matrix.transpose();
  let q = scalar * distance_matrix - row_sum_matrix - col_sum_matrix;

  q
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
pub struct NewInternalNode(pub usize);

impl NewInternalNode {
  pub fn new() -> Self {
    NewInternalNode(OBJECT_COUNTER.fetch_add(1, Ordering::SeqCst))
  }
}

#[derive(Clone, Debug, Hash, Eq, PartialEq, Copy)]
pub struct NewSeqNode(pub usize);

impl NewSeqNode {
  pub fn new(pos: usize) -> Self {
    NewSeqNode(pos)
  }
}

#[derive(Clone, Debug, Hash, Eq, PartialEq, Copy)]
pub struct TreeNode(pub usize);

impl TreeNode {
  pub fn new(pos: usize) -> Self {
    TreeNode(pos)
  }
}

// #[derive(Clone, Debug)]
// pub struct InternalMutations<'a>{
//   pub substitutions: &'a Vec<NucSubFull>,
//   pub deletions: &'a Vec<NucDelFull>,
//   pub missing: &'a Vec<NucRange>,
//   pub aa_substitutions: &'a Vec<AaSubFull>,
//   pub aa_deletions: &'a Vec<AaDelFull>,
//   pub unknown_aa_ranges: &'a Vec<GeneAaRange>,
//   pub alignment_start: &'a usize,
//   pub alignment_end: &'a usize,
// }

#[derive(Clone, Debug)]
pub struct InternalMutations{
  pub substitutions: Vec<NucSubFull>,
  pub deletions: Vec<NucDelFull>,
  pub missing: Vec<NucRange>,
  pub aa_substitutions: Vec<AaSubFull>,
  pub aa_deletions: Vec<AaDelFull>,
  pub unknown_aa_ranges: Vec<GeneAaRange>,
  pub alignment_start: usize,
  pub alignment_end: usize,
  pub alignment_score: i32,
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
    if min_val == min_i.1 {
      i = min_i.0;
      break;
    }
    j += 1;
  }

  (i, j)
}

pub fn build_undirected_subtree(
  mut distance_matrix: DMatrix<f64>,
  mut element_order: Vec<NodeType>,
) -> Graph<NodeType, f64> {
  let mut g = Graph::<NodeType, f64> {
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
    let d1 = distance_matrix.row(cmp::min(pos.0, pos.1)).clone();
    let d2 = distance_matrix.row(cmp::max(pos.0, pos.1)).clone();
    let min_pos = cmp::min(pos.0, pos.1);
    let min_d_val = distance_matrix[pos].clone();
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

    return g;
  }
}

pub fn build_directed_subtree(graph_node: &NodeType, subtree: &Graph::<NodeType, f64>) -> Graph::<NodeType, f64> {

  let mut undirected_subtree = Graph::<NodeType, f64>::new();
  let mut seen_elements = HashSet::from([*graph_node]);
  
  build_directed_subtree_recursive(graph_node, &mut undirected_subtree, subtree, &mut seen_elements);

  undirected_subtree
}

fn build_directed_subtree_recursive(graph_node: &NodeType, undirected_subtree: &mut Graph::<NodeType, f64>, subtree: &Graph::<NodeType, f64>, seen_nodes: &mut HashSet<NodeType>){

  let nodes_to_attach = subtree.adjacency.get(graph_node);

  for v in nodes_to_attach.unwrap(){
    let t_n = (*v).0;
    if seen_nodes.contains(&t_n){
      continue;
    }
    undirected_subtree.push_edge(*graph_node, t_n, 2.0);
    seen_nodes.insert(t_n);
    build_directed_subtree_recursive(&t_n, undirected_subtree, subtree, seen_nodes);
  }

}

pub fn add_mutations_to_vertices(graph_node: &NodeType, directed_subtree: &Graph::<NodeType, f64>, results: &[NextcladeOutputs], vertices: &mut HashMap<NodeType, InternalMutations>) {
  let nodes_to_attach = directed_subtree.adjacency.get(graph_node);

  for v in nodes_to_attach.unwrap(){
    let t_n = (*v).0;
    if let NodeType::NewSeqNode(_) = t_n {
      let index = extract_enum_value!(t_n, NodeType::NewSeqNode(c) => c);
      let result = if let Some(pos) = results.get(index.0) { pos } else { todo!() };
      let NextcladeOutputs {
        substitutions,
        deletions,
        missing,
        aa_substitutions,
        aa_deletions,
        unknown_aa_ranges,
        alignment_start,
        alignment_end,
        alignment_score,
        ..
      } = result;
      let substitutions_ = substitutions.to_vec();
      let deletions_ = deletions.to_vec();
      let missing_ = missing.to_vec();
      let aa_substitutions_ = aa_substitutions.to_vec();
      let aa_deletions_ = aa_deletions.to_vec();
      let unknown_aa_ranges_ = unknown_aa_ranges.to_vec();
      let vert = InternalMutations{
        substitutions: substitutions_,
        deletions: deletions_,
        missing: missing_,
        aa_substitutions: aa_substitutions_,
        aa_deletions: aa_deletions_,
        unknown_aa_ranges: unknown_aa_ranges_,
        alignment_start: *alignment_start,
        alignment_end: *alignment_end,
        alignment_score: *alignment_score,
      };
      vertices.insert(t_n, vert);
    }else if let NodeType::NewInternalNode(_) = t_n {
      add_mutations_to_vertices(&t_n, directed_subtree, results, vertices);
      let vert = compute_vertex_mutations(&t_n, directed_subtree, vertices);
      vertices.insert(t_n, vert);
      continue;
    }
  }
}

pub fn compute_vertex_mutations(graph_node: &NodeType, directed_subtree: &Graph::<NodeType, f64>, vertices: &mut HashMap<NodeType, InternalMutations>) -> InternalMutations{
  let nodes_to_attach = directed_subtree.adjacency.get(graph_node);
  let mut child_vertices = Vec::<&InternalMutations>::new();
  for v in nodes_to_attach.unwrap(){
    let index = (*v).0;
    let ch = vertices.get(&index).unwrap();
    child_vertices.push(ch);
  }
  let sub_1 = &child_vertices.get(0).unwrap().substitutions;
  let sub_2 = &child_vertices.get(1).unwrap().substitutions;
  let mut shared_substitutions = Vec::<NucSubFull>::new();
  for qmut1 in &child_vertices.get(0).unwrap().substitutions {
    for qmut2 in &child_vertices.get(1).unwrap().substitutions {
      if qmut1.sub.pos == qmut2.sub.pos {
        // position is also mutated in node
        if qmut1.sub.qry == qmut2.sub.qry {
          shared_substitutions.push(qmut1.clone()); // the exact mutation is shared between node and seq
        }
      }
    }
  }
  let mut shared_aa_substitutions = Vec::<AaSubFull>::new();
  for qmut1 in &child_vertices.get(1).unwrap().aa_substitutions {
    for qmut2 in &child_vertices.get(0).unwrap().aa_substitutions {
      if qmut1.sub.pos == qmut2.sub.pos {
        // position is also mutated in node
        if qmut1.sub.qry == qmut2.sub.qry {
          shared_aa_substitutions.push(qmut1.clone()); // the exact mutation is shared between node and seq
        }
      }
    }
  }
  let vert = InternalMutations{
    substitutions: shared_substitutions,
    deletions: child_vertices.get(1).unwrap().deletions.clone(),
    //deletions: Vec::<NucDelFull>::new(),
    missing: child_vertices.get(1).unwrap().missing.clone(),
    aa_substitutions: shared_aa_substitutions,
    //aa_substitutions: Vec::<AaSubFull>::new(),
    aa_deletions: child_vertices.get(1).unwrap().aa_deletions.clone(),
    //aa_deletions: Vec::<AaDelFull>::new(),
    unknown_aa_ranges: child_vertices.get(1).unwrap().unknown_aa_ranges.clone(),
    alignment_start: cmp::max(child_vertices.get(1).unwrap().alignment_start, child_vertices.get(0).unwrap().alignment_start),
    alignment_end: cmp::min(child_vertices.get(1).unwrap().alignment_end, child_vertices.get(0).unwrap().alignment_end),
    alignment_score: child_vertices.get(1).unwrap().alignment_score,
  };
  vert
}
