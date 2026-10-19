# TrummCards Cloud – Projektchronik, KartenDex-Ausbau 1.2.0-test.2
Datum: 19. Oktober 2026

## Grundlage
Version 1.2 TEST mit eigenem KartenDex-Menü, Pokémon-Namenssuche mit Blättern, Set-Katalog und Vinted-Inseratsvorlagen. Der Branch ist feature/cloud-1.2-carddex-vinted. Bestehende Cloud 1.1 PRODUCTION bleibt getrennt.

## Umgesetzte Verbesserungen im KartenDex
- Fehlendes, nicht erreichbares oder beschädigtes Kartenvorschaubild: Anfrage nach dem englischen Bild exakt derselben TCGdex-Karten-ID. Die Karte und ihre übrigen Metadaten bleiben in der vom Nutzer ausgewählten Katalogsprache.
- Bild-Fallback wird als „Englisches Ersatzbild“ ausgewiesen. Wenn auch dort kein Bild vorliegt, wird „Kein Kartenbild verfügbar“ angezeigt.
- Gleichzeitig maximal vier englische Bildanfragen; Ergebnisse pro Anwendungssitzung zwischengespeichert.
- Beim Öffnen einer Karte werden, sofern vorhanden, Cardmarket-Trendpreise in EUR aus der TCGdex-Kartendetailantwort angezeigt. Standard und Holo werden getrennt; ein Trendwert von 0 wird nicht als Verkaufswert dargestellt. Preisstand und veraltete Quellen werden ausdrücklich gekennzeichnet.
- Wenn kein geeigneter Cardmarket-EUR-Preis vorhanden ist, erscheint ein Hinweis statt eines ausgedachten Wertes.
- Neue Darstellungen in Windows und PWA; neue Tests für Preisvalidierung und isolierte Bildersatzlogik.

## Testbereitstellung
- Versionskennung 1.2.0-test.2. Service-Worker-Cache und PWA-URL-Parameter wurden verändert, damit vorhandene PWA-Installationen aktualisieren.
- TEST-PWA: https://trummcardsgit.github.io/trummcards-updates/test-12/
- Automatisches GitHub-Actions-Testverfahren: https://github.com/trummcardsgit/trummcards-updates/actions/runs/39263773396
- Die PWA-Veröffentlichung wurde über GitHub erfolgreich abgeschlossen und alle ausgelieferten Module auf Versionsangaben, TEST-Endpunkt sowie neuen Bild- und Preiscode geprüft.
- Windows-TEST-Build wird im selben Workflow erstellt und als GitHub Actions Artifact bereitgestellt; vor der Abschlussprüfung nicht als fertig behaupten.

## Sicherheit
- Keine Anpassung von Supabase-Schema, Produktivdaten, Inventar, FIFO oder Zahlungsjournal.
- Keine Änderung von TEST-Datensätzen. Abrufe erfolgen direkt beim externen Kartenkatalog.
- Keine automatische Vinted-API-Integration und kein automatischer Verkauf.
- Alte Produktionsversion 1.1, ihre Benutzer- und Lagerdaten sowie Windows-Updatefeed bleiben unverändert.

## Praxistests
- Deutsches Bild vorhanden: es wird bevorzugt.
- Deutsches Bild nicht vorhanden/kaputt, englisches vorhanden: englisches Ersatzbild wird markiert.
- Kein Bild vorhanden: lesbarer Platzhalter.
- Standard/Holo-Preis mit Stand, fehlender Preis, veralteter Preis.
- Karte über den KartenDex aufrufen, Sprache wechseln, Suchseiten und Sets durchblättern.

## 19.10.2026 – KartenDex-Suche mit drei Feldern
- Suchmaske ergänzt um den Pokémon-/Kartennamen, den Set-Namen und die Kartennummer. Alle Felder können einzeln oder kombiniert verwendet werden, ohne dass ein Artikel angelegt werden muss.
- REST-Abfrage mit den TCGdex-Filtern `name`, `set` und `localId` (exakte Nummer, ggf. nach führenden Nullen normalisiert). Die bisherige 20er-Seitennavigation übernimmt alle Filter.
- Nummern wie `009/147` werden als gedruckte Kartennummer plus offizielle Setgröße verstanden; bei abweichender Katalognummer erfolgt eine zweite gezielte Abfrage.
- Kartenansicht zeigt unter dem Bild künftig jeweils den Kartennamen, den tatsächlichen Set-Namen und in einer eigenen Zeile die Nummer (mit offizieller Setgröße, soweit von TCGdex geliefert).
- Für Treffer aus der globalen Suche wird der Set-Name aus den jeweiligen Kartendetails geladen und zeitweise pro Karten-ID/Sprache zwischengespeichert; beim direkten Durchsuchen eines Sets ist der Set-Name sofort verfügbar.
- Tests für kombinierte Filter, Paginierung, Nummernnormalisierung, Set-Anzeige und Windows-/PWA-Gleichstand ergänzt.
- TEST-Buildversion `1.2.0-test.3` mit neuer Service-Worker-Kennung; Release erfolgt isoliert nach `test-12/`. PRODUCTION 1.1 sowie TEST-Datenbankbestände bleiben unangetastet.
