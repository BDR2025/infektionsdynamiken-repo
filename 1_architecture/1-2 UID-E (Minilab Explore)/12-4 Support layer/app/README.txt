App

Der App-Bereich bündelt das lauffähige Paket des Support Layers. Hier endet der Alias @uid/app und von hier startet das ESM-Boot über boot boot.js und die Bridge. Neben dem Start liegen hier begleitende Ressourcen wie Styles Sprachdateien kleine Hilfsskripte und Widget Begleitcode. Alles ist so gekapselt, dass es unabhängig vom Rechenkern bleibt und ohne Eingriffe in die Modelllogik funktioniert.

Die innere Struktur ist bewusst schlank. Der Ordner boot orchestriert den Start. css hält grundlegende Darstellungsregeln. i18n führt die Texte. js enthält kleine Utilities. widgets stellt wiederverwendbare UI Bausteine bereit. Alle Importe arbeiten mit relativen Pfaden oder mit Aliassen. Root absolute Pfade vermeiden wir konsequent.

Abgrenzung ist wichtig. App enthält keine Implementierungen der Modelle und keine Präsentationslogik. Der Bereich stellt Infrastruktur bereit, damit die eigentlichen Komponenten stabil montieren internationalisiert bedienbar und wartbar bleiben.

Kurze Begriffe zur Orientierung
Alias meint einen Import Map Namen wie @uid/app der auf diesen Ordner zeigt.
Boot bezeichnet den Start der Anwendung über ein einziges ESM Modul.
Bridge ist das Composition Root das die Startschritte in fester Reihenfolge ausführt.