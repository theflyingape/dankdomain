/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  ITEM authored by: Robert Hurst <theflyingape@gmail.com>                  *
\*****************************************************************************/

import $ = require('./common')
import xvt = require('xvt')

module Items
{

export class Access {

    name: access[]

    constructor () {
        this.name = require('./items/access.json')
    }
}

export class Armor {

    name: armor[]
    dwarf: string[] = []
    merchant: string[] = []
    special: string[] = []

    constructor () {
        this.name = require('./items/armor.json')
        for (let i in this.name) {
            if (this.name[i].armoury)
                this.merchant.push(i)
            else if (this.name[i].dwarf)
                this.dwarf.push(i)
            else
                this.special.push(i)
        }
    }

    baseAC(name: string|number): number {
        let ac = 0
        if (typeof this.name[name] === 'undefined')
            ac = Math.abs(+name)
        else
            ac = this.name[name].ac
        return ac
    }

    buffAC(rpc: active): number {
        let ac = this.baseAC(rpc.user.armor) + rpc.toAC + rpc.user.toAC
        return ac
    }

    equip(rpc: active, what: string|number, keep = false, worth?: string) {
        let armor: armor

        if (isNaN(+what)) {
            rpc.user.armor = what
            armor = this.name[what]
        }
        else {
            if (what >= this.merchant.length)
                what = this.merchant.length - 1
            rpc.user.armor = +what
            armor = <armor>{ ac:+what, value:'0c' }
        }
        if (worth)
            armor.value = worth
        else if (this.name[armor.ac])
            armor.value = this.name[armor.ac].value
        if (!keep) rpc.user.toAC = 0
        rpc.armor = armor
        rpc.toAC = 0
        rpc.altered = true
    }

    swap(winner: active, loser: active, value?: coins): boolean|coins {
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

export class Deed {
    
    name: deeds[]

    constructor () {
        this.name = require('./items/deed.json')
    }
}

export class Magic {

    ring: Ring
    spells: spell[]
    merchant: string[] = []
    special: string[] = []

    constructor (ring: Ring) {
        this.ring = ring
        this.spells = require('./items/magic.json')
        for (let i in this.spells) {
            if (this.spells[i].cost)
                this.merchant.push(i)
            else
                this.special.push(i)
        }
    }

    ability(spell: string, rpc: active, nme?: active): { fail:number, backfire:number } {
        let fail: number
        let backfire: number

        fail = rpc.int + Math.trunc(rpc.user.level / 10) - (this.spells[spell].cast < 17 ? this.spells[spell].cast : this.spells[spell].cast - 10)
        if (xvt.validator.isDefined(nme) && [ 9,11,12,14,15,16,19,20,21,22 ].indexOf(this.spells[spell].cast) >= 0) {
            let m = rpc.int - nme.int
            m = (m < -10) ? -10 : (m > 10) ? 10 : m
            m += 2 * (rpc.user.magic - nme.user.magic)
            fail += m
        }

        fail = (fail < 11) ? 11 : (fail > 99) ? 99 : fail

        //  integrate any rings of power that can affect casting spells
        if (nme && nme.user.rings.length) {
            let mod = this.ring.power(nme.user.rings, 'cast', 'magic', rpc.user.magic)
            if (mod.power && !this.ring.power(rpc.user.rings, 'ring').power)
                fail -= 2 * (5 - nme.user.magic)
        }

        backfire = 50 + (fail >>1)
        return { fail, backfire }
    }

    add(spells: number[], n: number|string) {
        let m = +n
        if (isNaN(m)) {
            for (let i in this.spells) {
                if (n === i) {
                    n = this.spells[i].cast
                    break
                }
            }
        }
        if (+n) {
            if (!this.have(spells, n)) {
                spells.push(+n)
                spells.sort((n1,n2) => n1 - n2)
            }
        }
    }

    have(spells: number[], n: number|string): boolean {
        let have = false
        if (typeof n === 'number' && spells.indexOf(n) >= 0)
            have = true
        else {
            for (let i = 0; i < spells.length; i++) {
                if (n === this.pick(spells[i])) {
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

    remove(spells: number[], n:number) {
        let i = spells.indexOf(n)
        if (i >= 0) spells.splice(i, 1)
    }
}

export class Poison {

    vials: poison[]
    merchant: string[] = []

    constructor () {
        this.vials = require('./items/poison.json')
        for (let i in this.vials) {
            if (this.vials[i].cost)
                this.merchant.push(i)
        }
    }

    add(vials: number[], n:number|string) {
        n = +n
        if (!this.have(vials, n)) {
            vials.push(n)
            vials.sort((n1,n2) => n1 - n2)
        }
    }

    have(vials: number[], n: number|string): boolean {
        let have = false
        if (typeof n === 'number' && vials.indexOf(n) >= 0)
            have = true
        else {
            for (let i = 0; i < vials.length; i++) {
                if (n === this.pick(vials[i])) {
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

    remove(vials: number[], n:number) {
        let i = vials.indexOf(n)
        if (i >= 0) vials.splice(i, 1)
    }
}

export class Weapon {
    name: weapon[]
    dwarf: string[] = []
    merchant: string[] = []
    special: string[] = []

    constructor () {
        this.name = require('./items/weapon.json')
        for (let i in this.name) {
            if (this.name[i].shoppe)
                this.merchant.push(i)
            else if (this.name[i].dwarf)
                this.dwarf.push(i)
            else
                this.special.push(i)
        }
    }

    baseWC(name: string|number): number {
        let wc = 0
        if (typeof this.name[name] === 'undefined')
            wc = Math.abs(+name)
        else
            wc = this.name[name].wc
        return wc
    }

    buffWC(rpc: active): number {
        let wc = this.baseWC(rpc.user.weapon) + rpc.toWC + rpc.user.toWC
        return wc
    }

    equip(rpc: active, what: string|number, keep = false, worth?: string) {
        let weapon: weapon

        if (isNaN(+what)) {
            rpc.user.weapon = what
            weapon = this.name[what]
        }
        else {
            if (what >= this.merchant.length)
                what = this.merchant.length - 1
            rpc.user.weapon = +what
            weapon = <weapon>{ wc:+what, value:'0c', hit:'hit', stab:'stab', smash:'smash', plunge:'plunge' }
        }
        if (worth)
            weapon.value = worth
        else if (this.name[weapon.wc])
            weapon.value = this.name[weapon.wc].value

        if (!keep) rpc.user.toWC = 0
        rpc.weapon = weapon
        rpc.toWC = 0
        rpc.altered = true
    }

    swap(winner: active, loser: active, value?: coins): boolean|coins {
        // carrying a real item?
        if (!isNaN(+winner.user.weapon) || !isNaN(+loser.user.weapon))
            return false

        // is it better than this weapon class?
        if ((winner.user.toWC >= 0 && winner.weapon.wc >= loser.weapon.wc)
            || (winner.user.toWC < 0 && winner.weapon.wc + winner.user.toWC > loser.weapon.wc)) {
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

export class Ring {
    name: ring[]
    common: string[] = []
    unique: string[] = []

    constructor() {
        this.name = require('./items/ring.json')
        for (let i in this.name)
            if (this.name[i].unique)
                this.unique.push(i)
            else
                this.common.push(i)
    }

    have(rings: string[], name: string): boolean {
        return rings.indexOf(name) >= 0
    }

    remove(rings: string[], name: string) {
        let i = rings.indexOf(name)
        if (i >= 0) rings.splice(i, 1)
    }

    power(rings: string[]|null, id: POWER, match?: POWTO, value?: any)
        : { name: string, power: boolean } {

        let name = ''
        let power = false
        if (rings === null)
            rings = Object.keys(this.name)

        for (let f in rings) {
            let abilities = this.name[rings[f]].ability
            for (let a in abilities) {
                if (abilities[a].id == id) {
                    if (typeof abilities[a][match] == 'undefined') {
                        name = rings[f]
                        power = abilities[a].power
                    }
                    else if (match && abilities[a][match]) {
                        if (value && abilities[a][match] == value) {
                            name = rings[f]
                            power = abilities[a].power
                        }
                    }
                }
            }
        }

        return { name:name, power:power }
    }

    wear(rings: string[], name: string): boolean {
        if (!this.have(rings, name)) {
            rings.push(name)
            rings.sort()
            return true
        }
        return false
    }
}

export class RealEstate {

    name: realestate[]
    merchant: string[] = []

    constructor () {
        this.name = require('./items/realestate.json')
        for (let i in this.name)
            this.merchant.push(i)
    }
}

export class Security {

    name: security[]
    merchant: string[] = []

    constructor () {
        this.name = require('./items/security.json')
        for (let i in this.name)
            this.merchant.push(i)
    }
}

}

export = Items
