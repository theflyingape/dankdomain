/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  DOOR authored by: Robert Hurst <theflyingape@gmail.com>                  *
\*****************************************************************************/
process.title = 'door';
var https = require('https');
var fs = require('fs');
var express = require('express');
var expressWs = require('express-ws');
var os = require('os');
var pty = require('node-pty');
var options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};
var app = express();
var server = https.createServer(options, app);
var expressWs = expressWs(app, server);
var terminals = {}, logs = {}, broadcasts = {};
app.use('/', express.static(__dirname));
app.post('/terminals', function (req, res) {
    var cols = parseInt(req.query.cols), rows = parseInt(req.query.rows), term = pty.spawn(process.platform === 'win32' ? 'cmd.exe' : 'sh', ["-l", "./logins.sh"], {
        name: 'xterm-256color',
        cols: cols || 80,
        rows: rows || 24,
        cwd: process.env.PWD,
        env: process.env
    });
    console.log('Create terminal ' + term.pid);
    terminals[term.pid] = term;
    logs[term.pid] = '';
    broadcasts[term.pid] = '';
    //  collect app outputs
    term.on('data', function (data) {
        logs[term.pid] += data;
    });
    res.send(term.pid.toString());
    res.end();
});
app.post('/terminals/:pid/size', function (req, res) {
    var pid = parseInt(req.params.pid), cols = parseInt(req.query.cols), rows = parseInt(req.query.rows), term = terminals[pid];
    if (!term)
        return;
    console.log('Resize terminal ' + pid + ' (' + rows + 'x' + cols + ')');
    term.resize(cols, rows);
    res.end();
});
app.post('/terminals/:pid/wall', function (req, res) {
    var pid = parseInt(req.params.pid), msg = req.query.msg, term = terminals[pid];
    if (!term)
        return;
    for (let o in terminals)
        if (+o !== pid)
            broadcasts[o] += '\x1B[1;36m' + msg + '\x1B[m\r\n';
    res.end();
});
app.ws('/terminals/:pid', function (ws, req) {
    var term = terminals[parseInt(req.params.pid)];
    console.log('Connect terminal ' + term.pid);
    ws.send(logs[term.pid]);
    term.on('close', function () {
        ws.close();
    });
    //  app output to browser client
    term.on('data', function (data) {
        //  inspect for app's ACK ...
        let msg = data.toString();
        let ack = msg.indexOf('\x06');
        //  ... to appropriately replace it with any pending broadcast message(s)
        if (ack >= 0) {
            msg = msg.substr(0, ack) + broadcasts[term.pid] + '\n' + msg.substr(ack);
            broadcasts[term.pid] = '';
        }
        try {
            ws.send(msg);
        }
        catch (ex) {
            if (term.pid) {
                console.log(`?FATAL terminal ${term.pid} pty socket error:`, ex.message);
                unlock(term.pid);
                delete term.pid;
            }
        }
    });
    //  incoming from browser client
    ws.on('message', function (msg) {
        term.write(msg);
    });
    ws.on('close', function () {
        term.kill();
        console.log('Closed terminal ' + term.pid);
        // Clean things up
        delete broadcasts[term.pid];
        delete logs[term.pid];
        delete terminals[term.pid];
    });
});
//  casual watching
const DD = './users/dankdomain.sql';
let better = require('better-sqlite3');
let sqlite3 = new better(DD);
var lurkers = [];
app.post('/watch', function (req, res) {
    var pid = parseInt(req.query.pid);
    if (pid) {
        var player = '';
        if (terminals[pid])
            if (terminals[pid].who)
                player = ' (' + terminals[pid].who + ')';
        console.log(`Lurker terminal ${pid}${player} request`);
        res.send((lurkers.push(pid) - 1).toString());
    }
    else if (Object.keys(terminals).length) {
        var who = [];
        for (let pid in terminals) {
            let rs = query(`SELECT id FROM Online WHERE pid = ${pid}`);
            if (rs.length) {
                terminals[pid].who = rs[0].id;
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
app.ws('/watch/:lurker', function (ws, req) {
    var lurker = parseInt(req.params.lurker);
    var term = terminals[lurkers[lurker]];
    var player = ' (' + terminals[term.pid].who + ')';
    console.log(`Lurker terminal ${term.pid}${player} connected as #` + (lurker + 1));
    const send = (data) => {
        try {
            ws.send(data);
        }
        catch (ex) {
            if (term.pid) {
                console.log(`?fatal terminal ${term.pid}${player} watch socket error:`, ex.message);
            }
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
        console.log(`Lurker terminal ${term.pid}${player} closed #` + (lurker + 1));
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
            console.log('?Unexpected error ', err.code, '::', String(err));
        }
        return [];
    }
}
var port = process.env.PORT || 1965, host = os.platform() === 'win32' ? '127.0.0.1' : '0.0.0.0';
console.log('Dank Domain Door on https://' + host + ':' + port);
server.listen(port, host);
function unlock(pid) {
    console.log('Unlocking ' + pid);
    sqlite3.prepare(`DELETE FROM Online WHERE pid = ${pid}`).run().changes;
}
