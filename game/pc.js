"use strict";
const $ = require("./runtime");
const db = require("./db");
const items_1 = require("./items");
const lib_1 = require("./lib");
const sys_1 = require("./sys");
var pc;
(function (pc_1) {
    pc_1.Abilities = ['str', 'int', 'dex', 'cha'];
    class _deed {
        constructor() {
            this.name = require(sys_1.pathTo('files/library', 'deed.json'));
        }
        get key() {
            const oldkey = '🗝️ ';
            return lib_1.vt.emulation == 'XT'
                ? {
                    P: lib_1.vt.attr(oldkey, lib_1.vt.bright, lib_1.vt.Magenta, ' Platinum ', lib_1.vt.reset),
                    G: lib_1.vt.attr(oldkey, lib_1.vt.black, lib_1.vt.Yellow, ' = Gold = ', lib_1.vt.reset),
                    S: lib_1.vt.attr(oldkey, lib_1.vt.bright, lib_1.vt.Cyan, '- Silver -', lib_1.vt.reset),
                    C: lib_1.vt.attr(oldkey, lib_1.vt.black, lib_1.vt.Red, lib_1.vt.Empty, ' Copper ', lib_1.vt.Empty, lib_1.vt.reset)
                } : {
                P: lib_1.vt.attr(lib_1.vt.off, lib_1.vt.magenta, lib_1.vt.bright, lib_1.vt.reverse, ' Platinum ', lib_1.vt.reset),
                G: lib_1.vt.attr(lib_1.vt.off, lib_1.vt.yellow, lib_1.vt.bright, lib_1.vt.reverse, ' = Gold = ', lib_1.vt.reset),
                S: lib_1.vt.attr(lib_1.vt.off, lib_1.vt.cyan, lib_1.vt.bright, lib_1.vt.reverse, '- Silver -', lib_1.vt.reset),
                C: lib_1.vt.attr(lib_1.vt.off, lib_1.vt.red, lib_1.vt.bright, lib_1.vt.reverse, lib_1.vt.Empty, ' Copper ', lib_1.vt.Empty, lib_1.vt.reset)
            };
        }
        load(pc, what) {
            let deed = [];
            let sql = `SELECT * FROM Deeds WHERE pc='${pc}'`;
            if (what)
                sql += ` AND deed='${what}'`;
            let rs = db.query(sql);
            if (rs.length) {
                for (let i = 0; i < rs.length; i++)
                    deed.push({
                        pc: rs[i].pc,
                        deed: rs[i].deed,
                        date: rs[i].date,
                        hero: rs[i].hero,
                        value: rs[i].value
                    });
            }
            else if (what) {
                let start = 0;
                if (pc_1.Deed.name[what])
                    start = pc_1.Deed.name[what].starting;
                db.run(`INSERT INTO Deeds VALUES ('${pc}', '${what}', ${sys_1.now().date}, 'Nobody', ${start})`);
                deed = this.load(pc, what);
            }
            return deed;
        }
        get medal() {
            return lib_1.vt.emulation == 'XT'
                ? ['  ', '🥇', '🥈', '🥉']
                : ['  ',
                    lib_1.vt.attr(lib_1.vt.bright, lib_1.vt.reverse, '1', lib_1.vt.noreverse, lib_1.vt.normal, ' '),
                    lib_1.vt.attr(lib_1.vt.normal, lib_1.vt.reverse, '2', lib_1.vt.noreverse, ' '),
                    lib_1.vt.attr(lib_1.vt.faint, lib_1.vt.reverse, '3', lib_1.vt.noreverse, lib_1.vt.normal, ' ')
                ];
        }
        save(deed, player) {
            if (!player.novice) {
                deed.date = sys_1.now().date;
                deed.hero = player.handle;
                db.run(`UPDATE Deeds SET date=${deed.date},hero='${deed.hero}', value=${deed.value} WHERE pc='${deed.pc}' AND deed='${deed.deed}'`);
            }
        }
    }
    class _pc {
        constructor() {
            this.name = require(sys_1.pathTo('characters', 'class.json'));
            this.types = Object.keys(this.name).length;
            this.classes = new Array();
            this.total = 0;
            for (let type in this.name) {
                let i = Object.keys(this.name[type]).length;
                this.classes.push({ key: type, value: i });
                this.total += i;
                if (type == 'immortal')
                    for (let dd in this.name[type])
                        this.winning = dd;
            }
        }
        ability(current, delta, max = 100, mod = 0) {
            let ability = current;
            max = max + mod;
            max = max > 100 ? 100 : max < 20 ? 20 : max;
            ability += delta;
            ability = ability > max ? max : ability < 20 ? 20 : ability;
            return ability;
        }
        activate(one, keep = false, confused = false) {
            one.adept = one.user.wins ? 1 : 0;
            one.pc = this.card(one.user.pc);
            one.str = one.user.str;
            one.int = one.user.int;
            one.dex = one.user.dex;
            one.cha = one.user.cha;
            console.log('activate:', one, one.user);
            pc_1.Abilities.forEach(ability => {
                const a = `to${sys_1.titlecase(ability)}`;
                let rt = one.user.blessed ? 10 : 0;
                rt -= one.user.cursed ? 10 : 0;
                one.user.rings.forEach(ring => {
                    rt -= items_1.Ring.power(one.user.rings, [ring], 'degrade', 'ability', ability).power * 2;
                    rt -= items_1.Ring.power(one.user.rings, [ring], 'degrade', 'pc', one.user.pc).power * 3;
                    rt += items_1.Ring.power([], [ring], 'upgrade', 'ability', ability).power * this.card(one.user.pc)[a] * 2;
                    rt += items_1.Ring.power([], [ring], 'upgrade', 'pc', one.user.pc).power * this.card(one.user.pc)[a] * 3;
                });
                this.adjust(ability, rt, 0, 0, one);
            });
            one.confused = false;
            if (confused)
                return true;
            one.who = this.who(one);
            one.altered = keep;
            one.hp = one.user.hp;
            one.sp = one.user.sp;
            one.bp = sys_1.int(one.user.hp / 10);
            one.hull = one.user.hull;
            items_1.Weapon.equip(one, one.user.weapon, true);
            items_1.Armor.equip(one, one.user.armor, true);
            one.user.access = one.user.access || Object.keys(items_1.Access.name)[0];
            if (keep && !db.lock(one.user.id, one.user.id == $.player.id ? 1 : 2) && one.user.id !== $.player.id) {
                lib_1.vt.beep();
                lib_1.vt.outln();
                lib_1.vt.outln(lib_1.vt.cyan, lib_1.vt.bright, `${one.user.handle} is engaged elsewhere.`);
                one.altered = false;
            }
            return one.altered;
        }
        adjust(ability, rt = 0, pc = 0, max = 0, rpc = $.online) {
            if (max) {
                rpc.user[`max${ability}`] = this.ability(rpc.user[`max${ability}`], max, 99);
                rpc.altered = true;
            }
            if (pc) {
                rpc.user[ability] = this.ability(rpc.user[ability], pc, rpc.user[`max${ability}`]);
                rpc.altered = true;
            }
            const a = `to${sys_1.titlecase(ability)}`;
            let mod = rpc.user.blessed ? 10 : 0;
            mod -= rpc.user.cursed ? 10 : 0;
            rpc.user.rings.forEach(ring => {
                mod -= items_1.Ring.power(rpc.user.rings, [ring], 'degrade', 'ability', ability).power * 2;
                mod -= items_1.Ring.power(rpc.user.rings, [ring], 'degrade', 'pc', rpc.user.pc).power * 3;
                mod += items_1.Ring.power([], [ring], 'upgrade', 'ability', ability).power * this.card(rpc.user.pc)[a] * 2;
                mod += items_1.Ring.power([], [ring], 'upgrade', 'pc', rpc.user.pc).power * this.card(rpc.user.pc)[a] * 3;
            });
            if (rt > 100) {
                mod++;
                rt %= 100;
            }
            rpc[ability] = this.ability(rpc[ability], rt, rpc.user[`max${ability}`], mod);
        }
        card(dd = 'Spirit') {
            let rpc = {};
            for (let type in this.name) {
                if (this.name[type][dd]) {
                    rpc = this.name[type][dd];
                    break;
                }
            }
            return rpc;
        }
        encounter(where = '', lo = 2, hi = 99) {
            lo = lo < 2 ? 2 : lo > 99 ? 99 : lo;
            hi = hi < 2 ? 2 : hi > 99 ? 99 : hi;
            let rpc = { user: { id: '' } };
            let rs = db.query(`SELECT id FROM Players WHERE id != '${$.player.id}'
            AND xplevel BETWEEN ${lo} AND ${hi}
            AND status != 'jail'
            ${where} ORDER BY level`);
            if (rs.length) {
                let n = sys_1.dice(rs.length) - 1;
                rpc.user.id = rs[n].id;
                this.load(rpc);
            }
            return rpc;
        }
        experience(level, factor = 1, wisdom = $.player.int) {
            if (level < 1)
                return 0;
            if (wisdom < 1000)
                wisdom = (1100 + level - 2 * wisdom);
            return factor == 1
                ? Math.round(wisdom * Math.pow(2, level - 1))
                : sys_1.int(wisdom * Math.pow(2, level - 2) / factor);
        }
        expout(xp, awarded = true) {
            const gain = sys_1.int(100 * xp / (this.experience($.player.level) - this.experience($.player.level - 1)));
            let out = (xp < 1e+8 ? xp.toString() : sys_1.sprintf('%.4e', xp)) + ' ';
            if (awarded && gain && $.online.int >= 90) {
                out += lib_1.vt.attr(lib_1.vt.off, lib_1.vt.faint, '(', lib_1.vt.bright, gain < 4 ? lib_1.vt.black : gain < 10 ? lib_1.vt.red : gain < 40 ? lib_1.vt.yellow
                    : gain < 80 ? lib_1.vt.green : gain < 130 ? lib_1.vt.cyan : gain < 400 ? lib_1.vt.blue
                        : lib_1.vt.magenta, sys_1.sprintf('%+d', gain), gain > 3 ? lib_1.vt.normal : '', '%', lib_1.vt.faint, lib_1.vt.white, ') ', lib_1.vt.reset);
            }
            out += 'experience';
            if (awarded)
                out += '.';
            return out;
        }
        hp(user = $.player) {
            return Math.round(user.level + sys_1.dice(user.level) + user.str / 10);
        }
        jousting(rpc) {
            return Math.round(rpc.dex * rpc.user.level / 10 + 2 * rpc.user.jw - rpc.user.jl + 10);
        }
        keyhint(rpc = $.online, echo = true) {
            let i;
            let open = [];
            let slot;
            for (let i in rpc.user.keyhints)
                if (+i < 12 && !rpc.user.keyhints[i])
                    open.push(i);
            if (open.length) {
                do {
                    i = open[sys_1.dice(open.length) - 1];
                    slot = sys_1.int(i / 3);
                    let key = ['P', 'G', 'S', 'C'][sys_1.dice(4) - 1];
                    if (key !== rpc.user.keyseq[slot]) {
                        for (let n = 3 * slot; n < 3 * (slot + 1); n++)
                            if (key == rpc.user.keyhints[n])
                                key = '';
                        if (key)
                            rpc.user.keyhints[i] = key;
                    }
                } while (!rpc.user.keyhints[i]);
                if (rpc === $.online && echo)
                    lib_1.vt.outln('Key #', lib_1.vt.bright, `${slot + 1}`, lib_1.vt.normal, ' is not ', pc_1.Deed.key[$.player.keyhints[i]]);
            }
            else
                lib_1.vt.outln(lib_1.vt.reset, 'There are no more key hints available to you.');
            rpc.altered = true;
        }
        load(rpc) {
            let user = sys_1.isActive(rpc) ? rpc.user : rpc;
            if (user.handle)
                user.handle = sys_1.titlecase(user.handle);
            if (db.loadUser(user)) {
                if (sys_1.isActive(rpc))
                    this.activate(rpc);
                if (user.id[0] == '_' && user.id != "_SYS") {
                    let npc = db.fillUser(db.NPC[user.id], user);
                    db.saveUser(npc);
                }
                return true;
            }
            return false;
        }
        loadGang(rs, me = '') {
            let gang = {
                name: rs.name,
                members: rs.members.split(','),
                handles: [],
                genders: [],
                melee: [],
                status: [],
                validated: [],
                win: rs.win,
                loss: rs.loss,
                banner: sys_1.int(rs.banner / 16),
                trim: rs.banner % 8,
                back: sys_1.int(rs.color / 16),
                fore: rs.color % 8
            };
            for (let n in gang.members) {
                let who = db.query(`SELECT handle,gender,melee,status,gang FROM Players WHERE id='${gang.members[n]}'`);
                if (who.length) {
                    gang.handles.push(who[0].handle);
                    gang.genders.push(who[0].gender);
                    gang.melee.push(who[0].melee);
                    if (gang.members[n] !== me && !who[0].status && !db.lock(gang.members[n]))
                        who[0].status = 'locked';
                    gang.status.push(who[0].status);
                    gang.validated.push(who[0].gang ? who[0].gang == rs.name : undefined);
                }
                else if (gang.members[n][0] == '_') {
                    gang.handles.push('');
                    gang.genders.push('I');
                    gang.melee.push(0);
                    gang.status.push('');
                    gang.validated.push(true);
                }
                else {
                    gang.handles.push(`?unknown ${gang.members[n]}`);
                    gang.genders.push('M');
                    gang.melee.push(3);
                    gang.status.push('?');
                    gang.validated.push(false);
                }
            }
            return gang;
        }
        newkeys(user = $.player) {
            let keys = ['P', 'G', 'S', 'C'];
            let prior = user.keyhints || [];
            user.keyhints = ['', '', '', '', '', '', '', '', '', '', '', '', ...prior.slice(12)];
            user.keyseq = '';
            while (keys.length) {
                let k = sys_1.dice(keys.length);
                user.keyseq += keys.splice(k - 1, 1);
            }
        }
        portrait(rpc = $.online, effect = 'fadeInLeft', meta = '') {
            let userPNG = `door/static/images/user/${rpc.user.id}.png`;
            try {
                sys_1.fs.accessSync(userPNG, sys_1.fs.constants.F_OK);
                userPNG = `user/${rpc.user.id}`;
            }
            catch (e) {
                userPNG = (this.name['player'][rpc.user.pc] || this.name['immortal'][rpc.user.pc] ? 'player' : 'monster') + '/' + rpc.user.pc.toLowerCase() + (rpc.user.gender == 'F' ? '_f' : '');
            }
            lib_1.vt.profile({ png: userPNG, handle: rpc.user.handle, level: rpc.user.level, pc: rpc.user.pc, effect: effect });
            lib_1.vt.title(`${rpc.user.handle}: level ${rpc.user.level} ${rpc.user.pc} ${meta}`);
        }
        random(type) {
            let pc = '';
            if (type) {
                let i = sys_1.dice(Object.keys(this.name[type]).length);
                let n = i;
                for (let dd in this.name[type])
                    if (!--n) {
                        pc = dd;
                        break;
                    }
            }
            else {
                let i = sys_1.dice(this.total - 2);
                let n = i + 2;
                for (type in this.name) {
                    for (let dd in this.name[type])
                        if (!--n) {
                            pc = dd;
                            break;
                        }
                    if (!n)
                        break;
                }
            }
            return pc;
        }
        reroll(user, dd, level = 1) {
            level = level > 99 ? 99 : level < 1 ? 1 : level;
            user.level = level;
            user.pc = dd ? dd : Object.keys(this.name['player'])[0];
            const rpc = this.card(user.pc);
            user.xp = 0;
            user.jl = 0;
            user.jw = 0;
            user.steals = 0;
            user.tl = 0;
            user.tw = 0;
            user = db.fillUser(user.pc, user);
            user.hp = 15;
            user.sp = user.magic > 1 ? 15 : 0;
            user.status = '';
            if (level == 1 || !user.id || user.id[0] == '_') {
                user = db.fillUser('reroll', user);
                user.gender = user.sex;
            }
            if (!user.keyseq)
                pc_1.PC.newkeys(user);
            if (user.level > 1)
                user.xp = this.experience(user.level - 1, 1, user.int);
            user.xplevel = (user.pc == Object.keys(this.name['player'])[0]) ? 0 : user.level;
            for (let n = 2; n <= level; n++) {
                user.level = n;
                if (user.level == 50 && user.gender !== 'I' && user.id[0] !== '_' && !user.novice) {
                    lib_1.vt.out(lib_1.vt.off, lib_1.vt.yellow, lib_1.vt.bright, '+', lib_1.vt.reset, ' Bonus ', lib_1.vt.faint);
                    let d;
                    do {
                        d = sys_1.dice(10) - 1;
                        switch (d) {
                            case 0:
                                if (user.maxstr < 97 || user.maxint < 97 || user.dex < 97 || user.maxcha < 97)
                                    break;
                            case 1:
                                if (user.maxstr < 91)
                                    break;
                            case 2:
                                if (user.maxint < 91)
                                    break;
                            case 3:
                                if (user.maxdex < 91)
                                    break;
                            case 4:
                                if (user.maxcha > 91)
                                    break;
                            case 5:
                                if (user.melee < 3)
                                    break;
                            case 6:
                                if (user.backstab < 3)
                                    break;
                            case 7:
                                if (user.poison < 3)
                                    break;
                            case 8:
                                if (user.magic < 3)
                                    break;
                            case 9:
                                if (user.steal < 4)
                                    break;
                                d = -1;
                        }
                    } while (d < 0);
                    switch (d) {
                        case 0:
                            lib_1.vt.out('Ability');
                            if ((user.maxstr += 3) > 99)
                                user.maxstr = 99;
                            if ((user.maxint += 3) > 99)
                                user.maxint = 99;
                            if ((user.maxdex += 3) > 99)
                                user.maxdex = 99;
                            if ((user.maxcha += 3) > 99)
                                user.maxcha = 99;
                            break;
                        case 1:
                            lib_1.vt.out('Strength');
                            if ((user.maxstr += 10) > 99)
                                user.maxstr = 99;
                            break;
                        case 2:
                            lib_1.vt.out('Intellect');
                            if ((user.maxint += 10) > 99)
                                user.maxint = 99;
                            break;
                        case 3:
                            lib_1.vt.out('Dexterity');
                            if ((user.maxdex += 10) > 99)
                                user.maxdex = 99;
                            break;
                        case 4:
                            lib_1.vt.out('Charisma');
                            if ((user.maxcha += 10) > 99)
                                user.maxcha = 99;
                            break;
                        case 5:
                            lib_1.vt.out('Melee');
                            user.melee++;
                            break;
                        case 6:
                            lib_1.vt.out('Backstab');
                            user.backstab++;
                            break;
                        case 7:
                            lib_1.vt.out('Poison');
                            user.poison++;
                            break;
                        case 8:
                            lib_1.vt.out('Spellcasting');
                            user.magic++;
                            break;
                        case 9:
                            lib_1.vt.out('Stealing');
                            user.steal++;
                            break;
                    }
                    lib_1.vt.out(lib_1.vt.normal, ' added');
                    if (user != $.player)
                        lib_1.vt.out(' to ', user.handle);
                    lib_1.vt.outln(' ', lib_1.vt.yellow, lib_1.vt.bright, '+');
                }
                if ((user.str += rpc.toStr) > user.maxstr)
                    user.str = user.maxstr;
                if ((user.int += rpc.toInt) > user.maxint)
                    user.int = user.maxint;
                if ((user.dex += rpc.toDex) > user.maxdex)
                    user.dex = user.maxdex;
                if ((user.cha += rpc.toCha) > user.maxcha)
                    user.cha = user.maxcha;
                user.hp += this.hp(user);
                user.sp += this.sp(user);
            }
        }
        save(rpc = $.online, insert = false, locked = false) {
            let user = sys_1.isActive(rpc) ? rpc.user : rpc;
            if (!user.id)
                return;
            if (insert || locked || user.id[0] == '_') {
                try {
                    let save = { id: '' };
                    Object.assign(save, user);
                    Object.assign(save, {
                        bounty: user.bounty.amount,
                        coin: user.coin.amount,
                        bank: user.bank.amount,
                        loan: user.loan.amount
                    });
                    const trace = sys_1.pathTo('users', `.${user.id}.json`);
                    sys_1.fs.writeFileSync(trace, JSON.stringify(save, null, 2));
                }
                catch (err) {
                    console.error(err);
                }
            }
            db.saveUser(user, insert);
            if (sys_1.isActive(rpc))
                rpc.altered = false;
            if (locked)
                db.unlock(user.id.toLowerCase());
        }
        saveGang(g, insert = false) {
            if (insert) {
                try {
                    db.run(`INSERT INTO Gangs (name,members,win,loss,banner,color)
                    VALUES ('${g.name}', '${g.members.join()}', ${g.win}, ${g.loss},
                    ${(g.banner << 4) + g.trim}, ${(g.back << 4) + g.fore})`);
                }
                catch (err) {
                    if (err.code !== 'SQLITE_CONSTRAINT_PRIMARYKEY') {
                        console.log(` ? Unexpected error: ${String(err)}`);
                    }
                }
            }
            else {
                if (g.members.length > 4)
                    g.members.splice(0, 4);
                db.run(`UPDATE Gangs
                SET members='${g.members.join()}',win=${g.win},loss=${g.loss},
                banner=${(g.banner << 4) + g.trim},color=${(g.back << 4) + g.fore}
                WHERE name='${g.name}'`);
            }
        }
        saveRing(name, bearer = '', rings) {
            let theRing = { name: name, bearer: bearer[0] == '_' ? '' : bearer };
            if (items_1.Ring.name[name].unique) {
                db.run(`UPDATE Rings SET bearer='${theRing.bearer}' WHERE name=?`, false, name);
            }
            if (theRing.bearer.length && rings) {
                db.run(`UPDATE Players SET rings=? WHERE id=?`, false, rings.toString(), theRing.bearer);
            }
        }
        sp(user = $.player) {
            return user.magic > 1 ? Math.round(user.level + sys_1.dice(user.level) + user.int / 10) : 0;
        }
        status(profile) {
            lib_1.vt.action('clear');
            this.portrait(profile);
            const line = '------------------------------------------------------';
            const space = '                                                      ';
            const sex = profile.user.sex == 'I' ? profile.user.gender : profile.user.sex;
            var i;
            var n;
            i = 22 - profile.user.handle.length;
            n = 11 + i / 2;
            lib_1.vt.cls();
            lib_1.vt.out(lib_1.vt.blue, '+', lib_1.vt.faint, line.slice(0, n), lib_1.vt.normal, '=:))');
            lib_1.vt.out(lib_1.vt.Blue, lib_1.vt.yellow, lib_1.vt.bright, ' ', profile.user.handle, ' ', lib_1.vt.reset);
            n = 11 + i / 2 + i % 2;
            lib_1.vt.outln(lib_1.vt.blue, '((:=', lib_1.vt.faint, line.slice(0, n), lib_1.vt.normal, '+');
            i = 30 - items_1.Access.name[profile.user.access][sex].length;
            n = 11 + i / 2;
            lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.white, lib_1.vt.normal, space.slice(0, n));
            lib_1.vt.out('"', items_1.Access.name[profile.user.access][sex], '"');
            n = 11 + i / 2 + i % 2;
            lib_1.vt.outln(lib_1.vt.blue, space.slice(0, n), lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
            lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.cyan, lib_1.vt.bright);
            lib_1.vt.out('    Title: ', lib_1.vt.white);
            if ($.player.emulation == 'XT')
                lib_1.vt.out('\r\x1B[2C', items_1.Access.name[profile.user.access].emoji, '\r\x1B[12C');
            lib_1.vt.out(sys_1.sprintf('%-20s', profile.user.access));
            lib_1.vt.out(lib_1.vt.cyan, ' Born: ', lib_1.vt.white, sys_1.date2full(profile.user.dob));
            lib_1.vt.outln(' ', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
            lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.cyan, lib_1.vt.bright);
            lib_1.vt.out('    Class: ', lib_1.vt.white);
            if ($.player.emulation == 'XT' && profile.user.wins > 0)
                lib_1.vt.out('\r\x1B[2C🎖️\r\x1B[12C');
            lib_1.vt.out(sys_1.sprintf('%-21s', profile.user.pc + ' (' + profile.user.gender + ')'));
            lib_1.vt.out(lib_1.vt.cyan, ' Exp: ', lib_1.vt.white);
            if (profile.user.xp < 1e+8)
                lib_1.vt.out(sys_1.sprintf('%-15f', profile.user.xp));
            else
                lib_1.vt.out(sys_1.sprintf('%-15.7e', profile.user.xp));
            lib_1.vt.outln(' ', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
            lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.cyan, lib_1.vt.bright);
            lib_1.vt.out(' Immortal: ', lib_1.vt.white);
            lib_1.vt.out(sys_1.sprintf('%-20s', (profile.user.wins ? `${sys_1.romanize(profile.user.wins)}.` : '')
                + profile.user.immortal + '.' + profile.user.level + ` (${profile.user.calls})`));
            lib_1.vt.out(lib_1.vt.cyan, ' Need: ', lib_1.vt.white);
            if (this.experience(profile.user.level, undefined, profile.user.int) < 1e+8)
                lib_1.vt.out(sys_1.sprintf('%-15f', this.experience(profile.user.level, undefined, profile.user.int)));
            else
                lib_1.vt.out(sys_1.sprintf('%-15.7e', this.experience(profile.user.level, undefined, profile.user.int)));
            lib_1.vt.outln(' ', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
            lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.cyan, lib_1.vt.bright);
            lib_1.vt.out('      Str: ', lib_1.vt.white);
            if ($.player.emulation == 'XT')
                lib_1.vt.out('\r\x1B[2C💪\r\x1B[12C');
            lib_1.vt.out(sys_1.sprintf('%-20s', profile.str + ' (' + profile.user.str + ',' + profile.user.maxstr + ')'));
            lib_1.vt.out(lib_1.vt.cyan, ' Hand: ', profile.user.coin.carry(), ' '.repeat(15 - profile.user.coin.amount.length));
            lib_1.vt.outln(' ', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
            lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.cyan, lib_1.vt.bright);
            lib_1.vt.out('      Int: ', lib_1.vt.white);
            lib_1.vt.out(sys_1.sprintf('%-20s', profile.int + ' (' + profile.user.int + ',' + profile.user.maxint + ')'));
            lib_1.vt.out(lib_1.vt.cyan, ' Bank: ', profile.user.bank.carry(), ' '.repeat(15 - profile.user.bank.amount.length));
            lib_1.vt.outln(' ', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
            lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.cyan, lib_1.vt.bright);
            lib_1.vt.out('      Dex: ', lib_1.vt.white);
            lib_1.vt.out(sys_1.sprintf('%-20s', profile.dex + ' (' + profile.user.dex + ',' + profile.user.maxdex + ')'));
            lib_1.vt.out(lib_1.vt.cyan, ' Loan: ', profile.user.loan.carry(), ' '.repeat(15 - profile.user.loan.amount.length));
            lib_1.vt.outln(' ', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
            lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.cyan, lib_1.vt.bright);
            lib_1.vt.out('      Cha: ', lib_1.vt.white);
            lib_1.vt.out(sys_1.sprintf('%-19s', profile.cha + ' (' + profile.user.cha + ',' + profile.user.maxcha + ')'));
            lib_1.vt.out(lib_1.vt.faint, ' Steal: ', lib_1.vt.normal);
            lib_1.vt.out(sys_1.sprintf('%-15s', ['lawful', 'desperate', 'trickster', 'adept', 'master'][profile.user.steal]));
            lib_1.vt.outln(' ', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
            if (profile.user.blessed) {
                let who = { id: profile.user.blessed };
                if (!this.load(who)) {
                    if (profile.user.blessed == 'well')
                        who.handle = 'a wishing well';
                    else
                        who.handle = profile.user.blessed;
                }
                lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.yellow, lib_1.vt.bright);
                lib_1.vt.out(' +Blessed:', lib_1.vt.white, lib_1.vt.normal, ' by ', sys_1.sprintf('%-39s', who.handle));
                lib_1.vt.outln(' ', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
            }
            if (profile.user.cursed) {
                let who = { id: profile.user.cursed };
                if (!this.load(who)) {
                    if (profile.user.cursed == 'wiz!')
                        who.handle = 'a doppelganger!';
                    else
                        who.handle = profile.user.cursed;
                }
                lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.white);
                lib_1.vt.out('  -Cursed:', lib_1.vt.normal, ' by ', sys_1.sprintf('%-39s', who.handle));
                lib_1.vt.outln(' ', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
            }
            lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.cyan, lib_1.vt.bright);
            lib_1.vt.out('       HP: ', lib_1.vt.white);
            if ($.player.emulation == 'XT')
                lib_1.vt.out('\r\x1B[2C🌡️\r\x1B[12C');
            lib_1.vt.out(sys_1.sprintf('%-42s', profile.hp + '/' + profile.user.hp + ' ('
                + ['weak', 'normal', 'adept', 'warrior', 'brute', 'hero'][profile.user.melee] + ', '
                + ['a rare', 'occasional', 'deliberate', 'angry', 'murderous'][profile.user.backstab] + ' backstab)'));
            lib_1.vt.outln(' ', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
            if (profile.user.magic > 1) {
                lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.magenta, lib_1.vt.bright);
                lib_1.vt.out('       SP: ', lib_1.vt.white);
                lib_1.vt.out(sys_1.sprintf('%-42s', profile.sp + '/' + profile.user.sp + ' (' + ['wizardry', 'arcane', 'divine'][profile.user.magic - 2] + ')'));
                lib_1.vt.outln(' ', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
            }
            if (profile.user.spells.length) {
                lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.magenta, lib_1.vt.bright);
                lib_1.vt.out(sys_1.sprintf(' %8s: ', ['Wands', 'Wands', 'Scrolls', 'Spells', 'Magus'][profile.user.magic]), lib_1.vt.white);
                let text = '';
                n = 0;
                for (let p = 0; p < profile.user.spells.length; p++) {
                    let spell = profile.user.spells[p];
                    let name = items_1.Magic.pick(spell);
                    if (spell < 5 || (spell < 17 && name.length > 7))
                        name = name.slice(0, 3);
                    if (text.length + name.length > 40)
                        break;
                    if (text.length)
                        text += ',';
                    text += name;
                    n++;
                }
                lib_1.vt.out(sys_1.sprintf('%-42s', text));
                lib_1.vt.outln(' ', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
                while (n < profile.user.spells.length) {
                    text = '';
                    i = 0;
                    lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.white, lib_1.vt.bright, '           ');
                    for (let p = 0; p < profile.user.spells.length; p++) {
                        i++;
                        if (i > n) {
                            let spell = profile.user.spells[p];
                            let name = items_1.Magic.pick(spell);
                            if (spell < 17 && name.length > 7)
                                name = name.slice(0, 3);
                            if (text.length + name.length > 40)
                                break;
                            if (text.length)
                                text += ',';
                            text += name;
                            n++;
                        }
                    }
                    lib_1.vt.out(sys_1.sprintf('%-42s', text));
                    lib_1.vt.outln(' ', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
                }
            }
            if (profile.user.rings.length) {
                lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.magenta, lib_1.vt.bright);
                lib_1.vt.out('    Rings: ', lib_1.vt.white);
                if ($.player.emulation == 'XT')
                    lib_1.vt.out('\r\x1B[2C💍\r\x1B[12C');
                let text = '';
                n = 0;
                for (let p = 0; p < profile.user.rings.length; p++) {
                    let name = profile.user.rings[p];
                    if (text.length + name.length > 40)
                        break;
                    if (text.length)
                        text += ',';
                    text += name;
                    n++;
                }
                lib_1.vt.out(sys_1.sprintf('%-42s', text));
                lib_1.vt.outln(' ', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
                while (n < profile.user.rings.length) {
                    text = '';
                    i = 0;
                    lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.white, lib_1.vt.bright, '           ');
                    for (let p = 0; p < profile.user.rings.length; p++) {
                        i++;
                        if (i > n) {
                            let name = profile.user.rings[p];
                            if (text.length + name.length > 40)
                                break;
                            if (text.length)
                                text += ',';
                            text += name;
                            n++;
                        }
                    }
                    lib_1.vt.out(sys_1.sprintf('%-42s', text));
                    lib_1.vt.outln(' ', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
                }
            }
            lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.white);
            lib_1.vt.out('  Alchemy: ', lib_1.vt.normal);
            lib_1.vt.out(sys_1.sprintf('%-42s', ['banned', 'apprentice', 'expert (+1x,+1x)', 'artisan (+1x,+2x)', 'master (+2x,+2x)'][profile.user.poison]));
            lib_1.vt.outln(' ', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
            if (profile.user.poisons.length) {
                lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.white);
                lib_1.vt.out(sys_1.sprintf(' %8s: ', ['Vial', 'Toxin', 'Poison', 'Bane', 'Venena'][profile.user.poison]), lib_1.vt.normal);
                if ($.player.emulation == 'XT')
                    lib_1.vt.out('\r\x1B[2C🧪\r\x1B[12C');
                lib_1.vt.out(sys_1.sprintf('%-42s', profile.user.poisons.toString()));
                lib_1.vt.outln(' ', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
            }
            lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.cyan, lib_1.vt.bright);
            lib_1.vt.out('   Weapon: ');
            if ($.player.emulation == 'XT')
                lib_1.vt.out('\r\x1B[2C🗡️\r\x1B[12C');
            lib_1.vt.out(lib_1.weapon(profile), ' '.repeat(42 - lib_1.weapon(profile, true).length));
            lib_1.vt.outln(' ', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
            lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.cyan, lib_1.vt.bright);
            lib_1.vt.out('    Armor: ');
            if ($.player.emulation == 'XT')
                lib_1.vt.out('\r\x1B[2C🛡\r\x1B[12C');
            lib_1.vt.out(lib_1.armor(profile), ' '.repeat(42 - lib_1.armor(profile, true).length));
            lib_1.vt.outln(' ', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
            lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.cyan, lib_1.vt.bright);
            lib_1.vt.out(' Lives in: ', lib_1.vt.white);
            lib_1.vt.out(sys_1.sprintf('%-42s', profile.user.realestate + ' (' + profile.user.security + ')'));
            lib_1.vt.outln(' ', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
            if (profile.user.gang) {
                lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.cyan, lib_1.vt.bright);
                lib_1.vt.out('    Party: ', lib_1.vt.white);
                if ($.player.emulation == 'XT')
                    lib_1.vt.out('\r\x1B[2C🏴\r\x1B[12C');
                lib_1.vt.out(sys_1.sprintf('%-42s', profile.user.gang));
                lib_1.vt.outln(' ', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
            }
            if (+profile.user.hull) {
                lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.cyan, lib_1.vt.bright);
                lib_1.vt.out('  Warship: ', lib_1.vt.white);
                lib_1.vt.out(sys_1.sprintf('%-18s', profile.hull.toString() + ':' + profile.user.hull.toString()));
                lib_1.vt.out(lib_1.vt.cyan, ' Cannon: ', lib_1.vt.white);
                lib_1.vt.out(sys_1.sprintf('%-15s', profile.user.cannon.toString() + ':' + (profile.user.hull / 50).toString() + (profile.user.ram ? ' (RAM)' : '')));
                lib_1.vt.outln(' ', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
            }
            lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.cyan, lib_1.vt.bright);
            lib_1.vt.out(' Brawling: ', lib_1.vt.white);
            lib_1.vt.out(sys_1.sprintf('%-19s', profile.user.tw + ':' + profile.user.tl));
            lib_1.vt.out(lib_1.vt.cyan, 'Steals: ', lib_1.vt.white);
            lib_1.vt.out(sys_1.sprintf('%-15s', profile.user.steals));
            lib_1.vt.outln(' ', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
            lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.cyan, lib_1.vt.bright);
            lib_1.vt.out(' Jousting: ', lib_1.vt.white);
            lib_1.vt.out(sys_1.sprintf('%-20s', profile.user.jw + ':' + profile.user.jl + ` (${this.jousting(profile)})`));
            lib_1.vt.out(lib_1.vt.cyan, 'Plays: ', lib_1.vt.white);
            lib_1.vt.out(sys_1.sprintf('%-15s', profile.user.plays));
            lib_1.vt.outln(' ', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
            lib_1.vt.out(lib_1.vt.blue, lib_1.vt.faint, '|', lib_1.vt.Blue, lib_1.vt.cyan, lib_1.vt.bright);
            lib_1.vt.out('    Kills: ', lib_1.vt.white);
            if ($.player.emulation == 'XT')
                lib_1.vt.out('\r\x1B[2C💀\r\x1B[12C');
            lib_1.vt.out(sys_1.sprintf('%-42s', profile.user.kills + ' with ' + profile.user.retreats + ' retreats and killed ' + profile.user.killed + 'x'));
            lib_1.vt.outln(' ', lib_1.vt.reset, lib_1.vt.blue, lib_1.vt.faint, '|');
            lib_1.vt.outln(lib_1.vt.blue, '+', lib_1.vt.faint, line, lib_1.vt.normal, '+');
        }
        wearing(profile) {
            if (isNaN(+profile.user.weapon)) {
                lib_1.vt.outln('\n', this.who(profile).He, profile.weapon.text, ' ', lib_1.weapon(profile), $.from == 'Dungeon' ? -300 : !profile.weapon.shoppe ? -500 : -100);
            }
            if (isNaN(+profile.user.armor)) {
                lib_1.vt.outln('\n', this.who(profile).He, profile.armor.text, ' ', lib_1.armor(profile), $.from == 'Dungeon' ? -300 : !profile.armor.armoury ? -500 : -100);
            }
            if (!$.player.novice && $.from !== 'Dungeon' && profile.user.sex == 'I')
                for (let i in profile.user.rings) {
                    let ring = profile.user.rings[i];
                    if (!+i)
                        lib_1.vt.outln();
                    lib_1.vt.out(this.who(profile).He, 'has ', lib_1.vt.cyan, lib_1.vt.bright, ring, lib_1.vt.normal);
                    if ($.player.emulation == 'XT')
                        lib_1.vt.out(' ', items_1.Ring.name[ring].emoji);
                    lib_1.vt.outln(' powers ', lib_1.vt.reset, 'that can ', items_1.Ring.name[ring].description, -100);
                }
        }
        what(rpc, action) {
            return action + (rpc !== $.online ? (/.*ch$|.*sh$|.*s$|.*z$/i.test(action) ? 'es ' : 's ') : ' ');
        }
        who(pc, mob = false) {
            let user = sys_1.isActive(pc) ? pc.user : pc;
            const gender = pc === $.online ? 'U' : user.gender;
            const Handle = `${gender == 'I' && $.from !== 'Party' ? 'The ' : ''}${user.handle}`;
            const handle = `${gender == 'I' && $.from !== 'Party' ? 'the ' : ''}${user.handle}`;
            return {
                He: `${{ M: mob ? Handle : 'He', F: mob ? Handle : 'She', I: mob ? Handle : 'It', U: 'You' }[gender]} `,
                he: `${{ M: 'he', F: 'she', I: 'it', U: 'you' }[gender]} `,
                him: `${{ M: mob ? handle : 'him', F: mob ? handle : 'her', I: mob ? handle : 'it', U: 'you' }[gender]} `,
                His: `${{
                    M: mob ? Handle + `'` + (Handle.substr(-1) !== 's' ? 's' : '') : 'His',
                    F: mob ? Handle + `'` + (Handle.substr(-1) !== 's' ? 's' : '') : 'Her',
                    I: mob ? Handle + `'` + (Handle.substr(-1) !== 's' ? 's' : '') : 'Its', U: 'Your'
                }[gender]} `,
                his: `${{
                    M: mob ? handle + `'` + (handle.substr(-1) !== 's' ? 's' : '') : 'his',
                    F: mob ? handle + `'` + (handle.substr(-1) !== 's' ? 's' : '') : 'her',
                    I: mob ? handle + `'` + (handle.substr(-1) !== 's' ? 's' : '') : 'its', U: 'your'
                }[gender]} `,
                self: `${{ M: 'him', F: 'her', I: 'it', U: 'your' }[gender]}self `,
                You: `${{ M: Handle, F: Handle, I: Handle, U: 'You' }[gender]} `,
                you: `${{ M: handle, F: handle, I: handle, U: 'you' }[gender]}`
            };
        }
    }
    pc_1.Deed = new _deed;
    pc_1.PC = new _pc;
})(pc || (pc = {}));
module.exports = pc;
