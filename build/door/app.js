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
var terminals = {}, logs = {};
app.use('/', express.static(__dirname));
app.post('/terminals', function (req, res) {
    var cols = parseInt(req.query.cols), rows = parseInt(req.query.rows), term = pty.spawn(process.platform === 'win32' ? 'cmd.exe' : 'sh', ["-l", "./logins.sh"], {
        name: 'xterm-256color',
        cols: cols || 80,
        rows: rows || 24,
        cwd: process.env.PWD,
        env: process.env
    });
    console.log('Created terminal with PID: ' + term.pid);
    terminals[term.pid] = term;
    logs[term.pid] = '';
    term.on('data', function (data) {
        logs[term.pid] += data;
    });
    res.send(term.pid.toString());
    res.end();
});
app.post('/terminals/:pid/size', function (req, res) {
    var pid = parseInt(req.params.pid), cols = parseInt(req.query.cols), rows = parseInt(req.query.rows), term = terminals[pid];
    term.resize(cols, rows);
    console.log('Resized terminal ' + pid + ' to ' + cols + ' cols and ' + rows + ' rows.');
    res.end();
});
app.ws('/terminals/:pid', function (ws, req) {
    var term = terminals[parseInt(req.params.pid)];
    console.log('Connected to terminal ' + term.pid);
    ws.send(logs[term.pid]);
    term.on('close', function () {
        ws.close();
    });
    term.on('data', function (data) {
        try {
            ws.send(data);
        }
        catch (ex) {
            console.log('socket error:', ex);
        }
    });
    ws.on('message', function (msg) {
        term.write(msg);
    });
    ws.on('close', function () {
        term.kill();
        console.log('Closed terminal ' + term.pid);
        // Clean things up
        delete terminals[term.pid];
        delete logs[term.pid];
    });
});
var port = process.env.PORT || 1965, host = os.platform() === 'win32' ? '127.0.0.1' : '0.0.0.0';
console.log('App listening to https://' + host + ':' + port);
server.listen(port, host);
