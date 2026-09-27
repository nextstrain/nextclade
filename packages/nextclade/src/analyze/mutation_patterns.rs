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
