use owo_colors::Style;

pub fn eyre_init(colors: bool) {
  let mut builder = color_eyre::config::HookBuilder::default()
    .theme(
      color_eyre::config::Theme::dark()
        .dependency_code(Style::new().dimmed())
        .file(Style::new().green())
        .line_number(Style::new().yellow())
        .panic_file(Style::new().green())
        .panic_line_number(Style::new().yellow())
        .panic_message(Style::new().bright_red().bold())
        .active_line(Style::new().cyan())
        .hidden_frames(Style::new().dimmed())
        .code_hash(Style::new().hidden()),
    )
    .panic_section(format!(
      "If you think it's a bug, consider reporting at: '{}/issues'",
      env!("CARGO_PKG_REPOSITORY"),
    ))
    .add_frame_filter(Box::new(|frames| {
      frames.retain(|frame| {
        let should_show_name = frame.name.as_ref().is_some_and(|name| {
          !HIDDEN_CRATE_NAME_PREFIXES
            .iter()
            .any(|&prefix| name.starts_with(prefix) || name.starts_with(&format!("<{prefix}")))
        });

        let should_show_file = !frame.filename.as_ref().is_some_and(|filename| {
          HIDDEN_CRATE_PATH_PREFIXES
            .iter()
            .any(|&prefix| filename.starts_with(prefix))
        });

        should_show_file && should_show_name
      });
    }));

  if !colors {
    builder = builder.theme(color_eyre::config::Theme::new());
  }

  builder.install().expect("Failed to install color_eyre");
}

const HIDDEN_CRATE_NAME_PREFIXES: &[&str] = &[
  "__",
  "_start",
  "alloc::",
  "clone",
  "color_eyre::",
  "core::",
  "crossbeam::",
  "eyre::",
  "main",
  "rayon::",
  "rayon_core::",
  "rustc::",
  "start_thread",
  "std::",
  "tokio::",
];

const HIDDEN_CRATE_PATH_PREFIXES: &[&str] = &["/rustc/"];
