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
THIS_DIR=$(
  cd $(dirname "${BASH_SOURCE[0]}")
  pwd
)

# Where the source code is
PROJECT_ROOT_DIR="$(realpath ${THIS_DIR}/..)"

source "${THIS_DIR}/lib/set_locales.sh"
source "${THIS_DIR}/lib/is_ci.sh"

source "${PROJECT_ROOT_DIR}/.env.example"
if [ -f "${PROJECT_ROOT_DIR}/.env" ]; then
  source "${PROJECT_ROOT_DIR}/.env"
fi

# Vercel seems to be currently using VMs provisioned with Amazon Linux, which is a derivative of RHEL
yum install \
  curl \
  xz

curl -fsSL https://repo.continuum.io/miniconda/Miniconda3-latest-Linux-x86_64.sh
sh Miniconda3-latest-Linux-x86_64.sh -b -p "${HOME}/miniconda"

export PATH="${HOME}/miniconda/bin:${PATH}"
source "${HOME}/miniconda/bin/activate"

conda config --add channels conda-forge
conda config --set channel_priority strict

conda install --yes \
  conan \
  cpplint

make prod-wasm-nowatch
make prod-web-nowatch
