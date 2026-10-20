# `aaMotifs` entries with the same name overwrite each other

## Problem

`fn find_aa_motifs()` groups the found motifs by name with `chunk_by`, which groups only adjacent motifs, and then collects the groups into `AaMotifsMap`, a `BTreeMap` keyed by name. When two `aaMotifs` entries in `pathogen.json` have the same name and are not adjacent, the group of the later entry replaces the group of the earlier entry, and the motifs of the earlier entry are lost without a warning. Example: with entries named `a`, `b`, `a`, the result for `a` contains only the motifs of the third entry. Adjacent entries with the same name are merged correctly.

The lost motifs are absent from `aaMotifs` and from the reference motifs that `aaMotifsChanges` compares against, so the CSV/TSV motif columns and the JSON outputs are incomplete.

No released dataset is affected. The 14 datasets with `aaMotifs` in `nextclade_data` (branch `release`) use unique entry names: `glycosylation` in the influenza datasets, and `glycosylation`, `cleavage_site`, `polybasic_cleavage_site` in `community/moncla-lab/iav-h5`.

## Code

- Grouping by name: `pub fn find_aa_motifs()` ([packages/nextclade/src/analyze/find_aa_motifs.rs#L86-L99](../../packages/nextclade/src/analyze/find_aa_motifs.rs#L86-L99))
- Map type: `pub type AaMotifsMap` ([packages/nextclade/src/analyze/find_aa_motifs_changes.rs#L15](../../packages/nextclade/src/analyze/find_aa_motifs_changes.rs#L15))

## Fix

Both options change behavior for datasets with duplicate names, so the choice needs approval:

- **Group all motifs of one name**: collect into the map with an entry-append (for example `into_group_map_by`) instead of `chunk_by`, so entries with the same name contribute to one group. This treats duplicate names as one motif type split over several entries
- **Reject duplicate names**: return an error from `AaMotifsSearch::new` that names the duplicate entry, so the dataset fails to load. This treats a duplicate name as a dataset error, in the same way as an invalid regular expression
