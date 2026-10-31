/* arquivo: js/fullscreen.js — Botão de tela cheia nas telas compartilhadas. */

/* ---------- tela cheia ---------- */
function toggleFS(tile, v) {
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    return;
  }
  const f = tile.requestFullscreen || tile.webkitRequestFullscreen;
  if (f) f.call(tile);
  else v.webkitEnterFullscreen?.();
}
function addFS(tile, v) {
  const b = document.createElement('button');
  b.className = 'fs';
  b.title = 'Tela cheia (ou clique duas vezes)';
  b.setAttribute('aria-label', 'Tela cheia');
  b.innerHTML = svg('expand', 18);
  b.onclick = (e) => { e.stopPropagation(); toggleFS(tile, v); };
  tile.append(b);
  tile.ondblclick = () => toggleFS(tile, v);
}
function syncFS() {
  const fe = document.fullscreenElement || document.webkitFullscreenElement;
  document.querySelectorAll('.fs').forEach((b) => { b.innerHTML = svg(fe === b.parentNode ? 'shrink' : 'expand', 18); });
}
document.addEventListener('fullscreenchange', syncFS);
document.addEventListener('webkitfullscreenchange', syncFS);
