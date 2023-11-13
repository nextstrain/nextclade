# All outputs

For convenience, you can obtain all output files listed in the followup sections at once.

In Nextclade Web: download `nextclade.zip` file.

Nextclade CLI arguments:

- `--output-all`/`-O` `<OUTPUT_DIR>` - set output directory where the files will be written
- `--output-selection` allows to select which files are written
- `--output-basename` allows to customize base name of the output files

> ⚠️ For CLI users: Note that due to technical limitations of the JSON format, it cannot be streamed entry-by entry, i.e. before writing the output to the file, all entries need to be accumulated in memory. If the JSON results output or tree output is requested (through `--output-json`, `--output-tree` or `--output-all` arguments), for large input data, it can cause very high memory consumption, disk swapping, decreased performance and crashes. Consider removing these outputs for large input data, running on a machine with more RAM, or processing data in smaller chunks.
