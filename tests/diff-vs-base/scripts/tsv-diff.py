# %%
import typer


# %%
# print cwd
# import os
# print(os.getcwd())
def main(
    base_tsv_path: str = "validation/alignment-score/results/sars-cov-2/base/custom.tsv",
    eval_tsv_path: str = "validation/alignment-score/results/sars-cov-2/eval/custom.tsv",
    columns: str = "all",
):
    import os
    import polars as pl

    # Test for emptiness of files
    if os.path.getsize(base_tsv_path) == 0:
        # Write to stdout that file is empty -> indicates error
        with open("/dev/stdout", "w") as outfile:
            outfile.write(f"Base file {base_tsv_path} is empty, probably nextclade errored")
        raise ValueError(f"Base file {base_tsv_path} is empty, probably nextclade errored")
    if os.path.getsize(eval_tsv_path) == 0:
        # Write to stdout that file is empty -> indicates error
        with open("/dev/stdout", "w") as outfile:
            outfile.write(f"Eval file {eval_tsv_path} is empty, probably nextclade errored")
        raise ValueError(f"Eval file {eval_tsv_path} is empty, probably nextclade errored")

    # base_tsv_path = "validation/alignment-score/results/sars-cov-2/base/custom.tsv"
    # eval_tsv_path = "validation/alignment-score/results/sars-cov-2/eval/custom.tsv"
    base_df = pl.read_csv(
        base_tsv_path, separator="\t", infer_schema_length=10000
    ).sort("index")
    eval_df = pl.read_csv(
        eval_tsv_path, separator="\t", infer_schema_length=10000
    ).sort("index")

    if columns != "all":
        column_set = set(columns.split(","))
        column_set.add("index")
        column_set.add("seqName")
        column_set = column_set.intersection(base_df.columns).intersection(
            eval_df.columns
        )
        base_df = base_df.select(column_set)
        eval_df = eval_df.select(column_set)

    # %%
    # Create single df with all columns, where columns get `_base` and `_eval` suffixes
    df = base_df.join(eval_df, on="index", how="outer", suffix="_eval").sort(
        "index"
    )
    # df.head(10)
    # %%
    # Two modes:
    # Create column wise diff
    # And row wise diff, with only the columns that differ

    # %%
    # Column wise diff
    column_diff = dict()

    with open("/dev/stdout", "w") as outfile:
        for column in df.columns:
            if (
                column.startswith("index")
                or column.startswith("seqName")
                or column.endswith("_eval")
            ):
                continue
            base_col = pl.col(column)
            eval_col = pl.col(f"{column}_eval")
            differing_rows = df.filter(base_col != eval_col).select(
                [pl.col("index"), pl.col("seqName"), base_col, eval_col]
            )
            # Split by `,`, turn into set, and get rid of joint strings
            # remove file
            if len(differing_rows) > 0:
                # Create empty file
                outfile.write(f"{column}: {len(differing_rows)}\n")
                if df.schema[column] == pl.Utf8:
                    commadiff = differing_rows.select(
                        index=pl.col("index"),
                        seqName=pl.col("seqName"),
                        new_in_eval=(
                            eval_col.str.split(by=",")
                            .list.difference(base_col.str.split(by=","))
                            .list.join(",")
                        ),
                        gone_in_eval=(
                            base_col.str.split(by=",")
                            .list.difference(eval_col.str.split(by=","))
                            .list.join(",")
                        ),
                        shared=(
                            eval_col.str.split(by=",")
                            .list.intersection(base_col.str.split(by=","))
                            .list.join(",")
                        ),
                        base=base_col,
                        eval=eval_col,
                    )
                    commadiff.to_pandas().to_csv(outfile, sep="\t", index=False)
                    outfile.write("\n")
                else:
                    differing_rows.to_pandas().to_csv(
                        outfile, sep="\t", index=False
                    )
                    outfile.write("\n")


if __name__ == "__main__":
    typer.run(main)
