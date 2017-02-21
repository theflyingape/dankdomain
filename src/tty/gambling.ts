/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  GAMBLING authored by: Robert Hurst <theflyingape@gmail.com>              *
\*****************************************************************************/

import $ = require('../common')
import xvt = require('xvt')

module Gambling
{
	let casino: choices = {
        'B': { description:'Blackjack' },
        'C': { description:'Craps' },
        'G': { description:'Greyhound race' },
        'H': { description:'High card' },
        'I': { description:'Instant Cash machine' },
    	'K': { description:'Keno' },
        'R': { description:'Roulette' },
        'S': { description:'One-armed Bandit' }
	}

export function menu(suppress = false) {
    xvt.app.form = {
        'menu': { cb:choice, cancel:'q', enter:'?', eol:false }
    }
    xvt.app.form['menu'].prompt = $.display('casino', xvt.Blue, xvt.blue, suppress, casino)
    xvt.app.focus = 'menu'
}

function choice() {
    let suppress = $.player.expert
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isNotEmpty(casino[choice]))
        xvt.out(choice, ' - ', casino[choice].description, '\n')
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

export = Gambling
