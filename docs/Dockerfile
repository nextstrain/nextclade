FROM continuumio/miniconda3:4.9.2

ARG DEBIAN_FRONTEND=noninteractive
ARG USER=user
ARG GROUP=user
ARG UID
ARG GID

ENV TERM="xterm-256color"
ENV HOME="/home/user"

# Make a user and group
RUN set -x >/dev/null \
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
&& sed -i /etc/sudoers -re 's/^%sudo.*/%sudo ALL=(ALL:ALL) NOPASSWD:ALL/g' \
&& sed -i /etc/sudoers -re 's/^root.*/root ALL=(ALL:ALL) NOPASSWD:ALL/g' \
&& sed -i /etc/sudoers -re 's/^#includedir.*/## **Removed the include directive** ##"/g' \
&& echo "%sudo ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers \
&& echo "${USER} ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers \
&& touch ${HOME}/.hushlogin \
&& chown -R ${UID}:${GID} "${HOME}"

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
