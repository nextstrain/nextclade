# Codon-aware gap cost is not charged at the gap end

## Problem

The codon-aware gap-open cost applies only at the position where a gap starts. The end of a gap has no cost. A deletion that starts before a CDS range and ends inside it pays only `penalty_gap_open`. When two placements of the deletion have the same score, the aligner can select the one that runs into the CDS:

- **Forward-strand CDS**: the deletion removes bases of the start codon
- **Reverse-strand CDS**: the deletion removes bases of the last codon, which is at the 5' end of the CDS range in reference coordinates

At the 3' end of a CDS range, a deletion that starts inside the CDS pays the CDS cost, so ambiguous deletions stay outside. Insertions pay the cost of the reference base after them, so an insertion inside a CDS or immediately before it pays the CDS cost, and ambiguous insertions stay outside.

The user documentation says that Nextclade "preferentially places gaps outside of genes in case of ambiguities" ([docs/user/algorithm/01-sequence-alignment.md#L49](../../docs/user/algorithm/01-sequence-alignment.md#L49)). This is not true for deletions at the 5' end of a CDS range.

In a tandem repeat across a CDS start, the codon-aware cost makes the result worse: the cheapest tied placement starts at the last base before the CDS, so the gap removes the start codon (mpox OPG204).

## Code

- `fn get_gap_open_close_scores_codon_aware()` makes one cost per reference position ([packages/nextclade/src/align/gap_open.rs#L16-L44](../../packages/nextclade/src/align/gap_open.rs#L16-L44))
- Deletion open: `gap_open_close[ri - 1]`, the cost of the first deleted base ([packages/nextclade/src/align/score_matrix.rs#L173](../../packages/nextclade/src/align/score_matrix.rs#L173))
- Insertion open: `gap_open_close[ri]`, the cost of the reference base after the insertion ([packages/nextclade/src/align/score_matrix.rs#L142](../../packages/nextclade/src/align/score_matrix.rs#L142))
- Gap extension has the flat cost `penalty_gap_extend`. Leaving a gap has no cost

## Impact

Start codons are lost in shipped datasets that use `"gapAlignmentSide": "left"` ([H-datasets-lost-start-codon-left-gap-side.md](H-datasets-lost-start-codon-left-gap-side.md)). With `right`, the tie-break places ambiguous deletions at the 5'-most position, which keeps them outside of the 5' end of CDS ranges. No parameter value removes the tie, because both placements start outside the CDS and have the same cost.

Minimal reproduction (CLI) and measurements: [kb/reports/alignment-gap-placement-at-cds-start.md](../reports/alignment-gap-placement-at-cds-start.md).

## Tests

`fn aligns_ambiguous_gap_outside_of_cds` ([packages/nextclade/src/align/align.rs#L677-L898](../../packages/nextclade/src/align/align.rs#L677-L898)) aligns the fixtures of `mod cds_boundary` with both gap sides and compares the aligned query inside the CDS:

| Fixture | Pattern | `Left` | `Right` |
|---|---|---|---|
| `SHORT_TIE` | 8-nt UTR deletion before the CDS start (CVA10 VP4) | fails, `#[ignore]` | passes |
| `TANDEM_REPEAT` | `ATGAAG` repeat across the CDS start (mpox OPG204) | fails, `#[ignore]` | passes |
| `N_RUN` | deletion next to an `N` run (EV-D68 VP4, GenBank MF045417) | fails, `#[ignore]` | passes |
| `UNALIGNED_5_END` | tie between an unaligned 5' end and an internal deletion (dengue C, GenBank KY586941) | fails, `#[ignore]` | passes |
| `INSERTION` | insertion in an `A` run next to the CDS start | passes | passes |
| `REVERSE_STRAND_START` | reverse-strand CDS, deletion next to the start codon | passes | passes |
| `REVERSE_STRAND_END` | reverse-strand CDS, deletion next to the last codon | fails, `#[ignore]` | passes |

Remove the `#[ignore]` attributes when this issue is fixed.

## Directions (not decided)

- **Cost at the gap end**: charge the frame-aware cost at the reference position after the gap when that position is inside a CDS. The score matrix keeps one merged state per cell, so a correct end cost needs separate match and gap matrices (3-state Gotoh). This changes the output of ambiguous gaps that end inside a CDS in all datasets
- **Move gaps after alignment**: move each ambiguous indel inside its equal-score window so that it does not overlap a CDS. The alignment algorithm does not change
- **Detection**: a warning or QC signal for a partial or deleted first codon. At the moment, the only signal is `unknownAaRanges`

## Rollout constraints

Nextclade has many users, datasets and pipelines that store indel coordinates and depend on the current placement. A change of placement changes deletion and insertion coordinates, aa deletions, frameshift ranges, private mutations and QC results.

- **Opt-in parameter**: add a new `alignmentParams` field (e.g. a boolean for the gap-end cost). When the field is not set, scores and output do not change. Older Nextclade versions ignore unknown `pathogen.json` fields, so a dataset that sets the field still loads everywhere
- **Minimum version**: a dataset that sets the field also sets `compatibility.cli` and `compatibility.web` to the first version that has it. Then older versions get the previous dataset version and do not give different results for the same dataset tag
- **Dataset content**: a dataset that opts in must rebuild the content that stores indel coordinates with the same alignment settings: the reference tree (if built from Nextclade alignments), `qc.frameShifts.ignoredFrameShifts` (exact codon-range match in `fn is_frame_shift_ignored()`), and other position lists
- **Comparison**: each opt-in has an old-versus-new comparison on the examples and on a large sample of real genomes (indels, aa changes, frameshifts, clade, nearest node, private mutations, QC status)
- **Default**: change the default only in a major release, after datasets have used the parameter. Keep an explicit value that gives the previous behavior
