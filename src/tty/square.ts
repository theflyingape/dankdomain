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

	let list: xvt.iField = {
		'start': { cb:listStart, prompt:'Start list at ', max:2 },
		'end': { cb:listEnd, prompt:'Start list at ', max:2 },
		'buy': { cb:buy, prompt:'\nBuy which? ', max:2 },
		'pause': { cb:menu, pause:true }
	}

	let lo, hi, max = 0
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
			let ac = $.Armor.name[$.player.armor].ac
			xvt.out('You own a class ', $.bracket(ac, false), ' ', $.player.armor, $.buff($.player.toAC, $.online.toAC))
			if (ac) {
				credit.value = $.worth(new $.coins($.Armor.name[$.player.armor].value).value, $.player.cha)
				if ($.player.toAC) credit.value += Math.trunc(credit.value * (ac + $.player.toAC) / ac)
				if ($.online.toAC < 0) credit.value += Math.trunc(credit.value * (ac + $.online.toAC) / ac)
			}
			else
				credit.value = 0
			xvt.out(' worth ', credit.carryout(true), '\n')

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

			list['start'].enter = lo.toString()
			list['start'].prompt = xvt.attr('Start list at ', $.bracket(lo, false), ': ')
			list['end'].enter = hi.toString()
			list['end'].prompt = xvt.attr(' End list at ', $.bracket(hi, false), ': ')
			want = choice
			xvt.app.form = list
			xvt.app.focus = 'start'
			return

		case 'B':
			credit.value = $.worth(new $.coins($.RealEstate.name[$.player.realestate].value).value, $.player.cha)
			credit.value += $.worth(new $.coins($.Security.name[$.player.security].value).value, $.player.cha)
			credit.value -= $.player.loan.value
			if (credit.value < 0) credit.value = 0

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

		case 'R':
			let re = $.RealEstate.name[$.player.realestate].protection
			xvt.out('You live in a ', $.player.realestate)
			credit.value = $.worth(new $.coins($.RealEstate.name[$.player.realestate].value).value, $.player.cha)
			xvt.out(' worth ', credit.carryout(true), '\n')

			max = $.RealEstate.merchant.length - 1
			lo = re + 1
			for (lo > max ? max : lo;
				lo > 1 && $.player.coin.value + credit.value < new $.coins($.RealEstate.name[$.RealEstate.merchant[lo]].value).value;
				lo--);

			hi = lo
			for (;
				hi < max && $.player.coin.value + credit.value >= new $.coins($.RealEstate.name[$.RealEstate.merchant[hi]].value).value;
				hi++);

			list['start'].enter = lo.toString()
			list['start'].prompt = xvt.attr('Start list at ', $.bracket(lo, false), ': ')
			list['end'].enter = hi.toString()
			list['end'].prompt = xvt.attr(' End list at ', $.bracket(hi, false), ': ')
			want = choice
			xvt.app.form = list
			xvt.app.focus = 'start'
			return

		case 'S':
			let s = $.Security.name[$.player.security].protection
			xvt.out('You are guarded by a ', $.player.security)
			credit.value = $.worth(new $.coins($.Security.name[$.player.security].value).value, $.player.cha)
			xvt.out(' worth ', credit.carryout(true), '\n')

			max = $.Security.merchant.length - 1
			lo = s + 1
			for (lo > max ? max : lo;
				lo > 1 && $.player.coin.value + credit.value < new $.coins($.Security.name[$.Security.merchant[lo]].value).value;
				lo--);

			hi = lo
			for (;
				hi < max && $.player.coin.value + credit.value >= new $.coins($.Security.name[$.Security.merchant[hi]].value).value;
				hi++);

			list['start'].enter = lo.toString()
			list['start'].prompt = xvt.attr('Start list at ', $.bracket(lo, false), ': ')
			list['end'].enter = hi.toString()
			list['end'].prompt = xvt.attr(' End list at ', $.bracket(hi, false), ': ')
			want = choice
			xvt.app.form = list
			xvt.app.focus = 'start'
			return

		case 'W':
			let wc = $.Weapon.name[$.player.weapon].wc
			xvt.out('You own a class ', $.bracket(wc, false), ' ', $.player.weapon, $.buff($.player.toWC, $.online.toWC))
			if (wc) {
				credit.value = $.worth(new $.coins($.Weapon.name[$.player.weapon].value).value, $.player.cha)
				if ($.player.toWC) credit.value += Math.trunc(credit.value * (wc + $.player.toWC) / wc)
				if ($.online.toWC < 0) credit.value += Math.trunc(credit.value * (wc + $.online.toWC) / wc)
			}
			else
				credit.value = 0
			xvt.out(' worth ', credit.carryout(true), '\n')

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

			list['start'].enter = lo.toString()
			list['start'].prompt = xvt.attr('Start list at ', $.bracket(lo, false), ': ')
			list['end'].enter = hi.toString()
			list['end'].prompt = xvt.attr(' End list at ', $.bracket(hi, false), ': ')
			want = choice
			xvt.app.form = list
			xvt.app.focus = 'start'
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
			xvt.app.form['coin'].prompt = xvt.attr('Deposit ', xvt.white, '[MAX=', $.player.coin.carryout(true), ']? ')
			xvt.app.focus = 'coin'
			break

		case 'L':
			xvt.app.form['coin'].prompt = xvt.attr('Loan ', xvt.white, '[MAX=', credit.carryout(true), ']? ')
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
				$.logoff()
			}

			$.player.coin.value += carry.value
			xvt.out('\n')
			break

		case 'T':
			if (!$.Access.name[$.player.access].sysop) break
			xvt.app.form['coin'].prompt = xvt.attr('Treasury ', xvt.white, '[MAX=', $.player.coin.carryout(true), ']? ')
			xvt.app.focus = 'coin'
			break

        case 'Q':
			menu(suppress)
			break

		case 'V':
			if (!$.Access.name[$.player.access].sysop) break
			xvt.app.form['coin'].prompt = xvt.attr('Vault ', xvt.white, '[MAX=', $.player.coin.carryout(true), ']? ')
			xvt.app.focus = 'coin'
			break

		case 'W':
			xvt.app.form['coin'].prompt = xvt.attr('Withdraw ', xvt.white, '[MAX=', $.player.bank.carryout(true), ']? ')
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

function listStart() {
	lo = +xvt.entry
	if (lo < 1 || lo > max) {
		xvt.app.refocus()
		return
	}
	xvt.app.focus = 'end'
}

function listEnd() {
	hi = +xvt.entry
	if (hi > max) hi = max
	if (hi < lo) {
		xvt.app.refocus()
		return
	}

	xvt.out('\n')
	for (let i = lo; i <= hi; i++) {
		xvt.out($.bracket(i), ' ')
		switch (want) {
			case 'A':
				xvt.out(sprintf('%-24s ', $.Armor.merchant[i]))
				xvt.out(new $.coins($.Armor.name[$.Armor.merchant[i]].value).carryout(true))
				break

			case 'R':
				xvt.out(sprintf('%-24s ', $.RealEstate.merchant[i]))
				xvt.out(new $.coins($.RealEstate.name[$.RealEstate.merchant[i]].value).carryout(true))
				break

			case 'S':
				xvt.out(sprintf('%-24s ', $.Security.merchant[i]))
				xvt.out(new $.coins($.Security.name[$.Security.merchant[i]].value).carryout(true))
				break

			case 'W':
				xvt.out(sprintf('%-24s ', $.Weapon.merchant[i]))
				xvt.out(new $.coins($.Weapon.name[$.Weapon.merchant[i]].value).carryout(true))
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

	switch (want) {
		case 'A':
			cost = new $.coins($.Armor.name[$.Armor.merchant[buy]].value)
			if ($.player.coin.value + credit.value >= cost.value) {
				$.player.armor = $.Armor.merchant[buy]
				xvt.out(' - ', $.player.armor, '\n')
				$.player.coin.value += credit.value - cost.value
			}
			break

		case 'R':
			cost = new $.coins($.RealEstate.name[$.RealEstate.merchant[buy]].value)
			if ($.player.coin.value + credit.value >= cost.value) {
				$.player.realestate = $.RealEstate.merchant[buy]
				xvt.out(' - ', $.player.realestate, '\n')
				$.player.coin.value += credit.value - cost.value
			}
			break

		case 'S':
			cost = new $.coins($.Security.name[$.Security.merchant[buy]].value)
			if ($.player.coin.value + credit.value >= cost.value) {
				$.player.security = $.Security.merchant[buy]
				xvt.out(' - ', $.player.security, '\n')
				$.player.coin.value += credit.value - cost.value
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
