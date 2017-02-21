/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  PARTY authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import $ = require('../common')
import db = require('../database')
import xvt = require('xvt')

module Party
{
	let party: choices = {
        'E': { description:'Edit your gang' },
        'F': { description:'Fight another gang' },
        'J': { description:'Join a gang' },
        'L': { description:'List all gangs' },
        'M': { description:'Most Wanted list' },
        'R': { description:'Resign your membership' },
        'S': { description:'Start a new gang' },
        'T': { description:'Transfer leadership' }
	}

export function menu(suppress = false) {
    xvt.app.form = {
        'menu': { cb:choice, cancel:'q', enter:'?', eol:false }
    }
    xvt.app.form['menu'].prompt = $.display('party', xvt.Magenta, xvt.magenta, suppress, party)
    xvt.app.focus = 'menu'
}

function choice() {
    let suppress = $.player.expert
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isNotEmpty(party[choice]))
        xvt.out(choice, ' - ', party[choice].description, '\n')
    else {
        xvt.beep()
        suppress = false
    }

    switch (choice) {
        case 'Q':
			require('./main').menu($.player.expert)
			return
	}
	menu(suppress)
}

}

export = Party
