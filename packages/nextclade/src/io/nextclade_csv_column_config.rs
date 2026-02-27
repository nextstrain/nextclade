use crate::{make_error, o};
use edit_distance::edit_distance;
use eyre::Report;
use indexmap::{IndexMap, indexmap};
use itertools::{Either, Itertools};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::str::FromStr;
use std::sync::LazyLock;
use strum::VariantNames;
use strum_macros::{Display, EnumString, VariantNames};

// List of categories of CSV columns
#[derive(
  Clone, Debug, Display, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema, Hash, EnumString, VariantNames,
)]
#[serde(rename_all = "kebab-case")]
#[strum(serialize_all = "kebab-case")]
pub enum CsvColumnCategory {
  All,
  General,
  RefMuts,
  PrivMuts,
  PrivAaMuts,
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
      if !CSV_POSSIBLE_COLUMNS.contains(header) {
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
        .filter_map(|category| {
          let columns = CSV_COLUMN_CONFIG_MAP_DEFAULT.get(&category)?.clone();
          Some((category, columns))
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

// Default configuration and layout of CSV column categories
pub static CSV_COLUMN_CONFIG_MAP_DEFAULT: LazyLock<CsvColumnConfigMap> = LazyLock::new(|| {
  indexmap! {
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
      o!("cdsCoverage") => true,
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
    CsvColumnCategory::PrivAaMuts => indexmap! {
      o!("privateAaMutations.reversionSubstitutions") => true,
      o!("privateAaMutations.labeledSubstitutions") => true,
      o!("privateAaMutations.unlabeledSubstitutions") => true,
      o!("privateAaMutations.totalReversionSubstitutions") => true,
      o!("privateAaMutations.totalLabeledSubstitutions") => true,
      o!("privateAaMutations.totalUnlabeledSubstitutions") => true,
      o!("privateAaMutations.totalPrivateSubstitutions") => true,
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
      o!("qc.recombinants.score") => true,
      o!("qc.recombinants.status") => true,
      o!("qc.recombinants.totalPrivateSubstitutions") => true,
      o!("qc.recombinants.totalReversionSubstitutions") => true,
      o!("qc.recombinants.totalLabeledSubstitutions") => true,
      o!("qc.recombinants.totalUnlabeledSubstitutions") => true,
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
  }
});

pub static CSV_POSSIBLE_CATEGORIES: LazyLock<Vec<String>> = LazyLock::new(|| {
  CsvColumnCategory::VARIANTS
    .iter()
    .copied()
    .map(String::from)
    .collect_vec()
});

pub static CSV_POSSIBLE_COLUMNS: LazyLock<Vec<String>> = LazyLock::new(|| {
  CSV_COLUMN_CONFIG_MAP_DEFAULT
    .iter()
    .flat_map(|(_, columns)| columns.iter())
    .map(|(column, _)| column.clone())
    .collect_vec()
});
