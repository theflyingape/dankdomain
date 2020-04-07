#!/bin/sh -l

path=`dirname $0`; cd $path || exit 1
export HOME=$PWD/door
umask 0002
eval `resize | grep LINES`

exec node $1 telnet localhost 1939 $LINES
