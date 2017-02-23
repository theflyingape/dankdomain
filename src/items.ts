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

    add(spells: number[], n:number) {
        if (!this.have(spells, n)) {
            spells.push(n)
            spells.sort((n1,n2) => n1 - n2)
        }
    }

    have(spells: number[], n: number|string): boolean {
        let have = false
        if (typeof n === 'number') {
            if (typeof this.spells[this.merchant[n - 1]] === 'undefined') {
                for (let x = 0; x < this.special.length; x++) {
                    if (n == this.spells[this.special[x]].cast) {
                        have = true
                        break
                    }
                }
            }
            else {
                for (let i = 0; i < spells.length; i++) {
                    if (n == spells[i]) {
                    //  console.log('have', this.merchant[n-1], this.spells[this.merchant[n-1]])
                        have = true
                        break
                    }
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
        if (!this.have(vials, n)) {
            vials.push(n)
            vials.sort((n1,n2) => n1 - n2)
        }
    }

    have(vials: number[], n: number|string): boolean {
        let have = false
        if (typeof n === 'number') {
            for (let i = 0; i < vials.length; i++) {
                if (n == vials[i]) {
                //  console.log('have', this.merchant[n-1], this.vials[this.merchant[n-1]])
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
        if (n > 0 && n <= Object.keys(this.vials).length)
            for (let key in this.vials)
                if (n == this.vials[key].power) {
                    name = key
                    break
                }
        return name
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
