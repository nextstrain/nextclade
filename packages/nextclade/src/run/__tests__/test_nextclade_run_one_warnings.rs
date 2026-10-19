#[cfg(test)]
mod tests {
  use crate::align::align::tests::helpers::insertion_near_reference_end;
  use crate::alphabet::nuc::{Nuc, from_nuc_seq};
  use crate::io::fasta::FastaRecord;
  use crate::o;
  use crate::run::__tests__::test_nextclade_wasm_initial_data::tests::helpers::{TestDataset, create_nextclade};
  use crate::run::nextclade_wasm::Nextclade;
  use crate::types::outputs::PeptideWarning;
  use eyre::Report;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  #[rstest]
  fn test_nextclade_run_one_warnings_reports_band_boundary_warning_without_genome_annotation() -> Result<(), Report> {
    let (ref_seq, qry_seq) = insertion_near_reference_end();
    let nextclade = create_nextclade(TestDataset {
      reference_seq: from_nuc_seq(&ref_seq),
      pathogen_json: o!(r#"{ "schemaVersion": "3.0.0", "alignmentParams": { "maxBandArea": 200000 } }"#),
      ..TestDataset::default()
    })?;

    let output = helpers::run(&nextclade, &qry_seq)?;

    assert_eq!(
      vec![PeptideWarning {
        cds_name: o!("nuc"),
        warning: o!(
          "When processing sequence #0 'qry': In nucleotide alignment: the alignment touches the band boundary on attempt 1, and a wider band cannot be used: the band area of the next attempt (356,751) exceeds the limit (200,000). The alignment of attempt 1 is kept and can be inaccurate near the band boundary"
        ),
      }],
      output.analysis_result.warnings
    );
    Ok(())
  }

  mod helpers {
    use super::*;
    use crate::run::nextclade_wasm::AnalysisOutput;

    /// Analyze one query sequence named `qry`
    pub fn run(nextclade: &Nextclade, qry_seq: &[Nuc]) -> Result<AnalysisOutput, Report> {
      nextclade.run(&FastaRecord {
        seq_name: o!("qry"),
        seq: from_nuc_seq(qry_seq),
        index: 0,
      })
    }
  }
}
