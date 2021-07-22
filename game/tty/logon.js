"use strict";
const $ = require("../runtime");
const db = require("../db");
const items_1 = require("../items");
const lib_1 = require("../lib");
const pc_1 = require("../pc");
const player_1 = require("../player");
const sys_1 = require("../sys");
var Logon;
(function (Logon) {
    init();
    lib_1.cat('logon', lib_1.vt.tty == 'door' ? 100 : 5);
    function user(prompt) {
        let retry = 3;
        lib_1.vt.form = {
            0: { cb: who, prompt: `${prompt} ${lib_1.bracket('or NEW', false)}? `, max: 22, timeout: 40 },
            'password': { cb: password, echo: false, max: 26, timeout: 20 },
        };
        function guards() {
            lib_1.vt.beep(true);
            lib_1.vt.outln('Invalid response.');
            lib_1.vt.outln(-400);
            lib_1.vt.drain();
            switch (--retry) {
                case 2:
                    lib_1.vt.outln('The guards eye you suspiciously.');
                    break;
                case 1:
                    lib_1.vt.outln('The guards aim their crossbows at you.');
                    break;
                default:
                    lib_1.vt.profile({ handle: '💀 🏹 💘 🏹 💀', jpg: 'npc/stranger', effect: 'zoomIn' });
                    lib_1.vt.outln('The last thing you ever feel is several quarrels cutting deep into your chest.');
                    lib_1.vt.sound('stranger', 8);
                    lib_1.vt.form = {
                        'forgot': {
                            cb: () => {
                                if (/Y/i.test(lib_1.vt.entry)) {
                                    if ($.player.lastdate != sys_1.now().date)
                                        $.player.today = 0;
                                    $.player.lastdate = sys_1.now().date;
                                    $.player.lasttime = sys_1.now().time;
                                    db.run(`UPDATE Players SET lastdate=${$.player.lastdate},lasttime=${$.player.lasttime},today=${$.player.today} WHERE id='${$.player.id}'`);
                                    $.reason = 'forgot password';
                                    require('../email').resend();
                                    return;
                                }
                                else {
                                    lib_1.vt.outln();
                                    process.exit();
                                }
                            }, prompt: 'DOH!!  Re-send the password to your email account (Y/N)? ', cancel: 'N', enter: 'Y', eol: false, match: /Y|N/i, timeout: 10
                        }
                    };
                    if (!items_1.Access.name[$.player.access].bot && $.player.id && $.player.lastdate != sys_1.now().date) {
                        lib_1.vt.action('yn');
                        lib_1.vt.focus = 'forgot';
                    }
                    else
                        process.exit();
                    return false;
            }
            return true;
        }
        function who() {
            lib_1.vt.outln();
            lib_1.vt.entry = sys_1.titlecase(lib_1.vt.entry);
            if (lib_1.vt.entry[0] == '_') {
                if (guards())
                    lib_1.vt.refocus();
                return;
            }
            if (/new/i.test(lib_1.vt.entry)) {
                pc_1.PC.reroll($.player);
                if (lib_1.vt.tty == 'web') {
                    lib_1.vt.sound('yahoo', 20);
                    require('./newuser');
                }
                else
                    lib_1.emulator(() => { require('./newuser'); });
                return;
            }
            $.player.id = sys_1.titlecase(lib_1.vt.entry);
            if (!pc_1.PC.load($.player)) {
                $.player.id = '';
                $.player.handle = lib_1.vt.entry;
                if (!pc_1.PC.load($.player)) {
                    if (guards())
                        lib_1.vt.refocus();
                    return;
                }
            }
            $.access = items_1.Access.name[$.player.access];
            lib_1.vt.emulation = $.player.emulation;
            $.player.rows = process.stdout.rows || $.player.rows || 24;
            lib_1.vt.form['password'].prompt = `${$.player.handle}, enter your password: `;
            lib_1.vt.focus = 'password';
        }
        function password() {
            lib_1.vt.outln();
            if ($.player.password !== lib_1.vt.entry) {
                if (guards())
                    lib_1.vt.refocus();
                return;
            }
            if ($.player.email == '' && $.access.verify) {
                require('../email');
                return;
            }
            startup();
        }
    }
    Logon.user = user;
    function startup(userID = '') {
        $.whereis = [
            'Braavos', 'Casterly Rock', 'Dorne', 'Dragonstone', 'Dreadfort',
            'The Eyrie', 'Harrenhal', 'Highgarden', 'Iron Island', `King's Landing`,
            'Meereen', 'Norvos', 'Oldtown', 'Pentos', 'Qohor',
            'Riverrun', 'The Twins', 'The Wall', 'Winterfell', 'Volantis'
        ][sys_1.dice(20) - 1];
        if (userID) {
            $.player.id = userID;
            if (!pc_1.PC.load($.player))
                pc_1.PC.reroll($.player);
            if (!$.player.id) {
                if (lib_1.vt.tty == 'door' && $.door.length) {
                    $.player.rows = sys_1.whole($.door[20]) || 24;
                    lib_1.emulator(() => {
                        $.player.id = userID;
                        $.player.name = $.door[9];
                        $.player.remote = $.door[10];
                        require('./newuser');
                        lib_1.vt.ondrop = player_1.logoff;
                    });
                    return;
                }
                else {
                    lib_1.vt.outln(`userID (${userID}) passed not found -- goodbye!`);
                    lib_1.vt.hangup();
                }
            }
            $.access = items_1.Access.name[$.player.access];
        }
        lib_1.vt.title($.player.emulation);
        lib_1.news(`${$.player.handle} ${$.access.emoji} arrived from ${$.whereis} at ${lib_1.time(sys_1.now().time)} as a level ${$.player.level} ${$.player.pc}:`);
        let rs = db.query(`SELECT * FROM Online`);
        for (let row = 0; row < rs.length; row++) {
            let t = sys_1.now().time;
            if ((t = (1440 * (sys_1.now().date - rs[0].lockdate)
                + 60 * ((t / 100 - rs[0].locktime / 100) >> 0)
                + t % 100 - rs[0].locktime % 100)) > 60) {
                db.unlock(rs[row].id);
                lib_1.news(`\tremoved an expired lock: ${rs[row].id} from ${lib_1.time(rs[row].locktime)}`);
            }
            else if (rs[row].id == $.player.id) {
                lib_1.news(`\tkicked simultaneous player off: ${rs[row].id} lock from ${lib_1.time(rs[row].locktime)}`);
                try {
                    process.kill(rs[row].pid, 'SIGHUP');
                    lib_1.vt.outln(lib_1.vt.lcyan, `\nYou're in violation of the space-time continuum: T - ${60 - t} minutes`);
                }
                catch (_a) {
                    db.unlock(rs[row].id);
                }
                $.access.roleplay = false;
                lib_1.vt.carrier = false;
                lib_1.vt.hangup();
            }
        }
        if ($.access.promote > 0 && $.player.level >= $.access.promote) {
            let title = Object.keys(items_1.Access.name).indexOf($.player.access);
            do {
                $.player.access = Object.keys(items_1.Access.name)[++title];
                $.access = items_1.Access.name[$.player.access];
            } while (!$.access[$.player.sex]);
            lib_1.vt.music('promote', 10);
            lib_1.vt.outln();
            if (getRuler()) {
                lib_1.vt.outln(lib_1.vt.yellow, items_1.Access.name[$.king.access][$.king.sex], ' the ', $.king.access.toLowerCase(), ', ', lib_1.vt.bright, $.king.handle, lib_1.vt.normal, ', is pleased to see you return\n', `and ${pc_1.PC.who($.king).he}welcomes you as`, lib_1.vt.bright, sys_1.an($.player.access), lib_1.vt.normal, '!');
                if ($.access.message)
                    lib_1.vt.outln(lib_1.vt.yellow, `${pc_1.PC.who($.king).He}exclaims, `, lib_1.vt.bright, `"${eval('`' + $.access.message + '`')}"`);
            }
            else {
                $.player.access = Object.keys(items_1.Access.name).slice($.player.sex == 'F' ? -2 : -1)[0];
                $.player.novice = false;
                $.sysop.email = $.player.email;
                pc_1.PC.save($.sysop);
                lib_1.vt.outln(lib_1.vt.yellow, 'You are crowned as the ', lib_1.vt.bright, $.player.access, lib_1.vt.normal, ' to rule over this domain.');
            }
            lib_1.vt.outln(-5000);
        }
        if ($.player.lastdate != sys_1.now().date || ($.player.lasttime < 1200 && sys_1.now().time >= 1200))
            $.player.today = 0;
        if ($.player.today > $.access.calls) {
            lib_1.vt.beep(true);
            lib_1.vt.outln(`\nYou played all ${$.access.calls} calls for the ${sys_1.now().time < 1200 ? 'morning' : sys_1.now().time < 1600 ? 'afternoon' : sys_1.now().time < 2000 ? 'evening' : 'night'}.  Please visit again after 12 ${sys_1.now().time < 1200 ? 'noon' : 'midnight'}!`);
            lib_1.vt.sound('comeagain');
            lib_1.news('', true);
            lib_1.vt.hangup();
        }
        lib_1.vt.ondrop = player_1.logoff;
        if (/^([1][0]|[1][2][7]|[1][7][2]|[1][9][2])[.]/.test($.remote) || !$.remote) {
            if ($.player.emulation == 'XT')
                $.whereis += ' 🖥 ';
        }
        else
            try {
                const apikey = sys_1.pathTo('etc', 'ipstack.key');
                const key = sys_1.fs.readFileSync(apikey).toString();
                sys_1.got(`http://api.ipstack.com/${$.remote}?access_key=${key}`).then(response => {
                    $.whereis = '';
                    let result = '';
                    if (response.body) {
                        let ipstack = JSON.parse(response.body);
                        if (ipstack.ip)
                            result = ipstack.ip;
                        if (ipstack.city)
                            result = ipstack.city;
                        if (ipstack.region_code)
                            result += (result ? ', ' : '') + ipstack.region_code;
                        if (ipstack.country_code)
                            result += (result ? ' ' : '') + ipstack.country_code;
                        if (ipstack.location && ipstack.location.country_flag_emoji)
                            result += ` ${ipstack.location.country_flag_emoji} `;
                    }
                    $.whereis += result ? result : $.remote;
                }).catch(error => { $.whereis += ` ⚠️ ${error.message}`; });
            }
            catch (e) { }
        if (sys_1.now().date >= $.sysop.dob) {
            $.sysop.lasttime = sys_1.now().time;
            $.sysop.calls++;
            $.sysop.today++;
            if ($.player.today <= $.access.calls && $.access.roleplay)
                $.sysop.plays++;
        }
        pc_1.PC.save($.sysop);
        getRuler();
        $.access = items_1.Access.name[$.player.access];
        $.player.rows = process.stdout.rows;
        lib_1.vt.cls();
        lib_1.vt.outln(lib_1.vt.red, '--=:))', lib_1.vt.LGradient, lib_1.vt.Red, lib_1.vt.white, lib_1.vt.bright, $.sysop.name, lib_1.vt.reset, lib_1.vt.red, lib_1.vt.RGradient, '((:=--\n');
        lib_1.vt.out(lib_1.vt.cyan, 'Visitor: ', lib_1.vt.white, lib_1.vt.bright, $.sysop.calls.toString(), lib_1.vt.reset, '  -  ');
        if (sys_1.now().date >= $.sysop.dob) {
            lib_1.vt.out(lib_1.vt.faint, $.sysop.plays.toString(), ' plays since ');
            if ($.sysop.who)
                lib_1.vt.out($.sysop.who, ' won');
            else
                lib_1.vt.out('this game started');
        }
        else
            lib_1.vt.out(lib_1.vt.bright, 'new game starts', lib_1.vt.cyan);
        lib_1.vt.outln(' ', sys_1.date2full($.sysop.dob));
        lib_1.vt.outln(lib_1.vt.cyan, 'Last on: ', lib_1.vt.white, lib_1.vt.bright, sys_1.date2full($.player.lastdate), ' ', lib_1.time($.player.lasttime));
        lib_1.vt.outln(lib_1.vt.cyan, ' Online: ', lib_1.vt.white, lib_1.vt.bright, $.player.handle, lib_1.vt.normal, '  -  ', $.whereis);
        lib_1.vt.out(lib_1.vt.cyan, ' Access: ', lib_1.vt.white, lib_1.vt.bright, $.player.access);
        if ($.player.emulation == 'XT' && $.access.emoji)
            lib_1.vt.out(' ', $.access.emoji);
        lib_1.vt.out(lib_1.vt.normal, '  ');
        $.player.today++;
        $.player.lastdate = sys_1.now().date;
        $.player.lasttime = sys_1.now().time;
        $.player.expires = $.player.lastdate + $.sysop.expires;
        pc_1.PC.activate($.online, true);
        pc_1.PC.save();
        $.mydeeds = pc_1.Deed.load($.player.pc);
        welcome();
    }
    Logon.startup = startup;
    function welcome() {
        lib_1.vt.action('yn');
        if ($.player.today <= $.access.calls && ($.player.status == 'jail' || !items_1.Access.name[$.player.access].roleplay)) {
            lib_1.vt.profile({ png: 'npc/jailer', effect: 'fadeIn' });
            lib_1.vt.sound('ddd');
            if ($.player.emulation == 'XT')
                lib_1.vt.out('🔒 ');
            lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.black, '(', lib_1.vt.magenta, 'PRISONER', lib_1.vt.black, ')');
            lib_1.vt.outln(lib_1.vt.red, '\nYou are locked-up in jail.', -1200);
            if ($.access.roleplay && sys_1.dice(2 * $.online.cha) > (10 - 2 * $.player.steal)) {
                let bail = new lib_1.Coin(Math.round(sys_1.money($.player.level) * (101 - $.online.cha) / 100));
                lib_1.vt.outln('\nIt will cost you ', bail.carry(), ' to get bailed-out and to continue play.');
                lib_1.vt.form = {
                    'bail': {
                        cb: () => {
                            lib_1.vt.outln('\n');
                            if (/Y/i.test(lib_1.vt.entry)) {
                                lib_1.vt.sound('click');
                                $.player.coin.value -= bail.value;
                                if ($.player.coin.value < 0) {
                                    $.player.bank.value += $.player.coin.value;
                                    $.player.coin.value = 0;
                                    if ($.player.bank.value < 0) {
                                        $.player.loan.value -= $.player.bank.value;
                                        $.player.bank.value = 0;
                                    }
                                }
                                pc_1.PC.adjust('cha', -(4 - $.player.steal), -sys_1.whole((4 - $.player.steal) / 2));
                                $.player.status = '';
                            }
                            else {
                                lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.red, 'You are left brooding with your fellow cellmates.', -1200);
                                $.access = items_1.Access.name['Prisoner'];
                            }
                            welcome();
                        }, prompt: 'Will you pay (Y/N)? ', cancel: 'N', enter: 'Y', eol: false, match: /Y|N/i, timeout: 50
                    }
                };
                player_1.input('bail');
                return;
            }
            else
                lib_1.vt.sound('boo');
        }
        if ($.player.today <= $.access.calls && $.access.roleplay && $.sysop.dob <= sys_1.now().date) {
            pc_1.PC.portrait({ user: { id: '', pc: $.player.pc, gender: $.player.gender, handle: $.player.handle, level: $.player.level } }, 'fadeIn', ' - Ɗaɳƙ Ɗoɱaiɳ');
            lib_1.vt.sound('welcome');
            lib_1.vt.outln(lib_1.vt.black, lib_1.vt.bright, '(', lib_1.vt.normal, lib_1.vt.white, 'Welcome back, ', $.access[$.player.gender] || 'you', lib_1.vt.black, lib_1.vt.bright, ')');
            lib_1.vt.outln(lib_1.vt.cyan, 'Visit #: ', lib_1.vt.white, lib_1.vt.bright, $.player.calls.toString(), lib_1.vt.reset, '  -  ', lib_1.vt.bright, lib_1.vt.blink, $.access.calls - $.player.today ? lib_1.vt.cyan : lib_1.vt.red, `${$.access.calls - $.player.today}`, lib_1.vt.reset, ' calls remaining');
            lib_1.vt.sessionAllowed = $.access.minutes * 60;
            lastCallers();
            if ($.player.today < 2) {
                if ($.player.blessed) {
                    if (!items_1.Ring.have($.player.rings, items_1.Ring.theOne) && !$.access.sysop) {
                        $.player.blessed = '';
                        lib_1.vt.out(lib_1.vt.yellow, lib_1.vt.bright, '\nYour shining aura ', lib_1.vt.normal, 'fades ', lib_1.vt.faint, 'away.');
                        pc_1.PC.activate($.online);
                    }
                }
                if ($.player.cursed) {
                    if (!$.player.coward || items_1.Ring.have($.player.rings, items_1.Ring.theOne) || $.access.sysop) {
                        $.player.cursed = '';
                        lib_1.vt.out(lib_1.vt.black, lib_1.vt.bright, '\nThe dark cloud has been lifted.');
                        pc_1.PC.activate($.online);
                    }
                }
                $.player.coward = false;
            }
            if ($.player.level < 50 && 2 * $.player.jw < $.player.jl) {
                lib_1.vt.out(lib_1.vt.reset, '\n', lib_1.vt.magenta, 'Helpful: ', lib_1.vt.bright, `Your poor jousting stats have been reset.`);
                $.player.jl = 0;
                $.player.jw = 0;
                lib_1.vt.sound('shimmer', 22);
            }
            if ($.access.sysop) {
                let ring = items_1.Ring.power([], null, 'joust');
                if (($.online.altered = items_1.Ring.wear($.player.rings, ring.name))) {
                    lib_1.getRing('are Ruler and gifted', ring.name);
                    pc_1.PC.saveRing(ring.name, $.player.id, $.player.rings);
                    lib_1.vt.sound('promote', 22);
                }
            }
            lib_1.vt.outln();
            $.player.calls++;
            $.player.plays++;
            $.player.status = '';
            $.player.xplevel = $.player.level;
            $.online.altered = true;
            const play = JSON.parse(sys_1.fs.readFileSync(sys_1.pathTo('etc', 'play.json')));
            Object.assign($, play);
            lib_1.vt.music('logon');
            if ($.player.pc == Object.keys(pc_1.PC.name['player'])[0]) {
                if ($.player.novice) {
                    lib_1.vt.outln();
                    lib_1.cat('intro', 1500);
                }
                lib_1.vt.form = {
                    'pause': { cb: player_1.pickPC, pause: true, timeout: 200 }
                };
                player_1.input('pause');
                return;
            }
        }
        else {
            lib_1.vt.outln(lib_1.vt.black, lib_1.vt.bright, '(', lib_1.vt.yellow, 'VISITING', lib_1.vt.black, ')');
            lib_1.vt.sessionAllowed = 5 * 60;
            $.access.roleplay = false;
            pc_1.PC.save();
            db.unlock($.player.id);
            lib_1.news('', true);
            lastCallers();
            lib_1.vt.wall($.player.handle, `is visiting`);
        }
        lib_1.vt.form = {
            'pause': {
                cb: () => {
                    if (lib_1.cat(`user/${$.player.id}`)) {
                        sys_1.fs.unlink(sys_1.pathTo('files/user', `${$.player.id}.txt`), () => { });
                        player_1.input('pause');
                        return;
                    }
                    lib_1.vt.cls();
                    lib_1.vt.outln(lib_1.vt.blue, '--=:))', lib_1.vt.LGradient, lib_1.vt.Blue, lib_1.vt.cyan, lib_1.vt.bright, 'Announcement', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.RGradient, '((:=--\n');
                    lib_1.cat('announcement');
                    if ($.access.sysop)
                        lib_1.vt.focus = 'announce';
                    else {
                        lib_1.vt.outln('\n', lib_1.vt.cyan, '--=:))', lib_1.vt.LGradient, lib_1.vt.Cyan, lib_1.vt.white, lib_1.vt.bright, 'Auto Message', lib_1.vt.reset, lib_1.vt.cyan, lib_1.vt.RGradient, '((:=--\n');
                        lib_1.cat('user/auto-message');
                        player_1.input('auto', sys_1.dice(1000) == 1 ? 'y' : 'n', 3000);
                    }
                }, pause: true
            },
            'announce': {
                cb: () => {
                    lib_1.vt.outln();
                    if (/Y/i.test(lib_1.vt.entry)) {
                        lib_1.vt.action('freetext');
                        lib_1.vt.focus = 'sysop';
                        return;
                    }
                    lib_1.vt.outln('\n', lib_1.vt.cyan, '--=:))', lib_1.vt.LGradient, lib_1.vt.Cyan, lib_1.vt.white, lib_1.vt.bright, 'Auto Message', lib_1.vt.reset, lib_1.vt.cyan, lib_1.vt.RGradient, '((:=--\n');
                    lib_1.cat('user/auto-message');
                    player_1.input('auto');
                }, prompt: 'Change (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i
            },
            'sysop': {
                cb: () => {
                    if (lib_1.vt.entry)
                        sys_1.fs.writeFileSync(sys_1.pathTo('files', 'announcement.txt'), lib_1.vt.attr(lib_1.vt.magenta, 'Date: ', lib_1.vt.off, sys_1.date2full($.player.lastdate), ' ', lib_1.time($.player.lasttime) + '\n', lib_1.vt.magenta, 'From: ', lib_1.vt.off, $.player.handle, '\n\n', lib_1.vt.bright, lib_1.vt.entry));
                    lib_1.vt.outln('\n', lib_1.vt.cyan, '--=:))', lib_1.vt.LGradient, lib_1.vt.Cyan, lib_1.vt.white, lib_1.vt.bright, 'Auto Message', lib_1.vt.reset, lib_1.vt.cyan, lib_1.vt.RGradient, '((:=--\n');
                    lib_1.cat('user/auto-message');
                    lib_1.vt.action('ny');
                    lib_1.vt.focus = 'auto';
                }, prompt: 'Enter your new announcement', lines: 12
            },
            'auto': {
                cb: () => {
                    lib_1.vt.outln();
                    if (/Y/i.test(lib_1.vt.entry)) {
                        lib_1.vt.action('freetext');
                        player_1.input('user', `Where's my dough, Bert?!\n`);
                        return;
                    }
                    require('./taxman').cityguards();
                }, prompt: 'Update (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i
            },
            'user': {
                cb: () => {
                    lib_1.vt.outln();
                    if (lib_1.vt.entry.length && !sys_1.cuss(lib_1.vt.entry)) {
                        sys_1.fs.writeFileSync(sys_1.pathTo('files/user', 'auto-message.txt'), lib_1.vt.attr(lib_1.vt.cyan, 'Date: ', lib_1.vt.off, sys_1.date2full($.player.lastdate), ' ', lib_1.time($.player.lasttime), '\n', lib_1.vt.cyan, 'From: ', lib_1.vt.off, $.player.handle + '\n\n', lib_1.vt.bright, lib_1.vt.entry));
                        lib_1.news(`\tupdated the auto message to read:\n${lib_1.vt.entry}`);
                    }
                    require('./taxman').cityguards();
                }, prompt: 'Enter your public message', lines: 6
            }
        };
        lib_1.vt.action('ny');
        player_1.input('pause');
    }
    function lastCallers() {
        lib_1.vt.out(lib_1.vt.cyan, '\nLast callers were: ', lib_1.vt.white);
        try {
            $.callers = JSON.parse(sys_1.fs.readFileSync(sys_1.pathTo('users', 'callers.json')).toString());
            for (let last in $.callers) {
                lib_1.vt.outln(lib_1.vt.bright, $.callers[last].who, lib_1.vt.normal, ' (', $.callers[last].reason, ')');
                lib_1.vt.out(-100, '                   ');
            }
        }
        catch (err) {
            lib_1.vt.outln(`not available (${err})`);
        }
    }
    function getRuler() {
        let ruler = Object.keys(items_1.Access.name).slice(-1)[0];
        let rs = db.query(`SELECT id FROM Players WHERE access='${ruler}'`);
        if (rs.length) {
            $.king.id = rs[0].id;
            return pc_1.PC.load($.king);
        }
        ruler = Object.keys(items_1.Access.name).slice(-2)[0];
        rs = db.query(`SELECT id FROM Players WHERE access='${ruler}'`);
        if (rs.length) {
            $.king.id = rs[0].id;
            return pc_1.PC.load($.king);
        }
        return false;
    }
    function init() {
        pc_1.PC.load($.sysop);
        if ($.sysop.lastdate != sys_1.now().date) {
            newDay();
            db.run(`UPDATE Players SET today=0 WHERE id NOT GLOB '_*'`);
        }
        $.player = db.fillUser();
    }
    function newDay() {
        lib_1.vt.out('One moment: [');
        db.run(`UPDATE Players SET bank=bank+coin WHERE id NOT GLOB '_*'`);
        lib_1.vt.out('+');
        db.run(`UPDATE Players SET coin=0`);
        lib_1.vt.out('-');
        let rs = db.query(`SELECT id FROM Players WHERE id NOT GLOB '_*' AND status='' AND (magic=1 OR magic=2) AND bank>9999999 AND level>15`);
        let user = { id: '' };
        for (let row in rs) {
            let altered = false;
            user.id = rs[row].id;
            pc_1.PC.load(user);
            for (let item = 7; item < 15; item++) {
                let cost = user.magic == 1 ? new lib_1.Coin(items_1.Magic.spells[items_1.Magic.merchant[item]].wand)
                    : new lib_1.Coin(items_1.Magic.spells[items_1.Magic.merchant[item]].cost);
                if (user.bank.value >= cost.value && !items_1.Magic.have(user.spells, item)) {
                    items_1.Magic.add(user.spells, item);
                    user.bank.value -= cost.value;
                    altered = true;
                }
            }
            if (altered)
                pc_1.PC.save(user);
        }
        lib_1.vt.out('=');
        rs = db.query(`SELECT id, access, lastdate, level, xplevel, novice, jl, jw, gang FROM Players WHERE id NOT GLOB '_*'`);
        for (let row in rs) {
            if ((rs[row].level == 1 || rs[row].novice) && (rs[row].jl > (2 * rs[row].jw)))
                db.run(`UPDATE Players SET jl=0,jw=0 WHERE id='${rs[row].id}'`);
            if (items_1.Access.name[rs[row].access].bot)
                continue;
            if (!(sys_1.now().date - rs[row].lastdate))
                continue;
            if ((sys_1.now().date - rs[row].lastdate) > 10) {
                if (items_1.Access.name[rs[row].access].roleplay) {
                    if (+rs[row].xplevel > 1) {
                        db.run(`UPDATE Players SET xplevel=1,remote='' WHERE id='${rs[row].id}'`);
                        let p = { id: rs[row].id };
                        pc_1.PC.load(p);
                        require('../email').rejoin(p);
                        lib_1.vt.out('_', -1000);
                        continue;
                    }
                }
                else {
                    db.run(`DELETE FROM Players WHERE id='${rs[row].id}'`);
                    sys_1.fs.unlink(`./files/user/${rs[row].id}.txt`, () => { });
                    lib_1.vt.out('x');
                    continue;
                }
            }
            if ((sys_1.now().date - rs[row].lastdate) > 180) {
                if (rs[row].gang) {
                    let g = pc_1.PC.loadGang(db.query(`SELECT * FROM Gangs WHERE name='${rs[row].gang}'`)[0]);
                    let i = g.members.indexOf(rs[row].id);
                    if (i > 0) {
                        g.members.splice(i, 1);
                        pc_1.PC.saveGang(g);
                    }
                    else {
                        db.run(`UPDATE Players SET gang='' WHERE gang='${g.name}'`);
                        db.run(`DELETE FROM Gangs WHERE name='${g.name}'`);
                        lib_1.vt.out('&');
                    }
                }
                db.run(`DELETE FROM Players WHERE id='${rs[row].id}'`);
                sys_1.fs.unlink(sys_1.pathTo('files/user', `${rs[row].id}.txt`), () => { });
                sys_1.fs.unlink(sys_1.pathTo('users', `.${rs[row].id}.json`), () => { });
                lib_1.vt.out('x');
                continue;
            }
            if ((sys_1.now().date - rs[row].lastdate) % 50 == 0) {
                db.run(`UPDATE Players SET pc='${Object.keys(pc_1.PC.name['player'])[0]}',level=1,xplevel=0,remote='' WHERE id='${rs[row].id}'`);
                let p = { id: rs[row].id };
                pc_1.PC.load(p);
                require('../email').rejoin(p);
                lib_1.vt.sleep(1000);
            }
        }
        try {
            sys_1.fs.renameSync(sys_1.pathTo('files/tavern', 'today.txt'), sys_1.pathTo('files/tavern', 'yesterday.txt'));
            lib_1.vt.out('T');
        }
        catch (e) {
            lib_1.vt.out('?');
        }
        lib_1.vt.out(']');
        $.sysop.lastdate = sys_1.now().date;
        $.sysop.lasttime = sys_1.now().time;
        pc_1.PC.save($.sysop);
        lib_1.vt.outln(lib_1.vt.yellow, lib_1.vt.bright, '*');
        lib_1.vt.beep(true);
        lib_1.vt.outln('All set -- thank you!');
    }
})(Logon || (Logon = {}));
module.exports = Logon;
