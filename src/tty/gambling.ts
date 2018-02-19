/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  GAMBLING authored by: Robert Hurst <theflyingape@gmail.com>              *
\*****************************************************************************/ 

import {sprintf} from 'sprintf-js'

import $ = require('../common')
import xvt = require('xvt')


module Gambling
{
	let casino: choices = {
        'B': { description:'Blackjack' },
		'C': { description:'Craps' },
        'H': { description:'High Stakes Draw' },
    	'K': { description:'Keno' },
        'S': { description:'Cherry Bomb Slots' }
	}
/*
		'G': { description:'Greyhound race' },
        'R': { description:'Roulette' },
*/

	let game:string
	let max = new $.coins(0)
	let payoff = new $.coins(0)
	let point: number

	interface card {
		face:string
		value:number
		emoji:string
	}
	const card:card[] = [
		{ face:'*Joker*', value:-1, emoji:'\uD83C\uDCBF' },
		{ face:'=Ace=', value:1, emoji:'\uD83C\uDCA1' },
		{ face:'Two', value:2, emoji:'\uD83C\uDCA2' }, { face:'Three', value:3, emoji:'\uD83C\uDCA3' }, { face:'Four', value:4, emoji:'\uD83C\uDCA4' },
		{ face:'Five', value:5, emoji:'\uD83C\uDCA5' }, { face:'Six', value:6, emoji:'\uD83C\uDCA6' }, { face:'Seven', value:7, emoji:'\uD83C\uDCA7' },
		{ face:'Eight', value:8, emoji:'\uD83C\uDCA8' }, { face:'Nine', value:9, emoji:'\uD83C\uDCA9' }, { face:'Ten', value:10, emoji:'\uD83C\uDCAA' },
		{ face:':Jack:', value:10, emoji:'\uD83C\uDCAB' }, { face:'-Queen-', value:10, emoji:'\uD83C\uDCAC' }, { face:'+King+', value:10, emoji:'\uD83C\uDCAE' },
		{ face:'=Ace=', value:1, emoji:'\uD83C\uDCB1' },
		{ face:'Two', value:2, emoji:'\uD83C\uDCB2' }, { face:'Three', value:3, emoji:'\uD83C\uDCB3' }, { face:'Four', value:4, emoji:'\uD83C\uDCB4' },
		{ face:'Five', value:5, emoji:'\uD83C\uDCB5' }, { face:'Six', value:6, emoji:'\uD83C\uDCB6' }, { face:'Seven', value:7, emoji:'\uD83C\uDCB7' },
		{ face:'Eight', value:8, emoji:'\uD83C\uDCB8' }, { face:'Nine', value:9, emoji:'\uD83C\uDCB9' }, { face:'Ten', value:10, emoji:'\uD83C\uDCBA' },
		{ face:':Jack:', value:10, emoji:'\uD83C\uDCBB' }, { face:'-Queen-', value:10, emoji:'\uD83C\uDCBC' }, { face:'+King+', value:10, emoji:'\uD83C\uDCBE' },
		{ face:'=Ace=', value:1, emoji:'\uD83C\uDCC1' },
		{ face:'Two', value:2, emoji:'\uD83C\uDCC2' }, { face:'Three', value:3, emoji:'\uD83C\uDCC3' }, { face:'Four', value:4, emoji:'\uD83C\uDCC4' },
		{ face:'Five', value:5, emoji:'\uD83C\uDCC5' }, { face:'Six', value:6, emoji:'\uD83C\uDCC6' }, { face:'Seven', value:7, emoji:'\uD83C\uDCC7' },
		{ face:'Eight', value:8, emoji:'\uD83C\uDCC8' }, { face:'Nine', value:9, emoji:'\uD83C\uDCC9' }, { face:'Ten', value:10, emoji:'\uD83C\uDCCA' },
		{ face:':Jack:', value:10, emoji:'\uD83C\uDCCB' }, { face:'-Queen-', value:10, emoji:'\uD83C\uDCCC' }, { face:'+King+', value:10, emoji:'\uD83C\uDCCE' },
		{ face:'=Ace=', value:1, emoji:'\uD83C\uDCD1' },
		{ face:'Two', value:2, emoji:'\uD83C\uDCD2' }, { face:'Three', value:3, emoji:'\uD83C\uDCD3' }, { face:'Four', value:4, emoji:'\uD83C\uDCD4' },
		{ face:'Five', value:5, emoji:'\uD83C\uDCD5' }, { face:'Six', value:6, emoji:'\uD83C\uDCD6' }, { face:'Seven', value:7, emoji:'\uD83C\uDCD7' },
		{ face:'Eight', value:8, emoji:'\uD83C\uDCD8' }, { face:'Nine', value:9, emoji:'\uD83C\uDCD9' }, { face:'Ten', value:10, emoji:'\uD83C\uDCDA' },
		{ face:':Jack:', value:10, emoji:'\uD83C\uDCDB' }, { face:'-Queen-', value:10, emoji:'\uD83C\uDCDC' }, { face:'+King+', value:10, emoji:'\uD83C\uDCDE' },
		{ face:'*Joker*', value:-1, emoji:'\uD83C\uDCCF' }
	]
	let deck:number[]
	let pile:number

	interface slot {
		attr: number
		color: number
		emoji: string
	}
	interface slots {
		[key: string]: slot
	}
	const slot: slots = {
		'CHERRY': { attr:xvt.normal, color:xvt.red, emoji:'🍒' },
		'GRAPES': { attr:xvt.normal, color:xvt.magenta, emoji:'🍇' },
		':KIWI:': { attr:xvt.bright, color:xvt.green, emoji:'🥝' },
		'ORANGE': { attr:xvt.normal, color:xvt.yellow, emoji:'🍊' },
		'<BELL>': { attr:xvt.bright, color:xvt.yellow, emoji:'🔔' },
		'=LUCK=': { attr:xvt.normal, color:xvt.green, emoji:'🍀' },
		'*WILD*': { attr:xvt.normal, color:xvt.cyan, emoji:'💎' },
		'@BOMB@': { attr:xvt.faint, color:xvt.white, emoji:'💣' }
	}

	const dial: string[][] = [
		[ '=LUCK=', 'GRAPES', 'CHERRY', '<BELL>', ':KIWI:', 'GRAPES', '@BOMB@', 'CHERRY', 'ORANGE', ':KIWI:', '*WILD*', 'GRAPES', 'CHERRY', '<BELL>', ':KIWI:', 'CHERRY' ],
		[ 'ORANGE', '=LUCK=', 'CHERRY', 'ORANGE', 'GRAPES', 'ORANGE', 'CHERRY', '@BOMB@', '<BELL>', 'ORANGE', 'CHERRY', 'GRAPES', ':KIWI:', 'ORANGE', '*WILD*', 'CHERRY' ],
		[ '<BELL>', '*WILD*', ':KIWI:', 'CHERRY', 'ORANGE', '@BOMB@', 'GRAPES', ':KIWI:', 'CHERRY', '=LUCK=', 'GRAPES', 'CHERRY', ':KIWI:', 'GRAPES', ':KIWI:', 'CHERRY' ]
	]

export function menu(suppress = true) {
	if ($.online.altered) $.saveUser($.online)
	if ($.reason) xvt.hangup()

	$.action('casino')
	xvt.app.form = {
		'menu': { cb:choice, cancel:'q', enter:'?', eol:false }
	}
	xvt.app.form['menu'].prompt = $.display('casino', xvt.Green, xvt.green, suppress, casino)
	xvt.app.focus = 'menu'
	max.value = $.worth($.player.level * $.money($.player.level), $.online.cha)
	max = new $.coins(max.carry(1, true))
}

function choice() {
    if ((game = xvt.entry.toUpperCase()) === 'Q') {
		xvt.out('\n')
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
	if (max.value > $.player.coin.value)
		max.value = $.player.coin.value

	$.action('wager')
	xvt.app.form = {
		'coin': { cb:amount, max:24 }
	}
	xvt.app.form['coin'].prompt = xvt.attr('Bet ', xvt.white, '[', xvt.uline, 'MAX', xvt.nouline, '=', max.carry(), ']? ')
	xvt.app.focus = 'coin'
}

function amount() {
	let ace:number = 0
	xvt.out('\n')

	if ((+xvt.entry).toString() === xvt.entry) xvt.entry += 'c'
	let amount = new $.coins(0)
	if (/=|max/i.test(xvt.entry))
		amount.value = max.value
	else
		amount.value = Math.trunc(new $.coins(xvt.entry).value)
	if (amount.value < 1 || amount.value > $.player.coin.value || amount.value > max.value) {
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
			xvt.out(xvt.green, '\nDealer\'s hand:')
			if ($.player.emulation == 'XT')
				xvt.out(xvt.white, ' \uD83C\uDCA0 ', card[dealer[1]].emoji)
			xvt.out(' '.repeat(8))
			xvt.out(xvt.red, '[', xvt.white, 'DOWN', xvt.red, '] [', xvt.white, card[dealer[1]].face, xvt.red, ']\n')
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

		case 'C':
			xvt.out('Rolling dice for your point ', xvt.faint)
			xvt.waste(100)
			let d1 = $.dice(6), d2 = $.dice(6)
			for (let i = 0; i < d1 + 1; i++) {
				$.sound('click')
				xvt.out('.')
			}
			xvt.waste(100)
			point = d1 + d2
			xvt.out(xvt.normal, xvt.blue, '[',
				xvt.bright, xvt.cyan, d1.toString(),
				xvt.normal, xvt.blue, '] [',
				xvt.bright, xvt.cyan, d2.toString(),
				xvt.normal, xvt.blue, ']')
			xvt.waste(600)
			xvt.out(xvt.white, ' = ', xvt.bright, point.toString(), xvt.reset, '\n')
			xvt.waste(1000)
			if (point == 7 || point == 11) {
				$.sound('cheer')
				payoff.value = 2 * amount.value
				xvt.out('A natural!  You win ', payoff.carry(), '!\n')
				$.player.coin.value += payoff.value + amount.value
				xvt.waste(500)
				break
			}
			if (point == 2 || point == 3 || point == 12) {
				$.sound('boo')
				xvt.out('Crapped out!  You lose.\n')
				xvt.waste(500)
				break
			}

			xvt.out(xvt.clear,
				xvt.cyan, 'Your point to make is: ', xvt.bright, xvt.white, point.toString(),
				xvt.normal, '\n\n',
				'Press RETURN to roll dice and try to make your point\n',
				'or bet on another number for additional payoffs:\n\n',
				'  [2] or [12] pays 35:1\n',
				'  [3] or [11] pays 17:1\n',
				'  [4] or [10] pays 11:1\n',
				'  [5] or  [9] pays  8:1\n',
				'  [6] or  [8] pays  6:1\n',
				'  [7] to break pays 5:1\n'
			)

			$.action('craps')
			xvt.app.form = {
				'baby': { cb: () => {
					xvt.out('\n', xvt.cll)
					if ((+xvt.entry).toString() === xvt.entry) xvt.entry += 'c'
					let side = new $.coins(0)
					if (/=|max/i.test(xvt.entry))
						side.value = max.value
					else
						side.value = $.int(new $.coins(xvt.entry).value)
					if (side.value < 1 || side.value > $.player.coin.value || amount.value > max.value) {
						$.beep()
						side.value = 0
					}
					$.player.coin.value -= side.value
					if (RollDice(baby, side.value)) return
					xvt.app.focus = 'roll'
				}, max:24 },
				'roll': { cb: () => {
					xvt.out('\n', xvt.cll)
					baby = $.int(xvt.entry, true)
					if ($.player.coin.value > 0 && baby > 1 && baby < 13) {
						if (max.value > $.player.coin.value)
							max.value = $.player.coin.value
						xvt.app.form['baby'].prompt = xvt.attr('\x1B[JBet ', xvt.white, '[', xvt.uline, 'MAX', xvt.nouline, '=', max.carry(), ']? ')
						xvt.app.focus = 'baby'
						return
					}
					else
						baby = 0
					if (RollDice()) return
					xvt.app.refocus()
				}, row:13, col:1, prompt:xvt.attr('Roll dice: ', xvt.cll), max:2 }
			}
			let baby = 0
			xvt.app.focus = 'roll'
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
					$.sound(card[deck[--pick]].value > 0 ? 'click' : 'boom', 6)
					xvt.out(' - ', card[deck[pick]].emoji, xvt.bright, xvt.red, ' [', xvt.white, card[deck[pick]].face, xvt.red, ']')
					xvt.out(xvt.reset, '\n')
					xvt.waste(500)

					xvt.out('Dealer picks card #')
					while ((dealer = $.dice(54)) - 1 == pick);
					$.sound(card[deck[--dealer]].value > 0 ? 'click' : 'boom', 6)
					xvt.out((dealer + 1).toString(), ' - ', card[deck[dealer]].emoji, xvt.bright, xvt.red, ' [', xvt.white, card[deck[dealer]].face, xvt.red, ']')
					xvt.out(xvt.reset, '\n\n')
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

		case 'K':
			let picks: number[] = []
			$.action('list')
			xvt.app.form = {
				'point': { cb: () => {
					point = +xvt.entry
					if (point < 1 || point > 10) {
						menu()
						return
					}
					xvt.out(xvt.green, `\n\nKENO PAYOUT for a ${point} spot game:\n\n`)
					xvt.out(xvt.bright, 'MATCH     PRIZE\n', xvt.cyan)
					switch (point) {
						case 1:
							xvt.out('   1         $1\n')
							break
						case 2:
							xvt.out('   2         $9\n')
							break
						case 3:
							xvt.out('   3        $20\n')
							xvt.out('   2          2\n')
							break
						case 4:
							xvt.out('   4        $50\n')
							xvt.out('   3          5\n')
							xvt.out('   2          1\n')
							break
						case 5:
							xvt.out('   5       $400\n')
							xvt.out('   4         10\n')
							xvt.out('   3          2\n')
							break
						case 6:
							xvt.out('   6      $1000\n')
							xvt.out('   5         50\n')
							xvt.out('   4          5\n')
							xvt.out('   3          1\n')
							break
						case 7:
							xvt.out('   7      $4000\n')
							xvt.out('   6         75\n')
							xvt.out('   5         15\n')
							xvt.out('   4          2\n')
							xvt.out('   3          1\n')
							break
						case 8:
							xvt.out('   8      10000\n')
							xvt.out('   7        500\n')
							xvt.out('   6         40\n')
							xvt.out('   5         10\n')
							xvt.out('   4          2\n')
							break
						case 9:
							xvt.out('   9     $25000\n')
							xvt.out('   8       2500\n')
							xvt.out('   7        100\n')
							xvt.out('   6         20\n')
							xvt.out('   5          5\n')
							xvt.out('   4          1\n')
							break
						case 10:
							xvt.out('  10    $100000\n')
							xvt.out('   9       4000\n')
							xvt.out('   8        400\n')
							xvt.out('   7         25\n')
							xvt.out('   6         10\n')
							xvt.out('   5          2\n')
							xvt.out(' none         5\n')
							break
					}
					xvt.out(xvt.reset, '\nodds of winning a prize in this game are 1:', 
						`${[4, 16.6, 6.55, 3.86, 10.33, 6.19, 4.22, 9.79, 6.55, 9.04][point - 1]}\n`)
					xvt.app.focus = 'pick'
				}, prompt:'How many numbers (1-10)? ', max:2 },
				'pick': { cb: () => {
					let pick = +xvt.entry
					if (xvt.entry === '') {
						do {
							pick = $.dice(80)
						} while (picks.indexOf(pick) >= 0)
						xvt.out(`${pick}`)
					}
					if (pick < 1 || pick > 80) {
						$.beep()
						xvt.app.refocus()
						return
					}
					if (picks.indexOf(pick) >= 0) {
						$.beep()
						xvt.app.refocus()
						return
					}
					$.sound('click')
					picks.push(pick)
					if (picks.length == point) {
						xvt.out('\n\n', xvt.bright, xvt.yellow,
							'Here comes those lucky numbers!\n', xvt.reset)
						xvt.waste(500)

						let balls: number[] = []
						let hits = 0
						payoff.value = 0

						for (let i = 0; i < 20; i++) {
							if (i % 5 == 0) xvt.out('\n')
							do {
								pick = $.dice(80)
							} while (balls.indexOf(pick) >= 0)
							if (picks.indexOf(pick) >= 0) {
								hits++
								$.sound('max')
								xvt.out(' *', xvt.bright, xvt.blue, '[',
									xvt.yellow, sprintf('%02d', pick),
									xvt.blue, ']', xvt.reset, '* ')
							}
							else {
								xvt.out(xvt.faint, xvt.cyan, '  [',
									xvt.normal, sprintf('%02d', pick),
									xvt.faint, ']  ', xvt.reset)
							}
							xvt.waste(250)
						}

						xvt.out('\n')
						switch (point) {
							case 1:
								if (hits == 1)
									payoff.value = 2 * amount.value
								break
							case 2:
								if (hits == 2)
									payoff.value = 9 * amount.value
								break
							case 3:
								if (hits == 3)
									payoff.value = 20 * amount.value
								if (hits == 2)
									payoff.value = 2 * amount.value
								break
							case 4:
								if (hits == 4)
									payoff.value = 50 * amount.value
								if (hits == 3)
									payoff.value = 5 * amount.value
								if (hits == 2)
									payoff.value = 1 * amount.value
								break
							case 5:
								if (hits == 5)
									payoff.value = 400 * amount.value
								if (hits == 4)
									payoff.value = 10 * amount.value
								if (hits == 3)
									payoff.value = 2 * amount.value
								break
							case 6:
								if (hits == 6)
									payoff.value = 1000 * amount.value
								if (hits == 5)
									payoff.value = 50 * amount.value
								if (hits == 4)
									payoff.value = 5 * amount.value
								if (hits == 3)
									payoff.value = 1 * amount.value
								break
							case 7:
								if (hits == 7)
									payoff.value = 4000 * amount.value
								if (hits == 6)
									payoff.value = 75 * amount.value
								if (hits == 5)
									payoff.value = 15 * amount.value
								if (hits == 4)
									payoff.value = 2 * amount.value
								if (hits == 3)
									payoff.value = 1 * amount.value
								break
							case 8:
								if (hits == 8)
									payoff.value = 10000 * amount.value
								if (hits == 7)
									payoff.value = 500 * amount.value
								if (hits == 6)
									payoff.value = 40 * amount.value
								if (hits == 5)
									payoff.value = 10 * amount.value
								if (hits == 4)
									payoff.value = 2 * amount.value
								break
							case 9:
								if (hits == 9)
									payoff.value = 25000 * amount.value
								if (hits == 8)
									payoff.value = 2500 * amount.value
								if (hits == 7)
									payoff.value = 100 * amount.value
								if (hits == 6)
									payoff.value = 20 * amount.value
								if (hits == 5)
									payoff.value = 5 * amount.value
								if (hits == 4)
									payoff.value = 1 * amount.value
								break
							case 10:
								if (hits == 10)
									payoff.value = 100000 * amount.value
								if (hits == 9)
									payoff.value = 4000 * amount.value
								if (hits == 8)
									payoff.value = 400 * amount.value
								if (hits == 7)
									payoff.value = 25 * amount.value
								if (hits == 6)
									payoff.value = 10 * amount.value
								if (hits == 5)
									payoff.value = 2 * amount.value
								if (hits == 0)
									payoff.value = 5 * amount.value
								break
						}
						if (payoff.value) {
							$.sound('cheer')
							xvt.out('\nYou win ', payoff.carry(), '!\n')
							$.player.coin.value += payoff.value
							xvt.waste(500)
						}
						else
							$.sound('boo')
						menu()
					}
					else {
						xvt.app.form['pick'].prompt = `Pick #${picks.length + 1} [1-80]: `
						xvt.app.refocus()
					}
				}, prompt: 'Pick #1 [1-80]: ', max:2 }
			}
			xvt.app.focus = 'point'
			return

		case 'S':
			xvt.out(xvt.bright, xvt.blue, '\nSlot Machine Payout Line:', xvt.reset, '\n\n')
			if ($.player.emulation === 'XT') {
				xvt.out(xvt.red,     ' any 2  ', xvt.normal, '🍒 🍒 ', xvt.reset, '🔲    2x     ', xvt.yellow, 'Orange  ', xvt.normal, '🍊 🍊 🍊', xvt.reset, '    50x\n')
				xvt.out(xvt.red,     'Cherry  ', xvt.normal, '🍒 🍒 🍒', xvt.reset, '    5x     ', xvt.bright, xvt.yellow, '<Bell>  ', '🔔 🔔 🔔', xvt.reset, '   100x\n')
				xvt.out(xvt.magenta, 'Grapes  ', xvt.normal, '🍇 🍇 🍇', xvt.reset, '   10x     ', xvt.green,  '=Luck=  ', xvt.normal, '🍀 🍀 🍀', xvt.reset, '   400x\n')
				xvt.out(xvt.bright, xvt.green,   ':Kiwi:  ', '🥝 🥝 🥝', xvt.reset, '   20x     ', xvt.cyan,   '*Wild*  ', xvt.normal, '💎 💎 💎', xvt.reset, '   500x\n')
				xvt.out(xvt.faint,   '@Bomb@  ', xvt.normal, '💣 💣 💣', xvt.reset, '    💀 \n')
			}
			else {
				xvt.out('Any 2 ', xvt.red, 'Cherry', xvt.reset, '  2x     3 ', xvt.yellow, 'Orange  ', xvt.reset, '   50x\n')
				xvt.out('3 ', xvt.red,     'Cherry', xvt.reset, '      5x     3 ', xvt.bright, xvt.yellow, '<Bell>  ', xvt.reset, '  100x\n')
				xvt.out('3 ', xvt.magenta, 'Grapes', xvt.reset, '     10x     3 ', xvt.green, '=Luck=  ', xvt.reset, '  400x\n')
				xvt.out('3 ', xvt.bright, xvt.green,   ':Kiwi:', xvt.reset, '     20x     3 ', xvt.cyan, '*Wild*  ', xvt.reset, '  500x\n')
				xvt.out('3 ', xvt.faint,   '@Bomb@', xvt.reset, '     Die\n')
			}

			xvt.out('\nYou pull its arm and the wheels spin ... ')
			xvt.waste(500)

			let bandit = [ $.dice(16) % 16, $.dice(16) % 16, $.dice(16) % 16 ]
			for (let i = 0; i < 3; i++) {
				for (let spin = $.dice(16) + 16; spin; spin--) {
					xvt.out('-\\|/'[spin % 4], '\x08')
					xvt.waste(20)
					bandit[i] = ++bandit[i] % 16
				}
				$.beep()
				let face = dial[i][bandit[i]]
				xvt.out(xvt.blue, '[', xvt.attr(slot[face].attr, slot[face].color), face)
				if ($.player.emulation === 'XT') xvt.out(` ${slot[face].emoji} `)
				xvt.out(xvt.reset, xvt.blue, '] ')
			}
			xvt.out(xvt.reset, '\n\n')
			$.sound('click', 4)

			let face = [ dial[0][bandit[0]], dial[1][bandit[1]], dial[2][bandit[2]] ]
			payoff.value = 0
			if (face[0] == '*WILD*' && face[1] == '*WILD*' && face[2] == '*WILD*') {
				payoff.value = 500 * amount.value
				for (let i = 0; i < 8; i++) {
					for (let j = 0; j < 8; j++) {
						$.beep()
						xvt.out((i + j) % 2 ? xvt.blink : xvt.noblink)
						xvt.out((i + j) % 8 + 30, 'YOU WIN! ')
						xvt.out(10)
					}
					CherryBomb()
					$.sound('wild', 50)
					xvt.out(xvt.reset, '\n')
				}
			}
			else if ((face[0] == '@BOMB@' || face[0] == '*WILD*')
					&& (face[1] == '@BOMB@' || face[1] == '*WILD*')
					&& (face[2] == '@BOMB@' || face[2] == '*WILD*')) {
				if ($.player.emulation === 'XT') xvt.out ('💀  ')
				xvt.out('You die.\n')
				$.sound('wild')
				$.reason = 'defeated by a one-armed bandit'
				$.logoff()
				return
			}
			else if ((face[0] == '=LUCK=' || face[0] == '*WILD*')
					&& (face[1] == '=LUCK=' || face[1] == '*WILD*')
					&& (face[2] == '=LUCK=' || face[2] == '*WILD*')) {
				payoff.value = 400 * amount.value
				for (let i = 0; i < 8; i++) {
					for (let j = 0; j < 4; j++) {
						$.beep()
						xvt.out((i + j) % 8 + 30, 'YOU WIN! ')
						xvt.out(20)
					}
					CherryBomb()
					$.sound('wild', 50)
					xvt.out(xvt.reset, '\n')
				}
			}
			else if ((face[0] == '<BELL>' || face[0] == '*WILD*')
					&& (face[1] == '<BELL>' || face[1] == '*WILD*')
					&& (face[2] == '<BELL>' || face[2] == '*WILD*')) {
				payoff.value = 100 * amount.value
				for (let i = 0; i < 8; i++) {
					$.beep()
					xvt.out(i % 8 + 30, 'YOU WIN! ')
					xvt.out(25)
				}
				CherryBomb()
				xvt.out(xvt.reset, '\n')
			}
			else if ((face[0] == 'ORANGE' || face[0] == '*WILD*')
					&& (face[1] == 'ORANGE' || face[1] == '*WILD*')
					&& (face[2] == 'ORANGE' || face[2] == '*WILD*')) {
				payoff.value = 50 * amount.value
				$.beep()
				$.music('wild')
				xvt.waste(2500)
			}
			else if ((face[0] == ':KIWI:' || face[0] == '*WILD*')
					&& (face[1] == ':KIWI:' || face[1] == '*WILD*')
					&& (face[2] == ':KIWI:' || face[2] == '*WILD*')) {
				payoff.value = 20 * amount.value
			}
			else if ((face[0] == 'GRAPES' || face[0] == '*WILD*')
					&& (face[1] == 'GRAPES' || face[1] == '*WILD*')
					&& (face[2] == 'GRAPES' || face[2] == '*WILD*')) {
				payoff.value = 10 * amount.value
			}
			else if ((face[0] == 'CHERRY' || face[0] == '*WILD*')
					&& (face[1] == 'CHERRY' || face[1] == '*WILD*')
					&& (face[2] == 'CHERRY' || face[2] == '*WILD*')) {
				payoff.value = 5 * amount.value
			}
			else if ((((face[0] == 'CHERRY' || face[0] == '*WILD*')
					&& ((face[1] == 'CHERRY' || face[1] == '*WILD*') || (face[2] == 'CHERRY' || face[2] == '*WILD*')))
					|| ((face[1] == 'CHERRY' || face[1] == '*WILD*') && (face[2] == 'CHERRY' || face[2] == '*WILD*')))) {
				payoff.value = 2 * amount.value
				if (face[0] == '@BOMB@' || face[1] == '@BOMB@' || face[2] == '@BOMB@') {
					payoff.value = 25 * amount.value
					CherryBomb()
				}
			}

			if (payoff.value) {
				$.sound('cheer')
				xvt.out('You win ', payoff.carry(), '!\n')
				$.player.coin.value += payoff.value + amount.value
				xvt.waste(500)
			}
			else
				$.sound('boo')
		}

	menu()

	function CherryBomb() {
		if ($.player.emulation === 'XT') {
			$.music('cherry')
			xvt.out(xvt.red)
			for (let i = 0; i < 6; i++) {
				xvt.out(' ', xvt.faint)
				for (let j = 0; j < i; j++)
					xvt.out('🍒 ')
				xvt.out(xvt.normal)
				xvt.out('🍒 \r')
				xvt.waste(250)
			}
			xvt.out(xvt.bright, xvt.red, '🍒  CHERRY 🍒  ', xvt.reset, '\n')
			for (let i = 0; i < 4; i++) {
				xvt.out(' ', xvt.faint)
				for (let j = 0; j < i; j++)
					xvt.out('💣 ')
				xvt.out(xvt.normal)
				xvt.out('💣 \r')
				xvt.waste(400)
			}
			xvt.out(xvt.bright, xvt.black, '💣  BOMB!! 💣  ', xvt.reset, '\n')
		}
		else {
			$.beep()
			xvt.out(xvt.bright, xvt.red, 'Cherry ', xvt.black, 'BOMB', xvt.reset, '!!\n')
		}
	}

	function ShowHand(who: number, hand: number[]) {
		let value:number = 0
		ace = 0

		xvt.out(who ? xvt.bright : xvt.reset, xvt.green, ['Dealer', 'Player'][who], '\'s hand:', xvt.white)
		if ($.player.emulation == 'XT')
			for (let i = 0; i < hand.length; i++)
				xvt.out(' ', card[hand[i]].emoji)
		xvt.out(' '.repeat(12 - 2 * hand.length))
		for (let i = 0; i < hand.length; i++) {
			xvt.out(xvt.red, '[', xvt.white, card[hand[i]].face, xvt.red, '] ')
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

	function RollDice(baby = 0, side = 0): boolean {
		let d1 = $.dice(6), d2 = $.dice(6)
		xvt.out('\x1B[J', xvt.faint)
		for (let i = 0; i < d1; i++) {
			$.sound('click')
			xvt.out('.')
		}
		xvt.out(xvt.normal, xvt.blue, ' [',
			xvt.bright, xvt.cyan, d1.toString(),
			xvt.normal, xvt.blue, '] [',
			xvt.bright, xvt.cyan, d2.toString(),
			xvt.normal, xvt.blue, ']')
		$.beep()
		xvt.out(xvt.white, ' = ', xvt.bright, (d1 + d2).toString(), xvt.reset, '\n')
		if (baby && d1 + d2 !== baby) {
			$.sound('boo')
			xvt.out('You lose on the side bet.\n')
		}
		if (d1 + d2 == baby) {
			baby = (baby == 2 || baby == 12) ? 35
				: (baby == 3 || baby == 11) ? 17
				: (baby == 4 || baby == 10) ? 11
				: (baby == 5 || baby == 9) ? 8
				: (baby == 6 || baby == 8) ? 6
				: 5
			$.sound('cheer')
			payoff.value = side * baby
			xvt.out('You make your side bet!  You win ', payoff.carry(), '!\n')
			$.player.coin.value += payoff.value
		}
		xvt.waste(1000)
		if (d1 + d2 == 7) {
			$.sound('boo')
			xvt.out('Crapped out!  You lose on your point.\n')
			xvt.waste(500)
			menu()
			return true
		}
		if (d1 + d2 == point) {
			$.sound('cheer')
			payoff.value = amount.value
			xvt.out('You make your point!  You win ', payoff.carry(), '!\n')
			$.player.coin.value += payoff.value + amount.value
			xvt.waste(500)
			menu()
			return true
		}
		return false
	}
}

function shuffle(jokers = false) {
	deck = [ 0,
		1,2,3,4,5,6,7,8,9,10,11,12,13,
		14,15,16,17,18,19,20,21,22,23,24,25,26,
		27,28,29,30,31,32,33,34,35,36,37,38,39,
		40,41,42,43,44,45,46,47,48,49,50,51,52,
		53 ]
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
