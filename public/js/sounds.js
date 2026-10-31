/* arquivo: js/sounds.js — Sons de entrada e saída da call. */

/* ---------- sons de entrada e saída ---------- */
const sfx = { join: new Audio('sounds/join.wav'), leave: new Audio('sounds/leave.wav') };
Object.values(sfx).forEach((a) => { a.preload = 'auto'; a.volume = 0.6; });
function beep(kind) {
  if (deaf) return;
  try { const a = sfx[kind]; a.currentTime = 0; a.play().catch(() => {}); } catch (e) {}
}
