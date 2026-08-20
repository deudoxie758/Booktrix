# Phase 2 Marketplace and Scheduling Handoff

## Delivered journeys

- Public discovery of published businesses by service, category, business, and Saint Lucian location.
- Storefront service selection, location/professional choice, availability, 10-minute hold, payment choice, and booking confirmation.
- Customer upcoming/history views with policy-controlled cancellation and rescheduling.
- Manager agenda and calendar, approval and lifecycle actions, registered-customer and walk-in booking, and reasoned audited overrides.
- Owner/manager service, qualification, business-hours, staff-schedule, and time-off configuration across multiple locations.

Scheduling evaluates `America/St_Lucia` business time and persists UTC instants. Capacity, qualifications, active holds, existing appointments, buffers, hours, schedules, and time off are revalidated server-side. Accounts-only access is denied booking administration.

## Database acceptance evidence

On 2026-08-18, `20260818150000_marketplace_scheduling` was deployed additively to the authorized existing Clever Cloud MySQL database. Prisma reported 7 migrations and an up-to-date schema.

The legacy marketplace backfill reconciled:

- 61 service offerings;
- 14 booking orders and segments;
- 0 skipped records.

The backfill uses idempotent upserts and a bounded transaction per legacy record, making interruption safely resumable. Its dry run reports all reconciliation candidates, not only new inserts. Rollback is forward-only: restore a verified backup for a data emergency or deploy a corrective migration; never edit an applied migration.

## Payment and audit boundaries

Full, deposit, and cash choices are calculated and recorded in XCD cents. Full/deposit selections remain provider-neutral pending payment records; no live funds are captured. Cash records the balance due at the appointment. WiPay is explicitly inactive in Phase 2.

Manager overrides require authorization and a non-empty reason and create immutable audit evidence containing the actor and affected booking context.

## Verification evidence

The final gate passed 73 unit/integration tests and 54 Playwright tests across desktop, tablet, and 320px mobile profiles. Three hardware-keyboard-only checks are explicitly skipped on emulated touch profiles; the equivalent desktop keyboard checks pass. The final release gate is:

```bash
npx prisma validate
npx prisma generate
npm test
npm run typecheck
npm run build
npm run test:e2e
git diff --check
```

Coverage includes capacity concurrency, hold expiry, idempotency, authorization denial, customer and manager booking journeys, accessibility states, and horizontal-overflow checks at 320px.

## Later phases

Production WiPay processing, commissions, subscriptions, refunds, finance ledgers, live email delivery, reviews, favourites, and customer-facing room/equipment selection remain excluded. The resource boundary is prepared for future scheduling constraints without exposing them in the Phase 2 booking contract.
