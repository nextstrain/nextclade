#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail
trap "exit" INT

REPO_NAME="neherlab/nextclade"
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

if [ $GIT_BRANCH == "release" ] && [ -z $(echo $PACKAGE_VERSION | grep '(alpha|beta)') ]; then
  NPM_TAG=latest
elif [ $GIT_BRANCH == "staging" ] && [ ! -z $(echo $PACKAGE_VERSION | grep beta) ]; then
  NPM_TAG=beta
elif [ $GIT_BRANCH == "alpha" ] && [ ! -z $(echo $PACKAGE_VERSION | grep alpha) ]; then
  NPM_TAG=alpha
else
  printf "Error: The package.json version does not correspond to the git branch name. The branch is $GIT_BRANCH, while package.json version is $PACKAGE_VERSION.\nHere is the list of accepted combinations:\n - release: version should not contains words 'alpha' or 'beta'\n - staging: version should contain word 'beta'\n - master: version should contain word 'alpha'\nPublishing from any other branches is not allowed."
  exit 1
fi

npm publish --tag=${NPM_TAG}

docker build -f ./docker/stretch.dockerfile . \
-t ${REPO_NAME}:latest \
-t ${REPO_NAME}:latest-stretch \
-t ${REPO_NAME}:${PACKAGE_VERSION} \
-t ${REPO_NAME}:${PACKAGE_VERSION}-stretch

docker build -f ./docker/alpine3.12.dockerfile . \
-t ${REPO_NAME}:alpine \
-t ${REPO_NAME}:alpine3.12 \
-t ${REPO_NAME}:${PACKAGE_VERSION}-alpine \
-t ${REPO_NAME}:${PACKAGE_VERSION}-alpine3.12

docker push ${REPO_NAME}
