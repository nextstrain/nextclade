# Ambiguous in-frame deletion can remove the start codon

## Problem

An in-frame deletion next to a CDS start can have several placements inside of the CDS with the same score. This happens when the codons at both ends of the deleted range are the same. Each of these placements starts at a codon boundary inside of the CDS and pays `penaltyGapOpenInFrame`, so `penaltyGapEnterCds` does not separate them, and `gapAlignmentSide` selects one. With `right` (gaps at the 5'-most position), the deletion can remove codon 1. Nextclade then reports a deletion of the start codon, although the query has an intact start codon.

Example: mpox OPG112 (CDS starts at 91247), sample Ivory_Coast_2012 of the `nextstrain/mpox/all-clades` examples, with `penaltyGapEnterCds: 2`:

```
ref    CCGATAA ATG GAA ATG GAT AAA    protein MEMDK
left   CCGATAA ATG --- --- GAT AAA    M--DK   aa deletions E2-, M3-
right  CCGATAA --- --- ATG GAT AAA    --MDK   aa deletions M1-, E2-
```

Both alignments describe the same query, with the same protein length and reading frame. Only the reported deleted codons differ. With `right`, Nextclade versions after 3.24.0 also report a lost start codon in the `warnings` output, because the first codon of the query is `---`.

The case needs a codon repeat at the CDS start and a dataset that uses `right`. In the example sequences of 94 datasets of `nextclade_data`, aligned with both gap sides, this example is the only occurrence. A reverse-strand CDS has its start codon at the high-coordinate end, so there `left` (gaps at the 3'-most position) can remove it. This follows from the symmetry of the tie-break and was not observed in the examples.

## Tests

`fn aligns_deletion_entering_cds` ([packages/nextclade/src/align/align.rs](../../packages/nextclade/src/align/align.rs)) with fixture `STRADDLE` expects the deletion of codons 1-2 (`STRADDLE_CODONS_1_2`) with `right`. Change this expectation when the issue is fixed.

## Directions (not decided)

- **Accept and document**: the deletion stays in-frame, and only the reported codons differ
- **Penalty for a deletion that removes the first base of a CDS**: in the example, the deletion of codons 2-3 wins. Two problems:
  - When the only alternatives are a deletion that enters the CDS from outside and a deletion of exactly codon 1, both pay the new penalty, and the entering deletion wins again because `penaltyGapOpen` is lower than `penaltyGapOpenInFrame`. `penaltyGapEnterCds` must then grow by the same amount, so the two values depend on each other
  - The start codon of a reverse-strand CDS is at the high-coordinate end. A penalty for deletions that leave a CDS at that end can replace a real deletion across the CDS end with a deletion next to it plus an extra substitution. This happened in SARS-CoV-2 (deletion 27887-27901 across the ORF7b end, substitution A27887T) when the same penalty was charged at both CDS ends
