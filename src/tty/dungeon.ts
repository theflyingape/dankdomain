/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  DUNGEON authored by: Robert Hurst <theflyingape@gmail.com>               *
\*****************************************************************************/

import $ = require('../common')
import fs = require('fs')
import Battle = require('../battle')
import xvt = require('xvt')
import { isBoolean, isNotEmpty } from 'class-validator'
import { sprintf } from 'sprintf-js'

module Dungeon {

    let fini: Function
    let monsters: monster = require('../etc/dungeon.json')
    let party: active[]
    let potions: vial[] = []
    let tl: number

    let idle: number = -1
    let looked: boolean
    let pause: boolean
    let refresh: boolean
    let skillkill: boolean

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
    const Dot = xvt.app.Empty

    const Mask = ['   ', ' ѩ ', 'ѩ ѩ', 'ѩѩѩ', 'ѩӂѩ']
    const Monster = {
        rlogin: ['   ', 'Mon', 'M+M', 'Mob', 'MOB'],
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
        let c = $.dice(containers.length) - 1
        let liquids = ['bubbling', 'clear', 'milky', 'sparkling']
        let colors = ['amber', 'sapphire', 'crimson', 'emerald', 'amethyst']
        let coded = [xvt.yellow, xvt.blue, xvt.red, xvt.green, xvt.magenta]
        while (liquids.length) {
            let l = $.dice(liquids.length) - 1
            let i = $.dice(colors.length) - 1
            potions.push({
                potion: v++, identified: false
                , image: 'potion/' + (containers[c].startsWith('beaker') ? 'beaker' : colors[i])
                , description: xvt.attr(xvt.uline, containers[c], xvt.nouline, ' a ', liquids[l], ' ', coded[i], colors[i])
            })
            liquids.splice(l, 1)
            colors.splice(i, 1)
            coded.splice(i, 1)
        }
        containers.splice(c, 1)
    }

    $.loadUser($.dwarf)

    //  entry point
    export function DeepDank(start: number, cb: Function) {
        levels = $.player.level
        skillkill = false
        Battle.teleported = false

        party = []
        party.push($.online)
        tl = $.checkTime() + 3

        deep = 0
        hideep = 0
        Z = start < 0 ? 0 : start > 99 ? 99 : $.int(start)
        hiZ = Z
        fini = cb

        if ($.access.sysop) crawling['M'] = { description: 'y liege' }
        generateLevel()

        $.profile({ jpg: `dungeon/level${sprintf('%x', $.int(Z / 9 - 1, true))}`, handle: "Entering", level: $.player.level, pc: 'dungeon' })
        ROOM = DL.rooms[Y][X]
        if (ROOM.occupant || ROOM.monster.length || ROOM.giftItem) xvt.sleep(2800)

        menu()
    }

    //	check player status: level up, changed, dead
    //	did player cast teleport?
    //	did player enter a room?
    //	does last output(s) need a pause?
    //	is a redraw needed?
    //	is a monster spawning needed?
    //	position Hero and get user command
    export function menu(suppress = false) {
        //	check player status: level up, changed, dead
        if ($.player.level + 1 < $.sysop.level) {
            if ($.checkXP($.online, menu)) {
                DL.exit = false
                DL.moves -= DL.width
                pause = true
                return
            }
            else if ($.jumped) {
                $.title(`${$.player.handle}: level ${$.player.level} ${$.player.pc} - Dungeon ${$.romanize(deep + 1)}.${Z + 1}`)
                if ($.jumped > (19 - $.int(deep / 3))) skillkill = true
            }
        }

        if ($.online.altered) $.saveUser($.player)
        if ($.reason || xvt.reason) {
            if ($.checkTime() < 0 && $.online.hp > 0) $.online.hp = idle
            $.death(`failed to escape ${$.romanize(deep + 1)}.${Z + 1} - ${$.reason || xvt.reason}`)
            DL.map = `Marauder's map`
            scroll()
            xvt.hangup()
        }

        //	did player cast teleport?
        if (!Battle.retreat && Battle.teleported) {
            Battle.teleported = false
            if (Battle.expel) {
                Battle.expel = false
                $.PC.profile($.online, 'flipOutX')
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
            xvt.outln(xvt.magenta, 'You open a ', xvt.bright, 'mystic portal', xvt.normal, '.\n')
            $.sound('portal', 4)
            teleport()
            return
        }

        //	did player just do something eventful worthy of the big bonus?
        if (skillkill) {
            $.sound('winner')
            skillkill = false
            $.skillplus($.online, menu)
            return
        }

        //	did player enter a new room (or complete what's in it)?
        if (!looked)
            if (!(looked = doMove()))
                return

        //	does last output(s) need a pause?
        if (pause) {
            $.action('yn')
            pause = false
            xvt.app.form = {
                'pause': {
                    cb: () => { menu() }, pause: true, timeout: 20
                }
            }
            xvt.app.focus = 'pause'
            return
        }

        //	is a redraw needed?
        if (process.stdout.rows && process.stdout.rows !== $.player.rows) {
            $.player.rows = process.stdout.rows
            refresh = true
        }
        if (refresh) drawLevel()

        //  keep it organic relative to class skill + luck with player asset protection
        let me = $.int(
            $.int((Z / 3 + DL.rooms.length * DL.width + $.online.dex / 2 + $.online.cha) * (.6 + deep / 23))
            - DL.moves, true)
        me *= 1 + ($.Security.name[$.player.security].protection - $.player.level / 9) / 12
        if (me < ($.online.int + DL.width) / 2) {
            if (!DL.exit) {
                const t = $.player.expert ? 10 : 100
                xvt.out(-t, ' ', -2 * t, $.player.emulation == 'XT' ? '🏃' : '<<', -3 * t, xvt.faint, ' find ')
                $.sound(DL.alert ? 'exit' : '.', 4)
                xvt.outln('the ', -4 * t, 'exit ', -8 * t)
                xvt.drain()
                DL.alert = false
                DL.exit = true
            }
        }
        me = (me < DL.width ? DL.width - (DL.moves >> 8) : $.int(me)) - +$.player.coward
        if (me < DL.width) {
            DL.exit = $.player.coward
            if (me < 6) $.player.coward = true
            me = DL.width + 3 - +$.player.coward
            if ($.player.novice) me <<= 1
        }

        //	is a monster spawning needed?
        let x = $.dice(DL.width) - 1, y = $.dice(DL.rooms.length) - 1
        if ($.dice($.online.cha) < Z / (deep + 2)) {
            let d = Math.round($.online.cha / 19) + 2
            y = Y + ($.dice(d) - 1) - ($.dice(d) - 1)
            if (y < 0 || y >= DL.rooms.length)
                y = $.dice(DL.rooms.length) - 1
            d++
            x = X + ($.dice(d) - 1) - ($.dice(d) - 1)
            if (x < 0 || x >= DL.width)
                x = $.dice(DL.width) - 1
        }
        ROOM = DL.rooms[y][x]
        if ($.dice(DL.spawn * (!ROOM.type ? 2 : ROOM.type == 'cavern' ? 1 : 3)) == 1) {
            if (putMonster(y, x)) {
                let s = $.dice(5) - 1
                xvt.outln()
                xvt.out(xvt.faint, ['Your skin crawls'
                    , 'Your pulse quickens', 'You feel paranoid', 'Your grip tightens'
                    , 'You stand ready'][s], ' from a ')
                //	only play sound when pairing is close to its description
                if (s == 1) $.sound('pulse')
                switch ($.dice(5)) {
                    case 1:
                        xvt.out('creaking sound')
                        if (s !== 1) $.sound('creak' + $.dice(2))
                        break
                    case 2:
                        xvt.out('clap of thunder')
                        if (s == 2) $.sound('thunder')
                        break
                    case 3:
                        xvt.out('ghostly whisper')
                        if (s == 3) $.sound('ghostly')
                        break
                    case 4:
                        xvt.out('beast growl')
                        if (s == 4) $.sound('growl')
                        break
                    case 5:
                        xvt.out('maniacal laugh')
                        if (s == 0) $.sound('laugh')
                        break
                }
                if (Math.abs(Y - y) < 3 && Math.abs(X - x) < 3)
                    xvt.outln(' nearby!', -100)
                else if (Math.abs(Y - y) < 6 && Math.abs(X - x) < 6)
                    xvt.outln(' off in the distance.', -200)
                else
                    xvt.outln(' as a faint echo.', -300)

                if (DL.map && DL.map !== 'map')
                    drawRoom(y, x)
                if (ROOM.occupant == 'cleric' && DL.cleric.hp) {
                    $.sound('agony', 10)
                    xvt.out(xvt.yellow, 'You hear a dying cry of agony !! ', -900)
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
                    xvt.outln(-900)
                    $.beep()
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
        $.action('dungeon')
        drawHero($.player.blessed ? true : false)

        if (DL.events > 0 && DL.moves > DL.width && $.dice(me) == 1) {
            DL.events--
            if (!$.player.novice && !$.access.sysop && !DL.events) DL.moves += DL.width
            $.music('.')
            let rng = $.dice(16)
            if (rng > 8) {
                if ($.player.emulation == 'XT') {
                    xvt.out(' 🦇 ')
                    $.sound('splat', 6)
                }
                xvt.out(xvt.faint, 'A bat flies by and soils ', xvt.normal, 'your ')
                $.player.toAC -= $.dice(deep)
                xvt.out($.PC.armor())
                if ($.player.emulation == 'XT') xvt.out(' 💩', -600)
            }
            else if (rng > 4) {
                if ($.player.emulation == 'XT') {
                    xvt.out(' 💧 ')
                    $.sound('drop', 6)
                }
                xvt.out(xvt.blue, 'A drop of ', xvt.bright, 'acid water burns ', xvt.normal, 'your ')
                $.player.toWC -= $.dice(deep)
                xvt.out($.PC.weapon(), -600)
            }
            else if (rng > 2) {
                if ($.player.emulation == 'XT') {
                    xvt.out(' 😬 ')
                    $.sound('hurt', 6)
                }
                xvt.out(xvt.yellow, 'You trip on the rocky surface and hurt yourself.', -600)
                $.online.hp -= $.dice(Z)
                if ($.online.hp < 1) $.death('fell down')
            }
            else if (rng > 1) {
                if ($.player.emulation == 'XT') {
                    $.sound('crack')
                    xvt.out(' 🐝 ', -300, '🐝 ', -200, '🐝 ', -100, '🐝 ', -50, '🐝 ', -25)
                }
                xvt.out(xvt.red, 'You are attacked by a ', xvt.bright, 'swarm of bees', xvt.normal)
                if ($.player.emulation == 'XT') xvt.out(' 🐝', -25, ' 🐝', -50, ' 🐝', -100, ' 🐝', -200, ' 🐝', -300)
                else xvt.out('!!', -600)
                for (x = 0, y = $.dice(Z); x < y; x++)
                    $.online.hp -= $.dice(Z)
                if ($.online.hp < 1) $.death('killer bees')
            }
            else {
                if ($.player.emulation == 'XT') {
                    xvt.out(' ⚡ ')
                    $.sound('boom', 6)
                }
                xvt.out(xvt.bright, 'A bolt of lightning strikes you!', -600)
                $.player.toAC -= $.dice($.online.armor.ac / 2)
                $.online.toAC -= $.dice($.online.armor.ac / 2)
                $.player.toWC -= $.dice($.online.weapon.wc / 2)
                $.online.toWC -= $.dice($.online.weapon.wc / 2)
                $.online.hp -= $.dice($.player.hp / 2)
                if ($.online.hp < 1) $.death('struck by lightning')
            }
            if ($.online.weapon.wc > 0 && $.online.weapon.wc + $.online.toWC + $.player.toWC < 0) {
                xvt.out(`\nYour ${$.player.weapon} is damaged beyond repair; `, -300, `you toss it aside.`)
                $.Weapon.equip($.online, $.Weapon.merchant[0])
            }
            if ($.online.armor.ac > 0 && $.online.armor.ac + $.online.toAC + $.player.toAC < 0) {
                xvt.out(`\nYour ${$.player.armor} is damaged beyond repair; `, -300, `you toss it aside.`)
                $.Armor.equip($.online, $.Armor.merchant[0])
            }

            xvt.drain()
            drawHero($.player.blessed ? true : false)
            xvt.outln(-600)
        }

        //  insert any wall messages here
        xvt.out('\x06')
        if ($.reason) {
            DL.map = `Marauder's map`
            drawHero()
            scroll()
            xvt.hangup()
        }

        //	user input
        xvt.app.form = {
            'command': { cb: command, cancel: 'Y', eol: false, timeout: 20 }
        }
        xvt.app.form['command'].prompt = ''
        if (suppress)
            xvt.app.form['command'].prompt += `${deep ? xvt.attr(xvt.white, xvt.faint, $.romanize(deep + 1), xvt.cyan) : xvt.attr(xvt.cyan)}:`
        else {
            if ($.player.spells.length)
                xvt.app.form['command'].prompt += xvt.attr(
                    $.bracket('C', false), xvt.cyan, 'ast, '
                )
            if ($.player.poisons.length)
                xvt.app.form['command'].prompt += xvt.attr(
                    $.bracket('P', false), xvt.cyan, 'oison, '
                )
            if (Y > 0 && DL.rooms[Y][X].type !== 'w-e')
                if (DL.rooms[Y - 1][X].type !== 'w-e')
                    xvt.app.form['command'].prompt += xvt.attr(
                        $.bracket('N', false), xvt.cyan, 'orth, '
                    )
            if (Y < DL.rooms.length - 1 && DL.rooms[Y][X].type !== 'w-e')
                if (DL.rooms[Y + 1][X].type !== 'w-e')
                    xvt.app.form['command'].prompt += xvt.attr(
                        $.bracket('S', false), xvt.cyan, 'outh, ',
                    )
            if (X < DL.width - 1 && DL.rooms[Y][X].type !== 'n-s')
                if (DL.rooms[Y][X + 1].type !== 'n-s')
                    xvt.app.form['command'].prompt += xvt.attr(
                        $.bracket('E', false), xvt.cyan, 'ast, ',
                    )
            if (X > 0 && DL.rooms[Y][X].type !== 'n-s')
                if (DL.rooms[Y][X - 1].type !== 'n-s')
                    xvt.app.form['command'].prompt += xvt.attr(
                        $.bracket('W', false), xvt.cyan, 'est, ',
                    )

            xvt.app.form['command'].prompt += xvt.attr(
                $.bracket('Y', false), xvt.cyan, 'our status: '
            )
        }
        xvt.app.focus = 'command'
    }

    function command() {
        let suppress = false
        let choice = xvt.entry.toUpperCase()
        if (/\[.*\]/.test(xvt.terminator)) {
            if ((choice = 'NSEW'['UDRL'.indexOf(xvt.terminator[1])])) {
                suppress = true
                xvt.out(xvt.bright, xvt.white, choice, xvt.normal)
            }
            else {
                choice = 'Y'
                idle++
            }
        }
        if (isNotEmpty(crawling[choice])) {
            xvt.out(crawling[choice].description)
            DL.moves++
            if (DL.spawn > 2 && !(DL.moves % DL.width))
                DL.spawn--
            if (!DL.exit)
                recovery(300)
        }
        else {
            xvt.beep()
            xvt.drain()
            menu(false)
            return
        }
        xvt.outln()

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
                xvt.drain()
                xvt.outln()
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
        $.PC.profile($.online, 'bounce', ` - Dungeon ${$.romanize(deep + 1)}.${Z + 1}`)
        $.sound('wall')
        xvt.outln(xvt.bright, xvt.yellow, 'Oof!', xvt.normal, ` There is a wall to the ${wall}.`, -400)
        xvt.drain()
        if (($.online.hp -= $.dice(deep + Z + 1)) < 1) {
            $.online.hp = 0
            $.music('.')
            if (Battle.retreat)
                $.death('running into a wall')
            else {
                $.online.hp = 1
                $.player.killed++
                $.death('banged head against a wall')
            }
            if (deep) $.reason += `-${$.romanize(deep + 1)}`
            xvt.outln(xvt.faint, '\nYou take too many hits and die!', -600)
        }
    }

    //	look around, return whether done or not
    function doMove(): boolean {
        ROOM = DL.rooms[Y][X]
        if (!ROOM.map) {
            recovery(600)
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

        xvt.outln()
        if (idle > 0) idle--
        if (looked) return true
        recovery(ROOM.occupant == 'cleric' ? 600 : 200)

        //	monsters?
        if (ROOM.monster.length) {
            $.action('clear')
            if (!refresh) drawRoom(Y, X, true, true)
            scroll(1, false)
            xvt.out(xvt.off)

            if (ROOM.monster.length == 1) {
                let img = `dungeon/${ROOM.monster[0].user.handle}`
                $.profile({ jpg: img, effect: ROOM.monster[0].effect })
                xvt.out(`There's something lurking in here . . . `)
                //  dramatic pause if profile change is needed to match player's class
                if (!ROOM.monster[0].monster.pc && ROOM.monster[0].user.pc == $.player.pc) {
                    xvt.sleep(900)
                    if ($.PC.name['player'][ROOM.monster[0].user.pc])
                        $.profile({ png: 'player/' + $.player.pc.toLowerCase() + ($.player.gender == 'F' ? '_f' : ''), effect: 'flash' })
                    else
                        $.profile({
                            png: 'monster/'
                                + ($.PC.name['monster'][ROOM.monster[0].user.pc]
                                    || $.PC.name['tavern'][ROOM.monster[0].user.pc]
                                    ? ROOM.monster[0].user.pc.toLowerCase() : 'monster')
                                + (ROOM.monster[0].user.gender == 'F' ? '_f' : ''),
                            effect: 'flash'
                        })
                }
                xvt.sleep(400)
            }
            else {
                xvt.out(`There's a party waiting `
                    , ['you', 'the main course', 'the entertainment', 'meat', 'a good chew'][$.dice(5) - 1]
                    , '. . . ', -500)
                let m = {}
                for (let i = 0; i < ROOM.monster.length; i++) {
                    m['mob' + (i + 1)] = 'monster/'
                        + ($.PC.name['monster'][ROOM.monster[i].user.pc]
                            || $.PC.name['tavern'][ROOM.monster[i].user.pc]
                            ? ROOM.monster[i].user.pc.toLowerCase() : 'monster')
                        + (ROOM.monster[i].user.gender == 'F' ? '_f' : '')
                    if ($.PC.name['player'][ROOM.monster[i].user.pc])
                        m['mob' + (i + 1)] = 'player/' + $.player.pc.toLowerCase() + ($.player.gender == 'F' ? '_f' : '')
                }
                $.profile(m)
            }
            xvt.outln()

            for (let n = 0; n < ROOM.monster.length; n++) {
                if (ROOM.monster.length < 4)
                    $.cat(`dungeon/${ROOM.monster[n].user.handle}`)
                let what = ROOM.monster[n].user.handle
                if (ROOM.monster[n].user.xplevel > 0)
                    what = [xvt.attr(xvt.faint, 'lesser ', xvt.reset), '', xvt.attr(xvt.bright, 'greater ', xvt.reset)]
                    [ROOM.monster[n].user.xplevel - ROOM.monster[n].user.level + 1] + what
                xvt.out(`It's`, $.an(what), '... ', ROOM.monster.length < 4 ? -250 : -50)

                if ($.player.novice || party.length > 3 || ($.dice(ROOM.monster[n].user.xplevel / 5 + 5) * (101 - $.online.cha + deep) > 1)) {
                    if (ROOM.monster[n].user.xplevel > 0)
                        xvt.out(`and it doesn't look friendly.`, -50)
                    else
                        xvt.out('and it looks harmless', -100, ', for now.', -50)
                    xvt.outln(ROOM.monster.length < 4 ? -250 : -50)
                    if (ROOM.monster[n]) $.PC.wearing(ROOM.monster[n])
                }
                else {
                    xvt.outln(`and it's `, xvt.yellow, xvt.bright
                        , ['bewitched', 'charmed', 'dazzled', 'impressed', 'seduced'][$.dice(5) - 1]
                        , ' by your '
                        , ['awesomeness', 'elegance', 'presence', $.player.armor, $.player.weapon][$.dice(5) - 1])
                    ROOM.monster[n].user.gender = 'FM'[$.dice(2) - 1]
                    ROOM.monster[n].user.handle = xvt.attr(ROOM.monster[n].pc.color || xvt.white, xvt.bright, 'charmed ', ROOM.monster[n].user.handle, xvt.reset)
                    const xp = $.dice(3 + $.online.adept + +$.access.sysop - +$.player.coward) - 2
                    ROOM.monster[n].user.xplevel = xp > 1 ? 1 : xp
                    xvt.outln(' to join ', ['you', 'your party'][+(party.length > 1)], ' in '
                        , [xvt.white, xvt.cyan, xvt.red][ROOM.monster[n].user.xplevel + 1], xvt.bright
                        , ['spirit ... ', 'defense.', 'arms!'][ROOM.monster[n].user.xplevel + 1], -400)
                    party.push(ROOM.monster[n])
                    ROOM.monster.splice(n--, 1)
                }
            }

            if (ROOM.monster.length) {
                $.from = 'Dungeon'
                $.action('battle')
                b4 = ROOM.monster.length > 3 ? -ROOM.monster.length : ROOM.monster.length > 2 ? $.online.hp : 0
                Battle.engage('Dungeon', party, ROOM.monster, doSpoils)
                return false
            }

            pause = true
            return true
        }

        //	npc?
        let loot = new $.coins(0)
        if (ROOM.occupant && !refresh) drawRoom(Y, X)
        switch (ROOM.occupant) {
            case 'trapdoor':
                if ($.dice(100 - Z) > 1) {
                    xvt.outln('You have stepped onto a trapdoor!')
                    xvt.outln(-300)
                    let u = ($.dice(127 + deep - ($.player.backstab << 1) - ($.player.steal << 2)) < $.online.dex)
                    for (let m = party.length - 1; m > 0; m--) {
                        if ($.dice(120) < party[m].dex)
                            xvt.out(party[m].user.handle, xvt.faint, ' manages to catch the edge and stop from falling.')
                        else {
                            xvt.out(party[m].user.handle, xvt.reset
                                , xvt.bright, ' falls'
                                , xvt.normal, ' down a'
                                , xvt.faint, ' level!')
                            if (u) party.splice(m, 1)
                        }
                        xvt.outln(-300)
                    }
                    if (u) {
                        xvt.outln('You manage to catch the edge and stop yourself from falling.')
                        ROOM.occupant = ''
                    }
                    else {
                        party = []
                        party.push($.online)
                        xvt.outln(xvt.bright, xvt.yellow, 'You fall down a level!', -500)
                        if ($.dice(100 + $.player.level - Z) > $.online.dex) {
                            if ($.dice($.online.cha / 10 + deep) <= (deep + 1))
                                $.player.toWC -= $.dice(Math.abs(Z - $.player.level))
                            $.online.toWC -= $.dice(Math.round($.online.weapon.wc / 10) + 1)
                            xvt.outln(`Your ${$.PC.weapon()} is damaged from the fall!`, -50)
                        }
                        if ($.dice(100 + $.player.level - Z) > $.online.dex) {
                            if ($.dice($.online.cha / 10 + deep) <= (deep + 1))
                                $.player.toAC -= $.dice(Math.abs(Z - $.player.level))
                            $.online.toAC -= $.dice(Math.round($.online.armor.ac / 10) + 1)
                            xvt.outln(`Your ${$.PC.armor()} is damaged from the fall!`, -50)
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
                    $.profile({ png: 'npc/faery spirit', effect: 'fadeInRight' })
                    xvt.out(xvt.cyan, xvt.bright, 'A faery spirit appears ', -600
                        , xvt.normal, 'and passes ', -500)
                    if ((!DL.events && DL.exit) || $.dice(50 + Z - deep) > ($.online.cha - 10 * +$.player.coward)) {
                        $.animated('fadeOut')
                        xvt.outln(xvt.faint, 'by you.')
                        recovery()
                    }
                    else {
                        $.animated('fadeOutLeft')
                        xvt.outln(xvt.faint, 'through you.')
                        for (let i = 0; i <= Z; i++)
                            $.online.hp += $.dice($.int(DL.cleric.user.level / 9)) + $.dice($.int(Z / 9 + deep / 3))
                        if ($.online.hp > $.player.hp) $.online.hp = $.player.hp
                        if ($.player.magic > 1) {
                            for (let i = 0; i <= Z; i++)
                                $.online.sp += $.dice($.int(DL.cleric.user.level / 9)) + $.dice($.int(Z / 9 + deep / 3))
                            if ($.online.sp > $.player.sp) $.online.sp = $.player.sp
                        }
                        $.sound('heal')
                    }
                }
                break

            case 'portal':
                $.action('ny')
                $.profile({ jpg: 'ddd', effect: 'fadeIn', level: $.romanize(deep + 2), pc: 'domain portal' })
                xvt.out(xvt.bright, xvt.blue, `You've found a portal to a deeper and more dank dungeon.`)
                xvt.app.form = {
                    'deep': {
                        cb: () => {
                            ROOM.occupant = ''
                            xvt.outln()
                            if (/Y/i.test(xvt.entry)) {
                                $.animated('fadeOutDown')
                                $.sound('portal')
                                xvt.out(xvt.bright, xvt.white, `You descend `, -400, xvt.normal, `into domain `, -300, xvt.faint, $.romanize(++deep + 1), ' ... ', -200)
                                generateLevel()
                                xvt.drain()
                                xvt.outln()
                            }
                            else
                                $.animated('fadeOut')
                            menu()
                        }, prompt: 'Descend even deeper (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 20
                    }
                }
                xvt.app.focus = 'deep'
                return false

            case 'well':
                scroll(1, false)
                $.music('well')
                xvt.outln(-500, xvt.magenta, 'You have found a legendary ', xvt.bright, 'Wishing Well', xvt.normal, '.')
                xvt.outln(-500)
                xvt.outln(-500, xvt.bright, xvt.yellow, 'What do you wish to do?', -500)

                let well = 'BFORT'
                xvt.out($.bracket('B'), 'Bless yourself', -25)
                xvt.out($.bracket('F'), 'Fix all your damage', -25)
                xvt.out($.bracket('O'), 'Teleport all the way out', -25)
                xvt.out($.bracket('R'), 'Resurrect all the dead players', -25)
                xvt.out($.bracket('T'), 'Teleport to another level', -25)
                if (!$.player.coward && deep) {
                    well += 'C'
                    xvt.out($.bracket('C'), 'Curse another player', -50)
                }
                if (deep > 1) { xvt.out($.bracket('L'), `Loot another player's money`, -75); well += 'L' }
                if (deep > 3) { xvt.out($.bracket('G'), 'Grant another call', -100); well += 'G' }
                if (deep > 5) { xvt.out($.bracket('K'), 'Key hint(s)', -200); well += 'K' }
                if (deep > 7) { xvt.out($.bracket('D'), 'Destroy dungeon visit', -250); well += 'D' }
                xvt.outln(-500)
                xvt.drain()

                $.action('well')
                xvt.app.form = {
                    'well': {
                        cb: () => {
                            ROOM.occupant = ''
                            xvt.outln()
                            let wish = xvt.entry.toUpperCase()
                            if (wish == '' || well.indexOf(wish) < 0) {
                                $.sound('oops')
                                xvt.app.refocus()
                                return
                            }
                            $.animated('flipOutX')
                            xvt.outln()

                            switch (wish) {
                                case 'B':
                                    if ($.player.cursed) {
                                        $.player.coward = false
                                        $.player.cursed = ''
                                        xvt.out(xvt.bright, xvt.black, 'The dark cloud has left you.')
                                        $.news(`\tlifted curse`)
                                    }
                                    else {
                                        $.sound('shimmer')
                                        $.player.blessed = 'well'
                                        xvt.out(xvt.yellow, 'You feel ', xvt.bright, 'a shining aura', xvt.normal, ' surround you.')
                                        $.news(`\twished for a blessing`)
                                    }
                                    $.PC.adjust('str', 110)
                                    $.PC.adjust('int', 110)
                                    $.PC.adjust('dex', 110)
                                    $.PC.adjust('cha', 110)
                                    $.sound('shimmer')
                                    DL.events = 0
                                    DL.exit = false
                                    break

                                case 'C':
                                    $.sound('steal')
                                    Battle.user('Curse', (opponent: active) => {
                                        if (opponent.user.id == $.player.id) {
                                            opponent.user.id = ''
                                            xvt.outln(`You can't curse yourself.`)
                                            xvt.app.refocus()
                                            return
                                        }
                                        if (opponent.user.id) {
                                            $.news(`\tcursed ${opponent.user.handle}`)
                                            if (opponent.user.blessed) {
                                                $.log(opponent.user.id, `\n${$.player.handle} vanquished your blessedness!`)
                                                opponent.user.blessed = ''
                                                xvt.out(xvt.yellow, xvt.bright, opponent.who.His, 'shining aura', xvt.normal, ' fades ', xvt.faint, 'away.')
                                            }
                                            else {
                                                $.log(opponent.user.id, `\n${$.player.handle} cursed you!`)
                                                opponent.user.cursed = $.player.id
                                                xvt.out(xvt.faint, 'A dark cloud hovers over ', opponent.who.him, '.')
                                            }
                                            opponent.user.coward = true
                                            $.saveUser(opponent)
                                            if (opponent.user.id == $.king.id) {
                                                $.player.coward = true
                                                $.online.altered = true
                                                $.sound('boom', 6)
                                            }
                                            else
                                                $.sound('morph', 12)
                                        }
                                        menu()
                                        return
                                    })
                                    return

                                case 'T':
                                    let start = $.int(Z - $.dice(deep))
                                    if (start < 1) start = 1
                                    let end = $.int(Z + $.dice(deep) + $.dice(Z) + $.dice(Z))
                                    if (end > 100) end = 100
                                    $.action('list')
                                    xvt.app.form = {
                                        'level': {
                                            cb: () => {
                                                let i = parseInt(xvt.entry)
                                                if (isNaN(i)) {
                                                    xvt.app.refocus()
                                                    return
                                                }
                                                if (i < start || i > end) {
                                                    xvt.app.refocus()
                                                    return
                                                }
                                                $.sound('teleport')
                                                Z = i - 1
                                                generateLevel()
                                                menu()
                                            }, prompt: `Level (${start}-${end}): `, cancel: `${Z}`, enter: `${end}`, min: 1, max: 3, timeout: 30
                                        }
                                    }
                                    xvt.app.focus = 'level'
                                    return

                                case 'D':
                                    xvt.outln(xvt.black, xvt.bright, 'Your past time in this dungeon visit is eradicated and reset.')
                                    $.sound('destroy', 32)
                                    for (let i in dd)
                                        delete dd[i]
                                    $.dungeon++
                                    if (!$.sorceress) $.sorceress++
                                    if (!$.taxboss) $.taxboss++
                                    generateLevel()
                                    $.warning = 2
                                    xvt.sessionAllowed += $.warning * 60
                                    break

                                case 'O':
                                    $.sound('teleport')
                                    scroll(1, false, true)
                                    xvt.outln()
                                    fini()
                                    return

                                case 'R':
                                    $.sound('resurrect')
                                    $.run(`UPDATE Players SET status='' WHERE id NOT GLOB '_*' AND status!='jail'`)
                                    $.news(`\twished all the dead resurrected`)
                                    break

                                case 'F':
                                    $.music('elixir')
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
                                    xvt.outln(xvt.cyan, xvt.bright, 'You are completely healed and all damage is repaired.')
                                    break

                                case 'L':
                                    $.sound('steal')
                                    Battle.user('Loot', (opponent: active) => {
                                        if (opponent.user.id == $.player.id) {
                                            opponent.user.id = ''
                                            xvt.outln(`You can't loot yourself.`)
                                            xvt.app.refocus()
                                            return
                                        }
                                        else if (opponent.user.novice) {
                                            opponent.user.id = ''
                                            xvt.outln(`You can't loot novice players.`)
                                            xvt.app.refocus()
                                            return
                                        }
                                        if (opponent.user.id) {
                                            loot.value = opponent.user.coin.value + opponent.user.bank.value
                                            $.log(opponent.user.id, `\n${$.player.handle} wished for your ${loot.carry(2, true)}`)
                                            $.news(`\tlooted ${opponent.user.handle}`)
                                            $.player.coin.value += loot.value
                                            opponent.user.coin.value = 0
                                            opponent.user.bank.value = 0
                                            $.saveUser(opponent)
                                            $.sound('max')
                                        }
                                        menu()
                                        return
                                    })
                                    return

                                case 'G':
                                    if ($.player.today) {
                                        $.sound('shimmer')
                                        $.player.today--
                                        xvt.outln('You are granted another call for the day.')
                                        $.news(`\twished for an extra call`)
                                    }
                                    else {
                                        xvt.outln('A deep laughter bellows... ')
                                        $.sound('morph', 12)
                                    }
                                    break

                                case 'K':
                                    let k = $.dice($.player.wins < 3 ? 1 : 3)
                                    for (let i = 0; i < k; i++) {
                                        $.keyhint($.online)
                                        $.sound("shimmer", 12)
                                    }
                                    break
                            }
                            pause = true
                            menu()
                        }, prompt: 'What is thy bidding, my master? ', cancel: 'O', enter: 'B', eol: false, max: 1, timeout: 50
                    }
                }
                xvt.drain()
                xvt.app.focus = 'well'
                return false

            case 'wheel':
                $.profile({ png: 'wol', effect: 'rotateIn' })
                xvt.outln(xvt.magenta, 'You have found a ', xvt.bright, 'Mystical Wheel of Life', xvt.normal, '.', -600)
                $.music('wol')
                xvt.outln(-600)
                xvt.outln(xvt.bright, xvt.yellow, 'The runes are ',
                    ['cryptic', 'familiar', 'foreign', 'speaking out', 'strange'][$.dice(5) - 1],
                    ' to you.', -600)

                xvt.app.form = {
                    'wheel': {
                        cb: () => {
                            ROOM.occupant = ''
                            xvt.outln()
                            if (/Y/i.test(xvt.entry)) {
                                $.music('tension' + $.dice(3))
                                $.animated('infinite rotateIn')
                                let z = (deep < 3) ? 3 : (deep < 5) ? 5 : (deep < 7) ? 7 : 10
                                let t = 0
                                for (let i = 0; i < 5; i++) {
                                    let n = $.int($.online.str / 5 - 5 * i + $.dice(5) + 1)
                                    for (let m = 0; m < n; m++) {
                                        $.beep()
                                        xvt.out('\r', '-\\|/'[m % 4])
                                    }
                                }
                                let n = $.dice($.online.str / 20) + 2
                                for (let i = 1; i <= n; i++) {
                                    t = $.dice(z + 1) - 1
                                    if (i == n) {
                                        z = 10
                                        if ($.access.sysop) t = [0, 2, 3, 5, 7, 8][$.dice(6) - 1]
                                    }
                                    xvt.out(xvt.bright, xvt.blue, '\r [', xvt.cyan, [
                                        ' +Time ', ' Death ', ' Grace ',
                                        ' Power ', ' Doom! ',
                                        'Fortune', ' Taxes ',
                                        ' =Key= ', '+Skill+', ' Morph ']
                                    [t % z],
                                        xvt.blue, '] \r', -100 * 3 * i)
                                    $.sound('click')
                                }
                                $.animated('rotateOut')
                                xvt.outln()

                                switch (t % z) {
                                    case 0:
                                        xvt.sessionAllowed += 300
                                        break
                                    case 1:
                                        $.online.hp = 0
                                        $.online.sp = 0
                                        $.death('Wheel of Death')
                                        $.sound('killed', 11)
                                        break
                                    case 2:
                                        if ($.player.cursed) {
                                            xvt.out(xvt.faint, 'The dark cloud has been lifted.', xvt.reset)
                                            $.player.cursed = ''
                                        }
                                        else {
                                            $.PC.adjust('str', 0, 2, 1)
                                            $.PC.adjust('int', 0, 2, 1)
                                            $.PC.adjust('dex', 0, 2, 1)
                                            $.PC.adjust('cha', 0, 2, 1)
                                        }
                                        $.PC.adjust('str', 110)
                                        $.PC.adjust('int', 110)
                                        $.PC.adjust('dex', 110)
                                        $.PC.adjust('cha', 110)
                                        $.sound('shimmer')
                                        DL.events = 0
                                        DL.exit = false
                                        break
                                    case 3:
                                        $.online.hp += $.int($.player.hp / 2) + $.dice($.player.hp / 2)
                                        if ($.player.magic > 1) $.online.sp += $.int($.player.sp / 2) + $.dice($.player.sp / 2)
                                        $.player.toWC += $.dice($.online.weapon.wc - $.player.toWC)
                                        $.online.toWC += $.int($.online.weapon.wc / 2) + 1
                                        $.player.toAC += $.dice($.online.armor.ac - $.player.toAC)
                                        $.online.toAC += $.int($.online.armor.ac / 2) + 1
                                        $.sound('hone')
                                        break
                                    case 4:
                                        DL.events += $.dice(Z)
                                        if ($.player.blessed) {
                                            xvt.out(xvt.bright, xvt.yellow, 'Your shining aura ', xvt.normal, 'has left ', xvt.faint, 'you.', xvt.reset)
                                            $.player.blessed = ''
                                        }
                                        else {
                                            $.PC.adjust('str', 0, -2, -1)
                                            $.PC.adjust('int', 0, -2, -1)
                                            $.PC.adjust('dex', 0, -2, -1)
                                            $.PC.adjust('cha', 0, -2, -1)
                                        }
                                        $.PC.adjust('str', -5 - $.dice(5))
                                        $.PC.adjust('int', -5 - $.dice(5))
                                        $.PC.adjust('dex', -5 - $.dice(5))
                                        $.PC.adjust('cha', -5 - $.dice(5))
                                        $.sound('crack')
                                        break
                                    case 5:
                                        loot.value = $.money(Z)
                                        loot.value += $.worth(new $.coins($.online.weapon.value).value, $.online.cha)
                                        loot.value += $.worth(new $.coins($.online.armor.value).value, $.online.cha)
                                        loot.value *= (Z + 1)
                                        $.player.coin.value += new $.coins(loot.carry(1, true)).value
                                        $.sound('yahoo')
                                        break
                                    case 6:
                                        $.player.coin.value = 0
                                        $.player.bank.value = 0
                                        loot.value = $.money(Z)
                                        loot.value += $.worth(new $.coins($.online.weapon.value).value, $.online.cha)
                                        loot.value += $.worth(new $.coins($.online.armor.value).value, $.online.cha)
                                        loot.value *= (Z + 1)
                                        $.player.loan.value += new $.coins(loot.carry(1, true)).value
                                        $.sound('thief2')
                                        break
                                    case 7:
                                        $.keyhint($.online)
                                        $.sound('click')
                                        break
                                    case 8:
                                        $.sound('level')
                                        $.skillplus($.online, menu)
                                        return
                                    case 9:
                                        $.player.level = $.dice(Z)
                                        if ($.online.adept) $.player.level += $.dice($.player.level)
                                        $.reroll($.player, $.PC.random('monster'), $.player.level)
                                        $.activate($.online)
                                        $.online.altered = true
                                        $.player.gender = ['F', 'M'][$.dice(2) - 1]
                                        $.saveUser($.player)
                                        $.news(`\t${$.player.handle} got morphed into a level ${$.player.level} ${$.player.pc} (${$.player.gender})!`)
                                        xvt.outln(`You got morphed into a level ${$.player.level} ${$.player.pc} (${$.player.gender})!`)
                                        $.sound('morph', 10)
                                        break
                                }
                            }
                            else
                                $.animated('rotateOut')
                            menu()
                        }, prompt: 'Will you spin it (Y/N)? ', cancel: 'Y', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 20
                    }
                }
                $.action('ny')
                xvt.drain()
                xvt.app.focus = 'wheel'
                pause = true
                refresh = true
                return false

            case 'thief':
                xvt.out(xvt.cyan, xvt.faint, 'There is a thief in this ', !ROOM.type ? 'chamber'
                    : ROOM.type == 'n-s' ? 'hallway' : ROOM.type == 'w-e' ? 'corridor' : 'cavern'
                    , '! ', xvt.white, -600)
                ROOM.occupant = ''

                if ($.taxboss && (Z + 1) >= $.taxman.user.level && $.player.level < $.taxman.user.level) {
                    $.taxboss--
                    $.loadUser($.taxman)
                    xvt.outln(xvt.reset, $.PC.who($.taxman).He, 'is the '
                        , xvt.cyan, xvt.bright, 'Master of Coin'
                        , xvt.reset, ' for '
                        , xvt.magenta, xvt.bright, $.king.handle
                        , xvt.reset, '!')
                    $.profile({ jpg: 'npc/taxman', handle: $.taxman.user.handle, level: $.taxman.user.level, pc: $.taxman.user.pc, effect: 'bounceInDown' })
                    $.sound('oops', 16)
                    $.activate($.taxman)
                    $.taxman.user.coin.value = $.player.coin.value
                    $.PC.wearing($.taxman)

                    b4 = -1
                    Battle.engage('Taxman', $.online, $.taxman, () => {
                        looked = false
                        pause = true
                        refresh = true
                        menu()
                    })
                    return
                }

                if (DL.map == `Marauder's map` || ($.Ring.power([], $.player.rings, 'identify').power > 0)) {
                    xvt.outln('He does not surprise you', xvt.cyan, '.')
                    break
                }

                let x = $.dice(DL.width) - 1, y = $.dice(DL.rooms.length) - 1
                let escape = DL.rooms[y][x]
                if (escape.occupant || $.dice(Z * ($.player.steal / 2 + 1) - deep) > Z) {
                    if (!escape.occupant && $.player.pc !== $.taxman.user.pc) {
                        escape.occupant = 'thief'
                        const t = $.dice(5) - 1
                        xvt.out([
                            'He decides to ignore you',
                            'He recognizes your skill and winks',
                            'He slaps your back, but your wallet remains',
                            'He offers you a drink, and you accept',
                            xvt.attr(`"I'll be seeing you again"`, xvt.cyan, ' as he leaves')
                        ][t])
                        xvt.out(xvt.cyan, '.')
                        if (t) {
                            $.PC.adjust(['', 'dex', 'str', 'int', 'cha'][t], -1)
                            if (t) $.sound('thief')
                        }
                    }
                    else {
                        xvt.out(xvt.normal, xvt.magenta, 'He teleports away!')
                        $.sound('teleport')
                    }
                    xvt.outln()
                }
                else {
                    escape.occupant = 'thief'
                    xvt.outln(xvt.reset, 'He surprises you!')
                    $.sound('thief', 4)

                    xvt.out('As he passes by, he steals your ')
                    x = $.online.cha + deep + 1
                    if ($.player.level / 9 - deep > $.Security.name[$.player.security].protection + 1)
                        x = $.int(x / $.player.level)
                    if ($.online.weapon.wc && $.dice(x) == 1) {
                        xvt.out($.PC.weapon(), -600)
                        $.Weapon.equip($.online, $.Weapon.merchant[0])
                        $.sound('thief2')
                        DL.exit = false
                    }
                    else if (DL.map && $.dice($.online.cha / 9) - 1 <= $.int(deep / 3)) {
                        xvt.out(xvt.yellow, xvt.bright, 'map')
                        DL.exit = false
                        DL.map = ''
                        refresh = true
                    }
                    else if ($.player.magic < 3 && $.player.spells.length && $.dice($.online.cha / 10 + deep + 1) - 1 <= $.int(deep / 2)) {
                        if ($.player.emulation == 'XT') xvt.out('📜 ')
                        y = $.player.spells[$.dice($.player.spells.length) - 1]
                        xvt.out(xvt.magenta, xvt.bright, Object.keys($.Magic.spells)[y - 1], ' ', ['wand', 'scroll'][$.player.magic - 1])
                        $.Magic.remove($.player.spells, y)
                    }
                    else if ($.player.poisons.length && $.dice($.online.cha / 10 + deep + 1) - 1 <= $.int(deep / 2)) {
                        y = $.player.poisons[$.dice($.player.poisons.length) - 1]
                        xvt.out('vial of ')
                        if ($.player.emulation == 'XT') xvt.out('💀 ')
                        xvt.out(xvt.faint, Object.keys($.Poison.vials)[y - 1])
                        $.Poison.remove($.player.poisons, y)
                    }
                    else if ($.player.coin.value) {
                        let pouch = $.player.coin.amount.split(',')
                        x = $.dice(pouch.length) - 1
                        xvt.out($.player.coin.pieces(pouch[x].substr(-1)))
                        $.player.coin.value -= new $.coins(pouch[x]).value
                    }
                    else
                        xvt.out(xvt.yellow, `Reese's pieces`)
                    xvt.outln(xvt.reset, '!', -600)
                }
                pause = true
                refresh = true
                break

            case 'cleric':
                if (!DL.cleric.hp) {
                    $.profile({ jpg: 'npc/rip', effect: 'fadeInUp' })
                    xvt.outln(xvt.yellow, 'You find the ', xvt.white, 'bones'
                        , xvt.yellow, ' of an ', xvt.faint, 'old cleric', xvt.normal, '.', -600)
                    if ($.player.emulation == 'XT') xvt.out(' 🪦 🕱 ')
                    xvt.outln('You pray for him.')
                    DL.alert = true
                    DL.exit = false
                    break
                }

                let cast = 7
                let mod = 6 + $.int($.player.melee / 2) - $.int($.player.magic / 2)
                if ($.Ring.power([], $.player.rings, 'taxes').power) mod++
                if ($.access.sysop) mod++
                if ($.player.coward) mod--
                let cost = new $.coins($.int(($.player.hp - $.online.hp) * $.money(Z) / mod / $.player.hp))
                if (cost.value < 1) cost.value = 1
                cost.value *= ($.int(deep / 3) + 1)
                if (!$.player.coward && !$.player.steals && ($.player.pc == DL.cleric.user.pc || $.player.maxcha > 98))
                    cost.value = 0
                cost = new $.coins(cost.carry(1, true))	//	just from 1-pouch

                if (ROOM.giftItem == 'chest') {
                    ROOM.giftValue = $.dice(6 - $.player.magic) - 1
                    cost.value = 0	//	this one is free of charge
                }

                let power = $.int(100 * DL.cleric.sp / DL.cleric.user.sp)
                xvt.outln(xvt.yellow, 'There is an ', xvt.faint, 'old cleric', xvt.normal
                    , xvt.normal, ' in this room with '
                    , power < 40 ? xvt.faint : power < 80 ? xvt.normal : xvt.bright, `${power}`
                    , xvt.normal, '% spell power.')
                xvt.out('He says, ')

                if ($.online.hp >= $.player.hp || cost.value > $.player.coin.value || DL.cleric.sp < $.Magic.power(DL.cleric, cast)) {
                    xvt.outln(xvt.yellow, '"I will pray for you."')
                    if ($.online.hp < $.player.hp)
                        $.profile({ jpg: 'npc/prayer', effect: 'fadeInUp' })
                    break
                }

                if (power > 95) $.profile({ jpg: 'npc/old cleric', effect: 'zoomInUp', level: DL.cleric.user.level, pc: DL.cleric.user.pc })
                if ($.online.hp > $.int($.player.hp / 3) || DL.cleric.sp < $.Magic.power(DL.cleric, 13)) {
                    xvt.out('"I can ', DL.cleric.sp < $.Magic.power(DL.cleric, 13) ? 'only' : 'surely'
                        , ' cast a Heal spell on your wounds for '
                        , cost.value ? cost.carry() : `you, ${$.player.gender == 'F' ? 'sister' : 'brother'}`
                        , '."')
                }
                else if (DL.cleric.sp >= $.Magic.power(DL.cleric, 13)) {
                    cast = 13
                    xvt.out('"I can restore your health for '
                        , cost.value ? cost.carry() : `you, ${$.player.gender == 'F' ? 'sister' : 'brother'}`
                        , '."')
                }

                $.action('yn')
                xvt.app.form = {
                    'pay': {
                        cb: () => {
                            xvt.outln('\n')
                            if (/Y/i.test(xvt.entry)) {
                                $.player.coin.value -= cost.value
                                DL.cleric.user.coin.value += cost.value
                                xvt.out(`He casts a ${Object.keys($.Magic.spells)[cast - 1]} spell on you.`)
                                DL.cleric.sp -= $.Magic.power(DL.cleric, cast)
                                if (cast == 7) {
                                    $.sound('heal')
                                    for (let i = 0; i <= Z; i++)
                                        $.online.hp += $.dice(DL.cleric.user.level / 9) + $.dice(Z / 9 + deep / 3)
                                    if ($.online.hp > $.player.hp) $.online.hp = $.player.hp
                                    xvt.out('  Your hit points: '
                                        , xvt.bright, $.online.hp == $.player.hp ? xvt.white : $.online.hp > $.player.hp * 0.85 ? xvt.yellow : xvt.red, $.online.hp.toString()
                                        , xvt.reset, `/${$.player.hp}`)
                                }
                                else {
                                    $.online.hp = $.player.hp
                                    $.sound('shimmer', 4)
                                }
                            }
                            else {
                                if (cast == 13) {
                                    xvt.outln(xvt.lyellow, '"God save you."', -300)
                                    ROOM.occupant = ''
                                    xvt.outln(xvt.magenta, 'He teleports away!')
                                    $.sound('teleport', 8)
                                }
                                else {
                                    $.profile({ jpg: 'npc/prayer', effect: 'fadeInUp' })
                                    xvt.outln(xvt.lyellow, '"I need to rest. ', -300, ' Go in peace."', -300)
                                    looked = true
                                }
                                DL.exit = false
                            }
                            menu()
                        }, prompt: `${cost.value ? 'Pay' : 'Receive'} (Y/N)? `, cancel: 'N', enter: 'Y', eol: false, match: /Y|N/i, max: 1, timeout: 20
                    }
                }
                xvt.app.focus = 'pay'
                return false

            case 'wizard':
                xvt.out(xvt.magenta, 'You encounter a ', xvt.bright)

                if (!$.player.cursed && !$.player.novice && $.dice((Z > $.player.level ? Z : 1) + 20 * $.player.immortal + $.player.level + $.online.cha) == 1) {
                    $.profile({
                        png: ($.PC.name['player'][$.player.pc] || $.PC.name['immortal'][$.player.pc] ? 'player' : 'monster') + '/' + $.player.pc.toLowerCase()
                            + ($.player.gender == 'F' ? '_f' : ''), effect: 'flip'
                    })
                    $.player.coward = true; $.online.altered = true
                    xvt.outln('doppelganger', xvt.normal, ' waiting for you.', -1000)
                    xvt.outln(-1200)

                    $.PC.adjust('str', -10)
                    $.PC.adjust('int', -10)
                    $.PC.adjust('dex', -10)
                    $.PC.adjust('cha', -10)
                    xvt.outln(xvt.bright, 'It curses you!')
                    $.sound('morph', 18)
                    if ($.player.blessed) {
                        $.player.blessed = ''
                        xvt.out(xvt.yellow, 'Your ', -100, xvt.bright, 'shining aura ', -100, xvt.normal, 'left', -100, xvt.faint)
                    }
                    else {
                        $.player.cursed = 'wiz!'
                        xvt.out(xvt.bright, xvt.black, 'A dark cloud hovers over')
                    }
                    $.saveUser($.player)
                    xvt.outln(' you.')
                    $.news(`\tcursed by a doppelganger!`)

                    //	vacate
                    drawHero()
                    $.animated('flipOutY')
                    $.sound('teleport', 12)
                    ROOM.occupant = ''
                    let x: number, y: number
                    do {
                        y = $.dice(DL.rooms.length) - 1
                        x = $.dice(DL.width) - 1
                    } while (DL.rooms[y][x].type == 'cavern' || DL.rooms[y][x].occupant)
                    DL.rooms[y][x].occupant = 'wizard'
                    $.player.coward = false; $.online.altered = true
                }
                else if (!$.player.novice && $.dice(Z + $.online.cha) == 1) {
                    $.profile({
                        png: ($.PC.name['player'][$.player.pc] || $.PC.name['immortal'][$.player.pc] ? 'player' : 'monster') + '/' + $.player.pc.toLowerCase()
                            + ($.player.gender == 'F' ? '_f' : ''), effect: 'flip'
                    })
                    xvt.outln('mimic', xvt.normal, ' occupying this space.', -1000)
                    xvt.outln(-1200)
                    xvt.outln(xvt.faint, 'It waves a hand at you ... ', -800)

                    //	vacate
                    drawHero()
                    $.animated('flipOutY')
                    $.sound('teleport', 12)
                    ROOM.occupant = ''
                    let x: number, y: number
                    do {
                        y = $.dice(DL.rooms.length) - 1
                        x = $.dice(DL.width) - 1
                    } while (DL.rooms[y][x].type == 'cavern' || DL.rooms[y][x].occupant)
                    DL.rooms[y][x].occupant = 'wizard'
                }
                else {
                    $.profile({ jpg: 'npc/wizard', effect: 'backInLeft', handle: 'Pops', level: 77, pc: 'crackpot' })
                    xvt.outln('wizard', xvt.normal, ' in this room.\n', -300)
                    scroll(1, false)
                    teleport()
                    return false
                }
                refresh = true
                pause = true
                break

            case 'dwarf':
                $.profile({ jpg: 'npc/dwarf', effect: 'fadeIn' })
                $.beep()
                xvt.outln(xvt.yellow, 'You run into a ', xvt.bright, 'dwarven merchant', xvt.normal, ', ', $.dwarf.user.handle, '.', -1000)
                let hi = 0, credit = new $.coins(0), ring = $.dwarf.user.rings[0]

                xvt.app.form = {
                    'armor': {
                        cb: () => {
                            xvt.outln()
                            ROOM.occupant = ''
                            if (/Y/i.test(xvt.entry)) {
                                $.player.coin = new $.coins(0)
                                $.Armor.equip($.online, $.Armor.dwarf[hi])
                                $.player.toAC = 2 - $.dice(3)
                                $.online.toAC = $.dice($.online.armor.ac) - 2
                                $.profile({ jpg: `specials/${$.player.armor}`, effect: 'fadeInUpBig' })
                                $.sound('click')
                            }
                            else {
                                xvt.outln()
                                xvt.out(xvt.yellow, $.dwarf.user.handle, ' eyes you suspicously ... ', -600)
                                if ($.player.level > $.dwarf.user.level) {
                                    if ($.Ring.wear($.player.rings, ring))
                                        $.getRing('inherit', ring)
                                    else {
                                        xvt.outln('takes back his ring!')
                                        $.Ring.remove($.player.rings, ring)
                                    }
                                    $.saveRing(ring, $.player.id)
                                    $.sound('click', 8)
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
                            xvt.outln()
                            ROOM.occupant = ''
                            if (/Y/i.test(xvt.entry)) {
                                $.player.coin = new $.coins(0)
                                $.Weapon.equip($.online, $.Weapon.dwarf[hi])
                                $.player.toWC = 2 - $.dice(3)
                                $.online.toWC = $.dice($.online.weapon.wc) - 2
                                $.profile({ jpg: `specials/${$.player.weapon}`, effect: 'fadeInUpBig' })
                                $.sound('click')
                            }
                            else {
                                xvt.out(xvt.yellow, $.dwarf.user.handle, ' evaluates the situation ... ', -600)
                                if ($.player.level > $.dwarf.user.level) {
                                    if ($.Ring.wear($.player.rings, ring)) {
                                        $.getRing('inherit', ring)
                                    }
                                    else {
                                        xvt.outln('takes back his ring!')
                                        $.Ring.remove($.player.rings, ring)
                                    }
                                    $.saveRing(ring, $.player.id)
                                    $.sound('click', 8)
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

                if ($.dice(2) == 1) {
                    let ac = $.Armor.name[$.player.armor].ac
                    xvt.out('\nI see you have a class ', $.bracket(ac, false), ' ', $.PC.armor())
                    ac += $.player.toAC
                    if (ac) {
                        let cv = new $.coins($.Armor.name[$.player.armor].value)
                        credit.value = $.worth(cv.value, $.online.cha)
                        if ($.player.toAC) credit.value = $.int(credit.value * (ac + $.player.toAC / ($.player.poison + 1)) / ac)
                        if ($.online.toAC < 0) credit.value = $.int(credit.value * (ac + $.online.toAC) / ac)
                        if (credit.value > cv.value)
                            credit.value = cv.value
                    }
                    else
                        credit.value = 0
                    xvt.outln(' worth ', credit.carry(), -1000)

                    for (hi = 0; hi < $.Armor.dwarf.length - 1 && ac >= $.Armor.name[$.Armor.dwarf[hi]].ac; hi++);
                    if (new $.coins($.Armor.name[$.Armor.dwarf[hi]].value).value <= credit.value + $.player.coin.value) {
                        if ($.player.coin.value) xvt.outln('  and all your coin worth ', $.player.coin.carry(), -1000)
                        xvt.out(`I'll trade you for my `, xvt.bright
                            , ['exceptional', 'precious', 'remarkable', 'special', 'uncommon'][$.dice(5) - 1], ' '
                            , $.bracket($.Armor.name[$.Armor.dwarf[hi]].ac, false), ' ')
                        xvt.outln(xvt.bright, xvt.yellow, $.Armor.dwarf[hi], -1000)
                        $.action('yn')
                        xvt.drain()
                        xvt.app.focus = 'armor'
                        return false
                    }
                }
                else {
                    let wc = $.Weapon.name[$.player.weapon].wc
                    xvt.out('\nI see you carrying a class ', $.bracket(wc, false), ' ', $.PC.weapon())
                    wc += $.player.toWC
                    if (wc) {
                        let cv = new $.coins($.Weapon.name[$.player.weapon].value)
                        credit.value = $.worth(cv.value, $.online.cha)
                        if ($.player.toWC) credit.value = $.int(credit.value * (wc + $.player.toWC / ($.player.poison + 1)) / wc)
                        if ($.online.toWC < 0) credit.value = $.int(credit.value * (wc + $.online.toWC) / wc)
                        if (credit.value > cv.value)
                            credit.value = cv.value
                    }
                    else
                        credit.value = 0
                    xvt.outln(' worth ', credit.carry())

                    for (hi = 0; hi < $.Weapon.dwarf.length - 1 && wc >= $.Weapon.name[$.Weapon.dwarf[hi]].wc; hi++);
                    if (new $.coins($.Weapon.name[$.Weapon.dwarf[hi]].value).value <= credit.value + $.player.coin.value) {
                        if ($.player.coin.value) xvt.outln('  and all your coin worth ', $.player.coin.carry(), -1000)
                        xvt.out(`I'll trade you for my `, xvt.bright
                            , ['exquisite', 'fine', 'jeweled', 'rare', 'splendid'][$.dice(5) - 1], ' '
                            , $.bracket($.Weapon.name[$.Weapon.dwarf[hi]].wc, false), ' ')
                        xvt.outln(xvt.bright, xvt.cyan, $.Weapon.dwarf[hi], -1000)
                        $.action('yn')
                        xvt.drain()
                        xvt.app.focus = 'weapon'
                        return false
                    }
                }

                $.beep()
                $.animated('fadeOut')
                xvt.outln(`I've got nothing of interest for trading.  Perhaps next time, my friend?`, -1000)
                ROOM.occupant = ''
                break

            case 'witch':
                scroll(1, false)
                $.music('.')
                $.profile({ jpg: 'npc/witch', effect: 'fadeIn' })
                xvt.outln(xvt.green, 'You encounter the ', xvt.bright, 'sorceress', xvt.normal, ', ', $.witch.user.handle, '.')
                $.cat(`dungeon/witch`)
                $.PC.wearing($.witch)
                $.sound('steal', 10)

                let choice: string
                xvt.app.form = {
                    offer: {
                        cb: () => {
                            xvt.outln()
                            $.sound('click', 8)
                            if (/Y/i.test(xvt.entry)) {
                                let result = $.Weapon.swap($.online, $.witch)
                                if (isBoolean(result) && result) {
                                    xvt.outln(xvt.faint, '"', xvt.normal, xvt.green, 'A gift from the gods, I give you ', xvt.reset, $.PC.weapon(), xvt.reset, xvt.faint, '"')
                                    $.sound('click', 13)
                                }
                                result = $.Armor.swap($.online, $.witch)
                                if (isBoolean(result) && result) {
                                    xvt.outln(xvt.faint, '"', xvt.normal, xvt.green, `I offer my crafted `, xvt.reset, $.PC.armor(), xvt.reset, xvt.faint, '"')
                                    $.sound('click', 13)
                                }
                                xvt.out(xvt.faint, '"', xvt.normal, xvt.green, "Your price is ")

                                if ($.player.steal > 1) {
                                    $.sound('mana', 8)
                                    xvt.out('your ability to steal diminishes')
                                    $.player.steal--
                                }
                                else if ($.player.magic > 3) {
                                    $.sound('mana', 8)
                                    xvt.out('your divine spellcasting ability is mine')
                                    $.player.magic--
                                }
                                else if ($.player.melee > 3) {
                                    $.sound('mana', 8)
                                    xvt.out('your barbaric powers are halved')
                                    $.player.melee = 2
                                    $.PC.adjust('str', -5 - $.dice(5), -2, -2)
                                }
                                else if ($.player.str > 80 && $.player.int > 80 && $.player.dex > 80 && $.player.cha > 80) {
                                    $.sound('mana', 8)
                                    xvt.out('allowing me to drain your overall ability')
                                    $.player.blessed = ''
                                    $.PC.adjust('str', -5 - $.dice(5), -2, -2)
                                    $.PC.adjust('int', -5 - $.dice(5), -2, -2)
                                    $.PC.adjust('dex', -5 - $.dice(5), -2, -2)
                                    $.PC.adjust('cha', -5 - $.dice(5), -2, -2)
                                }
                                else {
                                    $.player.level = $.dice(Z)
                                    if ($.online.adept) $.player.level += $.dice($.player.level)
                                    $.reroll($.player, $.PC.random('monster'), $.player.level)
                                    $.activate($.online)
                                    $.online.altered = true
                                    $.player.gender = ['F', 'M'][$.dice(2) - 1]
                                    $.saveUser($.player)
                                    $.sound('crone', 21)
                                    xvt.out(`me morphing you into a level ${$.player.level} ${$.player.pc} (${$.player.gender})`)
                                    $.news(`\tgot morphed by ${$.witch.user.handle} into a level ${$.player.level} ${$.player.pc} (${$.player.gender})!`)
                                }

                                $.music('crack')
                                xvt.outln('!', xvt.reset, xvt.faint, '"', -2100)
                                $.sound('click')

                                switch (choice) {
                                    case 'rings':
                                        let rpc = <active>{ user: { id: '' } }
                                        for (let row in rs) {
                                            rpc.user.id = rs[row].bearer
                                            $.loadUser(rpc)
                                            xvt.outln(`You are given the ${rs[row].name} ring from ${rpc.user.handle}.`)
                                            $.Ring.remove(rpc.user.rings, rs[row].name)
                                            $.saveUser(rpc)
                                            $.Ring.wear(rpc.user.rings, rs[row].name)
                                            $.saveRing(rs[row].name, $.player.id, $.player.rings)
                                            $.sound('click', 8)
                                        }
                                        $.news(`\tgot ${rs.length} magical ring${rs.length > 1 ? 's' : ''} of power from ${$.witch.user.handle}!`)
                                        break

                                    case 'magic':
                                        let m = $.dice($.player.magic + 1)
                                        let retry = 8
                                        for (let i = 0; i < m; i++) {
                                            let p = $.dice(Object.keys($.Magic.spells).length - 12) + 12
                                            let spell = $.Magic.pick(p)
                                            if (!$.Magic.have($.player.spells, spell)) {
                                                $.Magic.add($.player.spells, p)
                                                switch ($.player.magic) {
                                                    case 1:
                                                        $.beep()
                                                        xvt.outln('A ', xvt.white, xvt.bright, `Wand of ${spell}`, xvt.reset, ' appears in your hand.', -600)
                                                        break
                                                    case 2:
                                                        $.beep()
                                                        xvt.outln('You add a ', xvt.yellow, xvt.bright, `Scroll of ${spell}`, xvt.reset, ' to your arsenal.', -600)
                                                        break
                                                    case 3:
                                                        $.sound('shimmer', 8)
                                                        xvt.outln('The ', xvt.cyan, xvt.bright, `Spell of ${spell}`, xvt.reset, ' is revealed to you.', -600)
                                                        break
                                                    case 4:
                                                        $.sound('shimmer', 8)
                                                        xvt.outln(xvt.magenta, xvt.bright, spell, xvt.reset, ' is known to you.', -600)
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
                                        break

                                    case 'curse':
                                        $.sound('resurrect')
                                        $.run(`UPDATE Players SET status='' WHERE id NOT GLOB '_*' AND status!='jail'`)
                                        $.run(`UPDATE Players SET blessed='',coward=1,cursed='${$.witch.user.id}' WHERE id NOT GLOB '_*' AND id != '${$.player.id}'`)
                                        $.news(`\t${$.witch.user.handle} resurrected all the dead and cursed everyone!`)
                                        xvt.outln(xvt.faint, 'The deed is done.', -200)
                                        break
                                }
                            }
                            else {
                                $.player.coward = false
                                witch()
                                return
                            }
                            $.animated('fadeOut')
                            pause = true
                            refresh = true
                            menu()
                        }, prompt: 'Do you accept my offer to help (Y/N)? ', cancel: 'Y', enter: 'Y', eol: false, match: /Y|N/i, max: 1, timeout: 50
                    }
                }

                $.action('yn')
                xvt.drain()
                xvt.outln(-1000)
                xvt.outln(xvt.faint, `${$.PC.who($.witch).He}says, "`
                    , xvt.green, xvt.normal, "Come hither. ", -1200
                    , ['I am niece to Circe known for her vengeful morph', 'My grandfather is the sun god Helios', 'My grandmother is a daughter of the titan Oceanus', 'I am priestess to Hecate, source of my special magicks', 'I trusted an Argonaut. Once'][$.dice(5) - 1], '.'
                    , xvt.reset, xvt.faint, '"', -2400)
                xvt.out(xvt.faint, '"', xvt.normal, xvt.green)
                let rs = $.query(`SELECT name,bearer FROM Rings WHERE bearer != '' AND bearer != '${$.player.id}'`)
                if (rs.length) {
                    xvt.out('I see powerful rings for the taking')
                    choice = 'rings'
                }
                else if (!$.Magic.have($.player.spells, 'Morph')) {
                    xvt.out(`I can ${$.player.magic < 3 ? 'provide' : 'teach'} you advanced magic`)
                    choice = 'magic'
                }
                else {
                    xvt.out('You can choose to '
                        , xvt.reset, xvt.faint, 'resurrect the dead'
                        , xvt.reset, xvt.green, ' and send a '
                        , xvt.reset, xvt.faint, 'Curse throughout the Land'
                        , xvt.reset, xvt.green)
                    choice = 'curse'
                }
                xvt.outln('.', xvt.reset, xvt.faint, '"', -1200)
                xvt.out(xvt.faint, '"', xvt.normal, xvt.green, 'Of course, there is a price to pay, something you may hold dear.', xvt.reset, xvt.faint, '"')
                xvt.app.focus = 'offer'
                ROOM.occupant = ''
                $.sorceress--
                return false
        }

        //	items?
        switch (ROOM.giftItem) {
            case 'armor':
                let xarmor = <active>{ user: Object.assign({}, $.player) }
                $.reroll(xarmor.user)
                xarmor.user.armor = $.Armor.special[ROOM.giftValue]
                $.activate(xarmor)
                if ($.Armor.swap($.online, xarmor)) {
                    $.profile({ jpg: `specials/${$.player.armor}`, effect: 'fadeInUpBig' })
                    xvt.outln(xvt.faint, xvt.yellow, 'You find', xvt.normal, $.an($.player.armor.toString()), xvt.bright, '!')
                    $.sound('max')
                    pause = true
                    ROOM.giftItem = ''
                }
                break

            case 'chest':
                let gold = new $.coins($.money(Z))
                gold.value += $.worth(new $.coins($.online.weapon.value).value, $.online.cha)
                gold.value += $.worth(new $.coins($.online.armor.value).value, $.online.cha)
                gold.value *= +ROOM.giftValue
                gold = new $.coins(gold.carry(1, true))
                if (gold.value) {
                    if (gold.value > 1e+17)
                        gold.value = 1e+17
                    $.profile({ jpg: `specials/chest`, effect: 'fadeInUpBig' })
                    $.sound('yahoo', 10)
                    xvt.outln(xvt.yellow, 'You find a ', xvt.bright, 'treasure chest'
                        , xvt.normal, ' holding ', gold.carry(), '!')
                }
                else {
                    xvt.outln(xvt.faint, xvt.yellow, 'You find an empty, treasure chest.')
                    $.sound('boo')
                }
                $.player.coin.value += gold.value
                pause = true
                ROOM.giftItem = ''
                break

            case 'magic':
                if (!$.Magic.have($.player.spells, +ROOM.giftValue)) {
                    xvt.outln(xvt.bright, xvt.yellow, 'You find a '
                        , xvt.cyan, $.Magic.merchant[+ROOM.giftValue - 1], xvt.yellow
                        , ' ', $.player.magic == 2 ? 'scroll' : 'wand', '!')
                    $.Magic.add($.player.spells, +ROOM.giftValue)
                    pause = true
                    ROOM.giftItem = ''
                }
                break

            case 'map':
                DL.map = `Marauder's map`
                xvt.outln(xvt.bright, xvt.yellow, `You find ${DL.map}!`)
                pause = true
                refresh = true
                ROOM.giftItem = ''
                break

            case 'poison':
                if (!$.Poison.have($.player.poisons, +ROOM.giftValue)) {
                    xvt.outln(xvt.bright, xvt.yellow, 'You find a vial of '
                        , $.Poison.merchant[+ROOM.giftValue - 1], '!')
                    $.Poison.add($.player.poisons, +ROOM.giftValue)
                    pause = true
                    ROOM.giftItem = ''
                }
                break

            case 'potion':
                let id = false
                if (DL.moves < DL.width && !ROOM.giftID)
                    ROOM.giftID = !$.player.novice
                        && $.dice(100 + +ROOM.giftValue) < ($.online.int / 20 * (1 << $.player.poison) + ($.online.int > 90 ? ($.online.int % 90) << 1 : 0))

                $.sound('bubbles')
                xvt.out(xvt.cyan, 'On the ground, you find a ')
                if ($.Ring.power([], $.player.rings, 'identify').power) potions[ROOM.giftValue].identified = true
                if (potions[ROOM.giftValue].identified || ROOM.giftID || $.access.sysop) {
                    $.profile({ png: potions[ROOM.giftValue].image, handle: potion[ROOM.giftValue], effect: 'fadeInUp' })
                    xvt.out(xvt.bright, potion[ROOM.giftValue], xvt.normal, '.')
                    if (!potions[ROOM.giftValue].identified)	//	recall seeing this before
                        potions[ROOM.giftValue].identified = $.player.novice || $.online.int > (85 - 4 * $.player.poison)
                    id = true
                }
                else {
                    $.profile({ png: potions[ROOM.giftValue].image, handle: 'Is it ' + 'nt'[$.dice(2) - 1] + 'asty, precious?', effect: 'fadeInUp' })
                    xvt.out(potions[ROOM.giftValue].description, xvt.cyan, xvt.bright, ' potion', xvt.normal, '.')
                }

                if (id ||
                    ($.dice(100 + 10 * +ROOM.giftValue * +$.player.coward) + $.dice(deep / 2) < (50 + $.int($.online.int / 2)) && $.dice(100) > 1)) {
                    $.action('potion')
                    xvt.app.form = {
                        'quaff': {
                            cb: () => {
                                xvt.outln('\n')
                                if (/N/i.test(xvt.entry)) {
                                    looked = true
                                    menu()
                                    return
                                }
                                if (/Y/i.test(xvt.entry))
                                    quaff(+ROOM.giftValue)
                                else if (/T/i.test(xvt.entry)) {
                                    quaff(+ROOM.giftValue, false)
                                    $.sound('click')
                                    pause = false
                                }
                                ROOM.giftItem = ''
                                menu()
                            }, prompt: 'Will you drink it (Yes/No/Toss)? ', cancel: 'T', enter: 'N', eol: false, match: /Y|N|T/i, timeout: 10
                        }
                    }
                    xvt.app.focus = 'quaff'
                    return false
                }
                else {
                    let auto = $.dice(2) < 2
                    xvt.outln(xvt.faint, '\nYou ', -500, auto ? 'quaff' : 'toss', ' it without hesitation.', -500)
                    quaff(+ROOM.giftValue, auto)
                    ROOM.giftItem = ''
                }
                break

            case 'ring':
                let ring = ROOM.giftValue.toString()
                if (!$.ringBearer(ring) && $.Ring.wear($.player.rings, ring)) {
                    $.getRing('find', ring)
                    $.saveRing(ring, $.player.id, $.player.rings)
                    pause = true
                    ROOM.giftItem = ''
                }
                break

            case 'weapon':
                let xweapon = <active>{ user: Object.assign({}, $.player) }
                $.reroll(xweapon.user)
                xweapon.user.weapon = $.Weapon.special[ROOM.giftValue]
                $.activate(xweapon)
                if ($.Weapon.swap($.online, xweapon)) {
                    $.profile({ jpg: `specials/${$.player.weapon}`, effect: 'fadeInUpBig' })
                    xvt.outln(xvt.faint, xvt.cyan, 'You find', xvt.normal, $.an($.player.weapon.toString()), xvt.bright, '!')
                    $.sound('max')
                    pause = true
                    ROOM.giftItem = ''
                }
                break

            case 'xmagic':
                if (!$.Magic.have($.player.spells, ROOM.giftValue)) {
                    xvt.outln(xvt.bright, xvt.yellow, 'You find a '
                        , xvt.magenta, $.Magic.special[+ROOM.giftValue - $.Magic.merchant.length - 1], xvt.yellow
                        , ' ', $.player.magic == 1 ? 'wand' : 'scroll', '!')
                    $.Magic.add($.player.spells, +ROOM.giftValue)
                    pause = true
                    ROOM.giftItem = ''
                }
                break
        }

        return true
    }

    function doSpoils() {
        if ($.reason) {
            if (deep) $.reason += `-${$.romanize(deep + 1)}`
            DL.map = `Marauder's map`
            scroll()
            xvt.hangup()
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
                    let y = $.dice(DL.rooms.length) - 1
                    let x = $.dice(DL.width) - 1
                    mon.hp = Math.abs(mon.hp) + $.int(mon.user.hp / ($.dice(5) + 5))
                    mon.sp += $.int(mon.user.sp / ($.dice(5) + 5))
                    DL.rooms[y][x].monster.push(mon)
                }
                else {
                    //	defeated a significantly larger denizen on this level, check for any added bonus(es)
                    if (!$.player.coward && (mon.user.xplevel - Z) > 5) {
                        if ($.player.cursed) {
                            xvt.outln(xvt.bright, xvt.black, 'The dark cloud has left you.')
                            $.player.cursed = ''
                        }
                        let m = $.int((mon.user.xplevel - Z) / 6)
                        $.beep()
                        xvt.out(xvt.lyellow, `+ ${mon.user.pc} bonus`)
                        if ($.int(mon.pc.bonusStr)) {
                            $.PC.adjust('str', m * mon.pc.bonusStr, m * mon.pc.bonusStr, m * mon.pc.bonusStr)
                            xvt.out(xvt.lred, ' strength', $.bracket(`+${m * mon.pc.bonusStr}`, false))
                        }
                        $.PC.adjust('str', m)
                        if ($.int(mon.pc.bonusInt)) {
                            $.PC.adjust('int', m * mon.pc.bonusInt, m * mon.pc.bonusInt, m * mon.pc.bonusInt)
                            xvt.out(xvt.lmagenta, ' intellect', $.bracket(`+${m * mon.pc.bonusInt}`, false))
                        }
                        $.PC.adjust('int', m)
                        if ($.int(mon.pc.bonusDex)) {
                            $.PC.adjust('dex', m * mon.pc.bonusDex, m * mon.pc.bonusDex, m * mon.pc.bonusDex)
                            xvt.out(xvt.lcyan, ' dexterity', $.bracket(`+${m * mon.pc.bonusDex}`, false))
                        }
                        $.PC.adjust('dex', m)
                        if ($.int(mon.pc.bonusCha)) {
                            $.PC.adjust('cha', m * mon.pc.bonusCha, m * mon.pc.bonusCha, m * mon.pc.bonusCha)
                            xvt.out(xvt.lgreen, ' charisma', $.bracket(`+${m * mon.pc.bonusCha}`, false))
                        }
                        $.PC.adjust('cha', m)
                        xvt.outln('\n', -500)
                        Battle.yourstats(false)
                        xvt.outln(-500)
                        DL.moves >>= 1
                    }
                }
                //	activate this monster's avenge?
                if (mon.user.xplevel == 0) {
                    $.sound('oops')
                    ROOM.monster[n].monster.effect = 'flip'
                    monsters[mon.user.handle].pc = '*'	//	chaos
                    $.activate(mon)
                    for (let i = 0; i < $.dice(3); i++) {
                        let avenger = <active>{ monster: { name: '', pc: '' }, user: { id: '' } }
                        Object.assign(avenger.user, mon.user)
                        avenger.user.pc = $.PC.random('monster')
                        avenger.user.handle += xvt.attr(' ', xvt.uline, 'avenger', xvt.nouline)
                        $.reroll(avenger.user, avenger.user.pc, $.int(avenger.user.level / 2))
                        for (let magic in ROOM.monster[n].monster.spells)
                            $.Magic.add(avenger.user.spells, ROOM.monster[n].monster.spells[magic])
                        for (let poison in ROOM.monster[n].monster.poisons)
                            $.Poison.add(avenger.user.poisons, ROOM.monster[n].monster.poisons[poison])
                        avenger.user.steal = 2
                        $.activate(avenger)
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
                    $.sound('heal', 3)
                    let ha = $.player.magic > 2 ? $.int($.player.level / 16) + 13 : 16
                    let hr = 0
                    for (let i = 0; i < $.player.level; i++)
                        hr += $.dice(ha)
                    $.online.hp += hr
                    if ($.online.hp > $.player.hp)
                        $.online.hp = $.player.hp
                }
                else if (ROOM.monster[n].user.xplevel < 0)
                    ROOM.monster.splice(n, 1)	//	remove an illusion
            }
        }

        if (!ROOM.monster.length) {
            if ((!DL.map || DL.map == 'map') && $.dice((15 - $.online.cha / 10) / 2) == 1) {
                let m = <MAP>['', 'map', 'magic map'][($.dice(Z / 33 + 2) > 1 ? 1 : 2)]
                if (DL.map.length < m.length) {
                    DL.map = m
                    $.sound('click')
                    xvt.outln(xvt.yellow, xvt.bright, 'You find a ', m, '!')
                    pause = true
                }
            }
            //	> 3 monsters
            if (b4 < 0) {
                xvt.outln(-100)
                $.sound('effort')
                xvt.outln(xvt.green, xvt.bright, '+ ', xvt.normal, 'bonus charisma', -200)
                $.PC.adjust('cha', $.dice(Math.abs(b4)), 1, 1)
                pause = true
            }
            //	the wounded warrior just surviving any mob size
            //	and without a magic map nor any visit to the cleric yet ...
            if ((b4 !== 0 && (!DL.map || DL.map !== 'map') && DL.cleric.sp == DL.cleric.user.sp)
                && ((b4 > 0 && b4 / $.player.hp < 0.67 && $.online.hp / $.player.hp < 0.067)
                    || ($.online.hp <= Z + deep + 1))) {
                xvt.outln(-100)
                $.sound('bravery', 20)
                xvt.outln(xvt.red, xvt.bright, '+ ', xvt.normal, 'bonus strength', -600)
                $.PC.adjust('str', deep + 2, deep + 1, 1)
                DL.map = `Marauder's map`
                xvt.outln(xvt.bright, xvt.yellow, ' and ', DL.map, '!', -600)
                pause = true
            }
        }

        if (Battle.teleported) {
            Battle.teleported = false
            if (Battle.expel) {
                Battle.expel = false
                $.PC.profile($.online, 'flipOutX')
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
                $.PC.profile($.online, 'lightSpeedOut', ` - Dungeon ${$.romanize(deep + 1)}.${Z + 1}`)
                Y = $.dice(DL.rooms.length) - 1
                X = $.dice(DL.width) - 1
            }
            menu()
            return
        }

        if (Battle.retreat) $.PC.profile($.online, 'heartBeat', ` - Dungeon ${$.romanize(deep + 1)}.${Z + 1}`)

        let d = ['N', 'S', 'E', 'W']
        while (Battle.retreat && !$.reason) {
            $.music('pulse')
            xvt.out(-375, xvt.bright, xvt.red, 'You frantically look to escape . . . ', -375)

            let i = $.dice(d.length) - 1
            switch (d[i]) {
                case 'N':
                    if (Y > 0 && DL.rooms[Y][X].type !== 'w-e')
                        if (DL.rooms[Y - 1][X].type !== 'w-e') {
                            Battle.retreat = false
                            Y--
                            looked = false
                            $.animated('fadeOutUp')
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
                            $.animated('fadeOutDown')
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
                            $.animated('fadeOutRight')
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
                            $.animated('fadeOutLeft')
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
        xvt.save()

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

        xvt.plot(Y * 2 + 2, X * 6 + 2)
        if ($.online.hp > 0) {
            if ($.player.emulation == 'XT')
                xvt.out($.player.blessed ? xvt.Cyan : $.player.cursed ? xvt.lBlue : xvt.lBlack
                    , ' '
                    , ($.player.toWC + $.online.toWC) > 0 ? xvt.attr(xvt.bright, xvt.cyan)
                        : ($.player.toWC + $.online.toWC) < 0 ? xvt.attr(xvt.bright, xvt.magenta)
                            : xvt.cyan
                    , $.online.weapon.wc ? '⚸' : ' '
                    , $.player.blessed ? xvt.bright : xvt.normal
                    , $.online.hp > $.player.hp * 2 / 3 ? xvt.white : $.online.hp > $.player.hp / 3 ? xvt.yellow : xvt.red
                    , $.PC.card($.player.pc).unicode
                    , ($.player.toAC + $.online.toAC) > 0 ? xvt.attr(xvt.normal, xvt.bright)
                        : ($.player.toAC + $.online.toAC) < 0 ? xvt.attr(xvt.normal, xvt.faint)
                            : xvt.normal, xvt.yellow
                    , $.online.armor.ac ? '⛨' : ' '
                    , ' ')
            else
                xvt.out($.player.blessed ? xvt.bright : $.player.cursed ? xvt.faint : xvt.off
                    , xvt.reverse, '-YOU-')
        }
        else
            xvt.out(xvt.Blue, xvt.cyan, xvt.bright, xvt.reverse
                , `  ${$.player.emulation == 'XT' ? $.PC.card($.player.pc).unicode : 'X'}  `, -600)

        xvt.restore()
        xvt.out(xvt.off)
    }

    function eraseHero(peek = false) {
        xvt.out(xvt.reset)
        xvt.save()
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
        xvt.restore()

        drawRoom(Y, X)
    }

    function drawLevel() {
        let y: number, x: number, m: number

        $.clear()

        if (DL.map) {
            for (y = 0; y < paper.length; y++) {
                if (y % 2) {
                    for (x = 0; x < DL.width; x++) {
                        if ($.player.emulation == 'VT') xvt.out('\x1B(0', xvt.faint, paper[y].substr(6 * x, 1), '\x1B(B')
                        else xvt.out(xvt.black, xvt.bright, paper[y].substr(6 * x, 1))

                        let r = $.int(y / 2)
                        occupying(DL.rooms[r][x], xvt.attr(xvt.reset, xvt.faint)
                            , (DL.map && DL.map !== 'map')
                            || (DL.rooms[r][x].map && Math.abs(Y - r) < $.int($.online.int / 15) && Math.abs(X - x) < $.int($.online.int / 15))
                            , DL.map == `Marauder's map` || ($.Ring.power([], $.player.rings, 'identify').power > 0))
                    }
                    if ($.player.emulation == 'VT') xvt.out('\x1B(0', xvt.faint, paper[y].substr(-1), '\x1B(B')
                    else xvt.out(xvt.black, xvt.bright, paper[y].substr(-1))
                }
                else {
                    if ($.player.emulation == 'VT') xvt.out('\x1B(0', xvt.faint, paper[y], '\x1B(B')
                    else xvt.out(xvt.black, xvt.bright, paper[y])
                }
                xvt.outln()
            }
        }
        else {
            for (y = 0; y < DL.rooms.length; y++)
                for (x = 0; x < DL.width; x++)
                    if (DL.rooms[y][x].map)
                        drawRoom(y, x, false)
        }

        xvt.plot(paper.length + 1, 1)
        if ($.online.hp > 0) scroll(paper.length + 1, false)
        refresh = false
    }

    function drawRoom(r: number, c: number, keep = true, peek = false) {
        if (keep) xvt.save()
        ROOM = DL.rooms[r][c]
        if (peek && !ROOM.map)
            if ($.online.int > 49)
                ROOM.map = true

        let row = r * 2, col = c * 6
        if (!DL.map) {
            xvt.plot(row + 1, col + 1)
            if ($.player.emulation == 'VT') xvt.out('\x1B(0', xvt.faint, paper[row].substr(col, 7), '\x1B(B')
            else xvt.out(xvt.black, xvt.bright, paper[row].substr(col, 7))
        }

        row++
        xvt.plot(row + 1, col + 1)
        if ($.player.emulation == 'VT') xvt.out('\x1B(0', xvt.faint, paper[row].substr(col, 1), '\x1B(B')
        else xvt.out(xvt.black, xvt.bright, paper[row].substr(col, 1))

        occupying(ROOM, peek ? xvt.attr(xvt.reset) : xvt.attr(xvt.reset, xvt.faint), (DL.map && DL.map !== 'map')
            || (ROOM.map && Math.abs(Y - r) < $.int($.online.int / 15) && Math.abs(X - c) < $.int($.online.int / 15)),
            peek || DL.map == `Marauder's map` || ($.Ring.power([], $.player.rings, 'identify').power > 0))

        if ($.player.emulation == 'VT') xvt.out('\x1B(0', xvt.faint, paper[row].substr(col + 6, 1), '\x1B(B')
        else xvt.out(xvt.black, xvt.bright, paper[row].substr(col + 6, 1))

        if (!DL.map) {
            row++
            xvt.plot(row + 1, col + 1)
            if ($.player.emulation == 'VT') xvt.out('\x1B(0', xvt.faint, paper[row].substr(col, 7), '\x1B(B')
            else xvt.out(xvt.black, xvt.bright, paper[row].substr(col, 7))
        }
        if (keep) xvt.restore()
    }

    function generateLevel() {

        $.title(`${$.player.handle}: level ${$.player.level} ${$.player.pc} - Dungeon ${$.romanize(deep + 1)}.${Z + 1}`)
        $.action('clear')

        looked = false
        refresh = true

        if (!dd[deep])
            dd[deep] = new Array($.sysop.level)

        //  re-entry?
        if (dd[deep][Z]) {
            DL = dd[deep][Z]
            renderMap()

            do {
                Y = $.dice(DL.rooms.length) - 1
                X = $.dice(DL.width) - 1
                ROOM = DL.rooms[Y][X]
            } while (ROOM.type) //  teleport into a chamber only

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
            let maxRow = 6 + $.dice(Z / 32 + 1)
            while (maxRow < 10 && $.dice($.online.cha / 10) == 1)
                maxRow++
            let maxCol = 6 + $.dice(Z / 16 + 1)
            while (maxCol < 13 && $.dice($.online.cha / 10) == 1)
                maxCol++

            //  template level
            dd[deep][Z] = <ddd>{
                alert: true,
                cleric: {
                    user: {
                        id: '_Clr', handle: 'old cleric', pc: 'Cleric', level: $.int(65 + Z / 4 + deep)
                        , sex: 'I', weapon: 0, armor: 1, magic: 3, spells: [7, 8, 13]
                    }
                },
                events: $.dice(6 - $.int($.online.cha / 20)) + $.dice(deep / 3 + 1) + +$.player.coward
                    - +$.player.novice - +$.access.sysop,
                exit: false,
                map: '',
                mob: (deep < 4 && Z < 4) ? 1 : (Z > 9 && Z < 50) || (deep > 7) ? 3 : 2,
                moves: -maxCol - (($.player.novice || $.access.sysop) ? maxRow + maxCol : $.player.wins),
                rooms: new Array(maxRow),
                spawn: $.int(deep / 3 + Z / 9 + maxRow / 3) + $.dice(Math.round($.online.cha / 20) + 1) + 3,
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
                    while ((n = $.int(($.dice(4) + $.dice(4)) / 2) - 1) == 3);
                    if (n == 1 && $.dice(10 - deep) == n) n += 2 - $.dice(3)
                    ROOM.type = (n == 0) ? 'cavern' : (n == 1) ? '' : $.dice(2) == 1 ? 'n-s' : 'w-e'
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

        $.reroll(DL.cleric.user, DL.cleric.user.pc, DL.cleric.user.level)
        $.activate(DL.cleric)
        $.wall(`enters dungeon level ${$.romanize(deep + 1)}.${Z + 1}`)

        renderMap()
        do {
            Y = $.dice(DL.rooms.length) - 1
            X = $.dice(DL.width) - 1
            ROOM = DL.rooms[Y][X]
        } while (ROOM.type)

        //	populate this new floor with monsters ...
        let n = $.int(DL.rooms.length * DL.width / 6) + $.dice(Z / 9) + $.dice(deep)
            + $.dice(Z < 50 && $.online.cha < 80 ? ((80 - $.online.cha) / 9) : ((100 - $.online.cha) / 3))
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
            if ($.dice($.online.str - dank) <= dank) {
                y = $.dice(DL.rooms.length) - 1
                x = $.dice(DL.width) - 1
                DL.rooms[y][x].occupant = 'dwarf'
            }
            //	wheel of life
            if ($.dice(100 - level + dank) <= dank) {
                y = $.dice(DL.rooms.length) - 1
                x = $.dice(DL.width) - 1
                DL.rooms[y][x].occupant = 'wheel'
            }
            //	wishing well
            if ($.dice((120 - level) / 3 - dank) == 1) {
                y = $.dice(DL.rooms.length) - 1
                x = $.dice(DL.width) - 1
                DL.rooms[y][x].occupant = 'well'
            }
            //	wicked old witch
            if ($.sorceress && Z > 20 && dank > 4 && $.dice((120 - level) / 3 - dank) == 1) {
                y = $.dice(DL.rooms.length) - 1
                x = $.dice(DL.width) - 1
                DL.rooms[y][x].occupant = 'witch'
            }
            //	deep dank dungeon portal
            if (deep < 9 && deep < $.player.immortal && Z / 9 < $.player.immortal) {
                y = $.dice(DL.rooms.length) - 1
                x = $.dice(DL.width) - 1
                DL.rooms[y][x].occupant = 'portal'
            }
        }
        //	thief(s) in other spaces
        if (!$.player.novice && $.dice(100 / dank * level) <= dank)
            wow = $.int($.dice(DL.rooms.length) * $.dice(DL.width) / 2)
        if (!$.player.coward) wow--
        n = $.dice(deep / 4) + wow
        for (let i = 0; i < n; i++) {
            do {
                y = $.dice(DL.rooms.length) - 1
                x = $.dice(DL.width) - 1
            } while (DL.rooms[y][x].type == 'cavern')
            DL.rooms[y][x].occupant = 'thief'
        }

        //	a cleric in another space
        do {
            y = $.dice(DL.rooms.length) - 1
            x = $.dice(DL.width) - 1
        } while (DL.rooms[y][x].type == 'cavern' || DL.rooms[y][x].monster.length || DL.rooms[y][x].occupant)
        DL.rooms[y][x].occupant = 'cleric'

        //	a wizard in another space
        do {
            y = $.dice(DL.rooms.length) - 1
            x = $.dice(DL.width) - 1
        } while (DL.rooms[y][x].type == 'cavern' || DL.rooms[y][x].monster.length || DL.rooms[y][x].occupant)
        DL.rooms[y][x].occupant = 'wizard'

        //	set some trapdoors
        n = $.int(DL.rooms.length * DL.width / 10)
        if ($.dice(100 - Z) > (deep + 1))
            n += $.dice(Z / 16 + 2)
        while (n--) {
            y = $.dice(DL.rooms.length) - 1
            x = $.dice(DL.width) - 1
            if (!DL.rooms[y][x].occupant)
                DL.rooms[y][x].occupant = 'trapdoor'
        }

        //	help will always be given at Hogwarts to those who deserve it
        if (!$.player.coward)
            if ($.player.novice || $.dice($.player.wins * dank + $.player.immortal + 1) >= (dank + level)) {
                y = $.dice(DL.rooms.length) - 1
                x = $.dice(DL.width) - 1
                DL.rooms[y][x].giftItem = 'map'
                DL.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '⎅' : Dot
            }

        //	populate treasure(s)
        wow = 1
        if (!$.player.novice && !$.player.coward)
            if ($.dice(100 / dank * level) <= dank)
                wow += $.int($.dice(DL.rooms.length) * $.dice(DL.width) / 2)
        wow += $.dice(level / 33) + $.dice(dank / 3) - 2

        //  generate a roulette (12-25) of gift types
        //  relative to character class better interests
        let gift: GIFT[] = ['map', 'armor', 'chest', 'poison', 'weapon']
        //  allow for any non-spell caster a chance for a magical item
        if ($.player.magic < 3)
            gift.push('ring', $.dice(10 + dank - 2 * $.player.magic) > dank ? 'magic' : 'xmagic')
        for (let j = 5; j > 0; j--) {
            if (j > $.player.magic) {
                if ($.player.magic > 2)
                    gift.push('ring')
                if ($.player.magic > 0 && $.player.magic < 3)
                    gift.push($.dice(10 + dank - 2 * $.player.magic) > dank ? 'magic' : 'xmagic')
            }
            else
                gift.push('armor', 'weapon')
            if ($.player.poison)
                gift.push('poison')
            else
                gift.push('chest')
        }

        for (let i = 0; i < wow; i++) {
            do {
                y = $.dice(DL.rooms.length) - 1
                x = $.dice(DL.width) - 1
            } while (DL.rooms[y][x].giftItem || DL.rooms[y][x].occupant == 'wizard')
            if ($.Ring.power([], $.player.rings, 'identify').power) DL.rooms[y][x].map = true

            //	magic potion
            if ($.dice(111 - $.online.cha) > $.dice(dank) - +$.player.coward) {
                DL.rooms[y][x].giftItem = 'potion'
                DL.rooms[y][x].giftID = false
                DL.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '≬' : Dot
                n = $.dice(130 - deep)
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
            if (gift.length) {
                v = $.dice(gift.length) - 1
                DL.rooms[y][x].giftItem = gift.splice(v, 1)[0]
            }
            DL.rooms[y][x].giftValue = 0
            v = 0

            switch (DL.rooms[y][x].giftItem) {
                case 'armor':
                    DL.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '⛨' : Dot
                    n = $.Armor.special.length - 1
                    for (v = 0; v < n && $.online.armor.ac >= $.Armor.name[$.Armor.special[v]].ac; v++);
                    break

                case 'chest':
                    DL.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '⌂' : Dot
                    v = $.dice(8 + 2 * (deep + $.player.steal)) - 1
                    break

                case 'magic':
                    DL.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '∗' : Dot
                    n = $.dice($.Magic.merchant.length * 16)
                    for (let j = 0; j < $.Magic.merchant.length && n > 0; j++) {
                        v = $.Magic.merchant.length - j
                        n -= j + 1
                    }
                    break

                case 'map':
                    DL.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '⎅' : Dot
                    v = 1
                    break

                case 'poison':
                    DL.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '⏽' : Dot
                    n = $.dice($.Poison.merchant.length * 16)
                    for (let j = 0; j < $.Poison.merchant.length && n > 0; j++) {
                        v = $.Poison.merchant.length - j
                        n -= j + 1
                    }
                    break

                case 'ring':
                    if ($.Ring.have($.player.rings, $.Ring.theOne)) DL.rooms[y][x].map = true
                    DL.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '⍤' : Dot
                    if ($.dice(6 - $.int(dank / 2)) > 1) {
                        let ring = $.Ring.common[$.dice($.Ring.common.length) - 1]
                        DL.rooms[y][x].giftValue = ring
                    }
                    else {
                        let ring = $.Ring.unique[$.dice($.Ring.unique.length) - 1]
                        DL.rooms[y][x].giftValue = ring
                    }
                    break

                case 'weapon':
                    DL.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '⚸' : Dot
                    n = $.Weapon.special.length - 1
                    for (v = 0; v < n && $.online.weapon.wc >= $.Weapon.name[$.Weapon.special[v]].wc; v++);
                    break

                case 'xmagic':
                    DL.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '⋇' : Dot
                    v = $.Magic.merchant.length + $.dice($.Magic.special.length)
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
            let min = $.checkTime()
            if (Z == 99 || Z - $.player.level > 8) {
                tl = min
                $.music('tension' + $.dice(3))
            }
            else if (tl - min > 4) {
                tl = min
                $.music((deep % 2 ? 'ddd' : 'dungeon') + $.dice(9))
            }

            const box = xvt.app.Draw
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
            for (n = 0; n < 4; n++) level += $.dice(7)

            switch (level >> 2) {
                case 1:
                    level = $.dice(Z / 2)
                    break
                case 2:
                    level = Z - 3 - $.dice(3)
                    break
                case 3:
                    level = Z - $.dice(3)
                    break
                case 4:
                    level = Z
                    break
                case 5:
                    level = Z + $.dice(3)
                    break
                case 6:
                    level = Z + 3 + $.dice(3)
                    break
                case 7:
                    level = Z + $.dice(Z < 40 ? Z / 2 : Z < 60 ? Z / 3 : Z < 80 ? Z / 4 : Z / 5)
                    break
            }
        }

        while (level < 1) level += $.dice(4) + $.dice(3) - 1
        if (level > 99) level = 100 - $.dice(10)

        let v = 1
        if (level > 9 && level < 90) {
            v = $.dice(12)
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
            dm.pc = $.PC.random('monster')
            m.user.handle += ' avenger'
            m.user.steal = $.player.steal + 1
        }
        m.monster = dm
        m.effect = dm.effect || 'pulse'
        $.reroll(m.user, dm.pc ? dm.pc : $.player.pc, n)
        if (m.user.xplevel) m.user.xplevel = level
        if (!dm.pc) m.user.steal = $.player.steal + 1

        if (dm.weapon)
            m.user.weapon = dm.weapon
        else {
            m.user.weapon = $.int((level + deep) / 100 * $.int($.sysop.weapon))
            m.user.weapon = $.int((m.user.weapon + $.online.weapon.wc) / 2)
            if ($.player.level <= Z
                && $.dice(12 + deep / 2 + $.player.level / 4 - $.online.cha / 10) <= $.dice(deep / 3 + 1)) {
                n = $.online.weapon.wc + $.dice(3) - 2
                n = n < 1 ? 1 : n >= $.Weapon.merchant.length ? $.Weapon.merchant.length - 1 : n
                m.user.weapon = $.Weapon.merchant[n]
            }
        }

        if (dm.armor)
            m.user.armor = dm.armor
        else {
            m.user.armor = $.int((level + deep) / 100 * $.int($.sysop.armor))
            m.user.armor = $.int((m.user.armor + $.online.armor.ac) / 2)
            if ($.player.level <= Z
                && $.dice(11 + deep / 3 + $.player.level / 3 - $.online.cha / 11) <= $.dice(deep / 3 + 1)) {
                n = $.online.armor.ac + $.dice(3) - 2
                n = n < 1 ? 1 : n >= $.Armor.merchant.length ? $.Armor.merchant.length - 1 : n
                m.user.armor = $.Armor.merchant[n]
            }
        }

        m.user.hp = $.int(m.user.hp / (4 + (m.user.level / 100)) + (deep * Z / 4))
        n = 5 - $.dice(deep / 3)
        m.user.sp = $.int(m.user.sp / n)

        m.user.poisons = []
        if (m.user.poison) {
            if (dm.poisons)
                for (let vials in dm.poisons)
                    $.Poison.add(m.user.poisons, dm.poisons[vials])
            for (n = 0; n < Object.keys($.Poison.vials).length - (9 - deep); n++) {
                if ($.dice($.int($.player.cha / (deep + 1)) + (n << 2)) < (+$.player.coward + 2)) {
                    let vial = $.Poison.pick(n)
                    if (!$.Poison.have(m.user.poisons, vial))
                        $.Poison.add(m.user.poisons, n)
                }
            }
        }

        m.user.rings = dm.rings || []

        m.user.spells = []
        if (m.user.magic) {
            if (dm.spells)
                for (let magic in dm.spells)
                    $.Magic.add(m.user.spells, dm.spells[magic])
            for (n = 0; n < Object.keys($.Magic.spells).length - (9 - deep); n++) {
                if ($.dice($.int($.player.cha / (deep + 1)) + (n << 2)) < (+$.player.coward + 2)) {
                    let spell = $.Magic.pick(n)
                    if (!$.Magic.have(m.user.spells, spell))
                        $.Magic.add(m.user.spells, n)
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
                r = $.dice(DL.rooms.length) - 1
                c = $.dice(DL.width) - 1
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
            level = $.dice(Z / DL.mob) + (Z <= 60 ? $.int(Z / 6) : 30) + $.dice(deep) - 1
            genMonster(dm, m, 0, level)
            if (room.monster.length) sum = room.monster[0].user.level
        }

        do {
            //	add the monster, including any lower "strays" as fodder
            i = room.monster.push(m) - 1
            m = room.monster[i]
            level = m.user.level
            sum += level
            $.activate(m)

            m.user.immortal = deep
            m.adept = $.dice(Z / 30 + deep / 4 + 1) - 1
            $.PC.adjust('str', deep - 2, 0, deep >> 2, m)
            $.PC.adjust('int', deep - 2, 0, deep >> 2, m)
            $.PC.adjust('dex', deep - 2, 0, deep >> 2, m)
            $.PC.adjust('cha', deep - 2, 0, deep >> 2, m)

            let gold = new $.coins($.int($.money(level) / (11 - deep)))
            gold.value += $.worth(new $.coins(m.weapon.value).value, $.dice($.online.cha / 5) + $.dice(deep) - +$.player.coward)
            gold.value += $.worth(new $.coins(m.armor.value).value, $.dice($.online.cha / 5) + $.dice(deep) - +$.player.coward)
            gold.value *= $.dice(deep * 2 / 3)
            gold.value++
            m.user.coin = new $.coins(gold.carry(1, true))

            if (+m.user.weapon) {
                if (dm.hit) m.weapon.hit = dm.hit
                if (dm.smash) m.weapon.smash = dm.smash
            }

            //  prep next should this event be spawning a lesser mob
            level += $.dice(room.monster.length + 2) - (room.monster.length + 1)
            dm = { name: '', pc: '' }
            m = { monster: { name: '', pc: '' }, user: { id: '', sex: 'I' } }
            genMonster(dm, m, 0, level)
        } while (room.monster.length < $.int(3 + DL.mob + deep / 3) && sum < (Z - 3 - room.monster.length))

        return true
    }

    function merchant() {
        scroll(1, false)
        let dwarf = <active>{ user: { id: '' } }
        Object.assign(dwarf.user, $.dwarf.user)
        $.activate(dwarf)
        xvt.outln(xvt.yellow, $.PC.who(dwarf).He, 'scowls in disgust, '
            , xvt.bright, `"Never trust${$.an($.player.pc)}!"`)
        $.PC.wearing(dwarf)
        $.sound('ddd', 20)
        Battle.engage('Merchant', party, dwarf, doSpoils)
    }

    function witch() {
        let witch = <active>{ user: { id: '' } }
        Object.assign(witch.user, $.witch.user)
        $.activate(witch)
        xvt.outln()
        xvt.outln(xvt.green, $.PC.who(witch).His, 'disdained look sends a chill down your back.', -1200)
        xvt.outln(xvt.green, xvt.bright, `"Puny ${$.player.pc} -- you earned my wrath!"`)
        $.sound('god', 28)
        $.music('boss' + $.dice(3))
        Battle.engage('Witch', party, witch, doSpoils)
    }

    //  old cleric mana recovery
    function recovery(factor = DL.cleric.user.level) {
        if (!DL.cleric.user.status) {
            DL.cleric.sp += $.int($.Magic.power(DL.cleric, 7) * DL.cleric.user.level / factor)
            if (DL.cleric.sp > DL.cleric.user.sp) DL.cleric.sp = DL.cleric.user.sp
        }
    }

    function teleport() {
        let min = $.checkTime()

        $.action('teleport')
        xvt.outln(xvt.yellow, xvt.bright, 'What do you wish to do?')
        xvt.out($.bracket('U'), 'Teleport up 1 level')
        if (Z < 99) xvt.out($.bracket('D'), 'Teleport down 1 level')
        xvt.out($.bracket('O'), `Teleport out of this ${deep ? 'dank' : ''} dungeon`)
        xvt.out($.bracket('R'), 'Random teleport')
        xvt.out(xvt.cyan, '\n\nTime Left: ', xvt.bright, xvt.white, min.toString(), xvt.faint, xvt.cyan, ' min.', xvt.reset)
        if ($.player.coin.value) xvt.out(xvt.cyan, '    Coin: ', $.player.coin.carry(4))
        if ($.player.level / 9 - deep > $.Security.name[$.player.security].protection + 1)
            xvt.out(xvt.faint, '\nThe feeling of in', xvt.normal, xvt.uline, 'security', xvt.nouline, xvt.faint, ' overwhelms you.', xvt.reset)

        xvt.app.form = {
            'wizard': {
                cb: () => {
                    if ($.dice(10 * deep + Z + 5 * $.player.magic + $.online.int + $.online.cha) == 1) {
                        xvt.outln(' ... "', xvt.bright, xvt.cyan, 'Huh?', xvt.reset, '"')
                        $.animated('headShake')
                        $.sound('miss', 6)
                        $.animated('rubberBand')
                        $.sound('lose', 12)
                        $.music('crack')
                        xvt.sleep(1250)
                        $.animated('bounceOutUp')
                        xvt.sleep(1250)
                        let pops = 'UDOR'[$.dice(4) - 1]
                        if (xvt.entry.toUpperCase() == pops) {
                            $.sound('oops', 6)
                            deep = $.dice(10) - 1
                            Z += $.dice(20) - 10
                            Z = Z < 0 ? 0 : Z > 99 ? 99 : Z
                            $.sound('portal', 12)
                        }
                        else {
                            xvt.entry = pops
                            $.sound('teleport')
                        }
                    }
                    else {
                        xvt.outln()
                        $.sound('teleport')
                    }

                    switch (xvt.entry.toUpperCase()) {
                        case 'D':
                            if (Z < 99) {
                                Z++
                                $.PC.profile($.online, 'backOutDown')
                                break
                            }
                        case 'R':
                            $.PC.profile($.online, 'flipOutY')
                            DL.events++
                            DL.exit = false
                            break

                        case 'U':
                            if (Z > 0) {
                                DL.events++
                                DL.exit = false
                                Z--
                                $.PC.profile($.online, 'backOutUp')
                                break
                            }
                        case 'O':
                            $.PC.profile($.online, 'flipOutX')
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
                    xvt.sleep(1400)
                    generateLevel()
                    menu()
                }, cancel: 'O', enter: 'R', eol: false, match: /U|D|O|R/i, timeout: 20
            }
        }
        xvt.app.form['wizard'].prompt = `Teleport #${$.romanize(deep + 1)}.${Z + 1}: `
        xvt.drain()
        xvt.app.focus = 'wizard'
    }

    function quaff(v: number, it = true) {
        if (!(v % 2) && !potions[v].identified) $.news(`\t${it ? 'quaffed' : 'tossed'}${$.an(potion[v])}`)
        if (it) {
            if (!potions[v].identified) {
                potions[v].identified = $.online.int > (85 - 4 * $.player.poison)
                xvt.out(v % 2 ? xvt.red : xvt.green, 'It was', xvt.bright)
                if ($.player.emulation == 'XT') xvt.out(' ', v % 2 ? '🌡️ ' : '🧪')
                xvt.outln($.an(potion[v]), xvt.normal, '.')
            }
            $.sound('quaff', 6)
            switch (v) {
                //	Potion of Cure Light Wounds
                case 0:
                    $.sound('yum')
                    $.online.hp += $.PC.hp() + $.dice($.player.hp - $.online.hp)
                    break

                //	Vial of Weakness
                case 1:
                    $.PC.adjust('str', -$.dice(10), -$.PC.card($.player.pc).toStr)
                    break

                //	Potion of Charm
                case 2:
                    $.PC.adjust('cha', 100 + $.dice(10), $.PC.card($.player.pc).toCha, +($.player.cha == $.player.maxcha))
                    break

                //	Vial of Stupidity
                case 3:
                    $.PC.adjust('int', -$.dice(10), -$.PC.card($.player.pc).toInt)
                    break

                //	Potion of Agility
                case 4:
                    $.PC.adjust('dex', 100 + $.dice(10), $.PC.card($.player.pc).toDex, +($.player.dex == $.player.maxdex))
                    break

                //	Vial of Clumsiness
                case 5:
                    $.PC.adjust('dex', -$.dice(10), -$.PC.card($.player.pc).toDex)
                    break

                //	Potion of Wisdom
                case 6:
                    $.PC.adjust('int', 100 + $.dice(10), $.PC.card($.player.pc).toInt, +($.player.int == $.player.maxint))
                    break

                //	Vile Vial
                case 7:
                    $.PC.adjust('cha', -$.dice(10), -$.PC.card($.player.pc).toCha)
                    break

                //	Potion of Stamina
                case 8:
                    $.PC.adjust('str', 100 + $.dice(10), $.PC.card($.player.pc).toStr, +($.player.str == $.player.maxstr))
                    break

                //	Vial of Slaad Secretions
                case 9:
                    $.sound('hurt')
                    if (($.online.hp -= $.dice($.player.hp / 2)) < 1) {
                        $.online.hp = 0
                        $.online.sp = 0
                        $.death(`quaffed${$.an(potion[v])}`)
                        $.sound('killed', 11)
                    }
                    break

                //	Potion of Mana
                case 10:
                    $.sound('shimmer')
                    $.online.sp += $.PC.sp() + $.dice($.player.sp - $.online.sp)
                    break

                //	Flask of Fire Water
                case 11:
                    if (($.online.sp -= $.dice($.online.sp / 2)) < 1)
                        $.online.sp = 0
                    break

                //	Elixir of Restoration
                case 12:
                    $.music('elixir')
                    if ($.online.hp < $.player.hp) $.online.hp = $.player.hp
                    if ($.online.sp < $.player.sp) $.online.sp = $.player.sp
                    if ($.online.str < $.player.str) $.online.str = $.player.str
                    if ($.online.int < $.player.int) $.online.int = $.player.int
                    if ($.online.dex < $.player.dex) $.online.dex = $.player.dex
                    if ($.online.cha < $.player.cha) $.online.cha = $.player.cha
                    $.PC.adjust('str', 100 + $.dice(10), $.PC.card($.player.pc).toStr, +($.player.str == $.player.maxstr))
                    $.PC.adjust('int', 100 + $.dice(10), $.PC.card($.player.pc).toInt, +($.player.int == $.player.maxint))
                    $.PC.adjust('dex', 100 + $.dice(10), $.PC.card($.player.pc).toDex, +($.player.dex == $.player.maxdex))
                    $.PC.adjust('cha', 100 + $.dice(10), $.PC.card($.player.pc).toCha, +($.player.cha == $.player.maxcha))
                    break

                //	Vial of Crack
                case 13:
                    $.music('crack')
                    $.PC.adjust('str'
                        , $.online.str > 40 ? -$.dice(6) - 4 : -3
                        , $.player.str > 60 ? -$.dice(3) - 2 : -2
                        , $.player.maxstr > 80 ? -2 : -1)
                    $.PC.adjust('int'
                        , $.online.int > 40 ? -$.dice(6) - 4 : -3
                        , $.player.int > 60 ? -$.dice(3) - 2 : -2
                        , $.player.maxint > 80 ? -2 : -1)
                    $.PC.adjust('dex'
                        , $.online.dex > 40 ? -$.dice(6) - 4 : -3
                        , $.player.dex > 60 ? -$.dice(3) - 2 : -2
                        , $.player.maxdex > 80 ? -2 : -1)
                    $.PC.adjust('cha'
                        , $.online.cha > 40 ? -$.dice(6) - 4 : -3
                        , $.player.cha > 60 ? -$.dice(3) - 2 : -2
                        , $.player.maxcha > 80 ? -2 : -1)
                    $.online.sp -= $.PC.sp()
                    if ($.online.sp < 0) $.online.sp = 0
                    $.online.hp -= $.PC.hp()
                    if ($.online.hp < 0) {
                        $.online.hp = 0
                        $.reason = `quaffed${$.an(potion[v])}`
                        xvt.sleep(600)
                        drawHero()
                    }
                    break

                //	Potion of Augment
                case 14:
                    $.sound('hone', 12)
                    $.PC.adjust('str'
                        , 100 + $.dice(100 - $.online.str)
                        , $.dice(3) + 2
                        , $.player.maxstr < 95 ? 2 : 1)
                    $.PC.adjust('int'
                        , 100 + $.dice(100 - $.online.int)
                        , $.dice(3) + 2
                        , $.player.maxint < 95 ? 2 : 1)
                    $.PC.adjust('dex'
                        , 100 + $.dice(100 - $.online.dex)
                        , $.dice(3) + 2
                        , $.player.maxdex < 95 ? 2 : 1)
                    $.PC.adjust('cha'
                        , 100 + $.dice(100 - $.online.cha)
                        , $.dice(3) + 2
                        , $.player.maxcha < 95 ? 2 : 1)
                    $.sound('heal')
                    $.online.hp += $.PC.hp()
                    $.online.sp += $.PC.sp()
                    break

                //	Beaker of Death
                case 15:
                    $.online.hp = 0
                    $.online.sp = 0
                    $.reason = `quaffed${$.an(potion[v])}`
                    $.profile({ png: 'potion/beaker', handle: `💀 ${potion[v]} 💀`, effect: 'fadeInDown' })
                    $.sound('killed', 11)
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
                if ($.player.emulation !== 'XT' && Monster[$.tty])
                    icon += Monster[$.tty][m]
                else {
                    if (identify) {
                        icon += Mask[m]
                        for (let i = 0; i < m; i++) {
                            let dm = $.PC.card(room.monster[i].user.pc)
                            icon = icon.replace('ѩ', xvt.attr(dm.color || xvt.white, dm.unicode))
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
                    o += xvt.attr(!room.type ? xvt.yellow : xvt.red)
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
                        o = xvt.attr(`  ${$.player.emulation == 'XT' ? xvt.attr(xvt.lblack, '⛋') : xvt.attr(xvt.reset, xvt.faint, $.player.emulation == 'PC' ? '\xCF' : '?')}  `)
                    break

                case 'portal':
                    o = a + xvt.attr(xvt.blue)
                    if (!icon)
                        icon = xvt.attr('v', xvt.bright, xvt.blink, 'V', xvt.noblink, xvt.normal, 'v')
                    else
                        icon += xvt.attr(xvt.blue)
                    o += xvt.attr(xvt.faint, 'v', xvt.normal, icon, xvt.faint, 'v')
                    break

                case 'well':
                    if (identify && !icon)
                        o = xvt.attr(`  ${$.player.emulation == 'XT' ? xvt.attr(xvt.lblue, '⛃', xvt.reset) : xvt.attr(xvt.blue, xvt.bright, $.player.emulation == 'PC' ? '\xF5' : '*')}  `)
                    break

                case 'wheel':
                    if (identify && !icon)
                        o = xvt.attr(`  ${$.player.emulation == 'XT' ? xvt.attr(xvt.lmagenta, '࿋', xvt.reset) : xvt.attr(xvt.magenta, xvt.bright, $.player.emulation == 'PC' ? '\x9D' : '@')}  `)
                    break

                case 'thief':
                    if ((DL.map == `Marauder's map` || $.player.steal == 4) && !icon)
                        o = xvt.attr(xvt.off, xvt.faint, `  ${$.player.emulation == 'XT' ? '∞' : $.player.emulation == 'PC' ? '\xA8' : '&'}  `)
                    break

                case 'cleric':
                    o = a + xvt.attr(xvt.yellow)
                    if (!icon)
                        icon = DL.cleric.user.status
                            ? xvt.attr(xvt.off, xvt.faint, xvt.uline, $.player.emulation == 'XT' ? '⛼🕱⛼' : `_${Cleric[$.player.emulation]}_`, xvt.nouline, xvt.normal, xvt.yellow)
                            : xvt.attr(xvt.normal, xvt.uline, '_', xvt.faint, Cleric[$.player.emulation], xvt.normal, '_', xvt.nouline)
                    else
                        icon += xvt.attr(xvt.yellow)
                    o += xvt.attr(xvt.faint, ':', xvt.normal, icon, xvt.faint, ':')
                    break

                case 'wizard':
                    o = a + xvt.attr(xvt.magenta)
                    if (!icon)
                        icon = xvt.attr(xvt.normal, xvt.uline, '_', xvt.bright, Teleport[$.player.emulation], xvt.normal, '_', xvt.nouline)
                    else
                        icon += xvt.attr(xvt.magenta)
                    o += xvt.attr(xvt.faint, '<', xvt.normal, icon, xvt.faint, '>')
                    break

                case 'dwarf':
                    if (identify && !icon)
                        o = a + xvt.attr(xvt.yellow, `  ${$.player.emulation == 'XT' ? '⚘' : '$'}  `)
                    break

                case 'witch':
                    if (identify && !icon)
                        o = a + xvt.attr(xvt.green, xvt.faint, `  ${$.player.emulation == 'XT' ? '∢' : '%'}  `, xvt.normal)
                    break
            }
        }
        else
            o = '     '

        xvt.out(o)

        if (room.giftItem && (DL.map == `Marauder's map` || $.Ring.power([], $.player.rings, 'identify').power))
            xvt.out('\x08', xvt.reset, xvt.faint, room.giftIcon)
    }

    function scroll(top = 1, redraw = true, escape = false) {
        xvt.save()
        xvt.out(`\x1B[${top};${$.player.rows}r`)
        xvt.restore()
        if (escape) {
            $.news(`\tescaped dungeon ${$.romanize(hideep + 1)}.${hiZ} ${levels < $.player.level && `ascending +${$.player.level - levels}` || 'expeditiously'}`)
            $.music(['escape', 'thief2', 'thief'][$.dungeon])
            xvt.outln(xvt.lblue, `\n"Next time you won't escape so easily... moo-hahahahaha!!"`, -600)
            $.profile({ png: 'castle', effect: 'pulse' })
        }
        else if (redraw) {
            drawLevel()
            drawHero()
        }
        refresh = (top == 1)
    }
}

export = Dungeon
