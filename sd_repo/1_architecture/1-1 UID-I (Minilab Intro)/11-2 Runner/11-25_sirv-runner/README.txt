Der SIRV Runner im Detail

Der SIRV Runner zeigt eine geführte Intro-Sequenz mit den Kurven S, I, R und V. Die Inszenierung verläuft in Etappen: zunächst I + S, danach R, dann V, und abschließend ein Gesamtdurchlauf mit allen vier Kurven. Dauer und Sichtbarkeit der Schritte sind coach-abhängig hinterlegt; die Dramaturgie entspricht dem Schema der bisherigen Intros.

Die Simulation läuft deterministisch mit fester Euler-Integration auf einer normierten Skala. Aus den vorgegebenen Parametern werden Zeitreihen für S, I, R, V berechnet und direkt in ein Canvas gezeichnet. Der Renderer ist DPI-sensitiv, nutzt die bestehenden Farb-Tokens für die Fächer und zeichnet ein dezentes Prozent-Raster; externe Bibliotheken kommen nicht zum Einsatz.

Während der Sequenz gibt der Runner pro Frame Kennzahlen an die Oberfläche aus. Dazu zählen die relativen Anteile S, I, R, V (in Prozent) sowie t (Zeit). Zusätzlich werden R₀, der effektive Reproduktionswert und Impfindikatoren bereitgestellt: aktuelle Impfdeckung, Herdschwelle und die Differenz beider Werte. Die KPI-Payload wird als Window-Event ausgespielt und kann von Boot oder einer Seite direkt konsumiert werden.

Die Impflogik ist in zwei Modi hinterlegt: Im School-Kontext arbeitet der Runner mit einem perfekten Impfstoff (Geimpfte tragen nicht mehr zur Suszeptibilität bei). Im University-Kontext nutzt er einen „leaky“ Ansatz (reduzierte Rest-Suszeptibilität Geimpfter) und setzt sichtbarere Start-/Rollout-Parameter für V. Der Impffluss wirkt fortlaufend; die Sequenzschritte sind didaktische Ansichten, keine Umschalter der Dynamik.

Am Ende jeder Etappe steuert ein Player den Übergang zur nächsten, wahlweise mit „Wipe“, und beendet die Intro-Abfolge nach dem Gesamtdurchlauf. Darstellung und KPI-Ausgabe bleiben über den gesamten Ablauf konsistent und reproduzierbar.