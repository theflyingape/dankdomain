/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  NEWUSER authored by: Robert Hurst <theflyingape@gmail.com>               *
\*****************************************************************************/

import $ = require('./runtime')
import { Access } from '../items'
import { loadUser } from '../db'
import { bracket, vt } from '../lib'
import { PC } from '../pc'
import { cuss, date2days, date2full, titlecase } from '../sys'

module NewUser {

    $.from = 'newuser'
    let editmode: boolean = false

    vt.music('newuser')
    vt.profile({ handle: 'Shall we begin?', png: 'npc/city_guard_1', effect: 'bounceInLeft' })
    vt.cls()
    vt.plot(1, 17)

    if (vt.tty == 'door')
        vt.outln(vt.blue, '--=:) ', vt.bright, 'BBS Door Registration', vt.normal, ' (:=--')
    else
        vt.outln(vt.yellow, '--=:) ', vt.bright, 'New User Registration', vt.normal, ' (:=--')
    vt.out(bracket(1, true, ' .'), vt.cyan, `Player's Handle:`)
    vt.out(bracket(2, true, ' .'), vt.cyan, 'Your REAL Name.:')
    if (vt.tty == 'door')
        vt.out(' ', vt.blue, vt.bright, $.player.name)
    vt.out(bracket(3, true, ' .'), vt.cyan, 'Date of Birth..:')
    vt.out(bracket(4, true, ' .'), vt.cyan, 'Gender (M/F)...:')

    vt.form = {
        1: { cb: handle, row: 3, col: 23, min: 2, max: 22, match: /^[A-Z][A-Z\s]*$/i },
        2: { cb: name, row: 4, col: 23, min: 5, max: 32, match: /^[A-Z][A-Z\s]*$/i },
        3: { cb: dob, row: 5, col: 23, min: 6, max: 16, enter: '12311999' },
        4: { cb: sex, row: 6, col: 23, eol: false, cancel: 'f', enter: 'm', max: 1, match: /F|M/i, timeout: 20 },
        'edit': { cb: edit, row: 8, col: 1, prompt: 'Select field # to change or <RETURN> to save: ', max: 1, match: /^[1-4]*$/ },
    }

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

        $.player.handle = vt.entry
        let check: user = { id: '', handle: $.player.handle }
        if (loadUser(check)) {
            vt.beep()
            vt.refocus()
            return
        }

        vt.plot(3, 23)
        vt.out(vt.cll, $.player.handle)

        vt.action(editmode ? 'list' : 'freetext')
        vt.focus = editmode ? 'edit' : vt.tty == 'door' ? 3 : 2
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

        if (vt.tty == 'door') {
            $.player.id = $.door[25]
            $.player.password = $.door[10]
            $.player.email = $.door[11] || $.door[12] || 'nobody@localhost'
            PC.save($.player, true)
            vt.out('\nYour user ID (', vt.bright, $.player.id, vt.normal, ') was saved.')
            vt.outln(-2000)
            require('./init').startup($.player.id)
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

        require('../email').newuser()
    }

}

export = NewUser
