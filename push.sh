#!/bin/sh

# upload built js, et al, to [my] GCP VM instance
[ -n "$1" ] && TARGET="$1" || TARGET=play.ddgame.us:/usr/local/games/
TARGET="${TARGET}/`basename ${PWD}`"

rsync -av --exclude=*.map --exclude=files --exclude=users build/ ${TARGET} 2> /dev/null
rsync -av package.json ${TARGET}

echo
echo "ssh to remote machine and run upgrade.sh script there"
echo
