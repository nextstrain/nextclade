set -o errexit
set -o nounset
set -o pipefail
trap "exit" INT

THIS_DIR=$(
  cd $(dirname "${BASH_SOURCE[0]}")
  pwd
)

set -x

BUILD_DIR="${THIS_DIR}/.build/Debug"
RESULT_DIR="${THIS_DIR}/../web/src/wasm/"

mkdir -p "${BUILD_DIR}"
rm -rf "${BUILD_DIR}/*"

pushd "${BUILD_DIR}" >/dev/null

emcmake cmake .. \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_VERBOSE_MAKEFILE=1

emmake make -j 8

cp *.js *.map *.wasm "${RESULT_DIR}"

popd >/dev/null

echo "done"
