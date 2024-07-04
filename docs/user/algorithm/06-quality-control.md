# 6. Quality Control (QC)

[Whole-genome sequencing](https://en.wikipedia.org/wiki/Whole_genome_sequencing) of viruses is a complex biotechnological process. Results can vary significantly in their quality, in particular, from scarce or degraded input material. Some parts of the sequence might be missing and the bioinformatic analysis pipelines that turn raw data into a consensus genome sometimes produce artefacts. Such artefacts typically manifest in spurious differences of the sequence from the reference.

If such problematic sequences are included in a phylogenetic analysis, they can distort the resulting tree. For example, the [Nextstrain](https://nextstrain.org) analysis pipeline therefore excludes sequences deemed problematic. Many such problems can be fixed by tweaking the pipeline or removing contaminants. It is therefore useful to spot these problems as early as possible.

Nextclade scans each query sequence for issues which may indicate problems occurring during sequencing or assembly. It implements several Quality Control (QC) to flag sequences as potentially problematic. Individual rules produce various metrics, specific to each rule as well as numeric quality scores.

## Quality scores

For each query sequence each individual QC rule produces a quality score. These **individual QC scores** are empirically calibrated to fit the following thresholds:

| Score         | Meaning            | Color designation |
|---------------|--------------------|-------------------|
| 0 to 29       | "good" quality     | green             |
| 30 to 99      | "mediocre" quality | yellow            |
| 100 and above | "bad" quality      | red               |

After all scores are calculated, the **final QC score** $S$ is calculated as follows:

$$S = \sum_i \frac{S_i^2}{100}$$

where $S_i$ is the score for an individual QC rule $i$.

With this quadratic aggregation, multiple mildly concerning scores don't result in a bad overall score, but a single bad score guarantees a bad overall score.

The final score has the same thresholds as the individual scores.

## Individual QC Rules

For SARS-CoV-2, we currently implement the following QC rules (in parentheses are the one-letter designations used in [Nextclade Web](../nextclade-web/index.rst)). For other viruses, such as influenza, a subset of the QC rules are used and the parametrization is adjusted. The exact parameters can be found in the `pathogen.json` input file. Datasets provided by Nextclade can be inspected in the GitHub repo [nextstrain/nextclade_data](https://github.com/nextstrain/nextclade_data).
Parameter values stated below refer to SARS-CoV-2.

### Missing data (N)

If your sequence misses more than 3000 sites (`N` characters), it will be flagged as `bad`. The first 300 missing sites are not penalized (`scoreBias`). After that the score goes linearly from 0-100 as the number `N`s goes from 300 to 3000 (`scoreBias + missingDataThreshold`).

### Mixed sites (M)

Ambiguous nucleotides (such as `R`, `Y`, etc) are often indicative of contamination (or superinfection) and more than 10 (`mixedSitesThreshold`) such non-ACGTN characters will result in a QC flag `bad`.

### Private mutations (P)

[Private mutations](./05-mutation-calling.md#private-mutations) may indicate sequencing errors or unusual variants.

### Mutation clusters (C)

To be more sensitive for quality problems in a narrow area of a genome, the mutation cluster rule counts the number of private within all possible 100-nucleotide windows (`windowSize`).
If that number exceeds 6 (`clusterCutOff`), this counts as an SNP cluster.
The quality score is the number of clusters times 50 (`scoreWeight`), hence 1 cluster will cause the cluster rule to be mediocre.

### Stop codons (S)

Replicating viruses can not have premature stop codons in essential genes and such premature stops are hence an indicator of problematic sequences.

However, some stop codons are known to be common even in functional viruses. Our stop codon rule excludes such known stop codons `ignoredStopCodons` and assigns a QC score of 75 to each premature stop, hence if there are 2 unknown stop codons, the score is 150.

Beware that the position of known stop codons in `pathogen.json` is 0-indexed, in contrast to the 1-indexed positions that are used in Nextclade outputs.

### Frame shifts (F)

Frame shifting insertions or deletions typically result in a garbled translation or a premature stop. Nextalign currently doesn't translate frame shifted coding sequences and each frame shift is assigned a QC score 75. Note, however, that clade 21H (Mu) has a frame shift towards the end of ORF3a that results in a premature stop. Known frame shifts (those listed in `ignoredFrameShifts`) in `pathogen.json` are not penalized.

## Interpretation

Nextclade's QC warnings don't necessarily mean your sequences are problematic, but these issues warrant closer examination. You may explore the rest of the analysis results for the flagged sequences to make the decision.

The numeric QC scores are useful for rough estimation of the quality of sequences. However, these values are empirical. They only hint on possible issues, the possible scale of these issues and call for further investigation. They do not have any other meaning or application.

The [Nextstrain SARS-CoV-2 pipeline](https://github.com/nextstrain/ncov) uses similar (more lenient) QC criteria. For example, Nextstrain will exclude your sequence if it has fewer than 27000 valid bases (corresponding to roughly 3000 Ns) and doesn't check for ambiguous characters. Sequences flagged for excess divergence and SNP clusters by Nextclade are likely excluded by Nextstrain.

Note that there are many additional potential problems Nextclade does not check for. These include for example: primer sequences or adapters.

## Configuration

QC checks can be enabled or disabled, and their parameters can be changed by modifying `qc` field in the `pathogen.json` file in the Advanced mode of [Nextclade Web](../nextclade-web/index.rst) or in [Nextclade CLI](../nextclade-cli/index.rst).

## Results

QC results are presented in the "QC" column of the results table in [Nextclade Web](../nextclade-web/index.rst). More information is included into mouseover tooltips.

QC results are also included in the analysis results JSON, CSV and TSV files generated by [Nextclade CLI](../nextclade-cli/index.rst) and in the "Download" dialog of [Nextclade Web](../nextclade-web/index.rst).
