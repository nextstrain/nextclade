#!/usr/bin/env bash

BASH_DEBUG="${BASH_DEBUG:=}"
[[ "${BASH_DEBUG}" == "true" ]] && set -o xtrace
set -o errexit
set -o nounset
set -o pipefail
shopt -s dotglob
trap "exit" INT

: "${GITHUB_TOKEN}"
: "${CIRCLE_PROJECT_USERNAME}"
: "${CIRCLE_PROJECT_REPONAME}"
: "${CIRCLE_SHA1}"

export ARTIFACTS=".out/bin/"
export VERSION=$(cat VERSION)
export TAG="nextclade-${VERSION}"

PATH="${PATH}:."

ghr \
  -token ${GITHUB_TOKEN} \
  -username ${CIRCLE_PROJECT_USERNAME} \
  -repository ${CIRCLE_PROJECT_REPONAME} \
  -commitish ${CIRCLE_SHA1} \
  -replace \
  ${TAG} \
  ${ARTIFACTS}
