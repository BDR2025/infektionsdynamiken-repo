/*!
 * Project:  Understanding Infection Dynamics · Infektionsdynamiken verstehen
 *           UID-Explore · Support Layer · Boot Module (ESM)
 * File:     /uid/12-4_support/app/boot/mount/state.visuals.js
 * Type:     Open Educational Resource (OER) · ESM
 * Authors:  B. D. Rausch · A. Heinz
 * Contact:  info@infectiondynamics.eu · info@infektionsdynamiken.de
 * License:  CC BY 4.0
 *
 * Created:  2025-10-04
 * Updated:  2025-10-04
 * Version:  1.0.0
 * Changelog:
 *   - v1.0.0  Erstes Commit: Mount der State Visuals mit robustem Fallback & Actions.
 *
 * eAnnotation:
 *   Mountet die State-Visuals-Komponente. Probiert mehrere Einstiegspfade/APIs des
 *   Präsentationsmoduls aus (mountVector, default, mount) und fällt bei Bedarf
 *   robust zurück. Bindet Actions an die Widget-Shell und registriert Rehydrate.
 *
 * ModuleMap (short)
 *   /app/boot/mount/state.visuals.js   (dieses Modul)
 *   @uid/pres/state                    (Präsentationsmodul, liefert Mount-API)
 *   @uid/pres/state/sv.widget-actions.js (Actions für Header/Werkzeuge)
 */

'use strict';

import { attachWidgetHeader } from '@uid/widgets';
import { attachAutoRehydrate, DEFAULT_EXPLORE_EVENTS } from '@uid/widgets/rehydrate.js';
import { initRehydrate }      from '@uid/app/boot/rehydrate/core.js';
import * as EBUS              from '@uid/base/bus.js';

export async function mountStateVisuals() {
  const host = document.getElementById('sv-widget');
  const el   = document.getElementById('vt-host');
  if (!host || !el) { console.warn('[sv] host missing'); return; }

  const { header } = attachWidgetHeader(host, {
    title: 'State Visuals',
    storageKey: 'uid:d2:sv:enabled',
    defaultEnabled: true
  });

  attachAutoRehydrate(host, EBUS, DEFAULT_EXPLORE_EVENTS, header);

  const svMod = await import('@uid/pres/state');
  const MODEL = (document.documentElement.dataset.model || 'SIR').toUpperCase();
  const CANDS = (MODEL === 'SEIR') ? ['S','E','I','R'] : ['S','I','R'];

  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';

  let api = null, lastErr = null;
  const trials = [
    () => svMod.mountVector?.(el, { bus: EBUS, mode: 'wheel', candidates: CANDS, labels: true, format: 'units', animate: true }),
    () => svMod.mountVector?.(el, { bus: EBUS, candidates: CANDS }),
    () => svMod.mountVector?.(el, { bus: EBUS }),
    () => svMod.default?.(el, { bus: EBUS, candidates: CANDS }),
    () => svMod.default?.(el, { bus: EBUS }),
  ];

  for (const t of trials) {
    try { api = await t(); if (api) break; } 
    catch (e) {
      if (/candidates is not defined/i.test(String(e))) {
        try { globalThis.candidates = CANDS; } catch {}
      }
      lastErr = e;
    }
  }
  if (!api && lastErr) console.warn('[sv] mount fallback used:', lastErr?.message || lastErr);

  try {
    const { mountSVActions } = await import('@uid/pres/state/sv.widget-actions.js');
    mountSVActions(host, api || {}, { bus: EBUS });
  } catch (e) {
    console.warn('[sv] actions skipped:', e?.message || e);
  }

  initRehydrate(host, EBUS, { id: 'state' });
  console.info('[mount-widgets] State Visuals ready');
}
