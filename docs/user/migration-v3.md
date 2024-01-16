# Migration to Nextclade v3

Version 3 of Nextclade contains a number of new features that required changing some of the parameters of the algorithms.
In addition, we have simplified the structure of datasets.
While these changes should make Nextclade more powerful and simpler to use, they do require adjustment of pipelines and custom datasets.

This section lists breaking changes in Nextclade v3 compared to Nextclade v2, and describes potential migration paths. For more details about each change as well as about non-breaking changes, please read the [changelog](../changes/CHANGELOG.md).

If you encounter problems during migration, or breaking changes not mentioned in this document, please report it to developers by [opening a new GitHub issue](https://github.com/nextstrain/nextclade/issues).

## Useful links

- [Nextclade Web v3](https://clades.nextstrain.org)
- [Nextclade Web v2](https://v2.clades.nextstrain.org) - if you need the old version
- [Nextclade CLI releases](https://github.com/nextstrain/nextclade/releases) - all versions
- [Nextclade user documentation](https://docs.nextstrain.org/projects/nextclade/en/stable/index.html) - for detailed instructions on how to use Nextclade Web and Nextclade CLI
- [Nextclade dataset curation guide](https://github.com/nextstrain/nextclade_data/blob/master/docs/dataset-curation-guide%2Emd)  - if you have a custom Nextclade dataset or want to create one
- [Nextclade source code repository](https://github.com/nextstrain/nextclade) - for contributors to Nextclade software (code, bug reports, feature requests etc.)
- [Nextclade data repository](https://github.com/nextstrain/nextclade_data) - for contributors to Nextclade datasets (new pathogens, bug reports, etc.)
- [Nextclade software GitHub issues](https://github.com/nextstrain/nextclade/issues) - to report bugs and ask questions about Nextclade software
- [Nextclade data GitHub issues](https://github.com/nextstrain/nextclade_data/issues) - to report bugs and ask questions about Nextclade datasets
- [Nextstrain discussion forum](https://discussion.nextstrain.org) - for general discussion and questions


## Avoiding the upgrade to v3 temporarily (staying on v2)

If you need some more time for the upgrade, and want to temporarily stay on Nextclade version 2, then you need to manually "pin" the version being used. In order to avoid breakage, we invite you to do this before v3 is released on January 16. The last version in v2 family is 2.14.0

#### For Nextclade Web

Use this URL: [v2.clades.nextstrain.org](https://v2.clades.nextstrain.org). This address will have Nextclade Web v2 deployed even after v3 is deployed to the main address.

This might include cases where you use Nextclade Web yourself, as well as cases where you share links with other people, e.g. if you maintain a custom dataset in Nextclade v2 format and provide links preconfigured using URL parameters. Note that v2 datasets are not compatible with Nextclade v3 and vice-versa.

#### For Nextclade CLI

Existing Nextclade CLI v2 or Nextalign CLI v2 downloads and installations will continue to function. Datasets for Nextclade v2 will still be available as before, although they will not receive any updates. If you install Nextclade/Nextalign continuously using a script or a pipeline and you want to keep using v2 after v3 is released, you can do the following adjustments:

- if you are using direct download, use links specific to the version 2.14.0 from [here](https://github.com/nextstrain/nextclade/releases/tag/2.14.0) (scroll towards the bottom of the page)

- if you are using Docker images, use a specific docker tag:

  ```bash 
  docker pull nextstrain/nextclade:2.14.0
  ```

- if you are installing package through Bioconda, specify a specific version:

  ```bash
  conda install nextclade=2.14.0
  ````

Please note that staying on Nextclade v2 is not recommended long-term. Nextclade v2 will not be receiving any software updates and will not receive any new dataset updates, so eventually you will end up with outdated analysis results.


---


## 1. Nextalign CLI is removed

Nextalign CLI is no longer provided as a standalone application along with Nextclade CLI v3. You can now use Nextclade CLI with the same command line arguments. Nextclade CLI runs the same algorithms, accepts same inputs and provides the same outputs, plus some more. For most use-cases, the CLI interface and the input and output files should be the same or very similar.

### Migration paths

If you are not using Nextalign CLI (the `nextalign` executable), then this does not affect you.

If you are, then in your Nextalign command-line invocation replace the word `nextalign` to `nextclade`. When downloading the executables - use Nextclade download links instead of Nextalign links. If you use docker, pull `nextstrain/nextclade` image instead of `nextstrain/nextalign`.

If you used `nextalign` for a pathogen/strain which has a Nextclade dataset, then you can replace individual input arguments, such as for reference sequence and genome annotation with a single argument `--input-dataset`. Type `nextclade run --help` and refer to documentation for details on command-line arguments.

For a list of all datasets, type `nextclade dataset list`. If there is no dataset for your pathogen/strain, then consider arranging the individual input files into a dataset and contributing it to the Nextclade community dataset collection. For instructions see [Nextclade dataset curation guide](https://github.com/nextstrain/nextclade_data/blob/master/docs/dataset-curation-guide%2Emd).

## 2. Some alignment parameters are removed

Due to changes in the seed alignment algorithm, the following parameters are no longer used and the corresponding CLI arguments and JSON fields under `alignmentParams` in `pathogen.json` (previously `virus_properties.json`) were removed:

  ```text
  --min-seeds          (minSeeds)
  --seed-length        (seedLength)
  --seed-spacing       (seedSpacing)
  --min-match-rate     (minMatchRate)
  --mismatches-allowed (mismatchesAllowed)
  --max-indel          (maxIndel)
  ```

The following alignment parameters were added:

  ```text
  --kmer-length        (kmerLength)
  --kmer-distance      (kmerDistance)
  --min-match-length   (minMatchLength)
  --allowed-mismatches (allowedMismatches)
  --window-size        (windowSize)
  ```

### Migration paths

This does not affect you if you have not customized these particular alignment parameters, either using CLI arguments or `alignmentParams` section of `virus_properties.json` file.

If you did, then remove the old parameters from your CLI invocation and/or from `pathogen.json` file. The new seed matching algorithm is more permissive regarding lower-quality sequences and allows seed-matching of more diverged sequences.
It might be that it does not require parameter tuning anymore. If you observe sequences that cannot be aligned, but believe they should be, then please refer to the "Alignment" section in the user documentation for instructions on how to tune the new algorithm.

## 3. Different tree output

Nextclade v3 now has the ability to phylogenetically resolve relationships between input sequences, where v2 would only attach sequences to the reference tree. Nextclade v3 thus may produce trees that are different from the trees produced in Nextclade v2.

Please read the [Phylogenetic placement](algorithm/05-phylogenetic-placement) section in the documentation for more details.

##### Migration paths

We recommend the new behavior for most users and most pathogens. If you encounter any issues (consider [reporting](https://github.com/nextstrain/nextclade_data/issues) them) or prefer the old behavior, you can use `--without-greedy-tree-builder` argument in Nextclade CLI to disable it.

There is currently no way to disable the tree builder in Nextclade Web. If you need this functionality, please open a GitHub issue and explain your motivation. We are also open for contributions.

## 4. Dataset file format and dataset names have changed

The dataset files `qc.json`, `primers.csv` and `virus_properties.json` are now merged into a new file `pathogen.json`.

Dataset names have changed. There is no longer a separation to `name`, `reference` and other attributes. The datasets are now uniquely identified by a path-like name, which corresponds to the path of the dataset in the [data repo](https://github.com/nextstrain/nextclade_data/tree/master/data).

##### Migration paths for dataset maintainers

If you have a custom dataset for Nextclade v2 and want to migrate it to Nextclade v3, then please follow [Nextclade dataset migration guide](https://github.com/nextstrain/nextclade_data/blob/master/docs/migration-guide-v3%2Emd).

We also invite you to consider submitting your dataset for potential inclusion to the Nextclade community datasets collection, so that it is visible in the list in Nextclade CLI and Nextclade Web. You can find relevant instructions in the [Nextclade dataset curation guide](https://github.com/nextstrain/nextclade_data/blob/master/docs/dataset-curation-guide%2Emd).

If you encounter any difficulties, feel free to reach out by either opening a [GitHub issue](https://github.com/nextstrain/nextclade_data/issues), or on [Nextstrain discussion forum](https://discussion.nextstrain.org).

##### Migration paths for Nextclade Web:

If you are using Nextclade Web, you receive the most up-to-date datasets automatically. Refresh the page and make sure that the version of Nextclade in the bottom left corner is 3.0.0 or greater. There is nothing to do otherwise.

##### Migration paths for Nextclade CLI:

The names of the official datasets have changed (they look like filesystem paths now), so first you need to find out the new name using `nextclade dataset list` command. Then re-download your datasets using `nextclade dataset get` command and the new name.

For example, you can download Wuhan-based SARS-CoV-2 dataset using:

```bash
nextclade dataset get --name="nextstrain/sars-cov-2/wuhan-hu-1/orfs" --output-dir="out_dir/"
```

You can obtain a concise list of the available datasets if you add `--only-names` flag to the `dataset list` command:

```bash
nextclade dataset list --only-names
```

Alternatively, you can find dataset names in Nextclade Web user interface, in the dataset selector.
To facilitate the migration, commonly used datasets have convenient shortcuts that match previous dataset names, for example `rsv_a` -> `nextstrain/rsv/a/EPI_ISL_412866`.
These shortcuts are listed along with names and attributes by `nextclade dataset list`.

## 5. Some CLI arguments for individual input files are removed

Due to changes in dataset format the following CLI arguments were removed:

```text
--input-virus-properties
--input-qc-config
--input-pcr-primers
```

in favor of `--input-pathogen-json`.

##### Migration paths:

Please use `--input-pathogen-json` instead of the removed flags. If you need to migrate the files to the new format, then please follow the migration steps in the [Nextclade dataset migration guide](https://github.com/nextstrain/nextclade_data/blob/master/docs/migration-guide-v3%2Emd).

## 6. Some output files are removed

The dedicated output files for errors and for insertions are removed from all parts of Nextclade.

The arguments `--output-errors` and `--output-insertions` have been removed in favor of `--output-tsv`.

When `--output-all` argument is used, the files `nextclade.errors.csv` and `nextclade.insertions.csv` are no longer produced.

The argument `--output-selection` no longer accepts values `errors` and `insertions`.

In Nextclade Web, The `nextclade.errors.csv` and `nextclade.insertions.csv` files are removed and no longer appear in the "Export" dialog, nor they are included into the `nextclade.zip` archive of all outputs.

##### Migration paths:

If you rely on `nextclade.errors.csv` and `nextclade.insertions.csv` files, then use `nextclade.tsv` or `nextclade.csv` instead. These files include the same columns as `nextclade.errors.csv` and `nextclade.insertions.csv`.

In Nextclade CLI, if you use `--output-insertions` and/or `--output-errors` Please use `--output-tsv` (for tab-separated table) or `--output-csv` (for semicolon-separated table) arguments instead. If you use `--output-selection` argument, then remove values `errors` and `insertions` from it.

In Nextclade Web, if you use `nextclade.errors.csv` and `nextclade.insertions.csv` file, then use `nextclade.tsv` or `nextclade.csv` instead.

## 7. Genome annotation CLI argument is renamed

The argument `--input-gene-map` renamed to `--input-annotation`.

##### Migration paths:

Rename the argument

## 8. URL parameters in Nextclade Web have changed

Due to changes in the dataset format and in input files, the following changes in the URL parameters have been made:

| URL parameter(s)                                                | What happened                 | Migration path                                                  |
|-----------------------------------------------------------------|-------------------------------|-----------------------------------------------------------------|
| `input-root-seq`                                                | renamed to `input-ref`        | rename the parameter                                            |
| `input-gene-map`                                                | renamed to `input-annotation` | rename the parameter                                            |
| `input-pathogen-json`                                           | added                         |                                                                 |
| `input-qc-config`,`input-pcr-primers`, `input-virus-properties` | removed                       | use `pathogen.json` instead                                     |
| `dataset-reference`                                             | removed                       | use new `dataset-name` (which identifies the datasets uniquely) |


## 9. CDS instead of genes

Nextclade now uses "CDS" features from genome annotations instead of "gene" features. Certain fields in input and output files have been modified to reflect that.


#### Modified input files

The following fields are renamed in the input `pathogen.json` (previously `virus_properties.json` and `qc.json`):

```
From: aaMotifs[].includeGenes[].gene
To:   aaMotifs[].includeCdses[].cds

From: phenotypeData[].gene
To:   phenotypeData[].cds

From: qc.frameShifts.ignoredFrameShifts[].geneName
To:   qc.frameShifts.ignoredFrameShifts[].cdsName

From: qc.stopCodons.ignoredStopCodons[].geneName
To:   qc.stopCodons.ignoredStopCodons[].cdsName
```

#### Modified output files

The following fields are renamed in the output `nextclade.json`/`nextclade.ndjson`:

```
From: results[].missingGenes
To:   results[].missingCdses
```

The following columns are renamed in the output `nextclade.tsv`/`nextclade.csv`:

```
From: failedGenes
To:   failedCdses
```


The following fields are renamed in the output `nextclade.tree.json`:

```
From: node_atts.missing_genes
To:   node_atts.missing_cdses
```


### Migration paths

When creating or modifying `pathogen.json` file in the dataset make sure to use the new names of the mentioned fields.

When using output files, make sure to use the new names of the mentioned fields and columns.

