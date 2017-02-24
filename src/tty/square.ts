/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  SQUARE authored by: Robert Hurst <theflyingape@gmail.com>                *
\*****************************************************************************/

import {sprintf} from 'sprintf-js'

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

	let credit = new $.coins(0)

	let lo = 0, hi = 0, max = 0
	let want = ''

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
        xvt.out(' - ', square[choice].description, '\n\n')
    else {
        xvt.beep()
        suppress = false
    }

    switch (choice) {
		case 'A':
			if ($.reason) break
			let ac = $.Armor.name[$.player.armor].ac
			xvt.out('You own a class ', $.bracket(ac, false), ' ', $.player.armor, $.buff($.player.toAC, $.online.toAC))
			if (ac) {
				credit.value = $.worth(new $.coins($.Armor.name[$.player.armor].value).value, $.player.cha)
				if ($.player.toAC) credit.value += Math.trunc(credit.value * (ac + $.player.toAC) / ac)
				if ($.online.toAC < 0) credit.value += Math.trunc(credit.value * (ac + $.online.toAC) / ac)
			}
			else
				credit.value = 0
			xvt.out(' worth ', credit.carry(), '\n')

			if (ac == 0 && ($.player.toAC < 0 || $.online.toAC < 0)) {
				xvt.out(xvt.yellow, 'You look like a leper; go get yourself cured.\n')
				suppress = true
				break
			}

			max = $.Armor.merchant.length - 1
			lo = ac + 1
			for (lo > max ? max : lo;
				lo > 1 && $.player.coin.value + credit.value < new $.coins($.Armor.name[$.Armor.merchant[lo]].value).value;
				lo--);

			hi = lo
			for (;
				hi < max && $.player.coin.value + credit.value >= new $.coins($.Armor.name[$.Armor.merchant[hi]].value).value;
				hi++);

			list(choice)
			return

		case 'B':
			if ($.reason) break
			credit.value = $.worth(new $.coins($.RealEstate.name[$.player.realestate].value).value, $.player.cha)
			credit.value += $.worth(new $.coins($.Security.name[$.player.security].value).value, $.player.cha)
			credit.value -= $.player.loan.value
			if (credit.value < 0) credit.value = 0

			bank['D'] = { description: 'Money in hand: ' + $.player.coin.carry() }
			bank['W'] = { description: 'Money in bank: ' + $.player.bank.carry() }
			bank['L'] = { description: 'Money on loan: ' + $.player.loan.carry() }

			xvt.app.form = {
				'menu': { cb:Bank, cancel:'q', enter:'?', eol:false }
			}
			xvt.app.form['menu'].prompt = $.display('Welcome to Ye Olde Stone Bank', null, xvt.green, false, bank)
			xvt.app.focus = 'menu'
			return

		case 'G':
            require('./arena').menu($.player.expert)
            return

		case 'H':
			if ($.reason) break
			if ($.Armor.name[$.player.armor].ac == 0 && ($.online.toAC < 0 || $.player.toAC < 0)) {
				credit = new $.coins(($.online.toAC + $.player.toAC) + 's')
				xvt.app.form = {
					'skin': { cb:() => {
						if (/Y/i.test(xvt.entry)) {
							$.online.toAC = 0
							$.player.toAC = 0
							if ($.player.coin.value > 0) {
								$.player.coin.value -= credit.value
								if ($.player.coin.value < 0) {
									$.player.loan.value += $.player.coin.value
									$.player.coin.value = 0
								}
							}
						}
						menu(true)
						return
					}, cancel:'Y', enter:'Y', max:1, eol:false, match:/Y|N/i }
				}
				xvt.app.form['skin'].prompt = 'Heal your skin for ' + credit.carry() + ' (Y/N)? '
				xvt.app.focus = 'skin'
				return
			}
			if ($.Weapon.name[$.player.weapon].wc == 0 && ($.online.toWC < 0 || $.player.toWC < 0)) {
				credit = new $.coins(($.online.toWC + $.player.toWC) + 's')
				xvt.app.form = {
					'hands': { cb:() => {
						if (/Y/i.test(xvt.entry)) {
							$.online.toWC = 0
							$.player.toWC = 0
							if ($.player.coin.value > 0) {
								$.player.coin.value -= credit.value
								if ($.player.coin.value < 0) {
									$.player.loan.value += $.player.coin.value
									$.player.coin.value = 0
								}
							}
						}
						menu(true)
						return
					}, cancel:'Y', enter:'Y', max:1, eol:false, match:/Y|N/i }
				}
				xvt.app.form['hands'].prompt = 'Fix your hands for ' + credit.carry() + ' (Y/N)? '
				xvt.app.focus = 'hands'
				return
			}
			hi = $.player.hp - $.online.hp
			if (hi < 1) {
				xvt.out('You don\'t need any hit points.\n\n')
				suppress = true
				break
			}
			xvt.out('Welcome to Butler Hospital.\n\n')
			xvt.out('Hit points cost ', $.player.level, 'each.\n')
			xvt.out('You need ', hi, ' hit points.\n')
			lo = Math.trunc($.player.coin.value / $.player.level)
			xvt.out('You can afford ', lo < hi ? lo.toString() : 'all your', ' hit points.\n')
			if (lo < hi) {
				if ($.player.novice)
					xvt.out('Normally, you would be billed for the remaining ', (hi - lo).toString(), ' hit points.\n')
				else
					xvt.out('You can be billed for the remaining ', (hi - lo).toString(), ' hit points.\n')
			}
			xvt.app.form = {
				'hp': { cb: () => {
					//	TO DO
					menu(true)
					return
				}, max:5 }
			}
			xvt.app.form['hp'].prompt = xvt.attr('How many do you want ', xvt.white, '[MAX=', hi.toString(), ']? ')
			xvt.app.focus = 'hp'
			return

		case 'M':
			xvt.out('The ', xvt.bright, xvt.blue, 'old mage ', xvt.reset)
			max = $.Magic.merchant.length
			for (lo = 1; lo < max; lo++)
				if (!$.Magic.have($.player.spells, lo))
					break
			if (lo == $.Magic.merchant.length || !$.player.magic || $.reason) {
				xvt.out('says, "Get outta here!"\n')
				suppress = true
				break
			}
			for (hi = max; hi > lo; hi--)
				if (! $.Magic.have($.player.spells, hi)
					&& $.player.coin.value >= (
						$.player.magic == 1 ? new $.coins($.Magic.spells[$.Magic.merchant[hi - 1]].wand).value
						: new $.coins($.Magic.spells[$.Magic.merchant[hi - 1]].cost).value))
					break
				xvt.out([ 'offers to sell you a magic wand'
					, 'offers to make you a scroll, for a price'
					, 'offers to teach you a spell, for a price'
					, 'wants to endow you with a spell, for a price'
					][$.player.magic - 1], '.\n'
				)
			list(choice)
			return

		case 'P':
			if ($.reason) break
			if (!$.Access.name[$.player.access].roleplay || $.player.novice) break
			xvt.out('You attempt to pick a passerby\'s pocket... ')
			xvt.waste(1000)
			credit.value = $.dice(Math.trunc(5 *  $.money($.player.level) / $.dice(10)))
			xvt.out('\n\nYou pick somebody\'s pocket and steal ', credit.carry(), '!\n\n')
			xvt.waste(1000)
			if (Math.trunc(16 * $.player.steal + $.player.level / 10 + $.player.dex / 10) < $.dice(100)) {
				xvt.out('A guard catches you and throws you into jail!\n')
				xvt.waste(750)
				xvt.out('You might be released by your next call.\n\n')
				xvt.waste(750)
				$.player.status = 'jail'
				$.reason = 'caught picking a pocket'
				xvt.hangup()
			}
			$.player.coin.value += credit.value
			suppress = false
			break

        case 'Q':
			require('./main').menu($.player.expert)
			return

		case 'R':
			if ($.reason) break
			let re = $.RealEstate.name[$.player.realestate].protection
			xvt.out('You live in a ', $.player.realestate)
			credit.value = $.worth(new $.coins($.RealEstate.name[$.player.realestate].value).value, $.player.cha)
			xvt.out(' worth ', credit.carry(), '\n')

			max = $.RealEstate.merchant.length - 1
			lo = re - $.realestate
			if (lo < 1) lo = 1
			hi = lo
			for (;
				hi < max && $.player.coin.value + credit.value >= new $.coins($.RealEstate.name[$.RealEstate.merchant[hi]].value).value;
				hi++);

			list(choice)
			return

		case 'S':
			if ($.reason) break
			let s = $.Security.name[$.player.security].protection
			xvt.out('You are guarded by a ', $.player.security)
			credit.value = $.worth(new $.coins($.Security.name[$.player.security].value).value, $.player.cha)
			xvt.out(' worth ', credit.carry(), '\n')

			max = $.Security.merchant.length - 1
			lo = s - $.security
			if (lo < 1) lo = 1
			hi = lo
			for (;
				hi < max && $.player.coin.value + credit.value >= new $.coins($.Security.name[$.Security.merchant[hi]].value).value;
				hi++);

			list(choice)
			return

		case 'V':
			xvt.out(xvt.faint, '[... you enter the back door of the shop ...]\n', xvt.reset)
			xvt.out('The ', xvt.bright, xvt.magenta, 'apothecary ', xvt.reset)
			max = $.Poison.merchant.length
			for (lo = 1; lo < max; lo++)
				if (!$.Poison.have($.player.poisons, lo))
					break
			if (lo == $.Poison.merchant.length || !$.player.poison || $.reason) {
				xvt.out('says, "Get outta here!"\n')
				suppress = true
				break
			}
			for (hi = max; hi > lo; hi--)
				if (! $.Poison.have($.player.poisons, hi)
					&& $.player.coin.value >= (
						$.player.poison == 1 ? new $.coins($.Poison.vials[$.Poison.merchant[hi - 1]].vial).value
						: new $.coins($.Poison.vials[$.Poison.merchant[hi - 1]].cost).value))
					break
				xvt.out([ 'scoffs at your apparent lack of skill'
					, 'casts a suspicious look your way'
					, 'offers to sell you his contraband'
					, 'admires your expert eye on his wares'
					][$.player.poison - 1], '.\n'
				)
			list(choice)
			return

		case 'W':
			if ($.reason) break
			let wc = $.Weapon.name[$.player.weapon].wc
			xvt.out('You own a class ', $.bracket(wc, false), ' ', $.player.weapon, $.buff($.player.toWC, $.online.toWC))
			if (wc) {
				credit.value = $.worth(new $.coins($.Weapon.name[$.player.weapon].value).value, $.player.cha)
				if ($.player.toWC) credit.value += Math.trunc(credit.value * (wc + $.player.toWC) / wc)
				if ($.online.toWC < 0) credit.value += Math.trunc(credit.value * (wc + $.online.toWC) / wc)
			}
			else
				credit.value = 0
			xvt.out(' worth ', credit.carry(), '\n')

			if (wc == 0 && ($.player.toWC < 0 || $.online.toWC < 0)) {
				xvt.out(xvt.yellow, 'Your hands are broken; go get them healed.\n')
				suppress = true
				break
			}

			max = $.Weapon.merchant.length - 1
			lo = wc + 1
			for (lo > max ? max : lo;
				lo > 1 && $.player.coin.value + credit.value < new $.coins($.Weapon.name[$.Weapon.merchant[lo]].value).value;
				lo--);

			hi = lo
			for (;
				hi < max && $.player.coin.value + credit.value >= new $.coins($.Weapon.name[$.Weapon.merchant[hi]].value).value;
				hi++);

			list(choice)
			return
	}
	menu(suppress)
}

function Bank() {
    let suppress = $.player.expert
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isEmpty(bank[choice])) {
        xvt.beep()
		xvt.app.refocus()
		return
    }
	xvt.app.form = {
		'coin': { cb:amount, max:24 }
	}

	xvt.out(xvt.reset, '\n')

    switch (choice) {
		case 'D':
			xvt.app.form['coin'].prompt = xvt.attr('Deposit ', xvt.white, '[MAX=', $.player.coin.carry(), ']? ')
			xvt.app.focus = 'coin'
			break

		case 'L':
			if(credit.value < 1) {
				xvt.beep()
				xvt.app.refocus()
				return
			}
			xvt.app.form['coin'].prompt = xvt.attr('Loan ', xvt.white, '[MAX=', credit.carry(), ']? ')
			xvt.app.focus = 'coin'
			break

		case 'R':
			let c = ($.player.level / 5) * ($.player.steal + 1)
			xvt.out('\nYou attempt to sneak into the vault...')
			xvt.waste(2500)

			if ($.dice(100) > ++c) {
				$.player.status = 'jail'
				xvt.out('\n\nA guard catches you and throws you into jail!\n')
				xvt.waste(1500)
				xvt.out('\nYou might be released by your next call.\n\n')
				xvt.waste(1250)
				$.reason = 'caught getting into the vault'
				xvt.hangup()
				return
			}

			let d = $.player.level + 1
			let vault = Math.pow(d, 8) + d * $.dice(90) + d * $.dice(10)
			let carry = new $.coins(vault)
			xvt.out('you steal ', carry.carry(), '!\n')
			xvt.waste(2500)

			xvt.out(xvt.reset, '\n')
			xvt.out('You try to make your way out of the vault...')
			xvt.waste(2500)

			c /= 15 - ($.player.steal * 3)
			if ($.dice(100) > ++c) {
				$.player.status = 'jail'
				xvt.out('something jingles!')
				xvt.waste(1500)
				xvt.out('\n\nA guard laughs as he closes the vault door on you!\n')
				xvt.waste(1500)
				xvt.out('\nYou might be released by your next call.\n\n')
				xvt.waste(1250)
				$.reason = 'caught inside the vault'
				xvt.hangup()
				return
			}

			$.player.coin.value += carry.value
			xvt.out('\n')
			break

		case 'T':
			if (!$.Access.name[$.player.access].sysop) break
			xvt.app.form['coin'].prompt = xvt.attr('Treasury ', xvt.white, '[MAX=', $.player.coin.carry(), ']? ')
			xvt.app.focus = 'coin'
			break

        case 'Q':
			menu(suppress)
			break

		case 'V':
			if (!$.Access.name[$.player.access].sysop) break
			xvt.app.form['coin'].prompt = xvt.attr('Vault ', xvt.white, '[MAX=', $.player.coin.carry(), ']? ')
			xvt.app.focus = 'coin'
			break

		case 'W':
			xvt.app.form['coin'].prompt = xvt.attr('Withdraw ', xvt.white, '[MAX=', $.player.bank.carry(), ']? ')
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

function list(choice: string) {
	xvt.app.form = {
		'start': { cb:listStart, prompt:'Start list at ', max:2 },
		'end': { cb:listEnd, prompt:'Start list at ', max:2 },
		'buy': { cb:buy, prompt:'\nBuy which? ', max:2 },
		'pause': { cb:menu, pause:true }
	}
	want = choice
	xvt.app.form['start'].enter = lo.toString()
	xvt.app.form['start'].prompt = xvt.attr('Start list at ', (lo < 10 && hi > 9) ? ' ' : '', $.bracket(lo, false), ': ')
	xvt.app.form['end'].enter = hi.toString()
	xvt.app.form['end'].prompt = xvt.attr('  End list at ', $.bracket(hi, false), ': ')
	xvt.app.focus = 'start'
}

function listStart() {
	let n = +xvt.entry
	if (n < lo || n > max) {
		xvt.beep()
		xvt.app.refocus()
		return
	}

	lo = n
	xvt.app.focus = 'end'
}

function listEnd() {
	let n = +xvt.entry
	if (n > max) n = max
	if (n < lo) n = lo

	hi = n
	xvt.out('\n')
	for (let i = lo; i <= hi; i++) {
		switch (want) {
			case 'A':
				xvt.out($.bracket(i), sprintf(' %-24s ', $.Armor.merchant[i]))
				xvt.out(new $.coins($.Armor.name[$.Armor.merchant[i]].value).carry())
				break

			case 'M':
				if (!$.Magic.have($.player.spells, i)) {
					xvt.out($.bracket(i), sprintf(' %-24s ', $.Magic.merchant[i - 1]))
					if ($.player.magic == 1)
						xvt.out(new $.coins($.Magic.spells[$.Magic.merchant[i - 1]].wand).carry())
					else
						xvt.out(new $.coins($.Magic.spells[$.Magic.merchant[i - 1]].cost).carry())
				}
				break

			case 'R':
				xvt.out($.bracket(i), sprintf(' %-24s ', $.RealEstate.merchant[i]))
				xvt.out(new $.coins($.RealEstate.name[$.RealEstate.merchant[i]].value).carry())
				break

			case 'S':
				xvt.out($.bracket(i), sprintf(' %-24s ', $.Security.merchant[i]))
				xvt.out(new $.coins($.Security.name[$.Security.merchant[i]].value).carry())
				break

			case 'V':
				if (!$.Poison.have($.player.poisons, i)) {
					xvt.out($.bracket(i), sprintf(' %-24s ', $.Poison.merchant[i - 1]))
					if ($.player.poison == 1)
						xvt.out(new $.coins($.Poison.vials[$.Poison.merchant[i - 1]].vial).carry())
					else
						xvt.out(new $.coins($.Poison.vials[$.Poison.merchant[i - 1]].cost).carry())
				}
				break

			case 'W':
				xvt.out($.bracket(i), sprintf(' %-24s ', $.Weapon.merchant[i]))
				xvt.out(new $.coins($.Weapon.name[$.Weapon.merchant[i]].value).carry())
				break
		}
	}

	xvt.app.focus = 'buy'
}

function buy() {
	if (xvt.entry === '') {
		menu()
		return
	}

	let buy = +xvt.entry
	if (buy < lo || buy > hi) {
		xvt.app.refocus()
		return
	}
	let cost: $.coins
	let item = buy

	switch (want) {
		case 'A':
			cost = new $.coins($.Armor.name[$.Armor.merchant[item]].value)
			if ($.player.coin.value + credit.value >= cost.value) {
				$.player.armor = $.Armor.merchant[item]
				xvt.out(' - ', $.player.armor, '\n')
				$.player.coin.value += credit.value - cost.value
			}
			break

		case 'M':
			item--
			cost = $.player.magic == 1 ? new $.coins($.Magic.spells[$.Magic.merchant[item]].wand)
				:  new $.coins($.Magic.spells[$.Magic.merchant[item]].cost)
			if ($.player.coin.value >= cost.value && !$.Magic.have($.player.spells, buy)) {
				$.Magic.add($.player.spells, buy)
				xvt.out(' - ', $.Magic.merchant[item], '\n')
				$.player.coin.value -= cost.value
			}
			break

		case 'R':
			cost = new $.coins($.RealEstate.name[$.RealEstate.merchant[item]].value)
			if ($.player.coin.value + credit.value >= cost.value) {
				$.player.realestate = $.RealEstate.merchant[item]
				xvt.out(' - ', $.player.realestate, '\n')
				$.player.coin.value += credit.value - cost.value
				if (item == lo && $.realestate) $.realestate--
			}
			break

		case 'S':
			cost = new $.coins($.Security.name[$.Security.merchant[item]].value)
			if ($.player.coin.value + credit.value >= cost.value) {
				$.player.security = $.Security.merchant[item]
				xvt.out(' - ', $.player.security, '\n')
				$.player.coin.value += credit.value - cost.value
				if (item == lo && $.security) $.security--
			}
			break

		case 'V':
			item--
			cost = $.player.poison == 1 ? new $.coins($.Poison.vials[$.Poison.merchant[item]].vial)
				:  new $.coins($.Poison.vials[$.Poison.merchant[item]].cost)
			if ($.player.coin.value >= cost.value && !$.Poison.have($.player.poisons, buy)) {
				$.Poison.add($.player.poisons, buy)
				xvt.out(' - ', $.Poison.merchant[item], '\n')
				$.player.coin.value -= cost.value
			}
			break

		case 'W':
			cost = new $.coins($.Weapon.name[$.Weapon.merchant[buy]].value)
			if ($.player.coin.value + credit.value >= cost.value) {
				$.player.weapon = $.Weapon.merchant[buy]
				xvt.out(' - ', $.player.weapon, '\n')
				$.player.coin.value += credit.value - cost.value
			}
			break
	}

	xvt.app.focus = 'pause'
}

}

export = Square
