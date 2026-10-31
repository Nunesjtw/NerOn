/* arquivo: js/presence.js — Rich Presence: status de atividade e lista "Online". */

/* ---------- Rich Presence: status de atividade (via WebSocket) ---------- */
const PRESETS = ['Online', 'Codando', 'Jogando', 'Focado'];
const STATUS_COLORS = { online: 'var(--ok)', codando: '#fff', jogando: 'var(--accent)', focado: 'var(--accent-soft)' };
const statusColor = (s) => STATUS_COLORS[String(s).toLowerCase()] || 'var(--dim)';
let myStatus = 'Online';
try { myStatus = (localStorage.getItem('status') || 'Online').slice(0, 24); } catch (e) {}
socket.on('connect', () => socket.emit('status', myStatus));    // reenvia ao reconectar
function setMyStatus(s) {
  myStatus = s;
  try { localStorage.setItem('status', s); } catch (e) {}
  socket.emit('status', s);
  ui();
}
/* popup de status: abre ao clicar no card do usuário (#me) */
Dropdown({
  trigger: $('#me'),
  placement: 'top',
  align: 'start',
  getValue: () => myStatus,
  options: () => [
    ...[...PRESETS, ...(PRESETS.includes(myStatus) ? [] : [myStatus])].map((o) => ({ value: o, label: o, dot: statusColor(o) })),
    { value: '__custom', label: 'Personalizado…', input: { placeholder: 'Seu status (até 24 letras)', maxLength: 24 } },
  ],
  onSelect: setMyStatus,
});

let users = [], peopleSig = '';
socket.on('users', (l) => { users = l; renderPeople(); });
/* lista "Online": só as OUTRAS pessoas — o usuário já aparece (uma única vez) no card #me */
function renderPeople() {
  const box = $('#people');
  const roomOf = (id) => channels.find((c) => c.members.some((m) => m.id === id))?.name || '';
  const others = users.filter((u) => u.id !== socket.id).sort((a, b) => a.name.localeCompare(b.name));
  const sig = JSON.stringify([others.map((u) => [u.id, u.name, u.status, roomOf(u.id)]), users.length]);
  if (sig === peopleSig) return;
  peopleSig = sig;
  $('#ptitle').textContent = 'Online · ' + users.length;
  box.innerHTML = '';
  others.forEach((u) => {
    const row = document.createElement('div'); row.className = 'pp';
    const info = document.createElement('div'); info.className = 'pi';
    const nm = document.createElement('b'); nm.textContent = u.name;
    const st = document.createElement('div'); st.className = 'ps';
    const dot = document.createElement('i'); dot.style.background = statusColor(u.status);
    const t = document.createElement('span'); t.textContent = u.status;
    st.append(dot, t);
    const room = roomOf(u.id);
    if (room) { const r = document.createElement('span'); r.className = 'rm'; r.textContent = '· ' + room; st.append(r); }
    info.append(nm, st);
    row.append(avatarBox(u.id, u.name, 30, false), info);
    box.append(row);
  });
}
