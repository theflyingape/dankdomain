/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  ARENA authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import $ = require('../common')
import xvt = require('xvt')
import Battle = require('../battle')

module Arena
{
	let monsters: monster[] = [
		{ name:'Kobold', level:1, pc:'Lizard', weapon:'Dagger', armor:'Wooden Shield', money:'5c' },
		{ name:'Orc', level:3, pc:'Beast', weapon:'Staff', armor:'Wooden Shield', money:'50c' },
		{ name:'Ogre', level:5, pc:'Beast', weapon:'Club', armor:'Large Shield', money:'100c' },
		{ name:'Gnoll', level:7, pc:'Beast', weapon:'Mace', armor:'Leather', money:'500c' },
		{ name:'Troglodyte', level:9, pc:'Beast', weapon:'Spear', armor:'Padded Leather', money:'1000c' },
		{ name:'Gargoyle', level:12, pc:'Demon', weapon:'Axe', armor:-6, money:'10000c',
			spells: [ 'Teleport' ] },
		{ name:'Troll', level:23, pc:'Beast', weapon:'Heavy Crossbow', armor:-12, money:'1s',
			spells:[ 'Heal' ] },
		{ name:'Hydra', 'level':34, pc:'Dragon', weapon:-25, armor:'Dragon Scale Mail', money:'1000s',
			spells: [ 'Heal', 'Teleport', 'Blast' ] },
		{ name:'Nycadaemon', level:41, pc:'Demon', weapon:'Staff of Striking', armor:-18, money:'10g',
			spells: [ 'Heal', 'Teleport', 'Blast' ] },
		{ name:'Red Dragon', level:44, pc:'Dragon', weapon:-32, armor:-20, money:'500g',
			spells: [ 'Heal', 'Teleport', 'Blast' ] },
		{ name:'Lich', level:47, pc:'Undead', weapon:-35, armor:-23, money:'2500g',
			spells: [ 'Heal', 'Teleport', 'Blast' ] },
		{ name:'Beholder', level:50, pc:'Beast', weapon:-40, armor:-25, money:'1p',
			spells: [ 'Heal', 'Teleport', 'Blast' ] },
		{ name:'Demogorgon', level:99, pc:'Beast', weapon:'Staff of the Magi', armor:-25, money:'1000p',
			spells: [ 'Heal', 'Teleport', 'Blast', 'Confusion', 'Transmute', 'Cure', 'Illusion', 'Disintegrate' ] }
	]

	let arena: choices = {
		'U': { description:'User fights' },
		'M': { description:'Monster fights' },
		'J': { description:'Joust users' },
		'C': { description:'Cast a spell' },
		'P': { description:'Poison your weapon' },
		'G': { description:'Goto the square' },
		'Y': { description:'Your status' }
	}

export function menu(suppress = false) {
    xvt.app.form = {
        'menu': { cb:choice, cancel:'q', enter:'?', eol:false }
    }
    xvt.app.form['menu'].prompt = $.display('arena', xvt.Red, xvt.red, suppress, arena)
    xvt.app.focus = 'menu'
}

function choice() {
    let suppress = $.player.expert
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isNotEmpty(arena[choice]))
        xvt.out( ' - ', arena[choice].description, '\n')
    else {
        xvt.beep()
        suppress = false
    }

    switch (choice) {
		case 'C':
			if ($.reason) break
			Battle.cast($.online, menu)
			return

		case 'G':
            require('./square').menu($.player.expert)
            return

		case 'J':
			if (!$.joust) {
				xvt.out('\nYou have run out of jousts.\n')
				suppress = true
				break
			}
			break

		case 'M':
			if (!$.arena) {
				xvt.out('\nYou have no more arena fights.\n')
				suppress = true
				break
			}
			break

		case 'P':
			if ($.reason) break
			Battle.poison($.online, menu)
			return

        case 'Q':
			require('./main').menu($.player.expert)
			return

		case 'U':
			if (!$.arena) {
				xvt.out('\nYou have no more arena fights.\n')
				suppress = true
				break
			}
			break

		case 'Y':
			Battle.yourstats()
			suppress = true
			break
	}
	menu(suppress)
}

function Joust() {
}

function MonsterFights() {
/*
	tty.prompt('Fight what monster', {type:'item', min:1, max:monsters.length, other:'<D> Demon', prompt:'?'})

	if (tty.entry == '?') {
		for (var id in monsters) {
			let monster = monsters[id]
			tty.out((+id+1).toString() + ') level ' + monster.level.toString() + ' ' + monster.name)
			if (monster.spells)
				tty.out(' with ' + monster.spells)
			tty.out(' carrying ' + monster.money)
			let carry = new $.coins(monster.money)
			tty.out(' (', carry.carryout(tty), ') \n')
		}
		tty.pause()
		return
	}

	for (var id in monsters)
		if (+id == +tty.entry - 1)
			break
	if (monsters[id] != undefined)
		tty.out((+id+1).toString(), ') level ', monsters[id].level.toString() , ' ', monsters[id].name, '\n')
	tty.pause()
*/
}

}

export = Arena
