# ubuntu:focal-20210119
# https://hub.docker.com/layers/ubuntu/library/ubuntu/focal-20210119/images/sha256-3093096ee188f8ff4531949b8f6115af4747ec1c58858c091c8cb4579c39cc4e?context=explore
FROM ubuntu@sha256:3093096ee188f8ff4531949b8f6115af4747ec1c58858c091c8cb4579c39cc4e as builder

SHELL ["/bin/bash", "-c"]

# System packages
COPY apt-packages.txt /apt-packages.txt
RUN set -euxo pipefail >dev/null \
&& export DEBIAN_FRONTEND=noninteractive \
&& apt-get update -qq --yes \
&& xargs -a /apt-packages.txt apt-get install -qq --no-install-recommends --yes >/dev/null \
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
ENV EMSDK_DIR="/opt/emsdk"
ENV NODE_DIR="/opt/node"
ENV PATH="${NODE_DIR}/bin:${EMSDK_DIR}:${HOME}/.local/bin:$PATH"

# Python
COPY requirements.txt /requirements.txt
RUN set -euxo pipefail >dev/null \
&& pip3 install --upgrade --quiet -r /requirements.txt \
&& rm -rf ~/.cache/pip/*

# Emscripten
COPY scripts/install_emscripten.sh /install_emscripten.sh
COPY .emsdk /.emsdk
RUN set -euxo pipefail >dev/null \
&& export EMSDK_VERSION=$(cat /.emsdk) \
&& /install_emscripten.sh "${EMSDK_DIR}" "${EMSDK_VERSION}"

# Node.js
COPY .nvmrc /.nvmrc
RUN set -euxo pipefail >dev/null \
&& mkdir -p "${NODE_DIR}" \
&& cd "${NODE_DIR}" \
&& export NODE_VERSION=$(cat /.nvmrc) \
&& curl -fsSL  "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" | tar -xJ --strip-components=1 \
&& npm install -g nodemon@2.0.7 yarn@1.22.15 >/dev/null \
&& npm config set scripts-prepend-node-path auto

# AWS CLI
RUN set -euxo pipefail >dev/null \
&& mkdir /awscli-tmp \
&& cd /awscli-tmp \
&& curl -fsS "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
&& unzip -oqq awscliv2.zip \
&& ./aws/install --update \
&& rm -rf /awscli-tmp

# csvlint
RUN set -euxo pipefail >dev/null \
  && export CSVLINT_VERSION="0.3.0" \
  && export URL="https://github.com/Clever/csvlint/releases/download/v${CSVLINT_VERSION}/csvlint-v${CSVLINT_VERSION}-linux-amd64.tar.gz" \
  && cd / \
  && curl -fsSL "${URL}" | tar -xz -C / \
  && mv "csvlint-v${CSVLINT_VERSION}-linux-amd64/csvlint" "/usr/bin/csvlint"

## csv-validator
RUN set -euxo pipefail >dev/null \
  && export CSV_VALIDATOR_VERSION="1.1.5" \
  && export URL="https://github.com/digital-preservation/csv-validator/releases/download/${CSV_VALIDATOR_VERSION}/csv-validator-cmd-${CSV_VALIDATOR_VERSION}-application.zip" \
  && cd /tmp \
  && curl -fsSL "${URL}" -o "csv-validator.zip" \
  && unzip "csv-validator.zip" \
  && cp -rv "csv-validator-cmd-${CSV_VALIDATOR_VERSION}/bin/validate" "/usr/bin/csv-validator" \
  && cp -rv "csv-validator-cmd-${CSV_VALIDATOR_VERSION}/lib" "/usr/" \
  && rm -rf /tmp/*

# Add user and group
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
&& touch ${HOME}/.hushlogin \
&& chown -R ${USER}:${GROUP} ${HOME}

USER ${USER}

WORKDIR /src

ENTRYPOINT ["make", "dev"]
