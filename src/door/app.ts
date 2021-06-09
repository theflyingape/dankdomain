/*****************************************************************************\
 *  Ɗaɳƙ Ɗoɱaiɳ: the return of Hack & Slash                                  *
 *  DOOR authored by: Robert Hurst <theflyingape@gmail.com>                  *
\*****************************************************************************/
import chokidar = require('chokidar')
import dns = require('dns')
import express = require('express')
import fs = require('fs')
import http = require('http')
import https = require('https')
import net = require('net')
import pty = require('node-pty')
import ws = require('ws')

process.title = 'ddgame'
console.log(`Ɗaɳƙ Ɗoɱaiɳ (${process.title}) started on ${process.platform} #${process.pid}`)

//  process signal traps
process.on('uncaughtException', (err, origin) => {
    console.error(`DOOR ${origin} ${err}`)
})

process.on('SIGINT', () => {
    console.log(` → signaled to interrupt: shutting down`)
    process.exit(0)
})

console.log(`cwd ${process.cwd()} → ${__dirname}`)
process.chdir(__dirname)

//  load common
import { pathTo } from '../sys'
import db = require('../db')
import { Coin } from '../items'

let passed = ''
if (process.argv.length > 2 && process.argv[2]) {
    passed = process.argv[2].toLowerCase()
    console.log(`parameter passed: '${passed}'`)
}

let sessions = {}
let broadcasts = {}
let latest = { now: 0, msg: '' }
let chalk = 0

//  allow for elemental player(s) to roam regardless of real user activity
let elemental: user = { id: '' }
setInterval(bot, 60 * 60 * 1000)

function bot() {
    let sysop: user = { id: '_SYS' }
    db.loadUser(sysop)
    const i = sysop.immortal

    while (!elemental.id) {
        sysop.immortal++
        try {
            Object.assign(elemental, JSON.parse(fs.readFileSync(pathTo('users', `bot${sysop.immortal}.json`)).toString()))
        }
        catch (err) {
            sysop.immortal = 0
            db.saveUser(sysop)
            return
        }
    }
    //  already logged in?
    if (sysop.immortal == i) return
    db.saveUser(sysop)

    const client = 'Riveredge'
    let pid = login(client, network.rows, 80, network.emulator, [elemental.id])
    let term = sessions[pid]
    term.spawn.dispose()
    console.log(`Startup BOT #${sysop.immortal} (${elemental.id}) from ${client} → session ${pid} '${term.startup || ''}'`)

    //  consume app output
    term.onData((data) => {
        message(term, data)
    })

    //  app shutdown
    term.onExit(() => {
        console.log(`Exit BOT #${sysop.immortal} (${elemental.id}) session ${pid}`)
        // Clean things up
        delete broadcasts[pid]
        delete sessions[pid]
        pid = 0
        elemental.id = ''
    })
}

function broadcast(pid: number, msg: string) {
    if (!sessions[pid].chalk) sessions[pid].chalk = [36, 33, 37, 32, 35, 31, 34][chalk++ % 7]
    const line = `\r\n\x1B[0;${sessions[pid].chalk}m~ \x1B[1m${msg}\x1B[m`

    //  buffer up to the latest 2-minutes of activity
    let now = new Date().getTime()
    if (Math.round((now - latest.now) / 1000 / 60) > 2) {
        latest.msg = ''
        latest.now = now
    }
    latest.msg += line

    //  buffer for all active player session(s)
    for (let o in sessions)
        if (+o !== pid)
            broadcasts[o] += line
}

function login(client: string, rows: number, cols: number, emulator: EMULATION, args = ['']): number {
    process.env.REMOTEHOST = client
    process.env.TERM = emulator == 'XT' ? 'xterm-256color' : emulator == 'PC' ? 'ansi' : emulator == 'VT' ? 'vt100' : 'linux'
    let term = pty.spawn('../logins.sh', args, {
        name: process.env.TERM,
        cols: cols,
        rows: rows,
        cwd: __dirname,
        env: process.env,
        encoding: null
    })

    let encoding: BufferEncoding = emulator == 'XT' ? 'utf8' : 'latin1'
    let pid: number = term.pid
    broadcasts[pid] = ''
    sessions[pid] = term
    sessions[pid].client = client
    sessions[pid].encoding = encoding
    //  buffer any initial output from forked process
    //  between this post and ensuing client wss connection
    sessions[pid].spawn = term.onData((data) => {
        sessions[pid].startup = (sessions[pid].startup || '') + data
    })

    console.log(`Create PLAYER session ${pid} using ${emulator}/${encoding} from remote host: ${client}`)

    if (!elemental.id) bot()
    return pid
}

function message(term: pty.IPty, msg: Uint8Array, classic = true): Uint8Array {
    //let msg = data + ''
    let pid: number = term.pid

    //  inspect for app's ACK ...
    let ack = msg.indexOf(0x06)
    //  ... to appropriately replace it with any pending broadcast message(s)
    if (ack >= 0) {
        let wall = new TextEncoder().encode(broadcasts[term.pid]
            ? `${broadcasts[term.pid]}\n`.split('~').join(classic ? '-' : '↣')
            : '')
        msg = new Uint8Array([...msg.slice(0, ack), ...wall, ...msg.slice(ack + 1)])
        broadcasts[term.pid] = ''
    }

    //  intercept client actions ...
    if (classic) {
        let copy = msg + ''
        // find any occurrences of @func(data), and for each: call func(data)
        const re = '[@](?:(action|animated|profile|play|title|tune|wall)[(](.+?)[)])'
        let search = new RegExp(re, 'g'); let replace = new RegExp(re)
        let match: RegExpMatchArray
        while (match = search.exec(copy)) {
            let x = replace.exec(msg.toString())
            let s = x.index, e = s + x[0].length
            msg = new Uint8Array([...msg.slice(0, s), ...msg.slice(e)])
            eval(`${match[1]}(match[2])`)
        }
        function action(menu) { }
        function animated(effect) { }
        function play(fileName) { }
        function profile(panel) { }
        function title(name) {
            let b4: BufferEncoding = sessions[pid].encoding || 'utf8'
            sessions[pid].encoding = <BufferEncoding>(name == 'XT' ? 'utf8' : 'latin1')
            if (sessions[pid].encoding !== b4)
                console.log(`CLASSIC session ${pid} encoding switched from ${b4} to ${sessions[pid].encoding}`)
        }
        function tune(fileName) { }
        function wall(notify) {
            broadcast(pid, notify)
        }
    }

    return msg
}

interface network {
    address: string
    telnet: boolean
    socket: number
    limit: number
    emulator: EMULATION
    rows: number
    web: boolean
    ws: number
    path: string
}
let network: network = {
    address: '0.0.0.0',
    telnet: true, socket: 1986, limit: 2, emulator: 'PC', rows: 25,
    web: true, ws: 1939, path: '/'
}
try {
    Object.assign(network, JSON.parse(fs.readFileSync('../etc/network.json').toString()))
}
catch (err) {
    console.log(err.message)
}

dns.lookup(network.address, (err, addr, family) => {

    //  start telnet service
    if (network.telnet) {
        const { TelnetSocket } = require('telnet-socket')
        const nka = require('net-keepalive')

        let tty = net.createServer()
        tty.maxConnections = network.limit

        tty.on('close', (c) => {
            console.log('Classic Gate is closed →', c)
        })

        tty.on('connection', (socket) => {
            let client = socket.remoteAddress || 'scan'
            let pid = login(client, network.rows, 80, network.emulator)
            let term = sessions[pid]
            console.log(`Classic Gate knock from remote host ${client} → session ${pid}`)

            socket.setKeepAlive(true, 4000)
            nka.setKeepAliveInterval(socket, 21000)
            nka.setKeepAliveProbes(socket, 2)

            socket.setTimeout(150000, () => {
                console.log(`Classic socket: timeout for session ${pid}`)
            })

            socket.on('close', (err) => {
                if (err) {
                    console.log(`Classic error: on close for session ${pid}`)
                    if (pid > 1) term.destroy()
                }
            })

            socket.on('error', (err) => {
                console.log(`Classic error: ${err.message} for session ${pid}`)
                if (pid > 1) term.destroy()
            })

            term.spawn.dispose()
            if (term.startup) try { socket.write(term.startup, <BufferEncoding>term.encoding) } catch { }

            //  app → telnet client
            //term.pipe(socket)
            term.onData((data) => {
                let msg = message(term, data)
                try {
                    socket.write(msg, <BufferEncoding>term.encoding)
                } catch (err) {
                    console.log(`${err.message} for session ${pid}`)
                }
            })

            //  app shutdown
            term.onExit(() => {
                console.log(`Exit CLASSIC session ${pid} for remote host: ${term.client}`)
                try {
                    delete broadcasts[term.pid]
                    delete sessions[term.pid]
                    pid = 0
                    socket.end()
                } catch { }
            })

            socket.on('timeout', () => {
                if (pid > 1) try {
                    term.destroy()   // process.kill(pid, 1)
                    console.log(`Timeout CLASSIC session ${pid} from remote host: ${term.client}`)
                } catch (err) {
                    console.log(`?FATAL term destroy event ${pid}: ${err.message}`)
                }
                socket.end()
            })

            let telnet = new TelnetSocket(socket)
            telnet.do.naws()
            telnet.do.sga()
            telnet.do.ttype()
            telnet.do.new_environ()
            telnet.dont.echo()  // client don't local echo
            telnet.will.echo()  // app will echo
            telnet.will.sga()

            telnet.on('SB', command => {
                switch (command.optionName) {
                    case 'NAWS':
                        let rows = command.optionData.height
                        let cols = command.optionData.width
                        console.log(`Resize CLASSIC session ${pid} (${rows}x${cols})`)
                        term.resize(cols, rows)
                        break
                }
            })

            //  telnet client → app
            telnet.on('data', (buff) => {
                let data = buff.toString().replace(/\x00/g, '')
                try {
                    term.write(data)
                } catch (err) {
                    if (term.pid) {
                        console.log(`?FATAL ACTIVE CLASSIC session ${term.pid} socket → pty error:`, err.message)
                        db.unlock(term.pid)
                        socket.destroy()
                    }
                }
            })
        })

        tty.on('error', (err) => {
            console.log('Classic Gate is blocked →', err.message)
            tty.close()
        })

        tty.listen(network.socket, addr)
        console.log(`→ listening on telnet ${addr}:${network.socket}`)
    }

    //  start web service
    if (network.web) {
        const { URL } = require('url')
        const app = express()
        app.set('trust proxy', ['loopback', addr])
        let server, ssl

        try {
            ssl = { key: fs.readFileSync('key.pem'), cert: fs.readFileSync('cert.pem') }
            server = https.createServer(ssl, app)
        }
        catch (e) {
            console.log(e.message)
            server = http.createServer(app)
        }
        let port = network.ws

        //  enable REST services
        server.listen(port, addr)
        const WEBROOT = `http${ssl ? 's' : ''}://${addr}:${port}${network.path}`
        console.log(`→ listening on ${WEBROOT}`)

        //  enable WebSocket endpoints
        const wsActive = new ws.Server({ noServer: true, path: `${network.path}player/`, clientTracking: true })
        const wsLurker = new ws.Server({ noServer: true, path: `${network.path}lurker/`, clientTracking: true })
        console.log(`↔ WebSocket endpoints enabled`)

        if (passed == 'test' && process.kill(process.pid, 'SIGINT'))
            console.log(`self-interrupted ${passed}`)

        server.on('upgrade', (req, socket, head) => {
            const pathname = new URL(req.url, WEBROOT).pathname
            if (pathname == `${network.path}player/`) {
                wsActive.handleUpgrade(req, socket, head, (ws) => {
                    wsActive.emit('connection', ws, req)
                })
            }
            else if (pathname == `${network.path}lurker/`) {
                wsLurker.handleUpgrade(req, socket, head, (ws) => {
                    wsLurker.emit('connection', ws, req)
                })
            } else {
                console.log(`?FATAL WebSocket request: ${pathname}`)
                socket.destroy()
            }
        })

        //  web services
        app.use(network.path, express.static(__dirname + '/static'))

        //  REST services
        //  Player API
        app.post(`${network.path}gallery/`, (req, res) => {
            let client = req.header('x-forwarded-for') || req.socket.remoteAddress
            console.log(`City Gates knocked from remote host: ${client} (${req.hostname})`)

            let list = []
            list.push(
                { handle: `The Player manual: <a href="https://manual.DDgame.us" target="_blank">manual.DDgame.us</a>`, png: 'connect/arexielite_by_peachyco', effect: 'fadeInRight' },
                { handle: '100 dungeon levels, 10 dank domains', png: 'connect/dragonborn_dagger_sorcerer_by_peachyco', effect: 'fadeInRight' },
                { handle: 'Take on the Monster Mash', png: 'connect/dragonborn_hexblade_by_peachyco', effect: 'fadeInRight' },
                { handle: 'Come get some', png: 'connect/elf_cleric_by_peachyco', effect: 'fadeInRight' },
                { handle: 'Crying will not help you', png: 'connect/elf_fighter_by_peachyco', effect: 'fadeInRight' },
                { handle: 'Naval battles', png: 'connect/guild_findsman_by_peachyco', effect: 'fadeInRight' },
                { handle: 'Rob and pick pockets', png: 'connect/human_battlemage_by_peachyco', effect: 'fadeInRight' },
                { handle: 'Magic can be fun', png: 'connect/human_enchantress_mage_by_peachyco', effect: 'fadeInRight' },
                { handle: 'I hit like a girl. Heh.', png: 'connect/human_warpriest_by_peachyco', effect: 'fadeInRight' },
                { handle: 'Discover all 20 magic rings', png: 'connect/human_wizard_by_peachyco', effect: 'fadeInRight' },
                { handle: 'Come join our gang!', png: 'connect/kashaw_and_zahra_by_peachyco', effect: 'fadeInRight' },
                { handle: 'Weapon and Armor specials', png: 'connect/krauser_dragonborn_warlord_by_peachyco', effect: 'fadeInRight' },
                { handle: 'Special magicks', png: 'connect/lucien2_human_wizard_by_peachyco', effect: 'fadeInRight' },
                { handle: 'Magic potions and poisons', png: 'connect/lucien_human_wizard_by_peachyco', effect: 'fadeInRight' },
                { handle: `Let's brawl in the tavern`, png: 'connect/orc_pirate_by_peachyco', effect: 'fadeInRight' },
                { handle: 'Advance to a Paladin', png: 'connect/paladin_by_peachyco', effect: 'fadeInRight' },
                { handle: 'Taunt others as a Titan', png: 'connect/thrask_goliath_fighter_by_peachyco', effect: 'fadeInRight' },
                { handle: 'Transcend to a God', png: 'connect/warforged_fighter_and_human_wizard_by_peachyco', effect: 'fadeInRight' },
                { handle: 'Shall we begin?', png: 'connect/yuriel_genasi_warlord_by_peachyco', effect: 'fadeInRight' }
            )

            const Armor = require('../items/armor.json')
            for (let i in Armor) {
                if (!Armor[i].armoury) {
                    let profile = { handle: `<span style="color:${Armor[i].dwarf ? 'black' : 'brown'};">${i}</span>`, level: Armor[i].ac, pc: (Armor[i].dwarf ? 'dwarven' : 'uncommon') + ' armor', effect: 'fadeInUpBig' }
                    profile['jpg'] = `specials/${i}`
                    list.push(profile)
                }
            }

            const Weapon = require('../items/weapon.json')
            for (let i in Weapon) {
                if (!Weapon[i].shoppe) {
                    let profile = { handle: `<span style="color:${Weapon[i].dwarf ? 'black' : 'brown'};">${i}</span>`, level: Weapon[i].wc, pc: (Weapon[i].dwarf ? 'dwarven' : 'uncommon') + ' weapon', effect: 'fadeInUpBig' }
                    profile['jpg'] = `specials/${i}`
                    list.push(profile)
                }
            }

            const monsters = require('../etc/dungeon.json')
            let level = 0
            for (let n in monsters) {
                let pc = monsters[n].pc
                let profile = { handle: `The <span style="color:brown;">${n}</span>:`, level: ++level, pc: pc, effect: monsters[n].effect || 'fadeIn' }
                profile['jpg'] = `dungeon/${n}`
                if (!pc) profile['pc'] = `(same class)`
                list.push(profile)
            }

            let rs = db.query(`SELECT id,handle,pc,gender,level FROM Players WHERE xplevel>1 AND NOT novice`)
            for (let n in rs) {
                let id = rs[n].id, handle = rs[n].handle, pc = rs[n].pc, gender = rs[n].gender, level = rs[n].level
                let profile = { handle: handle, level: level, pc: pc, effect: 'fadeInLeft' }
                if (id[0] == '_') {
                    profile['jpg'] = `npc/${{ _BAR: 'barkeep', _DM: 'dwarf', _NEP: 'neptune', _OLD: 'seahag', _TAX: 'taxman', '_WOW': 'witch' }[id]}`
                    list.push(profile)
                }
                else {
                    let userPNG = `user/${id}`
                    try {
                        fs.accessSync(`./static/images/${userPNG}.png`, fs.constants.F_OK)
                    } catch (e) {
                        userPNG = 'player/' + pc.toLowerCase() + (gender == 'F' ? '_f' : '')
                    }
                    profile['png'] = userPNG
                    try {
                        fs.accessSync(`./static/images/${userPNG}.png`, fs.constants.F_OK)
                        list.push(profile)
                    } catch (e) { }
                }
            }

            const Ring = require('../items/ring.json')
            for (let i in Ring) {
                let profile = { handle: `${Ring[i].unique ? 'The <span style="color:black' : '<span style="color:darkslategray'}">${i}</span> ${Ring[i].emoji} ring<br>`, pc: Ring[i].description, effect: 'fadeInUpBig' }
                profile['jpg'] = `ring/${i}`
                list.push(profile)
            }

            res.send(JSON.stringify({ list: list, wall: latest.msg }))
            res.end()
        })

        app.post(`${network.path}player`, function (req, res) {
            let client = req.header('x-forwarded-for') || req.socket.remoteAddress
            let cols = parseInt(req.query.cols ? req.query.cols.toString() : '80')
            let rows = parseInt(req.query.rows ? req.query.rows.toString() : '25')
            let tty = req.query.tty ? req.query.tty.toString() : 'XT'
            let pid = login(client, rows, cols, <EMULATION>tty)
            res.send(pid.toString())
            res.end()
        })

        app.post(`${network.path}player/:pid/size`, function (req, res) {
            let pid = parseInt(req.params.pid),
                cols = parseInt(req.query.cols.toString()),
                rows = parseInt(req.query.rows.toString()),
                term = sessions[pid]

            if (!term) return
            console.log(`Resize PLAYER session ${pid} (${rows}x${cols})`)
            term.resize(cols, rows)
            res.end()
        })

        app.post(`${network.path}player/:pid/wall`, function (req, res) {
            let pid = parseInt(req.params.pid)
            let msg = req.query.msg + ''
            let term = sessions[pid]
            if (!term) return
            broadcast(pid, msg)

            res.end()
        })

        //  Lurker API
        var lurkers = []

        app.post(`${network.path}lurker`, function (req, res) {
            var pid = parseInt(req.query.pid ? req.query.pid.toString() : '')

            if (pid) {
                var player = ''
                if (sessions[pid]) {
                    if (sessions[pid].who)
                        player = ` (${sessions[pid].who})`
                    console.log(`Create LURKER session ${pid}${player} request from remote host: ${req.header('x-forwarded-for') || req.socket.remoteAddress} → ${req.hostname}`)
                    res.send((lurkers.push(pid) - 1).toString())
                }
                else {
                    console.log(`?FATAL LURKER session ${pid} request from remote host: ${req.header('x-forwarded-for') || req.socket.remoteAddress} → ${req.hostname}`)
                }
            }
            else if (Object.keys(sessions).length) {
                var who = []
                for (let pid in sessions) {
                    let rs = db.query(`SELECT id FROM Online WHERE pid=${pid}`)
                    if (rs.length) {
                        sessions[pid].who = rs[0].id
                        who.push({ id: rs[0].id, pid: pid })
                    }
                }
                res.send(JSON.stringify(who))
            }
            else {
                res.send(JSON.stringify([]))
            }
            res.end()
        })

        //  WebSocket endpoints: utilize upgraded socket connection to serve I/O between app pty and browser client
        //  ... for the active player
        wsActive.on('connection', (browser, req) => {
            const what = new URL(req.url, WEBROOT)
            let pid = parseInt(what.searchParams.get('pid'))
            let term = sessions[pid]
            term.spawn.dispose()
            if (term.startup) browser.send(term.startup)

            //  app → browser client
            term.onData((data) => {
                let msg = message(term, data, false)
                try {
                    browser.send(new TextDecoder().decode(msg))
                } catch (ex) {
                    if (term.pid) {
                        console.log(`?FATAL ACTIVE app session ${term.pid} pty → ws error:`, ex.message)
                        console.log(msg)
                        db.unlock(term.pid)
                        browser.close()
                    }
                }
            })

            //  app shutdown
            term.onExit(() => {
                console.log(`Exit PLAYER session ${term.pid} for remote host: ${term.client}`)
                // Clean things up
                delete broadcasts[term.pid]
                delete sessions[term.pid]
                pid = 0
                browser.close()
            })

            //  browser client → app
            browser.on('message', (msg) => {
                try {
                    term.write(msg)
                } catch (ex) {
                    if (term.pid) {
                        console.log(`?FATAL ACTIVE browser session ${term.pid} ws → pty error:`, ex.message)
                        db.unlock(term.pid)
                        browser.close()
                    }
                }
            })

            browser.on('close', () => {
                //  did user close browser with an open app?
                if (pid > 1) try {
                    term.destroy()   // process.kill(pid, 1)
                    console.log(`Forced close PLAYER session ${term.pid} from remote host: ${term.client}`)
                } catch (ex) {
                    console.log(`?FATAL browser close event ${term.pid}: ${ex}`)
                }
            })
        })

        //  ... for the casual lurker
        wsLurker.on('connection', (browser, req) => {
            const what = new URL(req.url, WEBROOT)
            let lurker = parseInt(what.searchParams.get('lurker'))
            let term = sessions[lurkers[lurker]]
            let player = ` (${sessions[term.pid].who})`
            console.log(`Create LURKER #${(lurker + 1)} session → ${term.pid}${player}`)

            //  app → browser client
            let lurk = term.onData((data) => {
                try {
                    browser.send(new TextDecoder().decode(data))
                } catch (ex) {
                    if (term.pid)
                        console.log(`?FATAL session ${term.pid}${player} lurker/ws error: ${ex.message}`)
                }
            })
            term.onExit(() => {
                try {
                    browser.close()
                } catch (ex) {
                    console.log(`?FATAL browser session ${term.pid}${player} lurker/ws error: ${ex.message}`)
                }
            })

            //  browser client → any key terminates lurking
            browser.on('message', (msg) => {
                browser.close()
            })

            browser.on('close', () => {
                console.log(`Exit LURKER #${(lurker + 1)} session → ${term.pid}${player}`)
                delete lurkers[lurker]
                lurk.dispose()
            })
        })
    }
})

chokidar.watch(pathTo('users', 'save.json'))
    .on('add', (path, stats) => {
        let save: any = {}
        let user: user
        try {
            Object.assign(save, JSON.parse(fs.readFileSync(path).toString()))
            fs.unlink(path, () => { })
            save.bounty = new Coin(save.bounty)
            save.coin = new Coin(save.coin)
            save.bank = new Coin(save.bank)
            save.loan = new Coin(save.loan)
            Object.assign(user, save)
            db.saveUser(user)
            console.log(`Player (${user.id}) updated`)
        }
        catch (err) {
            console.error(`Player file has an exception in ${path}:`)
            console.error(err.message)
        }
    })

try {
    db.run(`DELETE FROM Online`)
}
catch (err) {
    console.error(`warning ${err.code} :: ${String(err)}`)
}
