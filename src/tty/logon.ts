/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  LOGON authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import {sprintf} from 'sprintf-js'
import xvt = require('xvt')

import $ = require('../common')
import db = require('../database')
import Email = require('../email')

module Logon
{
    xvt.app.form = {
        'who': { cb:who, prompt:'Who dares to enter my dank domain <or NEW>? ', max:22, timeout:20 },
        'password': { cb:password, echo:false, max:26, timeout:20 },
    }

    xvt.out('\nCARRIER DETECTED\n')
    xvt.waste(750)
    xvt.out(xvt.bright, xvt.cyan, xvt.emulation, ' emulation enabled\n\f', xvt.reset)
    xvt.waste(1000)
    $.cat('logon')

    db.loadUser($.sysop)

    let retry = 3
    xvt.app.focus = 'who'


function guards() {
    xvt.beep()
    xvt.out(xvt.reset, 'Invalid response.\n\n')
    xvt.waste(500)

    switch(--retry) {
        case 2:
            xvt.out('The guards eye you suspiciously.\n')
            break
        case 1:
            xvt.out('The guards aim their crossbows at you.\n')
            break
        default:
            xvt.out('The last thing you ever feel is several quarrels cutting deep into your chest.\n')
            xvt.waste(1000)
            process.exit()
            break
    }
}

function who() {
    xvt.out('\n')

    if (/new/i.test(xvt.entry)) {
        $.reroll($.player)
        xvt.emulation = 'dumb'
        $.emulator(() => {
            $.player.emulation = xvt.emulation
            require('./newuser')
        })
        return
    }

    $.player.id = xvt.entry
    if (!db.loadUser($.player)) {
        $.player.id = ''
        $.player.handle = xvt.entry
        if(!db.loadUser($.player)) {
            guards()
            xvt.app.refocus()
            return
        }
    }

    xvt.emulation = $.player.emulation
    xvt.app.form['password'].prompt = $.player.handle + ', enter your password: '
    xvt.app.focus = 'password'
}

function password() {
    xvt.out('\n')
    if ($.player.password !== xvt.entry) {
        guards()
        xvt.app.refocus()
        return
    }

    if ($.player.email === '' && $.Access.name[$.player.access].verify) {
        require('../email')
        return
    }

    let t = $.now().time
    t = 1440 * ($.now().date - $.player.lastdate) + 60 * Math.trunc(t / 100) + (t % 100) - (60 * Math.trunc($.player.lasttime / 100) + ($.player.lasttime % 100))
    if (!$.Access.name[$.player.access].sysop && t < 2) {
        if ($.player.cha > 20) {
            $.player.cha--
            db.saveUser($.player)
        }
        xvt.beep()
        xvt.out('\nYou were last on just ', t.toString(), ' minutes ago.\n')
        xvt.out('Please wait at least 2 minutes between calls.\n')
        xvt.hangup()
    }

    if ($.player.lastdate != $.now().date)
        $.player.today = 0

    if ($.player.today > $.Access.name[$.player.access].calls) {
        xvt.beep()
        xvt.out('\nYou have already used all your calls for today.  Please call back tomorrow!\n')
        xvt.hangup()
    }

    if ($.player.level >= $.Access.name[$.player.access].promote) {
            let next: boolean = false
            for (let a in $.Access.name) {
                if (next) {
                    $.player.access = a
                    break
                }
                if (a === $.player.access)
                    next = true
            }
    }

    welcome()
}

function welcome() {
    $.sysop.calls++
    $.sysop.today++
    db.saveUser($.sysop)

    xvt.out(xvt.clear, xvt.red, '--=:))', xvt.LGradient[xvt.emulation]
        , xvt.Red, xvt.bright, xvt.white, $.sysop.handle, xvt.reset
        , xvt.red, xvt.RGradient[xvt.emulation], '((:=--')
    xvt.out('\n\n')
    xvt.out(xvt.cyan, 'Caller#: ', xvt.bright, xvt.white, $.sysop.calls.toString(), xvt.nobright, '\n')
    xvt.out(xvt.cyan, ' Online: ', xvt.bright, xvt.white, $.player.handle, xvt.nobright, '\n')
    xvt.out(xvt.cyan, ' Access: ', xvt.bright, xvt.white, $.player.access, xvt.nobright, ' ')

    $.player.lastdate = $.now().date
    $.player.lasttime = $.now().time
    $.activate($.online)

    if ($.player.today++ < $.Access.name[$.player.access].calls && $.Access.name[$.player.access].roleplay) {
        xvt.ondrop = $.logoff
        xvt.out('\n')
        xvt.sessionAllowed = $.Access.name[$.player.access].minutes * 60
        $.player.calls++
        $.arena = 3
        $.bail = 1
        $.brawl = 3
        $.charity = 1
        $.dungeon = 3
        $.nest = 0
        $.joust = 3
        $.naval = 3
        $.party = 1
        $.realestate = 1
        $.security = 1
        $.tiny = 1

        if ($.player.pc === 'None') {
            $.playerPC()
            return
        }

        if ($.player.status === 'jail') {
            xvt.out(xvt.bright, xvt.red, '\nYou are still locked-up in jail.\n', xvt.reset)
            xvt.waste(500)
        }
    }
    else {
        xvt.out(xvt.bright, xvt.black, '(', xvt.yellow, 'VISITING', xvt.black, ')\n', xvt.reset)
        xvt.sessionAllowed = 5 * 60
        $.arena = 0
        $.bail = 0
        $.brawl = 0
        $.charity = 0
        $.dungeon = 0
        $.nest = 0
        $.joust = 0
        $.naval = 0
        $.party = 0
        $.realestate = 0
        $.security = 0
        $.tiny = 0
        $.reason = 'visiting'
    }

    db.saveUser($.player)

    xvt.out(xvt.cyan, '\nLast callers were: ', xvt.white)
    try {
        $.callers = require('../users/callers')
        let n = 0
        for (let last in $.callers) {
            xvt.out(xvt.bright, $.callers[last].who, xvt.nobright, ' (', $.callers[last].reason, ')\n')
            if (++n == 5) break
            xvt.out('                   ')
        }
    }
    catch(err) {
        xvt.out('not available (', err, ')\n')
    }
    xvt.app.form = {
        'pause': { cb: () => {
            require('./main').menu(true)
        }, pause:true }
    }
    xvt.app.focus = 'pause'
}

/*
function old() {
    //  if unknown, query this process
    if (! xvt.emulation) {
        //  try a remote query for terminal emulation auto-detection
        await xvt.enquiry('\x1B[6n')
        if (xvt.entry.length > 0 && xvt.entry[0] == '[' && xvt.entry[xvt.entry.length - 1] == 'R')
                                                                        xvt.emulation = 'XT'
        else {
            await xvt.enquiry('\x05')
            if (xvt.entry.length > 0)                                   xvt.emulation = 'VT'
        }
        //  else, check this process for terminal emulation auto-detection
        if (! xvt.emulation) {
            if (/ansi77|dumb|^apple|^dw|vt52/i.test(process.env.TERM))  xvt.emulation = 'dumb'
            else if (/^lisa|^ncsa|^pcvt|^vt/i.test(process.env.TERM))   xvt.emulation = 'VT'
            else if (/ansi|cygwin|^pc/i.test(process.env.TERM))         xvt.emulation = 'PC'
            else                                                        xvt.emulation = 'XT'
        }
    }

    //  allow hardcopy and monochrome terminals to still play!  :)
    if (! xvt.emulation.match('VT|PC|XT'))                              xvt.emulation = 'dumb'
    process.stdin.setEncoding(xvt.emulation == 'XT' ? 'utf8' : 'ascii')
    xvt.waste(500)

    xvt.out(xvt.bright, xvt.cyan, xvt.emulation, ' emulation enabled\n\f', xvt.reset)
    xvt.waste(1500)

    //xvt.sessionAllowed = $.Access.name[player.access].minutes * 60 * 1000
    xvt.idleTimeout = 2 * 60 * 10
*/
}

export = Logon
