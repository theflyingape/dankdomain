/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  MAIN authored by: Robert Hurst <theflyingape@gmail.com>                  *
\*****************************************************************************/

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
        'E': { description:'Electronic Mail and Feedback' },
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

export function menu(suppress = false) {
    if ($.checkXP($.online, menu)) return
    if ($.online.altered) $.saveUser($.player)
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
    let suppress = $.player.expert
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isNotEmpty(mainmenu[choice]))
        if (xvt.validator.isNotEmpty(mainmenu[choice].description)) xvt.out(' - ', mainmenu[choice].description)
    else {
        xvt.beep()
        suppress = false
    }
    xvt.out('\n')

    switch (choice) {
        case '@':
            if ($.access.sysop) {
                require('./sysop').menu($.player.expert)
                return
            }

        case 'A':
            require('./arena').menu($.player.expert)
            return

        case 'D':
            if ($.dungeon) {
                $.dungeon--
                $.music('dungeon' + $.dice(9))
                require('./dungeon').DeepDank($.player.level - 1, menu)
            }
            else {
                xvt.out('\nYou have run out of dungeon turns.\n')
                break
            }
            return

        case 'G':
            $.music('casino')
            require('./gambling').menu($.player.expert)
            return

        case 'L':
            require('./hall').menu($.player.expert)
            return

        case 'M':
            xvt.out('\n')
            xvt.out(xvt.Blue, xvt.white)
            xvt.out(' ID   Player\'s Handle           Class    Lvl  Status  Party               \n')
            xvt.out('--------------------------------------------------------------------------', xvt.reset, '\n')

            let rs = $.query(`
                SELECT id, handle, pc, level, status, gang FROM Players
                WHERE id NOT GLOB '_*'
                ORDER BY level DESC, immortal DESC
            `)

            for (let n in rs) {
                //  paint a target on any player that is winning
                if (rs[n].pc === $.PC.winning)
                    xvt.out(xvt.bright, xvt.yellow)
                else if (rs[n] === $.player.id)
                    xvt.out(xvt.bright, xvt.white)
                xvt.out(sprintf('%-4s  %-22s  %-9s  %3d  ', rs[n].id, rs[n].handle, rs[n].pc, rs[n].level))
                if (!rs[n].status.length) xvt.out('Alive!')
                else xvt.out(xvt.faint, rs[n].status === 'jail' ? '#jail#' : '^dead^')
                xvt.out('  ', xvt.reset)
                if (rs[n].gang === $.player.gang) xvt.out(xvt.Red)
                xvt.out(rs[n].gang, xvt.reset, '\n')
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
            $.action('yn')
            xvt.app.form = {
                'yn': { cb: () => {
                    xvt.out('\n')
                    if (/Y/i.test(xvt.entry)) {
                        let userPNG = `images/user/${$.player.id}.png`
                        try {
                            fs.accessSync(userPNG, fs.constants.F_OK)
                            userPNG = `user/${$.player.id}`
                        } catch(e) {
                            userPNG = 'player/' + $.player.pc.toLowerCase() + ($.player.gender === 'F' ? '_f' : '')
                        }
                        $.profile({ png:userPNG, handle:$.player.handle, level:$.player.level, pc:$.player.pc })
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
				if (opponent.user.id === $.player.id) {
					opponent.user.id = ''
					xvt.out('\nYou can\'t rob yourself.\n')
				}
				else if (opponent.user.novice) {
					opponent.user.id = ''
					xvt.out('\nYou can\'t rob novice players.\n')
                }
                else if ($.player.level - opponent.user.level > 3) {
					opponent.user.id = ''
					xvt.out('\nYou can only rob someone higher or up to three levels below you.\n')
				}
				if (opponent.user.id === '') {
					menu(true)
					return
				}

                xvt.out('\nYou case ', opponent.user.handle, '\'s joint out.\n')
                xvt.waste(500)
                let prize = $.worth(new $.coins($.Armor.name[opponent.user.armor].value).value, $.online.cha)
                prize += $.worth(new $.coins($.Weapon.name[opponent.user.weapon].value).value, $.online.cha)
                prize += opponent.user.coin.value
                prize = Math.trunc(prize / (6 - $.player.steal))

                if ($.dice($.online.int) > 5 && prize < self) {
                    xvt.out('But you decide it is not worth the effort.\n')
					menu(true)
					return
                }

                xvt.out('The goods are in', $.an(opponent.user.realestate)
                    ,  ' protected by', $.an(opponent.user.security), '.\n')

                $.action('yn')
                xvt.app.form = {
                    'yn': { cb: () => {
                        xvt.out('\n')
                        if (/Y/i.test(xvt.entry)) {
							xvt.out('\nYou slide into the shadows and make your attempt ')
                            xvt.waste(500)
                            let lock = 5 * ($.Security.name[opponent.user.security].protection + 1) + $.RealEstate.name[opponent.user.realestate].protection
                            let skill = Math.round($.player.steal * $.online.dex * $.online.int / 10000)
                            for (let pick = 0; pick < $.player.steal; pick++) {
                                xvt.out('. ')
                                xvt.waste(500)
                                skill += $.dice(100 + $.player.steal) < 100 ? $.dice($.player.level) : 5 * $.Security.name[opponent.user.security].protection
                            }
                            if ($.player.email === opponent.user.email)
                                skill = 0
                            xvt.waste(500)
                            if (skill > lock) {
                                $.player.coin.value += prize
                                //$.player.stole++
                                xvt.out('\nYou break in and make off with ', new $.coins(prize).carry(), ' worth of stuff!\n')
                                xvt.waste(1000)

                                opponent.user.coin.value = 0

                                $.Armor.equip(opponent, opponent.user.armor)
                                if (opponent.armor.ac > 0) {
                                    if (opponent.armor.ac > $.Armor.merchant.length)
                                        opponent.armor.ac = $.Armor.merchant.length
                                    opponent.armor.ac--
                                }
                                else
                                    opponent.armor.ac = 0
                                opponent.user.armor = $.Armor.merchant[opponent.armor.ac]
                                opponent.user.toAC = 0

                                $.Weapon.equip(opponent, opponent.user.weapon)
                                if (opponent.weapon.wc > 0) {
                                    if (opponent.weapon.wc > $.Weapon.merchant.length)
                                        opponent.weapon.wc = $.Weapon.merchant.length
                                    opponent.weapon.wc--
                                }
                                else
                                    opponent.weapon.wc = 0
                                opponent.user.weapon = $.Weapon.merchant[opponent.weapon.wc]
                                opponent.user.toWC = 0

                                $.saveUser(opponent)
                                $.news(`\trobbed ${opponent.user.handle}`)
								//sprintf(line[numline++], "%s robbed you!", PLAYER.Handle);
                            }
							else {
								xvt.out('\nA guard catches you and throws you into jail!\n')
                                $.sound('arrested', 20)
                                xvt.out('You might be released by your next call.\n\n')
                                xvt.waste(1000)
								//sprintf(line[numline++], "%s was caught robbing you!", PLAYER.Handle);
                                $.reason = `caught robbing ${opponent.user.handle}`
								$.player.status = 'jail'
                                xvt.hangup()
                                return
                            }
                        }
                        menu(true)
                    }, prompt:'Attempt to steal (Y/N)? ', cancel:'Y', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:10 }
                }
                xvt.app.focus = 'yn'
            })
            return
    
        case 'S':
            require('./square').menu($.player.expert)
            return

        case 'T':
            if (!$.brawl) {
                xvt.beep()
                break
            }
            $.music('tavern' + $.dice(4))
            require('./tavern').menu($.player.expert)
            return

        case 'U':
            $.music('.')
            $.action('yn')
            let newpassword: string = ''
            xvt.app.form = {
                'yn': { cb: () => {
                    xvt.out('\n')
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
            $.music('.')
            $.sound('oops')
            $.action('yn')
            xvt.app.form = {
                'yn': { cb: () => {
                    if (/Y/i.test(xvt.entry)) {
                        $.reroll($.player)
                        $.activate($.online)
                        xvt.out('\n')
                        $.playerPC()
                        $.player.coward = true
                        return
                    }
                    xvt.out('\n')
                    menu(true)
                }, prompt:'Reroll (Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:10 }
            }
            xvt.app.focus = 'yn'
            return

        case 'Y':
            $.action('yn')
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
                        xvt.out('\n')
                        Battle.user('Scout', (opponent: active) => {
                            $.PC.stats(opponent)
                            menu(true)
                        })
                        return
                    }
                    $.PC.stats($.online)
                    menu(true)
                }, cancel:'N', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:10 }
            }
            let cost = new $.coins(Math.trunc($.money($.player.level) / 10))
            xvt.app.form['yn'].prompt = 'Scout another user for ' + cost.carry() + ' (Y/N)? '
            xvt.app.focus = 'yn'
            return

        case 'Z':
            xvt.out(xvt.bright, xvt.green, '\n')
            $.cat('system')
            xvt.out(xvt.reset)
            suppress = true
            break
    }
    menu(suppress)
}

}

export = Main
