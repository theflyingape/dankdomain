"use strict";
const $ = require("./runtime");
const db = require("./db");
const items_1 = require("./items");
const lib_1 = require("./lib");
const pc_1 = require("./pc");
const sys_1 = require("./sys");
var npc;
(function (npc) {
    class _arena {
        constructor() {
            this.monsters = require(sys_1.pathTo('characters', 'arena.json'));
        }
    }
    class _dungeon {
        constructor() {
            this.domain = new Array(10);
            this.potions = [];
            this.crawling = {
                'N': { description: 'orth' },
                'S': { description: 'outh' },
                'E': { description: 'ast' },
                'W': { description: 'est' },
                'C': { description: 'ast' },
                'P': { description: 'oison' },
                'Y': { description: 'our status' }
            };
            this.potion = [
                'Potion of Cure Light Wounds',
                'Vial of Weakness',
                'Potion of Charm',
                'Vial of Stupidity',
                'Potion of Agility',
                'Vial of Clumsiness',
                'Potion of Wisdom',
                'Vile Vial',
                'Potion of Stamina',
                'Vial of Slaad Secretions',
                'Potion of Mana',
                'Flask of Fire Water',
                'Elixir of Restoration',
                'Vial of Crack',
                'Potion of Augment',
                'Beaker of Death'
            ];
            this.Cleric = {
                VT: '\x1B(0\x7D\x1B(B',
                PC: '\x9C',
                XT: '✟',
                dumb: '+'
            };
            this.Dot = lib_1.vt.Empty;
            this.Mask = ['   ', ' ѩ ', 'ѩ ѩ', 'ѩѩѩ', 'ѩӂѩ'];
            this.Monster = {
                door: ['   ', 'Mon', 'M+M', 'Mob', 'MOB'],
                telnet: ['   ', 'Mon', 'M+M', 'Mob', 'MOB']
            };
            this.Teleport = {
                VT: '\x1B(0\x67\x1B(B',
                PC: '\xF1',
                XT: '↨',
                dumb: '%'
            };
            this.monsters = require(sys_1.pathTo('characters', 'dungeon.json'));
            let containers = ['beaker filled with', 'bottle containing', 'flask of', 'vial holding'];
            let v = 0;
            while (containers.length) {
                let c = sys_1.dice(containers.length) - 1;
                let liquids = ['bubbling', 'clear', 'milky', 'sparkling'];
                let colors = ['amber', 'sapphire', 'crimson', 'emerald', 'amethyst'];
                let coded = [lib_1.vt.yellow, lib_1.vt.blue, lib_1.vt.red, lib_1.vt.green, lib_1.vt.magenta];
                while (liquids.length) {
                    let l = sys_1.dice(liquids.length) - 1;
                    let i = sys_1.dice(colors.length) - 1;
                    this.potions.push({
                        potion: v++, identified: false,
                        image: 'potion/' + (containers[c].startsWith('beaker') ? 'beaker' : colors[i]),
                        description: lib_1.vt.attr(lib_1.vt.uline, containers[c], lib_1.vt.nouline, ' a ', liquids[l], ' ', coded[i], colors[i])
                    });
                    liquids.splice(l, 1);
                    colors.splice(i, 1);
                    coded.splice(i, 1);
                }
                containers.splice(c, 1);
            }
        }
    }
    class _elemental {
        constructor() {
            this.Bail = '';
            this.Brawl = '';
            this.Curse = '';
            this.Fight = '';
            this.Joust = '';
            this.Party = '';
            this.Resurrect = '';
            this.Rob = '';
            this._cmd = [];
        }
        get cmd() {
            return this._cmd.length ? this._cmd.splice(0, 1).toString() : '';
        }
        set cmd(input) {
            this._cmd = this._cmd.concat(input);
        }
        flush(cmd) {
            this._cmd = [];
            if (cmd)
                this.cmd = cmd;
        }
        nme(venue) {
            this[venue] = '';
            this.targets.sort((n1, n2) => (n1[venue] < n2[venue] ? 1 : -1));
            for (let i in this.targets) {
                if (sys_1.dice(this.targets[i][venue]) > 1) {
                    this[venue] = this.targets[i].player.id;
                    break;
                }
            }
        }
        orders(from) {
            lib_1.vt.action(from.toLowerCase());
            $.from = from;
            if (!$.access.bot) {
                lib_1.vt.title(`${$.sysop.name} :: ${from}`);
                return;
            }
            if (this._cmd.length)
                return;
            switch (from) {
                case 'Arena':
                    if (sys_1.dice($.player.poison) > 1 && $.player.toWC >= 0 && $.player.toWC < sys_1.int($.player.poisons.length / 2) + 1)
                        this.cmd = 'p';
                    if ($.online.hp < $.player.hp || $.player.coin.value >= sys_1.money($.player.level))
                        this.cmd = 'g';
                    if ($.joust) {
                        if (this.Joust) {
                            this.cmd = 'j';
                            return;
                        }
                    }
                    if ($.arena) {
                        if (this.Fight) {
                            this.cmd = 'u';
                            let m = sys_1.whole($.player.level / 2) + 1;
                            m = sys_1.whole($.player.level / m) + 1;
                        }
                        else {
                            this.cmd = 'm';
                            if ($.player.level > 51 && $.online.weapon.wc > 37)
                                this.cmd = 'd';
                            else {
                                let mon = 0;
                                for (mon = 0; mon < 12; mon++) {
                                    let monster = { user: pc_1.PC.reroll(db.fillUser(), npc.arena.monsters[mon].pc, npc.arena.monsters[mon].level) };
                                    monster.user.handle = npc.arena.monsters[mon].name;
                                    monster.user.weapon = npc.arena.monsters[mon].weapon;
                                    monster.user.armor = npc.arena.monsters[mon].armor;
                                    pc_1.PC.activate(monster);
                                    if (monster.user.level > ($.player.level + sys_1.int($.player.melee / 2) + sys_1.int($.player.backstab / 2)))
                                        break;
                                }
                                this.cmd = mon.toString();
                            }
                        }
                    }
                    this.cmd = 'q';
                    break;
                case 'Casino':
                    break;
                case 'Library':
                    this.cmd = ['h', 'i'][sys_1.dice(2) - 1];
                    this.cmd = ['c', 'm', 't', 'w'][sys_1.dice(4) - 1];
                    this.cmd = 'q';
                    break;
                case 'MainMenu':
                    this.refresh();
                    this.nme('Bail');
                    this.nme('Brawl');
                    this.nme('Curse');
                    this.nme('Fight');
                    this.nme('Joust');
                    this.nme('Party');
                    this.nme('Resurrect');
                    this.nme('Rob');
                    if (sys_1.dice(77) > 1) {
                        this.cmd = 'y';
                        this.cmd = 'm';
                        if ($.access.roleplay) {
                            if ($.player.coin.value >= sys_1.money($.player.level))
                                this.cmd = 's';
                            else if ($.timeleft > 4 && $.brawl && this.Brawl)
                                this.cmd = 't';
                            else if ($.joust && this.Joust)
                                this.cmd = 'a';
                            else if ($.arena && (this.Fight || sys_1.dice(6) > 1))
                                this.cmd = 'a';
                            else if ($.party && (this.Party || sys_1.dice(6) == 6)) {
                                this.Party = this.Party || 'M';
                                this.cmd = 'p';
                            }
                        }
                        else {
                            this.cmd = 'l';
                        }
                    }
                    if (!this._cmd.length)
                        this.cmd = ['g', 'l', 'n', 'p', 'q', 'r', 't', 'u', 'x', 'z'][sys_1.dice(10) - 1];
                    break;
                case 'Party':
                    this.cmd = 'm';
                    if ($.party && this.Party) {
                        this.cmd = 'f';
                        return;
                    }
                    this.cmd = 'q';
                    break;
                case 'Square':
                    const rarity = sys_1.whole(1000 / ($.player.steal + 1));
                    if ($.player.bank.value > 0) {
                        this.cmd = 'b';
                        this.cmd = 'w';
                        if ($.player.level > 1 && sys_1.dice(rarity) == rarity)
                            this.cmd = 'r';
                        this.cmd = 'q';
                    }
                    if ($.player.coin.value > 0) {
                        if ($.player.magic > 1 || $.player.magic >= $.player.poison) {
                            this.cmd = 'm';
                            if ($.player.poison)
                                this.cmd = 'v';
                        }
                        else {
                            if ($.player.poison)
                                this.cmd = 'v';
                            if ($.player.magic)
                                this.cmd = 'm';
                        }
                        this.cmd = 's';
                        this.cmd = 'w';
                        this.cmd = 'a';
                        this.cmd = 'r';
                    }
                    else {
                        if (sys_1.dice(rarity) == 1 || (!$.arena && !$.brawl && !$.joust && (!$.naval || !$.player.hull) && !$.party && sys_1.dice($.player.steal) > 1))
                            this.cmd = 'p';
                    }
                    if ($.player.coin.value > 0) {
                        this.cmd = 'b';
                        this.cmd = 'd';
                        if ($.player.level > 1 && sys_1.dice(rarity) == rarity)
                            this.cmd = 'r';
                        this.cmd = 'q';
                    }
                    if ($.online.hp < $.player.hp)
                        this.cmd = 'h';
                    if ($.arena || $.joust || ($.player.poison > 1 && $.player.toWC == 0))
                        this.cmd = 'g';
                    break;
                case 'Tavern':
                    if ($.brawl && this.Brawl)
                        this.cmd = 'b';
                    else {
                        this.cmd = ['e', 't', 'y'][sys_1.dice(3) - 1];
                        if ($.player.level > 66 && sys_1.dice(10) == 1)
                            this.cmd = 's';
                        this.cmd = 'q';
                    }
                    break;
            }
            if (!this._cmd.length)
                this.cmd = 'q';
        }
        refresh() {
            $.player.coward = false;
            let lo = $.player.level - 3;
            let hi = $.player.level +
                $.player.level < 15 ? $.player.melee
                : $.player.level < 30 ? sys_1.dice(3) + $.player.melee
                    : $.player.level < 60 ? sys_1.dice(6) + $.player.melee
                        : 30;
            lo = lo < 1 ? 1 : lo;
            hi = hi > 99 ? 99 : hi;
            this.targets = [];
            let rpc = { user: { id: '' } };
            const rs = db.query(`SELECT id FROM Players
            WHERE id != '${$.player.id}' AND id NOT GLOB '_*'
            AND gang != '${$.player.gang}'
            AND level BETWEEN ${lo} AND ${hi} AND xplevel > 0
            ORDER BY level`);
            for (let i in rs) {
                rpc.user.id = rs[i].id;
                const online = !pc_1.PC.load(rpc);
                if (!items_1.Access.name[rpc.user.access].roleplay)
                    continue;
                if (!db.lock(rpc.user.id))
                    continue;
                this.targets = this.targets.concat({
                    player: rpc.user,
                    Bail: 0, Brawl: 0, Curse: 0, Fight: 0, Joust: 0, Party: 0, Resurrect: 0, Rob: 0
                });
                const n = this.targets.length - 1;
                let target = this.targets[n];
                const diff = sys_1.whole(hi - rpc.user.level) + 1;
                const up = pc_1.PC.experience($.player.level, 1, $.player.int);
                const need = sys_1.whole(100 - 2 * sys_1.int(100 * sys_1.whole(up - $.player.xp) / up));
                if (rpc.user.status !== 'jail') {
                    if ($.joust && !(rpc.user.level > 1 && (rpc.user.jw + 3 * rpc.user.level) < rpc.user.jl)) {
                        const ability = pc_1.PC.jousting($.online);
                        const versus = pc_1.PC.jousting(rpc);
                        const factor = (100 - ($.player.level > rpc.user.level ? $.player.level : rpc.user.level)) / 10 + 3;
                        if ((ability + factor * $.player.level) > versus)
                            target.Joust += diff + sys_1.whole(ability - versus) * (100 - $.player.level);
                    }
                    if ($.brawl) {
                        target.Brawl += diff + $.player.melee;
                    }
                    if ($.arena) {
                        if (!rpc.user.novice && !rpc.user.status)
                            target.Fight += diff + $.player.melee + $.player.backstab;
                    }
                    if ($.party && rpc.user.gang && !rpc.user.status) {
                        let gang = pc_1.PC.loadGang(rpc.user.gang);
                        if (need > 10 && need < 70) {
                            let sum = 0, size = 0;
                            for (let i in gang.members) {
                                if (gang.validated[i]) {
                                    let nme = { user: { id: gang.members[i] } };
                                    if (pc_1.PC.load(nme) && !nme.user.status) {
                                        sum += nme.user.xplevel;
                                        size++;
                                    }
                                }
                            }
                            if (sum && size)
                                target.Party += 100 - sys_1.int(sum / size) + sys_1.int($.player.level / 3) + diff;
                        }
                    }
                    if ($.rob) {
                        target.Rob += diff + $.player.steal;
                    }
                }
                else {
                    if ($.bail) {
                        target.Bail = 3 + diff;
                    }
                    if ($.rob) {
                        target.Rob += 2 * (diff + $.player.steal);
                    }
                }
            }
        }
    }
    npc.arena = new _arena;
    npc.dungeon = new _dungeon;
    npc.elemental = new _elemental;
})(npc || (npc = {}));
module.exports = npc;
