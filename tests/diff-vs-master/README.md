# Snakemake workflow to run different nextclade binaries and compare outputs

From within this directory, run:

```bash
snakemake
```

From anywhere, run:
  
```bash
bash run.sh
```

To check alignment score changes, you can for example run:

```bash
tsv-pretty results/*/default_diff_alignment_score.tsv | less
```
