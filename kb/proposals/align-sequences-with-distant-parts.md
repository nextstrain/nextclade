# Proposal: Align sequences whose parts match distant regions of the reference

## Problem

Nextclade aligns a query to the reference with one linear pairwise alignment. Before the alignment, seed matching finds exact or near-exact matches (seeds) and `fn chain_seeds()` ([packages/nextclade/src/align/seed_match.rs#L326](../../packages/nextclade/src/align/seed_match.rs#L326)) selects the chain of seeds with the largest total length. A gap between two chained seeds costs nothing, so a chain can link seeds that lie far apart on the reference. The alignment band follows the chain ([packages/nextclade/src/align/seed_alignment.rs#L86](../../packages/nextclade/src/align/seed_alignment.rs#L86)), and a linear alignment can represent the distance between two far parts only as one long deletion.

A long deletion between two far parts is a claim about the genome: the bases between the parts are absent. For most inputs with such a chain, nothing supports that claim. The region between the parts was never sequenced, or the second part is a technical artifact. Nextclade then reports a deletion, a coverage and a QC status that the data does not support. The opposite error also occurs: a chain that links a single spurious seed far away looks like such a case, although the alignment is correct.

Nextclade 3.26.0 added a check that rejects the whole sequence when its chain contains a long gap with enough seeds on both sides ([#1801](https://github.com/nextstrain/nextclade/pull/1801)). The check is on by default (`--max-seed-chain-deletion-ratio` 10, `--min-seed-chain-part-cover` 0.2), and the `short-sequences` preset turns it off ([packages/nextclade/src/align/align.rs#L76-L98](../../packages/nextclade/src/align/align.rs#L76-L98), [packages/nextclade/src/align/seed_match.rs#L519](../../packages/nextclade/src/align/seed_match.rs#L519)). In the data below, most of its rejections were correct alignments, and the rest lost sound parts together with the unsound result. With the check off, every sequence with distant parts gets the long-deletion result, as before 3.26.0. This proposal describes the options for a correct treatment.

## Requirements

- Partial and technically flawed sequences are valid input. Every part of a sequence that the data supports gets a sound result, and the rest is reported as unanalyzed with the reason
- A reference region that the query does not cover is missing, not deleted. Missing regions do not count as deletions, as coverage, or as evidence for placement, clade assignment and QC
- A sequence is rejected only when no part of it supports a sound analysis
- A result that looks plausible but rests on an unsound mapping is worse than an unanalyzed range, because users trust output that passes QC
- Memory stays bounded: a chain across a whole genome must not build a band across the whole genome (an mpox example needed 2.76 GB for a 2,480 nt query)
- A change of shipped output (alignment, deletions, coverage, QC, schemas) needs the maintainers' approval and a compatibility path

## Evidence

### Sources

- Example sequences of the datasets in `nextstrain/nextclade_data`, and 323 mpox sequences of a user report, used in the evaluation of #1801
- Public Pathoplexus data, latest version of each sequence, downloaded on 2026-11-11 from `https://lapis.pathoplexus.org/<organism>/sample/unalignedNucleotideSequences`. Nextclade 3.24.0 (before the check) and 3.29.0 (check on by default) were run with `--retry-reverse-complement=true` and the dataset tags that Pathoplexus uses. The upgrade of Pathoplexus from 3.24 to 3.28 reported new alignment errors in [pathoplexus/pathoplexus#1217](https://github.com/pathoplexus/pathoplexus/issues/1217)

| Organism  | Dataset and tag                                               | Sequences | Rejected by the check |
| --------- | ------------------------------------------------------------- | --------- | --------------------- |
| hMPV      | `nextstrain/hmpv/all-clades/NC_039199` 2025-04-25--12-24-24Z  | 15,903    | 107                   |
| West Nile | `nextstrain/wnv/all-lineages` 2026-03-04--12-40-26Z           | 9,281     | 3                     |
| Zika      | `community/itps/zikav` 2026-04-14--11-55-23Z                  | 3,089     | 3                     |
| ANDV L    | `nextstrain/orthohantavirus/andv/l` 2026-05-29--13-46-38Z     | 152       | 1                     |
| ANDV M, S | `nextstrain/orthohantavirus/andv/{m,s}` 2026-05-29--13-46-38Z | 501, 337  | 0                     |
| mpox      | `nextstrain/mpox/all-clades` 2026-07-07--14-07-11Z            | 15,311    | 1                     |

With `--max-seed-chain-deletion-ratio=1e12`, Nextclade 3.29.0 reports no new error on this data, so every new error came from the check. The `alignmentPreset` fix of [#1810](https://github.com/nextstrain/nextclade/pull/1810) caused no error by itself, but it applies the `high-diversity` preset of the Zika dataset, and the check rejects the three Zika sequences only with that preset.

### Classes of distant chains

The rejected sequences fall into four classes. They need different treatment, so a correct design must tell them apart.

#### Spurious far seed (99 of 115)

Short and divergent amplicons: 96 hMPV sequences of 113-609 nt (mostly G gene), 3 Zika sequences of 118-174 nt. Nextclade 3.24.0 aligned each of them locally, with at most 30 deleted nt and QC "good". Their chains contain one or a few seeds of about 20 nt far from the amplicon. A short divergent query has few seeds in total, so one 20 nt seed holds 20 % or more of the total seed length and passes the part-cover condition. The alignment ignores the far seed, because terminal gaps are free.

The hMPV dataset sets loose seed parameters (`kmerLength` 5, `minMatchLength` 20, `allowedMismatches` 10), which makes spurious seeds likely. The `short-sequences` preset has similar parameters and turned the check off for this reason, but datasets that set the parameters one by one did not get that exemption.

Examples:

- `PP_002FFR4.2` (hMPV, 206 nt): chain parts at reference 6317-6356 and 11443-12018. Nextclade 3.24.0: alignment 6295-6500, 0 deletions, 86 substitutions, QC "good"
- `PP_007HTNN.1` (Zika, 174 nt): chain parts at 1665-1784 and 7135-7164. Nextclade 3.24.0: alignment 1665-1838, 0 substitutions, QC "good"

A stricter part-cover value does not separate this class from the next one. With `--min-seed-chain-part-cover=0.4`, 25 hMPV sequences of this class are still rejected, and the 11 hMPV sequences of the next class are no longer rejected and fall back to their unsound result.

#### Joined amplicons with an unknown-length gap (15 of 115)

11 hMPV, 3 West Nile and 1 ANDV L sequences of 377-554 nt. Each consists of two amplicons from distant genes, joined by exactly 100 `N`. This is the INSDC notation for a gap of unknown length, so the records are valid. Both amplicons align cleanly on their own: their seeds match at the true positions with few mismatches. Nextclade 3.24.0 gave unsound results for all of them:

- `PP_000KAQ4.3` (West Nile, 497 nt, `N` at 212-311): one deletion of 7,294 nt (1813-9106) and coverage 0.697 for a sequence of 497 nt. Coverage counts the deleted range as covered ([packages/nextclade/src/run/nextclade_run_one.rs#L168-L170](../../packages/nextclade/src/run/nextclade_run_one.rs#L168-L170))
- `PP_0029GNM.1` (hMPV, 377 nt, `N` at 164-263): the second amplicon, which belongs at 11347-11459, was aligned next to the first at about 890-1012, with 66 substitutions and a frameshift. QC "good"
- `PP_006VQ9V.1` (ANDV L, 431 nt, `N` at 182-281): aligned as one block 3-495, QC "bad", while its second amplicon matches at 6417-6562

#### Fold-back read (1, from the #1801 evaluation)

A 2,480 nt mpox fragment. The first 1,638 nt match reference 2470-4107 with 10 substitutions. The last 844 nt are the reverse complement of a region inside the first part. The mpox genome has inverted terminal repeats, so the same text also matches the other end of the genome, and the chain links both ends. Nextclade 3.24.0 reported a deletion of 189,367 nt, coverage 0.97, clade Ib and QC "good", and counted the 7 substitutions of the duplicated region twice. The first 1,638 nt alone give a sound result: 10 substitutions, no deletion, clade Ib.

#### Possible real long deletion (1)

`PP_000TANS.2` (mpox, `OK573178.1`, 387 nt, no `N`): chain parts at 180892-181113 and 192025-192151. Nextclade 3.24.0 reported deletions of 10,873 nt in total between the parts, 2 substitutions, clade IIa and QC "good".

> [!IMPORTANT]
> **Investigation required.** A short sequence across the junction of a real long deletion (for example a junction-specific PCR product) has exactly this shape, and so does an assembly artifact. Compare the sequence with the reads of `SRR10027401` and with published large deletions in the right end of mpox genomes before using it as a test case for either class.

### Frequency

In about 44,600 Pathoplexus sequences of five organisms, 15 sequences (0.03 %) carry distant parts that a linear alignment cannot represent, and the check also rejects 99 correct alignments. In the dataset examples, 1 of 4,751 sequences was affected. The problem is rare but real, it occurs in public INSDC records, and the previous output for it was wrong without any warning.

## Short-term step

Until a correct treatment exists, the check is turned off by default: it runs only when `--max-seed-chain-deletion-ratio` or `maxSeedChainDeletionRatio` in `alignmentParams` of `pathogen.json` is set. This stops the false rejections, and sequences with distant parts get their pre-3.26.0 result back, which is unsound for the joined-amplicon and fold-back classes. Work item: [`tickets/align-seed-chain-check-off-by-default.md`](../tickets/align-seed-chain-check-off-by-default.md).

## Design axes

The axes are independent unless a coupling is stated.

### A. Treatment of a chain with a distant gap

- A1. **Reject the whole sequence** (current default, since 3.26.0)
  - (+) No unsound result reaches the output
  - (-) Loses every sound part: both amplicons of a joined record, the 1,638 sound nt of the fold-back read
  - (-) Breaks pipelines that aligned these sequences before, as in pathoplexus/pathoplexus#1217
- A2. **Align as one linear alignment with a long deletion** (behavior of 3.25.0 and before, and of the current release with the check off)
  - (+) No sequence is lost, and the output is the same as in old releases
  - (-) Fake deletions, inflated coverage and QC "good" for unsequenced regions, as in `PP_000KAQ4.3`; or a forced placement with false substitutions, as in `PP_0029GNM.1`
  - (-) A band across the whole distance: 2.76 GB for the mpox fold-back read
- A3. **Drop weak far seeds before the band is built** (a gap cost or an outlier filter in `fn chain_seeds()`)
  - (+) Aligns the spurious-seed class as in 3.24.0, and the band never spans the distance
  - (=) Changes only chains whose far part has weak support
  - (-) By itself, it gives no correct result for joined amplicons: the second amplicon is forced next to the first, as in 3.24.0
- A4. **Best supported part only**: align the part of the chain with the most support, and report the rest of the query as unaligned with a warning
  - (+) Sound result for the aligned part; simple output (one alignment range)
  - (+) Correct for the fold-back read, whose second part repeats the first
  - (-) A joined record loses one of its two sound amplicons
- A5. **Split alignment**: align each well-supported part on its own, in reference order, and represent the reference between collinear parts as unsequenced. A part that is out of order, on the other strand, or a duplicate of another part (the fold-back read) is reported as an unaligned query range with a warning. Reject only when no part aligns
  - (+) Meets every requirement: both amplicons of a joined record get correct substitutions, and nothing between them counts as deleted or covered
  - (+) Long-read and assembly aligners treat chimeric and split reads the same way (primary and supplementary alignments, for example in minimap2)
  - (-) The largest change: the alignment, translation and mutation calling must accept one query with several aligned blocks, and the output needs the representation of axis C

A3 and A5 combine: A3 removes spurious seeds, and A5 handles the parts that remain well supported. A4 is a subset of A5 that can ship first.

**Recommendation**: A3 + A5. A3 alone fixes the most frequent class. A5 is the only option that keeps both amplicons of a joined record. If A5 is too large for one release, ship A3 + A4 first, because A4 already removes every unsound result and keeps the larger sound part.

### B. Detection: spurious far seed or real distant part

- B1. **Share of the total seed length** (current `--min-seed-chain-part-cover`)
  - (-) Fails for short divergent queries: the total seed length is small, so one spurious seed is a large share. No single value separates the classes in the evidence above
- B2. **Absolute support per part**: minimum seed length and seed density in the part's query range
  - (+) Cheap, and it removes single-seed parts
  - (-) Still a tuned threshold, which depends on the seed parameters of each dataset
- B3. **Score comparison**: align the query segment of the far part both at the far site and as a continuation of the main part. Accept the far site only when it scores better by a margin that depends on the segment length
  - (+) Decides by the alignment evidence, the way chimera detectors do. For the spurious-seed class, the local placement is good (3.24.0 shows it). For joined amplicons, the far placement is near-exact and the local placement has dozens of false substitutions
  - (+) Independent of the seed parameters
  - (-) Extra alignments, but only for the rare chains that have a distant gap
- B4. **Unknown-length gaps**: a seed gap whose query interval contains a run of `N` of at least a set length (100 by the INSDC convention) is unsequenced. The parts on its two sides never form a deletion
  - (+) Detects all 15 joined amplicons by the notation that the submitters chose, without thresholds on seeds
  - (=) Covers only records that mark the gap; it complements B3 and does not replace it
- B5. **Duplicate parts**: a part whose query segment repeats a region of another part, directly or as its reverse complement, possibly through a repeat of the reference, is a duplicate
  - (+) Detects the fold-back read and avoids counting its substitutions twice
  - (-) Needs a comparison of the parts with each other

Multi-select. **Recommendation**: B3 + B4 + B5, with B2 as a cheap pre-filter before B3.

### C. Output representation of a split sequence

- C1. **Fill the reference between collinear parts with `N`**: existing fields show the gap as `missing`, and coverage excludes it
  - (+) No schema change, and coverage becomes correct at once
  - (-) The QC rule for missing data counts these `N` and can mark a joined record "bad", while the same amplicon without its partner, with the same unsequenced region at a terminal end, stays "good". Terminal and internal unsequenced regions get different QC
  - (-) Alters the aligned FASTA: `N` that the query does not contain
- C2. **New fields for unsequenced ranges and unaligned query ranges**: for example `unsequencedRanges` (reference ranges between parts) and `unalignedQueryRanges` (query ranges with the reason: duplicate, out of order, other strand). The aligned FASTA shows the unsequenced range as `-` or `N` by a documented rule
  - (+) Keeps "missing data" (`N` in the query) apart from "not sequenced", so QC treats terminal and internal unsequenced regions the same
  - (+) Additive fields: existing readers keep working
  - (-) Schema, CSV/TSV columns, web table and docs change; QC and coverage code must use the new ranges
- C3. **Warning only**: keep the output of the main part, and add a warning that names the other parts
  - (+) Smallest change
  - (-) A reader of the CSV/TSV cannot find the unaligned ranges without parsing warning text

**Recommendation**: C2 with C3 as its human-readable part. C1 only if QC is changed to ignore unsequenced `N`, which brings it close to C2.

### D. Long deletions that are real

A linear alignment cannot tell a real long deletion from two joined pieces when the query is contiguous across the junction. Large deletions occur, for example in poxvirus genome ends.

- D1. **Never call a deletion longer than a multiple of the query length**: treat it as an unsequenced range between two parts
  - (+) Safe: no unsupported deletion reaches the output
  - (-) Hides a real deletion that a junction-spanning sequence shows
- D2. **Call the deletion when the query is contiguous across the junction** (no `N` and no unaligned query bases between the parts), both flanks align well, and no part is a duplicate. Report a warning that names the deletion, so users can check it
  - (+) Keeps the information of a junction-spanning sequence, such as `PP_000TANS.2` if it is real
  - (-) A chimeric read with a clean junction gets a deletion call

**Recommendation**: D2, because the contiguous query is direct evidence for the junction, and the warning makes the call visible. The memory requirement still holds: a deletion call must come from the split alignment (A5), not from a band across the whole gap.

### E. Configuration

- E1. **One mode parameter**, for example `--distant-parts` / `distantParts` with the values `split` (default after A5 ships), `reject`, and `deletion` (the output of 3.25.0 and before, for users who need it). The numeric limits become tuning parameters of the detection
  - (+) Names the behavior that the user chooses; turning the check on or off no longer means setting a ratio to a huge value
  - (-) The shipped `maxSeedChainDeletionRatio` and `minSeedChainPartCover` need a deprecation path: keep them accepted and map them to the new parameters
- E2. **Keep the two numeric parameters as the only control**
  - (-) The evidence shows that no setting of them is correct for all classes

**Recommendation**: E1. With split alignment as the default, the check can be on by default again, because it no longer discards data.

### F. Visibility for pipelines

- F1. **Machine-readable error and warning codes** in the CSV/TSV and JSON output, next to the message text
  - (+) Pipelines can tell an alignment failure from a rejection by a check and react, for example the Loculus preprocessing, which replaces every Nextclade error with "Nucleotide sequence failed to align"
  - (-) A new output field and a code list to maintain
- F2. **Changelog section for behavior changes** that turn previously accepted input into errors or change results of existing sequences
  - (+) Readers of a release see such changes first

**Recommendation**: F1 + F2.

### G. Validation

- G1. **Real-data regression run**: compare the release under test with the previous release on public sequences of several organisms (for example the Pathoplexus data above), and report every sequence whose error status, alignment range, deletions, coverage or QC status changes
  - (+) Would have found the 99 false rejections before the release
  - (-) Downloads public data and runs for minutes, so it belongs in a heavy target that runs on request
- G2. **Unit tests per class**: in-memory references and queries for each class (spurious far seed, joined parts with an `N` run, fold-back duplicate, contiguous junction), asserting the aligned blocks and the reported ranges

**Recommendation**: G1 before any release that changes alignment, and G2 for each class.

## Recommended combination

- A3 + A5 (or A3 + A4 first): drop spurious seeds, then align each supported part, so every sound part gets a result
- B2 + B3 + B4 + B5: tell spurious seeds, unknown-length gaps and duplicates apart by alignment evidence and by the INSDC notation, not by one share of the seed length
- C2 + C3: report unsequenced reference ranges and unaligned query ranges in their own fields, with a warning
- D2: call a long deletion only when the query is contiguous across the junction, with a warning
- E1: one mode parameter, default `split`, with a deprecation path for the two shipped parameters
- F1 + F2 and G1 + G2: make the outcome visible to pipelines, and check every change on real data before release

Together, these give a sound result for each class of the evidence: the spurious-seed class aligns as in 3.24.0, joined amplicons get two correct blocks, the fold-back read gets its sound part, and a junction-spanning sequence keeps its deletion with a warning. No band spans a whole genome.

## Issues

- [`issues/H-align-seed-chain-check-rejects-correct-alignments.md`](../issues/H-align-seed-chain-check-rejects-correct-alignments.md): axes A3 and B
- [`issues/H-align-distant-parts-reported-as-deletion.md`](../issues/H-align-distant-parts-reported-as-deletion.md): axes A, C, D and E
- [`issues/M-align-unknown-length-gap-not-recognized.md`](../issues/M-align-unknown-length-gap-not-recognized.md): axis B4
- [`issues/N-output-errors-without-codes.md`](../issues/N-output-errors-without-codes.md): axis F1
- [`issues/N-tests-no-real-data-regression-run.md`](../issues/N-tests-no-real-data-regression-run.md): axis G1
