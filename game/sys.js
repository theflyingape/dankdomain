"use strict";
var sys;
(function (sys) {
    sys.fs = require('fs');
    sys.got = require('got');
    sys.path = require('path');
    sys.romanize = require('romanize');
    sys.sprintf = require('sprintf-js').sprintf;
    sys.titlecase = require('title-case').titleCase;
    let PATH = process.cwd();
    while (!sys.fs.existsSync(`${PATH}/etc`))
        PATH = sys.path.resolve(PATH, '..');
    sys.NEWS = pathTo('files/tavern');
    if (!sys.fs.existsSync(sys.NEWS))
        sys.fs.mkdirSync(sys.NEWS);
    sys.LOG = pathTo('files/user');
    if (!sys.fs.existsSync(sys.LOG))
        sys.fs.mkdirSync(sys.LOG);
    function an(item, show = true) {
        return ' ' + (/a|e|i|o|u/i.test(item[0]) ? 'an' : 'a') + ' ' + (show ? item : '');
    }
    sys.an = an;
    function cuss(text) {
        let words = sys.titlecase(text).split(' ');
        for (let i in words) {
            if (words[i].match('/^Asshole$|^Cock$|^Cunt$|^Fck$|^Fu$|^Fuc$|^Fuck$|^Fuk$|^Phuc$|^Phuck$|^Phuk$|^Twat$/')) {
                return true;
            }
        }
        return false;
    }
    sys.cuss = cuss;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const md = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    function date2days(date) {
        let days;
        let month;
        let day;
        let year;
        let pieces;
        if (date.search('/') > 0) {
            pieces = date.split('/');
            month = whole(pieces[0]);
            day = whole(pieces[1]);
            year = whole(pieces[2]);
        }
        else if (date.search('-') > 0) {
            pieces = date.split('-');
            month = whole(pieces[0]);
            day = whole(pieces[1]);
            if (day == 0) {
                day = month;
                for (month = 0; month < 12 && mon[month].toLowerCase() == pieces[1].substr(0, 3).toLowerCase(); month++) { }
                month++;
            }
            year = whole(pieces[2]);
        }
        else if (whole(date) > 18991231) {
            year = whole(date.substr(0, 4));
            month = whole(date.substr(4, 2));
            day = whole(date.substr(6, 2));
        }
        else {
            month = whole(date.substr(0, 2));
            day = whole(date.substr(2, 2));
            year = whole(date.substr(4, 4));
        }
        month = (month < 1) ? 1 : (month > 12) ? 12 : month;
        day = (day < 1) ? 1 : (day > 31) ? 31 : day;
        year = (year < 100) ? year + 1900 : year;
        if (isNaN(day) || isNaN(month) || isNaN(year))
            return NaN;
        days = (year * 365) + int(year / 4) + md[month - 1] + (day - 1);
        if ((((year % 4) == 0) && (((year % 100) != 0) || ((year % 400) == 0))) && (month < 3))
            days--;
        return days;
    }
    sys.date2days = date2days;
    function date2full(days) {
        let date = date2str(days);
        return sys.sprintf('%.3s %.2s-%.3s-%.4s', day[(days - 1) % 7], date.substr(6, 2), mon[+date.substr(4, 2) - 1], date);
    }
    sys.date2full = date2full;
    function date2str(days) {
        let month;
        let day;
        let year;
        year = int(days / 1461) * 4 + int((days % 1461) / 365);
        days = days - ((year * 365) + int(year / 4)) + 1;
        month = 0;
        while (days > md[month + 1] - ((((year % 4) == 0) && (((year % 100) != 0) || ((year % 400) == 0))) && month == 0 ? 1 : 0) && month < 11)
            month++;
        days -= md[month++];
        day = days;
        if ((((year % 4) == 0) && (((year % 100) != 0) || ((year % 400) == 0))) && month < 3)
            day++;
        return sys.sprintf('%04d%02d%02d', year, month, day);
    }
    sys.date2str = date2str;
    function dice(faces) {
        return int(Math.random() * whole(faces)) + 1;
    }
    sys.dice = dice;
    function int(n) {
        n = (+n || 0).valueOf();
        n = Math.trunc(n);
        if (n == 0)
            n = 0;
        return n;
    }
    sys.int = int;
    function isActive(arg) {
        return arg.user !== undefined;
    }
    sys.isActive = isActive;
    function money(level) {
        return int(Math.pow(2, (level - 1) / 2) * 10 * (101 - level) / 100);
    }
    sys.money = money;
    function now() {
        const today = date2days(new Date().toLocaleString('en-US').split(',')[0]);
        const now = new Date().toTimeString().slice(0, 5).replace(/:/g, '');
        return { date: +today, time: +now };
    }
    sys.now = now;
    function pathTo(folder = '', file = '') {
        return sys.path.resolve(PATH, folder, file);
    }
    sys.pathTo = pathTo;
    function whole(n) {
        const i = int(n);
        return (i < 0) ? 0 : i;
    }
    sys.whole = whole;
})(sys || (sys = {}));
module.exports = sys;
