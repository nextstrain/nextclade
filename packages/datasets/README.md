<h1 id="developers-guide-cli" align="center">
💾 Dataset curation
</h1>

These are the tools for curating public Nextclade datasets.


> ⚠️ Note that the data is shared among all users of Nextclade, including CLI and Web users. Data corruption or incorrect format or content of JSON files will break Nextclade for everyone on the planet.



<h2 id="dataset-curators-guide" align="center">
🧑💾 Dataset curator's guide
</h2>


 1. Set the required environment variables. You can find them on AWS in S3 and Cloudfront settings, or you can ask a person who has this access.

    The easiest is to create `.env` file in the project root, to paste this:
    
    ```
    DATA_AWS_CLOUDFRONT_DISTRIBUTION_ID=
    DATA_FULL_DOMAIN=
    DATA_AWS_S3_BUCKET=
    DATA_AWS_DEFAULT_REGION=
    ```
    
    and to fill the values. See also `.env.example`

    > ⚠️ Do not commit these values to source control


 2. Obtain AWS credentials for the data bucket. It is preferred to use credentials with minimal permissions.

    > ⚠️ Do not commit credentials or any other sensitive information to version control!
   
    > 💡 Various credential managers and password vaults can be used to store multiple sets of credentials and to conveniently switch between them. One example is [aws-vault](https://github.com/99designs/aws-vault).


 3. Download existing data:

    ```bash
    ./scripts/download
    ```

 4. Study, add, modify or remove data.

    The `data_local/` directory will appear in project root (or will be updated if already exist), containing something like this:

    ```
    data_local
    ├── _generated
    │   └── datasets.json
    ├── flu_h1n1pdm_ha
    │   ├── dataset.json
    │   └── versions
    │       ├── 2021-06-20T00:00:00Z
    │       │   └── files
    │       │       ├── genemap.gff
    │       │       ├── primers.csv
    │       │       ├── qc.json
    │       │       ├── reference.fasta
    │       │       ├── sequences.fasta
    │       │       └── tree.json
    │       └── 2021-06-25T00:00:00Z
    │           └── files
    │               ├── genemap.gff
    │               ├── primers.csv
    │               ├── qc.json
    │               ├── reference.fasta
    │               ├── sequences.fasta
    │               └── tree.json
    ├── sars-cov-2
    │   ├── dataset.json
    │   └── versions
    │       ├── 2021-06-20T00:00:00Z
    │       │   └── files
    │       │       ├── genemap.gff
    │       │       ├── primers.csv
    │       │       ├── qc.json
    │       │       ├── reference.fasta
    │       │       ├── sequences.fasta
    │       │       └── tree.json
    │       └── 2021-06-25T00:00:00Z
    │           └── files
    │               ├── genemap.gff
    │               ├── primers.csv
    │               ├── qc.json
    │               ├── reference.fasta
    │               ├── sequences.fasta
    │               └── tree.json
    └── settings.json
    ```

    Each directory contains a dataset - typically one virus. Each dataset is described by `dataset.json`.  Global settings are in `settings.json`. The directory `_generated` is generated automatically and should never be modified.

    ##### Adding new dataset
     - Add a directory under `data_local/`
     - Add `dataset.json` file. Use existing files as a reference.
     - Add a version entries into the list of `versions` in `dataset.json`. Use existing entries as a reference. Don't forget to adjust the `comment` and `datetime` fields. If there are breaking changes, adjust `compatibility` fields accordingly.
     - Add subdirectory for a specific version of the dataset. The directory name should match a `datetime` string of one of the `versions` in `dataset.json`.
     - Add files under `files/` in this subdirectory. File list should match the `files` entry in the corresponding version in `dataset.json`.
    
    ##### Adding a version of the dataset
     - Add subdirectory for a specific version of the dataset. The directory name should match a `datetime` string of one of the `versions` in `dataset.json`.
     - Add files under `files/` in this subdirectory. File list should match the `files` entry in the corresponding version in `dataset.json`.

    ##### Removing a version
     - Remove the corresponding version entry from `dataset.json` corresponding to this dataset. These scripts do not allow to actually remove the files from S3 bucket, to avoid accidental data loss. We might clean up the bucket periodically.

    ##### Removing a dataset
     - Remove `dataset.json` corresponding to this dataset. These scripts do not allow to actually remove the files from S3 bucket, to avoid accidental data loss. We might clean up the bucket periodically.


 4. Re-generate index files

    ```bash
    ./scripts/index
    ```

 5. Upload the new data to S3 and reset AWS Cloudfront cache:

    ```bash
    ./scripts/upload
    ```

    > ⚠️ This script will NOT delete all files from S3 bucket that don't exist in `data_local/`. Make a backup if they are still needed.


 6. Verify that the `dataset.json` was uploaded correctly and the new version is served through Cloudfront in your edge location:

    ```bash
    ./scripts/verify
    ```

    It may take up to 15 minutes for Cloudfront cache to propagate to all edge locations, but if the verification fails after 15 minutes, something went wrong. 

 7. You did a great job! Take a break, come back in a few weeks, and add/update another dataset. Start from step (3).



<h2 id="test-datasets-locally" align="center">
🧪💾 Test datasets locally
</h2>

In order to serve the local datasets, run

```bash
make serve-data
```

from the project root. The server then can be reached by default from 

```
http://localhost:27722
```

(the port number is controled by `DATA_LOCAL_PORT` environmnemt variable)


In oder for the application to use the local data, set environmnemt variable

```
DATA_FULL_DOMAIN=http://localhost:27722
```

(adjust port number for `DATA_LOCAL_PORT` if changed)

Rebuild the application and it will use the local datasets instead of the ones on AWS.
