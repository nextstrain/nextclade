#![allow(non_snake_case)]

use crate::analyze::aa_del::AaDelMinimal;
use crate::analyze::aa_sub::AaSubMinimal;
use crate::analyze::nuc_sub::NucSub;
use crate::gene::gene::Gene;
use crate::gene::gene_map::GeneMap;
use crate::io::aa::Aa;
use crate::io::letter::Letter;
use crate::io::nuc::{from_nuc_seq, Nuc};
use crate::make_internal_report;
use crate::translate::translate_genes::{Translation, TranslationMap};
use crate::utils::error::keep_ok;
use crate::utils::range::Range;
use eyre::Report;
use itertools::{assert_equal, Itertools};
use num::clamp;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;

/// Represents aminoacid substitution
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct AaSub {
  pub gene: String,
  #[serde(rename = "refAa")]
  pub reff: Aa,

  #[serde(rename = "codon")]
  pub pos: usize,

  #[serde(rename = "queryAa")]
  pub qry: Aa,
  pub codonNucRange: Range,
  pub refContext: String,
  pub queryContext: String,
  pub contextNucRange: Range,
}

impl AaSub {
  /// Checks whether this substitution is a deletion (substitution of letter `Gap`)
  pub fn is_del(&self) -> bool {
    self.qry.is_gap()
  }

  pub fn to_minimal(&self) -> AaSubMinimal {
    AaSubMinimal {
      reff: self.reff,
      pos: self.pos,
      qry: self.qry,
    }
  }
}

/// Order substitutions by position, then ref character, then query character
impl Ord for AaSub {
  fn cmp(&self, other: &Self) -> Ordering {
    (self.pos, self.reff, self.qry).cmp(&(other.pos, other.reff, other.qry))
  }
}

impl PartialOrd for AaSub {
  fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
    Some(self.cmp(other))
  }
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct AaDel {
  pub gene: String,
  #[serde(rename = "refAa")]
  pub reff: Aa,

  #[serde(rename = "codon")]
  pub pos: usize,

  pub codonNucRange: Range,
  pub refContext: String,
  pub queryContext: String,
  pub contextNucRange: Range,
}

impl AaDel {
  pub fn to_minimal(&self) -> AaDelMinimal {
    AaDelMinimal {
      reff: self.reff,
      pos: self.pos,
    }
  }
}

/// Order substitutions by position, then ref character, then query character
impl Ord for AaDel {
  fn cmp(&self, other: &Self) -> Ordering {
    (self.pos, self.reff).cmp(&(other.pos, other.reff))
  }
}

impl PartialOrd for AaDel {
  fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
    Some(self.cmp(other))
  }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FindAaChangesOutput {
  pub aaSubstitutions: Vec<AaSub>,
  pub aaDeletions: Vec<AaDel>,
}

/// Finds aminoacid substitutions and deletions in query peptides relative to reference peptides, in all genes
///
/// ## Precondition
/// Nucleotide sequences and peptides are required to be stripped from insertions
pub fn find_aa_changes(
  ref_seq: &[Nuc],
  qry_seq: &[Nuc],
  ref_peptides: &TranslationMap,
  translations: &[Result<Translation, Report>],
  alignment_range: &Range,
  gene_map: &GeneMap,
) -> Result<FindAaChangesOutput, Report> {
  let changes = keep_ok(translations)
    .map(
      |Translation {
         gene_name,
         seq,
         insertions,
         frame_shifts,
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
      output.aaSubstitutions.extend(changes.aaSubstitutions);
      output.aaDeletions.extend(changes.aaDeletions);
      output
    });

  // TODO: sort by gene and position
  // changes.aaSubstitutions.sort_by_key(|sub| sub.pos);
  // changes.aaDeletions.sort_by_key(|del| del.pos);

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

  let mut aaSubstitutions = Vec::<AaSub>::new();
  let mut aaDeletions = Vec::<AaDel>::new();

  let num_nucs = qry_seq.len();
  let num_codons = qry_peptide.len();
  for codon in 0..num_codons {
    let ref_aa = ref_peptide[codon];
    let qry_aa = qry_peptide[codon];

    // Find where the codon is in nucleotide sequences
    let codon_begin = gene.start + codon * 3;
    let codon_end = codon_begin + 3;

    // If the codon is outside of nucleotide alignment, there is nothing to do
    if !alignment_range.contains(codon_begin) || !alignment_range.contains(codon_end) {
      continue;
    }

    // Provide surrounding context in nucleotide sequences: 1 codon to the left and 1 codon to the right
    let context_begin = clamp(codon_begin - 3, 0, num_nucs);
    let context_end = clamp(codon_end + 3, 0, num_nucs);
    let refContext = from_nuc_seq(&ref_seq[context_begin..context_end]);
    let queryContext = from_nuc_seq(&qry_seq[context_begin..context_end]);

    let codonNucRange = Range {
      begin: codon_begin,
      end: codon_end,
    };

    let contextNucRange = Range {
      begin: context_begin,
      end: context_end,
    };

    if qry_aa.is_gap() {
      // Gap in the ref sequence means that this is a deletion in the query sequence
      aaDeletions.push(AaDel {
        gene: gene.gene_name.clone(),
        reff: ref_aa,
        pos: codon,
        codonNucRange,
        refContext,
        queryContext,
        contextNucRange,
      });
    }
    // TODO: we might account for ambiguous aminoacids in this condition
    else if qry_aa != ref_aa && qry_aa != Aa::X {
      // If not a gap and the state has changed, than it's a substitution
      aaSubstitutions.push(AaSub {
        gene: gene.gene_name.clone(),
        reff: ref_aa,
        pos: codon,
        qry: qry_aa,
        codonNucRange,
        refContext,
        queryContext,
        contextNucRange,
      });
    }
  }

  FindAaChangesOutput {
    aaSubstitutions,
    aaDeletions,
  }
}
