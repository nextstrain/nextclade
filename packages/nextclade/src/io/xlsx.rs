use crate::io::nextclade_csv::prepare_headers;
use crate::io::nextclade_csv_column_config::CsvColumnConfig;
use crate::io::nextclade_csv_row::NextcladeResultsCsvRow;
use crate::run::nextclade_wasm::AnalysisInitialData;
use crate::types::outputs::{
  NextcladeErrorOutputs, NextcladeOutputOrError, NextcladeOutputs, combine_outputs_and_errors_sorted,
};
use crate::utils::string::truncate_left;
use eyre::Report;
use rust_xlsxwriter::{Workbook, Worksheet};

pub const EXCEL_SHEET_NAME_LEN_MAX: usize = 31;

pub const DEFAULT_NEXTCLADE_XLSX_SHEET_NAME: &str = "nextclade";

pub fn results_to_excel_sheet(
  outputs: &[NextcladeOutputs],
  errors: &[NextcladeErrorOutputs],
  initial_data: &AnalysisInitialData,
  column_config: &CsvColumnConfig,
) -> Result<Worksheet, Report> {
  let headers: Vec<String> = prepare_headers(
    &initial_data.clade_node_attr_key_descs,
    &initial_data.phenotype_attr_keys,
    &initial_data.ref_nodes,
    &initial_data.aa_motif_keys,
    column_config,
  );

  let mut sheet = Worksheet::new();

  // Write headers
  for (icol, value) in headers.iter().enumerate() {
    sheet.write_string(0, icol as u16, value)?;
  }

  let mut row = NextcladeResultsCsvRow::new(headers)?;
  let outputs_or_errors = combine_outputs_and_errors_sorted(outputs, errors);
  for (irow, (_, output_or_error)) in outputs_or_errors.iter().enumerate() {
    let formatted_row = match output_or_error {
      NextcladeOutputOrError::Outputs(output) => row.format(output)?,
      NextcladeOutputOrError::Error(error) => {
        row.write_nuc_error(error.index, &error.seq_name, &error.errors.join(";"))?
      }
    };
    for (icol, value) in formatted_row.values().enumerate() {
      sheet.write_string((irow + 1) as u32, icol as u16, value)?;
    }
    row.clear();
  }

  Ok(sheet)
}

pub fn book_save_to_buffer(book: &mut Workbook) -> Result<Vec<u8>, Report> {
  let buf = book.save_to_buffer()?;
  Ok(buf)
}

pub fn sanitize_sheet_name(name: &str) -> String {
  const DISALLOWED_CHARS: &[char] = &[':', '\\', '/', '?', '*', '[', ']'];

  let mut sanitized: String = name
    .chars()
    .map(|c| if DISALLOWED_CHARS.contains(&c) { '_' } else { c })
    .collect();

  sanitized = sanitized.trim().to_owned();

  if sanitized.starts_with('\'') {
    sanitized.remove(0);
  }

  if sanitized.is_empty() {
    sanitized = "Sheet1".to_owned();
  }

  if sanitized.eq_ignore_ascii_case("History") {
    sanitized.push('_');
  }

  sanitized = truncate_left(&sanitized, EXCEL_SHEET_NAME_LEN_MAX, "...");

  sanitized
}
