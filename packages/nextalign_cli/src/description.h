#pragma once

inline constexpr const char *PROJECT_DESCRIPTION = R"desc(
Nextalign is a viral genome sequence alignment algorithm used in Nextclade, ported to C++ and made into the standalone command-line tool.

Nextalign performs pairwise alignment of provided sequences against a given reference sequence using banded local alignment algorithm with affine gap-cost. Band width and rough relative positions are determined through seed matching.

Nextalign will strip insertions relative to the reference and output them in a separate CSV file.

Optionally, when provided with a gene map and a list of genes, Nextalign can perform translation of these genes.

Currently Nextalign primarily focuses on SARS-CoV-2 genome, but it can be used on any virus, given a sufficiently similar reference sequence (less than a 5% divergence).


Nextalign is a free and open-source software and the source code can be found in the Nextclade GitHub repository:
https://github.com/nextstrain/nextclade

The latest downloads are available at:
https://github.com/nextstrain/nextclade/releases

Docker container images are available at:
https://hub.docker.com/r/neherlab/nextalign

Please report bugs and request features using GitHub Issues:
https://github.com/nextstrain/nextclade/issues/new

For questions and general discussion join Nextstrain discussion forum:
https://discussion.nextstrain.org


Quick Example:

 1. Download the example data files from:
    https://github.com/nextstrain/nextclade/tree/master/data/example/SARS-CoV-2

 2. Run:
    nextalign --sequences=sequences.fasta --reference=reference.fasta --genemap=genemap.gff --genes=E,M,N,ORF10,ORF14,ORF1a,ORF1b,ORF3a,ORF6,ORF7a,ORF7b,ORF8,ORF9b,S --output-dir=output/ --output-basename=nextalign

    Add `--verbose` flag to show more information in the console. Add `--write-ref` flag to also write gap-stripped reference sequence and peptides into outputs.

 3. Find the output files in the `output/` directory
)desc";
