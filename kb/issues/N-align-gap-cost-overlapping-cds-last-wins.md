# Codon-aware gap penalties of overlapping CDSs depend on CDS order

## Problem

`fn get_gap_open_close_scores_codon_aware()` writes the in-frame or out-of-frame gap-open penalty CDS by CDS. Where CDSs overlap, the CDS that comes last in the gene map overwrites the penalty of the others. A position that is a codon boundary in one CDS and inside a codon in another gets the penalty of the last CDS only. The placement of gaps in overlapping regions (for example SARS-CoV-2 ORF1a/ORF1b, ORF9b inside N) therefore depends on the order of the annotation, not on all CDSs that the gap affects.

The effect on real data is not measured.

## Code

- `fn get_gap_open_close_scores_codon_aware()` in [packages/nextclade/src/align/gap_open.rs](../../packages/nextclade/src/align/gap_open.rs)

## Fix options (not decided)

- **Highest penalty**: keep the maximum of the penalties of all CDSs at a position, so a gap that breaks the frame of any CDS pays for it
- **Sum per CDS**: add the penalty of each affected CDS. This penalizes overlaps more strongly

Both change alignments in datasets with overlapping CDSs.
