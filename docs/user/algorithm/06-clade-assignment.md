# 6. Clade assignment

To ease discussion of co-circulating virus variants, Nextstrain groups them into **clades**, which are defined by specific combination of signature mutations. Clades are groups of related sequences that share a common ancestor. For SARS-CoV-2, we try to align these clades as much as possible with [WHO variant designations](https://www.who.int/en/activities/tracking-SARS-CoV-2-variants/).

In contrast to [Nextstrain.org's](https://nextstrain.org) analysis pipeline, which requires setting up and running a heavy computational job to assign clades, Nextclade takes a lightweight approach, and assigns your sequences to clades by placing them on a phylogenetic tree that is annotated with clade definitions. More specifically, Nextclade assigns the clade of the nearest tree node/tip found in the "Phylogenetic placement" step, above. This is an accuracy to runtime performance trade-off - Nextclade provides almost instantaneous result, but is expected to be slightly less accurate than the full pipeline.

Note: Nextclade only considers those clades which are present in the reference tree. It is important to make sure that every that you expect to find in the results is well represented in the reference tree. If unsure, use one of the default trees or any other up-to-date and sufficiently diverse tree. For focal regional studies, it is recommended to specifically include clades that are specific for your region.

#### Nextstrain clades for SARS-CoV-2

   <!-- TODO: Possibly update this section -->

By the end of 2020, Nextstrain had defined 11 major clades (see [this blog post](https://nextstrain.org/blog/2021-01-06-updated-SARS-CoV-2-clade-naming) for details):

- 19A and 19B emerged in Wuhan and have been dominating the early outbreak

- 20A emerged from 19A out of dominated the European outbreak in March and has since spread globally

- 20B and 20C are large genetically distinct subclades 20A emerged in early 2020

- 20D to 20I have emerged over the summer of 2020 and include two "variants of concern" (VOC) with signature mutations S:N501Y.

   <!-- TODO: add clade schema -->

You can find the exact, up-to-date clade definitions in [github.com/nextstrain/ncov](https://github.com/nextstrain/ncov/blob/master/defaults/clades.tsv).
