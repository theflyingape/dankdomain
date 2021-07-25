"use strict";
const $ = require("./runtime");
const db = require("./db");
const items_1 = require("./items");
const lib_1 = require("./lib");
const npc_1 = require("./npc");
const pc_1 = require("./pc");
const sys_1 = require("./sys");
var player;
(function (player) {
    function checkXP(rpc, cb) {
        $.jumped = 0;
        let t = lib_1.vt.checkTime();
        if (t !== $.timeleft) {
            $.timeleft = t;
            if ($.timeleft < 0) {
                if ($.online.hp > 0)
                    $.online.hp = 0;
                $.reason = $.reason || 'got exhausted';
            }
            else if ($.timeleft <= $.warning) {
                $.warning = $.timeleft;
                lib_1.vt.outln();
                lib_1.vt.beep();
                lib_1.vt.outln(lib_1.vt.bright, ` *** `, lib_1.vt.faint, `${$.warning}-minute${$.warning !== 1 ? 's' : ''} remain${$.warning == 1 ? 's' : ''}`, lib_1.vt.bright, ` *** `, -100);
                lib_1.vt.sound('hurry', 4);
            }
        }
        if (!items_1.Access.name[rpc.user.access].roleplay)
            return false;
        if (rpc.user.level >= $.sysop.level) {
            riddle();
            return true;
        }
        if (rpc.user.xp < pc_1.PC.experience(rpc.user.level, 1, rpc.user.int)) {
            rpc.user.xplevel = rpc.user.level;
            return false;
        }
        $.reason = '';
        lib_1.vt.drain();
        let award = {
            hp: rpc.user.hp,
            sp: rpc.user.sp,
            str: rpc.user.str,
            int: rpc.user.int,
            dex: rpc.user.dex,
            cha: rpc.user.cha
        };
        let eligible = rpc.user.level < $.sysop.level / 2;
        let bonus = false;
        let started = rpc.user.xplevel || rpc.user.level;
        while (rpc.user.xp >= pc_1.PC.experience(rpc.user.level, undefined, rpc.user.int) && rpc.user.level < $.sysop.level) {
            rpc.user.level++;
            if (rpc.user.level == items_1.Access.name[rpc.user.access].promote) {
                lib_1.vt.music('promote');
                let title = Object.keys(items_1.Access.name).indexOf(rpc.user.access);
                do {
                    rpc.user.access = Object.keys(items_1.Access.name)[++title];
                } while (!items_1.Access.name[rpc.user.access][rpc.user.sex]);
                lib_1.vt.outln(-500);
                lib_1.vt.outln(lib_1.vt.yellow, items_1.Access.name[$.king.access][$.king.sex], ' the ', $.king.access.toLowerCase(), ', ', lib_1.vt.bright, $.king.handle, lib_1.vt.normal, ', is pleased with your accomplishments\n', `and ${pc_1.PC.who($.king).he}promotes you to`, lib_1.vt.bright, sys_1.an(rpc.user.access), lib_1.vt.normal, '!', -2000);
                if (items_1.Access.name[rpc.user.access].message)
                    lib_1.vt.outln(lib_1.vt.yellow, `${pc_1.PC.who($.king).He}whispers, `, lib_1.vt.reset, lib_1.vt.faint, `"${eval('`' + items_1.Access.name[rpc.user.access].message + '`')}"`, -2000);
                let nme = pc_1.PC.encounter(`AND id NOT GLOB '_*' AND id != '${$.king.id}'`);
                lib_1.vt.outln(`The mob goes crazy`, -500, nme.user.id
                    ? `, except for ${nme.user.handle} seen buffing ${nme.who.his}${lib_1.weapon(nme)}`
                    : `!!`, -2000);
                lib_1.vt.outln([`${$.taxman.user.handle} nods an approval.`, `${$.barkeep.user.handle} slaughters a pig for tonight's feast.`, `${$.king.handle} gives you a hug.`, `${items_1.Access.name[$.king.access][$.king.sex]}'s guard salute you.`, `${$.king.handle} orders ${pc_1.PC.who($.king).his}Executioner to hang ${$.player.level} prisoners in your honor.`][sys_1.dice(5) - 1], -2000);
                lib_1.news(`\tpromoted to ${rpc.user.access}`);
                lib_1.vt.wall($.player.handle, `promoted to ${rpc.user.access}`);
                lib_1.vt.sessionAllowed += 300;
            }
            rpc.user.hp += pc_1.PC.hp(rpc.user);
            rpc.user.sp += pc_1.PC.sp(rpc.user);
            pc_1.PC.adjust('str', 0, pc_1.PC.card(rpc.user.pc).toStr, 0, rpc);
            pc_1.PC.adjust('int', 0, pc_1.PC.card(rpc.user.pc).toInt, 0, rpc);
            pc_1.PC.adjust('dex', 0, pc_1.PC.card(rpc.user.pc).toDex, 0, rpc);
            pc_1.PC.adjust('cha', 0, pc_1.PC.card(rpc.user.pc).toCha, 0, rpc);
            if (eligible && rpc.user.level == 50) {
                bonus = true;
                lib_1.vt.music();
                if (rpc.user.novice) {
                    pc_1.PC.portrait();
                    pc_1.PC.reroll(rpc.user, $.sysop.pc, rpc.user.level);
                    rpc.user.novice = false;
                    rpc.user.expert = true;
                    lib_1.vt.outln(lib_1.vt.cyan, lib_1.vt.bright, 'You are no longer a novice.  Welcome to the next level of play!');
                    lib_1.vt.sound('welcome', 9);
                    lib_1.vt.outln('You morph into', lib_1.vt.yellow, sys_1.an(rpc.user.pc), lib_1.vt.reset, '.', -600);
                    lib_1.vt.sound('cheer', 21);
                }
                lib_1.vt.sound('demon', 17);
                break;
            }
        }
        $.jumped = rpc.user.level - started;
        award.hp = rpc.user.hp - award.hp;
        award.sp = rpc.user.sp - award.sp;
        rpc.hp += award.hp;
        rpc.sp += award.sp;
        if ((award.str = rpc.user.str - award.str) < 1)
            award.str = 0;
        if ((award.int = rpc.user.int - award.int) < 1)
            award.int = 0;
        if ((award.dex = rpc.user.dex - award.dex) < 1)
            award.dex = 0;
        if ((award.cha = rpc.user.cha - award.cha) < 1)
            award.cha = 0;
        pc_1.PC.adjust('str', (award.str < 1) ? $.jumped : award.str, 0, 0, rpc);
        pc_1.PC.adjust('int', (award.int < 1) ? $.jumped : award.int, 0, 0, rpc);
        pc_1.PC.adjust('dex', (award.dex < 1) ? $.jumped : award.dex, 0, 0, rpc);
        pc_1.PC.adjust('cha', (award.cha < 1) ? $.jumped : award.cha, 0, 0, rpc);
        if (rpc != $.online)
            return false;
        lib_1.vt.sound('level');
        $.access = items_1.Access.name[$.player.access];
        $.online.altered = true;
        lib_1.vt.outln(-125);
        lib_1.vt.outln('      ', lib_1.vt.magenta, '-=', lib_1.vt.blue, '>', lib_1.vt.bright, lib_1.vt.yellow, '*', lib_1.vt.normal, lib_1.vt.blue, '<', lib_1.vt.magenta, '=-', -125);
        lib_1.vt.outln(-125);
        lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.yellow, 'Welcome to level ', $.player.level.toString(), '!', -125);
        lib_1.vt.outln(-125);
        lib_1.vt.wall($.player.handle, `is now a level ${$.player.level} ${$.player.pc}`);
        let deed = $.mydeeds.find((x) => { return x.deed == 'levels'; });
        if (!$.player.novice && !deed)
            deed = $.mydeeds[$.mydeeds.push(pc_1.Deed.load($.player.pc, 'levels')[0]) - 1];
        if ((deed && $.jumped >= deed.value)) {
            deed.value = $.jumped;
            lib_1.vt.outln(lib_1.vt.cyan, ' + ', lib_1.vt.bright, pc_1.Deed.name[deed.deed].description, ' ', lib_1.bracket(deed.value, false));
            lib_1.vt.beep();
            pc_1.Deed.save(deed, $.player);
        }
        if ($.player.level < $.sysop.level) {
            lib_1.vt.outln(lib_1.vt.bright, sys_1.sprintf('%+6d', award.hp), lib_1.vt.reset, ' Hit points', -100);
            if (award.sp)
                lib_1.vt.outln(lib_1.vt.bright, sys_1.sprintf('%+6d', award.sp), lib_1.vt.reset, ' Spell points', -100);
            if (award.str)
                lib_1.vt.outln(lib_1.vt.bright, sys_1.sprintf('%+6d', award.str), lib_1.vt.reset, ' Strength', -100);
            if (award.int)
                lib_1.vt.outln(lib_1.vt.bright, sys_1.sprintf('%+6d', award.int), lib_1.vt.reset, ' Intellect', -100);
            if (award.dex)
                lib_1.vt.outln(lib_1.vt.bright, sys_1.sprintf('%+6d', award.dex), lib_1.vt.reset, ' Dexterity', -100);
            if (award.cha)
                lib_1.vt.outln(lib_1.vt.bright, sys_1.sprintf('%+6d', award.cha), lib_1.vt.reset, ' Charisma', -100);
            if (eligible && bonus) {
                skillplus(rpc, cb);
                return true;
            }
            $.player.xplevel = $.player.level;
        }
        else {
            riddle();
            return true;
        }
        return false;
    }
    player.checkXP = checkXP;
    function input(focus, input = npc_1.elemental.cmd, speed = 7) {
        lib_1.prompt(focus, input, speed);
    }
    player.input = input;
    function logoff() {
        if (!$.reason || $.reason == 'hangup') {
            pc_1.PC.load($.sysop);
            if ($.sysop.dob <= sys_1.now().date) {
                if ($.access.roleplay) {
                    $.player.coward = true;
                    $.player.lasttime = sys_1.now().time;
                    pc_1.PC.adjust('str', -1, -1, -1);
                    pc_1.PC.adjust('int', -1, -1, -1);
                    pc_1.PC.adjust('dex', -1, -1, -1);
                    pc_1.PC.adjust('cha', -1, -1, -1);
                }
                $.reason = lib_1.vt.reason || 'mystery';
            }
            else {
                pc_1.PC.load($.player);
                $.player.lasttime = sys_1.now().time;
                $.access.roleplay = false;
                lib_1.news(`\tonline player dropped by ${$.sysop.who} ${lib_1.time($.player.lasttime)} (${$.reason})\n`, true);
            }
        }
        if ($.player.id) {
            if ($.access.roleplay) {
                if ($.from == 'Dungeon' && $.online.hp > 0) {
                    pc_1.PC.adjust('cha', -1, -1, -1);
                    $.player.coin = new items_1.Coin(0);
                    if (lib_1.vt.checkTime() >= 0) {
                        if ($.player.coward && !$.player.cursed) {
                            $.player.blessed = '';
                            $.player.cursed = $.player.id;
                        }
                        $.player.coward = true;
                    }
                }
                if ($.player.lastdate != sys_1.now().date || ($.player.lasttime < 1200 && sys_1.now().time >= 1200))
                    $.player.today = 0;
                $.player.lasttime = sys_1.now().time;
                $.player.remote = $.remote;
                pc_1.PC.save($.player, false, true);
                lib_1.news(`\treturned to ${$.whereis} at ${lib_1.time($.player.lasttime)} as a level ${$.player.level} ${$.player.pc}`);
                lib_1.news(`\t(${$.reason})\n`, true);
                const callers = sys_1.pathTo('users', 'callers.json');
                try {
                    $.callers = JSON.parse(sys_1.fs.readFileSync(callers).toString());
                }
                catch (e) { }
                while ($.callers.length > 7)
                    $.callers.pop();
                $.callers = [{ who: $.player.handle, reason: $.reason }].concat($.callers);
                sys_1.fs.writeFileSync(callers, JSON.stringify($.callers));
            }
            db.unlock($.player.id, true);
            db.unlock($.player.id);
            lib_1.vt.carrier = true;
            lib_1.vt.wall($.player.handle, `logged off: ${$.reason}`);
            lib_1.vt.save();
            lib_1.vt.out(`\x1B[1;${$.player.rows}r`);
            lib_1.vt.restore();
            lib_1.vt.outln(-100, '\x06');
            if ($.online.hp < 1)
                lib_1.vt.sound('goodbye');
            else {
                if ($.player.plays)
                    lib_1.vt.sound($.online.hull < 1 ? 'comeagain' : 'invite');
                pc_1.PC.portrait($.online);
            }
            lib_1.vt.outln(-200, 'Goodbye, please play again! Also visit: ', -300);
            lib_1.vt.out(lib_1.vt.cyan, '  ___                               ___  \n');
            lib_1.vt.out('  \\_/   ', lib_1.vt.red, lib_1.vt.LGradient, lib_1.vt.bright, lib_1.vt.Red, lib_1.vt.white, 'Never Program Mad', lib_1.vt.reset, lib_1.vt.red, lib_1.vt.RGradient, lib_1.vt.cyan, '   \\_/  \n');
            lib_1.vt.out(' _(', lib_1.vt.bright, '-', lib_1.vt.normal, ')_     ', lib_1.vt.reset, ' https://npmjs.com    ', lib_1.vt.cyan, '  _(', lib_1.vt.bright, '-', lib_1.vt.normal, ')_ \n');
            lib_1.vt.out('(/ ', lib_1.vt.emulation == 'XT' ? lib_1.vt.attr(lib_1.vt.faint, '⚨', lib_1.vt.normal) : ':', ' \\)                          ', lib_1.vt.cyan, ' (/ ', lib_1.vt.emulation == 'XT' ? lib_1.vt.attr(lib_1.vt.faint, '⚨', lib_1.vt.normal) : ':', ' \\)\n');
            lib_1.vt.out('I\\___/I    ', lib_1.vt.green, lib_1.vt.LGradient, lib_1.vt.bright, lib_1.vt.Green, lib_1.vt.white, `RAH-CoCo's`, lib_1.vt.reset, lib_1.vt.green, lib_1.vt.RGradient, lib_1.vt.cyan, '     I\\___/I\n');
            lib_1.vt.out('\\/   \\/ ', lib_1.vt.reset, '   http://rb.gy/bruelx  ', lib_1.vt.cyan, '  \\/   \\/\n');
            lib_1.vt.out(' \\ : /                           ', lib_1.vt.cyan, '  \\ : / \n');
            lib_1.vt.out('  I:I     ', lib_1.vt.blue, lib_1.vt.LGradient, lib_1.vt.bright, lib_1.vt.Blue, lib_1.vt.white, `${lib_1.vt.emulation == 'XT' ? 'ℝ' : 'R'}ober${lib_1.vt.emulation == 'XT' ? 'ƭ ℍ' : 't H'}urs${lib_1.vt.emulation == 'XT' ? 'ƭ' : 't'}`, lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.RGradient, lib_1.vt.cyan, '      I:I  \n');
            lib_1.vt.outln(' .I:I. ', lib_1.vt.reset, '   https://www.DDgame.us   ', lib_1.vt.cyan, ' .I:I.');
            lib_1.vt.outln(-400);
            lib_1.vt.outln(lib_1.vt.black, lib_1.vt.bright, lib_1.vt.emulation == 'XT' ? process.title : 'DDplay', ' running on ', lib_1.vt.green, 'Node.js ', lib_1.vt.normal, process.version, lib_1.vt.reset, lib_1.vt.faint, ' (', lib_1.vt.cyan, process.platform, lib_1.vt.white, lib_1.vt.faint, ')', -1965);
            if ($.access.roleplay && $.player.today && $.player.level > 1)
                lib_1.vt.music($.online.hp > 0 ? 'logoff' : 'death');
        }
        else
            lib_1.vt.sound('invite');
    }
    player.logoff = logoff;
    function pickPC(points = 200, immortal = false) {
        lib_1.vt.music('reroll');
        if (points > 240)
            points = 240;
        lib_1.vt.outln(-1000);
        if (!items_1.Access.name[$.player.access].roleplay)
            return;
        if ($.player.novice) {
            const novice = Object.assign({}, JSON.parse(sys_1.fs.readFileSync(sys_1.pathTo('characters', 'novice.json'))));
            pc_1.PC.reroll($.player, novice.pc);
            Object.assign($.player, novice);
            $.player.coin = new items_1.Coin(novice.coin.toString());
            $.player.bank = new items_1.Coin(novice.bank.toString());
            lib_1.vt.outln('Since you are a new user here, you are automatically assigned a character', -1000);
            lib_1.vt.out('class.  At the Main Menu, press ', lib_1.bracket('Y', false), ' to see all your character information.', -1000);
            show();
            pc_1.PC.activate($.online);
            lib_1.news(`Welcome a ${$.player.pc} player, ${$.player.handle}`);
            require('./tty/menu').menu(true);
            return;
        }
        else {
            lib_1.vt.sessionAllowed += 300;
            $.warning = 2;
        }
        lib_1.vt.action('list');
        lib_1.vt.form = {
            'pc': { cb: pick, min: 1, max: 2, cancel: '!' },
            'str': { cb: ability, min: 2, max: 2, match: /^[2-8][0-9]$/ },
            'int': { cb: ability, min: 2, max: 2, match: /^[2-8][0-9]$/ },
            'dex': { cb: ability, min: 2, max: 2, match: /^[2-8][0-9]$/ },
            'cha': { cb: ability, min: 2, max: 2, match: /^[2-8][0-9]$/ }
        };
        let a = { str: 20, int: 20, dex: 20, cha: 20 };
        if (immortal) {
            show();
            ability('str');
            return;
        }
        lib_1.vt.profile({ jpg: 'classes', handle: 'Reroll!', effect: 'tada' });
        lib_1.vt.outln($.player.pc, ', you have been rerolled. ', -500, ' You must pick a class.');
        lib_1.vt.outln(-1000);
        lib_1.vt.outln(lib_1.vt.cyan, '      Character                       ', lib_1.vt.faint, '>> ', lib_1.vt.normal, 'Ability bonus');
        lib_1.vt.outln(lib_1.vt.cyan, '        Class      Users  Difficulty  Str  Int  Dex  Cha     Notable Feature');
        lib_1.vt.out(lib_1.vt.cyan, lib_1.vt.faint, '      ---------     ---   ----------  ---  ---  ---  ---  ---------------------');
        let classes = [''];
        let n = 0;
        for (let pc in pc_1.PC.name['player']) {
            let rpc = pc_1.PC.card(pc);
            if (++n > 2) {
                if ($.player.keyhints.indexOf(pc, 12) < 0) {
                    lib_1.vt.out(lib_1.bracket(classes.length));
                    classes.push(pc);
                }
                else {
                    const framed = n < 12
                        ? lib_1.vt.attr(lib_1.vt.faint, ' <', lib_1.vt.red, 'x')
                        : lib_1.vt.attr(lib_1.vt.faint, '<', lib_1.vt.red, 'xx');
                    lib_1.vt.out('\n', framed, lib_1.vt.white, '> ');
                }
                let rs = db.query(`SELECT COUNT(id) AS n FROM Players WHERE pc='${pc}' and id NOT GLOB '_*'`)[0];
                lib_1.vt.out(sys_1.sprintf(' %-9s  %s  %3s    %-8s    +%s   +%s   +%s   +%s  %s', pc, $.player.emulation == 'XT' ? rpc.unicode : ' ', +rs.n ? rs.n : lib_1.vt.attr(lib_1.vt.blue, '  ', lib_1.vt.Empty, lib_1.vt.white), rpc.difficulty, lib_1.vt.attr([lib_1.vt.white, lib_1.vt.green, lib_1.vt.cyan, lib_1.vt.magenta][rpc.toStr - 1], rpc.toStr.toString(), lib_1.vt.white), lib_1.vt.attr([lib_1.vt.white, lib_1.vt.green, lib_1.vt.cyan, lib_1.vt.magenta][rpc.toInt - 1], rpc.toInt.toString(), lib_1.vt.white), lib_1.vt.attr([lib_1.vt.white, lib_1.vt.green, lib_1.vt.cyan, lib_1.vt.magenta][rpc.toDex - 1], rpc.toDex.toString(), lib_1.vt.white), lib_1.vt.attr([lib_1.vt.white, lib_1.vt.green, lib_1.vt.cyan, lib_1.vt.magenta][rpc.toCha - 1], rpc.toCha.toString(), lib_1.vt.white), rpc.specialty));
            }
        }
        lib_1.vt.outln();
        lib_1.vt.form['pc'].prompt = `Enter class (1-${(classes.length - 1)}): `;
        input('pc', sys_1.dice(classes.length - 1).toString(), 5000);
        function show() {
            lib_1.vt.profile({
                png: 'player/' + $.player.pc.toLowerCase() + ($.player.gender == 'F' ? '_f' : ''),
                handle: $.player.handle, level: $.player.level, pc: $.player.pc, effect: 'zoomInDown'
            });
            lib_1.vt.outln(-1000);
            lib_1.cat('player/' + $.player.pc.toLowerCase());
            lib_1.vt.outln(-1000);
            let rpc = pc_1.PC.card($.player.pc);
            for (let l = 0; l < rpc.description.length; l++)
                lib_1.vt.outln(lib_1.vt.cyan, lib_1.vt.bright, rpc.description[l], -500);
        }
        function pick() {
            let n = sys_1.whole(lib_1.vt.entry);
            if (n < 1 || n >= classes.length) {
                lib_1.vt.beep();
                lib_1.vt.refocus();
                return;
            }
            lib_1.vt.outln(' - ', classes[n]);
            pc_1.PC.reroll($.player, classes[n]);
            show();
            ability('str');
        }
        function ability(field) {
            if (field) {
                lib_1.vt.out('\n', lib_1.vt.yellow, 'You have ', lib_1.vt.bright, points.toString(), lib_1.vt.normal, ' points to distribute between 4 abilities: Strength, Intellect,\n');
                lib_1.vt.outln('Dexterity, Charisma.  Each ability must be between ', lib_1.vt.bright, '20', lib_1.vt.normal, ' and ', lib_1.vt.bright, '80', lib_1.vt.normal, ' points.');
                if ($.player.immortal < 3) {
                    lib_1.vt.outln('\nThis tracks how hard a character hits. Characters with higher Strength gain');
                    lib_1.vt.outln('more Hit Points when advancing in Experience Levels. More Strength yields more');
                    lib_1.vt.outln('damage in melee attacks.');
                }
                lib_1.vt.form[field].enter = $.player.str.toString();
                lib_1.vt.form[field].cancel = lib_1.vt.form[field].enter;
                lib_1.vt.form[field].prompt = 'Enter your Strength  ' + lib_1.bracket($.player.str, false) + ': ';
                input(field);
                return;
            }
            let n = sys_1.whole(lib_1.vt.entry);
            if (n < 20 || n > 80) {
                lib_1.vt.beep();
                lib_1.vt.refocus();
                return;
            }
            let left = points;
            let p = lib_1.vt.focus;
            switch (p) {
                case 'str':
                    left -= n;
                    a.str = n;
                    if ($.player.immortal < 3) {
                        lib_1.vt.outln('\n\nThis statistic comes into play mainly in casting and resisting magic. It is also');
                        lib_1.vt.outln(`calculated into approximating an opponent's Hit Points and ability to remember`);
                        lib_1.vt.outln('visited dungeon levels. Bonus Spell Power is awarded to those with a high');
                        lib_1.vt.out('Intellect upon gaining a level.');
                    }
                    p = 'int';
                    lib_1.vt.form[p].prompt = 'Enter your Intellect';
                    lib_1.vt.form[p].enter = $.player.int.toString();
                    lib_1.vt.form[p].cancel = lib_1.vt.form[p].enter;
                    break;
                case 'int':
                    left -= a.str + n;
                    a.int = n;
                    if ($.player.immortal < 3) {
                        lib_1.vt.outln('\n\nYour overall fighting ability is measured by how dexterous you are. It is used');
                        lib_1.vt.outln('to calculate who gets the first attack in a battle round, whether a hit was');
                        lib_1.vt.out('made, jousting ability, and in other applicable instances.');
                    }
                    p = 'dex';
                    lib_1.vt.form[p].prompt = 'Enter your Dexterity';
                    lib_1.vt.form[p].enter = $.player.dex.toString();
                    lib_1.vt.form[p].cancel = lib_1.vt.form[p].enter;
                    break;
                case 'dex':
                    left -= a.str + a.int + n;
                    if (left < 20 || left > 80) {
                        lib_1.vt.beep();
                        lib_1.vt.outln();
                        pc_1.PC.reroll($.player, $.player.pc);
                        ability('str');
                        return;
                    }
                    a.dex = n;
                    if ($.player.immortal < 3) {
                        lib_1.vt.outln('\n\nA high Charisma will get you more money when selling items in the Square and');
                        lib_1.vt.outln('from defeated foes. Some of the random events that occur tend to favor those');
                        lib_1.vt.out('with a high Charisma as well.');
                    }
                    p = 'cha';
                    lib_1.vt.form[p].prompt = 'Enter your Charisma ';
                    lib_1.vt.form[p].enter = left.toString();
                    lib_1.vt.form[p].cancel = lib_1.vt.form[p].enter;
                    break;
                case 'cha':
                    left -= a.str + a.int + a.dex + n;
                    if (left) {
                        lib_1.vt.beep();
                        pc_1.PC.reroll($.player, $.player.pc);
                        ability('str');
                        return;
                    }
                    a.cha = n;
                    $.player.str = a.str;
                    $.player.int = a.int;
                    $.player.dex = a.dex;
                    $.player.cha = a.cha;
                    pc_1.PC.activate($.online);
                    lib_1.vt.outln();
                    pc_1.PC.save();
                    lib_1.news(`\trerolled as${sys_1.an($.player.pc)}`);
                    if (immortal) {
                        $.online.hp = 0;
                        $.reason = 'became immortal';
                        lib_1.vt.hangup();
                    }
                    else {
                        lib_1.vt.outln(-600);
                        lib_1.vt.outln(lib_1.vt.yellow, '... ', lib_1.vt.bright, 'and you get to complete any remaining parts to this play.', -600);
                        require('./tty/menu').menu(true);
                    }
                    return;
            }
            lib_1.vt.outln('\n\nYou have ', lib_1.vt.bright, left.toString(), lib_1.vt.normal, ' ability points left.', -600);
            lib_1.vt.form[p].prompt += ' ' + lib_1.bracket(lib_1.vt.form[p].enter, false) + ': ';
            input(p);
        }
    }
    player.pickPC = pickPC;
    function skillplus(rpc, cb) {
        pc_1.PC.portrait($.online);
        rpc.user.expert = true;
        lib_1.vt.outln(-500);
        let hero = ` ${$.player.emulation == 'XT' ? pc_1.PC.card($.player.pc).unicode : '+'} `;
        lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.yellow, hero, lib_1.vt.normal, 'You earn a gift to endow your ', lib_1.vt.faint, rpc.user.pc, lib_1.vt.normal, ' character', lib_1.vt.bright, hero, -1000);
        lib_1.vt.outln(-500);
        lib_1.vt.drain();
        if (rpc.user.maxstr < 97 || rpc.user.maxint < 97 || rpc.user.maxdex < 97 || rpc.user.maxcha < 97)
            lib_1.vt.outln(lib_1.bracket(0, false), lib_1.vt.yellow, ' Increase ALL abilities by ', lib_1.vt.reset, '+3', -125);
        lib_1.vt.outln(lib_1.bracket(1, false), lib_1.vt.yellow, ' Increase Strength ability from ', lib_1.vt.reset, rpc.user.maxstr.toString(), ' ', rpc.user.maxstr < 90 ? '[WEAK]'
            : rpc.user.maxstr < 95 ? '-Average-'
                : rpc.user.maxstr < 99 ? '=Strong='
                    : '#MAX#', -125);
        lib_1.vt.outln(lib_1.bracket(2, false), lib_1.vt.yellow, ' Increase Intellect ability from ', lib_1.vt.reset, rpc.user.maxint.toString(), ' ', rpc.user.maxint < 90 ? '[MORON]'
            : rpc.user.maxint < 95 ? '-Average-'
                : rpc.user.maxint < 99 ? '=Smart='
                    : '#MAX#', -125);
        lib_1.vt.outln(lib_1.bracket(3, false), lib_1.vt.yellow, ' Increase Dexterity ability from ', lib_1.vt.reset, rpc.user.maxdex.toString(), ' ', rpc.user.maxdex < 90 ? '[SLOW]'
            : rpc.user.maxdex < 95 ? '-Average-'
                : rpc.user.maxdex < 99 ? '=Swift='
                    : '#MAX#', -125);
        lib_1.vt.outln(lib_1.bracket(4, false), lib_1.vt.yellow, ' Increase Charisma ability from ', lib_1.vt.reset, rpc.user.maxcha.toString(), ' ', rpc.user.maxcha < 90 ? '[SURLY]'
            : rpc.user.maxcha < 95 ? '-Average-'
                : rpc.user.maxcha < 99 ? '=Affable='
                    : '#MAX#', -125);
        lib_1.vt.outln(lib_1.bracket(5, false), lib_1.vt.yellow, ' Improve Melee skill from ', lib_1.vt.reset, rpc.user.melee.toString(), 'x ', ['[POOR]', '-Average-', '+Good+', '=Masterful=', '#MAX#'][rpc.user.melee], -125);
        lib_1.vt.outln(lib_1.bracket(6, false), lib_1.vt.yellow, ' Improve Backstab skill from ', lib_1.vt.reset, rpc.user.backstab.toString(), 'x ', ['[RARE]', '-Average-', '+Good+', '=Masterful=', '#MAX#'][rpc.user.backstab], -125);
        lib_1.vt.outln(lib_1.bracket(7, false), lib_1.vt.yellow, ' Improve Poison skill from ', lib_1.vt.reset, rpc.user.poison.toString(), 'x ', ['[BAN]', '-Average-', '+Good+', '=Masterful=', '#MAX#'][rpc.user.poison], -125);
        if (rpc.user.magic < 2) {
            lib_1.vt.out(lib_1.bracket(8, false), lib_1.vt.yellow, ' Improve Magic skill from ', lib_1.vt.reset);
            lib_1.vt.out(['[BAN]', '-Wands-'][rpc.user.magic]);
        }
        else {
            lib_1.vt.out(lib_1.bracket(8, false), lib_1.vt.yellow, ' Increase Mana power for ', lib_1.vt.reset);
            lib_1.vt.out(['+Scrolls+', '=Spells=', '#MAX#'][rpc.user.magic - 2]);
        }
        lib_1.vt.outln(-125);
        lib_1.vt.outln(lib_1.bracket(9, false), lib_1.vt.yellow, ' Improve Stealing skill from ', lib_1.vt.reset, rpc.user.steal.toString(), 'x ', ['[RARE]', '-Average-', '+Good+', '=Masterful=', '#MAX#'][rpc.user.steal], -125);
        lib_1.vt.action('list');
        lib_1.vt.form = {
            'skill': {
                cb: () => {
                    lib_1.vt.out('\n', lib_1.vt.bright);
                    switch (+lib_1.vt.entry) {
                        case 0:
                            lib_1.news('\tgot generally better');
                            pc_1.PC.adjust('str', 3, 3, 3);
                            pc_1.PC.adjust('int', 3, 3, 3);
                            pc_1.PC.adjust('dex', 3, 3, 3);
                            pc_1.PC.adjust('cha', 3, 3, 3);
                            break;
                        case 1:
                            lib_1.news('\tcan get even Stronger');
                            if (($.player.maxstr += 10) > 100)
                                $.player.maxstr = 100;
                            lib_1.vt.out(lib_1.vt.red, `Maximum Strength is now ${$.player.maxstr}.`);
                            break;
                        case 2:
                            lib_1.news('\tcan get even Wiser');
                            if (($.player.maxint += 10) > 100)
                                $.player.maxint = 100;
                            lib_1.vt.out(lib_1.vt.green, `Maximum Intellect is now ${$.player.maxint}.`);
                            break;
                        case 3:
                            lib_1.news('\tcan get even Quicker');
                            if (($.player.maxdex += 10) > 100)
                                $.player.maxdex = 100;
                            lib_1.vt.out(lib_1.vt.magenta, `Maximum Dexterity is now ${$.player.maxdex}.`);
                            break;
                        case 4:
                            lib_1.news('\tcan get even Nicer');
                            if (($.player.maxcha += 10) > 100)
                                $.player.maxcha = 100;
                            lib_1.vt.out(lib_1.vt.yellow, `Maximum Charisma is now ${$.player.maxcha}.`);
                            break;
                        case 5:
                            if ($.player.melee > 3) {
                                lib_1.vt.refocus();
                                return;
                            }
                            lib_1.news('\tgot Milk');
                            lib_1.vt.out([lib_1.vt.cyan, lib_1.vt.blue, lib_1.vt.red, lib_1.vt.yellow][$.player.melee], ['You can finally enter the Tavern without fear.',
                                'So you want to be a hero, eh?',
                                'Just what this world needs, another fighter.',
                                'Watch out for blasts, you brute!'][$.player.melee++]);
                            break;
                        case 6:
                            if ($.player.backstab > 3) {
                                lib_1.vt.refocus();
                                return;
                            }
                            lib_1.news('\twatch your Back now');
                            lib_1.vt.out([lib_1.vt.cyan, lib_1.vt.blue, lib_1.vt.red, lib_1.vt.black][$.player.backstab], ['A backstab is in your future.',
                                'You may backstab more regularly now.',
                                'You will deal a more significant, first blow.',
                                'What were you doing?  Sneaking.'][$.player.backstab++]);
                            break;
                        case 7:
                            if ($.player.poison > 3) {
                                lib_1.vt.refocus();
                                return;
                            }
                            lib_1.news('\tApothecary visits have more meaning');
                            lib_1.vt.out([lib_1.vt.green, lib_1.vt.cyan, lib_1.vt.red, lib_1.vt.magenta][$.player.poison], ['The Apothecary will sell you toxins now, bring money.',
                                'Your poisons can achieve (+1x,+1x) potency now.',
                                'Your banes will add (+1x,+2x) potency now.',
                                'Your venena now makes for (+2x,+2x) potency!'][$.player.poison++]);
                            break;
                        case 8:
                            if ($.player.magic > 3) {
                                lib_1.vt.refocus();
                                return;
                            }
                            lib_1.news('\tbecame more friendly with the old mage');
                            switch ($.player.magic) {
                                case 0:
                                    lib_1.vt.out(lib_1.vt.cyan, 'The old mage will see you now, bring money.');
                                    $.player.magic++;
                                    $.player.spells = [];
                                    break;
                                case 1:
                                    lib_1.vt.out(lib_1.vt.cyan, 'You can no longer use wands.');
                                    $.player.magic++;
                                    $.player.spells = [];
                                    $.player.sp += 15 + sys_1.dice(511);
                                    $.online.sp = $.player.sp;
                                    break;
                                default:
                                    lib_1.vt.out(lib_1.vt.black, 'More mana is better');
                                    $.player.sp += 511;
                                    $.online.sp += sys_1.dice(511);
                                    break;
                            }
                            break;
                        case 9:
                            if ($.player.steal > 3) {
                                lib_1.vt.refocus();
                                return;
                            }
                            lib_1.news('\ttry to avoid in the Square');
                            lib_1.vt.out([lib_1.vt.cyan, lib_1.vt.blue, lib_1.vt.red, lib_1.vt.black][$.player.steal], ['Your fingers are starting to itch.',
                                'Your eyes widen at the chance for unearned loot.',
                                'Welcome to the Thieves guild: go pick a pocket or two!',
                                `You're convinced that no lock can't be picked.`][$.player.steal++]);
                            break;
                        default:
                            lib_1.vt.refocus();
                            return;
                    }
                    $.online.altered = true;
                    lib_1.vt.outln(-2000);
                    cb();
                }, prompt: 'Choose which: ', cancel: '0', min: 1, max: 1, match: /^[0-9]/
            }
        };
        lib_1.vt.drain();
        lib_1.vt.focus = 'skill';
    }
    player.skillplus = skillplus;
    function riddle() {
        lib_1.vt.action('clear');
        pc_1.PC.portrait($.online, 'tada');
        lib_1.vt.outln();
        if ($.player.novice) {
            $.player.novice = false;
            $.player.expert = true;
            lib_1.vt.outln('You are no longer a novice.  Welcome to the next level of play.', -2000);
        }
        let bonus = 0;
        let deeds = ['plays', 'jl', 'jw', 'killed', 'kills', 'retreats', 'steals', 'tl', 'tw'];
        if (!items_1.Access.name[$.player.access].sysop) {
            $.mydeeds = pc_1.Deed.load($.player.pc);
            lib_1.vt.outln('\nChecking your deeds for the ', lib_1.vt.bright, $.player.pc, lib_1.vt.normal, ' list ... ', -1000);
            for (let i in deeds) {
                let deed = $.mydeeds.find((x) => { return x.deed == deeds[i]; });
                if (/jw|steals|tw/.test(deeds[i])) {
                    if (!deed)
                        deed = $.mydeeds[$.mydeeds.push(pc_1.Deed.load($.player.pc, deeds[i])[0]) - 1];
                    if ($.player[deeds[i]] >= deed.value) {
                        deed.value = $.player[deeds[i]];
                        pc_1.Deed.save(deed, $.player);
                        bonus = 1;
                        lib_1.vt.outln(lib_1.vt.cyan, ' + ', lib_1.vt.bright, pc_1.Deed.name[deeds[i]].description, ' ', lib_1.bracket(deed.value, false));
                        lib_1.vt.sound('click', 5);
                    }
                }
                else {
                    if (!deed)
                        deed = $.mydeeds[$.mydeeds.push(pc_1.Deed.load($.player.pc, deeds[i])[0]) - 1];
                    if (deeds[i] == 'jl' && $.player.jl < 2 && $.player.jw < 5)
                        continue;
                    if (deeds[i] == 'tl' && $.player.tl < 2 && $.player.tw < 5)
                        continue;
                    if ($.player[deeds[i]] <= deed.value) {
                        deed.value = $.player[deeds[i]];
                        pc_1.Deed.save(deed, $.player);
                        bonus = 1;
                        lib_1.vt.outln(lib_1.vt.cyan, ' + ', lib_1.vt.bright, pc_1.Deed.name[deeds[i]].description, ' ', lib_1.bracket(deed.value, false));
                        lib_1.vt.sound('click', 5);
                    }
                }
            }
            $.mydeeds = pc_1.Deed.load('GOAT');
            lib_1.vt.outln(lib_1.vt.magenta, '\nChecking your deeds for the ', lib_1.vt.bright, 'GOAT', lib_1.vt.normal, ' list ... ', -1000);
            for (let i in deeds) {
                let deed = $.mydeeds.find((x) => { return x.deed == deeds[i]; });
                if (/jw|steals|tw/.test(deeds[i])) {
                    if (!deed)
                        deed = $.mydeeds[$.mydeeds.push(pc_1.Deed.load('GOAT', deeds[i])[0]) - 1];
                    if ($.player[deeds[i]] >= deed.value) {
                        deed.value = $.player[deeds[i]];
                        pc_1.Deed.save(deed, $.player);
                        bonus = 2;
                        lib_1.vt.outln(lib_1.vt.yellow, ' + ', lib_1.vt.bright, pc_1.Deed.name[deeds[i]].description, ' ', lib_1.bracket(deed.value, false));
                        lib_1.vt.sound('click', 5);
                    }
                }
                else {
                    if (!deed)
                        deed = $.mydeeds[$.mydeeds.push(pc_1.Deed.load('GOAT', deeds[i])[0]) - 1];
                    if (deeds[i] == 'jl' && $.player.jl < 2 && $.player.jw < 10)
                        continue;
                    if (deeds[i] == 'tl' && $.player.tl < 2 && $.player.tw < 10)
                        continue;
                    if ($.player[deeds[i]] <= deed.value) {
                        deed.value = $.player[deeds[i]];
                        pc_1.Deed.save(deed, $.player);
                        bonus = 3;
                        lib_1.vt.outln(lib_1.vt.yellow, ' + ', lib_1.vt.bright, pc_1.Deed.name[deeds[i]].description, ' ', lib_1.bracket(deed.value, false));
                        lib_1.vt.sound('click', 5);
                    }
                }
            }
        }
        else
            bonus = 2;
        if ($.player.coward) {
            $.player.coward = false;
            lib_1.vt.out('Welcome back to play with the rest of us ... ');
            if (bonus) {
                bonus--;
                lib_1.vt.out(-600, lib_1.vt.faint, 'Heh.');
            }
            lib_1.vt.outln(-900);
        }
        lib_1.vt.music('immortal');
        $.player.immortal++;
        lib_1.vt.outln(lib_1.vt.cyan, lib_1.vt.bright, '\nYou have become so powerful that you are now immortal ', -3000);
        db.run(`UPDATE Players SET bank=bank+${$.player.bank.value + $.player.coin.value} WHERE id='${$.taxman.user.id}'`);
        lib_1.vt.outln(lib_1.vt.cyan, '    and you leave your worldly possessions behind.', -2000);
        let max = Object.keys(pc_1.PC.name['immortal']).indexOf($.player.pc) + 1;
        if (max || $.player.keyhints.slice(12).length > sys_1.int(Object.keys(pc_1.PC.name['player']).length / 2))
            $.player.keyhints.splice(12, 1);
        else
            $.player.keyhints.push($.player.pc);
        pc_1.PC.reroll($.player);
        pc_1.PC.save();
        lib_1.vt.sessionAllowed += 300;
        $.warning = 2;
        if (max > 2) {
            lib_1.vt.music('victory');
            const log = sys_1.pathTo('files', 'winners.txt');
            sys_1.fs.appendFileSync(log, sys_1.sprintf(`%22s won on %s  -  game took %3d days\n`, $.player.handle, sys_1.date2full(sys_1.now().date), sys_1.now().date - $.sysop.dob + 1));
            pc_1.PC.load($.sysop);
            $.sysop.who = $.player.handle;
            $.sysop.dob = sys_1.now().date + 1;
            $.sysop.plays = 0;
            pc_1.PC.save($.sysop);
            $.player.wins++;
            db.run(`UPDATE Players SET wins=${$.player.wins} WHERE id='${$.player.id}'`);
            $.reason = 'WON THE GAME !!';
            lib_1.vt.outln(lib_1.vt.tty == 'web' ? -4321 : -432);
            lib_1.vt.profile({ jpg: 'winner', effect: 'fadeInUp' });
            lib_1.vt.title(`${$.player.handle} is our winner!`);
            lib_1.vt.outln(lib_1.vt.cyan, lib_1.vt.bright, 'CONGRATULATIONS!! ', -600, lib_1.vt.reset, ' You have won the game!\n', -600);
            lib_1.vt.out(lib_1.vt.yellow, 'The board will now reset ', -600, lib_1.vt.faint);
            let rs = db.query(`SELECT id, pid FROM Online WHERE id!='${$.player.id}'`);
            for (let row in rs) {
                try {
                    process.kill(rs[row].pid, 'SIGHUP');
                    lib_1.vt.out('x', -10);
                }
                catch (_a) {
                    lib_1.vt.beep();
                    lib_1.vt.out('?', -100);
                }
                db.unlock(rs[row].id);
            }
            lib_1.vt.sound('winner');
            lib_1.vt.out(lib_1.vt.bright);
            rs = db.query(`SELECT id FROM Players WHERE id NOT GLOB '_*'`);
            let user = { id: '' };
            for (let row in rs) {
                user.id = rs[row].id;
                pc_1.PC.load(user);
                pc_1.PC.reroll(user);
                pc_1.PC.newkeys(user);
                user.keyhints.splice(12);
                pc_1.PC.save(user);
                sys_1.fs.unlink(sys_1.pathTo('users', '.${user.id}.json'), () => { });
                lib_1.vt.out('.', -10);
            }
            db.run(`UPDATE Rings SET bearer=''`);
            let i = 0;
            while (++i) {
                try {
                    user = { id: '' };
                    Object.assign(user, JSON.parse(sys_1.fs.readFileSync(sys_1.pathTo('users', 'bot${i}.json'))));
                    let bot = {};
                    Object.assign(bot, user);
                    pc_1.PC.reroll(bot, bot.pc, bot.level);
                    pc_1.PC.newkeys(bot);
                    bot.keyhints.splice(12);
                    Object.assign(bot, user);
                    pc_1.PC.save(bot);
                    lib_1.vt.out('&', -10);
                }
                catch (err) {
                    lib_1.vt.beep();
                    lib_1.vt.out('?', -100);
                    break;
                }
            }
            lib_1.vt.outln(-1250);
            lib_1.vt.outln('Happy hunting ', lib_1.vt.uline, 'tomorrow', lib_1.vt.nouline, '!');
            lib_1.vt.outln(-2500);
            lib_1.vt.hangup();
        }
        $.player.today = 0;
        lib_1.vt.out(lib_1.vt.yellow, lib_1.vt.bright, '\nYou are rewarded', lib_1.vt.normal, ` ${$.access.calls} `, lib_1.vt.bright, 'more calls today.\n', lib_1.vt.reset);
        lib_1.vt.outln(lib_1.vt.green, lib_1.vt.bright, `\nOl' Mighty One!  `, lib_1.vt.normal, 'Solve the', lib_1.vt.faint, ' Ancient Riddle of the Keys ', lib_1.vt.normal, 'and you will become\nan immortal being.');
        for (let i = 0; i <= max + bonus; i++)
            pc_1.PC.keyhint($.online, false);
        pc_1.PC.save();
        let prior = -1;
        let slot;
        for (let i in $.player.keyhints) {
            if (+i < 12 && $.player.keyhints[i]) {
                slot = sys_1.int(+i / 3);
                if (slot !== prior) {
                    prior = slot;
                    lib_1.vt.outln();
                }
                lib_1.vt.outln('Key #', lib_1.vt.bright, `${slot + 1}`, lib_1.vt.normal, ' is not ', pc_1.Deed.key[$.player.keyhints[i]]);
            }
        }
        lib_1.vt.action('riddle');
        let combo = $.player.keyseq;
        lib_1.vt.form = {
            'key': {
                cb: () => {
                    let attempt = lib_1.vt.entry.toUpperCase();
                    lib_1.vt.music('steal');
                    lib_1.vt.out(' ... you insert and twist the key ', -1234);
                    for (let i = 0; i < 3; i++) {
                        lib_1.vt.out('.');
                        lib_1.vt.sound('click', 12);
                    }
                    if (attempt == combo[slot]) {
                        lib_1.vt.sound('max');
                        if ($.player.emulation == 'XT')
                            lib_1.vt.out('🔓 ');
                        lib_1.vt.outln(lib_1.vt.cyan, '{', lib_1.vt.bright, 'Click!', lib_1.vt.normal, '}');
                        lib_1.vt.sessionAllowed += 60;
                        $.player.pc = Object.keys(pc_1.PC.name['immortal'])[slot];
                        lib_1.vt.profile({ png: 'player/' + $.player.pc.toLowerCase() + ($.player.gender == 'F' ? '_f' : ''), pc: $.player.pc });
                        lib_1.vt.out([lib_1.vt.red, lib_1.vt.blue, lib_1.vt.magenta][slot], 'You ', ['advance to', 'succeed as', 'transcend into'][slot], lib_1.vt.bright, sys_1.an($.player.pc), lib_1.vt.normal, '.');
                        pc_1.PC.reroll($.player, $.player.pc);
                        pc_1.PC.newkeys($.player);
                        $.player.coward = true;
                        pc_1.PC.save();
                        if (slot++ < max) {
                            lib_1.vt.refocus(`Insert key #${slot + 1}? `);
                            return;
                        }
                        $.player.coward = false;
                        pickPC([200, 210, 220, 240][slot], true);
                        return;
                    }
                    else {
                        lib_1.vt.sound('thunder');
                        if ($.player.emulation == 'XT')
                            lib_1.vt.out('💀 ');
                        lib_1.vt.outln(lib_1.vt.black, lib_1.vt.bright, '^', lib_1.vt.white, 'Boom!', lib_1.vt.black, '^');
                        if (slot == 0) {
                            for (let i = 0; i < 3; i++) {
                                if ($.player.keyhints[i] == attempt)
                                    break;
                                if (!$.player.keyhints[i]) {
                                    $.player.keyhints[i] = attempt;
                                    break;
                                }
                            }
                            pickPC(200 + 4 * $.player.wins + sys_1.int($.player.immortal / 3));
                        }
                        else
                            pickPC([200, 210, 220, 240][slot], true);
                    }
                }, cancel: '!', eol: false, match: /P|G|S|C/i
            }
        };
        slot = 0;
        lib_1.vt.drain();
        lib_1.vt.form['key'].prompt = `Insert key #${slot + 1}? `;
        lib_1.vt.focus = 'key';
    }
    player.riddle = riddle;
})(player || (player = {}));
module.exports = player;
