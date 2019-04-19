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
        'Y': { description:`Your ship's status` },
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
    xvt.outln()

	let rs: any[]
	let n:number

    switch (choice) {
		case 'B':
			suppress = true
			if (!$.access.roleplay) break
			if (!$.player.hull) {
				xvt.outln(`\nYou don't have a ship!`)
				break
			}
			if (!$.naval) {
				xvt.outln('\nYou have run out of battles.')
				break
			}
			Battle.user('Battle', (opponent: active) => {
				xvt.outln()
				if (opponent.user.id == '' || opponent.user.id == $.player.id) {
					menu(true)
					return
				}
				if (!opponent.user.hull) {
					xvt.outln(`${$.PC.who(opponent).He}doesn't have a ship.`)
					menu(true)
					return
				}
				if (!$.lock(opponent.user.id)) {
					$.beep()
					xvt.outln(`${$.PC.who(opponent).He}is currently engaged elsewhere and not available.`)
					menu(true)
					return
				}

				xvt.outln(`You sail out until you spot ${opponent.user.handle}'s ship on the horizon.`)
				xvt.waste(500)
				xvt.outln(`It has ${opponent.user.hull} hull points.`)
				xvt.waste(500)

				$.action('ny')
				xvt.app.form = {
					'battle': { cb:() => {
						xvt.outln()
						if (/Y/i.test(xvt.entry)) {
							if ($.activate(opponent, true)) {
								$.naval--
								BattleUser(opponent)
							}
							else
								menu(!$.player.expert)
						}
						else
							menu(!$.player.expert)
					}, prompt:`Will you battle ${$.PC.who(opponent).him}(Y/N)? `, cancel:'N', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:10 }
				}
				xvt.app.focus = 'battle'
			})
			return

		case 'G':
			suppress = true
			if (!$.access.roleplay) break
			xvt.outln()
			if (!$.player.hull) {
				xvt.outln(`You don't have a ship!`)
				break
			}
			xvt.outln('It is a fine day for sailing.  You cast your reel into the ocean and feel')
			xvt.out('a gentle tug... ')
			xvt.waste(600)
			xvt.out('you caught a')
			xvt.waste(600)
			let cast = 100 * $.online.cha / $.player.maxcha
			cast = (cast < 15) ? 15 : (cast > 100) ? 100 : cast >>0
			let hook = $.dice(cast)
			if (hook < 15) {
				let floater = $.PC.encounter(`AND id NOT GLOB '_*'`)
				if (floater.user.id && floater.user.status) {
					let leftby = <user>{ id:floater.user.status }
					if ($.loadUser(leftby)) {
                        $.PC.profile(floater, 'fadeInUpBig')
						xvt.out(' floating carcass!')
						xvt.waste(500)
						$.loadUser(floater)
						xvt.outln(`\nIt is ${floater.user.handle}'s body in the ocean left there by ${leftby.handle}, and`)
						xvt.outln(`you're able to bring the player back to an Alive! state.`)
						$.run(`UPDATE Players set status='' WHERE id='${floater.user.id}'`)
						$.news(`\trecovered ${floater.user.handle}'s body from the ocean`)
						menu()
						return
					}
				}
				if ($.dice($.player.level / 3 + 2) == 1) {
					xvt.outln('n old sea hag!')
					$.cat(`naval/${$.seahag}`.toLowerCase())
					xvt.waste(600)
					xvt.outln(xvt.bright, xvt.green, 'She cackles as you are sent spinning elsewhere ... ')
					$.sound('crone', 24)
					require('./dungeon').DeepDank($.player.level + 3 * $.dice($.player.level), () => {
						$.action('clear')
						xvt.waste(1000)
						$.profile({ jpg:'npc/seahag', effect:'fadeInUp'
							, handle:$.seahag.user.handle, level:$.seahag.user.level, pc:$.seahag.user.pc })
						$.sound('god', 12)
						xvt.outln(xvt.magenta, '\n"', xvt.bright, xvt.yellow
							, 'You have escaped my magic, mortal?  Now try me!', xvt.normal, xvt.magenta, '"')
						xvt.waste(1200)
						$.loadUser($.seahag)
						$.cat(`naval/${$.seahag}`.toLowerCase())
						xvt.waste(600)
						$.PC.wearing($.seahag)
						$.seahag.user.cursed = $.player.id
						Battle.engage('Naval', $.online, $.seahag, menu)
						return
					})
					return
				}
				if ($.dice($.player.level / 3 + 2) == 1) {
					xvt.outln(' titan named Neptune!')
					$.cat(`naval/${$.neptune.user.handle}`.toLowerCase())
					xvt.waste(600)
					$.loadUser($.neptune)
					if ($.player.level > $.neptune.user.level) {
						let keep = $.neptune.user.spells
						$.reroll($.neptune.user, $.neptune.user.pc, $.player.level - 1)
						$.neptune.user.spells = keep
					}
					$.activate($.neptune)
					xvt.outln(xvt.bright, xvt.cyan, 'He looks at you angrily as he removes a hook from his shorts!')
                    $.profile({ jpg:'npc/neptune', effect:'fadeInUp'
                        , handle:$.neptune.user.handle, level:$.neptune.user.level, pc:$.neptune.user.pc })
					$.sound('neptune', 32)
					$.PC.wearing($.neptune)

					Battle.engage('Naval', $.online, $.neptune, menu)
					return
				}
				xvt.outln(' fish and you eat it.')
				$.sound('quaff', 6)
				xvt.outln('Ugh!  You feel sick and die!')
				$.reason = `ate yesterday's catch of the day`
				break
			}
			if (hook < 50) {
				xvt.outln(' fish and you eat it.')
				$.sound('quaff', 6)
				$.sound('yum')
				xvt.outln('Yum!  You feel stronger and healthier.\n')
				$.PC.adjust('str', 101)
				xvt.out(`Stamina = ${$.online.str}     `)
				$.online.hp += $.int($.PC.hp() / 2) + $.dice($.PC.hp() / 2)
				xvt.out(`Hit points = ${$.online.hp}     `)
				if ($.player.sp) {
					$.online.sp += $.int($.PC.sp() / 2) + $.dice($.PC.sp() / 2)
					xvt.out(`Spell points = ${$.online.sp}`)
				}
				xvt.outln()
				break
			}
			if (hook < 75) {
				xvt.outln('n oyster and you eat it.')
				xvt.waste(600)
				n = Math.round(Math.pow(2., $.player.hull / 150.) * 7937)
				n = Math.trunc(n / $.player.hull / 10 * $.dice($.online.hull))
				n = Math.trunc(n * ($.player.cannon + 1) / ($.player.hull / 50))
				n = $.worth(n, $.online.cha)
				$.sound('oof')
				xvt.outln(`Ouch!  You bit into a pearl and sell it for ${new $.coins(n).carry()}.`)
				$.player.coin.value += n
				break
			}
			if (hook < 90) {
				xvt.outln('n oyster and you eat it.')
				xvt.waste(600)
				n = Math.round(Math.pow(2., $.player.hull / 150.) * 7937)
				n = Math.trunc(n / $.player.hull * $.dice($.online.hull))
				n = Math.trunc(n * ($.player.cannon + 1) / ($.player.hull / 50))
				n = $.worth(n, $.online.cha)
				$.sound('oof')
				xvt.outln(`Ouch!  You bit into a diamond and sell it for ${new $.coins(n).carry()}.`)
				$.player.coin.value += n
				break
			}
			if (hook < 95) {
				$.profile({ jpg:'naval/turtle', effect:'fadeInUp' })
				xvt.outln(' turtle and you let it go.')
				xvt.waste(600)
				$.player.toAC++
				$.online.toAC += $.dice($.online.armor.ac / 5 + 1)
				xvt.outln('The turtle turns and smiles and enhances your ', $.PC.armor())
				$.sound('shield')
				break
			}
			if (hook < 100) {
				xvt.outln(' tortoise and you let it go.')
				xvt.waste(600)
				$.player.toWC++
				$.online.toWC += $.dice($.online.weapon.wc / 10 + 1)
				xvt.outln('The tortoise shows it gratitude by enchanting your ', $.PC.weapon())
				$.sound('hone')
				break
			}
			xvt.outln(' mermaid!')
			xvt.waste(600)
			$.profile({ jpg:'naval/mermaid', effect:'bounceInUp' })
			$.cat('naval/mermaid')
			if ($.player.today) {
				xvt.outln('She grants you an extra call for today!')
				$.player.today--
				$.news('\tcaught an extra call')
			}
			else {
				xvt.outln(`She says, "Here's a key hint:"`)
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
				xvt.outln(`\nYou don't have a ship!`)
				break
			}
			if (!$.naval) {
				xvt.outln('\nYou have run out of battles.')
				break
			}

			for (let i in monsters)
				xvt.out($.bracket(+i + 1), xvt.cyan, monsters[i].name)
			xvt.outln()

			$.action('list')
			xvt.app.form = {
				pick: { cb: () => {
					xvt.outln()
					if (xvt.entry.length) {
						let mon = $.int(xvt.entry)
						if (mon < 1 || mon > monsters.length) {
							xvt.app.refocus()
							return
						}
						xvt.entry = mon.toString()
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
			suppress = true
			xvt.outln()
			xvt.outln(xvt.Blue, xvt.bright, ' ID             Username            Hull     Cannons     Ram')
			xvt.outln(xvt.Blue, xvt.bright, '----     ----------------------     ----     -------     ---')
			rs = $.query(`SELECT id,handle,hull,cannon,ram FROM Players WHERE hull > 0 ORDER BY hull DESC`)
			for (let i in rs) {
				xvt.outln(sprintf('%-4s     %-22s     %4u     %5u        %s'
					, rs[i].id, rs[i].handle, rs[i].hull, rs[i].cannon, rs[i].ram ? 'Y' : 'N')
				)
			}
			break

		case 'S':
			if (!$.access.roleplay) break
			Shipyard($.player.expert)
			return

		case 'Q':
			require('./main').menu($.player.expert)
			return

		case 'Y':
			suppress = true
			xvt.outln()
			if (!$.player.hull) {
				xvt.outln(`You don't have a ship!`)
				break
			}
			xvt.outln(`Ship's Status:\n`)
			xvt.outln(`Hull points: ${$.online.hull} out of ${$.player.hull}`)
			xvt.outln(`Cannons: ${$.player.cannon}`)
			xvt.outln(`Ram: ${$.player.ram ? 'Yes' : 'No'}`)
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

	xvt.app.form = {
        'menu': { cb:master, cancel:'q', enter:'?', eol:false }
    }
    xvt.app.form['menu'].prompt = $.display('shipyard', xvt.Cyan, xvt.cyan, suppress, shipyard)
    xvt.app.focus = 'menu'

	function master() {
		let suppress = false
		let choice = xvt.entry.toUpperCase()
		if (xvt.validator.isNotEmpty(shipyard[choice]))
			if (xvt.validator.isNotEmpty(shipyard[choice].description)) {
				xvt.out(' - ', shipyard[choice].description)
				suppress = true
			}
		xvt.outln('\n')

		let ship = 50
		let cost = Math.round(Math.pow(2, ship / 150) * 7937)
		let max: number
		let afford: number

		switch (choice) {
			case 'B':
				if ($.player.hull + 50 > 8000) {
					$.beep()
					xvt.outln(`They don't make ships any bigger than the one you have now.`)
					break
				}
				if (!$.player.hull) {
					if ($.player.coin.value < cost) {
						xvt.outln('You need at least ', new $.coins(cost).carry(), ' to buy a ship.')
						break
					}
				}
				if ($.naval > 2) $.music('sailing')

				xvt.outln('List of affordable ships:\n')
				max = $.player.hull + 50
				cost = Math.round(Math.pow(2, max / 150) * 7937)
				while (max <= 8000 && cost < $.player.coin.value) {
					xvt.outln(sprintf('Hull size: %-4d     Cost: ', max), new $.coins(cost).carry())
					max += 50
					cost = Math.round(Math.pow(2, max / 150) * 7937)
				}

				$.action('listbest')
				xvt.app.form = {
					'size': { cb: () => {
						xvt.outln('\n')
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
								xvt.outln(`We don't make ships with that hull size.  Only in multiples of 50.`)
								xvt.app.refocus()
								return
							}
							if (ship <= $.player.hull) {
								xvt.outln(`You already have a ${$.player.hull} hull size ship!`)
								xvt.app.refocus()
								return
							}
							if (ship >= max) {
								xvt.outln(`You don't have enough money!`)
								xvt.app.refocus()
								return
							}
							if (ship > 8000) {
								xvt.outln(`We don't make ships that big!`)
								xvt.app.refocus()
								return
							}

							$.profile({ png:'payment', effect:'tada' })
							$.sound('click', 5)
							cost = Math.round(Math.pow(2, ship / 150) * 7937)
							$.player.coin.value -= cost
							$.player.hull = ship
							$.player.ram = false
							$.online.hull = $.player.hull
							$.run(`UPDATE Players set hull=${ship},ram=0 WHERE id='${$.player.id}'`)
							xvt.outln(`You now have a brand new ${$.player.hull} hull point ship, with no ram.`)
							$.sound('boat')
						}
						Shipyard()
					}
					, prompt: 'Enter hull size to buy: ', min:0, max:4 }
				}
				xvt.app.focus = 'size'
				return

			case 'F':
				if (!$.player.hull) {
					xvt.outln(`You don't have a ship!`)
					break
				}
				max = $.player.hull - $.online.hull
				xvt.outln(`You need ${max} hull points of repair.`)
				cost = Math.round(Math.pow(2, $.player.hull / 150) * 7937)
				cost = Math.trunc(cost / $.player.hull / 10)
				xvt.outln(`Each hull point costs ${new $.coins(cost).carry()}.`)
				afford = Math.trunc($.player.coin.value / cost)
				if (afford < max)
					max = afford
				$.action('listall')
				xvt.app.form = {
					'hp': { cb: () => {
						xvt.outln('\n')
						let buy = Math.abs(Math.trunc(/=|max/i.test(xvt.entry) ? max : +xvt.entry))
						if (buy > 0 && buy <= max) {
							$.player.coin.value -= buy * cost
							if ($.player.coin.value < 0)
								$.player.coin.value = 0
							$.online.hull += buy
							$.beep()
							xvt.outln(`Hull points = ${$.online.hull}`)
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
					xvt.outln(`You don't have a ship!`)
					break
				}
				max = Math.trunc($.player.hull / 50) - $.player.cannon
				xvt.outln(`You can mount up to ${max} more cannons.`)
				cost = Math.round(Math.pow(2, $.player.hull / 150) * 7937)
				cost = Math.trunc(cost / 250)
				xvt.outln(`Each cannon costs ${new $.coins(cost).carry()}.`)
				afford = Math.trunc($.player.coin.value / cost)
				if (afford < max)
					max = afford
				$.action('listbest')
				xvt.app.form = {
					'cannon': { cb: () => {
						xvt.outln('\n')
						let buy = Math.abs(Math.trunc(/=|max/i.test(xvt.entry) ? max : +xvt.entry))
						if (buy > 0 && buy <= max) {
							$.player.coin.value -= buy * cost
							if ($.player.coin.value < 0)
								$.player.coin.value = 0
							$.player.cannon += buy
							$.beep()
							xvt.outln(`Cannons = ${$.player.cannon}`)
							$.run(`UPDATE Players set cannon=${$.player.cannon} WHERE id='${$.player.id}'`)
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
					xvt.outln(`You don't have a ship!`)
					break
				}
				if ($.player.ram) {
					xvt.outln(`But your ship already has a ram!`)
					break
				}
				cost = Math.round(Math.pow(2, $.player.hull / 150) * 7937)
				cost = Math.trunc(cost / 10)
				xvt.outln(`We can equip your ship with a ram for ${new $.coins(cost).carry()}.`)
				afford = Math.trunc($.player.coin.value / cost)
				if (!afford) {
					xvt.outln(`You don't have enough money!`)
					break
				}
				$.action('yn')
				xvt.app.form = {
					'ram': { cb: () => {
						xvt.outln('\n')
						if (/Y/i.test(xvt.entry)) {
							$.player.coin.value -= cost
							if ($.player.coin.value < 0)
								$.player.coin.value = 0
							$.player.ram = true
							$.beep()
							xvt.outln('You now have a ram.')
							$.run(`UPDATE Players set ram=1 WHERE id='${$.player.id}'`)
						}
						Shipyard()
						return
					}, prompt: 'Ok (Y/N)? ', cancel:'N', enter:'Y', eol:false, match:/Y|N/i, max:1, timeout:20 }
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

	xvt.outln()
	if ($.dice(100) + $.online.int >= $.dice(100) + nme.int) {
		xvt.outln(`You approach ${$.PC.who(nme).him}and quickly open fire.`)
		if (you()) {
			menu()
			return
		}
	}
	else
		xvt.outln(`${$.PC.who(nme).He}spots you coming and attacks.`)

	if (him()) {
		menu()
		return
	}

	$.action('hunt')
	xvt.app.form = {
		'attack': { cb:() => {
			xvt.outln()
			switch (xvt.entry.toUpperCase()) {
				case 'F':
					if (you() || him()) {
						menu()
						return
					}
					break

				case 'S':
					xvt.outln()
					if (!outrun($.online.hull / nme.hull, $.online.int - nme.int)) {
						$.sound('oops')
						xvt.outln(`${$.PC.who(nme).He}outruns you and stops your retreat!`)
						xvt.waste(500)
						if (him()) {
							menu()
							return
						}
					}
					else {
						$.PC.adjust('cha', -2, -1)
						$.player.retreats++
						xvt.outln(xvt.bright, xvt.cyan, 'You sail '
							, xvt.normal, 'away safely '
							, xvt.faint, 'out of range.')
						$.saveUser(nme, false, true)
						$.run(`UPDATE Players set hull=${$.player.hull},cannon=${$.player.cannon},ram=${+$.player.ram},retreats=${$.player.retreats} WHERE id='${$.player.id}'`)
                        $.log(nme.user.id, `\n${$.player.handle}, the coward, sailed away from you.`)
						menu()
						return
					}
					break

				case 'R':
					if ($.player.ram) {
						xvt.outln()
						if (outmaneuvered(nme.int - $.online.int, nme.hull / $.online.hull)) {
							xvt.outln(`${$.PC.who(nme).He}quickly outmaneuvers your ship.`)
							xvt.waste(400)
							xvt.outln(xvt.cyan, 'You yell at your helmsman, "', xvt.reset,
								[ 'Your aim is going to kill us all!'
								, 'I said port, bastard, not starboard!'
								, 'Get me my brown pants!'
								, 'Someone throw this traitor overboard!'
								, 'She\'s turning onto US now!' ][$.dice(5) - 1]
								, xvt.cyan, '"')
							xvt.waste(600)
						}
						else {
							damage = $.dice($.player.hull / 2) + $.dice($.online.hull / 2)
							xvt.outln(xvt.green, `You ram ${$.PC.who(nme).him}for `
								, xvt.bright, `${damage}`
								, xvt.normal, ` hull points of damage!`)
							if ((nme.hull -= damage) < 1) {
								booty()
								menu()
								return
							}
						}
					}
					else {
						$.sound('oops')
						xvt.outln()
						xvt.outln(`Your first mate cries back, "But we don't have a ram!"`)
						xvt.waste(2000)
						$.sound('fire', 8)
						xvt.outln('You shoot your first mate.')
						xvt.waste(800)
					}
					if (him()) {
						menu()
						return
					}
					break

				case 'Y':
					xvt.outln()
					xvt.outln(`Hull points: ${$.online.hull}`)
					xvt.outln(`Cannons: ${$.player.cannon}`)
					xvt.outln(`Ram: ${$.player.ram ? 'Yes' : 'No'}`)
					break
				}
			xvt.app.refocus()
		}, prompt:xvt.attr($.bracket('F', false), xvt.cyan, 'ire cannons, ', $.bracket('R', false), xvt.cyan, 'am, '
			, $.bracket('S', false), xvt.cyan, 'ail off, ', $.bracket('Y', false), xvt.cyan, 'our status: ')
			, cancel:'S', enter:'F', eol:false, match:/F|R|S|Y/i, timeout:20 }
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
		$.news(`\tsank ${nme.user.handle}'s ship`)

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
		$.saveUser(nme, false, true)
	}

	function you(): boolean {
		let result = fire($.online, nme)
		if (nme.hull > 0) {
			if ($.dice(10) == 1) {
				xvt.outln(xvt.cyan, 'You call out to your crew, "', xvt.reset,
				[ 'Fire at crest to hit the best!'
				, 'Crying will not save you!'
				, `Look alive, or I'll kill you first!`
				, 'Get me my red shirt!'
				, `Y'all fight like the will-o-wisp!` ][$.dice(5) - 1]
				, xvt.cyan, '"')
				xvt.waste(600)
			}
			return false
		}
		booty()
		return true
	}

	function him(): boolean {
		if (!nme.user.cannon && !nme.user.ram) {
			xvt.out('They are defenseless and attempt to flee . . . ')
			xvt.waste(1000)
			if (!outrun(nme.hull / $.online.hull, nme.int - $.online.int)) {
				xvt.outln(`\nYou outrun them and stop their retreat!`)
				xvt.waste(500)
				return false
			}
			xvt.outln('\nThey sail away over the horizon.')
			$.saveUser(nme, false, true)
			xvt.waste(500)
			return true
		}
		if (!nme.user.ram || (nme.user.cannon && $.dice(2 * nme.hull / (nme.hull - $.online.hull) + 4) > 1))
			fire(nme, $.online)
		else
			ram(nme, $.online)

		if ($.online.hull < 1) {
			$.online.altered = true
			$.log(nme.user.id, `\nYou sank ${$.player.handle}'s ship!`)
			$.reason=`sunk by ${nme.user.handle}`
			$.online.hp = 0
			$.online.hull = 0

			let booty = new $.coins(Math.round(Math.pow(2, nme.user.hull / 150) * 7937 / 250))
			booty.value = Math.trunc(booty.value * $.player.cannon)
			if ($.player.coin.value > booty.value)
				$.player.coin.value = booty.value
			booty.value += $.player.coin.value
			if (booty.value) {
				$.log(nme.user.id, `... and you got ${booty.carry()}.\n`)
				nme.user.coin.value += booty.value
				$.player.coin.value = 0
			}
			$.saveUser(nme, false, true)

			xvt.outln(xvt.faint, `\n${nme.user.handle} smiles as a shark approaches you.`)
			$.sound('bubbles', 15)
			xvt.hangup()
		}
		return ($.online.hull < 1)
	}
}

function MonsterHunt() {

	mon = +xvt.entry - 1
	sm = Object.assign({}, monsters[mon])
	let damage: number

	$.profile({ jpg:'naval/sea monster', effect:'fadeInUp' })
	xvt.outln(`\nYou sail out until you spot${$.an(sm.name)} on the horizon.\n`)
	xvt.outln(`It has ${sm.hull} hull points.`)

	$.action('ny')
	xvt.app.form = {
		'fight': { cb:() => {
			xvt.outln()
			if (!/Y/i.test(xvt.entry)) {
				menu()
				return
			}

			$.naval--
			if ($.dice(100) + $.online.int >= $.dice(100) + sm.int) {
				xvt.outln('\nYou approach it and quickly open fire.')
				if (you()) {
					menu()
					return
				}
				if (it())
					return
			}
			else {
				xvt.outln('\nIt spots you coming and attacks.')
				if (it()) {
					menu()
					return
				}
			}

			$.action('hunt')
			xvt.app.focus = 'attack'
		}, prompt:'Continue (Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:20 },
		'attack': { cb:() => {
			xvt.outln()
			switch (xvt.entry.toUpperCase()) {
				case 'F':
					if (you() || it()) {
						menu()
						return
					}
					break

				case 'S':
					if (!outrun($.online.hull / sm.hull, $.online.int - sm.int)) {
						$.sound('oops')
						xvt.out('\nIt outruns you and stops your retreat!\n')
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
						if (outmaneuvered(sm.int - $.online.int, sm.hull / $.online.hull)) {
							xvt.outln('\nIt quickly outmaneuvers your ship.')
							xvt.waste(400)
							xvt.out(xvt.cyan, 'You yell at your helmsman, "', xvt.reset,
								[ 'Not the tail, aim for the beastie\'s head!'
								, 'I said starboard, bitch, not port!'
								, 'Look alive, or it\'ll be fine dining yer bones!'
								, 'Get me my brown pants!'
								, 'Whose side are you on anyways?!' ][$.dice(5) - 1]
								, xvt.cyan, '"\n')
							xvt.waste(600)
						}
						else {
							damage = $.dice($.player.hull / 2) + $.dice($.online.hull / 2)
							xvt.outln(xvt.green, '\nYou ram it for '
								, xvt.bright, `${damage}`
								, xvt.normal, ` hull points of damage!`)
							if ((sm.hull -= damage) < 1) {
								booty()
								menu()
								return
							}
						}
					}
					else {
						$.sound('oops')
						xvt.outln(`\nYour first mate cries back, "But we don't have a ram!"`)
						xvt.waste(500)
					}
					if (it()) {
						menu()
						return
					}
					break

				case 'Y':
					xvt.outln(`\nHull points: ${$.online.hull}`)
					xvt.outln(`Cannons: ${$.player.cannon}`)
					xvt.outln(`Ram: ${$.player.ram ? 'Yes' : 'No'}`)
					break
				}
			xvt.app.refocus()
		}, prompt:xvt.attr($.bracket('F', false), xvt.cyan, 'ire cannons, ', $.bracket('R', false), xvt.cyan, 'am it, '
			, $.bracket('S', false), xvt.cyan, 'ail off, ', $.bracket('Y', false), xvt.cyan, 'our status: ')
			, cancel:'S', enter:'F', eol:false, match:/F|R|S|Y/i, timeout:20 }
	}
	xvt.app.focus = 'fight'

	function booty() {
		sm.hull = 0
		$.sound('booty', 5)
		let coin = new $.coins(sm.money)
		coin.value = $.worth(coin.value, $.online.cha)
		xvt.outln('You get ', coin.carry(), ' for bringing home the carcass.')
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
			xvt.outln('\n', xvt.bright, xvt.blue, `The ${sm.name} attacks your ship, causing`
				, xvt.cyan, ` ${damage} `, xvt.blue, `hull points of damage.\n`)
			xvt.waste(250)
		}
		else
			ram(<active>{ hull:sm.hull, user:{ id:'', handle:monsters[mon].name, hull:monsters[mon].hull, cannon:sm.shot, ram:sm.ram } }, $.online)

		if (($.online.hull -= damage) < 1) {
			$.online.altered = true
			$.online.hp = 0
			$.online.hull = 0
			$.player.killed++
			$.reason = `sunk by the ${sm.name}`
			xvt.outln(`The ${sm.name} sank your ship!`)
			$.sound('bubbles', 15)
			if ($.player.coin.value) {
				$.player.coin.value = 0
				xvt.outln('It gets all your money!')
				xvt.waste(500)
			}
			xvt.outln()
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

	if (a.user == $.player) $.sound('fire')
	xvt.out('\n', xvt.cyan, a.user == $.player ? 'Attacker: ' : 'Defender: ')
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

	xvt.outln('\n')
	if (a === $.online) {
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
	xvt.outln()
	xvt.waste(250)

	return { hits, damage, hull, cannon, ram }
}

//	ram: can he outsmart (+ bigger) avoid your attempt?
function outmaneuvered(dint: number, dhull: number): boolean {
	dint >>= 2
	const outstmart = 100 + dint
	let bigger = $.int(100 * dhull)
	return $.dice(outstmart) + $.dice(bigger) > 66
}

//	sail away: can my ship (+ wit) outrun yours?
function outrun(dhull: number, dint: number): boolean {
	dint = dint > 0 ? dint >>1 : 0
	let run = $.int(50 + (100 * dhull + dint) / 2)
	run = run > 100 ? 100 : run
	return run > $.dice(100)
}

function ram(a: active, d: active) {
	if (a.user.id) xvt.out(xvt.yellow)
	else xvt.out(xvt.bright, xvt.blue)
	xvt.out(`\n${a.user.handle} ${$.what(a, 'ram')}${$.PC.who(d).him}for`)

	let damage = $.dice(a.user.hull / 2) + $.dice(a.hull / 2)
	if (a.user.id) xvt.out(xvt.bright)
	else xvt.out(xvt.cyan)
	xvt.out(` ${damage} `)

	if (a.user.id) xvt.out(xvt.normal)
	else xvt.out(xvt.blue)
	xvt.outln(`hull points of damage!`)
	xvt.waste(500)

	d.hull -= damage
}

}

export = Naval
