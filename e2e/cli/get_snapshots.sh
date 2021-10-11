#!/usr/bin/env bash

BASH_DEBUG="${BASH_DEBUG:=}"
([ "${BASH_DEBUG}" == "true" ] || [ "${BASH_DEBUG}" == "1" ]) && set -o xtrace
set -o errexit
set -o nounset
set -o pipefail
shopt -s dotglob
trap "exit" INT

THIS_DIR=$(
  cd $(dirname "${BASH_SOURCE[0]}")
  pwd
)

mkdir -p "${THIS_DIR}/snapshots/"

pushd "${THIS_DIR}/" >/dev/null
tar xfJ "${THIS_DIR}/archive/snapshots.tar.xz"
popd >/dev/null
