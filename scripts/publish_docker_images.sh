#!/usr/bin/env bash

BASH_DEBUG="${BASH_DEBUG:=}"
([ "${BASH_DEBUG}" == "true" ] || [ "${BASH_DEBUG}" == "1" ]) && set -o xtrace
set -o errexit
set -o nounset
set -o pipefail
shopt -s dotglob
trap "exit" INT

PROJECT_NAME=${1}
if [ -z "${PROJECT_NAME}" ]; then
  echo "${0}: Error: project name is required"
  echo "Usage: ${0} <project_name>"
  exit 1
fi

# Directory where this script resides
THIS_DIR=$(
  cd $(dirname "${BASH_SOURCE[0]}")
  pwd
)

# Where the source code is
PROJECT_ROOT_DIR="$(realpath ${THIS_DIR}/..)"

source "${THIS_DIR}/lib/set_locales.sh"

source "${PROJECT_ROOT_DIR}/.env.example"
if [ -f "${PROJECT_ROOT_DIR}/.env" ]; then
  source "${PROJECT_ROOT_DIR}/.env"
fi

VERSION=$(.out/bin/${PROJECT_NAME}-Linux-x86_64 --version)

docker build -f "${PROJECT_ROOT_DIR}/Dockerfile.prod" \
  -t nextstrain/${PROJECT_NAME}:latest \
  -t nextstrain/${PROJECT_NAME}:${VERSION} \
  .

docker push nextstrain/${PROJECT_NAME}:latest
docker push nextstrain/${PROJECT_NAME}:${VERSION}
