# Freeze base image version to
# ubuntu:20.04 (pushed 2022-04-21T23:04:30.548037Z)
# https://hub.docker.com/layers/ubuntu/library/ubuntu/20.04/images/sha256-7b3e30a1f373b0621681f13b92feb928129c1c38977481ee788a793fcae64fb9
FROM ubuntu@sha256:7b3e30a1f373b0621681f13b92feb928129c1c38977481ee788a793fcae64fb9 as base

SHELL ["bash", "-euxo", "pipefail", "-c"]

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

# Install cargo-binstall
RUN set -euxo pipefail >/dev/null \
&& curl -sSL "https://github.com/ryankurte/cargo-binstall/releases/latest/download/cargo-binstall-x86_64-unknown-linux-gnu.tgz" | tar -C "${CARGO_HOME}/bin" -xz "cargo-binstall" \
&& chmod +x "${CARGO_HOME}/bin/cargo-binstall"

# Install cargo-quickinstall
RUN set -euxo pipefail >/dev/null \
&& export CARGO_QUICKINSTALL_VERSION="0.2.6" \
&& curl -sSL "https://github.com/alsuren/cargo-quickinstall/releases/download/cargo-quickinstall-${CARGO_QUICKINSTALL_VERSION}-x86_64-unknown-linux-musl/cargo-quickinstall-${CARGO_QUICKINSTALL_VERSION}-x86_64-unknown-linux-musl.tar.gz" | tar -C "${CARGO_HOME}/bin" -xz "cargo-quickinstall" \
&& chmod +x "${CARGO_HOME}/bin/cargo-quickinstall"

# Install wasm-bindgen
RUN set -euxo pipefail >/dev/null \
&& export WASM_BINDGEN_CLI_VERSION="0.2.80" \
&& curl -sSL "https://github.com/rustwasm/wasm-bindgen/releases/download/${WASM_BINDGEN_CLI_VERSION}/wasm-bindgen-${WASM_BINDGEN_CLI_VERSION}-x86_64-unknown-linux-musl.tar.gz" | tar -C "${CARGO_HOME}/bin" --strip-components=1 -xz "wasm-bindgen-${WASM_BINDGEN_CLI_VERSION}-x86_64-unknown-linux-musl/wasm-bindgen" \
&& chmod +x "${CARGO_HOME}/bin/wasm-bindgen"

# Install executable dependencies
RUN set -euxo pipefail >/dev/null \
&& cargo quickinstall cargo-audit \
&& cargo quickinstall cargo-deny \
&& cargo quickinstall cargo-edit \
&& cargo quickinstall cargo-generate \
&& cargo quickinstall cargo-watch \
&& cargo quickinstall wasm-pack \
&& cargo quickinstall xargo

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

SHELL ["bash", "-euxo", "pipefail", "-c"]

RUN set -euxo pipefail >/dev/null \
&& rustup target add x86_64-unknown-linux-musl


# Cross-compilation to WebAssembly
FROM base as cross-wasm32-unknown-unknown

SHELL ["bash", "-euxo", "pipefail", "-c"]

RUN set -euxo pipefail >/dev/null \
&& rustup target add wasm32-unknown-unknown


# Cross-compilation for Linux ARM64
FROM base as cross-aarch64-unknown-linux-gnu

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

USER ${USER}

RUN set -euxo pipefail >/dev/null \
&& rustup target add aarch64-unknown-linux-gnu

ENV CC_aarch64_unknown_linux_gnu=aarch64-linux-gnu-gcc
ENV CXX_aarch64_unknown_linux_gnu=aarch64-linux-gnu-g++
ENV CARGO_TARGET_AARCH64_UNKNOWN_LINUX_GNU_LINKER=aarch64-linux-gnu-gcc


# Cross-compilation for Windows x86_64
FROM base as cross-x86_64-pc-windows-gnu

SHELL ["bash", "-euxo", "pipefail", "-c"]

USER 0

RUN set -euxo pipefail >/dev/null \
&& export DEBIAN_FRONTEND=noninteractive \
&& apt-get update -qq --yes \
&& apt-get install -qq --no-install-recommends --yes \
  gcc-mingw-w64-x86-64 \
>/dev/null \
&& apt-get clean autoclean >/dev/null \
&& apt-get autoremove --yes >/dev/null \
&& rm -rf /var/lib/apt/lists/*

USER ${USER}

RUN set -euxo pipefail >/dev/null \
&& rustup target add x86_64-pc-windows-gnu


# Builds osxcross for Mac cross-compiation
FROM base as osxcross

SHELL ["bash", "-euxo", "pipefail", "-c"]

USER 0

ARG OSXCROSS_URL

# Install cargo-quickinstall
RUN set -euxo pipefail >/dev/null \
&& mkdir -p "/opt/osxcross" \
&& curl -fsSL "${OSXCROSS_URL}" | tar -C "/opt/osxcross" -xJ

USER ${USER}


# Cross-compilation for macOS x86_64
FROM osxcross as cross-x86_64-apple-darwin

SHELL ["bash", "-euxo", "pipefail", "-c"]

USER ${USER}

RUN set -euxo pipefail >/dev/null \
&& rustup target add x86_64-apple-darwin

ENV PATH="/opt/osxcross/bin/:${PATH}"
ENV CC_x86_64-apple-darwin=x86_64-apple-darwin20.2-clang
ENV CXX_x86_64-apple-darwin=x86_64-apple-darwin20.2-clang++
ENV CARGO_TARGET_X86_64_APPLE_DARWIN_LINKER=x86_64-apple-darwin20.2-clang
ENV CARGO_TARGET_X86_64_APPLE_DARWIN_STRIP=x86_64-apple-darwin20.2-strip


# Cross-compilation for macOS ARM64
FROM osxcross as cross-aarch64-apple-darwin

SHELL ["bash", "-euxo", "pipefail", "-c"]

USER ${USER}

RUN set -euxo pipefail >/dev/null \
&& rustup target add aarch64-apple-darwin

ENV PATH="/opt/osxcross/bin/:${PATH}"
ENV CC_aarch64-apple-darwin=aarch64-apple-darwin20.2-clang
ENV CXX_aarch64-apple-darwin=aarch64-apple-darwin20.2-clang++
ENV CARGO_TARGET_AARCH64_APPLE_DARWIN_LINKER=aarch64-apple-darwin20.2-clang
ENV CARGO_TARGET_AARCH64_APPLE_DARWIN_STRIP=aarch64-apple-darwin20.2-strip
