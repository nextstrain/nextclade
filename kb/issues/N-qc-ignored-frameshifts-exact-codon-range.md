# `ignoredFrameShifts` matches only exact codon ranges

## Problem

`fn is_frame_shift_ignored()` ignores a frameshift only when the CDS name and the codon range equal an entry of `qc.frameShifts.ignoredFrameShifts` exactly. The codon range of a frameshift depends on where the aligner places the indels. A change of alignment settings (`gapAlignmentSide`, `penaltyGapEnterCds`) or of the aligner moves ambiguous indels, the codon range changes, and the entry no longer matches.

Example, `nextstrain/mpox/all-clades`: the same frameshift is `OPG047:479-483` with `left` and `OPG047:483` with `right`. With `right`, Ivory_Coast_2012 has 2 counted frameshifts and QC `good` instead of 5 and `bad`, and QC score changes for 6 of 13 examples.

QC results of datasets with an ignore list thus depend on alignment details, and every change of the aligner or of the dataset's alignment settings needs a check of the ignore list.

## Code

- `fn is_frame_shift_ignored()` in [packages/nextclade/src/qc/qc_rule_frame_shifts.rs](../../packages/nextclade/src/qc/qc_rule_frame_shifts.rs)

## Fix options (not decided)

- **Overlap match**: ignore a frameshift whose codon range overlaps an entry of the same CDS
- **Tolerance**: match codon ranges within a few codons
- **Keep exact match**: document that the ignore list must be rebuilt with every alignment change

The first two change QC results of datasets with ignore lists.
