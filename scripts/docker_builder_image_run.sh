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

CONTAINER_NAME=nextalign_builder
DOCKERHUB_REPO=neherlab/nextalign_builder
COMMIT_HASH=${CIRCLE_SHA1:=$(git rev-parse --short HEAD)}
USER_ID=${UID:=$(id -u)}
GROUP_ID=${GID:=$(id -g)}
CI="${CI:=0}"

docker run -it --rm \
  --name="${CONTAINER_NAME}" \
  --user="${USER_ID}:${GROUP_ID}" \
  --env USER="user" \
  --env GROUP="user" \
  --env UID="${USER_ID}" \
  --env GID="${GROUP_ID}" \
  --env CI="${CI}" \
  --env TERM=xterm-256color \
  --volume=${PWD}/:/src \
  --volume=/etc/timezone:/etc/timezone:ro \
  --volume=/etc/localtime:/etc/localtime:ro \
  --init \
  ${DOCKERHUB_REPO}:latest \
  ${1}
