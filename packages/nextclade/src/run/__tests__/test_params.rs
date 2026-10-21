#[cfg(test)]
mod tests {
  use crate::align::params::{AlignPairwiseParams, AlignPairwiseParamsOptional, AlignmentPreset};
  use crate::analyze::virus_properties::VirusProperties;
  use crate::run::params::{NextcladeInputParams, NextcladeInputParamsOptional};
  use clap::Parser;
  use eyre::Report;
  use pretty_assertions::assert_eq;
  use rstest::rstest;
  use std::iter::once;

  // Expected values: the preset is taken from the CLI, then from `pathogen.json`, then the built-in default. A field
  // set in any source overrides any preset, and a CLI field overrides a `pathogen.json` field. `penaltyGapOpen` is 6
  // in the `default` and `short-sequences` presets and 10 in the `high-diversity` preset (`AlignPairwiseParams::from_preset`).
  #[rustfmt::skip]
  #[rstest]
  #[case::no_preset_no_fields(            &[],                                                                 r#"{}"#,                                                         (AlignmentPreset::Default,        6 ))]
  #[case::dataset_preset(                 &[],                                                                 r#"{ "alignmentPreset": "high-diversity" }"#,                    (AlignmentPreset::HighDiversity,  10))]
  #[case::cli_preset(                     &["--alignment-preset", "high-diversity"],                           r#"{}"#,                                                         (AlignmentPreset::HighDiversity,  10))]
  #[case::cli_preset_over_dataset_preset( &["--alignment-preset", "short-sequences"],                          r#"{ "alignmentPreset": "high-diversity" }"#,                    (AlignmentPreset::ShortSequences, 6 ))]
  #[case::cli_default_over_dataset_preset(&["--alignment-preset", "default"],                                  r#"{ "alignmentPreset": "high-diversity" }"#,                    (AlignmentPreset::Default,        6 ))]
  #[case::dataset_field_over_dataset_preset(&[],                                                               r#"{ "alignmentPreset": "high-diversity", "penaltyGapOpen": 8 }"#, (AlignmentPreset::HighDiversity,  8 ))]
  #[case::dataset_field_over_cli_preset(  &["--alignment-preset", "high-diversity"],                           r#"{ "penaltyGapOpen": 8 }"#,                                    (AlignmentPreset::HighDiversity,  8 ))]
  #[case::cli_field_over_cli_preset(      &["--alignment-preset", "high-diversity", "--penalty-gap-open", "12"], r#"{}"#,                                                         (AlignmentPreset::HighDiversity,  12))]
  #[case::cli_field_over_dataset_field(   &["--penalty-gap-open", "12"],                                       r#"{ "alignmentPreset": "high-diversity", "penaltyGapOpen": 8 }"#, (AlignmentPreset::HighDiversity,  12))]
  #[trace]
  fn test_params_alignment_preset_and_fields_resolve_by_source(
    #[case] cli_args: &[&str],
    #[case] alignment_params_json: &str,
    #[case] (expected_preset, expected_penalty_gap_open): (AlignmentPreset, i32),
  ) -> Result<(), Report> {
    let virus_properties = VirusProperties::from_str(&format!(
      r#"{{ "schemaVersion": "3.0.0", "alignmentParams": {alignment_params_json} }}"#
    ))?;
    let input_params = NextcladeInputParamsOptional {
      alignment: Some(AlignPairwiseParamsOptional::try_parse_from(
        once("nextclade").chain(cli_args.iter().copied()),
      )?),
      ..NextcladeInputParamsOptional::default()
    };

    let actual = NextcladeInputParams::from_optional(&input_params, &virus_properties)?.alignment;

    let expected = AlignPairwiseParams {
      penalty_gap_open: expected_penalty_gap_open,
      ..AlignPairwiseParams::from_preset(expected_preset)?
    };
    assert_eq!(expected, actual);
    Ok(())
  }
}
