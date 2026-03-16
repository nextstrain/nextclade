# syntax=docker/dockerfile:1
# check=experimental=all

FROM scratch AS bin-amd64
COPY ".out/nextclade-x86_64-unknown-linux-gnu" "/nextclade"

FROM scratch AS bin-arm64
COPY ".out/nextclade-aarch64-unknown-linux-gnu" "/nextclade"

FROM debian:11
SHELL ["bash", "-euxo", "pipefail", "-c"]

ARG TARGETARCH
COPY --from=bin-${TARGETARCH} "/nextclade" "/usr/bin/nextclade"

RUN set -euxo pipefail >/dev/null \
&& ln -s "/usr/bin/nextclade" "/usr/bin/nextalign" \
&& ln -s "/usr/bin/nextclade" "/nextclade" \
&& ln -s "/usr/bin/nextalign" "/nextalign"

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
