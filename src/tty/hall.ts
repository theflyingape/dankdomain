/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  HALL authored by: Robert Hurst <theflyingape@gmail.com>                  *
\*****************************************************************************/

import {sprintf} from 'sprintf-js'

import $ = require('../common')
import xvt = require('xvt')


module Hall
{
	let hall: choices = {
        'F': { description:'Hall of Fame' },
        'L': { description:'Hall of Lame' },
        'M': { description:'Most Memorable Hits' },
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
        case 'M':
            xvt.out('\n')
            xvt.out(xvt.Blue, xvt.white, '  Class      Hero                      Date      Deed       '
                , xvt.reset, '\n')
            xvt.out(xvt.Blue, xvt.white, '------------------------------------------------------------'
                , xvt.reset, '\n')
            for (let type in $.PC.name)
                for (let pc in $.PC.name[type]) {
                    let deeds = $.loadDeed(pc)
                    let melee = deeds.find((x) => { return x.deed === 'melee' })
                    if (melee)
                        xvt.out(sprintf('%-9s  %-22s  %-11s %6d '
                            , melee.pc, melee.hero, $.date2full(melee.date).slice(4), melee.value)
                            , $.Deed.name[melee.deed].description, '\n')
                    let blast = deeds.find((x) => { return x.deed === 'blast' })
                    if (blast)
                        xvt.out(sprintf('%-9s  %-22s  %-11s %6d '
                            , '', blast.hero, $.date2full(blast.date).slice(4), blast.value)
                            , $.Deed.name[blast.deed].description, '\n')
                    let bblast = deeds.find((x) => { return x.deed === 'big blast' })
                    if (bblast)
                        xvt.out(sprintf('%-9s  %-22s  %-11s %6d '
                            , '', bblast.hero, $.date2full(bblast.date).slice(4), bblast.value)
                            , $.Deed.name[bblast.deed].description, '\n')
                    if (deeds.length) xvt.out('\n')
                }
            suppress = true
            break

        case 'Q':
			require('./main').menu($.player.expert)
			return

        case 'W':
            xvt.out(xvt.magenta, '\n        --=:)) Past Winners List ((:=--', xvt.reset, '\n\n')
            $.cat('winners')
            suppress = true
            break
    }
	menu(suppress)
}

}

export = Hall
