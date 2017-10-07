/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  MAIN authored by: Robert Hurst <theflyingape@gmail.com>                  *
\*****************************************************************************/

import {sprintf} from 'sprintf-js'

import $ = require('../common')
import db = require('../database')
import xvt = require('xvt')

module Main
{
    let mainmenu: choices = {
        '@': { description:'Sysop' },
        'A': { description:'Arena: Fight and Joust' },
        'D': { description:'Deep Dank Dungeon' },
        'E': { description:'Electronic Mail and Feedback' },
        'G': { description:'Gambling Casino' },
        'L': { description:'List of Top Users: Fame & Lame' },
        'M': { description:'Most Wanted List' },
        'N': { description:'Naval Adventures' },
        'P': { description:'Party/Gang Wars' },
        'R': { description:'Rob/Burglarize other users' },
        'S': { description:'Public Square (Shops, etc.)' },
        'T': { description:'Tiny\'s Tavern' },
        'U': { description:'User Configuration' },
        'X': { description:'terminate: Reroll character' },
        'Y': { description:'Your Statistics' },
        'Z': { description:'System Status' }
    }

export function menu(suppress = false) {
    if ($.online.altered) db.saveUser($.player)
    if ($.reason) xvt.hangup()

    xvt.app.form = {
        'menu': { cb:choice, cancel:'q', enter:'?', eol:false }
    }

    xvt.app.form['menu'].prompt = 
        xvt.attr('Time Left: ', xvt.bright, xvt.white,
            Math.round((xvt.sessionAllowed - ((new Date().getTime() - xvt.sessionStart.getTime()) / 1000)) / 60).toString())
        + xvt.attr(xvt.nobright, xvt.cyan, ' min.\n', xvt.reset)
        + $.display('main', xvt.Blue, xvt.blue, suppress, mainmenu)
    xvt.app.focus = 'menu'
}

function choice() {
    let suppress = $.player.expert
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isNotEmpty(mainmenu[choice]))
        if (xvt.validator.isNotEmpty(mainmenu[choice].description)) xvt.out(' - ', mainmenu[choice].description)
    else {
        xvt.beep()
        suppress = false
    }
    xvt.out('\n')

    switch (choice) {
        case '@':
            require('./sysop').menu($.player.expert)
            return

        case 'A':
            require('./arena').menu($.player.expert)
            return

        case 'D':
            require('./dungeon').menu($.player.expert)
            return

        case 'G':
            require('./gambling').menu($.player.expert)
            return

        case 'L':
            require('./hall').menu($.player.expert)
            return

        case 'M':
            xvt.out('\n')
            xvt.out(xvt.Blue, xvt.white)
            xvt.out(' ID   Player\'s Handle           Class    Lvl  Status  Party               \n')
            xvt.out('--------------------------------------------------------------------------', xvt.reset, '\n')

            let rows = db.query(`
                SELECT id, handle, pc, level, status, gang FROM Players
                WHERE id NOT GLOB '_*'
                ORDER BY level DESC, immortal DESC
                `)

            for (let n in rows[0].values) {
                let row = rows[0].values[n]

                //  paint a target on any player that is winning
                if (row[2] === $.PC.winning)
                    xvt.out(xvt.bright, xvt.yellow)
                else if (row[0] === $.player.id)
                    xvt.out(xvt.bright, xvt.white)
                xvt.out(sprintf('%-4s  %-22s  %-9s  %3d  ', row[0], row[1], row[2], row[3]))
                if (!row[4].length) xvt.out('Alive!  ')
                else xvt.out(xvt.faint, row[4] === 'jail' ? '#jail#' : '^dead^  ', xvt.reset)
                if (row[5] === $.player.gang) xvt.out(xvt.Red)
                xvt.out(row[5], xvt.reset, '\n')
            }
            suppress = true
            break

        case 'N':
            require('./naval').menu($.player.expert)
            return

        case 'P':
            require('./party').menu($.player.expert)
            return

        case 'Q':
            xvt.app.form = {
                'yn': { cb: () => {
                    xvt.out('\n')
                    if (xvt.entry.toUpperCase() === 'Y') {
                        if (!$.reason.length) $.reason = 'logged off as a level ' + $.player.level + ' ' + $.player.pc
                        xvt.hangup()
                    }
                    menu()
                }, prompt:'Are you sure (Y/N)? ', cancel:'Y', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:10 }
            }
            xvt.app.focus = 'yn'
            return

        case 'S':
            require('./square').menu($.player.expert)
            return

        case 'T':
            require('./tavern').menu($.player.expert)
            return

        case 'U':
            let newpassword: string = ''
            xvt.app.form = {
                'yn': { cb: () => {
                    xvt.out('\n')
                    if (xvt.entry.toUpperCase() === 'Y') {
                        xvt.app.focus = 'new'
                        return
                    }
                    $.emulator(menu)
                }, prompt:'Change your password (Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:10 },
                'new': { cb: () => {
                    if (xvt.entry.length < 4) {
                        xvt.beep()
                        menu()
                    }
                    newpassword = xvt.entry
                    xvt.app.form['check'].max = xvt.entry.length
                    xvt.app.focus = 'check'
                }, prompt:'Enter new password: ', echo:false, max:26 },
                'check': { cb: () => {
                    if (xvt.entry === newpassword) {
                        $.player.password = newpassword
                        db.saveUser($.player)
                        xvt.out('...saved...')
                    }
                    else {
                        xvt.beep()
                        xvt.out('...aborted...')
                    }
                    $.emulator(menu)
                }, prompt:'Re-enter to verify: ', echo:false }
            }
            xvt.app.focus = 'yn'
            return

        case 'X':
            xvt.app.form = {
                'yn': { cb: () => {
                    if (xvt.entry.toUpperCase() === 'Y') {
                        $.reroll($.player)
                        $.activate($.online)
                        xvt.out('\n')
                        $.playerPC()
                        $.player.coward = true
                        return
                    }
                    menu(true)
                }, prompt:'Reroll (Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:10 }
            }
            xvt.app.focus = 'yn'
            return

        case 'Y':
            $.PC.stats($.online)
            suppress = true
            break

        case 'Z':
            xvt.out(xvt.bright, xvt.green, '\n')
            $.cat('system')
            xvt.out(xvt.reset)
            suppress = true
            break
    }
    menu(suppress)
}

}

export = Main
