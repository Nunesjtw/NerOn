/* arquivo: js/controls.js — Botões de microfone e de áudio (mutar / ensurdecer). */

/* ---------- microfone e áudio ---------- */
function applyAll() {
  micStream?.getAudioTracks().forEach((t) => (t.enabled = !muted && !deaf));
  peers.forEach((p) => p.els.forEach((el) => (el.muted = deaf)));
  if (cur) socket.emit('muted', muted || deaf);   // avisa os outros para mostrarem o microfone cortado
  ui();
}
$('#mic').onclick = () => { if (deaf) { deaf = false; muted = false; } else muted = !muted; applyAll(); };
$('#deaf').onclick = () => { deaf = !deaf; applyAll(); };
