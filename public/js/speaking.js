/* arquivo: js/speaking.js — Avatar com anel de fala/ícone de mute e detecção de volume (quem está falando). */

/* ---------- avatar com anel de fala e ícone de mute ---------- */
const speaking = new Set();            // ids de quem está falando agora
function avatarBox(uid, nm, size, isMuted) {
  const w = document.createElement('span');
  w.className = 'avw' + (speaking.has(uid) && !isMuted ? ' speaking' : '');
  w.dataset.uid = uid;
  w.append(avatar(nm, size));
  if (isMuted) {
    const m = document.createElement('span');
    const s = Math.max(13, Math.round(size * 0.46));
    m.className = 'mi'; m.title = 'Microfone desativado';
    m.style.cssText = 'width:' + s + 'px;height:' + s + 'px';
    m.innerHTML = svg('micOff', s);
    w.append(m);
  }
  return w;
}
function setSpeaking(uid, on) {
  if (on) speaking.add(uid); else speaking.delete(uid);
  document.querySelectorAll('.avw[data-uid="' + CSS.escape(uid) + '"]').forEach((el) => el.classList.toggle('speaking', on));
}

/* ---------- detecção de volume (quem está falando) ---------- */
let actx = null;
const watchers = new Map();            // uid -> { src, an, buf, last, on }
function audioCtx() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (actx.state === 'suspended') actx.resume().catch(() => {});
  return actx;
}
function watch(uid, stream) {
  unwatch(uid);
  const c = audioCtx();
  if (!c || !stream.getAudioTracks().length) return;
  const an = c.createAnalyser(); an.fftSize = 512;
  const src = c.createMediaStreamSource(stream);
  src.connect(an);                     // só analisa; não liga na saída, então não duplica o som
  watchers.set(uid, { src, an, buf: new Uint8Array(an.fftSize), last: 0, on: false });
}
function unwatch(uid) {
  const w = watchers.get(uid);
  if (!w) return;
  try { w.src.disconnect(); } catch (e) {}
  watchers.delete(uid);
  setSpeaking(uid, false);
}
const TALK_LEVEL = 0.03;               // sensibilidade: menor = pega voz mais baixa
setInterval(() => {
  const now = performance.now();
  watchers.forEach((w, uid) => {
    w.an.getByteTimeDomainData(w.buf);
    let sum = 0;
    for (const v of w.buf) { const d = (v - 128) / 128; sum += d * d; }
    if (Math.sqrt(sum / w.buf.length) > TALK_LEVEL) w.last = now;
    const on = now - w.last < 250 && !(uid === socket.id && (muted || deaf));   // 250ms evita piscar entre sílabas
    if (on !== w.on) { w.on = on; setSpeaking(uid, on); }
  });
}, 90);
