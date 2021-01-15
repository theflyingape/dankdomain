/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  NEWUSER authored by: Robert Hurst <theflyingape@gmail.com>               *
\*****************************************************************************/

import { cuss, date2days, date2full, titlecase, vt } from '../sys'
import $ = require('../runtime')
import { bracket, loadUser } from '../io'
import { Access } from '../items'

module NewUser {

    let editmode: boolean = false

    vt.music('newuser')
    vt.profile({ handle: 'Shall we begin?', png: 'npc/city_guard_1', effect: 'bounceInLeft' })
    vt.cls()
    vt.plot(1, 17)

    if (vt.tty == 'rlogin') {
        vt.outln(vt.blue, '--=:) ', vt.bright, 'New BBS Registration', vt.normal, ' (:=--')
        vt.out(bracket(1), vt.cyan, 'This BBS Name.:')
        vt.out(bracket(2), vt.cyan, 'The Sysop Name:')
        vt.out(bracket(3), vt.cyan, 'BBS Start Date:')
        vt.out(bracket(4), vt.cyan, 'NPC Gender (I):')
    }
    else {
        vt.outln(vt.yellow, '--=:) ', vt.bright, 'New User Registration', vt.normal, ' (:=--')
        vt.out(bracket(1), vt.cyan, `Player's Handle:`)
        vt.out(bracket(2), vt.cyan, 'Your REAL Name.:')
        vt.out(bracket(3), vt.cyan, 'Date of Birth..:')
        vt.out(bracket(4), vt.cyan, 'Gender (M/F)...:')
    }

    vt.form = {
        1: { cb: handle, row: 3, col: 23, min: 2, max: 22, match: /^[A-Z][A-Z\s]*$/i },
        2: { cb: name, row: 4, col: 23, min: 5, max: 32, match: /^[A-Z][A-Z\s]*$/i },
        3: { cb: dob, row: 5, col: 23, min: 6, max: 16, enter: '12311999' },
        4: { cb: sex, row: 6, col: 23, eol: false, cancel: 'f', enter: 'm', max: 1, match: /F|M/i, timeout: 20 },
        'edit': { cb: edit, row: 8, col: 1, prompt: 'Select field # to change or <RETURN> to save: ', max: 1, match: /^[1-4]*$/ },
    }

    for (let title in Access.name) {
        if (Access.name[title].roleplay && Access.name[title].verify)
            break
        $.player.access = title
        $.access = Access.name[$.player.access]
        $.access.roleplay = false
    }
    $.player.expires = $.player.lastdate + $.sysop.expires
    $.player.novice = true

    vt.action('freetext')
    vt.focus = 1


    function handle() {
        vt.entry = titlecase(vt.entry)
        if (vt.entry == 'New' || cuss(vt.entry))
            vt.hangup()

        let words = vt.entry.split(' ')
        for (let i = 0; i < words.length; i++)
            if (Access.name[words[i]]) {
                vt.beep()
                vt.refocus()
                return
            }

        $.player.id = ''
        $.player.handle = vt.entry
        if (loadUser($.player)) {
            vt.beep()
            vt.refocus()
            return
        }

        vt.plot(3, 23)
        vt.out(vt.cll, $.player.handle)

        vt.action(editmode ? 'list' : 'freetext')
        vt.focus = editmode ? 'edit' : 2
    }

    function name() {
        vt.entry = titlecase(vt.entry)
        if (cuss(vt.entry))
            vt.hangup()

        let words = vt.entry.split(' ')
        if (words.length < 2) {
            vt.beep()
            vt.refocus()
            return
        }
        for (let i = 0; i < words.length; i++) {
            if (words[i].length < 2 || Access.name[words[i]]) {
                vt.beep()
                vt.refocus()
                return
            }
        }

        $.player.name = vt.entry
        vt.plot(4, 23)
        vt.out(vt.cll, $.player.name)

        vt.action('list')
        vt.focus = editmode ? 'edit' : 3
    }

    function dob() {
        $.player.dob = date2days(vt.entry)
        if (isNaN($.player.dob)) {
            vt.beep()
            vt.refocus()
            return
        }

        vt.plot(5, 23)
        vt.out(vt.cll, date2full($.player.dob))

        vt.action(editmode ? 'list' : 'gender')
        vt.focus = editmode ? 'edit' : 4
    }

    function sex() {
        $.player.sex = vt.entry.toUpperCase()
        $.player.gender = $.player.sex
        vt.plot(6, 23)
        vt.out(vt.cll, $.player.sex)

        editmode = true
        vt.action('list')
        vt.focus = 'edit'
    }

    function edit() {
        if (vt.entry.length) {
            vt.action(['list', 'freetext', 'freetext', 'list', 'gender'][vt.entry])
            vt.focus = vt.entry
            return
        }

        $.player.id = ''

        let words = $.player.handle.split(' ')
        if (words.length > 1) {
            for (let i = 0; i < words.length && $.player.id.length < 3; i++)
                $.player.id += words[i][0].toUpperCase()
        }
        else
            $.player.id = $.player.handle.slice(0, 3).toUpperCase()

        if ($.player.id == 'NEW' || cuss($.player.id)) {
            vt.action('freetext')
            vt.beep()
            vt.focus = 1
            return
        }

        let check: user = { id: $.player.id, handle: '' }
        let retry: number = 1
        while (retry < 4 && loadUser(check)) {
            retry++
            check.id = `${$.player.id}${retry}`
            check.handle = ''
        }
        if (retry > 1) $.player.id = `${$.player.id}${retry}`
        if (retry > 3) $.player.id = ''

        if ($.player.id == '') {
            vt.action('freetext')
            vt.beep()
            vt.focus = 1
            return
        }

        $.reason = 'new user registration'
        require('../email').newuser()
    }

}

export = NewUser
