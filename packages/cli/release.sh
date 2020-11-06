#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail
trap "exit" INT

HOTFIX=0

while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
  --hotfix)
    HOTFIX=1
    shift
    ;;
  esac
done

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
elif [ $GIT_BRANCH == "staging" ]; then
  NPM_TAG=beta
elif [ $GIT_BRANCH == "master" ]; then
  NPM_TAG=alpha
else
  printf "Error: The package.json version does not correspond to the git branch name. The branch is $GIT_BRANCH, while package.json version is $PACKAGE_VERSION."
  exit 1
fi

docker_push_stable() {
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
}

docker_push_versioned() {
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
}

docker_push_stable() {
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
}

docker_push_beta() {
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
}

docker_push_alpha() {
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
}

main() {
  if [ $NPM_TAG == "latest" ]; then
    # Publish stable versions to all channels, unless it's a hotfix
    if [ $HOTFIX = 1 ]; then
      echo "Publishing ${PACKAGE_VERSION} (hotfix) to channels: stable"
    else
      echo "Publishing ${PACKAGE_VERSION} to channels: stable, beta, alpha"
    fi

    npm publish --tag=latest
    docker_push_versioned
    docker_push_stable

    if [ ! $HOTFIX = 1 ]; then
      npm publish --tag=beta
      npm publish --tag=alpha
      docker_push_beta
      docker_push_alpha
    fi
  fi

  if [ $NPM_TAG == "beta" ]; then
    # Publish beta quality versions to 'beta' and 'alpha' channels, unless it's a hotfix
    if [ $HOTFIX = 1 ]; then
      echo "Publishing ${PACKAGE_VERSION} (hotfix) to channels: beta"
    else
      echo "Publishing ${PACKAGE_VERSION} to channels: beta, alpha"
    fi

    npm publish --tag=beta
    docker_push_versioned
    docker_push_beta

    if [ ! $HOTFIX = 1 ]; then
      npm publish --tag=alpha
      docker_push_alpha
    fi
  fi

  # These are only updated for alphas
  if [ $NPM_TAG == "alpha" ]; then
    # Publish alpha quality versions only to and 'alpha' channel
    echo "Publishing ${PACKAGE_VERSION} to channels: alpha"

    npm publish --tag=alpha
    docker_push_versioned
    docker_push_alpha
  fi
}

main
