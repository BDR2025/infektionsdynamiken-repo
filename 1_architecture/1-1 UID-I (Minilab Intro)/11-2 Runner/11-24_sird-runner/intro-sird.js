/*!
 * File:      intro-sird.js
 * Project:   Understanding Infection Dynamics · Infektionsdynamiken verstehen
 * Type:      Open Educational Resource (OER)
 * Authors:   B. D. Rausch · A. Heinz
 * Contact:   info@infectiondynamics.eu · info@infektionsdynamiken.de
 * License:   CC BY 4.0
 *
 * Created:   2025-09-25
 * Updated:   2025-09-26
 * Version:   3.0.0
 * Changelog: - v3.0.0 Marker ergänzt: D∞ (horizontal) und t₉₅(D) (vertikal) in D-Farbe;
 *              Marker-Gating wie SEIR: Einblendung erst ab Erreichen des Referenzpunkts;
 *              KPI-Payload, Sequenzen und API unverändert belassen
 */
/* =======================================================================
   UID-Intro · Runner (SIRD)
   - Deterministische SIRD-Simulation auf N=1 (Fraktionsskala)
   - Visualisierung als Custom-Canvas (ohne Chart-Bibliothek), DPI-aware
   - Dramaturgische Sequenz pro Coach (sichtbare Kurven, Wipes, Dauer)
   - KPI-Updates als CustomEvent 'idv:intro:kpi' für Boot → KPI-Decks
   - Marker im Chart: D∞ (horizontale Linie), t₉₅(D) (vertikale Linie) mit Gating
   ======================================================================= */

export function mountIntroSIRD(userOpts = {}) {
  const root  = document.documentElement;
  const lang  = (root.lang || 'de').toLowerCase();
  const mode  = (root.dataset.mode || 'school').toLowerCase();
  const coach = (root.dataset.coach || (lang==='de'?(mode==='university'?'mila':'ben'):(mode==='university'?'archer':'chloe'))).toLowerCase();

  const canvas = (typeof userOpts.canvas==='string')
      ? document.querySelector(userOpts.canvas)
      : (userOpts.canvas || document.getElementById('intro-canvas'));
  if (!canvas) {
    console.error('[intro-sird] canvas not found');
    return { play(){}, stop(){}, isRunning(){ return false; } };
  }

  // --- Parameter (Intro-Defaults) ---------------------------------------
  // γ = 1/D; μ aus IFR: μ = IFR/(1−IFR) · γ; β = R0 · (γ + μ)
  const R0    = 2.0;
  const Dinf  = 10;            // infektiöse Dauer (Tage)
  const IFR   = 0.090;         // bewusst 9% belassen (Intro-Didaktik)
  const gamma = 1 / Dinf;
  const mu    = (IFR * gamma) / (1 - IFR);
  const beta  = R0 * (gamma + mu);
  const PARAMS = { beta, gamma, mu, R0, IFR, I0: 1e-6, N: 1, T: 365, dt: 0.25 };

  // --- Sequenzen (3 Schritte) -------------------------------------------
  const SEQUENCES = {
    ben:   [
      { visible:['I','S'],         duration: 4, carryPrev:false, resetBefore:false },
      { visible:['D','R'],         duration: 4, carryPrev:false, resetBefore:true  },
      { visible:['S','I','R','D'], duration: 4, carryPrev:false, resetBefore:true  }
    ],
    mila:  [
      { visible:['I','S'],         duration: 4, carryPrev:false, resetBefore:false },
      { visible:['D','R'],         duration: 4, carryPrev:false, resetBefore:true  },
      { visible:['S','I','R','D'], duration: 4, carryPrev:false, resetBefore:true  }
    ],
    chloe: [
      { visible:['I','S'],         duration: 4, carryPrev:false, resetBefore:false },
      { visible:['D','R'],         duration: 4, carryPrev:false, resetBefore:true  },
      { visible:['S','I','R','D'], duration: 4, carryPrev:false, resetBefore:true  }
    ],
    archer:[
      { visible:['I','S'],         duration: 4, carryPrev:false, resetBefore:false },
      { visible:['D','R'],         duration: 4, carryPrev:false, resetBefore:true  },
      { visible:['S','I','R','D'], duration: 4, carryPrev:false, resetBefore:true  }
    ]
  };

  // --- Integration & Rendering & Player ---------------------------------
  const series   = integrateSIRDfrac(PARAMS);
  const renderer = createRenderer(canvas, series, lang);
  const player   = createSequencePlayer(series, renderer, PARAMS);

  if (typeof userOpts.onUpdate === 'function') {
    const handler = (e) => userOpts.onUpdate(e.detail || {});
    window.addEventListener('idv:intro:kpi', handler);
  }

  return {
    play(){ player.play(SEQUENCES[coach] || SEQUENCES.ben); },
    stop(){ player.stop(); },
    isRunning(){ return player.isRunning(); }
  };
}
export default mountIntroSIRD;

/* ============================= Integration ============================== */
function integrateSIRDfrac({ beta, gamma, mu, R0, IFR, I0, N, T, dt }) {
  const steps = Math.floor(T/dt) + 1;
  const S = new Float64Array(steps);
  const I = new Float64Array(steps);
  const R = new Float64Array(steps);
  const D = new Float64Array(steps);
  const t = new Float64Array(steps);

  S[0] = 1 - I0; I[0] = I0; R[0] = 0; D[0] = 0; t[0] = 0;
  for (let k=1; k<steps; k++) {
    const s=S[k-1], i=I[k-1], r=R[k-1], d=D[k-1];
    const newInf = beta*s*i, rec=gamma*i, die=mu*i;
    S[k] = s + dt * (-newInf);
    I[k] = i + dt * (newInf - rec - die);
    R[k] = r + dt * (rec);
    D[k] = d + dt * (die);
    t[k] = k * dt;
  }
  return { S,I,R,D,t,beta,gamma,mu,R0,IFR,N:1,dt,T };
}

/* =============================== Renderer =============================== */
function createRenderer(canvas, series, lang) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const css = getComputedStyle(document.documentElement);
  const col = {
    grid: css.getPropertyValue('--border').trim() || '#e5e7eb',
    ink:  css.getPropertyValue('--fg').trim()     || '#0b1520',
    S:    css.getPropertyValue('--c-s').trim()    || '#22c55e',
    I:    css.getPropertyValue('--c-i').trim()    || '#ef4444',
    R:    css.getPropertyValue('--c-r').trim()    || '#3b82f6',
    D:    css.getPropertyValue('--c-d').trim()    || '#475569'
  };

  function resize(){
    const cw=canvas.clientWidth||canvas.width, ch=canvas.clientHeight||canvas.height;
    canvas.width = Math.round(cw*dpr); canvas.height = Math.round(ch*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resize(); window.addEventListener('resize', resize);

  const PAD={l:50,r:20,t:16,b:36};
  const cw = () => canvas.clientWidth;
  const ch = () => canvas.clientHeight;
  const x  = i => PAD.l + ((cw()-PAD.l-PAD.r)*(i/(series.t.length-1)));
  const y  = f => PAD.t + (ch()-PAD.t-PAD.b)*(1-f);

  function grid(){
    ctx.save(); ctx.strokeStyle=col.grid; ctx.lineWidth=1;
    [0.25,0.5,0.75,1.0].forEach(fr=>{ const yy=y(fr);
      ctx.beginPath(); ctx.moveTo(PAD.l,yy); ctx.lineTo(cw()-PAD.r,yy); ctx.stroke();
    }); ctx.restore();
  }
  function drawLine(arr,c,a=1,upto=null){
    ctx.save(); ctx.strokeStyle=c; ctx.globalAlpha=a; ctx.lineWidth=2; ctx.beginPath();
    const n=(upto==null)?arr.length:Math.max(1,Math.min(arr.length,upto|0));
    for(let i=0;i<n;i++){ const xx=x(i), yy=y(arr[i]); if(i===0) ctx.moveTo(xx,yy); else ctx.lineTo(xx,yy); }
    ctx.stroke(); ctx.restore();
  }

  // Marker-Helfer
  function drawHLineAt(yPx,label,color){
    ctx.save(); ctx.setLineDash([4,4]); ctx.strokeStyle=color; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(PAD.l,yPx); ctx.lineTo(cw()-PAD.r,yPx); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle=color; ctx.font='12px system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
    ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText(label, PAD.l+6, Math.max(PAD.t, yPx-14)); ctx.restore();
  }
  function drawVLineAt(xPx,label,color){
    ctx.save(); ctx.setLineDash([4,4]); ctx.strokeStyle=color; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(xPx,PAD.t); ctx.lineTo(xPx,ch()-PAD.b); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle=color; ctx.font='12px system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='top';
    ctx.fillText(label, xPx, PAD.t+2); ctx.restore();
  }

  function draw(idx, view){
    ctx.clearRect(0,0,cw(),ch());
    grid();

    // Gated Marker: D∞ & t95(D) erst einblenden, wenn Flags true sind
    if (view.markers?.showDinf && view.markers?.Dinf) {
      drawHLineAt(y(view.markers.Dinf.y), 'D∞', col.D);
    }
    if (view.markers?.showT95D && view.markers?.t95D) {
      drawVLineAt(x(view.markers.t95D.x), 't₉₅', col.D);
    }

    const anim=new Set(view.animate||[]), stat=new Set(view.static||[]);
    stat.has('S') && drawLine(series.S,col.S,1,null);
    stat.has('I') && drawLine(series.I,col.I,1,null);
    stat.has('R') && drawLine(series.R,col.R,1,null);
    stat.has('D') && drawLine(series.D,col.D,1,null);

    anim.has('S') && drawLine(series.S,col.S,1,idx);
    anim.has('I') && drawLine(series.I,col.I,1,idx);
    anim.has('R') && drawLine(series.R,col.R,1,idx);
    anim.has('D') && drawLine(series.D,col.D,1,idx);

    ctx.save(); ctx.fillStyle=col.ink; ctx.font='12px system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
    ctx.fillText(lang==='de'?'Tage':'days', cw()-48, ch()-10); ctx.restore();
  }
  return { draw };
}

/* ============================ Sequence Player ============================ */
function createSequencePlayer(series, renderer, PARAMS){
  const totalIdx = series.t.length - 1;
  let raf=0, running=false, idx=0, stepIdx=-1;
  let carried=new Set(), visible=new Set();

  // Marker-Größen
  const DinfFrac = series.D[totalIdx];  // Endwert D (Fraktion)
  let t95DIndex = null;
  if (DinfFrac > 0){
    const thr = 0.95 * DinfFrac;
    for (let i=0;i<=totalIdx;i++){ if (series.D[i] >= thr){ t95DIndex = i; break; } }
  }
  // Marker-Gating (erscheinen erst „nach Ereignis“ & wenn D sichtbar)
  let showDinf=false, showT95D=false;

  let SEQUENCES=null;
  function setSequences(seq){ SEQUENCES=seq; }

  function next(){
    stepIdx++;
    if(stepIdx >= SEQUENCES.length){ running=false; return null; }
    const s = SEQUENCES[stepIdx] || {};
    if (s.resetBefore) carried.clear();
    idx=0;

    const speed = (totalIdx) / Math.max(0.1, +s.duration || 6);
    visible = new Set(s.visible || ['S','I']);
    if (s.carryPrev){
      const prev = SEQUENCES[Math.max(0, stepIdx-1)]?.visible || [];
      prev.forEach(c => carried.add(c));
    }
    return { s, speed };
  }

  function broadcast(){
    const i=Math.max(0,Math.min(series.t.length-1, idx|0));
    const S=series.S[i], I=series.I[i], R=series.R[i], D=series.D[i];
    const vis=new Set([...visible,...carried]);

    const detail={ t: Math.floor(series.t[i]+1e-6),
                   r0: PARAMS.R0,
                   reff: vis.has('S') ? (PARAMS.R0*S) : PARAMS.R0,
                   IFR: 100*PARAMS.IFR,
                   Dfinal: 100*DinfFrac };

    if (vis.has('S')) detail.sRel = 100*S;
    if (vis.has('I')) detail.iRel = 100*I;
    if (vis.has('R')) detail.rRel = 100*R;
    if (vis.has('D')) detail.dRel = 100*D;

    try{ window.dispatchEvent(new CustomEvent('idv:intro:kpi',{ detail })); }catch(e){}
  }

  function tick(ctxObj){
    if(!running) return;
    const { s, speed } = ctxObj;

    // Marker-Gating: erst ab Ereignis ODER wenn D sichtbar (Intro-Logik)
    const dIsVisible = (visible.has('D') || carried.has('D'));
    if (!showT95D && t95DIndex!=null && (idx >= t95DIndex) && dIsVisible) showT95D = true;
    if (!showDinf && showT95D) showDinf = true; // D∞ ab t95 logisch „sinnvoll“

    renderer.draw(idx, {
      static:  Array.from(carried),
      animate: Array.from(visible),
      markers: {
        Dinf:  (DinfFrac>0) ? { y: DinfFrac } : null,
        t95D:  (t95DIndex!=null) ? { x: t95DIndex } : null,
        showDinf, showT95D
      }
    });
    broadcast();

    idx += speed/60;
    if (idx >= totalIdx){
      const n=next();
      if(n) raf=requestAnimationFrame(()=>tick(n));
      else { running=false; raf=0; }
    } else {
      raf=requestAnimationFrame(()=>tick(ctxObj));
    }
  }

  function play(seq){ stop(); running=true; stepIdx=-1; carried.clear(); showDinf=false; showT95D=false; setSequences(seq); const ctx=next(); if(!ctx){ running=false; return; } raf=requestAnimationFrame(()=>tick(ctx)); }
  function stop(){ running=false; if(raf){ cancelAnimationFrame(raf); raf=0; } }
  function isRunning(){ return running; }
  return { play, stop, isRunning };
}
