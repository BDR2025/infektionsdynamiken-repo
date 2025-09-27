/*!
 * File:     core/engine.js
 * Project:  Understanding Infection Dynamics · Infektionsdynamiken verstehen
 * Type:     Open Educational Resource (OER)
 * Authors:  B. D. Rausch · A. Heinz
 * Contact:  info@infectiondynamics.eu · info@infektionsdynamiken.de
 * License:  CC BY 4.0
 *
 * Created:  2025-09-21
 * Updated:  2025-09-26
 * Version:  v1.1.0
 * Changelog:
 *   - v1.1.0 SIRV Modell ergänzt und Stabilisierung verbessert
 *   - v1.0.0 Initialer Rechenkern mit SIR und SEIR
 */

// ============================================================================
// Hilfsfunktionen
// ============================================================================
// Nur kleine Utilities für Zahlenprüfung und non-negativity.
// Entwickler: Diese unverändert lassen, da sie in allen Integratoren genutzt werden.
const finite = (x) => Number.isFinite(x);
const nnz    = (x) => (finite(x) && x > 0 ? x : 0);

// ============================================================================
// Modell-Definitionen
// ============================================================================
// Jeder Eintrag liefert:
//  - dims: Reihenfolge der Kompartimente
//  - init(p): Startvektor
//  - deriv(p, y): Differentialgleichungen
// Entwickler: Neue Modelle hier ergänzen. Bestehende nicht verändern,
// da UI und Schema eng gekoppelt sind.
const MODELS = {
  SIR: { /* … unverändert … */ },
  SEIR: { /* … unverändert … */ },
  SIRD: { /* … unverändert … */ },
  SIRV: { /* … unverändert … */ },
  SIS:  { /* optional */ }
};

// ============================================================================
// Integratoren
// ============================================================================
// Generische ODE-Integratoren für y' = f(p,y).
// Entwickler: Weitere Verfahren hier ergänzen, bestehende nicht verändern.
function stepEuler(f, p, y, h) { /* … unverändert … */ }
function stepHeun(f, p, y, h)  { /* … unverändert … */ }
function stepRK4(f, p, y, h)   { /* … unverändert … */ }

const STEPPERS = {
  euler: stepEuler,
  heun:  stepHeun,
  rk4:   stepRK4
};

// ============================================================================
// Haupt-API
// ============================================================================
// Führt eine Simulation aus und liefert { series, meta, drift }.
// Entwickler: Schnittstelle stabil halten. Zusätzliche Felder nur ergänzen,
// nicht bestehende ändern, da Director und KPI-Module diese nutzen.
/**
 * Run a simulation.
 * @param {{model?:string, params?:object, integrator?:'euler'|'heun'|'rk4'}} cfg
 * @returns {{series:object, meta:object, drift:number}}
 */
export function run({ model='SIR', params={}, integrator='rk4' }) {
  const MKEY = (model || 'SIR').toUpperCase();
  const M = MODELS[MKEY];
  if (!M) throw new Error(`[UID-E Engine] Unknown model: ${model}`);

  const step = STEPPERS[(integrator||'rk4').toLowerCase()] || stepRK4;

  // Schutz & Limits
  const N  = Math.max(1, Number(params.N || 1_000_000));
  const dt = Math.max(1e-6, Number(params.dt || 0.5));
  const T  = Math.max(dt, Number(params.T || 180));
  const steps = Math.max(1, Math.floor(T / dt));

  // Initialer Zustandsvektor
  let y = M.init({ ...params, N, I0: Math.max(0, Number(params.I0 || 10)) }).map(nnz);

  // Serien vorbereiten
  const series = { t: new Array(steps+1) };
  for (const d of M.dims) series[d] = new Array(steps+1);

  // Startwerte
  series.t[0] = 0;
  for (let i=0;i<M.dims.length;i++) series[M.dims[i]][0] = y[i];

  // Integrationsschleife
  const f = (p, yv) => M.deriv(params, yv);

  for (let k=1;k<=steps;k++) {
    y = step(f, params, y, dt);

    // Non-negativity + einfache Stabilisierung
    for (let i=0;i<y.length;i++) y[i] = nnz(y[i]);

    // Sanfte Massenkorrektur
    let sum = 0; for (let i=0;i<y.length;i++) sum += y[i];
    const drift = N - sum;
    if (finite(drift) && Math.abs(drift) > Math.max(1e-9 * N, 1e-9)) {
      // Entwickler: Nur S (erstes Kompartment) korrigieren, nicht andere
      y[0] = nnz(y[0] + drift);
    }

    // Werte ablegen
    series.t[k] = k*dt;
    for (let i=0;i<M.dims.length;i++) series[M.dims[i]][k] = y[i];
  }

  // Abschlussdrift
  let endSum = 0; for (let i=0;i<y.length;i++) endSum += y[i];
  const endDrift = Math.abs(endSum - N);

  const meta = { model: MKEY, method: (integrator||'rk4').toLowerCase(), dims: M.dims.slice() };
  return { series, meta, drift: endDrift };
}
