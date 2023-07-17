use crate::cli::nextalign_loop::nextalign_run;
use crate::cli::nextclade_cli::{check_shells, SHELLS};
use crate::cli::verbosity::{Verbosity, WarnLevel};
use clap::{CommandFactory, Parser, Subcommand, ValueEnum, ValueHint};
use clap_complete::{generate, Generator, Shell};
use clap_complete_fig::Fig;
use eyre::{eyre, ContextCompat, Report, WrapErr};
use itertools::Itertools;
use nextclade::align::params::AlignPairwiseParamsOptional;
use nextclade::io::fs::add_extension;
use nextclade::make_error;
use nextclade::utils::build_info::get_build_info;
use nextclade::utils::global_init::setup_logger;
use std::fmt::Debug;
use std::io;
use std::path::PathBuf;
use std::process::exit;
use strum::IntoEnumIterator;
use strum_macros::EnumIter;

#[derive(Parser, Debug)]
#[clap(name = "nextalign")]
#[clap(author, version)]
#[clap(verbatim_doc_comment)]
/// Viral sequence alignment and translation.
///
/// Nextalign is a part of Nextstrain: https://nextstrain.org
///
/// Documentation: https://docs.nextstrain.org/projects/nextclade
/// Nextclade Web: https://clades.nextstrain.org
/// Publication:   https://doi.org/10.21105/joss.03773
///
/// Please read short help with `nextalign -h` and extended help with `nextalign --help`. Each subcommand has its own help, for example: `nextclade run --help`.
pub struct NextalignArgs {
  #[clap(subcommand)]
  pub command: Option<NextalignCommands>,

  /// Make output more quiet or more verbose
  #[clap(flatten, next_help_heading = "  Verbosity")]
  pub verbosity: Verbosity<WarnLevel>,

  /// Detailed version information
  #[clap(long, short = 'W', global = true)]
  pub version_detailed: bool,

  /// Full version information
  #[clap(long, short = 'X', global = true)]
  pub version_full: bool,

  /// Full version information in JSON format
  #[clap(long, short = 'Y', global = true)]
  pub version_json: bool,
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
    #[clap(value_name = "SHELL", default_value_t = String::from("bash"), value_parser = check_shells)]
    shell: String,
  },

  /// Run alignment and translation.
  ///
  /// For short help type: `nextclade -h`, for extended help type: `nextclade --help`. Each subcommand has its own help, for example: `nextclade run --help`.
  Run(Box<NextalignRunArgs>),
}

#[derive(Copy, Debug, Clone, PartialEq, Eq, PartialOrd, Ord, ValueEnum, EnumIter)]
pub enum NextalignOutputSelection {
  All,
  Fasta,
  Translations,
  Insertions,
  Errors,
}

#[derive(Parser, Debug)]
pub struct NextalignRunInputArgs {
  /// Path to one or multiple FASTA files with input sequences
  ///
  /// Supports the following compression formats: "gz", "bz2", "xz", "zstd". If no files provided, the plain fasta input is read from standard input (stdin).
  ///
  /// See: https://en.wikipedia.org/wiki/FASTA_format
  #[clap(value_hint = ValueHint::FilePath)]
  #[clap(display_order = 1)]
  pub input_fastas: Vec<PathBuf>,

  /// REMOVED. Use positional arguments instead.
  ///
  /// Example: nextalign run -D dataset/ -O out/ seq1.fasta seq2.fasta
  #[clap(long, short = 'i', visible_alias("sequences"))]
  #[clap(value_hint = ValueHint::FilePath)]
  #[clap(hide_long_help = true, hide_short_help = true)]
  pub input_fasta: Option<PathBuf>,

  /// Path to a FASTA file containing reference sequence. This file should contain exactly 1 sequence.
  ///
  /// Supports the following compression formats: "gz", "bz2", "xz", "zstd". Use "-" to read uncompressed data from standard input (stdin).
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
  /// https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md
  ///
  /// Supports the following compression formats: "gz", "bz2", "xz", "zstd". Use "-" to read uncompressed data from standard input (stdin).
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
    num_args=1..,
    use_value_delimiter = true
  )]
  #[clap(value_hint = ValueHint::FilePath)]
  pub genes: Option<Vec<String>>,
}

#[derive(Parser, Debug)]
pub struct NextalignRunOutputArgs {
  /// REMOVED. Use `--output-all` instead
  #[clap(long)]
  #[clap(value_hint = ValueHint::DirPath)]
  #[clap(hide_long_help = true, hide_short_help = true)]
  pub output_dir: Option<PathBuf>,

  /// Produce all of the output files into this directory, using default basename and predefined suffixes and extensions. This is equivalent to specifying each of the individual `--output-*` flags. Convenient when you want to receive all or most of output files into the same directory and don't care about their filenames.
  ///
  /// Output files can be optionally included or excluded using `--output-selection` flag.
  /// The base filename can be set using `--output-basename` flag.
  ///
  /// If both the `--output-all` and individual `--output-*` flags are provided, each individual flag overrides the corresponding default output path.
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
  #[clap(requires = "output_all")]
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
    num_args=1..,
    use_value_delimiter = true
  )]
  #[clap(requires = "output_all")]
  #[clap(value_enum)]
  pub output_selection: Vec<NextalignOutputSelection>,

  /// Path to output FASTA file with aligned sequences.
  ///
  /// Takes precedence over paths configured with `--output-all`, `--output-basename` and `--output-selection`.
  ///
  /// If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zstd", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).
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
  /// If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zstd", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).
  ///
  /// If the required directory tree does not exist, it will be created.
  ///
  /// Example for bash shell:
  ///
  ///   --output-translations='output_dir/gene_{gene}.translation.fasta'
  #[clap(long, short = 'P')]
  #[clap(value_hint = ValueHint::AnyPath)]
  pub output_translations: Option<String>,

  /// Path to output CSV file that contain insertions stripped from the reference alignment.
  ///
  /// Takes precedence over paths configured with `--output-all`, `--output-basename` and `--output-selection`.
  ///
  /// If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zstd", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).
  ///
  /// If the required directory tree does not exist, it will be created.
  #[clap(long, short = 'I')]
  #[clap(value_hint = ValueHint::AnyPath)]
  pub output_insertions: Option<PathBuf>,

  /// Path to output CSV file containing errors and warnings occurred during processing
  ///
  /// Takes precedence over paths configured with `--output-all`, `--output-basename` and `--output-selection`.
  ///
  /// If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zstd", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).
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

  /// Replace unknown nucleotide characters with 'N'
  ///
  /// By default, the sequences containing unknown nucleotide nucleotide characters are skipped with a warning - they
  /// are not aligned and not included into results. If this flag is provided, then before the alignment,
  /// all unknown characters are replaced with 'N'. This replacement allows to align these sequences.
  ///
  /// The following characters are considered known:  '-', 'A', 'B', 'C', 'D', 'G', 'H', 'K', 'M', 'N', 'R', 'S', 'T', 'V', 'W', 'Y'
  #[clap(long)]
  pub replace_unknown: bool,
}

#[derive(Parser, Debug)]
pub struct NextalignRunOtherArgs {
  /// Number of processing jobs. If not specified, all available CPU threads will be used.
  #[clap(global = false, long, short = 'j', default_value_t = num_cpus::get())]
  pub jobs: usize,
}

#[derive(Parser, Debug)]
pub struct NextalignRunArgs {
  #[clap(flatten, next_help_heading = "  Inputs")]
  pub inputs: NextalignRunInputArgs,

  #[clap(flatten, next_help_heading = "  Outputs")]
  pub outputs: NextalignRunOutputArgs,

  #[clap(flatten, next_help_heading = "  Alignment parameters")]
  pub alignment_params: AlignPairwiseParamsOptional,

  #[clap(flatten, next_help_heading = "  Other")]
  pub other: NextalignRunOtherArgs,
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
    inputs:
      NextalignRunInputArgs {
        input_fastas,
        input_ref,
        input_gene_map,
        genes,
        ..
      },
    outputs:
      NextalignRunOutputArgs {
        output_all,
        output_basename,
        output_selection,
        output_fasta,
        output_translations,
        output_insertions,
        output_errors,
        include_reference,
        in_order,
        ..
      },
    other: NextalignRunOtherArgs { jobs },
    alignment_params,
  } = run_args;

  // If `--output-all` is provided, then we need to deduce default output filenames,
  // while taking care to preserve values of any individual `--output-*` flags,
  // as well as to honor restrictions put by the `--output-selection` flag, if provided.
  if let Some(output_all) = output_all {
    let output_basename = output_basename.clone().unwrap_or_else(|| "nextalign".to_owned());

    let default_output_file_path = output_all.join(&output_basename);

    // If `--output-selection` is empty or contains `all`, then fill it with all possible variants
    if output_selection.is_empty() || output_selection.contains(&NextalignOutputSelection::All) {
      *output_selection = NextalignOutputSelection::iter().collect_vec();
    }

    // We use `Option::get_or_insert()` mutable method here in order
    // to set default output filenames only if they are not provided.

    if output_selection.contains(&NextalignOutputSelection::Fasta) {
      output_fasta.get_or_insert(add_extension(&default_output_file_path, "aligned.fasta"));
    }

    if output_selection.contains(&NextalignOutputSelection::Insertions) {
      let output_insertions =
        output_insertions.get_or_insert(add_extension(&default_output_file_path, "insertions.csv"));
    }

    if output_selection.contains(&NextalignOutputSelection::Errors) {
      let output_errors = output_errors.get_or_insert(add_extension(&default_output_file_path, "errors.csv"));
    }

    if output_selection.contains(&NextalignOutputSelection::Translations) {
      let output_translations = {
        let output_translations_path =
          default_output_file_path.with_file_name(format!("{output_basename}_gene_{{gene}}"));
        let output_translations_path = add_extension(output_translations_path, "translation.fasta");

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

const ERROR_MSG_INPUT_FASTA_REMOVED: &str = r#"The argument `--input-fasta` (alias: `--sequences`, `-i`) is removed in favor of positional arguments.

Try:

  nextalign run -r ref.fasta -m genemap.gff -O out/ seq1.fasta seq2.fasta

                                                       ^          ^
                                              one or multiple positional arguments
                                                with paths to input fasta files


When positional arguments are not provided, nextalign will read input fasta from standard input.

For more information, type

  nextalign run --help"#;

const ERROR_MSG_OUTPUT_DIR_REMOVED: &str = r#"The argument `--output-dir` is removed in favor of `--output-all`.

When provided, `--output-all` allows to write all possible outputs into a directory.

The defaut base name of the files can be overriden with `--output-basename` argument.

The set of output files can be restricted with `--output-selection` argument.

For more information, type:

  nextalign run --help"#;

pub fn nextalign_check_removed_args(run_args: &mut NextalignRunArgs) -> Result<(), Report> {
  if run_args.inputs.input_fasta.is_some() {
    return make_error!("{ERROR_MSG_INPUT_FASTA_REMOVED}");
  }

  if run_args.outputs.output_dir.is_some() {
    return make_error!("{ERROR_MSG_OUTPUT_DIR_REMOVED}");
  }

  Ok(())
}

#[allow(clippy::exit)]
pub fn nextalign_handle_cli_args() -> Result<(), Report> {
  let args = NextalignArgs::parse();

  setup_logger(args.verbosity.get_filter_level());

  if args.version_detailed {
    println!("{}", get_build_info().detailed()?);
    exit(0);
  } else if args.version_full {
    println!("{}", get_build_info().full()?);
    exit(0);
  } else if args.version_json {
    println!("{}", get_build_info().json()?);
    exit(0);
  }

  match args.command {
    Some(NextalignCommands::Completions { shell }) => {
      generate_completions(&shell).wrap_err_with(|| format!("When generating completions for shell '{shell}'"))
    }
    Some(NextalignCommands::Run(mut run_args)) => {
      nextalign_check_removed_args(&mut run_args)?;
      nextalign_get_output_filenames(&mut run_args).wrap_err("When deducing output filenames")?;
      nextalign_run(*run_args)
    }
    _ => {
      make_error!("Nextalign requires a command as the first argument. Please type `nextalign --help` for more info.")
    }
  }
}
