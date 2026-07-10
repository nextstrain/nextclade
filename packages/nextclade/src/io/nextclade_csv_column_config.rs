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
  Recombination,
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

// Configuration for enabling/disabling CSV columns or categories of them.
// The `include_*` fields are independent per-category toggles, so a flat set of bools is the natural
// representation rather than a state machine.
#[allow(clippy::struct_excessive_bools)]
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
// Fill missing fields from `Default` (the single source of truth) so an older serialized config
// lacking a newer toggle (e.g. `includeRecombination`) still deserializes with its established value.
#[serde(default)]
pub struct CsvColumnConfig {
  pub categories: CsvColumnConfigMap,
  pub individual: Vec<String>,
  pub include_dynamic: bool,
  pub include_clade_founder_muts: bool,
  pub include_rel_muts: bool,
  pub include_recombination: bool,
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

      let include_recombination = categories.contains(&CsvColumnCategory::Recombination);

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
        include_recombination,
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
      include_recombination: true,
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
    CsvColumnCategory::Recombination => indexmap! {
      o!("recombination.regions") => true,
      o!("recombination.regionConfidences") => true,
      o!("recombination.totalRegions") => true,
      o!("recombination.totalLength") => true,
      o!("recombination.longestRegion.range") => true,
      o!("recombination.longestRegion.length") => true,
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

#[cfg(test)]
mod tests {
  use super::*;
  use crate::o;
  use indexmap::indexmap;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  // An empty selection and the explicit `all` category both resolve to the default configuration, which
  // enables every column category, recombination included.
  #[rstest]
  #[case::empty(vec![])]
  #[case::all(vec![o!("all")])]
  fn test_nextclade_csv_column_config_new_is_default(#[case] selection: Vec<String>) {
    assert_eq!(CsvColumnConfig::default(), CsvColumnConfig::new(&selection).unwrap());
  }

  // The default configuration enables the recombination columns.
  #[test]
  fn test_nextclade_csv_column_config_default_enables_recombination() {
    assert!(CsvColumnConfig::default().include_recombination);
  }

  // Selecting the `recombination` category (kebab-case per the enum's strum serialization) sets its
  // include flag and puts the category into the resolved column map.
  #[test]
  fn test_nextclade_csv_column_config_new_recombination_category_selected() {
    let config = CsvColumnConfig::new(&[o!("recombination")]).unwrap();
    assert!(config.include_recombination);
    assert!(config.categories.contains_key(&CsvColumnCategory::Recombination));
  }

  // Recombination is an independent per-category toggle: selecting an unrelated category leaves it off.
  #[test]
  fn test_nextclade_csv_column_config_new_other_category_excludes_recombination() {
    let config = CsvColumnConfig::new(&[o!("general")]).unwrap();
    assert!(!config.include_recombination);
    assert!(!config.categories.contains_key(&CsvColumnCategory::Recombination));
  }

  // Oracle: kb/decisions/recombination-detection.md "CSV/TSV columns" enumerates exactly these six
  // columns for the Recombination category, all enabled by default.
  #[test]
  fn test_nextclade_csv_column_config_default_map_recombination_columns() {
    let expected = indexmap! {
      o!("recombination.regions") => true,
      o!("recombination.regionConfidences") => true,
      o!("recombination.totalRegions") => true,
      o!("recombination.totalLength") => true,
      o!("recombination.longestRegion.range") => true,
      o!("recombination.longestRegion.length") => true,
    };
    assert_eq!(
      Some(&expected),
      CSV_COLUMN_CONFIG_MAP_DEFAULT.get(&CsvColumnCategory::Recombination)
    );
  }
}
