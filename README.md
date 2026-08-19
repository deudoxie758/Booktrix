# Booktrix

Booktrix is a Saint Lucia–based marketplace and operations platform for appointment-driven businesses. Phase 2 adds service discovery, live availability, multi-service booking, customer self-service, and manager booking operations to the multi-business/location foundation.

## Local setup

1. Run `npm install`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL`.
3. Optionally add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
4. Run `npx prisma migrate deploy`.
5. For a legacy database, run each backfill with `--dry-run`, review its counts, then rerun it with `--apply`:
   - `npx tsx scripts/backfill-organizations.ts --dry-run`
   - `npx tsx scripts/backfill-marketplace-scheduling.ts --dry-run`
6. Run `npm run db:seed` only for disposable local data, or `npm run db:seed:e2e` for non-destructive namespaced browser-test fixtures.
7. Run `npm run dev`.

Availability is calculated in `America/St_Lucia`. Checkout holds reserve the complete service sequence for 10 minutes. Full, deposit, and cash choices are recorded, but online collection remains pending until a provider is activated.

## Verification

- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run test:e2e`
- `npm run verify`

`npm run db:seed` intentionally replaces seeded data and creates representative customer, owner, manager, accounts, and staff access. Never run it against data that must be retained. `npm run db:seed:e2e` only upserts records under the `booktrix-e2e-*` namespace.

WiPay is not live in Phase 2. Payment calls must use `modules/payments`; the legacy Stripe endpoint is compatibility-only and returns `503` when unconfigured.

## Private staging

Booktrix includes a single-instance Railway configuration with a database-backed `/api/health` readiness check and pre-deploy Prisma migrations. Keep `ONLINE_PAYMENTS_ENABLED=false` so staging remains cash-only. Production configuration fails closed when its database URL, HTTPS NextAuth URL, or high-entropy NextAuth secret is missing.

The legacy booking page redirects into `/book/[businessSlug]`, and the fake legacy creation endpoint is retired. See `DEPLOYMENT.md` for the Railway checklist, database connection limits, secure administrator bootstrap, and the remaining gates before public launch.
