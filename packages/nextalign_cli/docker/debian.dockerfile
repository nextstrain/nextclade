FROM debian:10

COPY .out/bin/nextalign-Linux-x86_64 /usr/bin/nextalign

RUN ln -s /usr/bin/nextalign /nextalign

RUN set -x \
&& export DEBIAN_FRONTEND=noninteractive \
&& apt-get update -qq --yes \
&& apt-get install -qq --no-install-recommends --yes \
  bash \
  curl \
  procps \
  wget \
>/dev/null \
&& apt-get autoremove --yes >/dev/null \
&& apt-get clean autoclean >/dev/null \
&& rm -rf /var/lib/apt/lists/*
