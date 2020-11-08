/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  MAIN authored by: Robert Hurst <theflyingape@gmail.com>                  *
\*****************************************************************************/

import $ = require('../common')
import fs = require('fs')
import xvt = require('xvt')
import Battle = require('../battle')
import { isNotEmpty } from 'class-validator'
import { sprintf } from 'sprintf-js'

module Main {

    let mainmenu: choices = {
        '@': { description: 'Sysop' },
        'A': { description: 'Arena: Fight and Joust' },
        'D': { description: 'Deep Dank Dungeon' },
        'G': { description: 'Gambling Casino' },
        'L': { description: 'Library: Halls of History' },
        'M': { description: 'Most Wanted List' },
        'N': { description: 'Naval Adventures' },
        'P': { description: 'Party/Gang Wars' },
        'R': { description: 'Rob/Burglarize other users' },
        'S': { description: 'Public Square (Shops, etc.)' },
        'T': { description: `Tiny's Tavern` },
        'U': { description: 'User Configuration' },
        'X': { description: 'terminate: Reroll character' },
        'Y': { description: 'Your Statistics' },
        'Z': { description: 'System Status' }
    }

    $.profile({ png: 'castle', effect: 'pulse' })
    xvt.outln()
    $.cat('border')

    export function menu(suppress = true) {
        if ($.checkXP($.online, menu)) return
        if ($.online.altered) $.saveUser($.online)
        if ($.reason) xvt.hangup()

        if (!suppress) $.profile({ png: ['castle', 'joust', 'dragon'][$.dice(3) - 1], effect: 'pulse' })
        $.action('main')
        xvt.app.form = {
            'menu': { cb: choice, cancel: 'q', enter: '?', eol: false }
        }

        xvt.app.form['menu'].prompt =
            xvt.attr('Time Left: ', xvt.bright, xvt.white, $.checkTime().toString(), xvt.normal, xvt.cyan, ' min.\n', xvt.reset)
            + $.display('main', xvt.Blue, xvt.blue, suppress, mainmenu)
        xvt.app.focus = 'menu'
    }

    function choice() {
        let suppress = false
        let choice = xvt.entry.toUpperCase()
        if (isNotEmpty(mainmenu[choice]))
            if (isNotEmpty(mainmenu[choice].description)) {
                xvt.out(' - ', mainmenu[choice].description)
                suppress = $.player.expert
            }
        xvt.outln()

        switch (choice) {
            case '@':
                if ($.access.sysop) {
                    $.animated('fadeOut')
                    require('./sysop').menu($.player.expert)
                    return
                }

            case 'A':
                $.animated('fadeOut')
                require('./arena').menu($.player.expert)
                return

            case 'D':
                $.animated('fadeOut')
                if ($.dungeon) {
                    $.music('.')
                    $.sound(`dt${$.dungeon}`)
                    $.dungeon--
                    require('./dungeon').DeepDank($.player.level - 1, menu)
                }
                else {
                    xvt.outln('\nYou have run out of dungeon turns.')
                    suppress = true
                    break
                }
                return

            case 'G':
                $.animated('fadeOut')
                require('./gambling').menu($.player.expert)
                return

            case 'L':
                $.animated('fadeOut')
                require('./hall').menu($.player.expert)
                return

            case 'M':
                xvt.outln()
                xvt.outln('  ', xvt.bright, $.player.emulation == 'XT' ? xvt.Blue : xvt.white
                    , ` ID   Player's Handle           Class    Lvl  Status  Party                 `)
                xvt.outln('  ', $.player.emulation == 'XT' ? xvt.Blue : xvt.faint
                    , '----------------------------------------------------------------------------')

                let top3 = {}
                let rs = $.query(`
                    SELECT hero, count(*) AS n FROM Deeds
                    GROUP BY hero HAVING n > 0
                    ORDER BY n DESC LIMIT 3
                `)
                for (let n in rs) top3[rs[n].hero] = $.Deed.medal[+n + 1]

                rs = $.query(`
                    SELECT id, handle, pc, level, xplevel, status, gang, access FROM Players
                    WHERE id NOT GLOB '_*' AND (id = '${$.player.id}' OR level > 1)
                    ORDER BY xplevel DESC, level DESC, wins DESC, immortal DESC
                    LIMIT ${$.player.rows - 5}
                `)

                for (let n in rs) {
                    xvt.out(top3[rs[n].handle] || '  ')
                    //  paint a target on any player that is winning
                    if (rs[n].pc == $.PC.winning)
                        xvt.out(xvt.yellow, xvt.bright)
                    else if (rs[n].id == $.player.id)
                        xvt.out(xvt.bright)
                    if (rs[n].xplevel < rs[n].level)
                        xvt.out(xvt.faint)
                    xvt.out(sprintf('%-4s  %-22.22s  %-9s  %3d  '
                        , rs[n].id, rs[n].handle, rs[n].pc, rs[n].xplevel))
                    if (!rs[n].status.length) xvt.out('Alive!')
                    else {
                        if ($.player.emulation == 'XT')
                            xvt.out(rs[n].status == 'jail' ? '🔒' : '🍺', xvt.faint, rs[n].status == 'jail' ? 'jail' : 'beer')
                        else
                            xvt.out(xvt.faint, rs[n].status == 'jail' ? '#jail#' : '^beer^')
                    }
                    xvt.out('  ', rs[n].id == $.player.id ? xvt.bright : xvt.normal)
                    if (rs[n].gang == $.player.gang) xvt.out(xvt.Red)
                    xvt.outln(rs[n].gang)
                }
                suppress = true
                break

            case 'N':
                $.animated('fadeOut')
                require('./naval').menu($.player.expert)
                return

            case 'P':
                $.animated('fadeOut')
                require('./party').menu($.player.expert)
                return

            case 'Q':
                $.beep()
                $.action('ny')
                xvt.app.form = {
                    'yn': {
                        cb: () => {
                            xvt.outln()
                            if (/Y/i.test(xvt.entry)) {
                                if (!$.reason.length) $.reason = 'logged off as a level ' + $.player.level + ' ' + $.player.pc
                                xvt.hangup()
                            }
                            menu()
                        }, prompt: 'Are you sure (Y/N)? ', cancel: 'Y', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                    }
                }
                $.sound('oops')
                xvt.app.focus = 'yn'
                return

            case 'R':
                if (!$.access.roleplay) break
                xvt.outln()
                if ($.player.novice) {
                    xvt.outln('Novice players cannot rob.')
                    suppress = true
                    break
                }
                $.music('steal')
                xvt.outln(xvt.faint, 'It is a hot, moonless night.', -600)
                xvt.outln('A city guard walks down another street.', -600)

                let self = $.worth(new $.coins($.online.armor.value).value, $.online.cha)
                self += $.worth(new $.coins($.online.weapon.value).value, $.online.cha)
                self += $.player.coin.value + $.player.bank.value - $.player.loan.value
                self = $.int(self / (6 + $.player.steal))

                Battle.user('Rob', (opponent: active) => {
                    xvt.outln()
                    if (opponent.user.id == $.player.id) {
                        opponent.user.id = ''
                        xvt.outln(`You can't rob yourself.`)
                    }
                    else if (opponent.user.novice) {
                        opponent.user.id = ''
                        xvt.outln(`You can't rob novice players.`)
                    }
                    else if ($.player.level - opponent.user.level > 3) {
                        opponent.user.id = ''
                        xvt.outln('You can only rob someone higher or up to three levels below you.')
                    }
                    if (opponent.user.id == '') {
                        menu()
                        return
                    }
                    if (!$.lock(opponent.user.id)) {
                        $.beep()
                        xvt.outln(`${$.PC.who(opponent).He}is currently engaged elsewhere and not available.`)
                        menu()
                        return
                    }

                    xvt.outln(xvt.faint, `You case ${opponent.user.handle}'s joint out.`, -600)
                    let prize = $.worth(new $.coins($.Armor.name[opponent.user.armor].value).value, $.online.cha)
                    prize += $.worth(new $.coins($.Weapon.name[opponent.user.weapon].value).value, $.online.cha)
                    if ($.dungeon && opponent.user.cannon) prize += $.money(opponent.user.level)
                    if ($.arena) prize += opponent.user.coin.value
                    prize = $.int(prize / (6 - $.player.steal))

                    if ($.dice($.online.int) > 5 && prize < self) {
                        xvt.outln('But you decide it is not worth the effort.', -600)
                        menu()
                        return
                    }

                    xvt.outln(xvt.faint, xvt.cyan, 'The goods are in'
                        , xvt.normal, $.an(opponent.user.realestate)
                        , xvt.faint, ' protected by'
                        , xvt.normal, $.an(opponent.user.security)
                        , xvt.faint, '.')

                    $.action('ny')
                    xvt.app.form = {
                        'yn': {
                            cb: () => {
                                xvt.outln()
                                if (/Y/i.test(xvt.entry)) {
                                    xvt.out(xvt.cyan, '\nYou slide into ', -200
                                        , xvt.faint, 'the shadows and ', -400
                                        , xvt.white, 'make your attempt ', xvt.blue, -600)

                                    let lock = 5 *
                                        ($.Security.name[opponent.user.security].protection + +(opponent.user.status !== 'jail'))
                                        + $.RealEstate.name[opponent.user.realestate].protection
                                        + opponent.user.steal + +!$.arena + +!$.dungeon
                                    let skill = Math.round($.player.steal * $.online.dex * $.online.int / 10000)
                                    let effort = 100
                                        - $.Ring.power(opponent.user.rings, $.player.rings, 'steal').power
                                        + $.Ring.power($.player.rings, opponent.user.rings, 'steal').power

                                    for (let pick = 0; pick < $.player.steal; pick++) {
                                        xvt.out('.')
                                        $.sound('click', 6)
                                        skill += $.dice(100 + $.player.steal) < effort
                                            ? $.dice($.player.level + $.player.steal - $.steal)
                                            : lock
                                    }
                                    xvt.outln(-300)

                                    if ($.player.email == opponent.user.email || !$.lock(opponent.user.id)) {
                                        $.player.coward = true
                                        skill = 0
                                    }

                                    if (skill > lock) {
                                        if (!$.Ring.have($.player.rings, $.Ring.theOne)) $.steal++
                                        if (!$.arena || !$.dungeon) $.steal++
                                        $.player.coin.value += prize
                                        $.player.steals++
                                        xvt.outln('You break in and make off with ', new $.coins(prize).carry(), ' worth of stuff!')
                                        $.sound('max', 12)

                                        if ($.arena) opponent.user.coin.value = 0

                                        if (opponent.armor.ac > 0) {
                                            if (opponent.armor.ac > $.Armor.merchant.length)
                                                opponent.armor.ac = $.int($.Armor.merchant.length * 3 / 5)
                                            opponent.armor.ac--
                                        }
                                        else
                                            opponent.armor.ac = 0
                                        opponent.user.armor = $.Armor.merchant[opponent.armor.ac]
                                        opponent.user.toAC = 0

                                        if (opponent.weapon.wc > 0) {
                                            if (opponent.weapon.wc > $.Weapon.merchant.length)
                                                opponent.weapon.wc = $.int($.Weapon.merchant.length * 3 / 5)
                                            opponent.weapon.wc--
                                        }
                                        else
                                            opponent.weapon.wc = 0
                                        opponent.user.weapon = $.Weapon.merchant[opponent.weapon.wc]
                                        opponent.user.toWC = 0

                                        if (opponent.user.cannon)
                                            opponent.user.cannon--

                                        $.saveUser(opponent)
                                        $.news(`\trobbed ${opponent.user.handle}`)
                                        $.log(opponent.user.id, `\n${$.player.handle} robbed you!`)
                                    }
                                    else {
                                        $.beep()
                                        $.log(opponent.user.id, `\n${$.player.handle} was caught robbing you!`)
                                        $.reason = `caught robbing ${opponent.user.handle}`
                                        $.player.status = 'jail'
                                        $.action('clear')
                                        $.profile({ png: 'npc/city_guard_2', effect: 'fadeIn' })
                                        xvt.outln('A city guard catches you and throws you into jail!')
                                        $.sound('arrested', 20)
                                        xvt.outln('You might be released by your next call.\n', -1000)
                                    }
                                }
                                menu()
                            }, prompt: 'Attempt to steal (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                        }
                    }
                    xvt.app.focus = 'yn'
                })
                return

            case 'S':
                $.animated('fadeOut')
                require('./square').menu($.player.expert)
                return

            case 'T':
                if (!$.tiny) {
                    xvt.outln(`\nThe tavern is closed for the day.`)
                    suppress = true
                    break
                }
                $.animated('fadeOut')
                $.music('tavern' + $.dice(4))
                require('./tavern').menu($.player.expert)
                return

            case 'U':
                $.music('.')
                $.action('ny')
                let newpassword: string = ''
                xvt.app.form = {
                    'yn': {
                        cb: () => {
                            xvt.outln()
                            if (xvt.entry.toUpperCase() == 'Y') {
                                xvt.app.focus = 'new'
                                return
                            }
                            $.emulator(menu)
                        }, prompt: 'Change your password (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                    },
                    'new': {
                        cb: () => {
                            if (xvt.entry.length < 4) {
                                xvt.beep()
                                menu()
                                return
                            }
                            newpassword = xvt.entry
                            xvt.app.form['check'].max = xvt.entry.length
                            xvt.app.focus = 'check'
                        }, prompt: 'Enter new password: ', echo: false, max: 26
                    },
                    'check': {
                        cb: () => {
                            if (xvt.entry == newpassword) {
                                $.player.password = newpassword
                                $.saveUser($.player)
                                xvt.out('...saved...')
                            }
                            else {
                                xvt.beep()
                                xvt.out('...aborted...')
                            }
                            $.emulator(menu)
                        }, prompt: 'Re-enter to verify: ', echo: false
                    }
                }
                xvt.app.focus = 'yn'
                return

            case 'X':
                if (!$.access.roleplay) break
                $.PC.profile($.online)
                $.music('ddd')
                $.action('ny')
                xvt.app.form = {
                    'yn': {
                        cb: () => {
                            if (/Y/i.test(xvt.entry)) {
                                $.reroll($.player)
                                $.activate($.online)
                                $.player.coward = true
                                $.player.plays++
                                $.saveUser($.player)
                                xvt.outln()
                                $.playerPC()
                                return
                            }
                            xvt.outln()
                            menu()
                        }, prompt: 'Reroll (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                    }
                }
                xvt.app.focus = 'yn'
                return

            case 'Y':
                let cost = new $.coins(new $.coins($.int($.money($.player.level) / 5)).carry(1, true))
                xvt.app.form = {
                    'yn': {
                        cb: () => {
                            if (/Y/i.test(xvt.entry)) {
                                $.player.coin.value -= cost.value
                                if ($.player.coin.value < 0) {
                                    $.player.bank.value += $.player.coin.value
                                    $.player.coin.value = 0
                                    if ($.player.bank.value < 0) {
                                        $.player.loan.value -= $.player.bank.value
                                        $.player.bank.value = 0
                                    }
                                }
                                xvt.outln()
                                Battle.user('Scout', (opponent: active) => {
                                    if (opponent.user.id) {
                                        $.PC.stats(opponent)
                                        $.action('freetext')
                                        xvt.app.refocus()
                                    }
                                    else
                                        menu(true)
                                })
                                return
                            }
                            $.PC.stats($.online)
                            suppress = true
                            menu()
                        }, cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                    }
                }
                if ($.access.roleplay) {
                    $.action('ny')
                    xvt.app.form['yn'].prompt = 'Scout other users for ' + cost.carry() + ' (Y/N)? '
                    xvt.app.focus = 'yn'
                    return
                }
                else
                    $.PC.stats($.online)
                suppress = true
                break

            case 'Z':
                xvt.out(xvt.bright, xvt.green, '\n')
                $.cat('main/system')
                $.action('ny')
                xvt.app.form = {
                    'yn': {
                        cb: () => {
                            if (/Y/i.test(xvt.entry))
                                xvt.app.focus = 'message'
                            else {
                                xvt.outln()
                                menu(true)
                            }
                        }, cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 20
                    },
                    'message': {
                        cb: () => {
                            xvt.outln()
                            if ($.cuss(xvt.entry)) {
                                $.player.coward = true
                                xvt.hangup()
                            }
                            if (xvt.entry) {
                                fs.writeFileSync('./files/border.txt', xvt.entry)
                                $.news(`\tupdated the border to:\n${xvt.entry}`)
                            }
                            menu(true)
                        }, prompt: '>', max: 78
                    }
                }
                xvt.app.form['yn'].prompt = `Change border message (Y/N)? `
                xvt.app.focus = 'yn'
                return
        }
        menu(suppress)
    }

}

export = Main
