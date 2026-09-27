use crate::alphabet::nuc::{Nuc, from_nuc_seq, is_nuc_match};
use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
use crate::analyze::nuc_sub::NucSub;
use crate::analyze::nuc_sub_context::NucSubWithContext;
use crate::analyze::virus_properties::{
  MutationPatternClusterConfig, MutationPatternConfig, MutationPatternEvent, MutationPatternNucSubstitution,
  MutationPatternsConfig,
};
use crate::coord::position::{NucRefGlobalPosition, PositionLike};
use crate::make_error;
use crate::qc::qc_config::QcRulesConfigSnpClusters;
use crate::qc::qc_rule_snp_clusters::ClusteredSnp;
use eyre::{Report, WrapErr};
use itertools::Itertools;
use regex_automata::meta::Regex as MetaRegex;
use regex_automata::{Anchored, Input};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet, VecDeque};

/// Cluster of matched events. A cluster grows while consecutive sliding windows each hold more than `cutoff` events;
/// adjacent clusters can share events.
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
      motif: "TC[AT]".to_owned(),
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
      motif_matches: vec![],
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

  /// Motif sites that contain the substituted position. Empty when the matching pattern event has no motifs.
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

  /// Number of distinct matched events that belong to reported clusters. Clusters can share events; each event counts once.
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
  /// Results for each configured mutation pattern, in configuration order. Empty when no patterns are configured.
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub results: Vec<MutationPatternResults>,
}

impl MutationPatternsResults {
  pub const fn is_empty(&self) -> bool {
    self.results.is_empty()
  }

  pub fn example() -> Self {
    Self {
      results: vec![MutationPatternResults::example()],
    }
  }
}

/// Mutation pattern analysis of one sequence: per-pattern results for output, and SNP clusters for the QC rule.
pub struct MutationPatternAnalysis {
  pub results: MutationPatternsResults,
  pub qc_clusters: Vec<ClusteredSnp>,
}

/// Mutation pattern configuration, validated and prepared for one reference sequence.
///
/// Built once per dataset. Motif sites are located in the reference sequence in advance, so the analysis of each
/// sequence only looks up the sites around each substitution.
#[derive(Clone, Debug, Default)]
pub struct MutationPatterns {
  patterns: Vec<PreparedPattern>,
}

impl MutationPatterns {
  pub fn new(config: Option<&MutationPatternsConfig>, ref_seq: &[Nuc]) -> Result<Self, Report> {
    let Some(config) = config else {
      return Ok(Self::default());
    };

    let mut ids = BTreeSet::new();
    for pattern in &config.patterns {
      if !ids.insert(pattern.id.as_str()) {
        return make_error!("Mutation pattern id '{}' is used more than once", pattern.id);
      }
    }

    let ref_seq_str = from_nuc_seq(ref_seq);
    let patterns = config
      .patterns
      .iter()
      .map(|pattern| {
        PreparedPattern::new(pattern, &ref_seq_str)
          .wrap_err_with(|| format!("When preparing mutation pattern '{}'", pattern.id))
      })
      .collect::<Result<Vec<_>, Report>>()?;

    Ok(Self { patterns })
  }

  pub const fn is_empty(&self) -> bool {
    self.patterns.is_empty()
  }
}

/// Find mutation pattern matches and clusters among private nucleotide substitutions of one sequence, and the SNP
/// clusters used by the `qc.snpClusters` rule.
///
/// Reference context and motifs use the global reference sequence, not the sequence of the nearest tree node.
pub fn analyze_mutation_patterns(
  private_nuc_mutations: &PrivateNucMutations,
  ref_seq: &[Nuc],
  patterns: &MutationPatterns,
  qc_snp_clusters_config: Option<&QcRulesConfigSnpClusters>,
) -> MutationPatternAnalysis {
  let subs = &private_nuc_mutations.private_substitutions;

  let qc_clusters = qc_snp_clusters_config
    .filter(|qc| qc.enabled)
    .map(|qc| {
      find_clusters(subs, |sub| sub.pos.as_usize(), qc.window_size, qc.cluster_cut_off)
        .into_iter()
        .map(|cluster| ClusteredSnp {
          start: cluster[0].pos.as_usize(),
          end: cluster[cluster.len() - 1].pos.as_usize(),
          number_of_snps: cluster.len(),
        })
        .collect_vec()
    })
    .unwrap_or_default();

  let results = if patterns.is_empty() {
    vec![]
  } else {
    let context_subs = subs
      .iter()
      .map(|sub| NucSubWithContext::from_sub(sub, ref_seq))
      .collect_vec();
    patterns
      .patterns
      .iter()
      .map(|pattern| pattern.analyze(&context_subs))
      .collect_vec()
  };

  MutationPatternAnalysis {
    results: MutationPatternsResults { results },
    qc_clusters,
  }
}

/// Group items, sorted by unique position, into clusters of more than `cluster_cut_off` items within `window_size`
/// nucleotides.
///
/// Sliding-window scan. Each item enters the window, and items more than `window_size` positions upstream of it leave
/// the window. When the window holds more than `cluster_cut_off` items, the item extends the previous cluster if the
/// previous item is the last member of that cluster. Otherwise all items of the window start a new cluster, which can
/// share items with the previous cluster. This is the algorithm of the `qc.snpClusters` rule.
fn find_clusters<T>(
  items: &[T],
  position: impl Fn(&T) -> usize,
  window_size: usize,
  cluster_cut_off: usize,
) -> Vec<Vec<&T>> {
  let mut window = VecDeque::<&T>::new();
  let mut clusters: Vec<Vec<&T>> = Vec::new();
  let mut previous_pos: Option<usize> = None;

  for item in items {
    let pos = position(item);
    window.push_back(item);

    while position(window[0]) + window_size < pos {
      window.pop_front();
    }

    if window.len() > cluster_cut_off {
      let extends_last_cluster = window.len() > 1
        && clusters
          .last()
          .and_then(|cluster| cluster.last())
          .is_some_and(|last| Some(position(last)) == previous_pos);

      if extends_last_cluster {
        clusters.last_mut().expect("checked above").push(item);
      } else {
        clusters.push(window.iter().copied().collect_vec());
      }
    }
    previous_pos = Some(pos);
  }

  clusters
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

#[derive(Clone, Debug)]
struct PreparedPattern {
  id: String,
  name: String,
  description: Option<String>,
  events: Vec<PreparedEvent>,
  cluster: Option<MutationPatternClusterConfig>,
}

impl PreparedPattern {
  fn new(config: &MutationPatternConfig, ref_seq_str: &str) -> Result<Self, Report> {
    validate_pattern_id(&config.id)?;

    if let Some(cluster) = &config.cluster
      && cluster.window_size == 0
    {
      return make_error!("Mutation pattern cluster `windowSize` must be at least 1");
    }

    let events = config
      .events
      .iter()
      .map(|event| PreparedEvent::new(event, ref_seq_str))
      .collect::<Result<Vec<_>, Report>>()?;

    Ok(Self {
      id: config.id.clone(),
      name: config.name.clone(),
      description: config.description.clone(),
      events,
      cluster: config.cluster.clone(),
    })
  }

  fn analyze(&self, subs: &[NucSubWithContext]) -> MutationPatternResults {
    let matches = if self.events.is_empty() {
      subs
        .iter()
        .cloned()
        .map(MutationPatternEventMatch::unmatched_nuc_substitution)
        .collect_vec()
    } else {
      subs
        .iter()
        .filter_map(|sub| self.events.iter().find_map(|event| event.match_substitution(sub)))
        .collect_vec()
    };

    let clusters = self
      .cluster
      .as_ref()
      .map(|cluster| {
        find_clusters(&matches, event_match_position, cluster.window_size, cluster.cutoff)
          .into_iter()
          .map(|events| {
            let events = events.into_iter().cloned().collect_vec();
            MutationPatternCluster {
              start: event_match_position(&events[0]),
              end: event_match_position(&events[events.len() - 1]),
              count: events.len(),
              event_type_counts: compute_event_type_counts(&events),
              events,
            }
          })
          .collect_vec()
      })
      .unwrap_or_default();

    // Clusters can share events, so count each clustered event once
    let clustered = clusters
      .iter()
      .flat_map(|cluster| cluster.events.iter().map(event_match_position))
      .unique()
      .count();

    MutationPatternResults {
      id: self.id.clone(),
      name: self.name.clone(),
      event_type_counts: compute_event_type_counts(&matches),
      counts: MutationPatternCounts {
        matches: matches.len(),
        clustered,
        clusters: clusters.len(),
      },
      matches,
      clusters,
      description: self.description.clone(),
    }
  }
}

/// Reject ids that cannot be written unambiguously in TSV column names such as `mutationPatterns['<id>'].counts.matches`
fn validate_pattern_id(id: &str) -> Result<(), Report> {
  if id.is_empty() {
    return make_error!("Mutation pattern id cannot be empty");
  }
  if let Some(c) = id.chars().find(|c| matches!(c, '\'' | '[' | ']')) {
    return make_error!("Mutation pattern id '{id}' contains the character '{c}', which is not allowed");
  }
  Ok(())
}

#[derive(Clone, Debug)]
enum PreparedEvent {
  NucSubstitution(PreparedNucSubstitution),
}

impl PreparedEvent {
  fn new(event: &MutationPatternEvent, ref_seq_str: &str) -> Result<Self, Report> {
    match event {
      MutationPatternEvent::NucSubstitution(event) => {
        Ok(Self::NucSubstitution(PreparedNucSubstitution::new(event, ref_seq_str)?))
      }
    }
  }

  fn match_substitution(&self, sub: &NucSubWithContext) -> Option<MutationPatternEventMatch> {
    match self {
      Self::NucSubstitution(event) => event.match_substitution(sub),
    }
  }
}

#[derive(Clone, Debug)]
struct PreparedNucSubstitution {
  ref_nucs: Vec<Nuc>,
  qry: Vec<Nuc>,
  motifs: Vec<MotifSites>,
}

impl PreparedNucSubstitution {
  fn new(event: &MutationPatternNucSubstitution, ref_seq_str: &str) -> Result<Self, Report> {
    if event.ref_nucs.is_empty() {
      return make_error!("Mutation pattern event `ref` must list at least one nucleotide");
    }
    if event.qry.is_empty() {
      return make_error!("Mutation pattern event `qry` must list at least one nucleotide");
    }
    Ok(Self {
      ref_nucs: event.ref_nucs.clone(),
      qry: event.qry.clone(),
      motifs: event
        .motifs
        .iter()
        .map(|motif| MotifSites::new(motif, ref_seq_str))
        .collect::<Result<Vec<_>, Report>>()?,
    })
  }

  fn match_substitution(&self, sub: &NucSubWithContext) -> Option<MutationPatternEventMatch> {
    if !self.ref_nucs.iter().any(|nuc| is_nuc_match(*nuc, sub.sub.ref_nuc)) {
      return None;
    }
    if !self.qry.iter().any(|nuc| is_nuc_match(*nuc, sub.sub.qry_nuc)) {
      return None;
    }

    if self.motifs.is_empty() {
      return Some(MutationPatternEventMatch::unmatched_nuc_substitution(sub.clone()));
    }

    let pos = sub.sub.pos.as_usize();
    let motif_matches = self
      .motifs
      .iter()
      .flat_map(|motif| motif.matches_containing(pos))
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

/// All sites of the reference sequence where a motif regex matches.
///
/// A site is the leftmost-first match anchored at a given start position. Sites are collected for every start position,
/// so sites can overlap.
#[derive(Clone, Debug)]
struct MotifSites {
  motif: String,
  /// Half-open `[start, end)` ranges, sorted by start
  sites: Vec<(usize, usize)>,
  max_site_len: usize,
}

impl MotifSites {
  fn new(motif: &str, ref_seq_str: &str) -> Result<Self, Report> {
    if motif.is_empty() {
      return make_error!("Mutation pattern motif cannot be empty");
    }
    let regex = MetaRegex::new(motif).wrap_err_with(|| format!("When compiling mutation pattern motif '{motif}'"))?;

    let sites = (0..ref_seq_str.len())
      .filter_map(|start| {
        let input = Input::new(ref_seq_str).range(start..).anchored(Anchored::Yes);
        regex
          .search(&input)
          .filter(|m| !m.is_empty())
          .map(|m| (m.start(), m.end()))
      })
      .collect_vec();

    let max_site_len = sites.iter().map(|(start, end)| end - start).max().unwrap_or_default();

    Ok(Self {
      motif: motif.to_owned(),
      sites,
      max_site_len,
    })
  }

  fn matches_containing(&self, pos: usize) -> impl Iterator<Item = MutationPatternMotifMatch> + '_ {
    let min_start = (pos + 1).saturating_sub(self.max_site_len);
    let lo = self.sites.partition_point(|(start, _)| *start < min_start);
    let hi = self.sites.partition_point(|(start, _)| *start <= pos);
    self.sites[lo..hi]
      .iter()
      .filter(move |(_, end)| pos < *end)
      .map(|&(start, end)| MutationPatternMotifMatch {
        motif: self.motif.clone(),
        start,
        end,
      })
  }
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

  fn analyze(
    private_nuc_mutations: &PrivateNucMutations,
    ref_seq: &[Nuc],
    config: Option<&MutationPatternsConfig>,
    qc: Option<&QcRulesConfigSnpClusters>,
  ) -> Result<MutationPatternAnalysis, Report> {
    let patterns = MutationPatterns::new(config, ref_seq)?;
    Ok(analyze_mutation_patterns(private_nuc_mutations, ref_seq, &patterns, qc))
  }

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
    let analysis = analyze(&private_muts, &ref_seq, None, None)?;
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
    let analysis = analyze(&private_muts, &ref_seq, Some(&config), Some(&qc))?;
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
    let analysis = analyze(&private_muts, &ref_seq, None, None)?;
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
    let analysis = analyze(&private_muts, &ref_seq, Some(&config), Some(&qc))?;
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
    let analysis = analyze(&private_muts, &ref_seq, Some(&config), Some(&qc))?;
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
    let analysis = analyze(&private_muts, &ref_seq, Some(&config), Some(&qc))?;
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
    let analysis = analyze(&private_muts, &ref_seq, Some(&config), None)?;
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
    let analysis = analyze(&private_muts, &ref_seq, Some(&config), Some(&qc))?;
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
    let analysis = analyze(&private_muts, &ref_seq, Some(&config), Some(&qc))?;
    assert_eq!(0, analysis.results.results[0].counts.clusters);
    assert_eq!(1, analysis.qc_clusters.len());
    assert_eq!(6, analysis.qc_clusters[0].number_of_snps);
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
    let analysis = analyze(&private_muts, &ref_seq, Some(&config), Some(&qc))?;
    let result = &analysis.results.results[0];
    assert_eq!(1, result.counts.clusters);
    assert_eq!(6, result.matches.len());
    assert_eq!(6, result.clusters[0].count);
    assert!(result.matches.iter().any(|m| match m {
      MutationPatternEventMatch::NucSubstitution(m) => m.motif_matches.iter().any(|m| m.motif == "[ACGT]CG"),
    }));
    assert_eq!(1, analysis.qc_clusters.len());
    assert_eq!(7, analysis.qc_clusters[0].number_of_snps);
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
    let analysis = analyze(&private_muts, &ref_seq, Some(&config), None)?;
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
    let ref_seq = to_nuc_seq("ACA")?;
    let event = PreparedEvent::new(&filter, &from_nuc_seq(&ref_seq))?;
    let sub_a = NucSubWithContext::from_sub(&make_sub(0, Nuc::A, Nuc::G), &ref_seq);
    let sub_c = NucSubWithContext::from_sub(&make_sub(1, Nuc::C, Nuc::G), &ref_seq);
    assert!(event.match_substitution(&sub_a).is_some());
    assert!(event.match_substitution(&sub_c).is_none());
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
    let analysis = analyze(&private_muts, &ref_seq, None, Some(&legacy))?;
    assert!(analysis.results.is_empty());
    assert_eq!(1, analysis.qc_clusters.len());
    assert_eq!(10, analysis.qc_clusters[0].number_of_snps);
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
    let analysis = analyze(&private_muts, &ref_seq, None, Some(&legacy))?;
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
    let analysis = analyze(&private_muts, &ref_seq, Some(&config), None)?;
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
    let with_new = analyze(&private_muts, &ref_seq, Some(&config), Some(&legacy))?;
    let without_new = analyze(&private_muts, &ref_seq, None, Some(&legacy))?;
    assert_eq!(without_new.qc_clusters.len(), with_new.qc_clusters.len());
    assert_eq!(without_new.qc_clusters[0].start, with_new.qc_clusters[0].start);
    assert_eq!(without_new.qc_clusters[0].end, with_new.qc_clusters[0].end);
    assert_eq!(without_new.qc_clusters[0].number_of_snps, with_new.qc_clusters[0].number_of_snps);
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
    let analysis = analyze(&private_muts, &ref_seq, Some(&config), None)?;
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
