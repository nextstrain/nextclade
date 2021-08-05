# Nextclade datasets

Nextclade dataset is a set of input data files required for Nextclade to run the analysis:

 - reference (root) sequence
 - reference tree
 - quality control configuration
 - gene map
 - PCR primers

Dataset might also include example sequence data (to be analyzed).

Datasets are specific to a given virus. For example, a dataset for H1N1 flu is not suitable for analysing SARS-CoV-2 sequences and vice versa. Mixing incompatible datasets and sequences will produce incorrect results.

Datasets are versioned to ensure correctness when running with different versions of Nextclade.

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

This will print a list of available datasets to console. More options are available. See: `nextclade dataset list --help`

#### Download a dataset

The datasets can be downloaded with the `dataset get` subcommand:

```
nextclade dataset get --name=sars-cov-2 --output-dir='datasets/sars-cov-2'
```

The requested dataset is then downloaded into the specified directory. More options are available. See: `nextclade dataset get --help`


#### Run the analysis with the downloaded dataset

The `--input-dataset` flag can be used to point Nextclade CLI to a compatible dataset.

```
nextclade run --input-dataset='datasets/sars-cov-2' --input-fasta='my_sequences.fasta' --output-tsv='output/nextclade.tsv' --output-tree='output/tree.json' --output-dir='output/'
```

The individual `--input-*` flags can still be provided (as without using datasets)

for example, to use the downloaded dataset but to override the reference tree you could run:

```
nextclade run --input-dataset='datasets/sars-cov-2' --input-fasta='my_sequences.fasta' --input-tree='my_tree.json' --output-tsv='output/nextclade.tsv' --output-tree='output/tree.json' --output-dir='output/'
```
See `nextclade run --help` for all the flags related to analysis runs.


#### Run the analysis without the dataset

If the `--input-dataset` flag is not used, the individual `--input-*` flags are required for each file.


## Dataset versioning and compatibility

When Nextclade software implements new features (for example new QC checks) it might require dataset changes that are incompatible with the previous versions of Nextclade.

Each dataset defines multiple versions, each containing a range of compatible Nextclade versions (separately for Nextclade Web and Nextclade CLI). A particular version of Nextclade can only use a dataset that has matching compatibility range. The compatibility checks are ensured by default in Nextclade Web and Nextclade CLI. However, Nextclade CLI users can additionally list and download any dataset version using advanced command-line flags (see `nextclade dataset --help`).


## Creating a custom dataset

You can create a new dataset by creating a directory with the required input files. You can use one of the existing datasets as a starting point and modify its files as needed.

For example, you can create a dataset for the analysis of SARS-CoV-2 clades for a particular region, by making a copy of the default global SARS-CoV-2 dataset and replacing the reference tree file with the one that contains more representative samples that are more relevant for your region.

> TODO: extend this guide by adding more details when the directory structure stabilizes

## Dataset repository

Nextclade team hosts a public file server containing all the dataset file themselves as well as the index file that lists all the datasets, their versions and file URLs. At this time we do not support the usage of the dataset repository outside of Nextclade. We cannot guarantee stability of the index file format or of the filesystem structure. They can change without notice.

## Dataset updates

Maintainers add and update the datasets periodically. The dataset curation procedure is described in the [Dataset curation guide](../../packages/datasets/README.md).
