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

let host = process.argv.length > 2 ? process.argv[2] : 'robert.hurst-ri.us'
let port = process.argv.length > 3 ? parseInt(process.argv[3]) : 443
let rows = process.argv.length > 4 ? parseInt(process.argv[4]) : 24
const URL = `https://${host}:${port}/xterm/door/player/`
let ssl = {
    key: fs.readFileSync('./door/key.pem'), cert: fs.readFileSync('./door/cert.pem'),
    requestCert: false, rejectUnauthorized: false
}

if (process.stdin.isTTY) process.stdin.setRawMode(true)

dns.lookup(host, (err, addr, family) => {
    if (err) console.log(err)
    else {
        process.stdout.write(`\r\n\x1B[mRequesting ${URL}\r\n  to start new DD client ... `)
        const app = new Promise<number>((resolve, reject) => {
            if (resolve)
                try {
                    require('got')(URL + `?rows=${rows}&tty=VT`, Object.assign({ method: 'POST', headers: { 'x-forwarded-for': process.env.REMOTEHOST || process.env.HOSTNAME } }, ssl))
                        .then(response => {
                            resolve(response.body)
                        }).catch(err => {
                            if (err.statusCode)
                                console.log(err.statusCode, err.statusMessage)
                            else
                                console.log(err.name, err.code)
                            process.exit()
                        })
                }
                catch (err) {
                    console.log(err.response)
                    reject(0)
                }
        })

        app.then(pid => {
            process.stdout.write(`app ${pid} started\r\n`)
            process.stdout.write(`\n\x1B[0;2mConnecting terminal WebSocket (${addr}:${port}) ... `)

            try {
                const wss = new ws(URL + `?pid=${pid}`, ssl)

                wss.onmessage = (ev) => {
                    process.stdout.write(ev.data.toString('ascii'))
                }

                wss.onopen = () => {
                    process.stdout.write('open\x1B[m\r\n')
                }

                wss.onclose = (ev) => {
                    process.stdout.write('\x1B[0;2mWebSocket close\x1B[m\r\n')
                    process.exit(0)
                }

                wss.onerror = (ev) => {
                    process.stdout.write(`\x1B[0;1;31merror \x1B[m${ev.message}\r\n`)
                    process.exit(1)
                }

                process.stdin.on('data', function(key: Buffer) {
                    wss.send(key)
                })
            }
            catch(err) {
                process.stdout.write(err)
            }
        }).catch(err => {
            process.stdout.write(err)
        })
    }
})
