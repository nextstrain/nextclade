# syntax=docker/dockerfile:1
# check=experimental=all

FROM scratch AS bin-amd64
COPY ".out/nextclade-x86_64-unknown-linux-musl" "/nextclade"

FROM scratch AS bin-arm64
COPY ".out/nextclade-aarch64-unknown-linux-musl" "/nextclade"

ARG BASE_VERSION="3"
FROM alpine:${BASE_VERSION}
SHELL ["/bin/sh", "-euxo", "pipefail", "-c"]

ARG TARGETARCH
COPY --from=bin-${TARGETARCH} "/nextclade" "/usr/bin/nextclade"

RUN set -euxo pipefail >/dev/null \
&& ln -s "/usr/bin/nextclade" "/usr/bin/nextalign" \
&& ln -s "/usr/bin/nextclade" "/nextclade" \
&& ln -s "/usr/bin/nextalign" "/nextalign"
