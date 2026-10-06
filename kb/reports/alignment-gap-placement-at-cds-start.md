# Alignment: ambiguous deletions move into CDS starts

## Summary

- **Problem**: when a deletion upstream of a CDS has two or more placements with the same score, Nextclade can select a placement that removes bases of the start codon. For a reverse-strand CDS, the same happens to its last codon, at the low-coordinate end of the CDS range. The first codon translates to `X` or `-`, or Nextclade reports false aa deletions of the first codons (e.g. `OPG204:M1-` in mpox). Nextclade reports no frameshift, and QC status does not change. Amino-acid mutations at the start of the protein are wrong or missing, and exported peptides have no start codon. Nextclade versions after 3.24.0 report a lost start codon in the `warnings` output
- **Cause**: the codon-aware gap open penalty applies only where a gap starts. A deletion that starts before a CDS and ends inside of it pays only `penaltyGapOpen`. This has two effects:
  - **Ties**: such a deletion costs the same as an equally good placement outside of the CDS, and `gapAlignmentSide` selects the placement. The default `left` puts ambiguous gaps at the 3'-most position, that is, into the CDS
  - **Straddle**: such a deletion is cheaper than an in-frame deletion inside of the CDS by `penaltyGapOpenInFrame - penaltyGapOpen`, so the aligner can cut the start codon also when no tie exists, with both gap sides
- **Fix**: the alignment parameter `penaltyGapEnterCds` (CLI argument `--penalty-gap-enter-cds`) charges a deletion that extends from outside of all CDSs into a CDS. A value of 1 fixes the ties. A value above `penaltyGapOpenInFrame - penaltyGapOpen` also fixes the straddle. The default is 0 (previous behavior), and datasets opt in
- **Exposure**: all datasets that use `left` or do not set the option (49 of 109 in `nextclade_data`), and datasets with straddles with both gap sides. With the shipped settings, the example sequences of `mpox/all-clades` (8 of 13), `mpox/lineage-b.1` (2 of 9) and `dengue/all` (1 of 54) lose a start codon. Real genomes also lose the OPG204 start with `mpox/clade-iib`. With `right`, mpox Ivory_Coast_2012 loses the OPG112 start by a straddle

The exposure measurements use Nextclade 3.23.0 and `nextclade_data` branch `add-cva10` (commit `fefe1a7d`), which contains `master` and a CVA10 dataset in development. The measurements of `penaltyGapEnterCds` use `nextclade_data` `master` (commit `bce905b7`).

## Minimal reproduction

### CLI

The reference is a 240-nt part of the CVA10 genome, with a CDS at 121..240. The query is the reference without an 8-nt part of the UTR (reference 113-120).

```bash
cat > ref.fasta <<'EOF'
>ref
CTATTGGATTGGCCATCCGGTGTGTAACAGAGCTATTATATACCTATTTGTTGGATTCAT
TCCATTAACATTTAAATCCCTTAACACTTTATACTATATTTTGAACTTGAACACAAGAAA
ATGGGGGCTCAAGTGTCAACACAGAAGTCTGGCAGCCATGAGACTGGCAATGTAGCCACT
GGGGGATCTACAATAAATTTCACCAACATTAATTACTACAAGGACTCTTATGCAGCATCA
EOF

cat > qry.fasta <<'EOF'
>qry
CTATTGGATTGGCCATCCGGTGTGTAACAGAGCTATTATATACCTATTTGTTGGATTCAT
TCCATTAACATTTAAATCCCTTAACACTTTATACTATATTTTGAACTTGAACATGGGGGC
TCAAGTGTCAACACAGAAGTCTGGCAGCCATGAGACTGGCAATGTAGCCACTGGGGGATC
TACAATAAATTTCACCAACATTAATTACTACAAGGACTCTTATGCAGCATCA
EOF

printf '##gff-version 3\nref\t.\tCDS\t121\t240\t.\t+\t0\tName=CDS1\n' > ann.gff3

for penalty in 0 1; do
  for side in left right; do
    nextclade run --input-ref=ref.fasta --input-annotation=ann.gff3 \
      --gap-alignment-side="${side}" --penalty-gap-enter-cds="${penalty}" \
      --output-tsv="${side}.${penalty}.tsv" --output-fasta="${side}.${penalty}.fasta" \
      qry.fasta
  done
done
```

Result, reference columns 105-130:

```
ref                  ACTTGAACACAAGAAAATGGGGGCTC      CDS1 starts at 121 (ATG = 121-123)
left,  penalty 0     ACTTGAACA--------TGGGGGCTC      deletions=114-121  unknownAaRanges=CDS1:1
right, penalty 0     ACTTGAAC--------ATGGGGGCTC      deletions=113-120  unknownAaRanges=(empty)
left,  penalty 1     ACTTGAAC--------ATGGGGGCTC      deletions=113-120  unknownAaRanges=(empty)
right, penalty 1     ACTTGAAC--------ATGGGGGCTC      deletions=113-120  unknownAaRanges=(empty)
```

`alignmentScore` is 690 in all four runs: the penalty changes the cost of the placement that enters the CDS, not of the selected placement.

### Unit tests

Fixtures in `mod cds_boundary` of [packages/nextclade/src/align/align.rs](../../packages/nextclade/src/align/align.rs), each from a real case:

- `SHORT_TIE`: 8-nt UTR deletion before the CDS start (CVA10 VP4)
- `TANDEM_REPEAT`: `ATGAAG` repeat across the CDS start, with one unit less in the query (mpox OPG204)
- `N_RUN`: deletion next to a run of `N` before the CDS start (EV-D68 VP4, GenBank MF045417)
- `UNALIGNED_5_END`: tie between an unaligned 5' end and an internal deletion that ends inside the CDS (dengue C, GenBank KY586941)
- `INSERTION`: insertion in an `A` run next to the CDS start
- `REVERSE_STRAND_START`: reverse-strand CDS, gap next to its start codon at the high-coordinate end of the range
- `REVERSE_STRAND_END`: reverse-strand CDS, gap next to its last base at the low-coordinate end of the range
- `STRADDLE`: 6-nt deletion with 8 equal placements around a CDS start where codons 1 and 3 are both `ATG` (mpox OPG112, Ivory_Coast_2012)
- `CROSSING`: 15-nt deletion across the end of one CDS and the start of the next (SARS-CoV-2 ORF7b and ORF8, Switzerland/BE-ETHZ-630376/2021)

`fn aligns_ambiguous_gap_outside_of_cds` aligns the first seven fixtures with both gap sides and `penaltyGapEnterCds: 1`, and expects the gap outside of the CDS. Without the penalty, the `left` cases of `SHORT_TIE`, `TANDEM_REPEAT`, `N_RUN`, `UNALIGNED_5_END` and `REVERSE_STRAND_END` fail. `fn aligns_deletion_entering_cds` aligns `STRADDLE` and `CROSSING` with the default open penalties and several penalty values.

## Mechanism

### Why the placements have equal scores

In the minimal reproduction, the query has `...GAAC A TGG...`. The single `A` can align to reference `A120` (UTR) or `A121` (CDS base 1). Both deletions have the same length and start in the UTR. Thus, both have the cost `penalty_gap_open + 7 * penalty_gap_extend`, and the matches are the same. A change of the open and extension penalties has the same effect on both scores.

### Gap cost only at the gap start

- `fn get_gap_open_close_scores_codon_aware()` makes one open penalty for each reference position: `penalty_gap_open` outside CDSs, `penalty_gap_open_in_frame` at codon position 0, `penalty_gap_open_out_of_frame` at codon positions 1 and 2 ([packages/nextclade/src/align/gap_open.rs](../../packages/nextclade/src/align/gap_open.rs))
- In `fn score_matrix()` ([packages/nextclade/src/align/score_matrix.rs](../../packages/nextclade/src/align/score_matrix.rs)), a deletion pays the open penalty of its first deleted base and an extension penalty for each further base. An insertion pays the open penalty of the reference base after it
- The end of a gap has no cost
- **High-coordinate end of a CDS range** (the stop codon of a forward-strand CDS, the start codon of a reverse-strand CDS): a gap that starts inside the CDS pays the CDS penalty, so an ambiguous gap after the range stays outside of the CDS (fixture `REVERSE_STRAND_START`)
- **Low-coordinate end of a CDS range** (the start codon of a forward-strand CDS, the last codon of a reverse-strand CDS): a gap that starts outside of the CDS pays only `penalty_gap_open`, also when it ends inside of the CDS. In a tandem repeat across the CDS start, the codon-aware penalty makes this worse: the cheapest placement starts at the last base before the CDS (mpox OPG204)
- **Insertions**: an insertion inside of the CDS or immediately before it pays the CDS penalty, so an ambiguous insertion stays outside of the CDS with both gap sides (fixture `INSERTION`)

### Straddle: a deletion before the CDS is cheaper than an in-frame deletion inside of it

mpox OPG112 starts at 91247 with `ATG GAA ATG`. Sample Ivory_Coast_2012 lacks 6 nt, and the deletion has 8 placements with the same matches, from 91245-91250 to 91252-91257. With the default penalties (open 6, in-frame 7, out-of-frame 8), the two placements that start before the CDS cost 6, the in-frame deletions of codons 1-2 and of codons 2-3 cost 7, and the others cost 8. Thus, Nextclade selects 91245-91250 (`right`) or 91246-91251 (`left`), and OPG112 translates as `-XMDKR` with both gap sides.

### Meaning of `gapAlignmentSide`

- The value names the side to which the aligned bases move. Ambiguous gaps go to the opposite side: `left` places them at the 3'-most position, `right` at the 5'-most position. This applies to deletions and insertions
- The tie-break is `if score - left_align < tmp_score` in `fn score_matrix()`. With `Left`, a gap wins a tie against a match in the forward fill. The backtrace starts at the 3' end and goes into the gap at the first tied cell, which is the 3'-most placement
- Until Nextclade 3.24.0, the documentation said the opposite (`left` places gaps on the 5' side). Dataset maintainers who selected `left` to get the usual 5' normalization of indels got the 3' placement

## Fix: CDS entry penalty

- **Rule**: a deletion pays `penaltyGapEnterCds` when it extends from a reference position outside of all CDSs into a CDS position. "Outside" means outside of every CDS, so adjacent segments of one CDS, overlapping CDSs and the ribosomal slippage site of a two-segment CDS are not entries. The step from an intron into the next exon is an entry
- **Implementation**: `struct GapScoreMap` holds, for each reference position, the open penalty and the penalty to extend a deletion over the position. `fn get_gap_open_close_scores_codon_aware()` adds `penaltyGapEnterCds` to the extension penalty of the first coding base after a non-coding base. `fn score_matrix()` reads the extension penalty once per row of the dynamic programming matrix. The recursion and the backtrace do not change. With the penalty set to 0, the result is the same as before
- **Entry only**: a deletion that leaves a CDS at its high-coordinate end already pays the CDS open penalty where it starts. A penalty at that end too changes real deletions across a CDS end. Example: SARS-CoV-2 Switzerland/BE-ETHZ-630376/2021 has a 15-nt deletion 27887-27901 across the ORF7b stop codon (27885-27887) and the ORF8 start (27894). The only placement without substitutions starts at the last base of ORF7b. Moving it one base to the right avoids ORF7b, but adds the substitution A27887T, and the query codon at 27885-27887 is `TAT` in both placements. With a penalty at both CDS ends, Nextclade selects the placement with the extra substitution
- **Values**:
  - 1 or more: a deletion that enters a CDS loses ties against placements that do not enter it
  - Above `penaltyGapOpenInFrame - penaltyGapOpen`: a deletion that enters a CDS also costs more than an in-frame deletion inside of the CDS, which fixes the straddle. `penaltyGapOpenInFrame - penaltyGapOpen + 1` is 2 for the default open penalties and 5 for dengue/all and HIV-1 (open 8, in-frame 12)
  - Above `scoreMatch + penaltyMismatch` (4 with the defaults): the aligner can replace a deletion that enters a CDS by a deletion next to it plus one substitution. For datasets with `penaltyGapOpenInFrame - penaltyGapOpen` of 4 or more, the value that fixes the straddle is in this range. Such datasets already accept one substitution to keep a gap that starts in a UTR out of a CDS. The example sequences of `nextclade_data` show no such replacement
  - The dynamic programming can close a deletion before the CDS and open a new one at the CDS start. Thus, the penalty that a deletion actually pays at the entry is at most the in-frame open penalty minus the extension penalty

## Exposure across datasets

Method: for each of the 93 datasets in `nextclade_data` with example sequences and annotation, run the examples with both settings. For each sequence and CDS, compare the first amino acid.

### Configured setting

| `gapAlignmentSide`       | Datasets                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `right`                  | 60: influenza (51 Nextstrain, 3 community H5), SARS-CoV-2 (5), EV-D68                                |
| `left`                   | 18: mpox (4), Ebola (3), RSV (2), dengue/all, hMPV, WNV, CVA10, CVA16, EV-A71, HIV-1, Marburg, PRRSV |
| not set (default `left`) | 31: measles, mumps, rubella, orthohantavirus, yellow fever, VZV, and 20 other community datasets     |

### Lost start codons in example sequences

| Dataset                       | Setting | Examples with lost start | CDS    | Pattern                                                                                      |
| ----------------------------- | ------- | ------------------------ | ------ | -------------------------------------------------------------------------------------------- |
| `nextstrain/mpox/all-clades`  | `left`  | 8 of 13                  | OPG204 | tandem repeat `ATGAAG` across the CDS start                                                  |
| `nextstrain/mpox/lineage-b.1` | `left`  | 2 of 9                   | OPG204 | same                                                                                         |
| `nextstrain/dengue/all`       | `left`  | 1 of 54                  | C      | internal deletion 72-104 over the CDS start at 102; with `right`, the 5' end stays unaligned |

The example sets are small, so this table shows the lower limit of the exposure. `nextstrain/mpox/clade-iib` uses the same reference and setting as `mpox/all-clades`, but none of its examples has the short `ATGAAG` repeat. The affected `all-clades` examples ON674051, KJ642617 and PQ178860.1 also lose the OPG204 start with `clade-iib` (translation `-XMKMMVR`). Users select these mpox datasets with the shortcuts `MPXV`, `nextstrain/mpox` (`all-clades`), `hMPXV` (`clade-iib`) and `hMPXV_B1` (`lineage-b.1`). The CVA10 dataset on the `add-cva10` branch has no affected example, but 8 of 497 CVA10 genomes from GenBank lose the VP4 start with `left`.

### Real-data patterns

- **Short tie next to the CDS start** (CVA10, VP4 at 745): 8-nt 5'UTR deletion. The query `A` after the gap aligns to `A737` (UTR) or `A745` (ATG). This is the pattern of the minimal reproduction
- **Tandem repeat across the CDS start** (mpox, OPG204 at 174532): the reference has `...CCT ATG ATG AAG ATG AAG | ATG AAG ATG AAG ATG ATG...`. Genomes with fewer repeat units have a 6-nt deletion (one unit) or a 12-nt deletion (two units), and the deletion can go anywhere in the repeat. `left` starts the deletion at 174531, the last base before the CDS, because a gap that starts inside the CDS pays the higher codon-aware penalty. The results are 174531-174536 (translation `-XMKMMVRIY`) and 174531-174542 (translation `---XMMVRIY`). `right` gives 174519-174524 and 174519-174530, and both translate as `MKMKMMVRIY`, as in the reference. The affected examples are from clades Ia, Ib, IIa and IIb
- **Deletion next to missing data** (EV-D68, VP4 at 733): `N` matches all bases with the same score, so a deletion next to an `N` run can move across the run with no change in score. With `left`, 3 of 1195 GenBank genomes lose the VP4 start. The EV-D68 dataset uses `right`

### Other effects of `gapAlignmentSide`

The option also moves ambiguous indels in UTRs and inside CDSs. These moves do not change the score. Examples: the SARS-CoV-2 datasets have different indel coordinates in 70 of 165 examples, and different aa-level output in 115 of 165. Thus, a change of `gapAlignmentSide` changes the output of many datasets, also where no start codon is affected.

## Effect of `penaltyGapEnterCds` on the dataset examples

Method: the example sequences of the 94 datasets in `nextclade_data` (commit `bce905b7`) with example sequences and annotation, aligned with both gap sides (8002 sequence and gap side pairs), with and without the penalty. Each changed pair is compared for indel placement, `alignmentScore`, substitutions, frameshifts, QC status and CDS translations that do not start with `M`.

| Penalty                                                | Placement changed | Only score changed | Substitutions changed | First codon no longer lost | Frameshift or QC changed |
| ------------------------------------------------------ | ----------------- | ------------------ | --------------------- | -------------------------- | ------------------------ |
| 1                                                      | 15                | 14                 | 0                     | 12                         | 0                        |
| `penaltyGapOpenInFrame - penaltyGapOpen + 1`           | 19                | 10                 | 0                     | 10                         | 0                        |
| same value, charged also where a deletion leaves a CDS | 24                | 9                  | 5                     | 10                         | 0                        |

- **Fixed**: OPG204 in the mpox examples, dengue KY586941, the last codon of reverse-strand CDSs in mpox (OPG045, and one `clade-i` CDS), and the OPG112 straddle. With the larger value and `left`, OPG112 of Ivory_Coast_2012 becomes an in-frame deletion of codons 2-3 and keeps its start codon. With `right`, it becomes an in-frame deletion of codons 1-2 ([kb/issues/N-align-in-frame-deletion-tie-at-cds-start.md](../issues/N-align-in-frame-deletion-tie-at-cds-start.md))
- **Only score changed**: real deletions that enter a CDS in every placement, e.g. SARS-CoV-2 Switzerland/BE-ETHZ-630376/2021 in all SARS-CoV-2 datasets
- **Records with `N` runs**: two hMPV records with a 100-nt `N` spacer between partial gene sequences, and mpox records with `N` runs next to a deletion. The deletion moves off the CDS start, and the `N` run covers it instead. The protein starts with `X` (unknown) instead of `-` (deleted). With the larger value, the first-codon count of the hMPV records gets worse by 2, which explains the smaller number in the table
- **Penalty at both CDS ends**: the 5 changed substitution counts are the ORF7b example in the SARS-CoV-2 datasets with `left` (see "Entry only" above)

## Related issues

- [kb/issues/H-datasets-lost-start-codon-left-gap-side.md](../issues/H-datasets-lost-start-codon-left-gap-side.md)
- [kb/issues/N-align-cds-entry-penalty-off-by-default.md](../issues/N-align-cds-entry-penalty-off-by-default.md)
- [kb/issues/N-align-in-frame-deletion-tie-at-cds-start.md](../issues/N-align-in-frame-deletion-tie-at-cds-start.md)
