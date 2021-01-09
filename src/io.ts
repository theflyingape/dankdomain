/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  I/O authored by: Robert Hurst <theflyingape@gmail.com>                   *
\*****************************************************************************/

import { an, date2full, dice, fs, int, isActive, now, romanize, sprintf, titlecase, time, vt, whole } from './sys'
import db = require('./db')
import $ = require('./runtime')
import { Coin, Access, Armor, Deed, Magic, Ring, Weapon } from './items'
import { encounter, experience, news } from './lib'
import { Abilities, PC } from './pc'

module io {

    export class _award implements award {
        //  coveted
        get key(): {} {
            const oldkey = '🗝️ '
            return vt.emulation == 'XT'
                ? {
                    P: vt.attr(oldkey, vt.bright, vt.Magenta, ' Platinum ', vt.reset),
                    G: vt.attr(oldkey, vt.black, vt.Yellow, ' = Gold = ', vt.reset),
                    S: vt.attr(oldkey, vt.bright, vt.Cyan, '- Silver -', vt.reset),
                    C: vt.attr(oldkey, vt.black, vt.Red, vt.Empty, ' Copper ', vt.Empty, vt.reset)
                } : {
                    P: vt.attr(vt.off, vt.magenta, vt.bright, vt.reverse, ' Platinum ', vt.reset),
                    G: vt.attr(vt.off, vt.yellow, vt.bright, vt.reverse, ' = Gold = ', vt.reset),
                    S: vt.attr(vt.off, vt.cyan, vt.bright, vt.reverse, '- Silver -', vt.reset),
                    C: vt.attr(vt.off, vt.red, vt.bright, vt.reverse, vt.Empty, ' Copper ', vt.Empty, vt.reset)
                }
        }

        //  returns 2-character width
        get medal(): string[] {
            return vt.emulation == 'XT'
                ? ['  ', '🥇', '🥈', '🥉']
                : ['  ',
                    vt.attr(vt.bright, vt.reverse, '1', vt.noreverse, vt.normal, ' '),
                    vt.attr(vt.normal, vt.reverse, '2', vt.noreverse, ' '),
                    vt.attr(vt.faint, vt.reverse, '3', vt.noreverse, vt.normal, ' ')
                ]
        }
    }
    export const Award = new _award

    export function activate(one: active, keep = false, confused = false): boolean {
        one.adept = one.user.wins ? 1 : 0
        one.pc = PC.card(one.user.pc)
        one.str = one.user.str
        one.int = one.user.int
        one.dex = one.user.dex
        one.cha = one.user.cha
        Abilities.forEach(ability => {
            const a = `to${titlecase(ability)}`
            let rt = one.user.blessed ? 10 : 0
            rt -= one.user.cursed ? 10 : 0
            //  iterate each ring, ability runtimes are additive
            one.user.rings.forEach(ring => {
                rt -= Ring.power(one.user.rings, [ring], 'degrade', 'ability', ability).power * 2
                rt -= Ring.power(one.user.rings, [ring], 'degrade', 'pc', one.user.pc).power * 3
                rt += Ring.power([], [ring], 'upgrade', 'ability', ability).power * PC.card(one.user.pc)[a] * 2
                rt += Ring.power([], [ring], 'upgrade', 'pc', one.user.pc).power * PC.card(one.user.pc)[a] * 3
            })
            PC.adjust(ability, rt, 0, 0, one)
        })
        one.confused = false
        if (confused) return true

        one.who = PC.who(one)
        one.altered = keep
        one.hp = one.user.hp
        one.sp = one.user.sp
        one.bp = int(one.user.hp / 10)
        one.hull = one.user.hull
        Weapon.equip(one, one.user.weapon, true)
        Armor.equip(one, one.user.armor, true)
        one.user.access = one.user.access || Object.keys(Access.name)[0]

        if (!db.lock(one.user.id, one.user.id == $.player.id ? 1 : 2) && one.user.id !== $.player.id) {
            vt.outln(vt.cyan, vt.bright, `\n${one.user.handle} is engaged elsewhere.`)
            beep()
            one.altered = false
        }
        return one.altered
    }

    export function armor(profile = $.online, text = false): string {
        return text ? profile.user.armor + buff(profile.user.toAC, profile.toAC, true)
            : vt.attr(profile.armor.armoury ? vt.white : profile.armor.dwarf ? vt.yellow : vt.lcyan
                , profile.user.armor, vt.white, buff(profile.user.toAC, profile.toAC))
    }

    export function beep() {
        if ($.player.emulation == 'XT')
            sound('max')
        else
            vt.out('\x07', -125)
    }

    export function bracket(item: number | string, nl = true): string {
        var framed: string = item.toString()
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
        const folder = './files/'
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

    export function checkXP(rpc: active, cb: Function): boolean {

        $.jumped = 0

        let t = checkTime()
        if (t !== $.timeleft) {
            $.timeleft = t
            if ($.timeleft < 0) {
                if ($.online.hp > 0) $.online.hp = 0
                $.reason = $.reason || 'got exhausted'
            }
            else if ($.timeleft <= $.warning) {
                $.warning = $.timeleft
                vt.outln()
                beep()
                vt.outln(vt.bright, ` *** `, vt.faint, `${$.warning}-minute${$.warning !== 1 ? 's' : ''} remain${$.warning == 1 ? 's' : ''}`, vt.bright, ` *** `, -100)
                sound('hurry', 4)
            }
        }

        if (!Access.name[rpc.user.access].roleplay) return false
        if (rpc.user.level >= $.sysop.level) {
            riddle()
            return true
        }

        if (rpc.user.xp < experience(rpc.user.level, 1, rpc.user.int)) {
            rpc.user.xplevel = rpc.user.level
            return false
        }

        $.reason = ''
        vt.drain()

        let award = {
            hp: rpc.user.hp,
            sp: rpc.user.sp,
            str: rpc.user.str,
            int: rpc.user.int,
            dex: rpc.user.dex,
            cha: rpc.user.cha
        }
        let eligible = rpc.user.level < $.sysop.level / 2
        let bonus = false
        let started = rpc.user.xplevel || rpc.user.level

        while (rpc.user.xp >= experience(rpc.user.level, undefined, rpc.user.int) && rpc.user.level < $.sysop.level) {
            rpc.user.level++

            if (rpc.user.level == Access.name[rpc.user.access].promote) {
                music('promote')
                let title = Object.keys(Access.name).indexOf(rpc.user.access)
                do {
                    rpc.user.access = Object.keys(Access.name)[++title]
                } while (!Access.name[rpc.user.access][rpc.user.sex])
                vt.outln(-500)
                vt.outln(vt.yellow
                    , Access.name[$.king.access][$.king.sex], ' the ', $.king.access.toLowerCase()
                    , ', ', vt.bright, $.king.handle, vt.normal
                    , ', is pleased with your accomplishments\n'
                    , `and ${PC.who($.king).he}promotes you to`, vt.bright, an(rpc.user.access), vt.normal, '!', -2000)
                if (Access.name[rpc.user.access].message)
                    vt.outln(vt.yellow, `${PC.who($.king).He}whispers, `, vt.reset, vt.faint, `"${eval('`' + Access.name[rpc.user.access].message + '`')}"`, -2000)
                let nme = encounter(`AND id NOT GLOB '_*' AND id != '${$.king.id}'`)
                vt.outln(`The mob goes crazy`, -500, nme.user.id
                    ? `, except for ${nme.user.handle} seen buffing ${nme.who.his}${weapon(nme)}`
                    : `!!`, -2000)
                vt.outln([`${$.taxman.user.handle} nods an approval.`, `${$.barkeep.user.handle} slaughters a pig for tonight's feast.`, `${$.king.handle} gives you a hug.`, `${Access.name[$.king.access][$.king.sex]}'s guard salute you.`, `${$.king.handle} orders ${PC.who($.king).his} Executioner to hang ${$.player.level} prisoners in your honor.`][dice(5) - 1], -2000)
                news(`\tpromoted to ${rpc.user.access}`)
                wall(`promoted to ${rpc.user.access}`)
                vt.sessionAllowed += 300
            }

            rpc.user.hp += PC.hp(rpc.user)
            rpc.user.sp += PC.sp(rpc.user)

            PC.adjust('str', 0, PC.card(rpc.user.pc).toStr, 0, rpc)
            PC.adjust('int', 0, PC.card(rpc.user.pc).toInt, 0, rpc)
            PC.adjust('dex', 0, PC.card(rpc.user.pc).toDex, 0, rpc)
            PC.adjust('cha', 0, PC.card(rpc.user.pc).toCha, 0, rpc)

            if (eligible && rpc.user.level == 50) {
                bonus = true
                music('.')
                if (rpc.user.novice) {
                    reroll(rpc.user, $.sysop.pc, rpc.user.level)
                    rpc.user.novice = false
                    rpc.user.expert = true
                    vt.outln(vt.cyan, vt.bright, 'You are no longer a novice.  Welcome to the next level of play!')
                    sound('welcome', 9)
                    vt.outln('You morph into', vt.yellow, an(rpc.user.pc), vt.reset, '.', -250)
                    portrait()
                    sound('cheer', 21)
                }
                sound('demon', 17)
                break
            }
        }

        $.jumped = rpc.user.level - started
        award.hp = rpc.user.hp - award.hp
        award.sp = rpc.user.sp - award.sp
        rpc.hp += award.hp
        rpc.sp += award.sp

        if ((award.str = rpc.user.str - award.str) < 1) award.str = 0
        if ((award.int = rpc.user.int - award.int) < 1) award.int = 0
        if ((award.dex = rpc.user.dex - award.dex) < 1) award.dex = 0
        if ((award.cha = rpc.user.cha - award.cha) < 1) award.cha = 0

        PC.adjust('str', (award.str < 1) ? $.jumped : award.str, 0, 0, rpc)
        PC.adjust('int', (award.int < 1) ? $.jumped : award.int, 0, 0, rpc)
        PC.adjust('dex', (award.dex < 1) ? $.jumped : award.dex, 0, 0, rpc)
        PC.adjust('cha', (award.cha < 1) ? $.jumped : award.cha, 0, 0, rpc)

        if (rpc != $.online) return false

        sound('level')
        $.access = Access.name[$.player.access]
        $.online.altered = true
        vt.outln(-125)
        vt.outln('      ', vt.magenta, '-=', vt.blue, '>', vt.bright, vt.yellow, '*', vt.normal
            , vt.blue, '<', vt.magenta, '=-', -125)
        vt.outln(-125)
        vt.outln(vt.bright, vt.yellow, 'Welcome to level ', $.player.level.toString(), '!', -125)
        vt.outln(-125)
        wall(`is now a level ${$.player.level} ${$.player.pc}`)

        let deed = $.mydeeds.find((x) => { return x.deed == 'levels' })
        if (!$.player.novice && !deed) deed = $.mydeeds[$.mydeeds.push(Deed.load($.player.pc, 'levels')[0]) - 1]
        if ((deed && $.jumped >= deed.value)) {
            deed.value = $.jumped
            vt.outln(vt.cyan, ' + ', vt.bright, Deed.name[deed.deed].description, ' ', bracket(deed.value, false))
            beep()
            Deed.save(deed)
        }

        if ($.player.level < $.sysop.level) {
            vt.outln(vt.bright, sprintf('%+6d', award.hp), vt.reset, ' Hit points', -100)
            if (award.sp)
                vt.outln(vt.bright, sprintf('%+6d', award.sp), vt.reset, ' Spell points', -100)
            if (award.str)
                vt.outln(vt.bright, sprintf('%+6d', award.str), vt.reset, ' Strength', -100)
            if (award.int)
                vt.outln(vt.bright, sprintf('%+6d', award.int), vt.reset, ' Intellect', -100)
            if (award.dex)
                vt.outln(vt.bright, sprintf('%+6d', award.dex), vt.reset, ' Dexterity', -100)
            if (award.cha)
                vt.outln(vt.bright, sprintf('%+6d', award.cha), vt.reset, ' Charisma', -100)
            if (eligible && bonus) {
                skillplus(rpc, cb)
                return true
            }
            $.player.xplevel = $.player.level
        }
        else {
            riddle()
            return true
        }

        return false
    }

    export function clear() {
        const scroll = (vt.row < $.player.rows ? vt.row : $.player.rows) - (vt.col == 1 ? 2 : 1)
        vt.out(vt.off)
        vt.plot($.player.rows, 1)
        vt.outln('\n'.repeat(scroll))
        vt.out(vt.clear, -10)  //  allow XTerm to flush
    }

    export function death(by: string, killed = false) {
        $.reason = by
        profile({ handle: `💀 ${$.reason} 💀`, png: `death${$.player.today}`, effect: 'fadeInDownBig' })
        if (killed) {
            $.online.hp = 0
            $.online.sp = 0
            $.player.killed++
            sound('killed', 11)
        }
        $.online.altered = true
    }

    //  render a menu of options and return the prompt
    export function display(title: string, back: number, fore: number, suppress: boolean, menu: choices, hint?: string): string {
        menu['Q'] = {}  //  Q=Quit
        if (!suppress) {
            clear()
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
        action('list')
        vt.form = {
            'term': {
                cb: () => {
                    if (vt.entry && vt.entry.length == 2) vt.emulation = <EMULATION>vt.entry.toUpperCase()
                    $.player.emulation = vt.emulation
                    if ($.tty == 'telnet') vt.outln(`@title(${$.player.emulation})`, -100)
                    vt.outln('\n', vt.reset, vt.magenta, vt.LGradient, vt.reverse, 'BANNER', vt.noreverse, vt.RGradient)
                    vt.outln(vt.red, 'R', vt.green, 'G', vt.blue, 'B', vt.reset, vt.bright, ' bold ', vt.normal, 'normal', vt.blink, ' flash ', vt.noblink, vt.faint, 'dim')
                    vt.out(vt.yellow, 'Cleric: ', vt.bright, { VT: '\x1B(0\x7D\x1B(B', PC: '\x9C', XT: '✟', dumb: '$' }[$.player.emulation]
                        , vt.normal, vt.magenta, '  Teleport: ', vt.bright, { VT: '\x1B(0\x67\x1B(B', PC: '\xF1', XT: '↨', dumb: '%' }[$.player.emulation])
                    $.online.altered = true
                    if ($.player.emulation == 'XT') {
                        vt.outln(vt.lblack, '  Bat: 🦇')
                        sound('yahoo', 22)
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

    export function getRing(how: string, what: string) {
        vt.outln()
        vt.out(vt.yellow, vt.bright, 'You ', how, an(what, false))
        vt.out(vt.cyan, what, vt.normal)
        if ($.player.emulation == 'XT') vt.out(' ', Ring.name[what].emoji, ' 💍')
        vt.out(' ring', vt.reset, ', which can\n'
            , vt.bright, vt.yellow, Ring.name[what].description)
        profile({ jpg: `ring/${what}`, handle: `${what} ${Ring.name[what].emoji} 💍 ring`, effect: 'tada' })
    }

    export function getRuler(): boolean {
        //  King
        let ruler = Object.keys(Access.name).slice(-1)[0]
        let rs = <user[]>db.query(`SELECT id FROM Players WHERE access='${ruler}'`)
        if (rs.length) {
            $.king.id = rs[0].id
            return loadUser($.king)
        }
        //  Queen
        ruler = Object.keys(Access.name).slice(-2)[0]
        rs = <user[]>db.query(`SELECT id FROM Players WHERE access='${ruler}'`)
        if (rs.length) {
            $.king.id = rs[0].id
            return loadUser($.king)
        }
        return false
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

    export function logoff() {

        if (!$.reason) {
            loadUser($.sysop)
            //  caught screwing around?
            if ($.sysop.dob <= now().date) {
                if ($.access.roleplay) {
                    $.player.coward = true
                    $.player.lasttime = now().time
                    PC.adjust('str', -1, -1, -1)
                    PC.adjust('int', -1, -1, -1)
                    PC.adjust('dex', -1, -1, -1)
                    PC.adjust('cha', -1, -1, -1)
                }
                $.reason = vt.reason || 'mystery'
            }
            else {  //  game was won
                $.access.roleplay = false
                loadUser($.player)
                $.player.lasttime = now().time
                news(`\tonline player dropped by ${$.sysop.who} ${time($.player.lasttime)} (${$.reason})\n`, true)
            }
        }

        if ($.player.id) {
            if ($.access.roleplay) {
                if ($.from == 'Dungeon' && $.online.hp > 0) {
                    PC.adjust('cha', -1, -1, -1)
                    $.player.coin = new Coin(0)
                    if (checkTime() >= 0) {
                        if ($.player.coward && !$.player.cursed) {
                            $.player.blessed = ''
                            $.player.cursed = $.player.id
                        }
                        $.player.coward = true
                    }
                }
                //  did midnight or noon cross since last visit?
                if ($.player.lastdate != now().date || ($.player.lasttime < 1200 && now().time >= 1200))
                    $.player.today = 0
                $.player.lasttime = now().time
                $.player.remote = $.remote
                PC.saveUser($.player, false, true)
                news(`\treturned to ${$.whereis} at ${time($.player.lasttime)} as a level ${$.player.level} ${$.player.pc}`)
                news(`\t(${$.reason})\n`, true)

                try {
                    $.callers = JSON.parse(fs.readFileSync(`./users/callers.json`).toString())
                } catch (e) { }
                while ($.callers.length > 7)
                    $.callers.pop()
                $.callers = [<caller>{ who: $.player.handle, reason: $.reason }].concat($.callers)
                fs.writeFileSync(`./users/callers.json`, JSON.stringify($.callers))
            }

            wall(`logged off: ${$.reason}`)
            db.unlock($.player.id, true)
            db.unlock($.player.id)

            //  logoff banner
            if ($.online.hp < 1)
                sound('goodbye')
            else {
                if ($.player.plays) sound($.online.hull < 1 ? 'comeagain' : 'invite')
                portrait($.online)
            }

            vt.save()
            vt.out(`\x1B[1;${$.player.rows}r`)
            vt.restore()
            vt.outln(-100, '\x06')

            vt.outln(-200, 'Goodbye, please play again! Also visit: ', -300)
            vt.out(vt.cyan, '  ___                               ___  \n')
            vt.out('  \\_/   ', vt.red, vt.LGradient, vt.bright, vt.Red, vt.white, 'Never Program Mad', vt.reset, vt.red, vt.RGradient, vt.cyan, '   \\_/  \n')
            vt.out(' _(', vt.bright, '-', vt.normal, ')_     ', vt.reset, ' https://npmjs.com    ', vt.cyan, '  _(', vt.bright, '-', vt.normal, ')_ \n')
            vt.out('(/ ', $.player.emulation == 'XT' ? vt.attr(vt.faint, '⚨', vt.normal) : ':', ' \\)                          ', vt.cyan, ' (/ ', $.player.emulation == 'XT' ? vt.attr(vt.faint, '⚨', vt.normal) : ':', ' \\)\n')
            vt.out('I\\___/I    ', vt.green, vt.LGradient, vt.bright, vt.Green, vt.white, `RAH-CoCo's`, vt.reset, vt.green, vt.RGradient, vt.cyan, '     I\\___/I\n')
            vt.out('\\/   \\/ ', vt.reset, '   http://rb.gy/bruelx  ', vt.cyan, '  \\/   \\/\n')
            vt.out(' \\ : /                           ', vt.cyan, '  \\ : / \n')
            vt.out('  I:I     ', vt.blue, vt.LGradient, vt.bright, vt.Blue, vt.white, `${$.player.emulation == 'XT' ? 'ℝ' : 'R'}ober${$.player.emulation == 'XT' ? 'ƭ ℍ' : 't H'}urs${$.player.emulation == 'XT' ? 'ƭ' : 't'}`, vt.reset, vt.blue, vt.RGradient, vt.cyan, '      I:I  \n')
            vt.outln(' .I:I. ', vt.reset, '   https://www.DDgame.us   ', vt.cyan, ' .I:I.')
            vt.outln(-400)
            vt.outln(vt.black, vt.bright, process.title
                , ' running on ', vt.green, 'Node.js ', vt.normal, process.version, vt.reset
                , vt.faint, ' (', vt.cyan, process.platform, vt.white, vt.faint, ')', -1965)
            if ($.access.roleplay && $.player.today && $.player.level > 1)
                music($.online.hp > 0 ? 'logoff' : 'death')
        }
        else
            sound('invite')
    }

    export function expout(xp: number, awarded = true): string {
        const gain = int(100 * xp / (experience($.player.level) - experience($.player.level - 1)))
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

    export function loadUser(rpc: active | user): boolean {
        let user: user = isActive(rpc) ? rpc.user : rpc
        let sql = 'SELECT * FROM Players WHERE '
        if (user.handle) user.handle = titlecase(user.handle)
        sql += (user.id) ? `id = '${user.id.toUpperCase()}'` : `handle = '${user.handle}'`

        let rs = db.query(sql)
        if (rs.length) {
            Object.assign(user, rs[0])
            user.coin = new Coin(rs[0].coin)
            user.bank = new Coin(rs[0].bank)
            user.loan = new Coin(rs[0].loan)
            user.bounty = new Coin(rs[0].bounty)

            user.keyhints = rs[0].keyhints.split(',')

            user.poisons = []
            if (rs[0].poisons.length) {
                let vials = rs[0].poisons.split(',')
                for (let i = 0; i < vials.length; i++)
                    user.poisons[i] = +vials[i]
            }

            user.spells = []
            if (rs[0].spells.length) {
                let spells = rs[0].spells.split(',')
                for (let i = 0; i < spells.length; i++)
                    user.spells[i] = +spells[i]
            }

            user.rings = []
            if (rs[0].rings.length) {
                let rings = rs[0].rings.split(',')
                for (let i = 0; i < rings.length; i++)
                    Ring.wear(user.rings, rings[i].replace(/''/g, `'`))
            }

            if (isActive(rpc)) activate(rpc)

            //  restore NPC to static state
            if (user.id[0] == '_' && user.id !== "_SYS") {
                let npc = <user>{ id: user.id }
                try {
                    const js = JSON.parse(fs.readFileSync(`./user/${{ "_BAR": "barkeep", "_DM": "merchant", "_NEP": "neptune", "_OLD": "seahag", "_TAX": "taxman", "_WOW": "witch" }[npc.id]}.json`).toString())
                    if (js) {
                        Object.assign(npc, js)
                        Object.assign(user, npc)
                        reroll(user, user.pc, user.level)
                        Object.assign(user, npc)
                        PC.saveUser(user)
                    }
                }
                catch (err) { }
            }

            return true
        }
        else {
            user.id = ''
            return false
        }
    }

    export function playerPC(points = 200, immortal = false) {

        music('reroll')
        if (points > 240) points = 240
        vt.outln(-1000)
        if (!Access.name[$.player.access].roleplay) return

        if ($.player.novice) {
            let novice = <user>{ novice: true }
            Object.assign(novice, JSON.parse(fs.readFileSync(`./users/novice.json`).toString()))
            reroll($.player, novice.pc)
            Object.assign($.player, novice)
            $.player.coin = new Coin(novice.coin.toString())
            $.player.bank = new Coin(novice.bank.toString())
            PC.newkeys($.player)

            vt.outln('Since you are a new user here, you are automatically assigned a character')
            vt.out('class.  At the Main Menu, press ', bracket('Y', false), ' to see all your character information.')
            show()
            activate($.online)
            news(`Welcome a ${$.player.pc} player, ${$.player.handle}`)
            require('./tty/main').menu(true)
            return
        }
        else {
            vt.sessionAllowed += 300
            $.warning = 2
        }

        action('list')
        vt.form = {
            'pc': { cb: pick, min: 1, max: 2, cancel: '!' },
            'str': { cb: ability, min: 2, max: 2, match: /^[2-8][0-9]$/ },
            'int': { cb: ability, min: 2, max: 2, match: /^[2-8][0-9]$/ },
            'dex': { cb: ability, min: 2, max: 2, match: /^[2-8][0-9]$/ },
            'cha': { cb: ability, min: 2, max: 2, match: /^[2-8][0-9]$/ }
        }
        let a = { str: 20, int: 20, dex: 20, cha: 20 }

        if (immortal) {
            show()
            ability('str')
            return
        }

        profile({ jpg: 'classes', handle: 'Reroll!', effect: 'tada' })
        vt.outln($.player.pc, ', you have been rerolled.  You must pick a class.\n', -1500)

        vt.outln(vt.cyan, '      Character                       ', vt.faint, '>> ', vt.normal, 'Ability bonus')
        vt.outln(vt.cyan, '        Class      Users  Difficulty  Str  Int  Dex  Cha     Notable Feature')
        vt.out(vt.faint, vt.cyan, '      ---------     ---   ----------  ---  ---  ---  ---  ---------------------')

        let classes = ['']
        let n = 0
        for (let pc in PC.name['player']) {
            let rpc = PC.card(pc)
            if (++n > 2) {
                if ($.player.keyhints.indexOf(pc, 12) < 0) {
                    vt.out(bracket(classes.length))
                    classes.push(pc)
                }
                else {
                    const framed = n < 12
                        ? vt.attr(vt.faint, ' <', vt.red, 'x')
                        : vt.attr(vt.faint, '<', vt.red, 'xx')
                    vt.out('\n', framed, vt.white, '> ')
                }

                let rs = db.query(`SELECT COUNT(id) AS n FROM Players WHERE pc='${pc}' and id NOT GLOB '_*'`)[0]

                vt.out(sprintf(' %-9s  %s  %3s    %-8s    +%s   +%s   +%s   +%s  %s'
                    , pc, $.player.emulation == 'XT' ? rpc.unicode : ' '
                    , +rs.n ? rs.n : vt.attr(vt.blue, '  ', vt.Empty, vt.white)
                    , rpc.difficulty
                    , vt.attr([vt.white, vt.green, vt.cyan, vt.magenta][rpc.toStr - 1], rpc.toStr.toString(), vt.white)
                    , vt.attr([vt.white, vt.green, vt.cyan, vt.magenta][rpc.toInt - 1], rpc.toInt.toString(), vt.white)
                    , vt.attr([vt.white, vt.green, vt.cyan, vt.magenta][rpc.toDex - 1], rpc.toDex.toString(), vt.white)
                    , vt.attr([vt.white, vt.green, vt.cyan, vt.magenta][rpc.toCha - 1], rpc.toCha.toString(), vt.white)
                    , rpc.specialty)
                )
            }
        }
        vt.outln()

        vt.form['pc'].prompt = `Enter class (1-${(classes.length - 1)}): `
        vt.focus = 'pc'

        function show() {
            profile({
                png: 'player/' + $.player.pc.toLowerCase() + ($.player.gender == 'F' ? '_f' : '')
                , handle: $.player.handle, level: $.player.level, pc: $.player.pc, effect: 'zoomInDown'
            })
            vt.outln()
            cat('player/' + $.player.pc.toLowerCase())
            let rpc = PC.card($.player.pc)
            for (let l = 0; l < rpc.description.length; l++)
                vt.outln(vt.bright, vt.cyan, rpc.description[l])
        }

        function pick() {
            let n: number = int(vt.entry)
            if (n < 1 || n >= classes.length) {
                vt.beep()
                vt.refocus()
                return
            }
            reroll($.player, classes[n])
            show()
            ability('str')
        }

        function ability(field?: string) {
            if (field) {
                vt.out('\n', vt.yellow, 'You have ', vt.bright, points.toString(), vt.normal, ' points to distribute between 4 abilities: Strength, Intellect,\n')
                vt.outln('Dexterity, Charisma.  Each ability must be between ', vt.bright, '20', vt.normal, ' and ', vt.bright, '80', vt.normal, ' points.')
                if ($.player.immortal < 3) {
                    vt.outln('\nThis tracks how hard a character hits. Characters with higher Strength gain')
                    vt.outln('more Hit Points when advancing in Experience Levels. More Strength yields more')
                    vt.outln('damage in melee attacks.')
                }
                vt.form[field].enter = $.player.str.toString()
                vt.form[field].cancel = vt.form[field].enter
                vt.form[field].prompt = 'Enter your Strength  ' + bracket($.player.str, false) + ': '
                vt.focus = field
                return
            }

            let n: number = whole(vt.entry)
            if (n < 20 || n > 80) {
                vt.beep()
                vt.refocus()
                return
            }

            let left = points
            let p = vt.focus

            switch (p) {
                case 'str':
                    left -= n
                    a.str = n

                    if ($.player.immortal < 3) {
                        vt.outln('\n\nThis statistic comes into play mainly in casting and resisting magic. It is also')
                        vt.outln(`calculated into approximating an opponent's Hit Points and ability to remember`)
                        vt.outln('visited dungeon levels. Bonus Spell Power is awarded to those with a high')
                        vt.out('Intellect upon gaining a level.')
                    }
                    p = 'int'
                    vt.form[p].prompt = 'Enter your Intellect'
                    vt.form[p].enter = $.player.int.toString()
                    vt.form[p].cancel = vt.form[p].enter
                    break

                case 'int':
                    left -= a.str + n
                    a.int = n

                    if ($.player.immortal < 3) {
                        vt.outln('\n\nYour overall fighting ability is measured by how dexterous you are. It is used')
                        vt.outln('to calculate who gets the first attack in a battle round, whether a hit was')
                        vt.out('made, jousting ability, and in other applicable instances.')
                    }
                    p = 'dex'
                    vt.form[p].prompt = 'Enter your Dexterity'
                    vt.form[p].enter = $.player.dex.toString()
                    vt.form[p].cancel = vt.form[p].enter
                    break

                case 'dex':
                    left -= a.str + a.int + n
                    if (left < 20 || left > 80) {
                        vt.beep()
                        vt.outln()
                        reroll($.player, $.player.pc)
                        ability('str')
                        return
                    }
                    a.dex = n

                    if ($.player.immortal < 3) {
                        vt.outln('\n\nA high Charisma will get you more money when selling items in the Square and')
                        vt.outln('from defeated foes. Some of the random events that occur tend to favor those')
                        vt.out('with a high Charisma as well.')
                    }
                    p = 'cha'
                    vt.form[p].prompt = 'Enter your Charisma '
                    vt.form[p].enter = left.toString()
                    vt.form[p].cancel = vt.form[p].enter
                    break

                case 'cha':
                    left -= a.str + a.int + a.dex + n
                    if (left) {
                        vt.beep()
                        reroll($.player, $.player.pc)
                        ability('str')
                        return
                    }
                    a.cha = n

                    $.player.str = a.str
                    $.player.int = a.int
                    $.player.dex = a.dex
                    $.player.cha = a.cha
                    activate($.online)

                    vt.outln()
                    PC.saveUser($.player)
                    news(`\trerolled as${an($.player.pc)}`)
                    if (immortal) {
                        $.online.hp = 0
                        $.reason = 'became immortal'
                        vt.hangup()
                    }
                    else {
                        vt.outln()
                        vt.outln(vt.yellow, '... ', vt.bright, 'and you get to complete any remaining parts to this play.')
                        require('./tty/main').menu(true)
                    }
                    return
            }

            vt.outln('\n\nYou have ', vt.bright, left.toString(), vt.normal, ' ability points left.')
            vt.form[p].prompt += ' ' + bracket(vt.form[p].enter, false) + ': '
            vt.focus = p
        }
    }

    export function skillplus(rpc: active, cb: Function) {

        portrait($.online)
        rpc.user.expert = true

        //  slow-roll endowment choices for a dramatic effect  :)
        vt.outln(-500)
        let hero = ` ${$.player.emulation == 'XT' ? PC.card($.player.pc).unicode : '+'} `
        vt.outln(vt.bright, vt.yellow, hero, vt.normal, 'You earn a gift to endow your '
            , vt.faint, rpc.user.pc, vt.normal, ' character', vt.bright, hero, -1000)
        vt.outln(-500)
        vt.drain()

        if (rpc.user.maxstr < 97 || rpc.user.maxint < 97 || rpc.user.maxdex < 97 || rpc.user.maxcha < 97)
            vt.outln(bracket(0, false), vt.yellow, ' Increase ALL abilities by ', vt.reset, '+3', -125)
        vt.outln(bracket(1, false), vt.yellow, ' Increase Strength ability from ', vt.reset
            , rpc.user.maxstr.toString(), ' '
            , rpc.user.maxstr < 90 ? '[WEAK]'
                : rpc.user.maxstr < 95 ? '-Average-'
                    : rpc.user.maxstr < 99 ? '=Strong='
                        : '#MAX#'
            , -125)
        vt.outln(bracket(2, false), vt.yellow, ' Increase Intellect ability from ', vt.reset
            , rpc.user.maxint.toString(), ' '
            , rpc.user.maxint < 90 ? '[MORON]'
                : rpc.user.maxint < 95 ? '-Average-'
                    : rpc.user.maxint < 99 ? '=Smart='
                        : '#MAX#'
            , -125)
        vt.outln(bracket(3, false), vt.yellow, ' Increase Dexterity ability from ', vt.reset
            , rpc.user.maxdex.toString(), ' '
            , rpc.user.maxdex < 90 ? '[SLOW]'
                : rpc.user.maxdex < 95 ? '-Average-'
                    : rpc.user.maxdex < 99 ? '=Swift='
                        : '#MAX#'
            , -125)
        vt.outln(bracket(4, false), vt.yellow, ' Increase Charisma ability from ', vt.reset
            , rpc.user.maxcha.toString(), ' '
            , rpc.user.maxcha < 90 ? '[SURLY]'
                : rpc.user.maxcha < 95 ? '-Average-'
                    : rpc.user.maxcha < 99 ? '=Affable='
                        : '#MAX#'
            , -125)
        vt.outln(bracket(5, false), vt.yellow, ' Improve Melee skill from ', vt.reset
            , rpc.user.melee.toString(), 'x '
            , ['[POOR]', '-Average-', '+Good+', '=Masterful=', '#MAX#'][rpc.user.melee]
            , -125)
        vt.outln(bracket(6, false), vt.yellow, ' Improve Backstab skill from ', vt.reset
            , rpc.user.backstab.toString(), 'x '
            , ['[RARE]', '-Average-', '+Good+', '=Masterful=', '#MAX#'][rpc.user.backstab]
            , -125)
        vt.outln(bracket(7, false), vt.yellow, ' Improve Poison skill from ', vt.reset
            , rpc.user.poison.toString(), 'x '
            , ['[BAN]', '-Average-', '+Good+', '=Masterful=', '#MAX#'][rpc.user.poison]
            , -125)
        if (rpc.user.magic < 2) {
            vt.out(bracket(8, false), vt.yellow, ' Improve Magic skill from ', vt.reset)
            vt.out(['[BAN]', '-Wands-'][rpc.user.magic])
        }
        else {
            vt.out(bracket(8, false), vt.yellow, ' Increase Mana power for ', vt.reset)
            vt.out(['+Scrolls+', '=Spells=', '#MAX#'][rpc.user.magic - 2])
        }
        vt.outln(-125)
        vt.outln(bracket(9, false), vt.yellow, ' Improve Stealing skill from ', vt.reset
            , rpc.user.steal.toString(), 'x '
            , ['[RARE]', '-Average-', '+Good+', '=Masterful=', '#MAX#'][rpc.user.steal]
            , -125)

        action('list')

        vt.form = {
            'skill': {
                cb: () => {
                    vt.out('\n', vt.bright)
                    switch (+vt.entry) {
                        case 0:
                            news('\tgot generally better')
                            PC.adjust('str', 3, 3, 3)
                            PC.adjust('int', 3, 3, 3)
                            PC.adjust('dex', 3, 3, 3)
                            PC.adjust('cha', 3, 3, 3)
                            break

                        case 1:
                            news('\tcan get even Stronger')
                            if (($.player.maxstr += 10) > 100) $.player.maxstr = 100
                            vt.out(vt.red, `Maximum Strength is now ${$.player.maxstr}.`)
                            break

                        case 2:
                            news('\tcan get even Wiser')
                            if (($.player.maxint += 10) > 100) $.player.maxint = 100
                            vt.out(vt.green, `Maximum Intellect is now ${$.player.maxint}.`)
                            break

                        case 3:
                            news('\tcan get even Quicker')
                            if (($.player.maxdex += 10) > 100) $.player.maxdex = 100
                            vt.out(vt.magenta, `Maximum Dexterity is now ${$.player.maxdex}.`)
                            break

                        case 4:
                            news('\tcan get even Nicer')
                            if (($.player.maxcha += 10) > 100) $.player.maxcha = 100
                            vt.out(vt.yellow, `Maximum Charisma is now ${$.player.maxcha}.`)
                            break

                        case 5:
                            if ($.player.melee > 3) {
                                vt.refocus()
                                return
                            }
                            news('\tgot Milk')
                            vt.out([vt.cyan, vt.blue, vt.red, vt.yellow][$.player.melee]
                                , ['You can finally enter the Tavern without fear.'
                                    , 'So you want to be a hero, eh?'
                                    , 'Just what this world needs, another fighter.'
                                    , 'Watch out for blasts, you brute!'][$.player.melee++]
                            )
                            break

                        case 6:
                            if ($.player.backstab > 3) {
                                vt.refocus()
                                return
                            }
                            news('\twatch your Back now')
                            vt.out([vt.cyan, vt.blue, vt.red, vt.black][$.player.backstab]
                                , ['A backstab is in your future.'
                                    , 'You may backstab more regularly now.'
                                    , 'You will deal a more significant, first blow.'
                                    , 'What were you doing?  Sneaking.'][$.player.backstab++]
                            )
                            break

                        case 7:
                            if ($.player.poison > 3) {
                                vt.refocus()
                                return
                            }
                            news('\tApothecary visits have more meaning')
                            vt.out([vt.green, vt.cyan, vt.red, vt.magenta][$.player.poison]
                                , ['The Apothecary will sell you toxins now, bring money.'
                                    , 'Your poisons can achieve (+1x,+1x) potency now.'
                                    , 'Your banes will add (+1x,+2x) potency now.'
                                    , 'Your venena now makes for (+2x,+2x) potency!'][$.player.poison++]
                            )
                            break

                        case 8:
                            if ($.player.magic > 3) {
                                vt.refocus()
                                return
                            }
                            news('\tbecame more friendly with the old mage')
                            switch ($.player.magic) {
                                case 0:
                                    vt.out(vt.cyan, 'The old mage will see you now, bring money.')
                                    $.player.magic++
                                    $.player.spells = []
                                    break
                                case 1:
                                    vt.out(vt.cyan, 'You can no longer use wands.')
                                    $.player.magic++
                                    $.player.spells = []
                                    $.player.sp += 15 + dice(511)
                                    $.online.sp = $.player.sp
                                    break
                                default:
                                    vt.out(vt.black, 'More mana is better')
                                    $.player.sp += 511
                                    $.online.sp += dice(511)
                                    break
                            }
                            break

                        case 9:
                            if ($.player.steal > 3) {
                                vt.refocus()
                                return
                            }
                            news('\ttry to avoid in the Square')
                            vt.out([vt.cyan, vt.blue, vt.red, vt.black][$.player.steal]
                                , ['Your fingers are starting to itch.'
                                    , 'Your eyes widen at the chance for unearned loot.'
                                    , 'Welcome to the Thieves guild: go pick a pocket or two!'
                                    , `You're convinced that no lock can't be picked.`][$.player.steal++]
                            )
                            break

                        default:
                            vt.refocus()
                            return
                    }

                    $.online.altered = true
                    vt.outln(-2000)
                    cb()
                }, prompt: 'Choose which: ', cancel: '0', min: 1, max: 1, match: /^[0-9]/
            }
        }
        vt.drain()
        vt.focus = 'skill'
    }

    export function portrait(rpc = $.online, effect = 'fadeInLeft', meta = '') {
        let userPNG = `door/static/images/user/${rpc.user.id}.png`
        try {
            fs.accessSync(userPNG, fs.constants.F_OK)
            userPNG = `user/${rpc.user.id}`
        } catch (e) {
            userPNG = (PC.name['player'][rpc.user.pc] || PC.name['immortal'][rpc.user.pc] ? 'player' : 'monster') + '/' + rpc.user.pc.toLowerCase() + (rpc.user.gender == 'F' ? '_f' : '')
        }
        profile({ png: userPNG, handle: rpc.user.handle, level: rpc.user.level, pc: rpc.user.pc, effect: effect })
        title(`${rpc.user.handle}: level ${rpc.user.level} ${rpc.user.pc} ${meta}`)
    }

    export function reroll(user: user, dd?: string, level = 1) {
        //  reset essential character attributes
        level = level > 99 ? 99 : level < 1 ? 1 : level
        user.level = level
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

        //  reset these prior experiences
        user.jl = 0
        user.jw = 0
        user.steals = 0
        user.tl = 0
        user.tw = 0

        //  reset for new or non player
        if (!user.id || user.id[0] == '_') {
            if (isNaN(user.dob)) user.dob = now().date
            if (isNaN(user.joined)) user.joined = now().date
            user.lastdate = now().date
            user.lasttime = now().time
            user.gender = user.sex || 'I'

            user.emulation = vt.emulation
            user.calls = 0
            user.today = 0
            user.expert = false
            user.rows = process.stdout.rows || 24
            user.remote = ''
            user.novice = !user.id && user.gender !== 'I'
            user.gang = user.gang || ''
            user.wins = 0
            user.immortal = 0

            user.coin = new Coin(0)
            user.bank = new Coin(0)
            user.loan = new Coin(0)
            user.bounty = new Coin(0)
            user.who = ''
            user.security = ''
            user.realestate = ''
            user.keyhints = []
        }

        if (level == 1) {
            Object.assign(user, JSON.parse(fs.readFileSync(`./users/reroll.json`).toString()))
            user.gender = user.sex
            user.coin = new Coin(user.coin.toString())
            user.bank = new Coin(user.bank.toString())
            user.loan = new Coin(0)
            //  force a verify if their access allows it
            // if (!user.novice && !Access.name[player.access].sysop) user.email = ''
        }

        if (level == 1 || !user.id || user.id[0] == '_') {
            //  no extra free or augmented stuff
            user.poisons = []
            user.spells = []
            if (user.rings) user.rings.forEach(ring => { Ring.save(ring) })
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
            user.retreats = 0
            user.killed = 0
            user.kills = 0
            user.bounty = new Coin(0)
            user.who = ''
        }

        if (user.level > 1) user.xp = experience(user.level - 1, 1, user.int)
        user.xplevel = (user.pc == Object.keys(PC.name['player'])[0]) ? 0 : user.level

        for (let n = 2; n <= level; n++) {
            user.level = n
            if (user.level == 50 && user.gender !== 'I' && user.id[0] !== '_' && !user.novice) {
                vt.out(vt.reset, vt.bright, vt.yellow, '+', vt.reset, ' Bonus ')
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
                        vt.out('Strength')
                        break
                    case 2:
                        if ((user.maxint += 10) > 99)
                            user.maxint = 99
                        vt.out('Intellect')
                        break
                    case 3:
                        if ((user.maxdex += 10) > 99)
                            user.maxdex = 99
                        vt.out('Dexterity')
                        break
                    case 4:
                        if ((user.maxcha += 10) > 99)
                            user.maxcha = 99
                        vt.out('Charisma')
                        break
                    case 5:
                        user.melee++
                        vt.out('Melee')
                        break
                    case 6:
                        user.backstab++
                        vt.out('Backstab')
                        break
                    case 7:
                        user.poison++
                        vt.out('Poison')
                        break
                    case 8:
                        if (user.magic < 4)
                            user.magic++
                        vt.out('Spellcasting')
                        break
                    case 9:
                        user.steal++
                        vt.out('Stealing')
                        break
                }
                vt.out(' added')
                if (user != $.player) vt.out(' to ', user.handle)
                vt.outln(' ', vt.bright, vt.yellow, '+')
            }
            if ((user.str += rpc.toStr) > user.maxstr)
                user.str = user.maxstr
            if ((user.int += rpc.toInt) > user.maxint)
                user.int = user.maxint
            if ((user.dex += rpc.toDex) > user.maxdex)
                user.dex = user.maxdex
            if ((user.cha += rpc.toCha) > user.maxcha)
                user.cha = user.maxcha
            user.hp += PC.hp(user)
            user.sp += PC.sp(user)
        }
    }

    // the Ancient Riddle of the Keys
    export function riddle() {

        action('clear')
        portrait($.online, 'tada')
        vt.outln()

        //  should never occur
        if ($.player.novice) {
            $.player.novice = false
            $.player.expert = true
            vt.outln('You are no longer a novice.  Welcome to the next level of play.', -2000)
        }

        let bonus = 0
        let deeds = ['plays', 'jl', 'jw', 'killed', 'kills', 'retreats', 'steals', 'tl', 'tw']

        if (!Access.name[$.player.access].sysop) {
            $.mydeeds = Deed.load($.player.pc)
            vt.outln('\nChecking your deeds for the ', vt.bright, $.player.pc, vt.normal, ' list ... ', -1000)
            for (let i in deeds) {
                let deed = $.mydeeds.find((x) => { return x.deed == deeds[i] })
                if (/jw|steals|tw/.test(deeds[i])) {
                    if (!deed) deed = $.mydeeds[$.mydeeds.push(Deed.load($.player.pc, deeds[i])[0]) - 1]
                    if ($.player[deeds[i]] >= deed.value) {
                        deed.value = $.player[deeds[i]]
                        Deed.save(deed)
                        bonus = 1
                        vt.outln(vt.cyan, ' + ', vt.bright, Deed.name[deeds[i]].description, ' ', bracket(deed.value, false))
                        sound('click', 5)
                    }
                }
                else {
                    if (!deed) deed = $.mydeeds[$.mydeeds.push(Deed.load($.player.pc, deeds[i])[0]) - 1]
                    if (deeds[i] == 'jl' && $.player.jl < 2 && $.player.jw < 5) continue
                    if (deeds[i] == 'tl' && $.player.tl < 2 && $.player.tw < 5) continue
                    if ($.player[deeds[i]] <= deed.value) {
                        deed.value = $.player[deeds[i]]
                        Deed.save(deed)
                        bonus = 1
                        vt.outln(vt.cyan, ' + ', vt.bright, Deed.name[deeds[i]].description, ' ', bracket(deed.value, false))
                        sound('click', 5)
                    }
                }
            }

            $.mydeeds = Deed.load('GOAT')
            vt.outln(vt.magenta, '\nChecking your deeds for the ', vt.bright, 'GOAT', vt.normal, ' list ... ', -1000)
            for (let i in deeds) {
                let deed = $.mydeeds.find((x) => { return x.deed == deeds[i] })
                if (/jw|steals|tw/.test(deeds[i])) {
                    if (!deed) deed = $.mydeeds[$.mydeeds.push(Deed.load('GOAT', deeds[i])[0]) - 1]
                    if ($.player[deeds[i]] >= deed.value) {
                        deed.value = $.player[deeds[i]]
                        Deed.save(deed)
                        bonus = 2
                        vt.outln(vt.yellow, ' + ', vt.bright, Deed.name[deeds[i]].description, ' ', bracket(deed.value, false))
                        sound('click', 5)
                    }
                }
                else {
                    if (!deed) deed = $.mydeeds[$.mydeeds.push(Deed.load('GOAT', deeds[i])[0]) - 1]
                    if (deeds[i] == 'jl' && $.player.jl < 2 && $.player.jw < 10) continue
                    if (deeds[i] == 'tl' && $.player.tl < 2 && $.player.tw < 10) continue
                    if ($.player[deeds[i]] <= deed.value) {
                        deed.value = $.player[deeds[i]]
                        Deed.save(deed)
                        bonus = 3
                        vt.outln(vt.yellow, ' + ', vt.bright, Deed.name[deeds[i]].description, ' ', bracket(deed.value, false))
                        sound('click', 5)
                    }
                }
            }
        }
        else
            bonus = 2

        if ($.player.coward) {
            $.player.coward = false
            vt.out('Welcome back to play with the rest of us ... ')
            if (bonus) {
                bonus--
                vt.out(-600, vt.faint, 'Heh.')
            }
            vt.outln(-900)
        }

        music('immortal')
        $.player.immortal++
        vt.outln(vt.cyan, vt.bright, '\nYou have become so powerful that you are now immortal ', -3000)
        db.run(`UPDATE Players SET bank=bank+${$.player.bank.value + $.player.coin.value} WHERE id='${$.taxman.user.id}'`)
        vt.outln(vt.cyan, '    and you leave your worldly possessions behind.', -2000)

        let max = Object.keys(PC.name['immortal']).indexOf($.player.pc) + 1
        if (max || $.player.keyhints.slice(12).length > int(Object.keys(PC.name['player']).length / 2))
            $.player.keyhints.splice(12, 1)
        else
            $.player.keyhints.push($.player.pc)

        reroll($.player)
        PC.saveUser($.player)
        vt.sessionAllowed += 300
        $.warning = 2

        if (max > 2) {
            music('victory')

            const log = `./files/winners.txt`
            fs.appendFileSync(log, sprintf(`%22s won on %s  -  game took %3d days\n`
                , $.player.handle
                , date2full(now().date)
                , now().date - $.sysop.dob + 1))
            loadUser($.sysop)
            $.sysop.who = $.player.handle
            $.sysop.dob = now().date + 1
            $.sysop.plays = 0
            PC.saveUser($.sysop)

            $.player.wins++
            db.run(`UPDATE Players SET wins=${$.player.wins} WHERE id='${$.player.id}'`)
            $.reason = 'WON THE GAME !!'
            vt.outln($.tty == 'web' ? -4321 : -432)

            profile({ jpg: 'winner', effect: 'fadeInUp' })
            title(`${$.player.handle} is our winner!`)
            vt.outln(vt.cyan, vt.bright, 'CONGRATULATIONS!! ', -600
                , vt.reset, ' You have won the game!\n', -600)

            vt.out(vt.yellow, 'The board will now reset ', -600, vt.faint)
            let rs = db.query(`SELECT id, pid FROM Online WHERE id!='${$.player.id}'`)
            for (let row in rs) {
                try {
                    process.kill(rs[row].pid, 'SIGHUP')
                    vt.out('x', -10)
                }
                catch {
                    beep()
                    vt.out('?', -100)
                }
                db.unlock(rs[row].id)
            }

            sound('winner')
            vt.out(vt.bright)

            rs = db.query(`SELECT id FROM Players WHERE id NOT GLOB '_*'`)
            let user: user = { id: '' }
            for (let row in rs) {
                user.id = rs[row].id
                loadUser(user)
                reroll(user)
                PC.newkeys(user)
                user.keyhints.splice(12)
                PC.saveUser(user)
                fs.unlink(`./users/.${user.id}.json`, () => { })
                vt.out('.', -10)
            }
            db.run(`UPDATE Rings SET bearer=''`)   // should be cleared by rerolls

            let i = 0
            while (++i) {
                try {
                    user = <user>{ id: '' }
                    Object.assign(user, JSON.parse(fs.readFileSync(`./users/bot${i}.json`).toString()))
                    let bot = <user>{}
                    Object.assign(bot, user)
                    PC.newkeys(bot)
                    reroll(bot, bot.pc, bot.level)
                    Object.assign(bot, user)
                    PC.saveUser(bot)
                    vt.out('&', -10)
                }
                catch (err) {
                    beep()
                    vt.out('?', -100)
                    break
                }
            }

            vt.outln(-1250)
            vt.outln('Happy hunting ', vt.uline, 'tomorrow', vt.nouline, '!')
            vt.outln(-2500)
            vt.hangup()
        }

        $.player.today = 0
        vt.out(vt.yellow, vt.bright, '\nYou are rewarded'
            , vt.normal, ` ${$.access.calls} `, vt.bright, 'more calls today.\n', vt.reset)

        vt.outln(vt.green, vt.bright, `\nOl' Mighty One!  `
            , vt.normal, 'Solve the'
            , vt.faint, ' Ancient Riddle of the Keys '
            , vt.normal, 'and you will become\nan immortal being.')

        for (let i = 0; i <= max + bonus; i++) keyhint($.online, false)
        PC.saveUser($.player)

        let prior: number = -1
        let slot: number
        for (let i in $.player.keyhints) {
            if (+i < 12 && $.player.keyhints[i]) {
                slot = int(+i / 3)
                if (slot !== prior) {
                    prior = slot
                    vt.outln()
                }
                vt.outln('Key #', vt.bright, `${slot + 1}`, vt.normal, ' is not ', Award.key[$.player.keyhints[i]])
            }
        }

        action('riddle')
        let combo = $.player.keyseq

        vt.form = {
            'key': {
                cb: () => {
                    let attempt = vt.entry.toUpperCase()
                    music('steal')
                    vt.out(' ... you insert and twist the key ', -1234)
                    for (let i = 0; i < 3; i++) {
                        vt.out('.')
                        sound('click', 12)
                    }
                    if (attempt == combo[slot]) {
                        sound('max')
                        if ($.player.emulation == 'XT') vt.out('🔓 ')
                        vt.outln(vt.cyan, '{', vt.bright, 'Click!', vt.normal, '}')
                        vt.sessionAllowed += 60

                        $.player.pc = Object.keys(PC.name['immortal'])[slot]
                        profile({ png: 'player/' + $.player.pc.toLowerCase() + ($.player.gender == 'F' ? '_f' : ''), pc: $.player.pc })
                        vt.out([vt.red, vt.blue, vt.magenta][slot]
                            , 'You ', ['advance to', 'succeed as', 'transcend into'][slot]
                            , vt.bright, an($.player.pc), vt.normal, '.')
                        reroll($.player, $.player.pc)
                        PC.newkeys($.player)
                        $.player.coward = true
                        PC.saveUser($.player)

                        if (slot++ < max) {
                            vt.refocus(`Insert key #${slot + 1}? `)
                            return
                        }

                        $.player.coward = false
                        playerPC([200, 210, 220, 240][slot], true)
                        return
                    }
                    else {
                        sound('thunder')
                        if ($.player.emulation == 'XT') vt.out('💀 ')
                        vt.outln(vt.bright, vt.black, '^', vt.white, 'Boom!', vt.black, '^')

                        if (slot == 0) {
                            for (let i = 0; i < 3; i++) {
                                if ($.player.keyhints[i] == attempt)
                                    break
                                if (!$.player.keyhints[i]) {
                                    $.player.keyhints[i] = attempt
                                    break
                                }
                            }
                            playerPC(200 + 4 * $.player.wins + int($.player.immortal / 3))
                        }
                        else
                            playerPC([200, 210, 220, 240][slot], true)
                    }
                }, cancel: '!', eol: false, match: /P|G|S|C/i
            }
        }
        slot = 0
        vt.drain()
        vt.form['key'].prompt = `Insert key #${slot + 1}? `
        vt.focus = 'key'
    }

    export function rings(profile = $.online) {
        for (let i in profile.user.rings) {
            let ring = profile.user.rings[i]
            vt.out(vt.cyan, $.player.emulation == 'XT' ? '⍤' : vt.Empty, ' ', vt.bright, ring, vt.normal, ' ')
            if ($.player.emulation == 'XT') vt.out(Ring.name[ring].emoji, '💍')
            vt.outln('ring:', vt.reset, ' can ', Ring.name[ring].description, -100)
        }
    }

    export function status(profile: active) {
        action('clear')
        portrait(profile)

        const line = '------------------------------------------------------'
        const space = '                                                      '
        const sex = profile.user.sex == 'I' ? profile.user.gender : profile.user.sex
        var i: number
        var n: number

        i = 22 - profile.user.handle.length
        n = 11 + i / 2
        clear()
        vt.out(vt.blue, '+', vt.faint, line.slice(0, n), vt.normal, '=:))')
        vt.out(vt.Blue, vt.yellow, vt.bright, ' ', profile.user.handle, ' ', vt.reset)
        n = 11 + i / 2 + i % 2
        vt.outln(vt.blue, '((:=', vt.faint, line.slice(0, n), vt.normal, '+')

        i = 30 - Access.name[profile.user.access][sex].length
        n = 11 + i / 2
        vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.white, vt.normal, space.slice(0, n))
        vt.out('"', Access.name[profile.user.access][sex], '"')
        n = 11 + i / 2 + i % 2
        vt.outln(vt.blue, space.slice(0, n), vt.reset, vt.blue, vt.faint, '|')

        vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
        vt.out('    Title: ', vt.white)
        if ($.player.emulation == 'XT') vt.out('\r\x1B[2C', Access.name[profile.user.access].emoji, '\r\x1B[12C')
        vt.out(sprintf('%-20s', profile.user.access))
        vt.out(vt.cyan, ' Born: ', vt.white, date2full(profile.user.dob))
        vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

        vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
        vt.out('    Class: ', vt.white)
        if ($.player.emulation == 'XT' && profile.user.wins > 0) vt.out('\r\x1B[2C🎖️\r\x1B[12C')
        vt.out(sprintf('%-21s', profile.user.pc + ' (' + profile.user.gender + ')'))
        vt.out(vt.cyan, ' Exp: ', vt.white)
        if (profile.user.xp < 1e+8)
            vt.out(sprintf('%-15f', profile.user.xp))
        else
            vt.out(sprintf('%-15.7e', profile.user.xp))
        vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

        vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
        vt.out(' Immortal: ', vt.white)
        vt.out(sprintf('%-20s', (profile.user.wins ? `${romanize(profile.user.wins)}.` : '')
            + profile.user.immortal + '.' + profile.user.level + ` (${profile.user.calls})`))
        vt.out(vt.cyan, ' Need: ', vt.white)
        if (experience(profile.user.level, undefined, profile.user.int) < 1e+8)
            vt.out(sprintf('%-15f', experience(profile.user.level, undefined, profile.user.int)))
        else
            vt.out(sprintf('%-15.7e', experience(profile.user.level, undefined, profile.user.int)))
        vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

        vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
        vt.out('      Str: ', vt.white)
        if ($.player.emulation == 'XT') vt.out('\r\x1B[2C💪\r\x1B[12C')
        vt.out(sprintf('%-20s', profile.str + ' (' + profile.user.str + ',' + profile.user.maxstr + ')'))
        vt.out(vt.cyan, ' Hand: ', profile.user.coin.carry(), ' '.repeat(15 - profile.user.coin.amount.length))
        vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

        vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
        vt.out('      Int: ', vt.white)
        vt.out(sprintf('%-20s', profile.int + ' (' + profile.user.int + ',' + profile.user.maxint + ')'))
        vt.out(vt.cyan, ' Bank: ', profile.user.bank.carry(), ' '.repeat(15 - profile.user.bank.amount.length))
        vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

        vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
        vt.out('      Dex: ', vt.white)
        vt.out(sprintf('%-20s', profile.dex + ' (' + profile.user.dex + ',' + profile.user.maxdex + ')'))
        vt.out(vt.cyan, ' Loan: ', profile.user.loan.carry(), ' '.repeat(15 - profile.user.loan.amount.length))
        vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

        vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
        vt.out('      Cha: ', vt.white)
        vt.out(sprintf('%-19s', profile.cha + ' (' + profile.user.cha + ',' + profile.user.maxcha + ')'))
        vt.out(vt.faint, ' Steal: ', vt.normal)
        vt.out(sprintf('%-15s', ['lawful', 'desperate', 'trickster', 'adept', 'master'][profile.user.steal]))
        vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

        if (profile.user.blessed) {
            let who: user = { id: profile.user.blessed }
            if (!loadUser(who)) {
                if (profile.user.blessed == 'well')
                    who.handle = 'a wishing well'
                else
                    who.handle = profile.user.blessed
            }
            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.yellow, vt.bright)
            vt.out(' +Blessed:', vt.white, vt.normal, ' by ', sprintf('%-39s', who.handle))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
        }

        if (profile.user.cursed) {
            let who: user = { id: profile.user.cursed }
            if (!loadUser(who)) {
                if (profile.user.cursed == 'wiz!')
                    who.handle = 'a doppelganger!'
                else
                    who.handle = profile.user.cursed
            }
            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.white)
            vt.out('  -Cursed:', vt.normal, ' by ', sprintf('%-39s', who.handle))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
        }

        vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
        vt.out('       HP: ', vt.white)
        if ($.player.emulation == 'XT') vt.out('\r\x1B[2C🌡️\r\x1B[12C')
        vt.out(sprintf('%-42s', profile.hp + '/' + profile.user.hp + ' ('
            + ['weak', 'normal', 'adept', 'warrior', 'brute', 'hero'][profile.user.melee] + ', '
            + ['a rare', 'occasional', 'deliberate', 'angry', 'murderous'][profile.user.backstab] + ' backstab)'))
        vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

        if (profile.user.magic > 1) {
            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.magenta, vt.bright)
            vt.out('       SP: ', vt.white)
            vt.out(sprintf('%-42s', profile.sp + '/' + profile.user.sp + ' (' + ['wizardry', 'arcane', 'divine'][profile.user.magic - 2] + ')'))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
        }

        if (profile.user.spells.length) {
            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.magenta, vt.bright)
            vt.out(sprintf(' %8s: ', ['Wands', 'Wands', 'Scrolls', 'Spells', 'Magus'][profile.user.magic]), vt.white)
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
            vt.out(sprintf('%-42s', text))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
            while (n < profile.user.spells.length) {
                text = ''
                i = 0
                vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.white, vt.bright, '           ')
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
                vt.out(sprintf('%-42s', text))
                vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
            }
        }

        if (profile.user.rings.length) {
            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.magenta, vt.bright)
            vt.out('    Rings: ', vt.white)
            if ($.player.emulation == 'XT') vt.out('\r\x1B[2C💍\r\x1B[12C')
            let text = ''
            n = 0
            for (let p = 0; p < profile.user.rings.length; p++) {
                let name = profile.user.rings[p]
                if (text.length + name.length > 40) break
                if (text.length) text += ','
                text += name
                n++
            }
            vt.out(sprintf('%-42s', text))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
            while (n < profile.user.rings.length) {
                text = ''
                i = 0
                vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.white, vt.bright, '           ')
                for (let p = 0; p < profile.user.rings.length; p++) {
                    i++
                    if (i > n) {
                        let name = profile.user.rings[p]
                        if (text.length + name.length > 40) break
                        if (text.length) text += ','
                        text += name
                        n++
                    }
                }
                vt.out(sprintf('%-42s', text))
                vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
            }
        }

        vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.white)
        vt.out('  Alchemy: ', vt.normal)
        vt.out(sprintf('%-42s', ['banned', 'apprentice', 'expert (+1x,+1x)', 'artisan (+1x,+2x)', 'master (+2x,+2x)'][profile.user.poison]))
        vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

        if (profile.user.poisons.length) {
            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.white)
            vt.out(sprintf(' %8s: ', ['Vial', 'Toxin', 'Poison', 'Bane', 'Venena'][profile.user.poison]), vt.normal)
            if ($.player.emulation == 'XT') vt.out('\r\x1B[2C🧪\r\x1B[12C')
            vt.out(sprintf('%-42s', profile.user.poisons.toString()))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
        }

        vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
        vt.out('   Weapon: ')
        if ($.player.emulation == 'XT') vt.out('\r\x1B[2C🗡️\r\x1B[12C')
        vt.out(weapon(profile), ' '.repeat(42 - weapon(profile, true).length))
        vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

        vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
        vt.out('    Armor: ')
        if ($.player.emulation == 'XT') vt.out('\r\x1B[2C🛡\r\x1B[12C')
        vt.out(armor(profile), ' '.repeat(42 - armor(profile, true).length))
        vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

        vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
        vt.out(' Lives in: ', vt.white)
        vt.out(sprintf('%-42s', profile.user.realestate + ' (' + profile.user.security + ')'))
        vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

        if (profile.user.gang) {
            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('    Party: ', vt.white)
            if ($.player.emulation == 'XT') vt.out('\r\x1B[2C🏴\r\x1B[12C')
            vt.out(sprintf('%-42s', profile.user.gang))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
        }

        if (+profile.user.hull) {
            vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
            vt.out('  Warship: ', vt.white)
            vt.out(sprintf('%-18s', profile.hull.toString() + ':' + profile.user.hull.toString()))
            vt.out(vt.cyan, ' Cannon: ', vt.white)
            vt.out(sprintf('%-15s', profile.user.cannon.toString() + ':' + (profile.user.hull / 50).toString() + (profile.user.ram ? ' (RAM)' : '')))
            vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')
        }

        vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
        vt.out(' Brawling: ', vt.white)
        vt.out(sprintf('%-19s', profile.user.tw + ':' + profile.user.tl))
        vt.out(vt.cyan, 'Steals: ', vt.white)
        vt.out(sprintf('%-15s', profile.user.steals))
        vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

        vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
        vt.out(' Jousting: ', vt.white)
        vt.out(sprintf('%-20s', profile.user.jw + ':' + profile.user.jl + ` (${PC.jousting(profile)})`))
        vt.out(vt.cyan, 'Plays: ', vt.white)
        vt.out(sprintf('%-15s', profile.user.plays))
        vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

        vt.out(vt.blue, vt.faint, '|', vt.Blue, vt.cyan, vt.bright)
        vt.out('    Kills: ', vt.white)
        if ($.player.emulation == 'XT') vt.out('\r\x1B[2C💀\r\x1B[12C')
        vt.out(sprintf('%-42s', profile.user.kills + ' with ' + profile.user.retreats + ' retreats and killed ' + profile.user.killed + 'x'))
        vt.outln(' ', vt.reset, vt.blue, vt.faint, '|')

        vt.outln(vt.blue, '+', vt.faint, line, vt.normal, '+')
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

    //  web client extended export functions
    export function action(menu: string) {
        if ($.tty == 'web') vt.out(`@action(${menu})`)
    }

    export function animated(effect: string, sync = 2) {
        if ($.tty == 'web') vt.out(`@animated(${effect})`, -10 * sync)
    }

    export function music(tune: string, sync = 2) {
        if ($.tty == 'web') vt.out(`@tune(${tune})`, -10 * sync)
    }

    export function profile(params) {
        if ($.tty == 'web') vt.out(`@profile(${JSON.stringify(params)})`)
    }

    export function sound(effect: string, sync = 2) {
        if ($.tty == 'web')
            vt.out(`@play(${effect})`, -100 * sync)
        else
            vt.beep()
    }

    export function title(name: string) {
        if (vt.emulation == 'XT') vt.out(`\x1B]2;${name}\x07`)
        if ($.tty == 'web') vt.out(`@title(${name})`)
    }

    export function wall(msg: string) {
        vt.out(`@wall(${$.player.handle} ${msg})`)
    }

}

export = io
