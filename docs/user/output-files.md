# Output files

This section describes the files produced by Nextclade.

You can download these files from Nextclade Web using the "Download" dialog.

[![Download output](assets/web_download-options.png)](../_images/web_download-options.png)

Nextclade CLI writes these files into paths specified with a family of `--output*` flags.

## All outputs

Nextclade CLI, Nextalign CLI flags: `--output-all`

All possible outputs can be produced using `--output-all` flag. The default base file name is either "nextalign" or "nextclade" depending on which tool you use. It can be changed using `--output-basename` flag. A list of outputs can be restricted using `--output-selection` flag.

> ⚠️ For CLI users: Note that due to technical limitations of the JSON format, it cannot be streamed entry-by entry, i.e. before writing the output to the file, all entries need to be accumulated in memory. If the JSON results output or tree output is requested (through `--output-json`, `--output-tree` or `--output-all` arguments), for large input data, it can cause very high memory consumption, disk swapping, decreased performance and crashes. Consider removing these outputs for large input data, running on a machine with more RAM, or processing data in smaller chunks.

## Aligned nucleotide sequences

Nextclade CLI, Nextalign CLI flags: `--output-fasta`

Aligned sequences are produced as a result of the [Sequence alignment](algorithm/01-sequence-alignment) step and are being output in FASTA format. If the CLI flag `--include-reference` is set, the reference sequence is included as the first entry.

> ⚠️Note that if alignment or analysis of an individual sequence fails, it is omitted from the output alignment file.

## Aligned peptides

Nextclade CLI, Nextalign CLI flags: `--output-translations`

Aligned peptides are produced as a result of the [Translation and peptide alignment](algorithm/02-translation) step and are being output in FASTA format. There are multiple files, one for each gene. If the CLI flag `--include-reference` is set, the reference sequence peptide is included as the first entry.

This flag accepts a **template** string which *must* contain template argument `{gene}`.

> ⚠️ Note that if translation, alignment or analysis of an individual gene fails, the corresponding peptide is omitted from the output translation file.

> ⚠️ Note that if alignment or analysis of an individual sequence fails, all genes are omitted from the output translation files.

## Analysis results

The results of mutation calling, clade assignment, quality control and PCR primer changes can be obtained in either TSV, CSV, JSON, or NDJSON format.

> ⚠️Note that if alignment or analysis of an individual sequence fails, the alignment and translation it is omitted from the output fasta files (see above), but the corresponding entry is still present in most of the other output files. In this case `errors` column/field contain details about why the processing failed.
>
> <br/>
>
> If translation, alignment or analysis of an individual gene fails, the corresponding peptide cannot be analyzed, and therefore no details about aminoacid mutations, deletions, insertions, frame shifts etc. will be available. In this case `warning` and `failiedGenes` columns/fields contain details about which genes failed and why.
>
> <br/>
>
> Care should be taken to check for `errors`, `warnings` and `failedGenes` columns or fields, to avoid treating missing or empty entries incorrectly. For example if and `errors` column is non-empty in TSV output file, it means that the sequence processing failed completely, and treating the empty `substitutions` column as if no mutations detected is incorrect.
>
> <br/>
>
> See descriptions of individual outputs and "Outputs for failed sequences" section below for more details.


The next sections describe each analysis output in more details.

### Tabular (CSV/TSV) results

Nextclade CLI flags: `--output-csv`, `--output-tsv`

TSV and CSV files are equivalent and only differ in the column delimiter (tabs vs semicolons), for better compatibility with spreadsheet software and data-science packages. Tabular format of TSV/CSV files is somewhat human-friendly and convenient for the immediate inspection and for simple automated processing.

> ⚠️ Note, in CSV and TSV outputs, all positions are 1-based, and all ranges are closed (they include both left and right boundaries).

> ⚠️ Note, all positions are in alignment coordinates and after all the insertions are stripped.

Every row in tabular output corresponds to 1 input sequence. The meaning of columns is described below:

| Column name                                     | Meaning                                                                                                      |
|-------------------------------------------------|--------------------------------------------------------------------------------------------------------------|
| index                                           | Index (integer signifying location) of a corresponding record in the input fasta file(s)                     |
| seqName                                         | Name of the sequence (as provided in the input file)                                                         |
| clade                                           | Assigned clade                                                                                               |
| qc.overallScore                                 | Overall [quality control](algorithm/07-quality-control) score                                                |
| qc.overallStatus                                | Overall [quality control](algorithm/07-quality-control) status                                               |
| totalSubstitutions                              | Total number of detected nucleotide substitutions                                                            |
| totalDeletions                                  | Total number of detected nucleotide deletions                                                                |
| totalInsertions                                 | Total number of detected nucleotide insertions                                                               |
| totalFrameShifts                                | Total number of detected frame shifts                                                                        |
| totalAminoacidSubstitutions                     | Total number of detected aminoacid substitutions                                                             |
| totalAminoacidDeletions                         | Total number of detected aminoacid deletions                                                                 |
| totalAminoacidInsertions                        | Total number of detected aminoacid insertions                                                                |
| totalMissing                                    | Total number of detected missing nucleotides (nucleotide character `N`)                                      |
| totalNonACGTNs                                  | Total number of detected ambiguous nucleotides  (nucleotide characters that are not `A`, `C`, `G`, `T`, `N`) |
| totalUnknownAa                                  | Total number of unknown aminoacids (aminoacid character `X`)                                                 |
| totalPcrPrimerChanges                           | Total number of nucleotide mutations detected in PCR primer regions                                          |
| substitutions                                   | List of detected nucleotide substitutions                                                                    |
| deletions                                       | List of detected nucleotide deletion ranges                                                                  |
| insertions                                      | List of detected inserted nucleotide fragments                                                               |
| privateNucMutations.reversionSubstitutions      | List of detected private mutations that are reversions to reference                                          |
| privateNucMutations.labeledSubstitutions        | List of detected private mutations that are to a genotype that has been labeled in `virus_properties.json`   |
| privateNucMutations.unlabeledSubstitutions      | List of detected private mutations that are neither reversions nor labeled                                   |
| privateNucMutations.totalReversionSubstitutions | Total number of private mutations that are reversions to reference                                           |
| privateNucMutations.totalLabeledSubstitutions   | Total number of private mutations that are to a genotype that has been labeled in `virus_properties.json`    |
| privateNucMutations.totalUnlabeledSubstitutions | Total number of private mutations that are neither reversions nor labeled                                    |
| privateNucMutations.totalPrivateSubstitutions   | Total number of private mutations overall                                                                    |
| frameShifts                                     | List of detected frame shifts                                                                                |
| aaSubstitutions                                 | List of detected aminoacid substitutions                                                                     |
| aaDeletions                                     | List of detected aminoacid deletions                                                                         |
| aaInsertions                                    | List of detected aminoacid insertions                                                                        | 
| missing                                         | List of detected missing nucleotides (nucleotide character `N`)                                              |
| nonACGTNs                                       | List of detected ambiguous nucleotides (nucleotide characters that are not `A`, `C`, `G`, `T`, `N`)          |
| unknownAaRanges                                 | List of detected contiguous ranges of unknown aminoacid (aminoacid character `X`)                            |
| pcrPrimerChanges                                | List of detected PCR primer changes                                                                          |
| alignmentScore                                  | Alignment score                                                                                              |
| alignmentStart                                  | Beginning of the sequenced region                                                                            |
| alignmentEnd                                    | End of the sequenced region                                                                                  |
| qc.missingData.missingDataThreshold             | Threshold that was used for "Missing data" QC rule                                                           |
| qc.missingData.score                            | Score for "Missing data" QC rule                                                                             |
| qc.missingData.status                           | Status for "Missing data" QC rule                                                                            |
| qc.missingData.totalMissing                     | Total number of missing nucleotides used in "Missing data" QC rule                                           |
| qc.mixedSites.mixedSitesThreshold               | Threshold used for "Mixed sites" QC rule                                                                     |
| qc.mixedSites.score                             | Score for "Mixed sites" QC rule                                                                              |
| qc.mixedSites.status                            | Status for "Mixed sites" QC rule                                                                             |
| qc.mixedSites.totalMixedSites                   | Total number of ambiguous nucleotides used for "Mixed sites" QC rule                                         |
| qc.privateMutations.cutoff                      | Cutoff parameter used for "Private mutations" QC rule                                                        |
| qc.privateMutations.excess                      | Excess parameter used for "Private mutations" QC rule                                                        |
| qc.privateMutations.score                       | Score for "Private mutations" QC rule                                                                        |
| qc.privateMutations.status                      | Status for "Private mutations" QC rule                                                                       |
| qc.privateMutations.total                       | Weighted sum of private mutations used for "Private mutations" QC rule                                       |
| qc.snpClusters.clusteredSNPs                    | Clustered SNP detected for "SNP clusters" QC rule                                                            |
| qc.snpClusters.score                            | Score for "SNP clusters" QC rule                                                                             |
| qc.snpClusters.status                           | Status for "SNP clusters" QC rule                                                                            |
| qc.snpClusters.totalSNPs                        | Total number of SNPs for "SNP clusters" QC rule                                                              |
| qc.frameShifts.frameShifts                      | List of detected frame shifts in "Frame shifts" QC rule (excluding ignored)                                  |
| qc.frameShifts.totalFrameShifts                 | Total number of detected frame shifts in for "Frame shifts" QC rule  (excluding ignored)                     |
| qc.frameShifts.frameShiftsIgnored               | List of frame shifts detected, but ignored due to ignore list                                                |
| qc.frameShifts.totalFrameShiftsIgnored          | Total number of frame shifts detected, but ignored due to ignore list                                        |
| qc.frameShifts.score                            | Score for "Frame shifts" QC rule                                                                             |
| qc.frameShifts.status                           | Status for "Frame shifts" QC rule                                                                            |
| qc.stopCodons.stopCodons                        | List of detected stop codons in "Stop codons" QC rule                                                        |
| qc.stopCodons.totalStopCodons                   | Total number of detected stop codons in "Stop codons" QC rule                                                |
| qc.stopCodons.score                             | Score for "Stop codons" QC rule                                                                              |
| qc.stopCodons.status                            | Status for "Stop codons" QC rule                                                                             |
| isReverseComplement                             | Whether query sequences were transformed using reverse complement operation before alignment                 |
| errors                                          | List of errors during processing                                                                             |
| warnings                                        | List of warnings during processing                                                                           |
| failedGenes                                     | List of genes that failed translation                                                                        |

> ⚠️ Note that sequence names (`seqName` column) are not guaranteed to be unique (and in practice are not unique very often). So indices is the only way to reliably link together inputs and outputs.

The table can contain additional columns for every clade-like attribute defined in reference tree in `meta.extensions.clade_node_attrs` and in the node attributes. For example, the default SARS-CoV-2 datasets define `Nextclade_pango` attribute which signifies a PANGO lineage assigned by Nextclade (see [Nextclade as pango lineage classifier: Methods and Validation](algorithm/nextclade-pango)).

### JSON results

Nextclade CLI flag: `--output-json`, filename `nextclade.json`.

JSON results file is best for in-depth automated processing of results. It contains everything tabular files contain, plus more, in a more machine-friendly format.

> ⚠️ For CLI users: Note that due to technical limitations of the JSON format, it cannot be streamed entry-by entry, i.e. before writing the output to the file, all entries need to be accumulated in memory. If the JSON output is requested (through `--output-json` or `--output-all` arguments), for large input data, it can cause very high memory consumption, disk swapping, decreased performance and crashes. Consider removing this output for large input data, running on a machine with more RAM, or processing data in smaller chunks.

> ⚠️ Beware that JSON results reflect internal state of Nextclade, and use 0-indexed nucleotide and codon positions, whereas CSV and TSV files use 1-indexed positions (widely used in bioinformatics). The reason is, that JSON corresponds more closely to the internal representation and 0-indexing is the default in most programming languages. For example, substitution `{refNuc: "C", pos: 2146, queryNuc: "T"}` in JSON results corresponds to substitution `C2147T` in csv and tsv files.
>
>Ranges are inclusive for the start and exclusive for the end. Hence, `missing: {begin: 704, end: 726}` in JSON results corresponds to `missing: 705-726` in CSV/TSV results.

> ⚠️ Note, all positions are in alignment coordinates and after all the insertions stripped.

### NDJSON results

Nextclade CLI flag: `--output-ndjson`, filename `nextclade.ndjson`,

NDJSON results are similar to the JSON results - it combines `results` and `errors` arrays from it, and similarly suited well for in-depth automated processing of results. It contains everything tabular files contain, plus more, in a more machine-friendly format. Compared to JSON format, NDJSON can be streamed and piped one line at a time, and does not cause increased memory consumption for large input data.


> ⚠️ Beware that NDJSON results reflect internal state of Nextclade, and use 0-indexed nucleotide and codon positions, whereas CSV and TSV files use 1-indexed positions (widely used in bioinformatics). The reason is, that JSON corresponds more closely to the internal representation and 0-indexing is the default in most programming languages. For example, substitution `{refNuc: "C", pos: 2146, queryNuc: "T"}` in JSON results corresponds to substitution `C2147T` in csv and tsv files.
>
>Ranges are inclusive for the start and exclusive for the end. Hence, `missing: {begin: 704, end: 726}` in NDJSON results corresponds to `missing: 705-726` in CSV/TSV results.

> ⚠️ Note, all positions are in alignment coordinates and after all the insertions stripped.

## Output phylogenetic tree

Nextclade CLI flags: `--output-tree`, filename: `nextclade.auspice.json`.

Output phylogenetic tree. This is the input [reference tree](terminology.html#reference-tree-concept), with [Query Sequences](terminology.html#query-sequence) placed onto it.

The tree if Auspice JSON v2 ([description](https://nextstrain.org/docs/bioinformatics/data-formats), [schema](https://github.com/nextstrain/augur/blob/master/augur/data/schema-export-v2.json)) - this is the same format that is used in Nextstrain. And the same as for the input [reference tree](terminology.html#reference-tree-concept).

The tree can be visualized online in [auspice.us](https://auspice.us) or in a local instance of [Nextstrain Auspice](https://docs.nextstrain.org/projects/auspice/en/stable/index.html).

> ⚠️ Note that if alignment or analysis of an individual sequence fails, it cannot participate in phylogenetic placement and is omitted from the output tree.

> ⚠️ For CLI users: Note that due to technical limitations of the JSON format, it cannot be streamed entry-by entry, i.e. before writing the output to the file, all entries need to be accumulated in memory. If the tree output is requested (through `--output-tree` or `--output-all` arguments), for large input data, it can cause very high memory consumption, disk swapping, decreased performance and crashes. Consider removing this output for large input data, running on a machine with more RAM, or processing data in smaller chunks.

> ⚠️ Note, all positions are in alignment coordinates and after all the insertions stripped.

## Stripped insertions

CLI flag: `--output-insertions`, filename: `nextclade.insertions.csv`.

Nextclade strips insertions relative to the reference from aligned query sequences, so that inserted fragments no longer appear in the output sequences. This file contains information about the insertions, in CSV format.

> ⚠️ This flag is deprecated for Nextclade CLI and exist for compatibility with Nextalign CLI. All information in this file is also available in Nextclade CSV, TSV, JSON and NDJSON outputs.

The file contains the following columns (delimited by commas):

- `seqName` - Name of the sequence, as in the input FASTA file
- `insertions` - A string containing semicolon-separated insertions. Each insertion is in format `<begin>:<seq>`, where `<begin>` is the starting position of the insertion in the aligned sequence, `<seq>` is the nucleotide sequence fragment that was removed, e.g. `"22204:GAGCCAGAA"`.
- `aaInsertions` - String containing semicolon-separated insertions translated to aminoacids. Each insertion is in the format `<gene>:<pos>:<seq>`, e.g. `"S:214:EPE"`.

## List of errors and warnings

CLI flag: `--output-errors`, filename: `nextclade.errors.csv`.

A table that, for each sequence, contains a list of warnings (column `warnings`), errors (column `errors`) as well as a list of genes affected by error (column `failedGenes`). The genes listed in this table are omitted from translation, analysis and FASTA outputs.

> ⚠️ This flag is deprecated for Nextclade CLI and exist for compatibility with Nextalign CLI. All information in this file is also available in Nextclade CSV, TSV, JSON and NDJSON outputs.

## Outputs for failed sequences

When processing of a sequence fails for various reasons, not all output files will contain the corresponding entry (due to limitations of file formats):

| Output file                  | CLI arg                 | Failed entries? |
|------------------------------|:------------------------|:----------------|
| Aligned nucleotide sequences | `--output-fasta`        | no              |
| Aligned peptides             | `--output-translations` | no              |
| Auspice tree JSON            | `--output-tree`         | no              |
| Analysis results CSV         | `--output-csv`          | yes             |
| Analysis results TSV         | `--output-tsv`          | yes             |
| Analysis results NDJSON      | `--output-ndjson`       | yes             |
| Analysis results JSON        | `--output-json`         | yes             |
| Insertions CSV               | `--output-insertions`   | yes             |
| Errors CSV                   | `--output-errors`       | yes             |

## Compression of output files and writing to standard output (stdout)

If any of the output filenames ends with one of the supported file extensions: `gz`, `bz2`, `xz`, `zstd`, it will be transparently compressed. Low compression level is used (roughly corresponds to level "2" for most formats).

If output filename is "-" then the output will be written uncompressed to standard output (stdout).

If a custom compression or other form of post-processing is needed, then you could tell Nextclade/Nextalign to write to stdout and then pipe the stdout to another program. For example:

```bash
xzcat input.fasta.xz |
nextalign run -r reference.fasta -m genemap.gff -o - |
xz -9 > aligned.slowly.but.heavily.compressed.fasta.xz
```

```bash
xzcat *.fasta.xz |
nextclade run -D dataset/ --output-tsv=- |
process_nextclade_tsv_further > processed.tsv
```
