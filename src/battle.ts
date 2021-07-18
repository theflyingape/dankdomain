/*****************************************************************************\
 *  : the return of Hack & Slash                                  *
 *  BATTLE authored by: Robert Hurst <theflyingape@gmail.com>                *
\*****************************************************************************/

import $ = require('./runtime')
import db = require('./db')
import { Access, Armor, Magic, Poison, Ring, Weapon } from './items'
import { armor, bracket, buff, Coin, death, getRing, log, news, rings, tradein, vt, weapon } from './lib'
import { elemental } from './npc'
import { Deed, PC } from './pc'
import { checkXP, input } from './player'
import { an, cuss, date2full, dice, fs, int, money, pathTo, sprintf, titlecase, whole } from './sys'

module Battle {

    export let expel: boolean
    export let retreat: boolean
    export let teleported: boolean

    let fini: Function
    let gang: gang = {
        name: '',
        members: [], handles: [], genders: [], melee: [], status: [], validated: [],
        win: 0, loss: 0, banner: 0, trim: 0, back: 0, fore: 0
    }
    let parties: [active[], active[]]
    let alive: number[]
    let p1: who, p2: who
    let round: { party: number, member: number, react: number }[] = []
    let bs: number
    let dodge: number
    let volley: number

    function end() {
        round = []
        db.unlock($.player.id, true)

        if (Ring.power([], $.player.rings, 'buff').power) {
            if ($.online.toAC < 0) $.online.toAC++
            if ($.online.toWC < 0) $.online.toWC++
        }
        else {
            //  diminish any temporary buff
            if ($.online.toAC > 0) $.online.toAC--
            if ($.online.toWC > 0) $.online.toWC--
        }

        if ($.from == 'Merchant') {
            if ($.online.hp < 1) {
                $.player.coin.value = 0
                death($.reason || `refused ${$.dwarf.user.handle}`)
                vt.outln('  ', vt.yellow, vt.bright, `"Next time bring friends."`)
                vt.sound('punk', 8)
            }
            else {
                news(`\tdefeated ${$.dwarf.user.handle}`)
                vt.wall($.player.handle, `defeated ${$.dwarf.user.handle}`)
                $.player.coward = false
            }
        }

        if ($.from == 'Naval') {
            if ($.online.hp > 0) {
                vt.sound('naval' + (parties[1][0].user.id == '_OLD' ? '_f' : ''), 32)
                PC.adjust('str', 102, 1, 1)
                PC.adjust('int', 102, 1, 1)
                PC.adjust('dex', 102, 1, 1)
                PC.adjust('cha', 102, 1, 1)
                const msg = `survived ${$.online.who.his} chance encounter with ${parties[1][0].user.handle}`
                news(`\t${msg}`)
                vt.wall($.player.handle, msg)
            }
            else {
                PC.adjust('str', -2, -1, -1)
                PC.adjust('int', -2, -1, -1)
                PC.adjust('dex', -2, -1, -1)
                PC.adjust('cha', -2, -1, -1)
            }
            $.player.coin.value = 0
            vt.beep()
            Battle.yourstats()
        }

        if ($.from == 'Tavern') {
            const mantle = pathTo('files/tavern', 'trophy.json')
            if ($.online.hp < 1) {
                vt.outln(`He picks up your ${weapon()} and triumphantly waves it around to`)
                vt.out(`the cheering crowd. `, -1600, ` He struts toward the mantelpiece `, -600)
                if ($.online.weapon.wc > $.barkeep.weapon.wc) {
                    let trophy = { who: $.player.id, weapon: $.player.weapon }
                    fs.writeFileSync(pathTo(mantle), JSON.stringify(trophy))
                    vt.outln(`and hangs his new trophy.`)
                }
                else
                    vt.outln(`and burns it!`, -600, 'Heh.')
                Weapon.equip($.online, Weapon.merchant[0])
                PC.save()
                $.reason = `schooled by ${$.barkeep.user.handle}`
                //  go crazy!
                vt.sound('winner', 32)
                $.player.coin.value = 0
                vt.outln('\n  ', vt.green, vt.bright, `"Drinks are on the house!"`, -2250)
            }
            else {
                vt.music('barkeep')
                news(`\tdefeated ${$.barkeep.user.handle}`)
                vt.wall($.player.handle, `defeated ${$.barkeep.user.handle}`)

                let trophy = JSON.parse(fs.readFileSync(mantle).toString())
                Weapon.equip($.barkeep, trophy.weapon)
                let credit = new Coin($.barkeep.weapon.value)
                credit.value = tradein(credit.value, $.online.cha)
                let result = Weapon.swap($.online, $.barkeep, credit)
                if (typeof result == 'boolean' && result) {
                    vt.outln('You also take his trophy, ', weapon(), -600)
                    fs.writeFileSync(pathTo('files/tavern', 'trophy.json'), JSON.stringify({ "who": "_TAX", "weapon": "Needle" }))
                }
                //  no entertainment
                vt.sound('ko', 12)
                if ($.player.cha > 49) PC.adjust('cha', -22, -20, -2)
                $.player.coward = false
            }
        }

        if (/Gates|Taxman/.test($.from)) {
            if ($.online.hp < 1) {
                $.player.coin.value -= $.taxman.user.coin.value
                if ($.player.coin.value < 0) {
                    $.player.bank.value += $.player.coin.value
                    $.player.coin.value = 0
                    if ($.player.bank.value < 0) {
                        $.player.loan.value -= $.player.bank.value
                        $.player.bank.value = 0
                    }
                }
                vt.beep()
                death($.reason || 'tax evasion')
                vt.outln('  ', vt.blue, vt.bright, `"Thanks for the taxes!"`)
                vt.sound('thief2', 16)
            }
            else {
                if ($.from == 'Taxman') {
                    news(`\tdefeated ${$.taxman.user.handle}`)
                    vt.wall($.player.handle, `defeated ${$.taxman.user.handle}`)
                }
                $.player.coward = false
            }
        }

        if ($.from == 'Witch') {
            if ($.online.hp < 1) {
                $.player.coin.value = 0
                death($.reason || `refused ${$.witch.user.handle}`)
                vt.outln('  ', vt.green, vt.bright, `"Hell hath no fury like a woman scorned."`)
                vt.sound('crone', 30)
            }
            else {
                vt.animated('hinge')
                vt.sound('naval_f', 25)
                news(`\tdefeated ${$.witch.user.handle}`)
                vt.wall($.player.handle, `defeated ${$.witch.user.handle}`)
                $.player.coward = false
                $.sorceress = 0
            }
        }

        if ($.from == 'User') {
            let opponent = parties[1][0]
            if (!(opponent.user.id[0] == '_' || opponent.user.gender == 'I')) {
                PC.save(opponent, false, true)
                if ($.player.hp > 0 && opponent.hp == 0) {
                    vt.action('ny')
                    vt.form = {
                        'yn': {
                            cb: () => {
                                if (/Y/i.test(vt.entry)) {
                                    vt.action('freetext')
                                    input('message', 'just passing gas...')
                                }
                                else {
                                    vt.outln()
                                    fini()
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
                                    log(opponent.user.id, `... and says,`)
                                    log(opponent.user.id, `"${vt.entry}"`)
                                }
                                fini()
                            }, prompt: '>', max: 78
                        }
                    }
                    vt.form['yn'].prompt = `Leave ${opponent.who.him}a message (Y/N)? `
                    input('yn', 'y')
                    return
                }
            }
        }

        fini()
    }

    //  start a new battle engagement:
    //    do rounds: attack() with possibly backstab or poison
    //       per member: next() for cast, melee, or retreat
    //    until spoils()
    export function engage(menu: string, party: active | active[], mob: active | active[], cb: Function) {

        //  process parameters
        $.from = menu

        let a: active[], b: active[]
        if (Array.isArray(party))
            a = <active[]>party
        else
            a = new Array(<active>party)

        if (Array.isArray(mob))
            b = <active[]>mob
        else
            b = new Array(<active>mob)

        parties = [a, b]
        fini = cb

        //  initialize for first encounter in engagement
        alive = [parties[0].length, parties[1].length]
        round = []
        expel = false
        retreat = false
        teleported = false
        volley = 0
        dodge = 0

        attack()
    }

    //  new round of volleys
    export function attack(retry = false) {
        //  no more attacking
        if (retreat || teleported || ++volley > 12345) {
            if (volley > 12345 && !retreat) {
                retreat = true
                $.player.coward = true
            }
            if ($.online.confused)
                PC.activate($.online, false, true)
            end()
            return
        }

        if (!round.length) {
            if (volley > 1) {
                vt.outln($.online.hp > 0 ? -80 : -800)
                vt.outln('    -=', bracket('*', false), '=-')
            }

            for (let p in parties) {
                for (let m in parties[p]) {
                    if (parties[p][m].hp > 0) {
                        let rpc = parties[p][m]
                        let x = 11 - rpc.user.backstab - Ring.power([], rpc.user.rings, 'initiate').power
                        x -= rpc.user.steal - Ring.power([], rpc.user.rings, 'steal').power
                        let s = dice(rpc.user.level / x) + int(rpc.dex / 2) + dice(rpc.dex / 2)
                        round.push({ party: +p, member: +m, react: +s })
                    }
                }
            }
            round.sort((n1, n2) => n2.react - n1.react)
        }

        let n = round[0]
        let enemy: active
        let rpc = parties[n.party][n.member]
        if (rpc.hp < 1 || rpc.user.xplevel < 1) {
            next()
            return
        }

        //  recovery?
        if (rpc.confused) {
            PC.adjust('int', rpc.pc.toInt, 0, 0, rpc)
            PC.adjust('dex', rpc.pc.toDex, 0, 0, rpc)
        }

        //  choose an opponent
        let mob = n.party ^ 1
        let nme: number
        do { nme = dice(parties[mob].length) - 1 } while (parties[mob][nme].hp < 1)
        enemy = parties[mob][nme]
        if (volley == 1 && rpc !== $.online) vt.outln()
        p1 = PC.who(rpc, alive[n.party] > 1)
        p2 = PC.who(enemy, alive[mob] > 1)

        //  a frozen treat?
        if (!enemy.confused) {
            let speed = 0
            //  by supernatural means
            let skip = Ring.power(rpc.user.rings, enemy.user.rings, 'skip', 'pc', rpc.user.pc)
            if (skip.power && dice(12 + 2 * rpc.user.magic + dodge) > dice(enemy.user.magic / 2 + 2))
                skip.power = 0  //  saving throw
            else {
                dodge += 2
                speed = -250
            }
            //  if not, by skillful escape means
            if (!skip.power
                //  d[15-25] > 3-14, 73 to 46% diminishing win-rate, allow for the smallest 6% win for a lesser escaping a greater
                && dice(enemy.user.level / 9 + 15) > int(rpc.user.level / 9 + 3)
                //  d[22-32] > 11-21, coin-flip typical, true: 5% min - 66% max
                && dice((enemy.dex > 90 ? enemy.dex - 89 : 1) + 21) > ((rpc.dex > 90 ? rpc.dex - 89 : 1) + 10)
                //  d[0-8(+rings)] + 2 > 2d[6], true min 3%,
                //  max chance to be true for lawful: 3%, desperate: 6%, trickster: 17%, adept: 67%, master: 92%
                && dice(2 * (enemy.user.steal + Ring.power(rpc.user.rings, enemy.user.rings, 'steal').power))
                > (dice(6) + dice(6) - 2)) {
                skip.power = 1
                speed = +100
            }
            if (skip.power) {
                let how = enemy.pc.skip || 'kiss', color = enemy.pc.color || vt.white
                let w = how.split(' ')
                if (w.length > 1) w.push('')
                vt.outln(vt.faint, color, `${$.player.emulation == 'XT' ? '≫' : '>>'} `, vt.normal
                    , p2.You, vt.bright, PC.what(enemy, w[0]), w.slice(1).join(' ')
                    , vt.normal, p1.you, vt.faint, color, ` ${$.player.emulation == 'XT' ? '≪' : '<<'}`
                    , speed - 500)
                next()
                return
            }
        }

        if (rpc === $.online) {
            vt.action('battle')
            vt.form = {
                'attack': {
                    cb: () => {
                        vt.outln()
                        if (/C/i.test(vt.entry)) {
                            cast($.online, next, enemy)
                            return
                        }

                        vt.outln()
                        if (/R/i.test(vt.entry)) {
                            if (/Merchant|Naval|Tavern|Taxman/.test($.from)) {
                                vt.out('  ')
                                if ($.from == 'Merchant')
                                    vt.outln(vt.bright, vt.yellow, `"You should've accepted my kind offer, ${$.player.pc}."`)
                                if ($.from == 'Naval')
                                    vt.outln(vt.bright, vt.cyan, '"You cannot escape me, mortal."')
                                if ($.from == 'Tavern')
                                    vt.outln(vt.bright, vt.green, 'You try to escape, but the crowd throws you back to witness the slaughter!')
                                if ($.from == 'Taxman')
                                    vt.outln(vt.bright, vt.blue, '"You can never escape the taxman!"')
                                vt.sound({ _BAR: 'growl', _DM: 'punk', _NEP: 'thunder', _OLD: 'crone', _TAX: 'thief2' }[enemy.user.id], 12)
                                PC.adjust('cha', -2, -1)
                                PC.save()
                                next()
                                return
                            }
                            let trip = rpc.dex + dice(rpc.int) / 2
                            trip += Math.round((rpc.dex - enemy.dex) / 2)
                            trip = trip < 5 ? 5 : trip > 95 ? 95 : trip
                            trip += 5 * (alive[0] - alive[1])
                            trip = trip < 5 ? 5 : trip > 95 ? 95 : trip
                            if (dice(100) > trip) {
                                vt.beep()
                                let who = (enemy.user.gender == 'I' ? 'The ' : '') + enemy.user.handle
                                vt.outln(vt.cyan, [
                                    'You trip and fail in your attempt to retreat.',
                                    `${who} pulls you back into the battle.`,
                                    `${who} prevents your retreat and shouts,\n ${vt.attr(vt.cyan, vt.bright, '"I\'m not through with you yet!"')}`,
                                    `${who} outmaneuvers you and says,\n ${vt.attr(vt.normal, '"You started this, I\'m finishing it."')}`,
                                    `${who} blocks your path and whispers,\n ${vt.attr(vt.faint, '"Where do you want to go today?"')}`,
                                ][dice(5) - 1], '\n', -250)
                                next()
                                return
                            }

                            retreat = true
                            $.player.retreats++
                            let who = $.player.gender == 'F' ? 'She' : 'He'
                            vt.outln(vt.blue, vt.bright, [
                                'You are successful in your attempt to retreat.',
                                'You limp away from the battle.',
                                `You decide this isn't worth the effort.`,
                                `You listen to that voice in your head, ${vt.attr(vt.red)}"Run."`,
                                `You shout back, ${vt.attr(vt.cyan)}"${who} who fights and runs away lives to fight another day!"`
                            ][dice(5) - 1], -250)
                            if ($.online.confused)
                                PC.activate($.online, false, true)
                            if ($.from == 'Party' && $.player.gang) {
                                if (enemy.user.gender !== 'I') $.player.coward = true
                                db.run(`UPDATE Gangs SET loss=loss+1 WHERE name='${$.player.gang}'`)
                            }
                            if ($.from == 'User' && enemy.user.gender !== 'I') {
                                PC.adjust('cha', -2, -1)
                                log(enemy.user.id, `\n${$.player.handle}, the coward, retreated from you.`)
                            }
                            end()
                            return
                        }

                        if (/Y/i.test(vt.entry)) {
                            yourstats(false)
                            volley += 500
                            vt.refocus()
                            return
                        }

                        vt.out(vt.bright)
                        melee(rpc, enemy)
                        next()
                        return
                    }, cancel: 'R', enter: 'A', eol: false, max: 1, match: /A|C|R|Y/i, timeout: 30
                },
                'backstab': {
                    cb: () => {
                        if (/N/i.test(vt.entry)) bs = 1
                        vt.outln('\n')
                        vt.out(vt.bright)
                        melee(rpc, enemy, bs)
                        next()
                        return
                    }, cancel: 'N', enter: 'Y', eol: false, match: /Y|N/i, max: 1, timeout: 30
                },
            }

            //  sneaking
            if (volley == 1) {
                vt.drain()
                bs = $.player.backstab
                let roll = dice(100 + bs * $.player.level / (2 * ($.player.melee + 2)))
                roll += 2 * Ring.power(enemy.user.rings, $.player.rings, 'initiate').power
                bs += (roll < bs) ? -1 : (roll > 99) ? +1 : 0
                do {
                    roll = dice(100 + bs * $.player.backstab)
                    bs += (roll == 1) ? -1 : (roll > 99) ? dice($.player.backstab) : 0
                } while (roll == 1 || roll > 99)
                if (bs > 1) {
                    vt.action('yn')
                    vt.form['backstab'].prompt = 'Attempt to backstab'
                        + (bs > 2 && bs != $.player.backstab ? ' for ' + vt.attr(vt.cyan, vt.bright, bs.toString(), vt.faint, 'x', vt.normal) : '')
                        + ' (Y/N)? '
                    input('backstab', $.online.dex > (70 - $.player.melee) || enemy.hp > $.player.hp ? 'y' : 'n', 300)
                    return
                }
                else {
                    vt.outln()
                    vt.out(vt.bright)
                }
                melee(rpc, enemy)
            }
            else {
                if ($.online.hp - 2 < 2 * $.player.level) {
                    vt.sound('weak', 8)
                    vt.drain()
                }
                let choices = vt.attr(vt.reset, vt.blue, '[')
                choices += vt.attr(vt.bright
                    , $.online.hp > $.player.hp * 2 / 3 ? vt.green
                        : $.online.hp > $.player.hp / 3 ? vt.yellow
                            : vt.red
                    , $.online.hp.toString()
                    , vt.normal, vt.cyan, ',', vt.bright
                    , enemy.hp > enemy.user.hp * 2 / 3 ? vt.green
                        : enemy.hp > enemy.user.hp / 3 ? vt.yellow
                            : vt.red
                )
                if ($.online.int < 100) {
                    let i = (100 - $.online.int) + 1
                    let est = Math.round(enemy.hp / i)
                    est *= i
                    if ($.online.int < 50 || est == 0)
                        choices += enemy.hp > enemy.user.hp * 2 / 3 ? 'Healthy'
                            : enemy.hp > enemy.user.hp / 3 ? 'Hurting'
                                : 'Weak'
                    else
                        choices += '~' + est.toString()
                }
                else
                    choices += enemy.hp.toString()
                choices += vt.attr(vt.normal, vt.blue, '] ')
                bs = 1

                vt.form['attack'].prompt = choices
                vt.form['attack'].prompt += vt.attr(bracket('A', false), vt.cyan, 'ttack, ')
                if ($.player.magic && $.player.spells.length)
                    vt.form['attack'].prompt += vt.attr(bracket('C', false), vt.cyan, 'ast spell, ')
                vt.form['attack'].prompt += vt.attr(bracket('R', false), vt.cyan, 'etreat, '
                    , bracket('Y', false), vt.cyan, 'our status: ')

                if ($.access.bot) {
                    if ($.online.hp < int($.player.hp / 9) + $.player.level && dice($.player.melee / 2 + $.player.steal / 2) == 1)
                        elemental.flush('r')
                    else
                        elemental.flush('a')
                }
                input('attack')
                return
            }
        }
        else {  //  NPC
            if (volley == 1 && dice((100 - rpc.user.level) / 12 + 6) < rpc.user.poison)
                poison(rpc)

            //  might or magic?
            let mm: number = 0
            let odds: number = ($.from == 'Party' ? 6 : $.from == 'Dungeon' ? 5 : 4) - int(+enemy.user.coward)
            let roll: number = odds + int(rpc.user.magic / 2) + rpc.adept + 1
            if (rpc.user.level > enemy.user.level)
                roll += Math.round((rpc.user.level - enemy.user.level) / 4)
            if (roll / odds > odds) roll = odds * odds

            if (rpc.user.magic == 1 && dice(roll) > odds) {
                if ((Magic.have(rpc.user.spells, 8)
                    && rpc.hp < rpc.user.hp / (rpc.user.level / (11 - rpc.adept) + 1)
                    && (dice(6 - rpc.adept) == 1 || rpc.user.coward))
                    || (Ring.power(enemy.user.rings, rpc.user.rings, 'teleport', 'pc', rpc.user.pc).power
                        && rpc.hp < rpc.user.hp / 5))
                    mm = 8
                else if (Magic.have(rpc.user.spells, 7)
                    && rpc.hp < int(rpc.user.hp / 2)
                    && dice(enemy.user.melee + 2) > 1)
                    mm = 7
                else if (Magic.have(rpc.user.spells, 9)
                    && (!rpc.user.id || rpc.hp < int(rpc.user.hp / 2))
                    && dice(enemy.user.melee + 2) > 1)
                    mm = 9
                else if (Magic.have(rpc.user.spells, 13)
                    && rpc.hp < (rpc.user.hp / 6)
                    && dice((rpc.user.level - enemy.user.level) / 6 + odds - rpc.adept) == 1)
                    mm = 13
                else if (!rpc.confused && rpc.hp > int(rpc.user.hp / 2)) {
                    if (Magic.have(rpc.user.spells, 11)
                        && dice(enemy.user.magic + rpc.adept) > 1)
                        mm = 11
                    else if (Magic.have(rpc.user.spells, 12)
                        && dice((rpc.user.level - enemy.user.level) / 6 + odds - rpc.adept) == 1)
                        mm = 12
                    else if (Magic.have(rpc.user.spells, 14)
                        && dice((rpc.user.level - enemy.user.level) / 6 + odds - rpc.adept) == 1)
                        mm = 14
                    else if (Magic.have(rpc.user.spells, 15)
                        && dice((rpc.user.level - enemy.user.level) / 6 + odds - rpc.adept) == 1)
                        mm = 15
                    else if (Magic.have(rpc.user.spells, 16)
                        && rpc.hp == rpc.user.hp
                        && dice((rpc.user.level - enemy.user.level) / 6 + odds - rpc.adept) == 1)
                        mm = 16
                }
            }
            if (rpc.user.magic > 1 && dice(roll) > odds) {
                if (!rpc.confused || rpc.hp < (rpc.user.hp / 6)) {
                    if (Magic.have(rpc.user.spells, 15)
                        && rpc.sp >= Magic.power(rpc, 15)
                        && dice((rpc.user.level - enemy.user.level) / 6 + odds - rpc.adept) == 1)
                        mm = 15
                    else if (Magic.have(rpc.user.spells, 16)
                        && rpc.sp >= Magic.power(rpc, 16)
                        && rpc.hp > int(rpc.user.hp / 2)
                        && dice((rpc.user.level - enemy.user.level) / 6 + odds - rpc.adept) == 1)
                        mm = 16
                    else if (Magic.have(rpc.user.spells, 11)
                        && rpc.sp >= Magic.power(rpc, 11)
                        && dice(6 - enemy.user.magic) == 1)
                        mm = 11
                    else if (Magic.have(rpc.user.spells, 14)
                        && rpc.sp >= Magic.power(rpc, 14)
                        && dice((rpc.user.level - enemy.user.level) / 6 + odds) == 1)
                        mm = 14
                    else if (Magic.have(rpc.user.spells, 12)
                        && rpc.sp >= Magic.power(rpc, 12)
                        && dice((rpc.user.level - enemy.user.level) / 6 + odds) == 1)
                        mm = 12
                }
                if (!rpc.confused || !mm) {
                    if (Magic.have(rpc.user.spells, 13)
                        && rpc.sp >= Magic.power(rpc, 13)
                        && rpc.hp < (rpc.user.hp / 5))
                        mm = 13
                    else if ((Magic.have(rpc.user.spells, 8)
                        && rpc.sp >= Magic.power(rpc, 8)
                        && rpc.hp < rpc.user.hp / (rpc.user.level / (11 - rpc.adept) + 1)
                        && (dice(5 - rpc.adept) == 1 || rpc.user.coward))
                        || (Ring.power(enemy.user.rings, rpc.user.rings, 'teleport', 'pc', rpc.user.pc).power
                            && rpc.hp < rpc.user.hp / 4))
                        mm = 8
                    else if (Magic.have(rpc.user.spells, 7)
                        && rpc.sp >= Magic.power(rpc, 7)
                        && rpc.hp < int(rpc.user.hp / 2)
                        && (dice(enemy.user.melee + 2) == 1 || rpc.sp < Magic.power(rpc, 8)))
                        mm = 7
                    else if (!rpc.confused && Magic.have(rpc.user.spells, 9)
                        && rpc.sp >= Magic.power(rpc, 9)
                        && dice(enemy.user.melee + 2) > 1)
                        mm = 9
                }
            }
            //  if regular magic is not on the menu, perhaps an extended spell is warranted?
            if (rpc.user.magic && !mm && dice(odds - rpc.adept) == 1) {
                odds = dice(8) + 16
                if (odds < 23 || volley < 5)
                    if (Magic.have(rpc.user.spells, odds)
                        && rpc.sp >= Magic.power(rpc, odds))
                        mm = odds
            }

            vt.out(vt.reset)

            if (mm) {
                cast(rpc, next, enemy, mm)
                return
            }
            else
                melee(rpc, enemy)
        }

        next()

        function next(retry = false) {
            if (retry) {
                attack(retry)
                return
            }
            round.shift()

            //  was opponent defeated?
            if (typeof enemy !== 'undefined' && enemy.hp < 1) {
                if (enemy === $.online) {
                    enemy.hp = 0    // killed
                    if ($.from !== 'Party') {
                        vt.outln('\n', vt.yellow, vt.bright, rpc.user.gender == 'I' ? 'The ' : ''
                            , rpc.user.handle, ' killed you!')
                        death($.reason || (rpc.user.id.length
                            ? `defeated by ${rpc.user.handle}`
                            : `defeated by a level ${rpc.user.level} ${rpc.user.handle}`), true)
                    }
                }
                else {
                    if (rpc === $.online) {
                        if (!expel) {
                            enemy.hp = 0    // killed
                            $.player.kills++
                            if ($.from !== 'Party') {
                                vt.outln('You ', enemy.user.xplevel < 1 ? 'eliminated' : 'killed'
                                    , enemy.user.gender == 'I' ? ' the ' : ' ', enemy.user.handle, '!\n')
                                if (enemy.user.id !== '' && enemy.user.id[0] !== '_') {
                                    vt.sound('kill', 15)
                                    vt.music($.player.gender == 'M' ? 'bitedust' : 'queen')
                                    news(`\tdefeated ${enemy.user.handle}, a level ${enemy.user.xplevel} ${enemy.user.pc}`)
                                    vt.wall($.player.handle, `defeated ${enemy.user.handle}`)
                                }
                            }
                            if ($.from == 'Monster' && enemy.user.xplevel > 0) {
                                news(`\tdefeated a level ${enemy.user.xplevel} ${enemy.user.handle}`)
                                vt.wall($.player.handle, `defeated a level ${enemy.user.level} ${enemy.user.handle}`)
                            }
                        }
                        if ($.from == 'Dungeon') vt.animated(['bounceOut', 'fadeOut', 'flipOutX', 'flipOutY', 'rollOut', 'rotateOut', 'zoomOut'][dice(7) - 1])
                    }
                }
            }

            alive = []
            for (let p in parties) {
                alive.push(parties[p].length)
                for (let m in parties[p])
                    if (parties[p][m].hp < 1 || parties[p][m].user.xplevel < 0)
                        alive[p]--
            }

            // attack stack
            if (alive[0] && alive[1]) {
                attack()
                return
            }

            spoils()
            end()
        }
    }

    export function spoils() {
        let winner: active
        let loser: active
        let l: number
        let w: number

        if ($.online.confused)
            PC.activate($.online, false, true)

        if ($.from == 'Gates')
            return

        if (alive[0]) {
            winner = $.online
            l = 1
        }
        else {
            winner = parties[1][0]
            l = 0
        }

        w = l ^ 1
        winner.altered = true

        // remove any lingering illusion(s) first
        for (let i in parties)
            for (let j = 0; j < parties[i].length; j++)
                if (parties[i][j].user.xplevel < 0)
                    parties[i].splice(j--, 1)

        // had a little help from my friends (maybe)
        if ($.from == 'Party') {
            db.run(`UPDATE Gangs SET win=win+1 WHERE name='${parties[w][0].user.gang}'`)
            db.run(`UPDATE Gangs SET loss=loss+1 WHERE name='${parties[l][0].user.gang}'`)

            // player(s) can collect off each corpse
            let tl = [1, 1]
            let take: number = 0
            let coin = new Coin(0)

            for (let m in parties[w]) {
                tl[w] += parties[w][m].user.xplevel
                take += money(parties[w][m].user.xplevel + 1)
            }

            for (let m in parties[l]) {
                // accrue benefits off of defeated players only
                if ((loser = parties[l][m]).hp == 0) {
                    tl[l] += loser.user.xplevel
                    coin.value += loser.user.coin.value
                    log(loser.user.id, `\n${winner.user.gang} defeated ${loser.user.gang}, started by ${$.player.handle}`)
                    if (loser.user.coin.value)
                        log(loser.user.id, `You lost ${loser.user.coin.carry(2, true)} you were carrying.`)
                    loser.user.coin.value = 0
                    PC.save(loser)
                }
            }

            for (let m in parties[w]) {
                //  dead member gets less of the booty, taxman always gets a cut
                let cut = parties[w][m].hp > 0 ? 0.95 : 0.45
                let max = int(((4 + parties[w].length - parties[l].length) / 2) * 1250 * money(parties[w][m].user.xplevel) * cut)
                let award = int(coin.value * money(parties[w][m].user.xplevel) / take * cut)
                award = award > coin.value ? coin.value : award
                award = award < 1 ? 0 : award > max ? max : award
                parties[w][m].user.coin.value += award
                coin.value -= award
                take -= money(parties[w][m].user.xplevel)

                let xp = int(PC.experience(parties[w][m].user.xplevel)
                    * tl[l] / tl[w] / ((4 + parties[w].length - parties[l].length) / 2))

                if (parties[w][m] === $.online) {
                    vt.outln(-200)
                    if (xp)
                        vt.outln('You get ', PC.expout(xp), -400)
                    if (award)
                        vt.outln('You get your cut worth ', new Coin(award).carry(), '.', 400)
                    $.player.xp += xp
                }
                else {
                    log(parties[w][m].user.id, `\n${winner.user.gang} defeated ${loser.user.gang}, started by ${$.player.handle}`)
                    log(parties[w][m].user.id, `You got ${PC.expout(xp, false)} and ${new Coin(award).carry(2, true)}.`)
                    parties[w][m].user.xp += xp
                    PC.save(parties[w][m])
                }
            }

            //  taxman takes any leftovers, but capped at 1p
            coin.value = coin.value < 1 ? 0 : coin.value > 1e+13 ? 1e+13 : coin.value
            if (coin.value) {
                vt.outln()
                vt.beep()
                PC.load($.taxman)
                $.taxman.user.bank.value += coin.value
                db.run(`UPDATE Players
                    set bank=${$.taxman.user.bank.value}
                    WHERE id='${$.taxman.user.id}'`).changes
                vt.outln($.taxman.user.handle, ' took ', $.taxman.who.his, 'cut worth ', coin.carry(1), '.', -600)
            }

            if (winner === $.online) {
                news(`\tdefeated the gang, ${parties[l][0].user.gang}`)
                vt.wall($.player.handle, `defeated the gang, ${parties[l][0].user.gang}`)
            }
            else if ($.online.hp == 0) {
                death(`defeated by the gang, ${parties[w][0].user.gang}`)
                vt.music()
                vt.sound('effort', 15)
            }
            return
        }

        //  the losers are them, not me
        if (l) {
            // player can collect off each corpse
            let xp: number = 0
            let coin = new Coin(0)

            for (let m in parties[l]) {
                // defeated?
                if ((loser = parties[l][m]).hp == 0) {
                    log(loser.user.id, `\n${$.player.handle} killed you!`)

                    if (/Monster|User/.test($.from)) {
                        vt.animated(loser.user.id ? 'hinge' : 'rotateOutDownRight')
                        loser.altered = true
                        loser.user.status = winner.user.id
                        let x = loser.user.id ? 2 : 3
                        xp += PC.experience(loser.user.xplevel, x)
                        if (winner.user.level < loser.user.xplevel)
                            loser.user.xplevel = winner.user.level
                    }
                    else
                        xp += PC.experience(loser.user.xplevel, 18 - (1.333 * loser.user.immortal))

                    if (loser.user.sex !== 'I' && loser.user.rings.length) {
                        vt.out('You start by removing ', loser.user.rings.length > 1 ? 'all of ' : '', loser.who.his, 'rings...')
                        vt.sound('click', 8)
                        loser.user.rings.forEach(ring => {
                            if (Ring.wear(winner.user.rings, ring)) {
                                getRing(['fondle', 'polish', 'slip on', 'wear', 'win'][dice(5) - 1], ring)
                                PC.saveRing(ring, winner.user.id)
                                vt.sound('click', 8)
                                log(loser.user.id, `... took your ${ring} ring.`)
                            }
                        })
                        loser.user.rings = []
                        loser.altered = true
                        vt.outln()
                    }

                    if (loser.user.coin.value) {
                        coin.value += loser.user.coin.value
                        loser.user.coin.value = 0
                        loser.altered = true
                    }

                    if ($.from !== 'User') {
                        let credit = new Coin(loser.weapon.value)
                        credit.value = tradein(credit.value, winner.cha)
                        let result = Weapon.swap(winner, loser, credit)
                        if (typeof result == 'boolean' && result)
                            vt.outln(winner.who.He, PC.what(winner, 'take'), loser.who.his, winner.user.weapon, '.')
                        else if ($.from == 'Monster' && result)
                            vt.outln(winner.who.He, PC.what(winner, 'get'), credit.carry(), ' for ', loser.who.his, loser.user.weapon, '.')

                        credit = new Coin(loser.armor.value)
                        credit.value = tradein(credit.value, winner.cha)
                        result = Armor.swap(winner, loser, credit)
                        if (typeof result == 'boolean' && result) {
                            vt.outln(winner.who.He, 'also ', PC.what(winner, 'take'), loser.who.his, winner.user.armor, '.')
                            if (/_DM|_NEP|_OLD|_TAX/.test(loser.user.id)) vt.sound('shield', 16)
                        }
                        else if ($.from == 'Monster' && result)
                            vt.outln(winner.who.He, 'also ', PC.what(winner, 'get'), credit.carry(), ' for ', loser.who.his, loser.user.armor, '.')
                    }
                    else {
                        if (Weapon.swap(winner, loser)) {
                            vt.outln(winner.who.He, PC.what(winner, 'take'), loser.who.his, winner.user.weapon, '.', -250)
                            log(loser.user.id, `... and took your ${winner.user.weapon}.`)
                        }
                        if (Armor.swap(winner, loser)) {
                            vt.outln(winner.who.He, 'also ', PC.what(winner, 'take'), loser.who.his, winner.user.armor, '.', -250)
                            log(loser.user.id, `... and took your ${winner.user.armor}.`)
                        }
                        if (winner.user.cursed) {
                            winner.user.cursed = ''
                            PC.adjust('str', 10, 0, 0, winner)
                            PC.adjust('int', 10, 0, 0, winner)
                            PC.adjust('dex', 10, 0, 0, winner)
                            PC.adjust('cha', 10, 0, 0, winner)
                            loser.user.cursed = winner.user.id
                            loser.altered = true
                            vt.outln(vt.bright, vt.black, 'A dark cloud has lifted and shifted.', -600)
                            log(loser.user.id, `... and left you with a dark cloud.`)
                        }
                        if (loser.user.blessed) {
                            loser.user.blessed = ''
                            loser.altered = true
                            if (winner.user.coward)
                                winner.user.coward = false
                            else {
                                winner.user.blessed = loser.user.id
                                PC.adjust('str', 10, 0, 0, winner)
                                PC.adjust('int', 10, 0, 0, winner)
                                PC.adjust('dex', 10, 0, 0, winner)
                                PC.adjust('cha', 10, 0, 0, winner)
                                vt.outln(vt.bright, vt.yellow, 'A shining aura ', vt.normal, 'surrounds you.', -600)
                            }
                            log(loser.user.id, `... and took your blessedness.`)
                        }
                        if (loser.user.gang && loser.user.gang == $.player.gang) {
                            gang = PC.loadGang(db.query(`SELECT * FROM Gangs WHERE name='${$.player.gang}'`)[0], $.player.id)
                            let n = gang.members.indexOf(loser.user.id)
                            if (n == 0) {
                                n = gang.members.indexOf($.player.id)
                                gang.members[0] = $.player.id
                                gang.members[n] = loser.user.id
                                PC.saveGang(gang)
                                vt.outln(`You take over as the leader of ${gang.name}.`, -600)
                            }
                            else {
                                $.player.maxcha--
                                $.player.cha--
                            }
                        }
                        if (loser.user.bounty.value) {
                            vt.outln(`You get the ${loser.user.bounty.carry()} bounty posted by ${loser.user.who}, too.`)
                            log(loser.user.id, `... and got paid the bounty posted by ${loser.user.who}.`)
                            winner.user.coin.value += loser.user.bounty.value
                            loser.user.bounty.value = 0
                            loser.user.who = ''
                        }
                        vt.out(600)
                    }
                }
            }
            if (xp) {
                vt.outln('You get', parties[l].length > 1 ? ' a total of ' : ' '
                    , PC.expout(xp, winner === $.online), -100)
                winner.user.xp += xp
            }
            if (coin.value) {
                vt.outln(-100, 'You get', parties[l].length > 1 ? ' a total of ' : ' '
                    , coin.carry(), ' '
                    , parties[l].length > 1 ? 'they were ' : loser.who.he + 'was '
                    , 'carrying.')
                winner.user.coin.value += coin.value
            }
        }
        else {
            //  accruing money is always eligible
            if ($.player.coin.value) {
                winner.user.coin.value += $.player.coin.value
                vt.outln(vt.reset, winner.who.He, 'gets ', $.player.coin.carry(), ' you were carrying.\n')
                $.player.coin.value = 0
            }
            vt.sleep(600)

            //  manage grace modifiers, but not sticky for NPC
            if (winner.user.cursed) {
                if ($.player.blessed) {
                    $.player.blessed = ''
                    vt.out(vt.yellow, vt.bright, 'Your shining aura ', vt.normal, 'leaves')
                }
                else {
                    $.player.coward = false
                    $.player.cursed = winner.user.id
                    winner.user.cursed = ''
                    vt.out(vt.faint, 'A dark cloud hovers over', vt.reset)
                }
                vt.outln(vt.faint, ' you.\n', -600)
            }

            //  manage any asset upgrades for PC
            if (winner.user.id && winner.user.id[0] !== '_') {
                $.player.coward = true
                PC.save()
                log(winner.user.id, `\nYou killed ${$.player.handle}!`)
                winner.user.xp += PC.experience($.player.xplevel, 2)

                if ($.player.blessed) {
                    winner.user.blessed = $.player.id
                    $.player.blessed = ''
                    vt.outln(vt.bright, vt.yellow, 'Your shining aura ', vt.normal, 'leaves ', vt.faint, 'you.\n', -600)
                }

                if (Weapon.swap(winner, $.online)) {
                    vt.outln(winner.who.He, PC.what(winner, 'take'), $.online.who.his, winner.user.weapon, '.')
                    log(winner.user.id, `You upgraded to ${winner.user.weapon}.`)
                }

                if (Armor.swap(winner, $.online)) {
                    vt.outln(winner.who.He, 'also ', PC.what(winner, 'take'), $.online.who.his, winner.user.armor, '.')
                    log(winner.user.id, `You upgraded to ${winner.user.armor}.`)
                }

                if ($.player.rings.length) {
                    vt.outln(winner.who.He, 'also ', PC.what(winner, 'remove')
                        , $.player.rings.length > 1 ? 'all of ' : '', $.online.who.his, 'rings...')
                    $.player.rings.forEach(ring => {
                        vt.out(' ', bracket(ring, false), ' ')
                        vt.sound('click')
                        if (Ring.wear(winner.user.rings, ring))
                            PC.saveRing(ring, winner.user.id)
                    })
                    $.player.rings = []
                    vt.outln()
                    log(winner.user.id, `... and there were rings, too!`)
                }

                if (winner.user.gang && winner.user.gang == $.player.gang) {
                    PC.adjust('cha', -1, -1, -1)
                    vt.music('punk')
                    gang = PC.loadGang(db.query(`SELECT * FROM Gangs WHERE name='${$.player.gang}'`)[0], $.player.id)
                    let n = gang.members.indexOf(winner.user.id)
                    if (n == 0) {
                        vt.outln(vt.cyan, winner.who.He, 'says, ', vt.white, '"Let that be a lesson to you punk!"', -800)
                    }
                    if (gang.members[0] == $.player.id) {
                        PC.adjust('cha', -1, -1, -1)
                        gang.members[0] = winner.user.id
                        gang.members[n] = $.player.id
                        PC.saveGang(gang)
                        vt.outln(winner.who.He, `takes over as the leader of ${gang.name}.\n`, -600)
                    }
                }
                PC.save(winner)
                $.player.coward = false
            }
        }
        $.online.altered = true
    }

    export function brawl(rpc: active, nme: active, vs = false) {
        const p1 = PC.who(rpc, vs), p2 = PC.who(nme, vs)
        if (dice(100) >= (50 + int(rpc.dex / 2))) {
            vt.sound(rpc.user.id == $.player.id ? 'whoosh' : 'swoosh')
            vt.outln(`\n${p2.He}${PC.what(nme, 'duck')}${p1.his}punch.`, -400)
            let patron = PC.encounter()
            if (patron.user.id && patron.user.id !== rpc.user.id && patron.user.id !== nme.user.id && !patron.user.status) {
                vt.outln(`\n${p1.He}${PC.what(rpc, 'hit')}${patron.user.handle}!`)
                vt.sound('duck', 8)
                let bp = punch(rpc)
                patron.bp -= bp
                if (patron.bp > 0) {
                    vt.out('\nUh oh! ', -600)
                    vt.outln(` Here comes ${patron.user.handle}!`, -600)
                    brawl(patron, rpc, true)
                }
                else
                    knockout(rpc, patron)
            }
        }
        else {
            let bp = punch(rpc)
            vt.outln(`\n${p1.He}${PC.what(rpc, 'punch')}${p2.him}for ${bp} points.`)
            nme.bp -= bp
            if (nme.bp < 1)
                knockout(rpc, nme)
        }

        function knockout(winner: active, loser: active) {
            let xp = PC.experience(loser.user.level, 9)
            db.run(`UPDATE Players SET tw=tw+1,xp=xp+${xp},coin=coin+${loser.user.coin.value} WHERE id='${winner.user.id}'`)
            db.run(`UPDATE Players SET tl=tl+1,coin=0 WHERE id='${loser.user.id}'`)

            vt.outln('\n', winner.user.id == $.player.id ? 'You' : winner.user.handle
                , ` ${PC.what(winner, 'knock')}${loser.who.him}out!`, -600)
            if (xp) {
                vt.outln(`\n${winner.who.He}${PC.what(winner, 'get')}`, PC.expout(xp, winner.user.id == $.player.id), -600)
                winner.user.xp += xp
            }
            if (loser.user.coin.value) {
                vt.outln(`${loser.who.He}was carrying ${loser.user.coin.carry()}`, -600)
                winner.user.coin.value += loser.user.coin.value
                loser.user.coin.value = 0
            }
            winner.user.tw++

            loser.user.tl++
            if (loser.user.id == $.player.id) {
                vt.sound('ko')
                let m = Math.abs($.online.bp)
                while (m > 9)
                    m >>= 1
                m++
                let wtf = m > 5 ? 'f eht tahw' : 'z.Z.z'
                vt.sessionAllowed = whole(vt.sessionAllowed - 60 * m) + 60
                vt.out(`\nYou are unconscious for ${m} minute`, m !== 1 ? 's' : '', '...'
                    , -600, vt.faint)
                for (let i = 0; i < m; i++)
                    vt.out(wtf[wtf.length - i - 1], -250)
                vt.outln(vt.normal, '...')
                news(`\tgot knocked out by ${winner.user.handle}`)
            }
            else
                log(loser.user.id, `\n${winner.user.handle} knocked you out.`)
        }

        function punch(p: active): number {
            vt.sound('punch' + dice(3))
            let punch = int((p.user.level + p.str / 10) / 2)
            punch += dice(punch)
            return punch
        }
    }

    export function cast(rpc: active, gb: Function, nme?: active, magic?: number, DL?: ddd) {

        let tricks = Object.assign([], rpc.user.spells)
        let Summons = ['Teleport', 'Resurrect']
        Object.assign([], Summons).forEach(summon => {
            let i = Summons.indexOf(summon)
            if (Ring.power(nme ? nme.user.rings : [], rpc.user.rings, summon.toLowerCase(), "pc", rpc.user.pc).power
                || rpc.user.pc == PC.winning || $.access.sysop)
                Magic.add(tricks, summon)
            else
                Summons.splice(i, 1)
        })

        if (!tricks.length) {
            if (rpc === $.online) {
                vt.outln(`\nYou don't have any magic.`)
                gb(true)
            }
            else {
                vt.out('cast() failure :: ', `${rpc.user.level} ${rpc.user.pc} ${rpc.user.handle} ${rpc.user.magic} ${rpc.sp} ${rpc.user.spells}`)
                gb()
            }
            return
        }

        if (rpc === $.online) {
            p1 = PC.who(rpc)
            vt.action('list')
            vt.form = {
                'magic': {
                    cb: () => {
                        vt.outln()
                        const n = whole(vt.entry)
                        if (vt.entry !== '?' && !n) {
                            gb(true)
                            return
                        }

                        if (!Magic.have(tricks, n)) {
                            for (let i in tricks) {
                                const p = tricks[i]
                                const spell = Object.keys(Magic.spells)[p - 1]
                                if (rpc.user.magic < 2)
                                    vt.out(bracket(p), sprintf('%-18s  (%d%%)', spell, Magic.ability(spell, rpc, nme).fail))
                                else
                                    vt.out(bracket(p), sprintf('%-18s  %4d  (%d%%)'
                                        , spell
                                        , Summons.includes(spell) ? 0
                                            : rpc.user.magic < 4 ? Magic.spells[spell].mana
                                                : Magic.spells[spell].enchanted
                                        , Magic.ability(spell, rpc, nme).fail)
                                    )
                            }
                            vt.outln()
                            vt.refocus()
                        }
                        else {
                            vt.outln()
                            const spell = Object.keys(Magic.spells)[n - 1]
                            invoke(spell, Summons.includes(spell))
                        }
                    }, prompt: ['Try wand', 'Use wand', 'Read scroll', 'Cast spell', 'Uti magicae'][$.player.magic] + ' (?=list): ', max: 2
                }
            }
            vt.focus = 'magic'
            return
        }
        else {
            let spell = Object.keys(Magic.spells)[magic - 1]
            invoke(spell, Summons.includes(spell))
        }

        function invoke(name: string, summon: boolean) {
            const Caster = p1.You
            const caster = p1.you
            let Recipient = ''
            let recipient = ''
            let spell = Magic.spells[name]
            if (rpc.user.id !== $.player.id) vt.sleep(150)

            if (rpc.user.magic > 1 && !summon)
                if (rpc.sp < Magic.power(rpc, spell.cast)) {
                    if (rpc === $.online)
                        vt.outln(`You don't have enough power to cast that spell!`)
                    gb(!rpc.confused)
                    return
                }

            //  some sensible ground rules to avoid known muling exploits, aka White Knights passing gas
            if (nme) {
                if ([1, 2, 3, 4, 5, 6, 10].indexOf(spell.cast) >= 0) {
                    if (rpc === $.online)
                        vt.outln('You cannot cast that spell during a battle!')
                    gb(!rpc.confused)
                    return
                }
                if (nme.user.novice && [12, 15, 16, 20, 21, 22].indexOf(spell.cast) >= 0) {
                    if (rpc === $.online)
                        vt.outln('You cannot cast that spell on a novice player.')
                    gb(!rpc.confused)
                    return
                }
                if (/Merchant|Naval|Tavern|Taxman/.test($.from) && [8, 12, 17, 18, 22].indexOf(spell.cast) >= 0) {
                    if (spell.cast == 8 && rpc === $.online) {
                        vt.outln('You cannot cast that spell to retreat!')
                        gb(!rpc.confused)
                        return
                    }
                    if (spell.cast > 8) {
                        if (rpc === $.online) {
                            vt.sound('oops', 4)
                            vt.outln('You are too frantic to cast that spell!')
                        }
                        gb(!rpc.confused)
                        return
                    }
                }
                Recipient = p2.You
                recipient = p2.you
            }
            else {
                if ([9, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22].indexOf(spell.cast) >= 0) {
                    if (rpc === $.online)
                        vt.outln('You cannot cast that spell on yourself!')
                    gb(!rpc.confused)
                    return
                }
            }

            if (rpc.sp > 0) {
                let mana = summon ? 0 : rpc.user.magic < 4 ? spell.mana : spell.enchanted
                rpc.sp -= mana

                //  collect some of the mana spent by the enemy?
                if (nme) {
                    const spent = Ring.power(rpc.user.rings, nme.user.rings, 'sp', 'pc', nme.user.pc).power
                    if (mana = spent * dice(mana / 6) * dice(nme.user.magic)) {
                        if (nme.user.sp > 0 && nme.sp + mana > nme.user.sp) {
                            mana = nme.user.sp - nme.sp
                            if (mana < 0) mana = 0
                        }
                        if (mana) {
                            if (nme.sp > 0) {
                                nme.sp += mana
                                vt.outln(Recipient, PC.what(nme, 'absorb'), vt.bright, vt.cyan, mana.toString(), vt.normal, ' mana '
                                    , vt.reset, 'spent off ', p1.his, 'spell.')
                            }
                            else {
                                rpc.sp -= mana
                                if (rpc.sp < 0) rpc.sp = 0
                                vt.outln(Recipient, PC.what(nme, 'drain'), 'an extra ', vt.bright, vt.cyan, mana.toString(), vt.normal, ' mana '
                                    , vt.reset, 'from ', p1.his, 'spell.')
                            }
                            vt.sound('mana', 8)
                        }
                    }
                }
            }

            if (!summon && rpc.user.magic < 2 && dice(100) < (50 + 2 * spell.cast - 16 * +(spell.cast > 16))) {
                rpc.altered = true
                Magic.remove(rpc.user.spells, spell.cast)
                if (!(rpc.user.id[0] == '_' || rpc.user.gender == 'I')) PC.save(rpc)
                vt.outln(p1.His, 'wand smokes as ', p1.he, PC.what(rpc, 'cast'), 'the spell ... ', -33 * spell.cast)
            }

            //  Tigress prefers the Ranger (and Paladin) class, because it comes with a coupon and a better warranty
            if (!summon && rpc.user.magic == 2 && dice(int($.access.sysop) + 5) == 1) {
                rpc.altered = true
                Magic.remove(rpc.user.spells, spell.cast)
                if (!(rpc.user.id[0] == '_' || rpc.user.gender == 'I')) PC.save(rpc)
                vt.outln(p1.His, 'scroll burns as ', p1.he, PC.what(rpc, 'cast'), 'the spell ... ', -44 * spell.cast)
            }

            if (nme) {
                let mod = Ring.power([], nme.user.rings, 'resist', 'spell', name)
                if (mod.power) {
                    if (!Ring.have(rpc.user.rings, Ring.theOne)) {
                        vt.outln(vt.faint, '>> ', vt.normal, p1.His, vt.bright, vt.magenta, name, vt.normal, ' spell '
                            , -300, vt.reset, 'attempt is ineffective against', -200)
                        vt.out('   ', p2.his, vt.bright, vt.cyan, mod.name, vt.normal, -100)
                        if ($.player.emulation == 'XT' && nme.user.sex !== 'I') vt.out(' ', Ring.name[mod.name].emoji, ' 💍')
                        vt.outln(nme.user.sex == 'I' ? ' power' : ' ring', vt.reset, '!', vt.faint, ' <<')
                        gb()
                        return
                    }
                    else {
                        vt.out(vt.magenta, vt.faint, '>> ', vt.normal, p1.His, vt.bright, Ring.theOne, vt.normal, ' ring ', -300
                            , 'dispels ', p2.his, vt.bright, vt.cyan, mod.name, vt.normal, -200)
                        if ($.player.emulation == 'XT') vt.out(' ', Ring.name[mod.name].emoji, ' 💍')
                        vt.outln(' ring', vt.magenta, '!', vt.faint, ' <<', -100)
                    }
                }
            }

            let backfire = false

            if (dice(100) > Magic.ability(name, rpc, nme).fail) {
                if ((backfire = dice(100) > Magic.ability(name, rpc, nme).backfire)) {
                    vt.outln('Oops!  ', p1.His, ['try', 'wand', 'scroll', 'spell', 'magic'][rpc.user.magic], ' backfires!')
                    vt.sound('oops', 4)
                }
                else {
                    vt.outln('Fssst!  ', p1.His, 'attempt fails!')
                    vt.sound('fssst', 4)
                    gb()
                    return
                }
            }

            if (spell.cast < 17 && round.length > 1 && round[0].party)
                if (alive[1] > 1)
                    vt.out(vt.faint, vt.Empty, vt.normal, ' ')

            switch (spell.cast) {
                case 1:
                    if (backfire) {
                        PC.adjust('str', -dice(10))
                        vt.outln(`You feel weaker (${rpc.str})`)
                    }
                    else {
                        PC.adjust('str', dice(10))
                        if (rpc.str < rpc.user.maxstr)
                            vt.outln(`You feel much stronger (${rpc.str})`)
                        else
                            vt.outln(`This game prohibits the use of steroids.`)
                    }
                    break

                case 2:
                    if (backfire) {
                        PC.adjust('int', -dice(10))
                        vt.outln(`You feel stupid (${rpc.int})`)
                    }
                    else {
                        PC.adjust('int', dice(10))
                        if (rpc.int < rpc.user.maxint)
                            vt.outln(`You feel much more intelligent (${rpc.int})`)
                        else
                            vt.outln(`Get on with it, professor!`)
                    }
                    break

                case 3:
                    if (backfire) {
                        PC.adjust('dex', -dice(10))
                        vt.outln(`You feel clumsy (${rpc.dex})`)
                    }
                    else {
                        PC.adjust('dex', dice(10))
                        if (rpc.dex < rpc.user.maxdex)
                            vt.outln(`You feel much more agile (${rpc.dex})`)
                        else
                            vt.outln(`Y'all shakin' and bakin'.`)
                    }
                    break

                case 4:
                    if (backfire) {
                        PC.adjust('cha', -dice(10))
                        vt.outln(`You feel depressed (${rpc.cha})`)
                    }
                    else {
                        PC.adjust('cha', dice(10))
                        if (rpc.cha < rpc.user.maxcha)
                            vt.outln(`You feel much more charismatic (${rpc.cha})`)
                        else
                            vt.outln(`Stop being so vain.`)
                    }
                    break

                case 5:
                    if (backfire) {
                        if (rpc.user.magic > 2 && rpc.user.toAC > 0)
                            rpc.user.toAC--
                        rpc.toAC--
                        vt.outln(p1.His, isNaN(+rpc.user.armor) ? armor(rpc) : 'defense', ' loses some of its effectiveness')
                    }
                    else {
                        vt.sound('shield')
                        if (rpc.user.magic > 2 && rpc.user.toAC >= 0)
                            rpc.user.toAC++
                        rpc.toAC++
                        vt.outln('A magical field shimmers around ', isNaN(+rpc.user.armor) ? p1.his + armor(rpc) : p1.him)
                    }
                    if (-rpc.user.toAC >= rpc.armor.ac || -(rpc.user.toAC + rpc.toAC) >= rpc.armor.ac) {
                        vt.outln(p1.His, isNaN(+rpc.user.armor) ? rpc.user.armor : 'defense', ' crumbles!')
                        Armor.equip(rpc, Armor.merchant[0])
                    }
                    if (dice(3 * (rpc.user.toAC + rpc.toAC + 1) / rpc.user.magic) > rpc.armor.ac) {
                        vt.outln(p1.His, isNaN(+rpc.user.armor) ? rpc.user.armor : 'defense', ' vaporizes!')
                        Armor.equip(rpc, Armor.merchant[0])
                        if (rpc === $.online) vt.sound('crack', 6)
                    }
                    rpc.altered = true
                    break

                case 6:
                    if (backfire) {
                        if (rpc.user.magic > 2 && rpc.user.toWC > 0)
                            rpc.user.toWC--
                        rpc.toWC--
                        vt.outln(p1.His, isNaN(+rpc.user.weapon) ? weapon(rpc) : 'attack', ' loses some of its effectiveness')
                    }
                    else {
                        vt.sound('hone')
                        if (rpc.user.magic > 2 && rpc.user.toWC >= 0)
                            rpc.user.toWC++
                        rpc.toWC++
                        vt.outln(p1.His, isNaN(+rpc.user.weapon) ? weapon(rpc) : 'attack', ' glows with magical sharpness')
                    }
                    if (-rpc.user.toWC >= rpc.weapon.wc || -(rpc.user.toWC + rpc.toWC) >= rpc.weapon.wc) {
                        vt.outln(p1.His, rpc.user.weapon ? rpc.user.weapon : 'attack', ' crumbles!')
                        Weapon.equip(rpc, Weapon.merchant[0])
                    }
                    if (dice(3 * (rpc.user.toWC + rpc.toWC + 1) / rpc.user.magic) > rpc.weapon.wc) {
                        vt.outln(p1.His, rpc.user.weapon ? rpc.user.weapon : 'attack', ' vaporizes!')
                        Weapon.equip(rpc, Weapon.merchant[0])
                        if (rpc === $.online) vt.sound('crack', 6)
                    }
                    rpc.altered = true
                    break

                case 7:
                    let ha = 10 + rpc.user.heal + int(rpc.user.level / (20 - rpc.user.magic))
                    let hr = 0
                    for (let i = 0; i < rpc.user.level; i++)
                        hr += dice(ha)

                    if (backfire) {
                        vt.sound('hurt', 3)
                        rpc.hp -= hr
                        vt.outln(Caster, PC.what(rpc, 'hurt'), p1.self, 'for ', hr.toString(), ' hit points!')
                        if (rpc.hp < 1) {
                            vt.outln()
                            rpc.hp = 0
                            if (rpc === $.online)
                                $.reason = 'heal backfired'
                        }
                    }
                    else {
                        vt.sound('heal', 3)
                        rpc.hp += hr
                        if (rpc.hp > rpc.user.hp)
                            rpc.hp = rpc.user.hp
                        vt.outln(Caster, PC.what(rpc, 'heal'), p1.self, 'for ', hr.toString(), ' hit points.')
                    }
                    break

                case 8:
                    if (nme) {
                        vt.sound('teleport')
                        vt.out(vt.bright, vt.magenta)
                        if (backfire) {
                            vt.out(Caster, PC.what(rpc, 'teleport'), recipient, ' ')
                            if (nme !== $.online)
                                nme.hp = -nme.hp
                            else {
                                teleported = true
                                retreat = true
                            }
                        }
                        else {
                            vt.out(Caster, PC.what(rpc, 'teleport'))
                            if (rpc === $.online) {
                                teleported = true
                                retreat = true
                                rpc.user.retreats++
                            }
                            else {
                                rpc.hp = -1
                                vt.animated('zoomOutUp')
                            }
                        }
                        vt.outln(-600, vt.normal, 'away from ', -400, vt.faint, 'the battle!', -200)
                        // The Conqueror was here, heh
                        if (dice(100) == 1)
                            vt.outln(vt.lred, `Nearby is the Crown's Champion shaking his head and texting his Grace.`, -2000)
                    }
                    else {
                        if (rpc === $.online) {
                            vt.sessionAllowed = whole(vt.sessionAllowed - 60) + 3 * $.dungeon + 1
                            teleported = true
                        }
                        else
                            rpc.hp = -1
                    }
                    expel = backfire
                    break

                case 9:
                    vt.sound('blast', 3)
                    let ba = 10 + rpc.user.blast
                        + int(rpc.user.level / (20 - rpc.user.magic))
                        - (backfire
                            ? int(whole(rpc.armor.ac + rpc.user.toAC + rpc.toWC) / 5)
                            : int(whole(nme.armor.ac + nme.user.toAC + nme.toWC) / 5)
                        )
                    if (nme.user.melee > 3) ba *= int(nme.user.melee / 2)
                    let br = int(rpc.int / 10)
                    while (dice(99 + rpc.user.magic) > 99) {
                        ba += dice(rpc.user.magic)
                        for (let i = 0; i < ba; i++)
                            br += dice(ba)
                    }
                    for (let i = 0; i < rpc.user.level; i++)
                        br += dice(ba)

                    if (backfire) {
                        vt.outln(Caster, PC.what(rpc, 'blast'), p1.self, `for ${br} hit points!`)
                        rpc.hp -= br
                        if (rpc.hp < 1) {
                            vt.outln()
                            rpc.hp = 0
                            if (rpc === $.online)
                                $.reason = 'blast backfired'
                        }
                    }
                    else {
                        if (rpc === $.online && !$.player.novice) {
                            let deed = $.mydeeds.find((x) => { return x.deed == 'blast' })
                            if (!deed) deed = $.mydeeds[$.mydeeds.push(Deed.load($.player.pc, 'blast')[0]) - 1]
                            if (deed && br > deed.value) {
                                deed.value = br
                                Deed.save(deed, $.player)
                                vt.out(vt.yellow, '+', vt.white)
                            }
                        }
                        vt.out(Caster, PC.what(rpc, 'blast'), recipient, ` for ${br} hit points!`)
                        nme.hp -= br

                        if (nme.hp < 1) {
                            nme.hp = 0
                            if ($.from == 'Party' || nme !== $.online) {
                                vt.out(' ', bracket('RIP', false), ' ')
                                vt.beep()
                            }
                            else {
                                $.reason = rpc.user.id.length
                                    ? `fatal blast by ${rpc.user.handle}`
                                    : `fatal blast by a level ${rpc.user.level} ${rpc.user.handle}`
                            }
                        }
                        vt.outln()
                    }
                    break

                case 10:
                    if (backfire) {
                        vt.music('crack')
                        vt.outln(vt.faint, 'You die by your own doing.', -600)
                        vt.sound('killed', 4)
                        rpc.hp = 0
                        death(`resurrect backfired`)
                        break
                    }
                    else {
                        vt.sound('resurrect')
                        if (DL) {
                            if (DL.cleric.user.status) {
                                vt.music('winner')
                                vt.profile({ jpg: 'npc/resurrect', effect: 'fadeInUp' })
                                DL.cleric.user.status = ''
                                PC.activate(DL.cleric)
                                PC.adjust('cha', 104, 2, 1)
                                vt.outln(-200, vt.faint, 'You raise ', -300, 'the ', vt.yellow, DL.cleric.user.handle, vt.reset, -400, ' from the dead!', -500)
                                gb()
                                return
                            }
                        }
                        user('Resurrect', (opponent: active) => {
                            if (opponent.user.id == $.player.id || opponent.user.status == '' || opponent.user.id == '') {
                                vt.outln(vt.bright, vt.black, '\nGo get some coffee.')
                            }
                            else {
                                PC.portrait(opponent, 'fadeInUpBig')
                                vt.out(-200, vt.magenta, vt.bright, 'Now raising ', -300, vt.normal, opponent.user.handle, -400, vt.faint, ' from the dead ... ', -500)
                                opponent.user.status = ''
                                PC.save(opponent)
                                news(`\tresurrected ${opponent.user.handle}`)
                                log(opponent.user.id, `\n${$.player.handle} resurrected you`)
                                vt.outln()
                            }
                            gb()
                            return
                        })
                        return
                    }

                case 11:
                    vt.sound('confusion')
                    vt.out(Caster, PC.what(rpc, 'blitz'))
                    if (backfire) {
                        vt.out(p1.self)
                        rpc.confused = true
                        rpc.int >>= 1
                        rpc.dex >>= 1
                    }
                    else {
                        vt.out(recipient, ' ')
                        nme.confused = true
                        nme.int >>= 1
                        nme.dex >>= 1
                    }
                    vt.outln('with exploding ', -25, vt.bright
                        , vt.red, 'c', -25
                        , vt.yellow, 'o', -25
                        , vt.green, 'l', -25
                        , vt.cyan, 'o', -25
                        , vt.blue, 'r', -25
                        , vt.magenta, 's', -25
                        , vt.reset, '!', -25)
                    break

                case 12:
                    vt.sound('transmute', 4)
                    if (backfire) {
                        if (isNaN(+rpc.user.weapon))
                            vt.out(Caster, PC.what(rpc, 'transform'), p1.his, weapon(rpc), ' into', -600, '\n   ')
                        else
                            vt.out(`A new weapon materializes... it's`, -600)
                        let n = Math.round((dice(rpc.weapon.wc) + dice(rpc.weapon.wc)
                            + dice(Weapon.merchant.length)) / 3)
                        if (++n > Weapon.merchant.length - 1)
                            rpc.user.weapon = Weapon.special[dice(Weapon.special.length) - 1]
                        else
                            rpc.user.weapon = Weapon.merchant[n]
                        Weapon.equip(rpc, rpc.user.weapon)
                        PC.save(rpc)
                        vt.outln(vt.bright, an(rpc.user.weapon.toString()), '!', -900)
                    }
                    else {
                        if (isNaN(+nme.user.weapon))
                            vt.out(Caster, PC.what(rpc, 'transform'), p2.his, weapon(nme), ' into', -600, '\n   ')
                        else
                            vt.out(`A new weapon materializes... it's`, -600)
                        let n = Math.round((dice(nme.weapon.wc) + dice(nme.weapon.wc)
                            + dice(Weapon.merchant.length)) / 3)
                        if (++n > Weapon.merchant.length - 1)
                            nme.user.weapon = Weapon.special[dice(Weapon.special.length) - 1]
                        else
                            nme.user.weapon = Weapon.merchant[n]
                        Weapon.equip(nme, nme.user.weapon)
                        PC.save(nme)
                        vt.outln(vt.bright, an(nme.user.weapon.toString()), '!', -600)
                    }
                    break

                case 13:
                    vt.sound('cure', 6)
                    if (backfire) {
                        vt.out(Caster, PC.what(rpc, 'cure'), recipient)
                        nme.hp = nme.user.hp
                    }
                    else {
                        if (rpc === $.online)
                            vt.out('You feel your vitality completed restored')
                        else
                            vt.out(Caster, PC.what(rpc, 'cure'), p1.self)
                        rpc.hp = rpc.user.hp
                    }
                    vt.outln('!', -400)
                    break

                case 14:
                    vt.sound('illusion')
                    vt.out(Caster, PC.what(rpc, 'render'), 'an image of ')
                    let iou = <active>{}
                    iou.user = <user>{ id: '', sex: 'I', armor: 0, weapon: 0 }
                    PC.reroll(iou.user, undefined, rpc.user.level)
                    PC.activate(iou)
                    iou.user.xplevel = -1
                    iou.user.coin = new Coin(0)
                    iou.user.sp = 0
                    iou.sp = 0
                    let p = round[0].party
                    if (backfire) {
                        iou.user.handle = `image of ${nme.user.handle}`
                        iou.hp = int(nme.hp * (rpc.user.magic + 1) / 5)
                        parties[p ^ 1].push(iou)
                        vt.out(recipient)
                    }
                    else {
                        iou.user.handle = `image of ${rpc.user.handle}`
                        iou.hp = int(rpc.hp * (rpc.user.magic + 1) / 5)
                        parties[p].push(iou)
                        vt.out(p1.self)
                    }
                    vt.outln('!', -400)
                    break

                case 15:
                    vt.sound('disintegrate', 6)
                    vt.out(Caster, PC.what(rpc, 'completely atomize'))
                    if (backfire) {
                        vt.out(p1.self)
                        rpc.hp = 0
                        if (rpc === $.online) $.reason = `disintegrate backfired`
                    }
                    else {
                        vt.out(recipient)
                        nme.hp = 0
                    }
                    vt.outln('!', -400)
                    break

                case 16:
                    vt.sound('morph', 10)
                    if (backfire) {
                        rpc.user.level = dice(99)
                        PC.reroll(rpc.user, PC.random('monster'), rpc.user.level)
                        PC.activate(rpc)
                        rpc.altered = true
                        rpc.user.gender = ['F', 'M'][dice(2) - 1]
                        PC.save(rpc)
                        vt.out(Caster, PC.what(rpc, 'morph'), p1.self, `into a level ${rpc.user.level} ${rpc.user.pc}`)
                        if (rpc.user.gender !== 'I') {
                            news(`\t${rpc.user.handle} morphed into a level ${rpc.user.level} ${rpc.user.pc}!`)
                            if (rpc !== $.online)
                                log(rpc.user.id, `\nYou morphed yourself into a level ${rpc.user.level} ${rpc.user.pc}!\n`)
                        }
                    }
                    else {
                        nme.user.level = dice(nme.user.level / 2) + dice(nme.user.level / 2) - 1
                        PC.reroll(nme.user, PC.random(), nme.user.level)
                        nme.user.gender = ['F', 'M'][dice(2) - 1]
                        PC.activate(nme)
                        nme.altered = true
                        PC.save(nme)
                        vt.out(Caster, PC.what(rpc, 'morph'), recipient, ` into a level ${nme.user.level} ${nme.user.pc}`)
                        if (nme.user.gender !== 'I') {
                            news(`\t${nme.user.handle} got morphed into a level ${nme.user.level} ${nme.user.pc}${rpc !== $.online ? ' by ' + rpc.user.handle : ''}!`)
                            if (nme !== $.online)
                                log(nme.user.id, `\nYou got morphed into a level ${nme.user.level} ${nme.user.pc} by ${rpc.user.handle}!\n`)
                        }
                    }
                    vt.outln(-150, vt.blue, vt.bright, '!', -450, vt.normal, '!', -450, vt.faint, '!', -450)
                    break

                case 17:
                    if (backfire) {
                        vt.out(vt.yellow, Caster, PC.what(rpc, 'get'), 'swallowed by an acid mist... ', -500)
                        rpc.toAC -= dice(rpc.armor.ac / 5 + 1)
                        rpc.user.toAC -= dice(rpc.armor.ac / 10 + 1)
                        vt.outln(vt.bright, caster, ' ', PC.what(rpc, 'damage'), 'own '
                            , isNaN(+rpc.user.armor) ? armor(rpc) : 'defense', '!', -400)
                        if (-rpc.user.toAC >= rpc.armor.ac || -(rpc.user.toAC + rpc.toAC) >= rpc.armor.ac) {
                            vt.outln(p1.His, rpc.user.armor ? isNaN(+rpc.user.armor) : 'defense', ' crumbles!', -1000)
                            Armor.equip(rpc, Armor.merchant[0])
                        }
                        rpc.altered = true
                    }
                    else {
                        vt.out(vt.yellow, 'An acid mist surrounds ', recipient, '... ', vt.reset, -500)
                        nme.toAC -= dice(nme.armor.ac / 5 + 1)
                        nme.user.toAC -= dice(nme.armor.ac / 10 + 1)
                        vt.outln(vt.bright, p2.his
                            , isNaN(+nme.user.armor) ? armor(nme) + ' is damaged' : 'defense lessens', '!', -400)
                        if (-nme.user.toAC >= nme.armor.ac || -(nme.user.toAC + nme.toAC) >= nme.armor.ac) {
                            vt.outln(p2.His, isNaN(+nme.user.armor) ? nme.user.armor : 'defense', ' crumbles!', -1000)
                            Armor.equip(nme, Armor.merchant[0])
                        }
                        nme.altered = true
                    }
                    break

                case 18:
                    vt.out(vt.magenta, 'An ', vt.faint, 'ultraviolet', vt.normal, ' beam emits... ', vt.reset, -500)
                    if (backfire) {
                        rpc.toWC -= dice(rpc.weapon.wc / 5 + 1)
                        rpc.user.toWC -= dice(rpc.weapon.wc / 10 + 1)
                        vt.outln(vt.bright, caster, ' ', PC.what(rpc, 'damage'), 'own '
                            , isNaN(+rpc.user.weapon) ? weapon(rpc) : 'attack', '!', -400)
                        if (-rpc.user.toWC >= rpc.weapon.wc || -(rpc.user.toWC + rpc.toWC) >= rpc.weapon.wc) {
                            vt.outln(p1.His, rpc.user.weapon ? isNaN(+rpc.user.weapon) : 'attack', ' crumbles!', -1000)
                            Weapon.equip(rpc, Weapon.merchant[0])
                        }
                        rpc.altered = true
                    }
                    else {
                        nme.toWC -= dice(nme.weapon.wc / 5 + 1)
                        nme.user.toWC -= dice(nme.weapon.wc / 10 + 1)
                        vt.outln(vt.bright, caster, ' ', PC.what(rpc, 'damage'), p2.his
                            , isNaN(+nme.user.weapon) ? armor(nme) : 'attack', '!', -400)
                        if (-nme.user.toWC >= nme.weapon.wc || -(nme.user.toWC + nme.toWC) >= nme.weapon.wc) {
                            vt.outln(p2.His, isNaN(+nme.user.weapon) ? nme.user.weapon : 'attack', ' crumbles!', -1000)
                            Weapon.equip(nme, Weapon.merchant[0])
                        }
                        nme.altered = true
                    }
                    break

                case 19:
                    vt.out('A ', vt.bright, vt.white, 'blinding flash', vt.normal, ' erupts... ')
                    vt.sound('bigblast', 10)
                    let bba = 12 + rpc.user.blast
                        + int(rpc.user.level / (20 - rpc.user.magic))
                        - (backfire
                            ? int(whole(rpc.armor.ac + rpc.user.toAC + rpc.toWC) / 5)
                            : int(whole(nme.armor.ac + nme.user.toAC + nme.toWC) / 5)
                        )
                    if (nme.user.melee > 3) bba *= int(nme.user.melee / 2)
                    let bbr = int(rpc.int / 10)
                    do {
                        bba += dice(rpc.user.magic)
                        for (let i = 0; i < bba; i++)
                            bbr += dice(bba)
                    } while (dice(99 + rpc.user.magic) > 99)
                    for (let i = 0; i < rpc.user.level; i++)
                        bbr += dice(bba)

                    if (backfire) {
                        vt.outln(Caster, PC.what(rpc, 'BLAST'), p1.self, `for ${bbr} hit points!`)
                        rpc.hp -= bbr
                        if (rpc.hp < 1) {
                            rpc.hp = 0
                            vt.outln()
                            if (rpc === $.online) $.reason = 'Big Blast backfired'
                        }
                    }
                    else {
                        if (rpc === $.online && !$.player.novice) {
                            let deed = $.mydeeds.find((x) => { return x.deed == 'big blast' })
                            if (!deed) deed = $.mydeeds[$.mydeeds.push(Deed.load($.player.pc, 'big blast')[0]) - 1]
                            if (deed && bbr > deed.value) {
                                deed.value = bbr
                                Deed.save(deed, $.player)
                                vt.out(vt.yellow, '+', vt.white)
                            }
                        }
                        vt.out(Caster, PC.what(rpc, 'BLAST'), recipient, ` for ${bbr} hit points!`)
                        nme.hp -= bbr

                        if (nme.hp < 1) {
                            nme.hp = 0
                            if ($.from == 'Party' || nme !== $.online) {
                                vt.out(' ', bracket('RIP', false), ' ')
                                vt.beep()
                            }
                            else {
                                $.reason = rpc.user.id.length
                                    ? `fatal Big Blast by ${rpc.user.handle}`
                                    : `fatal Big Blast by a level ${rpc.user.level} ${rpc.user.handle}`
                            }
                        }
                        vt.outln()
                    }
                    break

                case 20:
                    if (nme.user.magic < 2) {
                        gb(true)
                        return
                    }

                    vt.out(vt.cyan, 'A glowing ', vt.faint
                        , '   ', vt.LGradient, vt.RGradient, '\b'.repeat(11), -450)
                    vt.out('  '
                        , vt.LGradient, vt.lCyan, ' ', vt.Black, vt.RGradient, '\b'.repeat(11), -300)
                    vt.out(' '
                        , vt.LGradient, vt.lCyan, '  ', vt.Black, vt.RGradient, '\b'.repeat(11), -150)
                    vt.out(vt.normal
                        , vt.LGradient, vt.lCyan, ' O ', vt.Black, vt.RGradient, '\b'.repeat(11), -100)
                    vt.out(vt.lcyan, vt.LGradient
                        , vt.lblack, vt.lCyan, 'orb', vt.Black
                        , vt.lcyan, vt.RGradient)
                    vt.sound('mana')
                    vt.outln(vt.reset, vt.cyan, ' radiates ', vt.faint, 'above ', backfire ? p2.him : p1.him
                        , vt.white, '... ', -200)

                    let mana = 0
                    if (backfire) {
                        mana = int(rpc.sp * 1. / ((5. - rpc.user.magic) + dice(2)))
                        if (mana + nme.sp > nme.user.sp)
                            mana = nme.user.sp - nme.sp
                        vt.out(Recipient, PC.what(rpc, 'absorb'), 'spell power (', vt.cyan, vt.bright, mana.toString(), vt.reset, ') '
                            , 'from ', caster)
                        rpc.sp -= mana
                        if (nme.user.magic > 1)
                            nme.sp += mana
                    }
                    else {
                        mana = int(nme.sp * 1. / ((5. - rpc.user.magic) + dice(2)))
                        if (mana + rpc.sp > rpc.user.sp)
                            mana = rpc.user.sp - rpc.sp
                        vt.out(Caster, PC.what(rpc, 'absorb'), 'spell power (', vt.cyan, vt.bright, mana.toString(), vt.reset, ') '
                            , 'from ', recipient)
                        nme.sp -= mana
                        if (rpc.user.magic > 1)
                            rpc.sp += mana
                    }
                    vt.outln('.')
                    break

                case 21:
                    vt.sound('life')
                    vt.outln(vt.black, vt.bright, 'A black finger extends and touches ', backfire ? p1.him : p2.him, '... ', -750)
                    let xp = 0
                    if (backfire) {
                        xp = int(rpc.user.xp / 2)
                        rpc.user.xp -= xp
                        nme.user.xp += (nme.user.level > rpc.user.level) ? xp : Math.trunc(nme.user.xp / 2)
                        vt.out(Recipient, PC.what(nme, 'absorb'), 'some life experience from ', caster)
                    }
                    else {
                        xp = int(nme.user.xp / 2)
                        nme.user.xp -= xp
                        rpc.user.xp += (rpc.user.level > nme.user.level) ? xp : Math.trunc(rpc.user.xp / 2)
                        vt.out(Caster, PC.what(rpc, 'absorb'), 'some life experience from ', recipient)
                    }
                    vt.outln('.')
                    break

                case 22:
                    vt.sound('lose')
                    vt.outln(vt.black, vt.bright, 'A shroud of blackness engulfs ', backfire ? p1.him : p2.him, '... ', 750)
                    if (backfire) {
                        if (rpc.user.level < 2) {
                            PC.reroll(rpc.user)
                            break
                        }
                        PC.adjust('str', -PC.card(rpc.user.pc).toStr, -1, 0, rpc)
                        PC.adjust('int', -PC.card(rpc.user.pc).toInt, -1, 0, rpc)
                        PC.adjust('dex', -PC.card(rpc.user.pc).toDex, -1, 0, rpc)
                        PC.adjust('cha', -PC.card(rpc.user.pc).toCha, -1, 0, rpc)
                        rpc.user.xp = Math.round(nme.user.xp / 2)
                        rpc.user.xplevel--
                        rpc.user.level--
                        rpc.user.hp -= Math.round(rpc.user.level + dice(rpc.user.level) + rpc.user.str / 10 + (rpc.user.str > 90 ? rpc.user.str - 90 : 0))
                        if (rpc.user.magic > 1)
                            rpc.user.sp -= Math.round(rpc.user.level + dice(rpc.user.level) + rpc.user.int / 10 + (rpc.user.int > 90 ? rpc.user.int - 90 : 0))
                        nme.user.xp *= 2
                        vt.outln(Recipient, PC.what(nme, 'gain'), 'an experience level off ', caster, '.')
                        if (nme !== $.online && nme.user.level + 1 < $.sysop.level && checkXP(nme, gb)) return
                    }
                    else {
                        if (nme.user.level < 2) {
                            PC.reroll(nme.user)
                            break
                        }
                        nme.user.xp = Math.round(nme.user.xp / 2)
                        nme.user.xplevel--
                        nme.user.level--
                        PC.adjust('str', -PC.card(nme.user.pc).toStr, -1, 0, nme)
                        PC.adjust('int', -PC.card(nme.user.pc).toInt, -1, 0, nme)
                        PC.adjust('dex', -PC.card(nme.user.pc).toDex, -1, 0, nme)
                        PC.adjust('cha', -PC.card(nme.user.pc).toCha, -1, 0, nme)
                        nme.user.hp -= Math.round(nme.user.level + dice(nme.user.level) + nme.user.str / 10 + (nme.user.str > 90 ? nme.user.str - 90 : 0))
                        if (nme.user.magic > 1)
                            nme.user.sp -= Math.round(nme.user.level + dice(nme.user.level) + nme.user.int / 10 + (nme.user.int > 90 ? nme.user.int - 90 : 0))
                        rpc.user.xp *= 2
                        vt.outln(Caster, PC.what(rpc, 'gain'), 'an experience level off ', recipient, '.')
                        if (rpc !== $.online && rpc.user.level + 1 < $.sysop.level && checkXP(rpc, gb)) return
                    }
                    break

                case 23:
                    if (backfire) {
                        if (rpc.user.magic > 2 && rpc.user.toAC > 0)
                            rpc.user.toAC--
                        else if (rpc.toAC > 0)
                            rpc.toAC -= dice(rpc.toAC)
                        else
                            rpc.toAC--
                        vt.outln(p1.His, isNaN(+rpc.user.armor) ? rpc.user.armor : 'defense', ' loses most of its effectiveness')
                    }
                    else {
                        vt.sound('shield')
                        vt.outln('A magical field glitters around ', isNaN(+rpc.user.armor) ? `${p1.his}${rpc.user.armor} ` : p1.him, '...')
                        if (rpc.user.magic > 2 && rpc.user.toAC >= 0)
                            rpc.user.toAC++
                        rpc.toAC += int(rpc.armor.ac / 2) + dice(rpc.armor.ac / 2)
                    }
                    rpc.altered = true
                    break

                case 24:
                    if (backfire) {
                        vt.outln(p1.His, isNaN(+rpc.user.weapon) ? rpc.user.weapon : 'attack', ' loses most of its effectiveness')
                        if (rpc.user.magic > 2 && rpc.user.toWC > 0)
                            rpc.user.toWC--
                        else if (rpc.toWC > 0)
                            rpc.toWC -= dice(rpc.toWC)
                        else
                            rpc.toWC--
                    }
                    else {
                        vt.sound('hone')
                        vt.outln(p1.His, isNaN(+rpc.user.weapon) ? rpc.user.weapon : 'attack', ' emanates magical sharpness')
                        if (rpc.user.magic > 2 && rpc.user.toWC >= 0)
                            rpc.user.toWC++
                        rpc.toWC += int(rpc.weapon.wc / 2) + dice(rpc.weapon.wc / 2)
                    }
                    rpc.altered = true
                    break
            }

            gb()
        }
    }

    export function melee(rpc: active, enemy: active, blow = 1) {
        const melee = Ring.power(enemy.user.rings, rpc.user.rings, 'melee', 'pc', rpc.user.pc).power * (rpc.user.melee + 1)
        const life = Ring.power(enemy.user.rings, rpc.user.rings, 'hp', 'pc', rpc.user.pc).power

        let action: string
        let hit = 0

        if ($.from !== 'Party' && rpc !== $.online && rpc.user.coward && !rpc.user.cursed && rpc.hp < (rpc.user.hp / 5)) {
            rpc.hp = -1
            vt.outln(vt.green, vt.bright
                , rpc.user.gender == 'I' ? 'The ' : '', rpc.user.handle, -600
                , vt.normal, ' runs away from ', -400, vt.faint, 'the battle!', -200)
            if ($.from == 'User') {
                rpc.user.blessed = ''
                rpc.user.coward = true
                rpc.user.cursed = $.player.id
                PC.save(rpc)
                news(`\tcursed ${rpc.user.handle} for running away`)
                log(rpc.user.id, `\n${enemy.user.handle} curses you for running away!\n`)
            }
            return
        }

        let n = rpc.dex
        if (blow == 1) {
            let m = (rpc.dex - enemy.dex)
            m = (m < -10) ? -10 : (m > 10) ? 10 : m
            n += m
            n = (n < 10) ? 10 : (n > 99) ? 99 : n
            n = 50 + int(n / 2)
        }
        else
            n -= $.player.melee * (blow - $.player.backstab + 1)

        // saving throw
        if (dice(100) > n) {
            if (blow == 1) {
                if (rpc === $.online) {
                    vt.outln('Your ', weapon(), ' passes through thin air.')
                    vt.sound('miss')
                    return
                }
                else {
                    vt.sound(rpc.user.melee < 2 ? 'whoosh' : rpc.user.gender == 'I' ? 'swoosh' : 'swords')
                    if (round[0].party && alive[1] > 1) vt.out(vt.faint, vt.Empty, vt.normal, ' ')
                    if (isNaN(+rpc.user.weapon))
                        vt.outln(p1.His, weapon(rpc), ' whistles by ', p2.you, '.')
                    else
                        vt.outln(p1.He, 'attacks ', p2.you, ', but misses.')
                    return
                }
            }
            else {
                vt.outln('Attempt fails!')
                vt.sound('miss')
                return
            }
        }

        // melee
        hit = int(rpc.str / 10) + melee
        hit += dice(rpc.user.level + melee)
        hit += rpc.user.melee * dice(rpc.user.level + melee)

        // excellent
        n = rpc.user.melee + melee + 1

        let period = ''
        let smash = 0
        while ((smash = dice(98 + n)) > 98) {
            for (; smash > 98; smash--) {
                hit += dice(rpc.user.level)
            }
            period += '!'
            n += melee + 1
        }
        if (!period) period = '.'
        hit *= 50 + int(rpc.user.str / 2) + melee
        hit = Math.round(hit / 100)

        // my stuff vs your stuff
        let wc = rpc.weapon.wc + rpc.user.toWC + rpc.toWC
        let ac = enemy.armor.ac + enemy.user.toAC + enemy.toWC
        wc = wc < 0 ? 0 : wc
        ac = ac < 0 ? 0 : ac

        hit += 2 * (wc + dice(wc))
        hit *= 50 + int(rpc.user.str / 2)
        hit = Math.round(hit / 100)
        hit -= ac + dice(ac)
        hit = (hit > 0) ? hit * blow : melee

        enemy.hp -= hit

        if (hit > 0) {
            if ($.from == 'Party' && enemy.hp <= 0) {
                enemy.hp = 0
                if (enemy === $.online) vt.sound('kill', 5)
                if (round[0].party) vt.out(vt.faint, '> ')
                vt.out(vt.bright, enemy === $.online ? vt.yellow : round[0].party == 0 ? vt.cyan : vt.magenta)
                vt.outln(p1.He, sprintf([
                    `${PC.what(rpc, 'make')}a fatal blow to %s`,
                    `${PC.what(rpc, 'blow')}%s away`,
                    `${PC.what(rpc, 'laugh')}then ${PC.what(rpc, 'kill')}%s`,
                    `easily ${PC.what(rpc, 'slay')}%s`,
                    `${PC.what(rpc, 'make')}minced-meat out of %s`,
                    `${PC.what(rpc, 'run')}%s through`
                ][dice(6) - 1], enemy.user.handle), '.', -500)
                return
            }

            action = (blow == 1)
                ? (period[0] == '.') ? rpc.weapon.hit : rpc.weapon.smash
                : (period[0] == '.') ? rpc.weapon.stab : rpc.weapon.plunge

            if (rpc === $.online) {
                if (!$.player.novice) {
                    let deed = $.mydeeds.find((x) => { return x.deed == 'melee' })
                    if (!deed) deed = $.mydeeds[$.mydeeds.push(Deed.load($.player.pc, 'melee')[0]) - 1]
                    if (hit > deed.value) {
                        deed.value = hit
                        Deed.save(deed, $.player)
                        vt.out(vt.yellow, '+', vt.white)
                    }
                }
                vt.out('You ', melee ? vt.uline : '', action, melee ? vt.nouline : '', ' ', p2.him)
            }
            else {
                let w = action.split(' ')
                if (w.length > 1) w.push('')
                if (round[0].party && alive[1] > 1) vt.out(vt.faint, vt.Empty, vt.normal, ' ')
                vt.out(p1.He, melee ? rpc.pc.color || vt.faint : '', PC.what(rpc, w[0]), w.slice(1).join(' ')
                    , vt.reset, p2.him)
            }

            vt.out(`for ${hit} hit points`)

            //  any bonus restore health from the hit off enemy?
            if (hit = life * dice(hit / 6) * dice(rpc.user.magic)) {
                if (rpc.hp + hit > rpc.user.hp) {
                    hit = rpc.user.hp - rpc.hp
                    if (hit < 0) hit = 0
                }
                if (hit) {
                    rpc.hp += hit
                    vt.out(' and ', PC.what(rpc, 'absorb'), vt.bright, vt.red, hit.toString(), vt.reset, ' off the hit')
                }
            }
        }
        else
            vt.out(isNaN(+rpc.user.weapon) ? `${p1.His}${weapon(rpc)} ` : p1.You
                , `${rpc === $.online ? 'do' : 'does'} not even scratch `, p2.you)

        vt.outln(period)
        vt.sleep(25)

        return
    }

    export function poison(rpc: active, cb?: Function) {
        if (rpc.user.id == $.player.id) {
            if (!$.player.poisons.length) {
                vt.outln(`\nYou don't have any poisons.`)
                vt.beep()
                cb(true)
                return
            }
            p1 = $.online.who
            vt.action('list')
            vt.form = {
                'poison': {
                    cb: () => {
                        vt.outln()
                        if (vt.entry == '') {
                            cb()
                            return
                        }
                        if (!Poison.have(rpc.user.poisons, int(vt.entry))) {
                            let okbyme = 0
                            for (let i in $.player.poisons) {
                                let skill = $.player.poison || 1
                                let vial = $.player.poisons[i]
                                vt.out(bracket(vial), Poison.merchant[vial - 1], ' '.repeat(20 - Poison.merchant[vial - 1].length))

                                let p = int(skill / 2)
                                let t = skill - p
                                p *= vial
                                t *= vial
                                let toWC = $.player.toWC, WC = $.online.toWC
                                if (p > 0 && toWC >= 0)     //  cannot augment a damaged weapon
                                    if (p >= toWC) toWC = p
                                if (t > 0) {
                                    if (toWC > 0)           //  apply buff to an augmented weapon
                                        WC = WC + t <= toWC ? WC + t
                                            : (skill == 3 && WC + int(t / 2) <= toWC) ? WC + t
                                                : t
                                    else                    //  apply buff to a damaged weapon
                                        WC = WC >= 0 ? t : WC + t
                                }

                                if (3 * (WC + toWC + 1) / skill > $.online.weapon.wc)
                                    vt.out(vt.yellow, ' ', $.player.emulation == 'XT' ? ' 💀' : 'XXX', ' ')
                                else {
                                    vt.out(vt.faint, ' -=> ', vt.normal)
                                    okbyme = vial
                                }
                                vt.out(buff(toWC, WC))
                            }
                            vt.outln()
                            if (/=|max/.test(vt.entry)) {
                                if (okbyme) apply(rpc, okbyme)
                            }
                            else {
                                vt.refocus()
                                return
                            }
                        }
                        else
                            apply(rpc, int(vt.entry))
                        cb(true)
                        return
                    }, prompt: ['Try vial', 'Make toxic', 'Apply poison', 'Use bane', 'Uti venenum'][$.player.poison] + ' (?=list): ', max: 3
                }
            }
            input('poison', 'max')
            return
        }

        if ((rpc.toWC + rpc.user.toWC) < int(rpc.weapon.wc / (6 - rpc.user.poison))) {
            let vial = dice(rpc.user.poisons.length) - 1
            if (vial) apply(rpc, rpc.user.poisons[vial])
        }

        function apply(rpc: active, vial: number) {
            let skill = rpc.user.poison || 1
            rpc.altered = true
            let p = int(skill / 2)
            let t = skill - p
            p *= vial
            t *= vial
            if (p > 0 && rpc.user.toWC >= 0)    //  cannot augment a damaged weapon
                if (p >= rpc.user.toWC) rpc.user.toWC = p
            if (t > 0) {
                if (rpc.user.toWC > 0)          //  apply buff to an augmented weapon
                    rpc.toWC = rpc.toWC + t <= rpc.user.toWC ? rpc.toWC + t
                        : (skill == 3 && rpc.toWC + int(t / 2) <= rpc.user.toWC) ? rpc.toWC + t
                            : t
                else                            //  apply buff to a damaged weapon
                    rpc.toWC = rpc.toWC >= 0 ? t : rpc.toWC + t
            }

            if (!Poison.have(rpc.user.poisons, vial) || whole(rpc.user.weapon) > 0) {
                vt.sound('ooze')
                vt.outln(vt.green, vt.bright, p1.He, PC.what(rpc, 'secrete'), 'a caustic ooze', vt.reset, buff(p, t), -400)
            }
            else {
                vt.sound('hone')
                vt.outln('\n', p1.He, PC.what(rpc, 'pour'), 'some ', vt.faint, Poison.merchant[vial - 1]
                    , vt.reset, ' on ', rpc.who.his, weapon(rpc), -400)
                if (/^[A-Z]/.test(rpc.user.id)) {
                    if (dice(3 * (rpc.toWC + rpc.user.toWC + 1)) / skill > rpc.weapon.wc) {
                        vt.outln(vt.bright, p1.His, rpc.user.weapon, ' vaporizes!')
                        if (rpc === $.online && $.online.weapon.wc > 1) vt.sound('crack', 6)
                        Weapon.equip(rpc, Weapon.merchant[0])
                    }
                }
                if (rpc.user.id !== $.player.id || (dice(skill) == 1 && dice(105 - rpc.cha) > 1)) {
                    Poison.remove(rpc.user.poisons, vial)
                    if (rpc.user.id == $.player.id)
                        vt.outln('You toss the empty vial aside.', -400)
                }
            }
        }
    }

    export function user(venue: string, cb: Function) {
        let start = $.player.level > 3 ? $.player.level - 3 : 1
        let end = $.player.level < 97 ? $.player.level + 3 : 99

        vt.action('freetext')
        vt.form = {
            'user': {
                cb: () => {
                    if (vt.entry == '?') {
                        vt.action('list')
                        vt.form['start'].prompt = 'Starting level ' + bracket(start, false) + ': '
                        input('start', '', 250)
                        return
                    }
                    let rpc: active = { user: { id: titlecase(vt.entry) } }
                    if (rpc.user.id[0] !== '_') {
                        if (!PC.load(rpc)) {
                            rpc.user.id = ''
                            rpc.user.handle = vt.entry
                            if (!PC.load(rpc)) {
                                vt.beep()
                                vt.out(' ?? ')
                            }
                        }
                        //  paint profile
                        if (rpc.user.id) {
                            vt.action('clear')
                            PC.portrait(rpc)
                            //  the inert player does not fully participate in the fun ...
                            if (/Bail|Brawl|Curse|Drop|Joust|Resurrect|Rob/.test(venue) && !rpc.user.xplevel) {
                                rpc.user.id = ''
                                vt.beep()
                                vt.out(' ', bracket('inactive', false))
                            }
                            else if (/Brawl|Fight|Joust|Resurrect/.test(venue) && rpc.user.status == 'jail') {
                                rpc.user.id = ''
                                vt.beep()
                                if ($.player.emulation == 'XT') vt.out(' 🔒')
                                vt.out(' ', bracket(rpc.user.status, false))
                            }
                        }
                    }
                    vt.outln()
                    cb(rpc)
                }, max: 22
            },
            'start': {
                cb: () => {
                    let n = whole(vt.entry)
                    if (n > 0 && n < 100) start = n
                    vt.form['end'].prompt = '  Ending level ' + bracket(end, false) + ': '
                    input('end', '99', 500)
                    return

                }
            },
            'end': {
                cb: () => {
                    let n = whole(vt.entry)
                    if (n >= start && n < 100) end = n

                    vt.outln()
                    vt.outln(vt.bright, vt.Blue, ` ID   Player's Handle          Class     Lvl      Last On       Access Level  `)
                    vt.outln(vt.Blue, '-'.repeat(78))

                    let rs = db.query(`
                        SELECT id, handle, pc, level, xplevel, status, lastdate, access FROM Players
                        WHERE id NOT GLOB '_*' AND xplevel > 0
                        AND level BETWEEN ${start} AND ${end}
                        ORDER BY xplevel DESC, level DESC, wins DESC, immortal DESC`)

                    for (let i in rs) {
                        if (rs[i].id == $.player.id)
                            continue

                        //  paint 'lesser' player
                        if ((+rs[i].xplevel !== +rs[i].level && +rs[i].xplevel < 2)) vt.out(vt.faint)
                        //  paint a target on any player that is winning
                        else if (rs[i].pc == PC.winning) vt.out(vt.yellow, vt.bright)
                        else vt.out(vt.reset)

                        vt.out(sprintf('%-4s  %-22s  %-9s', rs[i].id, rs[i].handle, rs[i].pc), vt.reset)

                        if (rs[i].status) vt.out(vt.faint)
                        vt.out(sprintf('  %3s  ', rs[i].xplevel ? rs[i].xplevel.toString() : vt.Empty))

                        vt.out(vt.reset, date2full(rs[i].lastdate), '  ', Access.name[rs[i].access].sysop ? vt.cyan : vt.faint, rs[i].access, vt.off)
                        if ($.player.emulation == 'XT' && Access.name[rs[i].access].emoji)
                            vt.out(' ', Access.name[rs[i].access].emoji)
                        vt.outln()
                    }

                    if ($.access.roleplay
                        && dice(+$.player.expert * ($.player.immortal + 1) * $.player.level) == 1)
                        vt.outln('\n', vt.green, '> ', vt.bright, 'double-click (tap) the Player ID to pick your selection.')

                    vt.action('freetext')
                    input('user', elemental[venue] || $.player.id)
                    return
                }
            }
        }
        vt.form['user'].prompt = venue + ' what user (?=list): '
        input('user', '?')
    }

    export function yourstats(full = true) {
        vt.out(vt.reset)
        vt.out(vt.cyan, 'Str:', vt.bright, $.online.str > $.player.str ? vt.yellow : $.online.str < $.player.str ? vt.red : vt.white)
        vt.out(sprintf('%3d', $.online.str), vt.reset, sprintf(' (%d,%d)   ', $.player.str, $.player.maxstr))
        vt.out(vt.cyan, 'Int:', vt.bright, $.online.int > $.player.int ? vt.yellow : $.online.int < $.player.int ? vt.red : vt.white)
        vt.out(sprintf('%3d', $.online.int), vt.reset, sprintf(' (%d,%d)   ', $.player.int, $.player.maxint))
        vt.out(vt.cyan, 'Dex:', vt.bright, $.online.dex > $.player.dex ? vt.yellow : $.online.dex < $.player.dex ? vt.red : vt.white)
        vt.out(sprintf('%3d', $.online.dex), vt.reset, sprintf(' (%d,%d)   ', $.player.dex, $.player.maxdex))
        vt.out(vt.cyan, 'Cha:', vt.bright, $.online.cha > $.player.cha ? vt.yellow : $.online.cha < $.player.cha ? vt.red : vt.white)
        vt.outln(sprintf('%3d', $.online.cha), vt.reset, sprintf(' (%d,%d)', $.player.cha, $.player.maxcha))
        vt.out(vt.cyan, 'Hit points: '
            , vt.bright, $.online.hp > $.player.hp ? vt.yellow : $.online.hp == $.player.hp ? vt.white : vt.red, $.online.hp.toString()
            , vt.reset, '/', $.player.hp.toString()
        )
        if ($.player.sp) {
            vt.out(vt.cyan, '   Spell points: '
                , vt.bright, $.online.sp > $.player.sp ? vt.yellow : $.online.sp == $.player.sp ? vt.white : vt.red, $.online.sp.toString()
                , vt.reset, '/', $.player.sp.toString()
            )
        }
        if ($.player.coin.value) vt.out(vt.cyan, '   Coin: ', $.player.coin.carry(4))
        vt.outln()
        vt.outln(vt.cyan, 'Weapon: ', weapon(), vt.cyan, '   Armor: ', armor())

        if (full) {
            PC.portrait()
            rings()
        }
    }

}

export = Battle
