use crate::alphabet::letter::Letter;
use crate::alphabet::nuc::{Nuc, from_nuc, from_nuc_seq, is_nuc_subset, to_nuc};
use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
use crate::analyze::nuc_sub::NucSub;
use crate::analyze::nuc_sub_context::NucSubWithContext;
use crate::analyze::sliding_window_clusters::find_clusters;
use crate::analyze::virus_properties::{
  MutationPatternClusterConfig, MutationPatternConfig, MutationPatternEvent, MutationPatternNucSubstitution,
  MutationPatternsConfig,
};
use crate::coord::position::{NucRefGlobalPosition, PositionLike};
use crate::translate::complement::complement;
use crate::{make_error, make_internal_report};
use eyre::{Report, WrapErr};
use itertools::Itertools;
use regex_automata::meta::Regex as MetaRegex;
use regex_automata::{Anchored, Input};
use regex_syntax::ast::parse::Parser;
use regex_syntax::ast::print::Printer;
use regex_syntax::ast::{
  Alternation, Ast, ClassBracketed, ClassSet, ClassSetBinaryOp, ClassSetItem, ClassSetUnion, Concat, Group, Literal,
  LiteralKind, Repetition, Span,
};
use regex_syntax::hir;
use regex_syntax::hir::translate::Translator;
use regex_syntax::hir::{Capture, Class, ClassUnicode, ClassUnicodeRange, Hir, HirKind};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use strum::IntoEnumIterator;

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

/// Motif site that has its group in parentheses at the substituted position.
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[schemars(example = "MutationPatternMotifMatch::example")]
pub struct MutationPatternMotifMatch {
  /// Motif as written in the pattern configuration. For the opposite-strand event of an event with `bothStrands`, the
  /// reverse-complemented motif, in upper case.
  pub motif: String,

  /// 0-based first reference position included in the motif site.
  pub start: usize,

  /// 0-based position after the end of the motif site.
  pub end: usize,
}

impl MutationPatternMotifMatch {
  pub fn example() -> Self {
    Self {
      motif: "T(C)W".to_owned(),
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

  const fn without_motif_matches(substitution: NucSubWithContext) -> Self {
    Self::NucSubstitution(MutationPatternNucSubstitutionMatch {
      substitution,
      motif_matches: vec![],
    })
  }

  fn example_nuc_substitution(pos: usize, ref_nuc: Nuc, qry_nuc: Nuc) -> Self {
    Self::without_motif_matches(NucSubWithContext {
      sub: NucSub {
        pos: NucRefGlobalPosition::from(pos),
        ref_nuc,
        qry_nuc,
      },
      ref_context: vec![Nuc::A, ref_nuc, Nuc::G],
    })
  }
}

/// Matched nucleotide substitution and the motif sites that accepted it.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[schemars(example = "MutationPatternNucSubstitutionMatch::example")]
pub struct MutationPatternNucSubstitutionMatch {
  /// Nucleotide substitution plus the nucleotide context of the nearest tree node at the substituted position.
  #[serde(flatten)]
  pub substitution: NucSubWithContext,

  /// Motif sites of all matching pattern events that have their group at the substituted position, sorted by position.
  /// Empty when the matching events have no motifs.
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
      description: Some("ADAR-mediated A-to-I editing, observed as A>G, and as T>C on the opposite strand".to_owned()),
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

/// Mutation pattern configuration, validated and compiled once per dataset.
#[derive(Clone, Debug, Default)]
pub struct MutationPatterns {
  patterns: Vec<PreparedPattern>,
}

impl MutationPatterns {
  pub fn new(config: Option<&MutationPatternsConfig>) -> Result<Self, Report> {
    let Some(config) = config else {
      return Ok(Self::default());
    };

    let mut ids = BTreeSet::new();
    let patterns = config
      .patterns
      .iter()
      .map(|pattern| {
        if ids.insert(pattern.id.as_str()) {
          PreparedPattern::new(pattern)
        } else {
          make_error!("Mutation pattern id '{}' is used more than once", pattern.id)
        }
        .wrap_err_with(|| format!("When preparing mutation pattern '{}'", pattern.id))
      })
      .try_collect()?;

    Ok(Self { patterns })
  }

  pub const fn is_empty(&self) -> bool {
    self.patterns.is_empty()
  }

  /// Pattern ids, in configuration order
  pub fn ids(&self) -> impl Iterator<Item = &str> {
    self.patterns.iter().map(|pattern| pattern.id.as_str())
  }
}

/// Find mutation pattern matches and clusters among private nucleotide substitutions of one sequence.
///
/// Substitution types, nucleotide context and motif sites all refer to the sequence of the nearest tree node: the
/// reference sequence with `node_mutations` applied. The nearest node is the best available estimate of the sequence on
/// which the mutational process acted.
pub fn analyze_mutation_patterns(
  private_nuc_mutations: &PrivateNucMutations,
  ref_seq: &[Nuc],
  node_mutations: Option<&BTreeMap<NucRefGlobalPosition, Nuc>>,
  patterns: &MutationPatterns,
) -> MutationPatternsResults {
  let subs = &private_nuc_mutations.private_substitutions;

  let results = if patterns.is_empty() {
    vec![]
  } else if subs.is_empty() {
    patterns
      .patterns
      .iter()
      .map(|pattern| pattern.analyze(&[], ""))
      .collect_vec()
  } else {
    let node_seq = node_sequence(ref_seq, node_mutations);
    let context_subs = subs
      .iter()
      .map(|sub| NucSubWithContext::from_sub(sub, &node_seq))
      .collect_vec();
    let node_seq = from_nuc_seq(&node_seq);
    patterns
      .patterns
      .iter()
      .map(|pattern| pattern.analyze(&context_subs, &node_seq))
      .collect_vec()
  };

  MutationPatternsResults { results }
}

/// Reverse complement of a motif, in upper case: `t(c)w` -> `W(G)A`
pub fn opposite_strand_motif(motif: &str) -> Result<String, Report> {
  let ast = parse_motif(motif)?;
  let ast = map_motif_ast(&ast, &ReverseComplement)?;
  let mut printed = String::new();
  Printer::new().print(&ast, &mut printed)?;
  Ok(printed)
}

/// Reference sequence with the mutations of a tree node applied. A node deletion becomes a gap.
fn node_sequence(ref_seq: &[Nuc], node_mutations: Option<&BTreeMap<NucRefGlobalPosition, Nuc>>) -> Vec<Nuc> {
  let mut seq = ref_seq.to_vec();
  for (pos, nuc) in node_mutations.into_iter().flatten() {
    seq[pos.as_usize()] = *nuc;
  }
  seq
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
  /// Configured events, each followed by its opposite-strand event when it has `bothStrands`
  events: Vec<PreparedEvent>,
  cluster: Option<MutationPatternClusterConfig>,
}

impl PreparedPattern {
  fn new(config: &MutationPatternConfig) -> Result<Self, Report> {
    validate_pattern_id(&config.id)?;

    if let Some(cluster) = &config.cluster
      && cluster.window_size == 0
    {
      return make_error!("Mutation pattern cluster `windowSize` must be at least 1");
    }

    let events = config
      .events
      .iter()
      .map(PreparedEvent::new)
      .flatten_ok()
      .try_collect()?;

    Ok(Self {
      id: config.id.clone(),
      name: config.name.clone(),
      description: config.description.clone(),
      events,
      cluster: config.cluster.clone(),
    })
  }

  fn analyze(&self, subs: &[NucSubWithContext], node_seq: &str) -> MutationPatternResults {
    let matches = subs
      .iter()
      .filter_map(|sub| self.match_substitution(sub, node_seq))
      .collect_vec();

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

  /// Match a substitution against the union of all events: the substitution matches when at least one event accepts
  /// it, and its motif sites are those of all accepting events. The result does not depend on the order of events.
  fn match_substitution(&self, sub: &NucSubWithContext, node_seq: &str) -> Option<MutationPatternEventMatch> {
    if self.events.is_empty() {
      return Some(MutationPatternEventMatch::without_motif_matches(sub.clone()));
    }

    let accepting = self.events.iter().filter(|event| event.accepts(&sub.sub)).collect_vec();
    if accepting.is_empty() {
      return None;
    }

    let pos = sub.sub.pos.as_usize();
    let motif_matches = accepting
      .iter()
      .flat_map(|event| event.motif_sites(node_seq, pos))
      .sorted_by(|a, b| (a.start, a.end, &a.motif).cmp(&(b.start, b.end, &b.motif)))
      .dedup()
      .collect_vec();

    let accepted_without_motifs = accepting.iter().any(|event| !event.has_motifs());
    (accepted_without_motifs || !motif_matches.is_empty()).then(|| {
      MutationPatternEventMatch::NucSubstitution(MutationPatternNucSubstitutionMatch {
        substitution: sub.clone(),
        motif_matches,
      })
    })
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
  /// Prepare a configured event, followed by its opposite-strand event when requested
  fn new(event: &MutationPatternEvent) -> Result<Vec<Self>, Report> {
    match event {
      MutationPatternEvent::NucSubstitution(event) => Ok(
        PreparedNucSubstitution::new_with_opposite_strand(event)?
          .into_iter()
          .map(Self::NucSubstitution)
          .collect_vec(),
      ),
    }
  }

  fn accepts(&self, sub: &NucSub) -> bool {
    match self {
      Self::NucSubstitution(event) => event.accepts(sub),
    }
  }

  const fn has_motifs(&self) -> bool {
    match self {
      Self::NucSubstitution(event) => !event.motifs.is_empty(),
    }
  }

  fn motif_sites(&self, node_seq: &str, pos: usize) -> Vec<MutationPatternMotifMatch> {
    match self {
      Self::NucSubstitution(event) => event
        .motifs
        .iter()
        .flat_map(|motif| motif.sites_at(node_seq, pos))
        .collect_vec(),
    }
  }
}

#[derive(Clone, Debug)]
struct PreparedNucSubstitution {
  ref_nucs: Vec<Nuc>,
  qry_nucs: Vec<Nuc>,
  motifs: Vec<PreparedMotif>,
}

impl PreparedNucSubstitution {
  fn new_with_opposite_strand(event: &MutationPatternNucSubstitution) -> Result<Vec<Self>, Report> {
    let prepared = Self::new(&event.ref_nucs, &event.qry_nucs, &event.motifs)?;
    if !event.both_strands {
      return Ok(vec![prepared]);
    }

    let opposite = event
      .motifs
      .iter()
      .map(|motif| opposite_strand_motif(motif).wrap_err_with(|| format!("When reverse-complementing motif '{motif}'")))
      .try_collect()
      .and_then(|motifs: Vec<String>| {
        Self::new(
          &event.ref_nucs.iter().copied().map(complement).collect_vec(),
          &event.qry_nucs.iter().copied().map(complement).collect_vec(),
          &motifs,
        )
      })
      .wrap_err("When preparing the opposite-strand event of `bothStrands`")?;

    Ok(vec![prepared, opposite])
  }

  fn new(ref_nucs: &[Nuc], qry_nucs: &[Nuc], motifs: &[String]) -> Result<Self, Report> {
    if ref_nucs.is_empty() {
      return make_error!("Mutation pattern event `ref` must list at least one nucleotide");
    }
    if qry_nucs.is_empty() {
      return make_error!("Mutation pattern event `qry` must list at least one nucleotide");
    }
    let motifs = motifs
      .iter()
      .map(|motif| PreparedMotif::new(motif, ref_nucs).wrap_err_with(|| format!("When preparing motif '{motif}'")))
      .try_collect()?;
    Ok(Self {
      ref_nucs: ref_nucs.to_vec(),
      qry_nucs: qry_nucs.to_vec(),
      motifs,
    })
  }

  fn accepts(&self, sub: &NucSub) -> bool {
    self.ref_nucs.iter().any(|&filter| is_nuc_subset(sub.ref_nuc, filter))
      && self.qry_nucs.iter().any(|&filter| is_nuc_subset(sub.qry_nuc, filter))
  }
}

/// Motif compiled into a regex over nucleotide codes.
#[derive(Clone, Debug)]
struct PreparedMotif {
  motif: String,
  regex: MetaRegex,
  /// Maximum length of a motif site, or `None` when unbounded
  max_len: Option<usize>,
}

impl PreparedMotif {
  /// Parse, validate and compile a motif.
  ///
  /// The motif is parsed into a syntax tree, and letters are converted to upper case. Each IUPAC code is then replaced by
  /// a class of the bases it stands for (`W` -> `[AT]`), before negated classes are resolved, so that `[^W]` means
  /// `[CG]`. After translation, every class becomes the class of all codes whose bases it contains (`[AT]` ->
  /// `[ATW]`), so that ambiguous letters in the node sequence match only where all of their bases are allowed.
  fn new(motif: &str, ref_nucs: &[Nuc]) -> Result<Self, Report> {
    let ast = parse_motif(motif)?;
    let ast = map_motif_ast(&ast, &ExpandCodes)?;
    let hir = Translator::new()
      .translate(motif, &ast)
      .wrap_err("When parsing motif")?;
    let hir = to_code_classes(hir);

    let group = find_capture_group(&hir)?;
    validate_capture_group(group, ref_nucs)?;

    let max_len = hir.properties().maximum_len();
    let regex = MetaRegex::builder()
      .build_from_hir(&hir)
      .wrap_err("When compiling motif")?;

    Ok(Self {
      motif: motif.to_owned(),
      regex,
      max_len,
    })
  }

  /// Motif sites with the group at `pos`. A site is the leftmost-first match anchored at a start position; only starts
  /// from which a site can reach `pos` are searched.
  fn sites_at(&self, node_seq: &str, pos: usize) -> Vec<MutationPatternMotifMatch> {
    let first_start = self.max_len.map_or(0, |max_len| (pos + 1).saturating_sub(max_len));
    let mut caps = self.regex.create_captures();
    (first_start..=pos)
      .filter_map(|start| {
        let input = Input::new(node_seq).range(start..).anchored(Anchored::Yes);
        self.regex.search_captures(&input, &mut caps);
        let group = caps.get_group(1)?;
        let site = caps.get_match()?;
        (group.start == pos && group.end == pos + 1).then(|| MutationPatternMotifMatch {
          motif: self.motif.clone(),
          start: site.start(),
          end: site.end(),
        })
      })
      .collect_vec()
  }
}

/// Parse a motif into a syntax tree with upper-case nucleotide codes. Rejects characters that are not nucleotide codes.
fn parse_motif(motif: &str) -> Result<Ast, Report> {
  if motif.is_empty() {
    return make_error!("Mutation pattern motif cannot be empty");
  }
  let ast = Parser::new().parse(motif).wrap_err("When parsing motif")?;
  map_motif_ast(&ast, &UpperCaseCodes)
}

/// Sub-expression of the only capture group, which must be present in every match
fn find_capture_group(hir: &Hir) -> Result<&Hir, Report> {
  if hir.properties().static_explicit_captures_len() != Some(1) {
    return make_error!(
      "The motif must contain exactly one group in parentheses, which marks the mutated nucleotide, for example 'T(C)W'"
    );
  }
  find_capture(hir).ok_or_else(|| make_internal_report!("Motif capture group expected to exist, but not found"))
}

fn find_capture(hir: &Hir) -> Option<&Hir> {
  match hir.kind() {
    HirKind::Capture(Capture { sub, .. }) => Some(sub),
    HirKind::Repetition(hir::Repetition { sub, .. }) => find_capture(sub),
    HirKind::Concat(subs) | HirKind::Alternation(subs) => subs.iter().find_map(find_capture),
    HirKind::Empty | HirKind::Literal(_) | HirKind::Class(_) | HirKind::Look(_) => None,
  }
}

/// The group must match exactly one nucleotide, and must accept at least one nucleotide of the event `ref`
fn validate_capture_group(group: &Hir, ref_nucs: &[Nuc]) -> Result<(), Report> {
  let props = group.properties();
  if props.minimum_len() != Some(1) || props.maximum_len() != Some(1) {
    return make_error!("The group in parentheses must match exactly one nucleotide");
  }

  let group_regex = MetaRegex::builder()
    .build_from_hir(group)
    .wrap_err("When compiling the group in parentheses")?;
  let accepts_ref = Nuc::iter().any(|nuc| {
    let letter = from_nuc(nuc).to_string();
    group_regex.is_match(Input::new(&letter).anchored(Anchored::Yes))
      && ref_nucs.iter().any(|&filter| is_nuc_subset(nuc, filter))
  });
  if !accepts_ref {
    return make_error!(
      "The group in parentheses matches none of the event `ref` nucleotides: {}",
      ref_nucs.iter().map(|nuc| from_nuc(*nuc)).join(", ")
    );
  }
  Ok(())
}

/// Replace every class by the class of all nucleotide codes whose bases are bases of the class.
///
/// Literals are unchanged: after `ExpandCodes`, they contain only the unambiguous codes `A`, `C`, `G` and `T`.
fn to_code_classes(hir: Hir) -> Hir {
  match hir.into_kind() {
    HirKind::Class(class) => Hir::class(Class::Unicode(code_class(&class))),
    HirKind::Repetition(rep) => Hir::repetition(hir::Repetition {
      sub: Box::new(to_code_classes(*rep.sub)),
      ..rep
    }),
    HirKind::Capture(capture) => Hir::capture(Capture {
      sub: Box::new(to_code_classes(*capture.sub)),
      ..capture
    }),
    HirKind::Concat(subs) => Hir::concat(subs.into_iter().map(to_code_classes).collect_vec()),
    HirKind::Alternation(subs) => Hir::alternation(subs.into_iter().map(to_code_classes).collect_vec()),
    HirKind::Literal(hir::Literal(bytes)) => Hir::literal(bytes),
    HirKind::Empty => Hir::empty(),
    HirKind::Look(look) => Hir::look(look),
  }
}

fn code_class(class: &Class) -> ClassUnicode {
  let contains = |base: Nuc| {
    let letter = from_nuc(base);
    match class {
      Class::Unicode(class) => class
        .ranges()
        .iter()
        .any(|range| range.start() <= letter && letter <= range.end()),
      Class::Bytes(class) => class
        .ranges()
        .iter()
        .any(|range| char::from(range.start()) <= letter && letter <= char::from(range.end())),
    }
  };
  let bases = BASES.into_iter().filter(|&base| contains(base)).collect_vec();
  ClassUnicode::new(
    Nuc::iter()
      .filter(|&nuc| {
        !nuc.is_gap()
          && BASES
            .iter()
            .all(|&base| !is_nuc_subset(base, nuc) || bases.contains(&base))
      })
      .map(|nuc| ClassUnicodeRange::new(from_nuc(nuc), from_nuc(nuc))),
  )
}

const BASES: [Nuc; 4] = [Nuc::A, Nuc::C, Nuc::G, Nuc::T];

/// Replacement of the leaves of a motif syntax tree. `map_motif_ast` applies it to every literal and class item, and
/// reverses concatenations when `REVERSE` is set.
trait MotifAstMap {
  const REVERSE: bool = false;

  fn literal(&self, literal: &Literal) -> Result<Ast, Report>;

  fn class_literal(&self, literal: &Literal) -> Result<ClassSetItem, Report>;

  /// Leaves other than literals and bracketed classes: assertions, flags, `.`, `\w`, `\pL`
  fn other(&self, ast: &Ast) -> Result<Ast, Report> {
    Ok(ast.clone())
  }

  /// Class items other than literals and nested classes: ranges, `[:alpha:]`, `\w`, `\pL`
  fn other_class_item(&self, item: &ClassSetItem) -> Result<ClassSetItem, Report> {
    Ok(item.clone())
  }
}

fn map_motif_ast<M: MotifAstMap>(ast: &Ast, map: &M) -> Result<Ast, Report> {
  Ok(match ast {
    Ast::Literal(literal) => map.literal(literal)?,
    Ast::ClassBracketed(class) => Ast::class_bracketed(map_class_bracketed(class, map)?),
    Ast::Repetition(rep) => Ast::repetition(Repetition {
      span: rep.span,
      op: rep.op.clone(),
      greedy: rep.greedy,
      ast: Box::new(map_motif_ast(&rep.ast, map)?),
    }),
    Ast::Group(group) => Ast::group(Group {
      span: group.span,
      kind: group.kind.clone(),
      ast: Box::new(map_motif_ast(&group.ast, map)?),
    }),
    Ast::Alternation(alt) => Ast::alternation(Alternation {
      span: alt.span,
      asts: alt.asts.iter().map(|ast| map_motif_ast(ast, map)).try_collect()?,
    }),
    Ast::Concat(concat) => {
      let asts: Vec<Ast> = concat.asts.iter().map(|ast| map_motif_ast(ast, map)).try_collect()?;
      let asts = if M::REVERSE {
        asts.into_iter().rev().collect_vec()
      } else {
        asts
      };
      Ast::concat(Concat {
        span: concat.span,
        asts,
      })
    }
    Ast::Empty(_) | Ast::Flags(_) | Ast::Dot(_) | Ast::Assertion(_) | Ast::ClassUnicode(_) | Ast::ClassPerl(_) => {
      map.other(ast)?
    }
  })
}

fn map_class_bracketed<M: MotifAstMap>(class: &ClassBracketed, map: &M) -> Result<ClassBracketed, Report> {
  Ok(ClassBracketed {
    span: class.span,
    negated: class.negated,
    kind: map_class_set(&class.kind, map)?,
  })
}

fn map_class_set<M: MotifAstMap>(set: &ClassSet, map: &M) -> Result<ClassSet, Report> {
  Ok(match set {
    ClassSet::Item(item) => ClassSet::Item(map_class_set_item(item, map)?),
    ClassSet::BinaryOp(op) => ClassSet::BinaryOp(ClassSetBinaryOp {
      span: op.span,
      kind: op.kind,
      lhs: Box::new(map_class_set(&op.lhs, map)?),
      rhs: Box::new(map_class_set(&op.rhs, map)?),
    }),
  })
}

fn map_class_set_item<M: MotifAstMap>(item: &ClassSetItem, map: &M) -> Result<ClassSetItem, Report> {
  Ok(match item {
    ClassSetItem::Literal(literal) => map.class_literal(literal)?,
    ClassSetItem::Bracketed(class) => ClassSetItem::Bracketed(Box::new(map_class_bracketed(class, map)?)),
    ClassSetItem::Union(union) => ClassSetItem::Union(ClassSetUnion {
      span: union.span,
      items: union
        .items
        .iter()
        .map(|item| map_class_set_item(item, map))
        .try_collect()?,
    }),
    ClassSetItem::Empty(_)
    | ClassSetItem::Range(_)
    | ClassSetItem::Ascii(_)
    | ClassSetItem::Unicode(_)
    | ClassSetItem::Perl(_) => map.other_class_item(item)?,
  })
}

/// Convert letters to upper case, and reject characters that are not nucleotide codes and character ranges
struct UpperCaseCodes;

impl UpperCaseCodes {
  fn upper_case(literal: &Literal) -> Result<Literal, Report> {
    let c = literal.c.to_ascii_uppercase();
    match to_nuc(c) {
      Ok(nuc) if !nuc.is_gap() => Ok(Literal {
        span: literal.span,
        kind: LiteralKind::Verbatim,
        c,
      }),
      _ => make_error!("The character '{}' is not a nucleotide code", literal.c),
    }
  }
}

impl MotifAstMap for UpperCaseCodes {
  fn literal(&self, literal: &Literal) -> Result<Ast, Report> {
    Ok(Ast::literal(Self::upper_case(literal)?))
  }

  fn class_literal(&self, literal: &Literal) -> Result<ClassSetItem, Report> {
    Ok(ClassSetItem::Literal(Self::upper_case(literal)?))
  }

  fn other_class_item(&self, item: &ClassSetItem) -> Result<ClassSetItem, Report> {
    if let ClassSetItem::Range(range) = item {
      return make_error!(
        "Character ranges such as '{}-{}' are not supported. List the nucleotides instead, for example '[ACG]'",
        range.start.c,
        range.end.c
      );
    }
    Ok(item.clone())
  }
}

/// Replace each upper-case nucleotide code by the bases it stands for: `W` -> `[AT]`
struct ExpandCodes;

impl ExpandCodes {
  fn bases(literal: &Literal) -> Result<Vec<Literal>, Report> {
    let nuc = to_nuc(literal.c)?;
    Ok(
      BASES
        .into_iter()
        .filter(|&base| is_nuc_subset(base, nuc))
        .map(|base| Literal {
          span: literal.span,
          kind: LiteralKind::Verbatim,
          c: from_nuc(base),
        })
        .collect_vec(),
    )
  }

  fn union(span: Span, bases: Vec<Literal>) -> ClassSetUnion {
    ClassSetUnion {
      span,
      items: bases.into_iter().map(ClassSetItem::Literal).collect_vec(),
    }
  }
}

impl MotifAstMap for ExpandCodes {
  fn literal(&self, literal: &Literal) -> Result<Ast, Report> {
    let bases = Self::bases(literal)?;
    Ok(if let [base] = bases.as_slice() {
      Ast::literal(base.clone())
    } else {
      Ast::class_bracketed(ClassBracketed {
        span: literal.span,
        negated: false,
        kind: ClassSet::union(Self::union(literal.span, bases)),
      })
    })
  }

  fn class_literal(&self, literal: &Literal) -> Result<ClassSetItem, Report> {
    Ok(ClassSetItem::Union(Self::union(literal.span, Self::bases(literal)?)))
  }
}

/// Reverse concatenations and complement nucleotide codes. The capture group stays on the complemented nucleotide.
///
/// Rejects syntax whose meaning changes on the opposite strand: assertions (`^` is the start on one strand and the end
/// on the other), inline flags (they apply to what follows them), and named classes (`[[:xdigit:]]` contains `A` but not
/// its complement `T`).
struct ReverseComplement;

impl ReverseComplement {
  fn complement(literal: &Literal) -> Result<Literal, Report> {
    Ok(Literal {
      span: literal.span,
      kind: LiteralKind::Verbatim,
      c: from_nuc(complement(to_nuc(literal.c)?)),
    })
  }
}

impl MotifAstMap for ReverseComplement {
  const REVERSE: bool = true;

  fn literal(&self, literal: &Literal) -> Result<Ast, Report> {
    Ok(Ast::literal(Self::complement(literal)?))
  }

  fn class_literal(&self, literal: &Literal) -> Result<ClassSetItem, Report> {
    Ok(ClassSetItem::Literal(Self::complement(literal)?))
  }

  fn other(&self, ast: &Ast) -> Result<Ast, Report> {
    match ast {
      Ast::Assertion(_) => make_error!("Assertions such as '^', '$' or '\\b' cannot be used with `bothStrands`"),
      Ast::Flags(_) => make_error!("Inline flags such as '(?i)' cannot be used with `bothStrands`"),
      Ast::ClassUnicode(_) | Ast::ClassPerl(_) => {
        make_error!("Named classes such as '\\w' or '\\pL' cannot be used with `bothStrands`")
      }
      _ => Ok(ast.clone()),
    }
  }

  fn other_class_item(&self, item: &ClassSetItem) -> Result<ClassSetItem, Report> {
    match item {
      ClassSetItem::Ascii(_) | ClassSetItem::Unicode(_) | ClassSetItem::Perl(_) => {
        make_error!("Named classes such as '[:alpha:]', '\\w' or '\\pL' cannot be used with `bothStrands`")
      }
      _ => Ok(item.clone()),
    }
  }
}
