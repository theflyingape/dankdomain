/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  DATABASE authored by: Robert Hurst <theflyingape@gmail.com>              *
\*****************************************************************************/

import $ = require('./common')
import xvt = require('xvt')

module db
{
    const users = './users/'
    if(!$.fs.existsSync(users))
        $.fs.mkdirSync(users)

    //  https://github.com/JayrAlencar/sqlite-sync.js/wiki
    const sql = users + 'dankdomain.sql'
    let sqlite3 = require('sqlite-sync')
    sqlite3.connect(sql)

    let row = sqlite3.run(`SELECT * FROM sqlite_master WHERE name='Players' AND type='table'`)
    if (!row.length) {
        xvt.out('initializing players ... ')

        sqlite3.run(`CREATE TABLE IF NOT EXISTS Players (
            id text PRIMARY KEY, handle text UNIQUE NOT NULL, name text NOT NULL, email text, password text,
            dob numeric NOT NULL, sex text NOT NULL, joined numeric, expires numeric, lastdate numeric,
            lasttime numeric, calls numeric, today numeric, expert integer, emulation text NOT NULL,
            rows numeric, access text NOT NULL, remote text, pc text, gender text,
            novice integer, level numeric, xp numeric, xplevel numeric, status text,
            blessed text, cursed text, coward integer, bounty numeric, who text,
            gang text, keyseq text, keyhints text, melee numeric, backstab numeric,
            poison numeric, magic numeric, steal numeric, hp numeric, sp numeric,
            str numeric, maxstr numeric, int numeric, maxint numeric, dex numeric,
            maxdex numeric, cha numeric, maxcha numeric, coin numeric, bank numeric,
            loan numeric, weapon text, toWC numeric, armor text, toAC numeric,
            spells text, poisons text, realestate text, security text, hull numeric,
            cannon numeric, ram integer, wins numeric, immortal numeric, rating numeric,
          	plays numeric, jl numeric, jw numeric, killed numeric, kills numeric,
            retreats numeric, tl numeric, tw numeric
        )`)

        let npc = <user>{}
        Object.assign(npc, require('./etc/sysop.json'))
        Object.assign($.sysop, npc)
        $.reroll($.sysop, $.sysop.pc, $.sysop.level)
        $.sysop.xplevel = 0
        saveUser($.sysop, true)

        npc = <user>{}
        Object.assign(npc, require('./etc/barkeep.json'))
        Object.assign($.barkeep.user, npc)
        $.reroll($.barkeep.user, $.barkeep.user.pc, $.barkeep.user.level)
        //  customize our Master of Whisperers NPC
        if (npc.str) $.barkeep.user.str = npc.str
        if (npc.int) $.barkeep.user.int = npc.int
        if (npc.dex) $.barkeep.user.dex = npc.dex
        if (npc.cha) $.barkeep.user.cha = npc.cha
        if (npc.hp) $.barkeep.user.hp = npc.hp
        if (npc.sp) $.barkeep.user.sp = npc.sp
        if (npc.melee) $.barkeep.user.melee = npc.melee
        if (npc.poison) $.barkeep.user.poison = npc.poison
        if (npc.magic) $.barkeep.user.magic = npc.magic
        if (npc.poisons) $.barkeep.user.poisons = npc.poisons
        if (npc.spells) $.barkeep.user.spells = npc.spells
        saveUser($.barkeep, true)

        npc = <user>{}
        Object.assign(npc, require('./etc/seahag.json'))
        Object.assign($.seahag.user, npc)
        $.reroll($.seahag.user, $.seahag.user.pc, $.seahag.user.level)
        //  customize our Queen Bee NPC
        if (npc.str) $.seahag.user.str = npc.str
        if (npc.int) $.seahag.user.int = npc.int
        if (npc.dex) $.seahag.user.dex = npc.dex
        if (npc.cha) $.seahag.user.cha = npc.cha
        if (npc.hp) $.seahag.user.hp = npc.hp
        if (npc.sp) $.seahag.user.sp = npc.sp
        if (npc.melee) $.seahag.user.melee = npc.melee
        if (npc.poison) $.seahag.user.poison = npc.poison
        if (npc.magic) $.seahag.user.magic = npc.magic
        if (npc.poisons) $.seahag.user.poisons = npc.poisons
        if (npc.spells) $.seahag.user.spells = npc.spells
        saveUser($.seahag, true)

        npc = <user>{}
        Object.assign(npc, require('./etc/taxman.json'))
        Object.assign($.taxman.user, npc)
        $.reroll($.taxman.user, $.taxman.user.pc, $.taxman.user.level)
        //  customize our Master of Coin NPC
        if (npc.str) $.taxman.user.str = npc.str
        if (npc.int) $.taxman.user.int = npc.int
        if (npc.dex) $.taxman.user.dex = npc.dex
        if (npc.cha) $.taxman.user.cha = npc.cha
        if (npc.hp) $.taxman.user.hp = npc.hp
        if (npc.sp) $.taxman.user.sp = npc.sp
        if (npc.melee) $.taxman.user.melee = npc.melee
        if (npc.poison) $.taxman.user.poison = npc.poison
        if (npc.magic) $.taxman.user.magic = npc.magic
        if (npc.poisons) $.taxman.user.poisons = npc.poisons
        if (npc.spells) $.taxman.user.spells = npc.spells
        $.taxman.user.xplevel = 0
        saveUser($.taxman, true)

        xvt.out('done.\n')
        xvt.waste(250)
    }

    row = sqlite3.run(`SELECT * FROM sqlite_master WHERE name='Hall' AND type='table'`)
    if (!row.length) {
        xvt.out('initializing halls ... ')

        //  id = fame|lame
        sqlite3.run(`CREATE TABLE IF NOT EXISTS Hall (
            id text, pc text, handle text, lastdate numeric,
          	plays numeric, jl numeric, jw numeric, killed numeric, kills numeric,
            retreats numeric, tl numeric, tw numeric
        )`)

        xvt.out('done.\n')
        xvt.waste(250)
    }


function isActive(arg: any): arg is active {
    return (<active>arg).user !== undefined
}

function isUser(arg: any): arg is user {
    return (<user>arg).id !== undefined
}

export function loadKing(): boolean {
    let king = Object.keys($.Access.name).slice(-1)[0]
    let query = `SELECT id FROM Players WHERE access = '${king}'`
    let row = sqlite3.run(query)
    if (row.length) {
        $.king = <user>{ id:row[0].id }
        return loadUser($.king)
    }

    let queen = Object.keys($.Access.name).slice(-2)[0]
    query = `SELECT id FROM Players WHERE access = '${queen}'`
    row = sqlite3.run(query)
    if (row.length) {
        $.king = <user>{ id:row[0].id }
        return loadUser($.king)
    }

    return false
}

export function loadUser(rpc): boolean {

    let user: user = isActive(rpc) ? rpc.user : rpc
    let query = 'SELECT * FROM Players WHERE '
    if (user.handle) user.handle = $.titlecase(user.handle)
    query += (user.id) ? `id = '${user.id.toUpperCase()}'` : `handle = '${user.handle}'`

    let row = sqlite3.run(query)
    if (row.length) {
        Object.assign(user, row[0])
        user.coin = new $.coins(row[0].coin)
        user.bank = new $.coins(row[0].bank)
        user.loan = new $.coins(row[0].loan)
        user.bounty = new $.coins(row[0].bounty)

        user.poisons = []
        if (row[0].poisons.length) {
            let vials = row[0].poisons.split(',')
            for (let i = 0; i < vials.length; i++)
                $.Poison.add(user.poisons, vials[i])
        }

        user.spells = []
        if (row[0].spells.length) {
            let spells = row[0].spells.split(',')
            for (let i = 0; i < spells.length; i++)
                $.Magic.add(user.spells, spells[i])
        }

        if (isActive(rpc)) $.activate(rpc)
        return true
    }
    else {
        user.id = ''
        return false
    }
}

export function saveUser(rpc, insert = false) {

    let user: user = isActive(rpc) ? rpc.user : rpc
    if (user.id === $.player.id || user.id[0] === '_') {
        let trace = users + user.id + '.json'
        if ($.reason === '')
            $.fs.writeFileSync(trace, JSON.stringify(user, null, 2))
        else
            $.fs.removeSync(trace)
    }

    let sql: string = ''

    if (insert) {
        sql = `INSERT INTO Players 
            ( id, handle, name, email, password
            , dob, sex, joined, expires, lastdate
            , lasttime, calls, today, expert, emulation
            , rows, access, remote, pc, gender
            , novice, level, xp, xplevel, status
            , blessed, cursed, coward, bounty, who
            , gang, keyseq, keyhints, melee, backstab
            , poison, magic, steal, hp, sp
            , str, maxstr, int, maxint, dex
            , maxdex, cha, maxcha, coin, bank
            , loan, weapon, toWC, armor, toAC
            , spells, poisons, realestate, security, hull
            , cannon, ram, wins, immortal, rating
          	, plays, jl, jw, killed, kills
            , retreats, tl, tw
            ) VALUES
            ('${user.id}', '${user.handle}', '${user.name}', '${user.email}', '${user.password}'
            , ${user.dob}, '${user.sex}', ${user.joined}, ${user.expires}, ${user.lastdate}
            , ${user.lasttime}, ${user.calls}, ${user.today}, ${+user.expert}, '${user.emulation}'
            , ${user.rows}, '${user.access}', '${user.remote}', '${user.pc}', '${user.gender}'
            , ${+user.novice}, ${user.level}, ${user.xp}, ${user.xplevel}, '${user.status}'
            ,'${user.blessed}', '${user.cursed}', ${+user.coward}, ${user.bounty.value}, '${user.who}'
            ,'${user.gang}', '${user.keyseq}', '${user.keyhints.toString()}', ${user.melee}, ${user.backstab}
            , ${user.poison}, ${user.magic}, ${user.steal}, ${user.hp}, ${user.sp}
            , ${user.str}, ${user.maxstr}, ${user.int}, ${user.maxint}, ${user.dex}
            , ${user.maxdex}, ${user.cha}, ${user.maxcha}, ${user.coin.value}, ${user.bank.value}
            , ${user.loan.value}, '${user.weapon}', ${user.toWC}, '${user.armor}', ${user.toAC}
            ,'${user.spells.toString()}', '${user.poisons.toString()}', '${user.realestate}', '${user.security}', ${user.hull}
            , ${user.cannon}, ${+user.ram}, ${user.wins}, ${user.immortal}, ${user.rating}
          	, ${user.plays}, ${user.jl}, ${user.jw}, ${user.killed}, ${user.kills}
            , ${user.retreats}, ${user.tl}, ${user.tw}
            )`
    }
    else {
        sql = `UPDATE Players SET
            handle='${user.handle}', name='${user.name}', email='${user.email}', password='${user.password}',
            dob=${user.dob}, sex='${user.sex}', joined=${user.joined}, expires=${user.expires}, lastdate=${user.lastdate},
            lasttime=${user.lasttime}, calls=${user.calls}, today=${user.today}, expert=${+user.expert}, emulation='${user.emulation}',
            rows=${user.rows}, access='${user.access}', remote='${user.remote}', pc='${user.pc}', gender='${user.gender}',
            novice=${+user.novice}, level=${user.level}, xp=${user.xp}, xplevel=${user.xplevel}, status='${user.status}',
            blessed='${user.blessed}', cursed='${user.cursed}', coward=${+user.coward}, bounty=${user.bounty.value}, who='${user.who}',
            gang='${user.gang}', keyseq='${user.keyseq}', keyhints='${user.keyhints.toString()}', melee=${user.melee}, backstab=${user.backstab},
            poison=${user.poison}, magic=${user.magic}, steal=${user.steal}, hp=${user.hp}, sp=${user.sp},
            str=${user.str}, maxstr=${user.maxstr}, int=${user.int}, maxint=${user.maxint}, dex=${user.dex},
            maxdex=${user.maxdex}, cha=${user.cha}, maxcha=${user.maxcha}, coin=${user.coin.value}, bank=${user.bank.value},
            loan=${user.loan.value}, weapon='${user.weapon}', toWC=${user.toWC}, armor='${user.armor}', toAC=${user.toAC},
            spells='${user.spells.toString()}', poisons='${user.poisons.toString()}', realestate='${user.realestate}', security='${user.security}', hull=${user.hull},
            cannon=${user.cannon}, ram=${+user.ram}, wins=${user.wins}, immortal=${user.immortal}, rating=${user.rating},
          	plays=${user.plays}, jl=${user.jl}, jw=${user.jw}, killed=${user.killed}, kills=${user.kills},
            retreats=${user.retreats}, tl=${user.tl}, tw=${user.tw}
            WHERE id='${user.id}'
        `
    }

    let result = sqlite3.run(sql)
    if (!xvt.validator.isNumber(result)) {
        xvt.beep()
        xvt.out('\n\nUnexpected SQL error: ', xvt.reset)
        console.log(sql)
        console.log(user)
        console.log(result)
        xvt.hangup()
    }
    else
        if (isActive(rpc)) rpc.altered = false
}

export function query(q: string): any {
    return sqlite3.run(q)
}

}

export = db
