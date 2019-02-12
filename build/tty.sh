#!/bin/sh -l
path=`dirname $0`; cd $path || exit 1
umask 0002
eval `resize | grep LINES`
exec node telnet localhost 1939 $LINES
