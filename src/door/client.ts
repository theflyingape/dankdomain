/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  DOOR authored by: Robert Hurst <theflyingape@gmail.com>                  *
\*****************************************************************************/

//	CLIENT start
//	https://webserver/xterm/door

//	REST API
//	https://webserver/xterm/door/player
//	https://webserver/xterm/door/lurker
//	params: /:pid
//	params: /size?cols=:cols&rows=:rows

import { Terminal, ITerminalOptions } from 'xterm'
import * as fit from 'xterm/lib/addons/fit/fit'

let term: Terminal
let cols = 80, rows = 24
let options: ITerminalOptions = {
	cursorBlink: false, enableBold: true, cols: cols, rows: rows, scrollback: 480,
	fontFamily: 'Consolas,Lucida Console,monospace', fontSize: 18,
	theme: {
		foreground: '#c1c2c8', background: '#010208',
		black: '#000000', red: '#a00000', green: '#00a000', yellow: '#c8a000',
		blue: '#0000a0', magenta: '#a000a0', cyan: '#00a0a0', white: '#c8c8c8',
		brightBlack: '#646464', brightRed: '#fa0000', brightGreen: '#00fa00', brightYellow: '#fafa00',
		brightBlue: '#0000fa', brightMagenta: '#fa00fa', brightCyan: '#00fafa', brightWhite: '#fafafa'
	}
}

const app = location.pathname.replace(/\/+$/, "")
let pid = 0, wpid = 0
let socket
let carrier = false, recheck = 0
let reconnect: NodeJS.Timer, lurking: NodeJS.Timer

if (window.addEventListener)
	window.addEventListener("message", receive, false)
else {
	if (window.attachEvent)
		window.attachEvent("onmessage", receive, false)
}

window.onresize = () => {
	if (!pid) return

	let t: CSSStyleRule
	let I: CSSStyleRule
	let stylesheet = document.styleSheets[0]
	for (let i in stylesheet.cssRules) {
		let css = stylesheet.cssRules[i]
		if (css.selectorText === '#terminal')
			t = css
		if (css.selectorText === '#Info')
			I = css
	}

	Object.assign(t.style, { 'top': '0%', 'height': '100%', 'width': '70%' })
	Object.assign(I.style, { 'top': '0%', 'height': '100%', 'width': '30%' })

	//  client has a targeted ROWSxCOLS goal, adjust terminal within browser window
	let fontSize = term.getOption('fontSize')
	let xy = fit.proposeGeometry(term)

	//  possibly expand side panel without compromising terminal width
	let w = '29'
	let v = w
	do {
		w = (parseInt(w) + 1) + '%'
		v = (100 - parseInt(w)) + '%'
		Object.assign(t.style, { 'top': '0%', 'height': '100%', 'width': v })
		Object.assign(I.style, { 'top': '0%', 'height': '100%', 'width': w })
		xy = fit.proposeGeometry(term)
	} while (xy.cols > 81 && parseInt(w) < 40)

	//  possibly upsize font until it fits targeted size
	while ((xy = fit.proposeGeometry(term)).rows > 25 && xy.cols > 80) {
		term.setOption('fontSize', ++fontSize)
	}

	//  possibly shrink font until it fits targeted size
	while (fontSize > 8 && ((xy = fit.proposeGeometry(term)).cols < 80 || xy.rows < 25)) {
		term.setOption('fontSize', --fontSize)
	}

	//  make it stick
	cols = 80
	rows = xy.rows
	term.resize(cols, rows)

	//	tweak window widths inside the browser
	Object.assign(t.style, { 'top': '0%', 'height': '100%', 'width': (term.renderer.dimensions.actualCellWidth * cols) + 'px' })
	Object.assign(I.style, { 'top': '0%', 'height': '100%', 'width': (window.innerWidth - (term.renderer.dimensions.actualCellWidth * cols)) + 'px' })
}

document.getElementById('lurker-list').onchange = () => {
	let watch = <HTMLOptionsCollection>document.getElementById('lurker-list')
	wpid = parseInt(watch[watch.selectedIndex].value)

	let stylesheet = document.styleSheets[0]
	for (let i in stylesheet.cssRules) {
		let css = stylesheet.cssRules[i]
		if (css.selectorText === '#terminal')
			Object.assign(css.style, { 'top': '0%', 'left': '0%', 'height': '100%', 'width': '100%' })
	}

	document.getElementById('terminal').hidden = false;
	term = new Terminal({
		cursorBlink: false, enableBold: true, scrollback: 0,
		fontFamily: 'Consolas,Lucida Console,monospace', fontSize: 16, theme: {
			foreground: '#c1c2c8', background: '#040820',
			black: '#000000', red: '#a00000', green: '#00a000', yellow: '#c8a000',
			blue: '#0000a0', magenta: '#a000a0', cyan: '#00a0a0', white: '#c8c8c8',
			brightBlack: '#646464', brightRed: '#ff0000', brightGreen: '#00ff00', brightYellow: '#ffff00',
			brightBlue: '#0000ff', brightMagenta: '#ff00ff', brightCyan: '#00ffff', brightWhite: '#ffffff'
		}
	})
	Terminal.applyAddon(fit)

	term.open(document.getElementById('terminal'))
	fit.fit(term)

	term.write('\x1B[H\x1B[J\x1B[1;30mConnecting your terminal to ' + watch[watch.selectedIndex].text + ' WebSocket ... ')
	let protocol = (location.protocol === 'https:') ? 'wss://' : 'ws://'
	let socketURL = protocol + location.hostname + ((location.port) ? (':' + location.port) : '') + app + '/lurker/'

	//	any keystroke sent will signal for this WebSocket to close
	term.on('data', function (data) { socket.send(data)	})

	fetch(`${app}/lurker/?pid=${wpid}`, { method: 'POST' }).then(function (res) {
		res.text().then(function (lurker) {
			socketURL += lurker
			socket = new WebSocket(socketURL)

			socket.onmessage = (ev) => {
				XT(ev.data)
			}

			socket.onopen = () => {
				term.focus()
				term.writeln('open\x1B[m')
			}

			socket.onclose = (ev) => {
				XT('@tune(.)')
				term.destroy()
				wpid = 0
				document.getElementById('terminal').hidden = true
				lurk()
			}

			socket.onerror = (ev) => {
				term.writeln('\x1B[1;31merror')
			}
		})
	})
}

newSession()


function newSession() {
	carrier = true
	recheck = 0
	if (reconnect) clearInterval(reconnect)

	pid = -1
	term = new Terminal(options)
	Terminal.applyAddon(fit)

	term.open(document.getElementById('terminal'))
	fit.fit(term)

	term.writeln('\x1B[1;31m\uD83D\uDD25  \x1B[36mW\x1B[22melcome to D\x1B[2mank \x1B[22mD\x1B[2momain\x1B[22m \u2728\n')
	term.write(`\x1B[0;2mConnecting terminal WebSocket ... `)
	XT('@tune(dankdomain)')
	window.frames['Info'].postMessage({ 'func':'Logon' }, location.href)

	let protocol = (location.protocol === 'https:') ? 'wss://' : 'ws://'
	let socketURL = protocol + location.hostname + ((location.port) ? (':' + location.port) : '') + app + '/player/'

	term.on('data', function (data) {
		if (carrier) {
			socket.send(data)
		}
		else {
			XT('@tune(.)')
			pid = 0
			term.destroy()
			if (data === '\x0D' || data === ' ')
				newSession()
			else
				window.parent.postMessage({ 'func': 'emit', 'message': '\x1B', 'return': false }, location.href)
		}
	})

	term.on('resize', function (size) {
		let resize = term.getOption('fontSize')
		let style = resize < 15 ? 'S' : resize > 23 ? 'L' : 'M'
		XT(`@action(Size${style})`)

		if (!pid) return
		cols = size.cols
		rows = size.rows
		fetch(`${app}/player/${pid}/size?cols=${cols}&rows=${rows}`, { method: 'POST' })
	})

	term.on('wall', function (msg) {
		if (!pid) return
		let url = `${app}/player/${pid}/wall?msg=${msg}`
		fetch(url, {method: 'POST'})
	  })

	// fit is called within a setTimeout, cols and rows need this
	setTimeout(function () {
		fetch(`${app}/player/?cols=${term.cols}&rows=${term.rows}`, { method: 'POST' }).then(function (res) {
			res.text().then(function (session) {
				pid = parseInt(session)
				socketURL += pid
				socket = new WebSocket(socketURL)

				socket.onmessage = function (ev) {
					XT(ev.data)
				}

				socket.onopen = () => {
					carrier = true
					window.dispatchEvent(new Event('resize'))
					term.focus()
					if (!term.getOption('cursorBlink'))
						term.setOption('cursorBlink', true)
					term.writeln('open\x1B[m')
				}

				socket.onclose = (ev) => {
					if (term.getOption('cursorBlink'))
						term.setOption('cursorBlink', false)
					term.writeln('\x1B[0;2mWebSocket close\x1B[m')
					carrier = false
					recheck = 0
					reconnect = setInterval(checkCarrier, 20000)
					window.frames['Info'].postMessage({ 'func': 'Logoff' }, location.href)
				}

				socket.onerror = (ev) => {
					term.writeln('\x1B[1;31merror\x1B[m')
					carrier = false
				}
			})
		})
	}, 0)
}

// let's have a nice value for both the player and the web server
function checkCarrier() {
	if (++recheck < 10)
		term.write('.')
	else {
		carrier = false
		clearInterval(reconnect)
		document.getElementById('terminal').hidden = true
		document.getElementById('wall').hidden = false
		let iframes = document.querySelectorAll('iframe')
		for (let i = 0; i < iframes.length; i++)
			iframes[i].parentNode.removeChild(iframes[i])
		lurk()
		lurking = setInterval(lurk, 30000)
	}
}

function XT(data) {
	let copy = data + ''
	// find any occurrences of @func(data), and for each: call func(data)
	const re = '[@](?:(action|profile|play|tune|wall)[(](.+?)[)])'
	let search = new RegExp(re, 'g'); let replace = new RegExp(re)
	let match: RegExpMatchArray
	while (match = search.exec(copy)) {
		let x = replace.exec(data)
		let s = x.index, e = s + x[0].length
		data = data.substr(0, s) + data.substr(e)
		eval(`${match[1]}(match[2])`)
	}
	term.write(data)

	function action(menu) {
		if (window.frames['Info'])
			window.frames['Info'].postMessage({ 'func': menu }, location.href)
	}

	function play(fileName) {
		let audio = <HTMLAudioElement>document.getElementById('play')
		if (!fileName.length || fileName === '.') {
			audio.pause()
			audio.currentTime = 0
			return
		}
		let source = audio.getElementsByTagName('source')
		source[0].src = `sounds/${fileName}.ogg`
		source[0].type = 'audio/ogg'
		source[1].src = `sounds/${fileName}.mp3`
		source[1].type = 'audio/mp3'
		audio.load()
		audio.play()
	}

	function profile(panel) {
		if (!pid) return
		if (typeof panel === 'string') panel = JSON.parse(panel)
		if (window.frames['Info'])
			window.frames['Info'].postMessage(panel, location.href)
	}

	function tune(fileName) {
		let audio = <HTMLAudioElement>document.getElementById('tune')
		if (!fileName.length || fileName === '.' || !pid) {
			audio.pause()
			audio.currentTime = 0
			return
		}
		let source = audio.getElementsByTagName('source')
		source[0].src = `sounds/${fileName}.ogg`
		source[0].type = 'audio/ogg'
		source[1].src = `sounds/${fileName}.mp3`
		source[1].type = 'audio/mp3'
		audio.load()
		audio.play()
	}

	function wall(msg) {
		term.emit('wall', msg)
	}
}

function receive(event) {
	if (event.data) {
		switch (event.data.func) {
			case 'kb':
				term.focus()
			case 'emit':
				if (!carrier) {
					XT('@tune(.)')
					pid = 0
					term.destroy()
					if (event.data.message == ' ')
						newSession()
					else {
						recheck = 10
						checkCarrier()
					}
					return
				}
				if (event.data.message) {
					socket.send(event.data.message)
					if (event.data.return)
						socket.send('\r')
				}
				else {
					if (event.data.return)
						socket.send('\x0D')
				}
				break
		}
	}
}

function lurk() {
	if (document.getElementById('terminal').hidden) {
		fetch(`${app}/lurker/`, { method: 'POST' }).then(function (res) {
			return res.json().then(function (data) {
				let watch = <HTMLOptionsCollection>document.getElementById('lurker-list')
				for (let i = watch.length - 1; i >= 0; i--)
					watch.remove(i)
				for (let i in data) {
					let option = document.createElement("option")
					option.text = data[i].id
					option.value = data[i].pid
					watch.add(option)
				}
				if (watch.length)
					document.getElementById('lurker-list').blur()
				watch.selectedIndex = -1
			})
		})
	}
}
