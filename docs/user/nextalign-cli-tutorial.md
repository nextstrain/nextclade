# Nextalign CLI

Nextalign is a viral genome sequence alignment algorithm used in [Nextclade](https://github.com/nextstrain/nextclade), ported to C++ and made into the standalone command-line tool.

Nextalign performs pairwise alignment of provided sequences against a given reference sequence using banded local alignment algorithm with affine gap-cost. Band width and rough relative positions are determined through seed matching.

Nextalign will strip insertions relative to the reference and output them in a separate CSV file.

Optionally, when provided with a gene map and a list of genes, Nextalign can perform translation of these genes.

Currently Nextalign primarily focuses on SARS-CoV-2 genome, but it can be used on any virus, given a sufficiently similar reference sequence (less than a 5% divergence).

---

<h2 id="users-guide" align="center">
👩‍🔬 User's guide
</h2>

<h3 id="installation" align="center">
💿 Installation
</h3>

#### 🤏 Download manually


You can download Nextalign executables on Github Releases page:

https://github.com/nextstrain/nextclade/releases

> ⚠️ Note that macOS executables are not currently signed with a developer certificate. Recent versions of macOS might refuse to run it. Before invoking Nextalign on command line, follow these steps to add Nextalign to the exclude list:
> <a target="_blank" rel="noopener noreferrer" href="https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unidentified-developer-mh40616/mac">
macOS User Guide: Open a Mac app from an unidentified developer</a>, or, if this does not work, check <a target="_blank" rel="noopener noreferrer" href="https://support.apple.com/en-us/HT202491">
Security settings</a>.

#### 🖥️ Download from command line

The following commands can be used to download nextalign from command line, from shell scripts and inside dockerfiles (click to expand):

<p>
<details>
<summary>
🐧 Linux x86_64
</summary>

Download latest version:

```bash
curl -fsSL "https://github.com/nextstrain/nextclade/releases/latest/download/nextalign-Linux-x86_64" -o "nextalign" && chmod +x nextalign
```

Download specific version:

```bash
NEXTALIGN_VERSION=1.0.0 && curl -fsSL "https://github.com/nextstrain/nextclade/releases/download/nextalign-${NEXTALIGN_VERSION}/nextalign-Linux-x86_64" -o "nextalign" && chmod +x nextalign
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
curl -fsSL "https://github.com/nextstrain/nextclade/releases/latest/download/nextalign-MacOS-x86_64" -o "nextalign" && chmod +x nextalign
```

Download specific version:

```bash
NEXTALIGN_VERSION=1.0.0 && curl -fsSL "https://github.com/nextstrain/nextclade/releases/download/nextalign-${NEXTALIGN_VERSION}/nextalign-MacOS-x86_64" -o "nextalign" && chmod +x nextalign
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
curl -fsSL "https://github.com/nextstrain/nextclade/releases/latest/download/nextalign-MacOS-arm64" -o "nextalign" && chmod +x nextalign
```

Download specific version:

```bash
NEXTALIGN_VERSION=1.0.0 && curl -fsSL "https://github.com/nextstrain/nextclade/releases/download/nextalign-${NEXTALIGN_VERSION}/nextalign-MacOS-arm64" -o "nextalign" && chmod +x nextalign
```
</details>
</p>


Native Windows executables are not available at this time. Windows users can try one of the following:

 - Downloading and running Linux executable from [Windows Subsystem for Linux (WSL)](https://docs.microsoft.com/en-us/windows/wsl/install-win10)
 - Running docker container (see below)
 - Renting a Linux machine, for example at any cloud compute provider


#### 🐋 With docker


Container images are available at Docker Hub: https://hub.docker.com/repository/docker/nextstrain/nextalign

Pull and run the latest version with:

```
docker pull nextstrain/nextalign:latest
docker run -it --rm nextstrain/nextalign:latest nextalign --help
```

Pull and run a specific version with:

```
docker run -it --rm nextstrain/nextalign:1.0.0 nextalign --help
```

Don't forget to mount necessary volumes to be able to supply the data inside the container and to access the results.


#### 🔋 Usage

Refer to help prompt for usage of Nextalign:

```
nextalign --help
```

Quick Example:

 1. Download the example SARS-CoV-2 data files from:
    https://github.com/nextstrain/nextclade/tree/master/data/sars-cov-2
    (You can also try other viruses in the `data/` directory)

 2. Run:

    ```
    nextalign \
      --sequences=sequences.fasta \
      --reference=reference.fasta \
      --genemap=genemap.gff \
      --genes=E,M,N,ORF10,ORF14,ORF1a,ORF1b,ORF3a,ORF6,ORF7a,ORF7b,ORF8,ORF9b,S \
      --output-dir=output/ \
      --output-basename=nextalign
    ```

    Add `--verbose` flag to show more information in the console. Add `--write-ref` flag to also write gap-stripped reference sequence and peptides into outputs.

 3. Find the output files in the `output/` directory


#### 💬 Feedback

Do you find Nextalign useful? Tell us about your use-case and experience with it.

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
