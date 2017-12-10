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
        'L': { description:'Hall of Lame' },
        'W': { description:'Past Winners List' }
	}

export function menu(suppress = false) {
    xvt.app.form = {
        'menu': { cb:choice, cancel:'q', enter:'?', eol:false }
    }
    xvt.app.form['menu'].prompt = $.display('hall', xvt.Cyan, xvt.cyan, suppress, hall)
    xvt.app.focus = 'menu'
}

function choice() {
    let suppress = false
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isNotEmpty(hall[choice]))
        if (xvt.validator.isNotEmpty(hall[choice].description)) {
            xvt.out(' - ', hall[choice].description)
            suppress = $.player.expert
        }
    xvt.out('\n')

    switch (choice) {
        case 'Q':
			require('./main').menu($.player.expert)
			return

        case 'W':
            xvt.out(xvt.magenta, '\n        --=:)) Past Winners List ((:=--', xvt.reset, '\n\n')
            $.cat('winners')
            suppress = false
            break
    }
	menu(suppress)
}

}

export = Hall
