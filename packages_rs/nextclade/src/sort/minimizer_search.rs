use crate::io::fasta::FastaRecord;
use crate::sort::minimizer_index::{MinimizerIndexJson, MinimizerIndexParams};
use eyre::Report;
use itertools::{izip, Itertools};
use ordered_float::OrderedFloat;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

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
) -> Result<MinimizerSearchResult, Report> {
  let normalization = &index.normalization;
  let n_refs = index.references.len();

  let minimizers = get_ref_search_minimizers(fasta_record, &index.params);
  let mut hit_counts = vec![0; n_refs];
  for m in minimizers {
    if let Some(mz) = index.minimizers.get(&m) {
      for i in 0..n_refs {
        hit_counts[i] += u64::from_str(&mz[i..=i])?;
      }
    }
  }

  // we expect hits to be proportional to the length of the sequence and the number of minimizers per reference
  let mut scores: Vec<f64> = vec![0.0; hit_counts.len()];
  for i in 0..n_refs {
    scores[i] = hit_counts[i] as f64 * normalization[i] / fasta_record.seq.len() as f64;
  }

  let max_score = scores.iter().copied().fold(0.0, f64::max);
  let total_hits: u64 = hit_counts.iter().sum();

  let datasets = izip!(&index.references, hit_counts, scores)
    .filter_map(|(ref_info, n_hits, score)| {
      (n_hits > 0 && score >= 0.01).then_some(MinimizerSearchDatasetResult {
        name: ref_info.name.clone(),
        length: ref_info.length,
        n_hits,
        score,
      })
    })
    .sorted_by_key(|result| -OrderedFloat(result.score))
    .collect_vec();

  Ok(MinimizerSearchResult {
    total_hits,
    max_score,
    datasets,
  })
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
