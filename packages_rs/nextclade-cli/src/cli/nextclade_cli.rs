use crate::cli::nextclade_dataset_get::nextclade_dataset_get;
use crate::cli::nextclade_dataset_list::nextclade_dataset_list;
use crate::cli::nextclade_loop::nextclade_run;
use crate::cli::nextclade_read_annotation::nextclade_read_annotation;
use crate::cli::nextclade_seq_sort::nextclade_seq_sort;
use crate::cli::print_help_markdown::print_help_markdown;
use crate::cli::verbosity::{Verbosity, WarnLevel};
use crate::io::http_client::ProxyConfig;
use clap::builder::styling;
use clap::{ArgGroup, CommandFactory, Parser, Subcommand, ValueEnum, ValueHint};
use clap_complete::{generate, Generator, Shell};
use clap_complete_fig::Fig;
use eyre::{eyre, ContextCompat, Report, WrapErr};
use itertools::Itertools;
use lazy_static::lazy_static;
use nextclade::io::fs::add_extension;
use nextclade::run::params::NextcladeInputParamsOptional;
use nextclade::sort::params::NextcladeSeqSortParams;
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

fn styles() -> styling::Styles {
  styling::Styles::styled()
    .header(styling::AnsiColor::Green.on_default() | styling::Effects::BOLD)
    .usage(styling::AnsiColor::Green.on_default() | styling::Effects::BOLD)
    .literal(styling::AnsiColor::Blue.on_default() | styling::Effects::BOLD)
    .placeholder(styling::AnsiColor::Cyan.on_default())
}

#[derive(Parser, Debug)]
#[clap(name = "nextclade")]
#[clap(author, version)]
#[clap(verbatim_doc_comment)]
#[clap(styles = styles())]
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
  #[clap(flatten, next_help_heading = "Verbosity")]
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
    #[clap(value_name = "SHELL", default_value_t = String::from("bash"), value_parser = SHELLS.clone())]
    shell: String,
  },

  /// Run sequence analysis: alignment, mutation calling, clade assignment, quality checks and phylogenetic placement
  ///
  /// For short help type: `nextclade -h`, for extended help type: `nextclade --help`. Each subcommand has its own help, for example: `nextclade run --help`.
  Run(Box<NextcladeRunArgs>),

  /// List and download available Nextclade datasets (pathogens)
  ///
  /// For short help type: `nextclade -h`, for extended help type: `nextclade --help`. Each subcommand has its own help, for example: `nextclade dataset --help`.
  Dataset(Box<NextcladeDatasetArgs>),

  /// Sort sequences according to the inferred Nextclade dataset (pathogen)
  ///
  /// For short help type: `nextclade -h`, for extended help type: `nextclade --help`. Each subcommand has its own help, for example: `nextclade sort --help`.
  Sort(Box<NextcladeSortArgs>),

  /// Read genome annotation and present it in Nextclade's internal formats. This is mostly only useful for Nextclade maintainers and the most curious users. Note that these internal formats have no stability guarantees and can be changed at any time without notice.
  ///
  /// For short help type: `nextclade -h`, for extended help type: `nextclade --help`. Each subcommand has its own help, for example: `nextclade sort --help`.
  ReadAnnotation(Box<NextcladeReadAnnotationArgs>),

  /// Print command-line reference documentation in Markdown format
  HelpMarkdown,
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

#[allow(clippy::struct_excessive_bools)]
#[derive(Parser, Debug)]
#[clap(verbatim_doc_comment)]
pub struct NextcladeDatasetListArgs {
  /// Restrict list to datasets with this *exact* name.
  ///
  /// Can be used to test if a dataset exists.
  ///
  /// Mutually exclusive with --search
  #[clap(long, short = 'n', group = "searching")]
  #[clap(value_hint = ValueHint::Other)]
  pub name: Option<String>,

  /// Search datasets by name or by reference.
  ///
  /// Will only display datasets containing this substring in their name (path), or either of attributes: "name", "reference name", "reference accession".
  ///
  /// Mutually exclusive with --name
  #[clap(long, short = 's', group = "searching")]
  #[clap(value_hint = ValueHint::Other)]
  pub search: Option<String>,

  /// Restrict list to datasets with this exact version tag.
  #[clap(long, short = 't')]
  #[clap(value_hint = ValueHint::Other)]
  pub tag: Option<String>,

  /// Include dataset versions that are incompatible with this version of Nextclade CLI.
  #[clap(long)]
  pub include_incompatible: bool,

  /// Include deprecated datasets.
  ///
  /// Authors can mark a dataset as deprecated to express that the dataset will no longer be updated and/or supported. Reach out to dataset authors for concrete details.
  #[clap(long)]
  pub include_deprecated: bool,

  /// Exclude experimental datasets.
  ///
  /// Authors can mark a dataset as experimental when development of the dataset is still in progress, or if the dataset is incomplete or of lower quality than usual. Use at own risk. Reach out to dataset authors if interested in further development and stabilizing of a particular dataset, and consider contributing.
  #[clap(long)]
  pub no_experimental: bool,

  /// Exclude community datasets and only show official datasets.
  ///
  /// Community datasets are the datasets provided by the members of the broader Nextclade community. These datasets may vary in quality and completeness. Depending on authors' goals, these datasets may be created for specific purposes, rather than for general use. Nextclade team is unable to verify correctness of these datasets and does not provide support for them. For all questions regarding a concrete community dataset, please read its documentation and reach out to its authors.
  #[clap(long)]
  pub no_community: bool,

  /// Print output in JSON format.
  ///
  /// This is useful for automated processing. However, at this time, we cannot guarantee stability of the format. Use at own risk.
  #[clap(long)]
  pub json: bool,

  /// Print only names of the datasets, without any other details.
  #[clap(long)]
  pub only_names: bool,

  /// Use custom dataset server.
  ///
  /// You can host your own dataset server, with one or more datasets, grouped into dataset collections, and use this server to provide datasets to users of Nextclade CLI and Nextclade Web. Refer to Nextclade dataset documentation for more details.
  #[clap(long)]
  #[clap(value_hint = ValueHint::Url)]
  #[clap(default_value_t = Url::from_str(DATA_FULL_DOMAIN).expect("Invalid URL"))]
  pub server: Url,

  #[clap(flatten)]
  pub proxy_config: ProxyConfig,

  // Deprecated args
  /// REMOVED
  #[clap(long, short = 'r')]
  #[clap(hide_long_help = true, hide_short_help = true)]
  pub reference: Option<String>,

  /// REMOVED
  #[clap(long, short = 'a')]
  #[clap(hide_long_help = true, hide_short_help = true)]
  pub attribute: Vec<String>,

  /// REMOVED
  #[clap(long)]
  #[clap(hide_long_help = true, hide_short_help = true)]
  pub include_old: bool,
}

#[derive(Parser, Debug)]
#[clap(verbatim_doc_comment)]
#[clap(group(ArgGroup::new("outputs").required(true).multiple(false)))]
pub struct NextcladeDatasetGetArgs {
  /// Name of the dataset to download. Type `nextclade dataset list` to view available datasets.
  #[clap(long, short = 'n')]
  #[clap(value_hint = ValueHint::Other)]
  pub name: String,

  /// Version tag of the dataset to download.
  ///
  /// If this flag is not provided the latest version is downloaded.
  #[clap(long, short = 't')]
  #[clap(value_hint = ValueHint::Other)]
  pub tag: Option<String>,

  /// Use custom dataset server.
  ///
  /// You can host your own dataset server, with one or more datasets, grouped into dataset collections, and use this server to provide datasets to users of Nextclade CLI and Nextclade Web. Refer to Nextclade dataset documentation for more details.
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

  // Deprecated arguments
  /// REMOVED
  #[clap(long, short = 'r')]
  #[clap(hide_long_help = true, hide_short_help = true)]
  pub reference: Option<String>,

  /// REMOVED
  #[clap(long, short = 'a')]
  #[clap(hide_long_help = true, hide_short_help = true)]
  pub attribute: Vec<String>,
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
}

#[derive(Parser, Debug, Clone)]
pub struct NextcladeRunInputArgs {
  /// Path to one or multiple FASTA files with input sequences
  ///
  /// Supports the following compression formats: "gz", "bz2", "xz", "zst". If no files provided, the plain fasta input is read from standard input (stdin).
  ///
  /// See: https://en.wikipedia.org/wiki/FASTA_format
  #[clap(value_hint = ValueHint::FilePath)]
  #[clap(display_order = 0)]
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
  /// If this flag is not provided, no dataset will be loaded and individual input files have to be provided instead. In this case  `--input-ref` is required and `--input-annotation, `--input-tree` and `--input-pathogen-json` are optional.
  ///
  /// If both the `--input-dataset` and individual `--input-*` flags are provided, each individual flag overrides the
  /// corresponding file in the dataset.
  ///
  /// Please refer to Nextclade documentation for more details about Nextclade datasets and their files.
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
  /// Supports the following compression formats: "gz", "bz2", "xz", "zst". Use "-" to read uncompressed data from standard input (stdin).
  #[clap(long, short = 'r')]
  #[clap(value_hint = ValueHint::FilePath)]
  pub input_ref: Option<PathBuf>,

  /// Path to Auspice JSON v2 file containing reference tree.
  ///
  /// See https://nextstrain.org/docs/bioinformatics/data-formats.
  ///
  /// Overrides path to `tree.json` in the dataset (`--input-dataset`).
  ///
  /// Supports the following compression formats: "gz", "bz2", "xz", "zst". Use "-" to read uncompressed data from standard input (stdin).
  #[clap(long, short = 'a')]
  #[clap(value_hint = ValueHint::FilePath)]
  pub input_tree: Option<PathBuf>,

  /// Path to a JSON file containing configuration and data specific to a pathogen.
  ///
  /// Overrides path to `pathogen.json` in the dataset (`--input-dataset`).
  ///
  /// Supports the following compression formats: "gz", "bz2", "xz", "zst". Use "-" to read uncompressed data from standard input (stdin).
  #[clap(long, short = 'p')]
  #[clap(value_hint = ValueHint::FilePath)]
  pub input_pathogen_json: Option<PathBuf>,

  /// Path to a file containing genome annotation in GFF3 format.
  ///
  /// Genome annotation is used to find coding regions. If not supplied, coding regions will
  /// not be translated, amino acid sequences will not be output, amino acid mutations will not be detected and nucleotide sequence alignment will not be informed by codon boundaries.
  ///
  /// List of CDSes can be restricted using `--cds-selection` argument. Otherwise, all CDSes found in the genome annotation will be used.
  ///
  /// Overrides genome annotation provided by the dataset (`--input-dataset` or `--dataset-name`).
  ///
  /// Learn more about Generic Feature Format Version 3 (GFF3):
  /// https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md
  ///
  /// Supports the following compression formats: "gz", "bz2", "xz", "zst". Use "-" to read uncompressed data from standard input (stdin).
  #[clap(long, short = 'm')]
  #[clap(value_hint = ValueHint::FilePath)]
  pub input_annotation: Option<PathBuf>,

  /// Comma-separated list of names of coding sequences (CDSes) to use.
  ///
  /// This defines which peptides will be written into outputs, and which CDS will be taken into account during
  /// codon-aware alignment and aminoacid mutations detection. Must only contain CDS names present in the genome annotation.
  ///
  /// If this flag is not supplied or its value is an empty string, then all CDSes found in the genome annotation will be used.
  #[clap(
    long,
    short = 'g',
    num_args=1..,
    use_value_delimiter = true
  )]
  #[clap(value_hint = ValueHint::FilePath)]
  pub cds_selection: Option<Vec<String>>,

  /// Use custom dataset server
  #[clap(long)]
  #[clap(value_hint = ValueHint::Url)]
  #[clap(default_value_t = Url::from_str(DATA_FULL_DOMAIN).expect("Invalid URL"))]
  pub server: Url,

  // Deprecated arguments. Kept in oder to detect usage and print error messages.
  /// REMOVED. Use --input-ref instead
  #[clap(long)]
  #[clap(hide_long_help = true, hide_short_help = true)]
  pub input_root_seq: Option<String>,

  /// REMOVED. Use --input-ref instead
  #[clap(long)]
  #[clap(hide_long_help = true, hide_short_help = true)]
  pub reference: Option<String>,

  /// REMOVED. The qc.json file have been merged into pathogen.json, see `--input-pathogen-json`
  #[clap(long, short = 'Q')]
  #[clap(hide_long_help = true, hide_short_help = true)]
  pub input_qc_config: Option<String>,

  /// REMOVED. The virus_properties.json file have been merged into pathogen.json, see `--input-pathogen-json`
  #[clap(long, short = 'R')]
  #[clap(hide_long_help = true, hide_short_help = true)]
  pub input_virus_properties: Option<String>,

  /// REMOVED. The pcr_primers.csv file have been merged into pathogen.json, see `--input-pathogen-json`
  #[clap(long)]
  #[clap(hide_long_help = true, hide_short_help = true)]
  pub input_pcr_primers: Option<String>,

  /// RENAMED to `--input-annotation`
  #[clap(long)]
  #[clap(hide_long_help = true, hide_short_help = true)]
  pub input_gene_map: Option<String>,

  /// RENAMED to `--input-annotation`
  #[clap(long)]
  #[clap(hide_long_help = true, hide_short_help = true)]
  pub genemap: Option<String>,

  /// REMOVED in favor of `--cds-selection`
  #[clap(long)]
  #[clap(hide_long_help = true, hide_short_help = true)]
  pub genes: Option<Vec<String>>,
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
  /// At least one of the output flags is required: `--output-all`, `--output-fasta`, `--output-ndjson`, `--output-json`, `--output-csv`, `--output-tsv`, `--output-tree`, `--output-translations`.
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
  /// If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zst", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).
  ///
  /// If the required directory tree does not exist, it will be created.
  #[clap(long, short = 'o')]
  #[clap(value_hint = ValueHint::AnyPath)]
  pub output_fasta: Option<PathBuf>,

  /// Template string for path to output fasta files containing translated and aligned peptides. A separate file will be generated for every gene.
  ///
  /// The string should contain template variable `{cds}`, where the gene name will be substituted.
  /// Make sure you properly quote and/or escape the curly braces, so that your shell, programming language or pipeline manager does not attempt to substitute the variables.
  ///
  /// Takes precedence over paths configured with `--output-all`, `--output-basename` and `--output-selection`.
  ///
  /// If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zst", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).
  ///
  /// If the required directory tree does not exist, it will be created.
  ///
  /// Example for bash shell:
  ///
  ///   --output-translations='output_dir/nextclade.cds_translation.{cds}.fasta'
  #[clap(long, short = 'P')]
  #[clap(value_hint = ValueHint::AnyPath)]
  pub output_translations: Option<String>,

  /// Path to output Newline-delimited JSON (NDJSON) results file.
  ///
  /// This file format is most suitable for further machine processing of the results. By contrast to plain json, it can be streamed line-by line, so much bigger outputs are feasible.
  ///
  /// Takes precedence over paths configured with `--output-all`, `--output-basename` and `--output-selection`.
  ///
  /// If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zst", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).
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
  /// If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zst", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).
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
  /// If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zst", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).
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
  /// If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zst", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).
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
  /// If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zst", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).
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
  /// If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zst", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).
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
  /// If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zst", then the file will be written compressed. Use "-" to write the uncompressed to standard output (stdout).
  ///
  /// If the required directory tree does not exist, it will be created.
  #[clap(long)]
  #[clap(value_hint = ValueHint::AnyPath)]
  pub output_tree_nwk: Option<PathBuf>,

  /// REMOVED. The argument `--output-insertions` have been removed in favor of `--output-csv` and `--output-tsv`.
  #[clap(long, short = 'I')]
  #[clap(value_hint = ValueHint::AnyPath)]
  #[clap(hide_long_help = true, hide_short_help = true)]
  pub output_insertions: Option<PathBuf>,

  /// REMOVED. The argument `--output-errors` have been removed in favor of `--output-csv` and `--output-tsv`.
  #[clap(long, short = 'e')]
  #[clap(value_hint = ValueHint::AnyPath)]
  #[clap(hide_long_help = true, hide_short_help = true)]
  pub output_errors: Option<PathBuf>,
}

#[derive(Parser, Debug, Clone)]
pub struct NextcladeRunOtherParams {
  /// Number of processing jobs. If not specified, all available CPU threads will be used.
  #[clap(global = false, long, short = 'j', default_value_t = num_cpus::get())]
  pub jobs: usize,
}

#[derive(Parser, Debug, Clone)]
pub struct NextcladeRunArgs {
  #[clap(flatten, next_help_heading = "Inputs")]
  pub inputs: NextcladeRunInputArgs,

  #[clap(flatten, next_help_heading = "Outputs")]
  pub outputs: NextcladeRunOutputArgs,

  #[clap(flatten)]
  pub params: NextcladeInputParamsOptional,

  #[clap(flatten, next_help_heading = "Other")]
  pub other_params: NextcladeRunOtherParams,
}

#[allow(clippy::struct_excessive_bools)]
#[derive(Parser, Debug)]
#[clap(verbatim_doc_comment)]
pub struct NextcladeSortArgs {
  /// Path to one or multiple FASTA files with input sequences
  ///
  /// Supports the following compression formats: "gz", "bz2", "xz", "zst". If no files provided, the plain fasta input is read from standard input (stdin).
  ///
  /// See: https://en.wikipedia.org/wiki/FASTA_format
  #[clap(value_hint = ValueHint::FilePath)]
  pub input_fastas: Vec<PathBuf>,

  /// Path to input minimizer index JSON file.
  ///
  /// By default, the latest reference minimizer index is fetched from the dataset server (default or customized with `--server` argument). If this argument is provided, the algorithm skips fetching the default index and uses the index provided in the JSON file.
  ///
  /// Supports the following compression formats: "gz", "bz2", "xz", "zst". Use "-" to read uncompressed data from standard input (stdin).
  #[clap(long, short = 'm')]
  #[clap(value_hint = ValueHint::FilePath)]
  pub input_minimizer_index_json: Option<PathBuf>,

  /// Path to output directory
  ///
  /// Sequences will be written in subdirectories: one subdirectory per dataset. Sequences inferred to be belonging to a particular dataset will be placed in the corresponding subdirectory. The subdirectory tree can be nested, depending on how dataset names are organized - dataset names can contain slashes, and they will be treated as path segment delimiters.
  ///
  /// If the required directory tree does not exist, it will be created.
  ///
  /// Mutually exclusive with `--output-path`.
  ///
  #[clap(short = 'O', long)]
  #[clap(value_hint = ValueHint::DirPath)]
  #[clap(group = "outputs")]
  pub output_dir: Option<PathBuf>,

  /// Template string for the file path to output sorted sequences. A separate file will be generated per dataset.
  ///
  /// The string should contain template variable `{name}`, where the dataset name will be substituted. Note that if the `{name}` variable contains slashes, they will be interpreted as path segments and subdirectories will be created.
  ///
  /// Make sure you properly quote and/or escape the curly braces, so that your shell, programming language or pipeline manager does not attempt to substitute the variables.
  ///
  /// Mutually exclusive with `--output-dir`.
  ///
  /// If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zst", then the file will be written compressed. If the required directory tree does not exist, it will be created.
  ///
  /// Example for bash shell:
  ///
  ///   --output='outputs/{name}/sorted.fasta.gz'
  #[clap(short = 'o', long)]
  #[clap(group = "outputs")]
  pub output_path: Option<String>,

  /// Path to output results TSV file
  ///
  /// If the provided file path ends with one of the supported extensions: "gz", "bz2", "xz", "zst", then the file will be written compressed. Use "-" to write uncompressed to standard output (stdout). If the required directory tree does not exist, it will be created.
  #[clap(short = 'r', long)]
  #[clap(value_hint = ValueHint::FilePath)]
  pub output_results_tsv: Option<String>,

  #[clap(flatten, next_help_heading = "Algorithm")]
  pub search_params: NextcladeSeqSortParams,

  #[clap(flatten, next_help_heading = "Other")]
  pub other_params: NextcladeRunOtherParams,

  /// Use custom dataset server.
  ///
  /// You can host your own dataset server, with one or more datasets, grouped into dataset collections, and use this server to provide datasets to users of Nextclade CLI and Nextclade Web. Refer to Nextclade dataset documentation for more details.
  #[clap(long)]
  #[clap(value_hint = ValueHint::Url)]
  #[clap(default_value_t = Url::from_str(DATA_FULL_DOMAIN).expect("Invalid URL"))]
  pub server: Url,

  #[clap(flatten)]
  pub proxy_config: ProxyConfig,
}

#[allow(clippy::struct_excessive_bools)]
#[derive(Parser, Debug)]
#[clap(verbatim_doc_comment)]
pub struct NextcladeReadAnnotationArgs {
  /// Genome annotation file in GFF3 format.
  ///
  /// Learn more about Generic Feature Format Version 3 (GFF3):
  /// https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md
  ///
  #[clap(value_hint = ValueHint::FilePath)]
  #[clap(display_order = 0)]
  pub input_annotation: Option<PathBuf>,

  /// Path to output JSON or YAML file.
  ///
  /// The format is chosen based on file extension: ".json" or ".yaml".
  #[clap(long, short = 'o')]
  #[clap(value_hint = ValueHint::DirPath)]
  pub output: Option<PathBuf>,

  /// Present features in "feature tree" format. This format is a precursor of genome annotation format - it contains all genetic features, even the ones that Nextclade does not use, but also less information about each feature.
  #[clap(long)]
  pub feature_tree: bool,

  /// Print console output in JSON format, rather than human-readable table.
  #[clap(long)]
  pub json: bool,
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

    if output_selection.contains(&NextcladeOutputSelection::Translations) {
      let output_translations_path =
        default_output_file_path.with_file_name(format!("{output_basename}.cds_translation.{{cds}}"));
      let output_translations_path = add_extension(output_translations_path, "fasta");

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
    if !output_translations.contains("{cds}") {
      return make_error!(
        r#"
Expected `--output-translations` argument to contain a template string containing template variable {{cds}} (with curly braces), but received:

  {output_translations}

Make sure the variable is not substituted by your shell, programming language or workflow manager. Apply proper escaping as needed.
Example for bash shell:

  --output-translations='output_dir/nextclade.cds_translation.{{cds}}.fasta'

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
  --output-translations"#
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

When positional arguments are not provided, nextclade will read input fasta from standard input."#;

const ERROR_MSG_INPUT_ROOT_SEQ_REMOVED: &str =
  r#"The argument `--input-root-seq` (alias `--reference`) is removed in favor of `--input-ref`."#;

const ERROR_MSG_INPUT_GENE_MAP_RENAMED: &str =
  r#"The argument `--input-gene-map` (alias `--genemap`) is renamed to `--input-annotation`."#;

const ERROR_MSG_GENES_RENAMED: &str = r#"The argument `--genes` is removed in favor of `--cds-selection`.

Nextclade now relies on features of type "CDS" rather than "gene" in genome annotation. Please take a note of CDS features in the genome annotation file and use `--cds-selection` argument to select CDS features you want Nextclade to take into account during the analysis. Alternatively, remove the argument to analyze all CDS features present in genome annotation.
"#;

const ERROR_MSG_OUTPUT_DIR_REMOVED: &str = r#"The argument `--output-dir` is removed in favor of `--output-all`.

When provided, `--output-all` allows to write all possible outputs into a directory.

The defaut base name of the files can be overriden with `--output-basename` argument.

The set of output files can be restricted with `--output-selection` argument."#;

const ERROR_MSG_INPUT_VIRUS_PROPERTIES_REMOVED: &str = r#"The argument `--input-virus-properties` (alias `-R`) is removed in favor of `--input-pathogen-json`.

Since version 3 Nextclade uses single file `pathogen.json` rather than a set of files `qc.json`, `primers.csv`, `virus_properties.json` and `tag.json` used in Nextclade v2."#;

const ERROR_MSG_INPUT_QC_CONFIG_REMOVED: &str = r#"The argument `--input-qc-config` (alias `-Q`) is removed in favor of `--input-pathogen-json`.

Since version 3 Nextclade uses single file `pathogen.json` rather than a set of files `qc.json`, `primers.csv`, `virus_properties.json` and `tag.json` used in Nextclade v2."#;

const ERROR_MSG_INPUT_PCR_PRIMERS_REMOVED: &str = r#"The argument `--input-pcr-primers` (alias `-p`) is removed in favor of `--input-pathogen-json`.

Since version 3 Nextclade uses single file `pathogen.json` rather than a set of files `qc.json`, `primers.csv`, `virus_properties.json` and `tag.json` used in Nextclade v2."#;

const ERROR_MSG_OUTPUT_INSERTIONS_REMOVED: &str = r#"The argument `--output-insertions` have been removed in favor of `--output-csv` and `--output-tsv`.

In Nextclade v3 the separate arguments `--output-insertions` and `--output-errors` are removed. Please use `--output-csv` (for semicolon-separated table) and `--output-tsv` (for tab-separated table) arguments instead. These tables contain, among others, all the columns from the output insertions table (`--output-insertions`) as well as from the output errors table (`--output-errors`)."#;

const ERROR_MSG_OUTPUT_ERRORS_REMOVED: &str = r#"The argument `--output-errors` have been removed in favor of `--output-csv` and `--output-tsv`.

In Nextclade v3 the separate arguments `--output-insertions` and `--output-errors` are removed. Please use `--output-csv` (for semicolon-separated table) and `--output-tsv` (for tab-separated table) arguments instead. These tables contain, among others, all the columns from the output insertions table (`--output-insertions`) as well as from the output errors table (`--output-errors`)."#;

const MSG_READ_RUN_DOCS: &str = r#"

For more information, type

  nextclade run --help

Read Nextclade documentation at:

  https://docs.nextstrain.org/projects/nextclade/en/stable"#;

pub fn nextclade_check_removed_args(run_args: &NextcladeRunArgs) -> Result<(), Report> {
  if run_args.inputs.input_fasta.is_some() {
    return make_error!("{ERROR_MSG_INPUT_FASTA_REMOVED}{MSG_READ_RUN_DOCS}");
  }

  if run_args.inputs.input_root_seq.is_some() || run_args.inputs.reference.is_some() {
    return make_error!("{ERROR_MSG_INPUT_ROOT_SEQ_REMOVED}{MSG_READ_RUN_DOCS}");
  }

  if run_args.inputs.input_gene_map.is_some() || run_args.inputs.genemap.is_some() {
    return make_error!("{ERROR_MSG_INPUT_GENE_MAP_RENAMED}{MSG_READ_RUN_DOCS}");
  }

  if run_args.inputs.input_virus_properties.is_some() {
    return make_error!("{ERROR_MSG_INPUT_VIRUS_PROPERTIES_REMOVED}{MSG_READ_RUN_DOCS}");
  }

  if run_args.inputs.input_qc_config.is_some() {
    return make_error!("{ERROR_MSG_INPUT_QC_CONFIG_REMOVED}{MSG_READ_RUN_DOCS}");
  }

  if run_args.inputs.input_pcr_primers.is_some() {
    return make_error!("{ERROR_MSG_INPUT_PCR_PRIMERS_REMOVED}{MSG_READ_RUN_DOCS}");
  }

  if run_args.inputs.genes.is_some() {
    return make_error!("{ERROR_MSG_GENES_RENAMED}{MSG_READ_RUN_DOCS}");
  }

  if run_args.outputs.output_dir.is_some() {
    return make_error!("{ERROR_MSG_OUTPUT_DIR_REMOVED}{MSG_READ_RUN_DOCS}");
  }

  if run_args.outputs.output_insertions.is_some() {
    return make_error!("{ERROR_MSG_OUTPUT_INSERTIONS_REMOVED}{MSG_READ_RUN_DOCS}");
  }

  if run_args.outputs.output_errors.is_some() {
    return make_error!("{ERROR_MSG_OUTPUT_ERRORS_REMOVED}{MSG_READ_RUN_DOCS}");
  }

  Ok(())
}

const MSG_DATASET_NAMING_CHANGE: &str = r#"

Nextclade datasets are now identified only by their name (`--name`) and, optionally, a version tag (`--tag`). All other attributes are now included into the name.

In order to list all dataset names, type:

  nextclade dataset list --names-only"#;

const MSG_READ_DATASET_LIST_DOCS: &str = r#"

For more information, type

  nextclade dataset list --help

Read Nextclade documentation at:

  https://docs.nextstrain.org/projects/nextclade/en/stable"#;

fn nextclade_check_removed_dataset_list_args(args: &NextcladeDatasetListArgs) -> Result<(), Report> {
  if args.reference.is_some() {
    return make_error!(
      "The argument `--reference` (alias `-r`) is removed.{MSG_DATASET_NAMING_CHANGE}{MSG_READ_DATASET_LIST_DOCS}"
    );
  }

  if !args.attribute.is_empty() {
    return make_error!(
      "The argument `--attribute` (alias `-a`) is removed.{MSG_DATASET_NAMING_CHANGE}{MSG_READ_DATASET_LIST_DOCS}"
    );
  }

  if args.include_old {
    return make_error!(
      "The argument `--include-old` is removed. All versions are always shown now. {MSG_READ_DATASET_LIST_DOCS}"
    );
  }

  Ok(())
}

const MSG_READ_DATASET_GET_DOCS: &str = r#"

For more information, type

  nextclade dataset get --help

Read Nextclade documentation at:

  https://docs.nextstrain.org/projects/nextclade/en/stable"#;

fn nextclade_check_removed_dataset_get_args(args: &NextcladeDatasetGetArgs) -> Result<(), Report> {
  if args.reference.is_some() {
    return make_error!(
      "The argument `--reference` (alias `-r`) is removed.{MSG_DATASET_NAMING_CHANGE}{MSG_READ_DATASET_GET_DOCS}"
    );
  }

  if !args.attribute.is_empty() {
    return make_error!(
      "The argument `--attribute` (alias `-a`) is removed.{MSG_DATASET_NAMING_CHANGE}{MSG_READ_DATASET_GET_DOCS}"
    );
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
    NextcladeCommands::HelpMarkdown => print_help_markdown(),
    NextcladeCommands::Run(mut run_args) => {
      nextclade_check_removed_args(&run_args)?;
      nextclade_check_column_config_args(&run_args)?;
      nextclade_get_output_filenames(&mut run_args).wrap_err("When deducing output filenames")?;
      nextclade_run(*run_args)
    }
    NextcladeCommands::Dataset(dataset_command) => match dataset_command.command {
      NextcladeDatasetCommands::List(dataset_list_args) => {
        nextclade_check_removed_dataset_list_args(&dataset_list_args)?;
        nextclade_dataset_list(dataset_list_args)
      }
      NextcladeDatasetCommands::Get(dataset_get_args) => {
        nextclade_check_removed_dataset_get_args(&dataset_get_args)?;
        nextclade_dataset_get(&dataset_get_args)
      }
    },
    NextcladeCommands::Sort(seq_sort_args) => nextclade_seq_sort(&seq_sort_args),
    NextcladeCommands::ReadAnnotation(read_annotation_args) => nextclade_read_annotation(&read_annotation_args),
  }
}
