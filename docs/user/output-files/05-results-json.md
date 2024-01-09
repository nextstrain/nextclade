# Analysis results (JSON)

Nextclade Web: download `nextclade.json` or `nextclade.ndjson`.

Nextclade CLI flag: `--output-json`/`-J` or `--output-ndjson`/`-N`

The results of mutation calling, clade assignment, quality control and PCR primer changes can be obtained in either tabular (TSV, CSV) or JSON (classic JSON or NDJSON) formats.

This section describes JSON/NDJSON output.

JSON and NDJSON results files contain everything tabular files contain, plus more, in a more machine-friendly format.

NDJSON file (newline-delimited JSON) combines only `results` and `errors` arrays from the plain JSON file. JSON file contains some additional metadata compared to NDJSON. But plain JSON, due to its structure, cannot be used for runs with large number of sequences (it cannot be streamed line-by-line and information has to be retained in memory until the end of run).

> ⚠️ JSON and NDJSON formats are unstable and can be changed without notice.

> ⚠️ For CLI users: Note that due to technical limitations of the JSON format, it cannot be streamed entry-by entry, i.e. before writing the output to the file, all entries need to be accumulated in memory. If the JSON output is requested (through `--output-json` or `--output-all` arguments), for large input data, it can cause very high memory consumption, disk swapping, decreased performance and crashes. Consider removing this output for large input data, running on a machine with more RAM, or processing data in smaller chunks.

> ⚠️ Beware that JSON results reflect the internal state of Nextclade, and use 0-indexed nucleotide and codon positions, whereas CSV and TSV files use 1-indexed positions (widely used in bioinformatics). The reason is, that JSON corresponds more closely to the internal representation and 0-indexing is the default in most programming languages. For example, substitution `{refNuc: "C", pos: 2146, queryNuc: "T"}` in JSON results corresponds to substitution `C2147T` in csv and tsv files.
>
> Ranges are 0-indexed and semi-open (include start and exclude end). Hence, `missing: {begin: 704, end: 726}` in JSON results corresponds to `missing: 705-726` in CSV/TSV results.

> ⚠️ Note, all positions are in reference coordinates, that is alignment coordinates after all the insertions relative to the reference have been stripped.

> ⚠️ Note that if nucleotide alignment or analysis of an individual sequence fails, alignment and translations are omitted from the output fasta files (see above), but the corresponding entry is still present in most of the other output files. In this case the `errors` column/field contain details about why the processing failed.
>
> <br/>
>
> If translation, alignment or analysis of an individual CDS fails, the corresponding peptide cannot be analyzed, and therefore no details about aminoacid mutations, deletions, insertions, frame shifts etc. will be available. In this case `warning` and `failedCdses` columns/fields contain details about which CDS failed and why.
>
> <br/>
>
> Care should be taken to check for `errors`, `warnings` and `failedCdses` columns or fields, to avoid treating missing or empty entries incorrectly. For example if and `errors` column is non-empty in the TSV output file, it means that the sequence processing failed completely, and treating the empty `substitutions` column as if no mutations detected is incorrect.
>
> <br/>
>
> See descriptions of individual outputs and [Errors and warnings](./errors-and-warnings.md) section for more details.
