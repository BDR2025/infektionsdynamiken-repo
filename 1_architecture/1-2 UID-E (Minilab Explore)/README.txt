Die Architektur von UID-Explore

UID-Explore ist das Herzstück des Projektes und deutlich komplexer aufgebaut als UID-Intro. Während Intro eine festgelegte Abfolge zeigt, eröffnet Explore den Lernenden die Möglichkeit, Modelle aktiv zu verändern und eigene Szenarien zu erkunden.

Die Architektur gliedert sich in zwei Schichten:

  1. In der Basisschicht arbeiten Director, Engine und der Event-Bus zusammen. Sie stellen sicher, dass Eingaben konsistent werden, die numerischen Berechnungen zuverlässig ablaufen und alle Module stabil miteinander kommunizieren. 
  2. Darauf aufbauend liegen die Darstellungsmodule, die die Ergebnisse für die Lernenden erfahrbar machen. Dazu gehören Visuals mit ihren Kurven und Diagrammen, die KPIs mit verdichteten Kennzahlen, die Vectors mit intuitiven Overlays, die Formeln mit der mathematischen Darstellung und ergänzend das Grid, das die Anteile der Bevölkerung in einer Rasterdarstellung sichtbar macht.

Durch diese klare Trennung bleibt das System für Lernende leicht zugänglich und für Entwickler übersichtlich. Wer mit Explore arbeitet, erlebt eine einfache und anschauliche Umgebung, während auf der technischen Ebene eine modulare Architektur bereitsteht, die jederzeit erweitert und gepflegt werden kann. Alle Bestandteile von UID-Explore sind in diesem Repository öffentlich zugänglich und frei verfügbar.
