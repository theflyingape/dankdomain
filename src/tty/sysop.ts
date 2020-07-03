/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  SYSOP authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import $ = require('../common')
import xvt = require('xvt')
import Battle = require('../battle')
import Email = require('../email')
import { isNotEmpty } from 'class-validator'
import { sprintf } from 'sprintf-js'

module Sysop {

    let sysop: choices = {
        'B': { description: 'Blessed/Cursed and Cowards' },
        'D': { description: 'Deep Dank Dungeon' },
        'N': { description: 'Newsletter' },
        'R': { description: 'Reroll' },
        'T': { description: 'Tavern/Taxman records' },
        'Y': { description: 'Your Scout' }
    }

    export function menu(suppress = false) {
        if ($.reason) xvt.hangup()
        $.music('.')
        xvt.app.form = {
            'menu': { cb: choice, cancel: 'q', enter: '?', eol: false }
        }
        xvt.app.form['menu'].prompt = $.display('sysop', xvt.Red, xvt.red, suppress, sysop)
        xvt.app.focus = 'menu'
    }

    function choice() {
        let suppress = false
        let choice = xvt.entry.toUpperCase()
        if (isNotEmpty(sysop[choice]))
            if (isNotEmpty(sysop[choice].description)) {
                xvt.out(' - ', sysop[choice].description)
                suppress = $.player.expert
            }
        xvt.outln()

        let rpc: active = { user: { id: '' } }
        let rs = []

        switch (choice) {
            case 'Q':
                require('./main').menu($.player.expert)
                return

            case 'B':
                xvt.outln()
                xvt.outln(xvt.Blue, xvt.white, ` ID   Player's Handle           Class    Lvl  `)
                xvt.outln(xvt.Blue, xvt.white, '----------------------------------------------')
                rs = $.query(`SELECT * FROM Players WHERE blessed !='' OR cursed !='' OR coward != 0`)
                for (let n in rs) {
                    //  paint a target on any player that is winning
                    if (rs[n].pc == $.PC.winning)
                        xvt.out(xvt.bright, xvt.yellow)
                    else if (rs[n].id == $.player.id)
                        xvt.out(xvt.bright, xvt.white)
                    xvt.out(sprintf('%-4s  %-22s  %-9s  %3d ', rs[n].id, rs[n].handle, rs[n].pc, rs[n].level))
                    if (rs[n].blessed) xvt.out(` blessed by ${rs[n].blessed} `)
                    if (rs[n].cursed) xvt.out(` cursed by ${rs[n].cursed} `)
                    if (rs[n].coward) xvt.out($.bracket('COWARD', false))
                    xvt.outln()
                }
                xvt.app.form['pause'] = { cb: menu, pause: true }
                xvt.app.focus = 'pause'
                return

            case 'D':
                $.music('dungeon' + $.dice(9))
                require('./dungeon').DeepDank($.player.level - 1, sysop)
                return

            case 'N':
                rs = $.query(`SELECT id FROM Players WHERE id NOT GLOB '_*'`)
                for (let row in rs) {
                    rpc.user.id = rs[row].id
                    $.loadUser(rpc)
                    Email.newsletter(rpc.user)
                    xvt.out('.', -2500)
                }
                xvt.outln('done.', -1000)
                break

            case 'R':
                let pc: string
                let kh: number
                let k: number
                $.action('ny')
                xvt.app.form = {
                    'pc': {
                        cb: () => {
                            if (!xvt.entry)
                                xvt.entry = Object.keys($.PC.name['player'])[0]
                            pc = $.titlecase(xvt.entry)
                            xvt.app.focus = 'kh'
                        }, prompt: 'Enter starting player class? ', max: 20
                    },
                    'kh': {
                        cb: () => {
                            kh = parseInt(xvt.entry)
                            kh = kh < 1 ? 0 : kh > 6 ? 6 : kh
                            xvt.app.focus = 'yn'
                        }, prompt: 'Enter starting key hints (0-6)? ', max: 1
                    },
                    'yn': {
                        cb: () => {
                            xvt.outln()
                            if (/Y/i.test(xvt.entry)) {
                                $.loadUser($.sysop)
                                $.sysop.dob = $.now().date + 1
                                $.sysop.plays = 0
                                $.saveUser($.sysop)
                                rs = $.query(`SELECT id FROM Players WHERE id NOT GLOB '_*'`)
                                for (let row in rs) {
                                    rpc.user.id = rs[row].id
                                    $.loadUser(rpc)
                                    $.reroll(rpc.user, pc)
                                    $.newkeys(rpc.user)
                                    for (k = 0; k < kh; k++)
                                        $.keyhint(rpc)
                                    rpc.user.plays = 0
                                    $.saveUser(rpc)
                                    xvt.out('.')
                                }
                                $.reroll($.player, pc)
                                $.newkeys($.player)
                                for (k = 0; k < kh; k++)
                                    $.keyhint($.online)
                                rpc.user.plays = 0
                                xvt.outln(xvt.reset, '\nHappy hunting tomorrow!')
                                $.reason = 'reroll'
                                xvt.hangup()
                            }
                            else
                                menu()
                        }, prompt: 'Reroll the board (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i
                    }
                }
                xvt.app.focus = 'pc'
                return

            case 'T':
                xvt.app.form = {
                    'taxman': {
                        cb: () => {
                            $.loadUser($.taxman)
                            $.PC.stats($.taxman)
                            xvt.app.focus = 'pause'
                        }, pause: true
                    },
                    'pause': { cb: menu, pause: true }
                }
                $.loadUser($.barkeep)
                $.PC.stats($.barkeep)
                xvt.app.focus = 'taxman'
                return

            case 'Y':
                Battle.user('Scout', (opponent: active) => {
                    if (opponent.user.id) {
                        $.PC.stats(opponent)
                        xvt.app.form['pause'] = { cb: menu, pause: true }
                        xvt.app.focus = 'pause'
                    }
                    else
                        menu()
                })
                return
        }
        menu(suppress)
    }

}

export = Sysop
