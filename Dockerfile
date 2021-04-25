# 👑 Ɗaɳƙ Ɗoɱaiɳ: the return of Hack & Slash    [ https://www.DDgame.us ]
# Dockerfile authored by: Robert Hurst <theflyingape@gmail.com>
#
# docker build -t dankdomain .
FROM node:buster

# set the working directory
ENV TARGET=/usr/games/dankdomain
WORKDIR ${TARGET}
#
# add package manifest
COPY package.json ${TARGET}
# suppress superfluous NPM install messages
ENV npm_config_loglevel warn
#ENV NODE_PTY_DEBUG 1
# install dependencies
RUN npm install
# install code+files
COPY build ${TARGET}

# cli tools
RUN apt-get update && apt-get install -y rsync telnet

# optional use: ./etc/network.json
RUN openssl req -newkey rsa:2048 -nodes -keyout door/key.pem -x509 -days 365 -out door/cert.pem \
    -subj "/C=US/ST=Rhode Island/L=Providence/O=Dank Domain/OU=Game/CN=localhost"

# app runtime
EXPOSE 1939
EXPOSE 1986
STOPSIGNAL SIGINT
ENV LANG=C.UTF-8
ENV TERM=xterm-256color
CMD ["node", "door/app"]
