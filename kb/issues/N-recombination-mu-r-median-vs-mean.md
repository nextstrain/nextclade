# Central tendency for muR estimation: median vs mean

## Context

`estimate_mu_r` computes pairwise inter-clade leaf distances and takes a central value. The specification says "typical divergence" without specifying which statistic.

Currently: **median**.

## Pros and cons

### Median (current)

- Robust to outliers: a few pathologically long terminal branches or nested short-distance pairs do not skew the result
- Consistent with the "typical" framing in the specification
- Insensitive to the shape of the distance distribution -- only the rank order matters
- Downside: ignores magnitude information. Two distributions with different means but the same median produce the same `muR`

### Mean

- Uses all distance information, including magnitudes
- More sensitive to long-tailed distributions: a clade with a few very divergent leaves pulls the mean upward, increasing `muR` and making detection more sensitive for those cases
- Downside: sensitive to outliers. A single divergent leaf (e.g. a sequencing artifact placed in a clade) inflates `muR` and can cause false recombinant calls
- Downside: `muW` already uses the mean (for terminal branch lengths). Using the same statistic for both would make their ratio sensitive to the same outliers, reducing discriminative stability

## Recommendation

Keep median unless profiling on real Enterovirus datasets shows that the median systematically underestimates `muR` relative to observed recombinant mutation densities. If the mean is adopted, consider aligning `muW` to use the median as well, so that both parameters have the same robustness profile.

## Scope

`packages/nextclade/src/analyze/recombination/estimate.rs`: `estimate_mu_r`, call to `median()`.
