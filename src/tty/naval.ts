/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  NAVAL authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import $ = require('../common')
import db = require('../database')
import xvt = require('xvt')

module Naval
{

	let naval: choices = {
		'S': { description:'Shipyard' },
        'B': { description:'Battle other users' },
        'H': { description:'Hunt sea monsters' },
        'G': { description:'Go fishing' },
        'Y': { description:'Your ship\'s status' },
        'L': { description:'List user ships' }
	}

export function menu(suppress = false) {
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
        xvt.out(choice, ' - ', naval[choice].description, '\n')
    else {
        xvt.beep()
        suppress = false
    }

    switch (choice) {
		case 'B':
			break

		case 'G':
			break

		case 'H':
			break

		case 'L':
			break

		case 'S':
			break

        case 'Q':
			require('./main').menu($.player.expert)
			return

		case 'Y':
			break
	}
	menu(suppress)
}

function Shipyard(suppress = false) {
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
