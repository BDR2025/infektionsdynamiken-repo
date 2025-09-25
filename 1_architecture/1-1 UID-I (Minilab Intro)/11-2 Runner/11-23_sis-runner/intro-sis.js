/* ========================================================================
   Infektionsdynamiken · Intro Runner (SIS)
   Datei / File:        js/minilabs/intro/intro-sis.js
   Version:             v1.0
   Datum / Date:        2025-09-12
   Autor / Author:      B. D. Rausch · ChatGPT
   Lizenz / License:    CC BY 4.0
   ------------------------------------------------------------------------
   Didaktik
   - Kein R; bei R0>1 konvergiert I(t) → I* = 1 − 1/R0 (endemisches Gleichgewicht).
   - Intro-KPIs: I* (in %), t95 (Zeit bis 95%%-Annäherung), t (Tag).
   - Sequenz (5 Schritte): I → S (+I-Spur) → [zeige I*] → S+I → [wipe] S+I (frisch).
=========================================================================== */
export function mountIntroSIS(userOpts = {}){
  const root  = document.documentElement;
  const lang  = (root.lang || 'de').toLowerCase();
  const mode  = (root.dataset.mode || 'school').toLowerCase();
  const coach = (root.dataset.coach || (lang==='de'?(mode==='university'?'mila':'ben'):(mode==='university'?'archer':'chloe'))).toLowerCase();

  const canvas = (typeof userOpts.canvas==='string') ? document.querySelector(userOpts.canvas)
                 : (userOpts.canvas || document.getElementById('intro-canvas'));
  if(!canvas){ console.error('[intro-sis] canvas not found'); return {play(){}, stop(){}, isRunning(){return false}}; }

const PARAMS = {
  R0:  1.25,  // I* ≈ 20 %  (1 / (1–0.20) = 1.25)
  D:   60,    // längere „infektiöse“/Kolonisations-Phase (2 Monate)
  I0:  1e-4,  // etwas höherer Startanteil → schneller sichtbare Kurve
  N:   1,
  T:   5000,   // 1 Jahr
  dt:  0.25
};


  // Sequences: I → S → (show I*) → S+I → [wipe] S+I
  const SEQUENCES = {
    ben:   [ {visible:['I'],       duration:10, carryPrev:false, resetBefore:false, showIstar:false},
             {visible:['S'],       duration: 6, carryPrev:true,  resetBefore:false, showIstar:false},
             {visible:['I'],       duration: 4, carryPrev:true,  resetBefore:false, showIstar:true },  // reveal I*
             {visible:['S','I'],   duration: 6, carryPrev:true,  resetBefore:false, showIstar:true },
             {visible:['S','I'],   duration: 6, carryPrev:false, resetBefore:true,  showIstar:true } ],

    mila:  [ {visible:['I'],       duration:12, carryPrev:false, resetBefore:false, showIstar:false},
             {visible:['S'],       duration: 8, carryPrev:true,  resetBefore:false, showIstar:false},
             {visible:['I'],       duration: 6, carryPrev:true,  resetBefore:false, showIstar:true },
             {visible:['S','I'],   duration: 8, carryPrev:true,  resetBefore:false, showIstar:true },
             {visible:['S','I'],   duration: 8, carryPrev:false, resetBefore:true,  showIstar:true } ],

    chloe: [ {visible:['I'],       duration:10, carryPrev:false, resetBefore:false, showIstar:false},
             {visible:['S'],       duration: 6, carryPrev:true,  resetBefore:false, showIstar:false},
             {visible:['I'],       duration: 4, carryPrev:true,  resetBefore:false, showIstar:true },
             {visible:['S','I'],   duration: 6, carryPrev:true,  resetBefore:false, showIstar:true },
             {visible:['S','I'],   duration: 6, carryPrev:false, resetBefore:true,  showIstar:true } ],

    archer:[ {visible:['I'],       duration:12, carryPrev:false, resetBefore:false, showIstar:false},
             {visible:['S'],       duration: 8, carryPrev:true,  resetBefore:false, showIstar:false},
             {visible:['I'],       duration: 6, carryPrev:true,  resetBefore:false, showIstar:true },
             {visible:['S','I'],   duration: 8, carryPrev:true,  resetBefore:false, showIstar:true },
             {visible:['S','I'],   duration: 8, carryPrev:false, resetBefore:true,  showIstar:true } ]
  };

  const series   = integrateSISfrac(PARAMS);
  const renderer = createRenderer(canvas, series, lang);
  const player   = createSequencePlayer(series, renderer, PARAMS);

  if (typeof userOpts.onUpdate==='function'){
    window.addEventListener('idv:intro:kpi', e => userOpts.onUpdate(e.detail||{}));
  }

  return { play(){ player.play(SEQUENCES[coach] || SEQUENCES.ben); },
           stop(){ player.stop(); },
           isRunning(){ return player.isRunning(); } };
}
export default mountIntroSIS;

/* ============================ Integration (SIS) ======================== */
function integrateSISfrac({R0,D,I0,N,T,dt}){
  const steps = Math.floor(T/dt)+1;
  const S=new Float64Array(steps), I=new Float64Array(steps), t=new Float64Array(steps);

  const gamma = 1/D;
  const beta  = R0 * gamma;

  S[0]=1-I0; I[0]=I0; t[0]=0;
  for(let k=1;k<steps;k++){
    const s=S[k-1], i=I[k-1];
    const newInf = beta*s*i;
    const dS = -newInf + gamma*i;   // Rückfluss I→S
    const dI =  newInf - gamma*i;
    S[k]=s+dt*dS; I[k]=i+dt*dI; t[k]=k*dt;
  }
  return { S,I,t,R0,gamma,beta,dt,T,N:1 };
}

/* ============================== Renderer =============================== */
function createRenderer(canvas, series, lang){
  const dpr=Math.max(1,Math.min(3,window.devicePixelRatio||1));
  const css=getComputedStyle(document.documentElement);
  const col={ grid:css.getPropertyValue('--border').trim()||'#e5e7eb',
              ink: css.getPropertyValue('--fg').trim()||'#0b1520',
              S:   css.getPropertyValue('--c-s').trim()||'#22c55e',
              I:   css.getPropertyValue('--c-i').trim()||'#ef4444' };
  const ctx=canvas.getContext('2d');
  function resize(){ const w=canvas.clientWidth||canvas.width, h=canvas.clientHeight||canvas.height;
    canvas.width=Math.round(w*dpr); canvas.height=Math.round(h*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); }
  resize(); window.addEventListener('resize', resize);

  const PAD={l:50,r:20,t:16,b:36};
  const x = i => PAD.l + ((canvas.clientWidth-PAD.l-PAD.r) * (i/(series.t.length-1)));
  const y = f => PAD.t + (canvas.clientHeight-PAD.t-PAD.b) * (1-f);

  function grid(){ ctx.save(); ctx.strokeStyle=col.grid; ctx.lineWidth=1;
    [0.25,0.5,0.75,1.0].forEach(fr=>{ const yy=y(fr); ctx.beginPath(); ctx.moveTo(PAD.l,yy); ctx.lineTo(canvas.clientWidth-PAD.r,yy); ctx.stroke();}); ctx.restore(); }

  function drawLine(arr, c, a=1, upto=null){ ctx.save(); ctx.strokeStyle=c; ctx.globalAlpha=a; ctx.lineWidth=2; ctx.beginPath();
    const n=(upto==null)?arr.length:Math.max(1,Math.min(arr.length,upto|0));
    for(let i=0;i<n;i++){ const xx=x(i), yy=y(arr[i]); if(i===0) ctx.moveTo(xx,yy); else ctx.lineTo(xx,yy);} ctx.stroke(); ctx.restore(); }

  function drawHLine(yFrac,label){ const yy=y(yFrac); ctx.save(); ctx.setLineDash([4,4]); ctx.strokeStyle=col.grid; ctx.beginPath(); ctx.moveTo(PAD.l,yy); ctx.lineTo(canvas.clientWidth-PAD.r,yy); ctx.stroke();
    ctx.font='11px system-ui,-apple-system,Segoe UI,Roboto,sans-serif'; ctx.fillStyle=col.grid; ctx.textAlign='left'; ctx.fillText(label, PAD.l+4, yy+4); ctx.restore(); }
  function drawVLine(xIndex,label){ const xx=x(xIndex); ctx.save(); ctx.setLineDash([4,4]); ctx.strokeStyle=col.grid; ctx.beginPath(); ctx.moveTo(xx,PAD.t); ctx.lineTo(xx,canvas.clientHeight-PAD.b); ctx.stroke();
    ctx.font='11px system-ui,-apple-system,Segoe UI,Roboto,sans-serif'; ctx.fillStyle=col.grid; ctx.textAlign='center'; ctx.fillText(label, xx, PAD.t+2); ctx.restore(); }

  function draw(idx, view){
    ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight); grid();
    // markers
    if (view.markers?.istar) drawHLine(view.markers.istar.y, lang==='de'?'I*':'I*');
    if (view.markers?.t95)   drawVLine(view.markers.t95.x, 't95');

    const anim=new Set(view.animate||[]), stat=new Set(view.static||[]);
    stat.has('S') && drawLine(series.S, col.S, 1, null);
    stat.has('I') && drawLine(series.I, col.I, 1, null);
    anim.has('S') && drawLine(series.S, col.S, 1, idx);
    anim.has('I') && drawLine(series.I, col.I, 1, idx);

    ctx.save(); ctx.fillStyle=col.ink; ctx.font='12px system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
    ctx.fillText(lang==='de'?'Tage':'days', canvas.clientWidth-48, canvas.clientHeight-10); ctx.restore();
  }
  return { draw };
}

/* =========================== Sequence Player =========================== */
function createSequencePlayer(series, renderer, PARAMS){
  let raf=0,running=false,idx=0,stepIdx=-1;
  const totalIdx=series.t.length-1;
  let carried=new Set(), visible=new Set();
  // Precompute I* and t95
  const Istar = Math.max(0, 1 - 1/Math.max(1e-9, PARAMS.R0));    // fraction
  let t95Index = null;
  if (Istar > 0){
    const thr = 0.95 * Istar;
    for (let i=0;i<series.I.length;i++){ if (series.I[i] >= thr){ t95Index = i; break; } }
  }
  let istarShown=false, t95Shown=false;

  // Sequences are defined in mount
  let SEQUENCES=null;
  function setSequences(seq){ SEQUENCES=seq; }

  function next(){
    stepIdx++;
    if(stepIdx >= SEQUENCES.length){ running=false; return null; }
    const s = SEQUENCES[stepIdx] || {};

    if (s.resetBefore){ carried.clear(); }
    idx = 0;
    const speed = (totalIdx-0) / Math.max(0.1, +s.duration || 6);
    visible = new Set(s.visible || ['S','I']);
    if (s.carryPrev){
      const prev = SEQUENCES[Math.max(0, stepIdx-1)]?.visible || [];
      prev.forEach(c => carried.add(c));
    }
    if (s.showIstar) istarShown = true;
    return { s, speed };
  }

  function broadcast(){
    const i=Math.max(0,Math.min(series.t.length-1, idx|0));
    const S=series.S[i], I=series.I[i];
    const vis=new Set([...visible,...carried]);
    const detail={ t: Math.floor(series.t[i]+1e-6), r0: PARAMS.R0, reff: vis.has('S') ? (PARAMS.R0*S) : PARAMS.R0 };
    if (vis.has('S')) detail.sRel = 100*S;
    if (vis.has('I')) detail.iRel = 100*I;
    if (istarShown) detail.Istar = { value: 100*Istar };
    if (!t95Shown && t95Index!=null && (i>=t95Index)){ t95Shown=true; detail.t95 = Math.floor(series.t[t95Index]+1e-6); }
    try{ window.dispatchEvent(new CustomEvent('idv:intro:kpi',{ detail })); }catch(e){}
  }

  function tick(ctx){
    if(!running) return;
    const { s, speed } = ctx;
    const markers = { istar: istarShown ? { y: Istar } : null, t95: (t95Shown && t95Index!=null) ? { x: t95Index } : null };
    renderer.draw(idx, { static:Array.from(carried), animate:Array.from(visible), markers });
    broadcast();
    idx += speed/60;
    if (idx >= totalIdx){
      const n = next();
      if (n) raf = requestAnimationFrame(()=>tick(n));
      else { running=false; raf=0; }
    } else {
      raf = requestAnimationFrame(()=>tick(ctx));
    }
  }

  function play(seq){
    stop();
    running=true; stepIdx=-1; carried.clear(); istarShown=false; t95Shown=false;
    setSequences(seq);
    const ctx = next(); if(!ctx){ running=false; return; }
    raf = requestAnimationFrame(()=>tick(ctx));
  }
  function stop(){ running=false; if(raf){ cancelAnimationFrame(raf); raf=0; } }
  function isRunning(){ return running; }

  return { play, stop, isRunning };
}
