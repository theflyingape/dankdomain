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
    export let retreat: boolean
    export let teleported: boolean

    let fini: Function
    let from: string
    let gang: gang = {
        name:'', members:[], handles:[], genders:[], melee:[], status:[], validated:[]
            , win:0, loss:0, banner:0, trim:0, back:0, fore:0
    }
    let parties: [ active[] ]
    let alive: number[]
    let round: { party:number, member:number, react:number }[]
    let bs: number
    let volley: number


function end() {
    if (from === 'Tavern')
        if ($.online.hp < 1) {
            $.loadUser($.barkeep)
            $.barkeep.user.status = $.player.id
            $.barkeep.user.weapon = $.player.weapon
            $.Weapon.equip($.online, $.Weapon.merchant[0])
            $.saveUser($.barkeep)

            xvt.out(`He picks up your ${$.barkeep.user.weapon} and triumphantly waves it around to\n`)
            xvt.out(`the cheering crowd.  He struts toward the mantelpiece to hang his new trophy.\n\n`)
            $.sound('cheer', 13)
            xvt.out(xvt.bright, xvt.green, '"Drinks are on the house!"'
                , xvt.reset, '\n')
            $.sound('cheer', 7)
            $.player.coward = false
            $.reason = `schooled by ${$.barkeep.user.handle}`
        }
        else {
            $.player.coward = false
            $.barkeep.user.status = ''
            $.saveUser($.barkeep)
            $.news(`\tdefeated ${$.barkeep.user.handle}`)
            $.wall(`defeated ${$.barkeep.user.handle}`)
        }

    if (from === 'Taxman')
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

            xvt.out('\n')
            $.sound('max', 8)
            xvt.out(xvt.bright, xvt.blue, '"Thanks for the taxes!"'
                , xvt.reset, '\n')
            $.sound('thief', 16)
            $.player.coward = false
            $.reason = 'tax evasion'
        }
        else {
            $.player.coward = false
            $.news(`\tdefeated ${$.taxman.user.handle}`)
            $.wall(`defeated ${$.taxman.user.handle}`)
        }

    if (from === 'User') {
        let opponent = parties[1][0]
        if (!(opponent.user.id === '_' || opponent.user.gender === 'I')) {
            if (opponent.altered) $.saveUser(opponent)
            $.unlock(opponent.user.id)
            if ($.player.hp > 0 && opponent.hp == 0) {
                $.action('yn')
                xvt.app.form = {
                'yn': { cb:() => {
                    if (/Y/i.test(xvt.entry))
                        xvt.app.focus = 'message'
                    else {
                        xvt.out('\n')
                        fini()
                    }
                    }, cancel:'N', enter:'Y', eol:false, match:/Y|N/i },
                'message': { cb:() => {
                    xvt.out('\n')
                    if ($.cuss(xvt.entry)) {
                        $.player.coward = true
                        xvt.hangup()
                    }
                    if (xvt.entry) {
                        $.log(opponent.user.id, `... and says,`)
                        $.log(opponent.user.id, `"${xvt.entry}"`)
                    }
                    fini()
                    }, prompt:'>', max:78 }
                }
                xvt.app.form['yn'].prompt = `Leave ${$.who(opponent, 'him')}a message (Y/N)? `
                xvt.app.focus = 'yn'
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
    //  no more attacking
    if (retreat || teleported || ++volley > 12345) {
        if ($.online.confused)
            $.activate($.online, false, true)
        end()
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
                    if(from === 'Tavern') {
                        $.sound('growl')
                        xvt.out('"You try to escape, but the crowd throws you back to witness the slaughter!"\n')
                        $.player.coward = true
                        $.saveUser($.player)
                        next()
                        return
                    }
                    if (from === 'Taxman') {
                        $.sound('thief')
                        xvt.out('"You can never escape the taxman!"\n')
                        $.player.coward = true
                        $.saveUser($.player)
                        next()
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
                    if (from === 'User' && enemy.user.gender !== 'I')
                        $.log(enemy.user.id, `\n${$.player.handle}, the coward, retreated from you.`)
                    end()
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
        let odds: number = from === 'Party' ? 6 : from === 'Dungeon' ? 5 : 4
        let roll: number = odds + (rpc.user.magic >>1) + rpc.adept + 1

        if (rpc.user.magic == 1 && $.dice(roll) > odds) {
            if ($.Magic.have(rpc.user.spells, 8)
                && rpc.hp < rpc.user.hp / (rpc.user.level / (11 - rpc.adept)  + 1)
                && ($.dice(6 - rpc.adept) == 1 || rpc.user.coward))
                    mm = 8
            else if ($.Magic.have(rpc.user.spells, 7)
                    && rpc.hp < (rpc.user.hp >>1)
                    && $.dice(enemy.user.melee + 2) > 1)
                    mm = 7
            else if ($.Magic.have(rpc.user.spells, 9)
                    && (!rpc.user.id || rpc.hp < (rpc.user.hp >>1))
                    && $.dice(enemy.user.melee + 2) > 1)
                    mm = 9
            else if ($.Magic.have(rpc.user.spells, 13)
                    && rpc.hp < (rpc.user.hp / 6)
                    && $.dice((rpc.user.level - enemy.user.level) / 6 + odds - rpc.adept) == 1)
                    mm = 13
            else if (!rpc.confused && rpc.hp > (rpc.user.hp >>1)) {
                if ($.Magic.have(rpc.user.spells, 11)
                    && $.dice(enemy.user.magic + rpc.adept) > 1)
                        mm = 11
                else if ($.Magic.have(rpc.user.spells, 12)
                    && $.dice((rpc.user.level - enemy.user.level) / 6 + odds - rpc.adept) == 1)
                        mm = 12
                else if ($.Magic.have(rpc.user.spells, 14)
                    && $.dice((rpc.user.level - enemy.user.level) / 6 + odds - rpc.adept) == 1)
                        mm = 14
                else if ($.Magic.have(rpc.user.spells, 15)
                    && $.dice((rpc.user.level - enemy.user.level) / 6 + odds - rpc.adept) == 1)
                        mm = 15
                else if ($.Magic.have(rpc.user.spells, 16)
                    && rpc.hp == rpc.user.hp
                    && $.dice((rpc.user.level - enemy.user.level) / 6 + odds - rpc.adept) == 1)
                        mm = 16
            }
        }
        if (rpc.user.magic > 1 && $.dice(roll) > odds) {
            if (!rpc.confused || rpc.hp < (rpc.user.hp / 6)) {
                if ($.Magic.have(rpc.user.spells, 15)
                    && rpc.sp >= $.Magic.power(rpc, 15)
                    && $.dice((rpc.user.level - enemy.user.level) / 6 + odds - rpc.adept) == 1)
                        mm = 15
                else if ($.Magic.have(rpc.user.spells, 16)
                    && rpc.sp >= $.Magic.power(rpc, 16)
                    && rpc.hp > (rpc.user.hp >>1)
                    && $.dice((rpc.user.level - enemy.user.level) / 6 + odds - rpc.adept) == 1)
                        mm = 16
                else if ($.Magic.have(rpc.user.spells, 11)
                    && rpc.sp >= $.Magic.power(rpc, 11)
                    && $.dice(6 - enemy.user.magic) == 1)
                        mm = 11
                else if ($.Magic.have(rpc.user.spells, 14)
                    && rpc.sp >= $.Magic.power(rpc, 14)
                    && $.dice((rpc.user.level - enemy.user.level) / 6 + odds) == 1)
                        mm = 14
                else if ($.Magic.have(rpc.user.spells, 12)
                    && rpc.sp >= $.Magic.power(rpc, 12)
                    && $.dice((rpc.user.level - enemy.user.level) / 6 + odds) == 1)
                        mm = 12
            }
            if (!rpc.confused || !mm) {
                if ($.Magic.have(rpc.user.spells, 13)
                    && rpc.sp >= $.Magic.power(rpc, 13)
                    && rpc.hp < (rpc.user.hp / 6))
                        mm = 13
                else if ($.Magic.have(rpc.user.spells, 8)
                    && rpc.sp >= $.Magic.power(rpc, 8)
                    && rpc.hp < rpc.user.hp / (rpc.user.level / (11 - rpc.adept)  + 1)
                    && ($.dice(5 - rpc.adept) == 1 || rpc.user.coward))
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
        //  if regular magic is not on the menu, perhaps an extended spell is warranted?
        if (rpc.user.magic && !mm && $.dice(odds - rpc.adept) == 1) {
            odds = $.dice(8) + 16
            if (odds < 23 || volley < 5)
                if ($.Magic.have(rpc.user.spells, odds)
                    && rpc.sp >= $.Magic.power(rpc, odds))
                    mm = odds
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
        end()
    }
}

export function spoils() {
    let winner: active
    let loser: active
    let l: number
    let w: number

    if ($.online.confused)
        $.activate($.online, false, true)

    if (from === 'Gates')
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
    if (from === 'Party') {
        $.sqlite3.exec(`UPDATE Gangs SET win = win + 1 WHERE name = '${parties[w][0].user.gang}'`)
        $.sqlite3.exec(`UPDATE Gangs SET loss = loss + 1 WHERE name = '${parties[l][0].user.gang}'`)

        // player(s) can collect off each corpse
        let tl = [ 1, 1 ]
        let take: number = 0
        let coin = new $.coins(0)

        for (let m in parties[w]) {
            tl[w] += parties[w][m].user.xplevel
            take += parties[w][m].user.xp + 1
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
            let cut = parties[w][m].hp > 0 ? 0.95 : 0.35
            let max = Math.trunc(1000 * $.money(parties[w][m].user.level) * cut)
            let award = Math.trunc(coin.value * parties[w][m].user.xp / take * cut)
            award = award > coin.value ? coin.value : award
            award = award < 1 ? 0 : award > max ? max : award
            parties[w][m].user.coin.value += award
            coin.value -= award
            take -= parties[w][m].user.xp

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

        //  taxman takes any leftovers, but capped at 1p
        coin.value = coin.value < 1 ? 0 : coin.value > 1e+13 ? 1e+13 : coin.value
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

    //  the losers are them, not me
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
                    let x = loser.user.id ? 2 : 3
                    xp += $.experience(loser.user.xplevel, x)
                    if (winner.user.level < loser.user.xplevel)
                        loser.user.xplevel = winner.user.level
                }
                else
                    xp += $.experience(loser.user.xplevel, 18 - (1.333 * loser.user.immortal))
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
                    if (winner.user.cursed) {
                        loser.user.cursed = winner.user.id
                        loser.altered = true
                        winner.user.coward = false
                        winner.user.cursed = ''
                        xvt.out(xvt.bright, xvt.black, 'A dark cloud has lifted and shifted.\n', xvt.reset)
                        xvt.waste(1000)
                        $.log(loser.user.id, `... and left you with a dark cloud.`)
                        winner.str = $.PC.ability(winner.str, 10, winner.user.maxstr)
                        winner.int = $.PC.ability(winner.int, 10, winner.user.maxint)
                        winner.dex = $.PC.ability(winner.dex, 10, winner.user.maxdex)
                        winner.cha = $.PC.ability(winner.cha, 10, winner.user.maxcha)
                    }
                    if (loser.user.blessed) {
                        loser.user.blessed = ''
                        loser.altered = true
                        winner.user.blessed = loser.user.id
                        xvt.out(xvt.bright, xvt.yellow, 'A shining aura surrounds you.\n', xvt.reset)
                        xvt.waste(1000)
                        $.log(loser.user.id, `... and took your blessedness.`)
                        winner.str = $.PC.ability(winner.str, 10, winner.user.maxstr, 10)
                        winner.int = $.PC.ability(winner.int, 10, winner.user.maxint, 10)
                        winner.dex = $.PC.ability(winner.dex, 10, winner.user.maxdex, 10)
                        winner.cha = $.PC.ability(winner.cha, 10, winner.user.maxcha, 10)
                    }
                    if (loser.user.gang && loser.user.gang === $.player.gang) {
                        gang = $.loadGang($.query(`SELECT * FROM Gangs WHERE name = '${$.player.gang}'`)[0])
                        let n = gang.members.indexOf(loser.user.id)
                        if (n == 0) {
                            n = gang.members.indexOf($.player.id)
                            gang.members[0] = $.player.id
                            gang.members[n] = loser.user.id
                            $.saveGang(gang)
                            xvt.out(`You take over as the leader of ${gang.name}.\n`)
                            xvt.waste(500)
                        }
                        else {
                            $.player.maxcha--
                            $.player.cha--
                        }
                    }
                    if (loser.user.bounty.value) {
                        xvt.out(`You get the ${loser.user.bounty.carry()} bounty posted by ${loser.user.who}, too.\n`)
                        $.log(loser.user.id, `... and got paid the bounty posted by ${loser.user.who}.`)
                        winner.user.coin.value += loser.user.bounty.value
                        loser.user.bounty.value = 0
                        loser.user.who = ''
                    }
                    xvt.out(1000)
                }
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
    }
    else {
        //  accruing money is always eligible
        if ($.player.coin.value) {
            winner.user.coin.value += $.player.coin.value
            xvt.out($.who(winner, 'He'), 'gets ', $.player.coin.carry(), ' you were carrying.\n')
            $.player.coin.value = 0
            $.saveUser(winner)
        }
        xvt.out(1000)

        //  manage grace modifiers, but not sticky for NPC
        if (winner.user.cursed) {
            if ($.player.blessed) {
                $.player.blessed = ''
                xvt.out(xvt.bright, xvt.yellow, 'Your shining aura leaves you.\n', xvt.reset)
            }
            else {
                $.player.cursed = winner.user.id
                winner.user.coward = false
                winner.user.cursed = ''
                xvt.out(xvt.bright, xvt.black, 'A dark cloud hovers over you.\n', xvt.reset)
            }
            xvt.waste(1000)
        }

        //  manage any asset upgrades for PC
        if (winner.user.id && winner.user.id[0] !== '_') {
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
            if ($.Armor.swap(winner, $.online)) {
                xvt.out($.who(winner, 'He'), 'also ', $.what(winner, 'take'), $.who($.online, 'his'), winner.user.armor, '.\n')
                $.log(winner.user.id, `You upgraded to ${winner.user.armor}.`)
            }
            if (winner.user.gang && winner.user.gang === $.player.gang) {
                $.sound('laugh', 5)
                $.player.maxcha--
                $.player.cha--

                gang = $.loadGang($.query(`SELECT * FROM Gangs WHERE name = '${$.player.gang}'`)[0])
                let n = gang.members.indexOf(winner.user.id)
                if (n == 0) {
                    xvt.out($.who(winner,'He'), 'says, "'
                        , xvt.bright, 'Let that be a lesson to you punk!'
                        , xvt.reset, '"\n')
                    xvt.waste(500)
                }
                if (gang.members[0] === $.player.id) {
                    gang.members[0] = winner.user.id
                    gang.members[n] = $.player.id
                    $.saveGang(gang)
                    $.player.cha--
                    xvt.out($.who(winner,'He'), `takes over as the leader of ${gang.name}.\n`)
                    xvt.waste(500)
                }
            }
            $.saveUser(winner)
        }
    }
    $.online.altered = true
}

export function brawl(rpc:active, nme:active) {
    if ($.dice(100) >= (50 + (rpc.dex >>1))) {
        xvt.out(`\n${$.who(nme, 'He')}${$.what(nme, 'duck')}${$.who(rpc,'his')}punch.\n`)
        xvt.waste(500)
        let patron = $.PC.encounter()
        if (patron.user.id && patron.user.id != rpc.user.id && patron.user.id != nme.user.id && !patron.user.status) {
            xvt.out(`\n${$.who(rpc, 'He')}${$.what(rpc, 'hit')}${patron.user.handle}!\n`)
            xvt.waste(500)
            let bp = punch(rpc)
            patron.bp -= bp
            if (patron.bp > 0) {
                xvt.out(`\nUh oh!  Here comes ${patron.user.handle}!\n`)
                xvt.waste(1000)
                this.brawl(patron, rpc)
            }
            else
                knockout(rpc, patron)
        }
    }
    else {
        let bp = punch(rpc)
        xvt.out(`\n${$.who(rpc, 'He')}${$.what(rpc, 'punch')}${$.who(nme,'him')}for ${bp} points.\n`)
        nme.bp -= bp
        if (nme.bp < 1)
            knockout(rpc, nme)
    }

    function knockout(winner:active, loser:active) {
        xvt.out(`\n${winner.user.handle} ${$.what(winner, 'knock')}${$.who(loser, 'him')}out!\n`)
        xvt.waste(500)
        let xp = $.experience(loser.user.level, 9)
        xvt.out(`\n${$.who(winner, 'He')}${$.what(winner, 'get')}`, sprintf(xp < 1e+8 ? '%d' : '%.7e', xp), ' experience.\n')
        winner.user.xp += xp
        if (loser.user.coin.value) {
            xvt.out(`${$.who(loser, 'He')}was carrying ${loser.user.coin.carry()}\n`)
            winner.user.coin.value += loser.user.coin.value
            loser.user.coin.value = 0
        }
        winner.user.tw++
        $.saveUser(winner)
        xvt.waste(500)

        loser.user.tw++
        $.saveUser(loser)
        if (loser.user.id === $.player.id) {
            let m = Math.abs($.online.bp)
            while (m > 10)
                m >>= 1
            xvt.out(`\nYou are unconscious for ${m} minute`, m != 1 ? 's' : '', '.')
            while (m--) {
                xvt.out('.')
                xvt.waste(600)
            }
            xvt.out('\n')
            $.news(`\tgot knocked out by ${winner.user.handle}`)
        }
        else
            $.log(loser.user.id, `\n${winner.user.handle} knocked you out.`)
    }

    function punch(rpc: active): number {
        let punch = (rpc.user.level + rpc.str / 10) >>1
        punch += $.dice(punch)
        return punch
    }
}

export function cast(rpc: active, cb:Function, nme?: active, magic?: number, DL?: ddd) {
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
        $.action('keypad')
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
    else
        invoke(Object.keys($.Magic.spells)[magic - 1])

    function invoke(name: string) {
        let spell = $.Magic.spells[name]
        if (rpc.user.id !== $.player.id)
            xvt.waste(200)

        if (rpc.user.magic > 1)
            if (rpc.sp < $.Magic.power(rpc, spell.cast)) {
                if (rpc === $.online) xvt.out('You don\'t have enough power to cast that spell!\n')
                cb(!rpc.confused)
                return
            }

        //  some sensible ground rules to avoid known muling exploits (by White Knights passing gas)
        if (xvt.validator.isDefined(nme)) {
            if ([ 1,2,3,4,5,6,10 ].indexOf(spell.cast) >= 0) {
                if (rpc.user.id === $.player.id) xvt.out('You cannot cast that spell during a battle!\n')
                cb(!rpc.confused)
                return
            }
            if (nme.user.novice && [ 12,15,16,20,21,22 ].indexOf(spell.cast) >= 0) {
                if (rpc.user.id === $.player.id) xvt.out('You cannot cast that spell on a novice player.\n')
                cb(!rpc.confused)
                return
            }
            if ((from === 'Tavern' || from === 'Taxman') && spell.cast == 8) {
                if (rpc.user.id === $.player.id) xvt.out('You cannot cast that spell to retreat!\n')
                cb(!rpc.confused)
                return
            }
        }
        else {
            if ([ 9,11,12,14,15,16,17,18,19,20,21,22 ].indexOf(spell.cast) >= 0) {
                if (rpc.user.id === $.player.id) xvt.out('You cannot cast that spell on yourself!\n')
                cb(!rpc.confused)
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
                if ($.dice(100) == 1) {
                    xvt.out('Nearby is the Crown\'s Champion shaking his head and texting his Maker.\n')
                    xvt.waste(1000)
                }
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
                if (rpc === $.online) {
                    let deed = $.mydeeds.find((x) => { return x.deed === 'blast' })
                    if (!deed) deed = $.mydeeds[$.mydeeds.push($.loadDeed($.player.pc, 'blast')[0]) - 1]
                    if ((deed && br > deed.value)) {
                        deed.value = br
                        $.sound('outstanding')
                        $.saveDeed(deed)
                        xvt.out(xvt.yellow, '+', xvt.white)
                    }
                }
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
                break
            }
            else {
                $.sound('resurrect')
                if (DL) {
                    if (DL.cleric.user.status) {
                        DL.cleric.user.status = ''
                        $.activate(DL.cleric)
                        xvt.out('Now raising the ', xvt.faint, xvt.yellow, DL.cleric.user.handle, xvt.reset, ' from the dead...')
                    }
                    cb()
                    return
                }
                user('Resurrect', (opponent: active) => {
                    if (opponent.user.id === '' || opponent.user.id === $.player.id) {
                        xvt.out('\nGo get some coffee.\n')
                    }
                    else {
                        xvt.out('Now raising ', opponent.user.handle, ' from the dead...')
                        opponent.user.status = ''
                        $.saveUser(opponent)
                        $.news(`\tresurrected ${opponent.user.handle}`)
                        $.log(opponent.user.id, `\n${$.player.handle} resurrected you`)
                        xvt.out('\n')
                    }
                    cb()
                    return
                })
                return
            }

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
            iou.user = <user>{id:'', sex:'I', armor:0, weapon:0}
            $.reroll(iou.user, undefined, rpc.user.level)
            $.activate(iou)
            iou.user.xplevel = -1
            iou.user.coin = new $.coins(0)
            iou.user.sp = 0
            iou.sp = 0
            let p = round[0].party
            if (backfire) {
                iou.user.handle = `image of ${nme.user.handle}`
                iou.hp = Math.trunc(nme.hp * (rpc.user.magic + 1) / 5)
                parties[p^1].push(iou)
                xvt.out(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' render'), 'an image of '
                    , nme === $.online ? 'you' : nme.user.gender === 'I' ? 'the ' + nme.user.handle : nme.user.handle
                    , '!\n')
            }
            else {
                iou.user.handle = `image of ${rpc.user.handle}`
                iou.hp = Math.trunc(rpc.hp * (rpc.user.magic + 1) / 5)
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
                if (rpc.user.gender !== 'I') {
                    $.news(`\t${rpc.user.handle} morphed into a level ${rpc.user.level} ${rpc.user.pc}!`)
                    if (rpc !== $.online)
                        $.log(rpc.user.id, `\nYou morphed yourself into a level ${rpc.user.level} ${rpc.user.pc}!\n`)
                }
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
                if (nme.user.gender !== 'I') {
                    $.news(`\t${nme.user.handle} got morphed into a level ${nme.user.level} ${nme.user.pc}!`)
                    if (nme !== $.online)
                        $.log(nme.user.id, `\nYou got morph into a level ${nme.user.level} ${nme.user.pc} by ${rpc.user.handle}!\n`)
                }
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
                    , '... ', xvt.reset)
                xvt.waste(600)
                nme.toAC -= $.dice(nme.armor.ac / 5 + 1)
                nme.user.toAC -= $.dice(nme.armor.ac / 10 + 1)
                xvt.out(xvt.bright, $.who(nme, 'his')
                    , isNaN(+nme.user.armor) ? nme.user.armor + ' is damaged' : 'defense is lessened'
                    , $.buff(nme.user.toAC, nme.toAC), '!\n')
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
            xvt.out(xvt.magenta, 'An ', xvt.faint, 'ultraviolet', xvt.normal, ' beam emits... ', xvt.reset)
            xvt.waste(600)
            if (backfire) {
                rpc.toWC -= $.dice(rpc.weapon.wc / 5 + 1)
                rpc.user.toWC -= $.dice(rpc.weapon.wc / 10 + 1)
                xvt.out(xvt.bright, rpc === $.online ? 'you'
                    : rpc.user.gender === 'I' ? 'the ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' damage'), 'own ', isNaN(+rpc.user.weapon) ? rpc.user.weapon : 'attack'
                    , $.buff(rpc.user.toWC, rpc.toWC), '!\n')
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
                if (rpc === $.online) {
                    let deed = $.mydeeds.find((x) => { return x.deed === 'big blast' })
                    if (!deed) deed = $.mydeeds[$.mydeeds.push($.loadDeed($.player.pc, 'big blast')[0]) - 1]
                    if ((deed && br > deed.value)) {
                        deed.value = br
                        $.sound('outstanding')
                        $.saveDeed(deed)
                        xvt.out(xvt.yellow, '+', xvt.white)
                    }
                }
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
            if (nme.user.magic < 2) {
                cb(true)
                return
            }
            xvt.out(xvt.bright, xvt.cyan, 'A glowing orb radiates above '
                , $.who(backfire ? nme : rpc, 'him'), '... ')
            xvt.waste(800)
            xvt.out('\n', xvt.reset)
            let mana = 0
            if (backfire) {
                mana = Math.trunc(rpc.sp * 1. / ((5. - rpc.user.magic) + $.dice(2)))
                if (mana + nme.sp > nme.user.sp)
                    mana = nme.user.sp - nme.sp
                xvt.out(nme === $.online ? 'You'
                    : nme.user.gender === 'I' ? 'The ' + nme.user.handle : nme.user.handle
                    , $.what(rpc, ' absorb'), 'spell power (', mana.toString(), ') '
                    , 'from ', rpc === $.online ? 'you'
                    : rpc.user.gender === 'I' ? 'the ' + rpc.user.handle : rpc.user.handle)
                rpc.sp -= mana
                if (nme.user.magic > 1)
                    nme.sp += mana
            }
            else {
                mana = Math.trunc(nme.sp * 1. / ((5. - rpc.user.magic) + $.dice(2)))
                if (mana + rpc.sp > rpc.user.sp)
                    mana = rpc.user.sp - rpc.sp
                xvt.out(rpc === $.online ? 'You'
                    : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' absorb'), 'spell power (', mana.toString(), ') '
                    , 'from ', nme === $.online ? 'you'
                    : nme.user.gender === 'I' ? 'the ' + nme.user.handle : nme.user.handle)
                nme.sp -= mana
                if (rpc.user.magic > 1)
                    rpc.sp += mana
            }
            xvt.out('.\n')
            break

        case 21:
            xvt.out(xvt.bright, xvt.black, 'A black finger extends and touches '
                , $.who(backfire ? rpc : nme, 'him')
                , '... ')
            xvt.waste(800)
            xvt.out('\n', xvt.reset)
            let xp = 0
            if (backfire) {
                xp = Math.trunc(rpc.user.xp / 2)
                rpc.user.xp -= xp
                nme.user.xp += (nme.user.level > rpc.user.level) ? xp : Math.trunc(nme.user.xp / 2)
                xvt.out(nme === $.online ? 'You'
                    : nme.user.gender === 'I' ? 'The ' + nme.user.handle : nme.user.handle
                    , $.what(nme, ' absorb'), 'some life experience from ', rpc === $.online ? 'you'
                    : rpc.user.gender === 'I' ? 'the ' + rpc.user.handle : rpc.user.handle
                    , '.\n')
            }
            else {
                xp = Math.trunc(nme.user.xp / 2)
                nme.user.xp -= xp
                rpc.user.xp += (rpc.user.level > nme.user.level) ? xp : Math.trunc(rpc.user.xp / 2)
                xvt.out(rpc === $.online ? 'You'
                    : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' absorb'), 'some life experience from ', nme === $.online ? 'you'
                    : nme.user.gender === 'I' ? 'the ' + nme.user.handle : nme.user.handle
                    , '.\n')
            }
            break

        case 22:
            xvt.out(xvt.bright, xvt.black, 'A shroud of blackness engulfs '
                , $.who(backfire ? rpc : nme, 'him')
                , '... ')
            xvt.waste(800)
            xvt.out('\n', xvt.reset)
            if (backfire && rpc.user.level > 1) {
                if (rpc.user.level < 80) {
                    rpc.user.str = $.PC.ability(rpc.user.str, -$.PC.card(rpc.user.pc).toStr)
                    rpc.user.int = $.PC.ability(rpc.user.int, -$.PC.card(rpc.user.pc).toInt)
                    rpc.user.dex = $.PC.ability(rpc.user.dex, -$.PC.card(rpc.user.pc).toDex)
                    rpc.user.cha = $.PC.ability(rpc.user.cha, -$.PC.card(rpc.user.pc).toCha)
                }
                rpc.str = $.PC.ability(rpc.str, -$.PC.card(rpc.user.pc).toStr)
                rpc.int = $.PC.ability(rpc.int, -$.PC.card(rpc.user.pc).toInt)
                rpc.dex = $.PC.ability(rpc.dex, -$.PC.card(rpc.user.pc).toDex)
                rpc.cha = $.PC.ability(rpc.cha, -$.PC.card(rpc.user.pc).toCha)
                rpc.user.xp = Math.round(nme.user.xp / 2)
                rpc.user.xplevel--
                rpc.user.level--
                rpc.user.hp -= Math.round(rpc.user.level + $.dice(rpc.user.level) + rpc.user.str / 10 + (rpc.user.str > 90 ? rpc.user.str - 90 : 0))
                if (rpc.user.magic > 1)
                    rpc.user.sp -= Math.round(rpc.user.level + $.dice(rpc.user.level) + rpc.user.int / 10 + (rpc.user.int > 90 ? rpc.user.int - 90 : 0))

                nme.user.xp *= 2
                xvt.out(nme === $.online ? 'You'
                    : nme.user.gender === 'I' ? 'The ' + nme.user.handle : nme.user.handle
                    , $.what(nme, ' gain'), 'an experience level off ', rpc === $.online ? 'you'
                    : rpc.user.gender === 'I' ? 'the ' + rpc.user.handle : rpc.user.handle
                    , '.\n')
                if ($.checkXP(nme, cb)) return
            }
            else if (!backfire && nme.user.level > 1) {
                nme.user.xp = Math.round(nme.user.xp / 2)
                nme.user.xplevel--
                nme.user.level--
                if (nme.user.level < 80) {
                    nme.user.str = $.PC.ability(nme.user.str, -$.PC.card(nme.user.pc).toStr)
                    nme.user.int = $.PC.ability(nme.user.int, -$.PC.card(nme.user.pc).toInt)
                    nme.user.dex = $.PC.ability(nme.user.dex, -$.PC.card(nme.user.pc).toDex)
                    nme.user.cha = $.PC.ability(nme.user.cha, -$.PC.card(nme.user.pc).toCha)
                }
                nme.str = $.PC.ability(nme.str, -$.PC.card(nme.user.pc).toStr)
                nme.int = $.PC.ability(nme.int, -$.PC.card(nme.user.pc).toInt)
                nme.dex = $.PC.ability(nme.dex, -$.PC.card(nme.user.pc).toDex)
                nme.cha = $.PC.ability(nme.cha, -$.PC.card(nme.user.pc).toCha)
                nme.user.hp -= Math.round(nme.user.level + $.dice(nme.user.level) + nme.user.str / 10 + (nme.user.str > 90 ? nme.user.str - 90 : 0))
                if (nme.user.magic > 1)
                    nme.user.sp -= Math.round(nme.user.level + $.dice(nme.user.level) + nme.user.int / 10 + (nme.user.int > 90 ? nme.user.int - 90 : 0))

                rpc.user.xp *= 2
                xvt.out(rpc === $.online ? 'You'
                    : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' gain'), 'an experience level off ', nme === $.online ? 'you'
                    : nme.user.gender === 'I' ? 'the ' + nme.user.handle : nme.user.handle
                    , '.\n')
                if ($.checkXP(rpc, cb)) return
            }
            else {
                cb(true)
                return
            }
            break

        case 23:
            if (backfire) {
                if (rpc.user.magic > 2 && rpc.user.toAC > 0)
                    rpc.user.toAC--
                else if(rpc.toAC > 0)
                    rpc.toAC -= $.dice(rpc.toAC)
                else
                    rpc.toAC--
                xvt.out($.who(rpc, 'His'), isNaN(+rpc.user.armor) ? rpc.user.armor : 'defense', ' loses most of its effectiveness.\n')
            }
            else {
                $.sound('shield')
                xvt.out('A magical field glitters around ', isNaN(+rpc.user.armor) ? $.who(rpc, 'his') + rpc.user.armor : $.who(rpc, 'him'), '.\n')
                if (rpc.user.magic > 2 && rpc.user.toAC >= 0)
                    rpc.user.toAC++
                rpc.toAC += $.dice(rpc.armor.ac)
            }
            rpc.altered = true
            break

        case 24:
            if (backfire) {
                xvt.out($.who(rpc, 'His'), isNaN(+rpc.user.weapon) ? rpc.user.weapon : 'attack', ' loses most of its effectiveness.\n')
                if (rpc.user.magic > 2 && rpc.user.toWC > 0)
                    rpc.user.toWC--
                else if(rpc.toWC > 0)
                    rpc.toWC -= $.dice(rpc.toWC)
                else
                    rpc.toWC--
            }
            else {
                $.sound('hone')
                xvt.out($.who(rpc, 'His'), isNaN(+rpc.user.weapon) ? rpc.user.weapon : 'attack', ' emanates magical sharpness.\n')
                if (rpc.user.magic > 2 && rpc.user.toWC >= 0)
                    rpc.user.toWC++
                rpc.toWC += $.dice(rpc.weapon.wc)
            }
            rpc.altered = true
            break
        }

        cb()
    }
}

export function melee(rpc: active, enemy: active, blow = 1) {
    let action: string
    let hit = 0

    if (rpc !== $.online && rpc.user.coward && rpc.hp < (rpc.user.hp / 4)) {
        rpc.hp = -1
        xvt.out(xvt.bright, xvt.cyan
            , rpc.user.gender === 'I' ? 'The ' : '', rpc.user.handle
            , xvt.normal, ' runs away from '
            , xvt.faint, 'the battle!'
            , xvt.reset, '\n'
        )
        xvt.waste(1000)

        if (from === 'User') {
            rpc.user.blessed = ''
            rpc.user.cursed = $.player.id
            $.saveUser(rpc)
            $.news(`\tcursed ${rpc.user.handle} for running away`)
            $.log(rpc.user.id, `\n${enemy.user.handle} curses you for running away!\n`)
        }
        return
    }

    let n = rpc.dex + (rpc.dex - enemy.dex)
    if (blow == 1)
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
            let deed = $.mydeeds.find((x) => { return x.deed === 'melee' })
            if (!deed) deed = $.mydeeds[$.mydeeds.push($.loadDeed($.player.pc, 'melee')[0]) - 1]
            if (hit > deed.value) {
                deed.value = hit
                $.sound('outstanding')
                $.saveDeed(deed)
                xvt.out(xvt.yellow, '+', xvt.white)
            }
            xvt.out('You ', action ,' ')
            if (alive[0] == 1 && alive[1] == 1)
                xvt.out($.who(enemy, 'him'))
            else
                xvt.out(enemy.user.gender === 'I' ? 'the ' : '', enemy.user.handle, ' ')
        }
        else {
            let w = action.split(' ')
            if (w.length > 1) w.push('')
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
                xvt.out('You ', enemy.user.xplevel < 1 ? 'eliminated' : 'killed'
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
        $.action('keypad')
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
                , 'some ', $.Poison.merchant[vial - 1]
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

            //  paint profile
            xvt.out('\n')
            if (rpc.user.id) {
				let userPNG = `images/user/${rpc.user.id}.png`
				try {
					fs.accessSync(userPNG, fs.constants.F_OK)
					userPNG = `user/${rpc.user.id}`
				} catch(e) {
					userPNG = 'player/' + rpc.user.pc.toLowerCase() + (rpc.user.gender === 'F' ? '_f' : '')
				}
				$.profile({ png:userPNG, handle:rpc.user.handle, level:rpc.user.level, pc:rpc.user.pc })
				if (!$.cat('player/' + rpc.user.id)) $.cat('player/' + rpc.user.pc.toLowerCase())
            }
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
                    xvt.out(' ', $.Access.name[rs[i].access].sysop ? xvt.cyan : xvt.faint
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
