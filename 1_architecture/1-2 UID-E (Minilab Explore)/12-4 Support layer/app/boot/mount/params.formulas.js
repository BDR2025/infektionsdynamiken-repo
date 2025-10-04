/*!
 * Project:  Understanding Infection Dynamics · Infektionsdynamiken verstehen
 *           UID-Explore · Support Layer · Boot Module (ESM)
 * File:     /uid/12-4_support/app/boot/mount/params.formulas.js
 * Type:     Open Educational Resource (OER) · ESM
 * Authors:  B. D. Rausch · A. Heinz
 * Contact:  info@infectiondynamics.eu · info@infektionsdynamiken.de
 * License:  CC BY 4.0
 *
 * Created:  2025-10-04
 * Updated:  2025-10-04
 * Version:  1.0.0
 * Changelog:
 *   - v1.0.0  Erstes Commit: Mount der Parameter (Formeln) inkl. MathJax-Init & Rehydrate.
 *
 * eAnnotation:
 *   Mountet das Formeln-Panel der Parameter. Wartet idempotent auf MathJax,
 *   bindet Rehydrate/AutoRehydrate an die Widget-Shell und nutzt die Facade
 *   des Parameter-Tools für den Formeln-Renderer.
 *
 * ModuleMap (short)
 *   /app/boot/mount/params.formulas.js  (dieses Modul)
 *   @uid/input/parameters/index.js       (liefert mountParameterFormulas)
 *   @uid/support/js/uid-mathjax.js       (initMathJax → idempotent)
 */

'use strict';

import { attachWidgetHeader } from '@uid/widgets';
import { attachAutoRehydrate, DEFAULT_EXPLORE_EVENTS } from '@uid/widgets/rehydrate.js';
import { initRehydrate }      from '@uid/app/boot/rehydrate/core.js';
import { initMathJax }        from '@uid/support/js/uid-mathjax.js';
import { mountParameterFormulas } from '@uid/input/parameters/index.js';
import * as EBUS              from '@uid/base/bus.js';

const MJ_READY = initMathJax();

export async function mountParamsFormulas() {
  const host = document.getElementById('params-formulas-widget');
  if (!host) return;

  const { header } = attachWidgetHeader(host, {
    title: 'Parameter (Formeln)',
    storageKey: 'uid:d2:params-formulas:enabled',
    defaultEnabled: true
  });

  attachAutoRehydrate(host, EBUS, DEFAULT_EXPLORE_EVENTS, header);
  await MJ_READY;

  mountParameterFormulas('params-formulas-host');
  initRehydrate(host, EBUS, { id: 'params-formulas' });

  console.info('[mount-widgets] Params Formulas ready');
}
