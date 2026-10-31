/* arquivo: js/volume.js — Volume individual de cada participante (lembrado pelo nome). */

/* ---------- volume individual (lembrado pelo nome da pessoa) ---------- */
function getVol(n) {
  try { const v = parseFloat(localStorage.getItem('vol:' + n)); return isFinite(v) ? Math.min(1, Math.max(0, v)) : 1; } catch (e) { return 1; }
}
function setVol(id, v) {
  const p = peers.get(id);
  if (!p) return;
  p.vol = v;
  p.els.forEach((el) => (el.volume = v));
  try { localStorage.setItem('vol:' + p.name, v); } catch (e) {}
}
let dragVol = false, pendingUi = false;   // não redesenha a lista enquanto o slider está sendo arrastado
window.addEventListener('pointerup', () => { if (dragVol) { dragVol = false; if (pendingUi) { pendingUi = false; ui(); } } });
