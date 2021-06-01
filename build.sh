#!/bin/sh -x
#
# transpile into the server-side middleware app
# and bundle for the client-side browser app

tsc
browserify build/door/client.js -o build/door/static/bundle.js
