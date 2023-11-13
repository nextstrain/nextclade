use comfy_table::modifiers::{UTF8_ROUND_CORNERS, UTF8_SOLID_INNER_BORDERS};
use comfy_table::presets::UTF8_FULL;
use comfy_table::{ContentArrangement, Table};
use itertools::Itertools;
use nextclade::io::dataset::Dataset;
use nextclade::o;
use nextclade::utils::string::surround_with_quotes;

pub fn format_dataset_table(filtered: &[Dataset]) -> String {
  let mut table = Table::new();
  table
    .load_preset(UTF8_FULL)
    .apply_modifier(UTF8_ROUND_CORNERS)
    .apply_modifier(UTF8_SOLID_INNER_BORDERS)
    .set_content_arrangement(ContentArrangement::Dynamic);

  table.set_header([o!("name"), o!("attributes"), o!("versions"), o!("authors")]);

  for dataset in filtered.iter() {
    let Dataset { attributes, .. } = dataset;

    let attrs = attributes
      .iter()
      .map(|(key, val)| {
        format!(
          "{}={}",
          surround_with_quotes(key),
          surround_with_quotes(val.to_string())
        )
      })
      .join("\n");

    let versions = dataset.versions.iter().map(|ver| &ver.tag).join("\n");

    let authors = dataset.meta.authors.join(", ");

    table.add_row([&dataset.path, &attrs, &versions, &authors]);
  }

  table.to_string()
}
