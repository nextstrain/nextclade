ARG DOCKER_BASE_IMAGE

FROM $DOCKER_BASE_IMAGE AS base

SHELL ["bash", "-euxo", "pipefail", "-c"]

ARG DOCKER_BASE_IMAGE

# Install required packages if running CentOS
RUN set -euxo pipefail >/dev/null \
&& if [[ "$DOCKER_BASE_IMAGE" != centos* ]] && [[ "$DOCKER_BASE_IMAGE" != *manylinux2014* ]]; then exit 0; fi \
&& sed -i -e 's/mirrorlist/#mirrorlist/g' -e 's|#baseurl=http://mirror.centos.org|baseurl=http://vault.centos.org|g' /etc/yum.repos.d/CentOS-* \
&& sed -i "s/enabled=1/enabled=0/g" "/etc/yum/pluginconf.d/fastestmirror.conf" \
&& sed -i "s/enabled=1/enabled=0/g" "/etc/yum/pluginconf.d/ovl.conf" \
&& yum clean all \
&& yum -y install dnf epel-release \
&& dnf install -y \
  autoconf \
  automake \
  bash \
  bash-completion \
  binutils \
  brotli \
  ca-certificates \
  cmake \
  curl \
  gcc \
  gcc-c++ \
  gdb \
  git \
  gnupg \
  gzip \
  make \
  parallel \
  pigz \
  pkgconfig \
  python3 \
  python3-pip \
  redhat-lsb-core \
  sudo \
  tar \
  time \
  xz \
  zstd \
&& dnf clean all \
&& rm -rf /var/cache/yum


ARG CLANG_VERSION

# Install required packages if running Debian or Ubuntu
RUN set -euxo pipefail >/dev/null \
&& if [[ "$DOCKER_BASE_IMAGE" != debian* ]] && [[ "$DOCKER_BASE_IMAGE" != ubuntu* ]]; then exit 0; fi \
&& if grep stretch "/etc/apt/sources.list"; then printf "deb http://archive.debian.org/debian/ stretch main non-free contrib\ndeb http://archive.debian.org/debian-security/ stretch/updates main non-free contrib\n" > "/etc/apt/sources.list"; fi \
&& export DEBIAN_FRONTEND=noninteractive \
&& apt-get update -qq --yes \
&& apt-get install -qq --no-install-recommends --yes \
  apt-transport-https \
  bash \
  bash-completion \
  brotli \
  build-essential \
  ca-certificates \
  curl \
  genometools \
  git \
  gnupg \
  libssl-dev \
  lsb-release \
  make \
  parallel \
  pigz \
  pixz \
  pkg-config \
  python3 \
  python3-pip \
  rename \
  sudo \
  time \
  xz-utils \
>/dev/null \
&& echo "deb https://apt.llvm.org/$(lsb_release -cs)/ llvm-toolchain-$(lsb_release -cs)-${CLANG_VERSION} main" >> "/etc/apt/sources.list.d/llvm.list" \
&& curl -fsSL "https://apt.llvm.org/llvm-snapshot.gpg.key" | sudo apt-key add - \
&& export DEBIAN_FRONTEND=noninteractive \
&& apt-get update -qq --yes \
&& apt-get install -qq --no-install-recommends --yes \
  clang-${CLANG_VERSION} \
  clang-tools-${CLANG_VERSION} \
  lld-${CLANG_VERSION} \
  lldb-${CLANG_VERSION} \
  llvm-${CLANG_VERSION} \
  llvm-${CLANG_VERSION}-dev \
  llvm-${CLANG_VERSION}-tools \
  >/dev/null \
&& apt-get clean autoclean >/dev/null \
&& apt-get autoremove --yes >/dev/null \
&& rm -rf /var/lib/apt/lists/*

ARG USER=user
ARG GROUP=user
ARG UID
ARG GID

ENV USER=$USER
ENV GROUP=$GROUP
ENV UID=$UID
ENV GID=$GID
ENV TERM="xterm-256color"
ENV HOME="/home/${USER}"
ENV CARGO_HOME="${HOME}/.cargo"
ENV CARGO_INSTALL_ROOT="${HOME}/.cargo/install"
ENV RUSTUP_HOME="${HOME}/.rustup"
ENV NODE_DIR="/opt/node"
ENV PATH="/usr/lib/llvm-${CLANG_VERSION}/bin:${NODE_DIR}/bin:${HOME}/.local/bin:${HOME}/.cargo/bin:${HOME}/.cargo/install/bin:${PATH}"

# Make a user and group
RUN set -euxo pipefail >/dev/null \
&& \
  if [ -z "$(getent group ${GID})" ]; then \
    groupadd --system --gid ${GID} ${GROUP}; \
  else \
    groupmod --new-name ${GROUP} $(getent group ${GID} | cut -d: -f1); \
  fi \
&& export SUDO_GROUP="sudo" \
&& \
  if [[ "$DOCKER_BASE_IMAGE" == centos* ]] || [[ "$DOCKER_BASE_IMAGE" == *manylinux2014* ]]; then \
    export SUDO_GROUP="wheel"; \
  fi \
&& \
  if [ -z "$(getent passwd ${UID})" ]; then \
    useradd \
      --system \
      --home-dir ${HOME} \
      --create-home \
      --shell /bin/bash \
      --gid ${GROUP} \
      --groups ${SUDO_GROUP},${GROUP} \
      --uid ${UID} \
      ${USER}; \
  else \
    usermod \
      --home ${HOME} \
      --move-home \
      --shell /bin/bash \
      --gid ${GROUP} \
      --groups ${SUDO_GROUP},${GROUP} \
      --append \
      --uid ${UID} \
      --login "${USER}" \
      ${USER}; \
  fi \
&& sed -i /etc/sudoers -re 's/^%sudo.*/%sudo ALL=(ALL:ALL) NOPASSWD: ALL/g' \
&& sed -i /etc/sudoers -re 's/^root.*/root ALL=(ALL:ALL) NOPASSWD: ALL/g' \
&& sed -i /etc/sudoers -re 's/^#includedir.*/## **Removed the include directive** ##"/g' \
&& echo "%sudo ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers \
&& echo "${USER} ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers \
&& mkdir -p ${HOME} \
&& chown -R ${UID}:${GID} "${HOME}" \
&& touch ${HOME}/.hushlogin

# Install Python dependencies
RUN set -euxo pipefail >/dev/null \
&& pip3 install --user --upgrade cram

# Copy version management files
COPY tool-versions.json /tool-versions.json
COPY scripts/get-version /usr/local/bin/get-version
RUN chmod +x /usr/local/bin/get-version

# Install jq, a tool to query JSON files
RUN set -euxo pipefail >/dev/null \
&& JQ_VERSION="$(get-version -f /tool-versions.json jq)" \
&& curl -fsSLo "/usr/bin/jq" "https://github.com/jqlang/jq/releases/download/jq-${JQ_VERSION}/jq-linux-amd64" \
&& chmod +x "/usr/bin/jq" \
&& jq --version

# Install dasel, a tool to query TOML files
RUN set -euxo pipefail >/dev/null \
&& DASEL_VERSION="$(get-version -f /tool-versions.json dasel)" \
&& curl -fsSLo "/usr/bin/dasel" "https://github.com/TomWright/dasel/releases/download/v${DASEL_VERSION}/dasel_linux_amd64" \
&& chmod +x "/usr/bin/dasel" \
&& dasel version

# Install watchexec - file watcher
RUN set -euxo pipefail >/dev/null \
&& WATCHEXEC_VERSION="$(get-version -f /tool-versions.json watchexec)" \
&& curl -fsSL "https://github.com/watchexec/watchexec/releases/download/v${WATCHEXEC_VERSION}/watchexec-${WATCHEXEC_VERSION}-x86_64-unknown-linux-musl.tar.xz" | tar -C "/usr/bin/" -xJ --strip-components=1 "watchexec-${WATCHEXEC_VERSION}-x86_64-unknown-linux-musl/watchexec" \
&& chmod +x "/usr/bin/watchexec" \
&& watchexec --version

# Install Node.js (skip on old glibc systems like CentOS 7 or Debian 9 - not needed for CLI builds)
COPY .nvmrc /
RUN set -eux >/dev/null \
&& if [[ "$DOCKER_BASE_IMAGE" == *manylinux2014* ]] || [[ "$DOCKER_BASE_IMAGE" == debian:9* ]]; then exit 0; fi \
&& mkdir -p "${NODE_DIR}" \
&& cd "${NODE_DIR}" \
&& NODE_VERSION=$(cat /.nvmrc) \
&& curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" | tar -xJ --strip-components=1 \
&& BUN_VERSION="$(get-version -f /tool-versions.json bun)" \
&& npm install -g "bun@${BUN_VERSION}" >/dev/null

RUN set -euxo pipefail >/dev/null \
&& chown -R ${UID}:${GID} "${HOME}"

USER ${UID}

# Install rustup and toolchain from rust-toolchain.toml
COPY rust-toolchain.toml "${HOME}/rust-toolchain.toml"
RUN set -euxo pipefail >/dev/null \
&& cd "${HOME}" \
&& RUST_TOOLCHAIN=$(dasel -i toml -o yaml 'toolchain.channel' < "${HOME}/rust-toolchain.toml") \
&& curl --proto '=https' -sSf https://sh.rustup.rs > rustup-init \
&& chmod +x rustup-init \
&& ./rustup-init -y --no-modify-path --default-toolchain="${RUST_TOOLCHAIN}" \
&& rm rustup-init

# Install toolchain from rust-toolchain.toml and make it default
RUN set -euxo pipefail >/dev/null \
&& cd "${HOME}" \
&& RUST_TOOLCHAIN=$(dasel -i toml -o yaml 'toolchain.channel' < "rust-toolchain.toml") \
&& rustup toolchain install "${RUST_TOOLCHAIN}" \
&& rustup default "${RUST_TOOLCHAIN}"

# Install remaining toolchain components from rust-toolchain.toml
RUN set -euxo pipefail >/dev/null \
&& cd "${HOME}" \
&& RUST_TOOLCHAIN=$(dasel -i toml -o yaml 'toolchain.channel' < "rust-toolchain.toml") \
&& rustup show \
&& rustup default "${RUST_TOOLCHAIN}"

# Copy Cargo.toml for wasm-bindgen-cli version resolution
COPY Cargo.toml /Cargo.toml

RUN set -euxo pipefail >/dev/null \
&& SEQKIT_VERSION="$(get-version -f /tool-versions.json seqkit)" \
&& curl -fsSL "https://github.com/shenwei356/seqkit/releases/download/v${SEQKIT_VERSION}/seqkit_linux_amd64.tar.gz" | tar -C "${CARGO_HOME}/bin" -xz "seqkit" \
&& chmod +x "${CARGO_HOME}/bin/seqkit"

RUN set -euxo pipefail >/dev/null \
&& WASM_BINDGEN_CLI_VERSION="$(get-version -f /tool-versions.json wasm-bindgen-cli)" \
&& curl -fsSL "https://github.com/rustwasm/wasm-bindgen/releases/download/${WASM_BINDGEN_CLI_VERSION}/wasm-bindgen-${WASM_BINDGEN_CLI_VERSION}-x86_64-unknown-linux-musl.tar.gz" | tar -C "${CARGO_HOME}/bin" --strip-components=1 -xz "wasm-bindgen-${WASM_BINDGEN_CLI_VERSION}-x86_64-unknown-linux-musl/wasm-bindgen" \
&& chmod +x "${CARGO_HOME}/bin/wasm-bindgen"

RUN set -euxo pipefail >/dev/null \
&& BINARYEN_VERSION="$(get-version -f /tool-versions.json binaryen)" \
&& curl -fsSL "https://github.com/WebAssembly/binaryen/releases/download/version_${BINARYEN_VERSION}/binaryen-version_${BINARYEN_VERSION}-x86_64-linux.tar.gz" | tar -C "${CARGO_HOME}/bin" --strip-components=2 -xz --wildcards "binaryen-version_${BINARYEN_VERSION}/bin/"'wasm*' \
&& chmod +x ${CARGO_HOME}/bin/wasm*

RUN set -euxo pipefail >/dev/null \
&& WASM_PACK_VERSION="$(get-version -f /tool-versions.json wasm-pack)" \
&& curl -fsSL "https://github.com/rustwasm/wasm-pack/releases/download/v${WASM_PACK_VERSION}/wasm-pack-v${WASM_PACK_VERSION}-x86_64-unknown-linux-musl.tar.gz" | tar -C "${CARGO_HOME}/bin" --strip-components=1 -xz "wasm-pack-v${WASM_PACK_VERSION}-x86_64-unknown-linux-musl/wasm-pack" \
&& chmod +x "${CARGO_HOME}/bin/wasm-pack"

RUN set -euxo pipefail >/dev/null \
&& CARGO_WATCH_VERSION="$(get-version -f /tool-versions.json cargo-watch)" \
&& curl -fsSL "https://github.com/watchexec/cargo-watch/releases/download/v${CARGO_WATCH_VERSION}/cargo-watch-v${CARGO_WATCH_VERSION}-x86_64-unknown-linux-gnu.tar.xz" | tar -C "${CARGO_HOME}/bin" --strip-components=1 -xJ "cargo-watch-v${CARGO_WATCH_VERSION}-x86_64-unknown-linux-gnu/cargo-watch" \
&& chmod +x "${CARGO_HOME}/bin/cargo-watch"

RUN set -euxo pipefail >/dev/null \
&& CARGO_NEXTEST_VERSION="$(get-version -f /tool-versions.json cargo-nextest)" \
&& curl -fsSL "https://github.com/nextest-rs/nextest/releases/download/cargo-nextest-${CARGO_NEXTEST_VERSION}/cargo-nextest-${CARGO_NEXTEST_VERSION}-x86_64-unknown-linux-gnu.tar.gz" | tar -C "${CARGO_HOME}/bin" -xz "cargo-nextest" \
&& chmod +x "${CARGO_HOME}/bin/cargo-nextest"


RUN set -euxo pipefail >/dev/null \
&& curl -fsSL "https://ftp.ncbi.nlm.nih.gov/asn1-converters/by_program/table2asn/linux64.table2asn.gz" | gzip -d > "${CARGO_HOME}/bin/table2asn" && chmod +x "${CARGO_HOME}/bin/table2asn"


# Setup bash
RUN set -euxo pipefail >/dev/null \
&& echo 'alias ll="ls --color=always -alFhp"' >> ~/.bashrc \
&& echo 'alias la="ls -Ah"' >> ~/.bashrc \
&& echo 'alias l="ls -CFh"' >> ~/.bashrc \
&& echo 'function mkcd() { mkdir -p ${1} && cd ${1} ; }' >> ~/.bashrc \
&& rustup completions bash >> ~/.bash_completion \
&& rustup completions bash cargo >>  ~/.bash_completion \
&& echo "source ~/.bash_completion" >> ~/.bashrc

USER ${UID}


# Native compilation for Linux x86_64 with gnu-libc
FROM base AS dev

ENV CC_x86_64-unknown-linux-gnu=clang
ENV CXX_x86_64-unknown-linux-gnu=clang++

FROM dev AS e2e

# Copy package.json for playwright version resolution
COPY packages/nextclade-web/package.json /packages/nextclade-web/package.json

# Install Playwright browser dependencies and browsers for E2E testing
USER 0
RUN set -euxo pipefail >/dev/null \
&& export DEBIAN_FRONTEND=noninteractive \
&& apt-get update -qq --yes \
&& apt-get install -qq --no-install-recommends --yes \
  fonts-liberation \
  fonts-noto-color-emoji \
  libasound2 \
  libatk-bridge2.0-0 \
  libatspi2.0-0 \
  libdrm2 \
  libgail-common \
  libgbm1 \
  libgconf-2-4 \
  libgtk-3-0 \
  libnss3 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxfixes3 \
  libxi6 \
  libxinerama1 \
  libxkbcommon0 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
>/dev/null \
&& apt-get clean autoclean >/dev/null \
&& apt-get autoremove --yes >/dev/null \
&& rm -rf /var/lib/apt/lists/* \
&& PLAYWRIGHT_VERSION="$(get-version -f /tool-versions.json playwright)" \
&& npm install -g "@playwright/test@${PLAYWRIGHT_VERSION}" >/dev/null \
&& npx playwright install chromium >/dev/null \
&& npx playwright install-deps chromium >/dev/null

USER ${UID}

# Cross-compilation for Linux x86_64 with gnu-libc.
# Same AS native, but convenient to have for mass cross-compilation.
FROM dev AS cross-x86_64-unknown-linux-gnu

ENV CC_x86_64-unknown-linux-gnu=gcc
ENV CXX_x86_64-unknown-linux-gnu=g++


# Cross-compilation for Linux x86_64 with libmusl
FROM base AS cross-x86_64-unknown-linux-musl

ARG MUSL_CC_X86_64_URL
ENV MUSL_CC_X86_64_URL="${MUSL_CC_X86_64_URL}"

USER 0

SHELL ["bash", "-euxo", "pipefail", "-c"]

RUN set -euxo pipefail >/dev/null \
&& curl -fsSL "${MUSL_CC_X86_64_URL}" | tar -C "/usr" -xz --strip-components=1

USER ${UID}

RUN set -euxo pipefail >/dev/null \
&& rustup target add x86_64-unknown-linux-musl

ENV CC_x86_64_unknown_linux_musl=x86_64-linux-musl-gcc
ENV CXX_x86_64_unknown_linux_musl=x86_64-linux-musl-g++
ENV CARGO_TARGET_X86_64_UNKNOWN_LINUX_MUSL_LINKER=x86_64-linux-musl-gcc


# Cross-compilation to WebAssembly
FROM base AS cross-wasm32-unknown-unknown

USER 0

SHELL ["bash", "-euxo", "pipefail", "-c"]

RUN set -euxo pipefail >/dev/null \
&& rustup target add wasm32-unknown-unknown

USER ${UID}


# Cross-compilation for Linux ARM64
FROM base AS cross-aarch64-unknown-linux-gnu

USER 0

SHELL ["bash", "-euxo", "pipefail", "-c"]

RUN set -euxo pipefail >/dev/null \
&& export DEBIAN_FRONTEND=noninteractive \
&& apt-get update -qq --yes \
&& apt-get install -qq --no-install-recommends --yes \
  gcc-aarch64-linux-gnu \
  libc6-dev-arm64-cross \
>/dev/null \
&& apt-get clean autoclean >/dev/null \
&& apt-get autoremove --yes >/dev/null \
&& rm -rf /var/lib/apt/lists/*

USER ${UID}

RUN set -euxo pipefail >/dev/null \
&& rustup target add aarch64-unknown-linux-gnu

ENV CC_aarch64_unknown_linux_gnu=aarch64-linux-gnu-gcc
ENV CXX_aarch64_unknown_linux_gnu=aarch64-linux-gnu-g++
ENV CARGO_TARGET_AARCH64_UNKNOWN_LINUX_GNU_LINKER=aarch64-linux-gnu-gcc

# Cross-compilation for Linux ARM64 with libmusl
FROM base AS cross-aarch64-unknown-linux-musl

ARG MUSL_CC_AARCH64_URL
ENV MUSL_CC_AARCH64_URL=${MUSL_CC_AARCH64_URL}

USER 0

SHELL ["bash", "-euxo", "pipefail", "-c"]

RUN set -euxo pipefail >/dev/null \
&& curl -fsSL "${MUSL_CC_AARCH64_URL}" | tar -C "/usr" -xz --strip-components=1

USER ${UID}

RUN set -euxo pipefail >/dev/null \
&& rustup target add aarch64-unknown-linux-musl

ENV CC_aarch64_unknown_linux_musl=aarch64-linux-musl-gcc
ENV CXX_aarch64_unknown_linux_musl=aarch64-linux-musl-g++
ENV CARGO_TARGET_AARCH64_UNKNOWN_LINUX_MUSL_LINKER=aarch64-linux-musl-gcc


# Cross-compilation for Windows x86_64
FROM base AS cross-x86_64-pc-windows-gnu

SHELL ["bash", "-euxo", "pipefail", "-c"]

USER 0

RUN set -euxo pipefail >/dev/null \
&& export DEBIAN_FRONTEND=noninteractive \
&& apt-get update -qq --yes \
&& apt-get install -qq --no-install-recommends --yes \
  cmake \
  gcc-mingw-w64-x86-64 \
  nasm \
>/dev/null \
&& apt-get clean autoclean >/dev/null \
&& apt-get autoremove --yes >/dev/null \
&& rm -rf /var/lib/apt/lists/*

USER ${UID}

RUN set -euxo pipefail >/dev/null \
&& rustup target add x86_64-pc-windows-gnu


# Builds osxcross for Mac cross-compiation
FROM base AS osxcross

SHELL ["bash", "-euxo", "pipefail", "-c"]

USER 0

ARG OSXCROSS_URL

RUN set -euxo pipefail >/dev/null \
&& mkdir -p "/opt/osxcross" \
&& curl -fsSL "${OSXCROSS_URL}" | tar -C "/opt/osxcross" -xJ

USER ${UID}


# Cross-compilation for macOS x86_64
FROM osxcross AS cross-x86_64-apple-darwin

SHELL ["bash", "-euxo", "pipefail", "-c"]

USER ${UID}

RUN set -euxo pipefail >/dev/null \
&& rustup target add x86_64-apple-darwin

ENV PATH="/opt/osxcross/bin/:${PATH}"
ENV CC_x86_64-apple-darwin=x86_64-apple-darwin20.2-clang
ENV CXX_x86_64-apple-darwin=x86_64-apple-darwin20.2-clang++
ENV CARGO_TARGET_X86_64_APPLE_DARWIN_LINKER=x86_64-apple-darwin20.2-clang
ENV CARGO_TARGET_X86_64_APPLE_DARWIN_STRIP=x86_64-apple-darwin20.2-strip


USER 0

ENV OSXCROSS_MP_INC=1
ENV MACOSX_DEPLOYMENT_TARGET=10.7

RUN set -euxo pipefail >/dev/null \
&& ln -sf x86_64-apple-darwin20.2-ld /opt/osxcross/bin/ld \
&& echo "1" | osxcross-macports install openssl -v

USER ${UID}


# Cross-compilation for macOS ARM64
FROM osxcross AS cross-aarch64-apple-darwin

SHELL ["bash", "-euxo", "pipefail", "-c"]

USER ${UID}

RUN set -euxo pipefail >/dev/null \
&& rustup target add aarch64-apple-darwin

ENV PATH="/opt/osxcross/bin/:${PATH}"
ENV CC_aarch64-apple-darwin=aarch64-apple-darwin20.2-clang
ENV CXX_aarch64-apple-darwin=aarch64-apple-darwin20.2-clang++
ENV CARGO_TARGET_AARCH64_APPLE_DARWIN_LINKER=aarch64-apple-darwin20.2-clang
ENV CARGO_TARGET_AARCH64_APPLE_DARWIN_STRIP=aarch64-apple-darwin20.2-strip

USER 0

ENV OSXCROSS_MP_INC=1
ENV MACOSX_DEPLOYMENT_TARGET=10.7

RUN set -euxo pipefail >/dev/null \
&& ln -sf aarch64-apple-darwin20.2-ld /opt/osxcross/bin/ld \
&& echo "1" | osxcross-macports install openssl -v

USER ${UID}
