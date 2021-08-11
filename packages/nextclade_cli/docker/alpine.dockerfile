FROM alpine:3.14

COPY .out/bin/nextclade-Linux-x86_64 /usr/bin/nextclade

RUN ln -s /usr/bin/nextclade /nextclade
