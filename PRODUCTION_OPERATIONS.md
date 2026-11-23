# Production operations

The baseline release `482b0713ece588859dd438e72c22dee962a7573a` passed backend regression, seven isolated PostgreSQL E2E suites and live Render commit/database/storefront/admin/catalog checks in Actions run `38096304905` on 2026-10-10. This proves the recorded checks, not all mobile interactions or real payment collection.

## Release and health

Every main push runs regression, then waits for Render to report the exact commit. Page downloads now fail on HTTP/network errors instead of accepting only a matching prefix. `Production Health` checks main against Render every six hours and can be run manually. A concurrent deployment can temporarily produce a mismatch; rerun after deployment completes. GitHub notifications must be enabled by the owner to receive workflow-failure alerts.

## Backups

`Encrypted Production Backup` runs daily at 01:43 UTC or manually. It deliberately fails when either required repository Actions secret is missing:

- `BACKUP_DATABASE_URL`: Render **external** PostgreSQL connection URL. Prefer a dedicated read-only backup account with SELECT on all application tables/sequences. Never paste the URL into a commit, issue or chat.
- `BACKUP_ENCRYPTION_KEY`: randomly generated passphrase, at least 32 characters. Keep an independent copy in a password manager; loss of this key makes backups unrecoverable. Preserve old keys before rotating.

The workflow reads production using pg_dump, requires verified TLS, encrypts with scrypt and AES-256-GCM, authenticates a decryption round trip, and checks the PostgreSQL archive catalog. It uploads **only ciphertext** to GitHub artifacts and to an independent private S3-compatible bucket. It downloads the independent copy and compares the bytes on every run. A failure to save or read back that copy fails the workflow. GitHub artifacts remain available for 14 days as a fallback. The in-memory implementation fails rather than exceeding a 512 MiB dump limit. No production restore or delete operation is supplied.

Configure a private bucket outside Render and GitHub. Give the workflow object write and read permissions scoped to the `ladies-first/` prefix. Configure the retention policy in the storage provider and keep the encryption key independently of the bucket.

- Actions variables: `BACKUP_S3_BUCKET`, optionally `BACKUP_S3_REGION` (defaults to `us-east-1`) and `BACKUP_S3_ENDPOINT` (the HTTPS endpoint for a compatible provider).
- Actions secrets: `BACKUP_S3_ACCESS_KEY_ID` and `BACKUP_S3_SECRET_ACCESS_KEY`.

Run the workflow manually after replacing the production database or its backup credentials. Confirm both destinations and run a restore drill using the copy downloaded directly from the independent bucket. Verify that failure notifications reach the owner.

Download an encrypted artifact and verify it locally using Node 20+ and Docker:

```bash
# Set BACKUP_ENCRYPTION_KEY securely in your environment first.
node backend/scripts/database-backup.js verify /absolute/path/ladies-first.pgdump.enc
```

An archive-catalog check is not a full restore. The regression workflow separately dumps the populated isolated E2E database, restores to a new isolated database, and compares every public table's row count/content hash and every sequence's last value. It never restores into production. A production-data restore drill remains required after backup credentials are configured, in a private isolated environment with the same PostgreSQL major version or newer, and application boot/migration checks before any recovery cutover.

The Blueprint specifies the smallest paid Render Postgres compute plan for the replacement database. Review the quoted recurring price and approve it before applying the Blueprint. Check the actual database plan and backup retention in Render after provisioning.

## Payments and remaining release acceptance

Visa selection is disabled in checkout, Visa advertising/discounts are suppressed, and production rejects direct Visa order requests before any order or stock writes. Cash on delivery remains available. Historic Visa orders remain viewable. Discount arithmetic remains testable outside production for a future provider integration. Enabling electronic payment requires verified capture, provider callbacks, failure/retry handling and refunds; there is no environment toggle that bypasses this production guard.

The following are still **unverified**, and must not be claimed complete: a full live customer order/cancel/return/invoice flow; data persistence after a production restart; visual approval of all mobile/admin screens and printed invoices; a real production backup plus isolated restore; and Naia paid image/voice acceptance. Naia's existing settings are unchanged by these infrastructure changes.
