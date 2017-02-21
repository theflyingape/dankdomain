#!/bin/sh
#
# allow for web browser access into a classic terminal mode of play
#
cd /usr/local/games/dankdomain
sudo -v
sudo killall tty.js
sudo service xinetd restart
sudo -u nobody /opt/node/bin/node ./node_modules/tty.js/bin/tty.js --config ./tty/files/tty.json &> tty.log &
exit
