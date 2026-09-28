# Ambiguous nucleotide markers do not count toward the marker limit

## Problem

The sequence views in Nextclade Web show only coverage when a sequence has more markers than `maxNucMarkers` (default 500), because drawing many SVG markers makes the results table slow. Both views draw a marker for each range of ambiguous nucleotides (`nonACGTNs`), but the marker count leaves these markers out. A sequence with many ambiguous nucleotides is drawn with all its markers, even when the total is above the limit.

## Code

- `SequenceViewAbsolute`: `ambigViews` ([packages/nextclade-web/src/components/SequenceView/SequenceViewAbsolute.tsx#L71](../../packages/nextclade-web/src/components/SequenceView/SequenceViewAbsolute.tsx#L71)) is missing from `totalMarkers` ([packages/nextclade-web/src/components/SequenceView/SequenceViewAbsolute.tsx#L118](../../packages/nextclade-web/src/components/SequenceView/SequenceViewAbsolute.tsx#L118))
- `SequenceViewRelative`: same for `ambigViews` ([packages/nextclade-web/src/components/SequenceView/SequenceViewRelative.tsx#L77](../../packages/nextclade-web/src/components/SequenceView/SequenceViewRelative.tsx#L77)) and `totalMarkers` ([packages/nextclade-web/src/components/SequenceView/SequenceViewRelative.tsx#L107](../../packages/nextclade-web/src/components/SequenceView/SequenceViewRelative.tsx#L107))

## Fix

Add `ambigViews.length` to `totalMarkers` in both views. Sequences near the limit then switch to the coverage view sooner.
