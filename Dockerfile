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
  file \
  gdb \
  g++ \
  gcc \
  make \
  python3 \
  python3-pip \
  python3-setuptools \
  python3-wheel \
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

USER ${USER}

WORKDIR /src

ENTRYPOINT ["make", "prod"]

#-------------------------------------------------------------------------------

# Target: developer
# Purpose: development environment used for the routine development tasks
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
  git \
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
