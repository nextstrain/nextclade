# Usage

> This section assumes you've installed Nextclade CLI, it's available in your system path as `nextclade` and has executable permissions. If not, please refer to [installation](installation) section for more information.

Refer to the help prompt for usage of Nextclade by running it without any arguments or with `--help`:

```bash
nextclade
nextclade --help
```

Note that Nextclade CLI has subcommands. Each subcommand has its own help prompt:

```bash
nextclade run --help
nextclade dataset list --help
nextclade dataset get --help
```

<!--- TODO: Should be expanded with detailed explanation of the commands -->

## Quick start

1. Download a SARS-CoV-2 dataset:

   ```bash
   nextclade dataset get --name 'nextstrain/sars-cov-2/MN908947' --output-dir 'data/sars-cov-2'
   ```

   Observe downloaded dataset files in the directory `data/sars-cov-2/`

   > 💡️ This command will download the latest SARS-CoV-2 dataset. You should run it periodically to update the dataset, in order to get the latest features, including the most up-to-date clade assignment. Find out more in the [Nextclade datasets](../datasets) section.

2. Run using the downloaded dataset and its example sequences (`data/sars-cov-2/sequences.fasta`):

   ```bash
   nextclade run \
      --input-dataset data/sars-cov-2 \
      --output-all=output/ \
      data/sars-cov-2/sequences.fasta
   ```

   Try to provide your own data instead of `data/sars-cov-2/sequences.fasta`.

   For more controls, specify input files explicitly and/or add more flags for output files:

   ```bash
   nextclade run \
      --verbose \
      --include-reference \
      --in-order \
      --input-dataset=data/sars-cov-2 \
      --input-ref=data/sars-cov-2/reference.fasta \
      --input-annotation=data/sars-cov-2/genome_annotation.gff3 \
      --genes=E,M,N,ORF1a,ORF1b,ORF3a,ORF6,ORF7a,ORF7b,ORF8,ORF9b,S \
      --input-tree=data/sars-cov-2/tree.json \
      --input-pathogen-json=data/sars-cov-2/pathogen.json \
      --output-fasta=output/nextclade.aligned.fasta.gz \
      --output-json=output/nextclade.json \
      --output-ndjson=output/nextclade.ndjson \
      --output-csv=output/nextclade.csv \
      --output-tsv=output/nextclade.tsv \
      --output-tree=output/nextclade.auspice.json \
      --output-tree-nwk=output/nextclade.tree.nwk \
      --output-translations=output/nextclade_gene_{gene}.translation.fasta.zst \
      data/sars-cov-2/sequences.fasta \
      my_sequences1.fasta.gz \
      my_sequences2.fasta.xz
   ```

   Add the `--verbose` flag to show more information in the console. Add `--include-reference` flag to also write gap-stripped reference sequence and reference peptides into outputs. Add `--in-order` to preserve the same order of results in output files as in input fasta (has runtime performance cost).

   The `--input-dataset` argument can be combined with individual `--input*` args. In this case, individual args override the corresponding files in the dataset.

   If `--output-all` is used, you can set `--output-basename` to control filenames and `--output-selection=all,fasta,json,ndjson,csv,tsv,tree,translations,insertions,errors` to control which files are emitted.

   There are more advanced arguments to control alignment and other parts of the algorithm. Refer to `nextclade run --help` for more details.

   You can learn more about input and output files in sections: [Input files](input-files), [Output files](output-files) and [Nextclade datasets](datasets). Read the built-in help (`nextclade --help`) for a detailed description of each subcommand and each flag.

3. Find the output files in the `output/` directory:

   - `nextclade.aligned.fasta` - aligned input sequences
   - `nextclade_cds_<cds_name>.translation.fasta` - aligned peptides corresponding to each coding sequence (CDS)
   - `nextclade.tsv` - results of the analysis in TSV format
   - `nextclade.csv` - same results, but in CSV format
   - `nextclade.json` - detailed results of the analysis in JSON format
   - `nextclade.ndjson` - detailed results of the analysis in newline-delimited JSON format
   - `nextclade.auspice.json` - same as input tree, but with the input sequences placed onto it and in Auspice v2 JSON format
   - `nextclade.tree.nwk` - same as input tree, but with the input sequences placed onto it and in Newick format

## What's next?

Congratulations, You have learned how to use Nextclade CLI!

Going further, you might want to learn about the science behind the Nextclade internals in the [Algorithm](algorithm) section. The required input data is described in [Input files](input-files) section. And produced files are described in [Output files](output-files) section. The datasets are described in more details in the [Nextclade datasets](datasets) section.

For a more convenient online tool, check out [Nextclade Web](nextclade-web).

Nextclade is an open-source project. We welcome ideas and contributions. Head to our [GitHub repository](https://github.com/nextstrain/nextclade) if you want report a bug, suggest a feature, or contribute code.
