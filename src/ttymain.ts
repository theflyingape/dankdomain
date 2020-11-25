/*****************************************************************************\
 *  👑 Ɗanƙ Ɗomaiƞ: the return of Hack & Slash    [ https://www.DDgame.us ]  *
 *  🖥 TTY MAIN authored by: Robert Hurst <theflyingape@gmail.com>           *
 *  💫 in memory of Ronald Hurst, aka, Imagination and Nobody [ 1939-2016 ]  *
 *                                                                           *
 *  Node.js dankdomain                          (C) 2017-2020 Robert Hurst   *
 *   Linux  rpgd                                (C) 1999-2014 Robert Hurst   *
 *   Amiga  RPGBBS Deluxe                       (C) 1994-1997 Robert Hurst   *
 *   🖱 🕹  Hack & Slash door                            with Mark Montminy  *
 *   Amiga  RPGBBS                              (C) 1992-1993 Robert Hurst   *
 *  MS-DOS  The Rhode Warrior BBS               (C) 1991-1992 Robert Hurst   *
 *  Apple Ⅱ TproBBS                                written by Guy T. Rice    *
\*****************************************************************************/

process.title = 'ddclient'
process.chdir(__dirname)

import xvt = require('xvt')

process.on('uncaughtException', (err, origin) => {
    xvt.outln(`${origin} ${err}`)
})

//  classic terminal user interface entry point
module ttyMain {

    xvt.sessionAllowed = 150
    xvt.defaultTimeout = 100

    xvt.app.emulation = <xvt.emulator>(process.argv.length > 2 && process.argv[2]
        ? process.argv[2].toUpperCase()
        : (/ansi77|dumb|^apple|^dw|vt52/i.test(process.env.TERM)) ? 'dumb'
            : (/^linux|^lisa|^ncsa|^pcvt|^vt|^xt/i.test(process.env.TERM)) ? 'VT'
                : (/ansi|cygwin|^pc/i.test(process.env.TERM)) ? 'PC'
                    : '')
    if ((xvt.modem = process.env.REMOTEHOST ? true : false))
        xvt.outln(xvt.off, xvt.bright
            , xvt.red, 'C'
            , xvt.yellow, 'A'
            , xvt.green, 'R'
            , xvt.cyan, 'R'
            , xvt.blue, 'I'
            , xvt.magenta, 'E'
            , xvt.white, 'R'
            , xvt.normal, ' '
            , xvt.faint, 'DETECTED')

    xvt.app.form = {
        'enq1': {
            cb: () => {
                //  console.log('ENQ response =', xvt.entry.split('').map((c) => { return c.charCodeAt(0) }))
                if (/^.*\[.*R$/i.test(xvt.entry)) {
                    xvt.app.emulation = 'XT'
                    logon()
                }
                else xvt.app.focus = 'enq2'
            }, prompt: '\x1B[6n', enq: true
        },
        'enq2': {
            cb: () => {
                //  console.log('ENQ response =', xvt.entry.split('').map((c) => { return c.charCodeAt(0) }))
                if (xvt.entry.length) xvt.app.emulation = 'VT'
                logon()
            }, prompt: '\x05', enq: true
        }
    }

    //  old-school enquire the terminal to identify itself
    if (xvt.app.emulation) logon()
    else xvt.app.focus = 'enq1'

    function logon() {
        xvt.outln(xvt.cyan, xvt.bright, xvt.app.emulation, xvt.normal, ' emulation ', xvt.faint, 'enabled\n')
        require('./tty/logon')
    }
}

export = ttyMain
