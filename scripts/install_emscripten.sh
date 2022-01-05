#!/usr/bin/env bash

set -euxo pipefail
shopt -s dotglob
trap "exit" INT

THIS_SCRIPT="$(basename "${0}")"

: "${1:?"Error: installation directory is required as 1st argument. Pass the path where you want Emscripten SDK to be installed, for example \`./${THIS_SCRIPT} ~/opt/emsdk\`"}"
: "${2:?"Error: version is required as 2nd argument: pass 'latest' if you don't care."}"

export EMSDK_DIR="${1}"
export EMSDK_VERSION="${2}"

URL="https://github.com/emscripten-core/emsdk"
BRANCH="main"

if [ ! -d "${EMSDK_DIR}" ]; then
  git clone --recursive --depth 1 -b "${BRANCH}" "${URL}" "${EMSDK_DIR}"
else
  pushd "${EMSDK_DIR}" >/dev/null
    git pull
  popd >/dev/null
fi

pushd "${EMSDK_DIR}" >/dev/null

  ./emsdk update-tags
  ./emsdk install "${EMSDK_VERSION}"
  ./emsdk activate "${EMSDK_VERSION}"
  source ./emsdk_env.sh

popd >/dev/null
