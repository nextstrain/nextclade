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

TARGET="${1:-builder}"
if [ ${TARGET} == "release" ]; then
  echo "Should not build the release image with this script. Refusing to proceed."
  exit 1
fi

DOCKERHUB_ORG="nextstrain"
DOCKERHUB_PROJECT="nextclade_builder"
DOCKERHUB_REPO="${DOCKERHUB_ORG}/${DOCKERHUB_PROJECT}"

COMMIT_HASH=${CIRCLE_SHA1:=$(git rev-parse --short HEAD)}

USER_ID=${UID:=$(id -u)}
GROUP_ID=${GID:=$(id -g)}

NEXTCLADE_NODE_VERSION="$(cat "${PROJECT_ROOT_DIR}"/.nvmrc)"

docker build --rm -f "${PROJECT_ROOT_DIR}/Dockerfile" \
  --target="${TARGET}" \
  --build-arg UID="${USER_ID}" \
  --build-arg GID="${GROUP_ID}" \
  --build-arg=NEXTCLADE_EMSDK_VERSION="${NEXTCLADE_EMSDK_VERSION}" \
  --build-arg=NEXTCLADE_NODE_VERSION="${NEXTCLADE_NODE_VERSION}" \
  --tag ${DOCKERHUB_REPO}:${TARGET} \
  --tag ${DOCKERHUB_REPO}:${TARGET}-${COMMIT_HASH} \
  .
