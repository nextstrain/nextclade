# Ambiguous in-frame deletion can remove the start codon

## Problem

An in-frame deletion next to a CDS start can have several placements inside of the CDS with the same score. This happens when the codons at both ends of the deleted range are the same. Each of these placements starts at a codon boundary inside of the CDS and pays `penaltyGapOpenInFrame`, so `penaltyGapEnterCds` does not separate them, and `gapAlignmentSide` selects one. With `right` (gaps at the 5'-most position), the deletion can remove codon 1. Nextclade then reports a deletion of the start codon, although the query has an intact start codon.

Example: mpox OPG112 (CDS starts at 91247), sample Ivory_Coast_2012 of the `nextstrain/mpox/all-clades` examples, with `penaltyGapEnterCds: 2`:

```
ref    CCGATAA ATG GAA ATG GAT AAA    protein MEMDK
left   CCGATAA ATG --- --- GAT AAA    M--DK   aa deletions E2-, M3-
right  CCGATAA --- --- ATG GAT AAA    --MDK   aa deletions M1-, E2-
```

Both alignments describe the same query, with the same protein length and reading frame. Only the reported deleted codons differ. With `right`, Nextclade versions after 3.24.0 also report a lost start codon in the `warnings` output, because the first codon of the query is `---`.

The case needs a codon repeat at the CDS start and a dataset that uses `right`. In the example sequences of 94 datasets of `nextclade_data`, aligned with both gap sides, this example is the only occurrence. A reverse-strand CDS has its start codon at the high-coordinate end, so there `left` (gaps at the 3'-most position) can remove it. This follows from the symmetry of the tie-break and was not observed in the examples.

## Tests

`fn aligns_deletion_entering_cds` ([packages/nextclade/src/align/align.rs](../../packages/nextclade/src/align/align.rs)) with fixture `STRADDLE` expects the deletion of codons 1-2 (`STRADDLE_CODONS_1_2`) with `right`. Change this expectation when the issue is fixed.

## Directions (not decided)

- **Accept and document**: the deletion stays in-frame, and only the reported codons differ
- **Penalty for a deletion that removes the first base of a CDS**: in the example, the deletion of codons 2-3 wins. Two problems:
  - When the only alternatives are a deletion that enters the CDS from outside and a deletion of exactly codon 1, both pay the new penalty, and the entering deletion wins again because `penaltyGapOpen` is lower than `penaltyGapOpenInFrame`. `penaltyGapEnterCds` must then grow by the same amount, so the two values depend on each other
  - The start codon of a reverse-strand CDS is at the high-coordinate end. A penalty for deletions that leave a CDS at that end can replace a real deletion across the CDS end with a deletion next to it plus an extra substitution. This happened in SARS-CoV-2 (deletion 27887-27901 across the ORF7b end, substitution A27887T) when the same penalty was charged at both CDS ends

## Reverse strand and peptide alignment

Synthetic fixture with `penaltyGapEnterCds: 2`: mpox reference 90947-91987 with OPG112 at local 301-741 and a query without 6 nt at the CDS start, and its reverse complement for the reverse strand.

| CDS strand | Side | Nucleotide deletion | aa deletions | Lost start codon warning |
| --- | --- | --- | --- | --- |
| forward | `left` | codons 2-3 | `E2-, M3-` | no |
| forward | `right` | codons 1-2 | `M1-, E2-` | yes |
| reverse | `left` | codons 1-2 | `M1-, E2-` | yes |
| reverse | `right` | codons 2-3 | `M1-, E2-` | no |

- On the reverse strand, both gap sides are affected. Only mpox (4 datasets) and VZV have reverse-strand CDSs, and they use `left`
- In the last row, the nucleotide alignment keeps codon 1, but the peptide alignment deletes `M1` ([H-translate-aa-indels-ignore-nuc-alignment.md](H-translate-aa-indels-ignore-nuc-alignment.md)), and the warning does not fire. A fix in the nucleotide aligner only is therefore not enough

In development, not released: among placements with the same score, the aligner prefers the placement that deletes the fewest bases of an `ATG` start codon, and the peptide aligner follows the nucleotide placement. All four rows then delete codons 2-3 and keep `M`.

Not decided: on by default or opt-in. On by default, the tie-break also fixes the ties of `kb/issues/H-datasets-lost-start-codon-left-gap-side.md` (CVA10 VP4, mpox OPG204, EV-D68) without a dataset change, and alignment scores, clades, QC status, frameshifts and substitutions do not change. But datasets whose reference trees store the previous placement get extra private mutations until the trees are rebuilt: in 9 mpox examples, `qc.privateMutations.total` rises by 1. An opt-in parameter avoids this, at the cost of one more alignment parameter that datasets must set.

## Rationale

Placements with the same alignment score explain the nucleotide data equally well, so `gapAlignmentSide` applies a fixed convention that does not consider genes. At a CDS start the placements differ in their protein consequence: one keeps the start codon, the other claims a lost start codon, which would truncate or abolish the protein. When an equally good placement keeps the start codon, the data do not support that claim. The tie-break therefore prefers the placement with fewer protein consequences, which is parsimony at the protein level. It acts only on exact ties and never overrides a score difference, so real start codon losses stay, for example the SARS-CoV-2 15-nt deletion across the ORF7b end and the ORF8 start, or the mpox 1,141-nt deletion over OPG032. The amino acid part follows from consistency: an amino acid indel is the translation of a nucleotide indel, so both must name the same codons.
