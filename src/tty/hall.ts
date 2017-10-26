/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  HALL authored by: Robert Hurst <theflyingape@gmail.com>                  *
\*****************************************************************************/

import $ = require('../common')
import xvt = require('xvt')

module Hall
{
	let hall: choices = {
        'F': { description:'Hall of Fame' },
        'L': { description:'Hall of Lame' }
	}

export function menu(suppress = false) {
    xvt.app.form = {
        'menu': { cb:choice, cancel:'q', enter:'?', eol:false }
    }
    xvt.app.form['menu'].prompt = $.display('hall', xvt.Blue, xvt.blue, suppress, hall)
    xvt.app.focus = 'menu'
}

function choice() {
    let suppress = $.player.expert
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isNotEmpty(hall[choice]))
        xvt.out(choice, ' - ', hall[choice].description, '\n')
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

export = Hall
