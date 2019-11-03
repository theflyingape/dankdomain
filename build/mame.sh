#!/bin/sh

# set this to override the default to my door
URL=

path=`dirname $0`; cd $path || exit 1
rpm -q mame > /dev/null || sudo dnf install mame
rpm -q socat > /dev/null || sudo dnf install socat

declare -i PTS

cd console
mame -inipath . vt240 -host pty &> /dev/null &
cd - > /dev/null

echo -e "  ****  Press \x1B[7m Scroll Lock \x1B[m key to TOGGLE keyboard emulation ON"
sleep 5
echo -e "  ****  After '\x1B[1mVT240 OK\x1B[m' shows, the terminal is ready (10-seconds)"
sleep 10

PTS=0
TTY=`ps -hq $$ -o tty`
DEV=$( ls -lh /dev/pts/ | grep `whoami` | grep -ve .*${TTY#*/}$ )
if [ -n "$DEV" ]; then
	PTS=${DEV##*' '}
	socat /dev/pts/$PTS exec:/bin/true || PTS=0
fi

while [ $PTS -lt 1 ]; do
	ls -lh /dev/pts/
	echo
	echo -n "Hmmm... enter the (last) pts number above to attach session: "
	read PTS
	socat /dev/pts/$PTS exec:/bin/true || PTS=0
done

TELNET="telnet"
if [ `basename $PWD` = "build" ]; then
       cd ..
       TELNET="./build/telnet"
fi
EXEC="node $TELNET"
[ -n "$URL" ] && EXEC="$EXEC $URL"

YN="Y"
while [ "$YN" != "N" -a "$YN" != "n" ]; do
	echo
	echo "[`date +'%H:%M%P'`]  Attaching '$EXEC' session to VT240 /dev/pts/$PTS ... "
	socat /dev/pts/$PTS exec:"$EXEC"

	echo
	echo -e "  ****  Either press \x1B[7m Scroll Lock \x1B[m key to TOGGLE keyboard emulation OFF"
	echo -e "  ****  and then press \x1B[1mESC\x1B[mape key to exit MAME (close window)"
	echo
	echo -n "... or, try attaching again (y/N)? "

	read YN
	[ -z "$YN" ] && YN="N"

done

echo
echo "Bye-bye!"
echo

exit 0
