/*!
 * File:      intro-sirv.js
 * Project:   Understanding Infection Dynamics · Infektionsdynamiken verstehen
 * Type:      Open Educational Resource (OER)
 * Authors:   B. D. Rausch · A. Heinz
 * Contact:   info@infectiondynamics.eu · info@infektionsdynamiken.de
 * License:   CC BY 4.0
 *
 * Created:   2025-09-26
 * Updated:   2025-09-26
 * Version:   3.0.0
 * Changelog: - v3.0.0 Marker ergänzt: v_c (horizontal) und t_cross(v=v_c) (vertikal) in V-Farbe;
 *              Marker-Gating wie SEIR: Einblendung erst ab Crossing und wenn V sichtbar;
 *              KPI-Payload, Sequenzen und API unverändert belassen
 */
/* =======================================================================
   UID-Intro · Runner (SIRV)
   - Deterministische SIRV-Simulation auf N=1 (Fraktionsskala)
   - School: perfect vaccine (VE=1) · University: leaky (VE<1)
   - Visualisierung als Custom-Canvas (ohne Chart-Bibliothek), DPI-aware
   - Dramaturgische Sequenz (I+S → R → V → S+I+R+V)
   - KPI-Event 'idv:intro:kpi' (t, r0, reff, v, vc, deltaV, sRel/iRel/rRel/vRel)
   - Marker im Chart: v_c (horizontale Linie), t_cross (vertikale Linie) mit Gating
   ======================================================================= */

export function mountIntroSIRV(userOpts = {}){
  const root  = document.documentElement;
  const lang  = (root.lang || 'de').toLowerCase();
  const mode  = (root.dataset.mode || 'school').toLowerCase();
  const coach = (root.dataset.coach || (lang==='de'?(mode==='university'?'mila':'ben'):(mode==='university'?'archer':'chloe'))).toLowerCase();

  const canvas = (typeof userOpts.canvas==='string')
      ? document.querySelector(userOpts.canvas)
      : (userOpts.canvas || document.getElementById('intro-canvas'));
  if (!canvas){
    console.error('[intro-sirv] canvas not found');
    return { play(){}, stop(){}, isRunning(){ return false; } };
  }

  // --- Parameter (Intro-Defaults) ---------------------------------------
  const R0 = 4.0;
  const D  = 5;                // γ = 1/D
  const gamma = 1 / D;
  const beta  = R0 * gamma;

  // Impfannahmen: rollierende S→V mit Rate nu; Startabdeckung V0
  const VE = (mode==='university') ? 0.9 : 1.0;    // leaky vs perfect
  const nu = (mode==='university') ? 0.02 : 0.01;
  const V0 = (mode==='university') ? 0.10 : 0.00;

  const PARAMS = { R0, D, gamma, beta, VE, nu, V0, I0:1e-6, N:1, T:175, dt:0.25 };

  // --- Sequenzen (4 Schritte) -------------------------------------------
  const SEQUENCES = {
    ben:   [ { visible:['I','S'], duration:4, carryPrev:false, resetBefore:false },
             { visible:['R'],     duration:4, carryPrev:true,  resetBefore:false },
             { visible:['V'],     duration:4, carryPrev:true,  resetBefore:false },
             { visible:['S','I','R','V'], duration:4, carryPrev:false, resetBefore:true } ],
    mila:  [ { visible:['I','S'], duration:5, carryPrev:false, resetBefore:false },
             { visible:['R'],     duration:5, carryPrev:true,  resetBefore:false },
             { visible:['V'],     duration:5, carryPrev:true,  resetBefore:false },
             { visible:['S','I','R','V'], duration:6, carryPrev:false, resetBefore:true } ],
    chloe: [ { visible:['I','S'], duration:4, carryPrev:false, resetBefore:false },
             { visible:['R'],     duration:4, carryPrev:true,  resetBefore:false },
             { visible:['V'],     duration:4, carryPrev:true,  resetBefore:false },
             { visible:['S','I','R','V'], duration:4, carryPrev:false, resetBefore:true } ],
    archer:[ { visible:['I','S'], duration:5, carryPrev:false, resetBefore:false },
             { visible:['R'],     duration:5, carryPrev:true,  resetBefore:false },
             { visible:['V'],     duration:5, carryPrev:true,  resetBefore:false },
             { visible:['S','I','R','V'], duration:6, carryPrev:false, resetBefore:true } ]
  };

  // --- Integration & Rendering & Player ---------------------------------
  const series   = integrateSIRVfrac(PARAMS);
  const renderer = createRenderer(canvas, series, lang);
  const player   = createSequencePlayer(series, renderer, PARAMS);

  if (typeof userOpts.onUpdate==='function'){
    window.addEventListener('idv:intro:kpi', e => userOpts.onUpdate(e.detail||{}));
  }

  return {
    play(){ player.play(SEQUENCES[coach] || SEQUENCES.ben); },
    stop(){ player.stop(); },
    isRunning(){ return player.isRunning(); }
  };
}
export default mountIntroSIRV;

/* ============================= Integration ============================== */
function integrateSIRVfrac({ R0, D, gamma, beta, VE, nu, V0, I0, N, T, dt }){
  const steps = Math.floor(T/dt)+1;
  const S=new Float64Array(steps), I=new Float64Array(steps),
        R=new Float64Array(steps), V=new Float64Array(steps), t=new Float64Array(steps);

  S[0] = 1 - I0 - (V0||0); I[0]=I0; R[0]=0; V[0]=V0||0; t[0]=0;

  for(let k=1;k<steps;k++){
    const s=S[k-1], i=I[k-1], r=R[k-1], v=V[k-1];
    const Seff = s + (1-VE)*v;          // leaky: V trägt Rest-Suszeptibilität
    const newInf = beta * Seff * i;     // Infektionen
    const rec    = gamma * i;           // Genesungen
    const vacc   = nu * s;              // Impffluss S→V (kontinuierlich)

    S[k] = s + dt * (-newInf - vacc);
    I[k] = i + dt * ( newInf - rec );
    R[k] = r + dt * ( rec );
    V[k] = v + dt * ( vacc );
    t[k] = k*dt;
  }
  return { S,I,R,V,t,R0,D,gamma,beta,VE,nu,V0,N:1,dt,T };
}

/* =============================== Renderer =============================== */
function createRenderer(canvas, series, lang){
  const ctx=canvas.getContext('2d');
  const dpr=Math.max(1,Math.min(3,window.devicePixelRatio||1));
  const css=getComputedStyle(document.documentElement);
  const col={
    grid: css.getPropertyValue('--border').trim()||'#e5e7eb',
    ink:  css.getPropertyValue('--fg').trim()    ||'#0b1520',
    S:    css.getPropertyValue('--c-s').trim()   ||'#22c55e',
    I:    css.getPropertyValue('--c-i').trim()   ||'#ef4444',
    R:    css.getPropertyValue('--c-r').trim()   ||'#3b82f6',
    V:    css.getPropertyValue('--c-v').trim()   ||'#8b5cf6'
  };

  function resize(){
    const cw=canvas.clientWidth||canvas.width, ch=canvas.clientHeight||canvas.height;
    canvas.width=Math.round(cw*dpr); canvas.height=Math.round(ch*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resize(); window.addEventListener('resize', resize);

  const PAD={l:50,r:20,t:16,b:36};
  const cw=()=>canvas.clientWidth, ch=()=>canvas.clientHeight;
  const x = i => PAD.l + ((cw()-PAD.l-PAD.r)*(i/(series.t.length-1)));
  const y = f => PAD.t + (ch()-PAD.t-PAD.b)*(1-f);

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

    // Gated Marker: v_c & t_cross erst einblenden, wenn Flags true sind
    if (view.markers?.showVc && view.markers?.vc) {
      drawHLineAt(y(view.markers.vc.y), 'v_c', col.V);
    }
    if (view.markers?.showTcross && view.markers?.tcross) {
      drawVLineAt(x(view.markers.tcross.x), 't_cross', col.V);
    }

    const anim=new Set(view.animate||[]), stat=new Set(view.static||[]);
    stat.has('S') && drawLine(series.S,col.S,1,null);
    stat.has('I') && drawLine(series.I,col.I,1,null);
    stat.has('R') && drawLine(series.R,col.R,1,null);
    stat.has('V') && drawLine(series.V,col.V,1,null);

    anim.has('S') && drawLine(series.S,col.S,1,idx);
    anim.has('I') && drawLine(series.I,col.I,1,idx);
    anim.has('R') && drawLine(series.R,col.R,1,idx);
    anim.has('V') && drawLine(series.V,col.V,1,idx);

    ctx.save(); ctx.fillStyle=col.ink; ctx.font='12px system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
    ctx.fillText(lang==='de'?'Tage':'days', cw()-48, ch()-10); ctx.restore();
  }
  return { draw };
}

/* ============================ Sequence Player ============================ */
function createSequencePlayer(series, renderer, PARAMS){
  const totalIdx=series.t.length-1;
  let raf=0, running=false, idx=0, stepIdx=-1;
  let carried=new Set(), visible=new Set();

  // Herdschwelle v_c (Fraktion) & Crossing-Zeitpunkt
  const vcFrac = Math.max(0, Math.min(1, (1 - 1/Math.max(1e-9, PARAMS.R0)) / Math.max(1e-9, PARAMS.VE)));
  let tCrossIdx = null;
  for (let i=0;i<=totalIdx;i++){ if (series.V[i] >= vcFrac){ tCrossIdx = i; break; } }

  // Marker-Gating (erscheinen erst ab Crossing & wenn V sichtbar)
  let showVc=false, showTcross=false;

  let SEQUENCES=null;
  function setSequences(seq){ SEQUENCES=seq; }

  function next(){
    stepIdx++;
    if(stepIdx >= SEQUENCES.length){ running=false; return null; }
    const s=SEQUENCES[stepIdx] || {};
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
    const S=series.S[i], I=series.I[i], R=series.R[i], V=series.V[i];
    const vis=new Set([...visible,...carried]);

    // KPIs (Prozentwerte & Indikatoren)
    const v   = 100*V;
    const vc  = 100*vcFrac;
    const deltaV = v - vc;
    const reff = PARAMS.R0 * ( S + (1-PARAMS.VE)*V ); // leaky/perfect via VE

    const detail = { t: Math.floor(series.t[i]+1e-6), r0: PARAMS.R0, reff, v, vc, deltaV };
    if (vis.has('S')) detail.sRel = 100*S;
    if (vis.has('I')) detail.iRel = 100*I;
    if (vis.has('R')) detail.rRel = 100*R;
    if (vis.has('V')) detail.vRel = 100*V;

    try{ window.dispatchEvent(new CustomEvent('idv:intro:kpi',{ detail })); }catch(e){}
  }

  function tick(ctxObj){
    if(!running) return;
    const { s, speed } = ctxObj;

    // Gating: erst ab Crossing und wenn V sichtbar
    const vIsVisible = (visible.has('V') || carried.has('V'));
    if (!showTcross && tCrossIdx!=null && (idx >= tCrossIdx) && vIsVisible) showTcross = true;
    if (!showVc && showTcross) showVc = true; // v_c ab Crossing einblenden

    renderer.draw(idx, {
      static:  Array.from(carried),
      animate: Array.from(visible),
      markers: {
        vc:     { y: vcFrac },
        tcross: (tCrossIdx!=null) ? { x: tCrossIdx } : null,
        showVc, showTcross
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

  function play(seq){ stop(); running=true; stepIdx=-1; carried.clear(); showVc=false; showTcross=false; setSequences(seq); const ctx=next(); if(!ctx){ running=false; return; } raf=requestAnimationFrame(()=>tick(ctx)); }
  function stop(){ running=false; if(raf){ cancelAnimationFrame(raf); raf=0; } }
  function isRunning(){ return running; }
  return { play, stop, isRunning };
}
