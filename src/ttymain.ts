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

import $ = require('./common')
import xvt = require('xvt')

//  classic terminal user interface entry point
module ttyMain
{
    xvt.emulation = process.argv.length > 2 ? process.argv[2].toUpperCase() : 'XT'
    xvt.defaultTimeout = 120
    xvt.modem = true

    //  initiate user login sequence: id or a new registration
    require('./tty/logon')
}

export = ttyMain
