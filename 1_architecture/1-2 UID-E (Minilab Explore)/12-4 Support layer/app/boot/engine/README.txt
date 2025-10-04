Engine

Die Engine startet den Rechenkern von UID-Explore. Hier wird die Anwendung mit einem Modell initialisiert, Standardwerte werden gesetzt und der Event-Bus gefüllt, falls er noch leer ist. Gleichzeitig wird eine einfache Zeitreihe erzeugt, damit sofort Daten vorliegen. Auch optische Details wie die HIT-Akzentfarbe werden vorbereitet, und ein kurzer Nudge stößt erste Berechnungen an.

Diese Schicht ist auf das reine Starten beschränkt. Sie verdrahtet keine Wiedergabe, keine Charts und keine Darstellung. Playback und Timeline liegen in Infra, die Visualisierung und die Widgets werden erst später im Mount-Prozess geladen. Eine Sicherung stellt sicher, dass die Initialisierung nur einmal ausgeführt wird und keine Doppelstarts entstehen.

Alle Importe nutzen Aliase wie @uid/base und relative Pfade. Root-absolute Pfade kommen nicht vor. Der Engine-Ordner enthält keine Modell- und keine Präsentationslogik. Seine Aufgabe ist es, die Anwendung verlässlich in Gang zu setzen und den Rechenkern zu versorgen, ohne in andere Schichten einzugreifen.

Kurze Begriffe zur Orientierung
Event-Bus ist das interne Nachrichtensystem, über das alle Module miteinander kommunizieren.
Seed bezeichnet die erste kleine Datengrundlage, mit der ein Modul startet.
HIT-Akzentfarbe ist die farbliche Hervorhebung für die Schwelle der Herdenimmunität.