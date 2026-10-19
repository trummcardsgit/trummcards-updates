# TrummCards Cloud 1.1.0 – Production release preflight

Status: Vorbereitung am 19.10.2026. NO DEPLOY; no changes to Production or existing live data.

## Verified
- Cloud 1.1 Release Candidate workflow run 39239189419: five successful jobs, including FIFO/RLS, encrypted backup restore, and Windows installer rehearsal.
- TEST build workflow run 39239183127 successful for Windows and PWA. User manually tested catalog pictures and multi-page Pokémon card name searches.
- Last scheduled encrypted PROD backup run 39191213679 on 19 October successful; unexpired ~4.94 MB artifact and temporary PostgreSQL 17 restore completed.
- Production before update: 8 products, 8 purchase lots, 1 sale, 8 private card images. Version 1.1 schema absent.

## Blocking safety tasks before production update
- [ ] Create an actual 1.1 update workflow. Existing production-release.yml is hardcoded to initial Cloud 1.0 and MUST NOT be rerun to update.
- [ ] Keep original production Electron appId, app name, local userData directory and cloud-updates feed. Build 1.1.0 installer + latest.yml + blockmap with automatic updates on; no TEST endpoints.
- [ ] Prepare versioned PWA production assets including catalog/sets/market/fees/shipping/finance/cash modules, revise service worker to precache all assets. Do not overwrite TEST or test-11.
- [ ] Deploy v1+v2-compatible encrypted backup validator and restore scripts to main BEFORE switching the production database backup_snapshot function to v2. Current main only accepts v1; v2-first would interrupt scheduled backups.
- [ ] Immediately before PROD migration, run and verify NEW encrypted PROD backup including image bytes with temporary PostgreSQL restoration.
- [ ] Apply additive metadata, external catalog image URL, sale shipments, fee profiles, cash entries migrations to PROD; verify old product/purchase/sale/image counts unchanged. Only AFTER these tables exist, switch snapshot function to v2.
- [ ] Immediately after snapshot v2 switch, run NEW encrypted v2 backup and successfully test local restoration incl. image bytes, cash entries, shipments and fee profiles.
- [ ] Validate Windows 1.1 automatic update from installed 1.0 and PWA live cache refresh, same production account and old inventory/data, signed-in owner RLS.
- [ ] Keep Cloud 1.0 packages available for application-only rollback, keep database migrations additive (never delete FIFO business records).
- [ ] Request user manual TEST checks of shipping, finance and cash export features that have not yet been reported as tested.
- [ ] Confirm catalog data image and price source usage/attribution terms and licensing for production use.
- [ ] Obtain explicit final user go-live confirmation before any production migration or release.

Release evidence: https://github.com/trummcardsgit/trummcards-updates/actions/runs/39239189419
Test evidence: https://github.com/trummcardsgit/trummcards-updates/actions/runs/39239183127
Backup evidence: https://github.com/trummcardsgit/trummcards-updates/actions/runs/39191213679

Do NOT mark 1.1.0 deployed while any blocking item remains incomplete.
