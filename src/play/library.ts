/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  LIBRARY authored by: Robert Hurst <theflyingape@gmail.com>               *
\*****************************************************************************/

import $ = require('./runtime')
import db = require('../db')
import { cat, display, vt } from '../lib'
import { elemental } from '../npc'
import { Deed, PC } from '../pc'
import { input } from '../player'
import { date2full, dice, sprintf } from '../sys'

module Library {

    let library: choices = {
        'C': { description: 'Class Champions' },
        'H': { description: 'Hall of Heroes' },
        'I': { description: 'Immortals' },
        'M': { description: 'Most Memorable Hits' },
        'T': { description: 'Top Ten Tavern Thugs' },
        'W': { description: 'Winners' }
    }

    export function menu(suppress = false) {
        elemental.orders('Library')
        vt.form = {
            'menu': { cb: choice, cancel: 'Q', enter: '?', eol: false }
        }
        vt.form['menu'].prompt = display('library', vt.Cyan, vt.cyan, suppress, library)
        input('menu', undefined, dice(10) * 2000)
    }

    function choice() {
        let suppress = false
        let choice = vt.entry.toUpperCase()
        if (library[choice]?.description) {
            vt.out(' - ', library[choice].description)
            suppress = $.player.expert
        }
        vt.outln()

        let q: string, medal: string

        switch (choice) {
            case 'C':
                vt.outln()
                vt.outln(vt.bright, vt.Red, '  Class      CHAMPION                  Date      BEST          Deed      ')
                vt.outln(vt.faint, vt.Red, '-------------------------------------------------------------------------')
                for (let type in PC.name)
                    for (let pc in PC.name[type]) {
                        let deeds = Deed.load(pc)
                        if (deeds.length) {
                            vt.out(sprintf('%-9s  ', pc))
                            let keys = ['plays', 'retreats', 'killed', 'kills', 'jw', 'jl', 'tw', 'tl', 'steals']
                            for (let best in keys) {
                                let deed = deeds.find((x) => { return x.deed == keys[best] })
                                if (deed) {
                                    vt.out(sprintf('%-22.22s  %-11s %6d ', deed.hero, date2full(deed.date).slice(4), deed.value))
                                    q = `SELECT value FROM Deeds WHERE deed='${deed.deed}' GROUP BY value ORDER BY value`
                                    if (/jw|steals|tw/.test(deed.deed)) q += ' DESC'
                                    q += ' LIMIT 3'
                                    medal = Deed.medal[0]
                                    let top3 = db.query(q)
                                    if (top3.length > 0 && deed.value == top3[0].value) {
                                        vt.out(vt.bright, vt.yellow)
                                        medal = Deed.medal[1]
                                    }
                                    if (top3.length > 1 && deed.value == top3[1].value) {
                                        vt.out(vt.bright, vt.cyan)
                                        medal = Deed.medal[2]
                                    }
                                    if (top3.length > 2 && deed.value == top3[2].value) {
                                        vt.out(vt.yellow)
                                        medal = Deed.medal[3]
                                    }
                                    vt.outln(medal, Deed.name[deed.deed].description)
                                    vt.out('           ')
                                }
                            }
                            vt.outln()
                        }
                    }
                suppress = true
                break

            case 'H':
                vt.outln()
                vt.outln(vt.bright, vt.Magenta, '  HERO                      Date      GOAT        Deed      ')
                vt.outln(vt.faint, vt.Magenta, '------------------------------------------------------------')
                let type = 'GOAT'
                let deeds = Deed.load(type)
                if (deeds.length) {
                    let keys = ['plays', 'retreats', 'killed', 'kills', 'jw', 'jl', 'tw', 'tl', 'steals']
                    for (let goat in keys) {
                        let deed = deeds.find((x) => { return x.deed == keys[goat] })
                        if (deed) {
                            vt.outln(sprintf('%-22.22s  %-11s %6d  '
                                , deed.hero, date2full(deed.date).slice(4), deed.value)
                                , Deed.name[deed.deed].description)
                        }
                    }
                }

                vt.outln()
                vt.outln(vt.Magenta, vt.yellow, vt.bright, '   TOP HERO                Deeds  ')
                vt.outln(vt.Magenta, vt.yellow, '----------------------------------')
                let rd = db.query(`
                    SELECT hero, count(*) AS n FROM Deeds
                    GROUP BY hero HAVING n > 0
                    ORDER BY n DESC LIMIT 10
                `)
                for (let n in rd) {
                    vt.outln(sprintf('%-22.22s     %4d', rd[n].hero, rd[n].n), ' ', +n < 3 ? Deed.medal[+n + 1] : '')
                }
                suppress = true
                break

            case 'I':
                vt.outln()
                vt.outln(vt.Black, vt.white, vt.bright, '   IMMORTAL                Wins   Rolls   Levels  Calls')
                vt.outln(vt.Black, vt.white, '-------------------------------------------------------')
                let rh = db.query(`
                    SELECT handle, wins, immortal, level, calls FROM Players
                    WHERE id NOT GLOB '_*' AND immortal > 0 AND calls > 0
                    ORDER BY immortal DESC, level DESC LIMIT 20
                `)
                for (let n in rh) {
                    vt.outln(sprintf(`%-22.22s     %3d   %4d ${+n < 3 ? Deed.medal[+n + 1] : '  '}  %5.2f  %5d`
                        , rh[n].handle, rh[n].wins, rh[n].immortal
                        , (100 * rh[n].immortal + rh[n].level) / rh[n].calls, rh[n].calls))
                }
                suppress = true
                break

            case 'M':
                vt.outln()
                vt.outln(vt.bright, vt.Blue, '  Class      OUTSTANDING               Date      BEST                 ')
                vt.outln(vt.faint, vt.Blue, '----------------------------------------------------------------------')
                for (let type in PC.name) {
                    for (let pc in PC.name[type]) {
                        let deeds = Deed.load(pc)
                        if (deeds.length) {
                            vt.out(sprintf('%-9s  ', pc))
                            let keys = ['levels', 'melee', 'blast', 'big blast']
                            for (let hurt in keys) {
                                let deed = deeds.find((x) => { return x.deed == keys[hurt] })
                                if (deed) {
                                    vt.out(sprintf('%-22.22s  %-11s %6d ', deed.hero, date2full(deed.date).slice(4), deed.value))
                                    q = `SELECT value FROM Deeds WHERE deed='${deed.deed}' GROUP BY value ORDER BY value DESC LIMIT 3`
                                    medal = Deed.medal[0]
                                    let top3 = db.query(q)
                                    if (top3.length > 0 && deed.value == top3[0].value) {
                                        vt.out(vt.bright, vt.yellow)
                                        medal = Deed.medal[1]
                                    }
                                    if (top3.length > 1 && deed.value == top3[1].value) {
                                        vt.out(vt.bright, vt.cyan)
                                        medal = Deed.medal[2]
                                    }
                                    if (top3.length > 2 && deed.value == top3[2].value) {
                                        vt.out(vt.yellow)
                                        medal = Deed.medal[3]
                                    }
                                    vt.outln(medal, Deed.name[deed.deed].description)
                                    vt.out('           ')
                                }
                            }
                            vt.outln()
                        }
                    }
                }
                suppress = true
                break

            case 'T':
                vt.outln()
                vt.outln(vt.Yellow, vt.black, ` ID   Player's Handle           Class    Lvl  Brawls `)
                vt.outln(vt.Yellow, vt.black, '-----------------------------------------------------')

                let rs = db.query(`
                    SELECT id, handle, pc, level, tw FROM Players
                    WHERE xplevel > 1 AND tw > 0
                    ORDER BY tw DESC, level DESC, immortal DESC
                    LIMIT 10
                `)

                for (let n in rs) {
                    vt.outln(sprintf('%-4s  %-23.23s  %-9s  %3d  %4d'
                        , rs[n].id[0] !== '_' ? rs[n].id : ' \u00B7 ', rs[n].handle
                        , rs[n].pc, rs[n].level, rs[n].tw))
                }

                suppress = true
                break

            case 'Q':
                require('./menu').menu($.player.expert)
                return

            case 'W':
                vt.outln(vt.green, '\n             --=:)) ', vt.bright, 'WINNERS', vt.normal, ' Only Noted ((:=--\n')
                cat('files/winners')
                suppress = true
                break
        }
        menu(suppress)
    }
}

export = Library
