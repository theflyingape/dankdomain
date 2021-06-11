/*****************************************************************************\
 *  Ɗaɳƙ Ɗoɱaiɳ: the return of Hack & Slash                                  *
 *  PC authored by: Robert Hurst <theflyingape@gmail.com>                    *
\*****************************************************************************/

import $ = require('./runtime')
import db = require('./db')
import { ITEMS, Access, Armor, Magic, Ring, Weapon } from './items'
import { armor, Coin, vt, weapon } from './lib'
import { date2full, dice, fs, int, isActive, now, pathTo, romanize, sprintf, titlecase, USERS, whole } from './sys'

module pc {

    export const Abilities: ABILITY[] = ['str', 'int', 'dex', 'cha']

    class _deed {

        name: deeds[]

        constructor() {
            this.name = require(pathTo(ITEMS, 'deed.json'))
        }

        //  coveted
        get key(): {} {
            const oldkey = '🗝️ '
            return vt.emulation == 'XT'
                ? {
                    P: vt.attr(oldkey, vt.bright, vt.Magenta, ' Platinum ', vt.reset),
                    G: vt.attr(oldkey, vt.black, vt.Yellow, ' = Gold = ', vt.reset),
                    S: vt.attr(oldkey, vt.bright, vt.Cyan, '- Silver -', vt.reset),
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
                deed = this.load(pc, what)
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

    class _elemental {

        targets: target[]

        get cmd(): string {
            return this._cmd.length ? this._cmd.splice(0, 1).toString() : ''
        }

        set cmd(input: string) {
            this._cmd = this._cmd.concat(input)
        }

        private _cmd: string[] = []

        flush(cmd?: string) {
            this._cmd = []
            if (cmd) this.cmd = cmd
        }

        orders(from: string) {
            if ($.access.bot) {
                if (!this.cmd.length) {
                    switch (from) {
                        case 'Square':
                            const rarity = whole(1000 / ($.player.steal + 1))
                            if ($.player.bank.value > 0) {
                                this.cmd = 'b'
                                this.cmd = 'w'
                                if ($.player.level > 1 && dice(rarity) == rarity) this.cmd = 'r'
                                this.cmd = 'q'
                            }
                            if ($.player.coin.value > 0) {
                                if ($.player.magic > 1 || $.player.magic >= $.player.poison) {
                                    this.cmd = 'm'
                                    if ($.player.poison) this.cmd = 'v'
                                }
                                else {
                                    if ($.player.poison) this.cmd = 'v'
                                    if ($.player.magic) this.cmd = 'm'
                                }
                                this.cmd = 's'
                                this.cmd = 'w'
                                this.cmd = 'a'
                                this.cmd = 'r'
                            }
                            if ($.player.coin.value > 0) {
                                this.cmd = 'b'
                                this.cmd = 'd'
                                if ($.player.level > 1 && dice(rarity) == rarity) this.cmd = 'r'
                                this.cmd = 'q'
                            }
                            if ($.online.hp < $.player.hp) this.cmd = 'h'
                            this.cmd = 'g'
                            break
                    }
                    this.cmd = 'q'
                }
            }
        }

        refresh() {
            if (!$.access.bot) return
            if (this._cmd.length) return
            $.player.coward = false

            let lo = $.player.level - 3
            let hi = $.player.level +
                $.player.level < 15 ? 3
                : $.player.level < 30 ? dice(3) + 3
                    : $.player.level < 60 ? dice(6) + 6
                        : 30
            lo = lo < 1 ? 1 : lo
            hi = hi > 99 ? 99 : hi

            //  gather potential targets
            this.targets = []
            let rpc = <active>{ user: { id: '' } }
            const rs = db.query(`SELECT id FROM Players
            WHERE id != '${$.player.id}' AND id NOT GLOB '_*'
            AND gang != '${$.player.gang}'
            AND level BETWEEN ${lo} AND ${hi} AND xplevel > 0
            ORDER BY level`)

            //  evaluate targets for next actions
            for (let i in rs) {
                rpc.user.id = rs[i].id
                const online = !PC.load(rpc)
                if (!Access.name[rpc.user.access].roleplay) continue
                if (!db.lock(rpc.user.id)) continue

                this.targets = this.targets.concat({
                    player: rpc.user,
                    bail: false, jw: 0, tw: 0, kill: 0, gang: 0, steal: 0
                })
                const n = this.targets.length - 1
                let target = this.targets[n]

                const diff = whole($.player.level - rpc.user.level) + 1
                const up = PC.experience($.player.level, 1, $.player.int)
                const need = whole(100 - 2 * int(100 * whole(up - $.player.xp) / up))

                if (rpc.user.status !== 'jail') {
                    if (rpc.user.status) {
                    }
                    else {
                        if ($.joust && !(rpc.user.level > 1 && (rpc.user.jw + 3 * rpc.user.level) < rpc.user.jl)) {
                            const ability = PC.jousting($.online)
                            const versus = PC.jousting(rpc)
                            const factor = (100 - ($.player.level > rpc.user.level ? $.player.level : rpc.user.level)) / 10 + 3
                            if ((ability + factor * $.player.level) > versus)
                                target.jw += diff + whole(ability - versus) * (100 - $.player.level)
                        }
                        if ($.brawl) {
                            target.tw += 10 + diff
                            if (need < 16) target.tw += 10 * ($.player.melee + 1)
                        }
                        if ($.arena) {
                            target.kill += 10 + diff
                            if (need < 33 && diff > 1) target.tw += 10 * ($.player.melee + 1)
                        }
                        if ($.party && rpc.user.gang) {
                            let gang = PC.loadGang(rpc.user.gang)
                            if (need > 10) {
                                let sum = 0, size = 0
                                for (let i in gang.members) {
                                    if (gang.validated[i]) {
                                        let nme: active = { user: { id: gang.members[i] } }
                                        if (PC.load(nme) && !nme.user.status) {
                                            sum += nme.user.xplevel
                                            size++
                                        }
                                    }
                                }
                                if (sum && size) target.gang += 100 - int(sum / size) + int($.player.level / 3) + diff
                            }
                        }
                        if ($.rob) {
                            target.steal += diff + $.player.steal
                        }
                    }
                }
                else {
                    if ($.bail) {
                        target.bail = true
                    }
                    if ($.rob) {
                        target.steal += 2 * (diff + $.player.steal)
                    }
                }
            }

            if (dice(100) > 1) {
                this.cmd = 'y'
                this.cmd = 'm'
                if ($.access.roleplay) {
                    this.cmd = 's'
                }
                else {
                    this.cmd = 'l'
                    this.cmd = 'c'
                    this.cmd = 'h'
                    this.cmd = 'i'
                    if (dice(10) == 1) {
                        this.cmd = 'm'
                        this.cmd = 't'
                        this.cmd = 'w'
                    }
                    this.cmd = 'q'
                }
            }
            else
                this.cmd = ['g', 'l', 'm', 'r', 'u', 'x', 'y', 'z'][dice(8) - 1]
        }
    }

    class _pc {

        name: character[]
        types: number
        classes: { key?: string, value?: number }[]
        total: number
        winning: string

        constructor() {
            this.name = require(pathTo('etc', 'dankdomain.json'))
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
            one.altered = keep
            one.hp = one.user.hp
            one.sp = one.user.sp
            one.bp = int(one.user.hp / 10)
            one.hull = one.user.hull
            Weapon.equip(one, one.user.weapon, true)
            Armor.equip(one, one.user.armor, true)
            one.user.access = one.user.access || Object.keys(Access.name)[0]

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
                this.load(rpc)
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
            return Math.round(user.level + dice(user.level) + user.str / 10)
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
            let user: user = isActive(rpc) ? rpc.user : rpc
            if (user.handle) user.handle = titlecase(user.handle)
            if (db.loadUser(user)) {
                if (isActive(rpc)) this.activate(rpc)
                user.coin = new Coin(user.coin.value)
                user.bank = new Coin(user.bank.value)
                user.loan = new Coin(user.loan.value)
                user.bounty = new Coin(user.bounty.value)

                //  restore NPC to its static state
                if (user.id[0] == '_' && user.id !== "_SYS") {
                    try {
                        const npc: user = JSON.parse(fs.readFileSync(pathTo(USERS, `${db.NPC[user.id]}.json`)).toString())
                        if (npc) {
                            Object.assign(user, npc)
                            this.reroll(user, user.pc, user.level)
                            Object.assign(user, npc)
                            db.saveUser(user)
                        }
                    }
                    catch (err) { }
                }

                return true
            }
            return false
        }

        loadGang(rs: any, me = ''): gang {
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

        reroll(user: user, dd?: string, level = 1) {
            //  reset essential character attributes
            level = level > 99 ? 99 : level < 1 ? 1 : level
            user.level = level
            user.pc = dd ? dd : Object.keys(this.name['player'])[0]
            user.status = ''

            let rpc = this.card(user.pc)
            user.melee = rpc.melee
            user.backstab = rpc.backstab
            if (!(user.poison = rpc.poison)) user.poisons = []
            if (!(user.magic = rpc.magic)) user.spells = []
            user.steal = rpc.steal
            user.str = rpc.baseStr
            user.int = rpc.baseInt
            user.dex = rpc.baseDex
            user.cha = rpc.baseCha
            user.maxstr = rpc.maxStr
            user.maxint = rpc.maxInt
            user.maxdex = rpc.maxDex
            user.maxcha = rpc.maxCha
            user.xp = 0
            user.hp = 15
            user.sp = user.magic > 1 ? 15 : 0

            //  reset these prior experiences
            user.jl = 0
            user.jw = 0
            user.steals = 0
            user.tl = 0
            user.tw = 0

            //  reset for new or non player
            if (!user.id || user.id[0] == '_' || user.bot) {
                if (isNaN(user.dob)) user.dob = now().date
                if (isNaN(user.joined)) user.joined = now().date
                user.lastdate = now().date
                user.lasttime = now().time
                user.gender = user.sex || 'I'

                user.emulation = vt.emulation
                user.calls = 0
                user.today = 0
                user.expert = false
                user.rows = process.stdout.rows || 24
                user.remote = ''
                user.novice = !user.id && user.gender !== 'I'
                user.gang = user.gang || ''
                user.wins = 0
                user.immortal = 0

                user.coin = new Coin(0)
                user.bank = new Coin(0)
                user.loan = new Coin(0)
                user.bounty = new Coin(0)
                user.who = ''
                user.security = ''
                user.realestate = ''
                user.keyhints = []
            }

            if (level == 1) {
                Object.assign(user, JSON.parse(fs.readFileSync(pathTo('users', 'reroll.json'))))
                user.gender = user.sex
                user.coin = new Coin(user.coin.toString())
                user.bank = new Coin(user.bank.toString())
                user.loan = new Coin(0)
                //  force a verify if their access allows it
                // if (!user.novice && !$.access.sysop) user.email = ''
            }

            if (level == 1 || !user.id || user.id[0] == '_') {
                //  no extra free or augmented stuff
                user.poisons = []
                user.spells = []
                if (user.rings) user.rings.forEach(ring => { this.saveRing(ring) })
                user.rings = []
                user.toAC = 0
                user.toWC = 0
                user.hull = 0
                user.cannon = 0
                user.ram = false
                user.blessed = ''
                user.cursed = ''
                user.coward = false
                user.plays = 0
                user.retreats = 0
                user.killed = 0
                user.kills = 0
                user.bounty = new Coin(0)
                user.who = ''
            }

            if (user.level > 1) user.xp = this.experience(user.level - 1, 1, user.int)
            user.xplevel = (user.pc == Object.keys(this.name['player'])[0]) ? 0 : user.level

            for (let n = 2; n <= level; n++) {
                user.level = n
                if (user.level == 50 && user.gender !== 'I' && user.id[0] !== '_' && !user.novice) {
                    vt.out(vt.reset, vt.bright, vt.yellow, '+', vt.reset, ' Bonus ')
                    let d: number = 0
                    while (!d) {
                        d = dice(9)
                        switch (d) {
                            case 1:
                                if (user.maxstr > 94) d = 0
                                break
                            case 2:
                                if (user.maxint > 94) d = 0
                                break
                            case 3:
                                if (user.maxdex > 94) d = 0
                                break
                            case 4:
                                if (user.maxcha > 94) d = 0
                                break
                            case 5:
                                if (user.melee > 2) d = 0
                                break
                            case 6:
                                if (user.backstab > 2) d = 0
                                break
                            case 7:
                                if (user.poison > 2) d = 0
                                break
                            case 8:
                                if (user.magic > 2) d = 0
                                break
                            case 9:
                                if (user.steal > 2) d = 0
                                break
                        }
                    }

                    switch (d) {
                        case 1:
                            if ((user.maxstr += 10) > 99)
                                user.maxstr = 99
                            vt.out('Strength')
                            break
                        case 2:
                            if ((user.maxint += 10) > 99)
                                user.maxint = 99
                            vt.out('Intellect')
                            break
                        case 3:
                            if ((user.maxdex += 10) > 99)
                                user.maxdex = 99
                            vt.out('Dexterity')
                            break
                        case 4:
                            if ((user.maxcha += 10) > 99)
                                user.maxcha = 99
                            vt.out('Charisma')
                            break
                        case 5:
                            user.melee++
                            vt.out('Melee')
                            break
                        case 6:
                            user.backstab++
                            vt.out('Backstab')
                            break
                        case 7:
                            user.poison++
                            vt.out('Poison')
                            break
                        case 8:
                            if (user.magic < 4)
                                user.magic++
                            vt.out('Spellcasting')
                            break
                        case 9:
                            user.steal++
                            vt.out('Stealing')
                            break
                    }
                    vt.out(' added')
                    if (user != $.player) vt.out(' to ', user.handle)
                    vt.outln(' ', vt.bright, vt.yellow, '+')
                }
                if ((user.str += rpc.toStr) > user.maxstr)
                    user.str = user.maxstr
                if ((user.int += rpc.toInt) > user.maxint)
                    user.int = user.maxint
                if ((user.dex += rpc.toDex) > user.maxdex)
                    user.dex = user.maxdex
                if ((user.cha += rpc.toCha) > user.maxcha)
                    user.cha = user.maxcha
                user.hp += this.hp(user)
                user.sp += this.sp(user)
            }
        }

        save(rpc: active | user = $.online, insert = false, locked = false) {

            let user: user = isActive(rpc) ? rpc.user : rpc

            if (!user.id) return
            if (insert || locked || user.id[0] == '_') {
                try {
                    let save: user = { id: '' }
                    Object.assign(save, user)
                    Object.assign(save, {
                        bounty: user.bounty.carry(4, true),
                        coin: user.coin.carry(4, true),
                        bank: user.bank.carry(4, true),
                        loan: user.loan.carry(4, true)
                    })
                    const trace = pathTo(USERS, `.${user.id}.json`)
                    fs.writeFileSync(trace, JSON.stringify(save, null, 2))
                }
                catch { }
            }

            db.saveUser(user, insert)
            if (isActive(rpc)) rpc.altered = false
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
                        console.log(` ? Unexpected error: ${String(err)}`)
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
                if (!this.load(who)) {
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
                if (!this.load(who)) {
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

        wearing(profile: active) {
            if (isNaN(+profile.user.weapon)) {
                vt.outln('\n', this.who(profile).He, profile.weapon.text, ' ', weapon(profile)
                    , $.from == 'Dungeon' ? -300 : !profile.weapon.shoppe ? -500 : -100)
            }
            if (isNaN(+profile.user.armor)) {
                vt.outln('\n', this.who(profile).He, profile.armor.text, ' ', armor(profile)
                    , $.from == 'Dungeon' ? -300 : !profile.armor.armoury ? -500 : -100)
            }
            if (!$.player.novice && $.from !== 'Dungeon' && profile.user.sex == 'I') for (let i in profile.user.rings) {
                let ring = profile.user.rings[i]
                if (!+i) vt.outln()
                vt.out(this.who(profile).He, 'has ', vt.cyan, vt.bright, ring, vt.normal)
                if ($.player.emulation == 'XT') vt.out(' ', Ring.name[ring].emoji)
                vt.outln(' powers ', vt.reset, 'that can ', Ring.name[ring].description, -100)
            }
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

    export const Deed = new _deed
    export const Elemental = new _elemental
    export const PC = new _pc
}

export = pc
