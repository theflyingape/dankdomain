/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  SYSOP authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import $ = require('../common')
import db = require('../database')
import xvt = require('xvt')

module Sysop
{
	let sysop: choices = {
		'B': { description:'Blessed/Cursed Users' },
		'G': { description:'Gang record' },
		'N': { description:'New record' },
		'R': { description:'Reroll' },
		'S': { description:'System record' },
		'T': { description:'Tax record' },
		'U': { description:'User record' },
		'Y': { description:'Your Scout' }
	}

export function menu(suppress = false) {
    xvt.app.form = {
        'menu': { cb:choice, cancel:'q', enter:'?', eol:false }
    }
    xvt.app.form['menu'].prompt = $.display('sysop', xvt.Red, xvt.red, suppress, sysop)
    xvt.app.focus = 'menu'
}

function choice() {
    let suppress = $.player.expert
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isNotEmpty(sysop[choice]))
        xvt.out(choice, ' - ', sysop[choice].description, '\n')
    else {
        xvt.beep()
        suppress = false
    }

    switch (choice) {
        case 'Q':
			require('./main').menu($.player.expert)
			return

        case 'R':
            xvt.out('Alpha development phase: ')
            $.player.level = $.dice(100)
            $.player.pc = $.PC.random()
            xvt.out('rerolling as a level ', $.player.level.toString(), ' ', $.player.pc, '\n')

            $.reroll($.player, $.player.pc, $.player.level)
            $.activate($.online)

            $.player.coin = new $.coins($.money($.dice($.player.level) - 1))
            $.player.bank = new $.coins($.money($.player.level))
            $.player.loan = new $.coins($.money($.dice(100)))

            $.player.spells = []
            if ($.player.magic) {
                let n = $.dice(Object.keys($.Magic.spells).length)
                for (let i = 0; i < n; i++) {
                    let p = $.dice(Object.keys($.Magic.spells).length)
                    let spell = $.Magic.pick(p)
                    console.log(p, spell)
                    if (!$.Magic.have($.player.spells, spell))
                        $.Magic.add($.player.spells, p)
                }
            }

            $.player.poisons = []
            if ($.player.poison) {
                let n = $.dice(Object.keys($.Poison.vials).length)
                for (let i = 0; i < n; i++) {
                    let p = $.dice(Object.keys($.Poison.vials).length)
                    let vial = $.Poison.pick(p)
                    console.log(p, vial)
                    if (!$.Poison.have($.player.poisons, vial))
                        $.Poison.add($.player.poisons, p)
                }
            }

            db.saveUser($.player)

            suppress = true
            break
	}
	menu(suppress)
}

}

export = Sysop
