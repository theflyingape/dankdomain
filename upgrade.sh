#!/bin/sh

[ -n "$1" ] && TARGET="$1" || TARGET=/usr/local/games
TARGET="${TARGET}/`basename ${PWD}`"

sudo systemctl stop dankdomain-door
git pull

cd ${TARGET}
rm -fv package-lock.json
npm install

sudo chown -R root.games .
sudo chmod -R u+rw,g+rw,o-rwx .
sudo find . -type d -exec chmod u+x,g+xs {} \;
cd -

# xterm door service
sudo systemctl start dankdomain-door
sudo systemctl status dankdomain-door -l
