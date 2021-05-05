#!/usr/bin/env bash

BASH_DEBUG="${BASH_DEBUG:=}"
[[ "${BASH_DEBUG}" == "true" ]] && set -o xtrace
set -o errexit
set -o nounset
set -o pipefail
shopt -s dotglob
trap "exit" INT

: GITHUB_TOKEN
: CIRCLE_PROJECT_USERNAME
: CIRCLE_PROJECT_REPONAME
: CIRCLE_SHA1

export ARTIFACTS=".out/bin"
export VERSION=$(cat VERSION)

PATH="${PATH}:."

set +o errexit
github-release info \
  --security-token "${GITHUB_TOKEN}" \
  --user "${CIRCLE_PROJECT_USERNAME}" \
  --repo "${CIRCLE_PROJECT_REPONAME}" \
  --tag "${VERSION}"

RELEASE_NOT_EXISTS="$?"
set -o errexit

if [ "${RELEASE_NOT_EXISTS}" != "0" ]; then
  echo "info: Release '${VERSION}' does not exist yet. Creating."
  github-release release \
    --security-token "${GITHUB_TOKEN}" \
    --user "${CIRCLE_PROJECT_USERNAME}" \
    --repo "${CIRCLE_PROJECT_REPONAME}" \
    --tag "${VERSION}" \
    --target "${CIRCLE_SHA1}"

  RELEASE_NOT_CREATED="$?"
  if [ "${RELEASE_NOT_CREATED}" != "0" ]; then
    echo "error: Failed to create release '${VERSION}'"
    exit 1
  fi
else
  echo "info: Release '${VERSION}' already exists. Skipping creation."
fi

for filename in ${ARTIFACTS}/*; do
  echo "info: Uploading a file for '${VERSION}': ${filename}"
  github-release upload \
    --security-token "${GITHUB_TOKEN}" \
    --user "${CIRCLE_PROJECT_USERNAME}" \
    --repo "${CIRCLE_PROJECT_REPONAME}" \
    --tag "${VERSION}" \
    --name "$(basename ${filename})" \
    --file "${filename}" \
    --replace

  FILE_NOT_UPLOADED="$?"
  if [ "${FILE_NOT_UPLOADED}" != "0" ]; then
    echo "error: Failed to upload a file to release '${VERSION}': ${filename}"
    exit 1
  fi
done
