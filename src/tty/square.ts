/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  SQUARE authored by: Robert Hurst <theflyingape@gmail.com>                *
\*****************************************************************************/

import $ = require('../common')
import xvt = require('xvt')
import Battle = require('../battle')
import { sprintf } from 'sprintf-js'

module Square {

	let square: choices = {
		'A': { description: 'Armoury' },
		'W': { description: 'Weapons Shoppe' },
		'R': { description: 'Real Estate' },
		'S': { description: 'Security' },
		'M': { description: 'Mages Guild' },
		'V': { description: 'Visit the Apothecary' },
		'B': { description: 'Bank in Braavos' },
		'H': { description: 'Butler Hospital' },
		'P': { description: 'Pick pockets' },
		'J': { description: 'Jail House' },
		'G': { description: 'Goto the arena' }
	}

	let bank: choices = {
		'D': {},
		'W': {},
		'L': {},
		'R': { description: 'Rob the bank' },
		'T': {},
		'V': {}
	}

	let credit = new $.coins(0)

	let lo = 0, hi = 0, max = 0
	let want = ''

	export function menu(suppress = true) {
		$.action('square')
		xvt.app.form = {
			'menu': { cb: choice, cancel: 'q', enter: '?', eol: false }
		}

		if (!$.player.novice && $.player.level > 1 && ($.player.coin.value > 0 || $.player.poisons.length || ($.player.magic < 2 && $.player.spells.length))
			&& $.dice($.online.cha / 3 + 4 * $.player.steal) == 1) {
			let bump = $.PC.encounter(`AND coward = 0 AND novice = 0 AND (id NOT GLOB '_*' OR id = '_TAX')`
				, $.player.level - 9, $.player.level + 9)
			if (bump.user.id && !bump.user.status) {
				$.beep()
				xvt.outln()
				if (bump.user.id == $.taxman.user.id)
					$.profile({ jpg: 'npc/taxman', handle: $.taxman.user.handle, level: $.taxman.user.level, pc: $.taxman.user.pc, effect: 'fadeInLeft' })
				else
					$.PC.profile(bump)
				xvt.out(xvt.cyan, xvt.faint, `${bump.user.handle} bumps`
					, xvt.normal, ' into you from'
					, xvt.bright, ' out of the shadows'
					, xvt.reset, ' ... ')
				if ($.dice($.online.cha / 9 + 2 * $.player.steal)
					> 2 * $.Ring.power($.player.rings, bump.user.rings, 'steal').power + bump.user.steal)
					xvt.outln('{waves}\n ... and moves along.')
				else {
					let p: number, i: number
					if ($.player.coin.value > 0) {
						let pouch = $.player.coin.amount.split(',')
						p = $.dice(pouch.length) - 1
						i = 'csgp'.indexOf(pouch[p].substr(-1))
						let v = new $.coins(pouch[p])
						bump.user.coin.value += v.value
						$.log(bump.user.id, `\nYou picked ${$.player.handle}'s pouch holding ${v.carry()}!`)
						$.player.coin.value -= v.value
						xvt.outln(xvt.faint, '{sigh}')
						$.sound('oops', 8)
						xvt.outln('Your ', v.pieces(), ' is gone!')
					}
					else if ($.player.poisons.length) {
						xvt.out(xvt.faint, '\nYou hear vials rattle.')
						xvt.waste(800)
						p = $.player.poisons[$.dice($.player.poisons.length) - 1]
						$.Poison.remove($.player.poisons, p)
						$.Poison.add(bump.user.poisons, p)
						$.log(bump.user.id, `\nYou lifted a vial of ${$.Poison.merchant[p - 1]} from ${$.player.handle}!`)
						$.sound('oops', 8)
						xvt.out(xvt.reset, '  Your vial of ')
						if ($.tty == 'web') xvt.out('💀 ')
						xvt.outln(xvt.faint, $.Poison.merchant[p - 1], xvt.reset, ' goes missing!')
					}
					else if ($.player.magic < 3 && $.player.spells.length) {
						xvt.out(xvt.faint, '\nYou hear something rattle.')
						xvt.waste(800)
						p = $.player.spells[$.dice($.player.spells.length) - 1]
						$.Magic.remove($.player.spells, p)
						$.Magic.add(bump.user.spells, p)
						$.log(bump.user.id, `\nYou lifted a  ${$.Magic.merchant[p - 1]} from ${$.player.handle}!`)
						$.sound('oops', 8)
						xvt.outln(xvt.reset, '  Your ', $.Magic.merchant[p - 1], ' magic has disappeared!')
					}
					$.saveUser(bump)
					xvt.waste(800)
				}
				xvt.waste(1600)
				$.animated('fadeOutRight')
			}
		}

		let hints = ''
		if (!suppress) {
			if ($.online.hp < $.player.hp)
				hints += `> You are battle weary.  Heal yourself at the hospital.\n`
			if ($.player.coin.value && $.player.poison && !$.player.poisons.length)
				hints += `> Try buying a poison for your weapon.\n`
			if ($.player.coin.value && $.player.level / 9 > $.Security.name[$.player.security].protection + 1)
				hints += `> Alleviate paranoia from bad luck and thieves with better Security.\n`
			if ($.player.coin.value && $.player.level / 9 > $.RealEstate.name[$.player.realestate].protection + 1)
				hints += `> Increase your standing with the community by moving into a better dwelling.\n`
			if (!$.player.coin.value && $.player.bank.value > 100000 && ($.player.poisons.length || $.player.spells.length))
				hints += `> Carry small pocket change to misdirect thieving of more valuable items\n`
			if ($.dice(10) == 1 && $.player.loan.value && $.player.steal > 1)
				hints += `> Perhaps pick a pocket? Or two?\n`
			if ($.dice(100) == 1 && $.player.loan.value && $.player.ram && $.player.steal)
				hints += `> Try using your ram on the bank for big money.\n`
		}
		xvt.app.form['menu'].prompt = $.display('square', xvt.Yellow, xvt.yellow, suppress, square, hints)
		xvt.app.focus = 'menu'
	}

	function choice() {
		let suppress = false
		let choice = xvt.entry.toUpperCase()
		if (xvt.validator.isNotEmpty(square[choice]))
			if (xvt.validator.isNotEmpty(square[choice].description)) {
				xvt.out(' - ', square[choice].description)
				suppress = $.player.expert
			}
		xvt.outln()

		switch (choice) {
			case 'A':
				if (!$.access.roleplay) break
				let ac = $.Armor.name[$.player.armor].ac
				xvt.out('\nYou own a class ', $.bracket(ac, false), ' ', $.PC.armor())
				if (ac) {
					let cv = new $.coins($.Armor.name[$.player.armor].value)
					credit.value = $.worth(cv.value, $.online.cha)
					if ($.player.toAC) credit.value = $.int(credit.value * (ac + $.player.toAC / ($.player.poison + 1)) / ac)
					if ($.online.toAC < 0) credit.value = $.int(credit.value * (ac + $.online.toAC) / ac)
					if (credit.value > cv.value)
						credit.value = cv.value
				}
				else
					credit.value = 0
				xvt.outln(' worth ', credit.carry())

				if (ac == 0 && ($.player.toAC < 0 || $.online.toAC < 0)) {
					xvt.outln(xvt.yellow, 'You look like a leper; go to the hospital for treatment.')
					break
				}

				max = $.Armor.merchant.length - 1
				lo = $.online.armor.ac - 1
				lo = lo < 1 ? 1 : lo > max ? max - 1 : lo
				for (hi = lo;
					hi < max && $.player.coin.value + credit.value >= new $.coins($.Armor.name[$.Armor.merchant[hi]].value).value;
					hi++);
				if (lo > 1 && lo == hi) lo--
				list(choice)
				return

			case 'B':
				if (!$.access.roleplay) break
				credit.value = $.worth(new $.coins($.RealEstate.name[$.player.realestate].value).value, $.online.cha)
				credit.value += $.worth(new $.coins($.Security.name[$.player.security].value).value, $.online.cha)
				credit.value -= $.player.loan.value
				if (credit.value < 1) credit.value = 0

				$.action('bank')
				bank['D'] = { description: 'Money in hand: ' + $.player.coin.carry(4) }
				bank['W'] = { description: 'Money in bank: ' + $.player.bank.carry(4) }
				bank['L'] = { description: 'Money on loan: ' + $.player.loan.carry(4) }

				xvt.app.form = {
					'menu': { cb: Bank, cancel: 'q', enter: '?', eol: false }
				}
				xvt.app.form['menu'].prompt = $.display('Welcome to the Iron Bank', null, xvt.green, false, bank)
				xvt.app.focus = 'menu'
				return

			case 'G':
				$.action('clear')
				require('./arena').menu($.player.expert)
				return

			case 'H':
				if (!$.access.roleplay) break
				if ($.Armor.name[$.player.armor].ac == 0 && ($.online.toAC < 0 || $.player.toAC < 0)) {
					credit = new $.coins(Math.abs($.online.toAC + $.player.toAC) * $.money($.player.level) + 1)
					$.action('yn')
					xvt.app.form = {
						'skin': {
							cb: () => {
								xvt.outln('\n')
								if (/Y/i.test(xvt.entry)) {
									$.sound('click')
									$.online.toAC = 0
									$.player.toAC = 0
									$.player.coin.value -= credit.value
									if ($.player.coin.value < 0) {
										$.player.bank.value += $.player.coin.value
										$.player.coin.value = 0
										if ($.player.bank.value < 0) {
											$.player.loan.value -= $.player.bank.value
											$.player.bank.value = 0
										}
									}
									$.online.altered = true
								}
								Battle.yourstats()
								menu()
								return
							}, cancel: 'Y', enter: 'Y', max: 1, eol: false, match: /Y|N/i, timeout: 10
						}
					}
					xvt.app.form['skin'].prompt = 'Heal your skin for ' + credit.carry() + ' (Y/N)? '
					xvt.app.focus = 'skin'
					return
				}
				if ($.Weapon.name[$.player.weapon].wc == 0 && ($.online.toWC < 0 || $.player.toWC < 0)) {
					credit = new $.coins(Math.abs($.online.toWC + $.player.toWC) * $.money($.player.level) + 1)
					$.action('yn')
					xvt.app.form = {
						'hands': {
							cb: () => {
								xvt.outln('\n')
								if (/Y/i.test(xvt.entry)) {
									$.sound('click')
									$.online.toWC = 0
									$.player.toWC = 0
									$.player.coin.value -= credit.value
									if ($.player.coin.value < 0) {
										$.player.bank.value += $.player.coin.value
										$.player.coin.value = 0
										if ($.player.bank.value < 0) {
											$.player.loan.value -= $.player.bank.value
											$.player.bank.value = 0
										}
									}
									$.online.altered = true
								}
								Battle.yourstats()
								menu()
								return
							}, cancel: 'Y', enter: 'Y', max: 1, eol: false, match: /Y|N/i, timeout: 10
						}
					}
					xvt.app.form['hands'].prompt = 'Fix your hands for ' + credit.carry() + ' (Y/N)? '
					xvt.app.focus = 'hands'
					return
				}
				hi = $.player.hp - $.online.hp
				if (hi < 1) {
					$.beep()
					xvt.outln(`\nYou don't need any hit points.`)
					break
				}
				xvt.outln('\nWelcome to Butler Hospital.\n')
				xvt.outln('Hit points cost ', xvt.bright, $.player.level.toString(), xvt.normal, ' each.')
				xvt.outln('You need ', xvt.bright, hi.toString(), xvt.normal, ' hit points.')
				lo = Math.trunc($.player.coin.value / $.player.level)
				xvt.outln('You can afford '
					, xvt.bright, lo < hi ? lo.toString() : 'all your', xvt.normal, ' hit points.')
				if (lo < hi) {
					if ($.player.novice)
						xvt.out('Normally, you would be billed for the remaining ')

					else
						xvt.out('You can be billed for the remaining ')
					xvt.outln(xvt.bright, (hi - lo).toString(), xvt.normal, ' hit points.')
				}
				$.action('listall')
				xvt.app.form = {
					'hp': {
						cb: () => {
							xvt.outln()
							let buy = Math.abs(Math.trunc(/=|max/i.test(xvt.entry) ? hi : +xvt.entry))
							if (buy > 0 && buy <= hi) {
								$.player.coin.value -= buy * $.player.level
								if ($.player.coin.value < 0) {
									if (!$.player.novice) $.player.bank.value += $.player.coin.value
									$.player.coin.value = 0
									if ($.player.bank.value < 0) {
										$.player.loan.value -= $.player.bank.value
										$.player.bank.value = 0
									}
								}
								$.online.hp += buy
								$.beep()
								xvt.outln('\nHit points = ', $.online.hp.toString())
							}
							menu()
							return
						}, max: 5
					}
				}
				xvt.app.form['hp'].prompt = xvt.attr('How many do you want ['
					, xvt.white, xvt.uline, 'MAX', xvt.nouline, '=', xvt.bright, hi.toString()
					, xvt.normal, xvt.cyan, ']? ')
				xvt.app.focus = 'hp'
				return

			case 'J':
				if ($.bail) {
					$.profile({ png: 'npc/jailer', effect: 'fadeIn' })
					xvt.outln('\nA deputy greets you in front of the County Jail.')
					xvt.waste(600)
					xvt.outln(`"What `, ['cur', 'knave', 'scum', 'toad', 'villain'][$.dice(5) - 1]
						, ` do you come for, ${$.access[$.player.gender] || $.access[$.player.sex]}?"`)
					Battle.user('Bail', (opponent: active) => {
						if (opponent.user.id == '') {
							menu()
							return
						}
						xvt.outln()
						if (opponent.user.id == $.player.id) {
							opponent.user.id = ''
							xvt.outln(`You can't bail ${$.PC.who(opponent).him}out.`)
							menu()
							return
						}
						if (opponent.user.status !== 'jail') {
							opponent.user.id = ''
							xvt.outln(`${opponent.user.handle} is not in jail.`)
							menu()
							return
						}

						credit.value = $.int($.money(opponent.user.level) * (100 - $.online.cha + 1) / 100 + 1)
						xvt.out(`It will cost you ${credit.carry()} to bail out ${opponent.user.handle}.\n`)
						if ($.player.coin.value < credit.value) {
							menu()
							return
						}

						$.action('ny')
						xvt.app.form = {
							'pay': {
								cb: () => {
									xvt.outln()
									if (/Y/i.test(xvt.entry)) {
										$.profile({ png: 'payment', effect: 'tada' })
										$.sound('click')
										xvt.outln(`${opponent.user.handle} is set free.`)
										$.player.coin.value -= credit.value
										opponent.user.status = ''
										opponent.user.xplevel = opponent.user.level
										$.run(`UPDATE Players set status='',xplevel=level WHERE id='${opponent.user.id}'`)
										$.log(opponent.user.id, `${$.player.handle} paid ${credit.carry()} to bail you out of jail.\n`)
										$.news(`\t${opponent.user.handle} made bail`)
										$.bail--
									}
									else
										$.action('fadeOut')
									menu()
									return
								}, prompt: 'Will you pay (Y/N)? '
								, cancel: 'N', enter: 'N', max: 1, eol: false, match: /Y|N/i, timeout: 10
							}
						}
						xvt.app.focus = 'pay'
					})
					return
				}
				xvt.out(`The jail house is closed for the day.\n`)
				break

			case 'M':
				xvt.out('\nThe ', xvt.bright, xvt.blue, 'old mage ', xvt.reset)
				max = $.Magic.merchant.length
				for (lo = 1; lo <= max; lo++)
					if (!$.Magic.have($.player.spells, lo))
						break
				if (lo > $.Magic.merchant.length || !$.player.magic || !$.access.roleplay) {
					xvt.outln('says, "Get outta here!"')
					suppress = true
					break
				}
				for (hi = max; hi > lo; hi--)
					if (!$.Magic.have($.player.spells, hi)
						&& $.player.coin.value >= (
							$.player.magic == 1 ? new $.coins($.Magic.spells[$.Magic.merchant[hi - 1]].wand).value
								: new $.coins($.Magic.spells[$.Magic.merchant[hi - 1]].cost).value))
						break
				xvt.out(['offers to sell you a magic wand'
					, 'offers to make you a scroll, for a price'
					, 'offers to teach you a spell, for a price'
					, 'wants to endow you with a spell, for a price'
				][$.player.magic - 1], '.\n'
				)
				list(choice)
				return

			case 'P':
				if (!$.access.roleplay) break
				if ($.player.novice) {
					xvt.out('\nNovice players cannot rob.\n')
					break
				}
				xvt.out(xvt.faint, '\nYou attempt to pick a passerby\'s pocket... ', xvt.reset)
				xvt.waste(1000)

				credit.value = $.dice(6 * $.money($.player.level) / $.dice(10))
				let pocket = $.PC.encounter(`AND novice = 0 AND id NOT GLOB '_*'`).user
				if (pocket.id) {
					$.loadUser(pocket)
					if (pocket.coin.value > 0)
						credit.value += pocket.coin.value
					else {
						pocket.id = ''
						pocket.handle = 'somebody'
					}
					pocket.coin.value = 0
				}
				else
					pocket.handle = 'somebody'

				xvt.outln('\n\nYou pick ', pocket.handle, '\'s pocket and steal ', credit.carry(), '!\n')
				xvt.waste(1000)
				let effort = 100 + $.steal
				effort -= 8 * $.Ring.power([], $.player.rings, 'steal').power
				if ($.int(16 * $.player.steal + $.player.level / 10 + $.online.dex / 10) < $.dice(effort)) {
					$.player.status = 'jail'
					$.reason = `caught picking ${pocket.handle}'s pocket`
					$.action('clear')
					$.profile({ png: 'npc/jailer', effect: 'fadeIn' })
					xvt.outln('A guard catches you and throws you into jail!')
					$.sound('arrested', 20)
					xvt.outln('You might be released by your next call.\n')
					xvt.waste(1000)
					xvt.hangup()
					return
				}
				else {
					if (!$.Ring.have($.player.rings, $.Ring.theOne)) $.steal++
					$.beep()
					$.player.coin.value += credit.value
					if (pocket.id) {
						$.online.altered = true
						$.player.steals++
						$.saveUser(pocket)
					}
					suppress = true
					break
				}

			case 'Q':
				require('./main').menu($.player.expert)
				return

			case 'R':
				if (!$.access.roleplay) break
				let re = $.RealEstate.name[$.player.realestate].protection
				xvt.out('\nYou live in a ', $.player.realestate)
				credit.value = $.worth(new $.coins($.RealEstate.name[$.player.realestate].value).value, $.online.cha)
				xvt.outln(' worth ', credit.carry())

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
				if (!$.access.roleplay) break
				let s = $.Security.name[$.player.security].protection
				xvt.out('\nYou are guarded by a ', $.player.security)
				credit.value = $.worth(new $.coins($.Security.name[$.player.security].value).value, $.online.cha)
				xvt.outln(' worth ', credit.carry())

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
				xvt.outln('\n', xvt.faint, '... you enter the back door of the shop ...')
				xvt.out('The ', xvt.bright, xvt.magenta, 'apothecary ', xvt.reset)
				max = $.Poison.merchant.length
				for (lo = 1; lo <= max; lo++)
					if (!$.Poison.have($.player.poisons, lo))
						break
				if (lo > $.Poison.merchant.length || !$.player.poison || !$.access.roleplay) {
					xvt.outln('says, "Get outta here!"')
					suppress = true
					break
				}
				for (hi = max; hi > lo; hi--)
					if (!$.Poison.have($.player.poisons, hi)
						&& $.player.coin.value >= (
							$.player.poison == 1 ? new $.coins($.Poison.vials[$.Poison.merchant[hi - 1]].vial).value
								: new $.coins($.Poison.vials[$.Poison.merchant[hi - 1]].cost).value))
						break
				xvt.out(['scoffs at your apparent lack of skill'
					, 'casts a suspicious look your way'
					, 'offers to sell you his contraband'
					, 'admires your expert eye on his wares'
				][$.player.poison - 1], '.\n'
				)
				list(choice)
				return

			case 'W':
				if (!$.access.roleplay) break
				let wc = $.Weapon.name[$.player.weapon].wc
				xvt.out('\nYou own a class ', $.bracket(wc, false), ' ', $.PC.weapon())
				if (wc) {
					let cv = new $.coins($.Weapon.name[$.player.weapon].value)
					credit.value = $.worth(cv.value, $.online.cha)
					if ($.player.toWC) credit.value = $.int(credit.value * (wc + $.player.toWC / ($.player.poison + 1)) / wc)
					if ($.online.toWC < 0) credit.value = $.int(credit.value * (wc + $.online.toWC) / wc)
					if (credit.value > cv.value)
						credit.value = cv.value
				}
				else
					credit.value = 0
				xvt.outln(' worth ', credit.carry())

				if (wc == 0 && ($.player.toWC < 0 || $.online.toWC < 0)) {
					xvt.outln(xvt.yellow, 'Your hands are broken; go to the hospital for treatment.')
					break
				}

				max = $.Weapon.merchant.length - 1
				lo = $.online.weapon.wc - 1
				lo = lo < 1 ? 1 : lo > max ? max - 1 : lo
				for (hi = lo;
					hi < max && $.player.coin.value + credit.value >= new $.coins($.Weapon.name[$.Weapon.merchant[hi]].value).value;
					hi++);
				if (lo > 1 && lo == hi) lo--
				list(choice)
				return
		}
		menu(suppress)
	}

	function Bank() {
		let suppress = $.player.expert
		let choice = xvt.entry.toUpperCase()
		if (xvt.validator.isEmpty(bank[choice])) {
			$.beep()
			xvt.app.refocus()
			return
		}
		xvt.app.form = {
			'coin': { cb: amount, max: 6 }
		}

		xvt.outln()

		switch (choice) {
			case 'D':
				xvt.app.form['coin'].prompt = xvt.attr('Deposit ', xvt.white, '[', xvt.uline, 'MAX', xvt.nouline, '=', $.player.coin.carry(), ']? ')
				xvt.app.focus = 'coin'
				break

			case 'L':
				xvt.app.form['coin'].prompt = xvt.attr('Loan ', xvt.white, '[', xvt.uline, 'MAX', xvt.nouline, '=', credit.carry(), ']? ')
				xvt.app.focus = 'coin'
				break

			case 'W':
				xvt.app.form['coin'].prompt = xvt.attr('Withdraw ', xvt.white, '[', xvt.uline, 'MAX', xvt.nouline, '=', $.player.bank.carry(), ']? ')
				xvt.app.focus = 'coin'
				break

			case 'R':
				$.music('ddd')
				let c = ($.player.level / 5) * ($.player.steal + 1)
				xvt.out(xvt.faint, '\nYou attempt to sneak into the vault...', xvt.reset)
				xvt.waste(2500)

				let effort = 100 + $.steal
				effort -= 8 * $.Ring.power([], $.player.rings, 'steal').power
				if ($.dice(effort) > ++c) {
					$.player.status = 'jail'
					$.reason = 'caught getting into the vault'
					$.action('clear')
					$.profile({ png: 'npc/jailer', effect: 'fadeIn' })
					xvt.outln('\n\nA guard catches you and throws you into jail!')
					$.sound('arrested', 20)
					xvt.outln('\nYou might be released by your next call.\n')
					xvt.waste(1000)
					xvt.hangup()
					return
				}

				let d = $.player.level + 1
				let vault = Math.pow(d, 7) * $.dice(d / 3) * $.dice(d / 11)
				let carry = new $.coins(vault)

				$.sound('creak2', 12)
				xvt.outln(xvt.yellow, ' you open a chest and find ', carry.carry(), xvt.bright, '!')

				let deposits = new $.coins($.int($.query(`SELECT SUM(bank) AS bank FROM Players WHERE id NOT GLOB '_*' AND id <> '${$.player.id}'`)[0].bank, true))
				if (deposits.value) {
					xvt.waste(1200)
					xvt.outln('And you grab ', deposits.carry(), ' more in deposits!')
				}
				$.sound('yahoo', 12)

				xvt.outln()
				xvt.out(xvt.faint, 'You try to make your way out of the vault ')
				xvt.waste(1200)
				for (let i = 0; i < 6 - $.player.steal; i++) {
					xvt.out('.')
					$.sound('click', 6)
				}

				c /= 15 - ($.player.steal * 3)
				if ($.dice(effort) > ++c) {
					$.player.status = 'jail'
					$.reason = 'caught inside the vault'
					xvt.out(xvt.reset, ' something jingles.')
					$.action('clear')
					$.sound('max', 12)
					$.profile({ png: 'npc/jailer', effect: 'fadeIn' })
					xvt.outln('\n\nA guard laughs as he closes the vault door on you!')
					$.sound('arrested', 20)
					xvt.outln('\nYou might be released by your next call.')
					xvt.waste(1000)
					xvt.hangup()
					return
				}

				$.player.coin.value += carry.value + deposits.value
				$.player.steals++
				xvt.outln()
				$.run(`UPDATE Players SET bank=0 WHERE id NOT GLOB '_*'`)
				$.beep()
				menu(true)
				break

			case 'T':
				if ($.access.sysop) {
					$.loadUser($.taxman)
					xvt.app.form['coin'].prompt = xvt.attr('Treasury ', xvt.white, '[', xvt.uline, 'MAX', xvt.nouline, '=', $.taxman.user.bank.carry(), ']? ')
					xvt.app.focus = 'coin'
					break
				}

			case 'V':
				if ($.access.sysop) {
					$.loadUser($.taxman)
					xvt.app.form['coin'].prompt = xvt.attr('Vault ', xvt.white, '[', xvt.uline, 'MAX', xvt.nouline, '=1000p]? ')
					xvt.app.focus = 'coin'
					break
				}

			case 'Q':
				$.action('nme')
				menu(suppress)
				break
		}
	}

	function amount() {
		if ((+xvt.entry).toString() == xvt.entry) xvt.entry += 'c'
		let action = xvt.app.form['coin'].prompt.split(' ')[0]
		let amount = new $.coins(0)

		switch (action) {
			case 'Deposit':
				amount.value = $.int((/=|max/i.test(xvt.entry))
					? new $.coins($.player.coin.carry(2, true)).value
					: new $.coins(xvt.entry).value)
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

			case 'Loan':
				amount.value = $.int((/=|max/i.test(xvt.entry))
					? new $.coins(credit.carry(2, true)).value
					: new $.coins(xvt.entry).value)
				if (amount.value > 0 && amount.value <= credit.value) {
					$.player.loan.value += amount.value
					$.player.coin.value += amount.value
					$.online.altered = true
					$.beep()
				}
				break

			case 'Withdraw':
				amount.value = $.int((/=|max/i.test(xvt.entry))
					? new $.coins($.player.bank.carry(2, true)).value
					: new $.coins(xvt.entry).value)
				if (amount.value > 0 && amount.value <= $.player.bank.value) {
					$.player.bank.value -= amount.value
					$.player.coin.value += amount.value
					$.online.altered = true
					$.beep()
				}
				break

			case 'Treasury':
				amount.value = $.int((/=|max/i.test(xvt.entry))
					? $.taxman.user.bank.value
					: new $.coins(xvt.entry).value)
				if (amount.value > 0 && amount.value <= $.taxman.user.bank.value) {
					$.taxman.user.bank.value -= amount.value
					$.player.coin.value += amount.value
					$.beep()
					$.saveUser($.taxman)
				}
				break

			case 'Vault':
				amount.value = $.int((/=|max/i.test(xvt.entry))
					? new $.coins('1000p').value
					: new $.coins(xvt.entry).value)
				if (amount.value > 0) {
					$.taxman.user.bank.value += amount.value
					$.beep()
					$.saveUser($.taxman)
				}
				break
		}

		xvt.entry = 'B'
		choice()
	}

	function list(choice: string) {
		want = choice.toUpperCase()
		if (/M|V/.test(want))
			$.action('listall')
		else
			$.action('listbest')
		xvt.app.form = {
			'start': { cb: listStart, prompt: 'Start list at ', max: 3 },
			'end': { cb: listEnd, prompt: 'Start list at ', max: 3 },
			'buy': { cb: buy, prompt: 'Buy which? ', max: 3 }
		}
		xvt.app.form['start'].enter = lo.toString()
		xvt.app.form['start'].prompt = xvt.attr('Start list at ', (lo < 10 && hi > 9) ? ' ' : '', $.bracket(lo, false), ': ')
		xvt.app.form['end'].enter = hi.toString()
		xvt.app.form['end'].prompt = xvt.attr('  End list at ', $.bracket(hi, false), ': ')

		if (lo < hi)
			xvt.app.focus = 'start'
		else
			listing()
	}

	function listStart() {
		if (/=|max/i.test(xvt.entry)) {
			buyall()
			return
		}

		let n = +xvt.entry >> 0
		if (n < 1) n = 1
		if ((/R|S/.test(want) && n < lo) || n > max) {
			$.beep()
			xvt.app.refocus()
			return
		}

		lo = n
		xvt.app.focus = 'end'
	}

	function listEnd() {
		if (/=|max/i.test(xvt.entry)) {
			buyall()
			return
		}

		let n = +xvt.entry >> 0
		if (n < lo) n = lo
		if (n > max) n = max
		hi = n

		xvt.outln()
		listing()
	}

	function listing() {
		for (let i = lo; i <= hi; i++) {
			switch (want) {
				case 'A':
					xvt.out($.bracket(i), sprintf('%-24s ', $.Armor.merchant[i]))
					xvt.out(new $.coins($.Armor.name[$.Armor.merchant[i]].value).carry())
					break

				case 'M':
					if (!$.Magic.have($.player.spells, i)) {
						xvt.out($.bracket(i), sprintf('%-24s ', $.Magic.merchant[i - 1]))
						if ($.player.magic == 1)
							xvt.out(new $.coins($.Magic.spells[$.Magic.merchant[i - 1]].wand).carry())
						else
							xvt.out(new $.coins($.Magic.spells[$.Magic.merchant[i - 1]].cost).carry())
					}
					break

				case 'R':
					xvt.out($.bracket(i), sprintf('%-24s ', $.RealEstate.merchant[i]))
					xvt.out(new $.coins($.RealEstate.name[$.RealEstate.merchant[i]].value).carry())
					break

				case 'S':
					xvt.out($.bracket(i), sprintf('%-24s ', $.Security.merchant[i]))
					xvt.out(new $.coins($.Security.name[$.Security.merchant[i]].value).carry())
					break

				case 'V':
					if (!$.Poison.have($.player.poisons, i)) {
						xvt.out($.bracket(i), sprintf('%-24s ', $.Poison.merchant[i - 1]))
						if ($.player.poison == 1)
							xvt.out(new $.coins($.Poison.vials[$.Poison.merchant[i - 1]].vial).carry())
						else
							xvt.out(new $.coins($.Poison.vials[$.Poison.merchant[i - 1]].cost).carry())
					}
					break

				case 'W':
					xvt.out($.bracket(i), sprintf('%-24s ', $.Weapon.merchant[i]))
					xvt.out(new $.coins($.Weapon.name[$.Weapon.merchant[i]].value).carry())
					break
			}
		}
		xvt.outln()
		xvt.app.focus = 'buy'
	}

	function buy() {
		if (/=|max/i.test(xvt.entry)) {
			buyall()
			return
		}

		if (xvt.entry == '') {
			xvt.outln()
			menu(false)
			return
		}

		let buy = +xvt.entry >> 0
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
					$.profile({ png: 'payment', effect: 'tada' })
					$.sound('click')
					$.player.armor = $.Armor.merchant[item]
					$.player.toAC = 0
					$.online.toAC = 0
					xvt.out(' - ', $.player.armor, '\n')
					$.player.coin.value += credit.value - cost.value
					$.Armor.equip($.online, $.player.armor)
				}
				break

			case 'M':
				item--
				cost = $.player.magic == 1 ? new $.coins($.Magic.spells[$.Magic.merchant[item]].wand)
					: new $.coins($.Magic.spells[$.Magic.merchant[item]].cost)
				if ($.player.coin.value >= cost.value && !$.Magic.have($.player.spells, buy)) {
					$.profile({ png: 'payment', effect: 'tada' })
					$.sound('click')
					$.Magic.add($.player.spells, buy)
					xvt.out(' - ', $.Magic.merchant[item], '\n')
					$.player.coin.value -= cost.value
					$.online.altered = true
				}
				break

			case 'R':
				cost = new $.coins($.RealEstate.name[$.RealEstate.merchant[item]].value)
				if ($.player.coin.value + credit.value >= cost.value) {
					$.profile({ png: 'payment', effect: 'tada' })
					$.sound('click')
					$.player.realestate = $.RealEstate.merchant[item]
					xvt.out(' - ', $.player.realestate, '\n')
					$.player.coin.value += credit.value - cost.value
					if (item == lo && $.realestate) $.realestate--
					$.online.altered = true
				}
				break

			case 'S':
				cost = new $.coins($.Security.name[$.Security.merchant[item]].value)
				if ($.player.coin.value + credit.value >= cost.value) {
					$.profile({ png: 'payment', effect: 'tada' })
					$.sound('click')
					$.player.security = $.Security.merchant[item]
					xvt.out(' - ', $.player.security, '\n')
					$.player.coin.value += credit.value - cost.value
					if (item == lo && $.security) $.security--
					$.online.altered = true
				}
				break

			case 'V':
				item--
				cost = $.player.poison == 1 ? new $.coins($.Poison.vials[$.Poison.merchant[item]].vial)
					: new $.coins($.Poison.vials[$.Poison.merchant[item]].cost)
				if ($.player.coin.value >= cost.value && !$.Poison.have($.player.poisons, buy)) {
					$.profile({ png: 'payment', effect: 'tada' })
					$.sound('click')
					$.Poison.add($.player.poisons, buy)
					xvt.out('\nHe slips you a vial of ', $.Poison.merchant[item], '\n')
					$.player.coin.value -= cost.value
					$.online.altered = true
				}
				break

			case 'W':
				cost = new $.coins($.Weapon.name[$.Weapon.merchant[buy]].value)
				if ($.player.coin.value + credit.value >= cost.value) {
					$.profile({ png: 'payment', effect: 'tada' })
					$.sound('click')
					$.player.weapon = $.Weapon.merchant[buy]
					$.player.toWC = 0
					$.online.toWC = 0
					xvt.out(' - ', $.player.weapon, '\n')
					$.player.coin.value += credit.value - cost.value
					$.Weapon.equip($.online, $.player.weapon)
				}
				break
		}

		menu()
	}

	function buyall() {
		let item: number
		let cost: $.coins

		switch (want) {
			case 'A':
				for (item = hi; item >= lo; item--) {
					cost = new $.coins($.Armor.name[$.Armor.merchant[item]].value)
					if ($.player.coin.value + credit.value >= cost.value) {
						if ($.Armor.name[$.Armor.merchant[item]].ac > $.online.armor.ac
							|| ($.online.armor.ac == $.Armor.name[$.Armor.merchant[item]].ac
								&& ($.online.toAC < 0 || $.player.toAC < 0))) {
							xvt.entry = item.toString()
							xvt.out(' ', xvt.entry)
							buy()
							return
						}
					}
				}
				break

			case 'M':
				for (let spell = lo; spell <= hi; spell++) {
					item = spell - 1
					cost = $.player.magic == 1 ? new $.coins($.Magic.spells[$.Magic.merchant[item]].wand)
						: new $.coins($.Magic.spells[$.Magic.merchant[item]].cost)
					if ($.player.coin.value >= cost.value && !$.Magic.have($.player.spells, spell)) {
						$.sound('click')
						$.Magic.add($.player.spells, spell)
						xvt.out($.bracket(spell), $.Magic.merchant[item])
						$.player.coin.value -= cost.value
					}
				}
				$.online.altered = true
				break

			case 'R':
				for (item = hi; item >= lo; item--) {
					cost = new $.coins($.RealEstate.name[$.RealEstate.merchant[item]].value)
					if ($.player.coin.value + credit.value >= cost.value) {
						if ($.RealEstate.name[$.RealEstate.merchant[item]].protection > $.RealEstate.name[$.player.realestate].protection) {
							xvt.entry = item.toString()
							xvt.out(' ', xvt.entry)
							buy()
							return
						}
					}
				}
				break

			case 'S':
				for (item = hi; item >= lo; item--) {
					cost = new $.coins($.Security.name[$.Security.merchant[item]].value)
					if ($.player.coin.value + credit.value >= cost.value) {
						if ($.Security.name[$.Security.merchant[item]].protection > $.Security.name[$.player.security].protection) {
							xvt.entry = item.toString()
							xvt.out(' ', xvt.entry)
							buy()
							return
						}
					}
				}
				break

			case 'V':
				for (let vial = lo; vial <= hi; vial++) {
					item = vial - 1
					cost = $.player.poison == 1 ? new $.coins($.Poison.vials[$.Poison.merchant[item]].vial)
						: new $.coins($.Poison.vials[$.Poison.merchant[item]].cost)
					if ($.player.coin.value >= cost.value && !$.Poison.have($.player.poisons, vial)) {
						$.sound('click')
						$.Poison.add($.player.poisons, vial)
						xvt.out('\nHe slips you a vial of ', $.Poison.merchant[item])
						$.player.coin.value -= cost.value
					}
				}
				$.online.altered = true
				break

			case 'W':
				for (item = hi; item >= lo; item--) {
					cost = new $.coins($.Weapon.name[$.Weapon.merchant[item]].value)
					if ($.player.coin.value + credit.value >= cost.value) {
						if ($.Weapon.name[$.Weapon.merchant[item]].wc > $.online.weapon.wc
							|| ($.online.weapon.wc == $.Weapon.name[$.Weapon.merchant[item]].wc
								&& ($.online.toWC < 0 || $.player.toWC < 0))) {
							xvt.entry = item.toString()
							xvt.out(' ', xvt.entry)
							buy()
							return
						}
					}
				}
				break
		}

		xvt.out('\n')
		menu()
	}

}

export = Square
