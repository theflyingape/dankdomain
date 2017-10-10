/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  BATTLE authored by: Robert Hurst <theflyingape@gmail.com>                *
\*****************************************************************************/

import {sprintf} from 'sprintf-js'

import $ = require('./common')
import db = require('./database')
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
    export let volley: number


//  start a new battle engagement:
//    do rounds: attack() with possibly backstab or poison
//       per member: next() for cast, melee, or retreat
//    until spoils()
export function engage(module:string, party: active|active[], mob: active|active[], cb:Function) {

    //  process parameters
    from = module

    if (xvt.validator.isArray(party))
        parties = [ <active[]>{ ...party } ]
    else {
        let a:active[] = new Array(<active>party)
        parties = [ a ]
    }

    if (xvt.validator.isArray(mob))
        parties.push(<active[]>{ ...mob })
    else {
        let b:active[] = new Array(<active>mob)
        parties.push(b)
    }

    fini = cb

    //  initialize for first encounter in engagement
    alive = [ parties[0].length, parties[1].length ]
    round = []
    retreat = false
    volley = 0

    attack()
}

//  new round of volleys
export function attack(skip = false) {

    //  no more attacking
    if (retreat || ++volley > 99999) return

    if (!round.length) {
        if (volley > 1) xvt.out(xvt.reset, '\n    -=', $.bracket('*', false), '=-\n')
        //  lame for now
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
    if (!skip) n = round.shift()
    let rpc = parties[n.party][n.member]

    //  recovery?
    if (rpc.confused) {
        let mod = rpc.user.blessed ? 10 : rpc.user.cursed ? -10 : 0
        rpc.int = $.PC.ability(rpc.int, $.PC.name[rpc.user.pc].toInt, rpc.user.maxint, mod)
        rpc.dex = $.PC.ability(rpc.dex, $.PC.name[rpc.user.pc].toDex, rpc.user.maxdex, mod)
    }
    
    //  choose an opponent
    let mob = n.party ^ 1
    let nme: number
    do { nme = $.dice(parties[mob].length) - 1 } while (parties[mob][nme].hp < 1)
    let enemy = parties[mob][nme]

    if (rpc.user.id === $.player.id) {
        xvt.app.form = {
            'attack': {cb:() => {
                xvt.out('\n\n')

                if (/C/i.test(xvt.entry)) {
                    Battle.cast($.online, next)
                    return
                }
/*
n = rpc->DEX + dice(rpc->INT) / 10;
n += ((int)rpc->DEX - (int)enemy->DEX) / 2;
n = (n < 5) ? 5 : (n > 95) ? 95 : n;
n += 5 * (us - them);
n = (n < 5) ? 5 : (n > 95) ? 95 : n;
if(dice(100) > n) {
    switch(dice(5)) {
        case 1:
            sprintf(outbuf, "You trip and fail in your attempt to retreat.");
            break;
        case 2:
            sprintf(outbuf, "%s%s pulls you back into the battle.", (enemy->user.Gender == 'I' ? "The " : ""), enemy->user.Handle);
            break;
        case 3:
            sprintf(outbuf, "%s%s prevents your retreat and says, \"I'm not through with you yet!\"", (enemy->user.Gender == 'I' ? "The " : ""), enemy->user.Handle);
            break;
        case 4:
            sprintf(outbuf, "%s%s outmaneuvers you and says, \"You started this, I'm finishing it.\"", (enemy->user.Gender == 'I' ? "The " : ""), enemy->user.Handle);
            break;
        case 5:
            sprintf(outbuf, "%s%s blocks your path and says, \"Where do you want to go today?\"", (enemy->user.Gender == 'I' ? "The " : ""), enemy->user.Handle);
            break;
    }
    c = 'A';
    break;
}
PLAYER.Current.Retreats++;
PLAYER.History.Retreats++;
sprintf(line[numline++], "%s, the coward, retreated from you.", PLAYER.Handle);
*/
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
                    fini()
                    return
                }

                if (/Y/i.test(xvt.entry)) {
                    yourstats()
                    xvt.app.refocus()
                    return
                }

                melee(rpc, enemy)
                next()
                return
            }, enter:'A', cancel:'R', eol:false, max:1, match:/A|C|R|Y/i },
            'backstab': {cb:() => {
                if (/N/i.test(xvt.entry)) bs = 1
                xvt.out('\n\n')
                melee(rpc, enemy, bs)
                next()
                return
            }, enter:'Y', eol:false, max:1, match:/Y|N/i}
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
                xvt.app.form['backstab'].prompt = 'Attempt to backstab'
                    + (bs > 2 && bs != $.player.backstab ? ' for ' + bs.toString() + 'x' : '')
                    + ' (Y/N)? '
                xvt.app.focus = 'backstab'
                return
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

            xvt.app.form['attack'].prompt = choices
                + $.bracket('A', false) + 'ttack, '
                + ($.player.magic && $.player.spells.length && rpc.sp ? $.bracket('C', false) + 'ast spell, ' : '')
                + $.bracket('R', false) + 'etreat, '
                + $.bracket('Y', false) + 'our status: '
            xvt.app.focus = 'attack'
            return
        }
    }
    //  NPC
    else {
        melee(rpc, enemy)
    }

    next()

    function next(skip = false) {

        alive = []
        for (let p in parties) {
            alive.push(parties[p].length)
            for (let m in parties[p])
                if (parties[p][m].hp < 1)
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

    // had a little help from my friends (maybe)
    if (from === 'Party') {
        return
    }

    if ($.online.hp) {
        winner = $.online
        l = 1
    }
    else {
        winner = parties[1][0]
        loser = $.online
        l = 0
    }

    winner.altered = true
    if (l) {
        // player can collect off each corpse
        let xp: number = 0
        let coin = new $.coins(0)

        for (let m in parties[l]) {
            // defeated?
            if (parties[l][m].hp == 0) {
                loser = parties[l][m]
                if (/Monster|User/.test(from)) {
                    loser.user.status = winner.user.id
                    winner.user.coward = false
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
                if ($.Weapon.swap(winner, loser))
                    xvt.out($.who(winner, 'He'), 'take', winner == $.online ? '' : 's', $.who(loser, 'his'), winner.user.weapon, '.\n')
                if ($.Armor.swap(winner, loser))
                    xvt.out($.who(winner, 'He'), 'take', winner == $.online ? '' : 's', $.who(loser, 'his'), winner.user.armor, '.\n')
                if (loser.altered) db.saveUser(loser)
            }
        }
        winner.user.xp += xp
        xvt.out('You get ', sprintf(xp < 1e+8 ? '%d' : '%.7e', xp), ' experience.\n')
        winner.user.coin.value += coin.value
        xvt.out('You get ', coin.carry(), $.who(loser, 'he'), 'was carrying.\n')
    }
    else {
        if (winner.user.id) {
            if ($.Weapon.swap(winner, loser))
                xvt.out($.who(winner, 'He'), 'take', winner == $.online ? '' : 's', $.who(loser, 'his'), winner.user.weapon, '.\n')
            if ($.Armor.swap(winner, loser))
                xvt.out($.who(winner, 'He'), 'take', winner == $.online ? '' : 's', $.who(loser, 'his'), winner.user.armor, '.\n')
        }
        if (loser.user.coin.value) {
            winner.user.coin.value += loser.user.coin.value
            xvt.out($.who(winner, 'He'), 'gets ', loser.user.coin.carry(), ' you were carrying.\n')
            loser.user.coin.value = 0
            loser.altered = true
        }
    }
}

export function cast(rpc: active, cb:Function) {
    if (rpc.user.id === $.player.id) {
        if (!$.player.spells.length) {
            xvt.out('You don\'t have any magic.\n')
            cb(true)
            return
        }
        xvt.app.form = {
            'magic': { cb: () => {
                xvt.out('\n')
                if (xvt.entry === '') {
                    cb()
                    return
                }
                if (!$.Magic.have(rpc.user.spells, +xvt.entry)) {
                	for (let i in $.player.spells) {
                        let p = $.player.spells[i]
                        if (xvt.validator.isNotEmpty($.Magic.merchant[p - 1]))
    				    	xvt.out($.bracket(p), ' ', $.Magic.merchant[p - 1])
                        else
    				    	xvt.out($.bracket(p), ' ', $.Magic.special[p - $.Magic.merchant.length])
                    }
                    xvt.out('\n')
                    xvt.app.refocus()
                    return
                }
                else
                    invoke(rpc, +xvt.entry)
                cb(true)
                return
            }, prompt:['Use wand', 'Read scroll', 'Cast spell', 'Uti magicae'][$.player.magic - 1] + ' (?=list): ', max:2 }
        }
        xvt.app.focus = 'magic'
        return
    }

    function invoke(rpc: active, spell: number) {
        rpc.altered = true
    }
}

export function melee(rpc: active, enemy: active, blow = 1) {
    let action: string
    let hit = 0
    xvt.out(rpc == $.online ? xvt.bright : xvt.reset)
    
    let n = rpc.dex + (rpc.dex - enemy.dex)
    if (blow > 1)
        n = Math.trunc(n / 2) + 50
    n = (n < 5) ? 5 : (n > 99) ? 99 : n

    // saving throw
    if ($.dice(100) > n) {
        if (blow == 1) {
            if (rpc == $.online) {
                xvt.out('Your ', rpc.user.weapon, ' passes through thin air.\n')
                xvt.waste(500)
                return
            }
            else {
                if (isNaN(+rpc.user.weapon))
                    xvt.out(rpc.user.gender === 'I' ? 'The ' : ''
                        , rpc.user.handle, '\'s ', rpc.user.weapon
                        , ' whistles by '
                        , enemy.user.gender === 'I' ? 'the ' : ''
                        , enemy == $.online ? 'you' : rpc.user.handle
                        , '.\n')
                else
                    xvt.out(rpc.user.gender === 'I' ? 'The ' : ''
                    , enemy == $.online ? 'you' : rpc.user.handle
                    , ' attacks '
                    , enemy.user.gender === 'I' ? 'the ' : ''
                    , enemy == $.online ? 'you' : rpc.user.handle
                , ', but misses.\n')
                return
            }
        }
        else {
            xvt.out('Attempt fails!\n')
            xvt.waste(500)
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
    hit = Math.trunc(hit / 100)

    // my stuff vs your stuff
    let wc = rpc.weapon.wc + rpc.user.toWC + rpc.toWC
    let ac = enemy.armor.ac + enemy.user.toAC + enemy.toWC
    wc = wc < 0 ? 0 : wc
    ac = ac < 0 ? 0 : ac

    hit += 2 * (wc + $.dice(wc))
    hit *= 50 + Math.trunc(rpc.user.str / 2)
    hit = Math.trunc(hit / 100)
    if (hit > 0) {
        hit -= ac + $.dice(ac)
    //  any ego involvement
    //  if((damage + egostat[0] + egostat[1] + egostat[2] + egostat[3]) < 1)
    //      damage = dice(2) - (egostat[0] + egostat[1] + egostat[2] + egostat[3]);
        hit *= blow
        action = (blow == 1)
            ? (period[0] === '.') ? rpc.weapon.hit : rpc.weapon.smash
            : (period[0] === '.') ? rpc.weapon.stab : rpc.weapon.plunge

        if (rpc == $.online) {
            xvt.out('You '
                , action
                , enemy.user.gender === 'I' ? ' the ' : ' ', enemy.user.handle
                , ' for ', hit.toString(), ' hit points', period, '\n')
            xvt.waste(100)
        }
        else {
            let w = action.split(' ')
            let s = /.*ch|.*sh|.*s/i.test(w[0]) ? 'es' : 's'
            xvt.out((/Monster|User/.test(from)) ? $.who(rpc, 'He')
                : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle + ' ' : rpc.user.handle + ' '
                , w[0], s, w.slice(1).join(' '), ' '
                , enemy == $.online ? 'you' : enemy.user.gender === 'I' ? 'the ' + enemy.user.handle : enemy.user.handle
                , ' for ', hit.toString(), ' hit points'
                , period, '\n'
            )
        }
    }
    else {
        xvt.out(
            rpc == $.online ? 'Your ' + rpc.user.weapon
            : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
            , ' does not even scratch '
            , enemy == $.online ? 'you' : enemy.user.gender === 'I' ? 'the ' + enemy.user.handle : enemy.user.handle
            , '.\n'
        )
        hit = 0
    }

    enemy.hp -= hit

    if (enemy.hp < 1) {
        enemy.hp = 0    // killed
        if (enemy == $.online) {
            $.player.killed++
            xvt.out('\n', xvt.bright, xvt.yellow
                , rpc.user.gender == 'I' ? 'The ' : '', rpc.user.handle
                , ' killed you!\n\n', xvt.reset)
            xvt.waste(500)
            $.reason = rpc.user.id.length ? `defeated by ${rpc.user.handle}`
                : `defeated by a level ${rpc.user.level} ${rpc.user.handle}`
            xvt.carrier = false
        }
        else {
            if (rpc == $.online) {
                $.player.kills++
                xvt.out('You killed'
                    , enemy.user.gender === 'I' ? ' the ' : ' ', enemy.user.handle
                    , '!\n\n', xvt.reset)
                xvt.waste(200)
                // rpc.user.id.length ? `defeated ${enemy.user.handle}`
                //    : `defeated a level ${enemy.user.level} ${enemy.user.handle}`
            }
        }
    }

    return
}

export function poison(rpc: active, cb:Function) {
    if (rpc.user.id === $.player.id) {
        if (!$.player.poisons.length) {
            xvt.out('You don\'t have any poisons.\n')
            cb(true)
            return
        }
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
				    	xvt.out($.bracket(p), ' ', $.Poison.merchant[p - 1])
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

    if ((rpc.toWC + rpc.user.toWC) < Math.trunc($.Weapon.name[rpc.user.weapon].wc / (6 - rpc.user.poison))) {
        let vial = $.dice(rpc.user.poisons.length) - 1
        if (vial) apply(rpc, vial)
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

        xvt.out(xvt.reset, '\n')
        if (!$.Poison.have(rpc.user.poisons, vial) || +rpc.user.weapon < 0) {
            xvt.out($.who(rpc, 'He'), $.what(rpc, 'secrete'), 'a caustic ooze', $.buff(p, t), '.\n')
            xvt.waste(500)
        }
        else {
            xvt.out($.who(rpc, 'He'), $.what(rpc, 'pour')
                , 'some ', $.Poison.merchant[+xvt.entry - 1]
                , ' on', $.who(rpc, 'his'), rpc.user.weapon, '.\n')
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

    xvt.app.form = {
        'user': { cb: () => {
            if (xvt.entry === '?') {
                xvt.app.form['start'].prompt = 'Starting level ' + $.bracket(start, false) + ': '
                xvt.app.focus = 'start'
                return
            }
            let rpc: active = { user: { id: xvt.entry} }
            if (!db.loadUser(rpc)) {
                rpc.user.id = ''
                rpc.user.handle = xvt.entry
                if(!db.loadUser(rpc)) { 
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

            let rows = db.query(`
                SELECT id, handle, pc, level, status, lastdate, access FROM Players
                WHERE id NOT GLOB '_*'
                AND level BETWEEN ${start} AND ${end}
                ORDER BY level DESC, immortal DESC
                `)

            for (let n in rows[0].values) {
                let row = rows[0].values[n]
                if (row[0] === $.player.id)
                    continue
                if (row[4].length) xvt.out(xvt.faint)
                else xvt.out(xvt.reset)
                //  paint a target on any player that is winning
                if (row[2] === $.PC.winning)
                    xvt.out(xvt.bright, xvt.yellow)
                xvt.out(sprintf('%-4s  %-22s  %-9s  %3d  ', row[0], row[1], row[2], row[3]))
                xvt.out($.date2full(row[5]), '  ', row[6])
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
