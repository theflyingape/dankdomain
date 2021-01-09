/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  PC authored by: Robert Hurst <theflyingape@gmail.com>                    *
\*****************************************************************************/

import { dice, fs, int, isActive, titlecase } from './sys'
import db = require('./db')
import $ = require('./runtime')
import { Ring } from './items'

module pc {

    export const Abilities: ABILITY[] = ['str', 'int', 'dex', 'cha']

    class _pc {

        name: character[]
        types: number
        classes: { key?: string, value?: number }[]
        total: number
        winning: string

        constructor() {
            this.name = require(`./etc/dankdomain.json`)
            this.types = Object.keys(this.name).length
            this.classes = new Array()
            this.total = 0
            for (let type in this.name) {
                let i = Object.keys(this.name[type]).length
                this.classes.push({ key: type, value: i })
                this.total += i
                if (type == 'immortal')
                    for (let dd in this.name[type])
                        this.winning = dd
            }
        }

        ability(current: number, delta: number, max = 100, mod = 0): number {
            let ability = current
            max = max + mod
            max = max > 100 ? 100 : max < 20 ? 20 : max
            ability += delta
            ability = ability > max ? max : ability < 20 ? 20 : ability
            return ability
        }

        adjust(ability: ABILITY, rt = 0, pc = 0, max = 0, rpc = $.online) {
            if (max) {
                rpc.user[`max${ability}`] = this.ability(rpc.user[`max${ability}`], max, 99)
                rpc.altered = true
            }
            if (pc) {
                rpc.user[ability] = this.ability(rpc.user[ability], pc, rpc.user[`max${ability}`])
                rpc.altered = true
            }
            const a = `to${titlecase(ability)}`
            let mod = rpc.user.blessed ? 10 : 0
            mod -= rpc.user.cursed ? 10 : 0
            //  iterate each ring, ability mods are additive
            rpc.user.rings.forEach(ring => {
                mod -= Ring.power(rpc.user.rings, [ring], 'degrade', 'ability', ability).power * 2
                mod -= Ring.power(rpc.user.rings, [ring], 'degrade', 'pc', rpc.user.pc).power * 3
                mod += Ring.power([], [ring], 'upgrade', 'ability', ability).power * this.card(rpc.user.pc)[a] * 2
                mod += Ring.power([], [ring], 'upgrade', 'pc', rpc.user.pc).power * this.card(rpc.user.pc)[a] * 3
            })
            if (rt > 100) {
                mod++
                rt %= 100
            }
            rpc[ability] = this.ability(rpc[ability], rt, rpc.user[`max${ability}`], mod)
        }

        card(dd = 'Spirit'): character {
            let rpc = <character>{}
            for (let type in this.name) {
                if (this.name[type][dd]) {
                    rpc = this.name[type][dd]
                    break
                }
            }
            return rpc
        }

        hp(user = $.player): number {
            return Math.round(user.level + dice(user.level) + user.str / 10)
        }

        jousting(rpc: active): number {
            return Math.round(rpc.dex * rpc.user.level / 10 + 2 * rpc.user.jw - rpc.user.jl + 10)
        }

        loadGang(rs: any): gang {
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

            for (let n = 0; n < 4 && n < gang.members.length; n++) {
                let who = db.query(`SELECT handle,gender,melee,status,gang FROM Players WHERE id='${gang.members[n]}'`)
                if (who.length) {
                    gang.handles.push(who[0].handle)
                    gang.genders.push(who[0].gender)
                    gang.melee.push(who[0].melee)
                    if (gang.members[n] !== $.player.id && !who[0].status && !db.lock(gang.members[n]))
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

        newkeys(user: user) {
            let keys = ['P', 'G', 'S', 'C']
            let prior = user.keyhints || []
            user.keyhints = ['', '', '', '', '', '', '', '', '', '', '', '', ...prior.slice(12)]
            user.keyseq = ''
            while (keys.length) {
                let k = dice(keys.length)
                user.keyseq += keys.splice(k - 1, 1)
            }
        }

        random(type?: string): string {
            let pc: string = ''
            if (type) {
                let i = dice(Object.keys(this.name[type]).length)
                let n = i
                for (let dd in this.name[type])
                    if (!--n) {
                        pc = dd
                        break
                    }
            }
            else {
                let i = dice(this.total - 2)    //  less Spirit and Novice
                let n = i + 2
                for (type in this.name) {
                    for (let dd in this.name[type])
                        if (!--n) {
                            pc = dd
                            break
                        }
                    if (!n) break
                }
            }
            return pc
        }

        saveGang(g: gang, insert = false) {
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

        saveUser(rpc: active | user, insert = false, locked = false) {

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

        sp(user = $.player): number {
            return user.magic > 1 ? Math.round(user.level + dice(user.level) + user.int / 10) : 0
        }

        who(pc: active | user, mob = false): who {
            let user: user = isActive(pc) ? pc.user : pc
            const gender = pc === $.online ? 'U' : user.gender
            const Handle = `${gender == 'I' && $.from !== 'Party' ? 'The ' : ''}${user.handle}`
            const handle = `${gender == 'I' && $.from !== 'Party' ? 'the ' : ''}${user.handle}`
            //  if there are multiple PCs engaged on a side (mob), replace pronouns for clarification
            return {
                He: `${{ M: mob ? Handle : 'He', F: mob ? Handle : 'She', I: mob ? Handle : 'It', U: 'You' }[gender]} `,
                he: `${{ M: 'he', F: 'she', I: 'it', U: 'you' }[gender]} `,
                him: `${{ M: mob ? handle : 'him', F: mob ? handle : 'her', I: mob ? handle : 'it', U: 'you' }[gender]} `,
                His: `${{
                    M: mob ? Handle + `'` + (Handle.substr(-1) !== 's' ? 's' : '') : 'His'
                    , F: mob ? Handle + `'` + (Handle.substr(-1) !== 's' ? 's' : '') : 'Her'
                    , I: mob ? Handle + `'` + (Handle.substr(-1) !== 's' ? 's' : '') : 'Its', U: 'Your'
                }[gender]} `,
                his: `${{
                    M: mob ? handle + `'` + (handle.substr(-1) !== 's' ? 's' : '') : 'his'
                    , F: mob ? handle + `'` + (handle.substr(-1) !== 's' ? 's' : '') : 'her'
                    , I: mob ? handle + `'` + (handle.substr(-1) !== 's' ? 's' : '') : 'its', U: 'your'
                }[gender]} `,
                self: `${{ M: 'him', F: 'her', I: 'it', U: 'your' }[gender]}self `,
                You: `${{ M: Handle, F: Handle, I: Handle, U: 'You' }[gender]} `,
                you: `${{ M: handle, F: handle, I: handle, U: 'you' }[gender]}`
            }
        }
    }

    export const PC = new _pc
}

export = pc
