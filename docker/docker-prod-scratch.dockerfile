# syntax=docker/dockerfile:1
# check=experimental=all

FROM scratch

ARG TARGETARCH
COPY ".out/nextclade-${TARGETARCH}-linux-musl" "/nextclade"
COPY ".out/nextclade-${TARGETARCH}-linux-musl" "/nextalign"
