/* arquivo: js/call.js — Entrar e sair de um canal de voz. */

/* ---------- entrar / sair ---------- */
async function join(id) {
  if (id === cur) return;
  if (cur) leave();
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  } catch (e) {
    micStream = null;
    alert('Não consegui acessar o microfone. Você vai entrar só ouvindo.');
  }
  audioCtx();                                  // destrava o áudio (estamos num clique do usuário)
  if (micStream) watch(socket.id, micStream);  // detecta quando EU falo
  applyAll();
  cur = id;
  socket.emit('join', id, (r) => {
    beep('join');
    socket.emit('muted', muted || deaf);
    clearMsgs();
    r.messages.forEach(addMsg);
    r.peers.forEach((p) => makePeer(p.id, p.name));
    if (isMobile()) setPane('call'); else ui();
  });
}

function leave() {
  if (!cur) return;
  beep('leave');
  stopTyping();
  typers.forEach((t) => clearTimeout(t.timer)); typers.clear(); renderTyping();
  socket.emit('leave');
  stopShare();
  peers.forEach((p, id) => dropPeer(id));
  [...watchers.keys()].forEach(unwatch);
  micStream?.getTracks().forEach((t) => t.stop());
  micStream = null; cur = null;
  clearMsgs();
  ui();
}
$('#leave').onclick = leave;
socket.on('disconnect', leave);
