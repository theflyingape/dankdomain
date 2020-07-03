/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  HALL authored by: Robert Hurst <theflyingape@gmail.com>                  *
\*****************************************************************************/

import $ = require('../common')
import xvt = require('xvt')
import { isNotEmpty } from 'class-validator'
import { sprintf } from 'sprintf-js'

module Hall {

    let hall: choices = {
        'C': { description: 'Class Champions' },
        'H': { description: 'Hall of Heroes' },
        'M': { description: 'Most Memorable Hits' },
        'T': { description: 'Top Ten Tavern Thugs' },
        'W': { description: 'Winners Only Noted' }
    }

    export function menu(suppress = false) {
        $.action('deeds')
        xvt.app.form = {
            'menu': { cb: choice, cancel: 'q', enter: '?', eol: false }
        }
        xvt.app.form['menu'].prompt = $.display('hall', xvt.Cyan, xvt.cyan, suppress, hall)
        xvt.app.focus = 'menu'
    }

    function choice() {
        let suppress = false
        let choice = xvt.entry.toUpperCase()
        if (isNotEmpty(hall[choice]))
            if (isNotEmpty(hall[choice].description)) {
                xvt.out(' - ', hall[choice].description)
                suppress = $.player.expert
            }
        xvt.outln()

        let q: string, medal: string

        switch (choice) {
            case 'C':
                xvt.outln()
                xvt.outln(xvt.bright, xvt.Red, '  Class      CHAMPION                  Date      BEST          Deed      ')
                xvt.outln(xvt.faint, xvt.Red, '-------------------------------------------------------------------------')
                for (let type in $.PC.name)
                    for (let pc in $.PC.name[type]) {
                        let deeds = $.loadDeed(pc)
                        if (deeds.length) {
                            xvt.out(sprintf('%-9s  ', pc))
                            let keys = ['plays', 'retreats', 'killed', 'kills', 'jw', 'jl', 'tw', 'tl', 'steals']
                            for (let best in keys) {
                                let deed = deeds.find((x) => { return x.deed == keys[best] })
                                if (deed) {
                                    xvt.out(sprintf('%-22.22s  %-11s %6d ', deed.hero, $.date2full(deed.date).slice(4), deed.value))
                                    q = `SELECT value FROM Deeds WHERE deed='${deed.deed}' GROUP BY value ORDER BY value`
                                    if (/jw|steals|tw/.test(deed.deed)) q += ' DESC'
                                    q += ' LIMIT 3'
                                    medal = $.Deed.medal[0]
                                    let top3 = $.query(q)
                                    if (top3.length > 0 && deed.value == top3[0].value) {
                                        xvt.out(xvt.bright, xvt.yellow)
                                        medal = $.Deed.medal[1]
                                    }
                                    if (top3.length > 1 && deed.value == top3[1].value) {
                                        xvt.out(xvt.bright, xvt.cyan)
                                        medal = $.Deed.medal[2]
                                    }
                                    if (top3.length > 2 && deed.value == top3[2].value) {
                                        xvt.out(xvt.yellow)
                                        medal = $.Deed.medal[3]
                                    }
                                    xvt.outln(medal, $.Deed.name[deed.deed].description)
                                    xvt.out('           ')
                                }
                            }
                            xvt.outln()
                        }
                    }
                suppress = true
                break

            case 'H':
                xvt.outln()
                xvt.outln(xvt.bright, xvt.Magenta, '  HERO                      Date      GOAT        Deed      ')
                xvt.outln(xvt.faint, xvt.Magenta, '------------------------------------------------------------')
                let type = 'GOAT'
                let deeds = $.loadDeed(type)
                if (deeds.length) {
                    let keys = ['plays', 'retreats', 'killed', 'kills', 'jw', 'jl', 'tw', 'tl', 'steals']
                    for (let goat in keys) {
                        let deed = deeds.find((x) => { return x.deed == keys[goat] })
                        if (deed) {
                            xvt.outln(sprintf('%-22.22s  %-11s %6d  '
                                , deed.hero, $.date2full(deed.date).slice(4), deed.value)
                                , $.Deed.name[deed.deed].description)
                        }
                    }
                }

                xvt.outln()
                xvt.outln(xvt.Magenta, xvt.yellow, xvt.bright, '   TOP HERO                Deeds  ')
                xvt.outln(xvt.Magenta, xvt.yellow, '----------------------------------')
                let rd = $.query(`
                    SELECT hero, count(*) AS n FROM Deeds
                    GROUP BY hero HAVING n > 0
                    ORDER BY n DESC LIMIT 10
                `)
                for (let n in rd) {
                    xvt.outln(sprintf('%-22.22s     %4d', rd[n].hero, rd[n].n), ' ', +n < 3 ? $.Deed.medal[+n + 1] : '')
                }

                suppress = true
                break

            case 'M':
                xvt.outln()
                xvt.outln(xvt.bright, xvt.Blue, '  Class      OUTSTANDING               Date      BEST                 ')
                xvt.outln(xvt.faint, xvt.Blue, '----------------------------------------------------------------------')
                for (let type in $.PC.name) {
                    for (let pc in $.PC.name[type]) {
                        let deeds = $.loadDeed(pc)
                        if (deeds.length) {
                            xvt.out(sprintf('%-9s  ', pc))
                            let keys = ['levels', 'melee', 'blast', 'big blast']
                            for (let hurt in keys) {
                                let deed = deeds.find((x) => { return x.deed == keys[hurt] })
                                if (deed) {
                                    xvt.out(sprintf('%-22.22s  %-11s %6d ', deed.hero, $.date2full(deed.date).slice(4), deed.value))
                                    q = `SELECT value FROM Deeds WHERE deed='${deed.deed}' GROUP BY value ORDER BY value DESC LIMIT 3`
                                    medal = $.Deed.medal[0]
                                    let top3 = $.query(q)
                                    if (top3.length > 0 && deed.value == top3[0].value) {
                                        xvt.out(xvt.bright, xvt.yellow)
                                        medal = $.Deed.medal[1]
                                    }
                                    if (top3.length > 1 && deed.value == top3[1].value) {
                                        xvt.out(xvt.bright, xvt.cyan)
                                        medal = $.Deed.medal[2]
                                    }
                                    if (top3.length > 2 && deed.value == top3[2].value) {
                                        xvt.out(xvt.yellow)
                                        medal = $.Deed.medal[3]
                                    }
                                    xvt.outln(medal, $.Deed.name[deed.deed].description)
                                    xvt.out('           ')
                                }
                            }
                            xvt.outln()
                        }
                    }
                }
                suppress = true
                break

            case 'T':
                xvt.outln()
                xvt.outln(xvt.Yellow, xvt.black, ` ID   Player's Handle           Class    Lvl  Brawls `)
                xvt.outln(xvt.Yellow, xvt.black, '-----------------------------------------------------')

                let rs = $.query(`
                    SELECT id, handle, pc, level, tw FROM Players
                    WHERE xplevel > 1 AND tw > 0
                    ORDER BY tw DESC, level DESC, immortal DESC
                    LIMIT 10
                `)

                for (let n in rs) {
                    xvt.outln(sprintf('%-4s  %-23.23s  %-9s  %3d  %4d'
                        , rs[n].id[0] !== '_' ? rs[n].id : ' \u00B7 ', rs[n].handle
                        , rs[n].pc, rs[n].level, rs[n].tw))
                }
                suppress = true
                break

            case 'Q':
                require('./main').menu($.player.expert)
                return

            case 'W':
                xvt.outln(xvt.green, '\n             --=:)) ', xvt.bright, 'WINNERS', xvt.normal, ' Only Noted ((:=--\n')
                $.cat('winners')
                suppress = true
                break
        }
        menu(suppress)
    }

}

export = Hall
