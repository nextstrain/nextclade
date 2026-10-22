#[cfg(test)]
mod tests {
  #[cfg(target_os = "linux")]
  use crate::io::fasta::FastaPeptideWriter;
  #[cfg(target_os = "linux")]
  use crate::utils::error::report_to_string;
  #[cfg(target_os = "linux")]
  use helpers::{gene_map, translation};
  #[cfg(target_os = "linux")]
  use indoc::indoc;
  #[cfg(target_os = "linux")]
  use pretty_assertions::assert_eq;

  #[cfg(target_os = "linux")]
  #[test]
  fn test_fasta_peptide_writer_finish_reports_errors_of_all_files() {
    let mut writer = FastaPeptideWriter::new(&gene_map(&["A", "B"]), "/dev/full").unwrap();
    writer.write("seq", &translation("A")).unwrap();
    writer.write("seq", &translation("B")).unwrap();

    let result = writer.finish();

    assert_eq!(
      Some(
        indoc! {"
        2 errors occurred:
          - When writing to file /dev/full: No space left on device (os error 28)
          - When writing to file /dev/full: No space left on device (os error 28)"}
        .to_owned()
      ),
      result.err().map(|report| report_to_string(&report))
    );
  }

  #[cfg(target_os = "linux")]
  mod helpers {
    use crate::alphabet::aa::to_aa_seq;
    use crate::gene::gene_map::GeneMap;
    use crate::translate::translate_genes::CdsTranslation;
    use std::fmt::Write;

    /// Genome annotation with one gene of 9 nucleotides and one CDS for each name
    pub fn gene_map(cds_names: &[&str]) -> GeneMap {
      let gff = cds_names
        .iter()
        .enumerate()
        .fold(String::from("##gff-version 3\n"), |mut gff, (index, name)| {
          let (start, end) = (index * 9 + 1, index * 9 + 9);
          writeln!(gff, "ref\t.\tgene\t{start}\t{end}\t.\t+\t.\tName={name};ID={index}").unwrap();
          writeln!(gff, "ref\t.\tCDS\t{start}\t{end}\t.\t+\t.\tName={name};Parent={index}").unwrap();
          gff
        });
      GeneMap::from_str(gff).unwrap()
    }

    pub fn translation(cds_name: &str) -> CdsTranslation {
      CdsTranslation {
        name: cds_name.to_owned(),
        seq: to_aa_seq("MK*").unwrap(),
        insertions: vec![],
        frame_shifts: vec![],
        alignment_ranges: vec![],
        unsequenced_ranges: vec![],
      }
    }
  }
}
