# Amino acid indels do not follow the nucleotide indels

## Problem

`fn translate_cds()` removes all gaps from the aligned query CDS, translates it, and aligns the peptide to the reference peptide again. This second alignment does not know where the nucleotide alignment placed the indels. When an amino acid deletion or insertion has several placements with the same peptide score (repeats, divergent regions), `gapAlignmentSide` selects one, independent of the nucleotide placement. Nextclade then reports an amino acid deletion of a codon that the query has, and a substitution at the codon that is deleted.

Examples with Nextclade 3.25.0:

- **SARS-CoV-2 Delta** (USA/CO-CDC-MMB10752210/2021, `nextstrain/sars-cov-2/wuhan-hu-1/orfs` examples, `right`): the nucleotide deletion 22029-22034 covers S codons 156-158 (the known Delta `S:E156-`, `S:F157-`), but `aaDeletions` reports `S:D138-` and `S:P139-`
- **CVA10** KY272007.1 (`left`): the nucleotide deletion 1390-1392 removes VP2 codon 147, but the output reports `VP2:G148-` and a substitution `VP2:P147R` that the genome does not have
- **EV-D68 VP1 DE-loop** (`enpen/enterovirus/ev-d68`, shipped `right`, 1,195 GenBank genomes): reference VP1 138-147 is `AVNGSSNSTY`, an `S`/`N` repeat. In 25 of 322 genomes with a 3-nt deletion there, the nucleotide deletion removes VP1 codon 145, but `aaDeletions` reports codon 142. With `left`, 4 genomes disagree. Amino acid mutations in this epitope then differ from alignments of other tools
- **Synthetic repeat** `CTT GAA CTC GAT` (`L E L D`) with `GAA CTC` missing, `right`: the nucleotide deletion is codons 11-12, the peptide output `L10-`, `E11-`, and `aaChangesGroups` shows `L10- ref=CTT qry=CTT`
- **Start codon**: with `right`, the peptide alignment can delete `M1` although the nucleotide alignment keeps codon 1 (in-frame deletion next to a repeated `ATG`, reverse-strand CDS). The lost start codon warning reads codon 1 from the nucleotide alignment, so no warning appears

The same applies to amino acid insertions: a nucleotide insertion after codon 10 was reported as `X:9:LE`.

Nucleotide results are correct. `aaDeletions`, `aaInsertions`, `aaSubstitutions`, the translated peptides and all outputs derived from them can name the wrong codons.

## Code

- `fn translate_cds()` in [packages/nextclade/src/translate/translate_genes.rs](../../packages/nextclade/src/translate/translate_genes.rs): `remove_gaps_in_place()`, then `align_aa()`
- One flat amino acid gap map serves all CDSs, so the peptide aligner has no per-codon information

## Fix

In development, not released: on ties, the peptide aligner prefers the placement that matches the nucleotide alignment, through per-CDS peptide tie-break penalties (deleting an amino acid costs the number of query bases in its codon, inserting one costs 1 except next to a nucleotide insertion). Scores do not change. In the example sequences of 94 datasets, amino acid deletions change in 179 of 4001 sequences (SARS-CoV-2 BA.2.86 38, HIV-1 32, dengue 29, no flu) and `aaInsertions` in 102.

Not decided: on by default or opt-in. The fix renames shipped SARS-CoV-2 amino acid indels, for example Delta `S:D138-,P139-` to `S:E156-,F157-`, Beta `S:L242-,A243-` to `S:A243-,L244-`, and BA.1 `S:210:IV` to `S:214:PE` (the established `ins214EPE`). Downstream mutation lists can depend on the old names.
