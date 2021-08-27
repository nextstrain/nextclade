#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail
trap "exit" INT

THIS_SCRIPT="$(basename ${0})"

: "${1:?"Error: Pass the path where you want Emscripten SDK to be installed, for example \`./${THIS_SCRIPT} ~/opt/emsdk\`"}"

NAME="emscripten"
EMSDK_DIR="${1}"
EMSDK_VERSION="${2:-latest}"

URL="https://github.com/emscripten-core/emsdk"
BRANCH="main"

if [ ! -d ${EMSDK_DIR} ]; then
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

echo ""
echo "---"
echo ""
echo "Succesfully installed Emscripten version '${EMSDK_VERSION}' into '${EMSDK_DIR}':"
emcc --version
echo ""
echo "Make sure you add the Emscripten root directory ('${EMSDK_DIR}') to your PATH environment variable."
echo ""
echo "For example, you could append"
echo "  export PATH="${EMSDK_DIR}\${PATH:+:\$PATH}""
echo "to your .bashrc or .zshrc and then restart your terminal session."
echo ""
echo "You can then activate the Emscripten environment as needed by running"
echo "  source emsdk_env.sh"
echo ""
echo "For a list of SDK commands, run"
echo "  emsdk help"
echo ""
echo "For compiler help, run"
echo "  emcc --help"
echo ""
echo "You can change some of the settings in configuration file:"
echo "  '${EMSDK_DIR}/.emscripten'"
echo ""
echo "You can update the Emscripten version, or install a specific version, by running this script again:"
echo "  # Installs latest stable version"
echo "  ${THIS_SCRIPT}"
echo "  # Same"
echo "  EMSDK_VERSION=latest ${THIS_SCRIPT}"
echo "  # Installs latest unstable \"tip of the tree\" version"
echo "  EMSDK_VERSION=tot-upstream ${THIS_SCRIPT}"
echo "  # Installs version 2.0.6"
echo "  EMSDK_VERSION=2.0.6 ${THIS_SCRIPT}"
echo ""
