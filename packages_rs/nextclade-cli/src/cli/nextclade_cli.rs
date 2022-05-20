use crate::io::http_client::ProxyConfig;
use clap::{AppSettings, CommandFactory, Parser, Subcommand, ValueHint};
use clap_complete::{generate, Generator, Shell};
use clap_complete_fig::Fig;
use clap_verbosity_flag::{Verbosity, WarnLevel};
use eyre::{eyre, Report, WrapErr};
use itertools::Itertools;
use lazy_static::lazy_static;
use log::LevelFilter;
use nextclade::align::params::AlignPairwiseParams;
use nextclade::io::fs::basename;
use nextclade::utils::global_init::setup_logger;
use nextclade::{getenv, make_error};
use std::env::current_dir;
use std::fmt::Debug;
use std::io;
use std::path::PathBuf;
use std::str::FromStr;
use url::Url;

const DATA_FULL_DOMAIN: &str = getenv!("DATA_FULL_DOMAIN");

lazy_static! {
  static ref SHELLS: &'static [&'static str] = &["bash", "elvish", "fish", "fig", "powershell", "zsh"];
  static ref VERBOSITIES: &'static [&'static str] = &["off", "error", "warn", "info", "debug", "trace"];
}

#[derive(Parser, Debug)]
#[clap(name = "nextclade", trailing_var_arg = true)]
#[clap(author, version)]
#[clap(global_setting(AppSettings::DeriveDisplayOrder))]
#[clap(verbatim_doc_comment)]
/// Viral genome alignment, mutation calling, clade assignment, quality checks and phylogenetic placement.
///
/// Nextclade is a part of Nextstrain: https://nextstrain.org
///
/// Documentation: https://docs.nextstrain.org/projects/nextclade
/// Nextclade Web: https://clades.nextstrain.org
/// Publication:   https://doi.org/10.21105/joss.03773
pub struct NextcladeArgs {
  #[clap(subcommand)]
  pub command: Option<NextcladeCommands>,

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
pub enum NextcladeCommands {
  /// Generate shell completions.
  ///
  /// This will print the completions file contents to the console. Refer to your shell's documentation on how to install the completions.
  ///
  /// Example for Ubuntu Linux:
  ///
  ///    nextclade completions bash > ~/.local/share/bash-completion/nextclade
  ///
  Completions {
    /// Name of the shell to generate appropriate completions
    #[clap(value_name = "SHELL", default_value_t = String::from("bash"), possible_values(SHELLS.iter()))]
    shell: String,
  },

  /// Run alignment, mutation calling, clade assignment, quality checks and phylogenetic placement
  Run(NextcladeRunArgs),

  /// List and download available Nextclade datasets
  Dataset(NextcladeDatasetArgs),
}

#[derive(Parser, Debug)]
pub struct NextcladeDatasetArgs {
  #[clap(subcommand)]
  pub command: Option<NextcladeDatasetCommands>,
}

#[derive(Subcommand, Debug)]
#[clap(verbatim_doc_comment)]
pub enum NextcladeDatasetCommands {
  /// List available Nextclade datasets
  List(NextcladeDatasetListArgs),

  /// Download available Nextclade datasets
  Get(NextcladeDatasetGetArgs),
}

#[derive(Parser, Debug)]
#[clap(verbatim_doc_comment)]
pub struct NextcladeDatasetListArgs {
  /// Restrict list to datasets with this name. Equivalent to `--attribute='name=<value>'`.
  #[clap(long, short = 'n')]
  #[clap(value_hint = ValueHint::Other)]
  pub name: Option<String>,

  /// Restrict list to datasets based on this reference sequence (given its accession ID). Equivalent to `--attribute='reference=<value>'`.
  #[clap(long, short = 'r')]
  #[clap(value_hint = ValueHint::Other)]
  #[clap(default_value = "default")]
  pub reference: String,

  /// Restrict list to datasets with this version tag. Equivalent to `--attribute='tag=<value>'`.
  #[clap(long, short = 't')]
  #[clap(value_hint = ValueHint::Other)]
  #[clap(default_value = "latest")]
  pub tag: String,

  /// Restrict list to only datasets with a given combination of attribute key-value pairs.
  /// Keys and values are separated with an equality sign.
  /// This flag can occur multiple times, for multiple attributes.
  /// Example: `--attribute='reference=MN908947' --attribute='tag=2022-04-28T12:00:00Z'`.
  #[clap(long, short = 'a')]
  #[clap(value_hint = ValueHint::Other)]
  pub attribute: Vec<String>,

  /// Include dataset version tags that are incompatible with this version of Nextclade CLI. By default the incompatible versions are omitted.
  #[clap(long)]
  pub include_incompatible: bool,

  /// Include older dataset version tags, additional to the latest.
  #[clap(long)]
  pub include_old: bool,

  /// Print output in JSON format.
  #[clap(long)]
  pub json: bool,

  /// Use custom dataset server
  #[clap(long)]
  #[clap(value_hint = ValueHint::Url)]
  #[clap(default_value_t = Url::from_str(DATA_FULL_DOMAIN).expect("Invalid URL"))]
  pub server: Url,

  #[clap(flatten)]
  pub proxy_config: ProxyConfig,
}

#[derive(Parser, Debug)]
#[clap(verbatim_doc_comment)]
pub struct NextcladeDatasetGetArgs {
  /// Name of the dataset to download. Equivalent to `--attribute='name=<value>'`. Use `dataset list` command to view available datasets.
  #[clap(long, short = 'n')]
  #[clap(value_hint = ValueHint::Other)]
  pub name: String,

  /// Download dataset based on this reference sequence (given its accession ID).
  /// If this flag is not provided or is 'default', will download dataset based on current default reference sequence, as defined by dataset maintainers.
  /// The default reference sequence can change over time. Use `dataset list` command to view available options.
  /// Equivalent to `--attribute='reference=<value>'`.
  #[clap(long, short = 'r')]
  #[clap(value_hint = ValueHint::Other)]
  #[clap(default_value = "default")]
  pub reference: String,

  /// Version tag of the dataset to download.
  /// If this flag is not provided or is 'latest', then the latest **compatible** version is downloaded.
  /// Equivalent to `--attribute='tag=<value>'`.
  #[clap(long, short = 't')]
  #[clap(value_hint = ValueHint::Other)]
  #[clap(default_value = "latest")]
  pub tag: String,

  /// Download dataset with a given combination of attribute key-value pairs.
  /// Keys and values are separated with an equality sign.
  /// This flag can occur multiple times, for multiple attributes.
  /// Example: `--attribute='reference=MN908947' --attribute='tag=2022-04-28T12:00:00Z'`.
  #[clap(long, short = 'a')]
  #[clap(value_hint = ValueHint::Other)]
  pub attribute: Vec<String>,

  /// Use custom dataset server
  #[clap(long)]
  #[clap(value_hint = ValueHint::Url)]
  #[clap(default_value_t = Url::from_str(DATA_FULL_DOMAIN).expect("Invalid URL"))]
  pub server: Url,

  /// Path to directory to write dataset files to. If the target directory tree does not exist, it will be created.
  #[clap(long, short = 'o')]
  #[clap(value_hint = ValueHint::DirPath)]
  pub output_dir: PathBuf,

  #[clap(flatten)]
  pub proxy_config: ProxyConfig,
}

/// Combines args from Nextalign and from Nextclade proper
#[derive(Parser, Debug)]
pub struct NextcladeRunArgs {
  /// Number of processing jobs. If not specified, all available CPU threads will be used.
  #[clap(global = false, long, short, default_value_t = num_cpus::get() )]
  pub jobs: usize,

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

  /// Path to a FASTA file with input sequences
  #[clap(long, short = 'i', visible_alias("sequences"))]
  #[clap(value_hint = ValueHint::FilePath)]
  pub input_fasta: PathBuf,

  /// Path to a directory containing a dataset.
  ///
  /// See `nextclade dataset --help` on how to obtain datasets.
  ///
  /// If this flag is not provided, the following individual input flags are required: `--input-root-seq`,
  /// `--input-tree`, `--input-qc-config`, and the following individual input files are recommended: `--input-gene-map`,
  /// `--input-pcr-primers`.
  ///
  /// If both the `--input-dataset` and individual `--input-*` flags are provided, each individual flag overrides the
  /// corresponding file in the dataset.
  #[clap(long, short = 'D')]
  #[clap(value_hint = ValueHint::DirPath)]
  pub input_dataset: Option<PathBuf>,

  /// Path to a FASTA file containing reference sequence. This file is expected to contain exactly 1 sequence.
  ///
  /// Overrides path to `reference.fasta` in the dataset (`--input-dataset`).
  #[clap(long, short = 'r', visible_alias("reference"), visible_alias("input-root-seq"))]
  #[clap(value_hint = ValueHint::FilePath)]
  pub input_ref: Option<PathBuf>,

  /// Path to Auspice JSON v2 file containing reference tree.
  ///
  /// See https://nextstrain.org/docs/bioinformatics/data-formats.
  ///
  /// Overrides path to `tree.json` in the dataset (`--input-dataset`).
  #[clap(long, short = 'a')]
  #[clap(value_hint = ValueHint::FilePath)]
  pub input_tree: Option<PathBuf>,

  /// Path to a JSON file containing configuration of Quality Control rules.
  ///
  /// Overrides path to `qc.json` in the dataset (`--input-dataset`).
  #[clap(long, short = 'Q')]
  #[clap(value_hint = ValueHint::FilePath)]
  pub input_qc_config: Option<PathBuf>,

  /// Path to a JSON file containing configuration and data specific to a pathogen.
  ///
  /// Overrides path to `virus_properties.json` in the dataset (`--input-dataset`).
  #[clap(long, short = 's')]
  #[clap(value_hint = ValueHint::FilePath)]
  pub input_virus_properties: Option<PathBuf>,

  /// Path to a CSV file containing a list of custom PCR primer sites. This information is used to report mutations in these sites.
  ///
  /// Overrides path to `primers.csv` in the dataset (`--input-dataset`).
  #[clap(long, short = 'p')]
  #[clap(value_hint = ValueHint::FilePath)]
  pub input_pcr_primers: Option<PathBuf>,

  /// Path to a .gff file containing the gene map (genome annotation).
  ///
  /// Gene map (sometimes also called 'genome annotation') is used to find coding regions. If not supplied, coding regions will
  /// not be translated, amino acid sequences will not be output, amino acid mutations will not be detected and nucleotide sequence
  /// alignment will not be informed by codon boundaries
  ///
  /// Overrides path to `genemap.gff` provided by `--input-dataset`.
  ///
  /// Learn more about Generic Feature Format Version 3 (GFF3):
  /// https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md",
  #[clap(long, short = 'm', alias = "genemap")]
  #[clap(value_hint = ValueHint::FilePath)]
  pub input_gene_map: Option<PathBuf>,

  /// Comma-separated list of names of genes to use.
  ///
  /// This defines which peptides will be written into outputs, and which genes will be taken into account during
  /// codon-aware alignment and aminoacid mutations detection. Must only contain gene names present in the gene map. If
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

  /// Write output files to this directory.
  ///
  /// The base filename can be set using `--output-basename` flag. The paths can be overridden on a per-file basis using `--output-*` flags.
  ///
  /// If the required directory tree does not exist, it will be created.
  #[clap(long, short = 'd')]
  #[clap(value_hint = ValueHint::DirPath)]
  pub output_dir: Option<PathBuf>,

  /// Set the base filename to use for output files.
  ///
  /// To be used together with `--output-dir` flag. By default uses the filename of the sequences file (provided with `--input-fasta`). The paths can be overridden on a per-file basis using `--output-*` flags.
  #[clap(long, short = 'n')]
  pub output_basename: Option<String>,

  /// Whether to include aligned reference nucleotide sequence into output nucleotide sequence FASTA file and reference peptides into output peptide FASTA files.
  #[clap(long)]
  pub include_reference: bool,

  /// Path to output FASTA file with aligned sequences.
  ///
  /// Overrides paths given with `--output-dir` and `--output-basename`.
  ///
  /// If the required directory tree does not exist, it will be created.
  #[clap(long, short = 'o')]
  #[clap(value_hint = ValueHint::AnyPath)]
  pub output_fasta: Option<PathBuf>,

  /// Path to output Newline-delimited JSON (NDJSON) results file.
  ///
  /// This file format is most suitable for further machine processing of the results.
  #[clap(long, short = 'N')]
  #[clap(value_hint = ValueHint::AnyPath)]
  pub output_ndjson: Option<PathBuf>,

  /// Path to output JSON results file.
  ///
  /// This file format is most suitable for further machine processing of the results.
  #[clap(long, short = 'O')]
  #[clap(value_hint = ValueHint::AnyPath)]
  pub output_json: Option<PathBuf>,

  /// Path to output CSV results file.
  ///
  /// This file format is most suitable for human inspection as well as for limited further machine processing of the results.
  ///
  /// CSV and TSV output files are equivalent and only differ in the column delimiters.
  #[clap(long, short = 'c')]
  #[clap(value_hint = ValueHint::AnyPath)]
  pub output_csv: Option<PathBuf>,

  /// Path to output TSV results file.
  ///
  /// This file format is most suitable for human inspection as well as for limited further machine processing of the results.
  ///
  /// CSV and TSV output files are equivalent and only differ in the column delimiters.
  #[clap(long, short = 't')]
  #[clap(value_hint = ValueHint::AnyPath)]
  pub output_tsv: Option<PathBuf>,

  /// Path to output phylogenetic tree with input sequences placed onto it, in Auspice JSON V2 format.
  ///
  /// For file format description see: https://nextstrain.org/docs/bioinformatics/data-formats
  ///
  /// Due to format limitations, it is only feasible to construct the tree for at most a few hundred to a few thousand
  /// sequences. If the tree is not needed, omitting this flag reduces processing time and memory consumption.
  #[clap(long, short = 'T')]
  #[clap(value_hint = ValueHint::AnyPath)]
  pub output_tree: Option<PathBuf>,

  /// Path to output CSV file that contain insertions stripped from the reference alignment.
  ///
  /// Overrides paths given with `--output-dir` and `--output-basename`.
  ///
  /// If the required directory tree does not exist, it will be created.",
  #[clap(long, short = 'I')]
  #[clap(value_hint = ValueHint::AnyPath)]
  pub output_insertions: Option<PathBuf>,

  /// Path to output CSV file containing errors and warnings occurred during processing
  ///
  /// Overrides paths given with `--output-dir` and `--output-basename`).
  ///
  /// If the required directory tree does not exist, it will be created
  #[clap(long, short = 'e')]
  #[clap(value_hint = ValueHint::AnyPath)]
  pub output_errors: Option<PathBuf>,

  #[clap(flatten)]
  pub alignment_params: AlignPairwiseParams,
}

fn generate_completions(shell: &str) -> Result<(), Report> {
  let mut command = NextcladeArgs::command();

  if shell.to_lowercase() == "fig" {
    generate(Fig, &mut command, "nextclade", &mut io::stdout());
    return Ok(());
  }

  let generator =
    Shell::from_str(&shell.to_lowercase()).map_err(|err| eyre!("{}: Possible values: {}", err, SHELLS.join(", ")))?;

  let bin_name = command.get_name().to_owned();

  generate(generator, &mut command, bin_name, &mut io::stdout());

  Ok(())
}

/// Get output filenames provided by user or, if not provided, create filenames based on input fasta
pub fn nextclade_get_output_filenames(run_args: &mut NextcladeRunArgs) -> Result<(), Report> {
  let NextcladeRunArgs { input_fasta, .. } = run_args;

  let basename = run_args.output_basename.get_or_insert(basename(&input_fasta)?);

  let output_dir = run_args
    .output_dir
    .get_or_insert(current_dir().wrap_err("When getting current working directory")?);

  run_args
    .output_fasta
    .get_or_insert(output_dir.join(&basename).with_extension("aligned.fasta"));

  run_args
    .output_ndjson
    .get_or_insert(output_dir.join(&basename).with_extension("ndjson"));

  run_args
    .output_json
    .get_or_insert(output_dir.join(&basename).with_extension("json"));

  run_args
    .output_csv
    .get_or_insert(output_dir.join(&basename).with_extension("csv"));

  run_args
    .output_tsv
    .get_or_insert(output_dir.join(&basename).with_extension("tsv"));

  run_args
    .output_insertions
    .get_or_insert(output_dir.join(&basename).with_extension("insertions.csv"));

  run_args
    .output_errors
    .get_or_insert(output_dir.join(&basename).with_extension("errors.csv"));

  Ok(())
}

/// Get input filenames provided by user or, if not provided, deduce them from the dataset
pub fn nextclade_get_input_filenames(run_args: &mut NextcladeRunArgs) -> Result<(), Report> {
  let NextcladeRunArgs {
    input_dataset,
    input_ref,
    input_tree,
    input_qc_config,
    input_virus_properties,
    input_pcr_primers,
    input_gene_map,
    ..
  } = run_args;

  match input_dataset {
    None => {
      // If `--input-dataset` is not present, then check if the required individual input flags are provided
      let missing_args = &[
        (String::from("--input_ref"), input_ref),
        (String::from("--input_tree"), input_tree),
        (String::from("--input_qc_config"), input_qc_config),
        (String::from("--input_virus_properties"), input_virus_properties),
      ]
      .into_iter()
      .filter_map(|(key, val)| match val {
        None => Some(key),
        Some(_) => None,
      })
      .collect_vec();

      if !missing_args.is_empty() {
        let missing_args_str = missing_args.join("  \n");
        return make_error!(
          "When `--input-dataset` is not specified, the following arguments are required:\n{missing_args_str}"
        );
      }

      Ok(())
    }
    Some(input_dataset) => {
      // If `--input-dataset` is present, take input paths from it, unless individual input flags are provided
      input_ref.get_or_insert(input_dataset.join("reference.fasta"));
      input_tree.get_or_insert(input_dataset.join("tree.json"));
      input_qc_config.get_or_insert(input_dataset.join("qc.json"));
      input_virus_properties.get_or_insert(input_dataset.join("virus_properties.json"));
      input_pcr_primers.get_or_insert(input_dataset.join("primers.csv"));
      input_gene_map.get_or_insert(input_dataset.join("genemap.gff"));
      Ok(())
    }
  }
}

pub fn nextclade_parse_cli_args() -> Result<NextcladeArgs, Report> {
  let mut args = NextcladeArgs::parse();

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
    Some(NextcladeCommands::Completions { shell }) => {
      generate_completions(shell).wrap_err_with(|| format!("When generating completions for shell '{shell}'"))?;
    }
    Some(NextcladeCommands::Run { 0: ref mut run_args }) => {
      nextclade_get_input_filenames(run_args)?;
      nextclade_get_output_filenames(run_args).wrap_err("When deducing output filenames")?;
    }
    _ => {}
  }

  Ok(args)
}
