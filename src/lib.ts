/*****************************************************************************\
 *  Ɗaɳƙ Ɗoɱaiɳ: the return of Hack & Slash                                  *
 *  LIB authored by: Robert Hurst <theflyingape@gmail.com>                  *
\*****************************************************************************/

import xvt from '@theflyingape/xvt'
import $ = require('./runtime')
import { Coin as _coin, Ring } from './items'
import { an, dice, fs, int, LOG, NEWS, pathTo, sprintf, titlecase, whole } from './sys'

module lib {

    export function armor(profile = $.online, text = false): string {
        return text ? profile.user.armor + buff(profile.user.toAC, profile.toAC, true)
            : vt.attr(profile.armor.armoury ? vt.white : profile.armor.dwarf ? vt.yellow : vt.lcyan
                , profile.user.armor, vt.white, buff(profile.user.toAC, profile.toAC))
    }

    export function bracket(item: string | number, nl = true): string {
        const s = item.toString(), i = whole(item)
        let framed = vt.attr(vt.off, nl ? '\n' : '')
        if (nl && i >= 0 && i < 10) framed += ' '
        framed += vt.attr(vt.faint, '<', vt.bright, s, vt.faint, '>', nl ? ' ' : '', vt.reset)
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

    export function cat(name: string, delay = $.player.expert ? 5 : 50): boolean {
        const file = pathTo('files', name)
        let filename = file + (vt.emulation == 'PC' ? '.ibm' : vt.emulation == 'XT' ? '.ans' : '.txt')
        let output = []
        try {
            fs.accessSync(filename, fs.constants.F_OK)
            output = fs.readFileSync(filename, vt.emulation == 'XT' ? 'utf8' : 'binary').toString().split('\n')
        } catch (e) {
            filename = file + (vt.emulation == 'PC' ? '.ans' : '.txt')
            try {
                fs.accessSync(filename, fs.constants.F_OK)
                output = fs.readFileSync(filename, vt.emulation == 'XT' ? 'utf8' : 'binary').toString().split('\n')
            } catch (e) {
                vt.out(vt.off)
                return false
            }
        }
        for (let line in output)
            vt.out(output[line], '\n', -delay)
        vt.out(vt.off, -delay)
        return true
    }

    export function death(by: string, killed = false) {
        $.reason = by
        vt.profile({ handle: `💀 ${$.reason} 💀`, png: `death${$.player.today}`, effect: 'fadeInDownBig' })
        if (killed) {
            $.online.hp = 0
            $.online.sp = 0
            $.player.killed++
            vt.music()
            vt.sound('killed', 11)
        }
        $.online.altered = true
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
                if (title == 'main') cat('user/border')
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

    export function door(user: string): string[] {
        $.door = []
        try {
            $.door = fs.readFileSync(user).toString().split('\r\n')
        }
        catch { }
        return $.door
    }

    export function emulator(cb: Function) {
        vt.action('list')
        vt.form = {
            'term': {
                cb: () => {
                    if (vt.entry && vt.entry.length == 2) vt.emulation = <EMULATION>vt.entry.toUpperCase()
                    $.player.emulation = vt.emulation
                    if (vt.tty == 'telnet') vt.outln(`@vt.title(${$.player.emulation})`, -100)
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
                    vt.outln(-2000)
                    vt.beep()
                    if (process.stdout.rows && process.stdout.rows !== $.player.rows)
                        $.player.rows = process.stdout.rows
                    for (let rows = $.player.rows + 5; rows > 1; rows--)
                        vt.out(bracket(rows >= 24 ? rows : '..'))
                    vt.form['rows'].prompt = vt.attr('Enter top visible row number ', vt.faint, '[', vt.reset, vt.bright, `${$.player.rows < 24 ? '24' : $.player.rows}`, vt.cyan, vt.faint, ']', vt.reset, ': ')
                    prompt('rows')
                }, prompt: vt.attr('Select ', vt.faint, '[', vt.reset, vt.bright, `${$.player.emulation}`, vt.cyan, vt.faint, ']', vt.reset, ': ')
                , cancel: 'VT', enter: $.player.emulation, match: /VT|PC|XT/i, max: 2
            },
            'rows': {
                cb: () => {
                    const n = whole(vt.entry)
                    if (n > 23) $.player.rows = n
                    vt.outln()
                    prompt('pause')
                }, enter: `${$.player.rows < 24 ? '24' : $.player.rows}`, max: 2, match: /^[2-9][0-9]$/
            },
            'pause': { cb: cb, pause: true }
        }

        vt.outln('\n', vt.cyan, 'Which emulation / character encoding are you using?')
        vt.out(bracket('VT'), ' classic VT terminal with DEC drawing (telnet b&w)')
        vt.out(bracket('PC'), ' former ANSI color with Western IBM CP850 (telnet color)')
        vt.outln(bracket('XT'), ' modern ANSI color with UTF-8 & emojis (browser multimedia)')
        prompt('term')
    }

    export function getRing(how: string, what: string) {
        vt.profile({ jpg: `ring/${what}`, handle: `${what} ${Ring.name[what].emoji} 💍 ring`, effect: 'tada' })
        vt.outln()
        vt.out(vt.yellow, vt.bright, 'You ', how, an(what, false))
        vt.out(vt.cyan, what, vt.normal)
        if ($.player.emulation == 'XT') vt.out(' ', Ring.name[what].emoji, ' 💍')
        vt.out(' ring', vt.reset, ', which can\n'
            , vt.yellow, vt.bright, Ring.name[what].description)
    }

    export function log(who: string, message: string) {
        if (who.length && who[0] !== '_' && who !== $.player.id)
            fs.appendFileSync(pathTo(LOG, `${who}.txt`), `${message}\n`)
    }

    export function news(message: string, commit = false) {
        const log = pathTo(NEWS, `${$.player.id}.txt`)
        try {
            if ($.access.roleplay) {
                fs.appendFileSync(log, `${message}\n`)
                if (message && commit) {
                    fs.appendFileSync(pathTo(NEWS, 'today.txt'), fs.readFileSync(log))
                }
            }
            if (commit)
                fs.unlink(log, () => { })
        }
        catch (err) {
            vt.outln('news error:', err)
        }
    }

    export function prompt(focus: string | number, input = '', speed = 5) {
        //console.log(`input = '${input}' `, input.split('').map((c) => { return c.charCodeAt(0) }))
        if ($.access.bot)
            vt.form[focus].delay = speed < 100 ? 125 * dice(speed) * dice(speed) : speed
        vt.focus = focus

        //  queue up any input by the bot
        if ($.access.bot) setImmediate(() => {
            let data = ''
            try {
                const cr = (typeof vt.form[focus].eol == 'undefined' || vt.form[focus].eol || vt.form[focus].lines)
                data += input
                if (cr || !input) data += dice(100) > 1 ? '\r' : '\x1B'
            }
            catch {
                data += dice(100) > 1 ? '\x1B' : '\r'
            }
            process.stdin.emit('data', data)
        })
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

    class _xvt extends xvt {
        /*
        get focus() {
            return super.focus
        }

        set focus(name: string | number) {
            super.focus = name
        }
        */
        tty: TTY = 'telnet'

        beep(bell = false) {
            if (bell || vt.emulation !== 'XT')
                vt.out('\x07', -100)
            else
                vt.sound('max', 1)
        }

        checkTime(): number {
            return Math.round((this.sessionAllowed - ((new Date().getTime() - this.sessionStart.getTime()) / 1000)) / 60)
        }

        cls() {
            const rows = process.stdout.rows || 24
            const scroll = whole((this.row < rows ? this.row : rows) - (this.col == 1 ? 2 : 1))
            this.plot(rows, 1)
            this.outln(this.off, '\n'.repeat(scroll), -10)  //  allow XTerm to flush
            this.out(this.clear, -10)
        }

        //  web client extended commands in terminal emulator
        action(menu: string) {
            if (this.tty == 'web') this.out(`@action(${menu})`)
        }

        animated(effect: string, sync = 2) {
            if (this.tty == 'web') this.out(`@animated(${effect})`, -10 * sync)
        }

        music(tune = '.', sync = 2) {
            if (this.tty == 'web') this.out(`@tune(${tune})`, -10 * sync)
        }

        profile(params) {
            if (this.tty == 'web') this.out(`@profile(${JSON.stringify(params)})`)
        }

        sound(effect = '.', sync = 2) {
            if (this.tty == 'web')
                this.out(`@play(${effect})`)
            else
                this.beep(true)
            this.sleep(100 * sync)
        }

        title(name: string) {
            if (this.emulation == 'XT') this.out(`\x1B]2;${name}\x07`)
            if (this.tty == 'web') this.out(`@title(${name})`)
        }

        wall(who: string, msg: string) {
            if (this.tty !== 'door') this.out(`@wall(${who} ${msg})`)
        }
    }

    export class Coin extends _coin implements coin {

        //  top valued coin bag (+ any lesser)
        get amount(): string {
            return this.carry(2, true)
        }

        set amount(newAmount: string) {
            super.amount = newAmount
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

    export const vt = new _xvt('VT', false)
}

export = lib
