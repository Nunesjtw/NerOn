/* arquivo: js/typing.js — "Fulano está digitando…". */

/* ---------- "fulano está digitando…" ---------- */
const typers = new Map();                      // id -> { name, timer }
let typingOn = false, typingT = null, typingSentAt = 0;
function renderTyping() {
  const el = $('#typing');
  const names = [...typers.values()].map((t) => t.name);
  const label = !names.length ? '' : names.length === 1 ? names[0] + ' está digitando'
    : names.length === 2 ? names[0] + ' e ' + names[1] + ' estão digitando' : names.length + ' pessoas estão digitando';
  if (el.dataset.k === label) return;
  el.dataset.k = label;
  el.textContent = '';
  if (!label) return;
  const s = document.createElement('span'); s.className = 'crt-lite';
  const d = document.createElement('span'); d.className = 'dots';
  d.innerHTML = '<i>.</i><i>.</i><i>.</i>';
  s.append(label, d);
  el.append(s);
}
socket.on('typing', ({ id, name: nm, on }) => {
  const old = typers.get(id);
  if (old) clearTimeout(old.timer);
  if (on) typers.set(id, { name: nm, timer: setTimeout(() => { typers.delete(id); renderTyping(); }, 5000) });   // segurança: some sozinho
  else typers.delete(id);
  renderTyping();
});
function stopTyping() {
  clearTimeout(typingT);
  if (typingOn) { typingOn = false; socket.emit('typing', false); }
}
$('#txt').addEventListener('input', () => {
  if (!cur) return;
  if (!$('#txt').value.trim()) return stopTyping();
  const now = Date.now();
  if (!typingOn || now - typingSentAt > 3000) { typingOn = true; typingSentAt = now; socket.emit('typing', true); }
  clearTimeout(typingT);
  typingT = setTimeout(stopTyping, 2500);      // parou de teclar por 2,5s: some o "digitando"
});
