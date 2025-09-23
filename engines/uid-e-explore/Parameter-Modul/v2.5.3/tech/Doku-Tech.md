# Technische Dokumentation · Parameter-Tool (v2.3)

## 1. Zweck / Zusammenfassung
Das Parameter-Tool ist ein **Standalone-Modul** zur **algebraischen Kopplung** zentraler Modellparameter (SIR/SEIR/…).

- Zwei Ansichten:
  - **Regler-Ansicht (Controls)** – Accordion, Slider + (optional) Direkteingabe
  - **Formel-Ansicht (Formula)** – Ein-Zeilen-Formeln (Symbol + live eingesetzte Zahlen), Slider darunter, Pulse-Highlight
- **KPI-Panel**: R₀, Rₑff(0), HIT, T₂, N
- **Isoliert** (eigenes CSS/JS), **kopplungsfähig** (Events)

---

## 2. Dateien & Struktur (Empfehlung)

```
/repo/parameter-tool/v2.3.0/
  index.html
  /css/parameter-tool.css
  /js/parameter-tool.js
  Doku-Tech.md
  Doku-Scrum.pdf
```

> Für „latest“ entweder Kopie oder HTML-Redirect auf die aktuelle Version.

---

## 3. Einbindung (Minimalbeispiel)

```html
<!doctype html>
<html lang="de" data-mode="university" data-model="SIR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <!-- MathJax -->
  <script>
    window.MathJax = {
      tex: { inlineMath: [['\\(','\\)'],['$','$']], packages:{'[+]':['html']} },
      loader: { load: ['[tex]/html'] },
      options: { renderActions: { addMenu: [] } }
    };
  </script>
  <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script>

  <link rel="stylesheet" href="css/parameter-tool.css">
</head>
<body>
  <div id="parameter-tool" class="pt" data-pt-formula="true"></div>

  <script defer src="js/parameter-tool.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
      window.ParameterTool?.mount({ target: '#parameter-tool' });
    });
  </script>
</body>
</html>
```

---

## 4. Konfiguration

### Meta am `<html>`
- `lang="de|en"`
- `data-mode="school|university"`
- `data-model="SIR|SEIR|SIS|SIRD|SIRV"`

### Mount-Container
- `data-pt-formula="true|false"`
- `data-pt-view="formula|controls"`

### Optionale JSON-Overrides
```html
<script id="parameter-tool-config" type="application/json">
{
  "kpis": ["R0","Reff0","HIT","T2","N"]
}
</script>
```

---

## 5. Public API

```js
// Mount
ParameterTool.mount({ target: '#parameter-tool' });

// State lesen
const state = ParameterTool.getState();  // { meta, params, derived }

// State setzen
ParameterTool.set({ 
  meta:   { model: 'SIR' }, 
  params: { D: 12, beta: 0.28 }
});

// Modellwechsel
ParameterTool.set('SEIR');

// Event abonnieren
ParameterTool.on('idv:params:update', (e) => console.log(e.detail));
```

---

## 6. Events (Adapter-Schnittstelle)

### Outbound
- `idv:params:ready`
- `idv:param:change`
- `idv:params:update`

### Inbound
- `ParameterTool.set(...)`

> Externe Module (Chart-Tool, Vector-Tool) hören auf `idv:params:update`.

---

## 7. Anzeige-Logik

- **Controls**: Accordion → Learning | Model | Simulation
- **Formula**: Karten für D, γ, β, R₀ → Ein-Zeilen-Formeln + Slider darunter
- **KPIs**: R₀, Rₑff(0), HIT, T₂, N

---

## 8. Styling-Isolation

- Container `.pt` kapselt Styles
- KPI-Grid mit `auto-fit, minmax`
- `min-width:0` gesetzt gegen min-content-Falle

---

## 9. Modelle & Kopplungen

- **SIR**: γ = 1/D, R₀ = β/γ
- **SEIR**: σ = 1/L, R₀ = β/γ
- **SIS, SIRD, SIRV**: zusätzliche Parameter (μ, v) analog

---

## 10. Troubleshooting

- **MIME-Fehler** → Pfade prüfen (`./css/...`, `./js/...`)
- **Rote Formeln** → MathJax html-Paket laden
- **Umbruch/Flackern** → Snap-Scaling sicherstellen
- **Keine Pulse** → v2.3 CSS nutzen (`.pt-num.pulsed` vorhanden)

---

## 11. Versionierung / Hosting

- Fix: `/repo/parameter-tool/vX.Y.Z/`
- Beweglich: `/repo/parameter-tool/latest/`
- Git-Tag + Release je Version (optional Zenodo DOI)

---

## 12. Kontakt / Lizenz

- **Boris Dominic Rausch · Prof. Dr. Andreas Heinz**  
- **E-Mail:** info@infektionsdynamiken.de · info@infectiondynamics.eu  
- **Lizenz:** CC BY 4.0
