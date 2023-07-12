import pandas as pd
import numpy as np
import plotly.graph_objects as go


def prepare_data(df, column):
    """Prepare data for line segments."""
    x_values = np.empty((len(df), 2))
    x_values[:, 0] = df[column]
    x_values[:, 1] = df[column]
    x_values = x_values.flatten()

    y_values = np.empty((len(df), 2))
    y_values[:, 0] = df["ref"]
    y_values[:, 1] = df["ref"]
    y_values = y_values.flatten()

    return x_values, y_values


# Load data
# Read file name from command line (first and second argument)


df_new = pd.read_csv("stripes.csv")
df_matches = pd.read_csv("matches.csv")
# df_old = pd.read_csv("../nextclade_master/stripes_old.csv")

# Prepare data for line segments
x_values_new_begin, y_values_new = prepare_data(df_new, "begin")
x_values_new_end, _ = prepare_data(df_new, "end")
# x_values_old_begin, y_values_old = prepare_data(df_old, "begin")
# x_values_old_end, _ = prepare_data(df_old, "end")

# Create a figure
fig = go.Figure()
# Add 'begin' and 'end' lines of new data as separate traces
fig.add_trace(
    go.Scatter(
        x=x_values_new_begin,
        y=y_values_new,
        mode="lines",
        line=dict(color="black"),
        name="New Data Begin",
    )
)
fig.add_trace(
    go.Scatter(
        x=x_values_new_end,
        y=y_values_new,
        mode="lines",
        line=dict(color="black"),
        name="New Data End",
    )
)

# # Add 'begin' and 'end' lines of old data as separate traces
# fig.add_trace(
#     go.Scatter(
#         x=x_values_old_begin,
#         y=y_values_old,
#         mode="lines",
#         line=dict(color="red"),
#         name="Old Data Begin",
#     )
# )
# fig.add_trace(
#     go.Scatter(
#         x=x_values_old_end,
#         y=y_values_old,
#         mode="lines",
#         line=dict(color="red"),
#         name="Old Data End",
#     )
# )

# Add match line segments from old data
for _, row in df_matches.iterrows():
    x_values = [row["qry_pos"], row["qry_pos"] + row["length"]]
    y_values = [row["ref_pos"], row["ref_pos"] + row["length"]]
    fig.add_trace(
        go.Scatter(
            x=x_values,
            y=y_values,
            mode="lines",
            line=dict(color="blue"),
            showlegend=False,
        )
    )

# Set layout options
fig.update_layout(
    autosize=True,
    # width=800,
    # height=800,
    yaxis=dict(autorange="reversed"),  # this line is for inverting the y axis
)

# Show the figure
fig.show()
