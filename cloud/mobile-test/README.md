# TrummCards Mobile Cloud TEST (iPhone / Android)

**Live PWA (HTML hosting):** https://trummcardsgit.github.io/trummcards-updates/

**Database:** isolated Supabase project TEST, project ref `cpycfxolqpidfjbhhsmr`.
**Source branch:** `feature/cloud-phase-1-supabase`.
**Published static branch:** `gh-pages` (repository root).
**Existing Windows version 1.6.1:** unchanged, no release or auto-update.

## Why we moved from Supabase Edge HTML hosting

Supabase's normal `*.supabase.co/functions/v1/...` endpoint does not serve HTML pages as HTML: its gateway rewrites HTML GET responses to `text/plain`. On iPhone Safari the old URL displayed HTML markup. This is documented in Supabase's Edge Function development tips and limits.

The mobile HTML, JavaScript, stylesheet, icons and service worker are now published as a static GitHub Pages site. The existing Supabase Edge Function `trummcards-mobile-test` now returns a 302 redirect to that site for GET requests. Do not deploy the original HTML-bundling Edge Function again.

## Security and sync

- Public website code is accessible to anyone, but business data require Supabase Authentication with the **single whitelisted account** and PostgreSQL RLS.
- The JavaScript bundles the Supabase **public publishable key** (not a secret) to work on a static host. Never use a `service_role`, `sb_secret_...`, JWT access token or personal password in source.
- Database, FIFO purchase/sales RPCs, sale voids and private image storage remain in Supabase TEST.
- Polling about every 12 seconds while the page is visible, plus on returning to the app. Online required for booking; the service worker caches only the static app shell.
- This is a development/test app, not a production release. Do not import existing Windows data yet.
- The site's source branch is public. Do not commit backups, inventory exports or credentials.

## Running it on mobile

1. Open https://trummcardsgit.github.io/trummcards-updates/ in Safari or Chrome.
2. Sign in using the same Supabase TEST user as the Windows Cloud TEST app.
3. Look for an existing article, book a small test purchase or sale, then check the Windows Cloud TEST app.
4. iPhone Safari: Share > Add to Home Screen. Android Chrome: menu > Install App / Add to Home Screen.

## Publishing updates

The deployable assets come from `cloud/mobile-test/web/`: `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, `icon.svg` and icon PNGs. Publish **only** those files to the repository root of `gh-pages`; preserve the public-key configuration in `app.js`. GitHub Pages publishes every update to that branch. Do not merge or publish the desktop production app.

The old Supabase test URL redirects using `edge/index.ts` generated with `node cloud/mobile-test/edge/build.mjs`.

For CI checks:
```sh
node cloud/mobile-test/edge/build.mjs
node --test cloud/mobile-test/tests/test-mobile.mjs
node --experimental-strip-types --test cloud/mobile-test/tests/test-routing.mjs
```

The smoke tests are structural and verify redirect handler behavior. A real browser login and device-to-device sync must still be confirmed by the user.

## Passwort vergessen / Recovery

Eine Supabase-Auth-Recovery-Mail enthält einen einmaligen Login-Token. Unter der normalen Edge-Functions-Domain können keine HTML-Seiten für die Passwortänderung ausgeliefert werden. Stattdessen gibt es auf GitHub Pages die separate `reset-password.html` und `reset-password.js`.

1. Supabase Dashboard **Authentication > URL Configuration** öffnen.
2. **Site URL** auf `https://trummcardsgit.github.io/trummcards-updates/` stellen. Die Site URL wird als Default für Dashboard-Reset-Mails verwendet.
3. In **Redirect URLs** zusätzlich `https://trummcardsgit.github.io/trummcards-updates/reset-password.html` eintragen.
4. Unter **Authentication > Users** dem vorhandenen Konto **Send password recovery** senden – neu anfordern, bisherige Mails ggf. ungültig.
5. Mail-Link anklicken: Falls die Mail zur Root Site URL umleitet, erkennt `app.js` das Fragment `type=recovery` und leitet mit Token zur Reset-Seite weiter. Die Reset-Seite entfernt URL-Tokens sofort aus dem Browserverlauf, prüft Auth und erlaubt die Passwortänderung über `PUT /auth/v1/user`.
6. Alternativ auf der mobilen Anmeldeseite **Passwort vergessen?** öffnen; der dortige Flow sendet die Recovery-Mail mit `redirect_to=/reset-password.html`.
7. Nach Passwortänderung neu anmelden. **Benutzer niemals löschen** und Passwörter / Reset-Links niemals in Issues, Chat oder GitHub teilen.

**Sicherheit:** Kein Service-Role-Key, keine Passwortänderung durch die Assistenz; der Token wird nur im flüchtigen Browser-Speicher gehalten. Keine Lagerdaten werden bei dieser Funktion geändert. Neue Tests in `tests/test-recovery.mjs` prüfen die statischen Schutzmechanismen; der echte E-Mail-Ablauf muss mit dem Benutzer bestätigt werden.

## TEST v0.2.0: Artikelbilder direkt bei Artikelanlage

Die mobile PWA legt neue Artikel wie die Windows-Version an. Optional wird im selben Formular ein Kamerafoto aufgenommen oder ein vorhandenes Bild gewaehlt. Der Artikel wird zuerst erstellt, anschliessend wird das Bild privat in Supabase gespeichert und in `public.tc_product_images` mit `product_id` verknuepft. Bei Uploadproblemen bleibt der Artikel erhalten und kann nachbearbeitet werden. Bereits vorhandene Bilder aus `tc_lot_images` werden als Vorschaubild angezeigt, wenn noch kein Artikelbild vorliegt.

Lagerlisten zeigen kleine Bilder und bieten eine Grossansicht. Die Verkaufs-Stueckzahl nutzt einen sichtbar breiteren Stepper mit +/- fuer kleine Displays. Logo im Header stammt aus dem bisherigen `assets/trummcards-logo.webp` (dem vom Benutzer gelieferten TrummCards-Logo). Die PWA wird unabhaengig von Windows im Branch `gh-pages` veroeffentlicht; SW-Cache Version v3.

`tc_product_images` wird durch `cloud/supabase/migrations/20261015000300_product_images.sql` aktiviert (RLS, FK und owner guard). Bitte keine geheimen Schluessel veroeffentlichen. Die Nutzer muessen Foto-/Kamerazugriff genehmigen.

## Mobile UI v0.3 – Fotos in der Lagerliste und Buchungsformulare

- Lager: Die ersten zwölf Artikelbilder werden sofort geladen. Für die weiteren Artikel beobachtet die PWA die **sichtbaren Bildcontainer** und nicht das zunächst unsichtbare IMG-Element. Dadurch erscheint das Miniaturbild ohne Klick auf den Platzhalter. Die Bilddateien bleiben privat bei Supabase und werden mit dem angemeldeten JWT abgerufen; Antippen öffnet weiterhin das große Bild.
- Einkauf und Verkauf: Auf schmalen Smartphones werden die nebeneinanderliegenden Datum-/Stückzahl-/Geldfelder einspaltig dargestellt und nicht über die Formularbreite gedrückt. Die Feldhöhe und Beschriftungen sind einheitlich; Datum verwendet einen nativen mobilen Datumspicker.
- Die sichere obere Einrückung für iPhones im Standalone-/PWA-Modus berücksichtigt jetzt `safe-area-inset-top`.
- Aktualisierter Service-Worker-Cache `trummcards-mobile-test-shell-v4`, weiterhin ohne Caching von privaten API- oder Bilddaten.
- Validierung: `node --test cloud/mobile-test/tests/test-thumbnails-and-forms.mjs` plus vorhandene PWA-Tests.
- Veröffentlichung **ausschließlich** in TEST auf `gh-pages`; produktive Windows-Version und Datenbankschema unverändert.

## Mobile TEST v0.4 – kompakte Formulare (iPhone)

Die Buchungsformulare wurden nicht nur durch neue Abstände gestylt, sondern semantisch in drei Fieldsets umgebaut: Artikel & Menge, Preis/Kosten, weitere Angaben. Alle Form-Feldnamen und Eingabelogiken sind unverändert (inklusive FIFO, Preisverknüpfung und Verkauf-Stückzahlbuttons). Geldfelder haben rechtsbündige Ziffern und ein sichtbares €-Suffix außerhalb des editierbaren Werts. Date-Inputs bleiben native Datumspicker.

Ab 680px Fensterbreite und kleiner nutzen die beiden Buchungsformulare konsequent eine Spalte (keine kollidierenden Felder und abgeschnittenen Beschriftungen). Eingabefelder sind bei Mobilgeräten ca. 50px hoch, mindestens 16px Schrift zur Vermeidung des iOS Safari-Zooms. Labels sind ausdrücklich mit den Feldern verbunden, relevante Felder sind Pflichtfelder.

Für PWA-Aktualisierung referenziert `index.html` die CSS- und JS-Dateien unter `?v=0.4.0`; der Service Worker hat den eigenständigen Cache `trummcards-mobile-test-shell-v5` und präcacht exakt diese URLs. Offline-Fallback ignoriert Query-Parameter nur bei öffentlichen Shell-Dateien, nicht bei Auth- oder Business-Requests. Die sichtbaren Formularüberschriften tragen `v0.4` zur Bestätigung des Updates.

Tests: `test-form-layout-v04.mjs` und aktualisierte `test-thumbnails-and-forms.mjs`. Nach Veröffentlichung auf GitHub Pages bitte in der echten iPhone-PWA **Einkauf und Verkauf** optisch prüfen, insbesondere Native-Date-Darstellung. Kein produktiver Windows-Release, keine Änderung an Benutzerkonten oder Datenbank.
