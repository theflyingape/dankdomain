/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  TAXMAN authored by: Robert Hurst <theflyingape@gmail.com>                *
\*****************************************************************************/

import $ = require('./runtime')
import { Armor, Coin, RealEstate, Ring, Security, Weapon } from '../items'
import { carry, news, pieces, tradein, vt, weapon } from '../lib'
import { PC } from '../pc'
import { input } from '../player'
import { an, dice, int, uint, whole } from '../sys'
import Battle = require('./battle')
import db = require('../db')

module Taxman {

    let tax = new Coin()

    function checkpoint(scratch: bigint): boolean {
        if (scratch > tax.value && !$.access.sysop) {
            vt.profile({
                jpg: 'npc/taxman', handle: $.taxman.user.handle
                , level: $.taxman.user.level, pc: $.taxman.user.pc, effect: 'fadeIn'
            })

            vt.sound('oops', 4)

            vt.out('\n\n', vt.yellow, vt.bright, $.taxman.user.handle, vt.normal, -400)
            vt.outln(', our Master of Coin, looks at your bulging ', pieces(), -1200)
            vt.out(vt.yellow, 'and says, ', vt.blue, vt.bright, '"Time to pay taxes!"', vt.normal, -800)
            vt.out(vt.yellow, '  You check out the burly guards who stand ready\n')
            vt.outln(`to enforce `, vt.bright, `${$.ruler.handle}'${$.ruler.handle.substr(-1) !== 's' ? 's' : ''}`, vt.normal, ` will.\n`, -1600)

            tax.value = scratch - tax.value
            tax = tax.pick(1)
            vt.outln(`The tax will cost you ${carry(tax)}`, -900)

            return true
        }
        return false
    }

    //  tax checkpoint at the bar
    export function bar() {

        tax = new Coin(10n * PC.money($.player.level)).pick(1)

        if (checkpoint($.player.coin.value)) {
            PC.payment(tax.value)
            vt.outln('\nYou really want a drink, so you pay the shakedown.')
            vt.sound('thief', 22)
        }
    }

    //  loan & tax checkpoint at the front gate
    export function cityguards() {

        if ($.access.roleplay) {
            //  do any loan first
            let due = $.player.loan.value
            if (due > 0 && $.player.coin.value > 0) {
                due -= $.player.coin.value
                if (due < 0) {
                    $.player.coin.value = -due
                    $.player.loan.value = 0n
                }
                else
                    $.player.coin.value = 0n
                $.player.bank.value += $.player.coin.value
            }
            if (due > 0 && $.player.bank.value > 0) {
                due -= $.player.bank.value
                if (due < 0) {
                    $.player.bank.value = -due
                    $.player.loan.value = 0n
                }
                else
                    $.player.bank.value = 0n
            }
            $.player.loan.value = due
            //  a Lannister always pays his debts
            if ($.player.loan.value > 9n) {
                vt.outln(vt.green, '\nThe Iron Bank will have its due on your loan: ', carry($.player.loan, 4), -1200)
                vt.beep()
                let interest = new Coin($.player.loan.value * 100n / 5n + 1n)
                $.player.loan.value += interest.value
                $.online.altered = true
                vt.outln('They add an interest charge of ', carry(interest, 4), -1200)
            }
            //  now tax if necessary
            tax.value = 1000n * PC.money($.player.level)
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
                        require('./menu').menu()
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
                                PC.payment(tax.value)
                                vt.outln('You pay the tax.')
                                vt.sound('thief2', 16)
                                require('./menu').menu()
                                return
                            }

                            let l = 0, xhp = uint($.player.hp * ($.player.level - 9) / $.sysop.level)
                            let irs: active[] = []
                            do {
                                let i = irs.push({ user: db.fillUser() }) - 1
                                irs[i].user.sex = 'M'
                                irs[i].user.level = 10 * l + dice(9)
                                irs[i].user.handle = ['Reserve', 'Home', 'City', 'Foot', 'Infantry', 'Cavalry', 'Castle', 'Royal'][i < 7 ? i : 7] + ' Guard'
                                do {
                                    irs[i].user = PC.reroll(irs[i].user, PC.random('player'), irs[i].user.level)
                                } while (irs[i].user.melee < 1 || irs[i].user.melee > 2)

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

                                i = uint($.player.level / 11)
                                if (l < i && dice(i) > 1)
                                    l++
                            } while (xhp > 0)

                            vt.outln(vt.yellow, `The Master of Coin points ${PC.who($.taxman).his}${weapon($.taxman)} at you ... `)
                            vt.sound('ddd', 12)
                            vt.outln(vt.blue, vt.bright, `  "Shall we begin?"`)
                            vt.music('taxman')

                            Battle.engage('Gates', $.online, irs, boss)
                        }, prompt: 'Will you pay the tax (Y/N)? ', cancel: 'Y', enter: 'Y', eol: false, match: /Y|N/i, timeout: 20
                    }
                }
                input('tax', dice(101 - $.player.level) > 1 ? 'y' : 'n')
                return
            }
        }
        else
            vt.music('visit')

        require('./menu').menu()

        function boss() {
            if ($.reason) vt.hangup()
            if (Battle.retreat || Battle.teleported) {
                news(`\tgot schooled on economics`)
                vt.outln(vt.bright, vt.cyan, '\nYou got schooled on economics, and pay homage to the Crown.', -1000)
                $.player.coin.value -= tax.value
                if ($.player.coin.value < 0) {
                    $.player.bank.value += $.player.coin.value
                    $.player.coin.value = 0n
                    if ($.player.bank.value < 0) {
                        $.player.loan.value -= $.player.bank.value
                        $.player.bank.value = 0n
                    }
                }
                require('./menu').menu()
                return
            }

            vt.outln(vt.yellow, '\nThe tax collector ', [
                `${vt.attr('mutters,', vt.bright, vt.blue)} "Good help is hard to find these days..."`,
                `${vt.attr('sighs,', vt.bright, vt.blue)} "If you want a job done right..."`,
                `${vt.attr('swears,', vt.bright, vt.blue)} "That's gonna cost you."`
            ][dice(3) - 1], -900)

            PC.activate($.taxman)
            $.taxman.user.coin = tax
            PC.wearing($.taxman)

            Battle.engage('Taxman', $.online, $.taxman, require('./menu').menu)
        }
    }

}

export = Taxman
