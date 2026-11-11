# Recombination detection: opt-in and quality control of calls

## Related issues

- [kb/issues/M-recombination-whole-sequence-calls.md](../issues/M-recombination-whole-sequence-calls.md)
- [kb/issues/M-recombination-min-region-length.md](../issues/M-recombination-min-region-length.md)
- [kb/issues/M-recombination-gamma-default.md](../issues/M-recombination-gamma-default.md)
- [kb/issues/N-recombination-confidence-threshold.md](../issues/N-recombination-confidence-threshold.md)

Open questions that this ticket does not decide:

- [kb/issues/M-recombination-user-opt-in.md](../issues/M-recombination-user-opt-in.md)
- [kb/issues/N-recombination-cli-parameter-flags.md](../issues/N-recombination-cli-parameter-flags.md)

## Context

A scientific review of the first implementation (2026-11) ran it on the example sequences of CVA16, EV-D68, SARS-CoV-2, flu H3N2 HA, RSV-A and mpox. Most calls mark regions of high mutation density as expected. Some calls are dubious:

- regions of a few tens of nucleotides, often next to a missing run
- regions that consist mostly of `N`
- calls that cover the whole sequence: divergent queries, and short fragments (RSV-A G-gene fragments, mpox), where the all-recombinant path pays no switch cost
- calls on pathogens where the model does not fit, such as HIV, whose whole genome carries a high density of private mutations

The review asks for two things: detection only where a dataset asks for it, and calls only when the evidence is strong, at the cost of missing ambiguous cases.

## Decided changes

### 1. Opt-in

- `recombination.enabled` in `pathogen.json` switches detection on. Absent or `false` means off
- When detection is on and the dataset cannot support it (no tree, fewer than two clades, no branch mutations, degenerate estimates), loading the dataset fails with an error that names the cause. There is no silent skip
- CLI: `--with-recombination` switches detection on and `--without-recombination` switches it off, overriding `enabled`. The name of the off flag follows `--without-greedy-tree-builder`
- When detection is off, the web app shows no `Rec.` column and no recombination markers, and the outputs carry no recombination fields
- Nextclade Web gets no user toggle in this ticket

### 2. Parameters

- Default `gamma` becomes `0.01 / L` instead of `1 / L`, where `L` is the reference length. In many viral species recombinants are rare, so the expected switch rate is far below one per genome. The lower rate also needs more mutations for a call and removes very short calls
- `gamma` stays an absolute value in `pathogen.json`. There is no separate factor key
- The estimates of `muW` and `muR` stay as they are. Dataset curators should freeze reviewed values in `pathogen.json`; a missing value is estimated from the tree
- Remove the `minPrivateSubsToRun` key. The code still skips sequences without private substitutions, because their observation vector cannot produce a call
- Data repository: `scripts/recombination_params` uses the same `gamma` default, and writes only `gamma`, `muW` and `muR`. It does not write `enabled`, so freezing parameters does not switch detection on

### 3. Region QC

Applies to each decoded region after the trimming of missing ends. A missing site is a site that the decoder observes as `Missing`: `N`, other ambiguity codes, deletions, placement-masked sites, and sites outside the alignment.

- Drop the region when the fraction of missing sites in its span is above `maxRegionMissingFraction` (default 0.5)
- Otherwise drop it when its span is below `minRegionLength` nucleotides (default 50)

### 4. Sequence QC

Applies to the regions that pass the region QC. Either rule drops all regions of the sequence, and the sequence gets no call. The rules run in this order:

1. **Coverage**: the total span of the regions divided by the span of the alignment range is above `maxRecombinantFraction` (default 2/3). A sequence that is recombinant almost everywhere carries no localized signal
2. **Rest of the sequence**: the rest must still fit the tree. Remove the private substitutions and private deletions inside the regions, and compute the weighted total of the private-mutation QC rule on the remaining ones, with the weights of `qc.privateMutations`. The rest fails when the weighted total is at least `(typical + cutoff) * Lm / L`, where `Lm` is the number of covered sites outside the regions (inside the alignment, not missing) and `L` is the reference length. This is the same as the private-mutation score with `typical` and `cutoff` each scaled by `Lm / L` reaching 100. A shorter rest gets a stricter threshold. Placement is not recomputed

When detection is on and `qc.privateMutations` is absent or disabled, loading the dataset fails with an error.

### 5. Output

- Remove the confidence score and the forward-backward computation: `RecombinationRegion.confidence`, the TSV column `recombination.regionConfidences`, the confidence-scaled marker opacity, and the confidence in tooltips
- A dropped call produces no output

### 6. Configuration example

All settings sit in one `recombination` object. Values for SARS-CoV-2:

```json
"recombination": {
  "enabled": true,
  "gamma": 3.3e-7,
  "muW": 0.00017,
  "muR": 0.0061,
  "minRegionLength": 50,
  "maxRegionMissingFraction": 0.5,
  "maxRecombinantFraction": 0.667
}
```

`minRegionLength`, `maxRegionMissingFraction` and `maxRecombinantFraction` are optional, with the defaults above.

## Deferred

- Separate treatment of reversions, which are stronger evidence of recombination than other private mutations
- A `gamma` that varies along the genome, for viruses with known recombination hot and cold spots
- Placement of the flagged regions on the tree after masking

## Validation

- One unit test per rule at the lowest layer, on observation vectors and region lists, including the boundary values of each threshold
- Acceptance on the example sequences of the datasets above. The review reported these changes against the first implementation:

| dataset    | sequence                                                             | expected change                                 |
| ---------- | -------------------------------------------------------------------- | ----------------------------------------------- |
| CVA16      | `FN298942`                                                           | region under 50 bp dropped                      |
| CVA16      | `KY425537`                                                           | call removed by the lower `gamma`               |
| CVA16      | `PX448981`, `PX448985`                                               | regions merged or extended                      |
| EV-D68     | `KM892499`                                                           | region under 50 bp and over 50% missing dropped |
| EV-D68     | `PQ238715`, `PV448647`                                               | region under 50 bp dropped                      |
| EV-D68     | `OP321151`                                                           | regions merged or extended                      |
| SARS-CoV-2 | `USA/WA-S5413/2021`, `OU125106`                                      | call removed by the lower `gamma`               |
| SARS-CoV-2 | `USA/AR-CDC-ASC210377904/2021`                                       | rest of the sequence fails                      |
| RSV-A      | `PP_001LSKV`, `PP_001AG2T`, `PP_001GVQR`, `PP_001L24G`, `PP_001FP1C` | regions cover more than 2/3                     |
| RSV-A      | `PP_001F87F`                                                         | call removed by the lower `gamma`               |
| mpox (B.1) | `KJ642617`                                                           | regions cover more than 2/3                     |

The review computed the rest-of-sequence rule with the fraction of covered sites of the sequence instead of `Lm / L`. The fraction of the genome is never larger, so sequences with long missing runs can lose additional calls under this ticket.

## Done when

- The changes above are in the library, the CLI, the web app, the schemas, the docs, and the data repository script
- [kb/decisions/recombination-detection.md](../decisions/recombination-detection.md) describes the new design
- The related issues above are deleted, and [kb/issues/N-recombination-decoder-scratch-buffers.md](../issues/N-recombination-decoder-scratch-buffers.md) no longer lists the forward-backward buffers
