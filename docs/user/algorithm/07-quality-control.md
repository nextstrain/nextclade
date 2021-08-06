# 7. Quality Control (QC)

Whole-genome sequencing of viruses is not a push-button operation -- in particular from scarce or degraded input material. Some parts of the sequence might be missing and the bioinformatic analysis pipelines that turn raw data into a consensus genome sometimes produce artefacts. Such artefacts typically manifest in spurious differences of the sequence from the reference. If such problematic sequences are included in a phylogenetic analysis, they can distort the resulting tree. The Nextstrain analysis pipeline therefore excludes sequences deemed problematic.

Many such problems can be fixed by tweaking the pipeline or removing contaminants. It is therefore useful to spot these problems as early as possible. Nextclade will scans sequences for issues that indicate problems that may have occured during sequencing or bioinformatic assembly. We have implemented several metrics to flag sequences as potentially problematic. Individual metrics are calibrated such that 0 is best, and 100 corresponds to a bad sequence, with 30 being the warning threshold. <!--- Is 100 a fixed max or can QC metrics go above 100? -->

The final QC score is calculated as follows:

```math
s = \sum_i \frac{s_i^2}{100}
```

where ``$` s_i `$`` is the score for an individual QC rule ``$` i `$``.

With this quadratic aggregation, multiple mildly concerning scores don't result in a bad overall score, but a single bad score guarantees a bad overall score.

For SARS-CoV-2, we currently implement the following metrics:

- Missing data: If your sequence misses more than 3000 sites (`N`s), it will be flagged as `bad` <!--- what happens if it's 2900 Ns? What's the function, linear from 0 to 100 from 0 to 3000 and capped thereafter? -->

- Private mutations: Sequences with more than 24 mutations relative to the closest sequence in the reference tree are flagged as `bad`. We will revise this threshold as diversity of the SARS-CoV-2 population increases.<!--- Same Q as above, is it linearly increasing till threshold and constant afterwards? -->

- Ambiguous nucleotides: mixed states (such as `R`, `Y`, etc) are indicative of contamination (or superinfection) and more than 10 such non-ACGTN characters will result in a QC flag `bad`.

- Clustered differences: If your sequence has clusters with 6 or more private differences in 100 bases, it will be flagged as `bad`.

- Stop codons: replicating viruses can not have premature stop codons in essential genes and such premature stops are hence an indicator of problematic sequences. However, some stop codons are known to be common even in functional viruses. Our stop codon rule excludes such known stop codons and assigns a QC score of 75 to each additional premature stop. <!--- How does this work with 2 stop codons? Score of 150? But I thought 100 is max. -->

- Frame shift mutations: frame shifting insertions or deletions typically result in a garbled translation or a premature stop. Nextalign currently doesn't translate frame shifted coding sequences and each frame shift is assigned a QC score 75. Note, however, that clade 21H has a frame shift towards the end of ORF3a that results in a premature stop.

These warnings don't necessarily mean your sequences are problematic, but these issues warrant closer examination. The [Nextstrain SARS-CoV-2 pipeline](https://github.com/nextstrain/ncov) uses similar (more lenient) QC criteria. For example, Nextstrain will exclude your sequence if it has fewer than 27000 valid bases (corresponding to roughly 3000 Ns) and <!--- should this be `but` instead of `and`? --> doesn't check for ambiguous characters. Sequences flagged for excess divergence and SNP clusters by Nextclade are likely excluded <!--- should this be `included` or `excluded`? --> by Nextstrain.

<!-- TODO: check factual correctness and spelling of the next sentence -->

Note that there are many additional potential problems Nextclade does not check for. These include for example: primer sequences, adaptaters <!--- adaptors? --> , or chimeras <!--- reocmbinations? --> between divergent SARS-CoV-2 strains.
