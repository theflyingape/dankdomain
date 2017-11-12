/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  NAVAL authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import {sprintf} from 'sprintf-js'

import $ = require('../common')
import xvt = require('xvt')

module Naval
{
	let monsters: monster[] = require('../etc/naval.json')
	let naval: choices = {
		'S': { description:'Shipyard' },
        'B': { description:'Battle other users' },
        'H': { description:'Hunt sea monsters' },
        'G': { description:'Go fishing' },
        'Y': { description:'Your ship\'s status' },
        'L': { description:'List user ships' }
	}

export function menu(suppress = true) {
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
			break

		case 'H':
			if (!$.access.roleplay) break
			break

		case 'L':
			xvt.out(xvt.Blue, xvt.bright, '\n')
			xvt.out(' ID              Username             Hull      Cannons      Ram\n')
			xvt.out('----      ----------------------      ----      -------      ---\n', xvt.reset)
			rs = $.query(`SELECT id,handle,hull,cannon,ram FROM Players WHERE hull > 0 ORDER BY hull DESC`)
			for (let i in rs) {
				xvt.out(sprintf('%-4s     %-22s     %4u     %5u         %c\n')
					, rs[i].id, rs[i].handle, rs[i].hull, rs[i].cannon, rs[i].ram ? 'Y' : 'N')
			}
            xvt.app.form = {
                'pause': { cb:menu, pause:true }
            }
            xvt.app.focus = 'pause'
            return

		case 'S':
			if (!$.access.roleplay) break
			break

        case 'Q':
			require('./main').menu($.player.expert)
			return

		case 'Y':
			if (!$.player.hull) {
				xvt.out('You don\'t have a ship!\n')
				break
			}
			xvt.out('Ship\'s Status:\n\n')
			xvt.out(`Hull points: ${$.online.hull} out of ${$.player.hull}\n`)
			xvt.out(`Cannons: ${$.player.cannon}\n`)
			xvt.out(`Ram: ${$.player.ram ? 'Yes' : 'No'}\n`)
			break
	}
	menu(suppress)
}

function Shipyard(suppress = false) {
	$.action('shipyard')
	let menu: choices = {
		'B': { description:'Buy a new ship' },
		'F': { description:'Fix battle damage' },
		'C': { description:'Mount cannons' },
		'R': { description:'Mount a ram' }
	}
	var choice: string
}

}

export = Naval
