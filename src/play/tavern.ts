/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  TAVERN authored by: Robert Hurst <theflyingape@gmail.com>                *
\*****************************************************************************/

import $ = require('./runtime')
import db = require('../db')
import { Access, Coin, Weapon } from '../items'
import { bracket, carry, cat, display, news, vt } from '../lib'
import { PC } from '../pc'
import { elemental } from '../npc'
import { checkXP, input } from '../player'
import { cuss, dice, fs, int, pathTo, sprintf, uint, whole } from '../sys'
import Battle = require('./battle')
import Taxman = require('./taxman')

module Tavern {

    let tavern: choices = {
        'B': { description: 'Brawl another user' },
        'E': { description: 'Eavesdrop on the arguments' },
        'J': { description: 'Jump into the arguments' },
        'G': { description: 'Guzzle beer' },
        'L': { description: 'List user bounties' },
        'P': { description: 'Post your own bounty' },
        'S': { description: 'Swear at Tiny' },
        'T': { description: `Today's news` },
        'Y': { description: `Yesterday's news` }
    }

    const file = pathTo('users', 'arguments.json')
    const mantle = pathTo('files/tavern', 'trophy.json')

    export function menu(suppress = true) {
        if (checkXP($.online, menu)) return
        if ($.online.altered) PC.save()
        Taxman.bar()
        if ($.reason) vt.hangup()

        elemental.orders('Tavern')
        vt.form = {
            'menu': { cb: choice, cancel: 'q', enter: '?', eol: false }
        }

        let hints = ''
        if (!suppress) {
            if ($.player.coin.value)
                hints += '> Carrying extra money around here is only good for posting a bounty\n  on someone or buying drinks & tips from the barkeep.\n'
        }
        vt.form['menu'].prompt = display('tavern', vt.Yellow, vt.yellow, suppress, tavern, hints)
        input('menu')
    }

    function choice() {
        let js: argument[] = []
        let suppress = false
        let choice = vt.entry.toUpperCase()
        if (tavern[choice]?.description) {
            vt.out(' - ', tavern[choice].description)
            suppress = $.player.expert
        }
        vt.outln()

        switch (choice) {
            case 'J':
                if (!$.argue) {
                    vt.outln(`\nYou've made your argument already -- go have a beer.`)
                    suppress = true
                    break
                }
                vt.action('freetext')
                vt.form = {
                    'argue': {
                        cb: () => {
                            vt.outln()
                            if (vt.entry.length && !cuss(vt.entry)) {
                                try { js = JSON.parse(fs.readFileSync(file).toString()) } catch { }
                                js = js.splice(+(js.length > 9), 9).concat(<argument>{ who: $.player.id, text: vt.entry })
                                fs.writeFileSync(file, JSON.stringify(js))
                                $.argue--
                            }
                            menu()
                        }, prompt: 'Enter your argument', lines: 6, timeout: 600
                    }
                }
                input('argue', '')
                return

            case 'E':
                try {
                    js = JSON.parse(fs.readFileSync(file).toString())
                }
                catch (err) {
                    js = [{ who: 'YOU', text: 'Feel free to jump in to post something!' }]
                }
                for (let argument in js) {
                    vt.outln()
                    vt.outln('    -=', bracket(js[argument].who, false), '=-')
                    vt.outln(+argument % 2 ? vt.lyellow : vt.lcyan, js[argument].text)
                }
                suppress = true
                break

            case 'T':
                cat('tavern/today')
                suppress = true
                break

            case 'Y':
                cat('tavern/yesterday')
                suppress = true
                break

            case 'G':
                vt.outln(`\n${$.barkeep.user.handle} pours you a beer.`, -500)

                vt.action('payment')
                vt.form = {
                    'tip': {
                        cb: () => {
                            vt.outln('\n')
                            let tip = (/=|max/i.test(vt.entry)) ? $.player.coin.value : new Coin(vt.entry).value
                            if (tip < 1 || tip > $.player.coin.value) {
                                vt.sound('oops')
                                vt.outln(PC.who($.barkeep).He, 'pours the beer on you and kicks you out of ', $.barkeep.who.his, 'bar.', -1000)
                                $.brawl = 0
                                require('./menu').menu(true)
                                return
                            }
                            vt.beep()
                            vt.out(vt.yellow, PC.who($.barkeep).He, 'grunts and hands you your beer.')
                            if ($.player.emulation == 'XT') vt.out(' \u{1F37A}')
                            vt.outln(-1000)
                            $.online.altered = true
                            $.player.coin.value -= tip
                            vt.out(vt.green, PC.who($.barkeep).He, 'says, ', vt.white, '"', [
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
                                `Death match if you take on your gang's leader in the Arena`,
                                'Blessed/Cursed does not carry over to the next day',
                                `Killing the town's barkeep will lose you favor with its folks`,
                                'Deeper dungeon portals is the key to victory',
                                `I'll have more hints tomorrow.  Maybe`
                            ][uint(<unknown>(tip % 22n))])
                            vt.outln('."', -1000)
                            menu()
                        }, prompt: 'How much will you tip? ', max: 8
                    },
                }
                input('tip', dice(22).toString())
                return

            case 'L':
                vt.outln(vt.green, '\n        --=:)) ', vt.bright, 'Tavern Bounty List', vt.normal, ' ((:=--\n')
                let rs = db.query(`SELECT id,handle,bounty,who FROM Players WHERE bounty > 0 ORDER BY level DESC`)
                for (let i in rs) {
                    let adversary = <active>{ user: { id: rs[i].who } }
                    PC.load(adversary)
                    let bounty = new Coin(rs[i].bounty)
                    vt.outln(rs[i].handle, ' has a ', carry(bounty), ' bounty posted by ', vt.bright, adversary.user.handle)
                }
                vt.form = {
                    'pause': { cb: menu, pause: true }
                }
                input('pause', '')
                return

            case 'P':
                if (!$.access.roleplay) break
                if ($.player.coin.value < $.player.coin.COPPER) {
                    vt.outln(`\nYou'll need some cash to post a bounty.`)
                    suppress = true
                    break
                }
                if ($.player.novice || $.player.level < 10) {
                    vt.sound('crowd')
                    vt.outln('\nThe crowd laughs at your gesture.', -1000)
                    vt.outln(`${$.barkeep.user.handle} snorts, "Be for real."`)
                    suppress = true
                    break
                }
                Battle.user('Bounty', (opponent: active) => {
                    if (opponent.user.id == '' || opponent.user.id == $.player.id) {
                        menu()
                        return
                    }
                    vt.outln()
                    if (opponent.user.bounty.value) {
                        vt.outln(`${opponent.user.handle} already has a bounty posted.`)
                        menu()
                        return
                    }
                    let max = new Coin(10n * PC.money(opponent.user.level)).pick(1)
                    if (max.value > $.player.coin.value) max.value = $.player.coin.pick(1).value

                    vt.action('payment')
                    vt.form = {
                        'coin': {
                            cb: () => {
                                vt.outln()
                                if ((+vt.entry).toString() == vt.entry) vt.entry += 'c'
                                let post = /=|max/i.test(vt.entry) ? max.value : new Coin(vt.entry).value
                                if (post > 0 && post <= max.value) {
                                    $.player.coin.value -= post
                                    opponent.user.bounty = new Coin(post)
                                    opponent.user.who = $.player.id
                                    vt.beep()
                                    vt.outln(`\nYour bounty is posted for all to see.`, -500)
                                    news(`\tposted a bounty on ${opponent.user.handle}`)
                                    PC.save(opponent)
                                }
                                menu(true)
                            }, max: 6
                        }
                    }
                    vt.form['coin'].prompt = `Bounty [MAX=${carry(max)}]? `
                    input('coin', '=')
                    return
                })
                return

            case 'S':
                if (!$.access.roleplay) break
                vt.out('\nYou call to Tiny, then ')
                $.tiny--
                switch ($.tiny) {
                    case 2:
                        vt.profile({
                            jpg: 'npc/barkeep', effect: 'fadeInRight'
                            , handle: $.barkeep.user.handle, level: $.barkeep.user.level, pc: $.barkeep.user.pc
                        })
                        vt.outln('yell, "Freak!"', -1000)
                        if ($.player.level < 60)
                            vt.outln('The barkeep stares off into empty space, ignoring your wimpy comment.')
                        else
                            vt.outln(`The barkeep points at ${PC.who($.barkeep).his}massive, flexed bicep and laughs at your jest.`)
                        suppress = true
                        break

                    case 1:
                        vt.profile({
                            jpg: 'npc/barkeep', effect: 'shakeX'
                            , handle: $.barkeep.user.handle, level: $.barkeep.user.level, pc: $.barkeep.user.pc
                        })
                        vt.outln('thumb your nose.', -1000)
                        if ($.player.level < 60)
                            vt.outln(`Annoyed, the barkeep looks down at ${PC.who($.barkeep).his}furry feet and counts, \"100, 99, 98,...\"`)
                        else
                            vt.outln(`The former Champion Ogre grunts to ${PC.who($.barkeep).self} "Not good for business."`)
                        suppress = true
                        break

                    default:
                        $.brawl = 0
                        vt.music()
                        vt.outln(`jest, "What you looking at, wart-face!"`, -1200)
                        vt.profile({
                            jpg: 'npc/barkeep', effect: 'shakeY'
                            , handle: $.barkeep.user.handle, level: $.barkeep.user.level, pc: $.barkeep.user.pc
                        })
                        vt.out('Uh, oh!')
                        vt.sound('ddd', 22)
                        vt.title(`${$.player.handle}: level ${$.player.level} ${$.player.pc} death match with ${$.barkeep.user.handle}`)
                        vt.out('  Here comes Tiny!')
                        vt.sound('challenge', 12)
                        vt.outln(`  And ${PC.who($.barkeep).he}doesn't look friendly...\n`, -600)
                        vt.outln(vt.green, vt.bright, [
                            `"When I'm through with you, your mama won't be able to identify the remains."`,
                            `"I am getting too old for this."`,
                            `"Never rub another man\'s rhubarb!"`][dice(3) - 1], -3000)

                        PC.load($.barkeep)
                        let trophy = JSON.parse(fs.readFileSync(mantle).toString())
                        $.barkeep.user.toWC = uint($.barkeep.weapon.wc / 5)
                        if ($.barkeep.weapon.wc < Weapon.merchant.length)
                            $.barkeep.toWC += int((Weapon.merchant.length - $.barkeep.weapon.wc) / 10) + 1

                        vt.outln(`\n${$.barkeep.user.handle} towels ${PC.who($.barkeep).his}hands dry from washing the day\'s\nglasses, ${PC.who($.barkeep).he}warns,\n`)
                        vt.outln(vt.green, vt.bright, '"Another fool said something like that to me, once, and got all busted up."\n', -5000)
                        let fool = <active>{ user: { id: trophy.who, handle: 'a pirate', gender: 'M' } }
                        PC.load(fool)
                        vt.outln(vt.green, vt.bright, `"I think it was ${fool.user.handle}, and it took me a week to clean up the blood!"\n`, -4000)

                        vt.music('tiny')
                        vt.out(`${PC.who($.barkeep).He}points to a buffed weapon hanging over the mantlepiece and says, `
                            , vt.green, vt.bright, '"Lookee\n')
                        vt.outln(`there, ${PC.who(fool).he}tried to use that ${trophy.weapon}`, vt.green, vt.bright, `, but it wasn't enough\nto take me.\"\n`, -6000)
                        vt.out('The patrons move in closer to witness the forthcoming slaughter, except for\n')
                        vt.outln(`${$.taxman.user.handle} who is busy raiding the bar of its beer and nuts.`, -5000)
                        vt.outln(`\nYou hear a cry, "I'll pay fifteen-to-one on the challenger!"`, -4000)
                        vt.sound('crowd')
                        vt.out('The crowd roars with laughter... ', -3000)
                        vt.outln('you are not amused.', -2000)
                        vt.outln(`\n${$.barkeep.user.handle} removes ${PC.who($.barkeep).his}tunic to reveal a massive, but\nheavily scarred chest.`, -2500)
                        vt.out('\nYou look for an exit, but there is none to be found... ', -2500)
                        vt.outln()

                        $.player.coward = true
                        PC.save()
                        $.online.altered = true
                        Battle.engage('Tavern', $.online, $.barkeep, require('./menu').menu)
                        return
                }
                break

            case 'B':
                if (!$.access.roleplay) break
                if (!$.brawl) {
                    vt.outln('\nYou have run out of brawls.')
                    break
                }
                $.online.bp = $.online.hp > 9 ? int($.online.hp / 10) : 1
                Battle.user('Brawl', (opponent: active) => {
                    if (opponent.user.id == '') {
                        menu(true)
                        return
                    }
                    vt.outln()
                    if (opponent.user.id == $.player.id) {
                        vt.outln('You want to hit yourself?')
                        menu(true)
                        return
                    }
                    if ($.player.level - opponent.user.level > 3) {
                        vt.outln('You can only brawl someone higher or up to three levels below you.')
                        menu(true)
                        return
                    }
                    vt.outln(vt.green, 'Name: ', vt.white, sprintf('%-22s      You:', opponent.user.handle))
                    vt.outln(vt.green, 'Level: ', vt.white, sprintf('%-22d     %-2d', opponent.user.level, $.player.level))
                    vt.outln(vt.green, 'Knock out points: ', vt.white, sprintf('%-15d %-3d', opponent.bp, $.online.bp))
                    if (!Access.name[opponent.user.access].roleplay) {
                        vt.outln('\nYou are allowed only to brawl other players.')
                        if (opponent.user.id[0] == '_') {
                            PC.adjust('cha', -2, -1)
                            $.player.coward = true
                        }
                        menu(true)
                        return
                    }
                    if (!db.lock(opponent.user.id)) {
                        vt.beep()
                        vt.outln(vt.cyan, vt.faint, `\n${PC.who(opponent).He}is currently engaged elsewhere and not available.`)
                        menu(true)
                        return
                    }

                    vt.action('ny')
                    vt.form = {
                        'brawl': {
                            cb: () => {
                                vt.outln('\n')
                                if (/Y/i.test(vt.entry)) {
                                    $.brawl--
                                    if (($.online.dex / 2 + dice($.online.dex / 2)) > (opponent.dex / 2 + dice(opponent.dex / 2))) {
                                        vt.outln('You get the first punch.')
                                        Battle.brawl($.online, opponent)
                                    }
                                    else
                                        vt.outln(`${PC.who(opponent).He}gets the first punch.`)
                                    if ($.online.bp > 0 && opponent.bp > 0)
                                        Battle.brawl(opponent, $.online)
                                    if ($.online.bp > 0 && opponent.bp > 0) {
                                        vt.action('brawl')
                                        input('punch', 2 * $.online.bp < opponent.bp ? 'p' : 'g')
                                    }
                                    else
                                        menu($.player.expert)
                                }
                                else
                                    menu($.player.expert)
                            }, prompt: 'Are you sure (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                        },
                        'punch': {
                            cb: () => {
                                vt.outln()
                                if (/P/i.test(vt.entry)) {
                                    Battle.brawl($.online, opponent)
                                    if ($.online.bp > 0 && opponent.bp > 0)
                                        Battle.brawl(opponent, $.online)
                                }
                                if (/G/i.test(vt.entry)) {
                                    db.unlock($.player.id, true)
                                    vt.outln(`\nWe can't all be Rocky, eh?`)
                                    menu($.player.expert)
                                    return
                                }
                                if (/Y/i.test(vt.entry))
                                    vt.outln(`\nYour knock out points: ${$.online.bp}`)
                                if ($.online.bp > 0 && opponent.bp > 0)
                                    vt.refocus()
                                else {
                                    db.unlock($.player.id, true)
                                    menu($.player.expert)
                                }
                            }, prompt: vt.attr(bracket('P', false), vt.cyan, `unch ${PC.who(opponent).him}`, bracket('G', false), vt.cyan, 'ive it up, ', bracket('Y', false), vt.cyan, 'our status: ')
                            , cancel: 'G', enter: 'P', eol: false, match: /P|G|Y/i, timeout: 30
                        }
                    }
                    input('brawl', 'y')
                })
                return

            case 'Q':
                require('./menu').menu($.player.expert)
                return

            default:
                vt.beep()
                suppress = false
        }
        menu(suppress)
    }

}

export = Tavern
