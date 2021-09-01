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
docker run -it --rm nextstrain/nextclade:1.2.1 nextclade --help
```

Don't forget to mount necessary volumes to be able to supply the data into container and to access the results.

Docker images are available based on:

- `debian` (default): Nextclade executable + a set of basic Linux utilities, such as `bash`, `curl` and `wget`, to facilitate usage in workflows
- `alpine`: pure Alpine + Nextclade executable
- `scratch`: empty image + Nextclade executable

You can choose to use the latest available version (`:latest` or no tag), or to freeze a specific version (e.g. `:1.2.1`) or only major version (e.g. `:1`), or a base image (e.g. `:debian`) or both version and base image (e.g. `:1.2.1-debian`), or mix and match.

Tag `:latest` points to `:debian`.

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

Each subcommand has its own help prompt:

```bash
nextclade dataset --help
nextclade dataset list --help
nextclade dataset get --help
nextclade run --help
```

## Quick Example

1. Download SARS-CoV-2 dataset:

    ```bash
    nextclade dataset get --name='sars-cov-2' --output-dir='data/sars-cov-2'
    ```

   Observe downloaded dataset files in the directory `data/sars-cov-2/`

2. Run using the downloaded dataset and its example sequences (`data/sars-cov-2/sequences.fasta`):

   ```bash
   nextclade \
      --in-order \
      --input-fasta=data/sars-cov-2/sequences.fasta \
      --input-dataset=data/sars-cov-2 \
      --output-tsv=output/nextclade.tsv \
      --output-tree=output/nextclade.auspice.json \
      --output-dir=output/ \
      --output-basename=nextclade
   ```

   To run the analysis on our own sequences, provide `--input-fasta=` flag with a path to your fasta file.

   For more controls, specify input files explicitly and/or add more flags for output files:

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

   Add `--verbose` flag to show more information in the console. Add `--include-reference` flag to also write gap-stripped reference sequence and reference peptides into outputs.

   The `--input-dataset` flag can be combined with individual `--input*` flags. In this case, individual flags override the corresponding files in the dataset.

   You can learn more about input and output files in sections: [Input files](input-files), [Output files](output-files) and [Nextclade datasets](datasets). Read the built-in help (`nextclade --help`) for the detailed description of each flag.


3. Find the output files in the `output/` directory:

  - `nextclade.aligned.fasta` - aligned input sequences
  - `nextclade.gene.<gene_name>.fasta` - aligned peptides corresponding to each gene
  - `nextclade.insertions.csv` - list of stripped insertions, for each input sequence
  - `nextclade.tsv` - results of the analysis in TSV format
  - `nextclade.csv` - same results, but in CSV format
  - `nextclade.json` - detailed results of the analysis in JSON format
  - `nextclade.auspice.json` - same as input tree, but with the input sequences placed onto it

## What's next?

Congratulations, You have learned how to use Nextclade CLI!

Going further, you might want to learn about the science behind the Nextclade internals in the [Algorithm](algorithm) section. The required input data is described in [Input files](input-files) section. And produced files are described in [Output files](output-files) section. The datasets are described in more details in the [Nextclade datasets](datasets) section.

For a more convenient online tool, check out [Nextclade Web](nextclade-web).

Nextclade is an open-source project. We welcome ideas and contributions. Head to our [GitHub repository](https://github.com/nextstrain/nextclade) if you want to obtain source code and contribute to the project.
