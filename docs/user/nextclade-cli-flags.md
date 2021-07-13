
# Nextclade Command-line interface (CLI)

Nextclade CLI is available as a self-contained executable for the most popular platforms.

The latest downloads are available at https://github.com/nextstrain/nextclade/releases

Docker container images are available at https://hub.docker.com/r/nextstrain/nextclade

After obtaining the Nextclade CLI, type `nextclade --help` to display built-in help with the description of command-line flags and usage example.


## Inputs

### Description of the input data

Nextclade expects the following input data:

- (required) Sequences to be analyzed.

  CLI flag: `--input-fasta`

  Accepted formats: [FASTA](https://en.wikipedia.org/wiki/FASTA_format), plain text (one sequence per line).

- (required) Reference (root) sequence. Required to be the root of the provided reference phylogenetic tree (see below).

  CLI flag: `--input-root-sequence`

  It is used as a reference for alignment and for mutation calling. Reference sequence is expected to be of a very high quality, preferably a complete (fill length of the genome, no missing data) and unambiguous (no ambiguous nucleotides).

  Accepted formats: [FASTA](https://en.wikipedia.org/wiki/FASTA_format), plain text (one sequence per line).

- (required) Reference phylogenetic tree, rooted at the reference (root) sequence.

  CLI flag: `--input-tree`

  It is used to assign clades and as a target for phylogenetic placement. The tree is expected to be sufficiently diverse and to meet clade assignment expectations of a particular use-case, study or experiment. Only clades present on the reference tree will be assigned. For more details see "Clade assignment" and "Phylogenetic placement" sections below).

  Accepted formats: Auspice JSON v2 ([description](https://nextstrain.org/docs/bioinformatics/data-formats), [schema](https://github.com/nextstrain/augur/blob/master/augur/data/schema-export-v2.json)) - this is the same format that is used in Nextstrain (produced by Augur and consumed by Auspice).

- (required) Quality control configuration.

  CLI flag: `--input-qc-config`

  A set of parameters and thresholds used to configure the QC checks. These should be tuned for the particular study or experiment, considering quality and tolerances of sequencing results of a given laboratory.

  Accepted formats: JSON

- (optional, recommended) Gene map (genome annotations) - a table describing the genes of the virus (frame, position, etc.).

  CLI flag: `--input-gene-map`

  It is used for the improved codon-aware alignment, for gene translation, calling of aminoacid mutations. Without Gene map, peptides will not be output and aminoacid mutations will not be detected. Also, without Gene map the nucleotide alignment step will not be informed by the codon information.

  Accepted formats: [GFF3](https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md)

- (required) Only in CLI. A subset of genes to use during analysis.

  Only these genes will be translated and only in these genes the aminoacid mutations will be detected.

  Accepted formats: comma-delimited list of gene names. All gene names in the list MUST be present in the gene map (see `--input-gene-map`).

  CLI flag: `--genes`

- (optional) Table of PCR primers - a table that describes a set of PCR primers that might be used for PCR tests of the virus.

  CLI flag: `--input-pcr-primers`

  Used to detect changes in PCR primer regions. Without this table these checks will not be  performed.

  Accepted formats: CSV

  Note: the primers are processed differently depending on the primer type. The type is deduced from the primer's name suffix. Conventions that are used:

  - `_F` - forward primer
  - `_R` - reverse primer
  - `_P` - probe

### Example data

Nextclade GitHub repository contains example data in the `data/` directory. Maintainers periodically update these files (including the reference trees), and these is the recommended starting point for your experiments.

https://github.com/nextstrain/nextclade/tree/master/data




## Results and interpretation

### Output files

This section describes files produced by Nextclade.

You can download these files from Nextclade Web using "Export" button (note that there is no real download, all files are generated right in your browser).

Nextclade CLI writes these files into paths specified with a family of `--output*` flags.

#### Aligned nucleotide sequences

Aligned sequences are produced as a result of the nucleotide alignment step and are being output in FASTA format. The file contains the aligned reference sequence as the first entry (requires `--include-reference` flag in CLI version), followed by the aligned query sequences.

#### Aligned peptides

Aligned peptides are produced as a result of the translation and peptide alignment step and are being output in FASTA format. There are multiple files, one for each gene. Each file contains the aligned reference peptide as the first entry (requires `--include-reference` flag in CLI version), followed by the aligned query sequences.

#### Analysis results

The results of mutation calling, clade assignment, quality control and PCR primer changes can be obtained in either TSV, CSV, or JSON format.

TSV and CSV files are equivalent and only differ in the column delimiter (tabs vs semicolons), for better compatibility with spreadsheet software and data-science packages. Tabular format of TSV/CSV files are somewhat more human-friendly, are convenient for the immediate inspection and for simple automated processing.

They contain the following columns:

TODO: describe columns

JSON results file is best for in-depth automated processing of results. It contains everything tabular files contain, plus more, in a more machine-friendly format.

TODO: add JSON schema

#### Stripped insertions

Nextclade strips insertions relative to the reference from aligned query sequences, so that they no longer appear in the output sequences. It outputs information about these insertions in CSV format.

The file contains the following columns (delimited by commas):

- `seqName` - Name of the sequence, as in the input FASTA file

- `insertions` - A string containing semicolon-separated insertions. Each insertion is in format `<begin>:<seq>`, where `<begin>` is the starting position of the insertion in the aligned sequence, `<seq>` is the nucleotide sequence fragment that was removed.

#### Output phylogenetic tree

TODO: write this section



### Source code

Nextclade is free and opensource. The source code for the algorithms, web application and CLI is available on [Github](https://github.com/nextstrain/nextclade). You can build Nextclade yourself and run web application locally. For details, refer to the readme file in the repository.

### How to contribute to Nextclade?

We welcome contributions in any form.

Please report bugs and request features using GitHub Issues:
https://github.com/nextstrain/nextclade/issues/new

For questions and general discussion join Nextstrain discussion forum:
https://discussion.nextstrain.org

If you are a developer, head to https://github.com/nextstrain/nextclade for the source code and developer's guide.

