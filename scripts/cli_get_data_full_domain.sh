#!/usr/bin/env bash

#
# Deduces DATA_FULL_DOMAIN, i.e. root URL of the dataset server depending on current branch and whether the
# version string contains a prerelease suffix.
#

set -euo pipefail
trap "exit" INT

# Directory where this script resides
THIS_DIR="$(
  cd "$(dirname "${BASH_SOURCE[0]}")"
  pwd
)"

: "${1:?Branch name is required as the first argument.}"

version=$(dasel select -p toml -s ".package.version" -f "packages/nextclade-cli/Cargo.toml")
prerel=$("${THIS_DIR}/semver" get prerel "${version}" | cut -d '.' -f 1)
branch="${1}"

DATA_FULL_DOMAIN="https://data.master.clades.nextstrain.org"
if ! [[ "${prerel}" =~ ^(rc|beta|alpha) ]]; then
  if [ "${branch}" == "release-cli" ]; then
    DATA_FULL_DOMAIN="https://data.clades.nextstrain.org"
  elif [ "${branch}" == "staging-cli" ]; then
    DATA_FULL_DOMAIN="https://data.staging.clades.nextstrain.org"
  fi
fi

echo "${DATA_FULL_DOMAIN}"
