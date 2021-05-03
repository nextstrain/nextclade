# General
## What does nextclade do? What do I need to know?
Nextclade allows you to analyze SARS-CoV-2 sequences in the web browser. It will align your sequence data to a reference genome, call mutations relative to that reference, and place your sequences on a SARS-CoV-2 phylogeny. It also reports clade assignments and quality of your sequence data.

## Does my sequence data leave my computer?
No, it does not. All steps - sequence alignment, variant calling, clade assignment, and tree placement - is happening on your computer, in your browser.

## What do the QC indicators mean?
Nextclade calculates several metrics that indicate sequence quality. We currently use four such metrics:
  - **Missing data**: the number of unknown bases (`N`)
  - **Mixed sites**: the number of bases that are not `ACTG-N`, for example `R`,`Y`,`K` etc.
  - **Private mutations**: the number of mutations that map to the terminal branch leading to the sequence after attachment to the tree. Many private mutation either indicate many sequencing errors, or an unusual variant without close relatives in the tree
  - **SNP clusters**: several mutations in a short stretch can indicate assembly problems. We calculate such SNP clusters using only the private mutations.

The rules on missing data, private mutations, and SNP clusters mimic the exclusion criteria used by the nextstrain augur tool.

## How can I contact the creators of Nextclade?
The nextstrain team maintains a discussion forum at discussion.nextstrain.org. You can post your questions there. For bugs in the software or feature requests, please open an issue on  [GitHub](https://github.com/nextstrain/nextclade/issues).

## Can I use my own tree?
Yes, you can specify your own tree, reference sequence, and QC settings in the advanced mode. Your phylogenetic tree can be generated using the augur pipeline.

## Is Nextclade available for other pathogens and microorganisms, too?
Nextclade works for other viruses, but you have to specify your own reference sequences, trees, and annotations. Only SARS-CoV-2 data is currently provided as a default. We plan to support other pathogens in the future.


# Output files

## CSV/TSV outputs


## JSON output


## Auspice tree output

