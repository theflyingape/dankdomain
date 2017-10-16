#!/bin/sh

killall tty.js
node ./node_modules/tty.js/bin/tty.js --config ./debug.json &
firefox --new-instance -safe-mode --jsconsole --jsdebugger http://0.0.0.0:2017 &

