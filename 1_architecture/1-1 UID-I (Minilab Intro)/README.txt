Die Architektur von UID-Intro

UID-Intro bildet den definierten Einstieg in jedes Minilab. Die Architektur ist bewusst minimal gehalten. Sie besteht ausschließlich aus einem Boot-Modul (intro-boot.js) und einem Wrapper für das jeweilige Modell (intro-sir.js, intro-seir.js, intro-sis.js, intro-sird.js, intro-sirv.js).

Das Boot-Modul übernimmt die Initialisierung. Es richtet die Visualisierungen, das KPI-Deck und die Formeldarstellung ein, bindet das Coach-Video an und stellt sicher, dass Video und Simulation synchron ablaufen.
Der jeweilige Wrapper enthält die zeitliche Abfolge einer nicht veränderbaren Simulation. Er definiert eine dramaturgische Sequenz mit festgelegten Parametern und Berechnungsschritten, die sekundengenau an den Kommentar des Coach-Videos angepasst ist.

Die Simulation selbst läuft deterministisch mit einem festen Integrator (derzeit Euler). Während die Sequenz durchläuft, liefern die Wrapper kontinuierlich Daten an Visuals und KPIs, die diese unmittelbar darstellen. Nutzerinteraktion wie Pausieren, Parameteranpassung oder manuelles Scrubbing ist im Intro nicht vorgesehen.
Damit ist UID-Intro ein klar abgegrenzter Bestandteil der Gesamtarchitektur. Boot sorgt für Orchestrierung und Einbettung, die Wrapper für die vordefinierte Abfolge der Simulationen.
