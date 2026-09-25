# Shipped datasets lose start codons with `gapAlignmentSide: "left"`

## Problem

With their shipped setting `"gapAlignmentSide": "left"`, some datasets place an ambiguous upstream deletion over the start codon of a CDS. The first codon translates to `X` or `-`, or Nextclade reports false aa deletions of the first codons (e.g. `OPG204:M1-`, or `OPG204:M1-`, `K2-`, `M3-` for a 12-nt deletion). Amino-acid mutations at the start of the protein are wrong, and exported peptides have no start codon. Nextclade reports no frameshift, and QC status does not change.

The nucleotide deletion is real. Only its position is incorrect. The alternative placement upstream of the CDS has the same score and keeps the start codon.

## Affected datasets

| Dataset                       | Shortcuts                 | CDS    | Evidence                                                                                               |
| ----------------------------- | ------------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| `nextstrain/mpox/all-clades`  | `MPXV`, `nextstrain/mpox` | OPG204 | 8 of 13 examples (clades Ia, Ib, IIa, IIb)                                                             |
| `nextstrain/mpox/lineage-b.1` | `hMPXV_B1`                | OPG204 | 2 of 9 examples                                                                                        |
| `nextstrain/mpox/clade-iib`   | `hMPXV`                   | OPG204 | examples not affected; affected `all-clades` examples ON674051, KJ642617 and PQ178860.1 lose the start |
| `nextstrain/dengue/all`       |                           | C      | 1 of 54 examples (KY586941)                                                                            |

mpox: the OPG204 start at 174532 is in a tandem repeat of `ATGAAG`. Genomes with fewer repeat units have a 6-nt or 12-nt deletion. With `left`, the deletion starts at 174531 and removes the start codon (translation `-XMKMMVRIY` or `---XMMVRIY`). With `right`, it starts at 174519 (translation `MKMKMMVRIY`, as in the reference).

dengue: with `left`, Nextclade calls a deletion 72-104 over the C start at 102 (translation `-NQRKK...`). With `right`, the 5' end of the query stays unaligned and C translates as `MNQRKK...`. Both alignments have the same score.

Other datasets that use `left` or do not set the option (49 of 109) can have the same problem. Their example sequences show no lost start codon, but the example sets are small.

Mechanism, reproduction and measurements: [kb/reports/alignment-gap-placement-at-cds-start.md](../reports/alignment-gap-placement-at-cds-start.md).

## Tests

No test in this repository: the defect is in dataset settings. The dataset-side check is an affected genome in the example sequences of each dataset, with a check that the CDS translation starts with `M`. At the moment, no check in either repository compares start codons in the example output.

## Fix

The fix is `"gapAlignmentSide": "right"` in `alignmentParams`. The setting also moves every other ambiguous indel to its 5'-most position. Dataset content that stores indel coordinates must agree with the new placement, so the change is different for each dataset.

### dengue/all

The reference tree is built from an `augur align` (MAFFT) alignment, not from a Nextclade alignment. With `right`, private substitutions go down for 41 of 54 examples (total 6913 to 6648). Clade and QC status do not change. The setting can change without other changes.

### mpox (all-clades, lineage-b.1, clade-iib)

The reference trees are built from Nextclade alignments with `--gap-alignment-side left`. The value is hard-coded in the `nextstrain/mpox` workflows: rule `align` in `nextclade/Snakefile` and rule `align` in `phylogenetic/rules/prepare_sequences.smk`. The trees store the `left` placement: for example, the OPG204 deletions and reversions are at 174531-174542 in `mpox/all-clades/tree.json`.

If only `pathogen.json` changes, queries and tree use different placements. Measured on the `mpox/all-clades` examples:

- Private substitutions: total 4 with `left`, 45 with `right`. 4 of 13 sequences have more
- QC score changes for 6 of 13 examples, and QC status for 3 of 13
- Clade does not change

Frameshift QC depends on the placement too. `qc.frameShifts.ignoredFrameShifts` lists codon ranges, and a reported frameshift is ignored only when its range matches. The placement changes the reported ranges (e.g. `OPG047:479-483` with `left`, `OPG047:483` with `right`). Example: Ivory_Coast_2012 has 5 counted frameshifts and QC status `bad` with `left`, and 2 counted frameshifts and status `good` with `right`.

Thus, the mpox change needs these steps in one dataset release:

1. Change `--gap-alignment-side` to `right` in both workflow rules
2. Rebuild the reference trees
3. Set `"gapAlignmentSide": "right"` in the three `pathogen.json` files
4. Check `qc.frameShifts.ignoredFrameShifts` against the frameshifts that the new alignment reports
5. Compare old and new output on a large sample of real genomes (clade, lineage, nearest node, private mutations, QC status), and put the comparison in the dataset pull request
6. Add a genome with the short `ATGAAG` repeat to the `clade-iib` and `lineage-b.1` example sequences
7. Add a changelog entry: indel coordinates move to 5' positions

Users who need the previous output can use the previous dataset tag.

A software fix ([M-align-gap-end-cost-in-cds.md](M-align-gap-end-cost-in-cds.md)) removes the dependency on this setting at CDS starts.
