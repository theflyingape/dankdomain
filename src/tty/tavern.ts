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

    $.loadUser($.barkeep)

export function menu(suppress = true) {
	$.action('tavern')
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
        if (xvt.validator.isNotEmpty(tavern[choice].description)) {
            xvt.out(' - ', tavern[choice].description, '\n')
            suppress = true
        }
    else {
        xvt.beep()
        suppress = false
    }
    xvt.out('\n')
    
    switch (choice) {
        case 'T':
            $.cat('tavern/today')
            suppress = true
            break

        case 'Y':
            $.cat('tavern/yesterday')
            suppress = true
            break

        case 'G':
            xvt.out(`${$.barkeep.user.handle} pours you a beer.\n`)
            xvt.waste(500)

            $.action('payment')
            xvt.app.form = {
                'tip': { cb:() => {
                    xvt.out('\n\n')
                    if ((+xvt.entry).toString() === xvt.entry) xvt.entry += 'c'
                    let tip = (/=|max/i.test(xvt.entry)) ? $.player.coin.value : new $.coins(xvt.entry).value
                    if (tip < 1 || tip > $.player.coin.value) {
                        $.sound('oops')
                        xvt.out($.who($.barkeep, 'He'), 'pours the beer on you and kicks you out of his bar.\n')
                        xvt.waste(1000)
                        $.brawl = 0
                        require('./main').menu(true)
                        return
                    }
                    xvt.beep()
                    xvt.out($.who($.barkeep, 'He'), 'grunts and hands you your beer.')
                    if ($.player.emulation === 'XT') xvt.out(' \u{1F37A}')
                    xvt.out('\n')
                    $.online.altered = true
                    $.player.coin.value -= tip
                    xvt.waste(1000)
                    xvt.out($.who($.barkeep, 'He'), 'says, "', [
                        'More stamina will yield more hit points',
                        'More intellect will yield more spell power',
                        'You don\'t miss as often with higher agility',
                        'You can sell items for better items with higher charisma',
                        'You can do more damage in battle with higher stamina',
                        'Spells don\'t fail as often with higher intellect',
                        'Higher agility yields higher jousting ability',
                        'Fishing can get better results from higher charisma',
                        'Real Estate and Security help protect your investments',
                        'Higher baud rates yield faster screen displays',
                        'Crying will not change the world',
                        'Backstabs swish more than you wish',
                        'Dungeon maps fall more into the hands of the lucky',
                        'Higher intellect calculates opponent\'s hit points more accurately',
                        'At least 50 Intellect points are needed to recall where you\'ve been walking',
                        'I\'ll have more hints tomorrow.  Maybe'
                    ][tip % 16])
                    xvt.out('."\n')
                    xvt.waste(1000)
                    menu()
                }, prompt:'How much will you tip? ', max:8 },
            }
            xvt.app.focus = 'tip'
            return

        case 'Q':
			require('./main').menu($.player.expert)
			return

        default:
			xvt.beep()
    	    suppress = false
	}
	menu(suppress)
}

}

export = Tavern
