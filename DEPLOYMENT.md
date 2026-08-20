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

A recent, verified database backup is a hard prerequisite before any migration run against a managed/production database — not an optional precaution. Do not proceed to step 2 without one.

1. Back up the database.
2. Run `npx prisma migrate status`.
3. Run `npx prisma migrate deploy`; do not use `migrate dev` on managed/production databases.
4. Preview `npx tsx scripts/backfill-organizations.ts --dry-run` and `npx tsx scripts/backfill-marketplace-scheduling.ts --dry-run`.
5. Confirm counts, then run each required command with `--apply`; marketplace scheduling uses small per-record transactions and idempotent upserts so interrupted runs are safely resumable.
6. Rerun both dry runs to reconcile every legacy candidate with zero skipped records.
7. Confirm `npx prisma migrate status` reports current.

The original Clever Cloud database already contained five legacy schema changes without Prisma history. Those were baselined once before `20260818123000_booktrix_organizations` was deployed. Do not repeat baselining where migrations already report as applied.

Migrations must always be applied in the order Prisma recorded them under `prisma/migrations/` — never skip ahead or apply a later migration before an earlier one it depends on. `npx prisma migrate deploy` already enforces this ordering and refuses to apply an out-of-order or already-superseded migration; it is not something an operator sequences by hand. The business-workspace-completion migrations (locations and location assignments; team invitations; the append-only cash collection ledger; business policy) apply through the same single `migrate deploy` step as every other migration — there is no separate procedure for them.

Rollback is forward-only: restore a backup for data emergencies or add a corrective migration. Never edit an applied migration. A rollback of the **application image** (redeploying a previous Railway build/container) is a distinct operation from a schema rollback and does not, by itself, reverse any migration — the database keeps whatever schema state `migrate deploy` last reached. Every migration in this project is additive (new tables, or new nullable/defaulted columns), so an older app image continues to run correctly against a newer schema; it simply does not exercise the newer columns and tables. Rolling the app image back further than that (to before a *breaking* schema change) is not supported by this project's migration history, and has not been necessary — if it is ever required, restore the pre-migration backup instead of attempting to hand-reverse a migration.

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
- `npm run db:seed` is destructive and is restricted to disposable environments. `npm run db:seed:e2e` is a non-destructive, namespaced fixture loader: every row it writes is upserted by a stable `booktrix-e2e-*` id (or a unique business+idempotency-key pair), so rerunning it against the same database is always safe and never invokes the destructive global seed path. It seeds six demo storefronts, the `booktrix-e2e-studio` role-coverage business (fixed Owner/Manager/Staff/Accounts/Customer logins, all `password123`), an inactive location, a published booking-policy row, cash-due/partially-collected/foreign-location booking orders with cash evidence, and a pending/expired/revoked invitation for every lifecycle state. Use it against an isolated staging or local database only, never production.

### Invitation links in staging

Team invitations are created with a plaintext, one-time token (`/invitations/<token>`); the server stores only its SHA-256 hash and never re-displays the plaintext after the create/resend response. Staging sends no email — the inviting Owner/Manager must copy the link from the on-screen confirmation and share it out of band. Links expire after 7 days; an expired, revoked, or already-accepted token is rejected before any membership is created or role is granted, and cannot be replayed by resubmitting it. Accepting an invitation also requires the signed-in account's email to match the invited email exactly, independent of the token check.

### Cash collection and adjustment evidence

Cash collection evidence is append-only: a `CashCollection` row is never updated or deleted. Correcting a recorded amount creates a new `ADJUSTMENT` row that references the original `COLLECTION` row via `adjustmentOfId`; the original row is left untouched, so the full correction history stays visible in Finance. A collection cannot exceed the amount still due at the appointment, and an adjustment can never drive an order's running cash total below zero. Every submission carries a client-generated idempotency key so a retried request (e.g. after a lost response) is recognized and safely replayed rather than double-recorded. No live payment provider is connected in this environment — "cash collected" is manually recorded evidence of money handled in person, not a captured or settled online payment, and Finance's copy is truthful about that distinction.

## Release gate

Run `npx prisma validate`, `npx prisma generate`, `npm test`, `npm run typecheck`, `npm run build`, `npm run test:e2e`, and `git diff --check`. Before the `test:e2e` run, point `DATABASE_URL` at an isolated staging database (never production), apply migrations with `npx prisma migrate deploy`, and run `npm run db:seed:e2e`. Confirm HTTPS, automated database backups, email configuration, error monitoring, and health checks before public release. The staging-hardening slice does not replace the public-launch work for live payments, webhooks, refunds, notification delivery, rate limiting, privacy/legal policies, data export/deletion, lock cleanup jobs, or production security review.

To run the E2E suite against the built app (`next start`) instead of `next dev`, start that server yourself and point Playwright at it instead of letting it launch its own dev server:

```sh
PORT=3118 NEXTAUTH_URL=http://127.0.0.1:3118 npm run build
PORT=3118 NEXTAUTH_URL=http://127.0.0.1:3118 NEXTAUTH_SECRET=booktrix-playwright-test-secret npm start &
PLAYWRIGHT_SKIP_WEB_SERVER=1 npx playwright test
curl --fail http://127.0.0.1:3118/api/health
```

Playwright's `tablet` project emulates the iPad Mini viewport in Chromium rather than using Playwright's real WebKit-based iPad Mini device preset: in this environment WebKit auto-upgrades every plain-HTTP request to the app to HTTPS, and since no TLS listener exists on the dev/staging test port every request fails before a single cookie is set — authentication, and therefore every authenticated spec, silently fails project-wide. This is a test-harness workaround only; it does not change what breakpoint is exercised.
