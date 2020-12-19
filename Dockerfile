# 👑 Ɗanƙ Ɗomaiƞ: the return of Hack & Slash    [ https://www.DDgame.us ]
# Dockerfile authored by: Robert Hurst <theflyingape@gmail.com>
#
# docker build -t dankdomain .
FROM centos:latest
EXPOSE 1939
EXPOSE 1986

ENV LANG=C.UTF-8
RUN dnf -y upgrade-minimal
RUN dnf -y install openssl 
RUN dnf -y module install nodejs:14
RUN dnf -y install gcc-c++ git glibc-common glibc-devel glibc-headers glibc-langpack-en make python36

# set the working directory
ENV TARGET=/usr/games/dankdomain
WORKDIR ${TARGET}
#ENV NODE_PTY_DEBUG 1
CMD ["npm", "start"]

# add code+files, manifest, and install dependencies
COPY build ${TARGET}
COPY package.json ${TARGET}
RUN npm install
RUN openssl req -newkey rsa:2048 -nodes -keyout door/key.pem -x509 -days 365 -out door/cert.pem \
    -subj "/C=US/ST=Rhode Island/L=Providence/O=Dank Domain/OU=Game/CN=localhost"
