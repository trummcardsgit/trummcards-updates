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
