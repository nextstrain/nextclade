# Shipped datasets lose start codons with `gapAlignmentSide: "left"`

## Problem

With their shipped setting `"gapAlignmentSide": "left"`, some datasets place an ambiguous upstream deletion over the start codon of a CDS. The first codon translates to `X` or `-`, or Nextclade reports false aa deletions of the first codons (e.g. `OPG204:M1-`, or `OPG204:M1-`, `K2-`, `M3-` for a 12-nt deletion). Amino-acid mutations at the start of the protein are wrong, and exported peptides have no start codon. Nextclade reports no frameshift, and QC status does not change. Nextclade versions after 3.24.0 report a lost start codon in the `warnings` output.

The nucleotide deletion is real. Only its position is incorrect. The alternative placement upstream of the CDS has the same score and keeps the start codon.

A related case affects both gap sides: a deletion that starts before a CDS and cuts into it can be cheaper than an in-frame deletion inside of the CDS. Example: mpox OPG112, Ivory_Coast_2012, translation `-XMDKR` with `left` and with `right`.

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

No test in this repository covers the dataset settings. The aligner fixtures `mod cds_boundary` in [packages/nextclade/src/align/align.rs](../../packages/nextclade/src/align/align.rs) cover the patterns. The dataset-side check is an affected genome in the example sequences of each dataset, with a check for lost start codons: a CDS translation that does not start with `M`, or the lost start codon warning of Nextclade versions after 3.24.0 in the `warnings` output. At the moment, no check compares start codons in the example output.

## Fix

Two dataset settings fix the problem. Each changes stored indel coordinates, so dataset content that stores them must agree with the new placement.

- **`alignmentParams.penaltyGapEnterCds`** (preferred): a penalty for a deletion that extends from outside of all CDSs into a CDS. A value of `penaltyGapOpenInFrame - penaltyGapOpen + 1` fixes the ties and the straddle with both gap sides: 2 for the default open penalties (mpox), 5 for dengue/all. Only alignments with a deletion that enters a CDS change. Needs a Nextclade version with the parameter, so the dataset sets `compatibility.cli` and `compatibility.web` to that version. Older versions ignore the field and give the previous output
- **`"gapAlignmentSide": "right"`**: works with all Nextclade versions, but fixes the ties only, not the straddle. It also moves every other ambiguous indel in the genome to its 5'-most position

### dengue/all

The reference tree is built from an `augur align` (MAFFT) alignment, not from a Nextclade alignment. With `right`, private substitutions go down for 41 of 54 examples (total 6913 to 6648). Clade and QC status do not change. Either setting can change without other changes.

### mpox (all-clades, lineage-b.1, clade-iib, clade-i)

The reference trees are built from Nextclade alignments with `--gap-alignment-side left`. The value is hard-coded in the `nextstrain/mpox` workflows: rule `align` in `nextclade/Snakefile` and rule `align` in `phylogenetic/rules/prepare_sequences.smk`. The trees store the `left` placement: for example, the OPG204 deletions and reversions are at 174531-174542 in `mpox/all-clades/tree.json`.

With `penaltyGapEnterCds: 2`, the examples change only where a deletion enters a CDS: OPG204 deletions move from 174531-174542 to 174520-174531, a deletion moves off the last codon of the reverse-strand OPG045, the OPG112 deletion of Ivory_Coast_2012 becomes an in-frame deletion of codons 2-3, and deletions next to `N` runs move off the low-coordinate ends of OPG208 (`clade-iib`, `lineage-b.1`) and of two `clade-i` CDSs. QC status, frameshift counts and substitution counts of the examples do not change. Switching to `right` instead changes QC score for 6 of 13 `mpox/all-clades` examples and QC status for 3, because frameshift ranges move: `qc.frameShifts.ignoredFrameShifts` lists exact codon ranges (e.g. `OPG047:479-483` with `left`, `OPG047:483` with `right`).

Steps for one dataset release:

1. Pass the same alignment setting to both workflow rules (`--penalty-gap-enter-cds 2`, or `--gap-alignment-side right`)
2. Rebuild the reference trees
3. Set the parameter in the four `pathogen.json` files, and the minimum Nextclade version for `penaltyGapEnterCds`
4. Check `qc.frameShifts.ignoredFrameShifts` against the frameshifts that the new alignment reports
5. Compare old and new output on a large sample of real genomes (clade, lineage, nearest node, private mutations, QC status), and put the comparison in the dataset pull request
6. Add a genome with the short `ATGAAG` repeat to the `clade-iib` and `lineage-b.1` example sequences
7. Add a changelog entry about the moved indel coordinates

Users who need the previous output can use the previous dataset tag.
