/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  ITEMS authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import { PATH, int, now, vt } from './sys'
import db = require('./db')
import $ = require('./runtime')

module Items {

    const ITEMS = `${PATH}/items`

    export class Coin implements coins {

        constructor(money: string | number) {
            if (typeof money == 'number') {
                this.value = money
            }
            else {
                this.amount = money
            }
        }

        private _value: number

        get value(): number {
            return this._value
        }

        set value(newValue: number) {
            const MAX = (1e+18 - 1e+09)
            this._value = newValue < MAX ? newValue
                : newValue == Infinity ? 1 : MAX
        }

        //  top valued coin bag (+ any lesser)
        get amount(): string {
            return this.carry(2, true)
        }

        set amount(newAmount: string) {
            this.value = 0
            let coins = 0

            for (var i = 0; i < newAmount.length; i++) {
                let c = newAmount.charAt(i)
                switch (c) {
                    case 'c':
                        coins *= 1
                        break
                    case 's':
                        coins *= 1e+05
                        break
                    case 'g':
                        coins *= 1e+09
                        break
                    case 'p':
                        coins *= 1e+13
                        break
                }
                if (c >= '0' && c <= '9') {
                    coins *= 10
                    coins += +c
                }
                else {
                    this.value += coins
                    coins = 0
                }
            }
        }

        _pouch(coins: number): string {
            return (coins < 1e+05) ? 'c' : (coins < 1e+09) ? 's' : (coins < 1e+13) ? 'g' : 'p'
        }

        carry(max = 2, text = false): string {
            let n = this.value
            let bags: string[] = []

            if (this._pouch(n) == 'p') {
                n = int(n / 1e+13)
                bags.push(text ? n + 'p' : vt.attr(vt.white, vt.bright, n.toString(), vt.magenta, 'p', vt.normal, vt.white))
                n = this.value % 1e+13
            }
            if (this._pouch(n) == 'g') {
                n = int(n / 1e+09)
                bags.push(text ? n + 'g' : vt.attr(vt.white, vt.bright, n.toString(), vt.yellow, 'g', vt.normal, vt.white))
                n = this.value % 1e+09
            }
            if (this._pouch(n) == 's') {
                n = int(n / 1e+05)
                bags.push(text ? n + 's' : vt.attr(vt.white, vt.bright, n.toString(), vt.cyan, 's', vt.normal, vt.white))
                n = this.value % 1e+05
            }
            if ((n > 0 && this._pouch(n) == 'c') || bags.length == 0)
                bags.push(text ? n + 'c' : vt.attr(vt.white, vt.bright, n.toString(), vt.red, 'c', vt.normal, vt.white))

            return bags.slice(0, max).toString()
        }

        pieces(p = this._pouch(this.value), emoji = false): string {
            return 'pouch of ' + (emoji ? '💰 ' : '') + {
                'p': vt.attr(vt.magenta, vt.bright, 'platinum', vt.normal),
                'g': vt.attr(vt.yellow, vt.bright, 'gold', vt.normal),
                's': vt.attr(vt.cyan, vt.bright, 'silver', vt.normal),
                'c': vt.attr(vt.red, vt.bright, 'copper', vt.normal)
            }[p] + vt.attr(' pieces', vt.reset)
        }
    }

    class _access {

        name: access[]

        constructor() {
            this.name = require(`${ITEMS}/access.json`)
        }
    }

    class _armor {

        name: armor[]
        dwarf: string[] = []
        merchant: string[] = []
        special: string[] = []

        constructor() {
            this.name = require(`${ITEMS}/armor.json`)
            for (let i in this.name) {
                if (this.name[i].armoury)
                    this.merchant.push(i)
                else if (this.name[i].dwarf)
                    this.dwarf.push(i)
                else
                    this.special.push(i)
            }
        }

        baseAC(name: string | number): number {
            let ac = 0
            if (typeof this.name[name] == 'undefined')
                ac = Math.abs(+name)
            else
                ac = this.name[name].ac
            return ac
        }

        buffAC(rpc: active): number {
            let ac = this.baseAC(rpc.user.armor) + rpc.toAC + rpc.user.toAC
            return ac
        }

        equip(rpc: active, what: string | number, keep = false) {
            let armor: armor

            if (isNaN(+what)) {
                rpc.user.armor = what
                armor = this.name[what]
            }
            else {
                if (what >= this.merchant.length)
                    what = this.merchant.length - 1
                rpc.user.armor = +what
                armor = <armor>{ ac: +what, value: this.merchant[+what] ? this.name[this.merchant[+what]].value : '0c' }
            }
            if (!keep) rpc.user.toAC = 0
            rpc.armor = armor
            rpc.toAC = 0
            rpc.altered = true
        }

        swap(winner: active, loser: active, value?: coins): boolean | coins {
            // real item?
            if (!isNaN(+winner.user.armor) || !isNaN(+loser.user.armor))
                return false

            // is it better than this armor class?
            if ((winner.user.toAC >= 0 && winner.armor.ac >= loser.armor.ac)
                || (winner.user.toAC < 0 && winner.armor.ac + winner.user.toAC > loser.armor.ac)) {
                if (value) {
                    winner.user.coin.value += value.value
                    return value
                }
                return false
            }

            //  swap
            [winner.armor, loser.armor] = [loser.armor, winner.armor];
            [winner.toAC, loser.toAC] = [loser.toAC, winner.toAC];
            [winner.user.armor, loser.user.armor] = [loser.user.armor, winner.user.armor];
            [winner.user.toAC, loser.user.toAC] = [loser.user.toAC, winner.user.toAC];
            if (loser.user.id) {
                winner.toAC = 0
                if (winner.user.toAC > 0)
                    winner.user.toAC >>= 1
            }
            if (winner.user.id) {
                loser.toAC = 0
                if (loser.user.toAC > 0)
                    loser.user.toAC >>= 1
            }
            winner.altered = true
            loser.altered = true
            return true
        }

        wearing(rpc: active, text = true): string {
            let result = ''
            if (isNaN(+rpc.user.armor)) {
                if (text) result = rpc.armor.text + ' '
                result += rpc.user.armor
            }
            return result
        }
    }

    class _deed {

        name: deeds[]

        constructor() {
            this.name = require(`${ITEMS}/deed.json`)
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

        save(deed: deed) {
            if (!$.player.novice) {
                deed.date = now().date
                deed.hero = $.player.handle
                db.run(`UPDATE Deeds SET date=${deed.date},hero='${deed.hero}', value=${deed.value} WHERE pc='${deed.pc}' AND deed='${deed.deed}'`)
                /*
                if ($.player.level < 100) {
                    PC.adjust('str', 101)
                    PC.adjust('int', 101)
                    PC.adjust('dex', 101)
                    PC.adjust('cha', 101)
                    sound('outstanding')
                }
                */
            }
        }
    }

    class _magic {

        ring: _ring
        spells: spell[]
        merchant: string[] = []
        special: string[] = []

        constructor(ring: _ring) {
            this.ring = ring
            this.spells = require(`${ITEMS}/magic.json`)
            for (let i in this.spells) {
                if (this.spells[i].cost)
                    this.merchant.push(i)
                else
                    this.special.push(i)
            }
        }

        ability(spell: string, rpc: active, nme?: active): { fail: number, backfire: number } {
            let skill = rpc.user.magic || 1
            let fail: number
            let backfire: number

            fail = rpc.int + Math.trunc(rpc.user.level / 10) - (this.spells[spell].cast < 17 ? this.spells[spell].cast : this.spells[spell].cast - 8) - (5 - skill) - +rpc.user.coward
            //  is this an attack spell against an opponent?
            if (nme && [9, 11, 12, 14, 15, 16, 19, 20, 21, 22].indexOf(this.spells[spell].cast) >= 0) {
                let m = rpc.int - nme.int
                m = (m < -10) ? -10 : (m > 10) ? 10 : m
                m += 2 * (skill - nme.user.magic)
                fail += m
            }
            fail = (fail < 11) ? 11 : (fail > 99) ? 99 : fail

            //  integrate any rings of power that can affect casting spells
            if (nme && nme.user.rings.length) fail -= 2
                * this.ring.power(rpc.user.rings, nme.user.rings, 'cast', 'magic', skill).power
                * (5 - nme.user.magic)

            backfire = 50 + (fail >> 1) - +rpc.user.coward
            return { fail, backfire }
        }

        add(spells: number[], n: number | string) {
            let m = +n
            if (isNaN(m)) {
                for (let i in this.spells) {
                    if (n == i) {
                        n = this.spells[i].cast
                        break
                    }
                }
            }
            if (+n) {
                if (!this.have(spells, n)) {
                    spells.push(+n)
                    spells.sort((n1, n2) => n1 - n2)
                }
            }
        }

        have(spells: number[], n: number | string): boolean {
            let have = false
            if (typeof n == 'number' && spells.indexOf(n) >= 0)
                have = true
            else {
                for (let i = 0; i < spells.length; i++) {
                    if (n == this.pick(spells[i])) {
                        have = true
                        break
                    }
                }
            }
            return have
        }

        pick(n: number): string {
            let name = ''
            if (n > 0 && n <= Object.keys(this.spells).length)
                for (let key in this.spells)
                    if (n == this.spells[key].cast) {
                        name = key
                        break
                    }
            return name
        }

        power(rpc: active, n: number): number {
            let spell = this.spells[this.pick(n)]
            return rpc.user.magic < 2 ? 0 : rpc.user.magic < 4 ? spell.mana : spell.enchanted
        }

        remove(spells: number[], n: number) {
            let i = spells.indexOf(n)
            if (i >= 0) spells.splice(i, 1)
        }
    }

    class _poison {

        vials: poison[]
        merchant: string[] = []

        constructor() {
            this.vials = require(`${ITEMS}/poison.json`)
            for (let i in this.vials) {
                if (this.vials[i].cost)
                    this.merchant.push(i)
            }
        }

        add(vials: number[], n: number | string) {
            n = +n
            if (!this.have(vials, n)) {
                vials.push(n)
                vials.sort((n1, n2) => n1 - n2)
            }
        }

        have(vials: number[], n: number | string): boolean {
            let have = false
            if (typeof n == 'number' && vials.indexOf(n) >= 0)
                have = true
            else {
                for (let i = 0; i < vials.length; i++) {
                    if (n == this.pick(vials[i])) {
                        have = true
                        break
                    }
                }
            }
            return have
        }

        pick(n: number): string {
            let name = ''
            if (n > 0 && n <= Object.keys(this.vials).length)
                for (let key in this.vials)
                    if (n == this.vials[key].power) {
                        name = key
                        break
                    }
            return name
        }

        remove(vials: number[], n: number) {
            let i = vials.indexOf(n)
            if (i >= 0) vials.splice(i, 1)
        }
    }

    class _realestate {

        name: realestate[]
        merchant: string[] = []

        constructor() {
            this.name = require(`${ITEMS}/realestate.json`)
            for (let i in this.name)
                this.merchant.push(i)
        }
    }

    class _ring {
        name: ring[]
        common: string[] = []
        unique: string[] = []
        theOne: string

        constructor() {
            this.name = require(`${ITEMS}/ring.json`)
            for (let i in this.name)
                if (this.name[i].unique) {
                    this.unique.push(i)
                    db.run(`INSERT INTO Rings (name,bearer) VALUES (?,'')`, true, this.name[i])
                }
                else
                    this.common.push(i)
            this.theOne = this.power([], null, 'ring').name
        }

        have(rings: string[], name: string): boolean {
            return rings.indexOf(name) >= 0
        }

        remove(rings: string[], name: string) {
            let i = rings.indexOf(name)
            if (i >= 0) rings.splice(i, 1)
        }

        power(vs: string[], rings: string[] | null, id: POWER, match?: POWTO, value?: any)
            : { name: string, power: number } {

            let mine = (rings == null) ? Object.keys(this.name) : rings
            let name = ''
            let power = 0

            if (!vs.length || !this.have(vs, this.theOne)) {
                for (let f in mine) {
                    let abilities = this.name[mine[f]].ability
                    for (let a in abilities) {
                        //  got POWER?
                        if (abilities[a].id == id) {
                            name = mine[f]
                            if (Object.keys(abilities[a]).length == 2)
                                power = +abilities[a].power || 0
                            else if (match && abilities[a][match]) {
                                if (value && abilities[a][match] == value)
                                    power = +abilities[a].power || 0
                            }
                            //  console.log(a, name, id, match || '', value || '', '->', power)
                        }
                    }
                }
                if (rings !== null && this.have(mine, this.theOne)) power *= 2
            }

            return { name: name, power: power }
        }

        wear(rings: string[], name: string): boolean {
            if (!this.have(rings, name)) {
                rings.push(name)
                rings.sort()
                return true
            }
            return false
        }

        save(name: string, bearer = '', rings?: string[]) {
            let theRing = { name: name, bearer: bearer[0] == '_' ? '' : bearer }

            //  primarily maintain the one ring's active bearer here
            if (Ring.name[name].unique) {
                db.run(`UPDATE Rings SET bearer='${theRing.bearer}' WHERE name=?`, false, name)
            }
            if (theRing.bearer.length && rings) {
                db.run(`UPDATE Players SET rings=? WHERE id=?`, false, rings.toString(), theRing.bearer)
            }
        }
    }

    class _security {

        name: security[]
        merchant: string[] = []

        constructor() {
            this.name = require(`${ITEMS}/security.json`)
            for (let i in this.name)
                this.merchant.push(i)
        }
    }

    class _weapon {

        name: weapon[]
        dwarf: string[] = []
        merchant: string[] = []
        special: string[] = []

        constructor() {
            this.name = require(`${ITEMS}/weapon.json`)
            for (let i in this.name) {
                if (this.name[i].shoppe)
                    this.merchant.push(i)
                else if (this.name[i].dwarf)
                    this.dwarf.push(i)
                else
                    this.special.push(i)
            }
        }

        baseWC(name: string | number): number {
            let wc = 0
            if (typeof this.name[name] == 'undefined')
                wc = Math.abs(+name)
            else
                wc = this.name[name].wc
            return wc
        }

        buffWC(rpc: active): number {
            let wc = this.baseWC(rpc.user.weapon) + rpc.toWC + rpc.user.toWC
            return wc
        }

        equip(rpc: active, what: string | number, keep = false) {
            let weapon: weapon

            if (isNaN(+what)) {
                rpc.user.weapon = what
                weapon = this.name[what]
            }
            else {
                if (what >= this.merchant.length)
                    what = this.merchant.length - 1
                rpc.user.weapon = +what
                weapon = <weapon>{
                    wc: +what, value: this.merchant[+what] ? this.name[this.merchant[+what]].value : '0c'
                    , hit: 'hit', stab: 'stab', smash: 'smash', plunge: 'plunge'
                }
            }
            if (!keep) rpc.user.toWC = 0
            rpc.weapon = weapon
            rpc.toWC = 0
            rpc.altered = true
        }

        swap(winner: active, loser: active, value?: coins): boolean | coins {
            // carrying a real item?
            if (!isNaN(+winner.user.weapon) || !isNaN(+loser.user.weapon))
                return false

            // is it better than this weapon class?
            if ((winner.user.toWC >= 0 && winner.weapon.wc >= loser.weapon.wc)
                || (winner.user.toWC < 0 && winner.weapon.wc + (winner.user.toWC * (winner.user.poison > 1 ? winner.user.poison : 1)) >= loser.weapon.wc)) {
                if (value) {
                    winner.user.coin.value += value.value
                    return value
                }
                return false
            }

            //  swap
            [winner.weapon, loser.weapon] = [loser.weapon, winner.weapon];
            [winner.toWC, loser.toWC] = [loser.toWC, winner.toWC];
            [winner.user.weapon, loser.user.weapon] = [loser.user.weapon, winner.user.weapon];
            [winner.user.toWC, loser.user.toWC] = [loser.user.toWC, winner.user.toWC];
            if (loser.user.id) {
                winner.toWC = 0
                if (winner.user.toWC > 0)
                    winner.user.toWC >>= 1
            }
            if (winner.user.id) {
                loser.toWC = 0
                if (loser.user.toWC > 0)
                    loser.user.toWC >>= 1
            }
            winner.altered = true
            loser.altered = true
            return true
        }

        wearing(rpc: active, text = true): string {
            let result = ''
            if (isNaN(+rpc.user.weapon)) {
                if (text) result = rpc.weapon.text + ' '
                result += rpc.user.weapon
            }
            return result
        }
    }

    export const Access = new _access
    export const Armor = new _armor
    export const Deed = new _deed
    export const Ring = new _ring
    export const Magic = new _magic(Ring)
    export const Poison = new _poison
    export const RealEstate = new _realestate
    export const Security = new _security
    export const Weapon = new _weapon
}

export = Items
