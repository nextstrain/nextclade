FROM continuumio/miniconda3

SHELL ["bash", "--login", "-euxo", "pipefail", "-c"]

ARG DEBIAN_FRONTEND=noninteractive
ARG USER=user
ARG GROUP=user
ARG UID
ARG GID

ENV TERM="xterm-256color"
ENV HOME="/home/user"


RUN set -euxo pipefail >/dev/null \
&& export DEBIAN_FRONTEND=noninteractive \
&& apt-get update -qq --yes \
&& apt-get install -qq --no-install-recommends --yes \
  make \
  sudo \
>/dev/null \
&& apt-get clean autoclean >/dev/null \
&& apt-get autoremove --yes >/dev/null \
&& rm -rf /var/lib/apt/lists/*

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
&& sed -i /etc/sudoers -re 's/^%sudo.*/%sudo ALL=(ALL:ALL) NOPASSWD:ALL/g' \
&& sed -i /etc/sudoers -re 's/^root.*/root ALL=(ALL:ALL) NOPASSWD:ALL/g' \
&& sed -i /etc/sudoers -re 's/^#includedir.*/## **Removed the include directive** ##"/g' \
&& echo "%sudo ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers \
&& echo "${USER} ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers \
&& touch ${HOME}/.hushlogin \
&& chown -R ${UID}:${GID} "${HOME}" \
&& chown -R ${USER}:${GROUP} ${HOME}

WORKDIR /workdir

COPY environment.yml /workdir

RUN set -euxo pipefail >/dev/null \
  && conda env create -n "docs.clades.nextstrain.org"

USER ${USER}

ENTRYPOINT ["conda", "run", "--no-capture-output", "-n", "docs.clades.nextstrain.org", "bash", "-euo", "pipefail", "-c"]

CMD ["cd docs && make autobuild"]
