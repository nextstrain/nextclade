# Compression, stdin

If no positional arguments (with paths to input query sequence data) provided to the `run` subcommand, then Nextclade CLI will attempt to read uncompressed FASTA data from standard input (stdin).

In Nextclade CLI, for any of the arguments for input files (they start with `--input-`) you can also use special file name "-" to read uncompressed data from standard input (stdin).

This should allow embedding into Unix-style pipelines.

Example:

```bash
xzcat *.fasta.xz | nextclade run -D <dataset> -o- | xz -9 compressed.fasta.zst
```

Nextclade CLI supports the following compression formats: `gz`, `bz2`, `xz`, `zst`. If an input file name ends with one of these extensions, Nextclade CLI will transparently decompress this file. For multiple positional arguments (input query sequences), different compression formats can be used.

Example:

```bash
nextclade run -D <dataset> input1.fasta.gz input1.fasta.xz -o aligned.fasta.zst
```
