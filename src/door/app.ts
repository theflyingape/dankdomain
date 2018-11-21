/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  DOOR authored by: Robert Hurst <theflyingape@gmail.com>                  *
\*****************************************************************************/
import dns = require('dns')
import express = require('express')
import fs = require('fs')
import https = require('https')
import pty = require('node-pty')
import ws = require('ws')
const { URL } = require('url')

process.title = 'door'
process.chdir(__dirname)
console.log(`cwd: ${__dirname}`)

let sessions = {}
let broadcasts = {}

//dns.lookup('0.0.0.0', (err, addr, family) => {
dns.lookup('localhost', (err, addr, family) => {

  const app = express()
  app.set('trust proxy', ['loopback', addr])

  let ssl = { key: fs.readFileSync('key.pem'), cert: fs.readFileSync('cert.pem') }
  let server = https.createServer(ssl, app)
  let port = parseInt(process.env.PORT) || 1939

  //  enable REST services
  server.listen(port, addr)
  console.log(`Dank Domain Door on https|wss://${addr}:${port}`)

  //  enable WebSocket endpoints
  const wssActive = new ws.Server({ noServer:true, path:'/xterm/door/player/', clientTracking: true })
  const wssLurker = new ws.Server({ noServer:true, path:'/xterm/door/lurker/', clientTracking: true })

  server.on('upgrade', (req, socket, head) => {
    const pathname = new URL(req.url, 'https://localhost').pathname
    if (pathname === '/xterm/door/player/') {
      wssActive.handleUpgrade(req, socket, head, (ws) => {
        wssActive.emit('connection', ws, req)
      })
    }
    else if (pathname === '/xterm/door/lurker/') {
      wssLurker.handleUpgrade(req, socket, head, (ws) => {
        wssLurker.emit('connection', ws, req)
      })
    } else {
      console.log(`?FATAL WebSocket request: ${pathname}`)
      socket.destroy()
    }
  })

  //  web services
  app.use('/xterm/door', express.static(__dirname + '/static'))

  //  REST services
  //  Player API
  app.post('/xterm/door/player', function (req, res) {

    let client = req.header('x-forwarded-for') || req.connection.remoteAddress
    process.env.SSH_CLIENT = client
    let cols = parseInt(req.query.cols)
    let rows = parseInt(req.query.rows)
    let term = pty.spawn('sh', [ "-l", "../logins.sh" ], {
          name: 'xterm-256color',
          cols: cols || 80,
          rows: rows || 24,
          cwd: __dirname,
          env: process.env
        })
    let pid: number = term.pid

    console.log(`Create PLAYER session ${pid} from remote host: ${client} (${req.hostname})`)
    sessions[pid] = term
    sessions[pid].client = process.env.SSH_CLIENT
    broadcasts[pid] = ''

    res.send(pid.toString())
    res.end()
  })

  app.post('/xterm/door/player/:pid/size', function (req, res) {
    let pid = parseInt(req.params.pid),
        cols = parseInt(req.query.cols),
        rows = parseInt(req.query.rows),
        term = sessions[pid]

    if (!term) return
    console.log(`Resize PLAYER session ${pid} (${rows}x${cols})`)
    term.resize(cols, rows)
    res.end()
  })

  app.post('/xterm/door/player/:pid/wall', function (req, res) {
    let pid = parseInt(req.params.pid)
    let msg = req.query.msg
    let term = sessions[pid]
    if (!term) return

    for (let o in sessions)
      if (+o !== pid)
        broadcasts[o] += `\r\n\x1B[0;36m\u00B7\x1B[1m${msg}\x1B[m`
    res.end()
  })

  //  Lurker API
  var lurkers = []

  app.post('/xterm/door/lurker', function (req, res) {
    var pid = parseInt(req.query.pid)

    if (pid) {
      var player = ''
      if (sessions[pid]) {
        if (sessions[pid].who)
          player = ` (${sessions[pid].who})`
        console.log(`Lurker session ${pid}${player} request from remote host: ${req.header('x-forwarded-for') || req.connection.remoteAddress} (${req.hostname})`)
        res.send((lurkers.push(pid) - 1).toString())
      }
      else {
        console.log(`?FATAL lurker session ${pid} request from remote host: ${req.header('x-forwarded-for') || req.connection.remoteAddress} (${req.hostname})`)
      }
    }
    else if (Object.keys(sessions).length) {
      var who = []
      for (let pid in sessions) {
        let rs = query(`SELECT id FROM Online WHERE pid = ${pid}`)
        if (rs.length) {
          sessions[pid].who = rs[0].id
          who.push({id:rs[0].id, pid:pid})
        }
      }
      res.send(JSON.stringify(who))
    }
    else {
      res.send(JSON.stringify([]))
    }
    res.end()
  })

  //  WebSocket endpoints: utilize upgraded socket connection to serve I/O between app pty and browser client
  //  ... for the active player
  wssActive.on('connection', (browser, req) => {
    const what = new URL(req.url, 'https://localhost')
    const pid = parseInt(what.searchParams.get('pid'))
    let term = sessions[pid]
  
    //  app --> browser client
    term.on('data', (data) => {
      //  inspect for app's ACK ...
      let msg = data.toString()
      let ack = msg.indexOf('\x06')
      //  ... to appropriately replace it with any pending broadcast message(s)
      if (broadcasts[term.pid] && ack >= 0) {
        msg = `${msg.substr(0, ack)}${broadcasts[term.pid]}\n${msg.substr(ack)}`
        broadcasts[term.pid] = ''
      }

      try {
        browser.send(msg)
      } catch (ex) {
        if (term.pid) {
          console.log(`?FATAL ACTIVE app session ${term.pid} pty -> ws error:`, ex.message)
          unlock(term.pid)
          browser.close()
        }
      }
    })

    term.on('close', () => {
      //  app shutdown
      if (term.client) {
        console.log(`Close PLAYER session ${term.pid} from remote host: ${term.client}`)
        browser.close()
      }
    })

    //  browser client --> app
    browser.on('message', (msg) => {
      try {
        term.write(msg)
      } catch (ex) {
        if (term.pid) {
          console.log(`?FATAL ACTIVE browser session ${term.pid} ws -> pty error:`, ex.message)
          unlock(term.pid)
          browser.close()
        }
      }
    })

    browser.on('close', () => {
      //  did user close browser with an open app?
      if (pid > 1) try {
        process.kill(pid)
        console.log(`Forced close PLAYER session ${pid} from remote host: ${term.client}`)
      } catch (ex) {}
      // Clean things up
      term.client = ''
      delete broadcasts[term.pid]
      delete sessions[term.pid]
    })
  })

  //  ... for the casual lurker
  wssLurker.on('connection', (browser, req) => {
    const what = new URL(req.url, 'https://localhost')
    let lurker = parseInt(what.searchParams.get('lurker'))
    let term = sessions[lurkers[lurker]]
    let player = ` (${sessions[term.pid].who})`
    console.log(`Lurker session ${term.pid}${player} connected as #${(lurker + 1)}`)

    //  browser client --> any key terminates lurking
    browser.on('message', (msg) => {
      browser.close()
    })

    browser.on('close', () => {
      console.log(`Lurker session ${term.pid}${player} closed #${(lurker + 1)}`)
      delete lurkers[lurker]
      term.removeListener('data', send)
    })

    //  app --> browser client
    const close = () => {
      try {
        browser.close()
      } catch (ex) {
        console.log(`?FATAL browser session ${term.pid}${player} lurker/ws error: ${ex.message}`)
      }
    }
    const send = (data) => {
      try {
        browser.send(data)
      } catch (ex) {
        if (term.pid)
          console.log(`?FATAL session ${term.pid}${player} lurker/ws error: ${ex.message}`)
      }
    }
    term.on('close', close)
    term.on('data', send)
  })

  //  database support
  const DD = '../users/dankdomain.sql'
  let better = require('better-sqlite3')
  let sqlite3 = new better(DD)
  sqlite3.prepare(`DELETE FROM Online`).run().changes

  function query(q: string, errOk = false): any {
    try {
        let cmd = sqlite3.prepare(q)
        return cmd.all()
    }
    catch(err) {
        if (!errOk) {
            console.log(`?Unexpected error ${err.code} :: ${String(err)}`)
        }
        return []
    }
  }

  function unlock(pid: number) {
    console.log(`Unlocking ${pid}`)
    sqlite3.prepare(`DELETE FROM Online WHERE pid = ${pid}`).run().changes
  }
})

//  process signal traps
process.on('SIGHUP', () => {
  console.log(new Date() + ' :: received hangup')
  process.exit()
})

process.on('SIGINT', () => {
  console.log(new Date() + ' :: received interrupt')
  process.exit()
})

process.on('SIGQUIT', () => {
  console.log(new Date() + ' :: received quit')
  process.exit()
})

process.on('SIGTERM', () => {
  console.log(new Date() + ' :: received terminate')
  process.exit()
})
