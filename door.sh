#!/bin/sh

cd ./build
killall door
node ./door/app &
google-chrome --app=https://0.0.0.0:1965 &

