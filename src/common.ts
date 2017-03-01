/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  COMMON authored by: Robert Hurst <theflyingape@gmail.com>                *
\*****************************************************************************/

import {sprintf} from 'sprintf-js'
import titleCase = require('title-case')

import xvt = require('xvt')
import Items = require('./items')

module Common
{
    export const fs = require('fs-extra')

    //  items
    export const Access = new Items.Access
    export const Armor = new Items.Armor
    export const Magic = new Items.Magic
    export const Poison = new Items.Poison
    export const RealEstate = new Items.RealEstate
    export const Security = new Items.Security
    export const Weapon = new Items.Weapon

    export let barkeep: active = { user: { id:'_BAR'} }
    export let online: active = { user: { id:'' } }
    export let taxman: active = { user: { id:'_TAX'} }
    export let player: user = online.user
    export let sysop: user = { id:'_SYS' }

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
    class Character {
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
            var i: number
            var n: number

            i = 22 - profile.user.handle.length
            n = 11 + i / 2
            xvt.out(xvt.clear)
            xvt.out(xvt.blue, '+', line.slice(0, n), '=:))')
            xvt.out(xvt.Blue, xvt.bright, xvt.yellow, ' ', profile.user.handle, ' ', xvt.reset)
            n = 11 + i / 2 + i % 2
            xvt.out(xvt.blue, '((:=', line.slice(0, n), '+\n')

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
            if (explevel(profile.user.level) < 1e+8)
                xvt.out(sprintf('%-15f', explevel(profile.user.level)))
            else
                xvt.out(sprintf('%-15.7e', explevel(profile.user.level)))
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
            let text = '', rich = ''

            text = profile.user.armor
            rich = xvt.attr(xvt.bright, xvt.white, text)

            if (profile.toAC || profile.user.toAC) {
                text += ' ('
                rich += xvt.attr(xvt.blue, ' (')
                if (profile.user.toAC < 0) {
                    text += profile.user.toAC.toString()
                    rich += xvt.attr(xvt.red, profile.user.toAC.toString())
                }
                else {
                    text += '+' + profile.user.toAC.toString()
                    rich += xvt.attr(xvt.white, '+', profile.user.toAC.toString())
                }
                text += ','
                rich += xvt.attr(xvt.nobright, xvt.white, ',', xvt.bright)
                if (profile.toAC < 0) {
                    text += profile.toAC.toString()
                    rich += xvt.attr(xvt.red, profile.toAC.toString())
                }
                else {
                    text += '+' + profile.toAC.toString()
                    rich += xvt.attr(xvt.white, '+', profile.toAC.toString())
                }
                text += ')'
                rich += xvt.attr(xvt.blue, ')', xvt.white)
            }
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
        if (typeof money == 'number') {
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
                : xvt.attr(xvt.bright, xvt.white, n.toString(), xvt.magenta, 'p', xvt.white, xvt.nobright)
            )
            n = this.value % 1e+13
        }
        if (this.pouch(n) === 'g') {
            n = Math.trunc(n / 1e+09)
            bags.push(text ? n + 'g'
                : xvt.attr(xvt.bright, xvt.white, n.toString(), xvt.yellow, 'g', xvt.white, xvt.nobright)
            )
            n = this.value % 1e+09
        }
        if (this.pouch(n) === 's') {
            n = Math.trunc(n / 1e+05)
            bags.push(text ? n + 's'
                : xvt.attr(xvt.bright, xvt.white, n.toString(), xvt.cyan, 's', xvt.white, xvt.nobright)
            )
            n = this.value % 1e+05
        }
        if ((n > 0 && this.pouch(n) === 'c') || bags.length == 0)
            bags.push(text ? n + 'c'
                : xvt.attr(xvt.bright, xvt.white, n.toString(), xvt.red, 'c', xvt.white, xvt.nobright)
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

export function activate(one: active) {
    one.confused = false
    one.str = one.user.str
    one.int = one.user.int
    one.dex = one.user.dex
    one.cha = one.user.cha
    one.hp = one.user.hp
    one.sp = one.user.sp
    one.bp = Math.trunc(one.user.hp / 10)
    one.hull = one.user.hull
    one.toAC = 0
    one.toWC = 0
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

export function explevel(level: number): number {
    return 1000 * Math.pow(2, level - 1)
}

export function money(level: number): number {
    return Math.trunc(Math.pow(2, (level - 1) / 2) * 10 * (101 - level) / 100)
}

export function now(): {date: number, time: number} {
    let today = date2days(new Date().toLocaleString().split(',')[0])
    let now = new Date().toTimeString().slice(0,5).replace(/:/g, '')
    return {date: +today, time: +now}
}

export function newkeys(user: user) {
    let keys = [ 'P', 'G', 'S', 'C' ]
    user.keyseq = ''
    while (keys.length) {
        let k = dice(keys.length)
        user.keyseq += keys.splice(k - 1, 1)
    }
}

export function playerPC(points = 200) {
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
        xvt.out('Since you are a new user here, you are automatically assigned a character\n')
        xvt.out('class.  At the Main Menu, press ', bracket('Y', false), ' to see all your character information.')
        show()
        activate(online)
        require('./tty/main').menu(true)
        return
    }

    xvt.app.form = {
        'pc': { cb:pick, min:1, max:2 },
        'str': { cb:ability, min:2, max:2, match:/^[2-8][0-9]$/ },
        'int': { cb:ability, min:2, max:2, match:/^[2-8][0-9]$/ },
        'dex': { cb:ability, min:2, max:2, match:/^[2-8][0-9]$/ },
        'cha': { cb:ability, min:2, max:2, match:/^[2-8][0-9]$/ }
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
    xvt.app.form['pc'].prompt = 'Enter class (1-' + (n-2) +'): '
    xvt.app.focus = 'pc'

    function show() {
        xvt.out('\n')
        cat('player/' + player.pc.toLowerCase())
        xvt.out(xvt.reset, xvt.bright, xvt.cyan)
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
        if (n < 1 || n > Object.keys(PC.name['player']).length) {
            xvt.beep()
            xvt.app.refocus()
        }
        reroll(player, classes[n])
        show()
        ability('str')
    }

    function ability(field?: string) {
        if (xvt.validator.isNotEmpty(field)) {
            xvt.out('\n', xvt.yellow, 'You have ', xvt.bright, points.toString(), xvt.nobright, ' points to distribute between 4 abilities: Strength, Intellect,\n')
            xvt.out('Dexterity, Charisma.  Each ability must be between ', xvt.bright, '20', xvt.nobright, ' and ', xvt.bright, '80', xvt.nobright, ' points.\n')
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
        if (n == 50 && user.id[0] !== '_' && user.gender != 'I') {
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

export function reroll(user: user, dd = 'None', level = 1) {
    //  reset essential character attributes
    user.level = level
    user.pc = dd
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
        user.dob = now().date
        user.joined = user.dob
        user.lastdate = user.joined
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
        if (!user.novice) user.email = ''
    }

    if (level == 1 || user.id[0] === '_') {
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
        user.keyhints = []
        newkeys(user)
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

export function titlecase(orig: string): string {
    return titleCase(orig)
}

export function what(user: user, action: string) {
    return action + (user.id !== player.id ? 's ' : ' ')
}

export function who(user: user, subject = true, start = true, proper = true) {
    let pronoun = [
            [{
                'F': { word: 'her ' },
                'I': { word: 'its ' },
                'M': { word: 'his ' },
                'U': { word: 'your ' }
            },
            {
                'F': { word: 'Her ' },
                'I': { word: 'Its ' },
                'M': { word: 'His ' },
                'U': { word: 'Your ' },
            }]
        ,
            [{
                'F': { word: proper ? user.handle : 'her' },
                'I': { word: proper ? 'the ' + user.handle : 'it' },
                'M': { word: proper ? user.handle : 'him' },
                'U': { word: 'you' }
            },
            {
                'F': { word: proper ? user.handle : 'She ' },
                'I': { word: proper ? 'The ' + user.handle : 'It ' },
                'M': { word: proper ? user.handle : 'He ' },
                'U': { word: 'You ' }
            }]
        ]

    let gender = user.id === player.id ? 'U' : user.gender
    return pronoun[+subject][+start][gender].word
}

export function worth(n: number, p: number) {
    return Math.trunc(n * p / 100)
}

export function bracket(item: number|string, nl = true): string {
    var framed: string = item.toString()
    framed = xvt.attr(xvt.white, xvt.faint, nl ? '\n' : ''
        , framed.length == 1 && nl ? ' ' : ''
        , '<', xvt.off, xvt.bright, xvt.white, framed, xvt.faint, '>'
        , xvt.reset)
    return framed
}

export function buff(perm: number, temp:number, text = false): string {
    let keep = xvt.emulation
    if (text) xvt.emulation = 'dumb'
    let buff = ''
    if (perm || temp) {
        buff = xvt.attr(xvt.nobright, xvt.magenta, ' (')
        if (perm > 0) buff += xvt.attr(xvt.bright, xvt.yellow, '+', perm.toString())
        else if (perm < 0) buff += xvt.attr(xvt.bright, xvt.red, perm.toString())
        else buff += xvt.attr(xvt.nobright, xvt.white, '+0')
        buff += xvt.attr(xvt.nobright, xvt.white, ',')
        if (temp > 0) buff += xvt.attr(xvt.bright, xvt.yellow, '+', temp.toString())
        else if (temp < 0) buff += xvt.attr(xvt.bright, xvt.red, temp.toString())
        else buff += xvt.attr(xvt.nobright, xvt.white, '+0')
        buff += xvt.attr(xvt.nobright, xvt.magenta, ')', xvt.white)
    }
    if (text) xvt.emulation = keep
    return buff
}

export function	cat(filename: string): boolean {
    const folder = './tty/files/'
    let path = folder + filename + (xvt.emulation.match('PC|XT') ? '.ans' : '.txt')

    try {
        fs.accessSync(path, fs.F_OK)
        xvt.out(fs.readFileSync(path))
        return true
    } catch (e) {
        if (xvt.emulation.match('PC|XT')) {
            let path = folder + filename + '.txt'
            try {
                fs.accessSync(path, fs.F_OK)
                xvt.out(fs.readFileSync(path))
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
    return xvt.attr(fore, '[', xvt.bright, xvt.yellow, back ? titlecase(title) : 'Bank', xvt.nobright, fore, ']', xvt.cyan, ' Option (Q=Quit): ')
}

export function emulator(cb:Function) {
    xvt.app.form = {
        'term': { cb:() => {
            if (xvt.validator.isNotEmpty(xvt.entry) && xvt.entry.length == 2) xvt.emulation = xvt.entry.toUpperCase()
            xvt.out('\n\n', xvt.reset, xvt.magenta, xvt.LGradient[xvt.emulation], xvt.reverse, 'TEST BANNER', xvt.off, xvt.RGradient[xvt.emulation], '\n')
            xvt.out(xvt.red,'R', xvt.green,'G', xvt.blue,'B', xvt.reset, xvt.bright,' bold ', xvt.off, 'normal', xvt.faint, ' dark')
            xvt.out(xvt.reset, '\n')
            xvt.waste(2000)
            for(let rows = 99; rows > 1; rows--)
                xvt.out(bracket(rows > 24 ? rows : '..'))
            xvt.app.focus = 'rows'
        }, prompt:'Select: ', enter:player.emulation, match:/VT|PC|XT/i, max:2 },
        'rows': { cb:() => {
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
            player.expires = player.lastdate + sysop.expires
            if (player.calls) {
                player.lasttime = now().time
                require('./database').saveUser(player)
            }
            try { callers = require('./users/callers') } catch(e) {}
            while (callers.length > 4)
                callers.pop()
            callers = [<caller>{who: player.handle, reason: reason}].concat(callers)
            fs.writeFileSync('./users/callers.json', JSON.stringify(callers))
        }
        //  logoff banner
        xvt.out('\n')
        xvt.out(xvt.reset, 'Goodbye, please play again!  Also visit:\n')
        xvt.waste(500)
        xvt.out(xvt.cyan, '  ___                           ', xvt.cyan, '  ___  \n')
        xvt.out(xvt.cyan, '  \\_/  ', xvt.red, xvt.LGradient[xvt.emulation], xvt.bright, xvt.Red, xvt.white, 'Never Program Mad', xvt.reset, xvt.red, xvt.RGradient[xvt.emulation], xvt.cyan, '  \\_/  \n')
        xvt.out(xvt.cyan, ' _(', xvt.bright, '-', xvt.off, ')_    ', xvt.reset, '     npmjs.com        ', xvt.cyan, ' _(', xvt.bright, '-', xvt.off, ')_ \n')
        xvt.out(xvt.cyan, '(/ ', xvt.bright, ':', xvt.off, ' \\)                         ', xvt.cyan, '(/ ', xvt.bright, ':', xvt.off, ' \\)\n')
        xvt.out(xvt.cyan, 'I\\___/I ', xvt.green, xvt.LGradient[xvt.emulation], xvt.bright, xvt.Green, xvt.white, 'CommodoreServer', xvt.reset, xvt.green, xvt.RGradient[xvt.emulation], xvt.cyan, ' I\\___/I\n')
        xvt.out(xvt.cyan, '\\/   \\/  ', xvt.reset, ' commodoreserver.com   ', xvt.cyan, '\\/   \\/\n')
        xvt.out(xvt.cyan, ' \\ : /                          ', xvt.cyan, ' \\ : / \n')
        xvt.out(xvt.cyan, '  I:I    ', xvt.blue, xvt.LGradient[xvt.emulation], xvt.bright, xvt.Blue, xvt.white, 'Robert Hurst', xvt.reset, xvt.blue, xvt.RGradient[xvt.emulation], xvt.cyan, '     I:I  \n')
        xvt.out(xvt.cyan, ' .I:I.  ', xvt.reset, '  robert.hurst-ri.us    ', xvt.cyan, ' .I:I. \n')
        xvt.out('\n')
        xvt.waste(1500)
    }
}

}

export = Common
