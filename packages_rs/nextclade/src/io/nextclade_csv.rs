use crate::align::insertions_strip::{AaIns, Insertion};
use crate::analyze::aa_sub_full::{AaDelFull, AaSubFull};
use crate::analyze::letter_ranges::NucRange;
use crate::analyze::nuc_sub::{NucSub, NucSubLabeled};
use crate::analyze::nuc_sub_full::{NucDelFull, NucSubFull};
use crate::analyze::pcr_primer_changes::PcrPrimerChange;
use crate::io::aa::{from_aa_seq, Aa};
use crate::io::csv::{CsvVecFileWriter, CsvVecWriter, VecWriter};
use crate::io::nuc::{from_nuc, from_nuc_seq, Nuc};
use crate::make_internal_error;
use crate::qc::qc_config::StopCodonLocation;
use crate::qc::qc_rule_snp_clusters::ClusteredSnp;
use crate::translate::frame_shifts_translate::FrameShift;
use crate::translate::translate_genes::Translation;
use crate::types::outputs::{
  combine_outputs_and_errors_sorted, NextcladeErrorOutputs, NextcladeOutputOrError, NextcladeOutputs, PeptideWarning,
};
use crate::utils::error::report_to_string;
use crate::utils::num::is_int;
use crate::utils::range::Range;
use eyre::Report;
use itertools::Itertools;
use regex::internal::Input;
use std::fmt::Display;
use std::io::Write;
use std::path::Path;

/// List of headers in the resulting CSV or TSV file. Order is important!
static NEXTCLADE_CSV_HEADERS: &[&str] = &[
  "seqName",
  "clade",
  "qc.overallScore",
  "qc.overallStatus",
  "totalSubstitutions",
  "totalDeletions",
  "totalInsertions",
  "totalFrameShifts",
  "totalAminoacidSubstitutions",
  "totalAminoacidDeletions",
  "totalAminoacidInsertions",
  "totalMissing",
  "totalNonACGTNs",
  "totalPcrPrimerChanges",
  "substitutions",
  "deletions",
  "insertions",
  "privateNucMutations.reversionSubstitutions",
  "privateNucMutations.labeledSubstitutions",
  "privateNucMutations.unlabeledSubstitutions",
  "privateNucMutations.totalReversionSubstitutions",
  "privateNucMutations.totalLabeledSubstitutions",
  "privateNucMutations.totalUnlabeledSubstitutions",
  "privateNucMutations.totalPrivateSubstitutions",
  "frameShifts",
  "aaSubstitutions",
  "aaDeletions",
  "aaInsertions",
  "missing",
  "nonACGTNs",
  "pcrPrimerChanges",
  "alignmentScore",
  "alignmentStart",
  "alignmentEnd",
  "coverage",
  "qc.missingData.missingDataThreshold",
  "qc.missingData.score",
  "qc.missingData.status",
  "qc.missingData.totalMissing",
  "qc.mixedSites.mixedSitesThreshold",
  "qc.mixedSites.score",
  "qc.mixedSites.status",
  "qc.mixedSites.totalMixedSites",
  "qc.privateMutations.cutoff",
  "qc.privateMutations.excess",
  "qc.privateMutations.score",
  "qc.privateMutations.status",
  "qc.privateMutations.total",
  "qc.snpClusters.clusteredSNPs",
  "qc.snpClusters.score",
  "qc.snpClusters.status",
  "qc.snpClusters.totalSNPs",
  "qc.frameShifts.frameShifts",
  "qc.frameShifts.totalFrameShifts",
  "qc.frameShifts.frameShiftsIgnored",
  "qc.frameShifts.totalFrameShiftsIgnored",
  "qc.frameShifts.score",
  "qc.frameShifts.status",
  "qc.stopCodons.stopCodons",
  "qc.stopCodons.totalStopCodons",
  "qc.stopCodons.score",
  "qc.stopCodons.status",
  "isReverseComplement",
  "failedGenes",
  "warnings",
  "errors",
];

fn prepare_headers(custom_node_attr_keys: &[String]) -> Vec<String> {
  let mut headers: Vec<String> = NEXTCLADE_CSV_HEADERS
    .iter()
    .copied()
    .map(ToOwned::to_owned)
    .collect_vec();

  let index_of_clade_col = headers
    .iter()
    .position(|header| header == "clade")
    .unwrap_or(headers.len());

  custom_node_attr_keys.iter().rev().for_each(|key| {
    headers.insert(index_of_clade_col + 1, key.clone());
  });

  headers
}

/// Writes content of nextclade.csv and nextclade.tsv files (but not necessarily files themselves - writer is generic)
pub struct NextcladeResultsCsvWriter<W: VecWriter> {
  writer: W,
  headers: Vec<String>,
  row: Vec<String>,
}

impl<W: VecWriter> NextcladeResultsCsvWriter<W> {
  pub fn new(writer: W, headers: &[String]) -> Result<Self, Report> {
    let row = vec!["".to_owned(); headers.len()];
    Ok(Self {
      writer,
      headers: headers.to_vec(),
      row,
    })
  }

  pub fn into_inner(self) -> W {
    self.writer
  }

  /// Writes one row into nextclade.csv or .tsv file
  pub fn write(&mut self, nextclade_outputs: &NextcladeOutputs) -> Result<(), Report> {
    const ARRAY_ITEM_DELIMITER: &str = ",";

    let NextcladeOutputs {
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
      // unknown_aa_ranges,
      // total_unknown_aa,
      alignment_start,
      alignment_end,
      alignment_score,
      pcr_primer_changes,
      total_pcr_primer_changes,
      clade,
      private_nuc_mutations,
      // private_aa_mutations,
      missing_genes,
      // divergence,
      coverage,
      qc,
      custom_node_attributes,
      is_reverse_complement,
      warnings,
      ..
    } = nextclade_outputs;

    custom_node_attributes
      .clone()
      .into_iter()
      .try_for_each(|(key, attr)| self.add_entry(&key, &attr.value))?;

    self.add_entry("seqName", seq_name)?;
    self.add_entry("clade", clade)?;
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
    self.add_entry("missing", &format_missings(missing, ARRAY_ITEM_DELIMITER))?;
    self.add_entry("nonACGTNs", &format_non_acgtns(non_acgtns, ARRAY_ITEM_DELIMITER))?;
    self.add_entry(
      "pcrPrimerChanges",
      &format_pcr_primer_changes(pcr_primer_changes, ARRAY_ITEM_DELIMITER),
    )?;
    self.add_entry("alignmentScore", &alignment_score)?;
    self.add_entry("alignmentStart", &alignment_start.to_string())?;
    self.add_entry("alignmentEnd", &alignment_end.to_string())?;
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
    self.add_entry("failedGenes", &format_failed_genes(missing_genes, ARRAY_ITEM_DELIMITER))?;
    self.add_entry(
      "warnings",
      &warnings.iter().map(|PeptideWarning { warning, .. }| warning).join(";"),
    )?;
    self.add_entry("errors", &"")?;

    self.write_row()?;

    Ok(())
  }

  /// Writes one row for the case of error
  pub fn write_nuc_error(&mut self, seq_name: &str, errors: &str) -> Result<(), Report> {
    self.add_entry("seqName", &seq_name)?;
    self.add_entry("errors", &errors)?;
    self.write_row()?;
    Ok(())
  }

  /// Adds an entry to the current row, ensuring the correct order of columns according to the list of headers
  #[inline]
  fn add_entry<K: AsRef<str> + Display, V: ToString>(&mut self, key: K, val: &V) -> Result<(), Report> {
    let index = self.headers.iter().position(|header| header == key.as_ref());
    match index {
      None => make_internal_error!("When adding entry to a CSV file: CSV header not found for key: '{key}'"),
      Some(index) => {
        self.row[index] = val.to_string();
        Ok(())
      }
    }
  }

  /// Adds an optional entry to the current row, ensuring the correct order of columns according to the list of headers.
  /// If the value passed is None, then the resulting cell will be an empty string.
  #[inline]
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

  /// Writes current row and clears it
  fn write_row(&mut self) -> Result<(), Report> {
    self.writer.write(&self.row)?;
    self.row.iter_mut().for_each(String::clear);
    Ok(())
  }
}

/// Writes nextclade.csv and nextclade.tsv files
pub struct NextcladeResultsCsvFileWriter {
  writer: NextcladeResultsCsvWriter<CsvVecFileWriter>,
}

impl NextcladeResultsCsvFileWriter {
  pub fn new(filepath: impl AsRef<Path>, delimiter: u8, clade_attr_keys: &[String]) -> Result<Self, Report> {
    let headers: Vec<String> = prepare_headers(clade_attr_keys);
    let csv_writer = CsvVecFileWriter::new(filepath, delimiter, &headers)?;
    let writer = NextcladeResultsCsvWriter::new(csv_writer, &headers)?;
    Ok(Self { writer })
  }

  pub fn write(&mut self, nextclade_outputs: &NextcladeOutputs) -> Result<(), Report> {
    self.writer.write(nextclade_outputs)
  }

  /// Writes one row into nextclade.csv or .tsv file for the case of error
  pub fn write_nuc_error(&mut self, seq_name: &str, errors: &str) -> Result<(), Report> {
    self.writer.write_nuc_error(seq_name, errors)
  }
}

#[inline]
pub fn format_nuc_substitutions(substitutions: &[NucSubFull], delimiter: &str) -> String {
  substitutions.iter().map(|sub| sub.sub.to_string()).join(delimiter)
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
      let sub = sub.sub.to_string();
      format!("{sub}|{labels}")
    })
    .join(delimiter)
}

#[inline]
pub fn format_nuc_deletions(deletions: &[NucDelFull], delimiter: &str) -> String {
  deletions
    .iter()
    .map(|del| del.del.to_range().to_string())
    .join(delimiter)
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
      let range = &non_acgtn.to_range().to_string();
      format!("{nuc}:{range}")
    })
    .join(delimiter)
}

#[inline]
pub fn format_missings(missings: &[NucRange], delimiter: &str) -> String {
  missings
    .iter()
    .map(|missing| missing.to_range().to_string())
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
pub fn format_aa_substitutions(substitutions: &[AaSubFull], delimiter: &str) -> String {
  substitutions.iter().map(|sub| sub.sub.to_string()).join(delimiter)
}

#[inline]
pub fn format_aa_deletions(substitutions: &[AaDelFull], delimiter: &str) -> String {
  substitutions.iter().map(|del| del.del.to_string()).join(delimiter)
}

#[inline]
pub fn format_aa_insertion(AaIns { gene, ins, pos }: &AaIns) -> String {
  let ins_str = from_aa_seq(ins);
  let pos_one_based = pos + 1;
  format!("{gene}:{pos_one_based}:{ins_str}")
}

#[inline]
pub fn format_aa_insertions(insertions: &[AaIns], delimiter: &str) -> String {
  insertions.iter().map(format_aa_insertion).join(delimiter)
}

#[inline]
pub fn format_frame_shifts(frame_shifts: &[FrameShift], delimiter: &str) -> String {
  frame_shifts
    .iter()
    .map(|frame_shift| {
      let gene_name = &frame_shift.gene_name;
      let range = &frame_shift.codon.to_string();
      format!("{gene_name}:{range}")
    })
    .join(delimiter)
}

#[inline]
pub fn format_aa_insertions_from_translations(translations: &[Translation], delimiter: &str) -> String {
  translations
    .iter()
    .map(
      |Translation {
         gene_name, insertions, ..
       }| {
        insertions
          .iter()
          .cloned()
          .map(|Insertion::<Aa> { pos, ins }| {
            format_aa_insertion(&AaIns {
              gene: gene_name.clone(),
              pos,
              ins,
            })
          })
          .join(";")
      },
    )
    .filter(|s| !s.is_empty())
    .join(delimiter)
}

#[inline]
pub fn format_clustered_snps(snps: &[ClusteredSnp], delimiter: &str) -> String {
  snps
    .iter()
    .map(|snp| {
      let range = Range::new(snp.start, snp.end).to_string();
      let number_of_snps = snp.number_of_snps;
      format!("{range}:{number_of_snps}")
    })
    .join(delimiter)
}

#[inline]
pub fn format_stop_codons(stop_codons: &[StopCodonLocation], delimiter: &str) -> String {
  stop_codons
    .iter()
    .map(|StopCodonLocation { gene_name, codon }| format!("{gene_name}:{codon}"))
    .join(delimiter)
}

#[inline]
pub fn format_failed_genes(failed_genes: &[String], delimiter: &str) -> String {
  failed_genes.join(delimiter)
}

#[inline]
pub fn format_aa_warnings(maybe_translations: &[Result<Translation, Report>], delimiter: &str) -> String {
  maybe_translations
    .iter()
    .filter_map(|tr| match tr {
      Err(report) => Some(report_to_string(report)),
      Ok(_) => None,
    })
    .join(delimiter)
}

#[inline]
pub fn format_qc_score(score: f64) -> String {
  if !is_int(score) {
    return format!("{score:.6}");
  }
  score.to_string()
}

pub fn results_to_csv_string(
  outputs: &[NextcladeOutputs],
  errors: &[NextcladeErrorOutputs],

  clade_attr_keys: &[String],
  delimiter: u8,
) -> Result<String, Report> {
  let mut buf = Vec::<u8>::new();

  {
    let headers: Vec<String> = prepare_headers(clade_attr_keys);
    let csv_writer = CsvVecWriter::new(&mut buf, delimiter, &headers)?;
    let mut writer = NextcladeResultsCsvWriter::new(csv_writer, &headers)?;

    let outputs_or_errors = combine_outputs_and_errors_sorted(outputs, errors);
    for (_, output_or_error) in outputs_or_errors {
      match output_or_error {
        NextcladeOutputOrError::Outputs(output) => writer.write(&output)?,
        NextcladeOutputOrError::Error(error) => writer.write_nuc_error(&error.seq_name, &error.errors.join(";"))?,
      };
    }
  }

  Ok(String::from_utf8(buf)?)
}
