use crate::analyze::aa_changes_group::AaChangeGroup;
use crate::analyze::aa_del::AaDelMinimal;
use crate::analyze::aa_sub::AaSubMinimal;
use crate::analyze::aa_sub_full::{AaDelFull, AaSubFull};
use crate::analyze::nuc_del::NucDel;
use crate::analyze::nuc_sub::NucSub;
use crate::gene::gene::{Gene, GeneStrand};
use crate::io::aa::{from_aa, Aa};
use crate::io::gene_map::GeneMap;
use crate::io::letter::Letter;
use crate::io::nuc::{from_nuc_seq, Nuc};
use crate::make_internal_report;
use crate::translate::complement::reverse_complement_in_place;
use crate::translate::translate_genes::{Translation, TranslationMap};
use crate::utils::error::keep_ok;
use crate::utils::range::Range;
use eyre::Report;
use itertools::{assert_equal, merge, Itertools};
use num_traits::{clamp_max, clamp_min};
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;

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
  pub codon_nuc_range: Range,
  pub ref_context: String,
  pub query_context: String,
  pub context_nuc_range: Range,
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

  pub codon_nuc_range: Range,
  pub ref_context: String,
  pub query_context: String,
  pub context_nuc_range: Range,
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

  pub codon_nuc_range: Range,
  pub ref_context: String,
  pub query_context: String,
  pub context_nuc_range: Range,
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
      codon_nuc_range: sub.sub.codon_nuc_range,
      ref_context: sub.sub.ref_context,
      query_context: sub.sub.query_context,
      context_nuc_range: sub.sub.context_nuc_range,
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
      codon_nuc_range: del.del.codon_nuc_range,
      ref_context: del.del.ref_context,
      query_context: del.del.query_context,
      context_nuc_range: del.del.context_nuc_range,
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
  ref_peptides: &TranslationMap,
  translations: &[Translation],
  alignment_range: &Range,
  gene_map: &GeneMap,
) -> Result<FindAaChangesOutput, Report> {
  let mut changes = translations
    .iter()
    .map(
      |Translation {
         gene_name,
         seq,
         insertions,
         frame_shifts,
         ..
       }|
       -> Result<FindAaChangesOutput, Report> {
        let ref_peptide = ref_peptides.get(gene_name).ok_or(make_internal_report!(
          "Reference peptide not found for gene '{gene_name}'"
        ))?;

        let gene = gene_map
          .get(gene_name)
          .ok_or(make_internal_report!("Gene '{gene_name}' not found in gene map"))?;

        Ok(find_aa_changes_for_gene(
          qry_seq,
          ref_seq,
          &ref_peptide.seq,
          seq,
          gene,
          alignment_range,
        ))
      },
    )
    .collect::<Result<Vec<FindAaChangesOutput>, Report>>()?
    .into_iter()
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
fn find_aa_changes_for_gene(
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  ref_peptide: &[Aa],
  qry_peptide: &[Aa],
  gene: &Gene,
  alignment_range: &Range,
) -> FindAaChangesOutput {
  assert_eq!(ref_peptide.len(), qry_peptide.len());
  assert_eq!(qry_seq.len(), ref_seq.len());

  let mut aa_substitutions = Vec::<AaSub>::new();
  let mut aa_deletions = Vec::<AaDel>::new();

  let num_nucs = qry_seq.len();
  let num_codons = qry_peptide.len();
  for codon in 0..num_codons {
    let ref_aa = ref_peptide[codon];
    let qry_aa = qry_peptide[codon];

    // Find where the codon is in nucleotide sequences
    let codon_begin = if gene.strand != GeneStrand::Reverse {
      gene.start + codon * 3
    } else {
      gene.end - (codon + 1) * 3
    };
    let codon_end = codon_begin + 3;

    // If the codon is outside of nucleotide alignment, there is nothing to do
    if !alignment_range.contains(codon_begin) || !alignment_range.contains(codon_end) {
      continue;
    }

    // Provide surrounding context in nucleotide sequences: 1 codon to the left and 1 codon to the right
    // Avoid underflow bug when codon_begin <=2
    let context_begin = clamp_min(codon_begin, 3) - 3;
    let context_end = clamp_max(codon_end + 3, num_nucs);
    let mut ref_context = ref_seq[context_begin..context_end].to_vec();
    let mut query_context = qry_seq[context_begin..context_end].to_vec();
    if gene.strand == GeneStrand::Reverse {
      reverse_complement_in_place(&mut ref_context);
      reverse_complement_in_place(&mut query_context);
    }

    let codon_nuc_range = Range {
      begin: codon_begin,
      end: codon_end,
    };

    let context_nuc_range = Range {
      begin: context_begin,
      end: context_end,
    };

    if qry_aa.is_gap() {
      // Gap in the ref sequence means that this is a deletion in the query sequence
      aa_deletions.push(AaDel {
        gene: gene.gene_name.clone(),
        reff: ref_aa,
        pos: codon,
        codon_nuc_range,
        ref_context: from_nuc_seq(&ref_context),
        query_context: from_nuc_seq(&query_context),
        context_nuc_range,
      });
    }
    // TODO: we might account for ambiguous amino acids in this condition
    else if qry_aa != ref_aa && qry_aa != Aa::X {
      // If not a gap and the state has changed, than it's a substitution
      aa_substitutions.push(AaSub {
        gene: gene.gene_name.clone(),
        reff: ref_aa,
        pos: codon,
        qry: qry_aa,
        codon_nuc_range,
        ref_context: from_nuc_seq(&ref_context),
        query_context: from_nuc_seq(&query_context),
        context_nuc_range,
      });
    }
  }

  FindAaChangesOutput {
    aa_substitutions,
    aa_deletions,
  }
}
