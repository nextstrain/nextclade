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
THIS_DIR=$(cd $(dirname "${BASH_SOURCE[0]}") pwd)

# Where the source code is
PROJECT_ROOT_DIR="$(realpath ${THIS_DIR}/..)"

function is_docker() {
    if [ -f /.dockerenv ]; then
      echo "1"
    else
      echo "0"
    fi
}


# Vercel seems to be currently using VMs provisioned with Amazon Linux, which is a derivative of RHEL,
# so we assume that `yum` package manager and `docker` package are available.
# If something breaks here, perhaps they've changed things.
cat /etc/os-release

IS_DOCKER="$(is_docker)"

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

make prod-wasm-nowatch

pushd packages/web >/dev/null
  cp .env.vercel .env
popd >/dev/null

make prod-web-nowatch
