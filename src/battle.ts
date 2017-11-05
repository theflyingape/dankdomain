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

    //  no more attacking
    if (retreat || ++volley > 99999) return

    if (!round.length) {
        if (volley > 1) xvt.out(xvt.reset, '\n    -=', $.bracket('*', false), '=-\n')
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
    if (rpc.hp < 1) {
        next()
        return
    }

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
        $.action('battle')
        xvt.app.form = {
            'attack': {cb:() => {
                xvt.out('\n\n')

                if (/C/i.test(xvt.entry)) {
                    Battle.cast($.online, next, enemy)
                    return
                }
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
                $.action('yn')
                xvt.app.form['backstab'].prompt = 'Attempt to backstab'
                    + (bs > 2 && bs != $.player.backstab ? ' for ' + bs.toString() + 'x' : '')
                    + ' (Y/N)? '
                xvt.app.focus = 'backstab'
                return
            }
            else {
                xvt.out('\n')
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
/*

if(!volley && dice((100 - rpc->user.Level) / 5 + 5) < rpc->user.MyPoison)
    PoisonWeapon(rpc);
c = 'A';
if(rpc->INT >= ((70 + 30 * rpc->HP / rpc->user.HP) - 5 * rpc->user.MyMagic) || !rpc->Confused) {
    if(nest)
            switch(rpc->user.MyMagic) {
                    case 1:
                            if(dice(6) == 1)
                                    c = 'C';
                            break;
                    case 2:
                            if(dice(5) == 1)
                                    c = 'C';
                            break;
                    case 3:
                            if(dice(4) == 1)
                                    c = 'C';
                            break;
                    case 4:
                            if(dice(3) == 1)
                                    c = 'C';
                            break;
            }
    else
    if(from == 'P')
            switch(rpc->user.MyMagic) {
                    case 1:
                            if(dice(10) == 1)
                                    c = 'C';
                            break;
                    case 2:
                            if(dice(6) == 1)
                                    c = 'C';
                            break;
                    case 3:
                            if(dice(4) == 1)
                                    c = 'C';
                            break;
                    case 4:
                            if(dice(2) == 1)
                                    c = 'C';
                            break;
            }
    else
        switch(rpc->user.MyMagic) {
                case 1:
                        if(dice(5) == 1)
                                c = 'C';
                        break;
                case 2:
                        if(dice(3) == 1)
                                c = 'C';
                        break;
                case 3:
                        if(dice(2) == 1)
                                c = 'C';
                        break;
                case 4:
                        if(dice(1) == 1)
                                c = 'C';
                        break;
        }
}

if(c == 'C') {
        if(!(n = Cast(rpc, enemy)))
                c = 'A';
        if(abs(n) == TELEPORT_SPELL)
                c = 'r';
}

if(c == 'A') {
        if(rpc->user.Coward && (int)rpc->user.ExpLevel - (int)enemy->user.ExpLevel > 3 && rpc->HP < rpc->user.HP / 4) {
                memset(rpc->user.Blessed,0,sizeof(rpc->user.Blessed));
                if(strlen(enemy->user.ID))
                        strcpy(rpc->user.Cursed,enemy->user.ID);
                sprintf(outbuf,"%s%s runs away from the battle!",(rpc->user.Gender=='I' ? "The " : ""),rpc->user.Handle);
                rpc->user.Current.Retreats++;
                rpc->user.History.Retreats++;
                c='r';
        }
        else {
                n=Melee(rpc,enemy,1);
                rpc->user.History.HP+=n;
                enemy->HP-=n;
        }
}

if(enemy->HP < 1) {
        enemy->HP = 0;
        if(from == 'P') {
                if(c == 'A')
                        switch(dice(6)) {
                                case 1:
                                        sprintf(outbuf, "%s makes a fatal blow to %s.", rpc->user.Handle, enemy->user.Handle);
                                        break;
                                case 2:
                                        sprintf(outbuf, "%s blows %s away.", rpc->user.Handle, enemy->user.Handle);
                                        break;
                                case 3:
                                        sprintf(outbuf, "%s laughs, then kills %s.", rpc->user.Handle, enemy->user.Handle);
                                        break;
                                case 4:
                                        sprintf(outbuf, "%s easily slays %s.", rpc->user.Handle, enemy->user.Handle);
                                        break;
                                case 5:
                                        sprintf(outbuf, "%s makes minced-meat out of %s.", rpc->user.Handle, enemy->user.Handle);
                                        break;
                                case 6:
                                        sprintf(outbuf, "%s runs %s through.", rpc->user.Handle, enemy->user.Handle);
                                        break;
                        }
                        if(c == 'C')
                                strcat(outbuf," {RIP}");
                }

*/
    //  NPC
    else {
        if (volley == 1 && $.dice(Math.trunc((100 - rpc.user.level) / 12) + 6) < rpc.user.poison)
            poison(rpc)

        //  might or magic?
        let mm: number = 0
        let nest: number = 0
        if (rpc.user.magic == 1) {
            if ($.Magic.have(rpc.user.spells, 8)
                && rpc.hp < rpc.user.hp / 6
                && $.dice(6 - enemy.user.melee) == 1)
                    mm = 8
            else if ($.Magic.have(rpc.user.spells, 7)
                    && rpc.hp < (rpc.user.hp >>1)
                    && $.dice(enemy.user.melee + 2) > 1)
                    mm = 7
            else if ($.Magic.have(rpc.user.spells, 9)
                    && rpc.hp < (rpc.user.hp >>1)
                    && $.dice(enemy.user.melee + 2) > 1)
                    mm = 9
            else if ($.Magic.have(rpc.user.spells, 11)
                    && rpc.hp > (rpc.user.hp >>1)
                    && $.dice(enemy.user.melee + 2) == 1)
                    mm = 11
            else if ($.Magic.have(rpc.user.spells, 13)
                    && rpc.hp < (rpc.user.hp / 6)
                    && $.dice((rpc.user.level - enemy.user.level) / 9 + 2) == 1)
                    mm = 13
            else if (!rpc.confused) {
                if ($.Magic.have(rpc.user.spells, 14)
                    && rpc.hp > (rpc.user.hp >>1)
                    && $.dice((rpc.user.level - enemy.user.level) / 9 + 2) == 1)
                        mm = 14
                else if ($.Magic.have(rpc.user.spells, 12)
                    && rpc.hp > (rpc.user.hp >>1)
                    && $.dice((rpc.user.level - enemy.user.level) / 9 + 2) == 1)
                        mm = 12
                else if ($.Magic.have(rpc.user.spells, 15)
                    && rpc.hp > (rpc.user.hp >>1)
                    && $.dice(nest + (rpc.user.level - enemy.user.level) / 9 + 2) == 1)
                        mm = 15
                else if ($.Magic.have(rpc.user.spells, 16)
                    && rpc.hp == rpc.user.hp
                    && $.dice(nest + (rpc.user.level - enemy.user.level) / 9 + 2) == 1)
                    mm = 16
            }
        }
        if (rpc.user.magic > 1) {
            if (!rpc.confused) {
                if ($.Magic.have(rpc.user.spells, 15)
                    && rpc.sp >= $.Magic.power(rpc, 15)
                    && $.dice((rpc.user.level - enemy.user.level) / 9 + 2) == 1)
                        mm = 15
                else if ($.Magic.have(rpc.user.spells, 16)
                    && rpc.sp >= $.Magic.power(rpc, 16)
                    && $.dice((rpc.user.level - enemy.user.level) / 9 + 2) == 1)
                        mm = 16
                else if ($.Magic.have(rpc.user.spells, 11)
                    && rpc.sp >= $.Magic.power(rpc, 11)
                    && $.dice(5 - enemy.user.magic) == 1)
                        mm = 11
                else if ($.Magic.have(rpc.user.spells, 14)
                    && rpc.sp >= $.Magic.power(rpc, 14)
                    && $.dice((rpc.user.level - enemy.user.level) / 9 + 2) == 1)
                        mm = 14
                else if ($.Magic.have(rpc.user.spells, 12)
                    && rpc.sp >= $.Magic.power(rpc, 12)
                    && $.dice((rpc.user.level - enemy.user.level) / 9 + 2) == 1)
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

        if (mm) {
            cast(rpc, next, enemy, mm)
            return
        }
        else
            melee(rpc, enemy)
    }

    next()

/*
if(!p) {
        if(rpc->user.XSpell && dice(nest + 2) > 1) {
                i = dice(8);
                switch(i) {
                        case 1:
                                if((rpc->user.XSpell & ARMOR_RUSTING_XSPELL) && AC2 > 0 && (rpc->user.MyMagic == 1 || rpc->SP >= MAGIC(16)->Power[mu])) {
                                        p = ARMOR_RUSTING_XSPELL;
                                        s = 17;
                                }
                                break;
                        case 2:
                                if((rpc->user.XSpell & WEAPON_DECAY_XSPELL) && WC2 > 0 && (rpc->user.MyMagic == 1 || rpc->SP >= MAGIC(17)->Power[mu])) {
                                        p = WEAPON_DECAY_XSPELL;
                                        s = 18;
                                }
                                break;
                        case 3:
                                if((rpc->user.XSpell & BIG_BLAST_XSPELL) && (rpc->user.MyMagic == 1 || rpc->SP >= MAGIC(18)->Power[mu])) {
                                        p = BIG_BLAST_XSPELL;
                                        s = 19;
                                }
                                break;
                        case 4:
                                if((rpc->user.XSpell & MANA_STEALING_XSPELL) && enemy->SP && (rpc->user.MyMagic == 1 || rpc->SP >= MAGIC(19)->Power[mu])) {
                                        p = MANA_STEALING_XSPELL;
                                        s = 20;
                                }
                                break;
                        case 5:
                                if((rpc->user.XSpell & LIFE_STEALING_XSPELL) && (rpc->user.MyMagic == 1 || rpc->SP >= MAGIC(20)->Power[mu])) {
                                        p = LIFE_STEALING_XSPELL;
                                        s = 21;
                                }
                                break;
                        case 6:
                                if((rpc->user.XSpell & LEVEL_STEALING_XSPELL) && (rpc->user.MyMagic == 1 || rpc->SP >= MAGIC(21)->Power[mu])) {
                                        p = LEVEL_STEALING_XSPELL;
                                        s = 22;
                                }
                                break;
                        case 7:
                                if((rpc->user.XSpell & SUPER_SHIELD_XSPELL) && (rpc->user.MyMagic == 1 || rpc->SP >= MAGIC(22)->Power[mu])) {
                                        p = SUPER_SHIELD_XSPELL;
                                        s = 23;
                                }
                                break;
                        case 8:
                                if((rpc->user.XSpell & SUPER_HONE_XSPELL) && (rpc->user.MyMagic == 1 || rpc->SP >= MAGIC(23)->Power[mu])) {
                                        p = SUPER_HONE_XSPELL;
                                        s = 24;
                                }
                                break;
                }
        }
        if(!p)
                return(0);
    }
}
 */

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

    if ($.online.confused)
        $.activate($.online, false, true)

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
                    loser.altered = true
                    loser.user.status = winner.user.id
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
                    if ($.Weapon.swap(winner, loser))
                        xvt.out($.who(winner, 'He'), $.what(winner, 'take'), $.who(loser, 'his'), winner.user.weapon, '.\n')
                    if ($.Armor.swap(winner, loser))
                        xvt.out($.who(winner, 'He'), 'also ', $.what(winner, 'take'), $.who(loser, 'his'), winner.user.armor, '.\n')
                    $.unlock(loser.user.id)
                    xvt.out(1000)
                }
                if (loser.altered) $.saveUser(loser)
            }
        }
        winner.user.xp += xp
        xvt.out('You get'
            , parties[l].length > 1 ? ' a total of ' : ' '
            , sprintf(xp < 1e+8 ? '%d' : '%.7e', xp), ' experience.\n'
        )
        winner.user.coin.value += coin.value
        xvt.out('You get'
            , parties[l].length > 1 ? ' a total of ' : ' '
            , coin.carry(), ' '
            , parties[l].length > 1 ? 'they were ' : $.who(loser, 'he') + 'was '
            , 'carrying.\n'
        )
    }
    else {
        if (winner.user.id) {
            if (loser.user.blessed) {
                winner.user.blessed = loser.user.id
                loser.user.blessed = ''
                xvt.out(xvt.bright, xvt.yellow, 'Your shining aura leaves you.\n', xvt.reset)
                xvt.waste(1000)
            }
            if ($.Weapon.swap(winner, loser))
                xvt.out($.who(winner, 'He'), $.what(winner, 'take'), $.who(loser, 'his'), winner.user.weapon, '.\n')
            if ($.Armor.swap(winner, loser))
                xvt.out($.who(winner, 'He'), 'also ', $.what(winner, 'take'), $.who(loser, 'his'), winner.user.armor, '.\n')
            if (winner.user.cursed) {
                loser.user.cursed = winner.user.id
                winner.user.cursed = ''
                xvt.out(xvt.bright, xvt.black, 'A dark cloud hovers over you.\n', xvt.reset)
                xvt.waste(1000)
            }
        }
        if (loser.user.coin.value) {
            winner.user.coin.value += loser.user.coin.value
            xvt.out($.who(winner, 'He'), 'gets ', loser.user.coin.carry(), ' you were carrying.\n')
            loser.user.coin.value = 0
            loser.altered = true
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
            if (nme.user.novice && [ 12,16,20,21,22 ].indexOf(spell.cast) >= 0) {
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
                $.sound('oops')
                xvt.out('Oops!  ', xvt.reset, $.who(rpc, 'His'), 'spell backfires!\n')
            }
            else {
                $.sound('fssst')
                xvt.out('Fssst!  ', xvt.reset, $.who(rpc, 'His'), 'spell fails!\n')
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
                xvt.out($.who(rpc, 'His'), rpc.user.armor ? rpc.user.armor : 'defense', ' loses some of its effectiveness.\n')
            }
            else {
                $.sound('shield')
                xvt.out('A magical field shimmers around ', rpc.user.armor ? $.who(rpc, 'his') + rpc.user.armor : $.who(rpc, 'him'), '.\n')
                if (rpc.user.magic > 2 && rpc.user.toAC >= 0)
                    rpc.user.toAC++
                rpc.toAC++
            }
            if (-rpc.user.toAC >= rpc.armor.ac || -(rpc.user.toAC + rpc.toAC) >= rpc.armor.ac) {
                xvt.out($.who(rpc, 'His'), rpc.user.armor ? rpc.user.armor : 'defense', ' crumbles!\n')
                $.Armor.equip(rpc, $.Armor.merchant[0])
            }
            if ($.dice(3 * (rpc.user.toAC + rpc.toAC + 1) / rpc.user.magic) >>0 > rpc.armor.ac) {
                xvt.out($.who(rpc, 'His'), rpc.user.armor ? rpc.user.armor : 'defense', ' vaporizes!\n')
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
                $.sound('hurt')
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
                $.sound('heal')
                rpc.hp += hr
                if (rpc.hp > rpc.user.hp)
                    rpc.hp = rpc.user.hp
                xvt.out(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' heal'), rpc !== $.online ? $.who(rpc, 'him') + '\x08self ' : ''
                    , 'for ', hr.toString(), ' hit points.\n')
            }
            break

        case 8:
            $.sound('teleport')
            if (backfire) {
                nme.hp = -1
            }
            else {
                if (rpc === $.online) {
                    teleported = true
                    retreat = true
                    rpc.user.retreats++
                }
                else {
                    rpc.hp = -1
                }
            }
            break

        case 9:
            $.sound('blast')
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
                    , ' for ', br.toString(), ' hit points!\n')
                nme.hp -= br
                if (nme.hp < 1) {
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
                nme.int >>1
                nme.dex >>1
            }
            break

        case 12:
            $.sound('transmute')
            if (backfire) {

            }
            else {

            }
            break

        case 13:
            $.sound('cure')
            if (backfire) {

            }
            else {

            }
            break

        case 14:
            $.sound('illusion')
            if (backfire) {

            }
            else {

            }
            break

        case 15:
            $.sound('disintegrate', 6)
            if (backfire) {
                xvt.out(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, 'completely atomize')
                    , $.who(rpc,'him'), '\x08self!\n')
                rpc.hp = 0
                if (rpc === $.online)
                    $.reason = `disintegrate backfired`
            }
            else {
                xvt.out(rpc === $.online ? 'You' : rpc.user.gender === 'I' ? 'The ' + rpc.user.handle : rpc.user.handle
                    , $.what(rpc, ' completely atomize')
                    , nme === $.online ? 'you' : rpc.user.gender === 'I' ? 'the ' + rpc.user.handle : rpc.user.handle
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
            break

        case 16:
            $.sound('morph')
            if (backfire) {

            }
            else {

            }
            break

        case 17:
            if (backfire) {

            }
            else {

            }
            break

        case 18:
            if (backfire) {

            }
            else {

            }
            break

        case 19:
            $.sound('blast')
            if (backfire) {

            }
            else {

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
                        , enemy == $.online ? 'you' : rpc.user.handle
                        , '.\n')
                else {
                    xvt.out(rpc.user.gender === 'I' ? 'The ' : ''
                        , rpc.user.handle, ' attacks '
                        , enemy.user.gender === 'I' ? 'the ' : ''
                        , enemy == $.online ? 'you' : rpc.user.handle
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
    if (hit > 0) {
    //  any ego involvement
    //  if((damage + egostat[0] + egostat[1] + egostat[2] + egostat[3]) < 1)
    //      damage = dice(2) - (egostat[0] + egostat[1] + egostat[2] + egostat[3]);
        hit *= blow
        action = (blow == 1)
            ? (period[0] === '.') ? rpc.weapon.hit : rpc.weapon.smash
            : (period[0] === '.') ? rpc.weapon.stab : rpc.weapon.plunge

        if (rpc == $.online) {
            xvt.out('You ', action, enemy.user.gender === 'I' ? ' the ' : ' ', enemy.user.handle
                , ' for ', hit.toString(), ' hit points', period, '\n'
            )
            xvt.waste(200)
        }
        else {
            let w = action.split(' ')
            if (alive[1] == 1)
                xvt.out($.who(rpc, 'He'))
            else {
                if(rpc.user.gender === 'I')
                    xvt.out('The ')
                xvt.out(rpc.user.handle, ' ')
            }
            xvt.out($.what(rpc, w[0]), w.slice(1).join(' '), enemy == $.online ? 'you'
                : enemy.user.gender === 'I' ? 'the ' + enemy.user.handle : enemy.user.handle
                , ' for ', hit.toString(), ' hit points', period, '\n'
            )
        }
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
                if (enemy.user.id !== '' && enemy.user.id[0] !== '_') {
                    $.sound('kill', 15)
                    $.music('bitedust')
                    $.news(`\tdefeated ${enemy.user.handle}, an experience level ${enemy.user.xplevel} ${enemy.user.pc}`)
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
