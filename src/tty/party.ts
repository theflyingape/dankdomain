/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  PARTY authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import {sprintf} from 'sprintf-js'
import titleCase = require('title-case')

import $ = require('../common')
import xvt = require('xvt')
import Battle = require('../battle')


module Party
{
    const le = [ xvt.Empty[$.player.emulation], '>', '<', '(' ,')', '+', '*', ']' ]
    const re = [ xvt.Empty[$.player.emulation], '<', '>', ')', '(', '+', '*', '[' ]
    const tb = [ xvt.Empty[$.player.emulation], '-', '=', '~', ':', '+', '*', 'X' ]
    const mp = [ 'M:M', ' @ ', '{#}', '($)', '[&]', '<^>', '_V_', '-X-' ]

    let g: gang = {
        name:'', members:[], handles:[], genders:[], melee:[], status:[], validated:[]
            , win:0, loss:0, banner:0, trim:0, back:0, fore:0
    }
    let o: gang = {
        name:'', members:[], handles:[], genders:[], melee:[], status:[], validated:[]
            , win:0, loss:0, banner:0, trim:0, back:0, fore:0
    }
    let posse: active[]
    let nme: active[]

    let party: choices = {
        'L': { description:'List all gangs' },
        'M': { description:'Most Wanted list' },
        'J': { description:'Join a gang' },
        'F': { description:'Fight another gang' },
        'S': { description:'Start a new gang' },
        'E': { description:'Edit your gang' },
        'R': { description:'Resign your membership' },
        'T': { description:'Transfer leadership' }
	}

export function menu(suppress = true) {
    if ($.checkXP($.online, menu)) return
    if ($.online.altered) $.saveUser($.online)
    if (!$.reason && $.online.hp < 1) $.death('fought bravely?')
    if ($.reason) xvt.hangup()

    $.action('party')
    xvt.app.form = {
        'menu': { cb:choice, cancel:'q', enter:'?', eol:false }
    }

	let hints = ''
	if (!$.player.gang)
        hints += `> Join an existing gang or start a new one.\n`

    xvt.app.form['menu'].prompt = $.display('party', xvt.Magenta, xvt.magenta, suppress, party, hints)
    xvt.app.focus = 'menu'
}

function choice() {
    let suppress = false
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isNotEmpty(party[choice]))
        if (xvt.validator.isNotEmpty(party[choice].description)) {
            xvt.out(' - ', party[choice].description)
            suppress = $.player.expert
        }
    xvt.outln()

    let rs: any[]

    switch (choice) {
        case 'L':
            rs = $.query(`SELECT * FROM Gangs`)
            for (let i = 0; i < rs.length; i += 2) {
                if (i + 1 < rs.length)
                    showGang($.loadGang(rs[i]), $.loadGang(rs[i + 1]))
                else
                    showGang($.loadGang(rs[i]))
            }
            suppress = true
            break

        case 'M':
            xvt.outln()
            xvt.outln(xvt.Blue, xvt.bright, '        Party            Win-Loss   Ratio ')
            xvt.outln(xvt.Blue, xvt.bright, '------------------------------------------')
            rs = $.query(`SELECT * FROM Gangs ORDER BY win DESC, loss ASC`)
            let crown = true
            for (let i in rs) {
                let ratio = '  ' + (crown ? 'GOAT' : rs[i].loss ? sprintf('%5.3f', rs[i].win / (rs[i].win + rs[i].loss)).substr(1) : ' ---')
                xvt.out(sprintf('%-22s %5u-%-5u ', rs[i].name, rs[i].win, rs[i].loss), ratio)
                if (crown) {
                    xvt.out(' ', xvt.bright, xvt.yellow, $.player.emulation === 'XT' ? '👑' : '+')
                    crown = false
                }
                xvt.outln()
            }
            suppress = true
            break

        case 'S':
            if (!$.access.roleplay) break
            if ($.player.gang) {
                xvt.beep()
				xvt.outln(`\nYou are already a member of ${$.player.gang}.`)
				suppress = true
                break
            }
            g = { name:'', members:[], handles:[], genders:[], melee:[], status:[], validated:[]
                , win:0, loss:0, banner:0, trim:0, back:0, fore:0 }

            $.action('freetext')
            xvt.app.form = {
                'new': { cb:() => {
                    xvt.outln()
                    g.name = $.titlecase(xvt.entry)
                    if (g.name === 'New' || $.cuss(g.name))
                        xvt.hangup()
                    if (!g.name) {
                        menu()
                        return
                    }
                    g.members = [ $.player.id ]
                    g.handles = [ $.player.handle ]
                    g.validated = [ true ]
                    g.banner = $.dice(7)
                    g.trim = $.dice(7)
                    g.back = $.dice(7)
                    g.fore = $.dice(7)
                    showGang(g)
                    xtGang($.player.gender, $.player.melee, g.banner, g.trim)
                    $.action('yn')
                    xvt.app.focus = 'accept'
                }, prompt:'New gang name? ', min:2, max:22 },
                'accept': { cb:() => {
                    xvt.outln()
                    if (/Y/i.test(xvt.entry)) {
                        $.player.gang = g.name
                        $.online.altered = true
                        $.saveGang(g, true)
                        $.cat('gang')
                        xvt.waste(1200)
                        $.sound('click', 12)
                        menu()
                    }
                    else {
                        g.banner = $.dice(7)
                        g.trim = $.dice(7)
                        g.back = $.dice(7)
                        g.fore = $.dice(7)
                        showGang(g)
                        xvt.app.refocus()
                    }
                }, prompt:'Accept this banner (Y/N)? '
                , cancel:'N', enter:'Y', eol:false, match:/Y|N/i, timeout:20 }
            }
            xvt.app.focus = 'new'
            return

        case 'R':
            if (!$.access.roleplay) break
            if (!$.player.gang) break
            if (!$.party) {
                xvt.beep()
				xvt.out('\nYou cannot resign from your gang after party fights.\n')
				suppress = true
                break
            }

            g = $.loadGang($.query(`SELECT * FROM Gangs WHERE name = '${$.player.gang}'`)[0])
            showGang(g)
            xtGang($.player.gender, $.player.melee, g.banner, g.trim)
            $.sound('ddd', 6)

            $.action('ny')
            xvt.app.form = {
                'resign': { cb:() => {
                    xvt.outln()
                    if (/Y/i.test(xvt.entry)) {
                        $.player.gang = ''
                        $.online.altered = true
                        let i = g.members.indexOf($.player.id)
                        if (i > 0) {
                            g.members.splice(i, 1)
                            $.saveGang(g)
                        }
                        else {
                            xvt.out('\nDissolving the gang... ')
                            $.run(`UPDATE Players SET gang = '' WHERE gang = '${g.name}'`)
                            $.run(`DELETE FROM Gangs WHERE name = '${g.name}'`)
                            xvt.outln()
                        }
                    }
                    g = { name:'', members:[], handles:[], genders:[], melee:[], status:[], validated:[]
                        , win:0, loss:0, banner:0, trim:0, back:0, fore:0 }
                    menu()
                }, prompt:'Resign (Y/N)? ', enter:'N', eol:false, match:/Y|N/i }
            }
            xvt.app.focus = 'resign'
            return

        case 'J':
            if (!$.access.roleplay) break
            if ($.player.gang) {
                xvt.beep()
				xvt.outln(`\nYou are already a member of ${$.player.gang}.`)
				suppress = true
                break
            }

            g.members = []
            rs = $.query(`SELECT * FROM Gangs ORDER BY name`)
            do {
                g = $.loadGang(rs[0])
                rs.splice(0, 1)
                if (g.members.length < 4 || g.members.indexOf($.player.id) > 0)
                    break
            } while (rs.length)

            if (g.members.length > 0 && (g.members.length < 4 || g.members.indexOf($.player.id) > 0)) {
                showGang(g)

                $.action('ny')
                xvt.app.form = {
                    'join': { cb:() => {
                        if (/Y/i.test(xvt.entry)) {
                            $.player.gang = g.name
                            $.online.altered = true
                            if (g.members.indexOf($.player.id) < 0)
                                g.members.push($.player.id)
                            $.run(`UPDATE Gangs SET members = '${g.members.join()}' WHERE name = '${g.name}'`)
                            xvt.outln()
                            $.cat('gang')
                            xvt.waste(1200)
                            xvt.outln(`\nYou are now a member of ${g.name}.`)
                            $.sound('click', 12)
                        }
                        else {
                            g.members = []
                            while (rs.length) {
                                g = $.loadGang(rs[0])
                                rs.splice(0, 1)
                                if (g.members.length < 4)
                                    break
                            }
                            if (g.members.length > 0 && (g.members.length < 4 || g.members.indexOf($.player.id) > 0)) {
                                showGang(g)
                                xvt.app.refocus()
                                return
                            }
                        }
                        menu()
                    }, prompt:'Join (Y/N)? ', enter:'N', eol:false, match:/Y|N/i }
                }
                xvt.app.focus = 'join'
                return
            }
            break

        case 'T':
            if (!$.access.roleplay) break
            if (!$.player.gang) break

            g = $.loadGang($.query(`SELECT * FROM Gangs WHERE name = '${$.player.gang}'`)[0])
            showGang(g)
            if (g.members.indexOf($.player.id) != 0) {
                xvt.beep()
                xvt.outln('\nYou are not its leader.')
                break
            }
            xtGang($.player.gender, $.player.melee, g.banner, g.trim)
            $.sound('ddd', 6)

            Battle.user('Transfer leadership to', (member: active) => {
                let n = g.members.indexOf(member.user.id)
                if (n < 0) {
                    xvt.beep()
                    if (member.user.id) {
                        $.profile(member)
                        xvt.outln(`\n${member.user.handle} is not a member.`)
                    }
                }
                else {
                    if (member.user.gang === g.name) {
                        g.members[0] = member.user.id
                        g.members[n] = $.player.id
                        $.saveGang(g)
                        g = $.loadGang($.query(`SELECT * FROM Gangs WHERE name = '${$.player.gang}'`)[0])
                        showGang(g)
                        xvt.outln()
                        xvt.outln(xvt.bright, member.user.handle, ' is now leader of ', g.name, '.')
                    }
                    else {
                        xvt.beep()
                        xvt.outln(`\n${member.user.handle} has not accepted membership.`)
                    }
                }
                menu()
            })
            return

        case 'E':
            if (!$.access.roleplay) break
            if (!$.player.gang) break
            if (!$.party) {
                xvt.beep()
				xvt.outln('\nYou cannot edit your gang after party fights.')
				suppress = true
                break
            }
            
            g = $.loadGang($.query(`SELECT * FROM Gangs WHERE name = '${$.player.gang}'`)[0])
            showGang(g)
            if (g.members.indexOf($.player.id) != 0) {
                xvt.beep()
                xvt.outln('\nYou are not its leader.')
                break
            }
            xtGang($.player.gender, $.player.melee, g.banner, g.trim)
            $.action('ny')

            xvt.app.form = {
                'drop': { cb:() => {
                    if (/Y/i.test(xvt.entry)) {
                        Battle.user('Drop', (member: active) => {
                            if (member.user.id !== '') {
                                let n = g.members.indexOf(member.user.id)
                                if (n < 0) {
                                    xvt.beep()
                                    if (member.user.handle) xvt.outln(`\n${member.user.handle} is not a member.`)
                                }
                                else {
                                    if (!$.lock(member.user.id)) {
                                        $.beep()
                                        xvt.outln(`\n${$.who(member, 'He')}is currently engaged elsewhere and not available.`)
                                    }
                                    else {
                                        if (member.user.gang === g.name) {
                                            member.user.gang = ''
                                            $.run(`UPDATE Players SET gang = '' WHERE id = '${member.user.id}'`)
                                        }
                                        g.members.splice(n, 1)
                                        g.handles.splice(n ,1)
                                        $.saveGang(g)
                                        showGang(g)
                                        $.sound('click')
                                        xvt.outln()
                                        xvt.outln(xvt.bright, member.user.handle, ' is no longer on ', g.name, '.')
                                    }
                                }
                            }
                            menu()
                        })
                    }
                    else
                        xvt.app.focus = 'invite'
                }, prompt:'Drop a member (Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:10 },
                'invite': { cb: () => {
                    if (/Y/i.test(xvt.entry)) {
                        Battle.user('Invite', (member: active) => {
                            if (member.user.id !== '') {
                                let n = g.members.indexOf(member.user.id)
                                if (n >= 0) {
                                    xvt.beep()
                                    xvt.outln(`\n${member.user.handle} is already a member.`)
                                }
                                else {
                                    if (!member.user.gang) {
                                        g.members.push(member.user.id)
                                        g.handles.push(member.user.handle)
                                        $.saveGang(g)
                                        showGang(g)
                                        $.log(member.user.id, `\n${$.player.handle} invites you to join ${g.name}`)
                                        $.sound('click')
                                        xvt.outln()
                                        xvt.outln(xvt.bright, member.user.handle, ' is invited to join ', g.name, '.')
                                    }
                                }
                            }
                            menu()
                        })
                    }
                    else
                        menu()
                }, prompt:'Invite another player (Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:10 }
            }
            xvt.app.focus = 'drop'
            return

        case 'F':
            if (!$.access.roleplay) break
            if (!$.player.gang) break
            if (!$.party) {
                xvt.beep()
				xvt.outln('\nYou have no more party fights.')
				suppress = true
                break
            }

            rs = $.query(`SELECT * FROM Gangs ORDER BY name`)
            for (let i = 0; i < rs.length; i ++) {
                o = $.loadGang(rs[i])
                if (o.name !== $.player.gang)
                    xvt.out($.bracket(i + 1), o.name)
            }

            $.action('listmm')
            xvt.app.form = {
                'gang': { cb:() => {
                    xvt.outln()
                    let i = (+xvt.entry >>0) - 1
                    if (/M/i.test(xvt.entry)) {
                        rs = [ rs.find((x) => { return x.name === 'Monster Mash' }) ]
                        i = 0
                    }
                    if (!rs[i]) {
                        xvt.beep()
                        menu()
                        return
                    }

                    g = $.loadGang($.query(`SELECT * FROM Gangs WHERE name = '${$.player.gang}'`)[0])
                    o = $.loadGang(rs[i])
                    if (o.name === g.name) {
                        xvt.app.refocus()
                        return
                    }

                    posse = new Array($.online)
                    for (let i = 0; i < 4 && i < g.members.length; i++) {
                        if (g.members[i] !== $.player.id
                            && (g.validated[i] || typeof g.validated[i] == 'undefined')
                            && !g.status[i]) {
                                let n = posse.push(<active>{ user:{ id:g.members[i]} }) - 1
                                $.loadUser(posse[n])
                                if (posse[n].user.gang !== g.name || posse[n].user.status)
                                    posse.pop()
                                else
                                    $.activate(posse[n], true)
                        }
                    }

                    let monsters: monster = require('../etc/dungeon.json')
                    nme = new Array()
                    for (let i = 0; i < 4 && i < o.members.length; i++) {
                        if (!/_MM.$/.test(o.members[i])) {
                            if ((o.validated[i] || typeof o.validated[i] == 'undefined') && !o.status[i]) {
                                let n = nme.push(<active>{ user:{ id:o.members[i]} }) - 1
                                $.loadUser(nme[n])
                                if (nme[n].user.gang !== o.name || nme[n].user.status || !$.lock(nme[n].user.id, 2))
                                    nme.pop()
                            }
                        }
                        else {
                            nme.push(<active>{})
                            nme[i].user = <user>{id: ''}

                            let mon = $.dice(7) - 2 + (posse[i] ? posse[i].user.level : $.dice(Object.keys(monsters).length))
                            mon = mon < 0 ? 0 : mon >= Object.keys(monsters).length ? Object.keys(monsters).length - 1 : mon
                            let dm = Object.keys(monsters)[mon]
                            let ml = mon + $.dice(3) - 2
                            ml = ml < 1 ? 1 : ml > 99 ? 99 : ml
                            nme[i].user.handle = dm
                            nme[i].user.sex = 'I'
                            $.reroll(nme[i].user, monsters[dm].pc ? monsters[dm].pc : $.player.pc, ml)

                            nme[i].user.weapon = monsters[dm].weapon ? monsters[dm].weapon : $.Weapon.merchant[Math.trunc(($.Weapon.merchant.length - 1) * ml / 100) + 1]
                            nme[i].user.armor = monsters[dm].armor ? monsters[dm].armor : $.Armor.merchant[Math.trunc(($.Armor.merchant.length - 1) * ml / 100) + 1]

                            nme[i].user.poisons = [ 1 ]
                            if (monsters[dm].poisons)
                                for (let vials in monsters[dm].poisons)
                                    $.Poison.add(nme[i].user.poisons, monsters[dm].poisons[vials])

                            nme[i].user.spells = [ 8 ]
                            if (monsters[dm].spells)
                                for (let magic in monsters[dm].spells)
                                    $.Magic.add(nme[i].user.spells, monsters[dm].spells[magic])
        
                            $.activate(nme[i])
                            nme[i].toWC = $.int(nme[i].weapon.wc / 5) + 1
                            nme[i].user.coin = new $.coins($.money(ml))
                            nme[i].user.handle = titleCase(dm)
                            nme[i].user.gang = o.name
                            o.handles[i] = nme[i].user.handle
                            o.status[i] = ''
                            o.validated[i] = true
                        }
                    }

                    if (!nme.length) {
                        xvt.outln('\nThat gang is not active!')
                        menu()
                        return
                    }

                    $.action('ny')
                    showGang(g, o, true)
                    xtGang(o.genders[0], o.melee[0], o.banner, o.trim)
                    xvt.app.focus = 'fight'
                }, prompt:'\nFight which gang? ', max:2 },
                'fight': { cb:() => {
                    xvt.outln('\n')
                    if (/Y/i.test(xvt.entry)) {
                        $.party--
                        $.music('party')

                        if (!$.cat('dungeon/' + nme[0].user.handle.toLowerCase()))
                            $.cat('player/' + nme[0].user.pc.toLowerCase())
                        xvt.outln(xvt.bright, xvt.magenta, nme[0].user.handle, xvt.reset
                            , ' grins as ', $.who(nme[0], 'he'), 'pulls out '
                            , $.who(nme[0], 'his'), nme[0].user.weapon, '.')
                        xvt.waste(1200)

                        Battle.engage('Party', posse, nme, menu)
                    }
                    else {
                        $.unlock($.player.id, true)
                        menu()
                    }
                }, prompt:'Fight this gang (Y/N)? ', cancel:'N', enter:'N', eol:false, match:/Y|N/i, max:1, timeout:10 }
            }
            xvt.app.focus = 'gang'
            return

        case 'Q':
			require('./main').menu($.player.expert)
			return
	}
	menu(suppress)
}

function showGang(lg: gang, rg?: gang, engaged = false) {
    xvt.outln()

    xvt.out(xvt.bright, xvt.white, mp[lg.banner])
    if (rg)
        xvt.out(' '.repeat(31), mp[rg.banner])
    xvt.outln()

    xvt.out(' |', xvt.Black + lg.back, xvt.black + lg.fore, xvt.bright)
    xvt.out(le[lg.trim], tb[lg.trim].repeat(26), re[lg.trim], xvt.reset)
    if (rg) {
        xvt.out(' '.repeat(4), ' |', xvt.Black + rg.back, xvt.black + rg.fore, xvt.bright)
        xvt.out(le[rg.trim], tb[rg.trim].repeat(26), re[rg.trim])
    }
    xvt.outln()

    xvt.out(' |', xvt.Black + lg.back, xvt.black + lg.fore, xvt.bright)
    let i = 26 - lg.name.length
    xvt.out(le[lg.trim], ' '.repeat(i >>1), lg.name, ' '.repeat((i >>1) + i % 2), re[lg.trim], xvt.reset)
    if (rg) {
        xvt.out(' '.repeat(4), ' |', xvt.Black + rg.back, xvt.black + rg.fore, xvt.bright)
        i = 26 - rg.name.length
        xvt.out(le[rg.trim], ' '.repeat(i >>1), rg.name, ' '.repeat((i >>1) + i % 2), re[rg.trim])
    }
    xvt.outln()

    xvt.out(' |', xvt.Black + lg.back, xvt.black + lg.fore, xvt.bright)
    xvt.out(le[lg.trim], tb[lg.trim].repeat(26), re[lg.trim], xvt.reset)
    if (rg) {
        xvt.out(' '.repeat(4), ' |', xvt.Black + rg.back, xvt.black + rg.fore, xvt.bright)
        xvt.out(le[rg.trim], tb[rg.trim].repeat(26), re[rg.trim])
    }
    xvt.outln()

    let n = 0
    let who: { handle:string, status:string, gang:string }[]
    while (n < 4 && ((lg && lg.members.length) || (rg && rg.members.length))) {
        if (lg) {
            xvt.out(' | ')
            if (n < lg.members.length) {
                if (lg.handles[n]) {
                    if (lg.validated[n]) {
                        if (lg.status[n]) {
                            if (engaged)
                                xvt.out(xvt.faint, xvt.red, 'x ')
                            else
                                xvt.out(xvt.reset, xvt.faint, '^ ')
                        }
                        else
                            xvt.out(xvt.bright, xvt.white, '  ')
                    }
                    else {
                        if (typeof lg.validated[n] == 'undefined') {
                            if (engaged)
                                xvt.out(xvt.faint, xvt.red, 'x ')
                            else
                                xvt.out(xvt.faint, xvt.yellow, '> ')
                        }
                        else {
                            if (engaged)
                                xvt.out(xvt.faint, xvt.red, 'x ')
                            else
                                xvt.out(xvt.faint, xvt.red, 'x ', xvt.blue)
                        }
                    }
                    xvt.out(sprintf('%-24s ', lg.handles[n]))
                }
                else
                    xvt.out(sprintf('> %-24s ', 'wired for '
                        + ['mashing','smashing','beatdown','pounding'][n]))
            }
            else {
                if (engaged)
                    xvt.out(sprintf(' '.repeat(27)))
                else
                    xvt.out(sprintf(' -open invitation to join- '))
            }
        }

        if (rg) {
            xvt.out(xvt.reset, ' '.repeat(4), ' | ')
            if (n < rg.members.length) {
                if (rg.handles[n]) {
                    if (rg.validated[n]) {
                        if (rg.status[n]) {
                            if (engaged)
                                xvt.out(xvt.faint, xvt.red, 'x ')
                            else
                                xvt.out(xvt.reset, xvt.faint, '^ ')
                        }
                        else
                            xvt.out(xvt.bright, xvt.white, '  ')
                    }
                    else {
                        if (typeof rg.validated[n] == 'undefined') {
                            if (engaged)
                                xvt.out(xvt.faint, xvt.red, 'x ')
                            else
                                xvt.out(xvt.faint, xvt.yellow, '> ')
                        }
                        else {
                            if (engaged)
                                xvt.out(xvt.faint, xvt.red, 'x ')
                            else
                                xvt.out(xvt.faint, xvt.red, 'x ', xvt.blue)
                        }
                    }
                    xvt.out(sprintf('%-24s ', rg.handles[n]))
                }
                else
                    xvt.out(sprintf('> %-24s ', 'wired for '
                        + ['mashing','smashing','beatdown','pounding'][n]))
            }
            else
                if (!engaged)
                    xvt.out(sprintf(' -open invitation to join- '))
        }
        xvt.outln()
        n++
    }
}

function xtGang(sex:string, melee:number, banner:number, coat:number) {

    switch(sex) {
        case 'I':
            $.profile({ leader:'gang/leadermm', banner:'gang/bannermm', coat:'gang/coatmm' })
            break

        case 'F':
            $.profile({ leader:`gang/leader${melee}_f`, banner:`gang/banner${banner}`, coat:`gang/coat${coat}` })
            break

        default:
            $.profile({ leader:`gang/leader${melee}`, banner:`gang/banner${banner}`, coat:`gang/coat${coat}` })
            break
    }
}

}

export = Party
