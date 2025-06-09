use crate::align::seed_match::IteratorSkipEveryExt;
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

  let hit_counts = calculate_minimizer_hits(fasta_record, index, n_refs);

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
        };

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

  best_dataset.and_then(|best_dataset| {
    results[&qry_index]
      .datasets
      .iter()
      .find(|d| d.name == best_dataset.name)
      .cloned()
  })
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetSuggestionStats {
  pub name: String,
  pub n_hits: usize,
  pub qry_indices: Vec<usize>,
}

const fn invertible_hash(x: u32) -> u32 {
  let mut x = (!x).wrapping_add(x << 21);
  x = x ^ (x >> 24);
  x = x.wrapping_add(x << 3).wrapping_add(x << 8);
  x = x ^ (x >> 14);
  x = x.wrapping_add(x << 2).wrapping_add(x << 4);
  x = x ^ (x >> 28);
  x = x.wrapping_add(x << 31);
  x
}

const INVALID_NUCLEOTIDE_VALUE: u8 = 4; // Sentinel value for invalid nucleotides

const NUCLEOTIDE_LOOKUP: [u8; 256] = {
  let mut table = [INVALID_NUCLEOTIDE_VALUE; 256]; // Use sentinel value 4 for invalid nucleotides
  table[b'A' as usize] = 0b11; // A=11=3
  table[b'a' as usize] = 0b11; // a=11=3
  table[b'T' as usize] = 0b10; // T=10=2
  table[b't' as usize] = 0b10; // t=10=2
  table[b'G' as usize] = 0b00; // G=00=0
  table[b'g' as usize] = 0b00; // g=00=0
  table[b'C' as usize] = 0b01; // C=01=1
  table[b'c' as usize] = 0b01; // c=01=1
  table
};

// Expects bit-encoded kmer where each nucleotide is represented by 2 bits
// A=11, C=10, G=00, T=01 and invalid nucleotides are represented by INVALID_NUCLEOTIDE_VALUE
fn get_hash(kmer: &[u8], params: &MinimizerIndexParams) -> u32 {
  let cutoff = params.cutoff as u32;

  let mut x: u32 = 0;
  let mut j: u8 = 0;

  // Skip every third nucleotide to pick up conserved patterns
  for &bits in kmer.iter().skip_every(3) {
    if bits == INVALID_NUCLEOTIDE_VALUE {
      return cutoff + 1; // invalid nucleotide
    }

    x |= (bits as u32) << j;
    j += 2;
  }

  invertible_hash(x)
}

pub fn calculate_minimizer_hits(
    fasta_record: &FastaRecord,
    index: &MinimizerIndexJson,
    n_refs: usize,
) -> Vec<u64> {
    let params = &index.params;
    let k = params.k as usize;
    let cutoff = params.cutoff as u32;

    let seq_str = preprocess_seq(&fasta_record.seq);

    seq_str.windows(k)
        .map(|kmer| get_hash(kmer, params))
        .filter(|&mhash| mhash < cutoff)
        .unique()
        .fold(vec![0; n_refs], |mut acc, m| {
            if let Some(locations) = index.minimizers.get(&m) {
                for &ref_idx in locations {
                    if let Some(count) = acc.get_mut(ref_idx) {
                        *count += 1;
                    }
                }
            }
            acc
        })
}

// Create a bit-packed representation of the kmer
// where each nucleotide is represented by 2 bits:
// A=11, C=10, G=00, T=01
// Invalid nucleotides are represented by INVALID_NUCLEOTIDE_VALUE
fn preprocess_seq(seq: impl AsRef<str>) -> Vec<u8>{
  seq.as_ref()
    .bytes()
    .filter_map(|b| {
      if b == b'-' {
        None // skip gaps
      } else {
        Some(NUCLEOTIDE_LOOKUP[b as usize])
      }
    })
    .collect()
}
