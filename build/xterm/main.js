var carrier = false;
var cols = 80, rows = 25;
var terminalContainer = document.getElementById('terminal'),
    term = new Terminal({ cursorBlink:true, rows:rows, cols:cols, scrollback:200 }),
    socket,
    termid;

term.open(terminalContainer, true);
term.focus();
term.fit();
newSession();

function newSession() {

  var parts = document.location.pathname.split('/')
    , base = parts.slice(0, parts.length - 1).join('/') + '/'
    , resource = base.substring(1) + 'socket.io';

  term.writeln('\x1B[36mWelcome to \x1B[1mDank Domain\x1B[22m!');
  term.write('\x1B[34mConnecting to terminal WebSocket ... ');
   
  socket = io.connect(null, { resource: resource });
  socket.emit('create', cols, rows, function(err, data) {
    if (err) return self._destroy();
    self.pty = data.pty;
    self.id = data.id;
    termid = self.id;
    carrier = true;
    term.emit('open tab', self);
  });
}

// let's have a nice value for both the player and the web server
function checkCarrier() {
  if(++checkCarrier.timeout == 10)
    socket.disconnect();
  else
    term.write('.');
}

term.on('data', function(data) {
  if (carrier)
    socket.emit('data', termid, data);
  else {
    if (data === '\x0D' || data === ' ') {
      if (typeof tuneSource !== 'undefined') tuneSource.stop();
      term.writeln('\nAttempt to reconnect');
      newSession();
      window.frames['Action'].postMessage({ 'func':'logon' }, location.href);
      window.frames['Profile'].postMessage({ 'func':'logon' }, location.href);
    }
  }
});

term.on('resize', function(data) {
  socket.emit('resize', termid, term.cols, term.rows);
});

socket.on('connect', function() {
  carrier = true;
  if (typeof checkCarrier.timer !== 'undefined')
    clearInterval(checkCarrier.timer);
  checkCarrier.timeout = 0;
    
  term.writeln('\x1B[m');
  window.frames['Action'].postMessage({ 'func':'logon' }, location.href);
  window.frames['Profile'].postMessage({ 'func':'logon' }, location.href);
});

socket.on('disconnect', function() {
  if (typeof tuneSource !== 'undefined') tuneSource.stop();
  carrier = false;
  clearInterval(checkCarrier.timer);
  terminalContainer.hidden = true;
});

socket.on('kill', function() {
  carrier = false;
  checkCarrier.timeout = 0;
  checkCarrier.timer = setInterval(checkCarrier, 12000);
  window.frames['Action'].postMessage({ 'func':'clear' }, location.href);
  window.frames['Profile'].postMessage({ 'func':'logoff' }, location.href);
});

socket.on('data', function(id, data) {
  // find any occurrences of @func(data), and for each: call func(data)
  const re = '[@](?:(action|play|tune)[(](.+?)[)])';
  search = new RegExp(re, 'g'); replace = new RegExp(re);
  copy = data;
  while (match = search.exec(copy)) {
    x = replace.exec(data);
    s = x.index; e = s + x[0].length;
    data = data.substr(0, s) + data.substr(e);
    window[match[1]](match[2]);
  }
  term.write(data);
});

function action(menu) {
  window.frames['Action'].postMessage({ 'func':menu }, location.href);
}

function play(fileName) {
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
}

function profile(panel) {
  window.frames['Profile'].postMessage({ 'func':panel }, location.href);
}

function tune(fileName) {
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
}
