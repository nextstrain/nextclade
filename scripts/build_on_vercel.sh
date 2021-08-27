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

export PATH=/usr/sbin${PATH:+":$PATH"}

# Vercel caches `node_modules/`, so let's put our caches there
export CACHE_DIR="${PROJECT_ROOT_DIR}/node_modules"

# Deps that are not cached
export DEPS_DIR="${PROJECT_ROOT_DIR}/deps"

mkdir -p "${CACHE_DIR}"
mkdir -p "${DEPS_DIR}"

# Vercel seems to be currently using VMs provisioned with Amazon Linux 2, which is a derivative of RHEL 7,
# If something breaks, perhaps they've changed things.
cat /etc/os-release
cat /etc/image-id
cat /etc/system-release
echo "RHEL version: $(rpm -E %{rhel} || echo 'unknown')"

# Disable yum fastestmirror plugin. It only makes things slower.
printf "[main]\nenabled=0\n" > "/etc/yum/pluginconf.d/fastestmirror.conf"

# Remove some dead symlinks which cause log pollution
rm /lib64/libvips-cpp.so.42
rm /lib64/libvips.so.42

# Remove default Python. It does not have SQLite module enabled required for `conan`.
rm -rf /usr/local/bin/python3.6
rm -rf /usr/local/lib/python3.6

# Add "UIS" repos, with more up-to-date packages (https://ius.io/)
# Python 3.6 from IUS has SQLite enabled.
yum install -y -q \
"https://repo.ius.io/ius-release-el7.rpm" \
"https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm"

yum update -y -q

yum install -y -q --enablerepo=ius \
  ccache \
  sqlite \
  sqlite-devel \
  python36u python36u-libs python36u-devel python36u-pip \
  xz

# Set Python 3.6 from UIS as  default
alternatives --install /usr/bin/python python /usr/bin/python3.6 60 || true
alternatives --install /usr/bin/python3 python3 /usr/bin/python3.6 60 || true
alternatives --install /usr/local/bin/python3 python3 /usr/bin/python3.6 60 || true
alternatives --install /usr/bin/python3.6 python3.6 /usr/bin/python3.6 60 || true
ln -s /usr/bin/python3.6 /usr/local/bin/python3.6 || true
ln -s /usr/lib/python3.6 /usr/local/lib/python3.6 || true
export PYTHONPATH=/usr/lib/python3.6${PYTHONPATH:+":$PYTHONPATH"}


# Make sure Python has SQLite module enabled
which "python3"
python3 -c "import sqlite3; print(sqlite3.sqlite_version)" || true

python3 -m pip install --upgrade --quiet conan

# Install CMake
curl -fsSL https://github.com/Kitware/CMake/releases/download/v3.16.3/cmake-3.16.3-linux-x86_64.tar.gz | tar xfz - --strip-components=1 -C "${DEPS_DIR}/"
export PATH="${DEPS_DIR}/bin:${PATH}"

# `ccache` produces relatively small cache, let's keep it
export CCACHE_DIR="${CACHE_DIR}/ccache"

# `emsdk` cache is too big to fit to Vercel's 500MB allowed, so don't cache.
export NEXTCLADE_EMSDK_USE_CACHE="0"

make prod-wasm-nowatch

make prod-web-nowatch
