"use strict";
const $ = require("../runtime");
const Battle = require("../battle");
const db = require("../db");
const Email = require("../email");
const lib_1 = require("../lib");
const pc_1 = require("../pc");
const player_1 = require("../player");
const sys_1 = require("../sys");
var Sysop;
(function (Sysop) {
    let sysop = {
        'B': { description: 'Blessed/Cursed and Cowards' },
        'D': { description: 'Deep Dank Dungeon' },
        'N': { description: 'Newsletter' },
        'R': { description: 'Reroll' },
        'T': { description: 'Tavern/Taxman records' },
        'X': { description: 'terminate: Reroll a player' },
        'Y': { description: 'Your Scout' }
    };
    function menu(suppress = false) {
        if ($.reason)
            lib_1.vt.hangup();
        lib_1.vt.music();
        lib_1.vt.form = {
            'menu': { cb: choice, cancel: 'q', enter: '?', eol: false }
        };
        lib_1.vt.form['menu'].prompt = lib_1.display('sysop', lib_1.vt.Red, lib_1.vt.red, suppress, sysop);
        player_1.input('menu');
    }
    Sysop.menu = menu;
    function choice() {
        var _a;
        let suppress = false;
        let choice = lib_1.vt.entry.toUpperCase();
        if ((_a = sysop[choice]) === null || _a === void 0 ? void 0 : _a.description) {
            lib_1.vt.out(' - ', sysop[choice].description);
            suppress = $.player.expert;
        }
        lib_1.vt.outln();
        let rpc = { user: { id: '' } };
        let rs = [];
        switch (choice) {
            case 'B':
                lib_1.vt.outln();
                lib_1.vt.outln(lib_1.vt.Blue, lib_1.vt.white, ` ID   Player's Handle           Class    Lvl  `);
                lib_1.vt.outln(lib_1.vt.Blue, lib_1.vt.white, '----------------------------------------------');
                rs = db.query(`SELECT * FROM Players WHERE blessed !='' OR cursed !='' OR coward != 0`);
                for (let n in rs) {
                    if (rs[n].pc == pc_1.PC.winning)
                        lib_1.vt.out(lib_1.vt.bright, lib_1.vt.yellow);
                    else if (rs[n].id == $.player.id)
                        lib_1.vt.out(lib_1.vt.bright, lib_1.vt.white);
                    lib_1.vt.out(sys_1.sprintf('%-4s  %-22s  %-9s  %3d ', rs[n].id, rs[n].handle, rs[n].pc, rs[n].level));
                    if (rs[n].blessed)
                        lib_1.vt.out(` blessed by ${rs[n].blessed} `);
                    if (rs[n].cursed)
                        lib_1.vt.out(` cursed by ${rs[n].cursed} `);
                    if (rs[n].coward)
                        lib_1.vt.out(lib_1.bracket('COWARD', false));
                    lib_1.vt.outln();
                }
                lib_1.vt.form['pause'] = { cb: menu, pause: true };
                lib_1.vt.focus = 'pause';
                return;
            case 'D':
                lib_1.vt.action('list');
                lib_1.vt.form = {
                    'level': {
                        cb: () => {
                            let i = parseInt(lib_1.vt.entry);
                            if (isNaN(i)) {
                                lib_1.vt.refocus();
                                return;
                            }
                            if (i < 1 || i > 100) {
                                lib_1.vt.refocus();
                                return;
                            }
                            lib_1.vt.sound('teleport');
                            require('./dungeon').DeepDank(i - 1, menu);
                        }, prompt: `Level (1-100): `, min: 1, max: 3
                    }
                };
                lib_1.vt.focus = 'level';
                return;
            case 'N':
                rs = db.query(`SELECT id FROM Players WHERE id NOT GLOB '_*'`);
                for (let row in rs) {
                    rpc.user.id = rs[row].id;
                    pc_1.PC.load(rpc);
                    Email.newsletter(rpc.user);
                    lib_1.vt.out('.', -2500);
                }
                lib_1.vt.outln('done.', -1000);
                break;
            case 'Q':
                require('./menu').menu($.player.expert);
                return;
            case 'R':
                let pc;
                let kh;
                let k;
                lib_1.vt.action('ny');
                lib_1.vt.form = {
                    'pc': {
                        cb: () => {
                            if (!lib_1.vt.entry)
                                lib_1.vt.entry = Object.keys(pc_1.PC.name['player'])[0];
                            pc = sys_1.titlecase(lib_1.vt.entry);
                            lib_1.vt.focus = 'kh';
                        }, prompt: 'Enter starting player class? ', max: 20
                    },
                    'kh': {
                        cb: () => {
                            kh = parseInt(lib_1.vt.entry);
                            kh = kh < 1 ? 0 : kh > 6 ? 6 : kh;
                            lib_1.vt.focus = 'yn';
                        }, prompt: 'Enter starting key hints (0-6)? ', max: 1
                    },
                    'yn': {
                        cb: () => {
                            lib_1.vt.outln();
                            if (/Y/i.test(lib_1.vt.entry)) {
                                pc_1.PC.load($.sysop);
                                $.sysop.dob = sys_1.now().date + 1;
                                $.sysop.plays = 0;
                                pc_1.PC.save($.sysop);
                                rs = db.query(`SELECT id FROM Players WHERE id NOT GLOB '_*'`);
                                for (let row in rs) {
                                    rpc.user.id = rs[row].id;
                                    pc_1.PC.load(rpc);
                                    pc_1.PC.reroll(rpc.user, pc);
                                    pc_1.PC.newkeys(rpc.user);
                                    for (k = 0; k < kh; k++)
                                        pc_1.PC.keyhint(rpc);
                                    rpc.user.plays = 0;
                                    pc_1.PC.save(rpc);
                                    lib_1.vt.out('.');
                                }
                                pc_1.PC.reroll($.player, pc);
                                pc_1.PC.newkeys($.player);
                                for (k = 0; k < kh; k++)
                                    pc_1.PC.keyhint($.online);
                                rpc.user.plays = 0;
                                lib_1.vt.outln(lib_1.vt.reset, '\nHappy hunting tomorrow!');
                                $.reason = 'reroll';
                                lib_1.vt.hangup();
                            }
                            else
                                menu();
                        }, prompt: 'Reroll the board (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i
                    }
                };
                lib_1.vt.focus = 'pc';
                return;
            case 'T':
                lib_1.vt.form = {
                    'taxman': {
                        cb: () => {
                            pc_1.PC.load($.taxman);
                            pc_1.PC.status($.taxman);
                            lib_1.vt.focus = 'pause';
                        }, pause: true
                    },
                    'pause': { cb: menu, pause: true }
                };
                pc_1.PC.load($.barkeep);
                pc_1.PC.status($.barkeep);
                lib_1.vt.focus = 'taxman';
                return;
            case 'X':
                lib_1.vt.music('ddd');
                Battle.user('Reroll', (opponent) => {
                    if (opponent.user.id == $.player.id) {
                        opponent.user.id = '';
                        lib_1.vt.outln(`You can't reroll yourself here.`);
                        lib_1.vt.refocus();
                        return;
                    }
                    if (opponent.user.id) {
                        pc_1.PC.reroll(opponent.user);
                        pc_1.PC.newkeys(opponent.user);
                        opponent.user.keyhints.splice(12);
                        pc_1.PC.save(opponent);
                        sys_1.fs.unlink(sys_1.pathTo('users', '.${user.id}.json'), () => { });
                        return;
                    }
                    menu();
                });
                return;
            case 'Y':
                Battle.user('Scout', (opponent) => {
                    if (opponent.user.id) {
                        pc_1.PC.portrait(opponent);
                        lib_1.vt.form['pause'] = { cb: menu, pause: true };
                        lib_1.vt.focus = 'pause';
                    }
                    else
                        menu();
                });
                return;
        }
        menu(suppress);
    }
})(Sysop || (Sysop = {}));
module.exports = Sysop;
