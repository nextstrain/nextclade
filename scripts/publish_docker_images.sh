#!/usr/bin/env bash

BASH_DEBUG="${BASH_DEBUG:=}"
([ "${BASH_DEBUG}" == "true" ] || [ "${BASH_DEBUG}" == "1" ]) && set -o xtrace
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

# Where the source code is
PROJECT_ROOT_DIR="$(realpath ${THIS_DIR}/..)"

source "${THIS_DIR}/lib/set_locales.sh"

source "${PROJECT_ROOT_DIR}/.env.example"
if [ -f "${PROJECT_ROOT_DIR}/.env" ]; then
  source "${PROJECT_ROOT_DIR}/.env"
fi

DOCKER_ORG="nextstrain"

VERSION=$(cat "${PROJECT_ROOT_DIR}/VERSION")
VERSION_MAJOR=$(cut -d '.' -f 1 <<<"${VERSION}")

function check_version_consistency() {
  set -o errexit

  PROJECT_NAME=${1}
  if [ -z "${PROJECT_NAME}" ]; then
    echo "${0}: Error: project name is required"
    exit 1
  fi

  VERSION_EXEC=$(.out/bin/${PROJECT_NAME}-Linux-x86_64 --version)

  if [ "${VERSION}" != "${VERSION_EXEC}" ]; then
    echo "Error: Version from \"VERSION\" file (\"${VERSION}\") does not match the version of the executable (\"${VERSION_EXEC}\"). Did you forget to rebuild the project?"
    exit 1
  fi
}

function publish_one_project() {
  set -o errexit

  PROJECT_NAME=${1}
  if [ -z "${PROJECT_NAME}" ]; then
    echo "${0}: Error: \$PROJECT_NAME is required"
    exit 1
  fi

  BASE_IMAGE=${2}
  if [ -z "${BASE_IMAGE}" ]; then
    echo "${0}: Error: \$BASE_IMAGE is required"
    exit 1
  fi

  TAGS=" \
    ${DOCKER_ORG}/${PROJECT_NAME}:${VERSION_MAJOR}-${BASE_IMAGE} \
    ${DOCKER_ORG}/${PROJECT_NAME}:${VERSION}-${BASE_IMAGE} \
    ${DOCKER_ORG}/${PROJECT_NAME}:latest-${BASE_IMAGE} \
    ${DOCKER_ORG}/${PROJECT_NAME}:${BASE_IMAGE}
    "

  if [ "${BASE_IMAGE}" == "debian" ]; then
    TAGS="${TAGS:-} \
      ${DOCKER_ORG}/${PROJECT_NAME}:${VERSION_MAJOR} \
      ${DOCKER_ORG}/${PROJECT_NAME}:${VERSION} \
      ${DOCKER_ORG}/${PROJECT_NAME}:latest \
      "
  fi

  # Make a string containing of tags for `docker build` command
  TAGS_FOR_DOCKER_BUILD=""
  for tag in ${TAGS}; do
    TAGS_FOR_DOCKER_BUILD="${TAGS_FOR_DOCKER_BUILD} -t ${tag}"
  done

  docker build \
    -f ${PROJECT_ROOT_DIR}/packages/${PROJECT_NAME}_cli/docker/${BASE_IMAGE}.dockerfile \
    ${TAGS_FOR_DOCKER_BUILD} \
    ${PROJECT_ROOT_DIR}

  # Push each tag separately (`docker push` does not support pushing multiple)
  for tag in ${TAGS}; do
    docker push ${tag}
  done
}

check_version_consistency nextalign
check_version_consistency nextclade

publish_one_project nextclade scratch
publish_one_project nextclade debian
publish_one_project nextclade alpine

publish_one_project nextalign scratch
publish_one_project nextalign debian
publish_one_project nextalign alpine
