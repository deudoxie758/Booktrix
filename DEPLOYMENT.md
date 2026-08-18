# Booktrix deployment

## Required environment

- `DATABASE_URL`: MySQL connection
- `NEXTAUTH_SECRET`: high-entropy production secret
- `NEXTAUTH_URL`: canonical HTTPS URL
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: optional Google sign-in

WiPay credentials are deferred to the payment implementation phase.

## Managed MySQL migrations

1. Back up the database.
2. Run `npx prisma migrate status`.
3. Run `npx prisma migrate deploy`; do not use `migrate dev` on managed/production databases.
4. Preview `npx tsx scripts/backfill-organizations.ts --dry-run` and `npx tsx scripts/backfill-marketplace-scheduling.ts --dry-run`.
5. Confirm counts, then run each required command with `--apply`; marketplace scheduling uses small per-record transactions and idempotent upserts so interrupted runs are safely resumable.
6. Rerun both dry runs to reconcile every legacy candidate with zero skipped records.
7. Confirm `npx prisma migrate status` reports current.

The original Clever Cloud database already contained five legacy schema changes without Prisma history. Those were baselined once before `20260818123000_booktrix_organizations` was deployed. Do not repeat baselining where migrations already report as applied.

Rollback is forward-only: restore a backup for data emergencies or add a corrective migration. Never edit an applied migration.

## Phase 2 operating notes

- Store business hours and schedules using `America/St_Lucia`; persist instants in UTC and convert at the application boundary.
- Availability holds expire after 10 minutes and no longer consume capacity after expiry.
- Manager availability overrides require an authorized role, a reason, and an immutable audit event.
- Full-payment and deposit selections create provider-neutral pending records only. Cash records the amount due at the appointment. WiPay remains inactive and no online funds are captured.
- `npm run db:seed` is destructive and is restricted to disposable environments. `npm run db:seed:e2e` is a non-destructive, namespaced fixture loader.

## Release gate

Run `npx prisma validate`, `npx prisma generate`, `npm test`, `npm run typecheck`, `npm run build`, `npm run test:e2e`, and `git diff --check`. Confirm HTTPS, backups, email configuration, error monitoring, and health checks before public release.
