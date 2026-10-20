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

## 19.10.2026 – Korrektur der Marktpreis-Varianten (1.2.0-test.4)
- Ausgangspunkt: Glurak VMAX 74/73 aus „Weg des Champs“ zeigte gleichzeitig „Standard“ und „Holo“, obwohl dies nicht automatisch zwei reale Druckvarianten dieser Rainbow Secret Rare belegt.
- Das Kartenmodell übernimmt jetzt die ausdrücklich in der TCGdex-Detailantwort aufgeführten Varianteneigenschaften normal, holo, reverse und firstEdition. Die bloße Existenz von zwei Cardmarket-Preisfeldern erzeugt keine Varianten.
- Die KartenDex-Preisanzeige verwendet nur dann zwei getrennte Trendwerte, wenn TCGdex mindestens die Ausführungen Normal und Holo ausdrücklich bestätigt.
- Bei nur einer oder unbekannten Ausführung wird höchstens ein allgemeiner Cardmarket-Trendwert ausgegeben. Zusätzliche Rohpreisfelder werden ausgeblendet und die Unsicherheit offen erläutert. Für Glurak VMAX wird somit der bisherige allgemeine Trend (Beispiel 174,81 €) nicht mehr durch einen nicht zugeordneten zweiten Holo-Trendwert (Beispiel 271,61 €) ergänzt.
- Ein allgemeiner Trendwert ist keine Garantie für den richtigen Zustand, die konkrete Sprache, die Variante oder den Verkaufspreis; die externe TCGdex-Preiszuordnung kann selbst fehlerhaft sein.
- Neue Regressionstests decken exakt die Glurak-VMAX-Situation, Karten mit bestätigten zwei Varianten und Karten ohne Variantendaten ab.
- Nur die isolierte TEST-Version wurde geändert; die Produktionsdatenbank und Produktivversion 1.1 bleiben unverändert.

## 19.10.2026 – Fix für englische Ersatzbilder direkt in Kartensuchtreffern (TEST 1.2.0-test.5)
- Fehlerbild: Ein Kartenbild war in der Detailansicht vorhanden, aber das gleiche englische Ersatzbild erschien nicht in der Suchergebnisübersicht.
- Ursache: Die Funktion zur Bildauflösung überprüft `img.isConnected`; bisher wurde sie aufgerufen, während sich die Trefferkarte noch nicht im DOM befand. Bei fehlendem direkten Bild-URL wurde deshalb die Fallback-Anfrage sofort beendet.
- Korrektur: Bildabruf auf die nächste Microtask nach dem Einfügen der Trefferkarte verschoben und mit einer Prüfung auf aktive Suchergebnisgeneration ergänzt; betrifft Windows und PWA.
- Regressionstest simuliert eine Karte ohne deutsches Bild, fügt den Suchtreffer ins DOM ein und prüft das Laden desselben englischen TCGdex-Kartenbilds.
- Die TEST-Buildkennung wurde auf `1.2.0-test.5`, die Service-Worker-Kennung auf `trummcards-mobile-test12-shell-v1-1205` erhöht. Produktivdaten und Version 1.1 bleiben unverändert.
- Neue Funktionsidee im Gespräch: Per Smartphone-Kamera aufgenommene Einzelkarte über Texterkennung von Pokémon-Name, Kartennummer und Set suchen; keine Barcode-Pflicht und vor einer automatischen Zuordnung Treffer bestätigen lassen. Noch nicht implementiert.

## 19.10.2026 – KartenDex-Kamerascanner PWA (TEST 1.2.0-test.6)
- Neuer Menüabschnitt im KartenDex der PWA: „Karte scannen“ öffnet die native Smartphone-Kamera mittels `input accept=image/* capture=environment`. Alternativ „Foto auswählen“ aus vorhandenen Bildern (JPG, PNG, unterstützte HEIC etc., maximal 15 MB).
- Clientseitige Texterkennung auf Basis von Tesseract.js 7.0.0 (deutsch/englisch), nur bei Scanner-Nutzung nachgeladen; Software, Web Worker und Sprachmodelle werden hierfür vom CDN geladen. Die aufgenommenen Bilder werden nicht an eine OCR-API, Supabase oder TCGdex hochgeladen, sondern in einem lokalen Canvas verarbeitet.
- Name aus dem oberen Bildausschnitt und gedruckte Kartennummer aus dem unteren Bildausschnitt werden ausgelesen, im Scanner-Formular bearbeitbar angezeigt und an die vorhandene KartenDex-Suche mit Name+Kartennummer übergeben; ein zuvor gesetzter Setfilter wird zurückgesetzt. Der Benutzer wählt selbst aus den Bild-Treffern die richtige Karte aus. Bei unsicherer OCR sind Korrektur und erneute Suche möglich.
- OCR-Lade-/Fortschrittsmeldungen, Ladebegrenzung einer großen Bilddatei, Abbruch vor der Suche bei ungültigen Bildern und verständliche Fehlerhinweise, wenn Tesseract oder Kamerazugriff nicht verfügbar ist.
- Neue Tests `cloud/release/cardscan12.test.mjs` für OCR-Textextraktion, Formulare, Limits, lokale Worker-Initialisierung und echte Übernahme in die KartenDex-Suchmaske. Build-Workflow erstellt PWA isoliert nach `test-12/` und Windows-Testpaket; die Scannerfunktion ist aktuell **nur in der PWA**, wie in der Projektplanung vorgesehen. Für die Windows-App kann später ein Scanner via Webcam/Dateiauswahl ergänzt werden.
- Versionierung 1.2.0-test.6, Service-Worker `trummcards-mobile-test12-shell-v1-1206` und Precache der lokalen Datei `cardscan12.js`. Erstnutzung benötigt Internet zum Nachladen der OCR-Engine/Sprachen; es handelt sich nicht um eine garantiere fehlerfreie Bildklassifizierung, sondern textbasierte Vorschläge.
- Keine Supabase-Migration, keine Änderungen an PRODUKTION 1.1 oder ihren Echtdaten.

## 19.10.2026 – Kamerascanner zurückgenommen und Kartennummern-Suche korrigiert (1.2.0-test.7)
- Nutzer-Praxistest: Kamera-/OCR-Scanner erkennt Pokémon-Namen falsch, erzeugt fehlerhafte Suchanfragen. Funktion auf ausdrücklichen Wunsch aus der PWA entfernt: Kamera- und Fotodatei-UI, OCR-Initialisierung, OCR-Modul, Scanner-Tests, Service-Worker-Vorabladeeintrag und zugehöriges CSS.
- Die manuelle KartenDex-Suche nach Name, Set und Kartennummer bleibt als primärer Weg erhalten; Testdaten und Produktivdaten werden nicht verändert.
- Konkreter Fehler: Eingabe `2/132` wurde nur als `localId=2` verarbeitet. Der Nenner 132 (= offizielle Setgröße) ging verloren. Vintage-Karten fehlten wegen lang zurückliegendem Release und fehlenden lokalisierten deutschen Katalogeinträgen in den ersten 20 Suchergebnissen.
- Lösung: Bei Angaben im Format `Karten-Nr./Setgröße` werden alle Set-Briefe des englischen TCGdex-Katalogs mehrseitig durchsucht. Der vollständige Nenner begrenzt die infrage kommenden Sets anhand `cardCount.official`. Aus diesen Sets werden ausschließlich Karten mit genau passender `localId` (mit tolerantem Vergleich führender Nullen) übernommen. Treffer werden lokal paginiert und gegebenenfalls mit vorhandenen deutschen Kartendaten angereichert. Wenn eine deutsche Karte fehlt, wird der englische Katalogname als gekennzeichneter Fallback übernommen.
- Beispiel: `2/132` bzw. `002/132` findet `gym2-2`, Blaine's Charizard, Set Gym Challenge (132 reguläre Karten), sofern der externe TCGdex-Katalog erreichbar ist.
- Die Suchtreffer öffnen in der bei der Suche verwendeten Katalogsprache, damit englische Vintage-Detaildaten statt eines deutschen 404-Fehlers erscheinen.
- Automatisierte Regressionstests für Vintage-Suche, Setgrößenfilter, englischen Fallback, führende Nullen und Set-Katalog-Folgeseiten.
- PWA-Version `1.2.0-test.7` und eigener Service-Worker-Cache `trummcards-mobile-test12-shell-v1-1207`. Nur TEST unter `test-12/`; Produktivversion Cloud 1.1 samt vorhandenen Echtdaten unverändert.
- Zu beachten: Die präzise Suche nach einer Nummer mit Nenner braucht beim ersten Aufruf unter Umständen mehrere TCGdex-Anfragen; Sets werden innerhalb derselben Anwendungssitzung zwischengespeichert. Nicht verifizierte Treffer werden dem Nutzer nicht automatisch als eigener Lagerartikel angelegt.

## 19.10.2026 – Nutzergewähltes „Kein Bild“-Artwork in KartenDex (TEST 1.2.0-test.8)
- Ausgangswunsch: Sobald weder das Kartenbild in der eingestellten Sprache noch das englische Ersatzbild heruntergeladen und angezeigt werden kann, darf in KartenDex keine leere Bildfläche und kein defektes Bildsymbol erscheinen.
- Nach mehreren Gestaltungsvarianten entschied sich der Benutzer ausdrücklich für die **schlichte, dunkelblaue Karte mit goldfarbenem Rand und dezenter Monster-Silhouette samt Fragezeichen** und den beiden Textzeilen „Kein Bild“ sowie „Kein Kartenbild verfügbar“.
- Die ausgewählte Bildvorlage wurde ohne Änderung ihrer Gestaltung in eine 220 × 330 Pixel große WebP-Datei für die kleinflächigen KartenDex-Ansichten verkleinert und auf 5,5 KB komprimiert. Asset: `cloud/desktop-production/src/kein-bild12.webp`. Verifizierter Git-Blob: `91a1eeb4b5503af3319bc1efa25613e68082e915`.
- Die KartenDex-Bildladefunktion verwendet diese **lokal mitgelieferte** Grafik nur dann, wenn die bisherigen Kartenbilder inklusive englischem Fallback fehlschlagen. Die eigentlichen Bildfelder und Katalogdaten werden dabei nicht überschrieben.
- Der Platzhalter wird als normales sichtbares IMG verwendet und erscheint **sowohl bei Suchtreffern als auch in den Kartendetails**. Gescheiterte Bildladeereignisse werden zurückgesetzt, damit ein früherer 404-Fehler die Ersatzgrafik nicht beeinflusst. Falls auch die lokale Datei wider Erwarten nicht geladen werden kann, erscheint ein Text-Hinweis.
- Das bestehende englische Ersatzbild bleibt bevorzugt. Bei einem korrekt geladenen deutschen/englischen Bild wird der Platzhalter nicht angezeigt.
- Windows-TEST-Paket enthält das WebP direkt unter `src/`. Der PWA-TEST-Build kopiert dieselben Bildbytes nach `web/`, prüft das RIFF/WebP-Format und speichert den lokalen Dateipfad im Service-Worker-Cache für Offline-Verfügbarkeit.
- Testversion `1.2.0-test.8` mit Cache `trummcards-mobile-test12-shell-v1-1208`. Regressionstests für Suchergebnis und Detailansicht sowie Paket- und Cache-Vollständigkeit.
- Nur der Entwicklungszweig und die TEST-Ausgabe werden geändert; Supabase-TEST- und PRODUKTIV-Daten sowie Cloud-PRODUCTION 1.1 bleiben unberührt.

## 19.10.2026 – Zuverlässiger „Kein Bild“-Platzhalter (TEST 1.2.0-test.9)
- Nutzer meldete weiterhin textbasierte „Kein Kartenbild verfügbar“-Treffer statt ausgewählter Kartenplatzhalter. Ursache: Der Platzhalter wurde als zusätzliche externe Bildressource aus dem Pages-Verzeichnis geladen; solange die Seiten-Neuveröffentlichung oder das PWA-Caching nicht abgeschlossen waren, schlug dieser Abruf fehl.
- Das vom Nutzer gewählte WebP (220×330 px, 5.516 Bytes, Git-Blob `91a1eeb4b5503af3319bc1efa25613e68082e915`) ist jetzt **als Daten-URI direkt in beide KartenDex-Quellcodes eingebettet**. Der Fallback benötigt daher keinen separaten HTTP-Aufruf und kann auch offline funktionieren, sobald die JavaScript-Datei im Cache liegt.
- Rendering weiterhin nur nach erfolglosem Versuch, das gewünschte bzw. englische TCGdex-Bild zu laden. Gleiche Bildlogik für Suche, Set-Treffer und Detailansicht. Der Fallback zeigt exakt die benutzergewählte dunkelblau/goldene Grafik, nicht ein neu gestaltetes Motiv.
- Automatische Tests bestätigen, dass die eingebetteten Bildbytes mit dem Originalbild identisch sind und dass Such- und Detailansicht die Bild-Daten-URI verwenden.
- Der PWA-Service-Worker enthält das neue KartenDex-JavaScript mit Version `1.2.0-test.9` und benötigt keine zweite Platzhalterbilddatei mehr beim Installieren. Separate lokale WebP-Datei bleibt als Windows-Paketbestandteil verfügbar.
- Version `1.2.0-test.9` ist unter `gh-pages/test-12/` als Quell-Deployment angelegt. Die endgültige Veröffentlichung durch GitHub Pages und der Windows-Test-Build müssen anhand der GitHub-Actions-Ergebnisse geprüft werden; einen wartenden Pages-Build nicht als abgeschlossen markieren.
- TEST-Datenbank, alle Echtdaten sowie Cloud-Production 1.1 unverändert.


## 20.10.2026 – Cloud 1.2.3: Bestand ändern und Artikel entfernen (Entwicklung)
- Zwei Funktionen für die Lagerübersicht in **Windows und PWA**: `Bestand ändern` und `Entfernen`, jeweils mit Nachfrage und Bestätigung.
- Mengenänderungen werden serverseitig als atomare FIFO-Bestandskorrekturen geplant: Der Benutzer bestätigt den vorherigen Bestand, negative Bestände werden verhindert, Änderungen erhalten einen Grund und eine Audit-Historie.
- Artikel entfernen bedeutet **archivieren statt Datenbankeinträge unwiderruflich löschen**. Verbleibender Bestand wird ausgebucht; Käufe, Verkäufe, Bilder und Finanznachweise bleiben zugeordnet.
- Bei späterer Bestandsrückkehr (etwa durch Verkaufsstorno) wird der archivierte Artikel automatisch reaktiviert.
- Korrektur-Zugangsposten werden in Finanzauswertungen und CSV ausdrücklich nicht als tatsächliche Einkaufsausgaben mitgezählt.
- Neue Änderungen sind auf den zuletzt bereitgestellten Bildkorrekturen aufgebaut: Branch `feature/cloud-1.2.3-stock-management` (Basis `fix/cloud-1.2.2-inventory-images`).
- Die automatischen Tests für Lagerkorrekturen, Archivierung, Finanzlogik, bisherige Bilder und den isolierten TEST-Client sind erfolgreich: [TEST-Lauf 39415390223](https://github.com/trummcardsgit/trummcards-updates/actions/runs/39415390223).
- **Offen / noch nicht live:** Die neue Datenbankmigration `cloud/supabase/migrations/20261020000100_stock_corrections_archive.sql` ist im Repository, konnte aber aufgrund einer Sicherheitsblockierung nicht auf Supabase TEST ausgeführt werden. Daher existiert noch keine nutzbare veröffentlichte Version mit diesen beiden Funktionen. Die Supabase-PRODUCTION-Datenbank bleibt unangetastet.
- Nächste Freigaben: Migration in TEST durch autorisierten Datenbankadministrator prüfen und ausführen; Bestandsänderung, Lösch-Sonderfälle, Verkaufsstorno, PWA/Windows synchron und Mehrfachbuchung praktisch testen; danach mit Backup/Restore und ausdrücklicher Freigabe über Produktion entscheiden.


### 20.10.2026 – Freigabeprüfung und 1.2.3-Staging
- Benutzer wünscht Veröffentlichung als Update. Live-Feed `gh-pages/cloud-updates/latest.yml` wurde read-only überprüft: **1.2.2** ist weiterhin aktuell.
- Beide Datenbanken geprüft: Weder TEST noch Production haben `tc_adjust_inventory`, `tc_archive_product`, `tc_inventory_corrections` oder `tc_products.archived_at`. Daher ist 1.2.3 noch nicht funktionsfähig und **darf nicht live geschaltet werden**.
- Production-Datensätze vor der Veröffentlichung nachgezählt: 14 Artikel, 15 Einkaufsposten, 1 Verkauf und 11 Artikelbild-Datensätze. Keine Daten verändert.
- Vorbereitete Release-Staging-Datei: `cloud/release/prepare-cloud-123-production.mjs` mit unveränderter Windows-App-ID, identischem Cloud-Autoupdate-Feed und PWA-Cache-Version `v123`.
- Isolierter CI-Probelauf ohne Deployment und ohne Datenbankzugriff **erfolgreich**: https://github.com/trummcardsgit/trummcards-updates/actions/runs/39423950376
- Der Versuch, die SQL-Migration über den verbundenen Datenbankzugang anzuwenden, wurde zuvor von einer Sicherheitsprüfung blockiert. Keine Umgehung des Blocks. Migration daher von einem autorisierten Administrator prüfen und zunächst auf TEST freigeben lassen.
- Erst nach erfolgreichem TEST-RPC-/End-to-End-Test, frischem vollständigem PROD-Backup mit geprüftem Restore und genehmigter PROD-Migration darf 1.2.3 für PWA und Windows veröffentlicht werden.


### 20.10.2026 – SQL-Integration erfolgreich und Backup V3 vorbereitet
- Zunächst blieb das Deployment korrekt blockiert, da `archived_at`, `tc_inventory_corrections` und beide Lager-RPCs auf Supabase TEST und PROD noch fehlten.
- Kritischer Syntaxfehler im SQL-Triggerterminator korrigiert (`$;` → `$$;`).
- Neuer echter PostgreSQL-17-Integrationstest in isoliertem GitHub-Actions-Dienst: synthetische Artikel/Einkaufslose/Verkäufe, FIFO-Bestandsreduktion und -erhöhung, Prüfung veralteter Mengen, Archivierung, Erhalt der Verkaufshistorie und Reaktivierung nach Rückbuchung. Erfolgreich: https://github.com/trummcardsgit/trummcards-updates/actions/runs/39424948424
- Backup-V3-Entwicklung hinzugefügt: `cloud/release/sql/cloud123_backup_snapshot_v3_staging.sql`, `TABLES_V3` in Validator, v3-fähiger Restore-Check inklusive Identitätssequenzen, Rückwärtskompatibilität zu V1/V2 und V3-Regressionstests. Testlauf erfolgreich: https://github.com/trummcardsgit/trummcards-updates/actions/runs/39425445172
- Freigabedokument erstellt: `cloud/release/RELEASE_1.2.3_STOCK_MANAGEMENT.md`, mit TEST-Migration, praktischen Tests, PROD-V2-Backup + Restore, PROD-Migration, PROD-V3-Sicherung, PWA/Windows-Release-Gates und Verifikation.
- **Noch nicht LIVE:** Supabase TEST und PRODUCTION nicht verändert. Auto-Migration über verbundenes Tool weiterhin durch Sicherheitsprüfung blockiert. Ohne fachlich autorisierte und getestete Supabase-Migration kein Produktivupdate.


### 20.10.2026 – TEST-SQL erfolgreich und eigenständige 1.2.3-PWA veröffentlicht
- Der Benutzer hat die geprüfte Bestandsmigration selbst in **Supabase TEST** erfolgreich angewendet.
- Read-only verifiziert: `tc_products.archived_at`, `public.tc_inventory_corrections`, RPCs `tc_adjust_inventory`/`tc_archive_product`. RLS eingeschaltet, Owner-Policy vorhanden, zwei Reaktivierungs-Trigger vorhanden; für `anon` keine RPC-Ausführungsrechte. TEST-Daten weiterhin 8 Produkte, 5 Einkaufsposten und 2 lagernde Stück zum Prüfzeitpunkt. Noch keine archivierten Produkte oder gebuchten Korrekturen.
- Eigenständige PWA unter `gh-pages/test-123/` veröffentlicht: https://trummcardsgit.github.io/trummcards-updates/test-123/ . TEST-Projekt `cpycfxolqpidfjbhhsmr`, eigene Session-Schlüssel, eigene Service-Worker-Cachekennung, kein Produktionsschlüssel in den TEST-Dateien.
- Automatischer Build erfolgreich: https://github.com/trummcardsgit/trummcards-updates/actions/runs/39436348268. GitHub Pages-Build erfolgreich: https://github.com/trummcardsgit/trummcards-updates/actions/runs/39436406099.
- **Nächster Schritt:** Im TEST einen Artikel mit Bestand anlegen/korrigieren, Bestand erhöhen und senken, Entfernen bestätigen und die Historie sowie den Bestand in Windows-/PWA-TEST vergleichen. Bei Fehlern genaue Meldung und betroffenen TEST-Artikel prüfen.
- **Kein PRODUCTION-Release:** Echtdatenbank hat die neue Migration noch nicht erhalten; Live-Feed weiterhin 1.2.2. Erst nach validiertem Praxistest, frischer geprüfter Sicherung und genehmigter PROD-Migration das Release 1.2.3 freigeben.

### 20.10.2026 – TEST durch Benutzer bestätigt, PROD-Backup erfolgreich
- Nutzer bestätigt beide praktischen Funktionen auf Cloud 1.2.3 TEST: **Lagerbestand ändern funktioniert** und **Artikel entfernen funktioniert**.
- Frisches, verschlüsseltes Production-Preflight-Backup erfolgreich erstellt: GitHub Actions Run [39437786068](https://github.com/trummcardsgit/trummcards-updates/actions/runs/39437786068). Archiv als GitHub Actions-Artefakt verfügbar, 30 Tage Aufbewahrung laut Workflow.
- Echtes Wiederherstellen in isolierter PostgreSQL-17-Datenbank erfolgreich: 10 Tabellen, 11 private Bilder, 15 lagernde Stück. Stand Sicherung: 14 Artikel, 15 Einkaufsposten, 1 Verkauf, 11 Artikelbilder.
- Die PROD-Migration ist noch NICHT ausgeführt; `tc_adjust_inventory` weiterhin nicht in Production vorhanden. Produktions-Update-Feed unverändert **1.2.2**.
- Nächste Stufe: autorisierte Durchführung der geprüften SQL-Migration im richtigen Supabase-Production-Projekt; danach Schema-/Bestandsnachprüfung, V3-Backup-RPC/Funktionstests, neues V3-Backup mit Restore und erst danach Windows/PWA Release 1.2.3.


### 20.10.2026 – PRODUKTION: Lagermigration erfolgreich, Backup V3 zum Abschluss vorbereitet
- Der Benutzer bestätigte das vollständige SQL-Update auf **TrummCards Production**. Per read-only Supabase-SQL verifiziert: `tc_inventory_corrections`, `archived_at`, `tc_adjust_inventory`, `tc_archive_product`, Owner-RLS und zwei Reaktivierungstrigger vorhanden.
- PROD-Bestand nach Migration **unverändert**: 14 Artikel, 15 Einkaufsposten, 1 Verkauf, 11 Artikelbilder, 15 lagernde Stück; Korrekturprotokoll zu diesem Zeitpunkt noch leer.
- Produktions-Backup-RPC `tc_backup_snapshot()` war noch V2, enthielt **noch nicht** `tc_inventory_corrections`. Deshalb darf 1.2.3 noch nicht freigeschaltet werden, um die spätere Wiederherstellung der Korrekturhistorie nicht zu gefährden.
- Backup-/Restore-Unterstützung für V1/V2/V3 in den Hauptzweig `main` integriert: GitHub PR [#8](https://github.com/trummcardsgit/trummcards-updates/pull/8), Merge `cec432deeaea17c8aad6a9f80d10034cfb1ef4cf`, erfolgreicher Test [39444132051](https://github.com/trummcardsgit/trummcards-updates/actions/runs/39444132051).
- Abgesicherter 1.2.3-Produktions-Workflow `.github/workflows/cloud-123-production-deploy.yml` vorbereitet. Der Release benötigt ausdrücklich `GO_LIVE_123.txt`, grüne Bestands-/Bildtests, V3-kompatibles Backup in `main`, **ein frisches verschlüsseltes PROD-V3-Backup mit echtem PostgreSQL-Restore**, korrektes Windows-1.2.3-Updatemanifest und unveränderte TEST-Verzeichnisse.
- Nächster Schritt: Autorisierter Admin muss **nur noch den geprüften V3-Snapshot-RPC** aus `cloud/release/sql/cloud123_backup_snapshot_v3_staging.sql` im SQL-Editor des PRODUCTION-Projekts ausführen. Anschließend Format und Berechtigungen per read-only Abfrage prüfen, den frischen V3-Backup-/Restore-Gate nachweisen und erst dann den Release-Marker setzen.
- **Aktueller Live-Stand**: `cloud-updates/latest.yml` meldet weiterhin **1.2.2**. Noch kein PWA/Windows-Produktionsupdate durchgeführt.


### 20.10.2026 – Cloud 1.2.3 PRODUKTION RELEASE ERFOLGREICH
- Supabase PRODUCTION Backup-Format V3 vom Benutzer installiert. Per SQL-Abfrage verifiziert: `tc_backup_snapshot()` liefert V3, enthält `tc_inventory_corrections`, Zugriff für `authenticated` ja, für `anon` nein.
- Bestand beim Datenbank-Release unverändert: 14 Artikel, 15 Einkaufsposten, 11 Artikelbilder, 15 lagernde Stück; `tc_inventory_corrections` vor erster Korrektur leer.
- Frischer PROD-V3-Backup-Restore mit 11 Tabellen, 11 privaten Bildern und 15 lagernden Stück erfolgreich: [GitHub Run 39445501084](https://github.com/trummcardsgit/trummcards-updates/actions/runs/39445501084).
- Der vollständige Produktions-Release-Workflow [39445829493](https://github.com/trummcardsgit/trummcards-updates/actions/runs/39445829493) lief mit grünen Source-/Featuretests, frisch verschlüsseltem V3-Backup plus lokalem PostgreSQL-17-Restore, Windows-Installer-Build und GitHub-Pages-Veröffentlichung erfolgreich durch.
- Live-PWA: https://trummcardsgit.github.io/trummcards-updates/production/ mit Version 1.2.3 (`app.js?v=1.2.3`, `trummcards-mobile-production-shell-v123`). Die Programmbefehle `tc_adjust_inventory` und `tc_archive_product` sind im veröffentlichten Code vorhanden und schreiben in das richtige PRODUCTION-Projekt.
- Windows-Autoupdater: `cloud-updates/latest.yml` meldet Version **1.2.3**, Installationsdatei `TrummCards-Cloud-Setup-1.2.3.exe` (ca. 85,7 MB) im bestehenden Feed; auch Installer für 1.2.2 und frühere Versionen bleiben vorhanden.
- Erfolgreich getestete neue Funktionen: „Bestand ändern“ und „Artikel entfernen/archivieren“ für Windows und PWA. Bestehende Verkäufe, Artikel und Bilder bleiben nachvollziehbar; Bestandskorrekturen werden auditiert und in Backup V3 gesichert.
- Produktionsfunktionen wurden nicht mit einem unkontrollierten echten Bestandswechsel getestet. Empfohlen: App/PWA öffnen und erst mit einem eigenen ungefährlichen Testartikel die Bedienung kontrollieren; danach bei Bedarf Testartikel sauber entfernen.
- **Projektchronik erweitert; Release 1.2.3 ist LIVE.**


### 20.10.2026 – Cloud 1.2.4 BILDKORREKTUR (Entwicklung, NICHT LIVE)
- Anlass: Im produktiven Lager fehlt beim Artikel „Nidoking 174/165“ das Bild, obwohl der KartenDex ein Kartenbild kennt. Read-only geprüft: Nidoking hat `catalog_card_id=''`, `catalog_image_url=''` und kein hochgeladenes Foto. Der Artikel „Glumanda 168/165“ im gleichen Set `ポケモンカード151` und derselben Sprache Japanisch besitzt `SV2a-168` und das Bildpräfix `https://assets.tcgdex.net/ja/SV/SV2a/168`.
- Ursachen im Code: (a) Lager zeigt Kartendex-Bilder nur an, wenn eine Bildverknüpfung gespeichert ist; (b) jede manuelle Namenseingabe nach der KartenDex-Auswahl löschte die vorhandene KartenDex-Verknüpfung einschließlich Bildreferenz.
- Branch `fix/cloud-1.2.4-catalog-image-link`: KartenDex-Zuordnung wird bei reinen Anzeigenamenänderungen nun erhalten (nur Set, Kartennummer, Sprache ändern die Identität); ein fehlendes Katalogbild kann in Windows/PWA anhand anderer **explizit verknüpfter Karten aus dem gleichen Set und der gleichen Sprache** konservativ erschlossen werden. Nidoking 174 wird so zum Kandidaten `https://assets.tcgdex.net/ja/SV/SV2a/174`.
- Sicherheitsregeln: Kein Produktiv-SQL-Update, kein Überschreiben eigener Fotos, kein Raten anhand eines ähnlichen Namens, kein Cross-Set-/Cross-Language-Link, bei widersprüchlichen Setpräfixen kein automatisches Bild. Existenz der Bilddatei wird erst durch das normale Lade-/Fallback-Verhalten der App überprüft.
- Automatisierter Node-Test `cloud/release/catalog-image-link124.test.mjs` prüft beide Plattformen, das echte Nidoking/Glumanda-Beispiel, falsches Set/Sprache, manipulierte URL und Bilder-Vorrang; auch vorherige Lager- und KartenDex-Regressionen: [GitHub CI 39448147492](https://github.com/trummcardsgit/trummcards-updates/actions/runs/39448147492) erfolgreich.
- **Noch ausstehend:** Bild tatsächlich in einer App-TEST-Umgebung visuell laden; später gesonderter 1.2.4 Release mit üblichen Backups/Freigaben. Version 1.2.3 bleibt produktiv.


### 20.10.2026 – Bildfix 1.2.4 als eigene TEST-PWA bereitgestellt
- Eigene, unverwechselbare TEST-Installation unter https://trummcardsgit.github.io/trummcards-updates/test-124/ veröffentlicht. TEST-Projekt `cpycfxolqpidfjbhhsmr`, isolierte PWA-Session (`trummcards-mobile-test124-session-v1`) und Service-Worker-Cache `trummcards-mobile-test124-...`.
- Neuer GitHub-Actions-Test-/Publish-Lauf [39449436852](https://github.com/trummcardsgit/trummcards-updates/actions/runs/39449436852) erfolgreich. Anschließende Nachprüfung: `gh-pages/test-124/app.js`, `catalog11.js`, `index.html`, `sw.js` und Manifest vorhanden, Projekt-ID TEST, KartenDex-Bildfallback aktiv.
- Für einen visuellen Nachtest wurden **zwei eindeutig als BILDTEST gekennzeichnete Produkte ausschließlich in Supabase TEST angelegt**, ohne Einkaufslose und ohne Bestand: `TC-BILDTEST124-GLU168` (Glumanda 168/165, japanisches 151-Set, gültige Referenz `SV2a-168`) und `TC-BILDTEST124-NID174` (Nidoking 174/165, absichtlich ohne Bildreferenz). Die Funktion kann so einen fehlenden Nidoking-Bildpfad anhand der nachgewiesenen Setreferenz darstellen.
- Kein Schreibzugriff auf PRODUCTION bei diesem Test-Deployment; produktiver Updater `latest.yml` weiterhin **1.2.3**.
- Visueller Test durch Anwender noch offen: In TEST-PWA unter „Dein Lager“ nach `BILDTEST Nidoking` suchen und Vorschaubild sowie Vollbild öffnen. Nach Freigabe einen gesonderten Produktions-Release mit funktionierendem Windows-Updater und PWA vorbereiten. Die BILDTEST-Produkte dürfen nach Abschluss aus TEST entfernt werden.


### 20.10.2026 – Cloud 1.2.4 produktiv freigegeben und Desktop-Web-PWA 1.2.5 in TEST

- **Bildfix 1.2.4 LIVE**: Benutzer bestätigte zuvor erfolgreich die Nidoking-Bilddarstellung in der isolierten TEST-PWA. Der Release wurde mit einem ausführlichen DRYRUN und bewahrtem Windows-Updater vorbereitet; initialer PWA-Precache-Fehler in `prepare-cloud-124-production.mjs` vor Deployment korrigiert.
- Produktiv-Release [GitHub Actions 39451828154](https://github.com/trummcardsgit/trummcards-updates/actions/runs/39451828154) erfolgreich, einschließlich neuer verschlüsselter **Backup V3**-Sicherung und tatsächlicher PostgreSQL-Wiederherstellung. `cloud-updates/latest.yml` weist **Version 1.2.4** aus; Installer und PWA mit `inferCatalogImageRoot` veröffentlicht.
- **Strategie beschlossen**: Gemeinsame Chrome/Edge-PWA als zukünftige Windows/Smartphone-Web-App. Bestehende Electron-App bleibt in Betrieb, bis vollständige Funktionsparität und Nutzerabnahme erreicht sind.
- **Desktop TEST 1.2.5**: neuer Zweig `feature/cloud-1.2.5-responsive-desktop-pwa`; in der vorhandenen PWA ab 1080px zweispaltiges Desktop-Shell-Layout mit seitlicher Navigation, vier Kennzahlen, größeren Lagerzeilen und Fotos, breiteren Such-/Filterflächen; unter 1080px mobile Navigation unverändert.
- Die separate TEST-PWA unter https://trummcardsgit.github.io/trummcards-updates/desktop-test/ greift ausschließlich auf Supabase TEST `cpycfxolqpidfjbhhsmr` zu; eigene Session-/Service-Worker-Schlüssel. PRODUCTION-PWA und Windows-Updater bleiben bei 1.2.4.
- Isolierter Desktop-PWA-Build und GitHub-Actions-Publish [39452724804](https://github.com/trummcardsgit/trummcards-updates/actions/runs/39452724804) erfolgreich; Folge GitHub-Pages-Rebuild wird separat geprüft.
- Roadmap und Testprotokoll: `cloud/release/ROADMAP_RESPONSIVE_DESKTOP_PWA_125.md`. **Nächster Schritt**: Desktop-PWA auf Windows in Chrome mit 1280/1920px-Bildschirm testen, alle Lager-, Einkaufs-/Verkaufs-, KartenDex- und Upload-Funktionen gegen bisherige Electron-Anwendung vergleichen; nach Abnahme einheitliche Geschäftslogik statt Doppelpflege implementieren.


### 20.10.2026 – Desktop-PWA 1.2.5 TEST: Menüpunkt „Buchungen“ wiederhergestellt
- Benutzer findet die separate responsive Desktop-PWA gelungen, möchte aber den früheren Windows-Menüeintrag „Buchungen“ wiederhaben.
- Ursache: Die vollständige PWA-Unterseite `page-sales` war bereits vorhanden und wurde durch `showPage('sales')` unterstützt; im Desktop-Seitenmenü gab es jedoch keinen `data-go="sales"`-Navigationsknopf.
- Korrektur: Sidebar-Schaltfläche „▤ Buchungen“ zwischen Verkauf und KartenDex. Vorhandene Unterseite zeigt Verkäufe, Storno, Versandverwaltung, Einkaufslosen und Geldfluss-Verknüpfungen. Keine neue Datenbank- oder Buchungslogik nötig.
- Mobile Ansicht bleibt bei sechs Navigationstasten, zusätzliche Buchungen-Verknüpfung unter „Mehr → Buchungen & Auswertungen“.
- Neuer TEST-Build `1.2.5-desktop-test.2` mit eigener SW-Cachekennung `trummcards-mobile-desktop125-shell-v2-1210` erfolgreich isoliert unter https://trummcardsgit.github.io/trummcards-updates/desktop-test/ ausgerollt.
- Automatische Regressionstests `desktop125-bookings-menu.test.mjs` und vorhandene Bild-/Lagerfunktionstests erfolgreich, GitHub Actions [39453872724](https://github.com/trummcardsgit/trummcards-updates/actions/runs/39453872724). Live-Pages-Branch geprüft: Menübutton sichtbar im HTML; CSS blendet Button nur unter Desktop-Breite ein; `app.js` greift ausschließlich auf Supabase TEST zu.
- Produktivversion Windows/PWA unverändert **1.2.4**. Benutzerabnahme der tatsächlichen Desktop-Navigation noch ausstehend.
