/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  PC authored by: Robert Hurst <theflyingape@gmail.com>                    *
\*****************************************************************************/

import { beep, date2full, dice, fs, int, isActive, romanize, sprintf, titlecase, vt } from './sys'
import db = require('./db')
import $ = require('./runtime')
import { Access, Armor, Magic, Ring, Weapon } from './items'
import { armor, loadUser, weapon } from './io'

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

        activate(one: active, keep = false, confused = false): boolean {
            one.adept = one.user.wins ? 1 : 0
            one.pc = PC.card(one.user.pc)
            one.str = one.user.str
            one.int = one.user.int
            one.dex = one.user.dex
            one.cha = one.user.cha
            Abilities.forEach(ability => {
                const a = `to${titlecase(ability)}`
                let rt = one.user.blessed ? 10 : 0
                rt -= one.user.cursed ? 10 : 0
                //  iterate each ring, ability runtimes are additive
                one.user.rings.forEach(ring => {
                    rt -= Ring.power(one.user.rings, [ring], 'degrade', 'ability', ability).power * 2
                    rt -= Ring.power(one.user.rings, [ring], 'degrade', 'pc', one.user.pc).power * 3
                    rt += Ring.power([], [ring], 'upgrade', 'ability', ability).power * PC.card(one.user.pc)[a] * 2
                    rt += Ring.power([], [ring], 'upgrade', 'pc', one.user.pc).power * PC.card(one.user.pc)[a] * 3
                })
                PC.adjust(ability, rt, 0, 0, one)
            })
            one.confused = false
            if (confused) return true

            one.who = PC.who(one)
            one.altered = keep
            one.hp = one.user.hp
            one.sp = one.user.sp
            one.bp = int(one.user.hp / 10)
            one.hull = one.user.hull
            Weapon.equip(one, one.user.weapon, true)
            Armor.equip(one, one.user.armor, true)
            one.user.access = one.user.access || Object.keys(Access.name)[0]

            if (!db.lock(one.user.id, one.user.id == $.player.id ? 1 : 2) && one.user.id !== $.player.id) {
                beep()
                vt.outln(vt.cyan, vt.bright, `\n${one.user.handle} is engaged elsewhere.`)
                one.altered = false
            }
            return one.altered
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

        encounter(where = '', lo = 2, hi = 99): active {
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

        experience(level: number, factor = 1, wisdom = $.player.int): number {
            if (level < 1) return 0
            // calculate need to accrue based off PC intellect capacity
            if (wisdom < 1000) wisdom = (1100 + level - 2 * wisdom)

            return factor == 1
                ? Math.round(wisdom * Math.pow(2, level - 1))
                : int(wisdom * Math.pow(2, level - 2) / factor)
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

        portrait(rpc = $.online, effect = 'fadeInLeft', meta = '') {
            let userPNG = `door/static/images/user/${rpc.user.id}.png`
            try {
                fs.accessSync(userPNG, fs.constants.F_OK)
                userPNG = `user/${rpc.user.id}`
            } catch (e) {
                userPNG = (this.name['player'][rpc.user.pc] || this.name['immortal'][rpc.user.pc] ? 'player' : 'monster') + '/' + rpc.user.pc.toLowerCase() + (rpc.user.gender == 'F' ? '_f' : '')
            }
            vt.profile({ png: userPNG, handle: rpc.user.handle, level: rpc.user.level, pc: rpc.user.pc, effect: effect })
            vt.title(`${rpc.user.handle}: level ${rpc.user.level} ${rpc.user.pc} ${meta}`)
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

        status(profile: active) {
            vt.action('clear')
            this.portrait(profile)

            const line = '------------------------------------------------------'
            const space = '                                                      '
            const sex = profile.user.sex == 'I' ? profile.user.gender : profile.user.sex
            var i: number
            var n: number

            i = 22 - profile.user.handle.length
            n = 11 + i / 2
            vt.cls()
            vt.out(vt.blue, '+', vt.faint, line.slice(0, n), vt.normal, '=:))')
            vt.out(vt.Blue, vt.yellow, vt.bright, ' ', profile.user.handle, ' ', vt.reset)
            n = 11 + i / 2 + i % 2
            vt.outln(vt.blue, '((:=', vt.faint, line.slice(0, n), vt.normal, '+')

            i = 30 - Access.name[profile.user.access][sex].length
            n = 11 + i / 2
            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.white, vt.normal, space.slice(0, n))
            vt.out('"', Access.name[profile.user.access][sex], '"')
            n = 11 + i / 2 + i % 2
            vt.outln(vt.blue, space.slice(0, n), vt.reset, vt.blue, vt.faint, '|')

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('    Title: ', vt.white)
            if ($.player.emulation == 'XT') vt.out('\r\x1B[2C', Access.name[profile.user.access].emoji, '\r\x1B[12C')
            vt.out(sprintf('%-20s', profile.user.access))
            vt.out(vt.cyan, ' Born: ', vt.white, date2full(profile.user.dob))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('    Class: ', vt.white)
            if ($.player.emulation == 'XT' && profile.user.wins > 0) vt.out('\r\x1B[2C🎖️\r\x1B[12C')
            vt.out(sprintf('%-21s', profile.user.pc + ' (' + profile.user.gender + ')'))
            vt.out(vt.cyan, ' Exp: ', vt.white)
            if (profile.user.xp < 1e+8)
                vt.out(sprintf('%-15f', profile.user.xp))
            else
                vt.out(sprintf('%-15.7e', profile.user.xp))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out(' Immortal: ', vt.white)
            vt.out(sprintf('%-20s', (profile.user.wins ? `${romanize(profile.user.wins)}.` : '')
                + profile.user.immortal + '.' + profile.user.level + ` (${profile.user.calls})`))
            vt.out(vt.cyan, ' Need: ', vt.white)
            if (this.experience(profile.user.level, undefined, profile.user.int) < 1e+8)
                vt.out(sprintf('%-15f', this.experience(profile.user.level, undefined, profile.user.int)))
            else
                vt.out(sprintf('%-15.7e', this.experience(profile.user.level, undefined, profile.user.int)))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('      Str: ', vt.white)
            if ($.player.emulation == 'XT') vt.out('\r\x1B[2C💪\r\x1B[12C')
            vt.out(sprintf('%-20s', profile.str + ' (' + profile.user.str + ',' + profile.user.maxstr + ')'))
            vt.out(vt.cyan, ' Hand: ', profile.user.coin.carry(), ' '.repeat(15 - profile.user.coin.amount.length))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('      Int: ', vt.white)
            vt.out(sprintf('%-20s', profile.int + ' (' + profile.user.int + ',' + profile.user.maxint + ')'))
            vt.out(vt.cyan, ' Bank: ', profile.user.bank.carry(), ' '.repeat(15 - profile.user.bank.amount.length))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('      Dex: ', vt.white)
            vt.out(sprintf('%-20s', profile.dex + ' (' + profile.user.dex + ',' + profile.user.maxdex + ')'))
            vt.out(vt.cyan, ' Loan: ', profile.user.loan.carry(), ' '.repeat(15 - profile.user.loan.amount.length))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('      Cha: ', vt.white)
            vt.out(sprintf('%-19s', profile.cha + ' (' + profile.user.cha + ',' + profile.user.maxcha + ')'))
            vt.out(vt.faint, ' Steal: ', vt.normal)
            vt.out(sprintf('%-15s', ['lawful', 'desperate', 'trickster', 'adept', 'master'][profile.user.steal]))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            if (profile.user.blessed) {
                let who: user = { id: profile.user.blessed }
                if (!loadUser(who)) {
                    if (profile.user.blessed == 'well')
                        who.handle = 'a wishing well'
                    else
                        who.handle = profile.user.blessed
                }
                vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.yellow, vt.bright)
                vt.out(' +Blessed:', vt.white, vt.normal, ' by ', sprintf('%-39s', who.handle))
                vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
            }

            if (profile.user.cursed) {
                let who: user = { id: profile.user.cursed }
                if (!loadUser(who)) {
                    if (profile.user.cursed == 'wiz!')
                        who.handle = 'a doppelganger!'
                    else
                        who.handle = profile.user.cursed
                }
                vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.white)
                vt.out('  -Cursed:', vt.normal, ' by ', sprintf('%-39s', who.handle))
                vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
            }

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('       HP: ', vt.white)
            if ($.player.emulation == 'XT') vt.out('\r\x1B[2C🌡️\r\x1B[12C')
            vt.out(sprintf('%-42s', profile.hp + '/' + profile.user.hp + ' ('
                + ['weak', 'normal', 'adept', 'warrior', 'brute', 'hero'][profile.user.melee] + ', '
                + ['a rare', 'occasional', 'deliberate', 'angry', 'murderous'][profile.user.backstab] + ' backstab)'))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            if (profile.user.magic > 1) {
                vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.magenta, vt.bright)
                vt.out('       SP: ', vt.white)
                vt.out(sprintf('%-42s', profile.sp + '/' + profile.user.sp + ' (' + ['wizardry', 'arcane', 'divine'][profile.user.magic - 2] + ')'))
                vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
            }

            if (profile.user.spells.length) {
                vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.magenta, vt.bright)
                vt.out(sprintf(' %8s: ', ['Wands', 'Wands', 'Scrolls', 'Spells', 'Magus'][profile.user.magic]), vt.white)
                let text = ''
                n = 0
                for (let p = 0; p < profile.user.spells.length; p++) {
                    let spell = profile.user.spells[p]
                    let name = Magic.pick(spell)
                    if (spell < 5 || (spell < 17 && name.length > 7)) name = name.slice(0, 3)
                    if (text.length + name.length > 40) break
                    if (text.length) text += ','
                    text += name
                    n++
                }
                vt.out(sprintf('%-42s', text))
                vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
                while (n < profile.user.spells.length) {
                    text = ''
                    i = 0
                    vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.white, vt.bright, '           ')
                    for (let p = 0; p < profile.user.spells.length; p++) {
                        i++
                        if (i > n) {
                            let spell = profile.user.spells[p]
                            let name = Magic.pick(spell)
                            if (spell < 17 && name.length > 7) name = name.slice(0, 3)
                            if (text.length + name.length > 40) break
                            if (text.length) text += ','
                            text += name
                            n++
                        }
                    }
                    vt.out(sprintf('%-42s', text))
                    vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
                }
            }

            if (profile.user.rings.length) {
                vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.magenta, vt.bright)
                vt.out('    Rings: ', vt.white)
                if ($.player.emulation == 'XT') vt.out('\r\x1B[2C💍\r\x1B[12C')
                let text = ''
                n = 0
                for (let p = 0; p < profile.user.rings.length; p++) {
                    let name = profile.user.rings[p]
                    if (text.length + name.length > 40) break
                    if (text.length) text += ','
                    text += name
                    n++
                }
                vt.out(sprintf('%-42s', text))
                vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
                while (n < profile.user.rings.length) {
                    text = ''
                    i = 0
                    vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.white, vt.bright, '           ')
                    for (let p = 0; p < profile.user.rings.length; p++) {
                        i++
                        if (i > n) {
                            let name = profile.user.rings[p]
                            if (text.length + name.length > 40) break
                            if (text.length) text += ','
                            text += name
                            n++
                        }
                    }
                    vt.out(sprintf('%-42s', text))
                    vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
                }
            }

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.white)
            vt.out('  Alchemy: ', vt.normal)
            vt.out(sprintf('%-42s', ['banned', 'apprentice', 'expert (+1x,+1x)', 'artisan (+1x,+2x)', 'master (+2x,+2x)'][profile.user.poison]))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            if (profile.user.poisons.length) {
                vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.white)
                vt.out(sprintf(' %8s: ', ['Vial', 'Toxin', 'Poison', 'Bane', 'Venena'][profile.user.poison]), vt.normal)
                if ($.player.emulation == 'XT') vt.out('\r\x1B[2C🧪\r\x1B[12C')
                vt.out(sprintf('%-42s', profile.user.poisons.toString()))
                vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
            }

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('   Weapon: ')
            if ($.player.emulation == 'XT') vt.out('\r\x1B[2C🗡️\r\x1B[12C')
            vt.out(weapon(profile), ' '.repeat(42 - weapon(profile, true).length))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('    Armor: ')
            if ($.player.emulation == 'XT') vt.out('\r\x1B[2C🛡\r\x1B[12C')
            vt.out(armor(profile), ' '.repeat(42 - armor(profile, true).length))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out(' Lives in: ', vt.white)
            vt.out(sprintf('%-42s', profile.user.realestate + ' (' + profile.user.security + ')'))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            if (profile.user.gang) {
                vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
                vt.out('    Party: ', vt.white)
                if ($.player.emulation == 'XT') vt.out('\r\x1B[2C🏴\r\x1B[12C')
                vt.out(sprintf('%-42s', profile.user.gang))
                vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
            }

            if (+profile.user.hull) {
                vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
                vt.out('  Warship: ', vt.white)
                vt.out(sprintf('%-18s', profile.hull.toString() + ':' + profile.user.hull.toString()))
                vt.out(vt.cyan, ' Cannon: ', vt.white)
                vt.out(sprintf('%-15s', profile.user.cannon.toString() + ':' + (profile.user.hull / 50).toString() + (profile.user.ram ? ' (RAM)' : '')))
                vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
            }

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out(' Brawling: ', vt.white)
            vt.out(sprintf('%-19s', profile.user.tw + ':' + profile.user.tl))
            vt.out(vt.cyan, 'Steals: ', vt.white)
            vt.out(sprintf('%-15s', profile.user.steals))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out(' Jousting: ', vt.white)
            vt.out(sprintf('%-20s', profile.user.jw + ':' + profile.user.jl + ` (${this.jousting(profile)})`))
            vt.out(vt.cyan, 'Plays: ', vt.white)
            vt.out(sprintf('%-15s', profile.user.plays))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('    Kills: ', vt.white)
            if ($.player.emulation == 'XT') vt.out('\r\x1B[2C💀\r\x1B[12C')
            vt.out(sprintf('%-42s', profile.user.kills + ' with ' + profile.user.retreats + ' retreats and killed ' + profile.user.killed + 'x'))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            vt.outln(vt.blue, '+', vt.faint, line, vt.normal, '+')
        }

        what(rpc: active, action: string): string {
            return action + (rpc !== $.online ? (/.*ch$|.*sh$|.*s$|.*z$/i.test(action) ? 'es ' : 's ') : ' ')
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
