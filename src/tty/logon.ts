/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  LOGON authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import fs = require('fs')
import xvt = require('xvt')

import $ = require('../common')
import Email = require('../email')
import Taxman = require('./taxman')


module Logon
{
    if (!xvt.emulation.match('VT|PC|XT'))
        xvt.emulation = 'VT'

    let title = process.title + ' (' + xvt.emulation + ')'
    if (xvt.emulation !== 'VT')
        xvt.out('\x1B]2;', title, '\x07')

    process.stdin.setEncoding(xvt.emulation == 'XT' ? 'utf8' : 'ascii')
    xvt.out(xvt.bright, xvt.cyan, xvt.emulation
        , xvt.normal, ' emulation '
        , xvt.faint, 'enabled'
        , xvt.reset, '\n\f')

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
            $.sound('stranger')
            $.action('yn')
            $.profile({ jpg:'npc/stranger', effect:'zoomIn' })
            xvt.out('The last thing you ever feel is several quarrels cutting deep into your chest.\n')
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
                        xvt.out('\n')
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
    xvt.out('\n')

    if (/new/i.test(xvt.entry)) {
        // a bit hack for now, but...
        $.reroll($.player)
        $.newkeys($.player)
        xvt.emulation = 'VT'
        $.player.rows = process.stdout.rows
        $.emulator(() => {
            $.player.emulation = xvt.emulation
            require('./newuser')
        })
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
    xvt.emulation = $.player.emulation
    $.player.rows = process.stdout.rows

    $.player.remote = process.env.REMOTEHOST || process.env.SSH_CLIENT || ''
    $.whereis = [
        'Braavos', 'Casterly Rock', 'Dorne', 'Dragonstone', 'Dreadfort',
        'The Eyrie', 'Harrenhal', 'Highgarden', 'Iron Island', 'King\'s Landing',
        'Meereen', 'Norvos', 'Oldtown', 'Pentos', 'Qohor',
        'Riverrun', 'The Twins', 'The Wall', 'Winterfell', 'Volantis'
    ][$.dice(20) - 1]
    if (/^([1][0]|[1][2][7]|[1][7][2]|[1][9][2])[.]/.test($.player.remote) || !xvt.validator.isIP($.player.remote))
        $.whereis += ' 🖥 '
    else try {
        const apikey = './etc/ipstack.key'
        fs.accessSync(apikey, fs.constants.F_OK)
        let key = fs.readFileSync(apikey).toString()
        require('got')(`http://api.ipstack.com/${$.player.remote}?access_key=${key}`, { json: true }).then(response => {
            $.whereis = ''
            let result = ''
            if (response.body) {
                if (response.body.ip) result = response.body.ip
                if (response.body.city) result = response.body.city
                if (response.body.region_code) result += (result ? ', ' : '') + response.body.region_code
                if (response.body.country_code) result += (result ? ' ' : '') + response.body.country_code
                if (response.body.location)
                    if (response.body.location.country_flag_emoji) result += ` ${response.body.location.country_flag_emoji} `
            }
            $.whereis += result ? result : $.player.remote
        }).catch(error => { $.whereis += ' ⚠️ ' })
    } catch (e) {}

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
                xvt.out(`\nYou\'re in violation of the space-time continuum: T - ${60 - t} minutes\n`)
            }
            catch {
                $.unlock(rs[row].id)
            }
            $.access.roleplay = false
            $.beep()
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
        t = 1440 * ($.now().date - $.player.lastdate) + 60 * Math.trunc(t / 100) + (t % 100) - (60 * Math.trunc($.player.lasttime / 100) + ($.player.lasttime % 100))
        if (!$.access.sysop && $.player.novice && t < 2) {
            $.access.roleplay = false; $.news('', true)
            xvt.beep()
            xvt.out('\nYou were last on just ', t == 1 ? 'a minute' : t.toString() + ' minutes', ' ago.\n')
            xvt.out('Please wait at least 2 minutes between visits.\n')
            xvt.hangup()
        }
    }

    if ($.player.lastdate != $.now().date)
        $.player.today = 0

    if ($.player.today > $.access.calls) {
        $.beep()
        xvt.out(`\nYou played all ${$.access.calls} calls for today.  Please visit again tomorrow!\n`)
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

    $.player.today++
    $.player.lastdate = $.now().date
    $.player.lasttime = $.now().time
    $.player.expires = $.player.lastdate + $.sysop.expires
    $.activate($.online, true)
    $.online.altered = true
    $.access = $.Access.name[$.player.access]
    $.player.rows = process.stdout.rows

    xvt.out(xvt.clear, xvt.red, '--=:))', xvt.LGradient[xvt.emulation]
    , xvt.Red, xvt.bright, xvt.white, $.sysop.name, xvt.reset
    , xvt.red, xvt.RGradient[xvt.emulation], '((:=--')
    xvt.out('\n\n')
    xvt.out(xvt.cyan, 'Visitor: ', xvt.bright, xvt.white, $.sysop.calls.toString()
        , xvt.reset, '  -  ')
    if ($.now().date >= $.sysop.dob)
        xvt.out(xvt.faint, $.sysop.plays.toString(), ' plays since this game started')
    else
        xvt.out('new game starts', xvt.bright, xvt.yellow)
    xvt.outln(' ', $.date2full($.sysop.dob))
    xvt.out(xvt.cyan, 'Last on: ', xvt.bright, xvt.white, $.date2full($.player.lastdate), xvt.normal, '\n')
    xvt.out(xvt.cyan, ' Online: ', xvt.bright, xvt.white, $.player.handle, xvt.normal
        , '  -  ', $.whereis, '\n')
    xvt.out(xvt.cyan, ' Access: ', xvt.bright, xvt.white, $.player.access)
    if ($.player.emulation === 'XT' && $.access.emoji)
        xvt.out(' ', $.access.emoji)
    xvt.out(xvt.normal, '  ')

    $.saveUser($.player)
    welcome()
}

function welcome() {
    $.action('yn')

    if ($.player.status === 'jail' || !$.Access.name[$.player.access].roleplay) {
        $.profile({ png:'npc/jailer', effect:'fadeIn' })
        $.sound('ddd')
        if ($.player.emulation == 'XT') xvt.out('🔒 ')
        xvt.out(xvt.bright, xvt.black, '(', xvt.magenta, 'PRISONER', xvt.black, ')\n')
        xvt.out(xvt.red, '\nYou are locked-up in jail.\n', xvt.reset)
        xvt.waste(1250)
        if ($.access.roleplay && $.dice(2 * $.online.cha) > (10 - 2 * $.player.steal)) {
            let bail = new $.coins(Math.round($.money($.player.level) * (101 - $.online.cha) / 100))
            xvt.out('\nIt will cost you ', bail.carry(), ' to get bailed-out and to continue play.\n')
            xvt.app.form = {
                'bail': { cb:() => {
                    xvt.out('\n\n')
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
        $.profile({ png:'player/' + $.player.pc.toLowerCase() + ($.player.gender === 'F' ? '_f' : '')
            , handle:$.player.handle
            , level:$.player.level, pc:$.player.pc
        })
        $.sound('welcome')

        xvt.out(xvt.bright, xvt.black, '(', xvt.normal, xvt.white, 'Welcome back, ',  $.access[$.player.gender] || 'you', xvt.bright, xvt.black, ')\n', xvt.reset)
        xvt.out(xvt.cyan, 'Visit #: ', xvt.bright, xvt.white, $.player.calls.toString(), xvt.reset
            , '  -  ', xvt.bright, xvt.blink
            , $.access.calls - $.player.today ? xvt.cyan : xvt.red
            , `${$.access.calls - $.player.today}`, xvt.reset, ' calls remaining\n')
        xvt.sessionAllowed = $.access.minutes * 60

        $.wall(`logged on as a level ${$.player.level} ${$.player.pc}`)

        xvt.out(xvt.cyan, '\nLast callers were: ', xvt.white)
        try {
            $.callers = JSON.parse(fs.readFileSync('./users/callers.json').toString())
            for (let last in $.callers) {
                xvt.out(xvt.bright, $.callers[last].who, xvt.normal, ' (', $.callers[last].reason, ')\n')
                xvt.out('                   ')
            }
        }
        catch(err) {
            xvt.out('not available (', err, ')\n')
        }

        if ($.player.today < 2) {
            if ($.player.blessed) {
                $.player.blessed = ''
                xvt.out(xvt.bright, xvt.yellow, '\nYour shining aura left you.', xvt.reset)
                $.activate($.online)
            }
            if ($.player.cursed) {
                $.player.coward = false
                $.player.cursed = ''
                xvt.out(xvt.bright, xvt.black, '\nThe dark cloud has left you.', xvt.reset)
                $.activate($.online)
            }
        }

        if (2 * $.player.jw < $.player.jl) {
            xvt.out('\n', xvt.magenta, 'Helpful: ', xvt.bright, `Your poor jousting stats are being reset.`)
            $.player.jl = 0
            $.player.jw = 0
        }
        xvt.outln()

        $.player.calls++
        $.player.plays++
        $.player.status = ''
        $.player.xplevel = $.player.level
        let play = JSON.parse(fs.readFileSync('./etc/play.json').toString())
        Object.assign($, play)
        $.mydeeds = $.loadDeed($.player.pc)

        xvt.waste(500)

        if ($.player.pc === 'None') {
            $.music('reroll')
            if ($.player.novice) {
                xvt.outln()
                xvt.out(xvt.bright)
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
        else
            $.music('logon')
    }
    else {
        xvt.out(xvt.bright, xvt.black, '(', xvt.yellow, 'VISITING', xvt.black, ')\n', xvt.reset)
        xvt.sessionAllowed = 5 * 60
        $.access.roleplay = false
        $.saveUser($.player)
        $.unlock($.player.id)
        $.news('', true)
    }

    xvt.app.form = {
        'pause': { cb: () => {
            if ($.cat(`user/${$.player.id}`)) {
                fs.unlink(`./files/user/${$.player.id}.txt`, () => {})
                xvt.app.refocus()
                return
            }
            xvt.out(xvt.clear, xvt.blue, '--=:))', xvt.LGradient[xvt.emulation]
                , xvt.Blue, xvt.bright, xvt.cyan, 'Announcement', xvt.reset
                , xvt.blue, xvt.RGradient[xvt.emulation], '((:=--\n\n'
            )
            $.cat('announcement')

            xvt.out('\n\n', xvt.cyan, '--=:))', xvt.LGradient[xvt.emulation]
                , xvt.Cyan, xvt.bright, xvt.white, 'Auto Message', xvt.reset
                , xvt.cyan, xvt.RGradient[xvt.emulation], '((:=--\n\n'
            )
            $.cat('auto-message')

            Taxman.cityguards()
        }, pause:true }
    }
    xvt.app.focus = 'pause'
}

}

export = Logon
