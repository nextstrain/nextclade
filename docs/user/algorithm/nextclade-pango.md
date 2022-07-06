# Nextclade as pango lineage classifier: Methods and Validation

[Nextclade](https://joss.theoj.org/papers/10.21105/joss.03773) can be used to assign pango lineages to SARS-CoV-2 sequences.
New sequences receive the label of the parsimonious node in Nextclade's reference tree.
Since Nextclade's reference is focused on recent sequences, classification accuracy is best for recent sequences.
Nextclade's classification accuracy on designated sequences from the past 12 months (97.8%) is comparable to pangoLEARN's (98.0%).
UShER is the most accurate method with 99.7%.
Being part of the Nextclade pipeline, Nextclade's pango calls are convenient, but should not be used when accuracy is paramount.

## Introduction

[Pango lineages](https://www.nature.com/articles/s41564-020-0770-5) have become the standard nomenclature system to classify SARS-CoV-2 genetic diversity.
Currently, [pangolin](https://github.com/cov-lineages/pangolin) is the most widely used classification tool for automatic assignment of lineages.
It can be run with two different algorithms: [pangoLEARN](https://academic.oup.com/ve/article/7/2/veab064/6315289) and [UShER](https://www.nature.com/articles/s41588-021-00862-7).
Both methods use the same set of labeled sequences as training data.
Of the now nearly 9 million SARS-CoV-2 sequences available through GISAID, around 1.2 million are explicitly labeled with one of more than 1,500 lineage names (see [pango-designation](https://github.com/cov-lineages/pango-designation)).
pangoLEARN currently employs a decision tree-based approach, where the labeled sequences (or a subset thereof) form the training set.
UShER classifies new sequences by placing them on a phylogenetic tree in the most parsimonious way.
The tree used for pango classification is a pruned version (currently 50 sequences per lineage) of the huge UShER tree that contains almost all SARS-CoV-2 sequences available through [GISAID](https://www.gisaid.org/).
Lineage boundaries need to be manually annotated in the tree.

When compared with each other, UShER has been found to be more [stable across releases](https://virological.org/t/sars-cov-2-lineage-assignment-is-more-stable-with-usher/781).

This report outlines how Nextclade can be used to predict pango lineages, how it's accuracy compares with pangoLEARN and UShER mode, and what the limitations are.

## Methods

### Overview

At the core of Nextclade is a reference tree representing the global phylogeny.
Each query sequence is parsimoniously placed on the reference tree.
The pango lineage assigned to the query sequence is the pango lineage of the attachment point (internal node or tip).

### Reference tree

Since only lineages present in the reference tree can be assigned, it is important that as many lineages as possible are present in the reference tree.
To keep Nextclade fast, around 3,000 sequences are chosen using an algorithm that gives more weight to widespread and recent lineages.
As a result, many small lineages, particularly from the first year of the pandemic are not in the reference tree and hence will never be assigned by Nextclade.

Care is taken to ensure lineages common on continents with less sequencing are also included.
For lineages defined in the past year, at least 1 sequence is included.
The reference tree is constructed using an [Augur](https://github.com/nextstrain/augur) [pipeline](https://github.com/neherlab/nextclade_data_workflows/tree/master/sars-cov-2) with [IQtree2](https://academic.oup.com/mbe/article/37/5/1530/5721363) as the phylogenetic tree builder.

### Assignment of pango lineages to internal nodes

Nextclade also takes internal nodes, that is ancestral, reconstructed sequences, into account for nearest neighbor placement.
As a result, all internal nodes in the reference tree need to be assigned a pango lineage.
This is done using [treetime](https://academic.oup.com/ve/article/4/1/vex042/4794731)'s ancestral reconstruction algorithm.

Each tip is given a pseudo-sequence that is derived from that tip's pango lineage.
Each position in the pseudo-sequence corresponds to one level of a pango lineage hierarchy, for example, position 1 means `B`, position 2 `B.1`, position 3 `B.2`, position 4 `B.1.1` etc.
The pango lineage `B.1.1` is thus encoded as binary `1011` or translated into nucleotides with `A=0, C=1` as `CACCAAAA...`.

The reference tree together with the pseudo-sequences is then fed to `treetime ancestral` in maximum-likelihood mode to reconstruct pseudo-sequences at all internal (ancestral) nodes.
The pseudo-sequences are then converted back to pango lineages using the same encoding as above.

The resulting assignment of pango lineages to internal nodes is found to be robust to sporadic misdesignations and tree building errors.
Alternative methods, such as using Fitch parsimony, were tried but found to be less robust.

## Validation against designations and comparison with pangoLEARN and UShER

We validated Nextclade's pango lineage predictions against pangoLEARN and UShER in three ways: using designations as a test dataset, using simple majority vote as a test dataset, and doing pairwise comparisons of the three methods.

The analysis was performed on sequences downloaded from GISAID mid-February 2022. Designated sequences were those designated in pango-designation v1.2.123.

Software versions used were as follows:
Nextclade CLI: 1.10.2, Nextclade dataset: 2022-02-07 (with pango mode enabled, using pango-designation v1.2.123), pangolin 3.1.20, pangoLEARN 2022-02-02 (using pango-designation v1.2.124).

### Comparison against designations

Each method was used to predict pango lineages for each of the sequences for which a designation is available (~1.2m).
Pangolin's `--skip-designation-hash` flag was used to provide meaningful predictions that don't rely on knowing the answer ahead of time.

For each sequence, prediction and truth are compared and classified as on of the following:

- Correct
- Parent, one level too generic (e.g. Nextclade says `B.1` but truth is `B.1.3`)
- Child, that is one level too specific (e.g. Nextclade says `B.1.3` but truth is `B.1`)
- None, an output by pangolin if sequences are shorter than 25,000 bp or contain more than 30% ambiguous bases
- Other (e.g. multiple levels too generic, or cousin relationships like Nextclade says `B.2` but truth is `B.1`).

Since the share of sequences per lineage that is contained in the designation dataset is not representative of the frequency the lineage appears in GISAID, (e.g. of the 13 `AQ.1` in all of GISAID's sequences, 9 are designated, whereas of about 500k `BA.1.1` only ~400 are designated) we weight results based on how common a lineage is in all of GISAID's sequences, instead of how often a lineage is in the designation dataset.

The results are shown in the table below:

| Type of error against designations | Nextclade (last 12m) | Nextclade (all times) | Usher (last 12m) | Usher (all times) | pangoLEARN (last 12m) | pangoLEARN (all times) |
| ---------------------------------- | -------------------- | --------------------- | ---------------- | ----------------- | --------------------- | ---------------------- |
| Correct                            | 97.8%                | 95.6%                 | 99.7%            | 99.7%             | 98.0%                 | 97.6%                  |
| 1 level too general                | 1.7%                 | 3.8%                  | 0.03%            | 0.05%             | 1.0%                  | 1.2%                   |
| 1 level too specific               | 0.3%                 | 0.3%                  | 0.08%            | 0.08%             | 0.7%                  | 0.8%                   |
| 'None' predicted                   | 0.0%                 | 0.0%                  | 0.1%             | 0.1%              | 0.1%                  | 0.1%                   |
| Other type of misclassification    | 0.2%                 | 0.2%                  | 0.04%            | 0.04%             | 0.2%                  | 0.2%                   |

Nextclade is about as good as pangoLEARN in the past 12 months.
It does not do well on sequences from the first year of the pandemic, because the reference tree misses a lot of small lineages from that time.
For more recent lineages, Nextclade is more accurate, because the tree contains at least one sample for each lineage that has appeared in the last 12 months.
When Nextclade errs, it tends to be too general.

On this dataset, pangoLEARN has a tendency to be over-specific, i.e. to call lineages too deep in the tree.
This behaviour has been noticed, anecdotally, in the past.

UShER errs only very rarely, about a factor of 10 less frequently than the other two methods.
This may be partially a result of overfitting, due to the fact that UShER's tree is used to designate lineages.

### Pairwise comparison

We did a pairwise comparison of pango assignments for a subsample of all of GISAID's sequences.
The results are shown in the table below.

| Agreement | Nextclade-pangoLEARN | Nextclade-UShER | pangoLEARN-UShER |
| --------- | -------------------- | --------------- | ---------------- |
| All times | 93.2%                | 90.5%           | 94.2%            |
| Last 12m  | 95.5%                | 92.3%           | 94.3%            |

In the last 12 months, the closest agreement is between Nextclade and pangoLEARN, while UShER and Nextclade differ most.
It would be interesting to study the differences between the three methods in more detail.
This comparison shows that used on recent sequences, Nextclade is certainly not much worse than the worst of the two existing methods.

### Comparison against consensus

One disadvantage of comparison against designations is that sequences included in the designation dataset are not representative of sequences belonging to that lineage, but tend to be biased towards early, basal sequences.
Hence we compared accuracy against a simple majority vote consensus of the three methods: pangoLEARN, UShER and Nextclade.
Pango lineages are predicted using each of the three methods (with designation hash switched off for a fair comparison).
The test dataset consists of a subsample of GISAID sequences for which at least two out of three Consensus is defined as at least two out of three methods agreeing on a lineage.
A majority consensus can be found for 98.7% of the sequences. This includes 0.9% of sequences where one or both of UShER and pangoLEARN call `None`.
Only in 0.4% of all sequences the three methods truly disagree and none is `None`.

Results are shown in the table below:

| Type of error against consensus | Nextclade (last 12m) | Nextclade (all times) | Usher (last 12m) | Usher (all times) | pangoLEARN (last 12m) | pangoLEARN (all times) |
| ------------------------------- | -------------------- | --------------------- | ---------------- | ----------------- | --------------------- | ---------------------- |
| Correct                         | 97.7%                | 95.8%                 | 95.7%            | 96.0%             | 99.0%                 | 98.7%                  |
| 1 level too general             | 1.6%                 | 3.5%                  | 1.2%             | 1.1%              | 0.2%                  | 0.4%                   |
| 1 level too specific            | 0.5%                 | 0.5%                  | 2.2%             | 2.1%              | 0.7%                  | 0.8%                   |
| 'None' predicted                | 0%                   | 0%                    | 0.1%             | 0.1%              | 0.07%                 | 0.02%                  |
| Other type of misclassification | 0.2%                 | 0.2%                  | 0.8%             | 0.7%              | 0.02%                 | 0.1%                   |

Interestingly, Usher does less well than pangoLEARN in this consensus benchmark.
It is important to note that the consensus isn't necessarily correct.
pangoLEARN might just often err in the same way as Nextclade, when it disagrees with UShER.

One quarter alone of the cases where Usher differs from the Nextclade/pangoLEARN consensus is where Usher calls `BA.1` but the Nextclade/pangoLEARN consensus calls `BA.1.1`.
Who is correct would have to be manually investigated.

All three methods agreed in 89% of a random sample of all sequences deposited in GISAID.
Restricted to a random sample of sequences with dates from February 2021 onwards, that number rises to 91%.

### Limitations of comparison

Recently, sequences for designation have often been picked using the UShER tree, a pruned version of which is the basis of the UShER classifier.
As a consequence, it is not surprising that UShER does well on the designation dataset.
For a good evaluation, one would need an independent test set of labeled sequences that were derived independently from both UShER and Nextclade.

## Discussion

### Limitations of the Nextclade pango classifier

There are a number of limitations that users of Nextclade's pango classifier should be aware of.

In order to keep Nextclade fast, some old and rare lineages are not included at all in the reference tree and thus cannot ever be assigned.
As a rule of thumb, pango calls for sequences older than 12 months should be treated with care.

Due to accuracy limitations, Nextclade's pango classifier should not be used as a replacement of UShER or pangoLEARN, but rather as a convenient and transparent add on for current users of Nextclade.

Importantly, for statistical, large scale analyses, such as [covSpectrum](https://cov-spectrum.org/), we do not recommend the use of Nextclade's pango calls.
One should use pango classifications provided by pangoLEARN or, if possible, UShER.

In contrast with UShER and pangoLEARN, Nextclade does not provide an uncertainty estimate for the classifications.
Nextclade's placement algorithm breaks ties arbitrarily without informing the user, while UShER outputs the lineages of all possible most parsimonious placements.

At the time of writing, Nextclade does not include recombinant lineages since these break the assumptions underlying the phylogenetic tree builder. In the near future, recombinants will be added.

### Advantages of the Nextclade pango classifier

Due to the small size of the Nextclade reference tree, it is easy to explain why a certain lineage was assigned.

Nextclade's reference tree can also serve as a tool to spot sequence misdesignated sequences and errors in the lineage hierarchy.
In fact, while working on the Nextclade pango classifier, we noticed that pango lineage `AY.96` was in fact a sub-lineage of `AY.4` which led to the withdrawal of the former.

Nextclade's lineage assignment is robust to ambiguous and incomplete sequences. In contrast to pangolin, Nextclade does not call `None` when the sequences are shorter than 25k bp or contain more than 30% ambiguous bases.
