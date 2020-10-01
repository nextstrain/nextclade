FROM node:14.9.0-stretch

COPY ./dist/nextclade.js /usr/local/bin/

RUN set -x \
&& cd /usr/local/bin/ \
&& ln -s nextclade.js nextclade

CMD '/usr/local/bin/nextclade.js'
