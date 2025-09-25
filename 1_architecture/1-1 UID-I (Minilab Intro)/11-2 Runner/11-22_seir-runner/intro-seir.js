/* ========================================================================
   Infektionsdynamiken · Intro Runner (SEIR)
   Datei / File:        js/minilabs/intro/intro-seir.js
   Version:             v2.8
   Datum / Date:        2025-09-12
   Autor / Author:      B. D. Rausch · ChatGPT
   Lizenz / License:    CC BY 4.0  (https://creativecommons.org/licenses/by/4.0/)
   ------------------------------------------------------------------------
   DE · Zweck
   - Nicht‑interaktiver SEIR‑Intro‑Runner (Canvas, Prozent‑Skala).
   - Sequenzen stehen im JavaScript, coach‑spezifisch (KEIN JSON).
   - Horizontale Linien (25/50/75/100 %), t (Tag) ganzzahlig, Intro‑KPIs prozentual.
   - Rₑff dynamisch erst, wenn S sichtbar ist (didaktische Reduktion).
   - NEU v2.8: Peak‑Linien (grau, gestrichelt) für E und I erscheinen genau
     im Peak‑Moment; gleichzeitig werden die Peak‑KPIs (Wert & Tag) freigeschaltet.

   EN · Purpose
   - Non‑interactive SEIR Intro runner (canvas, percent scale).
   - Sequences defined in JavaScript per coach (NO JSON).
   - Horizontal grid only (25/50/75/100%), integer day counter; Intro KPIs in %.
   - R_eff becomes dynamic only when S is visible (didactic gating).
   - NEW v2.8: Grey dashed peak lines (E & I) appear exactly at peak time and
     unlock the corresponding peak KPIs (value & day) synchronously.
=========================================================================== */

/* ========================================================================
   SEQUENCES per Coach
   visible:    ['S'|'E'|'I'|'R']  → animierte Kurven in diesem Schritt
   emphasis:   's'|'e'|'i'|'r'|'s+r'|'i+e'|'all' → Fokus/Deckkraft
   carryPrev:  true → Spur der vorher animierten Kurven stehenlassen
   resetBefore:true → Chart vor dem Schritt abwischen
=========================================================================== */
const SEQUENCES = {
  // DE · School · Ben — Baseline (bitte so belassen)
  ben: [
    { visible:['I','E'],          emphasis:'i+e', duration:17, carryPrev:false, resetBefore:false },
    { visible:['S','R'],          emphasis:'s+r', duration:12, carryPrev:true,  resetBefore:false },
    { visible:['S','E','I','R'],  emphasis:'all', duration:6,  carryPrev:false, resetBefore:true  }
  ],
  // DE · University · Mila (Platzhalter – anpassbar)
  mila: [
    { visible:['I','E'],          emphasis:'i+e', duration:16, carryPrev:false, resetBefore:false },
    { visible:['S','R'],          emphasis:'s+r', duration:10, carryPrev:true,  resetBefore:false },
    { visible:['S','E','I','R'],  emphasis:'all', duration:10, carryPrev:false, resetBefore:true  }
  ],
  // EN · School · Chloé (Platzhalter – anpassbar)
  chloe: [
    { visible:['I','E'],          emphasis:'i+e', duration:12, carryPrev:false, resetBefore:false },
    { visible:['S','R'],          emphasis:'s+r', duration:8,  carryPrev:true,  resetBefore:false },
    { visible:['S','E','I','R'],  emphasis:'all', duration:8,  carryPrev:false, resetBefore:true  }
  ],
  // EN · University · Archer (Platzhalter – anpassbar)
  archer: [
    { visible:['I','E'],          emphasis:'i+e', duration:14, carryPrev:false, resetBefore:false },
    { visible:['S','R'],          emphasis:'s+r', duration:10, carryPrev:true,  resetBefore:false },
    { visible:['S','E','I','R'],  emphasis:'all', duration:10, carryPrev:false, resetBefore:true  }
  ]
};

/* ========================================================================
   PUBLIC ENTRY
=========================================================================== */
export function mountIntroSEIR(userOpts = {}){
  const root  = document.documentElement;
  const lang  = (root.getAttribute('lang') || 'de').toLowerCase();
  const mode  = (root.getAttribute('data-mode') || 'school').toLowerCase();
  const coach = (root.getAttribute('data-coach') || (
      lang==='de' ? (mode==='university' ? 'mila' : 'ben')
                  : (mode==='university' ? 'archer' : 'chloe')
    )).toLowerCase();

  const canvas = (typeof userOpts.canvas === 'string')
    ? document.querySelector(userOpts.canvas)
    : (userOpts.canvas || document.getElementById('intro-canvas'));
  if (!canvas){ console.error('[intro-seir] canvas not found'); return apiStub(); }

  /* --------------------------------------------------------------------
     PARAMS (FRACTIONAL MODEL) — Werte untereinander + Annotationen
  -------------------------------------------------------------------- */
  const PARAMS = {
    R0:  3,      // Basisreproduktionszahl (absolut) / absolute R
    D:   7,      // infektiöse Dauer D (Tage) → γ = 1/D / infectious period (days)
    L:   7,      // Latenz L (Tage)          → σ = 1/L / latent period (days)
    I0:  1e-6,   // Indexfall als Anteil (N=1) / index case (fraction)
    N:   1,      // normalisierte Population / normalized population
    T:   275,    // Gesamtdauer (Tage) / total days
    dt:  0.25    // Zeitschritt (Tage) / time step (days)
  };

  // Precompute full time series (fractions; N=1)
  const series   = integrateSEIRfrac(PARAMS);
  const renderer = createRendererRestore(canvas, series, lang);
  const player   = createSequencePlayer(series, renderer, PARAMS);

  // Allow external onUpdate hook (optional)
  const onUpdate = (typeof userOpts.onUpdate === 'function') ? userOpts.onUpdate : null;
  if (onUpdate) window.addEventListener('idv:intro:kpi', (e)=> onUpdate(e.detail||{}));

  return {
    play(){ player.play(SEQUENCES[coach] || SEQUENCES.ben); },
    stop(){ player.stop(); },
    isRunning(){ return player.isRunning(); }
  };
}

export default mountIntroSEIR;

/* ========================================================================
   SEIR integration (fractional; N = 1 → values in [0..1])
=========================================================================== */
function integrateSEIRfrac({ R0, D, L, I0, N, T, dt }){
  const steps = Math.floor(T / dt) + 1;
  const S = new Float64Array(steps);
  const E = new Float64Array(steps);
  const I = new Float64Array(steps);
  const R = new Float64Array(steps);
  const t = new Float64Array(steps);

  const gamma = 1 / D, sigma = 1 / L, beta = R0 * gamma;

  S[0] = 1 - I0; E[0] = 0; I[0] = I0; R[0] = 0; t[0] = 0;

  for (let k=1; k<steps; k++){
    const s=S[k-1], e=E[k-1], i=I[k-1], r=R[k-1];
    const newInf = beta * s * i; // N=1
    const dS = - newInf;
    const dE =   newInf - sigma * e;
    const dI =   sigma * e - gamma * i;
    const dR =   gamma * i;
    S[k] = s + dt*dS;
    E[k] = e + dt*dE;
    I[k] = i + dt*dI;
    R[k] = r + dt*dR;
    t[k] = k * dt;
  }
  return { S,E,I,R,t, R0, D, L, dt, T, N:1 };
}

/* ========================================================================
   Renderer (percent‑only, horizontal grid + optional peak lines)
=========================================================================== */
function createRendererRestore(canvas, series, lang){
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const css = getComputedStyle(document.documentElement);
  const col = {
    bg:   css.getPropertyValue('--panel').trim() || '#fff',
    grid: css.getPropertyValue('--border').trim() || '#e5e7eb',
    ink:  css.getPropertyValue('--fg').trim() || '#0b1520',
    S:    css.getPropertyValue('--c-s').trim() || '#22c55e',
    E:    css.getPropertyValue('--c-e').trim() || '#F59E0B',
    I:    css.getPropertyValue('--c-i').trim() || '#ef4444',
    R:    css.getPropertyValue('--c-r').trim() || '#3b82f6'
  };
  const ctx = canvas.getContext('2d');

  function resize(){
    const w = canvas.clientWidth  || canvas.width;
    const h = canvas.clientHeight || canvas.height;
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resize(); window.addEventListener('resize', resize);

  const PAD = { l: 50, r: 20, t: 16, b: 36 };
  function xOf(i){ return PAD.l + ((canvas.clientWidth-PAD.l-PAD.r) * (i / (series.t.length-1))); }
  function yOf(frac){ const h=(canvas.clientHeight-PAD.t-PAD.b); return PAD.t + h*(1-frac); }

  function clear(){ ctx.fillStyle = col.bg; ctx.fillRect(0,0,canvas.clientWidth,canvas.clientHeight); }
  function gridH(){
    ctx.save(); ctx.strokeStyle = col.grid; ctx.lineWidth = 1;
    [0.25,0.5,0.75,1.0].forEach(f=>{ const y=yOf(f); ctx.beginPath(); ctx.moveTo(PAD.l,y); ctx.lineTo(canvas.clientWidth-PAD.r,y); ctx.stroke(); });
    ctx.restore();
  }

  function drawLine(arr, color, alpha=1, uptoIndex=null){
    ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = 2;
    ctx.beginPath();
    const n = (uptoIndex==null) ? arr.length : Math.max(1, Math.min(arr.length, uptoIndex|0));
    for (let i=0; i<n; i++){ const x=xOf(i), y=yOf(arr[i]); if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }
    ctx.stroke(); ctx.restore();
  }

  function emphasisAlpha(token, curve){
    const t=(token||'all').toLowerCase();
    if (t.includes('all')) return 1;
    const on = (c)=>t.includes(c.toLowerCase());
    return on('s')&&curve==='S' || on('e')&&curve==='E' || on('i')&&curve==='I' || on('r')&&curve==='R' ? 1 : 0.25;
  }

  function drawVLines(vlines){
    if (!vlines || !vlines.length) return;
    ctx.save();
    ctx.setLineDash([4,4]);
    ctx.strokeStyle = col.grid;       // dezent grau
    ctx.fillStyle   = col.grid;
    ctx.lineWidth   = 1;
    vlines.forEach(v => {
      const x = xOf(v.index);
      ctx.beginPath();
      ctx.moveTo(x, PAD.t);
      ctx.lineTo(x, canvas.clientHeight - PAD.b);
      ctx.stroke();
      // Label oben (klein)
      const label = v.label || (v.kind==='E' ? (lang==='de' ? 'Peak E' : 'Peak E') : (lang==='de' ? 'Peak I' : 'Peak I'));
      ctx.save();
      ctx.font = '11px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(label, x, PAD.t + 2);
      ctx.restore();
    });
    ctx.restore();
  }

  function drawStaged(idx, view){
    clear(); gridH();
    // Peak lines under curves
    drawVLines(view.vlines);

    const anim = new Set(view.animate||[]);
    const stat = new Set(view.static||[]);
    // static first (full trace)
    stat.has('S') && drawLine(series.S, col.S, 1, null);
    stat.has('E') && drawLine(series.E, col.E, 1, null);
    stat.has('I') && drawLine(series.I, col.I, 1, null);
    stat.has('R') && drawLine(series.R, col.R, 1, null);
    // animated up to idx
    anim.has('S') && drawLine(series.S, col.S, emphasisAlpha(view.emphasis,'S'), idx);
    anim.has('E') && drawLine(series.E, col.E, emphasisAlpha(view.emphasis,'E'), idx);
    anim.has('I') && drawLine(series.I, col.I, emphasisAlpha(view.emphasis,'I'), idx);
    anim.has('R') && drawLine(series.R, col.R, emphasisAlpha(view.emphasis,'R'), idx);

    ctx.save(); ctx.fillStyle = col.ink; ctx.font = '12px system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
    ctx.fillText(lang==='de' ? 'Tage' : 'days', canvas.clientWidth - 48, canvas.clientHeight - 10);
    ctx.restore();
  }

  return { drawStaged, PAD, xOf };
}

/* ========================================================================
   Sequence player (idx reset each step; resetBefore clears only static)
   + Peak‑Lines & KPI‑Sync
=========================================================================== */
function createSequencePlayer(series, renderer, PARAMS){
  let raf=0, running=false, idx=0, stepIdx=-1;
  const totalIdx = series.t.length-1;
  let carried = new Set();          // persistent static curves across steps
  let currentVisible = new Set();   // animated curves in current step

  // Precompute peaks (E & I)
  const peakE = findPeak(series.E, series.t);
  const peakI = findPeak(series.I, series.t);
  // Visibility flags for line & KPI reveal
  let showE = false, showI = false;

  function nextStep(steps){
    stepIdx++;
    if (stepIdx >= steps.length){ running=false; return null; }
    const s = steps[stepIdx] || {};

    if (s.resetBefore){ carried.clear(); }
    idx = 0; // restart animation at left for EACH step

    const duration = Math.max(0.1, +s.duration || 10);
    const speed = (totalIdx - 0) / duration;

    currentVisible = new Set(s.visible || ['S','E','I','R']);
    if (s.carryPrev){
      const prev = steps[Math.max(0, stepIdx-1)]?.visible || [];
      prev.forEach(c => carried.add(c));
    }

    return { s, speed };
  }

  function broadcast(idx){
    const i = Math.max(0, Math.min(series.t.length-1, idx|0));
    const S=series.S[i], E=series.E[i], I=series.I[i], R=series.R[i];
    const tInt = Math.floor(series.t[i] + 1e-6);
    const vis = new Set([...currentVisible, ...carried]);
    const reff = vis.has('S') ? (PARAMS.R0 * S) : PARAMS.R0;

    const detail = { t: tInt, r0: PARAMS.R0, reff };
    if (vis.has('S')) detail.sRel = 100*S;
    if (vis.has('E')) detail.eRel = 100*E;
    if (vis.has('I')) detail.iRel = 100*I;
    if (vis.has('R')) detail.rRel = 100*R;

    // Reveal peaks exactly at the moment we reach them
    if (!showE && (i >= peakE.index)){ showE = true; detail.peakE = { value: 100*peakE.value, day: peakE.day }; }
    if (!showI && (i >= peakI.index)){ showI = true; detail.peakI = { value: 100*peakI.value, day: peakI.day }; }

    try{ window.dispatchEvent(new CustomEvent('idv:intro:kpi', { detail })); }catch(e){}
  }

  function tick(steps, ctx){
    if (!running) return;
    const { s, speed } = ctx;

    // Compose vlines to draw (only those already revealed)
    const vlines = [];
    if (showE) vlines.push({ index: peakE.index, label: 'Peak E', kind:'E' });
    if (showI) vlines.push({ index: peakI.index, label: 'Peak I', kind:'I' });

    renderer.drawStaged(idx, {
      static:  Array.from(carried),
      animate: Array.from(currentVisible),
      emphasis: s.emphasis || 'all',
      vlines
    });

    broadcast(idx);

    idx += speed/60;
    if (idx >= totalIdx){
      const ctx2 = nextStep(steps);
      if (ctx2){ raf = requestAnimationFrame(()=>tick(steps, ctx2)); }
      else { running=false; raf=0; }
    }else{
      raf = requestAnimationFrame(()=>tick(steps, ctx));
    }
  }

  function play(steps){
    stop();
    running=true; stepIdx=-1; carried.clear();
    // reset peak reveals at start
    showE=false; showI=false;
    const ctx = nextStep(steps);
    if (!ctx){ running=false; return; }
    raf = requestAnimationFrame(()=>tick(steps, ctx));
  }

  function stop(){ running=false; if (raf){ cancelAnimationFrame(raf); raf=0; } }
  function isRunning(){ return running; }

  return { play, stop, isRunning };
}

function findPeak(arr, tArr){
  let idx = 0, val = arr[0];
  for (let i=1; i<arr.length; i++){ if (arr[i] > val){ val = arr[i]; idx = i; } }
  return { index: idx, value: val, day: tArr[idx] };
}

function apiStub(){ return { play:()=>{}, stop:()=>{}, isRunning:()=>false }; }
