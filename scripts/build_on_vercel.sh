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

# Vercel caches `node_modules/`, so let's put our caches there
export CACHE_DIR="${PROJECT_ROOT_DIR}/node_modules"

export DEPS_DIR="${PROJECT_ROOT_DIR}/deps"

# Vercel seems to be currently using VMs provisioned with Amazon Linux, which is a derivative of RHEL,
# so we assume that `yum` package manager and `docker` package are available.
# If something breaks here, perhaps they've changed things.
cat /etc/os-release
cat /etc/image-id
cat /etc/system-release

echo "RHEL version: $(rpm -E %{rhel} || echo 'unknown')"

curl http://mirror.centos.org/centos/7/os/x86_64/RPM-GPG-KEY-CentOS-7 -o RPM-GPG-KEY-CentOS-7
rpm --import RPM-GPG-KEY-CentOS-7
yum-config-manager --add-repo='http://mirror.centos.org/centos/7/os/x86_64/'

yum update -y -q

amazon-linux-extras list

#amazon-linux-extras enable python3.8

yum install -y -q \
  ccache \
  curl \
  sqlite \
  sqlite-devel \
  python3.8 \
  xz \

mkdir -p "${CACHE_DIR}"
mkdir -p "${DEPS_DIR}"

#if [ ! -d "${CACHE_DIR}/miniconda" ]; then
#  curl -fsSL https://repo.continuum.io/miniconda/Miniconda3-latest-Linux-x86_64.sh -o Miniconda3-latest-Linux-x86_64.sh
#  bash Miniconda3-latest-Linux-x86_64.sh -b -p "${CACHE_DIR}/miniconda" >/dev/null
#fi
#
#export PATH="${CACHE_DIR}/miniconda/bin:${PATH}"
#set +x
#source "${CACHE_DIR}/miniconda/bin/activate"
#set -x
#
#conda config --add channels conda-forge
#conda config --set channel_priority strict
#
#conda install --yes --quiet \
#  conan \

#pip3 install --user --upgrade \
#  cppcheck \
#  cpplint \


curl -fsSL https://github.com/Kitware/CMake/releases/download/v3.16.3/cmake-3.16.3-linux-x86_64.tar.gz | tar xfz - --strip-components=1 -C "${DEPS_DIR}/"
export PATH="${DEPS_DIR}/bin:${PATH}"

pip3 install --upgrade --quiet \
  conan

#export NEXTCLADE_EMSDK_DIR="${CACHE_DIR}/emscripten/emsdk-${NEXTCLADE_EMSDK_VERSION}"
#export CONAN_USER_HOME="${CACHE_DIR}/conan"
#export NEXTCLADE_EMSDK_CACHE="${CACHE_DIR}/emscripten/emsdk_cache-${NEXTCLADE_EMSDK_VERSION}"
export CCACHE_DIR="${CACHE_DIR}/ccache"
export NEXTCLADE_EMSDK_USE_CACHE="0"

make prod-wasm-nowatch

pushd packages/web >/dev/null
  cp .env.vercel .env
popd >/dev/null

make prod-web-nowatch
