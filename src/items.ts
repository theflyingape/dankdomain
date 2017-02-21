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

    constructor () {
        this.name = require('./items/armor.json')
    }
}

export class Magic {

    spells: spell[]

    constructor () {
        this.spells = require('./items/magic.json')
    }

    add(spells: number[], n:number) {
        spells.push(n)
        spells.sort((n1,n2) => n1 - n2)
    }

    have(spells: number[], n: number|string): boolean {
        let have = false
        if (typeof n === 'number') {
            for (let i = 0; i < spells.length; i++) {
                if (n == this.spells[spells[i]].cast) {
                    have = true
                    break
                }
            }
        }
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
}

export class Poison {

    name: poison[]

    constructor () {
        this.name = require('./items/poison.json')
    }

    add(vials: number[], n:number) {
        vials.push(n)
        vials.sort((n1,n2) => n1 - n2)
    }

    have(vials: number[], n: number|string): boolean {
        let have = false
        if (typeof n === 'number') {
            for (let i = 0; i < vials.length; i++) {
                if (n == this.name[vials[i]].power) {
                    have = true
                    break
                }
            }
        }
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
        if (n > 0 && n <= Object.keys(this.name).length)
            for (let key in this.name)
                if (n == this.name[key].power) {
                    name = key
                    break
                }
        return name
    }
}

export class Weapon {

    name: weapon[]

    constructor () {
        this.name = require('./items/weapon.json')
    }
}

export class RealEstate {

    name: realestate[]

    constructor () {
        this.name = require('./items/realestate.json')
    }
}

export class Security {

    name: security[]

    constructor () {
        this.name = require('./items/security.json')
    }
}

}

export = Items
