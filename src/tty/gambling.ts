/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  GAMBLING authored by: Robert Hurst <theflyingape@gmail.com>              *
\*****************************************************************************/

import { dice, int, money, sprintf, vt, whole } from '../sys'
import $ = require('../runtime')
import { Coin, RealEstate, Security } from '../items'
import { action, bracket, clear, display, music, sound } from '../io'
import { tradein } from '../lib'
import { PC } from '../pc'

module Gambling {

    let casino: choices = {
        'B': { description: 'Blackjack' },
        'C': { description: 'Craps' },
        'H': { description: 'High Stakes Draw' },
        'K': { description: 'Keno Lottery' },
        'S': { description: 'Cherry Bomb Slots' }
    }
    /*
        'G': { description:'Greyhound race' },
        'R': { description:'Roulette' },
    */

    let game: string
    let max = new Coin(0)
    let payoff = new Coin(0)
    let point: number
    let sting: boolean = true

    const card: cards[] = [
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
    ]
    let deck: number[]
    let pile: number

    interface slot {
        attr: number
        color: number
        uni: string
    }
    interface slots {
        [key: string]: slot
    }
    const slot: slots = {
        'CHERRY': { attr: vt.normal, color: vt.red, uni: '🍒' },
        'GRAPES': { attr: vt.normal, color: vt.magenta, uni: '🍇' },
        ':KIWI:': { attr: vt.bright, color: vt.green, uni: '🥝' },
        'ORANGE': { attr: vt.normal, color: vt.yellow, uni: '🍊' },
        '<BELL>': { attr: vt.bright, color: vt.yellow, uni: '🔔' },
        '=LUCK=': { attr: vt.normal, color: vt.green, uni: '🍀' },
        '*WILD*': { attr: vt.normal, color: vt.cyan, uni: '💎' },
        '@BOMB@': { attr: vt.faint, color: vt.white, uni: '💣' }
    }

    const dial: string[][] = [
        ['=LUCK=', 'GRAPES', 'CHERRY', '<BELL>', ':KIWI:', 'GRAPES', '@BOMB@', 'CHERRY', 'ORANGE', ':KIWI:', '*WILD*', 'GRAPES', 'CHERRY', '<BELL>', ':KIWI:', 'CHERRY'],
        ['ORANGE', '=LUCK=', 'CHERRY', 'ORANGE', 'GRAPES', 'ORANGE', 'CHERRY', '@BOMB@', '<BELL>', 'ORANGE', 'CHERRY', 'GRAPES', ':KIWI:', 'ORANGE', '*WILD*', 'CHERRY'],
        ['<BELL>', '*WILD*', ':KIWI:', 'CHERRY', 'ORANGE', '@BOMB@', 'GRAPES', ':KIWI:', 'CHERRY', '=LUCK=', 'GRAPES', 'CHERRY', ':KIWI:', 'GRAPES', ':KIWI:', 'CHERRY']
    ]

    export function menu(suppress = true) {
        if ($.online.altered) PC.saveUser($.online)
        if ($.reason) vt.hangup()

        action('casino')
        vt.form = {
            'menu': { cb: choice, cancel: 'q', enter: '?', eol: false }
        }
        vt.form['menu'].prompt = display('casino', vt.Green, vt.green, suppress, casino)
        vt.focus = 'menu'
        max.value = tradein(new Coin(RealEstate.name[$.player.realestate].value).value)
        max.value += tradein(new Coin(Security.name[$.player.security].value).value)
        max.value = int(max.value / 10)
        max.value += tradein(($.player.level * money($.player.level)))
        if (max.value > 1e+16) max.value = 1e+16
        max = new Coin(max.carry(1, true))
    }

    function choice() {
        if ((game = vt.entry.toUpperCase()) == 'Q') {
            vt.outln()
            require('./main').menu($.player.expert)
            return
        }

        if (casino[game]?.description) {
            vt.outln(' - ', casino[game].description)
            if ($.access.roleplay) {
                if (sting) {
                    music('casino')
                    sting = false
                }
                Bet()
                return
            }
        }
        menu(false)
    }

    function Bet() {
        if (max.value > $.player.coin.value)
            max.value = $.player.coin.value

        action('wager')
        vt.form = {
            'coin': { cb: amount, max: 6 }
        }
        vt.form['coin'].prompt = vt.attr('Bet ', vt.white, '[', vt.uline, 'MAX', vt.nouline, '=', max.carry(), ']? ')
        vt.focus = 'coin'
    }

    function amount() {
        let ace: number = 0
        vt.outln()

        if ((+vt.entry).toString() == vt.entry) vt.entry += 'c'
        let amount = new Coin(0)
        if (/=|max/i.test(vt.entry))
            amount.value = max.value
        else
            amount.value = int(new Coin(vt.entry).value)
        if (amount.value < 1 || amount.value > $.player.coin.value || amount.value > max.value) {
            vt.beep()
            menu($.player.expert)
            return
        }

        $.player.coin.value -= amount.value

        switch (game) {
            case 'B':
                shuffle()

                let player: number[] = []
                let myhand: number
                let dealer: number[] = []
                let value: number

                player.push(deck[pile++])
                dealer.push(deck[pile++])
                player.push(deck[pile++])
                dealer.push(deck[pile++])
                vt.out(vt.green, `\nDealer's hand:`)
                if ($.player.emulation == 'XT') vt.out(vt.white, ' 🂠 ', card[dealer[1]].uni)
                vt.out(' '.repeat(8))
                vt.outln(vt.red, '[', vt.white, 'DOWN', vt.red, '] [', vt.white, card[dealer[1]].face, vt.red, ']')
                myhand = ShowHand(1, player)

                if (myhand == 21) {
                    sound('cheer')
                    payoff.value = 2 * amount.value
                    vt.outln(vt.bright, vt.cyan, '\nBlackjack!!', -1000)

                    value = ShowHand(0, dealer)
                    if (value == 21) {
                        sound('boo')
                        vt.outln(`\nDealer has Blackjack!  You're a loser.`, -1000)
                    }
                    else {
                        vt.outln('\nYou win ', payoff.carry(), '!')
                        $.player.coin.value += payoff.value + amount.value
                    }
                    break
                }

                action('blackjack')
                vt.form = {
                    'draw': {
                        cb: () => {
                            vt.outln('\n')
                            switch (vt.entry.toUpperCase()) {
                                case 'D':
                                    $.player.coin.value -= amount.value
                                    amount.value *= 2
                                    payoff.value = amount.value
                                    vt.entry = 'S'

                                case 'H':
                                    player.push(deck[pile++])
                                    myhand = ShowHand(1, player)
                                    if (myhand > 21) {
                                        vt.outln('You bust!')
                                        vt.entry = 'S'
                                        amount.value = 0
                                    }
                                    else if (player.length == 5) {
                                        sound('cheer')
                                        payoff.value = 2 * amount.value
                                        vt.outln('Five card charley!  You win ', payoff.carry(), '!')
                                        $.player.coin.value += payoff.value + amount.value
                                        menu()
                                        return
                                    }
                                    else if (myhand == 21)
                                        vt.entry = 'S'
                                    else if (vt.entry !== 'S') {
                                        vt.refocus()
                                        return
                                    }
                                    vt.outln()
                                    break
                            }
                            if (/S/i.test(vt.entry)) {
                                while ((value = ShowHand(0, dealer)) < 17 && amount.value) {
                                    dealer.push(deck[pile++])
                                    sound('click', 8)
                                }
                                vt.outln()
                                if (amount.value) {
                                    if (value > 21) {
                                        sound('cheer')
                                        payoff.value = amount.value
                                        vt.outln('Dealer breaks!  You win ', payoff.carry(), '!')
                                        $.player.coin.value += payoff.value + amount.value
                                    }
                                    else if (myhand > value) {
                                        sound('cheer')
                                        payoff.value = amount.value
                                        vt.outln('You win ', payoff.carry(), '!')
                                        $.player.coin.value += payoff.value + amount.value
                                    }
                                    else if (myhand < value) {
                                        sound('boo')
                                        vt.outln('You lose.')
                                    }
                                    else {
                                        vt.outln(`You tie.  It's a push.`)
                                        $.player.coin.value += amount.value
                                    }
                                }
                                menu()
                            }
                        }, cancel: 'S', eol: false, max: 1
                    }
                }
                vt.form['draw'].prompt = vt.attr(bracket('H', false), vt.cyan, 'it, ',
                    bracket('S', false), vt.cyan, 'tand')
                vt.form['draw'].match = /H|S/i
                if ($.player.coin.value >= amount.value && (ace > 0 || myhand < 12)) {
                    vt.form['draw'].prompt += vt.attr(', ', bracket('D', false), vt.cyan, 'ouble down')
                    vt.form['draw'].match = /D|H|S/i
                }
                vt.form['draw'].prompt += ': '
                vt.focus = 'draw'
                return

            case 'C':
                vt.out('Rolling dice for your point ', vt.faint)
                vt.sleep(100)
                let d1 = dice(6), d2 = dice(6)
                for (let i = 0; i < d1 + 1; i++) {
                    sound('click')
                    vt.out('.')
                }
                vt.sleep(100)
                point = d1 + d2
                vt.out(vt.normal, vt.blue, '[',
                    vt.bright, vt.cyan, d1.toString(),
                    vt.normal, vt.blue, '] [',
                    vt.bright, vt.cyan, d2.toString(),
                    vt.normal, vt.blue, ']')
                vt.sleep(600)
                vt.outln(vt.white, ' = ', vt.bright, point.toString())
                vt.sleep(1000)
                if (point == 7 || point == 11) {
                    sound('cheer')
                    payoff.value = 2 * amount.value
                    vt.outln('A natural!  You win ', payoff.carry(), '!')
                    $.player.coin.value += payoff.value + amount.value
                    vt.sleep(500)
                    break
                }
                if (point == 2 || point == 3 || point == 12) {
                    sound('boo')
                    vt.out('Crapped out!  You lose.\n')
                    vt.sleep(500)
                    break
                }

                clear()
                vt.out(vt.cyan, 'Your point to make is: ', vt.bright, vt.white, point.toString(),
                    vt.normal, '\n\n',
                    'Press RETURN to roll dice and try to make your point\n',
                    'or bet on another number for additional payoffs:\n\n',
                    '  [2] or [12] pays 35:1\n',
                    '  [3] or [11] pays 17:1\n',
                    '  [4] or [10] pays 11:1\n',
                    '  [5] or  [9] pays  8:1\n',
                    '  [6] or  [8] pays  6:1\n',
                    '  [7] to break pays 5:1\n'
                )

                action('craps')
                vt.form = {
                    'baby': {
                        cb: () => {
                            vt.out('\n', vt.cll)
                            if ((+vt.entry).toString() == vt.entry) vt.entry += 'c'
                            let side = new Coin(0)
                            if (/=|max/i.test(vt.entry))
                                side.value = max.value
                            else
                                side.value = int(new Coin(vt.entry).value)
                            if (side.value < 1 || side.value > $.player.coin.value || amount.value > max.value) {
                                vt.beep()
                                side.value = 0
                            }
                            $.player.coin.value -= side.value
                            if (RollDice(baby, side.value)) return
                            vt.focus = 'roll'
                        }, max: 24
                    },
                    'roll': {
                        cb: () => {
                            vt.out('\n', vt.cll)
                            baby = whole(vt.entry)
                            if ($.player.coin.value > 0 && baby > 1 && baby < 13) {
                                if (max.value > $.player.coin.value)
                                    max.value = $.player.coin.value
                                vt.form['baby'].prompt = vt.attr('\x1B[JBet ', vt.white, '[', vt.uline, 'MAX', vt.nouline, '=', max.carry(), ']? ')
                                vt.focus = 'baby'
                                return
                            }
                            else
                                baby = 0
                            if (RollDice()) return
                            vt.refocus()
                        }, row: 13, col: 1, prompt: vt.attr('Roll dice: ', vt.cll), max: 2
                    }
                }
                let baby = 0
                vt.focus = 'roll'
                return

            case 'H':
                vt.outln(vt.blue, vt.bright, '\nHigh Stakes Draw Payouts:\n')
                vt.outln(vt.green, vt.bright, 'Aces are low and all face cards are the same as 10s')
                vt.outln(vt.green, 'If your card is higher: winnings are based on how low your pick is')
                vt.outln(vt.green, '                        and double that if Dealer picks a Joker')
                vt.outln(vt.cyan, vt.bright, 'Matching cards must draw again; unless Jokers which payout ', vt.white, '1000:1')
                shuffle(true)

                action('list')
                vt.form = {
                    'pick': {
                        cb: () => {
                            let dealer: number
                            let pick = +vt.entry
                            if (isNaN(pick) || pick < 1 || pick > deck.length) {
                                vt.out(' ?? ')
                                vt.refocus()
                                return
                            }
                            let mine = deck.splice(--pick, 1)[0]
                            sound(card[mine].value > 0 ? 'click' : 'boom')
                            vt.out(' - ')
                            if ($.player.emulation == 'XT') vt.out(card[mine].uni)
                            vt.out(vt.bright, vt.red, ' [', vt.white, card[mine].face, vt.red, ']')
                            if ($.player.emulation == 'XT') vt.out(card[mine].suit)
                            vt.outln(-600)

                            dealer = dice(deck.length)
                            vt.out('Dealer picks card #', dealer.toString())
                            let house = deck.splice(--dealer, 1)[0]
                            sound(card[house].value > 0 ? 'click' : 'boom')
                            vt.out(' - ')
                            if ($.player.emulation == 'XT') vt.out(card[house].uni)
                            vt.out(vt.bright, vt.red, ' [', vt.white, card[house].face, vt.red, ']')
                            if ($.player.emulation == 'XT') vt.out(card[house].suit)
                            vt.outln('\n', -600)

                            if (card[mine].value > card[house].value) {
                                sound('cheer')
                                payoff.value = amount.value * int((11 - card[mine].value) / 4 + 1)
                                if (card[house].value < 0) payoff.value *= 2
                                vt.outln('You win ', payoff.carry(), '!')
                                $.player.coin.value += payoff.value + amount.value
                            }
                            else if (card[mine].value < card[house].value) {
                                if (card[mine].value < 0) {
                                    sound('oops')
                                    vt.out(vt.yellow, 'The joke is on you ... ', -1000)
                                    sound('laugh')
                                    vt.outln(vt.faint, 'and you die laughing!!', -2000)
                                    $.reason = 'died laughing'
                                    vt.hangup()
                                }
                                else {
                                    sound('boo')
                                    vt.outln('You lose.', -500)
                                }
                            }
                            else {
                                vt.out('You match ... ', -500)
                                if (card[house].value < 0) {
                                    payoff.value = amount.value * 1000
                                    vt.outln('and win ', payoff.carry(), '!')
                                    sound('cheer')
                                }
                                else {
                                    vt.outln(`it's a push. `, -500, ' You must pick again.', -500)
                                    vt.refocus(`Pick a card (1-${deck.length})? `)
                                    return
                                }
                                $.player.coin.value += payoff.value + amount.value
                            }
                            menu()
                        }, prompt: `Pick a card (1-54)? `, max: 2
                    }
                }
                vt.focus = 'pick'
                return

            case 'K':
                let picks: number[] = []
                action('list')
                vt.form = {
                    'point': {
                        cb: () => {
                            point = +vt.entry
                            if (point < 1 || point > 10) {
                                menu()
                                return
                            }
                            vt.out(vt.green, `\n\nKENO PAYOUT for a ${point} spot game:\n\n`)
                            vt.out(vt.bright, 'MATCH     PRIZE\n', vt.cyan)
                            switch (point) {
                                case 1:
                                    vt.out('   1         $1\n')
                                    break
                                case 2:
                                    vt.out('   2         $9\n')
                                    break
                                case 3:
                                    vt.out('   3        $20\n')
                                    vt.out('   2          2\n')
                                    break
                                case 4:
                                    vt.out('   4        $50\n')
                                    vt.out('   3          5\n')
                                    vt.out('   2          1\n')
                                    break
                                case 5:
                                    vt.out('   5       $400\n')
                                    vt.out('   4         10\n')
                                    vt.out('   3          2\n')
                                    break
                                case 6:
                                    vt.out('   6      $1000\n')
                                    vt.out('   5         50\n')
                                    vt.out('   4          5\n')
                                    vt.out('   3          1\n')
                                    break
                                case 7:
                                    vt.out('   7      $4000\n')
                                    vt.out('   6         75\n')
                                    vt.out('   5         15\n')
                                    vt.out('   4          2\n')
                                    vt.out('   3          1\n')
                                    break
                                case 8:
                                    vt.out('   8      10000\n')
                                    vt.out('   7        500\n')
                                    vt.out('   6         40\n')
                                    vt.out('   5         10\n')
                                    vt.out('   4          2\n')
                                    break
                                case 9:
                                    vt.out('   9     $25000\n')
                                    vt.out('   8       2500\n')
                                    vt.out('   7        100\n')
                                    vt.out('   6         20\n')
                                    vt.out('   5          5\n')
                                    vt.out('   4          1\n')
                                    break
                                case 10:
                                    vt.out('  10    $100000\n')
                                    vt.out('   9       4000\n')
                                    vt.out('   8        400\n')
                                    vt.out('   7         25\n')
                                    vt.out('   6         10\n')
                                    vt.out('   5          2\n')
                                    vt.out(' none         5\n')
                                    break
                            }
                            vt.out(vt.reset, '\nodds of winning a prize in this game are 1:',
                                `${[4, 16.6, 6.55, 3.86, 10.33, 6.19, 4.22, 9.79, 6.55, 9.04][point - 1]}\n`)
                            vt.focus = 'pick'
                        }, prompt: 'How many numbers (1-10)? ', max: 2
                    },
                    'pick': {
                        cb: () => {
                            let pick = +vt.entry
                            if (vt.entry == '') {
                                do {
                                    pick = dice(80)
                                } while (picks.indexOf(pick) >= 0)
                                vt.out(`${pick}`)
                            }
                            if (pick < 1 || pick > 80) {
                                vt.beep()
                                vt.refocus()
                                return
                            }
                            if (picks.indexOf(pick) >= 0) {
                                vt.beep()
                                vt.refocus()
                                return
                            }
                            sound('click')
                            picks.push(pick)
                            if (picks.length == point) {
                                vt.out('\n\n', vt.bright, vt.yellow,
                                    'Here comes those lucky numbers!\n', vt.reset)
                                vt.sleep(500)

                                let balls: number[] = []
                                let hits = 0
                                payoff.value = 0

                                for (let i = 0; i < 20; i++) {
                                    if (i % 5 == 0) vt.out('\n')
                                    do {
                                        pick = dice(80)
                                    } while (balls.indexOf(pick) >= 0)
                                    if (picks.indexOf(pick) >= 0) {
                                        hits++
                                        sound('max')
                                        vt.out(' *', vt.bright, vt.blue, '[',
                                            vt.yellow, sprintf('%02d', pick),
                                            vt.blue, ']', vt.reset, '* ')
                                    }
                                    else {
                                        vt.out(vt.faint, vt.cyan, '  [',
                                            vt.normal, sprintf('%02d', pick),
                                            vt.faint, ']  ', vt.reset)
                                    }
                                    vt.sleep(250)
                                }

                                vt.out('\n')
                                switch (point) {
                                    case 1:
                                        if (hits == 1)
                                            payoff.value = 2 * amount.value
                                        break
                                    case 2:
                                        if (hits == 2)
                                            payoff.value = 9 * amount.value
                                        break
                                    case 3:
                                        if (hits == 3)
                                            payoff.value = 20 * amount.value
                                        if (hits == 2)
                                            payoff.value = 2 * amount.value
                                        break
                                    case 4:
                                        if (hits == 4)
                                            payoff.value = 50 * amount.value
                                        if (hits == 3)
                                            payoff.value = 5 * amount.value
                                        if (hits == 2)
                                            payoff.value = 1 * amount.value
                                        break
                                    case 5:
                                        if (hits == 5)
                                            payoff.value = 400 * amount.value
                                        if (hits == 4)
                                            payoff.value = 10 * amount.value
                                        if (hits == 3)
                                            payoff.value = 2 * amount.value
                                        break
                                    case 6:
                                        if (hits == 6)
                                            payoff.value = 1000 * amount.value
                                        if (hits == 5)
                                            payoff.value = 50 * amount.value
                                        if (hits == 4)
                                            payoff.value = 5 * amount.value
                                        if (hits == 3)
                                            payoff.value = 1 * amount.value
                                        break
                                    case 7:
                                        if (hits == 7)
                                            payoff.value = 4000 * amount.value
                                        if (hits == 6)
                                            payoff.value = 75 * amount.value
                                        if (hits == 5)
                                            payoff.value = 15 * amount.value
                                        if (hits == 4)
                                            payoff.value = 2 * amount.value
                                        if (hits == 3)
                                            payoff.value = 1 * amount.value
                                        break
                                    case 8:
                                        if (hits == 8)
                                            payoff.value = 10000 * amount.value
                                        if (hits == 7)
                                            payoff.value = 500 * amount.value
                                        if (hits == 6)
                                            payoff.value = 40 * amount.value
                                        if (hits == 5)
                                            payoff.value = 10 * amount.value
                                        if (hits == 4)
                                            payoff.value = 2 * amount.value
                                        break
                                    case 9:
                                        if (hits == 9)
                                            payoff.value = 25000 * amount.value
                                        if (hits == 8)
                                            payoff.value = 2500 * amount.value
                                        if (hits == 7)
                                            payoff.value = 100 * amount.value
                                        if (hits == 6)
                                            payoff.value = 20 * amount.value
                                        if (hits == 5)
                                            payoff.value = 5 * amount.value
                                        if (hits == 4)
                                            payoff.value = 1 * amount.value
                                        break
                                    case 10:
                                        if (hits == 10)
                                            payoff.value = 100000 * amount.value
                                        if (hits == 9)
                                            payoff.value = 4000 * amount.value
                                        if (hits == 8)
                                            payoff.value = 400 * amount.value
                                        if (hits == 7)
                                            payoff.value = 25 * amount.value
                                        if (hits == 6)
                                            payoff.value = 10 * amount.value
                                        if (hits == 5)
                                            payoff.value = 2 * amount.value
                                        if (hits == 0)
                                            payoff.value = 5 * amount.value
                                        break
                                }
                                if (payoff.value) {
                                    sound('cheer')
                                    vt.outln('\nYou win ', payoff.carry(), '!')
                                    $.player.coin.value += payoff.value
                                    vt.sleep(500)
                                }
                                else
                                    sound('boo')
                                menu()
                            }
                            else {
                                vt.refocus(`Pick #${picks.length + 1} [1-80]: `)
                            }
                        }, prompt: 'Pick #1 [1-80]: ', max: 2
                    }
                }
                vt.focus = 'point'
                return

            case 'S':
                vt.outln(vt.bright, vt.blue, '\nSlot Machine Payout Line:\n')
                if ($.player.emulation == 'XT') {
                    vt.out(vt.red, ' any 2  ', vt.normal, ' 🍒🍒 ', vt.reset, '    2x     ', vt.yellow, 'Orange  ', vt.normal, '🍊🍊🍊', vt.reset, '    50x\n')
                    vt.out(vt.red, 'Cherry  ', vt.normal, '🍒🍒🍒', vt.reset, '    5x     ', vt.bright, vt.yellow, '<Bell>  ', '🔔🔔🔔', vt.reset, '   100x\n')
                    vt.out(vt.magenta, 'Grapes  ', vt.normal, '🍇🍇🍇', vt.reset, '   10x     ', vt.green, '=Luck=  ', vt.normal, '🍀🍀🍀', vt.reset, '   400x\n')
                    vt.out(vt.bright, vt.green, ':Kiwi:  ', '🥝🥝🥝', vt.reset, '   20x     ', vt.cyan, '*Wild*  ', vt.normal, '💎💎💎', vt.reset, '   500x\n')
                    vt.out(vt.bright, vt.uline, vt.red, 'Exacta', vt.nouline, '  ', vt.normal, '🍒🍒💣', vt.reset, '   25x     ', vt.faint, '@Bomb@  ', vt.normal, '💣💣💣', vt.reset, '    💀\n')
                }
                else {
                    vt.out('Any 2 ', vt.red, 'Cherry', vt.reset, '  2x     3 ', vt.yellow, 'Orange  ', vt.reset, '   50x\n')
                    vt.out('3 ', vt.red, 'Cherry', vt.reset, '      5x     3 ', vt.bright, vt.yellow, '<Bell>  ', vt.reset, '  100x\n')
                    vt.out('3 ', vt.magenta, 'Grapes', vt.reset, '     10x     3 ', vt.green, '=Luck=  ', vt.reset, '  400x\n')
                    vt.out('3 ', vt.bright, vt.green, ':Kiwi:', vt.reset, '     20x     3 ', vt.cyan, '*Wild*  ', vt.reset, '  500x\n')
                    vt.out('3 ', vt.faint, '@Bomb@', vt.reset, '     Die\n')
                }

                vt.out('\nYou pull its arm and the wheels spin ... ')
                sound('click', 4)

                let bandit = [dice(16) % 16, dice(16) % 16, dice(16) % 16]
                for (let i = 0; i < 3; i++) {
                    for (let spin = dice(16) + 16; spin; spin--) {
                        vt.out('-\\|/'[spin % 4], '\x08')
                        vt.sleep(20)
                        bandit[i] = ++bandit[i] % 16
                    }
                    vt.beep()
                    let face = dial[i][bandit[i]]
                    vt.out(vt.blue, '[', vt.attr(slot[face].attr, slot[face].color), face)
                    if ($.player.emulation == 'XT') vt.out(` ${slot[face].uni}`)
                    vt.out(vt.reset, vt.blue, '] ')
                }
                vt.out(vt.reset, '\n\n')

                let face = [dial[0][bandit[0]], dial[1][bandit[1]], dial[2][bandit[2]]]
                payoff.value = 0
                if (face[0] == '*WILD*' && face[1] == '*WILD*' && face[2] == '*WILD*') {
                    payoff.value = 500 * amount.value
                    for (let i = 0; i < 8; i++) {
                        vt.beep()
                        for (let j = 0; j < 8; j++) {
                            vt.out((i + j) % 2 ? vt.blink : vt.noblink)
                            vt.out((i + j) % 8 + 30, 'YOU WIN! ')
                            vt.out(10)
                        }
                        vt.outln()
                    }
                    CherryBomb()
                    sound('wild', 50)
                }
                else if ((face[0] == '@BOMB@' || face[0] == '*WILD*')
                    && (face[1] == '@BOMB@' || face[1] == '*WILD*')
                    && (face[2] == '@BOMB@' || face[2] == '*WILD*')) {
                    $.online.hp = 0
                    $.reason = 'defeated by a one-armed bandit'
                    if ($.player.emulation == 'XT') vt.out('💀 ')
                    sound('boom', 6)
                    vt.outln(vt.faint, 'You die.')
                    vt.sleep(600)
                    vt.hangup()
                    return
                }
                else if ((face[0] == '=LUCK=' || face[0] == '*WILD*')
                    && (face[1] == '=LUCK=' || face[1] == '*WILD*')
                    && (face[2] == '=LUCK=' || face[2] == '*WILD*')) {
                    payoff.value = 400 * amount.value
                    for (let i = 0; i < 4; i++) {
                        vt.beep()
                        for (let j = 0; j < 8; j++) {
                            vt.out((i + j) % 8 + 30, 'YOU WIN! ')
                            vt.out(15)
                        }
                        vt.outln()
                    }
                    CherryBomb()
                    sound('wild', 50)
                }
                else if ((face[0] == '<BELL>' || face[0] == '*WILD*')
                    && (face[1] == '<BELL>' || face[1] == '*WILD*')
                    && (face[2] == '<BELL>' || face[2] == '*WILD*')) {
                    payoff.value = 100 * amount.value
                    for (let i = 0; i < 8; i++) {
                        vt.beep()
                        vt.out(i % 8 + 30, 'YOU WIN! ')
                        vt.out(20)
                    }
                    vt.outln()
                    CherryBomb()
                }
                else if ((face[0] == 'ORANGE' || face[0] == '*WILD*')
                    && (face[1] == 'ORANGE' || face[1] == '*WILD*')
                    && (face[2] == 'ORANGE' || face[2] == '*WILD*')) {
                    payoff.value = 50 * amount.value
                    vt.beep()
                    music('wild')
                    vt.sleep(2500)
                }
                else if (face[0] == 'CHERRY' && face[1] == 'CHERRY' && face[2] == '@BOMB@') {
                    payoff.value = 25 * amount.value
                    CherryBomb()
                }
                else if ((face[0] == ':KIWI:' || face[0] == '*WILD*')
                    && (face[1] == ':KIWI:' || face[1] == '*WILD*')
                    && (face[2] == ':KIWI:' || face[2] == '*WILD*')) {
                    payoff.value = 20 * amount.value
                }
                else if ((face[0] == 'GRAPES' || face[0] == '*WILD*')
                    && (face[1] == 'GRAPES' || face[1] == '*WILD*')
                    && (face[2] == 'GRAPES' || face[2] == '*WILD*')) {
                    payoff.value = 10 * amount.value
                }
                else if ((face[0] == 'CHERRY' || face[0] == '*WILD*')
                    && (face[1] == 'CHERRY' || face[1] == '*WILD*')
                    && (face[2] == 'CHERRY' || face[2] == '*WILD*')) {
                    payoff.value = 5 * amount.value
                }
                else if ((((face[0] == 'CHERRY' || face[0] == '*WILD*')
                    && ((face[1] == 'CHERRY' || face[1] == '*WILD*') || (face[2] == 'CHERRY' || face[2] == '*WILD*')))
                    || ((face[1] == 'CHERRY' || face[1] == '*WILD*') && (face[2] == 'CHERRY' || face[2] == '*WILD*')))) {
                    payoff.value = 2 * amount.value
                    if (face[0] == '@BOMB@' || face[1] == '@BOMB@' || face[2] == '@BOMB@')
                        CherryBomb()
                }

                if (payoff.value) {
                    sound('cheer')
                    vt.outln('You win ', payoff.carry(), '!')
                    $.player.coin.value += payoff.value
                    vt.sleep(500)
                }
                else
                    sound('boo')
        }

        menu()

        function CherryBomb() {
            if ($.player.emulation == 'XT') {
                music('cherry')
                vt.out(vt.red)
                for (let i = 0; i < 6; i++) {
                    vt.out(' ', vt.faint)
                    for (let j = 0; j < i; j++)
                        vt.out('🍒')
                    vt.out(vt.normal)
                    vt.out('🍒\r')
                    vt.sleep(250)
                }
                vt.outln(vt.bright, vt.red, '🍒 CHERRY 🍒 ')
                for (let i = 0; i < 4; i++) {
                    vt.out(' ', vt.faint)
                    for (let j = 0; j < i; j++)
                        vt.out('💣')
                    vt.out(vt.normal)
                    vt.out('💣\r')
                    vt.sleep(400)
                }
                vt.outln(vt.bright, vt.black, '💣 BOMB!! 💣 ')
            }
            else {
                vt.beep()
                vt.out(vt.bright, vt.red, 'Cherry ', vt.black, 'BOMB', vt.reset, '!!\n')
            }
        }

        function ShowHand(who: number, hand: number[]) {
            let value: number = 0
            ace = 0

            vt.out(who ? vt.bright : vt.reset, vt.green, ['Dealer', 'Player'][who], `'s hand:`, vt.white)
            if ($.player.emulation == 'XT')
                for (let i = 0; i < hand.length; i++)
                    vt.out(' ', card[hand[i]].uni)
            vt.out(' '.repeat(12 - 2 * hand.length))
            for (let i = 0; i < hand.length; i++) {
                vt.out(vt.red, '[', vt.white, card[hand[i]].face, vt.red, '] ')
                value += card[hand[i]].value
                if (card[hand[i]].value == 1)
                    ace++
            }
            for (let i = 0; i < ace && value + 10 < 22; i++)
                value += 10
            vt.outln(vt.reset, '= ', vt.bright, who ? vt.cyan : vt.green, `${value}`)
            vt.sleep(500)
            return (value)
        }

        function RollDice(baby = 0, side = 0): boolean {
            let d1 = dice(6), d2 = dice(6), n = dice(2) + dice(2)
            vt.out('\x1B[J', vt.faint)
            for (let i = 0; i < n; i++) {
                sound('click')
                vt.out('.')
            }
            vt.out(vt.normal, vt.blue, ' [',
                vt.bright, vt.cyan, d1.toString(),
                vt.normal, vt.blue, '] [',
                vt.bright, vt.cyan, d2.toString(),
                vt.normal, vt.blue, ']')
            vt.beep()
            vt.outln(vt.white, ' = ', vt.bright, (d1 + d2).toString())
            if (baby && d1 + d2 !== baby) {
                sound('boo')
                vt.outln('You lose on the side bet.')
            }
            if (d1 + d2 == baby) {
                baby = (baby == 2 || baby == 12) ? 35
                    : (baby == 3 || baby == 11) ? 17
                        : (baby == 4 || baby == 10) ? 11
                            : (baby == 5 || baby == 9) ? 8
                                : (baby == 6 || baby == 8) ? 6
                                    : 5
                sound('cheer')
                payoff.value = side * baby
                vt.outln('You make your side bet!  You win ', payoff.carry(), '!')
                $.player.coin.value += payoff.value
            }
            vt.sleep(1000)
            if (d1 + d2 == 7) {
                sound('boo')
                vt.out('Crapped out!  You lose on your point.\n')
                vt.sleep(500)
                menu()
                return true
            }
            if (d1 + d2 == point) {
                sound('cheer')
                payoff.value = amount.value
                vt.outln('You make your point!  You win ', payoff.carry(), '!')
                $.player.coin.value += payoff.value + amount.value
                vt.sleep(500)
                menu()
                return true
            }
            return false
        }
    }

    function shuffle(jokers = false) {
        deck = [0,
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
            14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26,
            27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
            40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52,
            53]
        vt.out(vt.faint, '\nShuffling a new deck ')
        vt.sleep(250)
        let cut = dice(6) + 4
        for (let n = 0; n < cut; n++) {
            if (jokers)
                for (let i = 0; i < 54; i++) {
                    let j = dice(54) - 1
                        ;[deck[i], deck[j]] = [deck[j], deck[i]];
                }
            else
                for (let i = 1; i < 53; i++) {
                    let j = dice(52)
                        ;[deck[i], deck[j]] = [deck[j], deck[i]];
                }
            vt.out('.')
            vt.sleep(20)
        }
        vt.outln(' Ok.')
        vt.sleep(250)
        pile = 1
    }

}

export = Gambling
