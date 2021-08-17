FROM alpine:3.14

COPY .out/bin/nextalign-Linux-x86_64 /usr/bin/nextalign

RUN ln -s /usr/bin/nextalign /nextalign
