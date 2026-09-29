# Mutation pattern marks are hard to find in crowded sequence view rows

## Problem

At full-genome scale, a row with many other markers hides the small triangle marks of mutation pattern matches. Examples are rows with thousands of insertion markers, long missing ranges, or frameshift markers, such as divergent mpox sequences analyzed against a distant reference. The marks become visible only when the user hovers over one of them, which fades the other markers.

A still image of the results table therefore does not show where the matches are.

## Code

- `fn SequenceMarkerPatternMatchUnmemoed()` draws the marks (`packages/nextclade-web/src/components/SequenceView/SequenceMarkerMutationPatterns.tsx`)
- `fn SequenceViewRelative()` draws the other markers of the row (`packages/nextclade-web/src/components/SequenceView/SequenceViewRelative.tsx`)

## Fix options

- **Draw marks above all other markers**: render the pattern lane last and give it an opaque background
- **Pattern focus toggle**: a control that keeps the fading on without hovering, so a screenshot shows only the pattern matches
- **Workaround**: the sequence view settings can hide insertion, gap and missing markers
