#!/usr/bin/env bash
set -euo pipefail
trap "exit" INT

export CSVLINT_VERSION="0.3.0"
export URL="https://github.com/Clever/csvlint/releases/download/v${CSVLINT_VERSION}/csvlint-v${CSVLINT_VERSION}-linux-amd64.tar.gz"

curl -fsSL "${URL}" | tar -xz -C /tmp
mv "/tmp/csvlint-v${CSVLINT_VERSION}-linux-amd64/csvlint" "/usr/bin/csvlint"
rm -rf "/tmp/csvlint*"
