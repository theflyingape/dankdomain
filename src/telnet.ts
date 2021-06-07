/*****************************************************************************\
 *  Ɗaɳƙ Ɗoɱaiɳ: the return of Hack & Slash                                  *
 *  TELNET authored by: Robert Hurst <theflyingape@gmail.com>                *
 *                                                                           *
 *  ddterm (telnet)  <-->  websocket client interface                        *
 *  into ddgame (app)  <-->  ddclient (tty/main)                             *
\*****************************************************************************/

import dns = require('dns')
import fs = require('fs')
import ws = require('ws')
const got = require('got')

process.title = 'ddterm'
process.chdir(__dirname)

let host = process.argv.length > 2 ? process.argv[2] : 'play.ddgame.us'
let port = process.argv.length > 3 ? parseInt(process.argv[3]) : 443
let rows = process.argv.length > 4 ? parseInt(process.argv[4]) : 24
let URL, ssl

try {
    ssl = {
        key: fs.readFileSync(process.env.HOME + '/key.pem'), cert: fs.readFileSync(process.env.HOME + '/cert.pem'),
        requestCert: false, rejectUnauthorized: false
    }
    URL = `https://${host}:${port}/player/`
}
catch (err) {
    console.error(err.message, `\n
# you might consider generating a self-signed client key in HOME: ${process.env.HOME}
$ openssl req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out cert.pem \\
  -subj "/C=US/ST=Rhode Island/L=Providence/O=Dank Domain/OU=Game/CN=localhost"`)
    host = 'localhost'
    port = 1939
    URL = `http://${host}:${port}/player/`
}

if (process.stdin.isTTY) process.stdin.setRawMode(true)

dns.lookup(host, (err, addr, family) => {
    if (err)
        console.error(err)
    else {
        process.stdout.write(`\r\n\x1B[mRequesting ${URL}  →  startup ddclient ... `)
        const app = new Promise<number>((resolve, reject) => {
            if (resolve)
                try {
                    //  optional startup emulation: tty = XT|PC|VT
                    got(`${URL}?rows=${rows}&tty=VT`, { method: 'POST', headers: { 'x-forwarded-for': process.env.REMOTEHOST || process.env.HOSTNAME }, https: ssl })
                        .then(response => {
                            resolve(response.body)
                        })
                        .catch(err => {
                            if (err.statusCode)
                                console.error(err.statusCode, err.statusMessage)
                            else
                                console.error(err.name, err.code)
                            console.log(`Perhaps ddgame is not running, try: npm start`)
                            process.exit()
                        })
                }
                catch (err) {
                    console.error(err.response)
                    reject(0)
                }
        })

        app.then(pid => {
            process.stdout.write(`app ${pid} started\r\n`)
            process.stdout.write(`\x1B[0;2mConnecting terminal WebSocket (${addr}:${port}) ... `)

            try {
                const wss = new ws(`${URL}?pid=${pid}`, ssl)

                wss.onmessage = (ev) => {
                    let data = ev.data.toString('ascii')
                    let copy = data + ''
                    // find any occurrences of @func(data), and for each: call func(data)
                    const re = '[@](?:(action|animated|profile|play|title|tune|wall)[(](.+?)[)])'
                    let search = new RegExp(re, 'g'); let replace = new RegExp(re)
                    let match: RegExpMatchArray
                    while (match = search.exec(copy)) {
                        let x = replace.exec(data)
                        let s = x.index, e = s + x[0].length
                        data = data.substr(0, s) + data.substr(e)
                        eval(`${match[1]}(match[2])`)
                    }
                    process.stdout.write(data)

                    function action(menu) { }
                    function animated(effect) { }
                    function play(fileName) { }
                    function profile(panel) { }
                    function title(name) { }
                    function tune(fileName) { }
                    function wall(msg) {
                        try {
                            got(`${URL}${pid}/wall?msg=${msg}`, Object.assign({ method: 'POST', headers: { 'x-forwarded-for': process.env.REMOTEHOST || process.env.HOSTNAME } }, ssl))
                        }
                        catch (err) {
                            console.error(err.response)
                        }
                    }
                }

                wss.onopen = () => {
                    process.stdout.write('open\x1B[m\r\n')
                }

                wss.onclose = (ev) => {
                    process.stdout.write('\x1B[0;2mWebSocket close\x1B[m\r\n')
                    process.exit(0)
                }

                wss.onerror = (ev) => {
                    process.stderr.write(`\x1B[0;1;31merror \x1B[m${ev.message}\r\n`)
                    process.exit(1)
                }

                process.stdin.on('data', function (key: Buffer) {
                    wss.send(key)
                })
            }
            catch (err) {
                console.error(err)
            }
        }).catch(err => {
            console.error(err)
        })
    }
})
