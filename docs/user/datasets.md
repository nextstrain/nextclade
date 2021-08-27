# Nextclade datasets

Nextclade dataset is a set of input data files required for Nextclade to run the analysis:

- reference (root) sequence
- reference tree
- quality control configuration
- gene map
- PCR primers

Dataset might also include example sequence data (to be analyzed).

Datasets are specific to a given virus. For example, a dataset for H1N1 flu is not suitable for analysing SARS-CoV-2 sequences and vice versa. Mixing incompatible datasets and sequences will produce incorrect results.

Datasets are versioned to ensure correctness when running with different versions of Nextclade as well as reproducibility of results.

## Using datasets

### Datasets in Nextclade Web

Nextclade Web loads the latest compatible datasets automatically. User can choose one of the datasets before starting the analysis.

The datasets page (`https://clades.nextstrain.org/data`) displays all the available datasets and allows to download them (individual files or grouped inside a zip archive). These downloaded datasets can be used with Nextclade Web in advanced mode or with Nextclade CLI. They can also serve as a starting point for creating your own datasets.

### Datasets in Nextclade CLI

Nextclade CLI implements subcommands allowing to list and to download datasets. This functionality requires internet connection.

#### List available datasets

The datasets can be listed with the `dataset list` subcommand:

```
nextclade dataset list --name=sars-cov-2
```

This will print a list of available datasets to console. More options are available to control listing older and incompatible versions of datasets, as well as specific tags. See: `nextclade dataset list --help`

#### Download a dataset

The datasets can be downloaded with the `dataset get` subcommand:

```
nextclade dataset get --name='sars-cov-2' --output-dir='datasets/'
```

The requested dataset is then downloaded into a subdirectory `datasets/sars-cov-2_{latest_version_tag}`. Where `{latest_version_tag}` is the unique string that identifies the version of the dataset.

If you want to override the subdirectory name, to make paths deterministic (for example for integration into a workflow), use both `--output-dir` and `--output-subdir` flags:

```
nextclade dataset get --name='sars-cov-2' --output-dir='datasets' --output-subdir='sars-cov-2'
```

The latest SARS-CoV-2 dataset will then be downloaded into `datasets/sars-cov-2`.

More options are available to control the exact version being downloaded. See: `nextclade dataset get --help`

#### Run the analysis with the downloaded dataset

The individual `--input-*` flags can still be use (as if without using datasets feature), but the new `--input-dataset` flag can be used to point Nextclade CLI to a dataset directory:

```
nextclade run --input-dataset='datasets/sars-cov-2' --input-fasta='my_sequences.fasta' --output-tsv='output/nextclade.tsv' --output-tree='output/tree.json' --output-dir='output/'
```

This will use all the required files from the dataset, so that the individual paths don't need to be specified explicitly.

If `--input-dataset` as well as other `--input-*` flags for individual files are provided, then the individual flags override the corresponding file in the dataset. The remaining files, for which individual flags are not provided are taken from the dataset.

For example, to use a downloaded dataset but to override the reference tree file in it, you could run nextclade as follows:

```
nextclade run --input-dataset='datasets/sars-cov-2' --input-fasta='my_sequences.fasta' --input-tree='my_tree.json' --output-tsv='output/nextclade.tsv' --output-tree='output/tree.json' --output-dir='output/'
```

See `nextclade run --help` for all the flags related to analysis runs.

#### Run the analysis without the dataset

If the `--input-dataset` flag is not used, the individual `--input-*` flags are required for each file.

## Dataset versioning and compatibility

When Nextclade software implements new features (for example new QC checks) it might require dataset changes that are incompatible with the previous versions of Nextclade.

Each dataset defines multiple versions, each containing a range of compatible Nextclade versions (separately for Nextclade Web and Nextclade CLI). A particular version of Nextclade can only use a dataset that has matching compatibility range.

Compatibility checks are ensured by default in Nextclade Web and Nextclade CLI when downloading datasets. However, Nextclade CLI users can additionally list and download any dataset version using advanced command-line flags (see `nextclade dataset --help`).

## Creating a custom dataset

You can create a new dataset by creating a directory with the required input files. You can use one of the existing datasets as a starting point and modify its files as needed.

For example, you can create a dataset for the analysis of SARS-CoV-2 clades for a particular region, by making a copy of the default global SARS-CoV-2 dataset and replacing the reference tree file with the one that contains more representative samples that are more relevant for your region.

## Online dataset repository

Nextclade team hosts a public file server containing all the dataset file themselves as well as the index file that lists all the datasets, their versions and file URLs. This server is the source of datasets for Nextclade Web and Nextclade CLI.

At this time we do not support the usage of the dataset repository outside of Nextclade. We cannot guarantee stability of the index file format or of the filesystem structure. They can change without notice.

The code and source data for datasets generation is in the GitHub repository [neherlab/nextclade_data](https://github.com/neherlab/nextclade_data).

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
