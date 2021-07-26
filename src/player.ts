/*****************************************************************************\
 *  Ɗaɳƙ Ɗoɱaiɳ: the return of Hack & Slash                                  *
 *  I/O authored by: Robert Hurst <theflyingape@gmail.com>                   *
\*****************************************************************************/

import $ = require('./runtime')
import db = require('./db')
import { Access, Coin } from './items'
import { bracket, cat, prompt, news, time, vt, weapon } from './lib'
import { elemental } from './npc'
import { Deed, PC } from './pc'
import { an, date2full, dice, fs, int, now, pathTo, sprintf, whole } from './sys'
import { ESTALE } from 'constants'

module Player {

    export function checkXP(rpc: active, cb: Function): boolean {

        $.jumped = 0

        let t = vt.checkTime()
        if (t !== $.timeleft) {
            $.timeleft = t
            if ($.timeleft < 0) {
                if ($.online.hp > 0) $.online.hp = 0
                $.reason = $.reason || 'got exhausted'
            }
            else if ($.timeleft <= $.warning) {
                $.warning = $.timeleft
                vt.outln()
                vt.beep()
                vt.outln(vt.bright, ` *** `, vt.faint, `${$.warning}-minute${$.warning !== 1 ? 's' : ''} remain${$.warning == 1 ? 's' : ''}`, vt.bright, ` *** `, -100)
                vt.sound('hurry', 4)
            }
        }

        if (!Access.name[rpc.user.access].roleplay) return false
        if (rpc.user.level >= $.sysop.level) {
            riddle()
            return true
        }

        if (rpc.user.xp < PC.experience(rpc.user.level, 1, rpc.user.int)) {
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

        while (rpc.user.xp >= PC.experience(rpc.user.level, undefined, rpc.user.int) && rpc.user.level < $.sysop.level) {
            rpc.user.level++

            if (rpc.user.level == Access.name[rpc.user.access].promote) {
                vt.music('promote')
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
                let nme = PC.encounter(`AND id NOT GLOB '_*' AND id != '${$.king.id}'`)
                vt.outln(`The mob goes crazy`, -500, nme.user.id
                    ? `, except for ${nme.user.handle} seen buffing ${nme.who.his}${weapon(nme)}`
                    : `!!`, -2000)
                vt.outln([`${$.taxman.user.handle} nods an approval.`, `${$.barkeep.user.handle} slaughters a pig for tonight's feast.`, `${$.king.handle} gives you a hug.`, `${Access.name[$.king.access][$.king.sex]}'s guard salute you.`, `${$.king.handle} orders ${PC.who($.king).his}Executioner to hang ${$.player.level} prisoners in your honor.`][dice(5) - 1], -2000)
                news(`\tpromoted to ${rpc.user.access}`)
                vt.wall($.player.handle, `promoted to ${rpc.user.access}`)
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
                vt.music()
                if (rpc.user.novice) {
                    PC.portrait()
                    PC.reroll(rpc.user, $.sysop.pc, rpc.user.level)
                    rpc.user.novice = false
                    rpc.user.expert = true
                    vt.outln(vt.cyan, vt.bright, 'You are no longer a novice.  Welcome to the next level of play!')
                    vt.sound('welcome', 9)
                    vt.outln('You morph into', vt.yellow, an(rpc.user.pc), vt.reset, '.', -600)
                    vt.sound('cheer', 21)
                }
                vt.sound('demon', 17)
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

        vt.sound('level')
        $.access = Access.name[$.player.access]
        $.online.altered = true
        vt.outln(-125)
        vt.outln('      ', vt.magenta, '-=', vt.blue, '>', vt.bright, vt.yellow, '*', vt.normal
            , vt.blue, '<', vt.magenta, '=-', -125)
        vt.outln(-125)
        vt.outln(vt.bright, vt.yellow, 'Welcome to level ', $.player.level.toString(), '!', -125)
        vt.outln(-125)
        vt.wall($.player.handle, `is now a level ${$.player.level} ${$.player.pc}`)

        let deed = $.mydeeds.find((x) => { return x.deed == 'levels' })
        if (!$.player.novice && !deed) deed = $.mydeeds[$.mydeeds.push(Deed.load($.player.pc, 'levels')[0]) - 1]
        if ((deed && $.jumped >= deed.value)) {
            deed.value = $.jumped
            vt.outln(vt.cyan, ' + ', vt.bright, Deed.name[deed.deed].description, ' ', bracket(deed.value, false))
            vt.beep()
            Deed.save(deed, $.player)
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

    export function input(focus: string | number, input = elemental.cmd, speed = 7) {
        prompt(focus, input, speed)
    }

    export function logoff() {
        if (!$.reason || $.reason == 'hangup') {
            PC.load($.sysop)
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
                PC.load($.player)
                $.player.lasttime = now().time
                $.access.roleplay = false
                news(`\tonline player dropped by ${$.sysop.who} ${time($.player.lasttime)} (${$.reason})\n`, true)
            }
        }

        if ($.player.id) {
            if ($.access.roleplay) {
                if ($.from == 'Dungeon' && $.online.hp > 0) {
                    PC.adjust('cha', -1, -1, -1)
                    $.player.coin = new Coin(0)
                    if (vt.checkTime() >= 0) {
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
                PC.save($.player, false, true)
                news(`\treturned to ${$.whereis} at ${time($.player.lasttime)} as a level ${$.player.level} ${$.player.pc}`)
                news(`\t(${$.reason})\n`, true)

                const callers = pathTo('users', 'callers.json')
                try {
                    $.callers = JSON.parse(fs.readFileSync(callers).toString())
                } catch (e) { }
                while ($.callers.length > 7)
                    $.callers.pop()
                $.callers = [<caller>{ who: $.player.handle, reason: $.reason }].concat($.callers)
                fs.writeFileSync(callers, JSON.stringify($.callers))
            }

            db.unlock($.player.id, true)
            db.unlock($.player.id)

            //  logoff banner
            vt.carrier = true
            vt.wall($.player.handle, `logged off: ${$.reason}`)
            vt.save()
            vt.out(`\x1B[1;${$.player.rows}r`)
            vt.restore()
            vt.outln(-100, '\x06')

            if ($.online.hp < 1)
                vt.sound('goodbye')
            else {
                if ($.player.plays) vt.sound($.online.hull < 1 ? 'comeagain' : 'invite')
                PC.portrait($.online)
            }

            vt.outln(-200, 'Goodbye, please play again! Also visit: ', -300)
            vt.out(vt.cyan, '  ___                               ___  \n')
            vt.out('  \\_/   ', vt.red, vt.LGradient, vt.bright, vt.Red, vt.white, 'Never Program Mad', vt.reset, vt.red, vt.RGradient, vt.cyan, '   \\_/  \n')
            vt.out(' _(', vt.bright, '-', vt.normal, ')_     ', vt.reset, ' https://npmjs.com    ', vt.cyan, '  _(', vt.bright, '-', vt.normal, ')_ \n')
            vt.out('(/ ', vt.emulation == 'XT' ? vt.attr(vt.faint, '⚨', vt.normal) : ':', ' \\)                          ', vt.cyan, ' (/ ', vt.emulation == 'XT' ? vt.attr(vt.faint, '⚨', vt.normal) : ':', ' \\)\n')
            vt.out('I\\___/I    ', vt.green, vt.LGradient, vt.bright, vt.Green, vt.white, `RAH-CoCo's`, vt.reset, vt.green, vt.RGradient, vt.cyan, '     I\\___/I\n')
            vt.out('\\/   \\/ ', vt.reset, '   http://rb.gy/bruelx  ', vt.cyan, '  \\/   \\/\n')
            vt.out(' \\ : /                           ', vt.cyan, '  \\ : / \n')
            vt.out('  I:I     ', vt.blue, vt.LGradient, vt.bright, vt.Blue, vt.white, `${vt.emulation == 'XT' ? 'ℝ' : 'R'}ober${vt.emulation == 'XT' ? 'ƭ ℍ' : 't H'}urs${vt.emulation == 'XT' ? 'ƭ' : 't'}`, vt.reset, vt.blue, vt.RGradient, vt.cyan, '      I:I  \n')
            vt.outln(' .I:I. ', vt.reset, '   https://www.DDgame.us   ', vt.cyan, ' .I:I.')
            vt.outln(-400)
            vt.outln(vt.black, vt.bright, vt.emulation == 'XT' ? process.title : 'DDplay'
                , ' running on ', vt.green, 'Node.js ', vt.normal, process.version, vt.reset
                , vt.faint, ' (', vt.cyan, process.platform, vt.white, vt.faint, ')', -1965)
            if ($.access.roleplay && $.player.today && $.player.level > 1)
                vt.music($.online.hp > 0 ? 'logoff' : 'death')
        }
        else
            vt.sound('invite')
    }

    export function pickPC(points = 200, immortal = false) {

        vt.music('reroll')
        if (points > 240) points = 240
        vt.outln(-1000)
        if (!Access.name[$.player.access].roleplay) return

        if ($.player.novice) {
            PC.reroll($.player, 'novice')
            vt.outln('Since you are a new user here, you are automatically assigned a character', -1000)
            vt.out('class.  At the Main Menu, press ', bracket('Y', false), ' to see all your character information.', -1000)
            show()
            PC.activate($.online)
            news(`Welcome a ${$.player.pc} player, ${$.player.handle}`)
            require('./tty/menu').menu(true)
            return
        }
        else {
            vt.sessionAllowed += 300
            $.warning = 2
        }

        vt.action('list')
        vt.form = {
            'pc': { cb: pick, min: 1, max: 2, cancel: '!' },
            'str': { cb: ability, min: 2, max: 2, match: /^[2-8][0-9]$/ },
            'int': { cb: ability, min: 2, max: 2, match: /^[2-8][0-9]$/ },
            'dex': { cb: ability, min: 2, max: 2, match: /^[2-8][0-9]$/ },
            'cha': { cb: ability, min: 2, max: 2, match: /^[2-8][0-9]$/ }
        }
        let a = { str: 50, int: 50, dex: 50, cha: 50 }

        if (immortal) {
            show()
            ability('str')
            return
        }

        vt.profile({ jpg: 'classes', handle: 'Reroll!', effect: 'tada' })
        vt.outln($.player.pc, ', you have been rerolled. ', -500, ' You must pick a class.')
        vt.outln(-1000)

        vt.outln(vt.cyan, '      Character                       ', vt.faint, '>> ', vt.normal, 'Ability bonus')
        vt.outln(vt.cyan, '        Class      Users  Difficulty  Str  Int  Dex  Cha     Notable Feature')
        vt.out(vt.cyan, vt.faint, '      ---------     ---   ----------  ---  ---  ---  ---  ---------------------')

        let classes = ['']
        let n = 0
        for (let pc in PC.name['player']) {
            const rpc = PC.card(pc)
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
        input('pc', dice(classes.length - 1).toString(), 5000)

        function show() {
            vt.profile({
                png: 'player/' + $.player.pc.toLowerCase() + ($.player.gender == 'F' ? '_f' : '')
                , handle: $.player.handle, level: $.player.level, pc: $.player.pc, effect: 'zoomInDown'
            })
            cat('player/' + $.player.pc.toLowerCase())
            const rpc = PC.card($.player.pc)
            for (let l = 0; l < rpc.description.length; l++)
                vt.outln(vt.cyan, vt.bright, rpc.description[l], -1500)
        }

        function pick() {
            let n = whole(vt.entry)
            if (n < 1 || n >= classes.length) {
                vt.beep()
                vt.refocus()
                return
            }
            vt.outln(' - ', classes[n])
            $.player = PC.reroll($.player, classes[n])
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
                input(field)
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
                        PC.reroll($.player, $.player.pc)
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
                        PC.reroll($.player, $.player.pc)
                        ability('str')
                        return
                    }
                    a.cha = n

                    $.player.str = a.str
                    $.player.int = a.int
                    $.player.dex = a.dex
                    $.player.cha = a.cha
                    PC.activate($.online)

                    vt.outln()
                    PC.save()
                    news(`\trerolled as${an($.player.pc)}`)
                    if (immortal) {
                        $.online.hp = 0
                        $.reason = 'became immortal'
                        vt.hangup()
                    }
                    else {
                        vt.outln(-600)
                        vt.outln(vt.yellow, '... ', vt.bright, 'and you get to complete any remaining parts to this play.', -600)
                        require('./tty/menu').menu(true)
                    }
                    return
            }

            vt.outln('\n\nYou have ', vt.bright, left.toString(), vt.normal, ' ability points left.', -600)
            vt.form[p].prompt += ' ' + bracket(vt.form[p].enter, false) + ': '
            input(p)
        }
    }

    export function skillplus(rpc: active, cb: Function) {

        PC.portrait($.online)
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

        vt.action('list')

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

    // the Ancient Riddle of the Keys
    export function riddle() {

        vt.action('clear')
        PC.portrait($.online, 'tada')
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
                        Deed.save(deed, $.player)
                        bonus = 1
                        vt.outln(vt.cyan, ' + ', vt.bright, Deed.name[deeds[i]].description, ' ', bracket(deed.value, false))
                        vt.sound('click', 5)
                    }
                }
                else {
                    if (!deed) deed = $.mydeeds[$.mydeeds.push(Deed.load($.player.pc, deeds[i])[0]) - 1]
                    if (deeds[i] == 'jl' && $.player.jl < 2 && $.player.jw < 5) continue
                    if (deeds[i] == 'tl' && $.player.tl < 2 && $.player.tw < 5) continue
                    if ($.player[deeds[i]] <= deed.value) {
                        deed.value = $.player[deeds[i]]
                        Deed.save(deed, $.player)
                        bonus = 1
                        vt.outln(vt.cyan, ' + ', vt.bright, Deed.name[deeds[i]].description, ' ', bracket(deed.value, false))
                        vt.sound('click', 5)
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
                        Deed.save(deed, $.player)
                        bonus = 2
                        vt.outln(vt.yellow, ' + ', vt.bright, Deed.name[deeds[i]].description, ' ', bracket(deed.value, false))
                        vt.sound('click', 5)
                    }
                }
                else {
                    if (!deed) deed = $.mydeeds[$.mydeeds.push(Deed.load('GOAT', deeds[i])[0]) - 1]
                    if (deeds[i] == 'jl' && $.player.jl < 2 && $.player.jw < 10) continue
                    if (deeds[i] == 'tl' && $.player.tl < 2 && $.player.tw < 10) continue
                    if ($.player[deeds[i]] <= deed.value) {
                        deed.value = $.player[deeds[i]]
                        Deed.save(deed, $.player)
                        bonus = 3
                        vt.outln(vt.yellow, ' + ', vt.bright, Deed.name[deeds[i]].description, ' ', bracket(deed.value, false))
                        vt.sound('click', 5)
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

        vt.music('immortal')
        $.player.immortal++
        vt.outln(vt.cyan, vt.bright, '\nYou have become so powerful that you are now immortal ', -3000)
        db.run(`UPDATE Players SET bank=bank+${$.player.bank.value + $.player.coin.value} WHERE id='${$.taxman.user.id}'`)
        vt.outln(vt.cyan, '    and you leave your worldly possessions behind.', -2000)

        let max = Object.keys(PC.name['immortal']).indexOf($.player.pc) + 1
        if (max || $.player.keyhints.slice(12).length > int(Object.keys(PC.name['player']).length / 2))
            $.player.keyhints.splice(12, 1)
        else
            $.player.keyhints.push($.player.pc)

        PC.reroll($.player)
        PC.save()
        vt.sessionAllowed += 300
        $.warning = 2

        if (max > 2) {
            vt.music('victory')

            const log = pathTo('files', 'winners.txt')
            fs.appendFileSync(log, sprintf(`%22s won on %s  -  game took %3d days\n`
                , $.player.handle
                , date2full(now().date)
                , now().date - $.sysop.dob + 1))
            PC.load($.sysop)
            $.sysop.who = $.player.handle
            $.sysop.dob = now().date + 1
            $.sysop.plays = 0
            PC.save($.sysop)

            $.player.wins++
            db.run(`UPDATE Players SET wins=${$.player.wins} WHERE id='${$.player.id}'`)
            $.reason = 'WON THE GAME !!'
            vt.outln(vt.tty == 'web' ? -4321 : -432)

            vt.profile({ jpg: 'winner', effect: 'fadeInUp' })
            vt.title(`${$.player.handle} is our winner!`)
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
                    vt.beep()
                    vt.out('?', -100)
                }
                db.unlock(rs[row].id)
            }

            vt.sound('winner')
            vt.out(vt.bright)

            rs = db.query(`SELECT id FROM Players WHERE id NOT GLOB '_*'`)
            let user: user
            for (let row in rs) {
                user = { id: rs[row].id }
                if (PC.load(user)) {
                    PC.reroll(user)
                    user.keyhints.splice(12)
                    PC.save(user)
                    fs.unlink(pathTo('users', '.${user.id}.json'), () => { })
                }
                vt.out('.', -10)
            }
            db.run(`UPDATE Rings SET bearer=''`)   // should be cleared by rerolls

            let i = 0
            while (++i) {
                let bot = db.fillUser(`bot${i}`)
                if (bot.id) {
                    PC.reroll(bot, bot.pc, bot.level)
                    PC.newkeys(bot)
                    bot.keyhints.splice(12)
                    PC.save(bot)
                    vt.out('&', -10)
                }
                else
                    break
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

        for (let i = 0; i <= max + bonus; i++) PC.keyhint($.online, false)
        PC.save()

        let prior: number = -1
        let slot: number
        for (let i in $.player.keyhints) {
            if (+i < 12 && $.player.keyhints[i]) {
                slot = int(+i / 3)
                if (slot !== prior) {
                    prior = slot
                    vt.outln()
                }
                vt.outln('Key #', vt.bright, `${slot + 1}`, vt.normal, ' is not ', Deed.key[$.player.keyhints[i]])
            }
        }

        vt.action('riddle')
        let combo = $.player.keyseq

        vt.form = {
            'key': {
                cb: () => {
                    let attempt = vt.entry.toUpperCase()
                    vt.music('steal')
                    vt.out(' ... you insert and twist the key ', -1234)
                    for (let i = 0; i < 3; i++) {
                        vt.out('.')
                        vt.sound('click', 12)
                    }
                    if (attempt == combo[slot]) {
                        vt.sound('max')
                        if ($.player.emulation == 'XT') vt.out('🔓 ')
                        vt.outln(vt.cyan, '{', vt.bright, 'Click!', vt.normal, '}')
                        vt.sessionAllowed += 60

                        $.player.pc = Object.keys(PC.name['immortal'])[slot]
                        vt.profile({ png: 'player/' + $.player.pc.toLowerCase() + ($.player.gender == 'F' ? '_f' : ''), pc: $.player.pc })
                        vt.out([vt.red, vt.blue, vt.magenta][slot]
                            , 'You ', ['advance to', 'succeed as', 'transcend into'][slot]
                            , vt.bright, an($.player.pc), vt.normal, '.')
                        PC.reroll($.player, $.player.pc)
                        PC.newkeys($.player)
                        $.player.coward = true
                        PC.save()

                        if (slot++ < max) {
                            vt.refocus(`Insert key #${slot + 1}? `)
                            return
                        }

                        $.player.coward = false
                        pickPC([200, 210, 220, 240][slot], true)
                        return
                    }
                    else {
                        vt.sound('thunder')
                        if ($.player.emulation == 'XT') vt.out('💀 ')
                        vt.outln(vt.black, vt.bright, '^', vt.white, 'Boom!', vt.black, '^')

                        if (slot == 0) {
                            for (let i = 0; i < 3; i++) {
                                if ($.player.keyhints[i] == attempt)
                                    break
                                if (!$.player.keyhints[i]) {
                                    $.player.keyhints[i] = attempt
                                    break
                                }
                            }
                            pickPC(200 + 4 * $.player.wins + int($.player.immortal / 3))
                        }
                        else
                            pickPC([200, 210, 220, 240][slot], true)
                    }
                }, cancel: '!', eol: false, match: /P|G|S|C/i
            }
        }
        slot = 0
        vt.drain()
        vt.form['key'].prompt = `Insert key #${slot + 1}? `
        vt.focus = 'key'
    }
}

export = Player
