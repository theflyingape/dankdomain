var cols=80,
    rows=25;

var terminalContainer = document.getElementById('terminal'),
    term = new Terminal({ cursorBlink:true, rows:rows, cols:cols }),
    socket,
    termid;

term.open(terminalContainer, true);
term.focus();
term.fit();

if (document.location.pathname) {
  var parts = document.location.pathname.split('/')
    , base = parts.slice(0, parts.length - 1).join('/') + '/'
    , resource = base.substring(1) + 'socket.io';
 
  socket = io.connect(null, { resource: resource });
} else {
  socket = io.connect();
}

term.writeln('\x1B[36mWelcome to \x1B[1mDank Domain\x1B[22m!');
term.write('\x1B[34mConnecting to terminal WebSocket ... \x1B[m');
var source;

socket.emit('create', cols, rows, function(err, data) {
  if (err) return self._destroy();
  self.pty = data.pty;
  self.id = data.id;
  termid = self.id;
  term.emit('open tab', self);
});

term.on('data', function(data) {
  socket.emit('data', termid, data);
});

term.on('resize', function(data) {
  socket.emit('resize', termid, term.cols, term.rows);
});

socket.on('connect', function() {
  term.writeln('');
});

socket.on('data', function(id, data) {

  // sound effect
  if (audio = document.getElementById('audio')) {
    sound = /(@play\(.+?\))/g;
    text = data;
    while (match = sound.exec(data)) {
      audio.pause(); audio.currentTime = 0;
      parts = text.split(match[1]);
      text = parts[0] + parts[1];
      parts = match[1].split(';');
      fileName = parts[0].split('(')[1] + '.ogg';
      document.getElementById('audioSource').src = 'sounds/' + fileName;
      audio.load();
      audio.play();
      while (+parts[1] && (!audio.paused || audio.currentTime));
    }
    data = text;
  }

  // tune
  if (audio = document.getElementById('music')) {
    sound = /(@tune\(.+?\))/g;
    while (match = sound.exec(data)) {
      audio.pause(); audio.currentTime = 0;
      parts = text.split(match[1]);
      text = parts[0] + parts[1];
      parts = match[1].split(')');
      fileName =  parts[0].split('(')[1];
      //playMP3(fileName);
      if (typeof source !== 'undefined') source.stop();
      if (fileName !== '.') {
        let tuneContext = new AudioContext();
        window.fetch('sounds/' + fileName + '.mp3')
          .then(response => response.arrayBuffer())
          .then(arrayBuffer => tuneContext.decodeAudioData(arrayBuffer))
          .then(audioBuffer => {
            source = tuneContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(tuneContext.destination);
            source.start();
          });
      }
/*
      document.getElementById('musicSource').src = 'sounds/' + fileName;
      audio.load();
      audio.play();
*/
    }
    data = text;
  }

  term.write(data);
});

function playMP3(URL) {
  const context = new AudioContext();
  
  let playBuffer;
  let tuneBuffer;

  window.fetch(URL)
    .then(response => response.arrayBuffer())
    .then(arrayBuffer => context.decodeAudioData(arrayBuffer))
    .then(audioBuffer => {
      play(audioBuffer);
    });

  function play(audioBuffer) {
    const source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(context.destination);
    source.start();
  }

}
