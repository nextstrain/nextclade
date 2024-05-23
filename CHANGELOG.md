## Nextclade 3.5.0

### Algorithm

#### Detect loss of amino acid motifs correctly

Nextclade sometimes failed to detect a motif loss if that motif was the only one in its category. This is now fixed and users could observe changes in detected lost motifs. This affects datasets using `aaMotifs` property in their pathogen.json file, notably the flu datasets.


### Nextclade Web

#### Ensure currently selected dataset is reloaded when it changes remotely

When `dataset-url` URL parameter is provided Nextclade Web would not update the dataset's pathogen.json file when remote dataset changes without changing its version. This is now fixed. It only affected users providing custom datasets using `dataset-url` URL parameter.


### General

#### Upgrade Auspice

The Auspice tree rendering package has been updated from version 2.52.1 to version 2.53.0. See the list of changes [here](https://github.com/nextstrain/auspice/releases)



## Nextclade 3.4.0

### Nextclade Web

#### Remove redundant scrollbars in dataset names

In dataset selector, sometimes there were extra scrollbars displayed to the right of the dataset names. This has been fixed.

#### Select suggested dataset automatically when suggestion is triggered manually

When suggestion is triggered manually, using "Suggest" button on main page, Nextclade will now automatically select the best dataset as the current dataset. Previously this could only be done by clearing the current dataset first and then clicking "Suggest". When suggestion algorithm is triggered automatically, the behavior is unchanged - the dataset will not be selected.


### Nextclade CLI

#### Don't read dataset's `tree.json` and `genome_annotation.gff3` unless they are declared

Nextclade CLI will no longer read `tree.json` and `genome_annotation.gff3` from the dataset, unless they are declared in the `pathogen.json`. These are optional files and we cannot assume their presence or filenames.

#### Warn user if input dataset contains extra files

Nextclade CLI will warn users when input datasets contains extra files which are not declared in the dataset's  pathogen.json, or if there's extra declarations of files in the pathogen.json, but the files are not actually present in the dataset. This is mostly only useful to dataset authors for debugging issues in their datasets.

#### Add Bioconda Linux ARM build

We added one more build variant to Bioconda distribution channel - for Linux operating system on 64-bit ARM hardware architecture. It uses `nextclade-aarch64-unknown-linux-gnu` executable underneath. This can be useful if you prefer to manage Nextclade CLI installation on your Linux ARM machine or in a Docker ARM container with Conda package manager. However, because Nextclade CLI is a self-contained single-file executable, we still recommend [direct downloads from GitHub Releases](https://github.com/nextstrain/nextclade/releases) rather than Conda or other installation methods.


## Nextclade CLI 3.3.1

### Fix crash when using `--verbosity` option

Nextclade was crashing with internal error when `--verbosity` option was present. This has been fixed.


## Nextclade Web 3.3.1

### Restrict Safari browser support to >= 16.5

Nextclade reports WebWorker-related errors when analysis is started on Safari browser. The minimum working version of Safari we were able to successfully test Nextclade on is 16.5. We still recommend using Chrome or Firefox for the best experience.


## Nextclade 3.3.0

### General

#### Allow FASTA files with leading newlines

Previously Nextclade would report an error "Expected character '>' at record start" when input FASTA file contained trailing newline or when it was empty. This was fixed.

### Nextclade Web

#### Don't run dataset suggestion when navigating to "Datasets" page

Dataset suggestion will no longer run each time "Datasets" page is opened

#### Upgrade Auspice tree renderer from version 2.51.0 to 2.52.1

See changelog [here](https://github.com/nextstrain/auspice/blob/master/CHANGELOG.md)


## Nextclade 3.2.1

### Nextclade CLI

#### Fix "Dataset not found" error when using `nextclade dataset get` with  `--tag` argument.

This fixes a bug in the dataset filtering logic causing "Dataset not found" error when even correct name and tag were requested using `nextclade dataset get` with  `--tag` argument.


## Nextclade 3.2.0

### General

#### Minimizer search algorithm configuration has been improved

Minimizer search algorithm used in dataset auto-suggestion in Nextclade Web as well as in `sort` command of Nextclade CLI.

The default value for minimum match score (`--min-score`) has been reduced from 0.3 to 0.1. The default value for minimum number of hits (`--min-hits`) required for a detection has been reduced from 10 to 5. This should allow to better handle more diverse viruses.

If there is a sufficiently large gap between dataset scores, the algorithm will now only consider the group of datasets before the gap. The gap size can be configured using `--max-score-gap` argument in Nextclade CLI. The default value is `0.2`.

Additionally, in Nextclade CLI `sort` command the algorithm now chooses only the best matching dataset. In order to select all matching datasets, the `--all-matches` flag has been added.


### Nextclade CLI

#### Sequence index in the output TSV file of the `sort` command

The TSV output of the `sort` command (requested with `--output-results-tsv`) now contains additional column: `index`. The cells under this column contain index of the corresponding input sequence in the FASTA file. These indices can be used in the downstream processing to reliably map input sequences to the output results. Sequence names alone can be unreliable because they are arbitrary strings which are not guaranteed to be unique.


## Nextclade 3.1.0

### CLI

#### PCR primers are back in Nextclade CLI

Due to popular demand, we are bringing back `--input-pcr-primers` argument for Nextclade CLI, which accepts a path to `primers.csv` file. The feature works just like it did prior to release of Nextclade v3, except `primers.csv` is never read from a dataset - you always need to provide it separately. At the same time, we removed support for `primers` field from `pathogen.json`, because it was too difficult to make a correct JSON object and it would conflict with the primers provided with `--input-pcr-primers`.

### Web

#### Fix results table stripes

Results table stripes are always alternating now, regardless of sorting and filtering applied. This is only a visual change and does not affect any functionality.

## Nextclade CLI 3.0.1

#### Bug fixes

- Fixed a bug introduced in v3.0.0 which caused the default path for translations to be incorrect. This affected only users who used `--output-all` without passing a custom path template via `--output-translations`. The new default path is `nextclade.cds_translation.{cds}.fasta` where `{cds}` gets replaced with the name of the CDS, e.g. `nextclade.cds_translation.S.fasta` for SARS-CoV-2's spike protein.

- Fixed a bug where `nextclade dataset get` command fails to download a dataset if a dataset has more than one version released.

#### Documentation

- Added a section to the v3 migration guide about the renamed default path for translations, a breaking change. The new default output path for translations is `nextclade.cds_translation.{cds}.fasta`. Before v3, the default path was `nextclade_gene_{gene}.translation.fasta`. You can emulate the old (default) behavior by passing `--output-translations="nextclade_gene_{cds}.translation.fasta"` to `nextclade3`.

## Nextclade Web 3.0.1

Fixed links on navigation bar: "Docs" and "CLI"

## 3.0.0

We are happy to present a major release of Nextclade, containing new features and bug fixes.

> ⚠️ This release contains breaking changes which may require your attention.

---

Useful links:

- [Nextclade Web v3](https://clades.nextstrain.org)
- [Nextclade Web v2](https://v2.clades.nextstrain.org) - if you need the old version, e.g. if you have custom v2 datasets
- [Nextclade CLI releases](https://github.com/nextstrain/nextclade/releases) - all versions
- [Nextclade user documentation](https://docs.nextstrain.org/projects/nextclade/en/stable/index.html) - for detailed instructions on how to use Nextclade Web and Nextclade CLI
- [Nextclade dataset curation guide](https://github.com/nextstrain/nextclade_data/blob/master/docs/dataset-curation-guide.md) - if you have a custom Nextclade dataset or want to create one
- [Nextclade source code repository](https://github.com/nextstrain/nextclade) - for contributors to Nextclade software (code, bug reports, feature requests etc.)
- [Nextclade data repository](https://github.com/nextstrain/nextclade_data) - for contributors to Nextclade datasets (add new datasets, update existing ones, report bugs, etc.)
- [Nextclade software issues](https://github.com/nextstrain/nextclade/issues) - to report bugs and ask questions about Nextclade software
- [Nextclade data issues](https://github.com/nextstrain/nextclade_data/issues) - to report bugs and ask questions about Nextclade datasets
- [Nextstrain discussion forum](https://discussion.nextstrain.org) - for general discussion and questions about Nextstrain

---

### BREAKING CHANGES

This section briefly lists breaking changes in Nextclade v3 compared to Nextclade v2. Please see [Nextclade v3 migration guide](https://docs.nextstrain.org/projects/nextclade/en/stable/user/migration-v3.html) ([alternative link](https://github.com/nextstrain/nextclade/blob/master/docs/user/migration-v3.md)) for a detailed description of each breaking change and of possible migration paths.

1. Nextalign CLI is removed, because Nextclade CLI can now do everything that Nextalign v2 did
2. Potentially different alignment and translation output due to changes in the seed alignment algorithm. Some of the alignment parameters are removed. Default parameters of new parameters might need to be adjusted.
3. Potentially different tree output due to a new tree builder algorithm.
4. Dataset file format and dataset names have changed.
5. Some CLI arguments for individual input files are removed.
6. Some output files are removed
7. Genome annotation CLI argument is renamed
8. URL parameters in Nextclade Web have changed
9. CDS instead of genes

The sections below list all changes - breaking and non-breaking. The breaking changes are denoted with word `[BREAKING]`.

If you encounter problems during migration, or breaking changes not mentioned in this document, please report it to the developers by [opening a new GitHub issue](https://github.com/nextstrain/nextclade/issues/new?title=[v3]).

---

### General changes

#### [BREAKING] Alignment

The seed matching algorithm was rewritten to be more robust and handle sequences with higher diversity. For example, RSV-A can now be aligned against RSV-B.

Parameters `minSeeds`, `seedLength`, `seedSpacing`, `minMatchRate`, `mismatchesAllowed`, `maxIndel` no longer have any effect and are removed.

New parameters `kmerLength`, `kmerDistance`, `minMatchLength`, `allowedMismatches`, `windowSize` are added.

Default values should work for sequences with a diversity of up to X%. For sequences with higher diversity, the parameters may need to be adjusted.

For short sequences, the threshold length to use full-matrix alignment is now determined based on `kmerLength` instead of the removed `seedLength`. The coefficient is adjusted to roughly match the old final value.

#### Genome annotation

##### Replace genes with CDSes

Nextclade now treats genes only as containers for CDSes ("CDS" is [coding sequence](https://en.wikipedia.org/wiki/Coding_region)). CDSes are the main unit of translation and a basis for AA mutations now. A gene can contain multiple CDSes, but they are handled independently.

##### Handle fragmentation of genetic features

A CDS can consist of multiple fragments. These fragments are extracted from the full nucleotide genome independently and joined together (in the order provided in the genome annotation) to form the nucleotide sequence of the CDS. The CDS is then translated and the resulting polypeptides are analyzed (mutations are detected etc.). This implementation allows to handle slippage (e.g. _ORF1ab_ in coronaviruses) and splicing (e.g. _tat_ and _rev_ in HIV-1).

##### Handle circular genomes

If genome annotation describes a CDS fragment as circular (wrapping around origin), Nextclade splits it into multiple linear (non-wrapping) fragments. The translation and analysis is then performed as if it was a linear genome.

Nextclade follows the [GFF3 specification](https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md#circular-genomes). Please refer to it for how to describe circular features.

##### Parse regions, genes and CDSes from GFF3 file

The GFF3 file parser has been augmented to support all the types of genetic features necessary for Nextclade to operate. There are still feature types which Nextclade ignores. We can consider supporting more types as scientific need arises.

#### Phylogenetic tree placement

Nextclade v3 now has the ability to phylogenetically resolve relationships between input sequences, where v2 would only attach each query sequence independently to the reference tree. Nextclade v3 thus may produce trees that are different from the trees produced in Nextclade v2.

Please read the [Phylogenetic placement](https://docs.nextstrain.org/projects/nextclade/en/stable/user/algorithm/05-phylogenetic-placement.html) section in the documentation for more details.

#### Don't count mutations to ambiguous nucleotides as reversions

We no longer treat mutations to ambiguous nucleotides as reversions, i.e. if the attachment node has a mutation mutated with respect to reference and the query sequence is ambiguous we previously counted this as a reversion. This change only affects “private mutation” QC score and the classification of private mutations into “reversion substitution” and “unlabeled substitution”.

---

### Changes in Nextclade Web

#### Dataset autosuggestion

Nextclade Web can now optionally suggest the most appropriate dataset(s) for user-provided input sequences. Drop your sequences and click "Suggest" to try out this feature.

#### Genome annotation widget

Following changes in genome annotation handling, the genome annotations widget in Nextclade Web now shows CDS fragments instead of genes.

#### CDS selector widget in Nextclade Web

The gene selector dropdown in Nextclade Web's results table has been transformed into a more general genetic feature selector. It shows the hierarchy of genetic features if there are nested features. Otherwise, the list is flat, to save screen space. It shows types of each of the genetic feature (gene, CDS or protein) as colorful badges. The menu is searchable, which is useful for mpox and other large viruses with many genes. Only CDSes can be selected currently, but we may extend this in the future to more feature types.

#### Show ambiguous nucleotides in sequence views

Nucleotide sequence views (in the results table) now also show colored markers for ambiguous nucleotides (non-ACTGN).

#### Improve website navigation

The row of buttons, containing "Back", "Tree" and other buttons is removed. Instead, different sections of the web application are always accessible via the main navigation bar.

The "Export" ("Download") and "Settings" sections are moved to dedicated pages.

#### [BREAKING] Changed and removed some of the URL parameters

Due to changes in the dataset format and input files, the URL parameters have the following changes:

- `input-root-seq` renamed to `input-ref`
- `input-gene-map` renamed to `input-annotation`
- `input-pathogen-json` added
- `input-qc-config` removed
- `input-pcr-primers` removed
- `input-virus-properties` removed
- `dataset-reference` removed

#### [BREAKING] Removed some redundant output files

The `nextclade.errors.csv` and `nextclade.insertions.csv` files are removed and no longer appear in the "Export" dialog, nor are they included into the `nextclade.zip` archive of all outputs.

Errors and insertions are now included in the `nextclade.csv` and `nextclade.tsv` files.

#### Auspice updated from v2.45.2 to v2.51.0

The Auspice tree viewer component is updated from version 2.45.2 to 2.51.0. See the [Auspice releases](https://github.com/nextstrain/auspice/releases) or [changelog](https://github.com/nextstrain/auspice/compare/v2.45.2...v2.51.0#diff-06572a96a58dc510037d5efa622f9bec8519bc1beab13c9f251e97e657a9d4ed).

---

### Changes in Nextclade CLI

#### [BREAKING] Nextalign CLI is removed

Nextalign CLI is no longer provided as a standalone application along with Nextclade CLI v3 because Nextclade now has all the features that distinguished Nextalign. This means there's only one set of command line arguments to remember.
Nextclade CLI runs the same algorithms, accepts same the inputs and provides the same outputs as v2 Nextalign, plus some more. For most use-cases, the CLI interface and the input and output files should be the same or very similar.

#### [BREAKING] Some alignment parameters are removed

Due to changes in the seed alignment algorithm, the following parameters are no longer used and the corresponding CLI arguments and JSON fields under `alignmentParams` in `pathogen.json` (previously `virus_properties.json`) were removed:

```text
--seed-length
--seed-spacing
--max-indel
--min-match-rate
--min-seeds
--mismatches-allowed
```

The following new alignment parameters were added:

```text
--allowed-mismatches
--kmer-distance
--kmer-length
--min-match-length
--min-seed-cover
--max-alignment-attempts
--max-band-area
--window-size
```

#### [BREAKING] Some CLI arguments for individual input files are removed

Due to changes in the dataset format the following CLI arguments were removed:

```text
--input-virus-properties
--input-qc-config
--input-pcr-primers
```

in favor of `--input-pathogen-json`.

#### [BREAKING] Some CLI arguments for output files are removed

The arguments `--output-errors` and `--output-insertions` have been removed. Their information is now included in `--output-csv` and `--output-tsv`.

#### [BREAKING] Genome annotation CLI argument is renamed

The argument `--input-gene-map` renamed to `--input-annotation`. The short form `-m` remains unchanged.

#### [Breaking] Translation selection CLI argument is renamed

The argument `--genes` is renamed to `--cds-selection`. The short form `-g` remains unchanged.

#### Newick tree output

Nextclade can now also export the tree in Newick format via the `--output-tree-nwk` argument.

#### Optional input files

Most input files and files inside datasets are now optional. This simplifies dataset creation and maintenance and allows for step-by-step, incremental extension of them.
You can start only with a reference sequence, which will only allow for alignment and very basic mutation calling in Nextclade, and later you can add more functionality.
Optional input files also enable the removal of Nextalign CLI.

If you maintain a custom dataset or want to try creating one - refer to our [Dataset curation guide](https://github.com/nextstrain/nextclade_data/blob/master/docs/dataset-curation-guide.md). Community contributed datasets are welcome!

#### Added flag for disabling the new tree builder

The old phylogenetic tree placement behavior can be restored by adding the `--without-greedy-tree-builder` flag.

#### New arguments in `dataset list` command

The new argument `--only-names` allows to print a concise list of dataset names:

```bash
nextclade dataset list --only-names
```

The new argument `--search` allows to search datasets using substring match with dataset name, dataset friendly name, reference name or reference accession:

```bash
nextclade dataset list --search=flu
```

The argument `--json` allows to output a JSON object instead of the table. You can write it into a file and to postprocess it:

```bash
nextclade dataset list --json > "dataset_list.json"
nextclade dataset list --json | jq '.[] | select(.path | startswith("nextstrain/sars-cov-2")) | .attributes'
```

#### New subcommand: `sort`

The `sort` subcommand takes your sequences in FASTA format and outputs sequences grouped by dataset in the form of a directory tree. Each subdirectory corresponds to a dataset and contains an output FASTA file with only sequences that are detected to be similar to the reference sequence in this dataset.

Example usage:

```bash
nextclade sort --output-dir="out/sort/" --output-results-tsv="out/sort.tsv" "input.fasta"
```

This can be useful for splitting FASTA files containing sequences which belong to different pathogens, strains or segments, for example for separating flu HA and NA segments.

#### New subcommand: `read-annotation`

The `read-annotation` subcommand takes a GFF3 file and displays how features are arranged hierarchically as viewed by Nextclade. This is useful for Nextclade developers and dataset creators to verify (and debug) how Nextclade understand genetic features from a particular GFF3 file.

Example usage:

```bash
nextclade read-annotation genome_annotation.gff3
```

Type `nextclade read-annotation --help` for description of arguments.

---

### Performance improvements

#### Nextclade web now twice as fast when processing many sequences

Nextclade Web now uses multithreading more effectively. This results in faster processing of large fastas on computers with more than one processor. The speedup is around 2 for 1000 SARS-CoV-2 sequences on a multi-core machine.

---

### Internal changes

#### Ensure type safety across programming language boundaries

The new features caused changes in major internal data structures and made them more complex. We now generate JSON schema and Typescript typings from Rust code. This allows to find mismatches between parts written in different languages, and to avoid bugs related to data types.

#### Make positions and ranges in different coord spaces type-safe

The change in genome annotation handling had significant consequences for coordinate spaces Nextclade is using internally (e.g. alignment space vs reference space, nuc space vs aa space, global nuc space vs nuc space local to a CDS). In order to make coordinate transforms safer, we introduced new `Position` and `Range` types, different for each space. This prevents mixing up coordinates in different spaces.

---

## Older versions

For changes in Nextclade v2 and below, see [docs/changes/CHANGELOG.old.md](docs/changes/CHANGELOG.old.md)
