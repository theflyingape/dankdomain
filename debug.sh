#!/bin/sh

cd ./build
killall door
node ./door/app &
#chromium-browser --app=https://localhost:1939/xterm/door 2> /dev/null &
google-chrome --app=https://localhost:1939/xterm/door 2> /dev/null &
