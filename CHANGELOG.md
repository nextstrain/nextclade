## Unreleased

We are happy to present a major release of Nextclade, containing new features and bug fixes.

> ⚠️ This release contains breaking changes which may require your attention.


Useful links:

- [Nextclade Web v3](https://clades.nextstrain.org)
- [Nextclade Web v2](https://v2.clades.nextstrain.org) - if you need the old version
- [Nextclade user documentation](https://docs.nextstrain.org/projects/nextclade/en/stable/index.html) - for detailed instructions on how to use Nextclade Web and Nextclade CLI
- [Nextclade dataset curation guide](https://github.com/nextstrain/nextclade_data/blob/master/docs/dataset-curation-guide.md)  - if you have a custom Nextclade dataset or want to create one
- [Nextclade source code repository](https://github.com/nextstrain/nextclade) - for contributors to Nextclade software (code, bug reports, feature requests etc.)
- [Nextclade data repository](https://github.com/nextstrain/nextclade_data) - for contributors to Nextclade datasets (new pathogens, bug reports, etc.)
- [Nextclade software issues](https://github.com/nextstrain/nextclade/issues) - to report bugs and ask questions about Nextclade software
- [Nextclade data issues](https://github.com/nextstrain/nextclade_data/issues) - to report bugs and ask questions about Nextclade datasets
- [Nextstrain discussion forum](https://discussion.nextstrain.org) - for general discussion and questions

### BREAKING CHANGES

This section briefly summarizes breaking changes in Nextclade v3 compared to Nextclade v2 and describes potential migration paths. For more details about each change, please read the followup sections.

#### 1. Nextalign CLI is removed

We no longer provide Nextalign CLI as a standalone application. You can now use Nextclade CLI with the same command line arguments. Nextclade CLI runs the same algorithms, accepts same inputs and provides the same outputs, plus some more.

##### Migration paths

In your Nextalign command-line invocation, replace word `nextalign` to `nextclade`. When downloading the executables - use Nextclade download links. If you use docker, pull `nextstrain/nextclade` image instead of `nextstrain/nextalign`.

#### 2. Some alignment parameters are removed

Due to changes in the alignment algorithm, the following parameters are no longer used and the corresponding CLI arguments and JSON fields under `alignmentParams` in `pathogen.json` (previously `virus_properties.json`) were removed:

  ```
  --min-seeds          (minSeeds)
  --seed-length        (seedLength)
  --seed-spacing       (seedSpacing)
  --min-match-rate     (minMatchRate)
  --mismatches-allowed (mismatchesAllowed)
  --max-indel          (maxIndel)
  ```

The following alignment parameters were added:

  ```
  --kmer-length        (kmerLength)
  --kmer-distance      (kmerDistance)
  --min-match-length   (minMatchLength)
  --allowed-mismatches (allowedMismatches)
  --window-size        (windowSize)
  ```

##### Migration paths

If you have not customized these particular alignment parameters either using CLI arguments or `alignmentParams` section of `virus_properties.json` file, then this does not affect you.

If you did, then remove the old parameters from your CLI invocation and/or from `pathogen.json` file. The new seed matching algorithm is more flexible regarding lower-quality sequences, and it might be that it does not require parameter tuning anymore. If you observe sequences that cannot be aligned, but believe they should be, then please refer to the "Alignment" section in the user documentation for instructions on how to tune the new algorithm.

#### 3. Different tree output

Due to introduction of the tree builder algorithm, Nextclade v3 may produce trees that are different from the trees produced in Nextclade v2.

##### Migration paths

We recommend the new behavior for most users. If you encounter any issues (consider [reporting](https://github.com/nextstrain/nextclade_data/issues) them) or prefer the old behavior, you can use `--without-greedy-tree-builder` argument in Nextclade CLI to disable it. There is currently no way to disable the tree builder in Nextclade Web. If you need this functionality, please open a GitHub issue and explain your motivation. We are also open for contributions.

Please refer to section "Phylogenetic placement" of Nextclade user documentation for more details about the new algorithm.

#### 4. Dataset file format and dataset names have changed

The dataset files `qc.json`, `primers.csv` and `virus_properties.json` are now merged into a new file `pathogen.json`.

Dataset names have changed. There is no longer a separation to `name`, `reference` and other attributes. The datasets are now uniquely identified by a path-like name, which corresponds to the path of the dataset in the [data repo](https://github.com/nextstrain/nextclade_data/tree/master/data).

##### Migration paths for dataset maintainers

If you have a custom dataset for Nextclade v2 and want to migrate it to Nextclade v3, then please follow [Nextclade dataset curation guide](https://github.com/nextstrain/nextclade_data/blob/master/docs/migration-guide-v3.md).

We also invite you to consider submitting your dataset for potential inclusion to the Nextclade community datasets collection, so that it is visible in the list in Nextclade CLI and Nextclade Web. You can find relevant instructions in the [Nextclade dataset curation guide](https://github.com/nextstrain/nextclade_data/blob/master/docs/dataset-curation-guide.md).

If you encounter any difficulties, feel free to reach out by either opening a [GitHub issue](https://github.com/nextstrain/nextclade_data/issues), or on [Nextstrain discussion forum](https://discussion.nextstrain.org).

##### Migration paths for Nextclade Web:

If you are using Nextclade Web, you receive the most up-to-date datasets automatically. Refresh the page and make sure that the version of Nextclade in the bottom left corner is 3.0.0 or greater. There is nothing to do otherwise.

##### Migration paths for Nextclade CLI:

The names of the official datasets have changed (they look like filesystem paths now), so first you need to find out the new name using `nextclade dataset list` command. Then re-download your datasets using `nextclade dataset get` command and the new name.

For example, you can download Wuhan-based SARS-CoV-2 dataset using:

```bash
nextclade dataset get --name="nextstrain/sars-cov-2/MN908947" --output-dir="out_dir/"
```

You can have a concise at the available datasets if you add `--only-names` flag to the list command:

```bash
nextclade dataset list --only-names
```

Alternatively, you can find dataset names in Nextclade Web user interface, in the dataset selector.

#### 5. Some CLI arguments for individual input files are removed

Due to changes in dataset format the following CLI arguments were removed:

```
--input-virus-properties
--input-qc-config
--input-pcr-primers
```

in favor of `--input-pathogen-json`.

##### Migration paths:

Please use `--input-pathogen-json` instead of the removed flags. If you need to migrate the files to the new format, then please follow the migration steps in the new

#### 6. Some CLI arguments for output files are removed

The arguments `--output-errors` and `--output-insertions` have been removed in favor of `--output-csv` and `--output-tsv`.

##### Migration paths:

Please use `--output-csv` (for semicolon-separated table) and `--output-tsv` (for tab-separated table) arguments instead. These tables contain all the columns from the output insertions table (`--output-insertions`) as well as from the output errors table (`--output-errors`), plus more.

#### 7. Genome annotation CLI argument is renamed

The argument `--input-gene-map` renamed to `--input-annotation`

##### Migration paths:

Rename the argument

---

### General changes

#### Alignment

The seed matching algorithm was rewritten.

Parameters `minSeeds`, `seedLength`, `seedSpacing`, `minMatchRate`, `mismatchesAllowed`, `maxIndel` no longer have any effect and are removed. Parameters `kmerLength`, `kmerDistance`, `minMatchLength`, `allowedMismatches`, `windowSize` were added.

For short sequence check, and fallback to full-matrix alignment, the `kmerLength` is used as a basis instead of removed `seedLength`. Coefficient is adjusted to roughly match the old final value.

#### Genome annotation

##### Replace genes with CDSes

Nextclade now treats genes only as containers for CDSes ("CDS" is [coding sequence](https://en.wikipedia.org/wiki/Coding_region)). CDSes are the main unit of translation and a basis for AA mutations now. A gene can contain multiple CDSes, but they are handled independently.

##### Handle fragmentation of genetic features.

A CDS can consist of multiple fragments. These fragments are extracted from the full nucleotide genome independently and joined together (in the order provided in the genome annotation) to form the nucleotide sequence of the CDS. The CDS is then translated and the resulting polypeptides are analyzed (mutations are detected etc.). This implementation allows to handle slippage and splicing.

##### Handle circular genomes.

If genome annotation describes a CDS fragment as circular (wrapping around origin), Nextclade splits it into multiple linear (non-wrapping) fragments. The translation and analysis is then performed as if it was a linear genome.

Nextclade follows [GFF3 specification](https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md#circular-genomes) when reading genome annotation. Please refer to it for how to properly describe circular features.

##### Parse regions, genes and CDSes from GFF3 file

The GFF3 file parser has been augmented to support all the types of genetic features necessary for Nextclade to operate. There are still feature types which Nextclade ignores. We can consider supporting more types as scientific need arises.


---

### Nextclade Web

#### Genome annotation widget

Following changes in genome annotation handling, the genome annotations widget in Nextclade Web now shows CDS fragments instead of genes.

#### CDS selector widget in Nextclade Web

Gene selector dropdown in Nextclade Web has been transformed into a more general genetic feature selector. It shows hierarchy of genetic features if there's any nested features. Otherwise the list is flat, to save screen space. It shows types of each of the genetic feature (gene, CDS or protein) as colorful badges. The menu is searchable, which is useful for mpx and other large viruses. Only CDSes can be selected currently, but we may extend this in the future to more feature types.


---

### Nextclade CLI

### Optional input files

Most input files and files inside datasets are now optional. This simplifies dataset creation and maintenance and allows for step-by-step, incremental extension of them. You can start only with a reference sequence, which will only allow for alignment and very basic mutation calling in Nextclade, and later you can add more functionality.

If you maintain a custom dataset of want to try creating one - refer to our [Dataset curation guide]().

### New subcommand: `sort`

The `sort` subcommand takes your sequences in FASTA format and output sequences grouped by dataset in the form of a directory tree. Each subdirectory corresponds to a dataset and contains output FASTA file with only sequences that are detected to be similar to the reference sequence in this dataset.

Example usage:

```bash
nextclade sort --output-dir="out/sort/" --output-results-tsv="out/sort.tsv" "input.fasta"
```

This can be useful for splitting FASTA files containing sequences which belong to different pathogens or to different strains, for example for separating flu HA and NA segments.

### New subcommand: `read-annotation`

The `read-annotation` subcommand takes a GFF3 file and displays how features are arranged hierarchically as viewed by Nextclade. This might be useful for Nextclade developers and dataset curators in oder to verify that Nextclade correctly understand genetic features from a particular GFF3 file.

Example usage:

```bash
nextclade read-annotation genome_annotation.gff3
```

Type `nextclade read-annotation --help` for description of arguments.


---

### Internal improvements

#### Ensure type safety across programming language boundaries

The new features caused change in major internal data structures and made them more complex. We now generate JSON schema and Typescript typings from Rust code. This allows to find mismatches between parts written in different languages, and to avoid bugs related to data types.

#### Make positions and ranges in different coord spaces type-safe

The change in genome annotation handling had significant consequences for coordinate spaces Nextclade is using internally (e.g. alignment space vs reference space, nuc space vs aa space, global nuc space vs nuc space local to a CDS). In order to make coordinate transforms safer, we introduced new `Position` and `Range` types, different for each space. This prevents mixing up coordinates in different spaces.

---

## Older versions

See [docs/changes/CHANGELOG.old.md](docs/changes/CHANGELOG.old.md)
