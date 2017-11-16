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

	let game:string
	let payoff = new $.coins(0)

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
	let pile:number

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
    game = xvt.entry.toUpperCase()
    if (xvt.validator.isNotEmpty(casino[game]))
        if (xvt.validator.isNotEmpty(casino[game].description)) {
            xvt.out(' - ', casino[game].description, '\n')
            suppress = true
        }
    else {
		xvt.beep()
		menu(false)
        return
    }

    switch (game) {
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

function ShowHand(who: number, hand: number[]) {
	let ace:number = 0
	let value:number = 0

	xvt.out('\n', xvt.green, ['Dealer', 'Player'][who], '\'s hand: ', xvt.bright, xvt.red)
	for (let i = 0; i < hand.length; i++) {
		xvt.out('[', xvt.white, card[hand[i]].face, xvt.red, '] ')
		value += card[hand[i]].value < 11 ? card[hand[i]].value : card[hand[i]].value != 14 ? 10 : 1
		if (card[hand[i]].value == 1)
				ace++
	}
	for (let i = 0; i < ace && value + 10 < 22; i++)
			value += 10
	xvt.out(xvt.reset, `= ${value}\n`)
	xvt.waste(500)
	return(value)
}

function amount() {
	if ((+xvt.entry).toString() === xvt.entry) xvt.entry += 'c'
	let amount = new $.coins(0)
	if (/=|max/i.test(xvt.entry))
		amount.value = game === 'W' ? $.player.bank.value : $.player.coin.value
	else
		amount.value = Math.trunc(new $.coins(xvt.entry).value)
	if (amount.value < 1 || amount.value > $.player.coin.value) {
		xvt.beep()
		menu($.player.expert)
		return
	}

	switch (game) {
		case 'B':
			$.player.coin.value -= amount.value
			shuffle()
			let player:number[] = []
			let myhand:number
			let dealer:number[]
			let value:number

			player.push(deck[pile++])
			dealer.push(deck[pile++])
			player.push(deck[pile++])
			dealer.push(deck[pile++])
			xvt.out(xvt.green, '\nDealer\'s hand: ',
				xvt.red, '[', xvt.white, 'DOWN', xvt.red, '] ',
				xvt.red, '[', xvt.white, card[dealer[1]].face, xvt.red, ']')
			myhand = ShowHand(1, player)

			if (myhand == 21) {
				$.sound('cheer')
				payoff.value = 2 * amount.value
				xvt.out('\nBlackjack!  You win ', payoff.carry(), '!\n')
				xvt.waste(1000)

				value = ShowHand(0, dealer)
				if (value == 21) {
					$.player.coin.value -= amount.value
					$.sound('boo')
					xvt.out('\nDealer has Blackjack!  You\'re a loser.\n')
					xvt.waste(1000)
				}
				else
					$.player.coin.value += payoff.value
				break
			}

			$.action('blackjack')
			xvt.app.form = {
				'draw': { cb: () => {
					switch (xvt.entry.toUpperCase()) {
						case 'D':
							$.player.coin.value -= amount.value
							amount.value *= 2
							payoff.value = amount.value
							xvt.entry = 'S'
						case 'H':
							player.push(deck[pile++])
							myhand = ShowHand(1, player)
							if (myhand > 21) {
								xvt.out('You bust!')
								xvt.entry = 'S'
								amount.value = 0
							}
							else if (player.length == 5) {
								$.sound('cheer')
								payoff.value = 2 * amount.value
								xvt.out('\nFive card charley!  You win ', payoff.carry(), '!\n')
								xvt.waste(1000)
							}
							else if (myhand == 21)
								xvt.entry = 'S'
							break
					}
					if (/S/i.test(xvt.entry)) {
						while ((value = ShowHand(0, dealer)) < 17 && amount.value) {
							dealer.push(deck[pile++])
							xvt.waste(1000)
						}
						if (value > 21) {
							$.sound('cheer')
							xvt.out('Dealer breaks!  You win ', payoff.carry(), '!\n')
							$.player.coin.value += payoff.value + amount.value
						}
						if (myhand > value) {
							$.sound('cheer')
							payoff.value = amount.value
							xvt.out('You win ', payoff.carry(), '!\n')
							$.player.coin.value += payoff.value + amount.value
						}
						else if (myhand < value) {
							$.sound('boo')
							xvt.out('You lose.\n')
						}
						else {
							xvt.out('\nYou tie.  It\'s a push.\n')
							$.player.coin.value += amount.value
						}
						xvt.waste(1000)
					}
				}, eol:false, max:1 }
			}
			xvt.app['draw'].prompt = xvt.attr($.bracket('H', false), xvt.cyan, 'it, ',
				$.bracket('S', false), xvt.cyan,'tand')
			xvt.app['draw'].match = /H|S/i
			if ($.player.coin.value >= amount.value && value < 12) {
				xvt.app['draw'].prompt += xvt.attr($.bracket('D', false), xvt.cyan, 'ouble down')
				xvt.app['draw'].match = /D|H|S/i
			}
			xvt.app['draw'].prompt += ': '
			xvt.app.focus = 'draw'
			return

		case 'D':
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

		case 'W':
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

	menu()
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
	pile = 1
}

}

export = Gambling
