#!/bin/sh -x
#
# transpile into the server-side middleware app
# and bundle for the client-side browser app

[ -L ./tsc ] || ln -s node_modules/typescript/bin/tsc tsc
./tsc -p src

[ -L ./browserify ] || ln -s node_modules/browserify/bin/cmd.js browserify
./browserify build/door/client.js -o build/door/static/bundle.js
