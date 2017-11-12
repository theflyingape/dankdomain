/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  NAVAL authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import {sprintf} from 'sprintf-js'

import $ = require('../common')
import xvt = require('xvt')

module Naval
{
	let monsters: naval[] = require('../etc/naval.json')
	let naval: choices = {
		'S': { description:'Shipyard' },
        'B': { description:'Battle other users' },
        'H': { description:'Hunt sea monsters' },
        'G': { description:'Go fishing' },
        'Y': { description:'Your ship\'s status' },
        'L': { description:'List user ships' }
	}

export function menu(suppress = true) {
    if ($.online.altered) $.saveUser($.player)
	if ($.reason) xvt.hangup()
	$.action('naval')
	xvt.app.form = {
        'menu': { cb:choice, cancel:'q', enter:'?', eol:false }
    }
    xvt.app.form['menu'].prompt = $.display('naval', xvt.Blue, xvt.blue, suppress, naval)
    xvt.app.focus = 'menu'
}

function choice() {
    let suppress = $.player.expert
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isNotEmpty(naval[choice]))
        if (xvt.validator.isNotEmpty(naval[choice].description)) {
            xvt.out(' - ', naval[choice].description)
            suppress = true
        }
    else {
        xvt.beep()
        suppress = false
    }
    xvt.out('\n')

    let rs: any[]

    switch (choice) {
		case 'B':
			if (!$.access.roleplay) break
			break

		case 'G':
			if (!$.access.roleplay) break
			if (!$.player.hull) {
				xvt.out('\nYou don\'t have a ship!\n')
				break
			}
			$.profile({jpg:'naval/mermaid'})
            xvt.app.form = {
                'pause': { cb:menu, pause:true }
            }
            xvt.app.focus = 'pause'
            return

		case 'H':
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
			xvt.out(xvt.Blue, xvt.bright, '\n')
			xvt.out(' ID             Username            Hull     Cannons     Ram\n')
			xvt.out('----     ----------------------     ----     -------     ---\n', xvt.reset)
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
							xvt.out(`You now have a brand new ${$.player.hull} hull point ship, with no ram.\n`)
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
							xvt.out(`\Cannons = ${$.player.cannon}\n`)
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

function MonsterHunt() {

	let mon = +xvt.entry - 1
	let sm = Object.assign({}, monsters[mon])
	let damage: number

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
					if ($.dice(50 + monsters[mon].int / 2) > 50 + (50 * $.online.hull / $.player.hull)) {
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

	function you(): boolean {
		let result = fire($.online, <active>{ hull:sm.hull, user:{ id:'', handle:sm.name, hull:-1, cannon:0, ram:false } })
		if ((sm.hull -= result.damage) > 0) {
			return false
		}
		else {
			sm.hull = 0
			$.sound('booty', 5)
			let coin = new $.coins(sm.money)
			coin.value = $.worth(coin.value, $.online.cha)
			xvt.out('You get ', coin.carry(), ' for bringing home the carcass.\n')
			$.player.coin.value += coin.value
			xvt.waste(500)
			return true
		}
	}

	function it(): boolean {
		let damage = 0
		for (let i = 0; i < sm.shot; i++)
			damage += $.dice(sm.powder) + $.dice(sm.powder)

		xvt.out(xvt.bright, xvt.blue, `The ${sm.name} attacks your ship, causing`
			, xvt.cyan, ` ${damage} `
			, xvt.blue, `hull points of damage.`)
		xvt.out(xvt.reset, '\n')
		xvt.waste(250)
	
		if (($.online.hull -= damage) > 0) {
			return false
		}
		else {
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
				if (n < 50 || d.user.hull < 1) {
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

}

export = Naval
