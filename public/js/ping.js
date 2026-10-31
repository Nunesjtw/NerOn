/* arquivo: js/ping.js — Indicador de ping: latência real da conexão WebRTC. */

/* ---------- indicador de ping (latência real da conexão WebRTC) ---------- */
const PING_GOOD = 100, PING_MID = 200;        // ms: abaixo de 100 verde, até 200 amarelo, acima vermelho
const rtt = new Map();                         // id da pessoa -> ms (null = ainda medindo)
function paintPing(el, ms) {
  const lv = ms == null ? 'none' : ms < PING_GOOD ? 'good' : ms < PING_MID ? 'mid' : 'bad';
  const txt = ms == null ? '-- ms' : (ms < 1 ? '<1' : Math.round(ms)) + ' ms';
  el.className = 'ping ' + lv;
  el.title = 'Latência da conexão (WebRTC): ' + txt;
  el.lastChild.textContent = txt;
}
function pingEl(uid) {
  const el = document.createElement('span');
  el.dataset.uid = uid;
  el.innerHTML = '<i></i><i></i><i></i><em></em>';
  paintPing(el, rtt.get(uid) ?? null);
  return el;
}
setInterval(async () => {
  for (const [id, p] of peers) {
    let pair = null, rtp = null;
    try {
      (await p.pc.getStats()).forEach((r) => {
        if (r.type === 'candidate-pair' && r.nominated && r.state === 'succeeded' && typeof r.currentRoundTripTime === 'number') pair = r.currentRoundTripTime * 1000;
        if (r.type === 'remote-inbound-rtp' && typeof r.roundTripTime === 'number') rtp = r.roundTripTime * 1000;
      });
    } catch (e) {}
    const ms = pair ?? rtp;
    rtt.set(id, ms);
    document.querySelectorAll('.ping[data-uid="' + CSS.escape(id) + '"]').forEach((el) => paintPing(el, ms));
  }
}, 2000);
