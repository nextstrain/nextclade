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
    score_correct: bool = False,
):
    import os
    import polars as pl

    # Test for emptiness of files
    if os.path.getsize(base_tsv_path) == 0:
        # Write to stdout that file is empty -> indicates error
        with open("/dev/stdout", "w") as outfile:
            outfile.write(
                f"Base file {base_tsv_path} is empty, probably nextclade errored"
            )
        raise ValueError(
            f"Base file {base_tsv_path} is empty, probably nextclade errored"
        )
    if os.path.getsize(eval_tsv_path) == 0:
        # Write to stdout that file is empty -> indicates error
        with open("/dev/stdout", "w") as outfile:
            outfile.write(
                f"Eval file {eval_tsv_path} is empty, probably nextclade errored"
            )
        raise ValueError(
            f"Eval file {eval_tsv_path} is empty, probably nextclade errored"
        )

    # base_tsv_path = "validation/alignment-score/results/sars-cov-2/base/custom.tsv"
    # eval_tsv_path = "validation/alignment-score/results/sars-cov-2/eval/custom.tsv"
    base_df = pl.read_csv(
        base_tsv_path, separator="\t", infer_schema_length=100000, dtypes={"alignmentScore": pl.Float32, "errors": pl.Utf8}
    ).sort("index").with_columns(
        alignmentScore = pl.col("alignmentScore").fill_null(-1) # Fill nonaligns with -1
    )
    eval_df = pl.read_csv(
        eval_tsv_path, separator="\t", infer_schema_length=100000, dtypes={"alignmentScore": pl.Float32, "errors": pl.Utf8}
    ).sort("index").with_columns(
        alignmentScore = pl.col("alignmentScore").fill_null(-1) # Fill nonaligns with -1
    )

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

    # Print where alignmentScores are different
    # df.filter(pl.col("alignmentScore_eval") != pl.col("alignmentScore")).select(
    #     [pl.col("index"), pl.col("seqName"), pl.col("alignmentScore"), pl.col("alignmentScore_eval")]
    # ).to_pandas().to_csv("/dev/stdout", sep="\t", index=False)

    # Print row where index=999
    # df.filter(pl.col("index") == 999).to_pandas().to_csv("/dev/stdout", sep="\t", index=False)

    # df.head(10)
    # %%
    # Two modes:
    # Create column wise diff
    # And row wise diff, with only the columns that differ

    # %%
    # Column wise diff
    column_diff = dict()

    # Reorder df.columns
    # Move alignmentScore, alignmentStart, alignmentEnd, totalSubstitutions, totalDeletions, totalInsertions, totalFrameShifts, substitutions, deletions, insertions, and clade to front
    first_columns = [
        "alignmentScore",
        "alignmentStart",
        "alignmentEnd",
        "totalSubstitutions",
        "totalDeletions",
        "totalInsertions",
        "totalFrameShifts",
        "substitutions",
        "deletions",
        "insertions",
        "clade",
    ]
    columns = first_columns + [
        column for column in df.columns if column not in first_columns
    ]

    # Add totalMissing_eval to alignmentScore_eval
    if score_correct:
      df = df.with_columns(
          alignmentScore_eval=pl.col("alignmentScore_eval") + pl.col("totalMissing_eval")
      )


    with open("/dev/stdout", "w") as outfile:
        for column in columns:
            if (
                column.startswith("index")
                or column.startswith("seqName")
                or column.endswith("_eval")
            ):
                continue
            base_col = pl.col(column)
            eval_col = pl.col(f"{column}_eval")
            try:
                differing_rows = df.filter((base_col.is_null() & eval_col.is_not_null()) | (base_col.is_not_null() & eval_col.is_null()) | (base_col != eval_col)).select(
                    [pl.col("index"), pl.col("seqName"), base_col, eval_col]
                )
            except Exception as e:
                print(f"Error in column: {column}: {e}")
                # print(df.select(base_col))
                # print(df.select(eval_col))
                continue

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
                            .list.set_difference(base_col.str.split(by=","))
                            .list.join(",")
                        ),
                        gone_in_eval=(
                            base_col.str.split(by=",")
                            .list.set_difference(eval_col.str.split(by=","))
                            .list.join(",")
                        ),
                        shared=(
                            eval_col.str.split(by=",")
                            .list.set_intersection(base_col.str.split(by=","))
                            .list.join(",")
                        ),
                        base=base_col,
                        eval=eval_col,
                    )
                    commadiff.to_pandas().to_csv(outfile, sep="\t", index=False)
                    outfile.write("\n")
                elif df.schema[column] in pl.NUMERIC_DTYPES:
                    differencediff = differing_rows.select(
                        index=pl.col("index"),
                        seqName=pl.col("seqName"),
                        difference=eval_col - base_col,
                        base=base_col,
                        eval=eval_col,
                    )
                    differencediff.to_pandas().to_csv(
                        outfile, sep="\t", index=False
                    )
                else:
                    differing_rows.to_pandas().to_csv(
                        outfile, sep="\t", index=False
                    )
                    outfile.write("\n")


if __name__ == "__main__":
    typer.run(main)
