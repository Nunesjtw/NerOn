/* arquivo: js/chat.js — Mensagens, abas do celular e envio. */

/* ---------- chat ---------- */
let last = null;
function addMsg(m, live) {
  const box = $('#msgs');
  const same = last && last.name === m.name && m.t - last.t < 300000;
  last = m;
  const d = document.createElement('div');
  d.className = 'm' + (same ? ' same' : '') + (live ? ' live' : '');
  const body = document.createElement('div');
  if (!same) {
    const h = document.createElement('div');
    h.className = 'mh';
    const b = document.createElement('b'); b.textContent = m.name;
    const t = document.createElement('time');
    t.textContent = new Date(m.t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    h.append(b, t);
    body.append(h);
  }
  const tx = document.createElement('div');
  tx.className = 'mt'; tx.textContent = m.text;
  body.append(tx);
  d.append(same ? document.createElement('div') : avatar(m.name, 32), body);
  box.append(d);
  box.scrollTop = box.scrollHeight;
}
function clearMsgs() { $('#msgs').innerHTML = ''; last = null; }
let unread = 0, away = 0, pane = 'canais';
const isMobile = () => matchMedia('(max-width: 900px)').matches;
function setPane(p) { pane = p; document.body.dataset.pane = p; if (p === 'chat') unread = 0; ui(); }
function renderTabs() {
  const defs = { canais: ['list', 'Canais'], call: ['phone', 'Chamada'], chat: ['msg', 'Chat'] };
  for (const k in defs) {
    const b = $('#tb-' + k);
    b.dataset.p = k;
    b.innerHTML = svg(defs[k][0], 22) + '<span>' + defs[k][1] + '</span>' + (k === 'chat' && unread ? '<i>' + (unread > 9 ? '9+' : unread) + '</i>' : '');
    b.setAttribute('aria-current', String(pane === k));
    b.onclick = () => setPane(k);
  }
}
socket.on('chat', (m) => {
  addMsg(m, true);
  typers.forEach((t, id) => { if (t.name === m.name) { clearTimeout(t.timer); typers.delete(id); } });   // mandou a mensagem: para de "digitar"
  renderTyping();
  if (m.name === name) return;
  if (isMobile() && pane !== 'chat') { unread++; ui(); }
  if (document.hidden) { away++; document.title = '(' + away + ') Chamada'; }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) { away = 0; document.title = 'Chamada'; } });
function send() {
  const i = $('#txt');
  if (cur && i.value.trim()) { socket.emit('chat', i.value); i.value = ''; stopTyping(); }
}
$('#txt').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
$('#send').onclick = () => { send(); $('#txt').focus(); };
