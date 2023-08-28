# Snakemake workflow to run different nextclade binaries and compare outputs

From within this directory, run:

```bash
pip3 install -r requirements.txt
```

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

If you want to use a different branch than `master` as "base" you can set it via `--config base_branch=...`:

```bash
bash run.sh --config base_branch=v3
```

## Comparing v3 and v2 alignments
