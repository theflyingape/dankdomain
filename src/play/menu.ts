/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  MAIN authored by: Robert Hurst <theflyingape@gmail.com>                  *
\*****************************************************************************/

import $ = require('./runtime')
import db = require('../db')
import { Armor, Coin, RealEstate, Ring, Security, Weapon } from '../items'
import { carry, cat, display, emulator, getRing, log, news, tradein, vt } from '../lib'
import { Deed, PC } from '../pc'
import { elemental } from '../npc'
import { checkXP, input, pickPC } from '../player'
import { an, cuss, dice, fs, int, pathTo, sprintf, uint } from '../sys'
import Battle = require('./battle')

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

    vt.profile({ png: 'castle', effect: 'pulse' })
    vt.wall($.player.handle, `logged on as a level ${$.player.level} ${$.player.pc}`)
    vt.outln()
    cat('user/border')
    if ($.access.sysop) {
        let ring = Ring.power([], null, 'joust')
        if (($.online.altered = Ring.wear($.player.rings, ring.name))) {
            getRing('are the Ruler and gifted with', ring.name)
            PC.saveRing(ring.name, $.player.id, $.player.rings)
            PC.save()
            vt.sound('promote', 22)
            vt.outln()
        }
        ring = Ring.power([], null, 'taxes')
        if (($.online.altered = Ring.wear($.player.rings, ring.name))) {
            getRing('are the Ruler and gifted with', ring.name)
            PC.saveRing(ring.name, $.player.id, $.player.rings)
            PC.save()
            vt.outln()
        }
    }
    if ($.access.bot) {
        if (dice(39) == 1) $.border = true
        $.access.sysop = true
    }

    export function menu(suppress = true) {
        if (checkXP($.online, menu)) return
        if ($.online.altered) PC.save()
        if ($.reason) vt.hangup()
        if (!suppress) vt.profile({ png: ['castle', 'joust', 'dragon'][dice(3) - 1], effect: 'pulse' })

        elemental.orders('MainMenu')
        vt.form = {
            'menu': { cb: choice, cancel: 'Q', enter: '?', eol: false }
        }
        vt.form['menu'].prompt =
            vt.attr('Time Left: ', vt.white, vt.bright, vt.checkTime().toString(), vt.normal, vt.cyan, ' min.\n', vt.reset)
            + display('main', vt.Blue, vt.blue, suppress, mainmenu)
        input('menu')
    }

    function choice() {
        let suppress = false
        let choice = vt.entry.toUpperCase()
        if (mainmenu[choice]?.description) {
            vt.out(' - ', mainmenu[choice].description)
            suppress = $.player.expert
        }
        vt.outln()

        switch (choice) {
            case '@':
                if ($.access.sysop) {
                    vt.animated('fadeOut')
                    require('./sysop').menu($.player.expert)
                    return
                }

            case 'A':
                vt.animated('fadeOut')
                require('./arena').menu($.player.expert)
                return

            case 'D':
                if (!$.access.roleplay) break
                if ($.dungeon) {
                    vt.music()
                    PC.portrait($.online, 'backOutDown')
                    vt.sound(`dt${$.dungeon}`, 10)
                    $.dungeon--
                    require('./dungeon').DeepDank($.player.level - 1, menu)
                }
                else {
                    vt.outln('\nYou have run out of dungeon turns.')
                    suppress = true
                    break
                }
                return

            case 'G':
                vt.animated('fadeOut')
                elemental.orders('Casino')
                require('./casino').menu(false)
                return

            case 'L':
                vt.animated('fadeOut')
                require('./library').menu(false)
                return

            case 'M':
                vt.outln()
                vt.outln('  ', vt.bright, $.player.emulation == 'XT' ? vt.Blue : vt.white
                    , ` ID   Player's Handle           Class    Lvl  Status  Party                 `)
                vt.outln('  ', $.player.emulation == 'XT' ? vt.Blue : vt.faint
                    , '----------------------------------------------------------------------------')

                let top3 = {}
                let rs = db.query(`
                    SELECT hero, count(*) AS n FROM Deeds
                    GROUP BY hero HAVING n > 0
                    ORDER BY n DESC LIMIT 3
                `)
                for (let n in rs) top3[rs[n].hero] = Deed.medal[+n + 1]

                rs = db.query(`
                    SELECT id, handle, pc, level, xplevel, status, gang, access FROM Players
                    WHERE id NOT GLOB '_*' AND (id = '${$.player.id}' OR level > 1)
                    ORDER BY xplevel DESC, level DESC, wins DESC, immortal DESC
                    LIMIT ${$.player.rows - 5}
                `)

                for (let n in rs) {
                    vt.out(top3[rs[n].handle] || '  ')
                    //  paint a target on any player that is winning
                    if (rs[n].pc == PC.winning)
                        vt.out(vt.yellow, vt.bright)
                    else if (rs[n].id == $.player.id)
                        vt.out(vt.bright)
                    if (rs[n].xplevel < rs[n].level)
                        vt.out(vt.faint)
                    vt.out(sprintf('%-4s  %-22.22s  %-9s  %3d  '
                        , rs[n].id, rs[n].handle, rs[n].pc, rs[n].xplevel))
                    if (!rs[n].status.length) vt.out('Alive!')
                    else {
                        if ($.player.emulation == 'XT')
                            vt.out(rs[n].status == 'jail' ? '🔒' : '🍺', vt.faint, rs[n].status == 'jail' ? 'jail' : 'beer')
                        else
                            vt.out(vt.faint, rs[n].status == 'jail' ? '#jail#' : '^beer^')
                    }
                    vt.out('  ', rs[n].id == $.player.id ? vt.bright : vt.normal)
                    if (rs[n].gang == $.player.gang) vt.out(vt.Red)
                    vt.outln(rs[n].gang)
                }
                suppress = true
                break

            case 'N':
                vt.animated('fadeOut')
                elemental.orders('Naval')
                require('./naval').menu($.player.expert)
                return

            case 'P':
                vt.animated('fadeOut')
                require('./party').menu($.player.expert)
                return

            case 'Q':
                vt.beep(true)
                vt.action('ny')
                vt.form = {
                    'yn': {
                        cb: () => {
                            vt.outln()
                            if (/Y/i.test(vt.entry)) {
                                if (!$.reason.length) $.reason = $.access.roleplay ? 'had something better to do' : 'caught lurking'
                                vt.hangup()
                            }
                            menu()
                        }, prompt: 'Are you sure (Y/N)? ', cancel: 'Y', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                    }
                }
                vt.sound('oops')
                input('yn', 'y')
                return

            case 'R':
                if (!$.access.roleplay) break
                vt.outln()

                if (!$.rob) {
                    vt.outln('\nYou have run out of rob attempts.')
                    suppress = true
                    break
                }
                if ($.player.novice) {
                    vt.outln('Novice players cannot rob.')
                    suppress = true
                    break
                }

                vt.action('clear')
                vt.profile({ jpg: 'alley', effect: 'fadeInDown' })
                vt.outln(-600, vt.faint, 'It is a hot, moonless night.')
                vt.out(-600, 'A city guard walks down another street.')
                vt.outln(-600)

                let self = tradein(new Coin($.online.armor.value).value, $.online.cha)
                self += tradein(new Coin($.online.weapon.value).value, $.online.cha)
                self += $.player.coin.value + $.player.bank.value - $.player.loan.value
                self /= BigInt(6 + $.player.steal)

                Battle.user('Rob', (opponent: active) => {
                    vt.outln()
                    if (opponent.user.id == $.player.id) {
                        opponent.user.id = ''
                        vt.outln(`You can't rob yourself.`)
                    }
                    else if (opponent.user.novice) {
                        opponent.user.id = ''
                        vt.outln(`You can't rob novice players.`)
                    }
                    else if ($.player.level - opponent.user.level > 3) {
                        opponent.user.id = ''
                        vt.outln('You can only rob someone higher or up to three levels below you.')
                    }
                    if (opponent.user.id == '') {
                        menu()
                        return
                    }
                    if (!db.lock(opponent.user.id)) {
                        vt.beep()
                        vt.outln(`${PC.who(opponent).He}is currently engaged elsewhere and not available.`)
                        menu()
                        return
                    }

                    $.rob--
                    vt.outln(vt.faint, `You case ${opponent.user.handle}'s joint out.`, -600)

                    let prize = tradein(new Coin(Armor.name[opponent.user.armor].value).value, $.online.cha)
                    prize += tradein(new Coin(Weapon.name[opponent.user.weapon].value).value, $.online.cha)
                    if ($.dungeon && opponent.user.cannon) prize += PC.money(opponent.user.level)
                    if ($.arena) prize += opponent.user.coin.value
                    prize /= BigInt(6 - $.player.steal)

                    if (!Ring.have($.player.rings, Ring.theOne)) $.steal++
                    if (dice($.online.int, 0) > $.player.steal && prize < self) {
                        vt.outln('But you decide it is not worth the effort.', -600)
                        menu()
                        return
                    }

                    vt.action('clear')
                    vt.music('steal', 6)
                    vt.profile({ jpg: 'rob', effect: 'fadeInDown' })
                    vt.outln(vt.faint, vt.cyan, 'The goods are in', -250
                        , vt.normal, an(opponent.user.realestate), -500
                        , vt.faint, ' protected by', -250
                        , vt.normal, an(opponent.user.security)
                        , vt.faint, '.')
                    vt.sleep(2000)

                    vt.out(vt.cyan, '\nYou slide into ', -200
                        , vt.faint, 'the shadows and ', -400
                        , vt.white, 'make your attempt ', vt.magenta, -600)

                    const lock = Security.name[opponent.user.security].protection
                        + RealEstate.name[opponent.user.realestate].protection
                        + Ring.power(opponent.user.rings, $.player.rings, 'steal').power
                        + opponent.user.steal + $.steal
                        - int(opponent.user.status == 'jail') - int($.arena > 0) - int($.dungeon > 0)
                    const skill = int(
                        ([0, 1, 5, 9, 12][$.player.steal] + $.player.level / 2)
                        * ($.online.dex + $.online.int + $.online.cha) / 270)
                        + Ring.power($.player.rings, opponent.user.rings, 'steal').power

                    //  tails never fails
                    let effort = dice(3 * lock, 0)
                    for (let pick = 0; effort > 0 && pick < $.player.steal; pick++) {
                        effort = dice(uint(lock - skill - pick) + 1, 0)
                        vt.out('.')
                        vt.sound('click', dice(5, 3))
                    }
                    vt.outln(-300)

                    if (!effort) {
                        vt.outln('You break in ', -600, 'and make off with ', -600, carry(new Coin(prize)), ' worth of stuff!')
                        vt.sound('max', 12)
                        $.steal++

                        $.player.coin.value += prize
                        if ($.player.email == opponent.user.email) $.player.coward = true
                        opponent.user.coin.value = 0n

                        if (opponent.armor.ac > 0) {
                            if (opponent.armor.ac > Armor.merchant.length)
                                opponent.armor.ac = int(Armor.merchant.length * 3 / 5)
                            opponent.armor.ac--
                        }
                        else
                            opponent.armor.ac = 0
                        opponent.user.armor = Armor.merchant[opponent.armor.ac]
                        opponent.user.toAC = 0

                        if (opponent.weapon.wc > 0) {
                            if (opponent.weapon.wc > Weapon.merchant.length)
                                opponent.weapon.wc = int(Weapon.merchant.length * 3 / 5)
                            opponent.weapon.wc--
                        }
                        else
                            opponent.weapon.wc = 0
                        opponent.user.weapon = Weapon.merchant[opponent.weapon.wc]
                        opponent.user.toWC = 0

                        if (opponent.user.cannon)
                            opponent.user.cannon--

                        PC.save(opponent)
                        news(`\trobbed ${opponent.user.handle}`)
                        log(opponent.user.id, `\n${$.player.handle} robbed you!`)
                    }
                    else {
                        vt.beep(true)
                        log(opponent.user.id, `\n${$.player.handle} was caught robbing you!`)
                        $.reason = `caught robbing ${opponent.user.handle}`
                        $.player.status = 'jail'
                        vt.action('clear')
                        vt.profile({ png: 'npc/city_guard_2', effect: 'fadeIn' })
                        vt.outln(vt.cyan, Security.name[opponent.user.security].fail, '!', -600)
                        vt.sound('arrested', 10)
                        vt.outln(vt.cyan, vt.bright, 'A city guard catches you and throws you into jail!')
                        vt.outln(-2000, vt.cyan, vt.faint, `You can't deny the prize it may never fulfill you.`)
                        vt.outln(-1000)
                    }
                    menu()
                })
                return

            case 'S':
                vt.animated('fadeOut')
                require('./square').menu($.player.expert)
                return

            case 'T':
                if (!$.tiny) {
                    vt.outln(`\nThe tavern is closed for the day.`)
                    suppress = true
                    break
                }
                vt.animated('fadeOut')
                if ($.access.roleplay) vt.music('tavern' + dice(4))
                require('./tavern').menu($.player.expert)
                return

            case 'U':
                vt.music()
                vt.action('ny')
                let newpassword: string = ''
                vt.form = {
                    'yn': {
                        cb: () => {
                            vt.outln()
                            if (vt.entry.toUpperCase() == 'Y') {
                                vt.focus = 'new'
                                return
                            }
                            emulator(menu)
                        }, prompt: 'Change your password (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                    },
                    'new': {
                        cb: () => {
                            if (vt.entry.length < 4) {
                                vt.beep()
                                menu()
                                return
                            }
                            newpassword = vt.entry
                            vt.form['check'].max = vt.entry.length
                            vt.focus = 'check'
                        }, prompt: 'Enter new password: ', echo: false, max: 26
                    },
                    'check': {
                        cb: () => {
                            if (vt.entry == newpassword) {
                                $.player.password = newpassword
                                PC.save()
                                vt.out('...saved...')
                            }
                            else {
                                vt.beep()
                                vt.out('...aborted...')
                            }
                            emulator(menu)
                        }, prompt: 'Re-enter to verify: ', echo: false
                    }
                }
                input('yn')
                return

            case 'X':
                if (!$.access.roleplay) break
                PC.portrait($.online)
                vt.music('ddd')
                vt.action('ny')
                vt.form = {
                    'yn': {
                        cb: () => {
                            if (/Y/i.test(vt.entry)) {
                                $.player = PC.reroll($.player)
                                PC.activate($.online)
                                $.player.coward = true
                                $.player.plays++
                                PC.save()
                                vt.outln()
                                pickPC()
                                return
                            }
                            vt.outln()
                            menu()
                        }, prompt: 'Reroll (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                    }
                }
                input('yn')
                return

            case 'Y':
                const cost = new Coin(PC.money($.player.level) / 5n).pick(1)
                vt.form = {
                    'yn': {
                        cb: () => {
                            if (/Y/i.test(vt.entry)) {
                                $.player.coin.value -= cost.value
                                if ($.player.coin.value < 0) {
                                    $.player.bank.value += $.player.coin.value
                                    $.player.coin.value = 0n
                                    if ($.player.bank.value < 0) {
                                        $.player.loan.value -= $.player.bank.value
                                        $.player.bank.value = 0n
                                    }
                                }
                                vt.outln()
                                Battle.user('Scout', (opponent: active) => {
                                    if (opponent.user.id) {
                                        PC.status(opponent)
                                        vt.action('freetext')
                                        vt.refocus()
                                    }
                                    else
                                        menu(true)
                                }, $.access.sysop)
                                return
                            }
                            PC.status($.online)
                            suppress = true
                            menu()
                        }, cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                    }
                }

                if ($.access.roleplay) {
                    vt.action('ny')
                    vt.form['yn'].prompt = 'Scout other users for ' + carry(cost) + ' (Y/N)? '
                    input('yn', 'n', 2)
                    return
                }
                else
                    PC.status($.online)
                suppress = true
                break

            case 'Z':
                vt.out(vt.green, vt.bright)
                cat('main/system', 100)
                vt.action('ny')
                vt.form = {
                    'yn': {
                        cb: () => {
                            if (/Y/i.test(vt.entry)) {
                                let razz = PC.encounter()
                                input('message', [
                                    `${$.player.handle} does it better`,
                                    `Barbarians burn bright!`,
                                    `Gone fishin' with Solcat`,
                                    `Light it up!`,
                                    `Stupid is as stupid does`,
                                    `Where's my dough Bert??!`,
                                    `You're cracked`,
                                    `${razz.user.handle} ${[
                                        `needs`, `can use`, `should buy`
                                    ][dice(3) - 1]} ${[
                                        `penicillin for ${razz.who['his']}partying`,
                                        `a new lance`,
                                        `polish for ${razz.who['his']}${razz.user.weapon}}`,
                                        'a mask',
                                        `a clue as ${an(razz.user.pc)}`,
                                        'a friend',
                                        'a lesson',
                                        'a beer'][dice(8) - 1]
                                    }`][dice(8) - 1])
                            }
                            else {
                                vt.outln()
                                menu(true)
                            }
                        }, cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 20
                    },
                    'message': {
                        cb: () => {
                            vt.outln()
                            if (cuss(vt.entry)) {
                                $.player.coward = true
                                vt.hangup()
                            }
                            if (vt.entry) {
                                fs.writeFileSync(pathTo('files/user', 'border.txt'), vt.entry)
                                news(`\tupdated the border to:\n${vt.entry}`)
                                $.border = false
                            }
                            menu(true)
                        }, prompt: '>', max: 78
                    }
                }
                if ($.border) {
                    vt.form['yn'].prompt = `Change border message (Y/N)? `
                    input('yn', 'ny'[int($.border)])
                    return
                }
                suppress = true
                break
        }
        menu(suppress)
    }
}

export = Main
