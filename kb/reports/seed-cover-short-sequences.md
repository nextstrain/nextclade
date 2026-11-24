# Seed cover rejects short sequences

Nextclade does not align a query when its seeds cover less than `minSeedCover` of it. Two steps of the seed code lose a fixed number of nucleotides per sequence, whatever its length, so short sequences get a lower cover than long ones at the same divergence. The EV-A71 dataset raised `minSeedCover` to 0.79 to reject other enterovirus A types. With that value, 100 nt EV-A71 fragments fail more often than long CVA16 sequences. Measured with Nextclade 3.30.0 on 2026-11-24.

## Links

- Interactive page with a seed simulator and charts: [`seed-cover-short-sequences.html`](seed-cover-short-sequences.html), rendered through [htmlpreview](https://htmlpreview.github.io/?https://github.com/nextstrain/nextclade/blob/master/kb/reports/seed-cover-short-sequences.html)
- Known issue: [`kb/issues/M-align-seed-cover-penalizes-short-sequences.md`](../issues/M-align-seed-cover-penalizes-short-sequences.md)
- Related: [`kb/issues/M-qc-length-scaling-uneven-mutation-rates.md`](../issues/M-qc-length-scaling-uneven-mutation-rates.md)
- Dataset setting: `minSeedCover` 0.79 in `enpen/enterovirus/ev-a71` [[data](https://github.com/nextstrain/nextclade_data/blob/7845a6b83e122fff94c47321883d35c25879fb45/data/enpen/enterovirus/ev-a71/pathogen.json#L28)]

## Background

| Item              | Value                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| Dataset           | `enpen/enterovirus/ev-a71`, `minSeedCover` 0.79 (Nextclade default: 0.33)                              |
| Why 0.79          | to reject other enterovirus A types, such as CVA16 and CVA10. Raised until 3 to 5% of sequences failed |
| Observed          | closely related types still align, while short EV-A71 fragments are rejected                           |
| Example fragments | 100 nt cuts of GenBank `OQ026325`, `PP548272` and `GQ231939`, with 1% added random substitutions       |
| Divergence        | 0 to 1 subs per 100 nt from the nearest tree node, 6 to 13 subs per 100 nt from the reference sequence |

Seeds compare the query with the dataset reference sequence (the root, 7,408 nt), not with the tree. Only the divergence from the reference matters for this check.

## How the check works

| Step           | What it does                                                                                                                | Parameters (EV-A71)                     | Code                                                                                                                                                                                                                                                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Find seeds  | 6-mers every 25 positions, skipping the 3rd base of each codon, must match the reference exactly                            | `kmerLength` 6, `kmerDistance` 25       | [seed_match.rs#L241-L274](https://github.com/nextstrain/nextclade/blob/cbd10dcd913b930de1af452f434de4d58753f73f/packages/nextclade/src/align/seed_match.rs#L241-L274)                                                                                                                                                           |
| 2. Extend      | grow each seed until more than 15 of the last 30 bases differ, or the query ends                                            | `windowSize` 30, `allowedMismatches` 15 | [seed_match.rs#L116-L177](https://github.com/nextstrain/nextclade/blob/cbd10dcd913b930de1af452f434de4d58753f73f/packages/nextclade/src/align/seed_match.rs#L116-L177)                                                                                                                                                           |
| 3. Trim (flaw) | cut each end back to the longest run of matches in its last 30 bases, also where the query ends: up to 29 nt per end        | -                                       | [seed_match.rs#L140-L157](https://github.com/nextstrain/nextclade/blob/cbd10dcd913b930de1af452f434de4d58753f73f/packages/nextclade/src/align/seed_match.rs#L140-L157), [#L179-L196](https://github.com/nextstrain/nextclade/blob/cbd10dcd913b930de1af452f434de4d58753f73f/packages/nextclade/src/align/seed_match.rs#L179-L196) |
| 4. Cut (flaw)  | split into 30 nt pieces; the last overlaps the one before and does not count: a seed of L nt counts `floor(L / 30) * 30` nt | `minMatchLength` 30                     | [seed_match.rs#L201-L221](https://github.com/nextstrain/nextclade/blob/cbd10dcd913b930de1af452f434de4d58753f73f/packages/nextclade/src/align/seed_match.rs#L201-L221)                                                                                                                                                           |
| 5. Chain       | keep the best set of pieces that do not overlap                                                                             | -                                       | [seed_match.rs#L326-L456](https://github.com/nextstrain/nextclade/blob/cbd10dcd913b930de1af452f434de4d58753f73f/packages/nextclade/src/align/seed_match.rs#L326-L456)                                                                                                                                                           |
| 6. Check       | cover = counted nt / query length; reject below `minSeedCover`                                                              | `minSeedCover` 0.79                     | [seed_match.rs#L484-L497](https://github.com/nextstrain/nextclade/blob/cbd10dcd913b930de1af452f434de4d58753f73f/packages/nextclade/src/align/seed_match.rs#L484-L497)                                                                                                                                                           |

### Example: `OQ026325` fragment, 100 nt, 13 subs

| Stage   | Current code                | Proposed fix (option A) |
| ------- | --------------------------- | ----------------------- |
| Extend  | 0 to 100, both query ends   | 0 to 100                |
| Trim    | 0 nt left, 17 nt right      | none                    |
| Seed    | 83 nt                       | 100 nt                  |
| Pieces  | 30 + 30 + 30, last overlaps | 30 + 30 + 40            |
| Counted | 60 nt                       | 100 nt                  |
| Result  | 60% cover, rejected         | 100% cover, aligned     |

## Measurements

### Real fragments, pass rate at 0.79 and mean cover

30 random fragments per type and length, all run with the EV-A71 dataset.

| Length (nt) | EV-A71 pass | CVA16 pass | CVA10 pass | EV-A71 cover | CVA16 cover | CVA10 cover |
| ----------- | ----------- | ---------- | ---------- | ------------ | ----------- | ----------- |
| 100         | 40%         | 16%        | 23%        | 70%          | 53%         | 51%         |
| 150         | 96%         | 83%        | 56%        | 79%          | 74%         | 59%         |
| 200         | 80%         | 53%        | 53%        | 87%          | 78%         | 76%         |
| 300         | 100%        | 93%        | 50%        | 91%          | 86%         | 69%         |
| 500         | 100%        | 93%        | 46%        | 95%          | 91%         | 74%         |
| 1000        | 100%        | 86%        | 53%        | 97%          | 90%         | 80%         |
| 2000        | 100%        | 93%        | 36%        | 99%          | 92%         | 75%         |

- 100 nt EV-A71 passes less often than CVA16 of 300 nt or more
- 150 nt passes more often than 200 nt: 150 = 5 x 30 loses nothing in step 4, 200 always loses 20 nt

### Example fragments, cover by `minMatchLength`

| `minMatchLength` | `OQ026325` | `PP548272` | `GQ231939` |
| ---------------- | ---------- | ---------- | ---------- |
| 30 (dataset)     | 60%        | 60%        | 90%        |
| 20               | 80%        | 80%        | 80%        |
| 10               | 80%        | 80%        | 90%        |

A 100 nt query can only score 0, 30, 60 or 90% with 30 nt pieces.

### Test fragments of the reference, mean cover by divergence

20 fragments per point, exact count of uniform random substitutions. Simulator values: the JavaScript port of steps 1 to 6 in the interactive page, run on the same fragments.

| Subs | Length (nt) | Nextclade 3.30.0 | Simulator, current code | Simulator, option A |
| ---- | ----------- | ---------------- | ----------------------- | ------------------- |
| 0%   | 100         | 90%              | 90%                     | 100%                |
| 13%  | 100         | 74%              | 74%                     | 100%                |
| 13%  | 300         | 91%              | 91%                     | 100%                |
| 13%  | 2000        | 99%              | 99%                     | 100%                |
| 30%  | 100         | 50%              | 48%                     | 78%                 |
| 30%  | 300         | 82%              | 78%                     | 89%                 |
| 30%  | 2000        | 95%              | 95%                     | 97%                 |

- Divergence barely lowers the cover of long sequences: step 2 stops only above 50% local mismatches
- At 30% subs, option A still leaves some short fragments with no exact 6-mer match, and those fail

### Private substitutions per 100 nt

Private substitutions: substitutions that the nearest tree node does not have. Median (10th to 90th percentile) of aligned fragments. EV-A71: only sequences that are not in the reference tree.

| Length (nt) | EV-A71          | CVA16         | CVA10         |
| ----------- | --------------- | ------------- | ------------- |
| 100         | 1.0 (0 to 9)    | 15 (10 to 30) | 16 (5 to 44)  |
| 300         | 0.3 (0 to 4.7)  | 17 (12 to 27) | 28 (12 to 36) |
| 2000        | 2.5 (0.5 to 13) | 24 (16 to 30) | 29 (14 to 35) |

Outside the capsid, the types overlap: in the 5'UTR and P2/P3, 23 of 238 CVA fragments have fewer than 8 private subs per 100 nt; in the capsid (P1), 0 of 165. EV-A types share these regions by recombination.

### `nextclade sort`

- Never assigned a CVA fragment to EV-A71
- Detected none of the 3 example fragments, and 5% (100 nt), 45% (150 nt) and 80% (200 nt) of exact fragments of the EV-A71 reference: it needs at least 10 hits of 17-mers

## Options

### A. Fix the seed code (Nextclade change, not implemented)

- Change 1: the last piece takes the rest of the seed (30 + 30 + 40 nt), so the whole seed counts
- Change 2: trim only where extension stopped on mismatches; at the query end, drop only end mismatches
- (+) Cover no longer depends on length for moderate divergence: 100% at 13% subs for every length (simulator)
- (+) Cover can only rise, so no dataset rejects more sequences
- (=) Seeds also guide the alignment band, so alignments can change slightly. Needs a comparison with the current output on the test datasets
- (-) Short divergent fragments of other types also gain: 100 nt with 30% subs from 48% to 78% (simulator). Not measured with real CVA genomes

### B. Lower `minSeedCover` to 0.6 or less (dataset change, works now)

- (+) No release needed; the 60% example fragments pass
- (+) At 0.3, all EV-A71 fragments aligned at every length
- (-) At 0.3, 83 to 100% of CVA fragments aligned too, so the type filter must come from option C or D
- (-) The bias stays: a 100 nt query still scores only 30, 60 or 90%

### C. Filter types by private substitutions per 100 nt (dataset change, works now as QC flag)

- QC rule `privateMutations` with `lengthScaling` (since 3.30.0) scales its limits with sequence length
- (+) Separates the types at every length (table above)
- (=) Flags with bad QC status instead of rejecting
- (-) Needs new limits: with the EV-A71 limits (`typical` 60, `cutoff` 175 per 7,408 nt), the score reaches 100 at about 3 subs per 100 nt
- (-) Fails outside the capsid (recombination), and one limit per 100 nt fits fast and slow regions differently (see the related issue)

### D. Add other EV-A types to the reference tree (dataset change, not measured)

- (+) CVA16 and CVA10 fragments get their own clade label
- (-) More sequences to maintain, and the same limit outside the capsid as option C

### E. Route sequences with `nextclade sort` (does not work for short fragments)

- See the measurement above

### F. Scale the threshold by length (not recommended)

- The loss varies per sequence, from 0 to 29 nt per end and per seed, so no formula of the length matches it

## Recommendation

- In the EV datasets now: B and C
- In Nextclade: A, after comparing alignment output with the current code; then review every dataset with `minSeedCover` above the default 0.33

## Method

| Item               | Value                                                                                                                                                                                                                |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nextclade          | official image `nextstrain/nextclade:3.30.0`                                                                                                                                                                         |
| Dataset            | `enpen/enterovirus/ev-a71`: `kmerLength` 6, `kmerDistance` 25, `minMatchLength` 30, `allowedMismatches` 15, `windowSize` 30, `minSeedCover` 0.79                                                                     |
| Cover per fragment | from the error message of a run with `--min-seed-cover=0.999`, which reports the cover of every fragment                                                                                                             |
| Real fragments     | random cuts of the example sequences of the `enpen/enterovirus` datasets `ev-a71`, `cva16` and `cva10`                                                                                                               |
| Test fragments     | random cuts of the EV-A71 reference with an exact count of uniform random substitutions                                                                                                                              |
| Private subs       | `privateNucMutations.totalPrivateSubstitutions` from a run with `--min-seed-cover=0.3`                                                                                                                               |
| Genome regions     | by fragment start: 5'UTR before 740, capsid P1 740 to 3330, P2/P3 after. Approximate, because fragments can span regions                                                                                             |
| Simulator          | JavaScript port of steps 1 to 6 in the interactive page. Same cover as Nextclade for 831 of 840 test fragments and for the 3 example fragments. It looks only at the true position of each fragment on the reference |
