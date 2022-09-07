# 👑 Ɗaɳƙ Ɗoɱaiɳ: the return of Hack & Slash    [ https://www.DDgame.us ]
# Dockerfile authored by: Robert Hurst <theflyingape@gmail.com>
#
# docker build -t dankdomain .
FROM node:lts-bullseye
LABEL maintainer="theflyingape@gmail.com"

# set the working directory
ENV TARGET=/usr/games
WORKDIR ${TARGET}
RUN git clone https://github.com/theflyingape/dankdomain
WORKDIR ${TARGET}/dankdomain
# complement portal with any of my local files
COPY game/portal game/portal
# cli tools
RUN apt-get update && apt-get install -y rsync sudo telnet
#
# suppress superfluous NPM install messages
ENV npm_config_loglevel warn
ENV NODE_ENV development
#ENV NODE_PTY_DEBUG 1
# install dependencies
RUN npm install

# app runtime
EXPOSE 1939
EXPOSE 1986
STOPSIGNAL SIGINT
ENV LANG=C.UTF-8
ENV TERM=xterm-256color
CMD ["node", "game/portal/app"]
