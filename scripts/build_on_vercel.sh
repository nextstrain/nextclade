#!/usr/bin/env bash

BASH_DEBUG="${BASH_DEBUG:=}"
([ "${BASH_DEBUG}" == "true" ] || [ "${BASH_DEBUG}" == "1" ]) && set -o xtrace
set -o errexit
set -o nounset
set -o pipefail
shopt -s dotglob
trap "exit" INT

set -x

# Directory where this script resides
THIS_DIR=$(cd $(dirname "${BASH_SOURCE[0]}"); pwd)

# Where the source code is
PROJECT_ROOT_DIR="$(realpath ${THIS_DIR}/..)"

source "${PROJECT_ROOT_DIR}/.env.example"
if [ -f "${PROJECT_ROOT_DIR}/.env" ]; then
  source "${PROJECT_ROOT_DIR}/.env"
fi

# Vercel seems to be currently using VMs provisioned with Amazon Linux, which is a derivative of RHEL,
# so we assume that `yum` package manager and `docker` package are available.
# If something breaks here, perhaps they've changed things.
cat /etc/os-release

yum install -y -q \
  curl \
  xz

curl -fsSL https://repo.continuum.io/miniconda/Miniconda3-latest-Linux-x86_64.sh -o Miniconda3-latest-Linux-x86_64.sh
bash Miniconda3-latest-Linux-x86_64.sh -b -p "${HOME}/miniconda" >/dev/null
export PATH="${HOME}/miniconda/bin:${PATH}"
set +x
source "${HOME}/miniconda/bin/activate"
set -x

conda config --add channels conda-forge
conda config --set channel_priority strict

conda install --yes --quiet \
  ccache \
  cmake \
  conan \
  cppcheck \
  cpplint \


# Vercel caches `node_modules`, so let's put our caches there
export NEXTCLADE_EMSDK_DIR="node_modules/emscripten/emsdk-${NEXTCLADE_EMSDK_VERSION}"
export NEXTCLADE_EMSDK_CACHE="node_modules/emscripten/emsdk_cache-${NEXTCLADE_EMSDK_VERSION}"
export CONAN_USER_HOME="node_modules/conan"
export CCACHE_DIR="node_modules/ccache"
export NEXTCLADE_EMSDK_USE_CACHE="0"

make prod-wasm-nowatch

pushd packages/web >/dev/null
  cp .env.vercel .env
popd >/dev/null

make prod-web-nowatch
