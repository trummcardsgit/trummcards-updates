# TrummCards Cloud – Freigabevorbereitung (OHNE Produktivdeployment)

**Entscheidung vom 16.10.2026:** Mit **leeren Echtdaten** in einem **neuen, separaten Supabase-Projekt** beginnen. Alte 1.6.1-Daten und TEST-Daten werden **nicht** importiert. Das bestehende Supabase-Projekt `TEST` (Ref `cpycfxolqpidfjbhhsmr`) sowie die Windows-Produktivversion 1.6.1 und die TEST-PWA bleiben unberührt.

**Status:** Ausschließlich Release-Vorbereitung. Noch kein neues Supabase-Projekt, keine Auth-User, kein SQL auf produktiv, keine Echtbuchungen, kein GitHub-Release, keine Umschaltung von Windows oder PWA. Nicht mit einer Freigabe zur Produktion verwechseln.

## 1. Neue, strikt getrennte Umgebung

1. Der Nutzer bestätigt zuerst die Ziel-**Supabase-Organisation** sowie mögliche Projektkosten. Bei mehreren Organisationen nie automatisch eine wählen. Vorgesehener Projektname: **TrummCards Production**, Region **eu-west-1 (Irland)** wie TEST.
2. **Neues Projekt** anlegen, keine Branch von TEST, kein Backup-/Dump-Klon. Projekt-ID und URL getrennt dokumentieren; nach Erstellung prüfen, dass die neue Ref **ungleich** `cpycfxolqpidfjbhhsmr` ist.
3. Vorhandene, geprüfte SQL-Dateien der Reihe nach **nur im NEUEN Projekt** ausführen:
   - `cloud/supabase/migrations/20261014000100_phase1_schema.sql`
   - `cloud/supabase/migrations/20261015000200_cloud_test_session.sql` (Funktionsname `tc_is_authorized` ist auch für die Produktion geeignet; Dateiname historisch)
   - `cloud/supabase/migrations/20261015000300_product_images.sql`
4. In **Authentication** eine neue persönliche Anmeldung einrichten und deren **neue** UUID serverseitig genau einmal in `trummcards_private.owner_guard` eintragen. TEST-Konto/-UUID nicht wiederverwenden. Öffentliche Registrierung nur bei explizitem Produktbedarf; RLS und Owner-Guard bleiben aktiv.
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
