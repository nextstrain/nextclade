"""
Call as:
python3 scripts/new-nonaligned.py \
--old-tsv-path {input.oldtsv} \
--new-tsv-path {input.newtsv} \
--nonaligned-tsv-path {output.oldtsv} \
--nonaligned-fasta-path {output.sequences} \
"""

# %%
from polars import head
import typer


def main(
    old_tsv_path: str = "~/code/nextclade/tests/alignment-benchmark/results/MPXV/old/nextclade.tsv",
    new_tsv_path: str = "~/code/nextclade/tests/alignment-benchmark/results/MPXV/exc_100_term_1000_retry_4_mis_0_wind_10/nextclade.tsv",
    nonaligned_old_tsv_path: str = "~/code/nextclade/tests/alignment-benchmark/results/MPXV/nonaligned_old.tsv",
    nonaligned_new_tsv_path: str = "~/code/nextclade/tests/alignment-benchmark/results/MPXV/nonaligned_new.tsv",
    nonaligned_fasta_path: str = "~/code/nextclade/tests/alignment-benchmark/results/MPXV/nonaligned.fasta",
    mode: str = "nonaligned",
):
    import polars as pl
    import polars.selectors as cs

    # old_tsv_path= "~/code/nextclade/tests/alignment-benchmark/results/MPXV/old/nextclade.tsv"
    # new_tsv_path= "~/code/nextclade/tests/alignment-benchmark/results/MPXV/exc_100_term_1000_retry_4_mis_0_wind_10/nextclade.tsv"
    base_df = pl.read_csv(
        old_tsv_path,
        separator="\t",
        infer_schema_length=10000,
        dtypes={"alignmentScore": pl.Float32},
    ).sort("index")
    eval_df = pl.read_csv(
        new_tsv_path,
        separator="\t",
        infer_schema_length=10000,
        dtypes={"alignmentScore": pl.Float32},
    ).sort("index")

    # Find rows that are in both dataframes: report differences, proceed with intersection
    outer = base_df.join(eval_df, on="index", how="outer", suffix="_eval")

    # Only in base
    if mode == "nonaligned":
        df = outer.filter(
            pl.col("alignmentScore_eval").is_null()
            & pl.col("alignmentScore").is_not_null()
        )
    elif mode == "worse":
        df = outer.filter(
            pl.col("alignmentScore_eval").is_not_null()
            & pl.col("alignmentScore").is_not_null()
        ).filter(pl.col("alignmentScore_eval") < pl.col("alignmentScore"))

    base_df.filter(pl.col("seqName").is_in(df.select(pl.col("seqName")).to_series())).write_csv(
        nonaligned_old_tsv_path, separator="\t"
    )
    eval_df.filter(pl.col("seqName").is_in(df.select(pl.col("seqName")).to_series())).write_csv(
        nonaligned_new_tsv_path, separator="\t"
    )

    df.select(pl.col("seqName")).write_csv(nonaligned_fasta_path)

    # Get rid of all columns


if __name__ == "__main__":
    typer.run(main)
