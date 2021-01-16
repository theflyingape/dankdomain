/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  TAXMAN authored by: Robert Hurst <theflyingape@gmail.com>                *
\*****************************************************************************/

import $ = require('../runtime')
import db = require('../db')
import { Coin, Armor, RealEstate, Ring, Security, Weapon } from '../items'
import { PC } from '../pc'
import { reroll } from '../player'
import { an, dice, input, int, money, news, tradein, vt, weapon, wearing, whole } from '../sys'

import Battle = require('../battle')

module Taxman {

    let irs: active[]
    let tax: coins = new Coin(0)
    db.loadUser($.taxman)

    function checkpoint(scratch: number): boolean {

        if (int(1000 * scratch / tax.value) / 1000 > 1) {
            db.loadUser($.taxman)
            vt.profile({
                jpg: 'npc/taxman', handle: $.taxman.user.handle
                , level: $.taxman.user.level, pc: $.taxman.user.pc, effect: 'fadeIn'
            })

            vt.sound('oops', 4)
            let pouch = new Coin(scratch).pieces()

            vt.out('\n\n', vt.yellow, vt.bright, $.taxman.user.handle, vt.normal, -400)
            vt.outln(', our Master of Coin, looks at your bulging ', pouch, -1200)
            vt.out(vt.yellow, 'and says, ', vt.blue, vt.bright, '"Time to pay taxes!"', vt.normal, -800)
            vt.out(vt.yellow, '  You check out the burly guards who stand ready\n')
            vt.outln(`to enforce `, vt.bright, `${$.king.handle}'${$.king.handle.substr(-1) !== 's' ? 's' : ''}`, vt.normal, ` will.\n`, -1600)

            tax.value = scratch - tax.value
            tax = new Coin(tax.carry(1, true))
            vt.outln(`The tax will cost you ${tax.carry()}`, -900)

            return true
        }
        return false
    }

    //  tax checkpoint at the bar
    export function bar() {

        tax.value = 10 * money($.player.level)

        if (checkpoint($.player.coin.value)) {
            vt.outln('\nYou really want a drink, so you pay the shakedown.')
            vt.beep()
            $.player.coin.value -= tax.value
            if ($.player.coin.value < 0) {
                $.player.bank.value += $.player.coin.value
                $.player.coin.value = 0
                if ($.player.bank.value < 0) {
                    $.player.loan.value -= $.player.bank.value
                    $.player.bank.value = 0
                }
            }
            vt.sound('thief', 22)
        }
    }

    //  loan & tax checkpoint at the front gate
    export function cityguards() {

        if ($.access.roleplay) {
            //  do any loan first
            if ($.player.loan.value > 0 && $.player.coin.value > 0) {
                $.player.loan.value -= $.player.coin.value
                if ($.player.loan.value < 0) {
                    $.player.coin.value = -$.player.loan.value
                    $.player.loan.value = 0
                }
                else
                    $.player.coin.value = 0
                $.player.bank.value += $.player.coin.value
            }
            if ($.player.loan.value > 0 && $.player.bank.value > 0) {
                $.player.loan.value -= $.player.bank.value
                if ($.player.loan.value < 0) {
                    $.player.bank.value = -$.player.loan.value
                    $.player.loan.value = 0
                }
                else
                    $.player.bank.value = 0
            }
            //  a Lanister always pay his debt
            if ($.player.loan.value > 9) {
                vt.outln(vt.green, '\nYour bank loan ', $.player.loan.carry(), vt.red, ' is past due.', -1200)
                vt.beep()
                let interest = new Coin(int($.player.loan.value * .05 + 1))
                $.player.loan.value += interest.value
                $.online.altered = true
                vt.outln('An interest charge of ', interest.carry(), ' was added.', -1200)
            }
            //  now tax if necessary
            tax.value = 1000 * money($.player.level)
                + tradein(new Coin(RealEstate.name[$.player.realestate].value).value, 35)
                + tradein(new Coin(Security.name[$.player.security].value).value, 15)

            if (checkpoint($.player.coin.value + $.player.bank.value)) {
                let exempt = Ring.power([], $.player.rings, 'taxes')
                if (exempt.power) {
                    vt.out('\nYour hand extends to show', vt.cyan, vt.bright, an(exempt.name), vt.normal)
                    if ($.player.emulation == 'XT') vt.out(' ', Ring.name[exempt.name].emoji, ' 💍')
                    vt.outln(' ring', -1200)
                    vt.out(vt.yellow, vt.bright, $.taxman.user.handle, vt.normal, ' ')
                    if (dice(100) < ($.online.cha - 10)) {
                        vt.outln('nods approval while the guards stand down to let you pass.', -1200)
                        require('./main').menu()
                        return
                    }
                    Ring.remove($.player.rings, exempt.name)
                    vt.outln('confiscates the ring!', -1500)
                }

                vt.outln(`\nYou weigh the chances with your ${weapon()} against the Crown.`, -1500)

                vt.action('yn')
                vt.form = {
                    'tax': {
                        cb: () => {
                            vt.outln('\n')
                            if (/Y/i.test(vt.entry)) {
                                vt.outln('You pay the tax.')
                                vt.sound('thief2', 16)
                                $.player.coin.value -= tax.value
                                if ($.player.coin.value < 0) {
                                    $.player.bank.value += $.player.coin.value
                                    $.player.coin.value = 0
                                    if ($.player.bank.value < 0) {
                                        $.player.loan.value -= $.player.bank.value
                                        $.player.bank.value = 0
                                    }
                                }
                                require('./main').menu()
                                return
                            }

                            let l = 0, xhp = whole($.player.hp * ($.player.level - 9) / $.sysop.level)
                            irs = new Array()
                            do {
                                let i = irs.push(<active>{ user: { id: '', sex: 'M' } }) - 1
                                irs[i].user.level = 10 * l + dice(9)
                                let title = ['Reserve', 'Home', 'City', 'Foot', 'Infantry', 'Cavalry', 'Castle', 'Royal'][i < 7 ? i : 7]
                                irs[i].user.handle = `${title} Guard`
                                do {
                                    reroll(irs[i].user, PC.random('player'), irs[i].user.level)
                                } while (irs[i].user.melee < 1)

                                let w = int(irs[i].user.level / 100 * (Weapon.merchant.length - 1))
                                w = w < 2 ? 2 : w >= Weapon.merchant.length ? Weapon.merchant.length - 1 : w
                                irs[i].user.weapon = Weapon.merchant[w]
                                irs[i].user.toWC = dice(irs[i].user.poison * w / 4) + 1

                                let a = int(irs[i].user.level / 100 * (Armor.merchant.length - 1))
                                a = a < 1 ? 1 : a >= Armor.merchant.length ? Armor.merchant.length - 1 : a
                                irs[i].user.armor = Armor.merchant[a]
                                irs[i].user.toAC = dice(irs[i].user.magic * a / 4)

                                PC.activate(irs[i])
                                xhp -= irs[i].hp

                                i = ($.player.level / 11) >> 0
                                if (l < i && dice(i) > 1)
                                    l++
                            } while (xhp > 0)

                            vt.outln(vt.yellow, `The Master of Coin points ${PC.who($.taxman).his}${$.taxman.user.weapon} at you,\n`, vt.bright, vt.blue, `  "Shall we begin?"`)
                            vt.sound('ddd', 15)
                            vt.music('taxman')

                            Battle.engage('Gates', $.online, irs, boss)
                        }, prompt: 'Will you pay the tax (Y/N)? ', cancel: 'Y', enter: 'Y', eol: false, match: /Y|N/i, timeout: 20
                    }
                }
                input('tax')
                return
            }
        }
        else
            vt.music('visit')

        require('./main').menu()

        function boss() {
            if ($.reason) vt.hangup()
            if (Battle.retreat || Battle.teleported) {
                news(`\tgot schooled on economics`)
                vt.outln(vt.bright, vt.cyan, '\nYou got schooled on economics, and pay homage to the Crown.', -1000)
                $.player.coin.value -= tax.value
                if ($.player.coin.value < 0) {
                    $.player.bank.value += $.player.coin.value
                    $.player.coin.value = 0
                    if ($.player.bank.value < 0) {
                        $.player.loan.value -= $.player.bank.value
                        $.player.bank.value = 0
                    }
                }
                require('./main').menu()
                return
            }

            vt.outln(vt.yellow, '\nThe tax collector ', [
                `${vt.attr('mutters,', vt.bright, vt.blue)} "Good help is hard to find these days..."`,
                `${vt.attr('sighs,', vt.bright, vt.blue)} "If you want a job done right..."`,
                `${vt.attr('swears,', vt.bright, vt.blue)} "That's gonna cost you."`
            ][dice(3) - 1], -900)

            PC.activate($.taxman)
            $.taxman.user.coin = tax
            wearing($.taxman)

            Battle.engage('Taxman', $.online, $.taxman, require('./main').menu)
        }
    }

}

export = Taxman
