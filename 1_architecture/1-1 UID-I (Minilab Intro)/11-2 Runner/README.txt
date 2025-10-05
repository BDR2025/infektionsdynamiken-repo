Der Runner von UID-Intro

Der Runner ist das Herzstück von UID-Intro. Er enthält die eigentliche Simulation und die dramaturgische Abfolge, die das Intro prägt. Während das Boot-Modul für die Einbettung und Steuerung sorgt, übernimmt der Runner die Ausführung. Er berechnet die Modellverläufe, zeichnet sie auf das Canvas und steuert die didaktischen Etappen, die den Lernenden Schritt für Schritt durch die Dynamik führen.

Jeder Runner ist auf ein bestimmtes Modell zugeschnitten, sei es SIR, SEIR, SIS, SIRD oder SIRV. Er bringt die dafür notwendigen Parameter, Gleichungen und Abhängigkeiten mit. Diese werden deterministisch mit dem festen Integrator Euler gelöst, sodass die Simulation bei jedem Durchlauf identisch und reproduzierbar abläuft. Die Ergebnisse erscheinen direkt im Canvas und werden gleichzeitig als Kennzahlen ausgegeben.

Der Runner legt zudem die zeitliche Abfolge fest. Er bestimmt, welche Kurven sichtbar sind, wann Hilfslinien oder Marker eingeblendet werden und wie sich die Darstellung von Schritt zu Schritt verändert. Diese Sequenz ist nicht interaktiv, sondern bewusst vorgegeben. Sie bildet die dramaturgische Struktur, die sich an den erklärenden Kommentaren des Coach-Videos orientiert und die Inhalte in nachvollziehbaren Etappen vermittelt.

Während der Ablauf läuft, erzeugt der Runner fortlaufend Kennzahlen wie die Entwicklung der Kompartimente, den effektiven Reproduktionswert oder modellabhängige Größen wie Spitzenwerte, Gleichgewichtszustände oder Impfquoten. Diese Daten werden vom Boot-Modul aufgenommen und in die KPI-Decks eingefügt, sodass jederzeit der Zusammenhang zwischen Kurvenbild und Kennzahlen sichtbar ist.

Der Runner ist damit die ausführende Instanz im Intro. Er rechnet, rendert und steuert den Ablauf, während Boot ihn in die Oberfläche einbettet. Zusammen ergibt sich eine klare Aufgabenteilung. Boot sorgt für die Orchestrierung, der Runner für die inhaltliche und visuelle Umsetzung der Intro-Simulation.