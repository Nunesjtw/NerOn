/* arquivo: js/chat.js — Mensagens (texto e imagens), emojis, abas do celular e envio. */

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
  if (m.text) body.append(tx);
  if (m.image) {
    const im = document.createElement('img');
    im.className = 'mimg';
    im.alt = 'Imagem enviada por ' + m.name;
    im.loading = 'lazy'; im.decoding = 'async';
    im.onload = () => { box.scrollTop = box.scrollHeight; };      // a altura só é conhecida depois de carregar
    im.onclick = () => openLightbox(m.image);
    im.src = m.image;
    body.append(im);
  }
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
  if (document.hidden) { away++; document.title = '(' + away + ') Nero'; }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) { away = 0; document.title = 'Nero'; } });
function send() {
  const i = $('#txt');
  if (!cur || (!i.value.trim() && !stagedImage)) return;
  socket.emit('chat', { text: i.value, image: stagedImage });     // texto e/ou imagem (Base64) via WebSocket
  i.value = '';
  clearAttachment();
  closeEmoji();
  stopTyping();
}
$('#txt').addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
$('#send').onclick = () => { send(); $('#txt').focus(); };

/* ---------- aviso rápido ---------- */
let toastT = null;
function toast(msg) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
  t.textContent = msg;
  clearTimeout(toastT);
  toastT = setTimeout(() => t.remove(), 3200);
}

/* ---------- imagens: anexo (clipe) e Ctrl+V ---------- */
const IMG_MAX_SIDE = 1280;            // lado maior após reduzir (print de tela 4K não estoura o limite)
const IMG_MAX_FILE = 15 * 1024 * 1024; // arquivo original aceito
const GIF_MAX = 1.5 * 1024 * 1024;     // GIF segue sem recompressão (para não perder a animação)
let stagedImage = null;                // data URL pronto para enviar

const readAsDataURL = (file) => new Promise((ok, fail) => {
  const r = new FileReader();
  r.onload = () => ok(r.result);
  r.onerror = () => fail(r.error);
  r.readAsDataURL(file);
});
const loadImage = (src) => new Promise((ok, fail) => {
  const im = new Image();
  im.onload = () => ok(im);
  im.onerror = fail;
  im.src = src;
});

async function stageImage(file) {
  if (!cur) return;
  if (!file || !file.type.startsWith('image/')) return toast('Esse arquivo não é uma imagem.');
  if (file.size > IMG_MAX_FILE) return toast('Imagem grande demais (máx. 15 MB).');
  try {
    let url = await readAsDataURL(file);                          // FileReader → Base64
    if (file.type === 'image/gif') {
      if (file.size > GIF_MAX) return toast('GIF grande demais (máx. 1,5 MB).');
    } else if (/^image\/(png|jpeg|webp)$/.test(file.type)) {
      const im = await loadImage(url);
      const k = Math.min(1, IMG_MAX_SIDE / Math.max(im.naturalWidth, im.naturalHeight));
      if (k < 1 || file.size > 400 * 1024) {                       // reduz e recomprime para trafegar leve
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(im.naturalWidth * k));
        c.height = Math.max(1, Math.round(im.naturalHeight * k));
        const g = c.getContext('2d');
        g.fillStyle = '#0f0f11'; g.fillRect(0, 0, c.width, c.height);   // PNG transparente não vira preto feio no JPEG
        g.drawImage(im, 0, 0, c.width, c.height);
        url = c.toDataURL('image/jpeg', 0.85);
      }
    } else {
      return toast('Formato não suportado. Use PNG, JPG, WebP ou GIF.');
    }
    if (url.length > 2_400_000) return toast('Imagem ainda muito pesada. Tente uma menor.');
    stagedImage = url;
    $('#attach-thumb').src = url;
    $('#attach-name').textContent = file.name && file.name !== 'image.png' ? file.name : 'Imagem colada';
    $('#attach-preview').hidden = false;
    $('#txt').focus();
  } catch (e) {
    toast('Não consegui ler essa imagem.');
  }
}
function clearAttachment() {
  stagedImage = null;
  $('#attach-preview').hidden = true;
  $('#attach-thumb').removeAttribute('src');
  $('#file').value = '';
}
$('#attach').onclick = () => $('#file').click();
$('#file').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) stageImage(f); });
$('#attach-remove').onclick = () => { clearAttachment(); $('#txt').focus(); };

/* Ctrl+V: se houver imagem na área de transferência (print screen), captura o File; texto cola normalmente */
$('#txt').addEventListener('paste', (e) => {
  const item = [...(e.clipboardData?.items || [])].find((it) => it.kind === 'file' && it.type.startsWith('image/'));
  if (!item) return;
  e.preventDefault();
  stageImage(item.getAsFile());
});

/* ---------- lightbox: clique na imagem para ver maior ---------- */
function openLightbox(src) {
  closeLightbox();
  const o = document.createElement('div');
  o.id = 'lightbox';
  const im = document.createElement('img');
  im.src = src; im.alt = 'Imagem ampliada';
  o.append(im);
  o.onclick = closeLightbox;
  document.body.append(o);
}
function closeLightbox() { $('#lightbox')?.remove(); }

/* ---------- seletor de emojis ---------- */
const EMOJIS = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😎',
  '🤔', '😅', '😉', '🙃', '😴', '🥳', '🤯', '😭',
  '😡', '🥺', '😬', '🙄', '😇', '🤗', '🤩', '😏',
  '👍', '👎', '👏', '🙌', '🙏', '💪', '👀', '🤝',
  '🔥', '✨', '💯', '🎉', '❤️', '💔', '⭐', '⚡',
  '🎮', '🎧', '💻', '🚀', '🎵', '📸', '☕', '🍕',
  '🐰', '🐱', '🐶', '🦊', '🌙', '☀️', '🌈', '💀',
];
const emojiGrid = document.createElement('div');
emojiGrid.className = 'emoji-grid';
EMOJIS.forEach((em) => {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = em; b.setAttribute('aria-label', 'Emoji ' + em);
  emojiGrid.append(b);
});
$('#emoji-pop').append(emojiGrid);

function insertAtCursor(text) {
  const i = $('#txt');
  const a = i.selectionStart ?? i.value.length, z = i.selectionEnd ?? i.value.length;
  const next = i.value.slice(0, a) + text + i.value.slice(z);
  if (next.length > i.maxLength) return;                       // respeita o limite de 1000 caracteres
  i.value = next;
  i.setSelectionRange(a + text.length, a + text.length);
  i.dispatchEvent(new Event('input'));                         // mantém o "digitando…" funcionando
  i.focus();
}
function closeEmoji() { $('#emoji-pop').hidden = true; $('#emojiBtn').setAttribute('aria-expanded', 'false'); }
function toggleEmoji() {
  const pop = $('#emoji-pop');
  const open = pop.hidden;
  pop.hidden = !open;
  $('#emojiBtn').setAttribute('aria-expanded', String(open));
}
$('#emojiBtn').onclick = (e) => { e.stopPropagation(); toggleEmoji(); };
emojiGrid.addEventListener('mousedown', (e) => e.preventDefault());      // clicar no emoji não tira o foco do input
emojiGrid.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) insertAtCursor(b.textContent); });
document.addEventListener('click', (e) => { if (!e.target.closest('#emoji-pop')) closeEmoji(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeEmoji(); closeLightbox(); } });

/* chamado pelo ui() quando o usuário sai da call */
function resetComposer() { closeEmoji(); clearAttachment(); }
