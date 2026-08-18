# Booktrix

Booktrix is a Saint Lucia–based marketplace and operations platform for appointment-driven businesses. Phase 1 includes public discovery, multi-business/location tenancy, contextual roles, business approval/setup/publication, role-aware workspaces, and a provider-neutral payment boundary.

## Local setup

1. Run `npm install`.
2. Create `.env` with `DATABASE_URL`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL`.
3. Optionally add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
4. Run `npx prisma migrate deploy`.
5. For a legacy database, run `npx tsx scripts/backfill-organizations.ts --dry-run`, review counts, then use `--apply`.
6. Run `npm run dev`.

## Verification

- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run test:e2e`
- `npm run verify`

`npm run db:seed` intentionally replaces seeded data and creates representative customer, owner, manager, accounts, and staff access. Never run it against data that must be retained.

WiPay is not live in Phase 1. Payment calls must use `modules/payments`; the legacy Stripe endpoint is compatibility-only and returns `503` when unconfigured.
