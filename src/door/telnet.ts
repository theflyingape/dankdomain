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

let host = process.argv.length > 2 ? process.argv[2] : 'localhost'
let port = parseInt(process.env.PORT) || 1939
let ssl = {
    key: fs.readFileSync('key.pem'), cert: fs.readFileSync('cert.pem'),
    requestCert: false, rejectUnauthorized: false
}
const URL = `https://${host}:${port}/xterm/door/player/`

if (process.stdin.isTTY) process.stdin.setRawMode(true)

const app = new Promise<number>((resolve, reject) => {
    try {
        require('got')(URL + `?tty=VT`, Object.assign({ method: 'POST'}, ssl))
            .then(response => { resolve(response.body) })
    }
    catch (err) {
        console.log(err.response.body)
        reject(0)
    }
})

dns.lookup(host, (err, addr, family) => {
    app.then(pid => {
        const wss = new ws(URL + `?pid=${pid}`, ssl)
        process.stdout.write(`\n\x1B[0;2mConnecting terminal WebSocket ... `)

        wss.onmessage = (ev) => {
            process.stdout.write(ev.data.toString('ascii'))
        }

        wss.onopen = () => {
            process.stdout.write('open\x1B[m\n')
        }

        wss.onclose = (ev) => {
            process.stdout.write('\x1B[0;2mWebSocket close\x1B[m\n')
            process.exit(0)
        }

        wss.onerror = (ev) => {
            process.stdout.write(`\x1B[0;1;31merror \x1B[m${ev.message}\n`)
            process.exit(1)
        }

        process.stdin.on('data', function(key: Buffer) {
            wss.send(key)
        })
    })
})
