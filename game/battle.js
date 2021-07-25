"use strict";
const $ = require("./runtime");
const db = require("./db");
const items_1 = require("./items");
const lib_1 = require("./lib");
const npc_1 = require("./npc");
const pc_1 = require("./pc");
const player_1 = require("./player");
const sys_1 = require("./sys");
var Battle;
(function (Battle) {
    let fini;
    let gang = {
        name: '',
        members: [], handles: [], genders: [], melee: [], status: [], validated: [],
        win: 0, loss: 0, banner: 0, trim: 0, back: 0, fore: 0
    };
    let parties;
    let alive;
    let p1, p2;
    let round = [];
    let bs;
    let dodge;
    let volley;
    function end() {
        round = [];
        db.unlock($.player.id, true);
        if (items_1.Ring.power([], $.player.rings, 'buff').power) {
            if ($.online.toAC < 0)
                $.online.toAC++;
            if ($.online.toWC < 0)
                $.online.toWC++;
        }
        else {
            if ($.online.toAC > 0)
                $.online.toAC--;
            if ($.online.toWC > 0)
                $.online.toWC--;
        }
        if ($.from == 'Merchant') {
            if ($.online.hp < 1) {
                $.player.coin.value = 0;
                lib_1.death($.reason || `refused ${$.dwarf.user.handle}`);
                lib_1.vt.outln('  ', lib_1.vt.yellow, lib_1.vt.bright, `"Next time bring friends."`);
                lib_1.vt.sound('punk', 8);
            }
            else {
                lib_1.news(`\tdefeated ${$.dwarf.user.handle}`);
                lib_1.vt.wall($.player.handle, `defeated ${$.dwarf.user.handle}`);
                $.player.coward = false;
            }
        }
        if ($.from == 'Naval') {
            if ($.online.hp > 0) {
                lib_1.vt.sound('naval' + (parties[1][0].user.id == '_OLD' ? '_f' : ''), 32);
                pc_1.PC.adjust('str', 102, 1, 1);
                pc_1.PC.adjust('int', 102, 1, 1);
                pc_1.PC.adjust('dex', 102, 1, 1);
                pc_1.PC.adjust('cha', 102, 1, 1);
                const msg = `survived ${$.online.who.his} chance encounter with ${parties[1][0].user.handle}`;
                lib_1.news(`\t${msg}`);
                lib_1.vt.wall($.player.handle, msg);
            }
            else {
                pc_1.PC.adjust('str', -2, -1, -1);
                pc_1.PC.adjust('int', -2, -1, -1);
                pc_1.PC.adjust('dex', -2, -1, -1);
                pc_1.PC.adjust('cha', -2, -1, -1);
            }
            $.player.coin.value = 0;
            lib_1.vt.beep();
            Battle.yourstats();
        }
        if ($.from == 'Tavern') {
            const mantle = sys_1.pathTo('files/tavern', 'trophy.json');
            if ($.online.hp < 1) {
                lib_1.vt.outln(`He picks up your ${lib_1.weapon()} and triumphantly waves it around to`);
                lib_1.vt.out(`the cheering crowd. `, -1600, ` He struts toward the mantelpiece `, -600);
                if ($.online.weapon.wc > $.barkeep.weapon.wc) {
                    let trophy = { who: $.player.id, weapon: $.player.weapon };
                    sys_1.fs.writeFileSync(sys_1.pathTo(mantle), JSON.stringify(trophy));
                    lib_1.vt.outln(`and hangs his new trophy.`);
                }
                else
                    lib_1.vt.outln(`and burns it!`, -600, 'Heh.');
                items_1.Weapon.equip($.online, items_1.Weapon.merchant[0]);
                pc_1.PC.save();
                $.reason = `schooled by ${$.barkeep.user.handle}`;
                lib_1.vt.sound('winner', 32);
                $.player.coin.value = 0;
                lib_1.vt.outln('\n  ', lib_1.vt.green, lib_1.vt.bright, `"Drinks are on the house!"`, -2250);
            }
            else {
                lib_1.vt.music('barkeep');
                lib_1.news(`\tdefeated ${$.barkeep.user.handle}`);
                lib_1.vt.wall($.player.handle, `defeated ${$.barkeep.user.handle}`);
                let trophy = JSON.parse(sys_1.fs.readFileSync(mantle).toString());
                items_1.Weapon.equip($.barkeep, trophy.weapon);
                let credit = new items_1.Coin($.barkeep.weapon.value);
                credit.value = lib_1.tradein(credit.value, $.online.cha);
                let result = items_1.Weapon.swap($.online, $.barkeep, credit);
                if (typeof result == 'boolean' && result) {
                    lib_1.vt.outln('You also take his trophy, ', lib_1.weapon(), -600);
                    sys_1.fs.writeFileSync(sys_1.pathTo('files/tavern', 'trophy.json'), JSON.stringify({ "who": "_TAX", "weapon": "Needle" }));
                }
                lib_1.vt.sound('ko', 12);
                if ($.player.cha > 49)
                    pc_1.PC.adjust('cha', -22, -20, -2);
                $.player.coward = false;
            }
        }
        if (/Gates|Taxman/.test($.from)) {
            if ($.online.hp < 1) {
                $.player.coin.value -= $.taxman.user.coin.value;
                if ($.player.coin.value < 0) {
                    $.player.bank.value += $.player.coin.value;
                    $.player.coin.value = 0;
                    if ($.player.bank.value < 0) {
                        $.player.loan.value -= $.player.bank.value;
                        $.player.bank.value = 0;
                    }
                }
                lib_1.vt.beep();
                lib_1.death($.reason || 'tax evasion');
                lib_1.vt.outln('  ', lib_1.vt.blue, lib_1.vt.bright, `"Thanks for the taxes!"`);
                lib_1.vt.sound('thief2', 16);
            }
            else {
                if ($.from == 'Taxman') {
                    lib_1.news(`\tdefeated ${$.taxman.user.handle}`);
                    lib_1.vt.wall($.player.handle, `defeated ${$.taxman.user.handle}`);
                }
                $.player.coward = false;
            }
        }
        if ($.from == 'Witch') {
            if ($.online.hp < 1) {
                $.player.coin.value = 0;
                lib_1.death($.reason || `refused ${$.witch.user.handle}`);
                lib_1.vt.outln('  ', lib_1.vt.green, lib_1.vt.bright, `"Hell hath no fury like a woman scorned."`);
                lib_1.vt.sound('crone', 30);
            }
            else {
                lib_1.vt.animated('hinge');
                lib_1.vt.sound('naval_f', 25);
                lib_1.news(`\tdefeated ${$.witch.user.handle}`);
                lib_1.vt.wall($.player.handle, `defeated ${$.witch.user.handle}`);
                $.player.coward = false;
                $.sorceress = 0;
            }
        }
        if ($.from == 'User') {
            let opponent = parties[1][0];
            if (!(opponent.user.id[0] == '_' || opponent.user.gender == 'I')) {
                pc_1.PC.save(opponent, false, true);
                if ($.player.hp > 0 && opponent.hp == 0) {
                    lib_1.vt.action('ny');
                    lib_1.vt.form = {
                        'yn': {
                            cb: () => {
                                if (/Y/i.test(lib_1.vt.entry)) {
                                    lib_1.vt.action('freetext');
                                    player_1.input('message', 'just passing gas...');
                                }
                                else {
                                    lib_1.vt.outln();
                                    fini();
                                }
                            }, cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 20
                        },
                        'message': {
                            cb: () => {
                                lib_1.vt.outln();
                                if (sys_1.cuss(lib_1.vt.entry)) {
                                    $.player.coward = true;
                                    lib_1.vt.hangup();
                                }
                                if (lib_1.vt.entry) {
                                    lib_1.log(opponent.user.id, `... and says,`);
                                    lib_1.log(opponent.user.id, `"${lib_1.vt.entry}"`);
                                }
                                fini();
                            }, prompt: '>', max: 78
                        }
                    };
                    lib_1.vt.form['yn'].prompt = `Leave ${opponent.who.him}a message (Y/N)? `;
                    player_1.input('yn', 'y');
                    return;
                }
            }
        }
        fini();
    }
    function engage(menu, party, mob, cb) {
        $.from = menu;
        let a, b;
        if (Array.isArray(party))
            a = party;
        else
            a = new Array(party);
        if (Array.isArray(mob))
            b = mob;
        else
            b = new Array(mob);
        parties = [a, b];
        fini = cb;
        alive = [parties[0].length, parties[1].length];
        round = [];
        Battle.expel = false;
        Battle.retreat = false;
        Battle.teleported = false;
        volley = 0;
        dodge = 0;
        attack();
    }
    Battle.engage = engage;
    function attack(retry = false) {
        if (Battle.retreat || Battle.teleported || ++volley > 12345) {
            if (volley > 12345 && !Battle.retreat) {
                Battle.retreat = true;
                $.player.coward = true;
            }
            if ($.online.confused)
                pc_1.PC.activate($.online, false, true);
            end();
            return;
        }
        if (!round.length) {
            if (volley > 1) {
                lib_1.vt.outln($.online.hp > 0 ? -80 : -800);
                lib_1.vt.outln('    -=', lib_1.bracket('*', false), '=-');
            }
            for (let p in parties) {
                for (let m in parties[p]) {
                    if (parties[p][m].hp > 0) {
                        let rpc = parties[p][m];
                        let x = 11 - rpc.user.backstab - items_1.Ring.power([], rpc.user.rings, 'initiate').power;
                        x -= rpc.user.steal - items_1.Ring.power([], rpc.user.rings, 'steal').power;
                        let s = sys_1.dice(rpc.user.level / x) + sys_1.int(rpc.dex / 2) + sys_1.dice(rpc.dex / 2);
                        round.push({ party: +p, member: +m, react: +s });
                    }
                }
            }
            round.sort((n1, n2) => n2.react - n1.react);
        }
        let n = round[0];
        let enemy;
        let rpc = parties[n.party][n.member];
        if (rpc.hp < 1 || rpc.user.xplevel < 1) {
            next();
            return;
        }
        if (rpc.confused) {
            pc_1.PC.adjust('int', rpc.pc.toInt, 0, 0, rpc);
            pc_1.PC.adjust('dex', rpc.pc.toDex, 0, 0, rpc);
        }
        let mob = n.party ^ 1;
        let nme;
        do {
            nme = sys_1.dice(parties[mob].length) - 1;
        } while (parties[mob][nme].hp < 1);
        enemy = parties[mob][nme];
        if (volley == 1 && rpc !== $.online)
            lib_1.vt.outln();
        p1 = pc_1.PC.who(rpc, alive[n.party] > 1);
        p2 = pc_1.PC.who(enemy, alive[mob] > 1);
        if (!enemy.confused) {
            let speed = 0;
            let skip = items_1.Ring.power(rpc.user.rings, enemy.user.rings, 'skip', 'pc', rpc.user.pc);
            if (skip.power && sys_1.dice(12 + 2 * rpc.user.magic + dodge) > sys_1.dice(enemy.user.magic / 2 + 2))
                skip.power = 0;
            else {
                dodge += 2;
                speed = -250;
            }
            if (!skip.power
                && sys_1.dice(enemy.user.level / 9 + 15) > sys_1.int(rpc.user.level / 9 + 3)
                && sys_1.dice((enemy.dex > 90 ? enemy.dex - 89 : 1) + 21) > ((rpc.dex > 90 ? rpc.dex - 89 : 1) + 10)
                && sys_1.dice(2 * (enemy.user.steal + items_1.Ring.power(rpc.user.rings, enemy.user.rings, 'steal').power))
                    > (sys_1.dice(6) + sys_1.dice(6) - 2)) {
                skip.power = 1;
                speed = +100;
            }
            if (skip.power) {
                let how = enemy.pc.skip || 'kiss', color = enemy.pc.color || lib_1.vt.white;
                let w = how.split(' ');
                if (w.length > 1)
                    w.push('');
                lib_1.vt.outln(lib_1.vt.faint, color, `${$.player.emulation == 'XT' ? '≫' : '>>'} `, lib_1.vt.normal, p2.You, lib_1.vt.bright, pc_1.PC.what(enemy, w[0]), w.slice(1).join(' '), lib_1.vt.normal, p1.you, lib_1.vt.faint, color, ` ${$.player.emulation == 'XT' ? '≪' : '<<'}`, speed - 500);
                next();
                return;
            }
        }
        if (rpc === $.online) {
            lib_1.vt.action('battle');
            lib_1.vt.form = {
                'attack': {
                    cb: () => {
                        lib_1.vt.outln();
                        if (/C/i.test(lib_1.vt.entry)) {
                            cast($.online, next, enemy);
                            return;
                        }
                        lib_1.vt.outln();
                        if (/R/i.test(lib_1.vt.entry)) {
                            if (/Merchant|Naval|Tavern|Taxman/.test($.from)) {
                                lib_1.vt.out('  ');
                                if ($.from == 'Merchant')
                                    lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.yellow, `"You should've accepted my kind offer, ${$.player.pc}."`);
                                if ($.from == 'Naval')
                                    lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.cyan, '"You cannot escape me, mortal."');
                                if ($.from == 'Tavern')
                                    lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.green, 'You try to escape, but the crowd throws you back to witness the slaughter!');
                                if ($.from == 'Taxman')
                                    lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.blue, '"You can never escape the taxman!"');
                                lib_1.vt.sound({ _BAR: 'growl', _DM: 'punk', _NEP: 'thunder', _OLD: 'crone', _TAX: 'thief2' }[enemy.user.id], 12);
                                pc_1.PC.adjust('cha', -2, -1);
                                pc_1.PC.save();
                                next();
                                return;
                            }
                            let trip = rpc.dex + sys_1.dice(rpc.int) / 2;
                            trip += Math.round((rpc.dex - enemy.dex) / 2);
                            trip = trip < 5 ? 5 : trip > 95 ? 95 : trip;
                            trip += 5 * (alive[0] - alive[1]);
                            trip = trip < 5 ? 5 : trip > 95 ? 95 : trip;
                            if (sys_1.dice(100) > trip) {
                                lib_1.vt.beep();
                                let who = (enemy.user.gender == 'I' ? 'The ' : '') + enemy.user.handle;
                                lib_1.vt.outln(lib_1.vt.cyan, [
                                    'You trip and fail in your attempt to retreat.',
                                    `${who} pulls you back into the battle.`,
                                    `${who} prevents your retreat and shouts,\n ${lib_1.vt.attr(lib_1.vt.cyan, lib_1.vt.bright, '"I\'m not through with you yet!"')}`,
                                    `${who} outmaneuvers you and says,\n ${lib_1.vt.attr(lib_1.vt.normal, '"You started this, I\'m finishing it."')}`,
                                    `${who} blocks your path and whispers,\n ${lib_1.vt.attr(lib_1.vt.faint, '"Where do you want to go today?"')}`,
                                ][sys_1.dice(5) - 1], '\n', -250);
                                next();
                                return;
                            }
                            Battle.retreat = true;
                            $.player.retreats++;
                            let who = $.player.gender == 'F' ? 'She' : 'He';
                            lib_1.vt.outln(lib_1.vt.blue, lib_1.vt.bright, [
                                'You are successful in your attempt to retreat.',
                                'You limp away from the battle.',
                                `You decide this isn't worth the effort.`,
                                `You listen to that voice in your head, ${lib_1.vt.attr(lib_1.vt.red)}"Run."`,
                                `You shout back, ${lib_1.vt.attr(lib_1.vt.cyan)}"${who} who fights and runs away lives to fight another day!"`
                            ][sys_1.dice(5) - 1], -250);
                            if ($.online.confused)
                                pc_1.PC.activate($.online, false, true);
                            if ($.from == 'Party' && $.player.gang) {
                                if (enemy.user.gender !== 'I')
                                    $.player.coward = true;
                                db.run(`UPDATE Gangs SET loss=loss+1 WHERE name='${$.player.gang}'`);
                            }
                            if ($.from == 'User' && enemy.user.gender !== 'I') {
                                pc_1.PC.adjust('cha', -2, -1);
                                lib_1.log(enemy.user.id, `\n${$.player.handle}, the coward, retreated from you.`);
                            }
                            end();
                            return;
                        }
                        if (/Y/i.test(lib_1.vt.entry)) {
                            yourstats(false);
                            volley += 500;
                            lib_1.vt.refocus();
                            return;
                        }
                        lib_1.vt.out(lib_1.vt.bright);
                        melee(rpc, enemy);
                        next();
                        return;
                    }, cancel: 'R', enter: 'A', eol: false, max: 1, match: /A|C|R|Y/i, timeout: 30
                },
                'backstab': {
                    cb: () => {
                        if (/N/i.test(lib_1.vt.entry))
                            bs = 1;
                        lib_1.vt.outln('\n');
                        lib_1.vt.out(lib_1.vt.bright);
                        melee(rpc, enemy, bs);
                        next();
                        return;
                    }, cancel: 'N', enter: 'Y', eol: false, match: /Y|N/i, max: 1, timeout: 30
                },
            };
            if (volley == 1) {
                lib_1.vt.drain();
                bs = $.player.backstab;
                let roll = sys_1.dice(100 + bs * $.player.level / (2 * ($.player.melee + 2)));
                roll += 2 * items_1.Ring.power(enemy.user.rings, $.player.rings, 'initiate').power;
                bs += (roll < bs) ? -1 : (roll > 99) ? +1 : 0;
                do {
                    roll = sys_1.dice(100 + bs * $.player.backstab);
                    bs += (roll == 1) ? -1 : (roll > 99) ? sys_1.dice($.player.backstab) : 0;
                } while (roll == 1 || roll > 99);
                if (bs > 1) {
                    lib_1.vt.action('yn');
                    lib_1.vt.form['backstab'].prompt = 'Attempt to backstab'
                        + (bs > 2 && bs != $.player.backstab ? ' for ' + lib_1.vt.attr(lib_1.vt.cyan, lib_1.vt.bright, bs.toString(), lib_1.vt.faint, 'x', lib_1.vt.normal) : '')
                        + ' (Y/N)? ';
                    player_1.input('backstab', $.online.dex > (70 - $.player.melee) || enemy.hp > $.player.hp ? 'y' : 'n', 300);
                    return;
                }
                else {
                    lib_1.vt.outln();
                    lib_1.vt.out(lib_1.vt.bright);
                }
                melee(rpc, enemy);
            }
            else {
                if ($.online.hp - 2 < 2 * $.player.level) {
                    lib_1.vt.sound('weak', 8);
                    lib_1.vt.drain();
                }
                let choices = lib_1.vt.attr(lib_1.vt.reset, lib_1.vt.blue, '[');
                choices += lib_1.vt.attr(lib_1.vt.bright, $.online.hp > $.player.hp * 2 / 3 ? lib_1.vt.green
                    : $.online.hp > $.player.hp / 3 ? lib_1.vt.yellow
                        : lib_1.vt.red, $.online.hp.toString(), lib_1.vt.normal, lib_1.vt.cyan, ',', lib_1.vt.bright, enemy.hp > enemy.user.hp * 2 / 3 ? lib_1.vt.green
                    : enemy.hp > enemy.user.hp / 3 ? lib_1.vt.yellow
                        : lib_1.vt.red);
                if ($.online.int < 100) {
                    let i = (100 - $.online.int) + 1;
                    let est = Math.round(enemy.hp / i);
                    est *= i;
                    if ($.online.int < 50 || est == 0)
                        choices += enemy.hp > enemy.user.hp * 2 / 3 ? 'Healthy'
                            : enemy.hp > enemy.user.hp / 3 ? 'Hurting'
                                : 'Weak';
                    else
                        choices += '~' + est.toString();
                }
                else
                    choices += enemy.hp.toString();
                choices += lib_1.vt.attr(lib_1.vt.normal, lib_1.vt.blue, '] ');
                bs = 1;
                lib_1.vt.form['attack'].prompt = choices;
                lib_1.vt.form['attack'].prompt += lib_1.vt.attr(lib_1.bracket('A', false), lib_1.vt.cyan, 'ttack, ');
                if ($.player.magic && $.player.spells.length)
                    lib_1.vt.form['attack'].prompt += lib_1.vt.attr(lib_1.bracket('C', false), lib_1.vt.cyan, 'ast spell, ');
                lib_1.vt.form['attack'].prompt += lib_1.vt.attr(lib_1.bracket('R', false), lib_1.vt.cyan, 'etreat, ', lib_1.bracket('Y', false), lib_1.vt.cyan, 'our status: ');
                if ($.access.bot) {
                    if ($.online.hp < sys_1.int($.player.hp / 9) + $.player.level && sys_1.dice($.player.melee / 2 + $.player.steal / 2) == 1)
                        npc_1.elemental.flush('r');
                    else
                        npc_1.elemental.flush('a');
                }
                player_1.input('attack');
                return;
            }
        }
        else {
            if (volley == 1 && sys_1.dice((100 - rpc.user.level) / 12 + 6) < rpc.user.poison)
                poison(rpc);
            let mm = 0;
            let odds = ($.from == 'Party' ? 6 : $.from == 'Dungeon' ? 5 : 4) - sys_1.int(+enemy.user.coward);
            let roll = odds + sys_1.int(rpc.user.magic / 2) + rpc.adept + 1;
            if (rpc.user.level > enemy.user.level)
                roll += Math.round((rpc.user.level - enemy.user.level) / 4);
            if (roll / odds > odds)
                roll = odds * odds;
            if (rpc.user.magic == 1 && sys_1.dice(roll) > odds) {
                if ((items_1.Magic.have(rpc.user.spells, 8)
                    && rpc.hp < rpc.user.hp / (rpc.user.level / (11 - rpc.adept) + 1)
                    && (sys_1.dice(6 - rpc.adept) == 1 || rpc.user.coward))
                    || (items_1.Ring.power(enemy.user.rings, rpc.user.rings, 'teleport', 'pc', rpc.user.pc).power
                        && rpc.hp < rpc.user.hp / 5))
                    mm = 8;
                else if (items_1.Magic.have(rpc.user.spells, 7)
                    && rpc.hp < sys_1.int(rpc.user.hp / 2)
                    && sys_1.dice(enemy.user.melee + 2) > 1)
                    mm = 7;
                else if (items_1.Magic.have(rpc.user.spells, 9)
                    && (!rpc.user.id || rpc.hp < sys_1.int(rpc.user.hp / 2))
                    && sys_1.dice(enemy.user.melee + 2) > 1)
                    mm = 9;
                else if (items_1.Magic.have(rpc.user.spells, 13)
                    && rpc.hp < (rpc.user.hp / 6)
                    && sys_1.dice((rpc.user.level - enemy.user.level) / 6 + odds - rpc.adept) == 1)
                    mm = 13;
                else if (!rpc.confused && rpc.hp > sys_1.int(rpc.user.hp / 2)) {
                    if (items_1.Magic.have(rpc.user.spells, 11)
                        && sys_1.dice(enemy.user.magic + rpc.adept) > 1)
                        mm = 11;
                    else if (items_1.Magic.have(rpc.user.spells, 12)
                        && sys_1.dice((rpc.user.level - enemy.user.level) / 6 + odds - rpc.adept) == 1)
                        mm = 12;
                    else if (items_1.Magic.have(rpc.user.spells, 14)
                        && sys_1.dice((rpc.user.level - enemy.user.level) / 6 + odds - rpc.adept) == 1)
                        mm = 14;
                    else if (items_1.Magic.have(rpc.user.spells, 15)
                        && sys_1.dice((rpc.user.level - enemy.user.level) / 6 + odds - rpc.adept) == 1)
                        mm = 15;
                    else if (items_1.Magic.have(rpc.user.spells, 16)
                        && rpc.hp == rpc.user.hp
                        && sys_1.dice((rpc.user.level - enemy.user.level) / 6 + odds - rpc.adept) == 1)
                        mm = 16;
                }
            }
            if (rpc.user.magic > 1 && sys_1.dice(roll) > odds) {
                if (!rpc.confused || rpc.hp < (rpc.user.hp / 6)) {
                    if (items_1.Magic.have(rpc.user.spells, 15)
                        && rpc.sp >= items_1.Magic.power(rpc, 15)
                        && sys_1.dice((rpc.user.level - enemy.user.level) / 6 + odds - rpc.adept) == 1)
                        mm = 15;
                    else if (items_1.Magic.have(rpc.user.spells, 16)
                        && rpc.sp >= items_1.Magic.power(rpc, 16)
                        && rpc.hp > sys_1.int(rpc.user.hp / 2)
                        && sys_1.dice((rpc.user.level - enemy.user.level) / 6 + odds - rpc.adept) == 1)
                        mm = 16;
                    else if (items_1.Magic.have(rpc.user.spells, 11)
                        && rpc.sp >= items_1.Magic.power(rpc, 11)
                        && sys_1.dice(6 - enemy.user.magic) == 1)
                        mm = 11;
                    else if (items_1.Magic.have(rpc.user.spells, 14)
                        && rpc.sp >= items_1.Magic.power(rpc, 14)
                        && sys_1.dice((rpc.user.level - enemy.user.level) / 6 + odds) == 1)
                        mm = 14;
                    else if (items_1.Magic.have(rpc.user.spells, 12)
                        && rpc.sp >= items_1.Magic.power(rpc, 12)
                        && sys_1.dice((rpc.user.level - enemy.user.level) / 6 + odds) == 1)
                        mm = 12;
                }
                if (!rpc.confused || !mm) {
                    if (items_1.Magic.have(rpc.user.spells, 13)
                        && rpc.sp >= items_1.Magic.power(rpc, 13)
                        && rpc.hp < (rpc.user.hp / 5))
                        mm = 13;
                    else if ((items_1.Magic.have(rpc.user.spells, 8)
                        && rpc.sp >= items_1.Magic.power(rpc, 8)
                        && rpc.hp < rpc.user.hp / (rpc.user.level / (11 - rpc.adept) + 1)
                        && (sys_1.dice(5 - rpc.adept) == 1 || rpc.user.coward))
                        || (items_1.Ring.power(enemy.user.rings, rpc.user.rings, 'teleport', 'pc', rpc.user.pc).power
                            && rpc.hp < rpc.user.hp / 4))
                        mm = 8;
                    else if (items_1.Magic.have(rpc.user.spells, 7)
                        && rpc.sp >= items_1.Magic.power(rpc, 7)
                        && rpc.hp < sys_1.int(rpc.user.hp / 2)
                        && (sys_1.dice(enemy.user.melee + 2) == 1 || rpc.sp < items_1.Magic.power(rpc, 8)))
                        mm = 7;
                    else if (!rpc.confused && items_1.Magic.have(rpc.user.spells, 9)
                        && rpc.sp >= items_1.Magic.power(rpc, 9)
                        && sys_1.dice(enemy.user.melee + 2) > 1)
                        mm = 9;
                }
            }
            if (rpc.user.magic && !mm && sys_1.dice(odds - rpc.adept) == 1) {
                odds = sys_1.dice(8) + 16;
                if (odds < 23 || volley < 5)
                    if (items_1.Magic.have(rpc.user.spells, odds)
                        && rpc.sp >= items_1.Magic.power(rpc, odds))
                        mm = odds;
            }
            lib_1.vt.out(lib_1.vt.reset);
            if (mm) {
                cast(rpc, next, enemy, mm);
                return;
            }
            else
                melee(rpc, enemy);
        }
        next();
        function next(retry = false) {
            if (retry) {
                attack(retry);
                return;
            }
            round.shift();
            if (typeof enemy !== 'undefined' && enemy.hp < 1) {
                if (enemy === $.online) {
                    enemy.hp = 0;
                    if ($.from !== 'Party') {
                        lib_1.vt.outln('\n', lib_1.vt.yellow, lib_1.vt.bright, rpc.user.gender == 'I' ? 'The ' : '', rpc.user.handle, ' killed you!');
                        lib_1.death($.reason || (rpc.user.id.length
                            ? `defeated by ${rpc.user.handle}`
                            : `defeated by a level ${rpc.user.level} ${rpc.user.handle}`), true);
                    }
                }
                else {
                    if (rpc === $.online) {
                        if (!Battle.expel) {
                            enemy.hp = 0;
                            $.player.kills++;
                            if ($.from !== 'Party') {
                                lib_1.vt.outln('You ', enemy.user.xplevel < 1 ? 'eliminated' : 'killed', enemy.user.gender == 'I' ? ' the ' : ' ', enemy.user.handle, '!\n');
                                if (enemy.user.id !== '' && enemy.user.id[0] !== '_') {
                                    lib_1.vt.sound('kill', 15);
                                    lib_1.vt.music($.player.gender == 'M' ? 'bitedust' : 'queen');
                                    lib_1.news(`\tdefeated ${enemy.user.handle}, a level ${enemy.user.xplevel} ${enemy.user.pc}`);
                                    lib_1.vt.wall($.player.handle, `defeated ${enemy.user.handle}`);
                                }
                            }
                            if ($.from == 'Monster' && enemy.user.xplevel > 0) {
                                lib_1.news(`\tdefeated a level ${enemy.user.xplevel} ${enemy.user.handle}`);
                                lib_1.vt.wall($.player.handle, `defeated a level ${enemy.user.level} ${enemy.user.handle}`);
                            }
                        }
                        if ($.from == 'Dungeon')
                            lib_1.vt.animated(['bounceOut', 'fadeOut', 'flipOutX', 'flipOutY', 'rollOut', 'rotateOut', 'zoomOut'][sys_1.dice(7) - 1]);
                    }
                }
            }
            alive = [];
            for (let p in parties) {
                alive.push(parties[p].length);
                for (let m in parties[p])
                    if (parties[p][m].hp < 1 || parties[p][m].user.xplevel < 0)
                        alive[p]--;
            }
            if (alive[0] && alive[1]) {
                attack();
                return;
            }
            spoils();
            end();
        }
    }
    Battle.attack = attack;
    function spoils() {
        let winner;
        let loser;
        let l;
        let w;
        if ($.online.confused)
            pc_1.PC.activate($.online, false, true);
        if ($.from == 'Gates')
            return;
        if (alive[0]) {
            winner = $.online;
            l = 1;
        }
        else {
            winner = parties[1][0];
            l = 0;
        }
        w = l ^ 1;
        winner.altered = true;
        for (let i in parties)
            for (let j = 0; j < parties[i].length; j++)
                if (parties[i][j].user.xplevel < 0)
                    parties[i].splice(j--, 1);
        if ($.from == 'Party') {
            db.run(`UPDATE Gangs SET win=win+1 WHERE name='${parties[w][0].user.gang}'`);
            db.run(`UPDATE Gangs SET loss=loss+1 WHERE name='${parties[l][0].user.gang}'`);
            let tl = [1, 1];
            let take = 0;
            let coin = new items_1.Coin(0);
            for (let m in parties[w]) {
                tl[w] += parties[w][m].user.xplevel;
                take += sys_1.money(parties[w][m].user.xplevel + 1);
            }
            for (let m in parties[l]) {
                if ((loser = parties[l][m]).hp == 0) {
                    tl[l] += loser.user.xplevel;
                    coin.value += loser.user.coin.value;
                    lib_1.log(loser.user.id, `\n${winner.user.gang} defeated ${loser.user.gang}, started by ${$.player.handle}`);
                    if (loser.user.coin.value)
                        lib_1.log(loser.user.id, `You lost ${loser.user.coin.amount} you were carrying.`);
                    loser.user.coin.value = 0;
                    pc_1.PC.save(loser);
                }
            }
            for (let m in parties[w]) {
                let cut = parties[w][m].hp > 0 ? 0.95 : 0.45;
                let max = sys_1.int(((4 + parties[w].length - parties[l].length) / 2) * 1250 * sys_1.money(parties[w][m].user.xplevel) * cut);
                let award = sys_1.int(coin.value * sys_1.money(parties[w][m].user.xplevel) / take * cut);
                award = award > coin.value ? coin.value : award;
                award = award < 1 ? 0 : award > max ? max : award;
                parties[w][m].user.coin.value += award;
                coin.value -= award;
                take -= sys_1.money(parties[w][m].user.xplevel);
                let xp = sys_1.int(pc_1.PC.experience(parties[w][m].user.xplevel)
                    * tl[l] / tl[w] / ((4 + parties[w].length - parties[l].length) / 2));
                if (parties[w][m] === $.online) {
                    lib_1.vt.outln(-200);
                    if (xp)
                        lib_1.vt.outln('You get ', pc_1.PC.expout(xp), -400);
                    if (award)
                        lib_1.vt.outln('You get your cut worth ', lib_1.carry(new items_1.Coin(award)), '.', 400);
                    $.player.xp += xp;
                }
                else {
                    lib_1.log(parties[w][m].user.id, `\n${winner.user.gang} defeated ${loser.user.gang}, started by ${$.player.handle}`);
                    lib_1.log(parties[w][m].user.id, `You got ${pc_1.PC.expout(xp, false)} and ${new items_1.Coin(award).carry()}.`);
                    parties[w][m].user.xp += xp;
                    pc_1.PC.save(parties[w][m]);
                }
            }
            coin.value = coin.value < 1 ? 0 : coin.value > 1e+13 ? 1e+13 : coin.value;
            if (coin.value) {
                lib_1.vt.outln();
                lib_1.vt.beep();
                db.run(`UPDATE Players set bank=bank+${coin.value} WHERE id='${$.taxman.user.id}'`);
                lib_1.vt.outln($.taxman.user.handle, ' took ', $.taxman.who.his, 'cut worth ', lib_1.carry(coin), '.', -600);
            }
            if (winner === $.online) {
                lib_1.news(`\tdefeated the gang, ${parties[l][0].user.gang}`);
                lib_1.vt.wall($.player.handle, `defeated the gang, ${parties[l][0].user.gang}`);
            }
            else if ($.online.hp == 0) {
                lib_1.death(`defeated by the gang, ${parties[w][0].user.gang}`);
                lib_1.vt.music();
                lib_1.vt.sound('effort', 15);
            }
            return;
        }
        if (l) {
            let xp = 0;
            let coin = new items_1.Coin(0);
            for (let m in parties[l]) {
                if ((loser = parties[l][m]).hp == 0) {
                    lib_1.log(loser.user.id, `\n${$.player.handle} killed you!`);
                    if (/Monster|User/.test($.from)) {
                        lib_1.vt.animated(loser.user.id ? 'hinge' : 'rotateOutDownRight');
                        loser.altered = true;
                        loser.user.status = winner.user.id;
                        let x = loser.user.id ? 2 : 3;
                        xp += pc_1.PC.experience(loser.user.xplevel, x);
                        if (winner.user.level < loser.user.xplevel)
                            loser.user.xplevel = winner.user.level;
                    }
                    else
                        xp += pc_1.PC.experience(loser.user.xplevel, 18 - (1.333 * loser.user.immortal));
                    if (loser.user.sex !== 'I' && loser.user.rings.length) {
                        lib_1.vt.out('You start by removing ', loser.user.rings.length > 1 ? 'all of ' : '', loser.who.his, 'rings...');
                        lib_1.vt.sound('click', 8);
                        loser.user.rings.forEach(ring => {
                            if (items_1.Ring.wear(winner.user.rings, ring)) {
                                lib_1.getRing(['fondle', 'polish', 'slip on', 'wear', 'win'][sys_1.dice(5) - 1], ring);
                                pc_1.PC.saveRing(ring, winner.user.id);
                                lib_1.vt.sound('click', 8);
                                lib_1.log(loser.user.id, `... took your ${ring} ring.`);
                            }
                        });
                        loser.user.rings = [];
                        loser.altered = true;
                        lib_1.vt.outln();
                    }
                    if (loser.user.coin.value) {
                        coin.value += loser.user.coin.value;
                        loser.user.coin.value = 0;
                        loser.altered = true;
                    }
                    if ($.from !== 'User') {
                        let credit = new items_1.Coin(loser.weapon.value);
                        credit.value = lib_1.tradein(credit.value, winner.cha);
                        let result = items_1.Weapon.swap(winner, loser, credit);
                        if (typeof result == 'boolean' && result)
                            lib_1.vt.outln(winner.who.He, pc_1.PC.what(winner, 'take'), loser.who.his, winner.user.weapon, '.');
                        else if ($.from == 'Monster' && result)
                            lib_1.vt.outln(winner.who.He, pc_1.PC.what(winner, 'get'), credit.carry(), ' for ', loser.who.his, loser.user.weapon, '.');
                        credit = new items_1.Coin(loser.armor.value);
                        credit.value = lib_1.tradein(credit.value, winner.cha);
                        result = items_1.Armor.swap(winner, loser, credit);
                        if (typeof result == 'boolean' && result) {
                            lib_1.vt.outln(winner.who.He, 'also ', pc_1.PC.what(winner, 'take'), loser.who.his, winner.user.armor, '.');
                            if (/_DM|_NEP|_OLD|_TAX/.test(loser.user.id))
                                lib_1.vt.sound('shield', 16);
                        }
                        else if ($.from == 'Monster' && result)
                            lib_1.vt.outln(winner.who.He, 'also ', pc_1.PC.what(winner, 'get'), credit.carry(), ' for ', loser.who.his, loser.user.armor, '.');
                    }
                    else {
                        if (items_1.Weapon.swap(winner, loser)) {
                            lib_1.vt.outln(winner.who.He, pc_1.PC.what(winner, 'take'), loser.who.his, winner.user.weapon, '.', -250);
                            lib_1.log(loser.user.id, `... and took your ${winner.user.weapon}.`);
                        }
                        if (items_1.Armor.swap(winner, loser)) {
                            lib_1.vt.outln(winner.who.He, 'also ', pc_1.PC.what(winner, 'take'), loser.who.his, winner.user.armor, '.', -250);
                            lib_1.log(loser.user.id, `... and took your ${winner.user.armor}.`);
                        }
                        if (winner.user.cursed) {
                            winner.user.cursed = '';
                            pc_1.PC.adjust('str', 10, 0, 0, winner);
                            pc_1.PC.adjust('int', 10, 0, 0, winner);
                            pc_1.PC.adjust('dex', 10, 0, 0, winner);
                            pc_1.PC.adjust('cha', 10, 0, 0, winner);
                            loser.user.cursed = winner.user.id;
                            loser.altered = true;
                            lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.black, 'A dark cloud has lifted and shifted.', -600);
                            lib_1.log(loser.user.id, `... and left you with a dark cloud.`);
                        }
                        if (loser.user.blessed) {
                            loser.user.blessed = '';
                            loser.altered = true;
                            if (winner.user.coward)
                                winner.user.coward = false;
                            else {
                                winner.user.blessed = loser.user.id;
                                pc_1.PC.adjust('str', 10, 0, 0, winner);
                                pc_1.PC.adjust('int', 10, 0, 0, winner);
                                pc_1.PC.adjust('dex', 10, 0, 0, winner);
                                pc_1.PC.adjust('cha', 10, 0, 0, winner);
                                lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.yellow, 'A shining aura ', lib_1.vt.normal, 'surrounds you.', -600);
                            }
                            lib_1.log(loser.user.id, `... and took your blessedness.`);
                        }
                        if (loser.user.gang && loser.user.gang == $.player.gang) {
                            gang = pc_1.PC.loadGang(db.query(`SELECT * FROM Gangs WHERE name='${$.player.gang}'`)[0], $.player.id);
                            let n = gang.members.indexOf(loser.user.id);
                            if (n == 0) {
                                n = gang.members.indexOf($.player.id);
                                gang.members[0] = $.player.id;
                                gang.members[n] = loser.user.id;
                                pc_1.PC.saveGang(gang);
                                lib_1.vt.outln(`You take over as the leader of ${gang.name}.`, -600);
                            }
                            else {
                                $.player.maxcha--;
                                $.player.cha--;
                            }
                        }
                        if (loser.user.bounty.value) {
                            lib_1.vt.outln(`You get the ${loser.user.bounty.carry()} bounty posted by ${loser.user.who}, too.`);
                            lib_1.log(loser.user.id, `... and got paid the bounty posted by ${loser.user.who}.`);
                            winner.user.coin.value += loser.user.bounty.value;
                            loser.user.bounty.value = 0;
                            loser.user.who = '';
                        }
                        lib_1.vt.out(600);
                    }
                }
            }
            if (xp) {
                lib_1.vt.outln('You get', parties[l].length > 1 ? ' a total of ' : ' ', pc_1.PC.expout(xp, winner === $.online), -100);
                winner.user.xp += xp;
            }
            if (coin.value) {
                lib_1.vt.outln(-100, 'You get', parties[l].length > 1 ? ' a total of ' : ' ', coin.carry(), ' ', parties[l].length > 1 ? 'they were ' : loser.who.he + 'was ', 'carrying.');
                winner.user.coin.value += coin.value;
            }
        }
        else {
            if ($.player.coin.value) {
                winner.user.coin.value += $.player.coin.value;
                lib_1.vt.outln(lib_1.vt.reset, winner.who.He, 'gets ', $.player.coin.carry(), ' you were carrying.\n');
                $.player.coin.value = 0;
            }
            lib_1.vt.sleep(600);
            if (winner.user.cursed) {
                if ($.player.blessed) {
                    $.player.blessed = '';
                    lib_1.vt.out(lib_1.vt.yellow, lib_1.vt.bright, 'Your shining aura ', lib_1.vt.normal, 'leaves');
                }
                else {
                    $.player.coward = false;
                    $.player.cursed = winner.user.id;
                    winner.user.cursed = '';
                    lib_1.vt.out(lib_1.vt.faint, 'A dark cloud hovers over', lib_1.vt.reset);
                }
                lib_1.vt.outln(lib_1.vt.faint, ' you.\n', -600);
            }
            if (winner.user.id && winner.user.id[0] !== '_') {
                $.player.coward = true;
                pc_1.PC.save();
                lib_1.log(winner.user.id, `\nYou killed ${$.player.handle}!`);
                winner.user.xp += pc_1.PC.experience($.player.xplevel, 2);
                if ($.player.blessed) {
                    winner.user.blessed = $.player.id;
                    $.player.blessed = '';
                    lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.yellow, 'Your shining aura ', lib_1.vt.normal, 'leaves ', lib_1.vt.faint, 'you.\n', -600);
                }
                if (items_1.Weapon.swap(winner, $.online)) {
                    lib_1.vt.outln(winner.who.He, pc_1.PC.what(winner, 'take'), $.online.who.his, winner.user.weapon, '.');
                    lib_1.log(winner.user.id, `You upgraded to ${winner.user.weapon}.`);
                }
                if (items_1.Armor.swap(winner, $.online)) {
                    lib_1.vt.outln(winner.who.He, 'also ', pc_1.PC.what(winner, 'take'), $.online.who.his, winner.user.armor, '.');
                    lib_1.log(winner.user.id, `You upgraded to ${winner.user.armor}.`);
                }
                if ($.player.rings.length) {
                    lib_1.vt.outln(winner.who.He, 'also ', pc_1.PC.what(winner, 'remove'), $.player.rings.length > 1 ? 'all of ' : '', $.online.who.his, 'rings...');
                    $.player.rings.forEach(ring => {
                        lib_1.vt.out(' ', lib_1.bracket(ring, false), ' ');
                        lib_1.vt.sound('click');
                        if (items_1.Ring.wear(winner.user.rings, ring))
                            pc_1.PC.saveRing(ring, winner.user.id);
                    });
                    $.player.rings = [];
                    lib_1.vt.outln();
                    lib_1.log(winner.user.id, `... and there were rings, too!`);
                }
                if (winner.user.gang && winner.user.gang == $.player.gang) {
                    pc_1.PC.adjust('cha', -1, -1, -1);
                    lib_1.vt.music('punk');
                    gang = pc_1.PC.loadGang(db.query(`SELECT * FROM Gangs WHERE name='${$.player.gang}'`)[0], $.player.id);
                    let n = gang.members.indexOf(winner.user.id);
                    if (n == 0) {
                        lib_1.vt.outln(lib_1.vt.cyan, winner.who.He, 'says, ', lib_1.vt.white, '"Let that be a lesson to you punk!"', -800);
                    }
                    if (gang.members[0] == $.player.id) {
                        pc_1.PC.adjust('cha', -1, -1, -1);
                        gang.members[0] = winner.user.id;
                        gang.members[n] = $.player.id;
                        pc_1.PC.saveGang(gang);
                        lib_1.vt.outln(winner.who.He, `takes over as the leader of ${gang.name}.\n`, -600);
                    }
                }
                pc_1.PC.save(winner);
                $.player.coward = false;
            }
        }
        $.online.altered = true;
    }
    Battle.spoils = spoils;
    function brawl(rpc, nme, vs = false) {
        const p1 = pc_1.PC.who(rpc, vs), p2 = pc_1.PC.who(nme, vs);
        if (sys_1.dice(100) >= (50 + sys_1.int(rpc.dex / 2))) {
            lib_1.vt.sound(rpc.user.id == $.player.id ? 'whoosh' : 'swoosh');
            lib_1.vt.outln(`\n${p2.He}${pc_1.PC.what(nme, 'duck')}${p1.his}punch.`, -400);
            let patron = pc_1.PC.encounter();
            if (patron.user.id && patron.user.id !== rpc.user.id && patron.user.id !== nme.user.id && !patron.user.status) {
                lib_1.vt.outln(`\n${p1.He}${pc_1.PC.what(rpc, 'hit')}${patron.user.handle}!`);
                lib_1.vt.sound('duck', 8);
                let bp = punch(rpc);
                patron.bp -= bp;
                if (patron.bp > 0) {
                    lib_1.vt.out('\nUh oh! ', -600);
                    lib_1.vt.outln(` Here comes ${patron.user.handle}!`, -600);
                    brawl(patron, rpc, true);
                }
                else
                    knockout(rpc, patron);
            }
        }
        else {
            let bp = punch(rpc);
            lib_1.vt.outln(`\n${p1.He}${pc_1.PC.what(rpc, 'punch')}${p2.him}for ${bp} points.`);
            nme.bp -= bp;
            if (nme.bp < 1)
                knockout(rpc, nme);
        }
        function knockout(winner, loser) {
            let xp = pc_1.PC.experience(loser.user.level, 9);
            db.run(`UPDATE Players SET tw=tw+1,xp=xp+${xp},coin=coin+${loser.user.coin.value} WHERE id='${winner.user.id}'`);
            db.run(`UPDATE Players SET tl=tl+1,coin=0 WHERE id='${loser.user.id}'`);
            lib_1.vt.outln('\n', winner.user.id == $.player.id ? 'You' : winner.user.handle, ` ${pc_1.PC.what(winner, 'knock')}${loser.who.him}out!`, -600);
            if (xp) {
                lib_1.vt.outln(`\n${winner.who.He}${pc_1.PC.what(winner, 'get')}`, pc_1.PC.expout(xp, winner.user.id == $.player.id), -600);
                winner.user.xp += xp;
            }
            if (loser.user.coin.value) {
                lib_1.vt.outln(`${loser.who.He}was carrying ${loser.user.coin.carry()}`, -600);
                winner.user.coin.value += loser.user.coin.value;
                loser.user.coin.value = 0;
            }
            winner.user.tw++;
            loser.user.tl++;
            if (loser.user.id == $.player.id) {
                lib_1.vt.sound('ko');
                let m = Math.abs($.online.bp);
                while (m > 9)
                    m >>= 1;
                m++;
                let wtf = m > 5 ? 'f eht tahw' : 'z.Z.z';
                lib_1.vt.sessionAllowed = sys_1.whole(lib_1.vt.sessionAllowed - 60 * m) + 60;
                lib_1.vt.out(`\nYou are unconscious for ${m} minute`, m !== 1 ? 's' : '', '...', -600, lib_1.vt.faint);
                for (let i = 0; i < m; i++)
                    lib_1.vt.out(wtf[wtf.length - i - 1], -250);
                lib_1.vt.outln(lib_1.vt.normal, '...');
                lib_1.news(`\tgot knocked out by ${winner.user.handle}`);
            }
            else
                lib_1.log(loser.user.id, `\n${winner.user.handle} knocked you out.`);
        }
        function punch(p) {
            lib_1.vt.sound('punch' + sys_1.dice(3));
            let punch = sys_1.int((p.user.level + p.str / 10) / 2);
            punch += sys_1.dice(punch);
            return punch;
        }
    }
    Battle.brawl = brawl;
    function cast(rpc, gb, nme, magic, DL) {
        let tricks = Object.assign([], rpc.user.spells);
        let Summons = ['Teleport', 'Resurrect'];
        Object.assign([], Summons).forEach(summon => {
            let i = Summons.indexOf(summon);
            if (items_1.Ring.power(nme ? nme.user.rings : [], rpc.user.rings, summon.toLowerCase(), "pc", rpc.user.pc).power
                || rpc.user.pc == pc_1.PC.winning || $.access.sysop)
                items_1.Magic.add(tricks, summon);
            else
                Summons.splice(i, 1);
        });
        if (!tricks.length) {
            if (rpc === $.online) {
                lib_1.vt.outln(`\nYou don't have any magic.`);
                gb(true);
            }
            else {
                lib_1.vt.out('cast() failure :: ', `${rpc.user.level} ${rpc.user.pc} ${rpc.user.handle} ${rpc.user.magic} ${rpc.sp} ${rpc.user.spells}`);
                gb();
            }
            return;
        }
        if (rpc === $.online) {
            p1 = pc_1.PC.who(rpc);
            lib_1.vt.action('list');
            lib_1.vt.form = {
                'magic': {
                    cb: () => {
                        lib_1.vt.outln();
                        const n = sys_1.whole(lib_1.vt.entry);
                        if (lib_1.vt.entry !== '?' && !n) {
                            gb(true);
                            return;
                        }
                        if (!items_1.Magic.have(tricks, n)) {
                            for (let i in tricks) {
                                const p = tricks[i];
                                const spell = Object.keys(items_1.Magic.spells)[p - 1];
                                if (rpc.user.magic < 2)
                                    lib_1.vt.out(lib_1.bracket(p), sys_1.sprintf('%-18s  (%d%%)', spell, items_1.Magic.ability(spell, rpc, nme).fail));
                                else
                                    lib_1.vt.out(lib_1.bracket(p), sys_1.sprintf('%-18s  %4d  (%d%%)', spell, Summons.includes(spell) ? 0
                                        : rpc.user.magic < 4 ? items_1.Magic.spells[spell].mana
                                            : items_1.Magic.spells[spell].enchanted, items_1.Magic.ability(spell, rpc, nme).fail));
                            }
                            lib_1.vt.outln();
                            lib_1.vt.refocus();
                        }
                        else {
                            lib_1.vt.outln();
                            const spell = Object.keys(items_1.Magic.spells)[n - 1];
                            invoke(spell, Summons.includes(spell));
                        }
                    }, prompt: ['Try wand', 'Use wand', 'Read scroll', 'Cast spell', 'Uti magicae'][$.player.magic] + ' (?=list): ', max: 2
                }
            };
            lib_1.vt.focus = 'magic';
            return;
        }
        else {
            let spell = Object.keys(items_1.Magic.spells)[magic - 1];
            invoke(spell, Summons.includes(spell));
        }
        function invoke(name, summon) {
            const Caster = p1.You;
            const caster = p1.you;
            let Recipient = '';
            let recipient = '';
            let spell = items_1.Magic.spells[name];
            if (rpc.user.id !== $.player.id)
                lib_1.vt.sleep(150);
            if (rpc.user.magic > 1 && !summon)
                if (rpc.sp < items_1.Magic.power(rpc, spell.cast)) {
                    if (rpc === $.online)
                        lib_1.vt.outln(`You don't have enough power to cast that spell!`);
                    gb(!rpc.confused);
                    return;
                }
            if (nme) {
                if ([1, 2, 3, 4, 5, 6, 10].indexOf(spell.cast) >= 0) {
                    if (rpc === $.online)
                        lib_1.vt.outln('You cannot cast that spell during a battle!');
                    gb(!rpc.confused);
                    return;
                }
                if (nme.user.novice && [12, 15, 16, 20, 21, 22].indexOf(spell.cast) >= 0) {
                    if (rpc === $.online)
                        lib_1.vt.outln('You cannot cast that spell on a novice player.');
                    gb(!rpc.confused);
                    return;
                }
                if (/Merchant|Naval|Tavern|Taxman/.test($.from) && [8, 12, 17, 18, 22].indexOf(spell.cast) >= 0) {
                    if (spell.cast == 8 && rpc === $.online) {
                        lib_1.vt.outln('You cannot cast that spell to retreat!');
                        gb(!rpc.confused);
                        return;
                    }
                    if (spell.cast > 8) {
                        if (rpc === $.online) {
                            lib_1.vt.sound('oops', 4);
                            lib_1.vt.outln('You are too frantic to cast that spell!');
                        }
                        gb(!rpc.confused);
                        return;
                    }
                }
                Recipient = p2.You;
                recipient = p2.you;
            }
            else {
                if ([9, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22].indexOf(spell.cast) >= 0) {
                    if (rpc === $.online)
                        lib_1.vt.outln('You cannot cast that spell on yourself!');
                    gb(!rpc.confused);
                    return;
                }
            }
            if (rpc.sp > 0) {
                let mana = summon ? 0 : rpc.user.magic < 4 ? spell.mana : spell.enchanted;
                rpc.sp -= mana;
                if (nme) {
                    const spent = items_1.Ring.power(rpc.user.rings, nme.user.rings, 'sp', 'pc', nme.user.pc).power;
                    if (mana = spent * sys_1.dice(mana / 6) * sys_1.dice(nme.user.magic)) {
                        if (nme.user.sp > 0 && nme.sp + mana > nme.user.sp) {
                            mana = nme.user.sp - nme.sp;
                            if (mana < 0)
                                mana = 0;
                        }
                        if (mana) {
                            if (nme.sp > 0) {
                                nme.sp += mana;
                                lib_1.vt.outln(Recipient, pc_1.PC.what(nme, 'absorb'), lib_1.vt.bright, lib_1.vt.cyan, mana.toString(), lib_1.vt.normal, ' mana ', lib_1.vt.reset, 'spent off ', p1.his, 'spell.');
                            }
                            else {
                                rpc.sp -= mana;
                                if (rpc.sp < 0)
                                    rpc.sp = 0;
                                lib_1.vt.outln(Recipient, pc_1.PC.what(nme, 'drain'), 'an extra ', lib_1.vt.bright, lib_1.vt.cyan, mana.toString(), lib_1.vt.normal, ' mana ', lib_1.vt.reset, 'from ', p1.his, 'spell.');
                            }
                            lib_1.vt.sound('mana', 8);
                        }
                    }
                }
            }
            if (!summon && rpc.user.magic < 2 && sys_1.dice(100) < (50 + 2 * spell.cast - 16 * +(spell.cast > 16))) {
                rpc.altered = true;
                items_1.Magic.remove(rpc.user.spells, spell.cast);
                if (!(rpc.user.id[0] == '_' || rpc.user.gender == 'I'))
                    pc_1.PC.save(rpc);
                lib_1.vt.outln(p1.His, 'wand smokes as ', p1.he, pc_1.PC.what(rpc, 'cast'), 'the spell ... ', -33 * spell.cast);
            }
            if (!summon && rpc.user.magic == 2 && sys_1.dice(sys_1.int($.access.sysop) + 5) == 1) {
                rpc.altered = true;
                items_1.Magic.remove(rpc.user.spells, spell.cast);
                if (!(rpc.user.id[0] == '_' || rpc.user.gender == 'I'))
                    pc_1.PC.save(rpc);
                lib_1.vt.outln(p1.His, 'scroll burns as ', p1.he, pc_1.PC.what(rpc, 'cast'), 'the spell ... ', -44 * spell.cast);
            }
            if (nme) {
                let mod = items_1.Ring.power([], nme.user.rings, 'resist', 'spell', name);
                if (mod.power) {
                    if (!items_1.Ring.have(rpc.user.rings, items_1.Ring.theOne)) {
                        lib_1.vt.outln(lib_1.vt.faint, '>> ', lib_1.vt.normal, p1.His, lib_1.vt.bright, lib_1.vt.magenta, name, lib_1.vt.normal, ' spell ', -300, lib_1.vt.reset, 'attempt is ineffective against', -200);
                        lib_1.vt.out('   ', p2.his, lib_1.vt.bright, lib_1.vt.cyan, mod.name, lib_1.vt.normal, -100);
                        if ($.player.emulation == 'XT' && nme.user.sex !== 'I')
                            lib_1.vt.out(' ', items_1.Ring.name[mod.name].emoji, ' 💍');
                        lib_1.vt.outln(nme.user.sex == 'I' ? ' power' : ' ring', lib_1.vt.reset, '!', lib_1.vt.faint, ' <<');
                        gb();
                        return;
                    }
                    else {
                        lib_1.vt.out(lib_1.vt.magenta, lib_1.vt.faint, '>> ', lib_1.vt.normal, p1.His, lib_1.vt.bright, items_1.Ring.theOne, lib_1.vt.normal, ' ring ', -300, 'dispels ', p2.his, lib_1.vt.bright, lib_1.vt.cyan, mod.name, lib_1.vt.normal, -200);
                        if ($.player.emulation == 'XT')
                            lib_1.vt.out(' ', items_1.Ring.name[mod.name].emoji, ' 💍');
                        lib_1.vt.outln(' ring', lib_1.vt.magenta, '!', lib_1.vt.faint, ' <<', -100);
                    }
                }
            }
            let backfire = false;
            if (sys_1.dice(100) > items_1.Magic.ability(name, rpc, nme).fail) {
                if ((backfire = sys_1.dice(100) > items_1.Magic.ability(name, rpc, nme).backfire)) {
                    lib_1.vt.outln('Oops!  ', p1.His, ['try', 'wand', 'scroll', 'spell', 'magic'][rpc.user.magic], ' backfires!');
                    lib_1.vt.sound('oops', 4);
                }
                else {
                    lib_1.vt.outln('Fssst!  ', p1.His, 'attempt fails!');
                    lib_1.vt.sound('fssst', 4);
                    gb();
                    return;
                }
            }
            if (spell.cast < 17 && round.length > 1 && round[0].party)
                if (alive[1] > 1)
                    lib_1.vt.out(lib_1.vt.faint, lib_1.vt.Empty, lib_1.vt.normal, ' ');
            switch (spell.cast) {
                case 1:
                    if (backfire) {
                        pc_1.PC.adjust('str', -sys_1.dice(10));
                        lib_1.vt.outln(`You feel weaker (${rpc.str})`);
                    }
                    else {
                        pc_1.PC.adjust('str', sys_1.dice(10));
                        if (rpc.str < rpc.user.maxstr)
                            lib_1.vt.outln(`You feel much stronger (${rpc.str})`);
                        else
                            lib_1.vt.outln(`This game prohibits the use of steroids.`);
                    }
                    break;
                case 2:
                    if (backfire) {
                        pc_1.PC.adjust('int', -sys_1.dice(10));
                        lib_1.vt.outln(`You feel stupid (${rpc.int})`);
                    }
                    else {
                        pc_1.PC.adjust('int', sys_1.dice(10));
                        if (rpc.int < rpc.user.maxint)
                            lib_1.vt.outln(`You feel much more intelligent (${rpc.int})`);
                        else
                            lib_1.vt.outln(`Get on with it, professor!`);
                    }
                    break;
                case 3:
                    if (backfire) {
                        pc_1.PC.adjust('dex', -sys_1.dice(10));
                        lib_1.vt.outln(`You feel clumsy (${rpc.dex})`);
                    }
                    else {
                        pc_1.PC.adjust('dex', sys_1.dice(10));
                        if (rpc.dex < rpc.user.maxdex)
                            lib_1.vt.outln(`You feel much more agile (${rpc.dex})`);
                        else
                            lib_1.vt.outln(`Y'all shakin' and bakin'.`);
                    }
                    break;
                case 4:
                    if (backfire) {
                        pc_1.PC.adjust('cha', -sys_1.dice(10));
                        lib_1.vt.outln(`You feel depressed (${rpc.cha})`);
                    }
                    else {
                        pc_1.PC.adjust('cha', sys_1.dice(10));
                        if (rpc.cha < rpc.user.maxcha)
                            lib_1.vt.outln(`You feel much more charismatic (${rpc.cha})`);
                        else
                            lib_1.vt.outln(`Stop being so vain.`);
                    }
                    break;
                case 5:
                    if (backfire) {
                        if (rpc.user.magic > 2 && rpc.user.toAC > 0)
                            rpc.user.toAC--;
                        rpc.toAC--;
                        lib_1.vt.outln(p1.His, isNaN(+rpc.user.armor) ? lib_1.armor(rpc) : 'defense', ' loses some of its effectiveness');
                    }
                    else {
                        lib_1.vt.sound('shield');
                        if (rpc.user.magic > 2 && rpc.user.toAC >= 0)
                            rpc.user.toAC++;
                        rpc.toAC++;
                        lib_1.vt.outln('A magical field shimmers around ', isNaN(+rpc.user.armor) ? p1.his + lib_1.armor(rpc) : p1.him);
                    }
                    if (-rpc.user.toAC >= rpc.armor.ac || -(rpc.user.toAC + rpc.toAC) >= rpc.armor.ac) {
                        lib_1.vt.outln(p1.His, isNaN(+rpc.user.armor) ? rpc.user.armor : 'defense', ' crumbles!');
                        items_1.Armor.equip(rpc, items_1.Armor.merchant[0]);
                    }
                    if (sys_1.dice(3 * (rpc.user.toAC + rpc.toAC + 1) / rpc.user.magic) > rpc.armor.ac) {
                        lib_1.vt.outln(p1.His, isNaN(+rpc.user.armor) ? rpc.user.armor : 'defense', ' vaporizes!');
                        items_1.Armor.equip(rpc, items_1.Armor.merchant[0]);
                        if (rpc === $.online)
                            lib_1.vt.sound('crack', 6);
                    }
                    rpc.altered = true;
                    break;
                case 6:
                    if (backfire) {
                        if (rpc.user.magic > 2 && rpc.user.toWC > 0)
                            rpc.user.toWC--;
                        rpc.toWC--;
                        lib_1.vt.outln(p1.His, isNaN(+rpc.user.weapon) ? lib_1.weapon(rpc) : 'attack', ' loses some of its effectiveness');
                    }
                    else {
                        lib_1.vt.sound('hone');
                        if (rpc.user.magic > 2 && rpc.user.toWC >= 0)
                            rpc.user.toWC++;
                        rpc.toWC++;
                        lib_1.vt.outln(p1.His, isNaN(+rpc.user.weapon) ? lib_1.weapon(rpc) : 'attack', ' glows with magical sharpness');
                    }
                    if (-rpc.user.toWC >= rpc.weapon.wc || -(rpc.user.toWC + rpc.toWC) >= rpc.weapon.wc) {
                        lib_1.vt.outln(p1.His, rpc.user.weapon ? rpc.user.weapon : 'attack', ' crumbles!');
                        items_1.Weapon.equip(rpc, items_1.Weapon.merchant[0]);
                    }
                    if (sys_1.dice(3 * (rpc.user.toWC + rpc.toWC + 1) / rpc.user.magic) > rpc.weapon.wc) {
                        lib_1.vt.outln(p1.His, rpc.user.weapon ? rpc.user.weapon : 'attack', ' vaporizes!');
                        items_1.Weapon.equip(rpc, items_1.Weapon.merchant[0]);
                        if (rpc === $.online)
                            lib_1.vt.sound('crack', 6);
                    }
                    rpc.altered = true;
                    break;
                case 7:
                    let ha = 10 + rpc.user.heal + sys_1.int(rpc.user.level / (20 - rpc.user.magic));
                    let hr = 0;
                    for (let i = 0; i < rpc.user.level; i++)
                        hr += sys_1.dice(ha);
                    if (backfire) {
                        lib_1.vt.sound('hurt', 3);
                        rpc.hp -= hr;
                        lib_1.vt.outln(Caster, pc_1.PC.what(rpc, 'hurt'), p1.self, 'for ', hr.toString(), ' hit points!');
                        if (rpc.hp < 1) {
                            lib_1.vt.outln();
                            rpc.hp = 0;
                            if (rpc === $.online)
                                $.reason = 'heal backfired';
                        }
                    }
                    else {
                        lib_1.vt.sound('heal', 3);
                        rpc.hp += hr;
                        if (rpc.hp > rpc.user.hp)
                            rpc.hp = rpc.user.hp;
                        lib_1.vt.outln(Caster, pc_1.PC.what(rpc, 'heal'), p1.self, 'for ', hr.toString(), ' hit points.');
                    }
                    break;
                case 8:
                    if (nme) {
                        lib_1.vt.sound('teleport');
                        lib_1.vt.out(lib_1.vt.bright, lib_1.vt.magenta);
                        if (backfire) {
                            lib_1.vt.out(Caster, pc_1.PC.what(rpc, 'teleport'), recipient, ' ');
                            if (nme !== $.online)
                                nme.hp = -nme.hp;
                            else {
                                Battle.teleported = true;
                                Battle.retreat = true;
                            }
                        }
                        else {
                            lib_1.vt.out(Caster, pc_1.PC.what(rpc, 'teleport'));
                            if (rpc === $.online) {
                                Battle.teleported = true;
                                Battle.retreat = true;
                                rpc.user.retreats++;
                            }
                            else {
                                rpc.hp = -1;
                                lib_1.vt.animated('zoomOutUp');
                            }
                        }
                        lib_1.vt.outln(-600, lib_1.vt.normal, 'away from ', -400, lib_1.vt.faint, 'the battle!', -200);
                        if (sys_1.dice(100) == 1)
                            lib_1.vt.outln(lib_1.vt.lred, `Nearby is the Crown's Champion shaking his head and texting his Grace.`, -2000);
                    }
                    else {
                        if (rpc === $.online) {
                            lib_1.vt.sessionAllowed = sys_1.whole(lib_1.vt.sessionAllowed - 60) + 3 * $.dungeon + 1;
                            Battle.teleported = true;
                        }
                        else
                            rpc.hp = -1;
                    }
                    Battle.expel = backfire;
                    break;
                case 9:
                    lib_1.vt.sound('blast', 3);
                    let ba = 10 + rpc.user.blast
                        + sys_1.int(rpc.user.level / (20 - rpc.user.magic))
                        - (backfire
                            ? sys_1.int(sys_1.whole(rpc.armor.ac + rpc.user.toAC + rpc.toWC) / 5)
                            : sys_1.int(sys_1.whole(nme.armor.ac + nme.user.toAC + nme.toWC) / 5));
                    if (nme.user.melee > 3)
                        ba *= sys_1.int(nme.user.melee / 2);
                    let br = sys_1.int(rpc.int / 10);
                    while (sys_1.dice(99 + rpc.user.magic) > 99) {
                        ba += sys_1.dice(rpc.user.magic);
                        for (let i = 0; i < ba; i++)
                            br += sys_1.dice(ba);
                    }
                    for (let i = 0; i < rpc.user.level; i++)
                        br += sys_1.dice(ba);
                    if (backfire) {
                        lib_1.vt.outln(Caster, pc_1.PC.what(rpc, 'blast'), p1.self, `for ${br} hit points!`);
                        rpc.hp -= br;
                        if (rpc.hp < 1) {
                            lib_1.vt.outln();
                            rpc.hp = 0;
                            if (rpc === $.online)
                                $.reason = 'blast backfired';
                        }
                    }
                    else {
                        if (rpc === $.online && !$.player.novice) {
                            let deed = $.mydeeds.find((x) => { return x.deed == 'blast'; });
                            if (!deed)
                                deed = $.mydeeds[$.mydeeds.push(pc_1.Deed.load($.player.pc, 'blast')[0]) - 1];
                            if (deed && br > deed.value) {
                                deed.value = br;
                                pc_1.Deed.save(deed, $.player);
                                lib_1.vt.out(lib_1.vt.yellow, '+', lib_1.vt.white);
                            }
                        }
                        lib_1.vt.out(Caster, pc_1.PC.what(rpc, 'blast'), recipient, ` for ${br} hit points!`);
                        nme.hp -= br;
                        if (nme.hp < 1) {
                            nme.hp = 0;
                            if ($.from == 'Party' || nme !== $.online) {
                                lib_1.vt.out(' ', lib_1.bracket('RIP', false), ' ');
                                lib_1.vt.beep();
                            }
                            else {
                                $.reason = rpc.user.id.length
                                    ? `fatal blast by ${rpc.user.handle}`
                                    : `fatal blast by a level ${rpc.user.level} ${rpc.user.handle}`;
                            }
                        }
                        lib_1.vt.outln();
                    }
                    break;
                case 10:
                    if (backfire) {
                        lib_1.vt.music('crack');
                        lib_1.vt.outln(lib_1.vt.faint, 'You die by your own doing.', -600);
                        lib_1.vt.sound('killed', 4);
                        rpc.hp = 0;
                        lib_1.death(`resurrect backfired`);
                        break;
                    }
                    else {
                        lib_1.vt.sound('resurrect');
                        if (DL) {
                            if (DL.cleric.user.status) {
                                lib_1.vt.music('winner');
                                lib_1.vt.profile({ jpg: 'npc/resurrect', effect: 'fadeInUp' });
                                DL.cleric.user.status = '';
                                pc_1.PC.activate(DL.cleric);
                                pc_1.PC.adjust('cha', 104, 2, 1);
                                lib_1.vt.outln(-200, lib_1.vt.faint, 'You raise ', -300, 'the ', lib_1.vt.yellow, DL.cleric.user.handle, lib_1.vt.reset, -400, ' from the dead!', -500);
                                gb();
                                return;
                            }
                        }
                        user('Resurrect', (opponent) => {
                            if (opponent.user.id == $.player.id || opponent.user.status == '' || opponent.user.id == '') {
                                lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.black, '\nGo get some coffee.');
                            }
                            else {
                                pc_1.PC.portrait(opponent, 'fadeInUpBig');
                                lib_1.vt.out(-200, lib_1.vt.magenta, lib_1.vt.bright, 'Now raising ', -300, lib_1.vt.normal, opponent.user.handle, -400, lib_1.vt.faint, ' from the dead ... ', -500);
                                opponent.user.status = '';
                                pc_1.PC.save(opponent);
                                lib_1.news(`\tresurrected ${opponent.user.handle}`);
                                lib_1.log(opponent.user.id, `\n${$.player.handle} resurrected you`);
                                lib_1.vt.outln();
                            }
                            gb();
                            return;
                        });
                        return;
                    }
                case 11:
                    lib_1.vt.sound('confusion');
                    lib_1.vt.out(Caster, pc_1.PC.what(rpc, 'blitz'));
                    if (backfire) {
                        lib_1.vt.out(p1.self);
                        rpc.confused = true;
                        rpc.int >>= 1;
                        rpc.dex >>= 1;
                    }
                    else {
                        lib_1.vt.out(recipient, ' ');
                        nme.confused = true;
                        nme.int >>= 1;
                        nme.dex >>= 1;
                    }
                    lib_1.vt.outln('with exploding ', -25, lib_1.vt.bright, lib_1.vt.red, 'c', -25, lib_1.vt.yellow, 'o', -25, lib_1.vt.green, 'l', -25, lib_1.vt.cyan, 'o', -25, lib_1.vt.blue, 'r', -25, lib_1.vt.magenta, 's', -25, lib_1.vt.reset, '!', -25);
                    break;
                case 12:
                    lib_1.vt.sound('transmute', 4);
                    if (backfire) {
                        if (isNaN(+rpc.user.weapon))
                            lib_1.vt.out(Caster, pc_1.PC.what(rpc, 'transform'), p1.his, lib_1.weapon(rpc), ' into', -600, '\n   ');
                        else
                            lib_1.vt.out(`A new weapon materializes... it's`, -600);
                        let n = Math.round((sys_1.dice(rpc.weapon.wc) + sys_1.dice(rpc.weapon.wc)
                            + sys_1.dice(items_1.Weapon.merchant.length)) / 3);
                        if (++n > items_1.Weapon.merchant.length - 1)
                            rpc.user.weapon = items_1.Weapon.special[sys_1.dice(items_1.Weapon.special.length) - 1];
                        else
                            rpc.user.weapon = items_1.Weapon.merchant[n];
                        items_1.Weapon.equip(rpc, rpc.user.weapon);
                        pc_1.PC.save(rpc);
                        lib_1.vt.outln(lib_1.vt.bright, sys_1.an(rpc.user.weapon.toString()), '!', -900);
                    }
                    else {
                        if (isNaN(+nme.user.weapon))
                            lib_1.vt.out(Caster, pc_1.PC.what(rpc, 'transform'), p2.his, lib_1.weapon(nme), ' into', -600, '\n   ');
                        else
                            lib_1.vt.out(`A new weapon materializes... it's`, -600);
                        let n = Math.round((sys_1.dice(nme.weapon.wc) + sys_1.dice(nme.weapon.wc)
                            + sys_1.dice(items_1.Weapon.merchant.length)) / 3);
                        if (++n > items_1.Weapon.merchant.length - 1)
                            nme.user.weapon = items_1.Weapon.special[sys_1.dice(items_1.Weapon.special.length) - 1];
                        else
                            nme.user.weapon = items_1.Weapon.merchant[n];
                        items_1.Weapon.equip(nme, nme.user.weapon);
                        pc_1.PC.save(nme);
                        lib_1.vt.outln(lib_1.vt.bright, sys_1.an(nme.user.weapon.toString()), '!', -600);
                    }
                    break;
                case 13:
                    lib_1.vt.sound('cure', 6);
                    if (backfire) {
                        lib_1.vt.out(Caster, pc_1.PC.what(rpc, 'cure'), recipient);
                        nme.hp = nme.user.hp;
                    }
                    else {
                        if (rpc === $.online)
                            lib_1.vt.out('You feel your vitality completed restored');
                        else
                            lib_1.vt.out(Caster, pc_1.PC.what(rpc, 'cure'), p1.self);
                        rpc.hp = rpc.user.hp;
                    }
                    lib_1.vt.outln('!', -400);
                    break;
                case 14:
                    lib_1.vt.sound('illusion');
                    lib_1.vt.out(Caster, pc_1.PC.what(rpc, 'render'), 'an image of ');
                    let iou = {};
                    iou.user = { id: '', sex: 'I', armor: 0, weapon: 0 };
                    pc_1.PC.reroll(iou.user, undefined, rpc.user.level);
                    pc_1.PC.activate(iou);
                    iou.user.xplevel = -1;
                    iou.user.coin = new items_1.Coin(0);
                    iou.user.sp = 0;
                    iou.sp = 0;
                    let p = round[0].party;
                    if (backfire) {
                        iou.user.handle = `image of ${nme.user.handle}`;
                        iou.hp = sys_1.int(nme.hp * (rpc.user.magic + 1) / 5);
                        parties[p ^ 1].push(iou);
                        lib_1.vt.out(recipient);
                    }
                    else {
                        iou.user.handle = `image of ${rpc.user.handle}`;
                        iou.hp = sys_1.int(rpc.hp * (rpc.user.magic + 1) / 5);
                        parties[p].push(iou);
                        lib_1.vt.out(p1.self);
                    }
                    lib_1.vt.outln('!', -400);
                    break;
                case 15:
                    lib_1.vt.sound('disintegrate', 6);
                    lib_1.vt.out(Caster, pc_1.PC.what(rpc, 'completely atomize'));
                    if (backfire) {
                        lib_1.vt.out(p1.self);
                        rpc.hp = 0;
                        if (rpc === $.online)
                            $.reason = `disintegrate backfired`;
                    }
                    else {
                        lib_1.vt.out(recipient);
                        nme.hp = 0;
                    }
                    lib_1.vt.outln('!', -400);
                    break;
                case 16:
                    lib_1.vt.sound('morph', 10);
                    if (backfire) {
                        rpc.user.level = sys_1.dice(99);
                        pc_1.PC.reroll(rpc.user, pc_1.PC.random('monster'), rpc.user.level);
                        pc_1.PC.activate(rpc);
                        rpc.altered = true;
                        rpc.user.gender = ['F', 'M'][sys_1.dice(2) - 1];
                        pc_1.PC.save(rpc);
                        lib_1.vt.out(Caster, pc_1.PC.what(rpc, 'morph'), p1.self, `into a level ${rpc.user.level} ${rpc.user.pc}`);
                        if (rpc.user.gender !== 'I') {
                            lib_1.news(`\t${rpc.user.handle} morphed into a level ${rpc.user.level} ${rpc.user.pc}!`);
                            if (rpc !== $.online)
                                lib_1.log(rpc.user.id, `\nYou morphed yourself into a level ${rpc.user.level} ${rpc.user.pc}!\n`);
                        }
                    }
                    else {
                        rpc.user.coward = true;
                        pc_1.PC.adjust('str', rpc.str > 40 ? -sys_1.dice(6) - 4 : -3, rpc.user.str > 60 ? -sys_1.dice(3) - 2 : -2, rpc.user.maxstr > 80 ? -2 : -1);
                        pc_1.PC.adjust('int', rpc.int > 40 ? -sys_1.dice(6) - 4 : -3, rpc.user.int > 60 ? -sys_1.dice(3) - 2 : -2, rpc.user.maxint > 80 ? -2 : -1);
                        pc_1.PC.adjust('dex', rpc.dex > 40 ? -sys_1.dice(6) - 4 : -3, rpc.user.dex > 60 ? -sys_1.dice(3) - 2 : -2, rpc.user.maxdex > 80 ? -2 : -1);
                        pc_1.PC.adjust('cha', rpc.cha > 40 ? -sys_1.dice(6) - 4 : -3, rpc.user.cha > 60 ? -sys_1.dice(3) - 2 : -2, rpc.user.maxcha > 80 ? -2 : -1);
                        nme.user.level = sys_1.dice(nme.user.level / 2) + sys_1.dice(nme.user.level / 2) - 1;
                        pc_1.PC.reroll(nme.user, pc_1.PC.random(), nme.user.level);
                        nme.user.gender = ['F', 'M'][sys_1.dice(2) - 1];
                        pc_1.PC.activate(nme);
                        nme.altered = true;
                        pc_1.PC.save(nme);
                        lib_1.vt.out(Caster, pc_1.PC.what(rpc, 'morph'), recipient, ` into a level ${nme.user.level} ${nme.user.pc}`);
                        if (nme.user.gender !== 'I') {
                            lib_1.news(`\t${nme.user.handle} got morphed into a level ${nme.user.level} ${nme.user.pc}${rpc !== $.online ? ' by ' + rpc.user.handle : ''}!`);
                            if (nme !== $.online)
                                lib_1.log(nme.user.id, `\nYou got morphed into a level ${nme.user.level} ${nme.user.pc} by ${rpc.user.handle}!\n`);
                        }
                    }
                    lib_1.vt.outln(-150, lib_1.vt.blue, lib_1.vt.bright, '!', -450, lib_1.vt.normal, '!', -450, lib_1.vt.faint, '!', -450);
                    break;
                case 17:
                    if (backfire) {
                        lib_1.vt.out(lib_1.vt.yellow, Caster, pc_1.PC.what(rpc, 'get'), 'swallowed by an acid mist... ', -500);
                        rpc.toAC -= sys_1.dice(rpc.armor.ac / 5 + 1);
                        rpc.user.toAC -= sys_1.dice(rpc.armor.ac / 10 + 1);
                        lib_1.vt.outln(lib_1.vt.bright, caster, ' ', pc_1.PC.what(rpc, 'damage'), 'own ', isNaN(+rpc.user.armor) ? lib_1.armor(rpc) : 'defense', '!', -400);
                        if (-rpc.user.toAC >= rpc.armor.ac || -(rpc.user.toAC + rpc.toAC) >= rpc.armor.ac) {
                            lib_1.vt.outln(p1.His, rpc.user.armor ? isNaN(+rpc.user.armor) : 'defense', ' crumbles!', -1000);
                            items_1.Armor.equip(rpc, items_1.Armor.merchant[0]);
                        }
                        rpc.altered = true;
                    }
                    else {
                        lib_1.vt.out(lib_1.vt.yellow, 'An acid mist surrounds ', recipient, '... ', lib_1.vt.reset, -500);
                        nme.toAC -= sys_1.dice(nme.armor.ac / 5 + 1);
                        nme.user.toAC -= sys_1.dice(nme.armor.ac / 10 + 1);
                        lib_1.vt.outln(lib_1.vt.bright, p2.his, isNaN(+nme.user.armor) ? lib_1.armor(nme) + ' is damaged' : 'defense lessens', '!', -400);
                        if (-nme.user.toAC >= nme.armor.ac || -(nme.user.toAC + nme.toAC) >= nme.armor.ac) {
                            lib_1.vt.outln(p2.His, isNaN(+nme.user.armor) ? nme.user.armor : 'defense', ' crumbles!', -1000);
                            items_1.Armor.equip(nme, items_1.Armor.merchant[0]);
                        }
                        nme.altered = true;
                    }
                    break;
                case 18:
                    lib_1.vt.out(lib_1.vt.magenta, 'An ', lib_1.vt.faint, 'ultraviolet', lib_1.vt.normal, ' beam emits... ', lib_1.vt.reset, -500);
                    if (backfire) {
                        rpc.toWC -= sys_1.dice(rpc.weapon.wc / 5 + 1);
                        rpc.user.toWC -= sys_1.dice(rpc.weapon.wc / 10 + 1);
                        lib_1.vt.outln(lib_1.vt.bright, caster, ' ', pc_1.PC.what(rpc, 'damage'), 'own ', isNaN(+rpc.user.weapon) ? lib_1.weapon(rpc) : 'attack', '!', -400);
                        if (-rpc.user.toWC >= rpc.weapon.wc || -(rpc.user.toWC + rpc.toWC) >= rpc.weapon.wc) {
                            lib_1.vt.outln(p1.His, rpc.user.weapon ? isNaN(+rpc.user.weapon) : 'attack', ' crumbles!', -1000);
                            items_1.Weapon.equip(rpc, items_1.Weapon.merchant[0]);
                        }
                        rpc.altered = true;
                    }
                    else {
                        nme.toWC -= sys_1.dice(nme.weapon.wc / 5 + 1);
                        nme.user.toWC -= sys_1.dice(nme.weapon.wc / 10 + 1);
                        lib_1.vt.outln(lib_1.vt.bright, caster, ' ', pc_1.PC.what(rpc, 'damage'), p2.his, isNaN(+nme.user.weapon) ? lib_1.armor(nme) : 'attack', '!', -400);
                        if (-nme.user.toWC >= nme.weapon.wc || -(nme.user.toWC + nme.toWC) >= nme.weapon.wc) {
                            lib_1.vt.outln(p2.His, isNaN(+nme.user.weapon) ? nme.user.weapon : 'attack', ' crumbles!', -1000);
                            items_1.Weapon.equip(nme, items_1.Weapon.merchant[0]);
                        }
                        nme.altered = true;
                    }
                    break;
                case 19:
                    lib_1.vt.out('A ', lib_1.vt.bright, lib_1.vt.white, 'blinding flash', lib_1.vt.normal, ' erupts... ');
                    lib_1.vt.sound('bigblast', 10);
                    pc_1.PC.adjust('int', -pc_1.PC.card(rpc.user.pc).toInt, -1, 0, rpc);
                    let bba = 12 + rpc.user.blast
                        + sys_1.int(rpc.user.level / (20 - rpc.user.magic))
                        - (backfire
                            ? sys_1.int(sys_1.whole(rpc.armor.ac + rpc.user.toAC + rpc.toWC) / 5)
                            : sys_1.int(sys_1.whole(nme.armor.ac + nme.user.toAC + nme.toWC) / 5));
                    if (nme.user.melee > 3)
                        bba *= sys_1.int(nme.user.melee / 2);
                    let bbr = sys_1.int(rpc.int / 10);
                    do {
                        bba += sys_1.dice(rpc.user.magic);
                        for (let i = 0; i < bba; i++)
                            bbr += sys_1.dice(bba);
                    } while (sys_1.dice(99 + rpc.user.magic) > 99);
                    for (let i = 0; i < rpc.user.level; i++)
                        bbr += sys_1.dice(bba);
                    if (backfire) {
                        lib_1.vt.outln(Caster, pc_1.PC.what(rpc, 'BLAST'), p1.self, `for ${bbr} hit points!`);
                        rpc.hp -= bbr;
                        if (rpc.hp < 1) {
                            rpc.hp = 0;
                            lib_1.vt.outln();
                            if (rpc === $.online)
                                $.reason = 'Big Blast backfired';
                        }
                    }
                    else {
                        if (rpc === $.online && !$.player.novice) {
                            let deed = $.mydeeds.find((x) => { return x.deed == 'big blast'; });
                            if (!deed)
                                deed = $.mydeeds[$.mydeeds.push(pc_1.Deed.load($.player.pc, 'big blast')[0]) - 1];
                            if (deed && bbr > deed.value) {
                                deed.value = bbr;
                                pc_1.Deed.save(deed, $.player);
                                lib_1.vt.out(lib_1.vt.yellow, '+', lib_1.vt.white);
                            }
                        }
                        lib_1.vt.out(Caster, pc_1.PC.what(rpc, 'BLAST'), recipient, ` for ${bbr} hit points!`);
                        nme.hp -= bbr;
                        if (nme.hp < 1) {
                            nme.hp = 0;
                            if ($.from == 'Party' || nme !== $.online) {
                                lib_1.vt.out(' ', lib_1.bracket('RIP', false), ' ');
                                lib_1.vt.beep();
                            }
                            else {
                                $.reason = rpc.user.id.length
                                    ? `fatal Big Blast by ${rpc.user.handle}`
                                    : `fatal Big Blast by a level ${rpc.user.level} ${rpc.user.handle}`;
                            }
                        }
                        lib_1.vt.outln();
                    }
                    break;
                case 20:
                    if (nme.user.magic < 2) {
                        gb(true);
                        return;
                    }
                    lib_1.vt.out(lib_1.vt.cyan, 'A glowing ', lib_1.vt.faint, '   ', lib_1.vt.LGradient, lib_1.vt.RGradient, '\b'.repeat(11), -450);
                    lib_1.vt.out('  ', lib_1.vt.LGradient, lib_1.vt.lCyan, ' ', lib_1.vt.Black, lib_1.vt.RGradient, '\b'.repeat(11), -300);
                    lib_1.vt.out(' ', lib_1.vt.LGradient, lib_1.vt.lCyan, '  ', lib_1.vt.Black, lib_1.vt.RGradient, '\b'.repeat(11), -150);
                    lib_1.vt.out(lib_1.vt.normal, lib_1.vt.LGradient, lib_1.vt.lCyan, ' O ', lib_1.vt.Black, lib_1.vt.RGradient, '\b'.repeat(11), -100);
                    lib_1.vt.out(lib_1.vt.lcyan, lib_1.vt.LGradient, lib_1.vt.lblack, lib_1.vt.lCyan, 'orb', lib_1.vt.Black, lib_1.vt.lcyan, lib_1.vt.RGradient);
                    lib_1.vt.sound('mana');
                    lib_1.vt.outln(lib_1.vt.reset, lib_1.vt.cyan, ' radiates ', lib_1.vt.faint, 'above ', backfire ? p2.him : p1.him, lib_1.vt.white, '... ', -200);
                    let mana = 0;
                    if (backfire) {
                        mana = sys_1.int(rpc.sp * 1. / ((5. - rpc.user.magic) + sys_1.dice(2)));
                        if (mana + nme.sp > nme.user.sp)
                            mana = nme.user.sp - nme.sp;
                        lib_1.vt.out(Recipient, pc_1.PC.what(rpc, 'absorb'), 'spell power (', lib_1.vt.cyan, lib_1.vt.bright, mana.toString(), lib_1.vt.reset, ') ', 'from ', caster);
                        rpc.sp -= mana;
                        if (nme.user.magic > 1)
                            nme.sp += mana;
                    }
                    else {
                        mana = sys_1.int(nme.sp * 1. / ((5. - rpc.user.magic) + sys_1.dice(2)));
                        if (mana + rpc.sp > rpc.user.sp)
                            mana = rpc.user.sp - rpc.sp;
                        lib_1.vt.out(Caster, pc_1.PC.what(rpc, 'absorb'), 'spell power (', lib_1.vt.cyan, lib_1.vt.bright, mana.toString(), lib_1.vt.reset, ') ', 'from ', recipient);
                        nme.sp -= mana;
                        if (rpc.user.magic > 1)
                            rpc.sp += mana;
                    }
                    lib_1.vt.outln('.');
                    break;
                case 21:
                    lib_1.vt.sound('life');
                    lib_1.vt.outln(lib_1.vt.black, lib_1.vt.bright, 'A black finger extends and touches ', backfire ? p1.him : p2.him, '... ', -750);
                    let xp = 0;
                    if (backfire) {
                        xp = sys_1.int(rpc.user.xp / 2);
                        rpc.user.xp -= xp;
                        nme.user.xp += (nme.user.level > rpc.user.level) ? xp : Math.trunc(nme.user.xp / 2);
                        lib_1.vt.out(Recipient, pc_1.PC.what(nme, 'absorb'), 'some life experience from ', caster);
                    }
                    else {
                        xp = sys_1.int(nme.user.xp / 2);
                        nme.user.xp -= xp;
                        rpc.user.xp += (rpc.user.level > nme.user.level) ? xp : Math.trunc(rpc.user.xp / 2);
                        lib_1.vt.out(Caster, pc_1.PC.what(rpc, 'absorb'), 'some life experience from ', recipient);
                    }
                    lib_1.vt.outln('.');
                    break;
                case 22:
                    lib_1.vt.sound('lose');
                    lib_1.vt.outln(lib_1.vt.black, lib_1.vt.bright, 'A shroud of blackness engulfs ', backfire ? p1.him : p2.him, '... ', 750);
                    if (backfire) {
                        if (rpc.user.level < 2) {
                            pc_1.PC.reroll(rpc.user);
                            break;
                        }
                        pc_1.PC.adjust('str', -pc_1.PC.card(rpc.user.pc).toStr, -1, 0, rpc);
                        pc_1.PC.adjust('int', -pc_1.PC.card(rpc.user.pc).toInt, -1, 0, rpc);
                        pc_1.PC.adjust('dex', -pc_1.PC.card(rpc.user.pc).toDex, -1, 0, rpc);
                        pc_1.PC.adjust('cha', -pc_1.PC.card(rpc.user.pc).toCha, -1, 0, rpc);
                        rpc.user.xp = Math.round(nme.user.xp / 2);
                        rpc.user.xplevel--;
                        rpc.user.level--;
                        rpc.user.hp -= Math.round(rpc.user.level + sys_1.dice(rpc.user.level) + rpc.user.str / 10 + (rpc.user.str > 90 ? rpc.user.str - 90 : 0));
                        if (rpc.user.magic > 1)
                            rpc.user.sp -= Math.round(rpc.user.level + sys_1.dice(rpc.user.level) + rpc.user.int / 10 + (rpc.user.int > 90 ? rpc.user.int - 90 : 0));
                        nme.user.xp *= 2;
                        lib_1.vt.outln(Recipient, pc_1.PC.what(nme, 'gain'), 'an experience level off ', caster, '.');
                        if (nme !== $.online && nme.user.level + 1 < $.sysop.level && player_1.checkXP(nme, gb))
                            return;
                    }
                    else {
                        if (nme.user.level < 2) {
                            pc_1.PC.reroll(nme.user);
                            break;
                        }
                        nme.user.xp = Math.round(nme.user.xp / 2);
                        nme.user.xplevel--;
                        nme.user.level--;
                        pc_1.PC.adjust('str', -pc_1.PC.card(nme.user.pc).toStr, -1, 0, nme);
                        pc_1.PC.adjust('int', -pc_1.PC.card(nme.user.pc).toInt, -1, 0, nme);
                        pc_1.PC.adjust('dex', -pc_1.PC.card(nme.user.pc).toDex, -1, 0, nme);
                        pc_1.PC.adjust('cha', -pc_1.PC.card(nme.user.pc).toCha, -1, 0, nme);
                        nme.user.hp -= Math.round(nme.user.level + sys_1.dice(nme.user.level) + nme.user.str / 10 + (nme.user.str > 90 ? nme.user.str - 90 : 0));
                        if (nme.user.magic > 1)
                            nme.user.sp -= Math.round(nme.user.level + sys_1.dice(nme.user.level) + nme.user.int / 10 + (nme.user.int > 90 ? nme.user.int - 90 : 0));
                        rpc.user.xp *= 2;
                        lib_1.vt.outln(Caster, pc_1.PC.what(rpc, 'gain'), 'an experience level off ', recipient, '.');
                        if (rpc !== $.online && rpc.user.level + 1 < $.sysop.level && player_1.checkXP(rpc, gb))
                            return;
                    }
                    break;
                case 23:
                    if (backfire) {
                        if (rpc.user.magic > 2 && rpc.user.toAC > 0)
                            rpc.user.toAC--;
                        else if (rpc.toAC > 0)
                            rpc.toAC -= sys_1.dice(rpc.toAC);
                        else
                            rpc.toAC--;
                        lib_1.vt.outln(p1.His, isNaN(+rpc.user.armor) ? rpc.user.armor : 'defense', ' loses most of its effectiveness');
                    }
                    else {
                        lib_1.vt.sound('shield');
                        lib_1.vt.outln('A magical field glitters around ', isNaN(+rpc.user.armor) ? `${p1.his}${rpc.user.armor} ` : p1.him, '...');
                        if (rpc.user.magic > 2 && rpc.user.toAC >= 0)
                            rpc.user.toAC++;
                        rpc.toAC += sys_1.int(rpc.armor.ac / 2) + sys_1.dice(rpc.armor.ac / 2);
                    }
                    rpc.altered = true;
                    break;
                case 24:
                    if (backfire) {
                        lib_1.vt.outln(p1.His, isNaN(+rpc.user.weapon) ? rpc.user.weapon : 'attack', ' loses most of its effectiveness');
                        if (rpc.user.magic > 2 && rpc.user.toWC > 0)
                            rpc.user.toWC--;
                        else if (rpc.toWC > 0)
                            rpc.toWC -= sys_1.dice(rpc.toWC);
                        else
                            rpc.toWC--;
                    }
                    else {
                        lib_1.vt.sound('hone');
                        lib_1.vt.outln(p1.His, isNaN(+rpc.user.weapon) ? rpc.user.weapon : 'attack', ' emanates magical sharpness');
                        if (rpc.user.magic > 2 && rpc.user.toWC >= 0)
                            rpc.user.toWC++;
                        rpc.toWC += sys_1.int(rpc.weapon.wc / 2) + sys_1.dice(rpc.weapon.wc / 2);
                    }
                    rpc.altered = true;
                    break;
            }
            gb();
        }
    }
    Battle.cast = cast;
    function melee(rpc, enemy, blow = 1) {
        const melee = items_1.Ring.power(enemy.user.rings, rpc.user.rings, 'melee', 'pc', rpc.user.pc).power * (rpc.user.melee + 1);
        const life = items_1.Ring.power(enemy.user.rings, rpc.user.rings, 'hp', 'pc', rpc.user.pc).power;
        let action;
        let hit = 0;
        if ($.from !== 'Party' && rpc !== $.online && rpc.user.coward && !rpc.user.cursed && rpc.hp < (rpc.user.hp / 5)) {
            rpc.hp = -1;
            lib_1.vt.outln(lib_1.vt.green, lib_1.vt.bright, rpc.user.gender == 'I' ? 'The ' : '', rpc.user.handle, -600, lib_1.vt.normal, ' runs away from ', -400, lib_1.vt.faint, 'the battle!', -200);
            if ($.from == 'User') {
                rpc.user.blessed = '';
                rpc.user.coward = true;
                rpc.user.cursed = $.player.id;
                pc_1.PC.save(rpc);
                lib_1.news(`\tcursed ${rpc.user.handle} for running away`);
                lib_1.log(rpc.user.id, `\n${enemy.user.handle} curses you for running away!\n`);
            }
            return;
        }
        let n = rpc.dex;
        if (blow == 1) {
            let m = (rpc.dex - enemy.dex);
            m = (m < -10) ? -10 : (m > 10) ? 10 : m;
            n += m;
            n = (n < 10) ? 10 : (n > 99) ? 99 : n;
            n = 50 + sys_1.int(n / 2);
        }
        else
            n -= $.player.melee * (blow - $.player.backstab + 1);
        if (sys_1.dice(100) > n) {
            if (blow == 1) {
                if (rpc === $.online) {
                    lib_1.vt.outln('Your ', lib_1.weapon(), ' passes through thin air.');
                    lib_1.vt.sound('miss');
                    return;
                }
                else {
                    lib_1.vt.sound(rpc.user.melee < 2 ? 'whoosh' : rpc.user.gender == 'I' ? 'swoosh' : 'swords');
                    if (round[0].party && alive[1] > 1)
                        lib_1.vt.out(lib_1.vt.faint, lib_1.vt.Empty, lib_1.vt.normal, ' ');
                    if (isNaN(+rpc.user.weapon))
                        lib_1.vt.outln(p1.His, lib_1.weapon(rpc), ' whistles by ', p2.you, '.');
                    else
                        lib_1.vt.outln(p1.He, 'attacks ', p2.you, ', but misses.');
                    return;
                }
            }
            else {
                lib_1.vt.outln('Attempt fails!');
                lib_1.vt.sound('miss');
                return;
            }
        }
        hit = sys_1.int(rpc.str / 10) + melee;
        hit += sys_1.dice(rpc.user.level + melee);
        hit += rpc.user.melee * sys_1.dice(rpc.user.level + melee);
        n = rpc.user.melee + melee + 1;
        let period = '';
        let smash = 0;
        while ((smash = sys_1.dice(98 + n)) > 98) {
            for (; smash > 98; smash--) {
                hit += sys_1.dice(rpc.user.level);
            }
            period += '!';
            n += melee + 1;
        }
        if (!period)
            period = '.';
        hit *= 50 + sys_1.int(rpc.user.str / 2) + melee;
        hit = Math.round(hit / 100);
        let wc = rpc.weapon.wc + rpc.user.toWC + rpc.toWC;
        let ac = enemy.armor.ac + enemy.user.toAC + enemy.toWC;
        wc = wc < 0 ? 0 : wc;
        ac = ac < 0 ? 0 : ac;
        hit += 2 * (wc + sys_1.dice(wc));
        hit *= 50 + sys_1.int(rpc.user.str / 2);
        hit = Math.round(hit / 100);
        hit -= ac + sys_1.dice(ac);
        hit = (hit > 0) ? hit * blow : melee;
        enemy.hp -= hit;
        if (hit > 0) {
            if ($.from == 'Party' && enemy.hp <= 0) {
                enemy.hp = 0;
                if (enemy === $.online)
                    lib_1.vt.sound('kill', 5);
                if (round[0].party)
                    lib_1.vt.out(lib_1.vt.faint, '> ');
                lib_1.vt.out(lib_1.vt.bright, enemy === $.online ? lib_1.vt.yellow : round[0].party == 0 ? lib_1.vt.cyan : lib_1.vt.magenta);
                lib_1.vt.outln(p1.He, sys_1.sprintf([
                    `${pc_1.PC.what(rpc, 'make')}a fatal blow to %s`,
                    `${pc_1.PC.what(rpc, 'blow')}%s away`,
                    `${pc_1.PC.what(rpc, 'laugh')}then ${pc_1.PC.what(rpc, 'kill')}%s`,
                    `easily ${pc_1.PC.what(rpc, 'slay')}%s`,
                    `${pc_1.PC.what(rpc, 'make')}minced-meat out of %s`,
                    `${pc_1.PC.what(rpc, 'run')}%s through`
                ][sys_1.dice(6) - 1], enemy.user.handle), '.', -500);
                return;
            }
            action = (blow == 1)
                ? (period[0] == '.') ? rpc.weapon.hit : rpc.weapon.smash
                : (period[0] == '.') ? rpc.weapon.stab : rpc.weapon.plunge;
            if (rpc === $.online) {
                if (!$.player.novice) {
                    let deed = $.mydeeds.find((x) => { return x.deed == 'melee'; });
                    if (!deed)
                        deed = $.mydeeds[$.mydeeds.push(pc_1.Deed.load($.player.pc, 'melee')[0]) - 1];
                    if (hit > deed.value) {
                        deed.value = hit;
                        pc_1.Deed.save(deed, $.player);
                        lib_1.vt.out(lib_1.vt.yellow, '+', lib_1.vt.white);
                    }
                }
                lib_1.vt.out('You ', melee ? lib_1.vt.uline : '', action, melee ? lib_1.vt.nouline : '', ' ', p2.him);
            }
            else {
                let w = action.split(' ');
                if (w.length > 1)
                    w.push('');
                if (round[0].party && alive[1] > 1)
                    lib_1.vt.out(lib_1.vt.faint, lib_1.vt.Empty, lib_1.vt.normal, ' ');
                lib_1.vt.out(p1.He, melee ? rpc.pc.color || lib_1.vt.faint : '', pc_1.PC.what(rpc, w[0]), w.slice(1).join(' '), lib_1.vt.reset, p2.him);
            }
            lib_1.vt.out(`for ${hit} hit points`);
            if (hit = life * sys_1.dice(hit / 6) * sys_1.dice(rpc.user.magic)) {
                if (rpc.hp + hit > rpc.user.hp) {
                    hit = rpc.user.hp - rpc.hp;
                    if (hit < 0)
                        hit = 0;
                }
                if (hit) {
                    rpc.hp += hit;
                    lib_1.vt.out(' and ', pc_1.PC.what(rpc, 'absorb'), lib_1.vt.bright, lib_1.vt.red, hit.toString(), lib_1.vt.reset, ' off the hit');
                }
            }
        }
        else
            lib_1.vt.out(isNaN(+rpc.user.weapon) ? `${p1.His}${lib_1.weapon(rpc)} ` : p1.You, `${rpc === $.online ? 'do' : 'does'} not even scratch `, p2.you);
        lib_1.vt.outln(period);
        lib_1.vt.sleep(25);
        return;
    }
    Battle.melee = melee;
    function poison(rpc, cb) {
        if (rpc.user.id == $.player.id) {
            if (!$.player.poisons.length) {
                lib_1.vt.outln(`\nYou don't have any poisons.`);
                lib_1.vt.beep();
                cb(true);
                return;
            }
            p1 = $.online.who;
            lib_1.vt.action('list');
            lib_1.vt.form = {
                'poison': {
                    cb: () => {
                        lib_1.vt.outln();
                        if (lib_1.vt.entry == '') {
                            cb();
                            return;
                        }
                        if (!items_1.Poison.have(rpc.user.poisons, sys_1.int(lib_1.vt.entry))) {
                            let okbyme = 0;
                            for (let i in $.player.poisons) {
                                let skill = $.player.poison || 1;
                                let vial = $.player.poisons[i];
                                lib_1.vt.out(lib_1.bracket(vial), items_1.Poison.merchant[vial - 1], ' '.repeat(20 - items_1.Poison.merchant[vial - 1].length));
                                let p = sys_1.int(skill / 2);
                                let t = skill - p;
                                p *= vial;
                                t *= vial;
                                let toWC = $.player.toWC, WC = $.online.toWC;
                                if (p > 0 && toWC >= 0)
                                    if (p >= toWC)
                                        toWC = p;
                                if (t > 0) {
                                    if (toWC > 0)
                                        WC = WC + t <= toWC ? WC + t
                                            : (skill == 3 && WC + sys_1.int(t / 2) <= toWC) ? WC + t
                                                : t;
                                    else
                                        WC = WC >= 0 ? t : WC + t;
                                }
                                if (3 * (WC + toWC + 1) / skill > $.online.weapon.wc)
                                    lib_1.vt.out(lib_1.vt.yellow, ' ', $.player.emulation == 'XT' ? ' 💀' : 'XXX', ' ');
                                else {
                                    lib_1.vt.out(lib_1.vt.faint, ' -=> ', lib_1.vt.normal);
                                    okbyme = vial;
                                }
                                lib_1.vt.out(lib_1.buff(toWC, WC));
                            }
                            lib_1.vt.outln();
                            if (/=|max/.test(lib_1.vt.entry)) {
                                if (okbyme)
                                    apply(rpc, okbyme);
                            }
                            else {
                                lib_1.vt.refocus();
                                return;
                            }
                        }
                        else
                            apply(rpc, sys_1.int(lib_1.vt.entry));
                        cb(true);
                        return;
                    }, prompt: ['Try vial', 'Make toxic', 'Apply poison', 'Use bane', 'Uti venenum'][$.player.poison] + ' (?=list): ', max: 3
                }
            };
            player_1.input('poison', 'max');
            return;
        }
        if ((rpc.toWC + rpc.user.toWC) < sys_1.int(rpc.weapon.wc / (6 - rpc.user.poison))) {
            let vial = sys_1.dice(rpc.user.poisons.length) - 1;
            if (vial)
                apply(rpc, rpc.user.poisons[vial]);
        }
        function apply(rpc, vial) {
            let skill = rpc.user.poison || 1;
            rpc.altered = true;
            let p = sys_1.int(skill / 2);
            let t = skill - p;
            p *= vial;
            t *= vial;
            if (p > 0 && rpc.user.toWC >= 0)
                if (p >= rpc.user.toWC)
                    rpc.user.toWC = p;
            if (t > 0) {
                if (rpc.user.toWC > 0)
                    rpc.toWC = rpc.toWC + t <= rpc.user.toWC ? rpc.toWC + t
                        : (skill == 3 && rpc.toWC + sys_1.int(t / 2) <= rpc.user.toWC) ? rpc.toWC + t
                            : t;
                else
                    rpc.toWC = rpc.toWC >= 0 ? t : rpc.toWC + t;
            }
            if (!items_1.Poison.have(rpc.user.poisons, vial) || sys_1.whole(rpc.user.weapon) > 0) {
                lib_1.vt.sound('ooze');
                lib_1.vt.outln(lib_1.vt.green, lib_1.vt.bright, p1.He, pc_1.PC.what(rpc, 'secrete'), 'a caustic ooze', lib_1.vt.reset, lib_1.buff(p, t), -400);
            }
            else {
                lib_1.vt.sound('hone');
                lib_1.vt.outln('\n', p1.He, pc_1.PC.what(rpc, 'pour'), 'some ', lib_1.vt.faint, items_1.Poison.merchant[vial - 1], lib_1.vt.reset, ' on ', rpc.who.his, lib_1.weapon(rpc), -400);
                if (/^[A-Z]/.test(rpc.user.id)) {
                    if (sys_1.dice(3 * (rpc.toWC + rpc.user.toWC + 1)) / skill > rpc.weapon.wc) {
                        lib_1.vt.outln(lib_1.vt.bright, p1.His, rpc.user.weapon, ' vaporizes!');
                        if (rpc === $.online && $.online.weapon.wc > 1)
                            lib_1.vt.sound('crack', 6);
                        items_1.Weapon.equip(rpc, items_1.Weapon.merchant[0]);
                    }
                }
                if (rpc.user.id !== $.player.id || (sys_1.dice(skill) == 1 && sys_1.dice(105 - rpc.cha) > 1)) {
                    items_1.Poison.remove(rpc.user.poisons, vial);
                    if (rpc.user.id == $.player.id)
                        lib_1.vt.outln('You toss the empty vial aside.', -400);
                }
            }
        }
    }
    Battle.poison = poison;
    function user(venue, cb) {
        let start = $.player.level > 3 ? $.player.level - 3 : 1;
        let end = $.player.level < 97 ? $.player.level + 3 : 99;
        lib_1.vt.action('freetext');
        lib_1.vt.form = {
            'user': {
                cb: () => {
                    if (lib_1.vt.entry == '?') {
                        lib_1.vt.action('list');
                        lib_1.vt.form['start'].prompt = 'Starting level ' + lib_1.bracket(start, false) + ': ';
                        player_1.input('start', '', 250);
                        return;
                    }
                    let rpc = { user: { id: sys_1.titlecase(lib_1.vt.entry) } };
                    if (rpc.user.id[0] !== '_') {
                        if (!pc_1.PC.load(rpc)) {
                            rpc.user.id = '';
                            rpc.user.handle = lib_1.vt.entry;
                            if (!pc_1.PC.load(rpc)) {
                                lib_1.vt.beep();
                                lib_1.vt.out(' ?? ');
                            }
                        }
                        if (rpc.user.id) {
                            lib_1.vt.action('clear');
                            pc_1.PC.portrait(rpc);
                            if (/Bail|Brawl|Curse|Drop|Joust|Resurrect|Rob/.test(venue) && !rpc.user.xplevel) {
                                rpc.user.id = '';
                                lib_1.vt.beep();
                                lib_1.vt.out(' ', lib_1.bracket('inactive', false));
                            }
                            else if (/Brawl|Fight|Joust|Resurrect/.test(venue) && rpc.user.status == 'jail') {
                                rpc.user.id = '';
                                lib_1.vt.beep();
                                if ($.player.emulation == 'XT')
                                    lib_1.vt.out(' 🔒');
                                lib_1.vt.out(' ', lib_1.bracket(rpc.user.status, false));
                            }
                        }
                    }
                    lib_1.vt.outln();
                    cb(rpc);
                }, max: 22
            },
            'start': {
                cb: () => {
                    let n = sys_1.whole(lib_1.vt.entry);
                    if (n > 0 && n < 100)
                        start = n;
                    lib_1.vt.form['end'].prompt = '  Ending level ' + lib_1.bracket(end, false) + ': ';
                    player_1.input('end', '99', 500);
                    return;
                }
            },
            'end': {
                cb: () => {
                    let n = sys_1.whole(lib_1.vt.entry);
                    if (n >= start && n < 100)
                        end = n;
                    lib_1.vt.outln();
                    lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.Blue, ` ID   Player's Handle          Class     Lvl      Last On       Access Level  `);
                    lib_1.vt.outln(lib_1.vt.Blue, '-'.repeat(78));
                    let rs = db.query(`
                        SELECT id, handle, pc, level, xplevel, status, lastdate, access FROM Players
                        WHERE id NOT GLOB '_*' AND xplevel > 0
                        AND level BETWEEN ${start} AND ${end}
                        ORDER BY xplevel DESC, level DESC, wins DESC, immortal DESC`);
                    for (let i in rs) {
                        if (rs[i].id == $.player.id)
                            continue;
                        if ((+rs[i].xplevel !== +rs[i].level && +rs[i].xplevel < 2))
                            lib_1.vt.out(lib_1.vt.faint);
                        else if (rs[i].pc == pc_1.PC.winning)
                            lib_1.vt.out(lib_1.vt.yellow, lib_1.vt.bright);
                        else
                            lib_1.vt.out(lib_1.vt.reset);
                        lib_1.vt.out(sys_1.sprintf('%-4s  %-22s  %-9s', rs[i].id, rs[i].handle, rs[i].pc), lib_1.vt.reset);
                        if (rs[i].status)
                            lib_1.vt.out(lib_1.vt.faint);
                        lib_1.vt.out(sys_1.sprintf('  %3s  ', rs[i].xplevel ? rs[i].xplevel.toString() : lib_1.vt.Empty));
                        lib_1.vt.out(lib_1.vt.reset, sys_1.date2full(rs[i].lastdate), '  ', items_1.Access.name[rs[i].access].sysop ? lib_1.vt.cyan : lib_1.vt.faint, rs[i].access, lib_1.vt.off);
                        if ($.player.emulation == 'XT' && items_1.Access.name[rs[i].access].emoji)
                            lib_1.vt.out(' ', items_1.Access.name[rs[i].access].emoji);
                        lib_1.vt.outln();
                    }
                    if ($.access.roleplay
                        && sys_1.dice(+$.player.expert * ($.player.immortal + 1) * $.player.level) == 1)
                        lib_1.vt.outln('\n', lib_1.vt.green, '> ', lib_1.vt.bright, 'double-click (tap) the Player ID to pick your selection.');
                    lib_1.vt.action('freetext');
                    player_1.input('user', npc_1.elemental[venue] || $.player.id);
                    return;
                }
            }
        };
        lib_1.vt.form['user'].prompt = venue + ' what user (?=list): ';
        player_1.input('user', '?');
    }
    Battle.user = user;
    function yourstats(full = true) {
        lib_1.vt.out(lib_1.vt.reset);
        lib_1.vt.out(lib_1.vt.cyan, 'Str:', lib_1.vt.bright, $.online.str > $.player.str ? lib_1.vt.yellow : $.online.str < $.player.str ? lib_1.vt.red : lib_1.vt.white);
        lib_1.vt.out(sys_1.sprintf('%3d', $.online.str), lib_1.vt.reset, sys_1.sprintf(' (%d,%d)   ', $.player.str, $.player.maxstr));
        lib_1.vt.out(lib_1.vt.cyan, 'Int:', lib_1.vt.bright, $.online.int > $.player.int ? lib_1.vt.yellow : $.online.int < $.player.int ? lib_1.vt.red : lib_1.vt.white);
        lib_1.vt.out(sys_1.sprintf('%3d', $.online.int), lib_1.vt.reset, sys_1.sprintf(' (%d,%d)   ', $.player.int, $.player.maxint));
        lib_1.vt.out(lib_1.vt.cyan, 'Dex:', lib_1.vt.bright, $.online.dex > $.player.dex ? lib_1.vt.yellow : $.online.dex < $.player.dex ? lib_1.vt.red : lib_1.vt.white);
        lib_1.vt.out(sys_1.sprintf('%3d', $.online.dex), lib_1.vt.reset, sys_1.sprintf(' (%d,%d)   ', $.player.dex, $.player.maxdex));
        lib_1.vt.out(lib_1.vt.cyan, 'Cha:', lib_1.vt.bright, $.online.cha > $.player.cha ? lib_1.vt.yellow : $.online.cha < $.player.cha ? lib_1.vt.red : lib_1.vt.white);
        lib_1.vt.outln(sys_1.sprintf('%3d', $.online.cha), lib_1.vt.reset, sys_1.sprintf(' (%d,%d)', $.player.cha, $.player.maxcha));
        lib_1.vt.out(lib_1.vt.cyan, 'Hit points: ', lib_1.vt.bright, $.online.hp > $.player.hp ? lib_1.vt.yellow : $.online.hp == $.player.hp ? lib_1.vt.white : lib_1.vt.red, $.online.hp.toString(), lib_1.vt.reset, '/', $.player.hp.toString());
        if ($.player.sp) {
            lib_1.vt.out(lib_1.vt.cyan, '   Spell points: ', lib_1.vt.bright, $.online.sp > $.player.sp ? lib_1.vt.yellow : $.online.sp == $.player.sp ? lib_1.vt.white : lib_1.vt.red, $.online.sp.toString(), lib_1.vt.reset, '/', $.player.sp.toString());
        }
        if ($.player.coin.value)
            lib_1.vt.out(lib_1.vt.cyan, '   Coin: ', lib_1.carry());
        lib_1.vt.outln();
        lib_1.vt.outln(lib_1.vt.cyan, 'Weapon: ', lib_1.weapon(), lib_1.vt.cyan, '   Armor: ', lib_1.armor());
        if (full) {
            pc_1.PC.portrait();
            lib_1.rings();
        }
    }
    Battle.yourstats = yourstats;
})(Battle || (Battle = {}));
module.exports = Battle;
