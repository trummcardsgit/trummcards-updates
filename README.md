# TrummCards Lagerverwaltung – Version 1.6.0

## Neues in Version 1.6
- Das Fußzeilen-Element **EST. 2026** bleibt bei wenig Inhalt am unteren Fensterrand.
- Einkäufe/Artikel lassen sich im Lager und in der Buchungshistorie bearbeiten, ohne einen neuen Artikel anzulegen.
- Artikelnummern/SKUs müssen eindeutig sein; doppelte Nummern werden beim manuellen Anlegen und im CSV-Import abgelehnt.
- Einzelpreis und Gesamtpreis rechnen sich gegenseitig anhand der Stückzahl aus. Zusatzkosten werden zusätzlich in den Einstand pro Stück einbezogen.
- Verkäufe können nachträglich unter „Buchungen“ geändert werden (Menge, Artikel, Preis, Versand, Gebühren, Datum, Plattform und Notiz). Lagerbestand, FIFO-Zuordnung und Gewinn werden aktualisiert.
- Werden Einkaufspreise bereits verkaufter Artikel nachträglich geändert, weist das Programm vor einer Neuberechnung historischer Gewinne darauf hin.
- Geldbeträge können mit Komma oder Punkt eingegeben werden.

## Datensicherung
Die bisherige lokale Datenbank bleibt erhalten (gleiche Schlüssel). Vor jedem Update empfehlen wir eine JSON-Sicherung inklusive Artikelbilder. Das Update-Modul erstellt vor dem Installieren automatisch eine Sicherung.

## Auto-Updates
Bei jedem Versionssprung im Repository erstellt GitHub Actions die Windows-Installationsdateien und lädt die EXE, `latest.yml` und die zugehörige `.blockmap` als GitHub Release hoch. Windows Smart App Control kann unsignierte Installer weiterhin blockieren.
