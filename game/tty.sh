#!/bin/sh -l

path=`dirname $0`; cd $path || exit 1
export HOME=$PWD/portal
umask 0002
#eval `resize 2> /dev/null | grep LINES`
[ -n "$LINES" ] || export LINES=25

SERVER=localhost
PORT=1939
EMU=XT
if [ -n "$1" ]; then
	SERVER=$1
	PORT=443
fi
[ -n "$2" ] && PORT=$2
[ -n "$3" ] && EMU=$3

echo node telnet $SERVER $PORT $LINES $EMU
exec node telnet $SERVER $PORT $LINES $EMU
