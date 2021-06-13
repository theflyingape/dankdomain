#!/bin/sh
#
# service allowing web browser access into a classic terminal mode of play
#
path=`dirname $0`; cd $path || exit 1
path=$PWD
umask 0002

sudo -v || exit 2
sudo killall ƊƊgame 2> /dev/null
sudo -b -u nobody /usr/bin/node $path/door/app &> door.log
