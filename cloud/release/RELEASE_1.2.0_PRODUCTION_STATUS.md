# TrummCards Cloud 1.2 – Production upgrade release journal
Date: 2026-10-19

## Requested upgrade
Upgrade the existing Cloud 1.1 PRODUCTION Windows and PWA to the same completed Cloud 1.2 TEST feature set. **Keep the current Production database and all live records; import no TEST records.** Maintain the original Windows appId, userData folder, application shortcut and generic auto-update feed.

## Data before upgrade
A read-only query of Supabase Production (project hgdexyvtgfffcasfpjyu) showed 11 products, 11 purchase lots, 1 sale, 10 product images, no new cash entries/shipments/fee profiles, and existing backup snapshot format V2. No Production SQL changes were requested or performed.

## Release assets
- Source: feature/cloud-1.2-carddex-vinted (current TEST 1.2.0-test.9)
- Release branch: release/cloud-1.2.0-production-upgrade
- Staging: cloud/release/prepare-cloud-12-production.mjs (no remote database or deployment operations)
- Rehearsal (NO DEPLOY): https://github.com/trummcardsgit/trummcards-updates/actions/runs/39284756479
- Production deployment workflow: https://github.com/trummcardsgit/trummcards-updates/actions/runs/39284977716
- Trigger: cloud/release/GO_LIVE_120.txt, explicitly authorized by user
- New Windows version 1.2.0, same appId at.trummcards.cloudproduction and same feed https://trummcardsgit.github.io/trummcards-updates/cloud-updates/
- PWA under production/ and caching shell trummcards-mobile-production-shell-v120
- No scanner (OCR removed); preserve KartenDex, printed-card-number search, fallback English images, directly embedded approved 'Kein Bild' placeholder, Cardmarket variant-aware pricing and Vinted manual listing templates.

## Mandatory publication gates
1. The exact Cloud 1.2 source must match a successful full isolated TEST PWA + Windows Actions run. Documentation-only changes after that run may be allowed, no changed executable sources.
2. Existing Production RLS read-only probe and feature tests must pass.
3. Generate a **fresh, encrypted V2 Production backup** incl. private image bytes; verify and actually restore to temporary PostgreSQL 17.
4. Build Windows 1.2.0 NSIS installer, blockmap and latest.yml, validate updater metadata.
5. Confirm current updater feed is 1.1.0, retain 1.0/1.1 packages. Publish ONLY production/ and cloud-updates/, never test-12/ or TEST database.
6. Confirm GitHub Pages publish + live latest.yml and recheck Production counts.

## Release status at initiation
The final 1.2 TEST and release rehearsal runs were still queued by GitHub Actions. The deployment run was started but no success may be asserted until **all jobs** finish successfully and updated live files are verified. At initiation cloud-updates/latest.yml was still version 1.1.0. If validation fails the workflow must not publish.

## End-user checks after successful deployment
Open existing installed Windows Cloud and use automatic updates to 1.2.0; refresh PWA and verify login, pictures, card lookup, manual Vinted listing and existing stock/sales. Never overwrite original inventory to test new features.
