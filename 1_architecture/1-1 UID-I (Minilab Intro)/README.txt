Die Architektur von UID-Intro

UID-Intro bildet den definierten Einstieg in jedes Minilab. Die Architektur ist bewusst schlank gehalten. Sie besteht im Kern aus einem Boot-Modul (intro-boot.js) und einem Runner für das jeweilige Modell (intro-sir.js, intro-seir.js, intro-sis.js, intro-sird.js, intro-sirv.js).

Das Boot-Modul übernimmt die Initialisierung und Orchestrierung. Es bindet die vorbereiteten DOM-Elemente (Canvas, KPI-Decks, Coach-Overlay) ein, startet den jeweiligen Modell-Runner, injiziert die berechneten KPIs und sorgt dafür, dass Coach-Video und Simulation gemeinsam im Ablauf erlebt werden können.

Der jeweilige Runner enthält die zeitliche Abfolge einer nicht veränderbaren Simulation. Er definiert eine dramaturgische Sequenz mit festgelegten Parametern, Integrationsschritten und Sichtbarkeitsregeln, die auf didaktische Etappen abgestimmt ist.

Die Simulation selbst läuft deterministisch mit einem festen Integrator (derzeit Euler). Während die Sequenz abläuft, dispatchen die Runner kontinuierlich Daten an Visuals und KPI-Decks, die diese unmittelbar darstellen.

Nutzerinteraktion wie Pausieren, Parameteränderungen oder manuelles Scrubbing ist im Intro nicht vorgesehen. UID-Intro ist damit ein klar abgegrenzter Bestandteil der Gesamtarchitektur: Das Boot-Modul sorgt für Einbettung und Steuerung, die Runner für die vorgeplante Abfolge der Simulationen.