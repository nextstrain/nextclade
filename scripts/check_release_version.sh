#!/usr/bin/env bash

BASH_DEBUG="${BASH_DEBUG:=}"
([ "${BASH_DEBUG}" == "true" ] || [ "${BASH_DEBUG}" == "1" ] ) && set -o xtrace
set -o errexit
set -o nounset
set -o pipefail
shopt -s dotglob
trap "exit" INT

# Directory where this script resides
THIS_DIR=$(cd $(dirname "${BASH_SOURCE[0]}"); pwd)

# Where the source code is
PROJECT_ROOT_DIR="$(realpath ${THIS_DIR}/..)"

source "${THIS_DIR}/lib/set_locales.sh"

source "${PROJECT_ROOT_DIR}/.env.example"
if [ -f "${PROJECT_ROOT_DIR}/.env" ]; then
  source "${PROJECT_ROOT_DIR}/.env"
fi

GIT_REPO="https://github.com/neherlab/nextalign"

LATEST_TAG=$(git ls-remote --tags "${GIT_REPO}" | awk -F ' ' '{print $2}' | sort -h | tail -1 | cut -c11- | tr -d " \t\n\r")
CURRENT_VERSION=$(grep -i 'project(nextalign_cli VERSION' "packages/nextalign_cli/CMakeLists.txt" | cut -c31- | tr -d " \t\n\r")

echo "Info: Latest git tag:        \"${LATEST_TAG}\""
echo "Info: Current cmake version: \"${CURRENT_VERSION}\""

if [ "${LATEST_TAG}" == "${CURRENT_VERSION}" ]; then
  echo "Error: This version has been published already. Refusing to proceed."
  echo "Info: Recommended solution: make sure you increment the version before releasing."
  echo "Info: Non-recommended, but viable solution: delete the existing git tag and associated Github Release"
  exit 1
fi
