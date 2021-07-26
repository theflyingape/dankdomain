"use strict";
const $ = require("./runtime");
const db = require("./db");
const items_1 = require("./items");
const lib_1 = require("./lib");
const pc_1 = require("./pc");
const sys_1 = require("./sys");
const nodemailer = require("nodemailer");
const smtpTransport = require("nodemailer-smtp-transport");
var Email;
(function (Email) {
    let echo = true;
    lib_1.vt.action('freetext');
    lib_1.vt.form = {
        'email': { cb: email, prompt: lib_1.vt.attr(lib_1.vt.cyan, 'Enter your email address: '), min: 8 },
        'check': { cb: check, prompt: lib_1.vt.attr(lib_1.vt.blue, lib_1.vt.bright, 'Re-enter email to verify: ') }
    };
    function newuser() {
        lib_1.vt.beep();
        lib_1.vt.outln('\n\nYour account requires a validated e-mail address.');
        lib_1.vt.focus = 'email';
    }
    Email.newuser = newuser;
    function email() {
        $.player.email = lib_1.vt.entry.toLowerCase();
        lib_1.vt.form['check'].max = $.player.email.length;
        lib_1.vt.focus = 'check';
    }
    function check() {
        let check = lib_1.vt.entry.toLowerCase();
        if ($.player.email !== check) {
            lib_1.vt.beep();
            lib_1.vt.outln('\nYour entries do not match -- try again');
            lib_1.vt.focus = 'email';
            return;
        }
        $.player = db.fillUser('newuser', $.player);
        $.player.password = $.player.name.split(' ')[0][0].toLowerCase() + $.player.name.split(' ')[1][0].toLowerCase() + sys_1.date2str($.player.dob).substr(2, 2) + '!@#$%^&*'[sys_1.dice(8) - 1];
        if ($.player.email !== $.sysop.email) {
            let rs = db.query(`SELECT COUNT(email) AS n FROM Players WHERE email='${$.player.email}' GROUP BY email`);
            if (rs.length && rs[0].n > 2)
                $.player.access = Object.keys(items_1.Access.name)[1];
        }
        try {
            let message = JSON.parse(sys_1.fs.readFileSync(sys_1.pathTo('etc', 'newuser.json')).toString());
            Deliver($.player, 'a secret key for the City Gate', false, message);
        }
        catch (e) { }
    }
    async function newsletter(player) {
        try {
            let message = JSON.parse(sys_1.fs.readFileSync(sys_1.pathTo('etc', 'newsletter.json')).toString());
            await Message(player, message);
        }
        catch (e) { }
    }
    Email.newsletter = newsletter;
    async function rejoin(player) {
        try {
            echo = false;
            let message = JSON.parse(sys_1.fs.readFileSync(sys_1.pathTo('etc', 'rejoin.json')).toString());
            await Message(player, message);
        }
        catch (e) { }
    }
    Email.rejoin = rejoin;
    function resend() {
        lib_1.vt.form['check'].cb = () => {
            let check = lib_1.vt.entry.toLowerCase();
            if ($.player.email !== check) {
                lib_1.vt.beep();
                lib_1.vt.outln('\nYour entry does not match what is registered.');
                lib_1.vt.hangup();
            }
            try {
                let message = JSON.parse(sys_1.fs.readFileSync(sys_1.pathTo('etc', 'resend.json')).toString());
                Deliver($.player, 'your key for the City Gate', true, message);
            }
            catch (e) { }
        };
        lib_1.vt.form['check'].max = $.player.email.length;
        lib_1.vt.focus = 'check';
    }
    Email.resend = resend;
    async function Deliver(player, what, repeat, mailOptions) {
        lib_1.vt.out('\n\n', lib_1.vt.magenta, lib_1.vt.bright);
        let royalty = Object.keys(items_1.Access.name).slice($.player.gender == 'F' ? -2 : -1)[0];
        if ($.player.emulation == 'XT')
            lib_1.vt.out('👑 ');
        lib_1.vt.out(`The ${royalty} orders the royal scribe to dispatch ${what}\naddressed to ${$.player.handle} ` + (!repeat ? `<${$.player.email}> ` : ''), lib_1.vt.reset);
        if ($.player.email !== $.sysop.email)
            await Message(player, mailOptions);
        else {
            lib_1.vt.outln(' ...skipping delivery... \nCheck SQLite3 table for relevant information:');
            lib_1.vt.outln(`$ sqlite3 ${db.DD}`);
            lib_1.vt.outln(`SELECT id,handle,access,password FROM Players WHERE id='${player.id}';`);
            lib_1.vt.outln(`...or its exported save file:`);
            lib_1.vt.outln('$ grep password ', sys_1.pathTo('users', `.${player.id}.json`));
        }
        if ($.from == 'newuser') {
            pc_1.PC.save(player, true);
            $.reason = 'new user registration';
        }
        lib_1.vt.outln(-1000);
        lib_1.vt.hangup();
    }
    Email.Deliver = Deliver;
    async function Message(player, mailOptions) {
        const smtpConfig = sys_1.pathTo('etc', 'smtp.json');
        let smtpOptions;
        try {
            smtpOptions = require(smtpConfig);
        }
        catch (err) {
            if (echo) {
                lib_1.vt.outln(lib_1.vt.red, lib_1.vt.bright, `${smtpConfig} not configured for sending email`);
                player.password = 'local';
                pc_1.PC.save(player, true);
                lib_1.vt.outln('\nYour user ID (', lib_1.vt.bright, player.id, lib_1.vt.normal, ') was saved, ', items_1.Access.name[player.access][player.gender], '.');
                lib_1.vt.outln('Your password: "', lib_1.vt.bright, player.password, lib_1.vt.normal, '"');
            }
            return;
        }
        let smtp = nodemailer.createTransport(smtpTransport(smtpOptions));
        mailOptions.from = `"${$.sysop.handle} @ ${$.sysop.name}" <${$.sysop.email}>`;
        mailOptions.to = `${player.name} <${player.email}>`;
        mailOptions.text = eval('`' + mailOptions.text.toString() + '`');
        let result;
        await smtp.verify().then(async () => {
            if (echo) {
                if (lib_1.vt.emulation == 'XT')
                    lib_1.vt.out('→ 📨 ');
                lib_1.vt.sound('click');
            }
            await smtp.sendMail(mailOptions).then((msg) => {
                if (echo) {
                    if (lib_1.vt.emulation == 'XT')
                        lib_1.vt.outln('📬');
                    lib_1.vt.outln(msg.messageId);
                    if ($.reason.length) {
                        pc_1.PC.save(player, true);
                        lib_1.vt.outln('\nYour user ID (', lib_1.vt.bright, player.id, lib_1.vt.normal, ') was saved, ', items_1.Access.name[player.access][player.gender], '.');
                        lib_1.vt.sound('yahoo');
                    }
                }
                result = true;
            }).catch((err) => {
                if (echo) {
                    if (lib_1.vt.emulation == 'XT')
                        lib_1.vt.outln('💣');
                    lib_1.vt.outln(err.response);
                    player.id = '';
                    player.email = '';
                    lib_1.vt.outln('\nSorry -- your user registration was aborted.');
                    lib_1.vt.outln(`Please contact ${mailOptions.from} with this error message.`);
                    lib_1.vt.sound('boom');
                }
                result = false;
            });
        }).catch(err => {
            console.error(err);
            result = false;
        });
    }
})(Email || (Email = {}));
module.exports = Email;
