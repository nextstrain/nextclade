# Private deletion weights of the private mutations QC rule have no effect

## Problem

`qc.privateMutations` in `pathogen.json` accepts `weightReversionDeletions`, `weightLabeledDeletions` and `weightUnlabeledDeletions`, but the rule never reads them. Private deletions are not divided into reversion, labeled and unlabeled deletions, and each range of adjacent private deletions counts once with weight 1 in the weighted total. A dataset that sets these weights gets no change in its scores. No dataset in `nextstrain/nextclade_data` sets them to a value other than 1.

The categories were removed on purpose in 2022, when the rule moved to detailed private mutations, because deletions had many edge cases. The config fields stayed. The schema and the documentation now say that the fields have no effect. The schema example of `qc.privateMutations` still lists the three weights, because it is the serialized `QcRulesConfigPrivateMutations::example()`, which sets every field.

## Code

- Fields in `struct QcRulesConfigPrivateMutations` in `packages/nextclade/src/qc/qc_config.rs`
- Weighted total in `fn rule_private_mutations()` in `packages/nextclade/src/qc/qc_rule_private_mutations.rs`

## Fix options

- **Classify private deletions**: find reversion and labeled deletions, as for substitutions, and apply the weights per deletion range. This changes scores of datasets that set the weights and needs rules for ranges that mix categories
- **Deprecate the fields**: keep parsing them for compatibility, mark them deprecated in the schema, and remove them in a later breaking release, which also takes them out of the schema example
