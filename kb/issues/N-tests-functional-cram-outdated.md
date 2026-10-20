# Functional CLI tests record Nextclade 2 output

## Problem

The cram tests in `tests/functional/` compare CLI output with recorded output from Nextclade 2. For example, `tests/functional/nextclade_run_args.t` expects the error "the following arguments are required: --input-ref --input-tree --input-gene-map --input-qc-config ...". Nextclade 3 reports "When `--input-dataset` is not specified, --input-ref is required" (`packages/nextclade-cli/src/dataset/dataset_download.rs`) and rejects `--input-gene-map` as renamed. No CI workflow runs these tests (cram is only installed in `docker/docker-dev.dockerfile`), so the drift is not detected.

## Fix options (not decided)

- Re-record the tests against Nextclade 3 and run them in CI
- Delete them, if the smoke and integration tests cover the CLI argument handling
