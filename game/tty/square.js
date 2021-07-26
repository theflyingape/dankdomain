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
var Square;
(function (Square) {
    let square = {
        'A': { description: 'Armoury' },
        'W': { description: 'Weapons Shoppe' },
        'R': { description: 'Real Estate' },
        'S': { description: 'Security' },
        'M': { description: 'Mages Guild' },
        'V': { description: 'Visit the Apothecary' },
        'B': { description: 'Bank in Braavos' },
        'H': { description: 'Butler Hospital' },
        'P': { description: 'Pick pockets' },
        'J': { description: 'Jail House' },
        'G': { description: 'Goto the arena' }
    };
    let bank = {
        'D': {},
        'W': {},
        'L': {},
        'R': { description: 'Rob the bank' },
        'T': {}
    };
    let credit = new items_1.Coin(0);
    let lo = 0, hi = 0, max = 0;
    let want = '';
    function menu(suppress = true) {
        npc_1.elemental.orders('Square');
        lib_1.vt.form = {
            'menu': { cb: choice, cancel: 'Q', enter: '?', eol: false }
        };
        if (!$.player.novice && $.player.level > 1 && ($.player.coin.value > 0 || $.player.poisons.length || ($.player.magic < 2 && $.player.spells.length))
            && sys_1.dice($.online.cha / 3 + 4 * $.player.steal) == 1) {
            let bump = pc_1.PC.encounter(`AND coward = 0 AND novice = 0 AND (id NOT GLOB '_*' OR id = '_TAX')`, $.player.level - 9, $.player.level + 9);
            if (bump.user.id && !bump.user.status) {
                lib_1.vt.beep();
                lib_1.vt.outln();
                if (bump.user.id == $.taxman.user.id)
                    lib_1.vt.profile({ jpg: 'npc/taxman', handle: $.taxman.user.handle, level: $.taxman.user.level, pc: $.taxman.user.pc, effect: 'fadeInLeft' });
                else
                    pc_1.PC.portrait(bump);
                lib_1.vt.out(lib_1.vt.cyan, lib_1.vt.faint, `${bump.user.handle} bumps`, lib_1.vt.normal, ' into you from', lib_1.vt.bright, ' out of the shadows', lib_1.vt.reset, ' ... ');
                if (sys_1.dice($.online.cha / 9 + 2 * $.player.steal)
                    > 2 * items_1.Ring.power($.player.rings, bump.user.rings, 'steal').power + bump.user.steal)
                    lib_1.vt.outln('{waves}\n ... and moves along.');
                else {
                    let p, i;
                    if ($.player.coin.value > 0) {
                        const v = $.player.coin.pick();
                        bump.user.coin.value += v.value;
                        lib_1.log(bump.user.id, `\nYou picked ${$.player.handle}'s pouch holding ${v.amount}!`);
                        $.player.coin.value -= v.value;
                        lib_1.vt.outln(lib_1.vt.faint, '{sigh}');
                        lib_1.vt.sound('oops', 8);
                        lib_1.vt.outln('Your ', lib_1.pieces(v), ' is gone!');
                    }
                    else if ($.player.poisons.length) {
                        lib_1.vt.out(lib_1.vt.faint, '\nYou hear vials rattle.');
                        lib_1.vt.sleep(800);
                        p = $.player.poisons[sys_1.dice($.player.poisons.length) - 1];
                        items_1.Poison.remove($.player.poisons, p);
                        items_1.Poison.add(bump.user.poisons, p);
                        lib_1.log(bump.user.id, `\nYou lifted a vial of ${items_1.Poison.merchant[p - 1]} from ${$.player.handle}!`);
                        lib_1.vt.sound('oops', 8);
                        lib_1.vt.out(lib_1.vt.reset, '  Your vial of ');
                        if ($.player.emulation == 'XT')
                            lib_1.vt.out('💀 ');
                        lib_1.vt.outln(lib_1.vt.faint, items_1.Poison.merchant[p - 1], lib_1.vt.reset, ' goes missing!');
                    }
                    else if ($.player.magic < 3 && $.player.spells.length) {
                        lib_1.vt.out(lib_1.vt.faint, '\nYou hear something rattle.');
                        lib_1.vt.sleep(800);
                        p = $.player.spells[sys_1.dice($.player.spells.length) - 1];
                        items_1.Magic.remove($.player.spells, p);
                        items_1.Magic.add(bump.user.spells, p);
                        lib_1.log(bump.user.id, `\nYou lifted a  ${items_1.Magic.merchant[p - 1]} from ${$.player.handle}!`);
                        lib_1.vt.sound('oops', 8);
                        lib_1.vt.outln(lib_1.vt.reset, '  Your ', items_1.Magic.merchant[p - 1], ' magic has disappeared!');
                    }
                    pc_1.PC.save(bump);
                    lib_1.vt.sleep(800);
                }
                lib_1.vt.sleep(1600);
                lib_1.vt.animated('fadeOutRight');
            }
        }
        let hints = '';
        if ($.online.hp < $.player.hp)
            hints += `> You are battle weary.  Heal yourself at the hospital.\n`;
        if ($.player.coin.value && $.player.poison && !$.player.poisons.length)
            hints += `> Try buying a poison for your weapon.\n`;
        if ($.player.coin.value && $.player.level / 9 > items_1.RealEstate.name[$.player.realestate].protection + 1)
            hints += `> Increase your standing with the community by moving into a better dwelling.\n`;
        if (!$.player.coin.value && $.player.bank.value > 100000 && ($.player.poisons.length || $.player.spells.length))
            hints += `> Carry small pocket change to misdirect thieving of more valuable items\n`;
        if (sys_1.dice(10) == 1 && $.player.loan.value && $.player.steal > 1)
            hints += `> Perhaps pick a pocket? Or two?\n`;
        if ($.player.coin.value && sys_1.int($.player.level / 9) > (items_1.Security.name[$.player.security].protection + 1))
            hints += `> Alleviate paranoia from bad luck and thieves with better Security.\n`;
        if (sys_1.dice(100) == 1 && $.player.loan.value && $.player.ram && $.player.steal)
            hints += `> Try using your ram on the bank for big money.\n`;
        lib_1.vt.form['menu'].prompt = lib_1.display('square', lib_1.vt.White, lib_1.vt.lblack, suppress, square, hints);
        player_1.input('menu');
    }
    Square.menu = menu;
    function choice() {
        var _a;
        let suppress = false;
        let choice = lib_1.vt.entry.toUpperCase();
        if ((_a = square[choice]) === null || _a === void 0 ? void 0 : _a.description) {
            lib_1.vt.out(' - ', square[choice].description);
            suppress = $.player.expert;
        }
        lib_1.vt.outln();
        switch (choice) {
            case 'A':
                if (!$.access.roleplay)
                    break;
                let ac = items_1.Armor.name[$.player.armor].ac;
                lib_1.vt.out('\nYou own a class ', lib_1.bracket(ac, false), ' ', lib_1.armor());
                if (ac) {
                    let cv = new items_1.Coin(items_1.Armor.name[$.player.armor].value);
                    credit.value = lib_1.tradein(cv.value);
                    if ($.player.toAC)
                        credit.value = sys_1.int(credit.value * (ac + $.player.toAC / ($.player.poison + 1)) / ac);
                    if ($.online.toAC < 0)
                        credit.value = sys_1.int(credit.value * (ac + $.online.toAC) / ac);
                    if (credit.value > cv.value)
                        credit.value = cv.value;
                }
                else
                    credit.value = 0;
                lib_1.vt.outln(' worth ', lib_1.carry(credit));
                if (ac == 0 && ($.player.toAC < 0 || $.online.toAC < 0)) {
                    lib_1.vt.outln(lib_1.vt.yellow, 'You look like a leper; go to the hospital for treatment.');
                    suppress = true;
                    break;
                }
                max = items_1.Armor.merchant.length - 1;
                lo = $.online.armor.ac - 1;
                lo = lo < 1 ? 1 : lo > max ? max - 1 : lo;
                for (hi = lo; hi < max && $.player.coin.value + credit.value >= new items_1.Coin(items_1.Armor.name[items_1.Armor.merchant[hi]].value).value; hi++)
                    ;
                if (lo > 1 && lo == hi)
                    lo--;
                list(choice);
                return;
            case 'B':
                if (!$.access.roleplay)
                    break;
                credit.value = lib_1.tradein(new items_1.Coin(items_1.RealEstate.name[$.player.realestate].value).value, $.online.cha);
                credit.value += lib_1.tradein(new items_1.Coin(items_1.Security.name[$.player.security].value).value, $.online.cha);
                credit.value -= $.player.loan.value;
                if (credit.value < 1)
                    credit.value = 0;
                lib_1.vt.action('bank');
                bank['D'] = { description: 'Money in hand: ' + lib_1.carry() };
                bank['W'] = { description: 'Money in bank: ' + lib_1.carry($.player.bank) };
                bank['L'] = { description: 'Money on loan: ' + lib_1.carry($.player.loan) };
                lib_1.vt.form = {
                    'menu': { cb: Bank, cancel: 'q', enter: '?', eol: false }
                };
                lib_1.vt.form['menu'].prompt = lib_1.display('Welcome to the Iron Bank', null, lib_1.vt.green, false, bank);
                player_1.input('menu');
                return;
            case 'G':
                lib_1.vt.action('clear');
                require('./arena').menu($.player.expert);
                return;
            case 'H':
                if (!$.access.roleplay)
                    break;
                if (items_1.Armor.name[$.player.armor].ac == 0 && ($.online.toAC < 0 || $.player.toAC < 0)) {
                    credit = new items_1.Coin(Math.abs($.online.toAC + $.player.toAC) * sys_1.money($.player.level) + 1);
                    lib_1.vt.action('yn');
                    lib_1.vt.form = {
                        'skin': {
                            cb: () => {
                                lib_1.vt.outln('\n');
                                if (/Y/i.test(lib_1.vt.entry)) {
                                    lib_1.vt.sound('click');
                                    $.online.toAC = 0;
                                    $.player.toAC = 0;
                                    $.player.coin.value -= credit.value;
                                    if ($.player.coin.value < 0) {
                                        $.player.bank.value += $.player.coin.value;
                                        $.player.coin.value = 0;
                                        if ($.player.bank.value < 0) {
                                            $.player.loan.value -= $.player.bank.value;
                                            $.player.bank.value = 0;
                                        }
                                    }
                                    $.online.altered = true;
                                }
                                Battle.yourstats();
                                menu();
                                return;
                            }, cancel: 'Y', enter: 'Y', max: 1, eol: false, match: /Y|N/i, timeout: 10
                        }
                    };
                    lib_1.vt.form['skin'].prompt = 'Heal your skin for ' + lib_1.carry(credit) + ' (Y/N)? ';
                    player_1.input('skin', 'y');
                    return;
                }
                if (items_1.Weapon.name[$.player.weapon].wc == 0 && ($.online.toWC < 0 || $.player.toWC < 0)) {
                    credit = new items_1.Coin(Math.abs($.online.toWC + $.player.toWC) * sys_1.money($.player.level) + 1);
                    lib_1.vt.action('yn');
                    lib_1.vt.form = {
                        'hands': {
                            cb: () => {
                                lib_1.vt.outln('\n');
                                if (/Y/i.test(lib_1.vt.entry)) {
                                    lib_1.vt.sound('click');
                                    $.online.toWC = 0;
                                    $.player.toWC = 0;
                                    $.player.coin.value -= credit.value;
                                    if ($.player.coin.value < 0) {
                                        $.player.bank.value += $.player.coin.value;
                                        $.player.coin.value = 0;
                                        if ($.player.bank.value < 0) {
                                            $.player.loan.value -= $.player.bank.value;
                                            $.player.bank.value = 0;
                                        }
                                    }
                                    $.online.altered = true;
                                }
                                Battle.yourstats();
                                menu();
                                return;
                            }, cancel: 'Y', enter: 'Y', max: 1, eol: false, match: /Y|N/i, timeout: 10
                        }
                    };
                    lib_1.vt.form['hands'].prompt = 'Fix your hands for ' + lib_1.carry(credit) + ' (Y/N)? ';
                    player_1.input('hands', 'y');
                    return;
                }
                hi = $.player.hp - $.online.hp;
                if (hi < 1) {
                    lib_1.vt.beep(true);
                    lib_1.vt.outln(`\nYou don't need any hit points.`);
                    suppress = true;
                    break;
                }
                lib_1.vt.outln('\nWelcome to Butler Hospital.\n');
                lib_1.vt.outln('Hit points cost ', lib_1.vt.bright, $.player.level.toString(), lib_1.vt.normal, ' each.');
                lib_1.vt.outln('You need ', lib_1.vt.bright, hi.toString(), lib_1.vt.normal, ' hit points.');
                lo = sys_1.whole($.player.coin.value / $.player.level);
                lib_1.vt.outln('You can afford ', lib_1.vt.bright, lo < hi ? lo.toString() : 'all your', lib_1.vt.normal, ' hit points.');
                if (lo < hi) {
                    if ($.player.novice)
                        lib_1.vt.out('Normally, you would be billed for the remaining ');
                    else
                        lib_1.vt.out('You can be billed for the remaining ');
                    lib_1.vt.outln(lib_1.vt.bright, (hi - lo).toString(), lib_1.vt.normal, ' hit points.');
                }
                lib_1.vt.action('listall');
                lib_1.vt.form = {
                    'hp': {
                        cb: () => {
                            lib_1.vt.outln();
                            let buy = sys_1.whole(/=|max/i.test(lib_1.vt.entry) ? hi : lib_1.vt.entry);
                            if (buy > 0 && buy <= hi) {
                                $.player.coin.value -= buy * $.player.level;
                                if ($.player.coin.value < 0) {
                                    if (!$.player.novice)
                                        $.player.bank.value += $.player.coin.value;
                                    $.player.coin.value = 0;
                                    if ($.player.bank.value < 0) {
                                        $.player.loan.value -= $.player.bank.value;
                                        $.player.bank.value = 0;
                                    }
                                }
                                $.online.hp += buy;
                                lib_1.vt.beep();
                                lib_1.vt.outln('\nHit points = ', $.online.hp.toString());
                            }
                            menu();
                            return;
                        }, max: 5
                    }
                };
                lib_1.vt.form['hp'].prompt = lib_1.vt.attr('How many do you want [', lib_1.vt.white, lib_1.vt.uline, 'MAX', lib_1.vt.nouline, '=', lib_1.vt.bright, hi.toString(), lib_1.vt.normal, lib_1.vt.cyan, ']? ');
                player_1.input('hp', '=');
                return;
            case 'J':
                if ($.bail) {
                    lib_1.vt.profile({ png: 'npc/jailer', effect: 'fadeIn' });
                    lib_1.vt.outln('\nA deputy greets you in front of the County Jail.');
                    lib_1.vt.outln(-600, lib_1.vt.bright, `"What `, ['cur', 'knave', 'scum', 'toad', 'villain'][sys_1.dice(5) - 1], ` do you come for, ${$.access[$.player.gender] || $.access[$.player.sex]}?"`);
                    Battle.user('Bail', (opponent) => {
                        if (opponent.user.id == '') {
                            menu();
                            return;
                        }
                        lib_1.vt.outln();
                        if (opponent.user.id == $.player.id) {
                            opponent.user.id = '';
                            lib_1.vt.outln(`You can't bail ${pc_1.PC.who(opponent).him}out.`);
                            menu();
                            return;
                        }
                        if (opponent.user.status !== 'jail') {
                            opponent.user.id = '';
                            lib_1.vt.outln(`${opponent.user.handle} is not in jail.`);
                            menu();
                            return;
                        }
                        credit.value = sys_1.int(sys_1.money(opponent.user.level) * (100 - $.online.cha + 1) / 100 + 1);
                        lib_1.vt.out(`It will cost you ${lib_1.carry(credit)} to bail out ${opponent.user.handle}.\n`);
                        if ($.player.coin.value < credit.value) {
                            menu();
                            return;
                        }
                        lib_1.vt.action('ny');
                        lib_1.vt.form = {
                            'pay': {
                                cb: () => {
                                    lib_1.vt.outln();
                                    if (/Y/i.test(lib_1.vt.entry)) {
                                        lib_1.vt.profile({ png: 'payment', effect: 'tada' });
                                        lib_1.vt.sound('click');
                                        lib_1.vt.outln(`${opponent.user.handle} is set free.`);
                                        $.player.coin.value -= credit.value;
                                        opponent.user.status = '';
                                        opponent.user.xplevel = opponent.user.level;
                                        db.run(`UPDATE Players set status='',xplevel=level WHERE id='${opponent.user.id}'`);
                                        lib_1.log(opponent.user.id, `${$.player.handle} paid ${credit.amount} to bail you out of jail.\n`);
                                        lib_1.news(`\t${opponent.user.handle} made bail`);
                                        pc_1.PC.adjust('cha', -1, -1, -1);
                                        $.bail--;
                                    }
                                    else
                                        lib_1.vt.action('fadeOut');
                                    menu();
                                    return;
                                }, prompt: 'Will you pay (Y/N)? ',
                                cancel: 'N', enter: 'N', max: 1, eol: false, match: /Y|N/i, timeout: 10
                            }
                        };
                        player_1.input('pay', 'y');
                    });
                    return;
                }
                lib_1.vt.outln('The jail house is closed for the day.');
                suppress = true;
                break;
            case 'M':
                lib_1.vt.out('\nThe ', lib_1.vt.blue, lib_1.vt.bright, 'old mage ', lib_1.vt.reset);
                max = items_1.Magic.merchant.length;
                for (lo = 1; lo <= max; lo++)
                    if (!items_1.Magic.have($.player.spells, lo))
                        break;
                if (lo > items_1.Magic.merchant.length || !$.player.magic || !$.access.roleplay) {
                    lib_1.vt.outln('says, "Get outta here!"');
                    suppress = true;
                    break;
                }
                for (hi = max; hi > lo; hi--)
                    if (!items_1.Magic.have($.player.spells, hi)
                        && $.player.coin.value >= ($.player.magic == 1 ? new items_1.Coin(items_1.Magic.spells[items_1.Magic.merchant[hi - 1]].wand).value
                            : new items_1.Coin(items_1.Magic.spells[items_1.Magic.merchant[hi - 1]].cost).value))
                        break;
                lib_1.vt.out(['offers to sell you a magic wand',
                    'offers to make you a scroll, for a price',
                    'offers to teach you a spell, for a price',
                    'wants to endow you with a spell, for a price'
                ][$.player.magic - 1], '.\n');
                list(choice);
                return;
            case 'P':
                if (!$.access.roleplay)
                    break;
                if ($.player.novice) {
                    lib_1.vt.out('\nNovice players cannot rob.\n');
                    suppress = true;
                    break;
                }
                lib_1.vt.out(lib_1.vt.faint, '\nYou attempt to pick a passerby\'s pocket... ', -1000);
                credit.value = sys_1.dice(6 * sys_1.money($.player.level) / sys_1.dice(10));
                let pocket = pc_1.PC.encounter(`AND novice = 0 AND id NOT GLOB '_*'`).user;
                if (pocket.id) {
                    pc_1.PC.load(pocket);
                    const v = pocket.coin.pick().value;
                    if (pocket.coin.value > 0)
                        credit.value += v;
                    else {
                        pocket.id = '';
                        pocket.handle = 'somebody';
                    }
                    pocket.coin.value -= v;
                }
                else
                    pocket.handle = 'somebody';
                lib_1.vt.outln('\n');
                lib_1.vt.outln(`You pick ${pocket.handle}'s pocket and steal `, lib_1.pieces(credit), '!');
                lib_1.vt.outln(-1000);
                let effort = 100 + $.steal;
                effort -= 8 * items_1.Ring.power([], $.player.rings, 'steal').power;
                if (sys_1.int(16 * $.player.steal + $.player.level / 10 + $.online.dex / 10) < sys_1.dice(effort)) {
                    $.player.status = 'jail';
                    $.reason = `caught picking ${pocket.handle}'s pocket`;
                    lib_1.vt.action('clear');
                    lib_1.vt.profile({ png: 'npc/jailer', effect: 'fadeIn' });
                    lib_1.vt.outln('A guard catches you and throws you into jail!');
                    lib_1.vt.sound('arrested', 20);
                    lib_1.vt.outln('You might be released by your next call.');
                    lib_1.vt.outln(-1000);
                    lib_1.vt.hangup();
                    return;
                }
                else {
                    if (!items_1.Ring.have($.player.rings, items_1.Ring.theOne))
                        $.steal++;
                    if (!$.arena || !$.dungeon)
                        $.steal++;
                    lib_1.vt.beep();
                    $.player.coin.value += credit.value;
                    if (pocket.id) {
                        $.online.altered = true;
                        $.player.steals++;
                        pc_1.PC.save(pocket);
                    }
                    suppress = true;
                    break;
                }
            case 'Q':
                require('./menu').menu($.player.expert);
                return;
            case 'R':
                if (!$.access.roleplay)
                    break;
                let re = items_1.RealEstate.name[$.player.realestate].protection;
                lib_1.vt.out('\nYou live in a ', $.player.realestate);
                credit.value = lib_1.tradein(items_1.RealEstate.name[$.player.realestate].value);
                lib_1.vt.outln(' worth ', lib_1.carry(credit));
                max = items_1.RealEstate.merchant.length - 1;
                lo = re - $.realestate;
                if (lo < 1)
                    lo = 1;
                hi = lo;
                for (; hi < max && $.player.coin.value + credit.value >= new items_1.Coin(items_1.RealEstate.name[items_1.RealEstate.merchant[hi]].value).value; hi++)
                    ;
                list(choice);
                return;
            case 'S':
                if (!$.access.roleplay)
                    break;
                let s = items_1.Security.name[$.player.security].protection;
                lib_1.vt.out('\nYou are guarded by a ', $.player.security);
                credit.value = lib_1.tradein(items_1.Security.name[$.player.security].value);
                lib_1.vt.outln(' worth ', lib_1.carry(credit));
                max = items_1.Security.merchant.length - 1;
                lo = s - $.security;
                if (lo < 1)
                    lo = 1;
                hi = lo;
                for (; hi < max && $.player.coin.value + credit.value >= new items_1.Coin(items_1.Security.name[items_1.Security.merchant[hi]].value).value; hi++)
                    ;
                list(choice);
                return;
            case 'V':
                lib_1.vt.outln('\n', lib_1.vt.faint, '... you enter the back door into the shop ...');
                lib_1.vt.out('The ', lib_1.vt.magenta, lib_1.vt.bright, 'apothecary ', lib_1.vt.reset);
                max = items_1.Poison.merchant.length;
                for (lo = 1; lo <= max; lo++)
                    if (!items_1.Poison.have($.player.poisons, lo))
                        break;
                if (lo > items_1.Poison.merchant.length || !$.player.poison || !$.access.roleplay) {
                    lib_1.vt.outln('says, "Get outta here!"');
                    suppress = true;
                    break;
                }
                for (hi = max; hi > lo; hi--)
                    if (!items_1.Poison.have($.player.poisons, hi)
                        && $.player.coin.value >= ($.player.poison == 1 ? new items_1.Coin(items_1.Poison.vials[items_1.Poison.merchant[hi - 1]].vial).value
                            : new items_1.Coin(items_1.Poison.vials[items_1.Poison.merchant[hi - 1]].cost).value))
                        break;
                lib_1.vt.out(['scoffs at your apparent lack of skill',
                    'casts a suspicious look your way',
                    'offers to sell you his contraband',
                    'admires your expert eye on his wares'
                ][$.player.poison - 1], '.\n');
                list(choice);
                return;
            case 'W':
                if (!$.access.roleplay)
                    break;
                let wc = items_1.Weapon.name[$.player.weapon].wc;
                lib_1.vt.out('\nYou own a class ', lib_1.bracket(wc, false), ' ', lib_1.weapon());
                if (wc) {
                    let cv = new items_1.Coin(items_1.Weapon.name[$.player.weapon].value);
                    credit.value = lib_1.tradein(cv.value, $.online.cha);
                    if ($.player.toWC)
                        credit.value = sys_1.int(credit.value * (wc + $.player.toWC / ($.player.poison + 1)) / wc);
                    if ($.online.toWC < 0)
                        credit.value = sys_1.int(credit.value * (wc + $.online.toWC) / wc);
                    if (credit.value > cv.value)
                        credit.value = cv.value;
                }
                else
                    credit.value = 0;
                lib_1.vt.outln(' worth ', lib_1.carry(credit));
                if (wc == 0 && ($.player.toWC < 0 || $.online.toWC < 0)) {
                    lib_1.vt.outln(lib_1.vt.yellow, 'Your hands are broken; go to the hospital for treatment.');
                    suppress = true;
                    break;
                }
                max = items_1.Weapon.merchant.length - 1;
                lo = $.online.weapon.wc - 1;
                lo = lo < 1 ? 1 : lo > max ? max - 1 : lo;
                for (hi = lo; hi < max && $.player.coin.value + credit.value >= new items_1.Coin(items_1.Weapon.name[items_1.Weapon.merchant[hi]].value).value; hi++)
                    ;
                if (lo > 1 && lo == hi)
                    lo--;
                list(choice);
                return;
        }
        menu(suppress);
    }
    function Bank() {
        let suppress = $.player.expert;
        let choice = lib_1.vt.entry.toUpperCase();
        if (!bank[choice]) {
            lib_1.vt.beep(true);
            lib_1.vt.refocus();
            return;
        }
        lib_1.vt.form = {
            'coin': { cb: amount, max: 6 }
        };
        lib_1.vt.outln();
        switch (choice) {
            case 'D':
                lib_1.vt.action('payment');
                lib_1.vt.form['coin'].prompt = lib_1.vt.attr('Deposit ', lib_1.vt.white, '[', lib_1.vt.uline, 'MAX', lib_1.vt.nouline, '=', lib_1.carry(), ']? ');
                player_1.input('coin', '=');
                break;
            case 'L':
                lib_1.vt.action('payment');
                lib_1.vt.form['coin'].prompt = lib_1.vt.attr('Loan ', lib_1.vt.white, '[', lib_1.vt.uline, 'MAX', lib_1.vt.nouline, '=', lib_1.carry(credit), ']? ');
                player_1.input('coin', '=');
                break;
            case 'W':
                lib_1.vt.action('payment');
                lib_1.vt.form['coin'].prompt = lib_1.vt.attr('Withdraw ', lib_1.vt.white, '[', lib_1.vt.uline, 'MAX', lib_1.vt.nouline, '=', lib_1.carry($.player.bank), ']? ');
                player_1.input('coin', '=');
                break;
            case 'R':
                lib_1.vt.music('ddd');
                let c = ($.player.level / 5) * ($.player.steal + 1);
                lib_1.vt.out(lib_1.vt.faint, '\nYou attempt to sneak into the vault...', lib_1.vt.reset);
                lib_1.vt.sleep(2500);
                let effort = 100 + $.steal;
                effort -= 8 * items_1.Ring.power([], $.player.rings, 'steal').power;
                if (sys_1.dice(effort) > ++c) {
                    $.player.status = 'jail';
                    $.reason = 'caught getting into the vault';
                    lib_1.vt.action('clear');
                    lib_1.vt.profile({ png: 'npc/jailer', effect: 'fadeIn' });
                    lib_1.vt.outln('\n\nA guard catches you and throws you into jail!');
                    lib_1.vt.sound('arrested', 20);
                    lib_1.vt.outln('\nYou might be released by your next call.\n');
                    lib_1.vt.sleep(1000);
                    lib_1.vt.hangup();
                    return;
                }
                let d = $.player.level + 1;
                let vault = Math.pow(d, 7) * sys_1.dice(d / 3) * sys_1.dice(d / 11);
                let loot = new items_1.Coin(vault);
                lib_1.vt.sound('creak2', 12);
                lib_1.vt.outln(lib_1.vt.yellow, ' you open a chest and find ', lib_1.carry(loot), lib_1.vt.bright, '!');
                let deposits = new items_1.Coin(sys_1.whole(db.query(`SELECT SUM(bank) AS bank FROM Players WHERE id NOT GLOB '_*' AND id <> '${$.player.id}'`)[0].bank));
                if (deposits.value) {
                    lib_1.vt.sleep(1200);
                    lib_1.vt.outln('And you grab ', lib_1.carry(deposits), ' more in deposits!');
                    loot.value += deposits.value;
                }
                lib_1.vt.sound('yahoo', 12);
                lib_1.vt.outln();
                lib_1.vt.out(lib_1.vt.faint, 'You try to make your way out of the vault ');
                lib_1.vt.sleep(1200);
                for (let i = 0; i < 6 - $.player.steal; i++) {
                    lib_1.vt.out('.');
                    lib_1.vt.sound('click', 6);
                }
                c /= 15 - ($.player.steal * 3);
                if (sys_1.dice(effort) > ++c) {
                    $.player.status = 'jail';
                    $.reason = 'caught inside the vault';
                    lib_1.vt.out(lib_1.vt.reset, ' something jingles.');
                    lib_1.vt.action('clear');
                    lib_1.vt.sound('max', 12);
                    lib_1.vt.profile({ png: 'npc/jailer', effect: 'fadeIn' });
                    lib_1.vt.outln('\n\nA guard laughs as he closes the vault door on you!');
                    lib_1.vt.sound('arrested', 20);
                    lib_1.vt.outln('\nYou might be released by your next call.');
                    lib_1.vt.sleep(1000);
                    lib_1.vt.hangup();
                    return;
                }
                $.player.coin.value += loot.value;
                $.player.steals++;
                lib_1.vt.outln();
                db.run(`UPDATE Players SET bank=0 WHERE id NOT GLOB '_*'`);
                lib_1.vt.beep();
                menu(true);
                break;
            case 'T':
                if ($.access.sysop) {
                    lib_1.vt.form['coin'].prompt = lib_1.vt.attr('Treasury ', lib_1.vt.white, '[', lib_1.vt.uline, 'MAX', lib_1.vt.nouline, '=10000p]? ');
                    player_1.input('coin');
                    break;
                }
            case 'Q':
                lib_1.vt.action('nme');
                menu(suppress);
                break;
        }
    }
    function amount() {
        if (sys_1.whole(lib_1.vt.entry).toString() == lib_1.vt.entry)
            lib_1.vt.entry += 'c';
        let action = lib_1.vt.form['coin'].prompt.split(' ')[0];
        let amount = new items_1.Coin(0);
        switch (action) {
            case 'Deposit':
                amount = new items_1.Coin(/=|max/i.test(lib_1.vt.entry) ? $.player.coin.carry() : lib_1.vt.entry);
                if (amount.value > 0 && amount.value <= $.player.coin.value) {
                    $.player.coin.value -= amount.value;
                    if ($.player.loan.value > 0) {
                        $.player.loan.value -= amount.value;
                        if ($.player.loan.value < 0) {
                            amount.value = -$.player.loan.value;
                            $.player.loan.value = 0;
                        }
                        else
                            amount.value = 0;
                    }
                    $.player.bank.value += amount.value;
                    $.online.altered = true;
                    lib_1.vt.beep();
                }
                break;
            case 'Loan':
                amount = new items_1.Coin(/=|max/i.test(lib_1.vt.entry) ? credit.carry() : lib_1.vt.entry);
                if (amount.value > 0 && amount.value <= credit.value) {
                    $.player.loan.value += amount.value;
                    $.player.coin.value += amount.value;
                    $.online.altered = true;
                    lib_1.vt.beep();
                }
                break;
            case 'Withdraw':
                amount = new items_1.Coin(/=|max/i.test(lib_1.vt.entry) ? $.player.bank.carry() : lib_1.vt.entry);
                if (amount.value > 0 && amount.value <= $.player.bank.value) {
                    $.player.bank.value -= amount.value;
                    $.player.coin.value += amount.value;
                    $.online.altered = true;
                    lib_1.vt.beep();
                }
                break;
            case 'Treasury':
                amount = new items_1.Coin(/=|max/i.test(lib_1.vt.entry) ? 1e+17 : lib_1.vt.entry);
                if (amount.value > 0) {
                    $.player.coin.value += amount.value;
                    lib_1.vt.beep();
                }
                break;
        }
        lib_1.vt.entry = 'B';
        choice();
    }
    function list(choice) {
        want = choice.toUpperCase();
        if (/M|V/.test(want))
            lib_1.vt.action('listall');
        else
            lib_1.vt.action('listbest');
        lib_1.vt.form = {
            'start': { cb: listStart, prompt: 'Start list at ', max: 3 },
            'end': { cb: listEnd, prompt: 'Start list at ', max: 3 },
            'buy': { cb: buy, prompt: 'Buy which? ', max: 3 }
        };
        lib_1.vt.form['start'].enter = lo.toString();
        lib_1.vt.form['start'].prompt = lib_1.vt.attr('Start list at ', (lo < 10 && hi > 9) ? ' ' : '', lib_1.bracket(lo, false), ': ');
        lib_1.vt.form['end'].enter = hi.toString();
        lib_1.vt.form['end'].prompt = lib_1.vt.attr('  End list at ', lib_1.bracket(hi, false), ': ');
        if (lo < hi)
            player_1.input('start', '');
        else
            listing();
    }
    function listStart() {
        if (/=|max/i.test(lib_1.vt.entry)) {
            buyall();
            return;
        }
        let n = sys_1.whole(lib_1.vt.entry);
        if (n < 1)
            n = 1;
        if ((/R|S/.test(want) && n < lo) || n > max) {
            lib_1.vt.beep(true);
            lib_1.vt.refocus();
            return;
        }
        lo = n;
        player_1.input('end', '');
    }
    function listEnd() {
        if (/=|max/i.test(lib_1.vt.entry)) {
            buyall();
            return;
        }
        let n = sys_1.whole(lib_1.vt.entry);
        if (n < lo)
            n = lo;
        if (n > max)
            n = max;
        hi = n;
        lib_1.vt.outln();
        listing();
    }
    function listing() {
        for (let i = lo; i <= hi; i++) {
            switch (want) {
                case 'A':
                    lib_1.vt.out(lib_1.bracket(i), sys_1.sprintf('%-24s ', items_1.Armor.merchant[i]));
                    lib_1.vt.out(lib_1.carry(new items_1.Coin(items_1.Armor.name[items_1.Armor.merchant[i]].value)));
                    break;
                case 'M':
                    if (!items_1.Magic.have($.player.spells, i)) {
                        lib_1.vt.out(lib_1.bracket(i), sys_1.sprintf('%-24s ', items_1.Magic.merchant[i - 1]));
                        if ($.player.magic == 1)
                            lib_1.vt.out(lib_1.carry(new items_1.Coin(items_1.Magic.spells[items_1.Magic.merchant[i - 1]].wand)));
                        else
                            lib_1.vt.out(lib_1.carry(new items_1.Coin(items_1.Magic.spells[items_1.Magic.merchant[i - 1]].cost)));
                    }
                    break;
                case 'R':
                    lib_1.vt.out(lib_1.bracket(i), sys_1.sprintf('%-24s ', items_1.RealEstate.merchant[i]));
                    lib_1.vt.out(lib_1.carry(new items_1.Coin(items_1.RealEstate.name[items_1.RealEstate.merchant[i]].value)));
                    break;
                case 'S':
                    lib_1.vt.out(lib_1.bracket(i), sys_1.sprintf('%-24s ', items_1.Security.merchant[i]));
                    lib_1.vt.out(lib_1.carry(new items_1.Coin(items_1.Security.name[items_1.Security.merchant[i]].value)));
                    break;
                case 'V':
                    if (!items_1.Poison.have($.player.poisons, i)) {
                        lib_1.vt.out(lib_1.bracket(i), sys_1.sprintf('%-24s ', items_1.Poison.merchant[i - 1]));
                        if ($.player.poison == 1)
                            lib_1.vt.out(lib_1.carry(new items_1.Coin(items_1.Poison.vials[items_1.Poison.merchant[i - 1]].vial)));
                        else
                            lib_1.vt.out(lib_1.carry(new items_1.Coin(items_1.Poison.vials[items_1.Poison.merchant[i - 1]].cost)));
                    }
                    break;
                case 'W':
                    lib_1.vt.out(lib_1.bracket(i), sys_1.sprintf('%-24s ', items_1.Weapon.merchant[i]));
                    lib_1.vt.out(lib_1.carry(new items_1.Coin(items_1.Weapon.name[items_1.Weapon.merchant[i]].value)));
                    break;
            }
        }
        lib_1.vt.outln();
        player_1.input('buy', '=');
    }
    function buy() {
        if (/=|max/i.test(lib_1.vt.entry)) {
            buyall();
            return;
        }
        if (lib_1.vt.entry == '') {
            lib_1.vt.outln();
            menu(false);
            return;
        }
        let buy = sys_1.whole(lib_1.vt.entry);
        if (buy < lo || buy > hi) {
            lib_1.vt.refocus();
            return;
        }
        let cost;
        let item = buy;
        switch (want) {
            case 'A':
                cost = new items_1.Coin(items_1.Armor.name[items_1.Armor.merchant[item]].value);
                if ($.player.coin.value + credit.value >= cost.value) {
                    lib_1.vt.profile({ png: 'payment', effect: 'tada' });
                    lib_1.vt.sound('click');
                    $.player.armor = items_1.Armor.merchant[item];
                    $.player.toAC = 0;
                    $.online.toAC = 0;
                    lib_1.vt.out(' - ', $.player.armor, '\n');
                    $.player.coin.value += credit.value - cost.value;
                    items_1.Armor.equip($.online, $.player.armor);
                }
                break;
            case 'M':
                item--;
                cost = $.player.magic == 1 ? new items_1.Coin(items_1.Magic.spells[items_1.Magic.merchant[item]].wand)
                    : new items_1.Coin(items_1.Magic.spells[items_1.Magic.merchant[item]].cost);
                if ($.player.coin.value >= cost.value && !items_1.Magic.have($.player.spells, buy)) {
                    lib_1.vt.profile({ png: 'payment', effect: 'tada' });
                    lib_1.vt.sound('click');
                    items_1.Magic.add($.player.spells, buy);
                    lib_1.vt.out(' - ', items_1.Magic.merchant[item], '\n');
                    $.player.coin.value -= cost.value;
                    $.online.altered = true;
                }
                break;
            case 'R':
                cost = new items_1.Coin(items_1.RealEstate.name[items_1.RealEstate.merchant[item]].value);
                if ($.player.coin.value + credit.value >= cost.value) {
                    lib_1.vt.profile({ png: 'payment', effect: 'tada' });
                    lib_1.vt.sound('click');
                    $.player.realestate = items_1.RealEstate.merchant[item];
                    lib_1.vt.out(' - ', $.player.realestate, '\n');
                    $.player.coin.value += credit.value - cost.value;
                    if (item == lo && $.realestate)
                        $.realestate--;
                    $.online.altered = true;
                }
                break;
            case 'S':
                cost = new items_1.Coin(items_1.Security.name[items_1.Security.merchant[item]].value);
                if ($.player.coin.value + credit.value >= cost.value) {
                    lib_1.vt.profile({ png: 'payment', effect: 'tada' });
                    lib_1.vt.sound('click');
                    $.player.security = items_1.Security.merchant[item];
                    lib_1.vt.out(' - ', $.player.security, '\n');
                    $.player.coin.value += credit.value - cost.value;
                    if (item == lo && $.security)
                        $.security--;
                    $.online.altered = true;
                }
                break;
            case 'V':
                item--;
                cost = $.player.poison == 1 ? new items_1.Coin(items_1.Poison.vials[items_1.Poison.merchant[item]].vial)
                    : new items_1.Coin(items_1.Poison.vials[items_1.Poison.merchant[item]].cost);
                if ($.player.coin.value >= cost.value && !items_1.Poison.have($.player.poisons, buy)) {
                    lib_1.vt.profile({ png: 'payment', effect: 'tada' });
                    lib_1.vt.sound('click');
                    items_1.Poison.add($.player.poisons, buy);
                    lib_1.vt.out('\nHe slips you a vial of ', items_1.Poison.merchant[item], '\n');
                    $.player.coin.value -= cost.value;
                    $.online.altered = true;
                }
                break;
            case 'W':
                cost = new items_1.Coin(items_1.Weapon.name[items_1.Weapon.merchant[buy]].value);
                if ($.player.coin.value + credit.value >= cost.value) {
                    lib_1.vt.profile({ png: 'payment', effect: 'tada' });
                    lib_1.vt.sound('click');
                    $.player.weapon = items_1.Weapon.merchant[buy];
                    $.player.toWC = 0;
                    $.online.toWC = 0;
                    lib_1.vt.out(' - ', $.player.weapon, '\n');
                    $.player.coin.value += credit.value - cost.value;
                    items_1.Weapon.equip($.online, $.player.weapon);
                }
                break;
        }
        menu();
    }
    function buyall() {
        let item;
        let cost;
        switch (want) {
            case 'A':
                for (item = hi; item >= lo; item--) {
                    cost = new items_1.Coin(items_1.Armor.name[items_1.Armor.merchant[item]].value);
                    if ($.player.coin.value + credit.value >= cost.value) {
                        if (items_1.Armor.name[items_1.Armor.merchant[item]].ac > $.online.armor.ac
                            || ($.online.armor.ac == items_1.Armor.name[items_1.Armor.merchant[item]].ac
                                && ($.online.toAC < 0 || $.player.toAC < 0))) {
                            lib_1.vt.entry = item.toString();
                            lib_1.vt.out(' ', lib_1.vt.entry);
                            buy();
                            return;
                        }
                    }
                }
                break;
            case 'M':
                for (let spell = lo; spell <= hi; spell++) {
                    item = spell - 1;
                    cost = $.player.magic == 1 ? new items_1.Coin(items_1.Magic.spells[items_1.Magic.merchant[item]].wand)
                        : new items_1.Coin(items_1.Magic.spells[items_1.Magic.merchant[item]].cost);
                    if ($.player.coin.value >= cost.value && !items_1.Magic.have($.player.spells, spell)) {
                        lib_1.vt.sound('click');
                        items_1.Magic.add($.player.spells, spell);
                        lib_1.vt.out(lib_1.bracket(spell), items_1.Magic.merchant[item]);
                        $.player.coin.value -= cost.value;
                    }
                }
                $.online.altered = true;
                break;
            case 'R':
                for (item = hi; item >= lo; item--) {
                    cost = new items_1.Coin(items_1.RealEstate.name[items_1.RealEstate.merchant[item]].value);
                    if ($.player.coin.value + credit.value >= cost.value) {
                        if (items_1.RealEstate.name[items_1.RealEstate.merchant[item]].protection > items_1.RealEstate.name[$.player.realestate].protection) {
                            lib_1.vt.entry = item.toString();
                            lib_1.vt.out(' ', lib_1.vt.entry);
                            buy();
                            return;
                        }
                    }
                }
                break;
            case 'S':
                for (item = hi; item >= lo; item--) {
                    cost = new items_1.Coin(items_1.Security.name[items_1.Security.merchant[item]].value);
                    if ($.player.coin.value + credit.value >= cost.value) {
                        if (items_1.Security.name[items_1.Security.merchant[item]].protection > items_1.Security.name[$.player.security].protection) {
                            lib_1.vt.entry = item.toString();
                            lib_1.vt.out(' ', lib_1.vt.entry);
                            buy();
                            return;
                        }
                    }
                }
                break;
            case 'V':
                for (let vial = lo; vial <= hi; vial++) {
                    item = vial - 1;
                    cost = $.player.poison == 1 ? new items_1.Coin(items_1.Poison.vials[items_1.Poison.merchant[item]].vial)
                        : new items_1.Coin(items_1.Poison.vials[items_1.Poison.merchant[item]].cost);
                    if ($.player.coin.value >= cost.value && !items_1.Poison.have($.player.poisons, vial)) {
                        lib_1.vt.sound('click');
                        items_1.Poison.add($.player.poisons, vial);
                        lib_1.vt.out('\nHe slips you a vial of ', items_1.Poison.merchant[item]);
                        $.player.coin.value -= cost.value;
                    }
                }
                $.online.altered = true;
                break;
            case 'W':
                for (item = hi; item >= lo; item--) {
                    cost = new items_1.Coin(items_1.Weapon.name[items_1.Weapon.merchant[item]].value);
                    if ($.player.coin.value + credit.value >= cost.value) {
                        if (items_1.Weapon.name[items_1.Weapon.merchant[item]].wc > $.online.weapon.wc
                            || ($.online.weapon.wc == items_1.Weapon.name[items_1.Weapon.merchant[item]].wc
                                && ($.online.toWC < 0 || $.player.toWC < 0))) {
                            lib_1.vt.entry = item.toString();
                            lib_1.vt.out(' ', lib_1.vt.entry);
                            buy();
                            return;
                        }
                    }
                }
                break;
        }
        lib_1.vt.out('\n');
        menu();
    }
})(Square || (Square = {}));
module.exports = Square;
