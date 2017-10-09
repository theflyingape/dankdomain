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
    process.stdin.setEncoding(xvt.emulation == 'XT' ? 'utf8' : 'ascii')
    xvt.out(xvt.bright, xvt.cyan, xvt.emulation, ' emulation enabled\n\f', xvt.reset)

    db.loadUser($.sysop)

    $.cat('logon')

    xvt.app.form = {
        'who': { cb:who, prompt:'Who dares to enter my dank domain <or NEW>? ', max:22, timeout:20 },
        'password': { cb:password, echo:false, max:26, timeout:20 },
    }

    let retry = 3
    xvt.app.focus = 'who'


function guards(): boolean {
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
            xvt.app.form = {
                'forgot': { cb:() => {
                    if (/Y/i.test(xvt.entry)) {
                        if ($.player.lastdate != $.now().date)
                            $.player.today = 0
                        $.player.lastdate = $.now().date
                        $.player.lasttime = $.now().time
                        db.saveUser($.player)
                        require('../email').resend()
                        return
                    }
                    else {
                        xvt.out('\n')
                        process.exit()
                    }
                }, prompt:'DOH!!  Re-send the password to your email account (Y/N)? ', cancel:'N', enter:'Y', eol:false, match:/Y|N/i }
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
            if (guards())
                xvt.app.refocus()
            return
        }
    }

    $.access = $.Access.name[$.player.access]
    xvt.emulation = $.player.emulation
    xvt.app.form['password'].prompt = $.player.handle + ', enter your password: '
    xvt.app.focus = 'password'
}

function password() {
    xvt.out('\n')
    if ($.player.password !== xvt.entry) {
        if (guards())
            xvt.app.refocus()
        return
    }

    if ($.player.email === '' && $.access.verify) {
        require('../email')
        return
    }

    if ($.access.promote > 0 && $.player.level >= $.access.promote) {
        let title = Object.keys($.Access.name).indexOf($.player.access)
        do {
            $.player.access = Object.keys($.Access.name)[++title]
            $.access = $.Access.name[$.player.access]
        } while (!xvt.validator.isDefined($.access[$.player.gender]))
    }
    else {
        let t = $.now().time
        t = 1440 * ($.now().date - $.player.lastdate) + 60 * Math.trunc(t / 100) + (t % 100) - (60 * Math.trunc($.player.lasttime / 100) + ($.player.lasttime % 100))
        if (!$.access.sysop && t < 2) {
            xvt.beep()
            xvt.out('\nYou were last on just ', t == 1 ? 'a minute' : t.toString() + ' minutes', ' ago.\n')
            xvt.out('Please wait at least 2 minutes between visits.\n')
            xvt.hangup()
        }
    }

    if ($.player.lastdate != $.now().date)
        $.player.today = 0

    if ($.player.today > $.access.calls) {
        xvt.beep()
        xvt.out('\nYou have already used all ', $.access.calls.toString(), ' visits for today.  Please visit us again tomorrow!\n')
        xvt.hangup()
    }

    xvt.ondrop = $.logoff
    db.loadUser($.sysop)
    $.sysop.calls++
    $.sysop.today++
    if (!db.loadKing()) {
        $.player.access = Object.keys($.Access.name).slice($.player.gender === 'F' ? -2 : -1)[0]
        $.player.novice = false
        $.sysop.email = $.player.email
    }
    db.saveUser($.sysop)
    
    $.player.calls++
    $.player.today++
    $.player.lastdate = $.now().date
    $.player.lasttime = $.now().time
    $.activate($.online)
    $.online.altered = true
    $.access = $.Access.name[$.player.access]

    xvt.out(xvt.clear, xvt.red, '--=:))', xvt.LGradient[xvt.emulation]
    , xvt.Red, xvt.bright, xvt.white, $.sysop.name, xvt.reset
    , xvt.red, xvt.RGradient[xvt.emulation], '((:=--')
    xvt.out('\n\n')
    xvt.out(xvt.cyan, 'Caller#: ', xvt.bright, xvt.white, $.sysop.calls.toString(), xvt.normal, '\n')
    xvt.out(xvt.cyan, ' Online: ', xvt.bright, xvt.white, $.player.handle, xvt.normal, '\n')
    xvt.out(xvt.cyan, ' Access: ', xvt.bright, xvt.white, $.player.access, xvt.normal, '  ')
    welcome()
}

function welcome() {

    if ($.player.status === 'jail' || !$.Access.name[$.player.access].roleplay) {
        xvt.out(xvt.bright, xvt.black, '(', xvt.magenta, 'PRISONER', xvt.black, ')\n')
        xvt.out(xvt.red, '\nYou are locked-up in jail.\n', xvt.reset)
        xvt.waste(1000)
        if ($.access.roleplay && $.dice(2 * $.online.cha) > (10 - 2 * $.player.steal)) {
            let bail = new $.coins(Math.round($.money($.player.level) * (101 - $.online.cha) / 100))
            xvt.out('\nIt will cost you ', bail.carry(), ' to get bailed-out and to continue play.\n')
            xvt.app.form = {
                'bail': { cb:() => {
                    xvt.out('\n\n')
                    if (/Y/i.test(xvt.entry)) {
                        $.player.coin.value -= bail.value
                        if ($.player.coin.value < 0) {
                            $.player.bank.value += $.player.coin.value
                            $.player.coin.value = 0
                            if ($.player.bank.value < 0) {
                                $.player.loan.value -= $.player.bank.value
                                $.player.bank.value = 0
                            }
                        }
                        $.player.cha = $.PC.ability($.player.cha, -1)
                        $.activate($.online)
                        $.player.status = ''
                    }
                    else {
                        xvt.out('You are left brooding with your fellow cellmates.\n')
                        xvt.waste(1000)
                        $.access = $.Access.name['Prisoner']
                    }
                    welcome()
                }, prompt:'Will you pay (Y/N)? ', cancel:'N', enter:'Y', eol:false, match:/Y|N/i }
            }
            xvt.app.focus = 'bail'
            return
        }
    }

    if ($.player.today <= $.access.calls && $.access.roleplay) {
        xvt.out(xvt.bright, xvt.black, '(', xvt.normal, xvt.white, 'Welcome back, ',  $.access[$.player.gender], xvt.bright, xvt.black, ')\n', xvt.reset)
        xvt.sessionAllowed = $.access.minutes * 60

        $.player.status = ''
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
            if ($.player.novice) {
                xvt.out(xvt.reset, '\n', xvt.bright)
                $.cat('intro')
                xvt.app.form = {
                    'pause': { cb:$.playerPC, pause:true, timeout:200 }
                }
                xvt.app.focus = 'pause'
                return
            }
            $.playerPC()
            return
        }
    }
    else {
        xvt.out(xvt.bright, xvt.black, '(', xvt.yellow, 'VISITING', xvt.black, ')\n', xvt.reset)
        xvt.sessionAllowed = 5 * 60
        $.access.roleplay = false
    }

    xvt.out(xvt.cyan, '\nLast callers were: ', xvt.white)
    try {
        $.callers = require('../users/callers')
        for (let last in $.callers) {
            xvt.out(xvt.bright, $.callers[last].who, xvt.normal, ' (', $.callers[last].reason, ')\n')
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

}

export = Logon
