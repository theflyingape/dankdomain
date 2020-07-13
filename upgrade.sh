#!/bin/sh

[ -n "$1" ] && TARGET="$1" || TARGET=/usr/local/games
TARGET="${TARGET}/`basename ${PWD}`"

# let's prompt for admin credentials now, if necessary
git pull || exit

sudo systemctl stop dankdomain-door
sudo chown -R root.games ${TARGET}
sudo chmod -R u+rw,g+rw,o-rwx ${TARGET}
sudo find ${TARGET} -type d -exec chmod u+x,g+xs {} \;

cd ${TARGET}
rm package-lock.json
env PYTHON=`which python2` npm install

# xterm door service
sudo systemctl start dankdomain-door
sudo systemctl status dankdomain-door -l
