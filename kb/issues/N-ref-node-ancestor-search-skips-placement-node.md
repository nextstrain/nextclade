# Ancestor node searches skip the node where the sample is placed

## Problem

The `ancestor-earliest` and `ancestor-nearest` algorithms of custom node searches (`.meta.extensions.nextclade.ref_nodes.search[].criteria[].node[].searchAlgo` in the reference tree) never check the node where the sample is placed. Both start at the parent of that node: `fn graph_find_backwards_last()` ([packages/nextclade/src/graph/search.rs#L48](../../packages/nextclade/src/graph/search.rs#L48)) and `fn graph_find_backwards_first()` ([packages/nextclade/src/graph/search.rs#L9](../../packages/nextclade/src/graph/search.rs#L9)) apply the predicate to parents only, and the search passes the placement node as the start ([packages/nextclade/src/tree/tree_find_ancestors_of_interest.rs#L172-L177](../../packages/nextclade/src/tree/tree_find_ancestors_of_interest.rs#L172-L177)).

A sample placed directly on a matching node therefore gets no result: `N/A` in the `relativeMutations['<displayName>'].*` columns.

The clade founder search uses the same backward search but falls back to the placement node when no ancestor matches ([packages/nextclade/src/tree/tree_find_clade_founder.rs#L20](../../packages/nextclade/src/tree/tree_find_clade_founder.rs#L20)). So a custom search that should reproduce the clade founder gives a different answer in this case.

Example: SARS-CoV-2 dataset (`nextstrain/sars-cov-2/wuhan-hu-1/orfs`) with an added search `qry.clade = ["21K"]`, `node.clade = ["21K"]`, `searchAlgo = "ancestor-earliest"`. Of the three example sequences in clade 21K, the one placed below the founder `NODE_0001041` gets `NODE_0001041`. The two placed directly on `NODE_0001041` get `N/A`, while `founderMuts['clade'].nodeName` is `NODE_0001041` for all three.

No dataset in `nextclade_data` sets `searchAlgo`, so no shipped dataset is affected. The user documentation describes the current behavior.

## Fix options

- Check the placement node first in both ancestor searches. This matches the clade founder search, but changes the output of any dataset that relies on the current behavior
- Keep the behavior and keep it documented
