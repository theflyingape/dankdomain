/*****************************************************************************\
 *  👑 Ɗaɳƙ Ɗoɱaiɳ: the return of Hack & Slash    [ https://www.DDgame.us ]  *
 *  🖥 TTY MAIN authored by: Robert Hurst <theflyingape@gmail.com>           *
 *  💫 in memory of Ronald Hurst, aka, Imagination and Nobody [ 1939-2016 ]  *
 *                                                                           *
 *  Node.js dankdomain                          (C) 2017-2021 Robert Hurst   *
 *   Linux  rpgd                                (C) 1999-2014 Robert Hurst   *
 *   Amiga  RPGBBS Deluxe                       (C) 1994-1997 Robert Hurst   *
 *   🖱 🕹  Hack & Slash door                            with Mark Montminy  *
 *   Amiga  RPGBBS                              (C) 1992-1993 Robert Hurst   *
 *  MS-DOS  The Rhode Warrior BBS               (C) 1991-1992 Robert Hurst   *
 *  Apple Ⅱ TproBBS                                written by Guy T. Rice    *
\*****************************************************************************/

process.on(`${process.title} uncaughtException`, (err, origin) => {
    console.error(`${origin} ${err}`)
})
process.title = 'ddclient'

//  check for BBS node -> door startup for user
const bbs = `${process.cwd()}/door.sys`

process.chdir(__dirname)

import { door, vt, whole } from '../lib'

vt.emulation = <EMULATION>
    (/ansi77|dumb|^apple|^dw|vt52/i.test(process.env.TERM) ? 'dumb'
        : /^linux|^lisa|^ncsa|^pcvt|^vt/i.test(process.env.TERM) ? 'VT'
            : /ansi|cygwin|^pc/i.test(process.env.TERM) ? 'PC'
                : '')

//  check for passed bot or a BBS id for auto-login
const userID = process.argv.length > 2 && process.argv[2].toUpperCase() || ''
if (userID.length && userID == whole(userID).toString()) {
    const user = door(bbs)
    if (userID == user[25]) {
        vt.emulation = user[19] == 'GR' ? 'PC' : 'VT'
        vt.tty = 'door'
    }
}

//  init tty handler
vt.sessionAllowed = 150
vt.defaultPrompt = vt.cyan
vt.defaultTimeout = 100
vt.stdio(false)

if ((vt.modem = process.env.REMOTEHOST ? true : false))
    vt.outln(vt.off, vt.bright
        , vt.red, 'C'
        , vt.yellow, 'A'
        , vt.green, 'R'
        , vt.cyan, 'R'
        , vt.blue, 'I'
        , vt.magenta, 'E'
        , vt.white, 'R'
        , vt.normal, ' '
        , vt.faint, 'DETECTED')

if (vt.emulation)
    logon()
else
    //  old-school enquire the terminal to identify itself
    vt.form = {
        0: {
            cb: () => {
                if (/^.*\[.*R$/i.test(vt.entry)) {
                    vt.emulation = 'XT'
                    logon()
                }
                else
                    vt.focus = 5
            }, prompt: '\x1B[6n', enq: true
        },
        5: {
            cb: () => {
                vt.emulation = vt.entry.length ? 'VT' : 'dumb'
                logon()
            }, prompt: '\x05', enq: true
        }
    }

function logon() {

    let prompt = 'Who dares to enter my dank domain'
    //  mode of operation
    if (vt.emulation == 'XT') {
        vt.tty = 'web'
        vt.title(process.title)
        prompt = 'Ⱳho ɗaɽes ʈo eɳʈeɽ ɱy ɗaɳƙ ɗoɱaiɳ'
    }
    vt.outln(vt.cyan, vt.bright, vt.emulation, vt.normal, ' emulation ', vt.faint, 'enabled')

    if (userID)
        require('./logon').startup(userID)
    else
        require('./logon').user(prompt)
}
