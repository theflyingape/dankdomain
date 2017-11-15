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
		'L': { }
	}
	let pin: boolean

	interface card {
		face:string
		value:number
	}
	const card:card[] = [
		{ face:'*Joker*', value:-1 }, { face:'=Ace=', value:1 },
		{ face:'Two', value:2 }, { face:'Three', value:3 }, { face:'Four', value:4 },
		{ face:'Five', value:5 }, { face:'Six', value:6 }, { face:'Seven', value:7 },
		{ face:'Eight', value:8 }, { face:'Nine', value:9 }, { face:'Ten', value:10 },
		{ face:'!Jack!', value:10 }, { face:'$Queen$', value:10 }, { face:'&King&', value:10 }
	]
	let deck:number[] = [ 0,
		1,2,3,4,5,6,7,8,9,10,11,12,
		1,2,3,4,5,6,7,8,9,10,11,12,
		1,2,3,4,5,6,7,8,9,10,11,12,
		1,2,3,4,5,6,7,8,9,10,11,12,
		0 ]

export function menu(suppress = true) {
	if ($.online.altered) $.saveUser($.player)
	if ($.reason) xvt.hangup()

	$.action('casino')
	xvt.app.form = {
        'menu': { cb:choice, cancel:'q', enter:'?', eol:false }
    }
    xvt.app.form['menu'].prompt = $.display('casino', xvt.Blue, xvt.blue, suppress, casino)
    xvt.app.focus = 'menu'
	pin = false
}

function choice() {
    let suppress = $.player.expert
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isNotEmpty(casino[choice]))
        if (xvt.validator.isNotEmpty(casino[choice].description)) {
            xvt.out(' - ', casino[choice].description, '\n')
            suppress = true
        }
    else {
		xvt.beep()
		menu(false)
        return
    }

    switch (choice) {
		case 'I':
			if (!$.access.roleplay) break
			if (!pin) {
				xvt.out('\n', xvt.cyan, 'Enter PIN: ', xvt.white)
				for (var i = 0; i < 6; i++) {
					xvt.waste(19 * $.dice(39) + 77)  /*  "Empty it, Bert"  */
					xvt.out('#')
				}
				pin = true
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

	if ($.access.roleplay) {
		Bet()
	}
	else {
		menu(true)
	}
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

function Bet() {
	xvt.out(xvt.reset, '\n')
	$.action('wager')
	xvt.app.form = {
		'coin': { cb:amount, max:24 }
	}
	xvt.app.form['coin'].prompt = xvt.attr('Bet ', xvt.white, '[', xvt.uline, 'MAX', xvt.nouline, '=', $.player.coin.carry(), ']? ')
	xvt.app.focus = 'coin'
}

function amount() {
	if ((+xvt.entry).toString() === xvt.entry) xvt.entry += 'c'
	let action = xvt.app.form['coin'].prompt.split(' ')[0]
	let amount = new $.coins(0)
	if (/=|max/i.test(xvt.entry))
		amount.value = action === 'Withdraw' ? $.player.bank.value : $.player.coin.value
	else {
		amount.value = Math.trunc(new $.coins(xvt.entry).value)
		if (amount.value > 0 && amount.value <= $.player.coin.value)
			$.player.coin.value -= amount.value
	}

	if (amount.value < 1) {
		xvt.beep()
		menu($.player.expert)
		return
	}

	switch (action) {
		case 'Black':
			if (amount.value <= $.player.coin.value) {
				$.player.coin.value -= amount.value
				shuffle()

				xvt.app.form = {
					'draw': { cb: () => {
						
					}, max:1 }
				}
				xvt.app['draw'].prompt = '<H>it, <S>tand'
				xvt.app.focus = 'draw'
				return
			}
			break

		case 'Deposit':
			if (amount.value <= $.player.coin.value) {
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
			xvt.entry = 'I'
			choice()
			break

		case 'Withdraw':
			if (amount.value <= $.player.bank.value) {
				$.player.bank.value -= amount.value
				$.player.coin.value += amount.value
				$.online.altered = true
				$.beep()
			}
			xvt.entry = 'I'
			choice()
			break
	}

	menu($.player.expert)
}

function shuffle() {
	xvt.out('Shuffling the deck ')
	xvt.waste(250)
	let cut = $.dice(6) + 4
	for (let n = 0; n < cut; n++) {
		for(let i = 1; i < 53; i++) {
			let j = $.dice(52)
			;[ deck[i], deck[j] ] = [ deck[j], deck[i] ];
		}
		xvt.out('.')
		xvt.waste(12)
	}
	xvt.out(' Ok.\n\n')
	xvt.waste(250)
}

}

export = Gambling
