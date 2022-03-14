#!/usr/bin/env bash

BASH_DEBUG="${BASH_DEBUG:=}"
([ "${BASH_DEBUG}" == "true" ] || [ "${BASH_DEBUG}" == "1" ] ) && set -o xtrace
set -o errexit
set -o nounset
set -o pipefail
shopt -s dotglob
trap "exit" INT

# Install these for clang support:
# sudo apt-get install --verbose-versions llvm-10 clang{,-tools,-tidy,-format}-10 llvm-10 libclang-common-10-dev

# Directory where this script resides
THIS_DIR=$(cd $(dirname "${BASH_SOURCE[0]}"); pwd)

# Where the source code is
PROJECT_ROOT_DIR="$(realpath --logical --no-symlinks "${THIS_DIR}/..")"

source "${THIS_DIR}/lib/set_locales.sh"
source "${THIS_DIR}/lib/is_ci.sh"

DATA_DIR="${PROJECT_ROOT_DIR}/data_dev"

[ -n "${NEXTCLADE_EMSDK_DIR:=}" ] && NEXTCLADE_EMSDK_DIR_FROM_ENV="${NEXTCLADE_EMSDK_DIR}"
[ -n "${NEXTCLADE_EMSDK_VERSION:=}" ] && NEXTCLADE_EMSDK_VERSION_FROM_ENV="${NEXTCLADE_EMSDK_VERSION}"

source "${PROJECT_ROOT_DIR}/.env.example"
if [ -f "${PROJECT_ROOT_DIR}/.env" ]; then
  source "${PROJECT_ROOT_DIR}/.env"
fi

[ -n "${NEXTCLADE_EMSDK_DIR_FROM_ENV:=}" ] && NEXTCLADE_EMSDK_DIR="${NEXTCLADE_EMSDK_DIR_FROM_ENV}"
[ -n "${NEXTCLADE_EMSDK_VERSION_FROM_ENV:=}" ] && NEXTCLADE_EMSDK_VERSION="${NEXTCLADE_EMSDK_VERSION_FROM_ENV}"

PROJECT_NAME="nextalign"
BUILD_PREFIX="${BUILD_PREFIX:-}"
BUILD_SUFFIX="${BUILD_SUFFIX:-}"

export NEXTCLADE_EMSDK_VERSION_DEFAULT=2.0.6
export NEXTCLADE_EMSDK_VERSION=${NEXTCLADE_EMSDK_VERSION:=${NEXTCLADE_EMSDK_VERSION_DEFAULT}}
export NEXTCLADE_EMSDK_DIR_DEFAULT="${PROJECT_ROOT_DIR}/.cache/.emscripten/emsdk-${NEXTCLADE_EMSDK_VERSION}"
export NEXTCLADE_EMSDK_DIR=${NEXTCLADE_EMSDK_DIR:=${NEXTCLADE_EMSDK_DIR_DEFAULT}}
export NEXTCLADE_EMSDK_USE_CACHE="${NEXTCLADE_EMSDK_USE_CACHE:=1}"

NEXTCLADE_EMSDK_CACHE=""
if [ "${NEXTCLADE_EMSDK_USE_CACHE}" == "1" ]; then
  export NEXTCLADE_EMSDK_CACHE_DEFAULT="${PROJECT_ROOT_DIR}/.cache/.emscripten/emsdk_cache-${NEXTCLADE_EMSDK_VERSION}"
  export NEXTCLADE_EMSDK_CACHE="${NEXTCLADE_EMSDK_CACHE:=${NEXTCLADE_EMSDK_CACHE_DEFAULT}}"
fi

# Check whether we are running on a Continuous integration server
IS_CI=${IS_CI:=$(is_ci)}

# Name of the operating system we are running this script on: Linux, Darwin (we rename it to MacOS below)
BUILD_OS="$(uname -s)"
if [ "${BUILD_OS}" == "Darwin" ]; then
  BUILD_OS="MacOS"
fi

# Name of the operating system for which we will build the binaries. Default is the same as build OS
HOST_OS="${HOST_OS:=${BUILD_OS}}"
if [ "${HOST_OS}" == "Darwin" ]; then
  HOST_OS="MacOS"
fi

# Name of the processor architecture we are running this script on: x86_64, arm64
BUILD_ARCH="$(uname -p || uname -m)"
if [ "${BUILD_OS}" == "MacOS" ] && [ ${BUILD_ARCH} == "i386" ]; then
  # x86_64 is called i386 on macOS, fix that
  BUILD_ARCH="x86_64"
fi

# Name of the processor architecture for which we will build the binaries. Default is the same as build arch
HOST_ARCH=${HOST_ARCH:=${BUILD_ARCH}}

# Whether we are cross-compiling for another operating system or another processor architecture
CROSS=0
if [ "${BUILD_OS}" != "${HOST_OS}" ] || [ "${BUILD_ARCH}" != "${HOST_ARCH}" ]; then
  CROSS=1
fi

# Minimum target version of macOS. End up in `-mmacosx-version-min=` flag of AppleClang
OSX_MIN_VER=${OSX_MIN_VER:=10.12}

# Build type (default: Release)
CMAKE_BUILD_TYPE="${CMAKE_BUILD_TYPE:=Release}"

# Whether to produce Webassembly with Emscripten
export NEXTCLADE_BUILD_WASM="${NEXTCLADE_BUILD_WASM:=0}"

# Debug wasm build is too slow, always do optimized build
if [ "${NEXTCLADE_BUILD_WASM}" == "1" ]; then
  CMAKE_BUILD_TYPE="Release"
fi

# Deduce conan build type from cmake build type
CONAN_BUILD_TYPE=${CMAKE_BUILD_TYPE}
case ${CMAKE_BUILD_TYPE} in
  Debug|Release|RelWithDebInfo|MinSizeRelease) CONAN_BUILD_TYPE=${CMAKE_BUILD_TYPE} ;;
  ASAN|MSAN|TSAN|UBSAN) CONAN_BUILD_TYPE=RelWithDebInfo ;;
  *) CONAN_BUILD_TYPE="Release" ;;
esac

ADDITIONAL_PATH="${PROJECT_ROOT_DIR}/3rdparty/binutils/bin:${PROJECT_ROOT_DIR}/3rdparty/gcc/bin:${PROJECT_ROOT_DIR}/3rdparty/llvm/bin"
export PATH="${ADDITIONAL_PATH}${PATH:+:$PATH}"

# Whether to use Clang Analyzer
USE_CLANG_ANALYZER="${USE_CLANG_ANALYZER:=0}"
CLANG_ANALYZER=""
if [ "${USE_CLANG_ANALYZER}" == "true" ] || [ "${USE_CLANG_ANALYZER}" == "1" ]; then
  CLANG_ANALYZER="scan-build -v --keep-going -o ${PROJECT_ROOT_DIR}/.reports/clang-analyzer"
  USE_CLANG=1
  mkdir -p "${PROJECT_ROOT_DIR}/.reports/clang-analyzer"
fi

# Whether to use Clang C++ compiler (default: use GCC)
USE_CLANG="${USE_CLANG:=0}"

# Whether to use libc++ as a C++ standard library implementation
USE_LIBCPP="${USE_LIBCPP:=0}"

# Whether to use MinGW GCC C++ compiler for cross-compiling for Windows (default: no)
USE_MINGW="${USE_MINGW:=0}"

INSTALL_DIR="${PROJECT_ROOT_DIR}/.out"

NEXTALIGN_BUILD_CLI=${NEXTALIGN_BUILD_CLI:=1}
NEXTALIGN_BUILD_BENCHMARKS=${NEXTALIGN_BUILD_BENCHMARKS:=0}
NEXTALIGN_BUILD_TESTS=${NEXTALIGN_BUILD_TESTS:=1}
NEXTCLADE_BUILD_CLI=${NEXTALIGN_BUILD_CLI:=1}
#NEXTCLADE_BUILD_BENCHMARKS=${NEXTCLADE_BUILD_BENCHMARKS:=0}
NEXTCLADE_BUILD_TESTS=${NEXTCLADE_BUILD_TESTS:=1}
NEXTCLADE_CLI_BUILD_TESTS=${NEXTCLADE_CLI_BUILD_TESTS:=1}

CONAN_ARCH_SETTINGS="-s arch=${HOST_ARCH}"
if [ "${HOST_OS}" == "MacOS" ] && [ "${HOST_ARCH}" == "arm64" ]; then
  # Conan uses different name for macOS arm64 architecture
  CONAN_ARCH_SETTINGS="\
    -s arch=armv8 \
  "
fi

if [ "${HOST_OS}" == "MacOS" ]; then
  # Conan uses different name for macOS arm64 architecture
  CONAN_COMPILER_SETTINGS="\
    ${CONAN_COMPILER_SETTINGS:-} \
    -s os.version=${OSX_MIN_VER} \
  "
fi


MORE_CMAKE_FLAGS=""
if [ "${USE_CLANG}" == "true" ] || [ "${USE_CLANG}" == "1" ]; then
  export CC="${CC:-clang}"
  export CXX="${CXX:-clang++}"
  export CMAKE_C_COMPILER=${CC}
  export CMAKE_CXX_COMPILER=${CXX}

  CLANG_VERSION_DETECTED=$(${CC} --version | grep "clang version" | awk -F ' ' {'print $3'} | awk -F \. {'print $1'})
  CLANG_VERSION=${CLANG_VERSION:=${CLANG_VERSION_DETECTED}}

  CONAN_COMPILER_SETTINGS="\
    ${CONAN_COMPILER_SETTINGS:-}
    -s compiler=clang \
    -s compiler.version=${CLANG_VERSION} \
  "

  MORE_CMAKE_FLAGS="\
    ${MORE_CMAKE_FLAGS} \
    -DCMAKE_C_COMPILER=${CMAKE_C_COMPILER} \
    -DCMAKE_CXX_COMPILER=${CMAKE_CXX_COMPILER} \
  "

  if [ "${USE_LIBCPP}" == "true" ] || [ "${USE_LIBCPP}" == "1" ]; then
    export CMAKE_CXX_FLAGS="-stdlib=libc++"
    export CMAKE_EXE_LINKER_FLAGS="-stdlib=libc++"
    export CMAKE_SHARED_LINKER_FLAGS="-stdlib=libc++"

    CONAN_COMPILER_SETTINGS="\
      ${CONAN_COMPILER_SETTINGS:-}
      -s compiler.libcxx=libc++ \
    "

    MORE_CMAKE_FLAGS="\
      ${MORE_CMAKE_FLAGS} \
      -DCMAKE_CXX_FLAGS=${CMAKE_CXX_FLAGS:-} \
      -DCMAKE_EXE_LINKER_FLAGS=${CMAKE_EXE_LINKER_FLAGS} \
      -DCMAKE_SHARED_LINKER_FLAGS=${CMAKE_SHARED_LINKER_FLAGS} \
    "
  else
    CONAN_COMPILER_SETTINGS="\
      ${CONAN_COMPILER_SETTINGS:-}
      -s compiler.libcxx=libstdc++11 \
    "
  fi

  BUILD_SUFFIX="${BUILD_SUFFIX:-}-Clang"
fi

EMSDK_CLANG_VERSION="${EMSDK_CLANG_VERSION:=11}"
EMCMAKE=""
EMMAKE=""
CONAN_COMPILER_SETTINGS="${CONAN_COMPILER_SETTINGS:=}"
CONANFILE="${PROJECT_ROOT_DIR}/conanfile.txt"
NEXTCLADE_EMSCRIPTEN_COMPILER_FLAGS=""
if [ "${NEXTCLADE_BUILD_WASM}" == "true" ] || [ "${NEXTCLADE_BUILD_WASM}" == "1" ]; then
  CONANFILE="${PROJECT_ROOT_DIR}/conanfile.wasm.txt"

  CONAN_COMPILER_SETTINGS="\
    --profile="${PROJECT_ROOT_DIR}/config/conan/conan_profile_emscripten_wasm.txt" \
    -s compiler=clang \
    -s compiler.version=${EMSDK_CLANG_VERSION} \
  "

  NEXTCLADE_EMSCRIPTEN_COMPILER_FLAGS=" \
    -frtti \
    -fexceptions \
    --bind \
    --source-map-base './' \
    -s MODULARIZE=1 \
    -s EXPORT_ES6=1 \
    -s WASM=1 \
    -s DISABLE_EXCEPTION_CATCHING=2 \
    -s DEMANGLE_SUPPORT=1 \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s MALLOC=emmalloc \
    -s ENVIRONMENT=worker \
    -s DYNAMIC_EXECUTION=0 \
  "

  #  -fexceptions \
  #  -s DISABLE_EXCEPTION_CATCHING=2 \
  #  -s ALIASING_FUNCTION_POINTERS=0 \
  #  --profiling \
  #  -s EXCEPTION_DEBUG=1 \
  #  -g4 \
  #  -O0 \
  #  -s ASSERTIONS=1 \
  #  -s SAFE_HEAP=1 \
  #  -s STACK_OVERFLOW_CHECK=2 \

  BUILD_SUFFIX="${BUILD_SUFFIX:-}-Wasm"
  INSTALL_DIR="${PROJECT_ROOT_DIR}/packages/web/src/generated/"

  EMCMAKE="emcmake"
  EMMAKE="emmake"

  NEXTALIGN_BUILD_CLI=0
  NEXTALIGN_BUILD_BENCHMARKS=0
  NEXTALIGN_BUILD_TESTS=0
  NEXTCLADE_BUILD_CLI=0
  NEXTCLADE_BUILD_BENCHMARKS=0
  NEXTCLADE_BUILD_TESTS=0
  NEXTCLADE_CLI_BUILD_TESTS=0
fi


USE_COLOR="${USE_COLOR:=1}"
if [ "${IS_CI}" == "1" ] || [ "${IS_CI}" == "true" ]; then
  USE_COLOR="0"
fi

# Whether to build a standalone static executable
NEXTALIGN_STATIC_BUILD_DEFAULT=0
if [ "${CMAKE_BUILD_TYPE}" == "Release" ]; then
  NEXTALIGN_STATIC_BUILD_DEFAULT=1
elif [ "${CMAKE_BUILD_TYPE}" == "ASAN" ] || [ "${CMAKE_BUILD_TYPE}" == "MSAN" ] || [ "${CMAKE_BUILD_TYPE}" == "TSAN" ] || [ "${CMAKE_BUILD_TYPE}" == "UBSAN" ] ; then
  NEXTALIGN_STATIC_BUILD_DEFAULT=0
fi
NEXTALIGN_STATIC_BUILD=${NEXTALIGN_STATIC_BUILD:=${NEXTALIGN_STATIC_BUILD_DEFAULT}}

CONAN_STATIC_BUILD_FLAGS="\
  -o cpr:with_ssl=openssl \
  -o libcurl:with_c_ares=True \
  -o libcurl:with_ssl=openssl \
  -o libcurl:with_zlib=True \
  -o poco:enable_active_record=False \
  -o poco:enable_apacheconnector=False \
  -o poco:enable_cppparser=False \
  -o poco:enable_crypto=False \
  -o poco:enable_data=False \
  -o poco:enable_data_mysql=False \
  -o poco:enable_data_odbc=False \
  -o poco:enable_data_postgresql=False \
  -o poco:enable_data_sqlite=False \
  -o poco:enable_encodings=False \
  -o poco:enable_json=False \
  -o poco:enable_jwt=False \
  -o poco:enable_mongodb=False \
  -o poco:enable_net=False \
  -o poco:enable_netssl=False \
  -o poco:enable_pagecompiler=False \
  -o poco:enable_pagecompiler_file2page=False \
  -o poco:enable_pdf=False \
  -o poco:enable_pocodoc=False \
  -o poco:enable_redis=False \
  -o poco:enable_sevenzip=False \
  -o poco:enable_util=False \
  -o poco:enable_xml=False \
  -o poco:enable_zip=False \
"

# Add flags necessary for static build
CONAN_STATIC_BUILD_FLAGS="-o boost:header_only=True -o fmt:header_only=True"
CONAN_TBB_STATIC_BUILD_FLAGS=""
TARGET_TRIPLET="x86_64-linux-gnu"
if [ "${NEXTALIGN_STATIC_BUILD}" == "1" ]; then
  CONAN_STATIC_BUILD_FLAGS="\
    ${CONAN_STATIC_BUILD_FLAGS} \
    -o c-ares:shared=False \
    -o cpr:shared=False \
    -o gtest:shared=False \
    -o libcurl:shared=False \
    -o openssl:shared=False \
    -o tbb:shared=False \
    -o zlib:shared=False \
    -o poco:shared=False \
  "

  CONAN_TBB_STATIC_BUILD_FLAGS="-o shared=False"

  if [ "${HOST_OS}" == "Linux" ]  && [ "${NEXTCLADE_BUILD_WASM}" != "1" ]; then

  # Download libmusl-based GCC
  GCC_DIR="${PROJECT_ROOT_DIR}/.cache/gcc"
  if [ ! -f "${GCC_DIR}/bin/x86_64-linux-musl-gcc" ]; then
    mkdir -p "${GCC_DIR}"
    pushd "${GCC_DIR}" >/dev/null
      GCC_URL="https://github.com/ivan-aksamentov/musl-cross-make/releases/download/v1/gcc-x86_64-linux-musl.tar.gz"
      echo "Downloading GCC from ${GCC_URL}"
      curl -fsSL "${GCC_URL}" | tar xfz - --strip-components=1
    popd >/dev/null
  fi

  export PATH="${GCC_DIR}/bin:${PATH}"

  TARGET_TRIPLET="x86_64-linux-musl"
  export CONAN_CMAKE_SYSROOT="${GCC_DIR}"
  export CONAN_CMAKE_FIND_ROOT_PATH="${GCC_DIR}"
  export LD_LIBRARY_PATH="${GCC_DIR}/x86_64-linux-musl/lib:${LD_LIBRARY_PATH:-}"

  pushd "${GCC_DIR}/bin" >/dev/null
    if [ ! -e "gcc" ]    ; then ln -s "${TARGET_TRIPLET}-gcc" gcc           ;fi
    if [ ! -e "g++" ]    ; then ln -s "${TARGET_TRIPLET}-g++" g++           ;fi
    if [ ! -e "ar" ]     ; then ln -s "${TARGET_TRIPLET}-gcc-ar" ar         ;fi
    if [ ! -e "nm" ]     ; then ln -s "${TARGET_TRIPLET}-gcc-nm" nm         ;fi
    if [ ! -e "ranlib" ] ; then ln -s "${TARGET_TRIPLET}-gcc-ranlib" ranlib ;fi
    if [ ! -e "as" ]     ; then ln -s "${TARGET_TRIPLET}-as" as             ;fi
    if [ ! -e "strip" ]  ; then ln -s "${TARGET_TRIPLET}-strip" strip       ;fi
    if [ ! -e "ld" ]     ; then ln -s "${TARGET_TRIPLET}-ld" ld             ;fi
    # if [ ! -e "ldd"     ]; then ln -s "ld" ldd                              ;fi
    if [ ! -e "objcopy" ]; then ln -s "${TARGET_TRIPLET}-objcopy" objcopy   ;fi
    if [ ! -e "objdump" ]; then ln -s "${TARGET_TRIPLET}-objdump" objdump   ;fi
  popd >/dev/null

  export CHOST="${TARGET_TRIPLET}"
  export CC="${GCC_DIR}/bin/gcc"
  export CXX="${GCC_DIR}/bin/g++"
  export AR="${GCC_DIR}/bin/ar"
  export NM="${GCC_DIR}/bin/nm"
  export RANLIB="${GCC_DIR}/bin/ranlib"
  export AS="${GCC_DIR}/bin/as"
  export STRIP="${GCC_DIR}/bin/strip"
  export LD="${GCC_DIR}/bin/ld"
  export OBJCOPY="${GCC_DIR}/bin/objcopy"
  export OBJDUMP="${GCC_DIR}/bin/objdump"

  export CFLAGS="-D__MUSL__"
  export CXXFLAGS="-D__MUSL__"
  export CMAKE_C_FLAGS="${CFLAGS:-}"
  export CMAKE_CXX_FLAGS="${CXXFLAGS:-}"

  export CMAKE_TOOLCHAIN_FILE="${PROJECT_ROOT_DIR}/config/cmake/musl.toolchain.cmake"
  export CONAN_CMAKE_TOOLCHAIN_FILE="${CMAKE_TOOLCHAIN_FILE}"

  export AC_CANONICAL_HOST="${TARGET_TRIPLET}"

  CONAN_STATIC_BUILD_FLAGS="\
    ${CONAN_STATIC_BUILD_FLAGS} \
    -e PATH=${PATH} \
    -e CHOST=${CHOST} \
    -e HOST=${TARGET_TRIPLET} \
    -e AC_CANONICAL_HOST=${TARGET_TRIPLET} \
    -e CC=${CC} \
    -e CXX=${CXX} \
    -e AS=${AS} \
    -e AR=${AR} \
    -e RANLIB=${RANLIB} \
    -e STRIP=${STRIP} \
    -e LD=${LD} \
    -e NM=${NM} \
    -e OBJCOPY=${OBJCOPY} \
    -e OBJDUMP=${OBJDUMP} \
    -e STRIP=${STRIP} \
    -s os=Linux \
    -s arch=x86_64 \
    -s compiler=gcc \
    -s compiler.libcxx=libstdc++11 \
  "

  BUILD_SUFFIX="${BUILD_SUFFIX:-}-Static"

  fi
fi

if [ "${USE_MINGW}" == "true" ] || [ "${USE_MINGW}" == "1" ]; then
  NEXTALIGN_BUILD_BENCHMARKS=0
  NEXTALIGN_BUILD_TESTS=0

  NEXTCLADE_BUILD_BENCHMARKS=0
  NEXTCLADE_BUILD_TESTS=0
  NEXTCLADE_CLI_BUILD_TESTS=0

  CONAN_STATIC_BUILD_FLAGS="\
    ${CONAN_STATIC_BUILD_FLAGS} \
    --profile ${PROJECT_ROOT_DIR}/config/conan/mingw-profile.txt \
  "
fi

if [ "${HOST_OS}" == "MacOS" ]; then
  # Avoid compiler error:
  # error: aligned deallocation function of type 'void (void *, std::size_t, std::align_val_t) noexcept' is only available on macOS 10.14 or newer
  # note: if you supply your own aligned allocation functions, use -faligned-allocation to silence this diagnostic
  export CXX_FLAGS="${CXX_FLAGS:-} -faligned-allocation"
  export CMAKE_CXX_FLAGS="${CMAKE_CXX_FLAGS:-} -faligned-allocation"

  ADDITIONAL_PATH="/local/opt/m4/bin"
  export PATH="${ADDITIONAL_PATH}${PATH:+:$PATH}"
fi


BUILD_TYPE_EXTENDED=${BUILD_PREFIX}${CMAKE_BUILD_TYPE}${BUILD_SUFFIX}
export CONAN_USER_HOME="${CONAN_USER_HOME:=${PROJECT_ROOT_DIR}/.cache/${BUILD_TYPE_EXTENDED}}"
export CCACHE_DIR="${CCACHE_DIR:=${PROJECT_ROOT_DIR}/.cache/${BUILD_TYPE_EXTENDED}/.ccache}"
BUILD_DIR_DEFAULT="${PROJECT_ROOT_DIR}/.build/${BUILD_TYPE_EXTENDED}"
BUILD_DIR="${BUILD_DIR:=${BUILD_DIR_DEFAULT}}"


function get_cli() {
  NAME=${1}

  CLI_DIR="${BUILD_DIR}/packages/${NAME}_cli"
  CLI_EXE="${NAME}-${HOST_OS}-${HOST_ARCH}"

  CLI="${CLI_DIR}/${CLI_EXE}"
  if [ "${CMAKE_BUILD_TYPE}" == "Release" ]; then
    CLI=${INSTALL_DIR}/bin/${CLI_EXE}
  fi

  echo "${CLI}"
}

NEXTALIGN_CLI=$(get_cli "nextalign")
NEXTCLADE_CLI=$(get_cli "nextclade")


DEV_CLI_OPTIONS="${DEV_CLI_OPTIONS:=}"

# gdb (or lldb) command with arguments
GDB_DEFAULT=

if [ "${BUILD_OS}" == "MacOS" ]; then
  if command -v "lldb"; then
    GDB_DEFAULT="lldb --batch --source-on-crash ${THIS_DIR}/lib/.lldb-on-crash --source ${THIS_DIR}/lib/.lldb-source --"
  fi > /dev/null
elif command -v "gdb"; then
  GDB_DEFAULT="gdb --quiet -ix ${THIS_DIR}/lib/.gdbinit -x ${THIS_DIR}/lib/.gdbexec --args"
fi > /dev/null

# AddressSanitizer and MemorySanitizer don't work with gdb
case ${CMAKE_BUILD_TYPE} in
  ASAN|MSAN|UBSAN) GDB_DEFAULT="" ;;
  *) ;;
esac

case ${CMAKE_BUILD_TYPE} in
  ASAN|MSAN|TSAN|UBSAN) NEXTALIGN_BUILD_BENCHMARKS=0; NEXTALIGN_BUILD_TESTS=0 NEXTCLADE_BUILD_BENCHMARKS=0 NEXTCLADE_BUILD_TESTS=0 NEXTCLADE_CLI_BUILD_TESTS=0 ;;
  *) ;;
esac

if [ "${IS_CI}" == "1" ]; then
  GDB_DEFAULT=""
fi
GDB="${GDB:=${GDB_DEFAULT}}"

USE_VALGRIND="${USE_VALGRIND:=0}"
VALGRIND_DEFAULT=""
if [ "${USE_VALGRIND}" == "1" ] || [ "${USE_VALGRIND}" == "true" ]; then
  NEXTALIGN_STATIC_BUILD=0

  VALGRIND_DEFAULT="\
  valgrind \
  --tool=memcheck \
  --error-limit=no \
  "

  GDB="${VALGRIND:=${VALGRIND_DEFAULT}}"
fi

USE_MASSIF="${USE_MASSIF:=0}"
if [ "${USE_MASSIF}" == "1" ] || [ "${USE_MASSIF}" == "true" ]; then
  NEXTALIGN_STATIC_BUILD=0

  VALGRIND_DEFAULT="\
  valgrind \
  --tool=massif \
  --error-limit=no \
  "

  GDB="${VALGRIND:=${VALGRIND_DEFAULT}}"
fi


# gttp (Google Test Pretty Printer) command
GTTP_DEFAULT=
if python3 -c "import colorama" 2>/dev/null; then
  GTTP_DEFAULT="${THIS_DIR}/lib/gtpp.py"
fi >/dev/null

if [ "${IS_CI}" == "1" ]; then
  GTTP_DEFAULT=""
fi
GTPP="${GTPP:=${GTTP_DEFAULT}}"

## Generate a semicolon-delimited list of arguments for cppcheck
## (to run during cmake build). The arguments are taken from the file
## `.cppcheck` in the source root
#CMAKE_CXX_CPPCHECK=""
#if command -v "cppcheck"; then
#  CMAKE_CXX_CPPCHECK="cppcheck;--template=gcc"
#  while IFS='' read -r flag; do
#    CMAKE_CXX_CPPCHECK="${CMAKE_CXX_CPPCHECK};${flag}"
#  done<"${THIS_DIR}/../.cppcheck"
#fi > /dev/null

# Print coloured message
function print() {
  if [ ! -z "${USE_COLOR}" ] && [ "${USE_COLOR}" != "false" ] && [ "${USE_COLOR}" != "0" ]; then
    echo -en "\n\033[48;5;${1}m - ${2} \t\033[0m\n";
  else
    printf "\n${2}\n";
  fi
}

export COMPILER_FLAGS="-fno-builtin-malloc -fno-builtin-calloc -fno-builtin-realloc -fno-builtin-free"

export CFLAGS="${CFLAGS:-} ${COMPILER_FLAGS}"
export CXXFLAGS="${CXXFLAGS:-} ${COMPILER_FLAGS}"
export CMAKE_C_FLAGS="${CMAKE_C_FLAGS:-} ${COMPILER_FLAGS}"
export CMAKE_CXX_FLAGS="${CMAKE_CXX_FLAGS:-} ${COMPILER_FLAGS}"

echo "-------------------------------------------------------------------------"
echo "PROJECT_NAME   = ${PROJECT_NAME:=}"
echo ""
echo "BUILD_OS       = ${BUILD_OS:=}"
echo "BUILD_ARCH     = ${BUILD_ARCH:=}"
echo "uname -a       = $(uname -a)"
echo "uname -s       = $(uname -s)"
echo "uname -p       = $(uname -p)"
echo "uname -m       = $(uname -m)"
echo ""
echo "HOST_OS        = ${HOST_OS:=}"
echo "HOST_ARCH      = ${HOST_ARCH:=}"
echo "OSX_MIN_VER    = ${OSX_MIN_VER:=}"
echo ""
echo "IS_CI          = ${IS_CI:=}"
echo "CI             = ${CI:=}"
echo "TRAVIS         = ${TRAVIS:=}"
echo "CIRCLECI       = ${CIRCLECI:=}"
echo "GITHUB_ACTIONS = ${GITHUB_ACTIONS:=}"
echo ""
echo "CMAKE_BUILD_TYPE         = ${CMAKE_BUILD_TYPE:=}"
echo "CONAN_BUILD_TYPE         = ${CONAN_BUILD_TYPE:=}"
echo "NEXTALIGN_STATIC_BUILD   = ${NEXTALIGN_STATIC_BUILD:=}"
echo ""
echo "NEXTCLADE_BUILD_WASM        = ${NEXTCLADE_BUILD_WASM}"
echo "NEXTCLADE_EMSDK_VERSION     = ${NEXTCLADE_EMSDK_VERSION}"
echo "NEXTCLADE_EMSDK_DIR         = ${NEXTCLADE_EMSDK_DIR}"
echo "NEXTCLADE_EMSDK_USE_CACHE   = ${NEXTCLADE_EMSDK_USE_CACHE}"
echo "NEXTCLADE_EMSDK_CACHE       = ${NEXTCLADE_EMSDK_CACHE}"
echo ""
echo "USE_COLOR                = ${USE_COLOR:=}"
echo "USE_CLANG                = ${USE_CLANG:=}"
echo "CLANG_VERSION            = ${CLANG_VERSION:=}"
echo "CC                       = ${CC:=}"
echo "CXX                      = ${CXX:=}"
echo "CMAKE_C_COMPILER         = ${CMAKE_C_COMPILER:=}"
echo "CMAKE_CXX_COMPILER       = ${CMAKE_CXX_COMPILER:=}"
echo "USE_CLANG_ANALYZER       = ${USE_CLANG_ANALYZER:=}"
echo ""
echo "USE_VALGRIND             = ${USE_VALGRIND:=}"
echo "USE_MASSIF               = ${USE_MASSIF:=}"
echo "GDB                      = ${GDB:=}"
echo ""
echo "CONAN_ARCH_SETTINGS          = ${CONAN_ARCH_SETTINGS:=}"
echo "CONAN_COMPILER_SETTINGS      = ${CONAN_COMPILER_SETTINGS:=}"
echo "CONAN_STATIC_BUILD_FLAGS     = ${CONAN_STATIC_BUILD_FLAGS:=}"
echo "CONAN_TBB_STATIC_BUILD_FLAGS = ${CONAN_TBB_STATIC_BUILD_FLAGS:=}"
echo ""
echo "CONAN_USER_HOME          = ${CONAN_USER_HOME:=}"
echo "CCACHE_DIR               = ${CCACHE_DIR:=}"
echo "BUILD_PREFIX             = ${BUILD_PREFIX:=}"
echo "BUILD_SUFFIX             = ${BUILD_SUFFIX:=}"
echo "BUILD_DIR                = ${BUILD_DIR:=}"
echo "INSTALL_DIR              = ${INSTALL_DIR:=}"
echo "NEXTALIGN_CLI            = ${NEXTALIGN_CLI}"
echo "NEXTCLADE_CLI            = ${NEXTCLADE_CLI}"

if [ "${NEXTALIGN_STATIC_BUILD}" == "1" ] && [ "${HOST_OS}" == "Linux" ] && [ "${NEXTCLADE_BUILD_WASM}" != "1" ]; then
echo ""
echo "CC                       = $(which ${CC})"
echo "CXX                      = $(which ${CXX})"
echo "AR                       = $(which ${AR})"
echo "AS                       = $(which ${AS})"
echo "RANLIB                   = $(which ${RANLIB})"
echo "LD                       = $(which ${LD})"
echo "NM                       = $(which ${NM})"
echo "OBJCOPY                  = $(which ${OBJCOPY})"
echo "OBJDUMP                  = $(which ${OBJDUMP})"
echo "STRIP                    = $(which ${STRIP})"
fi

echo "-------------------------------------------------------------------------"

if [ "${NEXTCLADE_BUILD_WASM}" == "true" ] || [ "${NEXTCLADE_BUILD_WASM}" == "1" ]; then
  print 92 "Install Emscripten SDK";

  if [ ! -d "${NEXTCLADE_EMSDK_DIR}" ]; then
    ./scripts/install_emscripten.sh "${NEXTCLADE_EMSDK_DIR}" "${NEXTCLADE_EMSDK_VERSION}"
  else
    echo "Emscripten SDK already found in '${NEXTCLADE_EMSDK_DIR}'. Skipping install."
  fi

  print 92 "Prepare Emscripten SDK environment";
  source "${NEXTCLADE_EMSDK_DIR}/emsdk_env.sh"

  export EM_CACHE="${NEXTCLADE_EMSDK_CACHE}"
fi

# Setup conan profile in CONAN_USER_HOME
print 56 "Create conan profile";
CONAN_V2_MODE=1 conan profile new default --detect --force
CONAN_V2_MODE=1 conan config init
if [ "${HOST_OS}" == "Linux" ] && [ "${NEXTALIGN_STATIC_BUILD}" == "1" ] && [ "${NEXTCLADE_BUILD_WASM}" != "1" ]; then
  printf "\n\nlibc: [None, \"glibc\", \"musl\"]\n" >> "${CONAN_USER_HOME}/.conan/settings.yml"
fi

function conan_create_custom_package() {
  # This will build a local conan package (from `$PACKAGE_PATH`) and put it into local conan cache
  # under name `$PACKAGE_REF`. The build is only done once and if the package is in cache, it will not rebuild.
  # On `conan install` step the local package will be used, instead of querying conan remote servers, because the
  # `$PACKAGE_REF` is used in `conanfile.txt`.
  PACKAGE_PATH=$1
  PACKAGE_REF=$2

  if [ -z "$(conan search | grep ${PACKAGE_REF})" ]; then
    print 56 "Build dependency: ${PACKAGE_PATH}";

    pushd "${PACKAGE_PATH}" > /dev/null
        conan create . local/stable \
        -s build_type="${CONAN_BUILD_TYPE}" \
        ${CONAN_ARCH_SETTINGS} \
        ${CONAN_COMPILER_SETTINGS:-} \
        ${CONAN_STATIC_BUILD_FLAGS} \
        ${CONAN_TBB_STATIC_BUILD_FLAGS} \
        --build=missing \

    popd > /dev/null
  fi
}

if [ "${NEXTCLADE_BUILD_WASM}" != "1" ]; then
  # Order is important to ensure interdependencies are picked up correctly
  conan_create_custom_package "3rdparty/jemalloc" "jemalloc/5.2.1@local/stable"
  conan_create_custom_package "3rdparty/openssl"  "openssl/1.1.1k@local/stable"
  conan_create_custom_package "3rdparty/c-ares"   "c-ares/1.17.1@local/stable"
  conan_create_custom_package "3rdparty/zlib"     "zlib/1.2.11@local/stable"
  conan_create_custom_package "3rdparty/libcurl"  "libcurl/7.77.0@local/stable"
  conan_create_custom_package "3rdparty/poco"     "poco/1.11.0@local/stable"
  conan_create_custom_package "3rdparty/tbb"      "tbb/2021.3.0@local/stable"
fi

mkdir -p "${BUILD_DIR}"
pushd "${BUILD_DIR}" > /dev/null

  print 56 "Install dependencies";
  conan install "${CONANFILE}" \
    -s build_type="${CONAN_BUILD_TYPE}" \
    ${CONAN_ARCH_SETTINGS} \
    ${CONAN_COMPILER_SETTINGS:-} \
    ${CONAN_STATIC_BUILD_FLAGS} \
    --build missing \

  if [ -f "${BUILD_DIR}/Findghc_filesystem.cmake" ]; then
    mv "${BUILD_DIR}/Findghc_filesystem.cmake" "${BUILD_DIR}/FindghcFilesystem.cmake"
  fi

  print 57 "Generate source files";
  python3 "${PROJECT_ROOT_DIR}/packages/nextclade_common/scripts/generate_cli.py" \
      --input_json=${PROJECT_ROOT_DIR}/packages/nextclade_cli/cli.json \
      --output_cpp=${PROJECT_ROOT_DIR}/packages/nextclade_cli/src/generated/cli.cpp \
      --output_h=${PROJECT_ROOT_DIR}/packages/nextclade_cli/src/generated/cli.h \

  find "${PROJECT_ROOT_DIR}/packages/nextclade_cli/src/generated/" -regex '.*\.\(c\|cpp\|h\|hpp\|cc\|cxx\)' -exec clang-format -style=file -i {} \;

  print 57 "Generate source files";
  python3 "${PROJECT_ROOT_DIR}/packages/nextclade_common/scripts/generate_cainfo_blob.py" \
      --input_pem=${PROJECT_ROOT_DIR}/packages/nextclade_common/data/cacert.pem \
      --output_h=${PROJECT_ROOT_DIR}/packages/nextclade_common/src/generated/cainfo.h \
#      --output_cpp=${PROJECT_ROOT_DIR}/packages/nextclade_common/src/generated/cainfo.cpp \

#  python3 "${PROJECT_ROOT_DIR}/packages/nextclade_common/scripts/generate_cli.py" \
#      --input_json=${PROJECT_ROOT_DIR}/packages/nextalign_cli/cli.json \
#      --output_cpp=${PROJECT_ROOT_DIR}/packages/nextalign_cli/src/generated/cli.cpp \
#      --output_h=${PROJECT_ROOT_DIR}/packages/nextalign_cli/src/generated/cli.h \
#
#   find "${PROJECT_ROOT_DIR}/packages/nextalign_cli/src/generated/" -regex '.*\.\(c\|cpp\|h\|hpp\|cc\|cxx\)' -exec clang-format -style=file -i {} \;


#    -DCMAKE_CXX_CPPCHECK="${CMAKE_CXX_CPPCHECK}" \
  print 92 "Generate build files";
  ${CLANG_ANALYZER} ${EMCMAKE} cmake "${PROJECT_ROOT_DIR}" \
    -DCMAKE_MODULE_PATH="${BUILD_DIR}" \
    -DCMAKE_INSTALL_PREFIX="${INSTALL_DIR}" \
    -DCMAKE_EXPORT_COMPILE_COMMANDS=1 \
    -DCMAKE_BUILD_TYPE="${CMAKE_BUILD_TYPE}" \
    -DCMAKE_VERBOSE_MAKEFILE=${CMAKE_VERBOSE_MAKEFILE:=0} \
    -DCMAKE_COLOR_MAKEFILE=${CMAKE_COLOR_MAKEFILE:=1} \
    -DNEXTALIGN_STATIC_BUILD=${NEXTALIGN_STATIC_BUILD} \
    -DNEXTALIGN_BUILD_BENCHMARKS=${NEXTALIGN_BUILD_BENCHMARKS} \
    -DNEXTALIGN_BUILD_TESTS=${NEXTALIGN_BUILD_TESTS} \
    -DNEXTALIGN_MACOS_ARCH="${HOST_ARCH}" \
    -DCMAKE_OSX_ARCHITECTURES="${HOST_ARCH}" \
    -DCMAKE_OSX_DEPLOYMENT_TARGET="${OSX_MIN_VER}" \
    -DNEXTCLADE_STATIC_BUILD=${NEXTALIGN_STATIC_BUILD} \
    -DNEXTALIGN_BUILD_CLI=${NEXTALIGN_BUILD_CLI} \
    -DNEXTALIGN_BUILD_BENCHMARKS=${NEXTALIGN_BUILD_BENCHMARKS} \
    -DNEXTALIGN_BUILD_TESTS=${NEXTALIGN_BUILD_TESTS} \
    -DNEXTCLADE_BUILD_CLI=${NEXTCLADE_BUILD_CLI} \
    -DNEXTCLADE_BUILD_TESTS=${NEXTCLADE_BUILD_TESTS} \
    -DNEXTCLADE_CLI_BUILD_TESTS=${NEXTCLADE_CLI_BUILD_TESTS} \
    -DNEXTCLADE_BUILD_WASM=${NEXTCLADE_BUILD_WASM} \
    -DNEXTCLADE_EMSCRIPTEN_COMPILER_FLAGS="${NEXTCLADE_EMSCRIPTEN_COMPILER_FLAGS}" \
    -DBUILD_SHARED_LIBS="${NEXTALIGN_STATIC_BUILD}" \
    -DDATA_FULL_DOMAIN=${DATA_FULL_DOMAIN} \
    -DENABLE_DEBUG_TRACE="${ENABLE_DEBUG_TRACE:=0}" \
    ${MORE_CMAKE_FLAGS}
#    -DNEXTCLADE_BUILD_BENCHMARKS=${NEXTCLADE_BUILD_BENCHMARKS} \

  print 12 "Build";
  ${CLANG_ANALYZER} ${EMMAKE} cmake --build "${BUILD_DIR}" --config "${CMAKE_BUILD_TYPE}" -- -j$(($(nproc) - 1))

  function strip_executable() {
    CLI=${1}

    if [ "${BUILD_OS}" == "Linux" ]; then
      print 29 "Strip executable";

      strip -s \
        --strip-unneeded \
        --remove-section=.note.gnu.gold-version \
        --remove-section=.comment \
        --remove-section=.note \
        --remove-section=.note.gnu.build-id \
        --remove-section=.note.ABI-tag \
        ${CLI}

    fi

    print 28 "Print executable info";

    file ${CLI}

    if [ "${BUILD_OS}" == "Linux" ] && [ "${NEXTALIGN_STATIC_BUILD}" == "1" ]; then
      LINKAGE=$(ldd ${CLI} | awk '{$1=$1};1')
      OBJDUMP_RESULT="$(objdump -p ${CLI} || true)"
      function c1grep() { grep "$@" || test $? = 1; }
      NEEDED="$( echo "${OBJDUMP_RESULT}" | c1grep -e 'NEEDED' -e 'RPATH')"
      if [ "${LINKAGE}" != "statically linked" ] || [ "${NEEDED}" != "" ]; then
        echo "Error: Executable is not statically linked: '${CLI}'."
        echo "Objdump:"
        echo "${NEEDED}"
        exit 1
      fi
    fi
  }

  if [ "${CMAKE_BUILD_TYPE}" == "Release" ] && [ "${NEXTCLADE_BUILD_WASM}" != "1" ]; then
    print 30 "Install executable";
    cmake --install "${BUILD_DIR}" --config "${CMAKE_BUILD_TYPE}" --strip

    strip_executable "${NEXTALIGN_CLI}"

    strip_executable "${NEXTCLADE_CLI}"

  fi

  if [ "${NEXTCLADE_BUILD_WASM}" == "1" ]; then
    print 31 "Install WebAssembly module";
    cmake --install "${BUILD_DIR}" --config "${CMAKE_BUILD_TYPE}"

    print 31 "Patch WebAssembly helper script";
    sed -i 's/var _scriptDir = import.meta.url;/var _scriptDir = false;/g' "${INSTALL_DIR}/wasm/nextclade_wasm.js"
  fi

popd > /dev/null

#if command -v "cppcheck"; then
#  print 25 "Run cppcheck";
#  . "${THIS_DIR}/cppcheck.sh"
#else
#  print 25 "Skipping cppcheck: not found";
#fi


if [ "${CROSS}" == "1" ]; then
  echo "Skipping unit tests and executable e2e test built for ${HOST_OS} ${HOST_ARCH} because they cannot run on ${BUILD_OS} ${BUILD_ARCH}. Exiting with success."
  exit 0
fi

pushd "${PROJECT_ROOT_DIR}" > /dev/null
   if [ "${CMAKE_BUILD_TYPE}" != "MSAN" ]; then
     if [ "${NEXTALIGN_BUILD_TESTS}" != "0" ]; then
       print 23 "Run Nextalign tests";
       eval ${GTPP} ${GDB} "${BUILD_DIR}/packages/nextalign/tests/nextalign_tests" --gtest_output=xml:${PROJECT_ROOT_DIR}/.reports/nextalign_tests.xml || cd .
     fi
#     if [ "${NEXTCLADE_BUILD_TESTS}" != "0" ]; then
#       print 23 "Run Nextclade tests";
#       eval ${GTPP} ${GDB} "${BUILD_DIR}/packages/nextclade/src/__tests__/nextclade_tests" --gtest_output=xml:${PROJECT_ROOT_DIR}/.reports/nextclade_tests.xml || cd .
#     fi
#     if [ "${NEXTCLADE_CLI_BUILD_TESTS}" != "0" ]; then
#       print 23 "Run Nextclade CLI tests";
#       eval ${GTPP} ${GDB} "${BUILD_DIR}/packages/nextclade_cli/src/__tests__/nextclade_cli_tests" --gtest_output=xml:${PROJECT_ROOT_DIR}/.reports/nextclade_cli_tests.xml || cd .
#     fi
   fi

  if [ "${NEXTCLADE_BUILD_WASM}" != "1" ] && [ "${CROSS}" != "1" ]; then

    if [ "${CMAKE_BUILD_TYPE}" == "ASAN" ]; then
      # Lift process stack memory limit to avoid stack overflow when running with Address Sanitizer
      ulimit -s unlimited
    fi

#    if [ "${NEXTALIGN_BUILD_CLI}" == "true" ] || [ "${NEXTALIGN_BUILD_CLI}" == "1" ]; then
#      print 27 "Run Nextalign CLI";
#      eval "${GDB}" ${NEXTALIGN_CLI} ${DEV_CLI_OPTIONS} || cd .
#    fi

    if [ "${NEXTCLADE_BUILD_CLI}" == "true" ] || [ "${NEXTCLADE_BUILD_CLI}" == "1" ]; then
      if [ ! -d "${DATA_DIR}" ]; then
        print 27 "Download Nextclade dataset";
        ${NEXTCLADE_CLI} dataset get --name="sars-cov-2" --output-dir="${DATA_DIR}" || cd .
      fi

      print 27 "Run Nextclade CLI";
     eval "${GDB}" ${NEXTCLADE_CLI} ${DEV_NEXTCLADE_CLI_OPTIONS} || cd .
    fi

    print 25 "Validate CSV/TSV outputs";
    ./scripts/csv-validator.sh
    ./scripts/csvlint.sh
    fi

  print 22 "Done";

popd > /dev/null
