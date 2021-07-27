#!/bin/sh
#
# service allowing web browser access into a classic terminal mode of play
#
path=`dirname $0`; cd $path || exit 1
umask 0002
killall ƊƊnet 2> /dev/null
node portal/app
