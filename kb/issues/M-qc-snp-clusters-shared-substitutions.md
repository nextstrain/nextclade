# SNP clusters can share substitutions

## Problem

The sliding-window cluster algorithm of `qc.snpClusters` starts a new cluster with all substitutions of the current window when the previous substitution is not the last member of the previous cluster. The new cluster can then contain substitutions that are already in the previous cluster.

Example with window 100 and cutoff 2, substitutions at 0, 10, 20, 115, 118: the clusters are {0, 10, 20} and {20, 115, 118}. Position 20 is in both.

Consequences:

- `qc.snpClusters.totalSNPs` counts shared substitutions twice
- one dense region can count as 2 clusters, which doubles its contribution to the QC score

Mutation pattern clusters use the same algorithm. Their `counts.clustered` counts each event once, but the cluster lists and cluster counts keep the overlap.

## Code

- `fn find_clusters()` in `packages/nextclade/src/analyze/sliding_window_clusters.rs`, shared by the QC rule and mutation patterns
- The property test `test_prop_rule_snp_clusters_matches_released_rule` in `packages/nextclade/src/qc/qc_rule_snp_clusters.rs` pins the released QC behavior

## Fix options

Any change to the QC rule changes shipped QC scores, so it needs a decision.

- **Count unique substitutions**: compute `totalSNPs` from the distinct substitutions of all clusters. Scores keep counting clusters, so only the reported total changes
- **Versioned rule**: add a new cluster definition, for example one where a new cluster starts only after the last clustered position, behind a new config key. Datasets opt in, and the released behavior stays the default

The mutation pattern clusters could change independently, but then pattern clusters and QC clusters would use different definitions.
