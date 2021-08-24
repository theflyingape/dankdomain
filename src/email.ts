/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  EMAIL authored by: Robert Hurst <theflyingape@gmail.com>                 *
\*****************************************************************************/

import $ = require('./play/runtime')
import db = require('./db')
import { Access } from './items'
import { vt } from './lib'
import { PC } from './pc'
import { date2str, dice, fs, pathTo } from './sys'

import nodemailer = require('nodemailer')
import smtpTransport = require('nodemailer-smtp-transport')

module email {

    let echo = true

    vt.action('freetext')
    vt.form = {
        'email': { cb: email, prompt: vt.attr(vt.cyan, 'Enter your email address: '), min: 8 },
        'check': { cb: check, prompt: vt.attr(vt.blue, vt.bright, 'Re-enter email to verify: ') }
    }

    export function newuser() {
        vt.beep()
        vt.outln('\n\nYour account requires a validated e-mail address.')
        vt.focus = 'email'
    }

    function email() {
        $.player.email = vt.entry.toLowerCase()
        /**
         * todo: validate email pattern
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

        $.player = db.fillUser('newuser', $.player)
        $.player.password = $.player.name.split(' ')[0][0].toLowerCase() + $.player.name.split(' ')[1][0].toLowerCase() + date2str($.player.dob).substr(2, 2) + '!@#$%^&*'[dice(8) - 1]

        if ($.player.email !== $.sysop.email) {
            let rs = db.query(`SELECT COUNT(email) AS n FROM Players WHERE email='${$.player.email}' GROUP BY email`)
            if (rs.length && rs[0].n > 2) $.player.access = Object.keys(Access.name)[1]
        }

        try {
            let message = JSON.parse(fs.readFileSync(pathTo('etc', 'newuser.json')).toString())
            Deliver($.player, 'a secret key for the City Gate', false, message)
        } catch (e) { }
    }

    export async function newsletter(player: user) {
        try {
            let message = JSON.parse(fs.readFileSync(pathTo('etc', 'newsletter.json')).toString())
            await Message(player, message)
        } catch (e) { }
    }

    export async function rejoin(player: user) {
        try {
            echo = false
            let message = JSON.parse(fs.readFileSync(pathTo('etc', 'rejoin.json')).toString())
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
                let message = JSON.parse(fs.readFileSync(pathTo('etc', 'resend.json')).toString())
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
            vt.outln(`$ sqlite3 ${db.DD}`)
            vt.outln(`SELECT id,handle,access,password FROM Players WHERE id='${player.id}';`)
            vt.outln(`...or its exported save file:`)
            vt.outln('$ grep password ', pathTo('users', `.${player.id}.json`))
        }
        if ($.from == 'newuser') {
            PC.save(player, true)
            $.reason = 'new user registration'
        }
        vt.outln(-1000)
        vt.hangup()
    }

    async function Message(player: user, mailOptions: nodemailer.SendMailOptions) {
        const smtpConfig = pathTo('etc', 'smtp.json')
        let smtpOptions: smtpTransport.SmtpOptions
        try { smtpOptions = require(smtpConfig) }
        catch (err) {
            if (echo) {
                vt.outln()
                vt.outln(vt.red, vt.bright, `${smtpConfig} not configured for sending email`)
                player.password = 'local'
                PC.save(player, true)
                vt.outln('\nYour user ID (', vt.bright, player.id, vt.normal, ') was saved, ', Access.name[player.access][player.gender], '.')
                vt.outln('Your password: "', vt.bright, player.password, vt.normal, '"')
            }
            return
        }

        let smtp = nodemailer.createTransport(smtpTransport(smtpOptions))
        mailOptions.from = `"${$.sysop.name}" <${$.sysop.email}>`
        mailOptions.to = `${player.name} <${player.email}>`
        mailOptions.text = eval('`' + mailOptions.text.toString() + '`')

        let result: boolean

        await smtp.verify().then(async () => {
            if (echo) {
                if (vt.emulation == 'XT') vt.out('→ 📨 ')
                vt.sound('click')
            }
            await smtp.sendMail(mailOptions).then((msg) => {
                if (echo) {
                    if (vt.emulation == 'XT') vt.outln('📬')
                    vt.outln(msg.messageId)
                    if ($.reason.length) {
                        PC.save(player, true)
                        vt.outln('\nYour user ID (', vt.bright, player.id, vt.normal, ') was saved, ', Access.name[player.access][player.gender], '.')
                        vt.sound('yahoo')
                    }
                }
                result = true
            }).catch((err) => {
                if (echo) {
                    if (vt.emulation == 'XT') vt.outln('💣')
                    vt.outln(err.response)
                    player.id = ''
                    player.email = ''
                    vt.outln('\nSorry -- your user registration was aborted.')
                    vt.outln(`Please contact ${mailOptions.from} with this error message.`)
                    vt.sound('boom')
                }
                result = false
            })
        }).catch(err => {
            console.error(err)
            result = false
        })
    }
}

export = email
