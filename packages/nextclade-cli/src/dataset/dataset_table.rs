use comfy_table::modifiers::{UTF8_ROUND_CORNERS, UTF8_SOLID_INNER_BORDERS};
use comfy_table::presets::UTF8_FULL;
use comfy_table::{ContentArrangement, Table};
use itertools::Itertools;
use nextclade::io::dataset::Dataset;
use nextclade::o;
use nextclade::utils::string::surround_with_quotes;
use std::borrow::Cow;

pub fn format_dataset_table(filtered: &[Dataset]) -> String {
  let mut table = Table::new();
  table
    .load_preset(UTF8_FULL)
    .apply_modifier(UTF8_ROUND_CORNERS)
    .apply_modifier(UTF8_SOLID_INNER_BORDERS)
    .set_content_arrangement(ContentArrangement::Dynamic);

  table.set_header([o!("name"), o!("attributes"), o!("versions")]);

  for dataset in filtered {
    let Dataset {
      path,
      shortcuts,
      attributes,
      ..
    } = dataset;

    let name = if !shortcuts.is_empty() {
      let shortcuts = shortcuts.iter().map(surround_with_quotes).join(", ");
      Cow::Owned(format!("{path}\n(shortcuts: {shortcuts})"))
    } else {
      Cow::Borrowed(path)
    };

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

    table.add_row([&name, &attrs, &versions]);
  }

  table.to_string()
}
