use crate::io::fasta::FastaRecord;
use crate::sort::minimizer_index::{MinimizerIndexJson, MinimizerIndexParams};
use crate::sort::params::NextcladeSeqSortParams;
use crate::utils::indexmap::reorder_indexmap;
use crate::utils::map::key_of_max_value;
use eyre::Report;
use indexmap::{indexmap, IndexMap};
use itertools::{izip, Itertools};
use log::debug;
use ordered_float::OrderedFloat;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct MinimizerSearchDatasetResult {
  pub name: String,
  pub length: i64,
  pub n_hits: u64,
  pub score: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct MinimizerSearchResult {
  pub total_hits: u64,
  pub max_score: f64,
  pub datasets: Vec<MinimizerSearchDatasetResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct MinimizerSearchRecord {
  pub fasta_record: FastaRecord,
  pub result: MinimizerSearchResult,
}

#[allow(clippy::string_slice)]
pub fn run_minimizer_search(
  fasta_record: &FastaRecord,
  index: &MinimizerIndexJson,
  search_params: &NextcladeSeqSortParams,
) -> Result<MinimizerSearchResult, Report> {
  let n_refs = index.references.len();

  let minimizers = get_ref_search_minimizers(fasta_record, &index.params);
  let mut hit_counts = vec![0; n_refs];
  for m in minimizers {
    if let Some(mz) = index.minimizers.get(&m) {
      for (ri, hit_count) in hit_counts.iter_mut().enumerate() {
        if mz.contains(&ri) {
          *hit_count += 1;
        }
      }
    }
  }

  // we expect hits to be proportional to the length of the sequence and the number of minimizers per reference
  let mut scores: Vec<f64> = vec![0.0; hit_counts.len()];
  for i in 0..n_refs {
    let reff = &index.references[i];

    let qry_hits = hit_counts[i] as f64;
    let ref_minimizers = reff.n_minimizers as f64;
    let ref_len = reff.length as f64;
    let qry_len = fasta_record.seq.len() as f64;
    scores[i] = (qry_hits / ref_minimizers) * (ref_len / qry_len).max(1.0);
  }

  let max_score = scores.iter().copied().fold(0.0, f64::max);
  let total_hits: u64 = hit_counts.iter().sum();

  let mut datasets = izip!(&index.references, hit_counts, scores)
    .filter_map(|(ref_info, n_hits, score)| {
      (n_hits >= search_params.min_hits && score >= search_params.min_score).then_some(MinimizerSearchDatasetResult {
        name: ref_info.name.clone(),
        length: ref_info.length,
        n_hits,
        score,
      })
    })
    .sorted_by_key(|result| -OrderedFloat(result.score))
    .collect_vec();

  // if there is more than one dataset, check whether there is a gap > 0.2 in their scores
  // if so, only keep those with scores above the gap
  if datasets.len() > 1 {
    let mut chop: usize = 0;
    for i in 1..datasets.len() {
      if datasets[i - 1].score > datasets[i].score + search_params.max_score_gap {
        chop = i;
        break;
      }
    }
    if chop > 0 {
      datasets.truncate(chop);
    }
  }

  Ok(MinimizerSearchResult {
    total_hits,
    max_score,
    datasets,
  })
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct FindBestDatasetsResult {
  pub suggestions: Vec<DatasetSuggestionStats>,
  pub results: BTreeMap<usize, MinimizerSearchResult>,
}

pub fn find_best_datasets(
  results: &BTreeMap<usize, MinimizerSearchResult>,
  dataset_order: &[String],
  params: &NextcladeSeqSortParams,
) -> Result<FindBestDatasetsResult, Report> {
  let mut unmatched: BTreeSet<_> = results
    .iter()
    .filter(|(_, r)| !r.datasets.is_empty())
    .map(|(i, _)| i)
    .copied()
    .collect();

  let mut suggestions = vec![];
  let mut top_hit_matches = 0;
  let mut total_matches = 0;

  for i in 0..params.max_iter {
    let mut hit_by_dataset: IndexMap<&String, usize> = indexmap! {};
    let mut top_hit_by_dataset: IndexMap<&String, usize> = indexmap! {};

    for qry in &unmatched {
      let hits = &results[qry].datasets;
      for hit in hits {
        *hit_by_dataset.entry(&hit.name).or_insert(0) += 1;
      }
      if !hits.is_empty() {
        *top_hit_by_dataset.entry(&hits[0].name).or_insert(0) += 1;
      }
    }

    let hit_by_dataset = reorder_indexmap(hit_by_dataset, dataset_order);
    let top_hit_by_dataset = reorder_indexmap(top_hit_by_dataset, dataset_order);

    if let Some(best_dataset) = key_of_max_value(&hit_by_dataset) {
      let mut best_dataset = *best_dataset;

      if hit_by_dataset[&best_dataset] == 0 {
        debug!("partition_sequences: no more hits");
        break;
      }

      if let Some(&best_top_dataset) = key_of_max_value(&top_hit_by_dataset) {
        if hit_by_dataset[best_top_dataset] == hit_by_dataset[best_dataset] {
          best_dataset = best_top_dataset;
        }

        let matched: BTreeSet<_> = results
          .iter()
          .filter(|(_, res)| res.datasets.iter().any(|dataset| &dataset.name == best_dataset))
          .map(|(i, _)| i)
          .copied()
          .collect();

        unmatched = unmatched.difference(&matched).copied().collect();

        top_hit_matches += top_hit_by_dataset[best_top_dataset];
        total_matches += hit_by_dataset[best_dataset];

        debug!("Global search: iteration {}", i);
        debug!(
          "Global search: added dataset '{}' ({} hits, {} top hits)",
          best_dataset, hit_by_dataset[best_dataset], top_hit_by_dataset[best_top_dataset]
        );
        debug!("Global search: hit matches {}", total_matches);
        debug!("Global search: top hit matches {}", top_hit_matches);
        debug!("Global search: unmatched remaining {}", unmatched.len());

        suggestions.push(DatasetSuggestionStats {
          name: best_dataset.to_owned(),
          n_hits: hit_by_dataset[best_top_dataset],
          qry_indices: matched.iter().copied().collect(),
        });

        if unmatched.is_empty() {
          break;
        }
      }
    }
  }

  let suggestions = suggestions
    .into_iter()
    .sorted_by_key(|s| s.qry_indices.len())
    .rev()
    .collect_vec();

  Ok(FindBestDatasetsResult {
    suggestions,
    results: results.to_owned(),
  })
}

pub fn find_best_suggestion_for_seq(
  best_datasets: &FindBestDatasetsResult,
  qry_index: usize,
) -> Option<MinimizerSearchDatasetResult> {
  let &FindBestDatasetsResult { suggestions, results } = &best_datasets;

  let best_dataset = suggestions
    .iter()
    .find(|best_dataset| best_dataset.qry_indices.contains(&qry_index));

  let best_dataset = best_dataset?;
  results[&qry_index]
    .datasets
    .iter()
    .find(|d| d.name == best_dataset.name)
    .cloned()
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetSuggestionStats {
  pub name: String,
  pub n_hits: usize,
  pub qry_indices: Vec<usize>,
}

const fn invertible_hash(x: u64) -> u64 {
  let m: u64 = (1 << 32) - 1;
  let mut x: u64 = (!x).wrapping_add(x << 21) & m;
  x = x ^ (x >> 24);
  x = (x + (x << 3) + (x << 8)) & m;
  x = x ^ (x >> 14);
  x = (x + (x << 2) + (x << 4)) & m;
  x = x ^ (x >> 28);
  x = (x + (x << 31)) & m;
  x
}

fn get_hash(kmer: &[u8], params: &MinimizerIndexParams) -> u64 {
  let cutoff = params.cutoff as u64;

  let mut x = 0;
  let mut j = 0;

  for (i, nuc) in kmer.iter().enumerate() {
    let nuc = *nuc as char;

    if i % 3 == 2 {
      continue; // skip every third nucleotide to pick up conserved patterns
    }

    if !"ACGT".contains(nuc) {
      return cutoff + 1; // break out of loop, return hash above cutoff
    }

    // A=11=3, C=10=2, G=00=0, T=01=1
    if "AC".contains(nuc) {
      x += 1 << j;
    }

    if "AT".contains(nuc) {
      x += 1 << (j + 1);
    }

    j += 2;
  }

  invertible_hash(x)
}

pub fn get_ref_search_minimizers(seq: &FastaRecord, params: &MinimizerIndexParams) -> Vec<u64> {
  let k = params.k as usize;
  let cutoff = params.cutoff as u64;

  let seq_str = preprocess_seq(&seq.seq);
  let n = seq_str.len().saturating_sub(k);
  let mut minimizers = Vec::with_capacity(n);
  for i in 0..n {
    let kmer = &seq_str.as_bytes()[i..i + k];
    let mhash = get_hash(kmer, params);
    // accept only hashes below cutoff --> reduces the size of the index and the number of lookups
    if mhash < cutoff {
      minimizers.push(mhash);
    }
  }
  minimizers.into_iter().unique().collect_vec()
}

fn preprocess_seq(seq: impl AsRef<str>) -> String {
  seq.as_ref().to_uppercase().replace('-', "")
}
