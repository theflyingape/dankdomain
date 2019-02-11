#!/bin/sh -l
path=`dirname $0`; cd $path || exit 1
umask 0002
eval `rezize | grep LINES`
exec node ./door/telnet localhost $LINES
