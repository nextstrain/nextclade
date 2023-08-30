FROM alpine:3

COPY .out/nextclade-x86_64-unknown-linux-musl /usr/bin/nextclade

RUN set -eux \
&& ln -s /usr/bin/nextclade /usr/bin/nextalign \
&& ln -s /usr/bin/nextclade /nextclade \
&& ln -s /usr/bin/nextalign /nextalign
