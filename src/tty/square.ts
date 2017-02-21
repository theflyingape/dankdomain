/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  SQUARE authored by: Robert Hurst <theflyingape@gmail.com>                *
\*****************************************************************************/

import $ = require('../common')
import db = require('../database')
import xvt = require('xvt')

module Square
{
	let square: choices = {
        'A': { description:'Armoury' },
        'W': { description:'Weapons Shoppe' },
    	'R': { description:'Real Estate' },
        'S': { description:'Security' },
        'M': { description:'Mages Guild' },
        'V': { description:'Visit the Apothecary' },
        'B': { description:'Ye Olde Stone Bank' },
        'H': { description:'Butler Hospital' },
        'P': { description:'Pick pockets' },
        'J': { description:'Jail House' },
        'G': { description:'Goto the arena' }
	}

	let bank: choices = {
		'D': { },
		'W': { },
		'L': { },
		'R': { description: 'Rob the bank' },
		'T': { },
		'V': { }
	}

	let credit: $.coins

export function menu(suppress = false) {
    xvt.app.form = {
        'menu': { cb:choice, cancel:'q', enter:'?', eol:false }
    }
    xvt.app.form['menu'].prompt = $.display('square', xvt.Yellow, xvt.yellow, suppress, square)
    xvt.app.focus = 'menu'
}

function choice() {
    let suppress = $.player.expert
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isNotEmpty(square[choice]))
        xvt.out(choice, ' - ', square[choice].description, '\n')
    else {
        xvt.beep()
        suppress = false
    }

	credit = new $.coins(0)
	credit.value += $.worth(new $.coins($.RealEstate.name[$.player.realestate].cost).value, $.player.cha)
	credit.value += $.worth(new $.coins($.Security.name[$.player.security].cost).value, $.player.cha)
	credit.value -= $.player.loan.value
	if (credit.value < 0) credit.value = 0

    switch (choice) {
		case 'B':
			bank['D'] = { description: 'Money in hand: ' + $.player.coin.carryout(true) }
			bank['W'] = { description: 'Money in bank: ' + $.player.bank.carryout(true) }
			bank['L'] = { description: 'Money on loan: ' + $.player.loan.carryout(true) }
			xvt.app.form = {
				'menu': { cb:Bank, cancel:'q', enter:'?', eol:false }
			}
			xvt.app.form['menu'].prompt = $.display('Welcome to Ye Olde Stone Bank', null, xvt.green, false, bank)
			xvt.app.focus = 'menu'
			return

        case 'Q':
			require('./main').menu($.player.expert)
			return
	}
	menu(suppress)
}

function Bank() {
    let suppress = $.player.expert
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isEmpty(bank[choice])) {
        xvt.beep()
        suppress = false
    }
	xvt.app.form = {
		'coin': { cb:amount, max:24 }
	}

	xvt.out(xvt.reset, '\n')

    switch (choice) {
		case 'D':
			xvt.app.form['coin'].prompt = xvt.attr('Deposit ', xvt.white, '[MAX=', $.player.coin.carryout(true), ']? ')
			xvt.app.focus = 'coin'
			return

		case 'L':
			xvt.app.form['coin'].prompt = xvt.attr('Loan ', xvt.white, '[MAX=', credit.carryout(true), ']? ')
			xvt.app.focus = 'coin'
			return

		case 'R':
			let c = ($.player.level / 5) * $.player.steal + 1
			xvt.out('\nYou attempt to sneak into the vault...')
			xvt.waste(2500)

			if ($.dice(100) > c) {
				$.player.status = 'jail'
				xvt.out('\n\nA guard catches you and throws you into jail!\n')
				xvt.waste(1500)
				xvt.out('\nYou might be released by your next call.\n\n')
				xvt.waste(1250)
				$.reason = 'caught getting into the vault'
				$.logoff()
			}

			let d = $.player.level + 1
			let vault = Math.pow(d, 8) + d * $.dice(90) + d * $.dice(10)
			let carry = new $.coins(vault)
			xvt.out('you steal ', carry.carryout(true), '!\n')
			xvt.waste(2500)

			xvt.out(xvt.reset, '\n')
			xvt.out('You try to make your way out of the vault...')
			xvt.waste(2500)

			c /= 9 - ($.player.steal + 1)
			if ($.dice(100) > ++c) {
				$.player.status = 'jail'
				xvt.out('something jingles!')
				xvt.waste(1500)
				xvt.out('\n\nA guard laughs as he closes the vault door on you!\n')
				xvt.waste(1500)
				xvt.out('\nYou might be released by your next call.\n\n')
				xvt.waste(1250)
				$.reason = 'caught inside the vault'
				$.logoff()
			}

			$.player.coin.value += carry.value
			xvt.out('\n')
			break

        case 'Q':
			menu($.player.expert)
			return
		
		case 'W':
			xvt.app.form['coin'].prompt = xvt.attr('Withdraw ', xvt.white, '[MAX=', $.player.bank.carryout(true), ']? ')
			xvt.app.focus = 'coin'
			return
	}
	menu(suppress)
}

function amount() {
	if ((+xvt.entry).toString() === xvt.entry) xvt.entry += 'c'
	let action = xvt.app.form['coin'].prompt.split(' ')[0]
	let amount = new $.coins(0)

	switch (action) {
		case 'Deposit':
			amount.value = (/max/i.test(xvt.entry)) ? $.player.coin.value : new $.coins(xvt.entry).value
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
				xvt.beep()
			}
			break

		case 'Loan':
			amount.value = (/max/i.test(xvt.entry)) ? credit.value : new $.coins(xvt.entry).value
			if (amount.value > 0 && amount.value <= credit.value) {
				$.player.loan.value += amount.value
				$.player.coin.value += amount.value
				xvt.beep()
			}
			break

		case 'Withdraw':
			amount.value = (/max/i.test(xvt.entry)) ? $.player.bank.value : new $.coins(xvt.entry).value
			if (amount.value > 0 && amount.value <= $.player.bank.value) {
				$.player.bank.value -= amount.value
				$.player.coin.value += amount.value
				xvt.beep()
			}
			break
	}

	xvt.entry = 'B'
	choice()
}

}

export = Square
