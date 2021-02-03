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
PACKAGES_DIR="${SOURCE_DIR}/packages"

# Where the build files are (default: 'build' directory in the project root)
CMAKE_BUILD_TYPE=${CMAKE_BUILD_TYPE:=Debug}
BUILD_DIR_DEFAULT="${THIS_DIR}/../.build/${CMAKE_BUILD_TYPE}"
mkdir -p "${BUILD_DIR_DEFAULT}"
BUILD_DIR_DEFAULT=$(realpath "${BUILD_DIR_DEFAULT}")
BUILD_DIR="${BUILD_DIR:=${BUILD_DIR_DEFAULT}}"

find "${SOURCE_DIR}" -regex '.*\.\(c\|cpp\|h\|hpp\|cc\|cxx\)' -print0 | xargs -0 \
  run-clang-tidy \
    -quiet \
    -p=.build/Debug \
    || true
