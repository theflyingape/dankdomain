#!/bin/sh
#
# service allowing web browser access into a classic terminal mode of play
#
path=`dirname $0`; cd $path || exit 1
path=$PWD
umask 0002

sudo -v || exit 2
sudo killall ƊƊnet 2> /dev/null
which node
node $path/portal/app &
#sudo -b -u nobody node $path/portal/app
