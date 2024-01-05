### URL parameters

Nextclade Web can be configured using URL parameters. The names of the parameters match or are similar to the corresponding arguments of [Nextclade CLI](../nextclade-cli).

These URL parameters allow to construct URLs for navigation to Nextclade Web already preconfigured with certain dataset and to feed input sequence data and other files from remote locations. This might be useful for testing new datasets as well as for third-party integrations.

This section assumes basic knowledge about how Nextclade Web works as well as about input files and datasets. You can learn more about input files and datasets in the dedicated sections: [Input files](../input-files), and [Nextclade datasets](../datasets).

All URL parameters are optional. If all parameters are omitted, Nextclade Web behaves normally. Adding a parameter configures certain aspect of the application:

| URL parameter       | Meaning                                                                                                                                                                         |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| input-fasta         | URL to a fasta file containing query sequences. If provided, the analysis will start automatically. Special value `example` will use example sequences provided in the dataset. |
| input-ref           | URL to a fasta file containing reference (root) sequence.                                                                                                                       |
| input-annotation    | URL to a GFF3 file containing genome annotation.                                                                                                                                |
| input-tree          | URL to a Auspice JSON v2 file containing reference tree.                                                                                                                        |
| input-pathogen-json | URL to a JSON file containing pathogen description and parameters                                                                                                               |
| dataset-name        | Safe name of the dataset to use. Examples: `sars-cov-2`, `flu_h3n2_ha`                                                                                                          |
| dataset-tag         | Version tag of the dataset to use.                                                                                                                                              |
| dataset-server      | URL to the custom dataset server (to the path where `index.json` file is, without filename).                                                                                    |
| dataset-url         | URL to a single dataset directory (to the path where `pathogen.json` and other files are, without filenames).                                                                   |

If an `input-fasta` URL parameter is provided, Nextclade Web automatically starts the analysis after all input and dataset files are downloaded.

For example, the file with input sequences hosted at `https://example.com/sequences.fasta` can be specified with:

```url
https://clades.nextstrain.org?dataset-name=sars-cov-2
    &input-fasta=https://example.com/sequences.fasta
```

(the newlines and the indentation are added here for readability, they should not be present in the URL)

In this case, Nextclade will download the latest SARS-CoV-2 dataset and the provided `fasta` file, and will automatically start the analysis. Real example:

> [https://clades.nextstrain.org?dataset-name=sars-cov-2&input-fasta=https://data.clades.nextstrain.org/datasets/sars-cov-2/references/MN908947/versions/2022-01-05T19:54:31Z/files/sequences.fasta](https://clades.nextstrain.org?dataset-name=sars-cov-2&input-fasta=https://data.clades.nextstrain.org/datasets/sars-cov-2/references/MN908947/versions/2022-01-05T19:54:31Z/files/sequences.fasta)

The special value `&input-fasta=example` will instruct Nextclade to use the example sequences of the dataset (this option is useful for demonstration purposes as users will not need to click anything):

```url
https://clades.nextstrain.org?dataset-name=sars-cov-2&input-fasta=example
```

Multiple files can be specified, for example the sequences and the reference tree:

```url
https://clades.nextstrain.org
    ?dataset-name=sars-cov-2
    &input-fasta=https://example.com/sequences.fasta
    &input-tree=https://example.com/tree.json
```

Another dataset can be specified with `dataset-name`:

```url
https://clades.nextstrain.org
    ?dataset-name=flu_h3n2_ha
    &input-fasta=https://example.com/flu_sequences.fasta
```

A custom dataset server can be specified using `dataset-server` param. In this case the dataset list (index) will be downloaded from this server instead of the default. Example:

```url
https://clades.nextstrain.org?dataset-server=http://example.com
```

Local URLs should also work:

```url
https://clades.nextstrain.org?dataset-server=http://localhost:8080
```

All mentioned parameters accept the usual full HTTP URLs

```url
https://clades.nextstrain.org?dataset-url=http://example.com/path/to/dataset
```

as well as URLs to GitHub repos:

```txt
?dataset-url=https://github.com/owner/repo
?dataset-url=https://github.com/owner/repo/tree/branch
?dataset-url=https://github.com/owner/repo/blob/branch/path/to/file
```

as well as shortcuts to GitHub repos in the following format:

```txt
?dataset-url=gh:owner/repo
?dataset-url=gh:owner/repo/path/to/file
?dataset-url=gh:owner/repo@branch@
?dataset-url=gh:owner/repo@branch@/path/to/file
```

For GitHub shortcuts, if a branch name is not specified, the default branch name is queried from GitHub REST API (subject to rate limits).

> 💡 Nextclade is a client-side-only, single-page web application, hosted on a static file server based on AWS S3 and AWS Cloudfront. We do not set any usage limits (for example, for the number of hits, or number of analyses triggered), other than what AWS S3 and Cloudfront imposes for fetching HTML, CSS and JS files of the web app.

> ⚠️ The linked resources should be available for fetching by a web browser on the client machine. Make sure [Cross-Origin Resource Sharing (CORS)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) is enabled on your file server as well as that all required authentication (if any) is included into the file URL itself.

> ⚠️ The resulting URLs might get quite complex, so don't forget to [encode the special characters](https://en.wikipedia.org/wiki/Percent-encoding), to keep the URLs valid.

> ⚠️️ Note that Nextclade does not have a programmatic server component and all the computation happens on the end-user machine in a WebAssembly module. There are currently no plans to provide an official REST API or similar services.
