/*! =======================================================================

 * ======================================================================= */

(function () {
  const VERSION = "2.4.1";

  // -------- helpers -----------------------------------------------------
  const qs  = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const ce  = (tag, cls) => { const el = document.createElement(tag); if (cls) el.className = cls; return el; };
 
	// Hängt Coach-Coin und Info-Icon an einen Titel
function attachCoinAndInfoToTitle(title, key, def){
  if (!title) return;
  title.style.position = "relative";

  // Tooltip (immer)
  const info = ce("button", "kpi-info");
  info.type = "button";
  info.textContent = "i";

  // Coach-Coin (nur bei Lernzielparametern, School & Uni)
  if (def && def.group === "learning") {
    const modeNS = (STATE?.meta?.mode || "school").toLowerCase(); 
    const coin = ce("button", "coach-coin");
    coin.type = "button";
    coin.setAttribute("data-coach-coin", `pt.${modeNS}.${key}`);
    coin.setAttribute("aria-label", `coach:${key}`);
    coin.textContent = "•";

    title.insertBefore(coin, title.firstChild); // Coin ganz links
  }

  title.appendChild(info); // Info immer rechts
}

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const isNum = (v) => typeof v === "number" && Number.isFinite(v);

  // EPS tolerance to avoid rounding ping-pong in algebraic constraints
  const EPS = 1e-9;
  const nearlyEqual = (a, b, eps = EPS) => Math.abs(a - b) < eps;

  const DICT = {
    en: {
      learning: "Learning parameters",
      model: "Model parameters",
      sim: "Simulation parameters",
      kpis: "Key KPIs",
      viewControls: "Controls view",
      viewFormula: "Formula view",
      formula: "Formula view"
    },
    de: {
      learning: "Lernzielparameter",
      model: "Modellparameter",
      sim: "Simulationsparameter",
      kpis: "Key KPIs",
      viewControls: "Regler-Ansicht",
      viewFormula: "Formel-Ansicht",
      formula: "Formel-Ansicht"
    }
  };
	
	// Minimal-invasive KPI-Matrix (Modell × Modus)
const KPI_SETS = {
  SIR: {
    school:     ["R0","Reff0","N"],
    university: ["R0","Reff0","HIT","T2","N","D","betaEff"]
  },
  SEIR: {
    school:     ["R0","Reff0","N"],
    university: ["R0","Reff0","HIT","T2","N","D","L","betaEff"]
  },
  SIS: {
    school:     ["R0","Reff0","N"],
    university: ["R0","Reff0","T2","N","D","betaEff"]   // kein HIT bei SIS
  },
  SIRD: {
    school:     ["R0","Reff0","N"],
    university: ["R0","Reff0","HIT","T2","N","D","betaEff"]
  },
  SIRV: {
    school:     ["R0","Reff0","N"],
    university: ["R0","Reff0","HIT","T2","N","D","betaEff"]
  }
};
	
	// Liefert die KPI-Liste je Modell × Modus (mit Fallback)
function resolveKPIs(model, mode, fallback){
  const M = String(model || "SIR").toUpperCase();
  const X = String(mode  || "school").toLowerCase();
  return (KPI_SETS[M] && KPI_SETS[M][X]) || fallback || ["R0","Reff0","N"];
}
	
	
// Welche Regler pro Modell × Modus angezeigt werden
const CONTROL_SETS = {
  SIR: {
    school:     ["beta","gamma","measures","N","T"],              // ohne I0, ohne dt
    university: ["beta","gamma","measures","N","T","I0","dt"]
  },
  SEIR: {
    school:     ["beta","gamma","sigma","measures","N","T"],      // ohne I0, ohne dt
    university: ["beta","gamma","sigma","measures","N","T","I0","dt"]
  },
  SIS: {
    school:     ["beta","gamma","measures","N","T"],              // ohne I0, ohne dt
    university: ["beta","gamma","measures","N","T","I0","dt"]
  },
  SIRD: {
    school:     ["beta","gamma","measures","N","T"],              // ohne I0, ohne dt
    university: ["beta","gamma","measures","N","T","I0","dt"]
  },
  SIRV: {
    school:     ["beta","gamma","measures","N","T","v"],          // evtl. Impfparameter "v"
    university: ["beta","gamma","measures","N","T","I0","dt","v"]
  }
};


const KPI_LABELS = {
  de: {
    R0:      "R₀",
    Reff0:   "Rₑff(0)",
    HIT:     "Herdenschutz-Schwelle",
    T2:      "Verdopplungszeit T₂",
    N:       "N",
    D:       "Infektiöse Dauer D",
    L:       "Latenzzeit L",
    betaEff: "β_eff (effektive Infektionsrate)"
  },
  en: {
    R0:      "R₀",
    Reff0:   "Rₑff(0)",
    HIT:     "Herd immunity threshold",
    T2:      "Doubling time T₂",
    N:       "N",
    D:       "Infectious period D",
    L:       "Latency period L",
    betaEff: "β_eff (effective transmission rate)"
  }
  };
	
  // --- Tooltip fallback texts (DE/EN) for Parameter-Tool (integrated)
  const PT_TIP = {
    de: {
      D: "D (Dauer der Infektiosität) — mittlere Zeit ansteckend. Einheit: Tage. Kopplung: γ = 1 / D.",
      gamma: "γ (Gamma, Genesungsrate) — Abfluss aus I pro Tag. Einheit: 1/Tag. Kopplung: γ = 1 / D.",
      beta: "β (Beta, Infektionsrate) — Kontakte × Übertragungsw’keit pro Tag. Einheit: 1/Tag. Kopplung: β = R₀·γ.",
      R0: "R₀ (Basisreproduktionszahl) — Sekundärfälle je Indexfall ohne Interventionen. Kopplung: R₀ = β / γ.",
      measures: "m (Interventionen) — Anteil wirksamer Maßnahmen (0–100%). β_eff = β·(1−m), R_eff ≈ R₀·(1−m)·S/N.",
      N: "N (Population) — Gesamtbevölkerung im Modell.",
      I0: "I₀ (Indexfälle) — anfänglich Infektiöse zu Beginn.",
      T: "T (Simulationsdauer) — Länge der Simulation in Tagen.",
      dt: "Δt (Zeitschritt) — numerischer Schritt (Stabilität/Glättung).",
      Beff: "β_eff — effektive Infektionsrate: β·(1−m).",
      Reff: "R_eff(t) — effektive Reproduktionszahl: ~R₀·(1−m)·S(t)/N.",
      Reff0: "R_eff(0) — effektiver R-Wert zum Start: ~R₀·(1−m)·S₀/N."
    },
    en: {
      D: "D (duration of infectiousness) — average time contagious. Unit: days. Coupling: γ = 1 / D.",
      gamma: "γ (gamma, recovery rate) — outflow from I per day. Unit: per day. Coupling: γ = 1 / D.",
      beta: "β (beta, infection rate) — contacts × transmission probability per day. Unit: per day. Coupling: β = R₀·γ.",
      R0: "R₀ (basic reproduction number) — secondary cases per index case without interventions. Coupling: R₀ = β / γ.",
      measures: "m (interventions) — share of effective measures (0–100%). β_eff = β·(1−m), R_eff ≈ R₀·(1−m)·S/N.",
      N: "N (population) — total population in the model.",
      I0: "I₀ (index cases) — initially infectious at start.",
      T: "T (simulation horizon) — length of the simulation in days.",
      dt: "Δt (time step) — numerical step (stability/smoothing).",
      Beff: "β_eff — effective infection rate: β·(1−m).",
      Reff: "R_eff(t) — effective reproduction number: ~R₀·(1−m)·S(t)/N.",
      Reff0: "R_eff(0) — effective R at start: ~R₀·(1−m)·S₀/N."
    }
  };
  function tooltipFallbackFor(key){
    const docLang = (document.documentElement.getAttribute("lang") || "de").toLowerCase();
    const lang = docLang.startsWith("de") ? "de" : "en";
    const tbl = (lang === "de" ? PT_TIP.de : PT_TIP.en);
    const mapKey = (key === "betaEff") ? "Beff" : key;
    return tbl[mapKey] || String(mapKey);
  }


  const COUPLINGS = {
    SIR:  ["D","gamma","beta","R0"],
    SEIR: ["D","gamma","beta","R0","L","sigma"] // später feinjustieren
  };

  const CATALOG = {
    SIR: {
      params: {
        beta:  { label:{de:"β (Infektionsrate)", en:"β (infection rate)"}, min:0.05, max:1.5, step:0.01, unit:"/d",  group:"model" },
        D:     { label:{de:"D (Dauer)",          en:"D (duration)"},       min:1,    max:21,  step:0.1,  unit:"days",group:"learning" },
        gamma: { label:{de:"γ (Genesungsrate)",  en:"γ (recovery rate)"},  min:0.02, max:1.0, step:0.01, unit:"/d",  group:"model" },
        R0:    { label:{de:"R₀",                 en:"R₀"},                 min:0.5,  max:20,  step:0.01, unit:"",    group:"model" },
        measures:{label:{de:"Maßnahmen", en:"Measures"}, min:0, max:1, step:0.01, unit:"%", group:"learning" },
        N:     { label:{de:"Population N", en:"Population N"}, min:1e5, max:1e8, step:1e5, group:"sim" },
        I0:    { label:{de:"Indexfälle I₀", en:"Index cases I₀"}, min:1, max:5e4, step:1, group:"sim" },
        T:     { label:{de:"Dauer T", en:"Duration T"}, min:30, max:365, step:1, unit:"days", group:"sim" },
        dt:    { label:{de:"Zeitschritt Δt", en:"Time step Δt"}, min:0.25, max:2, step:0.25, group:"sim" }
      },
      kpis: ["R0","Reff0","HIT","T2","N"]
    },
    SEIR: {
      params: {
        beta:{label:{de:"β", en:"β"}, min:0.05, max:1.5, step:0.01, group:"model"},
        D:{label:{de:"D (Dauer)", en:"D (duration)"}, min:1, max:21, step:0.1, group:"learning"},
        L:{label:{de:"L (Latenz)", en:"L (latency)"}, min:1, max:14, step:0.5, group:"learning"},
        gamma:{label:{de:"γ", en:"γ"}, min:0.02, max:1.0, step:0.01, group:"model"},
        sigma:{label:{de:"σ", en:"σ"}, min:0.07, max:1.0, step:0.01, group:"model"},
        R0:{label:{de:"R₀", en:"R₀"}, min:0.5, max:20, step:0.01, group:"model"},
        N:{label:{de:"Population N", en:"Population N"}, min:1e5, max:1e8, step:1e5, group:"sim"},
        I0:{label:{de:"Indexfälle I₀", en:"Index cases I₀"}, min:1, max:5e4, step:1, group:"sim"},
        T:{label:{de:"Dauer T", en:"Duration T"}, min:30, max:365, step:1, unit:"days", group:"sim"},
        dt:{label:{de:"Zeitschritt Δt", en:"Time step Δt"}, min:0.25, max:2, step:0.25, group:"sim"}
      },
      kpis: ["R0","Reff0","N"]
    }
  };

  const DEFAULTS = {
    meta:   { lang:"de", mode:"school", model:"SIR", minilabId:null, view:"controls" , driverKey:null },
    params: { beta:0.30, D:10, gamma:0.10, R0:3.0, measures:0.0, N:1_000_000, I0:1, T:120, dt:0.5, L:null, sigma:null },
    derived:{ R0:3.0, Reff0:3.0, S0:999_999, gammaFromD:0.10 }
  };

  let STATE  = JSON.parse(JSON.stringify(DEFAULTS));
  let CONFIG = null;
  let TARGET = null;

  // guards
  let __rafPending = false;
  let __dragActive = null;
  let __isApplying = false;

// -------- Formel-Ansicht pulse & timing --------------------------------
const PULSE_MS = 600;
const __pulseTimers = Object.create(null);

// Pulst gezielt ein Number-Part in der Formel (per CSS-Klasse .pt-num--<var>)
function pulseNumPart(varName, root){
  const host = root || document;
  const nodes = qsa(`.pt-eq-row .nums .pt-num--${varName}`, host);
  nodes.forEach(el => {
    // Reset vorherige Pulse
    el.classList.remove("pulsed");
    void el.offsetWidth; // reflow, damit CSS-Animation neu startet
    el.classList.add("pulsed");

    // Timer zum Entfernen
    const id = varName + ":" + Math.random();
    if (__pulseTimers[id]) clearTimeout(__pulseTimers[id]);
    __pulseTimers[id] = setTimeout(()=> el.classList.remove("pulsed"), PULSE_MS);
  });
}

// Pulst nur innerhalb der gewünschten Formel-Zeile (data-key), z. B. rowKey="gamma"
function pulseNumPartInRow(varName, rowKey, root){
  const host = root || TARGET;
  const row  = host.querySelector(`.pt-eq-row[data-key="${rowKey}"]`);
  if (!row) return;
  row.querySelectorAll(`.nums .pt-num--${varName}`).forEach(el => {
    el.classList.remove("pulsed");
    void el.offsetWidth;          // reflow
    el.classList.add("pulsed");
    setTimeout(()=> el.classList.remove("pulsed"), PULSE_MS);
  });
}


// -------- formatting & parsing ----------------------------------------
const fmt = {
  nf: null,
  setLocale(lang){ this.nf = new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-US"); },
  numToStr(v){ return isNum(v) ? this.nf.format(v) : ""; }
};

function parseLocaleNumber(str, lang){
  if (typeof str !== "string") return NaN;
  let s = str.trim();
  if (lang === "de") s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function decimalsFor(key){
  const mode = (STATE.meta.mode||"school").toLowerCase();
  const map = {
    school:     { measures:2, D:2, beta:2, gamma:2, R0:2, dt:2, N:0, I0:0, T:0, L:2, sigma:3 },
    university: { measures:2, D:2, beta:4, gamma:4, R0:3, dt:2, N:0, I0:0, T:0, L:2, sigma:3 }
  };
  const d = (map[mode] && map[mode][key] != null) ? map[mode][key] : 2;
  return d;
}

function formatInputValue(key, v){
  const dec = decimalsFor(key);
  if (!Number.isFinite(v)) return "";
  const rounded = Number(v).toFixed(dec);
  return new Intl.NumberFormat(
    STATE.meta.lang === "de" ? "de-DE" : "en-US",
    { minimumFractionDigits: dec, maximumFractionDigits: dec }
  ).format(Number(rounded));
}


  // -------- events -------------------------------------------------------
  function emit(name, detail){ document.dispatchEvent(new CustomEvent(name, { bubbles:true, detail })); }

  function enrichedState() {
    const st = getState();
    const p  = st.params;

    const gamma = isNum(p.gamma) ? p.gamma
                : (isNum(p.D) && p.D > 0 ? 1 / p.D : undefined);

    const beta  = isNum(p.beta) ? p.beta
                : (isNum(p.R0) && isNum(gamma) ? p.R0 * gamma : undefined);

    const R0    = isNum(p.R0) ? p.R0
                : (isNum(beta) && isNum(gamma) && gamma > 0 ? beta / gamma : undefined);

    const sigma = isNum(p.sigma) ? p.sigma
                : (isNum(p.L) && p.L > 0 ? 1 / p.L : undefined);

    st.params = { ...p, beta, gamma, R0, ...(sigma !== undefined ? { sigma } : {}) };
    return st;
  }

  function emitReady(){ emit("idv:params:ready", enrichedState()); }
  function emitChange(key, oldValue, newValue){
    emit("idv:param:change", { cause:`user:drag:${key}`, key, oldValue, newValue, state:getState() });
  }
  function emitUpdate(cause){
    const st = enrichedState();
    emit("idv:params:update", { cause, state: st, params: st.params, meta: st.meta });
  }

  // -------- math/derived -------------------------------------------------
  function recalcDerived() {
    const p = STATE.params;

    if (isNum(p.D) && p.D > 0) STATE.derived.gammaFromD = +(1 / p.D).toFixed(4);

    const hasBG = isNum(p.beta) && isNum(p.gamma) && p.gamma > 0;
    STATE.derived.R0 = hasBG ? +(p.beta / p.gamma).toFixed(3) : (isNum(p.R0) ? +(+p.R0).toFixed(3) : 0);

    STATE.params.R0 = STATE.derived.R0;

    STATE.derived.S0 = Math.max(0, (p.N ?? 0) - (p.I0 ?? 0));

    const m = clamp(p.measures ?? 0, 0, 1);
    const includeSratio = (STATE.meta.mode === 'university');
    const sRatio = includeSratio && (p.N>0) ? (STATE.derived.S0 / p.N) : 1;
    const R0base = STATE.derived.R0 || 0;
    STATE.derived.Reff0 = +(R0base * (1 - m) * sRatio).toFixed(3);
  }

  function applyConstraints(changedKey){
    const p = STATE.params;
    const model = STATE.meta.model;

    if (model==="SIR" || model==="SEIR") {
      if (changedKey === "D") {
        if (isNum(p.D) && p.D > 0) {
          const newGamma = 1 / p.D;
          if (!nearlyEqual(p.gamma, newGamma)) p.gamma = newGamma;
        }
      } else if (changedKey === "gamma") {
        if (isNum(p.gamma) && p.gamma > 0) {
          const newD = 1 / p.gamma;
          if (!nearlyEqual(p.D, newD)) p.D = newD;
        }
      } else if (changedKey === "R0") {
        if (isNum(p.R0) && isNum(p.gamma)) {
          const newBeta = p.R0 * p.gamma;
          if (!nearlyEqual(p.beta, newBeta)) p.beta = newBeta;
        }
      }
      // 'beta' change → R0 derived
    }

    if (model==="SEIR") {
      if (changedKey === "L" && isNum(p.L) && p.L > 0) {
        const newSigma = 1 / p.L;
        if (!nearlyEqual(p.sigma, newSigma)) p.sigma = newSigma;
      } else if (changedKey === "sigma" && isNum(p.sigma) && p.sigma > 0) {
        const newL = 1 / p.sigma;
        if (!nearlyEqual(p.L, newL)) p.L = newL;
      }
    }
  }

  // -------- UI sync ------------------------------------------------------
  function syncControl(key){
    const val = STATE.params[key];
    const slider = qs(`#pt-${key}`, TARGET);
    const direct = qs(`#pt-${key}-n`, TARGET);
    if (slider && isNum(val)) slider.value = (key==="measures") ? (val*100) : val;
    if (direct) {
      const dv = (key==="measures") ? (val*100) : val;
      direct.value = isNum(dv) ? formatInputValue(key, dv) : "";
    }
  }
  function syncAllControls(){ Object.keys(STATE.params).forEach(syncControl); }

  function section(titleKey){
    const wrap = ce("section", "pt-section");
    const h = ce("h3", "pt-section-title");
    h.textContent = DICT[STATE.meta.lang]?.[titleKey] || titleKey;
    const body = ce("div", "pt-section-body");
    wrap.appendChild(h); wrap.appendChild(body);
    return { wrap, body };
  }

  function renderControl(key, def){
    const lang = STATE.meta.lang;
    const row = ce("div", "pt-row");
    const label = ce("label", "pt-label");
    label.textContent = def.label?.[lang] || key;
    label.setAttribute("for", `pt-${key}`);
    
    // --- Tooltips & Coach-Coin (integrated, Live-KPI pattern)
    try {
      if ((STATE.meta.mode||"school").toLowerCase()==="school" && (def.group==="learning")) {
        // School + Learning: Coach-Coin (opens coach overlay via coach-coins.js)
        const coin = ce("button", "coach-coin");
        coin.type = "button";
        coin.setAttribute("data-coach-coin", `pt.school.${key}`);
        coin.setAttribute("aria-label", `coach:${key}`);
        coin.textContent = "•";
        label.style.position = "relative";
        label.appendChild(coin);
      } else {
        // Default: Info-Icon with i18n key + fallback title
        const info = ce("button", "kpi-info");
        info.type = "button";
        // Map special RO keys if ever used here
        const tipKey = (key==="betaEff")? "pt.Beff" : (key==="Reff")? "pt.Reff" : (key==="Reff0")? "pt.Reff0" : ("pt."+key);
        info.setAttribute("data-tooltip-i18n", tipKey);
        info.setAttribute("title", tooltipFallbackFor(key));
        info.textContent = "i";
        label.style.position = "relative";
        label.appendChild(info);
      }
    } catch(_e) {}
const inputWrap = ce("div", "pt-input");

    const slider = ce("input");
    slider.type = "range"; slider.id = `pt-${key}`;
    const isMeasures = (key === "measures");
    slider.min = isMeasures ? 0 : (def.min ?? 0);
    slider.max = isMeasures ? 100 : (def.max ?? 1);
    slider.step = isMeasures ? 1 : (def.step ?? 0.01);
    const sv = STATE.params[key];
    slider.value = isMeasures ? (sv*100) : (isNum(sv) ? sv : (isMeasures ? 0 : def.min ?? 0));

    const direct = ce("input");
    direct.type = "text";
    direct.className = "pt-number";
    direct.id = `pt-${key}-n`;
    const dv = isMeasures ? (STATE.params[key]*100) : STATE.params[key];
    direct.value = isNum(dv) ? formatInputValue(key, dv) : "";
    if (STATE.meta.mode === "school") { direct.disabled = true; direct.classList.add("pt-disabled"); }

    inputWrap.appendChild(slider); inputWrap.appendChild(direct);

    const unit = ce("span", "pt-unit");
    if (def.unit === "%") unit.textContent = "%";
    else if (def.unit === "days") unit.textContent = (STATE.meta.lang === "de" ? "Tage" : "days");
    else if (def.unit === "/d") unit.textContent = "/d";

    slider.addEventListener("input", () => updateValueFromSlider(key, def, slider.value));
    direct.addEventListener("change", () => updateValueFromDirect(key, def, direct.value));

    const endDrag = () => {
      if (__dragActive === key) {
        __dragActive = null;
        emitUpdate(`user:dragend:${key}`);
      }
    };
    slider.addEventListener("pointerdown", () => { __dragActive = key; STATE.meta.driverKey = key; });
    slider.addEventListener("pointerup", endDrag);
    slider.addEventListener("pointercancel", endDrag);
    slider.addEventListener("mouseleave", endDrag);
    slider.addEventListener("mouseup", endDrag);
    slider.addEventListener("touchend", endDrag);

    row.appendChild(label); row.appendChild(inputWrap); row.appendChild(unit);
    return row;
  }

// Hängt Coach-Coin (nur für Lernziel-Parameter) + Tooltip an den Titel einer Control-Karte.
// Reihenfolge im Titel: [Coin | bestehender Titeltext | Info], vorherige Duplikate werden entfernt.
function decorateControlTitle(node, key, def){
  if (!node || !def) return;

  // Titel-Element finden (versucht beide gängigen Klassen)
  const title =
    node.querySelector(".pt-label") ||
    node.querySelector(".pt-control-title") ||
    node.querySelector(".pt-row > .pt-label");
  if (!title) return;

  title.style.position = "relative";

  // Vorhandene Coins/Infos im Titel wegräumen (verhindert Doppeln in School)
  title.querySelectorAll(".coach-coin, .kpi-info").forEach(el => el.remove());

  // --- Tooltip (immer) ---
  const info = document.createElement("button");
  info.className = "kpi-info";
  info.type = "button";
  const tipKey =
    (key === "betaEff") ? "pt.Beff" :
    (key === "Reff")    ? "pt.Reff" :
    (key === "Reff0")   ? "pt.Reff0" : ("pt." + key);
  info.setAttribute("data-tooltip-i18n", tipKey);
  if (typeof tooltipFallbackFor === "function") {
    info.setAttribute("title", tooltipFallbackFor(key));
  }
  info.textContent = "i";

  // --- Coach-Coin (nur Lernziel-Parameter; in School UND University) ---
  if (def.group === "learning") {
    const coin = document.createElement("button");
    coin.className = "coach-coin";
    coin.type = "button";
    const modeNS = ((STATE && STATE.meta && STATE.meta.mode) || "school").toLowerCase();
    coin.setAttribute("data-coach-coin", `pt.${modeNS}.${key}`);
    coin.setAttribute("aria-label", `coach:${key}`);
    coin.textContent = "•";

    // Coin ganz links
    title.insertBefore(coin, title.firstChild);
  }

  // Info immer rechts
  title.appendChild(info);
}

function addControlsByGroup(container, group){
  const cat = CATALOG[STATE.meta.model]; if (!cat) return;
  Object.entries(cat.params).forEach(([key, def]) => {
    if (def.group === group) {
      const node = renderControl(key, def);
      decorateControlTitle(node, key, def);   // 👈 dekoriert Titel mit Coin + Info
      container.appendChild(node);
    }
  });
}


function addControlsByKeys(container, keys){
  const cat = CATALOG[STATE.meta.model]; 
  if (!cat || !Array.isArray(keys)) return;

  keys.forEach(key => {
    const def = cat.params[key];
    if (def) {
      const node = renderControl(key, def);
      decorateControlTitle(node, key, def);   // 👈 sorgt für Coin + Info wie bei Group
      container.appendChild(node);
    }
  });
}



// KPIs ------------------------------------------------------------------
function renderKPIs(container){
  const kpiTitle = ce("h3", "pt-section-title");
  kpiTitle.textContent = DICT[STATE.meta.lang]?.kpis || "KPIs";
  container.appendChild(kpiTitle);

  const kpiWrap = ce("div", "pt-kpis");

  // 👉 Keys jetzt aus der Matrix (modell- & modusabhängig)
  const keys = STATE.meta.kpis || ["R0","Reff0","N"];

  const lang = STATE.meta.lang;
  keys.forEach(k => {
    const card  = ce("div", "pt-kpi");
    const title = ce("div", "pt-kpi-title");
    title.textContent = (KPI_LABELS?.[lang]?.[k]) || k;

    const val = ce("div", "pt-kpi-value");
    val.dataset.key = k;

    card.appendChild(title);
    card.appendChild(val);
    kpiWrap.appendChild(card);
  });

  container.appendChild(kpiWrap);
  updateKPIValues();
}


 function updateKPIValues(){
  // --- Helper -----------------------------------------------------------
  const toNum = v => (v === null || v === undefined ? NaN : Number(v));
  const langTag = (STATE?.meta?.lang === "de") ? "de-DE" : "en-US";
  const fmtFixed = (x, min, max) =>
    new Intl.NumberFormat(langTag, { minimumFractionDigits: min, maximumFractionDigits: max }).format(x);

  // --- Parameter einlesen -----------------------------------------------
  const R0     = toNum(STATE?.derived?.R0);
  const Reff0  = toNum(STATE?.derived?.Reff0);
  const N      = toNum(STATE?.params?.N);
  const gamma  = toNum(STATE?.params?.gamma);   // 1/D
  const sigma  = toNum(STATE?.params?.sigma);   // 1/L
  const betaIn = toNum(STATE?.params?.beta);
  let   meas   = toNum(STATE?.params?.measures);
  if (!Number.isFinite(meas)) meas = 0;
  if (meas > 1) meas = meas / 100;              // 0..100 → 0..1

  const wrap = document.querySelector(".pt-kpis");
  if (!wrap) return;

  // --- Abgeleitete Größen -----------------------------------------------
  const D = (Number.isFinite(gamma) && gamma > 0) ? (1 / gamma) : NaN;  // Tage
  const L = (Number.isFinite(sigma) && sigma > 0) ? (1 / sigma) : NaN;  // Tage

  const beta0 = Number.isFinite(betaIn)
    ? betaIn
    : (Number.isFinite(R0) && Number.isFinite(gamma) ? R0 * gamma : NaN);

  const betaEff = Number.isFinite(beta0) ? beta0 * (1 - meas) : NaN;

  const base = { R0, Reff0, N, D, L, betaEff };

  // --- HIT (in %) -------------------------------------------------------
  let hitText = "—";
  if (Number.isFinite(R0) && R0 > 1) {
    const hit = (1 - 1 / R0) * 100;
    hitText = fmtFixed(hit, 1, 1) + " %";
  }

  // --- T2 (in Tagen) ----------------------------------------------------
  let t2Text = "—";
  if (Number.isFinite(gamma) && Number.isFinite(R0)) {
    const r0 = gamma * (R0 - 1);
    if (r0 > 0) {
      const T2 = Math.log(2) / r0;
      t2Text = fmtFixed(T2, 1, 1) + " d";
    }
  }

  // --- Ausgabe ----------------------------------------------------------
  wrap.querySelectorAll(".pt-kpi-value").forEach(el => {
    const k = el.dataset?.key;

    if (k === "HIT") { el.textContent = hitText; return; }
    if (k === "T2")  { el.textContent = t2Text;  return; }

    const v = base[k];
    if (!Number.isFinite(v)) { el.textContent = "—"; return; }

    if (k === "D" || k === "L") {
      el.textContent = fmtFixed(v, 1, 1) + " d";      // Tage
    } else if (k === "betaEff") {
      el.textContent = fmtFixed(v, 3, 3) + " /d";     // Rate pro Tag
    } else if (k === "N") {
      el.textContent = new Intl.NumberFormat(langTag).format(v);
      // alternativ: el.textContent = fmt.numToStr(v);
    } else {
      el.textContent = fmt.numToStr(v);
    }
  });
}


  // -------- Formel-Ansicht: Utilities -----------------------------------
  function pulseNumPart(varName, root){
    const host = root || TARGET;
    const nodes = qsa(`.pt-eq-row .nums .pt-num--${varName}`, host);
    nodes.forEach(el => {
      el.classList.remove("pulsed"); // restart
      // reflow
      void el.offsetWidth;
      el.classList.add("pulsed");
      const id = `${varName}-${Math.random()}`;
      __pulseTimers[id] = setTimeout(()=> el.classList.remove("pulsed"), PULSE_MS);
    });
  }

  function anchorEqToFracCenter(eqEl){
    if (!eqEl) return;
    const frac = eqEl.querySelector(".nums mjx-mfrac, .nums mjx-frac");
    const rEq  = eqEl.getBoundingClientRect();
    let ox = rEq.width * 0.5, oy = rEq.height * 0.5;
    if (frac){
      const rf = frac.getBoundingClientRect();
      ox = (rf.left + rf.right)/2 - rEq.left;
      oy = (rf.top  + rf.bottom)/2 - rEq.top;
    }
    eqEl.style.transformOrigin = `${ox}px ${oy}px`;
  }

  function fitEqToRow(eqEl){
    if (!eqEl) return;
    // erst Anker setzen, dann messen
    anchorEqToFracCenter(eqEl);
    const parent = eqEl.parentElement; if (!parent) return;
    const pw = parent.clientWidth || 1;
    eqEl.style.transform = "scale(1)";
    const ww = eqEl.scrollWidth || eqEl.getBoundingClientRect().width || 1;
    let scale = Math.min(1, pw / ww);
    const steps = 32; // Snap-Stufen
    scale = Math.round(scale * steps) / steps;
    eqEl.style.transform = `scale(${scale})`;
  }

  const units = () => ({
    days: (STATE.meta.lang === "de" ? "Tage" : "days"),
    perDay: "/d"
  });
  function nfFor(dec){ return new Intl.NumberFormat(STATE.meta.lang === "de" ? "de-DE" : "en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  function dval(key){ return STATE.params[key]; }
  function ddec(key){ return decimalsFor(key); }

  // Symbol-TeX (statisch, einmal typesetten)
  function symbolTexFor(key){
    switch(key){
      case "D":     return "D = \\frac{1}{\\gamma}";
      case "gamma": return "\\gamma = \\frac{\\beta}{R_0}";
      case "beta":  return "\\beta = R_0 \\cdot \\gamma";
      case "R0":    return "R_0 = \\frac{\\beta}{\\gamma}";
      case "betaEff": return "\\beta_{\\mathrm{eff}} = \\beta \\cdot (1 - m)";
      case "Reff":    return "R_{\\mathrm{eff}} = R_0 \\cdot (1 - m) \\cdot \\frac{S}{N}";
      case "Reff0":   return "R_{\\mathrm{eff}}(0) = R_0 \\cdot (1 - m) \\cdot \\frac{S_0}{N}";
      default:      return key;
    }
  }

  // Zahlen-TeX (IN der Bruch-/Produkt-Schreibweise; nutzt \class … für gezieltes Highlight)
  function numbersTexFor(key){
    const U  = units();
    const nfD = nfFor(ddec("D"));
    const nfG = nfFor(ddec("gamma"));
    const nfB = nfFor(ddec("beta"));
    const nfR = nfFor(ddec("R0"));

    if (key === "D"){
      // D = 1/γ = 1 / γ_live = D_live Tage
      const g = nfG.format(dval("gamma"));
      const Dl = nfD.format(dval("D"));
      return String.raw`
        \;=\; \frac{ \class{pt-num pt-num--one}{1} }{ \class{pt-num pt-num--gamma}{${g}} }
        \;=\; ${Dl}\ \text{${U.days}}
      `;
    }
    if (key === "gamma"){
      // γ = β/R0 = (β_live)/(R0_live) = γ_live /d
      const b = nfB.format(dval("beta"));
      const r = nfR.format(dval("R0"));
      const gl= nfG.format(dval("gamma"));
      return String.raw`
        \;=\; \frac{ \class{pt-num pt-num--beta}{${b}} }{ \class{pt-num pt-num--R0}{${r}} }
        \;=\; ${gl}\ \text{${U.perDay}}
      `;
    }
    if (key === "beta"){
      // β = R0·γ = (R0_live)·(γ_live) = β_live /d
      const r = nfR.format(dval("R0"));
      const g = nfG.format(dval("gamma"));
      const bl= nfB.format(dval("beta"));
      return String.raw`
        \;=\; \class{pt-num pt-num--R0}{${r}} \cdot \class{pt-num pt-num--gamma}{${g}}
        \;=\; ${bl}\ \text{${U.perDay}}
      `;
    }
    if (key === "R0"){
      // R0 = β/γ = (β_live)/(γ_live) = R0_live
      const b = nfB.format(dval("beta"));
      const g = nfG.format(dval("gamma"));
      const rl= nfR.format(dval("R0"));
      return String.raw`
        \;=\; \frac{ \class{pt-num pt-num--beta}{${b}} }{ \class{pt-num pt-num--gamma}{${g}} }
        \;=\; ${rl}
      `;
    }

    if (key === "betaEff"){
      const U = units();
      const nfB = nfFor(ddec("beta"));
      const nfM = nfFor(ddec("measures"));
      const b  = nfB.format(dval("beta"));
      const m  = (STATE.params.measures||0);
      const mP = nfM.format(m*100);
      const be = nfB.format((dval("beta")||0) * (1 - m));
      return String.raw`\;=\; \class{pt-num pt-num--beta}{${b}} \cdot (1 - \class{pt-num pt-num--measures}{${mP}}\,\%)\;=\; ${be}\ \text{${U.perDay}}`;
    }

    if (key === "Reff0"){
      const nfR = nfFor(ddec("R0"));
      const nfM = nfFor(ddec("measures"));
      const r0 = nfR.format(dval("R0"));
      const m  = (STATE.params.measures||0);
      const mP = nfM.format(m*100);
      const s0 = (STATE.params.N>0) ? (Math.max(0,(STATE.params.N - (STATE.params.I0||0)))/STATE.params.N) : 1;
      const sT = s0.toFixed(3);
      const rv = nfR.format((dval("R0")||0) * (1 - m) * s0);
      return String.raw`\;=\; \class{pt-num pt-num--R0}{${r0}} \cdot (1 - \class{pt-num pt-num--measures}{${mP}}\,\%) \cdot \class{pt-num pt-num--sratio}{${sT}}\;=\; ${rv}`;
    }

    if (key === "Reff"){
      const nfR = nfFor(ddec("R0"));
      const nfM = nfFor(ddec("measures"));
      const r0 = nfR.format(dval("R0"));
      const m  = (STATE.params.measures||0);
      const mP = nfM.format(m*100);
      const s0 = (STATE.params.N>0) ? (Math.max(0,(STATE.params.N - (STATE.params.I0||0)))/STATE.params.N) : 1; // use S0/N as proxy
      const sT = s0.toFixed(3);
      const rv = nfR.format((dval("R0")||0) * (1 - m) * s0);
      return String.raw`\;=\; \class{pt-num pt-num--R0}{${r0}} \cdot (1 - \class{pt-num pt-num--measures}{${mP}}\,\%) \cdot \frac{S}{N}\;\approx\; ${rv}`;
    }
    return "";
  }

  function typesetPartsAndFit(root){
    const nodes = qsa(".pt-eq .sym, .pt-eq .nums", root);
    const MJ = (window.MathJax && (window.MathJax.typesetPromise || window.MathJax.typeset));
    if (nodes.length === 0) return;

    // typeset nur die Teile, danach alle eq fitten
    const finish = () => { qsa(".pt-eq", root).forEach(fitEqToRow); };

    if (MJ && window.MathJax.typesetPromise){
      window.MathJax.typesetPromise(nodes).then(finish).catch(finish);
    } else if (MJ && window.MathJax.typeset) {
      window.MathJax.typeset(nodes);
      finish();
    } else {
      // Fallback ohne MathJax: naive Umsetzungen & fit
      nodes.forEach(n=>{
        n.innerHTML = n.innerHTML
          .replaceAll("\\frac","/")
          .replaceAll("\\cdot","·")
          .replaceAll("_0","₀")
          .replaceAll("\\gamma","γ")
          .replaceAll("\\beta","β")
          .replaceAll("R_0","R₀");
      });
      finish();
    }
  }

  function updateNumbersAndFitAll(){
    if (STATE.meta.view !== "formula") return;
    qsa(".pt-eq-row", TARGET).forEach(row=>{
      const key = row.getAttribute("data-key");
      const eq   = qs(".pt-eq", row);
      const nums = qs(".nums", eq);
      if (nums) { nums.innerHTML = `\\(${numbersTexFor(key)}\\)`; }
    });
    typesetPartsAndFit(TARGET);
  }

// -------- Toolbar (Ansicht-Umschalter) --------------------------------
function buildToolbar(container){
  // 👉 Im School-Modus keine Toolbar anzeigen
  if ((STATE.meta.mode || "school").toLowerCase() === "school") {
    return;
  }

  const bar = ce("div", "pt-toolbar");
  const lang = STATE.meta.lang;

  const btnControls = ce("button", "pt-ctrl");
  btnControls.type = "button";
  btnControls.textContent = DICT[lang]?.viewControls || "Controls view";
  btnControls.setAttribute("aria-pressed", STATE.meta.view === "controls" ? "true" : "false");

  const btnFormula = ce("button", "pt-ctrl");
  btnFormula.type = "button";
  btnFormula.textContent = DICT[lang]?.viewFormula || "Formula view";
  btnFormula.setAttribute("aria-pressed", STATE.meta.view === "formula" ? "true" : "false");

  btnControls.addEventListener("click", () => {
    if (STATE.meta.view === "controls") return;
    STATE.meta.view = "controls";
    render(); syncAllControls();
  });

  btnFormula.addEventListener("click", () => {
    if (STATE.meta.view === "formula") return;
    STATE.meta.view = "formula";
    render(); syncAllControls();
  });

  bar.appendChild(btnControls);
  bar.appendChild(btnFormula);
  container.appendChild(bar);
}


// -------- Standard-Ansicht --------------------------------------------
function renderControlsView(){
  const secL = section("learning");
  addControlsByGroup(secL.body, "learning");
  TARGET.appendChild(secL.wrap);

  if ((STATE.meta.mode || "school").toLowerCase() !== "school") {
    const secM = section("model");
    addControlsByGroup(secM.body, "model");
    TARGET.appendChild(secM.wrap);
  }

  const secS = section("sim");
  addControlsByGroup(secS.body, "sim");

  // 👉 SCHOOL: Unerwünschte Sim-Regler nach dem Build entfernen (I0, dt)
  if ((STATE.meta.mode || "school").toLowerCase() === "school") {
    const removeSimControl = (key) => {
      // 1) Versuche ganze Row über data-key zu finden
      let row = secS.body.querySelector(`[data-key="${key}"]`);
      if (!row) {
        // 2) Fallbacks: über Input/Control referenzieren
        const el = secS.body.querySelector(
          `#pt-${key}, [name="${key}"], [data-param="${key}"]`
        );
        if (el && el.closest) {
          row = el.closest(".pt-row") || el.closest("[data-key]") || el.parentElement;
        }
      }
      if (row && typeof row.remove === "function") row.remove();
    };
    removeSimControl("I0");
    removeSimControl("dt");
  }

  TARGET.appendChild(secS.wrap);

  renderKPIs(TARGET);
}


  // -------- Formel-Ansicht: Karten --------------------------------------
  function buildFormulaCard(key, def){
    const lang = STATE.meta.lang;
    const card = ce("div", "pt-form-card"); card.dataset.key = key;

    const title = ce("div", "pt-form-title");
    title.textContent = def.label?.[lang] || key;
    card.appendChild(title);
	
    // Info or Coach-Coin on cards (formula view)
   // Info-Icon auf Karten (formula view) – immer Tooltip, kein Coin
try {
  const info = ce("button", "kpi-info");
  info.type = "button";
  const tipKey =
    (key === "betaEff") ? "pt.Beff" :
    (key === "Reff")    ? "pt.Reff" :
    (key === "Reff0")   ? "pt.Reff0" : ("pt." + key);
  info.setAttribute("data-tooltip-i18n", tipKey);
  info.setAttribute("title", tooltipFallbackFor(key));
  info.textContent = "i";
  title.style.position = "relative";
  title.appendChild(info);
} catch(_e) {}



    const eqRow = ce("div", "pt-eq-row"); eqRow.dataset.key = key;
    const eq    = ce("div", "pt-eq");

    const sym = ce("span", "sym");
    sym.innerHTML = `\\(${symbolTexFor(key)}\\)`;
    const nums = ce("span", "nums");

    nums.innerHTML = `\\(${numbersTexFor(key)}\\)`;
    eq.appendChild(sym); eq.appendChild(nums);
    eqRow.appendChild(eq);
    card.appendChild(eqRow);

    const ctrl = ce("div", "pt-form-ctrl");
    const slider = ce("input"); slider.type="range"; slider.id = `pt-${key}`;
    slider.min = def.min ?? 0; slider.max = def.max ?? 1; slider.step = def.step ?? 0.01;
    slider.value = isNum(STATE.params[key]) ? STATE.params[key] : (def.min ?? 0);
    const unit = ce("span", "pt-form-unit");
    if (def.unit === "/d") unit.textContent = "/d";
    else if (def.unit === "days") unit.textContent = (lang === "de" ? "Tage" : "days");
    else unit.textContent = def.unit || "";

    ctrl.appendChild(slider); ctrl.appendChild(unit);
    card.appendChild(ctrl);

    // Events (wie Standard, ohne Direct Input)
    const endDrag = () => {
      if (__dragActive === key) {
        __dragActive = null;
        emitUpdate(`user:dragend:${key}`);
      }
    };
    slider.addEventListener("pointerdown", () => { __dragActive = key; STATE.meta.driverKey = key; });
    slider.addEventListener("pointerup", endDrag);
    slider.addEventListener("pointercancel", endDrag);
    slider.addEventListener("mouseleave", endDrag);
    slider.addEventListener("mouseup", endDrag);
    slider.addEventListener("touchend", endDrag);
    slider.addEventListener("input", () => updateValueFromSlider(key, def, slider.value));

    return card;
  }
  function buildFormulaCardRO(key, label){
    const lang = STATE.meta.lang;
    const card = ce("div", "pt-form-card"); card.dataset.key = key;

    const title = ce("div", "pt-form-title");
    title.textContent = (typeof label === "string") ? label : (label?.[lang] || key);
    card.appendChild(title);
    try {
      const info = ce("button", "kpi-info");
      info.type = "button";
      const tipKey = (key==="betaEff")? "pt.Beff" : (key==="Reff")? "pt.Reff" : (key==="Reff0")? "pt.Reff0" : ("pt."+key);
      info.setAttribute("data-tooltip-i18n", tipKey);
      info.setAttribute("title", tooltipFallbackFor(key));
      info.textContent = "i";
      title.style.position = "relative";
      title.appendChild(info);
    } catch(_e) {}


    const eqRow = ce("div", "pt-eq-row"); eqRow.dataset.key = key;
    const eq    = ce("div", "pt-eq");

    const sym = ce("span", "sym");
    sym.innerHTML  = `\\(${symbolTexFor(key)}\\)`;
    const nums = ce("span", "nums");
    nums.innerHTML = `\\(${numbersTexFor(key)}\\)`;

    eq.appendChild(sym); eq.appendChild(nums);
    eqRow.appendChild(eq); card.appendChild(eqRow);
    return card;
  }


  function renderFormulaView(){
    const keys = COUPLINGS[STATE.meta.model] || [];
    const secF = section("formula");
	  
	  // Coach-Coin direkt unter der Abschnittsüberschrift (vor dem Grid)
(function addFormulaHeaderCoin(){
  if (secF.wrap.querySelector('.coach-coin[data-scope="formula"]')) return;

  const headerEl = secF.wrap.querySelector('.pt-section-title');
  if (!headerEl) return;

  const coin = ce('button', 'coach-coin');
  coin.type = 'button';
  coin.setAttribute('data-scope', 'formula');
  coin.setAttribute('data-coach-coin', `pt.formula.${STATE.meta.model}`);
  coin.setAttribute('aria-label', `coach:formula:${STATE.meta.model}`);
  coin.textContent = '•';

  const note = ce('div', 'pt-section-note');
  note.style.display = 'flex';
  note.style.alignItems = 'center';
  note.style.gap = '0.5rem';
  // vertikaler Abstand (oben/unten)
  note.style.marginTop = '.5rem';
  note.style.marginBottom = '.5rem';

  // 🔧 links bündig zum Inhalt einrücken: gleiche Padding-Logik wie Body/Section
  const padL =
    parseFloat(getComputedStyle(secF.body).paddingLeft) ||
    parseFloat(getComputedStyle(secF.wrap).paddingLeft) || 20;
  note.style.marginLeft = padL + 'px';

  note.appendChild(coin);

  headerEl.parentNode.insertBefore(note, headerEl.nextSibling);
})();


    const grid = ce("div", "pt-form-grid"); // immer 1 Spalte (auch Desktop)
    const cat  = CATALOG[STATE.meta.model];

    keys.forEach(key=>{
      const def = cat?.params?.[key];
      if (!def) return;
      grid.appendChild(buildFormulaCard(key, def));
    });
    // Add read-only effective formula cards
    grid.appendChild(buildFormulaCardRO('betaEff', {de:'β_eff (effektive Infektionsrate)', en:'β_eff (effective infection rate)'}));
    grid.appendChild(buildFormulaCardRO('Reff',    {de:'R_eff (effektiver R-Wert)',       en:'R_eff (effective R)'}));
    grid.appendChild(buildFormulaCardRO('Reff0',   {de:'R_eff(0) (Startwert)',            en:'R_eff(0) (at t=0)'}));
    secF.body.appendChild(grid);
    TARGET.appendChild(secF.wrap);

    // Symbol & Zahlen typesetten, dann fitten
    typesetPartsAndFit(secF.body);

    // KPIs auch in der Formel-Ansicht

    // Resize: neu fitten
    window.addEventListener("resize", ()=>{
      qsa(".pt-eq", TARGET).forEach(fitEqToRow);
    }, { passive:true });
  }

  function render(){
    TARGET.innerHTML = "";
    buildToolbar(TARGET);
    if (STATE.meta.view === "formula") renderFormulaView();
    else renderControlsView();
  }


// -------- updates from UI ---------------------------------------------
function updateValueFromSlider(key, def, raw){
  STATE.meta.driverKey = key;
  if (!__dragActive) __dragActive = key;

  // vorheriger Wert für Events
  const old = STATE.params[key];

  // Eingabewert normalisieren
  let v = Number(raw);
  if (key === "measures") v = v > 1 ? v/100 : v;    // 0..100 → 0..1
  STATE.params[key] = clamp(v, def.min ?? 0, def.max ?? 1);

  if (!__rafPending) {
    __rafPending = true;
    requestAnimationFrame(() => {
      __rafPending = false;
      __isApplying = true;

      applyConstraints(key);
      recalcDerived();
      syncAllControls();
      updateKPIValues();

      if (STATE.meta.view === "formula") {
        // Zahlen in den Formeln aktualisieren
        updateNumbersAndFitAll();

        // 🎯 PULSE-ROUTING: gezielt pro Regler nur die gewünschte Stelle pulsen
        switch (key) {
          case "D":
            // D schieben → in der D-Zeile den Nenner γ betonen:  D = 1 / γ
            pulseNumPartInRow("gamma", "D", TARGET);
            break;

          case "gamma":
            // γ schieben → ebenfalls in der D-Zeile den Nenner γ betonen (didaktisch konsistent)
            pulseNumPartInRow("gamma", "D", TARGET);
            break;

          case "R0":
            // R0 schieben → in der γ-Zeile den Nenner R0 betonen:  γ = β / R0
            pulseNumPartInRow("R0", "gamma", TARGET);
            break;

          case "beta":
            // β schieben → ebenfalls in der γ-Zeile den Nenner R0 betonen (so wie besprochen)
            pulseNumPartInRow("R0", "gamma", TARGET);
            break;

          case "L":
            // L schieben → in der L-Zeile den Nenner σ betonen:  L = 1 / σ
            pulseNumPartInRow("sigma", "L", TARGET);
            break;

          case "sigma":
            // σ schieben → in der L-Zeile den Nenner σ betonen
            pulseNumPartInRow("sigma", "L", TARGET);
            break;

          case "measures":
            // Maßnahmen → den measures-Term überall markieren (z. B. in Reff0/βeff, falls vorhanden)
            pulseNumPart("measures", TARGET);
            break;

          // alle anderen (N, I0, T, dt, …) lösen keinen Puls in den Gleichungen aus
        }
      }

      __isApplying = false;
      emitChange(key, old, STATE.params[key]);
    });
  }
}



  function updateValueFromDirect(key, def, raw){
    STATE.meta.driverKey = key;

    const parsed = parseLocaleNumber(raw, STATE.meta.lang);
    if (!isNum(parsed)) return;
    const old = STATE.params[key];
    let v = parsed; if (key === "measures") v = v/100;
    STATE.params[key] = clamp(v, def.min ?? 0, def.max ?? 1);

    __isApplying = true;
    applyConstraints(key);
    recalcDerived();
    syncAllControls();
    updateKPIValues();

    if (STATE.meta.view === "formula") { updateNumbersAndFitAll(); pulseNumPart(key, TARGET); try { document.dispatchEvent(new CustomEvent("pt:pulse",{ detail:{ key, cause:"user:direct", state:getState() }, bubbles:true })); } catch(_e) {} }

    __isApplying = false;

    emitChange(key, old, STATE.params[key]);
    emitUpdate(`user:change:${key}`);
  }

  // -------- meta/config/init --------------------------------------------
  function readMeta(){
    const html = document.documentElement;
    STATE.meta.lang  = (html.getAttribute("lang") || "de").toLowerCase();
    STATE.meta.mode  = (html.getAttribute("data-mode") || "school").toLowerCase();
    STATE.meta.model = (html.getAttribute("data-model") || "SIR").toUpperCase();
    STATE.meta.minilabId = html.getAttribute("data-minilab-id");
  }
  function readConfig(){
    try {
      const cfgEl = qs("#parameter-tool-config");
      CONFIG = cfgEl ? JSON.parse(cfgEl.textContent) : null;
    } catch(e){ CONFIG = null; }
  }
  function initDefaultsForModel(){
    const p = STATE.params;
    if (isNum(p.D) && p.D>0) p.gamma = 1/p.D;
    if (isNum(p.beta) && isNum(p.gamma) && p.gamma>0) p.R0 = p.beta/p.gamma;
    recalcDerived();
  }

  // --- Accordion-Enhancer (bestehend) -----------------------------------
  function enhanceAccordion(root){
    const host = root || TARGET;
    if (!host) return;

    host.querySelectorAll(".pt-section").forEach((sec, idx) => {
      if (sec.dataset.enhanced === "true") return;

      const titleEl = sec.querySelector(".pt-section-title");
      const bodyEl  = sec.querySelector(".pt-section-body");
      if (!titleEl || !bodyEl) return;

      const btn = ce("button", "pt-section-head");
      btn.type = "button";
      btn.setAttribute("aria-expanded", idx === 0 ? "true" : "false");

      const caret = ce("span", "pt-section-caret"); caret.setAttribute("aria-hidden", "true");
      const label = ce("span", "pt-section-head-label");
      label.textContent = titleEl.textContent;

      btn.appendChild(label);
      btn.appendChild(caret);
      sec.replaceChild(btn, titleEl);

      if (idx === 0) { sec.classList.add("is-open"); bodyEl.hidden = false; }
      else { sec.classList.remove("is-open"); bodyEl.hidden = true; }

     btn.addEventListener("click", () => {
  const open = btn.getAttribute("aria-expanded") === "true";
  if (open) return; // Single-Open: das bereits offene Panel bleibt offen

  // Alle anderen Panels schließen
  host.querySelectorAll(".pt-section.is-open").forEach(s => {
    if (s !== sec) {
      s.classList.remove("is-open");
      const sb = s.querySelector(".pt-section-body");
      if (sb) sb.hidden = true;
      const sh = s.querySelector(".pt-section-head");
      if (sh) sh.setAttribute("aria-expanded", "false");
    }
  });

  // Dieses Panel öffnen
  btn.setAttribute("aria-expanded", "true");
  sec.classList.add("is-open");
  bodyEl.hidden = false;
});


      sec.dataset.enhanced = "true";
    });
  }

  let __ptObserver = null;
  function ensureObserver(){
    if (__ptObserver || !TARGET) return;
    __ptObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length) {
          enhanceAccordion(TARGET);
          break;
        }
      }
    });
    __ptObserver.observe(TARGET, { childList: true, subtree: true });
  }

  function mount(opts = {}){
  TARGET = opts.target ? qs(opts.target) : qs("#parameter-tool");
  if (!TARGET) { console.warn("[Parameter-Tool] No target container found."); return; }
  TARGET.classList.add("pt");

  readMeta(); readConfig(); fmt.setLocale(STATE.meta.lang); initDefaultsForModel();

  // 👉 KPI-Liste modell- & modusabhängig setzen (aus KPI_SETS)
  STATE.meta.kpis = resolveKPIs(STATE.meta.model, STATE.meta.mode, DEFAULTS?.kpis);

  const viewFlag = (TARGET.dataset?.ptView || "").toLowerCase();
  const formulaFlag = (TARGET.dataset?.ptFormula || "").toLowerCase();
  if (viewFlag === "formula" || formulaFlag === "true" || formulaFlag === "1") {
    STATE.meta.view = "formula";
  }

  render(); syncAllControls();
  enhanceAccordion(TARGET);
  ensureObserver();

  console.log(`[Parameter-Tool] v${VERSION} mounted · lang=${STATE.meta.lang} · mode=${STATE.meta.mode} · model=${STATE.meta.model} · view=${STATE.meta.view}`);
  emitReady();
}


  // -------- public API ---------------------------------------------------
  function getState(){ return JSON.parse(JSON.stringify(STATE)); }
  function set(partial){
    if (__isApplying) return;
    if (!partial) return;

    if (typeof partial === "string") {
      STATE.meta.model = partial.toUpperCase();
      initDefaultsForModel();
      render(); syncAllControls();
      emitUpdate("model-switch");
      return;
    }

    Object.assign(STATE.params, partial.params || {});
    Object.assign(STATE.meta, partial.meta || {});
    __isApplying = true;
    applyConstraints("programmatic");
    recalcDerived();
    render(); syncAllControls();
    __isApplying = false;
    emitUpdate("programmatic");
  }
  function on(name, handler){ document.addEventListener(name, handler); }

  // expose
  window.ParameterTool = { version: VERSION, mount, getState, set, on };
})();


;/* PT School-only view lock v2.3.1 */
(function() {
  try {
    var root = document.getElementById('parameter-tool');
    if (!root) return;
    var mode = (root.dataset && root.dataset.mode) || root.getAttribute('data-mode');
    if (mode !== 'school') return;

    // Toolbar ausblenden (zusätzlich zum CSS)
    var tb = root.querySelector('.pt-toolbar');
    if (tb) tb.style.display = 'none';

    // Formel-Ansicht verlässlich ausblenden (zusätzlich zum CSS)
    function hideFormula() {
      var nodes = root.querySelectorAll('[data-view="formula"], .pt-view--formula, .pt-form-grid');
      for (var i = 0; i < nodes.length; i++) {
        nodes[i].style.display = 'none';
      }
      // Sicherstellen, dass wir nicht im Formel-State hängen
      if (root.dataset && root.dataset.view === 'formula') {
        root.dataset.view = 'controls';
      }
    }
    hideFormula();

    // MutationObserver: falls intern View umgeschaltet wird, wieder zurücksetzen
    var mo = new MutationObserver(function(mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'attributes' && m.attributeName === 'data-view') {
          if (root.dataset.view === 'formula') root.dataset.view = 'controls';
        }
      }
      hideFormula();
    });
    try { mo.observe(root, { attributes: true, attributeFilter: ['data-view'] }); } catch (e) {}

    // Blockiere etwaige Button-Klicks, die zur Formel-Ansicht führen könnten
    root.addEventListener('click', function(evt) {
      var btn = evt.target.closest ? evt.target.closest('.pt-ctrl, [data-action]') : null;
      if (!btn) return;
      var txt = (btn.getAttribute('data-action') || btn.textContent || '').toLowerCase();
      if (txt.indexOf('formel') > -1 || txt.indexOf('formula') > -1) {
        evt.preventDefault();
        evt.stopImmediatePropagation();
        return false;
      }
    }, true);
  } catch (err) {
    console.warn('[PT] School lock failed:', err);
  }
})();
