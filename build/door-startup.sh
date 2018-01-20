#!/bin/sh
#
# allow for web browser access into a classic terminal mode of play
#
path=`dirname $0`; cd $path || exit
path=$PWD

sudo -v || exit
sudo killall door 2> /dev/null
sudo -b -u nobody /opt/node/bin/node $path/door/app &> door.log

exit

