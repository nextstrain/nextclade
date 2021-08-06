# 4. PCR primer changes detection

[Polymerase chain reactions (PCR)](https://en.wikipedia.org/wiki/Polymerase_chain_reaction) uses small nucleotide sequence snippets called primers that are [complementary](<https://en.wikipedia.org/wiki/Complementarity_(molecular_biology)>) to a specific region of the virus genome. A high similarity between primers and the genome region they are supposed to bind to is essential for PCRs to work. Changes in the virus genome can interfere with this requirement. If Nextclade is provided with a table of PCR primers (in CSV format), Nextclade can analyze these regions in query sequences and report changes that may indicate reduced primer binding.

For each primer, Nextclade finds and records a corresponding range in the reference sequence. It then verifies if any of the mutations in the aligned query sequence (identified in the "Nucleotide mutation calling" step) fall in any of these primer ranges, and if so, reports these mutations as PCR primer changes.

This step only runs if a PCR primer table is provided. It can fail if PCR primers provided do not have high similarity with any part of the reference sequence.
