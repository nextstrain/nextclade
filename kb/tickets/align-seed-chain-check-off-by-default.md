# Turn the seed chain check off by default

## Goal

Stop the false rejections of the seed chain check in the default configuration, without removing the check. The check runs only when `--max-seed-chain-deletion-ratio` or `maxSeedChainDeletionRatio` in `alignmentParams` of `pathogen.json` is set. This is the short-term step of [`proposals/align-sequences-with-distant-parts.md`](../proposals/align-sequences-with-distant-parts.md); the correct treatment of sequences with distant parts is open there.

## Changes

- Make `max_seed_chain_deletion_ratio` of `struct AlignPairwiseParams` optional with no default value; an unset value turns the check off ([packages/nextclade/src/align/params.rs#L152-L164](../../packages/nextclade/src/align/params.rs#L152-L164)). The field shipped in 3.26.0, so a `pathogen.json` or a command line that sets a number must stay valid
- Remove the value of the `short-sequences` preset, which only turned the check off
- Run the check in `fn align_nuc()` only when the ratio is set ([packages/nextclade/src/align/align.rs#L76-L98](../../packages/nextclade/src/align/align.rs#L76-L98)), and let the error message say how to turn the check off
- Describe the default and the risk of false rejections in the parameter help, the alignment docs and the changelog. Regenerate the schemas and the CLI reference
- State in the changelog that sequences with distant parts, for example two amplicons joined by 100 `N`, again get one long deletion, and that setting the ratio rejects them

## Done when

- Unit tests: the check is off with every preset unless the dataset or the CLI sets the ratio, the CLI value overrides the dataset value, and the validation accepts an unset ratio
- On the Pathoplexus sequences of the proposal, the default output equals Nextclade 3.29.0 with the check off, and `--max-seed-chain-deletion-ratio=10` gives the same rejections as Nextclade 3.29.0

## Related issues

- [`issues/H-align-seed-chain-check-rejects-correct-alignments.md`](../issues/H-align-seed-chain-check-rejects-correct-alignments.md)
