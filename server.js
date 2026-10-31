const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { randomUUID } = require('crypto');

const app = express();
const server = http.createServer(app);
// maxHttpBufferSize: imagens viajam em Base64 pelo WebSocket, então o limite padrão (1 MB) é pequeno demais
const io = new Server(server, { maxHttpBufferSize: 4e6 });

// imagens do chat: só formatos seguros (sem SVG) e com teto de tamanho
const IMG_RE = /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const IMG_MAX = 2_500_000;        // caracteres do data URL (~1,8 MB de imagem)
const IMG_HISTORY = 20;           // quantas imagens ficam no histórico do canal (memória)

// Opcional: defina ACCESS_CODE no servidor para só entrar quem tiver o código
const ACCESS_CODE = process.env.ACCESS_CODE || '';

app.use(express.static('public'));
app.get('/ice', (req, res) => {
  const list = [{ urls: 'stun:stun.l.google.com:19302' }];
  if (process.env.TURN_URL) {
    list.push({
      urls: process.env.TURN_URL.split(','),
      username: process.env.TURN_USER,
      credential: process.env.TURN_PASS,
    });
  }
  res.json(list);
});

// canais ficam em memória (reiniciar o servidor volta ao padrão)
const channels = new Map();
const addChannel = (name) => {
  const id = randomUUID().slice(0, 8);
  channels.set(id, { id, name, members: new Map(), messages: [] });
  return id;
};
addChannel('Geral');
addChannel('Jogos');

const snapshot = () =>
  [...channels.values()].map((c) => ({
    id: c.id,
    name: c.name,
    // muted: cada pessoa avisa quando muta; todos veem o ícone de microfone cortado
    members: [...c.members].map(([id, name]) => ({ id, name, muted: !!io.sockets.sockets.get(id)?.data.muted })),
  }));
const broadcast = () => io.emit('channels', snapshot());

// quem está online (todos os conectados) e o status de atividade de cada um
const STATUS_DEFAULT = 'Online';
const usersSnapshot = () =>
  [...io.sockets.sockets.values()].map((s) => ({ id: s.id, name: s.data.name, status: s.data.status || STATUS_DEFAULT }));
const broadcastUsers = () => io.emit('users', usersSnapshot());

io.use((socket, next) => {
  if (ACCESS_CODE && socket.handshake.auth.code !== ACCESS_CODE) {
    return next(new Error('code'));
  }
  next();
});

io.on('connection', (socket) => {
  socket.data.name = String(socket.handshake.auth.name || 'Anônimo').slice(0, 20);
  socket.data.status = STATUS_DEFAULT;
  socket.emit('channels', snapshot());
  broadcastUsers();

  const leave = () => {
    const ch = channels.get(socket.data.room);
    if (!ch) return;
    socket.to(ch.id).emit('typing', { id: socket.id, name: socket.data.name, on: false });  // quem sai não fica "digitando"
    ch.members.delete(socket.id);
    socket.leave(ch.id);
    socket.to(ch.id).emit('peer:left', socket.id);
    socket.data.room = null;
    socket.data.muted = false;
    broadcast();
  };

  socket.on('create', (name) => {
    const clean = String(name || '').trim().slice(0, 24);
    if (clean) {
      addChannel(clean);
      broadcast();
    }
  });

  socket.on('join', (id, cb) => {
    const ch = channels.get(id);
    if (!ch) return;
    leave();
    const peers = [...ch.members].map(([pid, name]) => ({ id: pid, name }));
    ch.members.set(socket.id, socket.data.name);
    socket.join(id);
    socket.data.room = id;
    cb({ peers, messages: ch.messages });
    socket.to(id).emit('peer:joined', { id: socket.id, name: socket.data.name });
    broadcast();
  });

  socket.on('leave', leave);

  // status de atividade: "Codando", "Jogando", "Focado" ou texto livre (até 24 letras)
  socket.on('status', (s) => {
    socket.data.status = String(s || '').trim().slice(0, 24) || STATUS_DEFAULT;
    broadcastUsers();
  });

  // "fulano está digitando": só repassa para quem está na mesma call
  socket.on('typing', (on) => {
    if (socket.data.room) socket.to(socket.data.room).emit('typing', { id: socket.id, name: socket.data.name, on: !!on });
  });

  socket.on('muted', (m) => {
    socket.data.muted = !!m;
    if (socket.data.room) broadcast();
  });

  socket.on('signal', ({ to, data }) => {
    io.to(to).emit('signal', { from: socket.id, data });
  });

  socket.on('share', (on) => {
    if (socket.data.room) socket.to(socket.data.room).emit('peer:share', { id: socket.id, on });
  });

  // aceita texto puro (string) ou { text, image } — image é um data URL em Base64
  socket.on('chat', (payload) => {
    const ch = channels.get(socket.data.room);
    if (!ch) return;
    const p = typeof payload === 'string' ? { text: payload } : payload || {};
    const clean = String(p.text || '').trim().slice(0, 1000);
    const image = typeof p.image === 'string' && p.image.length <= IMG_MAX && IMG_RE.test(p.image) ? p.image : null;
    if (!clean && !image) return;
    const msg = { name: socket.data.name, text: clean, t: Date.now() };
    if (image) {
      msg.image = image;
      const withImg = ch.messages.filter((m) => m.image);
      if (withImg.length >= IMG_HISTORY) ch.messages.splice(ch.messages.indexOf(withImg[0]), 1);
    }
    ch.messages.push(msg);
    if (ch.messages.length > 100) ch.messages.shift();
    io.to(ch.id).emit('chat', msg);
  });

  socket.on('disconnect', leave);
  socket.on('disconnect', broadcastUsers);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Nero rodando em http://localhost:' + PORT));