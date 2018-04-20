/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  TAVERN authored by: Robert Hurst <theflyingape@gmail.com>                *
\*****************************************************************************/

import fs = require('fs')
import {sprintf} from 'sprintf-js'

import $ = require('../common')
import xvt = require('xvt')
import Battle = require('../battle')
import Taxman = require('./taxman')


module Tavern
{
	let tavern: choices = {
        'B': { description:'Brawl another user' },
        'E': { description:'Eavesdrop on the arguments' },
        'J': { description:'Jump into the arguments' },
        'G': { description:'Guzzle beer' },
        'L': { description:'List user bounties' },
        'P': { description:'Post your own bounty' },
        'S': { description:'Swear at Tiny' },
        'T': { description:'Today\'s news' },
        'Y': { description:'Yesterday\'s news' }
	}

    $.loadUser($.barkeep)
        
export function menu(suppress = true) {
    if ($.checkXP($.online, menu)) return
    if ($.online.altered) $.saveUser($.online)
    Taxman.bar()
    
    $.action('tavern')
    xvt.app.form = {
        'menu': { cb:choice, cancel:'q', enter:'?', eol:false }
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
    let suppress = false
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isNotEmpty(tavern[choice]))
        if (xvt.validator.isNotEmpty(tavern[choice].description)) {
            xvt.out(' - ', tavern[choice].description)
            suppress = $.player.expert
        }
    xvt.out('\n')
    
    switch (choice) {
        case 'T':
            $.cat('tavern/today')
            suppress = true
            break

        case 'Y':
            $.cat('tavern/yesterday')
            suppress = true
            break

        case 'G':
            xvt.out(`\n${$.barkeep.user.handle} pours you a beer.\n`)
            xvt.waste(500)

            $.action('payment')
            xvt.app.form = {
                'tip': { cb:() => {
                    xvt.out('\n\n')
                    if ((+xvt.entry).toString() === xvt.entry) xvt.entry += 'c'
                    let tip = (/=|max/i.test(xvt.entry)) ? $.player.coin.value : new $.coins(xvt.entry).value
                    if (tip < 1 || tip > $.player.coin.value) {
                        $.sound('oops')
                        xvt.out($.who($.barkeep, 'He'), 'pours the beer on you and kicks you out of his bar.\n')
                        xvt.waste(1000)
                        $.brawl = 0
                        require('./main').menu(true)
                        return
                    }
                    xvt.beep()
                    xvt.out($.who($.barkeep, 'He'), 'grunts and hands you your beer.')
                    if ($.player.emulation === 'XT') xvt.out(' \u{1F37A}')
                    xvt.out('\n')
                    $.online.altered = true
                    $.player.coin.value -= tip
                    xvt.waste(1000)
                    xvt.out($.who($.barkeep, 'He'), 'says, "', [
                        'More stamina will yield more hit points',
                        'More intellect will yield more spell power',
                        'You don\'t miss as often with higher agility',
                        'You can sell items for more money with higher charisma',
                        'You can do more damage in battle with higher stamina',
                        'Spells don\'t fail as often with higher intellect',
                        'Higher agility yields higher jousting ability',
                        'Fishing can get better results from higher charisma',
                        'Real Estate and Security help protect your investments',
                        'Higher baud rates yield faster screen displays',
                        'Crying will not change the world',
                        'Backstabs swish more than you wish',
                        'Dungeon maps find more in the hands of the lucky',
                        'Higher intellect calculates opponent\'s hit points more accurately',
                        'At least 50 Intellect points are needed to recall where you\'ve been walking',
                        'Become your gang\'s leader in the Arena',
                        'Deeper dungeon portals is your key to victory',
                        'I\'ll have more hints tomorrow.  Maybe'
                    ][tip % 18])
                    xvt.out('."\n')
                    xvt.waste(1000)
                    menu()
                }, prompt:'How much will you tip? ', max:8 },
            }
            xvt.app.focus = 'tip'
            return

        case 'L':
            xvt.out(xvt.green, '\n        --=:)) Tavern Bounty List ((:=--', xvt.reset, '\n\n')
            let rs = $.query(`SELECT handle,bounty,who FROM Players WHERE bounty > 0 ORDER BY level DESC`)
            for (let i in rs) {
                let adversary = <active>{ user:{ id:rs[i].who } }
                $.loadUser(adversary)
                let bounty = new $.coins(rs[i].bounty)
                xvt.out(`${rs[i].handle} has a ${bounty.carry()} bounty from ${adversary.user.handle}\n`)
            }
            xvt.app.form = {
                'pause': { cb:menu, pause:true }
            }
            xvt.app.focus = 'pause'
            return

        case 'P':
            if (!$.access.roleplay) break
            if ($.player.coin.value < 1) {
                xvt.out('\nYou\'ll need some cash to post a bounty.\n')
                suppress = true
                break
            }
            if ($.player.novice || $.player.level < 10) {
                xvt.out('\nThe crowd laughs at your gesture.\n')
                xvt.waste(1000)
                xvt.out(`${$.barkeep.user.handle} snorts, "Be for real."\n`)
                suppress = true
                break
            }
            Battle.user('Bounty', (opponent: active) => {
                if (opponent.user.id === '' || opponent.user.id === $.player.id) {
                    menu()
                    return
                }
                xvt.out('\n')
                if (opponent.user.bounty.value) {
                    xvt.out(`${opponent.user.handle} already has a bounty posted.\n`)
                    menu()
                    return
                }

                let max = new $.coins(10 * $.money(opponent.user.level))
                if (max.value > $.player.coin.value)
                    max.value = $.player.coin.value

                $.action('payment')
                xvt.app.form = {
                    'coin': { cb: () => {
                        let post = Math.abs(Math.trunc(/=|max/i.test(xvt.entry) ? max.value : +xvt.entry))
                        if (post > 0 && post <= max.value) {
                            $.player.coin.value -= post
                            opponent.user.bounty = new $.coins(post)
                            opponent.user.who = $.player.id
                            $.sound('click')
                            xvt.out(`\n\nYour bounty is posted for all to see.\n`)
                            $.news(`\tposted a bounty on ${opponent.user.handle}`)
                            $.saveUser(opponent)
                            xvt.waste(500)
                        }
                        menu(true)
                    }, max:24 }
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
            switch($.tiny) {
                case 2:
                    xvt.out('yell, "Freak!"\n')
                    xvt.waste(1000)
                    if ($.player.level < 60)
                        xvt.out('The barkeep stares off into empty space, ignoring your wimpy comment.\n')
                    else
                        xvt.out(`The barkeep points at ${$.who($.barkeep,'he')}massive, flexed bicep and laughs at your jest.\n`)
                    suppress = true
                    break
                case 1:
                    xvt.out('thumb your nose.\n')
                    xvt.waste(1000)
                    if ($.player.level < 60)
                        xvt.out(`Annoyed, the barkeep looks down at ${$.who($.barkeep,'his')}furry feet and counts, \"100, 99, 98,...\"\n`)
                    else
                        xvt.out(`The former Champion Ogre grunts to ${$.who($.barkeep,'him')}\x08self, \"Not good for business."\n`)
                    suppress = true
                    break
                default:
                    $.brawl = 0
                    $.action('clear')
                    $.music('.')
                    xvt.out('jest, \"What you looking at, wart-face!\"')
                    xvt.waste(1200)
                    xvt.out('\nUh, oh!')
                    $.sound('ddd', 22)
                    $.profile({ jpg:'npc/barkeep'
                        , handle:$.barkeep.user.handle, level:$.barkeep.user.level, pc:$.barkeep.user.pc })
                    xvt.out('  Here comes Tiny!')
                    $.sound('challenge', 12)
                    xvt.out(`  And ${$.who($.barkeep,'he')}doesn\'t look friendly...\n\n`)
                    xvt.waste(600)
                    xvt.out(xvt.bright, xvt.green, [
                        '"When I\'m through with you, your mama won\'t be able to identify the remains."',
                        '"I am getting too old for this."',
                        '"Never rub another man\'s rhubarb!"'][$.dice(3) - 1]
                        , xvt.reset, '\n\n')
                    xvt.waste(3000)

                    $.loadUser($.barkeep)
                    $.barkeep.toWC += $.Weapon.merchant.length - $.barkeep.weapon.wc
                    $.barkeep.toAC += $.Armor.merchant.length - $.barkeep.armor.ac
                    $.barkeep.user.spells = JSON.parse(fs.readFileSync('./etc/barkeep.json').toString()).spells
                    xvt.out(`${$.barkeep.user.handle} towels ${$.who($.barkeep,'his')}hands dry from washing the day\'s\nglasses, ${$.who($.barkeep,'he')}warns,\n\n`)
                    xvt.out(xvt.bright, xvt.green, '"Another fool said something like that to me, once, and got all busted up."'
                        , xvt.reset, '\n\n')
                    xvt.waste(5000)
                    let fool = <active>{ user:{ id:$.barkeep.user.status, gender:'M' }}
                    if ($.barkeep.user.status) {
                        $.loadUser(fool)
                        xvt.out(xvt.bright, xvt.green, `"I think it was ${fool.user.handle}, and it took me a week to clean up the blood!"`
                            , xvt.reset, '\n\n')
                        xvt.waste(4000)
                    }
                    xvt.out(`${$.who($.barkeep,'He')}points to a buffed weapon hanging over the mantlepiece and says, `
                        , xvt.bright, xvt.green, '"Lookee\n')
                    xvt.out(` there, ${$.who(fool,'he')}tried to use that ${$.barkeep.user.weapon} on me, but it wasn't good enough.\"`
                        , xvt.reset, '\n\n')
                    xvt.waste(6000)

                    $.music('tiny')
                    xvt.out('The patrons move in closer to witness the forthcoming slaughter, except for\n')
                    xvt.out(`${$.taxman.user.handle} who is busy raiding the bar of its beer and nuts.\n\n`)
                    xvt.waste(6000)
                    xvt.out('You hear a cry, "I\'ll pay fifteen-to-one on the challenger!"\n')
                    xvt.waste(3000)
                    xvt.out('The crowd roars with laughter... ')
                    xvt.waste(2000)
                    xvt.out('you are not amused.\n\n')
                    xvt.waste(1500)
                    xvt.out(`${$.barkeep.user.handle} removes ${$.who($.barkeep,'his')}tunic to reveal a massive, but\nheavily scarred chest.\n\n`)
                    xvt.waste(3000)
                    xvt.out('You look for an exit, but there is none to be found... ')
                    xvt.waste(2000)
                    xvt.out('\n')

                    $.player.coward = true
                    $.saveUser($.online)
                    $.online.altered = true
                    Battle.engage('Tavern', $.online, $.barkeep, require('./main').menu)
                    return
            }
            break

        case 'B':
            if (!$.brawl) break
            $.online.bp = $.int($.online.hp / 10)
            Battle.user('Brawl', (opponent: active) => {
                if (opponent.user.id === '') {
                    menu(true)
                    return
                }
                if (opponent.user.id === $.player.id) {
					xvt.out('\nYou want to hit yourself?\n')
					menu(true)
					return
                }
				if ($.player.level - opponent.user.level > 3) {
					xvt.out('\nYou can only brawl someone higher or up to three levels below you.\n')
					menu(true)
					return
				}
                xvt.out(xvt.green, 'Name: ', xvt.white, sprintf('%-22s      You:', opponent.user.handle), '\n')
                xvt.out(xvt.green, 'Level: ', xvt.white, sprintf('%-22d     %-2d', opponent.user.level, $.player.level), '\n')
                xvt.out(xvt.green, 'Knock out points: ', xvt.white, sprintf('%-15d %-3d', opponent.bp, $.online.bp), '\n')
				if (!$.Access.name[opponent.user.access].roleplay || opponent.user.id[0] === '_') {
					xvt.out('\nYou are allowed only to brawl other players.\n')
					if (opponent.user.id[0] === '_') {
						if (($.online.cha = $.PC.ability($.player.cha, -10)) < 20)
                            $.online.cha = 20
                        $.online.altered = true
						$.player.coward = true
					}
					menu(true)
					return
				}
                if (!$.lock(opponent.user.id)) {
                    $.beep()
                    xvt.out(`\n${$.who(opponent, 'He')}is currently engaged elsewhere and not available.\n`)
					menu(true)
					return
                }

                $.action('yn')
				xvt.app.form = {
					'brawl': { cb:() => {
						xvt.out('\n')
						if (/Y/i.test(xvt.entry)) {
                            $.brawl--
                            if (($.online.dex / 2 + $.dice($.online.dex / 2)) > (opponent.dex / 2 + $.dice(opponent.dex / 2))) {
                                xvt.out('\nYou get the first punch.\n')
                                Battle.brawl($.online, opponent)
                            }
                            else
                                xvt.out(`\n${$.who(opponent, 'He')}gets the first punch.\n`)
                            if ($.online.bp > 0 && opponent.bp > 0)
                                Battle.brawl(opponent, $.online)
                            if ($.online.bp > 0 && opponent.bp > 0)
                                xvt.app.focus = 'punch'
                            else
                                menu($.player.expert)
                        }
                        else
                            menu($.player.expert)
					}, prompt:'Are you sure (Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:10 },
					'punch': { cb:() => {
						xvt.out('\n')
						if (/P/i.test(xvt.entry)) {
                            Battle.brawl($.online, opponent)
                            if ($.online.bp > 0 && opponent.bp > 0)
                                Battle.brawl(opponent, $.online)
                        }
						if (/G/i.test(xvt.entry)) {
                            $.unlock($.player.id, true)
                            xvt.out(`\nWe can't all be Rocky, eh?\n`)
                            menu($.player.expert)
                            return
                        }
						if (/Y/i.test(xvt.entry)) {
                            xvt.out(`\nYour knock out points: ${$.online.bp}\n`)
                        }
                        if ($.online.bp > 0 && opponent.bp > 0)
                            xvt.app.refocus()
                        else {
                            $.unlock($.player.id, true)
                            menu($.player.expert)
                        }
                    }, prompt:xvt.attr($.bracket('P', false), xvt.cyan, `unch ${$.who(opponent, 'him')}`, $.bracket('G', false), xvt.cyan, 'ive it up, ', $.bracket('Y', false), xvt.cyan, 'our status: ' )
                        , cancel:'G', enter:'P', eol:false, match:/P|G|Y/i, timeout:30 }
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