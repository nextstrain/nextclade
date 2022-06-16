use crate::cli::common::get_fasta_basename;
use clap::{AppSettings, ArgEnum, CommandFactory, Parser, Subcommand, ValueHint};
use clap_complete::{generate, Generator, Shell};
use clap_complete_fig::Fig;
use clap_verbosity_flag::{Verbosity, WarnLevel};
use eyre::{eyre, ContextCompat, Report, WrapErr};
use itertools::Itertools;
use lazy_static::lazy_static;
use log::LevelFilter;
use nextclade::align::params::AlignPairwiseParamsOptional;
use nextclade::make_error;
use nextclade::utils::global_init::setup_logger;
use std::fmt::Debug;
use std::io;
use std::path::PathBuf;
use strum::IntoEnumIterator;
use strum_macros::EnumIter;

lazy_static! {
  static ref SHELLS: &'static [&'static str] = &["bash", "elvish", "fish", "fig", "powershell", "zsh"];
  static ref VERBOSITIES: &'static [&'static str] = &["off", "error", "warn", "info", "debug", "trace"];
}

#[derive(Parser, Debug)]
#[clap(name = "nextalign", trailing_var_arg = true)]
#[clap(author, version)]
#[clap(global_setting(AppSettings::DeriveDisplayOrder))]
#[clap(verbatim_doc_comment)]
/// Viral sequence alignment and translation.
///
/// Nextalign is a part of Nextstrain: https://nextstrain.org
///
/// Documentation: https://docs.nextstrain.org/projects/nextclade
/// Nextclade Web: https://clades.nextstrain.org
/// Publication:   https://doi.org/10.21105/joss.03773
pub struct NextalignArgs {
  #[clap(subcommand)]
  pub command: NextalignCommands,

  /// Set verbosity level [default: warn]
  #[clap(long, global = true, conflicts_with = "verbose", conflicts_with = "silent", possible_values(VERBOSITIES.iter()))]
  pub verbosity: Option<LevelFilter>,

  /// Disable all console output. Same as --verbosity=off
  #[clap(long, global = true, conflicts_with = "verbose", conflicts_with = "verbosity")]
  pub silent: bool,

  /// Make output more quiet or more verbose
  #[clap(flatten)]
  pub verbose: Verbosity<WarnLevel>,
}

#[derive(Subcommand, Debug)]
#[clap(verbatim_doc_comment)]
pub enum NextalignCommands {
  /// Generate shell completions.
  ///
  /// This will print the completions file contents to the console. Refer to your shell's documentation on how to install the completions.
  ///
  /// Example for Ubuntu Linux:
  ///
  ///    nextalign completions bash > ~/.local/share/bash-completion/nextalign
  ///
  Completions {
    /// Name of the shell to generate appropriate completions
    #[clap(value_name = "SHELL", default_value_t = String::from("bash"), possible_values(SHELLS.iter()))]
    shell: String,
  },

  /// Run alignment and translation.
  Run(Box<NextalignRunArgs>),
}

#[derive(Copy, Debug, Clone, PartialEq, Eq, PartialOrd, Ord, ArgEnum, EnumIter)]
pub enum NextalignOutputSelection {
  All,
  Fasta,
  Translations,
  Insertions,
  Errors,
}

#[derive(Parser, Debug)]
pub struct NextalignRunArgs {
  /// Path to a FASTA file with input sequences
  #[clap(value_hint = ValueHint::FilePath)]
  pub input_fasta: Vec<PathBuf>,

  /// Path to a FASTA file containing reference sequence.
  ///
  /// This file should contain exactly 1 sequence.
  #[clap(long, short = 'r', visible_alias("reference"))]
  #[clap(value_hint = ValueHint::FilePath)]
  pub input_ref: PathBuf,

  /// Path to a .gff file containing the gene map (genome annotation).
  ///
  /// Gene map (sometimes also called 'genome annotation') is used to find coding regions. If not supplied, coding regions will
  /// not be translated, amino acid sequences will not be output, and nucleotide sequence
  /// alignment will not be informed by codon boundaries
  ///
  /// List of genes can be restricted using `--genes` flag. Otherwise all genes found in the gene map will be used.
  ///
  /// Learn more about Generic Feature Format Version 3 (GFF3):
  /// https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md",
  #[clap(long, short = 'm', alias = "genemap")]
  #[clap(value_hint = ValueHint::FilePath)]
  pub input_gene_map: Option<PathBuf>,

  /// Comma-separated list of names of genes to use.
  ///
  /// This defines which peptides will be written into outputs, and which genes will be taken into account during
  /// codon-aware alignment. Must only contain gene names present in the gene map. If
  /// this flag is not supplied or its value is an empty string, then all genes found in the gene map will be used.
  ///
  /// Requires `--input-gene-map` to be specified.
  #[clap(
    long,
    short = 'g',
    takes_value = true,
    multiple_values = true,
    use_value_delimiter = true
  )]
  #[clap(value_hint = ValueHint::FilePath)]
  pub genes: Option<Vec<String>>,

  /// Produce all of the output files into this directory, using default basename and predefined suffixes and extensions. This is equivalent to specifying each of the individual `--output-*` flags. Convenient when you want to receive all or most of output files into the same directory and don't care about their filenames.
  ///
  /// Output files can be optionally included or excluded using `--output-selection` flag.
  /// The base filename can be set using `--output-basename` flag.
  ///
  /// If both the `--output-all` and individual `--output-*` flags are provided, each
  //  individual flag overrides the corresponding default output path.
  ///
  /// At least one of the output flags is required: `--output-all`, `--output-fasta`, `--output-translations`, `--output-insertions`, `--output-errors`
  ///
  /// If the required directory tree does not exist, it will be created.
  #[clap(long, short = 'O')]
  #[clap(value_hint = ValueHint::DirPath)]
  pub output_all: Option<PathBuf>,

  /// Set the base filename to use for output files.
  ///
  /// By default the base filename is extracted from the input sequences file (provided with `--input-fasta`).
  ///
  /// Only valid together with `--output-all` flag.
  #[clap(long, short = 'n')]
  #[clap(requires = "output-all")]
  pub output_basename: Option<String>,

  /// Restricts outputs for `--output-all` flag.
  ///
  /// Should contain a comma-separated list of names of output files to produce.
  ///
  /// If 'all' is present in the list, then all other entries are ignored and all outputs are produced.
  ///
  /// Only valid together with `--output-all` flag.
  #[clap(
    long,
    short = 's',
    takes_value = true,
    multiple_values = true,
    use_value_delimiter = true
  )]
  #[clap(requires = "output-all")]
  #[clap(arg_enum)]
  pub output_selection: Vec<NextalignOutputSelection>,

  /// Path to output FASTA file with aligned sequences.
  ///
  /// Takes precedence over paths configured with `--output-all`, `--output-basename` and `--output-selection`.
  ///
  /// If the required directory tree does not exist, it will be created.
  #[clap(long, short = 'o')]
  #[clap(value_hint = ValueHint::AnyPath)]
  pub output_fasta: Option<PathBuf>,

  /// Template string for path to output fasta files containing translated and aligned peptides. A separate file will be generated for every gene.
  /// The string should contain template variable `{gene}`, where the gene name will be substituted.
  /// Make sure you properly quote and/or escape the curly braces, so that your shell, programming language or pipeline manager does not attempt to substitute the variables.
  ///
  /// Takes precedence over paths configured with `--output-all`, `--output-basename` and `--output-selection`.
  ///
  /// Example for bash shell:
  ///
  ///   --output-translations='output_dir/gene_{{gene}}.translation.fasta'
  ///
  /// If the required directory tree does not exist, it will be created.
  #[clap(long, short = 'P')]
  #[clap(value_hint = ValueHint::AnyPath)]
  pub output_translations: Option<String>,

  /// Path to output CSV file that contain insertions stripped from the reference alignment.
  ///
  /// Takes precedence over paths configured with `--output-all`, `--output-basename` and `--output-selection`.
  ///
  /// If the required directory tree does not exist, it will be created.
  #[clap(long, short = 'I')]
  #[clap(value_hint = ValueHint::AnyPath)]
  pub output_insertions: Option<PathBuf>,

  /// Path to output CSV file containing errors and warnings occurred during processing
  ///
  /// Takes precedence over paths configured with `--output-all`, `--output-basename` and `--output-selection`.
  ///
  /// If the required directory tree does not exist, it will be created.
  #[clap(long, short = 'e')]
  #[clap(value_hint = ValueHint::AnyPath)]
  pub output_errors: Option<PathBuf>,

  /// Whether to include aligned reference nucleotide sequence into output nucleotide sequence FASTA file and reference peptides into output peptide FASTA files.
  #[clap(long)]
  pub include_reference: bool,

  /// Emit output sequences in-order.
  ///
  /// With this flag the program will wait for results from the previous sequences to be written to the output files before writing the results of the next sequences, preserving the same order as in the input file. Due to variable sequence processing times, this might introduce unnecessary waiting times, but ensures that the resulting sequences are written in the same order as they occur in the inputs (except for sequences which have errors).
  /// By default, without this flag, processing might happen out of order, which is faster, due to the elimination of waiting, but might also lead to results written out of order - the order of results is not specified and depends on thread scheduling and processing times of individual sequences.
  ///
  /// This option is only relevant when `--jobs` is greater than 1 or is omitted.
  ///
  /// Note: the sequences which trigger errors during processing will be omitted from outputs, regardless of this flag.
  #[clap(long)]
  pub in_order: bool,

  /// Number of processing jobs. If not specified, all available CPU threads will be used.
  #[clap(global = false, long, short = 'j', default_value_t = num_cpus::get() )]
  pub jobs: usize,

  #[clap(flatten)]
  pub alignment_params: AlignPairwiseParamsOptional,
}

fn generate_completions(shell: &str) -> Result<(), Report> {
  let mut command = NextalignArgs::command();

  if shell.to_lowercase() == "fig" {
    generate(Fig, &mut command, "nextalign", &mut io::stdout());
    return Ok(());
  }

  let generator = Shell::from_str(&shell.to_lowercase(), true)
    .map_err(|err| eyre!("{}: Possible values: {}", err, SHELLS.join(", ")))?;

  let bin_name = command.get_name().to_owned();

  generate(generator, &mut command, bin_name, &mut io::stdout());

  Ok(())
}

/// Get output filenames provided by user or, if not provided, create filenames based on input fasta
pub fn nextalign_get_output_filenames(run_args: &mut NextalignRunArgs) -> Result<(), Report> {
  let NextalignRunArgs {
    input_fasta,
    output_all,
    ref mut output_basename,
    ref mut output_errors,
    ref mut output_fasta,
    ref mut output_insertions,
    ref mut output_translations,
    ref mut output_selection,
    ..
  } = run_args;

  // If `--output-all` is provided, then we need to deduce default output filenames,
  // while taking care to preserve values of any individual `--output-*` flags,
  // as well as to honor restrictions put by the `--output-selection` flag, if provided.
  if let Some(output_all) = output_all {
    let output_basename = output_basename
      .clone()
      .unwrap_or_else(|| get_fasta_basename(input_fasta).unwrap_or_else(|| "nextalign".to_owned()));

    let default_output_file_path = output_all.join(&output_basename);

    // If `--output-selection` is empty or contains `all`, then fill it with all possible variants
    if output_selection.is_empty() || output_selection.contains(&NextalignOutputSelection::All) {
      *output_selection = NextalignOutputSelection::iter().collect_vec();
    }

    // We use `Option::get_or_insert()` mutable method here in order
    // to set default output filenames only if they are not provided.

    if output_selection.contains(&NextalignOutputSelection::Fasta) {
      output_fasta.get_or_insert(default_output_file_path.with_extension("aligned.fasta"));
    }

    if output_selection.contains(&NextalignOutputSelection::Insertions) {
      let output_insertions =
        output_insertions.get_or_insert(default_output_file_path.with_extension("insertions.csv"));
    }

    if output_selection.contains(&NextalignOutputSelection::Errors) {
      let output_errors = output_errors.get_or_insert(default_output_file_path.with_extension("errors.csv"));
    }

    if output_selection.contains(&NextalignOutputSelection::Translations) {
      let output_translations = {
        let output_translations_path = default_output_file_path
          .with_file_name(format!("{output_basename}_gene_{{gene}}"))
          .with_extension("translation.fasta");

        let output_translations_template = output_translations_path
          .to_str()
          .wrap_err_with(|| format!("When converting path to string: '{output_translations_path:?}'"))?
          .to_owned();

        output_translations.get_or_insert(output_translations_template)
      };
    }
  }

  if let Some(output_translations) = output_translations {
    if !output_translations.contains("{gene}") {
      return make_error!(
        r#"
Expected `--output-translations` argument to contain a template string containing template variable {{gene}} (with curly braces), but received:

  {output_translations}

Make sure the variable is not substituted by your shell, programming language or workflow manager. Apply proper escaping as needed.
Example for bash shell:

  --output-translations='output_dir/gene_{{gene}}.translation.fasta'

      "#
      );
    }
  }

  let all_outputs_are_missing = [output_all, output_fasta, output_insertions, output_errors]
    .iter()
    .all(|o| o.is_none())
    && output_translations.is_none();

  if all_outputs_are_missing {
    return make_error!(
      r#"No output flags provided.

At least one of the following flags is required:
  --output-all
  --output-fasta
  --output-translations
  --output-insertions
  --output-errors"#
    );
  }

  Ok(())
}

pub fn nextalign_parse_cli_args() -> Result<NextalignArgs, Report> {
  let mut args = NextalignArgs::parse();

  // --verbosity=<level> and --silent take priority over -v and -q
  let filter_level = if args.silent {
    LevelFilter::Off
  } else {
    match args.verbosity {
      None => args.verbose.log_level_filter(),
      Some(verbosity) => verbosity,
    }
  };

  setup_logger(filter_level);

  match &mut args.command {
    NextalignCommands::Completions { shell } => {
      generate_completions(shell).wrap_err_with(|| format!("When generating completions for shell '{shell}'"))?;
    }
    NextalignCommands::Run(ref mut run_args) => {
      nextalign_get_output_filenames(run_args).wrap_err("When deducing output filenames")?;
    }
  }

  Ok(args)
}
