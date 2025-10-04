Boot

Im Boot-Bereich startet UID-Explore. Hier liegt das ESM-Boot-Modul des Support Layers. Der Einstieg erfolgt über boot.js, das als einziges Modul in der Seite eingebunden ist und die Bridge lädt. Die Bridge bildet das Composition Root und führt den Start in klarer Reihenfolge aus: Tooltips, Infra mit Sim-Bridge und Pointer-Bridge, Engine und Mount. Damit bleiben Infrastruktur, Initialisierung und das Montieren der Widgets voneinander getrennt und nachvollziehbar.

Die Unterordner erfüllen feste Aufgaben. Tooltips richtet die Hilfslayer und den Cursor-Tooltip ein. Infra verdrahtet die Wiedergabe und normalisiert Zeiger-Ereignisse. Engine startet die Explore-Engine und setzt Startwerte. Mount montiert Chart, Live-KPIs, Key-KPIs, GridWave, Parameter, State-Visuals und die Kern-Gleichung. Rehydrate sorgt dafür, dass sich Widgets bei Daten- oder Sichtbarkeitsänderungen korrekt aktualisieren. Shims im App-Bereich überbrücken technische Sonderfälle, etwa Pfade mit Leerzeichen.

Alle Importe arbeiten mit relativen Pfaden oder den Aliassen aus der Import-Map. Root-absolute Pfade werden nicht verwendet. Die Boot-Module sind idempotent und geben in der Konsole eindeutige Statusmeldungen wie boot sequence ok, pointer-bridge ready oder mount-widgets ready aus. Die Fachlogik und die Darstellung liegen in anderen Schichten. Boot selbst startet, koordiniert und sorgt dafür, dass alle Teile in der richtigen Reihenfolge ineinandergreifen.

Kurze Begriffe zur Orientierung
Composition Root bezeichnet den zentralen Einstiegspunkt, der den Ablauf steuert.
Idempotent bedeutet, dass ein Aufruf keine doppelten oder ungewollten Nebeneffekte auslöst.
Alias steht für einen Import-Namen wie @uid/app, der auf einen bestimmten Pfad verweist.