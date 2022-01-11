#!/usr/bin/env bash
set -euo pipefail
trap "exit" INT

export CSV_VALIDATOR_VERSION="1.1.5"
export URL="https://github.com/digital-preservation/csv-validator/releases/download/${CSV_VALIDATOR_VERSION}/csv-validator-cmd-${CSV_VALIDATOR_VERSION}-application.zip"

curl -fsSL "${URL}" -o "csv-validator.zip"
unzip "csv-validator.zip"
cp -rv "csv-validator-cmd-${CSV_VALIDATOR_VERSION}/bin/validate" "/usr/bin/csv-validator"
cp -rv "csv-validator-cmd-${CSV_VALIDATOR_VERSION}/lib" "/usr/"
rm -rf /tmp/csv-validator*
