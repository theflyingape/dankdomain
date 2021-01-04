/*****************************************************************************\
 *  Ɗanƙ Ɗomaiƞ: the return of Hack & Slash                                  *
 *  EMAIL authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import fs = require('fs')
import nodemailer = require('nodemailer')
import smtpTransport = require('nodemailer-smtp-transport')
import db = require('./db')
import $ = require('./runtime')
import { vt, action, music, sound } from './io'
import { Access } from './items'
import { PC } from './pc'
import { dice } from './sys'

module Email {

    let echo = true

    action('freetext')
    vt.form = {
        'email': { cb: email, prompt: 'Enter your e-mail address now: ', min: 8 },
        'check': { cb: check, prompt: 'Re-enter email to verify: ' }
    }

    export function newuser() {
        vt.beep()
        vt.outln('\n\nYour account requires a validated e-mail address.')
        vt.focus = 'email'
    }

    function email() {
        $.player.email = vt.entry.toLowerCase()
        /*
        if (!isEmail($.player.email)) {
            vt.refocus()
            return
        }
        */
        vt.form['check'].max = $.player.email.length
        vt.focus = 'check'
    }

    function check() {
        let check = vt.entry.toLowerCase()
        if ($.player.email !== check) {
            vt.beep()
            vt.outln('\nYour entries do not match -- try again')
            vt.focus = 'email'
            return
        }

        $.player.password = String.fromCharCode(64 + dice(26)) + String.fromCharCode(96 + dice(26)) + dice(999) + '!@#$%^&*'[dice(8) - 1]

        let rs = db.query(`SELECT COUNT(email) AS n FROM Players WHERE email='${$.player.email}' GROUP BY email`)
        if (rs.length && rs[0].n > 2) $.player.access = Object.keys(Access.name)[1]

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
        vt.form['check'].cb = () => {
            let check = vt.entry.toLowerCase()
            if ($.player.email !== check) {
                vt.beep()
                vt.outln('\nYour entry does not match what is registered.')
                vt.hangup()
            }
            try {
                let message = JSON.parse(fs.readFileSync('./etc/resend.json').toString())
                Deliver($.player, 'your key for the City Gate', true, message)
            } catch (e) { }
        }
        vt.form['check'].max = $.player.email.length
        vt.focus = 'check'
    }

    export async function Deliver(player: user, what: string, repeat: boolean, mailOptions: nodemailer.SendMailOptions) {
        vt.out('\n\n', vt.magenta, vt.bright)
        let royalty = Object.keys(Access.name).slice($.player.gender == 'F' ? -2 : -1)[0]
        if ($.player.emulation == 'XT') vt.out('👑 ')
        vt.out(`The ${royalty} orders the royal scribe to dispatch ${what}\naddressed to ${$.player.handle} ` + (!repeat ? `<${$.player.email}> ` : ''), vt.reset)
        if ($.player.email !== $.sysop.email)
            await Message(player, mailOptions)
        else {
            vt.outln(' ...skipping delivery... \nCheck SQLite3 table for relevant information:')
            vt.outln(`$ sqlite3 ./users/dankdomain.sql`)
            vt.outln(`SELECT id,handle,access,password FROM Players WHERE id='${player.id}';`)
            vt.outln(`...or its exported save file:`)
            vt.out(`$ grep password ./users/.${player.id}.json`)
            if ($.reason.length)
                PC.saveUser(player, true)
        }
        music('.')
        vt.outln(-1000)
        vt.hangup()
    }

    async function Message(player: user, mailOptions: nodemailer.SendMailOptions) {

        let smtpOptions: smtpTransport.SmtpOptions
        try { smtpOptions = require('./etc/smtp.json') }
        catch (err) {
            if (echo) {
                vt.outln(vt.red, vt.bright, './etc/smtp.json not configured for sending email')
                player.password = 'local'
                PC.saveUser(player, true)
                vt.outln('\nYour user ID (', vt.bright, player.id, vt.normal, ') was saved, ', Access.name[player.access][player.gender], '.')
                vt.outln('Your local password assigned: ', vt.bright, player.password)
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
                vt.out('→ 📨 ')
                sound('click')
            }
            await smtp.sendMail(mailOptions).then((msg) => {
                if (echo) {
                    vt.outln('📬')
                    vt.outln(msg.response)
                    if ($.reason.length) {
                        PC.saveUser(player, true)
                        vt.outln('\nYour user ID (', vt.bright, player.id, vt.normal, ') was saved, ', Access.name[player.access][player.gender], '.')
                        sound('yahoo')
                    }
                }
                result = true
            }).catch((err) => {
                if (echo) {
                    vt.outln('💣')
                    vt.outln(err.response)
                    player.id = ''
                    player.email = ''
                    vt.outln('\nSorry -- your user registration was aborted.')
                    vt.outln(`Please contact ${mailOptions.from} with this error message.`)
                    sound('boom')
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
