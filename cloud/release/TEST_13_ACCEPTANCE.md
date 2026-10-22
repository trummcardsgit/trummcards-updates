# TrummCards Cloud 1.3 – TEST-Abnahme (nur TEST)
Stand: 22.10.2026

## Testzugang
- PWA: https://trummcardsgit.github.io/trummcards-updates/test-13/
- Nur Supabase-Projekt **TEST**: `cpycfxolqpidfjbhhsmr`
- GitHub CI: [TEST-PWA Workflow](https://github.com/trummcardsgit/trummcards-updates/actions/workflows/cloud-13-test-build.yml)
- Windows Cloud und TrummCards Production **nicht** umstellen oder aktualisieren.

## Bereits automatisiert geprüft
- JavaScript-Syntax und CI-Sicherheits-/Feature-Prüfungen.
- Isolierter TEST-PWA-Build und Upload/Publikation ausschließlich unter `test-13/`.
- SQL in einer zurückgerollten TEST-Transaktion: Wunschlisten-Eintrag mit 3 Stück, Übernahme von 2 Stück; danach vollständige Übernahme von 1 Stück; keinerlei Lagerbewegung.
- SQL als Rolle `authenticated` mit TEST-Admin: Wunschliste -> Sammlung (1/2), RLS-Schreibzugriff geprüft und anschließend zurückgerollt.
- SQL als nicht zugeordneter Benutzer: Rolle `none`, kein Zugriff auf private Listen und Lager.
- Noch **kein** realistischer End-to-End-Test mit eigenständigem Dex-Testkonto; in TEST war bisher nur ein Auth-Konto angelegt.

## Manuelle Funktionsabnahme
1. Admin mit TEST-Konto unter obiger TEST-PWA anmelden.
2. Unter **Mehr > Benutzerberechtigungen** einen in TEST `Authentication > Users` eingeladenen Benutzer als Dex-Nutzer freischalten (kein Produktionskonto voraussetzen).
3. Getrennte Browserprofile benutzen: Admin-Sitzung und Dex-Sitzung nicht vermischen.
4. Als Dex-Benutzer den **KartenDex** öffnen, Namen/Sprache auswählen, Karte aufrufen. Prüfen, dass Bild, Kartenname, Set und Kartennummer angezeigt werden.
5. **Zur Sammlung** auswählen, Menge speichern: der Eintrag muss nur in der eigenen Sammlung erscheinen. **Zur Wunschliste** gesondert prüfen.
6. Wunschlisteneintrag mit Menge 3 erstellen. **Gekauft – zur Sammlung übernehmen**, Menge 2: Wunschliste muss 1 anzeigen, Sammlung zusätzlich 2. Die letzte Menge 1 übernehmen: Wunschlisteneintrag verschwindet, Sammlung erhält einen weiteren Eintrag.
7. Aus eigener Sammlung und Wunschliste jeweils einen Eintrag entfernen. Nach Neuanmeldung muss das Ergebnis erhalten bleiben.
8. Als Dex-Nutzer kontrollieren: Lager, Artikelanlage, Einkauf, Verkauf, Finanzcenter und Benutzerverwaltung dürfen nicht zugänglich sein. Direkte Supabase-REST-Anfragen auf `tc_products`, `tc_sales` etc. dürfen keine fremden Daten liefern.
9. Als Admin eine Karte im Dex auswählen und **Ins Verkaufslager** anklicken. Prüfen: Artikelentwurf mit Karte/Set/Nummer/Sprache/Katalogbild; ein Einkauf wird *nicht* automatisch gebucht, Artikel bitte separat speichern und bei Bedarf Einkauf erfassen.
10. Benutzerberechtigung als Admin entziehen; nach erneuter Anmeldung darf der gesperrte Benutzer keine privaten Cloud-Daten sehen.
11. Mit zwei Dex-Konten die Trennung testen: die Sammlung und Wunschliste von Konto A dürfen bei Konto B nicht sichtbar sein.

## Noch offen vor einer Produktivfreigabe
- Reale PWA-Tests mit mindestens einem separaten Dex-Konto (auch API-Zugriffstests).
- Bilder- und Layoutprüfung am Mobilgerät, Windows-Cloud-Gleichstand entscheiden.
- Bestehende verschlüsselte Produktionsbackups um die neue Tabelle `tc_personal_cards` und eventuelle Benutzerrechte erweitern, inklusive Restore-Test. Frühere Backup-Versionen sichern neue Sammlungsdaten **nicht automatisch**.
- Abschließender Sicherheitstest/Release-Freigabe. Kein Merge in `main` und kein Produktiv-Deploy bis dahin.
