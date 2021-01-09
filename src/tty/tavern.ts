/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  TAVERN authored by: Robert Hurst <theflyingape@gmail.com>                *
\*****************************************************************************/

import fs = require('fs')
import db = require('../db')
import $ = require('../runtime')
import { action, bracket, cat, checkXP, display, loadUser, music, profile, sound, title } from '../io'
import { Coin, Access, Weapon } from '../items'
import { cuss, news } from '../lib'
import { PC } from '../pc'
import { dice, money, int, sprintf, vt, whole } from '../sys'

import Battle = require('../battle')
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

    loadUser($.barkeep)

    export function menu(suppress = true) {
        if (checkXP($.online, menu)) return
        if ($.online.altered) PC.saveUser($.online)
        Taxman.bar()
        if ($.reason) vt.hangup()

        action('tavern')
        vt.form = {
            'menu': { cb: choice, cancel: 'q', enter: '?', eol: false }
        }

        let hints = ''
        if (!suppress) {
            if ($.player.coin.value)
                hints += '> Carrying extra money around here is only good for posting a bounty\n  on someone or buying drinks & tips from the barkeep.\n'
        }
        vt.form['menu'].prompt = display('tavern', vt.Yellow, vt.yellow, suppress, tavern, hints)
        vt.focus = 'menu'
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
                action('freetext')
                vt.form = {
                    'argue': {
                        cb: () => {
                            vt.outln()
                            if (vt.entry.length && !cuss(vt.entry)) {
                                try { js = JSON.parse(fs.readFileSync('./users/arguments.json').toString()) } catch { }
                                js = js.splice(+(js.length > 9), 9).concat(<argument>{ who: $.player.id, text: vt.entry })
                                fs.writeFileSync('./users/arguments.json', JSON.stringify(js))
                                $.argue--
                            }
                            menu()
                        }, prompt: 'Enter your argument', lines: 6, timeout: 600
                    }
                }
                vt.focus = 'argue'
                return

            case 'E':
                try {
                    js = JSON.parse(fs.readFileSync('./users/arguments.json').toString())
                    for (let argument in js) {
                        vt.outln()
                        vt.outln('    -=', bracket(js[argument].who, false), '=-')
                        vt.outln(+argument % 2 ? vt.lyellow : vt.lcyan, js[argument].text)
                    }
                }
                catch (err) {
                    vt.outln(`not available (${err})`)
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

                action('payment')
                vt.form = {
                    'tip': {
                        cb: () => {
                            vt.outln('\n')
                            if ((+vt.entry).toString() == vt.entry) vt.entry += 'c'
                            let tip = (/=|max/i.test(vt.entry)) ? $.player.coin.value : new Coin(vt.entry).value
                            if (tip < 1 || tip > $.player.coin.value) {
                                sound('oops')
                                vt.outln(PC.who($.barkeep).He, 'pours the beer on you and kicks you out of ', $.barkeep.who.his, 'bar.', -1000)
                                $.brawl = 0
                                require('./main').menu(true)
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
                                `Death challenge your gang's leader in the Arena`,
                                'Blessed/Cursed does not carry over to the next day',
                                `Killing the town's barkeep will lose you favor with its folks`,
                                'Deeper dungeon portals is a key to victory',
                                `I'll have more hints tomorrow.  Maybe`
                            ][tip % 22])
                            vt.outln('."', -1000)
                            menu()
                        }, prompt: 'How much will you tip? ', max: 8
                    },
                }
                vt.focus = 'tip'
                return

            case 'L':
                vt.outln(vt.green, '\n        --=:)) Tavern Bounty List ((:=--\n')
                let rs = db.query(`SELECT handle,bounty,who FROM Players WHERE bounty > 0 ORDER BY level DESC`)
                for (let i in rs) {
                    let adversary = <active>{ user: { id: rs[i].who } }
                    loadUser(adversary)
                    let bounty = new Coin(rs[i].bounty)
                    vt.outln(`${rs[i].handle} has a ${bounty.carry()} bounty from ${adversary.user.handle}`)
                }
                vt.form = {
                    'pause': { cb: menu, pause: true }
                }
                vt.focus = 'pause'
                return

            case 'P':
                if (!$.access.roleplay) break
                if ($.player.coin.value < 1) {
                    vt.outln(`\nYou'll need some cash to post a bounty.`)
                    suppress = true
                    break
                }
                if ($.player.novice || $.player.level < 10) {
                    sound('crowd')
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
                    let max = new Coin(new Coin(10 * money(opponent.user.level)).carry(1, true))
                    if (max.value > $.player.coin.value) max = new Coin($.player.coin.carry(1, true))

                    action('payment')
                    vt.form = {
                        'coin': {
                            cb: () => {
                                vt.outln()
                                if ((+vt.entry).toString() == vt.entry) vt.entry += 'c'
                                let post = int((/=|max/i.test(vt.entry)) ? max.value : new Coin(vt.entry).value)
                                if (post > 0 && post <= max.value) {
                                    $.player.coin.value -= post
                                    opponent.user.bounty = new Coin(post)
                                    opponent.user.who = $.player.id
                                    vt.beep()
                                    vt.outln(`\nYour bounty is posted for all to see.`, -500)
                                    news(`\tposted a bounty on ${opponent.user.handle}`)
                                    PC.saveUser(opponent)
                                }
                                menu(true)
                            }, max: 6
                        }
                    }
                    vt.form['coin'].prompt = `Bounty [MAX=${max.carry()}]? `
                    vt.focus = 'coin'
                    return
                })
                return

            case 'S':
                if (!$.access.roleplay) break
                vt.out('\nYou call to Tiny, then ')
                $.tiny--
                switch ($.tiny) {
                    case 2:
                        profile({
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
                        profile({
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
                        music('.')
                        vt.outln(`jest, "What you looking at, wart-face!"`, -1200)
                        profile({
                            jpg: 'npc/barkeep', effect: 'shakeY'
                            , handle: $.barkeep.user.handle, level: $.barkeep.user.level, pc: $.barkeep.user.pc
                        })
                        vt.out('Uh, oh!')
                        sound('ddd', 22)
                        title(`${$.player.handle}: level ${$.player.level} ${$.player.pc} death match with ${$.barkeep.user.handle}`)
                        vt.out('  Here comes Tiny!')
                        sound('challenge', 12)
                        vt.outln(`  And ${PC.who($.barkeep).he}doesn't look friendly...\n`, -600)
                        vt.outln(vt.green, vt.bright, [
                            `"When I'm through with you, your mama won't be able to identify the remains."`,
                            `"I am getting too old for this."`,
                            `"Never rub another man\'s rhubarb!"`][dice(3) - 1], -3000)

                        loadUser($.barkeep)
                        let trophy = JSON.parse(fs.readFileSync(`./files/tavern/trophy.json`).toString())
                        $.barkeep.user.toWC = whole($.barkeep.weapon.wc / 5)
                        if ($.barkeep.weapon.wc < Weapon.merchant.length)
                            $.barkeep.toWC += int((Weapon.merchant.length - $.barkeep.weapon.wc) / 10) + 1

                        vt.outln(`\n${$.barkeep.user.handle} towels ${PC.who($.barkeep).his}hands dry from washing the day\'s\nglasses, ${PC.who($.barkeep).he}warns,\n`)
                        vt.outln(vt.bright, vt.green, '"Another fool said something like that to me, once, and got all busted up."\n', -5000)
                        let fool = <active>{ user: { id: trophy.who, handle: 'a pirate', gender: 'M' } }
                        loadUser(fool)
                        vt.outln(vt.bright, vt.green, `"I think it was ${fool.user.handle}, and it took me a week to clean up the blood!"\n`, -4000)

                        music('tiny')
                        vt.out(`${PC.who($.barkeep).He}points to a buffed weapon hanging over the mantlepiece and says, `
                            , vt.green, vt.bright, '"Lookee\n')
                        vt.outln(`there, ${PC.who(fool).he}tried to use that ${trophy.weapon}`, vt.green, vt.bright, `, but it wasn't enough\nto take me.\"\n`, -6000)
                        vt.out('The patrons move in closer to witness the forthcoming slaughter, except for\n')
                        vt.outln(`${$.taxman.user.handle} who is busy raiding the bar of its beer and nuts.`, -5000)
                        vt.outln(`\nYou hear a cry, "I'll pay fifteen-to-one on the challenger!"`, -4000)
                        sound('crowd')
                        vt.out('The crowd roars with laughter... ', -3000)
                        vt.outln('you are not amused.', -2000)
                        vt.outln(`\n${$.barkeep.user.handle} removes ${PC.who($.barkeep).his}tunic to reveal a massive, but\nheavily scarred chest.`, -2500)
                        vt.out('\nYou look for an exit, but there is none to be found... ', -2500)
                        vt.outln()

                        $.player.coward = true
                        PC.saveUser($.online)
                        $.online.altered = true
                        Battle.engage('Tavern', $.online, $.barkeep, require('./main').menu)
                        return
                }
                break

            case 'B':
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

                    action('ny')
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
                                        action('brawl')
                                        vt.focus = 'punch'
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
                    vt.focus = 'brawl'
                })
                return

            case 'Q':
                require('./main').menu($.player.expert)
                return

            default:
                vt.beep()
                suppress = false
        }
        menu(suppress)
    }

}

export = Tavern
