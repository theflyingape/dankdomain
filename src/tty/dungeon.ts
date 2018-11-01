/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  DUNGEON authored by: Robert Hurst <theflyingape@gmail.com>               *
\*****************************************************************************/

import fs = require('fs')

import $ = require('../common')
import Battle = require('../battle')
import xvt = require('xvt')
import { PortInfo } from 'aws-sdk/clients/lightsail';


module Dungeon
{
	let fini: Function
	let monsters: monster = require('../etc/dungeon.json')
	let party: active[]
	let potions: vial[] = []
	let tl: number

	let looked: boolean
	let pause: boolean
	let refresh: boolean
	let skillkill: boolean

	let paper: string[]
	let dot = xvt.Empty[$.player.emulation]
	let dd = new Array(10)
	let deep: number
	let DL: ddd
	let ROOM: room
	let Z: number
	let Y: number
	let X: number

    //  £
    const Cleric = {
        VT: '\x1B(0\x7D\x1B(B',
        PC: '\x9C',
        XT: '\u00A3',
        dumb: '$'
    }

    //  ±
    const Teleport = {
        VT: '\x1B(0\x67\x1B(B',
        PC: '\xF1',
        XT: '\u00B1',
        dumb: '%'
    }

	let crawling: choices = {
		'N': { description:'orth' },
		'S': { description:'outh' },
		'E': { description:'ast' },
		'W': { description:'est' },
		'M': { description:'' },
		'C': { description:'' },
		'P': { description:'' },
		'Y': { description:'' }
	}

	const iii = ['I','II','III','IV','V','VI','VII','VIII','IX','X']
	const potion = [
		'Potion of Cure Light Wounds',
		'Vial of Weakness',
		'Potion of Charm',
		'Vial of Stupidity',
		'Potion of Agility',
		'Vial of Clumsiness',
		'Potion of Wisdom',
		'Vile Vial',
		'Potion of Stamina',
		'Vial of Slaad Secretions',
		'Potion of Mana',
		'Flask of Fire Water',
		'Elixir of Restoration',
		'Vial of Crack',
		'Potion of Augment',
		'Beaker of Death'
	]
	//	make some magic brew & bottle it up . . . 
	let containers = [ 'beaker filled with', 'bottle containing', 'flask of', 'vial holding' ]
	let v = 0
	while (containers.length) {
		let c = $.dice(containers.length) - 1
		let liquids = [ 'bubbling', 'clear', 'milky', 'sparkling' ]
		let colors = [ 'amber', 'sapphire', 'crimson', 'emerald', 'amethyst' ]
		let coded = [ xvt.yellow, xvt.blue, xvt.red, xvt.green, xvt.magenta ]
		while (liquids.length) {
			let l = $.dice(liquids.length) - 1
			let i = $.dice(colors.length) - 1
			potions.push({ potion: v++, identified: false
				, image: 'potion/' + (containers[c].startsWith('beaker') ? 'beaker' :  colors[i])
				, description: xvt.attr(xvt.uline, containers[c], xvt.nouline, ' a ', liquids[l], ' ', coded[i], colors[i]) })
			liquids.splice(l, 1)
			colors.splice(i, 1)
			coded.splice(i, 1)
		}
		containers.splice(c, 1)
	}

export function DeepDank(start: number, cb: Function) {
	looked = false
	pause = false
	skillkill = false

	party = []
	party.push($.online)
	tl = Math.round((xvt.sessionAllowed - ((new Date().getTime() - xvt.sessionStart.getTime()) / 1000)) / 60)

	deep = 0
	Z = start < 0 ? 0 : start > 99 ? 99 : start
	fini = cb

	if (!$.access.sysop) delete crawling['M']
	generateLevel()
	menu()
}

//	check player status: level up, changed, dead
//	did player cast teleport?
//	did player enter a room?
//	does last output(s) need a pause?
//	is a redraw needed?
//	is a monster spawning needed?
//	position Hero and get user command
export function menu(suppress = false) {
//	check player status: level up, changed, dead
	if ($.player.level + 1 < $.sysop.level) {
		if ($.checkXP($.online, menu)) {
			pause = true
			return
		}
		else if ($.jumped > (19 - deep)) skillkill = true
	}

	if ($.online.altered) $.saveUser($.player)
	if ($.reason) xvt.hangup()

//	did player cast teleport?
	if (!Battle.retreat && Battle.teleported) {
		Battle.teleported = false
		teleport()
		return
	}

//	did player just do something eventful worthy of a big bonus?
	if (skillkill) {
        $.sound('winner')
		skillkill = false
		$.skillplus($.online, menu)
		return
	}

//	did player enter a new room (or complete what's in it)?
	if (!looked)
		if (!(looked = doMove()))
			return

//	does last output(s) need a pause?
	if (pause) {
		pause = false
		xvt.app.form = {
			'pause': { cb: () => {
				$.action('nme')
				menu()
			}, cancel:' ', enter:'\x0D', pause:true, timeout:10 }
		}
		xvt.app.focus = 'pause'
		return
	}

//	is a redraw needed?
	if (process.stdout.rows && process.stdout.rows !== $.player.rows) {
		$.player.rows = process.stdout.rows
		refresh = true
	}
	if (refresh) {
		drawLevel()
		refresh = false
	}

//	is a monster spawning needed?
	let x = $.dice(DL.width) - 1, y = $.dice(DL.rooms.length) - 1
	if ($.dice($.online.cha) < Z / (deep + 2)) {
		let d = Math.round($.online.cha / 19) + 2
		y = Y + ($.dice(d) - 1) - ($.dice(d) - 1)
		if (y < 0 || y >= DL.rooms.length)
			y = $.dice(DL.rooms.length) - 1
		d++
		x = X + ($.dice(d) - 1) - ($.dice(d) - 1)
		if (x < 0 || x >= DL.width)
			x = $.dice(DL.width) - 1
	}
	ROOM = DL.rooms[y][x]
	if ($.dice(DL.spawn * (ROOM.type == 0 ? 2 : ROOM.type == 3 ? 1 : 3)) == 1) {
		let s = $.dice(5) - 1
		xvt.out(xvt.reset, '\n', xvt.faint, ['Your skin crawls'
			, 'Your pulse quickens', 'You feel paranoid', 'Your grip tightens'
			, 'You stand ready'][s], ' when you hear a')
		if (s == 1) $.sound('pulse')
		switch ($.dice(5)) {
			case 1:
				if (s == 0) $.sound('creak' + $.dice(2))
				xvt.out('n eerie, creaking noise')
				break
			case 2:
				if (s == 2) $.sound('thunder')
				xvt.out(' clap of thunder')
				break
			case 3:
				if (s == 3) $.sound('ghostly')
				xvt.out(' ghostly whisper')
				break
			case 4:
				if (s == 4) $.sound('growl')
				xvt.out(' beast growl')
				break
			case 5:
				$.sound('laugh')
				xvt.out(' maniacal laugh')
				break
		}
		if (Math.abs(Y - y) < 3 && Math.abs(X - x) < 3)
			xvt.out(' nearby!\n')
		else if (Math.abs(Y - y) < 6 && Math.abs(X - x) < 6)
			xvt.out(' off in the distance.\n')
		else
			xvt.out(' as a faint echo.\n')

		if (putMonster(y, x)) {
			if (DL.map > 1)
				drawRoom(y, x)
			if (ROOM.occupant == 6 && DL.cleric.hp) {
				$.sound('agony', 10)
				xvt.out(xvt.reset, xvt.bright, xvt.yellow, 'You hear a dying cry of agony!!\n', xvt.reset)
				xvt.waste(1000)
				DL.cleric.hp = 0
				DL.cleric.sp = 0
				DL.cleric.user.status='dead'
				ROOM.giftItem = 'chest'
				ROOM.giftValue = 0
				DL.cleric.user.coin.value = 0
				if (DL.map > 1) {
					drawRoom(y, x)
					xvt.waste(1000)
				}
				$.beep()
			}
			//	look who came for dinner?
			if (y == Y && x == X) {
				looked = false
				menu()
				return
			}
		}
	}

//	position Hero and get user command
	$.action('dungeon')
	drawHero()

	x = $.online.cha * $.online.int / 10 + $.online.dex / (deep + 1) - DL.moves + deep
	if ($.player.level / 9 - deep > $.Security.name[$.player.security].protection + 1)
		x /= $.player.level
	if (x < 5) x = 5
	if ($.dice(x) == 1) {
		switch ($.dice(5)) {
			case 1:
				xvt.out(xvt.faint, 'A bat flies by and soils your ', xvt.normal)
				$.sound('splat', 4)
				$.player.toAC -= $.dice(deep)
				xvt.out($.player.armor, $.buff($.player.toAC, $.online.toAC))
				break
			case 2:
				xvt.out(xvt.blue, 'A drop of acid water lands on your ')
				$.sound('drop', 4)
				$.player.toWC -= $.dice(deep)
				xvt.out($.player.weapon, $.buff($.player.toWC, $.online.toWC))
				break
			case 3:
				xvt.out(xvt.yellow, 'You trip on the rocky surface and hurt yourself.')
				$.sound('hurt', 5)
				$.online.hp -= $.dice(Z)
				if ($.online.hp < 1) {
					$.death('fell down')
					xvt.hangup()
				}
				break
			case 4:
				xvt.out(xvt.bright, xvt.red, 'You are attacked by a swarm of bees.')
				$.sound('crack', 12)
				for (x = 0, y = $.dice(Z); x < y; x++)
					$.online.hp -= $.dice(Z)
				if ($.online.hp < 1) {
					$.death('killer bees')
					xvt.hangup()
				}
				break
			case 5:
				$.music('.')
				xvt.out(xvt.bright, xvt.white, 'A bolt of lightning strikes you.')
				$.player.toAC -= $.dice($.online.armor.ac / 2)
				$.online.toAC -= $.dice($.online.armor.ac / 2)
				$.player.toWC -= $.dice($.online.weapon.wc / 2)
				$.online.toWC -= $.dice($.online.weapon.wc / 2)
				$.online.hp -= $.dice($.player.hp / 2)
				$.sound('boom', 10)
				if ($.online.hp < 1) {
					$.death('struck by lightning')
					xvt.hangup()
				}
				break
		}
		if ($.online.weapon.wc > 0 && $.online.weapon.wc + $.online.toWC + $.player.toWC < 0) {
			xvt.out(`\nYour ${$.player.weapon} is damaged beyond repair; you toss it aside.`)
			$.Weapon.equip($.online, $.Weapon.merchant[0])
		}
		if ($.online.armor.ac > 0 && $.online.armor.ac + $.online.toAC + $.player.toAC < 0) {
			xvt.out(`\nYour ${$.player.armor} is damaged beyond repair; you toss it aside.`)
			$.Armor.equip($.online, $.Armor.merchant[0])
		}
		xvt.out(xvt.reset, '\n')
	}

	xvt.out('\x06')     //  insert any wall messages here

	//	user input
	xvt.app.form = {
		'command': { cb:command, cancel:'Y', enter:'?', eol:false, timeout:20 }
	}
	xvt.app.form['command'].prompt = ''
	if (suppress)
		xvt.app.form['command'].prompt += ':'
	else {
		if ($.player.magic && $.player.spells.length)
			xvt.app.form['command'].prompt += xvt.attr(
				$.bracket('C', false), xvt.cyan, 'ast, '
			)
		if ($.player.poison && $.player.poisons.length)
			xvt.app.form['command'].prompt += xvt.attr(
				$.bracket('P', false), xvt.cyan, 'oison, '
			)
		if (Y > 0 && DL.rooms[Y][X].type !== 2)
			if (DL.rooms[Y - 1][X].type !== 2)
				xvt.app.form['command'].prompt += xvt.attr(
					$.bracket('N', false), xvt.cyan, 'orth, '
				)
		if (Y < DL.rooms.length - 1 && DL.rooms[Y][X].type !== 2)
			if (DL.rooms[Y + 1][X].type !== 2)
				xvt.app.form['command'].prompt += xvt.attr(
					$.bracket('S', false), xvt.cyan, 'outh, ',
				)
		if (X < DL.width - 1 && DL.rooms[Y][X].type !== 1)
			if (DL.rooms[Y][X + 1].type !== 1)
				xvt.app.form['command'].prompt += xvt.attr(
					$.bracket('E', false), xvt.cyan, 'ast, ',
				)
		if (X > 0 && DL.rooms[Y][X].type !== 1)
			if (DL.rooms[Y][X - 1].type !== 1)
				xvt.app.form['command'].prompt += xvt.attr(
					$.bracket('W', false), xvt.cyan, 'est, ',
				)

		xvt.app.form['command'].prompt += xvt.attr(
			$.bracket('Y', false), xvt.cyan, 'our status: '
		)
	}
	xvt.app.focus = 'command'
}

function command() {
	let suppress = $.player.expert
	let choice = xvt.entry.toUpperCase()
	if (/\[.*\]/.test(xvt.terminator)) {
		choice = 'NSEW'['UDRL'.indexOf(xvt.terminator[1])]
		if (choice)
			xvt.out(choice)
		else {
			menu(true)
			return
		}
	}
	if (xvt.validator.isNotEmpty(crawling[choice])) {
		xvt.out(crawling[choice].description)
		DL.moves++
		if (DL.spawn > 2 && !(DL.moves % DL.width))
			DL.spawn--
		//	old cleric mana recovery
		if (!DL.cleric.user.status && DL.cleric.sp < DL.cleric.user.sp) {
			DL.cleric.sp += 10 * $.dice(deep) + $.dice(Z / 2)
			if (DL.cleric.sp > DL.cleric.user.sp) DL.cleric.sp = DL.cleric.user.sp
		}
	}
	else {
		xvt.beep()
		menu(false)
		return
	}
	xvt.out('\n')

    switch (choice) {
	case 'M':	//	#tbt
		DL.map = 3
		refresh = true
		break

	case 'C':
		Battle.retreat = false
		Battle.cast($.online, menu, undefined, undefined, DL)
		return

	case 'P':
		Battle.poison($.online, menu)
		return

	case 'Y':
		xvt.out('\n')
		Battle.yourstats(false)
		break

	case 'N':
		if (Y > 0 && DL.rooms[Y][X].type !== 2)
			if (DL.rooms[Y - 1][X].type !== 2) {
				drawRoom(Y, X)
				Y--
				looked = false
				break
			}
		oof('north')
		break

	case 'S':
		if (Y < DL.rooms.length - 1 && DL.rooms[Y][X].type !== 2)
			if (DL.rooms[Y + 1][X].type !== 2) {
				drawRoom(Y, X)
				Y++
				looked = false
				break
			}
		oof('south')
		break

	case 'E':
		if (X < DL.width - 1 && DL.rooms[Y][X].type !== 1)
			if (DL.rooms[Y][X + 1].type !== 1) {
				drawRoom(Y, X)
				X++
				looked = false
				break
			}
		oof('east')
		break

	case 'W':
		if (X > 0 && DL.rooms[Y][X].type !== 1)
			if (DL.rooms[Y][X - 1].type !== 1) {
				drawRoom(Y, X)
				X--
				looked = false
				break
			}
		oof('west')
		break
	}

	menu(suppress)
}

function oof(wall:string) {
	$.sound('wall')
	xvt.out(xvt.bright, xvt.yellow, 'Oof!  There is a wall to the ', wall, '.\n', xvt.reset)
	xvt.waste(600)
	if (($.online.hp -= $.dice(deep + Z + 1)) < 1) {
		xvt.out('\nYou take too many hits and die!\n\n')
		xvt.waste(500)
		$.death(Battle.retreat ? 'running into a wall' : 'banged head against a wall')
		xvt.hangup()
	}
}

//	look around, return whether done or not
function doMove(): boolean {
	ROOM = DL.rooms[Y][X]
	if (!ROOM.map) {
		if ($.online.int > 49)
			ROOM.map = true
	}
	else {
		DL.moves++	//	backtracking
		if (DL.spawn > 2 && !(DL.moves % DL.width))
			DL.spawn--
	}

	//	nothing special in here, done
	if (!ROOM.occupant && !ROOM.monster.length && !ROOM.giftItem)
		return true

	//	old cleric mana recovery
	if (!DL.cleric.user.status && DL.cleric.sp < DL.cleric.user.sp) {
		DL.cleric.sp += DL.cleric.user.level + deep
		if (DL.cleric.sp > DL.cleric.user.sp) DL.cleric.sp = DL.cleric.user.sp
	}

	xvt.out(xvt.reset, '\n')
	if (looked) return true

	//	monsters?
	if (ROOM.monster.length) {
		$.action('battle')
		xvt.save()
		xvt.out(`\x1B[1;${$.player.rows}r`)
		xvt.restore()
		refresh = true

		if (ROOM.monster.length == 1) {
			xvt.out('There\'s something lurking in here . . . \n')
			let img = 'dungeon/' + ROOM.monster[0].user.handle
			try {
				fs.accessSync('door/static/images/' + img + '.jpg', fs.constants.F_OK)
				$.profile({ jpg:img, effect:ROOM.monster[0].effect })
			} catch(e) {
				if ($.PC.name['player'][ROOM.monster[0].user.pc] && ROOM.monster[0].user.pc === $.player.pc)
					$.profile({ png: 'player/' + $.player.pc.toLowerCase() + ($.player.gender === 'F' ? '_f' : ''), effect:ROOM.monster[0].effect })
				else
					$.profile({
						png:'monster/' + ($.PC.name['monster'][ROOM.monster[0].user.pc] || $.PC.name['tavern'][ROOM.monster[0].user.pc] ? ROOM.monster[0].user.pc.toLowerCase() : 'monster'),
						effect:ROOM.monster[0].effect
					})
			}
		}
		else {
			xvt.out('There\'s a party waiting for '
				, ['you', 'the main course', 'the entertainment', 'meat', 'a good chew'][$.dice(5) - 1]
				, ' . . . \n')
			let m = {}
			for (let i = 0; i < ROOM.monster.length; i++)
				m['mob' + (i+1)] = 'monster/' + ($.PC.name['monster'][ROOM.monster[i].user.pc] || $.PC.name['tavern'][ROOM.monster[i].user.pc] ? ROOM.monster[i].user.pc.toLowerCase() : 'monster')
			$.profile(m)
		}
		xvt.waste(1000)

		for (let n = 0; n < ROOM.monster.length; n++) {
			if (ROOM.monster.length < 4) {
				$.cat('dungeon/' + ROOM.monster[n].user.handle)
				xvt.out(xvt.reset, '\n')
			}

			let what = ROOM.monster[n].user.handle
			if (ROOM.monster[n].user.xplevel > 0)
				what = [xvt.attr(xvt.faint, 'lesser '), '', xvt.attr(xvt.bright, xvt.white, 'greater ')]
					[ROOM.monster[n].user.xplevel - ROOM.monster[n].user.level + 1] + what
			xvt.out('It\'s', $.an(what), xvt.reset, '... ')
			xvt.waste(ROOM.monster.length < 4 ? 400 : 100)

			if ($.player.novice || ($.dice(ROOM.monster[n].user.xplevel / 5 + 5) * (101 - $.online.cha + deep) > 1)) {
				if (ROOM.monster[n].user.xplevel > 0)
					xvt.out('and it doesn\'t look friendly.\n')
				else
					xvt.out('and it looks harmless, for now.\n')
				if (isNaN(+ROOM.monster[n].user.weapon)) xvt.out('\n', $.who(ROOM.monster[n], 'He'), $.Weapon.wearing(ROOM.monster[n]), '.\n')
				if (isNaN(+ROOM.monster[n].user.armor)) xvt.out('\n', $.who(ROOM.monster[n], 'He'), $.Armor.wearing(ROOM.monster[n]), '.\n')
			}
			else {
				xvt.out(xvt.bright, 'and it\'s '
					, [ 'bewitched', 'charmed', 'dazzled', 'impressed', 'seduced' ][$.dice(5) - 1]
					, ' by your '
					, [ 'awesomeness', 'elegance', 'presence', $.player.armor, $.player.weapon ][$.dice(5) - 1]
					, '!', xvt.reset, '\n')
				ROOM.monster[n].user.handle = xvt.attr(xvt.faint, 'your ', xvt.normal, ROOM.monster[n].user.handle)
				ROOM.monster[n].user.gender = 'FM'[$.dice(2) - 1]
				ROOM.monster[n].user.pc = Object.keys($.PC.name['player'])[0]
				ROOM.monster[n].user.xplevel = 0
				party.push(ROOM.monster[n])
				ROOM.monster.splice(n, 1)
			}
			xvt.waste(ROOM.monster.length < 4 ? 400 : 100)
		}

		if (ROOM.monster.length) {
			Battle.engage('Dungeon', party, ROOM.monster, doSpoils)
			return false
		}

		pause = true
		return true
	}

	//	npc?
	switch (ROOM.occupant) {
		case 1:
			if ($.dice(100 - Z) > 1) {
				xvt.out('You have stepped onto a trapdoor!\n\n')
				xvt.waste(300)
				let u = ($.dice(128 + deep - ($.player.backstab <<1) - ($.player.steal <<2) - DL.map) < $.online.dex)
				for (let m = party.length - 1; m > 0; m--) {
					if ($.dice(120) < party[m].dex)
						xvt.out(xvt.reset, party[m].user.handle, ' manages to catch the edge and stop from falling.\n')
					else {
						xvt.out(xvt.yellow, party[m].user.handle, xvt.bright, ' falls down a level!\n')
						if (u) party.splice(m, 1)
					}
					xvt.waste(300)
				}
				if (u) {
					xvt.out(xvt.reset, 'You manage to catch the edge and stop yourself from falling.\n')
					ROOM.occupant = 0
				}
				else {
					party = []
					party.push($.online)
					xvt.out(xvt.bright, xvt.yellow, 'You fall down a level!\n', xvt.reset)
					xvt.waste(600)
					if ($.dice(100 + Z - $.player.level) > $.online.dex - DL.map) {
						if ($.dice($.online.cha / 10 + deep) <= (deep + 1))
							$.player.toWC -= $.dice(Math.abs(Z - $.player.level))
						$.online.toWC -= $.dice(Math.round($.online.weapon.wc / 10) + 1)
						xvt.out(`Your ${$.player.weapon} is damaged from the fall!\n`)
					}
					if ($.dice(100 + Z - $.player.level) > $.online.dex - DL.map) {
						if ($.dice($.online.cha / 10 + deep) <= (deep + 1))
							$.player.toAC -= $.dice(Math.abs(Z - $.player.level))
						$.online.toAC -= $.dice(Math.round($.online.armor.ac / 10) + 1)
						xvt.out(`Your ${$.player.armor} is damaged from the fall!\n`)
					}
					Z++
					generateLevel()
					pause = true
					menu()
					return false
				}
			}
			else {
				ROOM.occupant = 0
				if ($.dice(50 + Z - deep) > $.online.cha)
					xvt.out(xvt.bright, xvt.cyan, 'A fairie flies by you.\n')
				else {
					xvt.out(xvt.bright, xvt.cyan, 'A fairie brushes by you.\n')
					$.sound('heal')
					for (let i = 0; i <= Z; i++)
						$.online.hp += $.dice($.int(DL.cleric.user.level / 9)) + $.dice($.int(Z / 9 + deep / 3))
					if ($.online.hp > $.player.hp) $.online.hp = $.player.hp
					if ($.player.magic > 1) {
						for (let i = 0; i <= Z; i++)
							$.online.sp += $.dice($.int(DL.cleric.user.level / 9)) + $.dice($.int(Z / 9 + deep / 3))
						if ($.online.sp > $.player.sp) $.online.sp = $.player.sp
					}
					if (!DL.cleric.user.status && DL.cleric.sp < DL.cleric.user.sp) {
						DL.cleric.sp += $.Magic.power(DL.cleric, 7)
						if (DL.cleric.sp > DL.cleric.user.sp) DL.cleric.sp = DL.cleric.user.sp
					}
				}
			}
			break

		case 2:
			$.action('yn')
			$.profile({ jpg:'ddd', effect:'fadeIn' })
			xvt.out(xvt.bright, xvt.blue, 'You\'ve found a portal to a deep, dank dungeon.')
			xvt.app.form = {
				'deep': { cb: () => {
					ROOM.occupant = 0
					xvt.out('\n')
					if (/Y/i.test(xvt.entry)) {
						$.animated('flipOutY')
						xvt.out(xvt.bright, 'You vanish into the other dungeon...')
						$.sound('portal', 12)
						deep++
						generateLevel()
					}
					else
						$.animated('fadeOut')
					menu()
				}, prompt:'Descend even deeper (Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:10 }
			}
			xvt.app.focus = 'deep'
			return false

		case 3:
			xvt.save()
			xvt.out(`\x1B[1;${$.player.rows}r`)
			xvt.restore()
			$.music('well')
			xvt.waste(600)
			xvt.out(xvt.magenta, 'You have found a legendary Wishing Well.\n')
			xvt.waste(600)
			xvt.out('\n'); xvt.waste(600)			
			xvt.out(xvt.bright, xvt.yellow, 'What do you wish to do?\n', xvt.reset)
			xvt.waste(600)

			let well = 'BCDFORT'
			xvt.out($.bracket('B'), 'Bless yourself')
			xvt.out($.bracket('C'), 'Curse another player')
			xvt.out($.bracket('D'), 'Destroy dank dungeon')
			xvt.out($.bracket('F'), 'Fix all your damage')
			xvt.out($.bracket('O'), 'Teleport all the way out')
			xvt.out($.bracket('R'), 'Resurrect all the dead players')
			xvt.out($.bracket('T'), 'Teleport to another level')
			if (deep > 1) { xvt.out($.bracket('L'), 'Loot another player\'s money'); well += 'L' }
			if (deep > 3) { xvt.out($.bracket('G'), 'Grant another call'); well += 'G' }
			if (deep > 5) { xvt.out($.bracket('K'), 'Key hint(s)'); well += 'K' }
			if (deep > 7) { xvt.out($.bracket('M'), 'Magical spell(s) or device(s)'); well += 'M' }
			xvt.out('\n')

			$.action('well')
			$.profile({ jpg:'well', effect:'fadeIn' })
			xvt.app.form = {
				'well': { cb: () => {
					ROOM.occupant = 0
					xvt.out('\n')
					let wish = xvt.entry.toUpperCase()
					if (wish === '' || well.indexOf(wish) < 0) {
						$.sound('oops')
						xvt.app.refocus()
						return
					}
					$.animated('flipOutX')
					xvt.out('\n')
					switch (wish) {
					case 'B':
						if ($.player.cursed) {
							$.player.coward = false
							$.player.cursed = ''
							xvt.out(xvt.bright, xvt.black, '\nThe dark cloud has left you.', xvt.reset)
							$.news(`\tlifted curse`)
						}
						else {
							$.sound('shimmer')
							$.player.blessed = 'well'
							xvt.out(xvt.bright, xvt.yellow, 'You feel a shining aura surround you.\n')
							$.news(`\twished for a blessing`)
						}
						$.online.str = $.PC.ability($.online.str, 10)
						$.online.int = $.PC.ability($.online.int, 10)
						$.online.dex = $.PC.ability($.online.dex, 10)
						$.online.cha = $.PC.ability($.online.cha, 10)
						break

					case 'T':
						let start = $.int(Z - $.dice(deep))
						if (start < 1) start = 1
						let end = $.int(Z + $.dice(deep) + $.dice(Z) + $.dice(Z))
						if (end > 100) end = 100
						$.action('list')
						xvt.app.form = {
							'level': { cb: () => {
								let i = parseInt(xvt.entry)
								if (isNaN(i)) {
									xvt.app.refocus()
									return
								}
								if (i < start || i > end) {
									xvt.app.refocus()
									return
								}
								$.sound('teleport')
								Z = i - 1
								generateLevel()
								menu()
							}, prompt:`Level (${start}-${end}): `, cancel:`${Z}`, enter:`${end}`, min:1, max:3, timeout:20 }
						}
						xvt.app.focus = 'level'
						return

					case 'D':
						$.sound('destroy', 30)
						for (let i in dd)
							delete dd[i]
						generateLevel()
						break

					case 'O':
						$.sound('teleport')
						xvt.save()
						xvt.out(`\x1B[1;${$.player.rows}r`)
						xvt.restore()
						xvt.out('\n')
						//require('./main').menu($.player.expert)
						fini()
						return

					case 'R':
		                $.sound('resurrect')
						$.run(`UPDATE Players SET status = '' WHERE id NOT GLOB '_*' AND status != 'jail'`)
						$.news(`\twished all the dead resurrected`)
						break

					case 'F':
						$.music('elixir')
						if ($.online.str < $.player.str)
							$.online.str = $.player.str
						if ($.online.int < $.player.int)
							$.online.int = $.player.int
						if ($.online.dex < $.player.dex)
							$.online.dex = $.player.dex
						if ($.online.cha < $.player.cha)
							$.online.cha = $.player.cha
						if ($.player.toAC < 0)
							$.player.toAC = 0
						if ($.player.toWC < 0)
							$.player.toWC = 0
						if ($.online.toAC < 0)
							$.online.toAC = 0
						if ($.online.toWC < 0)
							$.online.toWC = 0
						if ($.online.hp < $.player.hp)
							$.online.hp = $.player.hp
						if ($.online.sp < $.player.sp)
							$.online.sp = $.player.sp
						if ($.online.hull < $.player.hull)
							$.online.hull = $.player.hull
						xvt.out('You are completely healed and all damage is repaired.\n')
						break

					case 'L':
						Battle.user('Loot', (opponent: active) => {
							if (opponent.user.id === $.player.id) {
								opponent.user.id = ''
								xvt.out('\nYou can\'t loot yourself.\n')
							}
							else if (opponent.user.novice) {
								opponent.user.id = ''
								xvt.out('\nYou can\'t loot novice players.\n')
							}
							if (opponent.user.id) {
								let loot = new $.coins(opponent.user.coin.value + opponent.user.bank.value)
								$.log(opponent.user.id, `\n${$.player.handle} wished for your ${loot.carry()}`)
								$.news(`\tlooted ${opponent.user.handle}`)
								$.player.coin.value += loot.value
								opponent.user.coin.value = 0
								opponent.user.bank.value = 0
								$.saveUser(opponent)
							}
							menu()
							return
						})
						return

					case 'G':
						if ($.player.today) {
							$.sound('shimmer')
							$.player.today--
							xvt.out('\nYou are granted another call for the day.\n')
							$.news(`\twished for an extra call`)
						}
						else {
							xvt.out('A deep laughter bellows... ')
							$.sound('morph', 12)
						}
						break

					case 'C':
						Battle.user('Curse', (opponent: active) => {
							if (opponent.user.id === $.player.id) {
								opponent.user.id = ''
								xvt.out('\nYou can\'t curse yourself.\n')
							}
							else if (opponent.user.novice) {
								opponent.user.id = ''
								xvt.out('\nYou can\'t curse novice players.\n')
							}
							if (opponent.user.id) {
								$.log(opponent.user.id, `\n${$.player.handle} cursed you!`)
								$.news(`\tcursed ${opponent.user.handle}`)
								if (opponent.user.blessed)
									opponent.user.blessed = ''
								else
									opponent.user.cursed = $.player.id
								$.saveUser(opponent)
							}
							menu()
							return
						})
						return

					case 'K':
						let k = $.dice(deep / 4)
						for (let i = 0; i < k; i++) {
							$.keyhint($.online)
							$.sound("shimmer", 12)
						}
						break

					case 'M':
						if ($.player.magic) {
							let m = $.dice($.player.magic / 2 + 1)
							let retry = $.player.magic
							for (let i = 0; i < m; i++) {
								let p = $.dice(Object.keys($.Magic.spells).length - 4) + 4
								let spell = $.Magic.pick(p)
								if (!$.Magic.have($.player.spells, spell)) {
									$.Magic.add($.player.spells, p)
									switch ($.player.magic) {
										case 1:
											$.beep()
											xvt.out(`A Wand of ${spell} appears in your hand.\n`)
											break
										case 2:
											$.beep()
											xvt.out(`You add a Scroll of ${spell} to your arsenal.\n`)
											break
										case 3:
											$.sound('shimmer')
											xvt.out(`The Spell of ${spell} is revealed to you.\n`)
											break
										case 4:
											$.sound('shimmer')
											xvt.out(`${spell} is known to you.\n`)
											break
									}
								}
								else {
									if (retry--)
										m++
									else
										$.sound('boo')
								}
								xvt.waste(600)
							}
						}
						else {
							$.sound('oops')
							xvt.app.refocus()
							return
						}
						break
					}
					pause = true
					refresh = true
					menu()
				}, prompt:'What is thy bidding, my master? ', cancel:'O', enter:'B', eol:false, max:1, timeout:30 }
			}
			xvt.app.focus = 'well'
			return false

		case 4:
			xvt.save()
			xvt.out(`\x1B[1;${$.player.rows}r`)
			xvt.restore()
			$.music('wol')
			xvt.waste(600)
			xvt.out(xvt.magenta, 'You have found a Mystical Wheel of Life.\n')
			xvt.waste(600)
			xvt.out('\n'); xvt.waste(600)
			xvt.out(xvt.bright, xvt.yellow, 'The runes are ',
				['cryptic', 'familiar', 'foreign', 'speaking out', 'strange'][$.dice(5) - 1],
				' to you.\n', xvt.reset)
			xvt.waste(600)

			$.action('yn')
			$.profile({ png:'wol', effect:'rotateIn' })
			xvt.app.form = {
				'wheel': { cb: () => {
					ROOM.occupant = 0
					xvt.out('\n')
					if (/Y/i.test(xvt.entry)) {
						$.animated('infinite rotateIn')
						let i, m, n, t, z
						z = (deep < 3) ? 4 : (deep < 6) ? 6 : (deep < 9) ? 8 : 9
						t = 0
						for (i = 0; i < 5; i++) {
							n = $.int($.online.str / 5 - 5 * i + $.dice(5) + 1)
							for (m = 0; m < n; m++) {
								t = $.dice(z)
								$.beep()
								xvt.out('\r', '-\\|/'[m % 4])
								xvt.waste(5 * i)
							}
						}
						n = $.dice($.online.str / 20) + 2
						for (i = 1; i <= n; i++) {
							t = $.dice(z)
							if (i == n && $.player.coward) t = 5
							if (t % 2 && $.access.sysop) t--
							xvt.out(xvt.bright, xvt.blue, '[', xvt.cyan, [
								' Grace ', ' Doom! ',
								'Fortune', ' Taxes ',
								' Power ', ' Death ',
								' =Key= ', ' Morph '
								, '+Skill+'][t % z],
								xvt.blue, '] \r')
							$.sound('click', 5 * i)
						}
						$.animated('rotateOut')
						xvt.out(xvt.reset)

						switch (t % z) {
						case 0:
							if ($.player.cursed) {
								xvt.out(xvt.bright, xvt.black, '\nThe dark cloud has left you.', xvt.reset)
								$.player.cursed = ''
								$.online.str = $.PC.ability($.online.str, 10, $.player.maxstr)
								$.online.int = $.PC.ability($.online.int, 10, $.player.maxint)
								$.online.dex = $.PC.ability($.online.dex, 10, $.player.maxdex)
								$.online.cha = $.PC.ability($.online.cha, 10, $.player.maxcha)
							}
							else {
								$.player.maxstr = $.PC.ability($.player.maxstr, 1, 99)
								$.player.maxstr = $.PC.ability($.player.maxstr, 1, 99)
								$.player.maxint = $.PC.ability($.player.maxint, 1, 99)
								$.player.maxdex = $.PC.ability($.player.maxdex, 1, 99)
								$.player.maxcha = $.PC.ability($.player.maxcha, 1, 99)
								if (($.player.str = $.PC.ability($.player.str, 10, $.player.maxstr)) > $.online.str)
									$.online.str = $.player.str
								if (($.player.int = $.PC.ability($.player.int, 10, $.player.maxint)) > $.online.int)
									$.online.int = $.player.int
								if (($.player.dex = $.PC.ability($.player.dex, 10, $.player.maxdex)) > $.online.dex)
									$.online.dex = $.player.dex
								if (($.player.cha = $.PC.ability($.player.cha, 10, $.player.maxcha)) > $.online.cha)
									$.online.cha = $.player.cha
							}
							break
						case 1:
							if ($.player.blessed) {
								$.player.blessed = ''
								$.online.str = $.PC.ability($.online.str, -10)
								$.online.int = $.PC.ability($.online.int, -10)
								$.online.dex = $.PC.ability($.online.dex, -10)
								$.online.cha = $.PC.ability($.online.cha, -10)
							}
							else {
								$.player.maxstr--
								$.player.maxint--
								$.player.maxdex--
								$.player.maxcha--
								if (($.player.str -= 10) < $.online.str)
									if (($.online.str = $.player.str) < 20) {
										$.online.str = 20
										$.player.str = 20
									}
								if (($.player.int -= 10) < $.online.int)
									if (($.online.int = $.player.int) < 20) {
										$.online.int = 20
										$.player.int = 20
									}
								if (($.player.dex -= 10) < $.online.dex)
									if (($.online.dex = $.player.dex) < 20) {
										$.online.dex = 20
										$.player.dex = 20
									}
								if (($.player.cha -= 10) < $.online.cha)
									if (($.online.cha = $.player.cha) < 20) {
										$.online.cha = 20
										$.player.cha = 20
									}
							}
							$.sound('crack')
							break
						case 2:
							n = new $.coins($.money(Z))
							n.value += $.worth(new $.coins($.online.weapon.value).value, $.online.cha)
							n.value += $.worth(new $.coins($.online.armor.value).value, $.online.cha)
							n.value *= (Z + 1)
							$.player.coin.value += new $.coins(n.carry(1, true)).value
							$.sound('yahoo')
							break
						case 3:
							$.player.coin.value = 0
							$.player.bank.value = 0
							n = new $.coins($.money(Z))
							n.value += $.worth(new $.coins($.online.weapon.value).value, $.online.cha)
							n.value += $.worth(new $.coins($.online.armor.value).value, $.online.cha)
							n.value *= (Z + 1)
							$.player.loan.value += new $.coins(n.carry(1, true)).value
							break
						case 4:
							$.online.hp += $.int($.player.hp / 2) + $.dice($.player.hp / 2)
							$.online.sp += $.int($.player.sp / 2) + $.dice($.player.sp / 2)
							$.player.toWC += $.dice($.online.weapon.wc)
							$.online.toWC += $.int($.online.weapon.wc / 2) + 1
							$.player.toAC += $.dice($.online.armor.ac)
							$.online.toAC += $.int($.online.armor.ac / 2) + 1
							$.sound('hone')
							break
						case 5:
							$.online.hp = 0
							$.online.sp = 0
							$.sound('killed')
							$.reason = 'Wheel of Death'
							break
						case 6:
							$.keyhint($.online)
							$.sound('shimmer', 12)
							break
						case 7:
							$.player.level = $.dice(Z)
							if ($.online.adept)
								$.player.level += $.dice($.player.level)
							$.reroll($.player, $.PC.random('monster'), $.player.level)
							$.activate($.online)
							$.online.altered = true
							$.player.gender = ['F','M'][$.dice(2) - 1]
							$.saveUser($.player)
							xvt.out(`You got morphed into a level ${$.player.level} ${$.player.pc} (${$.player.gender})!\n`)
							$.sound('morph', 10)
							break
						case 8:
							$.sound('level')
							$.skillplus($.online, menu)
							return
						}
					}
					else
						$.animated('rotateOut')
					menu()
				}, prompt:'Will you spin it (Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:15 }
			}
			xvt.app.focus = 'wheel'
			pause = true
			refresh = true
			return false

		case 5:
			xvt.out(xvt.cyan, xvt.faint, 'There is a thief in this '
				, ['chamber', 'hallway', 'corridor', 'cavern'][ROOM.type]
				, '! ', xvt.white)
			xvt.waste(600)
			ROOM.occupant = 0

			if ((Z + 1) == $.taxman.user.level && $.player.level < $.taxman.user.level) {
				$.loadUser($.taxman)
				xvt.out(xvt.reset, $.who($.taxman, 'He'), 'is the '
					, xvt.bright, xvt.cyan, 'Master of Coin'
					, xvt.reset, ' for '
					, xvt.bright, xvt.magenta, $.king.handle
					, xvt.reset, '!\n')
				$.profile({ png:'player/' + $.taxman.user.pc.toLowerCase() + ($.taxman.user.gender === 'F' ? '_f' : '')
					, handle:$.taxman.user.handle
					, level:$.taxman.user.level, pc:$.taxman.user.pc
					, effect:'bounceInDown'
				})
				$.sound('oops', 8)
				$.activate($.taxman)
				$.taxman.user.id = ''
				$.taxman.user.coin.value = $.player.coin.value
				if (isNaN(+$.taxman.user.weapon)) xvt.out('\n', $.who($.taxman, 'He'), $.Weapon.wearing($.taxman), '.\n')
				xvt.waste(750)
				if (isNaN(+$.taxman.user.armor)) xvt.out('\n', $.who($.taxman, 'He'), $.Armor.wearing($.taxman), '.\n')
				xvt.waste(750)
				xvt.out('\n')
				Battle.engage('Taxman', $.online, $.taxman, doSpoils)
				refresh = true
				return
			}

			let x = $.dice(DL.width) - 1, y = $.dice(DL.rooms.length) - 1
			let escape = DL.rooms[y][x]
			if (escape.occupant || $.dice(Z * ($.player.steal / 2 + 1) - deep) > Z) {
				if (!escape.occupant) {
					escape.occupant = 5
					xvt.out([
						'He silently ignores you',
						'He recognizes your skill and winks',
						'He slaps your back, but your wallet remains',
						'He offers you a drink, and you accept',
						xvt.attr('"I\'ll be seeing you again"', xvt.cyan, ' as he leaves')
						][$.dice(5) - 1], xvt.cyan, '.')
				}
				else {
					xvt.out(xvt.normal, xvt.magenta, 'He teleports away!')
					$.sound('teleport', 8)
				}
				xvt.out(xvt.reset, '\n')
			}
			else {
				escape.occupant = 5
				if (DL.map > 1)
					xvt.out('You expect nothing less from the coward.')
				else
					xvt.out(xvt.bright, xvt.white, 'He surprises you!')
				$.sound('thief', 4)
				xvt.out(xvt.reset, '\nAs he passes by, he steals your ')
				x = $.online.cha + deep + 1
				if ($.player.level / 9 - deep > $.Security.name[$.player.security].protection + 1)
					x = Math.trunc(x / $.player.level)
				if ($.online.weapon.wc && $.dice(x) == 1) {
					xvt.out($.player.weapon, $.buff($.player.toWC, $.online.toWC))
					$.Weapon.equip($.online, $.Weapon.merchant[0])
					xvt.waste(600)
					$.sound('thief2')
				}
				else if (DL.map && $.dice($.online.cha / 10 + deep + 1) - 1 <= $.int(deep / 2)) {
					xvt.out('map')
					DL.map = 0
					refresh = true
				}
				else if ($.player.magic < 3 && $.player.spells.length && $.dice($.online.cha / 10 + deep + 1) - 1 <= $.int(deep / 2)) {
					y = $.player.spells[$.dice($.player.spells.length) - 1]
					xvt.out(['wand', 'scroll'][$.player.magic - 1], ' for ', Object.keys($.Magic.spells)[y - 1])
					$.Magic.remove($.player.spells, y)
				}
				else if ($.player.poisons.length && $.dice($.online.cha / 10 + deep + 1) - 1 <= $.int(deep / 2)) {
					y = $.player.poisons[$.dice($.player.poisons.length) - 1]
					xvt.out('vial of ', Object.keys($.Poison.vials)[y - 1])
					$.Poison.remove($.player.poisons, y)
				}
				else if ($.player.coin.value) {
					let pouch = $.player.coin.amount.split(',')
					x = $.dice(pouch.length) - 1
					y = 'csgp'.indexOf(pouch[x].substr(-1))
					xvt.out('pouch of ', xvt.bright, [xvt.red,xvt.cyan,xvt.yellow,xvt.magenta][y], ['copper','silver','gold','platinum'][y], xvt.reset, ' pieces')
					$.player.coin.value -= new $.coins(pouch[x]).value
				}
				else
					xvt.out('Reese\'s pieces')
				xvt.out(xvt.reset, '!\n')
				xvt.waste(600)
				pause = true
			}
			break

		case 6:
			if (!DL.cleric.hp) {
				xvt.out(xvt.yellow, 'You find the ', xvt.white, 'bones'
					, xvt.yellow, ' of an ', xvt.faint, 'old cleric', xvt.normal, '.', xvt.reset, '\n')
				xvt.out('You pray for him.\n')
				break
			}

			let cast = 7
			let cost = new $.coins(Math.trunc($.money(Z) / 6 / $.player.hp * ($.player.hp - $.online.hp)))
			if (cost.value < 1) cost.value = 1
			cost.value *= (deep + 1)
			if ($.player.maxcha > 98)	//	typically a Cleric and God
				cost.value = 0
			cost = new $.coins(cost.carry(1, true))

			if ($.online.hp >= $.player.hp || cost.value > $.player.coin.value || DL.cleric.sp < $.Magic.power(DL.cleric, cast)) {
				xvt.out(xvt.yellow, '"I will pray for you."', xvt.reset, '\n')
				break
			}

			$.profile({ jpg:'npc/old cleric', effect:'zoomInUp' })
			let power = $.int(100 * DL.cleric.sp / DL.cleric.user.sp)
			xvt.out(xvt.yellow, 'There is an ', xvt.faint, 'old cleric', xvt.normal
				, xvt.normal, ' in this room with '
				, power < 40 ? xvt.faint : power < 80 ? xvt.normal : xvt.bright, `${power}`
				, xvt.normal, '% spell power.'
				, xvt.reset, '\n')
			xvt.out('He says, ')
			if ($.online.hp > $.int($.player.hp / 2) || ($.int(deep / 4) + 3) * cost.value > $.player.coin.value || DL.cleric.sp < $.Magic.power(DL.cleric, 13)) {
				xvt.out('"I can ', DL.cleric.sp < $.Magic.power(DL.cleric, 13) ? 'only' : 'surely'
					, ' cast a Heal spell on your wounds for '
					, cost.value ? cost.carry() : `you, ${$.player.gender === 'F' ? 'sister' : 'brother'}`
					, '."')
			}
			else if (DL.cleric.sp >= $.Magic.power(DL.cleric, 13)) {
				cast = 13
				cost.value *= $.int(deep / 4) + 3
				if (cost.value > $.player.coin.value) {
					xvt.out('"I will pray for you."\n')
					break
				}
				xvt.out('"I can cure all your wounds for '
					, cost.value ? cost.carry() : `you, ${$.player.gender === 'F' ? 'sister' : 'brother'}`
					, '."')
			}

			$.action('yn')
			xvt.app.form = {
			'pay': { cb: () => {
					xvt.out('\n\n')
					if (/Y/i.test(xvt.entry)) {
						$.player.coin.value -= cost.value
						DL.cleric.user.coin.value += cost.value
						xvt.out(`He casts a ${Object.keys($.Magic.spells)[cast - 1]} spell on you.`)
						DL.cleric.sp -= $.Magic.power(DL.cleric, cast)
						if (cast == 7) {
							$.sound('heal')
							for (let i = 0; i <= Z; i++)
								$.online.hp += $.dice(DL.cleric.user.level / 9) + $.dice(Z / 9 + deep / 3)
							if ($.online.hp > $.player.hp) $.online.hp = $.player.hp
							xvt.out('  Your hit points: '
								, xvt.bright, $.online.hp == $.player.hp ? xvt.white : $.online.hp > $.player.hp * 0.85 ? xvt.yellow : xvt.red, $.online.hp.toString()
								, xvt.reset, `/${$.player.hp}`)
						}
						else {
							$.online.hp = $.player.hp
							$.sound('shimmer', 4)
						}
					}
					else {
						if (cast == 13) {
							ROOM.occupant = 0
							xvt.out(xvt.magenta, 'He teleports away!\n', xvt.reset)
							$.sound('teleport', 8)
						}
						else {
							xvt.out(xvt.yellow, '"I need to rest.  Go in peace."\n', xvt.reset)
							looked = true
						}
					}
					menu()
				}, prompt:'Will you pay (Y/N)? ', cancel:'N', enter:'Y', eol:false, match:/Y|N/i, max:1, timeout:20 }
			}
			xvt.app.focus = 'pay'
			return false

		case 7:
			xvt.save()
			xvt.out(`\x1B[1;${$.player.rows}r`)
			xvt.restore()
			refresh = true

			$.profile({ jpg:'npc/wizard', effect:'flash' })
			xvt.out(xvt.magenta, 'You encounter a wizard in this room.\n\n')
			if (!$.player.cursed && !$.player.novice && $.dice($.player.wins + 1) == 1 && $.dice((Z > $.player.level ? Z : 1) + 20 * $.player.immortal + $.player.level + $.online.cha) == 1) {
				xvt.waste(500)
				$.sound('oops', 6)
				xvt.out(xvt.bright, 'He curses you!\n', xvt.reset)
				$.online.str = $.PC.ability($.online.str, -10)
				$.online.int = $.PC.ability($.online.int, -10)
				$.online.dex = $.PC.ability($.online.dex, -10)
				$.online.cha = $.PC.ability($.online.cha, -10)
				if ($.player.blessed)
					$.player.blessed = ''
				else {
					$.player.cursed = 'wiz!'
					$.news(`\tcursed by a wizard!`)
				}
				$.online.altered = true
				$.player.coward = false
				pause = true
			}
			else if (!$.player.novice && $.dice(Z + $.online.cha) == 1) {
				xvt.waste(500)
				xvt.out(xvt.faint, 'He is asleep.\n', xvt.reset)
				xvt.out('Try back again later.\n')
				pause = true
			}
			else {
				teleport()
				return false
			}
	}

	//	items?
	switch (ROOM.giftItem) {
		case 'armor':
			xvt.out(xvt.yellow, 'The armor shop is closed.\n', xvt.reset)
			$.sound('boo')
			break

		case 'chest':
			let gold = new $.coins($.money(Z))
			gold.value += $.worth(new $.coins($.online.weapon.value).value, $.online.cha)
			gold.value += $.worth(new $.coins($.online.armor.value).value, $.online.cha)
			gold.value *= ROOM.giftValue
			gold = new $.coins(gold.carry(1, true))
			if (gold.value) {
				$.sound('yahoo', 10)
				xvt.out(xvt.yellow, 'You find a ', xvt.bright, 'treasure chest'
					, xvt.normal, ' holding ', gold.carry(), '!'
					, xvt.reset, '\n')
			}
			else {
				xvt.out(xvt.faint, xvt.yellow, 'You find an empty, treasure chest.\n', xvt.reset)
				$.sound('boo')
			}
			$.player.coin.value += gold.value
			pause = true
			ROOM.giftItem = ''
			break

		case 'magic':
			if (!$.Magic.have($.player.spells, ROOM.giftValue)) {
				xvt.out(xvt.bright, xvt.yellow, 'You find a '
					, xvt.cyan, $.Magic.merchant[ROOM.giftValue - 1], xvt.yellow
					, ' ', $.player.magic == 1 ? 'wand' : 'scroll', '!'
					, xvt.reset, '\n')
				$.Magic.add($.player.spells, ROOM.giftValue)
				pause = true
				ROOM.giftItem = ''
			}
			break

		case 'map':
			xvt.out(xvt.bright, xvt.yellow, 'You find Marauder\'s map!\n', xvt.reset)
			DL.map = 3
			pause = true
			refresh = true
			ROOM.giftItem = ''
			break

		case 'poison':
			if (!$.Poison.have($.player.poisons, ROOM.giftValue)) {
				xvt.out(xvt.bright, xvt.yellow, 'You find a vial of '
					, $.Poison.merchant[ROOM.giftValue - 1], '!\n', xvt.reset)
				$.Poison.add($.player.poisons, ROOM.giftValue)
				pause = true
				ROOM.giftItem = ''
			}
			break

		case 'potion':
			if (typeof ROOM.giftID == 'undefined' && !$.player.coward)
				ROOM.giftID = !$.player.novice && $.dice(100 + ROOM.giftValue) < ($.online.int / 20 * (1 << $.player.poison) + ($.online.int > 90 ? ($.online.int % 90) <<1 : 0))
			$.sound('bubbles')
			xvt.out(xvt.bright, xvt.cyan, 'On the ground, you find a ')
			if (potions[ROOM.giftValue].identified || ROOM.giftID || $.access.sysop) {
				$.profile({ png:potions[ROOM.giftValue].image, handle:potion[ROOM.giftValue], effect:'fadeInUp' })
				xvt.out(potion[ROOM.giftValue], '.')
				potions[ROOM.giftValue].identified = $.online.int > (85 - 4 * $.player.poison)	//	recall seeing this before
			}
			else {
				$.profile({ png:potions[ROOM.giftValue].image, handle:'Is it ' + 'nt'[$.dice(2) - 1] + 'asty ?', effect:'fadeInUp' })
				xvt.out(potions[ROOM.giftValue].description, xvt.bright, xvt.cyan, ' potion', xvt.reset, '.')
			}

			if (ROOM.giftID || $.dice(100 + 10 * ROOM.giftValue * +$.player.coward) + $.dice(deep / 2) < 50 + $.int($.online.int / 2)) {
				$.action('potion')
				xvt.app.form = {
					'quaff': { cb: () => {
						xvt.out('\n\n')
						if (/N/i.test(xvt.entry)) {
							looked = true
							menu()
							return
						}
						if (/Y/i.test(xvt.entry)) {
							xvt.out(xvt.bright)
							quaff(ROOM.giftValue)
						}
						else if (/T/i.test(xvt.entry)) {
							xvt.out(xvt.faint)
							quaff(ROOM.giftValue, false)
						}
						ROOM.giftItem = ''
						menu()
					}, prompt:'Will you drink it (Yes/No/Toss)? ', cancel:'T', enter:'N', eol:false, match:/Y|N|T/i, timeout:10 }
				}
				xvt.app.focus = 'quaff'
				return false
			}
			else {
				xvt.waste(600)
				xvt.out(xvt.faint, '\nYou quaff it without hesitation.', xvt.reset, '\n')
				xvt.waste(600)
				quaff(ROOM.giftValue)
				ROOM.giftItem = ''
			}
			break

		case 'weapon':
			xvt.out(xvt.yellow, 'The weapon shop is closed.\n', xvt.reset)
			$.sound('boo')
			break

		case 'xmagic':
			if (!$.Magic.have($.player.spells, ROOM.giftValue)) {
				xvt.out(xvt.bright, xvt.yellow, 'You find a '
					, xvt.magenta, $.Magic.special[ROOM.giftValue - $.Magic.merchant.length - 1], xvt.yellow
					, ' ', $.player.magic == 1 ? 'wand' : 'scroll', '!'
					, xvt.reset, '\n')
				$.Magic.add($.player.spells, ROOM.giftValue)
				pause = true
				ROOM.giftItem = ''
			}
			break
	}

	return true
}

function doSpoils() {
	if ($.reason) {
		if (deep) $.reason += `-${iii[deep]}`
		xvt.hangup()
	}
	pause = false

	//	remove any dead carcass, displace teleported creatures
	for (let n = ROOM.monster.length - 1; n >= 0; n--) {
		if (ROOM.monster[n].hp < 1) {
			let mon = <active>{ user:{id:''} }
			Object.assign(mon, ROOM.monster[n])
			//	teleported?
			if (mon.hp < 0) {
				let y = $.dice(DL.rooms.length) - 1
				let x = $.dice(DL.width) - 1
				mon.hp = Math.abs(mon.hp) + $.int(mon.user.hp / ($.dice(5) + 5))
				mon.sp += $.int(mon.user.sp / ($.dice(5) + 5))
				DL.rooms[y][x].monster.push(mon)
			}
			else {
				//	defeated a significantly larger denizen on this level, check for any added bonus(es)
				if ((mon.user.xplevel - Z) > 5) {
					if ($.player.cursed) {
						xvt.out(xvt.bright, xvt.black, '\nThe dark cloud has left you.\n', xvt.reset)
						$.player.cursed = ''
					}
					let m = $.player.blessed ? 10 : 0
					$.player.maxstr = $.PC.ability($.player.maxstr, $.int(mon.pc.bonusStr), 99)
					$.player.str = $.PC.ability($.player.str, $.int(mon.pc.bonusStr), $.player.maxstr)
					$.online.str = $.PC.ability($.online.str, $.int(mon.pc.bonusStr + 1), $.player.maxstr, m)
					$.player.maxint = $.PC.ability($.player.maxint, $.int(mon.pc.bonusInt), 99)
					$.player.int = $.PC.ability($.player.int, $.int(mon.pc.bonusInt), $.player.maxint)
					$.online.int = $.PC.ability($.online.int, $.int(mon.pc.bonusInt + 1), $.player.maxint, m)
					$.player.maxdex = $.PC.ability($.player.maxdex, $.int(mon.pc.bonusDex), 99)
					$.player.dex = $.PC.ability($.player.dex, $.int(mon.pc.bonusDex), $.player.maxdex)
					$.online.dex = $.PC.ability($.online.dex, $.int(mon.pc.bonusDex + 1), $.player.maxdex, m)
					$.player.maxcha = $.PC.ability($.player.maxcha, $.int(mon.pc.bonusCha), 99)
					$.player.cha = $.PC.ability($.player.cha, $.int(mon.pc.bonusCha), $.player.maxcha)
					$.online.cha = $.PC.ability($.online.cha, $.int(mon.pc.bonusCha + 1), $.player.maxcha, m)
					$.beep()
					xvt.out('\n'); xvt.waste(500)
					Battle.yourstats(); xvt.waste(500)
					xvt.out('\n'); xvt.waste(500)
				}
			}
			//	activate this monster's avenge?
			if (mon.user.xplevel == 0) {
				$.sound('oops')
				ROOM.monster[n].monster.effect = 'flip'
				ROOM.monster[n].monster.pc = '*'
				$.activate(mon)
				for (let i = 0; i < $.dice(3); i++) {
					let avenger = <active>{ user:{id:''} }
					Object.assign(avenger.user, mon.user)
					avenger.user.pc = $.PC.random('monster')
					avenger.user.handle += ' avenger'
					$.reroll(avenger.user, avenger.user.pc, $.int(avenger.user.level / 2))
					for (let magic in ROOM.monster[n].monster.spells)
						$.Magic.add(avenger.user.spells, ROOM.monster[n].monster.spells[magic])
					for (let poison in ROOM.monster[n].monster.poisons)
						$.Poison.add(avenger.user.poisons, ROOM.monster[n].monster.poisons[poison])
					$.activate(avenger)
					avenger.str = 99
					avenger.int = 99
					avenger.dex = 99
					avenger.cha = 99
					ROOM.monster.push(avenger)
				}
			}
			ROOM.monster.splice(n, 1)
			pause = true
		}
		else {
			//	retreated from a harmless creature, good
			if (ROOM.monster[n].user.xplevel == 0) {
                $.sound('heal', 3)
				let ha = $.player.magic > 2 ? $.int($.player.level / 16) + 13 : 16
				let hr = 0
				for (let i = 0; i < $.player.level; i++)
					hr += $.dice(ha)
				$.online.hp += hr
				if ($.online.hp > $.player.hp)
					$.online.hp = $.player.hp
			}
			else if (ROOM.monster[n].user.xplevel < 0)
				ROOM.monster.splice(n, 1)	//	remove an illusion
		}
	}

	if (!ROOM.monster.length) {
		if (DL.map < 2 && $.dice((15 - $.online.cha / 10) / 2) == 1) {
			let m = ($.dice(Z / 33 + 2) > 1 ? 1 : 2)
			if (DL.map < m) {
				DL.map = m
				xvt.out('\n', xvt.bright, xvt.yellow
					, 'You find a', m == 2 ? ' magic ' : ' '
					, 'map!', xvt.reset, '\n')
				pause = true
			}
		}
	}

	if (Battle.retreat) $.PC.profile($.online, 'heartBeat')

	let d = ['N','S','E','W']
	while (Battle.retreat) {
		$.music('pulse')
		xvt.waste(400)
		xvt.out(xvt.bright, xvt.red, 'You frantically look to escape . . . ')
		xvt.waste(400)

		let i = $.dice(d.length) - 1
		switch (d[i]) {
			case 'N':
				if (Y > 0 && DL.rooms[Y][X].type !== 2)
					if (DL.rooms[Y - 1][X].type !== 2) {
						Battle.retreat = false
						Y--
						looked = false
						$.animated('fadeOutUp')
						break
					}
				oof('north')
				break

			case 'S':
				if (Y < DL.rooms.length - 1 && DL.rooms[Y][X].type !== 2)
					if (DL.rooms[Y + 1][X].type !== 2) {
						Battle.retreat = false
						Y++
						looked = false
						$.animated('fadeOutDown')
						break
					}
				oof('south')
				break

			case 'E':
				if (X < DL.width - 1 && DL.rooms[Y][X].type !== 1)
					if (DL.rooms[Y][X + 1].type !== 1) {
						Battle.retreat = false
						X++
						looked = false
						$.animated('fadeOutRight')
						break
					}
				oof('east')
				break

			case 'W':
				if (X > 0 && DL.rooms[Y][X].type !== 1)
					if (DL.rooms[Y][X - 1].type !== 1) {
						Battle.retreat = false
						X--
						looked = false
						$.animated('fadeOutLeft')
						break
					}
				oof('west')
				break
		}
		d.splice(i, 1)
		pause = true
	}

	if (Battle.teleported) {
		$.animated('lightSpeedOut')
		Battle.teleported = false
		Y = $.dice(DL.rooms.length) - 1
		X = $.dice(DL.width) - 1
		looked = false
	}

	menu()
}

function drawHero() {
	ROOM = DL.rooms[Y][X]
	if (!DL.map) drawRoom(Y, X)
	xvt.save()
	xvt.plot(Y * 2 + 2, X * 6 + 2)
	xvt.out(xvt.reset, xvt.reverse, '-YOU-', xvt.reset)
	xvt.restore()
}

function drawLevel() {
	let y:number, x:number
	if ($.player.emulation === 'XT') {
		xvt.plot($.player.rows, 1)
		for (y = 0; y < $.player.rows; y++)
			xvt.out('\n')
	}
	xvt.out(xvt.reset, xvt.clear)

	if (DL.map) {
		for (y = 0; y < paper.length; y++) {
			if (y % 2) {
				for (x = 0; x < DL.width; x++) {
					if ($.player.emulation === 'VT') xvt.out('\x1B(0', xvt.faint, paper[y].substr(6 * x, 1), '\x1B(B')
					else xvt.out(xvt.reset, xvt.bright, xvt.black, paper[y].substr(6 * x, 1))
					xvt.out(xvt.reset)

					let r = $.int(y / 2)
					let icon = null
					let o: string = xvt.attr(xvt.reset)
					if (DL.rooms[r][x].map) {
						if (DL.rooms[r][x].type == 0 || DL.rooms[r][x].type == 3)
							o += xvt.attr(xvt.faint, DL.rooms[r][x].type == 0 ? xvt.yellow : xvt.red)
						o += `  ${dot}  `
					}
					else
						o += '     '

					if (DL.map > 1 || (DL.rooms[r][x].map
						&& Math.abs(Y - r) < Math.trunc($.online.int / 20) && Math.abs(X - x) < Math.trunc($.online.int / 20))) {
						if (DL.rooms[r][x].monster.length) {
							icon = xvt.attr(xvt.reset, DL.rooms[r][x].occupant || DL.rooms[r][x].giftItem ? xvt.green : xvt.red, 
								DL.rooms[r][x].monster.length > 1 ? 'Mob' : 'Mon', xvt.reset)
							o = ` ${icon} `
						}
						//	0=none, 1=trapdoor, 2=deeper dungeon, 3=well, 4=wheel, 5=thief, 6=cleric, 7=wizard
						switch (DL.rooms[r][x].occupant) {
							case 0:
								break

							case 1:
								if (!icon && DL.map > 1)
									o = xvt.attr(xvt.reset, xvt.bright, xvt.blink, xvt.cyan, '  ?  ', xvt.reset)
								break

							case 2:
								if (!icon) icon = xvt.attr('v', xvt.bright, xvt.blink, 'V', xvt.noblink, xvt.normal, 'v')
								o = xvt.attr(xvt.faint, xvt.blue, 'v', xvt.normal, icon, xvt.reset, xvt.faint, xvt.blue, 'v')
								break

							case 3:
								if (!icon && DL.map > 2)
									o = xvt.attr(xvt.reset, xvt.bright, xvt.blink, xvt.blue, '  *  ', xvt.reset)
								break

							case 4:
								if (!icon && DL.map > 2)
									o = xvt.attr(xvt.reset, xvt.bright, xvt.blink, xvt.green, '  @  ', xvt.reset)
								break

							case 5:
								if (!icon && ($.player.steal == 4 || DL.map > 1))
									o = xvt.attr(xvt.faint, '  &  ', xvt.normal)
								break

							case 6:
								if (DL.cleric.sp) {
									if (!icon) icon = xvt.attr(xvt.normal, xvt.uline, '_', xvt.bright, Cleric[$.player.emulation], xvt.normal, '_')
									o = xvt.attr(xvt.reset, xvt.faint, xvt.yellow, ':', xvt.normal, icon, xvt.reset, xvt.faint, xvt.yellow, ':')
								}
								else {
									if (!icon) icon = xvt.attr(xvt.uline, '_', Cleric[$.player.emulation], '_')
									o = xvt.attr(xvt.reset, xvt.faint, ':', icon, xvt.reset, xvt.faint, ':')
								}
								break
					
							case 7:
								if (!icon) icon = xvt.attr(xvt.normal, xvt.uline, '_', xvt.bright, Teleport[$.player.emulation], xvt.normal, '_')
								o = xvt.attr(xvt.faint, xvt.magenta, '<', xvt.normal, icon, xvt.reset, xvt.faint, xvt.magenta, '>')
								break
						}
					}
					xvt.out(o)
					if ((DL.map > 2 || $.access.sysop) && DL.rooms[r][x].giftItem) xvt.out(`\x08${dot}`)
				}
				if ($.player.emulation === 'VT') xvt.out('\x1B(0', xvt.faint, paper[y].substr(-1), '\x1B(B')
				else xvt.out(xvt.reset, xvt.bright, xvt.black, paper[y].substr(-1))
			}
			else {
				if ($.player.emulation === 'VT') xvt.out('\x1B(0', xvt.faint, paper[y], '\x1B(B')
				else xvt.out(xvt.reset, xvt.bright, xvt.black, paper[y])
			}
			xvt.out('\n')
		}
	}
	else {
		for (y = 0; y < DL.rooms.length; y++)
			for (x = 0; x < DL.width; x++)
				if (DL.rooms[y][x].map)
					drawRoom(y, x, false)
	}

	xvt.out(`\x1B[${paper.length + 1};${$.player.rows}r`)
	xvt.plot(paper.length + 1, 1)
	xvt.save()
}

function drawRoom(r:number, c:number, keep = true) {
	if (keep) xvt.save()
	ROOM = DL.rooms[r][c]
	let row = r * 2, col = c * 6
	if (!DL.map) {
		xvt.plot(row + 1, col + 1)
		if ($.player.emulation === 'VT') xvt.out('\x1B(0', xvt.faint, paper[row].substr(col, 7), '\x1B(B')
		else xvt.out(xvt.reset, xvt.bright, xvt.black, paper[row].substr(col, 7))
	}

	row++
	xvt.plot(row + 1, col + 1)
	if ($.player.emulation === 'VT') xvt.out('\x1B(0', xvt.faint, paper[row].substr(col, 1), '\x1B(B')
	else xvt.out(xvt.reset, xvt.bright, xvt.black, paper[row].substr(col, 1))
	xvt.attr(xvt.reset)

	let icon = null
	let o: string = xvt.attr(xvt.reset)

	if (ROOM.map) {
		if (ROOM.type == 0 || ROOM.type == 3)
			o += xvt.attr(xvt.faint, ROOM.type == 0 ? xvt.yellow : xvt.red)
		o += `  ${dot}  `
	}
	else
		o += '     '

	if (ROOM.monster.length)
		icon = xvt.attr(xvt.reset, ROOM.occupant ? xvt.green : xvt.red, ROOM.monster.length > 1 ? 'Mob' : 'Mon', xvt.reset)

	//	0=none, 1=trapdoor, 2=deeper dungeon, 3=well, 4=wheel, 5=thief, 6=cleric, 7=wizard
	switch (ROOM.occupant) {
		case 0:
			if (icon) o = ` ${icon} `
			break

		case 1:
			if (DL.map)
				o = xvt.attr(xvt.reset, xvt.bright, xvt.blink, xvt.cyan, '  ?  ', xvt.reset)
			break

		case 2:
			if (!icon) icon = xvt.attr(xvt.normal, 'v', xvt.bright, xvt.blink, 'V', xvt.noblink, xvt.normal, 'v')
			o = xvt.attr(xvt.reset, xvt.faint, xvt.blue, 'v', xvt.normal, icon, xvt.reset, xvt.faint, xvt.blue, 'v')
			break

		case 3:
			if (!icon && DL.map > 2)
				o = xvt.attr(xvt.reset, xvt.bright, xvt.blink, xvt.blue, '  *  ', xvt.reset)
			break

		case 4:
			if (!icon && DL.map > 2)
				o = xvt.attr(xvt.reset, xvt.bright, xvt.blink, xvt.green, '  @  ', xvt.reset)
			break

		case 5:
			if (!icon && ($.player.steal == 4 || DL.map == 2))
				o = xvt.attr(xvt.reset, xvt.faint, '  &  ', xvt.normal)
			break

		case 6:
			if (DL.cleric.sp) {
				if (!icon) icon = xvt.attr(xvt.normal, xvt.uline, '_', xvt.bright, Cleric[$.player.emulation], xvt.normal, '_')
				o = xvt.attr(xvt.reset, xvt.faint, xvt.yellow, ':', xvt.normal, icon, xvt.reset, xvt.faint, xvt.yellow, ':')
			}
			else {
				if (!icon) icon = xvt.attr(xvt.uline, '_', Cleric[$.player.emulation], '_')
				o = xvt.attr(xvt.reset, xvt.faint, ':', icon, xvt.reset, xvt.faint, ':')
			}
			break

		case 7:
			if (!icon) icon = xvt.attr(xvt.normal, xvt.uline, '_', xvt.bright, Teleport[$.player.emulation], xvt.normal, '_')
			o = xvt.attr(xvt.reset, xvt.faint, xvt.magenta, '<', xvt.normal, icon, xvt.reset, xvt.faint, xvt.magenta, '>')
			break
	}
	xvt.out(o)

	if ($.player.emulation === 'VT') xvt.out('\x1B(0', xvt.faint, paper[row].substr(col + 6, 1), '\x1B(B')
	else xvt.out(xvt.reset, xvt.bright, xvt.black, paper[row].substr(col + 6, 1))

	if (!DL.map) {
		row++
		xvt.plot(row + 1, col + 1)
		if ($.player.emulation === 'VT') xvt.out('\x1B(0', xvt.faint, paper[row].substr(col, 7), '\x1B(B')
		else xvt.out(xvt.reset, xvt.bright, xvt.black, paper[row].substr(col, 7))
	}
	if (keep) xvt.restore()
}

function generateLevel() {
	looked = false
	refresh = true

	if (!dd[deep])
		dd[deep] = new Array(100)

	if (dd[deep][Z]) {
		DL = dd[deep][Z]
		renderMap()
		do {
			Y = $.dice(DL.rooms.length) - 1
			X = $.dice(DL.width) - 1
			ROOM = DL.rooms[Y][X]
		} while (ROOM.type == 3)	//	cannot teleport into a cavern
		return
	}

	$.wall(`is entering dungeon level ${iii[deep]}.${Z + 1}`)

	let y:number, x:number
	let result: boolean
	do {
		let maxRow = 6 + $.dice(Z / 32 + 1)
		while (maxRow < 10 && $.dice($.online.cha / 10) == 1)
			maxRow++
		let maxCol = 6 + $.dice(Z / 16 + 1)
		while (maxCol < 13 && $.dice($.online.cha / 10) == 1)
			maxCol++

		dd[deep][Z] = <ddd>{
			cleric:	{ user:{ id:'_Clr', handle:'old cleric', pc:'Cleric', level:90+deep
			 		, sex:'M', weapon:0, armor:1, magic:3, spells:[7,8,13] } },
 			rooms:	new Array(maxRow),
			map:	0,
			moves:	0,
			spawn:	Math.trunc(deep / 3 + Z / 9 + maxRow / 3)
					+ $.dice(Math.round($.online.cha / 20)) + 3,
			width:	maxCol
		}

		DL = dd[deep][Z]
		$.reroll(DL.cleric.user, DL.cleric.user.pc, DL.cleric.user.level)
		$.activate(DL.cleric)
		for (y = 0; y < DL.rooms.length; y++) {
			DL.rooms[y] = new Array(DL.width)
			for (x = 0; x < DL.width; x++)
				DL.rooms[y][x] = <room>{ map:true, monster:[], occupant:0, type:0 }
		}

		for (y = 0; y < DL.rooms.length; y++) {
			for (x = 0; x < DL.width; x++) {
				let n:number
				while ((n = $.int(($.dice(4) + $.dice(4)) / 2) - 1) == 3);
				DL.rooms[y][x].type = (n == 0) ? 3 : (n == 1) ? 0 : $.dice(2)
			}
		}

		result = false
		spider(0, 0)
		for (y = 0; y < DL.rooms.length; y++)
			for (x = 0; x < DL.width; x++)
				if (DL.rooms[y][x].map)
					result = true
	} while (result)

	renderMap()
	do {
		Y = $.dice(DL.rooms.length) - 1
		X = $.dice(DL.width) - 1
		ROOM = DL.rooms[Y][X]
	} while (ROOM.type)

	//	populate this new floor with monsters, no corridors or hallways
	let n = $.int(DL.rooms.length * DL.width / 6 + deep / 2 + $.dice(Z / 11) + $.dice(deep / 2))
	while (n)
		if (putMonster())
			n--

	let wow:number = 1

	//	potential bonus(es) for the more experienced adventurer
	if (!$.player.novice) {
		//	gift map
		if ($.dice($.player.immortal) > Z && $.dice($.player.wins) > deep) {
			y = $.dice(DL.rooms.length) - 1
			x = $.dice(DL.width) - 1
			DL.rooms[y][x].giftItem = 'map'
			if (Math.trunc($.dice(100 * (Z + 1)) / (deep + 1)) < (deep + 4))
				wow = DL.rooms.length * DL.width
		}

		//	wishing well
		if ($.dice((110 - Z) / 3 + deep) == 1) {
			for (let i = 0; i < wow; i++) {
				y = $.dice(DL.rooms.length) - 1
				x = $.dice(DL.width) - 1
				DL.rooms[y][x].occupant = 3
			}
			wow = 1
		}

		//	wheel of life
		if ($.dice((110 - Z) / 3 + deep) == 1) {
			for (let i = 0; i < wow; i++) {
				y = $.dice(DL.rooms.length) - 1
				x = $.dice(DL.width) - 1
				DL.rooms[y][x].occupant = 4
			}
			wow = 1
		}

		//	deep dank dungeon portal
		if (deep < 9 && deep < $.player.immortal && Z / 9 < $.player.immortal) {
			y = $.dice(DL.rooms.length) - 1
			x = $.dice(DL.width) - 1
			DL.rooms[y][x].occupant = 2
		}
	}

	//	thief(s) in other spaces
	wow--
	n = $.dice(deep / 4) + wow
	for (let i = 0; i < n; i++) {
		do {
			y = $.dice(DL.rooms.length) - 1
			x = $.dice(DL.width) - 1
		} while (wow == 0 && DL.rooms[y][x].type == 3)
		DL.rooms[y][x].occupant = 5
		wow--
	}

	//	a cleric in another space
	do {
		y = $.dice(DL.rooms.length) - 1
		x = $.dice(DL.width) - 1
	} while (DL.rooms[y][x].type == 3 || DL.rooms[y][x].monster.length || DL.rooms[y][x].occupant)
	DL.rooms[y][x].occupant = 6

	//	a wizard in another space
	do {
		y = $.dice(DL.rooms.length) - 1
		x = $.dice(DL.width) - 1
	} while (DL.rooms[y][x].type == 3 || DL.rooms[y][x].monster.length || DL.rooms[y][x].occupant)
	DL.rooms[y][x].occupant = 7

	//	set some trapdoors in empty corridors only
	n = $.int(DL.rooms.length * DL.width / 10)
	if ($.dice(100 - Z) > (deep + 1))
		n += $.dice(Z / 16 + 2)
	while (n) {
		y = $.dice(DL.rooms.length) - 1
		x = $.dice(DL.width) - 1
		if (!DL.rooms[y][x].occupant) {
			DL.rooms[y][x].occupant = 1
			n--
		}
	}

	wow = 1

	//	potential bonus(es) for the more experienced adventurer
	if (!$.player.novice && $.dice($.player.immortal) > Z)
		if (Math.trunc($.dice(100 * (Z + 1)) / (deep + 1)) < (deep + 2))
			wow = DL.rooms.length * DL.width

	wow = $.dice(Z / 33) + $.dice(deep / 3) + wow - 2
	for (let i = 0; i < wow; i++) {
		y = $.dice(DL.rooms.length) - 1
		x = $.dice(DL.width) - 1

		if ($.dice(deep + 10) > (deep + 1)) {
			DL.rooms[y][x].giftItem = 'potion'
			n = $.dice(130 - deep)
			for (let i = 0; i < 16 && n > 0; i++) {
				let v = 15 - i
				DL.rooms[y][x].giftValue = v
				if ($.player.magic < 2 && (v == 10 || v == 11))
					DL.rooms[y][x].giftValue = (v == 11) ? 9 : 0
				n -= i + 1
			}
			continue
		}

		if ($.dice(deep + 5) > (deep + 1) && $.player.poison) {
			DL.rooms[y][x].giftItem = 'poison'
			DL.rooms[y][x].giftValue =  $.dice($.Poison.merchant.length * Z / 100)
			continue
		}

		if ($.dice(deep + 5) > (deep + 1) && ($.player.magic == 1 || $.player.magic == 2)) {
			DL.rooms[y][x].giftItem = 'magic'
			DL.rooms[y][x].giftValue =  $.dice($.Magic.merchant.length * Z / 100)
			continue
		}

		if ($.dice(deep + 3) > (deep + 1) && ($.player.magic == 1 || $.player.magic == 2)) {
			DL.rooms[y][x].giftItem = 'xmagic'
			DL.rooms[y][x].giftValue =  $.Magic.merchant.length + $.dice($.Magic.special.length)
			continue
		}

		if ($.dice(deep + $.player.magic + 4) > (deep + 1)) {
			DL.rooms[y][x].giftItem = 'chest'
			DL.rooms[y][x].giftValue =  $.dice(10 + deep) - 1
			continue
		}

		if ($.dice(deep * ($.player.magic + 3)) - $.player.magic > (deep + 1)) {
			DL.rooms[y][x].giftItem = 'armor'
			DL.rooms[y][x].giftValue =  $.dice(deep) + 2
			continue
		}

		if ($.dice(deep * ($.player.magic + 2)) - $.player.magic > (deep + 1)) {
			DL.rooms[y][x].giftItem = 'weapon'
			DL.rooms[y][x].giftValue =  $.dice(deep) + 2
			continue
		}
	}

	function spider(r:number, c:number) {
		DL.rooms[r][c].map = false
		if (c + 1 < DL.width)
			if (DL.rooms[r][c + 1].map && DL.rooms[r][c].type !== 1 && DL.rooms[r][c + 1].type !== 1)
				spider(r, c + 1)
		if (r + 1 < DL.rooms.length)
			if (DL.rooms[r + 1][c].map && DL.rooms[r][c].type !== 2 && DL.rooms[r + 1][c].type !== 2)
				spider(r + 1, c)
		if (c > 0)
			if (DL.rooms[r][c - 1].map && DL.rooms[r][c].type !== 1 && DL.rooms[r][c - 1].type !== 1)
				spider(r, c - 1)
		if (r > 0)
			if (DL.rooms[r - 1][c].map && DL.rooms[r][c].type !== 2 && DL.rooms[r - 1][c].type !== 2)
				spider(r - 1, c)
	}

	function renderMap() {
		let min =  Math.round((xvt.sessionAllowed - ((new Date().getTime() - xvt.sessionStart.getTime()) / 1000)) / 60)
		if (tl - min > 4) {
			tl = min
			$.music('dungeon' + $.dice(9))
		}

		const box = xvt.Draw[$.player.emulation]
		let r: number, c: number
		paper = new Array(2 * DL.rooms.length + 1)

		//	draw level borders on an empty sheet of paper
		paper[0] = '\x00' + box[0].repeat(6 * DL.width - 1) + '\x00'
		for (r = 1; r < 2 * DL.rooms.length; r++)
			paper[r] = box[10] + ' '.repeat(6 * DL.width - 1) + box[10]
		paper[paper.length - 1] = '\x00' + box[0].repeat(6 * DL.width - 1) + '\x00'

		//	crawl each room to construct walls
		for (r = 0; r < DL.rooms.length; r++) {
			for (c = 0; c < DL.width; c++) {
				ROOM = DL.rooms[r][c]
				let row = r * 2, col = c * 6

				//	north-south corridor
				if (ROOM.type == 1) {
					if (paper[row][col] == ' ')
						paper[row] = replaceAt(paper[row], col, box[10])
					else
					if (paper[row][col] == box[3])
						paper[row] = replaceAt(paper[row], col, box[6])
					else
					if (paper[row][col] == box[2])
						paper[row] = replaceAt(paper[row], col, box[5])
					else
					if (paper[row][col] == box[1])
						paper[row] = replaceAt(paper[row], col, box[4])
					else
					if (paper[row][col] == box[0])
						paper[row] = replaceAt(paper[row], col, box[
							col > 0 && paper[row][col - 1] == ' ' ? 7
							: paper[row][col + 1] == ' ' ? 9 : 8])

					row++
					paper[row] = replaceAt(paper[row], col, box[10])

					row++
					if (paper[row][col] == ' ')
						paper[row] = replaceAt(paper[row], col, box[10])
					else
					if (paper[row][col] == box[0])
						paper[row] = replaceAt(paper[row], col, box[
							col > 0 && paper[row][col - 1] == ' ' ? 1
							: paper[row][col + 1] == ' ' ? 3 : 2])

					row = r * 2
					col += 6

					if (paper[row][col] == ' ')
						paper[row] = replaceAt(paper[row], col, box[10])
					else
					if (paper[row][col] == box[0])
						paper[row] = replaceAt(paper[row], col, box[
							paper[row][col - 1] == ' ' ? 7
							: paper[row][col + 1] == ' ' ? 9 : 8])
					else
					if (paper[row][col] == box[1])
						paper[row] = replaceAt(paper[row], col, box[4])
					else
					if (paper[row][col] == box[2])
						paper[row] = replaceAt(paper[row], col, box[5])
					else
					if (paper[row][col] == box[3])
						paper[row] = replaceAt(paper[row], col, box[6])

					row++
					paper[row] = replaceAt(paper[row], col, box[10])

					row++
					paper[row] = replaceAt(paper[row], col, box[
						row < 2 * DL.rooms.length ? 10 : 2])
				}

				//	east-west corridor
				if (ROOM.type == 2) {
					if (paper[row][col] == ' ')
						paper[row] = replaceAt(paper[row], col, box[0])
					else
					if (paper[row][col] == box[3])
						paper[row] = replaceAt(paper[row], col, box[2])
					else
					if (paper[row][col] == box[6])
						paper[row] = replaceAt(paper[row], col, box[5])
					else
					if (paper[row][col] == box[9])
						paper[row] = replaceAt(paper[row], col, box[8])
					else
					if (paper[row][col] == box[10])
						paper[row] = replaceAt(paper[row], col, box[
							row > 0 && paper[row - 1][col] == ' ' ? 7
							: paper[row + 1][col] == ' ' ? 1 : 4])

					col++
					paper[row] = replaceAt(paper[row], col, box[0].repeat(5))
					col += 5

					if (paper[row][col] == ' ')
						paper[row] = replaceAt(paper[row], col, box[0])
					else
					if (paper[row][col] == box[1])
						paper[row] = replaceAt(paper[row], col, box[2])
					else
					if (paper[row][col] == box[10])
						paper[row] = replaceAt(paper[row], col, box[
							paper[row + 1][col] == box[10] ? 6 : 3])

					row += 2
					col = c * 6
					if (paper[row][col] == box[10])
						paper[row] = replaceAt(paper[row], col, box[
							col > 0 && paper[row][col - 1] == ' ' ?  1 : 4])
					else
					if (paper[row][col] == ' ')
						paper[row] = replaceAt(paper[row], col, box[0])

					col++
					paper[row] = replaceAt(paper[row], col, box[0].repeat(5))
					col += 5

					if (paper[row][col] == ' ')
						paper[row] = replaceAt(paper[row], col, box[0])
					else
					if (paper[row][col] == box[10])
						paper[row] = replaceAt(paper[row], col, box[
							paper[row + 1][col] == box[10] ? 6 : 3])
				}
			}
		}
		r = 2 * DL.rooms.length
		c = 6 * DL.width
		paper[0] = replaceAt(paper[0], 0, box[7])
		paper[0] = replaceAt(paper[0], c, box[9])
		paper[r] = replaceAt(paper[r], 0, box[1])
		paper[r] = replaceAt(paper[r], c, box[3])

		function replaceAt(target:string, offset:number, data:string): string {
			return target.substr(0, offset) + data + target.substr(offset + data.length)
		}
	}
}

function putMonster(r = -1, c = -1): boolean {
	// attempt to add to a room or cavern only
	if (r < 0 && c < 0) {
		do {
			r = $.dice(DL.rooms.length) - 1
			c = $.dice(DL.width) - 1
		} while (DL.rooms[r][c].type != 0 && DL.rooms[r][c].type != 3)
	}

	//	check for overcrowding
	if (DL.rooms[r][c].monster.length >= [2,1,1,3][DL.rooms[r][c].type])
		return false

	let i:number = DL.rooms[r][c].monster.length
	let j:number = 0
	let dm:monster
	let level: number = 0
	let m:active

	for (j = 0; j < 4; j++)
		level += $.dice(7)
	switch ($.int(level / 4)) {
		case 1:
			level = $.dice(Z)
			break
		case 2:
			level = Z - 3 - $.dice(3)
			break
		case 3:
			level = Z - $.dice(3)
			break
		case 4:
			level = Z
			break
		case 5:
			level = Z + $.dice(3)
			break
		case 6:
			level = Z + 3 + $.dice(3)
			break
		case 7:
			level = Z + $.dice(100 - Z)
			break
	}
	level = (level < 1) ? 1 : (level > 99) ? 99 : level
	level = (i == 1) ? $.int(level / 2) + $.dice(level / 2 + 1) : (i == 2) ? $.dice(level + 1) : level
	level = (level < 1) ? 1 : (level > 99) ? 99 : level

	do {
		//	add a monster level relative to this floor, including any lower "strays" as fodder
		let room = DL.rooms[r][c]
		i = room.monster.push(<active>{ user:{ id: '', sex:'I', level:level } }) - 1
		m = room.monster[i]

		//	pick and generate monster relative to its level
		let v = 1
		if (level > 9 && level < 90) {
			v = $.dice(12)
			v = v == 12 ? 2 : v > 1 ? 1 : 0
		}
		j = level + v - 1
		dm = monsters[Object.keys(monsters)[j]]
		m.monster = dm
		m.effect = dm.effect || 'pulse'
		m.user.handle = Object.keys(monsters)[j]

		//	chaos
		if (dm.pc == '*') dm.pc = $.PC.random('monster')

		$.reroll(m.user, dm.pc ? dm.pc : $.player.pc, j)
		if (m.user.xplevel) m.user.xplevel = level

		if (dm.weapon)
			m.user.weapon = dm.weapon
		else {
			if ($.player.level <= Z && $.dice($.player.level / 4 - $.online.cha / 10 + 12) == 1) {
				i = $.online.weapon.wc + $.dice(3) - 2
				i = i < 1 ? 1 : i >= $.Weapon.merchant.length ? $.Weapon.merchant.length - 1 : i
				m.user.weapon = $.Weapon.merchant[i]
			}
			else {
				m.user.weapon = $.int((level + deep) / 100 * $.int($.sysop.weapon))
				m.user.weapon = $.int((m.user.weapon + $.online.weapon.wc) / 2)
			}
		}

		if (dm.armor)
			m.user.armor = dm.armor
		else {
			if ($.player.level <= Z && $.dice($.player.level / 3 - $.online.cha / 10 + 12) == 1) {
				i = $.online.armor.ac + $.dice(3) - 2
				i = i < 1 ? 1 : i >= $.Armor.merchant.length ? $.Armor.merchant.length - 1 : i
				m.user.armor = $.Armor.merchant[i]
			}
			else {
				m.user.armor = $.int((level + deep) / 100 * $.int($.sysop.armor))
				m.user.armor = $.int((m.user.armor + $.online.armor.ac) / 2)
			}
		}

		m.user.hp = $.int(m.user.hp / 4)
		m.user.hp += $.int(deep * Z / 4)
		i = 5 - $.dice(deep / 3)
		m.user.sp = $.int(m.user.sp / i)

		m.user.poisons = []
		if (m.user.poison) {
			if (dm.poisons)
				for (let vials in dm.poisons)
					$.Poison.add(m.user.poisons, dm.poisons[vials])
			for (let i = 0; i < Object.keys($.Poison.vials).length - (9 - deep); i++) {
				if ($.dice($.int($.player.cha / (deep + 1)) + (i <<2)) < (+$.player.coward + 2)) {
					let vial = $.Poison.pick(i)
					if (!$.Poison.have(m.user.poisons, vial))
						$.Poison.add(m.user.poisons, i)
				}
			}
		}

		m.user.spells = []
		if (m.user.magic) {
			if (dm.spells)
				for (let magic in dm.spells)
					$.Magic.add(m.user.spells, dm.spells[magic])
			for (let i = 0; i < Object.keys($.Magic.spells).length - (9 - deep); i++) {
				if ($.dice($.int($.player.cha / (deep + 1)) + (i <<2)) < (+$.player.coward + 2)) {
					let spell = $.Magic.pick(i)
					if (!$.Magic.have(m.user.spells, spell))
						$.Magic.add(m.user.spells, i)
				}
			}
		}

		$.activate(m)

		m.user.immortal = deep
		m.adept = $.dice(Z / 30 + deep / 4 + 1) - 1
		m.str = $.PC.ability(m.str, deep - 2, m.user.maxstr, deep >>2)
		m.int = $.PC.ability(m.int, deep - 2, m.user.maxint, deep >>2)
		m.dex = $.PC.ability(m.dex, deep - 2, m.user.maxdex, deep >>2)
		m.cha = $.PC.ability(m.cha, deep - 2, m.user.maxcha, deep >>2)

		let gold = new $.coins($.int($.money(level) / 10))
		gold.value += $.worth(new $.coins(m.weapon.value).value, $.dice($.online.cha / 5) + 5)
		gold.value += $.worth(new $.coins(m.armor.value).value, $.dice($.online.cha / 5) + 5)
		gold.value *= $.dice(deep)
		m.user.coin = new $.coins(gold.carry(1, true))

		if (+m.user.weapon) {
			if (dm.hit) m.weapon.hit = dm.hit
			if (dm.smash) m.weapon.smash = dm.smash
		}
	} while (DL.rooms[r][c].monster.length < 10 && DL.rooms[r][c].monster.length * m.user.level < Z + deep - 12)

	return true
}

function teleport() {
	let min =  Math.round((xvt.sessionAllowed - ((new Date().getTime() - xvt.sessionStart.getTime()) / 1000)) / 60)
	$.action('teleport')

	xvt.out(xvt.bright, xvt.yellow, 'What do you wish to do?\n', xvt.reset)
	xvt.out($.bracket('U'), 'Teleport up 1 level')
	if (Z < 99) xvt.out($.bracket('D'), 'Teleport down 1 level')
	xvt.out($.bracket('O'), `Teleport out of this ${deep ? 'dank' : ''} dungeon`)
	xvt.out($.bracket('R'), 'Random teleport')
	xvt.out(xvt.cyan, '\n\nTime Left: ', xvt.bright, xvt.white, min.toString(), xvt.normal, xvt.cyan, ' min.', xvt.reset)
	if ($.player.coin.value) xvt.out(xvt.cyan, '    Money: ', $.player.coin.carry())
	if ($.player.level / 9 - deep > $.Security.name[$.player.security].protection + 1)
		xvt.out(xvt.faint, '\nThe feeling of in', xvt.uline, 'security', xvt.nouline, ' overwhelms you.', xvt.reset)

	xvt.app.form = {
		'wizard': { cb:() => {
			$.PC.profile($.online)
			if ($.dice(10 * deep + Z + 5 * $.player.magic + $.online.int + $.online.cha) == 1) {
				xvt.out(' ... \"', xvt.bright, xvt.blue, 'Huh?', xvt.reset, '\"\n')
				$.sound('miss', 9)
				$.animated('wobble')
				$.sound('lose', 9)
				$.animated('rubberBand')
				$.music('crack')
				xvt.waste(2000)
				$.animated('bounceOutUp')
				let pops = 'UDOR'[$.dice(4) - 1]
				if (xvt.entry.toUpperCase() == pops) {
					$.sound('oops', 6)
					deep = $.dice(10) - 1
					Z += $.dice(20) - 10
					Z = Z < 0 ? 0 : Z > 99 ? 99 : Z
					$.sound('portal')
				}
				else {
					xvt.entry = pops
					$.sound('teleport')
				}
			}
			else {
				xvt.out('\n')
				$.sound('teleport')
			}
			switch (xvt.entry.toUpperCase()) {
				case 'D':
					if (Z < 99) {
						Z++
						$.animated('fadeOutDown')
						break
					}
				case 'R':
					$.animated('flipOutY')
					break

				case 'U':
					if (Z > 0) {
						Z--
						$.animated('fadeOutUp')
						break
					}
				case 'O':
					$.animated('flipOutX')
					if (deep > 0)
						deep--
					else {
						$.music('thief2')
						xvt.save()
						xvt.out(`\x1B[1;${$.player.rows}r`)
						xvt.restore()
						xvt.waste(1250)
						//require('./main').menu($.player.expert)
						fini()
						return
					}
					break
				default:
					break
			}
			xvt.waste(1250)
			generateLevel()
			menu()
		}, cancel:'O', enter:'R', eol:false, match:/U|D|O|R/i, timeout:10 }
	}
	xvt.app.form['wizard'].prompt = `Teleport #${iii[deep]}.${Z + 1}: `
	xvt.app.focus = 'wizard'
}

function quaff(v: number, it = true) {
	let m = $.player.blessed ? 10 : 0
	m = $.player.cursed ? m - 10 : m
	if (!(v % 2) && !potions[v].identified) $.news(`\t${it ? 'quaffed' : 'tossed'}${$.an(potion[v])}`)
	if (it) {
		potions[v].identified = $.online.int > (85 - 4 * $.player.poison)	//	recall seeing this before
		xvt.out('It was', xvt.bright, v % 2 ? xvt.red : xvt.green, $.an(potion[v]), xvt.reset, '.\n')
		$.sound('quaff', 6)
		switch (v) {
	//	Potion of Cure Light Wounds
		case 0:
			$.sound('yum')
			$.online.hp += $.dice($.player.hp - $.online.hp)
			break

	//	Vial of Weakness
		case 1:
			$.player.str = $.PC.ability($.player.str, -1)
			$.online.str = $.PC.ability($.online.str, -$.dice(10))
			break

	//	Potion of Charm
		case 2:
			if (($.player.cha = $.PC.ability($.player.cha, 1, 99)) > $.player.maxcha)
				$.player.maxcha = $.PC.ability($.player.maxcha, 1, $.player.maxcha, 1)
			$.online.cha = $.PC.ability($.online.cha, $.dice(10), $.player.maxcha, m)
			break

	//	Vial of Stupidity
		case 3:
			$.player.int = $.PC.ability($.player.int, -1)
			$.online.int = $.PC.ability($.online.int, -$.dice(10))
			break

	//	Potion of Agility
		case 4:
			if (($.player.dex = $.PC.ability($.player.dex, 1, 99)) > $.player.maxdex)
				$.player.maxdex = $.PC.ability($.player.maxdex, 1, $.player.maxdex, 1)
			$.online.dex = $.PC.ability($.online.dex, $.dice(10), $.player.maxdex, m)
			break

	//	Vial of Clumsiness
		case 5:
			$.player.dex = $.PC.ability($.player.dex, -1)
			$.online.dex = $.PC.ability($.online.dex, -$.dice(10))
			break

	//	Potion of Wisdom
		case 6:
			if (($.player.int = $.PC.ability($.player.int, 1, 99)) > $.player.maxint)
				$.player.maxint = $.PC.ability($.player.maxint, 1, $.player.maxint, 1)
			$.online.int = $.PC.ability($.online.int, $.dice(10), $.player.maxint, m)
			break

	//	Vile Vial
		case 7:
			$.player.cha = $.PC.ability($.player.cha, -1)
			$.online.cha = $.PC.ability($.online.cha, -$.dice(10))
			break

	//	Potion of Stamina
		case 8:
			if (($.player.str = $.PC.ability($.player.str, 1, 99)) > $.player.maxstr)
				$.player.maxstr = $.PC.ability($.player.maxstr, 1, $.player.maxstr, 1)
			$.online.str = $.PC.ability($.online.str, $.dice(10), $.player.maxstr, m)
			break

	//	Vial of Slaad Secretions
		case 9:
			$.sound('hurt')
			if (($.online.hp -= $.dice($.player.hp / 2)) < 1) {
				$.online.hp = 0
				$.online.sp = 0
				$.reason = `quaffed${$.an(potion[v])}`
			}
			break

	//	Potion of Mana
		case 10:
			$.sound('shimmer')
			$.online.sp += $.dice($.player.sp - $.online.sp)
			break

	//	Flask of Fire Water
		case 11:
			if (($.online.sp -= $.dice($.online.sp / 2)) < 1)
				$.online.sp = 0
			break

	//	Elixir of Restoration
		case 12:
			$.music('elixir')
			$.online.hp = $.player.hp
			$.online.sp = $.player.sp
			$.online.str = $.PC.ability($.player.str, 0, $.player.maxstr, m)
			$.online.int = $.PC.ability($.player.int, 0, $.player.maxint, m)
			$.online.dex = $.PC.ability($.player.dex, 0, $.player.maxdex, m)
			$.online.cha = $.PC.ability($.player.cha, 0, $.player.maxcha, m)
			break

	//	Vial of Crack
		case 13:
			$.music('crack')
			$.player.maxstr = $.PC.ability($.player.maxstr, $.player.maxstr > 80 ? -2 : -1)
			$.player.maxint = $.PC.ability($.player.maxint, $.player.maxint > 80 ? -2 : -1)
			$.player.maxdex = $.PC.ability($.player.maxdex, $.player.maxdex > 80 ? -2 : -1)
			$.player.maxcha = $.PC.ability($.player.maxcha, $.player.maxcha > 80 ? -2 : -1)
			$.player.str = $.PC.ability($.player.str, $.player.str > 60 ? -$.dice(3) - 2 : -2)
			$.player.int = $.PC.ability($.player.int, $.player.int > 60 ? -$.dice(3) - 2 : -2)
			$.player.dex = $.PC.ability($.player.dex, $.player.dex > 60 ? -$.dice(3) - 2 : -2)
			$.player.cha = $.PC.ability($.player.cha, $.player.cha > 60 ? -$.dice(3) - 2 : -2)
			$.online.str = $.PC.ability($.online.str, $.online.str > 40 ? -$.dice(6) - 4 : -3)
			$.online.int = $.PC.ability($.online.int, $.online.int > 40 ? -$.dice(6) - 4 : -3)
			$.online.dex = $.PC.ability($.online.dex, $.online.dex > 40 ? -$.dice(6) - 4 : -3)
			$.online.cha = $.PC.ability($.online.cha, $.online.cha > 40 ? -$.dice(6) - 4 : -3)
			break

	//	Potion of Augment
		case 14:
			$.sound('hone', 6)
			$.player.maxstr = $.PC.ability($.player.maxstr, $.player.maxstr < 95 ? 2 : 1)
			$.player.maxint = $.PC.ability($.player.maxint, $.player.maxint < 95 ? 2 : 1)
			$.player.maxdex = $.PC.ability($.player.maxdex, $.player.maxdex < 95 ? 2 : 1)
			$.player.maxcha = $.PC.ability($.player.maxcha, $.player.maxcha < 95 ? 2 : 1)
			$.player.str = $.PC.ability($.player.str, $.dice(3) + 2, $.player.maxstr)
			$.player.int = $.PC.ability($.player.int, $.dice(3) + 2, $.player.maxint)
			$.player.dex = $.PC.ability($.player.dex, $.dice(3) + 2, $.player.maxdex)
			$.player.cha = $.PC.ability($.player.cha, $.dice(3) + 2, $.player.maxcha)
			$.online.str = $.PC.ability($.online.str, $.dice(100 - $.online.str), $.player.maxstr, m)
			$.online.int = $.PC.ability($.online.int, $.dice(100 - $.online.int), $.player.maxint, m)
			$.online.dex = $.PC.ability($.online.dex, $.dice(100 - $.online.dex), $.player.maxdex, m)
			$.online.cha = $.PC.ability($.online.cha, $.dice(100 - $.online.cha), $.player.maxcha, m)
			break

	//	Beaker of Death
		case 15:
			$.sound('killed', 12)
			$.online.hp = 0
			$.online.sp = 0
			$.reason = `quaffed${$.an(potion[v])}`
			break
		}
	}
	if (!$.reason) pause = true
}

}

export = Dungeon
