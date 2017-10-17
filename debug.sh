#!/bin/sh

killall tty.js
node ./node_modules/tty.js/bin/tty.js --config ./debug.json &
firefox http://0.0.0.0:2017 &

