#[cfg(test)]
mod tests {
  #[cfg(target_os = "linux")]
  use crate::io::csv::CsvStructFileWriter;
  #[cfg(target_os = "linux")]
  use crate::utils::error::report_to_string;
  #[cfg(target_os = "linux")]
  use pretty_assertions::assert_eq;

  #[cfg(target_os = "linux")]
  #[test]
  fn test_csv_row_write_error_names_the_file_and_the_cause() {
    let mut writer = CsvStructFileWriter::new("/dev/full", b'\t').unwrap();

    // Enough rows to fill the buffers, so that a row write fails before `finish`
    let result = (0..100_000).try_for_each(|index| writer.write(&("sequence name", index)));

    assert_eq!(
      Some("When writing to file /dev/full: No space left on device (os error 28)".to_owned()),
      result.err().map(|report| report_to_string(&report))
    );
  }
}
