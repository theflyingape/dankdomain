#!/bin/sh

[ -n "$1" ] && TARGET="$1" || TARGET=play.ddgame.us:/usr/local/games
TARGET="${TARGET}/`basename ${PWD}`"

rsync -av --exclude=files --exclude=users ./build/ ${TARGET}
