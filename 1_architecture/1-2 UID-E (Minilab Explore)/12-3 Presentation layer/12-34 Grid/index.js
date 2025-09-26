/*!
 * File:      index.js
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
 * Changelog: - v1.1.0 Add 'hybrid' mode (radial wave→proportional), pass hybrid cfg; minor cleanup
 *            - v1.0.0 Initial release (band-logic; ESM bus adapter; demo)
 */

import { createGridWave } from './gridwave.js';

export function mountGridWidget({
  el,
  bus,
  grid = 40,
  mode = (document?.documentElement?.dataset?.mode === 'school') ? 'cluster' : 'proportional',
  animate = true,
  hybrid // optional: { d0, p, blurPasses }
}) {
  if (!el) throw new Error('[UID-G] mountGridWidget: missing el');

  const gw = createGridWave(el, { grid, mode, animate, hybrid });

  // Subscribe to UID-E bus events
  const unsub = [];
  const sub = (ev, fn) => {
    if (typeof bus?.subscribe === 'function') {
      bus.subscribe(ev, fn);
      unsub.push(() => bus.unsubscribe?.(ev, fn));
    }
  };

  sub('uid:e:params:ready', (p) => gw.onParams(p));
  sub('uid:e:sim:data',     (s) => gw.onSimData(s));
  sub('uid:e:model:update', (u) => gw.onUpdate(u));
  sub('idv:model:update',   (u) => gw.onUpdate(u)); // hover/scrub

  gw.emit = (ev, data) => bus?.publish?.(ev, data);

  gw._destroy = () => { unsub.forEach(f => f()); gw.destroy(); };
  return gw;
}

export function destroyGridWidget(instance) {
  instance?._destroy?.();
}
