# Lost start codon warning ignores CDSs removed by `--cds-selection`

## Problem

The lost start codon warning skips a CDS that continues the reading frame of another CDS: a CDS on the same strand that ends directly before it, without a stop codon. This rule identifies mature peptides of a polyprotein that the genome annotation lists as separate CDSs, for example HIV-1 `p7` after `p2`, or dengue `E` after `M`. Their first codon is not a start codon, so a change there is an ordinary amino acid substitution (e.g. `p7:M1W`).

The rule sees only the CDSs that remain after `--cds-selection`. With `--cds-selection E` for dengue, `M` is not in the gene map, so `E` looks like a CDS with its own start codon. A change of its first codon then produces a false "The start codon is lost" warning. Results other than the `warnings` output do not change.

Datasets without a CDS selection are not affected. In the annotations of `nextclade_data`, the rule skips exactly the mature peptides that start with `ATG` (HIV-1 `p7`, HAV `VP3` and `2A`, dengue `E`), and all other CDSs that start with `ATG` keep the check.

## Code

- Rule: `fn find_cdses_with_start_codon()` in [packages/nextclade/src/analyze/find_lost_start_codons.rs](../../packages/nextclade/src/analyze/find_lost_start_codons.rs), called once per dataset in `fn Nextclade::new()` ([packages/nextclade/src/run/nextclade_wasm.rs](../../packages/nextclade/src/run/nextclade_wasm.rs))
- CDS selection: `fn filter_gene_map()` in [packages/nextclade/src/gene/gene_map.rs](../../packages/nextclade/src/gene/gene_map.rs). The CLI dataset loaders in [packages/nextclade-cli/src/dataset/dataset_download.rs](../../packages/nextclade-cli/src/dataset/dataset_download.rs) and `fn NextcladeParams::from_auspice()` apply it before `Nextclade::new()` receives the gene map

## Fix options

- Apply the CDS selection inside `Nextclade::new()`, after the rule has seen the full annotation. `struct NextcladeParams` then carries the selection instead of a filtered gene map, and every loader stops filtering
- Compute the set of CDSs with a start codon in the loaders, before filtering, and pass it in `struct NextcladeParams`. This adds a second place that derives data from the annotation
