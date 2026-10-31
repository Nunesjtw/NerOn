/* arquivo: js/mascot.js — Olhos do coelhinho seguem o mouse. */

/* ---------- coelhinho: olhos seguem o mouse ---------- */
const irises = [...document.querySelectorAll('#bunny .iris')];
addEventListener('pointermove', (e) => {
  irises.forEach((g) => {
    const r = g.parentNode.querySelector('.sclera').getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const a = Math.atan2(e.clientY - cy, e.clientX - cx);
    const d = Math.min(Math.hypot(e.clientX - cx, e.clientY - cy) / 90, 1) * 3.8;
    g.style.transform = 'translate(' + Math.cos(a) * d + 'px,' + Math.sin(a) * d + 'px)';
  });
});
