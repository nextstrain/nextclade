# CDS entry penalty is off by default

## Problem

The alignment parameter `penaltyGapEnterCds` (CLI argument `--penalty-gap-enter-cds`) charges a deletion that extends from a position outside of all CDSs into a CDS. Its default is 0. Datasets that do not set it keep two defects of the codon-aware gap penalties, which apply only where a deletion starts:

- **Ties**: an ambiguous deletion that starts before a CDS and runs into it costs the same as a placement outside of the CDS. `gapAlignmentSide` selects the placement, and `left` (the default, gaps at the 3'-most position) removes the first bases of the CDS in reference coordinates: the start codon of a forward-strand CDS, or the last codon of a reverse-strand CDS
- **Straddle**: a deletion that starts before a CDS and cuts into it is cheaper than an in-frame deletion inside of the CDS by `penaltyGapOpenInFrame - penaltyGapOpen`. This happens with both gap sides (e.g. mpox OPG112, Ivory_Coast_2012: translation `-XMDKR`)

The default is 0 because a non-zero value changes the alignment of sequences with a deletion that enters a CDS: indel coordinates, `alignmentScore`, aa deletions, private mutations and frameshift ranges. Datasets, trees and pipelines store these values.

Mechanism and measurements: [kb/reports/alignment-gap-placement-at-cds-start.md](../reports/alignment-gap-placement-at-cds-start.md).

## Code

- Parameter: `penalty_gap_enter_cds` in `struct AlignPairwiseParams` ([packages/nextclade/src/align/params.rs](../../packages/nextclade/src/align/params.rs))
- Penalty map: `fn get_gap_open_close_scores_codon_aware()` adds the penalty to `GapScoreMap::extend_deletion` at the first coding base after a non-coding base ([packages/nextclade/src/align/gap_open.rs](../../packages/nextclade/src/align/gap_open.rs))

## Rollout

Decided:

- Datasets opt in with `alignmentParams.penaltyGapEnterCds`. Affected shipped datasets: [H-datasets-lost-start-codon-left-gap-side.md](H-datasets-lost-start-codon-left-gap-side.md)
- The default changes only in a major release, after datasets have used the parameter. An explicit `0` keeps the previous behavior

Not decided:

- **Default value**: the smallest value that also fixes the straddle is `penaltyGapOpenInFrame - penaltyGapOpen + 1`, which depends on the open penalties of each dataset. A fixed default of 1 fixes ties only. A default derived from the open penalties fixes both, but changes meaning when a dataset changes its open penalties
