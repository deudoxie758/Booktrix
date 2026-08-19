# Booktrix deployment

## Required environment

- `DATABASE_URL`: MySQL connection
- `NEXTAUTH_SECRET`: high-entropy production secret
- `NEXTAUTH_URL`: canonical HTTPS URL
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: optional Google sign-in
- `ONLINE_PAYMENTS_ENABLED`: keep `false` for staging
- `PAYMENT_PROVIDER`: leave empty until a real provider is registered, executes checkout, and is verified

WiPay credentials are deferred to the payment implementation phase.

Production startup validates the database URL, canonical HTTPS auth URL, and an auth secret of at least 32 characters. Missing or unsafe values stop the application instead of allowing a partially configured deployment.

The application caps Prisma's pool at two connections per application instance and uses a 20-second pool timeout. The current Clever Cloud database user is limited to five simultaneous connections, so run no more than two application instances and control rolling-deployment overlap. Keep operational scripts sequential and give them an equivalently bounded connection URL. Before migrations or maintenance, stop or scale down application instances; spare capacity is not guaranteed while they remain active. Upgrade the database plan or introduce a compatible external pooler before scaling beyond this limit.

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

## Railway staging

1. Create a Railway service from the Booktrix repository and select the deployment branch.
2. Add the required environment variables above. Generate `NEXTAUTH_SECRET` with a cryptographically secure password generator and set `NEXTAUTH_URL` to the assigned HTTPS domain.
3. Keep `ONLINE_PAYMENTS_ENABLED=false`; staging checkout exposes cash only.
4. Deploy using the checked-in `railway.toml`. Railway builds with `npm run build`, runs `npx prisma migrate deploy` before release, starts with `npm start`, and checks `/api/health`.
5. Keep `numReplicas=1` while using the current Clever Cloud plan. Do not enable overlapping replicas or horizontal autoscaling.
6. Verify `/api/health` returns `200` and `{ "status": "ok", "service": "booktrix", "database": "reachable" }` before sharing the staging URL.

Create the first platform administrator only after setting explicit one-time secret environment values in Railway (or a local environment that does not persist commands in shell history), then run:

```sh
npm run admin:create
```

The command has no fallback email or password, validates and normalizes the email, and rejects passwords shorter than 16 characters or containing common weak patterns. It can promote an existing account with the exact normalized email to platform administrator, so verify the email carefully before running it. Remove the bootstrap variables from the service afterward.

## Phase 2 operating notes

- Store business hours and schedules using `America/St_Lucia`; persist instants in UTC and convert at the application boundary.
- Availability holds expire after 10 minutes and no longer consume capacity after expiry.
- Manager availability overrides require an authorized role, a reason, and an immutable audit event.
- Staging offers cash checkout only where the business has enabled cash for the service. Online-only services stop before checkout with a clear explanation and link back to the storefront. Full-payment and deposit options are code-disabled; environment flags alone cannot activate them. WiPay remains inactive and no online funds are captured.
- `/api/bookings/create` is retired with `410 Gone`; canonical booking creation uses `/api/bookings`.
- `/s/[slug]/book` redirects to `/book/[businessSlug]` and preserves a preselected service.
- `npm run db:seed` is destructive and is restricted to disposable environments. `npm run db:seed:e2e` is a non-destructive, namespaced fixture loader.

## Release gate

Run `npx prisma validate`, `npx prisma generate`, `npm test`, `npm run typecheck`, `npm run build`, `npm run test:e2e`, and `git diff --check`. Confirm HTTPS, automated database backups, email configuration, error monitoring, and health checks before public release. The staging-hardening slice does not replace the public-launch work for live payments, webhooks, refunds, notification delivery, rate limiting, privacy/legal policies, data export/deletion, lock cleanup jobs, or production security review.
