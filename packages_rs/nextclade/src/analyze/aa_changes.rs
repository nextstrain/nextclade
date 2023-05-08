use crate::analyze::aa_del::AaDelMinimal;
use crate::analyze::aa_sub::AaSubMinimal;
use crate::analyze::aa_sub_full::{AaDelFull, AaSubFull};
use crate::analyze::nuc_del::NucDel;
use crate::analyze::nuc_sub::NucSub;
use crate::gene::cds::Cds;
use crate::gene::gene::GeneStrand;
use crate::io::aa::{from_aa, from_aa_seq, Aa};
use crate::io::letter::Letter;
use crate::io::nuc::{from_nuc_seq, Nuc};
use crate::translate::complement::reverse_complement_in_place;
use crate::translate::coord_map::CoordMapForCds;
use crate::translate::translate_genes::Translation;
use crate::utils::range::{intersect_or_none, Range};
use eyre::Report;
use itertools::{izip, Itertools};
use num_traits::clamp_max;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NucContext {
  pub codon_nuc_range: Range,
  pub ref_context: String,
  pub query_context: String,
  pub context_nuc_range: Range,
}

#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AaContext {
  pub ref_aa_context: String,
  pub qry_aa_context: String,
}

/// Represents aminoacid substitution
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AaSub {
  pub gene: String,
  #[serde(rename = "refAA")]
  pub reff: Aa,

  #[serde(rename = "codon")]
  pub pos: usize,

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

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AaDel {
  pub gene: String,
  #[serde(rename = "refAA")]
  pub reff: Aa,

  #[serde(rename = "codon")]
  pub pos: usize,

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

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum AaChangeType {
  #[serde(rename = "substitution")]
  Sub,

  #[serde(rename = "deletion")]
  Del,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AaChange {
  #[serde(rename = "type")]
  pub change_type: AaChangeType,

  pub gene: String,
  #[serde(rename = "refAA")]
  pub reff: Aa,

  #[serde(rename = "codon")]
  pub pos: usize,

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

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FindAaChangesOutput {
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
  global_alignment_range: &Range,
) -> Result<FindAaChangesOutput, Report> {
  let mut changes = izip!(qry_translation.iter_cdses(), ref_translation.iter_cdses())
    .map(|((qry_name, qry_cds_tr), (ref_name, ref_cds_tr))| {
      assert_eq!(qry_cds_tr.cds.name, ref_cds_tr.cds.name);
      assert_eq!(qry_cds_tr.gene.name, ref_cds_tr.gene.name);
      find_aa_changes_for_cds(
        &qry_cds_tr.cds,
        qry_seq,
        ref_seq,
        &ref_cds_tr.seq,
        &qry_cds_tr.seq,
        &qry_cds_tr.alignment_ranges,
        &qry_cds_tr.qry_cds_map,
        global_alignment_range,
      )
    })
    .fold(FindAaChangesOutput::default(), |mut output, changes| {
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
  ref_peptide: &[Aa],
  qry_peptide: &[Aa],
  aa_alignment_ranges: &[Range],
  qry_cds_map: &CoordMapForCds,
  global_alignment_range: &Range,
) -> FindAaChangesOutput {
  assert_eq!(ref_peptide.len(), qry_peptide.len());
  assert_eq!(qry_seq.len(), ref_seq.len());

  let mut aa_substitutions = Vec::<AaSub>::new();
  let mut aa_deletions = Vec::<AaDel>::new();

  let num_nucs = qry_seq.len();
  let num_codons = qry_peptide.len();
  for codon in 0..num_codons {
    // NOTE(design): Ignore codons outside of alignment range. For a partial sequence this might make semblance that
    // there is less mutations compared to full sequences. This has profound effect on clade assignment and QC.
    // However this is not necessarily the case. We simply don't know and here we choose to ignore fragments outside
    // alignment.
    if !aa_alignment_ranges
      .iter()
      .any(|aa_alignment_range| aa_alignment_range.contains(codon))
    {
      continue;
    }

    let ref_aa = ref_peptide[codon];
    let qry_aa = qry_peptide[codon];

    // Provide surrounding context in AA sequences: 1 codon to the left and 1 codon to the right
    let context_aa_begin = codon.saturating_sub(1);
    let context_aa_end = codon.saturating_add(1);
    let ref_aa_context = &ref_peptide[context_aa_begin..context_aa_end];
    let qry_aa_context = &ref_peptide[context_aa_begin..context_aa_end];

    let aa_context = AaContext {
      ref_aa_context: from_aa_seq(ref_aa_context),
      qry_aa_context: from_aa_seq(qry_aa_context),
    };

    // TODO(bug): handle reverse strands
    // let codon_begin = if cds.strand != GeneStrand::Reverse {
    //   cds.start + codon * 3
    // } else {
    //   cds.end - (codon + 1) * 3
    // };
    // let codon_end = codon_begin + 3;

    let nuc_contexts =
      // Find where the codon is in nucleotide sequences
      qry_cds_map.codon_to_global_aln_range_covered(codon)
      .into_iter()
      .filter_map(|aln_range| intersect_or_none(&aln_range, global_alignment_range))
      .map(|codon_nuc_range| {
        // TODO(bug): this range might need to be converted to ref coordinates (Is it used in UI?)
        let Range { begin, end } = codon_nuc_range;

        // Provide surrounding context in nucleotide sequences: 1 codon to the left and 1 codon to the right
        let context_begin = begin.saturating_sub(3);
        let context_end = clamp_max(end.saturating_add(3), num_nucs);

        let context_nuc_range = Range {
          begin: context_begin,
          end: context_end,
        };

        let mut ref_context = ref_seq[context_begin..context_end].to_owned();
        let mut query_context = qry_seq[context_begin..context_end].to_owned();

        if cds.strand == GeneStrand::Reverse {
          reverse_complement_in_place(&mut ref_context);
          reverse_complement_in_place(&mut query_context);
        }

        let ref_context = from_nuc_seq(&ref_context);
        let query_context = from_nuc_seq(&query_context);

        NucContext{
          codon_nuc_range,
          ref_context,
          query_context,
          context_nuc_range,
        }
      })
      .collect_vec();

    if qry_aa.is_gap() {
      // Gap in the ref sequence means that this is a deletion in the query sequence
      aa_deletions.push(AaDel {
        gene: cds.name.clone(),
        reff: ref_aa,
        pos: codon,
        nuc_contexts,
        aa_context,
      });
    }
    // NOTE(design): Here we ignore amino acid `X` in query.
    //  For a sequence with many such fragments, this might make semblance
    //  that there is less mutations. This has profound effect on clade assignment and QC.
    //  However this is not necessarily the case. We simply don't know and here we choose to ignore fragments filled
    //  with `X`.
    //
    // TODO(feat): instead of strict comparison, we might account for ambiguous amino acids in this condition,
    //  to recover some more useful data from lower-quality sequences
    else if qry_aa != ref_aa && qry_aa != Aa::X {
      // If not a gap and the state has changed, then it's a substitution
      aa_substitutions.push(AaSub {
        gene: cds.name.clone(),
        reff: ref_aa,
        pos: codon,
        qry: qry_aa,
        nuc_contexts,
        aa_context,
      });
    }
  }

  FindAaChangesOutput {
    aa_substitutions,
    aa_deletions,
  }
}
