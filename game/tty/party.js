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
var Party;
(function (Party) {
    const le = [lib_1.vt.Empty, '>', '<', '(', ')', '+', '*', ']'];
    const re = [lib_1.vt.Empty, '<', '>', ')', '(', '+', '*', '['];
    const tb = [lib_1.vt.Empty, '-', '=', '~', ':', '+', '*', 'X'];
    const mp = ['M:M', ' @ ', '{#}', '($)', '[&]', '<^>', '_V_', '-X-'];
    let g = {
        name: '', members: [], handles: [], genders: [], melee: [], status: [], validated: [],
        win: 0, loss: 0, banner: 0, trim: 0, back: 0, fore: 0
    };
    let o = {
        name: '', members: [], handles: [], genders: [], melee: [], status: [], validated: [],
        win: 0, loss: 0, banner: 0, trim: 0, back: 0, fore: 0
    };
    let posse;
    let nme;
    let party = {
        'L': { description: 'List all gangs' },
        'M': { description: 'Most Wanted list' },
        'J': { description: 'Join a gang' },
        'F': { description: 'Fight another gang' },
        'S': { description: 'Start a new gang' },
        'E': { description: 'Edit your gang' },
        'R': { description: 'Resign your membership' },
        'T': { description: 'Transfer leadership' }
    };
    function menu(suppress = true) {
        if (player_1.checkXP($.online, menu))
            return;
        if ($.online.altered)
            pc_1.PC.save();
        if (!$.reason && $.online.hp < 1)
            lib_1.death('fought bravely?');
        if ($.reason)
            lib_1.vt.hangup();
        npc_1.elemental.orders('Party');
        lib_1.vt.form = {
            'menu': { cb: choice, cancel: 'q', enter: '?', eol: false }
        };
        let hints = '';
        if (!$.player.gang)
            hints += `> Join an existing gang or start a new one.\n`;
        lib_1.vt.form['menu'].prompt = lib_1.display('party', lib_1.vt.Magenta, lib_1.vt.magenta, suppress, party, hints);
        player_1.input('menu');
    }
    Party.menu = menu;
    function choice() {
        var _a;
        let suppress = false;
        let choice = lib_1.vt.entry.toUpperCase();
        if ((_a = party[choice]) === null || _a === void 0 ? void 0 : _a.description) {
            lib_1.vt.out(' - ', party[choice].description);
            suppress = $.player.expert;
        }
        lib_1.vt.outln();
        let rs;
        switch (choice) {
            case 'L':
                rs = db.query(`SELECT * FROM Gangs`);
                for (let i = 0; i < rs.length; i += 2) {
                    if (i + 1 < rs.length)
                        showGang(pc_1.PC.loadGang(rs[i]), pc_1.PC.loadGang(rs[i + 1]));
                    else
                        showGang(pc_1.PC.loadGang(rs[i]));
                }
                suppress = true;
                break;
            case 'M':
                lib_1.vt.outln();
                lib_1.vt.outln(lib_1.vt.Blue, lib_1.vt.bright, '        Party            Win-Loss   Ratio ');
                lib_1.vt.outln(lib_1.vt.Blue, lib_1.vt.bright, '------------------------------------------');
                rs = db.query(`SELECT * FROM Gangs ORDER BY win DESC, loss ASC`);
                let crown = true;
                for (let i in rs) {
                    let ratio = '  ' + (crown ? 'GOAT' : rs[i].loss ? sys_1.sprintf('%5.3f', rs[i].win / (rs[i].win + rs[i].loss)).substr(1) : ' ---');
                    lib_1.vt.out(sys_1.sprintf('%-22s %5u-%-5u ', rs[i].name, rs[i].win, rs[i].loss), ratio);
                    if (crown) {
                        lib_1.vt.out(' ', lib_1.vt.bright, lib_1.vt.yellow, $.player.emulation == 'XT' ? '👑' : '+');
                        crown = false;
                    }
                    lib_1.vt.outln();
                }
                suppress = true;
                break;
            case 'S':
                if (!$.access.roleplay)
                    break;
                if ($.player.gang) {
                    lib_1.vt.beep();
                    lib_1.vt.outln(`\nYou are already a member of ${$.player.gang}.`);
                    suppress = true;
                    break;
                }
                g = {
                    name: '', members: [], handles: [], genders: [], melee: [], status: [], validated: [],
                    win: 0, loss: 0, banner: 0, trim: 0, back: 0, fore: 0
                };
                lib_1.vt.action('freetext');
                lib_1.vt.form = {
                    'new': {
                        cb: () => {
                            lib_1.vt.outln();
                            g.name = sys_1.titlecase(lib_1.vt.entry);
                            if (g.name == 'New' || sys_1.cuss(g.name))
                                lib_1.vt.hangup();
                            if (!g.name || /King|Mash|Mon|Queen/.test(g.name)) {
                                menu();
                                return;
                            }
                            g.members = [$.player.id];
                            g.handles = [$.player.handle];
                            g.validated = [true];
                            g.banner = sys_1.dice(7);
                            g.trim = sys_1.dice(7);
                            g.back = sys_1.dice(7);
                            g.fore = sys_1.dice(7);
                            showGang(g);
                            xtGang(g.name, $.player.gender, $.player.melee, g.banner, g.trim);
                            lib_1.vt.action('yn');
                            lib_1.vt.focus = 'accept';
                        }, prompt: 'New gang name? ', min: 2, max: 22
                    },
                    'accept': {
                        cb: () => {
                            lib_1.vt.outln();
                            if (/Y/i.test(lib_1.vt.entry)) {
                                $.player.gang = g.name;
                                $.online.altered = true;
                                lib_1.vt.outln();
                                pc_1.PC.saveGang(g, true);
                                lib_1.cat('party/gang');
                                lib_1.vt.sound('click', 20);
                                menu();
                            }
                            else {
                                g.banner = sys_1.dice(7);
                                g.trim = sys_1.dice(7);
                                g.back = sys_1.dice(7);
                                g.fore = sys_1.dice(7);
                                showGang(g);
                                lib_1.vt.refocus();
                            }
                        }, prompt: 'Accept this banner (Y/N)? ',
                        cancel: 'N', enter: 'Y', eol: false, match: /Y|N/i, timeout: 20
                    }
                };
                lib_1.vt.focus = 'new';
                return;
            case 'R':
                if (!$.access.roleplay)
                    break;
                if (!$.player.gang)
                    break;
                if (!$.party) {
                    lib_1.vt.beep();
                    lib_1.vt.outln('\nYou cannot resign from your gang after party fights.');
                    suppress = true;
                    break;
                }
                g = pc_1.PC.loadGang(db.query(`SELECT * FROM Gangs WHERE name = '${$.player.gang}'`)[0]);
                showGang(g);
                xtGang(g.name, $.player.gender, $.player.melee, g.banner, g.trim);
                lib_1.vt.sound('ddd', 6);
                lib_1.vt.action('ny');
                lib_1.vt.form = {
                    'resign': {
                        cb: () => {
                            lib_1.vt.outln();
                            if (/Y/i.test(lib_1.vt.entry)) {
                                $.player.gang = '';
                                $.player.coward = true;
                                $.online.altered = true;
                                let i = g.members.indexOf($.player.id);
                                if (i > 0) {
                                    g.members.splice(i, 1);
                                    pc_1.PC.saveGang(g);
                                }
                                else {
                                    pc_1.PC.adjust('cha', -2, -1);
                                    lib_1.vt.out('\nDissolving the gang... ');
                                    db.run(`UPDATE Players SET gang = '' WHERE gang = '${g.name}'`);
                                    db.run(`DELETE FROM Gangs WHERE name = '${g.name}'`);
                                    lib_1.vt.outln();
                                }
                                pc_1.PC.adjust('str', $.online.str > 40 ? -sys_1.dice(6) - 4 : -3, $.player.str > 60 ? -sys_1.dice(3) - 2 : -2, $.player.maxstr > 80 ? -2 : -1);
                                pc_1.PC.adjust('int', $.online.int > 40 ? -sys_1.dice(6) - 4 : -3, $.player.int > 60 ? -sys_1.dice(3) - 2 : -2, $.player.maxint > 80 ? -2 : -1);
                                pc_1.PC.adjust('dex', $.online.dex > 40 ? -sys_1.dice(6) - 4 : -3, $.player.dex > 60 ? -sys_1.dice(3) - 2 : -2, $.player.maxdex > 80 ? -2 : -1);
                                pc_1.PC.adjust('cha', $.online.cha > 40 ? -sys_1.dice(6) - 4 : -3, $.player.cha > 60 ? -sys_1.dice(3) - 2 : -2, $.player.maxcha > 80 ? -2 : -1);
                            }
                            g = {
                                name: '', members: [], handles: [], genders: [], melee: [], status: [], validated: [],
                                win: 0, loss: 0, banner: 0, trim: 0, back: 0, fore: 0
                            };
                            menu();
                        }, prompt: 'Resign (Y/N)? ', enter: 'N', eol: false, match: /Y|N/i
                    }
                };
                lib_1.vt.focus = 'resign';
                return;
            case 'J':
                if (!$.access.roleplay)
                    break;
                if ($.player.gang) {
                    lib_1.vt.beep();
                    lib_1.vt.outln(`\nYou are already a member of ${$.player.gang}.`);
                    suppress = true;
                    break;
                }
                g.members = [];
                rs = db.query(`SELECT * FROM Gangs ORDER BY name`);
                do {
                    g = pc_1.PC.loadGang(rs[0]);
                    rs.splice(0, 1);
                    if (g.members.length < 4 || g.members.indexOf($.player.id) > 0)
                        break;
                } while (rs.length);
                if (g.members.length > 0 && (g.members.length < 4 || g.members.indexOf($.player.id) > 0)) {
                    showGang(g);
                    lib_1.vt.action('ny');
                    lib_1.vt.form = {
                        'join': {
                            cb: () => {
                                if (/Y/i.test(lib_1.vt.entry)) {
                                    $.player.gang = g.name;
                                    $.online.altered = true;
                                    if (g.members.indexOf($.player.id) < 0)
                                        g.members.push($.player.id);
                                    db.run(`UPDATE Gangs SET members = '${g.members.join()}' WHERE name = '${g.name}'`);
                                    lib_1.vt.outln('\n');
                                    lib_1.cat('party/gang');
                                    lib_1.vt.sound('click', 12);
                                    lib_1.vt.outln(lib_1.vt.cyan, 'You are now a member of ', lib_1.vt.bright, g.name, lib_1.vt.normal, '.', -1200);
                                }
                                else {
                                    g.members = [];
                                    while (rs.length) {
                                        g = pc_1.PC.loadGang(rs[0]);
                                        rs.splice(0, 1);
                                        if (g.members.length < 4 || g.members.indexOf($.player.id) > 0)
                                            break;
                                    }
                                    if (g.members.length > 0 && (g.members.length < 4 || g.members.indexOf($.player.id) > 0)) {
                                        showGang(g);
                                        lib_1.vt.refocus();
                                        return;
                                    }
                                }
                                menu();
                            }, prompt: 'Join (Y/N)? ', enter: 'N', eol: false, match: /Y|N/i
                        }
                    };
                    lib_1.vt.focus = 'join';
                    return;
                }
                break;
            case 'T':
                if (!$.access.roleplay)
                    break;
                if (!$.player.gang)
                    break;
                g = pc_1.PC.loadGang(db.query(`SELECT * FROM Gangs WHERE name = '${$.player.gang}'`)[0]);
                showGang(g);
                if (g.members.indexOf($.player.id) != 0) {
                    lib_1.vt.beep();
                    lib_1.vt.outln('\nYou are not its leader.');
                    break;
                }
                xtGang(g.name, $.player.gender, $.player.melee, g.banner, g.trim);
                lib_1.vt.sound('ddd', 6);
                Battle.user('Transfer leadership to', (member) => {
                    let n = g.members.indexOf(member.user.id);
                    if (n < 0) {
                        lib_1.vt.beep();
                        if (member.user.id) {
                            lib_1.vt.profile(member);
                            lib_1.vt.outln(`\n${member.user.handle} is not a member.`);
                        }
                    }
                    else {
                        if (member.user.gang == g.name) {
                            g.members[0] = member.user.id;
                            g.members[n] = $.player.id;
                            pc_1.PC.saveGang(g);
                            g = pc_1.PC.loadGang(db.query(`SELECT * FROM Gangs WHERE name = '${$.player.gang}'`)[0]);
                            showGang(g);
                            lib_1.vt.outln();
                            lib_1.vt.outln(lib_1.vt.bright, member.user.handle, ' is now leader of ', g.name, '.');
                        }
                        else {
                            lib_1.vt.beep();
                            lib_1.vt.outln(`\n${member.user.handle} has not accepted membership.`);
                        }
                    }
                    menu();
                });
                return;
            case 'E':
                if (!$.access.roleplay)
                    break;
                if (!$.player.gang)
                    break;
                if (!$.party) {
                    lib_1.vt.beep();
                    lib_1.vt.outln('\nYou cannot edit your gang after party fights.');
                    suppress = true;
                    break;
                }
                g = pc_1.PC.loadGang(db.query(`SELECT * FROM Gangs WHERE name = '${$.player.gang}'`)[0], $.player.id);
                showGang(g);
                if (g.members.indexOf($.player.id) != 0) {
                    lib_1.vt.beep();
                    lib_1.vt.outln('\nYou are not its leader.');
                    break;
                }
                xtGang(g.name, $.player.gender, $.player.melee, g.banner, g.trim);
                lib_1.vt.action('ny');
                lib_1.vt.form = {
                    'drop': {
                        cb: () => {
                            if (/Y/i.test(lib_1.vt.entry)) {
                                Battle.user('Drop', (member) => {
                                    if (member.user.id !== '') {
                                        let n = g.members.indexOf(member.user.id);
                                        if (n < 0) {
                                            lib_1.vt.beep();
                                            if (member.user.handle)
                                                lib_1.vt.outln(`\n${member.user.handle} is not a member.`);
                                        }
                                        else {
                                            if (!db.lock(member.user.id)) {
                                                lib_1.vt.beep();
                                                lib_1.vt.outln(`\n${pc_1.PC.who(member).He}is currently engaged elsewhere and not available.`);
                                            }
                                            else {
                                                if (member.user.gang == g.name) {
                                                    member.user.gang = '';
                                                    db.run(`UPDATE Players SET gang='' WHERE id='${member.user.id}'`);
                                                }
                                                g.members.splice(n, 1);
                                                g.handles.splice(n, 1);
                                                pc_1.PC.saveGang(g);
                                                showGang(g);
                                                lib_1.vt.sound('click');
                                                lib_1.vt.outln();
                                                lib_1.vt.outln(lib_1.vt.bright, member.user.handle, ' is no longer on ', g.name, '.');
                                            }
                                        }
                                    }
                                    menu();
                                });
                            }
                            else
                                lib_1.vt.focus = 'invite';
                        }, prompt: 'Drop a member (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                    },
                    'invite': {
                        cb: () => {
                            if (/Y/i.test(lib_1.vt.entry)) {
                                Battle.user('Invite', (member) => {
                                    if (member.user.id !== '') {
                                        let n = g.members.indexOf(member.user.id);
                                        if (n >= 0) {
                                            lib_1.vt.beep();
                                            lib_1.vt.outln(`\n${member.user.handle} is already a member.`);
                                        }
                                        else {
                                            if (!member.user.gang) {
                                                g.members.push(member.user.id);
                                                g.handles.push(member.user.handle);
                                                pc_1.PC.saveGang(g);
                                                showGang(g);
                                                lib_1.log(member.user.id, `\n${$.player.handle} invites you to join ${g.name}`);
                                                lib_1.vt.sound('click');
                                                lib_1.vt.outln();
                                                lib_1.vt.outln(lib_1.vt.bright, member.user.handle, ' is invited to join ', g.name, '.');
                                            }
                                        }
                                    }
                                    menu();
                                });
                            }
                            else
                                menu();
                        }, prompt: 'Invite another player (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                    }
                };
                lib_1.vt.focus = 'drop';
                return;
            case 'F':
                if (!$.access.roleplay)
                    break;
                if (!$.player.gang)
                    break;
                if (!$.party) {
                    lib_1.vt.beep();
                    lib_1.vt.outln('\nYou have no more party fights.');
                    suppress = true;
                    break;
                }
                rs = db.query(`SELECT * FROM Gangs ORDER BY name`);
                for (let i = 0; i < rs.length; i++) {
                    o = pc_1.PC.loadGang(rs[i], $.player.id);
                    if (o.name !== $.player.gang)
                        lib_1.vt.out(lib_1.bracket(i + 1), o.name);
                }
                lib_1.vt.action('listmm');
                lib_1.vt.form = {
                    'gang': {
                        cb: () => {
                            lib_1.vt.outln();
                            let i = sys_1.whole(lib_1.vt.entry) - 1;
                            if (/^M$/i.test(lib_1.vt.entry)) {
                                rs = [rs.find((x) => { return x.name == 'Monster Mash'; })];
                                i = 0;
                            }
                            if (i < 0) {
                                rs = [rs.find((x) => { return x.name == lib_1.vt.entry; })];
                                i = rs[0] == 'undefined' ? -1 : 0;
                            }
                            if (!rs[i]) {
                                lib_1.vt.beep();
                                menu();
                                return;
                            }
                            g = pc_1.PC.loadGang(db.query(`SELECT * FROM Gangs WHERE name = '${$.player.gang}'`)[0], $.player.id);
                            o = pc_1.PC.loadGang(rs[i]);
                            if (o.name == g.name) {
                                lib_1.vt.refocus();
                                return;
                            }
                            posse = new Array($.online);
                            for (let i = 0; i < 4 && i < g.members.length; i++) {
                                if (g.members[i] !== $.player.id
                                    && (g.validated[i] || typeof g.validated[i] == 'undefined')
                                    && !g.status[i]) {
                                    let n = posse.push({ user: { id: g.members[i] } }) - 1;
                                    pc_1.PC.load(posse[n]);
                                    if (posse[n].user.gang !== g.name || posse[n].user.status)
                                        posse.pop();
                                    else
                                        pc_1.PC.activate(posse[n], true);
                                }
                            }
                            nme = new Array();
                            for (let i = 0; i < 4 && i < o.members.length; i++) {
                                if (!/_MM.$/.test(o.members[i])) {
                                    if ((o.validated[i] || typeof o.validated[i] == 'undefined') && !o.status[i]) {
                                        let n = nme.push({ user: { id: o.members[i] } }) - 1;
                                        pc_1.PC.load(nme[n]);
                                        if (nme[n].user.gang !== o.name
                                            || !nme[n].user.xplevel || nme[n].user.status || !db.lock(nme[n].user.id, 2))
                                            nme.pop();
                                    }
                                }
                                else {
                                    nme.push({});
                                    nme[i].user = { id: '' };
                                    let mon = sys_1.dice(3) - 2 + (posse[i] ? posse[i].user.level : sys_1.dice(Object.keys(npc_1.dungeon.monsters).length / 2));
                                    mon = mon < 0 ? 0 : mon >= Object.keys(npc_1.dungeon.monsters).length ? Object.keys(npc_1.dungeon.monsters).length - 1 : mon;
                                    let dm = Object.keys(npc_1.dungeon.monsters)[mon];
                                    let ml = mon + sys_1.dice(3) - 2;
                                    ml = ml < 1 ? 1 : ml > 99 ? 99 : ml;
                                    nme[i].user.handle = dm;
                                    nme[i].user.sex = 'I';
                                    pc_1.PC.reroll(nme[i].user, npc_1.dungeon.monsters[dm].pc ? npc_1.dungeon.monsters[dm].pc : $.player.pc, ml);
                                    nme[i].user.weapon = npc_1.dungeon.monsters[dm].weapon ? npc_1.dungeon.monsters[dm].weapon : items_1.Weapon.merchant[sys_1.int((items_1.Weapon.merchant.length - 1) * ml / 100) + 1];
                                    nme[i].user.armor = npc_1.dungeon.monsters[dm].armor ? npc_1.dungeon.monsters[dm].armor : items_1.Armor.merchant[sys_1.int((items_1.Armor.merchant.length - 1) * ml / 100) + 1];
                                    nme[i].user.poisons = [];
                                    if (npc_1.dungeon.monsters[dm].poisons)
                                        for (let vials in npc_1.dungeon.monsters[dm].poisons)
                                            items_1.Poison.add(nme[i].user.poisons, npc_1.dungeon.monsters[dm].poisons[vials]);
                                    nme[i].user.rings = npc_1.dungeon.monsters[dm].rings || [];
                                    nme[i].user.spells = [];
                                    if (npc_1.dungeon.monsters[dm].spells)
                                        for (let magic in npc_1.dungeon.monsters[dm].spells)
                                            items_1.Magic.add(nme[i].user.spells, npc_1.dungeon.monsters[dm].spells[magic]);
                                    pc_1.PC.activate(nme[i]);
                                    nme[i].user.toWC = sys_1.int(nme[i].weapon.wc / 4) + 1;
                                    nme[i].user.coin = new items_1.Coin(sys_1.money(ml));
                                    nme[i].user.handle = sys_1.titlecase(dm);
                                    nme[i].user.gang = o.name;
                                    o.handles[i] = nme[i].user.handle;
                                    o.status[i] = '';
                                    o.validated[i] = true;
                                }
                            }
                            if (!nme.length) {
                                lib_1.vt.outln('\nThat gang is not active!');
                                menu();
                                return;
                            }
                            lib_1.vt.action('ny');
                            showGang(g, o, true);
                            xtGang(o.name, o.genders[0], o.melee[0], o.banner, o.trim);
                            player_1.input('fight', 'y');
                        }, prompt: '\nFight which gang? ', max: 22
                    },
                    'fight': {
                        cb: () => {
                            lib_1.vt.outln('\n');
                            if (/Y/i.test(lib_1.vt.entry)) {
                                $.party--;
                                lib_1.vt.music('party');
                                if (!lib_1.cat('dungeon/' + nme[0].user.handle.toLowerCase()))
                                    lib_1.cat('player/' + nme[0].user.pc.toLowerCase());
                                lib_1.vt.outln(lib_1.vt.magenta, lib_1.vt.bright, nme[0].user.handle, lib_1.vt.reset, ' grins as ', pc_1.PC.who(nme[0]).he, 'pulls out ', pc_1.PC.who(nme[0]).his, lib_1.weapon(nme[0]), '.', -1200);
                                Battle.engage('Party', posse, nme, menu);
                            }
                            else {
                                db.unlock($.player.id, true);
                                menu();
                            }
                        }, prompt: 'Fight this gang (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                    }
                };
                player_1.input('gang', npc_1.elemental.Party || (sys_1.dice(2) == 1 ? 'M' : ''));
                return;
            case 'Q':
                lib_1.vt.action('clear');
                require('./menu').menu($.player.expert);
                return;
        }
        menu(suppress);
    }
    function showGang(lg, rg, engaged = false) {
        lib_1.vt.outln();
        lib_1.vt.out(lib_1.vt.bright, lib_1.vt.white, mp[lg.banner]);
        if (rg)
            lib_1.vt.out(' '.repeat(31), mp[rg.banner]);
        lib_1.vt.outln();
        lib_1.vt.out(' |', lib_1.vt.Black + lg.back, lib_1.vt.black + lg.fore, lib_1.vt.bright);
        lib_1.vt.out(le[lg.trim], tb[lg.trim].repeat(26), re[lg.trim], lib_1.vt.reset);
        if (rg) {
            lib_1.vt.out(' '.repeat(4), ' |', lib_1.vt.Black + rg.back, lib_1.vt.black + rg.fore, lib_1.vt.bright);
            lib_1.vt.out(le[rg.trim], tb[rg.trim].repeat(26), re[rg.trim]);
        }
        lib_1.vt.outln();
        lib_1.vt.out(' |', lib_1.vt.Black + lg.back, lib_1.vt.black + lg.fore, lib_1.vt.bright);
        let i = 26 - lg.name.length;
        lib_1.vt.out(le[lg.trim], ' '.repeat(i >> 1), lg.name, ' '.repeat((i >> 1) + i % 2), re[lg.trim], lib_1.vt.reset);
        if (rg) {
            lib_1.vt.out(' '.repeat(4), ' |', lib_1.vt.Black + rg.back, lib_1.vt.black + rg.fore, lib_1.vt.bright);
            i = 26 - rg.name.length;
            lib_1.vt.out(le[rg.trim], ' '.repeat(i >> 1), rg.name, ' '.repeat((i >> 1) + i % 2), re[rg.trim]);
        }
        lib_1.vt.outln();
        lib_1.vt.out(' |', lib_1.vt.Black + lg.back, lib_1.vt.black + lg.fore, lib_1.vt.bright);
        lib_1.vt.out(le[lg.trim], tb[lg.trim].repeat(26), re[lg.trim], lib_1.vt.reset);
        if (rg) {
            lib_1.vt.out(' '.repeat(4), ' |', lib_1.vt.Black + rg.back, lib_1.vt.black + rg.fore, lib_1.vt.bright);
            lib_1.vt.out(le[rg.trim], tb[rg.trim].repeat(26), re[rg.trim]);
        }
        lib_1.vt.outln();
        let n = 0;
        let who;
        while (n < 4 && ((lg && lg.members.length) || (rg && rg.members.length))) {
            if (lg) {
                lib_1.vt.out(' | ');
                if (n < lg.members.length) {
                    if (lg.handles[n]) {
                        if (lg.validated[n]) {
                            if (lg.status[n]) {
                                if (engaged)
                                    lib_1.vt.out(lib_1.vt.faint, lib_1.vt.red, 'x ');
                                else
                                    lib_1.vt.out(lib_1.vt.reset, lib_1.vt.faint, '^ ');
                            }
                            else
                                lib_1.vt.out(lib_1.vt.bright, lib_1.vt.white, '  ');
                        }
                        else {
                            if (typeof lg.validated[n] == 'undefined') {
                                if (engaged)
                                    lib_1.vt.out(lib_1.vt.faint, lib_1.vt.red, 'x ');
                                else
                                    lib_1.vt.out(lib_1.vt.faint, lib_1.vt.yellow, '> ');
                            }
                            else {
                                if (engaged)
                                    lib_1.vt.out(lib_1.vt.faint, lib_1.vt.red, 'x ');
                                else
                                    lib_1.vt.out(lib_1.vt.faint, lib_1.vt.red, 'x ', lib_1.vt.blue);
                            }
                        }
                        lib_1.vt.out(sys_1.sprintf('%-24s ', lg.handles[n]));
                    }
                    else
                        lib_1.vt.out(sys_1.sprintf('> %-24s ', 'wired for '
                            + ['mashing', 'smashing', 'beatdown', 'pounding'][n]));
                }
                else {
                    if (engaged)
                        lib_1.vt.out(sys_1.sprintf(' '.repeat(27)));
                    else
                        lib_1.vt.out(sys_1.sprintf(' -open invitation to join- '));
                }
            }
            if (rg) {
                lib_1.vt.out(lib_1.vt.reset, ' '.repeat(4), ' | ');
                if (n < rg.members.length) {
                    if (rg.handles[n]) {
                        if (rg.validated[n]) {
                            if (rg.status[n]) {
                                if (engaged)
                                    lib_1.vt.out(lib_1.vt.faint, lib_1.vt.red, 'x ');
                                else
                                    lib_1.vt.out(lib_1.vt.reset, lib_1.vt.faint, '^ ');
                            }
                            else
                                lib_1.vt.out(lib_1.vt.bright, lib_1.vt.white, '  ');
                        }
                        else {
                            if (typeof rg.validated[n] == 'undefined') {
                                if (engaged)
                                    lib_1.vt.out(lib_1.vt.faint, lib_1.vt.red, 'x ');
                                else
                                    lib_1.vt.out(lib_1.vt.faint, lib_1.vt.yellow, '> ');
                            }
                            else {
                                if (engaged)
                                    lib_1.vt.out(lib_1.vt.faint, lib_1.vt.red, 'x ');
                                else
                                    lib_1.vt.out(lib_1.vt.faint, lib_1.vt.red, 'x ', lib_1.vt.blue);
                            }
                        }
                        lib_1.vt.out(sys_1.sprintf('%-24s ', rg.handles[n]));
                    }
                    else
                        lib_1.vt.out(sys_1.sprintf('> %-24s ', 'wired for '
                            + ['mashing', 'smashing', 'beatdown', 'pounding'][n]));
                }
                else if (!engaged)
                    lib_1.vt.out(sys_1.sprintf(' -open invitation to join- '));
            }
            lib_1.vt.outln();
            n++;
        }
    }
    function xtGang(name, sex, melee, banner, coat) {
        switch (sex) {
            case 'I':
                lib_1.vt.profile({ handle: name, leader: 'gang/leadermm', banner: 'gang/bannermm', coat: 'gang/coatmm' });
                break;
            case 'F':
                lib_1.vt.profile({ handle: name, leader: `gang/leader${melee}_f`, banner: `gang/banner${banner}`, coat: `gang/coat${coat}` });
                break;
            default:
                lib_1.vt.profile({ handle: name, leader: `gang/leader${melee}`, banner: `gang/banner${banner}`, coat: `gang/coat${coat}` });
                break;
        }
    }
})(Party || (Party = {}));
module.exports = Party;
