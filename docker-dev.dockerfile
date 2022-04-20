# Freeze base image version to
# ubuntu:20.04 (pushed 2022-04-05T22:38:34.466804Z)
# https://hub.docker.com/layers/ubuntu/library/ubuntu/20.04/images/sha256-31cd7bbfd36421dfd338bceb36d803b3663c1bfa87dfe6af7ba764b5bf34de05
FROM ubuntu@sha256:31cd7bbfd36421dfd338bceb36d803b3663c1bfa87dfe6af7ba764b5bf34de05 as base

SHELL ["bash", "-c"]

ARG CLANG_VERSION="13"
ARG DASEL_VERSION="1.22.1"
ARG WATCHEXEC_VERSION="1.17.1"
ARG NODEMON_VERSION="2.0.15"
ARG YARN_VERSION="1.22.18"

RUN set -euxo pipefail >/dev/null \
&& export DEBIAN_FRONTEND=noninteractive \
&& apt-get update -qq --yes \
&& apt-get install -qq --no-install-recommends --yes \
  bash \
  bash-completion \
  build-essential \
  ca-certificates \
  curl \
  git \
  gnupg \
  libssl-dev \
  lsb-release \
  pigz \
  pixz \
  pkg-config \
  sudo \
  time \
  xz-utils \
>/dev/null \
&& rm -rf /var/lib/apt/lists/* \
&& apt-get clean autoclean >/dev/null \
&& apt-get autoremove --yes >/dev/null


# Install LLVM/Clang (https://apt.llvm.org/)
RUN set -euxo pipefail >/dev/null \
&& echo "deb http://apt.llvm.org/$(lsb_release -cs)/ llvm-toolchain-$(lsb_release -cs)-${CLANG_VERSION} main" >> "/etc/apt/sources.list.d/llvm.list" \
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
  llvm-${CLANG_VERSION}-linker-tools \
  llvm-${CLANG_VERSION}-tools \
>/dev/null \
&& rm -rf /var/lib/apt/lists/* \
&& apt-get clean autoclean >/dev/null \
&& apt-get autoremove --yes >/dev/null

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
ENV PATH="/usr/lib/llvm-13/bin:${NODE_DIR}/bin:${HOME}/.local/bin:${HOME}/.cargo/bin:${HOME}/.cargo/install/bin:${PATH}"

# Install dasel, a tool to query TOML files
RUN set -euxo pipefail >/dev/null \
&& curl -fsSL "https://github.com/TomWright/dasel/releases/download/v${DASEL_VERSION}/dasel_linux_amd64" -o "/usr/bin/dasel" \
&& chmod +x "/usr/bin/dasel" \
&& dasel --version

# Install watchexec - file watcher
RUN set -euxo pipefail >/dev/null \
&& curl -sSL "https://github.com/watchexec/watchexec/releases/download/cli-v${WATCHEXEC_VERSION}/watchexec-${WATCHEXEC_VERSION}-x86_64-unknown-linux-musl.tar.xz" | tar -C "/usr/bin/" -xJ --strip-components=1 "watchexec-${WATCHEXEC_VERSION}-x86_64-unknown-linux-musl/watchexec" \
&& chmod +x "/usr/bin/watchexec" \
&& watchexec --version

# Install Node.js
COPY .nvmrc /
RUN set -eux >dev/null \
&& mkdir -p "${NODE_DIR}" \
&& cd "${NODE_DIR}" \
&& NODE_VERSION=$(cat /.nvmrc) \
&& curl -fsSL  "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" | tar -xJ --strip-components=1 \
&& npm install -g nodemon@${NODEMON_VERSION} yarn@${YARN_VERSION} >/dev/null \
&& npm config set scripts-prepend-node-path auto

# Make a user and group
RUN set -euxo pipefail >/dev/null \
&& \
  if [ -z "$(getent group ${GID})" ]; then \
    addgroup --system --gid ${GID} ${GROUP}; \
  else \
    groupmod -n ${GROUP} $(getent group ${GID} | cut -d: -f1); \
  fi \
&& \
  if [ -z "$(getent passwd ${UID})" ]; then \
    useradd \
      --system \
      --create-home --home-dir ${HOME} \
      --shell /bin/bash \
      --gid ${GROUP} \
      --groups sudo \
      --uid ${UID} \
      ${USER}; \
  fi \
&& sed -i /etc/sudoers -re 's/^%sudo.*/%sudo ALL=(ALL:ALL) NOPASSWD: ALL/g' \
&& sed -i /etc/sudoers -re 's/^root.*/root ALL=(ALL:ALL) NOPASSWD: ALL/g' \
&& sed -i /etc/sudoers -re 's/^#includedir.*/## **Removed the include directive** ##"/g' \
&& echo "foo ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers \
&& touch ${HOME}/.hushlogin \
&& chown -R ${UID}:${GID} "${HOME}"


USER ${USER}

# Install rustup and toolchain from rust-toolchain.toml
COPY rust-toolchain.toml "${HOME}/rust-toolchain.toml"
RUN set -euxo pipefail >/dev/null \
&& cd "${HOME}" \
&& RUST_TOOLCHAIN=$(dasel select -p toml -s ".toolchain.channel" -f "${HOME}/rust-toolchain.toml") \
&& curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs > rustup-init \
&& chmod +x rustup-init \
&& ./rustup-init -y --no-modify-path --default-toolchain="${RUST_TOOLCHAIN}" \
&& rm rustup-init

# Install toolchain from rust-toolchain.toml and make it default
RUN set -euxo pipefail >/dev/null \
&& cd "${HOME}" \
&& RUST_TOOLCHAIN=$(dasel select -p toml -s ".toolchain.channel" -f "rust-toolchain.toml") \
&& rustup toolchain install "${HOME}" \
&& rustup default "${RUST_TOOLCHAIN}"

# Install remaining toolchain components from rust-toolchain.toml
RUN set -euxo pipefail >/dev/null \
&& cd "${HOME}" \
&& RUST_TOOLCHAIN=$(dasel select -p toml -s ".toolchain.channel" -f "rust-toolchain.toml") \
&& rustup show \
&& rustup default "${RUST_TOOLCHAIN}"

# Install executable dependencies
RUN set -euxo pipefail >/dev/null \
&& cargo install \
  cargo-deny \
  cargo-edit \
  cargo-generate \
  cargo-watch \
  wasm-bindgen-cli \
  wasm-pack \
  xargo \
&& cargo install cargo-audit --features=fix \
&& cp -r ${HOME}/.cargo/install/bin/* ${HOME}/.cargo/bin/

# Setup bash
RUN set -euxo pipefail >/dev/null \
&& echo 'alias ll="ls --color=always -alFhp"' >> ~/.bashrc \
&& echo 'alias la="ls -Ah"' >> ~/.bashrc \
&& echo 'alias l="ls -CFh"' >> ~/.bashrc \
&& echo 'function mkcd() { mkdir -p ${1} && cd ${1} ; }' >> ~/.bashrc \
&& rustup completions bash >> ~/.bash_completion \
&& rustup completions bash cargo >>  ~/.bash_completion \
&& echo "source ~/.bash_completion" >> ~/.bashrc

USER ${USER}

WORKDIR ${HOME}/src



# Native compilation for Linux x86_64 with gnu-libc
FROM base as dev

ENV CC_x86_64-unknown-linux-gnu=clang
ENV CXX_x86_64-unknown-linux-gnu=clang++

# Cross-compilation for Linux x86_64 with gnu-libc.
# Same as native, but convenient to have for mass cross-compilation.
FROM dev as cross-x86_64-unknown-linux-gnu

ENV CC_x86_64-unknown-linux-gnu=clang
ENV CXX_x86_64-unknown-linux-gnu=clang++


# Cross-compilation for Linux x86_64 with libmusl
FROM base as cross-x86_64-unknown-linux-musl


# Cross-compilation to WebAssembly
FROM base as cross-wasm32-unknown-unknown
SHELL ["bash", "-c"]


# Cross-compilation for Linux ARM64
FROM base as cross-aarch64-unknown-linux-gnu

USER 0
SHELL ["bash", "-c"]

RUN set -euxo pipefail >/dev/null \
&& export DEBIAN_FRONTEND=noninteractive \
&& apt-get update -qq --yes \
&& apt-get install -qq --no-install-recommends --yes \
  gcc-aarch64-linux-gnu \
  libc6-dev-arm64-cross \
>/dev/null \
&& rm -rf /var/lib/apt/lists/* \
&& apt-get clean autoclean >/dev/null \
&& apt-get autoremove --yes >/dev/null


ENV CARGO_TARGET_AARCH64_UNKNOWN_LINUX_GNU_LINKER=aarch64-linux-gnu-gcc
ENV CC_aarch64_unknown_linux_gnu=aarch64-linux-gnu-gcc
ENV CXX_aarch64_unknown_linux_gnu=aarch64-linux-gnu-g++

USER ${USER}



# Cross-compilation for Windows x86_64
FROM base as cross-x86_64-pc-windows-gnu

USER 0
SHELL ["bash", "-c"]

RUN set -euxo pipefail >/dev/null \
&& export DEBIAN_FRONTEND=noninteractive \
&& apt-get update -qq --yes \
&& apt-get install -qq --no-install-recommends --yes \
  gcc-mingw-w64-x86-64 \
>/dev/null \
&& rm -rf /var/lib/apt/lists/* \
&& apt-get clean autoclean >/dev/null \
&& apt-get autoremove --yes >/dev/null

USER ${USER}



# Builds osxcross for Mac cross-compiation
FROM base as osxcross

SHELL ["bash", "-c"]

USER 0

RUN set -euxo pipefail >/dev/null \
&& export DEBIAN_FRONTEND=noninteractive \
&& apt-get update -qq --yes \
&& apt-get install -qq --no-install-recommends --yes \
  bash \
  bzip2 \
  cmake \
  cpio \
  gzip \
  libbz2-dev \
  libssl-dev \
  libxml2-dev \
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

ENV OSX_VERSION_MIN=10.12
ENV LIBZ_SYS_STATIC=1
ENV OSXCROSS_COMMIT=be2b79f444aa0b43b8695a4fb7b920bf49ecc01c
ENV OSXCROSS_INSTALL_DIR=/opt/osxcross
ARG TEMP_BUILD_DIR=/temp-build-dir

RUN set -euxo pipefail >/dev/null \
&& mkdir -p ${TEMP_BUILD_DIR} \
&& cd ${TEMP_BUILD_DIR} \
&& git clone https://github.com/tpoechtrager/osxcross \
&& cd osxcross \
&& git config advice.detachedHead false \
&& git checkout ${OSXCROSS_COMMIT}

ARG MACOS_SDK_FILENAME
ARG MACOS_SDK_SHA
COPY ".downloads/${MACOS_SDK_FILENAME}" "${TEMP_BUILD_DIR}/osxcross/tarballs/"

RUN set -euxo pipefail >/dev/null \
&& echo "${MACOS_SDK_SHA} ${TEMP_BUILD_DIR}/osxcross/tarballs/${MACOS_SDK_FILENAME}"  \
  | sha256sum --check --status

RUN set -euxo pipefail >/dev/null \
&& mkdir -p ${OSXCROSS_INSTALL_DIR} \
&& cd ${TEMP_BUILD_DIR}/osxcross \
&& UNATTENDED=1 TARGET_DIR=${OSXCROSS_INSTALL_DIR} OSX_VERSION_MIN=${OSX_VERSION_MIN} ./build.sh



# Cross-compilation for macOS x86_64
FROM osxcross as cross-x86_64-apple-darwin

ENV PATH="/opt/osxcross/bin/:${PATH}"
ENV CC_x86_64-apple-darwin=x86_64-apple-darwin20.2-clang
ENV CXX_x86_64-apple-darwin=x86_64-apple-darwin20.2-clang++



# Cross-compilation for macOS ARM64
FROM osxcross as cross-aarch64-apple-darwin

ENV PATH="/opt/osxcross/bin/:${PATH}"
ENV CC_aarch64-apple-darwin=aarch64-apple-darwin20.2-clang
ENV CXX_aarch64-apple-darwin=aarch64-apple-darwin20.2-clang++
