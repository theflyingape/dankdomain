/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  DUNGEON authored by: Robert Hurst <theflyingape@gmail.com>               *
\*****************************************************************************/

import fs = require('fs')

import $ = require('../common')
import Battle = require('../battle')
import xvt = require('xvt')

module Dungeon
{
	let dank: number
	let level: number
	let monsters: monster = require('../etc/dungeon.json')

	let dungeon: choices = {
		'N': { description:'orth' },
		'S': { description:'outh' },
		'E': { description:'ast' },
		'W': { description:'est' },
		'M': { description:'ap' },
		'C': { description:'ast a spell' },
		'P': { description:'oison your weapon' },
		'Y': { description:'our status' }
	}

export function DeepDank(suppress = false) {
	dank = 0
	level = $.player.level - 1
	menu(suppress)
}

export function menu(suppress = false) {
	if ($.player.level + 1 < $.sysop.level) $.checkXP($.online, menu)
	if ($.online.altered) $.saveUser($.player)
	if ($.reason) xvt.hangup()

	$.action('dungeon')
	xvt.app.form = {
        'command': { cb:command, prompt:':', enter:'?', eol:false }
    }
    xvt.app.focus = 'command'
}

function command() {
    let suppress = $.player.expert
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isNotEmpty(dungeon[choice]))
        xvt.out(dungeon[choice].description, '\n')
    else {
        xvt.beep()
        suppress = false
    }

    switch (choice) {
		case 'N':
		case 'S':
		case 'E':
		case 'W':
			if ($.dice(100) == 100) {
				$.sound('teleport')
				require('./main').menu($.player.expert)
				return
			}
			if ($.dice(10) == 1) {
				if ($.dice(2) == 1) {
					xvt.out(xvt.magenta, '^>', xvt.bright, xvt.white, ' Oof! ', xvt.normal, xvt.magenta,'<^  ', xvt.reset
						, 'There is a wall to the ', choice.toLowerCase(), dungeon[choice].description,'.')
					xvt.waste(250)
					if (($.online.hp -= $.dice(Math.trunc($.player.level * (110 - $.online.str) / 100) + 1)) < 1) {
						xvt.out('\n')
						xvt.waste(250)
						xvt.out(xvt.bright, xvt.yellow, 'You take too many hits and die.\n', xvt.reset)
						xvt.waste(250)
						$.reason = 'banged head against a wall'
						xvt.hangup()
						return
					}
				}
				else {
					xvt.out(xvt.bright, xvt.yellow, '\nYou\'ve fallen down a level!\n', xvt.reset)
					level++
				}
			}
			if ($.dice(3) == 1) {
				xvt.out('\nThere\'s something lurking in here . . . \n')
				let monster: active[] = new Array()
				let n = 0
				do {
					monster.push(<active>{})
					monster[n].user = <user>{id: ''}
					let mon = level + $.dice(7) - 4
					mon = mon < 0 ? 0 : mon >= Object.keys(monsters).length ? Object.keys(monsters).length - 1 : mon
					let dm = Object.keys(monsters)[mon]
					monster[n].user.handle = dm
					monster[n].user.sex = 'I'
					$.reroll(monster[n].user, monsters[dm].pc ? monsters[dm].pc : $.player.pc, mon)
					monster[n].user.weapon = monsters[dm].weapon ? monsters[dm].weapon : mon >>1
					monster[n].user.armor = monsters[dm].armor ? monsters[dm].armor : mon >>2
					monster[n].user.hp >>= 3
					monster[n].user.sp >>= 3
					monster[n].user.poisons = []
					if (monsters[dm].poisons)
						for (let vials in monsters[dm].poisons)
							$.Poison.add(monster[n].user.poisons, monsters[dm].poisons[vials])
					monster[n].user.spells = []
					if (monsters[dm].spells)
						for (let magic in monsters[dm].spells)
							$.Magic.add(monster[n].user.spells, monsters[dm].spells[magic])

					$.activate(monster[n])
					monster[n].user.coin = new $.coins($.money(mon))

					if (n == 0) {
						let img = 'dungeon/' + monster[n].user.handle
						try {
							fs.accessSync('images/' + img + '.jpg', fs.constants.F_OK)
							$.profile({ jpg:img })
						} catch(e) {
							$.profile({ png:'monster/' + monster[n].user.pc.toLowerCase() })
						}
					}
					$.cat('dungeon/' + monster[n].user.handle)

					xvt.out(xvt.reset, '\nIt\'s', $.an(monster[n].user.handle), '!')
					xvt.waste(500)
					xvt.out('  And it doesn\'t look friendly.\n')
					xvt.waste(500)

					if (isNaN(+monster[n].user.weapon)) xvt.out('\n', $.who(monster[n], 'He'), $.Weapon.wearing(monster[n]), '.\n')
					if (isNaN(+monster[n].user.armor)) xvt.out('\n', $.who(monster[n], 'He'), $.Armor.wearing(monster[n]), '.\n')
				} while (++n < 3 && $.dice(3) == 1)

				//  paint the mob classes
				if (n > 1) {
					let m = {}
					for (let i = 0; i < n; i++)
						m['mob' + (i+1)] = 'monster/' + monster[i].user.pc.toLowerCase()
					$.profile(m)
				}

				Battle.engage('Dungeon', $.online, monster, menu)
				return
			}
			break

		case 'C':
			Battle.cast($.online, menu)
			return

		case 'P':
			Battle.poison($.online, menu)
			return

		case 'Q':
			if ($.Access.name[$.player.access].sysop) {
				require('./main').menu($.player.expert)
				return
			}

		case 'Y':
			Battle.yourstats()
			break

		default:
			xvt.beep()
    	    suppress = false
	}
	menu(suppress)
}

}

export = Dungeon
