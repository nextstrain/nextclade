use comfy_table::modifiers::{UTF8_ROUND_CORNERS, UTF8_SOLID_INNER_BORDERS};
use comfy_table::presets::UTF8_FULL;
use comfy_table::{ContentArrangement, Table};
use indexmap::IndexMap;
use itertools::Itertools;
use nextclade::io::dataset::{Dataset, DatasetAttributeValue, DatasetAttributes};

pub fn format_dataset_table(filtered: &[Dataset]) -> String {
  let mut table = Table::new();
  table
    .load_preset(UTF8_FULL)
    .apply_modifier(UTF8_ROUND_CORNERS)
    .apply_modifier(UTF8_SOLID_INNER_BORDERS)
    .set_content_arrangement(ContentArrangement::Dynamic);

  table.set_header([
    "name".to_owned(),
    "reference".to_owned(),
    "tag".to_owned(),
    "attributes".to_owned(),
    "comment".to_owned(),
  ]);

  for dataset in filtered.iter() {
    let Dataset {
      attributes, comment, ..
    } = dataset;

    let DatasetAttributes {
      name,
      reference,
      tag,
      rest_attrs,
    } = &attributes;

    let mut attrs = IndexMap::<String, &DatasetAttributeValue>::from([
      ("name".to_owned(), name),
      ("reference".to_owned(), reference),
      ("tag".to_owned(), tag),
    ]);

    for (key, attr) in rest_attrs.iter() {
      attrs.insert(key.clone(), attr);
    }

    table.add_row([
      format_attr_value(name),
      format_attr_value(reference),
      format_attr_value(tag),
      format_attributes(&attrs),
      comment.clone(),
    ]);
  }

  format!("{table}\nAsterisk (*) marks default values")
}

pub fn format_attr_value_short(attr: &DatasetAttributeValue) -> String {
  let DatasetAttributeValue { is_default, value, .. } = &attr;
  if *is_default {
    format!("{value} (*)")
  } else {
    value.clone()
  }
}

pub fn format_attr_value(attr: &DatasetAttributeValue) -> String {
  let value_str = format_attr_value_short(attr);
  if let Some(value_friendly) = &attr.value_friendly {
    format!("{value_str}\n'{value_friendly}'")
  } else {
    value_str
  }
}

pub fn format_attributes(attrs: &IndexMap<String, &DatasetAttributeValue>) -> String {
  attrs
    .iter()
    .map(|(key, attr)| format_attr_key_value(key, attr))
    .join("\n")
}

pub fn format_attr_key_value(key: &str, attr: &DatasetAttributeValue) -> String {
  format!("{key}={}", format_attr_value_short(attr))
}
