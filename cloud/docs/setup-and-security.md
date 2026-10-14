# Supabase-Einrichtung – bewusst noch nicht ausgeführt

**Status:** Nur Repository-Dateien. Keine bestehende Supabase-Instanz verbunden, keine SQL-Migration ausgeführt, kein Cloud-Nutzer freigeschaltet, keine Windows-App umgestellt.

## Vor dem späteren Aktivieren

1. Ein **neues, getrenntes Supabase-Projekt** erstellen (vorerst Free für Tests). Produktive Lagerdaten keinesfalls in eine noch ungetestete Cloud kopieren.
2. In Supabase Auth E-Mail-Anmeldung aktivieren, Selbstregistrierung deaktivieren (neue Benutzer nur gezielt im Dashboard einladen/anlegen). Zwei-Faktor-Authentifizierung aktivieren, sobald verfügbar/konfiguriert.
3. Genau **ein** persönliches Benutzerkonto in `Authentication > Users` anlegen und dessen Auth-User-UUID notieren. Auth-UUID ist keine geheime Information, aber keine Kennwörter oder Tokens teilen.
4. Die SQL-Datei `supabase/migrations/20261014000100_phase1_schema.sql` in einem isolierten Testprojekt prüfen und nach Freigabe dort anwenden (Supabase CLI Migration oder SQL Editor). Dabei werden **nur neue Cloud-Tabellen** erstellt.
5. **Erst nach Migration** einmalig als Datenbankadministrator im SQL Editor ausführen (UUID ersetzen):

   ```sql
   insert into trummcards_private.owner_guard (user_id)
   values ('DEINE-AUTH-USER-UUID'::uuid);
   ```

   Der Tabellen-Primärschlüssel erlaubt nur **einen** freigeschalteten Eigentümer. Weitere registrierte Konten können nicht auf TrummCards zugreifen. Kein „erstes Konto gewinnt“-Verfahren.
6. `trummcards_private` **NICHT** in Supabase API `Exposed schemas` aufnehmen.
7. Mit dem Smoke-Test nur im Testprojekt prüfen: `supabase/tests/phase1_smoke.sql`. Er erzeugt Testdaten und rollt sie am Ende vollständig zurück. Voraussetzung ist die freigeschaltete Auth-User-UUID.
8. In der späteren PWA/Windows-Version nur Projekt-URL + **publishable/anon key** im Client speichern. **Niemals `service_role`, `secret`, Passwort der Datenbank oder Management-Token** in Electron, HTML, GitHub oder an uns weitergeben.

## Datenschutz und Datensicherheit

- Alle `tc_*`-Tabellen haben RLS und `owner_id`; für `anon` gibt es keine Tabellenrechte und keine RPC-Ausführung. Ein weiterer authentifizierter User scheitert zusätzlich an der `owner_guard`-Freigabe.
- `trummcards_private` enthält Besitzer- und Importverwaltung und ist nicht öffentlich erreichbar. Privilegierte FIFO-Funktionen liegen ebenfalls dort; öffentliche RPC-Wrapper rufen sie lediglich auf.
- Serverseitige RPCs sperren die Produktzeile per `FOR UPDATE`. Dadurch werden konkurrierende Verkäufe desselben Produkts nacheinander gebucht, mit dem Ergebnis „Nicht genügend Bestand“ statt negativem Lagerbestand.
- Idempotente `request_key`-UUIDs verhindern Doppelbuchungen bei Netzwerkwiederholungen; Client muss für den Retry **dieselbe** UUID verwenden.
- Alle Geldbeträge `NUMERIC`, kein Gleitkomma für Datenbank-Berechnungen. COGS für alte Verkäufe bleibt historisch erhalten.
- Bilder liegen in einem **privaten** Storage-Bucket, nur im Pfad des freigeschalteten Besitzers und über Auth-Tokens/zeitlich begrenzte Links abrufbar.
- Keine Cloud-Datenbank ist eine vollständige Backupstrategie. Zusätzlich verschlüsselte Offsite-Sicherungen von Datenbank **und Bildern**, Wiederherstellungstests und Löschkonzept vor produktiver Inbetriebnahme.
- Offline-Buchungen/Mehrgeräte-Synchronisierung sind **noch nicht** implementiert; erst spätere Phasen. Im derzeitigen Windows-Programm bleiben die Daten lokal.

## Änderungsregeln

- Änderungen in `feature/cloud-phase-1-supabase` und Entwurfs-PR; **nicht in main mergen**, nicht Tag erstellen, keine Release erzeugen.
- Cloud-Migrationsdateien sind in Phase 1 **nicht ausführbar durch einen CI-Workflow**, sondern nur nach expliziter Freigabe manuell zu starten.
- Vor dem produktiven Umstieg: DB-Funktionstests auf echtem PostgreSQL/Supabase; Auth/RLS-Tests (fremder Benutzer, `anon`, `service_role` nur Server), konkurrierende Verkäufe, Lösch-, Bild- und Wiederherstellungsfälle.

Quellen zur Umsetzung: Supabase RLS, Database Functions und Storage Access Control (siehe Dokumentationslinks im `cloud/README.md`).
