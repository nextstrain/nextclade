#!/usr/bin/env bash

BASH_DEBUG="${BASH_DEBUG:=}"
([ "${BASH_DEBUG}" == "true" ] || [ "${BASH_DEBUG}" == "1" ] ) && set -o xtrace
set -o errexit
set -o nounset
set -o pipefail
shopt -s dotglob
trap "exit" INT

# Install these for clang support:
# sudo apt-get install --verbose-versions llvm-10 clang{,-tools,-tidy,-format}-10 llvm-10 libclang-common-10-dev

# Directory where this script resides
THIS_DIR=$(cd $(dirname "${BASH_SOURCE[0]}"); pwd)

# Where the source code is
PROJECT_ROOT_DIR="$(realpath ${THIS_DIR}/..)"

source "${THIS_DIR}/lib/set_locales.sh"

source "${PROJECT_ROOT_DIR}/.env.example"
if [ -f "${PROJECT_ROOT_DIR}/.env" ]; then
  source "${PROJECT_ROOT_DIR}/.env"
fi

PROJECT_NAME="nextalign"
BUILD_PREFIX="Benchmarks-"

BENCHMARK_OPTIONS="${BENCHMARK_OPTIONS:=$@}"

# Build type (default: Release)
CMAKE_BUILD_TYPE="${CMAKE_BUILD_TYPE:=Release}"

# Deduce conan build type from cmake build type
CONAN_BUILD_TYPE=${CMAKE_BUILD_TYPE}
case ${CMAKE_BUILD_TYPE} in
  Debug|Release|RelWithDebInfo|MinSizeRelease) CONAN_BUILD_TYPE=${CMAKE_BUILD_TYPE} ;;
  ASAN|MSAN|TSAN|UBSAN) CONAN_BUILD_TYPE=RelWithDebInfo ;;
  *) CONAN_BUILD_TYPE="Release" ;;
esac

ADDITIONAL_PATH="${PROJECT_ROOT_DIR}/3rdparty/binutils/bin:${PROJECT_ROOT_DIR}/3rdparty/gcc/bin:${PROJECT_ROOT_DIR}/3rdparty/llvm/bin"
export PATH="${ADDITIONAL_PATH}${PATH:+:$PATH}"

# Whether to use Clang C++ compiler (default: use GCC)
USE_CLANG="${USE_CLANG:=0}"
CONAN_COMPILER_SETTINGS=""
BUILD_SUFFIX=""
if [ "${USE_CLANG}" == "true" ] || [ "${USE_CLANG}" == "1" ]; then
  export CC="${CC:-clang}"
  export CXX="${CXX:-clang++}"
  export CMAKE_C_COMPILER=${CC}
  export CMAKE_CXX_COMPILER=${CXX}

  CLANG_VERSION_DETECTED=$(${CC} --version | grep "clang version" | awk -F ' ' {'print $3'} | awk -F \. {'print $1'})
  CLANG_VERSION=${CLANG_VERSION:=${CLANG_VERSION_DETECTED}}

  CONAN_COMPILER_SETTINGS="\
    -s compiler=clang \
    -s compiler.version=${CLANG_VERSION} \
  "

  BUILD_SUFFIX="-Clang"
fi

# Create build directory
BUILD_DIR_DEFAULT="${PROJECT_ROOT_DIR}/.build/${BUILD_PREFIX}${CMAKE_BUILD_TYPE}${BUILD_SUFFIX}"
BUILD_DIR="${BUILD_DIR:=${BUILD_DIR_DEFAULT}}"

mkdir -p "${BUILD_DIR}"

USE_COLOR="${USE_COLOR:=1}"
DEV_CLI_OPTIONS="${DEV_CLI_OPTIONS:=}"

# Whether to build a standalone static executable
NEXTALIGN_STATIC_BUILD_DEFAULT=0
if [ "${CMAKE_BUILD_TYPE}" == "Release" ]; then
  NEXTALIGN_STATIC_BUILD_DEFAULT=1
fi
NEXTALIGN_STATIC_BUILD=${NEXTALIGN_STATIC_BUILD:=${NEXTALIGN_STATIC_BUILD_DEFAULT}}

# Add flags necessary for static build
CONAN_STATIC_BUILD_FLAGS=""
if [ "${NEXTALIGN_STATIC_BUILD}" == "true" ] || [ "${NEXTALIGN_STATIC_BUILD}" == "1" ]; then
  CONAN_STATIC_BUILD_FLAGS="\
    -o tbb:shared=False \
    -o gtest:shared=True \
  "
fi

# AddressSanitizer and MemorySanitizer don't work with gdb
case ${CMAKE_BUILD_TYPE} in
  ASAN|MSAN) GDB_DEFAULT="" ;;
  *) ;;
esac

# gdb (or lldb) command with arguments
GDB_DEFAULT="gdb --quiet -ix ${THIS_DIR}/lib/.gdbinit -x ${THIS_DIR}/lib/.gdbexec --args"
USE_GDB=${USE_GDB:=0}
GDB=""
if [ "${USE_GDB}" == "true" ] || [ "${USE_GDB}" == "1" ]; then
  GDB="${GDB_DEFAULT}"
fi

# Print coloured message
function print() {
  if [[ ! -z "${USE_COLOR}" ]] && [[ "${USE_COLOR}" != "false" ]]; then
    echo -en "\n\e[48;5;${1}m - ${2} \t\e[0m\n";
  else
    printf "\n${2}\n";
  fi
}


pushd "${BUILD_DIR}" >/dev/null

  print 56 "Install dependencies";
  conan install "${PROJECT_ROOT_DIR}" \
    -s build_type="${CONAN_BUILD_TYPE}" \
    ${CONAN_COMPILER_SETTINGS} \
    ${CONAN_STATIC_BUILD_FLAGS} \
    --build missing \

  print 92 "Generate build files";
  cmake "${PROJECT_ROOT_DIR}" \
    -DCMAKE_MODULE_PATH="${BUILD_DIR}" \
    -DCMAKE_EXPORT_COMPILE_COMMANDS=1 \
    -DCMAKE_BUILD_TYPE="${CMAKE_BUILD_TYPE}" \
    -DCMAKE_VERBOSE_MAKEFILE=${CMAKE_VERBOSE_MAKEFILE:=0} \
    -DNEXTALIGN_STATIC_BUILD=${NEXTALIGN_STATIC_BUILD} \
    -DNEXTALIGN_BUILD_BENCHMARKS=1 \
    -DNEXTALIGN_BUILD_TESTS=0 \

  print 12 "Build"
  cmake --build "${BUILD_DIR}" --config "${CMAKE_BUILD_TYPE}" -- -j$(($(nproc) - 1))

popd >/dev/null

pushd ${PROJECT_ROOT_DIR} >/dev/null

  print 28 "Run Benchmarks";
  CLI_DIR="${BUILD_DIR}/packages/${PROJECT_NAME}/benchmarks"
  CLI_EXE="nextalign_benchmarks"
  eval "${GDB}" ${CLI_DIR}/${CLI_EXE} \
    --benchmark_out="${PROJECT_ROOT_DIR}/nextalign_benchmarks.json" \
    --benchmark_counters_tabular=true \
    ${BENCHMARK_OPTIONS} \
    || cd .

  print 22 "Done";

popd
