#!/bin/sh
#
# allow for web browser access into a classic terminal mode of play
#
path=`dirname $0`; cd $path || exit
sudo -v || exit
sudo -u nobody /opt/node/bin/node ./door/app &> door.log &
exit
