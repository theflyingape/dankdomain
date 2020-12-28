/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  EMAIL authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import $ = require('./common')
import fs = require('fs')
import nodemailer = require('nodemailer')
import smtpTransport = require('nodemailer-smtp-transport')
import xvt = require('xvt')
import { isEmail } from 'class-validator'

module Email {

    let echo = true

    $.action('freetext')
    xvt.app.form = {
        'email': { cb: email, prompt: 'Enter your e-mail address now: ', min: 8 },
        'check': { cb: check, prompt: 'Re-enter email to verify: ' }
    }

    export function newuser() {
        xvt.beep()
        xvt.outln('\n\nYour account requires a validated e-mail address.')
        xvt.app.focus = 'email'
    }

    function email() {
        $.player.email = xvt.entry.toLowerCase()
        if (!isEmail($.player.email)) {
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
            xvt.outln('\nYour entries do not match -- try again')
            xvt.app.focus = 'email'
            return
        }

        $.player.password = String.fromCharCode(64 + $.dice(26)) + String.fromCharCode(96 + $.dice(26)) + $.dice(999) + '!@#$%^&*'[$.dice(8) - 1]

        let rs = $.query(`SELECT COUNT(email) AS n FROM Players WHERE email='${$.player.email}' GROUP BY email`)
        if (rs.length && rs[0].n > 2) $.player.access = Object.keys($.Access.name)[1]

        try {
            let message = JSON.parse(fs.readFileSync('./etc/newuser.json').toString())
            Deliver($.player, 'a secret key for the City Gate', false, message)
        } catch (e) { }
    }

    export async function newsletter(player: user) {
        try {
            let message = JSON.parse(fs.readFileSync('./etc/newsletter.json').toString())
            await Message(player, message)
        } catch (e) { }
    }

    export async function rejoin(player: user) {
        try {
            echo = false
            let message = JSON.parse(fs.readFileSync('./etc/rejoin.json').toString())
            await Message(player, message)
        } catch (e) { }
    }

    export function resend() {
        xvt.app.form['check'].cb = () => {
            let check = xvt.entry.toLowerCase()
            if ($.player.email !== check) {
                xvt.beep()
                xvt.outln('\nYour entry does not match what is registered.')
                xvt.hangup()
            }
            try {
                let message = JSON.parse(fs.readFileSync('./etc/resend.json').toString())
                Deliver($.player, 'your key for the City Gate', true, message)
            } catch (e) { }
        }
        xvt.app.form['check'].max = $.player.email.length
        xvt.app.focus = 'check'
    }

    export async function Deliver(player: user, what: string, repeat: boolean, mailOptions: nodemailer.SendMailOptions) {
        xvt.out('\n\n', xvt.magenta, xvt.bright)
        let royalty = Object.keys($.Access.name).slice($.player.gender == 'F' ? -2 : -1)[0]
        if ($.player.emulation == 'XT') xvt.out('👑 ')
        xvt.out(`The ${royalty} orders the royal scribe to dispatch ${what}\naddressed to ${$.player.handle} ` + (!repeat ? `<${$.player.email}> ` : ''), xvt.reset)
        if ($.player.email !== $.sysop.email)
            await Message(player, mailOptions)
        else {
            xvt.outln(' ...skipping delivery... \nCheck SQLite3 table for relevant information:')
            xvt.outln(`$ sqlite3 ./users/dankdomain.sql`)
            xvt.outln(`SELECT id,handle,access,password FROM Players WHERE id='${player.id}';`)
            xvt.outln(`...or its exported save file:`)
            xvt.out(`$ grep password ./users/.${player.id}.json`)
            if ($.reason.length)
                $.saveUser(player, true)
        }
        $.music('.')
        xvt.outln(-1000)
        $.logoff()
        xvt.hangup()
    }

    async function Message(player: user, mailOptions: nodemailer.SendMailOptions) {

        let smtpOptions: smtpTransport.SmtpOptions
        try { smtpOptions = require('./etc/smtp.json') }
        catch (err) {
            if (echo) {
                xvt.outln(xvt.red, xvt.bright, './etc/smtp.json not configured for sending email')
                player.password = 'local'
                $.saveUser(player, true)
                xvt.outln('\nYour user ID (', xvt.bright, player.id, xvt.normal, ') was saved, ', $.Access.name[player.access][player.gender], '.')
                xvt.outln('Your local password assigned: ', xvt.bright, player.password)
            }
            return
        }

        let smtp = nodemailer.createTransport(smtpTransport(smtpOptions))
        mailOptions.from = `"${$.sysop.handle} @ ${$.sysop.name}" <${$.sysop.email}>`
        mailOptions.to = `${player.name} <${player.email}>`
        mailOptions.text = eval('`' + mailOptions.text.toString() + '`')

        let result: boolean

        await smtp.verify().then(async () => {
            if (echo) {
                xvt.out('→ 📨 ')
                $.sound('click')
            }
            await smtp.sendMail(mailOptions).then((msg) => {
                if (echo) {
                    xvt.outln('📬')
                    xvt.outln(msg.response)
                    if ($.reason.length) {
                        $.saveUser(player, true)
                        xvt.outln('\nYour user ID (', xvt.bright, player.id, xvt.normal, ') was saved, ', $.Access.name[player.access][player.gender], '.')
                        $.sound('yahoo')
                    }
                }
                result = true
            }).catch((err) => {
                if (echo) {
                    xvt.outln('💣')
                    xvt.outln(err.response)
                    player.id = ''
                    player.email = ''
                    xvt.outln('\nSorry -- your user registration was aborted.')
                    xvt.outln(`Please contact ${mailOptions.from} with this error message.`)
                    $.sound('boom')
                }
                result = false
            })
        }).catch(err => {
            console.error(err)
            result = false
        })
    }
}

export = Email
