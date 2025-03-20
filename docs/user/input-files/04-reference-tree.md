## Reference tree

Nextclade Web (advanced mode): accepted in "Reference tree" drag & drop box. A remote URL is also accepted in `input-tree` URL parameter.

Nextclade CLI argument: `--input-tree`/`-a`

Accepted formats: Auspice JSON v2 ([description](https://nextstrain.org/docs/bioinformatics/data-formats), [schema](https://github.com/nextstrain/augur/blob/master/augur/data/schema-export-v2.json)) - this is the same format that is used in Nextstrain. It is produced by [augur export](https://docs.nextstrain.org/projects/augur/en/stable/usage/cli/export.html) and consumed by [Nextstrain Auspice](https://docs.nextstrain.org/projects/auspice/en/stable/). Refer to Nextstrain documentation at [https://docs.nextstrain.org](https://docs.nextstrain.org) and in particular the [`augur` documentation](https://docs.nextstrain.org/projects/augur/en/stable/index.html) on how to build your own trees. Using `augur` to make the reference tree is not a strict requirement, however the output tree must follow the `Auspice JSON v2` schema.

The phylogenetic reference tree which serves as a target for phylogenetic placement (see [Algorithm: Phylogenetic placement](../algorithm/03-phylogenetic-placement.md)). Nearest neighbor information is used to assign clades (see [Algorithm: Clade Assignment](../algorithm/04-clade-assignment.md)) and to identify private mutations, including reversions.

> 💡 Nextclade CLI supports file compression and reading from standard input. See section [Compression, stdin](./compression) for more details.

### Requirements

1. The tree **should** be rooted at the sample that matches the [reference sequence](02-reference-sequence.md). Otherwise the results of the analysis will be incorrect. It's user's or dataset author's responsibility that this assumption holds. Nextclade can sometimes detect a mismatch in certain cases, but not always. 

   > ⚠️ A workaround in case one does not want the tree to be rooted on the reference is to attach the mutational differences between the tree root and the reference on the branch leading to the root node.
   > This can be accomplished by passing the reference sequence to `augur ancestral`'s `--root-sequence` argument (see the [`augur ancestral` docs](https://docs.nextstrain.org/projects/augur/en/stable/usage/cli/ancestral.html#inputs)).

2. The tree **should** be sufficiently large and diverse to meet clade assignment expectations of a particular use-case, study or experiment. Only clades present on the reference tree can be assigned to [query sequences](01-sequence-data.md).

### Extensions

Auspice JSON trees prepared for usage in Nextclade can contain a set of extensions to the canonical Auspice JSON format. These extensions contain additional information that is used only in Nextclade and allows for more features during the analysis.

#### Clade-like attributes

For organisms with multiple concurrent nomenclatures (clades, lineages, variants etc.), in addition to clades (see [Algorithm: Clade Assignment](../algorithm/04-clade-assignment.md)), dataset authors can choose to add extra clade-like attributes.

The clade-like attributes behave like built-in clades (`.node_attrs.clade_membership` in every node) and are copied from the nearest node along with it.

Each declared attribute will result in a new column in the results table in Nextclade Web and in TSV/CSV output files, as well as a set of corresponding fields in the output JSON/NDJSON and output tree (the newly placed nodes).

Additionally, each of the attributes, unless excluded, participates in [founder node search](../algorithm/05-mutation-calling.md). For each attribute, Nextclade Web will display in the "Relative to" dropdown an additional entry named "'<attribute.displayName>' founder", and a set of columns/fields `founderMuts` will be added to the [outputs](../output-files/04-results-tsv.md).


As a dataset author, in order to add clade-like attributes to your reference tree, modify the reference tree file as follows:

1. Add field `.meta.extensions.nextclade.clade_node_attrs` of array type, and declare the clade-like attributes you want to add.

   Example (for latest examples see [nextstrain/nextclade_data](https://github.com/nextstrain/nextclade_data)):

    ```json
    {
      "meta": {
        "extensions": {
          "nextclade": {
            "clade_node_attrs": [
              {
                "name": "other-clade",
                "displayName": "Other clade",
                "description": "This long text goes into the tooltip. Explain what the clades are, who and where defined them.",
                "hideInWeb": false,
                "skipAsReference": true
              },
              {
                "name": "my-lineage",
                "displayName": "My lineage",
                "description": "This long text goes into the tooltip. Explain what the lineages are, who and where defined them.",
                "hideInWeb": false,
                "skipAsReference": true
              }
            ]
          }
        }
      }
    }
    ```

   Fields:
   - `name` - (required) machine-readable identifier of the attribute. Should match the attribute on the tree nodes. Will be used to name fields/columns in JSON and TSV output files.
   - `displayName` - (optional) human-friendly name of the attribute. Will be shown in Nextclade Web.
   - `description` - (optional) human-friendly description of the attribute. Will be shown in Nextclade Web.
   - `hideInWeb` - (optional) set this to `true` to hide attribute's column from Nextclade Web
   - `skipAsReference` - (optional) - set this to `true` to no use the attribute for calculating clade founder nodes and relative mutations.

2. For each node in the tree, add node attribute with the same name as the `name` field in the attribute's description and with the value corresponding to the value of the clade, lineage etc. of this node:

    ```json
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

#### Relative mutations

Add object under `.meta.extensions.nextclade.ref_nodes`:

```json
{
  "ref_nodes": {
    "default": "__root__",
    "search": [
      {
        "name": "JN.1",
        "displayName": "JN.1 (24A)",
        "description": "Variant recommended for the 2024/2025 COVID-19 vaccine",
        "criteria": [
          {
            "qry": [
              {
                "clade": ["23I", "24A", "24B", "24C", "recombinant"]
              }
            ],
            "node": [
              {
                "name": ["JN.1"]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

Properties:

- `default`: string, optional. Set default search to display in the Nextclade Web dropdown. Should correspond to one of the `search[].name` fields or one of the special values `__root__` for reference sequence (default), `__parent__` for nearest node (private mutations), `__clade_founder__` for founder of the clade.

- `search`: array of objects, optional. Each object describes one search. Each search corresponds to an entry in the "Relative to" dropdown in the web app and a set of CSV/TSV columns `relativeMutations['searchName']`. Note that these names no longer need to correspond to node names.
  - `search[].name`: required unique identifier of the search entry
  - `search[].displayName`, `search.description`: optional friendly name and description to be displayed in the UI (dropdown)
  - `search[].criteria`: array of objects, optional. One or multiple search criteria. Criteria should be described such that during search run only one criterion matches a pair of query and node. If there are multiple matches, then one (unspecified) match is taken and a warning is emitted.
    - `search[].criteria[].qry`: object, optional, describing properties of query samples to select for this search
      - `search[].criteria[].qry.clade`: array of strings, optional. Query names to consider for this search. At least one match is necessary for sample to match.
      - `search[].criteria[].qry.cladeNodeAttrs`: optional mapping from name of the clade-like attr to a list of searched values for this attr. At least one match is necessary for sample to match.
    - `search[].criteria[].node`: object, optional, describing properties of ref node to search, as well as search algorithm. All of the properties should match.
      - `search[].criteria[].node.name`: array of strings, optional. Searched node names. At least one match.
      - `search[].criteria[].node.clade`: array of strings, optional. Searched node clades. At least one match is necessary for node to match.
      - `search[].criteria[].node.cladeNodeAttrs`: optional mapping from name of the clade-like attr to a list of searched values for this attr. At least one match is necessary for node to match.
      - `search[].criteria[].node.searchAlgo`: string, optional. Search algorithm to use
        - `full` (default): simple loop over all nodes until first match is found
        - `ancestor-earliest`: start with the current sample and traverse the graph against edge directions, looking for matching nodes, until it reaches root node. The result is the last encountered matching node.
        - `ancestor-latest`: start with the current sample and traverse the graph against edge directions, looking for matching nodes. The first match is the result.

