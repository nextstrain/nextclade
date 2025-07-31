# Nextclade schemas

This directory contains [JSON Schema](https://json-schema.org/) definitions for some of the Nextclade file types in the current branch or tag (version) of the project. Schema files are presented in both JSON and YAML formats - the contents is equivalent.

> ⚠️ ALL FORMATS ARE UNSTABLE
>
> As stated in the documentation, all described JSON formats are unstable: breaking changes can occur even in minor and patch releases. Currently, all JSON data is just an immediate snapshot of internal Rust structs via `serde` and `serde_json` crates. The strict can change during development, and this will cause the change in JSON data and in these schemas.
>
> The provided JSON schemas allow to make parsing and usage of Nextclade files in downstream applications safer and to reduce work of bringing apps back into shape after breaking changes occur, but schemas themselves cannot prevent breakage not they come with any guarantees.
>
> While we could introduce more stable, rich formats, this would require significant effort in designing and maintaining the stability and versioning, as well as deep understanding of what the requirements of the numerous downstream applications are. If you have ideas or want to help to drive this process, please open a GitHub issue.

> If you are looking for a more stable and simple format, please consider TSV outputs (`--output-tsv`)

## Versioning

Note that definitions on GitHub correspond to the current commit in the Nextclade source code. As project changes, the type definitions can also change and not necessarily reflect the format used in the particular version of Nextclade you are using.

## Generating schema files

In order to generate definitions for the version of nextclade you are currently using, you can run

```bash
nextclade -- schema write -o "<output_dir>"
```

Read `--help` for more options:

```bash
nextclade -- schema write --help
```

## Using schema files

Once schemas are obtained, Typically you can either use it for:

- validation: take a file (from disk) or a data structure (in-memory, from network, database etc.) and check that it is formatted correctly
- code generation: generate code in your favourite programmign language, to read and write this file format in a type-safe way

Both use-cases can be handy in downstream applications, because, as stated above, the described formats are unstable. For example, after formats undergo breaking changes, if your programming language is typed, the automatically generated classes, structs or interfaces will change and your compiler will tell you how to fix your code. Same for untyped languages with validation, but it will happen on runtime.

## Example: Python

This is a simple example which demonstrates how to use Nextclade JSON schemas to generate Python dataclasses and how to use them to read Nextclade JSON files in a type-safe way. Note that Python language is duck typed, so it's probably not the best choice if you want to build something type-safe. We demonstrate with Python here only because its omnipresence in bioinformatics.

First you need to obtain JSON schema definitions. Depending on your needs and tools you use you could:

- run `nextclade schemas write -o nextclade-schemas/`
- download files from GitHub manually or using `curl` (optionally, you could navigate to a git tag matching a particular version of Nextclade, rather than downloading latest dev version)
- fetch schemas dynamically in your code

Let's assume you've downloaded the existing schema files in yaml format from GitHub and placed them to `nextclade-schemas/` directory.

Once you have schema files, you can use `datamodel-code-generator` to generate corresponding Python classes and use them in your programs:

```bash
cd nextclade-schemas/

pip3 install dacite datamodel-code-generator pydantic

mkdir -p examples/python/lib/

# Generate Python classes
datamodel-codegen --input-file-type "jsonschema" --output-model-type "dataclasses.dataclass" --enum-field-as-literal=all --input "output-json.schema.yaml" --output "examples/python/lib/nextclade_output_json.py"

datamodel-codegen --input-file-type "jsonschema" --output-model-type "dataclasses.dataclass" --enum-field-as-literal=all --input "input-pathogen-json.schema.yaml" --output "examples/python/lib/nextclade_input_pathogen_json.py"

cd examples python/

# Run the output JSON example which is using the generated Python classes.
# See packages/nextclade-schemas/examples/python/example_output_json.py
python3 examples/python/example_output_json.py $path_to_your_output_nextclade_json

# Run the input pathogen JSON example which is using the generated Python classes.
# See packages/nextclade-schemas/examples/python/example_pathogen_json.py
python3 examples/python/example_pathogen_json.py $path_to_your_pathogen_json
```

In this example the generated file `nextclade_output_json.py` will contain the Python dataclasses derived from `output-json.schema.yaml`. The example program in `examples/python/example.py` reads the Nextclade output JSON file (produced separately with `nextclade run --output-json ...`) and casts the resulting dict to the generated dataclasses (recursively) types using `dacite` library. You can then access to the data in a convenient and type-safe manner, and most text editors should also provide code completions. This approach with dataclasses can be somewhat slow for big inputs, because it requires converting Python dicts into dataclasses. You might find another, better solution which fits your use-case better - there are many tools which can understand JSON schema.

## Other languages and tools

JSON Schema is a popular type definition format, so most programming languages have tools and libraries to work with it. Feel free explore some of the libraries in your favourite language! There are also multi-language tools and even online generators like [Qucktype](https://quicktype.io/). Quicktype also has a Node.js CLI:

```bash
npx -y quicktype --src-lang schema --src "Nextclade.schema.json" --lang python --python-version 3.7 --just-types --top-level "_NextcladeSchemaRoot" --out "python/Nextclade.py"
```

> ⚠️ Note the due to a number of existing programming languages, large variety of tools, as well as differences in the code they may generate, the dev team cannot guarantee correctness of the generated code, and neither cannot provide technical support for any of the third-party tools.
>
> Think of the provided JSON Schema definitions as a helper utility and a machine-readable documentation for the file formats. It is a starting point rather than a complete solution. Depending on the language, quality of your code generator and your goals, you might need to experiment a little to make things work.
>
> That being said, if you want to suggest an improvement to how the JSON Schemas themselves are generated, feel free to open a GitHub issue.

## Maintenance

The schemas mirror Rust structs via `schemars` crate.

Files are automatically generated from Rust types using [`/packages/nextclade-cli/src/build.rs`](../nextclade-cli/src/build.rs) build script (See: [Cargo build script docs](https://doc.rust-lang.org/cargo/reference/build-scripts.html)), which runs every time Nextclade CLI is built.

If you are changing any structs, make sure you re-build Nextclade CLI and git-commit the modified schema files.
