# Phylogenetic tree

Nextclade Web: download `nextclade.auspice.json` or `nextclade.nwk`

Nextclade CLI flags: `--output-tree`/`-T` or `--output-tree-nwk`

Output phylogenetic tree. This is the input [reference tree](../input-files/04-reference-tree.md), with [query sequences](../input-files/01-sequence-data.md) placed onto it during the [phylogenetic placement step](../algorithm/05-phylogenetic-placement).

The tree comes either in Auspice JSON v2 format or in Newick format.

Auspice JSON v2 format ([description](https://nextstrain.org/docs/bioinformatics/data-formats), [schema](https://github.com/nextstrain/augur/blob/master/augur/data/schema-export-v2.json)) is the same format that is used by Nextstrain Augur and Auspice packages as well as on [nextstrain.org](https://nextstrain.org). And the same as used for the input [reference tree](../input-files/04-reference-tree.md) in Nextclade. This tree file can be visualized online in [auspice.us](https://auspice.us) or in a local instance of [Nextstrain Auspice](https://docs.nextstrain.org/projects/auspice/en/stable/index.html).

To allow for compatibility with other software, Nextclade can output the tree in Newick format. This is a text-based format for representing phylogenetic trees as nested sets. It is widely used in bioinformatics, but contains only very basic information. It can be viewed online for example on [icytree.org](https://icytree.org) or [auspice.us](https://auspice.us).


> ⚠️ Note that if alignment or analysis of an individual sequence fails, it cannot participate in phylogenetic placement and is omitted from the output tree. See [Errors and warnings](./errors-and-warnings.md) section for more details.

> ⚠️ For CLI users: Note that due to technical limitations of the JSON format, it cannot be streamed entry-by entry, i.e. before writing the output to the file, all entries need to be accumulated in memory. If the tree output is requested (through `--output-tree` or `--output-all` arguments), for large input data, it can cause very high memory consumption, disk swapping, decreased performance and crashes. Consider removing this output for large input data, running on a machine with more RAM, or processing data in smaller chunks.

> ⚠️ Note, all positions are in alignment coordinates and after all the insertions stripped.
