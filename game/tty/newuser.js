"use strict";
const $ = require("../runtime");
const items_1 = require("../items");
const db_1 = require("../db");
const lib_1 = require("../lib");
const pc_1 = require("../pc");
const sys_1 = require("../sys");
var NewUser;
(function (NewUser) {
    $.from = 'newuser';
    let editmode = false;
    lib_1.vt.music('newuser');
    lib_1.vt.profile({ handle: 'Shall we begin?', png: 'npc/city_guard_1', effect: 'bounceInLeft' });
    lib_1.vt.cls();
    lib_1.vt.plot(1, 17);
    if (lib_1.vt.tty == 'door')
        lib_1.vt.outln(lib_1.vt.blue, '--=:) ', lib_1.vt.bright, 'BBS Door Registration', lib_1.vt.normal, ' (:=--');
    else
        lib_1.vt.outln(lib_1.vt.yellow, '--=:) ', lib_1.vt.bright, 'New User Registration', lib_1.vt.normal, ' (:=--');
    lib_1.vt.out(lib_1.bracket(1), lib_1.vt.cyan, `Player's Handle:`);
    lib_1.vt.out(lib_1.bracket(2), lib_1.vt.cyan, 'Your REAL Name.:');
    if (lib_1.vt.tty == 'door')
        lib_1.vt.out(' ', lib_1.vt.blue, lib_1.vt.bright, $.player.name);
    lib_1.vt.out(lib_1.bracket(3), lib_1.vt.cyan, 'Date of Birth..:');
    lib_1.vt.out(lib_1.bracket(4), lib_1.vt.cyan, 'Gender (M/F)...:');
    lib_1.vt.form = {
        1: { cb: handle, row: 3, col: 23, min: 2, max: 22, match: /^[A-Z][A-Z\s]*$/i },
        2: { cb: name, row: 4, col: 23, min: 5, max: 32, match: /^[A-Z][A-Z\s]*$/i },
        3: { cb: dob, row: 5, col: 23, min: 6, max: 16, enter: '12311999' },
        4: { cb: sex, row: 6, col: 23, eol: false, cancel: 'f', enter: 'm', max: 1, match: /F|M/i, timeout: 20 },
        'edit': { cb: edit, row: 8, col: 1, prompt: 'Select field # to change or <RETURN> to save: ', max: 1, match: /^[1-4]*$/ },
    };
    lib_1.vt.action('freetext');
    lib_1.vt.focus = 1;
    function handle() {
        lib_1.vt.entry = sys_1.titlecase(lib_1.vt.entry);
        if (lib_1.vt.entry == 'New' || sys_1.cuss(lib_1.vt.entry))
            lib_1.vt.hangup();
        let words = lib_1.vt.entry.split(' ');
        for (let i = 0; i < words.length; i++)
            if (items_1.Access.name[words[i]]) {
                lib_1.vt.beep();
                lib_1.vt.refocus();
                return;
            }
        $.player.handle = lib_1.vt.entry;
        let check = { id: '', handle: $.player.handle };
        if (db_1.loadUser(check)) {
            lib_1.vt.beep();
            lib_1.vt.refocus();
            return;
        }
        lib_1.vt.plot(3, 23);
        lib_1.vt.out(lib_1.vt.cll, $.player.handle);
        lib_1.vt.action(editmode ? 'list' : 'freetext');
        lib_1.vt.focus = editmode ? 'edit' : lib_1.vt.tty == 'door' ? 3 : 2;
    }
    function name() {
        lib_1.vt.entry = sys_1.titlecase(lib_1.vt.entry);
        if (sys_1.cuss(lib_1.vt.entry))
            lib_1.vt.hangup();
        let words = lib_1.vt.entry.split(' ');
        if (words.length < 2) {
            lib_1.vt.beep();
            lib_1.vt.refocus();
            return;
        }
        for (let i = 0; i < words.length; i++) {
            if (words[i].length < 2 || items_1.Access.name[words[i]]) {
                lib_1.vt.beep();
                lib_1.vt.refocus();
                return;
            }
        }
        $.player.name = lib_1.vt.entry;
        lib_1.vt.plot(4, 23);
        lib_1.vt.out(lib_1.vt.cll, $.player.name);
        lib_1.vt.action('list');
        lib_1.vt.focus = editmode ? 'edit' : 3;
    }
    function dob() {
        $.player.dob = sys_1.date2days(lib_1.vt.entry);
        if (isNaN($.player.dob)) {
            lib_1.vt.beep();
            lib_1.vt.refocus();
            return;
        }
        lib_1.vt.plot(5, 23);
        lib_1.vt.out(lib_1.vt.cll, sys_1.date2full($.player.dob));
        lib_1.vt.action(editmode ? 'list' : 'gender');
        lib_1.vt.focus = editmode ? 'edit' : 4;
    }
    function sex() {
        $.player.sex = lib_1.vt.entry.toUpperCase();
        $.player.gender = $.player.sex;
        lib_1.vt.plot(6, 23);
        lib_1.vt.out(lib_1.vt.cll, $.player.sex);
        editmode = true;
        lib_1.vt.action('list');
        lib_1.vt.focus = 'edit';
    }
    function edit() {
        if (lib_1.vt.entry.length) {
            lib_1.vt.action(['list', 'freetext', 'freetext', 'list', 'gender'][lib_1.vt.entry]);
            lib_1.vt.focus = lib_1.vt.entry;
            return;
        }
        $.player.id = '';
        let words = $.player.handle.split(' ');
        if (words.length > 1) {
            for (let i = 0; i < words.length && $.player.id.length < 3; i++)
                $.player.id += words[i][0].toUpperCase();
        }
        else
            $.player.id = $.player.handle.slice(0, 3).toUpperCase();
        if ($.player.id == 'NEW' || sys_1.cuss($.player.id)) {
            lib_1.vt.action('freetext');
            lib_1.vt.beep();
            lib_1.vt.focus = 1;
            return;
        }
        if (lib_1.vt.tty == 'door') {
            $.player.id = $.door[25];
            $.player.password = $.door[10];
            $.player.email = $.door[11] || $.door[12] || 'nobody@localhost';
            pc_1.PC.save($.player, true);
            lib_1.vt.out('\nYour user ID (', lib_1.vt.bright, $.player.id, lib_1.vt.normal, ') was saved.');
            lib_1.vt.outln(-2000);
            require('./logon').startup($.player.id);
            return;
        }
        let check = { id: $.player.id, handle: '' };
        let retry = 1;
        while (retry < 4 && db_1.loadUser(check)) {
            retry++;
            check.id = `${$.player.id}${retry}`;
            check.handle = '';
        }
        if (retry > 1)
            $.player.id = `${$.player.id}${retry}`;
        if (retry > 3)
            $.player.id = '';
        if ($.player.id == '') {
            lib_1.vt.action('freetext');
            lib_1.vt.beep();
            lib_1.vt.focus = 1;
            return;
        }
        require('../email').newuser();
    }
})(NewUser || (NewUser = {}));
module.exports = NewUser;
