# Genome annotation of query sequences

> ⚠️ Note that this feature is experimental and is under development. Please report bugs at https://github.com/nextstrain/nextclade/issues

Nextclade Web: download `nextclade.gff` or `nextclade.tbl`

Nextclade CLI flags: `--output-annotation-gff`, `--output-annotation-tbl`

This output contains annotation of genetic features (genes and CDSes) for each query sequence. This annotation uses the [input annotation](../input-files/03-genome-annotation.md) and maps it via the pairwise alignment to each individual query sequence. The result are coordinates of genes and CDS on the query sequence.

These files can be helpful when extracting genetic features from sequences as well as when uploading sequences to genetic databases. At this time there is no guarantee that this will work with any particular database, but you can use these files as a starting point.

There are 2 different formats for output genome annotations Nextclade supports:

- Genbank's 5-column tab-delimited feature table (TBL) format
  See specification at: https://www.ncbi.nlm.nih.gov/genbank/feature_table/

- Generic Feature Format Version 3 (GFF3)
  See specification at: https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md

The GFF3 and TBL files contain the same annotation data, but in different format. GFF3 format allows to store some additional data.

Both files contain 1 entry for each sequence in the input, except for input sequences which failed the analysis (e.g. failed to align or had other errors).

All positions are in query coordinates, i.e. the coordinates describe features on the input (unaligned) sequence. These coordinates are in general different for different sequences.
The quality of these query sequence annotation depends strongly on the reference annotation. In particular, reference annotations should not contain information that is specific to the reference sequence (e.g. sampling locations, authors, etc) and should not be transferred to the query annotations.

Please note the following particularities:

- The "source" column (column 2) in GFF file is set to "nextclade"
- GFF contains additional `seq_index` attribute to allow identifying query sequences by their index in fasta file, as opposed to by name only (unreliable in presence of duplicate names)
- GFF and TBL files contains additional attribute `is_reverse_complement` when `--retry-reverse-complement` argument is passed to Nextclade CLI, and the query sequence is a reverse-complemented of the reference sequence. Note that sequence name also contains a suffix in this case.
- If input annotations contain bare CDS without parental genes, Nextclade generates virtual genes as their parents. Likewise, for genes without CDS, Nextclade generates virtual CDS. These virtual genes and CDSes which were not present in the input reference annotation are included in the query annotation.
- `Name` attribute is always added if not present
- Comments and pragmas from reference annotation file are not being output

> ⚠️Note that if nucleotide alignment or analysis of an individual sequence fails, annotations for this sequence are omitted from the output annotation files, but the corresponding entry is still present in most of the other output files. Make sure to check `errors` and `warnings` columns of the [TSV output file](04-results-tsv.md) on why the processing failed. See [Errors and warnings section](errors-and-warnings.md) for more details.
