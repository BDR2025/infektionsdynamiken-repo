/*!
 * Project:  Understanding Infection Dynamics · Infektionsdynamiken verstehen
 *           UID-Explore · Support Layer · Widget Logic (Header Tools)
 * File:     /uid/12-4_support/widgets/header.tools.js
 * Type:     Open Educational Resource (OER) · ESM
 * Authors:  B. D. Rausch · A. Heinz
 * Contact:  info@infectiondynamics.eu · info@infektionsdynamiken.de
 * License:  CC BY 4.0
 *
 * Created:  2025-10-03
 * Updated:  2025-10-03
 * Version:  1.4.2
 * Changelog:
 *   - v1.4.2  Repository-Polishing: Kopfzeile, Gliederung, I18N-Texte, ARIA-pressed; keine Logikänderungen.
 *
 * eAnnotation:
 *   Fügt %/# (Scale) und HIT als globale Header-Buttons (Widgets 2.0) ein.
 *   Emit/Listen: viz:scale:set/changed, lines:hit:toggle; bei SIS ist HIT deaktiviert.
 */

'use strict';

/* ============================================================================
 * 1) Imports
 * -------------------------------------------------------------------------- */
import * as EBUS from '@uid/base/bus.js';

/* ============================================================================
 * 2) Public API
 * ---------------------------------------------------------------------------
 * attachHeaderTools({ widgetEl, headerEl?, model='SIR' }) → { dispose() }
 * DOM-Kontrakt:
 *   widgetEl > .uidw-header > .uidw-right > .uidw-actions-globals (wird ggf. erzeugt)
 * A11y:
 *   - Buttons sind togglende Buttons (aria-pressed).
 * I18N:
 *   - Titel/Tooltips orientieren sich an document.documentElement.lang (DE/EN).
 * ------------------------------------------------------------------------- */
/**
 * @param {Object} opts
 * @param {HTMLElement} opts.widgetEl   - Widget-Container (.widget)
 * @param {HTMLElement} [opts.headerEl] - optional: vorhandene .uidw-header
 * @param {string} [opts.model='SIR']   - Modellkennung (bei 'SIS' → HIT disabled)
 * @returns {{dispose:Function}}
 */
export function attachHeaderTools({ widgetEl, headerEl, model = 'SIR' } = {}){
  if (!widgetEl) throw new Error('[header-tools] widgetEl required');

  const header = headerEl || widgetEl.querySelector(':scope > .uidw-header');
  if (!header) throw new Error('[header-tools] header not found');

  // I18N (DE/EN)
  const isDE = String(document.documentElement.lang || 'de').toLowerCase().startsWith('de');
  const TXT = isDE
    ? {
        scaleTitle: 'Skala umschalten: Prozent ↔ Absolut',
        scaleAria:  'Skala: Prozent oder Absolut',
        hitOn:      'Herdimmunität anzeigen',
        hitOff:     'Herdimmunität ausblenden',
        hitNA:      'HIT ist für SIS nicht definiert'
      }
    : {
        scaleTitle: 'Toggle scale: Percent ↔ Absolute',
        scaleAria:  'Scale: percent or absolute',
        hitOn:      'Show herd immunity threshold',
        hitOff:     'Hide herd immunity threshold',
        hitNA:      'HIT is not defined for SIS'
      };

  /* -------------------------------------------------------------------------
   * 2.1) Globals-Slot (rechts) sicherstellen
   * ----------------------------------------------------------------------- */
  let globals = header.querySelector(':scope > .uidw-right > .uidw-actions-globals');
  if (!globals){
    const right = header.querySelector(':scope > .uidw-right') || header;
    globals = document.createElement('div');
    globals.className = 'uidw-actions uidw-actions-globals';
    // vor Burger/Power einschieben
    const burger = right.querySelector(':scope > .uidw-burger');
    right.insertBefore(globals, burger || right.firstChild);
  }

  /* =========================================================================
   * 3) SCALE (%/#)
   * ========================================================================= */
  const btnScale = document.createElement('button');
  btnScale.type = 'button';
  btnScale.className = 'wa-btn';
  btnScale.title = TXT.scaleTitle;
  btnScale.setAttribute('aria-label', TXT.scaleAria);
  btnScale.innerHTML = `<span class="wa-txt">%/#</span>`;

  let scaleMode = 'abs'; // 'pct' | 'abs'
  const syncScale = (mode) => btnScale.setAttribute('aria-pressed', String(mode === 'pct'));
  syncScale(scaleMode);

  btnScale.addEventListener('click', () => {
    scaleMode = (scaleMode === 'pct') ? 'abs' : 'pct';
    EBUS.emit('uid:e:viz:scale:set',     { mode: scaleMode, scope: widgetEl });
    EBUS.emit('uid:e:viz:scale:changed', { mode: scaleMode, scope: widgetEl });
    syncScale(scaleMode);
  });

  globals.appendChild(btnScale);

  // externe Änderungen spiegeln
  const offScale = EBUS.on?.('uid:e:viz:scale:changed', ({ mode, scope })=>{
    if (scope && scope !== widgetEl) return;
    if (mode === 'pct' || mode === 'abs'){ scaleMode = mode; syncScale(scaleMode); }
  });

  /* =========================================================================
   * 4) HIT
   * ========================================================================= */
  const btnHIT = document.createElement('button');
  btnHIT.type = 'button';
  btnHIT.className = 'wa-btn';
  btnHIT.innerHTML = `<span class="wa-txt">HIT</span>`;
  btnHIT.title = (model === 'SIS') ? TXT.hitNA : TXT.hitOn;
  if (model === 'SIS') btnHIT.disabled = true;

  let hitOn = false;
  const syncHIT = () => btnHIT.setAttribute('aria-pressed', String(!!hitOn));
  syncHIT();

  btnHIT.addEventListener('click', ()=>{
    if (btnHIT.disabled) return;
    hitOn = !hitOn; syncHIT();
    btnHIT.title = hitOn ? TXT.hitOff : TXT.hitOn;
    EBUS.emit('uid:e:lines:hit:toggle', { on: hitOn, scope: widgetEl });
    if (hitOn) EBUS.emit('uid:e:kpi:pulse', { kind:'HIT', scope: widgetEl });
  });

  globals.appendChild(btnHIT);

  const offHIT = EBUS.on?.('uid:e:lines:hit:toggle', ({ on, scope })=>{
    if (scope && scope !== widgetEl) return;
    if (typeof on === 'boolean'){ hitOn = !!on; syncHIT(); btnHIT.title = hitOn ? TXT.hitOff : TXT.hitOn; }
  });

  /* =========================================================================
   * 5) Cleanup
   * ========================================================================= */
  return {
    dispose(){
      try{ offScale?.(); offHIT?.(); }catch{}
      try{ btnScale.remove(); btnHIT.remove(); }catch{}
    }
  };
}

export default { attachHeaderTools };
