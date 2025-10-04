Infra

Infra stellt die Wiedergabe und die Zeigerlogik bereit. Die Module hören auf Befehle wie Start, Pause, Reset und Geschwindigkeit, fassen Timeline und Simulation zusammen und erzeugen daraus ein einheitliches Pointer Signal. Gleichzeitig melden sie den aktuellen Zustand der Wiedergabe zurück, damit andere Schichten ihn nutzen können. Die Boot Dateien rufen die Brücken genau einmal auf, arbeiten idempotent und vermeiden Nebenwirkungen.

Diese Schicht berührt weder Darstellung noch Rechenkern. Es gibt keinen direkten Zugriff auf Charts und keinen Eingriff in Modelle. Infra konzentriert sich auf das Verdrahten von Ereignissen, das Normalisieren der Eingaben und das Verteilen klarer Statusmeldungen. So bleibt die Trennung der Verantwortlichkeiten erhalten und die übrigen Teile können sich auf ihre Aufgaben konzentrieren.

Alle Importe verwenden Aliase wie at uid und relative Pfade. Root absolute Pfade kommen nicht vor und eine Import Map wird hier nicht definiert. Infra liefert nur den Takt für die Wiedergabe und das konsistente Pointer Signal und überlässt Berechnung und Rendering den dafür vorgesehenen Schichten.

Kurze Begriffe zur Orientierung
Pointer ist die gemeinsame Zeitmarke, an der sich alle Widgets ausrichten.
Wiedergabe meint das zeitliche Abspielen der Simulation.
Idempotent bedeutet, dass ein erneuter Aufruf keinen doppelten Effekt hat.