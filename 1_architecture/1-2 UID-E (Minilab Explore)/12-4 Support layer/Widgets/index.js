/*!
 * Project:  Understanding Infection Dynamics · Infektionsdynamiken verstehen
 *           UID-Explore · Support Layer · Widget Logic (Index)
 * File:     /uid/12-4_support/widgets/index.js
 * Type:     Open Educational Resource (OER) · ESM
 * Authors:  B. D. Rausch · A. Heinz
 * Contact:  info@infectiondynamics.eu · info@infektionsdynamiken.de
 * License:  CC BY 4.0
 *
 * Created:  2025-10-03
 * Updated:  2025-10-03
 * Version:  1.4.2
 * Changelog:
 *   - v1.4.2  Repo-Polishing: Kopfzeile/Gliederung ergänzt; One-time Style-Boot bleibt erhalten.
 *
 * eAnnotation:
 *   Öffentliche Widgets-API (Header, Actions, Presets, Off-Policy) und
 *   einmalige Initialisierung von Styles/Hub/Tooltip beim ersten Import.
 */

'use strict';

/* ============================================================================
 * 1) Public API
 * -------------------------------------------------------------------------- */
export { attachWidgetHeader } from './header.js';
export { mountWidgetActions } from './actions.js';
export * as presets          from './registry.js';
export { applyOffState }     from './off-policy.js';

/* ============================================================================
 * 2) Boot (einmalig pro Seite)
 *    - Styles sicherstellen
 *    - Hub & Tooltip wegen Side-Effects importieren
 * -------------------------------------------------------------------------- */
import { ensureWidgetStyles } from './styles.js';
import './hub.js';
import './tooltip.js';

// One-time init (ESM wird pro URL nur einmal evaluiert)
ensureWidgetStyles();
