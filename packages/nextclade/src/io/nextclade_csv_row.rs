use crate::align::insertions_strip::{AaIns, Insertion};
use crate::alphabet::aa::from_aa_seq;
use crate::alphabet::nuc::{from_nuc, from_nuc_seq, Nuc};
use crate::analyze::aa_del::AaDel;
use crate::analyze::aa_sub::AaSub;
use crate::analyze::find_aa_motifs::AaMotif;
use crate::analyze::find_clade_founder::CladeNodeAttrFounderInfo;
use crate::analyze::letter_ranges::{CdsAaRange, NucRange};
use crate::analyze::nuc_del::NucDelRange;
use crate::analyze::nuc_sub::{NucSub, NucSubLabeled};
use crate::analyze::pcr_primer_changes::PcrPrimerChange;
use crate::coord::range::NucRefGlobalRange;
use crate::o;
use crate::qc::qc_config::StopCodonLocation;
use crate::qc::qc_rule_snp_clusters::ClusteredSnp;
use crate::translate::frame_shifts_translate::FrameShift;
use crate::types::outputs::{NextcladeOutputs, PeptideWarning, PhenotypeValue};
use crate::utils::num::is_int;
use eyre::Report;
use itertools::Itertools;
use std::fmt::Display;

pub const ARRAY_ITEM_DELIMITER: &str = ",";

pub struct NextcladeResultsCsvRow {
  headers: Vec<String>,
  row: Vec<String>,
}

impl NextcladeResultsCsvRow {
  pub fn new(headers: impl Into<Vec<String>>) -> Result<Self, Report> {
    let headers: Vec<String> = headers.into();
    let row = vec![o!(""); headers.len()];
    Ok(Self { headers, row })
  }

  pub fn format(&mut self, nextclade_outputs: &NextcladeOutputs) -> Result<&Self, Report> {
    let NextcladeOutputs {
      index,
      seq_name,
      substitutions,
      total_substitutions,
      deletions,
      total_deletions,
      insertions,
      total_insertions,
      missing,
      total_missing,
      non_acgtns,
      total_non_acgtns,
      frame_shifts,
      total_frame_shifts,
      aa_substitutions,
      total_aminoacid_substitutions,
      aa_deletions,
      total_aminoacid_deletions,
      aa_insertions,
      total_aminoacid_insertions,
      unknown_aa_ranges,
      total_unknown_aa,
      alignment_range,
      alignment_score,
      pcr_primer_changes,
      total_pcr_primer_changes,
      clade,
      private_nuc_mutations,
      // private_aa_mutations,
      missing_cdses,
      // divergence,
      coverage,
      phenotype_values,
      qc,
      custom_node_attributes,
      is_reverse_complement,
      warnings,
      aa_motifs,
      ref_nodes,
      ref_node_search_results,
      relative_nuc_mutations,
      relative_aa_mutations,
      clade_founder_info,
      clade_node_attr_founder_info,
      ..
    } = nextclade_outputs;

    custom_node_attributes
      .iter()
      .try_for_each(|(key, val)| self.add_entry(key, &val))?;

    if let Some(phenotype_values) = phenotype_values {
      phenotype_values
        .iter()
        .try_for_each(|PhenotypeValue { name, value, .. }| self.add_entry(name, &value))?;
    }

    aa_motifs
      .iter()
      .try_for_each(|(name, motifs)| self.add_entry(name, &format_aa_motifs(motifs)))?;

    if let Some(info) = clade_founder_info {
      self.add_clade_founder_cols("clade", info)?;
    }
    for (name, info) in clade_node_attr_founder_info {
      self.add_clade_founder_cols(name, info)?;
    }

    ref_nodes.search.iter().try_for_each(|desc| {
      let name = desc.display_name_or_name();

      let na = o!("N/A");

      let (nuc_subs, nuc_dels) = {
        let rel_nuc_mut = relative_nuc_mutations
          .iter()
          .find(|rel_nuc_mut| rel_nuc_mut.search.search.name == desc.name)
          .and_then(|rel_nuc_mut| rel_nuc_mut.result.as_ref())
          .map(|res| &res.muts);

        let nuc_subs = rel_nuc_mut.as_ref().map_or_else(
          || na.clone(),
          |muts| format_nuc_substitutions(&muts.private_substitutions, ARRAY_ITEM_DELIMITER),
        );

        let nuc_dels = rel_nuc_mut.as_ref().map_or_else(
          || na.clone(),
          |muts| format_nuc_deletions(&muts.private_deletion_ranges, ARRAY_ITEM_DELIMITER),
        );

        (nuc_subs, nuc_dels)
      };

      let (aa_subs, aa_dels) = {
        let rel_aa_mut = relative_aa_mutations
          .iter()
          .find(|rel_aa_mut| rel_aa_mut.search.search.name == desc.name)
          .and_then(|rel_aa_mut| rel_aa_mut.result.as_ref())
          .map(|res| &res.muts);

        let aa_subs = rel_aa_mut
          .as_ref()
          .map(|muts| {
            muts
              .iter()
              .flat_map(|(_, m)| &m.private_substitutions)
              .cloned()
              .collect_vec()
          })
          .map_or_else(|| na.clone(), |m| format_aa_substitutions(&m, ARRAY_ITEM_DELIMITER));

        let aa_dels = rel_aa_mut
          .as_ref()
          .map(|muts| {
            muts
              .iter()
              .flat_map(|(_, m)| &m.private_deletions)
              .cloned()
              .collect_vec()
          })
          .map_or_else(|| na.clone(), |m| format_aa_deletions(&m, ARRAY_ITEM_DELIMITER));

        (aa_subs, aa_dels)
      };

      let node_name = ref_node_search_results
        .iter()
        .find(|d| d.search.name == desc.name)
        .and_then(|r| r.result.as_ref())
        .and_then(|r| r.r#match.as_ref())
        .map_or(&na, |r| &r.node_name);

      self.add_entry(format!("relativeMutations['{name}'].nodeName"), &node_name)?;
      self.add_entry(format!("relativeMutations['{name}'].substitutions"), &nuc_subs)?;
      self.add_entry(format!("relativeMutations['{name}'].deletions"), &nuc_dels)?;
      self.add_entry(format!("relativeMutations['{name}'].aaSubstitutions"), &aa_subs)?;
      self.add_entry(format!("relativeMutations['{name}'].aaDeletions"), &aa_dels)
    })?;

    self.add_entry("index", index)?;
    self.add_entry("seqName", seq_name)?;

    self.add_entry("clade", &clade.as_deref().unwrap_or_default())?;
    self.add_entry("qc.overallScore", &format_qc_score(qc.overall_score))?;
    self.add_entry("qc.overallStatus", &qc.overall_status.to_string())?;
    self.add_entry("totalSubstitutions", &total_substitutions.to_string())?;
    self.add_entry("totalDeletions", &total_deletions.to_string())?;
    self.add_entry("totalInsertions", &total_insertions.to_string())?;
    self.add_entry("totalFrameShifts", &total_frame_shifts.to_string())?;
    self.add_entry(
      "totalAminoacidSubstitutions",
      &total_aminoacid_substitutions.to_string(),
    )?;
    self.add_entry("totalAminoacidDeletions", &total_aminoacid_deletions.to_string())?;
    self.add_entry("totalAminoacidInsertions", &total_aminoacid_insertions.to_string())?;
    self.add_entry("totalUnknownAa", &total_unknown_aa.to_string())?;
    self.add_entry("totalMissing", &total_missing.to_string())?;
    self.add_entry("totalNonACGTNs", &total_non_acgtns.to_string())?;
    self.add_entry("totalPcrPrimerChanges", &total_pcr_primer_changes.to_string())?;
    self.add_entry(
      "substitutions",
      &format_nuc_substitutions(substitutions, ARRAY_ITEM_DELIMITER),
    )?;
    self.add_entry("deletions", &format_nuc_deletions(deletions, ARRAY_ITEM_DELIMITER))?;
    self.add_entry("insertions", &format_nuc_insertions(insertions, ARRAY_ITEM_DELIMITER))?;
    self.add_entry(
      "privateNucMutations.reversionSubstitutions",
      &format_nuc_substitutions_minimal(&private_nuc_mutations.reversion_substitutions, ARRAY_ITEM_DELIMITER),
    )?;
    self.add_entry(
      "privateNucMutations.labeledSubstitutions",
      &format_nuc_substitutions_labeled(&private_nuc_mutations.labeled_substitutions, ARRAY_ITEM_DELIMITER),
    )?;
    self.add_entry(
      "privateNucMutations.unlabeledSubstitutions",
      &format_nuc_substitutions_minimal(&private_nuc_mutations.unlabeled_substitutions, ARRAY_ITEM_DELIMITER),
    )?;
    self.add_entry(
      "privateNucMutations.totalReversionSubstitutions",
      &private_nuc_mutations.total_reversion_substitutions.to_string(),
    )?;
    self.add_entry(
      "privateNucMutations.totalLabeledSubstitutions",
      &private_nuc_mutations.total_labeled_substitutions.to_string(),
    )?;
    self.add_entry(
      "privateNucMutations.totalUnlabeledSubstitutions",
      &private_nuc_mutations.total_unlabeled_substitutions.to_string(),
    )?;
    self.add_entry(
      "privateNucMutations.totalPrivateSubstitutions",
      &private_nuc_mutations.total_private_substitutions.to_string(),
    )?;
    self.add_entry("frameShifts", &format_frame_shifts(frame_shifts, ARRAY_ITEM_DELIMITER))?;
    self.add_entry(
      "aaSubstitutions",
      &format_aa_substitutions(aa_substitutions, ARRAY_ITEM_DELIMITER),
    )?;
    self.add_entry("aaDeletions", &format_aa_deletions(aa_deletions, ARRAY_ITEM_DELIMITER))?;
    self.add_entry(
      "aaInsertions",
      &format_aa_insertions(aa_insertions, ARRAY_ITEM_DELIMITER),
    )?;
    self.add_entry(
      "unknownAaRanges",
      &format_unknown_aa_ranges(unknown_aa_ranges, ARRAY_ITEM_DELIMITER),
    )?;
    self.add_entry("missing", &format_missings(missing, ARRAY_ITEM_DELIMITER))?;
    self.add_entry("nonACGTNs", &format_non_acgtns(non_acgtns, ARRAY_ITEM_DELIMITER))?;
    self.add_entry(
      "pcrPrimerChanges",
      &format_pcr_primer_changes(pcr_primer_changes, ARRAY_ITEM_DELIMITER),
    )?;
    self.add_entry("alignmentScore", &alignment_score)?;
    self.add_entry("alignmentStart", &(alignment_range.begin + 1).to_string())?;
    self.add_entry("alignmentEnd", &alignment_range.end.to_string())?;
    self.add_entry("coverage", coverage)?;
    self.add_entry_maybe(
      "qc.missingData.missingDataThreshold",
      qc.missing_data.as_ref().map(|md| md.missing_data_threshold.to_string()),
    )?;
    self.add_entry_maybe(
      "qc.missingData.score",
      qc.missing_data.as_ref().map(|md| format_qc_score(md.score)),
    )?;
    self.add_entry_maybe(
      "qc.missingData.status",
      qc.missing_data.as_ref().map(|md| md.status.to_string()),
    )?;
    self.add_entry_maybe(
      "qc.missingData.totalMissing",
      qc.missing_data.as_ref().map(|md| md.total_missing.to_string()),
    )?;
    self.add_entry_maybe(
      "qc.mixedSites.mixedSitesThreshold",
      qc.mixed_sites.as_ref().map(|ms| ms.mixed_sites_threshold.to_string()),
    )?;
    self.add_entry_maybe(
      "qc.mixedSites.score",
      qc.mixed_sites.as_ref().map(|ms| format_qc_score(ms.score)),
    )?;
    self.add_entry_maybe(
      "qc.mixedSites.status",
      qc.mixed_sites.as_ref().map(|ms| ms.status.to_string()),
    )?;
    self.add_entry_maybe(
      "qc.mixedSites.totalMixedSites",
      qc.mixed_sites.as_ref().map(|ms| ms.total_mixed_sites.to_string()),
    )?;
    self.add_entry_maybe(
      "qc.privateMutations.cutoff",
      qc.private_mutations.as_ref().map(|pm| pm.cutoff.to_string()),
    )?;
    self.add_entry_maybe(
      "qc.privateMutations.excess",
      qc.private_mutations.as_ref().map(|pm| pm.excess.to_string()),
    )?;
    self.add_entry_maybe(
      "qc.privateMutations.score",
      qc.private_mutations.as_ref().map(|pm| format_qc_score(pm.score)),
    )?;
    self.add_entry_maybe(
      "qc.privateMutations.status",
      qc.private_mutations.as_ref().map(|pm| pm.status.to_string()),
    )?;
    self.add_entry_maybe(
      "qc.privateMutations.total",
      qc.private_mutations.as_ref().map(|pm| pm.weighted_total.to_string()),
    )?;
    self.add_entry_maybe(
      "qc.snpClusters.clusteredSNPs",
      qc.snp_clusters
        .as_ref()
        .map(|sc| format_clustered_snps(&sc.clustered_snps, ARRAY_ITEM_DELIMITER)),
    )?;
    self.add_entry_maybe(
      "qc.snpClusters.score",
      qc.snp_clusters.as_ref().map(|sc| format_qc_score(sc.score)),
    )?;
    self.add_entry_maybe(
      "qc.snpClusters.status",
      qc.snp_clusters.as_ref().map(|sc| sc.status.to_string()),
    )?;
    self.add_entry_maybe(
      "qc.snpClusters.totalSNPs",
      qc.snp_clusters.as_ref().map(|sc| sc.total_snps.to_string()),
    )?;
    self.add_entry_maybe(
      "qc.frameShifts.frameShifts",
      qc.frame_shifts
        .as_ref()
        .map(|fs| format_frame_shifts(&fs.frame_shifts, ARRAY_ITEM_DELIMITER)),
    )?;
    self.add_entry_maybe(
      "qc.frameShifts.totalFrameShifts",
      qc.frame_shifts.as_ref().map(|fs| fs.total_frame_shifts.to_string()),
    )?;
    self.add_entry_maybe(
      "qc.frameShifts.frameShiftsIgnored",
      qc.frame_shifts
        .as_ref()
        .map(|fs| format_frame_shifts(&fs.frame_shifts_ignored, ARRAY_ITEM_DELIMITER)),
    )?;
    self.add_entry_maybe(
      "qc.frameShifts.totalFrameShiftsIgnored",
      qc.frame_shifts
        .as_ref()
        .map(|fs| fs.total_frame_shifts_ignored.to_string()),
    )?;
    self.add_entry_maybe(
      "qc.frameShifts.score",
      qc.frame_shifts.as_ref().map(|fs| format_qc_score(fs.score)),
    )?;
    self.add_entry_maybe(
      "qc.frameShifts.status",
      qc.frame_shifts.as_ref().map(|fs| fs.status.to_string()),
    )?;
    self.add_entry_maybe(
      "qc.stopCodons.stopCodons",
      qc.stop_codons
        .as_ref()
        .map(|sc| format_stop_codons(&sc.stop_codons, ARRAY_ITEM_DELIMITER)),
    )?;
    self.add_entry_maybe(
      "qc.stopCodons.totalStopCodons",
      qc.stop_codons.as_ref().map(|sc| sc.total_stop_codons.to_string()),
    )?;
    self.add_entry_maybe(
      "qc.stopCodons.score",
      qc.stop_codons.as_ref().map(|sc| format_qc_score(sc.score)),
    )?;
    self.add_entry_maybe(
      "qc.stopCodons.status",
      qc.stop_codons.as_ref().map(|sc| sc.status.to_string()),
    )?;
    self.add_entry("isReverseComplement", &is_reverse_complement.to_string())?;
    self.add_entry("failedCdses", &format_failed_cdses(missing_cdses, ARRAY_ITEM_DELIMITER))?;
    self.add_entry(
      "warnings",
      &warnings.iter().map(|PeptideWarning { warning, .. }| warning).join(";"),
    )?;
    self.add_entry("errors", &"")?;

    Ok(self)
  }

  /// Writes one row for the case of error
  pub fn write_nuc_error(&mut self, index: usize, seq_name: &str, errors: &str) -> Result<&mut Self, Report> {
    self.add_entry("index", &index)?;
    self.add_entry("seqName", &seq_name)?;
    self.add_entry("errors", &errors)?;
    Ok(self)
  }

  fn add_clade_founder_cols(
    &mut self,
    name: impl AsRef<str>,
    clade_founder_info: &CladeNodeAttrFounderInfo,
  ) -> Result<(), Report> {
    let name = name.as_ref();
    let node_name = &clade_founder_info.node_name;

    let nuc_subs = format_nuc_substitutions(
      &clade_founder_info.nuc_mutations.private_substitutions,
      ARRAY_ITEM_DELIMITER,
    );

    let nuc_dels = format_nuc_deletions(
      &clade_founder_info.nuc_mutations.private_deletion_ranges,
      ARRAY_ITEM_DELIMITER,
    );

    let aa_subs = clade_founder_info
      .aa_mutations
      .values()
      .flat_map(|m| &m.private_substitutions)
      .cloned()
      .collect_vec();
    let aa_subs = format_aa_substitutions(&aa_subs, ARRAY_ITEM_DELIMITER);

    let aa_dels = clade_founder_info
      .aa_mutations
      .values()
      .flat_map(|m| &m.private_deletions)
      .cloned()
      .collect_vec();
    let aa_dels = format_aa_deletions(&aa_dels, ARRAY_ITEM_DELIMITER);

    self.add_entry(format!("founderMuts['{name}'].nodeName"), &node_name)?;
    self.add_entry(format!("founderMuts['{name}'].substitutions"), &nuc_subs)?;
    self.add_entry(format!("founderMuts['{name}'].deletions"), &nuc_dels)?;
    self.add_entry(format!("founderMuts['{name}'].aaSubstitutions"), &aa_subs)?;
    self.add_entry(format!("founderMuts['{name}'].aaDeletions"), &aa_dels)?;

    Ok(())
  }

  /// Adds an entry to the current row, ensuring the correct order of columns according to the list of headers
  fn add_entry<K: AsRef<str> + Display, V: ToString>(&mut self, key: K, val: &V) -> Result<(), Report> {
    let index = self.headers.iter().position(|header| header == key.as_ref());
    match index {
      None => Ok(()),
      Some(index) => {
        self.row[index] = val.to_string();
        Ok(())
      }
    }
  }

  /// Adds an optional entry to the current row, ensuring the correct order of columns according to the list of headers.
  /// If the value passed is None, then the resulting cell will be an empty string.
  fn add_entry_maybe<K: AsRef<str> + Display, V: ToString>(
    &mut self,
    key: K,
    val_maybe: Option<V>,
  ) -> Result<(), Report> {
    let val = match val_maybe {
      None => "".to_owned(),
      Some(val) => val.to_string(),
    };
    self.add_entry(key, &val)
  }

  #[must_use]
  pub const fn inner(&self) -> &Vec<String> {
    &self.row
  }

  pub fn values(&self) -> impl Iterator<Item = &String> + '_ {
    self.row.iter()
  }

  pub fn clear(&mut self) {
    self.row.iter_mut().for_each(String::clear);
  }
}

#[inline]
pub fn format_nuc_substitutions(substitutions: &[NucSub], delimiter: &str) -> String {
  substitutions.iter().map(ToString::to_string).join(delimiter)
}

#[inline]
pub fn format_nuc_substitutions_minimal(substitutions: &[NucSub], delimiter: &str) -> String {
  substitutions.iter().map(NucSub::to_string).join(delimiter)
}

#[inline]
pub fn format_nuc_substitutions_labeled(substitutions: &[NucSubLabeled], delimiter: &str) -> String {
  substitutions
    .iter()
    .map(|sub| {
      let labels = sub.labels.join("&");
      let sub = sub.substitution.to_string();
      format!("{sub}|{labels}")
    })
    .join(delimiter)
}

#[inline]
pub fn format_nuc_deletions(deletions: &[NucDelRange], delimiter: &str) -> String {
  deletions.iter().map(|del| del.range().to_string()).join(delimiter)
}

#[inline]
pub fn format_nuc_insertions(nuc_insertions: &[Insertion<Nuc>], delimiter: &str) -> String {
  nuc_insertions
    .iter()
    .map(|Insertion { pos, ins }| {
      let ins_str = from_nuc_seq(ins);
      let pos_one_based = pos + 1;
      format!("{pos_one_based}:{ins_str}")
    })
    .join(delimiter)
}

#[inline]
pub fn format_non_acgtns(non_acgtns: &[NucRange], delimiter: &str) -> String {
  non_acgtns
    .iter()
    .map(|non_acgtn| {
      let nuc = from_nuc(non_acgtn.letter);
      let range = &non_acgtn.range().to_string();
      format!("{nuc}:{range}")
    })
    .join(delimiter)
}

#[inline]
pub fn format_missings(missings: &[NucRange], delimiter: &str) -> String {
  missings
    .iter()
    .map(|missing| missing.range().to_string())
    .join(delimiter)
}

#[inline]
pub fn format_pcr_primer_changes(pcr_primer_changes: &[PcrPrimerChange], delimiter: &str) -> String {
  pcr_primer_changes
    .iter()
    .map(|pc| {
      let name = &pc.primer.name;
      let subs = format_nuc_substitutions_minimal(&pc.substitutions, ";");
      format!("{name}:{subs}")
    })
    .join(delimiter)
}

#[inline]
pub fn format_aa_substitutions(aa_subs: &[AaSub], delimiter: &str) -> String {
  aa_subs.iter().map(ToString::to_string).join(delimiter)
}

#[inline]
pub fn format_aa_deletions(aa_dels: &[AaDel], delimiter: &str) -> String {
  aa_dels.iter().map(ToString::to_string).join(delimiter)
}

#[inline]
pub fn format_aa_insertions(insertions: &[AaIns], delimiter: &str) -> String {
  insertions
    .iter()
    .map(|AaIns { cds, ins, pos }: &AaIns| {
      let ins_str = from_aa_seq(ins);
      let pos_one_based = pos + 1;
      format!("{cds}:{pos_one_based}:{ins_str}")
    })
    .join(delimiter)
}

#[inline]
pub fn format_unknown_aa_ranges(unknown_aa_ranges: &[CdsAaRange], delimiter: &str) -> String {
  unknown_aa_ranges
    .iter()
    .flat_map(|CdsAaRange { cds_name, ranges, .. }: &CdsAaRange| {
      ranges.iter().map(move |range| {
        let range_str = range.range().to_string();
        format!("{cds_name}:{range_str}")
      })
    })
    .join(delimiter)
}

#[inline]
pub fn format_frame_shifts(frame_shifts: &[FrameShift], delimiter: &str) -> String {
  frame_shifts
    .iter()
    .map(|frame_shift| {
      let cds_name = &frame_shift.cds_name;
      let range = &frame_shift.codon.to_string();
      format!("{cds_name}:{range}")
    })
    .join(delimiter)
}

#[inline]
pub fn format_clustered_snps(snps: &[ClusteredSnp], delimiter: &str) -> String {
  snps
    .iter()
    .map(|snp| {
      let range = NucRefGlobalRange::from_usize(snp.start, snp.end).to_string();
      let number_of_snps = snp.number_of_snps;
      format!("{range}:{number_of_snps}")
    })
    .join(delimiter)
}

#[inline]
pub fn format_stop_codons(stop_codons: &[StopCodonLocation], delimiter: &str) -> String {
  stop_codons
    .iter()
    .map(|StopCodonLocation { cds_name, codon }| format!("{cds_name}:{codon}"))
    .join(delimiter)
}

#[inline]
pub fn format_failed_cdses(failed_cdses: &[String], delimiter: &str) -> String {
  failed_cdses.join(delimiter)
}

#[inline]
pub fn format_qc_score(score: f64) -> String {
  if !is_int(score) {
    return format!("{score:.6}");
  }
  score.to_string()
}

#[inline]
pub fn format_escape(escape: &[PhenotypeValue]) -> String {
  escape
    .iter()
    .map(
      |PhenotypeValue {
         name, value: escape, ..
       }| format!("{name}:{escape}"),
    )
    .join(";")
}

#[inline]
fn format_aa_motifs(motifs: &[AaMotif]) -> String {
  motifs
    .iter()
    .map(|AaMotif { cds, position, seq, .. }| format!("{}:{}:{seq}", cds, position + 1))
    .join(";")
}
