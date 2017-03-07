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
    export let volley: number
    export let party1: active[]
    export let party2: active[]
    export let bs: number

export function engage(party: active[], mob: active[]) {

}

export function attack(rpc: active, enemy: active) {

    if (rpc.confused) {
        let mod = rpc.user.blessed ? 10 : rpc.user.cursed ? -10 : 0
        rpc.int = $.PC.ability(rpc.int, $.PC.name[rpc.user.pc].toInt, rpc.user.maxint, mod)
        rpc.dex = $.PC.ability(rpc.dex, $.PC.name[rpc.user.pc].toDex, rpc.user.maxdex, mod)
    }

    if (rpc.user.id === $.player.id) {
        xvt.app.form = {
            'backstab': {cb:() => {
                if (/N/i.test(xvt.entry)) bs = 1
                melee(rpc, enemy, bs)
            }, enter:'Y', eol:false, max:1, match:/Y|N/i},
            'attack': {cb:() => {

            }, enter:'A', eol:false, max:1 }
        }
        if (!volley) {
            bs = $.player.backstab
            let roll = $.dice(100 + bs * $.player.level / 5)
            bs += (roll < bs) ? -1 : (roll > 99) ? +1 : 0
            do {
                roll = $.dice(100 + bs * $.player.backstab)
                bs += (roll == 1) ? -1 : (roll > 99) ? $.dice($.player.backstab) : 0
            } while (roll == 1 || roll > 99)
            if (bs > 1) {

            }
            else
                bs = 1
            xvt.app.form['backstab'].prompt = 'Attempt to backstab'
                + (bs > 2 && bs != $.player.backstab) ? ' for ' + bs.toString() + 'x' : ''
                + ' (Y/N)? '
            xvt.app.focus = 'backstab'
            return
        }
        else {
            xvt.app.form['attack'].prompt = '[,]'
                + $.bracket('A', false) + ' Attack, '
                + ($.player.magic && $.player.spells.length && rpc.sp) ? $.bracket('C', false) + ' Cast spell, ' : ''
                + $.bracket('R', false) + ' Retreat, '
                + $.bracket('Y', false) + ' Status: '
            xvt.app.focus = 'attack'
            return
        }
    }

}

export function cast(rpc: active, cb:Function) {
    if (rpc.user.id === $.player.id) {
        if (!$.player.spells.length) {
            xvt.out('\nYou don\'t have any magic.\n')
            cb(true)
            return
        }
        xvt.app.form = {
            'magic': { cb: () => {
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
    let hit = 0

    enemy.hp -= hit
    return
}

export function poison(rpc: active, cb:Function) {
    if (rpc.user.id === $.player.id) {
        if (!$.player.poisons.length) {
            xvt.out('\nYou don\'t have any poisons.\n')
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
            xvt.out($.who(rpc.user), $.what(rpc.user, 'secrete'), 'a caustic ooze', $.buff(p, t), '.\n')
            xvt.waste(500)
        }
        else {
            xvt.out($.who(rpc.user), $.what(rpc.user, 'pour')
                , 'some ', $.Poison.merchant[+xvt.entry - 1]
                , ' on ', $.who(rpc.user, false, false), rpc.user.weapon, '.\n')
            xvt.waste(500)
            if (/^[A-Z]/.test(rpc.user.id)) {
                if ($.dice(3 * (rpc.toWC + rpc.user.toWC + 1)) / rpc.user.poison > $.Weapon.name[rpc.user.weapon].wc) {
                    xvt.out($.who(rpc.user, false), rpc.user.weapon, ' vaporizes!\n')
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
            xvt.out(' ID   Player\'s Handle           Class    Lvl    Last On     Access Level  \n')
            xvt.out('--------------------------------------------------------------------------')
            xvt.out('\n', xvt.reset)

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
    xvt.out(xvt.reset, '\n')
    xvt.out(xvt.cyan, 'Str:', xvt.bright, $.online.str > $.player.str ? xvt.yellow : $.online.str < $.player.str ? xvt.red : xvt.white)
    xvt.out(sprintf('%3d (%d,%d)    ', $.online.str , $.player.str, $.player.maxstr), xvt.nobright)
    xvt.out(xvt.cyan, 'Int:', xvt.bright, $.online.int > $.player.int ? xvt.yellow : $.online.int < $.player.int ? xvt.red : xvt.white)
    xvt.out(sprintf('%3d (%d,%d)    ', $.online.int , $.player.int, $.player.maxint), xvt.nobright)
    xvt.out(xvt.cyan, 'Dex:', xvt.bright, $.online.dex > $.player.dex ? xvt.yellow : $.online.dex < $.player.dex ? xvt.red : xvt.white)
    xvt.out(sprintf('%3d (%d,%d)    ', $.online.dex , $.player.dex, $.player.maxdex), xvt.nobright)
    xvt.out(xvt.cyan, 'Cha:', xvt.bright, $.online.cha > $.player.cha ? xvt.yellow : $.online.cha < $.player.cha ? xvt.red : xvt.white)
    xvt.out(sprintf('%3d (%d,%d)    ', $.online.cha , $.player.cha, $.player.maxcha))
    xvt.out(xvt.reset, '\n')
    xvt.out(xvt.cyan, 'Hit points: ', xvt.bright, $.online.hp > $.player.hp ? xvt.yellow : $.online.hp < $.player.hp ? xvt.red : xvt.white)
    xvt.out(sprintf('%d/%d', $.online.hp , $.player.hp), xvt.nobright)
    if ($.player.sp) {
        xvt.out(xvt.cyan, '    Spell points: ', xvt.bright, $.online.sp > $.player.sp ? xvt.yellow : $.online.sp < $.player.sp ? xvt.red : xvt.white)
        xvt.out(sprintf('%d/%d', $.online.sp , $.player.sp), xvt.nobright)
    }
    if ($.player.coin.value) xvt.out(xvt.cyan, '    Money: ', $.player.coin.carry())
    xvt.out(xvt.reset, '\n')
    xvt.out(xvt.cyan, 'Weapon: ', xvt.bright, xvt.white, $.player.weapon)
    xvt.out($.buff($.player.toWC, $.online.toWC), xvt.nobright)
    xvt.out(xvt.cyan, '   Armor: ', xvt.bright, xvt.white, $.player.armor)
    xvt.out($.buff($.player.toAC, $.online.toAC), xvt.nobright)
    xvt.out(xvt.reset, '\n')
}
}

export = Battle
