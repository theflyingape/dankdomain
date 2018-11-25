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
        'C': { description:'Class Champions' },
        'H': { description:'Hall of Heroes' },
        'M': { description:'Most Memorable Hits' },
        'T': { description:'Top Ten Tavern Thugs' },
        'W': { description:'Winners Only Noted' }
	}

export function menu(suppress = false) {
    $.action('deeds')
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
        case 'C':
            xvt.out('\n')
            xvt.outln(xvt.Red, xvt.white, xvt.bright, '  Class      CHAMPION                  Date      BEST        Deed      ')
            xvt.out(xvt.Red, xvt.white, '-----------------------------------------------------------------------', xvt.reset)
            for (let type in $.PC.name)
                for (let pc in $.PC.name[type]) {
                    let deeds = $.loadDeed(pc)
                    if (deeds.length) {
                        xvt.out(sprintf('\n%-9s  ', pc))
                        let keys = ['plays', 'retreats', 'killed', 'kills', 'jw', 'jl', 'tw', 'tl']
                        for (let best in keys) {
                            let deed = deeds.find((x) => { return x.deed === keys[best] })
                            if (deed) {
                                xvt.out(sprintf('%-22.22s  %-11s %6d  '
                                    , deed.hero, $.date2full(deed.date).slice(4), deed.value)
                                    , $.Deed.name[deed.deed].description)
                                xvt.out('\n           ')
                            }
                        }
                    }
                }
            suppress = true
            break

        case 'H':
            xvt.out('\n')
            xvt.outln(xvt.Magenta, xvt.white, xvt.bright, '  HERO                      Date      GOAT        Deed      ')
            xvt.out(xvt.Magenta, xvt.white, '------------------------------------------------------------', xvt.reset)
            let type = 'GOAT'
            let deeds = $.loadDeed(type)
            if (deeds.length) {
                let keys = ['plays', 'retreats', 'killed', 'kills', 'jw', 'jl', 'tw', 'tl']
                for (let goat in keys) {
                    let deed = deeds.find((x) => { return x.deed === keys[goat] })
                    if (deed) {
                        xvt.out('\n', sprintf('%-22.22s  %-11s %6d  '
                            , deed.hero, $.date2full(deed.date).slice(4), deed.value)
                            , $.Deed.name[deed.deed].description)
                    }
                }
            }

            xvt.out('\n')
            xvt.outln(xvt.Magenta, xvt.yellow, xvt.bright, '   TOP HERO                Deeds   ')
            xvt.outln(xvt.Magenta, xvt.yellow, '-----------------------------------')
            let rd = $.query(`
                SELECT hero, count(*) as n FROM Deeds
                GROUP BY hero HAVING n > 1
                ORDER BY n DESC LIMIT 10
            `)
            for (let n in rd) {
                xvt.out(sprintf('%-22.22s     %4d', rd[n].hero, rd[n].n), '\n')
            }

            suppress = true
            break

        case 'M':
            xvt.out('\n')
            xvt.out(xvt.Blue, xvt.white, '  Class      OUTSTANDING               Date      HURT               ')
            xvt.out(xvt.Blue, xvt.white, '--------------------------------------------------------------------', xvt.reset)
            for (let type in $.PC.name) {
                for (let pc in $.PC.name[type]) {
                    let deeds = $.loadDeed(pc)
                    if (deeds.length) {
                        xvt.out(sprintf('\n%-9s  ', pc))
                        let keys = ['levels', 'melee', 'blast', 'big blast']
                        for (let hurt in keys) {
                            let deed = deeds.find((x) => { return x.deed === keys[hurt] })
                            if (deed) {
                                xvt.out(sprintf('%-22.22s  %-11s %6d  '
                                    , deed.hero, $.date2full(deed.date).slice(4), deed.value)
                                    , $.Deed.name[deed.deed].description)
                                xvt.out('\n           ')
                            }
                        }
                    }
                }
            }
            suppress = true
            break

        case 'T':
            xvt.out('\n')
            xvt.outln(xvt.Yellow, xvt.black, ' ID   Player\'s Handle           Class    Lvl  Brawls ')
            xvt.outln(xvt.Yellow, xvt.black, '-----------------------------------------------------')

            let rs = $.query(`
                SELECT id, handle, pc, level, tw FROM Players
                WHERE xplevel > 1 AND tw > 0
                ORDER BY tw DESC, level DESC, immortal DESC
                LIMIT 10
            `)

            for (let n in rs) {
                xvt.out(sprintf('%-4s  %-23.23s  %-9s  %3d  %4d'
                    , rs[n].id[0] !== '_' ? rs[n].id : ' \u00B7 ', rs[n].handle, rs[n].pc, rs[n].level, rs[n].tw)
                    , '\n')
            }
            suppress = true
            break

        case 'Q':
			require('./main').menu($.player.expert)
			return

        case 'W':
            xvt.out(xvt.green, '\n        --=:)) ', xvt.bright, 'WINNERS', xvt.normal, ' Only Noted ((:=--', xvt.reset, '\n\n')
            $.cat('winners')
            suppress = true
            break
    }
	menu(suppress)
}

}

export = Hall
