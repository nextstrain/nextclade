# Nextclade datasets

A Nextclade dataset is a set of input data files required for Nextclade to run an analysis on user-provided sequences of a given virus. Datasets are how Nextclade is configured for a particular virus - as opposed to Nextclade software itself, which is virus agnostic.
Datasets can differ in the features they enable, which can range from just alignment to a reference sequence to full QC, clade assignment, and phylogenetic analysis.
The dataset components (input files) required to enable different features are listed below.
It is possible to directly specify all the required input files. However, most users will want to use the pre-made datasets for convenience.

Nextstrain maintains a repository of official and community datasets at github.com/nextstrain/nextclade_data.
It contains the datasets maintained by the Nextstrain team, as well as datasets contributed by the community.
This repository is the source of datasets shown in Nextclade Web and is used by the Nextclade CLI to download datasets.

However, you can also create your own datasets and share them with others.

## Dataset files

A dataset must contain at least the following files:

- reference (root) sequence to align against (`reference.fasta`)
- general dataset configuration file (`pathogen.json`)

Optionally, a dataset can contain the following additional files:

- a genome annotation to specify how to translate the nucleotide sequence to proteins (`genome_annotation.gff3`). specifying this enables codon-informed alignment and protein alignments.
- a reference tree to place sequences in phylogenetic context, assign clades, and determine QC metrics that depend rely on the tree (`tree.json`)
- a readme file giving more information about the dataset (`README.md`)
- a changelog file describing changes between versions (`CHANGELOG.md`)
- example sequence data for testing and demonstration (`sequences.fasta`)

For in-depth documentation of the input files, see: [Input files](input-files/index.rst)

An instance of a dataset is a directory containing the dataset files or an equivalent zip archive.

## Datasets names and versions

There are 2 concepts that are important to understand in order to work with Nextclade datasets: dataset name and dataset version. Similar to software, datasets are versioned to ensure reproducibility of results. A user will usually work with the latest version of a dataset, but can also choose to use a specific version.

The name is a path-like string that uniquely identifies a dataset. It usually contains the maintainer's name or organisation, the name of the virus and the name of the reference sequence used, as well as potentially other parameters. For example, the default SARS-CoV-2 dataset is named `nextstrain/sars-cov-2/wuhan-hu-1/orfs`.
This signifies that this is a Nextstrain maintained dataset for SARS-CoV-2 using Wuhan-Hu-1/2019 (MN908947) as reference sequence with annotation of ORFs (open reading frames) rather than mature proteins.
For commonly used datasets, we define short-cuts like `sars-cov-2` or `sars-cov-2/xbb` that map to full paths.
The version is a timestamp string of the form `YYYY-MM-DDTHH:MM:SSZ` that indicates when the dataset was released.

In Nextclade Web, usually only the latest version of a dataset is shown. However, it is possible to select a specific version of a dataset through the use of URL parameters.

In Nextclade CLI, the latest version of a dataset is used by default. However, it is possible to list all available versions of a dataset and to download a specific version.

## Dataset updates

Maintainers add new datasets and dataset versions periodically to the online dataset repository, taking care to ensure compatibility with various versions of Nextclade software in use.

The dataset version tags are immutable: once a tag released the data for that tag stays the same, and downloads of this specific tag produce the same set of files.

If you need reproducible results, you should:

- "freeze" the version of Nextclade CLI, that is keep the same version of Nextclade CLI software across runs (check `nextclade --version`)
- "freeze" the version tag of the dataset, that is keep the same dataset directory across runs or to redownload it with the specific `--tag`.

Nextclade Web always uses the latest versions of datasets available at the moment of loading the main page (reload the page for updates).

## Using datasets

### Datasets in Nextclade Web

Nextclade Web loads the latest compatible datasets automatically. User can choose one of the datasets before starting the analysis using the dataset selector.

The [datasets page](https://github.com/nextstrain/nextclade_data/tree/release/data/) displays all the available datasets and allows to download them. These downloaded datasets can be used with Nextclade Web in advanced mode or with Nextclade CLI. They can also serve as a starting point for creating your own datasets.

### Datasets in Nextclade CLI

Nextclade CLI comes with the `dataset` subcommand that can list and download. This functionality requires an internet connection.

#### List available datasets

To see a list of all available datasets run:

```bash
nextclade dataset list --only-names
```

This will print a list of available datasets to console. More options are available to control listing older and incompatible versions of datasets, as well as specific tags. See: `nextclade dataset list --help`

#### Download a dataset

##### Latest dataset

The datasets can be downloaded with the `dataset get` subcommand. For example to get the latest version of the SARS-CoV-2 dataset with reference sequence `Wuhan-Hu-1` run:

```bash
nextclade dataset get --name 'nextstrain/sars-cov-2/wuhan-hu-1' --output-dir 'data/sars-cov-2'
```

The dataset files will be downloaded to the directory `data/sars-cov-2` relative to the working directory.

> 💡️ Instead of `--output-dir` you can use `--output-zip` argument to download datasets in the form of a zip archive. The dataset directories and zip archives are equivalent and can be used interchangeably in Nextclade.

##### Dataset with a specific reference sequence and version tag

You can set a version tag explicitly. For example, to always use the SARS-CoV-2 dataset based on reference sequence `Wuhan-Hu-1/2019 (MN908947)` and a version released on June 25th 2021 (`2021-06-25T00:00:00Z` -- note that this is an non-existent version as no v3 datasets were released at time of writing. Replace with an existing tag):

```bash
nextclade dataset get \
  --name 'nextstrain/sars-cov-2/wuhan-hu-1' \
  --tag '2021-06-25T00:00:00Z' \
  --output-dir 'data/sars-cov-2_wuhan-hu-1_2021-06-25'
```

In this case repeated downloads will always produce the same files. This is only recommended if you need strictly reproducible results and don't want to automatically get the latest dataset version. Note that with stale data, new clades and other new features will not be available. For general use, we recommend to periodically download the latest version.

> 💡️ Nextclade project hosts datasets on a very affordable file hosting, with edge caching. We don't impose any rate limits. You are free to download these files reasonably often. For example, for a daily automated workflow it is recommended to download a fresh version of the dataset before every run.

##### Identify already downloaded dataset

Navigate to the dataset directory and find a file named `pathogen.json`. It contains information about the dataset: name, reference sequence, version tag and some other parameters.

#### Run the analysis with the downloaded dataset

The flag `--input-dataset` can be used to point Nextclade CLI to a dataset directory:

```bash
nextclade run \
  --input-dataset 'data/sars-cov-2' \
  --output-tsv 'output/nextclade.tsv' \
  --output-tree 'output/tree.json' \
  my_sequences.fasta
```

> 💡️ The `--input-dataset` can also accept a path to a zip version of the dataset if you downloaded it with `--output-zip`.

This will use all the required files from the dataset, so that the individual paths don't need to be specified explicitly.

If `--input-dataset` as well as other `--input-*` flags for individual files are provided, then the individual flags override the corresponding file in the dataset. The remaining files, for which individual flags are not provided are taken from the dataset.

For example, to use a downloaded dataset but to override the reference tree file in it, you could run nextclade as follows:

```bash
nextclade run \
  --input-dataset 'datasets/sars-cov-2' \
  --input-tree 'my_tree.json' \
  --output-tsv 'output/nextclade.tsv' \
  --output-tree 'output/tree.json' \
  my_sequences.fasta
```

> ⚠️ When overriding dataset files make sure that the individual files are compatible with the dataset (in particular the reference sequence)

See `nextclade run --help` for all the flags related to analysis runs.

#### Run the analysis without the dataset

If the `--input-dataset` flag is not used, the individual `--input-*` flags are required for each file.

#### Run the analysis with an automatically downloaded dataset

For convenience, Nextclade CLI can automatically download a dataset when running an analysis. Simply provide the dataset name with `--dataset-name` when running the analysis:

```bash
nextclade run \
  --dataset-name 'nextstrain/sars-cov-2/MN908947' \
  --output-tsv 'output/nextclade.tsv' \
  my_sequences.fasta
```

This will download the latest version of the dataset and use it for the analysis. The dataset will be saved in memory and will not be persisted to disk. You can still override individual files with `--input-*` flags.

## Dataset versioning and compatibility

When Nextclade software implements new features (for example new QC checks) it might require dataset changes that are incompatible with previous versions of Nextclade.

Each dataset defines multiple versions, each containing a range of compatible Nextclade versions (separately for Nextclade Web and Nextclade CLI). A particular version of Nextclade can only use a dataset that has a matching compatibility range.

Compatibility checks are ensured by default in Nextclade Web and Nextclade CLI when downloading datasets. However, Nextclade CLI users can additionally list and download any dataset version using advanced command-line flags (see `nextclade dataset --help`).

## Creating a custom dataset

You can create a new dataset by creating a directory with the required input files. You can use one of the existing datasets as a starting point and modify its files as needed.

For more details on how to create your own dataset, see [Nextclade dataset curation guide](https://github.com/nextstrain/nextclade_data/blob/master/docs/dataset-curation-guide%2Emd).

## Online dataset repository

The Nextclade team hosts a public file server containing all the dataset files themselves as well as the index file that lists all the datasets, their versions and file URLs. This server is the source of datasets for Nextclade Web and Nextclade CLI.

At this time we do not support the usage of the dataset repository outside of Nextclade. We cannot guarantee stability of the index file format or of the filesystem structure. They can change without notice.
