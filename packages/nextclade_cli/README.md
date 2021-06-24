<h1 id="nextclade" align="center">
Nextclade
</h1>

<h4 id="nextclade" align="center">
Viral genome alignment, mutation calling, clade assignment, quality checks and phylogenetic placement
</h4>

<p align="center">
by Nextstrain team
</p>

---

<p align="center">
  <a href="https://github.com/nextstrain/nextclade/releases">
    <img height="30px"
      src="https://img.shields.io/badge/%E2%AC%87%EF%B8%8F%20Download-%231825aa.svg"
      alt="Download button"
    />
  </a>

  <a href="https://hub.docker.com/r/nextstrain/nextclade">
    <img height="30px"
      src="https://img.shields.io/badge/%F0%9F%90%8B%20%20%20Docker-%231188cc.svg"
      alt="Docker version"
    />
  </a>
</p>

<p align="center">
  <a href="https://github.com/nextstrain/nextclade/issues/new">
    <img height="30px"
      src="https://img.shields.io/badge/%F0%9F%93%A2%20Report%20Issue-%2317992a.svg"
      alt="Report issue button"
    />
  </a>

  <a href="https://github.com/nextstrain/nextclade/issues/new">
    <img height="30px"
      src="https://img.shields.io/badge/%E2%9C%A8%20Request%20feature-%2317992a.svg"
      alt="Request feature button"
    />
  </a>

  <a href="https://discussion.nextstrain.org">
    <img height="30px"
      src="https://img.shields.io/badge/%F0%9F%92%AC%20Join%20discussion-%23d99852.svg"
      alt="Discuss button"
    />
  </a>
</p>

---

<p align="center">
  <a href="https://github.com/nextstrain/nextclade/releases">
    <img src="https://img.shields.io/github/v/release/nextstrain/nextclade?logo=github" alt="GitHub releases">
  </a>

  <a href="https://hub.docker.com/r/nextstrain/nextclade">
    <img alt="Nextclade Docker image version" src="https://img.shields.io/docker/v/nextstrain/nextclade?label=%F0%9F%90%8B%20%20%20docker%3Anextclade">
  </a>
</p>

---

<h2 id="about" align="center">
👋 About
</h2>

Nextclade is a tool that identifies differences between your sequences and a reference sequence used by Nextstrain,
uses these differences to assign your sequences to clades, and reports potential sequence quality issues in your data.
You can use the tool to analyze sequences before you upload them to a database, or if you want to assign Nextstrain clades to a set of sequences.

---

<h2 id="users-guide" align="center">
👩‍🔬 User's guide
</h2>

<h3 id="installation" align="center">
💿 Installation
</h3>

#### 🤏 Download manually


You can download Nextclade executables on Github Releases page:

https://github.com/nextstrain/nextclade/releases

> ⚠️ Note that macOS executables are not currently signed with a developer certificate. Recent versions of macOS might refuse to run it. Before invoking Nextclade on command line, follow these steps to add Nextclade to the exclude list:
> <a target="_blank" rel="noopener noreferrer" href="https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unidentified-developer-mh40616/mac">
macOS User Guide: Open a Mac app from an unidentified developer</a>, or, if this does not work, check <a target="_blank" rel="noopener noreferrer" href="https://support.apple.com/en-us/HT202491">
Security settings</a>.

#### 🖥️ Download from command line

The following commands can be used to download nextclade from command line, from shell scripts and inside dockerfiles (click to expand):

<p>
<details>
<summary>
🐧 Linux x86_64
</summary>

Download latest version:

```bash
curl -fsSL "https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-Linux-x86_64" -o "nextclade" && chmod +x nextclade
```

Download specific version:

```bash
NEXTCLADE_VERSION=1.0.0 && curl -fsSL "https://github.com/nextstrain/nextclade/releases/download/nextclade-${NEXTCLADE_VERSION}/nextclade-Linux-x86_64" -o "nextclade" && chmod +x nextclade
```
</details>
</p>

<p>
<details>
<summary>
🍏 macOS Intel
</summary>

Download latest version:

```bash
curl -fsSL "https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-MacOS-x86_64" -o "nextclade" && chmod +x nextclade
```

Download specific version:

```bash
NEXTCLADE_VERSION=1.0.0 && curl -fsSL "https://github.com/nextstrain/nextclade/releases/download/nextclade-${NEXTCLADE_VERSION}/nextclade-MacOS-x86_64" -o "nextclade" && chmod +x nextclade
```
</details>
</p>

<p>
<details>
<summary>
🍎 macOS Apple Silicon
</summary>

Download latest version:

```bash
curl -fsSL "https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-MacOS-arm64" -o "nextclade" && chmod +x nextclade
```

Download specific version:

```bash
NEXTCLADE_VERSION=1.0.0 && curl -fsSL "https://github.com/nextstrain/nextclade/releases/download/nextclade-${NEXTCLADE_VERSION}/nextclade-MacOS-arm64" -o "nextclade" && chmod +x nextclade
```
</details>
</p>


Native Windows executables are not available at this time. Windows users can try one of the following:

 - Downloading and running Linux executable from [Windows Subsystem for Linux (WSL)](https://docs.microsoft.com/en-us/windows/wsl/install-win10)
 - Running docker container (see below)
 - Renting a Linux machine, for example at any cloud compute provider


#### 🐋 With docker


Container images are available at Docker Hub: https://hub.docker.com/repository/docker/nextstrain/nextclade

Pull and run the latest version with:

```
docker pull nextstrain/nextclade:latest
docker run -it --rm nextstrain/nextclade:latest nextclade --help
```

Pull and run a specific version with:

```
docker run -it --rm nextstrain/nextclade:1.0.0 nextclade --help
```

Don't forget to mount necessary volumes to be able to supply the data inside the container and to access the results.


#### 🔋 Usage

Refer to help prompt for usage of Nextclade:

```
nextclade --help
```

Quick Example:

 1. Download the example SARS-CoV-2 data files from:
    https://github.com/nextstrain/nextclade/tree/master/data/sars-cov-2
    (You can also try other viruses in the `data/` directory)

 2. Run:

    ```
    nextclade \
      --input-fasta=sequences.fasta \
      --input-root-seq=reference.fasta \
      --genes=E,M,N,ORF1a,ORF1b,ORF3a,ORF6,ORF7a,ORF7b,ORF8,ORF9b,S \
      --input-gene-map=genemap.gff \
      --input-tree=tree.json \
      --input-qc-config=qc.json \
      --input-pcr-primers=primers.csv \
      --output-json=output/nextclade.json \
      --output-csv=output/nextclade.csv \
      --output-tsv=output/nextclade.tsv \
      --output-tree=output/nextclade.auspice.json \
      --output-dir=output/ \
      --output-basename=nextclade
    ```

    Add `--verbose` flag to show more information in the console. Add `--include-reference` flag to also write gap-stripped reference sequence and peptides into outputs.

 3. Find the output files in the `output/` directory:

    - nextclade.aligned.fasta - aligned input sequences
    - nextclade.gene.<gene_name>.fasta - peptides corresponding to each gene
    - nextclade.insertions.csv - list of stripped insertions for each input sequence
    - nextclade.tsv - results of the analysis in TSV format
    - nextclade.csv - same results, but in CSV format
    - nextclade.json - detailed results of the analysis in JSON format
    - nextclade.auspice.json - same as input tree, but with the input sequences placed onto it


#### 💬 Feedback

Do you find Nextclade useful? Tell us about your use-case and experience with it.

If you want to report an error or request a new feature, please open a [new Github Issue](https://github.com/nextstrain/nextclade/issues/new).

For a general conversation, feel free to join Nextstrain Discussion at [discussion.nextstrain.org](https://discussion.nextstrain.org/).


<h2 id="documentation" align="center">
🧑‍💻 Development
</h2>

See: ["Developer's guide: Nextclade CLI and Nextalign CLI"](docs/dev/developers-guide-cli.md)



<h3 id="license" align="center">
⚖️ License
</h3>

<p align="center">
  <a target="_blank" rel="noopener noreferrer" href="../../LICENSE" alt="License file">MIT License</a>
</p>
