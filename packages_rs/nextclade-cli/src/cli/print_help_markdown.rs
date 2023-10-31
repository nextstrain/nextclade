use crate::cli::nextclade_cli::NextcladeArgs;
use eyre::{Report, WrapErr};
use regex::Regex;
use std::borrow::Cow;

pub fn print_help_markdown() -> Result<(), Report> {
  let help = clap_markdown::help_markdown::<NextcladeArgs>();

  let help = replace(&help, "# Command-Line Help for `nextclade`", "# Reference")?;

  let help = replace(
    &help,
    "This document contains the help content for the `nextclade` command-line program.",
    r#"
This document contains the automatically generated reference documentation for command-line arguments of the latest version of Nextclade CLI.

If you have Nextclade CLI installed, you can type `nextclade --help` to read the latest documentation for your installed version of Nextclade.
  "#,
  )?;

  let help = replace(&help, "Nextclade is a part of Nextstrain: https://nextstrain.org\n\nDocumentation: https://docs.nextstrain.org/projects/nextclade\nNextclade Web: https://clades.nextstrain.org\nPublication:   https://doi.org/10.21105/joss.03773", "Nextclade is a part of Nextstrain: [https://nextstrain.org](https://nextstrain.org)\n\nDocumentation: [https://docs.nextstrain.org/projects/nextclade](https://docs.nextstrain.org/projects/nextclade)\n\nNextclade Web: [https://clades.nextstrain.org](https://clades.nextstrain.org)\n\nPublication: [https://doi.org/10.21105/joss.03773](https://doi.org/10.21105/joss.03773)")?;

  let help = replace(&help, "(.*)— REMOVED(.*)", "")?;
  let help = replace(&help, "(.*)— RENAMED(.*)", "")?;

  let help = replace(
    &help,
    r#"(?<orig>\* `--server <SERVER>` — Use custom dataset server)\n\n  Default value: .*"#,
    "$orig",
  )?;

  let help = replace(
    &help,
    r#"(?<orig>\* `-j`, `--jobs <JOBS>` — Number of processing jobs. If not specified, all available CPU threads will be used)\n\n  Default value: .*"#,
    "$orig",
  )?;

  let help = replace(&help, "", "")?;

  println!("{help}");
  Ok(())
}

fn replace<'t>(text: &'t str, what: &str, with_what: &str) -> Result<Cow<'t, str>, Report> {
  let res = Regex::new(what)
    .wrap_err_with(|| format!("When compiling regex: {what}"))?
    .replace_all(text, with_what);
  Ok(res)
}
