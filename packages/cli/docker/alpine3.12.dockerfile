FROM node:14.9.0-alpine3.12

COPY ./dist/nextclade.js /usr/local/bin/

CMD '/usr/local/bin/nextclade.js'
