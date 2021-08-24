/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  SYSOP authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import $ = require('./runtime')
import db = require('../db')
import { bracket, display, vt } from '../lib'
import { PC } from '../pc'
import { input } from '../player'
import { fs, now, pathTo, sprintf, titlecase } from '../sys'
import Battle = require('./battle')

module Sysop {

    let sysop: choices = {
        'B': { description: 'Blessed/Cursed and Cowards' },
        'D': { description: 'Deep Dank Dungeon' },
        'N': { description: 'Newsletter' },
        'R': { description: 'Reroll' },
        'T': { description: 'Tavern/Taxman records' },
        'X': { description: 'terminate: Reroll a player' },
        'Y': { description: 'Your Scout' }
    }

    export function menu(suppress = false) {
        if ($.reason) vt.hangup()
        vt.music()
        vt.form = {
            'menu': { cb: choice, cancel: 'q', enter: '?', eol: false }
        }
        vt.form['menu'].prompt = display('sysop', vt.Red, vt.red, suppress, sysop)
        input('menu')
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
                vt.action('list')
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
                            vt.sound('teleport')
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
                    PC.load(rpc)
                    require('../email').newsletter(rpc.user)
                    vt.out('.', -2500)
                }
                vt.outln('done.', -1000)
                break

            case 'Q':
                require('./menu').menu($.player.expert)
                return

            case 'R':
                let pc: string
                let kh: number
                let k: number
                vt.action('ny')
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
                                $.game.started = now().date + 1
                                $.game.plays = 0
                                $.savegame(true)

                                rs = db.query(`SELECT id FROM Players WHERE id NOT GLOB '_*'`)
                                for (let row in rs) {
                                    rpc.user.id = rs[row].id
                                    PC.load(rpc)
                                    rpc.user = PC.reroll(rpc.user, pc)
                                    PC.newkeys(rpc.user)
                                    for (k = 0; k < kh; k++)
                                        PC.keyhint(rpc)
                                    rpc.user.plays = 0
                                    PC.save(rpc)
                                    vt.out('.')
                                }
                                $.player = PC.reroll($.player, pc)
                                PC.newkeys($.player)
                                for (k = 0; k < kh; k++)
                                    PC.keyhint($.online)
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
                            PC.load($.taxman)
                            PC.status($.taxman)
                            vt.focus = 'pause'
                        }, pause: true
                    },
                    'pause': { cb: menu, pause: true }
                }
                PC.load($.barkeep)
                PC.status($.barkeep)
                vt.focus = 'taxman'
                return

            case 'X':
                vt.music('ddd')
                Battle.user('Reroll', (opponent: active) => {
                    if (opponent.user.id == $.player.id) {
                        opponent.user.id = ''
                        vt.outln(`You can't reroll yourself here.`)
                        vt.refocus()
                        return
                    }
                    if (opponent.user.id) {
                        opponent.user = PC.reroll(opponent.user)
                        opponent.user.keyhints.splice(12)
                        PC.save(opponent)
                        fs.unlink(pathTo('users', '.${user.id}.json'), () => { })
                        return
                    }
                    menu()
                })
                return

            case 'Y':
                Battle.user('Scout', (opponent: active) => {
                    if (opponent.user.id) {
                        PC.portrait(opponent)
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
