#!/usr/bin/env bash
#
# Runs csvlint
# See: https://github.com/Clever/csvlint
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

REPORT_OUTPUT_DIR=".reports/csvlint"

pushd "${PROJECT_ROOT_DIR}" >/dev/null

if command -v "csvlint" &>/dev/null; then
  mkdir -p "${REPORT_OUTPUT_DIR}"

  csvlint -delimiter '\t' "tmp/nextclade.tsv" 2>&1 |
    grep -vE "(Warning: not using defaults, may not validate CSV to RFC 4180|file is valid)" || [[ $? == 1 ]] |
    tee "${REPORT_OUTPUT_DIR}/nextclade.tsv.txt"

  csvlint -delimiter ';' "tmp/nextclade.csv" 2>&1 |
    grep -vE "(Warning: not using defaults, may not validate CSV to RFC 4180|file is valid)" || [[ $? == 1 ]] |
    tee "${REPORT_OUTPUT_DIR}/nextclade.csv.txt"
else
  echo "'csvlint' not found. Skipping CSV/TSV linting."
fi

popd >/dev/null
