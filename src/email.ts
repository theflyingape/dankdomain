/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  EMAIL authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import nodemailer = require('nodemailer')
import smtpTransport = require('nodemailer-smtp-transport')
import $ = require('./common')
import db = require('./database')
import xvt = require('xvt')

module Email
{
    //let ematch: RegExp = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/

    xvt.app.form = {
        'email': { cb:email, prompt:'Enter your e-mail address now: ', min:8 },
        'check': { cb:check, prompt:'Re-enter to verify: ' }
    }

    xvt.beep()
    xvt.out('\n\nYour account requires a validated e-mail address.\n')
    xvt.app.focus = 'email'


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

    let message = require('./etc/newuser.json')
    Deliver($.player, 'secret keys to the gate', message)
}

export async function Deliver(player: user, what: string, mailOptions: nodemailer.SendMailOptions) {
    xvt.out('\n\n', xvt.magenta, xvt.bright)
    let royalty = Object.keys($.Access.name).slice($.player.gender === 'F' ? -2 : -1)[0]
    xvt.out(`The ${royalty} orders the royal scribe to dispatch ${what}\nfor ${$.player.handle} <${$.player.email}> `, xvt.reset)
    if ($.player.email !== $.sysop.email)
        await Message(player, mailOptions)
    else {
        xvt.out(' ...skipping delivery... \nCheck SQLite3 table for relevant information.\n')
        db.saveUser(player, true)
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
                    xvt.out(xvt.reset, '\nEmail Deliver Message ', error,'\n')
                    player.id = ''
                    player.email = ''
                    xvt.out('\nSorry -- your user registration was aborted.\n')
                    xvt.out('Please contact the sysop with this error message.\n')
                    result = false
                }
                else {
                    xvt.out('\n', info.response)
                    db.saveUser(player, true)
                    xvt.out('\nYour user ID (', xvt.bright, player.id, xvt.nobright, ') was saved.\n')
                    result = true
                }
            })
        }
    })

    while (result === undefined) {
        xvt.out('. ')
        await xvt.wait(500)
    }
}

}

export = Email
