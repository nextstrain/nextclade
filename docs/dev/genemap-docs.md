# Dev Docs for new GFF feature

## genemap binary

By running `cargo build` you get a new binar `target/debug/genemap`

This binary takes a genemap (TODO: in which format(s)?) as input and prints the parsed genemap to stdout.

It takes exactly one argument, the path to the genemap file.

Example:

```console
$ target/debug/genemap test_datasets/h1_na/files/genemap.gff
Genome                 │ s │ f │  start  │   end   │   nucs  │    codons   │
  Gene 'NA'            │ + │ 0 │       8 │    1418 │    1410 │    470      │ 
    CDS 'NA'           │   │   │         │         │         │             │
      CDS segment 'NA' │ + │ 0 │       8 │    1418 │    1410 │    470      │ 
```

`f`: frame (number between 0 and 2 inclusive)
`s`: strand (either `+` or `-`)
`start`: start position (0-based), differing from GFF format which is 1-based (GFF start - 1 = `start`)
`end`: end position (0-based, exclusive), same as GFF format which is 1-based, inclusive (GFF end = `end`)
`nucs`: number of nucleotides in `cds segment`, `end` - `start`
`codons`: number of codons in `cds segment`, `nucs` / 3

All test genemaps can be tested using:

```bash
parallel target/debug/genemap ::: test_datasets/*/*/genemap.gff
```

## Genamap explanation

### What does `gene` represent?

TODO

### What does `CDS` represent?

TODO

### What does `CDS segment` represent?

A `CDS segment` is a minimal unit of translation, a contiguous region of a `CDS` that is:

- uninterrupted
- has constant frame
- has constant stran  d
