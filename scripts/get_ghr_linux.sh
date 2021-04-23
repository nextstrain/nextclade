#!/usr/bin/env bash

BASH_DEBUG="${BASH_DEBUG:=}"
[[ "${BASH_DEBUG}" == "true" ]] && set -o xtrace
set -o errexit
set -o nounset
set -o pipefail
shopt -s dotglob
trap "exit" INT

# Download ghr: https://github.com/tcnksm/ghr
export GHR_VERSION=${GHR_VERSION:=0.13.0}
curl -fsSL "https://github.com/tcnksm/ghr/releases/download/v${GHR_VERSION}/ghr_v${GHR_VERSION}_linux_amd64.tar.gz" \
  | tar -xz --directory="$(pwd)" --strip-components=1 "ghr_v${GHR_VERSION}_linux_amd64/ghr"
