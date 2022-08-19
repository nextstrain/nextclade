# Nextclade CLI

Nextclade is a tool that identifies differences between your sequences and a reference sequence, uses these differences to assign your sequences to clades, and reports potential sequence quality issues in your data. You can use the tool to analyze sequences before you upload them to a database, or if you want to assign Nextstrain clades to a set of sequences.

You can learn more about the algorithm in the [Algorithm](algorithm) section.

This section describes:

- how to install Nextclade CLI - using Docker container and natively
- how to run Nextclade CLI with sample data
- what other sections of the documentation are worth checking after that

## Installation (with docker)

Container images are available at Docker Hub: 🐋 [nextstrain/nextclade](https://hub.docker.com/r/nextstrain/nextclade)

Pull and run the latest version with:

```bash
docker pull nextstrain/nextclade:latest
docker run -it --rm nextstrain/nextclade:latest nextclade --help
```

Pull and run a specific version with:

```bash
docker run -it --rm nextstrain/nextclade:2.0.0 nextclade --help
```

> ⚠️Don't forget to mount necessary [docker volumes](https://docs.docker.com/storage/volumes/) to be able to supply the data into the container and to access the results. You may want to also add [`--user` argument](https://docs.docker.com/engine/reference/commandline/run/) to docker command, to run on behalf of a non-root user and group. This is not specific to Nextclade. Please refer to Docker documentation for more details.

Docker images are available based on:

- `debian` (default): Nextclade executable + a set of basic Linux utilities, such as `bash`, `curl` and `wget`, to facilitate usage in workflows
- `alpine`: pure Alpine + Nextclade executable
- `scratch`: empty image + Nextclade executable

You can choose to use the latest available version (`:latest` or no tag), or to freeze a specific version (e.g. `:2.0.0`) or only major version (e.g. `:2`), or a base image (e.g. `:debian`) or both version and base image (e.g. `:2.0.0-debian`), or mix and match.

Tag `:latest` points to `:debian`.

## Installation (local)

### Download manually

You can download the latest version of Nextclade CLI for your platform using one of these direct links:

- ⬇️ [nextclade for Linux (x86_64)](https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-x86_64-unknown-linux-gnu)
- ⬇️ [nextclade for macOS (Intel, x86_64)](https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-x86_64-apple-darwin)
- ⬇️ [nextclade for macOS (Apple Silicon, ARM64)](https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-aarch64-apple-darwin)
- ⬇️ [nextclade for Windows (x86_64)](https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-x86_64-pc-windows-gnu.exe)

All versions and their release notes are available on 🐈 [Github Releases](https://github.com/nextstrain/nextclade/releases).

These executables are self-contained and don't require any dependencies. They can be renamed and moved freely. It is convenient to rename the executable to `nextclade` and to move to one of the directories included in system `$PATH`, so that it's available from any directory in the console.

> ⚠️ Note that macOS executables are not currently signed with a developer certificate (it requires maintaining a paid Apple developer account). Recent versions of macOS might refuse to run the executable. Before invoking Nextclade on command line, follow these steps to add Nextclade to the exclude list:
> <a target="_blank" rel="noopener noreferrer" href="https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unidentified-developer-mh40616/mac">
> macOS User Guide: Open a Mac app from an unidentified developer</a>, and check <a target="_blank" rel="noopener noreferrer" href="https://support.apple.com/en-us/HT202491">
> Security settings</a>. Refer to the latest macOS documentation if none of this works.

> ⚠️ **GNU vs musl.** Nextclade has two flavors of executables for Linux: "gnu" and "musl", depending on what libc is used. We recommend "gnu" flavor by default - it is typically faster. However, if for some reason "gnu" flavor does not work, try "musl".

### Download from command line

The following commands can be used to download Nextclade from command line, from shell scripts and inside dockerfiles:

<p>
<details>
<summary>
🐧 Linux x86_64 (click to expand)
</summary>

Download latest version:

```bash
curl -fsSL "https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-x86_64-unknown-linux-gnu" -o "nextclade" && chmod +x nextclade
```

Download specific version:

```bash
curl -fsSL "https://github.com/nextstrain/nextclade/releases/download/2.0.0/nextclade-x86_64-unknown-linux-gnu" -o "nextclade" && chmod +x nextclade
```

</details>
</p>

<p>
<details>
<summary>
🍏 macOS Intel (click to expand)
</summary>

Download latest version:

```bash
curl -fsSL "https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-x86_64-apple-darwin" -o "nextclade" && chmod +x nextclade
```

Download specific version:

```bash
curl -fsSL "https://github.com/nextstrain/nextclade/releases/download/2.0.0/nextclade-x86_64-apple-darwin" -o "nextclade" && chmod +x nextclade
```

</details>
</p>

<p>
<details>
<summary>
🍎 macOS Apple Silicon (click to expand)
</summary>

Download latest version:

```bash
curl -fsSL "https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-aarch64-apple-darwin" -o "nextclade" && chmod +x nextclade
```

Download specific version:

```bash
curl -fsSL "https://github.com/nextstrain/nextclade/releases/download/2.0.0/nextclade-aarch64-apple-darwin" -o "nextclade" && chmod +x nextclade
```

</details>
</p>

<p>
<details>
<summary>
🪟 Windows x86_64 PowerShell (click to expand)
</summary>

Download latest version:

```
Invoke-WebRequest https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-x86_64-pc-windows-gnu.exe -O nextclade.exe
```

Download specific version:

```
Invoke-WebRequest https://github.com/nextstrain/nextclade/releases/download/2.0.0/nextclade-x86_64-pc-windows-gnu.exe -O nextclade.exe
```

</details>
</p>


### Using conda

> ⚠️Note that new versions may appear on bioconda with some delay (hours to weeks)

A [Nextclade conda package](https://anaconda.org/bioconda/nextclade) is available for Linux and macOS from the `conda` channel `bioconda`:

```bash
conda install -c bioconda nextclade
```

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

<!--- TODO: Should be expanded with detailed explanation of the commands -->

## Quick Example

1. Download SARS-CoV-2 dataset:

    ```bash
    nextclade dataset get --name 'sars-cov-2' --output-dir 'data/sars-cov-2'
    ```

   Observe downloaded dataset files in the directory `data/sars-cov-2/`

   > 💡️ This command will download the latest SARS-CoV-2 dataset. You should run it periodically to update the dataset, in order to get the latest features, including the most up-to-date clade assignment. Find out more in the [Nextclade datasets](datasets) section.

2. Run using the downloaded dataset and its example sequences (`data/sars-cov-2/sequences.fasta`):

   ```bash
   nextclade run \
      --input-dataset data/sars-cov-2 \
      --output-all=output/ \
      data/sars-cov-2/sequences.fasta
   ```

   Try to provide your own data instead of `data/sars-cov-2/sequences.fasta`.

   For more controls, specify input files explicitly and/or add more flags for output files:

   ```bash
   nextclade run \
      --in-order \
      --input-dataset=data/sars-cov-2 \
      --input-ref=data/sars-cov-2/reference.fasta \
      --input-gene-map=data/sars-cov-2/genemap.gff \
      --genes=E,M,N,ORF1a,ORF1b,ORF3a,ORF6,ORF7a,ORF7b,ORF8,ORF9b,S \
      --input-tree=data/sars-cov-2/tree.json \
      --input-qc-config=data/sars-cov-2/qc.json \
      --input-pcr-primers=data/sars-cov-2/primers.csv \
      --input-virus-properties=data/sars-cov-2/virus_properties.json \
      --output-fasta=output/nextclade.aligned.fasta.gz \
      --output-json=output/nextclade.json \
      --output-ndjson=output/nextclade.ndjson \
      --output-csv=output/nextclade.csv \
      --output-tsv=output/nextclade.tsv \
      --output-tree=output/nextclade.auspice.json \
      --output-translations=output/gene_{gene}.translation.fasta.gz \
      data/sars-cov-2/sequences.fasta \
      my_sequences1.fasta.gz \
      my_sequences2.fasta.xz
   ```

   Add `--verbose` flag to show more information in the console. Add `--include-reference` flag to also write gap-stripped reference sequence and reference peptides into outputs. Add `--in-order` to preserve the same order of results in output files as in input fasta (has runtime performance cost).

   The `--input-dataset` flag can be combined with individual `--input*` flags. In this case, individual flags override the corresponding files in the dataset.

   If `--output-all` is used, you can set the `--output-basename` to control filenames and `--output-selection=all,fasta,json,ndjson,csv,tsv,tree,translations,insertions,errors` to control which files are emitted.

   There is even more advanced flags to control alignment and other parts of the algorithm. Refer to `nextclade run --help` for more details.

   You can learn more about input and output files in sections: [Input files](input-files), [Output files](output-files) and [Nextclade datasets](datasets). Read the built-in help (`nextclade --help`) for the detailed description of each subcommand and each flag.

4. Find the output files in the `output/` directory:

- `nextclade.aligned.fasta` - aligned input sequences
- `nextclade_gene_<gene_name>.translation.fasta` - aligned peptides corresponding to each gene
- `nextclade.insertions.csv` - list of stripped insertions, for each input sequence
- `nextclade.tsv` - results of the analysis in TSV format
- `nextclade.csv` - same results, but in CSV format
- `nextclade.json` - detailed results of the analysis in JSON format
- `nextclade.ndjson` - detailed results of the analysis in newline-delimited JSON format
- `nextclade.auspice.json` - same as input tree, but with the input sequences placed onto it
- `nextclade.errors.csv` - list of errors, warnings and failed genes

## What's next?

Congratulations, You have learned how to use Nextclade CLI!

Going further, you might want to learn about the science behind the Nextclade internals in the [Algorithm](algorithm) section. The required input data is described in [Input files](input-files) section. And produced files are described in [Output files](output-files) section. The datasets are described in more details in the [Nextclade datasets](datasets) section.

For a more convenient online tool, check out [Nextclade Web](nextclade-web).

Nextclade is an open-source project. We welcome ideas and contributions. Head to our [GitHub repository](https://github.com/nextstrain/nextclade) if you want to obtain source code and contribute to the project.
