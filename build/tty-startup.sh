#!/bin/sh
#
# allow for web browser access into a classic terminal mode of play
#
path=`dirname $0`; cd $path
sudo -v || exit
sudo -u nobody /opt/node/bin/node ./node_modules/tty.js/bin/tty.js --config ./tty/files/tty.json &> tty.log &
exit
