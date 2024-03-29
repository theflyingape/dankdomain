/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  SQUARE authored by: Robert Hurst <theflyingape@gmail.com>                *
\*****************************************************************************/

import $ = require('./runtime')
import db = require('../db')
import { Armor, Coin, Magic, Poison, Ring, RealEstate, Security, Weapon } from '../items'
import { armor, bracket, carry, display, log, news, pieces, tradein, vt, weapon } from '../lib'
import { PC } from '../pc'
import { elemental } from '../npc'
import { input } from '../player'
import { dice, int, sprintf, uint, whole } from '../sys'
import Battle = require('./battle')

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

    let credit = new Coin()

    let lo = 0, hi = 0, max = 0
    let want = ''

    export function menu(suppress = true) {
        elemental.orders('Square')
        vt.form = {
            'menu': { cb: choice, cancel: 'Q', enter: '?', eol: false }
        }

        if (!$.player.novice && $.player.level > 1 && ($.player.coin.value > 0 || $.player.poisons.length || ($.player.magic < 2 && $.player.spells.length))
            && dice($.online.cha / 3 + 4 * $.player.steal) == 1) {
            let bump = PC.encounter(`AND coward = 0 AND novice = 0 AND (id NOT GLOB '_*' OR id = '_TAX')`
                , $.player.level - 9, $.player.level + 9)
            if (bump.user.id && !bump.user.status) {
                vt.beep()
                vt.outln()
                if (bump.user.id == $.taxman.user.id)
                    vt.profile({ jpg: 'npc/taxman', handle: $.taxman.user.handle, level: $.taxman.user.level, pc: $.taxman.user.pc, effect: 'fadeInLeft' })
                else
                    PC.portrait(bump)
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
                        const v = $.player.coin.pick()
                        bump.user.coin.value += v.value
                        log(bump.user.id, `\nYou picked ${$.player.handle}'s pouch holding ${v.amount}!`)
                        $.player.coin.value -= v.value
                        vt.outln(vt.faint, '{sigh}')
                        vt.sound('oops', 8)
                        vt.outln('Your ', pieces(v.pouch()), ' is gone!')
                    }
                    else if ($.player.poisons.length) {
                        vt.out(vt.faint, '\nYou hear vials rattle.')
                        vt.sleep(800)
                        p = $.player.poisons[dice($.player.poisons.length) - 1]
                        Poison.remove($.player.poisons, p)
                        Poison.add(bump.user.poisons, p)
                        log(bump.user.id, `\nYou lifted a vial of ${Poison.merchant[p - 1]} from ${$.player.handle}!`)
                        vt.sound('oops', 8)
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
                        vt.sound('oops', 8)
                        vt.outln(vt.reset, '  Your ', Magic.merchant[p - 1], ' magic has disappeared!')
                    }
                    PC.save(bump)
                    vt.sleep(800)
                }
                vt.sleep(1600)
                vt.animated('fadeOutRight')
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

        input('menu')
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
                credit.value = ac ? tradein(new Coin(Armor.name[$.player.armor].value).value, $.online.cha + int($.xrate * ($.player.toAC + $.online.toAC) / ac)) : 0n
                vt.outln(' worth ', carry(credit))

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
                credit.value = tradein(new Coin(RealEstate.name[$.player.realestate].value).value)
                credit.value += tradein(new Coin(Security.name[$.player.security].value).value)
                credit.value -= $.player.loan.value
                if (credit.value < credit.COPPER) credit.value = 0n

                vt.action('bank')
                bank['D'] = { description: 'Money in hand: ' + carry($.player.coin, 4) }
                bank['W'] = { description: 'Money in bank: ' + carry($.player.bank, 4) }
                bank['L'] = { description: 'Money on loan: ' + carry($.player.loan, 4) }

                vt.form = {
                    'menu': { cb: Bank, cancel: 'q', enter: '?', eol: false }
                }
                vt.form['menu'].prompt = display('Welcome to the Iron Bank', null, vt.green, false, bank)
                input('menu')
                return

            case 'G':
                vt.action('clear')
                require('./arena').menu($.player.expert)
                return

            case 'H':
                if (!$.access.roleplay) break
                if (Armor.name[$.player.armor].ac == 0 && ($.online.toAC < 0 || $.player.toAC < 0)) {
                    credit = new Coin(BigInt(Math.abs($.online.toAC + $.player.toAC)) * PC.money($.player.level) + 1n)
                    vt.action('yn')
                    vt.form = {
                        'skin': {
                            cb: () => {
                                vt.outln('\n')
                                if (/Y/i.test(vt.entry)) {
                                    PC.payment(credit.value)
                                    $.online.altered = true
                                    $.online.toAC = 0
                                    $.player.toAC = 0
                                }
                                Battle.yourstats()
                                menu()
                                return
                            }, cancel: 'Y', enter: 'Y', max: 1, eol: false, match: /Y|N/i, timeout: 10
                        }
                    }
                    vt.form['skin'].prompt = 'Heal your skin for ' + carry(credit) + ' (Y/N)? '
                    input('skin', 'y')
                    return
                }
                if (Weapon.name[$.player.weapon].wc == 0 && ($.online.toWC < 0 || $.player.toWC < 0)) {
                    credit = new Coin(BigInt(Math.abs($.online.toWC + $.player.toWC)) * PC.money($.player.level) + 1n)
                    vt.action('yn')
                    vt.form = {
                        'hands': {
                            cb: () => {
                                vt.outln('\n')
                                if (/Y/i.test(vt.entry)) {
                                    PC.payment(credit.value)
                                    $.online.altered = true
                                    $.online.toWC = 0
                                    $.player.toWC = 0
                                }
                                Battle.yourstats()
                                menu()
                                return
                            }, cancel: 'Y', enter: 'Y', max: 1, eol: false, match: /Y|N/i, timeout: 10
                        }
                    }
                    vt.form['hands'].prompt = 'Fix your hands for ' + carry(credit) + ' (Y/N)? '
                    input('hands', 'y')
                    return
                }
                hi = $.player.hp - $.online.hp
                if (hi < 1) {
                    vt.beep(true)
                    vt.outln(`\nYou don't need any hit points.`)
                    suppress = true
                    break
                }
                vt.outln('\nWelcome to Butler Hospital.\n')
                vt.outln('Hit points cost ', vt.bright, $.player.level.toString(), vt.normal, ' each.')
                vt.outln('You need ', vt.bright, hi.toString(), vt.normal, ' hit points.')
                lo = int($.player.coin.value / BigInt($.player.level))
                vt.outln('You can afford '
                    , vt.bright, lo < hi ? lo.toString() : 'all your', vt.normal, ' hit points.')
                if (lo < hi) {
                    if ($.player.novice)
                        vt.out('Normally, you would be billed for the remaining ')

                    else
                        vt.out('You can be billed for the remaining ')
                    vt.outln(vt.bright, (hi - lo).toString(), vt.normal, ' hit points.')
                }
                vt.action('listall')
                vt.form = {
                    'hp': {
                        cb: () => {
                            vt.outln()
                            let buy = int(/=|max/i.test(vt.entry) ? hi : vt.entry)
                            if (buy > 0 && buy <= hi) {
                                PC.payment(BigInt(buy * $.player.level))
                                $.online.hp += buy
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
                input('hp', '=')
                return

            case 'J':
                if ($.bail) {
                    vt.profile({ png: 'npc/jailer', effect: 'fadeIn' })
                    vt.outln('\nA deputy greets you in front of the County Jail.')
                    vt.outln(-600, vt.bright, `"What `, ['cur', 'knave', 'scum', 'toad', 'villain'][dice(5) - 1]
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

                        credit.value = PC.money(opponent.user.level) * 100n / BigInt($.online.cha)
                        vt.outln(`It will cost you ${carry(credit)} to bail out ${opponent.user.handle}.`)
                        if ($.player.coin.value < credit.value) {
                            menu()
                            return
                        }

                        vt.action('ny')
                        vt.form = {
                            'pay': {
                                cb: () => {
                                    vt.outln()
                                    if (/Y/i.test(vt.entry)) {
                                        vt.profile({ png: 'payment', effect: 'tada' })
                                        vt.sound('click')
                                        vt.outln(`${opponent.user.handle} is set free.`)
                                        $.player.coin.value -= credit.value
                                        opponent.user.status = ''
                                        opponent.user.xplevel = opponent.user.level
                                        db.run(`UPDATE Players set status='',xplevel=level WHERE id='${opponent.user.id}'`)
                                        log(opponent.user.id, `${$.player.handle} paid ${credit.amount} to bail you out of jail.\n`)
                                        news(`\t${opponent.user.handle} made bail`)
                                        PC.adjust('cha', -1, -1, -1)
                                        $.bail--
                                    }
                                    else
                                        vt.action('fadeOut')
                                    menu()
                                    return
                                }, prompt: 'Will you pay (Y/N)? '
                                , cancel: 'N', enter: 'N', max: 1, eol: false, match: /Y|N/i, timeout: 10
                            }
                        }
                        input('pay', 'y')
                    })
                    return
                }
                vt.outln('The jail house is closed for the day.')
                suppress = true
                break

            case 'M':
                vt.out('\nThe ', vt.blue, vt.bright, 'old mage ', vt.reset)
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
                    suppress = true
                    break
                }
                vt.out(vt.faint, '\nYou attempt to pick a passerby\'s pocket ... ', -1000)

                credit.value = new Coin(BigInt(dice(6)) * PC.money($.player.level) / BigInt(10)).pick().value
                let pocket = PC.encounter(`AND novice = 0 AND id NOT GLOB '_*'`).user
                if (pocket.id) {
                    PC.load(pocket)
                    const v = pocket.coin.pick().value
                    if (v) {
                        credit.value = v
                        pocket.coin.value -= v
                    }
                    else {
                        pocket.id = ''
                        pocket.handle = 'somebody'
                    }
                }
                else
                    pocket.handle = 'somebody'
                vt.outln('\n')
                vt.outln(`You pick ${pocket.handle}'s pocket and steal a `, pieces(credit.pouch()), '!')
                vt.outln(-1000)

                let effort = 100 + $.steal
                effort -= 8 * Ring.power([], $.player.rings, 'steal').power
                if (int(16 * $.player.steal + $.player.level / 10 + $.online.dex / 10) < dice(effort)) {
                    $.player.status = 'jail'
                    $.reason = `caught picking ${pocket.handle}'s pocket`
                    vt.action('clear')
                    vt.profile({ png: 'npc/jailer', effect: 'fadeIn' })
                    vt.outln('A guard catches you and throws you into jail!')
                    vt.sound('arrested', 20)
                    vt.outln('You might be released by your next call.')
                    vt.outln(-1000)
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
                        PC.save(pocket)
                    }
                    suppress = true
                    break
                }

            case 'Q':
                require('./menu').menu($.player.expert)
                return

            case 'R':
                if (!$.access.roleplay) break
                let re = RealEstate.merchant.indexOf($.player.realestate)
                vt.out('\nYou live in a ', $.player.realestate)
                credit.value = tradein(RealEstate.name[$.player.realestate].value)
                vt.outln(' worth ', carry(credit))

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
                let s = Security.merchant.indexOf($.player.security)
                vt.out('\nYou are guarded by a ', $.player.security)
                credit.value = tradein(Security.name[$.player.security].value)
                vt.outln(' worth ', carry(credit))

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
                vt.outln('\n', vt.faint, '... you enter the back door into the shop ...')
                vt.out('The ', vt.magenta, vt.bright, 'apothecary ', vt.reset)
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
                credit.value = wc ? tradein(new Coin(Weapon.name[$.player.weapon].value).value, $.online.cha + int($.xrate * ($.player.toWC + $.online.toWC) / wc)) : 0n
                vt.outln(' worth ', carry(credit))

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
            vt.beep(true)
            vt.refocus()
            return
        }
        vt.form = {
            'coin': { cb: amount, max: 6 }
        }

        vt.outln()

        switch (choice) {
            case 'D':
                vt.action('payment')
                vt.form['coin'].prompt = vt.attr('Deposit ', vt.white, '[', vt.uline, 'MAX', vt.nouline, '=', carry(), ']? ')
                input('coin', '=')
                break

            case 'L':
                vt.action('payment')
                vt.form['coin'].prompt = vt.attr('Loan ', vt.white, '[', vt.uline, 'MAX', vt.nouline, '=', carry(credit), ']? ')
                input('coin', '=')
                break

            case 'W':
                vt.action('payment')
                vt.form['coin'].prompt = vt.attr('Withdraw ', vt.white, '[', vt.uline, 'MAX', vt.nouline, '=', carry($.player.bank), ']? ')
                input('coin', '=')
                break

            case 'R':
                vt.music('ddd')
                let c = ($.player.level / 5) * ($.player.steal + 1)
                vt.out(vt.faint, '\nYou attempt to sneak into the vault ...', vt.reset)
                vt.sleep(2500)

                let effort = 100 + $.steal
                effort -= 8 * Ring.power([], $.player.rings, 'steal').power
                if (dice(effort) > ++c) {
                    $.player.status = 'jail'
                    $.reason = 'caught getting into the vault'
                    vt.action('clear')
                    vt.profile({ png: 'npc/jailer', effect: 'fadeIn' })
                    vt.outln('\n\nA guard catches you and throws you into jail!')
                    vt.sound('arrested', 20)
                    vt.outln('\nYou might be released by your next call.\n')
                    vt.sleep(1000)
                    vt.hangup()
                    return
                }

                let d = $.player.level + 1
                let vault = BigInt(Math.pow(d, 7) * dice(d / 3) * dice(d / 11))
                let loot = new Coin(vault)

                vt.sound('creak2', 12)
                vt.outln(vt.yellow, ' you open a chest and find ', carry(loot), vt.bright, '!')

                let deposits = new Coin(whole(db.query(`SELECT SUM(bank) AS bank FROM Players WHERE id NOT GLOB '_*' AND id <> '${$.player.id}'`)[0].bank))
                if (deposits.value) {
                    vt.sleep(1200)
                    vt.outln('And you grab ', carry(deposits), ' more in deposits!')
                    loot.value += deposits.value
                }
                vt.sound('yahoo', 12)

                vt.outln()
                vt.out(vt.faint, 'You try to make your way out of the vault ')
                vt.sleep(1200)
                for (let i = 0; i < 6 - $.player.steal; i++) {
                    vt.out('.')
                    vt.sound('click', 6)
                }

                c /= 15 - ($.player.steal * 3)
                if (dice(effort) > ++c) {
                    $.player.status = 'jail'
                    $.reason = 'caught inside the vault'
                    vt.out(vt.reset, ' something jingles.')
                    vt.action('clear')
                    vt.sound('max', 12)
                    vt.profile({ png: 'npc/jailer', effect: 'fadeIn' })
                    vt.outln('\n\nA guard laughs as he closes the vault door on you!')
                    vt.sound('arrested', 20)
                    vt.outln('\nYou might be released by your next call.')
                    vt.sleep(1000)
                    vt.hangup()
                    return
                }

                $.player.coin.value += loot.value
                $.player.steals++
                vt.outln()
                db.run(`UPDATE Players SET bank=0 WHERE id NOT GLOB '_*'`)
                vt.beep()
                menu(true)
                break

            case 'T':
                if ($.access.sysop) {
                    vt.form['coin'].prompt = vt.attr('Treasury ', bracket(vt.attr(vt.uline, 'MAX', vt.nouline, '=', vt.bright, '10000', vt.magenta, 'p'), false), '? ')
                    input('coin')
                    break
                }

            case 'Q':
                vt.action('nme')
                menu(suppress)
                break
        }
    }

    function amount() {
        let action = vt.form['coin'].prompt.split(' ')[0]
        let amount = new Coin(vt.entry)

        switch (action) {
            case 'Deposit':
                amount = new Coin(/=|max/i.test(vt.entry) ? $.player.coin.carry() : vt.entry)
                if (amount.value > 0 && amount.value <= $.player.coin.value) {
                    $.player.coin.value -= amount.value
                    if ($.player.loan.value > 0) {
                        let due = $.player.loan.value - amount.value
                        $.player.loan.value = due
                        if (due < 0) $.player.bank.value -= due
                    }
                    else
                        $.player.bank.value += amount.value
                    $.online.altered = true
                    vt.beep()
                }
                break

            case 'Loan':
                amount = new Coin(/=|max/i.test(vt.entry) ? credit.carry() : vt.entry)
                if (amount.value > 0 && amount.value <= credit.value) {
                    $.player.loan.value += amount.value
                    $.player.coin.value += amount.value
                    $.online.altered = true
                    vt.beep()
                }
                break

            case 'Withdraw':
                amount = new Coin(/=|max/i.test(vt.entry) ? $.player.bank.carry() : vt.entry)
                if (amount.value > 0 && amount.value <= $.player.bank.value) {
                    $.player.bank.value -= amount.value
                    $.player.coin.value += amount.value
                    $.online.altered = true
                    vt.beep()
                }
                break

            case 'Treasury':
                amount = new Coin(/=|max/i.test(vt.entry) ? '10000p' : vt.entry)
                if (amount.value > 0) {
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
            vt.action('listall')
        else
            vt.action('listbest')
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
            input('start', '')
        else
            listing()
    }

    function listStart() {
        if (/=|max/i.test(vt.entry)) {
            buyall()
            return
        }

        let n = uint(vt.entry)
        if (n < 1) n = 1
        if ((/R|S/.test(want) && n < lo) || n > max) {
            vt.beep(true)
            vt.refocus()
            return
        }

        lo = n
        input('end', '')
    }

    function listEnd() {
        if (/=|max/i.test(vt.entry)) {
            buyall()
            return
        }

        let n = uint(vt.entry)
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
                    vt.out(carry(new Coin(Armor.name[Armor.merchant[i]].value)))
                    break

                case 'M':
                    if (!Magic.have($.player.spells, i)) {
                        vt.out(bracket(i), sprintf('%-24s ', Magic.merchant[i - 1]))
                        if ($.player.magic == 1)
                            vt.out(carry(new Coin(Magic.spells[Magic.merchant[i - 1]].wand)))
                        else
                            vt.out(carry(new Coin(Magic.spells[Magic.merchant[i - 1]].cost)))
                    }
                    break

                case 'R':
                    vt.out(bracket(i), sprintf('%-24s ', RealEstate.merchant[i]))
                    vt.out(carry(new Coin(RealEstate.name[RealEstate.merchant[i]].value)))
                    break

                case 'S':
                    vt.out(bracket(i), sprintf('%-24s ', Security.merchant[i]))
                    vt.out(carry(new Coin(Security.name[Security.merchant[i]].value)))
                    break

                case 'V':
                    if (!Poison.have($.player.poisons, i)) {
                        vt.out(bracket(i), sprintf('%-24s ', Poison.merchant[i - 1]))
                        if ($.player.poison == 1)
                            vt.out(carry(new Coin(Poison.vials[Poison.merchant[i - 1]].vial)))
                        else
                            vt.out(carry(new Coin(Poison.vials[Poison.merchant[i - 1]].cost)))
                    }
                    break

                case 'W':
                    vt.out(bracket(i), sprintf('%-24s ', Weapon.merchant[i]))
                    vt.out(carry(new Coin(Weapon.name[Weapon.merchant[i]].value)))
                    break
            }
        }
        vt.outln()
        input('buy', '=')
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

        let buy = uint(vt.entry)
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
                    vt.profile({ png: 'payment', effect: 'tada' })
                    vt.sound('click')
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
                    vt.profile({ png: 'payment', effect: 'tada' })
                    vt.sound('click')
                    Magic.add($.player.spells, buy)
                    vt.out(' - ', Magic.merchant[item], '\n')
                    $.player.coin.value -= cost.value
                    $.online.altered = true
                }
                break

            case 'R':
                cost = new Coin(RealEstate.name[RealEstate.merchant[item]].value)
                if ($.player.coin.value + credit.value >= cost.value) {
                    vt.profile({ png: 'payment', effect: 'tada' })
                    vt.sound('click')
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
                    vt.profile({ png: 'payment', effect: 'tada' })
                    vt.sound('click')
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
                    vt.profile({ png: 'payment', effect: 'tada' })
                    vt.sound('click')
                    Poison.add($.player.poisons, buy)
                    vt.out('\nHe slips you a vial of ', Poison.merchant[item], '\n')
                    $.player.coin.value -= cost.value
                    $.online.altered = true
                }
                break

            case 'W':
                cost = new Coin(Weapon.name[Weapon.merchant[buy]].value)
                if ($.player.coin.value + credit.value >= cost.value) {
                    vt.profile({ png: 'payment', effect: 'tada' })
                    vt.sound('click')
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
                        vt.sound('click')
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
                        vt.sound('click')
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
