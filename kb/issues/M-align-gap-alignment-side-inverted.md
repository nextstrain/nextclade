# `gapAlignmentSide` behavior is opposite to its documentation

## Problem

The documentation of `GapAlignmentSide` says that `Left` places ambiguous gaps on the 5' side and `Right` on the 3' side ([packages/nextclade/src/align/params.rs#L15-L19](../../packages/nextclade/src/align/params.rs#L15-L19)). The aligner does the opposite, for both deletions and insertions.

Example without annotation, reference `...C AAAA G...` at 201-206, queries that delete or insert `AA`:

| Setting          | Deletion            | Insertion          |
| ---------------- | ------------------- | ------------------ |
| `left` (default) | `204-205` (3'-most) | `205:AA` (3'-most) |
| `right`          | `202-203` (5'-most) | `201:AA` (5'-most) |

Dataset maintainers who select `left` to get the usual 5' normalization of indels get the 3' placement. With the codon-aware cost only at the gap start, the 3' placement moves ambiguous gaps into CDS starts ([M-align-gap-end-cost-in-cds.md](M-align-gap-end-cost-in-cds.md)).

## Code

- Tie-break: `if score - left_align < tmp_score` ([packages/nextclade/src/align/score_matrix.rs#L159](../../packages/nextclade/src/align/score_matrix.rs#L159), [packages/nextclade/src/align/score_matrix.rs#L187](../../packages/nextclade/src/align/score_matrix.rs#L187)). With `Left` (`left_align = 1`), a gap wins a tie against a match in the forward fill. The backtrace starts at the 3' end and goes into the gap at the first tied cell, which gives the 3'-most placement

## Tests

The tests pin the current behavior ([packages/nextclade/src/align/align.rs#L495-L592](../../packages/nextclade/src/align/align.rs#L495-L592)):

- `fn aligns_ambiguous_gap_placing_left`: deletion with `Left`, expects `ACAT---CTTC` (3')
- `fn aligns_ambiguous_gap_placing_right`: deletion with `Right`, expects `ACA---TCTTC` (5')
- `fn aligns_ambiguous_gap_placing_case_reversed_left`: insertion with `Left`, expects `ACAT---CTTG` in the reference (3')
- `fn aligns_ambiguous_gap_placing_case_reversed`: insertion with `Right`, expects `ACA---TCTTG` in the reference (5')

The test names describe the documented meaning, not the tested placement.

## Current use

In `nextclade_data`, 60 of 109 datasets set `right`, 18 set `left`, and 31 do not set the option (default `left`).

Details: [kb/reports/alignment-gap-placement-at-cds-start.md](../reports/alignment-gap-placement-at-cds-start.md).

## Directions (not decided)

- **Change the documentation to agree with the behavior** (`left` = 3', `right` = 5'), and rename the unit tests. No output change. The option names stay counterintuitive
- **Rename the values** (e.g. `five-prime` and `three-prime`) and keep `left` and `right` as deprecated aliases with the current behavior. `gapAlignmentSide` is a shipped `pathogen.json` field and CLI flag, so the old values must stay accepted

## Rollout constraints

- `left` and `right` keep their current behavior. They are in datasets, CLI calls and published pipelines
- The documentation fix changes no output and needs no coordination
- New value names are aliases. Nextclade continues to write `left` and `right` when it serializes parameters, so its output stays readable by older versions
- Older Nextclade versions reject unknown enum values in `pathogen.json`. A dataset that uses a new value name must set `compatibility.cli` and `compatibility.web` to the first version that accepts it
