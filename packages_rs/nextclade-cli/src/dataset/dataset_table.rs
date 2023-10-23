use comfy_table::modifiers::{UTF8_ROUND_CORNERS, UTF8_SOLID_INNER_BORDERS};
use comfy_table::presets::UTF8_FULL;
use comfy_table::{ContentArrangement, Table};
use itertools::Itertools;
use nextclade::io::dataset::Dataset;
use nextclade::o;

pub fn format_dataset_table(filtered: &[Dataset]) -> String {
  let mut table = Table::new();
  table
    .load_preset(UTF8_FULL)
    .apply_modifier(UTF8_ROUND_CORNERS)
    .apply_modifier(UTF8_SOLID_INNER_BORDERS)
    .set_content_arrangement(ContentArrangement::Dynamic);

  table.set_header([o!("name"), o!("attributes"), o!("versions")]);

  for dataset in filtered.iter() {
    let Dataset {
      attributes,
      official,
      deprecated,
      experimental,
      ..
    } = dataset;

    let attrs = [
      ("name".to_owned(), &attributes.name.value),
      (
        "nameFriendly".to_owned(),
        &attributes.name.value_friendly.clone().unwrap_or_default(),
      ),
      ("referenceAccession".to_owned(), &attributes.reference.value),
      ("referenceFriendly".to_owned(), &attributes.name.value),
    ]
    .into_iter()
    .map(|(key, val)| format!("{key}={val}"))
    .chain(
      [
        add_bool_attr("official", *official),
        add_bool_attr("deprecated", *deprecated),
        add_bool_attr("experimental", *experimental),
      ]
      .into_iter(),
    )
    .filter(|s| !s.is_empty())
    .join("\n");

    let versions = dataset.versions.iter().map(|ver| &ver.tag).join("\n");

    table.add_row([&dataset.path, &attrs, &versions]);
  }

  format!("{table}\nAsterisk (*) marks default values")
}

fn add_bool_attr(name: impl AsRef<str>, attr: Option<bool>) -> String {
  if let Some(attr) = attr {
    if attr {
      return format!("{}=true", name.as_ref());
    }
  }
  "".to_owned()
}
