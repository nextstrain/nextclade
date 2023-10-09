## Unreleased

We are happy to present a major release of Nextclade, containing new features and bug fixes. This release contains breaking changes which may require your attention.

Useful links:

- [Nextclade Web v3](https://clades.nextstrain.org)
- [Nextclade Web v2](https://v2.clades.nextstrain.org) - if you need the old version
- [Nextclade user documentation](https://docs.nextstrain.org/projects/nextclade/en/stable/index.html) - for detailed instructions on how to use Nextclade Web and Nextclade CLI
- [Nextclade dataset documentation](https://github.com/nextstrain/nextclade_data/blob/master/docs/dataset-curation-guide.md) - if you have a custom Nextclade dataset or want to create one
- [Nextclade source code repository](https://github.com/nextstrain/nextclade) - for contributors to Nextclade software (code, bug reports, feature requests etc.)
- [Nextclade dataset repository](https://github.com/nextstrain/nextclade_data) - for contributors to Nextclade datasets (data, bug reports, feature requests etc.)
- [Nextstrain discussion forum](https://discussion.nextstrain.org) - for general discussion and questions

### BREAKING CHANGES

This section lists breaking changes in Nextclade v3 as well as migration paths from Nextclade v2.

#### 1. Nextalign CLI is removed

We no longer provide Nextalign CLI as a standalone application. You can new use Nextclade CLI with the same command line arguments. Nextclade CLI runs the same algorithms, accepts same inputs and provides the same outputs, plus some more.

Migration paths: In your Nextalign command-line invocation, replace word `nextalign` to `nextclade`. When downloading - use Nextclade download links or docker images.

#### 2.

#### 3.

---

### General changes

#### Genome annotation

##### Replace genes with CDSes

Nextclade now treats genes only as containers for CDSes ("CDS" is [coding sequence](https://en.wikipedia.org/wiki/Coding_region)). CDSes are the main unit of translation and a basis for AA mutations now. A gene can contain multiple CDSes, but they are handled independently.

##### Handle fragmentation of genetic features.

A CDS can consist of multiple fragments. These fragments are extracted from the full nucleotide genome independently and joined together (in the order provided in the genome annotation) to form the nucleotide sequence of the CDS. The CDS is then translated and the resulting polypeptides are analyzed (mutations are detected etc). This implementation allows to handle slippage and splicing.

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
