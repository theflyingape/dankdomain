/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  NAVAL authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import {sprintf} from 'sprintf-js'

import $ = require('../common')
import xvt = require('xvt')
import Battle = require('../battle')


module Naval
{
	let mon: number
	let monsters: naval[] = require('../etc/naval.json')
	let sm: naval
	let naval: choices = {
		'S': { description:'Shipyard' },
        'B': { description:'Battle other users' },
        'H': { description:'Hunt sea monsters' },
        'G': { description:'Go fishing' },
        'Y': { description:'Your ship\'s status' },
        'L': { description:'List user ships' }
	}

export function menu(suppress = true) {
    if ($.checkXP($.online, menu)) return
    if ($.online.altered) $.saveUser($.online)
	if ($.reason) xvt.hangup()

	$.action('naval')
	xvt.app.form = {
        'menu': { cb:choice, cancel:'q', enter:'?', eol:false }
    }
    xvt.app.form['menu'].prompt = $.display('naval', xvt.Cyan, xvt.cyan, suppress, naval)
    xvt.app.focus = 'menu'
}

function choice() {
    let suppress = false
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isNotEmpty(naval[choice]))
        if (xvt.validator.isNotEmpty(naval[choice].description)) {
            xvt.out(' - ', naval[choice].description)
            suppress = $.player.expert
        }
    xvt.out('\n')

	let rs: any[]
	let n:number

    switch (choice) {
		case 'B':
			suppress = true
			if (!$.access.roleplay) break
			if (!$.player.hull) {
				xvt.out('\nYou don\'t have a ship!\n')
				break
			}
			if (!$.naval) {
				xvt.out('\nYou have run out of battles.\n')
				break
			}
			Battle.user('Battle', (opponent: active) => {
				if (opponent.user.id === '' || opponent.user.id === $.player.id) {
					menu(true)
					return
				}
				if (!opponent.user.hull) {
					xvt.out(`\n${$.who(opponent, 'He')} doesn\'t have a ship.\n`)
					menu(true)
					return
				}
				xvt.out(`\nYou sail out until you spot ${opponent.user.handle}\'s ship on the horizon.\n\n`)
				if ($.lock(opponent.user.id, false)) {
					$.beep()
					xvt.out(`${$.who(opponent, 'He')}is currently engaged elsewhere and not available.\n`)
					menu()
					return
				}
				xvt.out(`It has ${opponent.user.hull} hull points.\n`)

				$.action('yn')				
				xvt.app.form = {
					'battle': { cb:() => {
						xvt.out('\n\n')
						if (/Y/i.test(xvt.entry)) {
							if ($.activate(opponent)) {
								$.naval--
								BattleUser(opponent)
							}
							else
								menu(!$.player.expert)
						}
						else
							menu(!$.player.expert)
					}, prompt:'Will you battle ' + $.who(opponent, 'him') + '(Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i }
				}
				xvt.app.focus = 'battle'
			})
			return

		case 'G':
			suppress = true
			if (!$.access.roleplay) break
			if (!$.player.hull) {
				xvt.out('\nYou don\'t have a ship!\n')
				break
			}
			$.online.altered = true
			xvt.out('\nIt is a fine day for sailing.  You cast your reel into the ocean and feel\n')
			xvt.out('a gentle tug... ')
			xvt.waste(600)
			xvt.out('you caught a')
			xvt.waste(600)
			let cast = 100 * $.online.cha / $.player.maxcha
			cast = (cast < 15) ? 15 : (cast > 100) ? 100 : cast >>0
			let hook = $.dice(cast)
			if (hook < 15) {
				let l = $.dice(95)
				let rs:any = $.query(`
					SELECT id, status FROM Players
					WHERE level BETWEEN ${l} AND ${l + 4} AND status != ''
				`)
				let r = $.dice(rs.length) - 1
				if (r >= 0 && rs[r]) {
					let floater = <user>{ id:rs[r].id }
					let leftby = <user>{ id:rs[r].status }
					if ($.loadUser(leftby)) {
						xvt.out(' floating carcass!')
						xvt.waste(500)
						$.loadUser(floater)
						xvt.out(`\nIt is ${floater.handle}'s body in the ocean left there by ${leftby.handle}, and\n`)
						xvt.out(`you're able to bring the player back to an Alive! state.\n`)
						floater.status = ''
						$.loadUser(floater)
						menu()
						return
					}
				}
				if ($.dice($.player.level / 3 + 2) == 1) {
					xvt.out('n old sea hag!\n\n')
					xvt.waste(600)
					xvt.out(xvt.bright, xvt.green,
						'She cackles as you are sent spinning elsewhere...',
						xvt.reset, '\n')
					$.sound('crone', 24)
					require('./dungeon').DeepDank($.player.level + 3 * $.dice($.player.level), () => {
						xvt.out(xvt.magenta, '\n"', xvt.bright, xvt.yellow
							, 'So you have escaped my magic, mortal.  Now try me!', xvt.normal, xvt.magenta
							, '"\n', xvt.reset)
						$.loadUser($.seahag)
						$.activate($.seahag)
						$.cat(`naval/${$.seahag}`.toLowerCase())
						if (isNaN(+$.seahag.user.weapon)) xvt.out('\n', $.who($.seahag, 'He'), $.Weapon.wearing($.seahag), '.\n')
						if (isNaN(+$.seahag.user.armor)) xvt.out('\n', $.who($.seahag, 'He'), $.Armor.wearing($.seahag), '.\n')
						$.seahag.user.cursed = $.player.id
						$.sound('god', 20)
						Battle.engage('Naval', $.online, $.seahag, menu)
						return
					})
					return
				}
				if ($.dice($.player.level / 3 + 2) == 1) {
					xvt.out(' titan named Neptune!\n\n')
					xvt.waste(600)
					$.loadUser($.neptune)
					if ($.player.level > $.neptune.user.level) {
						let keep = $.neptune.user.spells
						$.reroll($.neptune.user, $.neptune.user.pc, $.player.level - 1)
						$.neptune.user.spells = keep
					}
					$.activate($.neptune)
					$.cat(`naval/${$.neptune.user.handle}`.toLowerCase())
					xvt.out(xvt.bright, xvt.cyan,
						'He looks at you angrily as he removes a hook from his shorts!',
						xvt.reset, '\n')
					$.sound('neptune', 32)

					if (isNaN(+$.neptune.user.weapon)) xvt.out('\n', $.who($.neptune, 'He'), $.Weapon.wearing($.neptune), '.\n')
					if (isNaN(+$.neptune.user.armor)) xvt.out('\n', $.who($.neptune, 'He'), $.Armor.wearing($.neptune), '.\n')
					Battle.engage('Naval', $.online, $.neptune, menu)
					return
				}
				xvt.out(' fish and you eat it.\n')
				xvt.waste(600)
				xvt.out('Ugh!  You feel sick and die!\n')
				$.reason = 'ate yesterday\'s catch of the day'
				break
			}
			if (hook < 50) {
				xvt.out(' fish and you eat it.\n')
				xvt.waste(600)
				$.sound('yum')
				xvt.out('Yum!  You feel stronger and healthier.\n\n')
				let mod = $.player.blessed ? 10 : 0
				mod = $.player.cursed ? mod - 10 : mod
				$.online.str = $.PC.ability($.online.str, $.dice(10), $.online.user.maxstr, mod + 2)
				xvt.out(`Stamina = ${$.online.str}     `)
				$.online.hp += $.player.level + $.dice($.player.level)
					+ Math.trunc($.player.str / 10) + ($.player.str > 90 ? $.player.str - 90 : 0)
				xvt.out(`Hit points = ${$.online.hp}     `)
				if ($.player.sp) {
					$.online.sp += $.player.level + $.dice($.player.level)
						+ Math.trunc($.player.int / 10) + ($.player.int > 90 ? $.player.int - 90 : 0)
					xvt.out(`Spell points = ${$.online.sp}`)
				}
				xvt.out('\n')
				break
			}
			if (hook < 75) {
				xvt.out('n oyster and you eat it.\n')
				xvt.waste(600)
				n = Math.round(Math.pow(2., $.player.hull / 150.) * 7937)
				n = Math.trunc(n / $.player.hull / 10 * $.dice($.online.hull))
				n = Math.trunc(n * ($.player.cannon + 1) / ($.player.hull / 50))
				n = $.worth(n, $.online.cha)
				xvt.out(`Ouch!  You bit into a pearl and sell it for ${new $.coins(n).carry()}.\n`)
				$.player.coin.value += n
				break
			}
			if (hook < 90) {
				xvt.out('n oyster and you eat it.\n')
				xvt.waste(600)
				n = Math.round(Math.pow(2., $.player.hull / 150.) * 7937)
				n = Math.trunc(n / $.player.hull * $.dice($.online.hull))
				n = Math.trunc(n * ($.player.cannon + 1) / ($.player.hull / 50))
				n = $.worth(n, $.online.cha)
				xvt.out(`Ouch!  You bit into a diamond and sell it for ${new $.coins(n).carry()}.\n`)
				$.player.coin.value += n
				break
			}
			if (hook < 95) {
				xvt.out(' turtle and you let it go.\n')
				xvt.waste(600)
				$.player.toAC++
				$.online.toAC += $.dice($.online.armor.ac / 5 + 1)
				xvt.out('The turtle turns and smiles and enhances your ', $.player.armor)
				xvt.out($.buff($.player.toAC, $.online.toAC), xvt.reset,'\n')
				$.sound('shield')
				break
			}
			if (hook < 100) {
				xvt.out(' turtle and you let it go.\n')
				xvt.waste(600)
				$.player.toWC++
				$.online.toWC += $.dice($.online.weapon.wc / 10 + 1)
				xvt.out('The turtle turns and smiles and enhances your ', $.player.weapon)
				xvt.out($.buff($.player.toWC, $.online.toWC), xvt.reset,'\n')
				$.sound('hone')
				break
			}
			xvt.out(' mermaid!\n')
			xvt.waste(600)
			$.profile({jpg:'naval/mermaid'})
			$.cat('naval/mermaid')
			if ($.player.today) {
				xvt.out('She grants you an extra call for today!\n')
				$.player.today--
				$.news('\tcaught an extra call')
			}
			else {
				xvt.out('She says, \"Here\'s a key hint:\"\n')
				$.keyhint($.online)
			}
			xvt.app.form = {
				'pause': { cb:menu, pause:true }
			}
			xvt.app.focus = 'pause'
			return

		case 'H':
			suppress = true
			if (!$.access.roleplay) break
			if (!$.player.hull) {
				xvt.out('\nYou don\'t have a ship!\n')
				break
			}
			if (!$.naval) {
				xvt.out('\nYou have run out of battles.\n')
				break
			}

			for (let i in monsters)
				xvt.out($.bracket(+i + 1), xvt.cyan, monsters[i].name)
			xvt.out('\n')

			$.action('list')
			xvt.app.form = {
				pick: { cb: () => {
					xvt.out('\n')
					if (xvt.entry.length) {
						let mon = +xvt.entry
						if (isNaN(mon)) {
							xvt.app.refocus()
							return
						}
						if (mon) {
							mon = Math.trunc(mon)
							if (mon < 1 || mon > monsters.length) {
								xvt.app.refocus()
								return
							}
							xvt.entry = mon.toString()
						}
						MonsterHunt()
					}
					else
						menu()
				}
				, prompt: 'Hunt which monster (' + xvt.attr(xvt.white, '1-' + monsters.length, xvt.cyan, ')? '), min:0, max:1 }
			}
			xvt.app.focus = 'pick'
			return

		case 'L':
			xvt.out('\n')
			xvt.out(xvt.Blue, xvt.bright,
				' ID             Username            Hull     Cannons     Ram'
				, xvt.reset, '\n')
			xvt.out(xvt.Blue, xvt.bright,
				'----     ----------------------     ----     -------     ---'
				, xvt.reset, '\n')
			rs = $.query(`SELECT id,handle,hull,cannon,ram FROM Players WHERE hull > 0 ORDER BY hull DESC`)
			for (let i in rs) {
				xvt.out(sprintf('%-4s     %-22s     %4u     %5u        %s\n'
					, rs[i].id, rs[i].handle, rs[i].hull, rs[i].cannon, rs[i].ram ? 'Y' : 'N')
				)
			}
            xvt.app.form = {
                'pause': { cb:menu, pause:true }
            }
            xvt.app.focus = 'pause'
            return

		case 'S':
			if (!$.access.roleplay) break
			Shipyard()
			return

		case 'Q':
			require('./main').menu($.player.expert)
			return

		case 'Y':
			suppress = true
			if (!$.player.hull) {
				xvt.out('\nYou don\'t have a ship!\n')
				break
			}
			xvt.out('\nShip\'s Status:\n\n')
			xvt.out(`Hull points: ${$.online.hull} out of ${$.player.hull}\n`)
			xvt.out(`Cannons: ${$.player.cannon}\n`)
			xvt.out(`Ram: ${$.player.ram ? 'Yes' : 'No'}\n`)
			break
	}
	menu(suppress)
}

function Shipyard(suppress = true) {
	$.action('shipyard')
	let shipyard: choices = {
		'B': { description:'Buy a new ship' },
		'F': { description:'Fix battle damage' },
		'C': { description:'Mount cannons' },
		'R': { description:'Mount a ram' }
	}
	let choice: string
	
	xvt.app.form = {
        'menu': { cb:master, cancel:'q', enter:'?', eol:false }
    }
    xvt.app.form['menu'].prompt = $.display('shipyard', xvt.Cyan, xvt.cyan, suppress, shipyard)
    xvt.app.focus = 'menu'

	function master() {
		let suppress = $.player.expert
		let choice = xvt.entry.toUpperCase()
		if (xvt.validator.isNotEmpty(menu[choice]))
			if (xvt.validator.isNotEmpty(menu[choice].description)) {
				xvt.out(' - ', menu[choice].description)
				suppress = true
			}
		else {
			xvt.beep()
			suppress = false
		}
		xvt.out('\n')

		let ship = 50
		let cost = Math.round(Math.pow(2, ship / 150) * 7937)
		let max: number
		let afford: number
		
		switch (choice) {
			case 'B':
				if ($.player.hull + 50 > 8000) {
					$.beep()
					xvt.out('\nThey don\'t make ships any bigger than the one you have now.\n')
					break
				}
				if (!$.player.hull) {
					if ($.player.coin.value < cost) {
						xvt.out('\nYou need at least ', new $.coins(cost).carry(), ' to buy a ship.\n')
						break
					}
				}
				if ($.naval > 2) $.music('sailing')

				xvt.out('\nList of affordable ships:\n\n')
				max = $.player.hull + 50
				cost = Math.round(Math.pow(2, max / 150) * 7937)
				while (max <= 8000 && cost < $.player.coin.value) {
					xvt.out(sprintf('Hull size: %-4d     Cost: ', max), new $.coins(cost).carry(), '\n')
					max += 50
					cost = Math.round(Math.pow(2, max / 150) * 7937)
				}

				$.action('list')
				xvt.app.form = {
					'size': { cb: () => {
						xvt.out('\n')
						if (xvt.entry.length) {
							if (/=|max/i.test(xvt.entry)) {
								$.beep()
								xvt.entry = (max - 50).toString()
							}
							ship = +xvt.entry
							if (isNaN(ship)) {
								xvt.app.refocus()
								return
							}
							if (ship % 50) {
								xvt.out('\nWe don\'t make ships with that hull size.  Only in multiples of 50.\n')
								xvt.app.refocus()
								return
							}
							if (ship <= $.player.hull) {
								xvt.out(`\nYou already have a ${$.player.hull} hull size ship!\n`)
								xvt.app.refocus()
								return
							}
							if (ship >= max) {
								xvt.out('You don\'t have enough money!\n')
								xvt.app.refocus()
								return
							}
							if (ship > 8000) {
								xvt.out('\nWe don\'t make ships that big!\n')
								xvt.app.refocus()
								return
							}

							$.profile({ png:'payment' })
							$.sound('click')
							cost = Math.round(Math.pow(2, ship / 150) * 7937)
							$.player.coin.value -= cost
							$.player.hull = ship
							$.player.ram = false
							$.online.hull = $.player.hull
							$.online.altered = true
							xvt.out(`\nYou now have a brand new ${$.player.hull} hull point ship, with no ram.\n`)
						}
						Shipyard()
					}
					, prompt: 'Enter hull size to buy: ', min:0, max:4 }
				}
				xvt.app.focus = 'size'
				return

			case 'F':
				if (!$.player.hull) {
					xvt.out('\nYou don\'t have a ship!\n')
					break
				}
				max = $.player.hull - $.online.hull
				xvt.out(`\nYou need ${max} hull points of repair.\n`)
				cost = Math.round(Math.pow(2, $.player.hull / 150) * 7937)
				cost = Math.trunc(cost / $.player.hull / 10)
				xvt.out(`Each hull point costs ${new $.coins(cost).carry()}.\n`)
				afford = Math.trunc($.player.coin.value / cost)
				if (afford < max)
					max = afford
				$.action('list')
				xvt.app.form = {
					'hp': { cb: () => {
						xvt.out('\n')
						let buy = Math.abs(Math.trunc(/=|max/i.test(xvt.entry) ? max : +xvt.entry))
						if (buy > 0 && buy <= max) {
							$.player.coin.value -= buy * cost
							if ($.player.coin.value < 0)
								$.player.coin.value = 0
							$.online.hull += buy
							$.beep()
							xvt.out(`\nHull points = ${$.online.hull}\n`)
						}
						Shipyard()
						return
					}, max:4 }
				}
				xvt.app.form['hp'].prompt = xvt.attr('How many points [', xvt.bright, xvt.white, xvt.uline, 'MAX', xvt.reset, '=', max.toString(), xvt.cyan, ']? ')
				xvt.app.focus = 'hp'
				return

			case 'C':
				if (!$.player.hull) {
					xvt.out('\nYou don\'t have a ship!\n')
					break
				}
				max = Math.trunc($.player.hull / 50) - $.player.cannon
				xvt.out(`\nYou can mount up to ${max} more cannons.\n`)
				cost = Math.round(Math.pow(2, $.player.hull / 150) * 7937)
				cost = Math.trunc(cost / 250)
				xvt.out(`Each cannon costs ${new $.coins(cost).carry()}.\n`)
				afford = Math.trunc($.player.coin.value / cost)
				if (afford < max)
					max = afford
				$.action('list')
				xvt.app.form = {
					'cannon': { cb: () => {
						xvt.out('\n')
						let buy = Math.abs(Math.trunc(/=|max/i.test(xvt.entry) ? max : +xvt.entry))
						if (buy > 0 && buy <= max) {
							$.player.coin.value -= buy * cost
							if ($.player.coin.value < 0)
								$.player.coin.value = 0
							$.player.cannon += buy
							$.beep()
							xvt.out(`\nCannons = ${$.player.cannon}\n`)
						}
						Shipyard()
						return
					}, max:4 }
				}
				xvt.app.form['cannon'].prompt = xvt.attr('How many cannons [', xvt.bright, xvt.white, xvt.uline, 'MAX', xvt.reset, '=', max.toString(), xvt.cyan, ']? ')
				xvt.app.focus = 'cannon'
				return

			case 'R':
				if (!$.player.hull) {
					xvt.out('\nYou don\'t have a ship!\n')
					break
				}
				if ($.player.ram) {
					xvt.out('\nBut your ship already has a ram!\n')
					break
				}
				cost = Math.round(Math.pow(2, $.player.hull / 150) * 7937)
				cost = Math.trunc(cost / 10)
				xvt.out(`\nWe can equip your ship with a ram for ${new $.coins(cost).carry()}.\n`)
				afford = Math.trunc($.player.coin.value / cost)
				if (!afford) {
					xvt.out(`\nYou don\'t have enough money!\n`)
					break
				}
				$.action('yn')
				xvt.app.form = {
					'ram': { cb: () => {
						xvt.out('\n')
						if (/Y/i.test(xvt.entry)) {
							$.player.coin.value -= cost
							if ($.player.coin.value < 0)
								$.player.coin.value = 0
							$.player.ram = true
							$.beep()
							xvt.out(`\nYou now have a ram.\n`)
						}
						Shipyard()
						return
					}, prompt: 'Ok (Y/N)? ', cancel:'N', enter:'Y', eol:false, max:1, match:/Y|N/i }
				}
				xvt.app.focus = 'ram'
				return

			case 'Q':
				menu($.player.expert)
				return
		}
		Shipyard(suppress)
	}
}

function BattleUser(nme: active) {
	let damage: number

	if ($.dice(100) + $.online.int >= $.dice(100) + nme.int) {
		xvt.out(`You approach ${$.who(nme, 'him')}and quickly open fire.\n`)
		if (you()) {
			menu()
			return
		}
		if (him())
			return
	}
	else {
		xvt.out(`${$.who(nme, 'He')}spots you coming and attacks.\n`)
		if (him()) {
			menu()
			return
		}
	}

	$.action('hunt')
	xvt.app.form = {
		'attack': { cb:() => {
			xvt.out('\n')
			switch (xvt.entry.toUpperCase()) {
				case 'F':
					if (you() || him()) {
						menu()
						return
					}
					break

				case 'S':
					if ($.dice(50 + nme.int / 2) > 50 + (50 * nme.hull / (nme.hull +$.online.hull))) {
						$.sound('oops')
						xvt.out(`\n${$.who(nme, 'He')}outmaneuvers you and stops your retreat!\n`)
						xvt.waste(500)
						if (him()) {
							menu()
							return
						}
					}
					else {
						xvt.out('\nYou sail away safely out of range.\n')
						$.saveUser(nme)
						$.online.altered = true
						menu()
						return
					}
					break

				case 'R':
					if ($.player.ram) {
						if ($.dice(50 + nme.int / 2) > 100 * nme.hull / (nme.hull + $.online.hull)) {
							xvt.out(`\n${$.who(nme, 'He')}quickly outmaneuvers your ship.\n`)
							xvt.out(xvt.cyan, 'You yell at your helmsman, "', xvt.reset,
								[ 'Aim for the head, not the tail!'
								, 'I said port, bastards, not starboard!'
								, 'Whose side are you on anyways?!' ][$.dice(3) - 1]
								, xvt.cyan, '"\n')
							xvt.waste(600)
						}
						else {
							damage = $.dice($.player.hull / 2) + $.dice($.online.hull / 2)
							xvt.out(xvt.green, `\nYou ram ${$.who(nme, 'him')} for `
								, xvt.bright, `${damage}`
								, xvt.normal, ` hull points of damage!\n`)
							if ((nme.hull -= damage) < 1) {
								booty()
								menu()
								return
							}
						}
					}
					else {
						$.sound('oops')
						xvt.out('\nYour first mate cries back, \"But we don\'t have a ram!\"\n')
						xvt.waste(500)
					}
					if (him()) {
						menu()
						return
					}
					break

				case 'Y':
					xvt.out(`\nHull points: ${$.online.hull}\n`)
					xvt.out(`Cannons: ${$.player.cannon}\n`)
					xvt.out(`Ram: ${$.player.ram ? 'Yes' : 'No'}\n`)
					break
				}
			xvt.app.refocus()
		}, prompt:xvt.attr($.bracket('F', false), xvt.cyan, 'ire cannons, ', $.bracket('R', false), xvt.cyan, 'am, '
			, $.bracket('S', false), xvt.cyan, 'ail off, ', $.bracket('Y', false), xvt.cyan, 'our status: ')
			, cancel:'S', enter:'F', eol:false, match:/F|R|S|Y/i }
	}
	xvt.app.focus = 'attack'

	function booty() {
		nme.hull = 0
		xvt.out('\n', [
			`You've sunk ${nme.user.handle}\'s ship!`,
			`You've sunk ${nme.user.handle}\'s leaky, old tub!`,
			`You've made splinters out of ${nme.user.handle}\'s ship!`,
			`${nme.user.handle} is now sleeping with the fishes!`,
			`${nme.user.handle} is now chum for the sharks!`
			][$.dice(5) - 1], '!\n')
		xvt.waste(500)
		$.log(nme.user.id, `\n${$.player.handle} sank your ship!`)
		$.news(`\tsank ${nme.user.handle}\'s ship`)

		let booty = new $.coins(Math.round(Math.pow(2, $.player.hull / 150) * 7937 / 250))
		booty.value = Math.trunc(booty.value * nme.user.cannon)
		if (nme.user.coin.value > booty.value) {
			$.sound('boo')
			xvt.out(`${new $.coins(nme.user.coin.value - booty.value).carry()} of the booty has settled on the ocean floor...\n`)
			xvt.waste(500)
			nme.user.coin.value = booty.value
		}
		booty.value += nme.user.coin.value
		if (booty.value) {
			$.sound('booty', 5)
			xvt.out('You get ', booty.carry(), '.\n')
			$.log(nme.user.id, `... and got ${booty.carry()}.\n`)
			$.player.coin.value += booty.value
			xvt.waste(500)
			nme.user.coin.value = 0
		}
		booty.value += nme.user.coin.value
		$.saveUser(nme)
		$.online.altered = true
	}

	function you(): boolean {
		let result = fire($.online, nme)
		if (nme.hull > 0)
			return false
		booty()
		return true
	}

	function him(): boolean {
		if (!nme.user.cannon && !nme.user.ram) {
			xvt.out('They are defenseless and attempt to flee . . . ')
			xvt.waste(1000)
			if ($.dice(50 + $.online.int / 2) > 50 * $.online.hull / ($.online.hull + nme.hull) + 50) {
				xvt.out(`\nYou outmaneuver them and stop their retreat!\n`)
				xvt.waste(500)
				return false
			}
			xvt.out('\nThey sail away over the horizon.\n')
			xvt.waste(500)
			$.saveUser(nme)
			$.online.altered = true
			return true
		}
		if (!nme.user.ram || (nme.user.cannon && $.dice(2 * nme.hull / (nme.hull - $.online.hull) + 4) > 1))
			fire(nme, $.online)
		else
			ram(nme, $.online)
		$.online.altered = true
		if ($.online.hull < 1) {
			xvt.out(`\n${nme.user.handle} smiles as a shark approaches you.\n`)
			$.sound('bubbles', 10)
			xvt.hangup()
		}
		return ($.online.hull < 1)
	}
}

function MonsterHunt() {

	mon = +xvt.entry - 1
	sm = Object.assign({}, monsters[mon])
	let damage: number

	$.profile({jpg:'naval/sea monster'})
	xvt.out(`\nYou sail out until you spot${$.an(sm.name)} on the horizon.\n\n`)
	xvt.out(`It has ${sm.hull} hull points.\n`)

	$.action('yn')
	xvt.app.form = {
		'fight': { cb:() => {
			xvt.out('\n')
			if (!/Y/i.test(xvt.entry)) {
				menu()
				return
			}

			$.naval--
			if ($.dice(100) + $.online.int >= $.dice(100) + sm.int) {
				xvt.out('\nYou approach it and quickly open fire.\n')
				if (you()) {
					menu()
					return
				}
				if (it())
					return
			}
			else {
				xvt.out('\nIt spots you coming and attacks.\n')
				if (it()) {
					menu()
					return
				}
			}

			$.action('hunt')
			xvt.app.focus = 'attack'
		}, prompt:'Continue (Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i },
		'attack': { cb:() => {
			xvt.out('\n')
			switch (xvt.entry.toUpperCase()) {
				case 'F':
					if (you() || it()) {
						menu()
						return
					}
					break

				case 'S':
					if ($.dice(50 + monsters[mon].int / 2) > 50 * sm.hull / (sm.hull + $.online.hull) + 50) {
						$.sound('oops')
						xvt.out('\nIt outmaneuvers you and stops your retreat!\n')
						xvt.waste(500)
						if (it()) {
							menu()
							return
						}
					}
					else {
						xvt.out('\nYou sail away safely out of range.\n')
						menu()
						return
					}
					break

				case 'R':
					if ($.player.ram) {
						if ($.dice(50 + monsters[mon].int / 2) > 100 * sm.hull / (sm.hull + $.online.hull)) {
							xvt.out('\nIt quickly outmaneuvers your ship.\n')
							xvt.out(xvt.cyan, 'You yell at your helmsman, "', xvt.reset,
								[ 'Aim for the head, not the tail!'
								, 'I said starboard, bitches, not port!'
								, 'Whose side are you on anyways?!' ][$.dice(3) - 1]
								, xvt.cyan, '"\n')
							xvt.waste(600)
						}
						else {
							damage = $.dice($.player.hull / 2) + $.dice($.online.hull / 2)
							xvt.out(xvt.green, '\nYou ram it for '
								, xvt.bright, `${damage}`
								, xvt.normal, ` hull points of damage!\n`)
							if ((sm.hull -= damage) < 1) {
								booty()
								menu()
								return
							}
						}
					}
					else {
						$.sound('oops')
						xvt.out('\nYour first mate cries back, \"But we don\'t have a ram!\"\n')
						xvt.waste(500)
					}
					if (it()) {
						menu()
						return
					}
					break

				case 'Y':
					xvt.out(`\nHull points: ${$.online.hull}\n`)
					xvt.out(`Cannons: ${$.player.cannon}\n`)
					xvt.out(`Ram: ${$.player.ram ? 'Yes' : 'No'}\n`)
					break
				}
			xvt.app.refocus()
		}, prompt:xvt.attr($.bracket('F', false), xvt.cyan, 'ire cannons, ', $.bracket('R', false), xvt.cyan, 'am it, '
			, $.bracket('S', false), xvt.cyan, 'ail off, ', $.bracket('Y', false), xvt.cyan, 'our status: ')
			, cancel:'S', enter:'F', eol:false, match:/F|R|S|Y/i }
	}
	xvt.app.focus = 'fight'

	function booty() {
		sm.hull = 0
		$.sound('booty', 5)
		let coin = new $.coins(sm.money)
		coin.value = $.worth(coin.value, $.online.cha)
		xvt.out('You get ', coin.carry(), ' for bringing home the carcass.\n')
		$.player.coin.value += coin.value
		xvt.waste(500)
	}

	function you(): boolean {
		let result = fire($.online, <active>{ hull:sm.hull, user:{ id:'', handle:monsters[mon].name, hull:monsters[mon].hull, cannon:0, ram:monsters[mon].ram } })
		if ((sm.hull -= result.damage) > 0)
			return false

		booty()
		return true
	}

	function it(): boolean {
		let damage = 0

		if (!sm.ram || ($.dice(sm.shot * sm.hull / (sm.hull - $.online.hull) + 3 * sm.shot) > 1)) {
			for (let i = 0; i < sm.shot; i++)
				damage += $.dice(sm.powder) + $.dice(sm.powder)
			xvt.out('\n', xvt.bright, xvt.blue, `The ${sm.name} attacks your ship, causing`
				, xvt.cyan, ` ${damage} `
				, xvt.blue, `hull points of damage.`)
			xvt.out(xvt.reset, '\n')
			xvt.waste(250)
		}
		else
			ram(<active>{ hull:sm.hull, user:{ id:'', handle:monsters[mon].name, hull:monsters[mon].hull, cannon:sm.shot, ram:sm.ram } }, $.online)

		if (($.online.hull -= damage) < 1) {
			$.online.altered = true
			$.online.hull = 0
			$.player.killed++
			$.reason = `sunk by the ${sm.name}`
			xvt.out(`\nThe ${sm.name} sank your ship!\n`)
			xvt.waste(500)
			if ($.player.coin.value) {
				$.player.coin.value = 0
				xvt.out('It gets all your money!\n')
				xvt.waste(500)
			}
			return true
		}
		return false
	}
}

function fire(a: active, d: active): {  hits:number, damage:number, hull:number, cannon:number, ram:boolean } {
	let hits: number = 0
	let damage: number = 0
	let hull: number = 0
	let cannon: number = 0
	let ram: boolean = false

	xvt.out(xvt.cyan, '\n', a.user == $.player ? 'Attacker: ' : 'Defender: ')
	for (let i = 0; i < a.user.cannon && d.user.hull; i++) {
		let n = $.dice(100)
		n = (n < 66) ? 0 : (n < 96) ? 1: (n < 100 || !d.user.id) ? 2: 3
		switch (n) {
			case 3:
				if (d.user.ram) {
					ram = true
					d.user.ram = false
					xvt.out(xvt.bright, xvt.magenta, '^')
					break
				}
			case 2:
				if (d.user.id) {
					if (d.user.cannon) {
						cannon++
						d.user.cannon--
						xvt.out(xvt.bright, xvt.green, '@')
						break
					}
				}
			case 1:
				hits++
				n = $.dice(50)
				damage += n
				d.hull -= n
				if (n < 50 || d.user.hull < 1 || !d.user.id) {
					xvt.out(xvt.bright, xvt.red, '*')
					break
				}
				else {
					hull += 50
					d.user.hull -= 50
					xvt.out(xvt.bright, xvt.yellow, d.user.hull ? '#' : '&')
					break
				}
			default:
				xvt.out(xvt.reset, '-')
		}
		xvt.waste(12)
	}

	xvt.out(xvt.reset, '\n\n')
	if (a == $.online) {
		xvt.out(xvt.green, 'You hit ', d.user.id ? 'them' : 'it', ` ${hits} times for`
			, xvt.bright,` ${damage} `, xvt.normal
			, `hull points of damage.`, xvt.reset)
		if (cannon)
			xvt.out(`\nYou also hit ${cannon} of their cannons.`)
		if (hull)
			xvt.out(`\nYou also reduced ${hull} hull points off their ship.`)
		if (ram)
			xvt.out(`\nYou also hit their ram.`)
	}
	else {
		xvt.out(xvt.yellow, `They hit you ${hits} times for`
			, xvt.bright, ` ${damage} `, xvt.normal
			, `hull points of damage.`, xvt.reset)
		if (cannon)
			xvt.out(`\nThey also hit ${cannon} of your cannons.`)
		if (hull)
			xvt.out(`\nThey also reduced ${hull} hull points off your ship.`)
		if (ram)
			xvt.out(`\nThey also hit your ram.`)
	}
	xvt.out('\n')
	xvt.waste(250)

	return { hits, damage, hull, cannon, ram }
}

function ram(a: active, d: active) {
	if (a.user.id) xvt.out(xvt.yellow)
	else xvt.out(xvt.bright, xvt.blue)
	xvt.out(`\n${a.user.handle} ${$.what(a, 'ram')}${$.who(d, 'him')}for`)

	let damage = $.dice(a.user.hull / 2) + $.dice(a.hull / 2)
	if (a.user.id) xvt.out(xvt.bright)
	else xvt.out(xvt.cyan)
	xvt.out(` ${damage} `)

	if (a.user.id) xvt.out(xvt.normal)
	else xvt.out(xvt.blue)
	xvt.out(`hull points of damage!\n`, xvt.reset)
	xvt.waste(500)

	d.hull -= damage
}

}

export = Naval
