# Freeze base image version to
# ubuntu:20.04 (pushed 2022-04-05T22:38:34.466804Z)
# https://hub.docker.com/layers/ubuntu/library/ubuntu/20.04/images/sha256-31cd7bbfd36421dfd338bceb36d803b3663c1bfa87dfe6af7ba764b5bf34de05
FROM ubuntu@sha256:31cd7bbfd36421dfd338bceb36d803b3663c1bfa87dfe6af7ba764b5bf34de05 as base

SHELL ["bash", "-euxo", "pipefail", "-c"]

RUN set -euxo pipefail >/dev/null \
&& export DEBIAN_FRONTEND=noninteractive \
&& apt-get update -qq --yes \
&& apt-get install -qq --no-install-recommends --yes \
  bash \
  bzip2 \
  ca-certificates \
  cmake \
  cpio \
  curl \
  git \
  gnupg\
  gzip \
  libbz2-dev \
  libssl-dev \
  libxml2-dev \
  lsb-release \
  make \
  patch \
  sed \
  tar \
  uuid-dev \
  xz-utils \
  zlib1g-dev \
>/dev/null \
&& rm -rf /var/lib/apt/lists/* \
&& apt-get clean autoclean >/dev/null \
&& apt-get autoremove --yes >/dev/null


# Install LLVM/Clang (https://apt.llvm.org/)
ARG CLANG_VERSION="13"
RUN set -euxo pipefail >/dev/null \
&& echo "deb http://apt.llvm.org/$(lsb_release -cs)/ llvm-toolchain-$(lsb_release -cs)-${CLANG_VERSION} main" >> "/etc/apt/sources.list.d/llvm.list" \
&& curl -fsSL "https://apt.llvm.org/llvm-snapshot.gpg.key" | apt-key add - \
&& export DEBIAN_FRONTEND=noninteractive \
&& apt-get update -qq --yes \
&& apt-get install -qq --no-install-recommends --yes \
  clang-${CLANG_VERSION} \
  clang-tools-${CLANG_VERSION} \
  lld-${CLANG_VERSION} \
  lldb-${CLANG_VERSION} \
  llvm-${CLANG_VERSION} \
  llvm-${CLANG_VERSION}-dev \
  llvm-${CLANG_VERSION}-linker-tools \
  llvm-${CLANG_VERSION}-tools \
>/dev/null \
&& rm -rf /var/lib/apt/lists/* \
&& apt-get clean autoclean >/dev/null \
&& apt-get autoremove --yes >/dev/null

ENV PATH="/usr/lib/llvm-13/bin:${PATH}"

ARG OSX_VERSION_MIN="10.12"
ARG LIBZ_SYS_STATIC="1"
ARG OSXCROSS_COMMIT="be2b79f444aa0b43b8695a4fb7b920bf49ecc01c"
ARG OSXCROSS_INSTALL_DIR="/opt/osxcross"
ARG TEMP_BUILD_DIR="/temp-build-dir"

RUN set -euxo pipefail >/dev/null \
&& mkdir -p ${TEMP_BUILD_DIR} \
&& cd "${TEMP_BUILD_DIR}" \
&& git clone "https://github.com/tpoechtrager/osxcross" \
&& cd osxcross \
&& git config advice.detachedHead false \
&& git checkout "${OSXCROSS_COMMIT}"

ARG MACOS_SDK_URL
ARG MACOS_SDK_FILENAME

ADD "${MACOS_SDK_URL}" "${TEMP_BUILD_DIR}/osxcross/tarballs/"

RUN set -euxo pipefail >/dev/null \
&& ls -al "${TEMP_BUILD_DIR}/osxcross/tarballs/"

RUN set -euxo pipefail >/dev/null \
&& mkdir -p ${OSXCROSS_INSTALL_DIR} \
&& cd ${TEMP_BUILD_DIR}/osxcross \
&& UNATTENDED=1 TARGET_DIR=${OSXCROSS_INSTALL_DIR} OSX_VERSION_MIN=${OSX_VERSION_MIN} ./build.sh \
&& rm -rf "${TEMP_BUILD_DIR}"
