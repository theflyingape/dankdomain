"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  DOOR authored by: Robert Hurst <theflyingape@gmail.com>                  *
\*****************************************************************************/
const dns = require("dns");
const express = require("express");
const expressWs = require("express-ws");
const https = require("https");
const fs = require("fs");
const pty = require("node-pty");
process.title = 'door';
process.chdir(__dirname);
console.log(`cwd: ${__dirname}`);
let sessions = {};
let logs = {};
let broadcasts = {};
dns.lookup('localhost', (err, addr, family) => {
    let app = express();
    app.set('trust proxy', ['loopback', addr]);
    let ssl = { key: fs.readFileSync('key.pem'), cert: fs.readFileSync('cert.pem') };
    let server = https.createServer(ssl, app);
    let port = process.env.PORT || 1939;
    server.listen(port, addr);
    console.log(`Dank Domain Door on https|wss://${addr}:${port}`);
    app.use('/xterm/door', express.static(__dirname + '/static'));
    app.post('/xterm/door/player', function (req, res) {
        var cols = parseInt(req.query.cols), rows = parseInt(req.query.rows), term = pty.spawn('sh', ["-l", "./logins.sh"], {
            name: 'xterm-256color',
            cols: cols || 80,
            rows: rows || 24,
            cwd: process.env.PWD,
            env: process.env
        });
        let pid = parseInt(term.pid);
        console.log(`Create PLAYER session ${pid} from remote host: ${res.getHeader('X-Forwarded-For') || req.connection.remoteAddress} (${req.hostname})`);
        sessions[pid] = term;
        logs[pid] = '';
        broadcasts[pid] = '';
        res.send(pid.toString());
        res.end();
        /*
            //  collect app outputs
            term.on('data', function(data) {
              logs[pid] += data
            })
        */
    });
    app.post('/xterm/door/player/:pid/size', function (req, res) {
        let pid = parseInt(req.params.pid), cols = parseInt(req.query.cols), rows = parseInt(req.query.rows), term = sessions[pid];
        if (!term)
            return;
        console.log(`Resize PLAYER session ${pid} (${rows}x${cols})`);
        term.resize(cols, rows);
        res.end();
    });
    app.post('/xterm/door/player/:pid/wall', function (req, res) {
        let pid = parseInt(req.params.pid);
        let msg = req.query.msg;
        let term = sessions[pid];
        if (!term)
            return;
        for (let o in sessions)
            if (+o !== pid)
                broadcasts[o] += `\r\n\x1B[0;36m\u00B7\x1B[1m${msg}\x1B[m`;
        res.end();
    });
    //  WebSocket endpoints for Express applications
    let ws = expressWs(app, server);
    app.ws('/xterm/door/player/:pid', function (ws, req) {
        let term = sessions[parseInt(req.params.pid)];
        //ws.send(logs[term.pid])
        /*
            const interval = setInterval(function ping() {
              console.log(ws.clients)
              for (let n in ws.clients) {
                if (ws.clients[n].isAlive === false) return ws.terminate()
                ws.isAlive = false
                ws.ping(() => {})
            }, 30000)
        */
        //  dankdomain app events
        term.on('close', function () {
            ws.close();
        });
        //  app events --> browser client
        term.on('data', function (data) {
            //  inspect for app's ACK ...
            let msg = data.toString();
            let ack = msg.indexOf('\x06');
            //  ... to appropriately replace it with any pending broadcast message(s)
            if (broadcasts[term.pid] && ack >= 0) {
                msg = `${msg.substr(0, ack)}${broadcasts[term.pid]}\n${msg.substr(ack)}`;
                broadcasts[term.pid] = '';
            }
            try {
                ws.send(msg);
            }
            catch (ex) {
                if (term.pid) {
                    console.log(`?FATAL PLAYER session ${term.pid} pty -> ws error:`, ex.message);
                    unlock(term.pid);
                    delete term.pid;
                }
            }
        });
        //  client events --> app
        ws.on('connection', function connection(ws) {
            console.log(`Connect PLAYER session ${term.pid}`);
            //ws.on('pong', heartbeat)
        });
        ws.on('message', function (msg) {
            try {
                term.write(msg);
            }
            catch (ex) {
                if (term.pid) {
                    console.log(`?FATAL PLAYER session ${term.pid} ws -> pty error:`, ex.message);
                    unlock(term.pid);
                    delete term.pid;
                }
            }
        });
        ws.on('close', function () {
            console.log(`Closed PLAYER session ${term.pid}`);
            // Clean things up
            delete broadcasts[term.pid];
            delete logs[term.pid];
            delete sessions[term.pid];
            term.kill();
        });
        /*
            function heartbeat() {
              this.isAlive = true
            }
        */
    });
    //  Lurker API
    const DD = '../users/dankdomain.sql';
    let better = require('better-sqlite3');
    let sqlite3 = new better(DD);
    sqlite3.prepare(`DELETE FROM Online`).run().changes;
    var lurkers = [];
    app.post('/xterm/door/lurker', function (req, res) {
        var pid = parseInt(req.query.pid);
        if (pid) {
            var player = '';
            if (sessions[pid]) {
                if (sessions[pid].who)
                    player = ` (${sessions[pid].who})`;
                console.log(`Lurker session ${pid}${player} request from remote host: ${res.getHeader('X-Forwarded-For') || req.connection.remoteAddress} (${req.hostname})`);
                res.send((lurkers.push(pid) - 1).toString());
            }
            else {
                console.log(`?unknown lurker session ${pid} request from remote host: ${res.getHeader('X-Forwarded-For') || req.connection.remoteAddress} (${req.hostname})`);
            }
        }
        else if (Object.keys(sessions).length) {
            var who = [];
            for (let pid in sessions) {
                let rs = query(`SELECT id FROM Online WHERE pid = ${pid}`);
                if (rs.length) {
                    sessions[pid].who = rs[0].id;
                    who.push({ id: rs[0].id, pid: pid });
                }
            }
            res.send(JSON.stringify(who));
        }
        else {
            res.send(JSON.stringify([]));
        }
        res.end();
    });
    app.ws('/xterm/door/lurker/:lurker', function (ws, req) {
        let lurker = parseInt(req.params.lurker);
        let term = sessions[lurkers[lurker]];
        let player = ` (${sessions[term.pid].who})`;
        console.log(`Lurker session ${term.pid}${player} connected as #${(lurker + 1)}`);
        const send = (data) => {
            try {
                ws.send(data);
            }
            catch (ex) {
                if (term.pid)
                    console.log(`?fatal session ${term.pid}${player} lurker/ws error: ${ex.message}`);
            }
        };
        term.on('close', function () {
            ws.close();
        });
        //  app output to browser client
        term.on('data', send);
        //  incoming from browser client
        ws.on('message', function (msg) {
            ws.close();
        });
        ws.on('close', function () {
            term.removeListener('data', send);
            console.log(`Lurker session ${term.pid}${player} closed #${(lurker + 1)}`);
            delete lurkers[lurker];
        });
    });
    function query(q, errOk = false) {
        try {
            let cmd = sqlite3.prepare(q);
            return cmd.all();
        }
        catch (err) {
            if (!errOk) {
                console.log(`?Unexpected error ${err.code} :: ${String(err)}`);
            }
            return [];
        }
    }
    function unlock(pid) {
        console.log(`Unlocking ${pid}`);
        sqlite3.prepare(`DELETE FROM Online WHERE pid = ${pid}`).run().changes;
    }
});
process.on('SIGHUP', function () {
    console.log(new Date() + ' :: received hangup');
    process.exit();
});
process.on('SIGINT', function () {
    console.log(new Date() + ' :: received interrupt');
    process.exit();
});
process.on('SIGQUIT', function () {
    console.log(new Date() + ' :: received quit');
    process.exit();
});
process.on('SIGTERM', function () {
    console.log(new Date() + ' :: received terminate');
    process.exit();
});
