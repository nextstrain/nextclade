# QC length scaling assumes an even mutation rate along the genome

## Problem

With `lengthScaling`, the private mutations, mixed sites and missing data QC rules multiply their thresholds by `max(length, minLength) / referenceLength`. This assumes that events are spread evenly over the genome. Private mutations are not: hypervariable regions carry more of them than their share of the genome length, and conserved regions fewer. A fragment of a hypervariable region then gets a higher score than a full genome of the same quality, and a fragment of a conserved region gets a lower one.

Evidence: with the RSV datasets `nextstrain/rsv/a/EPI_ISL_412866` and `nextstrain/rsv/b/EPI_ISL_1653999` (genome-wide `typical` 50, `cutoff` 150) and `privateMutations.lengthScaling.minLength` 700, five of the 64 example sequences change QC status. All five are fragments of 670 to 1000 nt in the G gene, which RSV genotyping sequences most often and which mutates faster than the genome average:

| Sequence     | Dataset | Span (nt) | Private substitutions | Score without scaling | Score with scaling |
| ------------ | ------- | --------- | --------------------- | --------------------- | ------------------ |
| `PP_001L24G` | RSV-A   | 684       | 10                    | 0                     | 126 (bad)          |
| `PP_001FP1C` | RSV-A   | 672       | 9                     | 0                     | 112 (bad)          |
| `PP_00227DV` | RSV-B   | 1000      | 26                    | 0 (overall mediocre)  | 251 (bad)          |
| `PP_00250EU` | RSV-B   | 750       | 7                     | 0                     | 75 (mediocre)      |
| `PP_0025TML` | RSV-B   | 672       | 7                     | 0                     | 68 (mediocre)      |

For a G fragment of up to 700 nt the scaled `typical` is 2.3 private mutations. Whether these sequences are of poor quality or normal for G is not established.

## Code

- `fn qc_length_scaling()` in `packages/nextclade/src/qc/qc_length_scaling.rs` computes the factor from lengths only
- Each rule chooses its length in `packages/nextclade/src/qc/qc_rule_private_mutations.rs`, `qc_rule_mixed_sites.rs` and `qc_rule_missing_data.rs`

## Fix options

Any change of the factor changes the QC scores of datasets that use scaling, so it needs a decision.

- **Per-dataset parameters**: keep linear scaling and let datasets with hypervariable fragments raise `minLength` or `typical`. No code change, but one `typical` cannot fit both full genomes and fragments of a fast region
- **Rate-weighted length**: weight each covered reference position by its share of the mutations on the reference tree, so that the factor is the expected share of private mutations in the covered region. Applies to the private mutations rule only, and needs a reference tree
- **Per-region thresholds**: let `pathogen.json` give thresholds for named regions, such as the G gene, and use them when a sequence covers only that region
