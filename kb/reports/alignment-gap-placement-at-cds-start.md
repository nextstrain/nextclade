# Alignment: ambiguous gaps move into CDS starts

## Summary

- **Problem**: when a deletion upstream of a CDS has two or more placements with the same score, Nextclade can select a placement that removes bases of the start codon. For a reverse-strand CDS, the same happens to its last codon, at the 5' end of the CDS range. The first codon translates to `X` or `-`, or Nextclade reports false aa deletions of the first codons (e.g. `OPG204:M1-` in mpox). Nextclade reports no frameshift, and QC status does not change. Amino-acid mutations at the start of the protein are wrong or missing, and exported peptides have no start codon
- **Cause**: the codon-aware gap cost applies only at the gap start, and the end of a gap has no cost. The default tie-break (`gapAlignmentSide: "left"`) puts ambiguous gaps at the 3'-most position, which is opposite to its documentation
- **Exposure**: all datasets that use `left` or do not set the option (49 of 109 in `nextclade_data`). With the shipped settings, the example sequences of `mpox/all-clades` (8 of 13), `mpox/lineage-b.1` (2 of 9) and `dengue/all` (1 of 54) lose a start codon. Real genomes also lose the OPG204 start with `mpox/clade-iib`. No dataset that uses `right` loses a start codon
- **Decisions**: see [Decisions](#decisions). The dataset setting and the documentation can change without a change to the alignment algorithm. A correct fix needs a change to gap scoring

Tested with Nextclade 3.23.0 and `nextclade_data` branch `add-cva10` (commit `fefe1a7d`), which contains `master` and a CVA10 dataset in development.

## Minimal reproduction

### CLI

Needs only the Nextclade CLI and uses default parameters. The reference is a 240-nt part of the CVA10 genome, with a CDS at 121..240. The query is the reference without an 8-nt part of the UTR (reference 113-120).

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

for side in left right; do
  nextclade run --input-ref=ref.fasta --input-annotation=ann.gff3 \
    --gap-alignment-side="${side}" --output-tsv="${side}.tsv" --output-fasta="${side}.fasta" \
    qry.fasta
done
```

Result, reference columns 105-130:

```
ref            ACTTGAACACAAGAAAATGGGGGCTC      CDS1 starts at 121 (ATG = 121-123)
left   (3')    ACTTGAACA--------TGGGGGCTC      deletions=114-121  unknownAaRanges=CDS1:1
right  (5')    ACTTGAAC--------ATGGGGGCTC      deletions=113-120  unknownAaRanges=(empty)
```

`alignmentScore` is 690 for both settings.

### Unit test

`fn aligns_ambiguous_gap_outside_of_cds` [packages/nextclade/src/align/align.rs#L677-L898](../../packages/nextclade/src/align/align.rs#L677-L898) aligns each fixture of `mod cds_boundary` with the codon-aware gap cost of its GFF3 annotation, with both gap sides. Each fixture shows the reference, the alignment with the gap outside of the CDS, the CDS span, and the alignment that `Left` gives when it differs:

- `SHORT_TIE`: 8-nt UTR deletion before the CDS start (CVA10 VP4)
- `TANDEM_REPEAT`: `ATGAAG` repeat across the CDS start, with one unit less in the query (mpox OPG204)
- `N_RUN`: deletion next to a run of `N` before the CDS start (EV-D68 VP4, GenBank MF045417)
- `UNALIGNED_5_END`: tie between an unaligned 5' end and an internal deletion that ends inside the CDS (dengue C, GenBank KY586941)
- `INSERTION`: insertion in an `A` run next to the CDS start
- `REVERSE_STRAND_START`: reverse-strand CDS, gap next to its start codon at the 3' end of the reference range
- `REVERSE_STRAND_END`: reverse-strand CDS, gap next to its last base at the 5' end of the reference range

The test compares the aligned query from the first to the last CDS column with the fixture. The `Left` cases of `SHORT_TIE`, `TANDEM_REPEAT`, `N_RUN`, `UNALIGNED_5_END` and `REVERSE_STRAND_END` fail and have `#[ignore]` with a reference to [kb/issues/M-align-gap-end-cost-in-cds.md](../issues/M-align-gap-end-cost-in-cds.md). All other cases pass. Run the ignored cases:

```bash
./docker/dev cargo nextest run --lib -p nextclade --run-ignored only aligns_ambiguous_gap_outside_of_cds
```

Failure output for the `Left` cases (expected, then actual aligned query inside the CDS):

```
short tie:            <ATGGGGGCTCAAGTGTCAACACAG
                      >-TGGGGGCTCAAGTGTCAACACAG
tandem repeat:        <ATGAAGATGAAGATGATGGTCCGTATA
                      >-----GATGAAGATGATGGTCCGTATA
N run:                <ATGGGAGCTCAGGTTACTAGACAA
                      >-TGGGAGCTCAGGTTACTAGACAA
unaligned 5' end:     <ATGAACCAACGAAAAAAGGTGGTT
                      >---AACCAACGAAAAAAGGTGGTT
reverse strand end:   <ATGGGGGCTCAAGTGTCAACACAG
                      >-TGGGGGCTCAAGTGTCAACACAG
```

## Mechanism

### Why the placements have equal scores

In the example, the query has `...GAAC A TGG...`. The single `A` can align to reference `A120` (UTR) or `A121` (CDS base 1). Both deletions have the same length and start in the UTR. Thus, both have the cost `penalty_gap_open + 7 * penalty_gap_extend`, and the matches are the same. A change of penalties has the same effect on both scores. No parameter value removes the tie.

### Gap cost only at the gap start

- `fn get_gap_open_close_scores_codon_aware()` makes one cost for each reference position: `penalty_gap_open` outside CDSs, `penalty_gap_open_in_frame` at codon position 0, `penalty_gap_open_out_of_frame` at codon positions 1 and 2 ([packages/nextclade/src/align/gap_open.rs#L16-L44](../../packages/nextclade/src/align/gap_open.rs#L16-L44))
- A deletion pays the cost of its first deleted base, `gap_open_close[ri - 1]` ([packages/nextclade/src/align/score_matrix.rs#L173](../../packages/nextclade/src/align/score_matrix.rs#L173)). An insertion pays the cost of the reference base after it, `gap_open_close[ri]` ([packages/nextclade/src/align/score_matrix.rs#L142](../../packages/nextclade/src/align/score_matrix.rs#L142))
- The end of a gap has no cost. The array name `gap_open_close` suggests a cost at both ends
- Effect at the **3' end of a CDS range** in reference coordinates (the stop codon of a forward-strand CDS, the start codon of a reverse-strand CDS): a gap that starts inside the CDS pays the CDS cost, so an ambiguous gap after the range stays outside the CDS (fixture `REVERSE_STRAND_START`)
- Effect at the **5' end of a CDS range** (the start codon of a forward-strand CDS, the last codon of a reverse-strand CDS): a gap that starts outside the CDS pays only `penalty_gap_open`, also when it ends inside the CDS. In a tandem repeat across the CDS start, the codon-aware cost makes this worse: the cheapest placement is the one that starts at the last base before the CDS (see mpox below). Fixtures `SHORT_TIE`, `TANDEM_REPEAT`, `N_RUN`, `UNALIGNED_5_END`, `REVERSE_STRAND_END`
- **Insertions**: an insertion pays the cost of the reference base after it. An insertion inside the CDS or immediately before it pays the CDS cost, so an ambiguous insertion stays outside the CDS with both gap sides (fixture `INSERTION`)
- The user documentation says that Nextclade "preferentially places gaps outside of genes in case of ambiguities" ([docs/user/algorithm/01-sequence-alignment.md#L49](../../docs/user/algorithm/01-sequence-alignment.md#L49)). This is true for insertions and at the 3' end of CDS ranges, but not for deletions at the 5' end

### Inverted `gapAlignmentSide`

- The enum documentation says that `Left` puts ambiguous gaps on the 5' side ([packages/nextclade/src/align/params.rs#L15-L19](../../packages/nextclade/src/align/params.rs#L15-L19))
- The tie-break is `if score - left_align < tmp_score` ([packages/nextclade/src/align/score_matrix.rs#L159](../../packages/nextclade/src/align/score_matrix.rs#L159), [packages/nextclade/src/align/score_matrix.rs#L187](../../packages/nextclade/src/align/score_matrix.rs#L187)). With `Left`, a gap wins a tie against a match in the forward fill. The backtrace starts at the 3' end and goes into the gap at the first tied cell, which is the 3'-most placement
- The unit tests have the same behavior: `fn aligns_ambiguous_gap_placing_left` expects the 3' placement `ACAT---CTTC` ([packages/nextclade/src/align/align.rs#L517](../../packages/nextclade/src/align/align.rs#L517))
- Without annotation, for reference `...C AAAA G...`, `left` gives the 3'-most deletion and insertion and `right` gives the 5'-most. This applies to both deletions and insertions

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

With `right`, no example in any dataset loses a start codon.

The example sets are small, so this table shows the lower limit of the exposure. `nextstrain/mpox/clade-iib` uses the same reference and setting as `mpox/all-clades`, but none of its examples has the short `ATGAAG` repeat. The affected `all-clades` examples ON674051, KJ642617 and PQ178860.1 also lose the OPG204 start with `clade-iib` (translation `-XMKMMVR`). Users select these mpox datasets with the shortcuts `MPXV`, `nextstrain/mpox` (`all-clades`), `hMPXV` (`clade-iib`) and `hMPXV_B1` (`lineage-b.1`). The CVA10 dataset on the `add-cva10` branch has no affected example, but 8 of 497 CVA10 genomes from GenBank lose the VP4 start with `left`.

### Real-data patterns

- **Short tie next to the CDS start** (CVA10, VP4 at 745): 8-nt 5'UTR deletion. The query `A` after the gap aligns to `A737` (UTR) or `A745` (ATG). This is the pattern of the minimal reproduction
- **Tandem repeat across the CDS start** (mpox, OPG204 at 174532): the reference has `...CCT ATG ATG AAG ATG AAG | ATG AAG ATG AAG ATG ATG...`. Genomes with fewer repeat units have a 6-nt deletion (one unit) or a 12-nt deletion (two units), and the deletion can go anywhere in the repeat. `left` starts the deletion at 174531, the last base before the CDS, because a gap that starts inside the CDS pays the higher codon-aware cost. The results are 174531-174536 (translation `-XMKMMVRIY`) and 174531-174542 (translation `---XMMVRIY`). `right` gives 174519-174524 and 174519-174530, and both translate as `MKMKMMVRIY`, as in the reference. The affected examples are from clades Ia, Ib, IIa and IIb
- **Deletion next to missing data** (EV-D68, VP4 at 733): `N` matches all bases with the same score, so a deletion next to an `N` run can move across the run with no change in score. With `left`, 3 of 1195 GenBank genomes lose the VP4 start. The EV-D68 dataset uses `right`

### Other effects of `gapAlignmentSide`

The option also moves ambiguous indels in UTRs and inside CDSs. These moves do not change the score. Examples: the SARS-CoV-2 datasets have different indel coordinates in 70 of 165 examples, and different aa-level output in 115 of 165. Thus, a change of the default setting changes the output of many datasets, also where no start codon is affected.

## Decisions

Four independent decisions.

### D1. Setting in the affected datasets

- **Change `mpox/*` and `dengue/all` to `"gapAlignmentSide": "right"`**: fixes the lost start codons with no software release. For `dengue/all`, only `pathogen.json` changes: its tree is built from a MAFFT alignment, and private substitutions go down for 41 of 54 examples. The mpox trees are built from Nextclade alignments with `left`, and the frameshift ignore list matches exact codon ranges. Thus, mpox also needs the workflow change, a tree rebuild and a check of `qc.frameShifts.ignoredFrameShifts` in the same release. With only `pathogen.json` changed, QC status changes for 3 of 13 `mpox/all-clades` examples. Steps: [kb/issues/H-datasets-lost-start-codon-left-gap-side.md](../issues/H-datasets-lost-start-codon-left-gap-side.md)
- **Keep the setting until a software fix is available**: output does not change. Start codons are lost until then

### D2. Meaning of `gapAlignmentSide`

- **Change the documentation to agree with the behavior** (`left` = 3', `right` = 5'): no change to output. The option names stay counterintuitive

### D3. Gap scoring at CDS starts

- **Cost at the gap end**: charge the frame-aware cost at the position after the gap when that position is inside a CDS. This fixes the problem for both settings. The score matrix keeps one merged state per cell, so a correct end cost needs separate match and gap matrices (3-state Gotoh). This changes the output of ambiguous gaps that end inside a CDS
- **Move gaps after alignment**: move each ambiguous indel inside its equal-score window so that it does not overlap a CDS. The alignment algorithm does not change. Needs a calculation of the equal-score window for each indel
- **No change**: rely on D1 for each dataset

### D4. Detection

- **Warning or QC signal for a partial or deleted first codon**: at the moment, the only signal is `unknownAaRanges` (e.g. `VP4:1`) or a leading `-` in the translation. A signal makes the problem visible also when D1-D3 do not apply (e.g. real start-codon mutations)
- **No change**

## Related issues

- [kb/issues/H-datasets-lost-start-codon-left-gap-side.md](../issues/H-datasets-lost-start-codon-left-gap-side.md)
- [kb/issues/M-align-gap-end-cost-in-cds.md](../issues/M-align-gap-end-cost-in-cds.md)
- [kb/issues/M-align-gap-alignment-side-inverted.md](../issues/M-align-gap-alignment-side-inverted.md)
