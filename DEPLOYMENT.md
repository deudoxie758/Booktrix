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
4. Preview `npx tsx scripts/backfill-organizations.ts --dry-run`.
5. Confirm counts, then run the same command with `--apply`; reruns are idempotent.
6. Confirm `npx prisma migrate status` reports current.

The original Clever Cloud database already contained five legacy schema changes without Prisma history. Those were baselined once before `20260818123000_booktrix_organizations` was deployed. Do not repeat baselining where migrations already report as applied.

Rollback is forward-only: restore a backup for data emergencies or add a corrective migration. Never edit an applied migration.

## Release gate

Run `npm test`, `npm run typecheck`, `npm run build`, and `npm run test:e2e`. Confirm HTTPS, backups, email configuration, error monitoring, and health checks before public release.
