/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  EMAIL authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import fs = require('fs')
import nodemailer = require('nodemailer')
import smtpTransport = require('nodemailer-smtp-transport')

import $ = require('./common')
import xvt = require('xvt')

module Email
{
    //let ematch: RegExp = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/
    let echo = true

    $.action('freetext')
    xvt.app.form = {
        'email': { cb:email, prompt:'Enter your e-mail address now: ', min:8 },
        'check': { cb:check, prompt:'Re-enter email to verify: ' }
    }

export function newuser() {
    xvt.beep()
    xvt.out('\n\nYour account requires a validated e-mail address.\n')
    xvt.app.focus = 'email'
}

function email() {
    $.player.email = xvt.entry.toLowerCase()
    if (!xvt.validator.isEmail($.player.email)) {
        xvt.app.refocus()
        return
    }

    xvt.app.form['check'].max = $.player.email.length
    xvt.app.focus = 'check'
}

function check() {
    let check = xvt.entry.toLowerCase()
    if ($.player.email !== check) {
        xvt.beep()
        xvt.out('\nYour entries do not match -- try again\n')
        xvt.app.focus = 'email'
        return
    }

    $.player.password = String.fromCharCode(64 + $.dice(26)) + String.fromCharCode(96 + $.dice(26)) + $.dice(999) + '!@#$%^&*'[$.dice(8) - 1]

    let rs = $.query(`SELECT count(email) AS n FROM Players WHERE email = '${$.player.email}' GROUP BY email`)
    if (rs.length && rs[0].n > 2)
        $.player.access = Object.keys($.Access.name)[1]

    try {
        let message = JSON.parse(fs.readFileSync('./etc/newuser.json').toString())
        Deliver($.player, 'secret keys to the gate', false, message)
    } catch(e) {}
}

export async function newsletter(player: user) {
    try {
        let message = JSON.parse(fs.readFileSync('./etc/newsletter.json').toString())
        await Message(player, message)
    } catch(e) {}
}

export async function rejoin(player: user) {
    try {
        echo = false
        let message = JSON.parse(fs.readFileSync('./etc/rejoin.json').toString())
        await Message(player, message)
    } catch(e) {}
}

export function resend() {
    xvt.app.form['check'].cb = () => {
        let check = xvt.entry.toLowerCase()
        if ($.player.email !== check) {
            xvt.beep()
            xvt.out('\nYour entry does not match what is registered.\n')
            xvt.hangup()
        }
        try {
            let message = JSON.parse(fs.readFileSync('./etc/resend.json').toString())
            Deliver($.player, 'secret keys (again) to the gate', true, message)
        } catch(e) {}
    }
    xvt.app.form['check'].max = $.player.email.length
    xvt.app.focus = 'check'
}

export async function Deliver(player: user, what: string, repeat: boolean, mailOptions: nodemailer.SendMailOptions) {
    xvt.out('\n\n', xvt.magenta, xvt.bright)
    let royalty = Object.keys($.Access.name).slice($.player.gender === 'F' ? -2 : -1)[0]
    if (xvt.emulation === 'XT') xvt.out('\u{1F451} ')
    xvt.out(`The ${royalty} orders the royal scribe to dispatch ${what}\nfor ${$.player.handle} ` + (!repeat ? `<${$.player.email}> ` : ''), xvt.reset)
    if ($.player.email !== $.sysop.email)
        await Message(player, mailOptions)
    else {
        xvt.out(' ...skipping delivery... \nCheck SQLite3 table for relevant information.\n')
        xvt.out(`select id,handle,access,password from Players where id='${player.id}';`)
        if ($.reason.length)
            $.saveUser(player, true)
    }
    xvt.out('\n')
    xvt.waste(1000)
    $.logoff()
    xvt.hangup()
}

async function Message(player: user, mailOptions: nodemailer.SendMailOptions) {

	let smtpOptions: smtpTransport.SmtpOptions = require('./etc/smtp.json')
    let smtp = nodemailer.createTransport(smtpTransport(smtpOptions))
	mailOptions.from = `"${$.sysop.handle} @ ${$.sysop.name}" <${$.sysop.email}>`
    mailOptions.to = `${player.name} <${player.email}>`
    mailOptions.text = eval('`' + mailOptions.text.toString() + '`')

    var result: boolean

    smtp.verify(error => {
        if (error) {
            xvt.out(error)
            result = false
        }
        else {
            smtp.sendMail(mailOptions, (error, info) => {
                if (error) {
                    xvt.out(xvt.reset, '\nEmail Deliver Message to ', player.handle, '\n', error,'\n')
                    if (echo) {
                        player.id = ''
                        player.email = ''
                        xvt.out('\nSorry -- your user registration was aborted.\n')
                        xvt.out('Please contact the sysop with this error message.\n')
                    }
                    result = false
                }
                else {
                    xvt.out('\n', info.response)
                    if ($.reason.length) {
                        $.saveUser(player, true)
                        if (echo)
                            xvt.out('\nYour user ID (', xvt.bright, player.id, xvt.normal, ') was saved, ', $.Access.name[player.access][player.gender], '.\n')
                    }
                    result = true
                }
            })
        }
    })

    while (result === undefined) {
        if (echo) xvt.out(xvt.Empty[xvt.emulation])
        await xvt.wait(500)
    }
}

}

export = Email
