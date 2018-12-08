/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  COMMON authored by: Robert Hurst <theflyingape@gmail.com>                *
\*****************************************************************************/

import fs = require('fs')
import {sprintf} from 'sprintf-js'
import titleCase = require('title-case')

import xvt = require('xvt')
import Items = require('./items')
import { user } from './battle';


module Common
{
    //  items
    export const Access = new Items.Access
    export const Armor = new Items.Armor
    export const Deed = new Items.Deed
    export const Magic = new Items.Magic
    export const Poison = new Items.Poison
    export const Ring = new Items.Ring
    export const RealEstate = new Items.RealEstate
    export const Security = new Items.Security
    export const Weapon = new Items.Weapon

    //  maintain usual suspects
    export let barkeep: active = { user: { id:'_BAR'} }
    export let neptune: active = { user: { id:'_NEP'} }
    export let seahag: active = { user: { id:'_OLD'} }
    export let taxman: active = { user: { id:'_TAX'} }
    export let king: user = { id:'' }
    export let online: active = { user: { id:'' } }
    export let player: user = online.user
    export let sysop: user = { id:'_SYS' }

    //  player runtime features
    export let access: access
    export let arena: number = 0
    export let bail: number = 0
    export let brawl: number = 0
    export let dungeon: number = 0
    export let joust: number = 0
    export let jumped: number = 0
    export let naval: number = 0
    export let party: number = 0
    export let realestate: number = 0
    export let security: number = 0
    export let steal: number = 0
    export let tiny: number = 0

    export let callers: caller[] = []
    export let mydeeds: deed[]
    export let reason: string = ''
    export let whereis = {}

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
        ability = ability > max ? max : ability < 20 ? 20 : ability
        return ability
    }

    adjust(ability: 'str'|'int'|'dex'|'cha', rt: number, pc = 0, max = 0, rpc = online) {
        if (max) {
            rpc.user[`max${ability}`] = this.ability(rpc.user[`max${ability}`], max, 99)
            rpc.altered = true
        }
        if (pc) {
            rpc.user[ability] = this.ability(rpc.user[ability], pc, rpc.user[`max${ability}`])
            rpc.altered = true
        }
        if (rt) {
            let mod = rpc.user.blessed ? 10 : 0
            mod -= rpc.user.cursed ? 10 : 0
            rpc[ability] = this.ability(rpc[ability], rt, rpc.user[`max${ability}`], mod)
        }
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

    encounter(where = '', lo = 2, hi = 99): active {
        lo = lo < 2 ? 2 : lo > 99 ? 99 : lo
        hi = hi < 2 ? 2 : hi > 99 ? 99 : hi

        let rpc = <active>{ user:{id:''} }
        let rs = query(`SELECT id FROM Players WHERE id != '${player.id}'
            AND xplevel BETWEEN ${lo} AND ${hi}
            ${where} ORDER BY level`)
        if (rs.length) {
            let n = dice(rs.length) - 1
            rpc.user.id = rs[n].id
            loadUser(rpc)
        }
        return rpc
    }

    jousting(rpc: active): number {
        return Math.round(rpc.dex * rpc.user.level / 10 + 2 * rpc.user.jw - rpc.user.jl + 10)
    }

    profile(rpc: active, effect = 'fadeInLeft') {
        if (rpc.user.id) {
            let userPNG = `door/static/images/user/${rpc.user.id}.png`
            try {
                fs.accessSync(userPNG, fs.constants.F_OK)
                userPNG = `user/${rpc.user.id}`
            } catch(e) {
                userPNG = 'player/' + rpc.user.pc.toLowerCase() + (rpc.user.gender === 'F' ? '_f' : '')
            }
            Common.profile({ png:userPNG, handle:rpc.user.handle, level:rpc.user.level, pc:rpc.user.pc, effect:effect })
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
            let i = dice(this.total - 1) + 1    //  any (except None and Novice)
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
        Common.action('clear')
        this.profile(profile)

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

        i = 30 - Access.name[profile.user.access][profile.user.sex].length
        n = 11 + i / 2
        xvt.out(xvt.blue, '|', xvt.Blue, xvt.white, space.slice(0, n))
        xvt.out('"', Access.name[profile.user.access][profile.user.sex], '"')
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
        xvt.out(sprintf('%-20s', profile.user.immortal + '.' + profile.user.level + ` (${profile.user.calls})`))
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
        xvt.out(sprintf('%-15s', ['lawful', 'desperate', 'trickster', 'adept', 'master'][profile.user.steal]))
        xvt.out(' ', xvt.reset, xvt.blue, '|\n')

        xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.cyan)
        xvt.out('       HP: ', xvt.white)
        xvt.out(sprintf('%-42s', profile.hp + '/' + profile.user.hp + ' (' 
            + ['weak', 'normal', 'adept', 'warrior', 'brute', 'hero'][profile.user.melee] + ', '
            + ['a rare', 'occasional', 'deliberate', 'angry', 'murderous'][profile.user.backstab] + ' backstab)'))
        xvt.out(' ', xvt.reset, xvt.blue, '|\n')

        if (profile.user.magic > 1) {
            xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.cyan)
            xvt.out('       SP: ', xvt.white)
            xvt.out(sprintf('%-42s', profile.sp + '/' + profile.user.sp + ' (' + ['wizardry', 'arcane', 'divine'][profile.user.magic - 2] + ')'))
            xvt.out(' ', xvt.reset, xvt.blue, '|\n')
        }

        if (profile.user.magic && profile.user.spells.length) {
            xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.cyan)
            xvt.out(sprintf(' %8s: ', ['Wands', 'Scrolls', 'Spells', 'Magus'][profile.user.magic - 1]), xvt.white)
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

        if (profile.user.poison && profile.user.poisons.length) {
            xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.cyan)
            xvt.out(sprintf(' %8s: ', ['Toxins', 'Poisons', 'Banes', 'Venena'][profile.user.poison - 1]), xvt.white)
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

        xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.cyan)
        xvt.out(' Brawling: ', xvt.white)
        xvt.out(sprintf('%-42s', profile.user.tw + ':' + profile.user.tl))
        xvt.out(' ', xvt.reset, xvt.blue, '|\n')

        xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.cyan)
        xvt.out(' Jousting: ', xvt.white)
        xvt.out(sprintf('%-20s', profile.user.jw + ':' + profile.user.jl + ` (${this.jousting(profile)})`))
        xvt.out(xvt.cyan, 'Plays: ', xvt.white)
        xvt.out(sprintf('%-15s', profile.user.plays))
        xvt.out(' ', xvt.reset, xvt.blue, '|\n')

        xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.cyan)
        xvt.out('    Kills: ', xvt.white)
        xvt.out(sprintf('%-42s', profile.user.kills + ' with ' + profile.user.retreats + ' retreats and killed ' + profile.user.killed +'x'))
        xvt.out(' ', xvt.reset, xvt.blue, '|\n')

        if (profile.user.blessed) {
            let who: user = { id:profile.user.blessed }
            if (!loadUser(who)) {
                if (profile.user.blessed === 'well')
                    who.handle = 'a wishing well'
                else
                    who.handle = profile.user.blessed
            }
            xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.yellow)
            xvt.out(' + Blessed by ', xvt.white
                , sprintf('%-39s', who.handle))
            xvt.out(' ', xvt.reset, xvt.blue, '|\n')
        }

        if (profile.user.cursed) {
            let who: user = { id:profile.user.cursed }
            if (!loadUser(who)) {
                if (profile.user.cursed === 'wiz!')
                    who.handle = 'a doppleganger!'
                else
                    who.handle = profile.user.cursed
            }
            xvt.out(xvt.blue, '|', xvt.Blue, xvt.bright, xvt.black)
            xvt.out(' - Cursed by ', xvt.white
                , sprintf('%-40s', who.handle))
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
    //  cap coin accruals at 99999p, because the needs of the many...
        this._value = newValue < (1e+18 - 1e+13) ? newValue
                    : newValue == Infinity ? 1
                    : dice(100)
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

export function activate(one: active, keep = false, confused = false): boolean {
    one.adept = one.user.wins ? 1 : 0
    one.pc = PC.card(one.user.pc)
    one.str = one.user.str
    one.int = one.user.int
    one.dex = one.user.dex
    one.cha = one.user.cha
    if (one.user.blessed) {
        PC.adjust('str', 10, 0, 0, one)
        PC.adjust('int', 10, 0, 0, one)
        PC.adjust('dex', 10, 0, 0, one)
        PC.adjust('cha', 10, 0, 0, one)
    }
    if (one.user.cursed) {
        PC.adjust('str', -10, 0, 0, one)
        PC.adjust('int', -10, 0, 0, one)
        PC.adjust('dex', -10, 0, 0, one)
        PC.adjust('cha', -10, 0, 0, one)
    }
    one.confused = false
    if (confused) return true

    one.altered = true
    one.hp = one.user.hp
    one.sp = one.user.sp
    one.bp = Math.trunc(one.user.hp / 10)
    one.hull = one.user.hull
    Weapon.equip(one, one.user.weapon, true)
    Armor.equip(one, one.user.armor, true)
    if (!xvt.validator.isDefined(one.user.access))
        one.user.access = Object.keys(Access.name)[0]

    if (keep) {
        if (!lock(one.user.id, one.user.id === player.id ? 1 : 2) && one.user.id !== player.id) {
            xvt.beep()
            xvt.outln('\n', xvt.cyan, xvt.bright, one.user.handle, ' is engaged elsewhere.')
            xvt.waste(500)
            return false
        }
    }
    return true
}

export function checkXP(rpc: active, cb: Function): boolean {

    jumped = 0
    if (!Access.name[rpc.user.access].roleplay) return false
    if (rpc.user.level >= sysop.level) {
        riddle()
        return true
    }
    if (rpc.user.xp < experience(rpc.user.level, 1, rpc.user.int)) return false
    reason = ''

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
    let started = rpc.user.level

    while (rpc.user.xp >= experience(rpc.user.level, undefined, rpc.user.int) && rpc.user.level < sysop.level) {
        rpc.user.level++

        if (rpc.user.level == Access.name[rpc.user.access].promote) {
            let title = Object.keys(Access.name).indexOf(rpc.user.access)
            do {
                rpc.user.access = Object.keys(Access.name)[++title]
            } while (!xvt.validator.isDefined(Access.name[rpc.user.access][rpc.user.gender]))
            xvt.waste(250)
            xvt.outln(); xvt.waste(250)
            xvt.out(xvt.bright, xvt.yellow
                , Access.name[king.access][king.gender], ' the ', king.access.toLowerCase()
                , ', ', king.handle
                , ', is pleased with your accomplishments\n'
                , 'and promotes you to', an(rpc.user.access), '!\n')
            xvt.waste(250)
            xvt.outln(); xvt.waste(250)
            news(`\twas promoted to ${rpc.user.access}`)
            wall(`promoted to ${rpc.user.access}`)
        }

		rpc.user.hp += Math.round(rpc.user.level + dice(rpc.user.level) + rpc.user.str / 10 + (rpc.user.str > 90 ? rpc.user.str - 90 : 0))

		if (rpc.user.magic > 1)
			rpc.user.sp += Math.round(rpc.user.level + dice(rpc.user.level) + rpc.user.int / 10 + (rpc.user.int > 90 ? rpc.user.int - 90 : 0))

        PC.adjust('str', 0, PC.card(rpc.user.pc).toStr, 0, rpc)
        PC.adjust('int', 0, PC.card(rpc.user.pc).toInt, 0, rpc)
        PC.adjust('dex', 0, PC.card(rpc.user.pc).toDex, 0, rpc)
        PC.adjust('cha', 0, PC.card(rpc.user.pc).toCha, 0, rpc)

        if (eligible && rpc.user.level == 50) {
            bonus = true
            sound('demon', 18)
            break
        }
    }

    jumped = player.level - started
    rpc.user.xplevel = rpc.user.level
    award.hp = rpc.user.hp - award.hp
    award.sp = rpc.user.sp - award.sp
    rpc.hp += award.hp
    rpc.sp += award.sp

    if ((award.str = rpc.user.str - award.str) < 1) award.str = 0
    if ((award.int = rpc.user.int - award.int) < 1) award.int = 0
    if ((award.dex = rpc.user.dex - award.dex) < 1) award.dex = 0
    if ((award.cha = rpc.user.cha - award.cha) < 1) award.cha = 0

    PC.adjust('str', (award.str < 1) ? jumped : award.str, 0, 0, rpc)
    PC.adjust('int', (award.int < 1) ? jumped : award.int, 0, 0, rpc)
    PC.adjust('dex', (award.dex < 1) ? jumped : award.dex, 0, 0, rpc)
    PC.adjust('cha', (award.cha < 1) ? jumped : award.cha, 0, 0, rpc)

    if (rpc != online) return false

    sound('level')
    access = Access.name[player.access]
    online.altered = true
    xvt.outln(); xvt.waste(125)
    xvt.outln('      ', xvt.magenta, '-=', xvt.blue, '>', xvt.bright, xvt.yellow, '*', xvt.normal
        , xvt.blue, '<', xvt.magenta, '=-'); xvt.waste(125)
    xvt.outln(); xvt.waste(125)
    xvt.outln(xvt.bright, xvt.yellow, 'Welcome to level ', player.level.toString(), '!'); xvt.waste(125)
    xvt.outln(); xvt.waste(125)
    wall(`is now a level ${player.level} ${player.pc}`)

    let deed = mydeeds.find((x) => { return x.deed === 'levels' })
    if (!deed) deed = mydeeds[mydeeds.push(loadDeed(player.pc, 'levels')[0]) - 1]
    if ((deed && jumped >= deed.value)) {
        beep()
        deed.value = jumped
        saveDeed(deed)
        PC.adjust('str', 1)
        PC.adjust('int', 1)
        PC.adjust('dex', 1)
        PC.adjust('cha', 1)
        sound('outstanding')
    }

    if (player.level < sysop.level) {
        xvt.outln(xvt.bright, xvt.white, sprintf('%+6d', award.hp), xvt.reset, ' Hit points'); xvt.waste(100)
        if (award.sp) {
            xvt.outln(xvt.bright, xvt.white, sprintf('%+6d', award.sp), xvt.reset, ' Spell points'); xvt.waste(100)
        }
        if (award.str) {
            xvt.outln(xvt.bright, xvt.white, sprintf('%+6d', award.str), xvt.reset, ' Strength'); xvt.waste(100)
        }
        if (award.int) {
            xvt.outln(xvt.bright, xvt.white, sprintf('%+6d', award.int), xvt.reset, ' Intellect'); xvt.waste(100)
        }
        if (award.dex) {
            xvt.outln(xvt.bright, xvt.white, sprintf('%+6d', award.dex), xvt.reset, ' Dexterity'); xvt.waste(100)
        }
        if (award.cha) {
            xvt.outln(xvt.bright, xvt.white, sprintf('%+6d', award.cha), xvt.reset, ' Charisma'); xvt.waste(100)
        }
        xvt.outln(); xvt.waste(100)
        if (eligible && bonus) {
            skillplus(rpc, cb)
            return true
        }
    }
    else {
        riddle()
        return true
    }

    return false
}

export function skillplus(rpc: active, cb: Function) {

    PC.profile(online)
    rpc.user.expert = true

    //  slow-roll endowment choices for a dramatic effect  :)
    xvt.out(xvt.reset); xvt.waste(600)
    xvt.out(xvt.bright, xvt.yellow,` + You earn a gift to endow your ${rpc.user.pc} character +\n`); xvt.waste(1200)
    xvt.out('\n'); xvt.waste(600)

    if (rpc.user.maxstr < 97 || rpc.user.maxint < 97 || rpc.user.maxdex < 97 || rpc.user.maxcha < 97) {
        xvt.out(bracket(0, false), xvt.yellow, ' Increase ALL abilities by ' ,xvt.reset, '+3\n')
        xvt.waste(200)
    }
    xvt.out(bracket(1, false), xvt.yellow, ' Increase Strength ability from ', xvt.reset
        , rpc.user.maxstr.toString(), ' '
        , rpc.user.maxstr < 90 ? '[WEAK]'
        : rpc.user.maxstr < 95 ? '-Average-'
        : rpc.user.maxstr < 99 ? '=Strong='
        : '#MAX#'
        , '\n'
    ); xvt.waste(200)
    xvt.out(bracket(2, false), xvt.yellow, ' Increase Intellect ability from ', xvt.reset
        , rpc.user.maxint.toString(), ' '
        , rpc.user.maxint < 90 ? '[MORON]'
        : rpc.user.maxint < 95 ? '-Average-'
        : rpc.user.maxint < 99 ? '=Smart='
        : '#MAX#'
        , '\n'
    ); xvt.waste(200)
    xvt.out(bracket(3, false), xvt.yellow, ' Increase Dexterity ability from ', xvt.reset
        , rpc.user.maxdex.toString(), ' '
        , rpc.user.maxdex < 90 ? '[SLOW]'
        : rpc.user.maxdex < 95 ? '-Average-'
        : rpc.user.maxdex < 99 ? '=Swift='
        : '#MAX#'
        , '\n'
    ); xvt.waste(200)
    xvt.out(bracket(4, false), xvt.yellow, ' Increase Charisma ability from ', xvt.reset
        , rpc.user.maxcha.toString(), ' '
        , rpc.user.maxcha < 90 ? '[SURLY]'
        : rpc.user.maxcha < 95 ? '-Average-'
        : rpc.user.maxcha < 99 ? '=Affable='
        : '#MAX#'
        , '\n'
    ); xvt.waste(200)
    xvt.out(bracket(5, false), xvt.yellow, ' Improve Melee skill from ', xvt.reset
        , rpc.user.melee.toString(), 'x '
        , [ '[POOR]', '-Average-', '+Good+', '=Masterful=', '#MAX#' ][rpc.user.melee]
        , '\n'
    ); xvt.waste(200)
    xvt.out(bracket(6, false), xvt.yellow, ' Improve Backstab skill from ', xvt.reset
        , rpc.user.backstab.toString(), 'x '
        , [ '[RARE]', '-Average-', '+Good+', '=Masterful=', '#MAX#' ][rpc.user.backstab]
        , '\n'
    ); xvt.waste(200)
    xvt.out(bracket(7, false), xvt.yellow, ' Improve Poison skill from ', xvt.reset
        , rpc.user.poison.toString(), 'x '
        , [ '[NONE]', '-Average-', '+Good+', '=Masterful=', '#MAX#' ][rpc.user.poison]
        , '\n'
    ); xvt.waste(200)
    if (rpc.user.magic < 2) {
        xvt.out(bracket(8, false), xvt.yellow, ' Improve Magic skill from ', xvt.reset)
        xvt.out([ '[NONE]', '-Wands-' ][rpc.user.magic])
    }
    else {
        xvt.out(bracket(8, false), xvt.yellow, ' Increase Mana power for ', xvt.reset)
        xvt.out([ '+Scrolls+', '=Spells=', '#MAX#' ][rpc.user.magic - 2])
    }
    xvt.out('\n'); xvt.waste(200)
    xvt.out(bracket(9, false), xvt.yellow, ' Improve Stealing skill from ', xvt.reset
        , rpc.user.steal.toString(), 'x '
        , [ '[RARE]', '-Average-', '+Good+', '=Masterful=', '#MAX#' ][rpc.user.steal]
        , '\n'
    ); xvt.waste(200)

    action('list')

    xvt.app.form = {
        'skill': { cb: () => {
            xvt.out('\n', xvt.bright)
            switch (+xvt.entry) {
            case 0:
                news('\tgot generally better')
                PC.adjust('str', 3, 3, 3)
                PC.adjust('int', 3, 3, 3)
                PC.adjust('dex', 3, 3, 3)
                PC.adjust('cha', 3, 3, 3)
                break

            case 1:
                news('\tcan get even Stronger')
                if ((player.maxstr += 10) > 100) player.maxstr = 100
                xvt.out(xvt.red, `Maximum Strength is now ${player.maxstr}.`)
                break

            case 2:
                news('\tcan get even Wiser')
                if ((player.maxint += 10) > 100) player.maxint = 100
                xvt.out(xvt.green, `Maximum Intellect is now ${player.maxint}.`)
                break

            case 3:
                news('\tcan get even Quicker')
                if ((player.maxdex += 10) > 100) player.maxdex = 100
                xvt.out(xvt.magenta, `Maximum Dexterity is now ${player.maxdex}.`)
                break

            case 4:
                news('\tcan get even Nicer')
                if ((player.maxcha += 10) > 100) player.maxcha = 100
                xvt.out(xvt.yellow, `Maximum Charisma is now ${player.maxcha}.`)
                break

            case 5:
                if (player.melee > 3) {
                    xvt.app.refocus()
                    return
                }
                news('\tgot Milk')
                xvt.out([xvt.cyan, xvt.blue, xvt.red, xvt.yellow][player.melee]
                    , [ 'You can finally enter the Tavern without fear.'
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
                news('\twatch your Back now')
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
                news('\tApothecary visits have more meaning')
                xvt.out([xvt.cyan, xvt.blue, xvt.red, xvt.magenta][player.poison]
                    , [ 'The Apothecary will see you now, bring money.'
                      , 'Your poisons can achieve (+1x,+1x) potency now.'
                      , 'Your poisons can achieve (+1x,+2x) potency now.'
                      , 'Your poisons can achieve (+2x,+2x) its potency now.' ][player.poison++]
                )
                break

            case 8:
                if (player.magic > 3) {
                    xvt.app.refocus()
                    return
                }
                news('\tbecame more friendly with the old mage')
                switch(player.magic) {
                case 0:
                    xvt.out(xvt.cyan, 'The old mage will see you now, bring money.')
                    player.magic++
                    break
                case 1:
                    xvt.out(xvt.cyan, 'Your wands have turned into scrolls.')
                    player.magic++
                    player.sp += 15 + dice(511)
                    online.sp = player.sp
                    break
                default:
                    xvt.out(xvt.black, 'More mana is better')
                    player.sp += 511
                    online.sp += dice(511)
                    break
                }
                break

            case 9:
                if (player.steal > 3) {
                    xvt.app.refocus()
                    return
                }
                news('\ttry to avoid in the Square')
                xvt.out([xvt.cyan, xvt.blue, xvt.red, xvt.black][player.steal]
                    , [ 'Your fingers are starting to itch.'
                      , 'Your eyes widen at the chance for unearned loot.'
                      , 'Welcome to the Thieves guild: go pick a pocket or two!'
                      , 'You\'re convinced that no lock can\'t be picked.' ][player.steal++]
                )
                break

            default:
                xvt.app.refocus()
                return
            }

            online.altered = true
            xvt.outln(); xvt.waste(2000)
            cb()
        }, prompt:'Choose which: ', cancel:'0', min:1, max:1, match:/^[0-9]/ }
    }
    xvt.app.focus = 'skill'
}

export function an(item: string) {
    return ' ' + (/a|e|i|o|u/i.test(item[0]) ? 'an' : 'a') + ' ' + item
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
    return int(Math.random() * int(faces, true)) + 1
}

export function experience(level: number, factor = 1, wisdom = 1000): number {
    if (level < 1) return 0
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
        if (+i < 12 && !rpc.user.keyhints[i]) open.push(i)
    if (open.length) {
        do {
            i = open[dice(open.length) - 1]
            slot = Math.trunc(i / 3)
            let key = [ 'P', 'G', 'S', 'C' ][dice(4) - 1]
            if (key !== rpc.user.keyseq[slot]) {
                for (let n = 3 * slot; n < 3 * (slot + 1); n++)
                    if (key === rpc.user.keyhints[n])
                        key = ''
                if (key) rpc.user.keyhints[i] = key
            }
        } while(!rpc.user.keyhints[i])

        if (rpc == online) {
            xvt.out(xvt.reset, `Key #${slot + 1} is not `)
            if (player.emulation === 'XT') xvt.out(' 🗝️  ')
            xvt.out(xvt.bright, xvt.reverse)
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
            xvt.outln()
        }
    }
    else
        xvt.out(xvt.reset, 'There are no more key hints available to you.\n')

    rpc.altered = true
}

//  normalize as an integer, optional as a whole number (non-negative)
export function int(n: string|number, whole = false): number {
    n = (+n).valueOf()
    if (isNaN(n)) n = 0
    n = Math.trunc(n)   //  strip any fractional part
    if (n == 0) n = 0   //  strip any negative sign (really)
    return (whole && n < 0) ? 0 : n
}

export function log(who:string, message: string) {
    const folder = './files/user'
    if(!fs.existsSync(folder))
        fs.mkdirSync(folder)
    const log = `${folder}/${who}.txt`

    if (who.length && who[0] !== '_' && who !== player.id)
        fs.appendFileSync(log, `${message}\n`)
}

export function money(level: number): number {
    return int(Math.pow(2, (level - 1) / 2) * 10 * (101 - level) / 100)
}

export function news(message: string, commit = false) {

    const folder = './files/tavern'
    if(!fs.existsSync(folder))
        fs.mkdirSync(folder)
    const log = `${folder}/${player.id}.log`

    if (access.roleplay) {
        fs.appendFileSync(log, `${message}\n`)
        if (commit) {
            const paper = `./files/tavern/today.txt`
            fs.appendFileSync(paper, fs.readFileSync(log))
        }
    }
    if (commit)
        fs.unlink(log, () => {})
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
    music('reroll')
    if (points > 240) points = 240
    xvt.outln(); xvt.waste(1000)
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
        player.plays = 1
        newkeys(player)

        xvt.out('Since you are a new user here, you are automatically assigned a character\n')
        xvt.out('class.  At the Main Menu, press ', bracket('Y', false), ' to see all your character information.')
        show()
        activate(online)
        news(`\trerolled as${an(player.pc)}`)
        wall(`reroll as${an(player.pc)}`)
        require('./tty/main').menu(true)
        return
    }

    action('list')
    xvt.app.form = {
        'pc': { cb:pick, min:1, max:2, timeout:240 },
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

    xvt.out('You have been rerolled.  You must pick a class.', xvt.cyan, '\n\n')
    xvt.waste(1500)

    xvt.out('      Character        (Recommended abilities + bonus)\n')
    xvt.out('        Class    Users   Str     Int     Dex     Cha       Special Feature\n')
    xvt.out('      ---------   ---   -----   -----   -----   -----   ---------------------')

    let classes = [ '' ]
    let n = 0
    for (let pc in PC.name['player']) {
        let rpc = PC.card(pc)
        if (++n > 2) {
            if (player.keyhints.indexOf(pc) < 0) {
                xvt.out(bracket(classes.length))
                classes.push(pc)
            }
            else
                xvt.out(bracket('x'), xvt.faint)

            let rs = query(`SELECT COUNT(id) AS n FROM Players WHERE pc = '${pc}'`)[0]

            xvt.out(sprintf(' %-9s   %3d   %2d %+d   %2d %+d   %2d %+d   %2d %+d   %s',
                pc, +rs.n,
                rpc.baseStr, rpc.toStr, rpc.baseInt, rpc.toInt, rpc.baseDex, rpc.toDex, rpc.baseCha, rpc.toCha,
                rpc.specialty))
        }
    }
    xvt.out('\n')
    xvt.app.form['pc'].prompt = `Enter class (1-${(classes.length - 1)}): `
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
        let n: number = int(xvt.entry)
        if (n < 1 || n >= classes.length) {
            xvt.beep()
            xvt.app.refocus()
            return
        }
        if (player.keyhints.indexOf(classes[n]) >= 0) {
            xvt.beep()
            xvt.out(` - you cannot re-play ${classes[n]} until after you make an immortal class.`)
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

        let n: number = int(xvt.entry, true)
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
                news(`\trerolled as${an(player.pc)}`)
                if (immortal) {
                    reason = 'became immortal'
                    xvt.hangup()
                }
                xvt.out(`... and you get to complete any remaining parts to this play.\n`)
                require('./tty/main').menu(true)
                return
        }

        xvt.out('\n\nYou have ', left.toString(), ' ability points left.\n')
        xvt.app.form[p].prompt += ' ' + bracket(xvt.app.form[p].enter, false) + ': '
        xvt.app.focus = p
    }
}

export function remake(user: user) {
    let rpc = PC.card(user.pc)
    for (let n = 1; n < user.level; n++) {
        if (n == 50 && user.gender !== 'I') {
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
            xvt.out(' added')
            if (user != player) xvt.out(' to ', user.handle)
            xvt.outln(' ', xvt.bright, xvt.yellow, '+')
        }
        if ((user.str += rpc.toStr) > user.maxstr)
            user.str = user.maxstr
        if ((user.int += rpc.toInt) > user.maxint)
            user.int = user.maxint
        if ((user.dex += rpc.toDex) > user.maxdex)
            user.dex = user.maxdex
        if ((user.cha += rpc.toCha) > user.maxcha)
            user.cha = user.maxcha
        user.hp += n + dice(n) + int(user.str / 10)
        if (user.magic > 1)
            user.sp += n + dice(n) + int(user.int / 10)
    }

    if (user.level > 1)
        user.xp = experience(user.level - 1, 1, user.int)
    if (user.pc === Object.keys(PC.name['player'])[0])
        user.xplevel = 0
    else
        user.xplevel = user.level
}

export function reroll(user: user, dd?: string, level = 1) {
    //  reset essential character attributes
    user.level = level > 99 ? 99 : level < 1 ? 1: level
    user.pc = dd ? dd : Object.keys(PC.name['player'])[0]
    user.status = ''

    let rpc = PC.card(user.pc)
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
        user.rows = process.stdout.rows || 24
        user.remote = ''
        user.novice = xvt.validator.isEmpty(user.id) && user.gender !== 'I'
        user.gang = ''
        user.wins = 0
        user.immortal = 0

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
        user.gender = user.sex
        user.coin = new coins(user.coin.toString())
        user.bank = new coins(user.bank.toString())
        user.loan = new coins(0)
        if (user.rings && user.rings.length)
            for (let i in user.rings)
                saveRing(user.rings[i])
        //  force a verify if their access allows it
        // if (!user.novice && !Access.name[player.access].sysop) user.email = ''
    }

    if (level == 1 || xvt.validator.isEmpty(user.id) || user.id[0] === '_') {
        //  no extra free or augmented stuff
        user.poisons = []
        user.spells = []
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
        user.jl = 0
        user.jw = 0
        user.killed = 0
        user.kills = 0
        user.retreats = 0
        user.tl = 0
        user.tw = 0
        user.bounty = new coins(0)
        user.who = ''
    }

    remake(user)
}

// the Ancient Riddle of the Keys
export function riddle() {

    action('clear')
    xvt.outln()

    if (player.coward) {
        player.coward = false
        xvt.out('Welcome back to play with the rest of us.\n')
        xvt.waste(2000)
    }

    if (player.novice) {
        xvt.out('You are no longer a novice.  Welcome to the next level of play.\n')
        player.novice = false
        player.expert = true
        xvt.waste(2000)
    }

    let bonus = 0
    let deeds = ['plays', 'jl', 'jw', 'killed', 'kills', 'retreats', 'tl', 'tw']

    mydeeds = loadDeed(player.pc)
    xvt.out(xvt.blue, '\nChecking your deeds for the ', xvt.bright, player.pc, xvt.normal, ' list...\n')
    xvt.waste(1000)
    for (let i in deeds) {
        let deed = mydeeds.find((x) => { return x.deed === deeds[i] })
        if (deeds[i] == 'jw' || deeds[i] == 'tw') {
            if (!deed) deed = mydeeds[mydeeds.push(loadDeed(player.pc, deeds[i])[0]) - 1]
            if (player[deeds[i]] >= deed.value) {
                deed.value = player[deeds[i]]
                saveDeed(deed)
                bonus = 1
                xvt.out(' +', xvt.bright, deeds[i], xvt.normal)
                sound('click', 5)
            }
        }
        else {
            if (!deed) deed = mydeeds[mydeeds.push(loadDeed(player.pc, deeds[i])[0]) - 1]
            if (player[deeds[i]] <= deed.value) {
                deed.value = player[deeds[i]]
                saveDeed(deed)
                bonus = 1
                xvt.out(' +', xvt.bright, deeds[i], xvt.normal)
                sound('click', 5)
            }
        }
    }

    mydeeds = loadDeed('GOAT')
    xvt.out(xvt.magenta, '\nChecking your deeds for the ', xvt.bright, 'GOAT', xvt.normal,' list...\n')
    xvt.waste(1000)
    for (let i in deeds) {
        let deed = mydeeds.find((x) => { return x.deed === deeds[i] })
        if (deeds[i] == 'jw' || deeds[i] == 'tw') {
            if (!deed) deed = mydeeds[mydeeds.push(loadDeed('GOAT', deeds[i])[0]) - 1]
            if (player[deeds[i]] >= deed.value) {
                deed.value = player[deeds[i]]
                saveDeed(deed)
                bonus = 3
                xvt.out(' +', xvt.bright, deeds[i], xvt.normal)
                sound('click', 5)
            }
        }
        else {
            if (!deed) deed = mydeeds[mydeeds.push(loadDeed('GOAT', deeds[i])[0]) - 1]
            if (player[deeds[i]] <= deed.value) {
                deed.value = player[deeds[i]]
                saveDeed(deed)
                bonus = 3
                xvt.out(' +', xvt.bright, deeds[i], xvt.normal)
                sound('click', 5)
            }
        }
    }

    if (bonus) xvt.outln()
    xvt.out(xvt.bright, xvt.cyan, '\nYou have become so powerful that you are now immortal and you leave your\n')
    xvt.out('worldly possessions behind.\n')
    loadUser(taxman)
    taxman.user.bank.value +=  player.bank.value + player.coin.value
    saveUser(taxman)
    xvt.waste(2000)

    let max = Object.keys(PC.name['immortal']).indexOf(player.pc) + 1
    player.immortal++
    player.keyhints.push(player.pc)
    reroll(player)
    saveUser(player)

    if (max > 2) {
        music('victory')

        const log = `./files/winners.txt`
        fs.appendFileSync(log,
            `${player.handle} won on ${date2full(now().date)}  -  game took ${now().date - sysop.dob + 1} days\n`)

        loadUser(sysop)
        sysop.dob = now().date + 1
        sysop.plays = 0
        saveUser(sysop)

        player.wins++
        run(`UPDATE Players set wins=${player.wins} WHERE id='${player.id}'`)
        reason = 'WON THE GAME !!'
        xvt.waste(player.emulation === 'XT' ? 4321 : 432)

        xvt.outln()
        xvt.out(xvt.bright, xvt.yellow, 'CONGRATULATIONS!!'
            , xvt.reset, '  You have won the game!\n\n')
        profile({ jpg:'winner', effect:'fadeInUp' })
        sound('winner', 21)

        xvt.out(xvt.yellow, 'The board will now reset ')
        let rs = query(`SELECT id, pid FROM Online WHERE id != '${player.id}'`)
        for (let row in rs) {
            try {
                process.kill(rs[row].pid, 'SIGHUP')
                xvt.out('+')
            }
            catch {
                xvt.out('?')
            }
            unlock(rs[row].id)
        }

        rs = query(`SELECT id FROM Players WHERE id NOT GLOB '_*'`)
        let user: user = { id:'' }
        for (let row in rs) {
            user.id = rs[row].id
            loadUser(user)
            reroll(user)
            newkeys(user)
            saveUser(user)
            xvt.out('.')
            xvt.waste(12)
        }

        xvt.out(xvt.reset, '\nHappy hunting tomorrow!\n')
        sound('winner', 51)
        xvt.hangup()
    }

    player.today = 0
    xvt.out(xvt.bright, xvt.yellow, '\nYou are rewarded'
        , xvt.normal, ` ${access.calls} `, xvt.bright, 'more calls today.\n', xvt.reset)

    xvt.out(xvt.green, xvt.bright, `\nOl' Mighty One!  `
        , xvt.normal, 'Solve the'
        , xvt.faint, ' Ancient Riddle of the Keys '
        , xvt.normal, 'and you will become\nan immortal being.\n\n')

    let slot: number
    for (let i in player.keyhints) {
        if (+i < 12 && player.keyhints[i]) {
            slot = Math.trunc(+i / 3) + 1
            xvt.out(xvt.reset, `Key #${slot} is not `)
            if (player.emulation === 'XT') xvt.out(' 🗝️  ')
            xvt.out(xvt.bright, xvt.reverse)
            switch (player.keyhints[i]) {
            case 'P':
                xvt.out(xvt.magenta, ' Platinum')
                break
            case 'G':
                xvt.out(xvt.yellow, ' Gold')
                break
            case 'S':
                xvt.out(xvt.cyan, ' Silver')
                break
            case 'C':
                xvt.out(xvt.red, ' Copper')
                break
            default:
                xvt.out(xvt.black, 'from around here')
                break
            }
            xvt.outln(' ')
        }
    }

    for (let i = 0; i <= max + bonus; i++)
        keyhint(online)

    action('riddle')
    xvt.app.form = {
        'key': { cb:() => {
            xvt.out(' ...you insert and twist the key... ')
            xvt.waste(1234)
            if (xvt.entry.toUpperCase() === player.keyseq[slot]) {
                sound('click')
                if (player.emulation === 'XT') xvt.out('🔓 ')
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
                playerPC([200,210,220,240][slot], true)
                return
            }
            else {
                sound('thunder')
                if (player.emulation === 'XT') xvt.out('💀 ')
                xvt.out(xvt.bright, xvt.black, '^', xvt.white, 'Boom!', xvt.black, '^\n')
                if (slot == 0) {
                    for (let i = 3 * slot; i < 3 * (slot + 1); i++) {
                        if (player.keyhints[i] === xvt.entry.toUpperCase())
                            break
                        if (!player.keyhints[i]) {
                            player.keyhints[i] = xvt.entry.toUpperCase()
                            break
                        }
                    }
                    reroll(player)
                    playerPC(200 + 4 * player.wins + int(player.immortal / 4))
                }
                else {
                    reroll(player, player.pc)
                    newkeys(player)
                    playerPC([200,210,220,240][slot], true)
                }
                return
            }
        }, eol:false, match:/P|G|S|C/i }
    }
    slot = 0
    xvt.app.form['key'].prompt = `Insert key #${slot + 1}? `
    xvt.app.focus = 'key'
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
    return action + (rpc != online ? (/.*ch$|.*sh$|.*s$|.*z$/i.test(action) ? 'es ' : 's ') : ' ')
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
    return int(n * p / 100)
}

export function beep() {
    if (xvt.emulation === 'XT')
        sound('max')
    else
        xvt.beep()
    xvt.waste(100)
}

export function bracket(item: number|string, nl = true): string {
    var framed: string = item.toString()
    framed = xvt.attr(xvt.reset, xvt.faint, nl ? '\n' : ''
        , framed.length == 1 && nl ? ' ' : ''
        , '<', xvt.normal, xvt.bright, xvt.white, framed, xvt.faint, '>'
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
    const folder = './files/'
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

export function death(by: string) {
    reason = by
    profile({ png:`death${player.today}`, effect:'fadeInDownBig' })
}

//  render a menu of options and return the prompt
export function display(title:string, back:number, fore:number, suppress:boolean, menu:choices, hint?: string): string {
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

    if (process.stdout.rows && process.stdout.rows !== player.rows) {
        if (!player.expert) xvt.out('\n', xvt.yellow, xvt.Empty[xvt.emulation], xvt.bright
            , `Resetting your USER ROW setting (${player.rows}) to detected size ${process.stdout.rows}`
            , xvt.reset)
        player.rows = process.stdout.rows
    }

    if (hint && access.roleplay && dice(+player.expert * (player.immortal + 1) * player.level) == 1)
        xvt.out('\n', xvt.bright, xvt.green, hint, xvt.reset)

    xvt.out('\x06')     //  insert any wall messages here

    return xvt.attr(fore, '[', xvt.bright, xvt.yellow, back ? titlecase(title) : 'Iron Bank', xvt.normal, fore, ']'
        , xvt.faint, ' Option '
        , xvt.normal, xvt.cyan, '(Q=Quit): ')
}

export function emulator(cb:Function) {
    action('list')
    xvt.app.form = {
        'term': { cb:() => {
            if (xvt.validator.isNotEmpty(xvt.entry) && xvt.entry.length == 2) xvt.emulation = xvt.entry.toUpperCase()
            xvt.out('\n\n', xvt.reset, xvt.magenta, xvt.LGradient[xvt.emulation], xvt.reverse, 'TEST BANNER', xvt.noreverse, xvt.RGradient[xvt.emulation], '\n')
            xvt.out(xvt.red,'R', xvt.green,'G', xvt.blue,'B', xvt.reset, xvt.bright,' bold ', xvt.normal, 'normal', xvt.faint, ' dark')
            xvt.outln()
            online.altered = true
            player.emulation = xvt.emulation
            sound('max', 20)
            if (player.emulation == 'XT') {
                cb()
                return
            }
            for(let rows = 99; rows > 1; rows--)
                xvt.out(bracket(rows > 24 ? rows : '..'))
            xvt.app.focus = 'rows'
        }, prompt:xvt.attr('Select ', xvt.faint, '[', xvt.reset, xvt.bright, `${player.emulation}`, xvt.reset, xvt.faint, ']', xvt.reset, ': ')
        , enter:player.emulation, match:/VT|PC|XT/i, max:2 },
        'rows': { cb:() => {
            player.rows = +xvt.entry
            xvt.outln()
            xvt.app.focus = 'pause'
        }, prompt:xvt.attr('Enter top visible row number ', xvt.reset, xvt.faint, '[', xvt.reset, xvt.bright, `${player.rows}`, xvt.reset, xvt.faint, ']', xvt.reset, ': ')
        , enter:player.rows.toString(), max:2, match:/^[2-9][0-9]$/ },
        'pause': { cb:cb, pause:true }
    }

    xvt.out('\n', xvt.cyan, 'Which emulation / character encoding are you using?\n')
    xvt.out(bracket('VT'), ' classic VT terminal with DEC drawing (telnet b&w)')
    xvt.out(bracket('PC'), ' former ANSI color with IBM encoding (telnet color)')
    xvt.out(bracket('XT'), ' modern ANSI color with UTF-8 encoding (browser multimedia)\n')
    xvt.app.focus = 'term'
}

export function logoff() {
    if (!reason) {
        if (access.roleplay) {
            player.lasttime = now().time
            saveUser(player)
            unlock(player.id)
        }
        reason = (xvt.reason ? xvt.reason : 'mystery')
        if (player && player.id) {
            if (run(`UPDATE Players set coward=1 WHERE id='${player.id}'`).changes)
                news(`\tlogged off ${time(player.lasttime)} (${reason})\n`, true)
            access.roleplay = false
        }
    }
    if (xvt.validator.isNotEmpty(player.id)) {
        player.lasttime = now().time
        if (access.roleplay) {
            saveUser(player)
            unlock(player.id)
            news(`\tlogged off ${time(player.lasttime)} as a level ${player.level} ${player.pc}`)
            news(`\t(${reason})\n`, true)

            try {
                callers = JSON.parse(fs.readFileSync('./users/callers.json').toString())
            } catch(e) {}
            while (callers.length > 7)
                callers.pop()
            callers = [<caller>{who: player.handle, reason: reason}].concat(callers)
            fs.writeFileSync('./users/callers.json', JSON.stringify(callers))
        }

        wall(`logged off: ${reason}`)
        unlock(player.id, true)

        //  logoff banner
        if (online.hp < 1)
            sound('goodbye')
        else {
            if (online.hull) sound('invite')
            PC.profile(online)
        }
        xvt.out('\x06\n')
        xvt.out(xvt.reset, 'Goodbye, please play again!  Also visit:\n')
        xvt.waste(750)
        xvt.out(xvt.cyan, '  ___                               ___  \n')
        xvt.out(xvt.cyan, '  \\_/   ', xvt.red, xvt.LGradient[xvt.emulation], xvt.bright, xvt.Red, xvt.white, 'Never Program Mad', xvt.reset, xvt.red, xvt.RGradient[xvt.emulation], xvt.cyan, '   \\_/  \n')
        xvt.out(xvt.cyan, ' _(', xvt.bright, '-', xvt.normal, ')_     ', xvt.reset, ' https://npmjs.com    ', xvt.cyan, '  _(', xvt.bright, '-', xvt.normal, ')_ \n')
        xvt.out(xvt.cyan, '(/ ', xvt.bright, ':', xvt.normal, ' \\)                          ', xvt.cyan, ' (/ ', xvt.bright, ':', xvt.normal, ' \\)\n')
        xvt.out(xvt.cyan, 'I\\___/I    ', xvt.green, xvt.LGradient[xvt.emulation], xvt.bright, xvt.Green, xvt.white, 'RAH-CoCo\'s', xvt.reset, xvt.green, xvt.RGradient[xvt.emulation], xvt.cyan, '     I\\___/I\n')
        xvt.out(xvt.cyan, '\\/   \\/ ', xvt.reset, '   http://rahcocos.com  ', xvt.cyan, '  \\/   \\/\n')
        xvt.out(xvt.cyan, ' \\ : /                           ', xvt.cyan, '  \\ : / \n')
        xvt.out(xvt.cyan, '  I:I     ', xvt.blue, xvt.LGradient[xvt.emulation], xvt.bright, xvt.Blue, xvt.white, 'Robert Hurst', xvt.reset, xvt.blue, xvt.RGradient[xvt.emulation], xvt.cyan, '      I:I  \n')
        xvt.out(xvt.cyan, ' .I:I. ', xvt.reset, 'https://robert.hurst-ri.us', xvt.cyan, '  .I:I. \n')
        xvt.outln(); xvt.waste(500)
        xvt.outln(xvt.bright, xvt.black, process.title
            , xvt.normal, xvt.white, xvt.validator.isNotEmpty(process.env.npm_package_version) ? ' ' + process.env.npm_package_version : ''
            , ' running on ', xvt.bright, xvt.green, 'Node.js ', xvt.normal, process.version, xvt.reset
            , xvt.faint, ' (', xvt.cyan, process.platform, xvt.white, xvt.faint, ')')
        xvt.waste(1965)
        if (player.today && player.level > 1)
            music(online.hp > 0 ? 'logoff' : 'death')
    }
    else
        sound('invite')
}

export function action(menu: string) {
    if (!xvt.modem) return
    xvt.out('@action(', menu, ')')
}

export function animated(effect: string) {
    if (!xvt.modem) return
    xvt.out('@animated(', effect, ')')
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
    if (xvt.modem) xvt.out('@play(', effect, ')')
    xvt.waste(sync * 100)
}

export function wall(msg: string) {
    if (xvt.modem) xvt.out(`@wall(${player.handle} ${msg})`)
}

/***********
 *  DATABASE support functions
 ***********/
    const users = './users/'
    if(!fs.existsSync(users))
        fs.mkdirSync(users)

    const DD = users + 'dankdomain.sql'
    let better = require('better-sqlite3')
    export let sqlite3 = new better(DD)
    let rs = query(`SELECT * FROM sqlite_master WHERE name='Online' AND type='table'`)
    if (!rs.length) {
        xvt.out('\ninitializing online ... ')
        run(`CREATE TABLE IF NOT EXISTS Online (id text PRIMARY KEY, pid numeric, lockdate numeric, locktime numeric)`)

        xvt.out('done.')
        xvt.waste(250)
    }

    rs = query(`SELECT * FROM sqlite_master WHERE name='Players' AND type='table'`)
    if (!rs.length) {
        xvt.out('\ninitializing players ... ')
        run(`CREATE TABLE IF NOT EXISTS Players (
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
            spells text, poisons text, rings text, realestate text, security text,
            hull numeric, cannon numeric, ram integer, wins numeric, immortal numeric,
          	plays numeric, jl numeric, jw numeric, killed numeric, kills numeric,
            retreats numeric, tl numeric, tw numeric)`)
    }

    let npc = <user>{}
    Object.assign(npc, require('./etc/sysop.json'))
    rs = query(`SELECT id FROM Players WHERE id = '${npc.id}'`)
    if (!rs.length) {
        xvt.out(`[${npc.id}]`)
        Object.assign(sysop, npc)
        newkeys(sysop)
        reroll(sysop, sysop.pc, sysop.level)
        sysop.xplevel = 0
        sysop.level = npc.level
        saveUser(sysop, true)
    }
    //  customize the Master of Whisperers NPC
    npc = <user>{}
    Object.assign(npc, require('./etc/barkeep.json'))
    rs = query(`SELECT id FROM Players WHERE id = '${npc.id}'`)
    if (!rs.length) {
        xvt.out(`[${npc.id}]`)
        Object.assign(barkeep.user, npc)
        newkeys(barkeep.user)
        reroll(barkeep.user, barkeep.user.pc, barkeep.user.level)
        Object.assign(barkeep.user, npc)
        saveUser(barkeep, true)
    }
    //  customize the Big Kahuna NPC
    npc = <user>{}
    Object.assign(npc, require('./etc/neptune.json'))
    rs = query(`SELECT id FROM Players WHERE id = '${npc.id}'`)
    if (!rs.length) {
        xvt.out(`[${npc.id}]`)
        Object.assign(neptune.user, npc)
        newkeys(neptune.user)
        reroll(neptune.user, neptune.user.pc, neptune.user.level)
        Object.assign(neptune.user, npc)
        saveUser(neptune, true)
    }
    //  customize the Queen B NPC
    npc = <user>{}
    Object.assign(npc, require('./etc/seahag.json'))
    rs = query(`SELECT id FROM Players WHERE id = '${npc.id}'`)
    if (!rs.length) {
        xvt.out(`[${npc.id}]`)
        Object.assign(seahag.user, npc)
        newkeys(seahag.user)
        reroll(seahag.user, seahag.user.pc, seahag.user.level)
        Object.assign(seahag.user, npc)
        saveUser(seahag, true)
    }
    //  customize the Master of Coin NPC
    npc = <user>{}
    Object.assign(npc, require('./etc/taxman.json'))
    rs = query(`SELECT id FROM Players WHERE id = '${npc.id}'`)
    if (!rs.length) {
        xvt.out(`[${npc.id}]`)
        Object.assign(taxman.user, npc)
        newkeys(taxman.user)
        reroll(taxman.user, taxman.user.pc, taxman.user.level)
        Object.assign(taxman.user, npc)
        saveUser(taxman, true)
    }

    rs = query(`SELECT * FROM sqlite_master WHERE name='Gangs' AND type='table'`)
    if (!rs.length) {
        xvt.out('\ninitializing gangs ... ')
        run(`CREATE TABLE IF NOT EXISTS Gangs (
            name text PRIMARY KEY, members text, win numeric, loss numeric, banner numeric, color numeric
        )`)
        run(`INSERT INTO Gangs VALUES ( 'Monster Mash', '_MM1,_MM2,_MM3,_MM4', 0, 0, 0, 0 )`)
        xvt.out('done.')
        xvt.waste(250)
    }

    rs = query(`SELECT * FROM sqlite_master WHERE name='Deeds' AND type='table'`)
    if (!rs.length) {
        xvt.out('\ninitializing deeds ... ')
        run(`CREATE TABLE IF NOT EXISTS Deeds (pc text KEY,
            deed text KEY, date numeric, hero text, value numeric
        )`)
        xvt.out('done.')
        xvt.waste(250)
    }

    rs = query(`SELECT * FROM sqlite_master WHERE name='Rings' AND type='table'`)
    if (!rs.length) {
        xvt.out('\ninitializing (unique) rings ... ')
        run(`CREATE TABLE IF NOT EXISTS Rings (name text PRIMARY KEY, bearer text)`)
        xvt.out('done.')
        xvt.waste(250)
    }
    for (let i in Ring.name)
        ringBearer(i)
    
    xvt.outln()


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

        user.rings = []
        if (rs[0].rings.length) {
            let rings = rs[0].rings.split(',')
            for (let i = 0; i < rings.length; i++)
                Ring.wear(user.rings, rings[i])
        }

        if (isActive(rpc)) activate(rpc)
        return true
    }
    else {
        user.id = ''
        return false
    }
}

export function saveUser(rpc, insert = false, locked = false) {

    let user: user = isActive(rpc) ? rpc.user : rpc

    if (xvt.validator.isEmpty(user.id)) return

    let sql: string = ''

    sql = insert ? `INSERT INTO Players 
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
        , spells, poisons, rings, realestate, security
        , hull, cannon, ram, wins, immortal
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
        ,'${user.spells.toString()}', '${user.poisons.toString()}', '${user.rings.toString()}', '${user.realestate}', '${user.security}'
        , ${user.hull}, ${user.cannon}, ${+user.ram}, ${user.wins}, ${user.immortal}
        , ${user.plays}, ${user.jl}, ${user.jw}, ${user.killed}, ${user.kills}
        , ${user.retreats}, ${user.tl}, ${user.tw}
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
        spells='${user.spells.toString()}', poisons='${user.poisons.toString()}', rings='${user.rings.toString()}', realestate='${user.realestate}', security='${user.security}',
        hull=${user.hull}, cannon=${user.cannon}, ram=${+user.ram}, wins=${user.wins}, immortal=${user.immortal},
        plays=${user.plays}, jl=${user.jl}, jw=${user.jw}, killed=${user.killed}, kills=${user.kills},
        retreats=${user.retreats}, tl=${user.tl}, tw=${user.tw}
        WHERE id='${user.id}'`

    run(sql)

    if (isActive(rpc)) rpc.altered = false
    if (locked) unlock(user.id.toLowerCase())
}

export function newDay() {
    xvt.out('One moment: [')

    run(`UPDATE Players SET bank=bank+coin WHERE id NOT GLOB '_*'`)
    xvt.out('+')
    run(`UPDATE Players SET coin=0`)
    xvt.out('-')

    let rs = query(`SELECT id FROM Players WHERE id NOT GLOB '_*' AND status = '' AND magic > 0 AND bank > 99999 AND level > 19`)
    let user: user = { id:'' }
    for (let row in rs) {
        user.id = rs[row].id
        loadUser(user)
        for (let item = 7; item < 16; item++) {
            let cost = user.magic == 1 ? new coins(Magic.spells[Magic.merchant[item]].wand)
                : new coins(Magic.spells[Magic.merchant[item]].cost)
            if (user.bank.value >= cost.value && !Magic.have(user.spells, item)) {
                Magic.add(user.spells, item)
                user.bank.value -= cost.value
            }
        }
        saveUser(user)
    }
    xvt.out('=')

    rs = query(`SELECT id, access, lastdate, level, xplevel, novice, jl, jw, gang FROM Players WHERE id NOT GLOB '_*'`)
    for (let row in rs) {
        if ((rs[row].level == 1 || rs[row].novice) && (rs[row].jl > (2 * rs[row].jw))) {
            run(`UPDATE Players set jl=0,jw=0 WHERE id='${rs[row].id}'`)
        }
        //  manually rolled back system date _after_ some player visited?
        if (!(now().date - rs[row].lastdate))
            continue

        if ((now().date - rs[row].lastdate) > 10) {
            if (Access.name[rs[row].access].roleplay) {
                if (+rs[row].xplevel > 1) {
                    run(`UPDATE Players set xplevel=1,remote='' WHERE id='${rs[row].id}'`)
                    let p:user = { id: rs[row].id }
                    loadUser(p)
                    require('./email').rejoin(p)
                    xvt.waste(1000)
                    xvt.out('_')
                    continue
                }
            }
            else {
                run(`DELETE FROM Players WHERE id='${rs[row].id}'`)
                fs.unlink(`./files/user/${rs[row].id}.txt`, () => {})
                xvt.out('x')
                continue
            }
        }

        if ((now().date - rs[row].lastdate) > 180) {
            if (rs[row].gang) {
                let g = loadGang(query(`SELECT * FROM Gangs WHERE name = '${rs[row].gang}'`)[0])
                let i = g.members.indexOf(rs[row].id)
                if (i > 0) {
                    g.members.splice(i, 1)
                    saveGang(g)
                }
                else {
                    run(`UPDATE Players SET gang = '' WHERE gang = '${g.name}'`)
                    run(`DELETE FROM Gangs WHERE name = '${g.name}'`)
                    xvt.out('&')
                }
            }
            run(`DELETE FROM Players WHERE id='${rs[row].id}'`)
            fs.unlink(`./files/user/${rs[row].id}.txt`, () => {})
            xvt.out('x')
            continue
        }

        if ((now().date - rs[row].lastdate) % 50 == 0) {
            run(`UPDATE Players set pc='${Object.keys(PC.name['player'])[0]}',level=1,xplevel=0,remote='' WHERE id='${rs[row].id}'`)
            let p:user = { id: rs[row].id }
            loadUser(p)
            require('./email').rejoin(p)
            xvt.waste(1000)
        }
    }

    try {
        fs.renameSync('./files/tavern/today.txt', './files/tavern/yesterday.txt')
        xvt.out('T')
    } catch (e) {
        xvt.out('?')
    }
    xvt.out(']')

    sysop.lastdate = now().date
    sysop.lasttime = now().time
    saveUser(sysop)
    xvt.outln(xvt.bright, xvt.yellow, '*')
    xvt.out('All set -- thank you!\n\n')
}

export function lock(id: string, owner = 0): boolean {

    if (owner == 1) {
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
    else {
        let rs = query(`SELECT id FROM Online WHERE id LIKE '${id}'`)
        if (!rs.length) {
            if (owner == 2)
                run(`INSERT INTO Online (id, pid, lockdate, locktime) VALUES ('${id.toLowerCase()}', ${process.pid}, ${now().date}, ${now().time})`)
            return true
        }
        return false
    }
}

export function unlock(id: string, mine = false): number {
    if (mine) return run(`DELETE FROM Online WHERE id != '${id}' AND pid = ${process.pid}`).changes
    return run(`DELETE FROM Online WHERE id = '${id}'`).changes
}

export function query(q: string, errOk = false): any {
    try {
        let cmd = sqlite3.prepare(q)
        return cmd.all()
    }
    catch(err) {
        if (!errOk) {
            xvt.outln()
            beep()
            xvt.outln(xvt.red, '?Unexpected error: ', xvt.bright, String(err))
            xvt.out(q)
            reason = 'defect - ' + err.code
            xvt.hangup()
        }
        return []
    }
}

export function run(sql: string, errOk = false): { changes: number, lastInsertROWID: number } {
    let retry = 3

    while (retry) {
        try {
            let cmd = sqlite3.prepare(sql)
            return cmd.run()
        }
        catch(err) {
            xvt.beep()
            xvt.out(xvt.reset, '\n?Unexpected SQL error: ', String(err))
            if (--retry) {
                xvt.out(' -- retrying\n')
                continue
            }
            if (!errOk) {
                xvt.out('\n?FATAL SQL operation: ', sql)
/*
                if (user.id === player.id || user.id[0] === '_') {
                    let trace = users + user.id + '.json'
                    if (reason === '')
                        fs.writeFileSync(trace, JSON.stringify(user, null, 2))
                    else
                        fs.unlink(trace, () => {})
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
*/
                reason = 'defect - ' + err.code
                xvt.hangup()
            }
            return { changes: 0, lastInsertROWID: 0}
        }
    }
}

export function loadDeed(pc: string, what?: string): deed[] {

    let deed = []
    let sql = `SELECT * FROM Deeds WHERE pc='${pc}'`
    if (what) sql += ` AND deed='${what}'`
    let rs = query(sql)

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
        run(`INSERT INTO Deeds VALUES ('${pc}', '${what}', ${now().date}, 'Nobody', ${start})`)
        deed = loadDeed(pc, what)
    }

    return deed
}

export function saveDeed(deed: deed) {
    deed.date = now().date
    deed.hero = player.handle
    run(`UPDATE Deeds set date=${deed.date}, hero='${deed.hero}', value=${deed.value} WHERE pc='${deed.pc}' AND deed='${deed.deed}'`)
}

export function loadGang(rs: any): gang {
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
        let who = query(`SELECT handle, gender, melee, status, gang FROM Players WHERE id = '${gang.members[n]}'`)
        if (who.length) {
            gang.handles.push(who[0].handle)
            gang.genders.push(who[0].gender)
            gang.melee.push(who[0].melee)
            if (gang.members[n] !== player.id && !who[0].status && !lock(gang.members[n]))
                who[0].status = 'locked'
            gang.status.push(who[0].status)
            gang.validated.push(who[0].gang ? who[0].gang === rs.name : undefined)
        }
        else if (gang.members[n][0] === '_') {
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

export function saveGang(g: gang, insert = false) {
    if (insert) {
        try {
            sqlite3.exec(`INSERT INTO Gangs (name, members, win, loss, banner, color)
                VALUES ('${g.name}', '${g.members.join()}', ${g.win}, ${g.loss},
                ${(g.banner <<4) + g.trim}, ${(g.back <<4) + g.fore})`)
        }
        catch(err) {
            if (err.code !== 'SQLITE_CONSTRAINT_PRIMARYKEY') {
                xvt.outln()
                beep()
                xvt.outln(xvt.red, '?Unexpected error: ', xvt.bright, String(err))
                xvt.waste(2000)
            }
        }
    }
    else {
        if (g.members.length > 4) g.members.splice(0,4)
        run(`UPDATE Gangs
                set members = '${g.members.join()}', win = ${g.win}, loss = ${g.loss}
                , banner = ${(g.banner <<4) + g.trim}, color = ${(g.back <<4) + g.fore}
            WHERE name = '${g.name}'`)
    }
}

export function ringBearer(name: string): string {
    if (Ring.name[name].unique) {
        let rs = query(`SELECT bearer FROM Rings WHERE name = '${name}'`)
        if (!rs.length) {
            run(`INSERT INTO Rings (name, bearer) VALUES ('${name}', '')`)
            return ''
        }
        return rs[0].bearer
    }
    return ''
}


export function saveRing(name: string, bearer = '', rings?: string[]) {
    let theRing = { name: name, bearer: bearer[0] == '_' ? '' : bearer }

    //  primarily maintain the one ring's active bearer here
    if (Ring.name[name].unique)
        run(`UPDATE Rings set bearer = '${theRing.bearer}' WHERE name = '${theRing.name}'`)

    if (theRing.bearer.length && rings)
        run(`UPDATE Players set rings = '${rings.toString()}' WHERE id = '${theRing.bearer}'`)
}

}

export = Common
