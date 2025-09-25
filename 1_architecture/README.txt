Die Architektur von UID-Explore

UID-Explore ist das Herzstück des Projektes und deutlich komplexer aufgebaut als UID-Intro. Während Intro eine festgelegte Abfolge zeigt, eröffnet Explore den Lernenden die Möglichkeit, Modelle aktiv zu verändern und eigene Szenarien zu erkunden.

Die Architektur gliedert sich in drei Schichten:

Input-Schicht
Hier liegt das Parameter-Modul, das die Eingaben der Lernenden entgegennimmt. Über Regler, Eingabefelder und Buttons werden Werte verändert, die anschließend über den Event-Bus weitergeleitet werden.

Basisschicht
In dieser Ebene arbeiten Director, Engine und der Event-Bus zusammen. Sie stellen sicher, dass Eingaben konsistent werden, die numerischen Berechnungen zuverlässig ablaufen und alle weiteren Module stabil miteinander kommunizieren.

Darstellungsschicht
Darauf aufbauend befinden sich die Visualisierungen. Dazu gehören die Charts mit ihren Kurven und Diagrammen, die KPIs mit verdichteten Kennzahlen, die Vectors mit intuitiven Overlays, die Formeln mit der mathematischen Darstellung und ergänzend das Grid, das die Anteile der Bevölkerung in einer Rasterdarstellung sichtbar macht.

Durch diese klare Dreiteilung bleibt das System für Lernende leicht zugänglich und für Entwickler übersichtlich. Wer mit Explore arbeitet, erlebt eine einfache und anschauliche Umgebung, während auf der technischen Ebene eine modulare Architektur bereitsteht, die jederzeit erweitert und gepflegt werden kann. Alle Bestandteile von UID-Explore sind in diesem Repository öffentlich zugänglich und frei verfügbar.
