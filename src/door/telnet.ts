/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  DDCLIENT authored by: Robert Hurst <theflyingape@gmail.com>              *
 *                                                                           *
 *  tty <-> websocket client interface into app                              *
\*****************************************************************************/

import dns = require('dns')
import fs = require('fs')
import ws = require('ws')

process.title = 'ddclient'
process.chdir(__dirname)

let ssl = { key: fs.readFileSync('key.pem'), cert: fs.readFileSync('cert.pem') }
let host = process.argv.length > 2 ? process.argv[2] : 'localhost'
let port = parseInt(process.env.PORT) || 1939
if (process.stdin.isTTY) process.stdin.setRawMode(true)

dns.lookup(host, (err, addr, family) => {
    const URL = `https://${host}:${port}/xterm/door/player/`
    const wss = new ws(URL, program.subprotocol, options)
})

process.on('SIGHUP', function () {
})

process.on('SIGINT', function () {
})
