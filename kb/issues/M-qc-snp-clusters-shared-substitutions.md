# SNP clusters can share substitutions

## Problem

The sliding-window cluster algorithm of `qc.snpClusters` starts a new cluster with all substitutions of the current window when the previous substitution is not the last member of the previous cluster. The new cluster can then contain substitutions that are already in the previous cluster.

Example with window 100 and cutoff 2, substitutions at 0, 10, 20, 115, 118: the clusters are {0, 10, 20} and {20, 115, 118}. Position 20 is in both.

Consequences:

- `qc.snpClusters.totalSNPs` counts shared substitutions twice
- one dense region can count as 2 clusters, which doubles its contribution to the QC score

Mutation pattern clusters use the same algorithm. Their `counts.clustered` counts each event once, but the cluster lists and cluster counts keep the overlap.

## Code

- `fn find_clusters()` ([packages/nextclade/src/analyze/mutation_patterns.rs#L382-L415](../../packages/nextclade/src/analyze/mutation_patterns.rs#L382-L415))
- The property test `test_prop_mutation_patterns_qc_clusters_matches_released_rule` pins the released QC behavior

## Decision needed

Merging overlapping clusters, or starting new clusters only after the last clustered position, changes shipped QC scores. The pattern clusters could change independently, but then pattern clusters and QC clusters would use different definitions.
