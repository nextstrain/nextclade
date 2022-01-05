#!/usr/bin/env bash

set -euo pipefail
shopt -s dotglob
trap "exit" INT

# Directory where this script resides
THIS_DIR=$(
  cd "$(dirname "${BASH_SOURCE[0]}")"
  pwd
)

# Where the source code is
PROJECT_ROOT_DIR="$(realpath "${THIS_DIR}/..")"

source "${THIS_DIR}/lib/set_locales.sh"

source "${PROJECT_ROOT_DIR}/.env.example"
if [ -f "${PROJECT_ROOT_DIR}/.env" ]; then
  source "${PROJECT_ROOT_DIR}/.env"
fi

DOCKERHUB_ORG="nextstrain"
DOCKERHUB_PROJECT="nextclade_builder"
DOCKERHUB_REPO="${DOCKERHUB_ORG}/${DOCKERHUB_PROJECT}"

DOCKER_CONTAINER_NAME="${DOCKERHUB_REPO//\//-}-$(date +%s)"

COMMAND="${1:-}"

USER_ID=${UID:=$(id -u)}
GROUP_ID=${GID:=$(id -g)}

docker run -it --rm \
  --init \
  --name="${DOCKER_CONTAINER_NAME}" \
  --user="${USER_ID}:${GROUP_ID}" \
  --env="UID=${USER_ID}" \
  --env="GID=${GROUP_ID}" \
  --env="TERM=xterm-256color" \
  --volume="${PWD}/:/src" \
  --volume="/etc/timezone:/etc/timezone:ro" \
  --volume="/etc/localtime:/etc/localtime:ro" \
  --network=host \
  ${DOCKERHUB_REPO}:latest \
  ${COMMAND:=}
