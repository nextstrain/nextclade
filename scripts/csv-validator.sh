#!/usr/bin/env bash
#
# Runs csv-validator
#
# See:
#  - https://digital-preservation.github.io/csv-validator/
#  - https://github.com/digital-preservation/csv-validator
#
# It is written in Scala and requires Java to run.
# The default distribution comes with an executable `validate`, which is
# a bit too generic. This script expects `csv-validator`
# instead. Rename `bin/validate` to `bin/csv-validator` after install.
#
set -euo pipefail
trap "exit" INT

# Directory where this script resides
THIS_DIR=$(
  cd $(dirname "${BASH_SOURCE[0]}")
  pwd
)

# Where the source code is
PROJECT_ROOT_DIR="$(realpath --logical --no-symlinks ${THIS_DIR}/..)"

TSV_SCHEMA_PATH="packages/schemas/nextclade_tsv.csvs"
CSV_SCHEMA_PATH="tmp/nextclade_csv.csvs"

REPORT_OUTPUT_DIR=".reports/csv-validator"

pushd "${PROJECT_ROOT_DIR}" >/dev/null

if command -v "csv-validator" &>/dev/null; then
  mkdir -p "${REPORT_OUTPUT_DIR}"

  csv-validator \
    "tmp/nextclade.tsv" \
    "${TSV_SCHEMA_PATH}" 2>&1 |
    grep -v "PASS" || [[ $? == 1 ]] |
    tee "${REPORT_OUTPUT_DIR}/nextclade.tsv.txt"

  # Convert TSV schema to CSV schema by replacing the delimiter. Save to tmp directory.
  sed "s/@separator TAB/@separator ';'/g" "${TSV_SCHEMA_PATH}" >"${CSV_SCHEMA_PATH}"

  csv-validator \
    "tmp/nextclade.csv" \
    "${CSV_SCHEMA_PATH}" 2>&1 |
    grep -v "PASS" || [[ $? == 1 ]] |
    tee "${REPORT_OUTPUT_DIR}/nextclade.csv.txt"
else
  echo "'csv-validator' not found. Skipping CSV/TSV validation."
fi

popd >/dev/null
