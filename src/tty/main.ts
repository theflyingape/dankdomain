/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  MAIN authored by: Robert Hurst <theflyingape@gmail.com>                  *
\*****************************************************************************/

import fs = require('fs')
import {sprintf} from 'sprintf-js'

import $ = require('../common')
import xvt = require('xvt')
import Battle = require('../battle')


module Main
{
    let mainmenu: choices = {
        '@': { description:'Sysop' },
        'A': { description:'Arena: Fight and Joust' },
        'D': { description:'Deep Dank Dungeon' },
        'G': { description:'Gambling Casino' },
        'L': { description:'List of Top Users: Fame & Lame' },
        'M': { description:'Most Wanted List' },
        'N': { description:'Naval Adventures' },
        'P': { description:'Party/Gang Wars' },
        'R': { description:'Rob/Burglarize other users' },
        'S': { description:'Public Square (Shops, etc.)' },
        'T': { description:'Tiny\'s Tavern' },
        'U': { description:'User Configuration' },
        'X': { description:'terminate: Reroll character' },
        'Y': { description:'Your Statistics' },
        'Z': { description:'System Status' }
    }

export function menu(suppress = true) {
    if ($.checkXP($.online, menu)) return
    if ($.online.altered) $.saveUser($.online)
    if ($.reason) xvt.hangup()

    $.action('menu')
    xvt.app.form = {
        'menu': { cb:choice, cancel:'q', enter:'?', eol:false }
    }

    xvt.app.form['menu'].prompt = 
        xvt.attr('Time Left: ', xvt.bright, xvt.white,
            Math.round((xvt.sessionAllowed - ((new Date().getTime() - xvt.sessionStart.getTime()) / 1000)) / 60).toString())
        + xvt.attr(xvt.normal, xvt.cyan, ' min.\n', xvt.reset)
        + $.display('main', xvt.Blue, xvt.blue, suppress, mainmenu)
    xvt.app.focus = 'menu'
}

function choice() {
    let suppress = false
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isNotEmpty(mainmenu[choice]))
        if (xvt.validator.isNotEmpty(mainmenu[choice].description)) {
            xvt.out(' - ', mainmenu[choice].description)
            suppress = $.player.expert
        }
    xvt.out('\n')

    switch (choice) {
        case '@':
            if ($.access.sysop) {
                require('./sysop').menu($.player.expert)
                return
            }

        case 'A':
            require('./arena').menu(false)
            return

        case 'D':
            if ($.dungeon) {
                $.music('.')
                $.sound(`dt${$.dungeon}`)
                $.dungeon--
                require('./dungeon').DeepDank($.player.level - 1, menu)
            }
            else {
                xvt.out('\nYou have run out of dungeon turns.\n')
                break
            }
            return

        case 'G':
            $.music('casino')
            require('./gambling').menu(false)
            return

        case 'L':
            require('./hall').menu(false)
            return

        case 'M':
            xvt.out('\n')
            xvt.outln(xvt.Blue, xvt.white, ' ID   Player\'s Handle           Class    Lvl  Status  Party               ')
            xvt.outln(xvt.Blue, xvt.white, '--------------------------------------------------------------------------')

            let rs = $.query(`
                SELECT id, handle, pc, level, xplevel, status, gang, access FROM Players
                WHERE id NOT GLOB '_*' AND level > 1
                ORDER BY xplevel DESC, level DESC, wins DESC, immortal DESC
                LIMIT ${$.player.rows - 5}
            `)

            for (let n in rs) {
                //  paint a target on any player that is winning
                if (rs[n].pc === $.PC.winning)
                    xvt.out(xvt.bright, xvt.yellow)
                else if (rs[n].id === $.player.id)
                    xvt.out(xvt.bright, xvt.white)
                xvt.out(sprintf('%-4s  %-22.22s  %-9s  %3d  ', rs[n].id, rs[n].handle, rs[n].pc, rs[n].level))
                if (!rs[n].status.length) xvt.out('Alive!')
                else {
                    if ($.player.emulation === 'XT')
                        xvt.out(rs[n].status === 'jail' ? '🔒' : '🍺', ' ', xvt.faint, rs[n].status === 'jail' ? 'jail' : 'beer')
                    else
                        xvt.out(xvt.faint, rs[n].status === 'jail' ? '#jail#' : '^beer^')
                }
                xvt.out('  ', rs[n].id === $.player.id ? xvt.bright : xvt.normal)
                if (rs[n].gang === $.player.gang) xvt.out(xvt.Red)
                xvt.out(rs[n].gang)
                //  paint highest badge of honor achieved
                if ($.Access.name[rs[n].access].promote == 0)
                    xvt.out(' ', $.Access.name[rs[n].access].emoji)
                xvt.outln()
            }
            suppress = true
            break

        case 'N':
            require('./naval').menu($.player.expert)
            return

        case 'P':
            require('./party').menu($.player.expert)
            return

        case 'Q':
            $.beep()
            $.action('ny')
            xvt.app.form = {
                'yn': { cb: () => {
                    xvt.out('\n')
                    if (/Y/i.test(xvt.entry)) {
                        if (!$.reason.length) $.reason = 'logged off as a level ' + $.player.level + ' ' + $.player.pc
                        xvt.hangup()
                    }
                    menu()
                }, prompt:'Are you sure (Y/N)? ', cancel:'Y', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:10 }
            }
            $.sound('oops')
            xvt.app.focus = 'yn'
            return

        case 'R':
            if (!$.access.roleplay) break
            if ($.player.novice) {
                xvt.out('\nNovice players cannot rob.\n')
                suppress = true
                break
            }
            $.music('.')
            xvt.out('\nIt is a hot, moonless night.\n')
            xvt.out('A city guard walks down another street.\n')
            let self = $.worth(new $.coins($.online.armor.value).value, $.online.cha)
            self += $.worth(new $.coins($.online.weapon.value).value, $.online.cha)
            self += $.player.coin.value + $.player.bank.value - $.player.loan.value
            self = Math.trunc(self / (6 + $.player.steal))

            Battle.user('Rob', (opponent: active) => {
                xvt.outln()
				if (opponent.user.id === $.player.id) {
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
				if (opponent.user.id === '') {
					menu()
					return
				}
                if (!$.lock(opponent.user.id)) {
                    $.beep()
                    xvt.outln(`${$.who(opponent, 'He')}is currently engaged elsewhere and not available.`)
					menu()
					return
                }

                xvt.outln(`\nYou case ${opponent.user.handle}'s joint out.`)
                xvt.waste(600)
                let prize = $.worth(new $.coins($.Armor.name[opponent.user.armor].value).value, $.online.cha)
                prize += $.worth(new $.coins($.Weapon.name[opponent.user.weapon].value).value, $.online.cha)
                if (opponent.user.cannon) prize += $.money(opponent.user.level)
                prize += opponent.user.coin.value
                prize = $.int(prize / (6 - $.player.steal))

                if ($.dice($.online.int) > 5 && prize < self) {
                    xvt.outln('But you decide it is not worth the effort.')
                    xvt.waste(600)
					menu()
					return
                }

                xvt.outln('The goods are in', $.an(opponent.user.realestate),  ' protected by', $.an(opponent.user.security), '.')

                $.action('ny')
                xvt.app.form = {
                    'yn': { cb: () => {
                        xvt.outln()
                        if (/Y/i.test(xvt.entry)) {
							xvt.out('\nYou slide into the shadows and make your attempt ', xvt.faint)
                            xvt.waste(1000)
                            let lock = 5 * ($.Security.name[opponent.user.security].protection + 1)
                                + $.RealEstate.name[opponent.user.realestate].protection
                            let skill = Math.round($.player.steal * $.online.dex * $.online.int / 10000)
                            for (let pick = 0; pick < $.player.steal; pick++) {
                                xvt.out('.')
                                xvt.waste(400)
                                skill += $.dice(100 + $.player.steal) < 100
                                    ? $.dice($.player.level + $.player.steal - $.steal)
                                    : lock
                            }
                            xvt.outln()
                            xvt.waste(600)

                            if ($.player.email === opponent.user.email || !$.lock(opponent.user.id))
                                skill = 0

                            if (skill > lock) {
                                $.steal++
                                $.player.coin.value += prize
                                xvt.outln('You break in and make off with ', new $.coins(prize).carry(), ' worth of stuff!')
                                xvt.waste(1000)

                                opponent.user.coin.value = 0

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
                                $.log(opponent.user.id, `\n${$.player.handle} was caught robbing you!`)
                                $.reason = `caught robbing ${opponent.user.handle}`
                                $.player.status = 'jail'
                                $.player.xplevel = 0
                                $.action('clear')
                                $.profile({ png:'npc/city_guard_2', effect:'fadeIn' })
								xvt.outln('A city guard catches you and throws you into jail!')
                                $.sound('arrested', 20)
                                xvt.outln('You might be released by your next call.\n')
                                xvt.waste(1000)
                            }
                        }
                        menu()
                    }, prompt:'Attempt to steal (Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:10 }
                }
                xvt.app.focus = 'yn'
            })
            return

        case 'S':
            require('./square').menu(false)
            return

        case 'T':
            if (!$.tiny) {
                xvt.out(`\nThe tavern is closed for the day.\n`)
                suppress = true
                break
            }
            $.music('tavern' + $.dice(4))
            require('./tavern').menu(false)
            return

        case 'U':
            $.music('.')
            $.action('ny')
            let newpassword: string = ''
            xvt.app.form = {
                'yn': { cb: () => {
                    xvt.outln()
                    if (xvt.entry.toUpperCase() === 'Y') {
                        xvt.app.focus = 'new'
                        return
                    }
                    $.emulator(menu)
                }, prompt:'Change your password (Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:10 },
                'new': { cb: () => {
                    if (xvt.entry.length < 4) {
                        xvt.beep()
                        menu()
                        return
                    }
                    newpassword = xvt.entry
                    xvt.app.form['check'].max = xvt.entry.length
                    xvt.app.focus = 'check'
                }, prompt:'Enter new password: ', echo:false, max:26 },
                'check': { cb: () => {
                    if (xvt.entry === newpassword) {
                        $.player.password = newpassword
                        $.saveUser($.player)
                        xvt.out('...saved...')
                    }
                    else {
                        xvt.beep()
                        xvt.out('...aborted...')
                    }
                    $.emulator(menu)
                }, prompt:'Re-enter to verify: ', echo:false }
            }
            xvt.app.focus = 'yn'
            return

        case 'X':
            if (!$.access.roleplay) break
            $.PC.profile($.online)
            $.music('ddd')
            $.action('ny')
            xvt.app.form = {
                'yn': { cb: () => {
                    if (/Y/i.test(xvt.entry)) {
                        $.reroll($.player)
                        $.activate($.online)
                        xvt.outln()
                        $.playerPC()
                        $.player.coward = true
                        return
                    }
                    xvt.outln()
                    menu()
                }, prompt:'Reroll (Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:10 }
            }
            xvt.app.focus = 'yn'
            return

        case 'Y':
            let cost = new $.coins(Math.trunc($.money($.player.level) / 5))
            xvt.app.form = {
                'yn': { cb: () => {
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
                }, cancel:'N', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:10 }
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
            $.cat('system')
            suppress = true
            break
    }
    menu(suppress)
}

}

export = Main
