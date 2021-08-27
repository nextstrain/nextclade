#!/usr/bin/env bash

BASH_DEBUG="${BASH_DEBUG:=}"
[[ "${BASH_DEBUG}" == "true" ]] && set -o xtrace
set -o errexit
set -o nounset
set -o pipefail
shopt -s dotglob
trap "exit" INT

: "${OS:?error: Set environment variable \"OS\" to \"linux\" or \"darwin\"}"

GITHUB_RELEASE_VERSION=${VERSION:=0.10.0}

FILENAME="${OS}-amd64-github-release"
ARCHIVE_NAME="${FILENAME}.bz2"
URL="https://github.com/github-release/github-release/releases/download/v${GITHUB_RELEASE_VERSION}/${ARCHIVE_NAME}"
curl -fsSL "${URL}" -o "${ARCHIVE_NAME}"
bzip2 -d "${ARCHIVE_NAME}"
mv "${FILENAME}" "github-release"
chmod +x "github-release"
