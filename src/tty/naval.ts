/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  NAVAL authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import Battle = require('../battle')
import db = require('../db')
import $ = require('../runtime')
import { vt, Coin, action, activate, armor, bracket, cat, checkXP, display, keyhint, loadUser, music, portrait, profile, reroll, sound, weapon, wearing } from '../io'
import { encounter, log, news, tradein, what } from '../lib'
import { PC } from '../pc'
import { an, dice, int, money, sprintf, whole } from '../sys'

module Naval {

    let mon: number
    let monsters: naval[] = require('../etc/naval.json')
    let sm: naval
    let naval: choices = {
        'S': { description: 'Shipyard' },
        'B': { description: 'Battle other users' },
        'H': { description: 'Hunt sea monsters' },
        'G': { description: 'Go fishing' },
        'Y': { description: `Your ship's status` },
        'L': { description: 'List user ships' }
    }

    export function menu(suppress = true) {
        $.from = 'Naval'
        if (checkXP($.online, menu)) return
        if ($.online.altered) PC.saveUser($.online)
        if ($.reason) vt.hangup()

        action('naval')
        vt.form = {
            'menu': { cb: choice, cancel: 'q', enter: '?', eol: false }
        }
        vt.form['menu'].prompt = display('naval', vt.Cyan, vt.cyan, suppress, naval)
        vt.focus = 'menu'
    }

    function choice() {
        let suppress = false
        let choice = vt.entry.toUpperCase()
        if (naval[choice]?.description) {
            vt.out(' - ', naval[choice].description)
            suppress = $.player.expert
        }
        vt.outln()

        let rs: any[]
        let cap: number
        let n: number

        switch (choice) {
            case 'B':
                suppress = true
                if (!$.access.roleplay) break
                if (!$.player.hull) {
                    vt.outln(`\nYou don't have a ship!`)
                    break
                }
                if (!$.naval) {
                    vt.outln('\nYou have run out of battles.')
                    break
                }
                Battle.user('Battle', (opponent: active) => {
                    vt.outln()
                    if (opponent.user.id == '' || opponent.user.id == $.player.id) {
                        menu(true)
                        return
                    }
                    if (!opponent.user.hull) {
                        vt.outln(`${PC.who(opponent).He}doesn't have a ship.`)
                        menu(true)
                        return
                    }
                    if (!db.lock(opponent.user.id)) {
                        vt.beep()
                        vt.outln(`${PC.who(opponent).He}is currently engaged elsewhere and not available.`)
                        menu(true)
                        return
                    }

                    vt.outln(`You sail out until you spot ${opponent.user.handle}'s ship on the horizon.`)
                    vt.sleep(500)
                    vt.outln(`It has ${opponent.user.hull} hull points.`)
                    vt.sleep(500)

                    action('ny')
                    vt.form = {
                        'battle': {
                            cb: () => {
                                vt.outln()
                                if (/Y/i.test(vt.entry)) {
                                    if (activate(opponent, true)) {
                                        $.naval--
                                        BattleUser(opponent)
                                    }
                                    else
                                        menu(!$.player.expert)
                                }
                                else
                                    menu(!$.player.expert)
                            }, prompt: `Will you battle ${PC.who(opponent).him}(Y/N)? `, cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                        }
                    }
                    vt.focus = 'battle'
                })
                return

            case 'G':
                suppress = true
                if (!$.access.roleplay) break
                vt.outln()
                if (!$.player.hull) {
                    vt.outln(`You don't have a ship!`)
                    break
                }
                vt.outln('It is a fine day for sailing.  You cast your reel into the ocean and feel')
                vt.out('a gentle tug... ')
                vt.sleep(600)
                vt.out('you caught a')
                vt.sleep(600)
                let cast = 100 * $.online.cha / $.player.maxcha
                cast = (cast < 15) ? 15 : (cast > 100) ? 100 : cast >> 0
                let hook = dice(cast)
                if (hook < 15) {
                    let floater = encounter(`AND id NOT GLOB '_*'`)
                    if (floater.user.id && floater.user.status) {
                        let leftby = <user>{ id: floater.user.status }
                        if (loadUser(leftby)) {
                            portrait(floater, 'fadeInUpBig')
                            vt.out(' floating carcass!')
                            vt.sleep(500)
                            loadUser(floater)
                            vt.outln(`\nIt is ${floater.user.handle}'s body in the ocean left there by ${leftby.handle}, and`)
                            vt.outln(`you're able to bring the player back to an Alive! state.`)
                            db.run(`UPDATE Players set status='' WHERE id='${floater.user.id}'`)
                            news(`\trecovered ${floater.user.handle}'s body from the ocean`)
                            menu()
                            return
                        }
                    }
                    if (dice($.player.level / 3 + 2) == 1) {
                        loadUser($.seahag)
                        vt.outln(`n ${$.seahag.user.handle}!`)
                        cat(`naval/${$.seahag.user.handle}`.toLowerCase())
                        vt.outln(-600, vt.green, vt.bright, 'She cackles as you are sent spinning elsewhere ... ')
                        sound('crone', 24)
                        require('./dungeon').DeepDank($.player.level + 3 * dice($.player.level), () => {
                            $.from = 'Naval'
                            profile({
                                jpg: 'npc/seahag', effect: 'fadeInUp'
                                , handle: $.seahag.user.handle, level: $.seahag.user.level, pc: $.seahag.user.pc
                            })
                            sound('god', 12)
                            vt.outln(vt.magenta, '\n"', vt.bright, vt.yellow
                                , 'You have escaped my magic, mortal?  Now try me!'
                                , vt.normal, vt.magenta, '"', -1200)
                            cat(`naval/${$.seahag.user.handle}`.toLowerCase())
                            wearing($.seahag)
                            $.seahag.user.cursed = $.player.id
                            Battle.engage('Naval', $.online, $.seahag, menu)
                            return
                        })
                        return
                    }
                    if (dice($.player.level / 3 + 2) == 1) {
                        loadUser($.neptune)
                        vt.outln(` ${$.neptune.user.pc}: ${$.neptune.user.handle}!`)
                        cat(`naval/${$.neptune.user.handle}`.toLowerCase())
                        vt.sleep(600)
                        if ($.player.level > $.neptune.user.level) {
                            let keep = $.neptune.user.spells
                            reroll($.neptune.user, $.neptune.user.pc, $.player.level - 1)
                            activate($.neptune)
                            $.neptune.user.spells = keep
                        }
                        vt.outln(vt.cyan, vt.bright, 'He looks at you angrily as he removes a hook from his shorts!')
                        profile({
                            jpg: 'npc/neptune', effect: 'fadeInUp'
                            , handle: $.neptune.user.handle, level: $.neptune.user.level, pc: $.neptune.user.pc
                        })
                        sound('neptune', 32)
                        wearing($.neptune)
                        Battle.engage('Naval', $.online, $.neptune, menu)
                        return
                    }
                    vt.outln(' fish and you eat it.')
                    sound('quaff', 6)
                    vt.outln('Ugh!  You feel sick and die!')
                    $.reason = `ate yesterday's catch of the day`
                    break
                }
                if (hook < 50) {
                    vt.outln(' fish and you eat it.')
                    sound('quaff', 6)
                    sound('yum')
                    vt.outln('Yum!  You feel stronger and healthier.\n')
                    PC.adjust('str', 101)
                    vt.out(`Stamina = ${$.online.str}     `)
                    $.online.hp += int(PC.hp() / 2) + dice(PC.hp() / 2)
                    vt.out(`Hit points = ${$.online.hp}     `)
                    if ($.player.sp) {
                        $.online.sp += int(PC.sp() / 2) + dice(PC.sp() / 2)
                        vt.out(`Spell points = ${$.online.sp}`)
                    }
                    vt.outln()
                    break
                }
                if (hook < 75) {
                    vt.outln('n oyster and you eat it.')
                    vt.sleep(600)
                    cap = money($.player.level)
                    n = Math.round(Math.pow(2., $.player.hull / 150.) * 7937)
                    n = int(n / $.player.hull / 10 * dice($.online.hull))
                    n = int(n * ($.player.cannon + 1) / ($.player.hull / 50))
                    n = tradein(n, $.online.cha)
                    if (n > cap) n = cap
                    sound('oof')
                    vt.outln(`Ouch!  You bit into a pearl and sell it for ${new Coin(n).carry()}.`)
                    $.player.coin.value += n
                    break
                }
                if (hook < 90) {
                    vt.outln('n oyster and you eat it.')
                    vt.sleep(600)
                    cap = 3 * money($.player.level)
                    n = Math.round(Math.pow(2., $.player.hull / 150.) * 7937)
                    n = int(n / $.player.hull * dice($.online.hull))
                    n = int(n * ($.player.cannon + 1) / ($.player.hull / 50))
                    n = tradein(n, $.online.cha)
                    if (n > cap) n = cap
                    sound('oof')
                    vt.outln(`Ouch!  You bit into a diamond and sell it for ${new Coin(n).carry()}.`)
                    $.player.coin.value += n
                    break
                }
                if (hook < 95) {
                    profile({ jpg: 'naval/turtle', effect: 'fadeInUp' })
                    vt.outln(' turtle and you let it go.')
                    vt.sleep(600)
                    $.player.toAC++
                    $.online.toAC += dice($.online.armor.ac / 5 + 1)
                    vt.outln('The turtle turns and smiles and enhances your ', armor())
                    sound('shield')
                    break
                }
                if (hook < 100) {
                    vt.outln(' tortoise and you let it go.')
                    vt.sleep(600)
                    $.player.toWC++
                    $.online.toWC += dice($.online.weapon.wc / 10 + 1)
                    vt.outln('The tortoise shows it gratitude by enchanting your ', weapon())
                    sound('hone')
                    break
                }
                vt.outln(' mermaid!')
                vt.sleep(600)
                profile({ jpg: 'naval/mermaid', effect: 'bounceInUp' })
                cat('naval/mermaid')
                if ($.player.today) {
                    vt.outln('She grants you an extra call for today!')
                    $.player.today--
                    news('\tcaught an extra call')
                }
                else {
                    vt.outln(`She says, "Here's a key hint:"`)
                    keyhint($.online)
                }
                vt.form = {
                    'pause': { cb: menu, pause: true }
                }
                vt.focus = 'pause'
                return

            case 'H':
                suppress = true
                if (!$.access.roleplay) break
                if (!$.player.hull) {
                    vt.outln(`\nYou don't have a ship!`)
                    break
                }
                if (!$.naval) {
                    vt.outln('\nYou have run out of battles.')
                    break
                }

                for (let i in monsters)
                    vt.out(bracket(+i + 1), vt.cyan, monsters[i].name)
                vt.outln()

                action('list')
                vt.form = {
                    pick: {
                        cb: () => {
                            vt.outln()
                            if (vt.entry.length) {
                                let mon = int(vt.entry)
                                if (mon < 1 || mon > monsters.length) {
                                    vt.refocus()
                                    return
                                }
                                vt.entry = mon.toString()
                                MonsterHunt()
                            }
                            else
                                menu()
                        }
                        , prompt: 'Hunt which monster (' + vt.attr(vt.white, '1-' + monsters.length, vt.cyan, ')? '), min: 0, max: 1
                    }
                }
                vt.focus = 'pick'
                return

            case 'L':
                suppress = true
                vt.outln()
                vt.outln(vt.Blue, vt.bright, ' ID             Username            Hull     Cannons     Ram')
                vt.outln(vt.Blue, vt.bright, '----     ----------------------     ----     -------     ---')
                rs = db.query(`SELECT id,handle,hull,cannon,ram FROM Players WHERE hull > 0 ORDER BY hull DESC`)
                for (let i in rs) {
                    vt.outln(sprintf('%-4s     %-22s     %4u     %5u        %s'
                        , rs[i].id, rs[i].handle, rs[i].hull, rs[i].cannon, rs[i].ram ? 'Y' : 'N')
                    )
                }
                break

            case 'S':
                if (!$.access.roleplay) break
                Shipyard($.player.expert)
                return

            case 'Q':
                require('./main').menu($.player.expert)
                return

            case 'Y':
                suppress = true
                vt.outln()
                if (!$.player.hull) {
                    vt.outln(`You don't have a ship!`)
                    break
                }
                vt.outln(`Ship's Status:\n`)
                vt.outln(`Hull points: ${$.online.hull} out of ${$.player.hull}`)
                vt.outln(`Cannons: ${$.player.cannon}`)
                vt.outln(`Ram: ${$.player.ram ? 'Yes' : 'No'}`)
                break
        }
        menu(suppress)
    }

    function Shipyard(suppress = true) {
        action('shipyard')
        let shipyard: choices = {
            'B': { description: 'Buy a new ship' },
            'F': { description: 'Fix battle damage' },
            'C': { description: 'Mount cannons' },
            'R': { description: 'Mount a ram' }
        }

        vt.form = {
            'menu': { cb: master, cancel: 'q', enter: '?', eol: false }
        }
        vt.form['menu'].prompt = display('shipyard', vt.Cyan, vt.cyan, suppress, shipyard)
        vt.focus = 'menu'

        function master() {
            let suppress = false
            let choice = vt.entry.toUpperCase()
            if (shipyard[choice]?.description) {
                vt.out(' - ', shipyard[choice].description)
                suppress = true
            }
            vt.outln('\n')

            let ship = 50
            let cost = Math.round(Math.pow(2, ship / 150) * 7937)
            let max: number
            let afford: number

            switch (choice) {
                case 'B':
                    if ($.player.hull + 50 > 8000) {
                        vt.beep()
                        vt.outln(`They don't make ships any bigger than the one you have now.`)
                        break
                    }
                    if (!$.player.hull) {
                        if ($.player.coin.value < cost) {
                            vt.outln('You need at least ', new Coin(cost).carry(), ' to buy a ship.')
                            break
                        }
                    }
                    if ($.naval > 2) music('sailing')

                    vt.outln('List of affordable ships:\n')
                    max = $.player.hull + 50
                    cost = Math.round(Math.pow(2, max / 150) * 7937)
                    while (max <= 8000 && cost < $.player.coin.value) {
                        vt.outln(sprintf('Hull size: %-4d     Cost: ', max), new Coin(cost).carry())
                        max += 50
                        cost = Math.round(Math.pow(2, max / 150) * 7937)
                    }

                    action('listbest')
                    vt.form = {
                        'size': {
                            cb: () => {
                                vt.outln('\n')
                                if (vt.entry.length) {
                                    if (/=|max/i.test(vt.entry)) {
                                        vt.beep()
                                        vt.entry = (max - 50).toString()
                                    }
                                    ship = +vt.entry
                                    if (isNaN(ship)) {
                                        vt.refocus()
                                        return
                                    }
                                    if (ship % 50) {
                                        vt.outln(`We don't make ships with that hull size.  Only in multiples of 50.`)
                                        vt.refocus()
                                        return
                                    }
                                    if (ship <= $.player.hull) {
                                        vt.outln(`You already have a ${$.player.hull} hull size ship!`)
                                        vt.refocus()
                                        return
                                    }
                                    if (ship >= max) {
                                        vt.outln(`You don't have enough money!`)
                                        vt.refocus()
                                        return
                                    }
                                    if (ship > 8000) {
                                        vt.outln(`We don't make ships that big!`)
                                        vt.refocus()
                                        return
                                    }

                                    profile({ png: 'payment', effect: 'tada' })
                                    sound('click', 5)
                                    cost = Math.round(Math.pow(2, ship / 150) * 7937)
                                    $.player.coin.value -= cost
                                    $.player.hull = ship
                                    $.player.ram = false
                                    $.online.hull = $.player.hull
                                    db.run(`UPDATE Players set hull=${ship},ram=0 WHERE id='${$.player.id}'`)
                                    vt.outln(`You now have a brand new ${$.player.hull} hull point ship, with no ram.`)
                                    sound('boat')
                                }
                                Shipyard()
                            }
                            , prompt: 'Enter hull size to buy: ', min: 0, max: 4
                        }
                    }
                    vt.focus = 'size'
                    return

                case 'F':
                    if (!$.player.hull) {
                        vt.outln(`You don't have a ship!`)
                        break
                    }
                    max = $.player.hull - $.online.hull
                    vt.outln(`You need ${max} hull points of repair.`)
                    cost = Math.round(Math.pow(2, $.player.hull / 150) * 7937)
                    cost = int(cost / $.player.hull / 10)
                    vt.outln(`Each hull point costs ${new Coin(cost).carry()} to repair.`)
                    if (!max) break
                    afford = int($.player.coin.value / cost)
                    if (afford < max)
                        max = afford
                    action('listall')
                    vt.form = {
                        'hp': {
                            cb: () => {
                                vt.outln('\n')
                                let buy = whole(/=|max/i.test(vt.entry) ? max : +vt.entry)
                                if (buy > 0 && buy <= max) {
                                    $.player.coin.value -= buy * cost
                                    if ($.player.coin.value < 0)
                                        $.player.coin.value = 0
                                    $.online.hull += buy
                                    vt.beep()
                                    vt.outln(`Hull points = ${$.online.hull}`)
                                }
                                Shipyard()
                                return
                            }, max: 4
                        }
                    }
                    vt.form['hp'].prompt = vt.attr('How many points [', vt.bright, vt.white, vt.uline, 'MAX', vt.reset, '=', max.toString(), vt.cyan, ']? ')
                    vt.focus = 'hp'
                    return

                case 'C':
                    if (!$.player.hull) {
                        vt.outln(`You don't have a ship!`)
                        break
                    }
                    max = int($.player.hull / 50) - $.player.cannon
                    vt.outln(`You can mount up to ${max} more cannons.`)
                    cost = Math.round(Math.pow(2, $.player.hull / 150) * 7937)
                    cost = int(cost / 250)
                    vt.outln(`Each cannon costs ${new Coin(cost).carry()}.`)
                    afford = int($.player.coin.value / cost)
                    if (afford < max)
                        max = afford
                    action('listbest')
                    vt.form = {
                        'cannon': {
                            cb: () => {
                                vt.outln('\n')
                                let buy = whole(/=|max/i.test(vt.entry) ? max : +vt.entry)
                                if (buy > 0 && buy <= max) {
                                    $.player.coin.value -= buy * cost
                                    if ($.player.coin.value < 0)
                                        $.player.coin.value = 0
                                    $.player.cannon += buy
                                    vt.beep()
                                    vt.outln(`Cannons = ${$.player.cannon}`)
                                    db.run(`UPDATE Players set cannon=${$.player.cannon} WHERE id='${$.player.id}'`)
                                }
                                Shipyard()
                                return
                            }, max: 4
                        }
                    }
                    vt.form['cannon'].prompt = vt.attr('How many cannons [', vt.bright, vt.white, vt.uline, 'MAX', vt.reset, '=', max.toString(), vt.cyan, ']? ')
                    vt.focus = 'cannon'
                    return

                case 'R':
                    if (!$.player.hull) {
                        vt.outln(`You don't have a ship!`)
                        break
                    }
                    if ($.player.ram) {
                        vt.outln(`But your ship already has a ram!`)
                        break
                    }
                    cost = Math.round(Math.pow(2, $.player.hull / 150) * 7937)
                    cost = int(cost / 10)
                    vt.outln(`We can equip your ship with a ram for ${new Coin(cost).carry()}.`)
                    afford = int($.player.coin.value / cost)
                    if (!afford) {
                        vt.outln(`You don't have enough money!`)
                        break
                    }
                    action('yn')
                    vt.form = {
                        'ram': {
                            cb: () => {
                                vt.outln('\n')
                                if (/Y/i.test(vt.entry)) {
                                    $.player.coin.value -= cost
                                    if ($.player.coin.value < 0)
                                        $.player.coin.value = 0
                                    $.player.ram = true
                                    vt.beep()
                                    vt.outln('You now have a ram.')
                                    db.run(`UPDATE Players set ram=1 WHERE id='${$.player.id}'`)
                                }
                                Shipyard()
                                return
                            }, prompt: 'Ok (Y/N)? ', cancel: 'N', enter: 'Y', eol: false, match: /Y|N/i, max: 1, timeout: 20
                        }
                    }
                    vt.focus = 'ram'
                    return

                case 'Q':
                    menu($.player.expert)
                    return
            }
            Shipyard(suppress)
        }
    }

    function BattleUser(nme: active) {
        let damage: number

        vt.outln()
        if (dice(100) + $.online.int >= dice(100) + nme.int) {
            vt.outln(`You approach ${PC.who(nme).him}and quickly open fire.`)
            if (you()) {
                menu()
                return
            }
        }
        else
            vt.outln(`${PC.who(nme).He}spots you coming and attacks.`)

        if (him()) {
            menu()
            return
        }

        action('hunt')
        vt.form = {
            'attack': {
                cb: () => {
                    vt.outln()
                    switch (vt.entry.toUpperCase()) {
                        case 'F':
                            if (you() || him()) {
                                menu()
                                return
                            }
                            break

                        case 'S':
                            vt.outln()
                            if (!outrun($.online.hull / nme.hull, $.online.int - nme.int)) {
                                sound('oops')
                                vt.outln(`${PC.who(nme).He}outruns you and stops your retreat!`)
                                vt.sleep(500)
                                if (him()) {
                                    menu()
                                    return
                                }
                            }
                            else {
                                PC.adjust('cha', -2, -1)
                                $.player.retreats++
                                vt.outln(vt.bright, vt.cyan, 'You sail '
                                    , vt.normal, 'away safely '
                                    , vt.faint, 'out of range.')
                                PC.saveUser(nme, false, true)
                                db.run(`UPDATE Players set hull=${$.player.hull},cannon=${$.player.cannon},ram=${+$.player.ram},retreats=${$.player.retreats} WHERE id='${$.player.id}'`)
                                log(nme.user.id, `\n${$.player.handle}, the coward, sailed away from you.`)
                                menu()
                                return
                            }
                            break

                        case 'R':
                            if ($.player.ram) {
                                vt.outln()
                                if (outmaneuvered(nme.int - $.online.int, nme.hull / $.online.hull)) {
                                    vt.outln(`${PC.who(nme).He}quickly outmaneuvers your ship.`)
                                    vt.sleep(400)
                                    vt.outln(vt.cyan, 'You yell at your helmsman, "', vt.reset,
                                        ['Your aim is going to kill us all!'
                                            , 'I said port, bastard, not starboard!'
                                            , 'Get me my brown pants!'
                                            , 'Someone throw this traitor overboard!'
                                            , 'She\'s turning onto US now!'][dice(5) - 1]
                                        , vt.cyan, '"')
                                    vt.sleep(600)
                                }
                                else {
                                    damage = dice($.player.hull / 2) + dice($.online.hull / 2)
                                    vt.outln(vt.green, `You ram ${PC.who(nme).him}for `
                                        , vt.bright, `${damage}`
                                        , vt.normal, ` hull points of damage!`)
                                    if ((nme.hull -= damage) < 1) {
                                        booty()
                                        menu()
                                        return
                                    }
                                }
                            }
                            else {
                                sound('oops')
                                vt.outln()
                                vt.outln(`Your first mate cries back, "But we don't have a ram!"`)
                                vt.sleep(2000)
                                sound('fire', 8)
                                vt.outln('You shoot your first mate.')
                                vt.sleep(800)
                            }
                            if (him()) {
                                menu()
                                return
                            }
                            break

                        case 'Y':
                            vt.outln()
                            vt.outln(`Hull points: ${$.online.hull}`)
                            vt.outln(`Cannons: ${$.player.cannon}`)
                            vt.outln(`Ram: ${$.player.ram ? 'Yes' : 'No'}`)
                            break
                    }
                    vt.refocus()
                }, prompt: vt.attr(bracket('F', false), vt.cyan, 'ire cannons, ', bracket('R', false), vt.cyan, 'am, '
                    , bracket('S', false), vt.cyan, 'ail off, ', bracket('Y', false), vt.cyan, 'our status: ')
                , cancel: 'S', enter: 'F', eol: false, match: /F|R|S|Y/i, timeout: 20
            }
        }
        vt.focus = 'attack'

        function booty() {
            nme.hull = 0
            vt.out('\n', [
                `You've sunk ${nme.user.handle}\'s ship!`,
                `You've sunk ${nme.user.handle}\'s leaky, old tub!`,
                `You've made splinters out of ${nme.user.handle}\'s ship!`,
                `${nme.user.handle} is now sleeping with the fishes!`,
                `${nme.user.handle} is now chum for the sharks!`
            ][dice(5) - 1], '!\n')
            vt.sleep(500)
            log(nme.user.id, `\n${$.player.handle} sank your ship!`)
            news(`\tsank ${nme.user.handle}'s ship`)

            let booty = new Coin(Math.round(Math.pow(2, $.player.hull / 150) * 7937 / 250))
            booty.value = int(booty.value * nme.user.cannon)
            if (nme.user.coin.value > booty.value) {
                sound('boo')
                vt.outln(`${new Coin(nme.user.coin.value - booty.value).carry()} of the booty has settled on the ocean floor...`)
                vt.sleep(500)
                nme.user.coin.value = booty.value
            }
            booty.value += nme.user.coin.value
            if (booty.value) {
                sound('booty', 5)
                vt.outln('You get ', booty.carry(), '.')
                log(nme.user.id, `... and got ${booty.carry(2, true)}.\n`)
                $.player.coin.value += booty.value
                vt.sleep(500)
                nme.user.coin.value = 0
            }
            booty.value += nme.user.coin.value
            PC.saveUser(nme, false, true)
        }

        function you(): boolean {
            let result = fire($.online, nme)
            if (nme.hull > 0) {
                if (dice(10) == 1) {
                    vt.outln(vt.cyan, 'You call out to your crew, "', vt.reset,
                        ['Fire at crest to hit the best!'
                            , 'Crying will not save you!'
                            , `Look alive, or I'll kill you first!`
                            , 'Get me my red shirt!'
                            , `Y'all fight like the will-o-wisp!`][dice(5) - 1]
                        , vt.cyan, '"')
                    vt.sleep(600)
                }
                return false
            }
            booty()
            return true
        }

        function him(): boolean {
            if (!nme.user.cannon && !nme.user.ram) {
                vt.out('They are defenseless and attempt to flee . . . ')
                vt.sleep(1000)
                if (!outrun(nme.hull / $.online.hull, nme.int - $.online.int)) {
                    vt.outln(`\nYou outrun them and stop their retreat!`)
                    vt.sleep(500)
                    return false
                }
                vt.outln('\nThey sail away over the horizon.')
                PC.saveUser(nme, false, true)
                vt.sleep(500)
                return true
            }
            if (!nme.user.ram || (nme.user.cannon && dice(2 * nme.hull / (nme.hull - $.online.hull) + 4) > 1))
                fire(nme, $.online)
            else
                ram(nme, $.online)

            if ($.online.hull < 1) {
                $.online.altered = true
                log(nme.user.id, `\nYou sank ${$.player.handle}'s ship!`)
                $.reason = `sunk by ${nme.user.handle}`
                $.online.hp = 0
                $.online.hull = 0

                let booty = new Coin(Math.round(Math.pow(2, nme.user.hull / 150) * 7937 / 250))
                booty.value = int(booty.value * $.player.cannon)
                if ($.player.coin.value > booty.value)
                    $.player.coin.value = booty.value
                booty.value += $.player.coin.value
                if (booty.value) {
                    log(nme.user.id, `... and you got ${booty.carry(2, true)}.\n`)
                    nme.user.coin.value += booty.value
                    $.player.coin.value = 0
                }
                PC.saveUser(nme, false, true)

                sound('sunk', 30)
                vt.outln(vt.faint, `\n${nme.user.handle} smiles as a shark approaches you.`)
                vt.sleep(6000)
                vt.hangup()
            }
            return ($.online.hull < 1)
        }
    }

    function MonsterHunt() {

        mon = +vt.entry - 1
        sm = Object.assign({}, monsters[mon])
        let damage: number

        profile({ jpg: `naval/${sm.name.toLowerCase()}`, handle: sm.name, effect: 'fadeInUp' })
        vt.outln(`\nYou sail out until you spot${an(sm.name)} on the horizon.\n`)
        vt.outln(`It has ${sm.hull} hull points.`)

        action('ny')
        vt.form = {
            'fight': {
                cb: () => {
                    vt.outln()
                    if (!/Y/i.test(vt.entry)) {
                        menu()
                        return
                    }

                    $.naval--
                    if (dice(100) + $.online.int >= dice(100) + sm.int) {
                        vt.outln('\nYou approach it and quickly open fire.')
                        if (you()) {
                            menu()
                            return
                        }
                        if (it())
                            return
                    }
                    else {
                        vt.outln('\nIt spots you coming and attacks.')
                        if (it()) {
                            menu()
                            return
                        }
                    }

                    action('hunt')
                    vt.focus = 'attack'
                }, prompt: 'Continue (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 20
            },
            'attack': {
                cb: () => {
                    vt.outln()
                    switch (vt.entry.toUpperCase()) {
                        case 'F':
                            if (you() || it()) {
                                menu()
                                return
                            }
                            break

                        case 'S':
                            if (!outrun($.online.hull / sm.hull, $.online.int - sm.int)) {
                                sound('oops')
                                vt.out('\nIt outruns you and stops your retreat!\n')
                                vt.sleep(500)
                                if (it()) {
                                    menu()
                                    return
                                }
                            }
                            else {
                                vt.out('\nYou sail away safely out of range.\n')
                                menu()
                                return
                            }
                            break

                        case 'R':
                            if ($.player.ram) {
                                if (outmaneuvered(sm.int - $.online.int, sm.hull / $.online.hull)) {
                                    vt.outln('\nIt quickly outmaneuvers your ship.')
                                    vt.sleep(400)
                                    vt.out(vt.cyan, 'You yell at your helmsman, "', vt.reset,
                                        ['Not the tail, aim for the beastie\'s head!'
                                            , 'I said starboard, bitch, not port!'
                                            , 'Look alive, or it\'ll be fine dining yer bones!'
                                            , 'Get me my brown pants!'
                                            , 'Whose side are you on anyways?!'][dice(5) - 1]
                                        , vt.cyan, '"\n')
                                    vt.sleep(600)
                                }
                                else {
                                    damage = dice($.player.hull / 2) + dice($.online.hull / 2)
                                    vt.outln(vt.green, '\nYou ram it for '
                                        , vt.bright, `${damage}`
                                        , vt.normal, ` hull points of damage!`)
                                    if ((sm.hull -= damage) < 1) {
                                        booty()
                                        menu()
                                        return
                                    }
                                }
                            }
                            else {
                                sound('oops')
                                vt.outln(`\nYour first mate cries back, "But we don't have a ram!"`)
                                vt.sleep(500)
                            }
                            if (it()) {
                                menu()
                                return
                            }
                            break

                        case 'Y':
                            vt.outln(`\nHull points: ${$.online.hull}`)
                            vt.outln(`Cannons: ${$.player.cannon}`)
                            vt.outln(`Ram: ${$.player.ram ? 'Yes' : 'No'}`)
                            break
                    }
                    vt.refocus()
                }, prompt: vt.attr(bracket('F', false), vt.cyan, 'ire cannons, ', bracket('R', false), vt.cyan, 'am it, '
                    , bracket('S', false), vt.cyan, 'ail off, ', bracket('Y', false), vt.cyan, 'our status: ')
                , cancel: 'S', enter: 'F', eol: false, match: /F|R|S|Y/i, timeout: 20
            }
        }
        vt.focus = 'fight'

        function booty() {
            sm.hull = 0
            sound('booty', 5)
            let coin = new Coin(sm.money)
            coin.value = tradein(coin.value, $.online.cha)
            vt.outln('You get ', coin.carry(), ' for bringing home the carcass.')
            $.player.coin.value += coin.value
            vt.sleep(500)
        }

        function you(): boolean {
            let result = fire($.online, <active>{ hull: sm.hull, user: { id: '', handle: monsters[mon].name, hull: monsters[mon].hull, cannon: 0, ram: monsters[mon].ram } })
            if ((sm.hull -= result.damage) > 0)
                return false

            booty()
            return true
        }

        function it(): boolean {
            let damage = 0

            if (!sm.ram || (dice(sm.shot * sm.hull / (sm.hull - $.online.hull) + 3 * sm.shot) > 1)) {
                for (let i = 0; i < sm.shot; i++)
                    damage += dice(sm.powder) + dice(sm.powder)
                vt.outln('\n', vt.bright, vt.blue, `The ${sm.name} attacks your ship, causing`
                    , vt.cyan, ` ${damage} `, vt.blue, `hull points of damage.\n`)
                vt.sleep(250)
            }
            else
                ram(<active>{ hull: sm.hull, user: { id: '', handle: monsters[mon].name, hull: monsters[mon].hull, cannon: sm.shot, ram: sm.ram } }, $.online)

            if (($.online.hull -= damage) < 1) {
                $.online.altered = true
                $.online.hp = 0
                $.online.hull = 0
                $.player.killed++
                $.reason = `sunk by the ${sm.name}`
                vt.outln(vt.yellow, vt.bright, `The ${sm.name} sank your ship!`)
                sound('bubbles', 15)
                if ($.player.coin.value) {
                    $.player.coin.value = 0
                    vt.outln('It gets all your money!')
                    vt.sleep(500)
                }
                vt.outln()
                return true
            }
            return false
        }
    }

    function fire(a: active, d: active): { hits: number, damage: number, hull: number, cannon: number, ram: boolean } {
        let hits: number = 0
        let damage: number = 0
        let hull: number = 0
        let cannon: number = 0
        let ram: boolean = false

        if (a.user == $.player) sound('fire')
        vt.out('\n', vt.cyan, a.user == $.player ? 'Attacker: ' : 'Defender: ', vt.bright)
        for (let i = 0; i < a.user.cannon && d.user.hull; i++) {
            let n = dice(100)
            n = (n < 66) ? 0 : (n < 96) ? 1 : (n < 100 || !d.user.id) ? 2 : 3
            switch (n) {
                case 3:
                    if (d.user.ram) {
                        ram = true
                        d.user.ram = false
                        vt.beep()
                        vt.out(vt.magenta, '^', -35)
                        break
                    }
                case 2:
                    if (d.user.id) {
                        if (d.user.cannon) {
                            cannon++
                            d.user.cannon--
                            vt.out(vt.green, '@', -30)
                            break
                        }
                    }
                case 1:
                    hits++
                    n = dice(50)
                    damage += n
                    d.hull -= n
                    if (n < 50 || d.user.hull < 1 || !d.user.id) {
                        vt.out(vt.red, '*', -25)
                        break
                    }
                    else {
                        hull += 50
                        d.user.hull -= 50
                        vt.out(vt.yellow, d.user.hull ? '#' : '&', -30)
                        break
                    }
                default:
                    vt.out(vt.blue, '~', -20)
            }
        }

        vt.outln('\n')
        if (a === $.online) {
            vt.out(vt.green, 'You hit ', d.user.id ? 'them' : 'it', ` ${hits} times for`
                , vt.bright, ` ${damage} `, vt.normal
                , `hull points of damage.`, vt.reset)
            if (cannon)
                vt.out(`\nYou also hit ${cannon} of their cannons.`)
            if (hull)
                vt.out(`\nYou also reduced ${hull} hull points off their ship.`)
            if (ram)
                vt.out(`\nYou also hit their ram.`)
        }
        else {
            vt.out(vt.yellow, `They hit you ${hits} times for`
                , vt.bright, ` ${damage} `, vt.normal
                , `hull points of damage.`, vt.reset)
            if (cannon)
                vt.out(`\nThey also hit ${cannon} of your cannons.`)
            if (hull)
                vt.out(`\nThey also reduced ${hull} hull points off your ship.`)
            if (ram)
                vt.out(`\nThey also hit your ram.`)
        }
        vt.outln()
        vt.sleep(250)

        return { hits, damage, hull, cannon, ram }
    }

    //	ram: can he outsmart (+ bigger) avoid your attempt?
    function outmaneuvered(dint: number, dhull: number): boolean {
        dint >>= 2
        const outstmart = 100 + dint
        let bigger = int(100 * dhull)
        return dice(outstmart) + dice(bigger) > 66
    }

    //	sail away: can my ship (+ wit) outrun yours?
    function outrun(dhull: number, dint: number): boolean {
        dint = dint > 0 ? dint >> 1 : 0
        let run = int(50 + (100 * dhull + dint) / 2)
        run = run > 100 ? 100 : run
        return run > dice(100)
    }

    function ram(a: active, d: active) {
        if (a.user.id) vt.out(vt.yellow)
        else vt.out(vt.bright, vt.blue)
        vt.out(`\n${a.user.handle} ${what(a, 'ram')}${PC.who(d).him}for`)

        let damage = dice(a.user.hull / 2) + dice(a.hull / 2)
        if (a.user.id) vt.out(vt.bright)
        else vt.out(vt.cyan)
        vt.out(` ${damage} `)

        if (a.user.id) vt.out(vt.normal)
        else vt.out(vt.blue)
        vt.outln(`hull points of damage!`)
        vt.sleep(500)

        d.hull -= damage
    }

}

export = Naval
