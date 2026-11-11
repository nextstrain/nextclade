# syntax=docker/dockerfile:1
# check=experimental=all

ARG BASE_VERSION

FROM debian:${BASE_VERSION}
SHELL ["bash", "-euxo", "pipefail", "-c"]

ARG TARGETARCH
COPY ".out/nextclade-${TARGETARCH}-linux-gnu" "/usr/bin/nextclade"

RUN set -euxo pipefail >/dev/null \
&& ln -s "/usr/bin/nextclade" "/usr/bin/nextalign" \
&& ln -s "/usr/bin/nextclade" "/nextclade" \
&& ln -s "/usr/bin/nextalign" "/nextalign"

# Debian 11 is end-of-life: its packages, including the final security updates, moved to archive.debian.org.
RUN set -euxo pipefail >/dev/null \
&& source "/etc/os-release" \
&& if [[ "${VERSION_CODENAME}" == "bullseye" ]]; then \
  printf "%s\n" \
    "deb http://archive.debian.org/debian bullseye main" \
    "deb http://archive.debian.org/debian bullseye-updates main" \
    "deb http://archive.debian.org/debian-security bullseye-security main" \
  > "/etc/apt/sources.list"; \
fi

RUN set -euxo pipefail >/dev/null \
&& export DEBIAN_FRONTEND=noninteractive \
&& apt-get -o Acquire::Retries=5 update -qq \
&& apt-get -o Acquire::Retries=5 install --no-install-recommends --yes -qq \
  bash \
  ca-certificates \
  curl \
  procps \
  wget \
>/dev/null \
&& apt-get clean autoclean >/dev/null \
&& apt-get autoremove --yes >/dev/null \
&& rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*
