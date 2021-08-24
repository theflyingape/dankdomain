/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  ARENA authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import $ = require('./runtime')
import db = require('../db')
import { Access, Armor, Coin, Magic, Poison, Ring, Weapon } from '../items'
import { bracket, carry, cat, display, getRing, log, news, tradein, vt } from '../lib'
import { PC } from '../pc'
import { arena, elemental } from '../npc'
import { checkXP, input } from '../player'
import { dice, int, romanize, sprintf } from '../sys'
import Battle = require('./battle')

module Arena {

    let main: choices = {
        'U': { description: 'User fights' },
        'M': { description: 'Monster fights' },
        'J': { description: 'Joust users' },
        'C': { description: 'Cast a spell' },
        'P': { description: 'Poison your weapon' },
        'G': { description: 'Goto the square' },
        'Y': { description: 'Your status' }
    }

    export function menu(suppress = true) {
        if (checkXP($.online, menu)) return
        if ($.online.altered) PC.save()
        if ($.reason) vt.hangup()

        elemental.orders('Arena')
        vt.form = {
            'menu': { cb: choice, cancel: 'q', enter: '?', eol: false }
        }

        let hints = ''
        if (!suppress) {
            if ($.online.hp < $.player.hp)
                hints += `> Buy Hit Points!\n`
            if ($.joust)
                hints += `> Try jousting another player to win money.\n`
            if ($.player.poisons.length && !$.online.toWC)
                hints += `> Don't forget to poison your weapon.\n`
            if ($.player.coin.value >= PC.money($.player.level))
                hints += `> Carrying too much money here is not a good idea.  Spend it in the Square\n  or deposit it in the Bank for safer keeping.\n`
        }
        vt.form['menu'].prompt = display('arena', vt.Red, vt.red, suppress, main, hints)
        input('menu')
    }

    function choice() {
        let suppress = false
        let choice = vt.entry.toUpperCase()
        if (main[choice]?.description) {
            vt.out(' - ', main[choice].description)
            suppress = $.player.expert
        }
        vt.outln()

        switch (choice) {
            case 'C':
                if (!$.access.roleplay) break
                Battle.cast($.online, menu)
                return

            case 'G':
                vt.action('clear')
                require('./square').menu($.player.expert)
                return

            case 'J':
                if (!$.joust) {
                    vt.outln('\nYou have run out of jousts.')
                    suppress = true
                    break
                }
                Battle.user('Joust', (opponent: active) => {
                    if (opponent.user.id == '') {
                        menu()
                        return
                    }
                    vt.outln()
                    if (opponent.user.id == $.player.id) {
                        opponent.user.id = ''
                        vt.outln(`You can't joust a wimp like `, $.online.who.him)
                        menu()
                        return
                    }
                    if ($.player.level - opponent.user.level > 3) {
                        vt.outln('You can only joust someone higher or up to three levels below you.')
                        menu(true)
                        return
                    }

                    let ability = PC.jousting($.online)
                    let versus = PC.jousting(opponent)
                    let factor = (100 - ($.player.level > opponent.user.level ? $.player.level : opponent.user.level)) / 10 + 3
                    let jw = 0
                    let jl = 0
                    let pass = 0

                    if (!Access.name[opponent.user.access].roleplay || versus < 1 || opponent.user.level > 1 && (opponent.user.jw + 3 * opponent.user.level) < opponent.user.jl) {
                        vt.outln('That knight is out practicing right now.')
                        menu(true)
                        return
                    }

                    vt.outln('Jousting ability:\n')
                    vt.out(vt.green, vt.bright, sprintf('%-25s', opponent.user.handle), vt.white, sprintf('%4d', versus))
                    if (opponent.user.id == $.ruler.id) vt.out(vt.normal, ' - ', vt.magenta, 'The Crown')
                    vt.outln()
                    vt.outln(vt.green, vt.bright, sprintf('%-25s', $.player.handle), vt.white, sprintf('%4d', ability))
                    vt.outln()
                    if ((ability + factor * $.player.level) < (versus + 1)) {
                        vt.outln(opponent.user.handle, ' laughs rudely in your face!\n')
                        menu(true)
                        return
                    }

                    vt.action('ny')
                    vt.form = {
                        'compete': {
                            cb: () => {
                                vt.outln('\n')
                                if (/Y/i.test(vt.entry)) {
                                    if ($.joust-- > 2) vt.music('joust')
                                    vt.profile({
                                        jpg: 'arena/joust'
                                        , handle: opponent.user.handle
                                        , level: opponent.user.level, pc: opponent.user.pc
                                        , effect: 'slideInLeft'
                                    })
                                    vt.out('The trumpets blare! ', -400, 'You and your opponent ride into the arena. ', -400)
                                    vt.outln(opponent.user.id == $.ruler.id ? '\nThe crowd goes silent.' : 'The crowd roars!', -400)
                                    $.online.altered = true
                                    vt.action('joust')

                                    round()
                                    input('joust', '')
                                    return
                                }
                                menu()
                                return
                            }, prompt: 'Are you sure (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                        },
                        'joust': {
                            cb: () => {
                                vt.outln('\n')
                                if (/F/i.test(vt.entry)) {
                                    log(opponent.user.id, `\n${$.player.handle} forfeited to you in a joust.`)
                                    vt.animated('pulse')
                                    if (opponent.user.id == $.ruler.id) {
                                        vt.sound('cheer')
                                        PC.adjust('cha', 101)
                                        vt.outln('The crowd is delighted by your show of respect to the Crown.', -300)
                                    }
                                    else {
                                        vt.sound('boo')
                                        vt.animated('slideOutRight')
                                        $.player.jl++
                                        db.run(`UPDATE Players set jw=jw+1 WHERE id='${opponent.user.id}'`)
                                        vt.outln('The crowd throws rocks at you as you ride out of the arena.', -300)
                                    }
                                    menu()
                                    return
                                }
                                if (/J/i.test(vt.entry)) {
                                    vt.outln('You spur the horse. ', -200, 'The tension mounts. ', -200)
                                    let result = 0
                                    while (!result)
                                        result = (ability + dice(factor * $.player.level)) - (versus + dice(factor * opponent.user.level))
                                    if (result > 0) {
                                        vt.sound('wall')
                                        vt.animated(['flash', 'jello', 'rubberBand'][jw])
                                        vt.outln(vt.green, '-*>', vt.white, vt.bright, ' Thud! ', vt.normal, vt.green, '<*-  ', vt.reset, 'A hit! ', -100, ' You win this pass!', -100)
                                        if (++jw == 3) {
                                            vt.outln('\nYou have won the joust!')
                                            let reward = new Coin(PC.money(opponent.user.level))
                                            if (opponent.user.id == $.ruler.id) {
                                                vt.sound('boo')
                                                vt.animated('fadeOut')
                                                PC.adjust('cha', -2, -1)
                                                vt.outln('The crowd is furious!', -250)
                                                reward = reward.pick(1)
                                            }
                                            else {
                                                vt.sound('cheer')
                                                vt.animated('hinge')
                                                vt.outln('The crowd cheers!', -250)
                                            }
                                            $.player.coin.value += reward.value
                                            $.player.jw++
                                            if (db.run(`UPDATE Players set jl=jl+1 WHERE id='${opponent.user.id}'`).changes)
                                                log(opponent.user.id, `\n${$.player.handle} beat you in a joust and got ${reward.amount}.`)
                                            vt.outln('You win ', carry(reward), '!', -250)
                                            if ($.player.jw > 14 && $.player.jw / ($.player.jw + $.player.jl) > 0.9) {
                                                let ring = Ring.power([], null, 'joust')
                                                if (Ring.wear($.player.rings, ring.name)) {
                                                    getRing('win', ring.name)
                                                    PC.saveRing(ring.name, $.player.id, $.player.rings)
                                                }
                                            }
                                            menu()
                                            return
                                        }
                                    }
                                    else {
                                        if (Ring.power(opponent.user.rings, $.player.rings, 'joust').power
                                            && !Ring.power($.player.rings, opponent.user.rings, 'joust').power && dice(3) == 1) {
                                            vt.sound('swoosh')
                                            vt.out(vt.magenta, '^>', vt.white, ' SWOOSH ', vt.magenta, '<^  ', vt.reset
                                                , PC.who(opponent).He, 'missed! ', -100, ' You both pass and try again!', -100)
                                            input('joust', '')
                                            return
                                        }

                                        vt.animated(['bounce', 'shake', 'tada'][jl])
                                        vt.sound('oof')
                                        vt.outln(vt.magenta, '^>', vt.bright, vt.white, ' Oof! ', vt.normal, vt.magenta, '<^  ', vt.reset
                                            , PC.who(opponent).He, 'hits! ', -100, ' You lose this pass!', -100)
                                        if (++jl == 3) {
                                            vt.outln('\nYou have lost the joust!')
                                            vt.sound('boo')
                                            vt.outln('The crowd boos you!', -200)
                                            let reward = new Coin(PC.money($.player.level))
                                            $.player.jl++
                                            if (db.run(`UPDATE Players set jw=jw+1,coin=coin+${reward.value} WHERE id='${opponent.user.id}'`).changes)
                                                log(opponent.user.id, `\n${$.player.handle} lost to you in a joust.  You got ${reward.amount}.`)
                                            news(`\tlost to ${opponent.user.handle} in a joust`)
                                            vt.wall($.player.handle, `lost to ${opponent.user.handle} in a joust`)
                                            vt.animated('slideOutRight')
                                            vt.outln(opponent.user.handle, ' spits on your face.', -300)
                                            menu()
                                            return
                                        }
                                    }
                                    round()
                                }
                                input('joust', '')
                            }, prompt: vt.attr('        ', bracket('J', false), vt.yellow, vt.bright, ' Joust', vt.normal, vt.magenta, ' * ', bracket('F', false), vt.yellow, vt.bright, ' Forfeit: '), cancel: 'j', enter: 'J', eol: false, match: /F|J/i
                        }
                    }
                    vt.outln('You grab a horse and prepare yourself to joust.')
                    input('compete', 'y')

                    function round() {
                        vt.out('\n', vt.green, '--=:)) Round ', romanize(++pass), ' of V: Won:', vt.white, vt.bright, jw.toString(), vt.normal, vt.magenta, ' ^', vt.green, ' Lost:', vt.white, vt.bright, jl.toString(), vt.normal, vt.green, ' ((:=--')
                    }
                })
                return

            case 'M':
                if (!$.arena) {
                    vt.outln('\nYou have no more arena fights.')
                    suppress = true
                    break
                }
                vt.action('monster')
                vt.form = {
                    pick: {
                        cb: () => {
                            if (vt.entry.length) {
                                let mon = int(vt.entry)
                                if (! /D/i.test(vt.entry)) {
                                    if (mon < 1 || mon > arena.monsters.length) {
                                        vt.out(' ?? ')
                                        vt.refocus()
                                        return
                                    }
                                    vt.entry = mon.toString()
                                }
                                vt.outln()
                                if (!MonsterFights())
                                    menu()
                            }
                            else {
                                vt.outln()
                                menu()
                            }
                        }
                        , prompt: 'Fight what monster (' + vt.attr(vt.white, '1-' + arena.monsters.length, vt.cyan, ', ', bracket('D', false), vt.cyan, 'emon)? ')
                        , min: 0, max: 2
                    }
                }
                input('pick')
                return

            case 'P':
                if (!$.access.roleplay) break
                Battle.poison($.online, menu)
                return

            case 'Q':
                require('./menu').menu($.player.expert)
                return

            case 'U':
                if (!$.arena) {
                    vt.outln('\nYou have no more arena fights.')
                    suppress = true
                    break
                }
                Battle.user('Fight', (opponent: active) => {
                    if (opponent.user.id == '') {
                        menu()
                        return
                    }
                    if (opponent.user.id == $.player.id) {
                        opponent.user.id = ''
                        vt.outln(`\nYou can't fight a wimp like `, PC.who(opponent).him)
                        menu()
                        return
                    }
                    if ($.player.level - opponent.user.level > 3) {
                        vt.outln('\nYou can only fight someone higher or up to three levels below you.')
                        menu()
                        return
                    }

                    cat('player/' + opponent.user.pc.toLowerCase())
                    vt.out(opponent.user.handle, ' ')

                    if (opponent.user.status.length) {
                        vt.out('was defeated by ')
                        let rpc: active = { user: { id: opponent.user.status } }
                        if (PC.load(rpc))
                            vt.out(rpc.user.handle, vt.cyan, ' (', vt.bright, vt.white, opponent.user.xplevel.toString(), vt.normal, vt.cyan, ')')
                        else
                            vt.out(opponent.user.status)
                        vt.outln()
                        menu()
                        return
                    }
                    vt.out(`is a level ${opponent.user.level} ${opponent.user.pc}`)
                    if ($.player.emulation == 'XT') vt.out(' ', opponent.pc.color || vt.white, opponent.pc.unicode, vt.reset)
                    if (opponent.user.level !== opponent.user.xplevel)
                        vt.out(' ', bracket(opponent.user.xplevel, false))
                    vt.outln()

                    if ($.player.novice && !opponent.user.novice) {
                        vt.outln('You are allowed only to fight other novices.')
                        menu()
                        return
                    }

                    if (!Access.name[opponent.user.access].roleplay) {
                        vt.outln('You are allowed only to fight other players.')
                        if (opponent.user.id[0] == '_') {
                            PC.adjust('cha', -2, -1)
                            $.player.coward = true
                            $.online.altered = true
                        }
                        menu()
                        return
                    }

                    if (!$.player.novice && opponent.user.novice) {
                        vt.outln('You are not allowed to fight novices.')
                        menu()
                        return
                    }

                    if (!db.lock(opponent.user.id)) {
                        vt.beep()
                        vt.outln(vt.cyan, vt.faint, `${PC.who(opponent).He}is currently engaged elsewhere and not available.`)
                        menu()
                        return
                    }

                    PC.wearing(opponent)

                    vt.action('ny')
                    vt.form = {
                        'fight': {
                            cb: () => {
                                vt.outln()
                                if (/Y/i.test(vt.entry)) {
                                    if (PC.activate(opponent, true)) {
                                        vt.music('combat' + $.arena--)
                                        Battle.engage('User', $.online, opponent, menu)
                                    }
                                    else {
                                        db.unlock($.player.id, true)
                                        menu($.player.expert)
                                    }
                                }
                                else
                                    menu($.player.expert)
                            }, prompt: `Will you fight ${PC.who(opponent).him}(Y/N)? `, cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                        }
                    }
                    input('fight', 'y')
                })
                return

            case 'Y':
                vt.outln()
                Battle.yourstats()
                suppress = true
                break
        }
        menu(suppress)
    }

    function MonsterFights(): boolean {

        let cost: Coin
        let monster: active

        vt.action('clear')
        if (/D/i.test(vt.entry)) {
            if ($.player.level < 50) {
                vt.outln('\nYou are not powerful enough to fight demons yet.  Go fight some monsters.')
                return
            }

            cost = new Coin(PC.money($.player.level)).pick(1)

            vt.outln('\nThe ancient necromancer will summon you a demon for ', carry(cost))
            if ($.player.coin.value < cost.value) {
                vt.outln(`You don't have enough!`)
                return
            }

            vt.action('yn')
            vt.form = {
                'pay': {
                    cb: () => {
                        vt.outln('\n')
                        if (/Y/i.test(vt.entry)) {
                            $.player.coin.value -= cost.value
                            $.online.altered = true
                            vt.outln('As you hand him the money, ', -200, 'it disappears into thin air ... ', -1000, '\n')

                            monster = { user: db.fillUser('summoned demon') }
                            let l = $.player.level + 2
                            if (l >= $.sysop.immortal)
                                l = $.sysop.immortal - 2
                            if ((monster.user.level = l + dice(7) - 4) > 99)
                                monster.user.level = 99
                            cost.value += tradein(PC.money(monster.user.level))

                            let n = int(Weapon.merchant.length * $.player.level / 110)
                            n = n >= Weapon.merchant.length ? Weapon.merchant.length - 1 : n
                            monster.user.weapon = n + 3
                            cost.value += tradein(new Coin(Weapon.name[Weapon.merchant[n]].value).value)

                            n = int(Armor.merchant.length * $.player.level / 110)
                            n = n >= Armor.merchant.length ? Armor.merchant.length - 1 : n
                            monster.user.armor = n + 2
                            cost.value += tradein(new Coin(Armor.name[Armor.merchant[n]].value).value)

                            monster.user = PC.reroll(monster.user
                                , (dice(($.online.int + $.online.cha) / 50) > 1) ? monster.user.pc : PC.random('monster')
                                , monster.user.level)

                            monster.user.spells = [7, 9]
                            if (monster.user.magic) {
                                for (let i = 0; i < Object.keys(Magic.spells).length; i++) {
                                    if (dice(($.player.cha >> 2) + 5 * i + $.player.level - monster.user.level) <= monster.user.magic) {
                                        let spell = Magic.pick(i)
                                        if (!Magic.have(monster.user.spells, spell))
                                            Magic.add(monster.user.spells, i)
                                    }
                                }
                            }
                            if (monster.user.poison) {
                                for (let i = 0; i < Object.keys(Poison.vials).length; i++) {
                                    if (dice(($.player.cha >> 2) + 5 * i + $.player.level - monster.user.level) <= monster.user.poison) {
                                        let vial = Poison.pick(i)
                                        if (!Poison.have(monster.user.poisons, vial))
                                            Poison.add(monster.user.poisons, i)
                                    }
                                }
                            }

                            PC.activate(monster)
                            monster.user.coin.value += cost.value

                            vt.profile({
                                jpg: 'arena/' + monster.user.handle.toLowerCase()
                                , handle: `${monster.user.handle}`, level: monster.user.level, pc: 'contest'
                                , effect: 'jello'
                            })
                            cat('arena/' + monster.user.handle)

                            vt.outln(`The old necromancer summons you a level ${monster.user.level} creature.`)
                            PC.wearing(monster)

                            vt.action('ny')
                            input('fight', 'y')
                            return
                        }
                        vt.outln(vt.cyan, 'His eyes glow ', vt.red, vt.bright, 'red', vt.normal
                            , vt.cyan, ' and says, "', vt.white, vt.bright, `I don't make deals!`, vt.normal, vt.cyan, '"')
                        menu()
                    }, prompt: 'Will you pay (Y/N)? ', cancel: 'N', enter: 'Y', eol: false, match: /Y|N/i, max: 1, timeout: 10
                },
                'fight': {
                    cb: () => {
                        vt.outln()
                        if (/Y/i.test(vt.entry)) {
                            vt.music('combat' + $.arena--)
                            Battle.engage('Monster', $.online, monster, menu)
                        }
                        else {
                            vt.animated('fadeOut')
                            menu()
                        }
                    }, prompt: 'Fight this demon (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 30
                }
            }
            input('pay', 'y')
        }
        else {
            let mon = int(vt.entry) - 1
            if (mon == arena.monsters.length - 1) vt.sound('demogorgon')
            monster = { user: { id: '', handle: arena.monsters[mon].name, sex: 'I' } }
            monster.user = PC.reroll(monster.user, arena.monsters[mon].pc, arena.monsters[mon].level)
            monster.user.weapon = arena.monsters[mon].weapon
            monster.user.armor = arena.monsters[mon].armor
            monster.user.rings = arena.monsters[mon].rings || []
            monster.user.spells = []
            if (arena.monsters[mon].spells)
                for (let i = 0; i < arena.monsters[mon].spells.length; i++)
                    Magic.add(monster.user.spells, arena.monsters[mon].spells[i])

            PC.activate(monster)
            if (arena.monsters[mon].adept) monster.adept = int(arena.monsters[mon].adept)
            monster.user.coin.amount = arena.monsters[mon].money

            cat('arena/' + monster.user.handle.toLowerCase())
            vt.profile({
                jpg: 'arena/' + monster.user.handle.toLowerCase()
                , handle: `#${mon + 1} - ${monster.user.handle}`
                , level: monster.user.level, pc: monster.user.pc.toLowerCase()
                , effect: arena.monsters[mon].effect || 'fadeIn'
            })

            vt.out(`The ${monster.user.handle} is a level ${monster.user.level} ${monster.user.pc}`)
            if ($.player.emulation == 'XT') vt.out(' ', monster.pc.color || vt.white, monster.pc.unicode)
            vt.outln()
            PC.wearing(monster)

            vt.action('ny')
            vt.form = {
                'fight': {
                    cb: () => {
                        vt.outln()
                        if (/Y/i.test(vt.entry)) {
                            if (mon == arena.monsters.length - 1)
                                vt.music('boss' + $.arena--)
                            else
                                vt.music('combat' + $.arena--)
                            Battle.engage('Monster', $.online, monster, menu)
                        }
                        else {
                            vt.animated('fadeOut')
                            menu()
                        }
                    }, prompt: 'Will you fight it (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                }
            }
            input('fight', 'y')
        }

        return true
    }

}

export = Arena
