/*!
 * File:      intro-seir.js
 * Project:   Understanding Infection Dynamics · Infektionsdynamiken verstehen
 * Type:      Open Educational Resource (OER)
 * Authors:   B. D. Rausch · A. Heinz
 * Contact:   info@infectiondynamics.eu · info@infektionsdynamiken.de
 * License:   CC BY 4.0
 *
 * Created:   2025-09-16
 * Updated:   2025-09-25
 * Version:   3.0.0
 * Changelog: - v3.0.0 OER-Kopfzeile vereinheitlicht; rAF-Delta-Timing; Peak-Gating für E/I;
 *                     konsistente Runner-Annotationen; Bezeichnung "Runner" klargestellt
 */

/* =======================================================================
   UID-Intro · Runner (SEIR)
   - Deterministische SEIR-Simulation auf N=1 (Fraktionsskala)
   - Visualisierung als Custom-Canvas (ohne Chart.js)
   - Dramaturgische Sequenz pro Coach (sichtbare Kurven, Wipes, Dauer)
   - KPI-Updates als CustomEvent 'idv:intro:kpi' für Boot → KPI-Decks
   ======================================================================= */

export function mountIntroSEIR(userOpts = {}) {
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
    console.error('[intro-seir] canvas not found');
    return { play(){}, stop(){}, isRunning(){ return false; } };
  }

  // Modell-Parameter (Fraktionsskala N=1; Intro zeigt Prozentwerte)
  const PARAMS = { R0: 3.0, D: 7, L: 7, I0: 1e-6, N: 1, T: 275, dt: 0.25 };

  // Dramaturgische Sequenzen pro Coach
  const SEQUENCES = {
    ben: [
      { visible:['E'],              duration:  4, carryPrev:false, resetBefore:false },
      { visible:['I'],              duration:  4, carryPrev:true,  resetBefore:false },
      { visible:['S'],              duration:  4, carryPrev:true,  resetBefore:false },
      { visible:['S','E','I','R'],  duration:  4, carryPrev:false, resetBefore:true  }
    ],
    mila: [
      { visible:['E'],              duration:  4, carryPrev:false, resetBefore:false },
      { visible:['I'],              duration:  4, carryPrev:true,  resetBefore:false },
      { visible:['S'],              duration:  4, carryPrev:true,  resetBefore:false },
      { visible:['S','E','I','R'],  duration:  4, carryPrev:false, resetBefore:true  }
    ],
    chloe: [
      { visible:['E'],              duration:  4, carryPrev:false, resetBefore:false },
      { visible:['I'],              duration:  4, carryPrev:true,  resetBefore:false },
      { visible:['S'],              duration:  4, carryPrev:true,  resetBefore:false },
      { visible:['S','E','I','R'],  duration:  4, carryPrev:false, resetBefore:true  }
    ],
    archer: [
      { visible:['E'],              duration:  4, carryPrev:false, resetBefore:false },
      { visible:['I'],              duration:  4, carryPrev:true,  resetBefore:false },
      { visible:['S'],              duration:  4, carryPrev:true,  resetBefore:false },
      { visible:['S','E','I','R'],  duration:  4, carryPrev:false, resetBefore:true  }
    ]
  };

  // Datenreihen integrieren, Renderer und Player aufsetzen
  const series   = integrateSEIRfrac(PARAMS);
  const peaks    = { E: findPeak(series.E, series.t), I: findPeak(series.I, series.t) };
  const renderer = createRenderer(canvas, series, lang, peaks);
  const player   = createSequencePlayer(series, renderer, PARAMS, peaks);

  // KPI-Bridge nach außen (Boot: onUpdate)
  if (typeof userOpts.onUpdate === 'function') {
    const onKPI = (e) => userOpts.onUpdate(e.detail || {});
    window.addEventListener('idv:intro:kpi', onKPI);
    // Optionaler Cleanup: beim Stop-Override entfernen (non-breaking)
    const origStop = player.stop;
    player.stop = function() {
      try { window.removeEventListener('idv:intro:kpi', onKPI); } catch(_) {}
      return origStop();
    };
  }

  // Öffentliche Runner-API
  return {
    play(opts) { player.play(SEQUENCES[coach] || SEQUENCES.ben, opts); },
    stop()     { player.stop(); },
    isRunning(){ return player.isRunning(); }
  };
}

export default mountIntroSEIR;

/* =========================== Integration (SEIR; N=1) ==================== */
/* Euler-Vorwärtsschritt auf Fraktionsskala; liefert S, E, I, R und t */
function integrateSEIRfrac({ R0, D, L, I0, N, T, dt }) {
  const steps = Math.floor(T / dt) + 1;
  const S = new Float64Array(steps);
  const E = new Float64Array(steps);
  const I = new Float64Array(steps);
  const R = new Float64Array(steps);
  const t = new Float64Array(steps);

  const gamma = 1 / D;
  const sigma = 1 / L;
  const beta  = R0 * gamma;

  S[0] = 1 - I0; E[0] = 0; I[0] = I0; R[0] = 0; t[0] = 0;

  for (let k = 1; k < steps; k++) {
    const s = S[k-1], e = E[k-1], i = I[k-1], r = R[k-1];
    const newInf = beta * s * i;
    const dS = -newInf;
    const dE =  newInf - sigma * e;
    const dI =  sigma * e - gamma * i;
    const dR =  gamma * i;

    S[k] = s + dt * dS;
    E[k] = e + dt * dE;
    I[k] = i + dt * dI;
    R[k] = r + dt * dR;
    t[k] = k * dt;
  }

  return { S, E, I, R, t, R0, D, L, dt, T, N: 1 };
}

/* ============================== Helpers ================================= */
function findPeak(arr, t) {
  let idx = 0, val = -Infinity;
  for (let i = 0; i < arr.length; i++) { if (arr[i] > val) { val = arr[i]; idx = i; } }
  return { index: idx, value: 100 * val, day: Math.floor(t[idx] + 1e-6) };
}

/* ============================== Renderer =============================== */
/* Zeichnet Gitter, Kurven und Peak-Linien; unterscheidet statische Spuren und animierte Anteile */
function createRenderer(canvas, series, lang, peaks) {
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const css = getComputedStyle(document.documentElement);
  const col = {
    grid: css.getPropertyValue('--border').trim() || '#e5e7eb',
    ink:  css.getPropertyValue('--fg').trim()     || '#0b1520',
    S:    css.getPropertyValue('--c-s').trim()    || '#22c55e',
    E:    css.getPropertyValue('--c-e').trim()    || '#a855f7',
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

  function drawVLineAt(idx, label, color) {
    const xx = x(idx);
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = color || col.ink;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(xx, y(0)); ctx.lineTo(xx, y(1)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color || col.ink;
    ctx.font = '12px system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
    ctx.fillText(label, Math.max(PAD.l, Math.min(xx + 6, canvas.clientWidth - 60)), PAD.t + 12);
    ctx.restore();
  }

  function draw(idx, view, flags) {
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    grid();

    const anim = new Set(view.animate || []);
    const stat = new Set(view.static  || []);

    // volle Spuren
    stat.has('S') && drawLine(series.S, col.S, 1, null);
    stat.has('E') && drawLine(series.E, col.E, 1, null);
    stat.has('I') && drawLine(series.I, col.I, 1, null);
    stat.has('R') && drawLine(series.R, col.R, 1, null);

    // animierte Abschnitte
    anim.has('S') && drawLine(series.S, col.S, 1, idx);
    anim.has('E') && drawLine(series.E, col.E, 1, idx);
    anim.has('I') && drawLine(series.I, col.I, 1, idx);
    anim.has('R') && drawLine(series.R, col.R, 1, idx);

    // Peaks einzeichnen, sobald freigeschaltet
    if (flags?.showE && peaks?.E) drawVLineAt(peaks.E.index, (lang==='de'?'Peak E':'Peak E'), col.E);
    if (flags?.showI && peaks?.I) drawVLineAt(peaks.I.index, (lang==='de'?'Peak I':'Peak I'), col.I);

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
function createSequencePlayer(series, renderer, PARAMS, peaks) {
  let raf = 0, running = false, idx = 0, stepIdx = -1, lastT = 0;
  const totalIdx = series.t.length - 1;

  let carried = new Set(); // statische Spuren über Schritte
  let visible = new Set(); // animierte Kurven dieses Schritts
  let showE = false, showI = false;

  function next(steps) {
    stepIdx++;
    if (stepIdx >= steps.length) { running = false; return null; }
    const s = steps[stepIdx] || {};

    if (s.resetBefore) { carried.clear(); showE = false; showI = false; }
    idx = 0;
    lastT = 0;

    const duration = Math.max(0.1, +s.duration || 8);
    const speed = (totalIdx - 0) / duration;

    visible = new Set(s.visible || ['S','E','I','R']);
    if (s.carryPrev) {
      const prev = steps[Math.max(0, stepIdx - 1)]?.visible || [];
      prev.forEach(c => carried.add(c));
    }
    return { s, speed };
  }

  function broadcast(flags) {
    const i = Math.max(0, Math.min(series.t.length - 1, idx | 0));
    const S = series.S[i], E = series.E[i], I = series.I[i], R = series.R[i];
    const vis = new Set([...visible, ...carried]);

    const detail = {
      t: Math.floor(series.t[i] + 1e-6),
      r0: PARAMS.R0,
      reff: vis.has('S') ? (PARAMS.R0 * S) : PARAMS.R0
    };
    if (vis.has('S')) detail.sRel = 100 * S;
    if (vis.has('E')) detail.eRel = 100 * E;
    if (vis.has('I')) detail.iRel = 100 * I;
    if (vis.has('R')) detail.rRel = 100 * R;

    if (flags?.showE && peaks?.E) detail.peakE = { value: peaks.E.value, day: peaks.E.day };
    if (flags?.showI && peaks?.I) detail.peakI = { value: peaks.I.value, day: peaks.I.day };

    try { window.dispatchEvent(new CustomEvent('idv:intro:kpi', { detail })); } catch(e) {}
  }

  function tick(time, steps, ctx) {
    if (!running) return;

    if (!lastT) lastT = time;
    const dt = Math.min(0.1, (time - lastT) / 1000);
    lastT = time;

    const { s, speed } = ctx;

    // Peaks freischalten, sobald erreicht und sichtbar
    if (!showE && peaks?.E && (idx >= peaks.E.index) && (visible.has('E') || carried.has('E'))) showE = true;
    if (!showI && peaks?.I && (idx >= peaks.I.index) && (visible.has('I') || carried.has('I'))) showI = true;

    renderer.draw(idx, { static: Array.from(carried), animate: Array.from(visible), emphasis: s.emphasis || 'all' }, { showE, showI });
    broadcast({ showE, showI });

    idx += speed * dt;

    if (idx >= totalIdx) {
      const nextCtx = next(steps);
      if (nextCtx) raf = requestAnimationFrame(t => tick(t, steps, nextCtx));
      else { running = false; raf = 0; }
    } else {
      raf = requestAnimationFrame(t => tick(t, steps, ctx));
    }
  }

  function play(steps, _opts) {
    stop();
    running = true; stepIdx = -1; carried.clear(); showE = false; showI = false;
    const ctx = next(steps); if (!ctx) { running = false; return; }
    raf = requestAnimationFrame(t => tick(t, steps, ctx));
  }

  function stop() { running = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  function isRunning() { return running; }

  return { play, stop, isRunning };
}
