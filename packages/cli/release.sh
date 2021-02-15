#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail
trap "exit" INT

REPO_NAME="nextstrain/nextclade"
PACKAGE_VERSION=$(node -pe "require('./package.json').version")
CLI_EXE_FILE=./dist/nextclade.js
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ ! -f ${CLI_EXE_FILE} ]; then
  echo "Error: not found '${CLI_EXE_FILE}'. Did you forget to rebuild?"
fi

CLI_VERSION=$(${CLI_EXE_FILE} --version)

if [ ! ${PACKAGE_VERSION} == ${CLI_VERSION} ]; then
  echo "Error: version mismatch 'package.json' version is '${PACKAGE_VERSION}' while '${CLI_EXE_FILE}' --version is '${CLI_VERSION}'. Did you forget to rebuild, or to update the package version, or both?"
  exit 1
fi

if [ ! -z $(echo $PACKAGE_VERSION | grep 'beta') ]; then
  NPM_TAG=beta
elif [ ! -z $(echo $PACKAGE_VERSION | grep 'alpha') ]; then
  NPM_TAG=alpha
else
  NPM_TAG=latest
fi

echo $PACKAGE_VERSION
echo $NPM_TAG

npm publish --tag=${NPM_TAG}

# These are only updated for releases
if [ $NPM_TAG == "latest" ]; then
  docker build -f ./docker/stretch.dockerfile . \
  -t ${REPO_NAME}:latest \
  -t ${REPO_NAME}:stretch

  docker build -f ./docker/alpine3.12.dockerfile . \
  -t ${REPO_NAME}:alpine \
  -t ${REPO_NAME}:alpine3.12

  docker push ${REPO_NAME}:latest
  docker push ${REPO_NAME}:stretch
  docker push ${REPO_NAME}:alpine
  docker push ${REPO_NAME}:alpine3.12
fi

# These are only updated for betas
if [ $NPM_TAG == "beta" ]; then
  docker build -f ./docker/stretch.dockerfile . \
  -t ${REPO_NAME}:beta \
  -t ${REPO_NAME}:beta-stretch

  docker build -f ./docker/alpine3.12.dockerfile . \
  -t ${REPO_NAME}:beta-alpine \
  -t ${REPO_NAME}:beta-alpine3.12

  docker push ${REPO_NAME}:beta
  docker push ${REPO_NAME}:beta-stretch
  docker push ${REPO_NAME}:beta-alpine
  docker push ${REPO_NAME}:beta-alpine3.12
fi

# These are only updated for alphas
if [ $NPM_TAG == "alpha" ]; then
  docker build -f ./docker/stretch.dockerfile . \
  -t ${REPO_NAME}:alpha \
  -t ${REPO_NAME}:alpha-stretch

  docker build -f ./docker/alpine3.12.dockerfile . \
  -t ${REPO_NAME}:alpha-alpine \
  -t ${REPO_NAME}:alpha-alpine3.12

  docker push ${REPO_NAME}:alpha
  docker push ${REPO_NAME}:alpha-stretch
  docker push ${REPO_NAME}:alpha-alpine
  docker push ${REPO_NAME}:alpha-alpine3.12
fi

# Versioned tags are updated for all versions
docker build -f ./docker/stretch.dockerfile . \
-t ${REPO_NAME}:${PACKAGE_VERSION} \
-t ${REPO_NAME}:${PACKAGE_VERSION}-stretch

docker build -f ./docker/alpine3.12.dockerfile . \
-t ${REPO_NAME}:${PACKAGE_VERSION}-alpine \
-t ${REPO_NAME}:${PACKAGE_VERSION}-alpine3.12

docker push ${REPO_NAME}:${PACKAGE_VERSION}
docker push ${REPO_NAME}:${PACKAGE_VERSION}-stretch
docker push ${REPO_NAME}:${PACKAGE_VERSION}-alpine
docker push ${REPO_NAME}:${PACKAGE_VERSION}-alpine3.12
