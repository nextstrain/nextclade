# Output files

This section describes the files produced by Nextclade.

You can download these files from Nextclade Web using the "Download" dialog.

![Download output](assets/web_download-options.png)

Nextclade CLI writes these files into paths specified with a family of `--output*` flags.

## Aligned nucleotide sequences

Nextclade CLI, Nextalign CLI flags: `--output-fasta`

Aligned sequences are produced as a result of the [Sequence alignment](algorithm/01-sequence-alignment) step and are being output in FASTA format. If the CLI flag `--include-reference` is set, the reference sequence is included as the first entry.

## Aligned peptides

Nextclade CLI, Nextalign CLI flags: `--output-dir`

Aligned peptides are produced as a result of the [Translation and peptide alignment](algorithm/02-translation) step and are being output in FASTA format. There are multiple files, one for each gene. If the CLI flag `--include-reference` is set, the reference sequence peptide is included as the first entry.

## Analysis results

The results of mutation calling, clade assignment, quality control and PCR primer changes can be obtained in either TSV, CSV, or JSON format.

### Tabular (CSV/TSV) results

Nextclade CLI flags: `--output-csv`, `--output-tsv`

TSV and CSV files are equivalent and only differ in the column delimiter (tabs vs semicolons), for better compatibility with spreadsheet software and data-science packages. Tabular format of TSV/CSV files are somewhat more human-friendly, are convenient for the immediate inspection and for simple automated processing.

Every row in tabular output corresponds to 1 input sequence. The meaning of columns is described below:

| Column name                                     | Meaning                                                                                                    |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| seqName                                         | Name of the sequence (as provided in the input file)                                                       |
| clade                                           | Assigned clade                                                                                             |
| qc.overallScore                                 | Overall [quality control](algorithm/07-quality-control.html) score                                         |
| qc.overallStatus                                | Overall [quality control](algorithm/07-quality-control.html) status                                        |
| totalSubstitutions                              | Total number of detected nucleotide substitutions                                                          |
| totalDeletions                                  | Total number of detected nucleotide deletions                                                              |
| totalInsertions                                 | Total number of detected nucleotide insertions                                                             |
| totalAminoacidSubstitutions                     | Total number of detected aminoacid substitutions                                                           |
| totalAminoacidDeletions                         | Total number of detected aminoacid deletions                                                               |
| totalMissing                                    | Total number of detected missing nucleotides                                                               |
| totalNonACGTNs                                  | Total number of detected ambiguous nucleotides                                                             |
| totalPcrPrimerChanges                           | Total number of nucleotide mutations detected in PCR primer regions                                        |
| substitutions                                   | List of detected nucleotide substitutions                                                                  |
| deletions                                       | List of detected nucleotide deletion ranges                                                                |
| insertions                                      | List of detected inserted nucleotide fragments                                                             |
| privateNucMutations.reversionSubstitutions      | List of detected private mutations that are reversions to reference                                        |
| privateNucMutations.labeledSubstitutions        | List of detected private mutations that are to a genotype that has been labeled in `virus_properties.json` |
| privateNucMutations.unlabeledSubstitutions      | List of detected private mutations that are neither reversions nor labeled                                 |
| privateNucMutations.totalReversionSubstitutions | Total number of private mutations that are reversions to reference                                         |
| privateNucMutations.totalLabeledSubstitutions   | Total number of private mutations that are to a genotype that has been labeled in `virus_properties.json`  |
| privateNucMutations.totalUnlabeledSubstitutions | Total number of private mutations that are neither reversions nor labeled                                  |
| privateNucMutations.totalPrivateSubstitutions   | Total number of private mutations overall                                                                  |
| frameShifts                                     | List of detected frame shifts                                                                              |
| aaSubstitutions                                 | List of detected aminoacid substitutions                                                                   |
| aaDeletions                                     | List of detected aminoacid deletions                                                                       |
| missing                                         | List of detected nucleotide insertions                                                                     |
| nonACGTNs                                       | List of detected ambiguous nucleotides                                                                     |
| pcrPrimerChanges                                | List of detected PCR primer changes                                                                        |
| alignmentScore                                  | Alignment score                                                                                            |
| alignmentStart                                  | Beginning of the sequenced region                                                                          |
| alignmentEnd                                    | End of the sequenced region                                                                                |
| qc.missingData.missingDataThreshold             | Threshold that was used for "Missing data" QC rule                                                         |
| qc.missingData.score                            | Score for "Missing data" QC rule                                                                           |
| qc.missingData.status                           | Status for "Missing data" QC rule                                                                          |
| qc.missingData.totalMissing                     | Total number of missing nucleotides used in "Missing data" QC rule                                         |
| qc.mixedSites.mixedSitesThreshold               | Threshold used for "Mixed sites" QC rule                                                                   |
| qc.mixedSites.score                             | Score for "Mixed sites" QC rule                                                                            |
| qc.mixedSites.status                            | Status for "Mixed sites" QC rule                                                                           |
| qc.mixedSites.totalMixedSites                   | Total number of ambiguous nucleotides used for "Mixed sites" QC rule                                       |
| qc.privateMutations.cutoff                      | Cutoff parameter used for "Private mutations" QC rule                                                      |
| qc.privateMutations.excess                      | Excess parameter used for "Private mutations" QC rule                                                      |
| qc.privateMutations.score                       | Score for "Private mutations" QC rule                                                                      |
| qc.privateMutations.status                      | Status for "Private mutations" QC rule                                                                     |
| qc.privateMutations.total                       | Weighted sum of private mutations used for "Private mutations" QC rule                                     |
| qc.snpClusters.clusteredSNPs                    | Clustered SNP detected for "SNP clusters" QC rule                                                          |
| qc.snpClusters.score                            | Score for "SNP clusters" QC rule                                                                           |
| qc.snpClusters.status                           | Status for "SNP clusters" QC rule                                                                          |
| qc.snpClusters.totalSNPs                        | Total number of SNPs for "SNP clusters" QC rule                                                            |
| qc.frameShifts.frameShifts                      | List of detected frame shifts in "Frame shifts" QC rule                                                    |
| qc.frameShifts.totalFrameShifts                 | Total number of detected frame shifts in for "Frame shifts" QC rule                                        |
| qc.frameShifts.score                            | Score for "Frame shifts" QC rule                                                                           |
| qc.frameShifts.status                           | Status for "Frame shifts" QC rule                                                                          |
| qc.stopCodons.stopCodons                        | List of detected stop codons in "Stop codons" QC rule                                                      |
| qc.stopCodons.totalStopCodons                   | Total number of detected stop codons in "Stop codons" QC rule                                              |
| qc.stopCodons.score                             | Score for "Stop codons" QC rule                                                                            |
| qc.stopCodons.status                            | Status for "Stop codons" QC rule                                                                           |
| errors                                          | List of errors during processing                                                                           |

### JSON results

Nextclade CLI flag: `--output-json`

JSON results file is best for in-depth automated processing of results. It contains everything tabular files contain, plus more, in a more machine-friendly format.

## Output phylogenetic tree

Nextclade CLI flags: `--output-tree`

Output phylogenetic tree. This is the input [reference tree](terminology.html#reference-tree-concept), with [Query Sequences](terminology.html#query-sequence) placed onto it.

Accepted formats: Auspice JSON v2 ([description](https://nextstrain.org/docs/bioinformatics/data-formats), [schema](https://github.com/nextstrain/augur/blob/master/augur/data/schema-export-v2.json)) - this is the same format that is used in Nextstrain. And the same as for the input [reference tree](terminology.html#reference-tree-concept).

The tree can be viewed in [auspice.us](https://auspice.us).

## Stripped insertions

Nextclade CLI flag: `--output-insertions`

Nextclade strips insertions relative to the reference from aligned query sequences, so that they no longer appear in the output sequences. It outputs information about these insertions in CSV format.

The file contains the following columns (delimited by commas):

- `seqName` - Name of the sequence, as in the input FASTA file
- `insertions` - A string containing semicolon-separated insertions. Each insertion is in format `<begin>:<seq>`, where `<begin>` is the starting position of the insertion in the aligned sequence, `<seq>` is the nucleotide sequence fragment that was removed, e.g. `"22204:GAGCCAGAA"`.
- `aaInsertions` - String containing semicolon-separated insertions translated to aminoacids. Each insertion is in the format `<gene>:<pos>:<seq>`, e.g. `"S:214:EPE"`.

## List of errors and warnings

Nextclade CLI flag: `--output-errors`

A table that, for each sequence, contains a list of warnings, errors as well as a list of genes affected by error. The genes listed in this table are omitted from translation, analysis and FASTA outputs.
