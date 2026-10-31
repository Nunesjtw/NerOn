/* arquivo: js/dropdown.js — Dropdown customizado (div > ul > li) em glassmorphism. Substitui os <select> nativos.
   Uso:
     const dd = Dropdown({
       trigger: elemento,                 // botão que abre o menu
       options: () => [{ value, label, dot?, input? }],   // lista (ou função, reavaliada a cada abertura)
       getValue: () => valorAtual,
       onSelect: (value) => {},
       placement: 'top' | 'bottom',       // onde o menu aparece em relação ao botão
       align: 'start' | 'center' | 'end', // alinhamento horizontal
     });
   Opção com `input: { placeholder, maxLength }` vira um campo de texto dentro do menu ao ser escolhida. */

const CHECK_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
let ddSeq = 0;
let ddOpen = null;                                   // só um menu aberto por vez

function Dropdown({ trigger, options, getValue, onSelect, placement = 'top', align = 'start' }) {
  const id = 'dd' + (++ddSeq);
  const menu = document.createElement('div');
  menu.className = 'dd-menu';
  menu.dataset.placement = placement;
  menu.tabIndex = -1;
  const list = document.createElement('ul');
  list.setAttribute('role', 'listbox');
  list.id = id + '-list';
  menu.append(list);
  trigger.setAttribute('aria-controls', list.id);

  let items = [], active = -1, isOpen = false;

  const optList = () => (typeof options === 'function' ? options() : options);

  function setActive(i, scroll) {
    items.forEach((li, k) => li.classList.toggle('active', k === i));
    active = i;
    if (i >= 0) {
      menu.setAttribute('aria-activedescendant', items[i].id);
      if (scroll) items[i].scrollIntoView({ block: 'nearest' });
    } else menu.removeAttribute('aria-activedescendant');
  }

  function build() {
    list.innerHTML = '';
    items = [];
    const cur = getValue();
    optList().forEach((o, i) => {
      const li = document.createElement('li');
      li.id = id + '-o' + i;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(o.value === cur));
      li.dataset.value = o.value;
      if (o.dot) { const d = document.createElement('i'); d.className = 'dd-dot'; d.style.background = o.dot; li.append(d); }
      const t = document.createElement('span'); t.className = 'dd-text'; t.textContent = o.label;
      li.append(t);
      if (o.value === cur) { const c = document.createElement('span'); c.className = 'dd-check'; c.innerHTML = CHECK_SVG; li.append(c); }
      li.addEventListener('pointerenter', () => setActive(i));
      li.addEventListener('pointerleave', () => { if (active === i) setActive(-1); });
      li.addEventListener('click', () => choose(i));
      list.append(li); items.push(li);
    });
  }

  function choose(i) {
    const o = optList()[i];
    if (!o) return;
    if (o.input) return askInput(i, o);
    close(true);
    onSelect(o.value);
  }

  /* opção "Personalizado…": o próprio item vira um campo de texto */
  function askInput(i, o) {
    const li = items[i];
    li.classList.add('editing');
    li.innerHTML = '';
    const inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'dd-input';
    inp.placeholder = o.input.placeholder || ''; inp.maxLength = o.input.maxLength || 24;
    inp.setAttribute('aria-label', o.label);
    li.append(inp);
    inp.focus();
    const done = (ok) => { const v = inp.value.trim(); close(true); if (ok && v) onSelect(v.slice(0, inp.maxLength)); };
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); done(true); }
      else if (e.key === 'Escape') { e.preventDefault(); done(false); }
    });
    li.onclick = (e) => e.stopPropagation();
  }

  function place() {
    const r = trigger.getBoundingClientRect();
    const mw = menu.offsetWidth, mh = menu.offsetHeight, gap = 10, pad = 8;
    let left = align === 'center' ? r.left + r.width / 2 - mw / 2 : align === 'end' ? r.right - mw : r.left;
    left = Math.max(pad, Math.min(left, innerWidth - mw - pad));
    let pl = placement;
    if (pl === 'top' && r.top - gap - mh < pad && innerHeight - r.bottom > r.top) pl = 'bottom';     // sem espaço: inverte
    if (pl === 'bottom' && r.bottom + gap + mh > innerHeight - pad && r.top > innerHeight - r.bottom) pl = 'top';
    const top = pl === 'top' ? r.top - gap - mh : r.bottom + gap;
    menu.dataset.placement = pl;
    menu.style.left = left + 'px';
    menu.style.top = Math.max(pad, top) + 'px';
    menu.style.setProperty('--ox', (r.left + r.width / 2 - left) + 'px');
  }

  const onDocDown = (e) => { if (!menu.contains(e.target) && !trigger.contains(e.target)) close(false); };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(true); }
    else if (e.key === 'Tab') close(false);
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active < 0 ? 0 : (active + 1) % items.length, true); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active < 0 ? items.length - 1 : (active - 1 + items.length) % items.length, true); }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0, true); }
    else if (e.key === 'End') { e.preventDefault(); setActive(items.length - 1, true); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (active >= 0) choose(active); }
  };

  function open() {
    if (isOpen) return;
    if (ddOpen) ddOpen.close(false);
    build();
    document.body.append(menu);
    isOpen = true; ddOpen = api;
    place();
    requestAnimationFrame(() => menu.classList.add('open'));
    trigger.setAttribute('aria-expanded', 'true');
    trigger.classList.add('dd-open');
    const sel = items.findIndex((li) => li.getAttribute('aria-selected') === 'true');
    setActive(sel, true);
    menu.focus({ preventScroll: true });
    document.addEventListener('pointerdown', onDocDown, true);
    menu.addEventListener('keydown', onKey);
    addEventListener('resize', place);
    addEventListener('blur', onBlur);
  }
  const onBlur = () => close(false);

  function close(refocus) {
    if (!isOpen) return;
    isOpen = false; if (ddOpen === api) ddOpen = null;
    menu.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.classList.remove('dd-open');
    document.removeEventListener('pointerdown', onDocDown, true);
    menu.removeEventListener('keydown', onKey);
    removeEventListener('resize', place);
    removeEventListener('blur', onBlur);
    const done = () => menu.remove();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) done(); else setTimeout(() => { if (!isOpen) done(); }, 180);
    if (refocus) trigger.focus({ preventScroll: true });
  }

  trigger.addEventListener('click', () => (isOpen ? close(true) : open()));
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); }
  });

  const api = { open, close, get isOpen() { return isOpen; } };
  return api;
}
