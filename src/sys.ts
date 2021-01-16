/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  SYS authored by: Robert Hurst <theflyingape@gmail.com>                   *
\*****************************************************************************/

//  dependencies
import xvt from '@theflyingape/xvt'
import Got from 'got'
import { sprintf as sf } from 'sprintf-js'
import { titleCase } from 'title-case'

//  global runtime variables
import $ = require('./runtime')
import { Award, Ring } from './items'
import { PC } from './pc'

module sys {

    //  dependencies with nice aliases
    export const fs = require('fs')
    export const PATH = process.cwd() + '/..'

    export const NEWS = `${PATH}/files/tavern`
    if (!fs.existsSync(NEWS)) fs.mkdirSync(NEWS)

    export const LOG = `${PATH}/files/user`
    if (!fs.existsSync(LOG)) fs.mkdirSync(LOG)

    export const got = Got
    export const romanize = require('romanize')
    export const sprintf = sf
    export const titlecase = titleCase

    //  TODO: use locale
    const day: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const md: number[] = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
    const mon: string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    export function an(item: string, show = true) {
        return ' ' + (/a|e|i|o|u/i.test(item[0]) ? 'an' : 'a') + ' ' + (show ? item : '')
    }

    export function armor(profile = $.online, text = false): string {
        return text ? profile.user.armor + buff(profile.user.toAC, profile.toAC, true)
            : vt.attr(profile.armor.armoury ? vt.white : profile.armor.dwarf ? vt.yellow : vt.lcyan
                , profile.user.armor, vt.white, buff(profile.user.toAC, profile.toAC))
    }

    export function beep() {
        if (vt.emulation == 'XT')
            vt.sound('max')
        else
            vt.out('\x07', -100)
    }

    export function bracket(item: number | string, nl = true): string {
        let framed = item.toString()
        framed = vt.attr(vt.off, nl ? '\n' : '', framed.length == 1 && nl ? ' ' : ''
            , vt.white, vt.faint, '<', vt.bright, framed, vt.faint, '>'
            , nl ? ' ' : '', vt.reset)
        return framed
    }

    export function buff(perm: number, temp: number, text = false): string {
        let keep = vt.emulation
        if (text) vt.emulation = 'dumb'
        let buff = ''
        if (perm || temp) {
            buff = vt.attr(vt.normal, vt.magenta, ' (')
            if (perm > 0) buff += vt.attr(vt.bright, vt.yellow, '+', perm.toString(), vt.normal, vt.white)
            else if (perm < 0) buff += vt.attr(vt.bright, vt.red, perm.toString(), vt.normal, vt.white)
            else buff += vt.attr(vt.white, '+0')
            if (temp) buff += vt.attr(','
                , (temp > 0) ? vt.attr(vt.yellow, vt.bright, '+', temp.toString())
                    : vt.attr(vt.red, vt.bright, temp.toString())
                , vt.normal)
            buff += vt.attr(vt.magenta, ')', vt.white)
        }
        if (text) vt.emulation = keep
        return buff
    }

    export function cat(filename: string): boolean {
        const folder = `${PATH}/files/`
        let path = folder + filename
            + (vt.emulation == 'PC' ? '.ibm' : vt.emulation == 'XT' ? '.ans' : '.txt')

        try {
            fs.accessSync(path, fs.constants.F_OK)
            vt.outln(fs.readFileSync(path, vt.emulation == 'XT' ? 'utf8' : 'binary'), vt.white)
            return true
        } catch (e) {
            if (vt.emulation.match('PC|XT')) {
                let path = folder + filename + '.txt'
                try {
                    fs.accessSync(path, fs.constants.F_OK)
                    vt.outln(fs.readFileSync(path), vt.white)
                    return true
                } catch (e) {
                    return false
                }
            }
        }
    }

    export function checkTime(): number {
        return Math.round((vt.sessionAllowed - ((new Date().getTime() - vt.sessionStart.getTime()) / 1000)) / 60)
    }

    export function cuss(text: string): boolean {
        let words = titlecase(text).split(' ')

        for (let i in words) {
            if (words[i].match('/^Asshole$|^Cock$|^Cunt$|^Fck$|^Fu$|^Fuc$|^Fuck$|^Fuk$|^Phuc$|^Phuck$|^Phuk$|^Twat$/')) {
                vt.reason = 'needs a timeout'
                return true
            }
        }
        return false
    }

    export function date2days(date: string): number {
        let days: number
        let month: number
        let day: number
        let year: number
        let pieces: string[]

        if (date.search('/') > 0) {
            pieces = date.split('/')
            month = whole(pieces[0])
            day = whole(pieces[1])
            year = whole(pieces[2])
        }
        else if (date.search('-') > 0) {
            pieces = date.split('-')
            month = whole(pieces[0])
            day = whole(pieces[1])
            if (day == 0) {
                day = month
                for (month = 0; month < 12 && mon[month].toLowerCase() == pieces[1].substr(0, 3).toLowerCase(); month++) { }
                month++
            }
            year = whole(pieces[2])
        }
        else if (whole(date) > 18991231) {
            year = whole(date.substr(0, 4))
            month = whole(date.substr(4, 2))
            day = whole(date.substr(6, 2))
        }
        else {
            month = whole(date.substr(0, 2))
            day = whole(date.substr(2, 2))
            year = whole(date.substr(4, 4))
        }

        month = (month < 1) ? 1 : (month > 12) ? 12 : month
        day = (day < 1) ? 1 : (day > 31) ? 31 : day
        year = (year < 100) ? year + 1900 : year

        if (isNaN(day) || isNaN(month) || isNaN(year))
            return NaN

        days = (year * 365) + int(year / 4) + md[month - 1] + (day - 1)
        if ((((year % 4) == 0) && (((year % 100) != 0) || ((year % 400) == 0))) && (month < 3))
            days--

        return days
    }

    //  returns 'Day dd-Mon-yyyy'
    export function date2full(days: number): string {
        let date = date2str(days)
        return sprintf('%.3s %.2s-%.3s-%.4s', day[(days - 1) % 7], date.substr(6, 2), mon[+date.substr(4, 2) - 1], date)
    }

    //  returns 'yyyymmdd'
    export function date2str(days: number): string {
        let month: number
        let day: number
        let year: number

        year = int(days / 1461) * 4 + int((days % 1461) / 365)
        days = days - ((year * 365) + int(year / 4)) + 1
        month = 0

        while (days > md[month + 1] - ((((year % 4) == 0) && (((year % 100) != 0) || ((year % 400) == 0))) && month == 0 ? 1 : 0) && month < 11)
            month++

        days -= md[month++]
        day = days
        if ((((year % 4) == 0) && (((year % 100) != 0) || ((year % 400) == 0))) && month < 3)
            day++

        return sprintf('%04d%02d%02d', year, month, day)
    }

    export function death(by: string, killed = false) {
        $.reason = by
        vt.profile({ handle: `💀 ${$.reason} 💀`, png: `death${$.player.today}`, effect: 'fadeInDownBig' })
        if (killed) {
            $.online.hp = 0
            $.online.sp = 0
            $.player.killed++
            vt.sound('killed', 11)
        }
        $.online.altered = true
    }

    export function dice(faces: number): number {
        return int(Math.random() * whole(faces)) + 1
    }

    //  render a menu of options and return the prompt
    export function display(title: string, back: number, fore: number, suppress: boolean, menu: choices, hint?: string): string {
        menu['Q'] = {}  //  Q=Quit
        if (!suppress) {
            vt.cls()
            if (!cat(`${title}/menu`)) {
                vt.out('    ')
                if (back)
                    vt.out(fore, '--=:))', vt.LGradient,
                        back, vt.white, vt.bright, titlecase(title), vt.reset,
                        fore, vt.RGradient, '((:=--')
                else
                    vt.out(titlecase(title))
                vt.outln('\n')
                for (let i in menu) {
                    if (menu[i].description)
                        vt.outln(vt.faint, fore, '<', vt.white, vt.bright, i, vt.faint, fore, '> ',
                            vt.reset, menu[i].description)
                }
            }
            else {
                if (title == 'main') cat('border')
            }
        }

        if (process.stdout.rows && process.stdout.rows !== $.player.rows) {
            if (!$.player.expert) vt.out('\n', vt.yellow, vt.Empty, vt.bright
                , `Resetting your USER ROW setting (${$.player.rows}) to detected size ${process.stdout.rows}`
                , vt.reset)
            $.player.rows = process.stdout.rows
        }

        if (hint && $.access.roleplay && dice(+$.player.expert * ($.player.immortal + 1) + $.player.level / 10) == 1)
            vt.out('\n', vt.green, vt.bright, hint, vt.reset)

        //  insert any wall messages here
        vt.out('\x06')

        return vt.attr(fore, '[', vt.yellow, vt.bright, back ? titlecase(title) : 'Iron Bank', vt.normal, fore, ']'
            , vt.faint, ' Option '
            , vt.normal, vt.cyan, '(Q=Quit): ')
    }

    export function emulator(cb: Function) {
        vt.action('list')
        vt.form = {
            'term': {
                cb: () => {
                    if (vt.entry && vt.entry.length == 2) vt.emulation = <EMULATION>vt.entry.toUpperCase()
                    $.player.emulation = vt.emulation
                    if (vt.tty == 'telnet') vt.outln(`@vt.title( ${$.player.emulation})`, -100)
                    vt.outln('\n', vt.reset, vt.magenta, vt.LGradient, vt.reverse, 'BANNER', vt.noreverse, vt.RGradient)
                    vt.outln(vt.red, 'R', vt.green, 'G', vt.blue, 'B', vt.reset, vt.bright, ' bold ', vt.normal, 'normal', vt.blink, ' flash ', vt.noblink, vt.faint, 'dim')
                    vt.out(vt.yellow, 'Cleric: ', vt.bright, { VT: '\x1B(0\x7D\x1B(B', PC: '\x9C', XT: '✟', dumb: '$' }[$.player.emulation]
                        , vt.normal, vt.magenta, '  Teleport: ', vt.bright, { VT: '\x1B(0\x67\x1B(B', PC: '\xF1', XT: '↨', dumb: '%' }[$.player.emulation])
                    $.online.altered = true
                    if ($.player.emulation == 'XT') {
                        vt.outln(vt.lblack, '  Bat: 🦇')
                        vt.sound('yahoo', 22)
                        cb()
                        return
                    }
                    vt.outln(-2200)
                    beep()
                    if (process.stdout.rows && process.stdout.rows !== $.player.rows)
                        $.player.rows = process.stdout.rows
                    for (let rows = $.player.rows + 5; rows > 1; rows--)
                        vt.out(bracket(rows >= 24 ? rows : '..'))
                    vt.form['rows'].prompt = vt.attr('Enter top visible row number ', vt.faint, '[', vt.reset, vt.bright, `${$.player.rows}`, vt.faint, vt.cyan, ']', vt.reset, ': ')
                    vt.focus = 'rows'
                }, prompt: vt.attr('Select ', vt.faint, '[', vt.reset, vt.bright, `${$.player.emulation}`, vt.faint, vt.cyan, ']', vt.reset, ': ')
                , enter: $.player.emulation, match: /VT|PC|XT/i, max: 2
            },
            'rows': {
                cb: () => {
                    const n = whole(vt.entry)
                    if (n > 23) $.player.rows = n
                    vt.outln()
                    vt.focus = 'pause'
                }, enter: $.player.rows.toString(), max: 2, match: /^[2-9][0-9]$/
            },
            'pause': { cb: cb, pause: true }
        }

        vt.outln('\n', vt.cyan, 'Which emulation / character encoding are you using?')
        vt.out(bracket('VT'), ' classic VT terminal with DEC drawing (telnet b&w)')
        vt.out(bracket('PC'), ' former ANSI color with Western IBM CP850 (telnet color)')
        vt.outln(bracket('XT'), ' modern ANSI color with UTF-8 & emojis (browser multimedia)')
        vt.focus = 'term'
    }

    export function expout(xp: number, awarded = true): string {
        const gain = int(100 * xp / (PC.experience($.player.level) - PC.experience($.player.level - 1)))
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

    export function getRing(how: string, what: string) {
        vt.outln()
        vt.out(vt.yellow, vt.bright, 'You ', how, an(what, false))
        vt.out(vt.cyan, what, vt.normal)
        if ($.player.emulation == 'XT') vt.out(' ', Ring.name[what].emoji, ' 💍')
        vt.out(' ring', vt.reset, ', which can\n'
            , vt.bright, vt.yellow, Ring.name[what].description)
        vt.profile({ jpg: `ring/${what}`, handle: `${what} ${Ring.name[what].emoji} 💍 ring`, effect: 'tada' })
    }

    export function input(focus: string | number, input = '', speed = 8) {
        if ($.access.bot) {
            const cr = (vt.form[focus].eol || vt.form[focus].lines)
            vt.typeahead += input
            if (cr || !input) vt.typeahead += '\r'
            vt.form[focus].delay = speed < 100 ? 125 * dice(speed) * dice(speed) : speed
        }
        vt.focus = focus
    }

    //  normalize as an integer
    export function int(n: string | number): number {
        n = (+n).valueOf()
        if (isNaN(n)) n = 0
        n = Math.trunc(n)   //  strip any fractional part
        if (n == 0) n = 0   //  strip any negative sign (really)
        return n
    }

    export function isActive(arg: any): arg is active {
        return (<active>arg).user !== undefined
    }

    export function keyhint(rpc = $.online, echo = true) {
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
                vt.outln('Key #', vt.bright, `${slot + 1}`, vt.normal, ' is not ', Award.key[$.player.keyhints[i]])
        }
        else
            vt.outln(vt.reset, 'There are no more key hints available to you.')

        rpc.altered = true
    }

    export function log(who: string, message: string) {
        const log = `${LOG}/${who}.txt`
        if (who.length && who[0] !== '_' && who !== $.player.id)
            fs.appendFileSync(log, `${message}\n`)
    }

    export function money(level: number): number {
        return int(Math.pow(2, (level - 1) / 2) * 10 * (101 - level) / 100)
    }

    export function news(message: string, commit = false) {

        const log = `${PATH}/${$.player.id}.log`

        if ($.access.roleplay) {
            fs.appendFileSync(log, `${message}\n`)
            if (message && commit) {
                const paper = `${PATH}/files/tavern/today.txt`
                fs.appendFileSync(paper, fs.readFileSync(log))
            }
        }
        if (commit)
            fs.unlink(log, () => { })
    }

    export function now(): { date: number, time: number } {
        let today = date2days(new Date().toLocaleString('en-US').split(',')[0])
        let now = new Date().toTimeString().slice(0, 5).replace(/:/g, '')
        return { date: +today, time: +now }
    }

    export function rings(profile = $.online) {
        for (let i in profile.user.rings) {
            let ring = profile.user.rings[i]
            vt.out(vt.cyan, $.player.emulation == 'XT' ? '⍤' : vt.Empty, ' ', vt.bright, ring, vt.normal, ' ')
            if ($.player.emulation == 'XT') vt.out(Ring.name[ring].emoji, '💍')
            vt.outln('ring:', vt.reset, ' can ', Ring.name[ring].description, -100)
        }
    }

    export function time(t: number): string {
        const ap = t < 1200 ? 'am' : 'pm'
        const m = t % 100
        const h = int((t < 100 ? t + 1200 : t >= 1300 ? t - 1200 : t) / 100)
        return sprintf('%u:%02u%s', h, m, ap)
    }

    export function tradein(retail: number, percentage = $.online.cha): number {
        percentage--
        return whole(retail * percentage / 100)
    }

    export function weapon(profile = $.online, text = false): string {
        return text ? profile.user.weapon + buff(profile.user.toWC, profile.toWC, true)
            : vt.attr(profile.weapon.shoppe ? vt.white : profile.weapon.dwarf ? vt.yellow : vt.lcyan
                , profile.user.weapon, vt.white, buff(profile.user.toWC, profile.toWC))
    }

    export function wearing(profile: active) {
        if (isNaN(+profile.user.weapon)) {
            vt.outln('\n', PC.who(profile).He, profile.weapon.text, ' ', weapon(profile)
                , $.from == 'Dungeon' ? -300 : !profile.weapon.shoppe ? -500 : -100)
        }
        if (isNaN(+profile.user.armor)) {
            vt.outln('\n', PC.who(profile).He, profile.armor.text, ' ', armor(profile)
                , $.from == 'Dungeon' ? -300 : !profile.armor.armoury ? -500 : -100)
        }
        if (!$.player.novice && $.from !== 'Dungeon' && profile.user.sex == 'I') for (let i in profile.user.rings) {
            let ring = profile.user.rings[i]
            if (!+i) vt.outln()
            vt.out(PC.who(profile).He, 'has ', vt.cyan, vt.bright, ring, vt.normal)
            if ($.player.emulation == 'XT') vt.out(' ', Ring.name[ring].emoji)
            vt.outln(' powers ', vt.reset, 'that can ', Ring.name[ring].description, -100)
        }
    }

    //  non-negative integer
    export function whole(n: string | number) {
        let i = int(n)
        return (i < 0) ? 0 : i
    }

    class _xvt extends xvt {

        tty: TTY = 'telnet'

        cls() {
            const rows = process.stdout.rows
            const scroll = (this.row < rows ? vt.row : rows) - (this.col == 1 ? 2 : 1)
            this.out(this.off)
            this.plot(rows, 1)
            this.outln('\n'.repeat(scroll))
            this.out(this.clear, -10)  //  allow XTerm to flush
        }

        //  web client extended commands in terminal emulator
        action(menu: string) {
            if (this.tty == 'web') vt.out(`@action(${menu})`)
        }

        animated(effect: string, sync = 2) {
            if (this.tty == 'web') vt.out(`@animated(${effect})`, -10 * sync)
        }

        music(tune: string, sync = 2) {
            if (this.tty == 'web') vt.out(`@tune(${tune})`, -10 * sync)
        }

        profile(params) {
            if (this.tty == 'web') vt.out(`@profile(${JSON.stringify(params)})`)
        }

        sound(effect: string, sync = 2) {
            if (this.tty == 'web')
                vt.out(`@play(${effect})`, -100 * sync)
            else
                vt.beep()
        }

        title(name: string) {
            if (vt.emulation == 'XT') vt.out(`\x1B]2;${name}\x07`)
            if (this.tty == 'web') vt.out(`@title(${name})`)
        }

        wall(who: string, msg: string) {
            vt.out(`@wall(${who} ${msg})`)
        }
    }

    export const vt = new _xvt('VT', false)
}

export = sys
