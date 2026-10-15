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
