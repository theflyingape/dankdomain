"use strict";
const $ = require("../runtime");
const db = require("../db");
const lib_1 = require("../lib");
const npc_1 = require("../npc");
const pc_1 = require("../pc");
const player_1 = require("../player");
const sys_1 = require("../sys");
var Library;
(function (Library) {
    let library = {
        'C': { description: 'Class Champions' },
        'H': { description: 'Hall of Heroes' },
        'I': { description: 'Immortals' },
        'M': { description: 'Most Memorable Hits' },
        'T': { description: 'Top Ten Tavern Thugs' },
        'W': { description: 'Winners' }
    };
    function menu(suppress = false) {
        npc_1.elemental.orders('Library');
        lib_1.vt.form = {
            'menu': { cb: choice, cancel: 'Q', enter: '?', eol: false }
        };
        lib_1.vt.form['menu'].prompt = lib_1.display('library', lib_1.vt.Cyan, lib_1.vt.cyan, suppress, library);
        player_1.input('menu', undefined, sys_1.dice(10) * 2000);
    }
    Library.menu = menu;
    function choice() {
        var _a;
        let suppress = false;
        let choice = lib_1.vt.entry.toUpperCase();
        if ((_a = library[choice]) === null || _a === void 0 ? void 0 : _a.description) {
            lib_1.vt.out(' - ', library[choice].description);
            suppress = $.player.expert;
        }
        lib_1.vt.outln();
        let q, medal;
        switch (choice) {
            case 'C':
                lib_1.vt.outln();
                lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.Red, '  Class      CHAMPION                  Date      BEST          Deed      ');
                lib_1.vt.outln(lib_1.vt.faint, lib_1.vt.Red, '-------------------------------------------------------------------------');
                for (let type in pc_1.PC.name)
                    for (let pc in pc_1.PC.name[type]) {
                        let deeds = pc_1.Deed.load(pc);
                        if (deeds.length) {
                            lib_1.vt.out(sys_1.sprintf('%-9s  ', pc));
                            let keys = ['plays', 'retreats', 'killed', 'kills', 'jw', 'jl', 'tw', 'tl', 'steals'];
                            for (let best in keys) {
                                let deed = deeds.find((x) => { return x.deed == keys[best]; });
                                if (deed) {
                                    lib_1.vt.out(sys_1.sprintf('%-22.22s  %-11s %6d ', deed.hero, sys_1.date2full(deed.date).slice(4), deed.value));
                                    q = `SELECT value FROM Deeds WHERE deed='${deed.deed}' GROUP BY value ORDER BY value`;
                                    if (/jw|steals|tw/.test(deed.deed))
                                        q += ' DESC';
                                    q += ' LIMIT 3';
                                    medal = pc_1.Deed.medal[0];
                                    let top3 = db.query(q);
                                    if (top3.length > 0 && deed.value == top3[0].value) {
                                        lib_1.vt.out(lib_1.vt.bright, lib_1.vt.yellow);
                                        medal = pc_1.Deed.medal[1];
                                    }
                                    if (top3.length > 1 && deed.value == top3[1].value) {
                                        lib_1.vt.out(lib_1.vt.bright, lib_1.vt.cyan);
                                        medal = pc_1.Deed.medal[2];
                                    }
                                    if (top3.length > 2 && deed.value == top3[2].value) {
                                        lib_1.vt.out(lib_1.vt.yellow);
                                        medal = pc_1.Deed.medal[3];
                                    }
                                    lib_1.vt.outln(medal, pc_1.Deed.name[deed.deed].description);
                                    lib_1.vt.out('           ');
                                }
                            }
                            lib_1.vt.outln();
                        }
                    }
                suppress = true;
                break;
            case 'H':
                lib_1.vt.outln();
                lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.Magenta, '  HERO                      Date      GOAT        Deed      ');
                lib_1.vt.outln(lib_1.vt.faint, lib_1.vt.Magenta, '------------------------------------------------------------');
                let type = 'GOAT';
                let deeds = pc_1.Deed.load(type);
                if (deeds.length) {
                    let keys = ['plays', 'retreats', 'killed', 'kills', 'jw', 'jl', 'tw', 'tl', 'steals'];
                    for (let goat in keys) {
                        let deed = deeds.find((x) => { return x.deed == keys[goat]; });
                        if (deed) {
                            lib_1.vt.outln(sys_1.sprintf('%-22.22s  %-11s %6d  ', deed.hero, sys_1.date2full(deed.date).slice(4), deed.value), pc_1.Deed.name[deed.deed].description);
                        }
                    }
                }
                lib_1.vt.outln();
                lib_1.vt.outln(lib_1.vt.Magenta, lib_1.vt.yellow, lib_1.vt.bright, '   TOP HERO                Deeds  ');
                lib_1.vt.outln(lib_1.vt.Magenta, lib_1.vt.yellow, '----------------------------------');
                let rd = db.query(`
                    SELECT hero, count(*) AS n FROM Deeds
                    GROUP BY hero HAVING n > 0
                    ORDER BY n DESC LIMIT 10
                `);
                for (let n in rd) {
                    lib_1.vt.outln(sys_1.sprintf('%-22.22s     %4d', rd[n].hero, rd[n].n), ' ', +n < 3 ? pc_1.Deed.medal[+n + 1] : '');
                }
                suppress = true;
                break;
            case 'I':
                lib_1.vt.outln();
                lib_1.vt.outln(lib_1.vt.Black, lib_1.vt.white, lib_1.vt.bright, '   IMMORTAL                Wins   Rolls   Levels  Calls');
                lib_1.vt.outln(lib_1.vt.Black, lib_1.vt.white, '-------------------------------------------------------');
                let rh = db.query(`
                    SELECT handle, wins, immortal, level, calls FROM Players
                    WHERE id NOT GLOB '_*' AND immortal > 0 AND calls > 0
                    ORDER BY immortal DESC, level DESC LIMIT 20
                `);
                for (let n in rh) {
                    lib_1.vt.outln(sys_1.sprintf(`%-22.22s     %3d   %4d ${+n < 3 ? pc_1.Deed.medal[+n + 1] : '  '}  %5.2f  %5d`, rh[n].handle, rh[n].wins, rh[n].immortal, (100 * rh[n].immortal + rh[n].level) / rh[n].calls, rh[n].calls));
                }
                suppress = true;
                break;
            case 'M':
                lib_1.vt.outln();
                lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.Blue, '  Class      OUTSTANDING               Date      BEST                 ');
                lib_1.vt.outln(lib_1.vt.faint, lib_1.vt.Blue, '----------------------------------------------------------------------');
                for (let type in pc_1.PC.name) {
                    for (let pc in pc_1.PC.name[type]) {
                        let deeds = pc_1.Deed.load(pc);
                        if (deeds.length) {
                            lib_1.vt.out(sys_1.sprintf('%-9s  ', pc));
                            let keys = ['levels', 'melee', 'blast', 'big blast'];
                            for (let hurt in keys) {
                                let deed = deeds.find((x) => { return x.deed == keys[hurt]; });
                                if (deed) {
                                    lib_1.vt.out(sys_1.sprintf('%-22.22s  %-11s %6d ', deed.hero, sys_1.date2full(deed.date).slice(4), deed.value));
                                    q = `SELECT value FROM Deeds WHERE deed='${deed.deed}' GROUP BY value ORDER BY value DESC LIMIT 3`;
                                    medal = pc_1.Deed.medal[0];
                                    let top3 = db.query(q);
                                    if (top3.length > 0 && deed.value == top3[0].value) {
                                        lib_1.vt.out(lib_1.vt.bright, lib_1.vt.yellow);
                                        medal = pc_1.Deed.medal[1];
                                    }
                                    if (top3.length > 1 && deed.value == top3[1].value) {
                                        lib_1.vt.out(lib_1.vt.bright, lib_1.vt.cyan);
                                        medal = pc_1.Deed.medal[2];
                                    }
                                    if (top3.length > 2 && deed.value == top3[2].value) {
                                        lib_1.vt.out(lib_1.vt.yellow);
                                        medal = pc_1.Deed.medal[3];
                                    }
                                    lib_1.vt.outln(medal, pc_1.Deed.name[deed.deed].description);
                                    lib_1.vt.out('           ');
                                }
                            }
                            lib_1.vt.outln();
                        }
                    }
                }
                suppress = true;
                break;
            case 'T':
                lib_1.vt.outln();
                lib_1.vt.outln(lib_1.vt.Yellow, lib_1.vt.black, ` ID   Player's Handle           Class    Lvl  Brawls `);
                lib_1.vt.outln(lib_1.vt.Yellow, lib_1.vt.black, '-----------------------------------------------------');
                let rs = db.query(`
                    SELECT id, handle, pc, level, tw FROM Players
                    WHERE xplevel > 1 AND tw > 0
                    ORDER BY tw DESC, level DESC, immortal DESC
                    LIMIT 10
                `);
                for (let n in rs) {
                    lib_1.vt.outln(sys_1.sprintf('%-4s  %-23.23s  %-9s  %3d  %4d', rs[n].id[0] !== '_' ? rs[n].id : ' \u00B7 ', rs[n].handle, rs[n].pc, rs[n].level, rs[n].tw));
                }
                suppress = true;
                break;
            case 'Q':
                require('./menu').menu($.player.expert);
                return;
            case 'W':
                lib_1.vt.outln(lib_1.vt.green, '\n             --=:)) ', lib_1.vt.bright, 'WINNERS', lib_1.vt.normal, ' Only Noted ((:=--\n');
                lib_1.cat('user/winners');
                suppress = true;
                break;
        }
        menu(suppress);
    }
})(Library || (Library = {}));
module.exports = Library;
