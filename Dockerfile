# Target: builder
# Purpose: production build environment used in CI and for local testing of the release build

# ubuntu:focal-20210119
# https://hub.docker.com/layers/ubuntu/library/ubuntu/focal-20210119/images/sha256-3093096ee188f8ff4531949b8f6115af4747ec1c58858c091c8cb4579c39cc4e?context=explore
FROM ubuntu@sha256:3093096ee188f8ff4531949b8f6115af4747ec1c58858c091c8cb4579c39cc4e as builder

RUN set -x \
&& export DEBIAN_FRONTEND=noninteractive \
&& apt-get update -qq --yes \
&& apt-get install -qq --no-install-recommends --yes \
  bash \
  ccache \
  cmake \
  coreutils \
  cppcheck \
  curl \
  file \
  g++ \
  gcc \
  gdb \
  git \
  make \
  python3 \
  python3-pip \
  python3-setuptools \
  python3-wheel \
  unzip \
  xz-utils \
>/dev/null \
&& apt-get autoremove --yes >/dev/null \
&& apt-get clean autoclean >/dev/null \
&& rm -rf /var/lib/apt/lists/*

RUN set -x \
&& pip3 install --upgrade --quiet \
  colorama \
  conan \
  cpplint \
&& rm -rf ~/.cache/pip/*

ARG NEXTCLADE_EMSDK_VERSION

COPY scripts/install_emscripten.sh /

RUN set -x \
&& /install_emscripten.sh "/emsdk" "${NEXTCLADE_EMSDK_VERSION}"

ENV TERM="xterm-256color"
ENV HOME="/home/${USER}"
ENV NEXTCLADE_EMSDK_DIR="/emsdk"
ENV NEXTCLADE_EMSDK_VERSION=${NEXTCLADE_EMSDK_VERSION}

WORKDIR /src

#-------------------------------------------------------------------------------

# Target: web
# Purpose: web environment used for production web build
FROM builder as web

ARG NEXTCLADE_NODE_VERSION

ENV TERM="xterm-256color"
ENV NVM_DIR="/opt/nvm"
ENV PATH="${NVM_DIR}/versions/node/default/bin:$PATH"
ENV NEXTCLADE_NVM_DIR="/opt/nvm"
ENV NEXTCLADE_NODE_VERSION="${NEXTCLADE_NODE_VERSION}"

COPY scripts/install_node.sh /

RUN set -x \
&& /install_node.sh "/opt/nvm" "${NEXTCLADE_NODE_VERSION}"

RUN set -x \
&& mkdir /awscli-tmp \
&& cd /awscli-tmp \
&& curl -fsS "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
&& unzip -oqq awscliv2.zip \
&& ./aws/install --update \
&& rm -rf /awscli-tmp

ENV PATH="${NEXTCLADE_NVM_DIR}/versions/node/default/bin:${HOME}/.local/bin:$PATH"

RUN set -x \
&& mkdir -p "/home/.config/yarn" \
&& npm install -g \
  nodemon@2.0.7 \
  yarn@1.22.10

WORKDIR /src

#-------------------------------------------------------------------------------

# Target: developer
# Purpose: development environment used for the routine C++ development tasks
FROM builder as developer

USER 0

RUN set -x \
&& export DEBIAN_FRONTEND=noninteractive \
&& apt-get update -qq --yes \
&& apt-get install -qq --no-install-recommends --yes \
  build-essential \
  clang-format-10 \
  clang-tidy \
  clang-tools-10 \
  curl \
  libclang-common-10-dev \
  llvm-10 \
  sudo \
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

ENV NVM_DIR="${HOME}/.nvm"
ENV PATH="${NVM_DIR}/versions/node/default/bin:${HOME}/.local/bin:$PATH"

RUN addgroup --system --gid ${GID} ${GROUP}

RUN useradd --system --create-home --home-dir ${HOME} \
--shell /bin/bash \
--gid ${GROUP} \
--groups sudo \
--uid ${UID} \
${USER} \
&& sed -i /etc/sudoers -re 's/^%sudo.*/%sudo ALL=(ALL:ALL) NOPASSWD: ALL/g' \
&& sed -i /etc/sudoers -re 's/^root.*/root ALL=(ALL:ALL) NOPASSWD: ALL/g' \
&& sed -i /etc/sudoers -re 's/^#includedir.*/## **Removed the include directive** ##"/g' \
&& echo "foo ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers \
&& touch ${HOME}/.hushlogin

RUN set -x \
&& git clone --recursive https://github.com/creationix/nvm.git ${NVM_DIR}

RUN . ${NVM_DIR}/nvm.sh \
&& export NODE_VERSION=$(nvm version-remote --lts) \
&& nvm install ${NODE_VERSION} \
&& nvm alias default ${NODE_VERSION} || true \
&& cd ${NVM_DIR}/versions/node >/dev/null \
&& ln -s ${NODE_VERSION} default \
&& npm install -g nodemon@2.0.6

RUN set -x \
&& chown -R ${USER}:${GROUP} ${HOME}

USER ${USER}

WORKDIR /src

ENTRYPOINT ["make", "dev"]

#-------------------------------------------------------------------------------
