/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  GAMBLING authored by: Robert Hurst <theflyingape@gmail.com>              *
\*****************************************************************************/

import $ = require('../common')
import xvt = require('xvt')

module Gambling
{
	let casino: choices = {
        'B': { description:'Blackjack' },
        'C': { description:'Craps' },
        'G': { description:'Greyhound race' },
        'H': { description:'High card' },
        'I': { description:'Instant Cash machine' },
    	'K': { description:'Keno' },
        'R': { description:'Roulette' },
        'S': { description:'One-armed Bandit' }
	}
	let atm: choices = {
		'D': { },
		'W': { },
		'L': { },
	}

export function menu(suppress = false) {
    xvt.app.form = {
        'menu': { cb:choice, cancel:'q', enter:'?', eol:false }
    }
    xvt.app.form['menu'].prompt = $.display('casino', xvt.Blue, xvt.blue, suppress, casino)
    xvt.app.focus = 'menu'
}

function choice() {
    let suppress = $.player.expert
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isEmpty(casino[choice])) {
        xvt.beep()
        suppress = false
    }

    switch (choice) {
        case 'I':
            if (!$.access.roleplay) break
            xvt.out('\n', xvt.cyan, 'Enter PIN: ', xvt.white)
            for (var i = 0; i < 6; i++) {
                xvt.waste(19 * $.dice(39) + 77)  /*  "Empty it, Bert"  */
                xvt.out('#')
            }
            $.action('bank')
            xvt.out('\n')

			atm['D'] = { description: 'Money in hand: ' + $.player.coin.carry() }
			atm['W'] = { description: 'Money in bank: ' + $.player.bank.carry() }
			atm['L'] = { description: 'Money on loan: ' + $.player.loan.carry() }

			xvt.app.form = {
				'menu': { cb:ATM, cancel:'q', enter:'?', eol:false }
			}
			xvt.app.form['menu'].prompt = $.display('Instant Cash Machine', null, xvt.green, false, atm)
			xvt.app.focus = 'menu'
			return

        case 'Q':
			require('./main').menu($.player.expert)
			return
	}
	menu(suppress)
}

function ATM() {
    let suppress = $.player.expert
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isEmpty(atm[choice])) {
        $.beep()
		xvt.app.refocus()
		return
    }
	xvt.app.form = {
		'coin': { cb:amount, max:24 }
	}

	xvt.out(xvt.reset, '\n')

    switch (choice) {
		case 'D':
			xvt.app.form['coin'].prompt = xvt.attr('Deposit ', xvt.white, '[', xvt.uline, 'MAX', xvt.nouline, '=', $.player.coin.carry(), ']? ')
			xvt.app.focus = 'coin'
			break

        case 'L':
            $.beep()
        case 'Q':
			menu(suppress)
			break

		case 'W':
			xvt.app.form['coin'].prompt = xvt.attr('Withdraw ', xvt.white, '[', xvt.uline, 'MAX', xvt.nouline, '=', $.player.bank.carry(), ']? ')
			xvt.app.focus = 'coin'
			break
	}
}

function amount() {
	if ((+xvt.entry).toString() === xvt.entry) xvt.entry += 'c'
	let action = xvt.app.form['coin'].prompt.split(' ')[0]
	let amount = new $.coins(0)

	switch (action) {
		case 'Deposit':
			amount.value = (/=|max/i.test(xvt.entry)) ? $.player.coin.value : new $.coins(xvt.entry).value
			if (amount.value > 0 && amount.value <= $.player.coin.value) {
				$.player.coin.value -= amount.value
				if ($.player.loan.value > 0) {
					$.player.loan.value -= amount.value
					if ($.player.loan.value < 0) {
						amount.value = -$.player.loan.value
						$.player.loan.value = 0
					}
					else
						amount.value = 0
				}
				$.player.bank.value += amount.value
				$.online.altered = true
				$.beep()
			}
			break

		case 'Withdraw':
			amount.value = (/=|max/i.test(xvt.entry)) ? $.player.bank.value : new $.coins(xvt.entry).value
			if (amount.value > 0 && amount.value <= $.player.bank.value) {
				$.player.bank.value -= amount.value
				$.player.coin.value += amount.value
				$.online.altered = true
				$.beep()
			}
			break
	}

	xvt.entry = 'I'
	choice()
}

}

export = Gambling
