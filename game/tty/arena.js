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
var Arena;
(function (Arena) {
    let main = {
        'U': { description: 'User fights' },
        'M': { description: 'Monster fights' },
        'J': { description: 'Joust users' },
        'C': { description: 'Cast a spell' },
        'P': { description: 'Poison your weapon' },
        'G': { description: 'Goto the square' },
        'Y': { description: 'Your status' }
    };
    function menu(suppress = true) {
        if (player_1.checkXP($.online, menu))
            return;
        if ($.online.altered)
            pc_1.PC.save();
        if ($.reason)
            lib_1.vt.hangup();
        npc_1.elemental.orders('Arena');
        lib_1.vt.form = {
            'menu': { cb: choice, cancel: 'q', enter: '?', eol: false }
        };
        let hints = '';
        if (!suppress) {
            if ($.online.hp < $.player.hp)
                hints += `> Buy Hit Points!\n`;
            if ($.joust)
                hints += `> Try jousting another player to win money.\n`;
            if ($.player.poisons.length && !$.online.toWC)
                hints += `> Don't forget to poison your weapon.\n`;
            if ($.player.coin.value >= sys_1.money($.player.level))
                hints += `> Carrying too much money here is not a good idea.  Spend it in the Square\n  or deposit it in the Bank for safer keeping.\n`;
        }
        lib_1.vt.form['menu'].prompt = lib_1.display('arena', lib_1.vt.Red, lib_1.vt.red, suppress, main, hints);
        player_1.input('menu');
    }
    Arena.menu = menu;
    function choice() {
        var _a;
        let suppress = false;
        let choice = lib_1.vt.entry.toUpperCase();
        if ((_a = main[choice]) === null || _a === void 0 ? void 0 : _a.description) {
            lib_1.vt.out(' - ', main[choice].description);
            suppress = $.player.expert;
        }
        lib_1.vt.outln();
        switch (choice) {
            case 'C':
                if (!$.access.roleplay)
                    break;
                Battle.cast($.online, menu);
                return;
            case 'G':
                lib_1.vt.action('clear');
                require('./square').menu($.player.expert);
                return;
            case 'J':
                if (!$.joust) {
                    lib_1.vt.outln('\nYou have run out of jousts.');
                    suppress = true;
                    break;
                }
                Battle.user('Joust', (opponent) => {
                    if (opponent.user.id == '') {
                        menu();
                        return;
                    }
                    lib_1.vt.outln();
                    if (opponent.user.id == $.player.id) {
                        opponent.user.id = '';
                        lib_1.vt.outln(`You can't joust a wimp like `, $.online.who.him);
                        menu();
                        return;
                    }
                    if ($.player.level - opponent.user.level > 3) {
                        lib_1.vt.outln('You can only joust someone higher or up to three levels below you.');
                        menu(true);
                        return;
                    }
                    let ability = pc_1.PC.jousting($.online);
                    let versus = pc_1.PC.jousting(opponent);
                    let factor = (100 - ($.player.level > opponent.user.level ? $.player.level : opponent.user.level)) / 10 + 3;
                    let jw = 0;
                    let jl = 0;
                    let pass = 0;
                    if (!items_1.Access.name[opponent.user.access].roleplay || versus < 1 || opponent.user.level > 1 && (opponent.user.jw + 3 * opponent.user.level) < opponent.user.jl) {
                        lib_1.vt.outln('That knight is out practicing right now.');
                        menu(true);
                        return;
                    }
                    lib_1.vt.outln('Jousting ability:\n');
                    lib_1.vt.out(lib_1.vt.green, lib_1.vt.bright, sys_1.sprintf('%-25s', opponent.user.handle), lib_1.vt.white, sys_1.sprintf('%4d', versus));
                    if (opponent.user.id == $.king.id)
                        lib_1.vt.out(lib_1.vt.normal, ' - ', lib_1.vt.magenta, 'The Crown');
                    lib_1.vt.outln();
                    lib_1.vt.outln(lib_1.vt.green, lib_1.vt.bright, sys_1.sprintf('%-25s', $.player.handle), lib_1.vt.white, sys_1.sprintf('%4d', ability));
                    lib_1.vt.outln();
                    if ((ability + factor * $.player.level) < (versus + 1)) {
                        lib_1.vt.outln(opponent.user.handle, ' laughs rudely in your face!\n');
                        menu(true);
                        return;
                    }
                    lib_1.vt.action('ny');
                    lib_1.vt.form = {
                        'compete': {
                            cb: () => {
                                lib_1.vt.outln('\n');
                                if (/Y/i.test(lib_1.vt.entry)) {
                                    if ($.joust-- > 2)
                                        lib_1.vt.music('joust');
                                    lib_1.vt.profile({
                                        jpg: 'arena/joust',
                                        handle: opponent.user.handle,
                                        level: opponent.user.level, pc: opponent.user.pc,
                                        effect: 'slideInLeft'
                                    });
                                    lib_1.vt.out('The trumpets blare! ', -400, 'You and your opponent ride into the arena. ', -400);
                                    lib_1.vt.outln(opponent.user.id == $.king.id ? '\nThe crowd goes silent.' : 'The crowd roars!', -400);
                                    $.online.altered = true;
                                    lib_1.vt.action('joust');
                                    round();
                                    player_1.input('joust', '');
                                    return;
                                }
                                menu();
                                return;
                            }, prompt: 'Are you sure (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                        },
                        'joust': {
                            cb: () => {
                                lib_1.vt.outln('\n');
                                if (/F/i.test(lib_1.vt.entry)) {
                                    lib_1.log(opponent.user.id, `\n${$.player.handle} forfeited to you in a joust.`);
                                    lib_1.vt.animated('pulse');
                                    if (opponent.user.id == $.king.id) {
                                        lib_1.vt.sound('cheer');
                                        pc_1.PC.adjust('cha', 101);
                                        lib_1.vt.outln('The crowd is delighted by your show of respect to the Crown.', -300);
                                    }
                                    else {
                                        lib_1.vt.sound('boo');
                                        lib_1.vt.animated('slideOutRight');
                                        $.player.jl++;
                                        db.run(`UPDATE Players set jw=jw+1 WHERE id='${opponent.user.id}'`);
                                        lib_1.vt.outln('The crowd throws rocks at you as you ride out of the arena.', -300);
                                    }
                                    menu();
                                    return;
                                }
                                if (/J/i.test(lib_1.vt.entry)) {
                                    lib_1.vt.outln('You spur the horse. ', -200, 'The tension mounts. ', -200);
                                    let result = 0;
                                    while (!result)
                                        result = (ability + sys_1.dice(factor * $.player.level)) - (versus + sys_1.dice(factor * opponent.user.level));
                                    if (result > 0) {
                                        lib_1.vt.sound('wall');
                                        lib_1.vt.animated(['flash', 'jello', 'rubberBand'][jw]);
                                        lib_1.vt.outln(lib_1.vt.green, '-*>', lib_1.vt.white, lib_1.vt.bright, ' Thud! ', lib_1.vt.normal, lib_1.vt.green, '<*-  ', lib_1.vt.reset, 'A hit! ', -100, ' You win this pass!', -100);
                                        if (++jw == 3) {
                                            lib_1.vt.outln('\nYou have won the joust!');
                                            if (opponent.user.id == $.king.id) {
                                                lib_1.vt.sound('boo');
                                                lib_1.vt.animated('fadeOut');
                                                pc_1.PC.adjust('cha', -2, -1);
                                                lib_1.vt.outln('The crowd is furious!', -250);
                                            }
                                            else {
                                                lib_1.vt.sound('cheer');
                                                lib_1.vt.animated('hinge');
                                                lib_1.vt.outln('The crowd cheers!', -250);
                                            }
                                            let reward = new items_1.Coin(sys_1.money(opponent.user.level));
                                            $.player.coin.value += reward.value;
                                            $.player.jw++;
                                            if (db.run(`UPDATE Players set jl=jl+1 WHERE id='${opponent.user.id}'`).changes)
                                                lib_1.log(opponent.user.id, `\n${$.player.handle} beat you in a joust and got ${reward.amount}.`);
                                            lib_1.vt.outln('You win ', lib_1.carry(reward), '!', -250);
                                            if ($.player.jw > 14 && $.player.jw / ($.player.jw + $.player.jl) > 0.9) {
                                                let ring = items_1.Ring.power([], null, 'joust');
                                                if (items_1.Ring.wear($.player.rings, ring.name)) {
                                                    lib_1.getRing('win', ring.name);
                                                    pc_1.PC.saveRing(ring.name, $.player.id, $.player.rings);
                                                }
                                            }
                                            menu();
                                            return;
                                        }
                                    }
                                    else {
                                        if (items_1.Ring.power(opponent.user.rings, $.player.rings, 'joust').power
                                            && !items_1.Ring.power($.player.rings, opponent.user.rings, 'joust').power && sys_1.dice(3) == 1) {
                                            lib_1.vt.sound('swoosh');
                                            lib_1.vt.out(lib_1.vt.magenta, '^>', lib_1.vt.white, ' SWOOSH ', lib_1.vt.magenta, '<^  ', lib_1.vt.reset, pc_1.PC.who(opponent).He, 'missed! ', -100, ' You both pass and try again!', -100);
                                            player_1.input('joust', '');
                                            return;
                                        }
                                        lib_1.vt.animated(['bounce', 'shake', 'tada'][jl]);
                                        lib_1.vt.sound('oof');
                                        lib_1.vt.outln(lib_1.vt.magenta, '^>', lib_1.vt.bright, lib_1.vt.white, ' Oof! ', lib_1.vt.normal, lib_1.vt.magenta, '<^  ', lib_1.vt.reset, pc_1.PC.who(opponent).He, 'hits! ', -100, ' You lose this pass!', -100);
                                        if (++jl == 3) {
                                            lib_1.vt.outln('\nYou have lost the joust!');
                                            lib_1.vt.sound('boo');
                                            lib_1.vt.outln('The crowd boos you!', -200);
                                            let reward = new items_1.Coin(sys_1.money($.player.level));
                                            $.player.jl++;
                                            if (db.run(`UPDATE Players set jw=jw+1,coin=coin+${reward.value} WHERE id='${opponent.user.id}'`).changes)
                                                lib_1.log(opponent.user.id, `\n${$.player.handle} lost to you in a joust.  You got ${reward.amount}.`);
                                            lib_1.news(`\tlost to ${opponent.user.handle} in a joust`);
                                            lib_1.vt.wall($.player.handle, `lost to ${opponent.user.handle} in a joust`);
                                            lib_1.vt.animated('slideOutRight');
                                            lib_1.vt.outln(opponent.user.handle, ' spits on your face.', -300);
                                            menu();
                                            return;
                                        }
                                    }
                                    round();
                                }
                                player_1.input('joust', '');
                            }, prompt: lib_1.vt.attr('        ', lib_1.bracket('J', false), lib_1.vt.yellow, lib_1.vt.bright, ' Joust', lib_1.vt.normal, lib_1.vt.magenta, ' * ', lib_1.bracket('F', false), lib_1.vt.yellow, lib_1.vt.bright, ' Forfeit: '), cancel: 'j', enter: 'J', eol: false, match: /F|J/i
                        }
                    };
                    lib_1.vt.outln('You grab a horse and prepare yourself to joust.');
                    player_1.input('compete', 'y');
                    function round() {
                        lib_1.vt.out('\n', lib_1.vt.green, '--=:)) Round ', sys_1.romanize(++pass), ' of V: Won:', lib_1.vt.white, lib_1.vt.bright, jw.toString(), lib_1.vt.normal, lib_1.vt.magenta, ' ^', lib_1.vt.green, ' Lost:', lib_1.vt.white, lib_1.vt.bright, jl.toString(), lib_1.vt.normal, lib_1.vt.green, ' ((:=--');
                    }
                });
                return;
            case 'M':
                if (!$.arena) {
                    lib_1.vt.outln('\nYou have no more arena fights.');
                    suppress = true;
                    break;
                }
                lib_1.vt.action('monster');
                lib_1.vt.form = {
                    pick: {
                        cb: () => {
                            if (lib_1.vt.entry.length) {
                                let mon = sys_1.int(lib_1.vt.entry);
                                if (!/D/i.test(lib_1.vt.entry)) {
                                    if (mon < 1 || mon > npc_1.arena.monsters.length) {
                                        lib_1.vt.out(' ?? ');
                                        lib_1.vt.refocus();
                                        return;
                                    }
                                    lib_1.vt.entry = mon.toString();
                                }
                                lib_1.vt.outln();
                                if (!MonsterFights())
                                    menu();
                            }
                            else {
                                lib_1.vt.outln();
                                menu();
                            }
                        },
                        prompt: 'Fight what monster (' + lib_1.vt.attr(lib_1.vt.white, '1-' + npc_1.arena.monsters.length, lib_1.vt.cyan, ', ', lib_1.bracket('D', false), lib_1.vt.cyan, 'emon)? '),
                        min: 0, max: 2
                    }
                };
                player_1.input('pick');
                return;
            case 'P':
                if (!$.access.roleplay)
                    break;
                Battle.poison($.online, menu);
                return;
            case 'Q':
                require('./menu').menu($.player.expert);
                return;
            case 'U':
                if (!$.arena) {
                    lib_1.vt.outln('\nYou have no more arena fights.');
                    suppress = true;
                    break;
                }
                Battle.user('Fight', (opponent) => {
                    if (opponent.user.id == '') {
                        menu();
                        return;
                    }
                    if (opponent.user.id == $.player.id) {
                        opponent.user.id = '';
                        lib_1.vt.outln(`\nYou can't fight a wimp like `, pc_1.PC.who(opponent).him);
                        menu();
                        return;
                    }
                    if ($.player.level - opponent.user.level > 3) {
                        lib_1.vt.outln('\nYou can only fight someone higher or up to three levels below you.');
                        menu();
                        return;
                    }
                    lib_1.cat('player/' + opponent.user.pc.toLowerCase());
                    lib_1.vt.out(opponent.user.handle, ' ');
                    if (opponent.user.status.length) {
                        lib_1.vt.out('was defeated by ');
                        let rpc = { user: { id: opponent.user.status } };
                        if (pc_1.PC.load(rpc))
                            lib_1.vt.out(rpc.user.handle, lib_1.vt.cyan, ' (', lib_1.vt.bright, lib_1.vt.white, opponent.user.xplevel.toString(), lib_1.vt.normal, lib_1.vt.cyan, ')');
                        else
                            lib_1.vt.out(opponent.user.status);
                        lib_1.vt.outln();
                        menu();
                        return;
                    }
                    lib_1.vt.out(`is a level ${opponent.user.level} ${opponent.user.pc}`);
                    if ($.player.emulation == 'XT')
                        lib_1.vt.out(' ', opponent.pc.color || lib_1.vt.white, opponent.pc.unicode, lib_1.vt.reset);
                    if (opponent.user.level !== opponent.user.xplevel)
                        lib_1.vt.out(' ', lib_1.bracket(opponent.user.xplevel, false));
                    lib_1.vt.outln();
                    if ($.player.novice && !opponent.user.novice) {
                        lib_1.vt.outln('You are allowed only to fight other novices.');
                        menu();
                        return;
                    }
                    if (!items_1.Access.name[opponent.user.access].roleplay) {
                        lib_1.vt.outln('You are allowed only to fight other players.');
                        if (opponent.user.id[0] == '_') {
                            pc_1.PC.adjust('cha', -2, -1);
                            $.player.coward = true;
                            $.online.altered = true;
                        }
                        menu();
                        return;
                    }
                    if (!$.player.novice && opponent.user.novice) {
                        lib_1.vt.outln('You are not allowed to fight novices.');
                        menu();
                        return;
                    }
                    if (!db.lock(opponent.user.id)) {
                        lib_1.vt.beep();
                        lib_1.vt.outln(lib_1.vt.cyan, lib_1.vt.faint, `${pc_1.PC.who(opponent).He}is currently engaged elsewhere and not available.`);
                        menu();
                        return;
                    }
                    pc_1.PC.wearing(opponent);
                    lib_1.vt.action('ny');
                    lib_1.vt.form = {
                        'fight': {
                            cb: () => {
                                lib_1.vt.outln();
                                if (/Y/i.test(lib_1.vt.entry)) {
                                    if (pc_1.PC.activate(opponent, true)) {
                                        lib_1.vt.music('combat' + $.arena--);
                                        Battle.engage('User', $.online, opponent, menu);
                                    }
                                    else {
                                        db.unlock($.player.id, true);
                                        menu($.player.expert);
                                    }
                                }
                                else
                                    menu($.player.expert);
                            }, prompt: `Will you fight ${pc_1.PC.who(opponent).him}(Y/N)? `, cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                        }
                    };
                    player_1.input('fight', 'y');
                });
                return;
            case 'Y':
                lib_1.vt.outln();
                Battle.yourstats();
                suppress = true;
                break;
        }
        menu(suppress);
    }
    function MonsterFights() {
        let cost;
        let monster;
        lib_1.vt.action('clear');
        if (/D/i.test(lib_1.vt.entry)) {
            if ($.player.level < 50) {
                lib_1.vt.outln('\nYou are not powerful enough to fight demons yet.  Go fight some monsters.');
                return;
            }
            cost = new items_1.Coin(sys_1.money($.player.level)).pick(1);
            lib_1.vt.outln('\nThe ancient necromancer will summon you a demon for ', lib_1.carry(cost));
            if ($.player.coin.value < cost.value) {
                lib_1.vt.outln(`You don't have enough!`);
                return;
            }
            lib_1.vt.action('yn');
            lib_1.vt.form = {
                'pay': {
                    cb: () => {
                        lib_1.vt.outln('\n');
                        if (/Y/i.test(lib_1.vt.entry)) {
                            $.player.coin.value -= cost.value;
                            $.online.altered = true;
                            lib_1.vt.outln('As you hand him the money, it disappears into thin air ... ', -1200, '\n');
                            monster = {};
                            monster.user = { id: '' };
                            Object.assign(monster.user, require('../etc/summoned demon.json'));
                            let l = $.player.level + 2;
                            if (l >= $.sysop.level)
                                l = $.sysop.level - 2;
                            if ((monster.user.level = l + sys_1.dice(7) - 4) > 99)
                                monster.user.level = 99;
                            cost.value += lib_1.tradein(sys_1.money(monster.user.level), $.player.cha);
                            let n = sys_1.int(items_1.Weapon.merchant.length * $.player.level / 110);
                            n = n >= items_1.Weapon.merchant.length ? items_1.Weapon.merchant.length - 1 : n;
                            monster.user.weapon = n + 3;
                            cost.value += lib_1.tradein(new items_1.Coin(items_1.Weapon.name[items_1.Weapon.merchant[n]].value).value, $.player.cha);
                            n = sys_1.int(items_1.Armor.merchant.length * $.player.level / 110);
                            n = n >= items_1.Armor.merchant.length ? items_1.Armor.merchant.length - 1 : n;
                            monster.user.armor = n + 2;
                            cost.value += lib_1.tradein(new items_1.Coin(items_1.Armor.name[items_1.Armor.merchant[n]].value).value, $.player.cha);
                            pc_1.PC.reroll(monster.user, (sys_1.dice(($.online.int + $.online.cha) / 50) > 1) ? monster.user.pc : pc_1.PC.random('monster'), monster.user.level);
                            monster.user.spells = [7, 9];
                            if (monster.user.magic) {
                                for (let i = 0; i < Object.keys(items_1.Magic.spells).length; i++) {
                                    if (sys_1.dice(($.player.cha >> 2) + 5 * i + $.player.level - monster.user.level) <= monster.user.magic) {
                                        let spell = items_1.Magic.pick(i);
                                        if (!items_1.Magic.have(monster.user.spells, spell))
                                            items_1.Magic.add(monster.user.spells, i);
                                    }
                                }
                            }
                            if (monster.user.poison) {
                                for (let i = 0; i < Object.keys(items_1.Poison.vials).length; i++) {
                                    if (sys_1.dice(($.player.cha >> 2) + 5 * i + $.player.level - monster.user.level) <= monster.user.poison) {
                                        let vial = items_1.Poison.pick(i);
                                        if (!items_1.Poison.have(monster.user.poisons, vial))
                                            items_1.Poison.add(monster.user.poisons, i);
                                    }
                                }
                            }
                            pc_1.PC.activate(monster);
                            monster.user.coin.value += cost.value;
                            lib_1.vt.profile({
                                jpg: 'arena/' + monster.user.handle.toLowerCase(),
                                handle: `${monster.user.handle}`, level: monster.user.level, pc: 'contest',
                                effect: 'jello'
                            });
                            lib_1.cat('arena/' + monster.user.handle);
                            lib_1.vt.outln(`The old necromancer summons you a level ${monster.user.level} creature.`);
                            pc_1.PC.wearing(monster);
                            lib_1.vt.action('ny');
                            player_1.input('fight', 'y');
                            return;
                        }
                        lib_1.vt.outln(lib_1.vt.cyan, 'His eyes glow ', lib_1.vt.red, lib_1.vt.bright, 'red', lib_1.vt.normal, lib_1.vt.cyan, ' and says, "', lib_1.vt.white, lib_1.vt.bright, `I don't make deals!`, lib_1.vt.normal, lib_1.vt.cyan, '"');
                        menu();
                    }, prompt: 'Will you pay (Y/N)? ', cancel: 'N', enter: 'Y', eol: false, match: /Y|N/i, max: 1, timeout: 10
                },
                'fight': {
                    cb: () => {
                        lib_1.vt.outln();
                        if (/Y/i.test(lib_1.vt.entry)) {
                            lib_1.vt.music('combat' + $.arena--);
                            Battle.engage('Monster', $.online, monster, menu);
                        }
                        else {
                            lib_1.vt.animated('fadeOut');
                            menu();
                        }
                    }, prompt: 'Fight this demon (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 30
                }
            };
            player_1.input('pay', 'y');
        }
        else {
            let mon = sys_1.int(lib_1.vt.entry) - 1;
            if (mon == npc_1.arena.monsters.length - 1)
                lib_1.vt.sound('demogorgon');
            monster = {};
            monster.user = { id: '', handle: npc_1.arena.monsters[mon].name, sex: 'I' };
            pc_1.PC.reroll(monster.user, npc_1.arena.monsters[mon].pc, npc_1.arena.monsters[mon].level);
            monster.user.weapon = npc_1.arena.monsters[mon].weapon;
            monster.user.armor = npc_1.arena.monsters[mon].armor;
            monster.user.rings = npc_1.arena.monsters[mon].rings || [];
            monster.user.spells = [];
            if (npc_1.arena.monsters[mon].spells)
                for (let i = 0; i < npc_1.arena.monsters[mon].spells.length; i++)
                    items_1.Magic.add(monster.user.spells, npc_1.arena.monsters[mon].spells[i]);
            pc_1.PC.activate(monster);
            if (npc_1.arena.monsters[mon].adept)
                monster.adept = sys_1.int(npc_1.arena.monsters[mon].adept);
            monster.user.coin.amount = npc_1.arena.monsters[mon].money.toString();
            lib_1.cat('arena/' + monster.user.handle.toLowerCase());
            lib_1.vt.profile({
                jpg: 'arena/' + monster.user.handle.toLowerCase(),
                handle: `#${mon + 1} - ${monster.user.handle}`,
                level: monster.user.level, pc: monster.user.pc.toLowerCase(),
                effect: npc_1.arena.monsters[mon].effect || 'fadeIn'
            });
            lib_1.vt.out(`The ${monster.user.handle} is a level ${monster.user.level} ${monster.user.pc}`);
            if ($.player.emulation == 'XT')
                lib_1.vt.out(' ', monster.pc.color || lib_1.vt.white, monster.pc.unicode);
            lib_1.vt.outln();
            pc_1.PC.wearing(monster);
            lib_1.vt.action('ny');
            lib_1.vt.form = {
                'fight': {
                    cb: () => {
                        lib_1.vt.outln();
                        if (/Y/i.test(lib_1.vt.entry)) {
                            if (mon == npc_1.arena.monsters.length - 1)
                                lib_1.vt.music('boss' + $.arena--);
                            else
                                lib_1.vt.music('combat' + $.arena--);
                            Battle.engage('Monster', $.online, monster, menu);
                        }
                        else {
                            lib_1.vt.animated('fadeOut');
                            menu();
                        }
                    }, prompt: 'Will you fight it (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                }
            };
            player_1.input('fight', 'y');
        }
        return true;
    }
})(Arena || (Arena = {}));
module.exports = Arena;
