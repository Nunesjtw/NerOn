/* arquivo: js/ui.js — Função ui(): redesenha a lateral, o cartão do usuário e a barra de controles. */

/* ---------- interface ---------- */
function ui() {
  if (dragVol) { pendingUi = true; return; }
  const box = $('#channels');
  box.innerHTML = '';
  channels.forEach((c, i) => {
    const d = document.createElement('div');
    d.className = 'ch' + (c.id === cur ? ' on' : '');
    const row = document.createElement('div');
    row.className = 'ch-row';
    row.innerHTML = svg('vol', 18);
    const n = document.createElement('span');
    n.textContent = c.name;
    n.className = 'crt-glitch'; n.dataset.text = c.name;
    /* ui() redesenha a lista a cada mudança; esse atraso mantém o ciclo do glitch contínuo (sem "reiniciar") */
    n.style.setProperty('--gd', '-' + (((Date.now() / 1000) + i * 2.3) % 7).toFixed(2) + 's');
    row.append(n);
    if (c.id === cur) { const dt = document.createElement('span'); dt.className = 'dot'; row.append(dt); }
    d.append(row);
    if (c.members.length) {
      const m = document.createElement('div');
      m.className = 'mem';
      c.members.forEach((u) => {
        const r = document.createElement('div');
        r.className = 'u';
        const t = document.createElement('span');
        t.textContent = u.name;
        const mine = u.id === socket.id;
        r.append(avatarBox(u.id, u.name, 22, mine ? (muted || deaf) : u.muted), t);
        const p = c.id === cur && !mine ? peers.get(u.id) : null;
        if (p) {
          r.append(pingEl(u.id));
          const s = document.createElement('input');
          s.type = 'range'; s.min = 0; s.max = 100; s.className = 'vol';
          s.value = Math.round(p.vol * 100);
          const label = () => { s.style.setProperty('--v', s.value + '%'); s.title = 'Volume de ' + u.name + ': ' + s.value + '%'; };
          label();
          s.setAttribute('aria-label', 'Volume de ' + u.name);
          s.oninput = () => { label(); setVol(u.id, s.value / 100); };
          s.addEventListener('pointerdown', () => { dragVol = true; });
          ['click', 'dblclick', 'keydown', 'pointerdown'].forEach((ev) => s.addEventListener(ev, (e) => e.stopPropagation()));
          r.append(s);
        }
        m.append(r);
      });
      d.append(m);
    }
    d.onclick = () => join(c.id);
    d.tabIndex = 0; d.setAttribute('role', 'button');
    d.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); join(c.id); } };
    box.append(d);
  });

  const ch = channels.find((c) => c.id === cur);
  const tt = $('#title');
  tt.textContent = ch ? ch.name : 'Nero';
  tt.classList.toggle('crt-glitch', !!ch);
  if (ch) tt.dataset.text = ch.name; else delete tt.dataset.text;
  $('#sub').textContent = ch ? ch.members.length + (ch.members.length === 1 ? ' pessoa na call' : ' pessoas na call') : 'Escolha um canal de voz para entrar';
  $('#chsub').textContent = ch ? '#' + ch.name : 'Entre em um canal para conversar';

  /* card do usuário: um único elemento-pílula; o seletor de status é o popup aberto por ele (presence.js) */
  const me = $('#me');
  me.className = 'me' + (cur ? ' live' : '') + (me.classList.contains('dd-open') ? ' dd-open' : '');
  me.innerHTML = '';
  const info = document.createElement('div'); info.className = 'me-info';
  const b = document.createElement('b'); b.textContent = name;
  const sm = document.createElement('small');
  const sd = document.createElement('i'); sd.style.background = statusColor(myStatus);
  const stx = document.createElement('span'); stx.textContent = myStatus + (ch ? ' · ' + ch.name : '');
  sm.append(sd, stx);
  info.append(b, sm);
  const chev = document.createElement('span'); chev.className = 'me-chev'; chev.innerHTML = svg('chev', 16);
  me.append(avatarBox(String(socket.id), name, 36, !!cur && (muted || deaf)), info, chev);

  $('#bar').hidden = !cur;
  const mm = muted || deaf;
  $('#mic').innerHTML = svg(mm ? 'micOff' : 'mic');
  $('#mic').title = mm ? 'Ativar microfone' : 'Mutar microfone';
  $('#mic').classList.toggle('off', mm);
  $('#deaf').innerHTML = svg(deaf ? 'headOff' : 'head');
  $('#deaf').title = deaf ? 'Ativar áudio' : 'Mutar áudio';
  $('#deaf').classList.toggle('off', deaf);
  $('#share').innerHTML = svg('screen') + '<span>' + (screenStream ? 'Parar transmissão' : 'Compartilhar tela') + '</span>';
  $('#share').classList.toggle('live', !!screenStream);
  $('#leave').innerHTML = svg('phoneOff') + '<span>Sair</span>';
  if (typeof renderQuality === 'function') renderQuality();
  $('#txt').disabled = !cur;
  $('#send').disabled = !cur;
  $('#msgs').dataset.empty = cur ? 'Nenhuma mensagem ainda. Diga oi.' : 'Entre em um canal para ver e enviar mensagens.';
  renderTabs();
  $('#txt').placeholder = cur ? 'Enviar mensagem' : 'Entre em um canal para conversar';

  const hasTile = $('#stage .tile:not([hidden])');
  $('#empty').hidden = !!hasTile;
  $('#et').textContent = cur ? 'Você está na call' : 'Nenhum canal selecionado';
  $('#ed').textContent = cur ? 'Quando alguém compartilhar a tela, ela aparece aqui. Para transmitir a sua, use o botão Compartilhar tela.' : 'Escolha um canal de voz na lista à esquerda para começar a conversar.';
  flow.setActive(!cur);
  renderPeople();
}
socket.on('channels', (l) => { channels = l; ui(); });
$('#newch').onclick = () => { const n = prompt('Nome do canal:'); if (n) socket.emit('create', n); };
