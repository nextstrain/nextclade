use crate::analyze::aa_del::AaDelMinimal;
use crate::analyze::aa_sub::AaSubMinimal;
use crate::analyze::aa_sub_full::{AaDelFull, AaSubFull};
use crate::analyze::nuc_del::NucDel;
use crate::analyze::nuc_sub::NucSub;
use crate::gene::cds::Cds;
use crate::io::aa::{from_aa, Aa};
use crate::io::gene_map::GeneMap;
use crate::io::letter::Letter;
use crate::io::letter::{serde_deserialize_seq, serde_serialize_seq};
use crate::io::nuc::Nuc;
use crate::translate::coord_map2::cds_codon_pos_to_ref_range;
use crate::translate::translate_genes::{CdsTranslation, Translation};
use crate::utils::range::{AaRefPosition, AaRefRange, NucRefGlobalPosition, NucRefGlobalRange, PositionLike};
use either::Either;
use eyre::{Report, WrapErr};
use itertools::{Itertools, MinMaxResult};
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct NucContext {
  pub codon_nuc_range: NucRefGlobalRange,
  pub ref_context: String,
  pub qry_context: String,
  pub context_nuc_range: NucRefGlobalRange,
}

#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AaContext {
  pub ref_aa_context: String,
  pub qry_aa_context: String,
}

/// Represents aminoacid substitution
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AaSub {
  pub gene: String,
  #[serde(rename = "refAA")]
  pub reff: Aa,

  #[serde(rename = "codon")]
  pub pos: AaRefPosition,

  #[serde(rename = "queryAA")]
  pub qry: Aa,

  pub nuc_contexts: Vec<NucContext>,
  pub aa_context: AaContext,
}

impl AaSub {
  /// Checks whether this substitution is a deletion (substitution of letter `Gap`)
  pub fn is_del(&self) -> bool {
    self.qry.is_gap()
  }

  pub const fn to_minimal(&self) -> AaSubMinimal {
    AaSubMinimal {
      reff: self.reff,
      pos: self.pos,
      qry: self.qry,
    }
  }
}

impl ToString for AaSub {
  fn to_string(&self) -> String {
    // NOTE: by convention, in bioinformatics, amino acids are numbered starting from 1, however our arrays are 0-based
    format!(
      "{}:{}{}{}",
      self.gene,
      from_aa(self.reff),
      self.pos + 1,
      from_aa(self.qry)
    )
  }
}

/// Order amino acid substitutions by gene, position, then ref character, then query character
impl Ord for AaSub {
  fn cmp(&self, other: &Self) -> Ordering {
    (&self.gene, self.pos, self.reff, self.qry).cmp(&(&other.gene, other.pos, other.reff, other.qry))
  }
}

impl PartialOrd for AaSub {
  fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
    Some(self.cmp(other))
  }
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AaDel {
  pub gene: String,
  #[serde(rename = "refAA")]
  pub reff: Aa,

  #[serde(rename = "codon")]
  pub pos: AaRefPosition,

  pub nuc_contexts: Vec<NucContext>,
  pub aa_context: AaContext,
}

impl AaDel {
  pub const fn to_minimal(&self) -> AaDelMinimal {
    AaDelMinimal {
      reff: self.reff,
      pos: self.pos,
    }
  }
}

impl ToString for AaDel {
  fn to_string(&self) -> String {
    // NOTE: by convention, in bioinformatics, amino acids are numbered starting from 1, however our arrays are 0-based
    format!("{}:{}{}-", self.gene, from_aa(self.reff), self.pos + 1,)
  }
}

/// Order amino acid deletions by gene, position, then ref character, then query character
impl Ord for AaDel {
  fn cmp(&self, other: &Self) -> Ordering {
    (&self.gene, self.pos, self.reff).cmp(&(&other.gene, other.pos, other.reff))
  }
}

impl PartialOrd for AaDel {
  fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
    Some(self.cmp(other))
  }
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub enum AaChangeType {
  #[serde(rename = "substitution")]
  Sub,

  #[serde(rename = "deletion")]
  Del,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AaChange {
  #[serde(rename = "type")]
  pub change_type: AaChangeType,

  pub gene: String,
  #[serde(rename = "refAA")]
  pub reff: Aa,

  #[serde(rename = "codon")]
  pub pos: AaRefPosition,

  #[serde(rename = "queryAA")]
  pub qry: Aa,

  pub nuc_contexts: Vec<NucContext>,
  pub aa_context: AaContext,

  pub nuc_substitutions: Vec<NucSub>,
  pub nuc_deletions: Vec<NucDel>,
}

impl From<AaSubFull> for AaChange {
  fn from(sub: AaSubFull) -> Self {
    Self {
      change_type: AaChangeType::Sub,
      gene: sub.sub.gene,
      reff: sub.sub.reff,
      pos: sub.sub.pos,
      qry: sub.sub.qry,
      nuc_contexts: sub.sub.nuc_contexts.clone(),
      aa_context: sub.sub.aa_context.clone(),
      nuc_substitutions: sub.nuc_substitutions,
      nuc_deletions: sub.nuc_deletions,
    }
  }
}

impl From<AaDelFull> for AaChange {
  fn from(del: AaDelFull) -> Self {
    Self {
      change_type: AaChangeType::Del,
      gene: del.del.gene,
      reff: del.del.reff,
      pos: del.del.pos,
      qry: Aa::Gap,
      nuc_contexts: del.del.nuc_contexts.clone(),
      aa_context: del.del.aa_context.clone(),
      nuc_substitutions: del.nuc_substitutions,
      nuc_deletions: del.nuc_deletions,
    }
  }
}

impl Ord for AaChange {
  fn cmp(&self, other: &Self) -> Ordering {
    (&self.gene, self.pos, self.reff, self.qry).cmp(&(&other.gene, other.pos, other.reff, other.qry))
  }
}

impl PartialOrd for AaChange {
  fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
    Some(self.cmp(other))
  }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AaChangeWithContext {
  pub cds_name: String,
  pub codon: AaRefPosition,
  pub ref_aa: Aa,
  pub qry_aa: Aa,
  pub nuc_pos: NucRefGlobalPosition,

  #[schemars(with = "String")]
  #[serde(serialize_with = "serde_serialize_seq")]
  #[serde(deserialize_with = "serde_deserialize_seq")]
  pub ref_triplet: Vec<Nuc>,

  #[schemars(with = "String")]
  #[serde(serialize_with = "serde_serialize_seq")]
  #[serde(deserialize_with = "serde_deserialize_seq")]
  pub qry_triplet: Vec<Nuc>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AaChangesGroup {
  name: String,
  range: AaRefRange,
  changes: Vec<AaChangeWithContext>,
}

impl AaChangesGroup {
  pub fn new(name: impl AsRef<str>) -> Self {
    Self::with_changes(name, vec![])
  }

  pub fn with_changes(name: impl AsRef<str>, changes: Vec<AaChangeWithContext>) -> Self {
    let range = match changes.iter().minmax_by_key(|change| change.codon) {
      MinMaxResult::NoElements => AaRefRange::from_isize(0, 0),
      MinMaxResult::OneElement(one) => AaRefRange::new(one.codon, one.codon + 1),
      MinMaxResult::MinMax(first, last) => AaRefRange::new(first.codon, last.codon + 1),
    };

    Self {
      name: name.as_ref().to_owned(),
      range,
      changes,
    }
  }

  pub fn push(&mut self, change: AaChangeWithContext) {
    self.range.end = change.codon + 1;
    self.changes.push(change);
  }

  pub fn last(&self) -> Option<&AaChangeWithContext> {
    self.changes.last()
  }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct FindAaChangesOutput {
  pub aa_changes_groups: Vec<AaChangesGroup>,
  pub aa_substitutions: Vec<AaSub>,
  pub aa_deletions: Vec<AaDel>,
}

/// Finds aminoacid substitutions and deletions in query peptides relative to reference peptides, in all genes
///
/// ## Precondition
/// Nucleotide sequences and peptides are required to be stripped from insertions
pub fn find_aa_changes(
  ref_seq: &[Nuc],
  qry_seq: &[Nuc],
  ref_translation: &Translation,
  qry_translation: &Translation,
  global_alignment_range: &NucRefGlobalRange,
  gene_map: &GeneMap,
) -> Result<FindAaChangesOutput, Report> {
  let mut changes = qry_translation
    .iter_cdses()
    .map(|(qry_name, qry_cds_tr)| {
      let ref_cds_tr = ref_translation
        .get_cds(qry_name)
        .wrap_err_with(|| format!("When searching for reference translation of CDS {qry_name}"))?;

      let cds = gene_map.get_cds(&qry_cds_tr.name)?;

      Ok(find_aa_changes_for_cds(
        cds,
        qry_seq,
        ref_seq,
        ref_cds_tr,
        qry_cds_tr,
        global_alignment_range,
      ))
    })
    .collect::<Result<Vec<FindAaChangesOutput>, Report>>()?
    .into_iter()
    .fold(FindAaChangesOutput::default(), |mut output, changes| {
      output.aa_changes_groups.extend(changes.aa_changes_groups);
      output.aa_substitutions.extend(changes.aa_substitutions);
      output.aa_deletions.extend(changes.aa_deletions);
      output
    });

  changes.aa_substitutions.sort();
  changes.aa_deletions.sort();

  Ok(changes)
}

/// Finds aminoacid substitutions and deletions in query peptides relative to reference peptides, in one gene
///
/// ## Precondition
/// Nucleotide sequences and peptides are required to be stripped from insertions
///
///
/// ## Implementation details
/// We compare reference and query peptides (extracted by the preceding call to Nextalign),
/// one aminoacid at at time, and deduce changes. We then report the change and relevant nucleotide context surrounding
/// this change.
/// Previously we reported one-to-one mapping of aminoacid changes to corresponding nucleotide changes. However, it
/// was not always accurate, because if there are multiple nucleotide changes in a codon, the direct correspondence
/// might not always be established without knowing the order in which nucleotide changes have occurred. And in the
/// context of Nextclade we don't have this information.
fn find_aa_changes_for_cds(
  cds: &Cds,
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  ref_tr: &CdsTranslation,
  qry_tr: &CdsTranslation,
  global_alignment_range: &NucRefGlobalRange,
) -> FindAaChangesOutput {
  let ref_peptide = &ref_tr.seq;
  let qry_peptide = &qry_tr.seq;
  let ref_cds_nucs = &ref_tr.nuc_seq;
  let qry_cds_nucs = &qry_tr.nuc_seq;
  let aa_alignment_ranges = &qry_tr.alignment_ranges;

  assert_eq!(ref_peptide.len(), qry_peptide.len());
  assert_eq!(qry_seq.len(), ref_seq.len());

  let num_nucs = qry_seq.len();
  let num_codons = qry_peptide.len();
  let mut aa_changes_groups = vec![AaChangesGroup::new(&cds.name)];
  let mut curr_group = aa_changes_groups.last_mut().unwrap();
  for codon in AaRefRange::from_usize(0, qry_peptide.len()).iter() {
    if !aa_alignment_ranges
      .iter()
      .any(|aa_alignment_range| aa_alignment_range.contains(codon))
    {
      continue;
    }

    // let nuc_contexts = cds
    //   .segments
    //   .iter()
    //   .filter_map(|segment| {
    //     let codon = codon.as_isize();
    //     // Find where the codon is in nucleotide sequences
    //     let codon_begin = if segment.strand != GeneStrand::Reverse {
    //       segment.range.begin.as_isize() + codon * 3
    //     } else {
    //       segment.range.end.as_isize() - (codon + 1) * 3
    //     };
    //     let codon_end = codon_begin + 3;
    //
    //     intersect_or_none(
    //       global_alignment_range,
    //       &NucRefGlobalRange::from_isize(codon_begin, codon_end),
    //     )
    //   })
    //   .map(|codon_nuc_range| {
    //     let NucRefGlobalRange { begin, end } = codon_nuc_range;
    //
    //     // Provide surrounding context in nucleotide sequences: 1 codon to the left and 1 codon to the right
    //     let context_nuc_begin = clamp_min(begin - 3, 0.into());
    //     let context_nuc_end = clamp_max(end + 3, num_nucs.into());
    //     let context_nuc_range = NucRefGlobalRange::new(context_nuc_begin, context_nuc_end);
    //
    //     let mut ref_context = ref_seq[context_nuc_range.to_std()].to_owned();
    //     let mut qry_context = qry_seq[context_nuc_range.to_std()].to_owned();
    //
    //     if cds.strand == GeneStrand::Reverse {
    //       reverse_complement_in_place(&mut ref_context);
    //       reverse_complement_in_place(&mut qry_context);
    //     }
    //
    //     let ref_context = from_nuc_seq(&ref_context);
    //     let qry_context = from_nuc_seq(&qry_context);
    //
    //     NucContext {
    //       codon_nuc_range,
    //       ref_context,
    //       qry_context,
    //       context_nuc_range,
    //     }
    //   })
    //   .collect_vec();

    let ref_aa = ref_peptide[codon.as_usize()];
    let qry_aa = qry_peptide[codon.as_usize()];
    if qry_aa != ref_aa && qry_aa != Aa::X {
      let nuc_range = cds_codon_pos_to_ref_range(cds, codon).clamp_range(0, qry_seq.len());
      let ref_triplet = ref_seq[nuc_range.to_std()].to_vec();
      let qry_triplet = qry_seq[nuc_range.to_std()].to_vec();

      let change = AaChangeWithContext {
        cds_name: cds.name.clone(),
        codon,
        ref_aa,
        qry_aa,
        nuc_pos: nuc_range.begin,
        ref_triplet,
        qry_triplet,
      };

      match curr_group.last() {
        None => {
          // Current group is empty. This will be the first item for the first group.
          curr_group.push(change);
        }
        Some(prev) => {
          // Group is not empty
          if prev.codon + 1 == change.codon {
            // Previous codon in the group is adjacent. Append to the group.
            curr_group.push(change);
          } else {
            // Previous codon in the group is not adjacent. Start a new group.
            aa_changes_groups.push(AaChangesGroup::with_changes(&cds.name, vec![change]));
            curr_group = aa_changes_groups.last_mut().unwrap();
          }
        }
      }
    }
  }

  let (aa_substitutions, aa_deletions): (Vec<AaSub>, Vec<AaDel>) = aa_changes_groups
    .iter()
    .flat_map(|aa_changes_group| &aa_changes_group.changes)
    .partition_map(|change| {
      if change.qry_aa.is_gap() {
        Either::Right(AaDel {
          gene: cds.name.clone(),
          reff: change.ref_aa,
          pos: change.codon,
          nuc_contexts: vec![],             // TODO: remove this
          aa_context: AaContext::default(), // TODO: remove this
        })
      } else {
        Either::Left(AaSub {
          gene: cds.name.clone(),
          reff: change.ref_aa,
          pos: change.codon,
          qry: change.qry_aa,
          nuc_contexts: vec![],             // TODO: remove this
          aa_context: AaContext::default(), // TODO: remove this
        })
      }
    });

  FindAaChangesOutput {
    aa_changes_groups,
    aa_substitutions,
    aa_deletions,
  }
}
