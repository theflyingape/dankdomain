"use strict";
const $ = require("../runtime");
const Battle = require("../battle");
const db = require("../db");
const lib_1 = require("../lib");
const pc_1 = require("../pc");
const player_1 = require("../player");
const sys_1 = require("../sys");
var Naval;
(function (Naval) {
    let mon;
    let monsters = require('../etc/naval.json');
    let sm;
    let naval = {
        'S': { description: 'Shipyard' },
        'B': { description: 'Battle other users' },
        'H': { description: 'Hunt sea monsters' },
        'G': { description: 'Go fishing' },
        'Y': { description: `Your ship's status` },
        'L': { description: 'List user ships' }
    };
    function menu(suppress = true) {
        $.from = 'Naval';
        if (player_1.checkXP($.online, menu))
            return;
        if ($.online.altered)
            pc_1.PC.save($.online);
        if ($.reason)
            lib_1.vt.hangup();
        lib_1.vt.action('naval');
        lib_1.vt.form = {
            'menu': { cb: choice, cancel: 'q', enter: '?', eol: false }
        };
        lib_1.vt.form['menu'].prompt = lib_1.display('naval', lib_1.vt.Cyan, lib_1.vt.cyan, suppress, naval);
        player_1.input('menu');
    }
    Naval.menu = menu;
    function choice() {
        var _a;
        let suppress = false;
        let choice = lib_1.vt.entry.toUpperCase();
        if ((_a = naval[choice]) === null || _a === void 0 ? void 0 : _a.description) {
            lib_1.vt.out(' - ', naval[choice].description);
            suppress = $.player.expert;
        }
        lib_1.vt.outln();
        let rs;
        let cap;
        let n;
        switch (choice) {
            case 'B':
                suppress = true;
                if (!$.access.roleplay)
                    break;
                if (!$.player.hull) {
                    lib_1.vt.outln(`\nYou don't have a ship!`);
                    break;
                }
                if (!$.naval) {
                    lib_1.vt.outln('\nYou have run out of battles.');
                    break;
                }
                Battle.user('Battle', (opponent) => {
                    lib_1.vt.outln();
                    if (opponent.user.id == '' || opponent.user.id == $.player.id) {
                        menu(true);
                        return;
                    }
                    if (!opponent.user.hull) {
                        lib_1.vt.outln(`${pc_1.PC.who(opponent).He}doesn't have a ship.`);
                        menu(true);
                        return;
                    }
                    if (!db.lock(opponent.user.id)) {
                        lib_1.vt.beep();
                        lib_1.vt.outln(`${pc_1.PC.who(opponent).He}is currently engaged elsewhere and not available.`);
                        menu(true);
                        return;
                    }
                    lib_1.vt.outln(`You sail out until you spot ${opponent.user.handle}'s ship on the horizon.`);
                    lib_1.vt.sleep(500);
                    lib_1.vt.outln(`It has ${opponent.user.hull} hull points.`);
                    lib_1.vt.sleep(500);
                    lib_1.vt.action('ny');
                    lib_1.vt.form = {
                        'battle': {
                            cb: () => {
                                lib_1.vt.outln();
                                if (/Y/i.test(lib_1.vt.entry)) {
                                    if (pc_1.PC.activate(opponent, true)) {
                                        $.naval--;
                                        BattleUser(opponent);
                                    }
                                    else
                                        menu(!$.player.expert);
                                }
                                else
                                    menu(!$.player.expert);
                            }, prompt: `Will you battle ${pc_1.PC.who(opponent).him}(Y/N)? `, cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                        }
                    };
                    lib_1.vt.focus = 'battle';
                });
                return;
            case 'G':
                suppress = true;
                if (!$.access.roleplay)
                    break;
                lib_1.vt.outln();
                if (!$.player.hull) {
                    lib_1.vt.outln(`You don't have a ship!`);
                    break;
                }
                lib_1.vt.outln('It is a fine day for sailing.  You cast your reel into the ocean and feel');
                lib_1.vt.out('a gentle tug... ');
                lib_1.vt.sleep(600);
                lib_1.vt.out('you caught a');
                lib_1.vt.sleep(600);
                let cast = 100 * $.online.cha / $.player.maxcha;
                cast = (cast < 15) ? 15 : (cast > 100) ? 100 : cast >> 0;
                let hook = sys_1.dice(cast);
                if (hook < 15) {
                    let floater = pc_1.PC.encounter(`AND id NOT GLOB '_*'`);
                    if (floater.user.id && floater.user.status) {
                        let leftby = { id: floater.user.status };
                        if (pc_1.PC.load(leftby)) {
                            pc_1.PC.portrait(floater, 'fadeInUpBig');
                            lib_1.vt.out(' floating carcass!');
                            lib_1.vt.sleep(500);
                            pc_1.PC.load(floater);
                            lib_1.vt.outln(`\nIt is ${floater.user.handle}'s body in the ocean left there by ${leftby.handle}, and`);
                            lib_1.vt.outln(`you're able to bring the player back to an Alive! state.`);
                            db.run(`UPDATE Players set status='' WHERE id='${floater.user.id}'`);
                            lib_1.news(`\trecovered ${floater.user.handle}'s body from the ocean`);
                            menu();
                            return;
                        }
                    }
                    if (sys_1.dice($.player.level / 3 + 2) == 1) {
                        pc_1.PC.load($.seahag);
                        lib_1.vt.outln(`n ${$.seahag.user.handle}!`);
                        lib_1.cat(`naval/${$.seahag.user.handle}`.toLowerCase(), 100);
                        lib_1.vt.outln(-600, lib_1.vt.green, lib_1.vt.bright, 'She cackles as you are sent spinning elsewhere ... ');
                        lib_1.vt.sound('crone', 24);
                        require('./dungeon').DeepDank($.player.level + 3 * sys_1.dice($.player.level), () => {
                            $.from = 'Naval';
                            lib_1.vt.profile({
                                jpg: 'npc/seahag', effect: 'fadeInUp',
                                handle: $.seahag.user.handle, level: $.seahag.user.level, pc: $.seahag.user.pc
                            });
                            lib_1.vt.sound('god', 12);
                            lib_1.vt.outln(lib_1.vt.magenta, '\n"', lib_1.vt.bright, lib_1.vt.yellow, 'You have escaped my magic, mortal?  Now try me!', lib_1.vt.normal, lib_1.vt.magenta, '"', -1200);
                            lib_1.cat(`naval/${$.seahag.user.handle}`.toLowerCase(), 100);
                            pc_1.PC.wearing($.seahag);
                            $.seahag.user.cursed = $.player.id;
                            Battle.engage('Naval', $.online, $.seahag, menu);
                            return;
                        });
                        return;
                    }
                    if (sys_1.dice($.player.level / 3 + 2) == 1) {
                        pc_1.PC.load($.neptune);
                        lib_1.vt.outln(` ${$.neptune.user.pc}: ${$.neptune.user.handle}!`);
                        lib_1.cat(`naval/${$.neptune.user.handle}`.toLowerCase(), 100);
                        lib_1.vt.sleep(600);
                        if ($.player.level > $.neptune.user.level) {
                            let keep = $.neptune.user.spells;
                            pc_1.PC.reroll($.neptune.user, $.neptune.user.pc, $.player.level - 1);
                            pc_1.PC.activate($.neptune);
                            $.neptune.user.spells = keep;
                        }
                        lib_1.vt.outln(lib_1.vt.cyan, lib_1.vt.bright, 'He looks at you angrily as he removes a hook from his shorts!');
                        lib_1.vt.profile({
                            jpg: 'npc/neptune', effect: 'fadeInUp',
                            handle: $.neptune.user.handle, level: $.neptune.user.level, pc: $.neptune.user.pc
                        });
                        lib_1.vt.sound('neptune', 32);
                        pc_1.PC.wearing($.neptune);
                        Battle.engage('Naval', $.online, $.neptune, menu);
                        return;
                    }
                    lib_1.vt.outln(' fish and you eat it.');
                    lib_1.vt.sound('quaff', 6);
                    lib_1.vt.outln('Ugh!  You feel sick and die!');
                    $.reason = `ate yesterday's catch of the day`;
                    break;
                }
                if (hook < 50) {
                    lib_1.vt.outln(' fish and you eat it.');
                    lib_1.vt.sound('quaff', 6);
                    lib_1.vt.sound('yum');
                    lib_1.vt.outln('Yum!  You feel stronger and healthier.\n');
                    pc_1.PC.adjust('str', 101);
                    lib_1.vt.out(`Stamina = ${$.online.str}     `);
                    $.online.hp += sys_1.int(pc_1.PC.hp() / 2) + sys_1.dice(pc_1.PC.hp() / 2);
                    lib_1.vt.out(`Hit points = ${$.online.hp}     `);
                    if ($.player.sp) {
                        $.online.sp += sys_1.int(pc_1.PC.sp() / 2) + sys_1.dice(pc_1.PC.sp() / 2);
                        lib_1.vt.out(`Spell points = ${$.online.sp}`);
                    }
                    lib_1.vt.outln();
                    break;
                }
                if (hook < 75) {
                    lib_1.vt.outln('n oyster and you eat it.');
                    lib_1.vt.sleep(600);
                    cap = sys_1.money($.player.level);
                    n = Math.round(Math.pow(2., $.player.hull / 150.) * 7937);
                    n = sys_1.int(n / $.player.hull / 10 * sys_1.dice($.online.hull));
                    n = sys_1.int(n * ($.player.cannon + 1) / ($.player.hull / 50));
                    n = lib_1.tradein(n, $.online.cha);
                    if (n > cap)
                        n = cap;
                    lib_1.vt.sound('oof');
                    lib_1.vt.outln(`Ouch!  You bit into a pearl and sell it for ${new lib_1.Coin(n).carry()}.`);
                    $.player.coin.value += n;
                    break;
                }
                if (hook < 90) {
                    lib_1.vt.outln('n oyster and you eat it.');
                    lib_1.vt.sleep(600);
                    cap = 3 * sys_1.money($.player.level);
                    n = Math.round(Math.pow(2., $.player.hull / 150.) * 7937);
                    n = sys_1.int(n / $.player.hull * sys_1.dice($.online.hull));
                    n = sys_1.int(n * ($.player.cannon + 1) / ($.player.hull / 50));
                    n = lib_1.tradein(n, $.online.cha);
                    if (n > cap)
                        n = cap;
                    lib_1.vt.sound('oof');
                    lib_1.vt.outln(`Ouch!  You bit into a diamond and sell it for ${new lib_1.Coin(n).carry()}.`);
                    $.player.coin.value += n;
                    break;
                }
                if (hook < 95) {
                    lib_1.vt.profile({ jpg: 'naval/turtle', effect: 'fadeInUp' });
                    lib_1.vt.outln(' turtle and you let it go.');
                    lib_1.vt.sleep(600);
                    $.player.toAC++;
                    $.online.toAC += sys_1.dice($.online.armor.ac / 5 + 1);
                    lib_1.vt.outln('The turtle turns and smiles and enhances your ', lib_1.armor());
                    lib_1.vt.sound('shield');
                    break;
                }
                if (hook < 100) {
                    lib_1.vt.outln(' tortoise and you let it go.', -600);
                    $.player.toWC++;
                    $.online.toWC += sys_1.dice($.online.weapon.wc / 10 + 1);
                    lib_1.vt.outln('The tortoise shows it gratitude by enchanting your ', lib_1.weapon());
                    lib_1.vt.sound('hone');
                    break;
                }
                lib_1.vt.outln(' mermaid!', -600);
                lib_1.vt.profile({ jpg: 'naval/mermaid', effect: 'bounceInUp' });
                lib_1.cat('naval/mermaid', 100);
                if ($.player.today) {
                    lib_1.vt.outln('She grants you an extra call for today!');
                    $.player.today--;
                    lib_1.news('\tcaught an extra call');
                }
                else {
                    lib_1.vt.outln(`She says, "Here's a key hint:"`);
                    pc_1.PC.keyhint($.online);
                }
                lib_1.vt.form = {
                    'pause': { cb: menu, pause: true }
                };
                lib_1.vt.focus = 'pause';
                return;
            case 'H':
                suppress = true;
                if (!$.access.roleplay)
                    break;
                if (!$.player.hull) {
                    lib_1.vt.outln(`\nYou don't have a ship!`);
                    break;
                }
                if (!$.naval) {
                    lib_1.vt.outln('\nYou have run out of battles.');
                    break;
                }
                for (let i in monsters)
                    lib_1.vt.out(lib_1.bracket(+i + 1), lib_1.vt.cyan, monsters[i].name);
                lib_1.vt.outln();
                lib_1.vt.action('list');
                lib_1.vt.form = {
                    pick: {
                        cb: () => {
                            lib_1.vt.outln();
                            if (lib_1.vt.entry.length) {
                                let mon = sys_1.int(lib_1.vt.entry);
                                if (mon < 1 || mon > monsters.length) {
                                    lib_1.vt.refocus();
                                    return;
                                }
                                lib_1.vt.entry = mon.toString();
                                MonsterHunt();
                            }
                            else
                                menu();
                        },
                        prompt: 'Hunt which monster (' + lib_1.vt.attr(lib_1.vt.white, '1-' + monsters.length, lib_1.vt.cyan, ')? '), min: 0, max: 1
                    }
                };
                lib_1.vt.focus = 'pick';
                return;
            case 'L':
                suppress = true;
                lib_1.vt.outln();
                lib_1.vt.outln(lib_1.vt.Blue, lib_1.vt.bright, ' ID             Username            Hull     Cannons     Ram');
                lib_1.vt.outln(lib_1.vt.Blue, lib_1.vt.bright, '----     ----------------------     ----     -------     ---');
                rs = db.query(`SELECT id,handle,hull,cannon,ram FROM Players WHERE hull > 0 ORDER BY hull DESC`);
                for (let i in rs) {
                    lib_1.vt.outln(sys_1.sprintf('%-4s     %-22s     %4u     %5u        %s', rs[i].id, rs[i].handle, rs[i].hull, rs[i].cannon, rs[i].ram ? 'Y' : 'N'));
                }
                break;
            case 'S':
                if (!$.access.roleplay)
                    break;
                Shipyard($.player.expert);
                return;
            case 'Q':
                require('./menu').menu($.player.expert);
                return;
            case 'Y':
                suppress = true;
                lib_1.vt.outln();
                if (!$.player.hull) {
                    lib_1.vt.outln(`You don't have a ship!`);
                    break;
                }
                lib_1.vt.outln(`Ship's Status:\n`);
                lib_1.vt.outln(`Hull points: ${$.online.hull} out of ${$.player.hull}`);
                lib_1.vt.outln(`Cannons: ${$.player.cannon}`);
                lib_1.vt.outln(`Ram: ${$.player.ram ? 'Yes' : 'No'}`);
                break;
        }
        menu(suppress);
    }
    function Shipyard(suppress = true) {
        lib_1.vt.action('shipyard');
        let shipyard = {
            'B': { description: 'Buy a new ship' },
            'F': { description: 'Fix battle damage' },
            'C': { description: 'Mount cannons' },
            'R': { description: 'Mount a ram' }
        };
        lib_1.vt.form = {
            'menu': { cb: master, cancel: 'q', enter: '?', eol: false }
        };
        lib_1.vt.form['menu'].prompt = lib_1.display('shipyard', lib_1.vt.Cyan, lib_1.vt.cyan, suppress, shipyard);
        lib_1.vt.focus = 'menu';
        function master() {
            var _a;
            let suppress = false;
            let choice = lib_1.vt.entry.toUpperCase();
            if ((_a = shipyard[choice]) === null || _a === void 0 ? void 0 : _a.description) {
                lib_1.vt.out(' - ', shipyard[choice].description);
                suppress = true;
            }
            lib_1.vt.outln('\n');
            let ship = 50;
            let cost = Math.round(Math.pow(2, ship / 150) * 7937);
            let max;
            let afford;
            switch (choice) {
                case 'B':
                    if ($.player.hull + 50 > 8000) {
                        lib_1.vt.beep();
                        lib_1.vt.outln(`They don't make ships any bigger than the one you have now.`);
                        break;
                    }
                    if (!$.player.hull) {
                        if ($.player.coin.value < cost) {
                            lib_1.vt.outln('You need at least ', new lib_1.Coin(cost).carry(), ' to buy a ship.');
                            break;
                        }
                    }
                    if ($.naval > 2)
                        lib_1.vt.music('sailing');
                    lib_1.vt.outln('List of affordable ships:\n');
                    max = $.player.hull + 50;
                    cost = Math.round(Math.pow(2, max / 150) * 7937);
                    while (max <= 8000 && cost < $.player.coin.value) {
                        lib_1.vt.outln(sys_1.sprintf('Hull size: %-4d     Cost: ', max), new lib_1.Coin(cost).carry());
                        max += 50;
                        cost = Math.round(Math.pow(2, max / 150) * 7937);
                    }
                    lib_1.vt.action('listbest');
                    lib_1.vt.form = {
                        'size': {
                            cb: () => {
                                lib_1.vt.outln('\n');
                                if (lib_1.vt.entry.length) {
                                    if (/=|max/i.test(lib_1.vt.entry)) {
                                        lib_1.vt.beep();
                                        lib_1.vt.entry = (max - 50).toString();
                                    }
                                    ship = +lib_1.vt.entry;
                                    if (isNaN(ship)) {
                                        lib_1.vt.refocus();
                                        return;
                                    }
                                    if (ship % 50) {
                                        lib_1.vt.outln(`We don't make ships with that hull size.  Only in multiples of 50.`);
                                        lib_1.vt.refocus();
                                        return;
                                    }
                                    if (ship <= $.player.hull) {
                                        lib_1.vt.outln(`You already have a ${$.player.hull} hull size ship!`);
                                        lib_1.vt.refocus();
                                        return;
                                    }
                                    if (ship >= max) {
                                        lib_1.vt.outln(`You don't have enough money!`);
                                        lib_1.vt.refocus();
                                        return;
                                    }
                                    if (ship > 8000) {
                                        lib_1.vt.outln(`We don't make ships that big!`);
                                        lib_1.vt.refocus();
                                        return;
                                    }
                                    lib_1.vt.profile({ png: 'payment', effect: 'tada' });
                                    lib_1.vt.sound('click', 5);
                                    cost = Math.round(Math.pow(2, ship / 150) * 7937);
                                    $.player.coin.value -= cost;
                                    $.player.hull = ship;
                                    $.player.ram = false;
                                    $.online.hull = $.player.hull;
                                    db.run(`UPDATE Players set hull=${ship},ram=0 WHERE id='${$.player.id}'`);
                                    lib_1.vt.outln(`You now have a brand new ${$.player.hull} hull point ship, with no ram.`);
                                    lib_1.vt.sound('boat');
                                }
                                Shipyard();
                            },
                            prompt: 'Enter hull size to buy: ', min: 0, max: 4
                        }
                    };
                    lib_1.vt.focus = 'size';
                    return;
                case 'F':
                    if (!$.player.hull) {
                        lib_1.vt.outln(`You don't have a ship!`);
                        break;
                    }
                    max = $.player.hull - $.online.hull;
                    lib_1.vt.outln(`You need ${max} hull points of repair.`);
                    cost = Math.round(Math.pow(2, $.player.hull / 150) * 7937);
                    cost = sys_1.int(cost / $.player.hull / 10);
                    lib_1.vt.outln(`Each hull point costs ${new lib_1.Coin(cost).carry()} to repair.`);
                    if (!max)
                        break;
                    afford = sys_1.int($.player.coin.value / cost);
                    if (afford < max)
                        max = afford;
                    lib_1.vt.action('listall');
                    lib_1.vt.form = {
                        'hp': {
                            cb: () => {
                                lib_1.vt.outln('\n');
                                let buy = sys_1.whole(/=|max/i.test(lib_1.vt.entry) ? max : +lib_1.vt.entry);
                                if (buy > 0 && buy <= max) {
                                    $.player.coin.value -= buy * cost;
                                    if ($.player.coin.value < 0)
                                        $.player.coin.value = 0;
                                    $.online.hull += buy;
                                    lib_1.vt.beep();
                                    lib_1.vt.outln(`Hull points = ${$.online.hull}`);
                                }
                                Shipyard();
                                return;
                            }, max: 4
                        }
                    };
                    lib_1.vt.form['hp'].prompt = lib_1.vt.attr('How many points [', lib_1.vt.white, lib_1.vt.bright, lib_1.vt.uline, 'MAX', lib_1.vt.reset, '=', max.toString(), lib_1.vt.cyan, ']? ');
                    lib_1.vt.focus = 'hp';
                    return;
                case 'C':
                    if (!$.player.hull) {
                        lib_1.vt.outln(`You don't have a ship!`);
                        break;
                    }
                    max = sys_1.int($.player.hull / 50) - $.player.cannon;
                    lib_1.vt.outln(`You can mount up to ${max} more cannons.`);
                    cost = Math.round(Math.pow(2, $.player.hull / 150) * 7937);
                    cost = sys_1.int(cost / 250);
                    lib_1.vt.outln(`Each cannon costs ${new lib_1.Coin(cost).carry()}.`);
                    afford = sys_1.int($.player.coin.value / cost);
                    if (afford < max)
                        max = afford;
                    lib_1.vt.action('listbest');
                    lib_1.vt.form = {
                        'cannon': {
                            cb: () => {
                                lib_1.vt.outln('\n');
                                let buy = sys_1.whole(/=|max/i.test(lib_1.vt.entry) ? max : +lib_1.vt.entry);
                                if (buy > 0 && buy <= max) {
                                    $.player.coin.value -= buy * cost;
                                    if ($.player.coin.value < 0)
                                        $.player.coin.value = 0;
                                    $.player.cannon += buy;
                                    lib_1.vt.beep();
                                    lib_1.vt.outln(`Cannons = ${$.player.cannon}`);
                                    db.run(`UPDATE Players set cannon=${$.player.cannon} WHERE id='${$.player.id}'`);
                                }
                                Shipyard();
                                return;
                            }, max: 4
                        }
                    };
                    lib_1.vt.form['cannon'].prompt = lib_1.vt.attr('How many cannons [', lib_1.vt.white, lib_1.vt.bright, lib_1.vt.uline, 'MAX', lib_1.vt.reset, '=', max.toString(), lib_1.vt.cyan, ']? ');
                    lib_1.vt.focus = 'cannon';
                    return;
                case 'R':
                    if (!$.player.hull) {
                        lib_1.vt.outln(`You don't have a ship!`);
                        break;
                    }
                    if ($.player.ram) {
                        lib_1.vt.outln(`But your ship already has a ram!`);
                        break;
                    }
                    cost = Math.round(Math.pow(2, $.player.hull / 150) * 7937);
                    cost = sys_1.int(cost / 10);
                    lib_1.vt.outln(`We can equip your ship with a ram for ${new lib_1.Coin(cost).carry()}.`);
                    afford = sys_1.int($.player.coin.value / cost);
                    if (!afford) {
                        lib_1.vt.outln(`You don't have enough money!`);
                        break;
                    }
                    lib_1.vt.action('yn');
                    lib_1.vt.form = {
                        'ram': {
                            cb: () => {
                                lib_1.vt.outln('\n');
                                if (/Y/i.test(lib_1.vt.entry)) {
                                    $.player.coin.value -= cost;
                                    if ($.player.coin.value < 0)
                                        $.player.coin.value = 0;
                                    $.player.ram = true;
                                    lib_1.vt.beep();
                                    lib_1.vt.outln('You now have a ram.');
                                    db.run(`UPDATE Players set ram=1 WHERE id='${$.player.id}'`);
                                }
                                Shipyard();
                                return;
                            }, prompt: 'Ok (Y/N)? ', cancel: 'N', enter: 'Y', eol: false, match: /Y|N/i, max: 1, timeout: 20
                        }
                    };
                    lib_1.vt.focus = 'ram';
                    return;
                case 'Q':
                    menu($.player.expert);
                    return;
            }
            Shipyard(suppress);
        }
    }
    function BattleUser(nme) {
        let damage;
        lib_1.vt.outln();
        if (sys_1.dice(100) + $.online.int >= sys_1.dice(100) + nme.int) {
            lib_1.vt.outln(`You approach ${pc_1.PC.who(nme).him}and quickly open fire.`);
            if (you()) {
                menu();
                return;
            }
        }
        else
            lib_1.vt.outln(`${pc_1.PC.who(nme).He}spots you coming and attacks.`);
        if (him()) {
            menu();
            return;
        }
        lib_1.vt.action('hunt');
        lib_1.vt.form = {
            'attack': {
                cb: () => {
                    lib_1.vt.outln();
                    switch (lib_1.vt.entry.toUpperCase()) {
                        case 'F':
                            if (you() || him()) {
                                menu();
                                return;
                            }
                            break;
                        case 'S':
                            lib_1.vt.outln();
                            if (!outrun($.online.hull / nme.hull, $.online.int - nme.int)) {
                                lib_1.vt.sound('oops');
                                lib_1.vt.outln(`${pc_1.PC.who(nme).He}outruns you and stops your retreat!`, -500);
                                if (him()) {
                                    menu();
                                    return;
                                }
                            }
                            else {
                                pc_1.PC.adjust('cha', -2, -1);
                                $.player.retreats++;
                                lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.cyan, 'You sail ', lib_1.vt.normal, 'away safely ', lib_1.vt.faint, 'out of range.');
                                pc_1.PC.save(nme, false, true);
                                db.run(`UPDATE Players set hull=${$.player.hull},cannon=${$.player.cannon},ram=${+$.player.ram},retreats=${$.player.retreats} WHERE id='${$.player.id}'`);
                                lib_1.log(nme.user.id, `\n${$.player.handle}, the coward, sailed away from you.`);
                                menu();
                                return;
                            }
                            break;
                        case 'R':
                            if ($.player.ram) {
                                lib_1.vt.outln();
                                if (outmaneuvered(nme.int - $.online.int, nme.hull / $.online.hull)) {
                                    lib_1.vt.outln(`${pc_1.PC.who(nme).He}quickly outmaneuvers your ship.`, -400);
                                    lib_1.vt.outln(lib_1.vt.cyan, 'You yell at your helmsman, "', lib_1.vt.reset, ['Your aim is going to kill us all!',
                                        'I said port, bastard, not starboard!',
                                        'Get me my brown pants!',
                                        'Someone throw this traitor overboard!',
                                        'She\'s turning onto US now!'][sys_1.dice(5) - 1], lib_1.vt.cyan, '"', -600);
                                }
                                else {
                                    damage = sys_1.dice($.player.hull / 2) + sys_1.dice($.online.hull / 2);
                                    lib_1.vt.outln(lib_1.vt.green, `You ram ${pc_1.PC.who(nme).him}for `, lib_1.vt.bright, `${damage}`, lib_1.vt.normal, ` hull points of damage!`);
                                    if ((nme.hull -= damage) < 1) {
                                        booty();
                                        menu();
                                        return;
                                    }
                                }
                            }
                            else {
                                lib_1.vt.sound('oops');
                                lib_1.vt.outln();
                                lib_1.vt.outln(`Your first mate cries back, "But we don't have a ram!"`, -2000);
                                lib_1.vt.sound('fire', 8);
                                lib_1.vt.outln('You shoot your first mate.', -800);
                            }
                            if (him()) {
                                menu();
                                return;
                            }
                            break;
                        case 'Y':
                            lib_1.vt.outln();
                            lib_1.vt.outln(`Hull points: ${$.online.hull}`);
                            lib_1.vt.outln(`Cannons: ${$.player.cannon}`);
                            lib_1.vt.outln(`Ram: ${$.player.ram ? 'Yes' : 'No'}`);
                            break;
                    }
                    lib_1.vt.refocus();
                }, prompt: lib_1.vt.attr(lib_1.bracket('F', false), lib_1.vt.cyan, 'ire cannons, ', lib_1.bracket('R', false), lib_1.vt.cyan, 'am, ', lib_1.bracket('S', false), lib_1.vt.cyan, 'ail off, ', lib_1.bracket('Y', false), lib_1.vt.cyan, 'our status: '),
                cancel: 'S', enter: 'F', eol: false, match: /F|R|S|Y/i, timeout: 20
            }
        };
        lib_1.vt.focus = 'attack';
        function booty() {
            nme.hull = 0;
            lib_1.vt.out('\n', [
                `You've sunk ${nme.user.handle}\'s ship!`,
                `You've sunk ${nme.user.handle}\'s leaky, old tub!`,
                `You've made splinters out of ${nme.user.handle}\'s ship!`,
                `${nme.user.handle} is now sleeping with the fishes!`,
                `${nme.user.handle} is now chum for the sharks!`
            ][sys_1.dice(5) - 1], '!\n', -500);
            lib_1.log(nme.user.id, `\n${$.player.handle} sank your ship!`);
            lib_1.news(`\tsank ${nme.user.handle}'s ship`);
            let booty = new lib_1.Coin(Math.round(Math.pow(2, $.player.hull / 150) * 7937 / 250));
            booty.value = sys_1.int(booty.value * nme.user.cannon);
            if (nme.user.coin.value > booty.value) {
                lib_1.vt.sound('boo');
                lib_1.vt.outln(`${new lib_1.Coin(nme.user.coin.value - booty.value).carry()} of the booty has settled on the ocean floor ... `, -500);
                nme.user.coin.value = booty.value;
            }
            booty.value += nme.user.coin.value;
            if (booty.value) {
                lib_1.vt.sound('booty', 5);
                lib_1.log(nme.user.id, `... and got ${booty.carry(2, true)}.\n`);
                $.player.coin.value += booty.value;
                nme.user.coin.value = 0;
                lib_1.vt.outln('You get ', booty.carry(), '.', -500);
            }
            booty.value += nme.user.coin.value;
            pc_1.PC.save(nme, false, true);
        }
        function you() {
            let result = fire($.online, nme);
            if (nme.hull > 0) {
                if (sys_1.dice(10) == 1) {
                    lib_1.vt.outln(lib_1.vt.cyan, 'You call out to your crew, "', lib_1.vt.reset, ['Fire at crest to hit the best!',
                        'Crying will not save you!',
                        `Look alive, or I'll kill you first!`,
                        'Get me my red shirt!',
                        `Y'all fight like the will-o-wisp!`][sys_1.dice(5) - 1], lib_1.vt.cyan, '"', -600);
                }
                return false;
            }
            booty();
            return true;
        }
        function him() {
            if (!nme.user.cannon && !nme.user.ram) {
                lib_1.vt.out('They are defenseless and attempt to flee . . . ', -1000);
                if (!outrun(nme.hull / $.online.hull, nme.int - $.online.int)) {
                    lib_1.vt.outln(`\nYou outrun them and stop their retreat!`, -500);
                    return false;
                }
                pc_1.PC.save(nme, false, true);
                lib_1.vt.outln('\nThey sail away over the horizon.', -500);
                return true;
            }
            if (!nme.user.ram || (nme.user.cannon && sys_1.dice(2 * nme.hull / (nme.hull - $.online.hull) + 4) > 1))
                fire(nme, $.online);
            else
                ram(nme, $.online);
            if ($.online.hull < 1) {
                $.online.altered = true;
                lib_1.log(nme.user.id, `\nYou sank ${$.player.handle}'s ship!`);
                $.reason = `sunk by ${nme.user.handle}`;
                $.online.hp = 0;
                $.online.hull = 0;
                let booty = new lib_1.Coin(Math.round(Math.pow(2, nme.user.hull / 150) * 7937 / 250));
                booty.value = sys_1.int(booty.value * $.player.cannon);
                if ($.player.coin.value > booty.value)
                    $.player.coin.value = booty.value;
                booty.value += $.player.coin.value;
                if (booty.value) {
                    lib_1.log(nme.user.id, `... and you got ${booty.carry(2, true)}.\n`);
                    nme.user.coin.value += booty.value;
                    $.player.coin.value = 0;
                }
                pc_1.PC.save(nme, false, true);
                lib_1.vt.sound('sunk', 30);
                lib_1.vt.outln(lib_1.vt.bright, `\n${nme.user.handle} `, -600, lib_1.vt.normal, 'smiles as a ', -400, lib_1.vt.faint, 'shark approaches you ', -200, '. ', -2000, '. ', -1600, '. ', -1200);
                lib_1.vt.hangup();
            }
            return ($.online.hull < 1);
        }
    }
    function MonsterHunt() {
        mon = +lib_1.vt.entry - 1;
        sm = Object.assign({}, monsters[mon]);
        let damage;
        lib_1.vt.profile({ jpg: `naval/${sm.name.toLowerCase()}`, handle: sm.name, effect: 'fadeInUp' });
        lib_1.vt.outln(`\nYou sail out until you spot${sys_1.an(sm.name)} on the horizon.\n`);
        lib_1.vt.outln(`It has ${sm.hull} hull points.`);
        lib_1.vt.action('ny');
        lib_1.vt.form = {
            'fight': {
                cb: () => {
                    lib_1.vt.outln();
                    if (!/Y/i.test(lib_1.vt.entry)) {
                        menu();
                        return;
                    }
                    $.naval--;
                    if (sys_1.dice(100) + $.online.int >= sys_1.dice(100) + sm.int) {
                        lib_1.vt.outln('\nYou approach it and quickly open fire.');
                        if (you()) {
                            menu();
                            return;
                        }
                        if (it())
                            return;
                    }
                    else {
                        lib_1.vt.outln('\nIt spots you coming and attacks.');
                        if (it()) {
                            menu();
                            return;
                        }
                    }
                    lib_1.vt.action('hunt');
                    lib_1.vt.focus = 'attack';
                }, prompt: 'Continue (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 20
            },
            'attack': {
                cb: () => {
                    lib_1.vt.outln();
                    switch (lib_1.vt.entry.toUpperCase()) {
                        case 'F':
                            if (you() || it()) {
                                menu();
                                return;
                            }
                            break;
                        case 'S':
                            if (!outrun($.online.hull / sm.hull, $.online.int - sm.int)) {
                                lib_1.vt.sound('oops');
                                lib_1.vt.out('\nIt outruns you and stops your retreat!\n');
                                lib_1.vt.sleep(500);
                                if (it()) {
                                    menu();
                                    return;
                                }
                            }
                            else {
                                lib_1.vt.out('\nYou sail away safely out of range.\n');
                                menu();
                                return;
                            }
                            break;
                        case 'R':
                            if ($.player.ram) {
                                if (outmaneuvered(sm.int - $.online.int, sm.hull / $.online.hull)) {
                                    lib_1.vt.outln('\nIt quickly outmaneuvers your ship.');
                                    lib_1.vt.sleep(400);
                                    lib_1.vt.out(lib_1.vt.cyan, 'You yell at your helmsman, "', lib_1.vt.reset, ['Not the tail, aim for the beastie\'s head!',
                                        'I said starboard, bitch, not port!',
                                        'Look alive, or it\'ll be fine dining yer bones!',
                                        'Get me my brown pants!',
                                        'Whose side are you on anyways?!'][sys_1.dice(5) - 1], lib_1.vt.cyan, '"\n');
                                    lib_1.vt.sleep(600);
                                }
                                else {
                                    damage = sys_1.dice($.player.hull / 2) + sys_1.dice($.online.hull / 2);
                                    lib_1.vt.outln(lib_1.vt.green, '\nYou ram it for ', lib_1.vt.bright, `${damage}`, lib_1.vt.normal, ` hull points of damage!`);
                                    if ((sm.hull -= damage) < 1) {
                                        booty();
                                        menu();
                                        return;
                                    }
                                }
                            }
                            else {
                                lib_1.vt.sound('oops');
                                lib_1.vt.outln(`\nYour first mate cries back, "But we don't have a ram!"`);
                                lib_1.vt.sleep(500);
                            }
                            if (it()) {
                                menu();
                                return;
                            }
                            break;
                        case 'Y':
                            lib_1.vt.outln(`\nHull points: ${$.online.hull}`);
                            lib_1.vt.outln(`Cannons: ${$.player.cannon}`);
                            lib_1.vt.outln(`Ram: ${$.player.ram ? 'Yes' : 'No'}`);
                            break;
                    }
                    lib_1.vt.refocus();
                }, prompt: lib_1.vt.attr(lib_1.bracket('F', false), lib_1.vt.cyan, 'ire cannons, ', lib_1.bracket('R', false), lib_1.vt.cyan, 'am it, ', lib_1.bracket('S', false), lib_1.vt.cyan, 'ail off, ', lib_1.bracket('Y', false), lib_1.vt.cyan, 'our status: '),
                cancel: 'S', enter: 'F', eol: false, match: /F|R|S|Y/i, timeout: 20
            }
        };
        lib_1.vt.focus = 'fight';
        function booty() {
            sm.hull = 0;
            lib_1.vt.sound('booty', 5);
            let coin = new lib_1.Coin(sm.money);
            coin.value = lib_1.tradein(coin.value, $.online.cha);
            lib_1.vt.outln('You get ', coin.carry(), ' for bringing home the carcass.');
            $.player.coin.value += coin.value;
            lib_1.vt.sleep(500);
        }
        function you() {
            let result = fire($.online, { hull: sm.hull, user: { id: '', handle: monsters[mon].name, hull: monsters[mon].hull, cannon: 0, ram: monsters[mon].ram } });
            if ((sm.hull -= result.damage) > 0)
                return false;
            booty();
            return true;
        }
        function it() {
            let damage = 0;
            if (!sm.ram || (sys_1.dice(sm.shot * sm.hull / (sm.hull - $.online.hull) + 3 * sm.shot) > 1)) {
                for (let i = 0; i < sm.shot; i++)
                    damage += sys_1.dice(sm.powder) + sys_1.dice(sm.powder);
                lib_1.vt.outln('\n', lib_1.vt.bright, lib_1.vt.blue, `The ${sm.name} attacks your ship, causing`, lib_1.vt.cyan, ` ${damage} `, lib_1.vt.blue, `hull points of damage.\n`);
                lib_1.vt.sleep(250);
            }
            else
                ram({ hull: sm.hull, user: { id: '', handle: monsters[mon].name, hull: monsters[mon].hull, cannon: sm.shot, ram: sm.ram } }, $.online);
            if (($.online.hull -= damage) < 1) {
                $.online.altered = true;
                $.online.hp = 0;
                $.online.hull = 0;
                $.player.killed++;
                $.reason = `sunk by the ${sm.name}`;
                lib_1.vt.outln(lib_1.vt.yellow, lib_1.vt.bright, `The ${sm.name} sank your ship!`);
                lib_1.vt.sound('bubbles', 15);
                if ($.player.coin.value) {
                    $.player.coin.value = 0;
                    lib_1.vt.outln('It gets all your money!');
                    lib_1.vt.sleep(500);
                }
                lib_1.vt.outln();
                return true;
            }
            return false;
        }
    }
    function fire(a, d) {
        let hits = 0;
        let damage = 0;
        let hull = 0;
        let cannon = 0;
        let ram = false;
        if (a.user == $.player)
            lib_1.vt.sound('fire');
        lib_1.vt.out('\n', lib_1.vt.cyan, a.user == $.player ? 'Attacker: ' : 'Defender: ', lib_1.vt.bright);
        for (let i = 0; i < a.user.cannon && d.user.hull; i++) {
            let n = sys_1.dice(100);
            n = (n < 66) ? 0 : (n < 96) ? 1 : (n < 100 || !d.user.id) ? 2 : 3;
            switch (n) {
                case 3:
                    if (d.user.ram) {
                        ram = true;
                        d.user.ram = false;
                        lib_1.vt.beep();
                        lib_1.vt.out(lib_1.vt.magenta, '^', -35);
                        break;
                    }
                case 2:
                    if (d.user.id) {
                        if (d.user.cannon) {
                            cannon++;
                            d.user.cannon--;
                            lib_1.vt.out(lib_1.vt.green, '@', -30);
                            break;
                        }
                    }
                case 1:
                    hits++;
                    n = sys_1.dice(50);
                    damage += n;
                    d.hull -= n;
                    if (n < 50 || d.user.hull < 1 || !d.user.id) {
                        lib_1.vt.out(lib_1.vt.red, '*', -25);
                        break;
                    }
                    else {
                        hull += 50;
                        d.user.hull -= 50;
                        lib_1.vt.out(lib_1.vt.yellow, d.user.hull ? '#' : '&', -30);
                        break;
                    }
                default:
                    lib_1.vt.out(lib_1.vt.blue, '~', -20);
            }
        }
        lib_1.vt.outln('\n');
        if (a === $.online) {
            lib_1.vt.out(lib_1.vt.green, 'You hit ', d.user.id ? 'them' : 'it', ` ${hits} times for`, lib_1.vt.bright, ` ${damage} `, lib_1.vt.normal, `hull points of damage.`, lib_1.vt.reset);
            if (cannon)
                lib_1.vt.out(`\nYou also hit ${cannon} of their cannons.`);
            if (hull)
                lib_1.vt.out(`\nYou also reduced ${hull} hull points off their ship.`);
            if (ram)
                lib_1.vt.out(`\nYou also hit their ram.`);
        }
        else {
            lib_1.vt.out(lib_1.vt.yellow, `They hit you ${hits} times for`, lib_1.vt.bright, ` ${damage} `, lib_1.vt.normal, `hull points of damage.`, lib_1.vt.reset);
            if (cannon)
                lib_1.vt.out(`\nThey also hit ${cannon} of your cannons.`);
            if (hull)
                lib_1.vt.out(`\nThey also reduced ${hull} hull points off your ship.`);
            if (ram)
                lib_1.vt.out(`\nThey also hit your ram.`);
        }
        lib_1.vt.outln();
        lib_1.vt.sleep(250);
        return { hits, damage, hull, cannon, ram };
    }
    function outmaneuvered(dint, dhull) {
        dint >>= 2;
        const outstmart = 100 + dint;
        let bigger = sys_1.int(100 * dhull);
        return sys_1.dice(outstmart) + sys_1.dice(bigger) > 66;
    }
    function outrun(dhull, dint) {
        dint = dint > 0 ? dint >> 1 : 0;
        let run = sys_1.int(50 + (100 * dhull + dint) / 2);
        run = run > 100 ? 100 : run;
        return run > sys_1.dice(100);
    }
    function ram(a, d) {
        if (a.user.id)
            lib_1.vt.out(lib_1.vt.yellow);
        else
            lib_1.vt.out(lib_1.vt.bright, lib_1.vt.blue);
        lib_1.vt.out(`\n${a.user.handle} ${pc_1.PC.what(a, 'ram')}${pc_1.PC.who(d).him}for`);
        let damage = sys_1.dice(a.user.hull / 2) + sys_1.dice(a.hull / 2);
        if (a.user.id)
            lib_1.vt.out(lib_1.vt.bright);
        else
            lib_1.vt.out(lib_1.vt.cyan);
        lib_1.vt.out(` ${damage} `);
        if (a.user.id)
            lib_1.vt.out(lib_1.vt.normal);
        else
            lib_1.vt.out(lib_1.vt.blue);
        lib_1.vt.outln(`hull points of damage!`);
        lib_1.vt.sleep(500);
        d.hull -= damage;
    }
})(Naval || (Naval = {}));
module.exports = Naval;
