FROM scratch

COPY .out/bin/nextclade-Linux-x86_64 /nextclade

ENTRYPOINT ["/nextclade"]
