/* arquivo: js/presence.js — Rich Presence: status de atividade e lista "Online". */

/* ---------- Rich Presence: status de atividade (via WebSocket) ---------- */
const PRESETS = ['Online', 'Codando', 'Jogando', 'Focado'];
const STATUS_COLORS = { online: 'var(--ok)', codando: '#5ef0ff', jogando: 'var(--accent)', focado: '#b79cff' };
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
let users = [], peopleSig = '', pendingPeople = false;
socket.on('users', (l) => { users = l; renderPeople(); });
function renderPeople() {
  const box = $('#people');
  if (document.activeElement?.classList.contains('st-sel')) { pendingPeople = true; return; }   // não fecha o menu aberto
  const roomOf = (id) => channels.find((c) => c.members.some((m) => m.id === id))?.name || '';
  const list = [...users].sort((a, b) => (a.id === socket.id ? -1 : b.id === socket.id ? 1 : a.name.localeCompare(b.name)));
  const sig = JSON.stringify([list.map((u) => [u.id, u.name, u.status, roomOf(u.id)]), myStatus, socket.id]);
  if (sig === peopleSig) return;
  peopleSig = sig; pendingPeople = false;
  $('#ptitle').textContent = 'Online · ' + list.length;
  box.innerHTML = '';
  list.forEach((u) => {
    const mine = u.id === socket.id;
    const label = mine ? myStatus : u.status;
    const row = document.createElement('div'); row.className = 'pp';
    const info = document.createElement('div'); info.className = 'pi';
    const nm = document.createElement('b'); nm.textContent = u.name + (mine ? ' (você)' : '');
    const st = document.createElement('div'); st.className = 'ps';
    const dot = document.createElement('i'); dot.style.background = statusColor(label);
    st.append(dot);
    if (mine) {
      const w = document.createElement('span'); w.className = 'stw';
      const sel = document.createElement('select'); sel.className = 'st-sel'; sel.setAttribute('aria-label', 'Seu status');
      [...PRESETS, ...(PRESETS.includes(myStatus) ? [] : [myStatus])].forEach((o) => sel.add(new Option(o, o)));
      sel.add(new Option('Personalizado…', '__custom'));
      sel.value = myStatus;
      sel.onchange = () => {
        let v = sel.value;
        if (v === '__custom') {
          v = (prompt('Seu status (até 24 letras):', '') || '').trim().slice(0, 24);
          if (!v) { sel.value = myStatus; sel.blur(); return; }
        }
        sel.blur();
        setMyStatus(v);
      };
      sel.onblur = () => { if (pendingPeople) setTimeout(renderPeople, 0); };
      w.append(sel); st.append(w);
    } else {
      const t = document.createElement('span'); t.textContent = label; st.append(t);
    }
    const room = roomOf(u.id);
    if (room) { const r = document.createElement('span'); r.className = 'rm'; r.textContent = '· ' + room; st.append(r); }
    info.append(nm, st);
    row.append(avatarBox(u.id, u.name, 30, false), info);
    box.append(row);
  });
}
