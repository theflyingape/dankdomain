/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  TAVERN authored by: Robert Hurst <theflyingape@gmail.com>                *
\*****************************************************************************/

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
                xvt.waste(1000)
                break
            }
            if ($.player.novice || $.player.level < 10) {
                xvt.out('\nThe crowd laughs at your gesture.\n')
                xvt.waste(1000)
                xvt.out(`${$.barkeep.user.handle} snorts, "Be for real."\n`)
                xvt.waste(1000)
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
                            $.player.coin.value -= max.value
                            opponent.user.bounty = max
                            opponent.user.who = $.player.id
                            $.sound('click')
                            xvt.out(`\n\nYour bounty is posted for all to see.\n`)
                            $.news(`\tposted a bounty on ${opponent.user.handle}`)
                            $.saveUser(opponent)
                            xvt.waste(500)
                        }
                    }, max:24 }
                }
                xvt.app.form['coin'].prompt = `Bounty [MAX=${max.carry()}]? `
                xvt.app.focus = 'coin'
                return
            })
            return

        case 'S':
			if (!$.access.roleplay) break
            break
        
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
