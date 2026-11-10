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
   - `displayName` - (required) human-friendly name of the attribute. Will be shown in Nextclade Web.
   - `description` - (optional) human-friendly description of the attribute. Will be shown in Nextclade Web.
   - `hideInWeb` - (optional) set this to `true` to hide attribute's column from Nextclade Web
   - `skipAsReference` - (optional) - set this to `true` to no use the attribute for calculating clade founder nodes and relative mutations.

2. For each node in the tree, add node attribute with the same name as the `name` field in the attribute's description and with the value corresponding to the value of the clade, lineage etc. of this node:

   ```json
   {
     "node_attrs": {
       "clade_membership": { "value": "A1" },
       "other-clade": { "value": "Lambda" },
       "my-lineage": { "value": "A.1.2.3.4" }
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

- `default`: string, optional. The entry pre-selected in the Nextclade Web "Relative to" dropdown. Must be one of the `search[].name` values or a built-in id: `__root__` for the reference sequence (this is the default), `__parent__` for the nearest node (private mutations), or `__clade_founder__` for the founder of the clade. Any other value is ignored and falls back to `__root__`. Note that the attribute founder entries (`__founder_of_<attribute>__`) cannot be used here.

- `search`: array of objects, optional. Each object describes one search. Each search corresponds to an entry in the "Relative to" dropdown in the web app and a set of CSV/TSV columns `relativeMutations['<displayName>'].*`, or `relativeMutations['<name>'].*` when the search has no `displayName`. The search in the example above produces the columns `relativeMutations['JN.1 (24A)'].*`.
  - `search[].name`: required unique identifier of the search entry, used in `default` and `order.entries`. Free text: it does not need to match a node name
  - `search[].displayName`, `search[].description`: optional friendly name and description to be displayed in the UI (dropdown). The `displayName` is also the key of the CSV/TSV columns
  - `search[].criteria`: array of objects, optional. One or multiple search criteria. Criteria should be described such that during search run only one criterion matches a pair of query and node. If there are multiple matches, then one (unspecified) match is taken and a warning is emitted.
    - `search[].criteria[].qry`: array of objects, optional. Each object describes which query samples this search applies to (matched against the sample's placement node on the reference tree). Leave empty to apply to every sample. Only `clade` and `cladeNodeAttrs` are used for query matching; `name` is not considered here.
      - `search[].criteria[].qry[].clade`: array of strings, optional. Query clades to consider for this search. At least one match is necessary for sample to match.
      - `search[].criteria[].qry[].cladeNodeAttrs`: optional mapping from name of the clade-like attr to a list of searched values for this attr. At least one match is necessary for sample to match.
    - `search[].criteria[].node`: array of objects, optional. Each object describes properties of ref node to search, as well as search algorithm. All of the properties should match.
      - `search[].criteria[].node[].name`: array of strings, optional. Searched node names. At least one match.
      - `search[].criteria[].node[].clade`: array of strings, optional. Searched node clades. At least one match is necessary for node to match.
      - `search[].criteria[].node[].cladeNodeAttrs`: optional mapping from name of the clade-like attr to a list of searched values for this attr. At least one match is necessary for node to match.
      - `search[].criteria[].node[].searchAlgo`: string, optional. Search algorithm to use
        - `full` (default): simple loop over all nodes until first match is found
        - `ancestor-earliest`: start with the current sample and traverse the graph against edge directions, looking for matching nodes, until it reaches root node. The result is the last encountered matching node.
        - `ancestor-nearest`: start with the current sample and traverse the graph against edge directions, looking for matching nodes. The first match is the result.

- `builtins`: object, optional. Overrides the label and tooltip of the three built-in dropdown entries. This is a display-only change: it does not affect alignment, mutation calling, or which nodes are used. Keys are the built-in ids; each value is an object with optional `displayName` (dropdown label) and `description` (tooltip). Omit a key, or either sub-field, to keep the default.
  - `__root__`: the reference sequence. Defaults: `displayName` "Reference", `description` "Reference sequence".
  - `__parent__`: the nearest node on the reference tree. Defaults: `displayName` "Parent", `description` "Nearest node on reference tree".
  - `__clade_founder__`: the founder of the clade. Defaults: `displayName` "Clade founder", `description` "Earliest ancestor node with the same clade on reference tree".

  A common use is relabeling `__root__` when the reference sequence is an inferred ancestor rather than a named strain:

  ```json
  {
    "ref_nodes": {
      "builtins": {
        "__root__": {
          "displayName": "Static Inferred Ancestor",
          "description": "Precomputed ancestral sequence (static)"
        }
      }
    }
  }
  ```

- `order`: object, optional. Sets the order of entries in the Nextclade Web "Relative to" dropdown, and optionally hides some of them. This is a display setting for the web app only: it does not change alignment, mutation calling, the CSV/TSV/JSON outputs, or the command-line tool. Omit `order` to keep the default order. To remove an entry from the outputs and computation entirely (not just the dropdown), use `skipAsReference` on a clade-like attribute, or leave a custom node out of `search`; see below.
  - `order.entries`: array of strings, optional. Entry ids in the order you want them shown, top to bottom. Each id is a built-in (`__root__`, `__parent__`, `__clade_founder__`), a `search` entry's `name`, or the group token `__attr_founders__`.
  - `order.others`: string, optional, one of `keep` (default) or `hide`. What to do with entries you did not list in `entries`: `keep` appends them after the listed ones in the default order; `hide` removes them from the dropdown (so `entries` becomes a whitelist).

  The group token `__attr_founders__` stands for all attribute founder entries (one per clade-like attribute; see [clade-like attributes](#clade-like-attributes) above). It expands in place to those entries, in their natural order. Attribute founders can be positioned only through this token: an individual `__founder_of_<attribute>__` id written in `entries` is ignored, as is any id that does not name an existing entry. Each entry appears at most once.

  If `others` is `hide` and it removes the entry that `default` points at, the dropdown preselects the reference sequence (or, if that too is hidden, the first remaining entry). `default` still controls which entry is preselected, not its position.

  Show a custom entry first, then the reference; keep the rest in the default order:

  ```json
  {
    "ref_nodes": {
      "order": {
        "entries": ["Fermon"]
      }
    }
  }
  ```

  Show only the custom entry and the reference, hiding everything else, including the attribute founders:

  ```json
  {
    "ref_nodes": {
      "order": {
        "entries": ["Fermon", "__root__"],
        "others": "hide"
      }
    }
  }
  ```

  Full explicit layout using the group token, keeping the attribute founders visible:

  ```json
  {
    "ref_nodes": {
      "order": {
        "entries": ["Fermon", "__root__", "__attr_founders__"],
        "others": "hide"
      }
    }
  }
  ```
