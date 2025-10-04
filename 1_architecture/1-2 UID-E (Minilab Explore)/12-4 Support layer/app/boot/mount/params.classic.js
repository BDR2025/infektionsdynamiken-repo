/*!
 * Project:  Understanding Infection Dynamics · Infektionsdynamiken verstehen
 *           UID-Explore · Support Layer · Boot Module (ESM)
 * File:     /uid/12-4_support/app/boot/mount/params.classic.js
 * Type:     Open Educational Resource (OER) · ESM
 * Authors:  B. D. Rausch · A. Heinz
 * Contact:  info@infectiondynamics.eu · info@infektionsdynamiken.de
 * License:  CC BY 4.0
 *
 * Created:  2025-10-04
 * Updated:  2025-10-04
 * Version:  1.0.0
 * Changelog:
 *   - v1.0.0  Erstes Commit: Mount der klassischen Parameter inkl. AutoRehydrate & Rehydrate.
 *
 * eAnnotation:
 *   Mountet das klassische Parameter-Panel. Bindet AutoRehydrate/QA-Flow an die Widget-Shell
 *   und nutzt die Facade des Parameter-Tools. Keine Root-absoluten Pfade; rein @uid/…/relativ.
 *
 * ModuleMap (short)
 *   /app/boot/mount/params.classic.js  (dieses Modul)
 *   @uid/input/parameters/index.js      (liefert mountParameterClassic)
 */

'use strict';

import { attachWidgetHeader } from '@uid/widgets';
import { attachAutoRehydrate, DEFAULT_EXPLORE_EVENTS } from '@uid/widgets/rehydrate.js';
import { initRehydrate }      from '@uid/app/boot/rehydrate/core.js';
import { mountParameterClassic } from '@uid/input/parameters/index.js';
import * as EBUS              from '@uid/base/bus.js';

export async function mountParamsClassic() {
  const host = document.getElementById('params-widget');
  if (!host) return;

  const { header } = attachWidgetHeader(host, {
    title: 'Parameter (klassisch)',
    storageKey: 'uid:d2:params-classic:enabled',
    defaultEnabled: true
  });

  attachAutoRehydrate(host, EBUS, DEFAULT_EXPLORE_EVENTS, header);
  mountParameterClassic('params-host');
  initRehydrate(host, EBUS, { id: 'params-classic' });

  console.info('[mount-widgets] Params Classic ready');
}
