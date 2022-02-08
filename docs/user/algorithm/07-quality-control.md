# 7. Quality Control (QC)

[Whole-genome sequencing](https://en.wikipedia.org/wiki/Whole_genome_sequencing) of viruses is a complex biotechnological process. Results can vary significantly in their quality, in particular, from scarce or degraded input material. Some parts of the sequence might be missing and the bioinformatic analysis pipelines that turn raw data into a consensus genome sometimes produce artefacts. Such artefacts typically manifest in spurious differences of the sequence from the reference.

If such problematic sequences are included in a phylogenetic analysis, they can distort the resulting tree. For example, the [Nextstrain](https://nextstrain.org) analysis pipeline therefore excludes sequences deemed problematic. Many such problems can be fixed by tweaking the pipeline or removing contaminants. It is therefore useful to spot these problems as early as possible.

Nextclade scans each query sequence for issues which may indicate problems occurring during sequencing or assembly. It implements several Quality Control (QC) to flag sequences as potentially problematic. Individual rules produce various metrics, specific to each rule as well as numeric quality scores.

## Quality scores

For each query sequence each individual QC rule produces a quality score. These **individual QC scores** are empirically calibrated to fit the following thresholds:

| Score         | Meaning                  | Color designation     |
|---------------|--------------------------|-----------------------|
| 0             | the best quality         | bright green          |
| 0 to 29       | "good" quality           | green to yellow       |
| 30            | warning threshold        | yellow                |
| 30 to 99      | "mediocre" quality       | yellow to orange      |
| 100 and above | "bad" quality            | red to bright red     |

After all scores are calculated, the **final QC score** ``$` S `$`` is calculated as follows:

```math
S = \sum_i \frac{S_i^2}{100}
```

where ``$` S_i `$`` is the score for an individual QC rule ``$` i `$``.

With this quadratic aggregation, multiple mildly concerning scores don't result in a bad overall score, but a single bad score guarantees a bad overall score.

The final score has the same thresholds as the the individual scores.

## Individual QC Rules

For SARS-CoV-2, we currently implement the following QC rules (in parentheses are the one-letter designations used in [Nextclade Web](../nextclade-web)). For other viruses, such as influenza, the same QC rules are used. However, the parametrization is different. The exact parameters can be found in the `qc.json` input file. Datasets provided by Nextclade can be inspected in the Github repo [nextstrain/nextclade_data](https://github.com/nextstrain/nextclade_data).

As an example, here's a [`qc.json` for a recent H3N2 dataset](https://github.com/nextstrain/nextclade_data/blob/master/data/datasets/flu_h3n2_ha/references/CY163680/versions/2022-01-18T12:00:00Z/files/qc.json). Here's the [`qc.json` for a recent SARS-CoV-2 dataset](https://github.com/nextstrain/nextclade_data/blob/master/data/datasets/sars-cov-2/references/MN908947/versions/2022-02-07T12:00:00Z/files/qc.json).

### Missing data (N)

If your sequence misses more than 3000 sites (`N` characters), it will be flagged as `bad`. The first 300 missing sites are not penalized (`scoreBias`). After that the score goes linearly from 0-100 as the number `N`s goes from 300 to 3000 (`scoreBias + missingDataThreshold`).

#### Mixed sites (M)

Ambiguous nucleotides (such as `R`, `Y`, etc) are often indicative of contamination (or superinfection) and more than 10 such non-ACGTN characters will result in a QC flag `bad`.

#### Private mutations (P)

Sequences with more than 24 mutations relative to the closest sequence in the reference tree are flagged as `bad`. We will revise this threshold as diversity of the SARS-CoV-2 population increases.

#### Mutation clusters (C)

If your sequence has clusters with 6 or more private differences within a 100-nucleotide window, it will be flagged as `bad`.

#### Stop codons (S)

Replicating viruses can not have premature stop codons in essential genes and such premature stops are hence an indicator of problematic sequences.

However, some stop codons are known to be common even in functional viruses. Our stop codon rule excludes such known stop codons and assigns a QC score of 75 to each additional premature stop.

<!--- How does this work with 2 stop codons? Score of 150? But I thought 100 is max. -->

#### Frame shifts (F)

Frame shifting insertions or deletions typically result in a garbled translation or a premature stop. Nextalign currently doesn't translate frame shifted coding sequences and each frame shift is assigned a QC score 75. Note, however, that clade 21H has a frame shift towards the end of ORF3a that results in a premature stop.

## Interpretation

Nextclade's QC warnings don't necessarily mean your sequences are problematic, but these issues warrant closer examination. You may explore the rest of the analysis results for the flagged sequences to make the decision.

The numeric QC scores are useful for rough estimation of the quality of sequences. However, these values are empirical. They only hint on possible issues, the possible scale of these issues and call for further investigation. They do not have any other meaning or application.


<!-- TODO: this is a SARS-CoV-2-specific section -->

The [Nextstrain SARS-CoV-2 pipeline](https://github.com/nextstrain/ncov) uses similar (more lenient) QC criteria. For example, Nextstrain will exclude your sequence if it has fewer than 27000 valid bases (corresponding to roughly 3000 Ns) and <!--- should this be `but` instead of `and`? --> doesn't check for ambiguous characters. Sequences flagged for excess divergence and SNP clusters by Nextclade are likely excluded <!--- should this be `included` or `excluded`? --> by Nextstrain.

<!-- TODO: check factual correctness and spelling of the next sentence -->

Note that there are many additional potential problems Nextclade does not check for. These include for example: primer sequences, adaptaters <!--- adaptors? --> , or chimeras <!--- reocmbinations? --> between divergent SARS-CoV-2 strains.

## Configuration

QC checks can be enabled or disabled, and their parameters can be changed by providing a custom QC configuration file (typically `qc.json`) in the Advanced mode of [Nextclade Web](../nextclade-web) or in [Nextclade CLI](../nextclade-cli).

<!-- TODO: describe the QC parameters -->

## Results

QC results are presented in the "QC" column of the results table in [Nextclade Web](../nextclade-web). More information is included into mouseover tooltips.

QC results are also included in the analysis results JSON, CSV and TSV files generated by [Nextclade CLI](../nextclade-cli) and in the "Download" dialog of [Nextclade Web](../nextclade-web).

