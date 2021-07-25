"use strict";
const sys_1 = require("./sys");
var Items;
(function (Items) {
    const folder = sys_1.pathTo('files/items');
    class _access {
        constructor() {
            this.name = require(sys_1.path.resolve(folder, 'access.json'));
        }
    }
    class _armor {
        constructor() {
            this.dwarf = [];
            this.merchant = [];
            this.special = [];
            this.name = require(sys_1.path.resolve(folder, 'armor.json'));
            for (let i in this.name) {
                if (this.name[i].armoury)
                    this.merchant.push(i);
                else if (this.name[i].dwarf)
                    this.dwarf.push(i);
                else
                    this.special.push(i);
            }
        }
        baseAC(name) {
            let ac = 0;
            if (typeof this.name[name] == 'undefined')
                ac = Math.abs(+name);
            else
                ac = this.name[name].ac;
            return ac;
        }
        buffAC(rpc) {
            let ac = this.baseAC(rpc.user.armor) + rpc.toAC + rpc.user.toAC;
            return ac;
        }
        equip(rpc, what, keep = false) {
            let armor;
            if (isNaN(+what)) {
                rpc.user.armor = what;
                armor = this.name[what];
            }
            else {
                if (what >= this.merchant.length)
                    what = this.merchant.length - 1;
                rpc.user.armor = +what;
                armor = { ac: +what, value: this.merchant[+what] ? this.name[this.merchant[+what]].value : '0c' };
            }
            if (!keep)
                rpc.user.toAC = 0;
            rpc.armor = armor;
            rpc.toAC = 0;
            rpc.altered = true;
        }
        swap(winner, loser, value) {
            if (!isNaN(+winner.user.armor) || !isNaN(+loser.user.armor))
                return false;
            if ((winner.user.toAC >= 0 && winner.armor.ac >= loser.armor.ac)
                || (winner.user.toAC < 0 && winner.armor.ac + winner.user.toAC > loser.armor.ac)) {
                if (value) {
                    winner.user.coin.value += value.value;
                    return value;
                }
                return false;
            }
            [winner.armor, loser.armor] = [loser.armor, winner.armor];
            [winner.toAC, loser.toAC] = [loser.toAC, winner.toAC];
            [winner.user.armor, loser.user.armor] = [loser.user.armor, winner.user.armor];
            [winner.user.toAC, loser.user.toAC] = [loser.user.toAC, winner.user.toAC];
            if (loser.user.id) {
                winner.toAC = 0;
                if (winner.user.toAC > 0)
                    winner.user.toAC >>= 1;
            }
            if (winner.user.id) {
                loser.toAC = 0;
                if (loser.user.toAC > 0)
                    loser.user.toAC >>= 1;
            }
            winner.altered = true;
            loser.altered = true;
            return true;
        }
        wearing(rpc, text = true) {
            let result = '';
            if (isNaN(+rpc.user.armor)) {
                if (text)
                    result = rpc.armor.text + ' ';
                result += rpc.user.armor;
            }
            return result;
        }
    }
    class Coin {
        constructor(money) {
            if (typeof money == 'string')
                this.amount = money;
            else
                this.value = money;
        }
        get value() {
            return this._value;
        }
        set value(newValue) {
            const MAX = (1e+18 - 1e+09);
            this._value = newValue < MAX ? sys_1.whole(newValue)
                : newValue == Infinity ? 1 : MAX;
        }
        get amount() {
            let n = this.value;
            let bags = [];
            if (this.pouch(n) == 'p') {
                n = sys_1.int(n / 1e+13);
                bags.push(`${n}p`);
                n = this.value % 1e+13;
            }
            if (this.pouch(n) == 'g') {
                n = sys_1.int(n / 1e+09);
                bags.push(`${n}g`);
                n = this.value % 1e+09;
            }
            if (this.pouch(n) == 's') {
                n = sys_1.int(n / 1e+05);
                bags.push(`${n}s`);
                n = this.value % 1e+05;
            }
            if ((n > 0 && this.pouch(n) == 'c') || bags.length == 0)
                bags.push(`${n}c`);
            return bags.toString();
        }
        set amount(newAmount) {
            this.value = 0;
            let coins = 0;
            for (let i = 0; i < newAmount.length; i++) {
                let c = newAmount.charAt(i);
                switch (c) {
                    case 'c':
                        coins *= 1;
                        break;
                    case 's':
                        coins *= 1e+05;
                        break;
                    case 'g':
                        coins *= 1e+09;
                        break;
                    case 'p':
                        coins *= 1e+13;
                        break;
                }
                if (c >= '0' && c <= '9') {
                    coins *= 10;
                    coins += +c;
                }
                else {
                    this.value += coins;
                    coins = 0;
                }
            }
        }
        carry(coin = this, bags = 2) {
            return coin.amount.split(',').slice(0, bags).toString();
        }
        pick(x = sys_1.dice(this.amount.split(',').length)) {
            return new Coin(this.amount.split(',')[x - 1]);
        }
        pouch(coins = this.value) {
            return (coins < 1e+05) ? 'c' : (coins < 1e+09) ? 's' : (coins < 1e+13) ? 'g' : 'p';
        }
    }
    Items.Coin = Coin;
    class _magic {
        constructor(ring) {
            this.merchant = [];
            this.special = [];
            this.ring = ring;
            this.spells = require(sys_1.path.resolve(folder, 'magic.json'));
            for (let i in this.spells) {
                if (this.spells[i].cost)
                    this.merchant.push(i);
                else
                    this.special.push(i);
            }
        }
        ability(spell, rpc, nme) {
            let skill = rpc.user.magic || 1;
            let fail;
            let backfire;
            fail = rpc.int + sys_1.int(rpc.user.level / 10) - (this.spells[spell].cast < 17 ? this.spells[spell].cast : this.spells[spell].cast - 8) - (5 - skill) - sys_1.int(rpc.user.coward);
            if (nme && [9, 11, 12, 14, 15, 16, 19, 20, 21, 22].indexOf(this.spells[spell].cast) >= 0) {
                let m = rpc.int - nme.int;
                m = (m < -10) ? -10 : (m > 10) ? 10 : m;
                m += 2 * (skill - nme.user.magic);
                fail += m;
            }
            fail = (fail < 11) ? 11 : (fail > 99) ? 99 : fail;
            if (nme && nme.user.rings.length)
                fail -= 2
                    * this.ring.power(rpc.user.rings, nme.user.rings, 'cast', 'magic', skill).power
                    * (5 - nme.user.magic);
            backfire = 50 + (fail >> 1) - +rpc.user.coward;
            return { fail, backfire };
        }
        add(spells, n) {
            let m = +n;
            if (isNaN(m)) {
                for (let i in this.spells) {
                    if (n == i) {
                        n = this.spells[i].cast;
                        break;
                    }
                }
            }
            if (+n) {
                if (!this.have(spells, n)) {
                    spells.push(+n);
                    spells.sort((n1, n2) => n1 - n2);
                }
            }
        }
        have(spells, n) {
            let have = false;
            if (typeof n == 'number' && spells.indexOf(n) >= 0)
                have = true;
            else {
                for (let i = 0; i < spells.length; i++) {
                    if (n == this.pick(spells[i])) {
                        have = true;
                        break;
                    }
                }
            }
            return have;
        }
        pick(n) {
            let name = '';
            if (n > 0 && n <= Object.keys(this.spells).length)
                for (let key in this.spells)
                    if (n == this.spells[key].cast) {
                        name = key;
                        break;
                    }
            return name;
        }
        power(rpc, n) {
            let spell = this.spells[this.pick(n)];
            return rpc.user.magic < 2 ? 0 : rpc.user.magic < 4 ? spell.mana : spell.enchanted;
        }
        remove(spells, n) {
            let i = spells.indexOf(n);
            if (i >= 0)
                spells.splice(i, 1);
        }
    }
    class _poison {
        constructor() {
            this.merchant = [];
            this.vials = require(sys_1.path.resolve(folder, 'poison.json'));
            for (let i in this.vials) {
                if (this.vials[i].cost)
                    this.merchant.push(i);
            }
        }
        add(vials, n) {
            n = +n;
            if (!this.have(vials, n)) {
                vials.push(n);
                vials.sort((n1, n2) => n1 - n2);
            }
        }
        have(vials, n) {
            let have = false;
            if (typeof n == 'number' && vials.indexOf(n) >= 0)
                have = true;
            else {
                for (let i = 0; i < vials.length; i++) {
                    if (n == this.pick(vials[i])) {
                        have = true;
                        break;
                    }
                }
            }
            return have;
        }
        pick(n) {
            let name = '';
            if (n > 0 && n <= Object.keys(this.vials).length)
                for (let key in this.vials)
                    if (n == this.vials[key].power) {
                        name = key;
                        break;
                    }
            return name;
        }
        remove(vials, n) {
            let i = vials.indexOf(n);
            if (i >= 0)
                vials.splice(i, 1);
        }
    }
    class _realestate {
        constructor() {
            this.merchant = [];
            this.name = require(sys_1.path.resolve(folder, 'realestate.json'));
            for (let i in this.name)
                this.merchant.push(i);
        }
    }
    class _ring {
        constructor() {
            this.common = [];
            this.unique = [];
            this.name = require(sys_1.path.resolve(folder, 'ring.json'));
            for (let i in this.name)
                if (this.name[i].unique)
                    this.unique.push(i);
                else
                    this.common.push(i);
            this.theOne = this.power([], null, 'ring').name;
        }
        have(rings, name) {
            return rings.indexOf(name) >= 0;
        }
        remove(rings, name) {
            let i = rings.indexOf(name);
            if (i >= 0)
                rings.splice(i, 1);
        }
        power(vs, rings, id, match, value) {
            let mine = (rings == null) ? Object.keys(this.name) : rings;
            let name = '';
            let power = 0;
            if (!vs.length || !this.have(vs, this.theOne)) {
                for (let f in mine) {
                    let abilities = this.name[mine[f]].ability;
                    for (let a in abilities) {
                        if (abilities[a].id == id) {
                            name = mine[f];
                            if (Object.keys(abilities[a]).length == 2)
                                power = sys_1.int(abilities[a].power);
                            else if (match && abilities[a][match]) {
                                if (value && abilities[a][match] == value)
                                    power = sys_1.int(abilities[a].power);
                            }
                        }
                    }
                }
                if (rings !== null && this.have(mine, this.theOne))
                    power *= 2;
            }
            return { name: name, power: power };
        }
        wear(rings, name) {
            if (!this.have(rings, name)) {
                rings.push(name);
                rings.sort();
                return true;
            }
            return false;
        }
    }
    class _security {
        constructor() {
            this.merchant = [];
            this.name = require(sys_1.path.resolve(folder, 'security.json'));
            for (let i in this.name)
                this.merchant.push(i);
        }
    }
    class _weapon {
        constructor() {
            this.dwarf = [];
            this.merchant = [];
            this.special = [];
            this.name = require(sys_1.path.resolve(folder, 'weapon.json'));
            for (let i in this.name) {
                if (this.name[i].shoppe)
                    this.merchant.push(i);
                else if (this.name[i].dwarf)
                    this.dwarf.push(i);
                else
                    this.special.push(i);
            }
        }
        baseWC(name) {
            let wc = 0;
            if (typeof this.name[name] == 'undefined')
                wc = Math.abs(+name);
            else
                wc = this.name[name].wc;
            return wc;
        }
        buffWC(rpc) {
            let wc = this.baseWC(rpc.user.weapon) + rpc.toWC + rpc.user.toWC;
            return wc;
        }
        equip(rpc, what, keep = false) {
            let weapon;
            if (isNaN(+what)) {
                rpc.user.weapon = what;
                weapon = this.name[what];
            }
            else {
                if (what >= this.merchant.length)
                    what = this.merchant.length - 1;
                rpc.user.weapon = +what;
                weapon = {
                    wc: +what, value: this.merchant[+what] ? this.name[this.merchant[+what]].value : '0c',
                    hit: 'hit', stab: 'stab', smash: 'smash', plunge: 'plunge'
                };
            }
            if (!keep)
                rpc.user.toWC = 0;
            rpc.weapon = weapon;
            rpc.toWC = 0;
            rpc.altered = true;
        }
        swap(winner, loser, value) {
            if (!isNaN(+winner.user.weapon) || !isNaN(+loser.user.weapon))
                return false;
            if ((winner.user.toWC >= 0 && winner.weapon.wc >= loser.weapon.wc)
                || (winner.user.toWC < 0 && winner.weapon.wc + (winner.user.toWC * (winner.user.poison > 1 ? winner.user.poison : 1)) >= loser.weapon.wc)) {
                if (value) {
                    winner.user.coin.value += value.value;
                    return value;
                }
                return false;
            }
            [winner.weapon, loser.weapon] = [loser.weapon, winner.weapon];
            [winner.toWC, loser.toWC] = [loser.toWC, winner.toWC];
            [winner.user.weapon, loser.user.weapon] = [loser.user.weapon, winner.user.weapon];
            [winner.user.toWC, loser.user.toWC] = [loser.user.toWC, winner.user.toWC];
            if (loser.user.id) {
                winner.toWC = 0;
                if (winner.user.toWC > 0)
                    winner.user.toWC >>= 1;
            }
            if (winner.user.id) {
                loser.toWC = 0;
                if (loser.user.toWC > 0)
                    loser.user.toWC >>= 1;
            }
            winner.altered = true;
            loser.altered = true;
            return true;
        }
        wearing(rpc, text = true) {
            let result = '';
            if (isNaN(+rpc.user.weapon)) {
                if (text)
                    result = rpc.weapon.text + ' ';
                result += rpc.user.weapon;
            }
            return result;
        }
    }
    Items.Access = new _access;
    Items.Armor = new _armor;
    Items.Ring = new _ring;
    Items.Magic = new _magic(Items.Ring);
    Items.Poison = new _poison;
    Items.RealEstate = new _realestate;
    Items.Security = new _security;
    Items.Weapon = new _weapon;
})(Items || (Items = {}));
module.exports = Items;
