/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  LOGON authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import fs = require('fs')
import xvt = require('xvt')

import $ = require('../common')


module Logon
{
    switch (xvt.app.emulation) {
    case 'PC':
        $.tty = 'rlogin'
        break
    case 'XT':
        $.tty = 'web'
        xvt.out('\x1B]2;', process.title, '\x07')
        break
    default:
        xvt.app.emulation = 'VT'
        xvt.out('\f')
    }

    xvt.outln(xvt.bright, xvt.cyan, xvt.app.emulation
        , xvt.normal, ' emulation ', xvt.faint, 'enabled\n')

    $.loadUser($.sysop)
    if ($.sysop.lastdate != $.now().date)
        $.newDay()

    $.cat('logon')
    xvt.app.form = {
        'who': { cb:who, prompt:xvt.attr('Who dares to enter my dank domain ', $.bracket('or NEW', false), '? '), max:22, timeout:40 },
        'password': { cb:password, echo:false, max:26, timeout:20 },
    }

    let retry = 3
    xvt.app.focus = 'who'


function guards(): boolean {
    xvt.beep()
    xvt.outln(xvt.reset, 'Invalid response.\n')
    xvt.waste(500)

    switch(--retry) {
        case 2:
            xvt.outln('The guards eye you suspiciously.')
            break
        case 1:
            xvt.outln('The guards aim their crossbows at you.')
            break
        default:
            $.sound('stranger')
            $.action('yn')
            $.profile({ jpg:'npc/stranger', effect:'zoomIn' })
            xvt.outln('The last thing you ever feel is several quarrels cutting deep into your chest.')
            xvt.waste(1000)
            xvt.app.form = {
                'forgot': { cb:() => {
                    if (/Y/i.test(xvt.entry)) {
                        if ($.player.lastdate != $.now().date) $.player.today = 0
                        $.player.lastdate = $.now().date
                        $.player.lasttime = $.now().time
                        $.run(`UPDATE Players SET lastdate=${$.player.lastdate},lasttime=${$.player.lasttime},today=${$.player.today} WHERE id='${$.player.id}'`)
                        require('../email').resend()
                        return
                    }
                    else {
                        xvt.outln()
                        process.exit()
                    }
                }, prompt:'DOH!!  Re-send the password to your email account (Y/N)? ', cancel:'N', enter:'Y', eol:false, match:/Y|N/i, timeout:10 }
            }
            if (xvt.validator.isNotEmpty($.player.id) && $.player.lastdate != $.now().date)
                xvt.app.focus = 'forgot'
            else
                process.exit()
            return false
    }

    return true
}

function who() {
    xvt.outln()

    if (/new/i.test(xvt.entry)) {
        // a bit hack for now, but...
        $.reroll($.player)
        $.newkeys($.player)
        $.player.emulation = xvt.app.emulation
        $.player.rows = process.stdout.rows || 25
        if ($.tty == 'web') {
            $.sound('yahoo', 20)
            require('./newuser')
        }
        else {
            $.emulator(() => {
                $.player.emulation = xvt.app.emulation
                require('./newuser')
            })
        }
        return
    }

    $.player.id = $.titlecase(xvt.entry)

    if (!$.loadUser($.player)) {
        $.player.id = ''
        $.player.handle = xvt.entry
        if(!$.loadUser($.player)) {
            if (guards())
                xvt.app.refocus()
            return
        }
    }

    $.access = $.Access.name[$.player.access]
    xvt.app.emulation = <xvt.emulator>$.player.emulation
    $.player.rows = process.stdout.rows || 25
    $.player.remote = $.remote

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

    if ($.player.email === '' && $.access.verify) {
        require('../email')
        return
    }

    $.news(`${$.player.handle} ${$.access.emoji} logged in from ${$.whereis}\n\tat ${$.time($.now().time)} as a level ${$.player.level} ${$.player.pc}:`)
    let rs = $.query(`SELECT * FROM Online`)
    for (let row = 0; row < rs.length; row++) {
        let t = $.now().time
        if ((t = (1440 * ($.now().date - rs[0].lockdate)
            + 60 * ((t / 100 - rs[0].locktime / 100) >>0)
            + t % 100 - rs[0].locktime % 100)) > 60) {
            $.unlock(rs[row].id)
            $.news(`\tremoved an expired lock: ${rs[row].id} from ${$.time(rs[row].locktime)}`)
        }
        else if (rs[row].id === $.player.id) {
            $.news(`\tkicked simultaneous player off: ${rs[row].id} lock from ${$.time(rs[row].locktime)}`)
            try {
                process.kill(rs[row].pid, 'SIGHUP')
                xvt.outln(xvt.lcyan, `\nYou're in violation of the space-time continuum: T - ${60 - t} minutes`)
            }
            catch {
                $.unlock(rs[row].id)
            }
            $.access.roleplay = false
            xvt.carrier = false
            xvt.hangup()
        }
    }

    if ($.access.promote > 0 && $.player.level >= $.access.promote) {
        let title = Object.keys($.Access.name).indexOf($.player.access)
        do {
            $.player.access = Object.keys($.Access.name)[++title]
            $.access = $.Access.name[$.player.access]
        } while (!xvt.validator.isDefined($.access[$.player.gender]))
    }
    else {
        //  old school BBS tactic (usually 5 minutes) for Millennials to experience
        let t = $.now().time
        t = 1440 * ($.now().date - $.player.lastdate) + 60 * $.int(t / 100) + (t % 100) - (60 * $.int($.player.lasttime / 100) + ($.player.lasttime % 100))
        if (!$.access.sysop && $.player.novice && t < 2) {
            $.access.roleplay = false; $.news('', true)
            xvt.beep()
            xvt.outln('\nYou were last on just ', t == 1 ? 'a minute' : t.toString() + ' minutes', ' ago.')
            xvt.outln('Please wait at least 2 minutes between visits.')
            xvt.hangup()
        }
    }

    if ($.player.lastdate != $.now().date)
        $.player.today = 0

    if ($.player.today > $.access.calls) {
        $.beep()
        xvt.outln(`\nYou played all ${$.access.calls} calls for today.  Please visit again tomorrow!`)
        $.news('', true)
        xvt.hangup()
    }

    xvt.ondrop = $.logoff
    $.loadUser($.sysop)
    if (!$.loadKing()) {
        $.player.access = Object.keys($.Access.name).slice($.player.gender === 'F' ? -2 : -1)[0]
        $.player.novice = false
        $.sysop.email = $.player.email
    }
    if ($.now().date >= $.sysop.dob) {
        $.sysop.calls++
        $.sysop.today++
        if ($.player.today <= $.access.calls && $.access.roleplay)
            $.sysop.plays++
    }
    $.saveUser($.sysop)

    $.access = $.Access.name[$.player.access]
    $.player.rows = process.stdout.rows

    xvt.outln(xvt.clear, xvt.red, '--=:))', xvt.app.LGradient
        , xvt.Red, xvt.bright, xvt.white, $.sysop.name, xvt.reset
        , xvt.red, xvt.app.RGradient, '((:=--\n')
    xvt.out(xvt.cyan, 'Visitor: ', xvt.bright, xvt.white, $.sysop.calls.toString()
        , xvt.reset, '  -  ')
    if ($.now().date >= $.sysop.dob)
        xvt.out(xvt.faint, $.sysop.plays.toString(), ' plays since this game started')
    else
        xvt.out(xvt.bright, 'new game starts', xvt.cyan)
    xvt.outln(' ', $.date2full($.sysop.dob))
    xvt.outln(xvt.cyan, 'Last on: ', xvt.bright, xvt.white, $.date2full($.player.lastdate), ' ', $.time($.player.lasttime))
    xvt.outln(xvt.cyan, ' Online: ', xvt.bright, xvt.white, $.player.handle
        , xvt.normal, '  -  ', $.whereis)
    xvt.out(xvt.cyan, ' Access: ', xvt.bright, xvt.white, $.player.access)
    if ($.player.emulation === 'XT' && $.access.emoji)
        xvt.out(' ', $.access.emoji)
    xvt.out(xvt.normal, '  ')

    $.player.today++
    $.player.lastdate = $.now().date
    $.player.lasttime = $.now().time
    $.player.expires = $.player.lastdate + $.sysop.expires
    $.activate($.online, true)
    $.online.altered = true
    $.saveUser($.player)
    welcome()
}

function welcome() {
    $.action('yn')

    if ($.player.today <= $.access.calls && ($.player.status === 'jail' || !$.Access.name[$.player.access].roleplay)) {
        $.profile({ png:'npc/jailer', effect:'fadeIn' })
        $.sound('ddd')
        if ($.player.emulation == 'XT') xvt.out('🔒 ')
        xvt.outln(xvt.bright, xvt.black, '(', xvt.magenta, 'PRISONER', xvt.black, ')')
        xvt.outln(xvt.red, '\nYou are locked-up in jail.')
        xvt.waste(1250)
        if ($.access.roleplay && $.dice(2 * $.online.cha) > (10 - 2 * $.player.steal)) {
            let bail = new $.coins(Math.round($.money($.player.level) * (101 - $.online.cha) / 100))
            xvt.outln('\nIt will cost you ', bail.carry(), ' to get bailed-out and to continue play.')
            xvt.app.form = {
                'bail': { cb:() => {
                    xvt.outln('\n')
                    if (/Y/i.test(xvt.entry)) {
                        $.sound('click')
                        $.player.coin.value -= bail.value
                        if ($.player.coin.value < 0) {
                            $.player.bank.value += $.player.coin.value
                            $.player.coin.value = 0
                            if ($.player.bank.value < 0) {
                                $.player.loan.value -= $.player.bank.value
                                $.player.bank.value = 0
                            }
                        }
                        $.PC.adjust('cha', -(4 - $.player.steal), -$.int((4 - $.player.steal) / 2, true))
                        $.player.status = ''
                    }
                    else {
                        xvt.outln(xvt.bright, xvt.red, 'You are left brooding with your fellow cellmates.')
                        xvt.waste(1234)
                        $.access = $.Access.name['Prisoner']
                    }
                    welcome()
                }, prompt:'Will you pay (Y/N)? ', cancel:'N', enter:'Y', eol:false, match:/Y|N/i, timeout:50 }
            }
            xvt.app.focus = 'bail'
            return
        }
        else
            $.sound('boo')
    }

    if ($.player.today <= $.access.calls && $.access.roleplay && $.sysop.dob <= $.now().date) {
        $.PC.profile($.online)
        $.sound('welcome')

        xvt.outln(xvt.bright, xvt.black, '(', xvt.normal, xvt.white, 'Welcome back, '
            ,  $.access[$.player.gender] || 'you', xvt.bright, xvt.black, ')')
        xvt.outln(xvt.cyan, 'Visit #: ', xvt.bright, xvt.white, $.player.calls.toString(), xvt.reset
            , '  -  ', xvt.bright, xvt.blink
            , $.access.calls - $.player.today ? xvt.cyan : xvt.red
            , `${$.access.calls - $.player.today}`, xvt.reset, ' calls remaining')
        xvt.sessionAllowed = $.access.minutes * 60

        $.wall(`logged on as a level ${$.player.level} ${$.player.pc}`)

        xvt.out(xvt.cyan, '\nLast callers were: ', xvt.white)
        try {
            $.callers = JSON.parse(fs.readFileSync('./users/callers.json').toString())
            for (let last in $.callers) {
                xvt.outln(xvt.bright, $.callers[last].who, xvt.normal, ' (', $.callers[last].reason, ')')
                xvt.out('                   ')
            }
        }
        catch(err) {
            xvt.outln(`not available (${err})`)
        }

        if ($.player.today < 2) {
            if ($.player.blessed) {
                if (!$.Ring.have($.player.rings, $.Ring.theOne) && !$.access.sysop) {
                    $.player.blessed = ''
                    xvt.out(xvt.bright, xvt.yellow, '\nYour shining aura ', xvt.normal, 'left ', xvt.faint, 'you.')
                    $.activate($.online)
                }
            }
            if ($.player.cursed) {
                if ($.player.coward)
                    $.player.coward = false
                else {
                    $.player.cursed = ''
                    xvt.out(xvt.bright, xvt.black, '\nThe dark cloud has left you.')
                    $.activate($.online)
                }
            }
        }

        if (2 * $.player.jw < $.player.jl) {
            xvt.out(xvt.reset, '\n', xvt.magenta, 'Helpful: ', xvt.bright, `Your poor jousting stats have been reset.`)
            $.player.jl = 0
            $.player.jw = 0
        }
        if ($.access.sysop) {
            let ring = $.Ring.power([], null, 'joust')
            if ($.Ring.wear($.player.rings, ring.name)) {
                $.getRing('win', ring.name)
                $.saveRing(ring.name, $.player.id, $.player.rings)
            }
        }
        xvt.outln()

        $.player.calls++
        $.player.plays++
        $.player.status = ''
        $.player.xplevel = $.player.level
        let play = JSON.parse(fs.readFileSync('./etc/play.json').toString())
        Object.assign($, play)
        $.mydeeds = $.loadDeed($.player.pc)
        $.music('logon')

        if ($.player.pc === 'None') {
            if ($.player.novice) {
                xvt.outln()
                xvt.out(xvt.bright)
                $.cat('intro')
            }
            xvt.app.form = {
                'pause': { cb:$.playerPC, pause:true, timeout:200 }
            }
            xvt.app.focus = 'pause'
            return
        }
    }
    else {
        xvt.outln(xvt.bright, xvt.black, '(', xvt.yellow, 'VISITING', xvt.black, ')')
        xvt.sessionAllowed = 5 * 60
        $.access.roleplay = false
        $.saveUser($.player)
        $.unlock($.player.id)
        $.news('', true)

        $.wall(`logged on as a level ${$.player.level} ${$.player.pc}`)

        xvt.out(xvt.cyan, '\nLast callers were: ', xvt.white)
        try {
            $.callers = JSON.parse(fs.readFileSync('./users/callers.json').toString())
            for (let last in $.callers) {
                xvt.outln(xvt.bright, $.callers[last].who, xvt.normal, ' (', $.callers[last].reason, ')')
                xvt.out('                   ')
            }
        }
        catch(err) {
            xvt.outln(`not available (${err})`)
        }
    }

    xvt.app.form = {
        'pause': { cb: () => {
            if ($.cat(`user/${$.player.id}`)) {
                fs.unlink(`./files/user/${$.player.id}.txt`, () => {})
                xvt.app.refocus()
                return
            }
            xvt.outln(xvt.clear, xvt.blue, '--=:))', xvt.app.LGradient
                , xvt.Blue, xvt.cyan, xvt.bright, 'Announcement', xvt.reset
                , xvt.blue, xvt.app.RGradient, '((:=--\n')
            $.cat('announcement')
            if ($.access.sysop)
                xvt.app.focus = 'announce'
            else {
                xvt.outln('\n\n', xvt.cyan, '--=:))', xvt.app.LGradient
                    , xvt.Cyan, xvt.white, xvt.bright, 'Auto Message', xvt.reset
                    , xvt.cyan, xvt.app.RGradient, '((:=--\n')
                $.cat('auto-message')
                xvt.app.focus = 'auto'
            }
        }, pause:true },

        'announce': { cb: () => {
            xvt.outln()
            if (/Y/i.test(xvt.entry)) {
                xvt.app.focus = 'sysop'
                return
            }
            xvt.app.focus = 'auto'
        }, prompt:'Change (Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i },

        'sysop': { cb: () => {
            if (xvt.entry) fs.writeFileSync('./files/announcement.txt', xvt.attr(
                xvt.magenta, 'Date: ', xvt.off, $.date2full($.player.lastdate), ' ', $.time($.player.lasttime) + '\n',
                xvt.magenta, 'From: ',xvt.off, $.player.handle, '\n\n',
                xvt.bright, xvt.entry))
            xvt.outln('\n', xvt.cyan, '--=:))', xvt.app.LGradient
                , xvt.Cyan, xvt.bright, xvt.white, 'Auto Message', xvt.reset
                , xvt.cyan, xvt.app.RGradient, '((:=--\n')
            $.cat('auto-message')
            xvt.app.focus = 'auto'
        }, prompt:'Enter your new announcement', lines: 12 },

        'auto': { cb: () => {
            xvt.outln()
            if (/Y/i.test(xvt.entry)) {
                xvt.app.focus = 'user'
                return
            }
            require('./taxman').cityguards()
        }, prompt:'Update (Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i },

        'user': { cb: () => {
            xvt.outln()
            if (xvt.entry && !$.cuss(xvt.entry)) {
                fs.writeFileSync('./files/auto-message.txt', xvt.attr(
                    xvt.cyan, 'Date: ', xvt.off, $.date2full($.player.lastdate), ' ', $.time($.player.lasttime), '\n',
                    xvt.cyan, 'From: ', xvt.off, $.player.handle + '\n\n',
                    xvt.bright, xvt.entry))
                $.news(`\tupdated the auto message to read:\n${xvt.entry}`)
            }
            require('./taxman').cityguards()
        }, prompt:'Enter your public message', lines: 6 }
    }
    xvt.app.focus = 'pause'
}

}

export = Logon
