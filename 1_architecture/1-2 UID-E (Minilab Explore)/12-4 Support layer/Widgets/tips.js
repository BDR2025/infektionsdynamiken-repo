/*!
 * Project:  Understanding Infection Dynamics · Infektionsdynamiken verstehen
 *           UID-Explore · Support Layer · Widget Logic (Tips)
 * File:     /uid/12-4_support/widgets/tips.js
 * Type:     Open Educational Resource (OER) · ESM
 * Authors:  B. D. Rausch · A. Heinz
 * Contact:  info@infectiondynamics.eu · info@infektionsdynamiken.de
 * License:  CC BY 4.0
 *
 * Created:  2025-10-03
 * Updated:  2025-10-03
 * Version:  1.4.2
 * Changelog:
 *   - v1.4.2  Repo-Polishing: Kopfzeile/Gliederung, Viewport-Clamp, aria-hidden bei show/hide.
 *
 * eAnnotation:
 *   Einfache Tooltip-Verwaltung für Hover + Fokus (Keyboard).
 *   Quelle: data-tooltip / title / aria-label; Escape/Blur schließt.
 *   Rückgabe: DOM-Layer (tipLayer); Event-Listener werden einmalig registriert.
 */

'use strict';

/* ============================================================================
 * 1) State
 * -------------------------------------------------------------------------- */
let tipLayer = null;
let hideTid  = null;

/* ============================================================================
 * 2) Helpers
 * -------------------------------------------------------------------------- */
function setText(node, text){
  // Als ersten Knoten einen Textknoten führen (Pfeil bleibt zweites Kind)
  if (node.firstChild && node.firstChild.nodeType === 3) {
    node.firstChild.nodeValue = text;
  } else {
    node.insertBefore(document.createTextNode(text), node.firstChild || null);
  }
}

function clearText(node){
  if (node.firstChild && node.firstChild.nodeType === 3){
    node.removeChild(node.firstChild);
  }
}

function getTipText(el){
  return el?.getAttribute?.('data-tooltip')
      || el?.getAttribute?.('title')
      || el?.getAttribute?.('aria-label');
}

function positionLayer(el, layer){
  const r = el.getBoundingClientRect();
  // Mittelpunkt über dem Element; Layer nutzt transform: translate(-50%, -100%-10px)
  let left = window.scrollX + r.left + (r.width / 2);
  let top  = window.scrollY + r.top;

  // Sanftes Clamping in den Viewport (nur horizontale Grenze nötig)
  const EDGE = 8;
  const maxLeft = window.scrollX + window.innerWidth - EDGE;
  const minLeft = window.scrollX + EDGE;
  if (left > maxLeft) left = maxLeft;
  if (left < minLeft) left = minLeft;

  layer.style.left = `${left}px`;
  layer.style.top  = `${top}px`;
}

/* ============================================================================
 * 3) Public API
 * -------------------------------------------------------------------------- */
/**
 * Einfache Tooltip-Verwaltung (Hover + Fokus).
 * Zeigt Tooltips für title= / data-tooltip= & aria-label Fallback.
 * Keyboard: bei focusin sofort anzeigen, bei Esc/blur schließen.
 *
 * @param {Document|HTMLElement} root
 * @returns {HTMLElement} tipLayer
 */
export function ensureTooltips(root = document){
  if (tipLayer) return tipLayer;

  // Layer erstellen
  tipLayer = document.createElement('div');
  tipLayer.className = 'uidw-tooltip';
  tipLayer.setAttribute('role', 'tooltip');
  tipLayer.setAttribute('aria-hidden', 'true');
  tipLayer.style.cssText = `
    position: absolute; z-index: 10000;
    max-width: 280px;
    background: rgba(15,23,42,.96);
    color: #fff; font-size: 12px; line-height: 1.3;
    border: 1px solid rgba(148,163,184,.35);
    border-radius: 8px;
    padding: 6px 8px;
    box-shadow: 0 6px 20px rgba(0,0,0,.35);
    transform: translate(-50%, calc(-100% - 10px));
    pointer-events: none;
    opacity: 0; transition: opacity .12s ease;
  `;

  // Pfeil
  const arrow = document.createElement('div');
  arrow.style.cssText = `
    position:absolute; inset:auto 0 -6px 50%; transform:translateX(-50%);
    width:12px; height:12px; background:rgba(15,23,42,.96);
    border-left:1px solid rgba(148,163,184,.35);
    border-bottom:1px solid rgba(148,163,184,.35);
    rotate:45deg;
  `;
  tipLayer.appendChild(arrow);
  document.body.appendChild(tipLayer);

  // Show/Hide
  const show = (el) => {
    clearTimeout(hideTid);
    const t = getTipText(el);
    if (!t) return;
    setText(tipLayer, t);
    positionLayer(el, tipLayer);
    tipLayer.style.opacity = '1';
    tipLayer.setAttribute('aria-hidden', 'false');
  };

  const hide = () => {
    hideTid = setTimeout(() => {
      tipLayer.style.opacity = '0';
      tipLayer.setAttribute('aria-hidden', 'true');
      clearText(tipLayer); // Textknoten entfernen, Pfeil erhalten
    }, 50);
  };

  // Hover
  root.addEventListener('mouseover', (e) => {
    const el = e.target.closest?.('[data-tooltip], [title], [aria-label]');
    if (!el) return;
    show(el);
  });

  root.addEventListener('mouseout', (e) => {
    const el = e.target.closest?.('[data-tooltip], [title], [aria-label]');
    if (!el) return;
    hide();
  });

  // Focus (Keyboard)
  root.addEventListener('focusin',  (e) => {
    const el = e.target.closest?.('[data-tooltip], [title], [aria-label]');
    if (!el) return;
    show(el);
  });

  root.addEventListener('focusout', (e) => {
    const el = e.target.closest?.('[data-tooltip], [title], [aria-label]');
    if (!el) return;
    hide();
  });

  // ESC → hide
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hide();
  });

  return tipLayer;
}

/* ============================================================================
 * 4) Default Export (Kompat)
 * -------------------------------------------------------------------------- */
export default { ensureTooltips };
