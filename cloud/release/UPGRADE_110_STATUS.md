# TrummCards Cloud 1.1 production upgrade

Release source: feature/cloud-1.1-unified.

Production contains existing records and must be upgraded additively, never replaced with TEST data.

Deployment remains blocked pending a fresh encrypted backup, verified restore, v1/v2 backup compatibility, schema migration and validation of the Windows and PWA update packages.

## 19 October 2026 – verified database milestone

- Additive Cloud 1.1 schema deployed to production with all 8 products, 8 purchase lots, 1 sale and 8 product images preserved.
- Main branch now includes version 1 / version 2 encrypted backup validation and PostgreSQL restore via PR #6.
- The production backup_snapshot function was updated to v2, and verified to include the three new tables.
- The next rehearsal run must confirm a real encrypted v2 archive and local PostgreSQL-17 restore before live app deployment.
- Production PWA, production Windows updater and TEST stay untouched by this status entry.
