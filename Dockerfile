FROM ubuntu:focal

ARG DEBIAN_FRONTEND=noninteractive
ARG USER
ARG GROUP
ARG UID
ARG GID

ENV USER=$USER
ENV GROUP=$GROUP
ENV UID=$UID
ENV GID=$GID
ENV TERM="xterm-256color"
ENV HOME="/home/user"
ENV NVM_DIR="${HOME}/.nvm"
ENV PATH="${NVM_DIR}/versions/node/default/bin:${HOME}/.local/bin:$PATH"

RUN set -x \
&& apt-get update -qq --yes \
>/dev/null

RUN set -x \
&& apt-get install -qq --no-install-recommends --yes \
  apt-transport-https \
  apt-utils \
  bash \
  build-essential \
  ccache \
  clang-format-10 \
  clang-tidy \
  clang-tools-10 \
  cmake \
  coreutils \
  cppcheck \
  curl \
  g++ \
  gcc \
  gdb \
  git \
  libclang-common-10-dev \
  llvm-10 \
  make \
  python3 \
  python3-dev \
  python3-pip \
  python3-setuptools \
  python3-wheel \
  sudo \
>/dev/null

RUN set -x \
&& pip3 install --upgrade --quiet \
  colorama \
  conan \
  cpplint

RUN set -x \
&& addgroup --system --gid ${GID} ${GROUP} \
&& useradd --system --create-home --home-dir ${HOME} \
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
&& npm install -g npm yarn nodemon

RUN set -x \
&& chown -R ${USER}:${GROUP} ${HOME}

USER ${USER}

RUN set -x \
&& conan profile new default --detect \
&& conan profile update settings.compiler.libcxx=libstdc++11 default \
&& conan remote add bincrafters https://api.bintray.com/conan/bincrafters/public-conan

WORKDIR /src
