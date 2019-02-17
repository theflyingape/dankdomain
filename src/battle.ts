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
    let gang: gang = { name:'',
        members:[], handles:[], genders:[], melee:[], status:[], validated:[],
        win:0, loss:0, banner:0, trim:0, back:0, fore:0
    }
    let parties: [ active[], active[] ]
    let alive: number[]
    let round: { party:number, member:number, react:number }[]
    let bs: number
    let volley: number


function end() {
    $.unlock($.player.id, true)

    //  diminish any temporary buff
    if ($.online.toAC > 0 && !$.Ring.power($.player.rings, 'buff').power) $.online.toAC--
    if ($.online.toWC > 0 && !$.Ring.power($.player.rings, 'buff').power) $.online.toWC--

    if (from === 'Naval') {
        if ($.online.hp > 0) {
            $.sound('naval' + (parties[1][0].user.id === '_OLD' ? '_f' : ''), 32)
            $.PC.adjust('str', 2, 1, 1)
            $.PC.adjust('int', 2, 1, 1)
            $.PC.adjust('dex', 2, 1, 1)
            $.PC.adjust('cha', 2, 1, 1)
            $.beep()
            xvt.outln(); xvt.waste(500)
            Battle.yourstats(); xvt.waste(500)
            xvt.outln(); xvt.waste(500)
        }
    }

    if (from === 'Tavern') {
        if ($.online.hp < 1) {
            $.barkeep.user.weapon = $.player.weapon
            $.Weapon.equip($.online, $.Weapon.merchant[0])
            $.saveUser($.player)
            $.reason = `schooled by ${$.barkeep.user.handle}`

            $.run(`UPDATE Players
                set kills=kills+1, status='${$.player.id}', weapon='${$.barkeep.user.weapon}'
                WHERE id='${$.barkeep.user.id}'`)

            xvt.outln(`He picks up your ${$.barkeep.user.weapon} and triumphantly waves it around to`)
            xvt.outln(`the cheering crowd.  He struts toward the mantelpiece to hang his new trophy.\n`)
            $.sound('winner', 32)
            xvt.outln(xvt.bright, xvt.green, '"Drinks are on the house!"')
            xvt.waste(2250)
        }
        else {
            $.music('barkeep')
            $.run(`UPDATE Players
                set killed=killed+1, status='', weapon='${$.barkeep.user.weapon}'
                WHERE id='${$.barkeep.user.id}'`)
            $.news(`\tdefeated ${$.barkeep.user.handle}`)
            $.wall(`defeated ${$.barkeep.user.handle}`)
            xvt.waste(1234)
            $.sound('ko')
            if ($.player.cha > 49)
                $.PC.adjust('cha', -22, -20, -2)
            else
                $.player.coward = true
        }
        $.player.coward = false
    }

    if (/Gates|Taxman/.test(from)) {
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
            $.beep()
            $.death($.reason || 'tax evasion')
            xvt.outln(xvt.bright, xvt.blue, '"Thanks for the taxes!"')
            $.sound('thief2', 16)
        }
        else if (from === 'Taxman') {
            $.news(`\tdefeated ${$.taxman.user.handle}`)
            $.wall(`defeated ${$.taxman.user.handle}`)
        }
        $.player.coward = false
    }

    if (from === 'User') {
        let opponent = parties[1][0]
        if (!(opponent.user.id[0] === '_' || opponent.user.gender === 'I')) {
            $.saveUser(opponent, false, true)
            if ($.player.hp > 0 && opponent.hp == 0) {
                $.action('ny')
                xvt.app.form = {
                'yn': { cb:() => {
                    if (/Y/i.test(xvt.entry))
                        xvt.app.focus = 'message'
                    else {
                        xvt.outln()
                        fini()
                    }
                    }, cancel:'N', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:20 },
                'message': { cb:() => {
                    xvt.outln()
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
export function engage(menu:string, party: active|active[], mob: active|active[], cb:Function) {

    //  process parameters
    from = menu

    let a: active[], b: active[]
    if (xvt.validator.isArray(party))
        a = <active[]>party
    else
        a = new Array(<active>party)

    if (xvt.validator.isArray(mob))
        b = <active[]>mob
    else
        b = new Array(<active>mob)

    parties = [ a, b ]
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
        if (volley > 12345 && !retreat) {
            retreat = true
            $.player.coward = true
        }
        if ($.online.confused)
            $.activate($.online, false, true)
        end()
        return
    }

    if (!round.length) {
        if (volley > 1) {
            xvt.outln()
            xvt.out('    -=', $.bracket('*', false), '=-\n')
            xvt.waste($.online.hp > 0 ? 80 : 800)
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
    let enemy: active
    let rpc = parties[n.party][n.member]
    if (rpc.hp < 1 || rpc.user.xplevel < 1) {
        next()
        return
    }

    //  recovery?
    if (rpc.confused) {
        $.PC.adjust('int', $.PC.card(rpc.user.pc).toInt, 0, 0, rpc)
        $.PC.adjust('dex', $.PC.card(rpc.user.pc).toDex, 0, 0, rpc)
    }

    //  choose an opponent
    let mob = n.party ^ 1
    let nme: number
    do { nme = $.dice(parties[mob].length) - 1 } while (parties[mob][nme].hp < 1)
    enemy = parties[mob][nme]
    if (volley == 1 && rpc !== $.online) xvt.outln()

    //  a frozen treat?
    let skip = $.Ring.power(enemy.user.rings, 'skip', 'pc', rpc.user.pc)
    if (skip.power && $.dice(16 - 2 * enemy.user.magic) > 1)
        skip.power = false
    if (!skip.power && $.dice(enemy.dex) > 94 && $.dice(enemy.user.steal + 1) > $.dice(rpc.user.steal + 2))
        skip.power = true
    if (skip.power && !$.Ring.power(rpc.user.rings, 'ring').power) {
        let how = 'paralyze', color = xvt.magenta
        if (enemy.user.pc == 'Lizard') {
            how = 'freeze'
            color = xvt.cyan
        }
        else if (enemy.user.pc == 'Ogre') {
            how = 'grab'
            color = xvt.yellow
        }
        else if (enemy.user.pc == 'Undead') {
            how = 'hynoptize'
            color = xvt.white
        }
        else if (enemy == $.online || enemy.user.gender !== 'I') {
            how = 'dodge'
            color = xvt.red
        }
        xvt.outln(xvt.faint, color, '>> ', xvt.normal
            , $.who(enemy, 'You'), ' ', xvt.bright, $.what(enemy, how)
            , xvt.normal, $.who(rpc, 'you')
            , xvt.faint, color, ' <<')
        xvt.waste(400)
        next()
        return
    }

    if (rpc === $.online) {
        $.action('battle')
        xvt.app.form = {
            'attack': {cb:() => {
                xvt.outln()
                if (/C/i.test(xvt.entry)) {
                    Battle.cast($.online, next, enemy)
                    return
                }

                xvt.outln()
                if (/R/i.test(xvt.entry)) {
                    if (/Naval|Tavern|Taxman/.test(from)) {
                        if (from === 'Naval')
                            xvt.outln(xvt.bright, xvt.cyan, '"You cannot escape me, mortal."')
                        if (from === 'Tavern')
                            xvt.outln(xvt.bright, xvt.green, 'You try to escape, but the crowd throws you back to witness the slaughter!')
                        if (from === 'Taxman')
                            xvt.outln(xvt.bright, xvt.blue, '"You can never escape the taxman!"')
                        $.sound({ _BAR:'growl', _NEP:'thunder', _OLD:'crone', _TAX:'thief2' }[enemy.user.id], 12)
						$.PC.adjust('cha', -2, -1)
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
                        xvt.outln(xvt.lcyan, [
                            'You trip and fail in your attempt to retreat.',
                            `${who} pulls you back into the battle.`,
                            `${who} prevents your retreat and says,\n  ${xvt.attr(xvt.cyan, "I'm not through with you yet!")}`,
                            `${who} outmaneuvers you and says,\n  ${xvt.attr(xvt.cyan, "You started this, I'm finishing it.")}`,
                            `${who} blocks your path and says,\n  ${xvt.attr(xvt.cyan, "Where do you want to go today?")}`,
                        ][$.dice(5) - 1])
                        $.beep()
                        xvt.outln()
                        next()
                        return
                    }

                    retreat = true
                    $.player.retreats++
                    let who = $.player.gender === 'F' ? 'She' : 'He'
                    xvt.outln(xvt.lblue, [
                        'You are successful in your attempt to retreat.',
                        'You limp away from the battle.',
                        `You decide this isn't worth the effort.`,
                        `You listen to the voice in your head yelling, ${xvt.bright, xvt.attr(xvt.red)}"Run!"`,
                        `You say, ${xvt.attr(xvt.bright, xvt.cyan)}"${who} who fights and runs away lives to fight another day!"`
                        ][$.dice(5) - 1])
                    if ($.online.confused)
                        $.activate($.online, false, true)
                    if (from === 'Party' && $.player.gang)
                        $.run(`UPDATE Gangs SET loss = loss + 1 WHERE name = '${$.player.gang}'`)
                    if (from === 'User' && enemy.user.gender !== 'I') {
						$.PC.adjust('cha', -2, -1)
                        $.log(enemy.user.id, `\n${$.player.handle}, the coward, retreated from you.`)
                    }
                    end()
                    return
                }

                if (/Y/i.test(xvt.entry)) {
                    yourstats(false)
                    volley += 500
                    xvt.app.refocus()
                    return
                }

                xvt.out(xvt.bright, xvt.white)
                melee(rpc, enemy)
                next()
                return
            }, cancel:'R', enter:'A', eol:false, max:1, match:/A|C|R|Y/i, timeout:30 },
            'backstab': {cb:() => {
                if (/N/i.test(xvt.entry)) bs = 1
                xvt.out('\n\n', xvt.bright, xvt.white)
                melee(rpc, enemy, bs)
                next()
                return
            }, cancel:'N', enter:'Y', eol:false, match:/Y|N/i, max:1, timeout:30 },
        }

        //  sneaking
        if (volley == 1) {
            bs = $.player.backstab
            let roll = $.dice(100 + bs * $.player.level / (2 * ($.player.melee + 2)))
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
                , xvt.normal, xvt.cyan, ',', xvt.bright
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
            choices += xvt.attr(xvt.normal, xvt.blue, '] ')
            bs = 1

            xvt.app.form['attack'].prompt = choices
            xvt.app.form['attack'].prompt += xvt.attr($.bracket('A', false), xvt.cyan, 'ttack, ')
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
        let odds: number = (from === 'Party' ? 6 : from === 'Dungeon' ? 5 : 4) - $.int(+enemy.user.coward)
        let roll: number = odds + $.int(rpc.user.magic / 2) + rpc.adept + 1
        if (rpc.user.level > enemy.user.level)
            roll += Math.round((rpc.user.level - enemy.user.level) / 4)
        if (roll / odds > odds) roll = odds * odds

        if (rpc.user.magic == 1 && $.dice(roll) > odds) {
            if ($.Magic.have(rpc.user.spells, 8)
                && rpc.hp < rpc.user.hp / (rpc.user.level / (11 - rpc.adept)  + 1)
                && ($.dice(6 - rpc.adept) == 1 || rpc.user.coward))
                    mm = 8
            else if ($.Magic.have(rpc.user.spells, 7)
                    && rpc.hp < $.int(rpc.user.hp / 2)
                    && $.dice(enemy.user.melee + 2) > 1)
                    mm = 7
            else if ($.Magic.have(rpc.user.spells, 9)
                    && (!rpc.user.id || rpc.hp < $.int(rpc.user.hp / 2))
                    && $.dice(enemy.user.melee + 2) > 1)
                    mm = 9
            else if ($.Magic.have(rpc.user.spells, 13)
                    && rpc.hp < (rpc.user.hp / 6)
                    && $.dice((rpc.user.level - enemy.user.level) / 6 + odds - rpc.adept) == 1)
                    mm = 13
            else if (!rpc.confused && rpc.hp > $.int(rpc.user.hp / 2)) {
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
                    && rpc.hp > $.int(rpc.user.hp / 2)
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
                    && rpc.hp < (rpc.user.hp / 5))
                        mm = 13
                else if ($.Magic.have(rpc.user.spells, 8)
                    && rpc.sp >= $.Magic.power(rpc, 8)
                    && rpc.hp < rpc.user.hp / (rpc.user.level / (11 - rpc.adept) + 1)
                    && ($.dice(5 - rpc.adept) == 1 || rpc.user.coward))
                        mm = 8
                else if ($.Magic.have(rpc.user.spells, 7)
                    && rpc.sp >= $.Magic.power(rpc, 7)
                    && rpc.hp < $.int(rpc.user.hp / 2)
                    && ($.dice(enemy.user.melee + 2) == 1 || rpc.sp < $.Magic.power(rpc, 8)))
                        mm = 7
                else if (!rpc.confused && $.Magic.have(rpc.user.spells, 9)
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

        //  was opponent defeated?
        if (typeof enemy !== 'undefined' && enemy.hp < 1) {
            enemy.hp = 0    // killed
            if (enemy == $.online) {
                $.player.killed++
                $.run(`UPDATE Players set killed=${$.player.killed} WHERE id='${$.player.id}'`)
                xvt.outln('\n', xvt.bright, xvt.yellow, rpc.user.gender === 'I' ? 'The ' : '', rpc.user.handle
                    , ' killed you!\n')
                if (from !== 'Party') {
                    $.death($.reason || (rpc.user.id.length
                        ? `defeated by ${rpc.user.handle}`
                        : `defeated by a level ${rpc.user.level} ${rpc.user.handle}`))
                    $.sound('killed', 12)
                }
            }
            else {
                if (rpc == $.online) {
                    $.player.kills++
                    if (from !== 'Party' ) {
                        xvt.outln('You ', enemy.user.xplevel < 1 ? 'eliminated' : 'killed'
                            , enemy.user.gender === 'I' ? ' the ' : ' ', enemy.user.handle, '!\n')
                        if (enemy.user.id !== '' && enemy.user.id[0] !== '_') {
                            $.sound('kill', 15)
                            $.music($.player.gender === 'M' ? 'bitedust' : 'queen')
                            $.news(`\tdefeated ${enemy.user.handle}, a level ${enemy.user.xplevel} ${enemy.user.pc}`)
                            $.wall(`defeated ${enemy.user.handle}`)
                        }
                    }
                    if (from == 'Monster' && enemy.user.xplevel > 0) {
                        $.news(`\tdefeated a level ${enemy.user.xplevel} ${enemy.user.handle}`)
                        $.wall(`defeated a level ${enemy.user.level} ${enemy.user.handle}`)
                    }
                    if (from == 'Dungeon') $.animated(['bounceOut', 'fadeOut', 'flipOutX', 'flipOutY', 'rollOut', 'rotateOut', 'zoomOut'][$.dice(7) - 1])
                    xvt.waste(200)
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
        $.run(`UPDATE Gangs SET win = win + 1 WHERE name = '${parties[w][0].user.gang}'`)
        $.run(`UPDATE Gangs SET loss = loss + 1 WHERE name = '${parties[l][0].user.gang}'`)

        // player(s) can collect off each corpse
        let tl = [ 1, 1 ]
        let take: number = 0
        let coin = new $.coins(0)

        for (let m in parties[w]) {
            tl[w] += parties[w][m].user.xplevel
            take += $.money(parties[w][m].user.xplevel + 1)
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
            //  dead member gets less of the booty, taxman always gets a cut
            let cut = parties[w][m].hp > 0 ? 0.95 : 0.45
            let max = $.int(((4 + parties[w].length - parties[l].length) / 2) * 1250 * $.money(parties[w][m].user.xplevel) * cut)
            let award = $.int(coin.value * $.money(parties[w][m].user.xplevel) / take * cut)
            award = award > coin.value ? coin.value : award
            award = award < 1 ? 0 : award > max ? max : award
            parties[w][m].user.coin.value += award
            coin.value -= award
            take -= $.money(parties[w][m].user.xplevel)

            let xp = $.int($.experience(parties[w][m].user.xplevel)
                * tl[l] / tl[w] / ((4 + parties[w].length - parties[l].length) / 2))
            parties[w][m].user.xp += xp

            if (parties[w][m] === $.online) {
                if (xp)
                    xvt.outln('\nYou get ', sprintf(xp < 1e+8 ? '%d' : '%.7e', xp), ' experience.')
                if (award)
                    xvt.outln('You get your cut worth ', new $.coins(award).carry(), '.')
                xvt.waste(600)
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
            xvt.outln()
            $.beep()
            $.loadUser($.taxman)
            $.taxman.user.bank.value += coin.value
            $.run(`UPDATE Players
                set bank = ${$.taxman.user.bank.value}
                WHERE id='${$.taxman.user.id}'`).changes
            xvt.outln($.taxman.user.handle, ' took ', $.who($.taxman, 'his'), 'cut worth ', coin.carry(), '.')
            xvt.waste(600)
        }

        if (winner === $.online) {
            $.news(`\tdefeated the gang, ${parties[l][0].user.gang}`)
            $.wall(`defeated the gang, ${parties[l][0].user.gang}`)
        }
        else if ($.online.hp == 0) {
            $.death(`defeated by the gang, ${parties[w][0].user.gang}`)
            $.music('.')
            $.sound('effort', 15)
        }
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
                $.log(loser.user.id, `\n${$.player.handle} killed you!`)

                if (/Monster|User/.test(from)) {
                    $.animated(loser.user.id ? 'hinge' : 'rotateOutDownRight')
                    loser.altered = true
                    loser.user.status = winner.user.id
                    let x = loser.user.id ? 2 : 3
                    xp += $.experience(loser.user.xplevel, x)
                    if (winner.user.level < loser.user.xplevel)
                        loser.user.xplevel = winner.user.level
                }
                else
                    xp += $.experience(loser.user.xplevel, 18 - (1.333 * loser.user.immortal))

                if (loser.user.sex !== 'I' && loser.user.rings.length) {
                    xvt.out('You start by removing ', loser.user.rings.length > 1 ? 'all of ' : '', $.who(loser, 'his'), 'rings...')
                    $.sound('click', 8)
                    loser.user.rings.forEach(ring => {
                        if ($.Ring.wear(winner.user.rings, ring)) {
                            $.getRing(['fondle', 'polish', 'slip on', 'wear', 'win'][$.dice(5) - 1], ring)
                            $.saveRing(ring, winner.user.id)
                            $.sound('click', 8)
                            $.log(loser.user.id, `... took your ${ring} ring.`)
                        }
                    })
                    loser.user.rings = []
                    loser.altered = true
                    xvt.outln()
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
                        xvt.outln($.who(winner, 'He'), $.what(winner, 'take'), $.who(loser, 'his'), winner.user.weapon, '.')
                    else if (from === 'Monster' && result)
                        xvt.outln($.who(winner, 'He'), $.what(winner, 'get'), credit.carry(), ' for ', $.who(loser, 'his'), loser.user.weapon, '.')

                    credit = new $.coins(loser.armor.value)
                    credit.value = $.worth(credit.value, winner.cha)
                    result = $.Armor.swap(winner, loser, credit)
                    if (xvt.validator.isBoolean(result) && result) {
                        xvt.outln($.who(winner, 'He'), 'also ', $.what(winner, 'take'), $.who(loser, 'his'), winner.user.armor, '.')
                        if (/_NEP|_OLD|_TAX/.test(loser.user.id)) $.sound('shield', 16)
                    }
                    else if (from === 'Monster' && result)
                        xvt.outln($.who(winner, 'He'), 'also ', $.what(winner, 'get'), credit.carry(), ' for ', $.who(loser, 'his'), loser.user.armor, '.')
                }
                else {
                    if ($.Weapon.swap(winner, loser)) {
                        xvt.outln($.who(winner, 'He'), $.what(winner, 'take'), $.who(loser, 'his'), winner.user.weapon, '.')
                        xvt.waste(250)
                        $.log(loser.user.id, `... and took your ${winner.user.weapon}.`)
                    }
                    if ($.Armor.swap(winner, loser)) {
                        xvt.outln($.who(winner, 'He'), 'also ', $.what(winner, 'take'), $.who(loser, 'his'), winner.user.armor, '.')
                        xvt.waste(250)
                        $.log(loser.user.id, `... and took your ${winner.user.armor}.`)
                    }
                    if (winner.user.cursed) {
                        winner.user.cursed = ''
                        $.PC.adjust('str', 10, 0, 0, winner)
                        $.PC.adjust('int', 10, 0, 0, winner)
                        $.PC.adjust('dex', 10, 0, 0, winner)
                        $.PC.adjust('cha', 10, 0, 0, winner)
                        loser.user.cursed = winner.user.id
                        loser.altered = true
                        xvt.outln(xvt.bright, xvt.black, 'A dark cloud has lifted and shifted.')
                        xvt.waste(600)
                        $.log(loser.user.id, `... and left you with a dark cloud.`)
                    }
                    if (loser.user.blessed) {
                        loser.user.blessed = ''
                        loser.altered = true
                        if (winner.user.coward)
                            winner.user.coward = false
                        else {
                            winner.user.blessed = loser.user.id
                            $.PC.adjust('str', 10, 0, 0, winner)
                            $.PC.adjust('int', 10, 0, 0, winner)
                            $.PC.adjust('dex', 10, 0, 0, winner)
                            $.PC.adjust('cha', 10, 0, 0, winner)
                            xvt.outln(xvt.bright, xvt.yellow, 'A shining aura ', xvt.normal, 'surrounds you.')
                            xvt.waste(600)
                        }
                        $.log(loser.user.id, `... and took your blessedness.`)
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
                            xvt.waste(600)
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
                    xvt.out(600)
                }
            }
        }
        if (xp) {
            winner.user.xp += xp
            xvt.outln('You get'
                , parties[l].length > 1 ? ' a total of ' : ' '
                , sprintf(xp < 1e+8 ? '%d' : '%.7e', xp), ' experience.'
            )
        }
        if (coin.value) {
            winner.user.coin.value += coin.value
            xvt.outln('You get'
                , parties[l].length > 1 ? ' a total of ' : ' '
                , coin.carry(), ' '
                , parties[l].length > 1 ? 'they were ' : $.who(loser, 'he') + 'was '
                , 'carrying.'
            )
        }
    }
    else {
        //  accruing money is always eligible
        if ($.player.coin.value) {
            winner.user.coin.value += $.player.coin.value
            xvt.outln(xvt.reset, $.who(winner, 'He'), 'gets ', $.player.coin.carry(), ' you were carrying.\n')
            $.player.coin.value = 0
        }
        xvt.out(600)

        //  manage grace modifiers, but not sticky for NPC
        if (winner.user.cursed) {
            if ($.player.blessed) {
                $.player.blessed = ''
                xvt.out(xvt.bright, xvt.yellow, 'Your shining aura ', xvt.normal, 'leaves')
            }
            else {
                $.player.coward = false
                $.player.cursed = winner.user.id
                winner.user.cursed = ''
                xvt.out(xvt.bright, xvt.black, 'A dark cloud hovers over', xvt.reset)
            }
            xvt.outln(xvt.faint, ' you.\n')
            xvt.waste(600)
        }

        //  manage any asset upgrades for PC
        if (winner.user.id && winner.user.id[0] !== '_') {
            $.log(winner.user.id, `\nYou killed ${$.player.handle}!`)
            $.player.coward = true
            $.saveUser($.online)

            if ($.player.blessed) {
                winner.user.blessed = $.player.id
                $.player.blessed = ''
                xvt.outln(xvt.bright, xvt.yellow, 'Your shining aura ', xvt.normal, 'leaves ', xvt.faint, 'you.\n')
                xvt.waste(600)
            }
            if ($.Weapon.swap(winner, $.online)) {
                xvt.outln($.who(winner, 'He'), $.what(winner, 'take'), $.who($.online, 'his'), winner.user.weapon, '.')
                $.log(winner.user.id, `You upgraded to ${winner.user.weapon}.`)
            }
            if ($.Armor.swap(winner, $.online)) {
                xvt.outln($.who(winner, 'He'), 'also ', $.what(winner, 'take'), $.who($.online, 'his'), winner.user.armor, '.')
                $.log(winner.user.id, `You upgraded to ${winner.user.armor}.`)
            }
            if ($.player.rings.length) {
                xvt.outln($.who(winner, 'He'), 'also ', $.what(winner, 'remove'), $.player.rings.length > 1 ? 'all of ' : '', 'your rings...')
                $.player.rings.forEach(ring => {
                    xvt.out(' ', $.bracket(ring, false), ' ')
                    $.sound('click')
                    if ($.Ring.wear(winner.user.rings, ring))
                        $.saveRing(ring, winner.user.id)
                })
                $.player.rings = []
                xvt.outln()
                $.log(winner.user.id, `... and there were rings, too!`)
            }

            if (winner.user.gang && winner.user.gang === $.player.gang) {
                $.music('punk')
                $.player.maxcha--
                $.player.cha--

                gang = $.loadGang($.query(`SELECT * FROM Gangs WHERE name = '${$.player.gang}'`)[0])
                let n = gang.members.indexOf(winner.user.id)
                if (n == 0) {
                    xvt.outln($.who(winner,'He'), 'says, "', xvt.bright, 'Let that be a lesson to you punk!', xvt.reset, '"')
                    xvt.waste(600)
                }
                if (gang.members[0] === $.player.id) {
                    gang.members[0] = winner.user.id
                    gang.members[n] = $.player.id
                    $.saveGang(gang)
                    $.player.cha--
                    xvt.outln($.who(winner,'He'), `takes over as the leader of ${gang.name}.\n`)
                    xvt.waste(600)
                }
            }
            $.saveUser(winner)
            $.player.coward = false
        }
    }
    $.online.altered = true
}

export function brawl(rpc:active, nme:active) {
    if ($.dice(100) >= (50 + $.int(rpc.dex / 2))) {
        $.sound(rpc.user.id === $.player.id ? 'whoosh' : 'swoosh')
        xvt.outln(`\n${$.who(nme, 'He')}${$.what(nme, 'duck')}${$.who(rpc,'his')}punch.`)
        xvt.waste(400)
        let patron = $.PC.encounter()
        if (patron.user.id && patron.user.id != rpc.user.id && patron.user.id != nme.user.id && !patron.user.status) {
            xvt.outln(`\n${$.who(rpc, 'He')}${$.what(rpc, 'hit')}${patron.user.handle}!`)
            $.sound('duck', 6)
            let bp = punch(rpc)
            patron.bp -= bp
            if (patron.bp > 0) {
                xvt.out('\nUh oh! ')
                xvt.waste(600)
                xvt.outln(` Here comes ${patron.user.handle}!`)
                xvt.waste(600)
                this.brawl(patron, rpc)
            }
            else
                knockout(rpc, patron)
        }
    }
    else {
        let bp = punch(rpc)
        xvt.outln(`\n${$.who(rpc, 'He')}${$.what(rpc, 'punch')}${$.who(nme,'him')}for ${bp} points.`)
        nme.bp -= bp
        if (nme.bp < 1)
            knockout(rpc, nme)
    }

    function knockout(winner:active, loser:active) {
        let xp = $.experience(loser.user.xplevel, 9)
        $.run(`UPDATE Players SET tw=tw+1,xp=xp+${xp},coin=coin+${loser.user.coin.value} WHERE id='${winner.user.id}'`)
        $.run(`UPDATE Players SET tl=tl+1,coin=0 WHERE id='${loser.user.id}'`)

        xvt.outln('\n', winner.user.id === $.player.id ? 'You' : winner.user.handle
            , ` ${$.what(winner, 'knock')}${$.who(loser, 'him')}out!`)
        xvt.waste(600)
        if (xp)
            xvt.outln(`\n${$.who(winner, 'He')}${$.what(winner, 'get')}`, sprintf(xp < 1e+8 ? '%d' : '%.7e', xp), ' experience.')
        winner.user.xp += xp
        if (loser.user.coin.value) {
            xvt.outln(`${$.who(loser, 'He')}was carrying ${loser.user.coin.carry()}`)
            winner.user.coin.value += loser.user.coin.value
            loser.user.coin.value = 0
        }
        winner.user.tw++
        xvt.waste(600)

        loser.user.tl++
        if (loser.user.id === $.player.id) {
            $.sound('ko')
            let m = Math.abs($.online.bp)
            while (m > 9)
                m >>= 1
            m++
            xvt.sessionAllowed = $.int(xvt.sessionAllowed - 60 * m, true) + 60
            xvt.out(`\nYou are unconscious for ${m} minute`, m != 1 ? 's' : '')
            while (m--) {
                xvt.out('.')
                xvt.waste(300)
            }
            xvt.outln()
            $.news(`\tgot knocked out by ${winner.user.handle}`)
        }
        else
            $.log(loser.user.id, `\n${winner.user.handle} knocked you out.`)
    }

    function punch(p: active): number {
        $.sound('punch' + $.dice(3))
        let punch = $.int((p.user.level + p.str / 10) / 2)
        punch += $.dice(punch)
        return punch
    }
}

export function cast(rpc: active, cb:Function, nme?: active, magic?: number, DL?: ddd) {

    let tricks = Object.assign([], rpc.user.spells)
    let Summons = [ 'Teleport', 'Resurrect' ]
    Object.assign([], Summons).forEach(summon => {
        if ($.Ring.power(rpc.user.rings, summon.toLowerCase()).power) {
            if (nme && $.Ring.power(nme.user.rings, 'ring').power)
                Summons.splice(Summons.indexOf(summon), 1)
            else
                $.Magic.add(tricks, summon)
        }
        else
            Summons.splice(Summons.indexOf(summon), 1)
    })

    if (!tricks.length) {
        if (rpc === $.online) {
            xvt.outln(`\nYou don't have any magic.`)
            cb(true)
        }
        else {
            xvt.out('cast() failure :: ', rpc)
            cb()
        }
        return
    }

    if (rpc === $.online) {
        $.action('list')
        xvt.app.form = {
            'magic': { cb: () => {
                xvt.outln()
                if (xvt.entry === '') {
                    cb(true)
                    return
                }

                let spell = Object.keys($.Magic.spells)[+xvt.entry - 1]

                if (!$.Magic.have(tricks, +xvt.entry)) {
                	for (let i in tricks) {
                        let p = tricks[i]
                        spell = Object.keys($.Magic.spells)[p - 1]
                        if (rpc.user.magic < 2)
                            xvt.out($.bracket(p), sprintf('%-18s  (%d%%)', spell, $.Magic.ability(spell, rpc, nme).fail))
                        else
                            xvt.out($.bracket(p), sprintf('%-18s  %4d  (%d%%)'
                                , spell
                                , Summons.includes(spell) ? 0
                                    : rpc.user.magic < 4 ? $.Magic.spells[spell].mana
                                    : $.Magic.spells[spell].enchanted
                                , $.Magic.ability(spell, rpc, nme).fail)
                            )
                    }
                    xvt.outln()
                    xvt.app.refocus()
                }
                else {
                    xvt.outln()
                    invoke(spell, Summons.includes(spell))
                }
            }, prompt:['Use wand', 'Read scroll', 'Cast spell', 'Uti magicae'][$.player.magic - 1] + ' (?=list): ', max:2 }
        }
        xvt.app.focus = 'magic'
        return
    }
    else {
        let spell = Object.keys($.Magic.spells)[magic - 1]
        invoke(spell, Summons.includes(spell))
    }

    function invoke(name: string, summon: boolean) {
        let spell = $.Magic.spells[name]
        if (rpc.user.id !== $.player.id)
            xvt.waste(200)

        if (rpc.user.magic > 1 && !summon)
            if (rpc.sp < $.Magic.power(rpc, spell.cast)) {
                if (rpc === $.online)
                    xvt.outln(`You don't have enough power to cast that spell!`)
                cb(!rpc.confused)
                return
            }

        //  some sensible ground rules to avoid known muling exploits (by White Knights passing gas)
        if (xvt.validator.isDefined(nme)) {
            if ([ 1,2,3,4,5,6,10 ].indexOf(spell.cast) >= 0) {
                if (rpc === $.online)
                    xvt.outln('You cannot cast that spell during a battle!')
                cb(!rpc.confused)
                return
            }
            if (nme.user.novice && [ 12,15,16,20,21,22 ].indexOf(spell.cast) >= 0) {
                if (rpc === $.online)
                    xvt.outln('You cannot cast that spell on a novice player.')
                cb(!rpc.confused)
                return
            }
            if (/Naval|Tavern|Taxman/.test(from) && [ 8,12,17,18,22 ].indexOf(spell.cast) >= 0) {
                if (spell.cast == 8 && rpc === $.online) {
                    xvt.outln('You cannot cast that spell to retreat!')
                    cb(!rpc.confused)
                    return
                }
                if (spell.cast > 8) {
                    if (rpc === $.online) {
                        $.sound('oops', 4)
                        xvt.outln('You are too frantic to cast that spell!')
                    }
                    cb(!rpc.confused)
                    return
                }
            }
        }
        else {
            if ([ 9,11,12,14,15,16,17,18,19,20,21,22 ].indexOf(spell.cast) >= 0) {
                if (rpc === $.online)
                    xvt.outln('You cannot cast that spell on yourself!')
                cb(!rpc.confused)
                return
            }
        }

        if (rpc.sp > 0) {
            let mana = summon ? 0 : rpc.user.magic < 4 ? spell.mana : spell.enchanted
            rpc.sp -= mana

            //  collect some of the mana spent by the enemy?
            if (nme) {
                const spent = +(+$.Ring.power(nme.user.rings, 'sp', 'pc', nme.user.pc).power && !$.Ring.power(rpc.user.rings, 'ring').power) * (+$.Ring.power(nme.user.rings, 'ring').power + 1)
                if (mana = spent * $.dice(mana / 3)) {
                    if (nme.sp + mana > nme.user.sp) {
                        mana = nme.user.sp - nme.sp
                        if (mana < 0) mana = 0
                    }
                    if (mana) {
                        if (nme.sp > 0) {
                            nme.sp += mana
                            xvt.outln(nme == $.online ? 'You' : nme.user.gender === 'I' ? 'The ' + nme.user.handle : nme.user.handle
                                , ' ', $.what(nme, 'absorb'), xvt.bright, xvt.cyan, mana.toString(), xvt.normal, ' mana '
                                , xvt.reset, 'spent off ', $.who(rpc, 'his'), 'spell.')
                        }
                        else {
                            rpc.sp -= mana
                            if (rpc.sp < 0) rpc.sp = 0
                            xvt.outln(nme == $.online ? 'You' : nme.user.gender === 'I' ? 'The ' + nme.user.handle : nme.user.handle
                                , ' ', $.what(nme, 'drain'), 'an extra ', xvt.bright, xvt.cyan, mana.toString(), xvt.normal, ' mana '
                                , xvt.reset, 'from ', $.who(rpc, 'his'), 'spell.')
                        }
                        xvt.waste(100)
                    }
                }
            }
        }

        if (rpc.user.magic == 1 && !summon && $.dice(100) < 50 + (spell.cast < 17 ? 2 * spell.cast : 2 * spell.cast - 16)) {
            rpc.altered = true
            $.Magic.remove(rpc.user.spells, spell.cast)
            xvt.outln($.who(rpc, 'His'), 'wand smokes as ', $.who(rpc, 'he')
                , $.what(rpc, 'cast'), 'the spell.')
            if (!(rpc.user.id[0] === '_' || rpc.user.gender === 'I'))
                $.saveUser(rpc)
            xvt.waste(300)
        }

        //  Tigress prefers the Ranger (and Paladin) class, because it comes with a coupon and a better warranty
        if (rpc.user.magic == 2 && !summon && $.dice(5 + +xvt.validator.isDefined($.Access.name[rpc.user.access].sysop)) == 1) {
            rpc.altered = true
            $.Magic.remove(rpc.user.spells, spell.cast)
            xvt.outln($.who(rpc, 'His'), 'scroll burns as ', $.who(rpc, 'he')
                , $.what(rpc, 'cast'), 'the spell.')
            if (!(rpc.user.id[0] === '_' || rpc.user.gender === 'I'))
                $.saveUser(rpc)
            xvt.waste(300)
        }

        if (xvt.validator.isDefined(nme)) {
            let mod = $.Ring.power(nme.user.rings, 'resist', 'spell', name)
            if (mod.power) {
                if (!$.Ring.power(rpc.user.rings, 'ring').power) {
                    xvt.outln(xvt.faint, '>> ', xvt.normal, `${$.who(rpc, 'His')}`
                        , xvt.bright, xvt.magenta, name, xvt.normal, ' spell ', xvt.reset, 'attempt is ineffective against')
                    xvt.out(`   ${$.who(nme, 'his')}`, xvt.bright, xvt.cyan, mod.name, xvt.normal)
                    if ($.player.emulation === 'XT' && nme.user.sex !== 'I') xvt.out(' ', $.Ring.name[mod.name].emoji, ' 💍')
                    xvt.outln(nme.user.sex == 'I' ? ' power' : ' ring', xvt.reset, '!', xvt.faint, ' <<')
                    cb()
                    return
                }
                else {
                    xvt.out(xvt.faint, '>> ', xvt.normal, `${$.who(rpc, 'His')}`
                        , xvt.bright, xvt.magenta, $.Ring.power(rpc.user.rings, 'ring').name, xvt.normal, ' ring '
                        , xvt.reset, `negates ${$.who(nme, 'his')}`, xvt.bright, xvt.cyan, mod.name, xvt.normal)
                    if ($.player.emulation === 'XT') xvt.out(' ', $.Ring.name[mod.name].emoji, ' 💍')
                    xvt.outln(' ring', xvt.reset, '!', xvt.faint, ' <<')
                }
            }
        }

        let backfire = false

        if ($.dice(100) > $.Magic.ability(name, rpc, nme).fail) {
            if ((backfire = $.dice(100) > $.Magic.ability(name, rpc, nme).backfire)) {
                xvt.outln('Oops!  ', xvt.reset, $.who(rpc, 'His'), 'spell backfires!')
                $.sound('oops', 4)
            }
            else {
                xvt.outln('Fssst!  ', xvt.reset, $.who(rpc, 'His'), 'spell fails!')
                $.sound('fssst', 4)
                cb()
                return
            }
        }

        switch(spell.cast) {
        case 1:
            if (backfire) {
                $.PC.adjust('str', -$.dice(10))
                xvt.outln(`You feel weaker (${rpc.str})`)
            }
            else {
                $.PC.adjust('str', $.dice(10))
                if (rpc.str < rpc.user.maxstr)
                    xvt.outln(`You feel much more stronger (${rpc.str})`)
                else
                    xvt.outln(`This game prohibits the use of steroids.`)
            }
            break

        case 2:
            if (backfire) {
                $.PC.adjust('int', -$.dice(10))
                xvt.outln(`You feel stupid (${rpc.int})`)
            }
            else {
                $.PC.adjust('int', $.dice(10))
                if (rpc.int < rpc.user.maxint)
                    xvt.outln(`You feel much more intelligent (${rpc.int})`)
                else
                    xvt.outln(`Get on with it, professor!`)
            }
            break

        case 3:
            if (backfire) {
                $.PC.adjust('dex', -$.dice(10))
                xvt.outln(`You feel clumsy (${rpc.dex})`)
            }
            else {
                $.PC.adjust('dex', $.dice(10))
                if (rpc.dex < rpc.user.maxdex)
                    xvt.outln(`You feel much more agile (${rpc.dex})`)
                else
                    xvt.outln(`Y'all shakin' and bakin'.`)
            }
            break

        case 4:
            if (backfire) {
                $.PC.adjust('cha', -$.dice(10))
                xvt.outln(`You feel depressed (${rpc.cha})`)
            }
            else {
                $.PC.adjust('cha', $.dice(10))
                if (rpc.cha < rpc.user.maxcha)
                    xvt.outln(`You feel much more charismatic (${rpc.cha})`)
                else
                    xvt.outln(`Stop being so vain.`)
            }
            break

        case 5:
            if (backfire) {
                if (rpc.user.magic > 2 && rpc.user.toAC > 0)
                    rpc.user.toAC--
                rpc.toAC--
                xvt.outln($.who(rpc, 'His'), isNaN(+rpc.user.armor) ? rpc.user.armor : 'defense', ' loses some of its effectiveness')
            }
            else {
                $.sound('shield')
                xvt.outln('A magical field shimmers around ', rpc.user.armor ? $.who(rpc, 'his') + rpc.user.armor : $.who(rpc, 'him'))
                if (rpc.user.magic > 2 && rpc.user.toAC >= 0)
                    rpc.user.toAC++
                rpc.toAC++
            }
            if (-rpc.user.toAC >= rpc.armor.ac || -(rpc.user.toAC + rpc.toAC) >= rpc.armor.ac) {
                xvt.outln($.who(rpc, 'His'), isNaN(+rpc.user.armor) ? rpc.user.armor : 'defense', ' crumbles!')
                $.Armor.equip(rpc, $.Armor.merchant[0])
            }
            if ($.dice(3 * (rpc.user.toAC + rpc.toAC + 1) / rpc.user.magic) > rpc.armor.ac) {
                xvt.outln($.who(rpc, 'His'), isNaN(+rpc.user.armor) ? rpc.user.armor : 'defense', ' vaporizes!')
                $.Armor.equip(rpc, $.Armor.merchant[0])
                if (rpc == $.online) $.sound('crack', 6)
            }
            rpc.altered = true
            break

        case 6:
            if (backfire) {
                xvt.outln($.who(rpc, 'His'), rpc.user.weapon ? rpc.user.weapon : 'attack', ' loses some of its effectiveness.')
                if (rpc.user.magic > 2 && rpc.user.toWC > 0)
                    rpc.user.toWC--
                rpc.toWC--
            }
            else {
                $.sound('hone')
                xvt.outln($.who(rpc, 'His'), rpc.user.weapon ? rpc.user.weapon : 'attack', ' glows with magical sharpness.')
                if (rpc.user.magic > 2 && rpc.user.toWC >= 0)
                    rpc.user.toWC++
                rpc.toWC++
            }
            if (-rpc.user.toWC >= rpc.weapon.wc || -(rpc.user.toWC + rpc.toWC) >= rpc.weapon.wc) {
                xvt.outln($.who(rpc, 'His'), rpc.user.weapon ? rpc.user.weapon : 'attack', ' crumbles!')
                $.Weapon.equip(rpc, $.Weapon.merchant[0])
            }
            if ($.dice(3 * (rpc.user.toWC + rpc.toWC + 1) / rpc.user.magic) > rpc.weapon.wc) {
                xvt.outln($.who(rpc, 'His'), rpc.user.weapon ? rpc.user.weapon : 'attack', ' vaporizes!')
                $.Weapon.equip(rpc, $.Weapon.merchant[0])
                if (rpc == $.online) $.sound('crack', 6)
            }
            rpc.altered = true
            break

        case 7:
            let ha = rpc.user.magic > 2 ? $.int(rpc.user.level / 16) + 13 : 16
            let hr = 0
            for (let i = 0; i < rpc.user.level; i++)
                hr += $.dice(ha)

            if (backfire) {
                $.sound('hurt', 3)
                rpc.hp -= hr
                xvt.outln(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' hurt'), $.who(rpc, 'self'), 'for ', hr.toString(), ' hit points!')
                if (rpc.hp < 1) {
                    xvt.outln()
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
                xvt.outln(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' heal'), $.who(rpc, 'self'), 'for ', hr.toString(), ' hit points.')
            }
            break

        case 8:
            if (xvt.validator.isDefined(nme)) {
                xvt.out(xvt.bright, xvt.magenta)
                if (backfire) {
                    xvt.out(nme === $.online ? 'You' : nme.user.gender === 'I' ? 'The ' + nme.user.handle : nme.user.handle
                        , $.what(nme, ' teleport'))
                    if (nme !== $.online)
                        nme.hp = -nme.hp
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
                xvt.outln(xvt.normal, 'away from the ', xvt.faint, 'battle!')
                $.sound('teleport', 8)
                if ($.dice(100) == 1) {
                    xvt.outln(xvt.lred, `Nearby is the Crown's Champion shaking his head and texting his Maker.`)
                    xvt.waste(+'0212' * 10)     // The Conqueror was here
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
            let ba = rpc.user.magic > 2
                ? 17 + $.int(rpc.user.magic / 4) + $.int(rpc.user.level / 11) - (backfire
                    ? $.int($.int(rpc.armor.ac + rpc.user.toAC + rpc.toWC, true) / 5)
                    : $.int($.int(nme.armor.ac + nme.user.toAC + nme.toWC, true) / 5)
                ) : 17
            if (nme.user.melee > 3) ba *= $.int(nme.user.melee / 2)
            let br = $.int(rpc.int / 10)
            while ($.dice(99 + rpc.user.magic) > 99) {
                ba += $.dice(rpc.user.magic)
                for (let i = 0; i < ba; i++)
                    br += $.dice(ba)
            }
            for (let i = 0; i < rpc.user.level; i++)
                br += $.dice(ba)

            if (backfire) {
                xvt.outln(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' blast'), $.who(rpc, 'self'), 'for ', br.toString(), ' hit points!')
                rpc.hp -= br
                if (rpc.hp < 1) {
                    xvt.outln()
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
                    , $.what(rpc, ' blast'), nme === $.online ? 'you' : nme.user.gender === 'I' ? 'the ' + nme.user.handle : nme.user.handle
                    , ' for ', br.toString(), ' hit points!')
                nme.hp -= br

                if (nme.hp < 1) {
                    nme.hp = 0
                    if (from === 'Party' || nme !== $.online)
                        xvt.out($.bracket('RIP', false))
                    else {
                        $.reason = rpc.user.id.length
                            ? `fatal blast by ${rpc.user.handle}`
                            : `fatal blast by a level ${rpc.user.level} ${rpc.user.handle}`
                    }
                }
                xvt.outln()
            }
            break

        case 10:
            if (backfire) {
                rpc.hp = 0
                xvt.outln(xvt.faint, 'You die by your own doing.')
                $.death(`resurrect backfired`)
                break
            }
            else {
                $.sound('resurrect')
                if (DL) {
                    if (DL.cleric.user.status) {
                        DL.cleric.user.status = ''
                        $.activate(DL.cleric)
                        $.profile({ jpg:'npc/old cleric', effect:'fadeInUpBig' })
                        xvt.waste(600)
                        $.music('winner')
                        xvt.outln(xvt.faint, 'You raise the ', xvt.yellow, DL.cleric.user.handle, xvt.reset, ' from the dead!')
                        $.PC.adjust('cha', 4, 2, 1)
                        xvt.waste(600)
                        cb()
                        return
                    }
                }
                user('Resurrect', (opponent: active) => {
                    if (opponent.user.id === $.player.id || opponent.user.status === '' || opponent.user.id === '') {
                        xvt.outln(xvt.bright, xvt.black, '\nGo get some coffee.')
                    }
                    else {
                        $.PC.profile(opponent, 'fadeInUpBig')
                        xvt.out(xvt.magenta, xvt.bright, 'Now raising ', xvt.normal, opponent.user.handle, xvt.faint, ' from the dead ... ')
                        opponent.user.status = ''
                        $.saveUser(opponent)
                        $.news(`\tresurrected ${opponent.user.handle}`)
                        $.log(opponent.user.id, `\n${$.player.handle} resurrected you`)
                        xvt.outln()
                    }
                    cb()
                    return
                })
                return
            }

        case 11:
            $.sound('confusion')
            if (backfire) {
                xvt.outln(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' blitz'), $.who(rpc, 'self'), ' with exploding ', xvt.bright
                    , xvt.red, 'c', xvt.yellow, 'o', xvt.green, 'l', xvt.cyan, 'o', xvt.blue, 'r', xvt.magenta, 's'
                    , xvt.reset, '!')
                rpc.confused = true
                rpc.int >>= 1
                rpc.dex >>= 1
            }
            else {
                xvt.outln(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' blitz')
                    , nme === $.online ? 'you' : nme.user.gender === 'I' ? 'the ' + nme.user.handle : nme.user.handle
                    , ' with exploding ', xvt.bright
                    , xvt.red, 'c', xvt.yellow, 'o', xvt.green, 'l', xvt.cyan, 'o', xvt.blue, 'r', xvt.magenta, 's'
                    , xvt.reset, '!')
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
                    xvt.out(`A new weapon materializes... it's`)
                let n = Math.round(($.dice(rpc.weapon.wc) + $.dice(rpc.weapon.wc)
                    + $.dice($.Weapon.merchant.length)) / 3)
                if (++n > $.Weapon.merchant.length - 1)
                    rpc.user.weapon = $.Weapon.special[$.dice($.Weapon.special.length) - 1]
                else
                    rpc.user.weapon = $.Weapon.merchant[n]
                $.Weapon.equip(rpc, rpc.user.weapon)
                xvt.outln($.an(rpc.user.weapon.toString()), '!')
                $.saveUser(rpc)
            }
            else {
                if (isNaN(+nme.user.weapon))
                    xvt.out(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                        , $.what(rpc, ' transform'), $.who(nme, 'his'), nme.user.weapon, ' into')
                else
                    xvt.out(`A new weapon materializes... it's`)
                let n = Math.round(($.dice(nme.weapon.wc) + $.dice(nme.weapon.wc)
                    + $.dice($.Weapon.merchant.length)) / 3)
                if (++n > $.Weapon.merchant.length - 1)
                    nme.user.weapon = $.Weapon.special[$.dice($.Weapon.special.length) - 1]
                else
                    nme.user.weapon = $.Weapon.merchant[n]
                $.Weapon.equip(nme, nme.user.weapon)
                xvt.outln($.an(nme.user.weapon.toString()), '!')
                $.saveUser(nme)
            }
            xvt.waste(500)
            break

        case 13:
            $.sound('cure', 6)
            if (backfire) {
                xvt.outln(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' cure')
                    , nme === $.online ? 'you' : nme.user.gender === 'I' ? 'the ' + nme.user.handle : nme.user.handle
                    , '!')
                nme.hp = nme.user.hp
            }
            else {
                if (rpc === $.online) {
                    xvt.outln('You feel your vitality completed restored.')
                }
                else {
                    xvt.outln(rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                        , $.what(rpc, ' cure'), $.who(rpc, 'self'), '!')
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
                xvt.outln(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' render'), 'an image of ', $.who(rpc, 'self'), '!')
            }
            xvt.waste(500)
            break

        case 15:
            $.sound('disintegrate', 6)
            if (backfire) {
                xvt.outln(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' completely atomize'), $.who(rpc, 'self'), '!')
                rpc.hp = 0
                if (rpc === $.online)
                    $.reason = `disintegrate backfired`
            }
            else {
                nme.hp = 0
                xvt.outln(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' completely atomize'), nme === $.online ? 'you' : nme.user.gender === 'I' ? 'the ' + nme.user.handle : nme.user.handle
                    , '!')
            }
            xvt.waste(500)
            break

        case 16:
            $.sound('morph', 10)
            if (backfire) {
                rpc.user.level = $.dice(98) + 1
                if (rpc.adept)
                    rpc.user.level += $.dice(rpc.user.level)
                $.reroll(rpc.user, $.PC.random('monster'), rpc.user.level)
                $.activate(rpc)
                rpc.altered = true
                rpc.user.gender = ['F','M'][$.dice(2) - 1]
                $.saveUser(rpc)
                xvt.outln(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' morph'), $.who(rpc, 'self'), `into a level ${rpc.user.level} ${rpc.user.pc}!`)
                if (rpc.user.gender !== 'I') {
                    $.news(`\t${rpc.user.handle} morphed into a level ${rpc.user.level} ${rpc.user.pc}!`)
                    if (rpc !== $.online)
                        $.log(rpc.user.id, `\nYou morphed yourself into a level ${rpc.user.level} ${rpc.user.pc}!\n`)
                }
            }
            else {
                nme.user.level = $.dice(98) + 1
                if (nme.adept)
                    nme.user.level += $.dice(nme.user.level)
                $.reroll(nme.user, $.PC.random(), nme.user.level)
                $.activate(nme)
                nme.altered = true
                nme.user.gender = ['F','M'][$.dice(2) - 1]
                $.saveUser(nme)
                xvt.outln(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' morph')
                    , nme === $.online ? 'you' : nme.user.gender === 'I' ? 'the ' + nme.user.handle : nme.user.handle
                    , ` into a level ${nme.user.level} ${nme.user.pc}!`)
                if (nme.user.gender !== 'I') {
                    $.news(`\t${nme.user.handle} got morphed into a level ${nme.user.level} ${nme.user.pc}!`)
                    if (nme !== $.online)
                        $.log(nme.user.id, `\nYou got morphed into a level ${nme.user.level} ${nme.user.pc} by ${rpc.user.handle}!\n`)
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
                xvt.outln(xvt.bright, rpc === $.online ? 'you'
                    : rpc.user.gender === 'I' ? 'the ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' damage'), 'own ', isNaN(+rpc.user.armor) ? rpc.user.armor : 'defense'
                    , $.buff(rpc.user.toAC, rpc.toAC), '!')
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
                xvt.outln(xvt.bright, 'it damages ', $.who(nme, 'his')
                    , isNaN(+nme.user.weapon) ? nme.user.weapon : 'attack'
                    , $.buff(nme.user.toWC, nme.toWC), '!')
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
            $.sound('bigblast', 10)
            let bba = 2 * (rpc.user.magic > 2
                ? 17 + $.int(rpc.user.magic / 4) + $.int(rpc.user.level / 11) - (backfire
                    ? $.int($.int(rpc.armor.ac + rpc.user.toAC + rpc.toWC, true) / 5)
                    : $.int($.int(nme.armor.ac + nme.user.toAC + nme.toWC, true) / 5)
                ) : 17)
            if (nme.user.melee > 3) bba *= $.int(nme.user.melee / 2)
            let bbr = $.int(rpc.int / 10)
            while ($.dice(99 + rpc.user.magic) > 99) {
                bba += $.dice(rpc.user.magic)
                for (let i = 0; i < bba; i++)
                    bbr += $.dice(bba)
            }
            for (let i = 0; i < rpc.user.level; i++)
                bbr += $.dice(bba)

            if (backfire) {
                xvt.outln(rpc === $.online ? 'you'
                    : rpc.user.gender === 'I' ? 'the ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' BLAST'), $.who(rpc, 'self'), 'for ', bbr.toString(), ' hit points!')
                rpc.hp -= bbr
                if (rpc.hp < 1) {
                    rpc.hp = 0
                    xvt.outln()
                    if (rpc === $.online)
                        $.reason = 'Big Blast backfired'
                }
            }
            else {
                if (rpc === $.online) {
                    let deed = $.mydeeds.find((x) => { return x.deed === 'big blast' })
                    if (!deed) deed = $.mydeeds[$.mydeeds.push($.loadDeed($.player.pc, 'big blast')[0]) - 1]
                    if ((deed && bbr > deed.value)) {
                        deed.value = bbr
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
                    if (from === 'Party' || nme !== $.online)
                        xvt.out($.bracket('RIP', false))
                    else {
                        $.reason = rpc.user.id.length
                            ? `fatal Big Blast by ${rpc.user.handle}`
                            : `fatal Big Blast by a level ${rpc.user.level} ${rpc.user.handle}`
                    }
                }
                xvt.outln()
            }
            break

        case 20:
            if (nme.user.magic < 2) {
                cb(true)
                return
            }
            xvt.out(xvt.cyan, 'A glowing '
                , xvt.lcyan, xvt.LGradient[xvt.emulation]
                , xvt.bright, xvt.lblack, xvt.lCyan, 'orb', xvt.reset
                , xvt.lcyan, xvt.RGradient[xvt.emulation]
                , xvt.cyan, ' radiates above '
                , xvt.faint, $.who(backfire ? nme : rpc, 'him'), '... ')
            $.sound('mana', 8)
            xvt.outln()
            let mana = 0
            if (backfire) {
                mana = Math.trunc(rpc.sp * 1. / ((5. - rpc.user.magic) + $.dice(2)))
                if (mana + nme.sp > nme.user.sp)
                    mana = nme.user.sp - nme.sp
                xvt.out(nme === $.online ? 'You'
                    : nme.user.gender === 'I' ? 'The ' + nme.user.handle : nme.user.handle
                    , $.what(rpc, ' absorb'), 'spell power (', xvt.bright, xvt.cyan, mana.toString(), xvt.reset, ') '
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
                    , $.what(rpc, ' absorb'), 'spell power (', xvt.bright, xvt.cyan, mana.toString(), xvt.reset, ') '
                    , 'from ', nme === $.online ? 'you'
                    : nme.user.gender === 'I' ? 'the ' + nme.user.handle : nme.user.handle)
                nme.sp -= mana
                if (rpc.user.magic > 1)
                    rpc.sp += mana
            }
            xvt.out('.\n')
            break

        case 21:
            $.sound('life')
            xvt.out(xvt.bright, xvt.black, `A black finger extends and touches ${$.who(backfire ? rpc : nme, 'him')}... `)
            xvt.waste(800)
            xvt.outln()
            let xp = 0
            if (backfire) {
                xp = Math.trunc(rpc.user.xp / 2)
                rpc.user.xp -= xp
                nme.user.xp += (nme.user.level > rpc.user.level) ? xp : Math.trunc(nme.user.xp / 2)
                xvt.outln(nme === $.online ? 'You'
                    : nme.user.gender === 'I' ? 'The ' + nme.user.handle : nme.user.handle
                    , $.what(nme, ' absorb'), 'some life experience from ', rpc === $.online ? 'you'
                    : rpc.user.gender === 'I' ? 'the ' + rpc.user.handle : rpc.user.handle
                    , '.')
            }
            else {
                xp = Math.trunc(nme.user.xp / 2)
                nme.user.xp -= xp
                rpc.user.xp += (rpc.user.level > nme.user.level) ? xp : Math.trunc(rpc.user.xp / 2)
                xvt.outln(rpc === $.online ? 'You'
                    : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' absorb'), 'some life experience from ', nme === $.online ? 'you'
                    : nme.user.gender === 'I' ? 'the ' + nme.user.handle : nme.user.handle
                    , '.')
            }
            break

        case 22:
            $.sound('lose')
            xvt.out(xvt.bright, xvt.black, `A shroud of blackness engulfs ${$.who(backfire ? rpc : nme, 'him')}... `)
            xvt.waste(800)
            xvt.outln()
            if (backfire && rpc.user.level > 1) {
                $.PC.adjust('str', -$.PC.card(rpc.user.pc).toStr, -1, 0 ,rpc)
                $.PC.adjust('int', -$.PC.card(rpc.user.pc).toInt, -1, 0 ,rpc)
                $.PC.adjust('dex', -$.PC.card(rpc.user.pc).toDex, -1, 0 ,rpc)
                $.PC.adjust('cha', -$.PC.card(rpc.user.pc).toCha, -1, 0 ,rpc)
                rpc.user.xp = Math.round(nme.user.xp / 2)
                rpc.user.xplevel--
                rpc.user.level--
                rpc.user.hp -= Math.round(rpc.user.level + $.dice(rpc.user.level) + rpc.user.str / 10 + (rpc.user.str > 90 ? rpc.user.str - 90 : 0))
                if (rpc.user.magic > 1)
                    rpc.user.sp -= Math.round(rpc.user.level + $.dice(rpc.user.level) + rpc.user.int / 10 + (rpc.user.int > 90 ? rpc.user.int - 90 : 0))

                nme.user.xp *= 2
                xvt.outln(nme === $.online ? 'You'
                    : nme.user.gender === 'I' ? 'The ' + nme.user.handle : nme.user.handle
                    , $.what(nme, ' gain'), 'an experience level off ', rpc === $.online ? 'you'
                    : rpc.user.gender === 'I' ? 'the ' + rpc.user.handle : rpc.user.handle
                    , '.')
                if ($.checkXP(nme, cb)) return
            }
            else if (!backfire && nme.user.level > 1) {
                nme.user.xp = Math.round(nme.user.xp / 2)
                nme.user.xplevel--
                nme.user.level--
                $.PC.adjust('str', -$.PC.card(nme.user.pc).toStr, -1, 0, nme)
                $.PC.adjust('int', -$.PC.card(nme.user.pc).toInt, -1, 0, nme)
                $.PC.adjust('dex', -$.PC.card(nme.user.pc).toDex, -1, 0, nme)
                $.PC.adjust('cha', -$.PC.card(nme.user.pc).toCha, -1, 0, nme)
                nme.user.hp -= Math.round(nme.user.level + $.dice(nme.user.level) + nme.user.str / 10 + (nme.user.str > 90 ? nme.user.str - 90 : 0))
                if (nme.user.magic > 1)
                    nme.user.sp -= Math.round(nme.user.level + $.dice(nme.user.level) + nme.user.int / 10 + (nme.user.int > 90 ? nme.user.int - 90 : 0))

                rpc.user.xp *= 2
                xvt.outln(rpc === $.online ? 'You'
                    : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' gain'), 'an experience level off ', nme === $.online ? 'you'
                    : nme.user.gender === 'I' ? 'the ' + nme.user.handle : nme.user.handle
                    , '.')
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
                xvt.outln($.who(rpc, 'His'), isNaN(+rpc.user.armor) ? rpc.user.armor : 'defense', ' loses most of its effectiveness.')
            }
            else {
                $.sound('shield')
                xvt.outln('A magical field glitters around ', isNaN(+rpc.user.armor) ? `${$.who(rpc, 'his')}${rpc.user.armor}` : `${$.who(rpc, 'him')}...`)
                if (rpc.user.magic > 2 && rpc.user.toAC >= 0)
                    rpc.user.toAC++
                rpc.toAC += $.dice(rpc.armor.ac)
            }
            rpc.altered = true
            break

        case 24:
            if (backfire) {
                xvt.outln($.who(rpc, 'His'), isNaN(+rpc.user.weapon) ? rpc.user.weapon : 'attack', ' loses most of its effectiveness.')
                if (rpc.user.magic > 2 && rpc.user.toWC > 0)
                    rpc.user.toWC--
                else if(rpc.toWC > 0)
                    rpc.toWC -= $.dice(rpc.toWC)
                else
                    rpc.toWC--
            }
            else {
                $.sound('hone')
                xvt.outln($.who(rpc, 'His'), isNaN(+rpc.user.weapon) ? rpc.user.weapon : 'attack', ' emanates magical sharpness.')
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
    const melee = +($.Ring.power(rpc.user.rings, 'melee', 'pc', rpc.user.pc).power && !$.Ring.power(enemy.user.rings, 'ring').power)
        * (+$.Ring.power($.player.rings, 'ring').power + 1)
    const life = +($.Ring.power(rpc.user.rings, 'hp', 'pc', rpc.user.pc).power && !$.Ring.power(enemy.user.rings, 'ring').power)
        * (+$.Ring.power($.player.rings, 'ring').power + 1)
    let action: string
    let hit = 0

    if (from !== 'Party' && rpc !== $.online && rpc.user.coward && rpc.hp < (rpc.user.hp / 5) && !rpc.user.cursed) {
        rpc.hp = -1
        xvt.outln(xvt.bright, xvt.green
            , rpc.user.gender === 'I' ? 'The ' : '', rpc.user.handle
            , xvt.normal, ' runs away from '
            , xvt.faint, 'the battle!')
        xvt.waste(1000)

        if (from === 'User') {
            rpc.user.blessed = ''
            rpc.user.coward = false
            rpc.user.cursed = $.player.id
            $.saveUser(rpc)
            $.news(`\tcursed ${rpc.user.handle} for running away`)
            $.log(rpc.user.id, `\n${enemy.user.handle} curses you for running away!\n`)
        }
        return
    }

    let n = rpc.dex
    if (blow == 1) {
        let m = (rpc.dex - enemy.dex)
        m = (m < -10) ? -10 : (m > 10) ? 10 : m
        n += m
        n = (n < 10) ? 10 : (n > 99) ? 99 : n
        n = 50 + $.int(n / 2)
    }
    else
        n -= $.player.melee * (blow - $.player.backstab + 1)

    // saving throw
    if ($.dice(100) > n) {
        if (blow == 1) {
            if (rpc == $.online) {
                xvt.outln('Your ', rpc.user.weapon, ' passes through thin air.')
                $.sound('miss')
                return
            }
            else {
                $.sound(rpc.user.melee < 2 ? 'whoosh' : rpc.user.gender === 'I' ? 'swoosh' : 'swords')
                if (isNaN(+rpc.user.weapon))
                    xvt.outln(rpc.user.gender === 'I' ? 'The ' : ''
                        , rpc.user.handle, '\'s ', rpc.user.weapon
                        , ' whistles by '
                        , enemy.user.gender === 'I' ? 'the ' : ''
                        , enemy == $.online ? 'you' : enemy.user.handle
                        , '.')
                else {
                    xvt.outln(rpc.user.gender === 'I' ? 'The ' : ''
                        , rpc.user.handle, ' attacks '
                        , enemy.user.gender === 'I' ? 'the ' : ''
                        , enemy == $.online ? 'you' : enemy.user.handle
                        , ', but misses.')
                }
                return
            }
        }
        else {
            xvt.outln('Attempt fails!')
            $.sound('miss')
            return
        }
    }

    // melee
    hit = Math.trunc(rpc.str / 10) + melee
    hit += $.dice(rpc.user.level + melee)
    hit += rpc.user.melee * $.dice(rpc.user.level + melee)

    // excellent
    n = rpc.user.melee + melee + 1

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
    hit *= 50 + Math.trunc(rpc.user.str / 2) + melee
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
    hit = (hit > 0) ? hit * blow : melee

    enemy.hp -= hit

    if (hit > 0) {
        if (from === 'Party' && enemy.hp <= 0) {
            enemy.hp = 0
            if (enemy == $.online)
                $.sound('kill', 5)
            xvt.out(xvt.bright, enemy == $.online ? xvt.lyellow : round[0].party == 0 ? xvt.lcyan : xvt.lred)
            xvt.outln(rpc.user.handle, ' ', sprintf([
                'makes a fatal blow to %s',
                'blows %s away',
                'laughs, then kills %s',
                'easily slays %s',
                'makes minced-meat out of %s',
                'runs %s through'
                ][$.dice(6) - 1], enemy.user.handle), '.')
            xvt.waste(600)
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
                xvt.out(xvt.lyellow, '+', xvt.white)
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
        xvt.outln('for ', hit.toString(), ' hit points', period)
        xvt.waste(50)

        //  any bonus restore health from the hit off enemy?
        if (hit = life * $.dice(hit / 3)) {
            if (rpc.hp + hit > rpc.user.hp) {
                hit = rpc.user.hp - rpc.hp
                if (hit < 0) hit = 0
            }
            if (hit) {
                rpc.hp += hit
                xvt.outln(rpc == $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , ' ', $.what(rpc, 'absorb'), xvt.bright, xvt.red, hit.toString(), xvt.reset, ' off the hit.')
                xvt.waste(100)
            }
        }
    }
    else {
        xvt.outln(rpc == $.online ? 'Your ' + rpc.user.weapon : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
            , ' does not even scratch '
            , enemy == $.online ? 'you' : enemy.user.gender === 'I' ? 'the ' + enemy.user.handle : enemy.user.handle, '.')
        xvt.waste(250)
    }
    return
}

export function poison(rpc: active, cb?:Function) {
    if (rpc.user.id === $.player.id) {
        if (!$.player.poisons.length) {
            xvt.outln(`\nYou don't have any poisons.`)
            cb(true)
            return
        }
        $.action('list')
        xvt.app.form = {
            'poison': { cb: () => {
                xvt.outln()
                if (xvt.entry === '') {
                    cb()
                    return
                }
                if (!$.Poison.have(rpc.user.poisons, +xvt.entry)) {
                	for (let i in $.player.poisons) {
                        let vial = $.player.poisons[i]
                        xvt.out($.bracket(vial), $.Poison.merchant[vial - 1], ' '.repeat(20 - $.Poison.merchant[vial - 1].length))

                        let p = $.int($.player.poison / 2)
                        let t = $.player.poison - p
                        p *= vial
                        t *= vial
                        let toWC = $.player.toWC, WC = $.online.toWC
                        if (p > 0 && toWC >= 0)     //  cannot augment a damaged weapon
                            if (p >= toWC) toWC = p
                        if (t > 0) {
                            if (toWC > 0)           //  apply buff to an augmented weapon
                                WC = WC + t <= toWC ? WC + t
                                    : ($.player.poison == 3 && WC + $.int(t / 2) <= toWC) ? WC + t
                                    : t
                            else                    //  apply buff to a damaged weapon
                                WC = WC >= 0 ? t : WC + t
                        }

                        if (3 * (WC + toWC + 1) / $.player.poison > $.online.weapon.wc)
                            xvt.out(xvt.yellow, ' ', $.tty == 'web' ? ' 💀 ' : 'XXX', ' ')
                        else
                            xvt.out(xvt.faint, ' -=> ', xvt.normal)
                        xvt.out($.buff(toWC, WC))
                    }
                    xvt.outln()
                    xvt.app.refocus()
                    return
                }
                else
                    apply(rpc, +xvt.entry)
                cb(true)
                return
            }, prompt:['Make toxic', 'Apply poison', 'Use bane', 'Uti venenum'][$.player.poison - 1] + ' (?=list): ', max:2 }
        }
        xvt.app.focus = 'poison'
        return
    }

    if ((rpc.toWC + rpc.user.toWC) < $.int(rpc.weapon.wc / (6 - rpc.user.poison))) {
        let vial = $.dice(rpc.user.poisons.length) - 1
        if (vial) apply(rpc, rpc.user.poisons[vial])
    }

    function apply(rpc: active, vial: number) {
        rpc.altered = true
        let p = $.int(rpc.user.poison / 2)
        let t = rpc.user.poison - p
        p *= vial
        t *= vial
        if (p > 0 && rpc.user.toWC >= 0)    //  cannot augment a damaged weapon
            if (p >= rpc.user.toWC) rpc.user.toWC = p
        if (t > 0) {
            if (rpc.user.toWC > 0)          //  apply buff to an augmented weapon
                rpc.toWC = rpc.toWC + t <= rpc.user.toWC ? rpc.toWC + t
                    : (rpc.user.poison == 3 && rpc.toWC + $.int(t / 2) <= rpc.user.toWC) ? rpc.toWC + t
                    : t
            else                            //  apply buff to a damaged weapon
                rpc.toWC = rpc.toWC >= 0 ? t : rpc.toWC + t
        }

        if (!$.Poison.have(rpc.user.poisons, vial) || +rpc.user.weapon > 0) {
            xvt.outln(xvt.bright, xvt.green, $.who(rpc, 'He'), $.what(rpc, 'secrete'), 'a caustic ooze', xvt.reset, $.buff(p, t))
            $.sound('ooze', 6)
        }
        else {
            xvt.outln('\n', $.who(rpc, 'He'), $.what(rpc, 'pour')
                , 'some ', xvt.faint, $.Poison.merchant[vial - 1]
                , xvt.reset, ' on ', $.who(rpc, 'his')
                , xvt.bright, xvt.cyan, rpc.user.weapon
                , xvt.reset, $.buff(rpc.user.toWC, rpc.toWC))
            $.sound('hone', 6)
            if (/^[A-Z]/.test(rpc.user.id)) {
                if ($.dice(3 * (rpc.toWC + rpc.user.toWC + 1)) / rpc.user.poison > rpc.weapon.wc) {
                    xvt.outln(xvt.bright, $.who(rpc, 'His'), rpc.user.weapon, ' vaporizes!')
                    if (rpc == $.online && $.online.weapon.wc > 1) $.sound('crack', 6)
                    $.Weapon.equip(rpc, $.Weapon.merchant[0])
                }
            }
            if (rpc.user.id !== $.player.id || ($.dice(rpc.user.poison) == 1 && $.dice(105 - rpc.cha) > 1)) {
                $.Poison.remove(rpc.user.poisons, vial)
                if (rpc.user.id === $.player.id) {
                    xvt.outln('You toss the empty vial aside.')
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
                $.action('list')
                xvt.app.form['start'].prompt = 'Starting level ' + $.bracket(start, false) + ': '
                xvt.app.focus = 'start'
                return
            }
            let rpc: active = { user: { id: xvt.entry} }
            if (!$.loadUser(rpc)) {
                rpc.user.id = ''
                rpc.user.handle = xvt.entry
                if (!$.loadUser(rpc)) { 
                    xvt.beep()
                    xvt.out(' ?? ')
                }
            }
            //  paint profile
            if (rpc.user.id) {
                $.action('clear')
                $.PC.profile(rpc)
                //  the inert player does not fully participate in the fun ... 
                if (/Bail|Brawl|Curse|Drop|Joust|Resurrect|Rob/.test(venue) && !rpc.user.xplevel) {
                    rpc.user.id = ''
                    xvt.beep()
                    xvt.out(' ', $.bracket('inactive', false))
                }
                else if (/Brawl|Fight|Joust|Resurrect/.test(venue) && rpc.user.status == 'jail') {
                    rpc.user.id = ''
                    xvt.beep()
                    if ($.tty == 'web') xvt.out(' 🔒 ')
                    xvt.out(' ', $.bracket(rpc.user.status, false))
                }
            }
            xvt.outln()
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

            xvt.outln()
            xvt.outln(xvt.Blue, xvt.bright, ` ID   Player's Handle          Class     Lvl      Last On       Access Level  `)
            xvt.outln(xvt.Blue, xvt.bright, '------------------------------------------------------------------------------')
            xvt.outln()

            let rs = $.query(`
                SELECT id, handle, pc, level, xplevel, status, lastdate, access FROM Players
                WHERE id NOT GLOB '_*'
                AND level BETWEEN ${start} AND ${end}
                ORDER BY xplevel DESC, level DESC, wins DESC, immortal DESC
                `)

            for (let i in rs) {
                if (rs[i].id === $.player.id)
                    continue
                if ((+rs[i].xplevel !== +rs[i].level && +rs[i].xplevel < 2)) xvt.out(xvt.faint)
                else xvt.out(xvt.reset)
                //  paint a target on any player that is winning
                if (rs[i].pc === $.PC.winning)
                    xvt.out(xvt.bright, xvt.yellow)
                xvt.out(sprintf('%-4s  %-22s  %-9s', rs[i].id, rs[i].handle, rs[i].pc))
                if (rs[i].status) xvt.out(xvt.faint)
                xvt.out(sprintf('  %3d  ', rs[i].xplevel))
                if (rs[i].status) xvt.out(xvt.normal)
                xvt.out($.date2full(rs[i].lastdate), '  ', rs[i].access)
                if ($.player.emulation === 'XT' && $.Access.name[rs[i].access].emoji)
                    xvt.out(' ', $.Access.name[rs[i].access].sysop ? xvt.cyan : xvt.faint
                         , $.Access.name[rs[i].access].emoji)
                xvt.outln()
            }

            if ($.access.roleplay && $.dice(+$.player.expert * ($.player.immortal + 1) * $.player.level) == 1)
                xvt.outln('\n', xvt.green, '> ', xvt.bright, 'double-click (tap) the Player ID to send your selection.')

            $.action('freetext')
            xvt.app.focus = 'user'
            return
        }}
    }
    xvt.app.form['user'].prompt = venue + ' what user (?=list): '
    xvt.app.focus = 'user'
}

export function yourstats(profile = true) {
    profile && $.PC.profile($.online)
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
    xvt.outln()

    xvt.out(xvt.cyan, 'Weapon: ', xvt.bright, xvt.white, $.player.weapon)
    xvt.out($.buff($.player.toWC, $.online.toWC), xvt.normal)
    xvt.out(xvt.cyan, '   Armor: ', xvt.bright, xvt.white, $.player.armor)
    xvt.out($.buff($.player.toAC, $.online.toAC))
    xvt.outln()

    for (let i in $.player.rings) {
        let ring = $.player.rings[i]
        xvt.out(xvt.cyan, $.player.emulation === 'XT' ? '⍥' : xvt.Empty[$.player.emulation]
            , ' ' , xvt.bright, ring, xvt.normal)
        if ($.tty == 'web') xvt.out(' ', $.Ring.name[ring].emoji, ' 💍')
        xvt.outln(' ring:', xvt.reset, ' can ', $.Ring.name[ring].description)
    }
}

}

export = Battle
