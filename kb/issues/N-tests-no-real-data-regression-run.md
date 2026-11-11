# No regression run on real sequences before a release

## Problem

Changes of alignment behavior are evaluated on the example sequences of the datasets in `nextstrain/nextclade_data`. These examples are mostly complete genomes of good quality, so they rarely contain short divergent amplicons, joined records or other partial data. The seed chain check of [#1801](https://github.com/nextstrain/nextclade/pull/1801) rejected 1 of 4,751 example sequences, but 99 correct alignments in public Pathoplexus data, and the change reached users through releases 3.26.0 to 3.29.0. Evidence: [`proposals/align-sequences-with-distant-parts.md`](../proposals/align-sequences-with-distant-parts.md).

## Fix

Add a heavy target, outside routine checks, that runs two Nextclade builds on public sequences of several organisms with the datasets and flags of a real pipeline (for example the Pathoplexus data and dataset tags), and reports every sequence whose error status, alignment range, deletions, coverage or QC status changes. Run it before each release that changes alignment, translation or QC.

## Validation

- The run reports the 107 hMPV, 3 West Nile, 3 Zika and 1 ANDV L rejections when it compares Nextclade 3.24.0 with 3.29.0
