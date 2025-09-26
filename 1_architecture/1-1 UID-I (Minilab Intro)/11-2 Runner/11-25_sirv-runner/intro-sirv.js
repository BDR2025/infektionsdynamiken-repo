/* ========================================================================
   Infektionsdynamiken · Intro Runner (SIRV)
   Datei / File:        js/minilabs/intro/intro-sirv.js
   Version:             v1.1
   Datum / Date:        2025-09-12
   Autor / Author:      B. D. Rausch · ChatGPT
   Lizenz / License:    CC BY 4.0
   ------------------------------------------------------------------------
   DE · Zweck
   - SIRV-Intro mit Impfung: School = perfekter Impfstoff (V vollständig immun),
     University = leaky vaccine (Wirksamkeit VE < 1).
   - KPIs (unten, via Boot v3.7 injiziert):
       School → t, v(t), R_eff(t)
       Uni    → t, v_c (Schwelle zur Herdenimmunität), Δv = v − v_c
   - Orchestrierung (4 Schritte):
       (1) I+S (rot+grün), NICHT wischen
       (2) R (blau), NICHT wischen  (Spuren von I+S bleiben)
       (3) V (lila), NICHT wischen  (Spuren bleiben)
       (4) S+I+R+V zusammen, JETZT wischen (frischer Lauf)

   EN · Purpose
   - SIRV Intro with vaccination: School = perfect vaccine, University = leaky.
   - KPIs (bottom, via Boot v3.7):
       School → t, v(t), R_eff(t)
       University → t, v_c (herd threshold), Δv = v − v_c
   - Orchestration (4 steps):
       (1) I+S, no wipe
       (2) R only, no wipe (keep I+S trace)
       (3) V only, no wipe (keep traces)
       (4) S+I+R+V, wipe before (fresh run)

   CHANGELOG
   v1.1  - Neue Sequenz: (I+S) → R → V → [wipe] (S+I+R+V).
           Kopf/Annotationen erweitert; anpassbare Blöcke klar markiert.
   v1.0  - Erstversion mit School/Uni (perfect/leaky), KPIs v, vc, Δv, R_eff.
========================================================================= */

export function mountIntroSIRV(userOpts = {}) {
  const root  = document.documentElement;
  const lang  = (root.lang || 'de').toLowerCase();
  const mode  = (root.dataset.mode || 'school').toLowerCase();
  const coach = (root.dataset.coach || (lang==='de'?(mode==='university'?'mila':'ben'):(mode==='university'?'archer':'chloe'))).toLowerCase();

  const canvas = (typeof userOpts.canvas==='string') ? document.querySelector(userOpts.canvas)
                 : (userOpts.canvas || document.getElementById('intro-canvas'));
  if(!canvas){ console.error('[intro-sirv] canvas not found'); return {play(){}, stop(){}, isRunning(){return false}}; }

  /* --------------------------------------------------------------------
     ▶ PARAMS (ANPASSBAR) — Adjust as needed
     School = perfect vaccine (VE=1 → V vollständig immun)
     University = leaky vaccine (VE<1 → V reduziert, aber eliminiert Suszeptibilität nicht)
     R0, D, VE, ν (Rollout), V0 sind deine Stellhebel (sichtbare Effekte!)
  -------------------------------------------------------------------- */
  const R0   = 4.0;             // Basistransmissibilität (sichtbare Dynamik)
  const D    = 5;               // γ = 1/D (Tage) — Zeitachse
  const gamma= 1 / D;
  const VE   = (mode==='university') ? 0.9  : 1.0;   // Uni leaky (z. B. 90%); School perfect
  const nu   = (mode==='university') ? 0.02 : 0.01;  // Rollout-Rate/Tag (S → V)
  const V0   = (mode==='university') ? 0.10 : 0.00;  // Anfangsdeckung (Fraktion)
  const I0   = 1e-6;
  const N    = 1;
  const T    = 175;
  const dt   = 0.25;
  const beta = R0 * gamma;      // SIRV-Intro: β aus R0 & γ

  /* ====================================================================
     ▶ SEQUENCES — 4 Schritte (siehe Kopf)
     Felder:
       • visible:  ['S'|'I'|'R'|'V']  — animierte Kurven in DIESEM Schritt
       • duration: <Sekunden>         — Zeit für vollen X-Durchlauf
       • carryPrev:true|false         — vorherige Spuren stehen lassen
       • resetBefore:true|false       — VOR diesem Schritt wischen
       • vaccOn:true|false            — (optional) nur semantisch; Integration nutzt konstanten ν
  ==================================================================== */
  const SEQUENCES = {
    ben:   [
      { visible:['I','S'],            duration: 4, carryPrev:false, resetBefore:false, vaccOn:false }, // 1) I+S
      { visible:['R'],                duration: 4, carryPrev:true,  resetBefore:false, vaccOn:false }, // 2) R (I+S Spur bleibt)
      { visible:['V'],                duration: 4, carryPrev:true,  resetBefore:false, vaccOn:true  }, // 3) V (Spuren bleiben)
      { visible:['S','I','R','V'],    duration: 4, carryPrev:false, resetBefore:true,  vaccOn:true  }  // 4) alle, wipe before
    ],
    mila:  [
      { visible:['I','S'],            duration: 4, carryPrev:false, resetBefore:false, vaccOn:false },
      { visible:['R'],                duration: 4, carryPrev:true,  resetBefore:false, vaccOn:false },
      { visible:['V'],                duration: 4, carryPrev:true,  resetBefore:false, vaccOn:true  },
      { visible:['S','I','R','V'],    duration: 4, carryPrev:false, resetBefore:true,  vaccOn:true  }
    ],
    chloe: [
      { visible:['I','S'],            duration: 4, carryPrev:false, resetBefore:false, vaccOn:false },
      { visible:['R'],                duration: 4, carryPrev:true,  resetBefore:false, vaccOn:false },
      { visible:['V'],                duration: 4, carryPrev:true,  resetBefore:false, vaccOn:true  },
      { visible:['S','I','R','V'],    duration: 4, carryPrev:false, resetBefore:true,  vaccOn:true  }
    ],
    archer:[
      { visible:['I','S'],            duration: 4, carryPrev:false, resetBefore:false, vaccOn:false },
      { visible:['R'],                duration: 4, carryPrev:true,  resetBefore:false, vaccOn:false },
      { visible:['V'],                duration: 4, carryPrev:true,  resetBefore:false, vaccOn:true  },
      { visible:['S','I','R','V'],    duration: 4, carryPrev:false, resetBefore:true,  vaccOn:true  }
    ]
  };

  // --- Integration (School perfect, Uni leaky) -------------------------
  const series   = integrateSIRV({ beta, gamma, VE, nu, V0, I0, N, T, dt, mode });
  const renderer = createRenderer(canvas, series, lang);
  const player   = createSequencePlayer(series, renderer, { R0, VE, mode });

  // Optional onUpdate passthrough (Boot v3.7 hört über Events)
  if (typeof userOpts.onUpdate==='function'){
    window.addEventListener('idv:intro:kpi', e => userOpts.onUpdate(e.detail||{}));
  }

  return { play(){ player.play(SEQUENCES[coach] || SEQUENCES.ben); },
           stop(){ player.stop(); },
           isRunning(){ return player.isRunning(); } };
}
export default mountIntroSIRV;

// ======================================================================
// Integration (SIRV) — School: perfect, University: leaky
// ======================================================================
function integrateSIRV({ beta, gamma, VE, nu, V0, I0, N, T, dt, mode }){
  const steps = Math.floor(T/dt)+1;
  const S=new Float64Array(steps), I=new Float64Array(steps), R=new Float64Array(steps), V=new Float64Array(steps), t=new Float64Array(steps);
  S[0]=1 - I0 - V0; I[0]=I0; R[0]=0; V[0]=V0; t[0]=0;

  for(let k=1;k<steps;k++){
    const s=S[k-1], i=I[k-1], r=R[k-1], v=V[k-1];
    const Seff = (mode==='university') ? (s + (1-VE)*v) : s; // leaky nur in Uni
    const newInf = beta * i * Seff;
    const dS = -newInf - nu*s;   // Rollout: S→V
    const dV =  nu*s;
    const dI =  newInf - gamma*i;
    const dR =  gamma*i;
    S[k]=s + dt*dS; V[k]=v + dt*dV; I[k]=i + dt*dI; R[k]=r + dt*dR; t[k]=k*dt;
  }
  return { S,I,R,V,t, beta,gamma,VE,nu,V0,N,dt,T, mode };
}

// ======================================================================
// Renderer — transparent canvas; dezent graues Grid; Farben via CSS-Tokens
// ======================================================================
function createRenderer(canvas, series, lang){
  const dpr=Math.max(1,Math.min(3,window.devicePixelRatio||1));
  const css=getComputedStyle(document.documentElement);
  const col={ grid:css.getPropertyValue('--border').trim()||'#e5e7eb',
              ink: css.getPropertyValue('--fg').trim()||'#0b1520',
              S:   css.getPropertyValue('--c-s').trim()||'#22c55e',
              I:   css.getPropertyValue('--c-i').trim()||'#ef4444',
              R:   css.getPropertyValue('--c-r').trim()||'#3b82f6',
              V:   css.getPropertyValue('--c-v').trim()||'#10b981' }; // V fallback (teal)
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
    // Spuren (voll) zuerst
    stat.has('S')&&drawLine(series.S,col.S,1,null);
    stat.has('I')&&drawLine(series.I,col.I,1,null);
    stat.has('R')&&drawLine(series.R,col.R,1,null);
    stat.has('V')&&drawLine(series.V,col.V,1,null);
    // animierte Kurven bis idx
    anim.has('S')&&drawLine(series.S,col.S,1,idx);
    anim.has('I')&&drawLine(series.I,col.I,1,idx);
    anim.has('R')&&drawLine(series.R,col.R,1,idx);
    anim.has('V')&&drawLine(series.V,col.V,1,idx);
    // X-Achsen-Label
    ctx.save(); ctx.fillStyle=col.ink; ctx.font='12px system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
    ctx.fillText(lang==='de'?'Tage':'days', canvas.clientWidth-48, canvas.clientHeight-10); ctx.restore();
  }
  return { draw };
}

// ======================================================================
// Sequence Player — sendet KPIs: t, v, vc, deltaV, reff, sRel/iRel/rRel/vRel
// ======================================================================
function createSequencePlayer(series, renderer, {R0, VE, mode}){
  let raf=0,running=false,idx=0,stepIdx=-1;
  const totalIdx=series.t.length-1;
  let carried=new Set(), visible=new Set();

  // herd threshold v_c (perfect/leaky-konform)
  const vc = (VE>0) ? ((1 - 1/Math.max(1e-9,R0)) / VE) : 1;

  function next(steps){
    stepIdx++;
    if(stepIdx >= steps.length){ running=false; return null; }
    const s = steps[stepIdx] || {};
    if (s.resetBefore){ carried.clear(); }
    idx=0;
    const speed = (totalIdx-0)/Math.max(0.1, +s.duration || 10);
    visible= new Set(s.visible || ['S','I','R','V']);
    if (s.carryPrev){
      const prev = steps[Math.max(0, stepIdx-1)]?.visible || [];
      prev.forEach(c => carried.add(c));
    }
    return { s, speed };
  }

  function broadcast(){
    const i=Math.max(0,Math.min(series.t.length-1, idx|0));
    const S=series.S[i], I=series.I[i], R=series.R[i], V=series.V[i];
    const v = V; // coverage (fraction)
    const Seff = (mode==='university') ? (S + (1-VE)*V) : S;
    const reff = R0 * Seff;
    const detail = {
      t: Math.floor(series.t[i]+1e-6),
      r0: R0,
      reff,
      v: 100*v, vc: 100*vc, deltaV: 100*(v - vc),
      sRel:100*S, iRel:100*I, rRel:100*R, vRel:100*V
    };
    try{ window.dispatchEvent(new CustomEvent('idv:intro:kpi', { detail })); }catch(e){}
  }

  function tick(steps, ctx){
    if(!running) return;
    const { s, speed } = ctx;
    renderer.draw(idx, { static:Array.from(carried), animate:Array.from(visible) });
    broadcast();
    idx += speed/60;
    if (idx >= totalIdx){
      const n=next(steps);
      if(n) raf=requestAnimationFrame(()=>tick(steps,n)); else { running=false; raf=0; }
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
