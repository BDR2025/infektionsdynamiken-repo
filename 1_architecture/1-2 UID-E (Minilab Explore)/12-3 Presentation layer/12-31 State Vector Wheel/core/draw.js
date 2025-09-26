/*!
 * File:      vectors/core/draw.js
 * Project:   Understanding Infection Dynamics · Infektionsdynamiken verstehen
 * Type:      Open Educational Resource (OER)
 * Authors:   B. D. Rausch · A. Heinz
 * Contact:   info@infectiondynamics.eu · info@infektionsdynamiken.de
 * License:   CC BY 4.0
 *
 * Created:   2025-09-25
 * Updated:   2025-09-26
 * Version:   1.0.1
 * Changelog: - v1.0.1 Reihenfolge fixiert (Mini-Disc messen → Segmente → Pfeile → Reff → Hub)
 *            - v1.0.0 Aufteilung der draw-Logik in Teilmodule
 */

import { prepareSnapshot, cssSize }      from './draw.util.js';
import { drawSegments }                  from './draw.segments.js';
import { drawArrows }                    from './draw.arrows.js';
import { drawReff }                      from './draw.reff.js';
import { measureMiniDisc, drawHubBlock } from './draw.hub.js';

/**
 * Public draw(ctx, snapshot, opts)
 * snapshot: { series, idx, params, model, ranges }
 * opts:     { thickness=14, pad=10 }
 */
export function draw(ctx, snap, opts = {}) {
  const DPR = window.devicePixelRatio || 1;
  const W = cssSize(ctx.canvas.width, DPR);
  const H = cssSize(ctx.canvas.height, DPR);
  ctx.clearRect(0, 0, W, H);

  // 1) Snapshot vorbereiten (S/E/I/R 0..1, Geometrie, Norms etc.)
  const prep = prepareSnapshot(snap, W, H, opts);
  const { rOuter, thickness, tStr } = prep;

  // 2) Mini-Disc VORAB messen (finaler rInner/rHubOut für Pfeil-Geometrie)
  const disc = measureMiniDisc(ctx, tStr, thickness, rOuter, prep.rInnerBase, prep.rHubBase);
  // finalen rInner/rHubOutline in den Prep-Container legen, damit Arrows/Reff korrekt rechnen
  prep.rInnerFinal = disc.rInner;
  prep.rHubOutline = disc.rHubOutline;

  // 3) Segmente S/E/I/R rendern (farbig)
  drawSegments(ctx, prep);

  // 4) Pfeile β/γ/σ – benutzen rInnerFinal (nie an Außenring, Label innen/seitlich)
  drawArrows(ctx, prep);

  // 5) Reff-Tacho (darf den Außenring erreichen)
  drawReff(ctx, prep);

  // 6) Mini-Disc + Hub-Konturen + zentriertes t-Label (verdeckt Nadelfuß)
  drawHubBlock(ctx, { cx: prep.cx, cy: prep.cy, tStr, disc });

  // (Optional) Pointer-Dot etc. → separater Renderer
}
