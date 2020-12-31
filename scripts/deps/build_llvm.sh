#!/usr/bin/env bash

BASH_DEBUG="${BASH_DEBUG:=}"
([ "${BASH_DEBUG}" == "true" ] || [ "${BASH_DEBUG}" == "1" ]) && set -o xtrace
set -o errexit
set -o nounset
set -o pipefail
shopt -s dotglob
trap "exit" INT

echo "On Ubuntu you will need these dependencies:"
echo "sudo apt-get install build-essential cmake doxygen git libc++-dev libc++abi-dev libedit-dev libelf-dev libffi-dev libncurses5-dev libompl-dev libxml2-dev lua5.3 ocaml ocaml-findlib python2.7-dev swig libctypes-ocaml-dev python-epydoc"
echo ""

THIS_DIR=$(
  cd $(dirname "${BASH_SOURCE[0]}")
  pwd
)

PROJECT_ROOT_DIR="$(realpath ${THIS_DIR}/../..)"

if [[ $OSTYPE == "linux-gnu" ]]; then
  export NUM_JOBS="$(nproc)"
elif [[ $OSTYPE == "darwin"* ]]; then
  export NUM_JOBS="$(sysctl -n hw.ncpu)"
fi

NAME="llvm"
URL="https://github.com/llvm/llvm-project"
VERSION_DEFAULT="11.0.0"
GIT_TAG_PREFIX="llvmorg-"

VERSION=${1:-${VERSION_DEFAULT}}
VERSION_MAJOR="$(echo ${VERSION} | cut -d. -f1)"
NAME_SIMPLE=${NAME}
BRANCH=${VERSION}
NAME=${NAME}-${BRANCH}

if [ "${BRANCH}" == "master" ] || [ -z "${BRANCH}" ]; then
  COMMIT_HASH=$(git ls-remote ${URL} | grep HEAD | cut -c-7)
else
  BRANCH="${GIT_TAG_PREFIX}${BRANCH}"
  COMMIT_HASH=$(git ls-remote ${URL} | grep -i "refs/tags/${BRANCH}^{}$" | cut -c-7)
fi

if [ ! -z "${COMMIT_HASH}" ]; then
  NAME=${NAME}-${COMMIT_HASH}
fi

SRC_DIR="${PROJECT_ROOT_DIR}/tmp"
SOURCE_DIR=${SRC_DIR}/${NAME}
BUILD_DIR=${SOURCE_DIR}_build
INSTALL_DIR="${PROJECT_ROOT_DIR}/3rdparty/${NAME_SIMPLE}"

if [ ! -d ${SOURCE_DIR} ]; then
  mkdir -p ${SRC_DIR}
  git clone --recursive --depth 1 -b ${BRANCH} ${URL} ${SOURCE_DIR}
fi

mkdir -p ${BUILD_DIR}
pushd ${BUILD_DIR}

unset CFLAGS CXXFLAGS CMAKE_C_FLAGS CMAKE_CXX_FLAGS
ADDITIONAL_INCLUDE_PATH="/usr/include/x86_64-linux-gnu"
export C_INCLUDE_PATH="${ADDITIONAL_INCLUDE_PATH}${C_INCLUDE_PATH:+:$C_INCLUDE_PATH}"
export CPLUS_INCLUDE_PATH="${ADDITIONAL_INCLUDE_PATH}${CPLUS_INCLUDE_PATH:+:$CPLUS_INCLUDE_PATH}"

cmake "${SOURCE_DIR}/llvm" \
  -DCMAKE_INSTALL_PREFIX="${INSTALL_DIR}" \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_VERBOSE_MAKEFILE=0 \
  -DLLVM_ENABLE_PROJECTS="clang;clang-tools-extra;compiler-rt;flang;libclc;libcxx;libcxxabi;libunwind;lld;lldb;openmp;polly" \
  -DLLVM_TOOL_LLDB_BUILD=1 \
  -DLLVM_TOOL_LLD_BUILD=1 \
  -DLLVM_ENABLE_FFI=1 \
  -DLLVM_CCACHE_BUILD=1 \
  -DLLVM_ENABLE_LLD=1 \
  -DLLVM_ENABLE_DOXYGEN=1 \
  -DCMAKE_C_FLAGS="-I/usr/include/x86_64-linux-gnu" \
  -DCMAKE_CXX_FLAGS="-I/usr/include/x86_64-linux-gnu" \
  -DLLVM_BINUTILS_INCDIR="${PROJECT_ROOT_DIR}/3rdparty/binutils/include"

make -j ${NUM_JOBS}
make install

popd
