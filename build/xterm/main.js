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
 
socket.emit('create', cols, rows, function(err, data) {
  if (err) return self._destroy();
  self.pty = data.pty;
  self.id = data.id;
  termid = self.id;
  term.emit('open tab', self);
});
 
term.writeln('\x1B[36mWelcome to \x1B[1mDank Domain\x1B[22m!');
term.write('\x1B[34mConnecting to terminal WebSocket ... \x1B[m');
 
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
  term.write(data);
});
