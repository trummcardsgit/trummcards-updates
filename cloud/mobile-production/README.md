# TrummCards Cloud – mobile Production Release Candidate 0.9.0

**Noch nicht veröffentlicht.** Dieselbe Cloud-Datenbank wie die Windows-Produktionsvorschau, aber **niemals** das bisherige TEST-Projekt: `hgdexyvtgfffcasfpjyu`.

- Eigener öffentlicher Supabase Publishable Key, Projekt-Ref streng überprüft.
- Eigene LocalStorage-Schlüssel: `trummcards-mobile-production-session-v1`, `trummcards-mobile-production-pending-v1`. Kein Zugriff auf TEST-Session.
- Eigener Service-Worker-Cache `trummcards-mobile-production-shell-v1`; Activation löscht **nur eigene Vorgängerversionen**, nie TEST-Caches.
- Alle Schreibfunktionen sind serverseitig gesichert (RLS) und zusätzlich clientseitig mit `WRITES_ENABLED=false` für die Vorabversion blockiert.
- Login, Synchronisierung und private Bilder bleiben zum Testen lesbar. Passwortwiederherstellung verwendet dasselbe **PROD**-Auth-Projekt und baut Redirect-URL aus dem späteren endgültigen PWA-Standort.
- Die spätere Produktiv-PWA braucht **einen endgültigen HTTPS-Pfad bzw. besser eine eigene kostenlose Pages-Domain/ein separates Pages-Repo**, sodass Test und Produktion dauerhaft getrennt bleiben. Ein eigener Origin reduziert Risiken durch gemeinsam genutzten Webspeicher.
- Im Supabase-Auth-Dashboard **nur der neuen PROD-Umgebung** die finalen Site- und Passwort-Redirect-URLs hinterlegen; TEST-Redirects unverändert lassen. Passwort-E-Mail-Zustellung und Wiederherstellung auf iPhone/Android prüfen.
- GitHub Actions prüft nur offline und lädt **nichts** nach GitHub Pages. Kein Deployment vor Backups, Sicherheitstests, eigens freigegebenem Produktivpfad und ausdrücklichem GO-LIVE.

Zum lokalen Test:
```bash
node --check cloud/mobile-production/web/app.js
node --test cloud/mobile-production/tests/production.test.mjs
```

**Wichtig:** Kein Cache, kein Auth-Token, keine Bilder oder persönlichen Daten in GitHub hochladen.
