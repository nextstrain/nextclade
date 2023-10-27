## Sequence data

Nextclade CLI: Positional argument(s) or `stdin` if no positional arguments provided.

Nextclade Web: accepted in "Provide sequences" drag & drop box. A remote URL is also accepted in `input-fasta` URL parameter.

Accepted formats: [FASTA](https://en.wikipedia.org/wiki/FASTA_format).

A set of viral nucleotide sequences to be analyzed. Also referred to as [query sequences](../terminology.md#query-sequence).

Note: each id must start with `>`, plain text without header is not accepted.

> 💡 Nextclade CLI supports file compression and reading from standard input. See section [Compression, stdin](./compression) for more details.
