#!/bin/sh

killall ddgame
node --inspect ./build/door/app
#chromium-browser --app=http://localhost:1939/ 2> /dev/null &
#google-chrome --app=http://localhost:1939/ 2> /dev/null &
#./tty.sh
