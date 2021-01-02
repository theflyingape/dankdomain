/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  LOGON authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import xvt = require('@theflyingape/xvt')
import fs = require('fs')
import db = require('../db')
import $ = require('../runtime')
import { Coin, action, activate, bracket, cat, clear, emulator, getRing, getRuler, input, loadUser, logoff, music, playerPC, portrait, profile, reroll, sound, title, wall } from '../io'
import { Access, Deed, Magic, Ring } from '../items'
import { cuss, news } from '../lib'
import { PC } from '../pc'
import { date2full, dice, got, int, money, now, time, titlecase } from '../sys'

module Logon {

    init()

    export function user() {
        xvt.app.form = {
            'who': { cb: who, prompt: xvt.attr('Who dares to enter my dank domain ', bracket('or NEW', false), '? '), max: 22, timeout: 40 },
            'password': { cb: password, echo: false, max: 26, timeout: 20 },
        }

        cat('logon')
        let retry = 3
        xvt.app.focus = 'who'

        function guards(): boolean {
            xvt.beep()
            xvt.outln(xvt.reset, 'Invalid response.\n', -400)
            xvt.drain()

            switch (--retry) {
                case 2:
                    xvt.outln('The guards eye you suspiciously.')
                    break
                case 1:
                    xvt.outln('The guards aim their crossbows at you.')
                    break
                default:
                    sound('stranger')
                    profile({ handle: '💀 🏹 💘 🏹 💀', jpg: 'npc/stranger', effect: 'zoomIn' })
                    xvt.outln('The last thing you ever feel is several quarrels cutting deep into your chest.', -800)
                    xvt.app.form = {
                        'forgot': {
                            cb: () => {
                                if (/Y/i.test(xvt.entry)) {
                                    if ($.player.lastdate != now().date) $.player.today = 0
                                    $.player.lastdate = now().date
                                    $.player.lasttime = now().time
                                    db.run(`UPDATE Players SET lastdate=${$.player.lastdate},lasttime=${$.player.lasttime},today=${$.player.today} WHERE id='${$.player.id}'`)
                                    $.reason = 'forgot password'
                                    require('../email').resend()
                                    return
                                }
                                else {
                                    xvt.outln()
                                    process.exit()
                                }
                            }, prompt: 'DOH!!  Re-send the password to your email account (Y/N)? ', cancel: 'N', enter: 'Y', eol: false, match: /Y|N/i, timeout: 10
                        }
                    }
                    if ($.player.id && $.player.lastdate != now().date) {
                        action('yn')
                        xvt.app.focus = 'forgot'
                    }
                    else
                        process.exit()
                    return false
            }

            return true
        }

        function who() {
            xvt.outln()

            if (! /^[A-Z][A-Z23\s]*$/i.test(xvt.entry)) {
                if (guards())
                    xvt.app.refocus()
                return
            }

            if (/new/i.test(xvt.entry)) {
                reroll($.player)
                PC.newkeys($.player)
                $.player.emulation = <EMULATION>xvt.app.emulation
                $.player.rows = process.stdout.rows || 24
                if ($.tty == 'web') {
                    sound('yahoo', 20)
                    require('./newuser')
                }
                else {
                    emulator(() => {
                        $.player.emulation = <EMULATION>xvt.app.emulation
                        require('./newuser')
                    })
                }
                return
            }

            $.player.id = titlecase(xvt.entry)

            if (!loadUser($.player)) {
                $.player.id = ''
                $.player.handle = xvt.entry
                if (!loadUser($.player)) {
                    if (guards())
                        xvt.app.refocus()
                    return
                }
            }

            $.access = Access.name[$.player.access]
            xvt.app.emulation = $.player.emulation
            $.player.rows = process.stdout.rows || 24

            xvt.app.form['password'].prompt = $.player.handle + ', enter your password: '
            xvt.app.focus = 'password'
        }

        function password() {
            xvt.outln()
            if ($.player.password !== xvt.entry) {
                if (guards())
                    xvt.app.refocus()
                return
            }

            if ($.player.email == '' && $.access.verify) {
                require('../email')
                return
            }

            startup()
        }
    }

    //  user or bot startup entry point
    export function startup(bot = '') {
        $.whereis = [
            'Braavos', 'Casterly Rock', 'Dorne', 'Dragonstone', 'Dreadfort',
            'The Eyrie', 'Harrenhal', 'Highgarden', 'Iron Island', `King's Landing`,
            'Meereen', 'Norvos', 'Oldtown', 'Pentos', 'Qohor',
            'Riverrun', 'The Twins', 'The Wall', 'Winterfell', 'Volantis'
        ][dice(20) - 1]

        if (bot) {
            $.player.id = bot
            if (!loadUser($.player)) {
                xvt.outln(`bot id: ${bot} not found`)
                $.access.roleplay = false
                xvt.carrier = false
                xvt.hangup()
            }
            $.access = Access.name[$.player.access]
            xvt.app.emulation = $.player.emulation
            $.player.rows = process.stdout.rows || 24
        }

        title($.player.emulation)
        news(`${$.player.handle} ${$.access.emoji} arrived in ${$.whereis} at ${time(now().time)} as a level ${$.player.level} ${$.player.pc}:`)

        let rs = db.query(`SELECT * FROM Online`)
        for (let row = 0; row < rs.length; row++) {
            let t = now().time
            if ((t = (1440 * (now().date - rs[0].lockdate)
                + 60 * ((t / 100 - rs[0].locktime / 100) >> 0)
                + t % 100 - rs[0].locktime % 100)) > 60) {
                db.unlock(rs[row].id)
                news(`\tremoved an expired lock: ${rs[row].id} from ${time(rs[row].locktime)}`)
            }
            else if (rs[row].id == $.player.id) {
                news(`\tkicked simultaneous player off: ${rs[row].id} lock from ${time(rs[row].locktime)}`)
                try {
                    process.kill(rs[row].pid, 'SIGHUP')
                    xvt.outln(xvt.lcyan, `\nYou're in violation of the space-time continuum: T - ${60 - t} minutes`)
                }
                catch {
                    db.unlock(rs[row].id)
                }
                $.access.roleplay = false
                xvt.carrier = false
                xvt.hangup()
            }
        }

        if ($.access.promote > 0 && $.player.level >= $.access.promote) {
            let title = Object.keys(Access.name).indexOf($.player.access)
            do {
                $.player.access = Object.keys(Access.name)[++title]
                $.access = Access.name[$.player.access]
            } while (!$.access[$.player.sex])
        }
        else {
            //  old school BBS tactic (usually 5 minutes) for Millennials to experience
            let t = now().time
            t = 1440 * (now().date - $.player.lastdate) + 60 * int(t / 100) + (t % 100) - (60 * int($.player.lasttime / 100) + ($.player.lasttime % 100))
            if (!$.access.sysop && $.player.novice && $.player.calls < 5 && t < 2) {
                $.access.roleplay = false
                news('', true)
                xvt.beep()
                xvt.outln('\nYou were last on just ', t == 1 ? 'a minute' : t.toString() + ' minutes', ' ago.')
                xvt.outln('Please wait at least 2 minutes between visits (for now).')
                xvt.hangup()
            }
        }

        //  did midnight or noon cross since last visit?
        if ($.player.lastdate != now().date || ($.player.lasttime < 1200 && now().time >= 1200))
            $.player.today = 0

        if ($.player.today > $.access.calls) {
            xvt.beep()
            xvt.outln(`\nYou played all ${$.access.calls} calls for today.  Please visit again after ${now().time < 1200 ? 'noon' : 'midnight'}!`)
            sound('comeagain')
            news('', true)
            xvt.hangup()
        }

        xvt.ondrop = logoff

        if (/^([1][0]|[1][2][7]|[1][7][2]|[1][9][2])[.]/.test($.remote) || !$.remote) {
            if ($.player.emulation == 'XT')
                $.whereis += ' 🖥 '
        }
        else try {
            const apikey = `./etc/ipstack.key`
            fs.accessSync(apikey, fs.constants.F_OK)
            let key = fs.readFileSync(apikey).toString()
            got(`http://api.ipstack.com/${$.remote}?access_key=${key}`).then(response => {
                $.whereis = ''
                let result = ''
                if (response.body) {
                    let ipstack = JSON.parse(response.body)
                    if (ipstack.ip) result = ipstack.ip
                    if (ipstack.city) result = ipstack.city
                    if (ipstack.region_code) result += (result ? ', ' : '') + ipstack.region_code
                    if (response.body.country_code) result += (result ? ' ' : '') + ipstack.country_code
                    if (ipstack.location)
                        if (ipstack.location.country_flag_emoji) result += ` ${ipstack.location.country_flag_emoji} `
                }
                $.whereis += result ? result : $.remote
            }).catch(error => { $.whereis += ' ⚠️ ' })
        } catch (e) { }

        loadUser($.sysop)
        if (!getRuler()) {
            $.player.access = Object.keys(Access.name).slice($.player.sex == 'F' ? -2 : -1)[0]
            $.player.novice = false
            $.sysop.email = $.player.email
        }
        if (now().date >= $.sysop.dob) {
            $.sysop.lasttime = now().time
            $.sysop.calls++
            $.sysop.today++
            if ($.player.today <= $.access.calls && $.access.roleplay)
                $.sysop.plays++
        }
        PC.saveUser($.sysop)

        $.access = Access.name[$.player.access]
        $.player.rows = process.stdout.rows
        clear()

        xvt.outln(xvt.red, '--=:))', xvt.app.LGradient
            , xvt.Red, xvt.white, xvt.bright, $.sysop.name, xvt.reset
            , xvt.red, xvt.app.RGradient, '((:=--\n')
        xvt.out(xvt.cyan, 'Visitor: ', xvt.white, xvt.bright, $.sysop.calls.toString()
            , xvt.reset, '  -  ')
        if (now().date >= $.sysop.dob) {
            xvt.out(xvt.faint, $.sysop.plays.toString(), ' plays since ')
            if ($.sysop.who)
                xvt.out($.sysop.who, ' won')
            else
                xvt.out('this game started')
        }
        else
            xvt.out(xvt.bright, 'new game starts', xvt.cyan)
        xvt.outln(' ', date2full($.sysop.dob))
        xvt.outln(xvt.cyan, 'Last on: ', xvt.white, xvt.bright, date2full($.player.lastdate), ' ', time($.player.lasttime))
        xvt.outln(xvt.cyan, ' Online: ', xvt.white, xvt.bright, $.player.handle
            , xvt.normal, '  -  ', $.whereis)
        xvt.out(xvt.cyan, ' Access: ', xvt.white, xvt.bright, $.player.access)
        if ($.player.emulation == 'XT' && $.access.emoji)
            xvt.out(' ', $.access.emoji)
        xvt.out(xvt.normal, '  ')

        $.player.today++
        $.player.lastdate = now().date
        $.player.lasttime = now().time
        $.player.expires = $.player.lastdate + $.sysop.expires
        activate($.online, true)
        PC.saveUser($.player)

        $.mydeeds = Deed.load($.player.pc)
        welcome()
    }

    function welcome() {
        action('yn')

        if ($.player.today <= $.access.calls && ($.player.status == 'jail' || !Access.name[$.player.access].roleplay)) {
            profile({ png: 'npc/jailer', effect: 'fadeIn' })
            sound('ddd')
            if ($.player.emulation == 'XT') xvt.out('🔒 ')
            xvt.outln(xvt.bright, xvt.black, '(', xvt.magenta, 'PRISONER', xvt.black, ')')
            xvt.outln(xvt.red, '\nYou are locked-up in jail.', -1200)
            if ($.access.roleplay && dice(2 * $.online.cha) > (10 - 2 * $.player.steal)) {
                let bail = new Coin(Math.round(money($.player.level) * (101 - $.online.cha) / 100))
                xvt.outln('\nIt will cost you ', bail.carry(), ' to get bailed-out and to continue play.')
                xvt.app.form = {
                    'bail': {
                        cb: () => {
                            xvt.outln('\n')
                            if (/Y/i.test(xvt.entry)) {
                                sound('click')
                                $.player.coin.value -= bail.value
                                if ($.player.coin.value < 0) {
                                    $.player.bank.value += $.player.coin.value
                                    $.player.coin.value = 0
                                    if ($.player.bank.value < 0) {
                                        $.player.loan.value -= $.player.bank.value
                                        $.player.bank.value = 0
                                    }
                                }
                                PC.adjust('cha', -(4 - $.player.steal), -int((4 - $.player.steal) / 2, true))
                                $.player.status = ''
                            }
                            else {
                                xvt.outln(xvt.bright, xvt.red, 'You are left brooding with your fellow cellmates.', -1200)
                                $.access = Access.name['Prisoner']
                            }
                            welcome()
                        }, prompt: 'Will you pay (Y/N)? ', cancel: 'N', enter: 'Y', eol: false, match: /Y|N/i, timeout: 50
                    }
                }
                input('bail')
                return
            }
            else
                sound('boo')
        }

        if ($.player.today <= $.access.calls && $.access.roleplay && $.sysop.dob <= now().date) {
            portrait(<active>{ user: { id: '', pc: $.player.pc, gender: $.player.gender, handle: $.player.handle, level: $.player.level } }, 'fadeIn', ' - Ɗanƙ Ɗomaiƞ')
            sound('welcome')

            xvt.outln(xvt.black, xvt.bright, '(', xvt.normal, xvt.white, 'Welcome back, '
                , $.access[$.player.gender] || 'you', xvt.black, xvt.bright, ')')
            xvt.outln(xvt.cyan, 'Visit #: ', xvt.white, xvt.bright, $.player.calls.toString(), xvt.reset
                , '  -  ', xvt.bright, xvt.blink
                , $.access.calls - $.player.today ? xvt.cyan : xvt.red
                , `${$.access.calls - $.player.today}`, xvt.reset, ' calls remaining')
            xvt.sessionAllowed = $.access.minutes * 60

            wall(`logged on as a level ${$.player.level} ${$.player.pc}`)

            xvt.outln(xvt.cyan, '\nLast callers were: ')
            try {
                $.callers = JSON.parse(fs.readFileSync('./users/callers.json').toString())
                for (let last in $.callers)
                    xvt.outln('     ', xvt.bright
                        , $.callers[last].who, xvt.normal, ' (', $.callers[last].reason, ')')
            }
            catch (err) {
                xvt.outln(xvt.red, xvt.bright, 'not available')
                xvt.outln(xvt.faint, `(${err})`)
            }

            if ($.player.today < 2) {
                if ($.player.blessed) {
                    if (!Ring.have($.player.rings, Ring.theOne) && !$.access.sysop) {
                        $.player.blessed = ''
                        xvt.out(xvt.yellow, xvt.bright, '\nYour shining aura ', xvt.normal, 'fades ', xvt.faint, 'away.')
                        activate($.online)
                    }
                }
                if ($.player.cursed) {
                    if (!$.player.coward || Ring.have($.player.rings, Ring.theOne) || $.access.sysop) {
                        $.player.cursed = ''
                        xvt.out(xvt.black, xvt.bright, '\nThe dark cloud has been lifted.')
                        activate($.online)
                    }
                }
                $.player.coward = false
            }

            if ($.player.level < 50 && 2 * $.player.jw < $.player.jl) {
                xvt.out(xvt.reset, '\n', xvt.magenta, 'Helpful: ', xvt.bright, `Your poor jousting stats have been reset.`)
                $.player.jl = 0
                $.player.jw = 0
                sound('shimmer', 22)
            }
            if ($.access.sysop) {
                let ring = Ring.power([], null, 'joust')
                if (($.online.altered = Ring.wear($.player.rings, ring.name))) {
                    getRing('win', ring.name)
                    Ring.save(ring.name, $.player.id, $.player.rings)
                    sound('promote', 22)
                }
            }
            xvt.outln()

            $.player.calls++
            $.player.plays++
            $.player.status = ''
            $.player.xplevel = $.player.level
            const play = JSON.parse(fs.readFileSync('./etc/play.json').toString())
            Object.assign($, play)
            music('logon')

            if ($.player.pc == Object.keys(PC.name['player'])[0]) {
                if ($.player.novice) {
                    xvt.outln()
                    xvt.out(xvt.bright)
                    cat('intro')
                }
                xvt.app.form = {
                    'pause': { cb: playerPC, pause: true, timeout: 200 }
                }
                input('pause')
                return
            }
        }
        else {
            xvt.outln(xvt.bright, xvt.black, '(', xvt.yellow, 'VISITING', xvt.black, ')')
            xvt.sessionAllowed = 5 * 60
            $.access.roleplay = false
            PC.saveUser($.player)
            db.unlock($.player.id)
            news('', true)

            wall(`logged on as a level ${$.player.level} ${$.player.pc}`)

            xvt.out(xvt.cyan, '\nLast callers were: ', xvt.white)
            try {
                $.callers = JSON.parse(fs.readFileSync('./users/callers.json').toString())
                for (let last in $.callers) {
                    xvt.outln(xvt.bright, $.callers[last].who, xvt.normal, ' (', $.callers[last].reason, ')')
                    xvt.out('                   ')
                }
            }
            catch (err) {
                xvt.outln(`not available (${err})`)
            }
        }

        xvt.app.form = {
            'pause': {
                cb: () => {
                    if (cat(`user/${$.player.id}`)) {
                        fs.unlink(`./files/user/${$.player.id}.txt`, () => { })
                        input('pause')
                        return
                    }
                    clear()
                    xvt.outln(xvt.blue, '--=:))', xvt.app.LGradient
                        , xvt.Blue, xvt.cyan, xvt.bright, 'Announcement', xvt.reset
                        , xvt.blue, xvt.app.RGradient, '((:=--\n')
                    cat('announcement')
                    if ($.access.sysop)
                        xvt.app.focus = 'announce'
                    else {
                        xvt.outln('\n', xvt.cyan, '--=:))', xvt.app.LGradient
                            , xvt.Cyan, xvt.white, xvt.bright, 'Auto Message', xvt.reset
                            , xvt.cyan, xvt.app.RGradient, '((:=--\n')
                        cat('auto-message')
                        input('auto', dice(1000) == 1 ? 'y' : 'n', 3000)
                    }
                }, pause: true
            },

            'announce': {
                cb: () => {
                    xvt.outln()
                    if (/Y/i.test(xvt.entry)) {
                        action('freetext')
                        xvt.app.focus = 'sysop'
                        return
                    }
                    xvt.outln('\n', xvt.cyan, '--=:))', xvt.app.LGradient
                        , xvt.Cyan, xvt.white, xvt.bright, 'Auto Message', xvt.reset
                        , xvt.cyan, xvt.app.RGradient, '((:=--\n')
                    cat('auto-message')
                    input('auto')
                }, prompt: 'Change (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i
            },

            'sysop': {
                cb: () => {
                    if (xvt.entry) fs.writeFileSync('./files/announcement.txt', xvt.attr(
                        xvt.magenta, 'Date: ', xvt.off, date2full($.player.lastdate), ' ', time($.player.lasttime) + '\n',
                        xvt.magenta, 'From: ', xvt.off, $.player.handle, '\n\n',
                        xvt.bright, xvt.entry))
                    xvt.outln('\n', xvt.cyan, '--=:))', xvt.app.LGradient
                        , xvt.Cyan, xvt.white, xvt.bright, 'Auto Message', xvt.reset
                        , xvt.cyan, xvt.app.RGradient, '((:=--\n')
                    cat('auto-message')
                    action('ny')
                    xvt.app.focus = 'auto'
                }, prompt: 'Enter your new announcement', lines: 12
            },

            'auto': {
                cb: () => {
                    xvt.outln()
                    if (/Y/i.test(xvt.entry)) {
                        action('freetext')
                        input('user', `Where's my dough, Bert!\n`)
                        return
                    }
                    require('./taxman').cityguards()
                }, prompt: 'Update (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i
            },

            'user': {
                cb: () => {
                    xvt.outln()
                    if (xvt.entry.length && !cuss(xvt.entry)) {
                        fs.writeFileSync('./files/auto-message.txt', xvt.attr(
                            xvt.cyan, 'Date: ', xvt.off, date2full($.player.lastdate), ' ', time($.player.lasttime), '\n',
                            xvt.cyan, 'From: ', xvt.off, $.player.handle + '\n\n',
                            xvt.bright, xvt.entry))
                        news(`\tupdated the auto message to read:\n${xvt.entry}`)
                    }
                    require('./taxman').cityguards()
                }, prompt: 'Enter your public message', lines: 6
            }
        }
        action('ny')
        input('pause')
    }

    function init() {
        //  mode of operation
        switch (xvt.app.emulation) {
            case 'PC':
                $.tty = 'rlogin'
                break
            case 'XT':
                $.tty = 'web'
                title(process.title)
                break
            default:
                xvt.app.emulation = 'VT'
                xvt.out('\f')
        }

        //  customize the Dank Domain waiting for its ruler (1st player to register)
        let npc = <user>{}
        let player = <user>{}
        Object.assign(npc, JSON.parse(fs.readFileSync(`./users/sysop.json`).toString()))
        let rs = db.query(`SELECT id FROM Players WHERE id='${npc.id}'`)
        if (!rs.length) {
            process.stdout.write(`[${npc.handle}] `)
            Object.assign(player, npc)
            PC.newkeys(player)
            reroll(player, player.pc, player.level)
            player.level = npc.level
            player.xplevel = 0
            PC.saveUser(player, true)
            npc = <user>{}
            player = <user>{}
        }

        //  customize the Master of Whisperers NPC
        Object.assign(npc, JSON.parse(fs.readFileSync(`./users/barkeep.json`).toString()))
        rs = db.query(`SELECT id FROM Players WHERE id='${npc.id}'`)
        if (!rs.length) {
            process.stdout.write(`[${npc.handle}] `)
            Object.assign(player, npc)
            PC.newkeys(player)
            reroll(player, player.pc, player.level)
            Object.assign(player, npc)
            PC.saveUser(player, true)
            npc = <user>{}
            player = <user>{}
        }

        //  customize the Master at Arms NPC
        Object.assign(npc, JSON.parse(fs.readFileSync(`./users/merchant.json`).toString()))
        rs = db.query(`SELECT id FROM Players WHERE id='${npc.id}'`)
        if (!rs.length) {
            process.stdout.write(`[${npc.handle}] `)
            Object.assign(player, npc)
            PC.newkeys(player)
            reroll(player, player.pc, player.level)
            Object.assign(player, npc)
            PC.saveUser(player, true)
            npc = <user>{}
            player = <user>{}
        }

        //  customize the Big Kahuna NPC
        Object.assign(npc, JSON.parse(fs.readFileSync(`./users/neptune.json`).toString()))
        rs = db.query(`SELECT id FROM Players WHERE id='${npc.id}'`)
        if (!rs.length) {
            process.stdout.write(`[${npc.handle}] `)
            Object.assign(player, npc)
            PC.newkeys(player)
            reroll(player, player.pc, player.level)
            Object.assign(player, npc)
            PC.saveUser(player, true)
            npc = <user>{}
            player = <user>{}
        }

        //  customize the Queen B NPC
        Object.assign(npc, JSON.parse(fs.readFileSync(`./users/seahag.json`).toString()))
        rs = db.query(`SELECT id FROM Players WHERE id='${npc.id}'`)
        if (!rs.length) {
            process.stdout.write(`[${npc.handle}] `)
            Object.assign(player, npc)
            PC.newkeys(player)
            reroll(player, player.pc, player.level)
            Object.assign(player, npc)
            PC.saveUser(player, true)
            npc = <user>{}
            player = <user>{}
        }

        //  customize the Master of Coin NPC
        npc = <user>{}
        Object.assign(npc, JSON.parse(fs.readFileSync(`./users/taxman.json`).toString()))
        rs = db.query(`SELECT id FROM Players WHERE id='${npc.id}'`)
        if (!rs.length) {
            process.stdout.write(`[${npc.handle}] `)
            Object.assign(player, npc)
            PC.newkeys(player)
            reroll(player, player.pc, player.level)
            Object.assign(player, npc)
            PC.saveUser(player, true)
            npc = <user>{}
            player = <user>{}
        }

        //  customize the wicked witch
        Object.assign(npc, JSON.parse(fs.readFileSync(`./users/witch.json`).toString()))
        rs = db.query(`SELECT id FROM Players WHERE id='${npc.id}'`)
        if (!rs.length) {
            process.stdout.write(`[${npc.handle}] `)
            Object.assign(player, npc)
            PC.newkeys(player)
            reroll(player, player.pc, player.level)
            Object.assign(player, npc)
            PC.saveUser(player, true)
            npc = <user>{}
            player = <user>{}
        }

        //  instantiate bot(s)
        let i = 0
        while (++i) {
            npc = <user>{}
            player = <user>{}
            try {
                Object.assign(npc, JSON.parse(fs.readFileSync(`./users/bot${i}.json`).toString()))
                rs = db.query(`SELECT id FROM Players WHERE id='${npc.id}'`)
                if (!rs.length) {
                    process.stdout.write(`\r\nbot #${i} - ${npc.handle}`)
                    Object.assign(player, npc)
                    PC.newkeys(player)
                    reroll(player, player.pc, player.level)
                    Object.assign(player, npc)
                    PC.saveUser(player, true)
                }
            }
            catch (err) {
                break
            }
        }
        //  fini
        process.stdout.write('\r')

        loadUser($.sysop)
        if ($.sysop.lastdate != now().date) {
            newDay()
            db.run(`UPDATE Players SET today=0 WHERE id NOT GLOB '_*'`)
        }
    }

    function newDay() {
        xvt.out('One moment: [')

        db.run(`UPDATE Players SET bank=bank+coin WHERE id NOT GLOB '_*'`)
        xvt.out('+')
        db.run(`UPDATE Players SET coin=0`)
        xvt.out('-')

        let rs = db.query(`SELECT id FROM Players WHERE id NOT GLOB '_*' AND status='' AND (magic=1 OR magic=2) AND bank>9999999 AND level>15`)
        let user: user = { id: '' }
        for (let row in rs) {
            let altered = false
            user.id = rs[row].id
            loadUser(user)
            for (let item = 7; item < 15; item++) {
                let cost = user.magic == 1 ? new Coin(Magic.spells[Magic.merchant[item]].wand)
                    : new Coin(Magic.spells[Magic.merchant[item]].cost)
                if (user.bank.value >= cost.value && !Magic.have(user.spells, item)) {
                    Magic.add(user.spells, item)
                    user.bank.value -= cost.value
                    altered = true
                }
            }
            if (altered) PC.saveUser(user)
        }
        xvt.out('=')

        rs = db.query(`SELECT id, access, lastdate, level, xplevel, novice, jl, jw, gang FROM Players WHERE id NOT GLOB '_*'`)
        for (let row in rs) {
            if ((rs[row].level == 1 || rs[row].novice) && (rs[row].jl > (2 * rs[row].jw)))
                db.run(`UPDATE Players SET jl=0,jw=0 WHERE id='${rs[row].id}'`)
            if (Access.name[rs[row].access].bot)
                continue
            //  manually rolled back system date _after_ some player visited?
            if (!(now().date - rs[row].lastdate))
                continue

            if ((now().date - rs[row].lastdate) > 10) {
                if (Access.name[rs[row].access].roleplay) {
                    if (+rs[row].xplevel > 1) {
                        db.run(`UPDATE Players SET xplevel=1,remote='' WHERE id='${rs[row].id}'`)
                        let p: user = { id: rs[row].id }
                        loadUser(p)
                        require('./email').rejoin(p)
                        xvt.out('_', -1000)
                        continue
                    }
                }
                else {
                    db.run(`DELETE FROM Players WHERE id='${rs[row].id}'`)
                    fs.unlink(`./files/user/${rs[row].id}.txt`, () => { })
                    xvt.out('x')
                    continue
                }
            }

            if ((now().date - rs[row].lastdate) > 180) {
                if (rs[row].gang) {
                    let g = PC.loadGang(db.query(`SELECT * FROM Gangs WHERE name='${rs[row].gang}'`)[0])
                    let i = g.members.indexOf(rs[row].id)
                    if (i > 0) {
                        g.members.splice(i, 1)
                        PC.saveGang(g)
                    }
                    else {
                        db.run(`UPDATE Players SET gang='' WHERE gang='${g.name}'`)
                        db.run(`DELETE FROM Gangs WHERE name='${g.name}'`)
                        xvt.out('&')
                    }
                }
                db.run(`DELETE FROM Players WHERE id='${rs[row].id}'`)
                fs.unlink(`./files/user/${rs[row].id}.txt`, () => { })
                fs.unlink(`./users/.${rs[row].id}.json`, () => { })
                xvt.out('x')
                continue
            }

            if ((now().date - rs[row].lastdate) % 50 == 0) {
                db.run(`UPDATE Players SET pc='${Object.keys(PC.name['player'])[0]}',level=1,xplevel=0,remote='' WHERE id='${rs[row].id}'`)
                let p: user = { id: rs[row].id }
                loadUser(p)
                require('./email').rejoin(p)
                xvt.sleep(1000)
            }
        }

        try {
            fs.renameSync(`./files/tavern/today.txt`, `./users/tavern/yesterday.txt`)
            xvt.out('T')
        } catch (e) {
            xvt.out('?')
        }
        xvt.out(']')

        $.sysop.lastdate = now().date
        $.sysop.lasttime = now().time
        PC.saveUser($.sysop)
        xvt.out(xvt.bright, xvt.yellow, '*')
        xvt.beep()
        xvt.outln('All set -- thank you!')
    }
}

export = Logon
