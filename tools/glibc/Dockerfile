FROM debian:7.11

SHELL ["bash", "-euxo", "pipefail", "-c"]

RUN set -euxo pipefail >/dev/null \
&& printf "deb http://archive.debian.org/debian wheezy main non-free contrib\ndeb http://archive.debian.org/debian-security wheezy/updates main non-free contrib\n" > "/etc/apt/sources.list" \
&& echo "Acquire::Check-Valid-Until false;" >> "/etc/apt/apt.conf.d/10-nocheckvalid" \
&& export DEBIAN_FRONTEND=noninteractive \
&& apt-get update -qq --yes \
&& apt-get install -qq --no-install-recommends --yes \
  apt-transport-https \
  bash \
  build-essential \
  ca-certificates \
  curl \
  gawk \
  git \
  libssl-dev \
  lsb-release \
  parallel \
  pkg-config \
  sudo \
  xz-utils \
>/dev/null \
&& apt-get clean autoclean >/dev/null \
&& apt-get autoremove --yes >/dev/null \
&& rm -rf /var/lib/apt/lists/*
