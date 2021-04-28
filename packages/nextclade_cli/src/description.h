#pragma once

inline constexpr const char *PROJECT_DESCRIPTION = R"desc(
Nextclade is a part of Nextstrain project: https://nextstrain.org
The online tool is available at https://clades.nextstrain.org

Nextclade is a viral sequence analysis tool, for sequence alignment and translation (via Nextalign), mutation calling, clade assignment, quality control of sequencing and phylogenetic placement of sequences onto Nextstrain tree.


Currently Nextclade primarily focuses on SARS-CoV-2 genome, but it can be used on any virus, given a sufficiently similar reference sequence (less than a 5% divergence).


Nextclade is a free and open-source software and the source code can be found in the Nextclade GitHub repository:
https://github.com/nextstrain/nextclade

The latest downloads are available at:
https://github.com/nextstrain/nextclade/releases

Docker container images are available at:
https://hub.docker.com/r/nextstrain/nextclade

Please report bugs and request features using GitHub Issues:
https://github.com/nextstrain/nextclade/issues/new

For questions and general discussion join Nextstrain discussion forum:
https://discussion.nextstrain.org


Quick Example:

 1. Download the example SARS-CoV-2 data files from

  https://github.com/nextstrain/nextclade/tree/master/data/sars-cov-2

  (You can also try other viruses in the `data/` directory)

 2. Run:

    nextclade --input-fasta=sequences.fasta --input-root-seq=reference.fasta --genes=E,M,N,ORF1a,ORF1b,ORF3a,ORF6,ORF7a,ORF7b,ORF8,ORF9b,S --input-gene-map=genemap.gff --input-tree=tree.json --input-qc-config=qc.json --input-pcr-primers=primers.csv --output-json=output/nextclade.json --output-csv=output/nextclade.csv --output-tsv=output/nextclade.tsv --output-tree=output/nextclade.auspice.json --output-dir=output/ --output-basename=nextclade

    Add `--verbose` flag to show more information in the console. Add `--include-reference` flag to also write gap-stripped reference sequence and peptides into outputs.

 3. Find the output files in the `output/` directory:

    - nextclade.aligned.fasta - aligned input sequences
    - nextclade.gene.<gene_name>.fasta - peptides corresponding to each gene
    - nextclade.insertions.csv - list of stripped insertions for each input sequence
    - nextclade.tsv - results of the analysis in TSV format
    - nextclade.csv - same results, but in CSV format
    - nextclade.json - detailed results of the analysis in JSON format
    - nextclade.auspice.json - same as input tree, but with the input sequences placed onto it

)desc";
