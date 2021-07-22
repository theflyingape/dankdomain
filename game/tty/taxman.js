"use strict";
const $ = require("../runtime");
const Battle = require("../battle");
const items_1 = require("../items");
const lib_1 = require("../lib");
const pc_1 = require("../pc");
const player_1 = require("../player");
const sys_1 = require("../sys");
var Taxman;
(function (Taxman) {
    let irs;
    let tax = new lib_1.Coin(0);
    pc_1.PC.load($.taxman);
    pc_1.PC.load($.barkeep);
    function checkpoint(scratch) {
        if (sys_1.int(1000 * scratch / tax.value) / 1000 > 1 && !$.access.sysop) {
            pc_1.PC.load($.taxman);
            lib_1.vt.profile({
                jpg: 'npc/taxman', handle: $.taxman.user.handle,
                level: $.taxman.user.level, pc: $.taxman.user.pc, effect: 'fadeIn'
            });
            lib_1.vt.sound('oops', 4);
            let pouch = new lib_1.Coin(scratch).pieces();
            lib_1.vt.out('\n\n', lib_1.vt.yellow, lib_1.vt.bright, $.taxman.user.handle, lib_1.vt.normal, -400);
            lib_1.vt.outln(', our Master of Coin, looks at your bulging ', pouch, -1200);
            lib_1.vt.out(lib_1.vt.yellow, 'and says, ', lib_1.vt.blue, lib_1.vt.bright, '"Time to pay taxes!"', lib_1.vt.normal, -800);
            lib_1.vt.out(lib_1.vt.yellow, '  You check out the burly guards who stand ready\n');
            lib_1.vt.outln(`to enforce `, lib_1.vt.bright, `${$.king.handle}'${$.king.handle.substr(-1) !== 's' ? 's' : ''}`, lib_1.vt.normal, ` will.\n`, -1600);
            tax.value = scratch - tax.value;
            tax = new lib_1.Coin(tax.carry(1, true));
            lib_1.vt.outln(`The tax will cost you ${tax.carry()}`, -900);
            return true;
        }
        return false;
    }
    function bar() {
        tax.value = 10 * sys_1.money($.player.level);
        if (checkpoint($.player.coin.value)) {
            lib_1.vt.outln('\nYou really want a drink, so you pay the shakedown.');
            lib_1.vt.beep();
            $.player.coin.value -= tax.value;
            if ($.player.coin.value < 0) {
                $.player.bank.value += $.player.coin.value;
                $.player.coin.value = 0;
                if ($.player.bank.value < 0) {
                    $.player.loan.value -= $.player.bank.value;
                    $.player.bank.value = 0;
                }
            }
            lib_1.vt.sound('thief', 22);
        }
    }
    Taxman.bar = bar;
    function cityguards() {
        if ($.access.roleplay) {
            if ($.player.loan.value > 0 && $.player.coin.value > 0) {
                $.player.loan.value -= $.player.coin.value;
                if ($.player.loan.value < 0) {
                    $.player.coin.value = -$.player.loan.value;
                    $.player.loan.value = 0;
                }
                else
                    $.player.coin.value = 0;
                $.player.bank.value += $.player.coin.value;
            }
            if ($.player.loan.value > 0 && $.player.bank.value > 0) {
                $.player.loan.value -= $.player.bank.value;
                if ($.player.loan.value < 0) {
                    $.player.bank.value = -$.player.loan.value;
                    $.player.loan.value = 0;
                }
                else
                    $.player.bank.value = 0;
            }
            if ($.player.loan.value > 9) {
                lib_1.vt.outln(lib_1.vt.green, '\nYour bank loan ', $.player.loan.carry(), lib_1.vt.red, ' is past due.', -1200);
                lib_1.vt.beep();
                let interest = new lib_1.Coin(sys_1.int($.player.loan.value * .05 + 1));
                $.player.loan.value += interest.value;
                $.online.altered = true;
                lib_1.vt.outln('An interest charge of ', interest.carry(), ' was added.', -1200);
            }
            tax.value = 1000 * sys_1.money($.player.level)
                + lib_1.tradein(new lib_1.Coin(items_1.RealEstate.name[$.player.realestate].value).value, 35)
                + lib_1.tradein(new lib_1.Coin(items_1.Security.name[$.player.security].value).value, 15);
            if (checkpoint($.player.coin.value + $.player.bank.value)) {
                let exempt = items_1.Ring.power([], $.player.rings, 'taxes');
                if (exempt.power) {
                    lib_1.vt.out('\nYour hand extends to show', lib_1.vt.cyan, lib_1.vt.bright, sys_1.an(exempt.name), lib_1.vt.normal);
                    if ($.player.emulation == 'XT')
                        lib_1.vt.out(' ', items_1.Ring.name[exempt.name].emoji, ' 💍');
                    lib_1.vt.outln(' ring', -1200);
                    lib_1.vt.out(lib_1.vt.yellow, lib_1.vt.bright, $.taxman.user.handle, lib_1.vt.normal, ' ');
                    if (sys_1.dice(100) < ($.online.cha - 10)) {
                        lib_1.vt.outln('nods approval while the guards stand down to let you pass.', -1200);
                        require('./menu').menu();
                        return;
                    }
                    items_1.Ring.remove($.player.rings, exempt.name);
                    lib_1.vt.outln('confiscates the ring!', -1500);
                }
                lib_1.vt.outln(`\nYou weigh the chances with your ${lib_1.weapon()} against the Crown.`, -1500);
                lib_1.vt.action('yn');
                lib_1.vt.form = {
                    'tax': {
                        cb: () => {
                            lib_1.vt.outln('\n');
                            if (/Y/i.test(lib_1.vt.entry)) {
                                lib_1.vt.outln('You pay the tax.');
                                lib_1.vt.sound('thief2', 16);
                                $.player.coin.value -= tax.value;
                                if ($.player.coin.value < 0) {
                                    $.player.bank.value += $.player.coin.value;
                                    $.player.coin.value = 0;
                                    if ($.player.bank.value < 0) {
                                        $.player.loan.value -= $.player.bank.value;
                                        $.player.bank.value = 0;
                                    }
                                }
                                require('./menu').menu();
                                return;
                            }
                            let l = 0, xhp = sys_1.whole($.player.hp * ($.player.level - 9) / $.sysop.level);
                            irs = new Array();
                            do {
                                let i = irs.push({ user: { id: '', sex: 'M' } }) - 1;
                                irs[i].user.level = 10 * l + sys_1.dice(9);
                                let title = ['Reserve', 'Home', 'City', 'Foot', 'Infantry', 'Cavalry', 'Castle', 'Royal'][i < 7 ? i : 7];
                                irs[i].user.handle = `${title} Guard`;
                                do {
                                    pc_1.PC.reroll(irs[i].user, pc_1.PC.random('player'), irs[i].user.level);
                                } while (irs[i].user.melee < 1);
                                let w = sys_1.int(irs[i].user.level / 100 * (items_1.Weapon.merchant.length - 1));
                                w = w < 2 ? 2 : w >= items_1.Weapon.merchant.length ? items_1.Weapon.merchant.length - 1 : w;
                                irs[i].user.weapon = items_1.Weapon.merchant[w];
                                irs[i].user.toWC = sys_1.dice(irs[i].user.poison * w / 4) + 1;
                                let a = sys_1.int(irs[i].user.level / 100 * (items_1.Armor.merchant.length - 1));
                                a = a < 1 ? 1 : a >= items_1.Armor.merchant.length ? items_1.Armor.merchant.length - 1 : a;
                                irs[i].user.armor = items_1.Armor.merchant[a];
                                irs[i].user.toAC = sys_1.dice(irs[i].user.magic * a / 4);
                                pc_1.PC.activate(irs[i]);
                                xhp -= irs[i].hp;
                                i = ($.player.level / 11) >> 0;
                                if (l < i && sys_1.dice(i) > 1)
                                    l++;
                            } while (xhp > 0);
                            lib_1.vt.outln(lib_1.vt.yellow, `The Master of Coin points ${pc_1.PC.who($.taxman).his}${$.taxman.user.weapon} at you,\n`, lib_1.vt.bright, lib_1.vt.blue, `  "Shall we begin?"`);
                            lib_1.vt.sound('ddd', 15);
                            lib_1.vt.music('taxman');
                            Battle.engage('Gates', $.online, irs, boss);
                        }, prompt: 'Will you pay the tax (Y/N)? ', cancel: 'Y', enter: 'Y', eol: false, match: /Y|N/i, timeout: 20
                    }
                };
                player_1.input('tax', sys_1.dice(101 - $.player.level) > 1 ? 'y' : 'n');
                return;
            }
        }
        else
            lib_1.vt.music('visit');
        require('./menu').menu();
        function boss() {
            if ($.reason)
                lib_1.vt.hangup();
            if (Battle.retreat || Battle.teleported) {
                lib_1.news(`\tgot schooled on economics`);
                lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.cyan, '\nYou got schooled on economics, and pay homage to the Crown.', -1000);
                $.player.coin.value -= tax.value;
                if ($.player.coin.value < 0) {
                    $.player.bank.value += $.player.coin.value;
                    $.player.coin.value = 0;
                    if ($.player.bank.value < 0) {
                        $.player.loan.value -= $.player.bank.value;
                        $.player.bank.value = 0;
                    }
                }
                require('./menu').menu();
                return;
            }
            lib_1.vt.outln(lib_1.vt.yellow, '\nThe tax collector ', [
                `${lib_1.vt.attr('mutters,', lib_1.vt.bright, lib_1.vt.blue)} "Good help is hard to find these days..."`,
                `${lib_1.vt.attr('sighs,', lib_1.vt.bright, lib_1.vt.blue)} "If you want a job done right..."`,
                `${lib_1.vt.attr('swears,', lib_1.vt.bright, lib_1.vt.blue)} "That's gonna cost you."`
            ][sys_1.dice(3) - 1], -900);
            pc_1.PC.activate($.taxman);
            $.taxman.user.coin = tax;
            pc_1.PC.wearing($.taxman);
            Battle.engage('Taxman', $.online, $.taxman, require('./menu').menu);
        }
    }
    Taxman.cityguards = cityguards;
})(Taxman || (Taxman = {}));
module.exports = Taxman;
