use crate::cli::nextclade_dataset_get::nextclade_dataset_get;
use crate::cli::nextclade_dataset_list::nextclade_dataset_list;
use crate::cli::nextclade_loop::nextclade_run;
use crate::cli::verbosity::{Verbosity, WarnLevel};
use crate::io::http_client::ProxyConfig;
use clap::{ArgGroup, CommandFactory, Parser, Subcommand, ValueEnum, ValueHint};
use clap_complete::{generate, Generator, Shell};
use clap_complete_fig::Fig;
use eyre::{eyre, ContextCompat, Report, WrapErr};
use itertools::Itertools;
use lazy_static::lazy_static;
use nextclade::align::params::AlignPairwiseParamsOptional;
use nextclade::io::fs::add_extension;
use nextclade::tree::params::TreeBuilderParamsOptional;
use nextclade::utils::global_init::setup_logger;
use nextclade::{getenv, make_error};
use std::fmt::Debug;
use std::io;
use std::path::PathBuf;
use std::str::FromStr;
use strum::IntoEnumIterator;
use strum_macros::EnumIter;
use url::Url;

const DATA_FULL_DOMAIN: &str = getenv!("DATA_FULL_DOMAIN");

lazy_static! {
  pub static ref SHELLS: Vec<&'static str> = ["bash", "elvish", "fish", "fig", "powershell", "zsh"].to_vec();
}

pub fn check_shells(value: &str) -> Result<String, Report> {
  SHELLS
    .contains(&value)
    .then_some(value.to_owned())
    .ok_or_else(|| eyre!("Unknown shell: '{value}'. Possible values: {}", SHELLS.join(", ")))
}

#[derive(Parser, Debug)]
#[clap(name = "nextclade")]
#[clap(author, version)]
#[clap(verbatim_doc_comment)]
/// Viral genome alignment, mutation calling, clade assignment, quality checks and phylogenetic placement.
///
/// Nextclade is a part of Nextstrain: https://nextstrain.org
///
/// Documentation: https://docs.nextstrain.org/projects/nextclade
/// Nextclade Web: https://clades.nextstrain.org
/// Publication:   https://doi.org/10.21105/joss.03773
///
/// For short help type: `nextclade -h`, for extended help type: `nextclade --help`. Each subcommand has its own help, for example: `nextclade run --help`.
pub struct NextcladeArgs {
  #[clap(subcommand)]
  pub command: NextcladeCommands,

  /// Make output more quiet or more verbose
  #[clap(flatten, next_help_heading = "  Verbosity")]
  pub verbosity: Verbosity<WarnLevel>,
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
    #[clap(value_name = "SHELL", default_value_t = String::from("bash"), value_parser = check_shells)]
    shell: String,
  },

  /// Run alignment, mutation calling, clade assignment, quality checks and phylogenetic placement
  ///
  /// For short help type: `nextclade -h`, for extended help type: `nextclade --help`. Each subcommand has its own help, for example: `nextclade run --help`.
  Run(Box<NextcladeRunArgs>),

  /// List and download available Nextclade datasets
  ///
  /// For short help type: `nextclade -h`, for extended help type: `nextclade --help`. Each subcommand has its own help, for example: `nextclade run --help`.
  Dataset(Box<NextcladeDatasetArgs>),
}

#[derive(Parser, Debug)]
pub struct NextcladeDatasetArgs {
  #[clap(subcommand)]
  pub command: NextcladeDatasetCommands,
}

#[derive(Subcommand, Debug)]
#[clap(verbatim_doc_comment)]
pub enum NextcladeDatasetCommands {
  /// List available Nextclade datasets
  ///
  /// For short help type: `nextclade -h`, for extended help type: `nextclade --help`. Each subcommand has its own help, for example: `nextclade run --help`.
  List(NextcladeDatasetListArgs),

  /// Download available Nextclade datasets
  ///
  /// For short help type: `nextclade -h`, for extended help type: `nextclade --help`. Each subcommand has its own help, for example: `nextclade run --help`.
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
  ///
  /// Special values: "all" - shows datasets with any reference sequences; "default" - show only datasets with default reference sequence (as defined by the author of a given dataset).
  #[clap(long, short = 'r')]
  #[clap(value_hint = ValueHint::Other)]
  #[clap(default_value = "all")]
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
#[clap(group(ArgGroup::new("outputs").required(true).multiple(false)))]
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

  /// Path to directory to write dataset files to.
  ///
  /// This flag is mutually exclusive with `--output-zip`, and provides the equivalent output, but in the form of
  /// a directory with files, instead of a compressed zip archive.
  ///
  /// If the required directory tree does not exist, it will be created.
  #[clap(long, short = 'o')]
  #[clap(value_hint = ValueHint::DirPath)]
  #[clap(group = "outputs")]
  pub output_dir: Option<PathBuf>,

  /// Path to resulting dataset zip file.
  ///
  /// This flag is mutually exclusive with `--output-dir`, and provides the equivalent output, but in the form of
  /// compressed zip archive instead of a directory with files.
  ///
  /// If the required directory tree does not exist, it will be created.
  #[clap(long, short = 'z')]
  #[clap(value_hint = ValueHint::FilePath)]
  #[clap(group = "outputs")]
  pub output_zip: Option<PathBuf>,

  #[clap(flatten)]
  pub proxy_config: ProxyConfig,
}

#[derive(Copy, Debug, Clone, PartialEq, Eq, PartialOrd, Ord, ValueEnum, EnumIter)]
pub enum NextcladeOutputSelection {
  All,
  Fasta,
  Json,
  Ndjson,
  Csv,
  Tsv,
  Tree,
  TreeNwk,
  Translations,
  Insertions,
  Errors,
}

#[derive(Parser, Debug, Clone)]
pub struct NextcladeRunInputArgs {
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
  /// Example: nextclade run -D dataset/ -O out/ seq1.fasta seq2.fasta
  #[clap(long, short = 'i', visible_alias("sequences"))]
  #[clap(value_hint = ValueHint::FilePath)]
  #[clap(hide_long_help = true, hide_short_help = true)]
  pub input_fasta: Option<PathBuf>,

  /// Path to a directory or a zip file containing a dataset.
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
  #[clap(value_hint = ValueHint::AnyPath)]
  pub input_dataset: Option<PathBuf>,

  /// Name of the dataset to download and use during the run
  ///
  /// This is a convenience shortcut to first downloading a dataset and then immediately running with it. Providing this flag is equivalent to running 2 commands: `dataset get` followed by `run`, with the difference that the dataset files from the first command are not saved to disk and cannot be reused later. The default parameters are used for the dataset (e.g. default reference name and latest version tag).
  ///
  /// See `dataset get --help` and `dataset list --help` for more details.
  ///
  /// Note that when using this flag, the dataset will be downloaded on every run. If a new version of the dataset is released between two runs, they will use different versions of the dataset and may produce different results. For the most reproducible runs, and for more control, use the usual 2-step flow with `dataset get` followed by `run`.
  ///
  /// This flag is mutually exclusive with `--input_dataset`
  #[clap(long, short = 'd')]
  pub dataset_name: Option<String>,

  /// Path to a FASTA file containing reference sequence. This file should contain exactly 1 sequence.
  ///
  /// Overrides path to `reference.fasta` in the dataset (`--input-dataset`).
  ///
  /// Supports the following compression formats: "gz", "bz2", "xz", "zstd". Use "-" to read uncompressed data from standard input (stdin).
  #[clap(long, short = 'r', visible_alias("reference"), visible_alias("input-root-seq"))]
  #[clap(value_hint = ValueHint::FilePath)]
  pub input_ref: Option<PathBuf>,

  /// Path to Auspice JSON v2 file containing reference tree.
  ///
  /// See https://nextstrain.org/docs/bioinformatics/data-formats.
  ///
  /// Overrides path to `tree.json` in the dataset (`--input-dataset`).
  ///
  /// Supports the following compression formats: "gz", "bz2", "xz", "zstd". Use "-" to read uncompressed data from standard input (stdin).
  #[clap(long, short = 'a')]
  #[clap(value_hint = ValueHint::FilePath)]
  pub input_tree: Option<PathBuf>,

  /// Path to a JSON file containing configuration of Quality Control rules.
  ///
  /// Overrides path to `qc.json` in the dataset (`--input-dataset`).
  ///
  /// Supports the following compression formats: "gz", "bz2", "xz", "zstd". Use "-" to read uncompressed data from standard input (stdin).
  #[clap(long, short = 'Q')]
  #[clap(value_hint = ValueHint::FilePath)]
  pub input_qc_config: Option<PathBuf>,

  /// Path to a JSON file containing configuration and data specific to a pathogen.
  ///
  /// Overrides path to `virus_properties.json` in the dataset (`--input-dataset`).
  ///
  /// Supports the following compression formats: "gz", "bz2", "xz", "zstd". Use "-" to read uncompressed data from standard input (stdin).
  #[clap(long, short = 'R')]
  #[clap(value_hint = ValueHint::FilePath)]
  pub input_virus_properties: Option<PathBuf>,

  /// Path to a CSV file containing a list of custom PCR primer sites. This information is used to report mutations in these sites.
  ///
  /// Overrides path to `primers.csv` in the dataset (`--input-dataset`).
  ///
  /// Supports the following compression formats: "gz", "bz2", "xz", "zstd". Use "-" to read uncompressed data from standard input (stdin).
  #[clap(long, short = 'p')]
  #[clap(value_hint = ValueHint::FilePath)]
  pub input_pcr_primers: Option<PathBuf>,

  /// Path to a .gff file containing the gene map (genome annotation).
  ///
  /// Gene map (sometimes also called 'genome annotation') is used to find coding regions. If not supplied, coding regions will
  /// not be translated, amino acid sequences will not be output, amino acid mutations will not be detected and nucleotide sequence
  /// alignment will not be informed by codon boundaries
  ///
  /// List of genes can be restricted using `--genes` flag. Otherwise all genes found in the gene map will be used.
  ///
  /// Overrides path to `genemap.gff` provided by `--input-dataset`.
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
  /// codon-aware alignment and aminoacid mutations detection. Must only contain gene names present in the gene map. If
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

  /// Use custom dataset server
  #[clap(long)]
  #[clap(value_hint = ValueHint::Url)]
  #[clap(default_value_t = Url::from_str(DATA_FULL_DOMAIN).expect("Invalid URL"))]
  pub server: Url,
}

#[allow(clippy::struct_excessive_bools)]
#[derive(Parser, Debug, Clone)]
pub struct NextcladeRunOutputArgs {
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
  /// At least one of the output flags is required: `--output-all`, `--output-fasta`, `--output-ndjson`, `--output-json`, `--output-csv`, `--output-tsv`, `--output-tree`, `--output-translations`, `--output-insertions`, `--output-errors`
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
  pub output_selection: Vec<NextcladeOutputSelection>,

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
  ///
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

  /// Path to output Newline-delimited JSON (NDJSON) results file.
  ///
  /// This file format is most suitable for further machine processing of the results. By contrast to plain json, it can be streamed line-by line, so much bigger outputs are feasible.
  ///
  /// Takes precedence over paths configured with `--output-all`, `--output-basename` and `--output-selection`.
  ///
  /// If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zstd", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).
  ///
  /// If the required directory tree does not exist, it will be created.
  #[clap(long, short = 'N')]
  #[clap(value_hint = ValueHint::AnyPath)]
  pub output_ndjson: Option<PathBuf>,

  /// Path to output JSON results file.
  ///
  /// This file format is most suitable for further machine processing of the results.
  ///
  /// Takes precedence over paths configured with `--output-all`, `--output-basename` and `--output-selection`.
  ///
  /// If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zstd", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).
  ///
  /// If the required directory tree does not exist, it will be created.
  #[clap(long, short = 'J')]
  #[clap(value_hint = ValueHint::AnyPath)]
  pub output_json: Option<PathBuf>,

  /// Path to output CSV results file (delimiter: semicolon)
  ///
  /// This file format is most suitable for human inspection as well as for limited further machine processing of the results.
  ///
  /// CSV and TSV output files are equivalent and only differ in the column delimiters.
  ///
  /// Takes precedence over paths configured with `--output-all`, `--output-basename` and `--output-selection`.
  ///
  /// If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zstd", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).
  ///
  /// If the required directory tree does not exist, it will be created.
  #[clap(long, short = 'c')]
  #[clap(value_hint = ValueHint::AnyPath)]
  pub output_csv: Option<PathBuf>,

  /// Path to output TSV results file (delimiter: tab)
  ///
  /// This file format is most suitable for human inspection as well as for limited further machine processing of the results.
  ///
  /// CSV and TSV output files are equivalent and only differ in the column delimiters.
  ///
  /// Takes precedence over paths configured with `--output-all`, `--output-basename` and `--output-selection`.
  ///
  /// If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zstd", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).
  ///
  /// If the required directory tree does not exist, it will be created.
  #[clap(long, short = 't')]
  #[clap(value_hint = ValueHint::AnyPath)]
  pub output_tsv: Option<PathBuf>,

  /// Restricts columns written into tabular output files (CSV and TSV).
  ///
  /// Should contain a comma-separated list of individual column names and/or column category names to include into both CSV and TSV outputs.
  ///
  /// If this flag is omitted, or if category 'all' is present in the list, then all other entries are ignored and all columns are written.
  ///
  /// Only valid together with one or multiple of flags: `--output-csv`, `--output-tsv`, `--output-all`.
  #[clap(
    long,
    short = 'C',
    num_args=1..,
    use_value_delimiter = true
  )]
  pub output_columns_selection: Vec<String>,

  /// Path to output phylogenetic graph with input sequences placed onto it, in Nextclade graph JSON format.
  ///
  /// Currently this format is not stable and not documented. It can change at any time without a warning. Use it at own risk.
  ///
  /// Due to format limitations, it is only feasible to construct the tree for at most a few hundred to a few thousand
  /// sequences. If the tree is not needed, omitting this flag reduces processing time and memory consumption.
  ///
  /// Takes precedence over paths configured with `--output-all`, `--output-basename` and `--output-selection`.
  ///
  /// If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zstd", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).
  ///
  /// If the required directory tree does not exist, it will be created.
  #[clap(long)]
  #[clap(value_hint = ValueHint::AnyPath)]
  pub output_graph: Option<PathBuf>,

  /// Path to output phylogenetic tree with input sequences placed onto it, in Auspice JSON V2 format.
  ///
  /// For file format description see: https://nextstrain.org/docs/bioinformatics/data-formats
  ///
  /// Due to format limitations, it is only feasible to construct the tree for at most a few hundred to a few thousand
  /// sequences. If the tree is not needed, omitting this flag reduces processing time and memory consumption.
  ///
  /// Takes precedence over paths configured with `--output-all`, `--output-basename` and `--output-selection`.
  ///
  /// If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zstd", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).
  ///
  /// If the required directory tree does not exist, it will be created.
  #[clap(long, short = 'T')]
  #[clap(value_hint = ValueHint::AnyPath)]
  pub output_tree: Option<PathBuf>,

  /// Path to output phylogenetic tree with input sequences placed onto it, in Newick format (New Hampshire tree format)
  ///
  /// For file format description see: https://en.wikipedia.org/wiki/Newick_format
  ///
  /// Takes precedence over paths configured with `--output-all`, `--output-basename` and `--output-selection`.
  ///
  /// If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zstd", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).
  ///
  /// If the required directory tree does not exist, it will be created.
  #[clap(long)]
  #[clap(value_hint = ValueHint::AnyPath)]
  pub output_tree_nwk: Option<PathBuf>,

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

  /// Whether to include the list of nearest nodes to the outputs
  #[clap(long)]
  pub include_nearest_node_info: bool,

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
  /// By default, the sequences containing unknown nucleotide characters are skipped with a warning - they
  /// are not analyzed and not included into results. If this flag is provided, then before the alignment,
  /// all unknown characters are replaced with 'N'. This replacement allows to analyze these sequences.
  ///
  /// The following characters are considered known:  '-', 'A', 'B', 'C', 'D', 'G', 'H', 'K', 'M', 'N', 'R', 'S', 'T', 'V', 'W', 'Y'
  #[clap(long)]
  pub replace_unknown: bool,
}

#[derive(Parser, Debug, Clone)]
pub struct NextcladeRunOtherArgs {
  /// Number of processing jobs. If not specified, all available CPU threads will be used.
  #[clap(global = false, long, short = 'j', default_value_t = num_cpus::get())]
  pub jobs: usize,
}

#[derive(Parser, Debug, Clone)]
pub struct NextcladeRunArgs {
  #[clap(flatten, next_help_heading = "  Inputs")]
  pub inputs: NextcladeRunInputArgs,

  #[clap(flatten, next_help_heading = "  Outputs")]
  pub outputs: NextcladeRunOutputArgs,

  #[clap(flatten, next_help_heading = "  Phylogenetic tree parameters")]
  pub tree_builder_params: TreeBuilderParamsOptional,

  #[clap(flatten, next_help_heading = "  Alignment parameters")]
  pub alignment_params: AlignPairwiseParamsOptional,

  #[clap(flatten, next_help_heading = "  Other")]
  pub other: NextcladeRunOtherArgs,
}

fn generate_completions(shell: &str) -> Result<(), Report> {
  let mut command = NextcladeArgs::command();

  if shell.to_lowercase() == "fig" {
    generate(Fig, &mut command, "nextclade", &mut io::stdout());
    return Ok(());
  }

  let generator = <Shell as ValueEnum>::from_str(&shell.to_lowercase(), true)
    .map_err(|err| eyre!("{}: Possible values: {}", err, SHELLS.join(", ")))?;

  let bin_name = command.get_name().to_owned();

  generate(generator, &mut command, bin_name, &mut io::stdout());

  Ok(())
}

/// Get output filenames provided by user or, if not provided, create filenames based on input fasta
pub fn nextclade_get_output_filenames(run_args: &mut NextcladeRunArgs) -> Result<(), Report> {
  let NextcladeRunArgs {
    outputs:
      NextcladeRunOutputArgs {
        output_all,
        output_basename,
        output_selection,
        output_fasta,
        output_translations,
        output_ndjson,
        output_json,
        output_csv,
        output_tsv,
        output_tree,
        output_tree_nwk,
        output_insertions,
        output_errors,
        ..
      },
    ..
  } = run_args;

  // If `--output-all` is provided, then we need to deduce default output filenames,
  // while taking care to preserve values of any individual `--output-*` flags,
  // as well as to honor restrictions put by the `--output-selection` flag, if provided.
  if let Some(output_all) = output_all {
    let output_basename = output_basename.clone().unwrap_or_else(|| "nextclade".to_owned());

    let default_output_file_path = output_all.join(&output_basename);

    // If `--output-selection` is empty or contains `all`, then fill it with all possible variants
    if output_selection.is_empty() || output_selection.contains(&NextcladeOutputSelection::All) {
      *output_selection = NextcladeOutputSelection::iter().collect_vec();
    }

    // We use `Option::get_or_insert()` mutable method here in order
    // to set default output filenames only if they are not provided.

    if output_selection.contains(&NextcladeOutputSelection::Fasta) {
      output_fasta.get_or_insert(add_extension(&default_output_file_path, "aligned.fasta"));
    }

    if output_selection.contains(&NextcladeOutputSelection::Insertions) {
      output_insertions.get_or_insert(add_extension(&default_output_file_path, "insertions.csv"));
    }

    if output_selection.contains(&NextcladeOutputSelection::Errors) {
      output_errors.get_or_insert(add_extension(&default_output_file_path, "errors.csv"));
    }

    if output_selection.contains(&NextcladeOutputSelection::Translations) {
      let output_translations_path =
        default_output_file_path.with_file_name(format!("{output_basename}_gene_{{gene}}"));
      let output_translations_path = add_extension(output_translations_path, "translation.fasta");

      let output_translations_template = output_translations_path
        .to_str()
        .wrap_err_with(|| format!("When converting path to string: '{output_translations_path:?}'"))?
        .to_owned();

      output_translations.get_or_insert(output_translations_template);
    }

    if output_selection.contains(&NextcladeOutputSelection::Ndjson) {
      output_ndjson.get_or_insert(add_extension(&default_output_file_path, "ndjson"));
    }

    if output_selection.contains(&NextcladeOutputSelection::Json) {
      output_json.get_or_insert(add_extension(&default_output_file_path, "json"));
    }

    if output_selection.contains(&NextcladeOutputSelection::Csv) {
      output_csv.get_or_insert(add_extension(&default_output_file_path, "csv"));
    }

    if output_selection.contains(&NextcladeOutputSelection::Tsv) {
      output_tsv.get_or_insert(add_extension(&default_output_file_path, "tsv"));
    }

    if output_selection.contains(&NextcladeOutputSelection::Tree) {
      output_tree.get_or_insert(add_extension(&default_output_file_path, "auspice.json"));
    }

    if output_selection.contains(&NextcladeOutputSelection::TreeNwk) {
      output_tree_nwk.get_or_insert(add_extension(&default_output_file_path, "nwk"));
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

  let all_outputs_are_missing = [
    output_all,
    output_fasta,
    output_ndjson,
    output_json,
    output_csv,
    output_tsv,
    output_tree,
    output_insertions,
    output_errors,
  ]
  .iter()
  .all(|o| o.is_none())
    && output_translations.is_none();

  if all_outputs_are_missing {
    return make_error!(
      r#"No output flags provided.

At least one of the following flags is required:
  --output-all
  --output-fasta
  --output-ndjson
  --output-json
  --output-csv
  --output-tsv
  --output-tree
  --output-translations
  --output-insertions
  --output-errors"#
    );
  }

  Ok(())
}

const ERROR_MSG_INPUT_FASTA_REMOVED: &str = r#"The argument `--input-fasta` (alias: `--sequences`, `-i`) is removed in favor of positional arguments.

Try:

  nextclade run -D dataset/ -O out/ seq1.fasta seq2.fasta

                                        ^          ^
                               one or multiple positional arguments
                                 with paths to input fasta files

When positional arguments are not provided, nextclade will read input fasta from standard input.

For more information, type:

  nextclade run --help"#;

const ERROR_MSG_OUTPUT_DIR_REMOVED: &str = r#"The argument `--output-dir` is removed in favor of `--output-all`.

When provided, `--output-all` allows to write all possible outputs into a directory.

The defaut base name of the files can be overriden with `--output-basename` argument.

The set of output files can be restricted with `--output-selection` argument.

For more information, type

  nextclade run --help"#;

pub fn nextclade_check_removed_args(run_args: &NextcladeRunArgs) -> Result<(), Report> {
  if run_args.inputs.input_fasta.is_some() {
    return make_error!("{ERROR_MSG_INPUT_FASTA_REMOVED}");
  }

  if run_args.outputs.output_dir.is_some() {
    return make_error!("{ERROR_MSG_OUTPUT_DIR_REMOVED}");
  }

  Ok(())
}

pub fn nextclade_check_column_config_args(run_args: &NextcladeRunArgs) -> Result<(), Report> {
  let NextcladeRunOutputArgs {
    output_all,
    output_csv,
    output_tsv,
    output_columns_selection,
    ..
  } = &run_args.outputs;

  if !output_columns_selection.is_empty() && [output_all, output_csv, output_tsv].iter().all(|arg| arg.is_none()) {
    return make_error!("The `--output-columns-selection` argument configures column-based output formats and can only be used when one or more of the column-based file outputs is requested, i.e. together with one or multiple of `--output-all`, `--output-csv`, `--output-tsv`.");
  }

  Ok(())
}

pub fn nextclade_parse_cli_args() -> Result<(), Report> {
  let args = NextcladeArgs::parse();

  setup_logger(args.verbosity.get_filter_level());

  match args.command {
    NextcladeCommands::Completions { shell } => {
      generate_completions(&shell).wrap_err_with(|| format!("When generating completions for shell '{shell}'"))
    }
    NextcladeCommands::Run(mut run_args) => {
      nextclade_check_removed_args(&run_args)?;
      nextclade_check_column_config_args(&run_args)?;
      nextclade_get_output_filenames(&mut run_args).wrap_err("When deducing output filenames")?;
      nextclade_run(*run_args)
    }
    NextcladeCommands::Dataset(dataset_command) => match dataset_command.command {
      NextcladeDatasetCommands::List(dataset_list_args) => nextclade_dataset_list(dataset_list_args),
      NextcladeDatasetCommands::Get(dataset_get_args) => nextclade_dataset_get(&dataset_get_args),
    },
  }
}
