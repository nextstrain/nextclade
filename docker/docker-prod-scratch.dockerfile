# syntax=docker/dockerfile:1
# check=experimental=all

FROM scratch AS bin-amd64
COPY ".out/nextclade-x86_64-unknown-linux-musl" "/nextclade"
COPY ".out/nextclade-x86_64-unknown-linux-musl" "/nextalign"

FROM scratch AS bin-arm64
COPY ".out/nextclade-aarch64-unknown-linux-musl" "/nextclade"
COPY ".out/nextclade-aarch64-unknown-linux-musl" "/nextalign"

FROM scratch
ARG TARGETARCH
COPY --from=bin-${TARGETARCH} "/nextclade" "/nextclade"
COPY --from=bin-${TARGETARCH} "/nextalign" "/nextalign"
