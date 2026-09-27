# TSV `qc.snpClusters.clusteredSNPs` ranges exclude the last clustered position

## Problem

`ClusteredSnp.end` is the 0-based position of the last substitution in a cluster (inclusive). The TSV writer passes it as the exclusive end of a half-open range, so the printed 1-based range ends one position before the last clustered substitution. A cluster at 0-based positions 5..=29 prints as `6-29:8`, not `6-30:8`.

A cluster whose first and last positions are equal (possible with `clusterCutOff: 0`) prints as `empty range:1`.

The JSON output (`clusteredSNPs[].start`, `.end`) is correct. Nextclade Web computes its own 1-based ranges from the JSON values.

## Code

- `fn format_clustered_snps()` ([packages/nextclade/src/io/nextclade_csv_row.rs#L683-L692](../../packages/nextclade/src/io/nextclade_csv_row.rs#L683-L692))
- Test that pins the shipped format: `fn test_format_clustered_snps` in the same file

## Decision needed

The column is shipped, so a fix changes TSV output for every dataset that enables `qc.snpClusters`. Fixing it means passing `end + 1`, updating the test, and announcing the change in the changelog.
