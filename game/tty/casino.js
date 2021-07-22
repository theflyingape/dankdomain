"use strict";
const $ = require("../runtime");
const items_1 = require("../items");
const lib_1 = require("../lib");
const npc_1 = require("../npc");
const pc_1 = require("../pc");
const player_1 = require("../player");
const sys_1 = require("../sys");
var Casino;
(function (Casino) {
    let casino = {
        'B': { description: 'Blackjack' },
        'C': { description: 'Craps' },
        'H': { description: 'High Stakes Draw' },
        'K': { description: 'Keno Lottery' },
        'S': { description: 'Cherry Bomb Slots' }
    };
    let game;
    let max = new lib_1.Coin(0);
    let payoff = new lib_1.Coin(0);
    let point;
    let sting = true;
    const card = [
        { face: '*Joker*', suit: '⚜', value: -1, uni: '🂿' },
        { face: '=Ace=', suit: '♠', value: 1, uni: '🂡' },
        { face: 'Two', suit: '♠', value: 2, uni: '🂢' }, { face: 'Three', suit: '♠', value: 3, uni: '🂣' },
        { face: 'Four', suit: '♠', value: 4, uni: '🂤' }, { face: 'Five', suit: '♠', value: 5, uni: '🂥' },
        { face: 'Six', suit: '♠', value: 6, uni: '🂦' }, { face: 'Seven', suit: '♠', value: 7, uni: '🂧' },
        { face: 'Eight', suit: '♠', value: 8, uni: '🂨' }, { face: 'Nine', suit: '♠', value: 9, uni: '🂩' },
        { face: 'Ten', suit: '♠', value: 10, uni: '🂪' }, { face: '-Jack-', suit: '♠', value: 10, uni: '🂫' },
        { face: '~Queen~', suit: '♠', value: 10, uni: '🂭' }, { face: '+King+', suit: '♠', value: 10, uni: '🂮' },
        { face: '=Ace=', suit: '♥', value: 1, uni: '🂱' },
        { face: 'Two', suit: '♥', value: 2, uni: '🂲' }, { face: 'Three', suit: '♥', value: 3, uni: '🂳' },
        { face: 'Four', suit: '♥', value: 4, uni: '🂴' }, { face: 'Five', suit: '♥', value: 5, uni: '🂵' },
        { face: 'Six', suit: '♥', value: 6, uni: '🂶' }, { face: 'Seven', suit: '♥', value: 7, uni: '🂷' },
        { face: 'Eight', suit: '♥', value: 8, uni: '🂸' }, { face: 'Nine', suit: '♥', value: 9, uni: '🂹' },
        { face: 'Ten', suit: '♥', value: 10, uni: '🂺' }, { face: '-Jack-', suit: '♥', value: 10, uni: '🂻' },
        { face: '~Queen~', suit: '♥', value: 10, uni: '🂽' }, { face: '+King+', suit: '♥', value: 10, uni: '🂾' },
        { face: '=Ace=', suit: '♣', value: 1, uni: '🃑' },
        { face: 'Two', suit: '♣', value: 2, uni: '🃒' }, { face: 'Three', suit: '♣', value: 3, uni: '🃓' },
        { face: 'Four', suit: '♣', value: 4, uni: '🃔' }, { face: 'Five', suit: '♣', value: 5, uni: '🃕' },
        { face: 'Six', suit: '♣', value: 6, uni: '🃖' }, { face: 'Seven', suit: '♣', value: 7, uni: '🃗' },
        { face: 'Eight', suit: '♣', value: 8, uni: '🃘' }, { face: 'Nine', suit: '♣', value: 9, uni: '🃙' },
        { face: 'Ten', suit: '♣', value: 10, uni: '🃚' }, { face: '-Jack-', suit: '♣', value: 10, uni: '🃛' },
        { face: '~Queen~', suit: '♣', value: 10, uni: '🃝' }, { face: '+King+', suit: '♣', value: 10, uni: '🃞' },
        { face: '=Ace=', suit: '♦', value: 1, uni: '🃁' },
        { face: 'Two', suit: '♦', value: 2, uni: '🃂' }, { face: 'Three', suit: '♦', value: 3, uni: '🃃' },
        { face: 'Four', suit: '♦', value: 4, uni: '🃄' }, { face: 'Five', suit: '♦', value: 5, uni: '🃅' },
        { face: 'Six', suit: '♦', value: 6, uni: '🃆' }, { face: 'Seven', suit: '♦', value: 7, uni: '🃇' },
        { face: 'Eight', suit: '♦', value: 8, uni: '🃈' }, { face: 'Nine', suit: '♦', value: 9, uni: '🃉' },
        { face: 'Ten', suit: '♦', value: 10, uni: '🃊' }, { face: '-Jack-', suit: '♦', value: 10, uni: '🃋' },
        { face: '~Queen~', suit: '♦', value: 10, uni: '🃍' }, { face: '+King+', suit: '♦', value: 10, uni: '🃎' },
        { face: '*Joker*', suit: '⚜', value: -1, uni: '🃏' }
    ];
    let deck;
    let pile;
    const slot = {
        'CHERRY': { attr: lib_1.vt.normal, color: lib_1.vt.red, uni: '🍒' },
        'GRAPES': { attr: lib_1.vt.normal, color: lib_1.vt.magenta, uni: '🍇' },
        ':KIWI:': { attr: lib_1.vt.bright, color: lib_1.vt.green, uni: '🥝' },
        'ORANGE': { attr: lib_1.vt.normal, color: lib_1.vt.yellow, uni: '🍊' },
        '<BELL>': { attr: lib_1.vt.bright, color: lib_1.vt.yellow, uni: '🔔' },
        '=LUCK=': { attr: lib_1.vt.normal, color: lib_1.vt.green, uni: '🍀' },
        '*WILD*': { attr: lib_1.vt.normal, color: lib_1.vt.cyan, uni: '💎' },
        '@BOMB@': { attr: lib_1.vt.faint, color: lib_1.vt.white, uni: '💣' }
    };
    const dial = [
        ['=LUCK=', 'GRAPES', 'CHERRY', '<BELL>', ':KIWI:', 'GRAPES', '@BOMB@', 'CHERRY', 'ORANGE', ':KIWI:', '*WILD*', 'GRAPES', 'CHERRY', '<BELL>', ':KIWI:', 'CHERRY'],
        ['ORANGE', '=LUCK=', 'CHERRY', 'ORANGE', 'GRAPES', 'ORANGE', 'CHERRY', '@BOMB@', '<BELL>', 'ORANGE', 'CHERRY', 'GRAPES', ':KIWI:', 'ORANGE', '*WILD*', 'CHERRY'],
        ['<BELL>', '*WILD*', ':KIWI:', 'CHERRY', 'ORANGE', '@BOMB@', 'GRAPES', ':KIWI:', 'CHERRY', '=LUCK=', 'GRAPES', 'CHERRY', ':KIWI:', 'GRAPES', ':KIWI:', 'CHERRY']
    ];
    function menu(suppress = true) {
        if ($.online.altered)
            pc_1.PC.save();
        if ($.reason)
            lib_1.vt.hangup();
        npc_1.elemental.orders('Casino');
        lib_1.vt.form = {
            'menu': { cb: choice, cancel: 'q', enter: '?', eol: false }
        };
        lib_1.vt.form['menu'].prompt = lib_1.display('casino', lib_1.vt.Green, lib_1.vt.green, suppress, casino);
        player_1.input('menu');
        max.value = lib_1.tradein(new lib_1.Coin(items_1.RealEstate.name[$.player.realestate].value).value);
        max.value += lib_1.tradein(new lib_1.Coin(items_1.Security.name[$.player.security].value).value);
        max.value = sys_1.int(max.value / 10);
        max.value += lib_1.tradein(($.player.level * sys_1.money($.player.level)));
        if (max.value > 1e+16)
            max.value = 1e+16;
        max = new lib_1.Coin(max.carry(1, true));
    }
    Casino.menu = menu;
    function choice() {
        var _a;
        if ((game = lib_1.vt.entry.toUpperCase()) == 'Q') {
            lib_1.vt.outln();
            require('./menu').menu($.player.expert);
            return;
        }
        if ((_a = casino[game]) === null || _a === void 0 ? void 0 : _a.description) {
            lib_1.vt.outln(' - ', casino[game].description);
            if ($.access.roleplay) {
                if (sting) {
                    lib_1.vt.music('casino');
                    sting = false;
                }
                Bet();
                return;
            }
        }
        menu(false);
    }
    function Bet() {
        if (max.value > $.player.coin.value)
            max.value = $.player.coin.value;
        lib_1.vt.action('wager');
        lib_1.vt.form = {
            'coin': { cb: amount, max: 6 }
        };
        lib_1.vt.form['coin'].prompt = lib_1.vt.attr('Bet ', lib_1.vt.white, '[', lib_1.vt.uline, 'MAX', lib_1.vt.nouline, '=', max.carry(), ']? ');
        lib_1.vt.focus = 'coin';
    }
    function amount() {
        let ace = 0;
        lib_1.vt.outln();
        if ((+lib_1.vt.entry).toString() == lib_1.vt.entry)
            lib_1.vt.entry += 'c';
        let amount = new lib_1.Coin(0);
        if (/=|max/i.test(lib_1.vt.entry))
            amount.value = max.value;
        else
            amount.value = sys_1.int(new lib_1.Coin(lib_1.vt.entry).value);
        if (amount.value < 1 || amount.value > $.player.coin.value || amount.value > max.value) {
            lib_1.vt.beep();
            menu($.player.expert);
            return;
        }
        $.player.coin.value -= amount.value;
        switch (game) {
            case 'B':
                shuffle();
                let player = [];
                let myhand;
                let dealer = [];
                let value;
                player.push(deck[pile++]);
                dealer.push(deck[pile++]);
                player.push(deck[pile++]);
                dealer.push(deck[pile++]);
                lib_1.vt.out(lib_1.vt.green, `\nDealer's hand:`);
                if ($.player.emulation == 'XT')
                    lib_1.vt.out(lib_1.vt.white, ' 🂠 ', card[dealer[1]].uni);
                lib_1.vt.out(' '.repeat(8));
                lib_1.vt.outln(lib_1.vt.red, '[', lib_1.vt.white, 'DOWN', lib_1.vt.red, '] [', lib_1.vt.white, card[dealer[1]].face, lib_1.vt.red, ']');
                myhand = ShowHand(1, player);
                if (myhand == 21) {
                    lib_1.vt.sound('cheer');
                    payoff.value = 2 * amount.value;
                    lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.cyan, '\nBlackjack!!', -1000);
                    value = ShowHand(0, dealer);
                    if (value == 21) {
                        lib_1.vt.sound('boo');
                        lib_1.vt.outln(`\nDealer has Blackjack!  You're a loser.`, -1000);
                    }
                    else {
                        lib_1.vt.outln('\nYou win ', payoff.carry(), '!');
                        $.player.coin.value += payoff.value + amount.value;
                    }
                    break;
                }
                lib_1.vt.action('blackjack');
                lib_1.vt.form = {
                    'draw': {
                        cb: () => {
                            lib_1.vt.outln('\n');
                            switch (lib_1.vt.entry.toUpperCase()) {
                                case 'D':
                                    $.player.coin.value -= amount.value;
                                    amount.value *= 2;
                                    payoff.value = amount.value;
                                    lib_1.vt.entry = 'S';
                                case 'H':
                                    player.push(deck[pile++]);
                                    myhand = ShowHand(1, player);
                                    if (myhand > 21) {
                                        lib_1.vt.outln('You bust!');
                                        lib_1.vt.entry = 'S';
                                        amount.value = 0;
                                    }
                                    else if (player.length == 5) {
                                        lib_1.vt.sound('cheer');
                                        payoff.value = 2 * amount.value;
                                        lib_1.vt.outln('Five card charley!  You win ', payoff.carry(), '!');
                                        $.player.coin.value += payoff.value + amount.value;
                                        menu();
                                        return;
                                    }
                                    else if (myhand == 21)
                                        lib_1.vt.entry = 'S';
                                    else if (lib_1.vt.entry !== 'S') {
                                        lib_1.vt.refocus();
                                        return;
                                    }
                                    lib_1.vt.outln();
                                    break;
                            }
                            if (/S/i.test(lib_1.vt.entry)) {
                                while ((value = ShowHand(0, dealer)) < 17 && amount.value) {
                                    dealer.push(deck[pile++]);
                                    lib_1.vt.sound('click', 8);
                                }
                                lib_1.vt.outln();
                                if (amount.value) {
                                    if (value > 21) {
                                        lib_1.vt.sound('cheer');
                                        payoff.value = amount.value;
                                        lib_1.vt.outln('Dealer breaks!  You win ', payoff.carry(), '!');
                                        $.player.coin.value += payoff.value + amount.value;
                                    }
                                    else if (myhand > value) {
                                        lib_1.vt.sound('cheer');
                                        payoff.value = amount.value;
                                        lib_1.vt.outln('You win ', payoff.carry(), '!');
                                        $.player.coin.value += payoff.value + amount.value;
                                    }
                                    else if (myhand < value) {
                                        lib_1.vt.sound('boo');
                                        lib_1.vt.outln('You lose.');
                                    }
                                    else {
                                        lib_1.vt.outln(`You tie.  It's a push.`);
                                        $.player.coin.value += amount.value;
                                    }
                                }
                                menu();
                            }
                        }, cancel: 'S', eol: false, max: 1
                    }
                };
                lib_1.vt.form['draw'].prompt = lib_1.vt.attr(lib_1.bracket('H', false), lib_1.vt.cyan, 'it, ', lib_1.bracket('S', false), lib_1.vt.cyan, 'tand');
                lib_1.vt.form['draw'].match = /H|S/i;
                if ($.player.coin.value >= amount.value && (ace > 0 || myhand < 12)) {
                    lib_1.vt.form['draw'].prompt += lib_1.vt.attr(', ', lib_1.bracket('D', false), lib_1.vt.cyan, 'ouble down');
                    lib_1.vt.form['draw'].match = /D|H|S/i;
                }
                lib_1.vt.form['draw'].prompt += ': ';
                lib_1.vt.focus = 'draw';
                return;
            case 'C':
                lib_1.vt.out('Rolling dice for your point ', lib_1.vt.faint);
                lib_1.vt.sleep(100);
                let d1 = sys_1.dice(6), d2 = sys_1.dice(6);
                for (let i = 0; i < d1 + 1; i++) {
                    lib_1.vt.sound('click');
                    lib_1.vt.out('.');
                }
                lib_1.vt.sleep(100);
                point = d1 + d2;
                lib_1.vt.out(lib_1.vt.normal, lib_1.vt.blue, '[', lib_1.vt.bright, lib_1.vt.cyan, d1.toString(), lib_1.vt.normal, lib_1.vt.blue, '] [', lib_1.vt.bright, lib_1.vt.cyan, d2.toString(), lib_1.vt.normal, lib_1.vt.blue, ']');
                lib_1.vt.sleep(600);
                lib_1.vt.outln(lib_1.vt.white, ' = ', lib_1.vt.bright, point.toString());
                lib_1.vt.sleep(1000);
                if (point == 7 || point == 11) {
                    lib_1.vt.sound('cheer');
                    payoff.value = 2 * amount.value;
                    lib_1.vt.outln('A natural!  You win ', payoff.carry(), '!');
                    $.player.coin.value += payoff.value + amount.value;
                    lib_1.vt.sleep(500);
                    break;
                }
                if (point == 2 || point == 3 || point == 12) {
                    lib_1.vt.sound('boo');
                    lib_1.vt.out('Crapped out!  You lose.\n');
                    lib_1.vt.sleep(500);
                    break;
                }
                lib_1.vt.cls();
                lib_1.vt.out(lib_1.vt.cyan, 'Your point to make is: ', lib_1.vt.bright, lib_1.vt.white, point.toString(), lib_1.vt.normal, '\n\n', 'Press RETURN to roll dice and try to make your point\n', 'or bet on another number for additional payoffs:\n\n', '  [2] or [12] pays 35:1\n', '  [3] or [11] pays 17:1\n', '  [4] or [10] pays 11:1\n', '  [5] or  [9] pays  8:1\n', '  [6] or  [8] pays  6:1\n', '  [7] to break pays 5:1\n');
                lib_1.vt.action('craps');
                lib_1.vt.form = {
                    'baby': {
                        cb: () => {
                            lib_1.vt.out('\n', lib_1.vt.cll);
                            if ((+lib_1.vt.entry).toString() == lib_1.vt.entry)
                                lib_1.vt.entry += 'c';
                            let side = new lib_1.Coin(0);
                            if (/=|max/i.test(lib_1.vt.entry))
                                side.value = max.value;
                            else
                                side.value = sys_1.int(new lib_1.Coin(lib_1.vt.entry).value);
                            if (side.value < 1 || side.value > $.player.coin.value || amount.value > max.value) {
                                lib_1.vt.beep();
                                side.value = 0;
                            }
                            $.player.coin.value -= side.value;
                            if (RollDice(baby, side.value))
                                return;
                            lib_1.vt.focus = 'roll';
                        }, max: 24
                    },
                    'roll': {
                        cb: () => {
                            lib_1.vt.out('\n', lib_1.vt.cll);
                            baby = sys_1.whole(lib_1.vt.entry);
                            if ($.player.coin.value > 0 && baby > 1 && baby < 13) {
                                if (max.value > $.player.coin.value)
                                    max.value = $.player.coin.value;
                                lib_1.vt.form['baby'].prompt = lib_1.vt.attr('\x1B[JBet ', lib_1.vt.white, '[', lib_1.vt.uline, 'MAX', lib_1.vt.nouline, '=', max.carry(), ']? ');
                                lib_1.vt.focus = 'baby';
                                return;
                            }
                            else
                                baby = 0;
                            if (RollDice())
                                return;
                            lib_1.vt.refocus();
                        }, row: 13, col: 1, prompt: lib_1.vt.attr('Roll dice: ', lib_1.vt.cll), max: 2
                    }
                };
                let baby = 0;
                lib_1.vt.focus = 'roll';
                return;
            case 'H':
                lib_1.vt.outln(lib_1.vt.blue, lib_1.vt.bright, '\nHigh Stakes Draw Payouts:\n');
                lib_1.vt.outln(lib_1.vt.green, lib_1.vt.bright, 'Aces are low and all face cards are the same as 10s');
                lib_1.vt.outln(lib_1.vt.green, 'If your card is higher: winnings are based on how low your pick is');
                lib_1.vt.outln(lib_1.vt.green, '                        and double that if Dealer picks a Joker');
                lib_1.vt.outln(lib_1.vt.cyan, lib_1.vt.bright, 'Matching cards must draw again; unless Jokers which payout ', lib_1.vt.white, '1000:1');
                shuffle(true);
                lib_1.vt.action('list');
                lib_1.vt.form = {
                    'pick': {
                        cb: () => {
                            let dealer;
                            let pick = +lib_1.vt.entry;
                            if (isNaN(pick) || pick < 1 || pick > deck.length) {
                                lib_1.vt.out(' ?? ');
                                lib_1.vt.refocus();
                                return;
                            }
                            let mine = deck.splice(--pick, 1)[0];
                            lib_1.vt.sound(card[mine].value > 0 ? 'click' : 'boom');
                            lib_1.vt.out(' - ');
                            if ($.player.emulation == 'XT')
                                lib_1.vt.out(card[mine].uni);
                            lib_1.vt.out(lib_1.vt.bright, lib_1.vt.red, ' [', lib_1.vt.white, card[mine].face, lib_1.vt.red, ']');
                            if ($.player.emulation == 'XT')
                                lib_1.vt.out(card[mine].suit);
                            lib_1.vt.outln(-600);
                            dealer = sys_1.dice(deck.length);
                            lib_1.vt.out('Dealer picks card #', dealer.toString());
                            let house = deck.splice(--dealer, 1)[0];
                            lib_1.vt.sound(card[house].value > 0 ? 'click' : 'boom');
                            lib_1.vt.out(' - ');
                            if ($.player.emulation == 'XT')
                                lib_1.vt.out(card[house].uni);
                            lib_1.vt.out(lib_1.vt.bright, lib_1.vt.red, ' [', lib_1.vt.white, card[house].face, lib_1.vt.red, ']');
                            if ($.player.emulation == 'XT')
                                lib_1.vt.out(card[house].suit);
                            lib_1.vt.outln('\n', -600);
                            if (card[mine].value > card[house].value) {
                                lib_1.vt.sound('cheer');
                                payoff.value = amount.value * sys_1.int((11 - card[mine].value) / 4 + 1);
                                if (card[house].value < 0)
                                    payoff.value *= 2;
                                lib_1.vt.outln('You win ', payoff.carry(), '!');
                                $.player.coin.value += payoff.value + amount.value;
                            }
                            else if (card[mine].value < card[house].value) {
                                if (card[mine].value < 0) {
                                    lib_1.vt.sound('oops');
                                    lib_1.vt.out(lib_1.vt.yellow, 'The joke is on you ... ', -1000);
                                    lib_1.vt.sound('laugh');
                                    lib_1.vt.outln(lib_1.vt.faint, 'and you die laughing!!', -2000);
                                    $.reason = 'died laughing';
                                    lib_1.vt.hangup();
                                }
                                else {
                                    lib_1.vt.sound('boo');
                                    lib_1.vt.outln('You lose.', -500);
                                }
                            }
                            else {
                                lib_1.vt.out('You match ... ', -500);
                                if (card[house].value < 0) {
                                    payoff.value = amount.value * 1000;
                                    lib_1.vt.outln('and win ', payoff.carry(), '!');
                                    lib_1.vt.sound('cheer');
                                }
                                else {
                                    lib_1.vt.outln(`it's a push. `, -500, ' You must pick again.', -500);
                                    lib_1.vt.refocus(`Pick a card (1-${deck.length})? `);
                                    return;
                                }
                                $.player.coin.value += payoff.value + amount.value;
                            }
                            menu();
                        }, prompt: `Pick a card (1-54)? `, max: 2
                    }
                };
                lib_1.vt.focus = 'pick';
                return;
            case 'K':
                let picks = [];
                lib_1.vt.action('list');
                lib_1.vt.form = {
                    'point': {
                        cb: () => {
                            point = +lib_1.vt.entry;
                            if (point < 1 || point > 10) {
                                menu();
                                return;
                            }
                            lib_1.vt.out(lib_1.vt.green, `\n\nKENO PAYOUT for a ${point} spot game:\n\n`);
                            lib_1.vt.out(lib_1.vt.bright, 'MATCH     PRIZE\n', lib_1.vt.cyan);
                            switch (point) {
                                case 1:
                                    lib_1.vt.out('   1         $1\n');
                                    break;
                                case 2:
                                    lib_1.vt.out('   2         $9\n');
                                    break;
                                case 3:
                                    lib_1.vt.out('   3        $20\n');
                                    lib_1.vt.out('   2          2\n');
                                    break;
                                case 4:
                                    lib_1.vt.out('   4        $50\n');
                                    lib_1.vt.out('   3          5\n');
                                    lib_1.vt.out('   2          1\n');
                                    break;
                                case 5:
                                    lib_1.vt.out('   5       $400\n');
                                    lib_1.vt.out('   4         10\n');
                                    lib_1.vt.out('   3          2\n');
                                    break;
                                case 6:
                                    lib_1.vt.out('   6      $1000\n');
                                    lib_1.vt.out('   5         50\n');
                                    lib_1.vt.out('   4          5\n');
                                    lib_1.vt.out('   3          1\n');
                                    break;
                                case 7:
                                    lib_1.vt.out('   7      $4000\n');
                                    lib_1.vt.out('   6         75\n');
                                    lib_1.vt.out('   5         15\n');
                                    lib_1.vt.out('   4          2\n');
                                    lib_1.vt.out('   3          1\n');
                                    break;
                                case 8:
                                    lib_1.vt.out('   8      10000\n');
                                    lib_1.vt.out('   7        500\n');
                                    lib_1.vt.out('   6         40\n');
                                    lib_1.vt.out('   5         10\n');
                                    lib_1.vt.out('   4          2\n');
                                    break;
                                case 9:
                                    lib_1.vt.out('   9     $25000\n');
                                    lib_1.vt.out('   8       2500\n');
                                    lib_1.vt.out('   7        100\n');
                                    lib_1.vt.out('   6         20\n');
                                    lib_1.vt.out('   5          5\n');
                                    lib_1.vt.out('   4          1\n');
                                    break;
                                case 10:
                                    lib_1.vt.out('  10    $100000\n');
                                    lib_1.vt.out('   9       4000\n');
                                    lib_1.vt.out('   8        400\n');
                                    lib_1.vt.out('   7         25\n');
                                    lib_1.vt.out('   6         10\n');
                                    lib_1.vt.out('   5          2\n');
                                    lib_1.vt.out(' none         5\n');
                                    break;
                            }
                            lib_1.vt.out(lib_1.vt.reset, '\nodds of winning a prize in this game are 1:', `${[4, 16.6, 6.55, 3.86, 10.33, 6.19, 4.22, 9.79, 6.55, 9.04][point - 1]}\n`);
                            lib_1.vt.focus = 'pick';
                        }, prompt: 'How many numbers (1-10)? ', max: 2
                    },
                    'pick': {
                        cb: () => {
                            let pick = +lib_1.vt.entry;
                            if (lib_1.vt.entry == '') {
                                do {
                                    pick = sys_1.dice(80);
                                } while (picks.indexOf(pick) >= 0);
                                lib_1.vt.out(`${pick}`);
                            }
                            if (pick < 1 || pick > 80) {
                                lib_1.vt.beep();
                                lib_1.vt.refocus();
                                return;
                            }
                            if (picks.indexOf(pick) >= 0) {
                                lib_1.vt.beep();
                                lib_1.vt.refocus();
                                return;
                            }
                            lib_1.vt.sound('click');
                            picks.push(pick);
                            if (picks.length == point) {
                                lib_1.vt.out('\n\n', lib_1.vt.bright, lib_1.vt.yellow, 'Here comes those lucky numbers!\n', lib_1.vt.reset);
                                lib_1.vt.sleep(500);
                                let balls = [];
                                let hits = 0;
                                payoff.value = 0;
                                for (let i = 0; i < 20; i++) {
                                    if (i % 5 == 0)
                                        lib_1.vt.out('\n');
                                    do {
                                        pick = sys_1.dice(80);
                                    } while (balls.indexOf(pick) >= 0);
                                    if (picks.indexOf(pick) >= 0) {
                                        hits++;
                                        lib_1.vt.sound('max');
                                        lib_1.vt.out(' *', lib_1.vt.bright, lib_1.vt.blue, '[', lib_1.vt.yellow, sys_1.sprintf('%02d', pick), lib_1.vt.blue, ']', lib_1.vt.reset, '* ');
                                    }
                                    else {
                                        lib_1.vt.out(lib_1.vt.faint, lib_1.vt.cyan, '  [', lib_1.vt.normal, sys_1.sprintf('%02d', pick), lib_1.vt.faint, ']  ', lib_1.vt.reset);
                                    }
                                    lib_1.vt.sleep(250);
                                }
                                lib_1.vt.out('\n');
                                switch (point) {
                                    case 1:
                                        if (hits == 1)
                                            payoff.value = 2 * amount.value;
                                        break;
                                    case 2:
                                        if (hits == 2)
                                            payoff.value = 9 * amount.value;
                                        break;
                                    case 3:
                                        if (hits == 3)
                                            payoff.value = 20 * amount.value;
                                        if (hits == 2)
                                            payoff.value = 2 * amount.value;
                                        break;
                                    case 4:
                                        if (hits == 4)
                                            payoff.value = 50 * amount.value;
                                        if (hits == 3)
                                            payoff.value = 5 * amount.value;
                                        if (hits == 2)
                                            payoff.value = 1 * amount.value;
                                        break;
                                    case 5:
                                        if (hits == 5)
                                            payoff.value = 400 * amount.value;
                                        if (hits == 4)
                                            payoff.value = 10 * amount.value;
                                        if (hits == 3)
                                            payoff.value = 2 * amount.value;
                                        break;
                                    case 6:
                                        if (hits == 6)
                                            payoff.value = 1000 * amount.value;
                                        if (hits == 5)
                                            payoff.value = 50 * amount.value;
                                        if (hits == 4)
                                            payoff.value = 5 * amount.value;
                                        if (hits == 3)
                                            payoff.value = 1 * amount.value;
                                        break;
                                    case 7:
                                        if (hits == 7)
                                            payoff.value = 4000 * amount.value;
                                        if (hits == 6)
                                            payoff.value = 75 * amount.value;
                                        if (hits == 5)
                                            payoff.value = 15 * amount.value;
                                        if (hits == 4)
                                            payoff.value = 2 * amount.value;
                                        if (hits == 3)
                                            payoff.value = 1 * amount.value;
                                        break;
                                    case 8:
                                        if (hits == 8)
                                            payoff.value = 10000 * amount.value;
                                        if (hits == 7)
                                            payoff.value = 500 * amount.value;
                                        if (hits == 6)
                                            payoff.value = 40 * amount.value;
                                        if (hits == 5)
                                            payoff.value = 10 * amount.value;
                                        if (hits == 4)
                                            payoff.value = 2 * amount.value;
                                        break;
                                    case 9:
                                        if (hits == 9)
                                            payoff.value = 25000 * amount.value;
                                        if (hits == 8)
                                            payoff.value = 2500 * amount.value;
                                        if (hits == 7)
                                            payoff.value = 100 * amount.value;
                                        if (hits == 6)
                                            payoff.value = 20 * amount.value;
                                        if (hits == 5)
                                            payoff.value = 5 * amount.value;
                                        if (hits == 4)
                                            payoff.value = 1 * amount.value;
                                        break;
                                    case 10:
                                        if (hits == 10)
                                            payoff.value = 100000 * amount.value;
                                        if (hits == 9)
                                            payoff.value = 4000 * amount.value;
                                        if (hits == 8)
                                            payoff.value = 400 * amount.value;
                                        if (hits == 7)
                                            payoff.value = 25 * amount.value;
                                        if (hits == 6)
                                            payoff.value = 10 * amount.value;
                                        if (hits == 5)
                                            payoff.value = 2 * amount.value;
                                        if (hits == 0)
                                            payoff.value = 5 * amount.value;
                                        break;
                                }
                                if (payoff.value) {
                                    lib_1.vt.sound('cheer');
                                    lib_1.vt.outln('\nYou win ', payoff.carry(), '!');
                                    $.player.coin.value += payoff.value;
                                    lib_1.vt.sleep(500);
                                }
                                else
                                    lib_1.vt.sound('boo');
                                menu();
                            }
                            else {
                                lib_1.vt.refocus(`Pick #${picks.length + 1} [1-80]: `);
                            }
                        }, prompt: 'Pick #1 [1-80]: ', max: 2
                    }
                };
                lib_1.vt.focus = 'point';
                return;
            case 'S':
                lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.blue, '\nSlot Machine Payout Line:\n');
                if ($.player.emulation == 'XT') {
                    lib_1.vt.out(lib_1.vt.red, ' any 2  ', lib_1.vt.normal, ' 🍒🍒 ', lib_1.vt.reset, '    2x     ', lib_1.vt.yellow, 'Orange  ', lib_1.vt.normal, '🍊🍊🍊', lib_1.vt.reset, '    50x\n');
                    lib_1.vt.out(lib_1.vt.red, 'Cherry  ', lib_1.vt.normal, '🍒🍒🍒', lib_1.vt.reset, '    5x     ', lib_1.vt.bright, lib_1.vt.yellow, '<Bell>  ', '🔔🔔🔔', lib_1.vt.reset, '   100x\n');
                    lib_1.vt.out(lib_1.vt.magenta, 'Grapes  ', lib_1.vt.normal, '🍇🍇🍇', lib_1.vt.reset, '   10x     ', lib_1.vt.green, '=Luck=  ', lib_1.vt.normal, '🍀🍀🍀', lib_1.vt.reset, '   400x\n');
                    lib_1.vt.out(lib_1.vt.bright, lib_1.vt.green, ':Kiwi:  ', '🥝🥝🥝', lib_1.vt.reset, '   20x     ', lib_1.vt.cyan, '*Wild*  ', lib_1.vt.normal, '💎💎💎', lib_1.vt.reset, '   500x\n');
                    lib_1.vt.out(lib_1.vt.bright, lib_1.vt.uline, lib_1.vt.red, 'Exacta', lib_1.vt.nouline, '  ', lib_1.vt.normal, '🍒🍒💣', lib_1.vt.reset, '   25x     ', lib_1.vt.faint, '@Bomb@  ', lib_1.vt.normal, '💣💣💣', lib_1.vt.reset, '    💀\n');
                }
                else {
                    lib_1.vt.out('Any 2 ', lib_1.vt.red, 'Cherry', lib_1.vt.reset, '  2x     3 ', lib_1.vt.yellow, 'Orange  ', lib_1.vt.reset, '   50x\n');
                    lib_1.vt.out('3 ', lib_1.vt.red, 'Cherry', lib_1.vt.reset, '      5x     3 ', lib_1.vt.bright, lib_1.vt.yellow, '<Bell>  ', lib_1.vt.reset, '  100x\n');
                    lib_1.vt.out('3 ', lib_1.vt.magenta, 'Grapes', lib_1.vt.reset, '     10x     3 ', lib_1.vt.green, '=Luck=  ', lib_1.vt.reset, '  400x\n');
                    lib_1.vt.out('3 ', lib_1.vt.bright, lib_1.vt.green, ':Kiwi:', lib_1.vt.reset, '     20x     3 ', lib_1.vt.cyan, '*Wild*  ', lib_1.vt.reset, '  500x\n');
                    lib_1.vt.out('3 ', lib_1.vt.faint, '@Bomb@', lib_1.vt.reset, '     Die\n');
                }
                lib_1.vt.out('\nYou pull its arm and the wheels spin ... ');
                lib_1.vt.sound('click', 4);
                let bandit = [sys_1.dice(16) % 16, sys_1.dice(16) % 16, sys_1.dice(16) % 16];
                for (let i = 0; i < 3; i++) {
                    for (let spin = sys_1.dice(16) + 16; spin; spin--) {
                        lib_1.vt.out('-\\|/'[spin % 4], '\x08');
                        lib_1.vt.sleep(20);
                        bandit[i] = ++bandit[i] % 16;
                    }
                    lib_1.vt.beep();
                    let face = dial[i][bandit[i]];
                    lib_1.vt.out(lib_1.vt.blue, '[', lib_1.vt.attr(slot[face].attr, slot[face].color), face);
                    if ($.player.emulation == 'XT')
                        lib_1.vt.out(` ${slot[face].uni}`);
                    lib_1.vt.out(lib_1.vt.reset, lib_1.vt.blue, '] ');
                }
                lib_1.vt.out(lib_1.vt.reset, '\n\n');
                let face = [dial[0][bandit[0]], dial[1][bandit[1]], dial[2][bandit[2]]];
                payoff.value = 0;
                if (face[0] == '*WILD*' && face[1] == '*WILD*' && face[2] == '*WILD*') {
                    payoff.value = 500 * amount.value;
                    for (let i = 0; i < 8; i++) {
                        lib_1.vt.beep();
                        for (let j = 0; j < 8; j++) {
                            lib_1.vt.out((i + j) % 2 ? lib_1.vt.blink : lib_1.vt.noblink);
                            lib_1.vt.out((i + j) % 8 + 30, 'YOU WIN! ');
                            lib_1.vt.out(10);
                        }
                        lib_1.vt.outln();
                    }
                    CherryBomb();
                    lib_1.vt.sound('wild', 50);
                }
                else if ((face[0] == '@BOMB@' || face[0] == '*WILD*')
                    && (face[1] == '@BOMB@' || face[1] == '*WILD*')
                    && (face[2] == '@BOMB@' || face[2] == '*WILD*')) {
                    $.online.hp = 0;
                    $.reason = 'defeated by a one-armed bandit';
                    if ($.player.emulation == 'XT')
                        lib_1.vt.out('💀 ');
                    lib_1.vt.sound('boom', 6);
                    lib_1.vt.outln(lib_1.vt.faint, 'You die.');
                    lib_1.vt.sleep(600);
                    lib_1.vt.hangup();
                    return;
                }
                else if ((face[0] == '=LUCK=' || face[0] == '*WILD*')
                    && (face[1] == '=LUCK=' || face[1] == '*WILD*')
                    && (face[2] == '=LUCK=' || face[2] == '*WILD*')) {
                    payoff.value = 400 * amount.value;
                    for (let i = 0; i < 4; i++) {
                        lib_1.vt.beep();
                        for (let j = 0; j < 8; j++) {
                            lib_1.vt.out((i + j) % 8 + 30, 'YOU WIN! ');
                            lib_1.vt.out(15);
                        }
                        lib_1.vt.outln();
                    }
                    CherryBomb();
                    lib_1.vt.sound('wild', 50);
                }
                else if ((face[0] == '<BELL>' || face[0] == '*WILD*')
                    && (face[1] == '<BELL>' || face[1] == '*WILD*')
                    && (face[2] == '<BELL>' || face[2] == '*WILD*')) {
                    payoff.value = 100 * amount.value;
                    for (let i = 0; i < 8; i++) {
                        lib_1.vt.beep();
                        lib_1.vt.out(i % 8 + 30, 'YOU WIN! ');
                        lib_1.vt.out(20);
                    }
                    lib_1.vt.outln();
                    CherryBomb();
                }
                else if ((face[0] == 'ORANGE' || face[0] == '*WILD*')
                    && (face[1] == 'ORANGE' || face[1] == '*WILD*')
                    && (face[2] == 'ORANGE' || face[2] == '*WILD*')) {
                    payoff.value = 50 * amount.value;
                    lib_1.vt.beep();
                    lib_1.vt.music('wild');
                    lib_1.vt.sleep(2500);
                }
                else if (face[0] == 'CHERRY' && face[1] == 'CHERRY' && face[2] == '@BOMB@') {
                    payoff.value = 25 * amount.value;
                    CherryBomb();
                }
                else if ((face[0] == ':KIWI:' || face[0] == '*WILD*')
                    && (face[1] == ':KIWI:' || face[1] == '*WILD*')
                    && (face[2] == ':KIWI:' || face[2] == '*WILD*')) {
                    payoff.value = 20 * amount.value;
                }
                else if ((face[0] == 'GRAPES' || face[0] == '*WILD*')
                    && (face[1] == 'GRAPES' || face[1] == '*WILD*')
                    && (face[2] == 'GRAPES' || face[2] == '*WILD*')) {
                    payoff.value = 10 * amount.value;
                }
                else if ((face[0] == 'CHERRY' || face[0] == '*WILD*')
                    && (face[1] == 'CHERRY' || face[1] == '*WILD*')
                    && (face[2] == 'CHERRY' || face[2] == '*WILD*')) {
                    payoff.value = 5 * amount.value;
                }
                else if ((((face[0] == 'CHERRY' || face[0] == '*WILD*')
                    && ((face[1] == 'CHERRY' || face[1] == '*WILD*') || (face[2] == 'CHERRY' || face[2] == '*WILD*')))
                    || ((face[1] == 'CHERRY' || face[1] == '*WILD*') && (face[2] == 'CHERRY' || face[2] == '*WILD*')))) {
                    payoff.value = 2 * amount.value;
                    if (face[0] == '@BOMB@' || face[1] == '@BOMB@' || face[2] == '@BOMB@')
                        CherryBomb();
                }
                if (payoff.value) {
                    lib_1.vt.sound('cheer');
                    lib_1.vt.outln('You win ', payoff.carry(), '!');
                    $.player.coin.value += payoff.value;
                    lib_1.vt.sleep(500);
                }
                else
                    lib_1.vt.sound('boo');
        }
        menu();
        function CherryBomb() {
            if ($.player.emulation == 'XT') {
                lib_1.vt.music('cherry');
                lib_1.vt.out(lib_1.vt.red);
                for (let i = 0; i < 6; i++) {
                    lib_1.vt.out(' ', lib_1.vt.faint);
                    for (let j = 0; j < i; j++)
                        lib_1.vt.out('🍒');
                    lib_1.vt.out(lib_1.vt.normal);
                    lib_1.vt.out('🍒\r');
                    lib_1.vt.sleep(250);
                }
                lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.red, '🍒 CHERRY 🍒 ');
                for (let i = 0; i < 4; i++) {
                    lib_1.vt.out(' ', lib_1.vt.faint);
                    for (let j = 0; j < i; j++)
                        lib_1.vt.out('💣');
                    lib_1.vt.out(lib_1.vt.normal);
                    lib_1.vt.out('💣\r');
                    lib_1.vt.sleep(400);
                }
                lib_1.vt.outln(lib_1.vt.bright, lib_1.vt.black, '💣 BOMB!! 💣 ');
            }
            else {
                lib_1.vt.beep();
                lib_1.vt.out(lib_1.vt.bright, lib_1.vt.red, 'Cherry ', lib_1.vt.black, 'BOMB', lib_1.vt.reset, '!!\n');
            }
        }
        function ShowHand(who, hand) {
            let value = 0;
            ace = 0;
            lib_1.vt.out(who ? lib_1.vt.bright : lib_1.vt.reset, lib_1.vt.green, ['Dealer', 'Player'][who], `'s hand:`, lib_1.vt.white);
            if ($.player.emulation == 'XT')
                for (let i = 0; i < hand.length; i++)
                    lib_1.vt.out(' ', card[hand[i]].uni);
            lib_1.vt.out(' '.repeat(12 - 2 * hand.length));
            for (let i = 0; i < hand.length; i++) {
                lib_1.vt.out(lib_1.vt.red, '[', lib_1.vt.white, card[hand[i]].face, lib_1.vt.red, '] ');
                value += card[hand[i]].value;
                if (card[hand[i]].value == 1)
                    ace++;
            }
            for (let i = 0; i < ace && value + 10 < 22; i++)
                value += 10;
            lib_1.vt.outln(lib_1.vt.reset, '= ', lib_1.vt.bright, who ? lib_1.vt.cyan : lib_1.vt.green, `${value}`);
            lib_1.vt.sleep(500);
            return (value);
        }
        function RollDice(baby = 0, side = 0) {
            let d1 = sys_1.dice(6), d2 = sys_1.dice(6), n = sys_1.dice(2) + sys_1.dice(2);
            lib_1.vt.out('\x1B[J', lib_1.vt.faint);
            for (let i = 0; i < n; i++) {
                lib_1.vt.sound('click');
                lib_1.vt.out('.');
            }
            lib_1.vt.out(lib_1.vt.normal, lib_1.vt.blue, ' [', lib_1.vt.bright, lib_1.vt.cyan, d1.toString(), lib_1.vt.normal, lib_1.vt.blue, '] [', lib_1.vt.bright, lib_1.vt.cyan, d2.toString(), lib_1.vt.normal, lib_1.vt.blue, ']');
            lib_1.vt.beep();
            lib_1.vt.outln(lib_1.vt.white, ' = ', lib_1.vt.bright, (d1 + d2).toString());
            if (baby && d1 + d2 !== baby) {
                lib_1.vt.sound('boo');
                lib_1.vt.outln('You lose on the side bet.');
            }
            if (d1 + d2 == baby) {
                baby = (baby == 2 || baby == 12) ? 35
                    : (baby == 3 || baby == 11) ? 17
                        : (baby == 4 || baby == 10) ? 11
                            : (baby == 5 || baby == 9) ? 8
                                : (baby == 6 || baby == 8) ? 6
                                    : 5;
                lib_1.vt.sound('cheer');
                payoff.value = side * baby;
                lib_1.vt.outln('You make your side bet!  You win ', payoff.carry(), '!');
                $.player.coin.value += payoff.value;
            }
            lib_1.vt.sleep(1000);
            if (d1 + d2 == 7) {
                lib_1.vt.sound('boo');
                lib_1.vt.out('Crapped out!  You lose on your point.\n');
                lib_1.vt.sleep(500);
                menu();
                return true;
            }
            if (d1 + d2 == point) {
                lib_1.vt.sound('cheer');
                payoff.value = amount.value;
                lib_1.vt.outln('You make your point!  You win ', payoff.carry(), '!');
                $.player.coin.value += payoff.value + amount.value;
                lib_1.vt.sleep(500);
                menu();
                return true;
            }
            return false;
        }
    }
    function shuffle(jokers = false) {
        deck = [0,
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
            14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
            27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
            40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52,
            53];
        lib_1.vt.out(lib_1.vt.faint, '\nShuffling a new deck ');
        lib_1.vt.sleep(250);
        let cut = sys_1.dice(6) + 4;
        for (let n = 0; n < cut; n++) {
            if (jokers)
                for (let i = 0; i < 54; i++) {
                    let j = sys_1.dice(54) - 1;
                    [deck[i], deck[j]] = [deck[j], deck[i]];
                }
            else
                for (let i = 1; i < 53; i++) {
                    let j = sys_1.dice(52);
                    [deck[i], deck[j]] = [deck[j], deck[i]];
                }
            lib_1.vt.out('.');
            lib_1.vt.sleep(20);
        }
        lib_1.vt.outln(' Ok.');
        lib_1.vt.sleep(250);
        pile = 1;
    }
})(Casino || (Casino = {}));
module.exports = Casino;
