FROM continuumio/miniconda3:4.9.2

ARG DEBIAN_FRONTEND=noninteractive
ARG USER=user
ARG GROUP=user
ARG UID
ARG GID

ENV TERM="xterm-256color"
ENV HOME="/home/user"

RUN set -x \
  && mkdir -p ${HOME}/src \
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
  && touch ${HOME}/.hushlogin

RUN set -x \
  && chown -R ${USER}:${GROUP} ${HOME}

COPY environment.yml ${HOME}/src/

WORKDIR ${HOME}/src

RUN set -x \
  && conda env create docs.clades.nextstrain.org

USER ${USER}

RUN set -x \
  && conda init bash \
  && echo "conda activate docs.clades.nextstrain.org" >> ${HOME}/.bashrc

CMD bash -c "set -x \
  && source ${HOME}/.bashrc \
  && cd ${HOME}/src/docs \
  && rm -rf build \
  && make autobuild \
  "
