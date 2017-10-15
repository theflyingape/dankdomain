var carrier = false;
var hide = setInterval(checkCarrier, 10000);
var iAction = window.frames['action'];

var cols=80,
    rows=25;

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
 
  socket = io.connect(null, { resource: resource });
  socket.emit('create', cols, rows, function(err, data) {
    if (err) return self._destroy();
    self.pty = data.pty;
    self.id = data.id;
    termid = self.id;
    term.emit('open tab', self);
  });

  term.writeln('\x1B[36mWelcome to \x1B[1mDank Domain\x1B[22m!');
  term.write('\x1B[34mConnecting to terminal WebSocket ... \x1B[m');
  carrier = true;
}

// let's hava a nice value for both the player and the web server
function checkCarrier() {
  if (carrier || typeof checkCarrier.timeout === 'undefined') {
    checkCarrier.timeout = 0;
  }
  else {
    if(++checkCarrier.timeout == 10)
      socket.disconnect();
    else
      term.write('.');
  }
}

term.on('data', function(data) {
  if (carrier)
    socket.emit('data', termid, data);
  else {
    if (data === '\x0D' || data === ' ') {
      if (typeof tuneSource !== 'undefined') tuneSource.stop();
      term.writeln('\nAttempt to reconnect');
      newSession();
      iAction.postMessage({ 'func':'logon' }, '*');
    }
  }
});

term.on('resize', function(data) {
  socket.emit('resize', termid, term.cols, term.rows);
});

socket.on('connect', function() {
  term.writeln('');
  carrier = true;
  iAction.postMessage({ 'func':'logon' }, '*');
});

socket.on('disconnect', function() {
  if (typeof tuneSource !== 'undefined') tuneSource.stop();
  carrier = false;
  terminalContainer.hidden = true;
});

socket.on('kill', function() {
  carrier = false;
  iAction.postMessage({ 'func':'clear' }, '*');
  io.disconnect();
});

socket.on('data', function(id, data) {

  // action buttons
  action = /(@action\(.+?\))/g;
  text = data;
  while (match = action.exec(data)) {
    parts = text.split(match[1]);
    text = parts[0] + parts[1];
    parts = match[1].split(')');
    actionName = parts[0].split('(')[1];
    iAction.postMessage({ 'func':actionName }, '*');
  }
  data = text;

  // sound effect
  sound = /(@play\(.+?\))/g;
  text = data;
  while (match = sound.exec(data)) {
    parts = text.split(match[1]);
    text = parts[0] + parts[1];
    parts = match[1].split(')');
    fileName = parts[0].split('(')[1];
    // Web Audio API
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
  data = text;

  // tune
  sound = /(@tune\(.+?\))/g;
  while (match = sound.exec(data)) {
    parts = text.split(match[1]);
    text = parts[0] + parts[1];
    parts = match[1].split(')');
    fileName =  parts[0].split('(')[1];
    // Web Audio API
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
  data = text;

  term.write(data);
});
