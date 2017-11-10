#!/bin/sh

cd ./build
killall door
node ./door/app &
firefox https://0.0.0.0:1965 &
