"use strict";
const $ = require("../runtime");
const Battle = require("../battle");
const db = require("../db");
const Taxman = require("./taxman");
const items_1 = require("../items");
const lib_1 = require("../lib");
const npc_1 = require("../npc");
const pc_1 = require("../pc");
const player_1 = require("../player");
const sys_1 = require("../sys");
var Tavern;
(function (Tavern) {
    let tavern = {
        'B': { description: 'Brawl another user' },
        'E': { description: 'Eavesdrop on the arguments' },
        'J': { description: 'Jump into the arguments' },
        'G': { description: 'Guzzle beer' },
        'L': { description: 'List user bounties' },
        'P': { description: 'Post your own bounty' },
        'S': { description: 'Swear at Tiny' },
        'T': { description: `Today's news` },
        'Y': { description: `Yesterday's news` }
    };
    pc_1.PC.load($.barkeep);
    const file = sys_1.pathTo('users', 'arguments.json');
    const mantle = sys_1.pathTo('files/tavern', 'trophy.json');
    function menu(suppress = true) {
        if (player_1.checkXP($.online, menu))
            return;
        if ($.online.altered)
            pc_1.PC.save();
        Taxman.bar();
        if ($.reason)
            lib_1.vt.hangup();
        npc_1.elemental.orders('Tavern');
        lib_1.vt.form = {
            'menu': { cb: choice, cancel: 'q', enter: '?', eol: false }
        };
        let hints = '';
        if (!suppress) {
            if ($.player.coin.value)
                hints += '> Carrying extra money around here is only good for posting a bounty\n  on someone or buying drinks & tips from the barkeep.\n';
        }
        lib_1.vt.form['menu'].prompt = lib_1.display('tavern', lib_1.vt.Yellow, lib_1.vt.yellow, suppress, tavern, hints);
        player_1.input('menu');
    }
    Tavern.menu = menu;
    function choice() {
        var _a;
        let js = [];
        let suppress = false;
        let choice = lib_1.vt.entry.toUpperCase();
        if ((_a = tavern[choice]) === null || _a === void 0 ? void 0 : _a.description) {
            lib_1.vt.out(' - ', tavern[choice].description);
            suppress = $.player.expert;
        }
        lib_1.vt.outln();
        switch (choice) {
            case 'J':
                if (!$.argue) {
                    lib_1.vt.outln(`\nYou've made your argument already -- go have a beer.`);
                    suppress = true;
                    break;
                }
                lib_1.vt.action('freetext');
                lib_1.vt.form = {
                    'argue': {
                        cb: () => {
                            lib_1.vt.outln();
                            if (lib_1.vt.entry.length && !sys_1.cuss(lib_1.vt.entry)) {
                                try {
                                    js = JSON.parse(sys_1.fs.readFileSync(file).toString());
                                }
                                catch (_a) { }
                                js = js.splice(+(js.length > 9), 9).concat({ who: $.player.id, text: lib_1.vt.entry });
                                sys_1.fs.writeFileSync(file, JSON.stringify(js));
                                $.argue--;
                            }
                            menu();
                        }, prompt: 'Enter your argument', lines: 6, timeout: 600
                    }
                };
                player_1.input('argue', '');
                return;
            case 'E':
                try {
                    js = JSON.parse(sys_1.fs.readFileSync(file).toString());
                    for (let argument in js) {
                        lib_1.vt.outln();
                        lib_1.vt.outln('    -=', lib_1.bracket(js[argument].who, false), '=-');
                        lib_1.vt.outln(+argument % 2 ? lib_1.vt.lyellow : lib_1.vt.lcyan, js[argument].text);
                    }
                }
                catch (err) {
                    lib_1.vt.outln(`not available (${err})`);
                }
                suppress = true;
                break;
            case 'T':
                lib_1.cat('tavern/today');
                suppress = true;
                break;
            case 'Y':
                lib_1.cat('tavern/yesterday');
                suppress = true;
                break;
            case 'G':
                lib_1.vt.outln(`\n${$.barkeep.user.handle} pours you a beer.`, -500);
                lib_1.vt.action('payment');
                lib_1.vt.form = {
                    'tip': {
                        cb: () => {
                            lib_1.vt.outln('\n');
                            if ((+lib_1.vt.entry).toString() == lib_1.vt.entry)
                                lib_1.vt.entry += 'c';
                            let tip = (/=|max/i.test(lib_1.vt.entry)) ? $.player.coin.value : new lib_1.Coin(lib_1.vt.entry).value;
                            if (tip < 1 || tip > $.player.coin.value) {
                                lib_1.vt.sound('oops');
                                lib_1.vt.outln(pc_1.PC.who($.barkeep).He, 'pours the beer on you and kicks you out of ', $.barkeep.who.his, 'bar.', -1000);
                                $.brawl = 0;
                                require('./menu').menu(true);
                                return;
                            }
                            lib_1.vt.beep();
                            lib_1.vt.out(lib_1.vt.yellow, pc_1.PC.who($.barkeep).He, 'grunts and hands you your beer.');
                            if ($.player.emulation == 'XT')
                                lib_1.vt.out(' \u{1F37A}');
                            lib_1.vt.outln(-1000);
                            $.online.altered = true;
                            $.player.coin.value -= tip;
                            lib_1.vt.out(lib_1.vt.green, pc_1.PC.who($.barkeep).He, 'says, ', lib_1.vt.white, '"', [
                                'More stamina will yield more hit points',
                                'More intellect will yield more spell power',
                                `You don't miss as often with higher agility`,
                                'You can sell items for more money with higher charisma',
                                'You can do more damage in battle with higher stamina',
                                `Spells don't fail as often with higher intellect`,
                                'Higher agility yields higher jousting ability',
                                'Fishing can get better results from higher charisma',
                                'Real Estate and Security help protect your investments',
                                'Dodging an attack is your ability to steal with dexterity',
                                'Higher baud rates yield faster screen displays',
                                'Crying will not change the world',
                                'Backstabs swish more than you wish',
                                'Dungeon maps fall more often into lucky hands',
                                `Higher intellect calculates opponent's hit points more accurately`,
                                `50+ Intellect points are needed to map where you've been walking`,
                                'Resurrect works on ALL dead folk, not creatures',
                                `Death challenge your gang's leader in the Arena`,
                                'Blessed/Cursed does not carry over to the next day',
                                `Killing the town's barkeep will lose you favor with its folks`,
                                'Deeper dungeon portals is a key to victory',
                                `I'll have more hints tomorrow.  Maybe`
                            ][tip % 22]);
                            lib_1.vt.outln('."', -1000);
                            menu();
                        }, prompt: 'How much will you tip? ', max: 8
                    },
                };
                player_1.input('tip', sys_1.dice(22).toString());
                return;
            case 'L':
                lib_1.vt.outln(lib_1.vt.green, '\n        --=:)) Tavern Bounty List ((:=--\n');
                let rs = db.query(`SELECT handle,bounty,who FROM Players WHERE bounty > 0 ORDER BY level DESC`);
                for (let i in rs) {
                    let adversary = { user: { id: rs[i].who } };
                    pc_1.PC.load(adversary);
                    let bounty = new lib_1.Coin(rs[i].bounty);
                    lib_1.vt.outln(`${rs[i].handle} has a ${bounty.carry()} bounty from ${adversary.user.handle}`);
                }
                lib_1.vt.form = {
                    'pause': { cb: menu, pause: true }
                };
                player_1.input('pause', '');
                return;
            case 'P':
                if (!$.access.roleplay)
                    break;
                if ($.player.coin.value < 1) {
                    lib_1.vt.outln(`\nYou'll need some cash to post a bounty.`);
                    suppress = true;
                    break;
                }
                if ($.player.novice || $.player.level < 10) {
                    lib_1.vt.sound('crowd');
                    lib_1.vt.outln('\nThe crowd laughs at your gesture.', -1000);
                    lib_1.vt.outln(`${$.barkeep.user.handle} snorts, "Be for real."`);
                    suppress = true;
                    break;
                }
                Battle.user('Bounty', (opponent) => {
                    if (opponent.user.id == '' || opponent.user.id == $.player.id) {
                        menu();
                        return;
                    }
                    lib_1.vt.outln();
                    if (opponent.user.bounty.value) {
                        lib_1.vt.outln(`${opponent.user.handle} already has a bounty posted.`);
                        menu();
                        return;
                    }
                    let max = new lib_1.Coin(new lib_1.Coin(10 * sys_1.money(opponent.user.level)).carry(1, true));
                    if (max.value > $.player.coin.value)
                        max = new lib_1.Coin($.player.coin.carry(1, true));
                    lib_1.vt.action('payment');
                    lib_1.vt.form = {
                        'coin': {
                            cb: () => {
                                lib_1.vt.outln();
                                if ((+lib_1.vt.entry).toString() == lib_1.vt.entry)
                                    lib_1.vt.entry += 'c';
                                let post = sys_1.int((/=|max/i.test(lib_1.vt.entry)) ? max.value : new lib_1.Coin(lib_1.vt.entry).value);
                                if (post > 0 && post <= max.value) {
                                    $.player.coin.value -= post;
                                    opponent.user.bounty = new lib_1.Coin(post);
                                    opponent.user.who = $.player.id;
                                    lib_1.vt.beep();
                                    lib_1.vt.outln(`\nYour bounty is posted for all to see.`, -500);
                                    lib_1.news(`\tposted a bounty on ${opponent.user.handle}`);
                                    pc_1.PC.save(opponent);
                                }
                                menu(true);
                            }, max: 6
                        }
                    };
                    lib_1.vt.form['coin'].prompt = `Bounty [MAX=${max.carry()}]? `;
                    player_1.input('coin', '=');
                    return;
                });
                return;
            case 'S':
                if (!$.access.roleplay)
                    break;
                lib_1.vt.out('\nYou call to Tiny, then ');
                $.tiny--;
                switch ($.tiny) {
                    case 2:
                        lib_1.vt.profile({
                            jpg: 'npc/barkeep', effect: 'fadeInRight',
                            handle: $.barkeep.user.handle, level: $.barkeep.user.level, pc: $.barkeep.user.pc
                        });
                        lib_1.vt.outln('yell, "Freak!"', -1000);
                        if ($.player.level < 60)
                            lib_1.vt.outln('The barkeep stares off into empty space, ignoring your wimpy comment.');
                        else
                            lib_1.vt.outln(`The barkeep points at ${pc_1.PC.who($.barkeep).his}massive, flexed bicep and laughs at your jest.`);
                        suppress = true;
                        break;
                    case 1:
                        lib_1.vt.profile({
                            jpg: 'npc/barkeep', effect: 'shakeX',
                            handle: $.barkeep.user.handle, level: $.barkeep.user.level, pc: $.barkeep.user.pc
                        });
                        lib_1.vt.outln('thumb your nose.', -1000);
                        if ($.player.level < 60)
                            lib_1.vt.outln(`Annoyed, the barkeep looks down at ${pc_1.PC.who($.barkeep).his}furry feet and counts, \"100, 99, 98,...\"`);
                        else
                            lib_1.vt.outln(`The former Champion Ogre grunts to ${pc_1.PC.who($.barkeep).self} "Not good for business."`);
                        suppress = true;
                        break;
                    default:
                        $.brawl = 0;
                        lib_1.vt.music();
                        lib_1.vt.outln(`jest, "What you looking at, wart-face!"`, -1200);
                        lib_1.vt.profile({
                            jpg: 'npc/barkeep', effect: 'shakeY',
                            handle: $.barkeep.user.handle, level: $.barkeep.user.level, pc: $.barkeep.user.pc
                        });
                        lib_1.vt.out('Uh, oh!');
                        lib_1.vt.sound('ddd', 22);
                        lib_1.vt.title(`${$.player.handle}: level ${$.player.level} ${$.player.pc} death match with ${$.barkeep.user.handle}`);
                        lib_1.vt.out('  Here comes Tiny!');
                        lib_1.vt.sound('challenge', 12);
                        lib_1.vt.outln(`  And ${pc_1.PC.who($.barkeep).he}doesn't look friendly...\n`, -600);
                        lib_1.vt.outln(lib_1.vt.green, lib_1.vt.bright, [
                            `"When I'm through with you, your mama won't be able to identify the remains."`,
                            `"I am getting too old for this."`,
                            `"Never rub another man\'s rhubarb!"`
                        ][sys_1.dice(3) - 1], -3000);
                        pc_1.PC.load($.barkeep);
                        let trophy = JSON.parse(sys_1.fs.readFileSync(mantle).toString());
                        $.barkeep.user.toWC = sys_1.whole($.barkeep.weapon.wc / 5);
                        if ($.barkeep.weapon.wc < items_1.Weapon.merchant.length)
                            $.barkeep.toWC += sys_1.int((items_1.Weapon.merchant.length - $.barkeep.weapon.wc) / 10) + 1;
                        lib_1.vt.outln(`\n${$.barkeep.user.handle} towels ${pc_1.PC.who($.barkeep).his}hands dry from washing the day\'s\nglasses, ${pc_1.PC.who($.barkeep).he}warns,\n`);
                        lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.green, '"Another fool said something like that to me, once, and got all busted up."\n', -5000);
                        let fool = { user: { id: trophy.who, handle: 'a pirate', gender: 'M' } };
                        pc_1.PC.load(fool);
                        lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.green, `"I think it was ${fool.user.handle}, and it took me a week to clean up the blood!"\n`, -4000);
                        lib_1.vt.music('tiny');
                        lib_1.vt.out(`${pc_1.PC.who($.barkeep).He}points to a buffed weapon hanging over the mantlepiece and says, `, lib_1.vt.green, lib_1.vt.bright, '"Lookee\n');
                        lib_1.vt.outln(`there, ${pc_1.PC.who(fool).he}tried to use that ${trophy.weapon}`, lib_1.vt.green, lib_1.vt.bright, `, but it wasn't enough\nto take me.\"\n`, -6000);
                        lib_1.vt.out('The patrons move in closer to witness the forthcoming slaughter, except for\n');
                        lib_1.vt.outln(`${$.taxman.user.handle} who is busy raiding the bar of its beer and nuts.`, -5000);
                        lib_1.vt.outln(`\nYou hear a cry, "I'll pay fifteen-to-one on the challenger!"`, -4000);
                        lib_1.vt.sound('crowd');
                        lib_1.vt.out('The crowd roars with laughter... ', -3000);
                        lib_1.vt.outln('you are not amused.', -2000);
                        lib_1.vt.outln(`\n${$.barkeep.user.handle} removes ${pc_1.PC.who($.barkeep).his}tunic to reveal a massive, but\nheavily scarred chest.`, -2500);
                        lib_1.vt.out('\nYou look for an exit, but there is none to be found... ', -2500);
                        lib_1.vt.outln();
                        $.player.coward = true;
                        pc_1.PC.save();
                        $.online.altered = true;
                        Battle.engage('Tavern', $.online, $.barkeep, require('./menu').menu);
                        return;
                }
                break;
            case 'B':
                if (!$.brawl) {
                    lib_1.vt.outln('\nYou have run out of brawls.');
                    break;
                }
                $.online.bp = $.online.hp > 9 ? sys_1.int($.online.hp / 10) : 1;
                Battle.user('Brawl', (opponent) => {
                    if (opponent.user.id == '') {
                        menu(true);
                        return;
                    }
                    lib_1.vt.outln();
                    if (opponent.user.id == $.player.id) {
                        lib_1.vt.outln('You want to hit yourself?');
                        menu(true);
                        return;
                    }
                    if ($.player.level - opponent.user.level > 3) {
                        lib_1.vt.outln('You can only brawl someone higher or up to three levels below you.');
                        menu(true);
                        return;
                    }
                    lib_1.vt.outln(lib_1.vt.green, 'Name: ', lib_1.vt.white, sys_1.sprintf('%-22s      You:', opponent.user.handle));
                    lib_1.vt.outln(lib_1.vt.green, 'Level: ', lib_1.vt.white, sys_1.sprintf('%-22d     %-2d', opponent.user.level, $.player.level));
                    lib_1.vt.outln(lib_1.vt.green, 'Knock out points: ', lib_1.vt.white, sys_1.sprintf('%-15d %-3d', opponent.bp, $.online.bp));
                    if (!items_1.Access.name[opponent.user.access].roleplay) {
                        lib_1.vt.outln('\nYou are allowed only to brawl other players.');
                        if (opponent.user.id[0] == '_') {
                            pc_1.PC.adjust('cha', -2, -1);
                            $.player.coward = true;
                        }
                        menu(true);
                        return;
                    }
                    if (!db.lock(opponent.user.id)) {
                        lib_1.vt.beep();
                        lib_1.vt.outln(lib_1.vt.cyan, lib_1.vt.faint, `\n${pc_1.PC.who(opponent).He}is currently engaged elsewhere and not available.`);
                        menu(true);
                        return;
                    }
                    lib_1.vt.action('ny');
                    lib_1.vt.form = {
                        'brawl': {
                            cb: () => {
                                lib_1.vt.outln('\n');
                                if (/Y/i.test(lib_1.vt.entry)) {
                                    $.brawl--;
                                    if (($.online.dex / 2 + sys_1.dice($.online.dex / 2)) > (opponent.dex / 2 + sys_1.dice(opponent.dex / 2))) {
                                        lib_1.vt.outln('You get the first punch.');
                                        Battle.brawl($.online, opponent);
                                    }
                                    else
                                        lib_1.vt.outln(`${pc_1.PC.who(opponent).He}gets the first punch.`);
                                    if ($.online.bp > 0 && opponent.bp > 0)
                                        Battle.brawl(opponent, $.online);
                                    if ($.online.bp > 0 && opponent.bp > 0) {
                                        lib_1.vt.action('brawl');
                                        player_1.input('punch', 2 * $.online.bp < opponent.bp ? 'p' : 'g');
                                    }
                                    else
                                        menu($.player.expert);
                                }
                                else
                                    menu($.player.expert);
                            }, prompt: 'Are you sure (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                        },
                        'punch': {
                            cb: () => {
                                lib_1.vt.outln();
                                if (/P/i.test(lib_1.vt.entry)) {
                                    Battle.brawl($.online, opponent);
                                    if ($.online.bp > 0 && opponent.bp > 0)
                                        Battle.brawl(opponent, $.online);
                                }
                                if (/G/i.test(lib_1.vt.entry)) {
                                    db.unlock($.player.id, true);
                                    lib_1.vt.outln(`\nWe can't all be Rocky, eh?`);
                                    menu($.player.expert);
                                    return;
                                }
                                if (/Y/i.test(lib_1.vt.entry))
                                    lib_1.vt.outln(`\nYour knock out points: ${$.online.bp}`);
                                if ($.online.bp > 0 && opponent.bp > 0)
                                    lib_1.vt.refocus();
                                else {
                                    db.unlock($.player.id, true);
                                    menu($.player.expert);
                                }
                            }, prompt: lib_1.vt.attr(lib_1.bracket('P', false), lib_1.vt.cyan, `unch ${pc_1.PC.who(opponent).him}`, lib_1.bracket('G', false), lib_1.vt.cyan, 'ive it up, ', lib_1.bracket('Y', false), lib_1.vt.cyan, 'our status: '),
                            cancel: 'G', enter: 'P', eol: false, match: /P|G|Y/i, timeout: 30
                        }
                    };
                    player_1.input('brawl', 'y');
                });
                return;
            case 'Q':
                require('./menu').menu($.player.expert);
                return;
            default:
                lib_1.vt.beep();
                suppress = false;
        }
        menu(suppress);
    }
})(Tavern || (Tavern = {}));
module.exports = Tavern;
