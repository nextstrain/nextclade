## Reference tree

Nextclade Web (advanced mode): accepted in "Reference tree" drag & drop box. A remote URL is also accepted in `input-tree` URL parameter.

Nextclade CLI argument: `--input-tree`/`-a`

Accepted formats: Auspice JSON v2 ([description](https://nextstrain.org/docs/bioinformatics/data-formats), [schema](https://github.com/nextstrain/augur/blob/master/augur/data/schema-export-v2.json)) - this is the same format that is used in Nextstrain. It is produced by [augur export](https://docs.nextstrain.org/projects/augur/en/stable/usage/cli/export.html) and consumed by [Nextstrain Auspice](https://docs.nextstrain.org/projects/auspice/en/stable/). Refer to Nextstrain documentation at [https://docs.nextstrain.org](https://docs.nextstrain.org) and in particular the [`augur` documentation](https://docs.nextstrain.org/projects/augur/en/stable/index.html) on how to build your own trees. Using `augur` to make the reference tree is not a strict requirement, however the output tree must follow the `Auspice JSON v2` schema.

The phylogenetic reference tree which serves as a target for phylogenetic placement (see [Algorithm: Phylogenetic placement](../algorithm/05-phylogenetic-placement)). Nearest neighbor information is used to assign clades (see [Algorithm: Clade Assignment](../algorithm/06-clade-assignment)) and to identify private mutations, including reversions.

The tree **must** be rooted at the sample that matches the [reference sequence](../terminology.md#reference-sequence). A workaround in case one does not want to root the tree to be rooted on the reference is to attach the mutational differences between the tree root and the reference on the branch leading to the root node. This can be accomplished by passing the reference sequence to `augur ancestral`'s `--root-sequence` argument (see the [`augur ancestral` docs](https://docs.nextstrain.org/projects/augur/en/stable/usage/cli/ancestral.html#inputs)).

The tree **must** contain a clade definition for every node (including internal): every node must have a value at `node_attrs.clade_membership` (although it can be an empty string).

The tree **should** be sufficiently large and diverse to meet clade assignment expectations of a particular use-case, study or experiment. Only clades present on the reference tree can be assigned to [query sequences](../terminology.html#query-sequence).

> 💡 Nextclade CLI supports file compression and reading from standard input. See section [Compression, stdin](./compression) for more details.

### Extensions

Auspice JSON trees prepared for usage in Nextclade can contain a set of extensions to the canonical Auspice JSON format. These extensions contain additional information that is used only in Nextclade and allows for more features during the analysis.

#### Clade-like attributes

For organisms with multiple concurrent nomenclatures (clades, lineages, variants etc.), in addition to clades (see [Algorithm: Clade Assignment](../algorithm/06-clade-assignment)), dataset authors can choose to add extra clade-like attributes.

The clade-like attributes behave like built-in clades and are copied from the nearest node along with them.

Each declared attribute will result in a new column in the results table in Nextclade Web and in TSV/CSV output files, as well as a set of corresponding fields in the output JSON/NDJSON and output tree (the newly placed nodes).

As a dataset author, in order to add clade-like attributes to your reference tree, modify the reference tree file as follows:

1. Add field `.meta.extensions.nextclade.clade_node_attrs` of array type, and declare the clade-like attributes you want to add in this format:

    ```json5
    {
      "meta": {
        "extensions": {
          "nextclade": {
            "clade_node_attrs": [
              {
                "name": "other-clade",
                "displayName": "Other clade",
                "description": "This long text goes into the tooltip. Explain what the clades are, who and where defined them.",
                "hideInWeb": false
              },
              {
                "name": "my-lineage",
                "displayName": "My lineage",
                "description": "This long text goes into the tooltip. Explain what the lineages are, who and where defined them.",
                "hideInWeb": false
              }
            ]
          }
        }
      }
    }
    ```

2. For each node in the tree, add node attribute with the same name as the `name` field in the attribute's description and with the value corresponding to the value of the clade, lineage etc. of this node:

    ```json5
    // inside each node
    {
      "node_attrs": {
        "clade_membership": {"value": "A1"},
        "other-clade": {"value": "Lambda"},
        "my-lineage": {"value": "A.1.2.3.4"}
      }
    }
    ```
    
    Note that `clade_membership` attribute is treated separately (if present) and it does not need to be declared in `clade_node_attrs`.

3. Now when running Nextclade with this tree, you will notice additional columns in the outputs. Each entry in a column for a clade-like attribute corresponds to a clade value assigned to the query sequence.


For concrete examples of using clade-like attributes, check out official SARS-CoV-2 datasets: they assign Nextstrain clades, Pango lineages and WHO VOC/VOIs simultaneously.
