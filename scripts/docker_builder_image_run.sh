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
source "${THIS_DIR}/lib/is_ci.sh"

source "${PROJECT_ROOT_DIR}/.env.example"
if [ -f "${PROJECT_ROOT_DIR}/.env" ]; then
  source "${PROJECT_ROOT_DIR}/.env"
fi

TARGET="${1:-builder}"
COMMAND="${2:-}"

DOCKERHUB_ORG="nextstrain"
DOCKERHUB_PROJECT="nextalign"
DOCKERHUB_REPO="${DOCKERHUB_ORG}/${DOCKERHUB_PROJECT}_${TARGET}"

CONTAINER_NAME="${DOCKERHUB_PROJECT}_${TARGET}"

USER_ID=${UID:=$(id -u)}
GROUP_ID=${GID:=$(id -g)}

IS_CI=${IS_CI:=$(is_ci)}

docker run -it --rm \
  --name="${CONTAINER_NAME}" \
  --user="${USER_ID}:${GROUP_ID}" \
  --env UID="${USER_ID}" \
  --env GID="${GROUP_ID}" \
  --env IS_CI="${IS_CI}" \
  --env TERM=xterm-256color \
  --volume=${PWD}/:/src \
  --volume=/etc/timezone:/etc/timezone:ro \
  --volume=/etc/localtime:/etc/localtime:ro \
  --init \
  ${DOCKERHUB_REPO}:latest \
  ${COMMAND:=}
