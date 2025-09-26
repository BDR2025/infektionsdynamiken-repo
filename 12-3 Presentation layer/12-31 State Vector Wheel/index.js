/*!
 * File:      index.js
 * Project:   Understanding Infection Dynamics · Infektionsdynamiken verstehen
 * Type:      Open Educational Resource (OER)
 * Authors:   B. D. Rausch · A. Heinz
 * Contact:   info@infectiondynamics.eu · info@infektionsdynamiken.de
 * License:   CC BY 4.0
 *
 * Created:   2025-09-25
 * Updated:   2025-09-26
 * Version:   1.0.0
 * Changelog: - v1.0.0 Initial ESM Facade (Canvas+DPR, State, Bus-Wiring, batched repaint)
 */

import { createCanvas } from './core/canvas.js';
import { createState }  from './core/state.js';
import { draw }         from './core/draw.js';
import { wireBus }      from './wiring/bus.js';

/**
 * Public API
 * mountVector(hostId='vt-host', opts={ thickness, pad })
 *  - hostId:  ID eines Container-Elements (z.B. .widget-body)
 *  - opts:    Zeichenparameter (Ringstärke etc.)
 */
export function mountVector(hostId = 'vt-host', opts = {}) {
  const host = document.getElementById(hostId);
  if (!host) return { dispose(){} };

  // Canvas & DPR
  const { ctx, setSize, observeResize, dispose: disposeCanvas } = createCanvas(host);

  // Lightweight App-State (series, pointer, params, model, ranges)
  const state = createState();

  // Repaint batching: verhindert Überrendern bei Event-Bursts
  let dirty = false;
  function repaint() {
    if (dirty) return;
    dirty = true;
    queueMicrotask(() => { dirty = false; draw(ctx, state.snapshot(), opts); });
  }

  // Size/Resize
  const unobserve = observeResize(() => { setSize(); repaint(); });
  setSize();
  repaint();

  // Bus-Wiring (liest zentrale Ranges aus makeCatalog, hört auf Param-/Model-Events)
  const offBus = wireBus(state, repaint);

  return {
    dispose() {
      try { offBus && offBus(); } catch {}
      try { unobserve && unobserve(); } catch {}
      try { disposeCanvas(); } catch {}
    }
  };
}
