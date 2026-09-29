# Mutation pattern `cluster` object has undocumented default values

## Problem

`struct MutationPatternClusterConfig` has `#[serde(default)]` with `windowSize: 100` and `cutoff: 5`. A dataset can therefore write `"cluster": {}`, or give only one of the two fields, and Nextclade fills in the other value without a message. The pathogen config documentation and the JSON schema describe both fields but not these defaults.

Two effects follow:

- **Typos are silent**: the struct accepts unknown fields, so `"cluster": { "windowsize": 200, "cutoff": 0 }` clusters with a window of 100
- **Inconsistent with `cluster: true`**: `true` is rejected because it does not say which window and cutoff to use, while `{}` is accepted with values that no document states

## Code

- `struct MutationPatternClusterConfig` (`packages/nextclade/src/analyze/virus_properties.rs`)
- `fn deserialize_mutation_pattern_cluster()` rejects `true` (same file)

## Fix options

- **Require both fields**: remove the defaults, so a missing field fails the dataset load with a message that names it. Typos in a field name then also fail, because the correct field is missing
- **Document the defaults**: keep them, state them in `docs/user/input-files/05-pathogen-config.md` and in the field doc comments, and accept `cluster: true` as the default rule
