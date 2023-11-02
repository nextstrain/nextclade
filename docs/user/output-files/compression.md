# Compression, stdout

If any of the output filenames ends with one of the supported file extensions: `gz`, `bz2`, `xz`, `ztd`, it will be transparently compressed. Low compression level is used (roughly corresponds to level "2" for most formats).

If the output filename is `-` then the output will be written uncompressed to standard output (stdout).

If a custom compression or other form of post-processing is needed, then you can tell Nextclade to write to stdout and then pipe the stdout to another program. For example:

```bash
xzcat input.fasta.xz |
nextclade run -r reference.fasta -m genemap.gff -o - |
xz -9 > aligned.heavily.compressed.fasta.xz
```

```bash
xzcat *.fasta.xz |
nextclade run -D dataset/ --output-tsv=- |
process_nextclade_tsv_further > processed.tsv
```
