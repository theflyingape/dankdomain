#!/bin/sh

cd ./build
[ -d "users" ] || mkdir -v "users"
killall door
node ./door/app &
#chromium-browser --app=http://localhost:1939/ 2> /dev/null &
google-chrome --app=http://localhost:1939/ 2> /dev/null &
