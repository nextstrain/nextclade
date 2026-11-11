//! Quality control of recombinant calls.
//!
//! The region checks drop decoded regions that rest on too little evidence: regions that consist mostly of missing
//! sites, and regions shorter than a minimal length. The sequence checks then drop all regions of a sequence whose
//! call is not localized (the regions cover most of the sequence), or whose rest outside the regions does not fit the
//! reference tree.

use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
use crate::analyze::recombination::observations::RecombinationObs;
use crate::coord::range::NucRefGlobalRange;
use crate::qc::qc_config::QcRulesConfigPrivateMutations;
use crate::qc::qc_rule_private_mutations::PrivateMutationCounts;

/// Keep the decoded regions that pass the region checks.
pub(crate) fn filter_regions(
  regions: Vec<NucRefGlobalRange>,
  obs: &[RecombinationObs],
  config: &RecombinationCallQcConfig,
) -> Vec<NucRefGlobalRange> {
  regions
    .into_iter()
    .filter(|region| is_region_supported(region, obs, config))
    .collect()
}

/// Apply the sequence checks to the regions that passed the region checks. Each check drops all regions; the checks
/// run in order: coverage, then the rest of the sequence.
pub(crate) fn check_sequence(
  regions: Vec<NucRefGlobalRange>,
  sequence: &SequenceQcInput,
  config: &RecombinationCallQcConfig,
) -> Vec<NucRefGlobalRange> {
  let is_accepted = !regions.is_empty()
    && compute_recombinant_fraction(&regions, sequence.alignment_range) <= config.max_recombinant_fraction
    && is_rest_consistent_with_tree(&regions, sequence, &config.private_mutations);
  if is_accepted { regions } else { vec![] }
}

/// Settings of the call checks, resolved once per dataset.
#[derive(Clone, Debug, PartialEq)]
pub struct RecombinationCallQcConfig {
  /// Minimal span of a region, in nucleotides
  pub min_region_length: usize,
  /// Maximal fraction of missing sites in the span of a region
  pub max_region_missing_fraction: f64,
  /// Maximal total span of the regions of a sequence, as a fraction of the span of its alignment range
  pub max_recombinant_fraction: f64,
  /// Private mutations QC rule, applied to the rest of the sequence outside the regions
  pub private_mutations: QcRulesConfigPrivateMutations,
}

/// Data of one sequence that the sequence checks read, in reference coordinates.
pub(crate) struct SequenceQcInput<'a> {
  /// Observation vector of the sequence, one entry per reference position
  pub obs: &'a [RecombinationObs],
  /// Aligned span of the sequence
  pub alignment_range: &'a NucRefGlobalRange,
  /// Private mutations of the sequence relative to its inferred parent
  pub private_nuc_mutations: &'a PrivateNucMutations,
}

/// Whether a region passes the region checks: its fraction of missing sites is at most
/// `max_region_missing_fraction`, and its span is at least `min_region_length`.
pub(crate) fn is_region_supported(
  region: &NucRefGlobalRange,
  obs: &[RecombinationObs],
  config: &RecombinationCallQcConfig,
) -> bool {
  compute_missing_fraction(region, obs) <= config.max_region_missing_fraction && region.len() >= config.min_region_length
}

/// Fraction of the sites in the span of a region that the decoder observes as `Missing`.
pub(crate) fn compute_missing_fraction(region: &NucRefGlobalRange, obs: &[RecombinationObs]) -> f64 {
  let span = region.len();
  if span == 0 {
    return 0.0;
  }
  let missing = obs
    .get(region.to_std())
    .map_or(span, |sites| sites.iter().filter(|o| **o == RecombinationObs::Missing).count());
  missing as f64 / span as f64
}

/// Total span of the regions divided by the span of the alignment range.
pub(crate) fn compute_recombinant_fraction(regions: &[NucRefGlobalRange], alignment_range: &NucRefGlobalRange) -> f64 {
  let total: usize = regions.iter().map(NucRefGlobalRange::len).sum();
  total as f64 / alignment_range.len() as f64
}

/// Whether the rest of the sequence outside the regions still fits the reference tree.
///
/// The private substitutions and private deletions inside the regions are removed, and the private mutations QC rule
/// weighs the remaining ones. The rest fails when the weighted total is at least `(typical + cutoff) * Lm / L`, where
/// `Lm` is the number of covered sites outside the regions and `L` is the reference length. This is the private
/// mutations score with `typical` and `cutoff` each scaled by `Lm / L` reaching 100, so a shorter rest gets a stricter
/// threshold. A rest without covered sites gives no evidence that the sequence fits the tree, and fails.
pub(crate) fn is_rest_consistent_with_tree(
  regions: &[NucRefGlobalRange],
  sequence: &SequenceQcInput,
  config: &QcRulesConfigPrivateMutations,
) -> bool {
  let ref_len = sequence.obs.len();
  let covered_inside: usize = regions.iter().map(|region| count_covered_in(region, sequence.obs)).sum();
  let covered_outside = count_covered(sequence.obs).saturating_sub(covered_inside);
  let counts = PrivateMutationCounts::count(sequence.private_nuc_mutations, |pos| {
    !regions.iter().any(|region| region.contains(pos))
  });
  let threshold = (*config.typical + *config.cutoff) * covered_outside as f64 / ref_len as f64;
  counts.weighted_total(config) < threshold
}

fn count_covered(obs: &[RecombinationObs]) -> usize {
  obs.iter().filter(|o| **o != RecombinationObs::Missing).count()
}

fn count_covered_in(region: &NucRefGlobalRange, obs: &[RecombinationObs]) -> usize {
  obs.get(region.to_std()).map_or(0, count_covered)
}
