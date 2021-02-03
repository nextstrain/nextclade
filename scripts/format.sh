#!/usr/bin/env bash

BASH_DEBUG="${BASH_DEBUG:=}"
[[ "${BASH_DEBUG}" == "true" ]] && set -o xtrace
set -o errexit
set -o nounset
set -o pipefail
shopt -s dotglob
trap "exit" INT

# Directory where this script resides
THIS_DIR=$(
  cd $(dirname "${BASH_SOURCE[0]}")
  pwd
)
source "${THIS_DIR}/lib/set_locales.sh"

# Where the source code is
SOURCE_DIR="$(realpath ${THIS_DIR}/..)"
PACKAGES_DIR="${SOURCE_DIR}/packages"

find "${PACKAGES_DIR}" -regex '.*\.\(c\|cpp\|h\|hpp\|cc\|cxx\)' -exec clang-format -style=file -i {} \;
