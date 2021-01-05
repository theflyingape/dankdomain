/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  SQUARE authored by: Robert Hurst <theflyingape@gmail.com>                *
\*****************************************************************************/

import Battle = require('../battle')
import db = require('../db')
import $ = require('../runtime')
import { vt, Coin, action, animated, armor, bracket, display, loadUser, music, portrait, profile, sound, weapon } from '../io'
import { Armor, Magic, Poison, Ring, RealEstate, Security, Weapon } from '../items'
import { encounter, log, news, tradein } from '../lib'
import { PC } from '../pc'
import { dice, int, money, sprintf, whole } from '../sys'

module Square {

    let square: choices = {
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
    }

    let bank: choices = {
        'D': {},
        'W': {},
        'L': {},
        'R': { description: 'Rob the bank' },
        'T': {}
    }

    let credit = new Coin(0)

    let lo = 0, hi = 0, max = 0
    let want = ''

    export function menu(suppress = true) {
        action('square')
        vt.form = {
            'menu': { cb: choice, cancel: 'q', enter: '?', eol: false }
        }

        if (!$.player.novice && $.player.level > 1 && ($.player.coin.value > 0 || $.player.poisons.length || ($.player.magic < 2 && $.player.spells.length))
            && dice($.online.cha / 3 + 4 * $.player.steal) == 1) {
            let bump = encounter(`AND coward = 0 AND novice = 0 AND (id NOT GLOB '_*' OR id = '_TAX')`
                , $.player.level - 9, $.player.level + 9)
            if (bump.user.id && !bump.user.status) {
                vt.beep()
                vt.outln()
                if (bump.user.id == $.taxman.user.id)
                    profile({ jpg: 'npc/taxman', handle: $.taxman.user.handle, level: $.taxman.user.level, pc: $.taxman.user.pc, effect: 'fadeInLeft' })
                else
                    portrait(bump)
                vt.out(vt.cyan, vt.faint, `${bump.user.handle} bumps`
                    , vt.normal, ' into you from'
                    , vt.bright, ' out of the shadows'
                    , vt.reset, ' ... ')
                if (dice($.online.cha / 9 + 2 * $.player.steal)
                    > 2 * Ring.power($.player.rings, bump.user.rings, 'steal').power + bump.user.steal)
                    vt.outln('{waves}\n ... and moves along.')
                else {
                    let p: number, i: number
                    if ($.player.coin.value > 0) {
                        let pouch = $.player.coin.amount.split(',')
                        p = dice(pouch.length) - 1
                        i = 'csgp'.indexOf(pouch[p].substr(-1))
                        let v = new Coin(pouch[p])
                        bump.user.coin.value += v.value
                        log(bump.user.id, `\nYou picked ${$.player.handle}'s pouch holding ${v.carry()}!`)
                        $.player.coin.value -= v.value
                        vt.outln(vt.faint, '{sigh}')
                        sound('oops', 8)
                        vt.outln('Your ', v.pieces(), ' is gone!')
                    }
                    else if ($.player.poisons.length) {
                        vt.out(vt.faint, '\nYou hear vials rattle.')
                        vt.sleep(800)
                        p = $.player.poisons[dice($.player.poisons.length) - 1]
                        Poison.remove($.player.poisons, p)
                        Poison.add(bump.user.poisons, p)
                        log(bump.user.id, `\nYou lifted a vial of ${Poison.merchant[p - 1]} from ${$.player.handle}!`)
                        sound('oops', 8)
                        vt.out(vt.reset, '  Your vial of ')
                        if ($.player.emulation == 'XT') vt.out('💀 ')
                        vt.outln(vt.faint, Poison.merchant[p - 1], vt.reset, ' goes missing!')
                    }
                    else if ($.player.magic < 3 && $.player.spells.length) {
                        vt.out(vt.faint, '\nYou hear something rattle.')
                        vt.sleep(800)
                        p = $.player.spells[dice($.player.spells.length) - 1]
                        Magic.remove($.player.spells, p)
                        Magic.add(bump.user.spells, p)
                        log(bump.user.id, `\nYou lifted a  ${Magic.merchant[p - 1]} from ${$.player.handle}!`)
                        sound('oops', 8)
                        vt.outln(vt.reset, '  Your ', Magic.merchant[p - 1], ' magic has disappeared!')
                    }
                    PC.saveUser(bump)
                    vt.sleep(800)
                }
                vt.sleep(1600)
                animated('fadeOutRight')
            }
        }

        let hints = ''
        if ($.online.hp < $.player.hp)
            hints += `> You are battle weary.  Heal yourself at the hospital.\n`
        if ($.player.coin.value && $.player.poison && !$.player.poisons.length)
            hints += `> Try buying a poison for your weapon.\n`
        if ($.player.coin.value && $.player.level / 9 > RealEstate.name[$.player.realestate].protection + 1)
            hints += `> Increase your standing with the community by moving into a better dwelling.\n`
        if (!$.player.coin.value && $.player.bank.value > 100000 && ($.player.poisons.length || $.player.spells.length))
            hints += `> Carry small pocket change to misdirect thieving of more valuable items\n`
        if (dice(10) == 1 && $.player.loan.value && $.player.steal > 1)
            hints += `> Perhaps pick a pocket? Or two?\n`
        if ($.player.coin.value && int($.player.level / 9) > (Security.name[$.player.security].protection + 1))
            hints += `> Alleviate paranoia from bad luck and thieves with better Security.\n`
        if (dice(100) == 1 && $.player.loan.value && $.player.ram && $.player.steal)
            hints += `> Try using your ram on the bank for big money.\n`
        vt.form['menu'].prompt = display('square', vt.White, vt.lblack, suppress, square, hints)
        vt.focus = 'menu'
    }

    function choice() {
        let suppress = false
        let choice = vt.entry.toUpperCase()
        if (square[choice]?.description) {
            vt.out(' - ', square[choice].description)
            suppress = $.player.expert
        }
        vt.outln()

        switch (choice) {
            case 'A':
                if (!$.access.roleplay) break
                let ac = Armor.name[$.player.armor].ac
                vt.out('\nYou own a class ', bracket(ac, false), ' ', armor())
                if (ac) {
                    let cv = new Coin(Armor.name[$.player.armor].value)
                    credit.value = tradein(cv.value, $.online.cha)
                    if ($.player.toAC) credit.value = int(credit.value * (ac + $.player.toAC / ($.player.poison + 1)) / ac)
                    if ($.online.toAC < 0) credit.value = int(credit.value * (ac + $.online.toAC) / ac)
                    if (credit.value > cv.value)
                        credit.value = cv.value
                }
                else
                    credit.value = 0
                vt.outln(' worth ', credit.carry())

                if (ac == 0 && ($.player.toAC < 0 || $.online.toAC < 0)) {
                    vt.outln(vt.yellow, 'You look like a leper; go to the hospital for treatment.')
                    suppress = true
                    break
                }

                max = Armor.merchant.length - 1
                lo = $.online.armor.ac - 1
                lo = lo < 1 ? 1 : lo > max ? max - 1 : lo
                for (hi = lo;
                    hi < max && $.player.coin.value + credit.value >= new Coin(Armor.name[Armor.merchant[hi]].value).value;
                    hi++);
                if (lo > 1 && lo == hi) lo--
                list(choice)
                return

            case 'B':
                if (!$.access.roleplay) break
                credit.value = tradein(new Coin(RealEstate.name[$.player.realestate].value).value, $.online.cha)
                credit.value += tradein(new Coin(Security.name[$.player.security].value).value, $.online.cha)
                credit.value -= $.player.loan.value
                if (credit.value < 1) credit.value = 0

                action('bank')
                bank['D'] = { description: 'Money in hand: ' + $.player.coin.carry(4) }
                bank['W'] = { description: 'Money in bank: ' + $.player.bank.carry(4) }
                bank['L'] = { description: 'Money on loan: ' + $.player.loan.carry(4) }

                vt.form = {
                    'menu': { cb: Bank, cancel: 'q', enter: '?', eol: false }
                }
                vt.form['menu'].prompt = display('Welcome to the Iron Bank', null, vt.green, false, bank)
                vt.focus = 'menu'
                return

            case 'G':
                action('clear')
                require('./arena').menu($.player.expert)
                return

            case 'H':
                if (!$.access.roleplay) break
                if (Armor.name[$.player.armor].ac == 0 && ($.online.toAC < 0 || $.player.toAC < 0)) {
                    credit = new Coin(Math.abs($.online.toAC + $.player.toAC) * money($.player.level) + 1)
                    action('yn')
                    vt.form = {
                        'skin': {
                            cb: () => {
                                vt.outln('\n')
                                if (/Y/i.test(vt.entry)) {
                                    sound('click')
                                    $.online.toAC = 0
                                    $.player.toAC = 0
                                    $.player.coin.value -= credit.value
                                    if ($.player.coin.value < 0) {
                                        $.player.bank.value += $.player.coin.value
                                        $.player.coin.value = 0
                                        if ($.player.bank.value < 0) {
                                            $.player.loan.value -= $.player.bank.value
                                            $.player.bank.value = 0
                                        }
                                    }
                                    $.online.altered = true
                                }
                                Battle.yourstats()
                                menu()
                                return
                            }, cancel: 'Y', enter: 'Y', max: 1, eol: false, match: /Y|N/i, timeout: 10
                        }
                    }
                    vt.form['skin'].prompt = 'Heal your skin for ' + credit.carry() + ' (Y/N)? '
                    vt.focus = 'skin'
                    return
                }
                if (Weapon.name[$.player.weapon].wc == 0 && ($.online.toWC < 0 || $.player.toWC < 0)) {
                    credit = new Coin(Math.abs($.online.toWC + $.player.toWC) * money($.player.level) + 1)
                    action('yn')
                    vt.form = {
                        'hands': {
                            cb: () => {
                                vt.outln('\n')
                                if (/Y/i.test(vt.entry)) {
                                    sound('click')
                                    $.online.toWC = 0
                                    $.player.toWC = 0
                                    $.player.coin.value -= credit.value
                                    if ($.player.coin.value < 0) {
                                        $.player.bank.value += $.player.coin.value
                                        $.player.coin.value = 0
                                        if ($.player.bank.value < 0) {
                                            $.player.loan.value -= $.player.bank.value
                                            $.player.bank.value = 0
                                        }
                                    }
                                    $.online.altered = true
                                }
                                Battle.yourstats()
                                menu()
                                return
                            }, cancel: 'Y', enter: 'Y', max: 1, eol: false, match: /Y|N/i, timeout: 10
                        }
                    }
                    vt.form['hands'].prompt = 'Fix your hands for ' + credit.carry() + ' (Y/N)? '
                    vt.focus = 'hands'
                    return
                }
                hi = $.player.hp - $.online.hp
                if (hi < 1) {
                    vt.beep()
                    vt.outln(`\nYou don't need any hit points.`)
                    break
                }
                vt.outln('\nWelcome to Butler Hospital.\n')
                vt.outln('Hit points cost ', vt.bright, $.player.level.toString(), vt.normal, ' each.')
                vt.outln('You need ', vt.bright, hi.toString(), vt.normal, ' hit points.')
                lo = Math.trunc($.player.coin.value / $.player.level)
                vt.outln('You can afford '
                    , vt.bright, lo < hi ? lo.toString() : 'all your', vt.normal, ' hit points.')
                if (lo < hi) {
                    if ($.player.novice)
                        vt.out('Normally, you would be billed for the remaining ')

                    else
                        vt.out('You can be billed for the remaining ')
                    vt.outln(vt.bright, (hi - lo).toString(), vt.normal, ' hit points.')
                }
                action('listall')
                vt.form = {
                    'hp': {
                        cb: () => {
                            vt.outln()
                            let buy = Math.abs(Math.trunc(/=|max/i.test(vt.entry) ? hi : +vt.entry))
                            if (buy > 0 && buy <= hi) {
                                $.player.coin.value -= buy * $.player.level
                                if ($.player.coin.value < 0) {
                                    if (!$.player.novice) $.player.bank.value += $.player.coin.value
                                    $.player.coin.value = 0
                                    if ($.player.bank.value < 0) {
                                        $.player.loan.value -= $.player.bank.value
                                        $.player.bank.value = 0
                                    }
                                }
                                $.online.hp += buy
                                vt.beep()
                                vt.outln('\nHit points = ', $.online.hp.toString())
                            }
                            menu()
                            return
                        }, max: 5
                    }
                }
                vt.form['hp'].prompt = vt.attr('How many do you want ['
                    , vt.white, vt.uline, 'MAX', vt.nouline, '=', vt.bright, hi.toString()
                    , vt.normal, vt.cyan, ']? ')
                vt.focus = 'hp'
                return

            case 'J':
                if ($.bail) {
                    profile({ png: 'npc/jailer', effect: 'fadeIn' })
                    vt.outln('\nA deputy greets you in front of the County Jail.')
                    vt.sleep(600)
                    vt.outln(`"What `, ['cur', 'knave', 'scum', 'toad', 'villain'][dice(5) - 1]
                        , ` do you come for, ${$.access[$.player.gender] || $.access[$.player.sex]}?"`)
                    Battle.user('Bail', (opponent: active) => {
                        if (opponent.user.id == '') {
                            menu()
                            return
                        }
                        vt.outln()
                        if (opponent.user.id == $.player.id) {
                            opponent.user.id = ''
                            vt.outln(`You can't bail ${PC.who(opponent).him}out.`)
                            menu()
                            return
                        }
                        if (opponent.user.status !== 'jail') {
                            opponent.user.id = ''
                            vt.outln(`${opponent.user.handle} is not in jail.`)
                            menu()
                            return
                        }

                        credit.value = int(money(opponent.user.level) * (100 - $.online.cha + 1) / 100 + 1)
                        vt.out(`It will cost you ${credit.carry()} to bail out ${opponent.user.handle}.\n`)
                        if ($.player.coin.value < credit.value) {
                            menu()
                            return
                        }

                        action('ny')
                        vt.form = {
                            'pay': {
                                cb: () => {
                                    vt.outln()
                                    if (/Y/i.test(vt.entry)) {
                                        profile({ png: 'payment', effect: 'tada' })
                                        sound('click')
                                        vt.outln(`${opponent.user.handle} is set free.`)
                                        $.player.coin.value -= credit.value
                                        opponent.user.status = ''
                                        opponent.user.xplevel = opponent.user.level
                                        db.run(`UPDATE Players set status='',xplevel=level WHERE id='${opponent.user.id}'`)
                                        log(opponent.user.id, `${$.player.handle} paid ${credit.carry()} to bail you out of jail.\n`)
                                        news(`\t${opponent.user.handle} made bail`)
                                        $.bail--
                                    }
                                    else
                                        action('fadeOut')
                                    menu()
                                    return
                                }, prompt: 'Will you pay (Y/N)? '
                                , cancel: 'N', enter: 'N', max: 1, eol: false, match: /Y|N/i, timeout: 10
                            }
                        }
                        vt.focus = 'pay'
                    })
                    return
                }
                vt.out(`The jail house is closed for the day.\n`)
                break

            case 'M':
                vt.out('\nThe ', vt.bright, vt.blue, 'old mage ', vt.reset)
                max = Magic.merchant.length
                for (lo = 1; lo <= max; lo++)
                    if (!Magic.have($.player.spells, lo))
                        break
                if (lo > Magic.merchant.length || !$.player.magic || !$.access.roleplay) {
                    vt.outln('says, "Get outta here!"')
                    suppress = true
                    break
                }
                for (hi = max; hi > lo; hi--)
                    if (!Magic.have($.player.spells, hi)
                        && $.player.coin.value >= (
                            $.player.magic == 1 ? new Coin(Magic.spells[Magic.merchant[hi - 1]].wand).value
                                : new Coin(Magic.spells[Magic.merchant[hi - 1]].cost).value))
                        break
                vt.out(['offers to sell you a magic wand'
                    , 'offers to make you a scroll, for a price'
                    , 'offers to teach you a spell, for a price'
                    , 'wants to endow you with a spell, for a price'
                ][$.player.magic - 1], '.\n'
                )
                list(choice)
                return

            case 'P':
                if (!$.access.roleplay) break
                if ($.player.novice) {
                    vt.out('\nNovice players cannot rob.\n')
                    break
                }
                vt.out(vt.faint, '\nYou attempt to pick a passerby\'s pocket... ', vt.reset)
                vt.sleep(1000)

                credit.value = dice(6 * money($.player.level) / dice(10))
                let pocket = encounter(`AND novice = 0 AND id NOT GLOB '_*'`).user
                if (pocket.id) {
                    loadUser(pocket)
                    if (pocket.coin.value > 0)
                        credit.value += pocket.coin.value
                    else {
                        pocket.id = ''
                        pocket.handle = 'somebody'
                    }
                    pocket.coin.value = 0
                }
                else
                    pocket.handle = 'somebody'

                vt.outln('\n\nYou pick ', pocket.handle, '\'s pocket and steal ', credit.carry(), '!\n')
                vt.sleep(1000)
                let effort = 100 + $.steal
                effort -= 8 * Ring.power([], $.player.rings, 'steal').power
                if (int(16 * $.player.steal + $.player.level / 10 + $.online.dex / 10) < dice(effort)) {
                    $.player.status = 'jail'
                    $.reason = `caught picking ${pocket.handle}'s pocket`
                    action('clear')
                    profile({ png: 'npc/jailer', effect: 'fadeIn' })
                    vt.outln('A guard catches you and throws you into jail!')
                    sound('arrested', 20)
                    vt.outln('You might be released by your next call.\n')
                    vt.sleep(1000)
                    vt.hangup()
                    return
                }
                else {
                    if (!Ring.have($.player.rings, Ring.theOne)) $.steal++
                    if (!$.arena || !$.dungeon) $.steal++
                    vt.beep()
                    $.player.coin.value += credit.value
                    if (pocket.id) {
                        $.online.altered = true
                        $.player.steals++
                        PC.saveUser(pocket)
                    }
                    suppress = true
                    break
                }

            case 'Q':
                require('./main').menu($.player.expert)
                return

            case 'R':
                if (!$.access.roleplay) break
                let re = RealEstate.name[$.player.realestate].protection
                vt.out('\nYou live in a ', $.player.realestate)
                credit.value = tradein(new Coin(RealEstate.name[$.player.realestate].value).value, $.online.cha)
                vt.outln(' worth ', credit.carry())

                max = RealEstate.merchant.length - 1
                lo = re - $.realestate
                if (lo < 1) lo = 1
                hi = lo
                for (;
                    hi < max && $.player.coin.value + credit.value >= new Coin(RealEstate.name[RealEstate.merchant[hi]].value).value;
                    hi++);

                list(choice)
                return

            case 'S':
                if (!$.access.roleplay) break
                let s = Security.name[$.player.security].protection
                vt.out('\nYou are guarded by a ', $.player.security)
                credit.value = tradein(new Coin(Security.name[$.player.security].value).value, $.online.cha)
                vt.outln(' worth ', credit.carry())

                max = Security.merchant.length - 1
                lo = s - $.security
                if (lo < 1) lo = 1
                hi = lo
                for (;
                    hi < max && $.player.coin.value + credit.value >= new Coin(Security.name[Security.merchant[hi]].value).value;
                    hi++);

                list(choice)
                return

            case 'V':
                vt.outln('\n', vt.faint, '... you enter the back door of the shop ...')
                vt.out('The ', vt.bright, vt.magenta, 'apothecary ', vt.reset)
                max = Poison.merchant.length
                for (lo = 1; lo <= max; lo++)
                    if (!Poison.have($.player.poisons, lo))
                        break
                if (lo > Poison.merchant.length || !$.player.poison || !$.access.roleplay) {
                    vt.outln('says, "Get outta here!"')
                    suppress = true
                    break
                }
                for (hi = max; hi > lo; hi--)
                    if (!Poison.have($.player.poisons, hi)
                        && $.player.coin.value >= (
                            $.player.poison == 1 ? new Coin(Poison.vials[Poison.merchant[hi - 1]].vial).value
                                : new Coin(Poison.vials[Poison.merchant[hi - 1]].cost).value))
                        break
                vt.out(['scoffs at your apparent lack of skill'
                    , 'casts a suspicious look your way'
                    , 'offers to sell you his contraband'
                    , 'admires your expert eye on his wares'
                ][$.player.poison - 1], '.\n'
                )
                list(choice)
                return

            case 'W':
                if (!$.access.roleplay) break
                let wc = Weapon.name[$.player.weapon].wc
                vt.out('\nYou own a class ', bracket(wc, false), ' ', weapon())
                if (wc) {
                    let cv = new Coin(Weapon.name[$.player.weapon].value)
                    credit.value = tradein(cv.value, $.online.cha)
                    if ($.player.toWC) credit.value = int(credit.value * (wc + $.player.toWC / ($.player.poison + 1)) / wc)
                    if ($.online.toWC < 0) credit.value = int(credit.value * (wc + $.online.toWC) / wc)
                    if (credit.value > cv.value)
                        credit.value = cv.value
                }
                else
                    credit.value = 0
                vt.outln(' worth ', credit.carry())

                if (wc == 0 && ($.player.toWC < 0 || $.online.toWC < 0)) {
                    vt.outln(vt.yellow, 'Your hands are broken; go to the hospital for treatment.')
                    suppress = true
                    break
                }

                max = Weapon.merchant.length - 1
                lo = $.online.weapon.wc - 1
                lo = lo < 1 ? 1 : lo > max ? max - 1 : lo
                for (hi = lo;
                    hi < max && $.player.coin.value + credit.value >= new Coin(Weapon.name[Weapon.merchant[hi]].value).value;
                    hi++);
                if (lo > 1 && lo == hi) lo--
                list(choice)
                return
        }
        menu(suppress)
    }

    function Bank() {
        let suppress = $.player.expert
        let choice = vt.entry.toUpperCase()
        if (!bank[choice]) {
            vt.beep()
            vt.refocus()
            return
        }
        vt.form = {
            'coin': { cb: amount, max: 6 }
        }

        vt.outln()

        switch (choice) {
            case 'D':
                action('payment')
                vt.form['coin'].prompt = vt.attr('Deposit ', vt.white, '[', vt.uline, 'MAX', vt.nouline, '=', $.player.coin.carry(), ']? ')
                vt.focus = 'coin'
                break

            case 'L':
                action('payment')
                vt.form['coin'].prompt = vt.attr('Loan ', vt.white, '[', vt.uline, 'MAX', vt.nouline, '=', credit.carry(), ']? ')
                vt.focus = 'coin'
                break

            case 'W':
                action('payment')
                vt.form['coin'].prompt = vt.attr('Withdraw ', vt.white, '[', vt.uline, 'MAX', vt.nouline, '=', $.player.bank.carry(), ']? ')
                vt.focus = 'coin'
                break

            case 'R':
                music('ddd')
                let c = ($.player.level / 5) * ($.player.steal + 1)
                vt.out(vt.faint, '\nYou attempt to sneak into the vault...', vt.reset)
                vt.sleep(2500)

                let effort = 100 + $.steal
                effort -= 8 * Ring.power([], $.player.rings, 'steal').power
                if (dice(effort) > ++c) {
                    $.player.status = 'jail'
                    $.reason = 'caught getting into the vault'
                    action('clear')
                    profile({ png: 'npc/jailer', effect: 'fadeIn' })
                    vt.outln('\n\nA guard catches you and throws you into jail!')
                    sound('arrested', 20)
                    vt.outln('\nYou might be released by your next call.\n')
                    vt.sleep(1000)
                    vt.hangup()
                    return
                }

                let d = $.player.level + 1
                let vault = Math.pow(d, 7) * dice(d / 3) * dice(d / 11)
                let carry = new Coin(vault)

                sound('creak2', 12)
                vt.outln(vt.yellow, ' you open a chest and find ', carry.carry(), vt.bright, '!')

                let deposits = new Coin(whole(db.query(`SELECT SUM(bank) AS bank FROM Players WHERE id NOT GLOB '_*' AND id <> '${$.player.id}'`)[0].bank))
                if (deposits.value) {
                    vt.sleep(1200)
                    vt.outln('And you grab ', deposits.carry(), ' more in deposits!')
                }
                sound('yahoo', 12)

                vt.outln()
                vt.out(vt.faint, 'You try to make your way out of the vault ')
                vt.sleep(1200)
                for (let i = 0; i < 6 - $.player.steal; i++) {
                    vt.out('.')
                    sound('click', 6)
                }

                c /= 15 - ($.player.steal * 3)
                if (dice(effort) > ++c) {
                    $.player.status = 'jail'
                    $.reason = 'caught inside the vault'
                    vt.out(vt.reset, ' something jingles.')
                    action('clear')
                    sound('max', 12)
                    profile({ png: 'npc/jailer', effect: 'fadeIn' })
                    vt.outln('\n\nA guard laughs as he closes the vault door on you!')
                    sound('arrested', 20)
                    vt.outln('\nYou might be released by your next call.')
                    vt.sleep(1000)
                    vt.hangup()
                    return
                }

                $.player.coin.value += carry.value + deposits.value
                $.player.steals++
                vt.outln()
                db.run(`UPDATE Players SET bank=0 WHERE id NOT GLOB '_*'`)
                vt.beep()
                menu(true)
                break

            case 'T':
                if ($.access.sysop) {
                    vt.form['coin'].prompt = vt.attr('Treasury ', vt.white, '[', vt.uline, 'MAX', vt.nouline, '=99999p]? ')
                    vt.focus = 'coin'
                    break
                }

            case 'Q':
                action('nme')
                menu(suppress)
                break
        }
    }

    function amount() {
        if ((+vt.entry).toString() == vt.entry) vt.entry += 'c'
        let action = vt.form['coin'].prompt.split(' ')[0]
        let amount = new Coin(0)

        switch (action) {
            case 'Deposit':
                amount.value = int((/=|max/i.test(vt.entry))
                    ? new Coin($.player.coin.carry(2, true)).value
                    : new Coin(vt.entry).value)
                if (amount.value > 0 && amount.value <= $.player.coin.value) {
                    $.player.coin.value -= amount.value
                    if ($.player.loan.value > 0) {
                        $.player.loan.value -= amount.value
                        if ($.player.loan.value < 0) {
                            amount.value = -$.player.loan.value
                            $.player.loan.value = 0
                        }
                        else
                            amount.value = 0
                    }
                    $.player.bank.value += amount.value
                    $.online.altered = true
                    vt.beep()
                }
                break

            case 'Loan':
                amount.value = int((/=|max/i.test(vt.entry))
                    ? new Coin(credit.carry(2, true)).value
                    : new Coin(vt.entry).value)
                if (amount.value > 0 && amount.value <= credit.value) {
                    $.player.loan.value += amount.value
                    $.player.coin.value += amount.value
                    $.online.altered = true
                    vt.beep()
                }
                break

            case 'Withdraw':
                amount.value = int((/=|max/i.test(vt.entry))
                    ? new Coin($.player.bank.carry(2, true)).value
                    : new Coin(vt.entry).value)
                if (amount.value > 0 && amount.value <= $.player.bank.value) {
                    $.player.bank.value -= amount.value
                    $.player.coin.value += amount.value
                    $.online.altered = true
                    vt.beep()
                }
                break

            case 'Treasury':
                amount.value = int((/=|max/i.test(vt.entry))
                    ? (1e+18 - 1e+09)
                    : new Coin(vt.entry).value)
                if (amount.value > 0 && amount.value <= (1e+18 - 1e+09)) {
                    $.player.coin.value += amount.value
                    vt.beep()
                }
                break
        }

        vt.entry = 'B'
        choice()
    }

    function list(choice: string) {
        want = choice.toUpperCase()
        if (/M|V/.test(want))
            action('listall')
        else
            action('listbest')
        vt.form = {
            'start': { cb: listStart, prompt: 'Start list at ', max: 3 },
            'end': { cb: listEnd, prompt: 'Start list at ', max: 3 },
            'buy': { cb: buy, prompt: 'Buy which? ', max: 3 }
        }
        vt.form['start'].enter = lo.toString()
        vt.form['start'].prompt = vt.attr('Start list at ', (lo < 10 && hi > 9) ? ' ' : '', bracket(lo, false), ': ')
        vt.form['end'].enter = hi.toString()
        vt.form['end'].prompt = vt.attr('  End list at ', bracket(hi, false), ': ')

        if (lo < hi)
            vt.focus = 'start'
        else
            listing()
    }

    function listStart() {
        if (/=|max/i.test(vt.entry)) {
            buyall()
            return
        }

        let n = +vt.entry >> 0
        if (n < 1) n = 1
        if ((/R|S/.test(want) && n < lo) || n > max) {
            vt.beep()
            vt.refocus()
            return
        }

        lo = n
        vt.focus = 'end'
    }

    function listEnd() {
        if (/=|max/i.test(vt.entry)) {
            buyall()
            return
        }

        let n = +vt.entry >> 0
        if (n < lo) n = lo
        if (n > max) n = max
        hi = n

        vt.outln()
        listing()
    }

    function listing() {
        for (let i = lo; i <= hi; i++) {
            switch (want) {
                case 'A':
                    vt.out(bracket(i), sprintf('%-24s ', Armor.merchant[i]))
                    vt.out(new Coin(Armor.name[Armor.merchant[i]].value).carry())
                    break

                case 'M':
                    if (!Magic.have($.player.spells, i)) {
                        vt.out(bracket(i), sprintf('%-24s ', Magic.merchant[i - 1]))
                        if ($.player.magic == 1)
                            vt.out(new Coin(Magic.spells[Magic.merchant[i - 1]].wand).carry())
                        else
                            vt.out(new Coin(Magic.spells[Magic.merchant[i - 1]].cost).carry())
                    }
                    break

                case 'R':
                    vt.out(bracket(i), sprintf('%-24s ', RealEstate.merchant[i]))
                    vt.out(new Coin(RealEstate.name[RealEstate.merchant[i]].value).carry())
                    break

                case 'S':
                    vt.out(bracket(i), sprintf('%-24s ', Security.merchant[i]))
                    vt.out(new Coin(Security.name[Security.merchant[i]].value).carry())
                    break

                case 'V':
                    if (!Poison.have($.player.poisons, i)) {
                        vt.out(bracket(i), sprintf('%-24s ', Poison.merchant[i - 1]))
                        if ($.player.poison == 1)
                            vt.out(new Coin(Poison.vials[Poison.merchant[i - 1]].vial).carry())
                        else
                            vt.out(new Coin(Poison.vials[Poison.merchant[i - 1]].cost).carry())
                    }
                    break

                case 'W':
                    vt.out(bracket(i), sprintf('%-24s ', Weapon.merchant[i]))
                    vt.out(new Coin(Weapon.name[Weapon.merchant[i]].value).carry())
                    break
            }
        }
        vt.outln()
        vt.focus = 'buy'
    }

    function buy() {
        if (/=|max/i.test(vt.entry)) {
            buyall()
            return
        }

        if (vt.entry == '') {
            vt.outln()
            menu(false)
            return
        }

        let buy = +vt.entry >> 0
        if (buy < lo || buy > hi) {
            vt.refocus()
            return
        }
        let cost: Coin
        let item = buy

        switch (want) {
            case 'A':
                cost = new Coin(Armor.name[Armor.merchant[item]].value)
                if ($.player.coin.value + credit.value >= cost.value) {
                    profile({ png: 'payment', effect: 'tada' })
                    sound('click')
                    $.player.armor = Armor.merchant[item]
                    $.player.toAC = 0
                    $.online.toAC = 0
                    vt.out(' - ', $.player.armor, '\n')
                    $.player.coin.value += credit.value - cost.value
                    Armor.equip($.online, $.player.armor)
                }
                break

            case 'M':
                item--
                cost = $.player.magic == 1 ? new Coin(Magic.spells[Magic.merchant[item]].wand)
                    : new Coin(Magic.spells[Magic.merchant[item]].cost)
                if ($.player.coin.value >= cost.value && !Magic.have($.player.spells, buy)) {
                    profile({ png: 'payment', effect: 'tada' })
                    sound('click')
                    Magic.add($.player.spells, buy)
                    vt.out(' - ', Magic.merchant[item], '\n')
                    $.player.coin.value -= cost.value
                    $.online.altered = true
                }
                break

            case 'R':
                cost = new Coin(RealEstate.name[RealEstate.merchant[item]].value)
                if ($.player.coin.value + credit.value >= cost.value) {
                    profile({ png: 'payment', effect: 'tada' })
                    sound('click')
                    $.player.realestate = RealEstate.merchant[item]
                    vt.out(' - ', $.player.realestate, '\n')
                    $.player.coin.value += credit.value - cost.value
                    if (item == lo && $.realestate) $.realestate--
                    $.online.altered = true
                }
                break

            case 'S':
                cost = new Coin(Security.name[Security.merchant[item]].value)
                if ($.player.coin.value + credit.value >= cost.value) {
                    profile({ png: 'payment', effect: 'tada' })
                    sound('click')
                    $.player.security = Security.merchant[item]
                    vt.out(' - ', $.player.security, '\n')
                    $.player.coin.value += credit.value - cost.value
                    if (item == lo && $.security) $.security--
                    $.online.altered = true
                }
                break

            case 'V':
                item--
                cost = $.player.poison == 1 ? new Coin(Poison.vials[Poison.merchant[item]].vial)
                    : new Coin(Poison.vials[Poison.merchant[item]].cost)
                if ($.player.coin.value >= cost.value && !Poison.have($.player.poisons, buy)) {
                    profile({ png: 'payment', effect: 'tada' })
                    sound('click')
                    Poison.add($.player.poisons, buy)
                    vt.out('\nHe slips you a vial of ', Poison.merchant[item], '\n')
                    $.player.coin.value -= cost.value
                    $.online.altered = true
                }
                break

            case 'W':
                cost = new Coin(Weapon.name[Weapon.merchant[buy]].value)
                if ($.player.coin.value + credit.value >= cost.value) {
                    profile({ png: 'payment', effect: 'tada' })
                    sound('click')
                    $.player.weapon = Weapon.merchant[buy]
                    $.player.toWC = 0
                    $.online.toWC = 0
                    vt.out(' - ', $.player.weapon, '\n')
                    $.player.coin.value += credit.value - cost.value
                    Weapon.equip($.online, $.player.weapon)
                }
                break
        }

        menu()
    }

    function buyall() {
        let item: number
        let cost: Coin

        switch (want) {
            case 'A':
                for (item = hi; item >= lo; item--) {
                    cost = new Coin(Armor.name[Armor.merchant[item]].value)
                    if ($.player.coin.value + credit.value >= cost.value) {
                        if (Armor.name[Armor.merchant[item]].ac > $.online.armor.ac
                            || ($.online.armor.ac == Armor.name[Armor.merchant[item]].ac
                                && ($.online.toAC < 0 || $.player.toAC < 0))) {
                            vt.entry = item.toString()
                            vt.out(' ', vt.entry)
                            buy()
                            return
                        }
                    }
                }
                break

            case 'M':
                for (let spell = lo; spell <= hi; spell++) {
                    item = spell - 1
                    cost = $.player.magic == 1 ? new Coin(Magic.spells[Magic.merchant[item]].wand)
                        : new Coin(Magic.spells[Magic.merchant[item]].cost)
                    if ($.player.coin.value >= cost.value && !Magic.have($.player.spells, spell)) {
                        sound('click')
                        Magic.add($.player.spells, spell)
                        vt.out(bracket(spell), Magic.merchant[item])
                        $.player.coin.value -= cost.value
                    }
                }
                $.online.altered = true
                break

            case 'R':
                for (item = hi; item >= lo; item--) {
                    cost = new Coin(RealEstate.name[RealEstate.merchant[item]].value)
                    if ($.player.coin.value + credit.value >= cost.value) {
                        if (RealEstate.name[RealEstate.merchant[item]].protection > RealEstate.name[$.player.realestate].protection) {
                            vt.entry = item.toString()
                            vt.out(' ', vt.entry)
                            buy()
                            return
                        }
                    }
                }
                break

            case 'S':
                for (item = hi; item >= lo; item--) {
                    cost = new Coin(Security.name[Security.merchant[item]].value)
                    if ($.player.coin.value + credit.value >= cost.value) {
                        if (Security.name[Security.merchant[item]].protection > Security.name[$.player.security].protection) {
                            vt.entry = item.toString()
                            vt.out(' ', vt.entry)
                            buy()
                            return
                        }
                    }
                }
                break

            case 'V':
                for (let vial = lo; vial <= hi; vial++) {
                    item = vial - 1
                    cost = $.player.poison == 1 ? new Coin(Poison.vials[Poison.merchant[item]].vial)
                        : new Coin(Poison.vials[Poison.merchant[item]].cost)
                    if ($.player.coin.value >= cost.value && !Poison.have($.player.poisons, vial)) {
                        sound('click')
                        Poison.add($.player.poisons, vial)
                        vt.out('\nHe slips you a vial of ', Poison.merchant[item])
                        $.player.coin.value -= cost.value
                    }
                }
                $.online.altered = true
                break

            case 'W':
                for (item = hi; item >= lo; item--) {
                    cost = new Coin(Weapon.name[Weapon.merchant[item]].value)
                    if ($.player.coin.value + credit.value >= cost.value) {
                        if (Weapon.name[Weapon.merchant[item]].wc > $.online.weapon.wc
                            || ($.online.weapon.wc == Weapon.name[Weapon.merchant[item]].wc
                                && ($.online.toWC < 0 || $.player.toWC < 0))) {
                            vt.entry = item.toString()
                            vt.out(' ', vt.entry)
                            buy()
                            return
                        }
                    }
                }
                break
        }

        vt.out('\n')
        menu()
    }

}

export = Square
