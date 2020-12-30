/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  TAXMAN authored by: Robert Hurst <theflyingape@gmail.com>                *
\*****************************************************************************/

import $ = require('../common')
import Battle = require('../battle')
import xvt = require('@theflyingape/xvt')

module Taxman {

    let irs: active[]
    let tax: coins = new $.coins(0)
    $.loadUser($.taxman)

    function checkpoint(scratch: number): boolean {

        if ($.int(1000 * scratch / tax.value) / 1000 > 1) {
            $.loadUser($.taxman)
            $.profile({
                jpg: 'npc/taxman', handle: $.taxman.user.handle
                , level: $.taxman.user.level, pc: $.taxman.user.pc, effect: 'fadeIn'
            })

            $.sound('oops', 4)
            let pouch = new $.coins(scratch).pieces()

            xvt.out('\n\n', xvt.yellow, xvt.bright, $.taxman.user.handle, xvt.normal, -400)
            xvt.outln(', our Master of Coin, looks at your bulging ', pouch, -1200)
            xvt.out(xvt.yellow, 'and says, ', xvt.blue, xvt.bright, '"Time to pay taxes!"', xvt.normal, -800)
            xvt.out(xvt.yellow, '  You check out the burly guards who stand ready\n')
            xvt.outln(`to enforce `, xvt.bright, `${$.king.handle}'${$.king.handle.substr(-1) !== 's' ? 's' : ''}`, xvt.normal, ` will.\n`, -1600)

            tax.value = scratch - tax.value
            tax = new $.coins(tax.carry(1, true))
            xvt.outln(`The tax will cost you ${tax.carry()}`, -900)

            return true
        }
        return false
    }

    //  tax checkpoint at the bar
    export function bar() {

        tax.value = 10 * $.money($.player.level)

        if (checkpoint($.player.coin.value)) {
            xvt.outln('\nYou really want a drink, so you pay the shakedown.')
            $.beep()
            $.player.coin.value -= tax.value
            if ($.player.coin.value < 0) {
                $.player.bank.value += $.player.coin.value
                $.player.coin.value = 0
                if ($.player.bank.value < 0) {
                    $.player.loan.value -= $.player.bank.value
                    $.player.bank.value = 0
                }
            }
            $.sound('thief', 22)
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
                xvt.outln(xvt.green, '\nYour bank loan ', $.player.loan.carry(), xvt.red, ' is past due.', -1200)
                $.beep()
                let interest = new $.coins($.int($.player.loan.value * .05 + 1))
                $.player.loan.value += interest.value
                $.online.altered = true
                xvt.outln('An interest charge of ', interest.carry(), ' was added.', -1200)
            }
            //  now tax if necessary
            tax.value = 1000 * $.money($.player.level)
                + $.worth(new $.coins($.RealEstate.name[$.player.realestate].value).value, 35)
                + $.worth(new $.coins($.Security.name[$.player.security].value).value, 15)

            if (checkpoint($.player.coin.value + $.player.bank.value)) {
                let exempt = $.Ring.power([], $.player.rings, 'taxes')
                if (exempt.power) {
                    xvt.out('\nYour hand extends to show', xvt.cyan, xvt.bright, $.an(exempt.name), xvt.normal)
                    if ($.player.emulation == 'XT') xvt.out(' ', $.Ring.name[exempt.name].emoji, ' 💍')
                    xvt.outln(' ring', -1200)
                    xvt.out(xvt.yellow, xvt.bright, $.taxman.user.handle, xvt.normal, ' ')
                    if ($.dice(100) < ($.online.cha - 10)) {
                        xvt.outln('nods approval while the guards stand down to let you pass.', -1200)
                        require('./main').menu()
                        return
                    }
                    $.Ring.remove($.player.rings, exempt.name)
                    xvt.outln('confiscates the ring!', -1500)
                }

                xvt.outln(`\nYou weigh the chances with your ${$.PC.weapon()} against the Crown.`, -1500)

                $.action('yn')
                xvt.app.form = {
                    'tax': {
                        cb: () => {
                            xvt.outln('\n')
                            if (/Y/i.test(xvt.entry)) {
                                xvt.outln('You pay the tax.')
                                $.sound('thief2', 16)
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

                            let l = 0, xhp = $.int($.player.hp * ($.player.level - 9) / $.sysop.level, true)
                            irs = new Array()
                            do {
                                let i = irs.push(<active>{ user: { id: '', sex: 'M' } }) - 1
                                irs[i].user.level = 10 * l + $.dice(9)
                                let title = ['Reserve', 'Home', 'City', 'Foot', 'Infantry', 'Cavalry', 'Castle', 'Royal'][i < 7 ? i : 7]
                                irs[i].user.handle = `${title} Guard`
                                do {
                                    $.reroll(irs[i].user, $.PC.random('player'), irs[i].user.level)
                                } while (irs[i].user.melee < 1)

                                let w = $.int(irs[i].user.level / 100 * ($.Weapon.merchant.length - 1))
                                w = w < 2 ? 2 : w >= $.Weapon.merchant.length ? $.Weapon.merchant.length - 1 : w
                                irs[i].user.weapon = $.Weapon.merchant[w]
                                irs[i].user.toWC = $.dice(irs[i].user.poison * w / 4) + 1

                                let a = $.int(irs[i].user.level / 100 * ($.Armor.merchant.length - 1))
                                a = a < 1 ? 1 : a >= $.Armor.merchant.length ? $.Armor.merchant.length - 1 : a
                                irs[i].user.armor = $.Armor.merchant[a]
                                irs[i].user.toAC = $.dice(irs[i].user.magic * a / 4)

                                $.activate(irs[i])
                                xhp -= irs[i].hp

                                i = ($.player.level / 11) >> 0
                                if (l < i && $.dice(i) > 1)
                                    l++
                            } while (xhp > 0)

                            xvt.outln(xvt.yellow, `The Master of Coin points ${$.PC.who($.taxman).his}${$.taxman.user.weapon} at you,\n`, xvt.bright, xvt.blue, `  "Shall we begin?"`)
                            $.sound('ddd', 15)
                            $.music('taxman')

                            Battle.engage('Gates', $.online, irs, boss)
                        }, prompt: 'Will you pay the tax (Y/N)? ', cancel: 'Y', enter: 'Y', eol: false, match: /Y|N/i, timeout: 20
                    }
                }
                xvt.app.focus = 'tax'
                return
            }
        }
        else
            $.music('visit')

        require('./main').menu()

        function boss() {
            if ($.reason) xvt.hangup()
            if (Battle.retreat || Battle.teleported) {
                $.news(`\tgot schooled on economics`)
                xvt.outln(xvt.bright, xvt.cyan, '\nYou got schooled on economics, and pay homage to the Crown.', -1000)
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

            xvt.outln(xvt.yellow, '\nThe tax collector ', [
                `${xvt.attr('mutters,', xvt.bright, xvt.blue)} "Good help is hard to find these days..."`,
                `${xvt.attr('sighs,', xvt.bright, xvt.blue)} "If you want a job done right..."`,
                `${xvt.attr('swears,', xvt.bright, xvt.blue)} "That's gonna cost you."`
            ][$.dice(3) - 1], -900)

            $.activate($.taxman)
            $.taxman.user.coin = tax
            $.PC.wearing($.taxman)

            Battle.engage('Taxman', $.online, $.taxman, require('./main').menu)
        }
    }

}

export = Taxman
