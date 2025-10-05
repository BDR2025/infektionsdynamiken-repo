Der SEIR Runner im Detail

Der SEIR Runner erweitert den Aufbau des SIR Modells um die zusätzliche Komponente der Exponierten. Dadurch wird im Ablauf eine Phase sichtbar, in der Infizierte das Virus bereits aufgenommen haben, aber noch nicht ansteckend sind. Diese Besonderheit zeigt sich in den Etappen. Neben den Kurven für S, I und R wird auch die Entwicklung der Exponierten dargestellt und schrittweise eingeblendet.

Anders als beim SIR Runner gibt der SEIR Runner zusätzlich Peak-Werte aus. Er berechnet, wann E und I ihre jeweiligen Höchststände erreichen, und blendet diese Werte zum richtigen Zeitpunkt ein. Im Chart erscheinen dazu vertikale Hilfslinien, die die Peak-Tage markieren und damit die Dynamik deutlicher machen.

Die restliche Logik bleibt gleich. Die Simulation läuft deterministisch mit Euler-Integration, die Darstellung ist festgelegt und reproduzierbar, und die Sequenz folgt den coachspezifischen Dramaturgien. Auf diese Weise vermittelt der SEIR Runner denselben geführten Ablauf wie beim SIR Modell, macht aber die Besonderheiten der Latenzzeit und der doppelten Peaks sichtbar.