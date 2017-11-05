/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  COMMON authored by: Robert Hurst <theflyingape@gmail.com>                *
\*****************************************************************************/

import fs = require('fs')
import {sprintf} from 'sprintf-js'
import titleCase = require('title-case')

import xvt = require('xvt')
import Items = require('./items')

module Common
{
    //export const fs = require('fs-extra')

    //  items
    export const Access = new Items.Access
    export const Armor = new Items.Armor
    export const Magic = new Items.Magic
    export const Poison = new Items.Poison
    export const RealEstate = new Items.RealEstate
    export const Security = new Items.Security
    export const Weapon = new Items.Weapon

    export let barkeep: active = { user: { id:'_BAR'} }
    export let seahag: active = { user: { id:'_OLD'} }
    export let taxman: active = { user: { id:'_TAX'} }
    export let king: user = { id:'' }
    export let online: active = { user: { id:'' } }
    export let player: user = online.user
    export let sysop: user = { id:'_SYS' }

    export let access: access
    export let arena: number = 0
    export let bail: number = 0
    export let brawl: number = 0
    export let charity: number = 0
    export let dungeon: number = 0
    export let nest: number = 0
    export let joust: number = 0
    export let naval: number = 0
    export let party: number = 0
    export let realestate: number = 0
    export let security: number = 0
    export let tiny: number = 0

    export let callers: caller[] = []
    export let reason: string = ''

    //  £
    export const Cleric = {
        VT: '\x1B(0\x7D\x1B(B',
        PC: '\xB8',
        XT: '\u00A9',
        dumb: '$'
    }

    //  ±
    export const Teleport = {
        VT: '\x1B(0\x67\x1B(B',
        PC: '\xF1',
        XT: '\u00B1',
        dumb: '%'
    }

//  all player characters
export class Character {
        constructor () {
            this.name = require('./etc/dankdomain.json')
            this.types = Object.keys(this.name).length
            this.classes = new Array()
            this.total = 0
            for (let type in this.name) {
                let i = Object.keys(this.name[type]).length
                this.classes.push({ key:type, value:i })
                this.total += i
                if (type === 'immortal')
                    for (let dd in this.name[type])
                        this.winning = dd
            }
        }

        name: character[]
        types: number
        classes: { key?:string, value?:number }[]
        total: number
        winning: string

        ability(current: number, delta: number, max = 100, mod = 0): number {
            let ability = current
            max = max + mod
            max = max > 100 ? 100 : max < 20 ? 20 : max
            ability += delta
            ability = ability > max ? max : ability < 10 ? 10 : ability
            return ability
        }

        card(dd = 'None'): character {
            let rpc = <character>{}
            for (let type in this.name) {
                if (this.name[type][dd]) {
                    rpc = this.name[type][dd]
                    break
                }
            }
            return rpc
        }

        random(type?: string): string {
            let pc: string = ''
            if (type) {
                let i = dice(this.classes.find(item => item.key === type)[0].value)
                let n = i
                for (let dd in this.name[type])
                    if (!--n) {
                        pc = dd
                        break
                    }
            }
            else {
                let i = dice(this.total)    //  any
                let n = i
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

        stats(profile: active) {
            const line = '------------------------------------------------------'
            const space = '                                                      '
            var i: number
            var n: number

            i = 22 - profile.user.handle.length
            n = 11 + i / 2
            xvt.out(xvt.clear)
            xvt.out(xvt.blue, '+', line.slice(0, n), '=:))')
            xvt.out(xvt.Blue, xvt.bright, xvt.yellow, ' ', profile.user.handle, ' ', xvt.reset)
            n = 11 + i / 2 + i % 2
            xvt.out(xvt.blue, '((:=', line.slice(0, n), '+\n')

            i = 30 - Access.name[profile.user.access][profile.user.gender].length
            n = 11 + i / 2
            xvt.out(xvt.blue, '|', xvt.Blue, xvt.white, space.slice(0, n))
            xvt.out('"', Access.name[profile.user.access][profile.user.gender], '"')
            n = 11 + i / 2 + i % 2
            xvt.out(xvt.blue, space.slice(0, n), xvt.reset, xvt.blue, '|\n')
            
            xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.cyan)
            xvt.out('    Title: ', xvt.white)
            xvt.out(sprintf('%-20s', profile.user.access))
            xvt.out(xvt.cyan, ' Born: ', xvt.white, date2full(profile.user.dob))
            xvt.out(' ', xvt.reset, xvt.blue, '|\n')

            xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.cyan)
            xvt.out('    Class: ', xvt.white)
            xvt.out(sprintf('%-21s', profile.user.pc + ' (' + profile.user.gender + ')'))
            xvt.out(xvt.cyan, ' Exp: ', xvt.white)
            if (profile.user.xp < 1e+8)
                xvt.out(sprintf('%-15f', profile.user.xp))
            else
                xvt.out(sprintf('%-15.7e', profile.user.xp))
            xvt.out(' ', xvt.reset, xvt.blue, '|\n')

            xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.cyan)
            xvt.out(' Immortal: ', xvt.white)
            xvt.out(sprintf('%-20s', profile.user.immortal + '.' + profile.user.level))
            xvt.out(xvt.cyan, ' Need: ', xvt.white)
            if (experience(profile.user.level, undefined, profile.user.int) < 1e+8)
                xvt.out(sprintf('%-15f', experience(profile.user.level, undefined, profile.user.int)))
            else
                xvt.out(sprintf('%-15.7e', experience(profile.user.level, undefined, profile.user.int)))
            xvt.out(' ', xvt.reset, xvt.blue, '|\n')

            xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.cyan)
            xvt.out('      Str: ', xvt.white)
            xvt.out(sprintf('%-20s', profile.str + ' (' + profile.user.str + ',' + profile.user.maxstr + ')'))
            xvt.out(xvt.cyan, ' Hand: ', xvt.white)
            xvt.out(profile.user.coin.carry(), xvt.bright, ' '.repeat(15 - profile.user.coin.amount.length))
            xvt.out(' ', xvt.reset, xvt.blue, '|\n')

            xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.cyan)
            xvt.out('      Int: ', xvt.white)
            xvt.out(sprintf('%-20s', profile.int + ' (' + profile.user.int + ',' + profile.user.maxint + ')'))
            xvt.out(xvt.cyan, ' Bank: ', xvt.white)
            xvt.out(profile.user.bank.carry(), xvt.bright, ' '.repeat(15 - profile.user.bank.amount.length))
            xvt.out(' ', xvt.reset, xvt.blue, '|\n')

            xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.cyan)
            xvt.out('      Dex: ', xvt.white)
            xvt.out(sprintf('%-20s', profile.dex + ' (' + profile.user.dex + ',' + profile.user.maxdex + ')'))
            xvt.out(xvt.cyan, ' Loan: ', xvt.white)
            xvt.out(profile.user.loan.carry(), xvt.bright, ' '.repeat(15 - profile.user.loan.amount.length))
            xvt.out(' ', xvt.reset, xvt.blue, '|\n')

            xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.cyan)
            xvt.out('      Cha: ', xvt.white)
            xvt.out(sprintf('%-19s', profile.cha + ' (' + profile.user.cha + ',' + profile.user.maxcha + ')'))
            xvt.out(xvt.cyan, ' Steal: ', xvt.white)
            xvt.out(sprintf('%-15s', ['lawful', 'desperate', 'trickster', 'adept', 'master', 'grandmaster'][profile.user.steal]))
            xvt.out(' ', xvt.reset, xvt.blue, '|\n')

            xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.cyan)
            xvt.out('       HP: ', xvt.white)
            xvt.out(sprintf('%-42s', profile.hp + '/' + profile.user.hp + ' (' + ['weak', 'normal', 'advanced', 'warrior', 'brute', 'hero'][profile.user.melee] + ', ' + ['a rare', 'occasional', 'deliberate', 'angry', 'murderous'][profile.user.backstab] + ' backstab)'))
            xvt.out(' ', xvt.reset, xvt.blue, '|\n')

            if (profile.user.magic > 1) {
                xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.cyan)
                xvt.out('       SP: ', xvt.white)
                xvt.out(sprintf('%-42s', profile.sp + '/' + profile.user.sp + ' (' + ['wizardry', 'arcane', 'divine'][profile.user.magic - 2] + ')'))
                xvt.out(' ', xvt.reset, xvt.blue, '|\n')
            }

            if (profile.user.magic && profile.user.spells.length) {
                xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.cyan)
                xvt.out(sprintf(' %8s: ', ['Wands', 'Scrolls', 'Spells', 'Spells'][profile.user.magic - 1]), xvt.white)
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
                xvt.out(sprintf('%-42s', text))
                xvt.out(' ', xvt.reset, xvt.blue, '|\n')
                while (n < profile.user.spells.length) {
                    text = ''
                    i = 0
                    xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.white, '           ')
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
                    xvt.out(sprintf('%-42s', text))
                    xvt.out(' ', xvt.reset, xvt.blue, '|\n')
                }
            }

            xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.cyan)
            xvt.out('  Alchemy: ', xvt.white)
            xvt.out(sprintf('%-42s', ['none', 'apprentice', 'expert', 'artisan', 'master'][profile.user.poison]))
            xvt.out(' ', xvt.reset, xvt.blue, '|\n')

            if (profile.user.poisons.length) {
                xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.cyan)
                xvt.out('  Poisons: ', xvt.white)
                xvt.out(sprintf('%-42s', profile.user.poisons.toString()))
                xvt.out(' ', xvt.reset, xvt.blue, '|\n')
            }

            xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.cyan)
            xvt.out('   Weapon: ', this.weapon(profile).rich)
            xvt.out(' '.repeat(42 - this.weapon(profile).text.length))
            xvt.out(' ', xvt.reset, xvt.blue, '|\n')

            xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.cyan)
            xvt.out('    Armor: ', this.armor(profile).rich)
            xvt.out(' '.repeat(42 - this.armor(profile).text.length))
            xvt.out(' ', xvt.reset, xvt.blue, '|\n')

            xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.cyan)
            xvt.out(' Lives in: ', xvt.white)
            xvt.out(sprintf('%-42s', profile.user.realestate + ' (' + profile.user.security + ')'))
            xvt.out(' ', xvt.reset, xvt.blue, '|\n')

            if (xvt.validator.isNotEmpty(profile.user.gang)) {
                xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.cyan)
                xvt.out('    Party: ', xvt.white)
                xvt.out(sprintf('%-42s', profile.user.gang))
                xvt.out(' ', xvt.reset, xvt.blue, '|\n')
            }

            if (+profile.user.hull) {
                xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.cyan)
                xvt.out('  Warship: ', xvt.white)
                xvt.out(sprintf('%-18s', profile.hull.toString() + ':' +  profile.user.hull.toString()))
                xvt.out(xvt.cyan, ' Cannon: ', xvt.white)
                xvt.out(sprintf('%-15s', profile.user.cannon.toString() + ':' +  (profile.user.hull / 50).toString() + (profile.user.ram ? ' (RAM)' : '')))
                xvt.out(' ', xvt.reset, xvt.blue, '|\n')
            }

            xvt.out(xvt.blue, '+', line, '+', xvt.reset)
        }


        armor(profile: active): { text:string, rich:string } {
            let text = profile.user.armor + buff(profile.toAC, profile.user.toAC, true)
            let rich = xvt.attr(xvt.bright, xvt.white, profile.user.armor + buff(profile.user.toAC, profile.toAC))
            return { text:text, rich:rich }
        }

        weapon(profile: active): { text:string, rich:string } {
            let text = profile.user.weapon + buff(profile.toWC, profile.user.toWC, true)
            let rich = xvt.attr(xvt.bright, xvt.white, profile.user.weapon + buff(profile.user.toWC, profile.toWC))
            return { text:text, rich:rich }
        }
    }

    export const PC = new Character

export class coins {
    constructor (money: string | number) {
        if (typeof money === 'number') {
            this.value = money
        }
        else {
            this.amount = money
        }
    }

    _value: number

    get value(): number {
        return this._value
    }

    set value(newValue: number) {
        this._value = newValue < 1e+19 ? newValue : 1e+19 - 1
    }

    //  top valued coin bag (+ a lesser)
    get amount(): string {
        return this.carry(2, true)
    }

    set amount(newAmount: string) {
        this.value = 0
        let coins = 0

        for(var i = 0; i < newAmount.length; i++) {
            let c = newAmount.charAt(i)
            switch(c) {
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

    carry(max = 2, text = false): string {
        let n = this.value
        let bags:string[] = []

        if (this.pouch(n) === 'p') {
            n = Math.trunc(n / 1e+13)
            bags.push(text ? n + 'p'
                : xvt.attr(xvt.bright, xvt.white, n.toString(), xvt.magenta, 'p', xvt.white, xvt.normal)
            )
            n = this.value % 1e+13
        }
        if (this.pouch(n) === 'g') {
            n = Math.trunc(n / 1e+09)
            bags.push(text ? n + 'g'
                : xvt.attr(xvt.bright, xvt.white, n.toString(), xvt.yellow, 'g', xvt.white, xvt.normal)
            )
            n = this.value % 1e+09
        }
        if (this.pouch(n) === 's') {
            n = Math.trunc(n / 1e+05)
            bags.push(text ? n + 's'
                : xvt.attr(xvt.bright, xvt.white, n.toString(), xvt.cyan, 's', xvt.white, xvt.normal)
            )
            n = this.value % 1e+05
        }
        if ((n > 0 && this.pouch(n) === 'c') || bags.length == 0)
            bags.push(text ? n + 'c'
                : xvt.attr(xvt.bright, xvt.white, n.toString(), xvt.red, 'c', xvt.white, xvt.normal)
            )

        return bags.slice(0, max).toString()
    }

    pouch(coins:number): string {
        if (coins < 1e+05)
            return 'c'
        if (coins < 1e+09)
            return 's'
        if (coins < 1e+13)
            return 'g'
        return 'p'
    }
}

export function activate(one: active, keep = false): boolean {
    one.altered = true
    one.confused = false
    one.str = one.user.str
    one.int = one.user.int
    one.dex = one.user.dex
    one.cha = one.user.cha
    one.hp = one.user.hp
    one.sp = one.user.sp
    one.bp = Math.trunc(one.user.hp / 10)
    one.hull = one.user.hull
    Weapon.equip(one, one.user.weapon, true)
    Armor.equip(one, one.user.armor, true)
    if (one.user.blessed.length) {
        if ((one.str += 10) > 100)
            one.str = 100
        if ((one.int += 10) > 100)
            one.int = 100
        if ((one.dex += 10) > 100)
            one.dex = 100
        if ((one.cha += 10) > 100)
            one.cha = 100
    }
    if (one.user.cursed.length) {
        if ((one.str -= 10) < 10)
            one.str = 10
        if ((one.int -= 10) < 10)
            one.int = 10
        if ((one.dex -= 10) < 10)
            one.dex = 10
        if ((one.cha -= 10) < 10)
            one.cha = 10
    }
    if (!xvt.validator.isDefined(one.user.access))
        one.user.access = Object.keys(Access.name)[0]

    if (keep) {
        if (!lock(one.user.id) && one.user.id !== player.id) {
            xvt.beep()
            xvt.out('\n', xvt.cyan, xvt.bright
                , one.user.handle, ' is engaged elsewhere.'
                , xvt.reset, '\n'
            )
            xvt.waste(500)
            return false
        }
    }
    return true
}

export function checkXP(rpc: active): boolean {

    if (!Access.name[rpc.user.access]) return false
    if (rpc.user.level >= sysop.level) {
        riddle()
        return true
    }
    if (rpc.user.xp < experience(rpc.user.level, undefined, rpc.user.int)) return false

    let award = {
        hp: rpc.user.hp,
        sp: rpc.user.sp,
        str: rpc.user.str,
        int: rpc.user.int,
        dex: rpc.user.dex,
        cha: rpc.user.cha
    }
    let eligible = rpc.user.level < sysop.level / 2
    let bonus = false
    let jumped = 0
    let i: number

    while (rpc.user.xp >= experience(rpc.user.level, undefined, rpc.user.int)) {
        rpc.user.level++
        jumped++

        if (rpc.user.level == Access.name[rpc.user.access].promote) {
            let title = Object.keys(Access.name).indexOf(rpc.user.access)
            do {
                rpc.user.access = Object.keys(Access.name)[++title]
            } while (!xvt.validator.isDefined(Access.name[rpc.user.access][rpc.user.gender]))
            xvt.waste(250)
            xvt.out(xvt.reset, '\n')
            xvt.waste(250)
            xvt.out(xvt.bright, xvt.yellow
                , Access.name[king.access][king.gender], ' the ', king.access.toLowerCase()
                , ', ', king.handle
                , ', is pleased with your accomplishments\n'
                , 'and promotes you to ', an(rpc.user.access), rpc.user.access, '!\n')
            xvt.waste(250)
            xvt.out(xvt.reset, '\n')
            xvt.waste(250)
            news(`\twas promoted to ${rpc.user.access}`)
        }

		rpc.user.hp += Math.round(rpc.user.level + dice(rpc.user.level) + rpc.user.str / 10 + (rpc.user.str > 90 ? rpc.user.str - 90 : 0))

		if (rpc.user.magic > 1)
			rpc.user.sp += Math.round(rpc.user.level + dice(rpc.user.level) + rpc.user.int / 10 + (rpc.user.int > 90 ? rpc.user.int - 90 : 0))

		rpc.user.str = PC.ability(rpc.user.str, PC.card(rpc.user.pc).toStr, rpc.user.maxstr)
		rpc.user.int = PC.ability(rpc.user.int, PC.card(rpc.user.pc).toInt, rpc.user.maxint)
		rpc.user.dex = PC.ability(rpc.user.dex, PC.card(rpc.user.pc).toDex, rpc.user.maxdex)
		rpc.user.cha = PC.ability(rpc.user.cha, PC.card(rpc.user.pc).toCha, rpc.user.maxcha)

        if (eligible && rpc.user.level == sysop.level / 2) {
            bonus = true
            break
        }
    }

	rpc.user.xplevel = rpc.user.level
    award.hp = rpc.user.hp - award.hp
    award.sp = rpc.user.sp - award.sp
    rpc.hp += award.hp
    rpc.sp += award.sp

    i = rpc.user.blessed ? 10 : 0
    i = rpc.user.cursed ? i - 10 : i
    rpc.str = PC.ability(rpc.str, rpc.user.str - award.str, rpc.user.maxstr, i)
    rpc.int = PC.ability(rpc.int, rpc.user.int - award.int, rpc.user.maxint, i)
    rpc.dex = PC.ability(rpc.dex, rpc.user.dex - award.dex, rpc.user.maxdex, i)
    rpc.cha = PC.ability(rpc.cha, rpc.user.cha - award.cha, rpc.user.maxcha, i)
    award.str = rpc.user.str - award.str
    award.int = rpc.user.int - award.int
    award.dex = rpc.user.dex - award.dex
    award.cha = rpc.user.cha - award.cha

    if (rpc != online) return

    sound('level')
    access = Access.name[player.access]
    online.altered = true
    xvt.out('\n')
    xvt.waste(125)
    xvt.out('      ', xvt.magenta, '-=', xvt.blue, '>'
        , xvt.bright, xvt.yellow, '*', xvt.normal
        , xvt.blue, '<', xvt.magenta, '=-\n')
    xvt.waste(125)
    xvt.out('\n')
    xvt.waste(125)
    xvt.out(xvt.bright, xvt.yellow, 'Welcome to level ', player.level.toString(), '!\n', xvt.reset)
    xvt.waste(125)
    xvt.out('\n')
    xvt.waste(125)

    if (player.level < sysop.level) {
        xvt.out(xvt.bright, xvt.white, sprintf('%+6d', award.hp), xvt.reset, ' Hit points\n')
        xvt.waste(125)
        if(award.sp) {
            xvt.out(xvt.bright, xvt.white, sprintf('%+6d', award.sp), xvt.reset, ' Spell points\n')
            xvt.waste(125)
        }
        if(award.str) {
            xvt.out(xvt.bright, xvt.white, sprintf('%+6d', award.str), xvt.reset, ' Strength\n')
            xvt.waste(125)
        }
        if(award.int) {
            xvt.out(xvt.bright, xvt.white, sprintf('%+6d', award.int), xvt.reset, ' Intellect\n')
            xvt.waste(125)
        }
        if(award.dex) {
            xvt.out(xvt.bright, xvt.white, sprintf('%+6d', award.dex), xvt.reset, ' Dexterity\n')
            xvt.waste(125)
        }
        if(award.cha) {
            xvt.out(xvt.bright, xvt.white, sprintf('%+6d', award.cha), xvt.reset, ' Charisma\n')
            xvt.waste(125)
        }
        xvt.out('\n')
        xvt.waste(125)
        if(eligible && bonus) {
            skillplus(rpc)
            return false
        }
    }
    else {
        riddle()
        return true
    }
}

export function skillplus(rpc: active) {

    //  slow-roll endowment choices for a dramatic effect  :)
    xvt.out(xvt.reset, '\n'); xvt.waste(500)
    xvt.out(xvt.bright, xvt.yellow,'+ You earn a gift to endow your character +\n'); xvt.waste(1000)
    xvt.out('\n'); xvt.waste(500)

    if (rpc.user.maxstr < 99 && rpc.user.maxint < 99 && rpc.user.maxdex < 99 && rpc.user.maxcha < 99) {
        xvt.out(bracket(0, false), xvt.yellow, 'Increase ALL abilities by +2\n')
        xvt.waste(100)
    }
    xvt.out(bracket(1, false), xvt.yellow, 'Increase Strength ability from ', xvt.reset
        , rpc.user.maxstr.toString(), ' '
        , rpc.user.maxstr < 90 ? '[WEAK]'
        : rpc.user.maxstr < 95 ? '-Average-'
        : rpc.user.maxstr < 99 ? '=Strong='
        : '#MAX#'
        , '\n'
    ); xvt.waste(100)
    xvt.out(bracket(2, false), xvt.yellow, 'Increase Intellect ability from ', xvt.reset
        , rpc.user.maxint.toString(), ' '
        , rpc.user.maxint < 90 ? '[MORON]'
        : rpc.user.maxint < 95 ? '-Average-'
        : rpc.user.maxint < 99 ? '=Smart='
        : '#MAX#'
        , '\n'
    ); xvt.waste(100)
    xvt.out(bracket(3, false), xvt.yellow, 'Increase Dexterity ability from ', xvt.reset
        , rpc.user.maxdex.toString(), ' '
        , rpc.user.maxdex < 90 ? '[SLOW]'
        : rpc.user.maxdex < 95 ? '-Average-'
        : rpc.user.maxdex < 99 ? '=Swift='
        : '#MAX#'
        , '\n'
    ); xvt.waste(100)
    xvt.out(bracket(4, false), xvt.yellow, 'Increase Charisma ability from ', xvt.reset
        , rpc.user.maxcha.toString(), ' '
        , rpc.user.maxcha < 90 ? '[SURLY]'
        : rpc.user.maxcha < 95 ? '-Average-'
        : rpc.user.maxcha < 99 ? '=Affable='
        : '#MAX#'
        , '\n'
    ); xvt.waste(100)
    xvt.out(bracket(5, false), xvt.yellow, 'Improve Melee skill from ', xvt.reset
        , rpc.user.melee.toString(), 'x '
        , [ '[POOR]', '-Average-', '+Good+', '=Masterful=', '#MAX#' ][rpc.user.melee]
        , '\n'
    ); xvt.waste(100)
    xvt.out(bracket(6, false), xvt.yellow, 'Improve Backstab skill from ', xvt.reset
        , rpc.user.backstab.toString(), 'x '
        , [ '[RARE]', '-Average-', '+Good+', '=Masterful=', '#MAX#' ][rpc.user.backstab]
        , '\n'
    ); xvt.waste(100)
    xvt.out(bracket(7, false), xvt.yellow, 'Improve Poison skill from ', xvt.reset
        , rpc.user.poison.toString(), 'x '
        , [ '[NONE]', '-Average-', '+Good+', '=Masterful=', '#MAX#' ][rpc.user.poison]
        , '\n'
    ); xvt.waste(100)
    if (rpc.user.magic < 2) {
        xvt.out(bracket(8, false), xvt.yellow, 'Improve Magic skill from ', xvt.reset)
        xvt.out([ '[NONE]', '-Wands-' ][rpc.user.magic])
    }
    else {
        xvt.out(bracket(8, false), xvt.yellow, 'Increase Mana power from ', xvt.reset)
        xvt.out([ '+Scrolls+', '=Spells=', '#MAX#' ][rpc.user.magic - 2])
    }
    xvt.out('\n'); xvt.waste(100)
    xvt.out(bracket(9, false), xvt.yellow, 'Improve Stealing skill from ', xvt.reset
        , rpc.user.steal.toString(), 'x '
        , [ '[RARE]', '-Average-', '+Good+', '=Masterful=', '#MAX#' ][rpc.user.steal]
        , '\n'
    ); xvt.waste(100)

    action('list')
    xvt.app.form = {
        'skill': { cb: () => {
            xvt.out('\n', xvt.bright)
            switch(+xvt.entry) {
            case 1:
                news('\tcan get even Stronger.')
                if ((player.maxstr += 10) > 100) player.maxstr = 100
                xvt.out(xvt.red, `Maximum Strength is now ${player.maxstr}.`)
                break

            case 2:
                news('\tcan get even Wiser.')
                if ((player.maxint += 10) > 100) player.maxint = 100
                xvt.out(xvt.green, `Maximum Intellect is now ${player.maxint}.`)
                break

            case 3:
                news('\tcan get even Quicker.')
                if ((player.maxdex += 10) > 100) player.maxdex = 100
                xvt.out(xvt.magenta, `Maximum Dexterity is now ${player.maxdex}.`)
                break

            case 4:
                news('\tcan get even Nicer.')
                if ((player.maxcha += 10) > 100) player.maxcha = 100
                xvt.out(xvt.yellow, `Maximum Charisma is now ${player.maxcha}.`)
                break

            case 5:
                if (player.melee > 3) {
                    xvt.app.refocus()
                    return
                }
                news('\tgot more Powerful.')
                xvt.out([xvt.cyan, xvt.blue, xvt.red, xvt.yellow][player.melee]
                    , [ 'You can finally enter through Tiny\'s front door.'
                      , 'So you want to be a hero, eh?'
                      , 'Just what this world needs, another fighter.'
                      , 'Watch out for blasts, you brute!' ][player.melee++]
                )
                break

            case 6:
                if (player.backstab > 3) {
                    xvt.app.refocus()
                    return
                }
                news('\twatch your Back now.')
                xvt.out([xvt.cyan, xvt.blue, xvt.red, xvt.black][player.backstab]
                    , [ 'A backstab is in your future.'
                      , 'You may backstab more regularly now.'
                      , 'You will deal a more significant, first blow.'
                      , 'What were you doing?  Sneaking.' ][player.backstab++]
                )
                break

            case 7:
                if (player.poison > 3) {
                    xvt.app.refocus()
                    return
                }
                news('\tApothecary visits have more meaning.')
                xvt.out([xvt.cyan, xvt.blue, xvt.red, xvt.magenta][player.poison]
                    , [ 'The Apothecary will see you now, bring money.'
                      , 'Your poisons can achieve 2x its potency now.'
                      , 'Your poisons can achieve 3x its potency now.'
                      , 'Your poisons can achieve 4x its potency now.' ][player.poison++]
                )
                break

            case 8:
                if (player.magic > 3) {
                    xvt.app.refocus()
                    return
                }
                news('\tbecame more friendly with the old mage.')
                switch(player.magic) {
                case 0:
                    xvt.out(xvt.cyan, 'The old mage will see you now, bring money.')
                    player.magic++
                    break
                case 1:
                    xvt.out(xvt.cyan, 'Your wands have turned into scrolls.')
                    player.magic++
                    player.sp += 15 + dice(500)
                    online.sp = player.sp
                    break
                default:
                    xvt.out(xvt.black, 'More mana is better.')
                    player.sp += 512
                    online.sp += 512
                    player.sp += dice(Math.trunc(3583 / player.magic))
                    break
                }
                break

            case 9:
                if (player.steal > 3) {
                    xvt.app.refocus()
                    return
                }
                news('\ttry to avoid in the Square.')
                xvt.out([xvt.cyan, xvt.blue, xvt.red, xvt.black][player.steal]
                    , [ 'Your fingers are starting to itch.'
                      , 'Your eyes widen at the chance for unearned loot.'
                      , 'Welcome to the Thieves guild: go pick a pocket or two!'
                      , 'You\'re convinced that no lock cannot be picked.' ][player.steal++]
                )
                break

            default:
                xvt.app.refocus()
            }
            xvt.out(xvt.reset, '\n')
            xvt.waste(1000)
        }, prompt:'Choose which: ', max:1 }
    }
    xvt.app.focus = 'skill'
}

export function an(item: string) {
    return /a|e|i|o|u/i.test(item[0]) ? 'an ' : 'a '
}

export function cuss(text: string): boolean {
    let words = titlecase(text).split(' ')

    for (var i = 0; i < words.length; i++) {
        if (words[i].match('Asshole|Cock|Cunt|Fck|Fu|Fuc|Fuck|Fuk|Phuc|Phuck|Phuk|Twat'))
            return true
    }

    return false
}

const day: string[] = [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ]
const md: number[] = [ 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334 ]
const mon: string[] = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ]

export function date2days(date: string): number {
    var days: number
	var month: number
    var day: number
    var year: number


    if (date.search('/') > 0) {
        let pieces = date.split('/')
        month = +pieces[0]
        day = +pieces[1]
        year = +pieces[2]
    }
    else if (date.search('-') > 0) {
        let pieces = date.split('/')
        month = +pieces[0]
        day = +pieces[1]
        if (day == 0) {
            day = month
            for(month = 0; month<12 && mon[month].toLowerCase() == pieces[1].substr(0,3).toLowerCase(); month++) {}
            month++
        }
        year = +pieces[2]
    }
    else if (+date > 18991231) {
        year = +date.substr(0,4)
        month = +date.substr(4,2)
        day = +date.substr(6,2)
    }
    else {
        month = +date.substr(0,2)
        day = +date.substr(2,2)
        year = +date.substr(4,4)
    }

    month = (month < 1) ? 1 : (month > 12) ? 12 : month
    day = (day < 1) ? 1 : (day > 31) ? 31: day
    year = (year < 100) ? year + 1900 : year

    if(isNaN(day) || isNaN(month) || isNaN(year))
        return NaN

	days = (year * 365) + Math.trunc(year / 4) + md[month - 1] + (day - 1)
	if((((year % 4) == 0) && (((year % 100) != 0) || ((year % 400) == 0))) && (month < 3))
		days--

    return days
}

//  returns 'Day dd-Mon-yyyy'
export function date2full(days: number): string {
	var date = date2str(days)
	return sprintf('%.3s %.2s-%.3s-%.4s', day[(days - 1) % 7], date.substr(6,2), mon[+date.substr(4,2) - 1], date)
}

//  returns 'yyyymmdd'
export function date2str(days: number): string {
	var month: number
    var day: number
    var year: number

	year = Math.trunc(days / 1461) * 4 + Math.trunc((days % 1461) / 365)
	days = days - ((year * 365) + Math.trunc(year / 4)) + 1
	month = 0

	while(days > md[month+1] - ((((year % 4) == 0) && (((year % 100) != 0) || ((year % 400) == 0))) && month == 0 ? 1 : 0) && month < 11)
		month++

	days -= md[month++]
	day = days
	if((((year % 4) == 0) && (((year % 100) != 0) || ((year % 400) == 0))) && month < 3)
		day++

	return sprintf('%04d%02d%02d', year, month, day)
}

export function dice(faces: number): number {
    return Math.trunc(Math.random() * faces) + 1
}

export function experience(level: number, factor = 1, wisdom = 1000): number {
    // calculate need to accrue based off PC intellect capacity
    if (wisdom < 1000) wisdom = (1100 + level - 2 * wisdom)

    return factor == 1
        ? Math.round(wisdom * Math.pow(2, level - 1))
        : Math.trunc(wisdom * Math.pow(2, level - 2) / factor)
}

export function keyhint(rpc: active) {

    let open = []
    let slot: number
    let i:number

    for (let i in rpc.user.keyhints)
        if (!rpc.user.keyhints[i]) open.push(i)
    if (open.length) {
        do {
            i = open[dice(open.length) - 1]
            slot = Math.trunc(i / 3)
            let key = [ 'P', 'G', 'S', 'C' ][dice(4) - 1]
            if (key !== rpc.user.keyseq[slot]) {
                for (let n = 3 * slot; n < 3 * (slot + 1); n++)
                    if (key === rpc.user.keyhints[n])
                        key = ''
                if (key) player.keyhints[i] = key
            }
        } while(!player.keyhints[i])

        xvt.out(xvt.reset, `Key #${slot + 1} is not `, xvt.bright, xvt.reverse)
        switch (player.keyhints[i]) {
        case 'P':
            xvt.out(xvt.magenta, ' Platinum ')
            break
        case 'G':
            xvt.out(xvt.yellow, ' Gold ')
            break
        case 'S':
            xvt.out(xvt.cyan, ' Silver ')
            break
        case 'C':
            xvt.out(xvt.red, ' Copper ')
            break
        default:
            xvt.out(xvt.black, `${player.keyhints[i]} from here`)
            break
        }
        xvt.out(xvt.reset, '\n')
    }
    else {
        xvt.out(xvt.reset, 'There are no more key hints available to you.\n')
    }
    rpc.altered = true
}

export function money(level: number): number {
    return Math.trunc(Math.pow(2, (level - 1) / 2) * 10 * (101 - level) / 100)
}

export function news(message: string, commit = false) {
    const log = `./tty/files/tavern/${player.id}.log`
    fs.appendFileSync(log, `${message}\n`)

    if (commit) {
        const paper = `./tty/files/tavern/today.txt`
        fs.appendFileSync(paper, fs.readFileSync(log))
        fs.unlink(log)
    }
}

export function now(): {date: number, time: number} {
    let today = date2days(new Date().toLocaleString('en-US').split(',')[0])
    let now = new Date().toTimeString().slice(0,5).replace(/:/g, '')
    return {date: +today, time: +now}
}

export function newkeys(user: user) {
    let keys = [ 'P', 'G', 'S', 'C' ]
    user.keyhints = [ '','','',  '','','',  '','','',  '','','' ]
    user.keyseq = ''
    while (keys.length) {
        let k = dice(keys.length)
        user.keyseq += keys.splice(k - 1, 1)
    }
}

export function playerPC(points = 200, immortal = false) {
    if (points > 256) points = 256
    xvt.out(xvt.reset, '\n')
    xvt.waste(1000)
    if (!Access.name[player.access].roleplay) return

    if (player.novice) {
        let novice: user = { id:'' }
        Object.assign(novice, require('./etc/novice'))
        reroll(player, novice.pc)
        player.coin = new coins(novice.coin.toString())
        player.bank = new coins(novice.bank.toString())
        player.realestate = novice.realestate
        player.security = novice.security
        player.weapon = novice.weapon
        player.armor = novice.armor
        newkeys(player)

        xvt.out('Since you are a new user here, you are automatically assigned a character\n')
        xvt.out('class.  At the Main Menu, press ', bracket('Y', false), ' to see all your character information.')
        show()
        activate(online)
        news(`\trerolled as a ${player.pc}`)
        require('./tty/main').menu(true)
        return
    }

    action('list')
    xvt.app.form = {
        'pc': { cb:pick, min:1, max:2 },
        'str': { cb:ability, min:2, max:2, match:/^[2-8][0-9]$/ },
        'int': { cb:ability, min:2, max:2, match:/^[2-8][0-9]$/ },
        'dex': { cb:ability, min:2, max:2, match:/^[2-8][0-9]$/ },
        'cha': { cb:ability, min:2, max:2, match:/^[2-8][0-9]$/ }
    }

    if (immortal) {
        show()
        ability('str')
        return
    }

    xvt.out('You have been rerolled.  You must pick a class.\n')
    xvt.waste(1000)
    let classes = {}
    let n = 0
    for (let pc in PC.name['player']) {
        if (++n > 2) {
            xvt.out(bracket(n - 2), ' ', pc)
            classes[n - 2] = pc
        }
    }
    xvt.out('\n')
    xvt.app.form['pc'].prompt = 'Enter class (1-' + (n - 2) +'): '
    xvt.app.focus = 'pc'

    function show() {
        xvt.out('\n')
        cat('player/' + player.pc.toLowerCase())
        xvt.out(xvt.bright, xvt.cyan)
        let rpc = PC.card(player.pc)
        for (let l = 0; l < rpc.description.length; l++)
            xvt.out(rpc.description[l], '\n')
        xvt.out(xvt.reset)
    }

    function pick() {
        let n: number = +xvt.entry
        if (!xvt.validator.isInt(n)) {
            xvt.beep()
            xvt.app.refocus()
            return
        }
        if (n < 1 || n > Object.keys(classes).length) {
            xvt.beep()
            xvt.app.refocus()
            return
        }
        reroll(player, classes[n])
        show()
        ability('str')
    }

    function ability(field?: string) {
        if (xvt.validator.isNotEmpty(field)) {
            xvt.out('\n', xvt.yellow, 'You have ', xvt.bright, points.toString(), xvt.normal, ' points to distribute between 4 abilities: Strength, Intellect,\n')
            xvt.out('Dexterity, Charisma.  Each ability must be between ', xvt.bright, '20', xvt.normal, ' and ', xvt.bright, '80', xvt.normal, ' points.\n')
            xvt.app.form[field].enter = player.str.toString()
            xvt.app.form[field].prompt = 'Enter your Strength  ' + bracket(player.str, false) + ': '
            xvt.app.focus = field
            return
        }

        let n: number = +xvt.entry
        if (!xvt.validator.isInt(n)) {
            xvt.beep()
            xvt.app.refocus()
            return
        }
        if (n < 20 || n > 80) {
            xvt.beep()
            xvt.app.refocus()
            return
        }

        let left = points
        let p = xvt.app.focus

        switch(p) {
            case 'str':
                left -= n
                player.str = n
                p = 'int'
                xvt.app.form[p].prompt = 'Enter your Intellect'
                xvt.app.form[p].enter = player.int.toString()
                break

            case 'int':
                left -= player.str + n
                player.int = n
                p = 'dex'
                xvt.app.form[p].prompt = 'Enter your Dexterity'
                xvt.app.form[p].enter = player.dex.toString()
                break

            case 'dex':
                left -= player.str + player.int + n
                if (left < 20 || left > 80) {
                    xvt.beep()
                    reroll(player, player.pc)
                    ability('str')
                    return
                }
                player.dex = n
                p = 'cha'
                xvt.app.form[p].prompt = 'Enter your Charisma'
                xvt.app.form[p].enter = left.toString()
                break

            case 'cha':
                left -= player.str + player.int + player.dex + n
                if (left) {
                    xvt.beep()
                    reroll(player, player.pc)
                    ability('str')
                    return
                }
                player.cha = n
                activate(online)
                xvt.out('\n')
                news(`\trerolled as a ${player.pc}`)
                if (immortal) {
                    reason = `ascended to an immortal class`
                    xvt.hangup()
                }
                require('./tty/main').menu(true)
                return
        }

        xvt.out('\n\nYou have ', left.toString(), ' ability points left.\n')
        xvt.app.form[p].prompt += ' ' + bracket(xvt.app.form[p].enter, false) + ': '
        xvt.app.focus = p
    }
}

export function remake(user: user) {
    user.xplevel = user.level
    let rpc = PC.card(user.pc)
    for (let n = 2; n < user.level; n++) {
        if (n == 50 && user.id[0] !== '_' && user.gender !== 'I') {
            xvt.out(xvt.reset, xvt.bright, xvt.yellow, '+', xvt.reset, ' Bonus ')
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
                    xvt.out('Strength')
                    break
                case 2:
                    if ((user.maxint += 10) > 99)
                        user.maxint = 99
                    xvt.out('Intellect')
                    break
                case 3:
                    if ((user.maxdex += 10) > 99)
                        user.maxdex = 99
                    xvt.out('Dexterity')
                    break
                case 4:
                    if ((user.maxcha += 10) > 99)
                        user.maxcha = 99
                    xvt.out('Charisma')
                    break
                case 5:
                    user.melee++
                    xvt.out('Melee')
                    break
                case 6:
                    user.backstab++
                    xvt.out('Backstab')
                    break
                case 7:
                    user.poison++
                    xvt.out('Poison')
                    break
                case 8:
                    if(user.magic < 4)
                        user.magic++
                    xvt.out('Spellcasting')
                    break
                case 9:
                    user.steal++
                    xvt.out('Stealing')
                    break
            }
            xvt.out(' awarded ', xvt.bright, xvt.yellow, '+', xvt.reset, '\n')
        }
        if ((user.str += rpc.toStr) > user.maxstr)
            user.str = user.maxstr
        if ((user.int += rpc.toInt) > user.maxint)
            user.int = user.maxint
        if ((user.dex += rpc.toDex) > user.maxdex)
            user.dex = user.maxdex
        if ((user.cha += rpc.toCha) > user.maxcha)
            user.cha = user.maxcha
        user.hp += n + dice(n) + Math.trunc(user.str / 10)
        if(user.magic > 1)
            user.sp += n + dice(n) + Math.trunc(user.int / 10)
    }
}

export function reroll(user: user, dd?: string, level = 1) {
    //  reset essential character attributes
    user.level = level
    user.pc = dd ? dd : Object.keys(PC.name['player'])[0]
    user.status = ''

    let rpc = PC.card(user.pc)
    user.melee = rpc.melee
    user.backstab = rpc.backstab
    user.poison = rpc.poison
    user.magic = rpc.magic
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

    //  reset for new or non player
    if(xvt.validator.isEmpty(user.id) || user.id[0] === '_') {
        if (isNaN(user.dob)) user.dob = now().date
        if (isNaN(user.joined)) user.joined = now().date
        user.lastdate = now().date
        user.lasttime = now().time
        user.gender = user.sex

        user.emulation = xvt.emulation
        user.calls = 0
        user.today = 0
        user.expert = false
        user.rows = 25
        user.remote = ''
        user.novice = true
        user.gang = ''
        user.wins = 0
        user.immortal = 0
        user.rating = 0

        user.coin = new coins(0)
        user.bank = new coins(0)
        user.loan = new coins(0)
        user.bounty = new coins(0)
        user.who = ''
        user.security = ''
        user.realestate = ''
    }

    if (level == 1) {
        Object.assign(user, require('./etc/reroll'))
        user.coin = new coins(user.coin.toString())
        user.bank = new coins(user.bank.toString())
        user.loan = new coins(0)
        user.gender = user.sex
        //  force a verify if their access allows it
        // if (!user.novice && !Access.name[player.access].sysop) user.email = ''
    }

    if (level == 1 || xvt.validator.isEmpty(user.id) || user.id[0] === '_') {
        //  no extra free or augmented stuff
        user.poisons = []
        user.spells = []
        user.toAC = 0
        user.toWC = 0
        user.hull = 0
        user.cannon = 0
        user.ram = false
        user.blessed = ''
        user.cursed = ''
        user.coward = false
        user.plays = 0
        user.jl = 0
        user.jw = 0
        user.killed = 0
        user.kills = 0
        user.retreats = 0
        user.tl = 0
        user.tw = 0
    }

    remake(user)
}

// the Ancient Riddle of the Keys
export function riddle() {
    if (player.novice) {
        xvt.out(xvt.reset, '\nYou are no longer a novice.  Welcome to the next level of play.\n\n')
        player.novice = false
        xvt.waste(2000)
    }
    xvt.out(xvt.magenta, 'Checking your statistics against All-Time Fame/Lame lists...\n')
    xvt.out(xvt.blue, 'Checking your statistics against the ', player.pc,' Fame/Lame lists...\n')

    xvt.out(xvt.bright, xvt.cyan, '\nYou have become so powerful that you are now immortal and you leave your \n')
    xvt.out('worldly possessions behind.\n')
    loadUser(taxman)
    taxman.user.bank.value +=  player.bank.value + player.coin.value
    saveUser(taxman)
    xvt.waste(2000)

    player.calls = 0
    player.immortal++

    let max = Object.keys(PC.name['immortal']).indexOf(player.pc) + 1
    if (max > 2 || player.pc === PC.winning) {
        player.wins++
        saveUser(player)
        reroll(player)
        reason = 'WON THE GAME !!'

        sysop.dob = now().date + 1
        saveUser(sysop)

        xvt.out(xvt.bright, xvt.yellow, 'CONGRATULATIONS!!'
            , xvt.reset, '  You have won the game!\n'
        )
        xvt.out(xvt.yellow, 'The board will now be reset... ')
        let rs = query(`SELECT id FROM Players WHERE id NOT GLOB '_*'`)
        let user: user = { id:'' }
        for (let row in rs) {
            user.id = rs[row].id
            loadUser(user)
            reroll(user)
            saveUser(user)
        }
        xvt.out('Happy Hunting!\n')
        xvt.hangup()
    }

    xvt.out(xvt.green, `\nOl' Mighty One!  Solve the Ancient Riddle of the Keys and you will become\n`)
    xvt.out(`an immortal being.\n\n`)

    let slot: number
    for (let i in player.keyhints) {
        if (player.keyhints[i]) {
            slot = Math.trunc(+i / 3) + 1
            xvt.out(xvt.reset, `Key #${slot} is not `, xvt.bright, xvt.reverse)
            switch (player.keyhints[i]) {
            case 'P':
                xvt.out(xvt.magenta, ' Platinum ')
                break
            case 'G':
                xvt.out(xvt.yellow, ' Gold ')
                break
            case 'S':
                xvt.out(xvt.cyan, ' Silver ')
                break
            case 'C':
                xvt.out(xvt.red, ' Copper ')
                break
            default:
                xvt.out(xvt.black, `${player.keyhints[i]} from here`)
                break
            }
            xvt.out(xvt.reset, '.\n')
        }
    }

    for (let i = 0; i <= max; i++)
        keyhint(online)

    action('riddle')
    xvt.app.form = {
        'key': { cb:() => {
            xvt.out(' ...you insert and twist the key... ')
            xvt.waste(1000)
            if (xvt.entry.toUpperCase() === player.keyseq[slot]) {
                sound('max')
                xvt.out(xvt.cyan, '{', xvt.bright, 'Click!', xvt.normal, '}\n')
                player.pc = Object.keys(PC.name['immortal'])[slot]
                profile({ png:'player/' + player.pc.toLowerCase() + (player.gender === 'F' ? '_f' : ''), pc:player.pc })
                xvt.out(xvt.bright, [ xvt.cyan, xvt.blue, xvt.magenta ][slot], `You are now a ${player.pc}.\n`)
                if (slot++ < max) {
                    xvt.app.form['key'].prompt = `Insert key #${slot + 1}? `
                    xvt.app.refocus()
                    return
                }
                reroll(player, player.pc)
                newkeys(player)
                playerPC(200, true)
                return
            }
            else {
                sound('thunder')
                xvt.out(xvt.bright, xvt.black, '^', xvt.white, 'Boom!', xvt.black, '^\n')
                if (slot == 0) {
                    for (let i = 3 * slot; i < 3 * (slot + 1); i++)
                        if (!player.keyhints[i]) {
                            player.keyhints[i] = xvt.entry.toUpperCase()
                            break
                        }
                    reroll(player, Object.keys(PC.name['player'])[0])
                    playerPC(200 + 10 * player.wins + (player.immortal>>1))
                }
                else {
                    reroll(player, player.pc)
                    newkeys(player)
                    playerPC(200, true)
                }
                return
            }
        }, eol:false, match:/P|G|S|C/i }
    }
    slot = 0
    xvt.app.form['key'].prompt = `Insert key #${slot + 1}? `
    xvt.app.focus = 'key'
}

//  Player Character
export function spawn(dungeon: dungeon, level?: number): void {

    this.name = dungeon.name
    this.str = this.player.baseStr
    this.int = this.player.baseInt
    this.dex = this.player.baseDex
    this.cha = this.player.baseCha

    if (level > 0) {
        this.level = level
    }
    this.hp = 10
    if (this.player.magic) this.sp = 10
}

export function time(t: number): string {
    const ap = t < 1200 ? 'am' : 'pm'
    const m = t % 100
    const h = Math.trunc((t < 100 ? t + 1200 : t >= 1300 ? t - 1200 : t) / 100)
    return sprintf('%u:%02u%s', h, m, ap)
}

export function titlecase(orig: string): string {
    return titleCase(orig)
}

export function what(rpc: active, action: string): string {
    return action + (rpc != online ? (/.*ch$|.*sh$|.*s$/i.test(action) ? 'es ' : 's ') : ' ')
}

export function who(rpc: active, word: string): string {
    let result = {
        He:  { M:'He ',   F:'She ',  I:'It ',   U:'You ' },
        His: { M:'His ',  F:'Her ',  I:'Its ',  U:'Your ' },
        he:  { M:'he ',  F:'she ', I:'it ',  U:'you ' },
        him: { M:'him ',  F:'her ',  I:'it ',   U:'you ' },
        his: { M:'his ', F:'her ', I:'its ', U:'your ' }
    }

    let gender = rpc == online ? 'U' : rpc.user.gender
    return result[word][gender]
}

export function worth(n: number, p: number): number {
    return Math.trunc(n * p / 100)
}

export function beep() {
    if (xvt.emulation === 'XT')
        sound('max')
    else
        xvt.beep()
}

export function bracket(item: number|string, nl = true): string {
    var framed: string = item.toString()
    framed = xvt.attr(xvt.reset, xvt.faint, nl ? '\n' : ''
        , framed.length == 1 && nl ? ' ' : ''
        , '<', xvt.bright, framed, xvt.faint, '>'
        , nl ? ' ' : '', xvt.reset)
    return framed
}

export function buff(perm: number, temp:number, text = false): string {
    let keep = xvt.emulation
    if (text) xvt.emulation = 'dumb'
    let buff = ''
    if (perm || temp) {
        buff = xvt.attr(xvt.normal, xvt.magenta, ' (')
        if (perm > 0) buff += xvt.attr(xvt.bright, xvt.yellow, '+', perm.toString())
        else if (perm < 0) buff += xvt.attr(xvt.bright, xvt.red, perm.toString())
        else buff += xvt.attr(xvt.normal, xvt.white, '+0')
        buff += xvt.attr(xvt.normal, xvt.white, ',')
        if (temp > 0) buff += xvt.attr(xvt.bright, xvt.yellow, '+', temp.toString())
        else if (temp < 0) buff += xvt.attr(xvt.bright, xvt.red, temp.toString())
        else buff += xvt.attr(xvt.normal, xvt.white, '+0')
        buff += xvt.attr(xvt.normal, xvt.magenta, ')', xvt.white)
    }
    if (text) xvt.emulation = keep
    return buff
}

export function	cat(filename: string): boolean {
    const folder = './tty/files/'
    let path = folder + filename + (xvt.emulation.match('PC|XT') ? '.ans' : '.txt')

    try {
        fs.accessSync(path, fs.constants.F_OK)
        xvt.out(fs.readFileSync(path), xvt.reset)
        return true
    } catch (e) {
        if (xvt.emulation.match('PC|XT')) {
            let path = folder + filename + '.txt'
            try {
                fs.accessSync(path, fs.constants.F_OK)
                xvt.out(fs.readFileSync(path), xvt.reset)
                return true
            } catch (e) {
                return false
            }
        }
    }
}

//  render a menu of options and return the prompt
export function display(title:string, back:number, fore:number, suppress:boolean, menu:choices): string {
    menu['Q'] = {}  //  Q=Quit
    if(!suppress) {
        xvt.out(xvt.reset, xvt.clear)
        if (!cat(title)) {
            xvt.out('    ')
            if(back)
                xvt.out(fore, '--=:))', xvt.LGradient[xvt.emulation],
                    back, xvt.bright, xvt.white, titlecase(title), xvt.reset,
                    fore, xvt.RGradient[xvt.emulation], '((:=--')
            else
                xvt.out(titlecase(title))
            xvt.out(xvt.reset, '\n\n')
            for (let i in menu) {
                if (xvt.validator.isNotEmpty(menu[i].description))
                    xvt.out(xvt.faint, fore, '<', xvt.bright, xvt.white, i, xvt.faint, fore, '> ',
                        xvt.reset, menu[i].description , '\n')
            }
        }
    }
    return xvt.attr(fore, '[', xvt.bright, xvt.yellow, back ? titlecase(title) : 'Iron Bank', xvt.normal, fore, ']', xvt.cyan, ' Option (Q=Quit): ')
}

export function emulator(cb:Function) {
    action('list')
    xvt.app.form = {
        'term': { cb:() => {
            if (xvt.validator.isNotEmpty(xvt.entry) && xvt.entry.length == 2) xvt.emulation = xvt.entry.toUpperCase()
            sound('max')
            xvt.out('\n\n', xvt.reset, xvt.magenta, xvt.LGradient[xvt.emulation], xvt.reverse, 'TEST BANNER', xvt.off, xvt.RGradient[xvt.emulation], '\n')
            xvt.out(xvt.red,'R', xvt.green,'G', xvt.blue,'B', xvt.reset, xvt.bright,' bold ', xvt.off, 'normal', xvt.faint, ' dark')
            xvt.out(xvt.reset, '\n')
            xvt.waste(2000)
            for(let rows = 99; rows > 1; rows--)
                xvt.out(bracket(rows > 24 ? rows : '..'))
            xvt.app.focus = 'rows'
        }, prompt:'Select: ', enter:player.emulation, match:/VT|PC|XT/i, max:2 },
        'rows': { cb:() => {
            online.altered = true
            player.emulation = xvt.emulation
            player.rows = +xvt.entry
            xvt.out(xvt.reset, '\n')
            xvt.app.focus = 'pause'
        }, prompt:'Enter top visible row number: ', enter:player.rows.toString(), max:2, match:/^[2-9][0-9]$/ },
        'pause': { cb:cb, pause:true }
    }

    xvt.out('\n', xvt.cyan, 'Which emulation / character encoding are you using?\n')
    xvt.out(bracket('VT'), ' classic VT terminal with DEC drawing')
    xvt.out(bracket('PC'), ' former ANSI color with IBM encoding')
    xvt.out(bracket('XT'), ' modern ANSI color with UTF-8 encoding\n')
    xvt.app.focus = 'term'
}

export function logoff() {
    if (reason === '') reason = (xvt.reason ? xvt.reason : 'mystery')
    if (xvt.validator.isNotEmpty(player.id)) {
        if (reason !== '') {
            sound('goodbye')
            player.lasttime = now().time
            if (access.roleplay) {
                saveUser(player)
                unlock(player.id)
            }

            try { callers = require('./users/callers') } catch(e) {}
            while (callers.length > 7)
                callers.pop()
            callers = [<caller>{who: player.handle, reason: reason}].concat(callers)
            fs.writeFileSync('./users/callers.json', JSON.stringify(callers))

            news(`\tlogged off ${time(player.lasttime)} as a level ${player.level} ${player.pc}`)
            news(`\t(${reason})\n`, true)
        }
        //  logoff banner
        xvt.out('\n')
        xvt.out(xvt.reset, 'Goodbye, please play again!  Also visit:\n')
        xvt.waste(750)
        xvt.out(xvt.cyan, '  ___                           ', xvt.cyan, '  ___  \n')
        xvt.out(xvt.cyan, '  \\_/  ', xvt.red, xvt.LGradient[xvt.emulation], xvt.bright, xvt.Red, xvt.white, 'Never Program Mad', xvt.reset, xvt.red, xvt.RGradient[xvt.emulation], xvt.cyan, '  \\_/  \n')
        xvt.out(xvt.cyan, ' _(', xvt.bright, '-', xvt.normal, ')_    ', xvt.reset, '     npmjs.com        ', xvt.cyan, ' _(', xvt.bright, '-', xvt.normal, ')_ \n')
        xvt.out(xvt.cyan, '(/ ', xvt.bright, ':', xvt.normal, ' \\)                         ', xvt.cyan, '(/ ', xvt.bright, ':', xvt.normal, ' \\)\n')
        xvt.out(xvt.cyan, 'I\\___/I ', xvt.green, xvt.LGradient[xvt.emulation], xvt.bright, xvt.Green, xvt.white, 'CommodoreServer', xvt.reset, xvt.green, xvt.RGradient[xvt.emulation], xvt.cyan, ' I\\___/I\n')
        xvt.out(xvt.cyan, '\\/   \\/  ', xvt.reset, ' commodoreserver.com   ', xvt.cyan, '\\/   \\/\n')
        xvt.out(xvt.cyan, ' \\ : /                          ', xvt.cyan, ' \\ : / \n')
        xvt.out(xvt.cyan, '  I:I    ', xvt.blue, xvt.LGradient[xvt.emulation], xvt.bright, xvt.Blue, xvt.white, 'Robert Hurst', xvt.reset, xvt.blue, xvt.RGradient[xvt.emulation], xvt.cyan, '     I:I  \n')
        xvt.out(xvt.cyan, ' .I:I.  ', xvt.reset, '  robert.hurst-ri.us    ', xvt.cyan, ' .I:I. \n')
        xvt.out(xvt.reset, '\n')
        xvt.waste(500)
        xvt.out(xvt.bright, xvt.black, process.title
            , xvt.normal, xvt.white, xvt.validator.isNotEmpty(process.env.npm_package_version) ? ' ' + process.env.npm_package_version : ''
            , ' running on ', xvt.bright, xvt.green, 'Node.js ', xvt.normal, process.version, ' '
            , xvt.bright, xvt.black, '(', xvt.normal, xvt.cyan, process.platform, xvt.bright, xvt.black, ')'
            , xvt.reset, '\n'
        )
        xvt.waste(2000)
        music(online.hp > 0 ? 'logoff' : 'death')
    }
}

export function action(menu: string) {
    if (!xvt.modem) return
    xvt.out('@action(', menu, ')')
}

export function music(tune: string) {
    if (!xvt.modem) return
    xvt.out('@tune(', tune, ')')
}

export function profile(params) {
    if (!xvt.modem) return
/*
    let result = { }
    params.forEach(x => {
        const a = x.split('=')
        result[a[0]] = a[1]
    })
*/
    xvt.out('@profile(', JSON.stringify(params), ')')
}

export function sound(effect: string, sync = 2) {
    if (!xvt.modem) return
    xvt.out('@play(', effect, ')')
    xvt.waste(sync * 100)
}

/***********
 *  DATABASE support functions
 ***********/
    const users = './users/'
    if(!fs.existsSync(users))
        fs.mkdirSync(users)

    //  https://github.com/JayrAlencar/sqlite-sync.js/wiki
    const DD = users + 'dankdomain.sql'
    let better = require('better-sqlite3')
    let sqlite3 = new better(DD)
    let rs = query(`SELECT * FROM sqlite_master WHERE name='Online' AND type='table'`)
    if (!rs.length) {
        xvt.out('initializing online ... ')
        sqlite3.exec(`CREATE TABLE IF NOT EXISTS Online (id text PRIMARY KEY, pid numeric, lockdate numeric, locktime numeric)`)

        xvt.out('done.\n')
        xvt.waste(250)
    }

    rs = query(`SELECT * FROM sqlite_master WHERE name='Players' AND type='table'`)
    if (!rs.length) {
        xvt.out('initializing players ... ')
        sqlite3.exec(`CREATE TABLE IF NOT EXISTS Players (
            id text PRIMARY KEY, handle text UNIQUE NOT NULL, name text NOT NULL, email text, password text NOT NULL,
            dob numeric NOT NULL, sex text NOT NULL, joined numeric, expires numeric, lastdate numeric,
            lasttime numeric, calls numeric, today numeric, expert integer, emulation text NOT NULL,
            rows numeric, access text NOT NULL, remote text, pc text, gender text,
            novice integer, level numeric, xp numeric, xplevel numeric, status text,
            blessed text, cursed text, coward integer, bounty numeric, who text,
            gang text, keyseq text, keyhints text, melee numeric, backstab numeric,
            poison numeric, magic numeric, steal numeric, hp numeric, sp numeric,
            str numeric, maxstr numeric, int numeric, maxint numeric, dex numeric,
            maxdex numeric, cha numeric, maxcha numeric, coin numeric, bank numeric,
            loan numeric, weapon text, toWC numeric, armor text, toAC numeric,
            spells text, poisons text, realestate text, security text, hull numeric,
            cannon numeric, ram integer, wins numeric, immortal numeric, rating numeric,
          	plays numeric, jl numeric, jw numeric, killed numeric, kills numeric,
            retreats numeric, tl numeric, tw numeric
        )`)

        let npc = <user>{}
        Object.assign(npc, require('./etc/sysop.json'))
        Object.assign(sysop, npc)
        reroll(sysop, sysop.pc, sysop.level)
        sysop.xplevel = 0
        saveUser(sysop, true)

        npc = <user>{}
        Object.assign(npc, require('./etc/barkeep.json'))
        Object.assign(barkeep.user, npc)
        reroll(barkeep.user, barkeep.user.pc, barkeep.user.level)
        //  customize our Master of Whisperers NPC
        if (npc.str) barkeep.user.str = npc.str
        if (npc.int) barkeep.user.int = npc.int
        if (npc.dex) barkeep.user.dex = npc.dex
        if (npc.cha) barkeep.user.cha = npc.cha
        if (npc.hp) barkeep.user.hp = npc.hp
        if (npc.sp) barkeep.user.sp = npc.sp
        if (npc.melee) barkeep.user.melee = npc.melee
        if (npc.poison) barkeep.user.poison = npc.poison
        if (npc.magic) barkeep.user.magic = npc.magic
        if (npc.poisons) barkeep.user.poisons = npc.poisons
        if (npc.spells) barkeep.user.spells = npc.spells
        saveUser(barkeep, true)

        npc = <user>{}
        Object.assign(npc, require('./etc/seahag.json'))
        Object.assign(seahag.user, npc)
        reroll(seahag.user, seahag.user.pc, seahag.user.level)
        //  customize our Queen Bee NPC
        if (npc.str) seahag.user.str = npc.str
        if (npc.int) seahag.user.int = npc.int
        if (npc.dex) seahag.user.dex = npc.dex
        if (npc.cha) seahag.user.cha = npc.cha
        if (npc.hp) seahag.user.hp = npc.hp
        if (npc.sp) seahag.user.sp = npc.sp
        if (npc.melee) seahag.user.melee = npc.melee
        if (npc.poison) seahag.user.poison = npc.poison
        if (npc.magic) seahag.user.magic = npc.magic
        if (npc.poisons) seahag.user.poisons = npc.poisons
        if (npc.spells) seahag.user.spells = npc.spells
        saveUser(seahag, true)

        npc = <user>{}
        Object.assign(npc, require('./etc/taxman.json'))
        Object.assign(taxman.user, npc)
        reroll(taxman.user, taxman.user.pc, taxman.user.level)
        //  customize our Master of Coin NPC
        if (npc.str) taxman.user.str = npc.str
        if (npc.int) taxman.user.int = npc.int
        if (npc.dex) taxman.user.dex = npc.dex
        if (npc.cha) taxman.user.cha = npc.cha
        if (npc.hp) taxman.user.hp = npc.hp
        if (npc.sp) taxman.user.sp = npc.sp
        if (npc.melee) taxman.user.melee = npc.melee
        if (npc.poison) taxman.user.poison = npc.poison
        if (npc.magic) taxman.user.magic = npc.magic
        if (npc.poisons) taxman.user.poisons = npc.poisons
        if (npc.spells) taxman.user.spells = npc.spells
        taxman.user.xplevel = 0
        saveUser(taxman, true)

        xvt.out('done.\n')
        xvt.waste(250)
    }

    rs = query(`SELECT * FROM sqlite_master WHERE name='Gangs' AND type='table'`)
    if (!rs.length) {
        xvt.out('initializing gangs ... ')
        sqlite3.exec(`CREATE TABLE IF NOT EXISTS Gangs (
            name text PRIMARY KEY, banner numeric, members text,
            win numeric, loss numeric
        )`)

        xvt.out('done.\n')
        xvt.waste(250)
    }


function isActive(arg: any): arg is active {
    return (<active>arg).user !== undefined
}

function isUser(arg: any): arg is user {
    return (<user>arg).id !== undefined
}

export function loadKing(): boolean {
    //  King
    let ruler = Object.keys(Access.name).slice(-1)[0]
    rs = <user[]>query(`SELECT id FROM Players WHERE access = '${ruler}'`)
    if (rs.length) {
        king.id = rs[0].id
        return loadUser(king)
    }
    //  Queen
    ruler = Object.keys(Access.name).slice(-2)[0]
    rs = <user[]>query(`SELECT id FROM Players WHERE access = '${ruler}'`)
    if (rs.length) {
        king.id = rs[0].id
        return loadUser(king)
    }
    return false
}

export function loadUser(rpc): boolean {
    let user: user = isActive(rpc) ? rpc.user : rpc
    let sql = 'SELECT * FROM Players WHERE '
    if (user.handle) user.handle = titlecase(user.handle)
    sql += (user.id) ? `id = '${user.id.toUpperCase()}'` : `handle = '${user.handle}'`

    rs = query(sql)
    if (rs.length) {
        Object.assign(user, rs[0])
        user.coin = new coins(rs[0].coin)
        user.bank = new coins(rs[0].bank)
        user.loan = new coins(rs[0].loan)
        user.bounty = new coins(rs[0].bounty)

        user.keyhints = rs[0].keyhints.split(',')

        user.poisons = []
        if (rs[0].poisons.length) {
            let vials = rs[0].poisons.split(',')
            for (let i = 0; i < vials.length; i++)
                Poison.add(user.poisons, vials[i])
        }

        user.spells = []
        if (rs[0].spells.length) {
            let spells = rs[0].spells.split(',')
            for (let i = 0; i < spells.length; i++)
                Magic.add(user.spells, spells[i])
        }

        if (isActive(rpc)) activate(rpc)
        return true
    }
    else {
        user.id = ''
        return false
    }
}

export function saveUser(rpc, insert = false) {

    let user: user = isActive(rpc) ? rpc.user : rpc

    if (xvt.validator.isEmpty(user.id)) return
    if (user.id === player.id || user.id[0] === '_') {
        let trace = users + user.id + '.json'
        if (reason === '')
            fs.writeFileSync(trace, JSON.stringify(user, null, 2))
        else
            fs.unlink(trace , () => {})
    }

    let sql: string = ''
try {
    if (insert) {
        sql = `INSERT INTO Players 
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
            , spells, poisons, realestate, security, hull
            , cannon, ram, wins, immortal, rating
          	, plays, jl, jw, killed, kills
            , retreats, tl, tw
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
            ,'${user.spells.toString()}', '${user.poisons.toString()}', '${user.realestate}', '${user.security}', ${user.hull}
            , ${user.cannon}, ${+user.ram}, ${user.wins}, ${user.immortal}, ${user.rating}
          	, ${user.plays}, ${user.jl}, ${user.jw}, ${user.killed}, ${user.kills}
            , ${user.retreats}, ${user.tl}, ${user.tw}
            )`
    }
    else {
        sql = `UPDATE Players SET
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
            spells='${user.spells.toString()}', poisons='${user.poisons.toString()}', realestate='${user.realestate}', security='${user.security}', hull=${user.hull},
            cannon=${user.cannon}, ram=${+user.ram}, wins=${user.wins}, immortal=${user.immortal}, rating=${user.rating},
          	plays=${user.plays}, jl=${user.jl}, jw=${user.jw}, killed=${user.killed}, kills=${user.kills},
            retreats=${user.retreats}, tl=${user.tl}, tw=${user.tw}
            WHERE id='${user.id}'
        `
    }
    sqlite3.exec(sql)
    if (isActive(rpc)) rpc.altered = false
} catch(err) {
        xvt.beep()
        xvt.out(xvt.reset, '\n?Unexpected error: ', String(err), '\n')
        xvt.out(sql, '\n')
        reason = 'defect - ' + err.code
        xvt.hangup()
    }

    sql = users + user.id + '.sql'
    if (process.platform === 'linux') {
        require('child_process').exec(`
            sqlite3 ${DD} <<-EOD
            .mode insert
            .output ${sql}
            select * from Players where id = '${user.id}';
            EOD
        `)
    }
}

export function newDay() {
    xvt.out('\nOne moment.')
    sysop.lastdate = now().date
    sysop.lasttime = now().time
    saveUser(sysop)

    sqlite3.exec(`UPDATE Players SET bank=bank+coin, coin=0 WHERE id NOT GLOB '_*'`)

    let rs = sqlite3.prepare(`SELECT id, lastdate FROM Players WHERE id NOT GLOB '_*'`).all()
    for (let row in rs) {
        if ((now().date - rs[row].lastdate) > 365) {
            sqlite3.exec(`DELETE FROM Players WHERE id = '${rs[row].id}'`)
            continue
        }
        if ((now().date - rs[row].lastdate) % 100 == 0) {
            player.id = rs[row].id
            loadUser(player)
            require('./email').rejoin()
        }
    }

    try {
        fs.renameSync('./tty/files/tavern/today.txt', './tty/files/tavern/yesterday.txt')
    } catch (e) {
    }
    
    xvt.out('\nAll set -- thank you!\n')
    xvt.waste(500)
}

export function lock(id: string): boolean {
    try {
        sqlite3.exec(`INSERT INTO Online (id, pid, lockdate, locktime) VALUES ('${id}', ${process.pid}, ${now().date}, ${now().time})`)
        return true
    }
    catch(err) {
        if (err.code !== 'SQLITE_CONSTRAINT_PRIMARYKEY') {
            xvt.beep()
            xvt.out(xvt.reset, '\n?Unexpected error: ', String(err), '\n')
            reason = 'defect - ' + err.code
            xvt.hangup()
            }
        return false
    }
}

export function unlock(id: string): number {
    return sqlite3.prepare(`DELETE FROM Online WHERE id = '${id}'`).run().changes
}

export function query(q: string, errOk = false): any {
    try {
        let cmd = sqlite3.prepare(q)
        return cmd.all()
    }
    catch(err) {
        if (!errOk) {
            xvt.beep()
            xvt.out(xvt.reset, '\n?Unexpected error:', String(err), '\n')
            xvt.out(q)
            reason = 'defect - ' + err.code
            xvt.hangup()
        }
        return []
    }
}

}

export = Common
