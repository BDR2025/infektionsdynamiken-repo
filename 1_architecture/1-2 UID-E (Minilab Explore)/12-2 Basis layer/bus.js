/*!
 * File:     core/bus.js
 * Project:  Understanding Infection Dynamics · Infektionsdynamiken verstehen
 * Type:     Open Educational Resource (OER)
 * Authors:  B. D. Rausch · A. Heinz
 * Contact:  info@infectiondynamics.eu · info@infektionsdynamiken.de
 * License:  CC BY 4.0
 *
 * Created:  2025-09-21
 * Updated:  2025-09-26
 * Version:  v1.0.1
 * Changelog:
 *   - v1.0.1 DOM-Mirror ergänzt, Debug-Logger integriert
 *   - v1.0.0 Initial Tiny Event Bus
 */

// ============================================================================
// Interner Listener-Speicher
// ============================================================================
// Map von Eventtypen → Set von Handlern.
// Entwickler: Diese Struktur nicht verändern, nur über on/off/emit zugreifen.
const _listeners = new Map();

// ============================================================================
// API: on / off / emit
// ============================================================================
// Einheitliche Schnittstelle zum Subscriben, Unsubscriben und Emittieren.
// Entwickler: Schnittstellen stabil halten, keine Zusatzparameter einführen.

/**
 * Subscribe to an event.
 * @param {string} type Event type
 * @param {function} handler Callback
 * @returns {function} unsubscribe function
 */
export function on(type, handler) {
  if (!_listeners.has(type)) _listeners.set(type, new Set());
  _listeners.get(type).add(handler);
  return () => off(type, handler);
}

/**
 * Unsubscribe from an event.
 * @param {string} type Event type
 * @param {function} handler Callback
 */
export function off(type, handler) {
  const set = _listeners.get(type);
  if (set) set.delete(handler);
}

/**
 * Emit an event.
 * 1. Benachrichtigt alle Subscriber im Bus
 * 2. Spiegelt Event als DOM CustomEvent für Debugging und externe Tools
 * Entwickler: DOM → Bus Verbindung NICHT implementieren, um Loops zu vermeiden.
 * @param {string} type Event type
 * @param {any} payload Payload object
 */
export function emit(type, payload) {
  // ESM Subscribers
  const set = _listeners.get(type);
  if (set) {
    for (const fn of Array.from(set)) {
      try {
        fn(payload);
      } catch (e) {
        console.error(`[UID-E Bus] Listener error for ${type}:`, e);
      }
    }
  }

  // DOM-Mirror
  try {
    const ev = new CustomEvent(type, { detail: payload });
    window.dispatchEvent(ev);
  } catch (e) {
    // ignorieren, wenn kein DOM verfügbar (z. B. Tests, Node)
  }
}

// ============================================================================
// Debug Logger (nur für Entwicklung)
// ============================================================================
// Loggt definierte Events inkl. Payload in die Konsole.
// Entwickler: Für Produktion deaktivieren oder Eventliste anpassen.
const DEBUG_EVENTS = [
  "uid:e:params:ready",
  "uid:e:params:change",
  "uid:e:model:update",
  "uid:e:sim:data",
  "uid:e:sim:pointer",
  "uid:e:error",
  "uid:e:engine:status"
];

for (const ev of DEBUG_EVENTS) {
  on(ev, (payload) => {
    try {
      console.log(`[UID-E Bus] Event: ${ev}`, payload);
    } catch (_) {
      console.log(`[UID-E Bus] Event: ${ev}`);
    }
  });
}
