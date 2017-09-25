/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  ITEM authored by: Robert Hurst <theflyingape@gmail.com>                  *
\*****************************************************************************/

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
    gift: string[] = []
    merchant: string[] = []
    special: string[] = []

    constructor () {
        this.name = require('./items/armor.json')
        for (let i in this.name) {
            if (this.name[i].armoury)
                this.merchant.push(i)
            else if (this.name[i].gift)
                this.gift.push(i)
            else
                this.special.push(i)
        }
    }

    equip(rpc: active, what: string|number, worth?: string) {
        let armor: armor

        if (typeof what === 'string') {
            armor = this.name[what]
            if (worth) armor.value = worth
        }
        else
            armor = <armor>{ ac:what, value:worth ? worth : '0c' }

        rpc.user.armor = typeof what === 'string' ? what : undefined
        rpc.user.toAC = 0
        rpc.armor = armor
        rpc.toAC = 0
        rpc.altered = true
    }

    wearing(rpc: active): string {
        return (typeof rpc.user.armor === 'string') ? rpc.armor.text + ' ' + rpc.user.armor : ''
    }
}

export class Magic {

    spells: spell[]
    merchant: string[] = []
    special: string[] = []

    constructor () {
        this.spells = require('./items/magic.json')
        for (let i in this.spells) {
            if (this.spells[i].cost)
                this.merchant.push(i)
            else
                this.special.push(i)
        }
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

    add(vials: number[], n:number) {
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
    gift: string[] = []
    merchant: string[] = []
    special: string[] = []

    constructor () {
        this.name = require('./items/weapon.json')
        for (let i in this.name) {
            if (this.name[i].shoppe)
                this.merchant.push(i)
            else if (this.name[i].gift)
                this.gift.push(i)
            else
                this.special.push(i)
        }
    }

    baseWC(name: string): number {
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

    equip(rpc: active, what: string|number, worth?: string) {
        let weapon: weapon

        if (typeof what === 'string') {
            weapon = this.name[what]
            if (worth) weapon.value = worth
        }
        else
            weapon = <weapon>{ wc:what, value:worth ? worth : '0c', hit:'hit', stab:'stab', smash:'smash', plunge:'plunge' }

        rpc.user.weapon = typeof what === 'string' ? what : undefined
        rpc.user.toWC = 0
        rpc.weapon = weapon
        rpc.toWC = 0
        rpc.altered = true
    }

    wearing(rpc: active): string {
        return (typeof rpc.user.weapon === 'string') ? rpc.weapon.text + ' ' + rpc.user.weapon : ''
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
