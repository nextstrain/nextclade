#!/usr/bin/env bash

set -euo pipefail

docker run --rm -it \
  -v "$(pwd):/workdir" \
  --workdir="/workdir" \
  debian:7.11 \
  bash -c "\set -euxo pipefail \
  && cat /etc/apt/sources.list \
  && printf '\
    deb http://archive.debian.org/debian wheezy main non-free contrib\n\
    deb http://archive.debian.org/debian wheezy-backports main non-free contrib\n\
    deb http://archive.debian.org/debian-security wheezy/updates main non-free contrib\n\
    deb-src http://archive.debian.org/debian wheezy main non-free contrib\n\
    deb-src http://archive.debian.org/debian wheezy-backports main non-free contrib\n\
    deb-src http://archive.debian.org/debian-security wheezy/updates main non-free contrib\n\
    ' > '/etc/apt/sources.list' \
  && echo 'Acquire::Check-Valid-Until false;' >> '/etc/apt/apt.conf.d/10-nocheckvalid' \
  && apt-get update >/dev/null \
  && apt-get -f dist-upgrade >/dev/null \
  && apt-get install -qq --yes dpkg-dev >/dev/null \
  && dpkg -a --configure >/dev/null \
  && apt-get source libc6 \
"

#docker run --rm -it \
#  debian:8.0 \
#  bash -c "\set -euxo pipefail \
#  && cat /etc/apt/sources.list \
#  && printf '\
#    deb http://archive.debian.org/debian wheezy main non-free contrib\n\
#    deb http://archive.debian.org/debian wheezy-backports main non-free contrib\n\
#    deb http://archive.debian.org/debian-security wheezy/updates main non-free contrib\n\
#    ' >> '/etc/apt/sources.list' \
#  && echo 'Acquire::Check-Valid-Until false;' >> '/etc/apt/apt.conf.d/10-nocheckvalid' \
#  && apt-get update >/dev/null \
#  && apt-cache madison libc6 \
#"
#
