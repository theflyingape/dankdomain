/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  TAVERN authored by: Robert Hurst <theflyingape@gmail.com>                *
\*****************************************************************************/

import $ = require('../common')
import xvt = require('xvt')

module Tavern
{
	let tavern: choices = {
        'B': { description:'Brawl another user' },
        'E': { description:'Eavesdrop on the arguments' },
        'J': { description:'Jump into the arguments' },
        'G': { description:'Guzzle beer' },
        'L': { description:'List user bounties' },
        'P': { description:'Post your own bounty' },
        'S': { description:'Swear at Tiny' },
        'T': { description:'Today\'s news' },
        'Y': { description:'Yesterday\'s news' }
	}

export function menu(suppress = false) {
    xvt.app.form = {
        'menu': { cb:choice, cancel:'q', enter:'?', eol:false }
    }
    xvt.app.form['menu'].prompt = $.display('tavern', xvt.Yellow, xvt.yellow, suppress, tavern)
    xvt.app.focus = 'menu'
}

function choice() {
    let suppress = $.player.expert
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isNotEmpty(tavern[choice]))
        xvt.out(choice, ' - ', tavern[choice].description, '\n')
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

export = Tavern
