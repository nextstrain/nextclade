use crate::io::csv::{CsvVecFileWriter, CsvVecWriter, VecWriter};
use crate::io::nextclade_csv_column_config::{CSV_POSSIBLE_COLUMNS, CsvColumnConfig};
use crate::io::nextclade_csv_row::NextcladeResultsCsvRow;
use crate::o;
use crate::tree::tree::{AuspiceRefNodeSearchDesc, AuspiceRefNodesDesc, CladeNodeAttrKeyDesc};
use crate::types::outputs::{
  NextcladeErrorOutputs, NextcladeOutputOrError, NextcladeOutputs, combine_outputs_and_errors_sorted,
};
use eyre::Report;
use itertools::{Itertools, chain};
use std::path::Path;

pub fn prepare_headers(
  custom_node_attr_descs: &[CladeNodeAttrKeyDesc],
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

  headers = sort_headers_by_canonical_order(headers);

  if column_config.include_dynamic {
    // Insert dynamic columns after this column index
    let mut insert_custom_cols_at_index = headers
      .iter()
      .position(|header| header == "clade")
      .unwrap_or_else(|| headers.len().saturating_sub(1))
      .clamp(0, headers.len());

    custom_node_attr_descs.iter().rev().for_each(|desc| {
      insert_after(&mut headers, insert_custom_cols_at_index, desc.name.clone());
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

    // For each ref node, insert a set of columns
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

    let builtin_attrs = [o!("clade")];
    let attrs = chain!(
      builtin_attrs.iter(),
      custom_node_attr_descs
        .iter()
        .filter(|desc| !desc.skip_as_reference)
        .map(|desc| &desc.name)
    )
    .collect_vec();

    // For each attribute insert a set of columns
    for attr in &attrs {
      for col in &clade_founder_cols(attr) {
        insert_after(&mut headers, insert_custom_cols_at_index, col.to_owned());
        insert_custom_cols_at_index += 1;
      }
    }
  }

  headers
}

fn sort_headers_by_canonical_order(headers: Vec<String>) -> Vec<String> {
  headers
    .into_iter()
    .sorted_by_key(|header| {
      CSV_POSSIBLE_COLUMNS
        .iter()
        .position(|col| col == header)
        .unwrap_or(usize::MAX)
    })
    .collect()
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
  if index >= v.len() {
    v.push(val);
  } else {
    v.insert(index + 1, val);
  }
}

/// Writes content of nextclade.csv and nextclade.tsv files (but not necessarily files themselves - writer is generic)
pub struct NextcladeResultsCsvWriter<W: VecWriter> {
  writer: W,
  row: NextcladeResultsCsvRow,
}

impl<W: VecWriter> NextcladeResultsCsvWriter<W> {
  pub fn new(writer: W, headers: &[String]) -> Result<Self, Report> {
    let row = NextcladeResultsCsvRow::new(headers)?;
    Ok(Self { writer, row })
  }

  /// Writes one row into the nextclade.csv or .tsv file
  pub fn write(&mut self, nextclade_outputs: &NextcladeOutputs) -> Result<(), Report> {
    self.row.format(nextclade_outputs)?;
    self.write_row()?;
    Ok(())
  }

  /// Writes one row for the case of error
  pub fn write_nuc_error(&mut self, index: usize, seq_name: &str, errors: &str) -> Result<(), Report> {
    self.row.write_nuc_error(index, seq_name, errors)?;
    self.write_row()?;
    Ok(())
  }

  /// Writes the current row and clears it
  fn write_row(&mut self) -> Result<(), Report> {
    self.writer.write(self.row.inner())?;
    self.row.clear();
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
    clade_node_attr_descs: &[CladeNodeAttrKeyDesc],
    phenotype_attr_keys: &[String],
    ref_nodes: &AuspiceRefNodesDesc,
    aa_motifs_keys: &[String],
    column_config: &CsvColumnConfig,
  ) -> Result<Self, Report> {
    let headers: Vec<String> = prepare_headers(
      clade_node_attr_descs,
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

  /// Writes one row into the nextclade.csv or.tsv file for the case of error
  pub fn write_nuc_error(&mut self, index: usize, seq_name: &str, errors: &str) -> Result<(), Report> {
    self.writer.write_nuc_error(index, seq_name, errors)
  }
}

pub fn results_to_csv_string(
  outputs: &[NextcladeOutputs],
  errors: &[NextcladeErrorOutputs],
  clade_node_attr_descs: &[CladeNodeAttrKeyDesc],
  phenotype_attr_keys: &[String],
  ref_nodes: &AuspiceRefNodesDesc,
  aa_motifs_keys: &[String],
  delimiter: u8,
  column_config: &CsvColumnConfig,
) -> Result<String, Report> {
  let mut buf = Vec::<u8>::new();

  {
    let headers: Vec<String> = prepare_headers(
      clade_node_attr_descs,
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
      }
    }
  }

  Ok(String::from_utf8(buf)?)
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::io::nextclade_csv_column_config::CsvColumnCategory;
  use indexmap::indexmap;

  #[test]
  fn test_prepare_headers_canonical_order() {
    // Create test configuration with headers in non-canonical order
    let column_config = CsvColumnConfig {
      categories: indexmap! {
        CsvColumnCategory::General => indexmap! {
          o!("totalSubstitutions") => true,
          o!("seqName") => true,
          o!("index") => true,
          o!("clade") => true,
        },
        CsvColumnCategory::Qc => indexmap! {
          o!("missing") => true,
          o!("qc.overallScore") => true,
        },
      },
      individual: vec![],
      include_dynamic: false,
      include_rel_muts: false,
      include_clade_founder_muts: false,
    };

    let headers = prepare_headers(&[], &[], &AuspiceRefNodesDesc::default(), &[], &column_config);

    // Verify headers are in canonical order as defined in CSV_COLUMN_CONFIG_MAP_DEFAULT
    let expected_order = vec![
      "index",
      "seqName",
      "clade",
      "qc.overallScore",
      "totalSubstitutions",
      "missing",
    ];

    assert_eq!(headers, expected_order);
  }

  #[test]
  fn test_sort_headers_by_canonical_order() {
    let headers = vec![
      "totalSubstitutions".to_owned(),
      "seqName".to_owned(),
      "index".to_owned(),
      "clade".to_owned(),
      "missing".to_owned(),
      "qc.overallScore".to_owned(),
    ];

    let sorted = sort_headers_by_canonical_order(headers);

    let expected_order = vec![
      "index",
      "seqName",
      "clade",
      "qc.overallScore",
      "totalSubstitutions",
      "missing",
    ];

    assert_eq!(sorted, expected_order);
  }
}
