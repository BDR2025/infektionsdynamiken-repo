/*!
 * Project:  Understanding Infection Dynamics · Infektionsdynamiken verstehen
 *           UID-Explore · Support Layer · Boot Module (ESM)
 * File:     /uid/12-4_support/app/boot/mount/gridwave.js
 * Type:     Open Educational Resource (OER) · ESM
 * Authors:  B. D. Rausch · A. Heinz
 * Contact:  info@infectiondynamics.eu · info@infektionsdynamiken.de
 * License:  CC BY 4.0
 *
 * Created:  2025-10-04
 * Updated:  2025-10-04
 * Version:  1.0.0
 * Changelog:
 *   - v1.0.0  Erstes Commit: GridWave-Mount inkl. Actions-Lade-Logik & Rehydrate.
 *
 * eAnnotation:
 *   Mountet das GridWave-Widget, lädt Actions robust (Alias/Fallback), koppelt AutoRehydrate
 *   und registriert ein refresh/resize im Rehydrate-Hook.
 *
 * ModuleMap (short)
 *   /app/boot/mount/gridwave.js          (dieses Modul)
 *   @uid/pres/grid                       (liefert mountGridWidget)
 *   @uid/pres/grid/gw.widget-actions.js  (optional; Actions)
 */

'use strict';

import { attachWidgetHeader } from '@uid/widgets';
import { attachAutoRehydrate, DEFAULT_EXPLORE_EVENTS } from '@uid/widgets/rehydrate.js';
import { initRehydrate }      from '@uid/app/boot/rehydrate/core.js';
import { mountGridWidget }    from '@uid/pres/grid';
import * as EBUS              from '@uid/base/bus.js';

async function loadGWActions() {
  const candidates = [
    '@uid/pres/grid/gw.widget-actions.js',
    '../../12-3_presentation/visual%20tool/grid%20wave/gw.widget-actions.js'
  ];
  let lastErr = null;
  for (const spec of candidates) {
    try {
      const mod = await import(spec);
      const fn  = mod?.mountGridWaveActions || mod?.mountSVGWWidgetActions;
      if (typeof fn === 'function') return { mountGridWaveActions: fn };
    } catch (e) { lastErr = e; }
  }
  if (lastErr) throw lastErr;
  return {};
}

export async function mountGridWave() {
  const host = document.getElementById('gw-widget');
  if (!host) return;

  const { header } = attachWidgetHeader(host, {
    title: 'GridWave',
    storageKey: 'uid:d2:gridwave:enabled',
    defaultEnabled: true
  });

  attachAutoRehydrate(host, EBUS, DEFAULT_EXPLORE_EVENTS, header);

  const apiGW = mountGridWidget({
    el: document.getElementById('gw-host'),
    bus: EBUS,
    grid: 40,
    mode: 'proportional',
    animate: false
  });

  try {
    const { mountGridWaveActions } = await loadGWActions();
    mountGridWaveActions(host, apiGW || {}, { bus: EBUS });
  } catch (e) {
    console.warn('[gridwave] actions skipped:', e?.message || e);
  }

  initRehydrate(host, EBUS, { id: 'gridwave', refresh: () => apiGW?.resize?.() });

  console.info('[mount-widgets] GridWave ready');
}
