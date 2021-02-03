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

VERSION=$(.out/bin/nextalign-Linux-x86_64 --version)

docker build -f "${PROJECT_ROOT_DIR}/Dockerfile.prod" \
  -t neherlab/nextalign:latest \
  -t neherlab/nextalign:${VERSION} \
  .

docker push neherlab/nextalign:latest
docker push neherlab/nextalign:${VERSION}
