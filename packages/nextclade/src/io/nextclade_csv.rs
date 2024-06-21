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
use crate::io::csv::{CsvVecFileWriter, CsvVecWriter, VecWriter};
use crate::qc::qc_config::StopCodonLocation;
use crate::qc::qc_rule_snp_clusters::ClusteredSnp;
use crate::translate::frame_shifts_translate::FrameShift;
use crate::tree::tree::{AuspiceRefNodeSearchDesc, AuspiceRefNodesDesc};
use crate::types::outputs::{
  combine_outputs_and_errors_sorted, NextcladeErrorOutputs, NextcladeOutputOrError, NextcladeOutputs, PeptideWarning,
  PhenotypeValue,
};
use crate::utils::num::is_int;
use crate::{make_error, o};
use edit_distance::edit_distance;
use eyre::Report;
use indexmap::{indexmap, IndexMap};
use itertools::{chain, Either, Itertools};
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::fmt::Display;
use std::path::Path;
use std::str::FromStr;
use strum;
use strum::VariantNames;
use strum_macros::{Display, EnumString, EnumVariantNames};

const ARRAY_ITEM_DELIMITER: &str = ",";

// List of categories of CSV columns
#[derive(
  Clone, Debug, Display, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema, Hash, EnumString, EnumVariantNames,
)]
#[serde(rename_all = "kebab-case")]
#[strum(serialize_all = "kebab-case")]
pub enum CsvColumnCategory {
  All,
  General,
  RefMuts,
  PrivMuts,
  CladeFounderMuts,
  RelMuts,
  ErrsWarns,
  Qc,
  Primers,
  Dynamic,
}

pub type CsvColumnConfigMap = IndexMap<CsvColumnCategory, IndexMap<String, bool>>;

// Configuration for enabling/disabling CSV columns or categories of them
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CsvColumnConfig {
  pub categories: CsvColumnConfigMap,
  pub individual: Vec<String>,
  pub include_dynamic: bool,
  pub include_clade_founder_muts: bool,
  pub include_rel_muts: bool,
}

impl CsvColumnConfig {
  pub fn new(output_columns_selection: &[String]) -> Result<Self, Report> {
    let (categories, individual): (Vec<CsvColumnCategory>, Vec<String>) = output_columns_selection
      .iter()
      .partition_map(|candidate| match CsvColumnCategory::from_str(candidate) {
        Ok(category) => Either::Left(category),
        Err(_) => Either::Right(candidate.clone()),
      });

    individual.iter().try_for_each(|header| {
      if !CSV_POSSIBLE_COLUMNS.contains(header) && !CSV_POSSIBLE_CATEGORIES.contains(header) {
        let categories = CSV_POSSIBLE_CATEGORIES.join(", ");
        let individual = CSV_POSSIBLE_COLUMNS.join(", ");

        let suggestions = CSV_POSSIBLE_CATEGORIES.iter().chain(CSV_POSSIBLE_COLUMNS.iter())
          .filter_map(|candidate| {
          let distance = edit_distance(candidate, header);
          (distance < 3).then_some((candidate, distance))
        }).sorted_by_key(|(_, distance)| *distance).map(|(candidate, _)| candidate).join(", ");

        let suggestion_text = if suggestions.is_empty() { Cow::from("") } else { Cow::from(format!("\n\n  Did you mean: {suggestions}?")) };

        make_error!("Output columns selection: unknown column or category name '{header}'.\n\nPossible categories:\n    {categories}\n\nPossible individual columns:\n    {individual}{suggestion_text}")
      } else {
        Ok(())
      }
    })?;

    if output_columns_selection.is_empty() || categories.contains(&CsvColumnCategory::All) {
      Ok(Self::default())
    } else {
      let include_dynamic = categories.contains(&CsvColumnCategory::Dynamic);

      let include_rel_muts = categories.contains(&CsvColumnCategory::RelMuts);

      let include_clade_founder_muts = categories.contains(&CsvColumnCategory::CladeFounderMuts);

      let categories = categories
        .into_iter()
        .filter(|category| !matches!(category, CsvColumnCategory::Dynamic)) // Dynamic columns are handled specially
        .map(|category| {
          let columns = CSV_COLUMN_CONFIG_MAP_DEFAULT.get(&category).unwrap().clone();
          (category, columns)
        })
        .collect();

      Ok(Self {
        categories,
        individual,
        include_dynamic,
        include_clade_founder_muts,
        include_rel_muts,
      })
    }
  }
}

impl Default for CsvColumnConfig {
  fn default() -> Self {
    Self {
      categories: CSV_COLUMN_CONFIG_MAP_DEFAULT.clone(),
      individual: vec![],
      include_dynamic: true,
      include_clade_founder_muts: true,
      include_rel_muts: true,
    }
  }
}

lazy_static! {
  // Default configuration and layout of CSV column categories
  pub static ref CSV_COLUMN_CONFIG_MAP_DEFAULT: CsvColumnConfigMap = indexmap! {
    CsvColumnCategory::General => indexmap! {
      o!("index") => true,
      o!("seqName") => true,
      o!("clade") => true,
      o!("qc.overallScore") => true,
      o!("qc.overallStatus") => true,
      o!("totalSubstitutions") => true,
      o!("totalDeletions") => true,
      o!("totalInsertions") => true,
      o!("totalFrameShifts") => true,
      o!("totalMissing") => true,
      o!("totalNonACGTNs") => true,
      o!("totalAminoacidSubstitutions") => true,
      o!("totalAminoacidDeletions") => true,
      o!("totalAminoacidInsertions") => true,
      o!("totalUnknownAa") => true,
      o!("alignmentScore") => true,
      o!("alignmentStart") => true,
      o!("alignmentEnd") => true,
      o!("coverage") => true,
      o!("isReverseComplement") => true,
    },
    CsvColumnCategory::RefMuts => indexmap! {
      o!("substitutions") => true,
      o!("deletions") => true,
      o!("insertions") => true,
      o!("frameShifts") => true,
      o!("aaSubstitutions") => true,
      o!("aaDeletions") => true,
      o!("aaInsertions") => true,
    },
    CsvColumnCategory::PrivMuts => indexmap! {
      o!("privateNucMutations.reversionSubstitutions") => true,
      o!("privateNucMutations.labeledSubstitutions") => true,
      o!("privateNucMutations.unlabeledSubstitutions") => true,
      o!("privateNucMutations.totalReversionSubstitutions") => true,
      o!("privateNucMutations.totalLabeledSubstitutions") => true,
      o!("privateNucMutations.totalUnlabeledSubstitutions") => true,
      o!("privateNucMutations.totalPrivateSubstitutions") => true,
    },
    CsvColumnCategory::Qc => indexmap! {
      o!("missing") => true,
      o!("unknownAaRanges") => true,
      o!("nonACGTNs") => true,
      o!("qc.overallScore") => true,
      o!("qc.overallStatus") => true,
      o!("qc.missingData.missingDataThreshold") => true,
      o!("qc.missingData.score") => true,
      o!("qc.missingData.status") => true,
      o!("qc.missingData.totalMissing") => true,
      o!("qc.mixedSites.mixedSitesThreshold") => true,
      o!("qc.mixedSites.score") => true,
      o!("qc.mixedSites.status") => true,
      o!("qc.mixedSites.totalMixedSites") => true,
      o!("qc.privateMutations.cutoff") => true,
      o!("qc.privateMutations.excess") => true,
      o!("qc.privateMutations.score") => true,
      o!("qc.privateMutations.status") => true,
      o!("qc.privateMutations.total") => true,
      o!("qc.snpClusters.clusteredSNPs") => true,
      o!("qc.snpClusters.score") => true,
      o!("qc.snpClusters.status") => true,
      o!("qc.snpClusters.totalSNPs") => true,
      o!("qc.frameShifts.frameShifts") => true,
      o!("qc.frameShifts.totalFrameShifts") => true,
      o!("qc.frameShifts.frameShiftsIgnored") => true,
      o!("qc.frameShifts.totalFrameShiftsIgnored") => true,
      o!("qc.frameShifts.score") => true,
      o!("qc.frameShifts.status") => true,
      o!("qc.stopCodons.stopCodons") => true,
      o!("qc.stopCodons.totalStopCodons") => true,
      o!("qc.stopCodons.score") => true,
      o!("qc.stopCodons.status") => true,
    },
    CsvColumnCategory::Primers => indexmap! {
      o!("totalPcrPrimerChanges") => true,
      o!("pcrPrimerChanges") => true,
    },
    CsvColumnCategory::ErrsWarns => indexmap! {
      o!("failedCdses") => true,
      o!("warnings") => true,
      o!("errors") => true,
    }
  };

  pub static ref CSV_POSSIBLE_CATEGORIES: Vec<String> = CsvColumnCategory::VARIANTS.iter()
    .copied()
    .map(String::from)
    .collect_vec();

  pub static ref CSV_POSSIBLE_COLUMNS: Vec<String> = CSV_COLUMN_CONFIG_MAP_DEFAULT
    .iter()
    .flat_map(|(_, columns)| columns.iter())
    .map(|(column, _)| column.clone())
    .collect_vec();
}

fn prepare_headers(
  custom_node_attr_keys: &[String],
  phenotype_attr_keys: &[String],
  ref_nodes: &AuspiceRefNodesDesc,
  aa_motifs_keys: &[String],
  column_config: &CsvColumnConfig,
) -> Vec<String> {
  // Get names of enabled columns
  let mut headers = {
    let category_headers = column_config
      .categories
      .iter()
      .flat_map(|(_, columns)| columns.iter())
      .filter(|(_, enabled)| **enabled)
      .map(|(column, _)| column.as_str());

    let individual_headers = column_config.individual.iter().map(String::as_str);

    chain![category_headers, individual_headers]
      .unique()
      .map(String::from)
      .collect_vec()
  };

  if column_config.include_dynamic {
    // Insert dynamic columns after this column index
    let mut insert_custom_cols_at_index = headers
      .iter()
      .position(|header| header == "clade")
      .unwrap_or_else(|| headers.len().saturating_sub(1))
      .clamp(0, headers.len());

    custom_node_attr_keys.iter().rev().for_each(|key| {
      insert_after(&mut headers, insert_custom_cols_at_index, key.clone());
      insert_custom_cols_at_index += 1;
    });

    phenotype_attr_keys.iter().rev().for_each(|key| {
      insert_after(&mut headers, insert_custom_cols_at_index, key.clone());
      insert_custom_cols_at_index += 1;
    });

    aa_motifs_keys.iter().rev().for_each(|key| {
      insert_after(&mut headers, insert_custom_cols_at_index, key.clone());
      insert_custom_cols_at_index += 1;
    });
  }

  if column_config.include_rel_muts {
    // Insert columns after this column index
    let mut insert_custom_cols_at_index = headers
      .iter()
      .position(|header| header == "missing")
      .unwrap_or_else(|| headers.len().saturating_sub(1))
      .clamp(0, headers.len());

    // For each ref node insert a set of columns
    for ref_node in &ref_nodes.search {
      for col in &rel_mut_cols(ref_node) {
        insert_after(&mut headers, insert_custom_cols_at_index, col.to_owned());
        insert_custom_cols_at_index += 1;
      }
    }
  }

  if column_config.include_clade_founder_muts {
    // Insert columns after this column index
    let mut insert_custom_cols_at_index = headers
      .iter()
      .position(|header| header == "missing")
      .unwrap_or_else(|| headers.len().saturating_sub(1))
      .clamp(0, headers.len());

    let builtin_attrs = vec![o!("clade")];
    let attrs = chain!(&builtin_attrs, custom_node_attr_keys);

    // For each attribute insert a set of columns
    for attr in attrs {
      for col in &clade_founder_cols(attr) {
        insert_after(&mut headers, insert_custom_cols_at_index, col.to_owned());
        insert_custom_cols_at_index += 1;
      }
    }
  }

  headers
}

fn clade_founder_cols(name: impl AsRef<str>) -> [String; 5] {
  let name = name.as_ref();
  [
    format!("founderMuts['{name}'].nodeName"),
    format!("founderMuts['{name}'].substitutions"),
    format!("founderMuts['{name}'].deletions"),
    format!("founderMuts['{name}'].aaSubstitutions"),
    format!("founderMuts['{name}'].aaDeletions"),
  ]
}

fn rel_mut_cols(desc: &AuspiceRefNodeSearchDesc) -> [String; 5] {
  let name = desc.display_name_or_name();
  [
    format!("relativeMutations['{name}'].nodeName"),
    format!("relativeMutations['{name}'].substitutions"),
    format!("relativeMutations['{name}'].deletions"),
    format!("relativeMutations['{name}'].aaSubstitutions"),
    format!("relativeMutations['{name}'].aaDeletions"),
  ]
}

fn insert_after<T>(v: &mut Vec<T>, index: usize, val: T) {
  if index > v.len() {
    v.push(val);
  } else {
    v.insert(index + 1, val);
  }
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

  /// Writes one row into nextclade.csv or .tsv file
  pub fn write(&mut self, nextclade_outputs: &NextcladeOutputs) -> Result<(), Report> {
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

    self.write_row()?;

    Ok(())
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

  /// Writes one row for the case of error
  pub fn write_nuc_error(&mut self, index: usize, seq_name: &str, errors: &str) -> Result<(), Report> {
    self.add_entry("index", &index)?;
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
      None => Ok(()),
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
  pub fn new(
    filepath: impl AsRef<Path>,
    delimiter: u8,
    clade_attr_keys: &[String],
    phenotype_attr_keys: &[String],
    ref_nodes: &AuspiceRefNodesDesc,
    aa_motifs_keys: &[String],
    column_config: &CsvColumnConfig,
  ) -> Result<Self, Report> {
    let headers: Vec<String> = prepare_headers(
      clade_attr_keys,
      phenotype_attr_keys,
      ref_nodes,
      aa_motifs_keys,
      column_config,
    );
    let csv_writer = CsvVecFileWriter::new(filepath, delimiter, &headers)?;
    let writer = NextcladeResultsCsvWriter::new(csv_writer, &headers)?;
    Ok(Self { writer })
  }

  pub fn write(&mut self, nextclade_outputs: &NextcladeOutputs) -> Result<(), Report> {
    self.writer.write(nextclade_outputs)
  }

  /// Writes one row into nextclade.csv or .tsv file for the case of error
  pub fn write_nuc_error(&mut self, index: usize, seq_name: &str, errors: &str) -> Result<(), Report> {
    self.writer.write_nuc_error(index, seq_name, errors)
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

pub fn results_to_csv_string(
  outputs: &[NextcladeOutputs],
  errors: &[NextcladeErrorOutputs],
  clade_attr_keys: &[String],
  phenotype_attr_keys: &[String],
  ref_nodes: &AuspiceRefNodesDesc,
  aa_motifs_keys: &[String],
  delimiter: u8,
  column_config: &CsvColumnConfig,
) -> Result<String, Report> {
  let mut buf = Vec::<u8>::new();

  {
    let headers: Vec<String> = prepare_headers(
      clade_attr_keys,
      phenotype_attr_keys,
      ref_nodes,
      aa_motifs_keys,
      column_config,
    );
    let csv_writer = CsvVecWriter::new(&mut buf, delimiter, &headers)?;
    let mut writer = NextcladeResultsCsvWriter::new(csv_writer, &headers)?;

    let outputs_or_errors = combine_outputs_and_errors_sorted(outputs, errors);
    for (_, output_or_error) in outputs_or_errors {
      match output_or_error {
        NextcladeOutputOrError::Outputs(output) => writer.write(&output)?,
        NextcladeOutputOrError::Error(error) => {
          writer.write_nuc_error(error.index, &error.seq_name, &error.errors.join(";"))?;
        }
      };
    }
  }

  Ok(String::from_utf8(buf)?)
}
