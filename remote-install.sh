#!/bin/sh

# upload built js, et al, to [my] GCP VM instance
[ -n "$1" ] && TARGET="$1" || TARGET=play.ddgame.us:/usr/games/dankdomain

rsync -v package.json ${TARGET} && \
rsync -rluv --exclude=files/tavern --exclude=files/user --exclude=users game/ ${TARGET}/game/
