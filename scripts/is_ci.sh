#!/usr/bin/env bash

set -euo pipefail

# Checks whether we are running on a Continuous integration server
function is_ci() {
  if false ||
    [ "${BUILD_ID:=}" == "1" ] || [ "${BUILD_ID:=}" == "true" ] ||
    [ "${CI:=}" == "1" ] || [ "${CI:=}" == "true" ] ||
    [ "${CIRCLECI:=}" == "1" ] || [ "${CIRCLECI:=}" == "true" ] ||
    [ "${CIRRUS_CI:=}" == "1" ] || [ "${CIRRUS_CI:=}" == "true" ] ||
    [ "${CODEBUILD_BUILD_ID:=}" == "1" ] || [ "${CODEBUILD_BUILD_ID:=}" == "true" ] ||
    [ "${GITHUB_ACTIONS:=}" == "1" ] || [ "${GITHUB_ACTIONS:=}" == "true" ] ||
    [ "${GITLAB_CI:=}" == "1" ] || [ "${GITLAB_CI:=}" == "true" ] ||
    [ "${HEROKU_TEST_RUN_ID:=}" == "1" ] || [ "${HEROKU_TEST_RUN_ID:=}" == "true" ] ||
    [ "${TEAMCITY_VERSION:=}" == "1" ] || [ "${TEAMCITY_VERSION:=}" == "true" ] ||
    [ "${TF_BUILD:=}" == "1" ] || [ "${TF_BUILD:=}" == "true" ] ||
    [ "${TRAVIS:=}" == "1" ] || [ "${TRAVIS:=}" == "true" ] \
    ; then
    echo "1"
  else
    echo "0"
  fi
}
