/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  IO authored by: Robert Hurst <theflyingape@gmail.com>                    *
\*****************************************************************************/

import db = require('./db')
import { int, isActive, now, pathTo } from './lib'
import { Ring } from './items'
import { Deed, Coin, PC } from './pc'
import { titlecase, fs } from './sys'

module io {

    export function loadDeed(pc: string, what?: string): deed[] {

        let deed = []
        let sql = `SELECT * FROM Deeds WHERE pc='${pc}'`
        if (what) sql += ` AND deed='${what}'`
        let rs = db.query(sql)

        if (rs.length) {
            for (let i = 0; i < rs.length; i++)
                deed.push({
                    pc: rs[i].pc,
                    deed: rs[i].deed,
                    date: rs[i].date,
                    hero: rs[i].hero,
                    value: rs[i].value
                })
        }
        else if (what) {
            let start = 0
            if (Deed.name[what]) start = Deed.name[what].starting
            db.run(`INSERT INTO Deeds VALUES ('${pc}', '${what}', ${now().date}, 'Nobody', ${start})`)
            deed = this.load(pc, what)
        }

        return deed
    }

    export function loadGang(rs: any, me = ''): gang {
        let gang: gang = {
            name: rs.name,
            members: rs.members.split(','),
            handles: [],
            genders: [],
            melee: [],
            status: [],
            validated: [],
            win: rs.win,
            loss: rs.loss,
            banner: int(rs.banner / 16),
            trim: rs.banner % 8,
            back: int(rs.color / 16),
            fore: rs.color % 8
        }

        for (let n in gang.members) {
            let who = db.query(`SELECT handle,gender,melee,status,gang FROM Players WHERE id='${gang.members[n]}'`)
            if (who.length) {
                gang.handles.push(who[0].handle)
                gang.genders.push(who[0].gender)
                gang.melee.push(who[0].melee)
                if (gang.members[n] !== me && !who[0].status && !db.lock(gang.members[n]))
                    who[0].status = 'locked'
                gang.status.push(who[0].status)
                gang.validated.push(who[0].gang ? who[0].gang == rs.name : undefined)
            }
            else if (gang.members[n][0] == '_') {
                gang.handles.push('')
                gang.genders.push('I')
                gang.melee.push(0)
                gang.status.push('')
                gang.validated.push(true)
            }
            else {
                gang.handles.push(`?unknown ${gang.members[n]}`)
                gang.genders.push('M')
                gang.melee.push(3)
                gang.status.push('?')
                gang.validated.push(false)
            }
        }

        return gang
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
                    const js = JSON.parse(fs.readFileSync(`${pathTo('users', { "_BAR": "barkeep", "_DM": "merchant", "_NEP": "neptune", "_OLD": "seahag", "_TAX": "taxman", "_WOW": "witch" }[npc.id] + '.json')}`).toString())
                    if (js) {
                        Object.assign(npc, js)
                        Object.assign(user, npc)
                        PC.reroll(user, user.pc, user.level)
                        Object.assign(user, npc)
                        saveUser(user)
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

    export function saveDeed(deed: deed, player: user) {
        if (!player.novice) {
            deed.date = now().date
            deed.hero = player.handle
            db.run(`UPDATE Deeds SET date=${deed.date},hero='${deed.hero}', value=${deed.value} WHERE pc='${deed.pc}' AND deed='${deed.deed}'`)
        }
    }

    export function saveGang(g: gang, insert = false) {
        if (insert) {
            try {
                db.run(`INSERT INTO Gangs (name,members,win,loss,banner,color)
                        VALUES ('${g.name}', '${g.members.join()}', ${g.win}, ${g.loss},
                        ${(g.banner << 4) + g.trim}, ${(g.back << 4) + g.fore})`)
            }
            catch (err) {
                if (err.code !== 'SQLITE_CONSTRAINT_PRIMARYKEY') {
                    console.log(`?Unexpected error: ${String(err)}`)
                }
            }
        }
        else {
            if (g.members.length > 4) g.members.splice(0, 4)
            db.run(`UPDATE Gangs
                    SET members='${g.members.join()}',win=${g.win},loss=${g.loss},
                        banner=${(g.banner << 4) + g.trim},color=${(g.back << 4) + g.fore}
                        WHERE name = '${g.name}'`)
        }
    }

    export function saveRing(name: string, bearer = '', rings?: string[]) {
        let theRing = { name: name, bearer: bearer[0] == '_' ? '' : bearer }

        //  record active bearer to maintain as a rare 'ring of power'
        if (Ring.name[name].unique) {
            db.run(`UPDATE Rings SET bearer='${theRing.bearer}' WHERE name=?`, false, name)
        }
        if (theRing.bearer.length && rings) {
            db.run(`UPDATE Players SET rings=? WHERE id=?`, false, rings.toString(), theRing.bearer)
        }
    }

    export function saveUser(rpc: active | user, insert = false, locked = false) {

        let user: user = isActive(rpc) ? rpc.user : rpc

        if (!user.id) return
        if (insert || locked || user.id[0] == '_') {
            let save = { coin: "", bank: "", loan: "", bounty: "" }
            let trace = `./users/.${user.id}.json`
            Object.assign(save, user)
            save.coin = user.coin.carry(4, true)
            save.bank = user.bank.carry(4, true)
            save.loan = user.loan.carry(4, true)
            save.bounty = user.bounty.carry(4, true)
            fs.writeFileSync(trace, JSON.stringify(save, null, 2))
        }

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
        db.run(sql, false, user.rings.toString())

        if (isActive(rpc)) rpc.altered = false
        if (locked) db.unlock(user.id.toLowerCase())
    }
}

export = io
