# Nextclade datasets

Nextclade dataset is a set of input data files required for Nextclade to run the analysis:

- reference (root) sequence (`reference.fasta`)
- reference tree (`tree.json`)
- quality control configuration (`qc.json`)
- gene map (`genemap.gff`)
- PCR primers (`primers.csv`)
- virus properties (`virus_properties.json`)

See also: [Input files](input-files)

Dataset might also include example sequence data (`sequences.fasta`) - typically a diverse set of query sequences that represents major clades, used for demonstration and highlights analysis features of Nextclade. Most of the time you want to analyze your own sequence data.

Dataset also includes a file `tag.json` which contains version tag and other properties of the dataset. This file is currently not used by Nextclade and serves only for informational purposes.

An instance of a dataset is a directory containing the dataset files or an equivalent zip archive.

## Datasets names, reference sequences and version tags

There are 3 concepts that are important to understand in order to work with Nextclade datasets:

1. **Dataset name** - identifies dataset purpose. Typically indicates name of the pathogen. Examples: `sars-cov-2`, `flu_h3n2_ha`. Each dataset is specific to a given virus. For example, a dataset for H1N1 flu is not suitable for analyzing SARS-CoV-2 sequences and vice versa. Mixing incompatible datasets and sequences will produce incorrect results.

2. **Dataset's reference sequence**: each dataset can have multiple flavors, depending on the reference sequence it is based on. For example, one `sars-cov-2` reference dataset can be based on `MN908947 (Wuhan-Hu-1/2019)` or reference sequences, and `flu_h3n2_ha` can be based on `CY034116 (A/Wisconsin/67/2005)` or other reference sequences. For each dataset name, among all available reference sequences, there is a default reference sequence defined by the dataset maintainers. It is used when no concrete reference sequence is specified. The dataset reference is specified using the corresponding accession ID.

3. **Dataset version and version tag**: each reference dataset can have multiple versions. New versions are produced during dataset updates. Datasets are versioned to ensure correctness when running with different versions of Nextclade as well as reproducibility of results. For each reference in dataset there is exactly one latest version. It is used as a default when no version is specified. Version tag is the name unique to a given version.

A combination of (1) name, (2) reference sequence accession, (3) version tag uniquely identifies a downloaded dataset instance. These parameters are described in the file `tag.json` in the dataset directory.

## Using datasets

### Datasets in Nextclade Web

Nextclade Web loads the latest compatible datasets automatically. User can choose one of the datasets before starting the analysis using dataset selector.

The [datasets page](https://github.com/nextstrain/nextclade_data/tree/release/data/datasets) displays all the available datasets and allows to download them. These downloaded datasets can be used with Nextclade Web in advanced mode or with Nextclade CLI. They can also serve as a starting point for creating your own datasets.

### Datasets in Nextclade CLI

Nextclade CLI implements subcommands allowing to list and to download datasets. This functionality requires an internet connection.

#### List available datasets

The datasets can be listed with the `dataset list` subcommand:

```bash
nextclade dataset list --name sars-cov-2
```

This will print a list of available datasets to console. More options are available to control listing older and incompatible versions of datasets, as well as specific tags. See: `nextclade dataset list --help`

#### Download a dataset

##### Latest dataset

The datasets can be downloaded with the `dataset get` subcommand. For example SARS-CoV-2 dataset can be downloaded as follows:

```bash
nextclade dataset get --name 'sars-cov-2' --output-dir 'data/sars-cov-2'
```

The dataset files will be downloaded to the directory `data/sars-cov-2` relative to the working directory.

##### Dataset with a specific reference sequence

You can set a reference sequence of the dataset explicitly, for example to always use `MN908947 (Wuhan-Hu-1/2019)` for SARS-CoV-2:

```bash
nextclade dataset get --name 'sars-cov-2' --reference 'MN908947' --output-dir 'data/sars-cov-2_MN908947'
```

If using this commands, repeated downloads may produce updated files in the future: after releases of new versions of this dataset. Reference sequence will stay the same even if the SARS-CoV-2 dataset's default reference sequence changes in the future.

> ⚠️ We recommend to give descriptive names to dataset directories to avoid confusion. Currently Nextclade cannot verify that a given batch of user-provided sequences is compatible with a given dataset, and it will silently produce incorrect results.

> 💡️ Instead of `--output-dir` you can use `--output-zip` argument to download datasets in the form of a zip archive. The dataset directories and zip archives are equivalent and can be used interchangeably in Nextclade.


##### Dataset with a specific reference sequence and version tag

You can set a version tag explicitly. For example, to always use the SARS-CoV-2 dataset based on reference sequence `MN908947 (Wuhan-Hu-1/2019)` and a version released on June 25th 2021 (`2021-06-25T00:00:00Z`):

```bash
nextclade dataset get \
  --name 'sars-cov-2' \
  --reference 'MN908947' \
  --tag '2021-06-25T00:00:00Z' \
  --output-dir 'data/sars-cov-2_MN908947_2021-06-25T00:00:00Z'
```

In this case repeated downloads will always produce the same files. This is only recommended if you need strictly reproducible results and don't care about updates. Note that with stale data, new clades and other new features will not be available. For general use, we recommend to periodically download the latest version.

> 💡️ Nextclade project hosts datasets on a very affordable file hosting, with edge caching. We don't impose any rate limits. You are free to download these files reasonably often. For example, for a daily automated workflow it is recommended to download a fresh version of the dataset before every run.

##### Identify already downloaded dataset

Navigate to the dataset directory and find a file named `tag.json`. It contains information about the dataset: name, reference sequence, version tag and some other parameters.

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

> ⚠️ When overriding dataset files make sure that the individual files are compatible with the dataset (in particular the pathogen and the reference sequence)

See `nextclade run --help` for all the flags related to analysis runs.

#### Run the analysis without the dataset

If the `--input-dataset` flag is not used, the individual `--input-*` flags are required for each file.

## Dataset versioning and compatibility

When Nextclade software implements new features (for example new QC checks) it might require dataset changes that are incompatible with previous versions of Nextclade.

Each dataset defines multiple versions, each containing a range of compatible Nextclade versions (separately for Nextclade Web and Nextclade CLI). A particular version of Nextclade can only use a dataset that has a matching compatibility range.

Compatibility checks are ensured by default in Nextclade Web and Nextclade CLI when downloading datasets. However, Nextclade CLI users can additionally list and download any dataset version using advanced command-line flags (see `nextclade dataset --help`).

## Creating a custom dataset

You can create a new dataset by creating a directory with the required input files. You can use one of the existing datasets as a starting point and modify its files as needed.

For example, you can create a dataset for the analysis of SARS-CoV-2 clades for a particular region, by making a copy of the default global SARS-CoV-2 dataset and replacing the reference tree file with the one that contains more representative samples that are more relevant for your region.

## Online dataset repository

Nextclade team hosts a public file server containing all the dataset file themselves as well as the index file that lists all the datasets, their versions and file URLs. This server is the source of datasets for Nextclade Web and Nextclade CLI.

At this time we do not support the usage of the dataset repository outside of Nextclade. We cannot guarantee stability of the index file format or of the filesystem structure. They can change without notice.

The code and source data for datasets generation is in the GitHub repository: [neherlab/nextclade_data_workflows](https://github.com/neherlab/nextclade_data_workflows)

## Dataset updates

Maintainers add new datasets and dataset versions periodically to the online dataset repository, taking care to ensure compatibility with various versions of Nextclade software in use.

A dataset is uniquely identified by its name, e.g. `sars-cov-2` or `flu_vic_ha`.

A version of a given dataset is uniquely identified by:

- the name of the dataset it belongs to, e.g. `sars-cov-2` or `flu_vic_ha`
- the version tag, e.g. `2021-06-20T00:00:00Z`

The dataset version tags are immutable: once a tag released the data for that tag stays the same, and downloads of this specific tag produce the same set of files.

If you need reproducible results, you should:

- "freeze" the version of Nextclade CLI, that is keep the same version of Nextclade CLI across runs (check `nextclade --version`)
- "freeze" the version tag of the dataset, that is keep the same dataset directory across runs or to redownload it with the specific `--tag`.

Nextclade Web always uses the latest versions of datasets available at the moment of loading the main page (reload the page for updates).
