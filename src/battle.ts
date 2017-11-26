/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  BATTLE authored by: Robert Hurst <theflyingape@gmail.com>                *
\*****************************************************************************/

import fs = require('fs')
import {sprintf} from 'sprintf-js'

import $ = require('./common')
import xvt = require('xvt')

module Battle
{
    export let fini: Function
    export let from: string
    export let parties: [ active[] ]
    export let alive: number[]
    export let round: { party:number, member:number, react:number }[]
    export let bs: number
    export let retreat: boolean
    export let teleported: boolean
    export let volley: number

//  start a new battle engagement:
//    do rounds: attack() with possibly backstab or poison
//       per member: next() for cast, melee, or retreat
//    until spoils()
export function engage(module:string, party: active|active[], mob: active|active[], cb:Function) {

    //  process parameters
    from = module
    
    if (xvt.validator.isArray(party))
        parties = [ <active[]>party ]
    else {
        let a:active[] = new Array(<active>party)
        parties = [ a ]
    }

    if (xvt.validator.isArray(mob))
        parties.push(<active[]>mob)
    else {
        let b:active[] = new Array(<active>mob)
        parties.push(b)
    }

    fini = cb

    //  initialize for first encounter in engagement
    alive = [ parties[0].length, parties[1].length ]
    round = []
    retreat = false
    teleported = false
    volley = 0

    attack()
}

//  new round of volleys
export function attack(retry = false) {
//console.log('#', round, ' : attack(', retry, ')')
    //  no more attacking
    if (retreat || teleported || ++volley > 99999) {
        if ($.online.confused)
            $.activate($.online, false, true)
        fini()
        return
    }

    if (!round.length) {
        if (volley > 1) {
            xvt.out(xvt.reset, '\n')
            if (!$.online.hp) xvt.waste(900)
            xvt.out('    -=', $.bracket('*', false), '=-\n')
        }

        for (let p in parties) {
            for (let m in parties[p]) {
                if (parties[p][m].hp > 0) {
                    let rpc = parties[p][m]
                    let x = 4 - rpc.user.backstab / 2
                    let s = Math.round(rpc.user.level / (x > 0 ? x : 1) + rpc.dex / 2 + $.dice(rpc.dex / 2))
                    round.push({party:+p, member:+m, react:+s})
                }
            }
        }
        round.sort((n1,n2) => n2.react - n1.react)
    }

    let n = round[0]
    let rpc = parties[n.party][n.member]
    if (rpc.hp < 1 || rpc.user.xplevel < 1) {
        next()
        return
    }

    //  recovery?
    if (rpc.confused) {
        let mod = rpc.user.blessed ? 10 : rpc.user.cursed ? -10 : 0
        rpc.int = $.PC.ability(rpc.int, $.PC.card(rpc.user.pc).toInt, rpc.user.maxint, mod)
        rpc.dex = $.PC.ability(rpc.dex, $.PC.card(rpc.user.pc).toDex, rpc.user.maxdex, mod)
    }

    //  choose an opponent
    let mob = n.party ^ 1
    let nme: number
    do { nme = $.dice(parties[mob].length) - 1 } while (parties[mob][nme].hp < 1)
    let enemy = parties[mob][nme]

    if (rpc.user.id === $.player.id) {
        $.action('battle')
        xvt.app.form = {
            'attack': {cb:() => {
                xvt.out('\n')
                if (/C/i.test(xvt.entry)) {
                    Battle.cast($.online, next, enemy)
                    return
                }

                xvt.out('\n')
                if (/R/i.test(xvt.entry)) {
                    if (from === 'Taxman') {
                        xvt.out('"You can never escape the taxman!"\n')
                        xvt.app.refocus
                        return
                    }
                    if(from === 'Tiny') {
                        xvt.out('"You try to escape, but the crowd throws you back to witness the slaughter!"\n')
                        xvt.app.refocus
                        return
                    }

                    let trip = rpc.dex + $.dice(rpc.int) / 2
                    trip += Math.round((rpc.dex - enemy.dex) / 2)
                    trip = trip < 5 ? 5 : trip > 95 ? 95 : trip
                    trip += 5 * (alive[0] - alive[1])
                    trip = trip < 5 ? 5 : trip > 95 ? 95 : trip
                    if ($.dice(100) > trip) {
                        let who = (enemy.user.gender === 'I' ? 'The ' : '') + enemy.user.handle
                        xvt.out([
                            'You trip and fail in your attempt to retreat.',
                            `${who} pulls you back into the battle.`,
                            `${who} prevents your retreat and says, "I'm not through with you yet!"`,
                            `${who} outmaneuvers you and says, "You started this, I'm finishing it."`,
                            `${who} blocks your path and says, "Where do you want to go today?"`,
                        ][$.dice(5) - 1]
                        , '\n'
                        )
                        next()
                        return
                    }

                    retreat = true
                    $.player.retreats++
                    let who = $.player.gender === 'F' ? 'She' : 'He'
                    xvt.out([
                            'You are successful in your attempt to retreat.',
                            'You limp away from the battle.',
                            'You decide this isn\'t worth the effort.',
                            'You listen to the voice in your head yelling, \"Run!\"',
                            `You say, "${who} who fights and runs away lives to fight another day!"`
                        ][$.dice(5) - 1]
                        , '\n'
                    )
                    if ($.online.confused)
                        $.activate($.online, false, true)
                    fini()
                    return
                }

                if (/Y/i.test(xvt.entry)) {
                    yourstats()
                    xvt.app.refocus()
                    return
                }

                xvt.out(xvt.bright, xvt.white)
                melee(rpc, enemy)
                next()
                return
            }, enter:'A', cancel:'R', eol:false, max:1, match:/A|C|R|Y/i },
            'backstab': {cb:() => {
                if (/N/i.test(xvt.entry)) bs = 1
                xvt.out('\n\n', xvt.bright, xvt.white)
                melee(rpc, enemy, bs)
                next()
                return
            }, cancel:'N', enter:'Y', eol:false, max:1, match:/Y|N/i}
        }

        //  sneaking
        if (volley == 1) {
            bs = $.player.backstab
            let roll = $.dice(100 + bs * $.player.level / 5)
            bs += (roll < bs) ? -1 : (roll > 99) ? +1 : 0
            do {
                roll = $.dice(100 + bs * $.player.backstab)
                bs += (roll == 1) ? -1 : (roll > 99) ? $.dice($.player.backstab) : 0
            } while (roll == 1 || roll > 99)
            if (bs > 1) {
                $.action('yn')
                xvt.app.form['backstab'].prompt = 'Attempt to backstab'
                    + (bs > 2 && bs != $.player.backstab ? ' for ' + bs.toString() + 'x' : '')
                    + ' (Y/N)? '
                xvt.app.focus = 'backstab'
                return
            }
            else {
                xvt.out('\n', xvt.bright)
            }
            melee(rpc, enemy)
        }
        else {
            let choices = xvt.attr(xvt.reset, xvt.blue, '[')
            choices += xvt.attr(xvt.bright
                , $.online.hp > $.player.hp * 2 / 3 ? xvt.green
                : $.online.hp > $.player.hp / 3 ? xvt.yellow
                : xvt.red
                , $.online.hp.toString()
                , xvt.cyan, ','
                , enemy.hp > enemy.user.hp * 2 / 3 ? xvt.green
                : enemy.hp > enemy.user.hp / 3 ? xvt.yellow
                : xvt.red
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
            choices += xvt.attr(xvt.blue, '] ')
            bs = 1

            xvt.app.form['attack'].prompt = choices + xvt.attr(
                $.bracket('A', false), xvt.cyan, 'ttack, ')
            if ($.player.magic && $.player.spells.length)
                xvt.app.form['attack'].prompt += xvt.attr($.bracket('C', false), xvt.cyan, 'ast spell, ')
            xvt.app.form['attack'].prompt += xvt.attr($.bracket('R', false), xvt.cyan, 'etreat, '
                , $.bracket('Y', false), xvt.cyan, 'our status: ')
            xvt.app.focus = 'attack'
            return
        }
    }
    else {  //  NPC
        if (volley == 1 && $.dice((100 - rpc.user.level) / 12 + 6) < rpc.user.poison)
            poison(rpc)

        //  might or magic?
        let mm: number = 0
        let nest: number = 0
        let odds: number = from === 'Party' ? 5 : from === 'Dungeon' ? 4 : from === 'Monster' ? 3 : 2

        if (rpc.user.magic == 1 && $.dice(odds) > 1) {
            if ($.Magic.have(rpc.user.spells, 8)
                && rpc.hp < rpc.user.hp / 6
                && $.dice(6 - enemy.user.melee) == 1)
                    mm = 8
            else if ($.Magic.have(rpc.user.spells, 7)
                    && rpc.hp < (rpc.user.hp >>1)
                    && $.dice(enemy.user.melee + odds) > 1)
                    mm = 7
            else if ($.Magic.have(rpc.user.spells, 9)
                    && rpc.hp < (rpc.user.hp >>1)
                    && $.dice(enemy.user.melee + odds) > 1)
                    mm = 9
            else if ($.Magic.have(rpc.user.spells, 11)
                    && rpc.hp > (rpc.user.hp >>1)
                    && $.dice(enemy.user.melee + odds) == 1)
                    mm = 11
            else if ($.Magic.have(rpc.user.spells, 13)
                    && rpc.hp < (rpc.user.hp / 6)
                    && $.dice((rpc.user.level - enemy.user.level) / 9 + odds) == 1)
                    mm = 13
            else if (!rpc.confused) {
                if ($.Magic.have(rpc.user.spells, 14)
                    && rpc.hp > (rpc.user.hp >>1)
                    && $.dice((rpc.user.level - enemy.user.level) / 9 + odds) == 1)
                        mm = 14
                else if ($.Magic.have(rpc.user.spells, 12)
                    && rpc.hp > (rpc.user.hp >>1)
                    && $.dice((rpc.user.level - enemy.user.level) / 9 + odds) == 1)
                        mm = 12
                else if ($.Magic.have(rpc.user.spells, 15)
                    && rpc.hp > (rpc.user.hp >>1)
                    && $.dice(nest + (rpc.user.level - enemy.user.level) / 9 + odds) == 1)
                        mm = 15
                else if ($.Magic.have(rpc.user.spells, 16)
                    && rpc.hp == rpc.user.hp
                    && $.dice(nest + (rpc.user.level - enemy.user.level) / 9 + odds) == 1)
                    mm = 16
            }
        }
        if (rpc.user.magic > 1) {
            if (!rpc.confused) {
                if ($.Magic.have(rpc.user.spells, 15)
                    && rpc.sp >= $.Magic.power(rpc, 15)
                    && $.dice((rpc.user.level - enemy.user.level) / 9 + odds) == 1)
                        mm = 15
                else if ($.Magic.have(rpc.user.spells, 16)
                    && rpc.sp >= $.Magic.power(rpc, 16)
                    && $.dice((rpc.user.level - enemy.user.level) / 9 + odds) == 1)
                        mm = 16
                else if ($.Magic.have(rpc.user.spells, 11)
                    && rpc.sp >= $.Magic.power(rpc, 11)
                    && $.dice(6 - enemy.user.magic) == 1)
                        mm = 11
                else if ($.Magic.have(rpc.user.spells, 14)
                    && rpc.sp >= $.Magic.power(rpc, 14)
                    && $.dice((rpc.user.level - enemy.user.level) / 9 + odds) == 1)
                        mm = 14
                else if ($.Magic.have(rpc.user.spells, 12)
                    && rpc.sp >= $.Magic.power(rpc, 12)
                    && $.dice((rpc.user.level - enemy.user.level) / 9 + odds) == 1)
                        mm = 12
            }
            if (!mm) {
                if ($.Magic.have(rpc.user.spells, 13)
                    && rpc.sp >= $.Magic.power(rpc, 13)
                    && rpc.hp < rpc.user.hp / 5)
                        mm = 13
                else if ($.Magic.have(rpc.user.spells, 8)
                    && rpc.sp >= $.Magic.power(rpc, 8)
                    && rpc.hp < rpc.user.hp / 6 && $.dice(enemy.user.level - rpc.user.level / 9) == 1)
                        mm = 8
                else if ($.Magic.have(rpc.user.spells, 7)
                    && rpc.sp >= $.Magic.power(rpc, 7)
                    && rpc.hp < (rpc.user.hp >>1)
                    && ($.dice(enemy.user.melee + 2) == 1 || rpc.sp < $.Magic.power(rpc, 8)))
                        mm = 7
                else if ($.Magic.have(rpc.user.spells, 9)
                    && rpc.sp >= $.Magic.power(rpc, 9)
                    && $.dice(enemy.user.melee + 2) > 1)
                        mm = 9
            }
        }
        if (rpc.user.magic && !mm && $.dice(odds) == 1) {
            switch ($.dice(3)) {
                case 1:
                    if ($.Magic.have(rpc.user.spells, 17)
                        && rpc.sp >= $.Magic.power(rpc, 17))
                        mm = 17
                    break
                case 2:
                    if ($.Magic.have(rpc.user.spells, 18)
                        && rpc.sp >= $.Magic.power(rpc, 18))
                        mm = 18
                    break
                case 3:
                    if ($.Magic.have(rpc.user.spells, 19)
                        && rpc.sp >= $.Magic.power(rpc, 19))
                        mm = 19
                    break
            }
        }

        xvt.out(xvt.reset)

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
        fini()
    }
}

export function spoils() {
    let winner: active
    let loser: active
    let l: number
    let w: number

    if ($.online.confused)
        $.activate($.online, false, true)

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
    
    // had a little help from my friends (maybe)
    if (from === 'Party') {
        $.sqlite3.exec(`UPDATE Gangs SET win = win + 1 WHERE name = '${parties[w][0].user.gang}'`)
        $.sqlite3.exec(`UPDATE Gangs SET loss = loss + 1 WHERE name = '${parties[l][0].user.gang}'`)

        // player(s) can collect off each corpse
        let tl = [ 1, 1 ]
        let take: number = 0
        let coin = new $.coins(0)

        for (let m in parties[w]) {
            tl[w] += parties[w][m].user.xplevel
            if (parties[w][m].hp > 0)
                take += parties[w][m].user.xp
        }

        for (let m in parties[l]) {
            // accrue benefits off of defeated players only
            if ((loser = parties[l][m]).hp == 0) {
                tl[l] += loser.user.xplevel
                coin.value += loser.user.coin.value
                $.log(loser.user.id, `\n${winner.user.gang} defeated ${loser.user.gang}, started by ${$.player.handle}`)
                if (loser.user.coin.value)
                    $.log(loser.user.id, `You lost ${loser.user.coin.carry()} you were carrying.`)
                loser.user.coin.value = 0
                $.saveUser(loser)
            }
        }

        for (let m in parties[w]) {
            //  dead men get far less of the booty, taxman always gets a cut
            let cut = parties[w][m].hp > 0 ? 0.95 : 0.15
            let award = Math.trunc(coin.value * parties[w][m].user.xp / take * cut)
            parties[w][m].user.coin.value += award
            coin.value -= award
            take -= Math.trunc(parties[w][m].user.xp * cut)

            let xp = Math.trunc($.experience(parties[w][m].user.xplevel)
                * tl[l] / tl[w] / ((4 + parties[w].length - parties[l].length) / 2))
            parties[w][m].user.xp += xp

            if (parties[w][m] === $.online) {
                if (xp) xvt.out('\nYou get ', sprintf(xp < 1e+8 ? '%d' : '%.7e', xp), ' experience.\n')
                if (award)
                    xvt.out('You get your cut worth ', new $.coins(award).carry(), '.\n')
                xvt.waste(500)
            }
            else {
                $.log(parties[w][m].user.id, `\n${winner.user.gang} defeated ${loser.user.gang}, started by ${$.player.handle}`)
                $.log(parties[w][m].user.id, `You got ${sprintf(xp < 1e+8 ? '%d' : '%.7e', xp)} experience and ${new $.coins(award).carry()}.`)
                $.saveUser(parties[w][m])
            }
        }

        if (coin.value) {
            $.loadUser($.taxman)
            $.taxman.user.bank.value += coin.value
            $.saveUser($.taxman)
            xvt.out(xvt.reset, '\n')
            $.beep()
            xvt.out($.taxman.user.handle, ' took ', $.who($.taxman, 'his'), 'cut worth ', coin.carry(), '.\n')
            xvt.waste(1000)
        }

        if (winner === $.online) {
            $.news(`\tdefeated the gang, ${parties[l][0].user.gang}`)
            $.wall(`defeated the gang, ${parties[l][0].user.gang}`)
        }
        else if ($.online.hp == 0)
            $.reason = `defeated by the gang, ${parties[w][0].user.gang}`
        return
    }

    if (l) {
        // player can collect off each corpse
        let xp: number = 0
        let coin = new $.coins(0)

        for (let m in parties[l]) {
            // defeated?
            if ((loser = parties[l][m]).hp == 0) {
                if (/Monster|User/.test(from)) {
                    loser.altered = true
                    loser.user.status = winner.user.id
                    // dungeon: modf(EXP(RPC[1][i]->user.ExpLevel - 1.) / (20. - (1.5 * (double)nest)), &d);
                    // user: modf(EXP(ENEMY.ExpLevel - 1) /3., &d);
                    let x = loser.user.id ? 2 : 3
                    xp += $.experience(loser.user.xplevel, x)
                    if (winner.user.level < loser.user.xplevel)
                        loser.user.xplevel = winner.user.level
                }
                else {
                    xp += $.experience(loser.user.xplevel, 12)
                }
                if (loser.user.coin.value) {
                    coin.value += loser.user.coin.value
                    loser.user.coin.value = 0
                    loser.altered = true
                }
                if (from !== 'User') {
                    let credit = new $.coins(loser.weapon.value)
                    credit.value = $.worth(credit.value, winner.cha)
                    let result = $.Weapon.swap(winner, loser, credit)
                    if (xvt.validator.isBoolean(result) && result)
                        xvt.out($.who(winner, 'He'), $.what(winner, 'take'), $.who(loser, 'his'), winner.user.weapon, '.\n')
                    else if (from === 'Monster' && result)
                        xvt.out($.who(winner, 'He'), $.what(winner, 'get'), credit.carry(), ' for ', $.who(loser, 'his'), loser.user.weapon, '.\n')

                    credit = new $.coins(loser.armor.value)
                    credit.value = $.worth(credit.value, winner.cha)
                    result = $.Armor.swap(winner, loser, credit)
                    if (xvt.validator.isBoolean(result) && result)
                        xvt.out($.who(winner, 'He'), 'also ', $.what(winner, 'take'), $.who(loser, 'his'), winner.user.armor, '.\n')
                    else if (from === 'Monster' && result)
                        xvt.out($.who(winner, 'He'), 'also ', $.what(winner, 'get'), credit.carry(), ' for ', $.who(loser, 'his'), loser.user.armor, '.\n')
                }
                else {
                    $.log(loser.user.id, `\n${$.player.handle} killed you!`)
                    if ($.Weapon.swap(winner, loser)) {
                        xvt.out($.who(winner, 'He'), $.what(winner, 'take'), $.who(loser, 'his'), winner.user.weapon, '.\n')
                        $.log(loser.user.id, `... and took your ${winner.user.weapon}.`)
                    }
                    if ($.Armor.swap(winner, loser)) {
                        xvt.out($.who(winner, 'He'), 'also ', $.what(winner, 'take'), $.who(loser, 'his'), winner.user.armor, '.\n')
                        $.log(loser.user.id, `... and took your ${winner.user.armor}.`)
                    }
                    $.unlock(loser.user.id)
                    xvt.out(1000)
                }
                if (loser.altered)
                    if (!(loser.user.id[0] === '_' && loser.user.gender === 'I'))
                        $.saveUser(loser)
            }
        }
        if (xp) {
            winner.user.xp += xp
            xvt.out('You get'
                , parties[l].length > 1 ? ' a total of ' : ' '
                , sprintf(xp < 1e+8 ? '%d' : '%.7e', xp), ' experience.\n'
            )
        }
        if (coin.value) {
            winner.user.coin.value += coin.value
            xvt.out('You get'
                , parties[l].length > 1 ? ' a total of ' : ' '
                , coin.carry(), ' '
                , parties[l].length > 1 ? 'they were ' : $.who(loser, 'he') + 'was '
                , 'carrying.\n'
            )
        }
        winner.user.coward = false
        if (winner.user.cursed) {
            loser.user.cursed = winner.user.id
            winner.user.cursed = ''
            xvt.out(xvt.bright, xvt.black, 'A dark cloud has lifted and shifted.\n', xvt.reset)
            xvt.waste(1000)
            winner.str = $.PC.ability(winner.str, 10, winner.user.maxstr)
            winner.int = $.PC.ability(winner.int, 10, winner.user.maxint)
            winner.dex = $.PC.ability(winner.dex, 10, winner.user.maxdex)
            winner.cha = $.PC.ability(winner.cha, 10, winner.user.maxcha)
        }
        if (loser.user.blessed) {
            winner.user.blessed = loser.user.id
            loser.user.blessed = ''
            xvt.out(xvt.bright, xvt.yellow, 'A shining aura surrounds you.\n', xvt.reset)
            xvt.waste(1000)
            winner.str = $.PC.ability(winner.str, 10, winner.user.maxstr, 10)
            winner.int = $.PC.ability(winner.int, 10, winner.user.maxint, 10)
            winner.dex = $.PC.ability(winner.dex, 10, winner.user.maxdex, 10)
            winner.cha = $.PC.ability(winner.cha, 10, winner.user.maxcha, 10)
        }
    }
    else {
        if (winner.user.id) {
            $.log(winner.user.id, `\nYou killed ${$.player.handle}!`)
            if ($.player.blessed) {
                winner.user.blessed = $.player.id
                $.player.blessed = ''
                xvt.out(xvt.bright, xvt.yellow, 'Your shining aura leaves you.\n', xvt.reset)
                xvt.waste(1000)
            }
            if ($.Weapon.swap(winner, $.online)) {
                xvt.out($.who(winner, 'He'), $.what(winner, 'take'), $.who($.online, 'his'), winner.user.weapon, '.\n')
                $.log(winner.user.id, `You upgraded to ${winner.user.weapon}.`)
            }
            if ($.Armor.swap(winner, loser)) {
                xvt.out($.who(winner, 'He'), 'also ', $.what(winner, 'take'), $.who($.online, 'his'), winner.user.armor, '.\n')
                $.log(winner.user.id, `You upgraded to ${winner.user.armor}.`)
            }
            if (winner.user.cursed) {
                $.player.cursed = winner.user.id
                winner.user.cursed = ''
                xvt.out(xvt.bright, xvt.black, 'A dark cloud hovers over you.\n', xvt.reset)
                xvt.waste(1000)
            }
        }
        if ($.player.coin.value) {
            winner.user.coin.value += $.player.coin.value
            xvt.out($.who(winner, 'He'), 'gets ', $.player.coin.carry(), ' you were carrying.\n')
            $.player.coin.value = 0
            $.online.altered = true
        }
        $.saveUser(winner)
        $.unlock(winner.user.id)
        xvt.out(1000)
    }
}

export function cast(rpc: active, cb:Function, nme?: active, magic?: number) {
    if (!rpc.user.magic || !rpc.user.spells.length) {
        if (rpc.user.id === $.player.id) {
            xvt.out('You don\'t have any magic.\n')
            cb(true)
        }
        else {
            xvt.out('cast() failure -- ', rpc)
            cb()
        }
        return
    }

    if (rpc.user.id === $.player.id) {
        $.action('list')
        xvt.app.form = {
            'magic': { cb: () => {
                xvt.out('\n')
                if (xvt.entry === '') {
                    cb(true)
                    return
                }
                if (!$.Magic.have(rpc.user.spells, +xvt.entry)) {
                	for (let i in $.player.spells) {
                        let p = $.player.spells[i]
                        let spell = Object.keys($.Magic.spells)[p - 1]
                        if (rpc.user.magic == 1) {
                            xvt.out($.bracket(p)
                                , sprintf('%-18s  (%d%%)'
                                , spell
                                , $.Magic.ability(spell, rpc, nme).fail)
                            )
                        }
                        else {
                            xvt.out($.bracket(p)
                                , sprintf('%-18s  %4d  (%d%%)'
                                , spell
                                , rpc.user.magic < 4 ? $.Magic.spells[spell].mana : $.Magic.spells[spell].enchanted
                                , $.Magic.ability(spell, rpc, nme).fail)
                            )
                        }
                    }
                    xvt.out('\n')
                    xvt.app.refocus()
                }
                else {
                    xvt.out('\n')
                    invoke(Object.keys($.Magic.spells)[+xvt.entry - 1])
                }
            }, prompt:['Use wand', 'Read scroll', 'Cast spell', 'Uti magicae'][$.player.magic - 1] + ' (?=list): ', max:2 }
        }
        xvt.app.focus = 'magic'
        return
    }
    else {
//console.log('cast(', magic.toString(), ')')
        invoke(Object.keys($.Magic.spells)[magic - 1])
    }

    function invoke(name: string) {
        let spell = $.Magic.spells[name]
        if (rpc !== $.online)
            xvt.waste(200)

        if (rpc.user.magic > 1)
            if (rpc.sp < $.Magic.power(rpc, spell.cast)) {
                if (rpc === $.online) xvt.out('You don\'t have enough power to cast that spell!\n')
                cb(true)
                return
            }

        //  some sensible ground rules to avoid known muling exploits (by White Knights passing gas)
        if (xvt.validator.isDefined(nme)) {
            if ([ 1,2,3,4,5,6,10,23,24 ].indexOf(spell.cast) >= 0) {
                if (rpc === $.online) xvt.out('You cannot cast that spell during a battle!\n')
                cb(true)
                return
            }
            if (nme.user.novice && [ 12,15,16,20,21,22 ].indexOf(spell.cast) >= 0) {
                if (rpc === $.online) xvt.out('You cannot cast that spell on a novice player.\n')
                cb(true)
                return
            }
        }
        else {
            if ([ 9,11,12,14,15,16,17,18,19,20,21,22 ].indexOf(spell.cast) >= 0) {
                if (rpc === $.online) xvt.out('You cannot cast that spell on yourself!\n')
                cb(true)
                return
            }
        }

        if (rpc.sp)
            rpc.sp -= rpc.user.magic < 4 ? spell.mana : spell.enchanted

        if (rpc.user.magic == 1 && $.dice(100) < 50 + (spell.cast < 17 ? 2 * spell.cast : 2 * spell.cast - 16)) {
            rpc.altered = true
            $.Magic.remove(rpc.user.spells, spell.cast)
            xvt.out($.who(rpc, 'His'), 'wand smokes as ', $.who(rpc, 'he'), $.what(rpc, 'cast'), 'the spell.\n')
            xvt.waste(300)
        }

        //  Tigress prefers the Ranger (and Paladin) class, because it comes with a coupon and a better warranty
        if (rpc.user.magic == 2 && $.dice(5 + +xvt.validator.isDefined($.Access.name[rpc.user.access].sysop)) == 1) {
            rpc.altered = true
            $.Magic.remove(rpc.user.spells, spell.cast)
            xvt.out($.who(rpc, 'His'), 'scroll burns as ', $.who(rpc, 'he'), $.what(rpc, 'cast'), 'the spell.\n')
            xvt.waste(300)
        }
    
        let backfire = false

        if ($.dice(100) > $.Magic.ability(name, rpc, nme).fail) {
            if ((backfire = $.dice(100) > $.Magic.ability(name, rpc, nme).backfire)) {
                xvt.out('Oops!  ', xvt.reset, $.who(rpc, 'His'), 'spell backfires!\n')
                $.sound('oops', 4)
            }
            else {
                xvt.out('Fssst!  ', xvt.reset, $.who(rpc, 'His'), 'spell fails!\n')
                $.sound('fssst', 4)
                cb()
                return
            }
        }

        let mod = rpc.user.blessed ? 10 : 0
        mod = rpc.user.cursed ? mod - 10 : mod

        switch(spell.cast) {
        case 1:
            if (backfire) {
                rpc.str = $.PC.ability(rpc.str, -$.dice(10))
                xvt.out(`You feel weaker (${rpc.str})\n`)
            }
            else {
                if ((rpc.str = $.PC.ability(rpc.str, $.dice(10), rpc.user.maxstr, mod)) < rpc.user.maxstr)
                    xvt.out(`You feel much more stronger (${rpc.str})\n`)
                else
                    xvt.out(`This game prohibits the use of steroids.\n`)
            }
            break

        case 2:
            if (backfire) {
                rpc.int = $.PC.ability(rpc.int, -$.dice(10))
                xvt.out(`You feel stupid (${rpc.int})\n`)
            }
            else {
                if ((rpc.int = $.PC.ability(rpc.int, $.dice(10), rpc.user.maxint, mod)) < rpc.user.maxint)
                    xvt.out(`You feel much more intelligent (${rpc.int})\n`)
                else
                    xvt.out(`Get on with it, professor!\n`)
            }
            break

        case 3:
            if (backfire) {
                rpc.dex = $.PC.ability(rpc.dex, -$.dice(10))
                xvt.out(`You feel clumsy (${rpc.dex})\n`)
            }
            else {
                if ((rpc.dex = $.PC.ability(rpc.dex, $.dice(10), rpc.user.maxdex, mod)) < rpc.user.maxdex)
                    xvt.out(`You feel much more agile (${rpc.dex})\n`)
                else
                    xvt.out(`Y'all shakin' and bakin'.\n`)
            }
            break

        case 4:
            if (backfire) {
                rpc.cha = $.PC.ability(rpc.cha, -$.dice(10))
                xvt.out(`You feel depressed (${rpc.cha})\n`)
            }
            else {
                if ((rpc.cha = $.PC.ability(rpc.cha, $.dice(10), rpc.user.maxcha, mod)) < rpc.user.maxcha)
                    xvt.out(`You feel much more charismatic (${rpc.cha})\n`)
                else
                    xvt.out(`Stop being so vain.\n`)
            }
            break

        case 5:
            if (backfire) {
                if (rpc.user.magic > 2 && rpc.user.toAC > 0)
                    rpc.user.toAC--
                else if(rpc.toAC > 0)
                    rpc.toAC -= $.dice(rpc.toAC)
                else
                    rpc.toAC--
                xvt.out($.who(rpc, 'His'), isNaN(+rpc.user.armor) ? rpc.user.armor : 'defense', ' loses some of its effectiveness.\n')
            }
            else {
                $.sound('shield')
                xvt.out('A magical field shimmers around ', rpc.user.armor ? $.who(rpc, 'his') + rpc.user.armor : $.who(rpc, 'him'), '.\n')
                if (rpc.user.magic > 2 && rpc.user.toAC >= 0)
                    rpc.user.toAC++
                rpc.toAC++
            }
            if (-rpc.user.toAC >= rpc.armor.ac || -(rpc.user.toAC + rpc.toAC) >= rpc.armor.ac) {
                xvt.out($.who(rpc, 'His'), isNaN(+rpc.user.armor) ? rpc.user.armor : 'defense', ' crumbles!\n')
                $.Armor.equip(rpc, $.Armor.merchant[0])
            }
            if ($.dice(3 * (rpc.user.toAC + rpc.toAC + 1) / rpc.user.magic) >>0 > rpc.armor.ac) {
                xvt.out($.who(rpc, 'His'), isNaN(+rpc.user.armor) ? rpc.user.armor : 'defense', ' vaporizes!\n')
                $.Armor.equip(rpc, $.Armor.merchant[0])
            }
            rpc.altered = true
            break

        case 6:
            if (backfire) {
                xvt.out($.who(rpc, 'His'), rpc.user.weapon ? rpc.user.weapon : 'attack', ' loses some of its effectiveness.\n')
                if (rpc.user.magic > 2 && rpc.user.toWC > 0)
                    rpc.user.toWC--
                else if(rpc.toWC > 0)
                    rpc.toWC -= $.dice(rpc.toWC)
                else
                    rpc.toWC--
            }
            else {
                $.sound('hone')
                xvt.out($.who(rpc, 'His'), rpc.user.weapon ? rpc.user.weapon : 'attack', ' glows with magical sharpness.\n')
                if (rpc.user.magic > 2 && rpc.user.toWC >= 0)
                    rpc.user.toWC++
                rpc.toWC++
            }
            if (-rpc.user.toWC >= rpc.weapon.wc || -(rpc.user.toWC + rpc.toWC) >= rpc.weapon.wc) {
                xvt.out($.who(rpc, 'His'), rpc.user.weapon ? rpc.user.weapon : 'attack', ' crumbles!\n')
                $.Weapon.equip(rpc, $.Weapon.merchant[0])
            }
            if ($.dice(3 * (rpc.user.toWC + rpc.toWC + 1) / rpc.user.magic) >>0 > rpc.weapon.wc) {
                xvt.out($.who(rpc, 'His'), rpc.user.weapon ? rpc.user.weapon : 'attack', ' vaporizes!\n')
                $.Weapon.equip(rpc, $.Weapon.merchant[0])
            }
            rpc.altered = true
            break

        case 7:
            let ha = rpc.user.magic > 2 ? (rpc.user.level >>3) + 8 : 16
            let hr = 0
            for (let i = 0; i < rpc.user.level; i++)
                hr += $.dice(ha)

            if (backfire) {
                $.sound('hurt', 3)
                rpc.hp -= hr
                xvt.out(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' hurt'), $.who(rpc, 'him'), '\x08self'
                    , ' for ', hr.toString(), ' hit points!\n')
                if (rpc.hp < 1) {
                    xvt.out(xvt.reset, '\n')
                    rpc.hp = 0
                    if (rpc === $.online)
                        $.reason = 'heal backfired'
                }
            }
            else {
                $.sound('heal', 3)
                rpc.hp += hr
                if (rpc.hp > rpc.user.hp)
                    rpc.hp = rpc.user.hp
                xvt.out(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' heal'), rpc !== $.online ? $.who(rpc, 'him') + '\x08self ' : ''
                    , 'for ', hr.toString(), ' hit points.\n')
            }
            break

        case 8:
            if (xvt.validator.isDefined(nme)) {
                xvt.out(xvt.bright, xvt.magenta)
                if (backfire) {
                    xvt.out(nme === $.online ? 'You' : nme.user.gender === 'I' ? 'The ' + nme.user.handle : nme.user.handle
                        , $.what(nme, ' teleport'))
                    if (nme !== $.online)
                        nme.hp = -1
                    else
                        teleported = true
                }
                else {
                    xvt.out(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                        , $.what(rpc, ' teleport'))
                    if (rpc === $.online) {
                        teleported = true
                        retreat = true
                        rpc.user.retreats++
                    }
                    else
                        rpc.hp = -1
                }
                xvt.out(xvt.normal, 'away from the ', xvt.faint, 'battle!\n', xvt.reset)
                $.sound('teleport', 8)
            }
            else {
                if (rpc === $.online)
                    teleported = true
                else
                    rpc.hp = -1
            }
            break

        case 9:
            $.sound('blast', 3)
            let ba = rpc.user.magic > 2 ? (rpc.user.level >>3) - (nme.armor.ac >>2) + 16 : 17
            if (nme.user.melee > 3)
                ba *= nme.user.melee >>1
            let br = rpc.int >>3
            while ($.dice(99 + rpc.user.magic) > 99) {
                ba += $.dice(rpc.user.magic)
                for (let i = 0; i < ba; i++)
                    br += $.dice(ba)
            }
            for (let i = 0; i < rpc.user.level; i++)
                br += $.dice(ba)

            if (backfire) {
                xvt.out(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' blast')
                    , rpc !== $.online ? $.who(rpc, 'him') + '\x08self' : 'yourself'
                    , ' for ', br.toString(), ' hit points!\n')
                rpc.hp -= br
                if (rpc.hp < 1) {
                    xvt.out(xvt.reset, '\n')
                    rpc.hp = 0
                    if (rpc === $.online)
                        $.reason = 'blast backfired'
                }
            }
            else {
                xvt.out(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' blast')
                    , nme === $.online ? 'you' : nme.user.gender === 'I' ? 'the ' + nme.user.handle : nme.user.handle
                    , ' for ', br.toString(), ' hit points!')
                nme.hp -= br

                if (nme.hp < 1) {
                    nme.hp = 0
                    if (from === 'Party' || nme !== $.online) {
                        xvt.out(xvt.blue, xvt.faint, ' {', xvt.bright, 'RIP', xvt.faint, '}', xvt.reset)
                    }
                    else {
                        $.player.killed++
                        xvt.out('\n', xvt.bright, xvt.yellow
                            , rpc.user.gender == 'I' ? 'The ' : '', rpc.user.handle
                            , ' killed you!\n', xvt.reset)
                        $.profile({ jpg:'death' })
                        $.sound('killed', 12)
                        $.reason = rpc.user.id.length ? `fatal blast by ${rpc.user.handle}`
                            : `fatal blast by a level ${rpc.user.level} ${rpc.user.handle}`
                    }
                }
                xvt.out('\n')
            }
            break

        case 10:
            if (backfire) {
                $.player.killed++
                $.profile({ jpg:'death' })
                $.sound('killed', 20)
                xvt.out('You die by your own doing.\n')
                $.reason = `resurrect backfired`
                rpc.hp = 0
            }
            else {
                $.sound('resurrect')
                user('Resurrect', (opponent: active) => {
                    if (opponent.user.id === '' || opponent.user.id === $.player.id) {
                        xvt.out('\nGo get some coffee.\n')
                    }
                    else {
                        xvt.out('Now raising ', opponent.user.handle, ' from the dead...')
                        opponent.user.status = ''
                        $.saveUser(opponent)
                        xvt.out('\n')
                    }
                    cb()
                    return
                })
            }
            break

        case 11:
            $.sound('confusion')
            if (backfire) {
                xvt.out(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' blitz')
                    , rpc === $.online ? 'yourself' : $.who(rpc, 'him') + '\x08self'
                    , ' with exploding ', xvt.bright
                    , xvt.red, 'c', xvt.yellow, 'o', xvt.green, 'l', xvt.cyan, 'o', xvt.blue, 'r', xvt.magenta, 's'
                    , xvt.reset, '!\n')
                rpc.confused = true
                rpc.int >>1
                rpc.dex >>1
            }
            else {
                xvt.out(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' blitz')
                    , nme === $.online ? 'you' : nme.user.gender === 'I' ? 'the ' + nme.user.handle : nme.user.handle
                    , ' with exploding ', xvt.bright
                    , xvt.red, 'c', xvt.yellow, 'o', xvt.green, 'l', xvt.cyan, 'o', xvt.blue, 'r', xvt.magenta, 's'
                    , xvt.reset, '!\n')
                nme.confused = true
                nme.int >>= 1
                nme.dex >>= 1
            }
            break

        case 12:
            $.sound('transmute', 4)
            if (backfire) {
                if (isNaN(+rpc.user.weapon))
                    xvt.out(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                        , $.what(rpc, ' transform'), $.who(rpc, 'his'), rpc.user.weapon, ' into')
                else
                    xvt.out('A new weapon materializes... it\'s')
                let n = Math.round(($.dice(rpc.weapon.wc) + $.dice(rpc.weapon.wc)
                    + $.dice($.Weapon.merchant.length)) / 3)
                if (++n > $.Weapon.merchant.length - 1)
                    rpc.user.weapon = $.Weapon.special[$.dice($.Weapon.special.length) - 1]
                else
                    rpc.user.weapon = $.Weapon.merchant[n]
                $.Weapon.equip(rpc, rpc.user.weapon)
                xvt.out($.an(rpc.user.weapon.toString()), xvt.reset, '!\n')
                rpc.altered = true
            }
            else {
                if (isNaN(+nme.user.weapon))
                    xvt.out(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                        , $.what(rpc, ' transform'), $.who(nme, 'his'), nme.user.weapon, ' into')
                else
                    xvt.out('A new weapon materializes... it\'s')
                let n = Math.round(($.dice(nme.weapon.wc) + $.dice(nme.weapon.wc)
                    + $.dice($.Weapon.merchant.length)) / 3)
                if (++n > $.Weapon.merchant.length - 1)
                    nme.user.weapon = $.Weapon.special[$.dice($.Weapon.special.length) - 1]
                else
                    nme.user.weapon = $.Weapon.merchant[n]
                $.Weapon.equip(nme, nme.user.weapon)
                xvt.out($.an(nme.user.weapon.toString()), xvt.reset, '!\n')
                nme.altered = true
            }
            xvt.waste(500)
            break

        case 13:
            $.sound('cure', 6)
            if (backfire) {
                xvt.out(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' cure')
                    , nme === $.online ? 'you' : nme.user.gender === 'I' ? 'the ' + nme.user.handle : nme.user.handle
                    , '!\n')
                nme.hp = nme.user.hp
            }
            else {
                if (rpc === $.online) {
                    xvt.out('You feel your vitality completed restored.\n')
                }
                else {
                    xvt.out(rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                        , $.what(rpc, ' cure'), $.who(rpc, 'him'), '\x08self!\n')
                }
                rpc.hp = rpc.user.hp
            }
            xvt.waste(500)
            break

        case 14:
            $.sound('illusion')
            let iou = <active>{}
            iou.user = <user>{id:'', sex:'I'}
            $.reroll(iou.user, undefined, iou.user.level)
            $.activate(iou)
            iou.user.xplevel = -1
            iou.user.coin = new $.coins(0)
            iou.user.str = 0
            iou.user.int = 0
            iou.user.dex = 0
            iou.user.cha = 0
            iou.user.sp = 0
            iou.str = 0
            iou.int = 0
            iou.dex = 0
            iou.cha = 0
            iou.sp = 0
            let p = round[0].party
            if (backfire) {
                iou.user.handle = `image of ${nme.user.id ? nme.user.id : 'it'}`
                iou.hp = nme.hp
                parties[p^1].push(iou)
                xvt.out(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' render'), 'an image of '
                    , nme === $.online ? 'you' : nme.user.gender === 'I' ? 'the ' + nme.user.handle : nme.user.handle
                    , '!\n')
            }
            else {
                iou.user.handle = `image of ${rpc.user.id ? rpc.user.id : 'it'}`
                iou.hp = rpc.hp
                parties[p].push(iou)
                xvt.out(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' render'), 'an image of ', $.who(rpc, 'him'), '\x08self!\n')
            }
            xvt.waste(500)
            break

        case 15:
            $.sound('disintegrate', 6)
            if (backfire) {
                xvt.out(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' completely atomize')
                    , $.who(rpc, 'him'), '\x08self!\n')
                rpc.hp = 0
                if (rpc === $.online)
                    $.reason = `disintegrate backfired`
            }
            else {
                xvt.out(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' completely atomize')
                    , nme === $.online ? 'you' : nme.user.gender === 'I' ? 'the ' + nme.user.handle : nme.user.handle
                    , '!\n')
                nme.hp = 0
                if (nme === $.online) {
                    $.player.killed++
                    xvt.out('\n', xvt.bright, xvt.yellow
                        , rpc.user.gender == 'I' ? 'The ' : '', rpc.user.handle
                        , ' killed you!\n\n', xvt.reset)
                    $.profile({ jpg:'death' })
                    $.sound('killed', 12)
                    $.reason = rpc.user.id.length ? `defeated by ${rpc.user.handle}`
                        : `defeated by a level ${rpc.user.level} ${rpc.user.handle}`
                }
            }
            xvt.waste(500)
            break

        case 16:
            $.sound('morph', 10)
            if (backfire) {
                rpc.user.level = $.dice(98) + 1
                $.reroll(rpc.user, $.PC.random(), rpc.user.level)
                $.activate(rpc)
                rpc.altered = true
                rpc.user.gender = ['F','M'][$.dice(2) - 1]
                $.saveUser(rpc)
                xvt.out(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' morph'), $.who(rpc, 'him'), '\x08self'
                    , ` into a level ${rpc.user.level} ${rpc.user.pc}!\n`)
            }
            else {
                nme.user.level = $.dice(98) + 1
                $.reroll(nme.user, $.PC.random(), nme.user.level)
                $.activate(nme)
                nme.altered = true
                nme.user.gender = ['F','M'][$.dice(2) - 1]
                $.saveUser(nme)
                xvt.out(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' morph')
                    , nme === $.online ? 'you' : nme.user.gender === 'I' ? 'the ' + nme.user.handle : nme.user.handle
                    , ` into a level ${nme.user.level} ${nme.user.pc}!\n`)
            }
            xvt.waste(1000)
            break

        case 17:
            if (backfire) {
                xvt.out(xvt.yellow, rpc === $.online ? 'You'
                    : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' get'), 'swallowed by an acid mist... ')
                xvt.waste(600)
                rpc.toAC -= $.dice(rpc.armor.ac / 5 + 1)
                rpc.user.toAC -= $.dice(rpc.armor.ac / 10 + 1)
                xvt.out(xvt.bright, rpc === $.online ? 'you'
                    : rpc.user.gender === 'I' ? 'the ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' damage'), 'own ', isNaN(+rpc.user.armor) ? rpc.user.armor : 'defense'
                    , $.buff(rpc.user.toAC, rpc.toAC), '!\n', xvt.reset)
                xvt.waste(400)
                if (-rpc.user.toAC >= rpc.armor.ac || -(rpc.user.toAC + rpc.toAC) >= rpc.armor.ac) {
                    xvt.out($.who(rpc, 'His'), rpc.user.armor ? isNaN(+rpc.user.armor) : 'defense', ' crumbles!\n')
                    $.Armor.equip(rpc, $.Armor.merchant[0])
                }
                rpc.altered = true
            }
            else {
                xvt.out(xvt.yellow, 'An acid mist surrounds ', nme === $.online ? 'you'
                    : nme.user.gender === 'I' ? 'the ' + nme.user.handle : nme.user.handle
                    , '... ')
                xvt.waste(600)
                nme.toAC -= $.dice(nme.armor.ac / 5 + 1)
                nme.user.toAC -= $.dice(nme.armor.ac / 10 + 1)
                xvt.out(xvt.bright, $.who(nme, 'his')
                    , isNaN(+nme.user.armor) ? nme.user.armor + ' is damaged' : 'defense is lessened'
                    , $.buff(nme.user.toAC, nme.toAC), '!\n', xvt.reset)
                xvt.waste(400)
                if (-nme.user.toAC >= nme.armor.ac || -(nme.user.toAC + nme.toAC) >= nme.armor.ac) {
                    xvt.out($.who(nme, 'His'), isNaN(+nme.user.armor) ? nme.user.armor : 'defense', ' crumbles!\n')
                    $.Armor.equip(nme, $.Armor.merchant[0])
                }
                nme.altered = true
            }
            xvt.waste(500)
            break

        case 18:
            xvt.out(xvt.magenta, 'An ', xvt.faint, 'ultraviolet', xvt.normal, ' beam emits... ')
            xvt.waste(600)
            if (backfire) {
                rpc.toWC -= $.dice(rpc.weapon.wc / 5 + 1)
                rpc.user.toWC -= $.dice(rpc.weapon.wc / 10 + 1)
                xvt.out(xvt.bright, rpc === $.online ? 'you'
                    : rpc.user.gender === 'I' ? 'the ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' damage'), 'own ', isNaN(+rpc.user.weapon) ? rpc.user.weapon : 'attack'
                    , $.buff(rpc.user.toWC, rpc.toWC), '!\n', xvt.reset)
                xvt.waste(400)
                if (-rpc.user.toWC >= rpc.weapon.wc || -(rpc.user.toWC + rpc.toWC) >= rpc.weapon.wc) {
                    xvt.out($.who(rpc, 'His'), rpc.user.weapon ? isNaN(+rpc.user.weapon) : 'attack', ' crumbles!\n')
                    $.Weapon.equip(rpc, $.Weapon.merchant[0])
                }
                rpc.altered = true
            }
            else {
                nme.toWC -= $.dice(nme.weapon.wc / 5 + 1)
                nme.user.toWC -= $.dice(nme.weapon.wc / 10 + 1)
                xvt.out(xvt.bright, 'it damages ', $.who(nme, 'his')
                    , isNaN(+nme.user.weapon) ? nme.user.weapon : 'attack'
                    , $.buff(nme.user.toWC, nme.toWC), '!\n', xvt.reset)
                xvt.waste(400)
                if (-nme.user.toWC >= nme.weapon.wc || -(nme.user.toWC + nme.toWC) >= nme.weapon.wc) {
                    xvt.out($.who(nme, 'His'), isNaN(+nme.user.weapon) ? nme.user.weapon : 'attack', ' crumbles!\n')
                    $.Weapon.equip(nme, $.Weapon.merchant[0])
                }
                nme.altered = true
            }
            xvt.waste(500)
            break

        case 19:
            xvt.out('A ', xvt.bright, xvt.white, 'blinding flash', xvt.normal, ' erupts... ')
            $.sound('blast', 10)
            let bba = rpc.user.magic > 2 ? (rpc.user.level >>3) - (nme.armor.ac >>2) + 31 : 32
            if (nme.user.melee > 3)
                bba *= nme.user.melee >>1
            let bbr = rpc.int >>3
            while ($.dice(99 + rpc.user.magic) > 99) {
                bba += $.dice(rpc.user.magic)
                for (let i = 0; i < bba; i++)
                    bbr += $.dice(bba)
            }
            for (let i = 0; i < rpc.user.level; i++)
                bbr += $.dice(bba)

            if (backfire) {
                xvt.out(rpc === $.online ? 'you'
                    : rpc.user.gender === 'I' ? 'the ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' BLAST')
                    , rpc !== $.online ? $.who(rpc, 'him') + '\x08self' : 'yourself'
                    , ' for ', bbr.toString(), ' hit points!\n')
                rpc.hp -= bbr
                if (rpc.hp < 1) {
                    xvt.out(xvt.reset, '\n')
                    rpc.hp = 0
                    if (rpc === $.online)
                        $.reason = 'Big Blast backfired'
                }
            }
            else {
                xvt.out(rpc === $.online ? 'you'
                    : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' BLAST')
                    , nme === $.online ? 'you' : nme.user.gender === 'I' ? 'the ' + nme.user.handle : nme.user.handle
                    , ' for ', bbr.toString(), ' hit points!')
                nme.hp -= bbr

                if (nme.hp < 1) {
                    nme.hp = 0
                    if (from === 'Party' || nme !== $.online) {
                        xvt.out(xvt.blue, xvt.faint, ' {', xvt.bright, 'RIP', xvt.faint, '}', xvt.reset)
                    }
                    else {
                        $.player.killed++
                        xvt.out('\n', xvt.bright, xvt.yellow
                            , rpc.user.gender == 'I' ? 'The ' : '', rpc.user.handle
                            , ' killed you!\n', xvt.reset)
                        $.profile({ jpg:'death' })
                        $.sound('killed', 12)
                        $.reason = rpc.user.id.length ? `fatal Big Blast by ${rpc.user.handle}`
                            : `fatal Big Blast by a level ${rpc.user.level} ${rpc.user.handle}`
                    }
                }
                xvt.out('\n')
            }
            break

        case 20:
            if (backfire) {

            }
            else {

            }
            break

        case 21:
            if (backfire) {

            }
            else {

            }
            break

        case 22:
            if (backfire) {

            }
            else {

            }
            break

        case 23:
            if (backfire) {

            }
            else {
                $.sound('shield')
            }
            break

        case 24:
            if (backfire) {

            }
            else {
                $.sound('hone')
            }
            break
        }

        cb()
    }
}

export function melee(rpc: active, enemy: active, blow = 1) {
    let action: string
    let hit = 0
    
    let n = rpc.dex + (rpc.dex - enemy.dex)
    if (blow > 1)
        n = Math.round(n / 2) + 50
    n = (n < 5) ? 5 : (n > 99) ? 99 : n

    // saving throw
    if ($.dice(100) > n) {
        if (blow == 1) {
            if (rpc == $.online) {
                xvt.out('Your ', rpc.user.weapon, ' passes through thin air.\n')
                $.sound('miss')
                return
            }
            else {
                $.sound(rpc.user.melee < 2 ? 'whoosh' : rpc.user.gender === 'I' ? 'swoosh' : 'swords')
                if (isNaN(+rpc.user.weapon))
                    xvt.out(rpc.user.gender === 'I' ? 'The ' : ''
                        , rpc.user.handle, '\'s ', rpc.user.weapon
                        , ' whistles by '
                        , enemy.user.gender === 'I' ? 'the ' : ''
                        , enemy == $.online ? 'you' : enemy.user.handle
                        , '.\n')
                else {
                    xvt.out(rpc.user.gender === 'I' ? 'The ' : ''
                        , rpc.user.handle, ' attacks '
                        , enemy.user.gender === 'I' ? 'the ' : ''
                        , enemy == $.online ? 'you' : enemy.user.handle
                        , ', but misses.\n')
                }
                return
            }
        }
        else {
            xvt.out('Attempt fails!\n')
            $.sound('miss')
            return
        }
    }

    // melee
    hit = Math.trunc(rpc.str / 10)
    hit += $.dice(rpc.user.level)
    hit += rpc.user.melee * $.dice(rpc.user.level)

    // excellent
    n = rpc.user.melee + 1
    let period = ''
    let smash = 0
    while ((smash = $.dice(98 + n)) > 98) {
        for (; smash > 98; smash--) {
            hit += $.dice(rpc.user.level)
        }
        period += '!'
		n += $.dice(rpc.user.melee)
    }
    if (!period) period = '.'
    hit *= 50 + Math.trunc(rpc.user.str / 2)
    hit = Math.round(hit / 100)

    // my stuff vs your stuff
    let wc = rpc.weapon.wc + rpc.user.toWC + rpc.toWC
    let ac = enemy.armor.ac + enemy.user.toAC + enemy.toWC
    wc = wc < 0 ? 0 : wc
    ac = ac < 0 ? 0 : ac

    hit += 2 * (wc + $.dice(wc))
    hit *= 50 + Math.trunc(rpc.user.str / 2)
    hit = Math.round(hit / 100)
    hit -= ac + $.dice(ac)
    if (hit <= 0) {
        hit = 0
    }
    else {
        //  any ego involvement
        //  if((damage + egostat[0] + egostat[1] + egostat[2] + egostat[3]) < 1)
        //      damage = dice(2) - (egostat[0] + egostat[1] + egostat[2] + egostat[3]);
        hit *= blow
    }

    enemy.hp -= hit

    if (hit > 0) {
        if (from === 'Party' && enemy.hp <= 0) {
            enemy.hp = 0
            if (enemy == $.online)
                $.sound('kill', 5)
            xvt.out(xvt.bright, enemy == $.online ? xvt.yellow : round[0].party == 0 ? xvt.cyan : xvt.red)
            xvt.out(rpc.user.handle, ' ', sprintf([
                'makes a fatal blow to %s',
                'blows %s away',
                'laughs, then kills %s',
                'easily slays %s',
                'makes minced-meat out of %s',
                'runs %s through'
                ][$.dice(6) - 1], enemy.user.handle)
                , xvt.reset, '.\n'
            )
            xvt.waste(500)
            return
        }

        action = (blow == 1)
            ? (period[0] === '.') ? rpc.weapon.hit : rpc.weapon.smash
            : (period[0] === '.') ? rpc.weapon.stab : rpc.weapon.plunge

        if (rpc == $.online) {
            xvt.out('You ', action ,' ')
            if (alive[0] == 1 && alive[1] == 1)
                xvt.out($.who(enemy, 'him'))
            else
                xvt.out(enemy.user.gender === 'I' ? 'the ' : '', enemy.user.handle, ' ')
        }
        else {
            let w = action.split(' ')
            if (alive[0] == 1 && alive[1] == 1)
                xvt.out($.who(rpc, 'He'))
            else
                xvt.out(rpc.user.gender === 'I' ? 'The ' : '', rpc.user.handle, ' ')
            xvt.out($.what(rpc, w[0]), w.slice(1).join(' '), enemy == $.online ? 'you'
                : enemy.user.gender === 'I' ? 'the ' + enemy.user.handle : enemy.user.handle
                , ' '
            )
        }
        xvt.out('for ', hit.toString(), ' hit points', period, '\n')
        xvt.waste(50)
    }
    else {
        xvt.out(
            rpc == $.online ? 'Your ' + rpc.user.weapon
            : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
            , ' does not even scratch '
            , enemy == $.online ? 'you'
            : enemy.user.gender === 'I' ? 'the ' + enemy.user.handle : enemy.user.handle
            , '.\n'
        )
        xvt.waste(250)
    }

    if (enemy.hp < 1) {
        enemy.hp = 0    // killed

        if (enemy == $.online) {
            $.player.killed++
            xvt.out('\n', xvt.bright, xvt.yellow
                , rpc.user.gender == 'I' ? 'The ' : '', rpc.user.handle
                , ' killed you!\n\n', xvt.reset)
            $.profile({ jpg:'death' })
            $.sound('killed', 12)
            $.reason = rpc.user.id.length ? `defeated by ${rpc.user.handle}`
                : `defeated by a level ${rpc.user.level} ${rpc.user.handle}`
        }
        else {
            if (rpc == $.online) {
                $.player.kills++
                xvt.out('You killed'
                    , enemy.user.gender === 'I' ? ' the ' : ' ', enemy.user.handle
                    , '!\n\n', xvt.reset)
                if (from !== 'Party' && enemy.user.id !== '' && enemy.user.id[0] !== '_') {
                    $.sound('kill', 15)
                    $.music('bitedust')
                    $.news(`\tdefeated ${enemy.user.handle}, an experience level ${enemy.user.xplevel} ${enemy.user.pc}`)
                    $.wall(`defeated ${enemy.user.handle}`)
                }
                xvt.waste(500)
            }
        }
    }

    return
}

export function poison(rpc: active, cb?:Function) {
    if (rpc.user.id === $.player.id) {
        if (!$.player.poisons.length) {
            xvt.out('\nYou don\'t have any poisons.\n')
            cb(true)
            return
        }
        $.action('list')
        xvt.app.form = {
            'poison': { cb: () => {
                xvt.out('\n')
                if (xvt.entry === '') {
                    cb()
                    return
                }
                if (!$.Poison.have(rpc.user.poisons, +xvt.entry)) {
                	for (let i in $.player.poisons) {
                        let p = $.player.poisons[i]
				    	xvt.out($.bracket(p), $.Poison.merchant[p - 1])
                    }
                    xvt.out('\n')
                    xvt.app.refocus()
                    return
                }
                else
                    apply(rpc, +xvt.entry)
                cb(true)
                return
            }, prompt:['Use vial', 'Apply poison', 'Make toxic', 'Uti venenum'][$.player.poison - 1] + ' (?=list): ', max:2 }
        }
        xvt.app.focus = 'poison'
        return
    }

    if ((rpc.toWC + rpc.user.toWC) < Math.trunc(rpc.weapon.wc / (6 - rpc.user.poison))) {
        let vial = $.dice(rpc.user.poisons.length) - 1
        if (vial) apply(rpc, rpc.user.poisons[vial])
    }

    function apply(rpc: active, vial: number) {
//console.log('apply(', vial.toString(), ')')
        rpc.altered = true
        let wc = $.Weapon.baseWC(rpc.user.weapon)
        let p = Math.trunc(rpc.user.poison / 2)
        let t = rpc.user.poison - p
        p *= vial
        t *= vial
        if (p > 0 && rpc.user.toWC >= 0) rpc.user.toWC = p
        if (t > 0 && rpc.toWC >= 0)
            rpc.toWC = t
        else
            rpc.toWC += t

        $.sound('hone')
        xvt.out(xvt.reset, '\n')
        if (!$.Poison.have(rpc.user.poisons, vial) || +rpc.user.weapon > 0) {
            xvt.out(xvt.bright, xvt.green, $.who(rpc, 'He'), $.what(rpc, 'secrete'), 'a caustic ooze', xvt.reset, $.buff(p, t), xvt.reset, '\n')
            xvt.waste(500)
        }
        else {
            xvt.out($.who(rpc, 'He'), $.what(rpc, 'pour')
                , 'some ', $.Poison.merchant[+xvt.entry - 1]
                , ' on ', $.who(rpc, 'his'), rpc.user.weapon, '.\n')
            xvt.waste(500)
            if (/^[A-Z]/.test(rpc.user.id)) {
                if ($.dice(3 * (rpc.toWC + rpc.user.toWC + 1)) / rpc.user.poison > $.Weapon.name[rpc.user.weapon].wc) {
                    xvt.out($.who(rpc, 'His'), rpc.user.weapon, ' vaporizes!\n')
                    xvt.waste(500)
                    rpc.user.weapon = $.Weapon.merchant[0]
                    rpc.toWC = 0
                    rpc.user.toWC = 0
                }
            }
            if (rpc.user.id !== $.player.id || $.dice(rpc.user.poison) == 1) {
                $.Poison.remove(rpc.user.poisons, vial)
                if (rpc.user.id === $.player.id) {
                    xvt.out('You toss the empty vial aside.\n')
                    xvt.waste(500)
                }
            }
        }
    }
}

export function user(venue: string, cb:Function) {
    let start = $.player.level > 3 ? $.player.level - 3 : 1
    let end = $.player.level < 97 ? $.player.level + 3 : 99

    $.action('freetext')
    xvt.app.form = {
        'user': { cb: () => {
            if (xvt.entry === '?') {
                xvt.app.form['start'].prompt = 'Starting level ' + $.bracket(start, false) + ': '
                xvt.app.focus = 'start'
                return
            }
            let rpc: active = { user: { id: xvt.entry} }
            if (!$.loadUser(rpc)) {
                rpc.user.id = ''
                rpc.user.handle = xvt.entry
                if(!$.loadUser(rpc)) { 
                    xvt.beep()
                    xvt.out(' ?? ')
                }
            }
            xvt.out('\n')
            cb(rpc)
        }, max:22 },
        'start': { cb: () => {
            let n = +xvt.entry
            if (n > 0 && n < 100) start = n
            xvt.app.form['end'].prompt = '  Ending level ' + $.bracket(end, false) + ': '
            xvt.app.focus = 'end'
            return

        }},
        'end': { cb: () => {
            let n = +xvt.entry
            if (n >= start && n < 100) end = n

            xvt.out('\n', xvt.Blue, xvt.bright)
            xvt.out(' ID   Player\'s Handle          Class     Lvl      Last On       Access Level  \n')
            xvt.out('------------------------------------------------------------------------------')
            xvt.out(xvt.reset, '\n')

            let rs = $.query(`
                SELECT id, handle, pc, level, status, lastdate, access FROM Players
                WHERE id NOT GLOB '_*'
                AND level BETWEEN ${start} AND ${end}
                ORDER BY level DESC, immortal DESC
                `)

            for (let i in rs) {
                if (rs[i].id === $.player.id)
                    continue
                if (rs[i].length) xvt.out(xvt.faint)
                else xvt.out(xvt.reset)
                //  paint a target on any player that is winning
                if (rs[i].pc === $.PC.winning)
                    xvt.out(xvt.bright, xvt.yellow)
                xvt.out(sprintf('%-4s  %-22s  %-9s  %3d  ', rs[i].id, rs[i].handle, rs[i].pc, rs[i].level))
                xvt.out($.date2full(rs[i].lastdate), '  ', rs[i].access)
                if ($.player.emulation === 'XT' && $.Access.name[rs[i].access].emoji)
                    xvt.out($.Access.name[rs[i].access].sysop ? xvt.cyan : xvt.faint
                         , $.Access.name[rs[i].access].emoji)
                xvt.out(xvt.reset, '\n')
            }

            xvt.app.focus = 'user'
            return
        }}
    }
    xvt.app.form['user'].prompt = venue + ' what user (?=list): '
    xvt.app.focus = 'user'
}

export function yourstats() {
    let userPNG = `images/user/${$.player.id}.png`
    try {
        fs.accessSync(userPNG, fs.constants.F_OK)
        userPNG = `user/${$.player.id}`
    } catch(e) {
        userPNG = 'player/' + $.player.pc.toLowerCase() + ($.player.gender === 'F' ? '_f' : '')
    }
    $.profile({ png:userPNG, handle:$.player.handle, level:$.player.level, pc:$.player.pc })
    xvt.out(xvt.reset)
    xvt.out(xvt.cyan, 'Str:', xvt.bright, $.online.str > $.player.str ? xvt.yellow : $.online.str < $.player.str ? xvt.red : xvt.white)
    xvt.out(sprintf('%3d', $.online.str), xvt.reset, sprintf(' (%d,%d)    ', $.player.str, $.player.maxstr))
    xvt.out(xvt.cyan, 'Int:', xvt.bright, $.online.int > $.player.int ? xvt.yellow : $.online.int < $.player.int ? xvt.red : xvt.white)
    xvt.out(sprintf('%3d', $.online.int), xvt.reset, sprintf(' (%d,%d)    ', $.player.int, $.player.maxint))
    xvt.out(xvt.cyan, 'Dex:', xvt.bright, $.online.dex > $.player.dex ? xvt.yellow : $.online.dex < $.player.dex ? xvt.red : xvt.white)
    xvt.out(sprintf('%3d', $.online.dex), xvt.reset, sprintf(' (%d,%d)    ', $.player.dex, $.player.maxdex))
    xvt.out(xvt.cyan, 'Cha:', xvt.bright, $.online.cha > $.player.cha ? xvt.yellow : $.online.cha < $.player.cha ? xvt.red : xvt.white)
    xvt.out(sprintf('%3d', $.online.cha), xvt.reset, sprintf(' (%d,%d)', $.player.cha, $.player.maxcha), '\n')
    xvt.out(xvt.cyan, 'Hit points: '
        , xvt.bright, $.online.hp > $.player.hp ? xvt.yellow : $.online.hp == $.player.hp ? xvt.white : xvt.red, $.online.hp.toString()
        , xvt.reset, '/', $.player.hp.toString()
    )
    if ($.player.sp) {
        xvt.out(xvt.cyan, '    Spell points: '
            , xvt.bright, $.online.sp > $.player.sp ? xvt.yellow : $.online.sp == $.player.sp ? xvt.white : xvt.red, $.online.sp.toString()
            , xvt.reset, '/', $.player.sp.toString()
        )
    }
    if ($.player.coin.value) xvt.out(xvt.cyan, '    Money: ', $.player.coin.carry())
    xvt.out(xvt.reset, '\n')
    xvt.out(xvt.cyan, 'Weapon: ', xvt.bright, xvt.white, $.player.weapon)
    xvt.out($.buff($.player.toWC, $.online.toWC), xvt.normal)
    xvt.out(xvt.cyan, '   Armor: ', xvt.bright, xvt.white, $.player.armor)
    xvt.out($.buff($.player.toAC, $.online.toAC), xvt.normal)
    xvt.out(xvt.reset, '\n')
}

}

export = Battle
