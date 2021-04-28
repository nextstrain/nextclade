Nextclade CLI 1.0.0-alpha.1 is available for early adopters.

Nextclade version 1.x is a full rewrite of Nextclade algorithm and of Nextclade command-line tool in C++ (versions 0.x were implemented in JavaScript). We expect Nextclade 1.x to be faster, more accurate and more convenient to install than 0.x.

Nextclade 1.0.0-alpha.1 is available on GitHub Releases and on DockerHub. Don't hesitate to give it a try:

- GitHub: https://github.com/nextstrain/nextclade/releases

  ```
  # Linux x86_64
  curl -fsSL "https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-Linux-x86_64" -o "nextclade"

  # macOS Intel
  curl -fsSL "https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-MacOS-x86_64" -o "nextclade"

  # macOS Apple Silicon
  curl -fsSL "https://github.com/nextstrain/nextclade/releases/latest/download/nextclade-MacOS-arm64" -o "nextclade"

  chmod +x nextclade
  nextclade --help
  # Follow the "Quick Example" section of the built-in help
  ```

- DockerHub: https://hub.docker.com/r/nextstrain/nextclade (under tag `1`)

  ```
  docker pull nextstrain/nextclade:1
  docker run -it --rm nextstrain/nextclade:1 nextclade --help
  # Follow the "Quick Example" section of the built-in help
  # Don't forget to mount input and output directories into the container (`--volume`)
  ```

**IMPORTANT:** Nextclade Web (clades.nextstrain.org) still uses the old version of Nextclade (currently 0.14.2). Some differences in outputs are expected between versions 0.x and 1.x. We are working on integration of the new algorithm into Nextclade Web, with new exciting features. Stay tuned!

**Changes in Nextclade CLI 1.0.0-alpha.1 compared to 0.14.2**

- Node.js is no longer required. Nextclade is now distributed as a standalone native executable file and is ready to be used after download. The latest version is available for major platforms at [Github Releases page](https://github.com/nextstrain/nextclade/releases). Docker container image for the new version is available under tag `1`: [nextstrain/nextclade:1](https://hub.docker.com/r/nextstrain/nextclade/tags). Note that for compatibility the tag `latest` (which is used when the tag is omitted from docker command) still resolves to version 0.x.

- The limitation of Node.js on maximum input file size (500 MB) is now removed. Nextclade should be able to handle large files and to use I/O resources more efficiently. Nextclade will stream sequence data to reduce memory consumption.

- Nextclade is much faster now. Depending on conditions, we measured speedups up to 5x compared to the old implementation.

- **BREAKING CHANGE:** Nextclade now uses Nextalign algorithm for the alignment and translation of sequences. This means that nucleotide alignment is now aware of codon boundaries. Alignment results and some of the analysis results might be slightly different.

- Similarly to Nextalign, Nextclade can now output aligned peptides. In general, Nextclade is a superset of Nextalign and can do everything Nextalign can, plus more (for the price of additional computation).

- **BREAKING CHANGE:** Nextclade no longer includes any default data. The following flags for input files were previously optional but are now required: `--input-root-seq`, `--input-tree`, `--input-qc-config`. The `--input-gene-map` flag is optional, but is highly recommended, because without gene map, the alignment will not be informed by codon boundaries and translation, peptide output and aminoacid change detection will not be available. The example SARS-CoV-2 data can be downloaded from [GitHub](https://github.com/nextstrain/nextclade/tree/master/data/sars-cov-2) as used as a starting point. Refer to built-in help for more details (`--help`).

- **BREAKING CHANGE:** Gene map (`--input-gene-map`) now only accepted in [GFF3 format](https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md). See an example at [GitHub](https://github.com/nextstrain/nextclade/blob/master/data/sars-cov-2/genemap.gff).

- **BREAKING CHANGE:** Gap-stripped reference (root) sequence is no longer being written into outputs by default. Add `--include-reference` flag to include it.

- **BREAKING CHANGE:** Nextclade might write aligned sequences into output files in the order that is different from the order of sequences in the input file. If order is important, use flag `--in-order` to enforce the initial order of sequences. This results in a small runtime performance penalty. Refer to built-in help for more details (`--help`).

**Deprecation of Nextclade CLI 0.x**

- From now on, only critical fixes will be applied to the family of versions 0.x. New features will only be implemented for the 1.x family. After Nextclade 1.x stabilizes, Nextclade 0.x will be deprecated and no further versions under 0.x will be released. This will be announced separately.

- After Nextclade 1.x stabilizes, the usage of NPM version of Nextclade 0.x on [@nextstrain/nextclade](https://www.npmjs.com/package/@nextstrain/nextclade) and [@neherlab/nextclade](https://www.npmjs.com/package/@neherlab/nextclade) will be deprecated. This will be announced separately. The versions 0.x will still be available on NPM, but Nextclade 1.x will be published on [Github Releases](https://github.com/nextstrain/nextclade/releases) instead.

- Docker container images for version 1.x are currently published under Docker tag `1` (i.e. `nextstrain/nextclade:1`). Images for version 0.x are now available under Docker tag `0` (i.e. `nextstrain/nextclade:0`). The `latest` tag still points to version 0.x. After nextclade 1.x stabilizes and 0.x is deprecated, the `latest` tag will be changed to point to version 1.x. This will be announced separately.
