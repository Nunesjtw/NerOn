/* arquivo: js/diagnostics.js — Diagnóstico no console (F12): resolução, fps e limites de envio. */

/* ---------- diagnóstico (aparece no console, F12) ---------- */
setInterval(async () => {
  if (screenStream) {
    const s = screenStream.getVideoTracks()[0].getSettings();
    console.log('captura:', s.width + 'x' + s.height, s.frameRate + 'fps');
  }
  for (const p of peers.values()) {
    (await p.pc.getStats()).forEach((r) => {
      if (r.type === 'outbound-rtp' && r.kind === 'video')
        console.log('envio:', r.frameWidth + 'x' + r.frameHeight, r.framesPerSecond + 'fps', 'limite:', r.qualityLimitationReason, 'codec:', r.encoderImplementation);
    });
  }
}, 3000);
