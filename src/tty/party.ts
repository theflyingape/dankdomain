/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  PARTY authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import {sprintf} from 'sprintf-js'

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
        name:'', members:[], win:0, loss:0, banner:0, trim:0, back:0, fore:0
    }
    let o: gang = {
        name:'', members:[], win:0, loss:0, banner:0, trim:0, back:0, fore:0
    }

    let party: choices = {
        'E': { description:'Edit your gang' },
        'F': { description:'Fight another gang' },
        'J': { description:'Join a gang' },
        'L': { description:'List all gangs' },
        'M': { description:'Most Wanted list' },
        'R': { description:'Resign your membership' },
        'S': { description:'Start a new gang' },
        'T': { description:'Transfer leadership' }
	}

export function menu(suppress = false) {
    if ($.checkXP($.online, menu)) return
	if ($.online.altered) $.saveUser($.player)
	if ($.reason) xvt.hangup()

    $.action('party')
    xvt.app.form = {
        'menu': { cb:choice, cancel:'q', enter:'?', eol:false }
    }
    xvt.app.form['menu'].prompt = $.display('party', xvt.Magenta, xvt.magenta, suppress, party)
    xvt.app.focus = 'menu'
}

function choice() {
    let suppress = $.player.expert
    let choice = xvt.entry.toUpperCase()
    if (xvt.validator.isNotEmpty(party[choice]))
        xvt.out(' - ', party[choice].description, '\n')
    else {
        xvt.beep()
        suppress = false
    }

    let rs: string[]

    switch (choice) {
        case 'L':
            rs = $.query(`SELECT * FROM Gangs ORDER BY name`)
            for (let i = 0; i < rs.length; i += 2) {
                if (i + 1 < rs.length)
                    showGang(loadGang(rs[i]), loadGang(rs[i + 1]))
                else
                    showGang(loadGang(rs[i]))
            }
            xvt.app.form = {
                'pause': { cb:menu, pause:true }
            }
            xvt.app.focus = 'pause'
            return

        case 'S':
            if (!$.access.roleplay) break
            if ($.player.gang) break

            $.action('freetext')
            xvt.app.form = {
                'new': { cb:() => {
                    xvt.out('\n')
                    g.name = $.titlecase(xvt.entry)
                    if (g.name === 'New' || $.cuss(g.name))
                        xvt.hangup()
                    g.members = [ $.player.id ]
                    g.banner = $.dice(7)
                    g.trim = $.dice(7)
                    g.back = $.dice(7)
                    g.fore = $.dice(7)
                    showGang(g)

                    $.action('yn')
                    xvt.app.focus = 'accept'
                }, prompt:'New gang name? ', min:2, max:22 },
                'accept': { cb:() => {
                    xvt.out('\n')
                    if (/Y/i.test(xvt.entry)) {
                        $.player.gang = g.name
                        $.online.altered = true
                        saveGang(g, true)
                        menu(true)
                    }
                    else {
                        g.banner = $.dice(7)
                        g.trim = $.dice(7)
                        g.back = $.dice(7)
                        g.fore = $.dice(7)
                        showGang(g)
                        xvt.app.refocus()
                        return
                    }
                }, prompt:'Accept this banner (Y/N)? ', enter:'N', eol:false, match:/Y|N/i }
            }
            xvt.app.focus = 'new'
            return

        case 'R':
            if (!$.access.roleplay) break
            if (!$.player.gang) break

            g = loadGang($.query(`SELECT * FROM Gangs WHERE name = '${$.player.gang}'`)[0])
            showGang(g)

            $.action('yn')
            xvt.app.form = {
                'resign': { cb:() => {
                    xvt.out('\n')
                    if (/Y/i.test(xvt.entry)) {
                        $.player.gang = ''
                        $.online.altered = true
                        let i = g.members.indexOf($.player.id)
                        if (i > 0) {
                            g.members.splice(i, 1)
                            saveGang(g)
                        }
                        else {
                            xvt.out('Dissolving the gang... ')
                            $.sqlite3.exec(`UPDATE Players SET gang = '' WHERE gang = '${g.name}'`)
                            $.sqlite3.exec(`DELETE FROM Gangs WHERE name = '${g.name}'`)
                            xvt.out('ok.\n')
                        }
                    }
                    menu(true)
                }, prompt:'Resign (Y/N)? ', enter:'N', eol:false, match:/Y|N/i }
            }
            xvt.app.focus = 'resign'
            return

        case 'J':
            if (!$.access.roleplay) break
            if ($.player.gang) break

            g.members = []
            rs = $.query(`SELECT * FROM Gangs ORDER BY name`)
            do {
                g = loadGang(rs[0])
                rs.splice(0, 1)
                if (g.members.length < 4)
                    break
            } while (rs.length)

            if (g.members.length > 0 && g.members.length < 4) {
                showGang(g)

                $.action('yn')
                xvt.app.form = {
                    'join': { cb:() => {
                        xvt.out('\n')
                        if (/Y/i.test(xvt.entry)) {
                            $.player.gang = g.name
                            $.online.altered = true
                            if (g.members.indexOf($.player.id) < 0)
                                g.members.push($.player.id)
                            $.sqlite3.exec(`UPDATE Gangs SET members = '${g.members.join()}' WHERE name = '${g.name}'`)
                        }
                        else {
                            g.members = []
                            while (rs.length) {
                                g = loadGang(rs[0])
                                rs.splice(0, 1)
                                if (g.members.length < 4)
                                    break
                            }
                            if (g.members.length > 0 && g.members.length < 4) {
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

            g = loadGang($.query(`SELECT * FROM Gangs WHERE name = '${$.player.gang}'`)[0])
            showGang(g)
            if (g.members.indexOf($.player.id) != 0) {
                xvt.beep()
                xvt.out('\nYou are not its leader.\n')
                break
            }

            Battle.user('Transfer leadership to', (member: active) => {
                let n = g.members.indexOf(member.user.id)
                if (n < 0) {
                    xvt.beep()
                    xvt.out(`\n${member.user.handle} is not a member.\n`)
                }
                else {
                    if (member.user.gang === g.name) {
                        g.members[0] = member.user.id
                        g.members[n] = $.player.id
                        saveGang(g)
                        showGang(g)
                        xvt.out(xvt.bright, '\n', member.user.handle, ' is now leader of ', g.name, '.\n', xvt.reset)
                    }
                    else {
                        xvt.beep()
                        xvt.out(`\n${member.user.handle} has not accepted membership.\n`)
                    }
                }
                menu(true)
            })
            return

        case 'E':
            if (!$.access.roleplay) break
            if (!$.player.gang) break

            g = loadGang($.query(`SELECT * FROM Gangs WHERE name = '${$.player.gang}'`)[0])
            showGang(g)
            if (g.members.indexOf($.player.id) != 0) {
                xvt.beep()
                xvt.out('\nYou are not its leader.\n')
                break
            }

            $.action('yn')
            xvt.app.form = {
                'drop': { cb:() => {
                    xvt.out('\n')
                    if (/Y/i.test(xvt.entry)) {
                        Battle.user('Drop', (member: active) => {
                            let n = g.members.indexOf(member.user.id)
                            if (n < 0) {
                                xvt.beep()
                                xvt.out(`\n${member.user.handle} is not a member.\n`)
                            }
                            else {
                                if (member.user.gang === g.name) {
                                    member.user.gang = ''
                                    $.saveUser(member)
                                    g.members.splice(n, 1)
                                    saveGang(g)
                                    showGang(g)
                                    xvt.out(xvt.bright, '\n', member.user.handle, ' is no longer on ', g.name, '.\n', xvt.reset)
                                }
                            }
                            menu(true)
                        })
                    }
                    else
                        xvt.app.focus = 'invite'
                }, prompt:'Drop a member (Y/N)? ', enter:'N', eol:false, match:/Y|N/i },
                'invite': { cb: () => {
                    xvt.out('\n')
                    if (/Y/i.test(xvt.entry)) {
                        Battle.user('Invite', (member: active) => {
                            let n = g.members.indexOf(member.user.id)
                            if (n >= 0) {
                                xvt.beep()
                                xvt.out(`\n${member.user.handle} is already a member.\n`)
                            }
                            else {
                                if (!member.user.gang) {
                                    g.members.push(member.user.id)
                                    saveGang(g)
                                    showGang(g)
                                    xvt.out(xvt.bright, '\n', member.user.handle, ' is invited to join ', g.name, '.\n', xvt.reset)
                                }
                            }
                            menu(true)
                        })
                    }
                    else
                        menu()
                }, prompt:'Invite another player (Y/N)? ', enter:'N', eol:false, match:/Y|N/i }
            }
            xvt.app.focus = 'drop'
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

function loadGang(rs: any, name = ''): gang
{
    return { name:rs.name
        , members: rs.members.split(',')
        , win: rs.win
        , loss: rs.loss
        , banner: rs.banner >>4
        , trim: rs.banner % 8
        , back: rs.color >>4
        , fore: rs.color % 8
    }
}

function saveGang(g: gang, insert = false) {
    if (insert) {
        try {
            $.sqlite3.exec(`
                INSERT INTO Gangs (
                    name, members, win, loss, banner, color
                ) VALUES (
                    '${g.name}', '${g.members.join()}',
                    ${g.win}, ${g.loss},
                    ${(g.banner <<4) + g.trim}, ${(g.back <<4) + g.fore}
            )`)
        }
        catch(err) {
            if (err.code !== 'SQLITE_CONSTRAINT_PRIMARYKEY') {
                xvt.beep()
                xvt.out(xvt.reset, '\n?Unexpected error: ', String(err), '\n')
                xvt.waste(5000)
            }
        }
    }
    else {
        try {
            $.sqlite3.exec(`
                UPDATE Gangs
                    set members = '${g.members.join()}'
                    , win = ${g.win}, loss = ${g.loss}
                    , banner = ${(g.banner <<4) + g.trim}, color = ${(g.back <<4) + g.fore}
                WHERE name = '${g.name}'
            `)
        }
        catch(err) {
            xvt.beep()
            xvt.out(xvt.reset, '\n?Unexpected error: ', String(err), '\n')
            xvt.waste(5000)
        }
    }
}

function showGang(lg: gang, rg?: gang)
{
    xvt.out(xvt.reset, '\n')

    //
    xvt.out(xvt.bright, xvt.white, mp[lg.banner])
    if (rg)
        xvt.out(' '.repeat(31), mp[rg.banner])
    xvt.out(xvt.reset, '\n')

    //
    xvt.out(' |', xvt.Black + lg.back, xvt.black + lg.fore, xvt.bright)
    xvt.out(le[lg.trim], tb[lg.trim].repeat(26), re[lg.trim], xvt.reset)
    if (rg) {
        xvt.out(' '.repeat(4), ' |', xvt.Black + rg.back, xvt.black + rg.fore, xvt.bright)
        xvt.out(le[rg.trim], tb[rg.trim].repeat(26), re[rg.trim])
    }
    xvt.out(xvt.reset, '\n')

    //
    xvt.out(' |', xvt.Black + lg.back, xvt.black + lg.fore, xvt.bright)
    let i = 26 - lg.name.length
    xvt.out(le[lg.trim], ' '.repeat(i >>1), lg.name, ' '.repeat((i >>1) + i % 2), re[lg.trim], xvt.reset)
    if (rg) {
        xvt.out(' '.repeat(4), ' |', xvt.Black + rg.back, xvt.black + rg.fore, xvt.bright)
        i = 26 - rg.name.length
        xvt.out(le[rg.trim], ' '.repeat(i >>1), rg.name, ' '.repeat((i >>1) + i % 2), re[rg.trim])
    }
    xvt.out(xvt.reset, '\n')
    
    //
    xvt.out(' |', xvt.Black + lg.back, xvt.black + lg.fore, xvt.bright)
    xvt.out(le[lg.trim], tb[lg.trim].repeat(26), re[lg.trim], xvt.reset)
    if (rg) {
        xvt.out(' '.repeat(4), ' |', xvt.Black + rg.back, xvt.black + rg.fore, xvt.bright)
        xvt.out(le[rg.trim], tb[rg.trim].repeat(26), re[rg.trim])
    }
    xvt.out(xvt.reset, '\n')
    
    //
    let n = 0
    let who: { handle:string, status:string, gang:string }[]
    while (n < 4 && ((lg && lg.members.length) || (rg && rg.members.length))) {
        if (lg) {
            xvt.out(' | ')
            if (n < lg.members.length) {
                who = $.query(`SELECT handle, status, gang FROM Players WHERE id = '${lg.members[n]}'`)
                if (who.length) {
                    if (who[0].gang === lg.name) {
                        if (who[0].status)
                            xvt.out(xvt.faint, xvt.blue, '^ ')
                        else
                            xvt.out(xvt.bright, xvt.white, '  ')
                    }
                    else {
                        if (who[0].gang)
                            xvt.out(xvt.faint, xvt.red, 'x ', xvt.blue)
                        else
                            xvt.out(xvt.faint, xvt.yellow, '> ')
                    }
                    xvt.out(sprintf('%-24s ', who[0].handle))
                }
                else
                    xvt.out(sprintf('> %-22s   ', 'wired for ' + lg.members[n] + ' '
                        + ['mashing','smashing','beatdown','pounding'][n]))
            }
            else
                xvt.out(sprintf(' -open invitation to join- '))
        }
        else
            xvt.out(xvt.reset, ' '.repeat(28))

        if (rg) {
            xvt.out(xvt.reset, ' '.repeat(4), ' | ')

            if (n < rg.members.length) {
                who = $.query(`SELECT handle, status, gang FROM Players WHERE id = '${rg.members[n]}'`)
                if (who.length) {
                    if (who[0].gang === rg.name) {
                        if (who[0].status)
                            xvt.out(xvt.faint, xvt.blue, '^ ')
                        else
                            xvt.out(xvt.bright, xvt.white, '  ')
                    }
                    else {
                        if (who[0].gang)
                            xvt.out(xvt.faint, xvt.red, 'x ', xvt.blue)
                        else
                            xvt.out(xvt.faint, xvt.yellow, '> ')
                    }
                    xvt.out(sprintf('%-24s ', who[0].handle))
                }
                else
                    xvt.out(sprintf('{ %-22s } ', 'wired for ' + rg.members[n]))
                }
            else
                xvt.out(sprintf(' -open invitation to join- '))
        }

        xvt.out(xvt.reset, '\n')
        n++
    }
}

}

export = Party
