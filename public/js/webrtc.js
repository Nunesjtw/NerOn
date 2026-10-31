/* arquivo: js/webrtc.js — Conexões WebRTC entre os participantes (pares, sinalização e faixas recebidas). */

/* ---------- WebRTC (peer a peer) ---------- */
function makePeer(id, pname) {
  if (peers.has(id)) return peers.get(id);
  const pc = new RTCPeerConnection({ iceServers: ice });
  const p = { id, pc, name: pname, vol: getVol(pname), mic: null, polite: socket.id < id, making: false, ignore: false, els: new Map(), senders: [] };
  peers.set(id, p);
  pc.onicecandidate = (e) => e.candidate && socket.emit('signal', { to: id, data: { candidate: e.candidate } });
  pc.onnegotiationneeded = async () => {
    try {
      p.making = true;
      await pc.setLocalDescription();
      socket.emit('signal', { to: id, data: { description: pc.localDescription } });
    } catch (e) { console.error(e); } finally { p.making = false; }
  };
  pc.ontrack = (e) => addRemote(p, e);
  if (micStream) micStream.getTracks().forEach((t) => pc.addTrack(t, micStream));
  else pc.addTransceiver('audio', { direction: 'recvonly' });
  if (screenStream) sendScreen(p);
  return p;
}

function dropPeer(id) {
  const p = peers.get(id);
  if (!p) return;
  p.pc.close();
  unwatch(id);
  rtt.delete(id);
  p.els.forEach((el) => el.tile.remove());
  peers.delete(id);
  ui();
}

socket.on('peer:joined', (p) => { makePeer(p.id, p.name); beep('join'); });
socket.on('peer:left', (id) => { if (peers.has(id)) beep('leave'); dropPeer(id); });
socket.on('peer:share', ({ id, on }) => {
  const p = peers.get(id);
  if (!p || on) return;
  p.els.forEach((el, sid) => { if (el.tile.dataset.screen) { el.tile.remove(); p.els.delete(sid); } });
  ui();
});

socket.on('signal', async ({ from, data }) => {
  const p = peers.get(from) || makePeer(from, 'Alguém');
  const pc = p.pc;
  try {
    if (data.description) {
      const d = data.description;
      const collision = d.type === 'offer' && (p.making || pc.signalingState !== 'stable');
      p.ignore = !p.polite && collision;
      if (p.ignore) return;
      await pc.setRemoteDescription(d);
      if (d.type === 'offer') {
        await pc.setLocalDescription();
        socket.emit('signal', { to: from, data: { description: pc.localDescription } });
      }
    } else if (data.candidate) {
      try { await pc.addIceCandidate(data.candidate); } catch (e) { if (!p.ignore) throw e; }
    }
  } catch (e) { console.error(e); }
});


function addRemote(p, e) {
  const s = e.streams[0];
  if (!s) return;
  let el = p.els.get(s.id);
  if (!el) {
    el = document.createElement('video');
    el.autoplay = true; el.playsInline = true; el.muted = deaf;
    el.volume = p.vol;
    el.srcObject = s;
    /* o 1º stream só de áudio é o microfone; o áudio de tela vem junto com vídeo e não conta como "fala" */
    if (e.track.kind === 'audio' && !p.mic && !s.getVideoTracks().length) { p.mic = s; watch(p.id, s); }
    const tile = document.createElement('div');
    tile.className = 'tile'; tile.hidden = true;
    const label = document.createElement('span');
    label.textContent = p.name;
    tile.append(el, label);
    addFS(tile, el);
    $('#stage').append(tile);
    el.tile = tile;
    p.els.set(s.id, el);
    s.onremovetrack = () => {
      if (!s.getVideoTracks().length) tile.hidden = true;
      if (!s.getTracks().length) { tile.remove(); p.els.delete(s.id); }
      ui();
    };
  }
  if (e.track.kind === 'video') { el.tile.hidden = false; el.tile.dataset.screen = '1'; }
  ui();
}
