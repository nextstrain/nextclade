#!/usr/bin/env bash

BASH_DEBUG="${BASH_DEBUG:=}"
([ "${BASH_DEBUG}" == "true" ] || [ "${BASH_DEBUG}" == "1" ]) && set -o xtrace
set -o errexit
set -o nounset
set -o pipefail
shopt -s dotglob
trap "exit" INT

echo "On Ubuntu you will need these dependencies:"
echo "sudo apt-get install build-essential git"
echo ""

THIS_DIR=$(
  cd $(dirname "${BASH_SOURCE[0]}")
  pwd
)

PROJECT_ROOT_DIR="$(realpath ${THIS_DIR}/../..)"

if [[ $OSTYPE == "linux-gnu" ]]; then
  export NUM_JOBS="$(nproc)"
elif [[ $OSTYPE == "darwin"* ]]; then
  export NUM_JOBS="$(sysctl -n hw.ncpu)"
fi

VERSION_DEFAULT="10.2.0"
VERSION=${VERSION_DEFAULT}
VERSION_MAJOR="$(echo ${VERSION} | cut -d. -f1)"

NAME="gcc"
SRC_DIR="${PROJECT_ROOT_DIR}/tmp"
SOURCE_DIR="${SRC_DIR}/${NAME}-${VERSION}"
INSTALL_DIR="${PROJECT_ROOT_DIR}/3rdparty/${NAME}"
BUILD_DIR="${SOURCE_DIR}_build"
ARCHIVE_FILE="${NAME}-${VERSION}.tar.gz"
URL="ftp://ftp.gnu.org/gnu/gcc/gcc-${VERSION}/${ARCHIVE_FILE}"

mkdir -p ${SRC_DIR}
pushd ${SRC_DIR}

# Download package
if [ ! -f ${ARCHIVE_FILE} ]; then
  wget "${URL}"
fi

# Untar, download prerequisites and rename lib64  -> lib
if [ ! -d ${SOURCE_DIR} ]; then

  tar xvf ${ARCHIVE_FILE}

  pushd ${SOURCE_DIR}

  ./contrib/download_prerequisites

  case $(uname -m) in
  x86_64)
    sed -e '/m64=/s/lib64/lib/' \
      -i.orig gcc/config/i386/t-linux64
    ;;
  esac

  # New versions of glibc do not have `struct ucontext` anymore.
  # Replace `struct ucontext` with `ucontext_t` to prevent build failure of
  # GCC 6 and older
  if ((${VERSION_MAJOR} <= 6)); then
    egrep -lRZ 'struct ucontext' . | xargs -0 -l sed -i -e 's/struct ucontext/ucontext_t/g'
  fi

  popd

fi

popd

# Create build directory, configure and build
mkdir -p ${BUILD_DIR}
pushd ${BUILD_DIR}

unset CFLAGS CXXFLAGS LIBRARY_PATH CPATH C_INCLUDE_PATH PKG_CONFIG_PATH CPLUS_INCLUDE_PATH INCLUDE

${SOURCE_DIR}/configure \
  --prefix=${INSTALL_DIR} \
  --build=x86_64-linux-gnu \
  --host=x86_64-linux-gnu \
  --target=x86_64-linux-gnu \
  --disable-bootstrap \
  --enable-clocale=gnu \
  --enable-gold=yes \
  --enable-languages=c,c++,fortran,go,objc,obj-c++ \
  --enable-ld=yes \
  --enable-libstdcxx-debug \
  --enable-libstdcxx-time=yes \
  --enable-linker-build-id \
  --enable-lto \
  --enable-plugins \
  --enable-threads=posix \
  --disable-multilib \
  --with-abi=m64

make -j ${NUM_JOBS}
make install

popd
