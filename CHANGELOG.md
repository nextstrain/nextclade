## Unreleased

We are happy to present a major release of Nextclade, containing new features and bug fixes.

> ⚠️ This release contains breaking changes which may require your attention.

---

Useful links:

- [Nextclade Web v3](https://clades.nextstrain.org)
- [Nextclade Web v2](https://v2.clades.nextstrain.org) - if you need the old version
- [Nextclade CLI releases](https://github.com/nextstrain/nextclade/releases) - all versions
- [Nextclade user documentation](https://docs.nextstrain.org/projects/nextclade/en/stable/index.html) - for detailed instructions on how to use Nextclade Web and Nextclade CLI
- [Nextclade dataset curation guide](https://github.com/nextstrain/nextclade_data/blob/master/docs/dataset-curation-guide.md)  - if you have a custom Nextclade dataset or want to create one
- [Nextclade source code repository](https://github.com/nextstrain/nextclade) - for contributors to Nextclade software (code, bug reports, feature requests etc.)
- [Nextclade data repository](https://github.com/nextstrain/nextclade_data) - for contributors to Nextclade datasets (add new pathogens, report bugs, etc.)
- [Nextclade software issues](https://github.com/nextstrain/nextclade/issues) - to report bugs and ask questions about Nextclade software
- [Nextclade data issues](https://github.com/nextstrain/nextclade_data/issues) - to report bugs and ask questions about Nextclade datasets
- [Nextstrain discussion forum](https://discussion.nextstrain.org) - for general discussion and questions

---

### BREAKING CHANGES

This section briefly lists breaking changes in Nextclade v3 compared to Nextclade v2. Please see [Nextclade v3 migration guide](https://docs.nextstrain.org/projects/nextclade/en/stable/user/migration-v3.html) ([alternative link](https://github.com/nextstrain/nextclade/blob/master/docs/user/migration-v3.md)) for the detailed description of each change and of possible migration paths.

1. Nextalign CLI is removed.
2. Potentially different alignment and translation output due to changes in seed alignment algorithm. Some of the alignment parameters is removed.
3. Potentially different tree output due to tree builder algorithm.
4. Dataset file format and dataset names have changed.
5. Some CLI arguments for individual input files are removed.
6. Some output files are removed
7. Genome annotation CLI argument is renamed
8. URL parameters in Nextclade Web have changed

The sections below list all changes - breaking and non-breaking. The breaking changes are denoted with word `[BREAKING]`.

If you encounter problems during migration, or breaking changes not mentioned in this document, please report it to developers by [opening a new GitHub issue](https://github.com/nextstrain/nextclade/issues).

---

### General changes

#### [BREAKING] Alignment

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

#### Phylogenetic tree placement

Nextclade v3 now has the ability to phylogenetically resolve relationships between input sequences, where v2 would only attach sequences to the reference tree. Nextclade v3 thus may produce trees that are different from the trees produced in Nextclade v2.

Please read the [Phylogenetic placement](https://docs.nextstrain.org/projects/nextclade/en/stable/user/algorithm/05-phylogenetic-placement.html) section in the documentation for more details.

#### Don't count mutations to ambiguous nucleotides as reversions

We no longer treat mutations to ambiguous nucleotides as reversions, i.e. if the attachment node has a mutation mutated with respect to reference and the query sequence is ambiguous we previously counted this as a reversion. This change only affects “private mutation” QC score and the classification of private mutations into “reversion substitution” and “unlabeled substitution”.

---

### Changes in Nextclade Web

#### Dataset autosuggestion

Nextclade Web now can now guess the most appropriate dataset from input sequences. For that use the autosuggestion feature in the user interface.

#### Genome annotation widget

Following changes in genome annotation handling, the genome annotations widget in Nextclade Web now shows CDS fragments instead of genes.

#### CDS selector widget in Nextclade Web

Gene selector dropdown in Nextclade Web has been transformed into a more general genetic feature selector. It shows hierarchy of genetic features if there's any nested features. Otherwise, the list is flat, to save screen space. It shows types of each of the genetic feature (gene, CDS or protein) as colorful badges. The menu is searchable, which is useful for mpx and other large viruses. Only CDSes can be selected currently, but we may extend this in the future to more feature types.

#### Show ambiguous nucleotides in sequence views

Nucleotide sequence views (in the results table) now also show colored markers for ambiguous nucleotides (non-ACTGN)

#### Improve website navigation

The row of buttons, containing "Back", "Tree" and other buttons is removed. Instead, different sections of the web application are always accessible on main navigation bar.

The "Export" ("Download") and "Settings" sections are now moved to dedicated pages.

#### [BREAKING] Changed and removed some of the URL parameters

Due to changes in dataset format and input files, the URL parameters have the following changes:

- `input-root-seq` renamed to `input-ref`
- `input-gene-map` renamed to `input-annotation`
- `input-qc-config` removed
- `input-pcr-primers` removed
- `input-virus-properties` removed
- `input-pathogen-json` added
- `dataset-reference` removed

#### [BREAKING] Removed some of the output files

The `nextclade.errors.csv` and `nextclade.insertions.csv` files are removed and no longer appear in the "Export" dialog, nor they are included into the `nextclade.zip` archive of all outputs.

Download and use `nextclade.tsv` or `nextclade.csv` files instead.

---

### Changes in Nextclade CLI

#### [BREAKING] Nextalign CLI is removed

Nextalign CLI is no longer provided as a standalone application along with Nextclade CLI v3. You can now use Nextclade CLI with the same command line arguments. Nextclade CLI runs the same algorithms, accepts same inputs and provides the same outputs, plus some more. For most use-cases, the CLI interface and the input and output files should be the same or very similar.

#### [BREAKING] Some alignment parameters are removed

Due to changes in the seed alignment algorithm, the following parameters are no longer used and the corresponding CLI arguments and JSON fields under `alignmentParams` in `pathogen.json` (previously `virus_properties.json`) were removed:

  ```text
  --min-seeds         
  --seed-length       
  --seed-spacing      
  --min-match-rate    
  --mismatches-allowed
  --max-indel         
  ```

The following alignment parameters were added:

  ```text
  --kmer-length       
  --kmer-distance     
  --min-match-length  
  --allowed-mismatches
  --window-size       
  ```

#### [BREAKING] Some CLI arguments for individual input files are removed

Due to changes in dataset format the following CLI arguments were removed:

```text
--input-virus-properties
--input-qc-config
--input-pcr-primers
```

in favor of `--input-pathogen-json`.

#### [BREAKING] Some CLI arguments for output files are removed

The arguments `--output-errors` and `--output-insertions` have been removed in favor of `--output-csv` and `--output-tsv`.

#### [BREAKING] Genome annotation CLI argument is renamed

The argument `--input-gene-map` renamed to `--input-annotation`.

#### Newick tree output

Nextclade can now also export the tree in Newick format.

#### Optional input files

Most input files and files inside datasets are now optional. This simplifies dataset creation and maintenance and allows for step-by-step, incremental extension of them. You can start only with a reference sequence, which will only allow for alignment and very basic mutation calling in Nextclade, and later you can add more functionality.

If you maintain a custom dataset of want to try creating one - refer to our [Dataset curation guide](https://github.com/nextstrain/nextclade_data/blob/master/docs/dataset-curation-guide.md).

#### Added flag for disabling the new tree builder

The old phylogenetic tree placement behavior can be restored by adding  `--without-greedy-tree-builder` flag to `run` subcommand.

#### New arguments in `dataset list` command

The new argument `--only-names` allows to print a concise list of dataset names:

```bash
nextclade dataset list --only-names
```

The new argument `--json` allows to output a JSON object instead of the table. You can write it into a file and to postprocess it:

```bash
nextclade dataset list --json > "dataset_list.json"
nextclade dataset list --json | jq '.[] | select(.path | startswith("nextstrain/sars-cov-2")) | .attributes'
```

The new argument `--search` allows to search datasets using substring match with dataset name, dataset friendly name, reference name or reference accession:

```bash
nextclade dataset list --search=flu
```

#### New subcommand: `sort`

The `sort` subcommand takes your sequences in FASTA format and output sequences grouped by dataset in the form of a directory tree. Each subdirectory corresponds to a dataset and contains output FASTA file with only sequences that are detected to be similar to the reference sequence in this dataset.

Example usage:

```bash
nextclade sort --output-dir="out/sort/" --output-results-tsv="out/sort.tsv" "input.fasta"
```

This can be useful for splitting FASTA files containing sequences which belong to different pathogens or to different strains, for example for separating flu HA and NA segments.

#### New subcommand: `read-annotation`

The `read-annotation` subcommand takes a GFF3 file and displays how features are arranged hierarchically as viewed by Nextclade. This might be useful for Nextclade developers and dataset curators in oder to verify that Nextclade correctly understand genetic features from a particular GFF3 file.

Example usage:

```bash
nextclade read-annotation genome_annotation.gff3
```

Type `nextclade read-annotation --help` for description of arguments.


---

### Internal changes

#### Ensure type safety across programming language boundaries

The new features caused change in major internal data structures and made them more complex. We now generate JSON schema and Typescript typings from Rust code. This allows to find mismatches between parts written in different languages, and to avoid bugs related to data types.

#### Make positions and ranges in different coord spaces type-safe

The change in genome annotation handling had significant consequences for coordinate spaces Nextclade is using internally (e.g. alignment space vs reference space, nuc space vs aa space, global nuc space vs nuc space local to a CDS). In order to make coordinate transforms safer, we introduced new `Position` and `Range` types, different for each space. This prevents mixing up coordinates in different spaces.

---

## Older versions

For changes in Nextclade v2 and downwards, see [docs/changes/CHANGELOG.old.md](docs/changes/CHANGELOG.old.md)
