/* arquivo: js/screen-share.js — Compartilhamento de tela e seletor de qualidade (720p/1080p, 30/60 fps). */

/* ---------- compartilhar tela (qualidade escolhida no seletor) ---------- */
const QUALITY = {
  '720-30':  { w: 1280, h: 720,  fps: 30, bps: 3_500_000 },
  '720-60':  { w: 1280, h: 720,  fps: 60, bps: 6_000_000 },
  '1080-30': { w: 1920, h: 1080, fps: 30, bps: 6_000_000 },
  '1080-60': { w: 1920, h: 1080, fps: 60, bps: 12_000_000 },
};
let qkey = '1080-60';
try { const k = localStorage.getItem('q'); if (QUALITY[k]) qkey = k; } catch (e) {}
$('#q').value = qkey;
$('#q').onchange = () => {
  qkey = $('#q').value;
  try { localStorage.setItem('q', qkey); } catch (e) {}
  applyQuality();                       // vale na hora, mesmo no meio da transmissão
};
async function applyQuality() {
  const v = screenStream?.getVideoTracks()[0];
  if (!v) return;
  const Q = QUALITY[qkey];
  try { await v.applyConstraints({ width: { ideal: Q.w }, height: { ideal: Q.h }, frameRate: { ideal: Q.fps } }); } catch (e) { console.warn(e); }
  peers.forEach((p) => p.senders.forEach(tune));
}
async function tune(sender) {
  if (sender.track?.kind !== 'video') return;
  const Q = QUALITY[qkey];
  try {
    const q = sender.getParameters();
    q.encodings = q.encodings?.length ? q.encodings : [{}];
    q.encodings[0].maxBitrate = Q.bps;
    q.encodings[0].maxFramerate = Q.fps;
    /* se a tela capturada for maior que o escolhido (ex.: monitor 4K), reduz no envio */
    q.encodings[0].scaleResolutionDownBy = Math.max(1, (sender.track.getSettings().height || Q.h) / Q.h);
    q.encodings[0].priority = 'high';
    q.encodings[0].networkPriority = 'high';
    q.degradationPreference = 'maintain-resolution';
    await sender.setParameters(q);
  } catch (e) { console.warn(e); }
}
function sendScreen(p) {
  p.senders = screenStream.getTracks().map((t) => p.pc.addTrack(t, screenStream));
  [800, 2500].forEach((ms) => setTimeout(() => p.senders.forEach(tune), ms));
}
async function toggleShare() {
  if (screenStream) return stopShare();
  const Q = QUALITY[qkey];
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { width: { ideal: Q.w }, height: { ideal: Q.h }, frameRate: { ideal: Q.fps } },
      audio: true,
    });
  } catch (e) { return; }
  const v = screenStream.getVideoTracks()[0];
  v.contentHint = 'motion';
  v.onended = stopShare;
  const vid = document.createElement('video');
  vid.autoplay = true; vid.muted = true; vid.srcObject = screenStream;
  const label = document.createElement('span'); label.textContent = 'Sua tela';
  localTile = document.createElement('div');
  localTile.className = 'tile';
  localTile.append(vid, label);
  addFS(localTile, vid);
  $('#stage').append(localTile);
  peers.forEach(sendScreen);
  socket.emit('share', true);
  ui();
}
function stopShare() {
  if (!screenStream) return;
  screenStream.getTracks().forEach((t) => t.stop());
  peers.forEach((p) => {
    p.senders.forEach((s) => { try { p.pc.removeTrack(s); } catch (e) {} });
    p.senders = [];
  });
  localTile?.remove(); localTile = null;
  screenStream = null;
  socket.emit('share', false);
  ui();
}
$('#share').onclick = toggleShare;
