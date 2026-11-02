/* arquivo: js/call.js — Entrar e sair de um canal de voz + "Modo Sofá" (chamada de 2 pessoas só de áudio). */

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

/* ---------- Modo Sofá (Easter Egg) ----------
   Aparece quando há EXATAMENTE 2 pessoas no canal e ninguém está transmitindo vídeo
   (webcam ou compartilhamento de tela). Qualquer vídeo ligado, ou um 3º participante,
   esconde o sofá na hora e o grid normal volta. Chamado pelo ui(), que já roda a cada mudança. */
const videoOn = (stream) => !!stream && stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live');

function everyoneAudioOnly() {
  if (videoOn(screenStream)) return false;                                    // minha tela / câmera
  for (const p of peers.values()) {
    for (const el of p.els.values()) if (videoOn(el.srcObject)) return false;  // tela / câmera de quem está na call
  }
  return !$('#stage .tile:not([hidden])');                                    // qualquer tile de vídeo visível
}

function shouldShowLounge() {
  const ch = channels.find((c) => c.id === cur);
  return !!ch && ch.members.length === 2 && everyoneAudioOnly();
}

let loungeSig = '';
function renderSeat(seat, member) {
  seat.innerHTML = '';
  const mine = member.id === socket.id;
  const box = avatarBox(member.id, member.name, 64, mine ? muted || deaf : member.muted);   // anel de fala + ícone de mute
  const body = document.createElement('span');                                               // corpinho: mesma cor do avatar
  body.className = 'lounge-body';
  body.style.background = box.querySelector('.av').style.background;
  const tag = document.createElement('span');
  tag.className = 'lounge-name';
  tag.textContent = mine ? 'você' : member.name;
  seat.append(box, body, tag);
}

/* alterna entre o grid normal e o sofá; devolve true se o sofá está visível */
function updateLounge() {
  const box = $('#audio-lounge-mode');
  const on = shouldShowLounge();
  box.hidden = !on;                                  // visível = display:flex (lounge.css); oculto = display:none
  $('main').classList.toggle('lounge-on', on);
  if (!on) { loungeSig = ''; return false; }
  const ch = channels.find((c) => c.id === cur);
  const hint = $('#lounge-hint');
  if (!hint.firstChild) hint.innerHTML = svg('screen', 16) + '<span>Alguém aperta o botão da tela aí</span>';
  const sig = JSON.stringify(ch.members.map((m) => [m.id, m.name, m.id === socket.id ? muted || deaf : !!m.muted]));
  if (sig !== loungeSig) {                           // só redesenha quando algo mudou (preserva o glow de fala)
    loungeSig = sig;
    renderSeat($('#seat-left'), ch.members[0]);
    renderSeat($('#seat-right'), ch.members[1]);
  }
  return true;
}
