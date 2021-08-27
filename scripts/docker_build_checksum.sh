#!/usr/bin/env bash

BASH_DEBUG="${BASH_DEBUG:=}"
([ "${BASH_DEBUG}" == "true" ] || [ "${BASH_DEBUG}" == "1" ] ) && set -o xtrace
set -o errexit
set -o nounset
set -o pipefail
shopt -s dotglob
trap "exit" INT

cat \
  .circleci/config.yml \
  .dockerignore \
  .gitignore \
  .nvmrc \
  Dockerfile \
  Makefile \
  scripts/docker_build_checksum.sh \
  scripts/install*.sh \
| md5sum
