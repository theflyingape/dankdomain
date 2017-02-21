/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  DOOR authored by: Robert Hurst <theflyingape@gmail.com>                  *
\*****************************************************************************/
"use strict";
process.chdir(__dirname);
process.title = 'door';
const pty = require("node-pty");
const express = require("express");
const http = require("http");
const url = require("url");
const WebSocket = require("ws");
let terminals = {};
let config = require('./config');
let app = express();
let server = http.createServer(app);
let wss = new WebSocket.Server({ server });
let term;
let pid;
//  request a new terminal session
app.post('/terminals', (req, res) => {
    let cols = parseInt(req.query.cols);
    let rows = parseInt(req.query.rows);
    term = pty.spawn(process.platform.slice(0, 3) === 'win' ? 'cmd.exe' : 'bash', [], {
        name: 'ansi',
        cols: cols || 80,
        rows: rows || 25,
        cwd: process.env.PWD,
        env: process.env
    });
    log('new session [', term.pid, ']');
    terminals[term.pid] = {};
    term.on('data', function (data) {
        if (pid)
            pid.send(data);
    });
    res.send(term.pid.toString());
    res.end();
});
//  write to existing terminal session
app.post('/terminals/:pid', (ws, req) => {
    let term = terminals['12345'];
    term.on('data', function (data) {
        try {
            wss.send(data);
        }
        catch (ex) {
        }
    });
    ws.on('message', function (msg) {
        term.write(msg);
    });
    ws.on('close', function () {
        log('closing terminal ', term.pid);
        process.kill(term.pid);
        delete terminals[term.pid];
    });
});
app.use('/', express.static(__dirname));
/*
app.use(function (req, res) {
    res.sendFile('index.html')
    res.send(`
        <h4>Door to Dank Domain: the return of Hack & Slash</h4>
        <h5>(C) 2017 Robert Hurst</h5>
          ` + now())

})
*/
//app.use('xterm', express.static('xterm'))
wss.on('connection', function connection(ws) {
    const location = url.parse(ws.upgradeReq.url, true);
    // You might use location.query.access_token to authenticate or share sessions 
    // or ws.upgradeReq.headers.cookie (see http://stackoverflow.com/a/16395220/151312) 
    ws.on('message', function incoming(message) {
        term.write(message);
    });
    pid = ws;
    pid.send('CARRIER DETECTED\n');
});
server.listen(config, function listening() {
    log('Listening on ', server.address().address + ' ' + server.address().port);
});
function log(...message) {
    let now = new Date();
    now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
    console.log(now + '  ' + message);
}
/*
import pty = require('node-pty')
import ws = require('ws')

const port: number = 1965
const host: string = '0.0.0.0'

var terminals = {},
    logs = {};

const wss = new ws.Server({ host: host, port: port })

wss.on('connection', (ws) => {
  ws.on('message', (data) => {

  })
})
*/
/*
var express = require('express');
var app = express();
var expressWs = require('express-ws')(app);
var os = require('os');
var pty = require('node-pty');

var terminals = {},
    logs = {};

app.use('/build', express.static(__dirname + '/../build'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get('/style.css', function(req, res){
  res.sendFile(__dirname + '/style.css');
});

app.get('/main.js', function(req, res){
  res.sendFile(__dirname + '/main.js');
});

app.post('/terminals', function (req, res) {
  var cols = parseInt(req.query.cols),
      rows = parseInt(req.query.rows),
      term = pty.spawn(process.platform === 'win32' ? 'cmd.exe' : 'bash', [], {
        name: 'xterm-color',
        cols: cols || 80,
        rows: rows || 24,
        cwd: process.env.PWD,
        env: process.env
      });

  console.log('Created terminal with PID: ' + term.pid);
  terminals[term.pid] = term;
  logs[term.pid] = '';
  term.on('data', function(data) {
    logs[term.pid] += data;
  });
  res.send(term.pid.toString());
  res.end();
});

app.post('/terminals/:pid/size', function (req, res) {
  var pid = parseInt(req.params.pid),
      cols = parseInt(req.query.cols),
      rows = parseInt(req.query.rows),
      term = terminals[pid];

  term.resize(cols, rows);
  console.log('Resized terminal ' + pid + ' to ' + cols + ' cols and ' + rows + ' rows.');
  res.end();
});

app.ws('/terminals/:pid', function (ws, req) {
  var term = terminals[parseInt(req.params.pid)];
  console.log('Connected to terminal ' + term.pid);
  ws.send(logs[term.pid]);

  term.on('data', function(data) {
    try {
      ws.send(data);
    } catch (ex) {
      // The WebSocket is not open, ignore
    }
  });
  ws.on('message', function(msg) {
    term.write(msg);
  });
  ws.on('close', function () {
    process.kill(term.pid);
    console.log('Closed terminal ' + term.pid);
    // Clean things up
    delete terminals[term.pid];
    delete logs[term.pid];
  });
});

var port = process.env.PORT || 3000,
    host = os.platform() === 'win32' ? '127.0.0.1' : '0.0.0.0';

console.log('App listening to http://' + host + ':' + port);
app.listen(port, host);
*/
