/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  SYSOP authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import $ = require('../common')
import xvt = require('xvt')
import Battle = require('../battle')

module Sysop
{
	let sysop: choices = {
        'B': { description:'Blessed/Cursed Users' },
        'D': { description:'Deep Dank Dungeon' },
		'G': { description:'Gang record' },
		'N': { description:'New record' },
		'R': { description:'Reroll' },
		'S': { description:'System record' },
		'T': { description:'Tax record' },
		'U': { description:'User record' },
		'Y': { description:'Your Scout' }
	}

export function menu(suppress = false) {
    if ($.reason) xvt.hangup()
    $.music('.')
    xvt.app.form = {
        'menu': { cb:choice, cancel:'q', enter:'?', eol:false }
    }
    xvt.app.form['menu'].prompt = $.display('sysop', xvt.Red, xvt.red, suppress, sysop)
    xvt.app.focus = 'menu'
}

function choice() {
    let suppress = false
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isNotEmpty(sysop[choice]))
        if (xvt.validator.isNotEmpty(sysop[choice].description)) {
            xvt.out(' - ', sysop[choice].description)
            suppress = $.player.expert
        }
    xvt.out('\n')

    switch (choice) {
        case 'Q':
			require('./main').menu($.player.expert)
            return

        case 'D':
            $.music('dungeon' + $.dice(9))
            require('./dungeon').DeepDank($.player.level - 1, sysop)
            return

        case 'R':
            $.action('yn')
            xvt.app.form = {
                'yn': { cb:() => {
                    if (/Y/i.test(xvt.entry)) {
                        $.loadUser($.sysop)
                        $.sysop.dob = $.now().date + 1
                        $.saveUser($.sysop)
                        let rs = $.query(`SELECT id FROM Players WHERE id NOT GLOB '_*'`)
                        let user: user = { id:'' }
                        for (let row in rs) {
                            user.id = rs[row].id
                            $.loadUser(user)
                            $.reroll(user)
                            $.saveUser(user)
                            xvt.out('.')
                        }
                        $.reroll($.player)
                        xvt.out(xvt.reset, '\nHappy hunting tomorrow!\n')
                        $.reason = 'reroll'
                    }
                }, prompt:'Reroll the board (Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i }
            }
            xvt.app.focus = 'yn'
            return

        case 'Y':
        	Battle.user('Scout', (opponent: active) => {
                if (opponent.user.id) {
                    $.PC.stats(opponent)
                    xvt.app.form['pause'] = { cb:menu, pause:true }
                    xvt.app.focus = 'pause'
                }
                else
                    menu()
                })
            return
	}
	menu(suppress)
}

}

export = Sysop
