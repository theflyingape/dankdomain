/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
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
console.log(`Ɗanƙ Ɗomaiƞ (${process.title}) started on ${process.platform} #${process.pid}`)

//  process signal traps
process.on('SIGHUP', () => {
    console.log(new Date() + ' :: received hangup')
})

process.on('SIGINT', () => {
    console.log(new Date() + ' :: received interrupt')
    process.exit()
})

process.on('SIGQUIT', () => {
    console.log(new Date() + ' :: received quit')
    process.exit()
})

process.on('SIGTERM', () => {
    console.log(new Date() + ' :: received terminate')
    process.exit()
})

process.on('uncaughtException', (err, origin) => {
    console.log(`${origin} ${err}`)
})

process.chdir(__dirname)
console.log(`cwd: ${__dirname}`)

let sessions = {}
let broadcasts = {}
let latest = { now: 0, msg: '' }

function broadcast(pid: number, msg: string) {
    const line = `\r\n\x1B[0;36m~ \x1B[1m${msg}\x1B[m`

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

function login(client: string, rows: number, cols: number, emulator: EMULATION): number {
    process.env.REMOTEHOST = client
    let term = pty.spawn('../logins.sh', [emulator], {
        name: 'xterm-256color',
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
    return pid
}

function message(term: pty.IPty, msg: Uint8Array, classic = true): Uint8Array {
    //let msg = data + ''
    let pid: number = term.pid

    //  inspect for app's ACK ...
    let ack = msg.indexOf(0x06)
    //  ... to appropriately replace it with any pending broadcast message(s)
    if (ack >= 0) {
        let wall = new TextEncoder().encode(broadcasts[term.pid] ? `${broadcasts[term.pid]}\n` : '')
        msg = new Uint8Array([...msg.slice(0, ack), ...wall, ...msg.slice(ack)])
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
    address: 'localhost',
    telnet: true, socket: 1986, limit: 2, emulator: 'VT', rows: 25,
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
            console.log('Classic Gate is closed -', c)
        })

        tty.on('connection', (socket) => {
            let client = socket.remoteAddress || 'scan'
            let pid = login(client, network.rows, 80, network.emulator)
            let term = sessions[pid]
            console.log(`Classic Gate knock from remote host ${client} - session ${pid}`)

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

            //  app --> telnet client
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

            //  telnet client --> app
            telnet.on('data', (buff) => {
                let data = buff.toString().replace(/\x00/g, '')
                try {
                    term.write(data)
                } catch (err) {
                    if (term.pid) {
                        console.log(`?FATAL ACTIVE CLASSIC session ${term.pid} socket -> pty error:`, err.message)
                        unlock(term.pid)
                        socket.destroy()
                    }
                }
            })
        })

        tty.on('error', (err) => {
            console.log('Classic Gate is blocked -', err.message)
            tty.close()
        })

        tty.listen(network.socket, addr)
        console.log(` - listening on telnet ${addr}:${network.socket}`)
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
        console.log(` - listening on ${WEBROOT}`)

        //  enable WebSocket endpoints
        const wsActive = new ws.Server({ noServer: true, path: `${network.path}player/`, clientTracking: true })
        const wsLurker = new ws.Server({ noServer: true, path: `${network.path}lurker/`, clientTracking: true })
        console.log(` + WebSocket endpoints enabled`)

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
        app.get(`${network.path}player/`, (req, res) => {
            let client = req.header('x-forwarded-for') || req.connection.remoteAddress
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

            const armor = require('../items/armor.json')
            for (let i in armor) {
                if (!armor[i].armoury) {
                    let profile = { handle: `<span style="color:${armor[i].dwarf ? 'black' : 'brown'};">${i}</span>`, level: armor[i].ac, pc: (armor[i].dwarf ? 'dwarven' : 'uncommon') + ' armor', effect: 'fadeInUpBig' }
                    profile['jpg'] = `specials/${i}`
                    list.push(profile)
                }
            }

            const weapon = require('../items/weapon.json')
            for (let i in weapon) {
                if (!weapon[i].shoppe) {
                    let profile = { handle: `<span style="color:${weapon[i].dwarf ? 'black' : 'brown'};">${i}</span>`, level: weapon[i].wc, pc: (weapon[i].dwarf ? 'dwarven' : 'uncommon') + ' weapon', effect: 'fadeInUpBig' }
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

            let rs = query(`SELECT id,handle,pc,gender,level FROM Players WHERE xplevel>1 AND NOT novice`)
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

            const ring = require('../items/ring.json')
            for (let i in ring) {
                let profile = { handle: `${ring[i].unique ? 'The <span style="color:black' : 'Special <span style="color:darkslategray'}">${i}</span><br>${ring[i].emoji} ring<br>`, pc: ring[i].description, effect: 'fadeInUpBig' }
                profile['jpg'] = `ring/${i}`
                list.push(profile)
            }

            res.send(JSON.stringify({ list: list, wall: latest.msg }))
            res.end()
        })

        app.post(`${network.path}player`, function (req, res) {
            let client = req.header('x-forwarded-for') || req.connection.remoteAddress
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
                    console.log(`Lurker session ${pid}${player} request from remote host: ${req.header('x-forwarded-for') || req.connection.remoteAddress} (${req.hostname})`)
                    res.send((lurkers.push(pid) - 1).toString())
                }
                else {
                    console.log(`?FATAL lurker session ${pid} request from remote host: ${req.header('x-forwarded-for') || req.connection.remoteAddress} (${req.hostname})`)
                }
            }
            else if (Object.keys(sessions).length) {
                var who = []
                for (let pid in sessions) {
                    let rs = query(`SELECT id FROM Online WHERE pid = ${pid}`)
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

            //  app --> browser client
            term.onData((data) => {
                let msg = message(term, data, false)
                try {
                    browser.send(new TextDecoder().decode(msg))
                } catch (ex) {
                    if (term.pid) {
                        console.log(`?FATAL ACTIVE app session ${term.pid} pty -> ws error:`, ex.message)
                        console.log(msg)
                        unlock(term.pid)
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

            //  browser client --> app
            browser.on('message', (msg) => {
                try {
                    term.write(msg)
                } catch (ex) {
                    if (term.pid) {
                        console.log(`?FATAL ACTIVE browser session ${term.pid} ws -> pty error:`, ex.message)
                        unlock(term.pid)
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
            console.log(`Lurker session ${term.pid}${player} connected as #${(lurker + 1)}`)

            //  app --> browser client
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

            //  browser client --> any key terminates lurking
            browser.on('message', (msg) => {
                browser.close()
            })

            browser.on('close', () => {
                console.log(`Lurker session ${term.pid}${player} closed #${(lurker + 1)}`)
                delete lurkers[lurker]
                lurk.dispose()
            })
        })
    }
})

//  game/sysop database interfaces
const DD = '../users/dankdomain.sql'
let better = require('better-sqlite3')
let sqlite3 = new better(DD)

chokidar.watch('../users/save.json')
    .on('add', (path, stats) => {
        class coins {
            constructor(money: string | number) {
                if (typeof money == 'number') {
                    this.value = money
                }
                else {
                    this.amount = money
                }
            }

            _value: number

            get value(): number {
                return this._value
            }

            set value(newValue: number) {
                const MAX = (1e+18 - 1e+09)
                this._value = newValue < 0 ? 0 : newValue < MAX ? newValue
                    : newValue == Infinity ? 1 : MAX
            }

            set amount(newAmount: string) {
                this.value = 0
                let coins = 0

                for (var i = 0; i < newAmount.length; i++) {
                    let c = newAmount.charAt(i)
                    switch (c) {
                        case 'c':
                            coins *= 1
                            break
                        case 's':
                            coins *= 1e+05
                            break
                        case 'g':
                            coins *= 1e+09
                            break
                        case 'p':
                            coins *= 1e+13
                            break
                    }
                    if (c >= '0' && c <= '9') {
                        coins *= 10
                        coins += +c
                    }
                    else {
                        this.value += coins
                        coins = 0
                    }
                }
            }
        }
        interface save extends user {
            bounty?: coins
            coin?: coins
            bank?: coins
            loan?: coins
        }
        let user: save = {
            id: '',
            bounty: new coins(0),
            coin: new coins(0),
            bank: new coins(0),
            loan: new coins(0)
        }

        try {
            Object.assign(user, JSON.parse(fs.readFileSync(path).toString()))
        }
        catch (err) {
            console.log(`Player (${user.id}) exception in ${path}:`)
            console.log(err.message)
        }
        user.bounty.value = isNaN(user.bounty._value) ? new coins(user.bounty._value).value : user.bounty._value
        user.coin.value = isNaN(user.coin._value) ? new coins(user.coin._value).value : user.coin._value
        user.bank.value = isNaN(user.bank._value) ? new coins(user.bank._value).value : user.bank._value
        user.loan.value = isNaN(user.loan._value) ? new coins(user.loan._value).value : user.loan._value
        fs.unlink(path, () => { })

        let sql = `UPDATE Players SET
        handle='${user.handle}', name='${user.name}', email='${user.email}', password='${user.password}',
        dob=${user.dob}, sex='${user.sex}', joined=${user.joined}, expires=${user.expires}, lastdate=${user.lastdate},
        lasttime=${user.lasttime}, calls=${user.calls}, today=${user.today}, expert=${+user.expert}, emulation='${user.emulation}',
        rows=${user.rows}, access='${user.access}', remote='${user.remote}', pc='${user.pc}', gender='${user.gender}',
        novice=${+user.novice}, level=${user.level}, xp=${user.xp}, xplevel=${user.xplevel}, status='${user.status}',
        blessed='${user.blessed}', cursed='${user.cursed}', coward=${+user.coward}, bounty=${user.bounty.value}, who='${user.who}',
        gang='${user.gang}', keyseq='${user.keyseq}', keyhints='${user.keyhints.toString()}', melee=${user.melee}, backstab=${user.backstab},
        poison=${user.poison}, magic=${user.magic}, steal=${user.steal}, hp=${user.hp}, sp=${user.sp},
        str=${user.str}, maxstr=${user.maxstr}, int=${user.int}, maxint=${user.maxint}, dex=${user.dex},
        maxdex=${user.maxdex}, cha=${user.cha}, maxcha=${user.maxcha}, coin=${user.coin.value}, bank=${user.bank.value},
        loan=${user.loan.value}, weapon='${user.weapon}', toWC=${user.toWC}, armor='${user.armor}', toAC=${user.toAC},
        spells='${user.spells.toString()}', poisons='${user.poisons.toString()}', realestate='${user.realestate}', rings=?, security='${user.security}',
        hull=${user.hull}, cannon=${user.cannon}, ram=${+user.ram}, wins=${user.wins}, immortal=${user.immortal},
        plays=${user.plays}, jl=${user.jl}, jw=${user.jw}, killed=${user.killed}, kills=${user.kills},
        retreats=${user.retreats}, steals=${user.steals}, tl=${user.tl}, tw=${user.tw}
        WHERE id='${user.id}'`
        console.log(`Player (${user.id}) updated:`, sqlite3.prepare(sql).run(user.rings.toString()).changes)
    })

try {
    sqlite3.prepare(`DELETE FROM Online`).run().changes
}
catch (err) {
    console.log(`warning ${err.code} :: ${String(err)}`)
}

function query(q: string, errOk = false): any {
    try {
        let cmd = sqlite3.prepare(q)
        return cmd.all()
    }
    catch (err) {
        if (!errOk) {
            console.log(`?Unexpected error ${err.code} :: ${String(err)}`)
        }
        return []
    }
}

function unlock(pid: number) {
    console.log(`Unlocking ${pid}`)
    sqlite3.prepare(`DELETE FROM Online WHERE pid=${pid}`).run().changes
}
