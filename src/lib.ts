/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  LIB authored by: Robert Hurst <theflyingape@gmail.com>                   *
\*****************************************************************************/

import db = require('./db')
import fs = require('fs')
import $ = require('./runtime')
import { loadUser } from './io'
import { dice, int, titlecase, whole } from './sys'

module lib {

    export function cuss(text: string): boolean {
        let words = titlecase(text).split(' ')

        for (var i = 0; i < words.length; i++) {
            if (words[i].match('/^Asshole$|^Cock$|^Cunt$|^Fck$|^Fu$|^Fuc$|^Fuck$|^Fuk$|^Phuc$|^Phuck$|^Phuk$|^Twat$/')) {
                $.reason = 'needs a timeout'
                return true
            }
        }
        return false
    }

    export function encounter(where = '', lo = 2, hi = 99): active {
        lo = lo < 2 ? 2 : lo > 99 ? 99 : lo
        hi = hi < 2 ? 2 : hi > 99 ? 99 : hi

        let rpc = <active>{ user: { id: '' } }
        let rs = db.query(`SELECT id FROM Players WHERE id != '${$.player.id}'
            AND xplevel BETWEEN ${lo} AND ${hi}
            AND status != 'jail'
            ${where} ORDER BY level`)
        if (rs.length) {
            let n = dice(rs.length) - 1
            rpc.user.id = rs[n].id
            loadUser(rpc)
        }
        return rpc
    }

    export function experience(level: number, factor = 1, wisdom = $.player.int): number {
        if (level < 1) return 0
        // calculate need to accrue based off PC intellect capacity
        if (wisdom < 1000) wisdom = (1100 + level - 2 * wisdom)

        return factor == 1
            ? Math.round(wisdom * Math.pow(2, level - 1))
            : int(wisdom * Math.pow(2, level - 2) / factor)
    }

    export function log(who: string, message: string) {
        const folder = './files/user'
        if (!fs.existsSync(folder))
            fs.mkdirSync(folder)
        const log = `${folder}/${who}.txt`

        if (who.length && who[0] !== '_' && who !== $.player.id)
            fs.appendFileSync(log, `${message}\n`)
    }

    export function news(message: string, commit = false) {

        const folder = './files/tavern'
        if (!fs.existsSync(folder))
            fs.mkdirSync(folder)
        const log = `${folder}/${$.player.id}.log`

        if ($.access.roleplay) {
            fs.appendFileSync(log, `${message}\n`)
            if (message && commit) {
                const paper = `./files/tavern/today.txt`
                fs.appendFileSync(paper, fs.readFileSync(log))
            }
        }
        if (commit)
            fs.unlink(log, () => { })
    }

    export function tradein(retail: number, percentage = $.online.cha): number {
        percentage--
        return whole(retail * percentage / 100)
    }

    export function what(rpc: active, action: string): string {
        return action + (rpc !== $.online ? (/.*ch$|.*sh$|.*s$|.*z$/i.test(action) ? 'es ' : 's ') : ' ')
    }
}

export = lib
