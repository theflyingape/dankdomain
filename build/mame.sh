#!/bin/sh

# set this to override default to my door
URL=

path=`dirname $0`; cd $path || exit 1
rpm -q mame || sudo dnf install mame
rpm -q socat || sudo dnf install socat

declare -i PTS

cd console
mame -inipath . vt240 -host pty 2> /dev/null &
cd -
sleep 4

clear
echo
echo "***  AFTER 'VT240 OK' FINISHES STARTUP"
echo "***  Press Scroll Lock key to toggle keyboard emulation"
echo
sleep 4
ls -lh /dev/pts/
echo

PTS=0
while [ $PTS -lt 1 ]; do
	echo -n "... and enter the pts number above to attach session: "
	read PTS
done

# unclear why, but this helps avoid a false-positive on first attempt
echo
socat /dev/pts/$PTS exec:/bin/true

TELNET="telnet"
if [ `basename $PWD` = "build" ]; then
       cd ..
       TELNET="./build/telnet"
fi
EXEC="node $TELNET"
[ -n "$URL" ] && EXEC="$EXEC $URL"

YN="Y"
while [ "$YN" != "N" -a "$YN" != "n" ]; do
	echo "[`date +'%H:%M%P'`]  Attaching '$EXEC' session to VT240 /dev/pts/$PTS ... "
	socat /dev/pts/$PTS exec:"$EXEC"

	echo -n "Try attaching again (Y/n)? "
	read YN
	[ -z "$YN" ] && YN="Y"
	echo
done

echo "Bye-bye!"

exit

