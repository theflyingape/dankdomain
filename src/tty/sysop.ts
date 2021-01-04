/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  SYSOP authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import Battle = require('../battle')
import Email = require('../email')
import db = require('../db')
import $ = require('../runtime')
import { vt, action, bracket, display, keyhint, loadUser, music, reroll, sound, status } from '../io'
import { PC } from '../pc'
import { now, sprintf, titlecase } from '../sys'

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
        if ($.reason) vt.hangup()
        music('.')
        vt.form = {
            'menu': { cb: choice, cancel: 'q', enter: '?', eol: false }
        }
        vt.form['menu'].prompt = display('sysop', vt.Red, vt.red, suppress, sysop)
        vt.focus = 'menu'
    }

    function choice() {
        let suppress = false
        let choice = vt.entry.toUpperCase()
        if (sysop[choice]?.description) {
            vt.out(' - ', sysop[choice].description)
            suppress = $.player.expert
        }
        vt.outln()

        let rpc: active = { user: { id: '' } }
        let rs = []

        switch (choice) {
            case 'Q':
                require('./main').menu($.player.expert)
                return

            case 'B':
                vt.outln()
                vt.outln(vt.Blue, vt.white, ` ID   Player's Handle           Class    Lvl  `)
                vt.outln(vt.Blue, vt.white, '----------------------------------------------')
                rs = db.query(`SELECT * FROM Players WHERE blessed !='' OR cursed !='' OR coward != 0`)
                for (let n in rs) {
                    //  paint a target on any player that is winning
                    if (rs[n].pc == PC.winning)
                        vt.out(vt.bright, vt.yellow)
                    else if (rs[n].id == $.player.id)
                        vt.out(vt.bright, vt.white)
                    vt.out(sprintf('%-4s  %-22s  %-9s  %3d ', rs[n].id, rs[n].handle, rs[n].pc, rs[n].level))
                    if (rs[n].blessed) vt.out(` blessed by ${rs[n].blessed} `)
                    if (rs[n].cursed) vt.out(` cursed by ${rs[n].cursed} `)
                    if (rs[n].coward) vt.out(bracket('COWARD', false))
                    vt.outln()
                }
                vt.form['pause'] = { cb: menu, pause: true }
                vt.focus = 'pause'
                return

            case 'D':
                action('list')
                vt.form = {
                    'level': {
                        cb: () => {
                            let i = parseInt(vt.entry)
                            if (isNaN(i)) {
                                vt.refocus()
                                return
                            }
                            if (i < 1 || i > 100) {
                                vt.refocus()
                                return
                            }
                            sound('teleport')
                            require('./dungeon').DeepDank(i - 1, menu)
                        }, prompt: `Level (1-100): `, min: 1, max: 3
                    }
                }
                vt.focus = 'level'
                return

            case 'N':
                rs = db.query(`SELECT id FROM Players WHERE id NOT GLOB '_*'`)
                for (let row in rs) {
                    rpc.user.id = rs[row].id
                    loadUser(rpc)
                    Email.newsletter(rpc.user)
                    vt.out('.', -2500)
                }
                vt.outln('done.', -1000)
                break

            case 'R':
                let pc: string
                let kh: number
                let k: number
                action('ny')
                vt.form = {
                    'pc': {
                        cb: () => {
                            if (!vt.entry)
                                vt.entry = Object.keys(PC.name['player'])[0]
                            pc = titlecase(vt.entry)
                            vt.focus = 'kh'
                        }, prompt: 'Enter starting player class? ', max: 20
                    },
                    'kh': {
                        cb: () => {
                            kh = parseInt(vt.entry)
                            kh = kh < 1 ? 0 : kh > 6 ? 6 : kh
                            vt.focus = 'yn'
                        }, prompt: 'Enter starting key hints (0-6)? ', max: 1
                    },
                    'yn': {
                        cb: () => {
                            vt.outln()
                            if (/Y/i.test(vt.entry)) {
                                loadUser($.sysop)
                                $.sysop.dob = now().date + 1
                                $.sysop.plays = 0
                                PC.saveUser($.sysop)
                                rs = db.query(`SELECT id FROM Players WHERE id NOT GLOB '_*'`)
                                for (let row in rs) {
                                    rpc.user.id = rs[row].id
                                    loadUser(rpc)
                                    reroll(rpc.user, pc)
                                    PC.newkeys(rpc.user)
                                    for (k = 0; k < kh; k++)
                                        keyhint(rpc)
                                    rpc.user.plays = 0
                                    PC.saveUser(rpc)
                                    vt.out('.')
                                }
                                reroll($.player, pc)
                                PC.newkeys($.player)
                                for (k = 0; k < kh; k++)
                                    keyhint($.online)
                                rpc.user.plays = 0
                                vt.outln(vt.reset, '\nHappy hunting tomorrow!')
                                $.reason = 'reroll'
                                vt.hangup()
                            }
                            else
                                menu()
                        }, prompt: 'Reroll the board (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i
                    }
                }
                vt.focus = 'pc'
                return

            case 'T':
                vt.form = {
                    'taxman': {
                        cb: () => {
                            loadUser($.taxman)
                            status($.taxman)
                            vt.focus = 'pause'
                        }, pause: true
                    },
                    'pause': { cb: menu, pause: true }
                }
                loadUser($.barkeep)
                status($.barkeep)
                vt.focus = 'taxman'
                return

            case 'Y':
                Battle.user('Scout', (opponent: active) => {
                    if (opponent.user.id) {
                        status(opponent)
                        vt.form['pause'] = { cb: menu, pause: true }
                        vt.focus = 'pause'
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
