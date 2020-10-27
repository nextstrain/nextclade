#!/usr/bin/env bash

BASH_DEBUG="${BASH_DEBUG:=}"
[[ "${BASH_DEBUG}" == "true" ]] && set -o xtrace
set -o errexit
set -o nounset
set -o pipefail
shopt -s dotglob
trap "exit" INT

# Directory where this script resides
THIS_DIR=$(cd $(dirname "${BASH_SOURCE[0]}"); pwd)
source "${THIS_DIR}/lib/set_locales.sh"

# Where the source code is
SOURCE_DIR="$(realpath ${THIS_DIR}/..)"

# Build type (default: Release)
CMAKE_BUILD_TYPE="${CMAKE_BUILD_TYPE:=Release}"

# Where the build files are (default: 'build' directory in the project root)
BUILD_DIR_DEFAULT="${THIS_DIR}/../.build/${CMAKE_BUILD_TYPE}"
mkdir -p "${BUILD_DIR_DEFAULT}"
BUILD_DIR_DEFAULT=$(realpath "${BUILD_DIR_DEFAULT}")
BUILD_DIR="${BUILD_DIR:=${BUILD_DIR_DEFAULT}}"

USE_COLOR="${USE_COLOR:=}"

mkdir -p "${BUILD_DIR}"

# Generate a semicolon-delimited list of arguments for cppcheck
# (to run during cmake build). The arguments are taken from the file
# `.cppcheck` in the source root
CMAKE_CXX_CPPCHECK="cppcheck;--template=gcc"
while IFS='' read -r flag; do
  CMAKE_CXX_CPPCHECK="${CMAKE_CXX_CPPCHECK};${flag}"
done<"${SOURCE_DIR}/.cppcheck"

# Print coloured message
function print() {
  if [[ ! -z "${USE_COLOR}" ]] && [[ "${USE_COLOR}" != "false" ]]; then
    echo -en "\n\e[48;5;${1}m ${2}\t\e[0m\n";
  else
    printf "\n${2}\n";
  fi
}

pushd "${BUILD_DIR}" > /dev/null

  print 56 "Install dependencies";
  conan install "${SOURCE_DIR}" \
    -s build_type="${CMAKE_BUILD_TYPE}" \
    --build missing \

  print 92 "Generate build files";
  cmake "${SOURCE_DIR}" \
    -DCMAKE_MODULE_PATH="${BUILD_DIR}" \
    -DCMAKE_EXPORT_COMPILE_COMMANDS=1 \
    -DCMAKE_BUILD_TYPE="${CMAKE_BUILD_TYPE}" \
    -DCMAKE_CXX_CPPCHECK="${CMAKE_CXX_CPPCHECK}" \

  print 12 "Build";
  cmake --build "${BUILD_DIR}" --config "${CMAKE_BUILD_TYPE}" -- -j$(($(nproc) - 1))

popd > /dev/null
