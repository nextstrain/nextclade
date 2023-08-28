# Snakemake workflow to compare accuracy and performance given different alignment parameters

From within this directory, run:

```bash
pip3 install -r requirements.txt
```

```bash
snakemake
```

Parameters are defined in directory name:

- exc: excess bandwidth
- term: terminal bandwidth
- retry: max number of retries with broadened gap
- mis: max number of mismatches within window when extending seeds
- wind: window size for extending seeds
- minml: minimum match length for extended seeds to be kept

Two output files:

- new_vs_old.tsv: TSV with each row for a particular parameter configuration, columns are various benchmarking metrics like runtime, average change in alignment score, etc.
- diff_columns.tsv: File that shows per sequence difference between v2 and v3 Nextclade (with parameters of v3 as per directory name)

Generate these files for a particular parameter set:

```bash
snakemake results/sars-cov-2/exc_9_term_50_retry_10_mis_0_wind_20_minml_30/new_vs_old.tsv
snakemake results/sars-cov-2/exc_9_term_50_retry_10_mis_0_wind_20_minml_30/diff_columns.tsv
```

## Comparing parameters for given alignment

## Handy commands

Compare run times

```bash
keep-header results/MPXV/*/runtime.csv -- cat | keep-header -- sort | csv2tsv | tsv-select -H -f command,mean,user,system | tsv-pretty -m25 --format-floats --precision 2 | less
```
