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
	let b4: number

	//  £
    const Cleric = {
        VT: '\x1B(0\x7D\x1B(B',
        PC: '\x9C',
        XT: '\u00A3',
        dumb: '$'
    }

	const Mask = ['   ', ' ♗ ', '♗ ♗', '♗♗♗', '☨♝☨']
	const Monster = {
		rlogin:	[ '   ', 'Mon', 'M+M', 'Mob', 'MOB' ],
		telnet:	[ '   ', 'Mon', 'M+M', 'Mob', 'MOB' ]
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
		'C': { description:'ast' },
		'P': { description:'oison' },
		'Y': { description:'our status' }
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

    $.loadUser($.dwarf)


export function DeepDank(start: number, cb: Function) {
	pause = false
	skillkill = false
	Battle.teleported = false

	party = []
	party.push($.online)
	tl = Math.round((xvt.sessionAllowed - ((new Date().getTime() - xvt.sessionStart.getTime()) / 1000)) / 60) + 3

	deep = 0
	Z = start < 0 ? 0 : start > 99 ? 99 : start
	fini = cb

	if ($.access.sysop) crawling['M'] = { description: 'y liege' }
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
	if ($.reason) {
		scroll()
		xvt.hangup()
	}

//	did player cast teleport?
	if (!Battle.retreat && Battle.teleported) {
		scroll(1, false)
		xvt.outln(xvt.magenta, 'You open a ', xvt.bright, 'mystic portal', xvt.normal, '.\n')
		$.sound('portal', 4)
		Battle.teleported = false
		teleport()
		return
	}

//	did player just do something eventful worthy of the big bonus?
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
			}, cancel:' ', enter:'\x0D', pause:true, timeout:20 }
		}
		xvt.app.focus = 'pause'
		return
	}

//	is a redraw needed?
	if (process.stdout.rows && process.stdout.rows !== $.player.rows) {
		$.player.rows = process.stdout.rows
		refresh = true
	}
	if (refresh) drawLevel()

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
	if ($.dice(DL.spawn * (!ROOM.type ? 2 : ROOM.type == 'cavern' ? 1 : 3)) == 1) {
		let s = $.dice(5) - 1
		xvt.outln()
		xvt.out(xvt.faint, ['Your skin crawls'
			, 'Your pulse quickens', 'You feel paranoid', 'Your grip tightens'
			, 'You stand ready'][s], ' from hearing a ')
		//	only play sound when pairing is close to its description
		if (s == 1) $.sound('pulse')
		switch ($.dice(5)) {
			case 1:
				if (s == 0) $.sound('creak' + $.dice(2))
				xvt.out('creaking sound')
				break
			case 2:
				if (s == 2) $.sound('thunder')
				xvt.out('clap of thunder')
				break
			case 3:
				if (s == 3) $.sound('ghostly')
				xvt.out('ghostly whisper')
				break
			case 4:
				if (s == 4) $.sound('growl')
				xvt.out('beast growl')
				break
			case 5:
				$.sound('laugh')
				xvt.out('maniacal laugh')
				break
		}
		if (Math.abs(Y - y) < 3 && Math.abs(X - x) < 3)
			xvt.outln(' nearby!')
		else if (Math.abs(Y - y) < 6 && Math.abs(X - x) < 6)
			xvt.outln(' off in the distance.')
		else
			xvt.outln(' as a faint echo.')

		if (putMonster(y, x)) {
			if (DL.map && DL.map !== 'map')
				drawRoom(y, x)
			if (ROOM.occupant == 'cleric' && DL.cleric.hp) {
				$.sound('agony', 10)
				xvt.outln(xvt.bright, xvt.yellow, 'You hear a dying cry of agony!!')
				xvt.waste(1000)
				DL.cleric.hp = 0
				DL.cleric.sp = 0
				DL.cleric.user.status = 'dead'
				ROOM.giftItem = 'chest'
				ROOM.giftIcon = $.player.emulation === 'XT' ? '⌂' : dot
				ROOM.giftValue = 0
				DL.cleric.user.coin.value = 0
				if (DL.map && DL.map !== 'map')
					drawRoom(y, x)
				xvt.waste(1000)
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
	drawHero($.player.blessed ? true : false)

	x = $.online.cha * $.online.int / 10 + $.online.dex / (deep + 1) - DL.moves + deep
	if ($.player.level / 9 - deep > $.Security.name[$.player.security].protection + 1)
		x /= $.player.level
	if (x < 6) x = 6
	if ($.dice(x) == 1) {
		let rng = $.dice(16)
		if (rng > 8) {
			if ($.tty == 'web') xvt.out(' 🦇  ')
			xvt.out(xvt.faint, 'A bat flies by and soils your ', xvt.normal)
			$.sound('splat', 4)
			$.player.toAC -= $.dice(deep)
			xvt.out(xvt.yellow, $.player.armor, $.buff($.player.toAC, $.online.toAC))
			if ($.tty == 'web') xvt.out(' 💩')
		}
		else if (rng > 4) {
			if ($.tty == 'web') xvt.out(' 💧  ')
			xvt.out(xvt.blue, 'A drop of ', xvt.bright, 'acid water', xvt.normal, ' lands on your ')
			$.sound('drop', 4)
			$.player.toWC -= $.dice(deep)
			xvt.out(xvt.bright, xvt.cyan, $.player.weapon, $.buff($.player.toWC, $.online.toWC))
		}
		else if (rng > 2) {
			if ($.tty == 'web') xvt.out(' 😬  ')
			xvt.out(xvt.yellow, 'You trip on the rocky surface and hurt yourself.')
			$.sound('hurt', 5)
			$.online.hp -= $.dice(Z)
			if ($.online.hp < 1) $.death('fell down')
		}
		else if (rng > 1) {
			if ($.tty == 'web') xvt.out(' 🐝  🐝  🐝  🐝  ')
			xvt.out(xvt.bright, xvt.red, 'You are attacked by a swarm of bees')
			if ($.tty == 'web') xvt.out(xvt.reset, ' 🐝  🐝  🐝  🐝')
			else
				xvt.out('!')
			$.sound('crack', 12)
			for (x = 0, y = $.dice(Z); x < y; x++)
				$.online.hp -= $.dice(Z)
			if ($.online.hp < 1) $.death('killer bees')
		}
		else {
			$.music('.')
			xvt.out(xvt.bright, xvt.white)
			if ($.tty == 'web') xvt.out(' ⚡  ')
			xvt.out('A bolt of lightning strikes you!')
			$.player.toAC -= $.dice($.online.armor.ac / 2)
			$.online.toAC -= $.dice($.online.armor.ac / 2)
			$.player.toWC -= $.dice($.online.weapon.wc / 2)
			$.online.toWC -= $.dice($.online.weapon.wc / 2)
			$.online.hp -= $.dice($.player.hp / 2)
			$.sound('boom', 10)
			if ($.online.hp < 1) $.death('struck by lightning')
		}
		if ($.online.weapon.wc > 0 && $.online.weapon.wc + $.online.toWC + $.player.toWC < 0) {
			xvt.out(`\nYour ${$.player.weapon} is damaged beyond repair; you toss it aside.`)
			$.Weapon.equip($.online, $.Weapon.merchant[0])
		}
		if ($.online.armor.ac > 0 && $.online.armor.ac + $.online.toAC + $.player.toAC < 0) {
			xvt.out(`\nYour ${$.player.armor} is damaged beyond repair; you toss it aside.`)
			$.Armor.equip($.online, $.Armor.merchant[0])
		}
		xvt.outln()
	}

	//  insert any wall messages here
	if ($.tty == 'web') xvt.out('\x06')
	if ($.reason) {
		scroll()
		xvt.hangup()
	}

	//	user input
	xvt.app.form = {
		'command': { cb:command, cancel:'Y', enter:'?', eol:false, timeout:20 }
	}
	xvt.app.form['command'].prompt = ''
	if (suppress)
		xvt.app.form['command'].prompt += `${deep ? xvt.attr(xvt.faint, iii[deep], xvt.normal) : ''}:`
	else {
		if ($.player.magic && $.player.spells.length)
			xvt.app.form['command'].prompt += xvt.attr(
				$.bracket('C', false), xvt.cyan, 'ast, '
			)
		if ($.player.poison && $.player.poisons.length)
			xvt.app.form['command'].prompt += xvt.attr(
				$.bracket('P', false), xvt.cyan, 'oison, '
			)
		if (Y > 0 && DL.rooms[Y][X].type !== 'w-e')
			if (DL.rooms[Y - 1][X].type !== 'w-e')
				xvt.app.form['command'].prompt += xvt.attr(
					$.bracket('N', false), xvt.cyan, 'orth, '
				)
		if (Y < DL.rooms.length - 1 && DL.rooms[Y][X].type !== 'w-e')
			if (DL.rooms[Y + 1][X].type !== 'w-e')
				xvt.app.form['command'].prompt += xvt.attr(
					$.bracket('S', false), xvt.cyan, 'outh, ',
				)
		if (X < DL.width - 1 && DL.rooms[Y][X].type !== 'n-s')
			if (DL.rooms[Y][X + 1].type !== 'n-s')
				xvt.app.form['command'].prompt += xvt.attr(
					$.bracket('E', false), xvt.cyan, 'ast, ',
				)
		if (X > 0 && DL.rooms[Y][X].type !== 'n-s')
			if (DL.rooms[Y][X - 1].type !== 'n-s')
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
	xvt.outln()

    switch (choice) {
	case 'M':	//	#tbt
		DL.map = `Marauder's map`
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
		xvt.outln()
		Battle.yourstats(false)
		break

	case 'N':
		if (Y > 0 && DL.rooms[Y][X].type !== 'w-e')
			if (DL.rooms[Y - 1][X].type !== 'w-e') {
				eraseHero($.player.blessed ? true : false)
				Y--
				looked = false
				break
			}
		oof('north')
		break

	case 'S':
		if (Y < DL.rooms.length - 1 && DL.rooms[Y][X].type !== 'w-e')
			if (DL.rooms[Y + 1][X].type !== 'w-e') {
				eraseHero($.player.blessed ? true : false)
				Y++
				looked = false
				break
			}
		oof('south')
		break

	case 'E':
		if (X < DL.width - 1 && DL.rooms[Y][X].type !== 'n-s')
			if (DL.rooms[Y][X + 1].type !== 'n-s') {
				eraseHero($.player.blessed ? true : false)
				X++
				looked = false
				break
			}
		oof('east')
		break

	case 'W':
		if (X > 0 && DL.rooms[Y][X].type !== 'n-s')
			if (DL.rooms[Y][X - 1].type !== 'n-s') {
				eraseHero($.player.blessed ? true : false)
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
	xvt.outln(xvt.bright, xvt.yellow, 'Oof!', xvt.normal, ` There is a wall to the ${wall}.`)
	xvt.waste(400)
	if (($.online.hp -= $.dice(deep + Z + 1)) < 1) {
		$.online.hp = 0
		$.music('.')
		xvt.outln(xvt.faint, '\nYou take too many hits and die!')
		xvt.waste(600)
		$.death(Battle.retreat ? 'running into a wall' : 'banged head against a wall')
		if (deep) $.reason += `-${iii[deep]}`
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

	xvt.outln()
	if (looked) return true

	//	monsters?
	if (ROOM.monster.length) {
		$.action('battle')
		if (!refresh) drawRoom(Y, X, true, true)
		scroll(1, false)

		if (ROOM.monster.length == 1) {
			xvt.outln(`There's something lurking in here . . .`)
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
			xvt.outln(`There's a party waiting for `
				, ['you', 'the main course', 'the entertainment', 'meat', 'a good chew'][$.dice(5) - 1]
				, ' . . .')
			let m = {}
			for (let i = 0; i < ROOM.monster.length; i++)
				m['mob' + (i+1)] = 'monster/' + ($.PC.name['monster'][ROOM.monster[i].user.pc] || $.PC.name['tavern'][ROOM.monster[i].user.pc] ? ROOM.monster[i].user.pc.toLowerCase() : 'monster')
			$.profile(m)
		}
		xvt.waste(800)

		for (let n = 0; n < ROOM.monster.length; n++) {
			if (ROOM.monster.length < 4) {
				$.cat('dungeon/' + ROOM.monster[n].user.handle)
				xvt.outln()
			}

			let what = ROOM.monster[n].user.handle
			if (ROOM.monster[n].user.xplevel > 0)
				what = [xvt.attr(xvt.faint, 'lesser '), '', xvt.attr(xvt.bright, xvt.white, 'greater ')]
					[ROOM.monster[n].user.xplevel - ROOM.monster[n].user.level + 1] + what
			xvt.out(`It's`, $.an(what), xvt.reset, '... ')
			xvt.waste(ROOM.monster.length < 4 ? 400 : 100)

			if ($.player.novice || ($.dice(ROOM.monster[n].user.xplevel / 5 + 5) * (101 - $.online.cha + deep) > 1)) {
				if (ROOM.monster[n].user.xplevel > 0)
					xvt.outln(`and it doesn't look friendly.`)
				else
					xvt.outln('and it looks harmless, for now.')
				if (isNaN(+ROOM.monster[n].user.weapon)) xvt.outln('\n', $.who(ROOM.monster[n], 'He'), $.Weapon.wearing(ROOM.monster[n]), '.')
				if (isNaN(+ROOM.monster[n].user.armor)) xvt.outln('\n', $.who(ROOM.monster[n], 'He'), $.Armor.wearing(ROOM.monster[n]), '.')
			}
			else {
				xvt.outln(xvt.bright, xvt.yellow, `and it's `
					, [ 'bewitched', 'charmed', 'dazzled', 'impressed', 'seduced' ][$.dice(5) - 1]
					, ' by your '
					, [ 'awesomeness', 'elegance', 'presence', $.player.armor, $.player.weapon ][$.dice(5) - 1]
					, '!')
				ROOM.monster[n].user.gender = 'FM'[$.dice(2) - 1]
				ROOM.monster[n].user.handle = xvt.attr(xvt.faint, xvt.cyan, 'charmed ', ROOM.monster[n].user.handle, xvt.reset)
				ROOM.monster[n].user.xplevel = $.dice(4) - 2
				party.push(ROOM.monster[n])
				ROOM.monster.splice(n, 1)
			}
			xvt.waste(ROOM.monster.length < 4 ? 400 : 200)
		}

		if (ROOM.monster.length) {
			b4 = ROOM.monster.length > 3 ? -ROOM.monster.length : ROOM.monster.length > 2 ? $.online.hp : 0
			Battle.engage('Dungeon', party, ROOM.monster, doSpoils)
			return false
		}

		pause = true
		return true
	}

	//	npc?
	if (ROOM.occupant && !refresh) drawRoom(Y, X)
	switch (ROOM.occupant) {
		case 'trapdoor':
			if ($.dice(100 - Z) > 1) {
				xvt.outln('You have stepped onto a trapdoor!')
				xvt.waste(300)
				xvt.outln()
				let u = ($.dice(127 + deep - ($.player.backstab <<1) - ($.player.steal <<2)) < $.online.dex)
				for (let m = party.length - 1; m > 0; m--) {
					if ($.dice(120) < party[m].dex)
						xvt.outln(party[m].user.handle, xvt.faint, ' manages to catch the edge and stop from falling.')
					else {
						xvt.outln(xvt.yellow, party[m].user.handle, xvt.bright, ' falls down a level!')
						if (u) party.splice(m, 1)
					}
					xvt.waste(300)
				}
				if (u) {
					xvt.outln('You manage to catch the edge and stop yourself from falling.')
					ROOM.occupant = ''
				}
				else {
					party = []
					party.push($.online)
					xvt.outln(xvt.bright, xvt.yellow, 'You fall down a level!')
					xvt.waste(600)
					if ($.dice(100 + $.player.level - Z) > $.online.dex) {
						if ($.dice($.online.cha / 10 + deep) <= (deep + 1))
							$.player.toWC -= $.dice(Math.abs(Z - $.player.level))
						$.online.toWC -= $.dice(Math.round($.online.weapon.wc / 10) + 1)
						xvt.outln(`Your ${$.player.weapon} is damaged from the fall!`)
					}
					if ($.dice(100 + $.player.level - Z) > $.online.dex) {
						if ($.dice($.online.cha / 10 + deep) <= (deep + 1))
							$.player.toAC -= $.dice(Math.abs(Z - $.player.level))
						$.online.toAC -= $.dice(Math.round($.online.armor.ac / 10) + 1)
						xvt.outln(`Your ${$.player.armor} is damaged from the fall!`)
					}
					Z++
					generateLevel()
					pause = true
					menu()
					return false
				}
			}
			else {
				ROOM.occupant = ''
				xvt.out(xvt.bright, xvt.cyan, 'A fairie ')
				if ($.dice(50 + Z - deep) > $.online.cha) {
					xvt.outln('flies by you.')
					xvt.out(300)
				}
				else {
					xvt.outln('brushes by you.')
					$.sound('heal')
					for (let i = 0; i <= Z; i++)
						$.online.hp += $.dice($.int(DL.cleric.user.level / 9)) + $.dice($.int(Z / 9 + deep / 3))
					if ($.online.hp > $.player.hp) $.online.hp = $.player.hp
					if ($.player.magic > 1) {
						for (let i = 0; i <= Z; i++)
							$.online.sp += $.dice($.int(DL.cleric.user.level / 9)) + $.dice($.int(Z / 9 + deep / 3))
						if ($.online.sp > $.player.sp) $.online.sp = $.player.sp
					}
				}
				if (!DL.cleric.user.status && DL.cleric.sp < DL.cleric.user.sp) {
					DL.cleric.sp += $.Magic.power(DL.cleric, 7)
					if (DL.cleric.sp > DL.cleric.user.sp) DL.cleric.sp = DL.cleric.user.sp
				}
			}
			break

		case 'portal':
			$.action('ny')
			$.profile({ jpg:'ddd', effect:'fadeIn' })
			xvt.out(xvt.bright, xvt.blue, `You've found a portal to a deeper and more dank dungeon.`)
			xvt.app.form = {
				'deep': { cb: () => {
					ROOM.occupant = ''
					xvt.outln()
					if (/Y/i.test(xvt.entry)) {
						xvt.out(xvt.bright, xvt.white, `You vanish `, xvt.normal, `into dungeon `, xvt.faint, `${iii[++deep]} ... `)
						$.animated('flipOutY')
						$.sound('portal', 12)
						generateLevel()
						xvt.outln()
					}
					else
						$.animated('fadeOut')
					menu()
				}, prompt:'Descend even deeper (Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:20 }
			}
			xvt.app.focus = 'deep'
			return false

		case 'well':
			scroll(1, false)
			$.music('well')
			xvt.waste(600)
			xvt.outln(xvt.magenta, 'You have found a legendary Wishing Well.')
			xvt.waste(600)
			xvt.outln(); xvt.waste(600)			
			xvt.outln(xvt.bright, xvt.yellow, 'What do you wish to do?')
			xvt.waste(600)

			let well = 'BCFORT'
			xvt.out($.bracket('B'), 'Bless yourself')
			xvt.out($.bracket('C'), 'Curse another player')
			xvt.out($.bracket('F'), 'Fix all your damage')
			xvt.out($.bracket('O'), 'Teleport all the way out')
			xvt.out($.bracket('R'), 'Resurrect all the dead players')
			xvt.out($.bracket('T'), 'Teleport to another level')
			if (deep > 1) { xvt.out($.bracket('L'), `Loot another player's money`); well += 'L' }
			if (deep > 3) { xvt.out($.bracket('G'), 'Grant another call'); well += 'G' }
			if (deep > 5) { xvt.out($.bracket('K'), 'Key hint(s)'); well += 'K' }
			if (deep > 7) {
				xvt.out($.bracket('D'), 'Destroy dank dungeon'); well += 'D'
				xvt.out($.bracket('M'), 'Magical spell(s) or device(s)'); well += 'M'
			}
			xvt.outln()

			$.action('well')
			xvt.app.form = {
				'well': { cb: () => {
					ROOM.occupant = ''
					xvt.outln()
					let wish = xvt.entry.toUpperCase()
					if (wish === '' || well.indexOf(wish) < 0) {
						$.sound('oops')
						xvt.app.refocus()
						return
					}
					$.animated('flipOutX')
					xvt.outln()

					switch (wish) {
					case 'B':
						if ($.player.cursed) {
							$.player.coward = false
							$.player.cursed = ''
							xvt.out(xvt.bright, xvt.black, 'The dark cloud has left you.')
							$.news(`\tlifted curse`)
						}
						else {
							$.sound('shimmer')
							$.player.blessed = 'well'
							xvt.out(xvt.yellow, 'You feel ', xvt.bright, 'a shining aura', xvt.normal, ' surround you.')
							$.news(`\twished for a blessing`)
						}
						$.PC.adjust('str', 10)
						$.PC.adjust('int', 10)
						$.PC.adjust('dex', 10)
						$.PC.adjust('cha', 10)
						break

					case 'C':
						Battle.user('Curse', (opponent: active) => {
							if (opponent.user.id === $.player.id) {
								opponent.user.id = ''
								xvt.outln(`You can't curse yourself.`)
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
							}, prompt:`Level (${start}-${end}): `, cancel:`${Z}`, enter:`${end}`, min:1, max:3, timeout:30 }
						}
						xvt.app.focus = 'level'
						return

					case 'D':
						xvt.outln(xvt.bright, xvt.black, 'Your past time in this dungeon is eradicated and reset.')
						$.sound('destroy', 32)
						for (let i in dd)
							delete dd[i]
						$.dungeon++
						generateLevel()
						break

					case 'O':
						$.sound('teleport')
						scroll(1, false, true)
						xvt.outln()
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
						xvt.out(xvt.bright, xvt.cyan, 'You are completely healed and all damage is repaired.\n')
						break

					case 'L':
						Battle.user('Loot', (opponent: active) => {
							if (opponent.user.id === $.player.id) {
								opponent.user.id = ''
								xvt.outln(`You can't loot yourself.`)
							}
							else if (opponent.user.novice) {
								opponent.user.id = ''
								xvt.outln(`You can't loot novice players.`)
							}
							if (opponent.user.id) {
								let loot = new $.coins(opponent.user.coin.value + opponent.user.bank.value)
								$.log(opponent.user.id, `\n${$.player.handle} wished for your ${loot.carry()}`)
								$.news(`\tlooted ${opponent.user.handle}`)
								$.player.coin.value += loot.value
								opponent.user.coin.value = 0
								opponent.user.bank.value = 0
								$.saveUser(opponent)
								$.sound('max')
							}
							menu()
							return
						})
						return

					case 'G':
						if ($.player.today) {
							$.sound('shimmer')
							$.player.today--
							xvt.outln('You are granted another call for the day.')
							$.news(`\twished for an extra call`)
						}
						else {
							xvt.outln('A deep laughter bellows... ')
							$.sound('morph', 12)
						}
						break

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
											xvt.outln(`A Wand of ${spell} appears in your hand.`)
											break
										case 2:
											$.beep()
											xvt.outln(`You add a Scroll of ${spell} to your arsenal.`)
											break
										case 3:
											$.sound('shimmer')
											xvt.outln(`The Spell of ${spell} is revealed to you.`)
											break
										case 4:
											$.sound('shimmer')
											xvt.outln(`${spell} is known to you.`)
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
					menu()
				}, prompt:'What is thy bidding, my master? ', cancel:'O', enter:'B', eol:false, max:1, timeout:60 }
			}
			xvt.app.focus = 'well'
			return false

		case 'wheel':
			$.music('wol')
			xvt.waste(600)
			xvt.outln(xvt.magenta, 'You have found a Mystical Wheel of Life.')
			xvt.waste(600)
			xvt.outln(); xvt.waste(600)
			xvt.outln(xvt.bright, xvt.yellow, 'The runes are ',
				['cryptic', 'familiar', 'foreign', 'speaking out', 'strange'][$.dice(5) - 1],
				' to you.')
			xvt.waste(600)

			$.action('yn')
			$.profile({ png:'wol', effect:'rotateIn' })
			xvt.app.form = {
				'wheel': { cb: () => {
					ROOM.occupant = ''
					xvt.outln()
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
								xvt.out(xvt.faint, '\nThe dark cloud has been lifted.', xvt.reset)
								$.player.cursed = ''
							}
							else {
								$.PC.adjust('str', 0, 2, 1)
								$.PC.adjust('int', 0, 2, 1)
								$.PC.adjust('dex', 0, 2, 1)
								$.PC.adjust('cha', 0, 2, 1)
							}
							$.PC.adjust('str', 10)
							$.PC.adjust('int', 10)
							$.PC.adjust('dex', 10)
							$.PC.adjust('cha', 10)
							break
						case 1:
							if ($.player.blessed) {
								xvt.out(xvt.bright, xvt.yellow, '\nYour shining aura ', xvt.normal, 'has left ', xvt.faint, 'you.', xvt.reset)
								$.player.blessed = ''
							}
							else {
								$.PC.adjust('str', 0, -2, -1)
								$.PC.adjust('int', 0, -2, -1)
								$.PC.adjust('dex', 0, -2, -1)
								$.PC.adjust('cha', 0, -2, -1)
							}
							$.PC.adjust('str', -10)
							$.PC.adjust('int', -10)
							$.PC.adjust('dex', -10)
							$.PC.adjust('cha', -10)
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
							if ($.player.magic > 1)
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
							$.death('Wheel of Death')
							break
						case 6:
							$.keyhint($.online)
							$.sound('shimmer', 12)
							break
						case 7:
							$.player.level = $.dice(Z)
							if ($.online.adept) $.player.level += $.dice($.player.level)
							$.reroll($.player, $.PC.random('monster'), $.player.level)
							$.activate($.online)
							$.online.altered = true
							$.player.gender = ['F','M'][$.dice(2) - 1]
							$.saveUser($.player)
							$.news(`\t${$.player.handle} got morphed into a level ${$.player.level} ${$.player.pc} (${$.player.gender})!`)
							xvt.outln(`You got morphed into a level ${$.player.level} ${$.player.pc} (${$.player.gender})!`)
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
				}, prompt:'Will you spin it (Y/N)? ', cancel:'N', enter:'Y', eol:false, match:/Y|N/i, max:1, timeout:15 }
			}
			xvt.app.focus = 'wheel'
			pause = true
			refresh = true
			return false

		case 'thief':
			xvt.out(xvt.cyan, xvt.faint, 'There is a thief in this ', !ROOM.type ? 'chamber'
				: ROOM.type == 'n-s' ? 'hallway' : ROOM.type == 'w-e' ? 'corridor' : 'cavern'
				, '! ', xvt.white)
			xvt.waste(600)
			ROOM.occupant = ''

			if ((Z + 1) >= $.taxman.user.level && $.player.level < $.taxman.user.level) {
				$.loadUser($.taxman)
				xvt.outln(xvt.reset, $.who($.taxman, 'He'), 'is the '
					, xvt.bright, xvt.cyan, 'Master of Coin'
					, xvt.reset, ' for '
					, xvt.bright, xvt.magenta, $.king.handle
					, xvt.reset, '!')
				$.profile({ png:'player/' + $.taxman.user.pc.toLowerCase() + ($.taxman.user.gender === 'F' ? '_f' : '')
					, handle:$.taxman.user.handle
					, level:$.taxman.user.level, pc:$.taxman.user.pc
					, effect:'bounceInDown'
				})
				$.sound('oops')
				$.activate($.taxman)
				$.taxman.user.coin.value = $.player.coin.value
				if (isNaN(+$.taxman.user.weapon)) xvt.outln('\n', $.who($.taxman, 'He'), $.Weapon.wearing($.taxman), '.')
				xvt.waste(750)
				if (isNaN(+$.taxman.user.armor)) xvt.outln('\n', $.who($.taxman, 'He'), $.Armor.wearing($.taxman), '.')
				xvt.waste(750)
				xvt.outln()

				b4 = 0
				Battle.engage('Taxman', $.online, $.taxman, () => {
					looked = false
					pause = true
					refresh = true
					menu()
				})
				return
			}

			let x = $.dice(DL.width) - 1, y = $.dice(DL.rooms.length) - 1
			let escape = DL.rooms[y][x]
			if (escape.occupant || $.dice(Z * ($.player.steal / 2 + 1) - deep) > Z) {
				if (!escape.occupant) {
					escape.occupant = 'thief'
					xvt.out([
						'He silently ignores you',
						'He recognizes your skill and winks',
						'He slaps your back, but your wallet remains',
						'He offers you a drink, and you accept',
						xvt.attr(`"I'll be seeing you again"`, xvt.cyan, ' as he leaves')
						][$.dice(5) - 1], xvt.cyan, '.')
				}
				else {
					xvt.out(xvt.normal, xvt.magenta, 'He teleports away!')
					$.sound('teleport')
				}
				xvt.outln()
			}
			else {
				escape.occupant = 'thief'
				if (DL.map && DL.map !== 'map')
					xvt.outln('You expect nothing less from the coward.')
				else
					xvt.outln(xvt.bright, xvt.white, 'He surprises you!')
				$.sound('thief', 4)

				xvt.out('As he passes by, he steals your ')
				x = $.online.cha + deep + 1
				if ($.player.level / 9 - deep > $.Security.name[$.player.security].protection + 1)
					x = Math.trunc(x / $.player.level)
				if ($.online.weapon.wc && $.dice(x) == 1) {
					xvt.out($.player.weapon, $.buff($.player.toWC, $.online.toWC))
					$.Weapon.equip($.online, $.Weapon.merchant[0])
					xvt.waste(600)
					$.sound('thief2')
				}
				else if (DL.map && $.dice($.online.cha / 9) - 1 <= $.int(deep / 3)) {
					xvt.out('map')
					DL.map = ''
					refresh = true
				}
				else if ($.player.magic < 3 && $.player.spells.length && $.dice($.online.cha / 10 + deep + 1) - 1 <= $.int(deep / 2)) {
					if ($.tty == 'web') xvt.out('📜  ')
					y = $.player.spells[$.dice($.player.spells.length) - 1]
					xvt.out(Object.keys($.Magic.spells)[y - 1], ' ', ['wand', 'scroll'][$.player.magic - 1])
					$.Magic.remove($.player.spells, y)
				}
				else if ($.player.poisons.length && $.dice($.online.cha / 10 + deep + 1) - 1 <= $.int(deep / 2)) {
					y = $.player.poisons[$.dice($.player.poisons.length) - 1]
					xvt.out('vial of ')
					if ($.tty == 'web') xvt.out('💀  ')
					xvt.out(Object.keys($.Poison.vials)[y - 1])
					$.Poison.remove($.player.poisons, y)
				}
				else if ($.player.coin.value) {
					let pouch = $.player.coin.amount.split(',')
					x = $.dice(pouch.length) - 1
					y = 'csgp'.indexOf(pouch[x].substr(-1))
					xvt.out('pouch of ')
					if ($.tty == 'web') xvt.out('💰  ')
					xvt.out(xvt.bright, [xvt.red,xvt.cyan,xvt.yellow,xvt.magenta][y]
						, ['copper','silver','gold','platinum'][y]
						, xvt.reset, ' pieces')
					$.player.coin.value -= new $.coins(pouch[x]).value
				}
				else
					xvt.out(`Reese's pieces`)
				xvt.outln(xvt.reset, '!')
				xvt.waste(600)
			}
			pause = true
			refresh = true
			break

		case 'cleric':
			if (!DL.cleric.hp) {
				xvt.outln(xvt.yellow, 'You find the ', xvt.white, 'bones'
					, xvt.yellow, ' of an ', xvt.faint, 'old cleric', xvt.normal, '.')
				xvt.waste(600)
				if ($.tty == 'web') xvt.out('⚰️  ')
				xvt.outln('You pray for him.')
				break
			}

			let cast = 7
			let mod = 6 + $.int($.player.melee / 2) - $.int($.player.magic / 2)
			if ($.Ring.power($.player.rings, 'taxes').power) mod++
			if ($.access.sysop) mod++
			if ($.player.coward) mod--
			let cost = new $.coins($.int(($.player.hp - $.online.hp) * $.money(Z) / mod / $.player.hp))
			if (cost.value < 1) cost.value = 1
			cost.value *= ($.int(deep / 3) + 1)
			if (!$.player.coward && $.player.maxcha > 98)	//	typically a Cleric and God
				cost.value = 0
			cost = new $.coins(cost.carry(1, true))	//	just from 1-pouch

			if (ROOM.giftItem == 'chest') {
				ROOM.giftValue = $.dice(6 - $.player.magic) - 1
				cost.value = 0	//	this one is free of charge
			}

			let power = $.int(100 * DL.cleric.sp / DL.cleric.user.sp)
			xvt.outln(xvt.yellow, 'There is an ', xvt.faint, 'old cleric', xvt.normal
				, xvt.normal, ' in this room with '
				, power < 40 ? xvt.faint : power < 80 ? xvt.normal : xvt.bright, `${power}`
				, xvt.normal, '% spell power.')
			xvt.out('He says, ')

			if ($.online.hp >= $.player.hp || cost.value > $.player.coin.value || DL.cleric.sp < $.Magic.power(DL.cleric, cast)) {
				xvt.outln(xvt.yellow, '"I will pray for you."')
				break
			}

			if ((!DL.map || DL.map == 'map') && power > 95) $.profile({ jpg:'npc/old cleric', effect:'zoomInUp' })
			if ($.online.hp > $.int($.player.hp / 3) || DL.cleric.sp < $.Magic.power(DL.cleric, 13)) {
				xvt.out('"I can ', DL.cleric.sp < $.Magic.power(DL.cleric, 13) ? 'only' : 'surely'
					, ' cast a Heal spell on your wounds for '
					, cost.value ? cost.carry() : `you, ${$.player.gender === 'F' ? 'sister' : 'brother'}`
					, '."')
			}
			else if (DL.cleric.sp >= $.Magic.power(DL.cleric, 13)) {
				cast = 13
				xvt.out('"I can restore your health for '
					, cost.value ? cost.carry() : `you, ${$.player.gender === 'F' ? 'sister' : 'brother'}`
					, '."')
			}

			$.action('yn')
			xvt.app.form = {
			'pay': { cb: () => {
					xvt.outln('\n')
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
							xvt.outln(xvt.lyellow, '"God save you."')
							xvt.waste(300)
							ROOM.occupant = ''
							xvt.outln(xvt.magenta, 'He teleports away!')
							$.sound('teleport', 8)
						}
						else {
							xvt.outln(xvt.lyellow, '"I need to rest.  Go in peace."')
							looked = true
						}
					}
					menu()
				}, prompt:`${cost.value ? 'Pay' : 'Receive'} (Y/N)? `, cancel:'N', enter:'Y', eol:false, match:/Y|N/i, max:1, timeout:20 }
			}
			xvt.app.focus = 'pay'
			return false

		case 'wizard':
			$.profile({ jpg:'npc/wizard', effect:'flash' })
			xvt.waste(800)
			xvt.out(xvt.magenta, 'You encounter a ', xvt.bright)

			if (!$.player.cursed && !$.player.novice && $.dice((Z > $.player.level ? Z : 1) + 20 * $.player.immortal + $.player.level + $.online.cha) == 1) {
				xvt.outln('doppleganger', xvt.normal, ' waiting for you.\n')
				$.player.coward = true
				xvt.waste(1200)

				$.profile({ png: 'player/' + $.player.pc.toLowerCase() + ($.player.gender === 'F' ? '_f' : ''), effect:'flip' })
				xvt.outln(xvt.bright, 'It curses you!')
				$.sound('morph', 18)
				$.PC.adjust('str', -10)
				$.PC.adjust('int', -10)
				$.PC.adjust('dex', -10)
				$.PC.adjust('cha', -10)
				if ($.player.blessed) {
					$.player.blessed = ''
					xvt.out(xvt.yellow, 'Your ', xvt.bright, 'shining aura ', xvt.normal, 'left', xvt.faint)
				}
				else {
					$.player.cursed = 'wiz!'
					xvt.out(xvt.bright, xvt.black, 'A dark cloud hovers over')
				}
				$.saveUser($.player)
				xvt.outln(' you.')
				$.news(`\tcursed by a doppleganger!`)
				$.player.coward = false
				$.online.altered = true

				//	vacate
				drawHero()
				$.animated('flipOutY')
				$.sound('teleport', 12)
				ROOM.occupant = ''
				let x:number, y:number
				do {
					y = $.dice(DL.rooms.length) - 1
					x = $.dice(DL.width) - 1
				} while (DL.rooms[y][x].type == 'cavern' || DL.rooms[y][x].occupant)
				DL.rooms[y][x].occupant = 'wizard'
			}
			else if (!$.player.novice && $.dice(Z + $.online.cha) == 1) {
				xvt.outln('mimic', xvt.normal, ' occupying this space.\n')
				xvt.waste(1200)

				$.profile({ png: 'player/' + $.player.pc.toLowerCase() + ($.player.gender === 'F' ? '_f' : ''), effect:'flip' })
				xvt.waste(1800)
				xvt.out(xvt.faint, 'It waves a hand at you ... '); xvt.waste(1200)
				xvt.outln()

				//	vacate
				drawHero()
				$.animated('flipOutY')
				$.sound('teleport', 12)
				ROOM.occupant = ''
				let x:number, y:number
				do {
					y = $.dice(DL.rooms.length) - 1
					x = $.dice(DL.width) - 1
				} while (DL.rooms[y][x].type == 'cavern' || DL.rooms[y][x].occupant)
				DL.rooms[y][x].occupant = 'wizard'
			}
			else {
				xvt.outln('wizard', xvt.normal, ' in this room.\n')
				scroll(1, false)
				xvt.waste(300)
				teleport()
				return false
			}
			refresh = true
			pause = true
			break

		case 'dwarf':
			$.profile({ jpg:'npc/dwarf', effect:'fadeIn' })
			$.beep()
			xvt.outln(xvt.yellow, 'You run into a ', xvt.bright, 'dwarven merchant', xvt.normal, ', ', $.dwarf.user.handle, '.')
			xvt.waste(1000)
			let hi = 0, credit = new $.coins(0), ring = $.dwarf.user.rings[0]

			$.action('ny')
			xvt.app.form = {
			'armor': { cb: () => {
					xvt.outln()
					ROOM.occupant = ''
					if (/Y/i.test(xvt.entry)) {
						$.player.coin = new $.coins(0)
						$.Armor.equip($.online, $.Armor.dwarf[hi])
						$.player.toAC = 2 - $.dice(3)
						$.online.toAC = $.dice($.online.armor.ac) - 2
						$.sound('click')
					}
					else {
						xvt.outln()
						xvt.out(xvt.yellow, $.dwarf.user.handle, ' eyes you suspicously ... ')
						xvt.waste(600)
						if ($.player.level > $.dwarf.user.level) {
							if ($.Ring.wear($.player.rings, ring)) {
								$.getRing('inherit', ring)
								$.saveRing(ring, $.player.id)
								$.sound('click', 8)
							}
						}
						else {
							merchant()
							return
						}
					}
					menu()
				}, prompt:'Ok (Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:20 },
			'weapon': { cb: () => {
					xvt.outln()
					ROOM.occupant = ''
					if (/Y/i.test(xvt.entry)) {
						$.player.coin = new $.coins(0)
						$.Weapon.equip($.online, $.Weapon.dwarf[hi])
						$.player.toWC = 2 - $.dice(3)
						$.online.toWC = $.dice($.online.weapon.wc) - 2
						$.sound('click')
					}
					else {
						xvt.out(xvt.yellow, $.dwarf.user.handle, ' evaluates the situation ... ')
						xvt.waste(600)
						if ($.player.level > $.dwarf.user.level) {
							if ($.Ring.wear($.player.rings, ring)) {
								$.getRing('inherit', ring)
								$.saveRing(ring, $.player.id)
								$.sound('click', 8)
							}
						}
						else {
							merchant()
							return
						}
					}
					menu()
				}, prompt:'Ok (Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:20 }
			}

			if ($.dice(2) == 1) {
				let ac = $.Armor.name[$.player.armor].ac
				xvt.out('\nI see you have a class ', $.bracket(ac, false), ' '
					, xvt.bright, $.player.armor, xvt.normal, $.buff($.player.toAC, $.online.toAC))
				ac += $.player.toAC
				if (ac) {
					let cv = new $.coins($.Armor.name[$.player.armor].value)
					credit.value = $.worth(cv.value, $.online.cha)
					if ($.player.toAC) credit.value = Math.trunc(credit.value * (ac + $.player.toAC / ($.player.poison + 1)) / ac)
					if ($.online.toAC < 0) credit.value = Math.trunc(credit.value * (ac + $.online.toAC) / ac)
					if (credit.value > cv.value)
						credit.value = cv.value
				}
				else
					credit.value = 0
				xvt.outln(' worth ', credit.carry())
				xvt.waste(1000)

				for (hi = 0; hi < $.Armor.dwarf.length - 1 && ac >= $.Armor.name[$.Armor.dwarf[hi]].ac; hi++);
				if (new $.coins($.Armor.name[$.Armor.dwarf[hi]].value).value < credit.value + $.player.coin.value) {
					if ($.player.coin.value) xvt.outln('  and all your coin worth ', $.player.coin.carry())
					xvt.waste(1000)
					xvt.out(`I'll trade you for my `, xvt.bright
						, ['exceptional', 'precious', 'remarkable', 'special', 'uncommon'][$.dice(5) - 1], ' '
						, $.bracket($.Armor.name[$.Armor.dwarf[hi]].ac, false), ' ')
					xvt.outln(xvt.bright, xvt.yellow, $.Armor.dwarf[hi])
					xvt.waste(1000)
					xvt.app.focus = 'armor'
					return false
				}
			}
			else {
				let wc = $.Weapon.name[$.player.weapon].wc
				xvt.out('\nI see you carrying a class ', $.bracket(wc, false), ' '
					, xvt.bright, $.player.weapon, xvt.normal, $.buff($.player.toWC, $.online.toWC))
				wc += $.player.toWC
				if (wc) {
					let cv = new $.coins($.Weapon.name[$.player.weapon].value)
					credit.value = $.worth(cv.value, $.online.cha)
					if ($.player.toWC) credit.value = Math.trunc(credit.value * (wc + $.player.toWC / ($.player.poison + 1)) / wc)
					if ($.online.toWC < 0) credit.value = Math.trunc(credit.value * (wc + $.online.toWC) / wc)
					if (credit.value > cv.value)
						credit.value = cv.value
				}
				else
					credit.value = 0
				xvt.outln(' worth ', credit.carry())

				for (hi = 0; hi < $.Weapon.dwarf.length - 1 && wc >= $.Weapon.name[$.Weapon.dwarf[hi]].wc; hi++);
				if (new $.coins($.Weapon.name[$.Weapon.dwarf[hi]].value).value < credit.value + $.player.coin.value) {
					if ($.player.coin.value) xvt.outln('  and all your coin worth ', $.player.coin.carry())
					xvt.waste(1000)
					xvt.out(`I'll trade you for my `, xvt.bright
						, ['exquisite', 'fine', 'jeweled', 'rare', 'splendid'][$.dice(5) - 1], ' '
						, $.bracket($.Weapon.name[$.Weapon.dwarf[hi]].wc, false), ' ')
					xvt.outln(xvt.bright, xvt.cyan, $.Weapon.dwarf[hi])
					xvt.waste(1000)
					xvt.app.focus = 'weapon'
					return false
				}
			}
			xvt.outln(`I've got nothing of interest for trading.  Perhaps next time, my friend?`)
			ROOM.occupant = ''
		}

	//	items?
	switch (ROOM.giftItem) {
		case 'armor':
			let aname = $.Armor.special[ROOM.giftValue]
			let armor = $.Armor.name[aname]
			let ac = $.Armor.name[$.player.armor].ac + $.player.toAC + $.online.toAC
			if (ac < armor.ac) {
				$.Armor.equip($.online, aname)
				xvt.outln(xvt.faint, xvt.yellow, 'You find', xvt.normal, $.an(aname), xvt.bright, '!')
				$.sound('max')
				pause = true
				ROOM.giftItem = ''
			}
			break

		case 'chest':
			let gold = new $.coins($.money(Z))
			gold.value += $.worth(new $.coins($.online.weapon.value).value, $.online.cha)
			gold.value += $.worth(new $.coins($.online.armor.value).value, $.online.cha)
			gold.value *= +ROOM.giftValue
			gold = new $.coins(gold.carry(1, true))
			if (gold.value) {
				$.sound('yahoo', 10)
				xvt.outln(xvt.yellow, 'You find a ', xvt.bright, 'treasure chest'
					, xvt.normal, ' holding ', gold.carry(), '!')
			}
			else {
				xvt.outln(xvt.faint, xvt.yellow, 'You find an empty, treasure chest.')
				$.sound('boo')
			}
			$.player.coin.value += gold.value
			pause = true
			ROOM.giftItem = ''
			break

		case 'magic':
			if (!$.Magic.have($.player.spells, +ROOM.giftValue)) {
				xvt.outln(xvt.bright, xvt.yellow, 'You find a '
					, xvt.cyan, $.Magic.merchant[+ROOM.giftValue - 1], xvt.yellow
					, ' ', $.player.magic == 1 ? 'wand' : 'scroll', '!')
				$.Magic.add($.player.spells, +ROOM.giftValue)
				pause = true
				ROOM.giftItem = ''
			}
			break

		case 'map':
			DL.map = `Marauder's map`
			xvt.outln(xvt.bright, xvt.yellow, `You find ${DL.map}!`)
			pause = true
			refresh = true
			ROOM.giftItem = ''
			break

		case 'poison':
			if (!$.Poison.have($.player.poisons, +ROOM.giftValue)) {
				xvt.outln(xvt.bright, xvt.yellow, 'You find a vial of '
					, $.Poison.merchant[+ROOM.giftValue - 1], '!')
				$.Poison.add($.player.poisons, +ROOM.giftValue)
				pause = true
				ROOM.giftItem = ''
			}
			break

		case 'potion':
			let id = false
			if (ROOM.giftID === undefined && !$.player.coward)
				ROOM.giftID = !$.player.novice
					&& $.dice(100 + +ROOM.giftValue) < ($.online.int / 20 * (1 << $.player.poison) + ($.online.int > 90 ? ($.online.int % 90) <<1
					: 0))
			$.sound('bubbles')
			xvt.out(xvt.bright, xvt.cyan, 'On the ground, you find a ')
			if ($.Ring.power($.player.rings, 'identify').power) potions[ROOM.giftValue].identified = true
			if (potions[ROOM.giftValue].identified || ROOM.giftID || $.access.sysop) {
				$.profile({ png:potions[ROOM.giftValue].image, handle:potion[ROOM.giftValue], effect:'fadeInUp' })
				xvt.out(potion[ROOM.giftValue], '.')
				if (!potions[ROOM.giftValue].identified)	//	recall seeing this before
					potions[ROOM.giftValue].identified = $.player.novice || $.online.int > (85 - 4 * $.player.poison)
				id = true
			}
			else {
				$.profile({ png:potions[ROOM.giftValue].image, handle:'Is it ' + 'nt'[$.dice(2) - 1] + 'asty, precious?', effect:'fadeInUp' })
				xvt.out(potions[ROOM.giftValue].description, xvt.bright, xvt.cyan, ' potion', xvt.reset, '.')
			}

			if (id ||
				($.dice(100 + 10 * +ROOM.giftValue * +$.player.coward) + $.dice(deep / 2) < (50 + $.int($.online.int / 2)) && $.dice(100) > 1)) {
				$.action('potion')
				xvt.app.form = {
					'quaff': { cb: () => {
						xvt.outln('\n')
						if (/N/i.test(xvt.entry)) {
							looked = true
							menu()
							return
						}
						if (/Y/i.test(xvt.entry)) {
							xvt.out(xvt.bright)
							quaff(+ROOM.giftValue)
						}
						else if (/T/i.test(xvt.entry)) {
							xvt.out(xvt.faint)
							quaff(+ROOM.giftValue, false)
							$.sound('click')
							pause = false
						}
						ROOM.giftItem = ''
						menu()
					}, prompt:'Will you drink it (Yes/No/Toss)? ', cancel:'T', enter:'N', eol:false, match:/Y|N|T/i, timeout:10 }
				}
				xvt.app.focus = 'quaff'
				return false
			}
			else {
				let auto = $.dice(2) < 2
				xvt.waste(600)
				xvt.outln(xvt.faint, '\nYou ', auto ? 'quaff' : 'toss', ' it without hesitation.')
				xvt.waste(600)
				quaff(+ROOM.giftValue, auto)
				ROOM.giftItem = ''
			}
			break

		case 'ring':
			let ring = ROOM.giftValue.toString()
			if (!$.ringBearer(ring) && $.Ring.wear($.player.rings, ring)) {
				$.getRing('find', ring)
				$.saveRing(ring, $.player.id, $.player.rings)
				pause = true
				ROOM.giftItem = ''
			}
			break

		case 'weapon':
			let wname = $.Weapon.special[ROOM.giftValue]
			let weapon = $.Weapon.name[wname]
			let wc = $.Weapon.name[$.player.weapon].wc + $.player.toWC + $.online.toWC

			if (wc < weapon.wc) {
				$.Weapon.equip($.online, wname)
				xvt.outln(xvt.faint, xvt.cyan, 'You find', xvt.normal, $.an(wname), xvt.bright, '!')
				$.sound('max')
				pause = true
				ROOM.giftItem = ''
			}
			break

		case 'xmagic':
			if (!$.Magic.have($.player.spells, ROOM.giftValue)) {
				xvt.outln(xvt.bright, xvt.yellow, 'You find a '
					, xvt.magenta, $.Magic.special[+ROOM.giftValue - $.Magic.merchant.length - 1], xvt.yellow
					, ' ', $.player.magic == 1 ? 'wand' : 'scroll', '!')
				$.Magic.add($.player.spells, +ROOM.giftValue)
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
	looked = false
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
						xvt.outln(xvt.bright, xvt.black, 'The dark cloud has left you.')
						$.player.cursed = ''
					}
					let m = $.int((mon.user.xplevel - Z) / 6)
					$.beep()
					xvt.out(xvt.lyellow, `+ ${mon.user.pc} bonus`)
					if ($.int(mon.pc.bonusStr)) {
						$.PC.adjust('str', m * mon.pc.bonusStr, m * mon.pc.bonusStr, m * mon.pc.bonusStr)
						xvt.out(xvt.lred, ' strength', $.bracket(`+${m * mon.pc.bonusStr}`, false))
					}
					$.PC.adjust('str', m)
					if ($.int(mon.pc.bonusInt)) {
						$.PC.adjust('int', m * mon.pc.bonusInt, m * mon.pc.bonusInt, m * mon.pc.bonusInt)
						xvt.out(xvt.lmagenta, ' intellect', $.bracket(`+${m * mon.pc.bonusInt}`, false))
					}
					$.PC.adjust('int', m)
					if ($.int(mon.pc.bonusDex)) {
						$.PC.adjust('dex', m * mon.pc.bonusDex, m * mon.pc.bonusDex, m * mon.pc.bonusDex)
						xvt.out(xvt.lcyan, ' dexterity', $.bracket(`+${m * mon.pc.bonusDex}`, false))
					}
					$.PC.adjust('dex', m)
					if ($.int(mon.pc.bonusCha)) {
						$.PC.adjust('cha', m * mon.pc.bonusCha, m * mon.pc.bonusCha, m * mon.pc.bonusCha)
						xvt.out(xvt.lgreen, ' charisma', $.bracket(`+${m * mon.pc.bonusCha}`, false))
					}
					$.PC.adjust('cha', m)
					xvt.outln('\n'); xvt.waste(500)
					Battle.yourstats(); xvt.waste(500)
					xvt.outln(); xvt.waste(500)
					DL.moves >>= 1
				}
			}
			//	activate this monster's avenge?
			if (mon.user.xplevel == 0) {
				$.sound('oops')
				ROOM.monster[n].monster.effect = 'flip'
				monsters[mon.user.handle].pc = '*'	//	chaos
				$.activate(mon)
				for (let i = 0; i < $.dice(3); i++) {
					let avenger = <active>{ user:{id:''} }
					Object.assign(avenger.user, mon.user)
					avenger.user.pc = $.PC.random('monster')
					avenger.user.handle += xvt.attr(' ', xvt.uline, 'avenger', xvt.nouline)
					$.reroll(avenger.user, avenger.user.pc, $.int(avenger.user.level / 2))
					for (let magic in ROOM.monster[n].monster.spells)
						$.Magic.add(avenger.user.spells, ROOM.monster[n].monster.spells[magic])
					for (let poison in ROOM.monster[n].monster.poisons)
						$.Poison.add(avenger.user.poisons, ROOM.monster[n].monster.poisons[poison])
					avenger.user.steal = 2
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
		if ((!DL.map || DL.map == 'map') && $.dice((15 - $.online.cha / 10) / 2) == 1) {
			let m = <MAP>['','map','magic map'][($.dice(Z / 33 + 2) > 1 ? 1 : 2)]
			if (DL.map.length < m.length) {
				DL.map = m
				xvt.outln('\n', xvt.bright, xvt.yellow, 'You find a ', m, '!')
				pause = true
			}
		}
		//	> 3 monsters
		if (b4 < 0) {
			xvt.outln(xvt.lgreen, '+ bonus charisma')
			$.sound('effort', 20)
			$.PC.adjust('cha', $.dice(Math.abs(b4)), 1, 1)
			pause = true
		}
		//	the wounded warrior just surviving any mob size
		//	and without a magic map nor any visit to the cleric yet ...
		if ((b4 !== 0 && (!DL.map || DL.map !== 'map') && DL.cleric.sp == DL.cleric.user.sp) &&
			((b4 > 0 && b4 / $.player.hp < 0.67 && $.online.hp / $.player.hp < 0.067)
			|| ($.online.hp <= Z + deep + 1))) {
			xvt.outln(xvt.lred, '+ bonus strength')
			$.sound('bravery', 20)
			$.PC.adjust('str', deep + 2, deep + 1, 1)
			DL.map = `Marauder's map`
			xvt.outln(xvt.bright, xvt.yellow, 'and ', DL.map, '!')
			pause = true
		}
	}

	if (Battle.teleported) {
		$.PC.profile($.online, 'lightSpeedOut')
		Battle.teleported = false
		Y = $.dice(DL.rooms.length) - 1
		X = $.dice(DL.width) - 1
		menu()
		return
	}

	if (Battle.retreat) $.PC.profile($.online, 'heartBeat')

	let d = ['N','S','E','W']
	while (Battle.retreat && !$.reason) {
		$.music('pulse')
		xvt.waste(400)
		xvt.out(xvt.bright, xvt.red, 'You frantically look to escape . . . ')
		xvt.waste(400)

		let i = $.dice(d.length) - 1
		switch (d[i]) {
			case 'N':
				if (Y > 0 && DL.rooms[Y][X].type !== 'w-e')
					if (DL.rooms[Y - 1][X].type !== 'w-e') {
						Battle.retreat = false
						Y--
						looked = false
						$.animated('fadeOutUp')
						break
					}
				oof('north')
				break

			case 'S':
				if (Y < DL.rooms.length - 1 && DL.rooms[Y][X].type !== 'w-e')
					if (DL.rooms[Y + 1][X].type !== 'w-e') {
						Battle.retreat = false
						Y++
						looked = false
						$.animated('fadeOutDown')
						break
					}
				oof('south')
				break

			case 'E':
				if (X < DL.width - 1 && DL.rooms[Y][X].type !== 'n-s')
					if (DL.rooms[Y][X + 1].type !== 'n-s') {
						Battle.retreat = false
						X++
						looked = false
						$.animated('fadeOutRight')
						break
					}
				oof('east')
				break

			case 'W':
				if (X > 0 && DL.rooms[Y][X].type !== 'n-s')
					if (DL.rooms[Y][X - 1].type !== 'n-s') {
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

	menu()
}

function drawHero(peek = false) {
	xvt.out(xvt.reset)
	xvt.save()

	ROOM = DL.rooms[Y][X]
	if (!DL.map || peek) {
		if (Y > 0 && DL.rooms[Y][X].type !== 'w-e')
			if (DL.rooms[Y - 1][X].type !== 'w-e')
				drawRoom(Y - 1, X, false, peek)
		if (Y < DL.rooms.length - 1 && DL.rooms[Y][X].type !== 'w-e')
			if (DL.rooms[Y + 1][X].type !== 'w-e')
				drawRoom(Y + 1, X, false, peek)
		if (X < DL.width - 1 && DL.rooms[Y][X].type !== 'n-s')
			if (DL.rooms[Y][X + 1].type !== 'n-s')
				drawRoom(Y, X + 1, false, peek)
		if (X > 0 && DL.rooms[Y][X].type !== 'n-s')
			if (DL.rooms[Y][X - 1].type !== 'n-s')
				drawRoom(Y, X - 1, false, peek)
	}
	if (!DL.map) drawRoom(Y, X, false, peek)

	xvt.plot(Y * 2 + 2, X * 6 + 2)
	if ($.player.emulation === 'XT')
		xvt.out($.player.blessed ? xvt.Cyan : $.player.cursed ? xvt.lBlue : xvt.lBlack
			, ' '
			, ($.player.toWC + $.online.toWC) > 0 ? xvt.attr(xvt.bright, xvt.cyan)
				: ($.player.toWC + $.online.toWC) < 0 ? xvt.attr(xvt.bright, xvt.magenta)
				: xvt.cyan
			, $.online.weapon.wc ? '⚸' : ' '
			, $.player.blessed ? xvt.bright : xvt.normal
			, $.online.hp > $.player.hp * 2 / 3 ? xvt.white : $.online.hp > $.player.hp / 3 ? xvt.yellow : xvt.red
			, $.PC.card($.player.pc).unicode
			, ($.player.toAC + $.online.toAC) > 0 ? xvt.attr(xvt.normal, xvt.bright)
				: ($.player.toAC + $.online.toAC) < 0 ? xvt.attr(xvt.normal, xvt.faint)
				: xvt.normal, xvt.yellow
			, $.online.armor.ac ? '⛨' : ' '
			, ' ')
	else
		xvt.out(xvt.reverse, $.player.blessed ? xvt.bright : $.player.cursed ? xvt.faint : xvt.normal
			, '-YOU-')

	if (!$.online.hp) {
		xvt.plot(Y * 2 + 2, X * 6 + 4)
		xvt.waste(800)
		xvt.plot(Y * 2 + 2, X * 6 + 2)
		if ($.player.emulation === 'XT')
			xvt.out(xvt.lBlack, xvt.black, `  ${$.PC.card($.player.pc).unicode}  `)
		else
			xvt.out(xvt.faint, xvt.reverse, '  X  ')
		xvt.plot(Y * 2 + 2, X * 6 + 4)
		xvt.waste(800)
	}
	xvt.restore()
}

function eraseHero(peek = false) {
	xvt.out(xvt.reset)
	xvt.save()
	ROOM = DL.rooms[Y][X]
	if (!DL.map || peek) {
		if (Y > 0 && DL.rooms[Y][X].type !== 'w-e')
			if (DL.rooms[Y - 1][X].type !== 'w-e')
				drawRoom(Y - 1, X, false)
		if (Y < DL.rooms.length - 1 && DL.rooms[Y][X].type !== 'w-e')
			if (DL.rooms[Y + 1][X].type !== 'w-e')
				drawRoom(Y + 1, X, false)
		if (X < DL.width - 1 && DL.rooms[Y][X].type !== 'n-s')
			if (DL.rooms[Y][X + 1].type !== 'n-s')
				drawRoom(Y, X + 1, false)
		if (X > 0 && DL.rooms[Y][X].type !== 'n-s')
			if (DL.rooms[Y][X - 1].type !== 'n-s')
				drawRoom(Y, X - 1, false)
	}
	xvt.restore()

	drawRoom(Y, X)
}

function drawLevel() {
	let y:number, x:number, m:number

	xvt.out(xvt.reset)
	if ($.tty == 'web') {
		xvt.plot($.player.rows, 1)
		xvt.out('\n'.repeat($.player.rows))
	}
	xvt.out(xvt.clear)

	if (DL.map) {
		for (y = 0; y < paper.length; y++) {
			if (y % 2) {
				for (x = 0; x < DL.width; x++) {
					if ($.player.emulation === 'VT') xvt.out('\x1B(0', xvt.faint, paper[y].substr(6 * x, 1), '\x1B(B')
					else xvt.out(xvt.reset, xvt.bright, xvt.black, paper[y].substr(6 * x, 1))

					let r = $.int(y / 2)
					occupying(DL.rooms[r][x], xvt.attr(xvt.reset, xvt.faint)
						, (DL.map && DL.map !== 'map')
							|| (DL.rooms[r][x].map && Math.abs(Y - r) < Math.trunc($.online.int / 15) && Math.abs(X - x) < Math.trunc($.online.int / 15))
						, DL.map == `Marauder's map` || $.Ring.power($.player.rings, 'identify').power)
				}
				if ($.player.emulation === 'VT') xvt.out('\x1B(0', xvt.faint, paper[y].substr(-1), '\x1B(B')
				else xvt.out(xvt.reset, xvt.bright, xvt.black, paper[y].substr(-1))
			}
			else {
				if ($.player.emulation === 'VT') xvt.out('\x1B(0', xvt.faint, paper[y], '\x1B(B')
				else xvt.out(xvt.reset, xvt.bright, xvt.black, paper[y])
			}
			xvt.outln()
		}
	}
	else {
		for (y = 0; y < DL.rooms.length; y++)
			for (x = 0; x < DL.width; x++)
				if (DL.rooms[y][x].map)
					drawRoom(y, x, false)
	}

	xvt.plot(paper.length + 1, 1)
	scroll(paper.length + 1, false)
	refresh = false
}

function drawRoom(r:number, c:number, keep = true, peek = false) {
	if (keep) xvt.save()
	ROOM = DL.rooms[r][c]
	if (peek && !ROOM.map)
		if ($.online.int > 49)
			ROOM.map = true

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

	occupying(ROOM, peek ? xvt.attr(xvt.reset) : xvt.attr(xvt.reset, xvt.faint), (DL.map && DL.map !== 'map')
		|| (ROOM.map && Math.abs(Y - r) < Math.trunc($.online.int / 15) && Math.abs(X - c) < Math.trunc($.online.int / 15)),
		DL.map == `Marauder's map` || $.Ring.power($.player.rings, 'identify').power || peek)

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
		} while (ROOM.type == 'cavern')	//	cannot teleport into a cavern
		DL.moves >>= 1
		return
	}

	$.wall(`is entering dungeon level ${iii[deep]}.${Z + 1}`)
	$.title(`Dungeon ${iii[deep]}.${Z + 1}`)

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
			cleric:	{ user:{ id:'_Clr', handle:'old cleric', pc:'Cleric', level:$.int(65 + Z / 4 + deep)
			 		, sex:'I', weapon:0, armor:1, magic:3, spells:[7, 8, 13] } },
 			rooms:	new Array(maxRow),
			map:	'',
			moves:	0,
			spawn:	Math.trunc(deep / 3 + Z / 9 + maxRow / 3)
					+ $.dice(Math.round($.online.cha / 20) + 1) + 3,
			width:	maxCol
		}

		DL = dd[deep][Z]
		for (y = 0; y < DL.rooms.length; y++) {
			DL.rooms[y] = new Array(DL.width)
			for (x = 0; x < DL.width; x++)
				DL.rooms[y][x] = <room>{ map:true, monster:[], occupant:'', type:'' }
		}

		for (y = 0; y < DL.rooms.length; y++) {
			for (x = 0; x < DL.width; x++) {
				let n:number
				while ((n = $.int(($.dice(4) + $.dice(4)) / 2) - 1) == 3);
				DL.rooms[y][x].type = (n == 0) ? 'cavern' : (n == 1) ? '' : $.dice(2) == 1 ? 'n-s' : 'w-e'
			}
		}

		result = false
		spider(0, 0)
		for (y = 0; y < DL.rooms.length; y++)
			for (x = 0; x < DL.width; x++)
				if (DL.rooms[y][x].map)
					result = true
	} while (result)

	$.reroll(DL.cleric.user, DL.cleric.user.pc, DL.cleric.user.level)
	$.activate(DL.cleric)

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

	let wow = 1
	let dank = deep + 1, level = Z + 1
	//	potential bonus(es) for the more experienced adventurer
	if (!$.player.novice) {
		//	dwarven merchant
		if ($.dice($.online.str - dank) <= dank || true) {
			y = $.dice(DL.rooms.length) - 1
			x = $.dice(DL.width) - 1
			DL.rooms[y][x].occupant = 'dwarf'
		}
		//	wheel of life
		if ($.dice(100 - level + dank) <= dank) {
			y = $.dice(DL.rooms.length) - 1
			x = $.dice(DL.width) - 1
			DL.rooms[y][x].occupant = 'wheel'
		}
		//	wishing well
		if ($.dice((130 - level) / 3 - dank) == 1) {
			y = $.dice(DL.rooms.length) - 1
			x = $.dice(DL.width) - 1
			DL.rooms[y][x].occupant = 'well'
		}
		//	deep dank dungeon portal
		if (deep < 9 && deep < $.player.immortal && Z / 9 < $.player.immortal) {
			y = $.dice(DL.rooms.length) - 1
			x = $.dice(DL.width) - 1
			DL.rooms[y][x].occupant = 'portal'
		}
	}
	//	thief(s) in other spaces
	if (!$.player.novice && $.dice(10000 / dank * level) <= dank)
		wow = $.int($.dice(DL.rooms.length) * $.dice(DL.width) / 2)
	if (!$.player.coward) wow--
	n = $.dice(deep / 4) + wow
	for (let i = 0; i < n; i++) {
		do {
			y = $.dice(DL.rooms.length) - 1
			x = $.dice(DL.width) - 1
		} while (DL.rooms[y][x].type == 'cavern')
		DL.rooms[y][x].occupant = 'thief'
	}

	//	a cleric in another space
	do {
		y = $.dice(DL.rooms.length) - 1
		x = $.dice(DL.width) - 1
	} while (DL.rooms[y][x].type == 'cavern' || DL.rooms[y][x].monster.length || DL.rooms[y][x].occupant)
	DL.rooms[y][x].occupant = 'cleric'

	//	a wizard in another space
	do {
		y = $.dice(DL.rooms.length) - 1
		x = $.dice(DL.width) - 1
	} while (DL.rooms[y][x].type == 'cavern' || DL.rooms[y][x].monster.length || DL.rooms[y][x].occupant)
	DL.rooms[y][x].occupant = 'wizard'

	//	set some trapdoors
	n = $.int(DL.rooms.length * DL.width / 10)
	if ($.dice(100 - Z) > (deep + 1))
		n += $.dice(Z / 16 + 2)
	while (n--) {
		y = $.dice(DL.rooms.length) - 1
		x = $.dice(DL.width) - 1
		if (!DL.rooms[y][x].occupant)
			DL.rooms[y][x].occupant = 'trapdoor'
	}

	//	help will always be given at Hogwarts to those who deserve it
	if (!$.player.coward)
		if ($.player.novice || $.dice($.player.wins * dank + $.player.immortal + 1) >= (dank + level)) {
			y = $.dice(DL.rooms.length) - 1
			x = $.dice(DL.width) - 1
			DL.rooms[y][x].giftItem = 'map'
			DL.rooms[y][x].giftIcon = $.player.emulation === 'XT' ? '⎅' : dot
		}

	//	generate treasure(s)
	wow = 1
	if (!$.player.novice && !$.player.coward)
		if ($.dice(100 / dank * level) <= dank)
			wow = $.int($.dice(DL.rooms.length) * $.dice(DL.width) / 2)
	wow += $.dice(level / 33) + $.dice(dank / 3) - 2
	if ($.dice($.player.wins) > dank) wow++

	let gift: GIFT[] = [ 'ring', 'map' ]
	for (let j = 5; j > 0; j--) {
		if (j > $.player.magic) gift.push('armor')
		if (j > $.player.steal) gift.push('chest')
		if ($.player.magic == 1 || $.player.magic == 2)
			gift.push($.dice(10 + dank - 2 * $.player.magic) > dank ? 'magic' : 'xmagic')
		if ($.player.poison && j > $.player.poison) gift.push('poison')
		if (j > $.player.melee) gift.push('weapon')
	}
	gift.push('map', 'ring')

	for (let i = 0; i < wow; i++) {
		do {
			y = $.dice(DL.rooms.length) - 1
			x = $.dice(DL.width) - 1
		} while (DL.rooms[y][x].giftItem || DL.rooms[y][x].occupant == 'wizard')
		if ($.Ring.power($.player.rings, 'identify').power) DL.rooms[y][x].map = true

		//	potion
		if ($.dice(110 - $.online.cha + dank + +$.player.coward) > dank) {
			DL.rooms[y][x].giftItem = 'potion'
			DL.rooms[y][x].giftIcon = $.player.emulation === 'XT' ? '⚱' : dot
			n = $.dice(130 - deep)
			for (let j = 0; j < 16 && n > 0; j++) {
				let v = 15 - j
				DL.rooms[y][x].giftValue = v
				if ($.player.magic < 2 && (v == 10 || v == 11))
					DL.rooms[y][x].giftValue = (v == 11) ? 9 : 0
				n -= j + 1
			}
			continue
		}

		//	what else ya got?
		if (gift.length) {
			v = $.dice(gift.length) - 1
			DL.rooms[y][x].giftItem = gift.splice(v, 1)[0]
		}
		DL.rooms[y][x].giftValue = 0
		v = 0

		switch (DL.rooms[y][x].giftItem) {
			case 'armor':
				DL.rooms[y][x].giftIcon = $.player.emulation === 'XT' ? '⛨' : dot
				n = $.Armor.special.length - 1
				for (v = 0; v < n && $.online.armor.ac >= $.Armor.name[$.Armor.special[v]].ac; v++);
				break

			case 'chest':
				DL.rooms[y][x].giftIcon = $.player.emulation === 'XT' ? '⌂' : dot
				v = $.dice(8 + 2 * (deep + $.player.steal)) - 1
				break

			case 'magic':
				DL.rooms[y][x].giftIcon = $.player.emulation === 'XT' ? '⚹' : dot
				n = $.dice($.Magic.merchant.length * 16)
				for (let j = 0; j < $.Magic.merchant.length && n > 0; j++) {
					v = $.Magic.merchant.length - j
					n -= j + 1
				}
				break

			case 'map':
				DL.rooms[y][x].giftIcon = $.player.emulation === 'XT' ? '⎅' : dot
				v = 1
				break

			case 'poison':
				DL.rooms[y][x].giftIcon = $.player.emulation === 'XT' ? '⚱' : dot
				n = $.dice($.Poison.merchant.length * 16)
				for (let j = 0; j < $.Poison.merchant.length && n > 0; j++) {
					v = $.Poison.merchant.length - j
					n -= j + 1
				}
				break

			case 'ring':
				if ($.Ring.power($.player.rings, 'ring').power) DL.rooms[y][x].map = true
				DL.rooms[y][x].giftIcon = $.player.emulation === 'XT' ? '⍥' : dot
				if ($.dice(6 - $.int(dank / 2)) > 1) {
					let ring = $.Ring.common[$.dice($.Ring.common.length) - 1]
					DL.rooms[y][x].giftValue = ring
				}
				else {
					let ring = $.Ring.unique[$.dice($.Ring.unique.length) - 1]
					DL.rooms[y][x].giftValue = ring
				}
				break

			case 'weapon':
				DL.rooms[y][x].giftIcon = $.player.emulation === 'XT' ? '⚸' : dot
				n = $.Weapon.special.length - 1
				for (v = 0; v < n && $.online.weapon.wc >= $.Weapon.name[$.Weapon.special[v]].wc; v++);
				break

			case 'xmagic':
				DL.rooms[y][x].giftIcon = $.player.emulation === 'XT' ? '☀' : dot
				v = $.Magic.merchant.length + $.dice($.Magic.special.length)
				break

		}
		if (v) DL.rooms[y][x].giftValue = v
	}

	function spider(r:number, c:number) {
		DL.rooms[r][c].map = false
		if (c + 1 < DL.width)
			if (DL.rooms[r][c + 1].map && DL.rooms[r][c].type !== 'n-s' && DL.rooms[r][c + 1].type !== 'n-s')
				spider(r, c + 1)
		if (r + 1 < DL.rooms.length)
			if (DL.rooms[r + 1][c].map && DL.rooms[r][c].type !== 'w-e' && DL.rooms[r + 1][c].type !== 'w-e')
				spider(r + 1, c)
		if (c > 0)
			if (DL.rooms[r][c - 1].map && DL.rooms[r][c].type !== 'n-s' && DL.rooms[r][c - 1].type !== 'n-s')
				spider(r, c - 1)
		if (r > 0)
			if (DL.rooms[r - 1][c].map && DL.rooms[r][c].type !== 'w-e' && DL.rooms[r - 1][c].type !== 'w-e')
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
				if (ROOM.type == 'n-s') {
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

				//	west-east corridor
				if (ROOM.type == 'w-e') {
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
		} while (DL.rooms[r][c].type && DL.rooms[r][c].type !== 'cavern')
	}

	//	check for overcrowding
	if (DL.rooms[r][c].monster.length >= (!DL.rooms[r][c].type ? 2 : DL.rooms[r][c].type == 'cavern' ? 3 : 1))
		return false

	let i:number = DL.rooms[r][c].monster.length
	let j:number = 0
	let dm:monster = { name:'', pc:'' }
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

		m.user.handle = Object.keys(monsters)[j]
		Object.assign(dm, monsters[m.user.handle])
		if (dm.pc == '*') {		//	chaos
			dm.pc = $.PC.random('monster')
			m.user.handle += xvt.attr(' ', xvt.uline, 'avenger', xvt.nouline)
			m.user.steal = 2
		}
		m.monster = dm
		m.effect = dm.effect || 'pulse'

		$.reroll(m.user, dm.pc ? dm.pc : $.player.pc, j)
		if (m.user.xplevel) m.user.xplevel = level
		if (!dm.pc) m.user.steal = $.player.steal + 1

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

		m.user.rings = dm.rings || []

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
		$.PC.adjust('str', deep - 2, 0, deep >>2, m)
		$.PC.adjust('int', deep - 2, 0, deep >>2, m)
		$.PC.adjust('dex', deep - 2, 0, deep >>2, m)
		$.PC.adjust('cha', deep - 2, 0, deep >>2, m)

		let gold = new $.coins($.int($.money(level) / (11 - deep)))
		gold.value += $.worth(new $.coins(m.weapon.value).value, $.dice($.online.cha / 5) + $.dice(deep) - +$.player.coward)
		gold.value += $.worth(new $.coins(m.armor.value).value, $.dice($.online.cha / 5) + $.dice(deep) - +$.player.coward)
		gold.value *= $.dice(deep * 2 / 3)
		gold.value++
		m.user.coin = new $.coins(gold.carry(1, true))

		if (+m.user.weapon) {
			if (dm.hit) m.weapon.hit = dm.hit
			if (dm.smash) m.weapon.smash = dm.smash
		}
	} while (DL.rooms[r][c].monster.length < 10 && DL.rooms[r][c].monster.length * m.user.level < Z + deep - 12)

	return true
}

function merchant() {
	$.sound('ddd')
	let dwarf = <active>{ user:{id:''} }
	Object.assign(dwarf.user, $.dwarf.user)
	$.activate(dwarf)
	xvt.outln(xvt.yellow, $.who(dwarf, 'He'), 'scowls in disgust,')
	xvt.outln(xvt.bright, xvt.yellow, `  "Never trust a ${$.player.pc}!"`)
	xvt.waste(300)
	if (isNaN(+dwarf.user.weapon)) xvt.outln('\n', $.who(dwarf, 'He'), $.Weapon.wearing(dwarf), '.')
	if (isNaN(+dwarf.user.armor)) xvt.outln('\n', $.who(dwarf, 'He'), $.Armor.wearing(dwarf), '.')
	xvt.waste(300)
	Battle.engage('Merchant', party, dwarf, doSpoils)
}

function teleport() {
	let min =  Math.round((xvt.sessionAllowed - ((new Date().getTime() - xvt.sessionStart.getTime()) / 1000)) / 60)
	$.action('teleport')

	xvt.outln(xvt.bright, xvt.yellow, 'What do you wish to do?')
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
				xvt.outln(' ... "', xvt.bright, xvt.cyan, 'Huh?', xvt.reset, '"')
				$.sound('miss', 6)
				$.animated('wobble')
				$.sound('lose', 12)
				$.animated('rubberBand')
				$.music('crack')
				xvt.waste(1200)
				$.animated('bounceOutUp')
				xvt.waste(1200)
				let pops = 'UDOR'[$.dice(4) - 1]
				if (xvt.entry.toUpperCase() == pops) {
					$.sound('oops', 6)
					deep = $.dice(10) - 1
					Z += $.dice(20) - 10
					Z = Z < 0 ? 0 : Z > 99 ? 99 : Z
					$.sound('portal', 12)
				}
				else {
					xvt.entry = pops
					$.sound('teleport')
				}
			}
			else {
				xvt.outln()
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
						scroll(1, false, true)
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
		}, cancel:'O', enter:'R', eol:false, match:/U|D|O|R/i, timeout:20 }
	}
	xvt.app.form['wizard'].prompt = `Teleport #${iii[deep]}.${Z + 1}: `
	xvt.app.focus = 'wizard'
}

function quaff(v: number, it = true) {
	if (!(v % 2) && !potions[v].identified) $.news(`\t${it ? 'quaffed' : 'tossed'}${$.an(potion[v])}`)
	if (it) {
		if (!potions[v].identified)	{
			potions[v].identified = $.online.int > (85 - 4 * $.player.poison)
			xvt.outln(v % 2 ? xvt.red : xvt.green, 'It was', xvt.bright, $.an(potion[v]), xvt.normal, '.')
		}
		$.sound('quaff', 6)
		switch (v) {
	//	Potion of Cure Light Wounds
		case 0:
			$.sound('yum')
			$.online.hp += $.PC.hp() + $.dice($.player.hp - $.online.hp)
			break

	//	Vial of Weakness
		case 1:
			$.PC.adjust('str', -$.dice(10), -1)
			break

	//	Potion of Charm
		case 2:
			$.PC.adjust('cha', 100 + $.dice(10), 1, +($.player.cha == $.player.maxcha))
			break

	//	Vial of Stupidity
		case 3:
			$.PC.adjust('int', -$.dice(10), -1)
			break

	//	Potion of Agility
		case 4:
			$.PC.adjust('dex', 100 + $.dice(10), 1, +($.player.dex == $.player.maxdex))
			break

	//	Vial of Clumsiness
		case 5:
			$.PC.adjust('dex', -$.dice(10), -1)
			break

	//	Potion of Wisdom
		case 6:
			$.PC.adjust('int', 100 + $.dice(10), 1, +($.player.int == $.player.maxint))
			break

	//	Vile Vial
		case 7:
			$.PC.adjust('cha', -$.dice(10), -1)
			break

	//	Potion of Stamina
		case 8:
			$.PC.adjust('str', 100 + $.dice(10), 1, +($.player.str == $.player.maxstr))
			break

	//	Vial of Slaad Secretions
		case 9:
			$.sound('hurt')
			if (($.online.hp -= $.dice($.player.hp / 2)) < 1) {
				$.online.hp = 0
				$.online.sp = 0
				$.death(`quaffed${$.an(potion[v])}`)
			}
			break

	//	Potion of Mana
		case 10:
			$.sound('shimmer')
			$.online.sp += $.PC.sp() + $.dice($.player.sp - $.online.sp)
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
			$.activate($.online, false, true)
			break

	//	Vial of Crack
		case 13:
			$.music('crack')
			$.PC.adjust('str'
				, $.online.str > 40 ? -$.dice(6) - 4 : -3
				, $.player.str > 60 ? -$.dice(3) - 2 : -2
				, $.player.maxstr > 80 ? -2 : -1)
			$.PC.adjust('int'
				, $.online.int > 40 ? -$.dice(6) - 4 : -3
				, $.player.int > 60 ? -$.dice(3) - 2 : -2
				, $.player.maxint > 80 ? -2 : -1)
			$.PC.adjust('dex'
				, $.online.dex > 40 ? -$.dice(6) - 4 : -3
				, $.player.dex > 60 ? -$.dice(3) - 2 : -2
				, $.player.maxdex > 80 ? -2 : -1)
			$.PC.adjust('cha'
				, $.online.cha > 40 ? -$.dice(6) - 4 : -3
				, $.player.cha > 60 ? -$.dice(3) - 2 : -2
				, $.player.maxcha > 80 ? -2 : -1)
			break

	//	Potion of Augment
		case 14:
			$.sound('hone', 12)
			$.PC.adjust('str'
				, 100 + $.dice(100 - $.online.str)
				, $.dice(3) + 2
				, $.player.maxstr < 95 ? 2 : 1)
			$.PC.adjust('int'
				, 100 + $.dice(100 - $.online.int)
				, $.dice(3) + 2
				, $.player.maxint < 95 ? 2 : 1)
			$.PC.adjust('dex'
				, 100 + $.dice(100 - $.online.dex)
				, $.dice(3) + 2
				, $.player.maxdex < 95 ? 2 : 1)
			$.PC.adjust('cha'
				, 100 + $.dice(100 - $.online.cha)
				, $.dice(3) + 2
				, $.player.maxcha < 95 ? 2 : 1)
			$.sound('heal')
			$.online.hp += $.PC.hp()
			$.online.sp += $.PC.sp()
			break

	//	Beaker of Death
		case 15:
			$.profile({ png:'potion/beaker', handle: `💀 ${potion[v]} 💀`, effect:'fadeInDown' })
			$.sound('killed', 12)
			$.online.hp = 0
			$.online.sp = 0
			$.reason = `quaffed${$.an(potion[v])}`
			break
		}
	}
	if (!$.reason) pause = true
}

function occupying(room: room, o = '', reveal = false, identify = false) {
	let icon = ''
	if (reveal) {
		let m = room.monster.length > 4 ? 4 : room.monster.length
		if (m) {
			if (Monster[$.tty])
				icon += Monster[$.tty][m]
			else {
				if (identify) {
					icon += Mask[m]
					for (let i = 0; i < m; i++) {
						let dm = $.PC.card(room.monster[i].user.pc)
						icon = icon.replace('♗', xvt.attr(dm.color || xvt.white, dm.unicode))
					}
				}
				else
					icon += Mask[m]
			}
			o += ` ${icon} `
		}
		else if (room.map) {
			if (!room.type || room.type == 'cavern')
				o += xvt.attr(!room.type ? xvt.yellow : xvt.red)
			o += `  ${dot}  `
		}
		else
			o = '     '

		switch (room.occupant) {
			case 'trapdoor':
				if (identify && !icon) o = xvt.attr(xvt.reset, `  ${$.tty == 'web' ? xvt.attr(xvt.lcyan, '☒') : xvt.attr(xvt.bright, xvt.blink, xvt.cyan, '?')}  `)
				break

			case 'portal':
				if (!icon) icon = xvt.attr('v', xvt.bright, xvt.blink, 'V', xvt.noblink, xvt.normal, 'v')
				o = xvt.attr(xvt.reset, xvt.faint, xvt.blue, 'v', xvt.normal, icon, xvt.reset, xvt.faint, xvt.blue, 'v')
				break

			case 'well':
				if (identify && !icon) o = xvt.attr(xvt.reset, `  ${$.tty == 'web' ? xvt.attr(xvt.lblue, '⛃') : xvt.attr(xvt.bright, xvt.blink, xvt.blue, '*')}  `)
				break

			case 'wheel':
				if (identify && !icon) o = xvt.attr(xvt.reset, `  ${$.tty == 'web' ? xvt.attr(xvt.lmagenta, '☸') : xvt.attr(xvt.bright, xvt.blink, xvt.magenta, '@')}  `)
				break

			case 'thief':
				if ((identify || $.player.steal == 4) && !icon)
					o = xvt.attr(xvt.reset, xvt.faint, `  ${$.tty == 'web' ? $.PC.card('Thief').unicode : '&'}  `)
				break

			case 'cleric':
				if (DL.cleric.sp) {
					if (!icon) icon = xvt.attr(xvt.normal, xvt.uline, '_', xvt.bright, Cleric[$.player.emulation], xvt.normal, '_')
					o = xvt.attr(xvt.reset, xvt.faint, xvt.yellow, ':', xvt.normal, icon, xvt.reset, xvt.faint, xvt.yellow, ':')
				}
				else {
					if (!icon) icon = `_${$.tty == 'web' ? '⚰' : Cleric[$.player.emulation]}_`
					o = xvt.attr(xvt.reset, xvt.faint, ':', icon, xvt.reset, xvt.faint, ':')
				}
				break

			case 'wizard':
				if (!icon) icon = xvt.attr(xvt.normal, xvt.uline, '_', xvt.bright, Teleport[$.player.emulation], xvt.normal, '_')
				o = xvt.attr(xvt.reset, xvt.faint, xvt.magenta, '<', xvt.normal, icon, xvt.reset, xvt.faint, xvt.magenta, '>')
				break

			case 'dwarf':
				if (identify && !icon) o = xvt.attr(xvt.reset, xvt.faint, xvt.blink, xvt.yellow, `  ${$.tty == 'web' ? '⚘' : '$'}  `)
				break
		}
	}
	else
		o = '     '

	xvt.out(o, xvt.reset)

	if (room.giftItem && (DL.map == `Marauder's map` || $.Ring.power($.player.rings, 'identify').power))
		xvt.out('\x08', xvt.faint, room.giftIcon, xvt.reset)
}

function scroll(top = 1, redraw = true, escape = false) {
	if (escape) {
		$.music('thief2')
		xvt.outln(xvt.lblue, `\n"Next time you won't escape so easily... moo-hahahahaha!!"`)
	}
	else if (redraw) {
		drawLevel()
		drawHero()
	}
	xvt.save()
	xvt.out(`\x1B[${top};${$.player.rows}r`)
	xvt.restore()
	refresh = (top == 1)
}

}

export = Dungeon
