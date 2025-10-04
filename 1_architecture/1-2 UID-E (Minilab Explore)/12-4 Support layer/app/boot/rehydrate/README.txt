Rehydrate

Rehydrate sorgt dafür, dass Widgets nach Daten- oder Sichtbarkeitsänderungen automatisch wieder korrekt angezeigt werden. Die Funktion initRehydrate wird aus den Mount-Modulen aufgerufen und arbeitet unauffällig im Hintergrund, ohne in Berechnungen oder Modelle einzugreifen.

Sobald ein Widget montiert wird, neue Simulationsdaten eintreffen oder das Element sichtbar wird, sendet Rehydrate die aktuelle Zeit erneut an die Timeline. Optional ruft es eine Refresh-Funktion auf und löst anschließend ein Fenster-Resize aus, damit sich Layout und Diagramme anpassen. So bleiben alle Anzeigen synchron, auch wenn Daten nachgeladen oder Panels ein- und ausgeblendet werden.

Die Logik ist idempotent und bringt einen sauberen Rückgabewert mit, der die Beobachter trennt und wieder abmeldet. Sie arbeitet nur mit relativen Pfaden und den Aliassen mit @uid, Root-absolute Pfade werden vermieden. Eine eigene Import-Map wird hier nicht definiert.

Kurze Begriffe zur Orientierung
Refresh bezeichnet einen kleinen Neuaufbau des Layouts oder Diagramms nach Änderungen.
Replay steht für das erneute Abspielen von Ereignissen, damit auch später montierte Elemente den aktuellen Zustand erhalten.
Idempotent bedeutet, dass der wiederholte Aufruf keine doppelten Aktionen auslöst.