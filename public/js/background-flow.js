/* arquivo: js/background-flow.js — Fundo animado de "fluxo de dados" (canvas). Expõe `flow`. */

/* ---------- fundo animado: fluxo de dados (canvas) ---------- */
const flow = (() => {
  const canvas = document.getElementById('flow');
  const host = canvas.parentElement;           // <main>, coluna central
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ajustes rápidos */
  const N = 40;          // pontos amostrados por curva
  const RADIUS = 150;    // alcance do mouse (px)
  const PULL = 2600;     // força de atração (negativo = repele)
  const K = 55;          // rigidez da mola (volta ao lugar)
  const DAMP = 9;        // amortecimento (menor = mais elástico)

  /* grupos de origem (frações da área): x, y inicial/final, linhas, colunas */
  const GROUPS = [
    { x: .085, y0: .18, y1: .31,  rows: 14, cols: 4, lineCols: 3 },
    { x: .060, y0: .52, y1: .575, rows: 7,  cols: 2, lineCols: 2 },
    { x: .105, y0: .71, y1: .80,  rows: 12, cols: 3, lineCols: 2 },
  ];
  const COL_FACTOR = [1, .55, .3, .16];

  let W = 0, H = 0, dpr = 1, active = false, raf = 0, last = 0;
  let lines = [], dots = [], grad = null, glow = null;
  const node = { x: 0, y: 0 };
  const mouse = { x: -9999, y: -9999 };

  function rng(seed) {                         // aleatório estável entre resizes
    return () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeLine(sx, sy, f, r) {
    const dx = node.x - sx;
    const k1 = .32 + r() * .06, k2 = .34 + r() * .08;
    const c1x = sx + dx * k1, c1y = sy;
    const c2x = node.x - dx * k2, c2y = node.y + (sy - node.y) * .03;
    const px = new Float32Array(N), py = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), m = 1 - t;
      const a = m * m * m, b = 3 * m * m * t, c = 3 * m * t * t, d = t * t * t;
      px[i] = a * sx + b * c1x + c * c2x + d * node.x;
      py[i] = a * sy + b * c1y + c * c2y + d * node.y;
    }
    return {
      px, py, f,
      ox: new Float32Array(N), oy: new Float32Array(N),
      vx: new Float32Array(N), vy: new Float32Array(N),
      b: .55 + r() * .45, hot: r() < .1,
      p: r(), speed: .09 + r() * .17,
    };
  }

  function build() {
    const r = rng(7);
    lines = []; dots = [];
    node.x = W * .8; node.y = H * .6;
    GROUPS.forEach((g) => {
      for (let c = 0; c < g.cols; c++) {
        const shift = c * .026 * H;
        const top = g.y0 * H - shift, bot = g.y1 * H - shift * 1.5;
        const x = g.x * W + c * W * .052 * (1 - c * .08);
        for (let i = 0; i < g.rows; i++) {
          const u = g.rows > 1 ? i / (g.rows - 1) : .5;
          const sx = x + u * 8, sy = top + (bot - top) * u;
          dots.push({ x: sx, y: sy, a: COL_FACTOR[c] });
          if (c < g.lineCols) lines.push(makeLine(sx, sy, COL_FACTOR[c], r));
        }
      }
    });
    // as linhas ficam mais fortes perto do nó (como no fluxo convergindo)
    grad = ctx.createLinearGradient(W * .05, 0, node.x, 0);
    grad.addColorStop(0, 'rgba(255,255,255,.025)');
    grad.addColorStop(.5, 'rgba(255,255,255,.05)');
    grad.addColorStop(.85, 'rgba(255,255,255,.14)');
    grad.addColorStop(1, 'rgba(255,255,255,.4)');
    glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 42);
    glow.addColorStop(0, 'rgba(246,181,122,.4)');
    glow.addColorStop(1, 'rgba(246,181,122,0)');
  }

  /* física elástica: cada ponto da curva é uma mola puxada pelo mouse */
  function step(dt) {
    const mx = mouse.x, my = mouse.y, R2 = RADIUS * RADIUS;
    for (const L of lines) {
      for (let i = 1; i < N - 1; i++) {
        let fx = 0, fy = 0;
        const dx = mx - L.px[i], dy = my - L.py[i], d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          const d = Math.sqrt(d2) + .001, q = 1 - d / RADIUS;
          const s = PULL * q * q * Math.min(d / 40, 1) / d;
          fx = dx * s; fy = dy * s;
        }
        L.vx[i] += (-K * L.ox[i] - DAMP * L.vx[i] + fx) * dt;
        L.vy[i] += (-K * L.oy[i] - DAMP * L.vy[i] + fy) * dt;
        L.ox[i] += L.vx[i] * dt;
        L.oy[i] += L.vy[i] * dt;
      }
      L.p += L.speed * dt;
      if (L.p > 1) L.p -= 1;
    }
  }

  const pos = { x: 0, y: 0 };
  function at(L, t) {                           // posição na curva já deformada
    const fi = t * (N - 1), i = Math.min(fi | 0, N - 2), fr = fi - i;
    pos.x = (L.px[i] + L.ox[i]) * (1 - fr) + (L.px[i + 1] + L.ox[i + 1]) * fr;
    pos.y = (L.py[i] + L.oy[i]) * (1 - fr) + (L.py[i + 1] + L.oy[i + 1]) * fr;
  }

  function draw(now) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    // pontos de origem
    ctx.fillStyle = '#fff';
    for (const d of dots) {
      ctx.globalAlpha = d.a * .8;
      ctx.fillRect(d.x - 1, d.y - 1, 2, 2);
    }

    // linhas
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = grad;
    for (const L of lines) {
      ctx.globalAlpha = Math.min(1, L.f * L.b * (L.hot ? 2.2 : 1));
      ctx.beginPath();
      ctx.moveTo(L.px[0], L.py[0]);
      for (let i = 1; i < N - 1; i++) {
        const x = L.px[i] + L.ox[i], y = L.py[i] + L.oy[i];
        const nx = L.px[i + 1] + L.ox[i + 1], ny = L.py[i + 1] + L.oy[i + 1];
        ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
      }
      ctx.lineTo(L.px[N - 1], L.py[N - 1]);
      ctx.stroke();
    }

    // partículas viajando pelas curvas
    ctx.fillStyle = '#fff';
    for (const L of lines) {
      const ramp = Math.sqrt(Math.sin(Math.PI * L.p)) * (.35 + .65 * L.p);
      for (let k = 0; k < 3; k++) {
        const t = L.p - k * .012;
        if (t < 0) continue;
        at(L, t);
        ctx.globalAlpha = ramp * (1 - k * .32) * (.35 + .65 * L.f) * .8;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 1.4 - k * .3, 0, 6.2832);
        ctx.fill();
      }
    }

    // nó central
    const pulse = .5 + .5 * Math.sin(now * .0016);
    ctx.save();
    ctx.translate(node.x, node.y);
    ctx.globalAlpha = .55 + .3 * pulse;
    ctx.fillStyle = glow;
    ctx.fillRect(-42, -42, 84, 84);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(240,238,236,.95)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-6, -6, 12, 12, 3); else ctx.rect(-6, -6, 12, 12);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    if (!W) return;
    step(dt);
    draw(now);
  }
  function start() { if (raf || reduce) return; last = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  function resize() {
    if (!active) return;
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) { W = H = 0; return; }
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = w; H = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    build();
    if (reduce) draw(0);                        // sem movimento: um quadro estático
  }

  function setActive(on) {
    on = !!on;
    if (on === active) return;
    active = on;
    canvas.classList.toggle('on', on);
    if (on) { resize(); start(); } else stop();
  }

  host.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  host.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(host);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else if (active) start();
  });

  setActive(true);
  return { setActive };
})();
