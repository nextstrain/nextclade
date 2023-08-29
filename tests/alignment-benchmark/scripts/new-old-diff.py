# %%
import typer


def main(
    old_tsv_path: str = "~/code/nextclade/tests/alignment-benchmark/results/MPXV/old/nextclade.tsv",
    new_tsv_path: str = "~/code/nextclade/tests/alignment-benchmark/results/MPXV/exc_050_term_100_retry_2/nextclade.tsv",
    old_runtime: str = "~/code/nextclade/tests/alignment-benchmark/results/MPXV/old/runtime.csv",
    new_runtime: str = "~/code/nextclade/tests/alignment-benchmark/results/MPXV/exc_050_term_100_retry_2/runtime.csv",
    params: str = "exc_050_term_100_retry_2",
):
    import polars as pl

    # import ipdb; ipdb.set_trace()
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
    total_seqs = outer.shape[0]

    # Only in base
    only_in_base = outer.filter(pl.col("alignmentScore_eval").is_null() & pl.col("alignmentScore").is_not_null())
    only_in_eval = outer.filter(pl.col("alignmentScore").is_null() & pl.col("alignmentScore_eval").is_not_null())
    in_neither = outer.filter(
        (pl.col("alignmentScore_eval").is_null() & pl.col("alignmentScore").is_null())
    )

    # In both
    df = outer.filter(
        (pl.col("alignmentScore_eval").is_not_null() & pl.col("alignmentScore").is_not_null())
    )

    df = df.with_columns(
        alignmentScoreDiff=pl.col("alignmentScore_eval")
        - pl.col("alignmentScore")  # + pl.col("totalMissing_eval")
    )

    summary = df.select(pl.col("alignmentScoreDiff")).describe()
    count = summary[0, 1]
    mean = summary[2, 1]
    std = summary[3, 1]
    min = summary[4, 1]
    median = summary[6, 1]
    max = summary[8, 1]
    # print(summary, better_share, worse_share, same_share)

    old_runtime_df = pl.read_csv(
        old_runtime, separator=",", infer_schema_length=10000
    )
    new_runtime_df = pl.read_csv(
        new_runtime, separator=",", infer_schema_length=10000
    )

    params = params.split("_")
    rundiff = {params[i]: params[i + 1] for i in range(0, len(params), 2)}
    rundiff |= {
        "seqs": total_seqs,
        "align_v2_only": only_in_base.shape[0]/total_seqs,
        "align_v3_only": only_in_eval.shape[0]/total_seqs,
        "align_neither": in_neither.shape[0]/total_seqs,
        "align_both": df.shape[0]/total_seqs,
        "align_diff": (only_in_eval.shape[0] - only_in_base.shape[0])/total_seqs,
    }
    if count > 0:
        rundiff |= {
            "mean_score_diff": mean,
            "std_score_diff": std,
            "median_score_diff": median,
            "min_score_diff": min,
            "max_score_diff": max,
            "better_share": df.filter(pl.col("alignmentScoreDiff") > 0).shape[0]
            / count,
            "worse_share": df.filter(pl.col("alignmentScoreDiff") < 0).shape[0]
            / count,
            "wall_old": old_runtime_df["mean"].sum() / count,
            "wall_new": new_runtime_df["mean"].sum() / count,
            "wall_diff": (
                new_runtime_df["mean"].sum() - old_runtime_df["mean"].sum()
            )
            / count,
            "wall_diff_ratio": new_runtime_df["mean"].sum()
            / old_runtime_df["mean"].sum(),
            "cpu_share_old": (
                old_runtime_df["user"].sum() + old_runtime_df["system"].sum()
            )
            / old_runtime_df["mean"].sum(),
            "cpu_share_new": (
                new_runtime_df["user"].sum() + new_runtime_df["system"].sum()
            )
            / new_runtime_df["mean"].sum(),
        }
    with open("/dev/stdout", "w") as outfile:
        import csv

        writer = csv.DictWriter(
            outfile, fieldnames=rundiff.keys(), delimiter="\t"
        )
        writer.writeheader()
        writer.writerow(rundiff)


if __name__ == "__main__":
    typer.run(main)
