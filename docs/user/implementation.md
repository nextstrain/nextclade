
## Implementation details

Note: Implementation details may change periodically. In this case, this section might go out of date and might need to be updated.

On implementation level, Nextclade analysis algorithm consists of the following steps (in order of execution):

- read, validate and parse input files

- preprocess tree (prepare nodes for the following steps: mark reference nodes, prepare mutation map)

- for each input sequence (concurrently, streaming sequence data):

  - align sequence against reference sequence

  - strip insertions from sequence, but keep a record of each insertion

  - for each gene:

    - translate gene

    -

  - write aligned sequences

  - write previously gathered insertions

  - for each gene:

    - write peptide sequences

- postprocess tree (revert changes made in preprocessing step, add metadata)
