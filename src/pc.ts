/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  PC authored by: Robert Hurst <theflyingape@gmail.com>                    *
\*****************************************************************************/

import $ = require('./play/runtime')
import db = require('./db')
import { Access, Armor, Magic, Ring, Weapon } from './items'
import { armor, carry, log, news, vt, weapon } from './lib'
import { date2full, dice, fs, int, now, pathTo, romanize, sprintf, titlecase, uint, whole } from './sys'

module pc {

    export const Abilities: ABILITY[] = ['str', 'int', 'dex', 'cha']

    class _deed {

        name: deeds[]

        constructor() {
            this.name = require(pathTo('files/library', 'deed.json'))
        }

        //  coveted
        get key(): {} {
            const oldkey = '🗝️ '
            return vt.emulation == 'XT'
                ? {
                    P: vt.attr(oldkey, vt.lWhite, vt.Magenta, ' Platinum ', vt.reset),
                    G: vt.attr(oldkey, vt.black, vt.Yellow, ' = Gold = ', vt.reset),
                    S: vt.attr(oldkey, vt.lWhite, vt.Cyan, '- Silver -', vt.reset),
                    C: vt.attr(oldkey, vt.black, vt.Red, vt.Empty, ' Copper ', vt.Empty, vt.reset)
                } : {
                    P: vt.attr(vt.off, vt.magenta, vt.bright, vt.reverse, ' Platinum ', vt.reset),
                    G: vt.attr(vt.off, vt.yellow, vt.bright, vt.reverse, ' = Gold = ', vt.reset),
                    S: vt.attr(vt.off, vt.cyan, vt.bright, vt.reverse, '- Silver -', vt.reset),
                    C: vt.attr(vt.off, vt.red, vt.bright, vt.reverse, vt.Empty, ' Copper ', vt.Empty, vt.reset)
                }
        }

        load(pc: string, what?: string): deed[] {
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
                deed = Deed.load(pc, what)
            }

            return deed
        }

        //  returns 2-character width
        get medal(): string[] {
            return vt.emulation == 'XT'
                ? ['  ', '🥇', '🥈', '🥉']
                : ['  ',
                    vt.attr(vt.bright, vt.reverse, '1', vt.noreverse, vt.normal, ' '),
                    vt.attr(vt.normal, vt.reverse, '2', vt.noreverse, ' '),
                    vt.attr(vt.faint, vt.reverse, '3', vt.noreverse, vt.normal, ' ')
                ]
        }

        save(deed: deed, player: user) {
            if (!player.novice) {
                deed.date = now().date
                deed.hero = player.handle
                db.run(`UPDATE Deeds SET date=${deed.date},hero='${deed.hero}', value=${deed.value} WHERE pc='${deed.pc}' AND deed='${deed.deed}'`)
            }
        }
    }

    class _pc {

        name: character[]
        types: number
        classes: { key?: string, value?: number }[]
        total: number
        winning: string

        constructor() {
            this.name = require(pathTo('pcs', 'class.json'))
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

        activate(one = $.online, keep = false, confused = false): boolean {
            if (one == $.online) $.online.user = $.player
            one.adept = one.user.wins ? 1 : 0
            one.pc = this.card(one.user.pc)
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
                    rt += Ring.power([], [ring], 'upgrade', 'ability', ability).power * this.card(one.user.pc)[a] * 2
                    rt += Ring.power([], [ring], 'upgrade', 'pc', one.user.pc).power * this.card(one.user.pc)[a] * 3
                })
                this.adjust(ability, rt, 0, 0, one)
            })
            one.confused = false
            if (confused) return true

            one.who = this.who(one)
            one.hp = one.user.hp
            one.sp = one.user.sp
            one.bp = int(one.user.hp / 10)
            one.hull = one.user.hull
            Weapon.equip(one, one.user.weapon, true)
            Armor.equip(one, one.user.armor, true)
            one.user.access = one.user.access || Object.keys(Access.name)[0]

            one.altered = one.altered || keep
            if (keep && !db.lock(one.user.id, one.user.id == $.player.id ? 1 : 2) && one.user.id !== $.player.id) {
                vt.beep()
                vt.outln()
                vt.outln(vt.cyan, vt.bright, `${one.user.handle} is engaged elsewhere.`)
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

        bless(from: string, via: string, onto = $.online) {
            if (onto == $.online) {
                vt.sound('shimmer')
                this.adjust('str', 110)
                this.adjust('int', 110)
                this.adjust('dex', 110)
                this.adjust('cha', 110)
                if (onto.user.cursed) {
                    vt.outln('The ', vt.faint, 'dark cloud', vt.normal, ' has left you.', -1000)
                    news(`\tlifted curse`)
                }
                else {
                    onto.user.blessed = from
                    onto.user.coward = false
                    vt.outln(vt.yellow, 'You feel ', -400,
                        vt.bright, 'a shining aura', -500,
                        vt.normal, ' surround you.', -600)
                    news(`\t${onto.user.handle} ${via}`)
                }
            }
            else {
                if (!onto.user.cursed) onto.user.blessed = from
            }
            onto.altered = true
            onto.user.cursed = ''
        }

        card(dd: string): character {
            let rpc = <character>{}
            for (let type in this.name) {
                if (this.name[type][dd]) {
                    rpc = this.name[type][dd]
                    break
                }
            }
            return rpc
        }

        curse(from: string, via: string, onto = $.online) {
            if (onto == $.online) {
                vt.sound('crack')
                this.adjust('str', -10)
                this.adjust('int', -10)
                this.adjust('dex', -10)
                this.adjust('cha', -10)
                if (onto.user.blessed) {
                    vt.outln('Your ', vt.yellow, vt.bright, 'shining aura ', -400,
                        vt.reset, 'fades ', -500,
                        vt.faint, 'away.', -600)
                }
                else {
                    onto.user.cursed = from
                    vt.outln(vt.magenta, vt.bright, from, -400,
                        vt.normal, ' curses you ', -500,
                        vt.faint, `${via}!`, -600)
                    news(`\tdropped a curse onto ${onto.user.handle} ${via}`)
                }
            }
            else {
                if (from == $.player.handle) {
                    this.adjust('cha', -1, -1, -1)
                    if (($.player.gang && onto.user.gang == $.player.gang) || onto.user.id == $.ruler.id) {
                        this.adjust('cha', -1, -1, -1, onto)
                        $.player.coward = true
                        vt.sound('boom')
                    }
                }
                else
                    vt.sound('morph')
                if (onto.user.blessed) {
                    log(onto.user.id, `\n${from} vanquished your blessing ${via}!`)
                    vt.outln(onto.who.His, vt.yellow, vt.bright, 'shining aura', -400,
                        vt.reset, ' fades ', -500,
                        vt.faint, 'away.', -600)
                }
                else {
                    onto.user.cursed = from
                    log(onto.user.id, `\n${from} cursed you ${via}!`)
                    news(`\t${from} cursed ${onto.user.handle} ${via}`)
                    vt.outln('A ', vt.faint, 'dark cloud', vt.normal, ` hovers over ${onto.who.him}.`, -1200)
                }
            }
            onto.altered = true
            onto.user.coward = false
            onto.user.blessed = ''
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
                this.load(rpc)
            }
            return rpc
        }

        experience(level: number, factor = 1, wisdom = $.player.int): number {
            if (level < 1) return 0
            // calculate need to accrue based off PC intellect capacity
            if (wisdom < 1000) wisdom = (1100 + level - 2 * wisdom)

            return uint(factor == 1
                ? Math.round(wisdom * Math.pow(2, level - 1))
                : wisdom * Math.pow(2, level - 2) / factor
            )
        }

        expout(xp: number, awarded = true): string {
            const gain = int(100 * xp / (this.experience($.player.level) - this.experience($.player.level - 1)))
            let out = (xp < 1e+8 ? xp.toString() : sprintf('%.4e', xp)) + ' '
            if (awarded && gain && $.online.int >= 90) {
                out += vt.attr(vt.off, vt.faint, '(', vt.bright
                    , gain < 4 ? vt.black : gain < 10 ? vt.red : gain < 40 ? vt.yellow
                        : gain < 80 ? vt.green : gain < 130 ? vt.cyan : gain < 400 ? vt.blue
                            : vt.magenta, sprintf('%+d', gain)
                    , gain > 3 ? vt.normal : '', '%', vt.faint, vt.white, ') ', vt.reset)
            }
            out += 'experience'
            if (awarded) out += '.'
            return out
        }

        hp(user = $.player): number {
            return Math.round(user.level + dice(user.level + user.melee) + user.str / 10)
        }

        jousting(rpc: active): number {
            return Math.round(rpc.dex * rpc.user.level / 10 + 2 * rpc.user.jw - rpc.user.jl + 10)
        }

        keyhint(rpc = $.online, echo = true) {
            let i: number
            let open = []
            let slot: number

            for (let i in rpc.user.keyhints)
                if (+i < 12 && !rpc.user.keyhints[i]) open.push(i)
            if (open.length) {
                do {
                    i = open[dice(open.length) - 1]
                    slot = int(i / 3)
                    let key = ['P', 'G', 'S', 'C'][dice(4) - 1]
                    if (key !== rpc.user.keyseq[slot]) {
                        for (let n = 3 * slot; n < 3 * (slot + 1); n++)
                            if (key == rpc.user.keyhints[n])
                                key = ''
                        if (key) rpc.user.keyhints[i] = key
                    }
                } while (!rpc.user.keyhints[i])

                if (rpc === $.online && echo)
                    vt.outln('Key #', vt.bright, `${slot + 1}`, vt.normal, ' is not ', Deed.key[$.player.keyhints[i]])
            }
            else
                vt.outln(vt.reset, 'There are no more key hints available to you.')

            rpc.altered = true
        }

        load(rpc: active | user): boolean {
            let user: user = 'user' in rpc ? rpc.user : rpc
            if (user.handle) user.handle = titlecase(user.handle)
            if (db.loadUser(user)) {
                if ('user' in rpc) this.activate(rpc)
                //  restore NPC with static fields
                if (user.id[0] == '_') {
                    let npc = db.fillUser(NPC[user.id], user)
                    db.saveUser(npc)
                }
                return true
            }
            return false
        }

        loadGang(rs: any, me = ''): gang {
            let gang: gang = {
                name: rs.name,
                members: rs.members ? rs.members.split(',') : '',
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

        money(level = $.player.level): bigint {
            return whole(Math.pow(2, (level - 1) / 2) * 10 * (101 - level) / 100)
        }

        nautic(ship = $.player.hull): bigint {
            return whole(Math.round(Math.pow(2, ship / 150) * 7937))
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

        payment(amount: bigint, user = $.player) {
            let due = user.coin.value - amount
            user.coin.value = due
            if (due < 0) {
                due += user.bank.value
                user.bank.value = due
                if (due < 0) user.loan.value -= due
            }
            vt.sound('click', 5)
        }

        portrait(rpc = $.online, effect = 'fadeInLeft', meta = '') {
            let userPNG = `portal/static/images/user/${rpc.user.id}.png`
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

        //  morph or spawn or a user re-roll
        reroll(user: user, pc?: string, level = 1): user {
            level = uint(level, 1)
            level = level > 99 ? 99 : level
            //  reset any prior experience
            user = db.fillUser('reset', user)
            //  reset to starting PC and base assets
            if (level == 1 || !user.id || user.id[0] == '_') {
                user = db.fillUser('reroll', user)
                user.gender = user.sex
            }
            //  assign & fetch the playing class
            if (pc) user.pc = pc
            const rpc = this.card(user.pc)
            //  apply character class attributes
            user = db.fillUser(user.pc, user)
            user.level = level
            if (user.level > 1) user.xp = this.experience(user.level - 1, 1, user.int)
            if (!user.xplevel || user.xplevel > user.level) user.xplevel = user.level
            if (!user.keyseq) this.newkeys(user)
            //  level up
            for (let n = 2; n <= level; n++) {
                user.level = n
                if (user.level == 50 && user.gender !== 'I' && user.id[0] !== '_' && !user.novice) {
                    vt.out(vt.off, vt.yellow, vt.bright, '+', vt.reset, ' Bonus ', vt.faint)
                    let d: number
                    do {
                        d = dice(10) - 1
                        switch (d) {
                            case 0:
                                if (user.maxstr < 91 && user.maxint < 91 && user.maxdex < 91 && user.maxcha < 91) break
                            case 1:
                                if (user.maxstr < 80) break
                            case 2:
                                if (user.maxint < 80) break
                            case 3:
                                if (user.maxdex < 80) break
                            case 4:
                                if (user.maxcha < 80) break
                            case 5:
                                if (user.melee < 3) break
                            case 6:
                                if (user.backstab < 3) break
                            case 7:
                                if (user.poison < 3) break
                            case 8:
                                if (user.magic < 2 || user.melee > 2) break
                            case 9:
                                if (user.steal < 4) break
                                d = -1
                        }
                    } while (d < 0)

                    switch (d) {
                        case 0:
                            vt.out('Ability')
                            if ((user.maxstr += 3) > 99) user.maxstr = 99
                            if ((user.maxint += 3) > 99) user.maxint = 99
                            if ((user.maxdex += 3) > 99) user.maxdex = 99
                            if ((user.maxcha += 3) > 99) user.maxcha = 99
                            break
                        case 1:
                            vt.out('Strength')
                            if ((user.maxstr += 10) > 99) user.maxstr = 99
                            break
                        case 2:
                            vt.out('Intellect')
                            if ((user.maxint += 10) > 99) user.maxint = 99
                            break
                        case 3:
                            vt.out('Dexterity')
                            if ((user.maxdex += 10) > 99) user.maxdex = 99
                            break
                        case 4:
                            vt.out('Charisma')
                            if ((user.maxcha += 10) > 99) user.maxcha = 99
                            break
                        case 5:
                            vt.out('Melee')
                            user.melee++
                            break
                        case 6:
                            vt.out('Backstab')
                            user.backstab++
                            break
                        case 7:
                            vt.out('Poison')
                            user.poison++
                            break
                        case 8:
                            vt.out('Spellcasting')
                            if (user.magic < 2)
                                user.magic++
                            else
                                user.sp += 511
                            break
                        case 9:
                            vt.out('Stealing')
                            user.steal++
                            break
                    }
                    vt.out(vt.normal, ' added')
                    if (user != $.player) vt.out(' to ', user.handle)
                    vt.outln(' ', vt.yellow, vt.bright, '+')
                }
                if ((user.str += rpc.toStr) > user.maxstr) user.str = user.maxstr
                if ((user.int += rpc.toInt) > user.maxint) user.int = user.maxint
                if ((user.dex += rpc.toDex) > user.maxdex) user.dex = user.maxdex
                if ((user.cha += rpc.toCha) > user.maxcha) user.cha = user.maxcha
                user.hp += this.hp(user)
                user.sp += this.sp(user)
            }
            return user
        }

        save(rpc: active | user = $.online, insert = false, locked = false) {

            let user: user = 'user' in rpc ? rpc.user : rpc

            if (!user.id) return
            if (insert || locked || user.id[0] == '_') {
                try {
                    let save: user = { id: '' }
                    Object.assign(save, user)
                    Object.assign(save, {
                        bounty: user.bounty.amount,
                        coin: user.coin.amount,
                        bank: user.bank.amount,
                        loan: user.loan.amount
                    })
                    const trace = pathTo('users', `.${user.id}.json`)
                    fs.writeFileSync(trace, JSON.stringify(save, null, 2))
                }
                catch (err) {
                    console.error(err)
                }
            }

            db.saveUser(user, insert)
            if ('altered' in rpc) rpc.altered = false
            if (locked) db.unlock(user.id.toLowerCase())
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
                        console.error(` ? Unexpected error: ${String(err)}`)
                    }
                }
            }
            else {
                if (g.members.length > 4) g.members.splice(0, 4)
                db.run(`UPDATE Gangs
                SET members='${g.members.join()}',win=${g.win},loss=${g.loss},
                banner=${(g.banner << 4) + g.trim},color=${(g.back << 4) + g.fore}
                WHERE name='${g.name}'`)
            }
        }

        saveRing(name: string, bearer = '', rings?: string[]) {
            let theRing = { name: name, bearer: bearer[0] == '_' ? '' : bearer }

            //  record active bearer to maintain as a rare 'ring of power'
            if (Ring.name[name].unique) {
                db.run(`UPDATE Rings SET bearer='${theRing.bearer}' WHERE name=?`, false, name)
            }
            if (theRing.bearer.length && rings) {
                db.run(`UPDATE Players SET rings=? WHERE id=?`, false, rings.toString(), theRing.bearer)
            }
        }

        sp(user = $.player): number {
            return user.magic > 1 ? Math.round(user.level + dice(user.level) + user.int / 10) : 0
        }

        status(profile: active) {
            vt.action('clear')
            this.portrait(profile)

            const line = '--------------------------------------------------------'
            const space = '                                                        '
            const sex = profile.user.sex == 'I' ? profile.user.gender : profile.user.sex
            var i: number
            var n: number

            i = 22 - profile.user.handle.length
            n = 12 + i / 2
            vt.cls()
            vt.out(vt.blue, '+', vt.faint, line.slice(0, n), vt.normal, '=:))')
            vt.out(vt.Blue, vt.yellow, vt.bright, ' ', profile.user.handle, ' ', vt.reset)
            n = 12 + i / 2 + i % 2
            vt.outln(vt.blue, '((:=', vt.faint, line.slice(0, n), vt.normal, '+')

            i = 30 - Access.name[profile.user.access][sex].length
            n = 12 + i / 2
            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.white, vt.normal, space.slice(0, n))
            vt.out('"', Access.name[profile.user.access][sex], '"')
            n = 12 + i / 2 + i % 2
            vt.outln(vt.blue, space.slice(0, n), vt.reset, vt.blue, vt.faint, '|')

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('     Title: ', vt.white)
            if ($.player.emulation == 'XT') vt.out('\r\x1B[2C', Access.name[profile.user.access].emoji, '\r\x1B[13C')
            vt.out(sprintf('%-20s', profile.user.access))
            vt.out(vt.cyan, '  Born: ', vt.white, date2full(profile.user.dob))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('     Class: ', vt.white)
            if ($.player.emulation == 'XT' && profile.user.wins > 0) vt.out('\r\x1B[2C🎖️\r\x1B[13C')
            vt.out(sprintf('%-21s', profile.user.pc + ' (' + profile.user.gender + ')'))
            vt.out(vt.cyan, '  Exp: ', vt.white)
            if (profile.user.xp < 1e+8)
                vt.out(sprintf('%-15f', profile.user.xp))
            else
                vt.out(sprintf('%-15.7e', profile.user.xp))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('  Immortal: ', vt.white)
            vt.out(sprintf('%-20s', (profile.user.wins ? `${romanize(profile.user.wins)}.` : '')
                + profile.user.immortal + '.' + profile.user.level + ` (${profile.user.calls})`))
            vt.out(vt.cyan, '  Need: ', vt.white)
            if (this.experience(profile.user.level, undefined, profile.user.int) < 1e+8)
                vt.out(sprintf('%-15f', this.experience(profile.user.level, undefined, profile.user.int)))
            else
                vt.out(sprintf('%-15.7e', this.experience(profile.user.level, undefined, profile.user.int)))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            if (profile.user.blessed) {
                vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.yellow, vt.bright)
                vt.out(' + Blessed:', vt.white, vt.normal, ' by ', sprintf('%-40s', profile.user.blessed))
                vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
            }

            if (profile.user.cursed) {
                vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.white)
                vt.out('  - Cursed:', vt.normal, ' by ', sprintf('%-40s', profile.user.cursed))
                vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
            }

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('       Str: ', vt.white)
            if ($.player.emulation == 'XT') vt.out('\r\x1B[5C💪\r\x1B[13C')
            vt.out(sprintf('%-20s', profile.str + ' (' + profile.user.str + ',' + profile.user.maxstr + ')'))
            vt.out(vt.cyan, '  Hand: ', carry(profile.user.coin), ' '.repeat(15 - profile.user.coin.carry().length))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('       Int: ', vt.white)
            if ($.player.emulation == 'XT') vt.out('\r\x1B[5C🧠\r\x1B[13C')
            vt.out(sprintf('%-20s', profile.int + ' (' + profile.user.int + ',' + profile.user.maxint + ')'))
            vt.out(vt.cyan, '  Bank: ', carry(profile.user.bank), ' '.repeat(15 - profile.user.bank.carry().length))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('       Dex: ', vt.white)
            if ($.player.emulation == 'XT') vt.out('\r\x1B[5C⚡\r\x1B[13C')
            vt.out(sprintf('%-20s', profile.dex + ' (' + profile.user.dex + ',' + profile.user.maxdex + ')'))
            vt.out(vt.cyan, '  Loan: ', carry(profile.user.loan), ' '.repeat(15 - profile.user.loan.carry().length))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('       Cha: ', vt.white)
            if ($.player.emulation == 'XT') vt.out('\r\x1B[5C🍀\r\x1B[13C')
            vt.out(sprintf('%-19s', profile.cha + ' (' + profile.user.cha + ',' + profile.user.maxcha + ')'))
            vt.out(vt.faint, '  Steal: ', vt.normal)
            vt.out(sprintf('%-15s', ['lawful', 'desperate', 'trickster', 'adept', 'master'][profile.user.steal]))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('        HP: ', vt.white)
            if ($.player.emulation == 'XT') vt.out('\r\x1B[5C🌡️ \r\x1B[13C')
            vt.out(sprintf('%-43s', profile.hp + '/' + profile.user.hp + ' ('
                + ['weak', 'normal', 'adept', 'warrior', 'brute', 'hero'][profile.user.melee] + ', '
                + ['a rare', 'occasional', 'deliberate', 'angry', 'murderous'][profile.user.backstab] + ' backstab)'))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            if (profile.user.magic > 1) {
                vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.magenta, vt.bright)
                vt.out('        SP: ', vt.white)
                if ($.player.emulation == 'XT') vt.out('\r\x1B[5C🌠\r\x1B[13C')
                vt.out(sprintf('%-43s', profile.sp + '/' + profile.user.sp + ' (' + ['wizardry', 'arcane', 'divine'][profile.user.magic - 2] + ')'))
                vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
            }

            if (profile.user.spells.length) {
                vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.magenta, vt.bright)
                vt.out(sprintf(' %9s: ', ['Wands', 'Wands', 'Scrolls', 'Spells', 'Magus'][profile.user.magic]), vt.white)
                if ($.player.emulation == 'XT') vt.out('\r\x1B[2C' + (profile.user.magic == 2 ? '📜' : '🪄') + ' \r\x1B[13C')
                let text = ''
                n = 0
                for (let p = 0; p < profile.user.spells.length; p++) {
                    let spell = profile.user.spells[p]
                    let name = Magic.pick(spell)
                    if (spell < 5 || (spell < 17 && name.length > 7)) name = name.slice(0, 3)
                    if (text.length + name.length > 42) break
                    if (text.length) text += ','
                    text += name
                    n++
                }
                vt.out(sprintf('%-43s', text))
                vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
                while (n < profile.user.spells.length) {
                    text = ''
                    i = 0
                    vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.white, vt.bright, '            ')
                    for (let p = 0; p < profile.user.spells.length; p++) {
                        i++
                        if (i > n) {
                            let spell = profile.user.spells[p]
                            let name = Magic.pick(spell)
                            if (spell < 17 && name.length > 7) name = name.slice(0, 3)
                            if (text.length + name.length > 42) break
                            if (text.length) text += ','
                            text += name
                            n++
                        }
                    }
                    vt.out(sprintf('%-43s', text))
                    vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
                }
            }

            if (profile.user.rings.length) {
                vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.magenta, vt.bright)
                vt.out('     Rings: ', vt.white)
                if ($.player.emulation == 'XT') vt.out('\r\x1B[2C💍\r\x1B[13C')
                let text = ''
                n = 0
                for (let p = 0; p < profile.user.rings.length; p++) {
                    let name = profile.user.rings[p]
                    if (text.length + name.length > 42) break
                    if (text.length) text += ','
                    text += name
                    n++
                }
                vt.out(sprintf('%-43s', text))
                vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
                while (n < profile.user.rings.length) {
                    text = ''
                    i = 0
                    vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.white, vt.bright, '            ')
                    for (let p = 0; p < profile.user.rings.length; p++) {
                        i++
                        if (i > n) {
                            let name = profile.user.rings[p]
                            if (text.length + name.length > 42) break
                            if (text.length) text += ','
                            text += name
                            n++
                        }
                    }
                    vt.out(sprintf('%-43s', text))
                    vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
                }
            }

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.white)
            vt.out('   Alchemy: ', vt.normal)
            vt.out(sprintf('%-43s', ['banned', 'apprentice', 'expert (+1x,+1x)', 'artisan (+1x,+2x)', 'master (+2x,+2x)'][profile.user.poison]))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            if (profile.user.poisons.length) {
                vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.white)
                vt.out(sprintf(' %9s: ', ['Vial', 'Toxin', 'Poison', 'Bane', 'Venena'][profile.user.poison]), vt.normal)
                if ($.player.emulation == 'XT') vt.out('\r\x1B[2C🧪\r\x1B[13C')
                vt.out(sprintf('%-43s', profile.user.poisons.toString()))
                vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
            }

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('    Weapon: ')
            if ($.player.emulation == 'XT') vt.out('\r\x1B[2C🗡️ \r\x1B[13C')
            vt.out(weapon(profile), ' '.repeat(43 - weapon(profile, true).length))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('     Armor: ')
            if ($.player.emulation == 'XT') vt.out('\r\x1B[2C🛡 \r\x1B[13C')
            vt.out(armor(profile), ' '.repeat(43 - armor(profile, true).length))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('  Lives in: ', vt.white)
            vt.out(sprintf('%-43s', profile.user.realestate + ' (' + profile.user.security + ')'))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            if (profile.user.gang) {
                vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
                vt.out('     Party: ', vt.white)
                if ($.player.emulation == 'XT') vt.out('\r\x1B[2C🏴\r\x1B[13C')
                vt.out(sprintf('%-43s', profile.user.gang))
                vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
            }

            if (+profile.user.hull) {
                vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
                vt.out('   Warship: ', vt.white)
                vt.out(sprintf('%-19s', profile.hull.toString() + ':' + profile.user.hull.toString()))
                vt.out(vt.cyan, ' Cannon: ', vt.white)
                vt.out(sprintf('%-15s', profile.user.cannon.toString() + ':' + (profile.user.hull / 50).toString() + (profile.user.ram ? ' (RAM)' : '')))
                vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
            }

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('  Brawling: ', vt.white)
            vt.out(sprintf('%-19s', profile.user.tw + ':' + profile.user.tl))
            vt.out(vt.cyan, ' Steals: ', vt.white)
            vt.out(sprintf('%-15s', profile.user.steals))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('  Jousting: ', vt.white)
            vt.out(sprintf('%-19s', profile.user.jw + ':' + profile.user.jl + ` (${this.jousting(profile)})`))
            vt.out(vt.cyan, '  Plays: ', vt.white)
            vt.out(sprintf('%-15s', profile.user.plays))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('     Kills: ', vt.white)
            if ($.player.emulation == 'XT') vt.out('\r\x1B[2C💀\r\x1B[13C')
            vt.out(sprintf('%-43s', profile.user.kills + ' with ' + profile.user.retreats + ' retreats and killed ' + profile.user.killed + 'x'))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

            vt.outln(vt.blue, '+', vt.faint, line, vt.normal, '+')
        }

        wearing(profile: active) {
            if (isNaN(+profile.user.weapon)) {
                vt.outln('\n', this.who(profile).He, profile.weapon.text, ' ', weapon(profile)
                    , $.from == 'Dungeon' ? -300 : !profile.weapon.shoppe ? -500 : -100)
            }
            if (isNaN(+profile.user.armor)) {
                vt.outln('\n', this.who(profile).He, profile.armor.text, ' ', armor(profile)
                    , $.from == 'Dungeon' ? -300 : !profile.armor.armoury ? -500 : -100)
            }
            if ($.from !== 'Dungeon' && profile.user.sex == 'I') {
                for (let i in profile.user.rings) {
                    let ring = profile.user.rings[i]
                    if (!+i) vt.outln()
                    vt.out(this.who(profile).He, 'has ', vt.cyan, vt.bright, ring, vt.normal)
                    if ($.player.emulation == 'XT') vt.out(' ', Ring.name[ring].emoji)
                    vt.outln(' powers ', vt.reset, 'that can ', Ring.name[ring].description, -100)
                }
                if (profile.description && profile.user.level >= $.player.level && $.from !== 'Dungeon' && profile.user.sex == 'I') {
                    for (let l = 0; l < profile.description.length; l++)
                        vt.outln(vt.cyan, vt.bright, profile.description[l], $.player.novice ? -750 : -150)
                }
            }
        }

        what(rpc: active, action: string): string {
            return action + (rpc !== $.online ? (/.*ch$|.*sh$|.*s$|.*z$/i.test(action) ? 'es ' : 's ') : ' ')
        }

        who(pc: active | user, mob = false): who {
            let user: user = 'user' in pc ? pc.user : pc
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

    export const Deed = new _deed
    export const PC = new _pc
    export const NPC = require(pathTo('pcs', 'npc.json'))
}

export = pc
