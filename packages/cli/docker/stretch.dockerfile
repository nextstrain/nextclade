FROM node:14.9.0-stretch

COPY ./dist/nextclade.js /usr/local/bin/

CMD '/usr/local/bin/nextclade.js'
