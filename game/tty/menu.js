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
var Main;
(function (Main) {
    let mainmenu = {
        '@': { description: 'Sysop' },
        'A': { description: 'Arena: Fight and Joust' },
        'D': { description: 'Deep Dank Dungeon' },
        'G': { description: 'Gambling Casino' },
        'L': { description: 'Library: Halls of History' },
        'M': { description: 'Most Wanted List' },
        'N': { description: 'Naval Adventures' },
        'P': { description: 'Party/Gang Wars' },
        'R': { description: 'Rob/Burglarize other users' },
        'S': { description: 'Public Square (Shops, etc.)' },
        'T': { description: `Tiny's Tavern` },
        'U': { description: 'User Configuration' },
        'X': { description: 'terminate: Reroll character' },
        'Y': { description: 'Your Statistics' },
        'Z': { description: 'System Status' }
    };
    lib_1.vt.profile({ png: 'castle', effect: 'pulse' });
    lib_1.vt.wall($.player.handle, `logged on as a level ${$.player.level} ${$.player.pc}`);
    lib_1.vt.outln();
    lib_1.cat('user/border');
    if ($.access.bot) {
        if (sys_1.dice(39) == 1)
            $.border = true;
        $.access.sysop = true;
    }
    function menu(suppress = true) {
        if (player_1.checkXP($.online, menu))
            return;
        if ($.online.altered)
            pc_1.PC.save();
        if ($.reason)
            lib_1.vt.hangup();
        if (!suppress)
            lib_1.vt.profile({ png: ['castle', 'joust', 'dragon'][sys_1.dice(3) - 1], effect: 'pulse' });
        npc_1.elemental.orders('MainMenu');
        lib_1.vt.form = {
            'menu': { cb: choice, cancel: 'Q', enter: '?', eol: false }
        };
        lib_1.vt.form['menu'].prompt =
            lib_1.vt.attr('Time Left: ', lib_1.vt.white, lib_1.vt.bright, lib_1.vt.checkTime().toString(), lib_1.vt.normal, lib_1.vt.cyan, ' min.\n', lib_1.vt.reset)
                + lib_1.display('main', lib_1.vt.Blue, lib_1.vt.blue, suppress, mainmenu);
        player_1.input('menu');
    }
    Main.menu = menu;
    function choice() {
        var _a;
        let suppress = false;
        let choice = lib_1.vt.entry.toUpperCase();
        if ((_a = mainmenu[choice]) === null || _a === void 0 ? void 0 : _a.description) {
            lib_1.vt.out(' - ', mainmenu[choice].description);
            suppress = $.player.expert;
        }
        lib_1.vt.outln();
        switch (choice) {
            case '@':
                if ($.access.sysop) {
                    lib_1.vt.animated('fadeOut');
                    require('./sysop').menu($.player.expert);
                    return;
                }
            case 'A':
                lib_1.vt.animated('fadeOut');
                require('./arena').menu($.player.expert);
                return;
            case 'D':
                if ($.dungeon) {
                    lib_1.vt.music();
                    pc_1.PC.portrait($.online, 'backOutDown');
                    lib_1.vt.sound(`dt${$.dungeon}`, 10);
                    $.dungeon--;
                    require('./dungeon').DeepDank($.player.level - 1, menu);
                }
                else {
                    lib_1.vt.outln('\nYou have run out of dungeon turns.');
                    suppress = true;
                    break;
                }
                return;
            case 'G':
                lib_1.vt.animated('fadeOut');
                npc_1.elemental.orders('Casino');
                require('./casino').menu(false);
                return;
            case 'L':
                lib_1.vt.animated('fadeOut');
                require('./library').menu(false);
                return;
            case 'M':
                lib_1.vt.outln();
                lib_1.vt.outln('  ', lib_1.vt.bright, $.player.emulation == 'XT' ? lib_1.vt.Blue : lib_1.vt.white, ` ID   Player's Handle           Class    Lvl  Status  Party                 `);
                lib_1.vt.outln('  ', $.player.emulation == 'XT' ? lib_1.vt.Blue : lib_1.vt.faint, '----------------------------------------------------------------------------');
                let top3 = {};
                let rs = db.query(`
                    SELECT hero, count(*) AS n FROM Deeds
                    GROUP BY hero HAVING n > 0
                    ORDER BY n DESC LIMIT 3
                `);
                for (let n in rs)
                    top3[rs[n].hero] = pc_1.Deed.medal[+n + 1];
                rs = db.query(`
                    SELECT id, handle, pc, level, xplevel, status, gang, access FROM Players
                    WHERE id NOT GLOB '_*' AND (id = '${$.player.id}' OR level > 1)
                    ORDER BY xplevel DESC, level DESC, wins DESC, immortal DESC
                    LIMIT ${$.player.rows - 5}
                `);
                for (let n in rs) {
                    lib_1.vt.out(top3[rs[n].handle] || '  ');
                    if (rs[n].pc == pc_1.PC.winning)
                        lib_1.vt.out(lib_1.vt.yellow, lib_1.vt.bright);
                    else if (rs[n].id == $.player.id)
                        lib_1.vt.out(lib_1.vt.bright);
                    if (rs[n].xplevel < rs[n].level)
                        lib_1.vt.out(lib_1.vt.faint);
                    lib_1.vt.out(sys_1.sprintf('%-4s  %-22.22s  %-9s  %3d  ', rs[n].id, rs[n].handle, rs[n].pc, rs[n].xplevel));
                    if (!rs[n].status.length)
                        lib_1.vt.out('Alive!');
                    else {
                        if ($.player.emulation == 'XT')
                            lib_1.vt.out(rs[n].status == 'jail' ? '🔒' : '🍺', lib_1.vt.faint, rs[n].status == 'jail' ? 'jail' : 'beer');
                        else
                            lib_1.vt.out(lib_1.vt.faint, rs[n].status == 'jail' ? '#jail#' : '^beer^');
                    }
                    lib_1.vt.out('  ', rs[n].id == $.player.id ? lib_1.vt.bright : lib_1.vt.normal);
                    if (rs[n].gang == $.player.gang)
                        lib_1.vt.out(lib_1.vt.Red);
                    lib_1.vt.outln(rs[n].gang);
                }
                suppress = true;
                break;
            case 'N':
                lib_1.vt.animated('fadeOut');
                npc_1.elemental.orders('Naval');
                require('./naval').menu($.player.expert);
                return;
            case 'P':
                lib_1.vt.animated('fadeOut');
                require('./party').menu($.player.expert);
                return;
            case 'Q':
                lib_1.vt.beep(true);
                lib_1.vt.action('ny');
                lib_1.vt.form = {
                    'yn': {
                        cb: () => {
                            lib_1.vt.outln();
                            if (/Y/i.test(lib_1.vt.entry)) {
                                if (!$.reason.length)
                                    $.reason = $.access.roleplay ? 'had something better to do' : 'caught lurking';
                                lib_1.vt.hangup();
                            }
                            menu();
                        }, prompt: 'Are you sure (Y/N)? ', cancel: 'Y', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                    }
                };
                lib_1.vt.sound('oops');
                player_1.input('yn', 'y');
                return;
            case 'R':
                if (!$.access.roleplay)
                    break;
                lib_1.vt.outln();
                if (!$.rob) {
                    lib_1.vt.outln('\nYou have run out of rob attempts.');
                    suppress = true;
                    break;
                }
                if ($.player.novice) {
                    lib_1.vt.outln('Novice players cannot rob.');
                    suppress = true;
                    break;
                }
                lib_1.vt.outln(lib_1.vt.faint, 'It is a hot, moonless night.', -600);
                lib_1.vt.outln('A city guard walks down another street.', -600);
                let self = lib_1.tradein(new lib_1.Coin($.online.armor.value).value, $.online.cha);
                self += lib_1.tradein(new lib_1.Coin($.online.weapon.value).value, $.online.cha);
                self += $.player.coin.value + $.player.bank.value - $.player.loan.value;
                self = sys_1.int(self / (6 + $.player.steal));
                Battle.user('Rob', (opponent) => {
                    lib_1.vt.outln();
                    if (opponent.user.id == $.player.id) {
                        opponent.user.id = '';
                        lib_1.vt.outln(`You can't rob yourself.`);
                    }
                    else if (opponent.user.novice) {
                        opponent.user.id = '';
                        lib_1.vt.outln(`You can't rob novice players.`);
                    }
                    else if ($.player.level - opponent.user.level > 3) {
                        opponent.user.id = '';
                        lib_1.vt.outln('You can only rob someone higher or up to three levels below you.');
                    }
                    if (opponent.user.id == '') {
                        menu();
                        return;
                    }
                    if (!db.lock(opponent.user.id)) {
                        lib_1.vt.beep();
                        lib_1.vt.outln(`${pc_1.PC.who(opponent).He}is currently engaged elsewhere and not available.`);
                        menu();
                        return;
                    }
                    $.rob--;
                    lib_1.vt.outln(lib_1.vt.faint, `You case ${opponent.user.handle}'s joint out.`, -600);
                    let prize = lib_1.tradein(new lib_1.Coin(items_1.Armor.name[opponent.user.armor].value).value, $.online.cha);
                    prize += lib_1.tradein(new lib_1.Coin(items_1.Weapon.name[opponent.user.weapon].value).value, $.online.cha);
                    if ($.dungeon && opponent.user.cannon)
                        prize += sys_1.money(opponent.user.level);
                    if ($.arena)
                        prize += opponent.user.coin.value;
                    prize = sys_1.int(prize / (6 - $.player.steal));
                    if (sys_1.dice($.online.int) > 5 && prize < self) {
                        lib_1.vt.outln('But you decide it is not worth the effort.', -600);
                        menu();
                        return;
                    }
                    lib_1.vt.action('clear');
                    lib_1.vt.music('steal', 6);
                    lib_1.vt.profile({ jpg: 'rob', effect: 'fadeInDown' });
                    lib_1.vt.outln(lib_1.vt.faint, lib_1.vt.cyan, 'The goods are in', -250, lib_1.vt.normal, sys_1.an(opponent.user.realestate), -500, lib_1.vt.faint, ' protected by', -250, lib_1.vt.normal, sys_1.an(opponent.user.security), lib_1.vt.faint, '.');
                    lib_1.vt.sleep(2000);
                    lib_1.vt.out(lib_1.vt.cyan, '\nYou slide into ', -200, lib_1.vt.faint, 'the shadows and ', -400, lib_1.vt.white, 'make your attempt ', lib_1.vt.blue, -600);
                    let lock = 5 *
                        (items_1.Security.name[opponent.user.security].protection + +(opponent.user.status !== 'jail'))
                        + items_1.RealEstate.name[opponent.user.realestate].protection
                        + opponent.user.steal + +!$.arena + +!$.dungeon;
                    let skill = Math.round($.player.steal * $.online.dex * $.online.int / 10000);
                    let effort = 100
                        - items_1.Ring.power(opponent.user.rings, $.player.rings, 'steal').power
                        + items_1.Ring.power($.player.rings, opponent.user.rings, 'steal').power;
                    for (let pick = 0; pick < $.player.steal; pick++) {
                        lib_1.vt.out('.');
                        lib_1.vt.sound('click', 6);
                        skill += sys_1.dice(100 + $.player.steal) < effort
                            ? sys_1.dice($.player.level + $.player.steal - $.steal)
                            : lock;
                    }
                    lib_1.vt.outln(-300);
                    if ($.player.email == opponent.user.email || !db.lock(opponent.user.id)) {
                        $.player.coward = true;
                        skill = 0;
                    }
                    if (skill > lock) {
                        if (!items_1.Ring.have($.player.rings, items_1.Ring.theOne))
                            $.steal++;
                        if (!$.arena || !$.dungeon)
                            $.steal++;
                        $.player.coin.value += prize;
                        $.player.steals++;
                        lib_1.vt.outln('You break in and make off with ', new lib_1.Coin(prize).carry(), ' worth of stuff!');
                        lib_1.vt.sound('max', 12);
                        if ($.arena)
                            opponent.user.coin.value = 0;
                        if (opponent.armor.ac > 0) {
                            if (opponent.armor.ac > items_1.Armor.merchant.length)
                                opponent.armor.ac = sys_1.int(items_1.Armor.merchant.length * 3 / 5);
                            opponent.armor.ac--;
                        }
                        else
                            opponent.armor.ac = 0;
                        opponent.user.armor = items_1.Armor.merchant[opponent.armor.ac];
                        opponent.user.toAC = 0;
                        if (opponent.weapon.wc > 0) {
                            if (opponent.weapon.wc > items_1.Weapon.merchant.length)
                                opponent.weapon.wc = sys_1.int(items_1.Weapon.merchant.length * 3 / 5);
                            opponent.weapon.wc--;
                        }
                        else
                            opponent.weapon.wc = 0;
                        opponent.user.weapon = items_1.Weapon.merchant[opponent.weapon.wc];
                        opponent.user.toWC = 0;
                        if (opponent.user.cannon)
                            opponent.user.cannon--;
                        pc_1.PC.save(opponent);
                        lib_1.news(`\trobbed ${opponent.user.handle}`);
                        lib_1.log(opponent.user.id, `\n${$.player.handle} robbed you!`);
                    }
                    else {
                        lib_1.vt.beep();
                        lib_1.log(opponent.user.id, `\n${$.player.handle} was caught robbing you!`);
                        $.reason = `caught robbing ${opponent.user.handle}`;
                        $.player.status = 'jail';
                        lib_1.vt.action('clear');
                        lib_1.vt.profile({ png: 'npc/city_guard_2', effect: 'fadeIn' });
                        lib_1.vt.outln('A city guard catches you and throws you into jail!');
                        lib_1.vt.sound('arrested', 20);
                        lib_1.vt.outln('You might be released by your next call.\n', -1000);
                    }
                    menu();
                });
                return;
            case 'S':
                lib_1.vt.animated('fadeOut');
                require('./square').menu($.player.expert);
                return;
            case 'T':
                if (!$.tiny) {
                    lib_1.vt.outln(`\nThe tavern is closed for the day.`);
                    suppress = true;
                    break;
                }
                lib_1.vt.animated('fadeOut');
                lib_1.vt.music('tavern' + sys_1.dice(4));
                require('./tavern').menu($.player.expert);
                return;
            case 'U':
                lib_1.vt.music();
                lib_1.vt.action('ny');
                let newpassword = '';
                lib_1.vt.form = {
                    'yn': {
                        cb: () => {
                            lib_1.vt.outln();
                            if (lib_1.vt.entry.toUpperCase() == 'Y') {
                                lib_1.vt.focus = 'new';
                                return;
                            }
                            lib_1.emulator(menu);
                        }, prompt: 'Change your password (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                    },
                    'new': {
                        cb: () => {
                            if (lib_1.vt.entry.length < 4) {
                                lib_1.vt.beep();
                                menu();
                                return;
                            }
                            newpassword = lib_1.vt.entry;
                            lib_1.vt.form['check'].max = lib_1.vt.entry.length;
                            lib_1.vt.focus = 'check';
                        }, prompt: 'Enter new password: ', echo: false, max: 26
                    },
                    'check': {
                        cb: () => {
                            if (lib_1.vt.entry == newpassword) {
                                $.player.password = newpassword;
                                pc_1.PC.save();
                                lib_1.vt.out('...saved...');
                            }
                            else {
                                lib_1.vt.beep();
                                lib_1.vt.out('...aborted...');
                            }
                            lib_1.emulator(menu);
                        }, prompt: 'Re-enter to verify: ', echo: false
                    }
                };
                player_1.input('yn');
                return;
            case 'X':
                if (!$.access.roleplay)
                    break;
                pc_1.PC.portrait($.online);
                lib_1.vt.music('ddd');
                lib_1.vt.action('ny');
                lib_1.vt.form = {
                    'yn': {
                        cb: () => {
                            if (/Y/i.test(lib_1.vt.entry)) {
                                pc_1.PC.reroll($.player);
                                pc_1.PC.activate($.online);
                                $.player.coward = true;
                                $.player.plays++;
                                pc_1.PC.save();
                                lib_1.vt.outln();
                                player_1.pickPC();
                                return;
                            }
                            lib_1.vt.outln();
                            menu();
                        }, prompt: 'Reroll (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                    }
                };
                player_1.input('yn');
                return;
            case 'Y':
                let cost = new lib_1.Coin(new lib_1.Coin(sys_1.int(sys_1.money($.player.level) / 5)).carry(1, true));
                lib_1.vt.form = {
                    'yn': {
                        cb: () => {
                            if (/Y/i.test(lib_1.vt.entry)) {
                                $.player.coin.value -= cost.value;
                                if ($.player.coin.value < 0) {
                                    $.player.bank.value += $.player.coin.value;
                                    $.player.coin.value = 0;
                                    if ($.player.bank.value < 0) {
                                        $.player.loan.value -= $.player.bank.value;
                                        $.player.bank.value = 0;
                                    }
                                }
                                lib_1.vt.outln();
                                Battle.user('Scout', (opponent) => {
                                    if (opponent.user.id) {
                                        pc_1.PC.status(opponent);
                                        lib_1.vt.action('freetext');
                                        lib_1.vt.refocus();
                                    }
                                    else
                                        menu(true);
                                });
                                return;
                            }
                            pc_1.PC.status($.online);
                            suppress = true;
                            menu();
                        }, cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                    }
                };
                if ($.access.roleplay) {
                    lib_1.vt.action('ny');
                    lib_1.vt.form['yn'].prompt = 'Scout other users for ' + cost.carry() + ' (Y/N)? ';
                    player_1.input('yn', 'n', 2);
                    return;
                }
                else
                    pc_1.PC.status($.online);
                suppress = true;
                break;
            case 'Z':
                lib_1.vt.outln();
                lib_1.vt.out(lib_1.vt.green, lib_1.vt.bright);
                lib_1.cat('main/system', 100);
                lib_1.vt.action('ny');
                lib_1.vt.form = {
                    'yn': {
                        cb: () => {
                            if (/Y/i.test(lib_1.vt.entry)) {
                                let razz = pc_1.PC.encounter();
                                player_1.input('message', [
                                    `${$.player.handle} does it better`,
                                    `Barbarians burn bright!`,
                                    `Gone fishin' with Solcat`,
                                    `Light it up!`,
                                    `Stupid is as stupid does`,
                                    `Where's my dough Bert??!`,
                                    `You're cracked`,
                                    `${razz.user.handle} ${[
                                        `needs`, `can use`, `should buy`
                                    ][sys_1.dice(3) - 1]} ${[
                                        `penicillin for ${razz.who['his']}partying`,
                                        `a new lance`,
                                        `polish for ${razz.who['his']}${razz.user.weapon}}`,
                                        'a mask',
                                        `a clue as ${sys_1.an(razz.user.pc)}`,
                                        'a friend',
                                        'a lesson',
                                        'a beer'
                                    ][sys_1.dice(8) - 1]}`
                                ][sys_1.dice(8) - 1]);
                            }
                            else {
                                lib_1.vt.outln();
                                menu(true);
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
                                sys_1.fs.writeFileSync(sys_1.pathTo('files/user', 'border.txt'), lib_1.vt.entry);
                                lib_1.news(`\tupdated the border to:\n${lib_1.vt.entry}`);
                                $.border = false;
                            }
                            menu(true);
                        }, prompt: '>', max: 78
                    }
                };
                if ($.border) {
                    lib_1.vt.form['yn'].prompt = `Change border message (Y/N)? `;
                    player_1.input('yn', 'ny'[sys_1.int($.border)]);
                    return;
                }
                suppress = true;
                break;
        }
        menu(suppress);
    }
})(Main || (Main = {}));
module.exports = Main;
