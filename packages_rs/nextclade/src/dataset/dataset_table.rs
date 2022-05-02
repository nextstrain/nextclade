use crate::dataset::dataset::{Dataset, DatasetAttributeValue, DatasetAttributes};
use comfy_table::{ContentArrangement, Table};
use indexmap::IndexSet;
use itertools::Itertools;
use std::collections::BTreeMap;

pub fn format_dataset_table(filtered: &[Dataset]) -> String {
  let mut table = Table::new();
  table.set_content_arrangement(ContentArrangement::Dynamic);

  let (keys, row_entries) = format_dataset_table_impl(filtered);

  for mut row_entry in row_entries.into_iter() {
    let row = keys
      .iter()
      .map(|key| row_entry.remove(key).unwrap_or_default().to_owned());
    table.add_row(row);
  }

  table.set_header(keys);
  table.to_string()
}

pub fn format_dataset_table_impl(filtered: &[Dataset]) -> (IndexSet<String>, Vec<BTreeMap<String, String>>) {
  let mut keys = IndexSet::from([
    "name".to_owned(),
    "friendly name".to_owned(),
    "reference".to_owned(),
    "attributes".to_owned(),
    "tag".to_owned(),
    "comment".to_owned(),
  ]);

  let row_entries = filtered
    .iter()
    .map(|dataset| {
      let Dataset {
        attributes, comment, ..
      } = dataset;

      let DatasetAttributes {
        name,
        name_friendly,
        reference,
        tag,
        rest_attrs,
      } = &attributes;

      let mut entries = BTreeMap::from([
        ("name".to_owned(), format_attr_value(&name)),
        ("friendly name".to_owned(), format_attr_value(&name_friendly)),
        ("reference".to_owned(), format_attr_value(&reference)),
        ("attributes".to_owned(), format_attributes(rest_attrs)),
        ("tag".to_owned(), format_attr_value(&tag)),
        ("comment".to_owned(), comment.clone()),
      ]);

      entries
    })
    .collect_vec();

  (keys, row_entries)
}

pub fn format_attr_value(DatasetAttributeValue { is_default, value }: &DatasetAttributeValue) -> String {
  if *is_default {
    format!("{value} (*)").to_string()
  } else {
    value.clone()
  }
}

pub fn format_attributes(attrs: &BTreeMap<String, DatasetAttributeValue>) -> String {
  attrs
    .iter()
    .map(|(key, attr)| format_attr_key_value(key, attr))
    .join("\n")
}

pub fn format_attr_key_value(key: &str, attr: &DatasetAttributeValue) -> String {
  format!("{}={}", key, format_attr_value(attr))
}
