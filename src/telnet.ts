/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                *
 *  TELNET authored by: Robert Hurst <theflyingape@gmail.com>                *
 *                                                                           *
 *  DDterm (telnet)  <-->  websocket client interface                        *
 *  into DDnet (app)  <-->  DDplay (main)                                    *
\*****************************************************************************/

import child = require('child_process')
import dns = require('dns')
import ws = require('ws')

process.title = 'DDterm'
process.chdir(__dirname)
import { fs, got, pathTo } from './sys'

let host = process.argv.length > 2 ? process.argv[2] : 'play.ddgame.us'
let port = process.argv.length > 3 ? parseInt(process.argv[3]) : 443
let rows = process.argv.length > 4 ? parseInt(process.argv[4]) : process.stdout.rows
let tty = process.argv.length > 5 ? process.argv[5] : process.env.TERM == 'linux' ? 'PI' : 'VT'
let URL, WS, ssl
let mixer1: child.ChildProcess
let mixer2: child.ChildProcess

try {
    ssl = {
        key: fs.readFileSync(process.env.HOME + '/key.pem'), cert: fs.readFileSync(process.env.HOME + '/cert.pem'),
        requestCert: false, rejectUnauthorized: false
    }
    URL = `https://${host}:${port}`
    WS = `wss://${host}:${port}`
}
catch (err) {
    console.info(err.message, `\n
# you might consider generating a self-signed client key in folder:
    export HOME="${process.env.HOME}"

$ openssl req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out cert.pem \\
  -subj "/C=US/ST=Rhode Island/L=Providence/O=Dank Domain/OU=Game/CN=localhost"`)
    host = 'localhost'
    port = 1939
    URL = `http://${host}:${port}`
    WS = `ws://${host}:${port}`
}

if (process.stdin.isTTY) process.stdin.setRawMode(true)

dns.lookup(host, (err, addr, family) => {
    if (err)
        console.error(err)
    else {
        process.stdout.write(`\r\n\x1B[m→ startup ${process.title} → ${URL} → `)
        const app = new Promise<number>((resolve, reject) => {
            if (resolve)
                try {
                    //  optional startup emulation: tty = XT|PC|VT
                    got(`${URL}/player?rows=${rows}&tty=${tty}`, { method: 'POST', headers: { 'x-forwarded-for': process.env.REMOTEHOST || process.env.HOSTNAME }, https: ssl })
                        .then(response => {
                            resolve(response.body)
                        })
                        .catch(err => {
                            if (err.statusCode)
                                console.error(err.statusCode, err.statusMessage)
                            else
                                console.error(err.name, err.code)
                            console.log(`Perhaps DDnet is not running, try: npm run net &`)
                            console.log(` or run DDplay as standalone, try: npm run play`)
                            process.exit()
                        })
                }
                catch (err) {
                    console.error(err.response)
                    reject(0)
                }
        })

        app.then(pid => {
            mixer2 = child.spawn('playmus', ['dankdomain.ogg'], { cwd: pathTo('portal/static/sounds'), stdio: 'ignore' })
            process.stdout.write(`DDplay (${pid}) started on DDnet\r\n`)
            process.stdout.write(`\x1B[0;2m→ terminal WebSocket (${addr}:${port}) ... `)

            try {
                const wss = new ws(`${WS}/player/?pid=${pid}`, ssl)

                wss.onmessage = (ev) => {
                    let data = ev.data.toString(tty == 'XT' ? 'utf8' : 'latin1')
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
                    function play(fileName) {
                        if (mixer1 && mixer1.exitCode == null) mixer1.kill()
                        mixer1 = child.spawn('playmus', [fileName + '.ogg'], { cwd: pathTo('portal/static/sounds'), stdio: 'ignore' })
                    }
                    function profile(panel) { }
                    function title(name) {
                        process.stdout.write(`\x1B]2;${name}\x07`)
                    }
                    function tune(fileName) {
                        if (mixer2 && mixer2.exitCode == null) mixer2.kill()
                        mixer2 = child.spawn('playmus', [fileName + '.ogg'], { cwd: pathTo('portal/static/sounds'), stdio: 'ignore' })
                    }
                    function wall(msg) {
                        try {
                            got(`${URL}/player/${pid}/wall?msg=${msg}`, Object.assign({ method: 'POST', headers: { 'x-forwarded-for': process.env.REMOTEHOST || process.env.HOSTNAME } }, ssl))
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
                    if (rows !== process.stdout.rows) {
                        rows = process.stdout.rows
                        got(`${URL}/player/${pid}/size?rows=${rows}&cols=${process.stdout.columns}`, { method: 'POST', headers: { 'x-forwarded-for': process.env.REMOTEHOST || process.env.HOSTNAME }, https: ssl })
                    }
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
