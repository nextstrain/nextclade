#[cfg(test)]
mod tests {
  use crate::align::align::tests::helpers::random_nuc_seq;
  use crate::alphabet::nuc::{Nuc, from_nuc_seq};
  use crate::io::fasta::FastaRecord;
  use crate::o;
  use crate::run::__tests__::test_nextclade_wasm_initial_data::tests::helpers::{TestDataset, create_nextclade};
  use eyre::Report;
  use pretty_assertions::assert_eq;

  const PATHOGEN_JSON: &str = r#"{
    "schemaVersion": "3.0.0",
    "qc": {
      "missingData": {
        "enabled": true,
        "missingDataThreshold": 100,
        "scoreBias": 10,
        "lengthScaling": { "minLength": 1 }
      },
      "mixedSites": { "enabled": true, "mixedSitesThreshold": 10, "lengthScaling": { "minLength": 1 } },
      "privateMutations": { "enabled": true, "typical": 5, "cutoff": 15, "lengthScaling": { "minLength": 1 } }
    }
  }"#;

  #[test]
  fn test_nextclade_run_one_qc_lengths() -> Result<(), Report> {
    let ref_seq = random_nuc_seq(3000, 1);
    let mut qry_seq = ref_seq[1000..2000].to_vec();
    qry_seq[200..250].fill(Nuc::N);
    qry_seq[500] = Nuc::R;
    qry_seq.drain(700..730);
    let nextclade = create_nextclade(TestDataset {
      reference_seq: from_nuc_seq(&ref_seq),
      pathogen_json: o!(PATHOGEN_JSON),
      ..TestDataset::default()
    })?;

    let qc = nextclade
      .run(&FastaRecord {
        seq_name: o!("qry"),
        seq: from_nuc_seq(&qry_seq),
        index: 0,
      })?
      .analysis_result
      .qc;

    let actual = (
      qc.missing_data.and_then(|result| result.length_scaling).map(|scaling| scaling.length),
      qc.mixed_sites.and_then(|result| result.length_scaling).map(|scaling| scaling.length),
      qc.private_mutations.and_then(|result| result.length_scaling).map(|scaling| scaling.length),
    );
    assert_eq!((Some(1000), Some(950), Some(949)), actual);
    Ok(())
  }
}
