#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail
trap "exit" INT

THIS_SCRIPT="$(basename ${0})"

: "${1:?"Error: Pass the path where you want NVM and Node.js to be installed as well as desired Node,js version, for example \`./${THIS_SCRIPT} ~/opt/nvm 14.17.0\`"}"
: "${2:?"Error: Pass the path where you want NVM and Node.js to be installed as well as desired Node,js version, for example \`./${THIS_SCRIPT} ~/opt/nvm 14.17.0\`"}"

NVM_DIR="${1}"
NODE_VERSION="${2:-latest}"

URL="https://github.com/creationix/nvm.git"
BRANCH="master"

if [ ! -d ${NVM_DIR} ]; then
  git clone --recursive --depth 1 -b "${BRANCH}" "${URL}" "${NVM_DIR}"
else
  pushd "${NVM_DIR}" >/dev/null
    git pull
  popd >/dev/null
fi

. ${NVM_DIR}/nvm.sh

nvm install ${NODE_VERSION} \
nvm alias default ${NODE_VERSION} || true \

pushd "${NVM_DIR}/versions/node" >/dev/null
  ln -s "v${NODE_VERSION}" default
popd >/dev/null
