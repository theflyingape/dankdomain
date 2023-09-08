/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  CLIENT authored by: Robert Hurst <theflyingape@gmail.com>                *
\*****************************************************************************/

//	CLIENT start
//	https://webserver/

//	REST API (POST)
//	https://webserver/gallery/
//	https://webserver/player/?cols={x}&rows={y}
//	https://webserver/player/{pid}/size/?cols={x}&rows={y}
//	https://webserver/lurker/
//	https://webserver/lurker/?pid={XXX}

import { Terminal, ITerminalOptions } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { Unicode11Addon } from 'xterm-addon-unicode11'
import { WebglAddon } from 'xterm-addon-webgl'
import { WebLinksAddon } from 'xterm-addon-web-links'

//  document elements
let audioPlay = <HTMLAudioElement>document.getElementById('play')
let audioTune = <HTMLAudioElement>document.getElementById('tune')
const monitor = <HTMLDivElement>document.getElementById('monitor')
const terminal = <HTMLDivElement>document.getElementById('terminal')
const wall = <HTMLDivElement>document.getElementById('wall')
const splash = <HTMLTableElement>document.getElementById('splash')
const a2hs = <HTMLTableRowElement>document.getElementById('a2hs')
const desktop = <HTMLTableRowElement>document.getElementById('desktop')
const info = <HTMLDivElement>document.getElementById('info')
const profile = <HTMLDivElement>document.getElementById('profile')
const menu = <HTMLDivElement>document.getElementById('menu')
const command = <HTMLDivElement>document.getElementById('command')

//  browser client detection
let a = document.querySelector("#a2hs-button")
let t

if ('userAgentData' in navigator) {
    //  default startup
    terminal.hidden = false
    info.hidden = false
    desktop.hidden = true
    wall.hidden = true

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('sw.js').then(function (registration) {
                // Registration was successful
                console.log('ServiceWorker registration successful with scope: ', registration.scope)
            }, function (err) {
                // registration failed :(
                console.error('ServiceWorker registration failed: ', err)
            })
        })
    }

    window.addEventListener('beforeinstallprompt', function (e) {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault()
        // Stash the event so it can be triggered later.
        t = e
        // Update UI notify the user they can add to home screen
        a2hs.hidden = false

        a.classList.add("available");
        a.addEventListener("click", function (e) {
            e.preventDefault()
            t && !a.classList.contains("disabled") && t.prompt().then(function () {
                t.userChoice.then(function (e) {
                    "accepted" === e.outcome
                        ? (a.classList.add("disabled"), a.setAttribute("title", "App already installed"), t = null)
                        : a.setAttribute("title", "Refresh the page and click again to install app")
                    a.classList.add("disabled")
                })
            })
        })
    })
}
else {
    terminal.hidden = true
    info.hidden = true
    desktop.hidden = false
    wall.hidden = false
}

//  XTerm
let term: Terminal
let cols = 80, rows = 25
const BELL_SOUND = 'data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU='
const fit = new FitAddon()

//  application
const app = location.pathname.replace(/\/+$/, "")
const socketURL = `${location.protocol == 'https:' ? 'wss://' : 'ws://'}${location.hostname}${location.port ? ':' + location.port : ''}`
let pid = 0, wpid = 0, tty = false
let socket: WebSocket
let carrier = false, recheck = 0
let idle: NodeJS.Timeout, reconnect: NodeJS.Timeout, lurking: NodeJS.Timeout
let tbt = 1

//  monitor with terminal
//  =====================
window.onresize = () => {
    //  check for idle client state
    if (!wall.hidden) {
        const zoom = Math.trunc(80 / (splash.clientWidth / window.innerWidth))
        splash.style.transform = `scale(${zoom}%,${zoom}%) translate(0%,0%)`
    }
    if (!pid && !wpid) return

    //  check for a resize between minimum terminal width requirements
    info.hidden = (wpid > 0 || window.innerWidth < 960)

    //  tweak side panel sizing within reason
    monitor.style.width = info.hidden ? '100%' : '70%'
    info.style.width = '30%'
    terminal.style.top = '22px'
    terminal.style.bottom = '22px'
    term.options.fontSize = 24
    let xy = fit.proposeDimensions()
    let w = Math.trunc(parseInt(info.style.width) * (xy.cols || 80) / 80)
    w = w < 26 ? 26 : w > 34 ? 34 : w
    monitor.style.width = info.hidden ? '100%' : `${100 - w}%`
    info.style.width = `${w}%`
    //	adjust font to fit for standard width
    xy = fit.proposeDimensions()
    term.options.fontSize = Math.trunc((pid ? 24 : 16) * (xy.cols || 80) / 80)
    //  and make it stick
    xy = fit.proposeDimensions()
    if (!info.hidden && xy.cols > 80) {
        monitor.style.width = `${Math.round(parseInt(monitor.style.width) * 80 / xy.cols)}%`
        info.style.width = `${100 - parseInt(monitor.style.width)}%`
    }
    cols = 80
    rows = xy.rows
    term.resize(cols, rows)
    term.scrollToBottom()
    const viewport = <HTMLDivElement>document.getElementsByClassName('xterm-viewport')[0]
    terminal.style.top = `${Math.trunc(22 + (terminal.clientHeight - viewport.clientHeight) / 2)}px`
    terminal.style.bottom = terminal.style.top
    cmdResize()
}

function doCommand(event) {
    if (event.data) {
        let html = ''
        if (event.data.func) {
            if (currentCMD !== event.data.func) {
                currentCMD = event.data.func
                eval(`${currentCMD} ()`)
            }
            return
        }

        if (event.data.anim) {
            animated(event.data.anim)
            return
        }

        if (event.data.images) {
            images = event.data.images
            return
        }

        if (event.data.leader) {
            html = `<h2>${event.data.handle}</h2><table><tr><td rowspan=2><img src="images/${event.data.banner}.png" /></td><td><img src="images/${event.data.leader}.png" /></td></tr>`
            if (event.data.leader)
                html += `<tr><td><img src="images/${event.data.coat}.png" /></td></tr>`
            html += `</table>`
            nme(html)
            return
        }

        if (event.data.mob1) {
            const h = profile.clientWidth - 4
            html = `<table width="${h}px"><tr><td><img style="max-width:${h >> 1}px;" src="images/${event.data.mob1}.png" /></td><td><img style="max-width:${h >> 1}px;" src="images/${event.data.mob2}.png" /></td></tr>`
            if (event.data.mob3)
                html += `<tr><td colspan=2><img style="max-width:${(h * 3) >> 2}px;" src="images/${event.data.mob3}.png" /></td></tr>`
            html += `</table>`
            nme(html)
            return
        }

        if (event.data.handle)
            html += `<span style="font-size:xx-large;">${event.data.handle}</span>`
        if (event.data.level)
            html += `<span style="font-family:VT323,tty; font-size:x-large;">&nbsp;a level ${event.data.level}</span>`
        if (event.data.pc)
            html += `<span style="font-family:VT323,tty; font-size:x-large;">&nbsp;${event.data.pc}</span>`
        if (event.data.jpg)
            html += `<br><img src="images/${event.data.jpg}.jpg" />`
        if (event.data.png)
            html += `<br><img src="images/${event.data.png}.png" />`

        nme(html, event.data.effect || 'fadeIn')
    }
}

function newSession(ev) {
    let options: ITerminalOptions = {
        allowProposedApi: true, scrollSensitivity: 12, smoothScrollDuration: 240,
        cursorBlink: false, drawBoldTextInBrightColors: true, scrollback: 800,
        fontFamily: 'tty,emoji', fontSize: 24, fontWeight: '400', fontWeightBold: '500',
        theme: {
            foreground: 'Silver', background: 'Black', cursor: 'PowderBlue',
            black: 'Black', red: 'DarkRed', green: 'ForestGreen', yellow: 'SandyBrown',
            blue: 'MediumBlue', magenta: 'MediumOrchid', cyan: 'DarkCyan', white: 'Silver',
            brightBlack: 'DimGray', brightRed: 'Red', brightGreen: 'LightGreen', brightYellow: 'Gold',
            brightBlue: 'RoyalBlue', brightMagenta: 'Violet', brightCyan: 'Cyan', brightWhite: 'Snow'
        },
        wordSeparator: ` .:;?!"'<>(/)[=]`
    }

    carrier = (ev == 'Logon')
    if (lurking) clearInterval(lurking)
    if (reconnect) clearInterval(reconnect)
    pid = -1
    recheck = -1

    if (carrier) options.fontFamily = '"Noto Sans Mono","Noto Color Emoji"'
    term = new Terminal(options)
    term.resize(cols, rows)
    term.loadAddon(new Unicode11Addon())
    term.loadAddon(new WebLinksAddon())
    term.loadAddon(fit)

    term.onData(data => {
        if (carrier) {
            socket.send(data)
        }
        else {
            if (idle) clearInterval(idle)
            XT('@tune(.)')
            pid = 0
            term.dispose()
            if (data == '\r' || data == ' ') {
                tty = true
                newSession('Logon')
            }
            else {
                tty = false
                receive({ data: { 'func': 'emit', 'message': '\x1B', 'return': false } })
            }
        }
    })

    term.onResize(size => {
        XT('@action(reSize)')
        if (pid < 1) return
        cols = size.cols
        rows = size.rows
        fetch(`${app}/player/${pid}/size?cols=${cols}&rows=${rows}`, { method: 'POST' })
    })

    term.onSelectionChange(() => {
        if (carrier) {
            let word = term.getSelection()
            if (word.length > 0 && word.length < 23) {
                socket.send(word + '\x0D')
                term.clearSelection()
            }
        }
    })

    //	light it up, Bert!
    term.unicode.activeVersion = '11'
    term.open(document.getElementById('terminal'))
    //let's try something new when auto-detection is better suppported
    term.loadAddon(new WebglAddon())
    fit.fit()
    term.blur()
    term.writeln('\x07')

    if (ev == 'Logon') {
        if (idle) clearInterval(idle)
        XT('@tune(dankdomain)')
        pid = 0
        fetch(`${app}/player/?cols=${term.cols}&rows=${term.rows}`, { method: 'POST' }).then(function (res) {
            term.write(`\n\x1B[0;2mConnecting terminal WebSocket ... `)
            res.text().then(function (session) {
                pid = parseInt(session)
                socket = new WebSocket(`${socketURL}${app}/player/?pid=${pid}`)

                socket.onmessage = function (ev) {
                    XT(ev.data)
                }

                socket.onopen = () => {
                    carrier = true
                    term.writeln('open\x1B[m')
                    if (!term.options.cursorBlink) {
                        term.focus()
                        term.options.cursorBlink = true
                    }
                    if (!tty)
                        term.blur()
                    XT('@action(Logon)')
                }

                socket.onclose = (ev) => {
                    if (term.options.cursorBlink)
                        term.options.cursorBlink = false
                    term.writeln('\x1B[0;2mWebSocket close\x1B[m')
                    XT('@action(Logoff)')
                    carrier = false
                    recheck = 0
                    reconnect = setInterval(checkCarrier, 20000)
                    tty = false
                }

                socket.onerror = (ev) => {
                    term.writeln(`\x1B[1;37;41m error \x1B[m${ev}\x07\r\nNO DIALTONE`)
                    carrier = false
                }
            })
        }).finally(() => {
            setImmediate(() => window.dispatchEvent(new Event('resize')))
        })
    }
    else {
        term.focus()
        fetch(`${app}/assets/title.txt`, { method: 'GET' }).then((res) => {
            return res.text().then((data) => {
                term.blur()
                term.writeln('\t\t🔥 🌨\r\x1b[23C\x1b[1;36mW\x1b[22melcome to D\x1b[2mank \x1b[22mD\x1b[2momain \x1b[m🌙 💫')
                term.write(data)
                fetch(`${app}/gallery/`, { method: 'POST' }).then((res) => {
                    res.json().then((knock) => {
                        let i = Math.trunc(4 * Math.random())
                        if (knock.wall) term.writeln(knock.wall)
                        term.write('\t')
                        //  5-day annual remembrance
                        if (new Date().getMonth() == 8) {
                            const date = new Date().getDate()
                            if (date >= 9 && date <= 13)
                                term.write(`✈💥🏢🏢 \x1b[0;2;4mNever\x1b[24m forget.\x1b[m`)
                        }
                        term.writeln(`\t\x1b[1;34mThe North remembers.\x1b[m 🐺`)
                        term.write('\x1b[1;36m≫ \x1b[22;2m press either \x1b[22mENTER\x1b[2m or \x1b[22mSPACE\x1b[2m to \x1b[22;35mCONNECT\x1b[2;36m using a keyboard:\x1b[22m ')
                        doCommand({ data: { images: knock.list } })
                        XT(`@play(${['demon', 'demogorgon', 'portal', 'thief2'][i]})`)
                    }).finally(() => {
                        term.focus()
                        XT('@action(welcome)')
                    })
                })
            })
        }).finally(() => {
            //  it started 1985: Adventure Construction Set on the Commodore 64
            //  demo mode "Sir Handsome" struck me as a flying ape, thus the handle
            //  ... added some more throwback tunes to rotate in
            idle = setInterval(() => { XT(`@tune(throwback${tbt++})`) }, 300000)
        })
    }
}

// let's have a nice value for both the player and the web server
function checkCarrier() {
    if (++recheck < 10)
        term.write('.')
    else {
        carrier = false
        clearInterval(reconnect)
        clearInterval(art)
        XT('@action(clear)')
        XT('@play(invite)')
        if (pid) {
            term.dispose()
            pid = 0
        }

        terminal.hidden = true
        info.hidden = true
        monitor.style.width = '100%'
        wall.hidden = false
        setImmediate(() => window.dispatchEvent(new Event('resize')))

        lurk()
        lurking = setInterval(lurk, 20000)
    }
}

function XT(data) {
    let copy = data + ''
    // find any occurrences of @func(data), and for each: call func(data)
    const re = '[@](?:(action|animated|profile|play|title|tune|wall)[(](.+?)[)])'
    let search = new RegExp(re, 'g'); let replace = new RegExp(re)
    let match: RegExpMatchArray
    while (match = search.exec(copy)) {
        let x = replace.exec(data)
        let s = x.index, e = s + x[0].length
        data = data.substr(0, s) + data.substr(e)
        if (pid) eval(`${match[1]}(match[2])`)
    }
    term.write(data)

    function action(menu) {

        doCommand({ data: { func: menu } })
    }

    function animated(effect) {
        doCommand({ data: { anim: effect } })
    }

    function play(fileName) {
        if (!audioPlay.paused) {
            audioPlay.pause()
            audioPlay.currentTime = 0
        }
        if (!fileName.length || fileName == '.') return

        let source = audioPlay.getElementsByTagName('source')
        source[0].src = `sounds/${fileName}.ogg`
        source[0].type = 'audio/ogg'
        source[1].src = `sounds/${fileName}.mp3`
        source[1].type = 'audio/mp3'
        audioPlay.load()
        audioPlay.play().catch(err => { })
    }

    function profile(panel) {
        if (typeof panel == 'string') panel = JSON.parse(panel)
        doCommand({ data: panel })
    }

    function title(name) {
        document.title = name
    }

    function tune(fileName) {
        if (!audioTune.paused) {
            audioTune.pause()
            audioTune.currentTime = 0
        }
        if (!fileName.length || fileName == '.') return

        let source = audioTune.getElementsByTagName('source')
        source[0].src = `sounds/${fileName}.ogg`
        source[0].type = 'audio/ogg'
        source[1].src = `sounds/${fileName}.mp3`
        source[1].type = 'audio/mp3'
        audioTune.load()
        audioTune.play().catch(err => { })
    }
    /*
        function wall(msg) {
            if (pid) fetch(`${app}/player/${pid}/wall?msg=${msg}`, { method: 'POST' })
        }
    */
}

function lurk() {
    if (terminal.hidden) {
        fetch(`${app}/lurker/`, { method: 'POST' }).then(function (res) {
            return res.json().then(function (data) {
                let es = document.getElementById('lurker-state')
                if (data.length) {
                    es.innerHTML = `&nbsp;· Watch an online player: <select id="lurker-list"></select>`
                    audioPlay.src = BELL_SOUND
                    audioPlay.play().catch()
                }
                else
                    es.innerHTML = `&nbsp;· Waiting for an online player ...<select id="lurker-list" hidden></select>`

                let el = document.getElementById('lurker-list')
                let watch: HTMLOptionsCollection = <any>el
                for (let i in data) {
                    let option = document.createElement("option")
                    option.text = data[i].id
                    option.value = data[i].pid
                    watch.add(option)
                }
                watch.selectedIndex = -1
                el.blur()
                setImmediate(() => window.dispatchEvent(new Event('resize')))

                el.onchange = (ev) => {
                    let watch: HTMLOptionsCollection = <any>ev.target
                    wpid = parseInt(watch[watch.selectedIndex].value)

                    wall.hidden = true
                    terminal.hidden = false
                    term = new Terminal({
                        allowProposedApi: true,
                        cursorBlink: false, scrollback: 0,
                        fontFamily: 'tty,emoji', fontSize: 24, fontWeight: '400', fontWeightBold: '500',
                        theme: {
                            foreground: '#a3a7af', background: '#23272f', cursor: '#e0c8e0',
                            black: '#000000', red: '#a00000', green: '#00a000', yellow: '#c8a000',
                            blue: '#0000a0', magenta: '#a000a0', cyan: '#00a0a0', white: '#b0b0b0',
                            brightBlack: '#646464', brightRed: '#ff0000', brightGreen: '#00ff00', brightYellow: '#ffff00',
                            brightBlue: '#0000ff', brightMagenta: '#ff00ff', brightCyan: '#00ffff', brightWhite: '#ffffff'
                        }
                    })
                    term.loadAddon(new Unicode11Addon())
                    term.loadAddon(new WebLinksAddon())
                    term.loadAddon(fit)
                    term.unicode.activeVersion = '11'
                    term.open(document.getElementById('terminal'))
                    fit.fit()

                    setImmediate(() => window.dispatchEvent(new Event('resize')))
                    term.write('\n\x1B[1;32mConnecting your terminal to ' + watch[watch.selectedIndex].text + ' WebSocket ... ')

                    //	any keystroke sent will signal for this WebSocket to close
                    term.onData(data => { socket.send(data) })

                    fetch(`${app}/lurker/?pid=${wpid}`, { method: 'POST' }).then(function (res) {
                        res.text().then(function (lurker) {
                            socket = new WebSocket(`${socketURL}${app}/lurker/?lurker=${lurker}`)

                            socket.onmessage = (ev) => {
                                XT(ev.data)
                            }

                            socket.onopen = () => {
                                term.writeln('open\x1B[m\x07')
                            }

                            socket.onclose = (ev) => {
                                XT('@tune(.)')
                                term.dispose()
                                wpid = 0
                                terminal.hidden = true
                                wall.hidden = false
                                lurk()
                            }

                            socket.onerror = (ev) => {
                                term.writeln('\x1B[1;31merror')
                            }
                        })
                    })
                }
            })
        })
    }
}

function receive(event) {
    if (event.data) {
        switch (event.data.func) {
            case 'kb':
                if (pid) {
                    tty = true
                    term.focus()
                }
            case 'emit':
                if (!carrier) {
                    XT('@tune(.)')
                    if (event.data.message == ' ') {
                        term.dispose()
                        pid = 0
                        newSession('Logon')
                    }
                    else {
                        recheck = 10
                        checkCarrier()
                    }
                    return
                }
                if (event.data.message)
                    socket.send(event.data.message)
                if (event.data.return)
                    socket.send('\r')
                break
        }
    }
}


//  info with profile and command
//  =============================

//  command support functions
const allOpt = `<input class="platinum" type="button" value="ALL" onclick="send('=', true);">`
const bestOpt = `<input class="platinum" type="button" value="BEST" onclick="send('=', true);">`
const maxOpt = `<input class="Platinum" type="button" value="MAX" onclick="send('MAX', true);">`
const ByeBye = `<input class="Copper" type="button" id="cancel" value="LOGOFF" onclick="send('Q');">`
const Cancel = `<input class="Copper" type="button" id="cancel" value="Clear" onclick="send('\x15');">`
const Enter = `<input class="Slate" type="button" id="default" value="Enter" onclick="send('', true);">`
const quit = `<input class="copper" type="button" id="cancel" value="Quit" onclick="send('Q');">`
const keypad = `<table>
  <tr><td><input class="Keycap" type="button" value="7" onclick="send('7');"></td><td><input class="Keycap" type="button" value="8" onclick="send('8');"></td><td><input class="Keycap" type="button" value="9" onclick="send('9');"></td></tr>
  <tr><td><input class="Keycap" type="button" value="4" onclick="send('4');"></td><td><input class="Keycap" type="button" value="5" onclick="send('5');"></td><td><input class="Keycap" type="button" value="6" onclick="send('6');"></td></tr>
  <tr><td><input class="Keycap" type="button" value="1" onclick="send('1');"></td><td><input class="Keycap" type="button" value="2" onclick="send('2');"></td><td><input class="Keycap" type="button" value="3" onclick="send('3');"></td></tr>
  <tr><td><input class="Keycap" type="button" value="0" onclick="send('0');"></td><td colspan=2>${Enter}</td></tr>
  <tr><td><input class="Silver" type="button" value="?" onclick="send('?', true);"></td><td colspan=2>${Cancel}</td></tr>
</table>`
const keyboard = `<table>
<tr><td><input class="Keycap" type="button" value="a" onclick="send('a');"></td><td><input class="Keycap" type="button" value="b " onclick="send('b');"></td><td><input class="Keycap" type="button" value="c " onclick="send('c');"></td><td><input class="Keycap" type="button" value="d " onclick="send('d');"></td><td><input class="Keycap" type="button" value="e " onclick="send('e');"></td></tr>
<tr><td><input class="Keycap" type="button" value="f" onclick="send('f');"></td><td><input class="Keycap" type="button" value="g " onclick="send('g');"></td><td><input class="Keycap" type="button" value="h " onclick="send('h');"></td><td><input class="Keycap" type="button" value="i " onclick="send('i');"></td><td><input class="Keycap" type="button" value="j " onclick="send('j');"></td></tr>
<tr><td><input class="Keycap" type="button" value="k" onclick="send('k');"></td><td><input class="Keycap" type="button" value="l " onclick="send('l');"></td><td><input class="Keycap" type="button" value="m " onclick="send('m');"></td><td><input class="Keycap" type="button" value="n " onclick="send('n');"></td><td><input class="Keycap" type="button" value="o " onclick="send('o');"></td></tr>
</td><td><input class="Keycap" type="button" value="p" onclick="send('p');"></td><td><input class="Keycap" type="button" value="q " onclick="send('q');"></td><td><input class="Keycap" type="button" value="r " onclick="send('r');"></td><td><input class="Keycap" type="button" value="s " onclick="send('s');"></td><td><input class="Keycap" type="button" value="t " onclick="send('t');"></td></tr>
<tr><td><input class="Keycap" type="button" value="u" onclick="send('u');"></td><td><input class="Keycap" type="button" value="v " onclick="send('v');"></td><td><input class="Keycap" type="button" value="w " onclick="send('w');"></td><td><input class="Keycap" type="button" value="x " onclick="send('x');"></td><td><input class="Keycap" type="button" value="y " onclick="send('y');"></td></tr>
</td><td><input class="Keycap" type="button" value="z" onclick="send('z');"></td><td><input class="Gold" type="button" value="@" onclick="send('@');"></td><td><input class="Gold" type="button" value="." onclick="send('.');"></td><td><input class="Gold" type="button" value="," onclick="send(',');"></td><td><input class="Gold" type="button" value="-" onclick="send('-');"></td></tr>
<tr><td><input class="Slate" type="button" value="_" onclick="send('_');"></td><td colspan=3><input class="Slate" type="button" value="SPACE BAR" onclick="send(' ');"></td><td><input class="Slate" type="button" value="⇐" onclick="send('\x08');"></td></tr>
<tr><td colspan=2>${Cancel}</td><td><input class="Silver" type="button" value="?" onclick="send('?', true);"></td><td colspan=2>${Enter}</td></tr>
</table>`
const money = `<table>
<tr><td><input class="Keycap" type="button" value="7" onclick="send('7');"></td><td><input class="Keycap" type="button" value="8" onclick="send('8');"></td><td><input class="Keycap" type="button" value="9" onclick="send('9');"></td><td><input class="Platinum" type="button" value="P" onclick="send('p');"></td></tr>
<tr><td><input class="Keycap" type="button" value="4" onclick="send('4');"></td><td><input class="Keycap" type="button" value="5" onclick="send('5');"></td><td><input class="Keycap" type="button" value="6" onclick="send('6');"></td><td><input class="Gold" type="button" value="G" onclick="send('g');"></td></tr>
<tr><td><input class="Keycap" type="button" value="1" onclick="send('1');"></td><td><input class="Keycap" type="button" value="2" onclick="send('2');"></td><td><input class="Keycap" type="button" value="3" onclick="send('3');"></td><td><input class="Silver" type="button" value="S" onclick="send('s');"></td></tr>
<tr><td><input class="Keycap" type="button" value="0" onclick="send('0');"><td colspan=2>${Enter}</td></td><td><input class="Copper" type="button" value="C" onclick="send('c');"></td></tr>
<tr><td colspan=2>${Cancel}</td><td colspan=2>${maxOpt}</td>
</tr></table>`

let art = null
let images = []
let currentCMD = null

function nme(html = '', effect?: string) {
    profile.innerHTML = html
    let img = profile.getElementsByTagName('img')
    if (img && img.length == 1) {
        img.item(0).style.display = 'none'
        img.item(0).onload = () => { nmeResize(`${effect}`) }
    }
}

function nmeResize(effect: string, func = false) {
    if (recheck < 0) {
        recheck = 0
        setImmediate(() => {
            window.dispatchEvent(new Event('resize'))
            nmeResize(effect)
        })
        return
    }
    if (/<table/.test(profile.innerHTML)) return
    if (!func) animated(effect || 'fadeIn')
    cmdResize()
}

function cmdResize() {
    command.hidden = false
    menu.style.top = `${window.innerHeight - command.clientHeight}px`
    menu.style.left = `${Math.trunc((info.clientWidth - command.clientWidth) / 2)}px`
    //  stretch height any (up to 11% overlap)?
    let flex = 1 - Math.trunc(100 * profile.clientHeight / window.innerHeight) / 100 + .11
    flex = flex > .67 ? .67 : flex < .33 ? .33 : flex
    let y = Math.trunc(96 / (command.clientHeight / window.innerHeight) * flex) / 100
    //  stretch width any?
    let x = Math.trunc(96 / (command.clientWidth / info.clientWidth)) / 100
    x = x > 3.2 ? 3.2 : x
    y = y > 3 ? 3 : y < x ? x : y
    //  try to position @ bottom
    let ty = 50 - 50 / y
    command.style.transform = `scale(${x},${y}) translate(0%,${-ty}%)`
}

function reSize() {
    currentCMD = null
}

function cmd(html) {
    command.hidden = true
    command.style.transform = 'unset'
    menu.style.top = '0px'
    menu.style.left = '0px'
    command.innerHTML = `<br>${html}`

    //  remove HTML onclick event to instantiate good practice ...
    let inputs = command.getElementsByTagName('input')
    for (let i = 0; i < inputs.length; i++) {
        if (inputs.item(i).onclick) {
            let code = inputs.item(i).onclick.toString()
            inputs.item(i).removeAttribute("onclick")
            inputs.item(i).addEventListener("click", () => {
                eval(`${code}; onclick();`)
            })
        }
    }

    setImmediate(() => cmdResize())
}

function animated(effect) {
    let img = profile.getElementsByTagName('img')
    if (!img || !img.length) return

    let pic: HTMLImageElement

    if (img.length == 1) {
        pic = img[0]
        while (pic.classList.length)
            pic.classList.remove(pic.classList.item(0))
    }
    else {
        for (var i in img) {
            pic = img[i]
            if (pic?.style && !pic.style.display)
                break
        }
    }

    if (pic?.style) {
        pic.style.display = 'inline-block'
        pic.classList.add('animate__animated')
        var effects = effect.split(' ')
        for (var i in effects)
            pic.classList.add('animate__' + effects[i])
    }
}

function Logon() {
    clearInterval(art)
    art = null
    cmd(`<form><input type="text" placeholder="your ID or handle" id="playerID" name="id" autocomplete="username" required><br>
<input type="password" placeholder="your password" id="password" name="password" autocomplete="current-password" required><br>
<input type="button" class="slate" value="NEW" onclick="send('NEW', true);">&nbsp;&nbsp;&nbsp;<input type="button" class="silver" value="Login" onclick="sendLogin();"></form><br>⬅️ or click left window for cursor`)
    nme(`<img src="images/npc/city_guard_2.png" />`, 'bounceInDown')
}

function sendLogin() {
    setTimeout(function () { send((document.getElementById('playerID') as HTMLInputElement).value, true); }, 99)
    setTimeout(function () { send((document.getElementById('password') as HTMLInputElement).value, true); }, 1440)
    return false
}

function Logoff() {
    if (!art) art = setInterval(rotateImage, 14400)
    cmd(`<table>
<tr><td><input type="button" class="slate" id="cancel" value="Disconnect" onclick="currentCMD = ''; send('\x1B');"></td><td><input class="platinum" id="default" value="CONNECT" onclick="send(' ');" type="submit"></td></tr>
</table>
<div id="about" style="line-height: 90%;">
<hr>
<span style="font-size:larger;">🏰 <a href="https://www.ddgame.us" target="_new"><b  style="color:black; class="font-effect-emboss">&nbsp;Dank Domain&nbsp;</b></a></span><br>
<span style="font-family:Sofia; font-size:75%;" class="font-effect-outline">the return of Hack &amp; Slash</span><br><br>
<span style="color:brown; font-size:smaller;">🇺🇸 &copy; 2017 - 2023 <a href="https://robert.hurst-ri.us" target="_new">Robert Hurst</a> 🧙</span><br><br>
⚡<span style="color:black; font-family:VT323,tty;"> Powered by <a href="https://xtermjs.org" target="_blank">Xterm.js</a> </span>📺
<hr>
</div>`)
}

function rotateImage() {
    animated('fadeOutLeft')
    if (images.length) {
        const about = <HTMLDivElement>document.getElementById('about')
        about.hidden = images.length % 9 ? true : false

        const n = Math.trunc(Math.random() * images.length)
        const banner = images.splice(n, 1)[0]

        let html = ''
        if (banner.handle) html += `<span style="font-size:xx-large;">${banner.handle}</span>`
        if (banner.level) html += `<span style="font-family:VT323,tty; font-size:x-large;">&nbsp;a level ${banner.level}</span>`
        if (banner.pc) html += `<span style="font-family:VT323,tty; font-size:x-large;">&nbsp;${banner.pc}</span>`
        if (banner.jpg) html += `<br><img src="images/${banner.jpg}.jpg" />`
        if (banner.png) html += `<br><img src="images/${banner.png}.png" style="filter:opacity(${/^connect/.test(banner.png) ? '45%' : '100%'});" />`

        setTimeout(() => { nme(html, banner.effect) }, 1000)
    }
    else
        send('\x15')
}

function send(keystrokes, cr = false, et = 'emit') {
    window.parent.postMessage({ 'func': et, 'message': keystrokes, 'return': cr }, location.href)
}

function clear() {
    cmd('')
    nme('')
}

function freetext() {
    cmd(`${keyboard}`)
}

function gender() {
    cmd(`<table>
<tr><td><input class="Silver" type="button" value="Male" onclick="send('M');"></td><td>&nbsp;</td><td><input class="Platinum" type="button" value="Female" onclick="send('F');"></td></tr>
</table>`)
}

function list() {
    cmd(`${keypad}`)
}

function listall() {
    cmd(`${keypad}<br>${allOpt}`)
}

function listbest() {
    cmd(`${keypad}<br>${bestOpt}`)
}

function listmm() {
    cmd(`${keypad}<br><input class="platinum" type="button" value="Monster Mash" onclick="send('M', true);">`)
}

function mainmenu() {
    cmd(`<table>
<tr><td colspan=2>${ByeBye}</td><td colspan=2><input class="Platinum" type="button" value="Most Wanted" onclick="send('M');"></td></tr>
<tr><td colspan=4><hr></td></tr>
<tr><td><input type="button" value="Reroll" onclick="send('X');"></td><td><input type="button" value="Rob" onclick="send('R');"></td><td><input class="Silver" type="button" value="Naval" onclick="send('N');"></td><td><input class="Silver" type="button" value="Arena" onclick="send('A');"></td></tr>
<tr><td><input type="button" value="Library" onclick="send('L');"></td><td><input type="button" value="Casino" onclick="send('G');"></td><td><input class="Slate" type="button" value="Party" onclick="send('P');"></td><td><input class="Slate" type="button" value="Dungeon" onclick="send('D');"></td></tr>
<tr><td><input type="button" value="System" onclick="send('Z');"></td><td><input type="button" value="Status" onclick="send('Y');"></td><td><input class="Tavern" type="button" value="Tavern" onclick="send('T');"></td><td><input class="Tavern" type="button" value="Square" onclick="send('S');"></td></tr>
</table>`)
}

function ny() {
    cmd(`<table>
<tr><td><input class="Slate" type="button" id="cancel" value="Yes" onclick="send('Y');"></td><td><input class="Silver" type="button" value="&nbsp;&nbsp;NO&nbsp;&nbsp;" onclick="send('N');"></td></tr>
<tr><td colspan=2>${Enter}</td></tr>
</table>`)
}

function yn() {
    cmd(`<table>
<tr><td><input class="Slate" type="button" id="cancel" value="No" onclick="send('N');"></td><td><input class="Silver" type="button" value="&nbsp;&nbsp;YES&nbsp;&nbsp;" onclick="send('Y');"></td></tr>
<tr><td colspan=2>${Enter}</td></tr>
</table>`)
}

function arena() {
    cmd(`<table>
<tr><td><input class="Gold" type="button" value="User" onclick="send('U');"></td><td><input class="Silver" type="button" value="Monster" onclick="send('M');"></td></tr>
<tr><td><input class="platinum" type="button" value="Cast" onclick="send('C');"></td><td><input class="slate" type="button" value="Poison" onclick="send('P');"></td></tr>
<tr><td><input type="button" value="Status" onclick="send('Y');"></td><td><input class="gold" type="button" value="Joust" onclick="send('J');"></td></tr>
<tr><td><input class="Tavern" type="button" value="SQUARE" onclick="send('G');"></td><td>${quit}</td></tr>
</table>`)
}

function bank() {
    cmd(`<table>
<tr><td colspan=2><input type="button" value="Rob 💰" onclick="send('R');"></td></tr>
<tr><td><input class="Slate" type="button" value="Withdraw" onclick="send('W');"></td><td><input class="Slate" type="button" value="Deposit" onclick="send('D');"></td></tr>
<tr><td><input class="Slate" type="button" value="Loan" onclick="send('L');"></td><td>${quit}</td></tr>
</table>`)
    nme(`<img src="images/bank.jpg" />`, 'pulse')
}

function battle() {
    cmd(`<table>
<tr><td><input class="Slate" id="cancel" type="button" value="Retreat" onclick="send('R');"></td><td><input class="Platinum" type="button" value="Cast" onclick="send('C');"></td></tr>
<tr><td><input type="button" value="Status" onclick="send('Y');"></td><td><input class="Slate" id="default" type="button" value="Attack!" onclick="send('A');"></td></tr>
</table>`)
}

function blackjack() {
    cmd(`<table>
<tr><td colspan=2><input class="Slate" type="button" value="Hit me!" onclick="send('H');"></td></tr>
<tr><td><input class="gold" type="button" value="Double" onclick="send('D');"></td><td><input class="silver" id="cancel" type="button" value="Stay" onclick="send('S');"></td></tr>
</table>`)
}

function brawl() {
    cmd(`<table>
<tr><td colspan=2><input class="copper" id="cancel" type="button" value="Give up" onclick="send('G');"></td><tr>
<tr><td><input type="button" value="Status" onclick="send('Y');"></td><td><input class="Slate" id="default" type="button" value="Punch!" onclick="send('P');"></td></tr>
</table>`)
}

function casino() {
    cmd(`<table>
<tr><td><input class="Slate" type="button" value="🂡 Black Jack 🂫" onclick="send('B');"></td></tr>
<tr><td><input class="Slate" type="button" value="🎲 Craps 🎲" onclick="send('C');"></td></tr>
<tr><td><input class="Slate" type="button" value="🃏 High Stakes 🃏" onclick="send('H');"></td></tr>
<tr><td><input class="Slate" type="button" value="🔢 Keno 🔟" onclick="send('K');"></td></tr>
<tr><td><input class="Slate" type="button" value="🍒💣 Slots 🎰" onclick="send('S');"></td></tr>
<tr><td>${quit}</td></tr>
</table>`)
}

function craps() {
    cmd(`${money}<br><input class="slate" type="button" value="Roll!" onclick="send('', true);">`)
}

function dungeon() {
    cmd(`<table>
<tr><td><input class="Platinum" type="button" value="Cast" onclick="send('C');"></td><td><input class="Slate" type="button" value="North" onclick="send('N');"></td><td><input class="Copper" type="button" value="Poison" onclick="send('P');"></td></tr>
<tr><td><input class="Slate" type="button" value="West" onclick="send('W');"></td><td style="font-size:xx-large">🧭</td><td><input class="Slate" type="button" value="East" onclick="send('E');"></td></tr>
<tr><td></td><td><input class="Slate" type="button" value="South" onclick="send('S');"></td><td><input type="button" class="Silver" value="Status" onclick="send('Y');"></td></tr>
</table>`)
}

function hunt() {
    cmd(`<table>
<tr><td colspan=2><input class="silver" id="cancel" type="button" value=" Sail off " onclick="send('S');"></td></tr>
<tr><td colspan=2><hr></td></tr>
<tr><td colspan=2><input type="button" value="Status" onclick="send('Y');"></tdtd></tr>
<tr><td><input class="Slate" type="button" value="Ram" onclick="send('R');"></td><td><input class="Copper" id="default" type="button" value="Fire!" onclick="send('F');"></td></tr>
</table>`)
}

function joust() {
    cmd(`<table>
<tr><td><input class="copper" id="cancel" type="button" value="Forfeit" onclick="send('F');"></td><td><input class="slate" id="default" type="button" value="Joust" onclick="send('J');"></td></tr>
</table>`)
}

function library() {
    cmd(`<table>
<tr><td><input class="Silver" type="button" value="Champions" onclick="send('C');"></td><td><input class="Platinum" type="button" value="Heroes" onclick="send('H');"></td></tr>
<tr><td colspan=2><input class="Gold" type="button" value="Memorable Hits" onclick="send('M');"></td></tr>
<tr><td><input class="Tavern" type="button" value="Thugs" onclick="send('T');"></td><td><input class="Slate" type="button" value="Winners" onclick="send('W');"></td></tr>
<tr><td></td><td>${quit}</td></tr>
</table>`)
    nme(`<img src="images/heroes.jpg" />`, 'bounceInUp')
}

function monster() {
    cmd(`${keypad}<br><input class="platinum" type="button" value="Demon" onclick="send('D', true);">`)
}

function naval() {
    cmd(`<table>
<tr><td colspan=2><input type="button" value="Go fishing 🐟" onclick="send('G');"></td></tr>
<tr><td><input class="Slate" type="button" value="List" onclick="send('L');"></td><td><input class="Slate" type="button" value="Status" onclick="send('Y');"></td></tr>
<tr><td><input class="Silver" type="button" value="Hunt" onclick="send('H');"></td><td><input class="Tavern" type="button" value="Shipyard" onclick="send('S');"></td></tr>
<tr><td><input class="Gold" type="button" value="Battle" onclick="send('B');"></td><td>${quit}</td></tr>
</table>`)
}

function party() {
    cmd(`<table>
<tr><td><input type="button" value="Edit" onclick="send('E');"></td><td><input type="button" value="List" onclick="send('L');"></td></tr>
<tr><td><input type="button" value="Resign" onclick="send('R');"></td><td><input type="button" value="Transfer" onclick="send('T');"></td></tr>
<tr><td colspan=2><input class="Gold" type="button" value="Most Wanted" onclick="send('M');"></td></tr>
<tr><td colspan=2><hr></td></tr>
<tr><td><input class="Platinum" type="button" value="Join" onclick="send('J');"></td><td><input class="Slate" type="button" value="Fight!" onclick="send('F');"></td></tr>
<tr><td><input class="Silver" type="button" value="Start" onclick="send('S');"></td><td>${quit}</td></tr>
</table>`)
}

function payment() {
    cmd(`${money}`)
    nme(`<img src="images/payment.png" />`, 'bounce')
}

function potion() {
    cmd(`<table>
<tr><td><input class="Slate" type="button" value="Yes" onclick="send('Y');"></td><td><input class="Silver" type="button" id="default" value="NO" onclick="send('N');"></td></tr>
<tr><td colspan=2><input class="Copper" type="button" id="cancel" value="Toss" onclick="send('T');"></td></tr>
</table>`)
}

function riddle() {
    cmd(`<table>
<tr><td><input class="platinum" type="button" value=" Platinum " onclick="send('P');"></td></tr>
<tr><td><input class="gold" type="button" value="   Gold   " onclick="send('G');"></td></tr>
<tr><td><input class="silver" type="button" value="  Silver  " onclick="send('S');"></td></tr>
<tr><td><input class="copper" type="button" value="  Copper  " onclick="send('C');"></td></tr>
</table>`)
    nme(`<img src="images/riddle.jpg" />`, 'zoomInUp')
}

function shipyard() {
    cmd(`<table>
<tr><td><input class="Platinum" type="button" value="Buy" onclick="send('B');"></td><td><input class="Tavern" type="button" value="Fix" onclick="send('F');"></td></tr>
<tr><td><input class="Slate" type="button" value="Cannon" onclick="send('C');"></td><td><input class="Slate" type="button" value="Ram" onclick="send('R');"></td></tr>
<tr><td></td><td>${quit}</td></tr>
</table>`)
    nme(`<img src="images/naval/shipyard.png" />`, 'swing')
}

function square() {
    cmd(`<table>
<tr><td><input type="button" value="Pick pockets" onclick="send('P');"></td><td><input type="button" value="Jail" onclick="send('J');"></tr>
<tr><td><input class="Tavern" type="button" value="Real Estate" onclick="send('R');"></td><td><input class="Slate" type="button" value="Armoury" onclick="send('A');"></td></tr>
<tr><td><input class="Tavern" type="button" value="Security" onclick="send('S');"></td><td><input class="Slate" type="button" value="Apothecary" onclick="send('V');"></td></tr>
<tr><td><input class="Platinum" type="button" value="Mage" onclick="send('M');"></td><td><input class="Slate" type="button" value="Weapon" onclick="send('W');"></td></tr>
<tr><td colspan=2><hr></td></tr>
<tr><td><input class="Slate" type="button" value="Bank" onclick="send('B');"></td><td><input class="Silver" type="button" value="Hospital" onclick="send('H');"></td></tr>
<tr><td><input class="Copper" type="button" value="ARENA" onclick="send('G');"></td><td>${quit}</td></tr>
</table>`)
}

function tavern() {
    cmd(`<table>
<tr><td><input type="button" value="Swear" onclick="send('S');"></td><td><input type="button" value="List" onclick="send('L');"></td><td><input type="button" value="Post" onclick="send('P');"></td></tr>
<tr><td><input class="Slate" type="button" value="Old" onclick="send('Y');"></td><td><input class="Gold" type="button" value="Guzzle" onclick="send('G');"></td><td><input class="Slate" type="button" value="News" onclick="send('T');"></td></tr>
<tr><td><input type="button" value="Argue" onclick="send('J');"></td><td colspan=2><input class="Platinum" type="button" value="Eavesdrop" onclick="send('E');"></td></tr>
<tr><td colspan=2><input class="Tavern" type="button" value="Brawl" onclick="send('B');"></td><td>${quit}</td></tr>
</table>`)
}

function teleport() {
    cmd(`<table>
<tr><td colspan=2><input class="Silver" type="button" value="Up" onclick="send('U');"></td></tr>
<tr><td><input class="Copper" type="button" id="default" value="Random" onclick="send('R');"></td><td><input class="Slate" type="button" id="cancel" value="Out" onclick="send('O');"></td></tr>
<tr><td colspan=2><input class="Platinum" type="button" value="Down" onclick="send('D');"></td></tr>
</table>`)
}

function wager() {
    cmd(`${money}`)
    nme(`<img src="images/wager.jpg" />`, 'pulse')
}

function well() {
    cmd(`<table>
<tr><td><input class="Tavern" type="button" value="Key" onclick="send('K');"></td><td><input class="Slate" type="button" value="Destroy Dungeon" onclick="send('D');"></td></tr>
<tr><td><input class="Gold" type="button" value="Loot" onclick="send('L');"></td><td><input class="Silver" type="button" value="Grant" onclick="send('G');"></td></tr>
<tr><td><input class="Slate" type="button" value="Resurrect" onclick="send('R');"></td><td><input class="Platinum" type="button" value="Teleport" onclick="send('T');"></td></tr>
<tr><td><input class="Silver" type="button" id="cancel" value="Fix" onclick="send('F');"></td><td><input class="Slate" type="button" value="Out" onclick="send('O');"></td></tr>
<tr><td><input class="Slate" type="button" value="Curse" onclick="send('C');"></td><td><input class="Gold" type="button" id="default" value="Bless" onclick="send('B');"></td></tr>
</table>`)
    nme(`<img src="images/well.jpg" />`, 'fadeIn')
}

function welcome() {
    Logoff()
    nmeResize('jackInTheBox')
}

//  start here
if (window.addEventListener) window.addEventListener("message", receive, false)
newSession('Logoff')
