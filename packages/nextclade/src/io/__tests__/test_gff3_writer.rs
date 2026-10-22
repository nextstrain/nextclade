#[cfg(test)]
mod tests {
  #[cfg(target_os = "linux")]
  use crate::io::gff3_writer::Gff3FileWriter;
  #[cfg(target_os = "linux")]
  use crate::utils::error::report_to_string;
  #[cfg(target_os = "linux")]
  use bio::io::gff::Record as BioGffRecord;
  #[cfg(target_os = "linux")]
  use pretty_assertions::assert_eq;

  #[cfg(target_os = "linux")]
  #[test]
  fn test_gff3_writer_record_write_error_is_reported() {
    let mut writer = Gff3FileWriter::new("/dev/full").unwrap();
    let record = BioGffRecord::new();

    // Enough records to fill the buffers, so that a record write fails before `finish`
    let result = (0..100_000).try_for_each(|_| writer.write_record(&record));

    assert_eq!(
      Some(
        "When writing GFF3 record: When writing to file /dev/full: No space left on device (os error 28)".to_owned()
      ),
      result.err().map(|report| report_to_string(&report))
    );
  }
}
