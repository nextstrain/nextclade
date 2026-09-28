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

# Debian 11 is end-of-life: its packages moved to archive.debian.org, which has no bullseye-security suite.
# Security updates come from the snapshot taken right after the final update (2026-08-31).
RUN set -euxo pipefail >/dev/null \
&& source "/etc/os-release" \
&& if [[ "${VERSION_CODENAME}" == "bullseye" ]]; then \
  printf "%s\n" \
    "deb http://archive.debian.org/debian bullseye main" \
    "deb http://archive.debian.org/debian bullseye-updates main" \
    "deb [check-valid-until=no] http://snapshot.debian.org/archive/debian-security/20260901T000000Z bullseye-security main" \
  > "/etc/apt/sources.list"; \
fi

RUN set -euxo pipefail >/dev/null \
&& export DEBIAN_FRONTEND=noninteractive \
&& apt-get update -qq \
&& apt-get install --no-install-recommends --yes -qq \
  bash \
  ca-certificates \
  curl \
  procps \
  wget \
>/dev/null \
&& apt-get clean autoclean >/dev/null \
&& apt-get autoremove --yes >/dev/null \
&& rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*
