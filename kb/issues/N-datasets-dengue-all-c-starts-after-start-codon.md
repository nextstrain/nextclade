# dengue/all annotates C from its second codon

## Problem

The genome annotation of `nextstrain/dengue/all` in `nextclade_data` starts the gene C at reference position 102 (`gene 102 440`, `gene=C`). The start codon `ATG` of the polyprotein is at 99-101. Thus, C begins at its second codon, and Nextclade translates it as `NNQRKK...` instead of `MNNQRKK...`.

Effects:

- **Numbering**: C positions are one lower than with numbering from the start codon. `C:N1` is the second residue of the protein
- **Start codon protection**: features that act on the first codon of a CDS act on the reference codon `AAC` at 102-104. `penaltyGapEnterCds` keeps deletions out of 102-104, not out of the start codon, and the lost start codon warning never applies to C, because its reference codon is not `ATG`
- **False substitution**: 5'-truncated DENV4 genomes (GenBank KY5868xx, e.g. KY586941) lack one `AAC` codon compared with the reference. With `penaltyGapEnterCds` or with `gapAlignmentSide: "right"`, the query `ATG` aligns to the reference `AAC` at 102-104, and Nextclade reports `C:N1M`, a substitution that the genomes do not have. With the shipped settings, Nextclade reports `C:N1-`, which is the real difference ([H-datasets-lost-start-codon-left-gap-side.md](H-datasets-lost-start-codon-left-gap-side.md))

## Fix

Not decided. If the dataset maintainers confirm that C includes the start codon, the annotation can start C at 99. This moves every C position by one, so aa mutation names, mutation labels and other stored C positions change, which breaks shipped output.

## Related

- [H-datasets-lost-start-codon-left-gap-side.md](H-datasets-lost-start-codon-left-gap-side.md)
- [kb/reports/alignment-gap-placement-at-cds-start.md](../reports/alignment-gap-placement-at-cds-start.md)
