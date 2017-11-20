/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  DUNGEON authored by: Robert Hurst <theflyingape@gmail.com>               *
\*****************************************************************************/

import fs = require('fs')

import $ = require('../common')
import Battle = require('../battle')
import xvt = require('xvt')
import { resend } from '../email';

module Dungeon
{
	let monsters: monster = require('../etc/dungeon.json')
	
	interface dungeon {
		rooms: [ room[] ]	//	7-10
		map: number			//	0=none, 1=map, 2=marauder
		moves: number
		width: number		//	7-13
	}
	interface room {
		map: boolean		//	explored?
		occupant: number	//	0=none, 1=trap door, 2=deeper dungeon, 3=well, 4=wheel, 5=thief, 6=cleric, 7=wizard
		type: number		//	0=Emp, 1=N-S, 2=W-E, 3=Cav
		giftItem?: string	//	potion, poison, magic, xmagic, chest, map, armor, weapon, marauder
		giftValue?: number
		giftID?: boolean	//	undefined, or identified?
		monster?: active[]
	}

	let fini: Function
	let paper: string[]
	let dot = xvt.Empty[$.player.emulation]
	let dd = new Array(10)
	let deep: number
	let DL: dungeon
	let ROOM: room
	let Z: number
	let Y: number
	let X: number
	let fromX: number
	let fromY: number

    //  £
    export const Cleric = {
        VT: '\x1B(0\x7D\x1B(B',
        PC: '\xB8',
        XT: '\u00A9',
        dumb: '$'
    }

    //  ±
    export const Teleport = {
        VT: '\x1B(0\x67\x1B(B',
        PC: '\xF1',
        XT: '\u00B1',
        dumb: '%'
    }

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

export function DeepDank(start: number, cb: Function) {
	deep = 0
	Z = start > 99 ? 99 : start
	fini = cb
	dd[deep] = new Array(100)
	generateLevel()
	menu()
}

export function menu(suppress = false) {
	if ($.player.level + 1 < $.sysop.level) $.checkXP($.online, menu)
	if ($.online.altered) $.saveUser($.player)
	if ($.reason) xvt.hangup()

	drawHero()

	$.action('dungeon')
	xvt.app.form = {
        'command': { cb:command, enter:'?', eol:false }
    }
	if (suppress)
		xvt.app.form['command'].prompt = ':'
	else {
		xvt.app.form['command'].prompt = ''
		if ($.player.spells.length && $.online.sp)
			xvt.app.form['command'].prompt += xvt.attr(
				$.bracket('C', false), xvt.cyan, 'ast, '
			)
		if ($.player.poisons.length && $.online.weapon.wc)
			xvt.app.form['command'].prompt += xvt.attr(
				$.bracket('P', false), xvt.cyan, 'oison, '
			)
		if (Y > 0 && DL.rooms[Y][X].type !== 2 && DL.rooms[Y - 1][X].type !== 2)
			xvt.app.form['command'].prompt += xvt.attr(
				$.bracket('N', false), xvt.cyan, 'orth, '
			)
		if (Y < DL.rooms.length - 1 && DL.rooms[Y][X].type !== 2 && DL.rooms[Y - 1][X].type !== 2)
			xvt.app.form['command'].prompt += xvt.attr(
				$.bracket('S', false), xvt.cyan, 'outh, ',
			)
		if (X < DL.width - 1 && DL.rooms[Y][X].type !== 1 && DL.rooms[Y][X + 1].type !== 1)
			xvt.app.form['command'].prompt += xvt.attr(
				$.bracket('E', false), xvt.cyan, 'ast, ',
			)
		if (X > 0 && DL.rooms[Y][X].type !== 1 && DL.rooms[Y][X - 1].type !== 1)
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
    if (xvt.validator.isNotEmpty(dungeon[choice]))
        xvt.out(dungeon[choice].description, '\n')
    else {
        xvt.beep()
        suppress = false
    }

    switch (choice) {
	case 'M':	//	#tbt
		if ($.access.sysop) DL.map = 2
		drawLevel()
		break

	case 'C':
		Battle.cast($.online, menu)
		return

	case 'P':
		Battle.poison($.online, menu)
		return

	case 'Y':
		Battle.yourstats()
		break

	case 'N':
		if (Y > 0 && DL.rooms[Y][X].type !== 2 && DL.rooms[Y - 1][X].type !== 2) {
			fromY = Y--; fromX = X; drawRoom(fromY, fromX)
			return
		}
		oof('north')
		break

	case 'S':
		if (Y < DL.rooms.length - 1 && DL.rooms[Y][X].type !== 2 && DL.rooms[Y - 1][X].type !== 2) {
			fromY = Y++; fromX = X; drawRoom(fromY, fromX)
			return
		}
		oof('south')
		break

	case 'E':
		if (X < DL.width - 1 && DL.rooms[Y][X].type !== 1 && DL.rooms[Y][X + 1].type !== 1) {
			fromY = Y; fromX = X++; drawRoom(fromY, fromX)
			return
		}
		oof('east')
		break

	case 'W':
		if (X > 0 && DL.rooms[Y][X].type !== 1 && DL.rooms[Y][X - 1].type !== 1) {
			fromY = Y; fromX = X--; drawRoom(fromY, fromX)
			return
		}
		oof('west')
		break
	}

	menu(suppress)

	function oof(wall:string) {
		$.sound('wall')
		xvt.out(xvt.bright, xvt.yellow, 'Oof!  There is a wall to the ', wall, '.\n\n', xvt.reset)
		if (($.online.hp -= $.dice(deep + Z + 1)) < 1) {
			xvt.out('You take too many hits and die!\n\n')
			xvt.waste(500)
			$.reason = 'banged head against a wall'
			xvt.hangup()
		}
	}
}

function drawLevel() {
	let y:number, x:number
	xvt.out(xvt.reset, xvt.clear)

	if (DL.map) {
		for (y = 0; y < paper.length; y++) {
			if (y % 2) {
				for (x = 0; x < DL.width; x++) {
					xvt.out(xvt.reset, xvt.bright, xvt.black, paper[y].substr(6 * x, 1))

					let r = y >>1
					let o = '     '
					if (DL.rooms[r][x].map)
						o = xvt.attr(xvt.reset, DL.rooms[r][x].type == 0 ? xvt.bright
							: DL.rooms[r][x].type == 3 ? xvt.faint
							: xvt.normal, `  ${dot}  `)

					if (DL.rooms[r][x].map || DL.map) {
						let icon = DL.rooms[r][x].monster ? xvt.attr(xvt.reset, DL.rooms[r][x].occupant ? xvt.green : xvt.red
								, DL.rooms[r][x].monster.length == 1 ? 'Mon' : 'Mob') : ''

						//	0=none, 1=trap door, 2=deeper dungeon, 3=well, 4=wheel, 5=thief, 6=cleric, 7=wizard
						switch (DL.rooms[r][x].occupant) {
							case 0:
								break

							case 1:
								if (DL.map)
									o = xvt.attr(xvt.reset, xvt.bright, xvt.blink, xvt.cyan, '  ?  ', xvt.reset)
								break

							case 2:
								if (!icon) icon = xvt.attr('v', xvt.bright, xvt.blink, 'V', xvt.noblink, xvt.normal, 'v')
								o = xvt.attr(xvt.faint, xvt.blue, 'v', xvt.normal, icon, xvt.normal, xvt.faint, 'v')
								break

							case 3:
								break

							case 4:
								break

							case 5:
								if ($.player.steal == 4 || DL.map == 2)
									o = xvt.attr(xvt.reset, xvt.faint, '  &  ', xvt.normal)
								break

							case 6:
								if (!icon) icon = xvt.attr(xvt.uline, '_', xvt.bright, Cleric[$.player.emulation], xvt.normal, '_', xvt.nouline)
								o = xvt.attr(xvt.normal, xvt.yellow, '.', icon, xvt.yellow, '.')
								break

							case 7:
								if (!icon) icon = xvt.attr('v', xvt.bright, xvt.blink, Teleport[$.player.emulation], xvt.noblink, xvt.normal, 'v')
								o = xvt.attr(xvt.faint, xvt.magenta, '^', xvt.normal, icon, xvt.normal, xvt.faint, '^')
								break
						}
					}
					xvt.out(o)
				}
				xvt.out(xvt.reset, xvt.bright, xvt.black, paper[y].substr(-1))
			}
			else {
				xvt.out(xvt.reset, xvt.bright, xvt.black, paper[y])
			}
			xvt.out(xvt.cll, '\n')
		}
	}
	else {
		for (y = 0; y < DL.rooms.length; y++)
			for (x = 0; x < DL.width; x++)
				drawRoom(y, x)
	}

	xvt.out(`\x1B[${paper.length + 1};${$.player.rows}r`)
}

function drawHero() {
	xvt.plot(Y * 2 + 2, X * 6 + 2)
	xvt.out(xvt.white, xvt.reverse, '-YOU-', xvt.reset)
	xvt.plot($.player.rows, 1)
}

function drawRoom(r:number, c:number) {
	let row = r * 2 + 1, col = c * 6 + 1

	if (!DL.map) {
		xvt.plot(row, col)
		xvt.out(xvt.Black, '       ')
	}

	xvt.plot(row, col)

}

function generateLevel() {
	if (dd[deep][Z]) {
		DL = dd[deep][Z]
		Y = $.dice(DL.rooms.length) - 1
		X = $.dice(DL.width) - 1
		renderMap()
		return
	}

	let y:number, x:number
	let result: boolean
	do {
		let maxRow = 6 + $.dice(Z / 32 + 1)
		while (maxRow < 10 && $.dice($.online.cha / (4 * ($.player.backstab + 1))) == 1)
			maxRow++
		let maxCol = 6 + $.dice(Z / 16 + 1)
		while (maxCol < 13 && $.dice($.online.cha / (4 * ($.player.backstab + 1))) == 1)
			maxCol++

		dd[deep][Z] = <dungeon>{
			rooms: new Array(maxRow),
			map: 0,
			moves: -1,
			width: maxCol
		}

		DL = dd[deep][Z]
		for (y = 0; y < DL.rooms.length; y++) {
			DL.rooms[y] = new Array(DL.width)
				for (x = 0; x < DL.width; x++)
					DL.rooms[y][x] = <room>{ map:true, monster:[], occupant:0, type:0 }
		}

		for (y = 0; y < DL.rooms.length; y++) {
			for (x = 0; x < DL.width; x++) {
				let n:number
				while ((n = (($.dice(4) + $.dice(4)) >>1) - 1) == 3);
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

	Y = $.dice(DL.rooms.length) - 1
	X = $.dice(DL.width) - 1
	renderMap()

	//	populate this floor
	let n = Math.trunc(DL.rooms.length * DL.width / 6 + $.dice(Z / 11) + (deep >>1) + $.dice(deep >>1))
	for (let i = 0; i < n; i++)
		putMonster()


	/*
	m = LEVEL(dl)->MaxRow * LEVEL(dl)->MaxCol / 6 + dice(dl / 11) + nest / 2 + dice(nest / 2);
	for(n = 0; n < m; n++) {
			x = dice(LEVEL(dl)->MaxCol) - 1; y = dice(LEVEL(dl)->MaxRow) - 1;
			putmonster(x, y);
	}

	//      bonus for the more experienced player
	if(dice(PLAYER.Immortal) > dl && dice(PLAYER.Wins) > nest && PLAYER.Novice != 'Y') {
			x = dice(LEVEL(dl)->MaxCol) - 1; y = dice(LEVEL(dl)->MaxRow) - 1;
			ROOM(dl, x, y)->gift_type = GIFT_DETECT;
			if((dice(100 * dl + 1) / nest) == 1)
					wow = LEVEL(dl)->MaxRow * LEVEL(dl)->MaxCol;
	}

	m = LEVEL(dl)->MaxRow * LEVEL(dl)->MaxCol / 10;
	if(dice(100 - dl) > nest)
			m += dice(dl / 16 + 2);
	for(n = 0; n < m; n++) {
			x = dice(LEVEL(dl)->MaxCol) - 1; y = dice(LEVEL(dl)->MaxRow) - 1;
			ROOM(dl, x, y)->occupant = TRAP_DOOR;
	}

	if(dice((102 - dl) / 3 + nest) == 1 && PLAYER.Novice != 'Y') {
			for(i = 0; i < wow; i++) {
					x = dice(LEVEL(dl)->MaxCol) - 1; y = dice(LEVEL(dl)->MaxRow) - 1;
					ROOM(dl, x, y)->occupant = WELL;
			}
			wow = 1;
	}

	if(dice((102 - dl) / 3 + nest) == 1 && PLAYER.Novice != 'Y') {
			for(i = 0; i < wow; i++) {
					x = dice(LEVEL(dl)->MaxCol) - 1; y = dice(LEVEL(dl)->MaxRow) - 1;
					ROOM(dl, x, y)->occupant = WHEEL;
			}
			wow = 1;
	}

	if(nest < 10 && nest < PLAYER.Immortal && PLAYER.Novice != 'Y') {
			x = dice(LEVEL(dl)->MaxCol) - 1; y = dice(LEVEL(dl)->MaxRow) - 1;
			ROOM(dl, x, y)->occupant = DEEP_DANK_DUNGEON;
	}

	m = dice(nest / 4) + wow - 1;
	for(n = 0; n < m; n++) {
			x = dice(LEVEL(dl)->MaxCol) - 1; y = dice(LEVEL(dl)->MaxRow) - 1;
			ROOM(dl, x, y)->occupant = THIEF;
	}

	do {
			x = dice(LEVEL(dl)->MaxCol) - 1; y = dice(LEVEL(dl)->MaxRow) - 1;
	} while(ROOM(dl, x, y)->occupant);
	ROOM(dl, x, y)->occupant = CLERIC;

	do {
			x = dice(LEVEL(dl)->MaxCol) - 1; y = dice(LEVEL(dl)->MaxRow) - 1;
	} while(ROOM(dl, x, y)->occupant);
	ROOM(dl, x, y)->occupant = WIZARD;

	wow = 1;
	//      bonus for the more experienced player
	if(dice(PLAYER.Immortal) > dl && PLAYER.Novice != 'Y')
			if((dice(100 * dl + 1) / nest) == 1)
					wow = LEVEL(dl)->MaxRow * LEVEL(dl)->MaxCol;

	m = dice(dl / 33) + dice(nest / 3) + wow - 2;
	for(n = 0; n < m; n++) {
		x = dice(LEVEL(dl)->MaxCol) - 1; y = dice(LEVEL(dl)->MaxRow) - 1;
		if(dice(nest + 10) > nest) {
				ROOM(dl, x, y)->gift_id = FALSE;
				ROOM(dl, x, y)->gift_type = GIFT_VIAL;
				j = dice(126 + nest);
				for(i = 0; i < 16 && j > 0; i++)
						j -= i + 1;
				ROOM(dl, x, y)->gift_value = 16 - i;
				continue;
		}
		if(dice(nest + 5) > nest && ONLINE->user.MyPoison) {
				ROOM(dl, x, y)->gift_type = GIFT_POISON;
				j = dice(126 + nest);
				for(i = 0; i < 16 && j > 0; i++)
						j -= i + 1;
				ROOM(dl, x, y)->gift_value = 16 - i;
				continue;
		}

		if(dice(nest + 5) > nest && (ONLINE->user.MyMagic == 1 || ONLINE->user.MyMagic == 2)) {
				ROOM(dl, x, y)->gift_type = GIFT_MAGIC;
				j = dice(126 + nest);
				for(i = 0; i < 16 && j > 0; i++)
						j -= i + 1;
				ROOM(dl, x, y)->gift_value = 16 - i;
				continue;
		}
		if(dice(nest + 3) > nest && (ONLINE->user.MyMagic == 1 || ONLINE->user.MyMagic == 2)) {
				ROOM(dl, x, y)->gift_type = GIFT_XMAGIC;
				j = dice(11 + nest);
				for(i = 0; i < 8 && j > 0; i++)
						j -= i + 1;
				ROOM(dl, x, y)->gift_value = 8 - i;
				continue;
		}
		if(dice(nest + ONLINE->user.MyMagic + 4) > nest) {
				ROOM(dl, x, y)->gift_type = GIFT_CHEST;
				ROOM(dl, x, y)->gift_value = dice(nest + 6) - 1;
				continue;
		}

		if(dice(nest * (ONLINE->user.MyMagic + 3)) - ONLINE->user.MyMagic > nest) {
				ROOM(dl, x, y)->gift_type = GIFT_ARMOR;
				ROOM(dl, x, y)->gift_value = dice(nest + 6) - 1;
				continue;
		}
		if(dice(nest * (ONLINE->user.MyMagic + 2)) - ONLINE->user.MyMagic > nest) {
				ROOM(dl, x, y)->gift_type = GIFT_WEAPON;
				ROOM(dl, x, y)->gift_value = dice(nest + 6) - 1;
				continue;
		}
	}

	m = nest - 1;
	for(i = 0; i < LEVEL(dl)->MaxCol; i++)
			for(j = 0; j < LEVEL(dl)->MaxRow; j++)
					if(ROOM(dl, i, j)->gift_type == GIFT_DETECT)
							m = 0;

	if(m) {
			x = dice(LEVEL(dl)->MaxCol) - 1; y = dice(LEVEL(dl)->MaxRow) - 1;
			ROOM(dl, x, y)->gift_type = GIFT_MAP;
	}

	renderdmap();
	drawmap();

	hx = dice(LEVEL(dl)->MaxCol) - 1; hy = dice(LEVEL(dl)->MaxRow) - 1;
	fx = hx; fy = hy;
	mymove = TRUE;

	if(!logoff) {
			sprintf(outbuf, "is entering Dungeon %s, level %d", numlev[nest], dl + 1);
			broadcast(outbuf);
	}

	if((int)PLAYER.Level / 9 - nest > PLAYER.Security) {
			NL;
			OUT("The feeling of insecurity overwhelms you."); NL;
			paused();
	}
*/

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
		const box = xvt.Draw[$.player.emulation]
		let r: number, c: number
		let room: room
		paper = new Array(2 * DL.rooms.length + 1)

		//	draw level borders on an empty sheet of paper
		paper[0] = '\x00' + box[0].repeat(6 * DL.width - 1) + '\x00'
		for (r = 1; r < 2 * DL.rooms.length; r++)
			paper[r] = box[10] + ' '.repeat(6 * DL.width - 1) + box[10]
		paper[paper.length - 1] = '\x00' + box[0].repeat(6 * DL.width - 1) + '\x00'

		//	crawl each room to construct walls
		for (r = 0; r < DL.rooms.length; r++) {
			for (c = 0; c < DL.width; c++) {
				room = DL.rooms[r][c]
				let row = r * 2, col = c * 6

				//	north-south corridor
				if (room.type == 1) {
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
				if (room.type == 2) {
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

function putMonster(r?:number, c?:number) {
	// attempt to add one to a cavern only, but no more than 3
	if (!r && !c) {
		do {
			r = $.dice(DL.rooms.length) - 1
			c = $.dice(DL.width) - 1
		} while (DL.rooms[r][c].type != 3)
		if (DL.rooms[r][c].monster.length > 2)
			return
		//	no? add anywhere
		r = $.dice(DL.rooms.length) - 1
		c = $.dice(DL.width) - 1
	}

	let i:number = DL.rooms[r][c].monster.length
	let j:number = 0
	let dm:monster
	let level: number = 0
	let m:active

	for (j = 0; j < 4; j++)
		level += $.dice(7)
	switch (level >>2) {
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
	level = (i == 1) ? (level >>1) + $.dice(level / 2 + 1) : (i == 2) ? $.dice(level + 1) : level
	level = (level < 1) ? 1 : (level > 99) ? 99 : level

	let room = DL.rooms[r][c]
	i = room.monster.push(<active>{ user:{ id: '', sex:'I', level:level } }) - 1
	m = room.monster[i]
	j = level + $.dice(7) - 4
	j = j < 0 ? 0 : j >= Object.keys(monsters).length ? Object.keys(monsters).length - 1 : j
	m.user.handle = Object.keys(monsters)[j]
	dm = monsters[m.user.handle]
	$.reroll(m.user, dm.pc ? dm.pc : $.player.pc, level)

	m.user.weapon = dm.weapon ? dm.weapon : j >>1
	m.user.armor = dm.armor ? dm.armor : j >>2
	m.user.hp >>= 2
	i = 5 - $.dice(deep / 3)
	m.user.sp = Math.trunc(m.user.sp / i)
	m.user.poisons = []
	if (dm.poisons)
		for (let vials in dm.poisons)
			$.Poison.add(m.user.poisons, dm.poisons[vials])
	m.user.spells = []
	if (dm.spells)
		for (let magic in dm.spells)
			$.Magic.add(m.user.spells, dm.spells[magic])

	$.activate(m)
	i = 5 - (deep >>1)
	m.str -= i
	m.int -= i
	m.dex -= i
	m.cha -= i
	let gold = new $.coins(1)
	gold.value += $.worth(new $.coins(m.weapon.value).value, $.dice($.online.cha) / 5 + 5)
	gold.value += $.worth(new $.coins(m.armor.value).value, $.dice($.online.cha) / 5 + 5)
	gold.value *= $.dice(deep)
	m.user.coin = new $.coins(gold.carry(1, true))
}

}

export = Dungeon
