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

PROJECT_ROOT_DIR="$(realpath ${THIS_DIR}/../..)"

mkdir -p "${THIS_DIR}/archive/" "${THIS_DIR}/snapshots/"

cp -r ${PROJECT_ROOT_DIR}/tmp/* ${THIS_DIR}/snapshots/

pushd "${THIS_DIR}/" >/dev/null
tar -cJf "${THIS_DIR}/archive/snapshots.tar.xz" "snapshots/"
popd >/dev/null
