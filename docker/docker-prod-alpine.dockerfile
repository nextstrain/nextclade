# syntax=docker/dockerfile:1
# check=experimental=all

ARG BASE_VERSION

FROM alpine:${BASE_VERSION}
SHELL ["/bin/sh", "-euxo", "pipefail", "-c"]

ARG TARGETARCH
COPY ".out/nextclade-${TARGETARCH}-linux-musl" "/usr/bin/nextclade"

RUN set -euxo pipefail >/dev/null \
&& ln -s "/usr/bin/nextclade" "/usr/bin/nextalign" \
&& ln -s "/usr/bin/nextclade" "/nextclade" \
&& ln -s "/usr/bin/nextalign" "/nextalign"
