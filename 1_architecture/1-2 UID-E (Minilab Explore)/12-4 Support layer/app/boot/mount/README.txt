Mount

Die Mount-Schicht bringt die Widgets in die Anwendung. Der Einstieg liegt in index.js, das die einzelnen Mount-Module nacheinander aufruft. Jedes Widget besitzt seine eigene Datei und bleibt dadurch übersichtlich und leicht zu warten. Die Orchestrierung sorgt dafür, dass sich die Module gegenseitig nicht beeinflussen und sauber in der richtigen Reihenfolge laden.

Jedes Modul erfüllt eine klar umrissene Aufgabe. Chart bindet die Werkzeuge im Header an und zeigt die Simulation. Die Live-KPIs und Key-KPIs nutzen eigene Actions und halten die One-Header-Policy ein. GridWave lädt seine Aktionen bei Bedarf nach. Die klassischen Parameter und die Formeln stellen das Bedienpanel bereit, warten gegebenenfalls auf MathJax und aktualisieren sich automatisch. Die State Visuals binden sich an das Modell an und wählen selbständig eine passende Adaptervariante. Die Kern-Gleichung wird über Shims eingebunden und übernimmt den bereits gerenderten DOM in den Host.

Alle Mounts verwenden AutoRehydrate und rufen initRehydrate auf. Optional registrieren sie eine Refresh-Funktion, die bei Größenänderungen das Layout neu anpasst. Jeder Mount arbeitet idempotent und gibt in der Konsole klare Statusmeldungen aus – zum Beispiel Chart ready, KPI ready oder LEQ ready. Bei Problemen erscheinen eindeutige Hinweise wie skipped oder failed mit kurzer Ursache.

Die Mount-Schicht führt keine eigenen Berechnungen aus und steuert keine Modelle. Sie benutzt ausschließlich relative Pfade und die Aliase mit @uid. Root-absolute Pfade werden vermieden. Damit bleibt die Darstellung schlank, nachvollziehbar und unabhängig von der Logik des Rechenkerns.

Kurze Begriffe zur Orientierung
One-Header-Policy bedeutet, dass jedes Widget nur eine Kopfzeile besitzt, auch wenn mehrere Komponenten sie erweitern.
AutoRehydrate sorgt dafür, dass ein Widget nach Daten- oder Sichtbarkeitsänderungen automatisch aktualisiert wird.
Shim bezeichnet eine kleine Zwischendatei, die spezielle Importpfade abfängt, ohne den Quellcode zu verändern.