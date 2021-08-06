# Nextclade CLI

Nextclade is a tool that identifies differences between your sequences and a reference sequence used by Nextstrain, uses these differences to assign your sequences to clades, and reports potential sequence quality issues in your data. You can use the tool to analyze sequences before you upload them to a database, or if you want to assign Nextstrain clades to a set of sequences.

You can learn more about the algorithm in the [Algorithm](algorithm) section.


## Installation (with docker)

Container images are available at Docker Hub: 🐋 [nextstrain/nextclade](https://hub.docker.com/repository/docker/nextstrain/nextclade)

Pull and run the latest version with:

```bash
docker pull nextstrain/nextclade:latest
docker run -it --rm nextstrain/nextclade:latest nextclade --help
```

Pull and run a specific version with:

```bash
docker run -it --rm nextstrain/nextclade:1.0.0 nextclade --help
```

Don't forget to mount necessary volumes to be able to supply the data inside the container and to access the results.

## Installation (local)

### Download manually

You can download the latest version of Nextclade CLI for your platform using one of these direct links:

- ⬇️ [Nextclade for Linux (x86_64)](https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-Linux-x86_64)
- ⬇️ [Nextclade for macOS (Intel, x86_64)](https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-MacOS-x86_64)
- ⬇️ [Nextclade for macOS (Apple Silicon, ARM64)](https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-MacOS-arm64)

All versions and their release notes are available on 🐈 [Github Releases](https://github.com/nextstrain/nextclade/releases).

These executables are self-contained and don't require any dependencies. They can be renamed and moved freely. It is convenient to rename the executable to `nextclade` and to move to one of the directories included in system `$PATH`, so that it's available from any directory in the console.

> ⚠️ Note that macOS executables are not currently signed with a developer certificate (it requires maintaining a paid Apple developer account). Recent versions of macOS might refuse to run the executable. Before invoking Nextclade on command line, follow these steps to add Nextclade to the exclude list:
> <a target="_blank" rel="noopener noreferrer" href="https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unidentified-developer-mh40616/mac">
macOS User Guide: Open a Mac app from an unidentified developer</a>, and check <a target="_blank" rel="noopener noreferrer" href="https://support.apple.com/en-us/HT202491">
Security settings</a>. Refer to the latest macOS documentation if none of this works.

> ⚠️ Native Windows executables are not available at this time. Windows users can try one of the following:
>
> - Download the Linux executable (see above) and run it under [Windows Subsystem for Linux (WSL)](https://docs.microsoft.com/en-us/windows/wsl/install-win10)
> - Use [Docker container image](#installation-with-docker)
> - Rent a Linux machine, for example at a cloud compute provider or on premises of your organization or university
>

### Download from command line

The following commands can be used to download nextclade from command line, from shell scripts and inside dockerfiles:

<p>
<details>
<summary>
🐧 Linux (x86_64) (click to expand)
</summary>

Download latest version:

```bash
curl -fsSL "https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-Linux-x86_64" -o "nextclade" && chmod +x nextclade
```

Download specific version:

```bash
NEXTCLADE_VERSION=1.0.0 curl -fsSL "https://github.com/nextstrain/nextclade/releases/download/nextclade-${NEXTCLADE_VERSION}/nextclade-Linux-x86_64" -o "nextclade" && chmod +x nextclade
```

</details>
</p>

<p>
<details>
<summary>
🍏 macOS (Intel, x86_64) (click to expand)
</summary>

Download latest version:

```bash
curl -fsSL "https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-MacOS-x86_64" -o "nextclade" && chmod +x nextclade
```

Download specific version:

```bash
NEXTCLADE_VERSION=1.0.0 curl -fsSL "https://github.com/nextstrain/nextclade/releases/download/nextclade-${NEXTCLADE_VERSION}/nextclade-MacOS-x86_64" -o "nextclade" && chmod +x nextclade
```

</details>
</p>

<p>
<details>
<summary>
🍎 macOS (Apple Silicon, ARM64) (click to expand)
</summary>

Download latest version:

```bash
curl -fsSL "https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-MacOS-arm64" -o "nextclade" && chmod +x nextclade
```

Download specific version:

```bash
NEXTCLADE_VERSION=1.0.0 curl -fsSL "https://github.com/nextstrain/nextclade/releases/download/nextclade-${NEXTCLADE_VERSION}/nextclade-MacOS-arm64" -o "nextclade" && chmod +x nextclade
```

</details>
</p>

## Usage

Refer to help prompt for usage of Nextclade:

```bash
nextclade --help
```

## Quick Example

1. Download the example SARS-CoV-2 data files from [GitHub](https://github.com/nextstrain/nextclade/tree/master/data/sars-cov-2)

2. Run:

   ```bash
   nextclade \
      --in-order \
      --input-fasta=data/sars-cov-2/sequences.fasta \
      --input-root-seq=data/sars-cov-2/reference.fasta \
      --genes=E,M,N,ORF1a,ORF1b,ORF3a,ORF6,ORF7a,ORF7b,ORF8,ORF9b,S \
      --input-gene-map=data/sars-cov-2/genemap.gff \
      --input-tree=data/sars-cov-2/tree.json \
      --input-qc-config=data/sars-cov-2/qc.json \
      --input-pcr-primers=data/sars-cov-2/primers.csv \
      --output-json=output/nextclade.json \
      --output-csv=output/nextclade.csv \
      --output-tsv=output/nextclade.tsv \
      --output-tree=output/nextclade.auspice.json \
      --output-dir=output/ \
      --output-basename=nextclade
   ```

   Add `--verbose` flag to show more information in the console. Add `--include-reference` flag to also write gap-stripped reference sequence and peptides into outputs.

3. Find the output files in the `output/` directory:

    - `nextclade.aligned.fasta` - aligned input sequences
    - `nextclade.gene.<gene_name>.fasta` - aligned peptides corresponding to each gene
    - `nextclade.insertions.csv` - list of stripped insertions, for each input sequence
    - `nextclade.tsv` - results of the analysis in TSV format
    - `nextclade.csv` - same results, but in CSV format
    - `nextclade.json` - detailed results of the analysis in JSON format
    - `nextclade.auspice.json` - same as input tree, but with the input sequences placed onto it

### Inputs

#### Description of the input data

Nextclade expects the following input data:

- (required) Path of query sequences to be analyzed.

  CLI flag: `(-i | --input-fasta) PATH`

  Accepted formats: [FASTA](https://en.wikipedia.org/wiki/FASTA_format), plain text (one sequence per line).

- (required) Path of reference (root) sequence. Required to be the root of the provided reference phylogenetic tree (see below).

  CLI flag: `(-r | --input-root-sequence) PATH`

  It is used as a reference for alignment and for mutation calling. The reference sequence is expected to be of a very high quality, preferably complete and unambiguous (spans entire genome and has no ambiguous nucleotides).

  Accepted formats: [FASTA](https://en.wikipedia.org/wiki/FASTA_format), plain text (one sequence on one line).

<!--- Do you need to provided exactly one sentence? -->

- (required) Path of phylogenetic reference tree, rooted at the reference sequence specified by `-r`.

  CLI flag: `(-a | --input-tree) PATH`

  The reference tree is used to assign clades and as a target for phylogenetic placement. The tree is expected to be sufficiently diverse and to meet clade assignment expectations of a particular use-case, study or experiment. Only clades present on the reference tree will be assigned. For more details see "Clade assignment" and "Phylogenetic placement" sections below.

  Accepted formats: Auspice JSON v2 ([description](https://nextstrain.org/docs/bioinformatics/data-formats), [schema](https://github.com/nextstrain/augur/blob/master/augur/data/schema-export-v2.json)) - this is the same format that is used in Nextstrain (produced by Augur and consumed by Auspice). The tree *must* contain a clade definition for every tip and internal node.

- (required) Path to quality control configuration file.

<!--- In the CLI options `nextclade --help` this is optional, not required -->
CLI flag: `(-q | --input-qc-config) PATH`

A set of parameters and thresholds used to configure the QC checks. These should be tuned for the particular study or experiment, considering quality and tolerances of sequencing results of a given laboratory.

Accepted formats: JSON
  <!--- What are the possible parameters and thresholds that can be set? -->

- (optional, recommended) Path to gene map (genome annotations) - a table describing the genes of the virus (frame, position, etc.).

  CLI flag: `(-g | --input-gene-map) PATH`

  The gene map is required for codon-aware alignment, for gene translation and calling of aminoacid mutations. Without gene map, peptides will not be output and aminoacid mutations will not be detected. Also, without gene map the nucleotide alignment step will not be informed by codon information.

  Accepted formats: [GFF3](https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md)

- (required only in CLI). A subset of genes to use during analysis.

 <!--- only in CLI is confusing, because this is the CLI documentation, so kind of redundant -->
CLI flag: `--genes "A [,B [,...]]"`
  <!--- Shouldn't we add an alternative here, like --all-genes ?-->

Only these genes will be translated and only in these genes the aminoacid mutations will be detected.

Accepted formats: comma-delimited list of gene names. All gene names in the list MUST be present in the gene map (see `--input-gene-map`).

- (optional) Path to a csv file of PCR primers - a table that describes a set of PCR primers that might be used for PCR tests of the virus.

  CLI flag: `(-p | --input-pcr-primers) PATH`

  Used to detect changes in PCR primer regions. Without this table these checks will not be performed.

  Accepted formats: CSV with the following 4 columns "Institute (Country),TargetGene,PrimerName,Sequence"

  Note: the primers are processed differently depending on the primer type. The type is deduced from the suffix of primer's name (3rd column). Conventions that are used:

  - `_F` - forward primer
  - `_R` - reverse primer
  - `_P` - probe

<!--- Need to add CLI options for: jobs, output files -->

#### Example data

Nextclade's GitHub repository contains example data in the `data/` directory. The maintainers periodically update these files (including the reference trees), and this is the recommended starting point for your experiments.

https://github.com/nextstrain/nextclade/tree/master/data

### Results and interpretation

#### Output files

This section describes files produced by Nextclade.

You can download these files from Nextclade Web using "Export" button (note that there is no real download, all files are generated right in your browser).

Nextclade CLI writes these files into paths specified with a family of `--output*` flags.

##### Aligned nucleotide sequences

Aligned sequences are produced as a result of the nucleotide alignment step and are being output in FASTA format. The file contains the aligned reference sequence as the first entry (requires `--include-reference` flag in CLI version), followed by the aligned query sequences.

##### Aligned peptides

Aligned peptides are produced as a result of the translation and peptide alignment step and are being output in FASTA format. There are multiple files, one for each gene. Each file contains the aligned reference peptide as the first entry (requires `--include-reference` flag in CLI version), followed by the aligned query sequences.

##### Analysis results

The results of mutation calling, clade assignment, quality control and PCR primer changes can be obtained in either TSV, CSV, or JSON format.

TSV and CSV files are equivalent and only differ in the column delimiter (tabs vs semicolons), for better compatibility with spreadsheet software and data-science packages. Tabular format of TSV/CSV files are somewhat more human-friendly, are convenient for the immediate inspection and for simple automated processing.

They contain the following columns:

TODO: describe columns

JSON results file is best for in-depth automated processing of results. It contains everything tabular files contain, plus more, in a more machine-friendly format.

TODO: add JSON schema

##### Stripped insertions

Nextclade strips insertions relative to the reference from aligned query sequences, so that they no longer appear in the output sequences. It outputs information about these insertions in CSV format.

The file contains the following columns (delimited by commas):

- `seqName` - Name of the sequence, as in the input FASTA file

- `insertions` - A string containing semicolon-separated insertions. Each insertion is in format `<begin>:<seq>`, where `<begin>` is the starting position of the insertion in the aligned sequence, `<seq>` is the nucleotide sequence fragment that was removed.

##### Output phylogenetic tree

TODO: write this section


## What's next?

Congratulations, You have learned how to use Nextclade CLI!

Going further, you might want to learn about the science behind the Nextclade internals in the [Algorithm](algorithm)
section.

For a more convenient online tool, check out [Nextclade Web](nextclade-web).

Nextclade is an open-source project. We welcome ideas and contributions. Head to
our [GitHub repository](https://github.com/nextstrain/nextclade) if you want to obtain source code and contribute to the
project.
