## Reference tree

Nextclade Web (advanced mode): accepted in "Reference tree" drag & drop box. A remote URL is also accepted in `input-tree` URL parameter.

Nextclade CLI argument: `--input-tree`/`-a`

Accepted formats: Auspice JSON v2 ([description](https://nextstrain.org/docs/bioinformatics/data-formats), [schema](https://github.com/nextstrain/augur/blob/master/augur/data/schema-export-v2.json)) - this is the same format that is used in Nextstrain. It is produced by [augur export](https://docs.nextstrain.org/projects/augur/en/stable/usage/cli/export.html) and consumed by [Nextstrain Auspice](https://docs.nextstrain.org/projects/auspice/en/stable/). Refer to Nextstrain documentation at [https://docs.nextstrain.org](https://docs.nextstrain.org) and in particular the [`augur` documentation](https://docs.nextstrain.org/projects/augur/en/stable/index.html) on how to build your own trees. Using `augur` to make the reference tree is not a strict requirement, however the output tree must follow the `Auspice JSON v2` schema.

The phylogenetic reference tree which serves as a target for phylogenetic placement (see [Algorithm: Phylogenetic placement](../algorithm/05-phylogenetic-placement)). Nearest neighbour information is used to assign clades (see [Algorithm: Clade Assignment](../algorithm/06-clade-assignment)) and to identify private mutations, including reversions.

The tree **must** be rooted at the sample that matches the [reference sequence](../terminology.md#reference-sequence). A workaround in case one does not want to root the tree to be rooted on the reference is to attach the mutational differences between the tree root and the reference on the branch leading to the root node. This can be accomplished by passing the reference sequence to `augur ancestral`'s `--root-sequence` argument (see the [`augur ancestral` docs](https://docs.nextstrain.org/projects/augur/en/stable/usage/cli/ancestral.html#inputs)).

The tree **must** contain a clade definition for every node (including internal): every node must have a value at `node_attrs.clade_membership` (although it can be an empty string).

The tree **should** be sufficiently large and diverse to meet clade assignment expectations of a particular use-case, study or experiment. Only clades present on the reference tree can be assigned to [query sequences](../terminology.html#query-sequence).

> 💡 Nextclade CLI supports file compression and reading from standard input. See section [Compression, stdin](./compression) for more details.
