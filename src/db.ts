/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  DB authored by: Robert Hurst <theflyingape@gmail.com>                    *
\*****************************************************************************/

import { now } from './lib'
import { Ring } from './items'
import pathTo from './path'

module db {

    const DD = pathTo('users', 'dankdomain.sql')
    let sqlite3

    try {
        sqlite3 = require('better-sqlite3')(DD, { timeout: 10000 })
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
