"use strict";
const xvt_1 = require("@theflyingape/xvt");
const $ = require("./runtime");
const items_1 = require("./items");
const sys_1 = require("./sys");
var lib;
(function (lib) {
    function armor(profile = $.online, text = false) {
        return text ? profile.user.armor + buff(profile.user.toAC, profile.toAC, true)
            : lib.vt.attr(profile.armor.armoury ? lib.vt.white : profile.armor.dwarf ? lib.vt.yellow : lib.vt.lcyan, profile.user.armor, lib.vt.white, buff(profile.user.toAC, profile.toAC));
    }
    lib.armor = armor;
    function bracket(item, nl = true) {
        const s = item.toString(), i = sys_1.whole(item);
        let framed = lib.vt.attr(lib.vt.off, nl ? '\n' : '');
        if (nl && i >= 0 && i < 10)
            framed += ' ';
        framed += lib.vt.attr(lib.vt.faint, '<', lib.vt.bright, s, lib.vt.faint, '>', nl ? ' ' : '', lib.vt.reset);
        return framed;
    }
    lib.bracket = bracket;
    function buff(perm, temp, text = false) {
        let keep = lib.vt.emulation;
        if (text)
            lib.vt.emulation = 'dumb';
        let buff = '';
        if (perm || temp) {
            buff = lib.vt.attr(lib.vt.normal, lib.vt.magenta, ' (');
            if (perm > 0)
                buff += lib.vt.attr(lib.vt.bright, lib.vt.yellow, '+', perm.toString(), lib.vt.normal, lib.vt.white);
            else if (perm < 0)
                buff += lib.vt.attr(lib.vt.bright, lib.vt.red, perm.toString(), lib.vt.normal, lib.vt.white);
            else
                buff += lib.vt.attr(lib.vt.white, '+0');
            if (temp)
                buff += lib.vt.attr(',', (temp > 0) ? lib.vt.attr(lib.vt.yellow, lib.vt.bright, '+', temp.toString())
                    : lib.vt.attr(lib.vt.red, lib.vt.bright, temp.toString()), lib.vt.normal);
            buff += lib.vt.attr(lib.vt.magenta, ')', lib.vt.white);
        }
        if (text)
            lib.vt.emulation = keep;
        return buff;
    }
    lib.buff = buff;
    function carry(coin = $.player.coin, max = 2) {
        let n = coin.value;
        let bags = [];
        if (coin.pouch(n) == 'p') {
            n = sys_1.int(n / 1e+13);
            bags.push(lib.vt.attr(lib.vt.white, lib.vt.bright, n.toString(), lib.vt.magenta, 'p', lib.vt.normal, lib.vt.white));
            n = coin.value % 1e+13;
        }
        if (coin.pouch(n) == 'g') {
            n = sys_1.int(n / 1e+09);
            bags.push(lib.vt.attr(lib.vt.white, lib.vt.bright, n.toString(), lib.vt.yellow, 'g', lib.vt.normal, lib.vt.white));
            n = coin.value % 1e+09;
        }
        if (coin.pouch(n) == 's') {
            n = sys_1.int(n / 1e+05);
            bags.push(lib.vt.attr(lib.vt.white, lib.vt.bright, n.toString(), lib.vt.cyan, 's', lib.vt.normal, lib.vt.white));
            n = coin.value % 1e+05;
        }
        if ((n > 0 && coin.pouch(n) == 'c') || bags.length == 0)
            bags.push(lib.vt.attr(lib.vt.white, lib.vt.bright, n.toString(), lib.vt.red, 'c', lib.vt.normal, lib.vt.white));
        return bags.slice(0, max).toString();
    }
    lib.carry = carry;
    function cat(name, delay = $.player.expert ? 2 : 40) {
        const file = sys_1.pathTo('files', name);
        let filename = file + (lib.vt.emulation == 'PC' ? '.ibm' : lib.vt.emulation == 'XT' ? '.ans' : '.txt');
        let output = [];
        try {
            sys_1.fs.accessSync(filename, sys_1.fs.constants.F_OK);
            output = sys_1.fs.readFileSync(filename, lib.vt.emulation == 'XT' ? 'utf8' : 'binary').toString().split('\n');
        }
        catch (e) {
            filename = file + (lib.vt.emulation == 'PC' ? '.ans' : '.txt');
            try {
                sys_1.fs.accessSync(filename, sys_1.fs.constants.F_OK);
                output = sys_1.fs.readFileSync(filename, lib.vt.emulation == 'XT' ? 'utf8' : 'binary').toString().split('\n');
            }
            catch (e) {
                lib.vt.out(lib.vt.off);
                return false;
            }
        }
        for (let line in output)
            lib.vt.out(output[line], '\n', -delay);
        lib.vt.out(lib.vt.off, -delay);
        return true;
    }
    lib.cat = cat;
    function death(by, killed = false) {
        $.reason = by;
        lib.vt.profile({ handle: `💀 ${$.reason} 💀`, png: `death${$.player.today}`, effect: 'fadeInDownBig' });
        if (killed) {
            $.online.hp = 0;
            $.online.sp = 0;
            $.player.killed++;
            lib.vt.music();
            lib.vt.sound('killed', 11);
        }
        $.online.altered = true;
    }
    lib.death = death;
    function display(title, back, fore, suppress, menu, hint) {
        menu['Q'] = {};
        if (!suppress) {
            lib.vt.cls();
            if (!cat(`${title}/menu`)) {
                lib.vt.out('    ');
                if (back)
                    lib.vt.out(fore, '--=:))', lib.vt.LGradient, back, lib.vt.white, lib.vt.bright, sys_1.titlecase(title), lib.vt.reset, fore, lib.vt.RGradient, '((:=--');
                else
                    lib.vt.out(sys_1.titlecase(title));
                lib.vt.outln('\n');
                for (let i in menu) {
                    if (menu[i].description)
                        lib.vt.outln(lib.vt.faint, fore, '<', lib.vt.white, lib.vt.bright, i, lib.vt.faint, fore, '> ', lib.vt.reset, menu[i].description);
                }
            }
            else {
                if (title == 'main')
                    cat('user/border');
            }
        }
        if (process.stdout.rows && process.stdout.rows !== $.player.rows) {
            if (!$.player.expert)
                lib.vt.out('\n', lib.vt.yellow, lib.vt.Empty, lib.vt.bright, `Resetting your USER ROW setting (${$.player.rows}) to detected size ${process.stdout.rows}`, lib.vt.reset);
            $.player.rows = process.stdout.rows;
        }
        if (hint && $.access.roleplay && sys_1.dice(+$.player.expert * ($.player.immortal + 1) + $.player.level / 10) == 1)
            lib.vt.out('\n', lib.vt.green, lib.vt.bright, hint, lib.vt.reset);
        lib.vt.out('\x06');
        return lib.vt.attr(fore, '[', lib.vt.yellow, lib.vt.bright, back ? sys_1.titlecase(title) : 'Iron Bank', lib.vt.normal, fore, ']', lib.vt.faint, ' Option ', lib.vt.normal, lib.vt.cyan, '(Q=Quit): ');
    }
    lib.display = display;
    function door(user) {
        $.door = [];
        try {
            $.door = sys_1.fs.readFileSync(user).toString().split('\r\n');
        }
        catch (_a) { }
        return $.door;
    }
    lib.door = door;
    function emulator(cb) {
        lib.vt.action('list');
        lib.vt.form = {
            'term': {
                cb: () => {
                    if (lib.vt.entry && lib.vt.entry.length == 2)
                        lib.vt.emulation = lib.vt.entry.toUpperCase();
                    $.player.emulation = lib.vt.emulation;
                    if (lib.vt.tty == 'telnet')
                        lib.vt.outln(`@vt.title(${$.player.emulation})`, -100);
                    lib.vt.outln('\n', lib.vt.reset, lib.vt.magenta, lib.vt.LGradient, lib.vt.reverse, 'BANNER', lib.vt.noreverse, lib.vt.RGradient);
                    lib.vt.outln(lib.vt.red, 'R', lib.vt.green, 'G', lib.vt.blue, 'B', lib.vt.reset, lib.vt.bright, ' bold ', lib.vt.normal, 'normal', lib.vt.blink, ' flash ', lib.vt.noblink, lib.vt.faint, 'dim');
                    lib.vt.out(lib.vt.yellow, 'Cleric: ', lib.vt.bright, { VT: '\x1B(0\x7D\x1B(B', PC: '\x9C', XT: '✟', dumb: '$' }[$.player.emulation], lib.vt.normal, lib.vt.magenta, '  Teleport: ', lib.vt.bright, { VT: '\x1B(0\x67\x1B(B', PC: '\xF1', XT: '↨', dumb: '%' }[$.player.emulation]);
                    $.online.altered = true;
                    if ($.player.emulation == 'XT') {
                        lib.vt.outln(lib.vt.lblack, '  Bat: 🦇');
                        lib.vt.sound('yahoo', 22);
                        cb();
                        return;
                    }
                    lib.vt.outln(-2000);
                    lib.vt.beep();
                    if (process.stdout.rows && process.stdout.rows !== $.player.rows)
                        $.player.rows = process.stdout.rows;
                    for (let rows = $.player.rows + 5; rows > 1; rows--)
                        lib.vt.out(bracket(rows >= 24 ? rows : '..'));
                    lib.vt.form['rows'].prompt = lib.vt.attr('Enter top visible row number ', lib.vt.faint, '[', lib.vt.reset, lib.vt.bright, `${$.player.rows < 24 ? '24' : $.player.rows}`, lib.vt.cyan, lib.vt.faint, ']', lib.vt.reset, ': ');
                    prompt('rows');
                }, prompt: lib.vt.attr('Select ', lib.vt.faint, '[', lib.vt.reset, lib.vt.bright, `${$.player.emulation}`, lib.vt.cyan, lib.vt.faint, ']', lib.vt.reset, ': '),
                cancel: 'VT', enter: $.player.emulation, match: /VT|PC|XT/i, max: 2
            },
            'rows': {
                cb: () => {
                    const n = sys_1.whole(lib.vt.entry);
                    if (n > 23)
                        $.player.rows = n;
                    lib.vt.outln();
                    prompt('pause');
                }, enter: `${$.player.rows < 24 ? '24' : $.player.rows}`, max: 2, match: /^[2-9][0-9]$/
            },
            'pause': { cb: cb, pause: true }
        };
        lib.vt.outln('\n', lib.vt.cyan, 'Which emulation / character encoding are you using?');
        lib.vt.out(bracket('VT'), ' classic VT terminal with DEC drawing (telnet b&w)');
        lib.vt.out(bracket('PC'), ' former ANSI color with Western IBM CP850 (telnet color)');
        lib.vt.outln(bracket('XT'), ' modern ANSI color with UTF-8 & emojis (browser multimedia)');
        prompt('term');
    }
    lib.emulator = emulator;
    function getRing(how, what) {
        lib.vt.profile({ jpg: `ring/${what}`, handle: `${what} ${items_1.Ring.name[what].emoji}💍 ring`, effect: 'tada' });
        lib.vt.outln();
        lib.vt.out(lib.vt.yellow, lib.vt.bright, 'You ', how, sys_1.an(what, false));
        lib.vt.out(lib.vt.cyan, what, lib.vt.normal);
        if ($.player.emulation == 'XT')
            lib.vt.out(' ', items_1.Ring.name[what].emoji, '💍');
        lib.vt.out(' ring', lib.vt.reset, ', which can\n', lib.vt.yellow, lib.vt.bright, items_1.Ring.name[what].description);
    }
    lib.getRing = getRing;
    function log(who, message) {
        if (who.length && who[0] !== '_' && who !== $.player.id)
            sys_1.fs.appendFileSync(sys_1.pathTo(sys_1.LOG, `${who}.txt`), `${message}\n`);
    }
    lib.log = log;
    function news(message, commit = false) {
        const log = sys_1.pathTo(sys_1.NEWS, `${$.player.id}.txt`);
        try {
            if ($.access.roleplay) {
                sys_1.fs.appendFileSync(log, `${message}\n`);
                if (message && commit) {
                    sys_1.fs.appendFileSync(sys_1.pathTo(sys_1.NEWS, 'today.txt'), sys_1.fs.readFileSync(log));
                }
            }
            if (commit)
                sys_1.fs.unlink(log, () => { });
        }
        catch (err) {
            lib.vt.outln('news error:', err);
        }
    }
    lib.news = news;
    function pieces(p = this.pouch($.player.coin)) {
        return 'pouch of ' + (lib.vt.emulation == 'XT' ? '💰 ' : '') + {
            'p': lib.vt.attr(lib.vt.magenta, lib.vt.bright, 'platinum', lib.vt.normal),
            'g': lib.vt.attr(lib.vt.yellow, lib.vt.bright, 'gold', lib.vt.normal),
            's': lib.vt.attr(lib.vt.cyan, lib.vt.bright, 'silver', lib.vt.normal),
            'c': lib.vt.attr(lib.vt.red, lib.vt.bright, 'copper', lib.vt.normal)
        }[p] + lib.vt.attr(' pieces', lib.vt.reset);
    }
    lib.pieces = pieces;
    function prompt(focus, input = '', speed = 5) {
        if ($.access.bot)
            lib.vt.form[focus].delay = speed < 100 ? 125 * sys_1.dice(speed) * sys_1.dice(speed) : speed;
        lib.vt.focus = focus;
        if ($.access.bot)
            setImmediate(() => {
                let data = '';
                try {
                    const cr = (typeof lib.vt.form[focus].eol == 'undefined' || lib.vt.form[focus].eol || lib.vt.form[focus].lines);
                    data += input;
                    if (cr || !input)
                        data += sys_1.dice(100) > 1 ? '\r' : '\x1B';
                }
                catch (_a) {
                    data += sys_1.dice(100) > 1 ? '\x1B' : '\r';
                }
                process.stdin.emit('data', data);
            });
    }
    lib.prompt = prompt;
    function rings(profile = $.online) {
        for (let i in profile.user.rings) {
            let ring = profile.user.rings[i];
            lib.vt.out(lib.vt.cyan, $.player.emulation == 'XT' ? '⍤' : lib.vt.Empty, ' ', lib.vt.bright, ring, lib.vt.normal, ' ');
            if ($.player.emulation == 'XT')
                lib.vt.out(items_1.Ring.name[ring].emoji, '💍');
            lib.vt.outln('ring:', lib.vt.reset, ' can ', items_1.Ring.name[ring].description, -100);
        }
    }
    lib.rings = rings;
    function time(t) {
        const ap = t < 1200 ? 'am' : 'pm';
        const m = t % 100;
        const h = sys_1.int((t < 100 ? t + 1200 : t >= 1300 ? t - 1200 : t) / 100);
        return sys_1.sprintf('%u:%02u%s', h, m, ap);
    }
    lib.time = time;
    function tradein(retail, percentage = $.online.cha) {
        const worth = new items_1.Coin(retail);
        percentage -= 10;
        return sys_1.whole(worth.value * percentage / 100);
    }
    lib.tradein = tradein;
    function weapon(profile = $.online, text = false) {
        return text ? profile.user.weapon + buff(profile.user.toWC, profile.toWC, true)
            : lib.vt.attr(profile.weapon.shoppe ? lib.vt.white : profile.weapon.dwarf ? lib.vt.yellow : lib.vt.lcyan, profile.user.weapon, lib.vt.white, buff(profile.user.toWC, profile.toWC));
    }
    lib.weapon = weapon;
    class _xvt extends xvt_1.default {
        constructor() {
            super(...arguments);
            this.tty = 'telnet';
        }
        beep(bell = false) {
            if (bell || lib.vt.emulation !== 'XT')
                lib.vt.out('\x07', -100);
            else
                lib.vt.sound('max', 1);
        }
        checkTime() {
            return Math.round((this.sessionAllowed - ((new Date().getTime() - this.sessionStart.getTime()) / 1000)) / 60);
        }
        cls() {
            const rows = process.stdout.rows || 24;
            const scroll = sys_1.whole((this.row < rows ? this.row : rows) - (this.col == 1 ? 2 : 1));
            this.plot(rows, 1);
            this.outln(this.off, '\n'.repeat(scroll), -10);
            this.out(this.clear, -10);
        }
        action(menu) {
            if (this.tty == 'web')
                this.out(`@action(${menu})`);
        }
        animated(effect, sync = 2) {
            if (this.tty == 'web')
                this.out(`@animated(${effect})`, -10 * sync);
        }
        music(tune = '.', sync = 2) {
            if (this.tty == 'web')
                this.out(`@tune(${tune})`, -10 * sync);
        }
        profile(params) {
            if (this.tty == 'web')
                this.out(`@profile(${JSON.stringify(params)})`);
        }
        sound(effect = '.', sync = 2) {
            if (this.tty == 'web')
                this.out(`@play(${effect})`);
            else
                this.beep(true);
            this.sleep(100 * sync);
        }
        title(name) {
            if (this.emulation == 'XT')
                this.out(`\x1B]2;${name}\x07`);
            if (this.tty == 'web')
                this.out(`@title(${name})`);
        }
        wall(who, msg) {
            if (this.tty !== 'door')
                this.out(`@wall(${who} ${msg})`);
        }
    }
    lib.vt = new _xvt('VT', false);
})(lib || (lib = {}));
module.exports = lib;
