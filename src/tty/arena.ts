/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  ARENA authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import {sprintf} from 'sprintf-js'

import $ = require('../common')
import db = require('../database')
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
    let suppress = true
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isNotEmpty(arena[choice]))
        if (xvt.validator.isNotEmpty(arena[choice].description)) xvt.out(' - ', arena[choice].description, '\n')

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
				break
			}
			Battle.user('Joust', (opponent: active) => {
				if (opponent.user.id === '') {
					menu(!$.player.expert)
					return
				}
				if (opponent.user.id === $.player.id) {
					opponent.user.id = ''
					xvt.out('You can\'t joust a wimp like ', $.who(opponent.user, true, false, false), '.\n')
					menu(true)
					return
				}
				if ($.player.level - opponent.user.level > 3) {
					xvt.out('You can only joust someone higher or up to three levels below you.\n')
					menu(true)
					return
				}

				let ability = $.online.dex * $.player.level / 10 + 2 * $.player.jw - $.player.jl + 10
				let versus = opponent.dex * opponent.user.level / 10 + 2 * opponent.user.jw - opponent.user.jl + 10
				let factor = (100 - ($.player.level > opponent.user.level ? $.player.level : opponent.user.level)) / 10 + 3
				let jw = 0
				let jl = 0
				let pass = 0

				if (!$.Access.name[opponent.user.access].roleplay || versus < 1 || opponent.user.level
 > 1 && (opponent.user.jw + 3 * opponent.user.level) < opponent.user.jl) {
					xvt.out('That knight is out practicing right now.\n')
					menu(true)
					return
				}

				xvt.out('\nJousting ability:\n\n', xvt.bright)
				xvt.out(xvt.green, sprintf('%-25s', opponent.user.handle), xvt.white, sprintf('%4d', versus), '\n')
				xvt.out(xvt.green, sprintf('%-25s', $.player.handle), xvt.white, sprintf('%4d', ability), '\n')
				xvt.out(xvt.reset, '\n')
				if((ability + factor * $.player.level) < (versus + 1)) {
					xvt.out(opponent.user.handle, ' laughs rudely in your face!\n\n')
					menu(true)
					return
				}

				xvt.app.form = {
					'compete': { cb:() => {
						xvt.out('\n')
						if (/Y/i.test(xvt.entry)) {
							$.joust--
							$.online.altered = true
							xvt.out('\nThe trumpets blare! You and your opponent ride into the arena. The crowd roars!\n')
							round()
							xvt.app.focus = 'joust'
							return
						}
						menu(true)
						return
					}, prompt:'Are you sure (Y/N)? ', enter:'N', eol:false, match:/Y|N/i },
					'joust': { cb:() => {
						if (/F/i.test(xvt.entry)) {
							xvt.out('\n\nThe crowd throws rocks at you as you ride out of the arena.\n')
							$.player.jl++
							opponent.user.jw++
							db.saveUser(opponent)
							menu(true)
							return
						}
						if (/J/i.test(xvt.entry)) {
							xvt.out('\n\nYou spur the horse.  The tension mounts.\n')
							xvt.waste(250)
							let result = 0
							while(!result)
								result = (ability + $.dice(factor * $.player.level)) - (versus + $.dice(factor * opponent.user.level))
							if(result > 0) {
								xvt.out(xvt.green, '-*>', xvt.bright, xvt.white, ' Thud! ', xvt.nobright, xvt.green,'<*-  ', xvt.reset, 'A hit!  You win this pass!\n')
								if (++jw == 3) {
									xvt.out('\nYou have won the joust!\n')
									xvt.waste(250)
									xvt.out('The crowd cheers!\n')
									xvt.waste(250)
									let reward = new $.coins($.money(opponent.user.level))
									xvt.out('You win ', reward.carry(), '!\n')
									$.player.coin.value += reward.value
									$.player.jw++
									opponent.user.jl++
									db.saveUser(opponent)
									menu(true)
									return
								}
							}
							else {
								xvt.out(xvt.magenta, '^>', xvt.bright, xvt.white, ' Oof! ', xvt.nobright, xvt.magenta,'<^  ', xvt.reset, $.who(opponent.user, true, true, false), 'hits!  You lose this pass!\n')
								if (++jl == 3) {
									xvt.out('\nYou have lost the joust!\n')
									xvt.waste(250)
									xvt.out('The crowd boos you!\n')
									xvt.waste(250)
									let reward = new $.coins($.money($.player.level))
									xvt.out(opponent.user.handle, ' spits on your face.\n')
									$.player.jl++
									opponent.user.coin.value += reward.value
									opponent.user.jw++
									db.saveUser(opponent)
									menu(true)
									return
								}
							}
							round()
						}
						xvt.app.refocus()
					}, prompt:xvt.attr('        ', $.bracket('J', false), xvt.bright, xvt.yellow, ' Joust', xvt.nobright, xvt.magenta, ' * ', $.bracket('F', false), xvt.bright, xvt.yellow, ' Forfeit: '), cancel:'F', enter:'J', eol:false, match:/F|J/i }
				}
				xvt.out('You grab a horse and prepare yourself to joust.\n')
				xvt.app.focus = 'compete'

				function round() {
					xvt.out('\n', xvt.green, '--=:)) Round ', ['I', 'II', 'III', 'IV', 'V'][pass++], ' of V: Won:', xvt.bright, xvt.white, jw.toString(), xvt.nobright, xvt.magenta, ' ^', xvt.green, ' Lost:', xvt.bright, xvt.white, jl.toString(), xvt.nobright, xvt.green, ' ((:=--')
				}
			})
			return

		case 'M':
			if (!$.arena) {
				xvt.out('\nYou have no more arena fights.\n')
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
				break
			}
			break

		case 'Y':
			Battle.yourstats()
			break

		default:
			xvt.beep()
    	    suppress = false
	}
	menu(suppress)
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
