/*!
 * File:      js/minilabs/intro/intro-boot.js
 * Project:   Understanding Infection Dynamics · Infektionsdynamiken verstehen
 * Type:      Open Educational Resource (OER)
 * Authors:   B. D. Rausch · A. Heinz
 * Contact:   info@infectiondynamics.eu · info@infektionsdynamiken.de
 * License:   CC BY 4.0
 *
 * Created:   2025-09-12
 * Updated:   2025-09-25
 * Version:   3.0.0
 * Changelog:
 *   - v3.0.0  OER-Header vereinheitlicht; öffentliche Doku ergänzt; resilientere Runner-Erkennung;
 *             konsistente KPI-Injektion (IDs, Labels, Locale); Non-Breaking Refactor gegenüber 2.5–2.7
 */

/* ===========================================================================
   UID-Intro · Boot-Modul
   Aufgabe
   - Orchestriert das Intro: sammelt DOM-Hooks, injiziert KPI-Karten, verdrahtet
     Buttons und bindet den passenden Runner ein
   - Ist bewusst kein Rechenkern. Die Simulation, die Sequenz und das Canvas-
     Rendering liegen im jeweiligen Runner (intro-sir.js, intro-seir.js, …)
   Kontrakte
   - Erwartet im DOM: #intro-canvas, #kpis-comp, #kpis-context
   - Optional: #chip-intro-coach, #btn-replay
   - Erwartet einen Runner-Mount auf window oder als Funktion:
       window.mountIntroSIR / mountIntroSEIR / …  ODER  window.IDVIntroMount
       Fallback: ein Objekt mit .mount Funktion
   =========================================================================== */

(function () {
  "use strict";

  /* ----------------------------- Utilities -------------------------------- */

  const $ = (sel, root = document) => root.querySelector(sel);

  const html   = document.documentElement;
  const model  = (html.getAttribute("data-model") || "seir").toLowerCase();
  const lang   = (html.getAttribute("lang") || "de").toLowerCase();
  const mode   = (html.getAttribute("data-mode") || "school").toLowerCase();
  const coach  = (
    html.getAttribute("data-coach") ||
    (lang === "de" ? (mode === "university" ? "mila" : "ben")
                   : (mode === "university" ? "archer" : "chloe"))
  ).toLowerCase();

  const locale       = (lang === "de") ? "de-DE" : "en-US";
  const fracDigits   = (mode === "university") ? 2 : 1;
  const localeOptPct = { minimumFractionDigits: fracDigits, maximumFractionDigits: fracDigits };
  const localeOptNum = { minimumFractionDigits: fracDigits, maximumFractionDigits: fracDigits };

  const fmtPct = (x) => (x == null || !isFinite(x)) ? "" : Number(x).toLocaleString(locale, localeOptPct) + " %";
  const fmtNum = (x) => (x == null || !isFinite(x)) ? "" : Number(x).toLocaleString(locale, localeOptNum);
  const fmtDay = (x) => (x == null || !isFinite(x)) ? "" : String(Math.floor(x));

  /* ----------------------------- KPI Rezepte ------------------------------ */

  const KPI_RECIPES = {
    sir:  { top: ["S","I","R"],     bottom: ["t","reff","r0"] },
    seir: { top: ["S","E","I","R"], bottom: ["t","peakE","peakI"] },
    sis:  { top: ["S","I"],         bottom: ["t","Istar","t95"] },
    sird: { top: ["S","I","R","D"], bottom: (mode === "university" ? ["t","IFR","Dfinal"] : ["t","Ipeak","Dfinal"]) },
    sirv: { top: ["S","I","R","V"], bottom: (mode === "university" ? ["t","vc","deltaV"] : ["t","v","reff"]) }
  };

  /* ------------------------------ Labels ---------------------------------- */

  function labelForTop(k) {
    const de = {
      S: "Empfängliche (S)", E: "Exponierte (E)", I: "Erkrankte (I)",
      R: "Genesene (R)",     D: "Verstorbene (D)", V: "Geimpfte (V)"
    };
    const en = {
      S: "Susceptible (S)", E: "Exposed (E)",    I: "Infectious (I)",
      R: "Recovered (R)",   D: "Deceased (D)",   V: "Vaccinated (V)"
    };
    return (lang === "de" ? de[k] : en[k]) || k;
  }

  function labelForBottom(k) {
    const de = {
      t: "t (Tag)", reff: "R-Wert (effektiv)", r0: "R-Wert (Basis)",
      Istar: "I* (endemisch)", t95: "t₉₅ (Annäherung)",
      Ipeak: "I_peak (%)", Dfinal: "D_∞ (%)", IFR: "IFR f = μ/(μ+γ)",
      v: "Impfquote v(t)", vc: "Herdenimmunität v_c", deltaV: "Δv = v − v_c"
    };
    const en = {
      t: "t (days)", reff: "R-value (effective)", r0: "R-value (basic)",
      Istar: "I* (endemic)", t95: "t₉₅ (time to 95%)",
      Ipeak: "I_peak (%)", Dfinal: "D_∞ (%)", IFR: "IFR f = μ/(μ+γ)",
      v: "Coverage v(t)", vc: "Herd immunity v_c", deltaV: "Δv = v − v_c"
    };
    return (lang === "de" ? de[k] : en[k]) || k;
  }

  function idForBottom(k) {
    if (k === "t")      return "kpi-t";
    if (k === "reff")   return "kpi-reff";
    if (k === "r0")     return "kpi-r0";
    if (k === "Istar")  return "kpi-Istar";
    if (k === "t95")    return "kpi-t95";
    if (k === "Ipeak")  return "kpi-Ipeak";
    if (k === "Dfinal") return "kpi-Dfinal";
    if (k === "IFR")    return "kpi-IFR";
    if (k === "v")      return "kpi-v";
    if (k === "vc")     return "kpi-vc";
    if (k === "deltaV") return "kpi-deltaV";
    return "kpi-" + k;
  }

  /* ---------------------------- KPI Injection ----------------------------- */

  function injectTop(deck, keys) {
    if (!deck) return;
    deck.innerHTML = "";
    keys.forEach((k) => {
      const card  = document.createElement("div");
      const lab   = document.createElement("div");
      const stack = document.createElement("div");
      const rel   = document.createElement("div");
      const abs   = document.createElement("div");

      card.className  = "card kpi kpi--stack";
      card.dataset.series = k;

      lab.className   = "kpi-label";
      lab.textContent = labelForTop(k);

      stack.className = "kpi-stack";

      rel.className   = "kpi-value kpi-value--rel";
      rel.id          = `kpi-${k.toLowerCase()}-rel`;

      abs.className   = "kpi-value kpi-value--abs";
      abs.id          = `kpi-${k.toLowerCase()}-abs`;

      stack.append(rel, abs);
      card.append(lab, stack);
      deck.append(card);
    });
  }

  function injectBottom(deck, keys) {
    if (!deck) return;
    deck.innerHTML = "";
    keys.forEach((k) => {
      const card = document.createElement("div");
      const lab  = document.createElement("div");
      const val  = document.createElement("div");

      card.className   = "card kpi";

      lab.className    = "kpi-label";
      lab.textContent  = labelForBottom(k);

      val.className    = "kpi-value";
      val.id           = idForBottom(k);
      val.style.textAlign = "right";
      val.style.fontVariantNumeric = "tabular-nums";
      val.style.fontFeatureSettings = '"tnum" 1, "lnum" 1';

      card.append(lab, val);
      deck.append(card);
    });
  }

  /* --------------------------- KPI Event-Sink ----------------------------- */

  function setText(sel, val) {
    const el = $(sel);
    if (!el) return;
    el.textContent = (val == null ? "" : String(val));
  }

  function updateFromEvent(detail) {
    const recipe = KPI_RECIPES[model] || KPI_RECIPES.seir;

    // Top deck (relative Anteile, %), nur wenn vorhanden
    if (recipe.top.includes("S") && detail.sRel != null) setText("#kpi-s-rel", fmtPct(detail.sRel));
    if (recipe.top.includes("E") && detail.eRel != null) setText("#kpi-e-rel", fmtPct(detail.eRel));
    if (recipe.top.includes("I") && detail.iRel != null) setText("#kpi-i-rel", fmtPct(detail.iRel));
    if (recipe.top.includes("R") && detail.rRel != null) setText("#kpi-r-rel", fmtPct(detail.rRel));
    if (recipe.top.includes("D") && detail.dRel != null) setText("#kpi-d-rel", fmtPct(detail.dRel));
    if (recipe.top.includes("V") && detail.vRel != null) setText("#kpi-v-rel", fmtPct(detail.vRel));

    // Bottom deck (modellabhängig)
    (recipe.bottom || []).forEach((k) => {
      if (k === "t")      setText("#kpi-t", fmtDay(detail.t));
      if (k === "r0")     setText("#kpi-r0", fmtNum(detail.r0));
      if (k === "reff")   setText("#kpi-reff", fmtNum(detail.reff));
      if (k === "Istar" && detail.Istar && isFinite(detail.Istar.value)) setText("#kpi-Istar", fmtPct(detail.Istar.value));
      if (k === "t95"   && detail.t95   != null) setText("#kpi-t95", fmtDay(detail.t95));
      if (k === "Ipeak" && detail.Ipeak && isFinite(detail.Ipeak.value)) setText("#kpi-Ipeak", fmtPct(detail.Ipeak.value) + "  ·  t=" + fmtDay(detail.Ipeak.day));
      if (k === "Dfinal"&& detail.Dfinal!= null) setText("#kpi-Dfinal", fmtPct(detail.Dfinal));
      if (k === "IFR"   && detail.IFR   != null) setText("#kpi-IFR", fmtPct(detail.IFR));
      if (k === "v"     && detail.v     != null) setText("#kpi-v", fmtPct(detail.v));
      if (k === "vc"    && detail.vc    != null) setText("#kpi-vc", fmtPct(detail.vc));
      if (k === "deltaV"&& detail.deltaV!= null) setText("#kpi-deltaV", fmtPct(detail.deltaV));
    });
  }

  // Öffentliche Senke, falls Boot per Callback eingebunden wird
  function handleKPI(detail) {
    try { updateFromEvent(detail || {}); } catch (_) {}
  }
  window.IDVIntroKPISink = handleKPI;

  // Events vom Runner
  window.addEventListener("idv:intro:kpi", (e) => handleKPI(e.detail || {}), { passive: true });

  /* --------------------------- Coach-Video Helper ------------------------- */

  function mlNumFromHtml() {
    const mlId = (html.getAttribute("data-minilab-id") || "ml2").toLowerCase();
    const m    = mlId.match(/\d+/);
    return (m ? m[0] : "2");
  }

  function validForThisMinilab(src) {
    return typeof src === "string" && src.includes(`minilab-${mlNumFromHtml()}-`);
  }

  function fallbackVideo() {
    const num = mlNumFromHtml();
    return `/media/coaches/${coach}/minilab-${num}-${lang}-${mode}.mp4`;
  }

  async function resolveVideoSrc() {
    let src = "";
    try {
      const url = (window.IDV && window.IDV.Config && window.IDV.Config.i18nUrl) || "";
      if (url) {
        const res = await fetch(url, { credentials: "same-origin" });
        if (res.ok) {
          const json = await res.json();
          const cv   = json && json.coachVideo;
          src = (cv && cv[coach]) || "";
        }
      }
    } catch (_) {}
    if (!validForThisMinilab(src)) {
      const fb = fallbackVideo();
      if (src) console.warn("[intro-boot] coachVideo mismatch:", src, "→ using", fb);
      src = fb;
    }
    return src;
  }

  /* --------------------------- Runner-Erkennung --------------------------- */

  function findRunnerMount() {
    // Bevorzugt explizite Mounts je Modell
    const table = {
      sir:  ["mountIntroSIR",  "IntroSIR",  "IDVIntroSIR"],
      seir: ["mountIntroSEIR", "IntroSEIR", "IDVIntroSEIR"],
      sis:  ["mountIntroSIS",  "IntroSIS",  "IDVIntroSIS"],
      sird: ["mountIntroSIRD", "IntroSIRD","IDVIntroSIRD"],
      sirv: ["mountIntroSIRV", "IntroSIRV","IDVIntroSIRV"]
    }[model] || [];

    for (const name of table) {
      const cand = window[name] || window[name]?.mount;
      if (typeof cand === "function") return cand;
    }

    // Generischer Fallback
    if (typeof window.IDVIntroMount === "function") return window.IDVIntroMount;

    // Objekt mit .mount
    if (window.IDVIntro && typeof window.IDVIntro.mount === "function") return window.IDVIntro.mount;

    return null;
  }

  /* ------------------------------- Boot ----------------------------------- */

  async function boot() {
    // KPI Decks vorbereiten
    const recipe = KPI_RECIPES[model] || KPI_RECIPES.seir;
    injectTop($("#kpis-comp"),    recipe.top);
    injectBottom($("#kpis-context"), recipe.bottom);

    // Runner finden
    const mount = findRunnerMount();
    if (!mount) {
      console.warn("[intro-boot] No runner found for model =", model, "— KPI cards injected, but simulation cannot start.");
      return;
    }

    // Runner mounten
    const api = (mount({ canvas: "#intro-canvas", onUpdate: handleKPI }) || {});
    const play = (opts) => (typeof api.play === "function" ? api.play(opts) : console.warn("[intro-boot] play() not available"));
    const stop = () => (typeof api.stop === "function" ? api.stop() : void 0);

    // Coach-Chip optional initialisieren
    const chip = $("#chip-intro-coach");
    if (chip) {
      chip.setAttribute("data-coach-open", "");
      try {
        const src = await resolveVideoSrc();
        chip.dataset.coachSrc = src;
        chip.dataset.src      = src;
      } catch (_) {}
      chip.addEventListener("click", () => play({ withCoach: true }));
    }

    // Replay Button
    $("#btn-replay")?.addEventListener("click", () => play({ withCoach: false }));

    // Autofokus und Schonendes Stoppen im Hintergrund
    document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); }, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
