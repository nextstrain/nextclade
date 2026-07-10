//! Viterbi decoding of the observation vector into putative recombinant intervals.
//!
//! Log-space Viterbi assigns each site the most likely state. Contiguous recombinant runs become
//! half-open reference ranges, trimmed so endpoints fall on covered positions. Missing data stays
//! bridged; only leading/trailing uncovered flanks are excluded.

use crate::analyze::recombination::observations::RecombinationObs;
use crate::analyze::recombination::params::{RECOMBINANT, RecombinationHmmParams, WILDTYPE};
use crate::coord::position::PositionLike;
use crate::coord::range::NucRefGlobalRange;

/// Decode putative recombinant intervals from a per-site observation vector (reference coordinates).
///
/// Returns maximal recombinant runs as half-open ranges, trimmed so endpoints carry evidence.
pub(crate) fn find_recombinant_regions(
  obs: &[RecombinationObs],
  params: &RecombinationHmmParams,
) -> Vec<NucRefGlobalRange> {
  let is_recombinant = viterbi_decode(obs, params);
  let intervals = extract_recombinant_intervals(&is_recombinant);
  let regions = trim_intervals_to_covered(intervals, obs);

  // Postcondition: regions are well-formed and endpoints carry evidence.
  debug_assert!(
    are_intervals_sorted_disjoint_nonempty(&regions, obs.len()),
    "recombinant regions must be non-empty, sorted, disjoint and within bounds: {regions:?}"
  );
  debug_assert!(
    regions.iter().all(|r| {
      let covered = |i: usize| obs.get(i).is_some_and(|o| *o != RecombinationObs::Missing);
      covered(r.begin.as_usize()) && covered(r.end.as_usize() - 1)
    }),
    "recombinant region endpoints must fall on covered positions: {regions:?}"
  );
  regions
}

/// Well-formedness check: non-empty, within bounds, sorted, pairwise disjoint. Debug-only.
pub(crate) fn are_intervals_sorted_disjoint_nonempty(intervals: &[NucRefGlobalRange], len: usize) -> bool {
  let mut prev_end = 0;
  intervals.iter().all(|r| {
    let (begin, end) = (r.begin.as_usize(), r.end.as_usize());
    let ok = begin < end && end <= len && begin >= prev_end;
    prev_end = end;
    ok
  })
}

/// Viterbi decoding in log-space. Returns, per site, whether the most likely state is recombinant.
pub(crate) fn viterbi_decode(obs: &[RecombinationObs], params: &RecombinationHmmParams) -> Vec<bool> {
  let n = obs.len();
  if n == 0 {
    return vec![];
  }

  // Symmetric transition matrix: staying in a state costs `log(1 - gamma)`, switching costs `log(gamma)`.
  let log_stay = (1.0 - params.gamma()).ln();
  let log_switch = params.gamma().ln();
  let log_trans = |from: usize, to: usize| if from == to { log_stay } else { log_switch };

  // Uniform initial prior over the two states.
  let log_prior = 0.5_f64.ln();

  // `score[l][k]` = log-probability of the best path ending in state `k` at site `l`.
  // `back[l][k]` = the state at site `l - 1` on that best path.
  let mut score = vec![[f64::NEG_INFINITY; 2]; n];
  let mut back = vec![[WILDTYPE; 2]; n];

  let emit0 = params.compute_log_emission(obs[0]);
  score[0] = [log_prior + emit0[WILDTYPE], log_prior + emit0[RECOMBINANT]];

  for l in 1..n {
    let emit = params.compute_log_emission(obs[l]);
    for to in [WILDTYPE, RECOMBINANT] {
      let from_wildtype = score[l - 1][WILDTYPE] + log_trans(WILDTYPE, to);
      let from_recombinant = score[l - 1][RECOMBINANT] + log_trans(RECOMBINANT, to);
      let (best_prev, best_score) = if from_recombinant > from_wildtype {
        (RECOMBINANT, from_recombinant)
      } else {
        (WILDTYPE, from_wildtype)
      };
      score[l][to] = emit[to] + best_score;
      back[l][to] = best_prev;
    }
  }

  // Backtrace from the highest-scoring final state.
  let mut is_recombinant = vec![false; n];
  let mut state = if score[n - 1][RECOMBINANT] > score[n - 1][WILDTYPE] {
    RECOMBINANT
  } else {
    WILDTYPE
  };
  is_recombinant[n - 1] = state == RECOMBINANT;
  for l in (0..n - 1).rev() {
    state = back[l + 1][state];
    is_recombinant[l] = state == RECOMBINANT;
  }

  debug_assert_eq!(
    obs.len(),
    is_recombinant.len(),
    "decoded state vector must match observation length"
  );
  is_recombinant
}

/// Extract maximal runs of the recombinant state as 0-based half-open reference ranges.
fn extract_recombinant_intervals(is_recombinant: &[bool]) -> Vec<NucRefGlobalRange> {
  let mut regions = vec![];
  let mut begin: Option<usize> = None;
  for (i, &recombinant) in is_recombinant.iter().enumerate() {
    match (recombinant, begin) {
      (true, None) => begin = Some(i),
      (false, Some(start)) => {
        regions.push(NucRefGlobalRange::from_usize(start, i));
        begin = None;
      }
      _ => {}
    }
  }
  if let Some(start) = begin {
    regions.push(NucRefGlobalRange::from_usize(start, is_recombinant.len()));
  }

  debug_assert!(
    are_intervals_sorted_disjoint_nonempty(&regions, is_recombinant.len()),
    "extracted intervals must be non-empty, sorted, disjoint and within bounds: {regions:?}"
  );
  regions
}

/// Trim leading/trailing `Missing` from each interval. Internal `Missing` stays bridged.
/// All-`Missing` intervals are dropped.
fn trim_intervals_to_covered(intervals: Vec<NucRefGlobalRange>, obs: &[RecombinationObs]) -> Vec<NucRefGlobalRange> {
  let covered = |i: usize| obs.get(i).is_some_and(|o| *o != RecombinationObs::Missing);
  intervals
    .into_iter()
    .filter_map(|range| {
      let (begin, end) = (range.begin.as_usize(), range.end.as_usize());
      let first = (begin..end).find(|&i| covered(i))?;
      let last = (begin..end).rev().find(|&i| covered(i))?;
      Some(NucRefGlobalRange::from_usize(first, last + 1))
    })
    .collect()
}
