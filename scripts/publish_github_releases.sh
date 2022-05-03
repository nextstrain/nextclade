#!/usr/bin/env bash

set -euo pipefail
shopt -s dotglob
trap "exit" INT

: GITHUB_TOKEN
: CIRCLE_PROJECT_USERNAME
: CIRCLE_PROJECT_REPONAME
: CIRCLE_SHA1
: ARTIFACTS_DIR
: VERSION

#if ! github-release info \
#  --security-token "${GITHUB_TOKEN}" \
#  --user "${CIRCLE_PROJECT_USERNAME}" \
#  --repo "${CIRCLE_PROJECT_REPONAME}" \
#  --tag "${VERSION}" \
#  ; then
#  echo "info: Release '${VERSION}' does not exist yet. Creating."
  github-release release \
    --security-token "${GITHUB_TOKEN}" \
    --user "${CIRCLE_PROJECT_USERNAME}" \
    --repo "${CIRCLE_PROJECT_REPONAME}" \
    --tag "${VERSION}" \
    --target "${CIRCLE_SHA1}" || true
#else
#  echo "info: Release '${VERSION}' already exists. Skipping creation."
#fi
#
#sleep 3

for filename in ${ARTIFACTS_DIR}/*; do
  echo "info: Uploading a file for '${VERSION}': ${filename}"

  if ! github-release upload \
    --security-token "${GITHUB_TOKEN}" \
    --user "${CIRCLE_PROJECT_USERNAME}" \
    --repo "${CIRCLE_PROJECT_REPONAME}" \
    --tag "${VERSION}" \
    --name "$(basename ${filename})" \
    --file "${filename}" \
    --replace \
    ; then
    echo "error: Failed to upload a file to release '${VERSION}': ${filename}"
    exit 1
  fi
done
