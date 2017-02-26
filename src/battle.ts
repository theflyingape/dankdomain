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

export function cast(rpc: active, cb:Function) {
    if (rpc.user.id === $.player.id) {
        if (!$.player.spells.length) {
            xvt.out('\nYou don\'t have any magic.\n')
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
            }, prompt:'Enter ' + ['wand', 'scroll', 'spell', 'spell'][$.player.magic - 1] +' (?=list): ', max:2 }
        }
        xvt.app.focus = 'magic'
        return
    }

    function invoke(rpc: active, spell: number) {

    }
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
            }, prompt:'Enter type (?=list): ', max:2 }
        }
        xvt.app.focus = 'poison'
        return
    }

    if ((rpc.toWC + rpc.user.toWC) < Math.trunc($.Weapon.name[rpc.user.weapon].wc / (6 - rpc.user.poison))) {
        let vial = $.dice(rpc.user.poisons.length) - 1
        if (vial) apply(rpc, vial)
    }

    function apply(rpc: active, vial: number) {
        let wc = $.Weapon.baseWC(rpc.user.weapon)
        let p = Math.trunc(rpc.user.poison / 2)
        let t = rpc.user.poison - Math.trunc(p / 2)
        p *= vial
        t *= vial
        if (p > 0 && rpc.user.toWC > 0) rpc.user.toWC = p
        if (t >= 0)
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
    xvt.out(xvt.cyan, 'Weapon: ', xvt.bright, xvt.white, $.player.weapon, $.buff($.player.toWC, $.online.toWC), xvt.nobright)
    xvt.out(xvt.cyan, '   Armor: ', xvt.bright, xvt.white, $.player.armor, $.buff($.player.toAC, $.online.toAC), xvt.nobright)
    xvt.out(xvt.reset, '\n')
}

}

export = Battle
