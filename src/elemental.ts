/*****************************************************************************\
 *  Ɗaɳƙ Ɗoɱaiɳ: the return of Hack & Slash                                  *
 *  ELEMENTAL authored by: Robert Hurst <theflyingape@gmail.com>             *
\*****************************************************************************/

import $ = require('./runtime')
import db = require('./db')
import { Coin } from './items'
import { checkXP } from './player'
import { getRing, log, news, tradein, vt } from './lib'
import { PC } from './pc'
import { dice, int, money, pathTo, whole } from './sys'

module Elemental {

    export let targets: target[]

    export function refresh() {
        targets = []
        if (!$.access.bot) return
        $.access.sysop = true
        $.player.coward = false
        $.next = $.from == 'Menu' ? 's' : $.from == 'Arena' ? 'g' : $.from == 'Square' ? 'g' : 'q'

        let lo = $.player.level - 3
        let hi = $.player.level + 30
        lo = lo < 1 ? 1 : lo
        hi = hi > 99 ? 99 : hi

        let rpc = <active>{ user: { id: '' } }
        const rs = db.query(`SELECT id FROM Players WHERE id != '${$.player.id}'
            AND gang != '${$.player.gang}'
            AND xplevel BETWEEN ${lo} AND ${hi}
            AND status != 'jail'
            ORDER BY level`)

        for (let i in rs) {
            rpc.user.id = rs[i].id
            PC.load(rpc)
            targets = targets.concat({
                player: rpc.user,
                bail: false, jw: 0, tw: 0, kill: 0, gang: 0, steal: 0
            })
        }

        //  evaluate for Party

    }

}

export = Elemental
