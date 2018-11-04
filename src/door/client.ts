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
import * as webLinks from 'xterm/lib/addons/webLinks/webLinks'

let term: Terminal
let cols = 80, rows = 25
const BELL_SOUND = 'data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU='
let cookie = document.cookie || 'tty=0; id=NEW'
let cookies = cookie.split('; ')
let tty: boolean = cookies[0].split('=')[1] ? true : false

const app = location.pathname.replace(/\/+$/, "")
let pid = 0, wpid = 0
let socket: WebSocket
let carrier = false, recheck = 0
let reconnect: NodeJS.Timer, lurking: NodeJS.Timer

if (window.addEventListener)
	window.addEventListener("message", receive, false)
/*	else {
	if (window.attachEvent)
		window.attachEvent("onmessage", receive, false)
}
*/

window.onresize = () => {
	if (!pid) return

	let t: CSSStyleRule
	let I: CSSStyleRule
	let stylesheet = <CSSStyleSheet>document.styleSheets[0]
	for (let i in stylesheet.cssRules) {
		let css: CSSStyleRule = <any>stylesheet.cssRules[i]
		if (css.selectorText === '#terminal')
			t = css
		if (css.selectorText === '#Info')
			I = css
	}

	//  tweak side panel sizing within reason
	Object.assign(t.style, { 'top': '0%', 'height': '100%', 'width': '65%' })
	Object.assign(I.style, { 'top': '0%', 'height': '100%', 'width': '35%' })
	if (pid > 0) term.setOption('fontFamily', tty ? 'tty,Consolas,monospace' : 'IBM Plex Mono,Consolas,monospace')
	term.setOption('fontSize', 20)
	let xy = fit.proposeGeometry(term)
	let w = Math.trunc(parseInt(I.style.width) * (xy.cols || 80) / 80) + '%'
	w = parseInt(w) < 28 ? '28%' : parseInt(w) > 42 ? '42%' : w
	let v = (100 - parseInt(w)) + '%'
	Object.assign(t.style, { 'top': '0%', 'height': '100%', 'width': v })
	Object.assign(I.style, { 'top': '0%', 'height': '100%', 'width': w })
	//	adjust font to fit for standard width
	xy = fit.proposeGeometry(term)
	let fontSize = Math.trunc(20 * (xy.cols || 80) / 80)
	term.setOption('fontSize', fontSize)

	//  and make it stick
	xy = fit.proposeGeometry(term)
	if (xy.cols > 80) {
		v = Math.round(parseInt(v) * 80 / xy.cols) + '%'
		w = (100 - parseInt(v)) + '%'
		Object.assign(t.style, { 'top': '0%', 'height': '100%', 'width': v })
		Object.assign(I.style, { 'top': '0%', 'height': '100%', 'width': w })
	}
	cols = 80
	rows = xy.rows
	term.resize(cols, rows)
	term.scrollToBottom()
}

document.getElementById('lurker-list').onchange = (ev) => {
	let watch: HTMLOptionsCollection = <any>ev.target
	wpid = parseInt(watch[watch.selectedIndex].value)

	let stylesheet = <CSSStyleSheet>document.styleSheets[0]
	for (let i in stylesheet.cssRules) {
		let css: CSSStyleRule = <any>stylesheet.cssRules[i]
		if (css.selectorText === '#terminal')
			Object.assign(css.style, { 'top': '0%', 'left': '0%', 'height': '100%', 'width': '100%' })
	}

	document.getElementById('terminal').hidden = false
	term = new Terminal({
		bellStyle: 'none', cursorBlink: false, scrollback: 0,
		fontFamily: 'Consolas,monospace', fontSize: 20,
		fontWeight: '400', fontWeightBold: '500',
		theme: {
			foreground: '#a3a7af', background: '#23272f', cursor: '#e0c8e0',
			black: '#000000', red: '#a00000', green: '#00a000', yellow: '#c8a000',
			blue: '#0000a0', magenta: '#a000a0', cyan: '#00a0a0', white: '#b0b0b0',
			brightBlack: '#646464', brightRed: '#ff0000', brightGreen: '#00ff00', brightYellow: '#ffff00',
			brightBlue: '#0000ff', brightMagenta: '#ff00ff', brightCyan: '#00ffff', brightWhite: '#ffffff'
		}
	})
	Terminal.applyAddon(fit)
	Terminal.applyAddon(webLinks)
	term.open(document.getElementById('terminal'))
	webLinks.webLinksInit(term)
	fit.fit(term)

	term.write('\n\x1B[1;34mConnecting your terminal to ' + watch[watch.selectedIndex].text + ' WebSocket ... ')
	let protocol = (location.protocol === 'https:') ? 'wss://' : 'ws://'
	let socketURL = protocol + location.hostname + ((location.port) ? (':' + location.port) : '') + app + '/lurker/'

	//	any keystroke sent will signal for this WebSocket to close
	term.on('data', function (data) { socket.send(data)	})

	fetch(`${app}/lurker/?pid=${wpid}`, { method: 'POST' }).then(function (res) {
		res.text().then(function (lurker) {
			socketURL += `?lurker=${lurker}`
			socket = new WebSocket(socketURL)

			socket.onmessage = (ev) => {
				XT(ev.data)
			}

			socket.onopen = () => {
				//term.focus()
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

newSession('Logoff')


function newSession(ev) {
	const options: ITerminalOptions = {
		bellSound: BELL_SOUND, bellStyle: 'sound', cursorBlink: false, drawBoldTextInBrightColors: true,
		cols: cols, rows: rows, scrollback: 500,
		fontFamily: 'IBM Plex Mono,Consolas,monospace', fontSize: 20,
		fontWeight: '400', fontWeightBold: '500',
		theme: {
			foreground: '#a8a8a8', background: '#020408', cursor: '#a0c8f0',
			black: '#000000', red: '#a80000', green: '#00a800', yellow: '#c8a800',
			blue: '#0000a8', magenta: '#a800a8', cyan: '#00a8a8', white: '#a8a8b0',
			brightBlack: '#666666', brightRed: '#fb0b0b', brightGreen: '#0bfb0b', brightYellow: '#fbfb0b',
			brightBlue: '#0b0bfb', brightMagenta: '#fb0bfb', brightCyan: '#0bfbfb', brightWhite: '#fbfbfb'
		}
	}

	carrier = (ev === 'Logon')
	recheck = 0
	if (lurking) clearInterval(lurking)
	if (reconnect) clearInterval(reconnect)

	pid = -1
	term = new Terminal(options)
	Terminal.applyAddon(fit)
	Terminal.applyAddon(webLinks)
	term.open(document.getElementById('terminal'))
	webLinks.webLinksInit(term)
	fit.fit(term)

	term.writeln('\x1B[16C\x1B[1;31m🔥\x1B[2C🌨\x1B[2C \x1B[36mW\x1B[22melcome to D\x1B[2mank \x1B[22mD\x1B[2momain\x1B[2C\x1B[m🌙\x1B[2C💫\x07')
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
			if (data === '\r' || data === ' ')
				newSession('Logon')
			else
				window.parent.postMessage({ 'func': 'emit', 'message': '\x1B', 'return': false }, location.href)
		}
	})

	term.on('resize', function (size) {
		XT('@action(reSize)')
		if (pid < 1) return
		cols = size.cols
		rows = size.rows
		fetch(`${app}/player/${pid}/size?cols=${cols}&rows=${rows}`, { method: 'POST' })
	})

	term.on('selection', function () {
		let nme = term.getSelection()
		term.clearSelection()
		if (carrier)
			if (nme.length > 1 && nme.length < 5)
				socket.send(nme + '\x0D')
	})

	term.on('wall', function (msg) {
		if (!pid) return
		let url = `${app}/player/${pid}/wall?msg=${msg}`
		fetch(url, {method: 'POST'})
	  })

	// fit is called within a setTimeout, cols and rows need this
	if (ev === 'Logon')	setImmediate(() => {
		term.setOption('fontFamily', tty ? 'tty,Consolas,monospace' : 'IBM Plex Mono,Consolas,monospace')
		window.dispatchEvent(new Event('resize'))
		term.focus()
		term.write(`\n\x1B[0;2mConnecting terminal WebSocket ... `)
		XT('@tune(dankdomain)')
		fetch(`${app}/player/?cols=${term.cols}&rows=${term.rows}`, { method: 'POST' }).then(function (res) {
			res.text().then(function (session) {
				pid = parseInt(session)
				socketURL += `?pid=${pid}`
				socket = new WebSocket(socketURL)

				socket.onmessage = function (ev) {
					XT(ev.data)
				}

				socket.onopen = () => {
					carrier = true
					window.dispatchEvent(new Event('resize'))
					if (!term.getOption('cursorBlink'))
						term.setOption('cursorBlink', true)
					term.writeln('open\x1B[m')
					XT('@action(Logon)')
				}

				socket.onclose = (ev) => {
					if (term.getOption('cursorBlink'))
						term.setOption('cursorBlink', false)
					term.writeln('\x1B[0;2mWebSocket close\x1B[m')
					carrier = false
					recheck = 0
					reconnect = setInterval(checkCarrier, 20000)
					XT('@action(Logoff)')
				}

				socket.onerror = (ev) => {
					term.writeln('\x1B[1;31merror\x1B[m')
					carrier = false
				}
			})
		})
	})
	else {
		fetch(`${app}/title.txt`, { method: 'GET' }).then(function (res) {
			return res.text().then(function (data) {
				term.writeln(data)
				term.writeln(' \x1B[36m\u00B7\x1B[2m press either \x1B[22mENTER\x1B[2m or \x1B[22mSPACE\x1B[2m to connect;\x1B[22m')
				term.writeln(' \x1B[36m\u00B7\x1B[2m or any other \x1B[22;1m🗝️  \x1B[22mkey\x1B[2m for more options.')
				XT('@action(Logoff)')
			})
		})
		term.focus()
	}
	// gratuituous
	window.dispatchEvent(new Event('resize'))
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
	const re = '[@](?:(action|animated|profile|play|tune|wall)[(](.+?)[)])'
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
			window.frames['Info'].postMessage({ 'func': menu, 'fontSize':term.getOption('fontSize') }, location.href)
	}

	function animated(effect) {
		if (window.frames['Info'])
			window.frames['Info'].postMessage({ 'anim': effect}, location.href)
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
			case 'emit':
				if (!carrier) {
					XT('@tune(.)')
					pid = 0
					term.destroy()
					if (event.data.message == ' ')
						newSession('Logon')
					else {
						recheck = 10
						checkCarrier()
					}
					return
				}
				if (event.data.message) {
					if (event.data.message == 'F2') {
						setImmediate(() => {
							term.setOption('fontFamily', tty ? 'tty,Consolas,monospace' : 'IBM Plex Mono,Consolas,monospace')
							window.dispatchEvent(new Event('resize'))
						})
						tty = !tty
						window.dispatchEvent(new Event('resize'))
					}
					else
						socket.send(event.data.message)
				//	if (event.data.return)
				//		socket.send('\r')
				}
				//else {
					if (event.data.return)
						socket.send('\r')
				//}
				break
		}
	}
}

function lurk() {
	if (document.getElementById('terminal').hidden) {
		fetch(`${app}/lurker/`, { method: 'POST' }).then(function (res) {
			return res.json().then(function (data) {
				let el = document.getElementById('lurker-list')
				let watch: HTMLOptionsCollection = <any>el
				for (let i = watch.length - 1; i >= 0; i--)
					watch.remove(i)
				for (let i in data) {
					let option = document.createElement("option")
					option.text = data[i].id
					option.value = data[i].pid
					watch.add(option)
				}
				if (watch.length) {
					el.blur()
					let audio = <HTMLAudioElement>document.getElementById('play')
					audio.src = BELL_SOUND
					audio.play()
				}
				watch.selectedIndex = -1
			})
		})
	}
}
