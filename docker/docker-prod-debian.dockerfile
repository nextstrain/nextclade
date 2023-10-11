FROM debian:11

COPY .out/nextclade-x86_64-unknown-linux-gnu /usr/bin/nextclade

RUN set -eux \
&& ln -s /usr/bin/nextclade /usr/bin/nextalign \
&& ln -s /usr/bin/nextclade /nextclade \
&& ln -s /usr/bin/nextalign /nextalign \
&& export DEBIAN_FRONTEND=noninteractive \
&& apt-get update -qq --yes \
&& apt-get install -qq --no-install-recommends --yes \
  bash \
  ca-certificates \
  curl \
  procps \
  wget \
>/dev/null \
&& apt-get autoremove --yes >/dev/null \
&& apt-get clean autoclean >/dev/null \
&& rm -rf /var/lib/apt/lists/*
