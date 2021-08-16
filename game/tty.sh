#!/bin/sh -l

path=`dirname $0`; cd $path || exit 1
export HOME=$PWD/portal
umask 0002
#eval `resize 2> /dev/null | grep LINES`
[ -n "$LINES" ] || export LINES=25

[ -n "$1" ] && SERVER=$1 || SERVER=localhost
[ -n "$2" ] && PORT=$2 || PORT=1939

echo node telnet $SERVER $PORT $LINES XT
exec node telnet $SERVER $PORT $LINES XT
