/*****************************************************************************\
 *  Ɗaɳƙ Ɗoɱaiɳ: the return of Hack & Slash                                  *
 *  DUNGEON authored by: Robert Hurst <theflyingape@gmail.com>               *
\*****************************************************************************/

import $ = require('../runtime')
import Battle = require('../battle')
import db = require('../db')
import { Armor, Magic, Poison, Ring, Security, Weapon } from '../items'
import { vt, Coin, death, armor, weapon, bracket, cat, log, news, tradein, getRing } from '../lib'
import { PC } from '../pc'
import { checkXP, skillplus } from '../player'
import { dice, int, sprintf, whole, romanize, an, money } from '../sys'

module Dungeon {

    let fini: Function
    let monsters: monster = require('../etc/dungeon.json')
    let party: active[]
    let potions: vial[] = []
    let tl: number

    let idle: number
    let looked: boolean
    let pause: boolean
    let refresh: boolean
    let skillkill: boolean
    let well: boolean

    let paper: string[]
    let dd = new Array(10)
    let deep: number
    let DL: ddd
    let ROOM: room
    let Z: number
    let Y: number
    let X: number
    let b4: number
    let hideep: number
    let hiZ: number
    let levels: number

    //  £
    const Cleric = {
        VT: '\x1B(0\x7D\x1B(B',
        PC: '\x9C',
        XT: '✟',
        dumb: '$'
    }

    //  ·
    const Dot = vt.Empty

    const Mask = ['   ', ' ѩ ', 'ѩ ѩ', 'ѩѩѩ', 'ѩӂѩ']
    const Monster = {
        door: ['   ', 'Mon', 'M+M', 'Mob', 'MOB'],
        telnet: ['   ', 'Mon', 'M+M', 'Mob', 'MOB']
    }

    //  ±
    const Teleport = {
        VT: '\x1B(0\x67\x1B(B',
        PC: '\xF1',
        XT: '↨',
        dumb: '%'
    }

    let crawling: choices = {
        'N': { description: 'orth' },
        'S': { description: 'outh' },
        'E': { description: 'ast' },
        'W': { description: 'est' },
        'C': { description: 'ast' },
        'P': { description: 'oison' },
        'Y': { description: 'our status' }
    }

    const potion = [
        'Potion of Cure Light Wounds',
        'Vial of Weakness',
        'Potion of Charm',
        'Vial of Stupidity',
        'Potion of Agility',
        'Vial of Clumsiness',
        'Potion of Wisdom',
        'Vile Vial',
        'Potion of Stamina',
        'Vial of Slaad Secretions',
        'Potion of Mana',
        'Flask of Fire Water',
        'Elixir of Restoration',
        'Vial of Crack',
        'Potion of Augment',
        'Beaker of Death'
    ]
    //	make some magic brew & bottle it up . . .
    let containers = ['beaker filled with', 'bottle containing', 'flask of', 'vial holding']
    let v = 0
    while (containers.length) {
        let c = dice(containers.length) - 1
        let liquids = ['bubbling', 'clear', 'milky', 'sparkling']
        let colors = ['amber', 'sapphire', 'crimson', 'emerald', 'amethyst']
        let coded = [vt.yellow, vt.blue, vt.red, vt.green, vt.magenta]
        while (liquids.length) {
            let l = dice(liquids.length) - 1
            let i = dice(colors.length) - 1
            potions.push({
                potion: v++, identified: false
                , image: 'potion/' + (containers[c].startsWith('beaker') ? 'beaker' : colors[i])
                , description: vt.attr(vt.uline, containers[c], vt.nouline, ' a ', liquids[l], ' ', coded[i], colors[i])
            })
            liquids.splice(l, 1)
            colors.splice(i, 1)
            coded.splice(i, 1)
        }
        containers.splice(c, 1)
    }

    PC.load($.dwarf)

    //  entry point
    export function DeepDank(start: number, cb: Function) {
        idle = -1
        levels = $.player.level
        skillkill = false
        Battle.teleported = false
        well = true

        party = []
        party.push($.online)
        tl = vt.checkTime() + 3

        deep = 0
        hideep = 0
        Z = start < 0 ? 0 : start > 99 ? 99 : int(start)
        hiZ = Z
        fini = cb

        if ($.access.sysop) crawling['M'] = { description: 'y liege' }
        generateLevel()

        vt.profile({ jpg: `dungeon/level${sprintf('%x', whole((Z + 1) / 10))}`, handle: "Entering", level: $.player.level, pc: 'dungeon' })
        ROOM = DL.rooms[Y][X]
        if (ROOM.occupant || ROOM.monster.length || ROOM.giftItem) vt.sleep(2800)

        menu()
    }

    //	check player status: changed, dead, level up
    //	did player cast teleport?
    //	did player enter a room?
    //	does last output(s) need a pause?
    //	is a redraw needed?
    //	is a monster spawning needed?
    //	position Hero and get user command
    export function menu(suppress = false) {

        //	check player status
        if ($.online.altered) PC.save()
        if ($.reason || vt.reason) {
            death(`failed to escape ${romanize(deep + 1)}.${Z + 1} - ${$.reason || vt.reason}`)
            DL.map = `Marauder's map`
            scroll()
            if ($.online.hp > 0) {
                $.online.hp = whole(idle)
                if ($.online.hp) vt.sound('thief2', 6)
            }
            vt.hangup()
        }
        if ($.player.level + 1 < $.sysop.level) {
            if (checkXP($.online, menu)) {
                DL.exit = false
                DL.moves -= DL.width
                pause = true
                return
            }
            else if ($.jumped) {
                vt.title(`${$.player.handle}: level ${$.player.level} ${$.player.pc} - Dungeon ${romanize(deep + 1)}.${Z + 1}`)
                if ($.jumped > (19 - int(deep / 3))) skillkill = true
            }
        }

        //	did player cast teleport?
        if (!Battle.retreat && Battle.teleported) {
            Battle.teleported = false
            if (Battle.expel) {
                Battle.expel = false
                PC.portrait($.online, 'flipOutX')
                if (deep > 0)
                    deep--
                else {
                    scroll(1, false, true)
                    fini()
                    return
                }
                generateLevel()
                menu()
                return
            }
            scroll(1, false)
            vt.outln(vt.magenta, 'You open a ', vt.bright, 'mystic portal', vt.normal, '.\n')
            vt.sound('portal', 4)
            teleport()
            return
        }

        //	did player just do something eventful worthy of the big bonus?
        if (skillkill) {
            vt.sound('winner')
            skillkill = false
            skillplus($.online, menu)
            return
        }

        //	did player enter a new room (or complete what's in it)?
        if (!looked)
            if (!(looked = doMove()))
                return

        //	does last output(s) need a pause?
        if (pause) {
            vt.action('yn')
            pause = false
            vt.form = {
                'pause': {
                    cb: () => { menu() }, pause: true, timeout: 20
                }
            }
            vt.focus = 'pause'
            return
        }

        //	is a redraw needed?
        if (process.stdout.rows && process.stdout.rows !== $.player.rows) {
            $.player.rows = process.stdout.rows
            refresh = true
        }
        if (refresh) drawLevel()

        //  keep it organic relative to class skill + luck with player asset protection
        let me = whole(
            (Z / 3 + DL.rooms.length * DL.width + $.online.dex / 2 + $.online.cha) * (.6 + deep / 23)
            - DL.moves)
        me *= 1 + (Security.name[$.player.security].protection - $.player.level / 9) / 12
        if (me < int(($.online.int + DL.width) / 2)) {
            if (!DL.exit) {
                const t = $.player.expert ? 10 : 100
                vt.out(-t, ' ', -2 * t, $.player.emulation == 'XT' ? '🏃' : '<<', ' ', -t)
                if (DL.alert) vt.sound('exit')
                vt.outln(vt.faint, 'find ', -5 * t, 'the ', -4 * t, 'exit', -8 * t, vt.normal, '!')
                vt.drain()
                DL.alert = false
                DL.events++
                DL.exit = true
                me *= 2
            }
            else
                me = int(me / 2)
        }
        me = (me < DL.width ? DL.width - (DL.moves >> 8) : int(me)) - int($.player.coward)
        if (me < DL.width) {
            DL.exit = $.player.coward
            if (me < 6) $.player.coward = true
            me = DL.width + 3 - int($.player.coward)
            if ($.player.novice) me <<= 1
        }

        //	is a monster spawning needed?
        let x = dice(DL.width) - 1, y = dice(DL.rooms.length) - 1
        if (dice($.online.cha) < Z / (deep + 2)) {
            let d = Math.round($.online.cha / 19) + 2
            y = Y + (dice(d) - 1) - (dice(d) - 1)
            if (y < 0 || y >= DL.rooms.length)
                y = dice(DL.rooms.length) - 1
            d++
            x = X + (dice(d) - 1) - (dice(d) - 1)
            if (x < 0 || x >= DL.width)
                x = dice(DL.width) - 1
        }
        ROOM = DL.rooms[y][x]
        if (dice(DL.spawn * (!ROOM.type ? 2 : ROOM.type == 'cavern' ? 1 : 3)) == 1) {
            if (putMonster(y, x)) {
                let s = dice(5) - 1
                vt.outln()
                vt.out(vt.faint, ['Your skin crawls'
                    , 'Your pulse quickens', 'You feel paranoid', 'Your grip tightens'
                    , 'You stand ready'][s], ' from a ')
                //	only play sound when pairing is close to its description
                if (s == 1) vt.sound('pulse')
                switch (dice(5)) {
                    case 1:
                        vt.out('creaking sound')
                        if (s !== 1) vt.sound('creak' + dice(2))
                        break
                    case 2:
                        vt.out('clap of thunder')
                        if (s == 2) vt.sound('thunder')
                        break
                    case 3:
                        vt.out('ghostly whisper')
                        if (s == 3) vt.sound('ghostly')
                        break
                    case 4:
                        vt.out('beast growl')
                        if (s == 4) vt.sound('growl')
                        break
                    case 5:
                        vt.out('maniacal laugh')
                        if (s == 0) vt.sound('laugh')
                        break
                }
                if (Math.abs(Y - y) < 3 && Math.abs(X - x) < 3)
                    vt.outln(' nearby!', -100)
                else if (Math.abs(Y - y) < 6 && Math.abs(X - x) < 6)
                    vt.outln(' off in the distance.', -200)
                else
                    vt.outln(' as a faint echo.', -300)

                if (DL.map && DL.map !== 'map')
                    drawRoom(y, x)
                if (ROOM.occupant == 'cleric' && DL.cleric.hp) {
                    vt.sound('agony', 10)
                    vt.out(vt.yellow, 'You hear a dying cry of agony !! ', -900)
                    DL.cleric.hp = 0
                    DL.cleric.sp = 0
                    DL.cleric.user.status = 'dead'
                    DL.exit = false
                    ROOM.giftItem = 'chest'
                    ROOM.giftIcon = $.player.emulation == 'XT' ? '⌂' : Dot
                    ROOM.giftValue = 0
                    DL.cleric.user.coin.value = 0
                    if (DL.map && DL.map !== 'map')
                        drawRoom(y, x)
                    vt.outln(-900)
                    vt.beep()
                }
                //	look who came for dinner?
                if (y == Y && x == X) {
                    looked = false
                    menu()
                    return
                }
            }
        }

        //	position Hero and get user command
        vt.action('dungeon')
        drawHero($.player.blessed ? true : false)

        if (DL.events > 0 && DL.moves > DL.width && dice(me) == 1) {
            DL.events--
            vt.music('.')
            let rng = dice(16)
            if (rng > 8) {
                if ($.player.emulation == 'XT') {
                    vt.out(' 🦇 ')
                    vt.sound('splat', 6)
                }
                vt.out(vt.faint, 'A bat flies by and soils ', vt.normal, 'your ')
                $.player.toAC -= dice(deep)
                $.online.altered = true
                vt.out(armor())
                if ($.player.emulation == 'XT') vt.out(' 💩', -600)
            }
            else if (rng > 4) {
                if ($.player.emulation == 'XT') {
                    vt.out(' 💧 ')
                    vt.sound('drop', 6)
                }
                vt.out(vt.blue, 'A drop of ', vt.bright, 'acid water burns ', vt.normal, 'your ')
                $.player.toWC -= dice(deep)
                $.online.altered = true
                vt.out(weapon(), -600)
            }
            else if (rng > 2) {
                if ($.player.emulation == 'XT') {
                    vt.out(' 😬 ')
                    vt.sound('hurt', 6)
                }
                vt.out(vt.yellow, 'You trip on the rocky surface and hurt yourself.', -600)
                $.online.hp -= dice(Z)
                if ($.online.hp < 1) death('fell down')
            }
            else if (rng > 1) {
                if ($.player.emulation == 'XT') {
                    vt.sound('crack')
                    vt.out(' 🐝 ', -300, '🐝 ', -200, '🐝 ', -100, '🐝 ', -50, '🐝 ', -25)
                }
                vt.out(vt.red, 'You are attacked by a ', vt.bright, 'swarm of bees', vt.normal)
                if ($.player.emulation == 'XT') vt.out(' 🐝', -25, ' 🐝', -50, ' 🐝', -100, ' 🐝', -200, ' 🐝', -300)
                else vt.out('!!', -600)
                for (x = 0, y = dice(Z); x < y; x++)
                    $.online.hp -= dice(Z)
                if ($.online.hp < 1) death('killer bees')
            }
            else {
                if ($.player.emulation == 'XT') {
                    vt.out(' ⚡ ')
                    vt.sound('boom', 6)
                }
                vt.out(vt.bright, 'A bolt of lightning strikes you!', -600)
                $.player.toAC -= dice($.online.armor.ac / 2)
                $.online.toAC -= dice($.online.armor.ac / 2)
                $.player.toWC -= dice($.online.weapon.wc / 2)
                $.online.toWC -= dice($.online.weapon.wc / 2)
                $.online.hp -= dice($.player.hp / 2)
                if ($.online.hp < 1) death('struck by lightning')
            }
            if ($.online.weapon.wc > 0 && $.online.weapon.wc + $.online.toWC + $.player.toWC < 0) {
                vt.out(`\nYour ${$.player.weapon} is damaged beyond repair; `, -300, `you toss it aside.`)
                Weapon.equip($.online, Weapon.merchant[0])
            }
            if ($.online.armor.ac > 0 && $.online.armor.ac + $.online.toAC + $.player.toAC < 0) {
                vt.out(`\nYour ${$.player.armor} is damaged beyond repair; `, -300, `you toss it aside.`)
                Armor.equip($.online, Armor.merchant[0])
            }

            vt.drain()
            drawHero($.player.blessed ? true : false)
            vt.outln(-600)
        }

        //  insert any wall messages here
        vt.out('\x06')
        if ($.reason) {
            DL.map = `Marauder's map`
            drawHero()
            scroll()
            vt.hangup()
        }

        //	user input
        vt.form = {
            'command': { cb: command, cancel: 'Y', eol: false, timeout: 20 }
        }
        vt.form['command'].prompt = ''
        if (suppress)
            vt.form['command'].prompt += `${deep ? vt.attr(vt.white, vt.faint, romanize(deep + 1), vt.cyan) : vt.attr(vt.cyan)}:`
        else {
            if ($.player.spells.length)
                vt.form['command'].prompt += vt.attr(
                    bracket('C', false), vt.cyan, 'ast, '
                )
            if ($.player.poisons.length)
                vt.form['command'].prompt += vt.attr(
                    bracket('P', false), vt.cyan, 'oison, '
                )
            if (Y > 0 && DL.rooms[Y][X].type !== 'w-e')
                if (DL.rooms[Y - 1][X].type !== 'w-e')
                    vt.form['command'].prompt += vt.attr(
                        bracket('N', false), vt.cyan, 'orth, '
                    )
            if (Y < DL.rooms.length - 1 && DL.rooms[Y][X].type !== 'w-e')
                if (DL.rooms[Y + 1][X].type !== 'w-e')
                    vt.form['command'].prompt += vt.attr(
                        bracket('S', false), vt.cyan, 'outh, ',
                    )
            if (X < DL.width - 1 && DL.rooms[Y][X].type !== 'n-s')
                if (DL.rooms[Y][X + 1].type !== 'n-s')
                    vt.form['command'].prompt += vt.attr(
                        bracket('E', false), vt.cyan, 'ast, ',
                    )
            if (X > 0 && DL.rooms[Y][X].type !== 'n-s')
                if (DL.rooms[Y][X - 1].type !== 'n-s')
                    vt.form['command'].prompt += vt.attr(
                        bracket('W', false), vt.cyan, 'est, ',
                    )

            vt.form['command'].prompt += vt.attr(
                bracket('Y', false), vt.cyan, 'our status: '
            )
        }
        vt.focus = 'command'
    }

    function command() {
        let suppress = false
        let choice = vt.entry.toUpperCase()
        if (/\[.*\]/.test(vt.terminator)) {
            if ((choice = 'NSEW'['UDRL'.indexOf(vt.terminator[1])])) {
                suppress = true
                vt.out(vt.white, vt.bright, choice, vt.normal)
            }
            else
                choice = 'Y'
        }
        if (crawling[choice]) {
            vt.out(crawling[choice].description)
            DL.moves++
            if (DL.spawn > 2 && !(DL.moves % DL.width))
                DL.spawn--
            if (!DL.exit)
                recovery(300)
        }
        else {
            vt.beep(true)
            vt.drain()
            menu()
            return
        }
        vt.outln()

        switch (choice) {
            case 'M':	//	#tbt
                DL.map = `Marauder's map`
                refresh = true
                break

            case 'C':
                Battle.retreat = false
                Battle.cast($.online, menu, undefined, undefined, DL)
                return

            case 'P':
                Battle.poison($.online, menu)
                return

            case 'Y':
                vt.drain()
                vt.outln()
                Battle.yourstats(false)
                break

            case 'N':
                if (Y > 0 && DL.rooms[Y][X].type !== 'w-e')
                    if (DL.rooms[Y - 1][X].type !== 'w-e') {
                        eraseHero($.player.blessed ? true : false)
                        Y--
                        looked = false
                        break
                    }
                oof('north')
                break

            case 'S':
                if (Y < DL.rooms.length - 1 && DL.rooms[Y][X].type !== 'w-e')
                    if (DL.rooms[Y + 1][X].type !== 'w-e') {
                        eraseHero($.player.blessed ? true : false)
                        Y++
                        looked = false
                        break
                    }
                oof('south')
                break

            case 'E':
                if (X < DL.width - 1 && DL.rooms[Y][X].type !== 'n-s')
                    if (DL.rooms[Y][X + 1].type !== 'n-s') {
                        eraseHero($.player.blessed ? true : false)
                        X++
                        looked = false
                        break
                    }
                oof('east')
                break

            case 'W':
                if (X > 0 && DL.rooms[Y][X].type !== 'n-s')
                    if (DL.rooms[Y][X - 1].type !== 'n-s') {
                        eraseHero($.player.blessed ? true : false)
                        X--
                        looked = false
                        break
                    }
                oof('west')
                break
        }

        menu(suppress)
    }

    function oof(wall: string) {
        PC.portrait($.online, 'bounce', ` - Dungeon ${romanize(deep + 1)}.${Z + 1}`)
        vt.out(vt.yellow, vt.bright, 'Oof! ')
        vt.sound('wall', 3)
        vt.outln(vt.normal, `There is a wall to the ${wall}.`, -300)
        vt.drain()
        if (!Battle.retreat && idle < 3) idle++
        if (($.online.hp -= dice(deep + Z + 1)) < 1) {
            vt.outln()
            vt.music('.')
            vt.outln(vt.faint, 'You take too many hits and die!')
            if (Battle.retreat)
                death('running into a wall', true)
            else {
                death('banged head against a wall')
                $.online.hp = whole(idle)
            }
        }
    }

    //	look around, return whether done or not
    function doMove(): boolean {
        ROOM = DL.rooms[Y][X]
        if (!ROOM.map) {
            recovery(600)
            if (idle >= 0) idle--
            if ($.online.int > 49)
                ROOM.map = true
        }
        else {
            DL.moves++	//	backtracking
            if (DL.spawn > 2 && !(DL.moves % DL.width))
                DL.spawn--
        }

        //	nothing special in here, done
        if (!ROOM.occupant && !ROOM.monster.length && !ROOM.giftItem)
            return true

        vt.outln()
        if (looked) return true
        recovery(ROOM.occupant == 'cleric' ? 600 : 200)
        if (idle >= 0) idle--

        //	monsters?
        if (ROOM.monster.length) {
            vt.action('clear')
            if (!refresh) drawRoom(Y, X, true, true)
            scroll(1, false)
            vt.out(vt.off)

            if (ROOM.monster.length == 1) {
                let img = `dungeon/${ROOM.monster[0].user.handle}`
                vt.profile({ jpg: img, effect: ROOM.monster[0].effect })
                vt.out(`There's something lurking in here . . . `)
                //  dramatic pause if profile change is needed to match player's class
                if (!ROOM.monster[0].monster.pc && ROOM.monster[0].user.pc == $.player.pc) {
                    vt.sleep(900)
                    if (PC.name['player'][ROOM.monster[0].user.pc])
                        vt.profile({ png: 'player/' + $.player.pc.toLowerCase() + ($.player.gender == 'F' ? '_f' : ''), effect: 'flash' })
                    else
                        vt.profile({
                            png: 'monster/'
                                + (PC.name['monster'][ROOM.monster[0].user.pc]
                                    || PC.name['tavern'][ROOM.monster[0].user.pc]
                                    ? ROOM.monster[0].user.pc.toLowerCase() : 'monster')
                                + (ROOM.monster[0].user.gender == 'F' ? '_f' : ''),
                            effect: 'flash'
                        })
                }
                vt.sleep(400)
            }
            else {
                vt.out(`There's a party waiting `
                    , ['you', 'the main course', 'the entertainment', 'meat', 'a good chew'][dice(5) - 1]
                    , '. . . ', -500)
                let m = {}
                for (let i = 0; i < ROOM.monster.length; i++) {
                    m['mob' + (i + 1)] = 'monster/'
                        + (PC.name['monster'][ROOM.monster[i].user.pc]
                            || PC.name['tavern'][ROOM.monster[i].user.pc]
                            ? ROOM.monster[i].user.pc.toLowerCase() : 'monster')
                        + (ROOM.monster[i].user.gender == 'F' ? '_f' : '')
                    if (PC.name['player'][ROOM.monster[i].user.pc])
                        m['mob' + (i + 1)] = 'player/' + $.player.pc.toLowerCase() + ($.player.gender == 'F' ? '_f' : '')
                }
                vt.profile(m)
            }
            vt.outln()

            for (let n = 0; n < ROOM.monster.length; n++) {
                if (ROOM.monster.length < 4)
                    cat(`dungeon/${ROOM.monster[n].user.handle}`)
                let what = ROOM.monster[n].user.handle
                if (ROOM.monster[n].user.xplevel > 0)
                    what = [vt.attr(vt.faint, 'lesser ', vt.reset), '', vt.attr(vt.bright, 'greater ', vt.reset)]
                    [ROOM.monster[n].user.xplevel - ROOM.monster[n].user.level + 1] + what
                vt.out(`It's`, an(what), '... ', ROOM.monster.length < 4 ? -250 : -50)

                if ($.player.novice || party.length > 3 || (dice(ROOM.monster[n].user.xplevel / 5 + 5) * (101 - $.online.cha + deep) > 1)) {
                    if (ROOM.monster[n].user.xplevel > 0)
                        vt.out(`and it doesn't look friendly.`, -50)
                    else
                        vt.out('and it looks harmless', -200, ', for now.', -50)
                    vt.outln(ROOM.monster.length < 4 ? -250 : -50)
                    if (ROOM.monster[n]) PC.wearing(ROOM.monster[n])
                }
                else {
                    vt.outln(`and it's `, vt.yellow, vt.bright, -250
                        , ['bewitched', 'charmed', 'dazzled', 'impressed', 'seduced'][dice(5) - 1], -250
                        , ' by your ', -250
                        , ['awesomeness', 'elegance', 'presence', $.player.armor, $.player.weapon][dice(5) - 1], -250)
                    ROOM.monster[n].user.gender = 'FM'[dice(2) - 1]
                    ROOM.monster[n].user.handle = vt.attr(ROOM.monster[n].pc.color || vt.white, vt.bright, 'charmed ', ROOM.monster[n].user.handle, vt.reset)
                    const xp = dice(3 + $.online.adept + int($.access.sysop) - int($.player.coward)) - 2
                    ROOM.monster[n].user.xplevel = xp > 1 ? 1 : xp
                    vt.outln(' to join ', ['you', 'your party'][+(party.length > 1)], ' in ', -250
                        , [vt.white, vt.cyan, vt.red][ROOM.monster[n].user.xplevel + 1], vt.bright
                        , ['spirit ... ', 'defense.', 'arms!'][ROOM.monster[n].user.xplevel + 1], -500)
                    party.push(ROOM.monster[n])
                    ROOM.monster.splice(n--, 1)
                }
            }

            if (ROOM.monster.length) {
                $.from = 'Dungeon'
                vt.action('battle')
                b4 = ROOM.monster.length > 3 ? -ROOM.monster.length : ROOM.monster.length > 2 ? $.online.hp : 0
                Battle.engage('Dungeon', party, ROOM.monster, doSpoils)
                return false
            }

            pause = true
            return true
        }

        //	npc?
        let loot = new Coin(0)
        if (ROOM.occupant && !refresh) drawRoom(Y, X)
        switch (ROOM.occupant) {
            case 'trapdoor':
                if (dice(100 - Z) > 1) {
                    vt.outln('You have stepped onto a trapdoor!')
                    vt.outln(-300)
                    let u = (dice(127 + deep - ($.player.backstab << 1) - ($.player.steal << 2)) < $.online.dex)
                    for (let m = party.length - 1; m > 0; m--) {
                        if (dice(120) < party[m].dex)
                            vt.out(party[m].user.handle, vt.faint, ' manages to catch the edge and stop from falling.')
                        else {
                            vt.out(party[m].user.handle, vt.reset
                                , vt.bright, ' falls'
                                , vt.normal, ' down a'
                                , vt.faint, ' level!')
                            if (u) party.splice(m, 1)
                        }
                        vt.outln(-300)
                    }
                    if (u) {
                        vt.outln('You manage to catch the edge and stop yourself from falling.')
                        ROOM.occupant = ''
                    }
                    else {
                        party = []
                        party.push($.online)
                        vt.outln(vt.bright, vt.yellow, 'You fall down a level!', -500)
                        if (dice(100 + $.player.level - Z) > $.online.dex) {
                            if (dice($.online.cha / 10 + deep) <= (deep + 1))
                                $.player.toWC -= dice(Math.abs(Z - $.player.level))
                            $.online.toWC -= dice(Math.round($.online.weapon.wc / 10) + 1)
                            vt.outln(`Your ${weapon()} is damaged from the fall!`, -50)
                        }
                        if (dice(100 + $.player.level - Z) > $.online.dex) {
                            if (dice($.online.cha / 10 + deep) <= (deep + 1))
                                $.player.toAC -= dice(Math.abs(Z - $.player.level))
                            $.online.toAC -= dice(Math.round($.online.armor.ac / 10) + 1)
                            vt.outln(`Your ${armor()} is damaged from the fall!`, -50)
                        }
                        Z++
                        generateLevel()
                        pause = true
                        menu()
                        return false
                    }
                }
                else {
                    ROOM.occupant = ''
                    vt.profile({ png: 'npc/faery spirit', effect: 'fadeInRight' })
                    vt.out(vt.cyan, vt.bright, 'A faery spirit appears ', -600
                        , vt.normal, 'and passes ', -500)
                    if ((!DL.events && DL.exit) || dice(50 + Z - deep) > ($.online.cha - 10 * int($.player.coward))) {
                        vt.animated('fadeOut')
                        vt.outln(vt.faint, 'by you.')
                        recovery()
                    }
                    else {
                        vt.animated('fadeOutLeft')
                        vt.outln(vt.faint, 'through you.')
                        for (let i = 0; i <= Z; i++)
                            $.online.hp += dice(int(DL.cleric.user.level / 9)) + dice(int(Z / 9 + deep / 3))
                        if ($.online.hp > $.player.hp) $.online.hp = $.player.hp
                        if ($.player.magic > 1) {
                            for (let i = 0; i <= Z; i++)
                                $.online.sp += dice(int(DL.cleric.user.level / 9)) + dice(int(Z / 9 + deep / 3))
                            if ($.online.sp > $.player.sp) $.online.sp = $.player.sp
                        }
                        vt.sound('heal')
                    }
                }
                break

            case 'portal':
                vt.action('ny')
                vt.profile({ jpg: 'ddd', effect: 'fadeIn', level: romanize(deep + 2), pc: 'domain portal' })
                vt.out(vt.blue, vt.bright, `You've found a portal to a deeper and more dank dungeon.`)
                vt.form = {
                    'deep': {
                        cb: () => {
                            ROOM.occupant = ''
                            vt.outln()
                            if (/Y/i.test(vt.entry)) {
                                vt.animated('fadeOutDown')
                                vt.sound('portal')
                                vt.out(vt.white, vt.bright, `You descend `, -400, vt.normal, `into domain `, -300, vt.faint, romanize(++deep + 1), ' ... ', -200)
                                generateLevel()
                                vt.drain()
                                vt.outln()
                            }
                            else
                                vt.animated('fadeOut')
                            menu()
                        }, prompt: 'Descend even deeper (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 20
                    }
                }
                vt.focus = 'deep'
                return false

            case 'well':
                scroll(1, false)
                vt.music('well')
                vt.outln(-500, vt.magenta, 'You have found a legendary ', vt.bright, 'Wishing Well', vt.normal, '.')
                vt.outln(-500)
                vt.outln(-500, vt.bright, vt.yellow, 'What do you wish to do?', -500)

                let wishes = 'BFORT'
                vt.out(bracket('B'), 'Bless yourself', -25)
                vt.out(bracket('F'), 'Fix all your damage', -25)
                vt.out(bracket('O'), 'Teleport all the way out', -25)
                vt.out(bracket('R'), 'Resurrect all the dead players', -25)
                vt.out(bracket('T'), 'Teleport to another level', -25)
                if (!$.player.coward && deep) {
                    wishes += 'C'
                    vt.out(bracket('C'), 'Curse another player', -50)
                }
                if (deep > 1) { vt.out(bracket('L'), `Loot another player's money`, -75); wishes += 'L' }
                if (deep > 3) { vt.out(bracket('G'), 'Grant another call', -100); wishes += 'G' }
                if (deep > 5) { vt.out(bracket('K'), 'Key hint(s)', -200); wishes += 'K' }
                if (deep > 7) { vt.out(bracket('D'), 'Destroy dungeon visit', -250); wishes += 'D' }
                vt.outln(-500)
                vt.drain()

                vt.action('well')
                vt.form = {
                    'well': {
                        cb: () => {
                            ROOM.occupant = ''
                            well = false
                            vt.outln()
                            let wish = vt.entry.toUpperCase()
                            if (wish == '' || wishes.indexOf(wish) < 0) {
                                vt.sound('oops')
                                vt.refocus()
                                return
                            }
                            vt.animated('flipOutX')
                            vt.outln()

                            switch (wish) {
                                case 'B':
                                    if ($.player.cursed) {
                                        $.player.coward = false
                                        $.player.cursed = ''
                                        vt.out(vt.bright, vt.black, 'The dark cloud has left you.')
                                        news(`\tlifted curse`)
                                    }
                                    else {
                                        vt.sound('shimmer')
                                        $.player.blessed = 'well'
                                        vt.out(vt.yellow, 'You feel ', vt.bright, 'a shining aura', vt.normal, ' surround you.')
                                        news(`\twished for a blessing`)
                                    }
                                    PC.adjust('str', 110)
                                    PC.adjust('int', 110)
                                    PC.adjust('dex', 110)
                                    PC.adjust('cha', 110)
                                    vt.sound('shimmer')
                                    DL.events = 0
                                    DL.exit = false
                                    break

                                case 'C':
                                    vt.sound('steal')
                                    Battle.user('Curse', (opponent: active) => {
                                        if (opponent.user.id == $.player.id) {
                                            opponent.user.id = ''
                                            vt.outln(`You can't curse yourself.`)
                                            vt.refocus()
                                            return
                                        }
                                        if (opponent.user.id) {
                                            news(`\tcursed ${opponent.user.handle}`)
                                            if (opponent.user.blessed) {
                                                log(opponent.user.id, `\n${$.player.handle} vanquished your blessedness!`)
                                                opponent.user.blessed = ''
                                                vt.out(vt.yellow, vt.bright, opponent.who.His, 'shining aura', vt.normal, ' fades ', vt.faint, 'away.')
                                            }
                                            else {
                                                log(opponent.user.id, `\n${$.player.handle} cursed you!`)
                                                opponent.user.cursed = $.player.id
                                                vt.out(vt.faint, 'A dark cloud hovers over ', opponent.who.him, '.')
                                            }
                                            opponent.user.coward = true
                                            PC.save(opponent)
                                            if (opponent.user.id == $.king.id) {
                                                $.player.coward = true
                                                $.online.altered = true
                                                vt.sound('boom', 6)
                                            }
                                            else
                                                vt.sound('morph', 12)
                                        }
                                        menu()
                                        return
                                    })
                                    return

                                case 'T':
                                    let start = int(Z - dice(deep))
                                    if (start < 1) start = 1
                                    let end = int(Z + dice(deep) + dice(Z) + dice(Z))
                                    if (end > 100) end = 100
                                    vt.action('list')
                                    vt.form = {
                                        'level': {
                                            cb: () => {
                                                let i = parseInt(vt.entry)
                                                if (isNaN(i)) {
                                                    vt.refocus()
                                                    return
                                                }
                                                if (i < start || i > end) {
                                                    vt.refocus()
                                                    return
                                                }
                                                vt.sound('teleport')
                                                Z = i - 1
                                                generateLevel()
                                                menu()
                                            }, prompt: `Level (${start}-${end}): `, cancel: `${Z}`, enter: `${end}`, min: 1, max: 3, timeout: 30
                                        }
                                    }
                                    vt.focus = 'level'
                                    return

                                case 'D':
                                    vt.outln(vt.black, vt.bright, 'Your past time in this dungeon visit is eradicated and reset.')
                                    vt.sound('destroy', 32)
                                    for (let i in dd)
                                        delete dd[i]
                                    $.dungeon++
                                    if (!$.sorceress) $.sorceress++
                                    if (!$.taxboss) $.taxboss++
                                    if (!well) well = true
                                    generateLevel()
                                    $.warning = 2
                                    vt.sessionAllowed += $.warning * 60
                                    break

                                case 'O':
                                    vt.sound('teleport')
                                    scroll(1, false, true)
                                    vt.outln()
                                    fini()
                                    return

                                case 'R':
                                    vt.sound('resurrect')
                                    db.run(`UPDATE Players SET status='' WHERE id NOT GLOB '_*' AND status!='jail'`)
                                    news(`\twished all the dead resurrected`)
                                    break

                                case 'F':
                                    vt.music('elixir')
                                    if ($.online.str < $.player.str) $.online.str = $.player.str
                                    if ($.online.int < $.player.int) $.online.int = $.player.int
                                    if ($.online.dex < $.player.dex) $.online.dex = $.player.dex
                                    if ($.online.cha < $.player.cha) $.online.cha = $.player.cha
                                    if ($.player.toAC < 0) $.player.toAC = 0
                                    if ($.player.toWC < 0) $.player.toWC = 0
                                    if ($.online.toAC < 0) $.online.toAC = 0
                                    if ($.online.toWC < 0) $.online.toWC = 0
                                    if ($.online.hp < $.player.hp) $.online.hp = $.player.hp
                                    if ($.online.sp < $.player.sp) $.online.sp = $.player.sp
                                    if ($.online.hull < $.player.hull) $.online.hull = $.player.hull
                                    vt.outln(vt.cyan, vt.bright, 'You are completely healed and all damage is repaired.')
                                    break

                                case 'L':
                                    vt.sound('steal')
                                    Battle.user('Loot', (opponent: active) => {
                                        if (opponent.user.id == $.player.id) {
                                            opponent.user.id = ''
                                            vt.outln(`You can't loot yourself.`)
                                            vt.refocus()
                                            return
                                        }
                                        else if (opponent.user.novice) {
                                            opponent.user.id = ''
                                            vt.outln(`You can't loot novice players.`)
                                            vt.refocus()
                                            return
                                        }
                                        if (opponent.user.id) {
                                            loot.value = opponent.user.coin.value + opponent.user.bank.value
                                            log(opponent.user.id, `\n${$.player.handle} wished for your ${loot.carry(2, true)}`)
                                            news(`\tlooted ${opponent.user.handle}`)
                                            $.player.coin.value += loot.value
                                            opponent.user.coin.value = 0
                                            opponent.user.bank.value = 0
                                            PC.save(opponent)
                                            vt.sound('max')
                                        }
                                        menu()
                                        return
                                    })
                                    return

                                case 'G':
                                    if ($.player.today) {
                                        vt.sound('shimmer')
                                        $.player.today--
                                        vt.outln('You are granted another call for the day.')
                                        news(`\twished for an extra call`)
                                    }
                                    else {
                                        vt.outln('A deep laughter bellows... ')
                                        vt.sound('morph', 12)
                                    }
                                    break

                                case 'K':
                                    let k = dice($.player.wins < 3 ? 1 : 3)
                                    for (let i = 0; i < k; i++) {
                                        PC.keyhint($.online)
                                        vt.sound("shimmer", 12)
                                    }
                                    break
                            }
                            pause = true
                            menu()
                        }, prompt: 'What is thy bidding, my master? ', cancel: 'O', enter: 'B', eol: false, max: 1, timeout: 50
                    }
                }
                vt.drain()
                vt.focus = 'well'
                return false

            case 'wheel':
                vt.profile({ png: 'wol', effect: 'rotateIn' })
                vt.outln(vt.magenta, 'You have found a ', vt.bright, 'Mystical Wheel of Life', vt.normal, '.', -600)
                vt.music('wol')
                vt.outln(-600)
                vt.outln(vt.bright, vt.yellow, 'The runes are ',
                    ['cryptic', 'familiar', 'foreign', 'speaking out', 'strange'][dice(5) - 1],
                    ' to you.', -600)

                vt.form = {
                    'wheel': {
                        cb: () => {
                            ROOM.occupant = ''
                            vt.outln()
                            if (/Y/i.test(vt.entry)) {
                                vt.music('tension' + dice(3))
                                vt.animated('infinite rotateIn')
                                let z = (deep < 3) ? 3 : (deep < 5) ? 5 : (deep < 7) ? 7 : 10
                                let t = 0
                                for (let i = 0; i < 5; i++) {
                                    let n = int($.online.str / 5 - 5 * i + dice(5) + 1)
                                    for (let m = 0; m < n; m++) {
                                        vt.beep(true)
                                        vt.out('\r', '-\\|/'[m % 4])
                                    }
                                }
                                let n = dice($.online.str / 20) + 2
                                for (let i = 1; i <= n; i++) {
                                    t = dice(z + 1) - 1
                                    if (i == n) {
                                        z = 10
                                        if ($.access.sysop) t = [0, 2, 3, 5, 7, 8][dice(6) - 1]
                                    }
                                    vt.out(vt.bright, vt.blue, '\r [', vt.cyan, [
                                        ' +Time ', ' Death ', ' Grace ',
                                        ' Power ', ' Doom! ',
                                        'Fortune', ' Taxes ',
                                        ' =Key= ', '+Skill+', ' Morph ']
                                    [t % z],
                                        vt.blue, '] \r', -100 * 3 * i)
                                    vt.sound('click')
                                }
                                vt.animated('rotateOut')
                                vt.beep()
                                vt.outln()

                                switch (t % z) {
                                    case 0:
                                        vt.sessionAllowed += 300
                                        break
                                    case 1:
                                        death('Wheel of Death', true)
                                        break
                                    case 2:
                                        if ($.player.cursed) {
                                            vt.out(vt.faint, 'The dark cloud has been lifted.', vt.reset)
                                            $.player.cursed = ''
                                        }
                                        else {
                                            PC.adjust('str', 0, 2, 1)
                                            PC.adjust('int', 0, 2, 1)
                                            PC.adjust('dex', 0, 2, 1)
                                            PC.adjust('cha', 0, 2, 1)
                                        }
                                        PC.adjust('str', 110)
                                        PC.adjust('int', 110)
                                        PC.adjust('dex', 110)
                                        PC.adjust('cha', 110)
                                        vt.sound('shimmer')
                                        DL.events = 0
                                        DL.exit = false
                                        break
                                    case 3:
                                        $.online.hp += int($.player.hp / 2) + dice($.player.hp / 2)
                                        if ($.player.magic > 1) $.online.sp += int($.player.sp / 2) + dice($.player.sp / 2)
                                        $.player.toWC += dice($.online.weapon.wc - $.player.toWC)
                                        $.online.toWC += int($.online.weapon.wc / 2) + 1
                                        $.player.toAC += dice($.online.armor.ac - $.player.toAC)
                                        $.online.toAC += int($.online.armor.ac / 2) + 1
                                        vt.sound('hone')
                                        break
                                    case 4:
                                        if ($.player.blessed) {
                                            vt.out(vt.yellow, vt.bright, 'Your shining aura ', vt.normal, 'has left ', vt.faint, 'you.', vt.reset)
                                            $.player.blessed = ''
                                        }
                                        else {
                                            PC.adjust('str', 0, -2, -1)
                                            PC.adjust('int', 0, -2, -1)
                                            PC.adjust('dex', 0, -2, -1)
                                            PC.adjust('cha', 0, -2, -1)
                                        }
                                        PC.adjust('str', -5 - dice(5))
                                        PC.adjust('int', -5 - dice(5))
                                        PC.adjust('dex', -5 - dice(5))
                                        PC.adjust('cha', -5 - dice(5))
                                        vt.sound('crack')
                                        DL.events += dice(Z) + deep
                                        break
                                    case 5:
                                        loot.value = money(Z)
                                        loot.value += tradein(new Coin($.online.weapon.value).value, $.online.cha)
                                        loot.value += tradein(new Coin($.online.armor.value).value, $.online.cha)
                                        loot.value *= (Z + 1)
                                        $.player.coin.value += new Coin(loot.carry(1, true)).value
                                        vt.sound('yahoo')
                                        break
                                    case 6:
                                        $.player.coin.value = 0
                                        $.player.bank.value = 0
                                        loot.value = money(Z)
                                        loot.value += tradein(new Coin($.online.weapon.value).value, $.online.cha)
                                        loot.value += tradein(new Coin($.online.armor.value).value, $.online.cha)
                                        loot.value *= (Z + 1)
                                        $.player.loan.value += new Coin(loot.carry(1, true)).value
                                        vt.sound('thief2')
                                        break
                                    case 7:
                                        PC.keyhint($.online)
                                        vt.sound('click')
                                        break
                                    case 8:
                                        vt.sound('level')
                                        skillplus($.online, menu)
                                        return
                                    case 9:
                                        $.player.level = dice(Z)
                                        if ($.online.adept) $.player.level += dice($.player.level)
                                        PC.reroll($.player, PC.random('monster'), $.player.level)
                                        PC.activate($.online)
                                        $.player.gender = ['F', 'M'][dice(2) - 1]
                                        PC.save()
                                        news(`\t${$.player.handle} got morphed into a level ${$.player.level} ${$.player.pc} (${$.player.gender})!`)
                                        vt.outln(`You got morphed into a level ${$.player.level} ${$.player.pc} (${$.player.gender})!`)
                                        vt.sound('morph', 10)
                                        break
                                }
                            }
                            else
                                vt.animated('rotateOut')
                            menu()
                        }, prompt: 'Will you spin it (Y/N)? ', cancel: 'Y', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 20
                    }
                }
                vt.action('ny')
                vt.drain()
                vt.focus = 'wheel'
                pause = true
                refresh = true
                return false

            case 'thief':
                vt.out(vt.cyan, vt.faint, 'There is a thief in this ', !ROOM.type ? 'chamber'
                    : ROOM.type == 'n-s' ? 'hallway' : ROOM.type == 'w-e' ? 'corridor' : 'cavern'
                    , '! ', vt.white, -600)
                ROOM.occupant = ''

                if ($.taxboss && (Z + 1) >= $.taxman.user.level && $.player.level < $.taxman.user.level) {
                    $.taxboss--
                    PC.load($.taxman)
                    vt.outln(vt.reset, PC.who($.taxman).He, 'is the '
                        , vt.cyan, vt.bright, 'Master of Coin'
                        , vt.reset, ' for '
                        , vt.magenta, vt.bright, $.king.handle
                        , vt.reset, '!')
                    vt.profile({ jpg: 'npc/taxman', handle: $.taxman.user.handle, level: $.taxman.user.level, pc: $.taxman.user.pc, effect: 'bounceInDown' })
                    vt.sound('oops', 16)
                    PC.activate($.taxman)
                    $.taxman.user.coin.value = $.player.coin.value
                    PC.wearing($.taxman)

                    b4 = -1
                    Battle.engage('Taxman', $.online, $.taxman, () => {
                        looked = false
                        pause = true
                        refresh = true
                        menu()
                    })
                    return
                }

                if (DL.map == `Marauder's map` || (Ring.power([], $.player.rings, 'identify').power > 0)) {
                    vt.outln('He does not surprise you', vt.cyan, '.')
                    break
                }

                let x = dice(DL.width) - 1, y = dice(DL.rooms.length) - 1
                let escape = DL.rooms[y][x]
                if (escape.occupant || dice(Z * ($.player.steal / 2 + 1) - deep) > Z) {
                    if (!escape.occupant && $.player.pc !== $.taxman.user.pc) {
                        escape.occupant = 'thief'
                        const t = dice(5) - 1
                        vt.out([
                            'He decides to ignore you',
                            'He recognizes your skill and winks',
                            'He slaps your back, but your wallet remains',
                            'He offers you a drink, and you accept',
                            vt.attr(`"I'll be seeing you again"`, vt.cyan, ' as he leaves')
                        ][t])
                        vt.out(vt.cyan, '.')
                        if (t) {
                            PC.adjust(['', 'dex', 'str', 'int', 'cha'][t], -1)
                            if (t) vt.sound('thief')
                        }
                    }
                    else {
                        vt.out(vt.normal, vt.magenta, 'He teleports away!')
                        vt.sound('teleport')
                    }
                    vt.outln()
                }
                else {
                    escape.occupant = 'thief'
                    vt.outln(vt.reset, 'He surprises you!')
                    vt.sound('thief', 4)

                    vt.out('As he passes by, he steals your ')
                    x = $.online.cha + deep + 1
                    if ($.player.level / 9 - deep > Security.name[$.player.security].protection + 1)
                        x = int(x / $.player.level)
                    if ($.online.weapon.wc && dice(x) == 1) {
                        vt.out(weapon(), -600)
                        Weapon.equip($.online, Weapon.merchant[0])
                        vt.sound('thief2')
                        DL.exit = false
                    }
                    else if (DL.map && dice($.online.cha / 9) - 1 <= int(deep / 3)) {
                        vt.out(vt.yellow, vt.bright, 'map')
                        DL.exit = false
                        DL.map = ''
                        refresh = true
                    }
                    else if ($.player.magic < 3 && $.player.spells.length && dice($.online.cha / 10 + deep + 1) - 1 <= int(deep / 2)) {
                        if ($.player.emulation == 'XT') vt.out('📜 ')
                        y = $.player.spells[dice($.player.spells.length) - 1]
                        vt.out(vt.magenta, vt.bright, Object.keys(Magic.spells)[y - 1], ' ', ['wand', 'scroll'][$.player.magic - 1])
                        Magic.remove($.player.spells, y)
                    }
                    else if ($.player.poisons.length && dice($.online.cha / 10 + deep + 1) - 1 <= int(deep / 2)) {
                        y = $.player.poisons[dice($.player.poisons.length) - 1]
                        vt.out('vial of ')
                        if ($.player.emulation == 'XT') vt.out('💀 ')
                        vt.out(vt.faint, Object.keys(Poison.vials)[y - 1])
                        Poison.remove($.player.poisons, y)
                    }
                    else if ($.player.coin.value) {
                        let pouch = $.player.coin.amount.split(',')
                        x = dice(pouch.length) - 1
                        vt.out($.player.coin.pieces(pouch[x].substr(-1)))
                        $.player.coin.value -= new Coin(pouch[x]).value
                    }
                    else
                        vt.out(vt.yellow, `Reese's pieces`)
                    vt.outln(vt.reset, '!', -600)
                }
                pause = true
                refresh = true
                break

            case 'cleric':
                if (!DL.cleric.hp) {
                    vt.profile({ jpg: 'npc/rip', effect: 'fadeInUp' })
                    vt.outln(vt.yellow, 'You find the ', vt.white, 'bones'
                        , vt.yellow, ' of an ', vt.faint, 'old cleric', vt.normal, '.', -600)
                    if ($.player.emulation == 'XT') vt.out(' 🪦 🕱 ')
                    vt.outln('You pray for him.')
                    DL.alert = true
                    DL.exit = false
                    break
                }

                let cast = 7
                let mod = 6 + int($.player.melee / 2) - int($.player.magic / 2)
                if (Ring.power([], $.player.rings, 'taxes').power) mod++
                if ($.access.sysop) mod++
                if ($.player.coward) mod--
                let cost = new Coin(int(($.player.hp - $.online.hp) * money(Z) / mod / $.player.hp))
                if (cost.value < 1) cost.value = 1
                cost.value *= (int(deep / 3) + 1)
                if (!$.player.coward && !$.player.steals && ($.player.pc == DL.cleric.user.pc || $.player.maxcha > 98))
                    cost.value = 0
                cost = new Coin(cost.carry(1, true))	//	just from 1-pouch

                if (ROOM.giftItem == 'chest') {
                    ROOM.giftValue = dice(6 - $.player.magic) - 1
                    cost.value = 0	//	this one is free of charge
                }

                let power = int(100 * DL.cleric.sp / DL.cleric.user.sp)
                vt.outln(vt.yellow, 'There is an ', vt.faint, 'old cleric', vt.normal
                    , vt.normal, ' in this room with '
                    , power < 40 ? vt.faint : power < 80 ? vt.normal : vt.bright, `${power}`
                    , vt.normal, '% spell power.')
                vt.out('He says, ')

                if ($.online.hp >= $.player.hp || cost.value > $.player.coin.value || DL.cleric.sp < Magic.power(DL.cleric, cast)) {
                    vt.outln(vt.yellow, '"I will pray for you."')
                    if ($.online.hp < $.player.hp)
                        vt.profile({ jpg: 'npc/prayer', effect: 'fadeInUp' })
                    break
                }

                if (power > 95) vt.profile({ jpg: 'npc/old cleric', effect: 'zoomInUp', level: DL.cleric.user.level, pc: DL.cleric.user.pc })
                if ($.online.hp > int($.player.hp / 3) || DL.cleric.sp < Magic.power(DL.cleric, 13)) {
                    vt.out('"I can ', DL.cleric.sp < Magic.power(DL.cleric, 13) ? 'only' : 'surely'
                        , ' cast a Heal spell on your wounds for '
                        , cost.value ? cost.carry() : `you, ${$.player.gender == 'F' ? 'sister' : 'brother'}`
                        , '."')
                }
                else if (DL.cleric.sp >= Magic.power(DL.cleric, 13)) {
                    cast = 13
                    vt.out('"I can restore your health for '
                        , cost.value ? cost.carry() : `you, ${$.player.gender == 'F' ? 'sister' : 'brother'}`
                        , '."')
                }

                vt.action('yn')
                vt.form = {
                    'pay': {
                        cb: () => {
                            vt.outln('\n')
                            if (/Y/i.test(vt.entry)) {
                                $.player.coin.value -= cost.value
                                DL.cleric.user.coin.value += cost.value
                                vt.out(`He casts a ${Object.keys(Magic.spells)[cast - 1]} spell on you.`)
                                DL.cleric.sp -= Magic.power(DL.cleric, cast)
                                if (cast == 7) {
                                    vt.sound('heal')
                                    for (let i = 0; i <= Z; i++)
                                        $.online.hp += dice(DL.cleric.user.level / 9) + dice(Z / 9 + deep / 3)
                                    if ($.online.hp > $.player.hp) $.online.hp = $.player.hp
                                    vt.out('  Your hit points: '
                                        , vt.bright, $.online.hp == $.player.hp ? vt.white : $.online.hp > $.player.hp * 0.85 ? vt.yellow : vt.red, $.online.hp.toString()
                                        , vt.reset, `/${$.player.hp}`)
                                }
                                else {
                                    $.online.hp = $.player.hp
                                    vt.sound('shimmer', 4)
                                }
                            }
                            else {
                                if (cast == 13) {
                                    vt.outln(vt.lyellow, '"God save you."', -300)
                                    ROOM.occupant = ''
                                    vt.outln(vt.magenta, 'He teleports away!')
                                    vt.sound('teleport', 8)
                                }
                                else {
                                    vt.profile({ jpg: 'npc/prayer', effect: 'fadeInUp' })
                                    vt.outln(vt.lyellow, '"I need to rest. ', -300, ' Go in peace."', -300)
                                    looked = true
                                }
                                DL.exit = false
                            }
                            menu()
                        }, prompt: `${cost.value ? 'Pay' : 'Receive'} (Y/N)? `, cancel: 'N', enter: 'Y', eol: false, match: /Y|N/i, max: 1, timeout: 20
                    }
                }
                vt.focus = 'pay'
                return false

            case 'wizard':
                vt.out(vt.magenta, 'You encounter a ', vt.bright)

                if (!$.player.cursed && !$.player.novice && dice((Z > $.player.level ? Z : 1) + 20 * $.player.immortal + $.player.level + $.online.cha) == 1) {
                    vt.profile({
                        png: (PC.name['player'][$.player.pc] || PC.name['immortal'][$.player.pc] ? 'player' : 'monster') + '/' + $.player.pc.toLowerCase() + ($.player.gender == 'F' ? '_f' : ''),
                        effect: 'flip'
                    })
                    $.player.coward = true
                    $.online.altered = true
                    vt.outln('doppelganger', vt.normal, ' waiting for you.', -1000)
                    vt.outln(-1200)

                    PC.adjust('str', -10)
                    PC.adjust('int', -10)
                    PC.adjust('dex', -10)
                    PC.adjust('cha', -10)
                    vt.outln(vt.bright, 'It curses you!')
                    vt.sound('morph', 18)
                    if ($.player.blessed) {
                        $.player.blessed = ''
                        vt.out(vt.yellow, 'Your ', -100, vt.bright, 'shining aura ', -100, vt.normal, 'left', -100, vt.faint)
                    }
                    else {
                        $.player.cursed = 'wiz!'
                        vt.out(vt.black, vt.bright, 'A dark cloud hovers over')
                    }
                    vt.outln(' you.')
                    news(`\tcursed by a doppelganger!`)

                    //	vacate
                    drawHero()
                    vt.animated('flipOutY')
                    vt.sound('teleport', 12)
                    ROOM.occupant = ''
                    let x: number, y: number
                    do {
                        y = dice(DL.rooms.length) - 1
                        x = dice(DL.width) - 1
                    } while (DL.rooms[y][x].type == 'cavern' || DL.rooms[y][x].occupant)
                    DL.rooms[y][x].occupant = 'wizard'
                    $.player.coward = false
                    $.online.altered = true
                }
                else if (!$.player.novice && dice(Z + $.online.cha) == 1) {
                    vt.profile({
                        png: (PC.name['player'][$.player.pc] || PC.name['immortal'][$.player.pc] ? 'player' : 'monster') + '/' + $.player.pc.toLowerCase()
                            + ($.player.gender == 'F' ? '_f' : ''), effect: 'flip'
                    })
                    vt.outln('mimic', vt.normal, ' occupying this space.', -1000)
                    vt.outln(-1200)
                    vt.outln(vt.faint, 'It waves a hand at you ... ', -800)

                    //	vacate
                    drawHero()
                    vt.animated('flipOutY')
                    vt.sound('teleport', 12)
                    ROOM.occupant = ''
                    let x: number, y: number
                    do {
                        y = dice(DL.rooms.length) - 1
                        x = dice(DL.width) - 1
                    } while (DL.rooms[y][x].type == 'cavern' || DL.rooms[y][x].occupant)
                    DL.rooms[y][x].occupant = 'wizard'
                }
                else {
                    vt.profile({ jpg: 'npc/wizard', effect: 'backInLeft', handle: 'Pops', level: 77, pc: 'crackpot' })
                    vt.outln('wizard', vt.normal, ' in this room.\n', -300)
                    scroll(1, false)
                    teleport()
                    return false
                }
                refresh = true
                pause = true
                break

            case 'dwarf':
                vt.profile({ jpg: 'npc/dwarf', effect: 'fadeIn' })
                vt.beep()
                vt.outln(vt.yellow, 'You run into a ', vt.bright, 'dwarven merchant', vt.normal, ', ', $.dwarf.user.handle, '.', -1000)
                let hi = 0, credit = new Coin(0), ring = $.dwarf.user.rings[0]

                vt.form = {
                    'armor': {
                        cb: () => {
                            vt.outln()
                            ROOM.occupant = ''
                            if (/Y/i.test(vt.entry)) {
                                $.player.coin = new Coin(0)
                                Armor.equip($.online, Armor.dwarf[hi])
                                $.player.toAC = 2 - dice(3)
                                $.online.toAC = dice($.online.armor.ac) - 2
                                vt.profile({ jpg: `specials/${$.player.armor}`, effect: 'fadeInUpBig' })
                                vt.sound('click')
                            }
                            else {
                                vt.outln()
                                vt.out(vt.yellow, $.dwarf.user.handle, ' eyes you suspicously ... ', -600)
                                if ($.player.level > $.dwarf.user.level) {
                                    if (Ring.wear($.player.rings, ring))
                                        getRing('inherit', ring)
                                    else {
                                        vt.outln('takes back his ring!')
                                        Ring.remove($.player.rings, ring)
                                    }
                                    PC.saveRing(ring, $.player.id)
                                    vt.sound('click', 8)
                                }
                                else {
                                    merchant()
                                    return
                                }
                            }
                            menu()
                        }, prompt: 'Ok (Y/N)? ', cancel: 'Y', enter: 'Y', eol: false, match: /Y|N/i, max: 1, timeout: 20
                    },
                    'weapon': {
                        cb: () => {
                            vt.outln()
                            ROOM.occupant = ''
                            if (/Y/i.test(vt.entry)) {
                                $.player.coin = new Coin(0)
                                Weapon.equip($.online, Weapon.dwarf[hi])
                                $.player.toWC = 2 - dice(3)
                                $.online.toWC = dice($.online.weapon.wc) - 2
                                vt.profile({ jpg: `specials/${$.player.weapon}`, effect: 'fadeInUpBig' })
                                vt.sound('click')
                            }
                            else {
                                vt.out(vt.yellow, $.dwarf.user.handle, ' evaluates the situation ... ', -600)
                                if ($.player.level > $.dwarf.user.level) {
                                    if (Ring.wear($.player.rings, ring)) {
                                        getRing('inherit', ring)
                                    }
                                    else {
                                        vt.outln('takes back his ring!')
                                        Ring.remove($.player.rings, ring)
                                    }
                                    PC.saveRing(ring, $.player.id)
                                    vt.sound('click', 8)
                                }
                                else {
                                    merchant()
                                    return
                                }
                            }
                            menu()
                        }, prompt: 'Ok (Y/N)? ', cancel: 'Y', enter: 'Y', eol: false, match: /Y|N/i, max: 1, timeout: 20
                    }
                }

                if (dice(2) == 1) {
                    let ac = Armor.name[$.player.armor].ac
                    vt.out('\nI see you have a class ', bracket(ac, false), ' ', armor())
                    ac += $.player.toAC
                    if (ac) {
                        let cv = new Coin(Armor.name[$.player.armor].value)
                        credit.value = tradein(cv.value, $.online.cha)
                        if ($.player.toAC) credit.value = int(credit.value * (ac + $.player.toAC / ($.player.poison + 1)) / ac)
                        if ($.online.toAC < 0) credit.value = int(credit.value * (ac + $.online.toAC) / ac)
                        if (credit.value > cv.value)
                            credit.value = cv.value
                    }
                    else
                        credit.value = 0
                    vt.outln(' worth ', credit.carry(), -1000)

                    for (hi = 0; hi < Armor.dwarf.length - 1 && ac >= Armor.name[Armor.dwarf[hi]].ac; hi++);
                    if (new Coin(Armor.name[Armor.dwarf[hi]].value).value <= credit.value + $.player.coin.value) {
                        if ($.player.coin.value) vt.outln('  and all your coin worth ', $.player.coin.carry(), -1000)
                        vt.out(`I'll trade you for my `, vt.bright
                            , ['exceptional', 'precious', 'remarkable', 'special', 'uncommon'][dice(5) - 1], ' '
                            , bracket(Armor.name[Armor.dwarf[hi]].ac, false), ' ')
                        vt.outln(vt.bright, vt.yellow, Armor.dwarf[hi], -1000)
                        vt.action('yn')
                        vt.drain()
                        vt.focus = 'armor'
                        return false
                    }
                }
                else {
                    let wc = Weapon.name[$.player.weapon].wc
                    vt.out('\nI see you carrying a class ', bracket(wc, false), ' ', weapon())
                    wc += $.player.toWC
                    if (wc) {
                        let cv = new Coin(Weapon.name[$.player.weapon].value)
                        credit.value = tradein(cv.value, $.online.cha)
                        if ($.player.toWC) credit.value = int(credit.value * (wc + $.player.toWC / ($.player.poison + 1)) / wc)
                        if ($.online.toWC < 0) credit.value = int(credit.value * (wc + $.online.toWC) / wc)
                        if (credit.value > cv.value)
                            credit.value = cv.value
                    }
                    else
                        credit.value = 0
                    vt.outln(' worth ', credit.carry())

                    for (hi = 0; hi < Weapon.dwarf.length - 1 && wc >= Weapon.name[Weapon.dwarf[hi]].wc; hi++);
                    if (new Coin(Weapon.name[Weapon.dwarf[hi]].value).value <= credit.value + $.player.coin.value) {
                        if ($.player.coin.value) vt.outln('  and all your coin worth ', $.player.coin.carry(), -1000)
                        vt.out(`I'll trade you for my `, vt.bright
                            , ['exquisite', 'fine', 'jeweled', 'rare', 'splendid'][dice(5) - 1], ' '
                            , bracket(Weapon.name[Weapon.dwarf[hi]].wc, false), ' ')
                        vt.outln(vt.bright, vt.cyan, Weapon.dwarf[hi], -1000)
                        vt.action('yn')
                        vt.drain()
                        vt.focus = 'weapon'
                        return false
                    }
                }

                vt.beep()
                vt.animated('fadeOut')
                vt.outln(`I've got nothing of interest for trading.  Perhaps next time, my friend?`, -1000)
                ROOM.occupant = ''
                break

            case 'witch':
                scroll(1, false)
                vt.music('.')
                vt.profile({ jpg: 'npc/witch', effect: 'fadeIn' })
                vt.outln(vt.green, 'You encounter the ', vt.bright, 'sorceress', vt.normal, ', ', $.witch.user.handle)
                cat(`dungeon/witch`)
                PC.load($.witch)
                PC.wearing($.witch)
                vt.sound('steal', 10)

                let choice: string
                vt.form = {
                    offer: {
                        cb: () => {
                            vt.outln()
                            vt.sound('click', 8)
                            if (/Y/i.test(vt.entry)) {
                                let result = Weapon.swap($.online, $.witch)
                                if (typeof result == 'boolean' && result) {
                                    vt.outln(vt.faint, '"', vt.normal, vt.green, 'A gift from the gods, I give you ', vt.reset, weapon(), vt.reset, vt.faint, '"')
                                    vt.sound('click', 13)
                                }
                                result = Armor.swap($.online, $.witch)
                                if (typeof result == 'boolean' && result) {
                                    vt.outln(vt.faint, '"', vt.normal, vt.green, `I offer my crafted `, vt.reset, armor(), vt.reset, vt.faint, '"')
                                    vt.sound('click', 13)
                                }
                                vt.out(vt.faint, '"', vt.normal, vt.green, "Your price is ")

                                if ($.player.steal > 1) {
                                    vt.sound('mana', 8)
                                    vt.out('your ability to steal diminishes')
                                    $.player.steal--
                                }
                                else if ($.player.magic > 3) {
                                    vt.sound('mana', 8)
                                    vt.out('your divine spellcasting ability is mine')
                                    $.player.magic--
                                }
                                else if ($.player.melee > 3) {
                                    vt.sound('mana', 8)
                                    vt.out('your barbaric powers are halved')
                                    $.player.melee = 2
                                    PC.adjust('str', -5 - dice(5), -2, -2)
                                }
                                else if ($.player.str > 80 && $.player.int > 80 && $.player.dex > 80 && $.player.cha > 80) {
                                    vt.sound('mana', 8)
                                    vt.out('allowing me to drain your overall ability')
                                    $.player.blessed = ''
                                    PC.adjust('str', -5 - dice(5), -2, -2)
                                    PC.adjust('int', -5 - dice(5), -2, -2)
                                    PC.adjust('dex', -5 - dice(5), -2, -2)
                                    PC.adjust('cha', -5 - dice(5), -2, -2)
                                }
                                else {
                                    $.player.level = dice(Z)
                                    if ($.online.adept) $.player.level += dice($.player.level)
                                    PC.reroll($.player, PC.random('monster'), $.player.level)
                                    PC.activate($.online)
                                    $.player.gender = ['F', 'M'][dice(2) - 1]
                                    PC.save()
                                    vt.sound('crone', 21)
                                    vt.out(`me morphing you into a level ${$.player.level} ${$.player.pc} (${$.player.gender})`)
                                    news(`\tgot morphed by ${$.witch.user.handle} into a level ${$.player.level} ${$.player.pc} (${$.player.gender})!`)
                                }

                                vt.music('crack')
                                vt.outln('!', vt.reset, vt.faint, '"', -2100)
                                vt.sound('click')

                                switch (choice) {
                                    case 'rings':
                                        let rpc = <active>{ user: { id: '' } }
                                        for (let row in rs) {
                                            rpc.user.id = rs[row].bearer
                                            PC.load(rpc)
                                            vt.outln(`You are given the ${rs[row].name} ring from ${rpc.user.handle}.`)
                                            Ring.remove(rpc.user.rings, rs[row].name)
                                            PC.save(rpc)
                                            Ring.wear(rpc.user.rings, rs[row].name)
                                            PC.saveRing(rs[row].name, $.player.id, $.player.rings)
                                            vt.sound('click', 8)
                                        }
                                        news(`\tgot ${rs.length} magical ring${rs.length > 1 ? 's' : ''} of power from ${$.witch.user.handle}!`)
                                        break

                                    case 'magic':
                                        let m = dice($.player.magic + 1)
                                        let retry = 8
                                        for (let i = 0; i < m; i++) {
                                            let p = dice(Object.keys(Magic.spells).length - 12) + 12
                                            let spell = Magic.pick(p)
                                            if (!Magic.have($.player.spells, spell)) {
                                                Magic.add($.player.spells, p)
                                                switch ($.player.magic) {
                                                    case 1:
                                                        vt.beep()
                                                        vt.outln('A ', vt.white, vt.bright, `Wand of ${spell}`, vt.reset, ' appears in your hand.', -600)
                                                        break
                                                    case 2:
                                                        vt.beep()
                                                        vt.outln('You add a ', vt.yellow, vt.bright, `Scroll of ${spell}`, vt.reset, ' to your arsenal.', -600)
                                                        break
                                                    case 3:
                                                        vt.sound('shimmer', 8)
                                                        vt.outln('The ', vt.cyan, vt.bright, `Spell of ${spell}`, vt.reset, ' is revealed to you.', -600)
                                                        break
                                                    case 4:
                                                        vt.sound('shimmer', 8)
                                                        vt.outln(vt.magenta, vt.bright, spell, vt.reset, ' is known to you.', -600)
                                                        break
                                                }
                                            }
                                            else {
                                                if (--retry)
                                                    m++
                                                else
                                                    break
                                            }
                                        }
                                        news(`\tgot special magicks from ${$.witch.user.handle}!`)
                                        break

                                    case 'curse':
                                        vt.sound('resurrect')
                                        db.run(`UPDATE Players SET status='' WHERE id NOT GLOB '_*' AND status != 'jail'`)
                                        db.run(`UPDATE Players SET blessed='',coward=1,cursed='${$.witch.user.id}' WHERE id NOT GLOB '_*' AND access != 'Elemental' AND id != '${$.player.id}'`)
                                        news(`\t${$.witch.user.handle} resurrected all the dead and cursed everyone!`)
                                        vt.outln(vt.faint, 'The deed is done.', -200)
                                        break
                                }
                            }
                            else {
                                $.player.coward = false
                                witch()
                                return
                            }
                            vt.animated('fadeOut')
                            pause = true
                            refresh = true
                            menu()
                        }, prompt: 'Do you accept my offer to help (Y/N)? ', cancel: 'Y', enter: 'Y', eol: false, match: /Y|N/i, max: 1, timeout: 50
                    }
                }

                vt.action('yn')
                vt.drain()
                vt.outln(-1000)
                vt.outln(vt.faint, `${PC.who($.witch).He}says, "`
                    , vt.green, vt.normal, "Come hither. ", -1200
                    , ['I am niece to Circe known for her vengeful morph', 'My grandfather is the sun god Helios', 'My grandmother is a daughter of the titan Oceanus', 'I am priestess to Hecate, source of my special magicks', 'I trusted an Argonaut. Once'][dice(5) - 1], '.'
                    , vt.reset, vt.faint, '"', -2400)
                vt.out(vt.faint, '"', vt.normal, vt.green)
                let rs = db.query(`SELECT name,bearer FROM Rings WHERE bearer != '' AND bearer != '${$.player.id}'`)
                if (rs.length) {
                    vt.out('I see powerful rings for the taking')
                    choice = 'rings'
                }
                else if (!Magic.have($.player.spells, 'Morph')) {
                    vt.out(`I can ${$.player.magic < 3 ? 'provide' : 'teach'} you advanced magic`)
                    choice = 'magic'
                }
                else {
                    vt.out('You can choose to '
                        , vt.reset, vt.faint, 'resurrect the dead'
                        , vt.reset, vt.green, ' and send a '
                        , vt.reset, vt.faint, 'Curse throughout the Land'
                        , vt.reset, vt.green)
                    choice = 'curse'
                }
                vt.outln('.', vt.reset, vt.faint, '"', -1200)
                vt.out(vt.faint, '"', vt.normal, vt.green, 'Of course, there is a price to pay, something you may hold dear.', vt.reset, vt.faint, '"')
                vt.focus = 'offer'
                ROOM.occupant = ''
                return false
        }

        //	items?
        switch (ROOM.giftItem) {
            case 'armor':
                let xarmor = <active>{ user: Object.assign({}, $.player) }
                PC.reroll(xarmor.user)
                xarmor.user.armor = Armor.special[ROOM.giftValue]
                PC.activate(xarmor)
                if (Armor.swap($.online, xarmor)) {
                    vt.profile({ jpg: `specials/${$.player.armor}`, effect: 'fadeInUpBig' })
                    vt.outln(vt.faint, vt.yellow, 'You find', vt.normal, an($.player.armor.toString()), vt.bright, '!')
                    vt.sound('max')
                    pause = true
                    ROOM.giftItem = ''
                }
                break

            case 'chest':
                let gold = new Coin(money(Z))
                gold.value += tradein(new Coin($.online.weapon.value).value, $.online.cha)
                gold.value += tradein(new Coin($.online.armor.value).value, $.online.cha)
                gold.value *= +ROOM.giftValue
                gold = new Coin(gold.carry(1, true))
                if (gold.value) {
                    if (gold.value > 1e+17)
                        gold.value = 1e+17
                    vt.profile({ jpg: `specials/chest`, effect: 'fadeInUpBig' })
                    vt.sound('yahoo', 10)
                    vt.outln(vt.yellow, 'You find a ', vt.bright, 'treasure chest'
                        , vt.normal, ' holding ', gold.carry(), '!')
                }
                else {
                    vt.outln(vt.faint, vt.yellow, 'You find an empty, treasure chest.')
                    vt.sound('boo')
                }
                $.player.coin.value += gold.value
                pause = true
                ROOM.giftItem = ''
                break

            case 'magic':
                if (!Magic.have($.player.spells, +ROOM.giftValue)) {
                    vt.outln(vt.bright, vt.yellow, 'You find a '
                        , vt.cyan, Magic.merchant[+ROOM.giftValue - 1], vt.yellow
                        , ' ', $.player.magic == 2 ? 'scroll' : 'wand', '!')
                    Magic.add($.player.spells, +ROOM.giftValue)
                    pause = true
                    ROOM.giftItem = ''
                }
                break

            case 'map':
                DL.map = `Marauder's map`
                vt.outln(vt.bright, vt.yellow, `You find ${DL.map}!`)
                pause = true
                refresh = true
                ROOM.giftItem = ''
                break

            case 'poison':
                if (!Poison.have($.player.poisons, +ROOM.giftValue)) {
                    vt.outln(vt.bright, vt.yellow, 'You find a vial of '
                        , Poison.merchant[+ROOM.giftValue - 1], '!')
                    Poison.add($.player.poisons, +ROOM.giftValue)
                    pause = true
                    ROOM.giftItem = ''
                }
                break

            case 'potion':
                let id = false
                if (DL.moves < DL.width && !ROOM.giftID)
                    ROOM.giftID = !$.player.novice
                        && dice(100 + +ROOM.giftValue) < ($.online.int / 20 * (1 << $.player.poison) + ($.online.int > 90 ? ($.online.int % 90) << 1 : 0))

                vt.sound('bubbles')
                vt.out(vt.cyan, 'On the ground, you find a ')
                if (Ring.power([], $.player.rings, 'identify').power) potions[ROOM.giftValue].identified = true
                if (potions[ROOM.giftValue].identified || ROOM.giftID || $.access.sysop) {
                    vt.profile({ png: potions[ROOM.giftValue].image, handle: potion[ROOM.giftValue], effect: 'fadeInUp' })
                    vt.out(vt.bright, potion[ROOM.giftValue], vt.normal, '.')
                    if (!potions[ROOM.giftValue].identified)	//	recall seeing this before
                        potions[ROOM.giftValue].identified = $.player.novice || $.online.int > (85 - 4 * $.player.poison)
                    id = true
                }
                else {
                    vt.profile({ png: potions[ROOM.giftValue].image, handle: 'Is it ' + 'nt'[dice(2) - 1] + 'asty, precious?', effect: 'fadeInUp' })
                    vt.out(potions[ROOM.giftValue].description, vt.cyan, vt.bright, ' potion', vt.normal, '.')
                }

                if (id ||
                    (dice(100 + 10 * +ROOM.giftValue * int($.player.coward)) + dice(deep / 2) < (50 + int($.online.int / 2)) && dice(100) > 1)) {
                    vt.action('potion')
                    vt.form = {
                        'quaff': {
                            cb: () => {
                                vt.outln('\n')
                                if (/N/i.test(vt.entry)) {
                                    looked = true
                                    menu()
                                    return
                                }
                                if (/Y/i.test(vt.entry))
                                    quaff(+ROOM.giftValue)
                                else if (/T/i.test(vt.entry)) {
                                    quaff(+ROOM.giftValue, false)
                                    vt.sound('click')
                                    pause = false
                                }
                                ROOM.giftItem = ''
                                menu()
                            }, prompt: 'Will you drink it (Yes/No/Toss)? ', cancel: 'T', enter: 'N', eol: false, match: /Y|N|T/i, timeout: 10
                        }
                    }
                    vt.focus = 'quaff'
                    return false
                }
                else {
                    let auto = dice(2) < 2
                    vt.outln(vt.faint, '\nYou ', -500, auto ? 'quaff' : 'toss', ' it without hesitation.', -500)
                    quaff(+ROOM.giftValue, auto)
                    ROOM.giftItem = ''
                }
                break

            case 'ring':
                let ring = ROOM.giftValue.toString()
                //  enforce uniquess
                if (!db.query(`SELECT bearer FROM Rings WHERE name='${ring}' AND bearer != ''`).length
                    && Ring.wear($.player.rings, ring)) {
                    getRing('find', ring)
                    PC.saveRing(ring, $.player.id, $.player.rings)
                    pause = true
                    ROOM.giftItem = ''
                }
                break

            case 'weapon':
                let xweapon = <active>{ user: Object.assign({}, $.player) }
                PC.reroll(xweapon.user)
                xweapon.user.weapon = Weapon.special[ROOM.giftValue]
                PC.activate(xweapon)
                if (Weapon.swap($.online, xweapon)) {
                    vt.profile({ jpg: `specials/${$.player.weapon}`, effect: 'fadeInUpBig' })
                    vt.outln(vt.faint, vt.cyan, 'You find', vt.normal, an($.player.weapon.toString()), vt.bright, '!')
                    vt.sound('max')
                    pause = true
                    ROOM.giftItem = ''
                }
                break

            case 'xmagic':
                if (!Magic.have($.player.spells, ROOM.giftValue)) {
                    vt.outln(vt.bright, vt.yellow, 'You find a '
                        , vt.magenta, Magic.special[+ROOM.giftValue - Magic.merchant.length - 1], vt.yellow
                        , ' ', $.player.magic == 1 ? 'wand' : 'scroll', '!')
                    Magic.add($.player.spells, +ROOM.giftValue)
                    pause = true
                    ROOM.giftItem = ''
                }
                break
        }

        return true
    }

    function doSpoils() {
        if ($.reason) {
            $.reason = `${$.reason} on level ${romanize(deep + 1)}.${Z + 1}`
            DL.map = `Marauder's map`
            scroll()
            vt.hangup()
        }
        looked = false
        pause = false

        //	remove any dead carcass, displace teleported creatures
        for (let n = ROOM.monster.length - 1; n >= 0; n--) {
            if (ROOM.monster[n].hp < 1) {
                let mon = <active>{ user: { id: '' } }
                Object.assign(mon, ROOM.monster[n])
                //	teleported?
                if (mon.hp < 0) {
                    let y = dice(DL.rooms.length) - 1
                    let x = dice(DL.width) - 1
                    mon.hp = Math.abs(mon.hp) + int(mon.user.hp / (dice(5) + 5))
                    mon.sp += int(mon.user.sp / (dice(5) + 5))
                    DL.rooms[y][x].monster.push(mon)
                }
                else {
                    //	defeated a significantly larger denizen on this level, check for any added bonus(es)
                    if (!$.player.coward && (mon.user.xplevel - Z) > 5) {
                        if ($.player.cursed) {
                            vt.outln(vt.bright, vt.black, 'The dark cloud has left you.')
                            $.player.cursed = ''
                        }
                        let m = int((mon.user.xplevel - Z) / 6)
                        vt.beep()
                        vt.out(vt.lyellow, `+ ${mon.user.pc} bonus`)
                        if (int(mon.pc.bonusStr)) {
                            PC.adjust('str', m * mon.pc.bonusStr, m * mon.pc.bonusStr, m * mon.pc.bonusStr)
                            vt.out(vt.lred, ' strength', bracket(`+${m * mon.pc.bonusStr}`, false))
                        }
                        PC.adjust('str', m)
                        if (int(mon.pc.bonusInt)) {
                            PC.adjust('int', m * mon.pc.bonusInt, m * mon.pc.bonusInt, m * mon.pc.bonusInt)
                            vt.out(vt.lmagenta, ' intellect', bracket(`+${m * mon.pc.bonusInt}`, false))
                        }
                        PC.adjust('int', m)
                        if (int(mon.pc.bonusDex)) {
                            PC.adjust('dex', m * mon.pc.bonusDex, m * mon.pc.bonusDex, m * mon.pc.bonusDex)
                            vt.out(vt.lcyan, ' dexterity', bracket(`+${m * mon.pc.bonusDex}`, false))
                        }
                        PC.adjust('dex', m)
                        if (int(mon.pc.bonusCha)) {
                            PC.adjust('cha', m * mon.pc.bonusCha, m * mon.pc.bonusCha, m * mon.pc.bonusCha)
                            vt.out(vt.lgreen, ' charisma', bracket(`+${m * mon.pc.bonusCha}`, false))
                        }
                        PC.adjust('cha', m)
                        vt.outln('\n', -500)
                        Battle.yourstats(false)
                        vt.outln(-500)
                        DL.moves >>= 1
                    }
                }
                //	activate this monster's avenge?
                if (mon.user.xplevel == 0) {
                    vt.sound('oops')
                    ROOM.monster[n].monster.effect = 'flip'
                    monsters[mon.user.handle].pc = '*'	//	chaos
                    PC.activate(mon)
                    for (let i = 0; i < dice(3); i++) {
                        let avenger = <active>{ monster: { name: '', pc: '' }, user: { id: '' } }
                        Object.assign(avenger.user, mon.user)
                        avenger.user.pc = PC.random('monster')
                        avenger.user.handle += vt.attr(' ', vt.uline, 'avenger', vt.nouline)
                        PC.reroll(avenger.user, avenger.user.pc, int(avenger.user.level / 2))
                        for (let magic in ROOM.monster[n].monster.spells)
                            Magic.add(avenger.user.spells, ROOM.monster[n].monster.spells[magic])
                        for (let poison in ROOM.monster[n].monster.poisons)
                            Poison.add(avenger.user.poisons, ROOM.monster[n].monster.poisons[poison])
                        avenger.user.steal = 2
                        PC.activate(avenger)
                        avenger.str = 99
                        avenger.int = 99
                        avenger.dex = 99
                        avenger.cha = 99
                        Object.assign(avenger.monster, monsters[mon.user.handle])
                        avenger.monster.pc = avenger.user.pc
                        ROOM.monster.push(avenger)
                    }
                }
                ROOM.monster.splice(n, 1)
                pause = true
            }
            else {
                //	retreated from a harmless creature, good
                if (ROOM.monster[n].user.xplevel == 0) {
                    vt.sound('heal', 3)
                    let ha = $.player.magic > 2 ? int($.player.level / 16) + 13 : 16
                    let hr = 0
                    for (let i = 0; i < $.player.level; i++)
                        hr += dice(ha)
                    $.online.hp += hr
                    if ($.online.hp > $.player.hp)
                        $.online.hp = $.player.hp
                }
                else if (ROOM.monster[n].user.xplevel < 0)
                    ROOM.monster.splice(n, 1)	//	remove an illusion
            }
        }

        if (!ROOM.monster.length) {
            if ((!DL.map || DL.map == 'map') && dice((15 - $.online.cha / 10) / 2) == 1) {
                let m = <MAP>['', 'map', 'magic map'][(dice(Z / 33 + 2) > 1 ? 1 : 2)]
                if (DL.map.length < m.length) {
                    DL.map = m
                    vt.sound('click')
                    vt.outln(vt.yellow, vt.bright, 'You find a ', m, '!')
                    pause = true
                }
            }
            //	> 3 monsters
            if (b4 < 0) {
                vt.outln(-100)
                vt.sound('effort')
                vt.outln(vt.green, vt.bright, '+ ', vt.normal, 'bonus charisma', -200)
                PC.adjust('cha', dice(Math.abs(b4)), 1, 1)
                pause = true
            }
            //	the wounded warrior just surviving any mob size
            //	and without a magic map nor any visit to the cleric yet ...
            if ((b4 !== 0 && (!DL.map || DL.map !== 'map') && DL.cleric.sp == DL.cleric.user.sp)
                && ((b4 > 0 && b4 / $.player.hp < 0.67 && $.online.hp / $.player.hp < 0.067)
                    || ($.online.hp <= Z + deep + 1))) {
                vt.outln(-100)
                vt.sound('bravery', 20)
                vt.outln(vt.red, vt.bright, '+ ', vt.normal, 'bonus strength', -600)
                PC.adjust('str', deep + 2, deep + 1, 1)
                DL.map = `Marauder's map`
                vt.outln(vt.bright, vt.yellow, ' and ', DL.map, '!', -600)
                pause = true
            }
        }

        if (Battle.teleported) {
            Battle.teleported = false
            if (Battle.expel) {
                Battle.expel = false
                PC.portrait($.online, 'flipOutX')
                if (deep > 0)
                    deep--
                else {
                    scroll(1, false, true)
                    fini()
                    return
                }
                generateLevel()
            }
            else {
                PC.portrait($.online, 'lightSpeedOut', ` - Dungeon ${romanize(deep + 1)}.${Z + 1}`)
                Y = dice(DL.rooms.length) - 1
                X = dice(DL.width) - 1
            }
            menu()
            return
        }

        if (Battle.retreat) PC.portrait($.online, 'heartBeat', ` - Dungeon ${romanize(deep + 1)}.${Z + 1}`)

        let d = ['N', 'S', 'E', 'W']
        while (Battle.retreat && !$.reason) {
            vt.music('pulse')
            vt.out(-375, vt.bright, vt.red, 'You frantically look to escape . . . ', -375)

            let i = dice(d.length) - 1
            switch (d[i]) {
                case 'N':
                    if (Y > 0 && DL.rooms[Y][X].type !== 'w-e')
                        if (DL.rooms[Y - 1][X].type !== 'w-e') {
                            Battle.retreat = false
                            Y--
                            looked = false
                            vt.animated('fadeOutUp')
                            break
                        }
                    oof('north')
                    break

                case 'S':
                    if (Y < DL.rooms.length - 1 && DL.rooms[Y][X].type !== 'w-e')
                        if (DL.rooms[Y + 1][X].type !== 'w-e') {
                            Battle.retreat = false
                            Y++
                            looked = false
                            vt.animated('fadeOutDown')
                            break
                        }
                    oof('south')
                    break

                case 'E':
                    if (X < DL.width - 1 && DL.rooms[Y][X].type !== 'n-s')
                        if (DL.rooms[Y][X + 1].type !== 'n-s') {
                            Battle.retreat = false
                            X++
                            looked = false
                            vt.animated('fadeOutRight')
                            break
                        }
                    oof('east')
                    break

                case 'W':
                    if (X > 0 && DL.rooms[Y][X].type !== 'n-s')
                        if (DL.rooms[Y][X - 1].type !== 'n-s') {
                            Battle.retreat = false
                            X--
                            looked = false
                            vt.animated('fadeOutLeft')
                            break
                        }
                    oof('west')
                    break
            }
            d.splice(i, 1)
            pause = true
        }

        menu()
    }

    function drawHero(peek = false) {
        vt.save()

        ROOM = DL.rooms[Y][X]
        if (!DL.map || peek) {
            if (Y > 0 && DL.rooms[Y][X].type !== 'w-e')
                if (DL.rooms[Y - 1][X].type !== 'w-e')
                    drawRoom(Y - 1, X, false, peek)
            if (Y < DL.rooms.length - 1 && DL.rooms[Y][X].type !== 'w-e')
                if (DL.rooms[Y + 1][X].type !== 'w-e')
                    drawRoom(Y + 1, X, false, peek)
            if (X < DL.width - 1 && DL.rooms[Y][X].type !== 'n-s')
                if (DL.rooms[Y][X + 1].type !== 'n-s')
                    drawRoom(Y, X + 1, false, peek)
            if (X > 0 && DL.rooms[Y][X].type !== 'n-s')
                if (DL.rooms[Y][X - 1].type !== 'n-s')
                    drawRoom(Y, X - 1, false, peek)
        }
        if (!DL.map) drawRoom(Y, X, false, peek)

        vt.plot(Y * 2 + 2, X * 6 + 2)
        if ($.online.hp > 0) {
            if ($.player.emulation == 'XT')
                vt.out($.player.blessed ? vt.Cyan : $.player.cursed ? vt.lBlue : vt.lBlack
                    , ' '
                    , ($.player.toWC + $.online.toWC) > 0 ? vt.attr(vt.bright, vt.cyan)
                        : ($.player.toWC + $.online.toWC) < 0 ? vt.attr(vt.bright, vt.magenta)
                            : vt.cyan
                    , $.online.weapon.wc ? '⚸' : ' '
                    , $.player.blessed ? vt.bright : vt.normal
                    , $.online.hp > $.player.hp * 2 / 3 ? vt.white : $.online.hp > $.player.hp / 3 ? vt.yellow : vt.red
                    , PC.card($.player.pc).unicode
                    , ($.player.toAC + $.online.toAC) > 0 ? vt.attr(vt.normal, vt.bright)
                        : ($.player.toAC + $.online.toAC) < 0 ? vt.attr(vt.normal, vt.faint)
                            : vt.normal, vt.yellow
                    , $.online.armor.ac ? '⛨' : ' '
                    , ' ')
            else
                vt.out($.player.blessed ? vt.bright : $.player.cursed ? vt.faint : vt.off
                    , vt.reverse, '-YOU-')
        }
        else
            vt.out(vt.Blue, vt.cyan, vt.bright, vt.reverse
                , `  ${$.player.emulation == 'XT' ? PC.card($.player.pc).unicode : 'X'}  `, -600)

        vt.restore()
        vt.out(vt.off)
    }

    function eraseHero(peek = false) {
        vt.out(vt.reset)
        vt.save()
        ROOM = DL.rooms[Y][X]
        if (!DL.map || peek) {
            if (Y > 0 && DL.rooms[Y][X].type !== 'w-e')
                if (DL.rooms[Y - 1][X].type !== 'w-e')
                    drawRoom(Y - 1, X, false)
            if (Y < DL.rooms.length - 1 && DL.rooms[Y][X].type !== 'w-e')
                if (DL.rooms[Y + 1][X].type !== 'w-e')
                    drawRoom(Y + 1, X, false)
            if (X < DL.width - 1 && DL.rooms[Y][X].type !== 'n-s')
                if (DL.rooms[Y][X + 1].type !== 'n-s')
                    drawRoom(Y, X + 1, false)
            if (X > 0 && DL.rooms[Y][X].type !== 'n-s')
                if (DL.rooms[Y][X - 1].type !== 'n-s')
                    drawRoom(Y, X - 1, false)
        }
        vt.restore()

        drawRoom(Y, X)
    }

    function drawLevel() {
        let y: number, x: number, m: number

        vt.cls()

        if (DL.map) {
            for (y = 0; y < paper.length; y++) {
                if (y % 2) {
                    for (x = 0; x < DL.width; x++) {
                        if ($.player.emulation == 'VT') vt.out('\x1B(0', vt.faint, paper[y].substr(6 * x, 1), '\x1B(B')
                        else vt.out(vt.black, vt.bright, paper[y].substr(6 * x, 1))

                        let r = int(y / 2)
                        occupying(DL.rooms[r][x], vt.attr(vt.reset, vt.faint)
                            , (DL.map && DL.map !== 'map')
                            || (DL.rooms[r][x].map && Math.abs(Y - r) < int($.online.int / 15) && Math.abs(X - x) < int($.online.int / 15))
                            , DL.map == `Marauder's map` || (Ring.power([], $.player.rings, 'identify').power > 0))
                    }
                    if ($.player.emulation == 'VT') vt.out('\x1B(0', vt.faint, paper[y].substr(-1), '\x1B(B')
                    else vt.out(vt.black, vt.bright, paper[y].substr(-1))
                }
                else {
                    if ($.player.emulation == 'VT') vt.out('\x1B(0', vt.faint, paper[y], '\x1B(B')
                    else vt.out(vt.black, vt.bright, paper[y])
                }
                vt.outln()
            }
        }
        else {
            for (y = 0; y < DL.rooms.length; y++)
                for (x = 0; x < DL.width; x++)
                    if (DL.rooms[y][x].map)
                        drawRoom(y, x, false)
        }

        vt.plot(paper.length + 1, 1)
        if ($.online.hp > 0) scroll(paper.length + 1, false)
        refresh = false
    }

    function drawRoom(r: number, c: number, keep = true, peek = false) {
        if (keep) vt.save()
        ROOM = DL.rooms[r][c]
        if (peek && !ROOM.map)
            if ($.online.int > 49)
                ROOM.map = true

        let row = r * 2, col = c * 6
        if (!DL.map) {
            vt.plot(row + 1, col + 1)
            if ($.player.emulation == 'VT') vt.out('\x1B(0', vt.faint, paper[row].substr(col, 7), '\x1B(B')
            else vt.out(vt.black, vt.bright, paper[row].substr(col, 7))
        }

        row++
        vt.plot(row + 1, col + 1)
        if ($.player.emulation == 'VT') vt.out('\x1B(0', vt.faint, paper[row].substr(col, 1), '\x1B(B')
        else vt.out(vt.black, vt.bright, paper[row].substr(col, 1))

        occupying(ROOM, peek ? vt.attr(vt.reset) : vt.attr(vt.reset, vt.faint), (DL.map && DL.map !== 'map')
            || (ROOM.map && Math.abs(Y - r) < int($.online.int / 15) && Math.abs(X - c) < int($.online.int / 15)),
            peek || DL.map == `Marauder's map` || (Ring.power([], $.player.rings, 'identify').power > 0))

        if ($.player.emulation == 'VT') vt.out('\x1B(0', vt.faint, paper[row].substr(col + 6, 1), '\x1B(B')
        else vt.out(vt.black, vt.bright, paper[row].substr(col + 6, 1))

        if (!DL.map) {
            row++
            vt.plot(row + 1, col + 1)
            if ($.player.emulation == 'VT') vt.out('\x1B(0', vt.faint, paper[row].substr(col, 7), '\x1B(B')
            else vt.out(vt.black, vt.bright, paper[row].substr(col, 7))
        }
        if (keep) vt.restore()
    }

    function generateLevel() {

        vt.title(`${$.player.handle}: level ${$.player.level} ${$.player.pc} - Dungeon ${romanize(deep + 1)}.${Z + 1}`)
        vt.action('clear')

        looked = false
        refresh = true

        if (!dd[deep])
            dd[deep] = new Array($.sysop.level)

        //  re-entry?
        if (dd[deep][Z]) {
            DL = dd[deep][Z]
            renderMap()

            do {
                Y = dice(DL.rooms.length) - 1
                X = dice(DL.width) - 1
                ROOM = DL.rooms[Y][X]
            } while (ROOM.type) //  teleport into a chamber only

            DL.alert = true
            DL.exit = false
            DL.events++
            DL.moves = DL.moves > DL.rooms.length * DL.width
                ? DL.rooms.length * DL.width
                : DL.moves > DL.width
                    ? DL.moves - DL.width
                    : 1
            recovery()
            return
        }

        if (deep > hideep) hideep = deep
        if (Z > hiZ) hiZ = Z

        let y: number, x: number
        let result: boolean
        do {
            //  size level
            let maxRow = 6 + dice(Z / 32 + 1)
            while (maxRow < 10 && dice($.online.cha / 10) == 1)
                maxRow++
            let maxCol = 6 + dice(Z / 16 + 1)
            while (maxCol < 13 && dice($.online.cha / 10) == 1)
                maxCol++

            //  template level
            dd[deep][Z] = <ddd>{
                alert: true,
                cleric: {
                    user: {
                        id: '_Clr', handle: 'old cleric', pc: 'Cleric', level: int(65 + Z / 4 + deep)
                        , sex: 'I', weapon: 0, armor: 1, magic: 3, spells: [7, 8, 13]
                    }
                },
                events: dice(6 - int($.online.cha / 20)) + dice(deep / 3 + 1) + int($.player.coward)
                    - +$.player.novice - int($.access.sysop),
                exit: false,
                map: '',
                mob: (deep < 4 && Z < 4) ? 1 : (Z > 9 && Z < 50) || (deep > 7) ? 3 : 2,
                moves: -maxCol - (($.player.novice || $.access.sysop) ? maxRow + maxCol : $.player.wins),
                rooms: new Array(maxRow),
                spawn: int(deep / 3 + Z / 9 + maxRow / 3) + dice(Math.round($.online.cha / 20) + 1) + 3,
                width: maxCol
            }

            //  allocate level
            DL = dd[deep][Z]
            for (y = 0; y < maxRow; y++) {
                DL.rooms[y] = new Array(maxCol)
                for (x = 0; x < maxCol; x++)
                    DL.rooms[y][x] = <room>{ map: true, monster: [], occupant: '', type: '' }
            }

            //  shape level
            for (y = 0; y < maxRow; y++) {
                for (x = 0; x < maxCol; x++) {
                    let n: number
                    ROOM = DL.rooms[y][x]
                    while ((n = int((dice(4) + dice(4)) / 2) - 1) == 3);
                    if (n == 1 && dice(10 - deep) == n) n += 2 - dice(3)
                    ROOM.type = (n == 0) ? 'cavern' : (n == 1) ? '' : dice(2) == 1 ? 'n-s' : 'w-e'
                    ROOM.size = (!ROOM.type ? 2 : ROOM.type == 'cavern' ? 3 : 1)
                }
            }

            //  validate level
            result = false
            spider(0, 0)
            for (y = 0; y < maxRow; y++)
                for (x = 0; x < maxCol; x++)
                    if (DL.rooms[y][x].map)
                        result = true

        } while (result)

        PC.reroll(DL.cleric.user, DL.cleric.user.pc, DL.cleric.user.level)
        PC.activate(DL.cleric)
        vt.wall($.player.handle, `enters dungeon level ${romanize(deep + 1)}.${Z + 1}`)

        renderMap()
        do {
            Y = dice(DL.rooms.length) - 1
            X = dice(DL.width) - 1
            ROOM = DL.rooms[Y][X]
        } while (ROOM.type)

        //	populate this new floor with monsters ...
        let n = int(DL.rooms.length * DL.width / 6) + dice(Z / 9) + dice(deep)
            + dice(Z < 50 && $.online.cha < 80 ? ((80 - $.online.cha) / 9) : ((100 - $.online.cha) / 3))
        while (n)
            if (putMonster())
                n--
        //  ... and let's be nicer to the hero entering a new level
        if (ROOM.monster.length > 1)
            ROOM.monster.splice(1, ROOM.monster.length - 1)

        let wow = 1
        let dank = deep + 1, level = Z + 1
        //	potential bonus(es) for the more experienced adventurer
        if (!$.player.novice) {
            //	dwarven merchant
            if (dice($.online.str - dank) <= dank) {
                y = dice(DL.rooms.length) - 1
                x = dice(DL.width) - 1
                DL.rooms[y][x].occupant = 'dwarf'
            }
            //	wheel of life
            if (dice(100 - level + dank) <= dank) {
                y = dice(DL.rooms.length) - 1
                x = dice(DL.width) - 1
                DL.rooms[y][x].occupant = 'wheel'
            }
            //	wishing well
            if (well && dice((120 - level) / 3 - dank) == 1) {
                y = dice(DL.rooms.length) - 1
                x = dice(DL.width) - 1
                DL.rooms[y][x].occupant = 'well'
            }
            //	wicked old witch
            if ($.sorceress && Z > 20 && dank > 4 && dice((120 - level) / 3 - dank) == 1) {
                y = dice(DL.rooms.length) - 1
                x = dice(DL.width) - 1
                DL.rooms[y][x].occupant = 'witch'
            }
            //	deep dank dungeon portal
            if (deep < 9 && deep < $.player.immortal && Z / 9 < $.player.immortal) {
                y = dice(DL.rooms.length) - 1
                x = dice(DL.width) - 1
                DL.rooms[y][x].occupant = 'portal'
            }
        }
        //	thief(s) in other spaces
        if (!$.player.novice && dice(100 / dank * level) <= dank)
            wow = int(dice(DL.rooms.length) * dice(DL.width) / 2)
        if (!$.player.coward) wow--
        n = dice(deep / 4) + wow
        for (let i = 0; i < n; i++) {
            do {
                y = dice(DL.rooms.length) - 1
                x = dice(DL.width) - 1
            } while (DL.rooms[y][x].type == 'cavern')
            DL.rooms[y][x].occupant = 'thief'
        }

        //	a cleric in another space
        do {
            y = dice(DL.rooms.length) - 1
            x = dice(DL.width) - 1
        } while (DL.rooms[y][x].type == 'cavern' || DL.rooms[y][x].monster.length || DL.rooms[y][x].occupant)
        DL.rooms[y][x].occupant = 'cleric'

        //	a wizard in another space
        do {
            y = dice(DL.rooms.length) - 1
            x = dice(DL.width) - 1
        } while (DL.rooms[y][x].type == 'cavern' || DL.rooms[y][x].monster.length || DL.rooms[y][x].occupant)
        DL.rooms[y][x].occupant = 'wizard'

        //	set some trapdoors
        n = int(DL.rooms.length * DL.width / 10)
        if (dice(100 - Z) > (deep + 1))
            n += dice(Z / 16 + 2)
        while (n--) {
            y = dice(DL.rooms.length) - 1
            x = dice(DL.width) - 1
            if (!DL.rooms[y][x].occupant)
                DL.rooms[y][x].occupant = 'trapdoor'
        }

        //	help will always be given at Hogwarts to those who deserve it
        if (!$.player.coward)
            if ($.player.novice || dice($.player.wins * dank + $.player.immortal + 1) >= (dank + level)) {
                y = dice(DL.rooms.length) - 1
                x = dice(DL.width) - 1
                DL.rooms[y][x].giftItem = 'map'
                DL.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '⎅' : Dot
            }

        //	populate treasure(s)
        wow = 1
        if (!$.player.novice && !$.player.coward)
            if (dice(100 / dank * level) <= dank)
                wow += int(dice(DL.rooms.length) * dice(DL.width) / 2)
        wow += dice(level / 33) + dice(dank / 3) - 2

        //  generate a roulette wheel of specials
        let gift: GIFT[] = ['map', 'chest', 'armor']
        for (let j = 5; j > 0; j--) {
            gift.push('poison')
            gift.push(j % 2 ? 'map' : 'chest')
            //  relative to might & magic needs
            gift.push(j > $.player.melee ? 'weapon' : 'armor')
            gift.push(dice(level + 11 * ($.player.magic + j)) > ($.sysop.level - dank - j)
                ? 'ring' : $.player.magic > 2 ? (j > $.player.melee ? 'armor' : 'chest')
                    : dice(10 + dank - 2 * $.player.magic) > dank
                        ? 'magic' : 'xmagic')
        }
        gift.push('weapon', 'chest', 'map')
        if ($.access.sysop) gift.push('ring')

        for (let i = 0; i < wow && gift.length; i++) {
            do {
                y = dice(DL.rooms.length) - 1
                x = dice(DL.width) - 1
            } while (DL.rooms[y][x].giftItem || DL.rooms[y][x].occupant == 'wizard')
            if (Ring.power([], $.player.rings, 'identify').power) DL.rooms[y][x].map = true

            //	magic potion
            if (dice(111 - $.online.cha) > dice(dank) - int($.player.coward)) {
                DL.rooms[y][x].giftItem = 'potion'
                DL.rooms[y][x].giftID = false
                DL.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '≬' : Dot
                n = dice(130 - deep)
                for (let j = 0; j < 16 && n > 0; j++) {
                    let v = 15 - j
                    DL.rooms[y][x].giftValue = v
                    if ($.player.magic < 2 && (v == 10 || v == 11))
                        DL.rooms[y][x].giftValue = (v == 11) ? 9 : 0
                    n -= j + 1
                }
                continue
            }

            //	what else ya got?
            v = dice(gift.length) - 1
            DL.rooms[y][x].giftItem = gift.splice(v, 1)[0]
            DL.rooms[y][x].giftValue = 0
            v = 0

            switch (DL.rooms[y][x].giftItem) {
                case 'armor':
                    DL.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '⛨' : Dot
                    n = Armor.special.length - 1
                    for (v = 0; v < n && $.online.armor.ac >= Armor.name[Armor.special[v]].ac; v++);
                    break

                case 'chest':
                    DL.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '⌂' : Dot
                    v = dice(8 + 2 * (deep + $.player.steal)) - 1
                    break

                case 'magic':
                    DL.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '∗' : Dot
                    n = dice(Magic.merchant.length * 16)
                    for (let j = 0; j < Magic.merchant.length && n > 0; j++) {
                        v = Magic.merchant.length - j
                        n -= j + 1
                    }
                    break

                case 'map':
                    DL.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '⎅' : Dot
                    v = 1
                    break

                case 'poison':
                    DL.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '⏽' : Dot
                    n = dice(Poison.merchant.length * 16)
                    for (let j = 0; j < Poison.merchant.length && n > 0; j++) {
                        v = Poison.merchant.length - j
                        n -= j + 1
                    }
                    break

                case 'ring':
                    if (Ring.have($.player.rings, Ring.theOne)) DL.rooms[y][x].map = true
                    DL.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '⍤' : Dot
                    if (dice(6 - int(dank / 2)) > 1) {
                        let ring = Ring.common[dice(Ring.common.length) - 1]
                        DL.rooms[y][x].giftValue = ring
                    }
                    else {
                        let ring = Ring.unique[dice(Ring.unique.length) - 1]
                        DL.rooms[y][x].giftValue = ring
                    }
                    break

                case 'weapon':
                    DL.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '⚸' : Dot
                    n = Weapon.special.length - 1
                    for (v = 0; v < n && $.online.weapon.wc >= Weapon.name[Weapon.special[v]].wc; v++);
                    break

                case 'xmagic':
                    DL.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '⋇' : Dot
                    v = Magic.merchant.length + dice(Magic.special.length)
                    break

            }
            if (v) DL.rooms[y][x].giftValue = v
        }

        function spider(r: number, c: number) {
            DL.rooms[r][c].map = false
            if (c + 1 < DL.width)
                if (DL.rooms[r][c + 1].map && DL.rooms[r][c].type !== 'n-s' && DL.rooms[r][c + 1].type !== 'n-s')
                    spider(r, c + 1)
            if (r + 1 < DL.rooms.length)
                if (DL.rooms[r + 1][c].map && DL.rooms[r][c].type !== 'w-e' && DL.rooms[r + 1][c].type !== 'w-e')
                    spider(r + 1, c)
            if (c > 0)
                if (DL.rooms[r][c - 1].map && DL.rooms[r][c].type !== 'n-s' && DL.rooms[r][c - 1].type !== 'n-s')
                    spider(r, c - 1)
            if (r > 0)
                if (DL.rooms[r - 1][c].map && DL.rooms[r][c].type !== 'w-e' && DL.rooms[r - 1][c].type !== 'w-e')
                    spider(r - 1, c)
        }

        function renderMap() {
            let min = vt.checkTime()
            if (Z == 99 || Z - $.player.level > 8) {
                tl = min
                vt.music('tension' + dice(3))
            }
            else if (tl - min > 4) {
                tl = min
                vt.music((deep % 2 ? 'ddd' : 'dungeon') + dice(9))
            }

            const box = vt.Draw
            let r: number, c: number
            paper = new Array(2 * DL.rooms.length + 1)

            //	draw level borders on an empty sheet of paper
            paper[0] = '\x00' + box[0].repeat(6 * DL.width - 1) + '\x00'
            for (r = 1; r < 2 * DL.rooms.length; r++)
                paper[r] = box[10] + ' '.repeat(6 * DL.width - 1) + box[10]
            paper[paper.length - 1] = '\x00' + box[0].repeat(6 * DL.width - 1) + '\x00'

            //	crawl each room to construct walls
            for (r = 0; r < DL.rooms.length; r++) {
                for (c = 0; c < DL.width; c++) {
                    ROOM = DL.rooms[r][c]
                    let row = r * 2, col = c * 6

                    //	north-south corridor
                    if (ROOM.type == 'n-s') {
                        if (paper[row][col] == ' ')
                            paper[row] = replaceAt(paper[row], col, box[10])
                        else
                            if (paper[row][col] == box[3])
                                paper[row] = replaceAt(paper[row], col, box[6])
                            else
                                if (paper[row][col] == box[2])
                                    paper[row] = replaceAt(paper[row], col, box[5])
                                else
                                    if (paper[row][col] == box[1])
                                        paper[row] = replaceAt(paper[row], col, box[4])
                                    else
                                        if (paper[row][col] == box[0])
                                            paper[row] = replaceAt(paper[row], col, box[
                                                col > 0 && paper[row][col - 1] == ' ' ? 7
                                                    : paper[row][col + 1] == ' ' ? 9 : 8])

                        row++
                        paper[row] = replaceAt(paper[row], col, box[10])

                        row++
                        if (paper[row][col] == ' ')
                            paper[row] = replaceAt(paper[row], col, box[10])
                        else
                            if (paper[row][col] == box[0])
                                paper[row] = replaceAt(paper[row], col, box[
                                    col > 0 && paper[row][col - 1] == ' ' ? 1
                                        : paper[row][col + 1] == ' ' ? 3 : 2])

                        row = r * 2
                        col += 6

                        if (paper[row][col] == ' ')
                            paper[row] = replaceAt(paper[row], col, box[10])
                        else
                            if (paper[row][col] == box[0])
                                paper[row] = replaceAt(paper[row], col, box[
                                    paper[row][col - 1] == ' ' ? 7
                                        : paper[row][col + 1] == ' ' ? 9 : 8])
                            else
                                if (paper[row][col] == box[1])
                                    paper[row] = replaceAt(paper[row], col, box[4])
                                else
                                    if (paper[row][col] == box[2])
                                        paper[row] = replaceAt(paper[row], col, box[5])
                                    else
                                        if (paper[row][col] == box[3])
                                            paper[row] = replaceAt(paper[row], col, box[6])

                        row++
                        paper[row] = replaceAt(paper[row], col, box[10])

                        row++
                        paper[row] = replaceAt(paper[row], col, box[
                            row < 2 * DL.rooms.length ? 10 : 2])
                    }

                    //	west-east corridor
                    if (ROOM.type == 'w-e') {
                        if (paper[row][col] == ' ')
                            paper[row] = replaceAt(paper[row], col, box[0])
                        else
                            if (paper[row][col] == box[3])
                                paper[row] = replaceAt(paper[row], col, box[2])
                            else
                                if (paper[row][col] == box[6])
                                    paper[row] = replaceAt(paper[row], col, box[5])
                                else
                                    if (paper[row][col] == box[9])
                                        paper[row] = replaceAt(paper[row], col, box[8])
                                    else
                                        if (paper[row][col] == box[10])
                                            paper[row] = replaceAt(paper[row], col, box[
                                                row > 0 && paper[row - 1][col] == ' ' ? 7
                                                    : paper[row + 1][col] == ' ' ? 1 : 4])

                        col++
                        paper[row] = replaceAt(paper[row], col, box[0].repeat(5))
                        col += 5

                        if (paper[row][col] == ' ')
                            paper[row] = replaceAt(paper[row], col, box[0])
                        else
                            if (paper[row][col] == box[1])
                                paper[row] = replaceAt(paper[row], col, box[2])
                            else
                                if (paper[row][col] == box[10])
                                    paper[row] = replaceAt(paper[row], col, box[
                                        paper[row + 1][col] == box[10] ? 6 : 3])

                        row += 2
                        col = c * 6
                        if (paper[row][col] == box[10])
                            paper[row] = replaceAt(paper[row], col, box[
                                col > 0 && paper[row][col - 1] == ' ' ? 1 : 4])
                        else
                            if (paper[row][col] == ' ')
                                paper[row] = replaceAt(paper[row], col, box[0])

                        col++
                        paper[row] = replaceAt(paper[row], col, box[0].repeat(5))
                        col += 5

                        if (paper[row][col] == ' ')
                            paper[row] = replaceAt(paper[row], col, box[0])
                        else
                            if (paper[row][col] == box[10])
                                paper[row] = replaceAt(paper[row], col, box[
                                    paper[row + 1][col] == box[10] ? 6 : 3])
                    }
                }
            }
            r = 2 * DL.rooms.length
            c = 6 * DL.width
            paper[0] = replaceAt(paper[0], 0, box[7])
            paper[0] = replaceAt(paper[0], c, box[9])
            paper[r] = replaceAt(paper[r], 0, box[1])
            paper[r] = replaceAt(paper[r], c, box[3])

            function replaceAt(target: string, offset: number, data: string): string {
                return target.substr(0, offset) + data + target.substr(offset + data.length)
            }
        }
    }

    //	generate a monster: relative to this dungeon level or as fodder
    function genMonster(dm: monster, m: active, capacity = 0, level = 0) {

        let n: number
        if (!level) {
            for (n = 0; n < 4; n++) level += dice(7)

            switch (level >> 2) {
                case 1:
                    level = dice(Z / 2)
                    break
                case 2:
                    level = Z - 3 - dice(3)
                    break
                case 3:
                    level = Z - dice(3)
                    break
                case 4:
                    level = Z
                    break
                case 5:
                    level = Z + dice(3)
                    break
                case 6:
                    level = Z + 3 + dice(3)
                    break
                case 7:
                    level = Z + dice(Z < 40 ? Z / 2 : Z < 60 ? Z / 3 : Z < 80 ? Z / 4 : Z / 5)
                    break
            }
        }

        while (level < 1) level += dice(4) + dice(3) - 1
        if (level > 99) level = 100 - dice(10)

        let v = 1
        if (level > 9 && level < 90) {
            v = dice(12)
            v = v == 12 ? 2 : v > 1 ? 1 : 0
        }
        n = level + v - 1

        m.user.handle = Object.keys(monsters)[n]
        Object.assign(dm, monsters[m.user.handle])
        dm.level = 0
        dm.size = monsters[m.user.handle].size || 1
        if (capacity && dm.size > capacity)
            return

        dm.level = level
        if (dm.pc == '*') {		//	chaos
            dm.pc = PC.random('monster')
            m.user.handle += ' avenger'
            m.user.steal = $.player.steal + 1
        }
        m.monster = dm
        m.effect = dm.effect || 'pulse'
        PC.reroll(m.user, dm.pc ? dm.pc : $.player.pc, n)
        if (m.user.xplevel) m.user.xplevel = level
        if (!dm.pc) m.user.steal = $.player.steal + 1

        if (dm.weapon)
            m.user.weapon = dm.weapon
        else {
            m.user.weapon = int((level + deep) / 100 * int($.sysop.weapon))
            m.user.weapon = int((m.user.weapon + $.online.weapon.wc) / 2)
            if ($.player.level <= Z
                && dice(12 + deep / 2 + $.player.level / 4 - $.online.cha / 10) <= dice(deep / 3 + 1)) {
                n = $.online.weapon.wc + dice(3) - 2
                n = n < 1 ? 1 : n >= Weapon.merchant.length ? Weapon.merchant.length - 1 : n
                m.user.weapon = Weapon.merchant[n]
            }
        }

        if (dm.armor)
            m.user.armor = dm.armor
        else {
            m.user.armor = int((level + deep) / 100 * int($.sysop.armor))
            m.user.armor = int((m.user.armor + $.online.armor.ac) / 2)
            if ($.player.level <= Z
                && dice(11 + deep / 3 + $.player.level / 3 - $.online.cha / 11) <= dice(deep / 3 + 1)) {
                n = $.online.armor.ac + dice(3) - 2
                n = n < 1 ? 1 : n >= Armor.merchant.length ? Armor.merchant.length - 1 : n
                m.user.armor = Armor.merchant[n]
            }
        }

        m.user.hp = int(m.user.hp / (4 + (m.user.level / 100)) + (deep * Z / 4))
        n = 5 - dice(deep / 3)
        m.user.sp = int(m.user.sp / n)

        m.user.poisons = []
        if (m.user.poison) {
            if (dm.poisons)
                for (let vials in dm.poisons)
                    Poison.add(m.user.poisons, dm.poisons[vials])
            for (n = 0; n < Object.keys(Poison.vials).length - (9 - deep); n++) {
                if (dice(int($.player.cha / (deep + 1)) + (n << 2)) < (int($.player.coward) + 2)) {
                    let vial = Poison.pick(n)
                    if (!Poison.have(m.user.poisons, vial))
                        Poison.add(m.user.poisons, n)
                }
            }
        }

        m.user.rings = dm.rings || []

        m.user.spells = []
        if (m.user.magic) {
            if (dm.spells)
                for (let magic in dm.spells)
                    Magic.add(m.user.spells, dm.spells[magic])
            for (n = 0; n < Object.keys(Magic.spells).length - (9 - deep); n++) {
                if (dice(int($.player.cha / (deep + 1)) + (n << 2)) < (+$.player.coward + 2)) {
                    let spell = Magic.pick(n)
                    if (!Magic.have(m.user.spells, spell))
                        Magic.add(m.user.spells, n)
                }
            }
        }
    }

    function putMonster(r = -1, c = -1): boolean {
        let respawn: boolean
        let room: room
        if (r < 0 && c < 0) {
            respawn = true
            do {
                r = dice(DL.rooms.length) - 1
                c = dice(DL.width) - 1
                room = DL.rooms[r][c]
            } while (room.monster.length >= DL.mob)
        }
        else {
            respawn = false
            room = DL.rooms[r][c]
            if (room.monster.length >= DL.mob)
                return false
        }

        let i: number
        let j: number
        for (i = 0, j = 0; i < room.monster.length; i++)
            j += room.monster[i].monster.size || 1
        if (j >= room.size)
            return false

        let dm: monster = { name: '', pc: '' }
        let m: active = { monster: { name: '', pc: '' }, user: { id: '', sex: 'I' } }
        let level = 0
        let sum = 0

        genMonster(dm, m, room.size - j)
        if (!dm.level) {
            if (respawn) return false
            //  regular capacity exceeded, let's squeeze in a lesser stray
            level = dice(Z / DL.mob) + (Z <= 60 ? int(Z / 6) : 30) + dice(deep) - 1
            genMonster(dm, m, 0, level)
            if (room.monster.length) sum = room.monster[0].user.level
        }

        do {
            //	add the monster, including any lower "strays" as fodder
            i = room.monster.push(m) - 1
            m = room.monster[i]
            level = m.user.level
            sum += level
            PC.activate(m)

            m.user.immortal = deep
            m.adept = dice(Z / 30 + deep / 4 + 1) - 1
            PC.adjust('str', deep - 2, 0, deep >> 2, m)
            PC.adjust('int', deep - 2, 0, deep >> 2, m)
            PC.adjust('dex', deep - 2, 0, deep >> 2, m)
            PC.adjust('cha', deep - 2, 0, deep >> 2, m)

            let gold = new Coin(int(money(level) / (11 - deep)))
            gold.value += tradein(new Coin(m.weapon.value).value, dice($.online.cha / 5) + dice(deep) - int($.player.coward))
            gold.value += tradein(new Coin(m.armor.value).value, dice($.online.cha / 5) + dice(deep) - int($.player.coward))
            gold.value *= dice(deep * 2 / 3)
            gold.value++
            m.user.coin = new Coin(gold.carry(1, true))

            if (+m.user.weapon) {
                if (dm.hit) m.weapon.hit = dm.hit
                if (dm.smash) m.weapon.smash = dm.smash
            }

            //  prep next should this event be spawning a lesser mob
            level += dice(room.monster.length + 2) - (room.monster.length + 1)
            dm = { name: '', pc: '' }
            m = { monster: { name: '', pc: '' }, user: { id: '', sex: 'I' } }
            genMonster(dm, m, 0, level)
        } while (room.monster.length < int(3 + DL.mob + deep / 3) && sum < (Z - 3 - room.monster.length))

        return true
    }

    function merchant() {
        scroll(1, false)
        let dwarf = <active>{ user: { id: '' } }
        Object.assign(dwarf.user, $.dwarf.user)
        PC.activate(dwarf)
        vt.outln(vt.yellow, PC.who(dwarf).He, 'scowls in disgust, '
            , vt.bright, `"Never trust${an($.player.pc)}!"`)
        PC.wearing(dwarf)
        vt.sound('ddd', 20)
        Battle.engage('Merchant', party, dwarf, doSpoils)
    }

    function witch() {
        let witch = <active>{ user: { id: '' } }
        Object.assign(witch.user, $.witch.user)
        PC.activate(witch)
        vt.outln()
        vt.outln(vt.green, PC.who(witch).His, 'disdained look sends a chill down your back.', -1200)
        vt.outln(vt.green, vt.bright, `"Puny ${$.player.pc} -- you earned my wrath!"`)
        vt.sound('god', 28)
        vt.music('boss' + dice(3))
        Battle.engage('Witch', party, witch, doSpoils)
    }

    //  old cleric mana recovery
    function recovery(factor = DL.cleric.user.level) {
        if (!DL.cleric.user.status) {
            DL.cleric.sp += int(Magic.power(DL.cleric, 7) * DL.cleric.user.level / factor)
            if (DL.cleric.sp > DL.cleric.user.sp) DL.cleric.sp = DL.cleric.user.sp
        }
    }

    function teleport() {
        let min = vt.checkTime()

        vt.action('teleport')
        vt.outln(vt.yellow, vt.bright, 'What do you wish to do?')
        vt.out(bracket('U'), 'Teleport up 1 level')
        if (Z < 99) vt.out(bracket('D'), 'Teleport down 1 level')
        vt.out(bracket('O'), `Teleport out of this ${deep ? 'dank' : ''} dungeon`)
        vt.out(bracket('R'), 'Random teleport')
        vt.out(vt.cyan, '\n\nTime Left: ', vt.bright, vt.white, min.toString(), vt.faint, vt.cyan, ' min.', vt.reset)
        if ($.player.coin.value) vt.out(vt.cyan, '    Coin: ', $.player.coin.carry(4))
        if ($.player.level / 9 - deep > Security.name[$.player.security].protection + 1)
            vt.out(vt.faint, '\nThe feeling of in', vt.normal, vt.uline, 'security', vt.nouline, vt.faint, ' overwhelms you.', vt.reset)

        vt.form = {
            'wizard': {
                cb: () => {
                    if (dice(10 * deep + Z + 5 * $.player.magic + $.online.int + $.online.cha) == 1) {
                        vt.outln(' ... "', vt.bright, vt.cyan, 'Huh?', vt.reset, '"')
                        vt.animated('headShake')
                        vt.sound('miss', 6)
                        vt.animated('rubberBand')
                        vt.sound('lose', 12)
                        vt.music('crack')
                        vt.sleep(1250)
                        vt.animated('bounceOutUp')
                        vt.sleep(1250)
                        let pops = 'UDOR'[dice(4) - 1]
                        if (vt.entry.toUpperCase() == pops) {
                            vt.sound('oops', 6)
                            deep = dice(10) - 1
                            Z += dice(20) - 10
                            Z = Z < 0 ? 0 : Z > 99 ? 99 : Z
                            vt.sound('portal', 12)
                        }
                        else {
                            vt.entry = pops
                            vt.sound('teleport')
                        }
                    }
                    else {
                        vt.outln()
                        vt.sound('teleport')
                    }

                    switch (vt.entry.toUpperCase()) {
                        case 'D':
                            if (Z < 99) {
                                Z++
                                PC.portrait($.online, 'backOutDown')
                                break
                            }
                        case 'R':
                            PC.portrait($.online, 'flipOutY')
                            DL.alert = true
                            DL.events++
                            DL.exit = false
                            break

                        case 'U':
                            if (Z > 0) {
                                DL.events++
                                DL.exit = false
                                Z--
                                PC.portrait($.online, 'backOutUp')
                                break
                            }
                        case 'O':
                            PC.portrait($.online, 'flipOutX')
                            if (deep > 0)
                                deep--
                            else {
                                scroll(1, false, true)
                                fini()
                                return
                            }
                            break
                        default:
                            break
                    }
                    vt.sleep(1400)
                    generateLevel()
                    menu()
                }, cancel: 'O', enter: 'R', eol: false, match: /U|D|O|R/i, timeout: 20
            }
        }
        vt.form['wizard'].prompt = `Teleport #${romanize(deep + 1)}.${Z + 1}: `
        vt.drain()
        vt.focus = 'wizard'
    }

    function quaff(v: number, it = true) {
        if (!(v % 2) && !potions[v].identified) news(`\t${it ? 'quaffed' : 'tossed'}${an(potion[v])}`)
        if (it) {
            if (!potions[v].identified) {
                potions[v].identified = $.online.int > (85 - 4 * $.player.poison)
                vt.out(v % 2 ? vt.red : vt.green, 'It was', vt.bright)
                if ($.player.emulation == 'XT') vt.out(' ', v % 2 ? '🌡️ ' : '🧪')
                vt.outln(an(potion[v]), vt.normal, '.')
            }
            vt.sound('quaff', 5)
            switch (v) {
                //	Potion of Cure Light Wounds
                case 0:
                    $.online.hp += PC.hp() + dice($.player.hp - $.online.hp)
                    vt.sound('yum', 3)
                    break

                //	Vial of Weakness
                case 1:
                    PC.adjust('str', -dice(10), -PC.card($.player.pc).toStr)
                    break

                //	Potion of Charm
                case 2:
                    PC.adjust('cha', 100 + dice(10), PC.card($.player.pc).toCha, +($.player.cha == $.player.maxcha))
                    break

                //	Vial of Stupidity
                case 3:
                    PC.adjust('int', -dice(10), -PC.card($.player.pc).toInt)
                    break

                //	Potion of Agility
                case 4:
                    PC.adjust('dex', 100 + dice(10), PC.card($.player.pc).toDex, +($.player.dex == $.player.maxdex))
                    break

                //	Vial of Clumsiness
                case 5:
                    PC.adjust('dex', -dice(10), -PC.card($.player.pc).toDex)
                    break

                //	Potion of Wisdom
                case 6:
                    PC.adjust('int', 100 + dice(10), PC.card($.player.pc).toInt, +($.player.int == $.player.maxint))
                    break

                //	Vile Vial
                case 7:
                    PC.adjust('cha', -dice(10), -PC.card($.player.pc).toCha)
                    break

                //	Potion of Stamina
                case 8:
                    PC.adjust('str', 100 + dice(10), PC.card($.player.pc).toStr, +($.player.str == $.player.maxstr))
                    break

                //	Vial of Slaad Secretions
                case 9:
                    $.online.hp -= dice($.player.hp / 2)
                    vt.sound('hurt', 3)
                    if ($.online.hp < 1)
                        death(`quaffed${an(potion[v])}`)
                    break

                //	Potion of Mana
                case 10:
                    vt.sound('shimmer')
                    $.online.sp += PC.sp() + dice($.player.sp - $.online.sp)
                    break

                //	Flask of Fire Water
                case 11:
                    if (($.online.sp -= dice($.online.sp / 2)) < 1)
                        $.online.sp = 0
                    break

                //	Elixir of Restoration
                case 12:
                    vt.music('elixir')
                    if ($.online.hp < $.player.hp) $.online.hp = $.player.hp
                    if ($.online.sp < $.player.sp) $.online.sp = $.player.sp
                    if ($.online.str < $.player.str) $.online.str = $.player.str
                    if ($.online.int < $.player.int) $.online.int = $.player.int
                    if ($.online.dex < $.player.dex) $.online.dex = $.player.dex
                    if ($.online.cha < $.player.cha) $.online.cha = $.player.cha
                    PC.adjust('str', 100 + dice(10), PC.card($.player.pc).toStr, +($.player.str == $.player.maxstr))
                    PC.adjust('int', 100 + dice(10), PC.card($.player.pc).toInt, +($.player.int == $.player.maxint))
                    PC.adjust('dex', 100 + dice(10), PC.card($.player.pc).toDex, +($.player.dex == $.player.maxdex))
                    PC.adjust('cha', 100 + dice(10), PC.card($.player.pc).toCha, +($.player.cha == $.player.maxcha))
                    break

                //	Vial of Crack
                case 13:
                    PC.adjust('str'
                        , $.online.str > 40 ? -dice(6) - 4 : -3
                        , $.player.str > 60 ? -dice(3) - 2 : -2
                        , $.player.maxstr > 80 ? -2 : -1)
                    PC.adjust('int'
                        , $.online.int > 40 ? -dice(6) - 4 : -3
                        , $.player.int > 60 ? -dice(3) - 2 : -2
                        , $.player.maxint > 80 ? -2 : -1)
                    PC.adjust('dex'
                        , $.online.dex > 40 ? -dice(6) - 4 : -3
                        , $.player.dex > 60 ? -dice(3) - 2 : -2
                        , $.player.maxdex > 80 ? -2 : -1)
                    PC.adjust('cha'
                        , $.online.cha > 40 ? -dice(6) - 4 : -3
                        , $.player.cha > 60 ? -dice(3) - 2 : -2
                        , $.player.maxcha > 80 ? -2 : -1)
                    $.online.sp -= PC.sp()
                    if ($.online.sp < 0) $.online.sp = 0
                    $.online.hp -= PC.hp()
                    vt.music('crack', 6)
                    if ($.online.hp < 1)
                        death(`quaffed${an(potion[v])}`)
                    break

                //	Potion of Augment
                case 14:
                    vt.sound('hone', 11)
                    PC.adjust('str'
                        , 100 + dice(100 - $.online.str)
                        , dice(3) + 2
                        , $.player.maxstr < 95 ? 2 : 1)
                    PC.adjust('int'
                        , 100 + dice(100 - $.online.int)
                        , dice(3) + 2
                        , $.player.maxint < 95 ? 2 : 1)
                    PC.adjust('dex'
                        , 100 + dice(100 - $.online.dex)
                        , dice(3) + 2
                        , $.player.maxdex < 95 ? 2 : 1)
                    PC.adjust('cha'
                        , 100 + dice(100 - $.online.cha)
                        , dice(3) + 2
                        , $.player.maxcha < 95 ? 2 : 1)
                    $.online.hp += PC.hp()
                    $.online.sp += PC.sp()
                    $.online.altered = true
                    vt.sound('heal', 3)
                    break

                //	Beaker of Death
                case 15:
                    death(`quaffed${an(potion[v])}`, true)
                    break
            }
        }
        if (!$.reason) pause = true
    }

    function occupying(room: room, a = '', reveal = false, identify = false) {
        let icon = '', o = a
        if (reveal) {
            let m = room.monster.length > 4 ? 4 : room.monster.length
            if (m) {
                if ($.player.emulation !== 'XT' && Monster[vt.tty])
                    icon += Monster[vt.tty][m]
                else {
                    if (identify) {
                        icon += Mask[m]
                        for (let i = 0; i < m; i++) {
                            let dm = PC.card(room.monster[i].user.pc)
                            icon = icon.replace('ѩ', vt.attr(dm.color || vt.white, dm.unicode))
                        }
                    }
                    else
                        icon += Mask[m]
                }
                o += ` ${icon} `
            }
            else if (room.map) {
                let tile = Dot
                if (!room.type || room.type == 'cavern') {
                    o += vt.attr(!room.type ? vt.yellow : vt.red)
                    if ($.player.emulation == 'XT')
                        tile = '\u2022' //  use a bullet to emphasize capacity
                }
                o += `  ${tile}  `
            }
            else
                o = '     '

            switch (room.occupant) {
                case 'trapdoor':
                    if (identify && !icon)
                        o = vt.attr(`  ${$.player.emulation == 'XT' ? vt.attr(vt.lblack, '⛋') : vt.attr(vt.reset, vt.faint, $.player.emulation == 'PC' ? '\xCF' : '?')}  `)
                    break

                case 'portal':
                    o = a + vt.attr(vt.blue)
                    if (!icon)
                        icon = vt.attr('v', vt.bright, vt.blink, 'V', vt.noblink, vt.normal, 'v')
                    else
                        icon += vt.attr(vt.blue)
                    o += vt.attr(vt.faint, 'v', vt.normal, icon, vt.faint, 'v')
                    break

                case 'well':
                    if (identify && !icon) {
                        o = vt.attr(`  ${$.player.emulation == 'XT' ? vt.attr(vt.lblue, '⛃', vt.reset) : vt.attr(vt.blue, vt.bright, $.player.emulation == 'PC' ? '\xF5' : '*')}  `)
                        well = false
                    }
                    break

                case 'wheel':
                    if (identify && !icon)
                        o = vt.attr(`  ${$.player.emulation == 'XT' ? vt.attr(vt.lmagenta, '࿋', vt.reset) : vt.attr(vt.magenta, vt.bright, $.player.emulation == 'PC' ? '\x9D' : '@')}  `)
                    break

                case 'thief':
                    if ((DL.map == `Marauder's map` || $.player.steal == 4) && !icon)
                        o = vt.attr(vt.off, vt.faint, `  ${$.player.emulation == 'XT' ? '∞' : $.player.emulation == 'PC' ? '\xA8' : '&'}  `)
                    break

                case 'cleric':
                    o = a + vt.attr(vt.yellow)
                    if (!icon)
                        icon = DL.cleric.user.status
                            ? vt.attr(vt.off, vt.faint, vt.uline, $.player.emulation == 'XT' ? '⛼🕱⛼' : `_${Cleric[$.player.emulation]}_`, vt.nouline, vt.normal, vt.yellow)
                            : vt.attr(vt.normal, vt.uline, '_', vt.faint, Cleric[$.player.emulation], vt.normal, '_', vt.nouline)
                    else
                        icon += vt.attr(vt.yellow)
                    o += vt.attr(vt.faint, ':', vt.normal, icon, vt.faint, ':')
                    break

                case 'wizard':
                    o = a + vt.attr(vt.magenta)
                    if (!icon)
                        icon = vt.attr(vt.normal, vt.uline, '_', vt.bright, Teleport[$.player.emulation], vt.normal, '_', vt.nouline)
                    else
                        icon += vt.attr(vt.magenta)
                    o += vt.attr(vt.faint, '<', vt.normal, icon, vt.faint, '>')
                    break

                case 'dwarf':
                    if (identify && !icon)
                        o = a + vt.attr(vt.yellow, `  ${$.player.emulation == 'XT' ? '⚘' : '$'}  `)
                    break

                case 'witch':
                    if (identify && !icon) {
                        o = a + vt.attr(vt.green, vt.faint, `  ${$.player.emulation == 'XT' ? '∢' : '%'}  `, vt.normal)
                        if ($.sorceress) $.sorceress--
                    }
                    break
            }
        }
        else
            o = '     '

        vt.out(o)

        if (room.giftItem && (DL.map == `Marauder's map` || Ring.power([], $.player.rings, 'identify').power))
            vt.out('\x08', vt.reset, vt.faint, room.giftIcon)
    }

    function scroll(top = 1, redraw = true, escape = false) {
        vt.save()
        vt.out(`\x1B[${top};${$.player.rows}r`)
        vt.restore()
        if (escape) {
            news(`\tescaped dungeon ${romanize(hideep + 1)}.${hiZ} ${levels < $.player.level && `ascending +${$.player.level - levels}` || 'expeditiously'}`)
            vt.music(['escape', 'thief2', 'thief'][$.dungeon])
            vt.outln(vt.lblue, `\n"Next time you won't escape so easily... moo-hahahahaha!!"`, -600)
            vt.profile({ png: 'castle', effect: 'pulse' })
        }
        else if (redraw) {
            drawLevel()
            drawHero()
        }
        refresh = (top == 1)
    }
}

export = Dungeon
