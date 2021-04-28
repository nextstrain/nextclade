#pragma once

inline constexpr const char *PROJECT_DESCRIPTION = R"desc(
Nextclade is a part of Nextstrain project: https://nextstrain.org

Nextalign is a viral genome sequence alignment tool. It performs pairwise alignment of provided sequences against a given reference sequence using banded local alignment algorithm with affine gap-cost. Band width and rough relative positions are determined through seed matching.

Nextalign will strip insertions relative to the reference and output them in a separate CSV file.

Optionally, when provided with a gene map and a list of genes, Nextalign can perform translation of these genes.

Currently Nextalign primarily focuses on SARS-CoV-2 genome, but it can be used on any virus, given a sufficiently similar reference sequence (less than a 5% divergence).


Nextalign is a free and open-source software and the source code can be found in the Nextclade GitHub repository:
https://github.com/nextstrain/nextclade

The latest downloads are available at:
https://github.com/nextstrain/nextclade/releases

Docker container images are available at:
https://hub.docker.com/r/nextstrain/nextalign

Please report bugs and request features using GitHub Issues:
https://github.com/nextstrain/nextclade/issues/new

For questions and general discussion join Nextstrain discussion forum:
https://discussion.nextstrain.org


Quick Example:

 1. Download the example SARS-CoV-2 data files from

  https://github.com/nextstrain/nextclade/tree/master/data/sars-cov-2

  (You can also try other viruses in the `data/` directory)

 2. Run:

    nextalign --sequences=sequences.fasta --reference=reference.fasta --genemap=genemap.gff --genes=E,M,N,ORF1a,ORF1b,ORF3a,ORF6,ORF7a,ORF7b,ORF8,ORF9b,S --output-dir=output/ --output-basename=nextalign

    Add `--verbose` flag to show more information in the console. Add `--include-reference` flag to also write gap-stripped reference sequence and peptides into outputs.

 3. Find the output files in the `output/` directory:

    - nextalign.aligned.fasta - aligned input sequences
    - nextalign.gene.<gene_name>.fasta - peptides corresponding to each gene
    - nextalign.insertions.csv - list of stripped insertions for each input sequence

)desc";
