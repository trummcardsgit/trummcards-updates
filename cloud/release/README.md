# TrummCards Cloud – Freigabevorbereitung (OHNE Produktivdeployment)

**Entscheidung vom 16.10.2026:** Mit **leeren Echtdaten** in einem **neuen, separaten Supabase-Projekt** beginnen. Alte 1.6.1-Daten und TEST-Daten werden **nicht** importiert. Das bestehende Supabase-Projekt `TEST` (Ref `cpycfxolqpidfjbhhsmr`) sowie die Windows-Produktivversion 1.6.1 und die TEST-PWA bleiben unberührt.

**Status (16.10.2026):** Supabase-Produktivprojekt **TrummCards Production** (Ref `hgdexyvtgfffcasfpjyu`) im **Free-Plan (0 €/Monat Projektkosten)** in `eu-west-1` erstellt und Grundschema mit drei Migrationen eingerichtet. **Alle 7 App-Tabellen und der private Bildspeicher enthalten 0 Datensätze**; RLS aktiv, Bucket nicht öffentlich. **Ein Auth-Benutzer ist bestätigt und im privaten Owner-Guard freigeschaltet** (Stand: 16.10.2026). Supabase Security Advisors meldet eine Warnung wegen deaktiviertem Schutz vor kompromittierten Passwörtern; Prüfung vor Release erforderlich. Noch keine Echtbuchungen, keine Windows-/PWA-Umschaltung und kein GitHub-Release. **GO-LIVE weiterhin gesperrt.**

## 1. Neue, strikt getrennte Umgebung

**Bereits erledigt:** Projekt `hgdexyvtgfffcasfpjyu` (nicht TEST) ist ACTIVE_HEALTHY. Migrationen `phase1_schema`, `cloud_session_probe`, `article_images` erfolgreich; Verifikation am 16.10.2026: 7 Tabellen und Bildspeicher = 0, Owner-Guard = 1, Auth-Benutzer = 1 (E-Mail bestätigt, Passwort gesetzt). RLS für alle 7 Tabellen aktiviert und privater Bucket. Offen: echtes Client-Login / RLS-Ablehnung fremder Accounts prüfen; Security-Advisor-Warnung zu Leaked Password Protection bearbeiten. Vor dem Go-Live erneut prüfen, da die Zahlen Momentaufnahmen sind.

**Free-Plan-Grenzen:** $0/Monat laut Supabase-Projektkostenabfrage, maximal 2 aktive Free-Projekte, 500 MB Datenbank und 1 GB Storage. Automatische Wiederherstellungs-Backups sind im Free-Plan **nicht inklusive**; Database-Dump und separate Sicherung des privaten Storage sind erforderlich. Projekte können nach 7 Tagen geringer Aktivität pausieren. Keine kostenpflichtigen Add-ons ohne gesonderte Zustimmung aktivieren.


1. Der Nutzer bestätigt zuerst die Ziel-**Supabase-Organisation** sowie mögliche Projektkosten. Bei mehreren Organisationen nie automatisch eine wählen. Vorgesehener Projektname: **TrummCards Production**, Region **eu-west-1 (Irland)** wie TEST.
2. **Neues Projekt** anlegen, keine Branch von TEST, kein Backup-/Dump-Klon. Projekt-ID und URL getrennt dokumentieren; nach Erstellung prüfen, dass die neue Ref **ungleich** `cpycfxolqpidfjbhhsmr` ist.
3. Vorhandene, geprüfte SQL-Dateien der Reihe nach **nur im NEUEN Projekt** ausführen:
   - `cloud/supabase/migrations/20261014000100_phase1_schema.sql`
   - `cloud/supabase/migrations/20261015000200_cloud_test_session.sql` (Funktionsname `tc_is_authorized` ist auch für die Produktion geeignet; Dateiname historisch)
   - `cloud/supabase/migrations/20261015000300_product_images.sql`
4. **Erledigt (16.10.2026):** Neue persönliche Anmeldung mit bestätigter E-Mail serverseitig als alleinigen Owner in `trummcards_private.owner_guard` eingetragen. Keine TEST-Konto/-UUID übernommen. Noch ausstehend: echter Login-Test mit PROD-App. Öffentliche Registrierung nur bei explizitem Produktbedarf; RLS und Owner-Guard bleiben aktiv.
5. **RLS/Authentifizierung** verifizieren: nicht angemeldet oder fremder Nutzer darf keine Artikel, Bilder, Chargen oder RPC-Buchungen lesen/ändern. Nur erlaubte Nutzer dürfen Daten sehen. Privater Storage-Bucket und geschützte `products/<UUID>`-Bildpfade prüfen.
6. **Auth Site URL / Redirect URLs** ausschließlich auf die neue Produktiv-PWA setzen. Passwort-Reset mit funktionierendem SMTP/Versandkontingent prüfen. Auf TEST keine Redirect-Änderungen vornehmen.
7. Mit `cloud/release/sql/verify-empty.sql` alle Buchungstabellen und Bildobjekte auf **0 Datensätze** prüfen. Das erwartete Ergebnis ist ausdrücklich **nicht** eine Datenübernahme. Ein Auth-Benutzer und ein Owner-Guard-Eintrag dürfen bereits vorhanden sein.

## 2. Getrennte Apps und Veröffentlichung

- **Windows-Cloud-Produktivapp** erhält eine neue, eindeutige `appId`, Installations- und Benutzerprofil-Identität. Keine vorhandene 1.6.1-Installation ersetzen, solange Freigabe fehlt. Neue Projekt-URL und der **öffentliche Publishable Key** werden erst nach bestätigter Prod-Ref in den Client eingebaut; das Programm darf **nie** stillschweigend auf TEST zurückfallen.
- Windows `1.6.1` verwendet den bisherigen GitHub-Releases-/`latest.yml`-Kanal. **Vor einer Freigabe ausdrücklich separate Updatekanäle** festlegen, damit ein TEST-/Cloud-Build nicht ungefragt auf 1.6.1-PCs installiert wird. Die Cloud-Produktivapp benötigt Updater-Prüfung und Rollback.
- **Produktive PWA** braucht einen eigenen, stabilen HTTPS-Ursprung (z. B. separates GitHub-Pages-Repository oder eine eigene Domain) und **eigenen Service-Worker-Scope**. Bestehende TEST-URL `https://trummcardsgit.github.io/trummcards-updates/` bleibt TEST. PROD darf sie weder überschreiben noch auf TEST-Ref zugreifen.
- Projekt-Ref, Publishable Key und Auth-Redirect müssen übereinstimmen. **Keine** `sb_secret_...`, Service-Role-, Datenbank-, GitHub-, SMTP- oder Benutzer-Passwörter ins Frontend oder GitHub committen.
- Kein automatisches Release / Deployment in diesem Vorbereitungs-Branch. Produktives Ausrollen erfordert separate ausdrückliche Freigabe.

## 3. Noch vor echtem Lagerbetrieb zu entscheiden / zu prüfen

- **Funktionsumfang gegenüber 1.6.1:** Cloud TEST kann Artikel, Einkaufs-Chargen, Verkäufe, Storno, Bilder und FIFO; die alte Version bietet zusätzlich **Bearbeiten bestehender Käufe/Verkäufe**, CSV-Import und JSON-Export. Feature-Parität mit dem Nutzer abstimmen oder fehlende Funktionen vorher implementieren. Ein Test in TEST ist kein Beweis für die vollständige Funktionsabdeckung.
- **Backups/Wiederherstellung:** Eigene nachvollziehbare Sicherung und erfolgreich getestete Rücksicherung von **PostgreSQL + privatem Storage**. Supabase-Plan/Backupverfügbarkeit, Limits, Aufbewahrung und Kosten vorab klären. Bloße Datenbank-Backups enthalten nicht automatisch alle Bilder.
- **Geld und FIFO:** Kauf von 2 Stück, Verkauf von 1 Stück, Storno, Nettoerlös, Versand-/Plattformgebühren, Rundung, parallele Verkäufe und idempotente Wiederholungen gegen TEST testen.
- **Endgeräte:** Windows und iPhone/Android mit separaten Testkonten/RLS, Login, Passwort-Reset, Bildaufnahme, Bilder-Vorschau, Reconnect, Abmeldung, Offline-Fehler.
- **Installationssicherheit:** Windows-Setup/Signierung und SmartScreen-Verhalten, GitHub-Release-Pfad, Updateknopf, Versionsanzeige, PWA-Service-Worker-Caching, kontrolliertes Update/Rollback.
- **Sicherheit:** Supabase Advisors, Auth-Ratenlimits, Login-Sicherheit, minimales Auth-Rechtekonzept, Recovery-Prozess, TLS und Rechteaudit.
- **Schlussabgleich:** `verify-empty.sql` ergibt nach Abschluss der Vorabtests überall 0 Echtartikel/Verkäufe/Uploads. Keine Testtransaktion bleibt in PROD zurück.

## 4. Go / No-Go

- Die Offline-Vorprüfung `node cloud/release/check-readiness.mjs cloud/release/production.example.json` schlägt absichtlich fehl: alle produktiven Werte fehlen und keine Prüfungen sind freigegeben.
- Für reale Vorbereitung ein **lokales, nicht eingechecktes** `cloud/release/production.private.json` mit Projekt-Ref, Produktiv-Webadresse und verifizierten Checklistenwerten erzeugen. **Keine Passwörter, Token oder Keys** in diese Datei aufnehmen.
- Bei jeder offenen Prüfung: **NO-GO**. Das Skript ist ein Plausibilitäts- und Freigabe-Gate, **kein Ersatz für echte Datenbank-, Browser- oder Restore-Tests**.
- Nur nach ausdrücklicher Freigabe: Produktionsprojekt starten, Datenbank initialisieren, finalen Windows-/PWA-Code auf neue Ref umstellen und releasefähige Artefakte bauen. Vorher kein `main`-Merge und kein Release-Tag.

## 5. Technische Checks

```bash
node --test cloud/release/check-readiness.test.mjs
node cloud/release/check-readiness.mjs cloud/release/production.example.json
```

Der zweite Befehl muss mit `NO-GO` enden, bis alle **unabhängig nachgewiesenen** Vorbedingungen erfüllt sind. Dies ist beabsichtigt.

**Produktivprojekt noch nicht angelegt. TEST bleibt unverändert.**
