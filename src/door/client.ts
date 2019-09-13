/*****************************************************************************\
 *  Dank Domain: the return of Hack & Slash                                  *
 *  DOOR authored by: Robert Hurst <theflyingape@gmail.com>                  *
\*****************************************************************************/

//	CLIENT start
//	https://webserver/xterm/door/

//	REST API
//	https://webserver/xterm/door/player/
//	https://webserver/xterm/door/lurker/
//	params: :pid
//	params: size?cols=:cols&rows=:rows

import { Terminal, ITerminalOptions } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { WebfontLoader } from 'xterm-webfont'

let term: Terminal
let cols = 80, rows = 25
const BELL_SOUND = 'data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU='
const app = location.pathname.replace(/\/+$/, "")
const fit = new FitAddon()

let pid = 0, wpid = 0, tty = false
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
		if (css.selectorText == '#terminal')
			t = css
		if (css.selectorText == '#Info')
			I = css
	}

	//  tweak side panel sizing within reason
	Object.assign(t.style, { 'top': '0%', 'height': '100%', 'width': '70%' })
	Object.assign(I.style, { 'top': '0%', 'height': '100%', 'width': '30%' })
	term.setOption('fontSize', 24)
	let xy = fit.proposeDimensions()
	let w = Math.trunc(parseInt(I.style.width) * (xy.cols || 80) / 80) + '%'
	w = parseInt(w) < 26 ? '26%' : parseInt(w) > 34 ? '34%' : w
	let v = (100 - parseInt(w)) + '%'
	Object.assign(t.style, { 'top': '0%', 'height': '100%', 'width': v })
	Object.assign(I.style, { 'top': '0%', 'height': '100%', 'width': w })
	//	adjust font to fit for standard width
	xy = fit.proposeDimensions()
	let fontSize = Math.trunc(24 * (xy.cols || 80) / 80)
	term.setOption('fontSize', fontSize)

	//  and make it stick
	xy = fit.proposeDimensions()
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
		if (css.selectorText == '#terminal')
			Object.assign(css.style, { 'top': '0%', 'left': '0%', 'height': '100%', 'width': '100%' })
	}

	document.getElementById('terminal').hidden = false
	term = new Terminal({
		bellStyle: 'none', cursorBlink: false, scrollback: 0,
		fontFamily: 'tty,Consolas,monospace', fontSize: 22,
		fontWeight: '400', fontWeightBold: '500',
		theme: {
			foreground: '#a3a7af', background: '#23272f', cursor: '#e0c8e0',
			black: '#000000', red: '#a00000', green: '#00a000', yellow: '#c8a000',
			blue: '#0000a0', magenta: '#a000a0', cyan: '#00a0a0', white: '#b0b0b0',
			brightBlack: '#646464', brightRed: '#ff0000', brightGreen: '#00ff00', brightYellow: '#ffff00',
			brightBlue: '#0000ff', brightMagenta: '#ff00ff', brightCyan: '#00ffff', brightWhite: '#ffffff'
		}
	})
	term.loadAddon(new WebfontLoader())
	term.loadAddon(new WebLinksAddon())
	term.loadAddon(fit)
	term.open(document.getElementById('terminal'))
	fit.fit()

	term.write('\n\x1B[1;34mConnecting your terminal to ' + watch[watch.selectedIndex].text + ' WebSocket ... ')
	let protocol = (location.protocol == 'https:') ? 'wss://' : 'ws://'
	let socketURL = protocol + location.hostname + ((location.port) ? (':' + location.port) : '') + app + '/lurker/'

	//	any keystroke sent will signal for this WebSocket to close
	term.onData(data => { socket.send(data)	})

	fetch(`${app}/lurker/?pid=${wpid}`, { method: 'POST' }).then(function (res) {
		res.text().then(function (lurker) {
			socketURL += `?lurker=${lurker}`
			socket = new WebSocket(socketURL)

			socket.onmessage = (ev) => {
				XT(ev.data)
			}

			socket.onopen = () => {
				term.writeln('open\x1B[m')
			}

			socket.onclose = (ev) => {
				XT('@tune(.)')
				term.dispose()
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
	const protocol = (location.protocol == 'https:') ? 'wss://' : 'ws://'
	let socketURL = protocol + location.hostname + ((location.port) ? (':' + location.port) : '') + app + '/player/'
	const options: ITerminalOptions = {
		bellSound: BELL_SOUND, bellStyle: 'sound', cursorBlink: false, drawBoldTextInBrightColors: true,
		cols: cols, rows: rows, scrollback: 500,
		fontFamily: 'tty,Consolas,monospace', fontSize: 24, fontWeight: '400', fontWeightBold: '500',
		theme: {
			foreground: 'Silver', background: 'Black', cursor: 'PowderBlue',
			black: 'Black', red: 'DarkRed', green: 'ForestGreen', yellow: 'SandyBrown',
			blue: 'MediumBlue', magenta: 'MediumOrchid', cyan: 'DarkCyan', white: 'Silver',
			brightBlack: 'DimGray', brightRed: 'Red', brightGreen: 'LightGreen', brightYellow: 'Gold',
			brightBlue: 'RoyalBlue', brightMagenta: 'Violet', brightCyan: 'Cyan', brightWhite: 'Snow'
		}
	}

	carrier = (ev == 'Logon')
	recheck = 0
	if (lurking) clearInterval(lurking)
	if (reconnect) clearInterval(reconnect)

	pid = -1
	term = new Terminal(options)
	if (carrier) term.setOption('fontFamily', 'IBM Plex Mono,Consolas,monospace')

	term.loadAddon(new WebLinksAddon())
	term.loadAddon(fit)

	term.onData(data => {
		if (carrier) {
			socket.send(data)
		}
		else {
			XT('@tune(.)')
			pid = 0
			term.dispose()
			if (data == '\r' || data == ' ') {
				tty = true
				newSession('Logon')
			}
			else {
				tty = false
				window.parent.postMessage({ 'func': 'emit', 'message': '\x1B', 'return': false }, location.href)
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
			let nme = term.getSelection()
			term.clearSelection()
			if (nme.length > 1 && nme.length < 5)
				socket.send(nme + '\x0D')
		}
	})

	//	light it up, Bert!
	term.open(document.getElementById('terminal'))
	fit.fit()
	window.dispatchEvent(new Event('resize'))	// gratuituous

	term.writeln('\x07\x1B[16C🔥  🌨   \x1B[1;36mW\x1B[22melcome to D\x1B[2mank \x1B[22mD\x1B[2momain \x1B[m🌙  💫')

	if (ev == 'Logon')	{
		term.write(`\n\x1B[0;2mConnecting terminal WebSocket ... `)
		XT('@tune(dankdomain)')
		pid = 0
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
					term.writeln('open\x1B[m')
					if (!term.getOption('cursorBlink')) {
						term.focus()
						term.setOption('cursorBlink', true)
					}
					if (!tty)
						term.blur()
					XT('@action(Logon)')
				}

				socket.onclose = (ev) => {
					if (term.getOption('cursorBlink'))
						term.setOption('cursorBlink', false)
					term.writeln('\x1B[0;2mWebSocket close\x1B[m')
					XT('@action(Logoff)')
					carrier = false
					recheck = 0
					reconnect = setInterval(checkCarrier, 20000)
					tty = false
				}

				socket.onerror = (ev) => {
					term.writeln('\x1B[1;31merror\x1B[m\r\nNO DIALTONE\r\n')
					console.log(ev)
					carrier = false
				}
			})
		})
	}
	else {
		fetch(`${app}/title.txt`, { method: 'GET' }).then(function (res) {
			return res.text().then(function (data) {
				term.focus()
				term.write(data)
				const app = location.pathname.replace(/info.html$/, "")
				fetch(`${app}player/`, { method: 'GET' }).then(function (res) {
					res.json().then(function (knock) {
					setTimeout(() => {
						term.focus()
						term.writeln(knock.wall)
						term.writeln(' \x1B[1;36m\u00B7\x1B[22;2m press either \x1B[22mENTER\x1B[2m or \x1B[22mSPACE\x1B[2m to \x1b[22;35mCONNECT\x1b[2;36m using a keyboard\x1B[22m')
						XT(`@play(${['demon','demogorgon','portal','thief2'][Math.trunc(4*Math.random())]})`)
						XT('@action(welcome)')
						term.blur()
						window.frames['Info'].focus()
						window.frames['Info'].postMessage({ images: knock.list }, location.href)
					}, 500)
					})
				})
			})
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
		XT('@action(clear)')
		XT('@play(invite)')
		if (pid) {
			term.dispose()
			pid = 0
		}
		document.getElementById('terminal').hidden = true
		document.getElementById('wall').hidden = false
		let iframes = document.querySelectorAll('iframe')
		for (let i = 0; i < iframes.length; i++) {
			iframes[i].hidden = true
			iframes[i].src = ''
		}
		//iframes[i].parentNode.removeChild(iframes[i])
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
		if (window.frames['Info'])
			window.frames['Info'].postMessage({ 'func': menu, 'fontSize':term.getOption('fontSize') }, location.href)
	}

	function animated(effect) {
		if (window.frames['Info'])
			window.frames['Info'].postMessage({ 'anim': effect}, location.href)
	}

	function play(fileName) {
		let audio = <HTMLAudioElement>document.getElementById('play')
		if (!fileName.length || fileName == '.') {
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
		if (typeof panel == 'string') panel = JSON.parse(panel)
		if (window.frames['Info'])
			window.frames['Info'].postMessage(panel, location.href)
	}

	function title(name) {
		document.title = name
	}

	function tune(fileName) {
		let audio = <HTMLAudioElement>document.getElementById('tune')
		if (!fileName.length || fileName == '.') {
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
		if (!pid) return
		let url = `${app}/player/${pid}/wall?msg=${msg}`
		fetch(url, {method: 'POST'})
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
