var carrier = false, recheck = 0, reconnect;
var cols = 80, rows = 25;
var terminalContainer = document.getElementById('terminal-container'),
    term,
    protocol,
    socketURL,
    socket,
    pid;

newSession();

function newSession() {

  carrier = true;
  recheck = 0;
  tune('dankdomain');

  term = new Terminal({ cursorBlink:false, rows:rows, cols:cols, enableBold:true, scrollback:250,
    fontFamily:'DejaVu Sans Mono',
    foreground:'#b2b4b8', background:'#000102',
    black:'#000000', red:'#a0000', green:'#00a000', yellow:'#c8a000',
    blue:'#0000c0', magenta:'#a000a0', cyan:'#00a0a0', white:'#b1b2b4',
    brightBlack:'#808080', brightRed:'#f0000', brightGreen:'#00f000', brightYellow:'#f0f000',
    brightBlue:'#0000f0', brightMagenta:'#f000f0', brightCyan:'#00ffff', brightWhite:'#f0f0f0'
  });

  term.writeln('\x1B[1;36mW\x1B[22melcome to D\x1b[2mank \x1b[22mD\x1b[2momain\x1B[22m\n');
  term.write('\x1B[34mConnecting terminal WebSocket ... ');

  protocol = (location.protocol === 'https:') ? 'wss://' : 'ws://';
  socketURL = protocol + location.hostname + ((location.port) ? (':' + location.port) : '') + '/terminals/';
  term.open(terminalContainer);
  term.fit();
  term.winptyCompatInit();
  term.focus();
  if (!term.getOption('cursorBlink'))
    term.setOption('cursorBlink', true);

  term.on('data', function(data) {
    if (carrier) {
      socket.send(data);
    }
    else {
      if (data === '\x0D' || data === ' ') {
        if (typeof tuneSource !== 'undefined') tuneSource.stop();
        if (reconnect) clearInterval(reconnect);
        term.destroy();
        newSession();
      }
    }
  });

  term.on('resize', function (size) {
    if (!pid)
      return;

    var cols = size.cols,
        rows = size.rows,
        url = '/terminals/' + pid + '/size?cols=' + cols + '&rows=' + rows;

    fetch(url, {method: 'POST'});
  });

  // fit is called within a setTimeout, cols and rows need this.
  setTimeout(function () {

    fetch('/terminals/?cols=' + term.cols + '&rows=' + term.rows, {method: 'POST'}).then(function (res) {

      res.text().then(function (pid) {
        window.pid = pid;
        socketURL += pid;
        socket = new WebSocket(socketURL);

        socket.onmessage = (ev) => {
          // find any occurrences of @func(data), and for each: call func(data)
          const re = '[@](?:(action|profile|play|tune)[(](.+?)[)])';
          search = new RegExp(re, 'g'); replace = new RegExp(re);
          data = ev.data;
          copy = data;
          while (match = search.exec(copy)) {
            x = replace.exec(data);
            s = x.index; e = s + x[0].length;
            data = data.substr(0, s) + data.substr(e);
            window[match[1]](match[2]);
          }
          term.write(data);
        };

        socket.onopen = () => {
          term.socket = socket;
          term.writeln('open\x1B[m');
          carrier = true;
          window.frames['Info'].postMessage({ 'func':'Logon' }, location.href);
        };

        socket.onclose = (ev) => {
          carrier = false;
          recheck = 0;
          reconnect = setInterval(checkCarrier, 15000);
          window.frames['Info'].postMessage({ 'func':'Logoff' }, location.href);
        };

        socket.onerror = (ev) => {
          term.writeln('\x1B[1;31merror');
          carrier = false;
        };
      });
    });
  }, 0);
}

// let's have a nice value for both the player and the web server
function checkCarrier() {
  if(++recheck < 10)
    term.write('.');
  else {
    carrier = false;
    clearInterval(reconnect);
    terminalContainer.hidden = true;
    document.getElementById('idle-container').hidden = false;
    if (typeof tuneSource !== 'undefined') tuneSource.stop();
    tune('');
    var iframes = document.querySelectorAll('iframe');
    for (var i = 0; i < iframes.length; i++)
        iframes[i].parentNode.removeChild(iframes[i]);
  }
}

function action(menu) {
  window.frames['Info'].postMessage({ 'func':menu }, location.href);
}

function play(fileName) {
  audio = document.getElementById('play');
  if (!fileName.length) {
    audio.pause();
    audio.currentTime = 0;
    return;
  }
  source = audio.getElementsByTagName('source');
  source[0].src = 'sounds/' + fileName + '.ogg';
  source[0].type = 'audio/ogg';
  source[1].src = 'sounds/' + fileName + '.mp3';
  source[1].type = 'audio/mp3';
  audio.load();
  audio.play();
/*
  // sound effect
  if (typeof playSource !== 'undefined') playSource.stop();
  if (fileName !== '.') {
    const playContext = new AudioContext();
    window.fetch('sounds/' + fileName + '.ogg')
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => playContext.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        playSource = playContext.createBufferSource();
        playSource.buffer = audioBuffer;
        playSource.connect(playContext.destination);
        playSource.start();
      });
    }
*/
}

function profile(panel) {
  if (typeof panel === 'string') panel = JSON.parse(panel);
  window.frames['Info'].postMessage(panel, location.href);
}

function tune(fileName) {
  audio = document.getElementById('tune');
  if (!fileName.length) {
    audio.pause();
    audio.currentTime = 0;
    return;
  }
  source = audio.getElementsByTagName('source');
  source[0].src = 'sounds/' + fileName + '.ogg';
  source[0].type = 'audio/ogg';
  source[1].src = 'sounds/' + fileName + '.mp3';
  source[1].type = 'audio/mp3';
  audio.load();
  audio.play();
/*
  // tune
  if (typeof tuneSource !== 'undefined') tuneSource.stop();
  if (fileName !== '.') {
    const tuneContext = new AudioContext();
    window.fetch('sounds/' + fileName + '.mp3')
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => tuneContext.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        tuneSource = tuneContext.createBufferSource();
        tuneSource.buffer = audioBuffer;
        tuneSource.connect(tuneContext.destination);
        tuneSource.start();
      });
  }
*/
}
