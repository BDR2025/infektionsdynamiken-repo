/*!
 * Shim: @uid/app/shims/leq.index.js → tatsächliches LEQ-Modul (unverändert im Repo)
 * Hintergrund: Der Quellordner heißt "living equation" (mit Leerzeichen) und darf nicht verändert werden.
 * Wir kapseln den Import hier, damit Boot/Mount keine Sonderpfade mehr probieren muss.
 *
 * WICHTIG: Import-Map muss @uid/pres/ → ../12-3_presentation/ mappen.
 */
'use strict';

// Leerzeichen im Pfad bewusst %20-encodiert
export * from '@uid/pres/living%20equation/index.js';
