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
| `enpen/enterovirus/cva10`     |                           | VP4    | examples not affected; 8 of 497 GenBank genomes (e.g. MW929252.1)                                      |

mpox: the OPG204 start at 174532 is in a tandem repeat of `ATGAAG`. Genomes with fewer repeat units have a 6-nt or 12-nt deletion. With `left`, the deletion starts at 174531 and removes the start codon (translation `-XMKMMVRIY` or `---XMMVRIY`). With `right`, it starts at 174519 (translation `MKMKMMVRIY`, as in the reference).

CVA10 (in development on the `nextclade_data` branch `add-cva10`): VP4 starts at 745, and the 5' UTR has an `A` at 737. Genomes with an 8-nt UTR deletion have two placements with the same score: 737-744 in the UTR, and 738-745, which removes the `A` of the start codon. With `left`, Nextclade selects 738-745, and VP4 translates as `XGAQ...`.

`nextstrain/dengue/all` loses no start codon: its annotation starts C at 102, one codon after the start codon `ATG` at 99-101 ([N-datasets-dengue-all-c-starts-after-start-codon.md](N-datasets-dengue-all-c-starts-after-start-codon.md)).

Other datasets that use `left` or do not set the option (49 of 109) can have the same problem. Their example sequences show no lost start codon, but the example sets are small.

Mechanism, reproduction and measurements: [kb/reports/alignment-gap-placement-at-cds-start.md](../reports/alignment-gap-placement-at-cds-start.md).

## Tests

No test in this repository covers the dataset settings. The aligner fixtures `mod cds_boundary` in [packages/nextclade/src/align/align.rs](../../packages/nextclade/src/align/align.rs) cover the patterns. The dataset-side check is an affected genome in the example sequences of each dataset, with a check for lost start codons: a CDS translation that does not start with `M`, or the lost start codon warning of Nextclade versions after 3.24.0 in the `warnings` output. At the moment, no check compares start codons in the example output.

## Fix

Two dataset settings fix the problem. Each changes stored indel coordinates, so dataset content that stores them must agree with the new placement.

- **`alignmentParams.penaltyGapEnterCds`** (preferred): a penalty for a deletion that extends from outside of all CDSs into a CDS. A value of `penaltyGapOpenInFrame - penaltyGapOpen + 1` fixes the ties and the straddle with both gap sides: 2 for the default open penalties (mpox), 6 for CVA10 (open 13, in-frame 18). Only alignments with a deletion that enters a CDS change. Needs a Nextclade version with the parameter, so the dataset sets `compatibility.cli` and `compatibility.web` to that version. Older versions ignore the field and give the previous output
- **`"gapAlignmentSide": "right"`**: works with all Nextclade versions, but fixes the ties only, not the straddle. It also moves every other ambiguous indel in the genome to its 5'-most position

### dengue/all

Keep `left` without the penalty. The annotation starts C one codon after the start codon, so neither setting can protect the start codon, and both make the C output of some genomes worse.

In 3000 complete dengue genomes from GenBank, the penalty (value 5) changes the alignment of 19 genomes, all 5'-truncated DENV4 (KY5868xx, e.g. KY586941). These genomes lack one `AAC` codon compared with the reference: C starts with `MNQRKK` in the query and `MNNQRKK` in the reference. Without the penalty, Nextclade reports `C:N1-`, which is the real difference in the annotated C. With the penalty, the deletion moves from 72-104 to 69-101, the query `ATG` aligns to the reference codon `AAC` at 102-104, and Nextclade reports `C:N1M`, a substitution that the genome does not have. `right` gives the same `C:N1M`, and it changes the alignment of 2877 of the 3000 genomes, with changed frameshifts in 39.

### CVA10

The workflow of the dataset ([enterovirus-phylo/nextclade_a10](https://github.com/enterovirus-phylo/nextclade_a10)) builds the reference tree from a Nextclade alignment. Its rule `align` in `Snakefile` passes each alignment parameter of `pathogen.json` as a CLI argument, including `--gap-alignment-side left`.

In 497 CVA10 genomes from GenBank, `left` with `penaltyGapEnterCds: 6` changes only the 8 affected genomes: the deletion moves from 738-745 to 737-744, and VP4 starts with `M`. Score, substitutions, frameshifts, QC status and clade do not change. The values 1 and 6 give the same result, and so do the CLI arguments of the workflow (preset `high-diversity`). `right` instead changes the alignment of 288 of the 497 genomes, with changed substitutions in 223, frameshift ranges in 2, and private mutations in 256, because the tree stores the `left` placement.

Steps for the dataset:

1. Add `--penalty-gap-enter-cds` to rule `align`, and `penaltyGapEnterCds` to `pathogen.json`
2. Rebuild the reference tree. Until then, the 8 affected genomes, which are tree leaves, have 1 private deletion each
3. Set the minimum Nextclade version for `penaltyGapEnterCds`
4. Add an affected genome to the example sequences

### mpox (all-clades, lineage-b.1, clade-iib, clade-i)

The reference trees are built from Nextclade alignments with `--gap-alignment-side left`. The value is hard-coded in the `nextstrain/mpox` workflows: rule `align` in `nextclade/Snakefile` and rule `align` in `phylogenetic/rules/prepare_sequences.smk`. The trees store the `left` placement: for example, the OPG204 deletions and reversions are at 174531-174542 in `mpox/all-clades/tree.json`.

With `penaltyGapEnterCds: 2`, the examples change only where a deletion enters a CDS: OPG204 deletions move from 174531-174542 to 174520-174531, a deletion moves off the last codon of the reverse-strand OPG045, the OPG112 deletion of Ivory_Coast_2012 becomes an in-frame deletion of codons 2-3, and deletions next to `N` runs move off the low-coordinate ends of OPG208 (`clade-iib`, `lineage-b.1`) and of two `clade-i` CDSs. QC status, frameshift counts and substitution counts of the examples do not change. Switching to `right` instead changes QC score for 6 of 13 `mpox/all-clades` examples and QC status for 3, because frameshift ranges move: `qc.frameShifts.ignoredFrameShifts` lists exact codon ranges (e.g. `OPG047:479-483` with `left`, `OPG047:483` with `right`).

In 3300 mpox genomes from GenBank (1500 for `all-clades`, 600 each for `clade-i`, `clade-iib` and `lineage-b.1`), the lost start codon warning disappears in 243 cases with `penaltyGapEnterCds: 2`. In 227 of them the start codon is intact, and in 16 an `N` run covers the start instead of the deletion. One warning is added, in a genome fragment. The QC private mutation total goes up by 1 or 2 in 134 genomes, because the trees store the `left` placement. Frameshifts change in 12 genomes: 11 are fragments or have 55 or more frameshifts, and in PP_000YGCX a 77-nt deletion that cut the OPG015_dup start moves into OPG015_dup, so Nextclade reports a frameshift instead of a lost start codon. QC status changes for 2 fragments.

Steps for one dataset release:

1. Pass the same alignment setting to both workflow rules (`--penalty-gap-enter-cds 2`, or `--gap-alignment-side right`)
2. Rebuild the reference trees
3. Set the parameter in the four `pathogen.json` files, and the minimum Nextclade version for `penaltyGapEnterCds`
4. Check `qc.frameShifts.ignoredFrameShifts` against the frameshifts that the new alignment reports
5. Compare old and new output on a large sample of real genomes (clade, lineage, nearest node, private mutations, QC status), and put the comparison in the dataset pull request
6. Add a genome with the short `ATGAAG` repeat to the `clade-iib` and `lineage-b.1` example sequences
7. Add a changelog entry about the moved indel coordinates

Users who need the previous output can use the previous dataset tag.
