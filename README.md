# theaterhistory_visulisation
Beitrag "Visualisierung der Daten/Metadaten" für das Projekt "Re-Collecting Theater History" der Theaterwissenschaftlichen Sammlung der Universität zu Köln. 

## Projektbeschreibung
Dieses Projekt stellt eine Visualisierung des Meta-Datensatzes aus dem Re-Colleting Projekt da.

## Funktionaltitäten
- bubblegrafik.html: Ausgabe der Übersicht zu den verschiedenen Theaterstücken und ihren Premieredaten
- networkgrafik.html: Ausgabe einer Übersicht zu dem Regisseur Gustav Sellner und seinen Stücken und beteiligten Schauspielern
- import.html: Ausgabe der Dateiverzeichnise mit jstree; hier ist es möglich die XML-Dokumente einzeln in die Datenbank schreiben
- server.js - hier stehen alle wichtige Funktionen zur Datenbank drin; z.B. create oder auch die Transition von den Daten in JSON für die beiden Grafiken
- rep100sel.html: enthält einige Übungen zu der Verarbeitung der Daten, z.B. eine Suche nach Personen und Titel des Theaterstückes
- randaus.html: Test zum Filtern der Daten mittels Randauszählung
- rep200tab.html: Tabelle zur ersten Übersicht
- index.html: Grundseite

## Installationsanleitung
1. Download und Installation von node.js auf Ihrem Computer
2. Download bzw. Clone des Projektes von GitHub
3. Komplettieren der Projektmodule mit Commandbox-Befehl "npm install" im Projektordner
4. Wichtig: Installation der Datenbank SQlite3 mit "npm install sqlite3" im Projektordner
5. Start des Servers mit Commandbox-Befehl "node server.js" im Projektordner
6. Aufruf im Browser mit localhost:3000/
Alle oben genannten Seiten können mit localhost:3000/dateiname.dateiendung. Beispiel: localhost:3000/rep100sel.html

Das Projekt wurde mit Visual Studio Code unter Windows 10 entwickelt und getestet. Falls etwas nicht funktionieren sollte, kontaktieren Sie mich gerne. 

