use crate::alphabet::nuc::{Nuc, from_nuc_seq, is_nuc_match};
use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
use crate::analyze::nuc_sub::NucSub;
use crate::analyze::nuc_sub_context::NucSubWithContext;
use crate::analyze::virus_properties::{
  MutationPatternClusterConfig, MutationPatternEvent, MutationPatternNucSubstitution, MutationPatternsConfig,
};
use crate::coord::position::{NucRefGlobalPosition, PositionLike};
use crate::qc::qc_config::QcRulesConfigSnpClusters;
use eyre::{Report, WrapErr};
use itertools::Itertools;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::collections::VecDeque;

/// Cluster of mutation pattern events detected within one sliding nucleotide window.
#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[schemars(example = "MutationPatternCluster::example")]
pub struct MutationPatternCluster {
  /// 0-based first reference position included in this cluster.
  pub start: usize,

  /// 0-based last reference position included in this cluster.
  pub end: usize,

  /// Number of matched events in this cluster.
  pub count: usize,

  /// Matched events belonging to this cluster, sorted by reference position.
  pub events: Vec<MutationPatternEventMatch>,

  /// Counts of event types within this cluster.
  pub event_type_counts: Vec<MutationPatternEventTypeCount>,
}

impl MutationPatternCluster {
  pub fn example() -> Self {
    Self {
      start: 5003,
      end: 5033,
      count: 2,
      events: vec![
        MutationPatternEventMatch::example_nuc_substitution(5003, Nuc::A, Nuc::G),
        MutationPatternEventMatch::example_nuc_substitution(5033, Nuc::A, Nuc::G),
      ],
      event_type_counts: vec![MutationPatternEventTypeCount::NucSubstitution(
        MutationPatternNucSubstitutionTypeCount {
          ref_nuc: Nuc::A,
          qry_nuc: Nuc::G,
          count: 2,
        },
      )],
    }
  }
}

/// Count of matched mutation pattern events of one event type.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(tag = "type", rename_all = "camelCase")]
#[schemars(example = "MutationPatternEventTypeCount::example")]
pub enum MutationPatternEventTypeCount {
  /// Count of nucleotide substitutions with the same reference and query nucleotide.
  NucSubstitution(MutationPatternNucSubstitutionTypeCount),
}

impl MutationPatternEventTypeCount {
  pub const fn example() -> Self {
    Self::NucSubstitution(MutationPatternNucSubstitutionTypeCount {
      ref_nuc: Nuc::A,
      qry_nuc: Nuc::G,
      count: 8,
    })
  }
}

/// Count of nucleotide substitution events sharing the same reference and query nucleotide.
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[schemars(example = "MutationPatternNucSubstitutionTypeCount::example")]
pub struct MutationPatternNucSubstitutionTypeCount {
  /// Reference nucleotide at the substituted position.
  pub ref_nuc: Nuc,

  /// Query nucleotide at the substituted position.
  pub qry_nuc: Nuc,

  /// Number of matching substitutions with this reference and query nucleotide pair.
  pub count: usize,
}

impl MutationPatternNucSubstitutionTypeCount {
  pub const fn example() -> Self {
    Self {
      ref_nuc: Nuc::A,
      qry_nuc: Nuc::G,
      count: 8,
    }
  }
}

/// Reference motif match that overlapped a mutation pattern event.
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[schemars(example = "MutationPatternMotifMatch::example")]
pub struct MutationPatternMotifMatch {
  /// Regular expression from the pattern configuration that matched the reference sequence.
  pub motif: String,

  /// 0-based first reference position included in the motif match.
  pub start: usize,

  /// 0-based position after the end of the motif match.
  pub end: usize,
}

impl MutationPatternMotifMatch {
  pub fn example() -> Self {
    Self {
      motif: "A[ACGT]G".to_owned(),
      start: 5002,
      end: 5005,
    }
  }
}

/// Matched mutation pattern event.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(tag = "type", rename_all = "camelCase")]
#[schemars(example = "MutationPatternEventMatch::example")]
pub enum MutationPatternEventMatch {
  /// Matched nucleotide substitution event.
  NucSubstitution(MutationPatternNucSubstitutionMatch),
}

impl MutationPatternEventMatch {
  pub fn example() -> Self {
    Self::example_nuc_substitution(5003, Nuc::A, Nuc::G)
  }

  const fn unmatched_nuc_substitution(substitution: NucSubWithContext) -> Self {
    Self::NucSubstitution(MutationPatternNucSubstitutionMatch {
      substitution,
      motif_matches: vec![],
    })
  }

  fn example_nuc_substitution(pos: usize, ref_nuc: Nuc, qry_nuc: Nuc) -> Self {
    Self::NucSubstitution(MutationPatternNucSubstitutionMatch {
      substitution: NucSubWithContext {
        sub: NucSub {
          pos: NucRefGlobalPosition::from(pos),
          ref_nuc,
          qry_nuc,
        },
        ref_context: vec![Nuc::A, ref_nuc, Nuc::G],
      },
      motif_matches: vec![MutationPatternMotifMatch {
        motif: "A[ACGT]G".to_owned(),
        start: pos.saturating_sub(1),
        end: pos + 2,
      }],
    })
  }
}

/// Matched nucleotide substitution and the reference motifs that accepted it.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[schemars(example = "MutationPatternNucSubstitutionMatch::example")]
pub struct MutationPatternNucSubstitutionMatch {
  /// Nucleotide substitution plus local reference context at the substituted position.
  #[serde(flatten)]
  pub substitution: NucSubWithContext,

  /// Motif matches that spanned the substituted position. Empty when the pattern event had no motif restriction.
  pub motif_matches: Vec<MutationPatternMotifMatch>,
}

impl MutationPatternNucSubstitutionMatch {
  pub fn example() -> Self {
    match MutationPatternEventMatch::example() {
      MutationPatternEventMatch::NucSubstitution(event) => event,
    }
  }
}

/// Summary counts for one mutation pattern.
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[schemars(example = "MutationPatternCounts::example")]
pub struct MutationPatternCounts {
  /// Number of private mutation events matching the pattern.
  pub matches: usize,

  /// Number of matching events that belong to reported clusters.
  pub clustered: usize,

  /// Number of clusters reported for this pattern.
  pub clusters: usize,
}

impl MutationPatternCounts {
  pub const fn example() -> Self {
    Self {
      matches: 14,
      clustered: 14,
      clusters: 2,
    }
  }
}

/// Results for a single mutation pattern.
#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[schemars(example = "MutationPatternResults::example")]
pub struct MutationPatternResults {
  /// Stable machine-readable pattern identifier copied from pathogen.json.
  pub id: String,

  /// Human-readable pattern name copied from pathogen.json.
  pub name: String,

  /// All private mutation events matching this pattern.
  pub matches: Vec<MutationPatternEventMatch>,

  /// Counts of matched event types across all `matches`.
  pub event_type_counts: Vec<MutationPatternEventTypeCount>,

  /// Pattern-local clusters detected among `matches`.
  pub clusters: Vec<MutationPatternCluster>,

  /// Summary counts for matches and clusters.
  pub counts: MutationPatternCounts,

  /// Optional explanatory text copied from pathogen.json.
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub description: Option<String>,
}

impl MutationPatternResults {
  pub fn example() -> Self {
    let cluster = MutationPatternCluster::example();
    Self {
      id: "adar".to_owned(),
      name: "ADAR-like RNA editing".to_owned(),
      matches: cluster.events.clone(),
      event_type_counts: cluster.event_type_counts.clone(),
      clusters: vec![cluster],
      counts: MutationPatternCounts {
        matches: 2,
        clustered: 2,
        clusters: 1,
      },
      description: Some("ADAR-mediated A-to-I editing observed as A>G and complementary T>C".to_owned()),
    }
  }
}

/// Mutation pattern analysis output. Contains per-pattern results.
#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[schemars(example = "MutationPatternsResults::example")]
pub struct MutationPatternsResults {
  /// Results for each configured mutation pattern. Empty when mutation pattern analysis is not configured and no global
  /// SNP cluster compatibility output is needed.
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub results: Vec<MutationPatternResults>,
}

impl MutationPatternsResults {
  pub fn example() -> Self {
    Self {
      results: vec![MutationPatternResults::example()],
    }
  }
}

/// Internal result containing both filtered (for output) and unfiltered (for QC) clusters.
pub struct MutationPatternAnalysis {
  pub results: MutationPatternsResults,
  pub qc_clusters: Vec<MutationPatternCluster>,
}

/// Trinucleotide context uses the global reference sequence, not the parent tree node state.
/// This matches mutational signature conventions: the enzyme acts on the physical genome,
/// and context is defined by the reference genome flanking the substituted position.
pub fn analyze_mutation_patterns(
  private_nuc_mutations: &PrivateNucMutations,
  ref_seq: &[Nuc],
  config: Option<&MutationPatternsConfig>,
  qc_snp_clusters_config: Option<&QcRulesConfigSnpClusters>,
) -> Result<MutationPatternAnalysis, Report> {
  let ref_seq_str = from_nuc_seq(ref_seq);
  let context_subs: Vec<NucSubWithContext> = private_nuc_mutations
    .private_substitutions
    .iter()
    .map(|sub| NucSubWithContext::from_sub(sub, ref_seq))
    .collect_vec();

  let all_events = context_subs
    .iter()
    .cloned()
    .map(MutationPatternEventMatch::unmatched_nuc_substitution)
    .collect_vec();
  let event_type_counts = compute_event_type_counts(&all_events);

  let patterns = config.map_or(&[][..], |c| &c.patterns);

  let (qc_window_size, qc_cluster_cut_off) = resolve_qc_config(qc_snp_clusters_config);

  let qc_clusters = if qc_window_size > 0 && qc_cluster_cut_off > 0 {
    find_clusters(&all_events, qc_window_size, qc_cluster_cut_off)
  } else {
    vec![]
  };

  let results = if patterns.is_empty() {
    if qc_clusters.is_empty() {
      vec![]
    } else {
      let total_clusters = qc_clusters.len();
      let total_clustered = qc_clusters.iter().map(|c| c.count).sum();
      vec![MutationPatternResults {
        id: "snp_clusters".to_owned(),
        name: "SNP clusters".to_owned(),
        matches: all_events,
        event_type_counts,
        clusters: qc_clusters.clone(),
        counts: MutationPatternCounts {
          matches: context_subs.len(),
          clustered: total_clustered,
          clusters: total_clusters,
        },
        description: None,
      }]
    }
  } else {
    patterns
      .iter()
      .map(|cfg| {
        let compiled_events = compile_events(&cfg.events)?;
        let matches = if compiled_events.is_empty() {
          context_subs
            .iter()
            .cloned()
            .map(MutationPatternEventMatch::unmatched_nuc_substitution)
            .collect_vec()
        } else {
          context_subs
            .iter()
            .filter_map(|s| match_event(s, &compiled_events, &ref_seq_str))
            .collect_vec()
        };
        let clusters = if let Some(cluster) = &cfg.cluster {
          find_clusters_with_config(&matches, cluster)
        } else {
          vec![]
        };
        let total_clusters = clusters.len();
        let total_clustered = clusters.iter().map(|c| c.count).sum();
        Ok(MutationPatternResults {
          id: cfg.id.clone(),
          name: cfg.name.clone(),
          event_type_counts: compute_event_type_counts(&matches),
          counts: MutationPatternCounts {
            matches: matches.len(),
            clustered: total_clustered,
            clusters: total_clusters,
          },
          matches,
          clusters,
          description: cfg.description.clone(),
        })
      })
      .collect::<Result<Vec<_>, Report>>()?
  };

  Ok(MutationPatternAnalysis {
    results: MutationPatternsResults { results },
    qc_clusters,
  })
}

fn compute_event_type_counts(events: &[MutationPatternEventMatch]) -> Vec<MutationPatternEventTypeCount> {
  let mut counts: BTreeMap<(Nuc, Nuc), usize> = BTreeMap::new();
  for event in events {
    let MutationPatternEventMatch::NucSubstitution(event) = event;
    *counts
      .entry((event.substitution.sub.ref_nuc, event.substitution.sub.qry_nuc))
      .or_default() += 1;
  }
  counts
    .into_iter()
    .map(|((ref_nuc, qry_nuc), count)| {
      MutationPatternEventTypeCount::NucSubstitution(MutationPatternNucSubstitutionTypeCount {
        ref_nuc,
        qry_nuc,
        count,
      })
    })
    .collect_vec()
}

fn event_match_position(event: &MutationPatternEventMatch) -> usize {
  match event {
    MutationPatternEventMatch::NucSubstitution(event) => event.substitution.sub.pos.as_usize(),
  }
}

fn compile_events(events: &[MutationPatternEvent]) -> Result<Vec<CompiledEvent>, Report> {
  events
    .iter()
    .map(CompiledEvent::new)
    .collect::<Result<Vec<_>, Report>>()
}

fn match_event(
  sub: &NucSubWithContext,
  events: &[CompiledEvent],
  ref_seq_str: &str,
) -> Option<MutationPatternEventMatch> {
  events
    .iter()
    .find_map(|event| event.match_substitution(sub, ref_seq_str))
}

fn find_clusters_with_config(
  events: &[MutationPatternEventMatch],
  config: &MutationPatternClusterConfig,
) -> Vec<MutationPatternCluster> {
  if config.window_size > 0 && config.cutoff > 0 {
    find_clusters(events, config.window_size, config.cutoff)
  } else {
    vec![]
  }
}

enum CompiledEvent {
  NucSubstitution(CompiledNucSubstitution),
}

impl CompiledEvent {
  fn new(event: &MutationPatternEvent) -> Result<Self, Report> {
    match event {
      MutationPatternEvent::NucSubstitution(event) => Ok(Self::NucSubstitution(CompiledNucSubstitution::new(event)?)),
    }
  }

  fn match_substitution(&self, sub: &NucSubWithContext, ref_seq_str: &str) -> Option<MutationPatternEventMatch> {
    match self {
      Self::NucSubstitution(event) => event.match_substitution(sub, ref_seq_str),
    }
  }
}

struct CompiledNucSubstitution {
  ref_nucs: Vec<Nuc>,
  qry: Vec<Nuc>,
  motifs: Vec<CompiledMotif>,
}

impl CompiledNucSubstitution {
  fn new(event: &MutationPatternNucSubstitution) -> Result<Self, Report> {
    Ok(Self {
      ref_nucs: event.ref_nucs.clone(),
      qry: event.qry.clone(),
      motifs: event
        .motifs
        .iter()
        .map(|motif| CompiledMotif::new(motif))
        .collect::<Result<Vec<_>, Report>>()?,
    })
  }

  fn match_substitution(&self, sub: &NucSubWithContext, ref_seq_str: &str) -> Option<MutationPatternEventMatch> {
    if !self.ref_nucs.iter().any(|nuc| is_nuc_match(*nuc, sub.sub.ref_nuc)) {
      return None;
    }
    if !self.qry.iter().any(|nuc| is_nuc_match(*nuc, sub.sub.qry_nuc)) {
      return None;
    }

    if self.motifs.is_empty() {
      return Some(MutationPatternEventMatch::unmatched_nuc_substitution(sub.clone()));
    }

    let motif_matches = self
      .motifs
      .iter()
      .flat_map(|motif| motif.find_matches_containing(ref_seq_str, sub.sub.pos.as_usize()))
      .collect_vec();

    if motif_matches.is_empty() {
      None
    } else {
      Some(MutationPatternEventMatch::NucSubstitution(
        MutationPatternNucSubstitutionMatch {
          substitution: sub.clone(),
          motif_matches,
        },
      ))
    }
  }
}

struct CompiledMotif {
  motif: String,
  regex: Regex,
}

impl CompiledMotif {
  fn new(motif: &str) -> Result<Self, Report> {
    if motif.is_empty() {
      eyre::bail!("Mutation pattern motif cannot be empty");
    }
    Ok(Self {
      motif: motif.to_owned(),
      regex: Regex::new(motif).wrap_err_with(|| format!("When compiling mutation pattern motif '{motif}'"))?,
    })
  }

  fn find_matches_containing(&self, ref_seq_str: &str, pos: usize) -> Vec<MutationPatternMotifMatch> {
    self
      .regex
      .find_iter(ref_seq_str)
      .filter(|m| m.start() <= pos && pos < m.end())
      .map(|m| MutationPatternMotifMatch {
        motif: self.motif.clone(),
        start: m.start(),
        end: m.end(),
      })
      .collect_vec()
  }
}

const fn resolve_qc_config(qc_snp_clusters_config: Option<&QcRulesConfigSnpClusters>) -> (usize, usize) {
  if let Some(qc_snp_clusters) = qc_snp_clusters_config {
    if qc_snp_clusters.enabled {
      (qc_snp_clusters.window_size, qc_snp_clusters.cluster_cut_off)
    } else {
      (0, 0)
    }
  } else {
    (0, 0)
  }
}

fn find_clusters(
  events: &[MutationPatternEventMatch],
  window_size: usize,
  cluster_cut_off: usize,
) -> Vec<MutationPatternCluster> {
  let mut current_window = VecDeque::<&MutationPatternEventMatch>::new();
  let mut all_clusters: Vec<Vec<&MutationPatternEventMatch>> = Vec::new();
  let mut previous_pos: isize = -1;

  for event in events {
    let pos = event_match_position(event) as isize;
    current_window.push_back(event);

    while (event_match_position(current_window[0]) as isize) < (pos - window_size as isize) {
      current_window.pop_front();
    }

    if current_window.len() > cluster_cut_off {
      let n_clusters = all_clusters.len();

      if !all_clusters.is_empty() && current_window.len() > 1 {
        let last_cluster = &all_clusters[n_clusters - 1];
        let last_pos = event_match_position(last_cluster[last_cluster.len() - 1]) as isize;

        if last_pos == previous_pos {
          all_clusters[n_clusters - 1].push(event);
        } else {
          all_clusters.push(current_window.iter().copied().collect_vec());
        }
      } else {
        all_clusters.push(current_window.iter().copied().collect_vec());
      }
    }
    previous_pos = pos;
  }

  for cluster in &mut all_clusters {
    cluster.sort_by_key(|event| event_match_position(event));
    cluster.dedup_by_key(|event| event_match_position(event));
  }

  all_clusters
    .into_iter()
    .map(|cluster_events| {
      let start = event_match_position(cluster_events[0]);
      let end = event_match_position(cluster_events[cluster_events.len() - 1]);
      let events: Vec<MutationPatternEventMatch> = cluster_events.into_iter().cloned().collect();
      let event_type_counts = compute_event_type_counts(&events);
      let count = events.len();
      MutationPatternCluster {
        start,
        end,
        count,
        events,
        event_type_counts,
      }
    })
    .collect_vec()
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::alphabet::nuc::to_nuc_seq;
  use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
  use crate::analyze::nuc_sub::NucSub;
  use crate::analyze::virus_properties::MutationPatternConfig;
  use crate::coord::position::NucRefGlobalPosition;
  use crate::io::json::{JsonPretty, json_parse, json_stringify};
  use eyre::Report;
  use pretty_assertions::assert_eq;
  use serde_json::Value;

  fn make_sub(pos: usize, ref_nuc: Nuc, qry_nuc: Nuc) -> NucSub {
    NucSub {
      pos: NucRefGlobalPosition::from(pos),
      ref_nuc,
      qry_nuc,
    }
  }

  fn make_private_muts(subs: Vec<NucSub>) -> PrivateNucMutations {
    let total = subs.len();
    PrivateNucMutations {
      private_substitutions: subs,
      total_private_substitutions: total,
      ..PrivateNucMutations::default()
    }
  }

  fn ref_seq_acgt(len: usize) -> Vec<Nuc> {
    let pattern = [Nuc::A, Nuc::C, Nuc::G, Nuc::T];
    (0..len).map(|i| pattern[i % 4]).collect()
  }

  fn wrap(patterns: Vec<MutationPatternConfig>) -> MutationPatternsConfig {
    MutationPatternsConfig { patterns }
  }

  fn cluster(window_size: usize, cutoff: usize) -> MutationPatternClusterConfig {
    MutationPatternClusterConfig { window_size, cutoff }
  }

  fn qc_cluster(window_size: usize, cluster_cut_off: usize) -> QcRulesConfigSnpClusters {
    QcRulesConfigSnpClusters {
      enabled: true,
      score_weight: ordered_float::OrderedFloat(50.0),
      window_size,
      cluster_cut_off,
    }
  }

  fn event_type_counts_map(counts: &[MutationPatternEventTypeCount]) -> BTreeMap<(Nuc, Nuc), usize> {
    counts
      .iter()
      .map(|c| match c {
        MutationPatternEventTypeCount::NucSubstitution(c) => ((c.ref_nuc, c.qry_nuc), c.count),
      })
      .collect()
  }

  fn event_type_counts_total(counts: &[MutationPatternEventTypeCount]) -> usize {
    counts
      .iter()
      .map(|c| match c {
        MutationPatternEventTypeCount::NucSubstitution(c) => c.count,
      })
      .sum()
  }

  fn assert_cluster_events_are_nuc_substitutions(cluster: &MutationPatternCluster, ref_nuc: Nuc, qry_nuc: Nuc) {
    for event in &cluster.events {
      let MutationPatternEventMatch::NucSubstitution(event) = event;
      assert_eq!(ref_nuc, event.substitution.sub.ref_nuc);
      assert_eq!(qry_nuc, event.substitution.sub.qry_nuc);
    }
  }

  fn pattern_all(window_size: usize, cutoff: usize) -> MutationPatternConfig {
    MutationPatternConfig {
      id: "all".to_owned(),
      name: "All private substitutions".to_owned(),
      cluster: Some(cluster(window_size, cutoff)),
      ..MutationPatternConfig::default()
    }
  }

  fn pattern_substitution(
    id: &str,
    name: &str,
    ref_nucs: Vec<Nuc>,
    qry: Vec<Nuc>,
    motifs: Vec<String>,
    window_size: usize,
    cutoff: usize,
  ) -> MutationPatternConfig {
    MutationPatternConfig {
      id: id.to_owned(),
      name: name.to_owned(),
      events: vec![MutationPatternEvent::NucSubstitution(MutationPatternNucSubstitution {
        ref_nucs,
        qry,
        motifs,
      })],
      cluster: Some(cluster(window_size, cutoff)),
      ..MutationPatternConfig::default()
    }
  }

  #[test]
  fn test_mutation_patterns_empty_input() -> Result<(), Report> {
    let private_muts = make_private_muts(vec![]);
    let ref_seq = ref_seq_acgt(100);
    let analysis = analyze_mutation_patterns(&private_muts, &ref_seq, None, None)?;
    assert!(analysis.results.results.is_empty());
    assert!(analysis.qc_clusters.is_empty());
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_type_counts() -> Result<(), Report> {
    let subs = vec![
      make_sub(10, Nuc::T, Nuc::C),
      make_sub(20, Nuc::T, Nuc::C),
      make_sub(30, Nuc::A, Nuc::G),
      make_sub(40, Nuc::C, Nuc::T),
    ];
    let private_muts = make_private_muts(subs);
    let ref_seq = ref_seq_acgt(100);
    let config = wrap(vec![pattern_all(100, 5)]);
    let qc = qc_cluster(100, 5);
    let analysis = analyze_mutation_patterns(&private_muts, &ref_seq, Some(&config), Some(&qc))?;
    let result = &analysis.results.results[0];

    let counts = event_type_counts_map(&result.event_type_counts);

    assert_eq!(Some(&2), counts.get(&(Nuc::T, Nuc::C)));
    assert_eq!(Some(&1), counts.get(&(Nuc::A, Nuc::G)));
    assert_eq!(Some(&1), counts.get(&(Nuc::C, Nuc::T)));
    assert_eq!(4, event_type_counts_total(&result.event_type_counts));
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_no_clusters_without_config() -> Result<(), Report> {
    let subs: Vec<NucSub> = (0..10).map(|i| make_sub(i * 5, Nuc::T, Nuc::C)).collect();
    let private_muts = make_private_muts(subs);
    let ref_seq = ref_seq_acgt(100);
    let analysis = analyze_mutation_patterns(&private_muts, &ref_seq, None, None)?;
    assert!(analysis.results.results.is_empty());
    assert!(analysis.qc_clusters.is_empty());
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_clusters_with_config() -> Result<(), Report> {
    let ref_seq = ref_seq_acgt(200);
    let subs: Vec<NucSub> = (0..10)
      .map(|i| {
        let pos = i * 5;
        make_sub(pos, ref_seq[pos], Nuc::C)
      })
      .collect();
    let private_muts = make_private_muts(subs);
    let config = wrap(vec![pattern_all(100, 5)]);
    let qc = qc_cluster(100, 3);
    let analysis = analyze_mutation_patterns(&private_muts, &ref_seq, Some(&config), Some(&qc))?;
    let result = &analysis.results.results[0];
    assert_eq!(1, result.counts.clusters);
    assert_eq!(10, result.counts.clustered);
    let cluster = &result.clusters[0];
    assert_eq!(0, cluster.start);
    assert_eq!(45, cluster.end);
    assert_eq!(10, cluster.count);
    assert_eq!(10, cluster.events.len());
    for event in &cluster.events {
      let pos = event_match_position(event);
      assert!(pos >= cluster.start);
      assert!(pos <= cluster.end);
    }
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_two_separate_clusters() -> Result<(), Report> {
    let ref_seq = ref_seq_acgt(2000);
    let mut subs = Vec::new();
    for i in 0..8 {
      let pos = i * 5;
      subs.push(make_sub(pos, ref_seq[pos], Nuc::C));
    }
    for i in 0..8 {
      let pos = 1000 + i * 5;
      subs.push(make_sub(pos, ref_seq[pos], Nuc::G));
    }
    let private_muts = make_private_muts(subs);
    let config = wrap(vec![pattern_all(100, 5)]);
    let qc = qc_cluster(100, 5);
    let analysis = analyze_mutation_patterns(&private_muts, &ref_seq, Some(&config), Some(&qc))?;
    let result = &analysis.results.results[0];
    assert_eq!(2, result.counts.clusters);
    assert!(result.clusters[0].end < result.clusters[1].start);
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_cutoff_boundary() -> Result<(), Report> {
    let ref_seq = ref_seq_acgt(200);
    let subs: Vec<NucSub> = (0..5)
      .map(|i| {
        let pos = i * 5;
        make_sub(pos, ref_seq[pos], Nuc::C)
      })
      .collect();
    let private_muts = make_private_muts(subs);
    let config = wrap(vec![pattern_all(100, 5)]);
    let qc = qc_cluster(100, 3);
    let analysis = analyze_mutation_patterns(&private_muts, &ref_seq, Some(&config), Some(&qc))?;
    assert_eq!(0, analysis.results.results[0].counts.clusters);
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_cutoff_plus_one() -> Result<(), Report> {
    let ref_seq = ref_seq_acgt(200);
    let subs: Vec<NucSub> = (0..6)
      .map(|i| {
        let pos = i * 5;
        make_sub(pos, ref_seq[pos], Nuc::C)
      })
      .collect();
    let private_muts = make_private_muts(subs);
    let config = wrap(vec![pattern_all(100, 5)]);
    let analysis = analyze_mutation_patterns(&private_muts, &ref_seq, Some(&config), None)?;
    assert_eq!(1, analysis.results.results[0].counts.clusters);
    assert_eq!(6, analysis.results.results[0].counts.clustered);
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_type_filter() -> Result<(), Report> {
    let subs = vec![
      make_sub(5, Nuc::T, Nuc::C),
      make_sub(10, Nuc::A, Nuc::G),
      make_sub(15, Nuc::T, Nuc::C),
      make_sub(20, Nuc::T, Nuc::C),
      make_sub(25, Nuc::A, Nuc::G),
      make_sub(30, Nuc::T, Nuc::C),
      make_sub(35, Nuc::T, Nuc::C),
      make_sub(40, Nuc::T, Nuc::C),
    ];
    let private_muts = make_private_muts(subs);
    let ref_seq = ref_seq_acgt(200);
    let config = wrap(vec![pattern_substitution(
      "tc",
      "T>C",
      vec![Nuc::T],
      vec![Nuc::C],
      vec![],
      100,
      5,
    )]);
    let qc = qc_cluster(100, 5);
    let analysis = analyze_mutation_patterns(&private_muts, &ref_seq, Some(&config), Some(&qc))?;
    let result = &analysis.results.results[0];
    assert_eq!(1, result.counts.clusters);
    for cluster in &result.clusters {
      assert_cluster_events_are_nuc_substitutions(cluster, Nuc::T, Nuc::C);
    }
    assert_eq!(6, event_type_counts_total(&result.event_type_counts));
    assert_eq!(6, result.counts.matches);
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_filter_separates_qc_from_filtered() -> Result<(), Report> {
    let subs = vec![
      make_sub(5, Nuc::A, Nuc::G),
      make_sub(10, Nuc::A, Nuc::G),
      make_sub(15, Nuc::A, Nuc::G),
      make_sub(20, Nuc::A, Nuc::G),
      make_sub(25, Nuc::A, Nuc::G),
      make_sub(30, Nuc::A, Nuc::G),
    ];
    let private_muts = make_private_muts(subs);
    let ref_seq = ref_seq_acgt(200);
    let config = wrap(vec![pattern_substitution(
      "tc",
      "T>C",
      vec![Nuc::T],
      vec![Nuc::C],
      vec![],
      100,
      5,
    )]);
    let qc = qc_cluster(100, 5);
    let analysis = analyze_mutation_patterns(&private_muts, &ref_seq, Some(&config), Some(&qc))?;
    assert_eq!(0, analysis.results.results[0].counts.clusters);
    assert_eq!(1, analysis.qc_clusters.len());
    assert_eq!(6, analysis.qc_clusters[0].count);
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_motif_filter_observable() -> Result<(), Report> {
    //          0         1         2         3
    //          01234567890123456789012345678901234
    let ref_seq = to_nuc_seq("ACGTATCATAACGTAACGTAACGTAACGTAACGTA")?;
    //                       ^^^  ***  ^^^  ^^^  ^^^  ^^^  ^^^
    //                       M1   X1   M2   M3   M4   M5   M6
    //                       ^ M1-M6: [ACGT]CG motif matches ACG contexts
    //                       * X1: [ACGT]CG motif rejects TCA context
    let subs = vec![
      make_sub(1, Nuc::C, Nuc::T),
      make_sub(6, Nuc::C, Nuc::T),
      make_sub(11, Nuc::C, Nuc::T),
      make_sub(16, Nuc::C, Nuc::T),
      make_sub(21, Nuc::C, Nuc::T),
      make_sub(26, Nuc::C, Nuc::T),
      make_sub(31, Nuc::C, Nuc::T),
    ];
    let private_muts = make_private_muts(subs);
    let config = json_parse::<MutationPatternsConfig>(
      r#"{
        "patterns": [
          {
            "id": "apobec",
            "name": "APOBEC-like",
            "events": [
              {
                "type": "nucSubstitution",
                "ref": ["C"],
                "qry": ["T"],
                "motifs": ["[ACGT]CG"]
              }
            ],
            "cluster": {
              "windowSize": 100,
              "cutoff": 3
            }
          }
        ]
      }"#,
    )?;
    let qc = qc_cluster(100, 3);
    let analysis = analyze_mutation_patterns(&private_muts, &ref_seq, Some(&config), Some(&qc))?;
    let result = &analysis.results.results[0];
    assert_eq!(1, result.counts.clusters);
    assert_eq!(6, result.matches.len());
    assert_eq!(6, result.clusters[0].count);
    assert!(result.matches.iter().any(|m| match m {
      MutationPatternEventMatch::NucSubstitution(m) => m.motif_matches.iter().any(|m| m.motif == "[ACGT]CG"),
    }));
    assert_eq!(1, analysis.qc_clusters.len());
    assert_eq!(7, analysis.qc_clusters[0].count);
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_output_shape_is_event_oriented() -> Result<(), Report> {
    let ref_seq = ref_seq_acgt(20);
    let private_muts = make_private_muts(vec![make_sub(3, Nuc::T, Nuc::C), make_sub(7, Nuc::T, Nuc::C)]);
    let config = wrap(vec![pattern_substitution(
      "tc",
      "T>C",
      vec![Nuc::T],
      vec![Nuc::C],
      vec![],
      100,
      1,
    )]);
    let analysis = analyze_mutation_patterns(&private_muts, &ref_seq, Some(&config), None)?;
    let actual = json_stringify(&analysis.results, JsonPretty(true))?;
    let actual = json_parse::<Value>(&actual)?;

    let result = &actual["results"][0];
    assert!(result.get("eventTypeCounts").is_some());
    assert!(result.get("counts").is_some());
    assert!(result.get("substitutionTypeCounts").is_none());
    assert!(result.get("totalClusters").is_none());
    assert!(result.get("totalClusteredSnps").is_none());

    let cluster = &result["clusters"][0];
    assert!(cluster.get("count").is_some());
    assert!(cluster.get("events").is_some());
    assert!(cluster.get("eventTypeCounts").is_some());
    assert!(cluster.get("numberOfSnps").is_none());
    assert!(cluster.get("substitutions").is_none());
    assert!(cluster.get("substitutionTypeCounts").is_none());

    Ok(())
  }

  #[test]
  fn test_mutation_patterns_motif_accepts_non_trinucleotide() -> Result<(), Report> {
    let result = json_parse::<MutationPatternEvent>(
      r#"{
        "type": "nucSubstitution",
        "ref": ["C"],
        "qry": ["T"],
        "motifs": ["TC"]
      }"#,
    )?;
    let MutationPatternEvent::NucSubstitution(result) = result;
    assert_eq!("TC", result.motifs[0]);
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_filter_matches_iupac() -> Result<(), Report> {
    let filter = MutationPatternEvent::NucSubstitution(MutationPatternNucSubstitution {
      ref_nucs: vec![Nuc::R],
      qry: vec![Nuc::N],
      motifs: vec![],
    });
    let compiled = compile_events(&[filter])?;
    let ref_seq = to_nuc_seq("AAA")?;
    let sub_a = NucSubWithContext::from_sub(&make_sub(1, Nuc::A, Nuc::G), &ref_seq);
    let sub_c = NucSubWithContext::from_sub(&make_sub(1, Nuc::C, Nuc::G), &ref_seq);
    assert!(match_event(&sub_a, &compiled, "AAA").is_some());
    assert!(match_event(&sub_c, &compiled, "ACA").is_none());
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_qc_config_fallback() -> Result<(), Report> {
    let subs: Vec<NucSub> = (0..10).map(|i| make_sub(i * 5, Nuc::T, Nuc::C)).collect();
    let private_muts = make_private_muts(subs);
    let ref_seq = ref_seq_acgt(200);
    let legacy = QcRulesConfigSnpClusters {
      enabled: true,
      score_weight: ordered_float::OrderedFloat(50.0),
      window_size: 100,
      cluster_cut_off: 5,
    };
    let analysis = analyze_mutation_patterns(&private_muts, &ref_seq, None, Some(&legacy))?;
    assert_eq!(1, analysis.results.results.len());
    assert_eq!(1, analysis.results.results[0].counts.clusters);
    assert_eq!(10, analysis.results.results[0].counts.clustered);
    assert_eq!(1, analysis.qc_clusters.len());
    assert_eq!(10, analysis.qc_clusters[0].count);
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_qc_config_disabled() -> Result<(), Report> {
    let subs: Vec<NucSub> = (0..10).map(|i| make_sub(i * 5, Nuc::T, Nuc::C)).collect();
    let private_muts = make_private_muts(subs);
    let ref_seq = ref_seq_acgt(200);
    let legacy = QcRulesConfigSnpClusters {
      enabled: false,
      score_weight: ordered_float::OrderedFloat(50.0),
      window_size: 100,
      cluster_cut_off: 5,
    };
    let analysis = analyze_mutation_patterns(&private_muts, &ref_seq, None, Some(&legacy))?;
    assert!(analysis.results.results.is_empty());
    assert!(analysis.qc_clusters.is_empty());
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_type_counts_use_matches() -> Result<(), Report> {
    let subs = vec![
      make_sub(5, Nuc::T, Nuc::C),
      make_sub(10, Nuc::A, Nuc::G),
      make_sub(15, Nuc::T, Nuc::C),
    ];
    let private_muts = make_private_muts(subs);
    let ref_seq = ref_seq_acgt(200);
    let config = wrap(vec![pattern_substitution(
      "tc",
      "T>C",
      vec![Nuc::T],
      vec![Nuc::C],
      vec![],
      100,
      1,
    )]);
    let analysis = analyze_mutation_patterns(&private_muts, &ref_seq, Some(&config), None)?;
    assert_eq!(
      2,
      event_type_counts_total(&analysis.results.results[0].event_type_counts)
    );
    assert_eq!(2, analysis.results.results[0].counts.matches);
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_pattern_cluster_does_not_override_qc_config() -> Result<(), Report> {
    let subs: Vec<NucSub> = (0..10).map(|i| make_sub(i * 5, Nuc::T, Nuc::C)).collect();
    let private_muts = make_private_muts(subs);
    let ref_seq = ref_seq_acgt(200);
    let config = wrap(vec![pattern_all(10, 5)]);
    let legacy = QcRulesConfigSnpClusters {
      enabled: true,
      score_weight: ordered_float::OrderedFloat(50.0),
      window_size: 100,
      cluster_cut_off: 5,
    };
    let with_new = analyze_mutation_patterns(&private_muts, &ref_seq, Some(&config), Some(&legacy))?;
    let without_new = analyze_mutation_patterns(&private_muts, &ref_seq, None, Some(&legacy))?;
    assert_eq!(without_new.qc_clusters.len(), with_new.qc_clusters.len());
    assert_eq!(without_new.qc_clusters[0].start, with_new.qc_clusters[0].start);
    assert_eq!(without_new.qc_clusters[0].end, with_new.qc_clusters[0].end);
    assert_eq!(without_new.qc_clusters[0].count, with_new.qc_clusters[0].count);
    assert_eq!(0, with_new.results.results[0].counts.clusters);
    assert_eq!(1, with_new.qc_clusters.len());
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_multiple_configs() -> Result<(), Report> {
    let subs = vec![
      make_sub(5, Nuc::T, Nuc::C),
      make_sub(10, Nuc::A, Nuc::G),
      make_sub(15, Nuc::T, Nuc::C),
      make_sub(20, Nuc::T, Nuc::C),
      make_sub(25, Nuc::A, Nuc::G),
      make_sub(30, Nuc::T, Nuc::C),
      make_sub(35, Nuc::T, Nuc::C),
      make_sub(40, Nuc::T, Nuc::C),
    ];
    let private_muts = make_private_muts(subs);
    let ref_seq = ref_seq_acgt(200);
    let config = wrap(vec![
      MutationPatternConfig {
        description: Some("T>C editing".to_owned()),
        ..pattern_substitution("tc", "T>C", vec![Nuc::T], vec![Nuc::C], vec![], 100, 5)
      },
      MutationPatternConfig {
        description: Some("A>G editing".to_owned()),
        ..pattern_substitution("ag", "A>G", vec![Nuc::A], vec![Nuc::G], vec![], 100, 1)
      },
    ]);
    let analysis = analyze_mutation_patterns(&private_muts, &ref_seq, Some(&config), None)?;
    let results = &analysis.results.results;
    assert_eq!(2, results.len());
    assert_eq!(1, results[0].counts.clusters);
    assert_eq!(Some("T>C editing"), results[0].description.as_deref());
    assert_eq!(1, results[1].counts.clusters);
    assert_eq!(Some("A>G editing"), results[1].description.as_deref());
    for cluster in &results[0].clusters {
      assert_cluster_events_are_nuc_substitutions(cluster, Nuc::T, Nuc::C);
    }
    for cluster in &results[1].clusters {
      assert_cluster_events_are_nuc_substitutions(cluster, Nuc::A, Nuc::G);
    }
    Ok(())
  }
}
