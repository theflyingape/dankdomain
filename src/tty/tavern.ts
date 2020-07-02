/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  TAVERN authored by: Robert Hurst <theflyingape@gmail.com>                *
\*****************************************************************************/

import $ = require('../common')
import fs = require('fs')
import xvt = require('xvt')
import Battle = require('../battle')
import Taxman = require('./taxman')
import { isNotEmpty } from 'class-validator'
import { sprintf } from 'sprintf-js'

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

    $.loadUser($.barkeep)

    export function menu(suppress = true) {
        if ($.checkXP($.online, menu)) return
        if ($.online.altered) $.saveUser($.online)
        Taxman.bar()
        if ($.reason) xvt.hangup()

        $.action('tavern')
        xvt.app.form = {
            'menu': { cb: choice, cancel: 'q', enter: '?', eol: false }
        }

        let hints = ''
        if (!suppress) {
            if ($.player.coin.value)
                hints += '> Carrying extra money around here is only good for posting a bounty\n  on someone or buying drinks & tips from the barkeep.\n'
        }
        xvt.app.form['menu'].prompt = $.display('tavern', xvt.Yellow, xvt.yellow, suppress, tavern, hints)
        xvt.app.focus = 'menu'
    }

    function choice() {
        let js: argument[] = []
        let suppress = false
        let choice = xvt.entry.toUpperCase()
        if (isNotEmpty(tavern[choice]))
            if (isNotEmpty(tavern[choice].description)) {
                xvt.out(' - ', tavern[choice].description)
                suppress = $.player.expert
            }
        xvt.outln()

        switch (choice) {
            case 'J':
                if (!$.argue) {
                    xvt.outln(`\nYou've made your argument already -- go have a beer.`)
                    suppress = true
                    break
                }
                xvt.app.form = {
                    'argue': {
                        cb: () => {
                            xvt.outln()
                            if (xvt.entry.length && !$.cuss(xvt.entry)) {
                                try { js = JSON.parse(fs.readFileSync('./users/arguments.json').toString()) } catch { }
                                js = js.splice(+(js.length > 9), 9).concat(<argument>{ who: $.player.id, text: xvt.entry })
                                fs.writeFileSync('./users/arguments.json', JSON.stringify(js))
                                $.argue--
                            }
                            menu()
                        }, prompt: 'Enter your argument', lines: 6, timeout: 600
                    }
                }
                xvt.app.focus = 'argue'
                return

            case 'E':
                try {
                    js = JSON.parse(fs.readFileSync('./users/arguments.json').toString())
                    for (let argument in js) {
                        xvt.outln()
                        xvt.outln('    -=', $.bracket(js[argument].who, false), '=-')
                        xvt.outln(+argument % 2 ? xvt.lyellow : xvt.lcyan, js[argument].text)
                    }
                }
                catch (err) {
                    xvt.outln(`not available (${err})`)
                }
                suppress = true
                break

            case 'T':
                $.cat('tavern/today')
                suppress = true
                break

            case 'Y':
                $.cat('tavern/yesterday')
                suppress = true
                break

            case 'G':
                xvt.outln(`\n${$.barkeep.user.handle} pours you a beer.`, -500)

                $.action('payment')
                xvt.app.form = {
                    'tip': {
                        cb: () => {
                            xvt.outln('\n')
                            if ((+xvt.entry).toString() == xvt.entry) xvt.entry += 'c'
                            let tip = (/=|max/i.test(xvt.entry)) ? $.player.coin.value : new $.coins(xvt.entry).value
                            if (tip < 1 || tip > $.player.coin.value) {
                                $.sound('oops')
                                xvt.outln($.PC.who($.barkeep).He, 'pours the beer on you and kicks you out of ', $.barkeep.who.his, 'bar.', -1000)
                                $.brawl = 0
                                require('./main').menu(true)
                                return
                            }
                            xvt.beep()
                            xvt.out(xvt.yellow, $.PC.who($.barkeep).He, 'grunts and hands you your beer.')
                            if ($.player.emulation == 'XT') xvt.out(' \u{1F37A}')
                            xvt.outln(-1000)
                            $.online.altered = true
                            $.player.coin.value -= tip
                            xvt.out(xvt.green, $.PC.who($.barkeep).He, 'says, ', xvt.white, '"', [
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
                            xvt.outln('."', -1000)
                            menu()
                        }, prompt: 'How much will you tip? ', max: 8
                    },
                }
                xvt.app.focus = 'tip'
                return

            case 'L':
                xvt.outln(xvt.green, '\n        --=:)) Tavern Bounty List ((:=--\n')
                let rs = $.query(`SELECT handle,bounty,who FROM Players WHERE bounty > 0 ORDER BY level DESC`)
                for (let i in rs) {
                    let adversary = <active>{ user: { id: rs[i].who } }
                    $.loadUser(adversary)
                    let bounty = new $.coins(rs[i].bounty)
                    xvt.outln(`${rs[i].handle} has a ${bounty.carry()} bounty from ${adversary.user.handle}`)
                }
                xvt.app.form = {
                    'pause': { cb: menu, pause: true }
                }
                xvt.app.focus = 'pause'
                return

            case 'P':
                if (!$.access.roleplay) break
                if ($.player.coin.value < 1) {
                    xvt.outln(`\nYou'll need some cash to post a bounty.`)
                    suppress = true
                    break
                }
                if ($.player.novice || $.player.level < 10) {
                    $.sound('crowd')
                    xvt.outln('\nThe crowd laughs at your gesture.', -1000)
                    xvt.outln(`${$.barkeep.user.handle} snorts, "Be for real."`)
                    suppress = true
                    break
                }
                Battle.user('Bounty', (opponent: active) => {
                    if (opponent.user.id == '' || opponent.user.id == $.player.id) {
                        menu()
                        return
                    }
                    xvt.outln()
                    if (opponent.user.bounty.value) {
                        xvt.outln(`${opponent.user.handle} already has a bounty posted.`)
                        menu()
                        return
                    }
                    let max = new $.coins(new $.coins(10 * $.money(opponent.user.level)).carry(1, true))
                    if (max.value > $.player.coin.value) max = new $.coins($.player.coin.carry(1, true))

                    $.action('payment')
                    xvt.app.form = {
                        'coin': {
                            cb: () => {
                                xvt.outln()
                                if ((+xvt.entry).toString() == xvt.entry) xvt.entry += 'c'
                                let post = $.int((/=|max/i.test(xvt.entry)) ? max.value : new $.coins(xvt.entry).value)
                                if (post > 0 && post <= max.value) {
                                    $.player.coin.value -= post
                                    opponent.user.bounty = new $.coins(post)
                                    opponent.user.who = $.player.id
                                    $.beep()
                                    xvt.outln(`\nYour bounty is posted for all to see.`, -500)
                                    $.news(`\tposted a bounty on ${opponent.user.handle}`)
                                    $.saveUser(opponent)
                                }
                                menu(true)
                            }, max: 6
                        }
                    }
                    xvt.app.form['coin'].prompt = `Bounty [MAX=${max.carry()}]? `
                    xvt.app.focus = 'coin'
                    return
                })
                return

            case 'S':
                if (!$.access.roleplay) break
                xvt.out('\nYou call to Tiny, then ')
                $.tiny--
                switch ($.tiny) {
                    case 2:
                        $.profile({
                            jpg: 'npc/barkeep', effect: 'fadeInRight'
                            , handle: $.barkeep.user.handle, level: $.barkeep.user.level, pc: $.barkeep.user.pc
                        })
                        xvt.outln('yell, "Freak!"', -1000)
                        if ($.player.level < 60)
                            xvt.outln('The barkeep stares off into empty space, ignoring your wimpy comment.')
                        else
                            xvt.outln(`The barkeep points at ${$.PC.who($.barkeep).he}massive, flexed bicep and laughs at your jest.`)
                        suppress = true
                        break

                    case 1:
                        $.profile({
                            jpg: 'npc/barkeep', effect: 'shakeX'
                            , handle: $.barkeep.user.handle, level: $.barkeep.user.level, pc: $.barkeep.user.pc
                        })
                        xvt.outln('thumb your nose.', -1000)
                        if ($.player.level < 60)
                            xvt.outln(`Annoyed, the barkeep looks down at ${$.PC.who($.barkeep).his}furry feet and counts, \"100, 99, 98,...\"`)
                        else
                            xvt.outln(`The former Champion Ogre grunts to ${$.PC.who($.barkeep).self} "Not good for business."`)
                        suppress = true
                        break

                    default:
                        $.brawl = 0
                        $.action('clear')
                        $.music('.')
                        xvt.outln(`jest, "What you looking at, wart-face!"`, -1200)
                        xvt.out('Uh, oh!')
                        $.sound('ddd', 22)
                        $.profile({
                            jpg: 'npc/barkeep', effect: 'shakeY'
                            , handle: $.barkeep.user.handle, level: $.barkeep.user.level, pc: $.barkeep.user.pc
                        })
                        $.title(`${$.player.handle}: level ${$.player.level} ${$.player.pc} death match with ${$.barkeep.user.handle}`)
                        xvt.out('  Here comes Tiny!')
                        $.sound('challenge', 12)
                        xvt.outln(`  And ${$.PC.who($.barkeep).he}doesn't look friendly...\n`, -600)
                        xvt.outln(xvt.green, xvt.bright, [
                            `"When I'm through with you, your mama won't be able to identify the remains."`,
                            `"I am getting too old for this."`,
                            `"Never rub another man\'s rhubarb!"`][$.dice(3) - 1], -3000)

                        $.loadUser($.barkeep)
                        $.barkeep.toWC += $.Weapon.merchant.length - $.barkeep.weapon.wc
                        $.barkeep.toAC += $.Armor.merchant.length - $.barkeep.armor.ac
                        $.barkeep.user.spells = JSON.parse(fs.readFileSync('./users/barkeep.json').toString()).spells
                        xvt.outln(`\n${$.barkeep.user.handle} towels ${$.PC.who($.barkeep).his}hands dry from washing the day\'s\nglasses, ${$.PC.who($.barkeep).he}warns,\n`)
                        xvt.outln(xvt.bright, xvt.green, '"Another fool said something like that to me, once, and got all busted up."\n', -5000)
                        let fool = <active>{ user: { id: $.barkeep.user.status, gender: 'M' } }
                        if ($.barkeep.user.status) {
                            $.loadUser(fool)
                            xvt.outln(xvt.bright, xvt.green, `"I think it was ${fool.user.handle}, and it took me a week to clean up the blood!"\n`, -4000)
                        }

                        $.music('tiny')
                        xvt.out(`${$.PC.who($.barkeep).He}points to a buffed weapon hanging over the mantlepiece and says, `
                            , xvt.green, xvt.bright, '"Lookee\n')
                        xvt.outln(`there, ${$.PC.who(fool).he}tried to use that ${$.PC.weapon($.barkeep)}, but it wasn't enough\nto take me.\"\n`, -6000)
                        xvt.out('The patrons move in closer to witness the forthcoming slaughter, except for\n')
                        xvt.outln(`${$.taxman.user.handle} who is busy raiding the bar of its beer and nuts.`, -5000)
                        xvt.outln(`\nYou hear a cry, "I'll pay fifteen-to-one on the challenger!"`, -4000)
                        $.sound('crowd')
                        xvt.out('The crowd roars with laughter... ', -3000)
                        xvt.outln('you are not amused.', -2000)
                        xvt.outln(`\n${$.barkeep.user.handle} removes ${$.PC.who($.barkeep).his}tunic to reveal a massive, but\nheavily scarred chest.`, -2500)
                        xvt.out('\nYou look for an exit, but there is none to be found... ', -2500)
                        xvt.outln()

                        $.player.coward = true
                        $.saveUser($.online)
                        $.online.altered = true
                        Battle.engage('Tavern', $.online, $.barkeep, require('./main').menu)
                        return
                }
                break

            case 'B':
                if (!$.brawl) {
                    xvt.outln('\nYou have run out of brawls.')
                    break
                }
                $.online.bp = $.online.hp > 9 ? $.int($.online.hp / 10) : 1
                Battle.user('Brawl', (opponent: active) => {
                    if (opponent.user.id == '') {
                        menu(true)
                        return
                    }
                    xvt.outln()
                    if (opponent.user.id == $.player.id) {
                        xvt.outln('You want to hit yourself?')
                        menu(true)
                        return
                    }
                    if ($.player.level - opponent.user.level > 3) {
                        xvt.outln('You can only brawl someone higher or up to three levels below you.')
                        menu(true)
                        return
                    }
                    xvt.outln(xvt.green, 'Name: ', xvt.white, sprintf('%-22s      You:', opponent.user.handle))
                    xvt.outln(xvt.green, 'Level: ', xvt.white, sprintf('%-22d     %-2d', opponent.user.level, $.player.level))
                    xvt.outln(xvt.green, 'Knock out points: ', xvt.white, sprintf('%-15d %-3d', opponent.bp, $.online.bp))
                    if (!$.Access.name[opponent.user.access].roleplay) {
                        xvt.outln('\nYou are allowed only to brawl other players.')
                        if (opponent.user.id[0] == '_') {
                            $.PC.adjust('cha', -2, -1)
                            $.player.coward = true
                        }
                        menu(true)
                        return
                    }
                    if (!$.lock(opponent.user.id)) {
                        $.beep()
                        xvt.outln(xvt.cyan, xvt.faint, `\n${$.PC.who(opponent).He}is currently engaged elsewhere and not available.`)
                        menu(true)
                        return
                    }

                    $.action('ny')
                    xvt.app.form = {
                        'brawl': {
                            cb: () => {
                                xvt.outln('\n')
                                if (/Y/i.test(xvt.entry)) {
                                    $.brawl--
                                    if (($.online.dex / 2 + $.dice($.online.dex / 2)) > (opponent.dex / 2 + $.dice(opponent.dex / 2))) {
                                        xvt.outln('You get the first punch.')
                                        Battle.brawl($.online, opponent)
                                    }
                                    else
                                        xvt.outln(`${$.PC.who(opponent).He}gets the first punch.`)
                                    if ($.online.bp > 0 && opponent.bp > 0)
                                        Battle.brawl(opponent, $.online)
                                    if ($.online.bp > 0 && opponent.bp > 0) {
                                        $.action('brawl')
                                        xvt.app.focus = 'punch'
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
                                xvt.outln()
                                if (/P/i.test(xvt.entry)) {
                                    Battle.brawl($.online, opponent)
                                    if ($.online.bp > 0 && opponent.bp > 0)
                                        Battle.brawl(opponent, $.online)
                                }
                                if (/G/i.test(xvt.entry)) {
                                    $.unlock($.player.id, true)
                                    xvt.outln(`\nWe can't all be Rocky, eh?`)
                                    menu($.player.expert)
                                    return
                                }
                                if (/Y/i.test(xvt.entry))
                                    xvt.outln(`\nYour knock out points: ${$.online.bp}`)
                                if ($.online.bp > 0 && opponent.bp > 0)
                                    xvt.app.refocus()
                                else {
                                    $.unlock($.player.id, true)
                                    menu($.player.expert)
                                }
                            }, prompt: xvt.attr($.bracket('P', false), xvt.cyan, `unch ${$.PC.who(opponent).him}`, $.bracket('G', false), xvt.cyan, 'ive it up, ', $.bracket('Y', false), xvt.cyan, 'our status: ')
                            , cancel: 'G', enter: 'P', eol: false, match: /P|G|Y/i, timeout: 30
                        }
                    }
                    xvt.app.focus = 'brawl'
                })
                return

            case 'Q':
                require('./main').menu($.player.expert)
                return

            default:
                xvt.beep()
                suppress = false
        }
        menu(suppress)
    }

}

export = Tavern
