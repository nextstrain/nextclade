#!/usr/bin/env bash

#
# Generates checksum of an amalgamation of some of the important build config files and of the resolved tool versions.
# If any of these change, this checksum changes and the 'builder' container image gets updated on CI.
# The check currently runs on every push.
#
# The tool versions are resolved rather than read from their files, because some of them live in files that change for
# other reasons too (`Cargo.toml`, `package.json`), and the image does not need a rebuild on those changes.
#

set -euo pipefail
trap "exit" INT

{
  cat \
    .dockerignore \
    .gitignore \
    .nvmrc \
    docker/dev \
    docker/docker-dev.dockerfile \
    rust-toolchain.toml \
    scripts/docker_build_checksum.sh \
    scripts/get-version \
    tool-versions.json
  ./scripts/get-version --all
} | sha256sum | cut -f 1 -d " "
