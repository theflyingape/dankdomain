/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  NEWUSER authored by: Robert Hurst <theflyingape@gmail.com>               *
\*****************************************************************************/

import $ = require('../common')
import xvt = require('xvt')

module NewUser {

	let editmode: boolean = false

	$.music('newuser')
	$.profile({
		png: 'npc/city_guard_1', effect: 'bounceInLeft'
		, handle: 'Shall we begin?'
	})
	xvt.out(xvt.clear)
	xvt.plot(1, 17)

	if ($.tty == 'rlogin') {
		xvt.outln(xvt.blue, '--=:) ', xvt.bright, 'New BBS Registration', xvt.normal, ' (:=--')
		xvt.out($.bracket(1), xvt.cyan, 'This BBS Name.:')
		xvt.out($.bracket(2), xvt.cyan, 'The Sysop Name:')
		xvt.out($.bracket(3), xvt.cyan, 'BBS Start Date:')
		xvt.out($.bracket(4), xvt.cyan, 'NPC Gender (I):')
	}
	else {
		xvt.outln(xvt.yellow, '--=:) ', xvt.bright, 'New User Registration', xvt.normal, ' (:=--')
		xvt.out($.bracket(1), xvt.cyan, `Player's Handle:`)
		xvt.out($.bracket(2), xvt.cyan, 'Your REAL Name.:')
		xvt.out($.bracket(3), xvt.cyan, 'Date of Birth..:')
		xvt.out($.bracket(4), xvt.cyan, 'Gender (M/F)...:')
	}

	xvt.app.form = {
		1: { cb: handle, row: 3, col: 23, min: 2, max: 22, match: /^[A-Z][A-Z\s]*$/i },
		2: { cb: name, row: 4, col: 23, min: 5, max: 32, match: /^[A-Z][A-Z\s]*$/i },
		3: { cb: dob, row: 5, col: 23, min: 6, max: 16, enter: '12311999' },
		4: { cb: sex, row: 6, col: 23, eol: false, cancel: 'f', enter: 'm', max: 1, match: /F|M/i, timeout: 20 },
		'edit': { cb: edit, row: 8, col: 1, prompt: 'Select field # to change or <RETURN> to save: ', max: 1, match: /^[1-4]*$/ },
	}

	for (let title in $.Access.name) {
		if ($.Access.name[title].roleplay && $.Access.name[title].verify)
			break
		$.player.access = title
		$.access = $.Access.name[$.player.access]
		$.access.roleplay = false
	}
	$.player.expires = $.player.lastdate + $.sysop.expires
	$.player.novice = true

	$.action('freetext')
	xvt.app.focus = 1


	function handle() {
		xvt.entry = $.titlecase(xvt.entry)
		if (xvt.entry == 'New' || $.cuss(xvt.entry))
			xvt.hangup()

		let words = xvt.entry.split(' ')
		for (let i = 0; i < words.length; i++)
			if ($.Access.name[words[i]]) {
				xvt.beep()
				xvt.app.refocus()
				return
			}

		$.player.id = ''
		$.player.handle = xvt.entry
		if ($.loadUser($.player)) {
			xvt.beep()
			xvt.app.refocus()
			return
		}

		xvt.plot(3, 23)
		xvt.out(xvt.cll, $.player.handle)

		$.action(editmode ? 'list' : 'freetext')
		xvt.app.focus = editmode ? 'edit' : 2
	}

	function name() {
		xvt.entry = $.titlecase(xvt.entry)
		if ($.cuss(xvt.entry))
			xvt.hangup()

		let words = xvt.entry.split(' ')
		if (words.length < 2) {
			xvt.beep()
			xvt.app.refocus()
			return
		}
		for (let i = 0; i < words.length; i++) {
			if (words[i].length < 2 || $.Access.name[words[i]]) {
				xvt.beep()
				xvt.app.refocus()
				return
			}
		}

		$.player.name = xvt.entry
		xvt.plot(4, 23)
		xvt.out(xvt.cll, $.player.name)

		$.action('list')
		xvt.app.focus = editmode ? 'edit' : 3
	}

	function dob() {
		$.player.dob = $.date2days(xvt.entry)
		if (isNaN($.player.dob)) {
			xvt.beep()
			xvt.app.refocus()
			return
		}

		xvt.plot(5, 23)
		xvt.out(xvt.cll, $.date2full($.player.dob))

		$.action(editmode ? 'list' : 'gender')
		xvt.app.focus = editmode ? 'edit' : 4
	}

	function sex() {
		$.player.sex = xvt.entry.toUpperCase()
		$.player.gender = $.player.sex
		xvt.plot(6, 23)
		xvt.out(xvt.cll, $.player.sex)

		editmode = true
		$.action('list')
		xvt.app.focus = 'edit'
	}

	function edit() {
		if (xvt.entry.length) {
			$.action(['list', 'freetext', 'freetext', 'list', 'gender'][xvt.entry])
			xvt.app.focus = xvt.entry
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

		if ($.player.id == 'NEW' || $.cuss($.player.id)) {
			$.action('freetext')
			xvt.beep()
			xvt.app.focus = 1
			return
		}

		let check: user = { id: $.player.id, handle: '' }
		let retry: number = 1
		while (retry < 4 && $.loadUser(check)) {
			retry++
			check.id = `${$.player.id}${retry}`
			check.handle = ''
		}
		if (retry > 1) $.player.id = `${$.player.id}${retry}`
		if (retry > 3) $.player.id = ''

		if ($.player.id == '') {
			$.action('freetext')
			xvt.beep()
			xvt.app.focus = 1
			return
		}

		$.reason = 'new user registration'
		require('../email').newuser()
	}

}

export = NewUser
