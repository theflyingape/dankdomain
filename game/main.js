"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
process.on(`${process.title} uncaughtException`, (err, origin) => {
    console.error(`${origin} ${err}`);
});
process.title = 'ƊƊplay';
const bbs = `${process.cwd()}/door.sys`;
process.chdir(__dirname);
const sys_1 = require("./sys");
const lib_1 = require("./lib");
lib_1.vt.emulation = (/ansi77|dumb|^apple|^dw|vt52/i.test(process.env.TERM) ? 'dumb'
    : /^lisa|^ncsa|^pcvt|^vt/i.test(process.env.TERM) ? 'VT'
        : /ansi|cygwin|^pc/i.test(process.env.TERM) ? 'PC'
            : /^xt/i.test(process.env.TERM) ? 'XT'
                : '');
const userID = process.argv.length > 2 ? process.argv[2].toUpperCase() : '';
if (userID.length) {
    lib_1.vt.emulation = 'VT';
    if (userID == sys_1.whole(userID).toString()) {
        const user = lib_1.door(bbs);
        if (userID == user[25]) {
            if (user[19] == 'GR')
                lib_1.vt.emulation = 'PC';
            lib_1.vt.tty = 'door';
        }
    }
}
lib_1.vt.sessionAllowed = 150;
lib_1.vt.defaultPrompt = lib_1.vt.cyan;
lib_1.vt.defaultTimeout = 100;
lib_1.vt.stdio(false);
if ((lib_1.vt.modem = process.env.REMOTEHOST ? true : false))
    lib_1.vt.outln(lib_1.vt.off, lib_1.vt.red, lib_1.vt.bright, 'C', lib_1.vt.yellow, 'A', lib_1.vt.green, 'R', lib_1.vt.cyan, 'R', lib_1.vt.blue, 'I', lib_1.vt.magenta, 'E', lib_1.vt.white, 'R', lib_1.vt.normal, ' ', lib_1.vt.faint, 'DETECTED');
if (lib_1.vt.emulation)
    logon();
else
    lib_1.vt.form = {
        0: {
            cb: () => {
                if (/^.*\[.*n$/i.test(lib_1.vt.entry)) {
                    lib_1.vt.emulation = 'PC';
                    logon();
                }
                else
                    lib_1.vt.focus = 5;
            }, prompt: '\x1B[5n', enq: true
        },
        5: {
            cb: () => {
                lib_1.vt.emulation = lib_1.vt.entry.length ? 'VT' : 'dumb';
                logon();
            }, prompt: '\x05', enq: true
        }
    };
function logon() {
    let prompt = 'Who dares to enter my dank domain';
    if (lib_1.vt.emulation == 'XT') {
        lib_1.vt.tty = 'web';
        lib_1.vt.title(process.title);
        prompt = 'Ⱳho ɗaɽes ʈo eɳʈeɽ ɱy ɗaɳƙ ɗoɱaiɳ';
    }
    lib_1.vt.outln(lib_1.vt.cyan, lib_1.vt.bright, lib_1.vt.emulation, lib_1.vt.normal, ' emulation ', lib_1.vt.faint, 'enabled');
    if (userID)
        require('./dd/logon').startup(userID);
    else
        require('./dd/logon').user(prompt);
}
