/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  INIT authored by: Robert Hurst <theflyingape@gmail.com>                  *
\*****************************************************************************/

import $ = require('./runtime')
import db = require('../db')
import { Access, Coin, Magic, Ring } from '../items'
import { bracket, carry, cat, emulator, news, time, vt } from '../lib'
import { Deed, PC } from '../pc'
import { } from '../npc'
import { input, logoff, pickPC } from '../player'
import { an, cuss, date2full, dice, flag, fs, geoip, int, now, pathTo, titlecase } from '../sys'

module Init {

    if ($.game.lastdate != now().date) {
        newDay()
        db.run(`UPDATE Players SET today=0 WHERE id NOT GLOB '_*'`)
    }
    $.player = db.fillUser()
    $.player.emulation = vt.emulation
    $.access = Access.name[$.player.access]
    cat('logon', vt.tty == 'door' ? 100 : 5, vt.emulation == 'PI' ? 'PC' : vt.emulation)

    export function user(prompt: string) {
        let retry = 3

        vt.form = {
            0: { cb: who, prompt: `${prompt} ${bracket('or NEW', false)}? `, max: 22, timeout: 40 },
            'password': { cb: password, echo: false, max: 26, timeout: 20 },
        }

        function guards(): boolean {
            vt.beep(true)
            vt.outln('Invalid response.')
            vt.outln(-400)
            vt.drain()

            switch (--retry) {
                case 2:
                    vt.outln(vt.faint, 'The guards eye you suspiciously.')
                    break
                case 1:
                    vt.outln(vt.faint, 'The guards aim their crossbows at you.')
                    break
                default:
                    vt.profile({ handle: '💀 🏹 💘 🏹 💀', jpg: 'npc/stranger', effect: 'zoomIn' })
                    vt.outln(vt.faint, 'The last thing you ever feel is several quarrels cutting deep into your chest.')
                    vt.sound('stranger', 6)
                    vt.form = {
                        'forgot': {
                            cb: () => {
                                if (/Y/i.test(vt.entry)) {
                                    if ($.player.lastdate != now().date) $.player.today = 0
                                    $.player.lastdate = now().date
                                    $.player.lasttime = now().time
                                    db.run(`UPDATE Players SET lastdate=${$.player.lastdate},lasttime=${$.player.lasttime},today=${$.player.today} WHERE id='${$.player.id}'`)
                                    $.reason = 'forgot password'
                                    require('../email').resend()
                                    return
                                }
                                else {
                                    vt.outln()
                                    process.exit()
                                }
                            }, prompt: 'DOH!!  Re-send the password to your email account (Y/N)? ', cancel: 'N', enter: 'Y', eol: false, match: /Y|N/i, timeout: 10
                        }
                    }
                    if (!Access.name[$.player.access].bot && $.player.id && $.player.lastdate != now().date) {
                        vt.action('yn')
                        vt.focus = 'forgot'
                    }
                    else
                        process.exit()
                    return false
            }

            return true
        }

        function who() {
            vt.outln()

            vt.entry = titlecase(vt.entry)
            if (vt.entry[0] == '_') {
                if (guards())
                    vt.refocus()
                return
            }

            if (/new/i.test(vt.entry)) {
                $.player = PC.reroll($.player)
                vt.sound('yahoo', 20)
                if (vt.emulation == 'XT') {
                    require('./newuser')
                }
                else
                    emulator(() => { require('./newuser') })
                return
            }

            $.player.id = titlecase(vt.entry)
            if (!PC.load($.player)) {
                $.player.id = ''
                $.player.handle = vt.entry
                if (!PC.load($.player) || $.player.id[0] == '_') {
                    $.player.id = ''
                    if (guards()) vt.refocus()
                    return
                }
            }

            $.access = Access.name[$.player.access]
            if ($.access.bot) {
                $.player.emulation = vt.emulation
                if (guards()) vt.refocus()
                return
            }
            if (!$.access.roleplay)
                vt.outln(vt.faint, '\n... two guards come from behind to escort you to the Great Hall ... ', -1000)

            $.player.rows = process.stdout.rows || $.player.rows || 24
            vt.emulation = $.player.emulation
            vt.form['password'].prompt = `${$.player.handle}, enter your password: `
            vt.focus = 'password'
        }

        function password() {
            vt.outln()
            if ($.player.password !== vt.entry) {
                if (guards())
                    vt.refocus()
                return
            }

            if ($.player.email == '' && $.access.verify) {
                require('../email')
                return
            }

            startup()
        }
    }

    //  authenticated (password, bot, or BBS user) login startup entry point
    export function startup(userID = '') {
        $.whereis = [
            'Braavos', 'Casterly Rock', 'Dorne', 'Dragonstone', 'Dreadfort',
            'The Eyrie', 'Harrenhal', 'Highgarden', 'Iron Island', `King's Landing`,
            'Meereen', 'Norvos', 'Oldtown', 'Pentos', 'Qohor',
            'Riverrun', 'The Twins', 'The Wall', 'Winterfell', 'Volantis'
        ][dice(20) - 1]

        //  auto-login?
        if (userID) {
            $.player.id = userID
            if (!PC.load($.player)) {
                $.player = db.fillUser('newuser', $.player)
                PC.reroll($.player)
                $.player.id = ''
            }
            if (!$.player.id) {
                if (vt.tty == 'door' && $.door.length) {
                    $.player.rows = int($.door[20]) || 24
                    emulator(() => {
                        $.player.id = userID
                        $.player.name = $.door[9]
                        $.player.remote = $.door[10]
                        require('./newuser')
                        vt.ondrop = logoff
                    })
                    return
                }
                else {
                    vt.outln(`userID (${userID}) passed not found -- goodbye!`)
                    vt.hangup()
                }
            }
            //  authenticated
            $.access = Access.name[$.player.access]
        }

        news(`${$.player.handle} ${$.access.emoji} arrived from ${$.whereis} at ${time(now().time)} as a level ${$.player.level} ${$.player.pc}:`)

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
                    vt.outln(vt.lcyan, `\nYou're in violation of the space-time continuum: T - ${60 - t} minutes`)
                }
                catch {
                    db.unlock(rs[row].id)
                }
                $.access.roleplay = false
                vt.carrier = false
                vt.hangup()
            }
        }

        if ($.access.promote > 0 && $.player.level >= $.access.promote) {
            let title = Object.keys(Access.name).indexOf($.player.access)
            do {
                $.player.access = Object.keys(Access.name)[++title]
                $.access = Access.name[$.player.access]
            } while (!$.access[$.player.sex])

            vt.music('promote', 10)
            vt.outln()
            if (getRuler()) {
                vt.outln(vt.yellow
                    , Access.name[$.ruler.access][$.ruler.sex], ' the ', $.ruler.access.toLowerCase()
                    , ', ', vt.bright, $.ruler.handle, vt.normal
                    , ', is pleased to see you return\n'
                    , `and ${PC.who($.ruler).he}welcomes you as`, vt.bright, an($.player.access), vt.normal, '!')
                if ($.access.message)
                    vt.outln(vt.yellow, `${PC.who($.ruler).He}exclaims, `, vt.bright, `"${eval('`' + $.access.message + '`')}"`)
            }
            else {
                $.player.access = Object.keys(Access.name).slice($.player.sex == 'F' ? -2 : -1)[0]
                $.player.novice = false
                vt.outln(vt.yellow, 'You are crowned as the ', vt.bright, $.player.access, vt.normal, ' to rule over this domain.')
            }
            vt.outln(-5000)
        }
        /*  old school BBS tactic (usually 5 minutes) for Millennials to experience
        else {
            let t = now().time
            t = 1440 * (now().date - $.player.lastdate) + 60 * int(t / 100) + (t % 100) - (60 * int($.player.lasttime / 100) + ($.player.lasttime % 100))
            if (!$.access.sysop && $.player.novice && $.player.calls < 5 && t < 2) {
                $.access.roleplay = false
                news('', true)
                vt.beep(true)
                vt.outln('\nYou were last on just ', t == 1 ? 'a minute' : t.toString() + ' minutes', ' ago.')
                vt.outln('Please wait at least 2 minutes between visits (for now).')
                vt.hangup()
            }
        }
        */
        //  did midnight or noon cross since last visit?
        if ($.player.lastdate != now().date || ($.player.lasttime < 1200 && now().time >= 1200))
            $.player.today = 0

        if ($.player.today > $.access.calls) {
            vt.beep(true)
            vt.outln(`\nYou played all ${$.access.calls} calls for the ${now().time < 1200 ? 'morning' : now().time < 1600 ? 'afternoon' : now().time < 2000 ? 'evening' : 'night'}.  Please visit again after 12 ${now().time < 1200 ? 'noon' : 'midnight'}!`)
            vt.sound('comeagain')
            news('', true)
            vt.hangup()
        }

        //  start new player visit
        vt.ondrop = logoff

        if (/^([1][0]|[1][2][7]|[1][7][2]|[1][9][2])[.]/.test($.remote) || !$.remote) {
            if ($.player.emulation == 'XT')
                $.whereis += ' 🖥 '
        }
        else
            geoip.lookup($.remote).then(geo => {
                if (geo === null)
                    $.whereis = $.remote
                else {
                    if (geo.city) $.whereis = geo.city
                    if (geo.region) $.whereis += ($.whereis ? ', ' : '') + geo.region
                    if (geo.country) $.whereis += ($.whereis ? ', ' : '') + geo.country + ' ' + flag.get(geo.country).emoji
                }
            }).catch(error => { $.whereis += ` ⚠️ ${error.message}` })

        if (now().date >= $.game.started) {
            $.game.lasttime = now().time
            $.game.calls++
            $.game.today++
            if ($.player.today <= $.access.calls && $.access.roleplay)
                $.game.plays++
        }
        $.savegame(true)
        getRuler()

        $.access = Access.name[$.player.access]
        $.player.rows = process.stdout.rows
        vt.cls()

        vt.outln(vt.red, '--=:))', vt.LGradient
            , vt.Red, vt.white, vt.bright, $.sysop.name, vt.reset
            , vt.red, vt.RGradient, '((:=--\n')
        vt.out(vt.cyan, 'Visitor: ', vt.white, vt.bright, $.game.calls.toString()
            , vt.reset, '  -  ')
        if (now().date >= $.game.started) {
            vt.out(vt.faint, $.game.plays.toString(), ' plays since ')
            if ($.game.winner)
                vt.out($.game.winner, ' won')
            else
                vt.out('this game started')
        }
        else
            vt.out(vt.bright, 'new game starts', vt.cyan)
        vt.outln(' ', date2full($.game.started))
        vt.outln(vt.cyan, 'Last on: ', vt.white, vt.bright, date2full($.player.lastdate), ' ', time($.player.lasttime))
        vt.outln(vt.cyan, ' Online: ', vt.white, vt.bright, $.player.handle
            , vt.normal, '  -  ', $.whereis)
        vt.out(vt.cyan, ' Access: ', vt.white, vt.bright, $.player.access)
        if ($.player.emulation == 'XT' && $.access.emoji)
            vt.out(' ', $.access.emoji)
        vt.out(vt.normal, '  ')

        $.player.today++
        $.player.lastdate = now().date
        $.player.lasttime = now().time
        $.player.expires = $.player.lastdate + $.sysop.expire
        PC.activate($.online, true)
        PC.save()

        $.mydeeds = Deed.load($.player.pc)
        welcome()
    }

    function welcome() {
        vt.action('yn')

        if ($.player.today <= $.access.calls && ($.player.status == 'jail' || !Access.name[$.player.access].roleplay)) {
            vt.profile({ png: 'npc/jailer', effect: 'fadeIn' })
            vt.sound('ddd')
            if ($.player.emulation == 'XT') vt.out('🔒 ')
            vt.outln(vt.bright, vt.black, '(', vt.magenta, 'PRISONER', vt.black, ')')
            vt.outln(vt.red, '\nYou are locked-up in jail.', -1200)
            if ($.access.roleplay && dice(2 * $.online.cha) > (10 - 2 * $.player.steal)) {
                let bail = new Coin(PC.money($.player.level) * BigInt(101 - $.online.cha) / 100n).pick(1)
                vt.outln('\nIt will cost you ', carry(bail), ' to get bailed-out and to continue play.')
                vt.form = {
                    'bail': {
                        cb: () => {
                            vt.outln('\n')
                            if (/Y/i.test(vt.entry)) {
                                PC.payment(bail.value)
                                PC.adjust('cha', -(4 - $.player.steal), -int((4 - $.player.steal) / 2))
                                $.player.status = ''
                            }
                            else {
                                vt.outln(vt.bright, vt.red, 'You are left brooding with your fellow cellmates.', -1200)
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
                vt.sound('boo')
        }

        if ($.player.today <= $.access.calls && $.access.roleplay && $.game.started <= now().date) {
            PC.portrait(<active>{ user: { id: '', pc: $.player.pc, gender: $.player.gender, handle: $.player.handle, level: $.player.level } }, 'fadeIn', ' - Ɗaɳƙ Ɗoɱaiɳ')
            vt.sound('welcome')

            vt.outln(vt.black, vt.bright, '(', vt.normal, vt.white, 'Welcome back, '
                , $.access[$.player.gender] || 'you', vt.black, vt.bright, ')')
            vt.outln(vt.cyan, 'Visit #: ', vt.white, vt.bright, $.player.calls.toString(), vt.reset
                , '  -  ', vt.bright, vt.blink
                , $.access.calls - $.player.today ? vt.cyan : vt.red
                , `${$.access.calls - $.player.today}`, vt.reset, ' calls remaining')
            vt.sessionAllowed = $.access.minutes * 60

            lastCallers()

            if ($.player.today < 2) {
                if ($.player.blessed) {
                    if (!Ring.have($.player.rings, Ring.theOne) && !$.access.bot && !$.access.sysop) {
                        $.player.blessed = ''
                        vt.out(vt.yellow, vt.bright, '\nYour shining aura ', vt.normal, 'fades ', vt.faint, 'away.')
                    }
                }
                if ($.player.cursed) {
                    if (!$.player.coward || Ring.have($.player.rings, Ring.theOne) || $.access.bot || $.access.sysop) {
                        $.player.cursed = ''
                        vt.out(vt.black, vt.bright, '\nThe dark cloud has been lifted.')
                    }
                }
                $.player.coward = false
            }

            if ($.player.level < 50 && 2 * $.player.jw < $.player.jl) {
                vt.out(vt.reset, '\n', vt.magenta, 'Helpful: ', vt.bright, `Your poor jousting stats have been reset.`)
                $.player.jl = 0
                $.player.jw = 0
                vt.sound('shimmer', 22)
            }
            vt.outln()

            $.player.calls++
            $.player.plays++
            $.player.status = ''
            $.player.xplevel = $.player.level
            PC.activate($.online)
            PC.save()
            vt.music('logon')

            if ($.player.pc == Object.keys(PC.name['player'])[0]) {
                if ($.player.novice) {
                    vt.outln()
                    cat('intro', 1500)
                }
                vt.form = {
                    'pause': { cb: pickPC, pause: true, timeout: 200 }
                }
                input('pause')
                return
            }
        }
        else {
            vt.outln(vt.black, vt.bright, '(', vt.yellow, 'VISITING', vt.black, ')')
            vt.sessionAllowed = 5 * 60
            $.access.roleplay = false
            PC.save()
            db.unlock($.player.id)
            news('', true)

            lastCallers()
            vt.wall($.player.handle, `is visiting`)
        }

        vt.form = {
            'pause': {
                cb: () => {
                    if (cat(`user/${$.player.id}`)) {
                        fs.unlink(pathTo('files/user', `${$.player.id}.txt`), () => { })
                        input('pause')
                        return
                    }
                    vt.cls()
                    vt.outln(vt.blue, '--=:))', vt.LGradient
                        , vt.Blue, vt.cyan, vt.bright, 'Announcement', vt.reset
                        , vt.blue, vt.RGradient, '((:=--')
                    cat('announcement')

                    vt.outln()
                    if ($.access.sysop)
                        vt.focus = 'announce'
                    else {
                        vt.outln(vt.cyan, '--=:))', vt.LGradient
                            , vt.Cyan, vt.white, vt.bright, 'Auto Message', vt.reset
                            , vt.cyan, vt.RGradient, '((:=--')
                        cat('user/auto-message')
                        vt.outln()
                        input('auto', dice(1000) == 1 ? 'y' : 'n', 3000)
                    }
                }, pause: true
            },

            'announce': {
                cb: () => {
                    vt.outln()
                    if (/Y/i.test(vt.entry)) {
                        vt.action('freetext')
                        vt.focus = 'sysop'
                        return
                    }
                    vt.outln(vt.cyan, '--=:))', vt.LGradient
                        , vt.Cyan, vt.white, vt.bright, 'Auto Message', vt.reset
                        , vt.cyan, vt.RGradient, '((:=--')
                    cat('user/auto-message')

                    vt.outln()
                    input('auto')
                }, prompt: 'Change (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i
            },

            'sysop': {
                cb: () => {
                    if (vt.entry) fs.writeFileSync(pathTo('files', 'announcement.txt'), vt.attr(
                        vt.magenta, 'Date: ', vt.off, date2full($.player.lastdate), ' ', time($.player.lasttime) + '\n',
                        vt.magenta, 'From: ', vt.off, $.player.handle, '\n\n',
                        vt.bright, vt.entry))
                    vt.outln(vt.cyan, '--=:))', vt.LGradient
                        , vt.Cyan, vt.white, vt.bright, 'Auto Message', vt.reset
                        , vt.cyan, vt.RGradient, '((:=--')
                    cat('user/auto-message')

                    vt.outln()
                    vt.action('ny')
                    vt.focus = 'auto'
                }, prompt: 'Enter your new announcement', lines: 12
            },

            'auto': {
                cb: () => {
                    vt.outln()
                    if (/Y/i.test(vt.entry)) {
                        vt.action('freetext')
                        input('user', `Where's my dough, Bert?!\n`)
                        return
                    }
                    require('./taxman').cityguards()
                }, prompt: 'Update (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i
            },

            'user': {
                cb: () => {
                    vt.outln()
                    if (vt.entry.length && !cuss(vt.entry)) {
                        fs.writeFileSync(pathTo('files/user', 'auto-message.txt'), vt.attr(
                            vt.cyan, 'Date: ', vt.off, date2full($.player.lastdate), ' ', time($.player.lasttime), '\n',
                            vt.cyan, 'From: ', vt.off, $.player.handle + '\n\n',
                            vt.bright, vt.entry))
                        news(`\tupdated the auto message to read:\n${vt.entry}`)
                    }
                    require('./taxman').cityguards()
                }, prompt: 'Enter your public message', lines: 6
            }
        }
        vt.action('ny')
        input('pause')
    }

    function lastCallers() {
        vt.out(vt.cyan, '\nLast callers were: ', vt.white)
        try {
            $.callers = JSON.parse(fs.readFileSync(pathTo('users', 'callers.json')).toString())
            for (let last in $.callers) {
                vt.outln(vt.bright, $.callers[last].who, vt.normal, ' (', $.callers[last].reason, ')')
                vt.out(-100, '                   ')
            }
        }
        catch (err) {
            vt.outln(`not available (${err})`)
        }
    }

    function getRuler(): boolean {
        $.ruler = db.fillUser()
        //  King
        let ruler = Object.keys(Access.name).slice(-1)[0]
        let rs = db.query(`SELECT id FROM Players WHERE access='${ruler}'`)
        if (rs.length) {
            $.ruler.id = rs[0].id
            return PC.load($.ruler)
        }
        //  Queen
        ruler = Object.keys(Access.name).slice(-2)[0]
        rs = db.query(`SELECT id FROM Players WHERE access='${ruler}'`)
        if (rs.length) {
            $.ruler.id = rs[0].id
            return PC.load($.ruler)
        }
        return false
    }

    function newDay() {
        vt.out('One moment: [')

        db.run(`UPDATE Players SET bank=bank+coin WHERE id NOT GLOB '_*'`)
        vt.out('+')
        db.run(`UPDATE Players SET coin=0`)
        vt.out('-')

        let rs = db.query(`SELECT id FROM Players WHERE id NOT GLOB '_*' AND status='' AND (magic=1 OR magic=2) AND bank>9999999 AND level>20`)
        let user = db.fillUser()
        for (let row in rs) {
            let altered = false
            user.id = rs[row].id
            PC.load(user)
            for (let item = 7; item < 16; item++) {
                let cost = user.magic == 1 ? new Coin(Magic.spells[Magic.merchant[item]].wand)
                    : new Coin(Magic.spells[Magic.merchant[item]].cost)
                if (user.bank.value >= cost.value && !Magic.have(user.spells, item)) {
                    Magic.add(user.spells, item)
                    user.bank.value -= cost.value
                    altered = true
                }
            }
            if (altered) PC.save(user)
        }
        vt.out('=')

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
                        PC.load(p)
                        require('../email').rejoin(p)
                        vt.out('_', -1000)
                        continue
                    }
                }
                else {
                    db.run(`DELETE FROM Players WHERE id='${rs[row].id}'`)
                    fs.unlink(`./files/user/${rs[row].id}.txt`, () => { })
                    vt.out('x')
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
                        vt.out('&')
                    }
                }
                db.run(`DELETE FROM Players WHERE id='${rs[row].id}'`)
                fs.unlink(pathTo('files/user', `${rs[row].id}.txt`), () => { })
                fs.unlink(pathTo('users', `.${rs[row].id}.json`), () => { })
                vt.out('x')
                continue
            }

            if ((now().date - rs[row].lastdate) % 50 == 0) {
                db.run(`UPDATE Players SET pc='${Object.keys(PC.name['player'])[0]}',level=1,xplevel=0,remote='' WHERE id='${rs[row].id}'`)
                let p: user = { id: rs[row].id }
                PC.load(p)
                require('../email').rejoin(p)
                vt.sleep(1000)
            }
        }

        try {
            fs.renameSync(pathTo('files/tavern', 'today.txt'), pathTo('files/tavern', 'yesterday.txt'))
            vt.out('T')
        } catch (e) {
            vt.out('?')
        }
        vt.out(']')

        $.game.lastdate = now().date
        $.game.lasttime = now().time
        $.savegame(true)
        vt.outln(vt.yellow, vt.bright, '*')
        vt.beep(true)
        vt.outln('All set -- thank you!')
    }
}

export = Init
