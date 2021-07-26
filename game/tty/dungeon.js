"use strict";
const $ = require("../runtime");
const Battle = require("../battle");
const db = require("../db");
const items_1 = require("../items");
const lib_1 = require("../lib");
const npc_1 = require("../npc");
const pc_1 = require("../pc");
const player_1 = require("../player");
const sys_1 = require("../sys");
var Dungeon;
(function (Dungeon) {
    let b4;
    let fini;
    let hideep;
    let hiZ;
    let motif = -1;
    let paper;
    let party;
    let tl;
    let deep;
    let ROOM;
    let Z;
    let Y;
    let X;
    let levels;
    let idle;
    let looked;
    let pause;
    let refresh;
    let skillkill;
    let well;
    if ($.access.sysop)
        npc_1.dungeon.crawling['M'] = { description: 'y liege' };
    function DeepDank(start, cb) {
        idle = -1;
        levels = $.player.level;
        skillkill = false;
        Battle.teleported = false;
        well = true;
        party = [];
        party.push($.online);
        tl = lib_1.vt.checkTime() + 3;
        deep = 0;
        hideep = 0;
        Z = start < 0 ? 0 : start > 99 ? 99 : sys_1.int(start);
        hiZ = Z;
        fini = cb;
        generateLevel();
        ROOM = npc_1.dungeon.level.rooms[Y][X];
        menu();
    }
    Dungeon.DeepDank = DeepDank;
    function menu(suppress = false) {
        if ($.online.altered)
            pc_1.PC.save();
        if ($.reason || lib_1.vt.reason) {
            lib_1.death(`failed to escape ${sys_1.romanize(deep + 1)}.${Z + 1} - ${$.reason || lib_1.vt.reason}`);
            npc_1.dungeon.level.map = `Marauder's map`;
            scroll();
            if ($.online.hp > 0) {
                $.online.hp = sys_1.whole(idle);
                if ($.online.hp)
                    lib_1.vt.sound('thief2', 6);
            }
            lib_1.vt.hangup();
        }
        if ($.player.level + 1 < $.sysop.level) {
            if (player_1.checkXP($.online, menu)) {
                npc_1.dungeon.level.exit = false;
                npc_1.dungeon.level.moves -= npc_1.dungeon.level.width;
                pause = true;
                return;
            }
            else if ($.jumped) {
                lib_1.vt.title(`${$.player.handle}: level ${$.player.level} ${$.player.pc} - Dungeon ${sys_1.romanize(deep + 1)}.${Z + 1}`);
                if ($.jumped > (19 - sys_1.int(deep / 3)))
                    skillkill = true;
            }
        }
        if (!Battle.retreat && Battle.teleported) {
            Battle.teleported = false;
            if (Battle.expel) {
                Battle.expel = false;
                pc_1.PC.portrait($.online, 'flipOutX');
                if (deep > 0)
                    deep--;
                else {
                    scroll(1, false, true);
                    fini();
                    return;
                }
                generateLevel();
                menu();
                return;
            }
            scroll(1, false);
            lib_1.vt.outln(lib_1.vt.magenta, 'You open a ', lib_1.vt.bright, 'mystic portal', lib_1.vt.normal, '.\n');
            lib_1.vt.sound('portal', 4);
            teleport();
            return;
        }
        if (skillkill) {
            lib_1.vt.sound('winner');
            skillkill = false;
            player_1.skillplus($.online, menu);
            return;
        }
        if (!looked)
            if (!(looked = doMove()))
                return;
        if (pause) {
            lib_1.vt.action('yn');
            pause = false;
            lib_1.vt.form = {
                'pause': {
                    cb: () => { menu(); }, pause: true, timeout: 20
                }
            };
            player_1.input('pause');
            return;
        }
        if (process.stdout.rows && process.stdout.rows !== $.player.rows) {
            $.player.rows = process.stdout.rows;
            refresh = true;
        }
        if (refresh)
            drawLevel();
        let me = sys_1.whole((Z / 3 + npc_1.dungeon.level.rooms.length * npc_1.dungeon.level.width + $.online.dex / 2 + $.online.cha) * (.6 + deep / 23)
            - npc_1.dungeon.level.moves);
        me *= 1 + (items_1.Security.name[$.player.security].protection - $.player.level / 9) / 12;
        if (me < sys_1.int(($.online.int + npc_1.dungeon.level.width) / 2)) {
            if (!npc_1.dungeon.level.exit) {
                const t = $.player.expert ? 10 : 100;
                lib_1.vt.out(-t, ' ', -2 * t, $.player.emulation == 'XT' ? '🏃' : '<<', ' ', -t);
                if (npc_1.dungeon.level.alert)
                    lib_1.vt.sound('exit');
                lib_1.vt.outln(lib_1.vt.faint, 'find ', -5 * t, 'the ', -4 * t, 'exit', -8 * t, lib_1.vt.normal, '!');
                lib_1.vt.drain();
                npc_1.dungeon.level.alert = false;
                npc_1.dungeon.level.events++;
                npc_1.dungeon.level.exit = true;
                me *= 2;
            }
            else
                me = sys_1.int(me / 2);
        }
        me = (me < npc_1.dungeon.level.width ? npc_1.dungeon.level.width - (npc_1.dungeon.level.moves >> 8) : sys_1.int(me)) - sys_1.int($.player.coward);
        if (me < npc_1.dungeon.level.width) {
            npc_1.dungeon.level.exit = $.player.coward;
            if (me < 6)
                $.player.coward = true;
            me = npc_1.dungeon.level.width + 3 - sys_1.int($.player.coward);
            if ($.player.novice)
                me <<= 1;
        }
        let x = sys_1.dice(npc_1.dungeon.level.width) - 1, y = sys_1.dice(npc_1.dungeon.level.rooms.length) - 1;
        if (sys_1.dice($.online.cha) < Z / (deep + 2)) {
            let d = Math.round($.online.cha / 19) + 2;
            y = Y + (sys_1.dice(d) - 1) - (sys_1.dice(d) - 1);
            if (y < 0 || y >= npc_1.dungeon.level.rooms.length)
                y = sys_1.dice(npc_1.dungeon.level.rooms.length) - 1;
            d++;
            x = X + (sys_1.dice(d) - 1) - (sys_1.dice(d) - 1);
            if (x < 0 || x >= npc_1.dungeon.level.width)
                x = sys_1.dice(npc_1.dungeon.level.width) - 1;
        }
        ROOM = npc_1.dungeon.level.rooms[y][x];
        if (sys_1.dice(npc_1.dungeon.level.spawn * (!ROOM.type ? 2 : ROOM.type == 'cavern' ? 1 : 3)) == 1) {
            if (putMonster(y, x)) {
                let s = sys_1.dice(5) - 1;
                lib_1.vt.outln();
                lib_1.vt.out(lib_1.vt.faint, ['Your skin crawls',
                    'Your pulse quickens', 'You feel paranoid', 'Your grip tightens',
                    'You stand ready'][s], ' from a ');
                if (s == 1)
                    lib_1.vt.sound('pulse');
                switch (sys_1.dice(5)) {
                    case 1:
                        lib_1.vt.out('creaking sound');
                        if (s !== 1)
                            lib_1.vt.sound('creak' + sys_1.dice(2));
                        break;
                    case 2:
                        lib_1.vt.out('clap of thunder');
                        if (s == 2)
                            lib_1.vt.sound('thunder');
                        break;
                    case 3:
                        lib_1.vt.out('ghostly whisper');
                        if (s == 3)
                            lib_1.vt.sound('ghostly');
                        break;
                    case 4:
                        lib_1.vt.out('beast growl');
                        if (s == 4)
                            lib_1.vt.sound('growl');
                        break;
                    case 5:
                        lib_1.vt.out('maniacal laugh');
                        if (s == 0)
                            lib_1.vt.sound('laugh');
                        break;
                }
                if (Math.abs(Y - y) < 3 && Math.abs(X - x) < 3)
                    lib_1.vt.outln(' nearby!', -100);
                else if (Math.abs(Y - y) < 6 && Math.abs(X - x) < 6)
                    lib_1.vt.outln(' off in the distance.', -200);
                else
                    lib_1.vt.outln(' as a faint echo.', -300);
                if (npc_1.dungeon.level.map && npc_1.dungeon.level.map !== 'map')
                    drawRoom(y, x);
                if (ROOM.occupant == 'cleric' && npc_1.dungeon.level.cleric.hp) {
                    lib_1.vt.sound('agony', 10);
                    lib_1.vt.out(lib_1.vt.yellow, 'You hear a dying cry of agony !! ', -900);
                    npc_1.dungeon.level.cleric.hp = 0;
                    npc_1.dungeon.level.cleric.sp = 0;
                    npc_1.dungeon.level.cleric.user.status = 'dead';
                    npc_1.dungeon.level.exit = false;
                    ROOM.giftItem = 'chest';
                    ROOM.giftIcon = $.player.emulation == 'XT' ? '⌂' : npc_1.dungeon.Dot;
                    ROOM.giftValue = 0;
                    npc_1.dungeon.level.cleric.user.coin.value = 0;
                    if (npc_1.dungeon.level.map && npc_1.dungeon.level.map !== 'map')
                        drawRoom(y, x);
                    lib_1.vt.outln(-900);
                    lib_1.vt.beep();
                }
                if (y == Y && x == X) {
                    looked = false;
                    menu();
                    return;
                }
            }
        }
        lib_1.vt.action('dungeon');
        drawHero($.player.blessed ? true : false);
        if (npc_1.dungeon.level.events > 0 && npc_1.dungeon.level.moves > npc_1.dungeon.level.width && sys_1.dice(me) == 1) {
            npc_1.dungeon.level.events--;
            lib_1.vt.music();
            let rng = sys_1.dice(16);
            if (rng > 8) {
                if ($.player.emulation == 'XT') {
                    lib_1.vt.out(' 🦇 ');
                    lib_1.vt.sound('splat', 6);
                }
                lib_1.vt.out(lib_1.vt.faint, 'A bat flies by and soils ', lib_1.vt.normal, 'your ');
                $.player.toAC -= sys_1.dice(deep);
                $.online.altered = true;
                lib_1.vt.out(lib_1.armor());
                if ($.player.emulation == 'XT')
                    lib_1.vt.out(' 💩', -600);
            }
            else if (rng > 4) {
                if ($.player.emulation == 'XT') {
                    lib_1.vt.out(' 💧 ');
                    lib_1.vt.sound('drop', 6);
                }
                lib_1.vt.out(lib_1.vt.blue, 'A drop of ', lib_1.vt.bright, 'acid water burns ', lib_1.vt.normal, 'your ');
                $.player.toWC -= sys_1.dice(deep);
                $.online.altered = true;
                lib_1.vt.out(lib_1.weapon(), -600);
            }
            else if (rng > 2) {
                if ($.player.emulation == 'XT') {
                    lib_1.vt.out(' 😬 ');
                    lib_1.vt.sound('hurt', 6);
                }
                lib_1.vt.out(lib_1.vt.yellow, 'You trip on the rocky surface and hurt yourself.', -600);
                $.online.hp -= sys_1.dice(Z);
                if ($.online.hp < 1)
                    lib_1.death('fell down');
            }
            else if (rng > 1) {
                if ($.player.emulation == 'XT') {
                    lib_1.vt.sound('crack');
                    lib_1.vt.out(' 🐝 ', -300, '🐝 ', -200, '🐝 ', -100, '🐝 ', -50, '🐝 ', -25);
                }
                lib_1.vt.out(lib_1.vt.red, 'You are attacked by a ', lib_1.vt.bright, 'swarm of bees', lib_1.vt.normal);
                if ($.player.emulation == 'XT')
                    lib_1.vt.out(' 🐝', -25, ' 🐝', -50, ' 🐝', -100, ' 🐝', -200, ' 🐝', -300);
                else
                    lib_1.vt.out('!!', -600);
                for (x = 0, y = sys_1.dice(Z); x < y; x++)
                    $.online.hp -= sys_1.dice(Z);
                if ($.online.hp < 1)
                    lib_1.death('killer bees');
            }
            else {
                if ($.player.emulation == 'XT') {
                    lib_1.vt.out(' ⚡ ');
                    lib_1.vt.sound('boom', 6);
                }
                lib_1.vt.out(lib_1.vt.bright, 'A bolt of lightning strikes you!', -600);
                $.player.toAC -= sys_1.dice($.online.armor.ac / 2);
                $.online.toAC -= sys_1.dice($.online.armor.ac / 2);
                $.player.toWC -= sys_1.dice($.online.weapon.wc / 2);
                $.online.toWC -= sys_1.dice($.online.weapon.wc / 2);
                $.online.hp -= sys_1.dice($.player.hp / 2);
                if ($.online.hp < 1)
                    lib_1.death('struck by lightning');
            }
            if ($.online.weapon.wc > 0 && $.online.weapon.wc + $.online.toWC + $.player.toWC < 0) {
                lib_1.vt.out(`\nYour ${$.player.weapon} is damaged beyond repair; `, -300, `you toss it aside.`);
                items_1.Weapon.equip($.online, items_1.Weapon.merchant[0]);
            }
            if ($.online.armor.ac > 0 && $.online.armor.ac + $.online.toAC + $.player.toAC < 0) {
                lib_1.vt.out(`\nYour ${$.player.armor} is damaged beyond repair; `, -300, `you toss it aside.`);
                items_1.Armor.equip($.online, items_1.Armor.merchant[0]);
            }
            drawHero($.player.blessed ? true : false);
            lib_1.vt.outln(-600);
            lib_1.vt.drain();
        }
        lib_1.vt.out('\x06');
        if ($.reason) {
            npc_1.dungeon.level.map = `Marauder's map`;
            drawHero();
            scroll();
            lib_1.vt.hangup();
        }
        lib_1.vt.form = {
            'command': { cb: command, cancel: 'Y', eol: false, timeout: 20 }
        };
        lib_1.vt.form['command'].prompt = '';
        if (suppress)
            lib_1.vt.form['command'].prompt += `${deep ? lib_1.vt.attr(lib_1.vt.white, lib_1.vt.faint, sys_1.romanize(deep + 1), lib_1.vt.cyan) : lib_1.vt.attr(lib_1.vt.cyan)}:`;
        else {
            if ($.player.spells.length)
                lib_1.vt.form['command'].prompt += lib_1.vt.attr(lib_1.bracket('C', false), lib_1.vt.cyan, 'ast, ');
            if ($.player.poisons.length)
                lib_1.vt.form['command'].prompt += lib_1.vt.attr(lib_1.bracket('P', false), lib_1.vt.cyan, 'oison, ');
            if (Y > 0 && npc_1.dungeon.level.rooms[Y][X].type !== 'w-e')
                if (npc_1.dungeon.level.rooms[Y - 1][X].type !== 'w-e')
                    lib_1.vt.form['command'].prompt += lib_1.vt.attr(lib_1.bracket('N', false), lib_1.vt.cyan, 'orth, ');
            if (Y < npc_1.dungeon.level.rooms.length - 1 && npc_1.dungeon.level.rooms[Y][X].type !== 'w-e')
                if (npc_1.dungeon.level.rooms[Y + 1][X].type !== 'w-e')
                    lib_1.vt.form['command'].prompt += lib_1.vt.attr(lib_1.bracket('S', false), lib_1.vt.cyan, 'outh, ');
            if (X < npc_1.dungeon.level.width - 1 && npc_1.dungeon.level.rooms[Y][X].type !== 'n-s')
                if (npc_1.dungeon.level.rooms[Y][X + 1].type !== 'n-s')
                    lib_1.vt.form['command'].prompt += lib_1.vt.attr(lib_1.bracket('E', false), lib_1.vt.cyan, 'ast, ');
            if (X > 0 && npc_1.dungeon.level.rooms[Y][X].type !== 'n-s')
                if (npc_1.dungeon.level.rooms[Y][X - 1].type !== 'n-s')
                    lib_1.vt.form['command'].prompt += lib_1.vt.attr(lib_1.bracket('W', false), lib_1.vt.cyan, 'est, ');
            lib_1.vt.form['command'].prompt += lib_1.vt.attr(lib_1.bracket('Y', false), lib_1.vt.cyan, 'our status: ');
        }
        player_1.input('command');
    }
    Dungeon.menu = menu;
    function command() {
        let suppress = false;
        let choice = lib_1.vt.entry.toUpperCase();
        if (/\[.*\]/.test(lib_1.vt.terminator)) {
            if ((choice = 'NSEW'['UDRL'.indexOf(lib_1.vt.terminator[1])])) {
                suppress = true;
                lib_1.vt.out(lib_1.vt.white, lib_1.vt.bright, choice, lib_1.vt.normal);
            }
            else
                choice = 'Y';
        }
        if (npc_1.dungeon.crawling[choice]) {
            lib_1.vt.out(npc_1.dungeon.crawling[choice].description);
            npc_1.dungeon.level.moves++;
            if (npc_1.dungeon.level.spawn > 2 && !(npc_1.dungeon.level.moves % npc_1.dungeon.level.width))
                npc_1.dungeon.level.spawn--;
            if (!npc_1.dungeon.level.exit)
                recovery(300);
        }
        else {
            lib_1.vt.beep(true);
            lib_1.vt.drain();
            menu();
            return;
        }
        lib_1.vt.outln();
        switch (choice) {
            case 'M':
                npc_1.dungeon.level.map = `Marauder's map`;
                refresh = true;
                break;
            case 'C':
                Battle.retreat = false;
                Battle.cast($.online, menu, undefined, undefined, npc_1.dungeon.level);
                return;
            case 'P':
                Battle.poison($.online, menu);
                return;
            case 'Y':
                lib_1.vt.outln();
                Battle.yourstats(false);
                lib_1.vt.drain();
                break;
            case 'N':
                if (Y > 0 && npc_1.dungeon.level.rooms[Y][X].type !== 'w-e')
                    if (npc_1.dungeon.level.rooms[Y - 1][X].type !== 'w-e') {
                        eraseHero($.player.blessed ? true : false);
                        Y--;
                        looked = false;
                        break;
                    }
                oof('north');
                break;
            case 'S':
                if (Y < npc_1.dungeon.level.rooms.length - 1 && npc_1.dungeon.level.rooms[Y][X].type !== 'w-e')
                    if (npc_1.dungeon.level.rooms[Y + 1][X].type !== 'w-e') {
                        eraseHero($.player.blessed ? true : false);
                        Y++;
                        looked = false;
                        break;
                    }
                oof('south');
                break;
            case 'E':
                if (X < npc_1.dungeon.level.width - 1 && npc_1.dungeon.level.rooms[Y][X].type !== 'n-s')
                    if (npc_1.dungeon.level.rooms[Y][X + 1].type !== 'n-s') {
                        eraseHero($.player.blessed ? true : false);
                        X++;
                        looked = false;
                        break;
                    }
                oof('east');
                break;
            case 'W':
                if (X > 0 && npc_1.dungeon.level.rooms[Y][X].type !== 'n-s')
                    if (npc_1.dungeon.level.rooms[Y][X - 1].type !== 'n-s') {
                        eraseHero($.player.blessed ? true : false);
                        X--;
                        looked = false;
                        break;
                    }
                oof('west');
                break;
        }
        menu(suppress);
    }
    function oof(wall) {
        pc_1.PC.portrait($.online, 'bounce', ` - Dungeon ${sys_1.romanize(deep + 1)}.${Z + 1}`);
        lib_1.vt.out(lib_1.vt.yellow, lib_1.vt.bright, 'Oof! ');
        lib_1.vt.sound('wall', 3);
        lib_1.vt.outln(lib_1.vt.normal, `There is a wall to the ${wall}.`, -300);
        lib_1.vt.drain();
        if (!Battle.retreat && idle < 3)
            idle++;
        if (($.online.hp -= sys_1.dice(deep + Z + 1)) < 1) {
            lib_1.vt.outln();
            lib_1.vt.music();
            lib_1.vt.outln(lib_1.vt.faint, 'You take too many hits and die!');
            if (Battle.retreat)
                lib_1.death('running into a wall', true);
            else {
                lib_1.death('banged head against a wall');
                $.online.hp = sys_1.whole(idle);
            }
        }
    }
    function doMove() {
        ROOM = npc_1.dungeon.level.rooms[Y][X];
        if (!ROOM.map) {
            recovery(600);
            if (idle >= 0)
                idle--;
            if ($.online.int > 49)
                ROOM.map = true;
        }
        else {
            npc_1.dungeon.level.moves++;
            if (npc_1.dungeon.level.spawn > 2 && !(npc_1.dungeon.level.moves % npc_1.dungeon.level.width))
                npc_1.dungeon.level.spawn--;
        }
        if (!ROOM.occupant && !ROOM.monster.length && !ROOM.giftItem)
            return true;
        lib_1.vt.outln();
        if (looked)
            return true;
        recovery(ROOM.occupant == 'cleric' ? 600 : 200);
        if (idle >= 0)
            idle--;
        if (ROOM.monster.length) {
            lib_1.vt.action('clear');
            if (!refresh)
                drawRoom(Y, X, true, true);
            scroll(1, false);
            lib_1.vt.out(lib_1.vt.off);
            if (ROOM.monster.length == 1) {
                let img = `dungeon/${ROOM.monster[0].user.handle}`;
                lib_1.vt.profile({ jpg: img, effect: ROOM.monster[0].effect });
                lib_1.vt.out(`There's something lurking in here . . . `);
                if (!ROOM.monster[0].monster.pc && ROOM.monster[0].user.pc == $.player.pc) {
                    lib_1.vt.sleep(900);
                    if (pc_1.PC.name['player'][ROOM.monster[0].user.pc])
                        lib_1.vt.profile({ png: 'player/' + $.player.pc.toLowerCase() + ($.player.gender == 'F' ? '_f' : ''), effect: 'flash' });
                    else
                        lib_1.vt.profile({
                            png: 'monster/'
                                + (pc_1.PC.name['monster'][ROOM.monster[0].user.pc]
                                    || pc_1.PC.name['tavern'][ROOM.monster[0].user.pc]
                                    ? ROOM.monster[0].user.pc.toLowerCase() : 'monster')
                                + (ROOM.monster[0].user.gender == 'F' ? '_f' : ''),
                            effect: 'flash'
                        });
                }
                lib_1.vt.sleep(400);
            }
            else {
                lib_1.vt.out(`There's a party waiting `, ['you', 'the main course', 'the entertainment', 'meat', 'a good chew'][sys_1.dice(5) - 1], '. . . ', -500);
                let m = {};
                for (let i = 0; i < ROOM.monster.length; i++) {
                    m['mob' + (i + 1)] = 'monster/'
                        + (pc_1.PC.name['monster'][ROOM.monster[i].user.pc]
                            || pc_1.PC.name['tavern'][ROOM.monster[i].user.pc]
                            ? ROOM.monster[i].user.pc.toLowerCase() : 'monster')
                        + (ROOM.monster[i].user.gender == 'F' ? '_f' : '');
                    if (pc_1.PC.name['player'][ROOM.monster[i].user.pc])
                        m['mob' + (i + 1)] = 'player/' + $.player.pc.toLowerCase() + ($.player.gender == 'F' ? '_f' : '');
                }
                lib_1.vt.profile(m);
            }
            lib_1.vt.outln();
            for (let n = 0; n < ROOM.monster.length; n++) {
                if (ROOM.monster.length < 4)
                    lib_1.cat(`dungeon/${ROOM.monster[n].user.handle}`);
                let what = ROOM.monster[n].user.handle;
                if (ROOM.monster[n].user.xplevel > 0)
                    what = [lib_1.vt.attr(lib_1.vt.faint, 'lesser ', lib_1.vt.reset), '', lib_1.vt.attr(lib_1.vt.bright, 'greater ', lib_1.vt.reset)][ROOM.monster[n].user.xplevel - ROOM.monster[n].user.level + 1] + what;
                lib_1.vt.out(`It's`, sys_1.an(what), '... ', ROOM.monster.length < 4 ? -250 : -50);
                if ($.player.novice || party.length > 3 || (sys_1.dice(ROOM.monster[n].user.xplevel / 5 + 5) * (101 - $.online.cha + deep) > 1)) {
                    if (ROOM.monster[n].user.xplevel > 0)
                        lib_1.vt.out(`and it doesn't look friendly.`, -50);
                    else
                        lib_1.vt.out('and it looks harmless', -200, ', for now.', -50);
                    lib_1.vt.outln(ROOM.monster.length < 4 ? -250 : -50);
                    if (ROOM.monster[n])
                        pc_1.PC.wearing(ROOM.monster[n]);
                }
                else {
                    lib_1.vt.outln(`and it's `, lib_1.vt.yellow, lib_1.vt.bright, -250, ['bewitched', 'charmed', 'dazzled', 'impressed', 'seduced'][sys_1.dice(5) - 1], -250, ' by your ', -250, ['awesomeness', 'elegance', 'presence', $.player.armor, $.player.weapon][sys_1.dice(5) - 1], -250);
                    ROOM.monster[n].user.gender = 'FM'[sys_1.dice(2) - 1];
                    ROOM.monster[n].user.handle = lib_1.vt.attr(ROOM.monster[n].pc.color || lib_1.vt.white, lib_1.vt.bright, 'charmed ', ROOM.monster[n].user.handle, lib_1.vt.reset);
                    const xp = sys_1.dice(3 + $.online.adept + sys_1.int($.access.sysop) - sys_1.int($.player.coward)) - 2;
                    ROOM.monster[n].user.xplevel = xp > 1 ? 1 : xp;
                    lib_1.vt.outln(' to join ', ['you', 'your party'][+(party.length > 1)], ' in ', -250, [lib_1.vt.white, lib_1.vt.cyan, lib_1.vt.red][ROOM.monster[n].user.xplevel + 1], lib_1.vt.bright, ['spirit ... ', 'defense.', 'arms!'][ROOM.monster[n].user.xplevel + 1], -500);
                    party.push(ROOM.monster[n]);
                    ROOM.monster.splice(n--, 1);
                }
            }
            if (ROOM.monster.length) {
                $.from = 'Dungeon';
                lib_1.vt.action('battle');
                b4 = ROOM.monster.length > 3 ? -ROOM.monster.length : ROOM.monster.length > 2 ? $.online.hp : 0;
                Battle.engage('Dungeon', party, ROOM.monster, doSpoils);
                return false;
            }
            pause = true;
            return true;
        }
        let loot = new items_1.Coin(0);
        if (ROOM.occupant && !refresh)
            drawRoom(Y, X);
        switch (ROOM.occupant) {
            case 'trapdoor':
                if (sys_1.dice(100 - Z) > 1) {
                    lib_1.vt.outln('You have stepped onto a trapdoor!');
                    lib_1.vt.outln(-300);
                    let u = (sys_1.dice(127 + deep - ($.player.backstab << 1) - ($.player.steal << 2)) < $.online.dex);
                    for (let m = party.length - 1; m > 0; m--) {
                        if (sys_1.dice(120) < party[m].dex)
                            lib_1.vt.out(party[m].user.handle, lib_1.vt.faint, ' manages to catch the edge and stop from falling.');
                        else {
                            lib_1.vt.out(party[m].user.handle, lib_1.vt.reset, lib_1.vt.bright, ' falls', lib_1.vt.normal, ' down a', lib_1.vt.faint, ' level!');
                            if (u)
                                party.splice(m, 1);
                        }
                        lib_1.vt.outln(-300);
                    }
                    if (u) {
                        lib_1.vt.outln('You manage to catch the edge and stop yourself from falling.');
                        ROOM.occupant = '';
                    }
                    else {
                        party = [];
                        party.push($.online);
                        lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.yellow, 'You fall down a level!', -500);
                        if (sys_1.dice(100 + $.player.level - Z) > $.online.dex) {
                            if (sys_1.dice($.online.cha / 10 + deep) <= (deep + 1))
                                $.player.toWC -= sys_1.dice(Math.abs(Z - $.player.level));
                            $.online.toWC -= sys_1.dice(Math.round($.online.weapon.wc / 10) + 1);
                            lib_1.vt.outln(`Your ${lib_1.weapon()} is damaged from the fall!`, -50);
                        }
                        if (sys_1.dice(100 + $.player.level - Z) > $.online.dex) {
                            if (sys_1.dice($.online.cha / 10 + deep) <= (deep + 1))
                                $.player.toAC -= sys_1.dice(Math.abs(Z - $.player.level));
                            $.online.toAC -= sys_1.dice(Math.round($.online.armor.ac / 10) + 1);
                            lib_1.vt.outln(`Your ${lib_1.armor()} is damaged from the fall!`, -50);
                        }
                        Z++;
                        generateLevel();
                        pause = true;
                        menu();
                        return false;
                    }
                }
                else {
                    ROOM.occupant = '';
                    lib_1.vt.profile({ png: 'npc/faery spirit', effect: 'fadeInRight' });
                    lib_1.vt.out(lib_1.vt.cyan, lib_1.vt.bright, 'A faery spirit appears ', -600, lib_1.vt.normal, 'and passes ', -500);
                    if ((!npc_1.dungeon.level.events && npc_1.dungeon.level.exit) || sys_1.dice(50 + Z - deep) > ($.online.cha - 10 * sys_1.int($.player.coward))) {
                        lib_1.vt.animated('fadeOut');
                        lib_1.vt.outln(lib_1.vt.faint, 'by you.');
                        recovery();
                    }
                    else {
                        lib_1.vt.animated('fadeOutLeft');
                        lib_1.vt.outln(lib_1.vt.faint, 'through you.');
                        for (let i = 0; i <= Z; i++)
                            $.online.hp += sys_1.dice(sys_1.int(npc_1.dungeon.level.cleric.user.level / 9)) + sys_1.dice(sys_1.int(Z / 9 + deep / 3));
                        if ($.online.hp > $.player.hp)
                            $.online.hp = $.player.hp;
                        if ($.player.magic > 1) {
                            for (let i = 0; i <= Z; i++)
                                $.online.sp += sys_1.dice(sys_1.int(npc_1.dungeon.level.cleric.user.level / 9)) + sys_1.dice(sys_1.int(Z / 9 + deep / 3));
                            if ($.online.sp > $.player.sp)
                                $.online.sp = $.player.sp;
                        }
                        lib_1.vt.sound('heal');
                    }
                }
                break;
            case 'portal':
                lib_1.vt.action('ny');
                lib_1.vt.profile({ jpg: 'ddd', effect: 'fadeIn', level: sys_1.romanize(deep + 2), pc: 'domain portal' });
                lib_1.vt.out(lib_1.vt.blue, lib_1.vt.bright, `You've found a portal to a deeper and more dank dungeon.`);
                lib_1.vt.form = {
                    'deep': {
                        cb: () => {
                            ROOM.occupant = '';
                            lib_1.vt.outln();
                            if (/Y/i.test(lib_1.vt.entry)) {
                                lib_1.vt.animated('fadeOutDown');
                                lib_1.vt.sound('portal');
                                lib_1.vt.out(lib_1.vt.white, lib_1.vt.bright, `You descend `, -400, lib_1.vt.normal, `into domain `, -300, lib_1.vt.faint, sys_1.romanize(++deep + 1), ' ... ', -200);
                                generateLevel();
                                lib_1.vt.drain();
                                lib_1.vt.outln();
                            }
                            else
                                lib_1.vt.animated('fadeOut');
                            menu();
                        }, prompt: 'Descend even deeper (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 20
                    }
                };
                lib_1.vt.focus = 'deep';
                return false;
            case 'well':
                scroll(1, false);
                lib_1.vt.music('well');
                lib_1.vt.outln(-500, lib_1.vt.magenta, 'You have found a legendary ', lib_1.vt.bright, 'Wishing Well', lib_1.vt.normal, '.');
                lib_1.vt.outln(-500);
                lib_1.vt.outln(-500, lib_1.vt.yellow, lib_1.vt.bright, 'What do you wish to do?', -500);
                let wishes = 'BFORT';
                lib_1.vt.out(lib_1.bracket('B'), 'Bless yourself', -50);
                lib_1.vt.out(lib_1.bracket('F'), 'Fix all your damage', -50);
                lib_1.vt.out(lib_1.bracket('O'), 'Teleport all the way out', -50);
                lib_1.vt.out(lib_1.bracket('R'), 'Resurrect all the dead players', -50);
                lib_1.vt.out(lib_1.bracket('T'), 'Teleport to another level', -50);
                if (!$.player.coward && deep) {
                    wishes += 'C';
                    lib_1.vt.out(lib_1.bracket('C'), 'Curse another player', -100);
                }
                if (deep > 1) {
                    lib_1.vt.out(lib_1.bracket('L'), `Loot another player's money`, -175);
                    wishes += 'L';
                }
                if (deep > 3) {
                    lib_1.vt.out(lib_1.bracket('G'), 'Grant another call', -200);
                    wishes += 'G';
                }
                if (deep > 5) {
                    lib_1.vt.out(lib_1.bracket('K'), 'Key hint(s)', -300);
                    wishes += 'K';
                }
                if (deep > 7) {
                    lib_1.vt.out(lib_1.bracket('D'), 'Destroy dungeon visit', -400);
                    wishes += 'D';
                }
                lib_1.vt.outln(-500);
                lib_1.vt.drain();
                lib_1.vt.action('well');
                lib_1.vt.form = {
                    'well': {
                        cb: () => {
                            ROOM.occupant = '';
                            well = false;
                            lib_1.vt.outln();
                            let wish = lib_1.vt.entry.toUpperCase();
                            if (wish == '' || wishes.indexOf(wish) < 0) {
                                lib_1.vt.sound('oops');
                                lib_1.vt.refocus();
                                return;
                            }
                            lib_1.vt.animated('flipOutX');
                            lib_1.vt.outln();
                            switch (wish) {
                                case 'B':
                                    if ($.player.cursed) {
                                        $.player.coward = false;
                                        $.player.cursed = '';
                                        lib_1.vt.out(lib_1.vt.bright, lib_1.vt.black, 'The dark cloud has left you.');
                                        lib_1.news(`\tlifted curse`);
                                    }
                                    else {
                                        lib_1.vt.sound('shimmer');
                                        $.player.blessed = 'well';
                                        lib_1.vt.out(lib_1.vt.yellow, 'You feel ', lib_1.vt.bright, 'a shining aura', lib_1.vt.normal, ' surround you.');
                                        lib_1.news(`\twished for a blessing`);
                                    }
                                    pc_1.PC.adjust('str', 110);
                                    pc_1.PC.adjust('int', 110);
                                    pc_1.PC.adjust('dex', 110);
                                    pc_1.PC.adjust('cha', 110);
                                    lib_1.vt.sound('shimmer');
                                    npc_1.dungeon.level.events = 0;
                                    npc_1.dungeon.level.exit = false;
                                    break;
                                case 'C':
                                    lib_1.vt.sound('steal');
                                    Battle.user('Curse', (opponent) => {
                                        if (opponent.user.id == $.player.id) {
                                            opponent.user.id = '';
                                            lib_1.vt.outln(`You can't curse yourself.`);
                                            lib_1.vt.refocus();
                                            return;
                                        }
                                        if (opponent.user.id) {
                                            lib_1.news(`\tcursed ${opponent.user.handle}`);
                                            if (opponent.user.blessed) {
                                                lib_1.log(opponent.user.id, `\n${$.player.handle} vanquished your blessedness!`);
                                                opponent.user.blessed = '';
                                                lib_1.vt.out(lib_1.vt.yellow, lib_1.vt.bright, opponent.who.His, 'shining aura', lib_1.vt.normal, ' fades ', lib_1.vt.faint, 'away.');
                                            }
                                            else {
                                                lib_1.log(opponent.user.id, `\n${$.player.handle} cursed you!`);
                                                opponent.user.cursed = $.player.id;
                                                lib_1.vt.out(lib_1.vt.faint, 'A dark cloud hovers over ', opponent.who.him, '.');
                                            }
                                            opponent.user.coward = true;
                                            pc_1.PC.save(opponent);
                                            if (opponent.user.id == $.king.id) {
                                                $.player.coward = true;
                                                $.online.altered = true;
                                                lib_1.vt.sound('boom', 6);
                                            }
                                            else
                                                lib_1.vt.sound('morph', 12);
                                        }
                                        menu();
                                        return;
                                    });
                                    return;
                                case 'T':
                                    let start = sys_1.int(Z - sys_1.dice(deep));
                                    if (start < 1)
                                        start = 1;
                                    let end = sys_1.int(Z + sys_1.dice(deep) + sys_1.dice(Z) + sys_1.dice(Z));
                                    if (end > 100)
                                        end = 100;
                                    lib_1.vt.action('list');
                                    lib_1.vt.form = {
                                        'level': {
                                            cb: () => {
                                                let i = parseInt(lib_1.vt.entry);
                                                if (isNaN(i)) {
                                                    lib_1.vt.refocus();
                                                    return;
                                                }
                                                if (i < start || i > end) {
                                                    lib_1.vt.refocus();
                                                    return;
                                                }
                                                lib_1.vt.sound('teleport');
                                                Z = i - 1;
                                                generateLevel();
                                                menu();
                                            }, prompt: `Level (${start}-${end}): `, cancel: `${Z}`, enter: `${end}`, min: 1, max: 3, timeout: 30
                                        }
                                    };
                                    lib_1.vt.focus = 'level';
                                    return;
                                case 'D':
                                    lib_1.vt.outln(lib_1.vt.black, lib_1.vt.bright, 'Your past time in this dungeon visit is eradicated and reset.');
                                    lib_1.vt.sound('destroy', 32);
                                    for (let i in npc_1.dungeon.domain)
                                        delete npc_1.dungeon.domain[i];
                                    $.dungeon++;
                                    if (!$.sorceress)
                                        $.sorceress++;
                                    if (!$.taxboss)
                                        $.taxboss++;
                                    if (!well)
                                        well = true;
                                    generateLevel();
                                    $.warning = 2;
                                    lib_1.vt.sessionAllowed += $.warning * 60;
                                    break;
                                case 'O':
                                    lib_1.vt.sound('teleport');
                                    scroll(1, false, true);
                                    lib_1.vt.outln();
                                    fini();
                                    return;
                                case 'R':
                                    lib_1.vt.sound('resurrect');
                                    db.run(`UPDATE Players SET status='' WHERE id NOT GLOB '_*' AND status!='jail'`);
                                    lib_1.news(`\twished all the dead resurrected`);
                                    break;
                                case 'F':
                                    lib_1.vt.music('elixir');
                                    if ($.online.str < $.player.str)
                                        $.online.str = $.player.str;
                                    if ($.online.int < $.player.int)
                                        $.online.int = $.player.int;
                                    if ($.online.dex < $.player.dex)
                                        $.online.dex = $.player.dex;
                                    if ($.online.cha < $.player.cha)
                                        $.online.cha = $.player.cha;
                                    if ($.player.toAC < 0)
                                        $.player.toAC = 0;
                                    if ($.player.toWC < 0)
                                        $.player.toWC = 0;
                                    if ($.online.toAC < 0)
                                        $.online.toAC = 0;
                                    if ($.online.toWC < 0)
                                        $.online.toWC = 0;
                                    if ($.online.hp < $.player.hp)
                                        $.online.hp = $.player.hp;
                                    if ($.online.sp < $.player.sp)
                                        $.online.sp = $.player.sp;
                                    if ($.online.hull < $.player.hull)
                                        $.online.hull = $.player.hull;
                                    lib_1.vt.outln(lib_1.vt.cyan, lib_1.vt.bright, 'You are completely healed and all damage is repaired.');
                                    break;
                                case 'L':
                                    lib_1.vt.sound('steal');
                                    Battle.user('Loot', (opponent) => {
                                        if (opponent.user.id == $.player.id) {
                                            opponent.user.id = '';
                                            lib_1.vt.outln(`You can't loot yourself.`);
                                            lib_1.vt.refocus();
                                            return;
                                        }
                                        else if (opponent.user.novice) {
                                            opponent.user.id = '';
                                            lib_1.vt.outln(`You can't loot novice players.`);
                                            lib_1.vt.refocus();
                                            return;
                                        }
                                        if (opponent.user.id) {
                                            loot.value = opponent.user.coin.value + opponent.user.bank.value;
                                            opponent.user.coin.value = 0;
                                            opponent.user.bank.value = 0;
                                            pc_1.PC.save(opponent);
                                            $.player.coin.value += loot.value;
                                            lib_1.log(opponent.user.id, `\n${$.player.handle} wished for your ${loot.amount}`);
                                            lib_1.news(`\tlooted ${opponent.user.handle}`);
                                            lib_1.vt.sound('max');
                                        }
                                        menu();
                                        return;
                                    });
                                    return;
                                case 'G':
                                    if ($.player.today) {
                                        lib_1.vt.sound('shimmer');
                                        $.player.today--;
                                        lib_1.vt.outln('You are granted another call for the day.');
                                        lib_1.news(`\twished for an extra call`);
                                    }
                                    else {
                                        lib_1.vt.outln('A deep laughter bellows... ');
                                        lib_1.vt.sound('morph', 12);
                                    }
                                    break;
                                case 'K':
                                    let k = sys_1.dice($.player.wins < 3 ? 1 : 3);
                                    for (let i = 0; i < k; i++) {
                                        pc_1.PC.keyhint($.online);
                                        lib_1.vt.sound("shimmer", 12);
                                    }
                                    break;
                            }
                            pause = true;
                            menu();
                        }, prompt: 'What is thy bidding, my master? ', cancel: 'O', enter: 'B', eol: false, max: 1, timeout: 50
                    }
                };
                lib_1.vt.drain();
                lib_1.vt.focus = 'well';
                return false;
            case 'wheel':
                lib_1.vt.profile({ png: 'wol', effect: 'rotateIn' });
                lib_1.vt.outln(lib_1.vt.magenta, 'You have found a ', lib_1.vt.bright, 'Mystical Wheel of Life', lib_1.vt.normal, '.', -600);
                lib_1.vt.music('wol');
                lib_1.vt.outln(-600);
                lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.yellow, 'The runes are ', ['cryptic', 'familiar', 'foreign', 'speaking out', 'strange'][sys_1.dice(5) - 1], ' to you.', -600);
                lib_1.vt.form = {
                    'wheel': {
                        cb: () => {
                            ROOM.occupant = '';
                            lib_1.vt.outln();
                            if (/Y/i.test(lib_1.vt.entry)) {
                                lib_1.vt.music('tension' + sys_1.dice(3));
                                lib_1.vt.animated('infinite rotateIn');
                                let z = (deep < 3) ? 3 : (deep < 5) ? 5 : (deep < 7) ? 7 : 10;
                                let t = 0;
                                for (let i = 0; i < 5; i++) {
                                    let n = sys_1.int($.online.str / 5 - 5 * i + sys_1.dice(5) + 1);
                                    for (let m = 0; m < n; m++) {
                                        lib_1.vt.beep(true);
                                        lib_1.vt.out('\r', '-\\|/'[m % 4]);
                                    }
                                }
                                let n = sys_1.dice($.online.str / 20) + 2;
                                for (let i = 1; i <= n; i++) {
                                    t = sys_1.dice(z + 1) - 1;
                                    if (i == n) {
                                        z = 10;
                                        if ($.access.sysop)
                                            t = [0, 2, 3, 5, 7, 8][sys_1.dice(6) - 1];
                                    }
                                    lib_1.vt.out(lib_1.vt.bright, lib_1.vt.blue, '\r [', lib_1.vt.cyan, [
                                        ' +Time ', ' Death ', ' Grace ',
                                        ' Power ', ' Doom! ',
                                        'Fortune', ' Taxes ',
                                        ' =Key= ', '+Skill+', ' Morph '
                                    ][t % z], lib_1.vt.blue, '] \r', -100 * 3 * i);
                                    lib_1.vt.sound('click');
                                }
                                lib_1.vt.animated('rotateOut');
                                lib_1.vt.beep();
                                lib_1.vt.outln();
                                switch (t % z) {
                                    case 0:
                                        lib_1.vt.sessionAllowed += 300;
                                        break;
                                    case 1:
                                        lib_1.death('Wheel of Death', true);
                                        break;
                                    case 2:
                                        if ($.player.cursed) {
                                            lib_1.vt.out(lib_1.vt.faint, 'The dark cloud has been lifted.', lib_1.vt.reset);
                                            $.player.cursed = '';
                                        }
                                        else {
                                            pc_1.PC.adjust('str', 0, 2, 1);
                                            pc_1.PC.adjust('int', 0, 2, 1);
                                            pc_1.PC.adjust('dex', 0, 2, 1);
                                            pc_1.PC.adjust('cha', 0, 2, 1);
                                        }
                                        pc_1.PC.adjust('str', 110);
                                        pc_1.PC.adjust('int', 110);
                                        pc_1.PC.adjust('dex', 110);
                                        pc_1.PC.adjust('cha', 110);
                                        lib_1.vt.sound('shimmer');
                                        npc_1.dungeon.level.events = 0;
                                        npc_1.dungeon.level.exit = false;
                                        break;
                                    case 3:
                                        $.online.hp += sys_1.int($.player.hp / 2) + sys_1.dice($.player.hp / 2);
                                        if ($.player.magic > 1)
                                            $.online.sp += sys_1.int($.player.sp / 2) + sys_1.dice($.player.sp / 2);
                                        $.player.toWC += sys_1.dice($.online.weapon.wc - $.player.toWC);
                                        $.online.toWC += sys_1.int($.online.weapon.wc / 2) + 1;
                                        $.player.toAC += sys_1.dice($.online.armor.ac - $.player.toAC);
                                        $.online.toAC += sys_1.int($.online.armor.ac / 2) + 1;
                                        lib_1.vt.sound('hone');
                                        break;
                                    case 4:
                                        if ($.player.blessed) {
                                            lib_1.vt.out(lib_1.vt.yellow, lib_1.vt.bright, 'Your shining aura ', lib_1.vt.normal, 'has left ', lib_1.vt.faint, 'you.', lib_1.vt.reset);
                                            $.player.blessed = '';
                                        }
                                        else {
                                            pc_1.PC.adjust('str', 0, -2, -1);
                                            pc_1.PC.adjust('int', 0, -2, -1);
                                            pc_1.PC.adjust('dex', 0, -2, -1);
                                            pc_1.PC.adjust('cha', 0, -2, -1);
                                        }
                                        pc_1.PC.adjust('str', -5 - sys_1.dice(5));
                                        pc_1.PC.adjust('int', -5 - sys_1.dice(5));
                                        pc_1.PC.adjust('dex', -5 - sys_1.dice(5));
                                        pc_1.PC.adjust('cha', -5 - sys_1.dice(5));
                                        lib_1.vt.sound('crack');
                                        npc_1.dungeon.level.events += sys_1.dice(Z) + deep;
                                        break;
                                    case 5:
                                        loot.value = sys_1.money(Z);
                                        loot.value += lib_1.tradein($.online.weapon.value);
                                        loot.value += lib_1.tradein($.online.armor.value);
                                        loot.value *= (Z + 1);
                                        $.player.coin.value += loot.pick(1).value;
                                        lib_1.vt.sound('yahoo');
                                        break;
                                    case 6:
                                        $.player.coin.value = 0;
                                        $.player.bank.value = 0;
                                        loot.value = sys_1.money(Z);
                                        loot.value += lib_1.tradein($.online.weapon.value);
                                        loot.value += lib_1.tradein($.online.armor.value);
                                        loot.value *= (Z + 1);
                                        $.player.loan.value += loot.pick(1).value;
                                        lib_1.vt.sound('thief2');
                                        break;
                                    case 7:
                                        pc_1.PC.keyhint($.online);
                                        lib_1.vt.sound('click');
                                        break;
                                    case 8:
                                        lib_1.vt.sound('level');
                                        player_1.skillplus($.online, menu);
                                        return;
                                    case 9:
                                        $.player.level = sys_1.dice(Z);
                                        if ($.online.adept)
                                            $.player.level += sys_1.dice($.player.level);
                                        pc_1.PC.reroll($.player, pc_1.PC.random('monster'), $.player.level);
                                        pc_1.PC.activate($.online);
                                        $.player.gender = ['F', 'M'][sys_1.dice(2) - 1];
                                        pc_1.PC.save();
                                        lib_1.news(`\t${$.player.handle} got morphed into a level ${$.player.level} ${$.player.pc} (${$.player.gender})!`);
                                        lib_1.vt.outln(`You got morphed into a level ${$.player.level} ${$.player.pc} (${$.player.gender})!`);
                                        lib_1.vt.sound('morph', 10);
                                        break;
                                }
                            }
                            else
                                lib_1.vt.animated('rotateOut');
                            menu();
                        }, prompt: 'Will you spin it (Y/N)? ', cancel: 'Y', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 20
                    }
                };
                lib_1.vt.action('ny');
                lib_1.vt.drain();
                lib_1.vt.focus = 'wheel';
                pause = true;
                refresh = true;
                return false;
            case 'thief':
                lib_1.vt.out(lib_1.vt.cyan, lib_1.vt.faint, 'There is a thief in this ', !ROOM.type ? 'chamber'
                    : ROOM.type == 'n-s' ? 'hallway' : ROOM.type == 'w-e' ? 'corridor' : 'cavern', '! ', lib_1.vt.white, -600);
                ROOM.occupant = '';
                if ($.taxboss && (Z + 1) >= $.taxman.user.level && $.player.level < $.taxman.user.level) {
                    $.taxboss--;
                    pc_1.PC.load($.taxman);
                    lib_1.vt.outln(lib_1.vt.reset, pc_1.PC.who($.taxman).He, 'is the ', lib_1.vt.cyan, lib_1.vt.bright, 'Master of Coin', lib_1.vt.reset, ' for ', lib_1.vt.magenta, lib_1.vt.bright, $.king.handle, lib_1.vt.reset, '!');
                    lib_1.vt.profile({ jpg: 'npc/taxman', handle: $.taxman.user.handle, level: $.taxman.user.level, pc: $.taxman.user.pc, effect: 'bounceInDown' });
                    lib_1.vt.sound('oops', 16);
                    pc_1.PC.activate($.taxman);
                    $.taxman.user.coin.value = $.player.coin.value;
                    pc_1.PC.wearing($.taxman);
                    b4 = -1;
                    Battle.engage('Taxman', $.online, $.taxman, () => {
                        looked = false;
                        pause = true;
                        refresh = true;
                        menu();
                    });
                    return;
                }
                if (npc_1.dungeon.level.map == `Marauder's map` || (items_1.Ring.power([], $.player.rings, 'identify').power > 0)) {
                    lib_1.vt.outln('He does not surprise you', lib_1.vt.cyan, '.');
                    break;
                }
                let x = sys_1.dice(npc_1.dungeon.level.width) - 1, y = sys_1.dice(npc_1.dungeon.level.rooms.length) - 1;
                let escape = npc_1.dungeon.level.rooms[y][x];
                if (escape.occupant || sys_1.dice(Z * ($.player.steal / 2 + 1) - deep) > Z) {
                    if (!escape.occupant && $.player.pc !== $.taxman.user.pc) {
                        escape.occupant = 'thief';
                        const t = sys_1.dice(5) - 1;
                        lib_1.vt.out([
                            'He decides to ignore you',
                            'He recognizes your skill and winks',
                            'He slaps your back, but your wallet remains',
                            'He offers you a drink, and you accept',
                            lib_1.vt.attr(`"I'll be seeing you again"`, lib_1.vt.cyan, ' as he leaves')
                        ][t]);
                        lib_1.vt.out(lib_1.vt.cyan, '.');
                        if (t) {
                            pc_1.PC.adjust(['', 'dex', 'str', 'int', 'cha'][t], -1);
                            if (t)
                                lib_1.vt.sound('thief');
                        }
                    }
                    else {
                        lib_1.vt.out(lib_1.vt.normal, lib_1.vt.magenta, 'He teleports away!');
                        lib_1.vt.sound('teleport');
                    }
                    lib_1.vt.outln();
                }
                else {
                    escape.occupant = 'thief';
                    lib_1.vt.outln(lib_1.vt.reset, 'He surprises you!');
                    lib_1.vt.sound('thief', 4);
                    lib_1.vt.out('As he passes by, he steals your ');
                    x = $.online.cha + deep + 1;
                    if ($.player.level / 9 - deep > items_1.Security.name[$.player.security].protection + 1)
                        x = sys_1.int(x / $.player.level);
                    if ($.online.weapon.wc && sys_1.dice(x) == 1) {
                        lib_1.vt.out(lib_1.weapon(), -600);
                        items_1.Weapon.equip($.online, items_1.Weapon.merchant[0]);
                        lib_1.vt.sound('thief2');
                        npc_1.dungeon.level.exit = false;
                    }
                    else if (npc_1.dungeon.level.map && sys_1.dice($.online.cha / 9) - 1 <= sys_1.int(deep / 3)) {
                        lib_1.vt.out(lib_1.vt.yellow, lib_1.vt.bright, 'map');
                        npc_1.dungeon.level.exit = false;
                        npc_1.dungeon.level.map = '';
                        refresh = true;
                    }
                    else if ($.player.magic < 3 && $.player.spells.length && sys_1.dice($.online.cha / 10 + deep + 1) - 1 <= sys_1.int(deep / 2)) {
                        if ($.player.emulation == 'XT')
                            lib_1.vt.out('📜 ');
                        y = $.player.spells[sys_1.dice($.player.spells.length) - 1];
                        lib_1.vt.out(lib_1.vt.magenta, lib_1.vt.bright, Object.keys(items_1.Magic.spells)[y - 1], ' ', ['wand', 'scroll'][$.player.magic - 1]);
                        items_1.Magic.remove($.player.spells, y);
                    }
                    else if ($.player.poisons.length && sys_1.dice($.online.cha / 10 + deep + 1) - 1 <= sys_1.int(deep / 2)) {
                        y = $.player.poisons[sys_1.dice($.player.poisons.length) - 1];
                        lib_1.vt.out('vial of ');
                        if ($.player.emulation == 'XT')
                            lib_1.vt.out('💀 ');
                        lib_1.vt.out(lib_1.vt.faint, Object.keys(items_1.Poison.vials)[y - 1]);
                        items_1.Poison.remove($.player.poisons, y);
                    }
                    else if ($.player.coin.value) {
                        const pick = $.player.coin.pick();
                        lib_1.vt.out(lib_1.pieces(pick.amount.substr(-1)));
                        $.player.coin.value -= pick.value;
                    }
                    else
                        lib_1.vt.out(lib_1.vt.yellow, `Reese's pieces`);
                    lib_1.vt.outln(lib_1.vt.reset, '!', -600);
                }
                pause = true;
                refresh = true;
                break;
            case 'cleric':
                if (!npc_1.dungeon.level.cleric.hp) {
                    lib_1.vt.profile({ jpg: 'npc/rip', effect: 'fadeInUp' });
                    lib_1.vt.outln(lib_1.vt.yellow, 'You find the ', lib_1.vt.white, 'bones', lib_1.vt.yellow, ' of an ', lib_1.vt.faint, 'old cleric', lib_1.vt.normal, '.', -600);
                    if ($.player.emulation == 'XT')
                        lib_1.vt.out(' 🪦 🕱 ');
                    lib_1.vt.outln('You pray for him.');
                    npc_1.dungeon.level.alert = true;
                    npc_1.dungeon.level.exit = false;
                    break;
                }
                let cast = 7;
                let mod = 6 + sys_1.int($.player.melee / 2) - sys_1.int($.player.magic / 2);
                if (items_1.Ring.power([], $.player.rings, 'taxes').power)
                    mod++;
                if ($.access.sysop)
                    mod++;
                if ($.player.coward)
                    mod--;
                let cost = new items_1.Coin(sys_1.int(($.player.hp - $.online.hp) * sys_1.money(Z) / mod / $.player.hp));
                if (cost.value < 1)
                    cost.value = 1;
                cost.value *= (sys_1.int(deep / 3) + 1);
                if (!$.player.coward && !$.player.steals && ($.player.pc == npc_1.dungeon.level.cleric.user.pc || $.player.maxcha > 98))
                    cost.value = 0;
                cost = cost.pick(1);
                if (ROOM.giftItem == 'chest') {
                    ROOM.giftValue = sys_1.dice(6 - $.player.magic) - 1;
                    cost.value = 0;
                }
                let power = sys_1.int(100 * npc_1.dungeon.level.cleric.sp / npc_1.dungeon.level.cleric.user.sp);
                lib_1.vt.outln(lib_1.vt.yellow, 'There is an ', lib_1.vt.faint, 'old cleric', lib_1.vt.normal, lib_1.vt.normal, ' in this room with ', power < 40 ? lib_1.vt.faint : power < 80 ? lib_1.vt.normal : lib_1.vt.bright, `${power}`, lib_1.vt.normal, '% spell power.');
                lib_1.vt.out('He says, ');
                if ($.online.hp >= $.player.hp || cost.value > $.player.coin.value || npc_1.dungeon.level.cleric.sp < items_1.Magic.power(npc_1.dungeon.level.cleric, cast)) {
                    lib_1.vt.outln(lib_1.vt.yellow, '"I will pray for you."');
                    if ($.online.hp < $.player.hp)
                        lib_1.vt.profile({ jpg: 'npc/prayer', effect: 'fadeInUp' });
                    break;
                }
                if (power > 95)
                    lib_1.vt.profile({ jpg: 'npc/old cleric', effect: 'zoomInUp', level: npc_1.dungeon.level.cleric.user.level, pc: npc_1.dungeon.level.cleric.user.pc });
                if ($.online.hp > sys_1.int($.player.hp / 3) || npc_1.dungeon.level.cleric.sp < items_1.Magic.power(npc_1.dungeon.level.cleric, 13)) {
                    lib_1.vt.out('"I can ', npc_1.dungeon.level.cleric.sp < items_1.Magic.power(npc_1.dungeon.level.cleric, 13) ? 'only' : 'surely', ' cast a Heal spell on your wounds for ', cost.value ? lib_1.carry(cost) : `you, ${$.player.gender == 'F' ? 'sister' : 'brother'}`, '."');
                }
                else if (npc_1.dungeon.level.cleric.sp >= items_1.Magic.power(npc_1.dungeon.level.cleric, 13)) {
                    cast = 13;
                    lib_1.vt.out('"I can restore your health for ', cost.value ? lib_1.carry(cost) : `you, ${$.player.gender == 'F' ? 'sister' : 'brother'}`, '."');
                }
                lib_1.vt.action('yn');
                lib_1.vt.form = {
                    'pay': {
                        cb: () => {
                            lib_1.vt.outln('\n');
                            if (/Y/i.test(lib_1.vt.entry)) {
                                $.player.coin.value -= cost.value;
                                npc_1.dungeon.level.cleric.user.coin.value += cost.value;
                                lib_1.vt.out(`He casts a ${Object.keys(items_1.Magic.spells)[cast - 1]} spell on you.`);
                                npc_1.dungeon.level.cleric.sp -= items_1.Magic.power(npc_1.dungeon.level.cleric, cast);
                                if (cast == 7) {
                                    lib_1.vt.sound('heal');
                                    for (let i = 0; i <= Z; i++)
                                        $.online.hp += sys_1.dice(npc_1.dungeon.level.cleric.user.level / 9) + sys_1.dice(Z / 9 + deep / 3);
                                    if ($.online.hp > $.player.hp)
                                        $.online.hp = $.player.hp;
                                    lib_1.vt.out('  Your hit points: ', lib_1.vt.bright, $.online.hp == $.player.hp ? lib_1.vt.white : $.online.hp > $.player.hp * 0.85 ? lib_1.vt.yellow : lib_1.vt.red, $.online.hp.toString(), lib_1.vt.reset, `/${$.player.hp}`);
                                }
                                else {
                                    $.online.hp = $.player.hp;
                                    lib_1.vt.sound('shimmer', 4);
                                }
                            }
                            else {
                                if (cast == 13) {
                                    lib_1.vt.outln(lib_1.vt.lyellow, '"God save you."', -300);
                                    ROOM.occupant = '';
                                    lib_1.vt.outln(lib_1.vt.magenta, 'He teleports away!');
                                    lib_1.vt.sound('teleport', 8);
                                }
                                else {
                                    lib_1.vt.profile({ jpg: 'npc/prayer', effect: 'fadeInUp' });
                                    lib_1.vt.outln(lib_1.vt.lyellow, '"I need to rest. ', -300, ' Go in peace."', -300);
                                    looked = true;
                                }
                                npc_1.dungeon.level.exit = false;
                            }
                            menu();
                        }, prompt: `${cost.value ? 'Pay' : 'Receive'} (Y/N)? `, cancel: 'N', enter: 'Y', eol: false, match: /Y|N/i, max: 1, timeout: 20
                    }
                };
                lib_1.vt.focus = 'pay';
                return false;
            case 'wizard':
                lib_1.vt.out(lib_1.vt.magenta, 'You encounter a ', lib_1.vt.bright);
                if (!$.player.cursed && !$.player.novice && sys_1.dice((Z > $.player.level ? Z : 1) + 20 * $.player.immortal + $.player.level + $.online.cha) == 1) {
                    lib_1.vt.profile({
                        png: (pc_1.PC.name['player'][$.player.pc] || pc_1.PC.name['immortal'][$.player.pc] ? 'player' : 'monster') + '/' + $.player.pc.toLowerCase() + ($.player.gender == 'F' ? '_f' : ''),
                        effect: 'flip'
                    });
                    $.player.coward = true;
                    $.online.altered = true;
                    lib_1.vt.outln('doppelganger', lib_1.vt.normal, ' waiting for you.', -1000);
                    lib_1.vt.outln(-1200);
                    pc_1.PC.adjust('str', -10);
                    pc_1.PC.adjust('int', -10);
                    pc_1.PC.adjust('dex', -10);
                    pc_1.PC.adjust('cha', -10);
                    lib_1.vt.outln(lib_1.vt.bright, 'It curses you!');
                    lib_1.vt.sound('morph', 18);
                    if ($.player.blessed) {
                        $.player.blessed = '';
                        lib_1.vt.out(lib_1.vt.yellow, 'Your ', -100, lib_1.vt.bright, 'shining aura ', -100, lib_1.vt.normal, 'left', -100, lib_1.vt.faint);
                    }
                    else {
                        $.player.cursed = 'wiz!';
                        lib_1.vt.out(lib_1.vt.black, lib_1.vt.bright, 'A dark cloud hovers over');
                    }
                    lib_1.vt.outln(' you.');
                    lib_1.news(`\tcursed by a doppelganger!`);
                    drawHero();
                    lib_1.vt.animated('flipOutY');
                    lib_1.vt.sound('teleport', 12);
                    ROOM.occupant = '';
                    let x, y;
                    do {
                        y = sys_1.dice(npc_1.dungeon.level.rooms.length) - 1;
                        x = sys_1.dice(npc_1.dungeon.level.width) - 1;
                    } while (npc_1.dungeon.level.rooms[y][x].type == 'cavern' || npc_1.dungeon.level.rooms[y][x].occupant);
                    npc_1.dungeon.level.rooms[y][x].occupant = 'wizard';
                    $.player.coward = false;
                    $.online.altered = true;
                }
                else if (!$.player.novice && sys_1.dice(Z + $.online.cha) == 1) {
                    lib_1.vt.profile({
                        png: (pc_1.PC.name['player'][$.player.pc] || pc_1.PC.name['immortal'][$.player.pc] ? 'player' : 'monster') + '/' + $.player.pc.toLowerCase()
                            + ($.player.gender == 'F' ? '_f' : ''), effect: 'flip'
                    });
                    lib_1.vt.outln('mimic', lib_1.vt.normal, ' occupying this space.', -1000);
                    lib_1.vt.outln(-1200);
                    lib_1.vt.outln(lib_1.vt.faint, 'It waves a hand at you ... ', -800);
                    drawHero();
                    lib_1.vt.animated('flipOutY');
                    lib_1.vt.sound('teleport', 12);
                    ROOM.occupant = '';
                    let x, y;
                    do {
                        y = sys_1.dice(npc_1.dungeon.level.rooms.length) - 1;
                        x = sys_1.dice(npc_1.dungeon.level.width) - 1;
                    } while (npc_1.dungeon.level.rooms[y][x].type == 'cavern' || npc_1.dungeon.level.rooms[y][x].occupant);
                    npc_1.dungeon.level.rooms[y][x].occupant = 'wizard';
                }
                else {
                    lib_1.vt.profile({ jpg: 'npc/wizard', effect: 'backInLeft', handle: 'Pops', level: 77, pc: 'crackpot' });
                    lib_1.vt.outln('wizard', lib_1.vt.normal, ' in this room.\n', -300);
                    scroll(1, false);
                    teleport();
                    return false;
                }
                refresh = true;
                pause = true;
                break;
            case 'dwarf':
                lib_1.vt.profile({ jpg: 'npc/dwarf', effect: 'fadeIn' });
                lib_1.vt.beep();
                lib_1.vt.outln(lib_1.vt.yellow, 'You run into a ', lib_1.vt.bright, 'dwarven merchant', lib_1.vt.normal, ', ', $.dwarf.user.handle, '.', -1000);
                let hi = 0, credit = new items_1.Coin(0), ring = $.dwarf.user.rings[0];
                lib_1.vt.form = {
                    'armor': {
                        cb: () => {
                            lib_1.vt.outln();
                            ROOM.occupant = '';
                            if (/Y/i.test(lib_1.vt.entry)) {
                                $.player.coin = new items_1.Coin(0);
                                items_1.Armor.equip($.online, items_1.Armor.dwarf[hi]);
                                $.player.toAC = 2 - sys_1.dice(3);
                                $.online.toAC = sys_1.dice($.online.armor.ac) - 2;
                                lib_1.vt.profile({ jpg: `specials/${$.player.armor}`, effect: 'fadeInUpBig' });
                                lib_1.vt.sound('click');
                            }
                            else {
                                lib_1.vt.outln();
                                lib_1.vt.out(lib_1.vt.yellow, $.dwarf.user.handle, ' eyes you suspicously ... ', -600);
                                if ($.player.level > $.dwarf.user.level) {
                                    if (items_1.Ring.wear($.player.rings, ring))
                                        lib_1.getRing('inherit', ring);
                                    else {
                                        lib_1.vt.outln('takes back his ring!');
                                        items_1.Ring.remove($.player.rings, ring);
                                    }
                                    pc_1.PC.saveRing(ring, $.player.id);
                                    lib_1.vt.sound('click', 8);
                                }
                                else {
                                    merchant();
                                    return;
                                }
                            }
                            menu();
                        }, prompt: 'Ok (Y/N)? ', cancel: 'Y', enter: 'Y', eol: false, match: /Y|N/i, max: 1, timeout: 20
                    },
                    'weapon': {
                        cb: () => {
                            lib_1.vt.outln();
                            ROOM.occupant = '';
                            if (/Y/i.test(lib_1.vt.entry)) {
                                $.player.coin = new items_1.Coin(0);
                                items_1.Weapon.equip($.online, items_1.Weapon.dwarf[hi]);
                                $.player.toWC = 2 - sys_1.dice(3);
                                $.online.toWC = sys_1.dice($.online.weapon.wc) - 2;
                                lib_1.vt.profile({ jpg: `specials/${$.player.weapon}`, effect: 'fadeInUpBig' });
                                lib_1.vt.sound('click');
                            }
                            else {
                                lib_1.vt.out(lib_1.vt.yellow, $.dwarf.user.handle, ' evaluates the situation ... ', -600);
                                if ($.player.level > $.dwarf.user.level) {
                                    if (items_1.Ring.wear($.player.rings, ring)) {
                                        lib_1.getRing('inherit', ring);
                                    }
                                    else {
                                        lib_1.vt.outln('takes back his ring!');
                                        items_1.Ring.remove($.player.rings, ring);
                                    }
                                    pc_1.PC.saveRing(ring, $.player.id);
                                    lib_1.vt.sound('click', 8);
                                }
                                else {
                                    merchant();
                                    return;
                                }
                            }
                            menu();
                        }, prompt: 'Ok (Y/N)? ', cancel: 'Y', enter: 'Y', eol: false, match: /Y|N/i, max: 1, timeout: 20
                    }
                };
                if (sys_1.dice(2) == 1) {
                    let ac = items_1.Armor.name[$.player.armor].ac;
                    lib_1.vt.out('\nI see you have a class ', lib_1.bracket(ac, false), ' ', lib_1.armor());
                    ac += $.player.toAC;
                    if (ac) {
                        let cv = new items_1.Coin(items_1.Armor.name[$.player.armor].value);
                        credit.value = lib_1.tradein(cv.value, $.online.cha);
                        if ($.player.toAC)
                            credit.value = sys_1.int(credit.value * (ac + $.player.toAC / ($.player.poison + 1)) / ac);
                        if ($.online.toAC < 0)
                            credit.value = sys_1.int(credit.value * (ac + $.online.toAC) / ac);
                        if (credit.value > cv.value)
                            credit.value = cv.value;
                    }
                    else
                        credit.value = 0;
                    lib_1.vt.outln(' worth ', lib_1.carry(credit), -1000);
                    for (hi = 0; hi < items_1.Armor.dwarf.length - 1 && ac >= items_1.Armor.name[items_1.Armor.dwarf[hi]].ac; hi++)
                        ;
                    if (new items_1.Coin(items_1.Armor.name[items_1.Armor.dwarf[hi]].value).value <= credit.value + $.player.coin.value) {
                        if ($.player.coin.value)
                            lib_1.vt.outln('  and all your coin worth ', lib_1.carry(), -1000);
                        lib_1.vt.out(`I'll trade you for my `, lib_1.vt.bright, ['exceptional', 'precious', 'remarkable', 'special', 'uncommon'][sys_1.dice(5) - 1], ' ', lib_1.bracket(items_1.Armor.name[items_1.Armor.dwarf[hi]].ac, false), ' ');
                        lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.yellow, items_1.Armor.dwarf[hi], -1000);
                        lib_1.vt.action('yn');
                        lib_1.vt.drain();
                        lib_1.vt.focus = 'armor';
                        return false;
                    }
                }
                else {
                    let wc = items_1.Weapon.name[$.player.weapon].wc;
                    lib_1.vt.out('\nI see you carrying a class ', lib_1.bracket(wc, false), ' ', lib_1.weapon());
                    wc += $.player.toWC;
                    if (wc) {
                        let cv = new items_1.Coin(items_1.Weapon.name[$.player.weapon].value);
                        credit.value = lib_1.tradein(cv.value, $.online.cha);
                        if ($.player.toWC)
                            credit.value = sys_1.int(credit.value * (wc + $.player.toWC / ($.player.poison + 1)) / wc);
                        if ($.online.toWC < 0)
                            credit.value = sys_1.int(credit.value * (wc + $.online.toWC) / wc);
                        if (credit.value > cv.value)
                            credit.value = cv.value;
                    }
                    else
                        credit.value = 0;
                    lib_1.vt.outln(' worth ', lib_1.carry(credit));
                    for (hi = 0; hi < items_1.Weapon.dwarf.length - 1 && wc >= items_1.Weapon.name[items_1.Weapon.dwarf[hi]].wc; hi++)
                        ;
                    if (new items_1.Coin(items_1.Weapon.name[items_1.Weapon.dwarf[hi]].value).value <= credit.value + $.player.coin.value) {
                        if ($.player.coin.value)
                            lib_1.vt.outln('  and all your coin worth ', lib_1.carry(), -1000);
                        lib_1.vt.out(`I'll trade you for my `, lib_1.vt.bright, ['exquisite', 'fine', 'jeweled', 'rare', 'splendid'][sys_1.dice(5) - 1], ' ', lib_1.bracket(items_1.Weapon.name[items_1.Weapon.dwarf[hi]].wc, false), ' ');
                        lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.cyan, items_1.Weapon.dwarf[hi], -1000);
                        lib_1.vt.action('yn');
                        lib_1.vt.drain();
                        lib_1.vt.focus = 'weapon';
                        return false;
                    }
                }
                lib_1.vt.beep();
                lib_1.vt.animated('fadeOut');
                lib_1.vt.outln(`I've got nothing of interest for trading.  Perhaps next time, my friend?`, -1000);
                ROOM.occupant = '';
                break;
            case 'witch':
                scroll(1, false);
                lib_1.vt.music();
                lib_1.vt.profile({ jpg: 'npc/witch', effect: 'fadeIn' });
                lib_1.vt.sound('steal');
                lib_1.vt.outln(lib_1.vt.green, 'You encounter the ', lib_1.vt.bright, 'sorceress', lib_1.vt.normal, ', ', $.witch.user.handle);
                lib_1.cat(`dungeon/witch`, 100);
                pc_1.PC.load($.witch);
                pc_1.PC.wearing($.witch);
                let choice;
                lib_1.vt.form = {
                    offer: {
                        cb: () => {
                            lib_1.vt.outln();
                            lib_1.vt.sound('click', 8);
                            if (/Y/i.test(lib_1.vt.entry)) {
                                let result = items_1.Weapon.swap($.online, $.witch);
                                if (typeof result == 'boolean' && result) {
                                    lib_1.vt.outln(lib_1.vt.faint, '"', lib_1.vt.normal, lib_1.vt.green, 'A gift from the gods, I give you ', lib_1.vt.reset, lib_1.weapon(), lib_1.vt.reset, lib_1.vt.faint, '"');
                                    lib_1.vt.sound('click', 13);
                                }
                                result = items_1.Armor.swap($.online, $.witch);
                                if (typeof result == 'boolean' && result) {
                                    lib_1.vt.outln(lib_1.vt.faint, '"', lib_1.vt.normal, lib_1.vt.green, `I offer my crafted `, lib_1.vt.reset, lib_1.armor(), lib_1.vt.reset, lib_1.vt.faint, '"');
                                    lib_1.vt.sound('click', 13);
                                }
                                lib_1.vt.out(lib_1.vt.faint, '"', lib_1.vt.normal, lib_1.vt.green, "Your price is ");
                                lib_1.vt.sound('mana', 8);
                                $.player.blessed = '';
                                $.player.coward = true;
                                if ($.player.steal > 1) {
                                    lib_1.vt.out('your ability to steal diminishes');
                                    $.player.steal--;
                                }
                                else if ($.player.magic > 3) {
                                    lib_1.vt.out('your divine spellcasting ability is mine');
                                    $.player.magic--;
                                }
                                else if ($.player.melee > 3) {
                                    lib_1.vt.out('your barbaric powers are halved');
                                    $.player.melee = 2;
                                    pc_1.PC.adjust('str', -5 - sys_1.dice(5), -2, -2);
                                }
                                else if ($.player.poison > 3) {
                                    lib_1.vt.out('your alchemy skill is halved');
                                    $.player.melee = 2;
                                    pc_1.PC.adjust('str', -5 - sys_1.dice(5), -2, -2);
                                }
                                else if ($.player.str > 80 && $.player.int > 80 && $.player.dex > 80 && $.player.cha > 80) {
                                    lib_1.vt.out('allowing me to drain your overall ability');
                                    pc_1.PC.adjust('str', -5 - sys_1.dice(5), -2, -2);
                                    pc_1.PC.adjust('int', -5 - sys_1.dice(5), -2, -2);
                                    pc_1.PC.adjust('dex', -5 - sys_1.dice(5), -2, -2);
                                    pc_1.PC.adjust('cha', -5 - sys_1.dice(5), -2, -2);
                                }
                                else {
                                    $.player.level = sys_1.dice(Z);
                                    if ($.online.adept)
                                        $.player.level += sys_1.dice($.player.level);
                                    pc_1.PC.reroll($.player, pc_1.PC.random('monster'), $.player.level);
                                    pc_1.PC.activate($.online);
                                    $.player.gender = ['F', 'M'][sys_1.dice(2) - 1];
                                    pc_1.PC.save();
                                    lib_1.vt.sound('crone', 21);
                                    lib_1.vt.out(`me morphing you into a level ${$.player.level} ${$.player.pc} (${$.player.gender})`);
                                    lib_1.news(`\tgot morphed by ${$.witch.user.handle} into a level ${$.player.level} ${$.player.pc} (${$.player.gender})!`);
                                }
                                lib_1.vt.music('crack');
                                lib_1.vt.outln('!', lib_1.vt.reset, lib_1.vt.faint, '"', -2100);
                                lib_1.vt.sound('click');
                                switch (choice) {
                                    case 'rings':
                                        let rpc = { user: { id: '' } };
                                        for (let row in rs) {
                                            rpc.user.id = rs[row].bearer;
                                            pc_1.PC.load(rpc);
                                            lib_1.vt.outln(`You are given the ${rs[row].name} ring from ${rpc.user.handle}.`);
                                            items_1.Ring.remove(rpc.user.rings, rs[row].name);
                                            pc_1.PC.save(rpc);
                                            items_1.Ring.wear(rpc.user.rings, rs[row].name);
                                            pc_1.PC.saveRing(rs[row].name, $.player.id, $.player.rings);
                                            lib_1.vt.sound('click', 8);
                                        }
                                        lib_1.news(`\tgot ${rs.length} magical ring${rs.length > 1 ? 's' : ''} of power from ${$.witch.user.handle}!`);
                                        break;
                                    case 'magic':
                                        let m = sys_1.dice($.player.magic + 1);
                                        let retry = 8;
                                        for (let i = 0; i < m; i++) {
                                            let p = sys_1.dice(Object.keys(items_1.Magic.spells).length - 12) + 12;
                                            let spell = items_1.Magic.pick(p);
                                            if (!items_1.Magic.have($.player.spells, spell)) {
                                                items_1.Magic.add($.player.spells, p);
                                                switch ($.player.magic) {
                                                    case 1:
                                                        lib_1.vt.beep();
                                                        lib_1.vt.outln('A ', lib_1.vt.white, lib_1.vt.bright, `Wand of ${spell}`, lib_1.vt.reset, ' appears in your hand.', -600);
                                                        break;
                                                    case 2:
                                                        lib_1.vt.beep();
                                                        lib_1.vt.outln('You add a ', lib_1.vt.yellow, lib_1.vt.bright, `Scroll of ${spell}`, lib_1.vt.reset, ' to your arsenal.', -600);
                                                        break;
                                                    case 3:
                                                        lib_1.vt.sound('shimmer', 8);
                                                        lib_1.vt.outln('The ', lib_1.vt.cyan, lib_1.vt.bright, `Spell of ${spell}`, lib_1.vt.reset, ' is revealed to you.', -600);
                                                        break;
                                                    case 4:
                                                        lib_1.vt.sound('shimmer', 8);
                                                        lib_1.vt.outln(lib_1.vt.magenta, lib_1.vt.bright, spell, lib_1.vt.reset, ' is known to you.', -600);
                                                        break;
                                                }
                                            }
                                            else {
                                                if (--retry)
                                                    m++;
                                                else
                                                    break;
                                            }
                                        }
                                        lib_1.news(`\tgot special magicks from ${$.witch.user.handle}!`);
                                        break;
                                    case 'curse':
                                        lib_1.vt.sound('resurrect');
                                        db.run(`UPDATE Players SET status='' WHERE id NOT GLOB '_*' AND status != 'jail'`);
                                        db.run(`UPDATE Players SET blessed='',coward=1,cursed='${$.witch.user.id}' WHERE id NOT GLOB '_*' AND access != 'Elemental' AND id != '${$.player.id}'`);
                                        lib_1.news(`\t${$.witch.user.handle} resurrected all the dead and cursed everyone!`);
                                        lib_1.vt.outln(lib_1.vt.faint, 'The deed is done.', -200);
                                        break;
                                }
                            }
                            else {
                                $.player.coward = false;
                                witch();
                                return;
                            }
                            lib_1.vt.animated('fadeOut');
                            pause = true;
                            refresh = true;
                            menu();
                        }, prompt: 'Do you accept my offer to help (Y/N)? ', cancel: 'Y', enter: 'Y', eol: false, match: /Y|N/i, max: 1, timeout: 50
                    }
                };
                lib_1.vt.action('yn');
                lib_1.vt.drain();
                lib_1.vt.outln(-1000);
                lib_1.vt.outln(lib_1.vt.faint, `${pc_1.PC.who($.witch).He}says, "`, lib_1.vt.green, lib_1.vt.normal, "Come hither. ", -1200, ['I am niece to Circe known for her vengeful morph', 'My grandfather is the sun god Helios', 'My grandmother is a daughter of the titan Oceanus', 'I am priestess to Hecate, source of my special magicks', 'I trusted an Argonaut. Once'][sys_1.dice(5) - 1], '.', lib_1.vt.reset, lib_1.vt.faint, '"', -2400);
                lib_1.vt.out(lib_1.vt.faint, '"', lib_1.vt.normal, lib_1.vt.green);
                let rs = db.query(`SELECT name,bearer FROM Rings WHERE bearer != '' AND bearer != '${$.player.id}'`);
                if (rs.length) {
                    lib_1.vt.out('I see powerful rings for the taking');
                    choice = 'rings';
                }
                else if (!items_1.Magic.have($.player.spells, 'Morph')) {
                    lib_1.vt.out(`I can ${$.player.magic < 3 ? 'provide' : 'teach'} you advanced magic`);
                    choice = 'magic';
                }
                else {
                    lib_1.vt.out('You can choose to ', lib_1.vt.reset, lib_1.vt.faint, 'resurrect the dead', lib_1.vt.reset, lib_1.vt.green, ' and send a ', lib_1.vt.reset, lib_1.vt.faint, 'Curse throughout the Land', lib_1.vt.reset, lib_1.vt.green);
                    choice = 'curse';
                }
                lib_1.vt.outln('.', lib_1.vt.reset, lib_1.vt.faint, '"', -1200);
                lib_1.vt.out(lib_1.vt.faint, '"', lib_1.vt.normal, lib_1.vt.green, 'Of course, there is a price to pay, something you may hold dear.', lib_1.vt.reset, lib_1.vt.faint, '"');
                lib_1.vt.focus = 'offer';
                ROOM.occupant = '';
                return false;
        }
        switch (ROOM.giftItem) {
            case 'armor':
                let xarmor = { user: Object.assign({}, $.player) };
                pc_1.PC.reroll(xarmor.user);
                xarmor.user.armor = items_1.Armor.special[ROOM.giftValue];
                pc_1.PC.activate(xarmor);
                if (items_1.Armor.swap($.online, xarmor)) {
                    lib_1.vt.profile({ jpg: `specials/${$.player.armor}`, effect: 'fadeInUpBig' });
                    lib_1.vt.outln(lib_1.vt.faint, lib_1.vt.yellow, 'You find', lib_1.vt.normal, sys_1.an($.player.armor.toString()), lib_1.vt.bright, '!');
                    lib_1.vt.sound('max');
                    pause = true;
                    ROOM.giftItem = '';
                }
                break;
            case 'chest':
                let gold = new items_1.Coin(sys_1.money(Z));
                gold.value += lib_1.tradein($.online.weapon.value);
                gold.value += lib_1.tradein($.online.armor.value);
                gold.value *= +ROOM.giftValue;
                gold = gold.pick(1);
                if (gold.value) {
                    if (gold.value > 1e+17)
                        gold.value = 1e+17;
                    lib_1.vt.profile({ jpg: `specials/chest`, effect: 'fadeInUpBig' });
                    lib_1.vt.sound('yahoo', 10);
                    lib_1.vt.outln(lib_1.vt.yellow, 'You find a ', lib_1.vt.bright, 'treasure chest', lib_1.vt.normal, ' holding ', lib_1.carry(gold), '!');
                }
                else {
                    lib_1.vt.outln(lib_1.vt.faint, lib_1.vt.yellow, 'You find an empty, treasure chest.');
                    lib_1.vt.sound('boo');
                }
                $.player.coin.value += gold.value;
                pause = true;
                ROOM.giftItem = '';
                break;
            case 'magic':
                if (!items_1.Magic.have($.player.spells, +ROOM.giftValue)) {
                    lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.yellow, 'You find a ', lib_1.vt.cyan, items_1.Magic.merchant[+ROOM.giftValue - 1], lib_1.vt.yellow, ' ', $.player.magic == 2 ? 'scroll' : 'wand', '!');
                    items_1.Magic.add($.player.spells, +ROOM.giftValue);
                    pause = true;
                    ROOM.giftItem = '';
                }
                break;
            case 'map':
                npc_1.dungeon.level.map = `Marauder's map`;
                lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.yellow, `You find ${npc_1.dungeon.level.map}!`);
                pause = true;
                refresh = true;
                ROOM.giftItem = '';
                break;
            case 'poison':
                if (!items_1.Poison.have($.player.poisons, +ROOM.giftValue)) {
                    lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.yellow, 'You find a vial of ', items_1.Poison.merchant[+ROOM.giftValue - 1], '!');
                    items_1.Poison.add($.player.poisons, +ROOM.giftValue);
                    pause = true;
                    ROOM.giftItem = '';
                }
                break;
            case 'potion':
                let id = false;
                if (npc_1.dungeon.level.moves < npc_1.dungeon.level.width && !ROOM.giftID)
                    ROOM.giftID = !$.player.novice
                        && sys_1.dice(100 + +ROOM.giftValue) < ($.online.int / 20 * (1 << $.player.poison) + ($.online.int > 90 ? ($.online.int % 90) << 1 : 0));
                lib_1.vt.sound('bubbles');
                lib_1.vt.out(lib_1.vt.cyan, 'On the ground, you find a ');
                if (items_1.Ring.power([], $.player.rings, 'identify').power)
                    npc_1.dungeon.potions[ROOM.giftValue].identified = true;
                if (npc_1.dungeon.potions[ROOM.giftValue].identified || ROOM.giftID || $.access.sysop) {
                    lib_1.vt.profile({ png: npc_1.dungeon.potions[ROOM.giftValue].image, handle: npc_1.dungeon.potion[ROOM.giftValue], effect: 'fadeInUp' });
                    lib_1.vt.out(lib_1.vt.bright, npc_1.dungeon.potion[ROOM.giftValue], lib_1.vt.normal, '.');
                    if (!npc_1.dungeon.potions[ROOM.giftValue].identified)
                        npc_1.dungeon.potions[ROOM.giftValue].identified = $.player.novice || $.online.int > (85 - 4 * $.player.poison);
                    id = true;
                }
                else {
                    lib_1.vt.profile({ png: npc_1.dungeon.potions[ROOM.giftValue].image, handle: 'Is it ' + 'nt'[sys_1.dice(2) - 1] + 'asty, precious?', effect: 'fadeInUp' });
                    lib_1.vt.out(npc_1.dungeon.potions[ROOM.giftValue].description, lib_1.vt.cyan, lib_1.vt.bright, ' dungeon.potion', lib_1.vt.normal, '.');
                }
                if (id ||
                    (sys_1.dice(100 + 10 * +ROOM.giftValue * sys_1.int($.player.coward)) + sys_1.dice(deep / 2) < (50 + sys_1.int($.online.int / 2)) && sys_1.dice(100) > 1)) {
                    lib_1.vt.action('dungeon.potion');
                    lib_1.vt.form = {
                        'quaff': {
                            cb: () => {
                                lib_1.vt.outln('\n');
                                if (/N/i.test(lib_1.vt.entry)) {
                                    looked = true;
                                    menu();
                                    return;
                                }
                                if (/Y/i.test(lib_1.vt.entry))
                                    quaff(+ROOM.giftValue);
                                else if (/T/i.test(lib_1.vt.entry)) {
                                    quaff(+ROOM.giftValue, false);
                                    lib_1.vt.sound('click');
                                    pause = false;
                                }
                                ROOM.giftItem = '';
                                menu();
                            }, prompt: 'Will you drink it (Yes/No/Toss)? ', cancel: 'T', enter: 'N', eol: false, match: /Y|N|T/i, timeout: 10
                        }
                    };
                    lib_1.vt.focus = 'quaff';
                    return false;
                }
                else {
                    let auto = sys_1.dice(2) < 2;
                    lib_1.vt.outln(lib_1.vt.faint, '\nYou ', -500, auto ? 'quaff' : 'toss', ' it without hesitation.', -500);
                    quaff(+ROOM.giftValue, auto);
                    ROOM.giftItem = '';
                }
                break;
            case 'ring':
                let ring = ROOM.giftValue.toString();
                if (!db.query(`SELECT bearer FROM Rings WHERE name='${ring}' AND bearer != ''`).length
                    && items_1.Ring.wear($.player.rings, ring)) {
                    lib_1.getRing('find', ring);
                    pc_1.PC.saveRing(ring, $.player.id, $.player.rings);
                    pause = true;
                    ROOM.giftItem = '';
                }
                break;
            case 'weapon':
                let xweapon = { user: Object.assign({}, $.player) };
                pc_1.PC.reroll(xweapon.user);
                xweapon.user.weapon = items_1.Weapon.special[ROOM.giftValue];
                pc_1.PC.activate(xweapon);
                if (items_1.Weapon.swap($.online, xweapon)) {
                    lib_1.vt.profile({ jpg: `specials/${$.player.weapon}`, effect: 'fadeInUpBig' });
                    lib_1.vt.outln(lib_1.vt.faint, lib_1.vt.cyan, 'You find', lib_1.vt.normal, sys_1.an($.player.weapon.toString()), lib_1.vt.bright, '!');
                    lib_1.vt.sound('max');
                    pause = true;
                    ROOM.giftItem = '';
                }
                break;
            case 'xmagic':
                if (!items_1.Magic.have($.player.spells, ROOM.giftValue)) {
                    lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.yellow, 'You find a ', lib_1.vt.magenta, items_1.Magic.special[+ROOM.giftValue - items_1.Magic.merchant.length - 1], lib_1.vt.yellow, ' ', $.player.magic == 1 ? 'wand' : 'scroll', '!');
                    items_1.Magic.add($.player.spells, +ROOM.giftValue);
                    pause = true;
                    ROOM.giftItem = '';
                }
                break;
        }
        return true;
    }
    function doSpoils() {
        if ($.reason) {
            $.reason = `${$.reason} on level ${sys_1.romanize(deep + 1)}.${Z + 1}`;
            npc_1.dungeon.level.map = `Marauder's map`;
            scroll();
            lib_1.vt.hangup();
        }
        looked = false;
        pause = false;
        for (let n = ROOM.monster.length - 1; n >= 0; n--) {
            if (ROOM.monster[n].hp < 1) {
                let mon = { user: { id: '' } };
                Object.assign(mon, ROOM.monster[n]);
                if (mon.hp < 0) {
                    let y = sys_1.dice(npc_1.dungeon.level.rooms.length) - 1;
                    let x = sys_1.dice(npc_1.dungeon.level.width) - 1;
                    mon.hp = Math.abs(mon.hp) + sys_1.int(mon.user.hp / (sys_1.dice(5) + 5));
                    mon.sp += sys_1.int(mon.user.sp / (sys_1.dice(5) + 5));
                    npc_1.dungeon.level.rooms[y][x].monster.push(mon);
                }
                else {
                    if (!$.player.coward && (mon.user.xplevel - Z) > 5) {
                        if ($.player.cursed) {
                            lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.black, 'The dark cloud has left you.');
                            $.player.cursed = '';
                        }
                        let m = sys_1.int((mon.user.xplevel - Z) / 6);
                        lib_1.vt.beep();
                        lib_1.vt.out(lib_1.vt.lyellow, `+ ${mon.user.pc} bonus`);
                        if (sys_1.int(mon.pc.bonusStr)) {
                            pc_1.PC.adjust('str', m * mon.pc.bonusStr, m * mon.pc.bonusStr, m * mon.pc.bonusStr);
                            lib_1.vt.out(lib_1.vt.lred, ' strength', lib_1.bracket(`+${m * mon.pc.bonusStr}`, false));
                        }
                        pc_1.PC.adjust('str', m);
                        if (sys_1.int(mon.pc.bonusInt)) {
                            pc_1.PC.adjust('int', m * mon.pc.bonusInt, m * mon.pc.bonusInt, m * mon.pc.bonusInt);
                            lib_1.vt.out(lib_1.vt.lmagenta, ' intellect', lib_1.bracket(`+${m * mon.pc.bonusInt}`, false));
                        }
                        pc_1.PC.adjust('int', m);
                        if (sys_1.int(mon.pc.bonusDex)) {
                            pc_1.PC.adjust('dex', m * mon.pc.bonusDex, m * mon.pc.bonusDex, m * mon.pc.bonusDex);
                            lib_1.vt.out(lib_1.vt.lcyan, ' dexterity', lib_1.bracket(`+${m * mon.pc.bonusDex}`, false));
                        }
                        pc_1.PC.adjust('dex', m);
                        if (sys_1.int(mon.pc.bonusCha)) {
                            pc_1.PC.adjust('cha', m * mon.pc.bonusCha, m * mon.pc.bonusCha, m * mon.pc.bonusCha);
                            lib_1.vt.out(lib_1.vt.lgreen, ' charisma', lib_1.bracket(`+${m * mon.pc.bonusCha}`, false));
                        }
                        pc_1.PC.adjust('cha', m);
                        lib_1.vt.outln('\n', -500);
                        Battle.yourstats(false);
                        lib_1.vt.outln(-500);
                        npc_1.dungeon.level.moves >>= 1;
                    }
                }
                if (mon.user.xplevel == 0) {
                    lib_1.vt.sound('oops');
                    ROOM.monster[n].monster.effect = 'flip';
                    npc_1.dungeon.monsters[mon.user.handle].pc = '*';
                    pc_1.PC.activate(mon);
                    for (let i = 0; i < sys_1.dice(3); i++) {
                        let avenger = { monster: { name: '', pc: '' }, user: { id: '' } };
                        Object.assign(avenger.user, mon.user);
                        avenger.user.pc = pc_1.PC.random('monster');
                        avenger.user.handle += lib_1.vt.attr(' ', lib_1.vt.uline, 'avenger', lib_1.vt.nouline);
                        pc_1.PC.reroll(avenger.user, avenger.user.pc, sys_1.int(avenger.user.level / 2));
                        for (let magic in ROOM.monster[n].monster.spells)
                            items_1.Magic.add(avenger.user.spells, ROOM.monster[n].monster.spells[magic]);
                        for (let poison in ROOM.monster[n].monster.poisons)
                            items_1.Poison.add(avenger.user.poisons, ROOM.monster[n].monster.poisons[poison]);
                        avenger.user.steal = 2;
                        pc_1.PC.activate(avenger);
                        avenger.str = 99;
                        avenger.int = 99;
                        avenger.dex = 99;
                        avenger.cha = 99;
                        Object.assign(avenger.monster, npc_1.dungeon.monsters[mon.user.handle]);
                        avenger.monster.pc = avenger.user.pc;
                        ROOM.monster.push(avenger);
                    }
                }
                ROOM.monster.splice(n, 1);
                pause = true;
            }
            else {
                if (ROOM.monster[n].user.xplevel == 0) {
                    lib_1.vt.sound('heal', 3);
                    let ha = $.player.magic > 2 ? sys_1.int($.player.level / 16) + 13 : 16;
                    let hr = 0;
                    for (let i = 0; i < $.player.level; i++)
                        hr += sys_1.dice(ha);
                    $.online.hp += hr;
                    if ($.online.hp > $.player.hp)
                        $.online.hp = $.player.hp;
                }
                else if (ROOM.monster[n].user.xplevel < 0)
                    ROOM.monster.splice(n, 1);
            }
        }
        if (!ROOM.monster.length) {
            if ((!npc_1.dungeon.level.map || npc_1.dungeon.level.map == 'map') && sys_1.dice((15 - $.online.cha / 10) / 2) == 1) {
                let m = ['', 'map', 'magic map'][(sys_1.dice(Z / 33 + 2) > 1 ? 1 : 2)];
                if (npc_1.dungeon.level.map.length < m.length) {
                    npc_1.dungeon.level.map = m;
                    lib_1.vt.sound('click');
                    lib_1.vt.outln(lib_1.vt.yellow, lib_1.vt.bright, 'You find a ', m, '!');
                    pause = true;
                }
            }
            if (b4 < 0) {
                lib_1.vt.outln(-100);
                lib_1.vt.sound('effort');
                lib_1.vt.outln(lib_1.vt.green, lib_1.vt.bright, '+ ', lib_1.vt.normal, 'bonus charisma', -200);
                pc_1.PC.adjust('cha', sys_1.dice(Math.abs(b4)), 1, 1);
                pause = true;
            }
            if ((b4 !== 0 && (!npc_1.dungeon.level.map || npc_1.dungeon.level.map !== 'map') && npc_1.dungeon.level.cleric.sp == npc_1.dungeon.level.cleric.user.sp)
                && ((b4 > 0 && b4 / $.player.hp < 0.67 && $.online.hp / $.player.hp < 0.067)
                    || ($.online.hp <= Z + deep + 1))) {
                lib_1.vt.outln(-100);
                lib_1.vt.sound('bravery', 20);
                lib_1.vt.outln(lib_1.vt.red, lib_1.vt.bright, '+ ', lib_1.vt.normal, 'bonus strength', -600);
                pc_1.PC.adjust('str', deep + 2, deep + 1, 1);
                npc_1.dungeon.level.map = `Marauder's map`;
                lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.yellow, ' and ', npc_1.dungeon.level.map, '!', -600);
                pause = true;
            }
        }
        if (Battle.teleported) {
            Battle.teleported = false;
            if (Battle.expel) {
                Battle.expel = false;
                pc_1.PC.portrait($.online, 'flipOutX');
                if (deep > 0)
                    deep--;
                else {
                    scroll(1, false, true);
                    fini();
                    return;
                }
                generateLevel();
            }
            else {
                pc_1.PC.portrait($.online, 'lightSpeedOut', ` - Dungeon ${sys_1.romanize(deep + 1)}.${Z + 1}`);
                Y = sys_1.dice(npc_1.dungeon.level.rooms.length) - 1;
                X = sys_1.dice(npc_1.dungeon.level.width) - 1;
            }
            menu();
            return;
        }
        if (Battle.retreat)
            pc_1.PC.portrait($.online, 'heartBeat', ` - Dungeon ${sys_1.romanize(deep + 1)}.${Z + 1}`);
        let d = ['N', 'S', 'E', 'W'];
        while (Battle.retreat && !$.reason) {
            lib_1.vt.music('pulse');
            lib_1.vt.out(-375, lib_1.vt.bright, lib_1.vt.red, 'You frantically look to escape . . . ', -375);
            let i = sys_1.dice(d.length) - 1;
            switch (d[i]) {
                case 'N':
                    if (Y > 0 && npc_1.dungeon.level.rooms[Y][X].type !== 'w-e')
                        if (npc_1.dungeon.level.rooms[Y - 1][X].type !== 'w-e') {
                            Battle.retreat = false;
                            Y--;
                            looked = false;
                            lib_1.vt.animated('fadeOutUp');
                            break;
                        }
                    oof('north');
                    break;
                case 'S':
                    if (Y < npc_1.dungeon.level.rooms.length - 1 && npc_1.dungeon.level.rooms[Y][X].type !== 'w-e')
                        if (npc_1.dungeon.level.rooms[Y + 1][X].type !== 'w-e') {
                            Battle.retreat = false;
                            Y++;
                            looked = false;
                            lib_1.vt.animated('fadeOutDown');
                            break;
                        }
                    oof('south');
                    break;
                case 'E':
                    if (X < npc_1.dungeon.level.width - 1 && npc_1.dungeon.level.rooms[Y][X].type !== 'n-s')
                        if (npc_1.dungeon.level.rooms[Y][X + 1].type !== 'n-s') {
                            Battle.retreat = false;
                            X++;
                            looked = false;
                            lib_1.vt.animated('fadeOutRight');
                            break;
                        }
                    oof('east');
                    break;
                case 'W':
                    if (X > 0 && npc_1.dungeon.level.rooms[Y][X].type !== 'n-s')
                        if (npc_1.dungeon.level.rooms[Y][X - 1].type !== 'n-s') {
                            Battle.retreat = false;
                            X--;
                            looked = false;
                            lib_1.vt.animated('fadeOutLeft');
                            break;
                        }
                    oof('west');
                    break;
            }
            d.splice(i, 1);
            pause = true;
        }
        menu();
    }
    function drawHero(peek = false) {
        lib_1.vt.save();
        ROOM = npc_1.dungeon.level.rooms[Y][X];
        if (!npc_1.dungeon.level.map || peek) {
            if (Y > 0 && npc_1.dungeon.level.rooms[Y][X].type !== 'w-e')
                if (npc_1.dungeon.level.rooms[Y - 1][X].type !== 'w-e')
                    drawRoom(Y - 1, X, false, peek);
            if (Y < npc_1.dungeon.level.rooms.length - 1 && npc_1.dungeon.level.rooms[Y][X].type !== 'w-e')
                if (npc_1.dungeon.level.rooms[Y + 1][X].type !== 'w-e')
                    drawRoom(Y + 1, X, false, peek);
            if (X < npc_1.dungeon.level.width - 1 && npc_1.dungeon.level.rooms[Y][X].type !== 'n-s')
                if (npc_1.dungeon.level.rooms[Y][X + 1].type !== 'n-s')
                    drawRoom(Y, X + 1, false, peek);
            if (X > 0 && npc_1.dungeon.level.rooms[Y][X].type !== 'n-s')
                if (npc_1.dungeon.level.rooms[Y][X - 1].type !== 'n-s')
                    drawRoom(Y, X - 1, false, peek);
        }
        if (!npc_1.dungeon.level.map)
            drawRoom(Y, X, false, peek);
        lib_1.vt.plot(Y * 2 + 2, X * 6 + 2);
        if ($.online.hp > 0) {
            if ($.player.emulation == 'XT')
                lib_1.vt.out($.player.blessed ? lib_1.vt.Cyan : $.player.cursed ? lib_1.vt.lBlue : lib_1.vt.lBlack, ' ', ($.player.toWC + $.online.toWC) > 0 ? lib_1.vt.attr(lib_1.vt.bright, lib_1.vt.cyan)
                    : ($.player.toWC + $.online.toWC) < 0 ? lib_1.vt.attr(lib_1.vt.bright, lib_1.vt.magenta)
                        : lib_1.vt.cyan, $.online.weapon.wc ? '⚸' : ' ', $.player.blessed ? lib_1.vt.bright : lib_1.vt.normal, $.online.hp > $.player.hp * 2 / 3 ? lib_1.vt.white : $.online.hp > $.player.hp / 3 ? lib_1.vt.yellow : lib_1.vt.red, pc_1.PC.card($.player.pc).unicode, ($.player.toAC + $.online.toAC) > 0 ? lib_1.vt.attr(lib_1.vt.normal, lib_1.vt.bright)
                    : ($.player.toAC + $.online.toAC) < 0 ? lib_1.vt.attr(lib_1.vt.normal, lib_1.vt.faint)
                        : lib_1.vt.normal, lib_1.vt.yellow, $.online.armor.ac ? '⛨' : ' ', ' ');
            else
                lib_1.vt.out($.player.blessed ? lib_1.vt.bright : $.player.cursed ? lib_1.vt.faint : lib_1.vt.off, lib_1.vt.reverse, '-YOU-');
        }
        else
            lib_1.vt.out(lib_1.vt.Blue, lib_1.vt.cyan, lib_1.vt.bright, lib_1.vt.reverse, `  ${$.player.emulation == 'XT' ? pc_1.PC.card($.player.pc).unicode : 'X'}  `, -600);
        lib_1.vt.restore();
        lib_1.vt.out(lib_1.vt.off);
    }
    function eraseHero(peek = false) {
        lib_1.vt.out(lib_1.vt.reset);
        lib_1.vt.save();
        ROOM = npc_1.dungeon.level.rooms[Y][X];
        if (!npc_1.dungeon.level.map || peek) {
            if (Y > 0 && npc_1.dungeon.level.rooms[Y][X].type !== 'w-e')
                if (npc_1.dungeon.level.rooms[Y - 1][X].type !== 'w-e')
                    drawRoom(Y - 1, X, false);
            if (Y < npc_1.dungeon.level.rooms.length - 1 && npc_1.dungeon.level.rooms[Y][X].type !== 'w-e')
                if (npc_1.dungeon.level.rooms[Y + 1][X].type !== 'w-e')
                    drawRoom(Y + 1, X, false);
            if (X < npc_1.dungeon.level.width - 1 && npc_1.dungeon.level.rooms[Y][X].type !== 'n-s')
                if (npc_1.dungeon.level.rooms[Y][X + 1].type !== 'n-s')
                    drawRoom(Y, X + 1, false);
            if (X > 0 && npc_1.dungeon.level.rooms[Y][X].type !== 'n-s')
                if (npc_1.dungeon.level.rooms[Y][X - 1].type !== 'n-s')
                    drawRoom(Y, X - 1, false);
        }
        lib_1.vt.restore();
        drawRoom(Y, X);
    }
    function drawLevel() {
        let y, x, m;
        lib_1.vt.cls();
        if (npc_1.dungeon.level.map) {
            for (y = 0; y < paper.length; y++) {
                if (y % 2) {
                    for (x = 0; x < npc_1.dungeon.level.width; x++) {
                        if ($.player.emulation == 'VT')
                            lib_1.vt.out('\x1B(0', lib_1.vt.faint, paper[y].substr(6 * x, 1), '\x1B(B');
                        else
                            lib_1.vt.out(lib_1.vt.black, lib_1.vt.bright, paper[y].substr(6 * x, 1));
                        let r = sys_1.int(y / 2);
                        occupying(npc_1.dungeon.level.rooms[r][x], lib_1.vt.attr(lib_1.vt.reset, lib_1.vt.faint), (npc_1.dungeon.level.map && npc_1.dungeon.level.map !== 'map')
                            || (npc_1.dungeon.level.rooms[r][x].map && Math.abs(Y - r) < sys_1.int($.online.int / 15) && Math.abs(X - x) < sys_1.int($.online.int / 15)), npc_1.dungeon.level.map == `Marauder's map` || (items_1.Ring.power([], $.player.rings, 'identify').power > 0));
                    }
                    if ($.player.emulation == 'VT')
                        lib_1.vt.out('\x1B(0', lib_1.vt.faint, paper[y].substr(-1), '\x1B(B');
                    else
                        lib_1.vt.out(lib_1.vt.black, lib_1.vt.bright, paper[y].substr(-1));
                }
                else {
                    if ($.player.emulation == 'VT')
                        lib_1.vt.out('\x1B(0', lib_1.vt.faint, paper[y], '\x1B(B');
                    else
                        lib_1.vt.out(lib_1.vt.black, lib_1.vt.bright, paper[y]);
                }
                lib_1.vt.outln();
            }
        }
        else {
            for (y = 0; y < npc_1.dungeon.level.rooms.length; y++)
                for (x = 0; x < npc_1.dungeon.level.width; x++)
                    if (npc_1.dungeon.level.rooms[y][x].map)
                        drawRoom(y, x, false);
        }
        lib_1.vt.plot(paper.length + 1, 1);
        if ($.online.hp > 0)
            scroll(paper.length + 1, false);
        refresh = false;
    }
    function drawRoom(r, c, keep = true, peek = false) {
        if (keep)
            lib_1.vt.save();
        ROOM = npc_1.dungeon.level.rooms[r][c];
        if (peek && !ROOM.map)
            if ($.online.int > 49)
                ROOM.map = true;
        let row = r * 2, col = c * 6;
        if (!npc_1.dungeon.level.map) {
            lib_1.vt.plot(row + 1, col + 1);
            if ($.player.emulation == 'VT')
                lib_1.vt.out('\x1B(0', lib_1.vt.faint, paper[row].substr(col, 7), '\x1B(B');
            else
                lib_1.vt.out(lib_1.vt.black, lib_1.vt.bright, paper[row].substr(col, 7));
        }
        row++;
        lib_1.vt.plot(row + 1, col + 1);
        if ($.player.emulation == 'VT')
            lib_1.vt.out('\x1B(0', lib_1.vt.faint, paper[row].substr(col, 1), '\x1B(B');
        else
            lib_1.vt.out(lib_1.vt.black, lib_1.vt.bright, paper[row].substr(col, 1));
        occupying(ROOM, peek ? lib_1.vt.attr(lib_1.vt.reset) : lib_1.vt.attr(lib_1.vt.reset, lib_1.vt.faint), (npc_1.dungeon.level.map && npc_1.dungeon.level.map !== 'map')
            || (ROOM.map && Math.abs(Y - r) < sys_1.int($.online.int / 15) && Math.abs(X - c) < sys_1.int($.online.int / 15)), peek || npc_1.dungeon.level.map == `Marauder's map` || (items_1.Ring.power([], $.player.rings, 'identify').power > 0));
        if ($.player.emulation == 'VT')
            lib_1.vt.out('\x1B(0', lib_1.vt.faint, paper[row].substr(col + 6, 1), '\x1B(B');
        else
            lib_1.vt.out(lib_1.vt.black, lib_1.vt.bright, paper[row].substr(col + 6, 1));
        if (!npc_1.dungeon.level.map) {
            row++;
            lib_1.vt.plot(row + 1, col + 1);
            if ($.player.emulation == 'VT')
                lib_1.vt.out('\x1B(0', lib_1.vt.faint, paper[row].substr(col, 7), '\x1B(B');
            else
                lib_1.vt.out(lib_1.vt.black, lib_1.vt.bright, paper[row].substr(col, 7));
        }
        if (keep)
            lib_1.vt.restore();
    }
    function generateLevel() {
        lib_1.vt.title(`${$.player.handle}: level ${$.player.level} ${$.player.pc} - Dungeon ${sys_1.romanize(deep + 1)}.${Z + 1}`);
        lib_1.vt.action('clear');
        looked = false;
        refresh = true;
        if (!npc_1.dungeon.domain[deep])
            npc_1.dungeon.domain[deep] = new Array($.sysop.level);
        if (npc_1.dungeon.domain[deep][Z]) {
            npc_1.dungeon.level = npc_1.dungeon.domain[deep][Z];
            renderMap();
            do {
                Y = sys_1.dice(npc_1.dungeon.level.rooms.length) - 1;
                X = sys_1.dice(npc_1.dungeon.level.width) - 1;
                ROOM = npc_1.dungeon.level.rooms[Y][X];
            } while (ROOM.type);
            npc_1.dungeon.level.alert = true;
            npc_1.dungeon.level.exit = false;
            npc_1.dungeon.level.events++;
            npc_1.dungeon.level.moves = npc_1.dungeon.level.moves > npc_1.dungeon.level.rooms.length * npc_1.dungeon.level.width
                ? npc_1.dungeon.level.rooms.length * npc_1.dungeon.level.width
                : npc_1.dungeon.level.moves > npc_1.dungeon.level.width
                    ? npc_1.dungeon.level.moves - npc_1.dungeon.level.width
                    : 1;
            recovery();
            return;
        }
        if (deep > hideep)
            hideep = deep;
        if (Z > hiZ)
            hiZ = Z;
        let y, x;
        let result;
        do {
            let maxRow = 6 + sys_1.dice(Z / 32 + 1);
            while (maxRow < 10 && sys_1.dice($.online.cha / 10) == 1)
                maxRow++;
            let maxCol = 6 + sys_1.dice(Z / 16 + 1);
            while (maxCol < 13 && sys_1.dice($.online.cha / 10) == 1)
                maxCol++;
            npc_1.dungeon.domain[deep][Z] = {
                alert: true,
                cleric: { user: db.fillUser('old cleric') },
                events: sys_1.dice(6 - sys_1.int($.online.cha / 20)) + sys_1.dice(deep / 3 + 1) + sys_1.int($.player.coward)
                    - +$.player.novice - sys_1.int($.access.sysop),
                exit: false,
                map: '',
                mob: (deep < 4 && Z < 4) ? 1 : (Z > 9 && Z < 50) || (deep > 7) ? 3 : 2,
                moves: -(Z > $.player.level ? ($.player.novice || $.access.sysop ? maxRow + maxCol : $.player.wins) : maxCol),
                rooms: new Array(maxRow),
                spawn: sys_1.int(deep / 3 + Z / 9 + maxRow / 3) + sys_1.dice(Math.round($.online.cha / 20) + 1) + 3,
                width: maxCol
            };
            npc_1.dungeon.level = npc_1.dungeon.domain[deep][Z];
            for (y = 0; y < maxRow; y++) {
                npc_1.dungeon.level.rooms[y] = new Array(maxCol);
                for (x = 0; x < maxCol; x++)
                    npc_1.dungeon.level.rooms[y][x] = { map: true, monster: [], occupant: '', type: '' };
            }
            for (y = 0; y < maxRow; y++) {
                for (x = 0; x < maxCol; x++) {
                    let n;
                    ROOM = npc_1.dungeon.level.rooms[y][x];
                    while ((n = sys_1.int((sys_1.dice(4) + sys_1.dice(4)) / 2) - 1) == 3)
                        ;
                    if (n == 1 && sys_1.dice(10 - deep) == n)
                        n += 2 - sys_1.dice(3);
                    ROOM.type = (n == 0) ? 'cavern' : (n == 1) ? '' : sys_1.dice(2) == 1 ? 'n-s' : 'w-e';
                    ROOM.size = (!ROOM.type ? 2 : ROOM.type == 'cavern' ? 3 : 1);
                }
            }
            result = false;
            spider(0, 0);
            for (y = 0; y < maxRow; y++)
                for (x = 0; x < maxCol; x++)
                    if (npc_1.dungeon.level.rooms[y][x].map)
                        result = true;
        } while (result);
        pc_1.PC.reroll(npc_1.dungeon.level.cleric.user, npc_1.dungeon.level.cleric.user.pc, sys_1.int(65 + Z / 4 + deep));
        pc_1.PC.activate(npc_1.dungeon.level.cleric);
        lib_1.vt.wall($.player.handle, `enters dungeon level ${sys_1.romanize(deep + 1)}.${Z + 1}`);
        renderMap();
        do {
            Y = sys_1.dice(npc_1.dungeon.level.rooms.length) - 1;
            X = sys_1.dice(npc_1.dungeon.level.width) - 1;
            ROOM = npc_1.dungeon.level.rooms[Y][X];
        } while (ROOM.type);
        let n = sys_1.int(npc_1.dungeon.level.rooms.length * npc_1.dungeon.level.width / 6) + sys_1.dice(Z / 9) + sys_1.dice(deep)
            + sys_1.dice(Z < 50 && $.online.cha < 80 ? ((80 - $.online.cha) / 9) : ((100 - $.online.cha) / 3));
        while (n)
            if (putMonster())
                n--;
        if (ROOM.monster.length > 1)
            ROOM.monster.splice(1, ROOM.monster.length - 1);
        let wow = 1;
        let dank = deep + 1, level = Z + 1;
        if (!$.player.novice) {
            if (sys_1.dice($.online.str - dank) <= dank) {
                y = sys_1.dice(npc_1.dungeon.level.rooms.length) - 1;
                x = sys_1.dice(npc_1.dungeon.level.width) - 1;
                npc_1.dungeon.level.rooms[y][x].occupant = 'dwarf';
            }
            if (sys_1.dice(100 - level + dank) <= dank) {
                y = sys_1.dice(npc_1.dungeon.level.rooms.length) - 1;
                x = sys_1.dice(npc_1.dungeon.level.width) - 1;
                npc_1.dungeon.level.rooms[y][x].occupant = 'wheel';
            }
            if (well && sys_1.dice((120 - level) / 3 - dank) == 1) {
                y = sys_1.dice(npc_1.dungeon.level.rooms.length) - 1;
                x = sys_1.dice(npc_1.dungeon.level.width) - 1;
                npc_1.dungeon.level.rooms[y][x].occupant = 'well';
            }
            if ($.sorceress && Z > 20 && dank > 4 && sys_1.dice((120 - level) / 3 - dank) == 1) {
                y = sys_1.dice(npc_1.dungeon.level.rooms.length) - 1;
                x = sys_1.dice(npc_1.dungeon.level.width) - 1;
                npc_1.dungeon.level.rooms[y][x].occupant = 'witch';
            }
            if (deep < 9 && deep < $.player.immortal && Z / 9 < $.player.immortal) {
                y = sys_1.dice(npc_1.dungeon.level.rooms.length) - 1;
                x = sys_1.dice(npc_1.dungeon.level.width) - 1;
                npc_1.dungeon.level.rooms[y][x].occupant = 'portal';
            }
        }
        if (!$.player.novice && sys_1.dice(100 / dank * level) <= dank)
            wow = sys_1.int(sys_1.dice(npc_1.dungeon.level.rooms.length) * sys_1.dice(npc_1.dungeon.level.width) / 2);
        if (!$.player.coward)
            wow--;
        n = sys_1.dice(deep / 4) + wow;
        for (let i = 0; i < n; i++) {
            do {
                y = sys_1.dice(npc_1.dungeon.level.rooms.length) - 1;
                x = sys_1.dice(npc_1.dungeon.level.width) - 1;
            } while (npc_1.dungeon.level.rooms[y][x].type == 'cavern');
            npc_1.dungeon.level.rooms[y][x].occupant = 'thief';
        }
        do {
            y = sys_1.dice(npc_1.dungeon.level.rooms.length) - 1;
            x = sys_1.dice(npc_1.dungeon.level.width) - 1;
        } while (npc_1.dungeon.level.rooms[y][x].type == 'cavern' || npc_1.dungeon.level.rooms[y][x].monster.length || npc_1.dungeon.level.rooms[y][x].occupant);
        npc_1.dungeon.level.rooms[y][x].occupant = 'cleric';
        do {
            y = sys_1.dice(npc_1.dungeon.level.rooms.length) - 1;
            x = sys_1.dice(npc_1.dungeon.level.width) - 1;
        } while (npc_1.dungeon.level.rooms[y][x].type == 'cavern' || npc_1.dungeon.level.rooms[y][x].monster.length || npc_1.dungeon.level.rooms[y][x].occupant);
        npc_1.dungeon.level.rooms[y][x].occupant = 'wizard';
        n = sys_1.int(npc_1.dungeon.level.rooms.length * npc_1.dungeon.level.width / 10);
        if (sys_1.dice(100 - Z) > (deep + 1))
            n += sys_1.dice(Z / 16 + 2);
        while (n--) {
            y = sys_1.dice(npc_1.dungeon.level.rooms.length) - 1;
            x = sys_1.dice(npc_1.dungeon.level.width) - 1;
            if (!npc_1.dungeon.level.rooms[y][x].occupant)
                npc_1.dungeon.level.rooms[y][x].occupant = 'trapdoor';
        }
        if (!$.player.coward)
            if ($.player.novice || sys_1.dice($.player.wins * dank + $.player.immortal + 1) >= (dank + level)) {
                y = sys_1.dice(npc_1.dungeon.level.rooms.length) - 1;
                x = sys_1.dice(npc_1.dungeon.level.width) - 1;
                npc_1.dungeon.level.rooms[y][x].giftItem = 'map';
                npc_1.dungeon.level.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '⎅' : npc_1.dungeon.Dot;
            }
        wow = 1;
        if (!$.player.novice && !$.player.coward)
            if (sys_1.dice(100 / dank * level) <= dank)
                wow += sys_1.int(sys_1.dice(npc_1.dungeon.level.rooms.length) * sys_1.dice(npc_1.dungeon.level.width) / 2);
        wow += sys_1.dice(level / 33) + sys_1.dice(dank / 3) - 2;
        let gift = ['map', 'chest', 'armor'];
        for (let j = 5; j > 0; j--) {
            gift.push('poison');
            gift.push(j % 2 ? 'map' : 'chest');
            gift.push(j > $.player.melee ? 'weapon' : 'armor');
            gift.push(sys_1.dice(level + 11 * ($.player.magic + j)) > ($.sysop.level - dank - j)
                ? 'ring' : $.player.magic > 2 ? (j > $.player.melee ? 'armor' : 'chest')
                : sys_1.dice(10 + dank - 2 * $.player.magic) > dank
                    ? 'magic' : 'xmagic');
        }
        gift.push('weapon', 'chest', 'map');
        if ($.access.sysop)
            gift.push('ring');
        for (let i = 0; i < wow && gift.length; i++) {
            do {
                y = sys_1.dice(npc_1.dungeon.level.rooms.length) - 1;
                x = sys_1.dice(npc_1.dungeon.level.width) - 1;
            } while (npc_1.dungeon.level.rooms[y][x].giftItem || npc_1.dungeon.level.rooms[y][x].occupant == 'wizard');
            if (items_1.Ring.power([], $.player.rings, 'identify').power)
                npc_1.dungeon.level.rooms[y][x].map = true;
            if (sys_1.dice(111 - $.online.cha) > sys_1.dice(dank) - sys_1.int($.player.coward)) {
                npc_1.dungeon.level.rooms[y][x].giftItem = 'potion';
                npc_1.dungeon.level.rooms[y][x].giftID = false;
                npc_1.dungeon.level.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '≬' : npc_1.dungeon.Dot;
                n = sys_1.dice(130 - deep);
                for (let j = 0; j < 16 && n > 0; j++) {
                    let v = 15 - j;
                    npc_1.dungeon.level.rooms[y][x].giftValue = v;
                    if ($.player.magic < 2 && (v == 10 || v == 11))
                        npc_1.dungeon.level.rooms[y][x].giftValue = (v == 11) ? 9 : 0;
                    n -= j + 1;
                }
                continue;
            }
            let v = sys_1.dice(gift.length) - 1;
            npc_1.dungeon.level.rooms[y][x].giftItem = gift.splice(v, 1)[0];
            npc_1.dungeon.level.rooms[y][x].giftValue = 0;
            v = 0;
            switch (npc_1.dungeon.level.rooms[y][x].giftItem) {
                case 'armor':
                    npc_1.dungeon.level.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '⛨' : npc_1.dungeon.Dot;
                    n = items_1.Armor.special.length - 1;
                    for (v = 0; v < n && $.online.armor.ac >= items_1.Armor.name[items_1.Armor.special[v]].ac; v++)
                        ;
                    break;
                case 'chest':
                    npc_1.dungeon.level.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '⌂' : npc_1.dungeon.Dot;
                    v = sys_1.dice(8 + 2 * (deep + $.player.steal)) - 1;
                    break;
                case 'magic':
                    npc_1.dungeon.level.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '∗' : npc_1.dungeon.Dot;
                    n = sys_1.dice(items_1.Magic.merchant.length * 16);
                    for (let j = 0; j < items_1.Magic.merchant.length && n > 0; j++) {
                        v = items_1.Magic.merchant.length - j;
                        n -= j + 1;
                    }
                    break;
                case 'map':
                    npc_1.dungeon.level.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '⎅' : npc_1.dungeon.Dot;
                    v = 1;
                    break;
                case 'poison':
                    npc_1.dungeon.level.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '⏽' : npc_1.dungeon.Dot;
                    n = sys_1.dice(items_1.Poison.merchant.length * 16);
                    for (let j = 0; j < items_1.Poison.merchant.length && n > 0; j++) {
                        v = items_1.Poison.merchant.length - j;
                        n -= j + 1;
                    }
                    break;
                case 'ring':
                    if (items_1.Ring.have($.player.rings, items_1.Ring.theOne))
                        npc_1.dungeon.level.rooms[y][x].map = true;
                    npc_1.dungeon.level.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '⍤' : npc_1.dungeon.Dot;
                    if (sys_1.dice(6 - sys_1.int(dank / 2)) > 1) {
                        let ring = items_1.Ring.common[sys_1.dice(items_1.Ring.common.length) - 1];
                        npc_1.dungeon.level.rooms[y][x].giftValue = ring;
                    }
                    else {
                        let ring = items_1.Ring.unique[sys_1.dice(items_1.Ring.unique.length) - 1];
                        npc_1.dungeon.level.rooms[y][x].giftValue = ring;
                    }
                    break;
                case 'weapon':
                    npc_1.dungeon.level.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '⚸' : npc_1.dungeon.Dot;
                    n = items_1.Weapon.special.length - 1;
                    for (v = 0; v < n && $.online.weapon.wc >= items_1.Weapon.name[items_1.Weapon.special[v]].wc; v++)
                        ;
                    break;
                case 'xmagic':
                    npc_1.dungeon.level.rooms[y][x].giftIcon = $.player.emulation == 'XT' ? '⋇' : npc_1.dungeon.Dot;
                    v = items_1.Magic.merchant.length + sys_1.dice(items_1.Magic.special.length);
                    break;
            }
            if (v)
                npc_1.dungeon.level.rooms[y][x].giftValue = v;
        }
        const pic = sys_1.whole((Z + 1) / 10);
        if (pic !== motif) {
            motif = pic;
            lib_1.vt.profile({ jpg: `dungeon/level${sys_1.sprintf('%x', motif)}`, handle: "Entering", level: $.player.level, pc: 'dungeon' });
            ROOM = npc_1.dungeon.level.rooms[Y][X];
            lib_1.vt.sleep(ROOM.occupant || ROOM.monster.length || ROOM.giftItem ? 3000 : 1000);
            lib_1.vt.drain();
        }
        function spider(r, c) {
            npc_1.dungeon.level.rooms[r][c].map = false;
            if (c + 1 < npc_1.dungeon.level.width)
                if (npc_1.dungeon.level.rooms[r][c + 1].map && npc_1.dungeon.level.rooms[r][c].type !== 'n-s' && npc_1.dungeon.level.rooms[r][c + 1].type !== 'n-s')
                    spider(r, c + 1);
            if (r + 1 < npc_1.dungeon.level.rooms.length)
                if (npc_1.dungeon.level.rooms[r + 1][c].map && npc_1.dungeon.level.rooms[r][c].type !== 'w-e' && npc_1.dungeon.level.rooms[r + 1][c].type !== 'w-e')
                    spider(r + 1, c);
            if (c > 0)
                if (npc_1.dungeon.level.rooms[r][c - 1].map && npc_1.dungeon.level.rooms[r][c].type !== 'n-s' && npc_1.dungeon.level.rooms[r][c - 1].type !== 'n-s')
                    spider(r, c - 1);
            if (r > 0)
                if (npc_1.dungeon.level.rooms[r - 1][c].map && npc_1.dungeon.level.rooms[r][c].type !== 'w-e' && npc_1.dungeon.level.rooms[r - 1][c].type !== 'w-e')
                    spider(r - 1, c);
        }
        function renderMap() {
            let min = lib_1.vt.checkTime();
            if (Z == 99 || Z - $.player.level > 8) {
                tl = min;
                lib_1.vt.music('tension' + sys_1.dice(3));
            }
            else if (tl - min > 4) {
                tl = min;
                lib_1.vt.music((deep % 2 ? 'ddd' : 'dungeon') + sys_1.dice(9));
            }
            const box = lib_1.vt.Draw;
            let r, c;
            paper = new Array(2 * npc_1.dungeon.level.rooms.length + 1);
            paper[0] = '\x00' + box[0].repeat(6 * npc_1.dungeon.level.width - 1) + '\x00';
            for (r = 1; r < 2 * npc_1.dungeon.level.rooms.length; r++)
                paper[r] = box[10] + ' '.repeat(6 * npc_1.dungeon.level.width - 1) + box[10];
            paper[paper.length - 1] = '\x00' + box[0].repeat(6 * npc_1.dungeon.level.width - 1) + '\x00';
            for (r = 0; r < npc_1.dungeon.level.rooms.length; r++) {
                for (c = 0; c < npc_1.dungeon.level.width; c++) {
                    ROOM = npc_1.dungeon.level.rooms[r][c];
                    let row = r * 2, col = c * 6;
                    if (ROOM.type == 'n-s') {
                        if (paper[row][col] == ' ')
                            paper[row] = replaceAt(paper[row], col, box[10]);
                        else if (paper[row][col] == box[3])
                            paper[row] = replaceAt(paper[row], col, box[6]);
                        else if (paper[row][col] == box[2])
                            paper[row] = replaceAt(paper[row], col, box[5]);
                        else if (paper[row][col] == box[1])
                            paper[row] = replaceAt(paper[row], col, box[4]);
                        else if (paper[row][col] == box[0])
                            paper[row] = replaceAt(paper[row], col, box[col > 0 && paper[row][col - 1] == ' ' ? 7
                                : paper[row][col + 1] == ' ' ? 9 : 8]);
                        row++;
                        paper[row] = replaceAt(paper[row], col, box[10]);
                        row++;
                        if (paper[row][col] == ' ')
                            paper[row] = replaceAt(paper[row], col, box[10]);
                        else if (paper[row][col] == box[0])
                            paper[row] = replaceAt(paper[row], col, box[col > 0 && paper[row][col - 1] == ' ' ? 1
                                : paper[row][col + 1] == ' ' ? 3 : 2]);
                        row = r * 2;
                        col += 6;
                        if (paper[row][col] == ' ')
                            paper[row] = replaceAt(paper[row], col, box[10]);
                        else if (paper[row][col] == box[0])
                            paper[row] = replaceAt(paper[row], col, box[paper[row][col - 1] == ' ' ? 7
                                : paper[row][col + 1] == ' ' ? 9 : 8]);
                        else if (paper[row][col] == box[1])
                            paper[row] = replaceAt(paper[row], col, box[4]);
                        else if (paper[row][col] == box[2])
                            paper[row] = replaceAt(paper[row], col, box[5]);
                        else if (paper[row][col] == box[3])
                            paper[row] = replaceAt(paper[row], col, box[6]);
                        row++;
                        paper[row] = replaceAt(paper[row], col, box[10]);
                        row++;
                        paper[row] = replaceAt(paper[row], col, box[row < 2 * npc_1.dungeon.level.rooms.length ? 10 : 2]);
                    }
                    if (ROOM.type == 'w-e') {
                        if (paper[row][col] == ' ')
                            paper[row] = replaceAt(paper[row], col, box[0]);
                        else if (paper[row][col] == box[3])
                            paper[row] = replaceAt(paper[row], col, box[2]);
                        else if (paper[row][col] == box[6])
                            paper[row] = replaceAt(paper[row], col, box[5]);
                        else if (paper[row][col] == box[9])
                            paper[row] = replaceAt(paper[row], col, box[8]);
                        else if (paper[row][col] == box[10])
                            paper[row] = replaceAt(paper[row], col, box[row > 0 && paper[row - 1][col] == ' ' ? 7
                                : paper[row + 1][col] == ' ' ? 1 : 4]);
                        col++;
                        paper[row] = replaceAt(paper[row], col, box[0].repeat(5));
                        col += 5;
                        if (paper[row][col] == ' ')
                            paper[row] = replaceAt(paper[row], col, box[0]);
                        else if (paper[row][col] == box[1])
                            paper[row] = replaceAt(paper[row], col, box[2]);
                        else if (paper[row][col] == box[10])
                            paper[row] = replaceAt(paper[row], col, box[paper[row + 1][col] == box[10] ? 6 : 3]);
                        row += 2;
                        col = c * 6;
                        if (paper[row][col] == box[10])
                            paper[row] = replaceAt(paper[row], col, box[col > 0 && paper[row][col - 1] == ' ' ? 1 : 4]);
                        else if (paper[row][col] == ' ')
                            paper[row] = replaceAt(paper[row], col, box[0]);
                        col++;
                        paper[row] = replaceAt(paper[row], col, box[0].repeat(5));
                        col += 5;
                        if (paper[row][col] == ' ')
                            paper[row] = replaceAt(paper[row], col, box[0]);
                        else if (paper[row][col] == box[10])
                            paper[row] = replaceAt(paper[row], col, box[paper[row + 1][col] == box[10] ? 6 : 3]);
                    }
                }
            }
            r = 2 * npc_1.dungeon.level.rooms.length;
            c = 6 * npc_1.dungeon.level.width;
            paper[0] = replaceAt(paper[0], 0, box[7]);
            paper[0] = replaceAt(paper[0], c, box[9]);
            paper[r] = replaceAt(paper[r], 0, box[1]);
            paper[r] = replaceAt(paper[r], c, box[3]);
            function replaceAt(target, offset, data) {
                return target.substr(0, offset) + data + target.substr(offset + data.length);
            }
        }
    }
    function genMonster(dm, m, capacity = 0, level = 0) {
        let n;
        if (!level) {
            for (n = 0; n < 4; n++)
                level += sys_1.dice(7);
            switch (level >> 2) {
                case 1:
                    level = sys_1.dice(Z / 2);
                    break;
                case 2:
                    level = Z - 3 - sys_1.dice(3);
                    break;
                case 3:
                    level = Z - sys_1.dice(3);
                    break;
                case 4:
                    level = Z;
                    break;
                case 5:
                    level = Z + sys_1.dice(3);
                    break;
                case 6:
                    level = Z + 3 + sys_1.dice(3);
                    break;
                case 7:
                    level = Z + sys_1.dice(Z < 40 ? Z / 2 : Z < 60 ? Z / 3 : Z < 80 ? Z / 4 : Z / 5);
                    break;
            }
        }
        while (level < 1)
            level += sys_1.dice(4) + sys_1.dice(3) - 1;
        if (level > 99)
            level = 100 - sys_1.dice(10);
        let v = 1;
        if (level > 9 && level < 90) {
            v = sys_1.dice(12);
            v = v == 12 ? 2 : v > 1 ? 1 : 0;
        }
        n = level + v - 1;
        m.user.handle = Object.keys(npc_1.dungeon.monsters)[n];
        Object.assign(dm, npc_1.dungeon.monsters[m.user.handle]);
        dm.level = 0;
        dm.size = npc_1.dungeon.monsters[m.user.handle].size || 1;
        if (capacity && dm.size > capacity)
            return;
        dm.level = level;
        if (dm.pc == '*') {
            dm.pc = pc_1.PC.random('monster');
            m.user.handle += ' avenger';
            m.user.steal = $.player.steal + 1;
        }
        m.monster = dm;
        m.effect = dm.effect || 'pulse';
        pc_1.PC.reroll(m.user, dm.pc ? dm.pc : $.player.pc, n);
        if (m.user.xplevel)
            m.user.xplevel = level;
        if (!dm.pc)
            m.user.steal = $.player.steal + 1;
        if (dm.weapon)
            m.user.weapon = dm.weapon;
        else {
            m.user.weapon = sys_1.int((level + deep) / 100 * sys_1.int($.sysop.weapon));
            m.user.weapon = sys_1.int((m.user.weapon + $.online.weapon.wc) / 2);
            if ($.player.level <= Z
                && sys_1.dice(12 + deep / 2 + $.player.level / 4 - $.online.cha / 10) <= sys_1.dice(deep / 3 + 1)) {
                n = $.online.weapon.wc + sys_1.dice(3) - 2;
                n = n < 1 ? 1 : n >= items_1.Weapon.merchant.length ? items_1.Weapon.merchant.length - 1 : n;
                m.user.weapon = items_1.Weapon.merchant[n];
            }
        }
        if (dm.armor)
            m.user.armor = dm.armor;
        else {
            m.user.armor = sys_1.int((level + deep) / 100 * sys_1.int($.sysop.armor));
            m.user.armor = sys_1.int((m.user.armor + $.online.armor.ac) / 2);
            if ($.player.level <= Z
                && sys_1.dice(11 + deep / 3 + $.player.level / 3 - $.online.cha / 11) <= sys_1.dice(deep / 3 + 1)) {
                n = $.online.armor.ac + sys_1.dice(3) - 2;
                n = n < 1 ? 1 : n >= items_1.Armor.merchant.length ? items_1.Armor.merchant.length - 1 : n;
                m.user.armor = items_1.Armor.merchant[n];
            }
        }
        m.user.hp = sys_1.int(m.user.hp / (4 + (m.user.level / 100)) + (deep * Z / 4));
        n = 5 - sys_1.dice(deep / 3);
        m.user.sp = sys_1.int(m.user.sp / n);
        m.user.poisons = [];
        if (m.user.poison) {
            if (dm.poisons)
                for (let vials in dm.poisons)
                    items_1.Poison.add(m.user.poisons, dm.poisons[vials]);
            for (n = 0; n < Object.keys(items_1.Poison.vials).length - (9 - deep); n++) {
                if (sys_1.dice(sys_1.int($.player.cha / (deep + 1)) + (n << 2)) < (sys_1.int($.player.coward) + 2)) {
                    let vial = items_1.Poison.pick(n);
                    if (!items_1.Poison.have(m.user.poisons, vial))
                        items_1.Poison.add(m.user.poisons, n);
                }
            }
        }
        m.user.rings = dm.rings || [];
        m.user.spells = [];
        if (m.user.magic) {
            if (dm.spells)
                for (let magic in dm.spells)
                    items_1.Magic.add(m.user.spells, dm.spells[magic]);
            for (n = 0; n < Object.keys(items_1.Magic.spells).length - (9 - deep); n++) {
                if (sys_1.dice(sys_1.int($.player.cha / (deep + 1)) + (n << 2)) < (+$.player.coward + 2)) {
                    let spell = items_1.Magic.pick(n);
                    if (!items_1.Magic.have(m.user.spells, spell))
                        items_1.Magic.add(m.user.spells, n);
                }
            }
        }
    }
    function putMonster(r = -1, c = -1) {
        let respawn;
        let room;
        if (r < 0 && c < 0) {
            respawn = true;
            do {
                r = sys_1.dice(npc_1.dungeon.level.rooms.length) - 1;
                c = sys_1.dice(npc_1.dungeon.level.width) - 1;
                room = npc_1.dungeon.level.rooms[r][c];
            } while (room.monster.length >= npc_1.dungeon.level.mob);
        }
        else {
            respawn = false;
            room = npc_1.dungeon.level.rooms[r][c];
            if (room.monster.length >= npc_1.dungeon.level.mob)
                return false;
        }
        let i;
        let j;
        for (i = 0, j = 0; i < room.monster.length; i++)
            j += room.monster[i].monster.size || 1;
        if (j >= room.size)
            return false;
        let dm = { name: '', pc: '' };
        let m = { monster: { name: '', pc: '' }, user: { id: '', sex: 'I' } };
        let level = 0;
        let sum = 0;
        genMonster(dm, m, room.size - j);
        if (!dm.level) {
            if (respawn)
                return false;
            level = sys_1.dice(Z / npc_1.dungeon.level.mob) + (Z <= 60 ? sys_1.int(Z / 6) : 30) + sys_1.dice(deep) - 1;
            genMonster(dm, m, 0, level);
            if (room.monster.length)
                sum = room.monster[0].user.level;
        }
        do {
            i = room.monster.push(m) - 1;
            m = room.monster[i];
            level = m.user.level;
            sum += level;
            pc_1.PC.activate(m);
            m.user.immortal = deep;
            m.adept = sys_1.dice(Z / 30 + deep / 4 + 1) - 1;
            pc_1.PC.adjust('str', deep - 2, 0, deep >> 2, m);
            pc_1.PC.adjust('int', deep - 2, 0, deep >> 2, m);
            pc_1.PC.adjust('dex', deep - 2, 0, deep >> 2, m);
            pc_1.PC.adjust('cha', deep - 2, 0, deep >> 2, m);
            let gold = new items_1.Coin(sys_1.int(sys_1.money(level) / (11 - deep)));
            gold.value += lib_1.tradein(new items_1.Coin(m.weapon.value).value, sys_1.dice($.online.cha / 5) + sys_1.dice(deep) - sys_1.int($.player.coward));
            gold.value += lib_1.tradein(new items_1.Coin(m.armor.value).value, sys_1.dice($.online.cha / 5) + sys_1.dice(deep) - sys_1.int($.player.coward));
            gold.value *= sys_1.dice(deep * 2 / 3);
            gold.value++;
            m.user.coin = gold.pick(1);
            if (+m.user.weapon) {
                if (dm.hit)
                    m.weapon.hit = dm.hit;
                if (dm.smash)
                    m.weapon.smash = dm.smash;
            }
            level += sys_1.dice(room.monster.length + 2) - (room.monster.length + 1);
            dm = { name: '', pc: '' };
            m = { monster: { name: '', pc: '' }, user: { id: '', sex: 'I' } };
            genMonster(dm, m, 0, level);
        } while (room.monster.length < sys_1.int(3 + npc_1.dungeon.level.mob + deep / 3) && sum < (Z - 3 - room.monster.length));
        return true;
    }
    function merchant() {
        scroll(1, false);
        let dwarf = { user: { id: '' } };
        Object.assign(dwarf.user, $.dwarf.user);
        pc_1.PC.activate(dwarf);
        lib_1.vt.outln(lib_1.vt.yellow, pc_1.PC.who(dwarf).He, 'scowls in disgust, ', lib_1.vt.bright, `"Never trust${sys_1.an($.player.pc)}!"`);
        pc_1.PC.wearing(dwarf);
        lib_1.vt.sound('ddd', 20);
        Battle.engage('Merchant', party, dwarf, doSpoils);
    }
    function witch() {
        let witch = { user: { id: '' } };
        Object.assign(witch.user, $.witch.user);
        pc_1.PC.activate(witch);
        lib_1.vt.outln();
        lib_1.vt.outln(lib_1.vt.green, pc_1.PC.who(witch).His, 'disdained look sends a chill down your back.', -1200);
        lib_1.vt.outln(lib_1.vt.green, lib_1.vt.bright, `"Puny ${$.player.pc} -- you earned my wrath!"`);
        lib_1.vt.sound('god', 28);
        lib_1.vt.music('boss' + sys_1.dice(3));
        Battle.engage('Witch', party, witch, doSpoils);
    }
    function recovery(factor = npc_1.dungeon.level.cleric.user.level) {
        if (!npc_1.dungeon.level.cleric.user.status) {
            npc_1.dungeon.level.cleric.sp += sys_1.int(items_1.Magic.power(npc_1.dungeon.level.cleric, 7) * npc_1.dungeon.level.cleric.user.level / factor);
            if (npc_1.dungeon.level.cleric.sp > npc_1.dungeon.level.cleric.user.sp)
                npc_1.dungeon.level.cleric.sp = npc_1.dungeon.level.cleric.user.sp;
        }
    }
    function teleport() {
        let min = lib_1.vt.checkTime();
        lib_1.vt.action('teleport');
        lib_1.vt.outln(lib_1.vt.yellow, lib_1.vt.bright, 'What do you wish to do?');
        lib_1.vt.out(lib_1.bracket('U'), 'Teleport up 1 level');
        if (Z < 99)
            lib_1.vt.out(lib_1.bracket('D'), 'Teleport down 1 level');
        lib_1.vt.out(lib_1.bracket('O'), `Teleport out of this ${deep ? 'dank' : ''} dungeon`);
        lib_1.vt.out(lib_1.bracket('R'), 'Random teleport');
        lib_1.vt.out(lib_1.vt.cyan, '\n\nTime Left: ', lib_1.vt.bright, lib_1.vt.white, min.toString(), lib_1.vt.faint, lib_1.vt.cyan, ' min.', lib_1.vt.reset);
        if ($.player.coin.value)
            lib_1.vt.out(lib_1.vt.cyan, '    Coin: ', lib_1.carry());
        if ($.player.level / 9 - deep > items_1.Security.name[$.player.security].protection + 1)
            lib_1.vt.out(lib_1.vt.faint, '\nThe feeling of in', lib_1.vt.normal, lib_1.vt.uline, 'security', lib_1.vt.nouline, lib_1.vt.faint, ' overwhelms you.', lib_1.vt.reset);
        lib_1.vt.form = {
            'wizard': {
                cb: () => {
                    if (sys_1.dice(10 * deep + Z + 5 * $.player.magic + $.online.int + $.online.cha) == 1) {
                        lib_1.vt.outln(' ... "', lib_1.vt.bright, lib_1.vt.cyan, 'Huh?', lib_1.vt.reset, '"');
                        lib_1.vt.animated('headShake');
                        lib_1.vt.sound('miss', 6);
                        lib_1.vt.animated('rubberBand');
                        lib_1.vt.sound('lose', 12);
                        lib_1.vt.music('crack');
                        lib_1.vt.sleep(1250);
                        lib_1.vt.animated('bounceOutUp');
                        lib_1.vt.sleep(1250);
                        let pops = 'UDOR'[sys_1.dice(4) - 1];
                        if (lib_1.vt.entry.toUpperCase() == pops) {
                            lib_1.vt.sound('oops', 6);
                            deep = sys_1.dice(10) - 1;
                            Z += sys_1.dice(20) - 10;
                            Z = Z < 0 ? 0 : Z > 99 ? 99 : Z;
                            lib_1.vt.sound('portal', 12);
                        }
                        else {
                            lib_1.vt.entry = pops;
                            lib_1.vt.sound('teleport');
                        }
                    }
                    else {
                        lib_1.vt.outln();
                        lib_1.vt.sound('teleport');
                    }
                    switch (lib_1.vt.entry.toUpperCase()) {
                        case 'D':
                            if (Z < 99) {
                                Z++;
                                pc_1.PC.portrait($.online, 'backOutDown');
                                break;
                            }
                        case 'R':
                            pc_1.PC.portrait($.online, 'flipOutY');
                            npc_1.dungeon.level.alert = true;
                            npc_1.dungeon.level.events++;
                            npc_1.dungeon.level.exit = false;
                            break;
                        case 'U':
                            if (Z > 0) {
                                npc_1.dungeon.level.events++;
                                npc_1.dungeon.level.exit = false;
                                Z--;
                                pc_1.PC.portrait($.online, 'backOutUp');
                                break;
                            }
                        case 'O':
                            pc_1.PC.portrait($.online, 'flipOutX');
                            if (deep > 0)
                                deep--;
                            else {
                                scroll(1, false, true);
                                fini();
                                return;
                            }
                            break;
                        default:
                            break;
                    }
                    lib_1.vt.sleep(1400);
                    generateLevel();
                    menu();
                }, cancel: 'O', enter: 'R', eol: false, match: /U|D|O|R/i, timeout: 20
            }
        };
        lib_1.vt.form['wizard'].prompt = `Teleport #${sys_1.romanize(deep + 1)}.${Z + 1}: `;
        lib_1.vt.drain();
        lib_1.vt.focus = 'wizard';
    }
    function quaff(v, it = true) {
        if (!(v % 2) && !npc_1.dungeon.potions[v].identified)
            lib_1.news(`\t${it ? 'quaffed' : 'tossed'}${sys_1.an(npc_1.dungeon.potion[v])}`);
        if (it) {
            if (!npc_1.dungeon.potions[v].identified) {
                npc_1.dungeon.potions[v].identified = $.online.int > (85 - 4 * $.player.poison);
                lib_1.vt.out(v % 2 ? lib_1.vt.red : lib_1.vt.green, 'It was', lib_1.vt.bright);
                if ($.player.emulation == 'XT')
                    lib_1.vt.out(' ', v % 2 ? '🌡️ ' : '🧪');
                lib_1.vt.outln(sys_1.an(npc_1.dungeon.potion[v]), lib_1.vt.normal, '.');
            }
            lib_1.vt.sound('quaff', 5);
            switch (v) {
                case 0:
                    $.online.hp += pc_1.PC.hp() + sys_1.dice($.player.hp - $.online.hp);
                    lib_1.vt.sound('yum', 3);
                    break;
                case 1:
                    pc_1.PC.adjust('str', -sys_1.dice(10), -pc_1.PC.card($.player.pc).toStr);
                    break;
                case 2:
                    pc_1.PC.adjust('cha', 100 + sys_1.dice(10), pc_1.PC.card($.player.pc).toCha, +($.player.cha == $.player.maxcha));
                    break;
                case 3:
                    pc_1.PC.adjust('int', -sys_1.dice(10), -pc_1.PC.card($.player.pc).toInt);
                    break;
                case 4:
                    pc_1.PC.adjust('dex', 100 + sys_1.dice(10), pc_1.PC.card($.player.pc).toDex, +($.player.dex == $.player.maxdex));
                    break;
                case 5:
                    pc_1.PC.adjust('dex', -sys_1.dice(10), -pc_1.PC.card($.player.pc).toDex);
                    break;
                case 6:
                    pc_1.PC.adjust('int', 100 + sys_1.dice(10), pc_1.PC.card($.player.pc).toInt, +($.player.int == $.player.maxint));
                    break;
                case 7:
                    pc_1.PC.adjust('cha', -sys_1.dice(10), -pc_1.PC.card($.player.pc).toCha);
                    break;
                case 8:
                    pc_1.PC.adjust('str', 100 + sys_1.dice(10), pc_1.PC.card($.player.pc).toStr, +($.player.str == $.player.maxstr));
                    break;
                case 9:
                    $.online.hp -= sys_1.dice($.player.hp / 2);
                    lib_1.vt.sound('hurt', 3);
                    if ($.online.hp < 1)
                        lib_1.death(`quaffed${sys_1.an(npc_1.dungeon.potion[v])}`);
                    break;
                case 10:
                    lib_1.vt.sound('shimmer');
                    $.online.sp += pc_1.PC.sp() + sys_1.dice($.player.sp - $.online.sp);
                    break;
                case 11:
                    if (($.online.sp -= sys_1.dice($.online.sp / 2)) < 1)
                        $.online.sp = 0;
                    break;
                case 12:
                    lib_1.vt.music('elixir');
                    if ($.online.hp < $.player.hp)
                        $.online.hp = $.player.hp;
                    if ($.online.sp < $.player.sp)
                        $.online.sp = $.player.sp;
                    if ($.online.str < $.player.str)
                        $.online.str = $.player.str;
                    if ($.online.int < $.player.int)
                        $.online.int = $.player.int;
                    if ($.online.dex < $.player.dex)
                        $.online.dex = $.player.dex;
                    if ($.online.cha < $.player.cha)
                        $.online.cha = $.player.cha;
                    pc_1.PC.adjust('str', 100 + sys_1.dice(10), pc_1.PC.card($.player.pc).toStr, +($.player.str == $.player.maxstr));
                    pc_1.PC.adjust('int', 100 + sys_1.dice(10), pc_1.PC.card($.player.pc).toInt, +($.player.int == $.player.maxint));
                    pc_1.PC.adjust('dex', 100 + sys_1.dice(10), pc_1.PC.card($.player.pc).toDex, +($.player.dex == $.player.maxdex));
                    pc_1.PC.adjust('cha', 100 + sys_1.dice(10), pc_1.PC.card($.player.pc).toCha, +($.player.cha == $.player.maxcha));
                    break;
                case 13:
                    pc_1.PC.adjust('str', $.online.str > 40 ? -sys_1.dice(6) - 4 : -3, $.player.str > 60 ? -sys_1.dice(3) - 2 : -2, $.player.maxstr > 80 ? -2 : -1);
                    pc_1.PC.adjust('int', $.online.int > 40 ? -sys_1.dice(6) - 4 : -3, $.player.int > 60 ? -sys_1.dice(3) - 2 : -2, $.player.maxint > 80 ? -2 : -1);
                    pc_1.PC.adjust('dex', $.online.dex > 40 ? -sys_1.dice(6) - 4 : -3, $.player.dex > 60 ? -sys_1.dice(3) - 2 : -2, $.player.maxdex > 80 ? -2 : -1);
                    pc_1.PC.adjust('cha', $.online.cha > 40 ? -sys_1.dice(6) - 4 : -3, $.player.cha > 60 ? -sys_1.dice(3) - 2 : -2, $.player.maxcha > 80 ? -2 : -1);
                    $.online.sp -= pc_1.PC.sp();
                    if ($.online.sp < 0)
                        $.online.sp = 0;
                    $.online.hp -= pc_1.PC.hp();
                    lib_1.vt.music('crack', 6);
                    if ($.online.hp < 1)
                        lib_1.death(`quaffed${sys_1.an(npc_1.dungeon.potion[v])}`);
                    break;
                case 14:
                    lib_1.vt.sound('hone', 11);
                    pc_1.PC.adjust('str', 100 + sys_1.dice(100 - $.online.str), sys_1.dice(3) + 2, $.player.maxstr < 95 ? 2 : 1);
                    pc_1.PC.adjust('int', 100 + sys_1.dice(100 - $.online.int), sys_1.dice(3) + 2, $.player.maxint < 95 ? 2 : 1);
                    pc_1.PC.adjust('dex', 100 + sys_1.dice(100 - $.online.dex), sys_1.dice(3) + 2, $.player.maxdex < 95 ? 2 : 1);
                    pc_1.PC.adjust('cha', 100 + sys_1.dice(100 - $.online.cha), sys_1.dice(3) + 2, $.player.maxcha < 95 ? 2 : 1);
                    $.online.hp += pc_1.PC.hp();
                    $.online.sp += pc_1.PC.sp();
                    $.online.altered = true;
                    lib_1.vt.sound('heal', 3);
                    break;
                case 15:
                    lib_1.death(`quaffed${sys_1.an(npc_1.dungeon.potion[v])}`, true);
                    break;
            }
        }
        if (!$.reason)
            pause = true;
    }
    function occupying(room, a = '', reveal = false, identify = false) {
        let icon = '', o = a;
        if (reveal) {
            let m = room.monster.length > 4 ? 4 : room.monster.length;
            if (m) {
                if ($.player.emulation !== 'XT' && npc_1.dungeon.Monster[lib_1.vt.tty])
                    icon += npc_1.dungeon.Monster[lib_1.vt.tty][m];
                else {
                    if (identify) {
                        icon += npc_1.dungeon.Mask[m];
                        for (let i = 0; i < m; i++) {
                            let dm = pc_1.PC.card(room.monster[i].user.pc);
                            icon = icon.replace('ѩ', lib_1.vt.attr(dm.color || lib_1.vt.white, dm.unicode));
                        }
                    }
                    else
                        icon += npc_1.dungeon.Mask[m];
                }
                o += ` ${icon} `;
            }
            else if (room.map) {
                let tile = npc_1.dungeon.Dot;
                if (!room.type || room.type == 'cavern') {
                    o += lib_1.vt.attr(!room.type ? lib_1.vt.yellow : lib_1.vt.red);
                    if ($.player.emulation == 'XT')
                        tile = '\u2022';
                }
                o += `  ${tile}  `;
            }
            else
                o = '     ';
            switch (room.occupant) {
                case 'trapdoor':
                    if (identify && !icon)
                        o = lib_1.vt.attr(`  ${$.player.emulation == 'XT' ? lib_1.vt.attr(lib_1.vt.lblack, '⛋') : lib_1.vt.attr(lib_1.vt.reset, lib_1.vt.faint, $.player.emulation == 'PC' ? '\xCF' : '?')}  `);
                    break;
                case 'portal':
                    o = a + lib_1.vt.attr(lib_1.vt.blue);
                    if (!icon)
                        icon = lib_1.vt.attr('v', lib_1.vt.bright, lib_1.vt.blink, 'V', lib_1.vt.noblink, lib_1.vt.normal, 'v');
                    else
                        icon += lib_1.vt.attr(lib_1.vt.blue);
                    o += lib_1.vt.attr(lib_1.vt.faint, 'v', lib_1.vt.normal, icon, lib_1.vt.faint, 'v');
                    break;
                case 'well':
                    if (identify && !icon) {
                        o = lib_1.vt.attr(`  ${$.player.emulation == 'XT' ? lib_1.vt.attr(lib_1.vt.lblue, '⛃', lib_1.vt.reset) : lib_1.vt.attr(lib_1.vt.blue, lib_1.vt.bright, $.player.emulation == 'PC' ? '\xF5' : '*')}  `);
                        well = false;
                    }
                    break;
                case 'wheel':
                    if (identify && !icon)
                        o = lib_1.vt.attr(`  ${$.player.emulation == 'XT' ? lib_1.vt.attr(lib_1.vt.lmagenta, '࿋', lib_1.vt.reset) : lib_1.vt.attr(lib_1.vt.magenta, lib_1.vt.bright, $.player.emulation == 'PC' ? '\x9D' : '@')}  `);
                    break;
                case 'thief':
                    if ((npc_1.dungeon.level.map == `Marauder's map` || $.player.steal == 4) && !icon)
                        o = lib_1.vt.attr(lib_1.vt.off, lib_1.vt.faint, `  ${$.player.emulation == 'XT' ? '∞' : $.player.emulation == 'PC' ? '\xA8' : '&'}  `);
                    break;
                case 'cleric':
                    o = a + lib_1.vt.attr(lib_1.vt.yellow);
                    if (!icon)
                        icon = npc_1.dungeon.level.cleric.user.status
                            ? lib_1.vt.attr(lib_1.vt.off, lib_1.vt.faint, lib_1.vt.uline, $.player.emulation == 'XT' ? '🕱♱🕱' : `_${npc_1.dungeon.Cleric[$.player.emulation]}_`, lib_1.vt.nouline, lib_1.vt.normal, lib_1.vt.yellow)
                            : lib_1.vt.attr(lib_1.vt.normal, lib_1.vt.uline, '_', lib_1.vt.faint, npc_1.dungeon.Cleric[$.player.emulation], lib_1.vt.normal, '_', lib_1.vt.nouline);
                    else
                        icon += lib_1.vt.attr(lib_1.vt.yellow);
                    o += lib_1.vt.attr(lib_1.vt.faint, ':', lib_1.vt.normal, icon, lib_1.vt.faint, ':');
                    break;
                case 'wizard':
                    o = a + lib_1.vt.attr(lib_1.vt.magenta);
                    if (!icon)
                        icon = lib_1.vt.attr(lib_1.vt.normal, lib_1.vt.uline, '_', lib_1.vt.bright, npc_1.dungeon.Teleport[$.player.emulation], lib_1.vt.normal, '_', lib_1.vt.nouline);
                    else
                        icon += lib_1.vt.attr(lib_1.vt.magenta);
                    o += lib_1.vt.attr(lib_1.vt.faint, '<', lib_1.vt.normal, icon, lib_1.vt.faint, '>');
                    break;
                case 'dwarf':
                    if (identify && !icon)
                        o = a + lib_1.vt.attr(lib_1.vt.yellow, `  ${$.player.emulation == 'XT' ? '⚘' : '$'}  `);
                    break;
                case 'witch':
                    if (identify && !icon) {
                        o = a + lib_1.vt.attr(lib_1.vt.green, lib_1.vt.faint, `  ${$.player.emulation == 'XT' ? '∢' : '%'}  `, lib_1.vt.normal);
                        if ($.sorceress)
                            $.sorceress--;
                    }
                    break;
            }
        }
        else
            o = '     ';
        lib_1.vt.out(o);
        if (room.giftItem && (npc_1.dungeon.level.map == `Marauder's map` || items_1.Ring.power([], $.player.rings, 'identify').power))
            lib_1.vt.out('\x08', lib_1.vt.reset, lib_1.vt.faint, room.giftIcon);
    }
    function scroll(top = 1, redraw = true, escape = false) {
        lib_1.vt.save();
        lib_1.vt.out(`\x1B[${top};${$.player.rows}r`);
        lib_1.vt.restore();
        if (escape) {
            lib_1.news(`\tescaped dungeon ${sys_1.romanize(hideep + 1)}.${hiZ} ${levels < $.player.level && `ascending +${$.player.level - levels}` || 'expeditiously'}`);
            lib_1.vt.music(['escape', 'thief2', 'thief'][$.dungeon]);
            lib_1.vt.outln(lib_1.vt.lblue, `\n"Next time you won't escape so easily... moo-hahahahaha!!"`, -600);
            lib_1.vt.profile({ png: 'castle', effect: 'pulse' });
        }
        else if (redraw) {
            drawLevel();
            drawHero();
        }
        refresh = (top == 1);
    }
})(Dungeon || (Dungeon = {}));
module.exports = Dungeon;
