Tooltips

Die Tooltip-Schicht stellt die kurzen Hilfetexte und Hinweise der Oberfläche bereit. Sie ergänzt den Support Layer um eine leichte Interaktionsebene, die ohne Eingriff in Modelle oder Darstellung auskommt. Die Tooltips helfen, Bedienelemente zu erklären und bieten kontextabhängige Unterstützung, ohne den Ablauf der Anwendung zu beeinflussen.

index.js sorgt für das Laden der Styles und für den unsichtbaren Layer, in dem die Tooltip-Elemente platziert werden. tooltip.js zeigt die Texte am Mauszeiger an und blendet sie automatisch aus, sobald der Zeiger den Bereich verlässt oder der Header betroffen ist. tips.js bindet zusätzliche Hinweise an Header-Schalter und Karten, die mit Tastaturfokus erreichbar sind. boot.js ruft die Sicherung der Styles und des Layers auf und startet den Cursor-Tooltip beim Systemstart.

Die Texte stammen aus den Attributen data-wa-tip oder data-tooltip und greifen bei Bedarf auf aria-label oder den sichtbaren Titel zurück. Escape blendet aktive Hinweise aus. Der Layer verwendet pointer-events none, damit er die Oberfläche nicht blockiert. Alle Tooltip-Module sind idempotent, entfernen ihre Listener beim Aufräumen und arbeiten mit Guards, um Fehler zu vermeiden, falls der DOM noch nicht vollständig geladen ist.

Kurze Begriffe zur Orientierung
Layer ist die unsichtbare Ebene, auf der Tooltips angezeigt werden, ohne andere Elemente zu überdecken.
Guard ist eine einfache Schutzabfrage, die Fehler abfängt, wenn eine Voraussetzung noch nicht erfüllt ist.
Idempotent bedeutet, dass wiederholte Aufrufe keinen doppelten Effekt haben.