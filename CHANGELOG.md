## 3.11.0

### Alignment presets

Nextclade CLI now supports `--alignment-preset` argument, which switches between pre-defined sets of alignment parameters. Currently available values are:
  - `default`: Suitable for aligning very similar sequences (this is the default)
  - `high-diversity`: Suitable for more diverse viruses
  - `short-sequences`: Suitable for short and partial sequences

This is an experimental feature. Presets are subject to change.


### Fix crash with empty reference sequence

Nextclade crashed when an empty reference sequence file is provided. Now Nextclade checks for this condition and reports a useful error message instead.


## 3.10.2

### Correctly handle comments in GFF3 files

Nextclade sometimes reported an error in GFF3 files containing comments. This has been fixed now.

### [cli] Fix verbosity CLI arguments

The Nextclade CLI arguments `-v` and `-q` were having no effect after a recent update. This has been fixed now.


## 3.10.1

### [web] Fetch custom inputs from URLs using correct "Accept" HTTP header

Fixes Nextclade Web adding header `Accept: application/json, text/plain, */*` when making `GET` HTTP requests when fetching input files from use-provided URLs. This caused problems when fetching files from sources which allow to choose between different file formats using `Accept` header. The response would come in JSON format and this is not what we want. Now we add `Accept: text/plain, */*`, preferentially fetching all inputs as plaintext, as intended.


## Nextclade 3.10.0

### [web] Add links to open reference trees in nextstrain.org

You can now click on "Open tree" link in the dataset info box to open reference tree of this dataset on [nextstrain.org](https://nextstrain.org/). This allows to browse the current trees for each dataset without running Nextclade analysis. If a dataset does not provide a reference tree, the link will be disabled.


### [web] Correctly disable "Load example" links

The "Load example" links are now correctly disabled, not hidden, for the datasets which do not provide example sequence data.


## Nextclade 3.9.1

### Fix: clade mismatch between placed node and parent node

This version addresses an issue when sometimes clade (or clade-like attribute, such as lineage) of the placed query node might not always match the clade of its parent.

The query node placement is adjusted during the [greedy tree building](https://docs.nextstrain.org/projects/nextclade/en/stable/user/algorithm/03-phylogenetic-placement.html#tree-building), and sometimes the branch needs to be split and a new auxiliary internal node to be inserted to accommodate the new node. Previously, Nextclade would copy the clade of this internal node from the attachment target node. However, this is not always correct and can lead to mismatch between clade of the query node and of the new internal node.

In this version we added a voting mechanism, which calculates a [mode](https://en.wikipedia.org/wiki/Mode_(statistics)) of the clades involved: of the parent, target and query nodes. The same procedure is repeated for each clade-like attribute. After that, in some cases, branch labels also need to adjust their positions.

This should not change the clade assignment for query samples, but only the clades of the inserted auxiliary internal nodes, to make sure that the tree is consistent.


## Nextclade 3.9.0

### Nextclade CLI: Obtain CA certificates from platform trust store; add `NEXTCLADE_EXTRA_CA_CERTS` / `--extra-ca-certs`

Nextclade CLI users have previously reported issues with CA certificates when fetching datasets from an organization's network (e.g. in a university or in a company).

Starting with this version, Nextclade CLI respects the OS-level trust store configurations. This includes private CAs and self-signed certificates. Ensures backward compatibility and functionality across different platforms, including those lacking a native trust store or with outdated ones.

We introduced a `NEXTCLADE_EXTRA_CA_CERTS` environment variable and `--extra-ca-certs` option which allow adding additional CA certificates to the trust store specifically for Nextclade, for when modifying the system's trust store isn't desirable/possible. See [#1536](https://github.com/nextstrain/nextclade/pull/1536) for more details.


### Update Auspice tree visualization to 2.58.0

Auspice tree visualization package has been updated from 2.56.0 to 2.58.0. See Auspice changelog [here](https://github.com/nextstrain/auspice/releases).


## Nextclade 3.8.2

### Fix detection of number of threads Nextclade Web

Sometimes Nextclade Web would detect incorrect number of available CPU threads and would create too many processing threads for processing. This could cause additional overhead and slowdown the runs. We observed this behavior on non_chromium based browsers, such as Firefox and Safari. This has been fixed now. The number of threads has been clamped to 3 by default. You can modify this in "Settings" dialog.

## Nextclade 3.8.1

### Fix crash when using column config in Nextclade Web

Since 3.8.0 Nextclade could crash when particular combinations of CSV/TSV columns selected in "Column config" tab on "Export" page in Nextclade Web or with `--output-columns-selection` argument in Nextclade CLI. This has been resolved.

### Remove extra spaces in ref node selector

Remove extra spaces in the text of entries in the "Relative to" dropdown selector in Nextclade Web.

## Nextclade 3.8.0

### Relative mutations

Nextclade now calls mutations relative to multiple targets. Additionally, to previously available mutations relative to reference and mutations relative to parent tree node (private mutations), Nextclade now calls mutations relative to clade founder tree nodes, and relative to custom nodes of interest if defined in the dataset (e.g. vaccine strains).

Nextclade Web now has an additional dropdown selector for the target of mutation calling. Output files has new columns/fields for mutations relative to clade founders (`founderMuts`) as well as for mutations relative to custom nodes (`relativeMutations`).

See [documentation](https://docs.nextstrain.org/projects/nextclade/en/stable/user/algorithm/05-mutation-calling.html) for more details.

### Update Auspice tree visualization to 2.56.0

Auspice tree visualization package has been updated from 2.55.0 to 2.56.0. See Auspice changelog [here](https://github.com/nextstrain/auspice/releases).

## Nextclade 3.7.4

### Nextclade Web

### Upgrade Auspice to 2.55.0, add polyfills

This definitively resolves crash due to missing JavaScript polyfills, which occurred in Nextclade Web 3.7.2

## Nextclade 3.7.3

### Nextclade Web

### Fix crash on tree page in Nextclade Web

Temporarily downgrade Auspice from 2.55.0 to 2.54.3 to prevent the tree page in Nextclade Web from crashing. The definitive fix will follow.

## Nextclade 3.7.2

### General

### [fix] Avoid duplicate node names in the output Auspice JSON tree

When multiple query samples were to be placed onto the same node on the reference tree, sometimes multiple auxiliary nodes could be created having the same name. Node names are expected to be unique for Auspice visualization to work correctly, so when visualizing the tree Auspice have been renaming these nodes and emitting warnings into browsers' dev console.

In this version we pick unique names for the auxiliary nodes during placement, so that there are no more warnings. Users may observe changes in some of the node names when inspecting output Auspice JSON file. However, this unlikely to affect most users' work.

### Nextclade Web

### [fix] Ensure dataset "updated at" date is displayed in Nextclade Web

Since 3.7.0 Nextclade Web is not showing  "updated at" date for any datasets. This has been fixed.

### [fix] Ensure frame shift and insertion markers in sequence views can also be toggled

Most markers can be toggled on or off on the sequence views in "Settings" page in Nextclade Web, however frame shifts and insertions could not be. We added the missing toggles.

### [fix] Correctly style details/summary component

The text in details/summary ("collapse", "spoiler") component (e.g. the list of SC2 lineages) overflowing and producing garbled text in dataset readmes and changelogs. This has been fixed.

### [dep] Update Auspice tree visualization to 2.55.0

Auspice tree visualization package has been updated from 2.53.0 to 2.55.0. See Auspice changelog [here](https://github.com/nextstrain/auspice/releases).

### Internal

### [infra] Fix feature-policy and permission-policy HTTP headers

The deprecated `feature-policy` header was removed entirely and `interest-cohort` entry was removed from the `permission-policy` header. Latest versions of web browsers should no longer emit warnings into console.

### [test] Test Nextclade CLI on more Linx distros

Additionally to the previous, we now test Nextclade CLI on the following newer Linux distributions:

- Amazon Linux 2.0.2024
- Debian 12
- Fedora 41
- Oracle Linux 8.9
- Ubuntu 24.04

## Nextclade 3.7.1

### Warn if reference sequence does not match root sequence of the tree

When both a standalone reference sequence and Auspice tree containing `.root.sequence.nuc` are present, Nextclade will check that these are the same sequence. If not, a warning is emitted to stderr for Nextclade CLI and to browser's dev console for Nextclade Web. This is mostly useful for dataset authors, for debugging.

### Fix error when selecting a CDS in genome annotation visualization in Nextclade Web

Nextclade sometimes displayed an error in the peptide view when switching CDS by clicking on annotation visualization. This has been fixed now.

## Nextclade 3.7.0

#### Use Auspice JSON as a full dataset (experimental)

Nextclade can now optionally use Auspice datasets (in Auspice v2 JSON format) not only as reference trees, but also as self-contained full Nextclade datasets. Nextclade will take pathogen info, genome annotation, reference sequence, and, of course, reference tree from Auspice JSON. No other files are needed. This allows to use almost any Auspice dataset (e.g. from [nextstrain.org](https://nextstrain.org)) as Nextclade dataset.

- In Nextclade CLI, `--input-dataset` argument now also accepts a path to Auspice JSON file (in addition to accepting the usual paths to a dataset directory and zip archive)

- Nextclade Web now has a new URL parameter `dataset-json-url`, which accepts a URL to Auspice JSON file or even to a dataset URL on nextstrain.org

This feature is currently in experimental stage. For details and discussion see PR [#1455](https://github.com/nextstrain/nextclade/pull/1455).

#### Make reference tree branch attributes optional

Nextclade now accepts Auspice JSONs without `.branch_attrs` on tree nodes.

#### Allow `index` and `seqName` in column selection

Previously, Nextclade treated output CSV/TSV columns index and seqName as mandatory and they were always present in the output files. In this release they are made configurable. One can:

- in CLI: add or omit `index` and `seqName` values when using `--output-columns-selection` argument
- in Web: tick or untick checkboxes for `index` and `seqName` in "Column config" tab of "Export" page

#### Add dataset capabilities

The table in the `nextclade dataset list` command now displays an additional column "capabilities", which lists dataset capabilities, i.e. whether dataset contains information allowing clade assignment, QC, etc. The same information is available in JSON format (unstable) if you pass `--json` flag.

## Nextclade 3.6.0

#### Make reference tree node attribute `clade_membership` optional

Previously Nextclade required clade information to be always present in the input reference tree in the form of the `.node_attrs.clade_membership` field on each tree node. However, for certain datasets we might not have or need clade information. Making such datasets required workarounds, such as adding an empty string to the `clade_membership` field.

In this version we make `clade_membership` field optional. This allows to make datasets without clades. This is useful when working with organisms for which clades don't make sense or for which the nomenclature is not sufficiently established. This is also useful for dataset authors, who can now bootstrap simple datasets without clades first and then add clades and other features gradually later.

With this change, if `clade_membership` is not present in the dataset's reference tree nodes, then

- Clade assignment will not run

- Any clade-related functionality will not work

- Output JSON/NDJSON result entries will not contain clade field

- Clade column in output CSV/TSV will be empty

- Clade column in Nextclade Web will be empty

This change does not affect any other parts of the application. Notably, clade-like attributes (from `.meta.extensions.nextclade.clade_node_attrs`), if present, are still assigned and being written to the output as before.

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

Nextclade CLI will warn users when input datasets contains extra files which are not declared in the dataset's pathogen.json, or if there's extra declarations of files in the pathogen.json, but the files are not actually present in the dataset. This is mostly only useful to dataset authors for debugging issues in their datasets.

#### Add Bioconda Linux ARM build

We added one more build variant to Bioconda distribution channel - for Linux operating system on 64-bit ARM hardware architecture. It uses `nextclade-aarch64-unknown-linux-gnu` executable underneath. This can be useful if you prefer to manage Nextclade CLI installation on your Linux ARM machine or in a Docker ARM container with Conda package manager. However, because Nextclade CLI is a self-contained single-file executable, we still recommend [direct downloads from GitHub Releases](https://github.com/nextstrain/nextclade/releases) rather than Conda or other installation methods.

## Nextclade 3.3.1

### Fix crash when using `--verbosity` option

Nextclade was crashing with internal error when `--verbosity` option was present. This has been fixed.

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

## Nextclade 3.0.1

#### Bug fixes

- Fixed a bug introduced in v3.0.0 which caused the default path for translations to be incorrect. This affected only users who used `--output-all` without passing a custom path template via `--output-translations`. The new default path is `nextclade.cds_translation.{cds}.fasta` where `{cds}` gets replaced with the name of the CDS, e.g. `nextclade.cds_translation.S.fasta` for SARS-CoV-2's spike protein.

- Fixed a bug where `nextclade dataset get` command fails to download a dataset if a dataset has more than one version released.

#### Documentation

- Added a section to the v3 migration guide about the renamed default path for translations, a breaking change. The new default output path for translations is `nextclade.cds_translation.{cds}.fasta`. Before v3, the default path was `nextclade_gene_{gene}.translation.fasta`. You can emulate the old (default) behavior by passing `--output-translations="nextclade_gene_{cds}.translation.fasta"` to `nextclade3`.

### Fix links

Fixed links on navigation bar: "Docs" and "CLI"

## Nextclade 3.0.0

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

For changes in older versions, see [docs/changes/CHANGELOG.old.md](https://github.com/nextstrain/nextclade/blob/master/docs/changes/CHANGELOG.old.md)
