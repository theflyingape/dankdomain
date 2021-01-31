/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  DB authored by: Robert Hurst <theflyingape@gmail.com>                    *
\*****************************************************************************/

import Database = require('better-sqlite3')
import { now, pathTo } from './sys'
import { Coin, Ring } from './items'

module db {

    export const DD = pathTo('users', 'dankdomain.sql')
    let sqlite3: Database.Database
    try {
        sqlite3 = Database(DD, { timeout: 8000 })
        sqlite3.pragma('journal_mode = WAL')
    }
    catch (err) {
        console.error('SQLite3 error:', err.message)
        console.error(DD)
    }

    let rs = query(`SELECT * FROM sqlite_master WHERE name='Deeds' AND type='table'`)
    if (!rs.length) {
        console.info('initializing Deeds')
        run(`CREATE TABLE IF NOT EXISTS Deeds (pc text KEY,
            deed text KEY, date numeric, hero text, value numeric
        )`)
    }

    rs = query(`SELECT * FROM sqlite_master WHERE name='Gangs' AND type='table'`)
    if (!rs.length) {
        console.info('initializing Gangs')
        run(`CREATE TABLE IF NOT EXISTS Gangs (
            name text PRIMARY KEY, members text, win numeric, loss numeric, banner numeric, color numeric
        )`)
        run(`INSERT INTO Gangs VALUES ( 'AB Original', 'IMA,NOB,_DM,_WOW', 0, 0, 86, 99 )`)
        run(`INSERT INTO Gangs VALUES ( 'Monster Mash', '_MM1,_MM2,_MM3,_MM4', 0, 0, 0, 0 )`)
    }

    rs = query(`SELECT * FROM sqlite_master WHERE name='Online' AND type='table'`)
    if (!rs.length) {
        console.info('initializing Online')
        run(`CREATE TABLE IF NOT EXISTS Online (id text PRIMARY KEY, pid numeric, lockdate numeric, locktime numeric)`)
    }

    rs = query(`SELECT * FROM sqlite_master WHERE name='Rings' AND type='table'`)
    if (!rs.length) {
        console.info('initializing Rings (unique)')
        run(`CREATE TABLE IF NOT EXISTS Rings (name text PRIMARY KEY, bearer text)`)
        for (let i in Ring.unique)
            run(`INSERT INTO Rings (name,bearer) VALUES (?,'')`, true, Ring.name[Ring.unique[i]])
    }

    rs = query(`SELECT * FROM sqlite_master WHERE name='Players' AND type='table'`)
    if (!rs.length) {
        console.info('initializing Players')
        run(`CREATE TABLE IF NOT EXISTS Players (
            id text PRIMARY KEY, handle text UNIQUE NOT NULL, name text NOT NULL, email text, password text NOT NULL,
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
            spells text, poisons text, rings text, realestate text, security text,
            hull numeric, cannon numeric, ram integer, wins numeric, immortal numeric,
          	plays numeric, jl numeric, jw numeric, killed numeric, kills numeric,
            retreats numeric, steals numeric, tl numeric, tw numeric)`)
    }

    export function loadUser(user: user): boolean {

        let sql = 'SELECT * FROM Players WHERE '
        sql += (user.id) ? `id ='${user.id.toUpperCase()}'` : `handle='${user.handle}'`

        let rs = query(sql)
        if (rs.length) {
            Object.assign(user, rs[0])
            user.coin = new Coin(rs[0].coin)
            user.bank = new Coin(rs[0].bank)
            user.loan = new Coin(rs[0].loan)
            user.bounty = new Coin(rs[0].bounty)

            user.keyhints = rs[0].keyhints.split(',')

            user.poisons = []
            if (rs[0].poisons.length) {
                let vials = rs[0].poisons.split(',')
                for (let i = 0; i < vials.length; i++)
                    user.poisons[i] = +vials[i]
            }

            user.spells = []
            if (rs[0].spells.length) {
                let spells = rs[0].spells.split(',')
                for (let i = 0; i < spells.length; i++)
                    user.spells[i] = +spells[i]
            }

            user.rings = []
            if (rs[0].rings.length) {
                let rings = rs[0].rings.split(',')
                for (let i = 0; i < rings.length; i++)
                    Ring.wear(user.rings, rings[i].replace(/''/g, `'`))
            }

            return true
        }
        else {
            user.id = ''
            return false
        }
    }

    export function lock(id: string, owner = 0): boolean {
        if (owner == 1) {
            try {
                sqlite3.exec(`INSERT INTO Online (id, pid, lockdate, locktime) VALUES ('${id}', ${process.pid}, ${now().date}, ${now().time})`)
                return true
            }
            catch (err) {
                if (err.code !== 'SQLITE_CONSTRAINT_PRIMARYKEY') {
                    console.error('? unexpected error:', String(err))
                    console.error('\tSQL defect:', id)
                }
                return false
            }
        }
        else {
            let rs = query(`SELECT id FROM Online WHERE id LIKE '${id}'`)
            if (!rs.length) {
                if (owner == 2)
                    run(`INSERT INTO Online (id, pid, lockdate, locktime) VALUES ('${id.toLowerCase()}', ${process.pid}, ${now().date}, ${now().time})`)
                return true
            }
            return false
        }
    }

    export function unlock(id: string, mine = false): number {
        if (mine) return run(`DELETE FROM Online WHERE id!='${id}' AND pid=${process.pid}`).changes
        return run(`DELETE FROM Online WHERE id='${id}'`).changes
    }

    export function query(q: string, errOk = false, ...params): any {
        try {
            let cmd = sqlite3.prepare(q)
            return cmd.all(...params)
        }
        catch (err) {
            if (!errOk) {
                console.error(' ? unexpected error:', String(err))
                console.error('\tSQL defect:', q)
            }
            return []
        }
    }

    export function run(sql: string, errOk = false, ...params): Database.RunResult {
        try {
            let cmd = sqlite3.prepare(sql)
            return cmd.run(...params)
        }
        catch (err) {
            if (!errOk) {
                console.error(' ? unexpected error:', String(err))
                console.error('\tSQL defect:', sql)
            }
            return { changes: 0, lastInsertRowid: 0 }
        }
    }

    export function saveUser(user: user, insert = false) {
        let sql = insert
            ? `INSERT INTO Players
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
            , spells, poisons, realestate, rings, security
            , hull, cannon, ram, wins, immortal
            , plays, jl, jw, killed, kills
            , retreats, steals, tl, tw
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
            ,'${user.spells.toString()}', '${user.poisons.toString()}', '${user.realestate}', ?, '${user.security}'
            , ${user.hull}, ${user.cannon}, ${+user.ram}, ${user.wins}, ${user.immortal}
            , ${user.plays}, ${user.jl}, ${user.jw}, ${user.killed}, ${user.kills}
            , ${user.retreats}, ${user.steals}, ${user.tl}, ${user.tw}
            )`
            : `UPDATE Players SET
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
            spells='${user.spells.toString()}', poisons='${user.poisons.toString()}', realestate='${user.realestate}', rings=?, security='${user.security}',
            hull=${user.hull}, cannon=${user.cannon}, ram=${+user.ram}, wins=${user.wins}, immortal=${user.immortal},
            plays=${user.plays}, jl=${user.jl}, jw=${user.jw}, killed=${user.killed}, kills=${user.kills},
            retreats=${user.retreats}, steals=${user.steals}, tl=${user.tl}, tw=${user.tw}
            WHERE id='${user.id}'`

        run(sql, false, user.rings.toString())
    }
}

export = db
