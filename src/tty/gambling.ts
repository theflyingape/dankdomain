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
        'H': { description:'High Stakes Draw' },
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
	let deck:number[]
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
    if ((game = xvt.entry.toUpperCase()) === 'Q') {
		require('./main').menu($.player.expert)
		return
	}

	if (xvt.validator.isNotEmpty(casino[game]))
        if (xvt.validator.isNotEmpty(casino[game].description)) {
			xvt.out(' - ', casino[game].description, '\n')
			if ($.access.roleplay) {
				Bet()
				return
			}
		}
	menu(false)
}

function Bet() {
	$.action('wager')
	xvt.app.form = {
		'coin': { cb:amount, max:24 }
	}
	xvt.app.form['coin'].prompt = xvt.attr('Bet ', xvt.white, '[', xvt.uline, 'MAX', xvt.nouline, '=', $.player.coin.carry(), ']? ')
	xvt.app.focus = 'coin'
}

function amount() {
	let ace:number = 0
	xvt.out('\n')

	if ((+xvt.entry).toString() === xvt.entry) xvt.entry += 'c'
	let amount = new $.coins(0)
	if (/=|max/i.test(xvt.entry))
		amount.value = $.player.coin.value
	else
		amount.value = Math.trunc(new $.coins(xvt.entry).value)
	if (amount.value < 1 || amount.value > $.player.coin.value) {
		xvt.beep()
		menu($.player.expert)
		return
	}

	$.player.coin.value -= amount.value

	switch (game) {
		case 'B':
			shuffle()

			let player:number[] = []
			let myhand:number
			let dealer:number[] = []
			let value:number

			player.push(deck[pile++])
			dealer.push(deck[pile++])
			player.push(deck[pile++])
			dealer.push(deck[pile++])
			xvt.out(xvt.green, '\nDealer\'s hand: ',
				xvt.red, '[', xvt.white, 'DOWN', xvt.red, '] ',
				xvt.red, '[', xvt.white, card[dealer[1]].face, xvt.red, ']\n')
			myhand = ShowHand(1, player)

			if (myhand == 21) {
				$.sound('cheer')
				payoff.value = 2 * amount.value
				xvt.out(xvt.bright, xvt.cyan, '\nBlackjack!!\n\n', xvt.reset)
				xvt.waste(1000)

				value = ShowHand(0, dealer)
				if (value == 21) {
					$.sound('boo')
					xvt.out('\nDealer has Blackjack!  You\'re a loser.\n')
					xvt.waste(1000)
				}
				else {
					xvt.out('\nYou win ', payoff.carry(), '!\n')
					$.player.coin.value += payoff.value + amount.value
				}
				break
			}

			$.action('blackjack')
			xvt.app.form = {
				'draw': { cb: () => {
					xvt.out('\n\n')
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
								xvt.out('You bust!\n')
								xvt.entry = 'S'
								amount.value = 0
							}
							else if (player.length == 5) {
								$.sound('cheer')
								payoff.value = 2 * amount.value
								xvt.out('Five card charley!  You win ', payoff.carry(), '!\n')
								$.player.coin.value += payoff.value + amount.value
								menu()
								return
							}
							else if (myhand == 21)
								xvt.entry = 'S'
							else if (xvt.entry !== 'S') {
								xvt.app.refocus()
								return
							}
							xvt.out('\n')
							break
					}
					if (/S/i.test(xvt.entry)) {
						while ((value = ShowHand(0, dealer)) < 17 && amount.value) {
							dealer.push(deck[pile++])
							xvt.waste(1000)
						}
						xvt.out('\n')
						if (amount.value) {
							if (value > 21) {
								$.sound('cheer')
								payoff.value = amount.value
								xvt.out('Dealer breaks!  You win ', payoff.carry(), '!\n')
								$.player.coin.value += payoff.value + amount.value
							}
							else if (myhand > value) {
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
								xvt.out('You tie.  It\'s a push.\n')
								$.player.coin.value += amount.value
							}
						}
						menu()
					}
				}, eol:false, max:1 }
			}
			xvt.app.form['draw'].prompt = xvt.attr($.bracket('H', false), xvt.cyan, 'it, ',
				$.bracket('S', false), xvt.cyan,'tand')
			xvt.app.form['draw'].match = /H|S/i
			if ($.player.coin.value >= amount.value && (ace > 0 || myhand < 12)) {
				xvt.app.form['draw'].prompt += xvt.attr(', ', $.bracket('D', false), xvt.cyan, 'ouble down')
				xvt.app.form['draw'].match = /D|H|S/i
			}
			xvt.app.form['draw'].prompt += ': '
			xvt.app.focus = 'draw'
			return

		case 'H':
			shuffle(true)

			$.action('list')
			xvt.app.form = {
				'pick': { cb: () => {
					let dealer: number
					let pick = +xvt.entry
					if (isNaN(pick) || pick < 1 || pick > 54) {
						xvt.out(' ?? ')
						xvt.app.refocus()
						return
					}
					$.sound(card[deck[--pick]].value ? 'click' : 'boom', 5)
					xvt.out(' - ', xvt.bright,
						xvt.red, '[', xvt.white, card[deck[pick]].face, xvt.red, ']',
						xvt.reset, '\n'
					)
					xvt.waste(500)

					xvt.out('Dealer picks card #')
					while ((dealer = $.dice(54) - 1) == pick);
					$.sound(card[deck[dealer]].value > 0 ? 'click' : 'boom', 6)
					xvt.out(dealer.toString(), ' - ',
						xvt.red, '[', xvt.white, card[deck[dealer]].face, xvt.red, ']',
						xvt.reset, '\n\n'
					)
					xvt.waste(500)

					if (card[deck[pick]].value > card[deck[dealer]].value) {
						$.sound('cheer')
						payoff.value = amount.value * (card[deck[dealer]].value > 0
							? Math.trunc((card[deck[pick]].value - card[deck[dealer]].value - 1) / 4) + 1
							: 25
						)
						xvt.out('You win ', payoff.carry(), '!\n')
						$.player.coin.value += payoff.value + amount.value
					}
					else if (card[deck[pick]].value < card[deck[dealer]].value) {
						if (card[deck[pick]].value < 0) {
							xvt.out('The joke is on you.\n\n')
							$.sound('oops', 12)
							xvt.out(xvt.bright, xvt.yellow, 'You die laughing.\n', xvt.reset)
							$.sound('laugh', 24)
							$.reason = 'died laughing'
							xvt.hangup()
						}
						$.sound('boo')
						xvt.out('You lose.\n')
					}
					else {
						xvt.out('You tie.  It\'s a push.\n')
						$.player.coin.value += amount.value
					}
					xvt.waste(500)
					menu()
				}, prompt:'Pick a card (1-54)? ', max:2 }
			}
			xvt.app.focus = 'pick'
			return
	}

	menu()

	function ShowHand(who: number, hand: number[]) {
		let value:number = 0
		ace = 0

		xvt.out(who ? xvt.bright : xvt.reset, xvt.green, ['Dealer', 'Player'][who], '\'s hand: ', xvt.red)
		for (let i = 0; i < hand.length; i++) {
			xvt.out('[', xvt.white, card[hand[i]].face, xvt.red, '] ')
			value += card[hand[i]].value
			if (card[hand[i]].value == 1)
					ace++
		}
		for (let i = 0; i < ace && value + 10 < 22; i++)
				value += 10
		xvt.out(xvt.reset, `= ${value}\n`)
		xvt.waste(500)
		return(value)
	}
}

function shuffle(jokers = false) {
	deck = [ 0,
		1,2,3,4,5,6,7,8,9,10,11,12,13,
		1,2,3,4,5,6,7,8,9,10,11,12,13,
		1,2,3,4,5,6,7,8,9,10,11,12,13,
		1,2,3,4,5,6,7,8,9,10,11,12,13,
		0 ]
	xvt.out(xvt.faint, '\nShuffling a new deck ')
	xvt.waste(250)
	let cut = $.dice(6) + 4
	for (let n = 0; n < cut; n++) {
		if (jokers)
			for(let i = 0; i < 54; i++) {
				let j = $.dice(54) - 1
				;[ deck[i], deck[j] ] = [ deck[j], deck[i] ];
			}
		else
			for(let i = 1; i < 53; i++) {
				let j = $.dice(52)
				;[ deck[i], deck[j] ] = [ deck[j], deck[i] ];
			}
		xvt.out('.')
		xvt.waste(20)
	}
	xvt.out(' Ok.\n', xvt.reset)
	xvt.waste(250)
	pile = 1
}

}

export = Gambling
