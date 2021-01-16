/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  PARTY authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import $ = require('../runtime')
import db = require('../db')
import { Coin, Armor, Magic, Poison, Weapon } from '../items'
import { PC } from '../pc'
import { checkXP, reroll } from '../player'
import { bracket, cat, cuss, death, dice, display, int, log, money, sprintf, titlecase, vt, weapon } from '../sys'

import Battle = require('../battle')

module Party {

    const le = [vt.Empty, '>', '<', '(', ')', '+', '*', ']']
    const re = [vt.Empty, '<', '>', ')', '(', '+', '*', '[']
    const tb = [vt.Empty, '-', '=', '~', ':', '+', '*', 'X']
    const mp = ['M:M', ' @ ', '{#}', '($)', '[&]', '<^>', '_V_', '-X-']

    let g: gang = {
        name: '', members: [], handles: [], genders: [], melee: [], status: [], validated: []
        , win: 0, loss: 0, banner: 0, trim: 0, back: 0, fore: 0
    }
    let o: gang = {
        name: '', members: [], handles: [], genders: [], melee: [], status: [], validated: []
        , win: 0, loss: 0, banner: 0, trim: 0, back: 0, fore: 0
    }
    let posse: active[]
    let nme: active[]

    let party: choices = {
        'L': { description: 'List all gangs' },
        'M': { description: 'Most Wanted list' },
        'J': { description: 'Join a gang' },
        'F': { description: 'Fight another gang' },
        'S': { description: 'Start a new gang' },
        'E': { description: 'Edit your gang' },
        'R': { description: 'Resign your membership' },
        'T': { description: 'Transfer leadership' }
    }

    export function menu(suppress = true) {
        if (checkXP($.online, menu)) return
        if ($.online.altered) PC.saveUser($.online)
        if (!$.reason && $.online.hp < 1) death('fought bravely?')
        if ($.reason) vt.hangup()

        vt.action('party')
        vt.form = {
            'menu': { cb: choice, cancel: 'q', enter: '?', eol: false }
        }

        let hints = ''
        if (!$.player.gang)
            hints += `> Join an existing gang or start a new one.\n`

        vt.form['menu'].prompt = display('party', vt.Magenta, vt.magenta, suppress, party, hints)
        vt.focus = 'menu'
    }

    function choice() {
        let suppress = false
        let choice = vt.entry.toUpperCase()
        if (party[choice]?.description) {
            vt.out(' - ', party[choice].description)
            suppress = $.player.expert
        }
        vt.outln()

        let rs: any[]

        switch (choice) {
            case 'L':
                rs = db.query(`SELECT * FROM Gangs`)
                for (let i = 0; i < rs.length; i += 2) {
                    if (i + 1 < rs.length)
                        showGang(PC.loadGang(rs[i]), PC.loadGang(rs[i + 1]))
                    else
                        showGang(PC.loadGang(rs[i]))
                }
                suppress = true
                break

            case 'M':
                vt.outln()
                vt.outln(vt.Blue, vt.bright, '        Party            Win-Loss   Ratio ')
                vt.outln(vt.Blue, vt.bright, '------------------------------------------')
                rs = db.query(`SELECT * FROM Gangs ORDER BY win DESC, loss ASC`)
                let crown = true
                for (let i in rs) {
                    let ratio = '  ' + (crown ? 'GOAT' : rs[i].loss ? sprintf('%5.3f', rs[i].win / (rs[i].win + rs[i].loss)).substr(1) : ' ---')
                    vt.out(sprintf('%-22s %5u-%-5u ', rs[i].name, rs[i].win, rs[i].loss), ratio)
                    if (crown) {
                        vt.out(' ', vt.bright, vt.yellow, $.player.emulation == 'XT' ? '👑' : '+')
                        crown = false
                    }
                    vt.outln()
                }
                suppress = true
                break

            case 'S':
                if (!$.access.roleplay) break
                if ($.player.gang) {
                    vt.beep()
                    vt.outln(`\nYou are already a member of ${$.player.gang}.`)
                    suppress = true
                    break
                }
                g = {
                    name: '', members: [], handles: [], genders: [], melee: [], status: [], validated: []
                    , win: 0, loss: 0, banner: 0, trim: 0, back: 0, fore: 0
                }

                vt.action('freetext')
                vt.form = {
                    'new': {
                        cb: () => {
                            vt.outln()
                            g.name = titlecase(vt.entry)
                            if (g.name == 'New' || cuss(g.name))
                                vt.hangup()
                            if (!g.name || /King|Mash|Mon|Queen/.test(g.name)) {
                                menu()
                                return
                            }
                            g.members = [$.player.id]
                            g.handles = [$.player.handle]
                            g.validated = [true]
                            g.banner = dice(7)
                            g.trim = dice(7)
                            g.back = dice(7)
                            g.fore = dice(7)
                            showGang(g)
                            xtGang(g.name, $.player.gender, $.player.melee, g.banner, g.trim)
                            vt.action('yn')
                            vt.focus = 'accept'
                        }, prompt: 'New gang name? ', min: 2, max: 22
                    },
                    'accept': {
                        cb: () => {
                            vt.outln()
                            if (/Y/i.test(vt.entry)) {
                                $.player.gang = g.name
                                $.online.altered = true
                                vt.outln()
                                PC.saveGang(g, true)
                                cat('party/gang')
                                vt.sound('click', 20)
                                menu()
                            }
                            else {
                                g.banner = dice(7)
                                g.trim = dice(7)
                                g.back = dice(7)
                                g.fore = dice(7)
                                showGang(g)
                                vt.refocus()
                            }
                        }, prompt: 'Accept this banner (Y/N)? '
                        , cancel: 'N', enter: 'Y', eol: false, match: /Y|N/i, timeout: 20
                    }
                }
                vt.focus = 'new'
                return

            case 'R':
                if (!$.access.roleplay) break
                if (!$.player.gang) break
                if (!$.party) {
                    vt.beep()
                    vt.outln('\nYou cannot resign from your gang after party fights.')
                    suppress = true
                    break
                }

                g = PC.loadGang(db.query(`SELECT * FROM Gangs WHERE name = '${$.player.gang}'`)[0])
                showGang(g)
                xtGang(g.name, $.player.gender, $.player.melee, g.banner, g.trim)
                vt.sound('ddd', 6)

                vt.action('ny')
                vt.form = {
                    'resign': {
                        cb: () => {
                            vt.outln()
                            if (/Y/i.test(vt.entry)) {
                                $.player.gang = ''
                                $.player.coward = true
                                $.online.altered = true
                                let i = g.members.indexOf($.player.id)
                                if (i > 0) {
                                    g.members.splice(i, 1)
                                    PC.saveGang(g)
                                }
                                else {
                                    PC.adjust('cha', -2, -1)
                                    vt.out('\nDissolving the gang... ')
                                    db.run(`UPDATE Players SET gang = '' WHERE gang = '${g.name}'`)
                                    db.run(`DELETE FROM Gangs WHERE name = '${g.name}'`)
                                    vt.outln()
                                }
                                PC.adjust('str'
                                    , $.online.str > 40 ? -dice(6) - 4 : -3
                                    , $.player.str > 60 ? -dice(3) - 2 : -2
                                    , $.player.maxstr > 80 ? -2 : -1)
                                PC.adjust('int'
                                    , $.online.int > 40 ? -dice(6) - 4 : -3
                                    , $.player.int > 60 ? -dice(3) - 2 : -2
                                    , $.player.maxint > 80 ? -2 : -1)
                                PC.adjust('dex'
                                    , $.online.dex > 40 ? -dice(6) - 4 : -3
                                    , $.player.dex > 60 ? -dice(3) - 2 : -2
                                    , $.player.maxdex > 80 ? -2 : -1)
                                PC.adjust('cha'
                                    , $.online.cha > 40 ? -dice(6) - 4 : -3
                                    , $.player.cha > 60 ? -dice(3) - 2 : -2
                                    , $.player.maxcha > 80 ? -2 : -1)
                            }
                            g = {
                                name: '', members: [], handles: [], genders: [], melee: [], status: [], validated: []
                                , win: 0, loss: 0, banner: 0, trim: 0, back: 0, fore: 0
                            }
                            menu()
                        }, prompt: 'Resign (Y/N)? ', enter: 'N', eol: false, match: /Y|N/i
                    }
                }
                vt.focus = 'resign'
                return

            case 'J':
                if (!$.access.roleplay) break
                if ($.player.gang) {
                    vt.beep()
                    vt.outln(`\nYou are already a member of ${$.player.gang}.`)
                    suppress = true
                    break
                }

                g.members = []
                rs = db.query(`SELECT * FROM Gangs ORDER BY name`)
                do {
                    g = PC.loadGang(rs[0])
                    rs.splice(0, 1)
                    if (g.members.length < 4 || g.members.indexOf($.player.id) > 0)
                        break
                } while (rs.length)

                if (g.members.length > 0 && (g.members.length < 4 || g.members.indexOf($.player.id) > 0)) {
                    showGang(g)

                    vt.action('ny')
                    vt.form = {
                        'join': {
                            cb: () => {
                                if (/Y/i.test(vt.entry)) {
                                    $.player.gang = g.name
                                    $.online.altered = true
                                    if (g.members.indexOf($.player.id) < 0)
                                        g.members.push($.player.id)
                                    db.run(`UPDATE Gangs SET members = '${g.members.join()}' WHERE name = '${g.name}'`)
                                    vt.outln('\n')
                                    cat('party/gang')
                                    vt.sound('click', 12)
                                    vt.outln(vt.cyan, 'You are now a member of ', vt.bright, g.name, vt.normal, '.', -1200)
                                }
                                else {
                                    g.members = []
                                    while (rs.length) {
                                        g = PC.loadGang(rs[0])
                                        rs.splice(0, 1)
                                        if (g.members.length < 4 || g.members.indexOf($.player.id) > 0)
                                            break
                                    }
                                    if (g.members.length > 0 && (g.members.length < 4 || g.members.indexOf($.player.id) > 0)) {
                                        showGang(g)
                                        vt.refocus()
                                        return
                                    }
                                }
                                menu()
                            }, prompt: 'Join (Y/N)? ', enter: 'N', eol: false, match: /Y|N/i
                        }
                    }
                    vt.focus = 'join'
                    return
                }
                break

            case 'T':
                if (!$.access.roleplay) break
                if (!$.player.gang) break

                g = PC.loadGang(db.query(`SELECT * FROM Gangs WHERE name = '${$.player.gang}'`)[0])
                showGang(g)
                if (g.members.indexOf($.player.id) != 0) {
                    vt.beep()
                    vt.outln('\nYou are not its leader.')
                    break
                }
                xtGang(g.name, $.player.gender, $.player.melee, g.banner, g.trim)
                vt.sound('ddd', 6)

                Battle.user('Transfer leadership to', (member: active) => {
                    let n = g.members.indexOf(member.user.id)
                    if (n < 0) {
                        vt.beep()
                        if (member.user.id) {
                            vt.profile(member)
                            vt.outln(`\n${member.user.handle} is not a member.`)
                        }
                    }
                    else {
                        if (member.user.gang == g.name) {
                            g.members[0] = member.user.id
                            g.members[n] = $.player.id
                            PC.saveGang(g)
                            g = PC.loadGang(db.query(`SELECT * FROM Gangs WHERE name = '${$.player.gang}'`)[0])
                            showGang(g)
                            vt.outln()
                            vt.outln(vt.bright, member.user.handle, ' is now leader of ', g.name, '.')
                        }
                        else {
                            vt.beep()
                            vt.outln(`\n${member.user.handle} has not accepted membership.`)
                        }
                    }
                    menu()
                })
                return

            case 'E':
                if (!$.access.roleplay) break
                if (!$.player.gang) break
                if (!$.party) {
                    vt.beep()
                    vt.outln('\nYou cannot edit your gang after party fights.')
                    suppress = true
                    break
                }

                g = PC.loadGang(db.query(`SELECT * FROM Gangs WHERE name = '${$.player.gang}'`)[0])
                showGang(g)
                if (g.members.indexOf($.player.id) != 0) {
                    vt.beep()
                    vt.outln('\nYou are not its leader.')
                    break
                }
                xtGang(g.name, $.player.gender, $.player.melee, g.banner, g.trim)
                vt.action('ny')

                vt.form = {
                    'drop': {
                        cb: () => {
                            if (/Y/i.test(vt.entry)) {
                                Battle.user('Drop', (member: active) => {
                                    if (member.user.id !== '') {
                                        let n = g.members.indexOf(member.user.id)
                                        if (n < 0) {
                                            vt.beep()
                                            if (member.user.handle) vt.outln(`\n${member.user.handle} is not a member.`)
                                        }
                                        else {
                                            if (!db.lock(member.user.id)) {
                                                vt.beep()
                                                vt.outln(`\n${PC.who(member).He}is currently engaged elsewhere and not available.`)
                                            }
                                            else {
                                                if (member.user.gang == g.name) {
                                                    member.user.gang = ''
                                                    db.run(`UPDATE Players SET gang='' WHERE id='${member.user.id}'`)
                                                }
                                                g.members.splice(n, 1)
                                                g.handles.splice(n, 1)
                                                PC.saveGang(g)
                                                showGang(g)
                                                vt.sound('click')
                                                vt.outln()
                                                vt.outln(vt.bright, member.user.handle, ' is no longer on ', g.name, '.')
                                            }
                                        }
                                    }
                                    menu()
                                })
                            }
                            else
                                vt.focus = 'invite'
                        }, prompt: 'Drop a member (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                    },
                    'invite': {
                        cb: () => {
                            if (/Y/i.test(vt.entry)) {
                                Battle.user('Invite', (member: active) => {
                                    if (member.user.id !== '') {
                                        let n = g.members.indexOf(member.user.id)
                                        if (n >= 0) {
                                            vt.beep()
                                            vt.outln(`\n${member.user.handle} is already a member.`)
                                        }
                                        else {
                                            if (!member.user.gang) {
                                                g.members.push(member.user.id)
                                                g.handles.push(member.user.handle)
                                                PC.saveGang(g)
                                                showGang(g)
                                                log(member.user.id, `\n${$.player.handle} invites you to join ${g.name}`)
                                                vt.sound('click')
                                                vt.outln()
                                                vt.outln(vt.bright, member.user.handle, ' is invited to join ', g.name, '.')
                                            }
                                        }
                                    }
                                    menu()
                                })
                            }
                            else
                                menu()
                        }, prompt: 'Invite another player (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                    }
                }
                vt.focus = 'drop'
                return

            case 'F':
                if (!$.access.roleplay) break
                if (!$.player.gang) break
                if (!$.party) {
                    vt.beep()
                    vt.outln('\nYou have no more party fights.')
                    suppress = true
                    break
                }

                rs = db.query(`SELECT * FROM Gangs ORDER BY name`)
                for (let i = 0; i < rs.length; i++) {
                    o = PC.loadGang(rs[i])
                    if (o.name !== $.player.gang)
                        vt.out(bracket(i + 1), o.name)
                }

                vt.action('listmm')
                vt.form = {
                    'gang': {
                        cb: () => {
                            vt.outln()
                            let i = (+vt.entry >> 0) - 1
                            if (/M/i.test(vt.entry)) {
                                rs = [rs.find((x) => { return x.name == 'Monster Mash' })]
                                i = 0
                            }
                            if (!rs[i]) {
                                vt.beep()
                                menu()
                                return
                            }

                            g = PC.loadGang(db.query(`SELECT * FROM Gangs WHERE name = '${$.player.gang}'`)[0])
                            o = PC.loadGang(rs[i])
                            if (o.name == g.name) {
                                vt.refocus()
                                return
                            }

                            posse = new Array($.online)
                            for (let i = 0; i < 4 && i < g.members.length; i++) {
                                if (g.members[i] !== $.player.id
                                    && (g.validated[i] || typeof g.validated[i] == 'undefined')
                                    && !g.status[i]) {
                                    let n = posse.push(<active>{ user: { id: g.members[i] } }) - 1
                                    db.loadUser(posse[n])
                                    if (posse[n].user.gang !== g.name || posse[n].user.status)
                                        posse.pop()
                                    else
                                        PC.activate(posse[n], true)
                                }
                            }

                            let monsters: monster = require('../etc/dungeon.json')
                            nme = new Array()
                            for (let i = 0; i < 4 && i < o.members.length; i++) {
                                if (!/_MM.$/.test(o.members[i])) {
                                    if ((o.validated[i] || typeof o.validated[i] == 'undefined') && !o.status[i]) {
                                        let n = nme.push(<active>{ user: { id: o.members[i] } }) - 1
                                        db.loadUser(nme[n])
                                        if (nme[n].user.gang !== o.name
                                            || !nme[n].user.xplevel || nme[n].user.status || !db.lock(nme[n].user.id, 2))
                                            nme.pop()
                                    }
                                }
                                else {
                                    nme.push(<active>{})
                                    nme[i].user = <user>{ id: '' }

                                    let mon = dice(3) - 2 + (posse[i] ? posse[i].user.level : dice(Object.keys(monsters).length / 2))
                                    mon = mon < 0 ? 0 : mon >= Object.keys(monsters).length ? Object.keys(monsters).length - 1 : mon
                                    let dm = Object.keys(monsters)[mon]
                                    let ml = mon + dice(3) - 2
                                    ml = ml < 1 ? 1 : ml > 99 ? 99 : ml
                                    nme[i].user.handle = dm
                                    nme[i].user.sex = 'I'
                                    reroll(nme[i].user, monsters[dm].pc ? monsters[dm].pc : $.player.pc, ml)

                                    nme[i].user.weapon = monsters[dm].weapon ? monsters[dm].weapon : Weapon.merchant[int((Weapon.merchant.length - 1) * ml / 100) + 1]
                                    nme[i].user.armor = monsters[dm].armor ? monsters[dm].armor : Armor.merchant[int((Armor.merchant.length - 1) * ml / 100) + 1]

                                    nme[i].user.poisons = []
                                    if (monsters[dm].poisons)
                                        for (let vials in monsters[dm].poisons)
                                            Poison.add(nme[i].user.poisons, monsters[dm].poisons[vials])

                                    nme[i].user.rings = monsters[dm].rings || []

                                    nme[i].user.spells = []
                                    if (monsters[dm].spells)
                                        for (let magic in monsters[dm].spells)
                                            Magic.add(nme[i].user.spells, monsters[dm].spells[magic])

                                    PC.activate(nme[i])
                                    nme[i].user.toWC = int(nme[i].weapon.wc / 4) + 1
                                    nme[i].user.coin = new Coin(money(ml))
                                    nme[i].user.handle = titlecase(dm)
                                    nme[i].user.gang = o.name
                                    o.handles[i] = nme[i].user.handle
                                    o.status[i] = ''
                                    o.validated[i] = true
                                }
                            }

                            if (!nme.length) {
                                vt.outln('\nThat gang is not active!')
                                menu()
                                return
                            }

                            vt.action('ny')
                            showGang(g, o, true)
                            xtGang(o.name, o.genders[0], o.melee[0], o.banner, o.trim)
                            vt.focus = 'fight'
                        }, prompt: '\nFight which gang? ', max: 2
                    },
                    'fight': {
                        cb: () => {
                            vt.outln('\n')
                            if (/Y/i.test(vt.entry)) {
                                $.party--
                                vt.music('party')

                                if (!cat('dungeon/' + nme[0].user.handle.toLowerCase()))
                                    cat('player/' + nme[0].user.pc.toLowerCase())
                                vt.outln(vt.magenta, vt.bright, nme[0].user.handle, vt.reset
                                    , ' grins as ', PC.who(nme[0]).he, 'pulls out '
                                    , PC.who(nme[0]).his, weapon(nme[0]), '.', -1200)

                                Battle.engage('Party', posse, nme, menu)
                            }
                            else {
                                db.unlock($.player.id, true)
                                menu()
                            }
                        }, prompt: 'Fight this gang (Y/N)? ', cancel: 'N', enter: 'N', eol: false, match: /Y|N/i, max: 1, timeout: 10
                    }
                }
                vt.focus = 'gang'
                return

            case 'Q':
                vt.action('clear')
                require('./main').menu($.player.expert)
                return
        }
        menu(suppress)
    }

    function showGang(lg: gang, rg?: gang, engaged = false) {
        vt.outln()

        vt.out(vt.bright, vt.white, mp[lg.banner])
        if (rg)
            vt.out(' '.repeat(31), mp[rg.banner])
        vt.outln()

        vt.out(' |', vt.Black + lg.back, vt.black + lg.fore, vt.bright)
        vt.out(le[lg.trim], tb[lg.trim].repeat(26), re[lg.trim], vt.reset)
        if (rg) {
            vt.out(' '.repeat(4), ' |', vt.Black + rg.back, vt.black + rg.fore, vt.bright)
            vt.out(le[rg.trim], tb[rg.trim].repeat(26), re[rg.trim])
        }
        vt.outln()

        vt.out(' |', vt.Black + lg.back, vt.black + lg.fore, vt.bright)
        let i = 26 - lg.name.length
        vt.out(le[lg.trim], ' '.repeat(i >> 1), lg.name, ' '.repeat((i >> 1) + i % 2), re[lg.trim], vt.reset)
        if (rg) {
            vt.out(' '.repeat(4), ' |', vt.Black + rg.back, vt.black + rg.fore, vt.bright)
            i = 26 - rg.name.length
            vt.out(le[rg.trim], ' '.repeat(i >> 1), rg.name, ' '.repeat((i >> 1) + i % 2), re[rg.trim])
        }
        vt.outln()

        vt.out(' |', vt.Black + lg.back, vt.black + lg.fore, vt.bright)
        vt.out(le[lg.trim], tb[lg.trim].repeat(26), re[lg.trim], vt.reset)
        if (rg) {
            vt.out(' '.repeat(4), ' |', vt.Black + rg.back, vt.black + rg.fore, vt.bright)
            vt.out(le[rg.trim], tb[rg.trim].repeat(26), re[rg.trim])
        }
        vt.outln()

        let n = 0
        let who: { handle: string, status: string, gang: string }[]
        while (n < 4 && ((lg && lg.members.length) || (rg && rg.members.length))) {
            if (lg) {
                vt.out(' | ')
                if (n < lg.members.length) {
                    if (lg.handles[n]) {
                        if (lg.validated[n]) {
                            if (lg.status[n]) {
                                if (engaged)
                                    vt.out(vt.faint, vt.red, 'x ')
                                else
                                    vt.out(vt.reset, vt.faint, '^ ')
                            }
                            else
                                vt.out(vt.bright, vt.white, '  ')
                        }
                        else {
                            if (typeof lg.validated[n] == 'undefined') {
                                if (engaged)
                                    vt.out(vt.faint, vt.red, 'x ')
                                else
                                    vt.out(vt.faint, vt.yellow, '> ')
                            }
                            else {
                                if (engaged)
                                    vt.out(vt.faint, vt.red, 'x ')
                                else
                                    vt.out(vt.faint, vt.red, 'x ', vt.blue)
                            }
                        }
                        vt.out(sprintf('%-24s ', lg.handles[n]))
                    }
                    else
                        vt.out(sprintf('> %-24s ', 'wired for '
                            + ['mashing', 'smashing', 'beatdown', 'pounding'][n]))
                }
                else {
                    if (engaged)
                        vt.out(sprintf(' '.repeat(27)))
                    else
                        vt.out(sprintf(' -open invitation to join- '))
                }
            }

            if (rg) {
                vt.out(vt.reset, ' '.repeat(4), ' | ')
                if (n < rg.members.length) {
                    if (rg.handles[n]) {
                        if (rg.validated[n]) {
                            if (rg.status[n]) {
                                if (engaged)
                                    vt.out(vt.faint, vt.red, 'x ')
                                else
                                    vt.out(vt.reset, vt.faint, '^ ')
                            }
                            else
                                vt.out(vt.bright, vt.white, '  ')
                        }
                        else {
                            if (typeof rg.validated[n] == 'undefined') {
                                if (engaged)
                                    vt.out(vt.faint, vt.red, 'x ')
                                else
                                    vt.out(vt.faint, vt.yellow, '> ')
                            }
                            else {
                                if (engaged)
                                    vt.out(vt.faint, vt.red, 'x ')
                                else
                                    vt.out(vt.faint, vt.red, 'x ', vt.blue)
                            }
                        }
                        vt.out(sprintf('%-24s ', rg.handles[n]))
                    }
                    else
                        vt.out(sprintf('> %-24s ', 'wired for '
                            + ['mashing', 'smashing', 'beatdown', 'pounding'][n]))
                }
                else
                    if (!engaged)
                        vt.out(sprintf(' -open invitation to join- '))
            }
            vt.outln()
            n++
        }
    }

    function xtGang(name: string, sex: string, melee: number, banner: number, coat: number) {

        switch (sex) {
            case 'I':
                vt.profile({ handle: name, leader: 'gang/leadermm', banner: 'gang/bannermm', coat: 'gang/coatmm' })
                break

            case 'F':
                vt.profile({ handle: name, leader: `gang/leader${melee}_f`, banner: `gang/banner${banner}`, coat: `gang/coat${coat}` })
                break

            default:
                vt.profile({ handle: name, leader: `gang/leader${melee}`, banner: `gang/banner${banner}`, coat: `gang/coat${coat}` })
                break
        }
    }
}

export = Party
