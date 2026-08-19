# Booktrix Business Workspace Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every permitted business-workspace placeholder with a secure, responsive, role-aware operating experience for Owner, Manager, Staff, and Accounts users.

**Architecture:** Extend the existing `WorkspaceShell`, organization context, canonical booking models, and tenant-scoped server-action pattern. Add forward-only persistence for invitations, business policies, and append-only cash collection, then expose each domain through a focused module and page rather than a shared monolith.

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Prisma 6, MySQL, Tailwind CSS, NextAuth, Vitest/Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-19-business-workspace-completion-design.md`

## Global Constraints

- Use `America/St_Lucia` for appointment-day boundaries and `XCD` for business money defaults.
- Keep the cream, nude, clay, and cocoa Booktrix design system; do not reintroduce legacy FLO styling.
- All reads and mutations must be scoped to the active business and the actor's authorized locations.
- Owners have full workspace access; Managers can manage Staff only; Staff see assigned work only; Accounts can view finance and record cash only within assigned locations.
- Preserve historical bookings, memberships, invitations, cash evidence, and audit evidence; deactivate or append adjustments rather than destructively deleting history.
- Do not simulate provider settlement, subscription charging, platform commissions, refunds, or payouts.
- Use test-driven development: observe a focused RED failure before production edits, then GREEN, review, full relevant verification, and a task-scoped commit.
- Use forward-only Prisma migrations and do not modify already-applied migration directories.
- Keep the current Clever Cloud pool limits and Railway single-replica deployment assumptions intact.

---

### Task 1: Workspace Shell, Role Navigation, and Role-Aware Overview

**Files:**
- Modify: `components/shells/WorkspaceShell.tsx`
- Modify: `components/shells/navigation.ts`
- Create: `components/shells/WorkspaceMobileNavigation.tsx`
- Create: `components/business/WorkspaceOverview.tsx`
- Create: `modules/dashboard/business-overview.ts`
- Modify: `app/business/layout.tsx`
- Modify: `app/business/page.tsx`
- Test: `tests/ui/workspace-shell.test.tsx`
- Test: `tests/ui/business-overview.test.tsx`
- Test: `tests/dashboard/business-overview.test.ts`
- Modify: `e2e/manager-bookings.spec.ts`
- Create: `e2e/business-role-overviews.spec.ts`

**Interfaces:**
- Consumes: `resolveBusinessContext(actorId, requestedBusinessId?, requestedLocationId?)` and `SignOutButton` from `components/auth/SignOutButton.tsx`.
- Produces: `loadBusinessOverview(input: { actorId: string; now: Date }): Promise<BusinessOverviewModel>` and a shared `WorkspaceShell` used by every later task.
- `BusinessOverviewModel` is a discriminated union on `role: BusinessRole` with common `business`, `locations`, and `alerts` fields plus role-specific metrics.

- [ ] **Step 1: Write failing shell and navigation tests**

```tsx
it('keeps the logo in the business workspace and exposes account, marketplace, and sign out', () => {
  render(<WorkspaceShell title="Island Glow" role="OWNER"><div>Body</div></WorkspaceShell>)
  expect(screen.getByRole('link', { name: /booktrix/i })).toHaveAttribute('href', '/business')
  expect(screen.getByRole('link', { name: /view marketplace/i })).toHaveAttribute('href', '/')
  expect(screen.getByRole('link', { name: /my account/i })).toHaveAttribute('href', '/profile')
  expect(screen.getByRole('button', { name: /sign out/i })).toBeVisible()
})
```

Add assertions that Owner, Manager, Staff, and Accounts receive exactly the destinations specified by the design and that the mobile navigation exposes the same links.

- [ ] **Step 2: Run the shell tests and verify RED**

Run: `npm test -- tests/ui/workspace-shell.test.tsx tests/ui/navigation.test.ts`

Expected: FAIL because the logo still links to `/`, account/marketplace/sign-out controls are absent, and mobile navigation does not exist.

- [ ] **Step 3: Implement the responsive workspace shell**

Pass the signed-in identity and active location context from `app/business/layout.tsx`. Keep desktop sidebar navigation and add an accessible mobile disclosure/navigation. Render `SignOutButton`, `/profile`, `/`, and `/business` as distinct intentional controls. Mark the current destination with `aria-current="page"` in a client boundary that reads `usePathname()`.

- [ ] **Step 4: Write failing role-overview model tests**

```ts
it('scopes manager overview metrics to assigned locations', async () => {
  const model = await loadBusinessOverview({ actorId: 'manager-1', now: new Date('2026-08-19T14:00:00Z') })
  expect(model.role).toBe('MANAGER')
  expect(model.locationIds).toEqual(['assigned-location'])
  expect(model.todayAppointments).toBe(2)
  expect(model.pendingApprovals).toBe(1)
})
```

Add separate tests for Owner operational metrics, Staff assigned-next-appointment/time-off data, Accounts finance summaries, and alerts for missing hours/qualifications/unassigned bookings.

- [ ] **Step 5: Run overview tests and verify RED**

Run: `npm test -- tests/dashboard/business-overview.test.ts tests/ui/business-overview.test.tsx`

Expected: FAIL because `loadBusinessOverview` and `WorkspaceOverview` do not exist.

- [ ] **Step 6: Implement overview queries and UI**

Use targeted Prisma counts/aggregates rather than loading full order trees. Convert the selected Saint Lucia local day to UTC boundaries once. Filter non-owner queries by authorized `locationIds`. Return a role-discriminated view model and render role-specific cards, agenda/transaction previews, alerts, and quick links in `WorkspaceOverview`.

- [ ] **Step 7: Run focused tests and browser journeys**

Run:

```bash
npm test -- tests/ui/workspace-shell.test.tsx tests/ui/navigation.test.ts tests/dashboard/business-overview.test.ts tests/ui/business-overview.test.tsx tests/organizations/context.test.ts
npx playwright test e2e/business-role-overviews.spec.ts
npm run typecheck
git diff --check
```

Expected: all pass; Owner/Manager/Staff/Accounts land on useful role-specific overview pages, workspace logo stays inside `/business`, and sign-out returns to `/`.

- [ ] **Step 8: Commit Task 1**

```bash
git add components/shells components/business/WorkspaceOverview.tsx modules/dashboard app/business/layout.tsx app/business/page.tsx tests/ui tests/dashboard e2e/business-role-overviews.spec.ts e2e/manager-bookings.spec.ts
git commit -m "feat: complete role-aware business overview"
```

---

### Task 2: Location Management and Opening Hours

**Files:**
- Create: `modules/locations/management.ts`
- Create: `modules/locations/schema.ts`
- Create: `app/business/locations/actions.ts`
- Modify: `app/business/locations/page.tsx`
- Create: `components/business/LocationManagement.tsx`
- Create: `components/business/LocationEditor.tsx`
- Create: `components/business/LocationHoursEditor.tsx`
- Create: `components/business/LocationCard.tsx`
- Test: `tests/locations/management.test.ts`
- Test: `tests/ui/location-management.test.tsx`
- Create: `e2e/business-locations.spec.ts`

**Interfaces:**
- Consumes: `requireWorkspaceRole(['OWNER','MANAGER'])`, `resolveBusinessContext`, `Location`, and `LocationHours`.
- Produces: `createLocation`, `updateLocation`, `setLocationHours`, and `setLocationActive` functions returning `{ ok: true; locationId: string } | { ok: false; error: string; fieldErrors?: Record<string,string> }`.
- Later tasks consume active locations and their assignment summaries; location management must never return foreign-business records.

- [ ] **Step 1: Write failing tenant and role tests**

```ts
it('rejects a manager editing a location outside the active business', async () => {
  await expect(updateLocation({ actorId: 'manager', businessId: 'business-a', locationId: 'business-b-location', values })).rejects.toThrow('LOCATION_ACCESS_DENIED')
})

it('allows accounts to read but not mutate assigned locations', async () => {
  await expect(setLocationActive({ actorId: 'accounts', locationId: 'assigned', active: false })).rejects.toThrow('BUSINESS_ACCESS_DENIED')
})
```

Cover normalized unique slugs, required identity fields, valid weekday/time intervals, duplicate weekday rejection, and deactivation preserving related bookings.

- [ ] **Step 2: Run location tests and verify RED**

Run: `npm test -- tests/locations/management.test.ts`

Expected: FAIL because the location management module does not exist.

- [ ] **Step 3: Implement location domain validation and transactions**

Normalize slugs within the active business; validate phone/email lengths; accept seven explicit weekday rows with `closed`, `opensAt`, and `closesAt`; transactionally replace/upsert `LocationHours`; reject `closesAt <= opensAt`. Deactivation sets `isActive=false`, writes an `AuditLog`, and never deletes booking history.

- [ ] **Step 4: Write failing responsive form tests**

```tsx
it('shows editable controls to managers and a read-only view to accounts', () => {
  const { rerender } = render(<LocationManagement role="MANAGER" locations={locations} />)
  expect(screen.getByRole('button', { name: /add location/i })).toBeVisible()
  rerender(<LocationManagement role="ACCOUNTS" locations={locations} />)
  expect(screen.queryByRole('button', { name: /add location/i })).not.toBeInTheDocument()
  expect(screen.getByText(/read-only access/i)).toBeVisible()
})
```

Cover labelled fields, all seven days, semantic success/error feedback, duplicate-submit disabling, and deactivation confirmation.

- [ ] **Step 5: Implement location actions and pages**

Use server actions as thin adapters to the domain module, then `revalidatePath('/business/locations')`, `/business/services`, and public storefront/search pages. Show service/team assignment counts per location. Accounts receive read-only authorized cards.

- [ ] **Step 6: Verify Task 2**

Run:

```bash
npm test -- tests/locations/management.test.ts tests/ui/location-management.test.tsx tests/organizations/access.test.ts
npx playwright test e2e/business-locations.spec.ts
npm run typecheck
git diff --check
```

Expected: all pass; Owner/Manager can add/edit/deactivate and configure hours, Accounts cannot mutate, and cross-tenant IDs fail.

- [ ] **Step 7: Commit Task 2**

```bash
git add modules/locations app/business/locations components/business/LocationManagement.tsx components/business/LocationEditor.tsx components/business/LocationHoursEditor.tsx components/business/LocationCard.tsx tests/locations tests/ui/location-management.test.tsx e2e/business-locations.spec.ts
git commit -m "feat: add business location management"
```

---

### Task 3: Team Invitations, Memberships, Assignments, and Qualifications

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_business_invitations/migration.sql`
- Create: `modules/team/invitations.ts`
- Create: `modules/team/management.ts`
- Create: `modules/team/permissions.ts`
- Create: `app/api/team-invitations/accept/route.ts`
- Create: `app/invitations/[token]/page.tsx`
- Create: `app/business/team/actions.ts`
- Modify: `app/business/team/page.tsx`
- Create: `components/business/TeamInvitationForm.tsx`
- Create: `components/business/TeamMemberCard.tsx`
- Create: `components/business/PendingInvitationCard.tsx`
- Test: `tests/team/permissions.test.ts`
- Test: `tests/team/invitations.test.ts`
- Test: `tests/team/management.test.ts`
- Test: `tests/ui/team-management.test.tsx`
- Create: `e2e/business-team.spec.ts`

**Interfaces:**
- Consumes: active business context, location IDs from Task 2, `StaffQualification`, `LocationAssignment`, `AuditLog`, authentication callback helpers.
- Produces: `BusinessInvitation`, `BusinessInvitationLocation`, and `BusinessInvitationQualification` Prisma models; `createInvitation`, `resendInvitation`, `revokeInvitation`, `acceptInvitation`, and `updateMemberAccess` domain functions.
- `createInvitation` returns a one-time plaintext token only to the action response; persistence stores `sha256(token)`.

- [ ] **Step 1: Write failing schema and permission tests**

```ts
expect(canManageRequestedRole({ actorRole: 'MANAGER', requestedRole: 'STAFF' })).toBe(true)
expect(canManageRequestedRole({ actorRole: 'MANAGER', requestedRole: 'MANAGER' })).toBe(false)
expect(canManageRequestedRole({ actorRole: 'MANAGER', requestedRole: 'ACCOUNTS' })).toBe(false)
expect(canManageRequestedRole({ actorRole: 'OWNER', requestedRole: 'ACCOUNTS' })).toBe(true)
```

Add source/schema assertions for token hash, expiry, inviter, revocation/acceptance, unique active invite semantics, and related initial location/qualification rows.

- [ ] **Step 2: Run schema/permission tests and verify RED**

Run: `npm test -- tests/team/permissions.test.ts tests/organizations/schema.test.ts`

Expected: FAIL because invitation models and team permission functions are absent.

- [ ] **Step 3: Add the forward-only invitation migration and Prisma relations**

Create additive tables with restrictive foreign keys for business/inviter/location/offering. Use indexed normalized email and token hash. Do not store plaintext tokens. Generate and validate Prisma Client with an explicit MySQL `DATABASE_URL`.

- [ ] **Step 4: Write failing invitation lifecycle tests**

```ts
it('rotates the token and extends expiry when resending', async () => {
  const first = await createInvitation(input)
  const resent = await resendInvitation({ actorId: owner.id, invitationId: first.id, now: dayTwo })
  expect(resent.token).not.toBe(first.token)
  expect(resent.expiresAt).toEqual(addDays(dayTwo, 7))
})

it('requires the authenticated normalized email on acceptance', async () => {
  await expect(acceptInvitation({ token, actorId: otherUser.id })).rejects.toThrow('INVITATION_EMAIL_MISMATCH')
})
```

Cover seven-day expiry, revocation, replay rejection, cross-business location/offering rejection, existing/new user flow, last-owner protection, manager Staff-only boundaries, and transactional audit evidence.

- [ ] **Step 5: Implement team lifecycle modules**

Use `crypto.randomBytes(32)` and SHA-256 hashing. Normalize email at creation/acceptance. On acceptance, transactionally create/reactivate membership, location assignments, permitted qualifications, mark accepted, and append audit evidence. `updateMemberAccess` replaces assignments/qualifications only after validating every target belongs to the active business.

- [ ] **Step 6: Write failing team UI and callback tests**

Assert the Owner role selector includes Manager/Accounts/Staff, Manager includes Staff only, pending cards expose copy/resend/revoke, inactive members can be reactivated, and unauthenticated invitation acceptance routes through sign-up with a safe same-origin callback.

- [ ] **Step 7: Implement invitation and Team pages**

Render active/inactive members and pending invitations separately. Show the one-time copyable invite URL in a semantic success region. Never re-display persisted tokens. Route acceptance through `/invitations/[token]`, authentication, and the acceptance endpoint. Revalidate Team, Schedule, Services, and Overview after access changes.

- [ ] **Step 8: Verify migration and team journeys**

Run:

```bash
npx prisma generate
DATABASE_URL='mysql://booktrix:booktrix@127.0.0.1:3306/booktrix' npx prisma validate
npm test -- tests/team tests/ui/team-management.test.tsx tests/identity/post-auth.test.ts tests/organizations/access.test.ts
npx playwright test e2e/business-team.spec.ts
npm run typecheck
git diff --check
```

Expected: all pass; invitations are seven-day, revocable/resendable, email-bound, tenant-scoped, and cannot escalate Manager privileges.

- [ ] **Step 9: Commit Task 3**

```bash
git add prisma modules/team app/api/team-invitations app/invitations app/business/team components/business/TeamInvitationForm.tsx components/business/TeamMemberCard.tsx components/business/PendingInvitationCard.tsx tests/team tests/ui/team-management.test.tsx e2e/business-team.spec.ts
git commit -m "feat: add secure team invitations and access management"
```

---

### Task 4: Finance Ledger, CSV Export, and Audited Cash Collection

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_cash_collections/migration.sql`
- Create: `modules/finance/ledger.ts`
- Create: `modules/finance/cash-collection.ts`
- Create: `modules/finance/filters.ts`
- Create: `app/business/finance/actions.ts`
- Modify: `app/business/finance/page.tsx`
- Create: `app/business/finance/export/route.ts`
- Create: `components/business/FinanceSummary.tsx`
- Create: `components/business/FinanceFilters.tsx`
- Create: `components/business/FinanceLedger.tsx`
- Create: `components/business/CashCollectionForm.tsx`
- Test: `tests/finance/ledger.test.ts`
- Test: `tests/finance/cash-collection.test.ts`
- Test: `tests/finance/export.test.ts`
- Test: `tests/ui/finance-dashboard.test.tsx`
- Create: `e2e/business-finance.spec.ts`

**Interfaces:**
- Consumes: canonical `BookingOrder`, `BookingSegment`, `BookingPaymentRequest`, authorized location IDs, and Actor/Business context.
- Produces: append-only `CashCollection`; `loadFinanceLedger(input): Promise<FinanceLedgerModel>`; `recordCashCollection(input)`; `createFinanceCsv(model): string`.
- `recordCashCollection` requires `idempotencyKey`, positive `amountCents`, and never permits cumulative non-adjustment collection above `dueAtAppointmentCents`.

- [ ] **Step 1: Write failing finance classification tests**

```ts
expect(classifyOrderFinance(cancelledOrder)).toEqual({ bookedCents: 0, cancelledCents: 12000, cashDueCents: 0 })
expect(classifyOrderFinance(activeCashOrder)).toEqual({ bookedCents: 12000, cancelledCents: 0, cashDueCents: 12000 })
```

Cover multi-segment partial cancellation, completed revenue, pending payment requests, authorized-location filtering, and Saint Lucia date ranges.

- [ ] **Step 2: Run ledger tests and verify RED**

Run: `npm test -- tests/finance/ledger.test.ts tests/finance/export.test.ts`

Expected: FAIL because finance modules do not exist.

- [ ] **Step 3: Implement filtered finance read model and CSV**

Parse date, location, booking status, and payment state with a strict schema. Build targeted aggregate queries plus paginated booking rows. Exclude cancelled value from earned totals, expose it separately, and scope every segment/order to authorized locations. Escape CSV cells against commas, quotes, newlines, and spreadsheet formula prefixes.

- [ ] **Step 4: Write failing cash transaction and race tests**

```ts
it('does not collect more cash than remains due under concurrent attempts', async () => {
  const results = await Promise.allSettled([
    recordCashCollection({ ...input, amountCents: 8000, idempotencyKey: 'a' }),
    recordCashCollection({ ...input, amountCents: 8000, idempotencyKey: 'b' }),
  ])
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
})
```

Cover Owner/Accounts authorization, Manager denial, location-scope denial, idempotent replay, append-only adjustment, audit persistence, and order/business ownership.

- [ ] **Step 5: Add cash persistence and transactional collection**

Create `CashCollection` with restrictive order/collector/business relations, a unique business/idempotency key, positive amount check where supported, adjustment reference, and indexes for order/date/location reporting. Serialize per-order collection using the existing deterministic database-lock pattern, recalculate remaining cash inside the transaction, create collection plus audit log, and never update/delete evidence.

- [ ] **Step 6: Write failing finance UI tests**

Assert real summary labels, truthful pending-provider copy, accessible filters, mobile ledger cards, Accounts collection controls, Manager denial, semantic mutation feedback, and exported filter preservation.

- [ ] **Step 7: Implement finance page, actions, and export route**

Render summaries and paginated ledger rows from the read model. Collection actions call only the domain function and revalidate Overview/Finance/booking detail. Export route authenticates again and derives authorization server-side; it never trusts business/location scope from raw query parameters.

- [ ] **Step 8: Verify finance and migration**

Run:

```bash
npx prisma generate
DATABASE_URL='mysql://booktrix:booktrix@127.0.0.1:3306/booktrix' npx prisma validate
npm test -- tests/finance tests/ui/finance-dashboard.test.tsx tests/bookings/orders.test.ts
npx playwright test e2e/business-finance.spec.ts
npm run typecheck
git diff --check
```

Expected: all pass; finance reconciles to canonical orders, CSV is authorization-safe, and cash evidence cannot be duplicated or over-collected.

- [ ] **Step 9: Commit Task 4**

```bash
git add prisma modules/finance app/business/finance components/business/FinanceSummary.tsx components/business/FinanceFilters.tsx components/business/FinanceLedger.tsx components/business/CashCollectionForm.tsx tests/finance tests/ui/finance-dashboard.test.tsx e2e/business-finance.spec.ts
git commit -m "feat: add audited business finance ledger"
```

---

### Task 5: Business Settings, Booking Policies, and Publication Readiness

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_business_policies/migration.sql`
- Create: `modules/settings/business-policy.ts`
- Create: `modules/settings/publication-readiness.ts`
- Create: `app/business/settings/actions.ts`
- Modify: `app/business/settings/page.tsx`
- Create: `components/business/BusinessProfileForm.tsx`
- Create: `components/business/BookingPolicyForm.tsx`
- Create: `components/business/PublicationSettings.tsx`
- Test: `tests/settings/business-policy.test.ts`
- Test: `tests/settings/publication-readiness.test.ts`
- Test: `tests/ui/business-settings.test.tsx`
- Create: `e2e/business-settings.spec.ts`

**Interfaces:**
- Consumes: Owner-only business context, active locations/hours, active services, team qualifications, staging payment-mode helpers.
- Produces: one-to-one `BusinessPolicy`; `saveBusinessProfile`, `saveBusinessPolicy`, `evaluatePublicationReadiness`, and `setPublicationStatus`.
- Defaults: `currency='XCD'`, `timezone='America/St_Lucia'`, `confirmationMode='AUTOMATIC'`, nonnegative notice/buffer values.

- [ ] **Step 1: Write failing policy and readiness tests**

```ts
expect(validatePolicy({ ...valid, timezone: 'America/New_York' })).toEqual(expect.objectContaining({ ok: false }))
expect(evaluatePublicationReadiness({ business, activeLocations: [], activeServices: [], qualifiedStaff: 0 }).blockers).toContain('Add an active location')
```

Cover Owner-only access, slug uniqueness, safe descriptions/contact lengths, notice windows, defaults not mutating existing services/bookings, required hours, service availability, qualifications, and staging payment truthfulness.

- [ ] **Step 2: Run settings tests and verify RED**

Run: `npm test -- tests/settings/business-policy.test.ts tests/settings/publication-readiness.test.ts`

Expected: FAIL because policy persistence and readiness evaluation do not exist.

- [ ] **Step 3: Add BusinessPolicy and forward backfill migration**

Create one policy row per business with safe non-null defaults. Backfill existing businesses using `INSERT ... SELECT ... WHERE NOT EXISTS`. Link with a restrictive one-to-one relation. Do not rewrite service offering confirmation, buffers, cancellation lead time, or existing bookings.

- [ ] **Step 4: Implement settings domain modules**

Validate and transactionally save public business identity or policy plus audit log. `setPublicationStatus` recomputes blockers inside the mutation; it may publish only when blockers are empty and may unpublish without deleting storefront history. Return explicit provider/subscription staging state from existing environment helpers.

- [ ] **Step 5: Write failing settings UI tests**

Assert Booktrix styling, explicit XCD/Saint Lucia fields, separated profile/policy/publication forms, publication blockers linked to the relevant tab, unsupported integration copy, semantic feedback, and absence for non-owners.

- [ ] **Step 6: Implement settings page and actions**

Use focused server actions per form. Revalidate `/business/settings`, `/business`, `/search`, and `/s/[slug]` after relevant changes. Show current staging payment/subscription state without editable fake controls.

- [ ] **Step 7: Verify settings and migration**

Run:

```bash
npx prisma generate
DATABASE_URL='mysql://booktrix:booktrix@127.0.0.1:3306/booktrix' npx prisma validate
npm test -- tests/settings tests/ui/business-settings.test.tsx tests/marketplace/search.test.ts
npx playwright test e2e/business-settings.spec.ts
npm run typecheck
git diff --check
```

Expected: all pass; only Owners can save policies/publish, readiness is real, and defaults do not rewrite existing records.

- [ ] **Step 8: Commit Task 5**

```bash
git add prisma modules/settings app/business/settings components/business/BusinessProfileForm.tsx components/business/BookingPolicyForm.tsx components/business/PublicationSettings.tsx tests/settings tests/ui/business-settings.test.tsx e2e/business-settings.spec.ts
git commit -m "feat: complete business settings and policies"
```

---

### Task 6: Cross-Role Security, Responsive E2E, Migration Drill, and Release Gate

**Files:**
- Modify: `scripts/seed-phase2-e2e.ts`
- Create: `e2e/business-workspace-security.spec.ts`
- Create: `e2e/business-workspace-responsive.spec.ts`
- Modify: `playwright.config.ts`
- Modify: `DEPLOYMENT.md`
- Modify: `README.md`
- Test: `tests/fixtures/phase2-e2e-seed.test.ts`
- Test: `tests/hosting/railway-config.test.ts`

**Interfaces:**
- Consumes: all Task 1-5 pages, actions, migrations, E2E accounts, `/api/health`, Railway predeploy migration configuration.
- Produces: deterministic fixtures for active/inactive locations, pending/expired/revoked invitations, location-scoped memberships, cash-due/partially-collected orders, policy/readiness states, and cross-tenant denial targets.

- [ ] **Step 1: Write failing deterministic-fixture assertions**

Assert the seed script includes stable IDs and future Saint Lucia-relative dates for every security and finance state. Ensure cleanup/upserts make reruns safe and do not call destructive global seed logic.

- [ ] **Step 2: Run fixture tests and verify RED**

Run: `npm test -- tests/fixtures/phase2-e2e-seed.test.ts`

Expected: FAIL for the newly required invitation, policy, cash, inactive-location, and cross-tenant fixtures.

- [ ] **Step 3: Extend the namespaced E2E seed**

Upsert only `booktrix-e2e-*` records. Add fixed Owner/Manager/Staff/Accounts/Customer users, two businesses, assigned/unassigned locations, operational bookings, cash evidence, policy rows, and invitation lifecycle records. Hash passwords/tokens and print no secrets beyond the documented local `password123` test credential.

- [ ] **Step 4: Write cross-role authorization E2E tests**

Cover direct URL and direct mutation attempts:

- Manager cannot access Finance/Settings or grant Manager/Accounts.
- Staff cannot mutate another schedule, location, service, team, finance, or settings.
- Accounts cannot mutate locations/team/settings and cannot collect foreign/unassigned-location cash.
- Owner cannot mutate another business using forged IDs.
- Expired/revoked invitation cannot be accepted or replayed.
- Stale selected-business cookie recovers to an active authorized membership.

- [ ] **Step 5: Write responsive/accessibility E2E tests**

At 320 px, tablet, and desktop, test Overview, Locations, Team, Finance, and Settings for no page-level horizontal overflow. Exercise keyboard navigation, invite/forms, validation focus, semantic status changes, mobile ledger rendering, current-page navigation, sign-out visibility, and reduced-motion mode.

- [ ] **Step 6: Run built-app E2E and migration drill**

Use an isolated staging database, never production:

```bash
npm run db:seed:e2e
npm run build
npm start
npx playwright test e2e/business-role-overviews.spec.ts e2e/business-locations.spec.ts e2e/business-team.spec.ts e2e/business-finance.spec.ts e2e/business-settings.spec.ts e2e/business-workspace-security.spec.ts e2e/business-workspace-responsive.spec.ts
npx prisma migrate status
curl --fail http://127.0.0.1:3000/api/health
```

Expected: all journeys pass against `next start`, migrations are fully applied, and health returns a non-sensitive ready response.

- [ ] **Step 7: Run the full release gate**

```bash
npm run verify
npx prisma validate
git diff --check
git status --short
```

Expected: 0 test failures, typecheck exit 0, build exit 0, valid Prisma schema, clean diff, and only intended task files before commit.

- [ ] **Step 8: Update deployment documentation**

Document forward migration order, isolated seed usage, invitation-link staging behavior, cash collection/adjustment semantics, truthful payment limitations, backup/restore prerequisite, Railway one-replica constraint, health check, admin bootstrap, and rollback through a previous app image without reversing migrations.

- [ ] **Step 9: Commit Task 6**

```bash
git add scripts/seed-phase2-e2e.ts e2e playwright.config.ts tests/fixtures/phase2-e2e-seed.test.ts tests/hosting/railway-config.test.ts DEPLOYMENT.md README.md
git commit -m "test: gate complete business workspaces for staging"
```

---

## Final Review and Handoff

- [ ] Generate a branch review package covering the six task commits, schema diff, migrations, permission matrix, test evidence, and all deferred features.
- [ ] Dispatch one final independent reviewer with explicit emphasis on tenant isolation, location scoping, invitation token safety, money races, append-only evidence, accessibility, and Railway constraints.
- [ ] Address release-blocking findings through one bounded fix round and one scoped re-review.
- [ ] Re-run `npm run verify`, Prisma validation, migration status on the isolated staging database, the built-app Playwright suite, and `git diff --check`.
- [ ] Do not push, merge, run Railway migrations, or publish the staging URL without the user's explicit external-action authorization.
