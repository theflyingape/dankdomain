/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  DB authored by: Robert Hurst <theflyingape@gmail.com>                    *
\*****************************************************************************/

import { Coin, Ring } from './items'
import { PC } from './pc'
import { reroll } from './player'
import { PATH, fs, isActive, now, titlecase } from './sys'

module db {

    const sqlite3 = require('better-sqlite3')(`${PATH}/users/dankdomain.sql`, { timeout: 10000 })
    sqlite3.pragma('journal_mode = WAL')

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

    export function loadUser(rpc: active | user): boolean {
        let user: user = isActive(rpc) ? rpc.user : rpc
        let sql = 'SELECT * FROM Players WHERE '
        if (user.handle) user.handle = titlecase(user.handle)
        sql += (user.id) ? `id = '${user.id.toUpperCase()}'` : `handle = '${user.handle}'`

        let rs = db.query(sql)
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

            if (isActive(rpc)) PC.activate(rpc)

            //  restore NPC to static state
            if (user.id[0] == '_' && user.id !== "_SYS") {
                let npc = <user>{ id: user.id }
                try {
                    const js = JSON.parse(fs.readFileSync(`${PATH}/user/${{ "_BAR": "barkeep", "_DM": "merchant", "_NEP": "neptune", "_OLD": "seahag", "_TAX": "taxman", "_WOW": "witch" }[npc.id]}.json`).toString())
                    if (js) {
                        Object.assign(npc, js)
                        Object.assign(user, npc)
                        reroll(user, user.pc, user.level)
                        Object.assign(user, npc)
                        PC.saveUser(user)
                    }
                }
                catch (err) { }
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
                    console.error(`?Unexpected error: ${String(err)}`)
                    console.error(`\tSQL defect - ${err.code}`)
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
                console.error(`?Unexpected error: ${String(err)}`)
                console.error(`\tSQL defect - ${err.code}`)
            }
            return []
        }
    }

    export function run(sql: string, errOk = false, ...params): { changes: number, lastInsertROWID: number } {
        try {
            let cmd = sqlite3.prepare(sql)
            return cmd.run(...params)
        }
        catch (err) {
            if (!errOk) {
                console.error(`?Unexpected error: ${String(err)}`)
                console.error(`\tSQL defect - ${err.code}`)
            }
            return { changes: 0, lastInsertROWID: 0 }
        }
    }
}

export = db
