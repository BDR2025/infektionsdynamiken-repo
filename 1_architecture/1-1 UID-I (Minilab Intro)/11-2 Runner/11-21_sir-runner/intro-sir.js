/*!
 * File:      intro-sir.js
 * Project:   Understanding Infection Dynamics · Infektionsdynamiken verstehen
 * Type:      Open Educational Resource (OER)
 * Authors:   B. D. Rausch · A. Heinz
 * Contact:   info@infectiondynamics.eu · info@infektionsdynamiken.de
 * License:   CC BY 4.0
 *
 * Created:   2025-09-16
 * Updated:   2025-09-25
 * Version:   3.0.0
 * Changelog: - v3.0.0 OER-Kopfzeile vereinheitlicht; Kommentare konsolidiert; Bezeichnung "Runner" klargestellt (keine Logikänderungen)
 *            - v3.0   FPS-unabhängiges Timing via rAF-Delta; konsistente Dauern auf HiDPI
 *            - v2.2   Sequenz angepasst: kein Wipe vor Blau; Wipe erst vor Schritt 4
 */

/* =======================================================================
   UID-Intro · Runner (SIR)
   - Deterministische SIR-Simulation auf N=1 (Fraktionsskala)
   - Visualisierung als Custom-Canvas (ohne Chart.js)
   - Dramaturgische Sequenz pro Coach (sichtbare Kurven, Wipes, Dauer)
   - KPI-Updates als CustomEvent 'idv:intro:kpi' für Boot → KPI-Decks
   ======================================================================= */

export function mountIntroSIR(userOpts = {}) {
  // Kontext (lang/mode/coach) aus <html> lesen
  const root  = document.documentElement;
  const lang  = (root.lang || 'de').toLowerCase();
  const mode  = (root.dataset.mode || 'school').toLowerCase();
  const coach = (root.dataset.coach
                || (lang==='de' ? (mode==='university'?'mila':'ben')
                               : (mode==='university'?'archer':'chloe'))).toLowerCase();

  // Canvas-Host beziehen (direkt oder via Selector)
  const canvas = (typeof userOpts.canvas === 'string')
    ? document.querySelector(userOpts.canvas)
    : (userOpts.canvas || document.getElementById('intro-canvas'));

  if (!canvas) {
    console.error('[intro-sir] canvas not found');
    return { play(){}, stop(){}, isRunning(){ return false; } };
  }

  // Modell-Parameter (Fraktionsskala N=1; Intro zeigt Prozentwerte)
  const PARAMS = { R0: 2.2, D: 7, I0: 1e-6, N: 1, T: 180, dt: 0.25 };

  // Dramaturgische Sequenzen pro Coach
  const SEQUENCES = {
    ben: [
      { visible:['I'],          duration:  4, carryPrev:false, resetBefore:false },
      { visible:['S'],          duration:  4, carryPrev:true,  resetBefore:false },
      { visible:['R'],          duration:  4, carryPrev:true,  resetBefore:false },
      { visible:['S','I','R'],  duration:  4, carryPrev:false, resetBefore:true  }
    ],
    mila: [
      { visible:['I'],          duration:  4, carryPrev:false, resetBefore:false },
      { visible:['S'],          duration:  4, carryPrev:true,  resetBefore:false },
      { visible:['R'],          duration:  4, carryPrev:true,  resetBefore:false },
      { visible:['S','I','R'],  duration:  4, carryPrev:false, resetBefore:true  }
    ],
    chloe: [
      { visible:['I'],          duration:  4, carryPrev:false, resetBefore:false },
      { visible:['S'],          duration:  4, carryPrev:true,  resetBefore:false },
      { visible:['R'],          duration:  4, carryPrev:true,  resetBefore:false },
      { visible:['S','I','R'],  duration:  4, carryPrev:false, resetBefore:true  }
    ],
    archer: [
      { visible:['I'],          duration:  4, carryPrev:false, resetBefore:false },
      { visible:['S'],          duration:  4, carryPrev:true,  resetBefore:false },
      { visible:['R'],          duration:  4, carryPrev:true,  resetBefore:false },
      { visible:['S','I','R'],  duration:  4, carryPrev:false, resetBefore:true  }
    ]
  };

  // Datenreihen integrieren, Renderer und Player aufsetzen
  const series   = integrateSIRfrac(PARAMS);
  const renderer = createRenderer(canvas, series, lang);
  const player   = createSequencePlayer(series, renderer, PARAMS);

  // KPI-Bridge nach außen (Boot: onUpdate)
  if (typeof userOpts.onUpdate === 'function') {
    window.addEventListener('idv:intro:kpi', e => userOpts.onUpdate(e.detail || {}));
  }

  // Öffentliche Runner-API
  return {
    play()      { player.play(SEQUENCES[coach] || SEQUENCES.ben); },
    stop()      { player.stop(); },
    isRunning() { return player.isRunning(); }
  };
}

export default mountIntroSIR;

/* =========================== Integration (SIR; N=1) ==================== */
/* Euler-Vorwärtsschritt auf Fraktionsskala; liefert S, I, R und t */
function integrateSIRfrac({ R0, D, I0, N, T, dt }) {
  const steps = Math.floor(T / dt) + 1;
  const S = new Float64Array(steps);
  const I = new Float64Array(steps);
  const R = new Float64Array(steps);
  const t = new Float64Array(steps);

  const gamma = 1 / D;
  const beta  = R0 * gamma;

  S[0] = 1 - I0; I[0] = I0; R[0] = 0; t[0] = 0;

  for (let k = 1; k < steps; k++) {
    const s = S[k-1], i = I[k-1], r = R[k-1];
    const newInf = beta * s * i;
    const dS = -newInf;
    const dI =  newInf - gamma * i;
    const dR =  gamma * i;

    S[k] = s + dt * dS;
    I[k] = i + dt * dI;
    R[k] = r + dt * dR;
    t[k] = k * dt;
  }

  return { S, I, R, t, R0, D, dt, T, N: 1 };
}

/* ============================== Renderer =============================== */
/* Zeichnet Gitter und Kurven; unterscheidet statische Spuren und animierte Anteile */
function createRenderer(canvas, series, lang) {
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const css = getComputedStyle(document.documentElement);
  const col = {
    grid: css.getPropertyValue('--border').trim() || '#e5e7eb',
    ink:  css.getPropertyValue('--fg').trim()     || '#0b1520',
    S:    css.getPropertyValue('--c-s').trim()    || '#22c55e',
    I:    css.getPropertyValue('--c-i').trim()    || '#ef4444',
    R:    css.getPropertyValue('--c-r').trim()    || '#3b82f6'
  };
  const ctx = canvas.getContext('2d');

  function resize() {
    const w = canvas.clientWidth  || canvas.width;
    const h = canvas.clientHeight || canvas.height;
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  const PAD = { l: 50, r: 20, t: 16, b: 36 };
  const x = (i) => PAD.l + ((canvas.clientWidth  - PAD.l - PAD.r) * (i / (series.t.length - 1)));
  const y = (f) => PAD.t + ((canvas.clientHeight - PAD.t - PAD.b) * (1 - f));

  function grid() {
    ctx.save();
    ctx.strokeStyle = col.grid;
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75, 1.0].forEach(fr => {
      const yy = y(fr);
      ctx.beginPath(); ctx.moveTo(PAD.l, yy); ctx.lineTo(canvas.clientWidth - PAD.r, yy); ctx.stroke();
    });
    ctx.restore();
  }

  function drawLine(arr, c, a = 1, upto = null) {
    ctx.save();
    ctx.strokeStyle = c;
    ctx.globalAlpha = a;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const n = (upto == null) ? arr.length : Math.max(1, Math.min(arr.length, upto | 0));
    for (let i = 0; i < n; i++) {
      const xx = x(i), yy = y(arr[i]);
      if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
    ctx.restore();
  }

  function draw(idx, view) {
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    grid();

    const anim = new Set(view.animate || []);
    const stat = new Set(view.static  || []);

    // volle Spuren
    stat.has('S') && drawLine(series.S, col.S, 1, null);
    stat.has('I') && drawLine(series.I, col.I, 1, null);
    stat.has('R') && drawLine(series.R, col.R, 1, null);

    // animierte Abschnitte
    anim.has('S') && drawLine(series.S, col.S, 1, idx);
    anim.has('I') && drawLine(series.I, col.I, 1, idx);
    anim.has('R') && drawLine(series.R, col.R, 1, idx);

    ctx.save();
    ctx.fillStyle = col.ink;
    ctx.font = '12px system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
    ctx.fillText(lang === 'de' ? 'Tage' : 'days', canvas.clientWidth - 48, canvas.clientHeight - 10);
    ctx.restore();
  }

  return { draw };
}

/* =========================== Sequence Player =========================== */
/* Steuert Schrittfolgen, Timing und KPI-Dispatch (rAF-Delta, FPS-unabhängig) */
function createSequencePlayer(series, renderer, PARAMS) {
  let raf = 0, running = false, idx = 0, stepIdx = -1, lastT = 0;
  const totalIdx = series.t.length - 1;

  let carried = new Set(); // statische Spuren über Schritte
  let visible = new Set(); // animierte Kurven dieses Schritts

  function next(steps) {
    stepIdx++;
    if (stepIdx >= steps.length) { running = false; return null; }
    const s = steps[stepIdx] || {};

    if (s.resetBefore) carried.clear();
    idx = 0;
    lastT = 0;

    const duration = Math.max(0.1, +s.duration || 8);
    const speed = (totalIdx - 0) / duration;

    visible = new Set(s.visible || ['S','I','R']);
    if (s.carryPrev) {
      const prev = steps[Math.max(0, stepIdx - 1)]?.visible || [];
      prev.forEach(c => carried.add(c));
    }
    return { s, speed };
  }

  function broadcast() {
    const i = Math.max(0, Math.min(series.t.length - 1, idx | 0));
    const S = series.S[i], I = series.I[i], R = series.R[i];
    const vis = new Set([...visible, ...carried]);

    const detail = {
      t: Math.floor(series.t[i] + 1e-6),
      r0: PARAMS.R0,
      reff: vis.has('S') ? (PARAMS.R0 * S) : PARAMS.R0
    };
    if (vis.has('S')) detail.sRel = 100 * S;
    if (vis.has('I')) detail.iRel = 100 * I;
    if (vis.has('R')) detail.rRel = 100 * R;

    try { window.dispatchEvent(new CustomEvent('idv:intro:kpi', { detail })); } catch(e) {}
  }

  function tick(time, steps, ctx) {
    if (!running) return;

    if (!lastT) lastT = time;
    const dt = Math.min(0.1, (time - lastT) / 1000);
    lastT = time;

    const { s, speed } = ctx;

    renderer.draw(idx, { static: Array.from(carried), animate: Array.from(visible), emphasis: s.emphasis || 'all' });
    broadcast();

    idx += speed * dt;

    if (idx >= totalIdx) {
      const nextCtx = next(steps);
      if (nextCtx) raf = requestAnimationFrame(t => tick(t, steps, nextCtx));
      else { running = false; raf = 0; }
    } else {
      raf = requestAnimationFrame(t => tick(t, steps, ctx));
    }
  }

  function play(steps) {
    stop();
    running = true; stepIdx = -1; carried.clear();
    const ctx = next(steps); if (!ctx) { running = false; return; }
    raf = requestAnimationFrame(t => tick(t, steps, ctx));
  }

  function stop() { running = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  function isRunning() { return running; }

  return { play, stop, isRunning };
}
