#!/usr/bin/env bash

set -euxo pipefail
trap "exit" INT

# Directory where this script resides
THIS_DIR="$(
  cd "$(dirname "${BASH_SOURCE[0]}")"
  pwd
)"

# Where the source code is
PROJECT_ROOT_DIR="$(realpath ${THIS_DIR}/..)"

source "${THIS_DIR}/lib/set_locales.sh"

source "${PROJECT_ROOT_DIR}/.env.example"
if [ -f "${PROJECT_ROOT_DIR}/.env" ]; then
  source "${PROJECT_ROOT_DIR}/.env"
fi

DOCKER_TARGET="${1:-dev}"
if [ "${DOCKER_TARGET}" == "release" ]; then
  echo "Should not build the release image with this script. Refusing to proceed."
  exit 1
fi

DOCKERHUB_ORG="nextstrain"
DOCKERHUB_PROJECT="nextclade_builder"
DOCKERHUB_REPO="${DOCKERHUB_ORG}/${DOCKERHUB_PROJECT}"

COMMIT_HASH=${CIRCLE_SHA1:=$(git rev-parse --short HEAD)}

docker build \
  --tag="${DOCKERHUB_REPO}:${DOCKER_TARGET}" \
  --tag="${DOCKERHUB_REPO}:${DOCKER_TARGET}-${COMMIT_HASH}" \
  --file="docker-dev.dockerfile" \
  --target="${DOCKER_TARGET}" \
  --build-arg="UID=$(id -u)" \
  --build-arg="GID=$(id -g)" \
  --build-arg="USER=user" \
  --build-arg="GROUP=user" \
  "${PROJECT_ROOT_DIR}"
