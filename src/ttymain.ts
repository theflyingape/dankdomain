/*****************************************************************************\
 *  👑 Dank Domain: the return of Hack & Slash                               *
 *  🖥 TTY MAIN authored by: Robert Hurst <theflyingape@gmail.com>           *
 *  💫 in memory of Ronald Hurst, aka, Imagination and Nobody [ 1939-2016 ]  *
 *                                                                           *
 *  Node.js dankdomain                          (C) 2017-2019 Robert Hurst   *
 *   Linux  rpgd                                (C) 1999-2014 Robert Hurst   *
 *   Amiga  RPGBBS Deluxe                       (C) 1994-1997 Robert Hurst   *
 *   🖱 🕹  Hack & Slash door                            with Mark Montminy  *
 *   Amiga  RPGBBS                              (C) 1992-1993 Robert Hurst   *
 *  MS-DOS  The Rhode Warrior BBS               (C) 1991-1992 Robert Hurst   *
 *  Apple2  TproBBS                                written by Guy T. Rice    *
\*****************************************************************************/

process.title = 'dankdomain'
process.chdir(__dirname)

import xvt = require('xvt')


//  classic terminal user interface entry point
module ttyMain
{
    xvt.sessionAllowed = 150
    xvt.defaultTimeout = 100
    xvt.pollingMS = 20
    if (/ansi77|dumb|^apple|^dw|vt52/i.test(process.env.TERM))          xvt.emulation = 'dumb'
    else if (/^linux|^lisa|^ncsa|^pcvt|^vt/i.test(process.env.TERM))    xvt.emulation = 'VT'
    else if (/ansi|cygwin|^pc/i.test(process.env.TERM))                 xvt.emulation = 'PC'
    else                                                                xvt.emulation = ''
    if ((xvt.modem = xvt.validator.isEmpty(process.env.REMOTEHOST)))
        xvt.outln('\n', xvt.bright
            , xvt.red,      'C'
            , xvt.yellow,   'A'
            , xvt.green,    'R'
            , xvt.cyan,     'R'
            , xvt.blue,     'I'
            , xvt.magenta,  'E'
            , xvt.white,    'R'
            , xvt.normal,   ' '
            , xvt.faint,    'DETECTED')

    xvt.app.form = {
	    'enq1': { cb:() => { 
		//  console.log('ENQ response =', xvt.entry.split('').map((c) => { return c.charCodeAt(0) }))
            if (/^.*\[.*R$/i.test(xvt.entry)) {
                xvt.emulation = 'XT'
                require('./tty/logon')
            }
            else xvt.app.focus = 'enq2'
        }, prompt:'\x1B[6n', enq:true },
	    'enq2': { cb:() => { 
		//  console.log('ENQ response =', xvt.entry.split('').map((c) => { return c.charCodeAt(0) }))
            if (xvt.entry.length)
                xvt.emulation = 'VT'
            require('./tty/logon')
        }, prompt:'\x05', enq:true }
    }

    if (!xvt.emulation && process.argv.length < 3)
        xvt.app.focus = 'enq1'
    else {
        xvt.emulation = xvt.emulation || process.argv[2].toUpperCase()
    //  initiate user login sequence: id, handle, or a new registration
        require('./tty/logon')
    }
}

export = ttyMain
