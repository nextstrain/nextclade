## Sequence data

A set of viral nucleotide sequences to be analyzed. Also referred to as [query sequences](terminology.html#query-sequence).

Nextclade Web (simple and advanced modes): accepted in "Sequences" drag & drop box. A remote URL is also accepted in `input-fasta` URL parameter.
CLI: Positional argument(s) or `stdin` if no positional argument is provided.

Accepted formats: [FASTA](https://en.wikipedia.org/wiki/FASTA_format). FASTA files can optionally be provided in one of the following compression algorithms: `gz`, `bz2`, `xz`, `zstd`. If a compressed fasta file is provided, it will be transparently decompressed with the algorithm chosen based on the file extension. Note: each id must start with `>`, plain text without header is not accepted.

Nextclade accepts plain or compressed FASTA files. If a compressed fasta file is provided, it will be transparently decompressed. Supported compression formats: `gz`, `bz2`, `xz`, `ztd`. The decompressor is chosen based on the file extension. If there are multiple input files, then different files can have different compression formats.
