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

    let row = sqlite3.run(`SELECT * FROM sqlite_master WHERE name='Players' and type='table'`)
    if (!row.length) {
        xvt.out('initializing players ... ')

        sqlite3.run(`create table IF NOT EXISTS Players (
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
            cannon numeric, ram integer, wins numeric, immortal numeric, rating numeric
        )`)

        Object.assign($.sysop, require('./etc/sysop.json'))
        $.reroll($.sysop, $.sysop.pc, $.sysop.level)
        saveUser($.sysop, true)

        let taxman = <user>{}
        Object.assign(taxman, require('./etc/taxman.json'))
        $.reroll(taxman, taxman.pc, taxman.level)
        saveUser(taxman, true)

        let barkeep = <user>{}
        Object.assign(barkeep, require('./etc/barkeep.json'))
        $.reroll(barkeep, barkeep.pc, barkeep.level)
        saveUser(barkeep, true)

        xvt.out('done.\n')
    }


export function loadUser(user: user): boolean {
    let query = 'SELECT * FROM Players WHERE '
    if (user.handle && user.handle[0] != '_') user.handle = $.titlecase(user.handle)
    query += (user.id) ? `id = '${user.id.toUpperCase()}'` : `handle = '${user.handle}'`

    let row = sqlite3.run(query)
    if (row.length) {
        Object.assign(user, row[0])
        user.coin = new $.coins(row[0].coin)
        user.bank = new $.coins(row[0].bank)
        user.loan = new $.coins(row[0].loan)
        user.bounty = new $.coins(row[0].bounty)

        user.poisons = []
        let vials = row[0].poisons.split(',')
        for (let i = 0; i < vials.length; i++)
            $.Poison.add(user.poisons, vials[i])

        user.spells = []
        let spells = row[0].spells.split(',')
        for (let i = 0; i < spells.length; i++)
            $.Poison.add(user.spells, spells[i])
        return true
    }
    else
        return false
}

export function saveUser(user: user, insert = false) {

    $.fs.writeFileSync(users + user.id + '.json', JSON.stringify(user, null, 2))
    let sql: string = ''

    if (insert || !user.calls) {
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
            cannon=${user.cannon}, ram=${+user.ram}, wins=${user.wins}, immortal=${user.immortal}, rating=${user.rating}
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
        $.logoff()
    }
}

export function query(q: string): any {
    return sqlite3.run(q)
}

}

export = db
