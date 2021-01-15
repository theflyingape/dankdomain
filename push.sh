#!/bin/sh

# upload built js and files to [my] GCP VM instance
[ -n "$1" ] && TARGET="$1" || TARGET=play.ddgame.us:/usr/local/games/
TARGET="${TARGET}/`basename ${PWD}`"

rsync -av --exclude=files --exclude=users build/ ${TARGET}
rsync -av package.json ${TARGET}

echo
echo "ssh to remote machine and run upgrade.sh script there"
echo
