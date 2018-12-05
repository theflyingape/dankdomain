/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  TAXMAN authored by: Robert Hurst <theflyingape@gmail.com>                *
\*****************************************************************************/

import xvt = require('xvt')

import $ = require('../common')
import Battle = require('../battle')


module Taxman
{
    let irs: active[]
    let tax: coins = new $.coins(0)
    $.loadUser($.taxman)

function checkpoint(scratch: number): boolean {

    if (scratch > tax.value) {
        $.loadUser($.taxman)
        $.profile({ png:'player/' + $.taxman.user.pc.toLowerCase() + ($.taxman.user.gender === 'F' ? '_f' : '')
            , handle:$.taxman.user.handle
            , level:$.taxman.user.level, pc:$.taxman.user.pc
        })

        $.sound('oops', 8)
        let p = 'csgp'.indexOf(new $.coins(scratch).amount.split(',')[0].substr(-1))
        let pouch = xvt.attr(xvt.bright, [xvt.red,xvt.cyan,xvt.yellow,xvt.magenta][p]
            , ['copper','silver','gold','platinum'][p], xvt.normal, xvt.yellow)

        xvt.out('\n\n', xvt.yellow, xvt.bright, $.taxman.user.handle, xvt.normal)
        xvt.out(`, our Master of Coin, looks at your bulging ${pouch} pouch\n`)
        xvt.out('and says, ', xvt.bright, xvt.blue, '"Ah, it is time to pay your taxes!"', xvt.normal)
        xvt.out(xvt.yellow, '  You check out the burly\n')
        xvt.outln(`guards who stand ready to enforce ${$.king.handle}'s will.\n`)
        xvt.waste(2500)
        tax.value = scratch - tax.value
        xvt.outln(`The tax will cost you ${tax.carry()}.`)
        xvt.waste(1500)
        return true
    }
    return false
}

//  tax checkpoint at the bar
export function bar() {

    tax.value = 10 * $.money($.player.level)
    if (checkpoint($.player.coin.value)) {
        xvt.outln('\nYou really want a drink, so you pay the tax.')
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
        $.sound('thief', 20)
    }
}

//  tax checkpoint at the front gate
export function cityguards() {

    tax.value = 1000 * $.money($.player.level)
            + $.worth(new $.coins($.RealEstate.name[$.player.realestate].value).value, 35)
            + $.worth(new $.coins($.Security.name[$.player.security].value).value, 15)

    if (checkpoint($.player.coin.value + $.player.bank.value)) {
        xvt.outln(`\nYou weigh the chances with your ${$.player.weapon} against the Crown.`)
        xvt.waste(1500)
        $.action('yn')
        xvt.app.form = {
            'tax': { cb:() => {
                xvt.out('\n\n')
                if (/Y/i.test(xvt.entry)) {
                    xvt.out('You pay the tax.\n')
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

                let l = 0, xhp = $.int($.player.hp * $.player.level / $.sysop.level)
                irs = new Array()
                do {
                    let i = irs.push(<active>{ user:{ id:'', sex:'M' } }) - 1
                    irs[i].user.level = 10 * l + $.dice(9)
                    let title = ['Reserve', 'Home', 'City', 'Foot', 'Infantry', 'Cavalry', 'Treasury', 'Tower', 'Castle', 'Royal' ][i < 10 ? i : 9]
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

                    i = ($.player.level / 11) >>0
                    if (l < i && $.dice(i) > 1)
                        l++
                } while (xhp > 0)

                xvt.outln(`The Master of Coin points ${$.who($.taxman, 'his')}${$.taxman.user.weapon} at you,\n`, xvt.bright, xvt.blue,`  "Shall we begin?"\n`)
                $.sound('ddd', 15)
                $.music('taxman')

                Battle.engage('Gates', $.online, irs, boss)
            }, prompt:'Will you pay the tax (Y/N)? ', cancel:'Y', enter:'Y', eol:false, match:/Y|N/i, timeout:20 }
        }
        xvt.app.focus = 'tax'
        return
    }

    require('./main').menu()

    function boss() {
        if ($.reason) xvt.hangup()
        if (Battle.retreat || Battle.teleported) {
            $.news(`\tgot schooled on economics`)
            xvt.outln(xvt.bright, xvt.cyan, '\nYou got schooled on economics, and pay homage to the Crown.')
            xvt.waste(1000)
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
            `${xvt.attr('mutters', xvt.bright, xvt.blue, "Good help is hard to find these days...")}`,
            `${xvt.attr('sighs, ', xvt.bright, xvt.blue, "If you want a job done right...")}`,
            `${xvt.attr('swears, ', xvt.bright, xvt.blue, "That's gonna cost you.")}`
            ][$.dice(3) - 1])
        xvt.waste(750)

        $.activate($.taxman)
        //$.taxman.sp >>= 1
        //$.taxman.user.id = ''
        $.taxman.user.coin = tax

        if (isNaN(+$.taxman.user.weapon)) xvt.out('\n', $.who($.taxman, 'He'), $.Weapon.wearing($.taxman), '.\n')
        xvt.waste(750)
        if (isNaN(+$.taxman.user.armor)) xvt.out('\n', $.who($.taxman, 'He'), $.Armor.wearing($.taxman), '.\n')
        xvt.waste(750)
        xvt.out('\n')

        Battle.engage('Taxman', $.online, $.taxman, require('./main').menu)
    }
}

}

export = Taxman
