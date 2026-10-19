# Errors and warnings

When processing of a sequence fails for various reasons, not all output files will contain the corresponding entry (due to limitations of file formats):

| Output file             | CLI arg                   | Failed entries? |
|-------------------------|:--------------------------|:----------------|
| Nucleotide alignment    | `--output-fasta`          | no              |
| Translations            | `--output-translations`   | no              |
| Tree - Auspice v2 JSON  | `--output-tree`           | no              |
| Tree - Newick           | `--output-tree`           | no              |
| Genome annotation - GFF | `--output-annotation-gff` | no              |
| Genome annotation - TBL | `--output-annotation-tbl` | no              |
| Analysis results CSV    | `--output-csv`            | yes             |
| Analysis results TSV    | `--output-tsv`            | yes             |
| Analysis results NDJSON | `--output-ndjson`         | yes             |
| Analysis results JSON   | `--output-json`           | yes             |

You can find the reason for a particular failure by reading:

- `errors` and `warnings` column in tabular outputs (TSV, CSV)
- `errors` array in JSON output
- `error` field in each entry in NDJSON output

Nextclade Web exports these results for each dataset with the same failed entries.

## Internal errors in Nextclade Web

An internal error of the analysis engine in Nextclade Web, for example a programming mistake or a lack of browser memory, fails only the sequence that was analyzed when it happened. The sequence gets an error that names the cause, for example "Nextclade Web ran out of browser memory while allocating 2.4 GiB", and the analysis of the other sequences continues. If internal errors repeat, the defect most likely affects every sequence, so Nextclade Web stops the analysis after the fourth internal error of a run and shows the error.

An internal error during an export fails only this export. The next export works normally.

## Warnings

A warning does not stop the analysis of a sequence. You can find warnings in:

- `warnings` column in tabular outputs (TSV, CSV), separated by `;`
- `warnings` array of each result in JSON and NDJSON outputs, with the fields `cdsName` and `warning`
- tooltip of the sequence name in the results table of Nextclade Web

Nextclade reports these warnings:

- **CDS not translated**: the CDS cannot be translated, for example because it is entirely deleted or not sequenced. The CDS is missing from the translation outputs.
- **Reverse complement**: the sequence aligns only as its reverse complement. The `cdsName` of this warning is `nuc`.
- **Lost start codon**: the CDS starts with `ATG` in the reference, but the first codon of the query is different, for example `ATA`, or `-TG` when a deletion removes part of the start codon. The CDS is still translated. A deletion over the start codon can be a real deletion, or an ambiguous deletion that the alignment placed into the CDS (see `penaltyGapEnterCds` in [Sequence alignment](../algorithm/01-sequence-alignment.md)). There is no warning when the first codon of the query contains `N` or ambiguous nucleotides, or is outside of the alignment range, because then the data do not show whether the start codon is present. There is also no warning for a CDS that continues the reading frame of another CDS, which is on the same strand and ends directly before it without a stop codon. This is the case for mature peptides of a polyprotein that the genome annotation lists as separate CDSs, for example HIV-1 `p7` after `p2`, or dengue `E` after `M`. Translation runs into such a CDS, so its first codon is not a start codon, and Nextclade reports a change there only as an amino acid substitution. A mature peptide gets the warning when the CDS before it is not in the genome annotation, or is not selected with `--cds-selection`.
- **Band boundary**: the nucleotide alignment touches the boundary of the alignment band, and Nextclade cannot retry with a wider band. A wider band can give a better alignment, so the kept alignment can be inaccurate near the band boundary. The warning names the attempt of the kept alignment and one of these reasons:
  - the band of the next attempt exceeds the band area limit (`--max-band-area`, `alignmentParams.maxBandArea` in `pathogen.json`)
  - the memory for the alignment matrix of the next attempt cannot be allocated
  - retries are disabled (`--max-alignment-attempts` is 0)
  - all retries (`--max-alignment-attempts`) are used, and the last retry still raised the alignment score. There is no warning when the last retry did not change the score: a query much longer than the reference, for example a whole genome analyzed with a single-gene dataset, touches the boundary in its unaligned ends with any band width

  The `cdsName` of this warning is `nuc`. Nextclade CLI also prints this warning to the console.
