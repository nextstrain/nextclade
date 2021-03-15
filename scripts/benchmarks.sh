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
source "${THIS_DIR}/lib/is_ci.sh"

source "${PROJECT_ROOT_DIR}/.env.example"
if [ -f "${PROJECT_ROOT_DIR}/.env" ]; then
  source "${PROJECT_ROOT_DIR}/.env"
fi

PROJECT_NAME="nextalign"
BUILD_PREFIX="Benchmarks-"

export CONAN_USER_HOME="${CONAN_USER_HOME:=${PROJECT_ROOT_DIR}/.cache}"
export CCACHE_DIR="${CCACHE_DIR:=${PROJECT_ROOT_DIR}/.cache/.ccache}"

BENCHMARK_OPTIONS="${BENCHMARK_OPTIONS:=$@}"
USE_GDB=0

# Check whether we are running on a Continuous integration server
IS_CI=${IS_CI:=$(is_ci)}

# Name of the operating system we are running this script on: Linux, Darwin (we rename it to MacOS below)
BUILD_OS="$(uname -s)"
if [ "${BUILD_OS}" == "Darwin" ]; then
  BUILD_OS="MacOS"
fi

# Name of the operating system for which we will build the binaries. Default is the same as build OS
HOST_OS="${HOST_OS:=${BUILD_OS}}"
if [ "${HOST_OS}" == "Darwin" ]; then
  HOST_OS="MacOS"
fi

# Name of the processor architecture we are running this script on: x86_64, arm64
BUILD_ARCH="$(uname -p || uname -m)"
if [ "${BUILD_OS}" == "MacOS" ] && [ ${BUILD_ARCH} == "i386" ]; then
  # x86_64 is called i386 on macOS, fix that
  BUILD_ARCH="x86_64"
fi

# Name of the processor architecture for which we will build the binaries. Default is the same as build arch
HOST_ARCH=${HOST_ARCH:=${BUILD_ARCH}}

# Whether we are cross-compiling for another operating system or another processor architecture
CROSS=0
if [ "${BUILD_OS}" != "${HOST_OS}" ] || [ "${BUILD_ARCH}" != "${HOST_ARCH}" ]; then
  CROSS=1
fi

# Minimum target version of macOS. End up in `-mmacosx-version-min=` flag of AppleClang
OSX_MIN_VER=${OSX_MIN_VER:=10.12}

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

# Whether to use Clang Analyzer
USE_CLANG_ANALYZER="${USE_CLANG_ANALYZER:=0}"
CLANG_ANALYZER=""
if [ "${USE_CLANG_ANALYZER}" == "true" ] || [ "${USE_CLANG_ANALYZER}" == "1" ]; then
  CLANG_ANALYZER="scan-build -v --keep-going -o ${PROJECT_ROOT_DIR}/.reports/clang-analyzer"
  USE_CLANG=1
  mkdir -p "${PROJECT_ROOT_DIR}/.reports/clang-analyzer"
fi

# Whether to use Clang C++ compiler (default: use GCC)
USE_CLANG="${USE_CLANG:=0}"

# Whether to use MinGW GCC C++ compiler for croww-compiling for Windows (default: no)
USE_MINGW="${USE_MINGW:=0}"


CONAN_COMPILER_SETTINGS="-s arch=${HOST_ARCH}"
if [ "${HOST_OS}" == "MacOS" ] && [ "${HOST_ARCH}" == "arm64" ]; then
  # Conan uses different name for macOS arm64 architecture
  CONAN_COMPILER_SETTINGS="\
    -s arch=armv8 \
  "
fi

if [ "${HOST_OS}" == "MacOS" ]; then
  # Conan uses different name for macOS arm64 architecture
  CONAN_COMPILER_SETTINGS="\
    ${CONAN_COMPILER_SETTINGS} \
    -s os.version=${OSX_MIN_VER} \
  "
fi


BUILD_SUFFIX=""
if [ "${USE_CLANG}" == "true" ] || [ "${USE_CLANG}" == "1" ]; then
  export CC="${CC:-clang}"
  export CXX="${CXX:-clang++}"
  export CMAKE_C_COMPILER=${CC}
  export CMAKE_CXX_COMPILER=${CXX}

  CLANG_VERSION_DETECTED=$(${CC} --version | grep "clang version" | awk -F ' ' {'print $3'} | awk -F \. {'print $1'})
  CLANG_VERSION=${CLANG_VERSION:=${CLANG_VERSION_DETECTED}}

  CONAN_COMPILER_SETTINGS="\
    ${CONAN_COMPILER_SETTINGS}
    -s compiler=clang \
    -s compiler.version=${CLANG_VERSION} \
    -s compiler.libcxx=libstdc++11 \
  "

  BUILD_SUFFIX="-Clang"
fi

# Create build directory
BUILD_DIR_DEFAULT="${PROJECT_ROOT_DIR}/.build/${BUILD_PREFIX}${CMAKE_BUILD_TYPE}${BUILD_SUFFIX}"
BUILD_DIR="${BUILD_DIR:=${BUILD_DIR_DEFAULT}}"

mkdir -p "${BUILD_DIR}"

USE_COLOR="${USE_COLOR:=1}"
if [ "${IS_CI}" == "1" ] || [ "${IS_CI}" == "true" ]; then
  USE_COLOR="0"
fi

DEV_CLI_OPTIONS="${DEV_CLI_OPTIONS:=}"

# Whether to build a standalone static executable
NEXTALIGN_STATIC_BUILD_DEFAULT=0
if [ "${CMAKE_BUILD_TYPE}" == "Release" ]; then
  NEXTALIGN_STATIC_BUILD_DEFAULT=1
fi
NEXTALIGN_STATIC_BUILD=${NEXTALIGN_STATIC_BUILD:=${NEXTALIGN_STATIC_BUILD_DEFAULT}}

# Add flags necessary for static build
CONAN_STATIC_BUILD_FLAGS="-o boost:header_only=True"
CONAN_TBB_STATIC_BUILD_FLAGS=""
if [ "${NEXTALIGN_STATIC_BUILD}" == "true" ] || [ "${NEXTALIGN_STATIC_BUILD}" == "1" ]; then
  CONAN_STATIC_BUILD_FLAGS="\
    ${CONAN_STATIC_BUILD_FLAGS} \
    -o tbb:shared=False \
    -o gtest:shared=True \
  "

  CONAN_TBB_STATIC_BUILD_FLAGS="-o shared=False"
fi


NEXTALIGN_BUILD_BENCHMARKS=${NEXTALIGN_BUILD_BENCHMARKS:=1}
NEXTALIGN_BUILD_TESTS=${NEXTALIGN_BUILD_TESTS:=1}
if [ "${USE_MINGW}" == "true" ] || [ "${USE_MINGW}" == "1" ]; then
  NEXTALIGN_BUILD_BENCHMARKS=0
  NEXTALIGN_BUILD_TESTS=0

  CONAN_STATIC_BUILD_FLAGS="\
    ${CONAN_STATIC_BUILD_FLAGS} \
    --profile ${PROJECT_ROOT_DIR}/config/conan/mingw-profile.txt \
  "
fi


# gdb (or lldb) command with arguments
GDB_DEFAULT="gdb --quiet -ix ${THIS_DIR}/lib/.gdbinit -x ${THIS_DIR}/lib/.gdbexec --args"
if [ "${IS_CI}" == "1" ]; then
  GDB_DEFAULT=""
fi

# AddressSanitizer and MemorySanitizer don't work with gdb
case ${CMAKE_BUILD_TYPE} in
  ASAN|MSAN) GDB_DEFAULT="" ;;
  *) ;;
esac

if [ "${USE_GDB}" != "1" ] || [ "${USE_GDB}" != "true" ]; then
  GDB_DEFAULT=""
fi

GDB="${GDB:=${GDB_DEFAULT}}"

# gttp (Google Test Pretty Printer) command
GTTP_DEFAULT="${THIS_DIR}/lib/gtpp.py"
if [ "${IS_CI}" == "1" ]; then
  GTTP_DEFAULT=""
fi
GTPP="${GTPP:=${GTTP_DEFAULT}}"

# Generate a semicolon-delimited list of arguments for cppcheck
# (to run during cmake build). The arguments are taken from the file
# `.cppcheck` in the source root
CMAKE_CXX_CPPCHECK="cppcheck;--template=gcc"
while IFS='' read -r flag; do
  CMAKE_CXX_CPPCHECK="${CMAKE_CXX_CPPCHECK};${flag}"
done<"${THIS_DIR}/../.cppcheck"

# Print coloured message
function print() {
  if [ ! -z "${USE_COLOR}" ] && [ "${USE_COLOR}" != "false" ] && [ "${USE_COLOR}" != "0" ]; then
    echo -en "\n\e[48;5;${1}m - ${2} \t\e[0m\n";
  else
    printf "\n${2}\n";
  fi
}

echo "-------------------------------------------------------------------------"
echo "PROJECT_NAME   = ${PROJECT_NAME:=}"
echo ""
echo "BUILD_OS       = ${BUILD_OS:=}"
echo "BUILD_ARCH     = ${BUILD_ARCH:=}"
echo "uname -a       = $(uname -a)"
echo "uname -s       = $(uname -s)"
echo "uname -p       = $(uname -p)"
echo "uname -m       = $(uname -m)"
echo ""
echo "HOST_OS        = ${HOST_OS:=}"
echo "HOST_ARCH      = ${HOST_ARCH:=}"
echo "OSX_MIN_VER    = ${OSX_MIN_VER:=}"
echo ""
echo "IS_CI          = ${IS_CI:=}"
echo "CI             = ${CI:=}"
echo "TRAVIS         = ${TRAVIS:=}"
echo "CIRCLECI       = ${CIRCLECI:=}"
echo "GITHUB_ACTIONS = ${GITHUB_ACTIONS:=}"
echo ""
echo "CMAKE_BUILD_TYPE         = ${CMAKE_BUILD_TYPE:=}"
echo "CONAN_BUILD_TYPE         = ${CONAN_BUILD_TYPE:=}"
echo "NEXTALIGN_STATIC_BUILD   = ${NEXTALIGN_STATIC_BUILD:=}"
echo ""
echo "USE_COLOR                = ${USE_COLOR:=}"
echo "USE_CLANG                = ${USE_CLANG:=}"
echo "CLANG_VERSION            = ${CLANG_VERSION:=}"
echo "CC                       = ${CC:=}"
echo "CXX                      = ${CXX:=}"
echo "CMAKE_C_COMPILER         = ${CMAKE_C_COMPILER:=}"
echo "CMAKE_CXX_COMPILER       = ${CMAKE_CXX_COMPILER:=}"
echo "USE_CLANG_ANALYZER       = ${USE_CLANG_ANALYZER:=}"
echo ""
echo "CONAN_COMPILER_SETTINGS      = ${CONAN_COMPILER_SETTINGS:=}"
echo "CONAN_STATIC_BUILD_FLAGS     = ${CONAN_STATIC_BUILD_FLAGS:=}"
echo "CONAN_TBB_STATIC_BUILD_FLAGS = ${CONAN_TBB_STATIC_BUILD_FLAGS:=}"
echo ""
echo "CONAN_USER_HOME          = ${CONAN_USER_HOME:=}"
echo "CCACHE_DIR               = ${CCACHE_DIR:=}"
echo "BUILD_PREFIX             = ${BUILD_PREFIX:=}"
echo "BUILD_SUFFIX             = ${BUILD_SUFFIX:=}"
echo "BUILD_DIR                = ${BUILD_DIR:=}"
echo "INSTALL_DIR              = ${INSTALL_DIR:=}"
echo "CLI                      = ${CLI:=}"
echo "-------------------------------------------------------------------------"

# Setup conan profile in CONAN_USER_HOME
print 56 "Create conan profile";
CONAN_V2_MODE=1 conan profile new default --detect --force
conan remote add bincrafters https://api.bintray.com/conan/bincrafters/public-conan --force

# At the time of writing this, the newer version of Intel TBB with CMake build system was not available in conan packages.
# This will build a local conan package and put it into local conan cache, if not present yet.
# On `conan install` step this local package will be used, instead of querying conan remote servers.
if [ -z "$(conan search | grep 'tbb/2021.2.0-rc@local/stable')" ]; then
  # Create Intel TBB package patched for Apple Silicon and put it under `@local/stable` reference
  print 56 "Build Intel TBB";
  pushd "3rdparty/tbb" > /dev/null
      conan create . local/stable \
      -s build_type="${CONAN_BUILD_TYPE}" \
      ${CONAN_COMPILER_SETTINGS} \
      ${CONAN_STATIC_BUILD_FLAGS} \
      ${CONAN_TBB_STATIC_BUILD_FLAGS} \

  popd > /dev/null
fi

mkdir -p "${BUILD_DIR}"
pushd "${BUILD_DIR}" > /dev/null

  print 56 "Install dependencies";
  conan install "${PROJECT_ROOT_DIR}" \
    -s build_type="${CONAN_BUILD_TYPE}" \
    ${CONAN_COMPILER_SETTINGS} \
    ${CONAN_STATIC_BUILD_FLAGS} \
    --build missing \

  print 92 "Generate build files";
  ${CLANG_ANALYZER} cmake "${PROJECT_ROOT_DIR}" \
    -DCMAKE_MODULE_PATH="${BUILD_DIR}" \
    -DCMAKE_INSTALL_PREFIX="${INSTALL_DIR}" \
    -DCMAKE_EXPORT_COMPILE_COMMANDS=1 \
    -DCMAKE_BUILD_TYPE="${CMAKE_BUILD_TYPE}" \
    -DCMAKE_CXX_CPPCHECK="${CMAKE_CXX_CPPCHECK}" \
    -DCMAKE_VERBOSE_MAKEFILE=${CMAKE_VERBOSE_MAKEFILE:=0} \
    -DCMAKE_COLOR_MAKEFILE=${CMAKE_COLOR_MAKEFILE:=1} \
    -DNEXTALIGN_STATIC_BUILD=${NEXTALIGN_STATIC_BUILD} \
    -DNEXTALIGN_BUILD_BENCHMARKS=${NEXTALIGN_BUILD_BENCHMARKS} \
    -DNEXTALIGN_BUILD_TESTS=${NEXTALIGN_BUILD_TESTS} \
    -DNEXTALIGN_MACOS_ARCH="${HOST_ARCH}" \
    -DCMAKE_OSX_ARCHITECTURES="${HOST_ARCH}" \
    -DCMAKE_OSX_DEPLOYMENT_TARGET="${OSX_MIN_VER}"

  print 12 "Build";
  ${CLANG_ANALYZER} cmake --build "${BUILD_DIR}" --config "${CMAKE_BUILD_TYPE}" -- -j$(($(nproc) - 1))

popd >/dev/null

if [ "${CROSS}" == "1" ]; then
  echo "Skipping unit tests and executable e2e test built for ${HOST_OS} ${HOST_ARCH} because they cannot run on ${BUILD_OS} ${BUILD_ARCH}. Exiting with success."
  exit 0
fi

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

popd >/dev/null
