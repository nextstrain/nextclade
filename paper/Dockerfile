# ubuntu:focal-20210921
# https://hub.docker.com/layers/ubuntu/library/ubuntu/focal-20210921/images/sha256-3555f4996aea6be945ae1532fa377c88f4b3b9e6d93531f47af5d78a7d5e3761?context=explore
FROM ubuntu@sha256:3555f4996aea6be945ae1532fa377c88f4b3b9e6d93531f47af5d78a7d5e3761

SHELL ["/bin/bash", "-c"]

RUN set -euxo pipefail >dev/null \
&& export DEBIAN_FRONTEND=noninteractive \
&& apt-get update -qq --yes \
&& apt-get install -qq --no-install-recommends --yes \
  bash \
  bash-completion \
  ca-certificates \
  curl \
  lmodern \
  make \
  pandoc \
  pandoc-citeproc \
  pandoc-citeproc-preamble \
  sudo \
  texlive-fonts-extra \
  texlive-fonts-recommended \
  texlive-latex-base \
  texlive-latex-extra \
>/dev/null \
&& apt-get autoremove --yes >/dev/null \
&& apt-get clean autoclean >/dev/null \
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
ENV NODE_DIR="/opt/node"
ENV PATH="${NODE_DIR}/bin:${HOME}/.local/bin:$PATH"

RUN set -euxo pipefail >dev/null \
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
&& touch ${HOME}/.hushlogin

#COPY .nvmrc /


#RUN set -euxo pipefail >dev/null \
#&& mkdir -p "${NODE_DIR}" \
#&& cd "${NODE_DIR}" \
#&& export NODE_VERSION=$(cat /.nvmrc) \
#&& curl -fsSL  "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" | tar -xJ --strip-components=1 \
#&& npm install -g nodemon@2.0.7 yarn@1.22.15 >/dev/null

RUN set -euxo pipefail >/dev/null \
&& touch "${HOME}/.bash_completion" \
&& touch "${HOME}/.bash_history" \
&& echo 'shopt -s histappend' >> ~/.bashrc \
&& echo 'shopt -s direxpand' >> ~/.bashrc \
&& echo 'shopt -s cdable_vars' >> ~/.bashrc \
&& echo 'shopt -s checkwinsize' >> ~/.bashrc \
&& echo 'shopt -s globstar' >> ~/.bashrc \
&& echo 'shopt -s dotglob' >> ~/.bashrc \
&& echo 'alias ll="ls --color=always -alFhp"' >> ~/.bashrc \
&& echo 'alias la="ls -Ah"' >> ~/.bashrc \
&& echo 'alias l="ls -CFh"' >> ~/.bashrc \
&& echo 'alias y="yarn"' >> ~/.bashrc \
&& echo 'alias ya="yarn add"' >> ~/.bashrc \
&& echo 'alias yad="yarn add dev"' >> ~/.bashrc \
&& echo 'alias yr="yarn remove"' >> ~/.bashrc \
&& echo 'alias yw="yarn why"' >> ~/.bashrc \
&& echo 'function mkcd() { mkdir -p ${1} && cd ${1} ; }' >> ~/.bashrc \
&& echo "source ~/.bash_completion" >> ~/.bashrc

RUN set -euxo pipefail \
&& chown -R ${USER}:${GROUP} ${HOME}

USER ${USER}

WORKDIR /src
