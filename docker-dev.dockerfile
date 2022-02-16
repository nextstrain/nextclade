# Freeze base image version to
# ubuntu:20.04 (pushed 2022-01-07T02:40:05.784436Z)
# https://hub.docker.com/layers/ubuntu/library/ubuntu/20.04/images/sha256-57df66b9fc9ce2947e434b4aa02dbe16f6685e20db0c170917d4a1962a5fe6a9
FROM ubuntu@sha256:57df66b9fc9ce2947e434b4aa02dbe16f6685e20db0c170917d4a1962a5fe6a9

SHELL ["bash", "-c"]

ARG CLANG_VERSION="13"
ARG DASEL_VERSION="1.22.1"
ARG WATCHEXEC_VERSION="1.17.1"
ARG NODEMON_VERSION="2.0.15"
ARG YARN_VERSION="1.22.17"

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
ENV PATH="${NODE_DIR}/bin:${HOME}/.local/bin:${HOME}/.cargo/bin:${HOME}/.cargo/install/bin:${PATH}"

RUN set -euxo pipefail >/dev/null \
&& curl -fsSL "https://github.com/TomWright/dasel/releases/download/v${DASEL_VERSION}/dasel_linux_amd64" -o "/usr/bin/dasel" \
&& chmod +x "/usr/bin/dasel" \
&& dasel --version

RUN set -euxo pipefail >/dev/null \
&& curl -sSL "https://github.com/watchexec/watchexec/releases/download/cli-v${WATCHEXEC_VERSION}/watchexec-${WATCHEXEC_VERSION}-x86_64-unknown-linux-musl.tar.xz" | tar -C "/usr/bin/" -xJ --strip-components=1 "watchexec-1.17.1-x86_64-unknown-linux-musl/watchexec" \
&& chmod +x "/usr/bin/watchexec" \
&& watchexec --version

COPY .nvmrc /

RUN set -eux >dev/null \
&& mkdir -p "${NODE_DIR}" \
&& cd "${NODE_DIR}" \
&& NODE_VERSION=$(cat /.nvmrc) \
&& curl -fsSL  "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" | tar -xJ --strip-components=1 \
&& npm install -g nodemon@${NODEMON_VERSION} yarn@${YARN_VERSION} >/dev/null \
&& npm config set scripts-prepend-node-path auto


COPY rust-toolchain.toml "${HOME}/rust-toolchain.toml"

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
