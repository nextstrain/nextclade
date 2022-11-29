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
use nalgebra::{DMatrix, DVector};
//use ndarray::prelude::*;
use rand::Rng;
use std::cmp;
use crate::tree::tree_find_nearest_node::tree_calculate_node_distance;

/// Calculates distance metric between two query samples
pub fn calculate_distance_results(
  seq1: &NextcladeOutputs,
  seq2: &NextcladeOutputs,
) -> f64 {
  let total_mut_1 = (seq1.total_substitutions) as i64;
  let total_mut_2 = (seq2.total_substitutions) as i64;
  let mut shared_differences = 0_i64;
  let mut shared_sites = 0_i64;
  let mut undetermined_sites = 0_i64;
  for qmut1 in &seq1.substitutions {
    if !is_nuc_sequenced(qmut1.sub.pos, &seq2.missing, &Range::new(seq2.alignment_start, seq2.alignment_end)) {
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
        if qmut1.sub.qry == qmut2.sub.qry{
          shared_differences += 1; // the exact mutation is shared between node and seq
        } else {
          shared_sites += 1; // the same position is mutated, but the states are different
        }
      }
    }
  }
  for qmut2 in &seq2.substitutions {
    if !is_nuc_sequenced(qmut2.sub.pos, &seq1.missing, &Range::new(seq1.alignment_start, seq1.alignment_end)) {
      undetermined_sites += 1;
    }
    // for del1 in &seq1.deletions{
    //   if qmut2.sub.pos >= del1.del.start && qmut2.sub.pos - del1.del.start<= del1.del.length {
    //     shared_sites += 1;
    //   }
    // }
  }
  let dist = (total_mut_1 + total_mut_2 -2*shared_differences - shared_sites -undetermined_sites) as f64;

  dist
}

pub fn calculate_distance_matrix(node: &mut AuspiceTreeNode, results : &[NextcladeOutputs], positions : &Vec<usize>) -> DMatrix<f64>
{
  let size = positions.len();
  // TODO: add ancestor and children to the distance matrix
  // let mut size = positions.len() + node.children.len() +1;
  // if node.name != parent_node.name{
  //   size += 1;
  // }
  let mut distance_matrix = DMatrix::zeros(size+1, size+1);
  //let mut distance_matrix = Array2::<i64>::zeros((size+1,size+1));
  for i in 0..size{
    let v1 = positions[i];
    let results1 = if let Some(pos) = results.get(v1) { pos } else { todo!() };
    let arr = results1.substitutions.iter().map(|x| x.sub.clone()).collect::<Vec<NucSub>>();
    let dist_to_node = tree_calculate_node_distance(
      node, &arr, &results1.missing, &Range::new(results1.alignment_start, results1.alignment_end)) as f64;
    distance_matrix[(i+1, 0)] = dist_to_node;
    distance_matrix[(0, i+1)] = dist_to_node;
    //distance_matrix[[i+1, 0]] = dist_to_node;
    //distance_matrix[[0, i+1]] = dist_to_node;
    for j in 0..size{
      if i >= j {
        continue;
      }else{
        let v2 = positions[j];
        let results2 = if let Some(pos) = results.get(v2) { pos } else { todo!() };
        
        let dist = calculate_distance_results(results1, results2);
        println!("dist: {}", dist);
        distance_matrix[(i+1, j+1)] = dist;
        distance_matrix[(j+1, i+1)] = dist;
        //distance_matrix[[i+1, j+1]] = dist;
        //distance_matrix[[j+1, i+1]] = dist;
      }
    }
  }
  distance_matrix
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

pub fn calculate_q(distance_matrix: &DMatrix<f64>) -> DMatrix<f64>
{
  let n = distance_matrix.nrows();
  let scalar = (n-2) as f64;
  let col_sum_matrix = distance_matrix.row_sum_tr()*DMatrix::from_element(1,n, 1.0);
  let row_sum_matrix = col_sum_matrix.transpose();
  let q = scalar*distance_matrix - row_sum_matrix - col_sum_matrix;

  q
}

#[derive(Eq, PartialEq, Hash)]
#[derive(Clone, Copy)]
pub enum NodeType<'a>{
    TreeNode(&'a str),
    NewSeqNode(&'a usize),
    NewInternalNode(&'a usize),
}


pub fn argmin(q : &DMatrix<f64>) -> (usize, usize){
  let min_val = q.min();
  let mut j : usize = 0;
  let mut i = 0;
  for n in q.column_iter(){
    let min_i = n.argmin();
    if min_val == min_i.1{
      i = min_i.0;
      break;
    }
    j +=1;
  }

  (i,j)
}

// pub fn build_subtree(distance_matrix: &mut DMatrix<i64>, element_order: &mut Vec<NodeType>){
//   let n = distance_matrix.nrows();
//   if n>2{
//     let mut q = calculate_q(&distance_matrix); 
//     let big_number = i64::MAX;
//     q.fill_diagonal(big_number);
//     // get location and value of minimum -> which nodes to be joined
//     let min_val = q.min();
//     let pos = argmin(&q, min_val);

//     //let mut rng = rand::thread_rng();
//     //let rand_usize = rng.gen();
//     let new_node_index = NodeType::NewInternalNode(&1);
//     //let new_entry = new_internal_nodes.entry(&new_node_index).or_default();
//     //new_entry.push(&element_order[pos[0]]);

//     // calculate distance of other nodes to new node 
//     let d1=  distance_matrix.row(cmp::min(pos[0], pos[1]));
//     let d2 =  distance_matrix.row(cmp::max(pos[0], pos[1])); 
//     let d_new = min_val*DMatrix::from_element(1,n, 1);
//     let dist_new_node = (1/2)*(d1 + d2- d_new);

//     // calculate first node to be replaced with new node
//     for row in 0..n {
//       *distance_matrix.index_mut((row, cmp::min(pos[0], pos[1]))) = dist_new_node[row];
//       *distance_matrix.index_mut((cmp::min(pos[0], pos[1]), row)) = dist_new_node[row];
//     }
//     *distance_matrix.index_mut((cmp::min(pos[0], pos[1]), cmp::min(pos[0], pos[1]))) = 0;
    
//     // remove second node from distance matrix
//     //distance_matrix.remove_row(cmp::max(pos[0], pos[1]));
//     //distance_matrix.remove_column(cmp::max(pos[0], pos[1]));

//     // change element_order
//     element_order.insert(cmp::min(pos[0], pos[1]), new_node_index);
//     element_order.remove(cmp::max(pos[0], pos[1]));

//     build_subtree(distance_matrix, element_order)
//   }
// }

pub fn build_subtree(mut distance_matrix: DMatrix<f64>) -> DMatrix<f64>{
  let n = distance_matrix.nrows();
  if n>2{
    let mut q = calculate_q(&distance_matrix); 
    let big_number = f64::MAX;
    q.fill_diagonal(big_number);
    // get location and value of minimum -> which nodes to be joined
    let pos = argmin(&q);

    // calculate distance of other nodes to new node 
    let d1=  distance_matrix.row(cmp::min(pos.0, pos.1)).clone();
    let d2 =  distance_matrix.row(cmp::max(pos.0, pos.1)).clone(); 
    let min_pos = cmp::min(pos.0, pos.1);
    let min_d_val = distance_matrix[pos].clone();
    let d_new = min_d_val*DMatrix::from_element(1,n, 1.0);
    let scalar = 0.5;
    let dist_new_node = scalar*(d1 + d2- d_new.clone());
    let dist_new_node_col = scalar*(d1.transpose() + d2.transpose()- d_new.transpose()); 

    // calculate first node to be replaced with new node
    distance_matrix.set_row(cmp::min(pos.0, pos.1), &dist_new_node);
    distance_matrix.set_column(cmp::min(pos.0, pos.1), &dist_new_node_col);
    
    // remove second node from distance matrix
    distance_matrix = distance_matrix.remove_row(cmp::max(pos.0, pos.1));
    distance_matrix = distance_matrix.remove_column(cmp::max(pos.0, pos.1));

    build_subtree(distance_matrix)
  }
  else{
    return distance_matrix;
  }
}