/*!
 * File:      gridwave.js
 * Project:   Understanding Infection Dynamics · Infektionsdynamiken verstehen
 * Module:    UID-G · GridWave (Pseudo-spatial SIR/SEIR projection)
 * Type:      Open Educational Resource (OER) · ESM
 * Authors:   B. D. Rausch · A. Heinz
 * Contact:   info@infectiondynamics.eu · info@infektionsdynamiken.de
 * License:   CC BY 4.0
 *
 * Created:   2025-09-26
 * Updated:   2025-09-26
 * Version:   1.1.0
 * Changelog: - v1.1.0 Add 'hybrid' mode (radial wave→proportional), expose hybrid cfg via opts
 *            - v1.0.0 Band-Logic (C=I+R), Wave/Cluster/Proportional, DPR Canvas, rounding accumulators
 */

export function createGridWave(el, opts = {}) {
  const grid = Math.max(8, opts.grid | 0 || 40);
  const N = grid * grid;
  const state = {
    el,
    grid,
    Nvis: N,
    mode: opts.mode || 'cluster', // 'wave' | 'cluster' | 'proportional' | 'hybrid'
    animate: !!opts.animate,
    // NEW: hybrid parameters (override via opts.hybrid)
    hybrid: Object.assign({ d0: 0.25, p: 2.0, blurPasses: 2 }, opts.hybrid || {}),
    dpr: 1,
    ctx: null,
    ranking: null,   // Uint32Array of indices [0..N-1] sorted by metric
    metric: null,    // Float32Array metric per index
    sim: null,       // { t:[], series:{S:[],I:[],R:[],E?,V?} }
    idx: 0,
    accC: 0,         // accumulative rounding for C (I+R or I+R ladder)
    accI: 0,
    colors: { S: '#22C55E', I: '#EF4444', R: '#3B82F6', E: '#FFCC00', V: '#0A84FF' },
    seed: 'uid-g',
    lastCuts: { nC: 0, nI: 0, nR: 0, nE: 0, nV: 0 },
    raf: 0
  };

  // --- setup canvas ---
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', 'GridWave pseudo-spatial visualization of SIR/SEIR shares');
  canvas.setAttribute('role', 'img');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  el.appendChild(canvas);
  state.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  const ro = new ResizeObserver(() => resize());
  ro.observe(el);

  readThemeColors();
  resize();

  // --- public handlers ---
  const api = {
    onParams(p) {
      state.seed = p?.simId || p?.paramsHash || 'uid-g';
      const rnd = mulberry32(hashStr(state.seed));
      const metric = buildMetric(grid, state.mode, rnd, state.hybrid);
      const ranking = argsort(metric);
      state.metric = metric;
      state.ranking = ranking;
      state.accC = 0; state.accI = 0;
      state.lastCuts = { nC: 0, nI: 0, nR: 0, nE: 0, nV: 0 };
      api.emit?.('uid:g:ready', { grid: state.grid, mode: state.mode });
      renderFrame();
    },
    onSimData(s) {
      if (s?.series) normalizeSeries(s.series);
      state.sim = s;
      clampIdx();
      renderFrame();
    },
    onUpdate(u) {
      state.idx = (u?.idx | 0) || 0;
      renderFrame(u?.proportions);
    },
    destroy() {
      ro.disconnect();
      cancelAnimationFrame(state.raf);
      el.contains(canvas) && el.removeChild(canvas);
    },
    emit() {}
  };
  return api;

  // --- helpers ---
  function resize() {
    const { width, height } = el.getBoundingClientRect();
    const size = Math.max(1, Math.min(width, height));
    state.dpr = Math.min(3, window.devicePixelRatio || 1);
    state.ctx.canvas.width  = Math.round(size * state.dpr);
    state.ctx.canvas.height = Math.round(size * state.dpr);
    state.ctx.imageSmoothingEnabled = false;
    renderFrame();
  }

  function readThemeColors() {
    const cs = getComputedStyle(el);
    const pick = (name, fallback) => cs.getPropertyValue(name)?.trim() || fallback;
    state.colors.S = pick('--c-s', state.colors.S);
    state.colors.I = pick('--c-i', state.colors.I);
    state.colors.R = pick('--c-r', state.colors.R);
    state.colors.E = pick('--c-e', state.colors.E);
    state.colors.V = pick('--c-v', state.colors.V);
  }

  function clampIdx() {
    if (!state.sim) return;
    const max = (state.sim.t?.length || 1) - 1;
    state.idx = Math.max(0, Math.min(max, state.idx));
  }

  function renderFrame(inlineProps) {
    const ctx = state.ctx;
    if (!ctx || !state.ranking) { clearCanvas(ctx); return; }

    // Determine shares at current idx
    let S=0, I=0, R=0, E=0, V=0;
    if (inlineProps) {
      ({S=0,I=0,R=0,E=0,V=0} = inlineProps);
    } else if (state.sim?.series) {
      const k = state.idx;
      const ser = state.sim.series;
      S = at(ser.S, k); I = at(ser.I, k); R = at(ser.R, k);
      if (ser.E) E = at(ser.E, k);
      if (ser.V) V = at(ser.V, k);
    } else {
      clearCanvas(ctx); return;
    }

    // Normalize if needed
    let sum = S + I + R + E + V;
    if (sum > 0 && Math.abs(sum - 1) > 1e-6) {
      S /= sum; I /= sum; R /= sum; E /= sum; V /= sum;
    }

    const N = state.Nvis;

    // ---- Band-Logic ----
    let nC1=0, nC2=0, nI=0, nR=0, nE=0, nV=0;

    if (E > 0) {
      // SEIR ladder: C1=E+I+R, C2=I+R
      const C1 = E + I + R;
      const C2 = I + R;

      state.accC += C2 * N; nC2 = clampInt(Math.round(state.accC), 0, N); state.accC -= nC2;
      state.accI += I  * N; nI  = clampInt(Math.round(state.accI), 0, N); state.accI -= nI;

      nR = clampInt(nC2 - nI, 0, N);
      nC1 = clampInt(Math.round(C1 * N), 0, N);
      nE = clampInt(nC1 - nC2, 0, N);
    } else {
      // SIR / SIRV
      const C = I + R;
      state.accC += C * N; let nC = clampInt(Math.round(state.accC), 0, N); state.accC -= nC;
      state.accI += I * N; nI = clampInt(Math.round(state.accI), 0, N);    state.accI -= nI;
      nR = clampInt(nC - nI, 0, N);

      if (V > 0) {
        nV = clampInt(Math.round(V * N), 0, N);
        if (nC + nV > N) nV = Math.max(0, N - nC);
        nC1 = nC;
      } else {
        nC1 = nC;
      }
    }

    drawBands(ctx, state, { nC1, nI, nR, nE, nV });
    state.lastCuts = { nC: nC1, nI, nR, nE, nV };
    api.emit?.('uid:g:frame', { idx: state.idx, cuts: { nC: nC1, nI, nR, nE, nV }, mode: state.mode });
  }

  function drawBands(ctx, st, cuts) {
    const { grid, ranking, colors } = st;
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const cellsz = Math.floor(Math.min(W, H) / grid);
    const ox = Math.floor((W - cellsz * grid) / 2);
    const oy = Math.floor((H - cellsz * grid) / 2);

    const N = grid * grid;
    const tR0 = 0, tR1 = Math.min(N, cuts.nR);
    const tI0 = tR1, tI1 = Math.min(N, cuts.nR + cuts.nI);
    const tE0 = tI1, tE1 = Math.min(N, cuts.nC1);
    const nOuter = Math.max(0, N - cuts.nC1); // S + V
    const vBand = Math.min(nOuter, cuts.nV);

    // Paint background S (outer)
    ctx.fillStyle = colors.S;
    ctx.fillRect(0, 0, W, H);

    // Paint ranges
    paintRange(tR0, tR1, colors.R);
    paintRange(tI0, tI1, colors.I);
    if (cuts.nE > 0) paintRange(tE0, tE1, colors.E);
    if (vBand > 0) paintRange(N - vBand, N, colors.V);

    function paintRange(a, b, fill) {
      if (b <= a) return;
      ctx.fillStyle = fill;
      for (let r = a; r < b; r++) {
        const idx = ranking[r];
        const x = idx % grid, y = (idx / grid) | 0;
        const px = ox + x * cellsz, py = oy + y * cellsz;
        ctx.fillRect(px, py, cellsz, cellsz);
      }
    }
  }
}

/* =========================
 * Metric & Ranking builders
 * ========================= */

function buildMetric(grid, mode, rnd, hybridCfg = { d0: 0.25, p: 2.0, blurPasses: 2 }) {
  const N = grid * grid;
  const m = new Float32Array(N);
  const cx = (grid - 1) / 2, cy = (grid - 1) / 2;

  // Base: normalized center distance d ∈ [0,1]
  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      const i = y * grid + x;
      const dx = x - cx, dy = y - cy;
      m[i] = Math.hypot(dx, dy);
    }
  }
  let maxd = 0;
  for (let i = 0; i < N; i++) if (m[i] > maxd) maxd = m[i];
  const inv = maxd ? 1 / maxd : 1;
  for (let i = 0; i < N; i++) m[i] *= inv; // now m holds d(x,y)

  // proportional → seeded permutation metric
  if (mode === 'proportional') {
    for (let i = 0; i < N; i++) m[i] = rnd();
    return m;
  }

  // wave → pure distance metric (already in m)
  if (mode === 'wave') {
    return m;
  }

  // prepare noise for cluster/hybrid
  const noise = valueNoise2D(grid, grid, rnd);
  blurField(noise, grid, 2);
  blurField(noise, grid, 2);

  if (mode === 'cluster') {
    const alpha = 0.65;
    for (let i = 0; i < N; i++) {
      m[i] = alpha * m[i] + (1 - alpha) * noise[i];
    }
    return m;
  }

  if (mode === 'hybrid') {
    const d0 = clamp01(hybridCfg?.d0 ?? 0.25);
    const p  = Math.max(1, hybridCfg?.p ?? 2.0);
    const passes = Math.max(0, hybridCfg?.blurPasses ?? 2);
    for (let k = 0; k < passes; k++) blurField(noise, grid, 2);

    for (let i = 0; i < N; i++) {
      const d = m[i];
      const lam = Math.pow(Math.max(0, (d - d0) / (1 - d0)), p); // λ(d)
      m[i] = (1 - lam) * d + lam * noise[i];
    }
    return m;
  }

  // fallback → cluster-like
  const alpha = 0.65;
  for (let i = 0; i < N; i++) m[i] = alpha * m[i] + (1 - alpha) * noise[i];
  return m;
}

function clamp01(v){ return v < 0 ? 0 : (v > 1 ? 1 : v); }

function argsort(arr) {
  const n = arr.length;
  const idx = new Uint32Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  idx.sort((a, b) => arr[a] - arr[b]);
  return idx;
}

/* ============
 * Math helpers
 * ============ */

function at(a, k) {
  if (!a || !a.length) return 0;
  if (k < 0) return a[0];
  if (k >= a.length) return a[a.length - 1];
  return a[k];
}

function normalizeSeries(series) {
  const L = Math.max(series.S?.length || 0, series.I?.length || 0, series.R?.length || 0, series.E?.length || 0, series.V?.length || 0);
  for (let k = 0; k < L; k++) {
    let S = at(series.S, k), I = at(series.I, k), R = at(series.R, k), E = at(series.E, k), V = at(series.V, k);
    let sum = S + I + R + E + V;
    if (sum > 0 && Math.abs(sum - 1) > 1e-6) {
      S /= sum; I /= sum; R /= sum; E /= sum; V /= sum;
      if (series.S) series.S[k] = S;
      if (series.I) series.I[k] = I;
      if (series.R) series.R[k] = R;
      if (series.E) series.E[k] = E;
      if (series.V) series.V[k] = V;
    }
  }
}

function clampInt(v, lo, hi) {
  return v < lo ? lo : (v > hi ? hi : v | 0);
}

// Seeded PRNG (mulberry32) + hash
function mulberry32(a) {
  return function () {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Simple value noise
function valueNoise2D(w, h, rnd) {
  const out = new Float32Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = rnd();
  return out;
}
// Box blur in-place (3x3), repeated "passes"
function blurField(f, size, passes = 1) {
  const N = size * size;
  const tmp = new Float32Array(N);
  const r = 1;
  for (let p = 0; p < passes; p++) {
    // horizontal
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let acc = 0, cnt = 0;
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx; if (xx < 0 || xx >= size) continue;
          acc += f[y * size + xx]; cnt++;
        }
        tmp[y * size + x] = acc / cnt;
      }
    }
    // vertical
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let acc = 0, cnt = 0;
        for (let dy = -r; dy <= r; dy++) {
          const yy = y + dy; if (yy < 0 || yy >= size) continue;
          acc += tmp[yy * size + x]; cnt++;
        }
        f[y * size + x] = acc / cnt;
      }
    }
  }
}

function clearCanvas(ctx) {
  if (!ctx) return;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}
