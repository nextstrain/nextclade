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

emcmake cmake "${THIS_DIR}" \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCMAKE_VERBOSE_MAKEFILE=1 \
  -DCMAKE_COLOR_MAKEFILE=1 \
  -DCMAKE_EXPORT_COMPILE_COMMANDS=1

emmake make -j 8

popd >/dev/null

run-clang-tidy -quiet -p "${BUILD_DIR}" \
  -extra-arg="--target=wasm32-unknown-emscripten" \
  -extra-arg="-D__EMSCRIPTEN__" \
  -extra-arg="-D__EMSCRIPTEN_major__=2" \
  -extra-arg="-D__EMSCRIPTEN_minor__=0" \
  -extra-arg="-D__EMSCRIPTEN_tiny__=6" \
  -extra-arg="-D_LIBCPP_ABI_VERSION=2" \
  -extra-arg="-Dunix" \
  -extra-arg="-D__unix" \
  -extra-arg="-D__unix__" \
  -extra-arg="-m32" \
  -extra-arg="-msse" \
  -extra-arg="-msse2" \
  -extra-arg="-msse3" \
  -extra-arg="-mssse3" \
  -extra-arg="-msse4.1" \
  -extra-arg="-msse4.2" \
  -extra-arg="-mavx" \
  -extra-arg="-mfpu=neon" \
  -extra-arg="-isystem${EMSDK}/upstream/emscripten/system/lib/libc/musl/arch/emscripten" \
  -extra-arg="-isystem${EMSDK}/upstream/emscripten/system/lib/libc/musl/arch/js" \
  -extra-arg="-isystem${EMSDK}/upstream/emscripten/system/local/include" \
  -extra-arg="-isystem${EMSDK}/upstream/emscripten/system/include/compat" \
  -extra-arg="-isystem${EMSDK}/upstream/emscripten/system/include" \
  -extra-arg="-isystem${EMSDK}/upstream/emscripten/system/include/libcxx" \
  -extra-arg="-isystem${EMSDK}/upstream/emscripten/system/lib/compiler-rt/include" \
  -extra-arg="-isystem${EMSDK}/upstream/emscripten/system/lib/libcxxabi/include" \
  -extra-arg="-isystem${EMSDK}/upstream/emscripten/system/include/libc" \
  -extra-arg="-isystem${EMSDK}/upstream/emscripten/system/include/gfx" \
  -extra-arg="-isystem${EMSDK}/upstream/emscripten/system/include/SDL" \
  -extra-arg="-isystem${EMSDK}/upstream/emscripten/lib/clang/12.0.0/include"

cp ${BUILD_DIR}/*.{js,map,wasm} "${RESULT_DIR}"

echo "done"
