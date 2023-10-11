FROM scratch

COPY .out/nextclade-x86_64-unknown-linux-musl /nextclade

RUN set -eux \
&& ln -s /usr/bin/nextclade /usr/bin/nextalign
