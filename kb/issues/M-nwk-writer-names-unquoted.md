# Newick output writes names with spaces and brackets unquoted

## Problem

The Newick writer writes each tip name as it is. The Newick format reads spaces, brackets, colons, semicolons, commas and quotes in an unquoted name as syntax, so a name that contains them must be written in single quotes, with inner quotes doubled.

Reference trees contain such names. The SARS-CoV-2 tree has tips such as `OV950637 (XL)`, which `nextclade.nwk` writes as `OV950637 (XL):0`. Tree tools read this as a tip `OV950637` followed by an unexpected subtree, or reject the file. Sequence names from input FASTA files can contain spaces too.

The file is shipped output of the CLI (`--output-tree-nwk`) and of the web app (Export page and the NWK button of the tree page), so quoting the names changes the output for these names.

## Code

- Tip names written unquoted: [packages/nextclade/src/io/nwk_writer.rs#L62-L64](https://github.com/nextstrain/nextclade/blob/201ec74ee1aba5376e03f8566777d7d27590dade/packages/nextclade/src/io/nwk_writer.rs#L62-L64)

## Fix

Quote names that contain whitespace or one of `()[]':;,`, and double the single quotes inside them. Names without these characters stay as they are.
