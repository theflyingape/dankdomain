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

	declare interface dungeon {
		rooms: any[]
		map: boolean
		moves: number
		width: number
	}
	declare interface room {
		map: boolean		//	explored?
		occupant: number	//	0=none, 1=trap door, 2=deeper dungeon, 3=well, 4=wheel, 5=thief, 6=cleric, 7=wizard
		type: number		//	0=Emp, 1=N-S, 2=W-E, 3=Cav
		gift?: boolean		//	undefined, or identified?
		giftItem?: string	//	magic, poison, potion, treasure, map, radar, armor, weapon
		giftValue?: number
		level?: number[]
		monster?: monster[]
	}

	let fini: Function
	let dd
	let deep: number
	let dank: number
	let DL: dungeon
	let ROOM: room
	let X: number
	let Y: number

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
	dank = start > 99 ? 99 : start
	fini = cb
	dd = new Array(10)
	dd[deep] = new Array(100)

	menu()
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

	case 'C':
		Battle.cast($.online, menu)
		return

	case 'P':
		Battle.poison($.online, menu)
		return

	case 'Y':
		Battle.yourstats()
		break

	default:
		xvt.beep()
		suppress = false
	}

	menu(suppress)
}

function generateLevel() {
	if (dd[deep][dank]) {
		DL = dd[deep][dank]
		return
	}

	let maxRow = 6 + $.dice(dank / 32 + 1)
	while (maxRow < 10 && $.dice($.online.cha / (4 * ($.player.backstab + 1))) == 1)
		maxRow++
	let maxCol = 6 + $.dice(dank / 16 + 1)
	while (maxCol < 13 && $.dice($.online.cha / (4 * ($.player.backstab + 1))) == 1)
		maxCol++

	dd[dank][deep] = <dungeon>{
		rooms: new Array(maxRow),
 		map: false,
		moves: 0,
		width: maxCol
	}

	DL = dd[dank][deep]
	for (let y in DL.rooms) {
		DL.rooms[y] = new Array(DL.width)
			for (let x in DL.rooms[y])
				DL.rooms[y][x] = <room>{ map:false, occupant:0, type:0 }
	}

	do {
		for (let y in DL.rooms) {
			for (let x in DL.rooms[y]) {
				let n:number
				while((n = ($.dice(4) + $.dice(4)) >>1 - 1) == 3);
				n = (n == 0) ? 3 : (n == 1) ? 0 : $.dice(2)
				DL.rooms[y][x] = <room>{ map:true, type:n }
			}
		}
	} while ((): boolean => {
		let result = true
		checkRoom(0, 0)
		for (let y in DL.rooms)
			for (let x in DL.rooms[y])
				if (DL.rooms[y][x].map)
					result = false
		return(result)
	})

	function checkRoom(r:number, c:number) {

	}
}

}

export = Dungeon
