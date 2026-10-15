# TrummCards Cloud TEST (Windows 0.1.0)

> Separate prototype for the Supabase project TEST; not part of production v1.6.1.

## What you can do

- Sign in with the **single already-whitelisted account** from Supabase Authentication > Users.
- Add and edit product descriptions with unique SKUs.
- Add purchases to FIFO lots. Unit and total price calculate in both directions.
- Sell items with server-side FIFO cost and concurrent overselling protection.
- See purchase/sale history; cancel a sale to restore stock.
- Upload JPG, PNG or WebP card photos (max 10 MB) to private Storage.
- Refresh automatically every 12 seconds; also on window focus or clicking refresh.

## Setup (Windows installer from GitHub Actions)

1. Open the GitHub draft pull request for this test branch and go to its latest green `TrummCards Cloud TEST - Windows Preview (NO RELEASE)` check.
2. Open the corresponding GitHub Actions run and download the `TrummCards-Cloud-TEST-Windows-0.1.0` artifact; unzip it, then run the EXE.
3. The app is labeled **TEST** and installs separately, with its own Electron app ID and user-data directory. Do not uninstall your existing TrummCards inventory app.
4. In your Supabase project TEST, open **Project Settings > API Keys**; copy ONLY the `sb_publishable_...` key. The app pre-fills the TEST project's URL.
5. Enter the public key. Then log in with the email/password of your already-whitelisted Supabase Authentication user. Do NOT copy a password or secret key into the GitHub repo or ChatGPT.
6. Add a dummy product, book 2 cards with total price 200 EUR, sell one for 140 EUR, and verify available stock 1 and FIFO COGS 100 EUR.
7. Open another installed instance on a different computer and connect to the same TEST project; the inventory updates automatically (within ~12 seconds while visible).

A first login requires a password-based Auth user. If your Dashboard-created user has no usable password, configure it in Supabase Authentication, following the Dashboard flow. Email confirmations must be completed when required by your Auth settings.

## Local developer build

```bash
cd cloud/desktop-test
npm install
npm run check
npm start
npm run dist
```

`npm run dist` creates an unsigned NSIS installer on Windows; GitHub Actions builds the Windows version using `windows-latest`. Windows Smart App Control may block unsigned installers. Never weaken OS protection to force installation.

## Security / boundaries

- Supabase URL is fixed to the user's isolated TEST project. Only the public publishable key is accepted. No service-role key, database password or management token is needed.
- Publishable project URL/key are kept locally in the TEST app profile, not committed in source. Auth session stored in TEST app's separate local profile; password is not persisted by this app.
- Every database write is authenticated and relies on RLS; FIFO stock changes only through SQL RPCs in the previously deployed phase-1 database.
- `tc_is_authorized()` read-only RPC checks the one-user allowlist before UI is shown. The SQL for this RPC is in `../supabase/migrations/20261015000200_cloud_test_session.sql`.
- Nothing reads the production app's localStorage, IndexedDB, folders or backups; no production updater.
- No auto import of real inventories. Create test articles only. There is no offline booking in this prototype.
- Background sync is polling every 12 sec (not push-based real-time yet); it also refreshes on window focus. In-flight operation UUIDs are held in TEST-only localStorage for safe retries.
- Views fetch up to 1000 rows each; pagination and a reconciliation/import wizard come in a future phase.

## Verification

`npm run check` covers price parsing, reciprocal purchase totals, FIFO spanning multiple lots, cent rounding, profit, and duplicate-SKU error presentation. The isolated Supabase project has also passed the SQL rollback smoke test (FIFO, sale, oversell prevention, cancellation and foreign-user RLS).

The GitHub workflow builds an installer artifact **without publishing a release, bumping the production app version or touching main**.

## TEST v0.2.0: Artikelbilder in Lager & Artikelanlage

Im Windows Cloud-TEST-Formular koennen beim Anlegen/Bearbeiten Artikelbilder direkt hochgeladen werden; bei verfuegbarer Kamera auch mit Aufnahme. Das Bild wird in dem bestehenden privaten Supabase Storage Bucket unter `<user>/products/<product>/<uuid>` abgelegt und die Metadaten in `tc_product_images` gespeichert. Ohne Lagerbestand bleibt das Bild dem Produkt zugeordnet. Alte Einkauflos-Bilder bleiben erhalten und dienen bei Bedarf als Fallback. Kleine Lager-Vorschaubilder werden nur bei Bedarf ueber temporaere signierte URLs geladen. Ein Klick zeigt die Grossansicht. Der Windows-Test-Installer verwendet wieder das originale TrummCards-Logo und die urspruengliche Anwendung laeuft unveraendert auf v1.6.1.

Bei Upload-Fehlern bleibt der erstellte Artikel erhalten: zum Wiederholen den Artikel bearbeiten statt neu anlegen. Die Test-App verfuegt weiterhin ueber keinen Produktiv-Autoupdater und wird nur als GitHub Actions Artefakt gebaut.
