/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  TTY MAIN authored by: Robert Hurst <theflyingape@gmail.com>              *
 *   - in memory of Ronald Hurst, aka, Imagination and Nobody [ 1939-2016 ]  *
 *                                                                           *
 *  Node.js dankdomain                          (C) 2017      Robert Hurst   *
 *   Linux  rpgd                                (C) 1999-2014 Robert Hurst   *
 *   Amiga  RPGBBS Deluxe                       (C) 1994-1997 Robert Hurst   *
 *      //  Hack & Slash door                            with Mark Montminy  *
 *   Amiga  RPGBBS                              (C) 1992-1993 Robert Hurst   *
 *  MS-DOS  The Rhode Warrior BBS               (C) 1990-1991 Robert Hurst   *
 *  Apple2  TproBBS                                written by Guy T. Rice    *
\*****************************************************************************/

process.title = 'dankdomain'
process.chdir(__dirname)

import xvt = require('xvt')

//  classic terminal user interface entry point
module ttyMain
{
    xvt.defaultTimeout = 120
    xvt.modem = true
    xvt.out('\nCARRIER DETECTED\n')

    if (process.argv.length < 3) {
        //  try a remote query for terminal emulation auto-detection
        xvt.enquiry('\x1B[6n')
        if (xvt.entry.length > 0 && xvt.entry[0] == '[' && xvt.entry[xvt.entry.length - 1] == 'R')
                                                                        xvt.emulation = 'XT'
        else {
            xvt.enquiry('\x05')
            if (xvt.entry.length > 0)                                   xvt.emulation = 'VT'
        }
        //  else, check this process for terminal emulation auto-detection
        if (! xvt.emulation) {
            if (/ansi77|dumb|^apple|^dw|vt52/i.test(process.env.TERM))  xvt.emulation = 'dumb'
            else if (/^lisa|^ncsa|^pcvt|^vt/i.test(process.env.TERM))   xvt.emulation = 'VT'
            else if (/ansi|cygwin|^pc/i.test(process.env.TERM))         xvt.emulation = 'PC'
            else                                                        xvt.emulation = 'XT'
        }

        //  allow hardcopy and monochrome terminals to still play!  :)
        if (! xvt.emulation.match('VT|PC|XT'))                          xvt.emulation = 'dumb'
    }
    else
        xvt.emulation = process.argv[2].toUpperCase()

    //  initiate user login sequence: id or a new registration
    require('./tty/logon')
}

export = ttyMain
