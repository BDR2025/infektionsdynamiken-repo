/* ========================================================================
   Infektionsdynamiken · Intro Runner (SIRD)
   Datei / File:        js/minilabs/intro/intro-sird.js
   Version:             v1.1
   Datum / Date:        2025-09-12
   Autor / Author:      B. D. Rausch · ChatGPT
   Lizenz / License:    CC BY 4.0
   ------------------------------------------------------------------------
   DE · Zweck
   - Nicht-interaktiver SIRD-Intro-Runner (Canvas, Prozent-Skala, t ganzzahlig).
   - Ergebnis-Didaktik: Belastungsspitze I_peak, finale Sterblichkeit D_∞; im Uni-Modus IFR f = μ/(μ+γ).
   - Neue Orchestrierung (3 Schritte):
       1) Rot+Grün zusammen (I+S), dann WISCHEN
       2) Schwarz+Blau zusammen (D+R), dann WISCHEN
       3) Alle vier zusammen (S+I+R+D) — frischer Lauf

   EN · Purpose
   - Non-interactive SIRD Intro runner (canvas, percent scale, integer t).
   - Outcome didactics: burden peak I_peak, final mortality D_∞; in University mode also IFR f = μ/(μ+γ).
   - New 3-step orchestration:
       1) Red+Green together (I+S), then WIPE
       2) Black+Blue together (D+R), then WIPE
       3) All four together (S+I+R+D) — fresh run

   CHANGELOG
   v1.1  - Orchestration changed to 3 steps: (I+S) → [wipe] (D+R) → [wipe] (S+I+R+D).
          - Bilingual annotations; adjustable sections labeled clearly.
   v1.0  - Initial SIRD Intro runner with I_peak, D_∞, IFR; 4-step demo.
========================================================================= */

export function mountIntroSIRD(userOpts = {}) {
  const root  = document.documentElement;
  const lang  = (root.lang || 'de').toLowerCase();
  const mode  = (root.dataset.mode || 'school').toLowerCase();
  const coach = (root.dataset.coach || (lang==='de'?(mode==='university'?'mila':'ben'):(mode==='university'?'archer':'chloe'))).toLowerCase();

  const canvas = (typeof userOpts.canvas==='string') ? document.querySelector(userOpts.canvas)
                 : (userOpts.canvas || document.getElementById('intro-canvas'));
  if(!canvas){ console.error('[intro-sird] canvas not found'); return {play(){}, stop(){}, isRunning(){return false}}; }

  /* --------------------------------------------------------------------
     ▶ PARAMS — anpassbar / adjustable (sichtbar & didaktisch sinnvoll)
     Formeln: γ = 1/D,  μ = f/(1−f)·γ,  β = R0(γ+μ)
     School vs University: unterschiedliche Defaults (unterhalb gerne anpassen)
  -------------------------------------------------------------------- */
  const R0   = (mode==='university') ? 2.0  : 2.0;   // EN: University stronger; School milder
  const Dinf = 10;                                   // DE: Krankheitsdauer (Tage) | EN: infectious period (days)
  const IFR  = (mode==='university') ? 0.090 : 0.090; // Anteil / proportion (1.0% / 0.8%)
  const gamma= 1 / Dinf;
  const mu   = (IFR * gamma) / (1 - IFR);            // μ from IFR
  const beta = R0 * (gamma + mu);

  const PARAMS = { beta, gamma, mu, R0, IFR, I0:1e-6, N:1, T:365, dt:0.25 };

  /* ====================================================================
     ▶ SEQUENCES — Orchestrierung (3 Schritte) / orchestration (3 steps)
     Felder / fields:
       • visible:  ['S'|'I'|'R'|'D']  — animierte Kurven in DIESEM Schritt / curves animating in THIS step
       • duration: <Sekunden/seconds> — Zeit für vollen X-Durchlauf / time to traverse X axis
       • carryPrev:true|false         — vorherige Spur stehen lassen / keep previous trace
       • resetBefore:true|false       — Chart VOR dem Schritt wischen / wipe BEFORE this step
     Schritte:
       1) I+S (rot+grün), resetBefore:false
       2) D+R (schwarz+blau), resetBefore:true
       3) S+I+R+D (alle), resetBefore:true
     (Dauer pro Coach gerne weiter unten feinjustieren.)
  ==================================================================== */
  const SEQUENCES = {
    ben: [
      { visible:['I','S'],         duration: 4, carryPrev:false, resetBefore:false }, // Step 1: I+S
      { visible:['D','R'],         duration: 4, carryPrev:false, resetBefore:true  }, // Step 2: D+R (wipe before)
      { visible:['S','I','R','D'], duration: 4, carryPrev:false, resetBefore:true  }  // Step 3: all (wipe before)
    ],
    mila: [
      { visible:['I','S'],         duration: 4, carryPrev:false, resetBefore:false },
      { visible:['D','R'],         duration: 4, carryPrev:false, resetBefore:true  },
      { visible:['S','I','R','D'], duration: 4, carryPrev:false, resetBefore:true  }
    ],
    chloe: [
      { visible:['I','S'],         duration: 4, carryPrev:false, resetBefore:false },
      { visible:['D','R'],         duration: 4, carryPrev:false, resetBefore:true  },
      { visible:['S','I','R','D'], duration: 4, carryPrev:false, resetBefore:true  }
    ],
    archer: [
      { visible:['I','S'],         duration: 4, carryPrev:false, resetBefore:false },
      { visible:['D','R'],         duration: 4, carryPrev:false, resetBefore:true  },
      { visible:['S','I','R','D'], duration: 4, carryPrev:false, resetBefore:true  }
    ]
  };

  // ---- Integration & Rendering ----------------------------------------
  const series   = integrateSIRDfrac(PARAMS);
  const renderer = createRenderer(canvas, series, lang);
  const player   = createSequencePlayer(series, renderer, PARAMS);

  // Optional onUpdate passthrough
  if (typeof userOpts.onUpdate==='function'){
    window.addEventListener('idv:intro:kpi', e => userOpts.onUpdate(e.detail||{}));
  }

  return {
    play(){ player.play(SEQUENCES[coach] || SEQUENCES.ben); },
    stop(){ player.stop(); },
    isRunning(){ return player.isRunning(); }
  };
}
export default mountIntroSIRD;

/* ============================= Integration ============================ */
function integrateSIRDfrac({beta,gamma,mu,R0,IFR,I0,N,T,dt}){
  const steps = Math.floor(T/dt)+1;
  const S=new Float64Array(steps), I=new Float64Array(steps), R=new Float64Array(steps), D=new Float64Array(steps), t=new Float64Array(steps);
  S[0]=1-I0; I[0]=I0; R[0]=0; D[0]=0; t[0]=0;
  for(let k=1;k<steps;k++){
    const s=S[k-1], i=I[k-1], r=R[k-1], d=D[k-1];
    const newInf = beta*s*i, rec=gamma*i, die=mu*i;
    S[k]=s + dt*(-newInf);
    I[k]=i + dt*( newInf - rec - die);
    R[k]=r + dt*( rec );
    D[k]=d + dt*( die );
    t[k]=k*dt;
  }
  return { S,I,R,D,t,beta,gamma,mu,R0,IFR,N,dt,T };
}

/* ============================== Renderer =============================== */
function createRenderer(canvas, series, lang){
  const dpr=Math.max(1,Math.min(3,window.devicePixelRatio||1));
  const css=getComputedStyle(document.documentElement);
  const col={ grid:css.getPropertyValue('--border').trim()||'#e5e7eb',
              ink: css.getPropertyValue('--fg').trim()||'#0b1520',
              S:   css.getPropertyValue('--c-s').trim()||'#22c55e',
              I:   css.getPropertyValue('--c-i').trim()||'#ef4444',
              R:   css.getPropertyValue('--c-r').trim()||'#3b82f6',
              D:   css.getPropertyValue('--c-d').trim()||'#475569' };
  const ctx=canvas.getContext('2d');
  function resize(){ const w=canvas.clientWidth||canvas.width, h=canvas.clientHeight||canvas.height;
    canvas.width=Math.round(w*dpr); canvas.height=Math.round(h*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); }
  resize(); window.addEventListener('resize', resize);
  const PAD={l:50,r:20,t:16,b:36};
  const x=i=> PAD.l + ((canvas.clientWidth-PAD.l-PAD.r) * (i/(series.t.length-1)));
  const y=f=> PAD.t + (canvas.clientHeight-PAD.t-PAD.b) * (1-f);
  function grid(){ ctx.save(); ctx.strokeStyle=col.grid; ctx.lineWidth=1;
    [0.25,0.5,0.75,1.0].forEach(fr=>{ const yy=y(fr); ctx.beginPath(); ctx.moveTo(PAD.l,yy); ctx.lineTo(canvas.clientWidth-PAD.r,yy); ctx.stroke();}); ctx.restore(); }
  function drawLine(arr,c,a=1,up=null){ ctx.save(); ctx.strokeStyle=c; ctx.globalAlpha=a; ctx.lineWidth=2; ctx.beginPath();
    const n=(up==null)?arr.length:Math.max(1,Math.min(arr.length,up|0));
    for(let i=0;i<n;i++){ const xx=x(i), yy=y(arr[i]); if(i===0) ctx.moveTo(xx,yy); else ctx.lineTo(xx,yy);} ctx.stroke(); ctx.restore(); }
  function draw(idx, view){
    ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight); grid();
    const anim=new Set(view.animate||[]), stat=new Set(view.static||[]);
    stat.has('S')&&drawLine(series.S,col.S,1,null);
    stat.has('I')&&drawLine(series.I,col.I,1,null);
    stat.has('R')&&drawLine(series.R,col.R,1,null);
    stat.has('D')&&drawLine(series.D,col.D,1,null);
    anim.has('S')&&drawLine(series.S,col.S,1,idx);
    anim.has('I')&&drawLine(series.I,col.I,1,idx);
    anim.has('R')&&drawLine(series.R,col.R,1,idx);
    anim.has('D')&&drawLine(series.D,col.D,1,idx);
    ctx.save(); ctx.fillStyle=col.ink; ctx.font='12px system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
    ctx.fillText(lang==='de'?'Tage':'days', canvas.clientWidth-48, canvas.clientHeight-10); ctx.restore();
  }
  return { draw };
}

/* ========================== Sequence Player =========================== */
function createSequencePlayer(series, renderer, PARAMS){
  let raf=0,running=false,idx=0,stepIdx=-1;
  const totalIdx=series.t.length-1;
  let carried=new Set(), visible=new Set();

  // KPIs/Markers: I_peak (value+day), D_∞ (final %)
  let Ipeak=null, tpeakI=null, Dfinal=null, t95D=null;
  (function computeKPIs(){
    let imax=0, ival=series.I[0];
    for(let i=1;i<series.I.length;i++){ if(series.I[i] > ival){ ival=series.I[i]; imax=i; } }
    Ipeak={ value:100*ival, day:series.t[imax] };
    tpeakI={ x: imax };
    Dfinal = 100*series.D[series.D.length-1];
    const thr = 0.95 * series.D[series.D.length-1];
    for(let i=0;i<series.D.length;i++){ if(series.D[i] >= thr){ t95D={ x:i }; break; } }
  })();

  function next(steps){
    stepIdx++;
    if(stepIdx >= steps.length){ running=false; return null; }
    const s = steps[stepIdx] || {};
    if (s.resetBefore){ carried.clear(); }
    idx=0;
    const speed=(totalIdx-0)/Math.max(0.1, +s.duration || 8);
    visible=new Set(s.visible || ['S','I','R','D']);
    if (s.carryPrev){
      const prev=steps[Math.max(0, stepIdx-1)]?.visible || [];
      prev.forEach(c=>carried.add(c));
    }
    return { s, speed };
  }

  function broadcast(){
    const i=Math.max(0,Math.min(series.t.length-1, idx|0));
    const S=series.S[i], I=series.I[i], R=series.R[i], D=series.D[i];
    const vis=new Set([...visible,...carried]);
    const detail={ t: Math.floor(series.t[i]+1e-6),
                   r0: PARAMS.R0,
                   reff: vis.has('S')? (PARAMS.R0 * S) : PARAMS.R0,
                   Dfinal,
                   IFR: 100*PARAMS.IFR };
    if (vis.has('S')) detail.sRel=100*S;
    if (vis.has('I')) detail.iRel=100*I;
    if (vis.has('R')) detail.rRel=100*R;
    if (vis.has('D')) detail.dRel=100*D;
    if (Ipeak) detail.Ipeak = Ipeak;
    try{ window.dispatchEvent(new CustomEvent('idv:intro:kpi', { detail })); }catch(e){}
  }

  function tick(steps, ctx){
    if(!running) return;
    const { s, speed } = ctx;
    const markers = { tpeakI, t95D };
    renderer.draw(idx, { static:Array.from(carried), animate:Array.from(visible), markers });
    broadcast();
    idx += speed/60;
    if (idx >= totalIdx){
      const n=next(steps);
      if(n) raf=requestAnimationFrame(()=>tick(steps,n));
      else { running=false; raf=0; }
    } else {
      raf=requestAnimationFrame(()=>tick(steps,ctx));
    }
  }

  function play(steps){
    stop();
    running=true; stepIdx=-1; carried.clear();
    const ctx=next(steps); if(!ctx){ running=false; return; }
    raf=requestAnimationFrame(()=>tick(steps,ctx));
  }
  function stop(){ running=false; if(raf){ cancelAnimationFrame(raf); raf=0; } }
  function isRunning(){ return running; }
  return { play, stop, isRunning };
}
