#!/usr/bin/env bash

set -euo pipefail
trap "exit" INT

cat \
  .dockerignore \
  .gitignore \
  .nvmrc \
  docker-dev.dockerfile \
  rust-toolchain.toml \
  scripts/docker_build_checksum.sh \
| sha256sum | cut -f 1 -d " "
