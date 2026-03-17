# syntax=docker/dockerfile:1
# check=experimental=all

FROM scratch

ARG TARGETARCH
COPY ".out/nextclade-${TARGETARCH}-linux-musl" "/usr/bin/nextclade"
COPY ".out/nextclade-${TARGETARCH}-linux-musl" "/usr/bin/nextalign"

ENV PATH="/usr/bin:${PATH}"
